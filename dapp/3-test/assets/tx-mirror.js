// TX mirror — the transaction list is a mirror of the node (Phase 2 rebuild, v70).
// Replaces the legacy history sync worker + live ingest + settlement trackers with three
// cheap node reads:
//   history max:20        — which wallet-relevant transactions exist (mempool-inclusive;
//                           token + signed amount are in `difference` at mempool time)
//   txpow onchain:<id>    — status ladder per still-settling row: {found, block, tip,
//                           confirmations} in one call
// Rows are written through stablesMirrorUpsertRow (idempotent by id NODE-<txpowid>, no
// legacy reconciliation). A new node row adopts a recent optimistic local row (the send
// flow's "Sending…" row, faucet/mint pours) so its title survives and nothing duplicates.
// Ladder: Receiving/Sending (mempool) → Received/Sent (in a block, n/target) → Confirmed.
// Triggers: instant kick from the native NEWTXPOW/MDS event bridge + a 3s poll fallback.
(function () {
  'use strict';

  var CFG = window.STABLES_CONFIG || {};
  if (!CFG.DEMO_REAL_ONCHAIN_WALLET) return;

  var DEFAULT_TARGET = 3;
  var known = null;     // txpowid -> true once represented (or out of scope)
  var pending = {};     // txpowid -> { rows: [{ id, dirIn, target }] } still on the ladder
  var checking = false;
  var recheck = false;
  var importing = false;
  // Exact NEWTXPOW ids survive an in-flight/first history read. Without this queue, a
  // broadcast that landed during the initial arm was classified as old history and its
  // live incoming callback (Receive auto-close) never fired.
  var urgentTxpowIds = {};
  // How recent a transaction must be to count as "arriving now" for the Receive handoff.
  var LIVE_RECEIVE_WINDOW_MS = 10 * 60 * 1000;

  function tokenLabel(tokenid) {
    // Minima history/txpow tokenids are uppercase hex; config registry ids are often
    // lowercase. Case-sensitive compare made EVERY in-scope token look "unknown", so
    // importMissing skipped the whole history window and Recent activity stayed empty.
    var id = String(tokenid || '').toLowerCase();
    if (!id) return null;
    if (id === '0x00') return 'MINIMA';
    var reg = CFG.TEST_TOKEN_REGISTRY || {};
    if (id === String(reg.winiwa_token_id || '').toLowerCase()) return 'Winiwa';
    if (id === String(reg.usdw_token_id || '').toLowerCase()) return 'USDw';
    if (id === String(reg.xwiniwa_token_id || '').toLowerCase()) return 'xWiniwa';
    // Genesis-3 registry tokens (other currencies + CF share classes) live in the async
    // registry the bootstrap loads; it publishes id->label for the mirror (e.g. 'USDwcf').
    try {
      var g3map = window.__STABLES_G3_TOKEN_LABELS || {};
      var hit = g3map[id];
      if (hit) return hit;
    } catch (_) { /* ignore */ }
    return null; // unknown token: out of app scope
  }

  function dateText(d) {
    return d.toLocaleString('en-GB', { month: 'short', day: '2-digit' })
      + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function nodeId(txpowid) {
    return (typeof window.stablesNodeActivityId === 'function')
      ? window.stablesNodeActivityId(txpowid)
      : ('NODE-' + String(txpowid).toLowerCase());
  }

  // The APK's node bridge can silently drop a callback under load (observed on-device:
  // one dropped `history` callback froze the whole mirror because the `checking` gate only
  // resets inside the callback). Every command therefore gets a hard timeout: if no
  // response within 15s, the callback fires with null and the loop recovers.
  function runCmd(cmd, cb) {
    var done = false;
    var finish = function (res) {
      if (done) return;
      done = true;
      cb(res);
    };
    var tid = setTimeout(function () {
      try { console.log('[TxMirror] cmd timeout, recovering: ' + String(cmd).slice(0, 40)); } catch (_) { /* ignore */ }
      finish(null);
    }, 15000);
    var wrapped = function (res) { clearTimeout(tid); finish(res); };
    // RPC FIRST when a Connect-node RPC is configured (web preview / core-node mode): on those
    // surfaces an MDS shim object exists but dead-ends (no MiniDapp host), which silently froze
    // the whole mirror — balances worked (RPC-first elsewhere) while the activity list stayed
    // empty. On the APK/MiniDapp there is no RPC config, so MDS remains the transport.
    try {
      var rpcCfg = (typeof window.stablesGetRpcConfig === 'function') ? window.stablesGetRpcConfig() : null;
      if (rpcCfg && typeof window.stablesRpcSendCommand === 'function') {
        window.stablesRpcSendCommand(cmd).then(wrapped).catch(function () { wrapped(null); });
        return;
      }
    } catch (_) { /* ignore */ }
    try {
      if (typeof MDS !== 'undefined' && MDS.cmd) { MDS.cmd(cmd, wrapped); return; }
    } catch (_) { /* ignore */ }
    try {
      if (typeof window.stablesRpcSendCommand === 'function') {
        window.stablesRpcSendCommand(cmd).then(wrapped).catch(function () { wrapped(null); });
        return;
      }
    } catch (_) { /* ignore */ }
    wrapped(null);
  }

  function payload(res) {
    try { return res && (res.response || (res[0] && res[0].response)) || null; } catch (_) { return null; }
  }

  // history difference -> [{label, amt}] for in-scope tokens (amt signed, nonzero)
  function txnEntries(detail) {
    var out = [];
    var diff = (detail || {}).difference || {};
    for (var k in diff) {
      if (!Object.prototype.hasOwnProperty.call(diff, k)) continue;
      var amt = parseFloat(String(diff[k]));
      if (!isFinite(amt) || amt === 0) continue;
      var label = tokenLabel(k);
      if (!label) continue;
      out.push({ label: label, amt: amt });
    }
    return out;
  }

  // Known covenant (script) addresses, both hex (0x) and mini (Mx) forms, lowercased.
  // A faucet/mint/burn/xWiniwa transaction spends a covenant pool coin, which the node
  // counts as wallet-relevant (the covenant script is spendable by anyone), so the raw
  // `difference` is polluted — a faucet claim nets negative even though we receive tokens.
  var _covSet = null;
  var _covKinds = null;
  var _covTv81Merged = 0;
  function covenantSet() {
    if (!_covSet) {
      _covSet = {};
      _covKinds = {};
      var reg = CFG.TEST_TOKEN_REGISTRY || {};
      var add = function (a, kind) {
        if (!a) return;
        var k = String(a).trim().toLowerCase();
        if (!k) return;
        _covSet[k] = true;
        // first kind wins: cf_commit_address aliases the SAME address as commit_address (one commit
        // serves all directions) — letting it overwrite mislabeled mint legs as Coverage fund.
        if (!_covKinds[k]) _covKinds[k] = kind;
      };
      add(reg.faucet_covenant_address, 'faucet');
      add(reg.faucet_covenant_miniaddress, 'faucet');
      add(CFG.TEST_FAUCET_COVENANT_ADDRESS, 'faucet');
      add(CFG.TEST_FAUCET_COVENANT_MINIADDRESS, 'faucet');
      add(CFG.TEST_MINT_BURN_COVENANT_ADDRESS, 'usdw');
      add(reg.pool_miniaddress, 'usdw');
      add(reg.xwiniwa_covenant_address, 'xwiniwa');
      add(reg.xwiniwa_covenant_miniaddress, 'xwiniwa');
      add(CFG.TEST_XWINIWA_COVENANT_ADDRESS, 'xwiniwa');
      add(CFG.TEST_XWINIWA_COVENANT_MINIADDRESS, 'xwiniwa');
      // GENESIS-3 pilot covenants (2026-07-10): the node TRACKS these keyless addresses, so their
      // coins surface in wallet-level reads. Without them here, a vault/faucet seed or a keeper
      // clear resolves as an "ordinary send" and its raw tracked difference imports as the user's
      // (founder-caught phantom "+10,000,000 received"). Self-maintaining from the config block.
      var g3 = CFG.TEST_GENESIS3 || {};
      var g3kind = function (k) {
        if (/faucet/i.test(k)) return 'faucet';
        if (/cf_/.test(k)) return 'cf';
        if (/xwiniwa/i.test(k)) return 'xwiniwa';
        return 'usdw';
      };
      [g3, g3.lab || {}].forEach(function (blk) {
        Object.keys(blk).forEach(function (k) {
          if (!/_address$/.test(k)) return;
          add(blk[k], g3kind(k));
        });
      });
      add(CFG.TEST_GENESIS3_PROD_FAUCET_ADDRESS, 'faucet');
    }
    // TV81 protocol addresses load async from the app registry projection. Merge them on every
    // call so the first arm (before the registry promise resolves) does not permanently freeze
    // a set that omits the D13 vault / market engine — those would otherwise import as user rows
    // or be misclassified as ordinary sends.
    try {
      var tv = window.__STABLES_TV81_INFRA_ADDRS__;
      var tvKinds = window.__STABLES_TV81_INFRA_KINDS__ || {};
      var size = tv && typeof tv.size === 'number' ? tv.size : 0;
      if (tv && size && size !== _covTv81Merged) {
        tv.forEach(function (a) {
          var k = String(a || '').trim().toLowerCase();
          if (!k) return;
          _covSet[k] = true;
          if (!_covKinds[k]) _covKinds[k] = tvKinds[k] || 'xwiniwa';
        });
        _covTv81Merged = size;
      }
    } catch (_) { /* ignore */ }
    return _covSet;
  }

  function coinIsCovenant(coin) {
    var set = covenantSet();
    return !!(set[String((coin && coin.address) || '').toLowerCase()]
      || set[String((coin && coin.miniaddress) || '').toLowerCase()]);
  }

  function covenantKindOf(coin) {
    covenantSet();
    return _covKinds[String((coin && coin.address) || '').toLowerCase()]
      || _covKinds[String((coin && coin.miniaddress) || '').toLowerCase()]
      || null;
  }

  // Protocol-aware titles for imported covenant transactions: a USDw mint's collateral leg must
  // read "Locked Winiwa collateral · Protocol (USDw)", not "Sent Winiwa · On-chain recipient".
  function covenantRowText(covKind, label, dirIn) {
    if (covKind === 'usdw') {
      if (label === 'USDw') return { title: dirIn ? 'Minted USDw' : 'Burned USDw', cp: 'Protocol (USDw)' };
      if (label === 'Winiwa') return { title: dirIn ? 'Reclaimed Winiwa from USDw' : 'Locked Winiwa for USDw', cp: 'Protocol (USDw)' };
    }
    if (covKind === 'xwiniwa') {
      if (label === 'xWiniwa') return { title: dirIn ? 'Minted xWiniwa' : 'Burned xWiniwa', cp: 'Protocol (xWiniwa)' };
      if (label === 'Winiwa') return { title: dirIn ? 'Reclaimed Winiwa from xWiniwa' : 'Locked Winiwa for xWiniwa', cp: 'Protocol (xWiniwa)' };
    }
    if (covKind === 'faucet' && label === 'Winiwa' && dirIn) {
      return { title: 'Faucet claim', cp: 'On-chain faucet covenant' };
    }
    if (covKind === 'cf') {
      if (dirIn) return { title: 'Withdrew from Coverage fund', cp: 'Protocol (Coverage fund)' };
      return { title: 'Deposited to Coverage fund', cp: 'Protocol (Coverage fund)' };
    }
    return null;
  }

  // ── ONE ROW PER OPERATION (XR2-03, 2026-08-01) ─────────────────────────────────────────
  // A mint or a burn is ONE transaction carrying TWO accounting legs: the asset that leaves the
  // wallet and the asset that arrives. Representing them as two rows was accurate bookkeeping and
  // a false account of what the person did: they performed one operation, so the release contract
  // is one Activity row per operation.
  //
  // This is the same founder law already applied below to the two-TRANSACTION forward-pricing
  // trade. The difference is only that both legs here live in a single txpow.
  //
  // The row states what ARRIVED and notes what it COST, matching the merged fill row's shape, and
  // carries both legs in `opLegs` so the transaction detail can still show the complete movement.
  var OP_COVENANTS = { xwiniwa: 'xWiniwa', usdw: 'USDw' };
  function operationSpecFromEntries(entries, covKind) {
    var assetLabel = OP_COVENANTS[covKind];
    if (!assetLabel || !entries || entries.length !== 2) return null;
    var received = null, paid = null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].amt > 0) { if (received) return null; received = entries[i]; }
      else if (entries[i].amt < 0) { if (paid) return null; paid = entries[i]; }
    }
    if (!received || !paid) return null;
    // The operation is named by what happened to the protocol asset, not by which leg is bigger:
    // the asset arriving means it was minted, the asset leaving means it was burned.
    var minted = received.label === assetLabel;
    var burned = paid.label === assetLabel;
    if (!minted && !burned) return null;
    return {
      kind: minted ? 'mint' : 'burn',
      title: minted ? ('Minted ' + assetLabel) : ('Burned ' + assetLabel),
      cp: 'Protocol (' + assetLabel + ')',
      ccy: received.label,
      amt: Math.abs(received.amt),
      paidLabel: paid.label,
      paidAmt: Math.abs(paid.amt),
      legs: [
        { label: paid.label, amt: -Math.abs(paid.amt), direction: 'Outgoing' },
        { label: received.label, amt: Math.abs(received.amt), direction: 'Incoming' }
      ]
    };
  }

  // ── ONE ROW PER TRADE (founder law, 2026-07-10) ────────────────────────────────────────
  // A forward-pricing trade is TWO on-chain transactions (the user's commit, then the keeper's
  // clear ~minutes later), which used to import as two legs ("Locked Winiwa −222" + "Minted
  // USDw +3.11"). They are linked by the escrow coin the clear spends: the commit's output at
  // the commit address IS input 0 of the clear. The mirror represents the pair as ONE row —
  // the order row ("Mint USDw · −222 Winiwa") transforms into the fill row ("Minted USDw ·
  // +3.11 · note: For 222 Winiwa") the moment the clear imports. The reconcile sweep judges
  // stored rows against this same spec, so pre-law two-leg history self-heals on the next pass.
  var _commitSet = null;
  function commitAddressSet() {
    if (_commitSet) return _commitSet;
    _commitSet = {};
    var g3 = CFG.TEST_GENESIS3 || {};
    [g3, g3.lab || {}].forEach(function (blk) {
      Object.keys(blk).forEach(function (k) {
        if (!/commit/.test(k) || !/_(mini)?address$/.test(k)) return;
        var v = String(blk[k] || '').trim().toLowerCase();
        if (v) _commitSet[v] = true;
      });
    });
    return _commitSet;
  }

  function coinIsCommit(coin) {
    var set = commitAddressSet();
    return !!(set[String((coin && coin.address) || '').toLowerCase()]
      || set[String((coin && coin.miniaddress) || '').toLowerCase()]);
  }

  // Token quantity of a coin (`tokenamount`); `amount` is the tiny MINIMA-equivalent.
  function coinAmt(o) {
    var v = (o.tokenamount != null && o.tokenamount !== '') ? o.tokenamount : o.amount;
    return parseFloat(String(v)) || 0;
  }

  // Read a state port off a coin's state array (or the txn's shared state block).
  function stateVal(stateArr, port) {
    if (!Array.isArray(stateArr)) return null;
    for (var i = 0; i < stateArr.length; i++) {
      var e = stateArr[i];
      if (e && String(e.port) === String(port)) {
        return String(e.data == null ? '' : e.data).replace(/^\[|\]$/g, '').trim();
      }
    }
    return null;
  }

  function fmtAmt(n) {
    var v = Math.abs(Number(n) || 0);
    return v.toFixed(8).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  // The single-row spec for an order txn (commit) or its fill (clear). Null for anything else.
  function orderSpecFromMeta(entries, covKind, meta) {
    if (!covKind || !meta) return null;
    var isCfLabel = function (l) { return /cf$/.test(String(l || '')); };
    if (meta.commitIns && meta.commitIns.length) {
      // CLEAR: the keeper spent our commit coin — this txn delivers the fill (or refund).
      var recv = null;
      for (var i = 0; i < (entries || []).length; i++) {
        var e = entries[i];
        if (e.amt > 0 && (!recv || Math.abs(e.amt) > Math.abs(recv.amt))) recv = e;
      }
      if (!recv) return null; // no receive leg at our addresses: not our fill
      var esc = meta.commitIns[0];
      var escLabel = esc.label || '';
      var spec = { kind: 'clear', dirIn: true, amt: Math.abs(recv.amt), ccy: recv.label, esc: esc, cp: 'Protocol (USDw)' };
      if (escLabel && recv.label === escLabel) { spec.title = 'Order refunded'; spec.cp = 'Protocol (' + escLabel + ')'; }
      else if (isCfLabel(recv.label)) { spec.title = 'Deposited to Coverage fund'; spec.cp = 'Protocol (Coverage fund)'; }
      else if (isCfLabel(escLabel)) { spec.title = 'Withdrew from Coverage fund'; spec.cp = 'Protocol (Coverage fund)'; }
      else if (escLabel === 'Winiwa') { spec.title = 'Minted ' + recv.label; spec.cp = 'Protocol (' + recv.label + ')'; }
      else if (recv.label === 'Winiwa') { spec.title = 'Burned ' + (escLabel || 'USDw'); spec.cp = 'Protocol (' + (escLabel || 'USDw') + ')'; }
      else { spec.title = 'Exchanged ' + (escLabel || '?') + ' for ' + recv.label; spec.cp = 'Protocol (FX)'; }
      return spec;
    }
    if (meta.commitOuts && meta.commitOuts.length) {
      // COMMIT: this txn places an order (escrow to the commit covenant). ONE outgoing row.
      var esc2 = meta.commitOuts[0];
      if (!esc2.label) return null; // escrow token out of app scope
      var dir = stateVal(esc2.state, 10);
      if (dir == null) dir = stateVal(meta.txnState, 10);
      var targetHex = stateVal(esc2.state, 30);
      if (targetHex == null) targetHex = stateVal(meta.txnState, 30);
      var target = targetHex ? tokenLabel(targetHex) : null;
      var spec2 = {
        kind: 'commit', dirIn: false, amt: Math.abs(esc2.amt), ccy: esc2.label,
        coinids: meta.commitOuts.map(function (c) { return c.coinid; }), cp: 'Protocol (USDw)'
      };
      var d = String(dir == null ? '' : dir);
      if (d === '3' || (d === '' && isCfLabel(target))) { spec2.title = 'Coverage fund deposit'; spec2.cp = 'Protocol (Coverage fund)'; }
      else if (d === '4' || isCfLabel(esc2.label)) { spec2.title = 'Coverage fund withdrawal'; spec2.cp = 'Protocol (Coverage fund)'; }
      else if (d === '2') { spec2.title = 'Exchange ' + esc2.label + ' to ' + (target || '…'); spec2.cp = 'Protocol (FX)'; }
      else if (d === '1' || (d === '' && esc2.label !== 'Winiwa')) { spec2.title = 'Burn ' + esc2.label; spec2.cp = 'Protocol (' + esc2.label + ')'; }
      else { spec2.title = 'Mint ' + (target || 'USDw'); spec2.cp = 'Protocol (' + (target || 'USDw') + ')'; }
      return spec2;
    }
    return null;
  }

  // Does any stored row already represent the fill that consumed these order coins?
  function orderCoinsConsumed(coinids) {
    try {
      var rows = (typeof window.stablesGetUserActivityRows === 'function') ? (window.stablesGetUserActivityRows() || []) : [];
      var want = {};
      (coinids || []).forEach(function (c) { if (c) want[String(c).toLowerCase()] = true; });
      return rows.some(function (r) {
        var used = r && r.g3ConsumedCommitCoins;
        return Array.isArray(used) && used.some(function (c) { return want[String(c).toLowerCase()]; });
      });
    } catch (_) { return false; }
  }

  // Remove the order row(s) whose escrow coins this clear spends (the fill row replaces them).
  function removeConsumedOrderRows(commitIns) {
    try {
      var rows = (typeof window.stablesGetUserActivityRows === 'function') ? (window.stablesGetUserActivityRows() || []) : [];
      var spent = {};
      (commitIns || []).forEach(function (c) { if (c && c.coinid) spent[String(c.coinid).toLowerCase()] = true; });
      rows.forEach(function (r) {
        var mine = r && r.g3CommitCoins;
        if (!Array.isArray(mine) || !mine.some(function (c) { return spent[String(c).toLowerCase()]; })) return;
        try { window.stablesRemoveActivityRowById(r.id); } catch (_) { /* ignore */ }
        var tx = String(r.explorerTxId || '');
        if (tx && pending[tx]) delete pending[tx];
        try { console.log('[TxMirror] order row ' + String(r.id).slice(0, 24) + ' merged into its fill'); } catch (_) { /* ignore */ }
      });
    } catch (_) { /* ignore */ }
  }

  // Is an address one of ours? Cached; `checkaddress` is definitive (covers the rotated
  // addresses the wallet generates for each receive, which a key-list snapshot can miss).
  // IMPORTANT: only a real checkaddress ANSWER is cached. A timed-out/failed lookup (typical
  // while the node is still booting at mirror arm time) must not poison the cache as "not
  // ours" — that made covenant transactions resolve to "not ours", skip import forever, and
  // left their optimistic rows to expire as false "Failed".
  var _ourAddr = {}; // lowercased address -> bool
  function isOurAddress(addr, cb) {
    var a = String(addr || '').toLowerCase();
    if (!a) { cb(false); return; }
    if (Object.prototype.hasOwnProperty.call(_ourAddr, a)) { cb(_ourAddr[a]); return; }
    runCmd('checkaddress address:' + addr, function (res) {
      var r = payload(res);
      if (!r) { cb(false); return; } // indeterminate: answer no, but do NOT cache
      // OWNERSHIP means our own key ("simple"), never mere tracking ("relevant"):
      // covenant pool addresses are relevant on every claimer's node, and treating
      // relevant as mine attributed OTHER users' covenant receives to this wallet
      // (founder 2026-07-07: phantom "Received xWiniwa" rows + false payment alerts).
      var mine;
      if (r.simple !== undefined && r.simple !== null) {
        mine = !!(r.simple === true || r.simple === 'true'
          || (typeof r.simple === 'object' && (r.simple.relevant === true || r.simple.relevant === 'true')));
      } else {
        mine = !!(r.relevant === true || r.relevant === 'true');
      }
      _ourAddr[a] = mine;
      cb(mine);
    });
  }

  // A txpow whose `difference` nets to ZERO for an in-scope TEST token (key present, value 0).
  // This is exactly what the wallet's OWN covenant claim looks like on a covenant-tracking
  // wallet: pool coin −1000 (tracked) + own +1000 (owned) = 0 — so a plain difference filter
  // hides the user's own faucet/mint transactions. MINIMA (0x00) is excluded: every tracked
  // oracle rate-update nets 0x00:0 and must stay skipped, not raw-fetched.
  function zeroNetInScope(detail) {
    var diff = (detail || {}).difference || {};
    for (var k in diff) {
      if (!Object.prototype.hasOwnProperty.call(diff, k)) continue;
      if (String(k) === '0x00') continue;
      if (tokenLabel(k)) return true;
    }
    return false;
  }

  // Resolve the true per-token entries for a txpow. Normal transfers use the node's
  // `difference` (correct: no covenant coins). When any token nets negative — or nets to a
  // suspicious ZERO on an in-scope token (see zeroNetInScope) — we fetch the raw txpow: if it
  // settles a covenant coin, direction is recomputed from the coin flow at OUR addresses
  // only — so on a normal wallet a faucet claim reads +1000 received, while on the
  // pool-operator node a claim it merely relays (recipient is someone else) nets to nothing and
  // is dropped instead of wrongly showing as received. cb([{label,amt}]).
  function resolveEntries(txpowid, detail, cb, forceRaw) {
    var base = txnEntries(detail);
    if (!forceRaw && !base.length && !zeroNetInScope(detail)) { cb(base); return; }
    // ALWAYS resolve through the txpow's real coins (2026-07-10): the old positive-only
    // fast-path trusted the node's raw `difference`, which on a covenant-TRACKING wallet
    // includes coins the wallet does not own — a faucet/vault seed imported as a phantom
    // "+10,000,000 received". One extra txpow read per candidate row buys ownership truth.
    runCmd('txpow txpowid:' + txpowid, function (res) {
      var r = payload(res);
      var txn = r && r.body && r.body.txn;
      // INDETERMINATE IS NOT RAW (2026-07-10): if the txpow lookup fails/times out (typical at
      // arm on a busy node), returning the raw tracked difference imported covenant-seed coins
      // as the user's (+10,000,000 phantom). Skip now — the staggered deep passes retry later.
      if (!txn || !Array.isArray(txn.inputs) || !Array.isArray(txn.outputs)) { cb(null); return; }
      var covKind = null;
      txn.inputs.concat(txn.outputs).forEach(function (o) {
        if (!covKind) covKind = covenantKindOf(o);
      });
      if (!covKind) { cb(base); return; } // ordinary send: difference sign is right
      // Order linkage (one-row law): commit coins this txn CREATES (placing an order) or
      // SPENDS (the keeper's clear / refund of an order), with their escrow token + state.
      var meta = {
        commitIns: [],
        commitOuts: [],
        txnState: Array.isArray(txn.state) ? txn.state : null,
        rawHeader: r && r.header ? r.header : null
      };
      var commitInfo = function (o) {
        return {
          coinid: String((o && o.coinid) || '').toLowerCase(),
          label: tokenLabel(o && o.tokenid),
          amt: coinAmt(o),
          state: (o && Array.isArray(o.state)) ? o.state : null
        };
      };
      txn.inputs.forEach(function (o) { if (coinIsCommit(o)) meta.commitIns.push(commitInfo(o)); });
      txn.outputs.forEach(function (o) { if (coinIsCommit(o)) meta.commitOuts.push(commitInfo(o)); });
      var coins = [];
      txn.outputs.forEach(function (o) { if (!coinIsCovenant(o)) coins.push({ o: o, sign: 1 }); });
      txn.inputs.forEach(function (o) { if (!coinIsCovenant(o)) coins.push({ o: o, sign: -1 }); });
      var addrs = {};
      coins.forEach(function (c) {
        var a = String(c.o.address || c.o.miniaddress || '').toLowerCase();
        if (a) addrs[a] = c.o.address || c.o.miniaddress;
      });
      var addrList = Object.keys(addrs).map(function (k) { return addrs[k]; });
      var i = 0;
      (function checkNext() {
        if (i < addrList.length) { isOurAddress(addrList[i++], function () { checkNext(); }); return; }
        // INDETERMINATE checkaddress IS NOT "not ours" (2026-07-10): a timed-out/failed lookup
        // leaves the address out of the ownership map, which netted the whole txn to [] — and
        // the reconcile sweep reads [] as "relayed by this node, purge", wiping LEGITIMATE rows
        // whenever the node was busy at pass time. Unresolved ownership now reports null
        // (indeterminate) so the sweep keeps the row and a later pass retries — the same law as
        // the txpow-timeout and checkaddress-cache rules.
        var unresolved = addrList.some(function (a) {
          return !Object.prototype.hasOwnProperty.call(_ourAddr, String(a).toLowerCase());
        });
        if (unresolved) { cb(null); return; }
        var net = {};
        coins.forEach(function (c) {
          var a = String(c.o.address || c.o.miniaddress || '').toLowerCase();
          if (!_ourAddr[a]) return; // only coins at our addresses
          var t = String(c.o.tokenid || '');
          net[t] = (net[t] || 0) + c.sign * coinAmt(c.o);
        });
        var out = [];
        for (var t in net) {
          if (!Object.prototype.hasOwnProperty.call(net, t)) continue;
          var label = tokenLabel(t);
          if (!label) continue;
          if (Math.abs(net[t]) < 1e-18) continue;
          out.push({ label: label, amt: net[t] });
        }
        cb(out, covKind, meta); // empty => not ours (relayed): caller skips the row
      })();
    });
  }

  function ladder(dirIn, found, confs, target) {
    if (!found) {
      return {
        status: dirIn ? 'Receiving' : 'Sending',
        note: 'Seen by your Minima node - waiting for a block.',
        settling: true
      };
    }
    if (confs >= target) {
      return {
        status: 'Confirmed',
        note: 'Confirmed by your ' + target + '-block policy.',
        settling: false
      };
    }
    return {
      status: dirIn ? 'Received' : 'Sent',
      note: confs + '/' + target + ' confirmation blocks.',
      settling: true
    };
  }

  // Insert all rows for one transaction (one per in-scope token) and track its ladder.
  // adoptLocal: merge a matching recent optimistic app row into the node row (title survives,
  // no duplicate). notifyIncoming: fire the live incoming hook (receive-window auto-close) —
  // live detections only, never the initial history import.
  function representTxn(txpowid, entries, state, adoptLocal, notifyIncoming, covKind, meta) {
    var tracked = [];
    // REAL on-chain time (the txpow header's timemilli), never the import/recovery time. The
    // displayed date, the row's ts, and all twin/adoption matching anchor on chain truth.
    var chainMs = Number(state.timemilli) > 0 ? Number(state.timemilli) : Date.now();
    // ONE ROW PER TRADE: an order (commit) and its fill (clear) are a single trade — never
    // two legs. The fill row replaces the order row; a commit whose escrow is already
    // consumed by a stored fill row must never re-create its leg.
    var spec = orderSpecFromMeta(entries, covKind, meta);
    if (spec && spec.kind === 'commit') {
      if (orderCoinsConsumed(spec.coinids)) return;
      var stC = ladder(false, state.found, state.confs, state.target);
      var rowC = window.stablesMirrorUpsertRow({
        id: nodeId(txpowid),
        dir: 'out', icon: '↗',
        counterparty: spec.cp, category: spec.ccy,
        title: spec.title,
        date: dateText(new Date(chainMs)),
        amt: -Math.abs(spec.amt), ccy: spec.ccy,
        address: '', fee: 0,
        explorerTxId: String(txpowid),
        status: stC.status, block: state.block || 0,
        txConfirmations: state.found ? state.confs : 0,
        ts: chainMs, note: stC.note,
        directionLabel: 'Outgoing', minimaOnChain: true,
        pendingIncoming: false,
        g3Order: true, g3CommitCoins: spec.coinids
      }, adoptLocal);
      var targetC = (rowC && Number(rowC.confirmTarget)) || state.target;
      if (stC.status !== 'Confirmed') pending[txpowid] = { rows: [{ id: nodeId(txpowid), dirIn: false, target: targetC }] };
      try { console.log('[TxMirror] ORDER ' + stC.status + ' ' + nodeId(txpowid).slice(0, 22) + ' -' + spec.amt + ' ' + spec.ccy + ' (' + spec.title + ')'); } catch (_) { /* ignore */ }
      return;
    }
    if (spec && spec.kind === 'clear') {
      removeConsumedOrderRows(meta.commitIns);
      var noteSuffix = spec.esc && spec.esc.label ? (' For ' + fmtAmt(spec.esc.amt) + ' ' + spec.esc.label + '.') : '';
      var stM = ladder(true, state.found, state.confs, state.target);
      var rowM = window.stablesMirrorUpsertRow({
        id: nodeId(txpowid),
        dir: 'in', icon: '↙',
        counterparty: spec.cp, category: spec.ccy,
        title: spec.title,
        date: dateText(new Date(chainMs)),
        amt: Math.abs(spec.amt), ccy: spec.ccy,
        address: '', fee: 0,
        explorerTxId: String(txpowid),
        status: stM.status, block: state.block || 0,
        txConfirmations: state.found ? state.confs : 0,
        ts: chainMs, note: stM.note + noteSuffix,
        directionLabel: 'Incoming', minimaOnChain: true,
        pendingIncoming: !state.found || state.confs < state.target + 1,
        g3Merged: true,
        g3ConsumedCommitCoins: meta.commitIns.map(function (c) { return c.coinid; })
      }, adoptLocal);
      var targetM = (rowM && Number(rowM.confirmTarget)) || state.target;
      var stillM = stM.status !== 'Confirmed' || (!state.found || state.confs < targetM + 1);
      if (stillM) pending[txpowid] = { rows: [{ id: nodeId(txpowid), dirIn: true, target: targetM, noteSuffix: noteSuffix }] };
      try { console.log('[TxMirror] FILL ' + stM.status + ' ' + nodeId(txpowid).slice(0, 22) + ' +' + spec.amt + ' ' + spec.ccy + ' (' + spec.title + ')'); } catch (_) { /* ignore */ }
      if (notifyIncoming && typeof window.stablesOnMirrorIncomingDetected === 'function') {
        try { window.stablesOnMirrorIncomingDetected({ label: spec.ccy, amt: Math.abs(spec.amt), txpowid: txpowid }); } catch (_) { /* ignore */ }
      }
      return;
    }
    // ONE ROW PER OPERATION: a mint or burn is a single operation, never two Activity rows.
    var op = operationSpecFromEntries(entries, covKind);
    if (op) {
      var stOp = ladder(true, state.found, state.confs, state.target);
      var opNote = stOp.note + ' For ' + fmtAmt(op.paidAmt) + ' ' + op.paidLabel + '.';
      var rowOp = window.stablesMirrorUpsertRow({
        id: nodeId(txpowid),
        dir: 'in', icon: '↙',
        counterparty: op.cp, category: op.ccy,
        title: op.title,
        date: dateText(new Date(chainMs)),
        amt: op.amt, ccy: op.ccy,
        address: '', fee: 0,
        explorerTxId: String(txpowid),
        status: stOp.status, block: state.block || 0,
        txConfirmations: state.found ? state.confs : 0,
        ts: chainMs, note: opNote,
        directionLabel: 'Incoming', minimaOnChain: true,
        pendingIncoming: !state.found || state.confs < state.target + 1,
        // Both accounting legs are preserved on the consolidated row so the transaction detail
        // can show the complete movement without a second Activity row existing.
        opMerged: true, opKind: op.kind, opLegs: op.legs,
        opPaidLabel: op.paidLabel, opPaidAmt: op.paidAmt
      }, adoptLocal);
      var targetOp = (rowOp && Number(rowOp.confirmTarget)) || state.target;
      var stillOp = stOp.status !== 'Confirmed' || (!state.found || state.confs < targetOp + 1);
      if (stillOp) pending[txpowid] = { rows: [{ id: nodeId(txpowid), dirIn: true, target: targetOp, noteSuffix: ' For ' + fmtAmt(op.paidAmt) + ' ' + op.paidLabel + '.' }] };
      try { console.log('[TxMirror] ' + op.kind.toUpperCase() + ' ' + stOp.status + ' ' + nodeId(txpowid).slice(0, 22) + ' +' + op.amt + ' ' + op.ccy + ' for ' + op.paidAmt + ' ' + op.paidLabel); } catch (_) { /* ignore */ }
      if (notifyIncoming && typeof window.stablesOnMirrorIncomingDetected === 'function') {
        try { window.stablesOnMirrorIncomingDetected({ label: op.ccy, amt: op.amt, txpowid: txpowid }); } catch (_) { /* ignore */ }
      }
      return;
    }
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var dirIn = e.amt > 0;
      var covText = covKind ? covenantRowText(covKind, e.label, dirIn) : null;
      // Multi-leg txns suffix EVERY leg id: the unsuffixed NODE-<hash> id must only ever mean
      // "single-leg representation" — the legacy-duplicate pruner deletes the unsuffixed row
      // whenever suffixed legs exist for the same hash, and with entry 0 unsuffixed that
      // pruner was eating the RECEIVE leg of every covenant mint (founder: the row flipped
      // to a spend-only "Locked Winiwa" at confirmation).
      var legDup = entries.filter(function (x) { return x.label === e.label; }).length > 1;
      var rowId = nodeId(txpowid) + (entries.length > 1
        ? (':' + e.label.toLowerCase() + (legDup ? (dirIn ? '-in' : '-out') : ''))
        : '');
      var st = ladder(dirIn, state.found, state.confs, state.target);
      var row = window.stablesMirrorUpsertRow({
        id: rowId,
        dir: dirIn ? 'in' : 'out',
        icon: dirIn ? '↙' : '↗',
        counterparty: covText ? covText.cp : (dirIn ? 'On-chain sender' : 'On-chain recipient'),
        category: e.label,
        title: covText ? covText.title : ((dirIn ? 'Received ' : 'Sent ') + e.label),
        date: dateText(new Date(chainMs)),
        amt: dirIn ? Math.abs(e.amt) : -Math.abs(e.amt),
        ccy: e.label,
        address: '',
        fee: 0,
        explorerTxId: String(txpowid),
        status: st.status,
        block: state.block || 0,
        txConfirmations: state.found ? state.confs : 0,
        ts: chainMs,
        note: st.note,
        directionLabel: dirIn ? 'Incoming' : 'Outgoing',
        minimaOnChain: true,
        // Hold the incoming settling overlay ONE block past the confirm target: the app declares
        // Confirmed at 3 confs but the node only moves the coin into `sendable` at coin depth —
        // dropping the overlay at 3 made the displayed balance dip back to the pre-transaction
        // value for a block ("balance went back once confirmed").
        pendingIncoming: dirIn && (!state.found || state.confs < state.target + 1)
      }, adoptLocal);
      var target = (row && Number(row.confirmTarget)) || state.target;
      if (st.status !== 'Confirmed') tracked.push({ id: rowId, dirIn: dirIn, target: target });
      try { console.log('[TxMirror] ' + (dirIn ? 'IN ' : 'OUT ') + st.status + ' ' + rowId.slice(0, 22) + ' ' + (e.amt > 0 ? '+' : '') + e.amt + ' ' + e.label); } catch (_) { /* ignore */ }
    }
    if (tracked.length) pending[txpowid] = { rows: tracked };
    // Live incoming payment (not the initial import): let the UI react — e.g. the receive
    // window closes itself, mirroring the send side's fire-and-close.
    if (notifyIncoming) {
      var incoming = entries.find(function (e) { return e.amt > 0; });
      if (incoming && typeof window.stablesOnMirrorIncomingDetected === 'function') {
        try { window.stablesOnMirrorIncomingDetected({ label: incoming.label, amt: Math.abs(incoming.amt), txpowid: txpowid }); } catch (_) { /* ignore */ }
      }
    }
  }

  // Advance the ladder for still-settling transactions (one cheap lookup each).
  function advancePending() {
    var ids = Object.keys(pending).slice(0, 6);
    ids.forEach(function (txpowid) {
      runCmd('txpow onchain:' + txpowid, function (res) {
        var r = payload(res);
        if (!res || res.status === false || !r) {
          try { console.log('[TxMirror] advance lookup failed ' + txpowid.slice(0, 12) + ' res=' + JSON.stringify(res).slice(0, 160)); } catch (_) { /* ignore */ }
          return;
        }
        var found = r.found === true || r.found === 'true';
        var confs = parseInt(String(r.confirmations || '0'), 10) || 0;
        var block = parseInt(String(r.block || '0'), 10) || 0;
        var entry = pending[txpowid];
        if (!entry) return;
        // Log transitions only (found flips or confirmation count moves), not every cycle.
        var sig = found + ':' + confs;
        if (entry.lastSig !== sig) {
          entry.lastSig = sig;
          try { console.log('[TxMirror] advance ' + txpowid.slice(0, 12) + ' found=' + found + ' confs=' + confs + ' targets=' + entry.rows.map(function (t) { return t.target; }).join(',')); } catch (_) { /* ignore */ }
        }
        var allDone = true;
        entry.rows.forEach(function (t) {
          var st = ladder(t.dirIn, found, confs, t.target);
          var overlayHold = t.dirIn && (!found || confs < t.target + 1);
          window.stablesMirrorUpsertRow({
            id: t.id,
            status: st.status,
            block: block,
            txConfirmations: found ? confs : 0,
            // Merged fill rows carry the trade's other side in the note ("For 222 Winiwa.");
            // ladder updates must not erase it.
            note: st.note + (t.noteSuffix || ''),
            pendingIncoming: overlayHold
          });
          // Keep tracking one block past Confirmed on incoming rows so the overlay release
          // (pendingIncoming -> false) is actually written once sendable has caught up.
          if (st.status !== 'Confirmed' || overlayHold) allDone = false;
        });
        if (allDone) {
          delete pending[txpowid];
          try { console.log('[TxMirror] Confirmed ' + txpowid.slice(0, 18)); } catch (_) { /* ignore */ }
        }
      });
    });
  }

  // Repair stored covenant rows: re-resolve each stored NODE row (address-aware) against chain
  // and remove it (un-known'ing its txpow) when the stored representation is wrong — a faucet
  // claim stored as outgoing, or a relayed claim wrongly stored as received on the pool node.
  // importMissing then re-creates only the rows that are genuinely ours, with correct direction.
  function reconcileStoredCovenantRows(txpows, details, done) {
    if (typeof window.stablesListNodeRowsForRecheck !== 'function'
      || typeof window.stablesRemoveActivityRowById !== 'function') { done(); return; }
    var rows = window.stablesListNodeRowsForRecheck();
    if (!rows.length) { done(); return; }
    // Minima returns txpowids uppercase, but stored NODE ids are lowercased — key the history
    // map case-insensitively and use the original-case txpowid for the raw lookup.
    var byId = {};
    for (var i = 0; i < txpows.length; i++) {
      var tid = String(txpows[i].txpowid || '');
      byId[tid.toLowerCase()] = { txpowid: tid, detail: details && details[i] };
    }
    var idx = 0;
    (function next() {
      if (idx >= rows.length) { done(); return; }
      var row = rows[idx++];
      var hit = byId[String(row.txid || '').toLowerCase()];
      if (!hit) {
        // The Core connector intentionally bounds history to three entries. That must not make
        // pre-law mint/burn rows permanent. Resolve only the exact old two-leg shape by txpow ID,
        // then migrate it only when Core proves the transaction is on-chain and current code
        // recognises one unambiguous operation. Every other out-of-window row stays untouched.
        var legacyOperation = !row.opMerged
          && /^(Minting|Minted|Burning|Burned|Locked|Locking|Reclaiming|Reclaimed)\b/i.test(String(row.title || ''));
        var legacyTxid = String(row.txid || '');
        if (!legacyOperation || !/^0x[0-9a-f]{64}$/i.test(legacyTxid)) { next(); return; }
        resolveEntries(legacyTxid, null, function (legacyEntries, legacyKind, legacyMeta) {
          if (!legacyEntries || !legacyEntries.length) { next(); return; }
          var legacySpec = operationSpecFromEntries(legacyEntries, legacyKind);
          if (!legacySpec) { next(); return; }
          runCmd('txpow onchain:' + legacyTxid, function (onchainRes) {
            var onchain = payload(onchainRes) || {};
            if (!(onchain.found === true || onchain.found === 'true')) { next(); return; }
            try { window.stablesRemoveActivityRowById(row.id); } catch (_) { /* ignore */ }
            delete known[row.txid];
            var rawHeader = legacyMeta && legacyMeta.rawHeader;
            representTxn(legacyTxid, legacyEntries, {
              found: true,
              confs: parseInt(String(onchain.confirmations || DEFAULT_TARGET + 1), 10) || DEFAULT_TARGET + 1,
              block: parseInt(String(onchain.block || (rawHeader && rawHeader.block) || '0'), 10) || 0,
              target: DEFAULT_TARGET,
              timemilli: Number(rawHeader && rawHeader.timemilli) || 0
            }, true, false, legacyKind, legacyMeta);
            try { console.log('[TxMirror] migrated pre-law operation row ' + row.id.slice(0, 24)); } catch (_) { /* ignore */ }
            next();
          });
        }, true);
        return;
      }
      /* Already judged correct in exactly this shape: nothing to ask the node. */
      var vkey = verdictKey(row, hit.txpowid);
      if (nonRowRemembered(vkey)) { next(); return; }
      resolveEntries(hit.txpowid, hit.detail, function (entries, covKind, meta) {
        // entries is address-aware: [] => not ours (relayed). Judge EVERY stored node row against
        // this ownership truth (2026-07-10): the old negative-only gate let positive phantoms
        // (a tracked +10,000,000 covenant seed) survive every sweep. Any row no importer should
        // have created — from ANY code path, past or present — is purged by the next deep pass.
        if (entries === null) { next(); return; } // indeterminate (busy node): retry on a later pass
        var wrong = false;
        // ONE ROW PER TRADE: order/fill txns are judged against the merged-row spec, so stored
        // two-leg history from pre-law code purges itself and re-imports in the merged form.
        var spec = orderSpecFromMeta(entries, covKind, meta);
        // ONE ROW PER OPERATION: judge stored rows against the consolidated mint/burn form, so
        // two-leg history written before this law purges itself and re-imports as one row. The
        // outgoing leg fails on ccy and direction, the incoming leg fails on the missing flag,
        // and removal un-knowns the txpow so the next import rebuilds it correctly.
        var opSpec = (spec ? null : operationSpecFromEntries(entries, covKind));
        if (opSpec) {
          var okOpAmt = Math.abs(Math.abs(row.amt) - opSpec.amt) <= Math.max(1e-9, opSpec.amt * 1e-6);
          wrong = row.dir !== 'in' || row.ccy !== opSpec.ccy || row.title !== opSpec.title
            || !row.opMerged || !okOpAmt;
        } else if (spec && spec.kind === 'clear') {
          var okAmt = Math.abs(Math.abs(row.amt) - spec.amt) <= Math.max(1e-9, spec.amt * 1e-6);
          wrong = row.dir !== 'in' || row.ccy !== spec.ccy || row.title !== spec.title || !row.g3Merged || !okAmt;
        } else if (spec && spec.kind === 'commit') {
          // If the fill row already exists, the order leg must not; otherwise it must look
          // like the current pending-order form.
          if (orderCoinsConsumed(spec.coinids)) wrong = true;
          else wrong = row.dir !== 'out' || row.ccy !== spec.ccy || row.title !== spec.title;
        } else {
          var match = entries.filter(function (e) { return e.label === row.ccy; })[0];
          var correctSigned = match ? match.amt : 0;
          var storedSigned = row.dir === 'in' ? Math.abs(row.amt) : -Math.abs(row.amt);
          // Wrong if not ours (correctSigned 0) or direction/side differs from stored.
          wrong = !match || (correctSigned > 0) !== (storedSigned > 0);
          // Also wrong when the stored TITLE disagrees with the covenant framing CURRENT code gives
          // this transaction (stale-code titles, e.g. a mint leg labeled Coverage fund by an older
          // kind map). Removal un-knowns the txpow, so the next import rebuilds the row correctly.
          if (!wrong && match && row.title) {
            var covText = covKind ? covenantRowText(covKind, row.ccy, storedSigned > 0) : null;
            var expectedTitle = covText ? covText.title : ((storedSigned > 0 ? 'Received ' : 'Sent ') + row.ccy);
            if (expectedTitle && row.title !== expectedTitle) wrong = true;
          }
        }
        if (!wrong) rememberNonRow(vkey);
        if (wrong) {
          try { window.stablesRemoveActivityRowById(row.id); } catch (_) { /* ignore */ }
          delete known[row.txid];
          try { console.log('[TxMirror] repaired stored covenant row ' + row.id.slice(0, 24) + ' (was ' + row.dir + ' ' + row.amt + ' "' + row.title + '")'); } catch (_) { /* ignore */ }
        }
        next();
      });
    })();
  }

  // Initial import: represent history transactions the list does not know yet (fresh
  // install, or txns received while the app was closed). Statuses resolve via the ladder.
  /* WHAT THIS WALLET HAS ALREADY JUDGED NOT TO BE ITS OWN, REMEMBERED ACROSS OPENS.
   *
   * Only a CONCLUSIVE answer is remembered. resolveEntries reports null for every indeterminate
   * case — the txpow lookup failed, or an address ownership check did not resolve — so an empty
   * result means the transaction's coins were all read, all owners were known, and none of them
   * belong to this wallet. That answer cannot change on its own, so paying a node read for it on
   * every app open and on every deep pass was pure waste: on the founder's phone about a hundred
   * `txpow txpowid` reads in a twenty-second burst per open.
   *
   * Two things can change the answer, and both invalidate this cache rather than fight it: a
   * different wallet (the fingerprint guard clears the key) and a different token set (the key
   * carries the registry's ids, so a new generation starts cold).
   */
  var NONROW_MAX = 900;
  var _nonRow = null;
  function nonRowKey() {
    var reg = (window.STABLES_CONFIG || {}).TEST_TOKEN_REGISTRY || {};
    var ids = String(reg.winiwa_token_id || '') + String(reg.usdw_token_id || '') + String(reg.xwiniwa_token_id || '');
    var h = 0;
    for (var i = 0; i < ids.length; i++) { h = ((h << 5) - h + ids.charCodeAt(i)) | 0; }
    /* v2: the store also remembers a stored row judged correct against the chain, so the version
       moves when either judgement's rules change. */
    return 'stables_txmirror_decided_v2_' + (h >>> 0).toString(36);
  }
  function nonRowLoad() {
    if (_nonRow) return _nonRow;
    _nonRow = { ids: {}, order: [] };
    try {
      var raw = localStorage.getItem(nonRowKey());
      var parsed = raw ? JSON.parse(raw) : null;
      var list = (parsed && Array.isArray(parsed.order)) ? parsed.order.slice(-NONROW_MAX) : [];
      for (var i = 0; i < list.length; i++) {
        var s = String(list[i] || '');
        if (!s || _nonRow.ids[s]) continue;
        _nonRow.ids[s] = 1;
        _nonRow.order.push(s);
      }
    } catch (_) { /* a cache that cannot be read is simply an empty one */ }
    return _nonRow;
  }
  function nonRowRemembered(id) {
    try { return !!nonRowLoad().ids[String(id || '')]; } catch (_) { return false; }
  }
  function rememberNonRow(id) {
    var s = String(id || '');
    if (!s) return;
    try {
      var c = nonRowLoad();
      if (c.ids[s]) return;
      c.ids[s] = 1;
      c.order.push(s);
      while (c.order.length > NONROW_MAX) { delete c.ids[c.order.shift()]; }
      localStorage.setItem(nonRowKey(), JSON.stringify({ v: 1, order: c.order }));
    } catch (_) { /* the cache is an optimisation; losing it costs reads, never truth */ }
  }
  /* AND WHAT IT HAS ALREADY JUDGED TO BE RIGHT.
   *
   * The deep pass re-judges every stored row against the chain, one `txpow txpowid` read per row,
   * on every app open. On the founder's phone that is 89 reads and about 3 seconds of node time
   * per open, spent re-confirming rows that were already correct and whose chain data cannot
   * change. So a row judged correct is remembered BY ITS CONTENT: the moment anything the verdict
   * depended on differs — title, amount, direction, currency, status, either merge flag — the key
   * differs too and the row is judged again. A row judged WRONG is never remembered; it is
   * removed and re-imported, which is the repair this pass exists for.
   */
  function verdictKey(row, txpowid) {
    var r = row || {};
    return 'v|' + String(txpowid || '') + '|' + String(r.id || '') + '|' + String(r.title || '')
      + '|' + String(r.amt) + '|' + String(r.dir || '') + '|' + String(r.ccy || '')
      + '|' + String(r.status || '') + '|' + (r.opMerged ? 1 : 0) + (r.g3Merged ? 1 : 0);
  }

  /* Diagnostics: how many decisions this device is not paying for any more. */
  window.__STABLES_TXMIRROR_NONROW__ = function () {
    var c = nonRowLoad();
    return { key: nonRowKey(), remembered: c.order.length };
  };

  function importMissing(txpows, details, notifyIds) {
    if (importing) return;
    importing = true;
    var idx = 0;
    (function next() {
      if (idx >= txpows.length) { importing = false; return; }
      var i = idx++;
      var id = String((txpows[i] || {}).txpowid || '');
      var baseEntries = txnEntries(details && details[i]);
      if (!id || (!baseEntries.length && !zeroNetInScope(details && details[i]))
        || (typeof window.stablesHasNodeActivityRow === 'function' && window.stablesHasNodeActivityRow(nodeId(id)))
        /* A TRANSACTION THAT IS NOT OURS DOES NOT BECOME OURS LATER (founder 2026-09-03, battery).
           This decision cost a full `txpow txpowid` read per history entry, and it was taken again
           on every app open and on every one of the three staggered deep passes: about 100 node
           reads in a 20-second burst each time the founder opened the app, all of them re-learning
           that the same oracle updates and other people's covenant legs are not rows in this
           wallet. Once resolved to "nothing to show", it is remembered on this device. */
        || nonRowRemembered(id)) {
        next();
        return;
      }
      var chainMs = Number(((txpows[i] || {}).header || {}).timemilli) || 0;
      resolveEntries(id, details && details[i], function (entries, covKind, meta) {
        if (entries === null) { next(); return; } // indeterminate: the staggered passes retry
        if (!entries.length) { rememberNonRow(id); next(); return; }
        /* The receive handoff must not depend on one optional field.
         *
         * It used to fire ONLY when the native NEWTXPOW event carried a txpowid that marked this
         * transaction urgent. If that event arrived without an id, arrived late, or did not arrive
         * at all, the row still appeared through a staggered pass but the Receive window stayed
         * open and the person was left watching a QR code for a payment that had already landed
         * (founder 2026-09-01).
         *
         * A payment arriving while Receive is open IS the thing Receive is waiting for. So a fresh
         * incoming transaction also counts as live, whatever route told us about it. The window is
         * narrow on purpose: the receive surface must be open, the transaction must be genuinely
         * incoming, it must be recent, and this must not be the initial history import , otherwise
         * opening Receive after a restart would close itself on an old payment.
         */
        var freshIncoming = false;
        try {
          if (known !== null && chainMs > 0 && (Date.now() - chainMs) < LIVE_RECEIVE_WINDOW_MS) {
            var recv = document.getElementById('recvModal');
            if (recv && recv.classList.contains('open')
              && entries.some(function (e) { return e.amt > 0; })) freshIncoming = true;
          }
        } catch (_) { /* the urgent path still applies */ }
        var notifyLive = !!(notifyIds && notifyIds[id]) || freshIncoming;
        if (notifyLive) {
          delete urgentTxpowIds[id];
          // The event itself is the mempool observation. Do not wait for a second
          // `txpow onchain` command before adding the row and leaving Receive.
          representTxn(id, entries, {
            found: false,
            confs: 0,
            block: 0,
            target: DEFAULT_TARGET,
            timemilli: chainMs
          }, true, true, covKind, meta);
          next();
          return;
        }
        runCmd('txpow onchain:' + id, function (res) {
          var r = payload(res) || {};
          // Adopt matching local optimistic rows here too: a transaction that settled while
          // the app was closed otherwise imports as a duplicate NODE row and the stranded
          // local row later expires to a false "Failed". No incoming notify on import.
          representTxn(id, entries, {
            found: r.found === true || r.found === 'true',
            confs: parseInt(String(r.confirmations || '0'), 10) || 0,
            block: parseInt(String(r.block || '0'), 10) || 0,
            target: DEFAULT_TARGET,
            timemilli: chainMs
          }, true, false, covKind, meta);
          next();
        });
      });
    })();
  }

  // Rescue: a stored row already marked "Failed" whose transaction actually landed on-chain.
  // Earlier builds could skip covenant imports when `checkaddress` timed out during node boot
  // (arm always races the busiest boot phase), so no NODE twin ever existed for the heal and
  // the optimistic row stayed falsely failed. Match each failed non-NODE row against history
  // by resolved entries (token, amount, direction) and the txpow's own time; on a match remove
  // the false-failed row and let importMissing represent the txpow as a proper NODE row.
  // Stale-settling sweep (founder 2026-07-07: an orphaned mint posted from an old session sat
  // "sending" forever — the rescue machinery only looks at recent transactions). Any local row
  // still in a settling status after 2 hours whose transaction is NOT on-chain gets marked
  // Failed honestly: an orphaned covenant transaction never spends its inputs, so the note can
  // truthfully say the funds are untouched and a retry is safe.
  function failStaleSettlingRows() {
    try {
      var rows = (typeof window.stablesGetUserActivityRows === 'function') ? (window.stablesGetUserActivityRows() || []) : [];
      var now = Date.now();
      var STALE_MS = 2 * 60 * 60 * 1000;
      rows.forEach(function (r) {
        if (!r || !r.minimaOnChain) return;
        var s = String(r.status || '').toLowerCase();
        var settling = s === 'pending' || s === 'broadcasted' || s === 'sending' || s === 'receiving';
        if (!settling) return;
        if (!r.ts || (now - Number(r.ts)) < STALE_MS) return;
        var tx = String(r.explorerTxId || r.pendingTxnId || '').trim();
        var fail = function () {
          try {
            if (typeof window.stablesUpsertUserActivityRows === 'function') {
              window.stablesUpsertUserActivityRows([{ id: r.id, status: 'Failed', pendingIncoming: false, note: 'Did not settle — the funds were not spent. Safe to try again.' }]);
              if (typeof window.renderActivity === 'function') window.renderActivity();
              if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
            }
          } catch (_) { /* ignore */ }
        };
        if (!tx) { fail(); return; }
        runCmd('txpow onchain:' + tx, function (res) {
          var p = payload(res);
          if (!(p && (p.found === true || p.found === 'true'))) fail();
        });
      });
    } catch (_) { /* ignore */ }
  }

  // Settle-mined sweep (founder 2026-07-07: a mined USDw mint sat "receiving" with a bare
  // "undefined · undefined" row). Two defects, one sweep: (1) rows whose transaction IS
  // on-chain past its confirm target were never upgraded to Confirmed when the flow died
  // (app closed / reload mid-flow) — they keep the settling glow on their currency row and
  // the hero total pulsing FOREVER; (2) status-only upserts can create a bare row missing
  // date/counterparty/icon, which rendered literal "undefined". Upgrade the status from
  // chain truth and refill the missing display fields.
  function settleMinedSettlingRows() {
    try {
      var rows = (typeof window.stablesGetUserActivityRows === 'function') ? (window.stablesGetUserActivityRows() || []) : [];
      var targets = rows.filter(function (r) {
        if (!r) return false;
        var s = String(r.status || '').toLowerCase();
        var settling = s === 'pending' || s === 'broadcasted' || s === 'sending' || s === 'receiving' || s === 'on-chain';
        if (!settling) return false;
        return !!String(r.explorerTxId || '').trim();
      }).slice(0, 12);
      var i = 0;
      (function next() {
        if (i >= targets.length) return;
        var r = targets[i++];
        runCmd('txpow onchain:' + String(r.explorerTxId).trim(), function (res) {
          try {
            var p = payload(res);
            var found = p && (p.found === true || p.found === 'true');
            var confs = parseInt(String((p && p.confirmations) || '0'), 10) || 0;
            var block = parseInt(String((p && p.block) || '0'), 10) || 0;
            var target = Number(r.confirmTarget) || DEFAULT_TARGET;
            if (found && confs >= target) {
              var up = { id: r.id, status: 'Confirmed', pendingIncoming: false, minimaOnChain: true };
              if (block > 0) up.block = block;
              // Refill display fields a bare status-upsert row is missing.
              var title = String(r.title || '');
              if (!r.date) {
                var ts = Number(r.ts) || Number(String(r.id || '').replace(/^\D+/, '')) || 0;
                if (ts > 1500000000000) {
                  var d = new Date(ts);
                  up.date = d.toLocaleString('en-GB', { month: 'short', day: '2-digit' })
                    + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                }
              }
              if (!r.counterparty) {
                up.counterparty = /usdw/i.test(title) ? 'Protocol (USDw)'
                  : (/xwiniwa/i.test(title) ? 'Protocol (xWiniwa)'
                    : (/faucet|pour/i.test(title) ? 'On-chain faucet covenant' : 'Protocol'));
              }
              if (!r.icon) up.icon = (r.dir === 'out') ? '↗' : '↙';
              if (!r.directionLabel) up.directionLabel = (r.dir === 'out') ? 'Outgoing' : 'Incoming';
              if (typeof window.stablesUpsertUserActivityRows === 'function') {
                window.stablesUpsertUserActivityRows([up]);
              }
              try { console.log('[TxMirror] settled mined row ' + String(r.id).slice(0, 26) + ' at block ' + block + ' (' + confs + ' confs)'); } catch (_) { /* ignore */ }
              try { if (typeof window.renderActivity === 'function') window.renderActivity(); } catch (_) { /* ignore */ }
              try { if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity(); } catch (_) { /* ignore */ }
              try { if (typeof window.updateGlobalUI === 'function') window.updateGlobalUI(); } catch (_) { /* ignore */ }
              try { if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator(); } catch (_) { /* ignore */ }
            }
          } catch (_) { /* ignore */ }
          next();
        });
      })();
    } catch (_) { /* ignore */ }
  }

  // Covenant receive-leg amount repair (founder 2026-07-07: mints must ALWAYS present as an
  // incoming +amount row). Historic optimistic receive rows lost their amounts in old upserts;
  // recover the CHAIN-TRUE amount from the mined transaction itself — the covenant guarantees
  // output 0 pays the recipient the received token — and stamp it back onto the stored row.
  function repairCovenantReceiveAmounts() {
    try {
      var rows = (typeof window.stablesGetUserActivityRows === 'function') ? (window.stablesGetUserActivityRows() || []) : [];
      var cfg = window.STABLES_CONFIG || {};
      var reg = cfg.TEST_TOKEN_REGISTRY || {};
      var tokenCcy = {};
      if (reg.winiwa_token_id) tokenCcy[String(reg.winiwa_token_id).toLowerCase()] = 'Winiwa';
      if (reg.usdw_token_id) tokenCcy[String(reg.usdw_token_id).toLowerCase()] = 'USDw';
      if (reg.xwiniwa_token_id) tokenCcy[String(reg.xwiniwa_token_id).toLowerCase()] = 'xWiniwa';
      var targets = rows.filter(function (r) {
        if (!r) return false;
        var amt = Number(r.amt);
        if (Number.isFinite(amt) && amt !== 0) return false;
        if (!/^(mint(ing|ed)|reclaim(ing|ed))\b/i.test(String(r.title || ''))) return false;
        return !!String(r.explorerTxId || '').trim();
      }).slice(0, 12);
      var i = 0;
      (function next() {
        if (i >= targets.length) return;
        var r = targets[i++];
        runCmd('txpow txpowid:' + String(r.explorerTxId).trim(), function (res) {
          try {
            var p = payload(res);
            var txn = p && p.body && (p.body.txn || p.body.transaction);
            var outs = txn && Array.isArray(txn.outputs) ? txn.outputs : [];
            var o = outs[0];
            var tok = o ? String(o.tokenid || '').toLowerCase() : '';
            var amt = o ? Number(o.tokenamount != null ? o.tokenamount : o.amount) : NaN;
            if (o && Number.isFinite(amt) && amt > 0 && tokenCcy[tok]) {
              if (typeof window.stablesUpsertUserActivityRows === 'function') {
                window.stablesUpsertUserActivityRows([{ id: r.id, amt: Math.abs(amt), ccy: tokenCcy[tok], dir: 'in', minimaOnChain: true }]);
              }
              try { console.log('[TxMirror] repaired receive amount for ' + String(r.id).slice(0, 26) + ' -> +' + amt + ' ' + tokenCcy[tok]); } catch (_) { /* ignore */ }
              try { if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity(); } catch (_) { /* ignore */ }
            }
          } catch (_) { /* ignore */ }
          next();
        });
      })();
    } catch (_) { /* ignore */ }
  }

  // Missing receive-leg rebuild (founder 2026-07-07: "the minting of xWiniwa should be
  // presented as the minting transaction of USDw is currently"). When the optimistic receive
  // row of a covenant mint/burn is lost (superseded/deduped), the transaction is left with
  // only its spend leg and renders as a red outgoing. Rebuild the receive leg from the mined
  // transaction itself — the covenant guarantees output 0 pays the recipient — as a stable
  // 'RECV-<txid>' row the one-row merge then presents as the green primary.
  function repairMissingCovenantReceiveLegs() {
    try {
      var rows = (typeof window.stablesGetUserActivityRows === 'function') ? (window.stablesGetUserActivityRows() || []) : [];
      var cfg = window.STABLES_CONFIG || {};
      var reg = cfg.TEST_TOKEN_REGISTRY || {};
      var tokenCcy = {};
      if (reg.winiwa_token_id) tokenCcy[String(reg.winiwa_token_id).toLowerCase()] = 'Winiwa';
      if (reg.usdw_token_id) tokenCcy[String(reg.usdw_token_id).toLowerCase()] = 'USDw';
      if (reg.xwiniwa_token_id) tokenCcy[String(reg.xwiniwa_token_id).toLowerCase()] = 'xWiniwa';
      var isCovenantLegRow = function (r) {
        if (!r) return false;
        if (/faucet|pour/i.test(String(r.title || ''))) return false; // faucet rows own their framing
        return /^(lock(ing|ed)|mint(ing|ed)|burn(ing|ed)|reclaim(ing|ed))\b/i.test(String(r.title || ''))
          || /^protocol\b/i.test(String(r.counterparty || ''));
      };
      var groups = {};
      rows.forEach(function (r) {
        if (!isCovenantLegRow(r)) return;
        var tx = String(r.explorerTxId || '').trim().toLowerCase();
        if (!/^0x[0-9a-f]{16,}$/.test(tx)) return;
        (groups[tx] = groups[tx] || []).push(r);
      });
      var targets = Object.keys(groups).filter(function (tx) {
        var g = groups[tx];
        var hasRecv = g.some(function (r) { return r.dir === 'in' && Math.abs(Number(r.amt) || 0) > 0; });
        var confirmed = g.some(function (r) { return String(r.status) === 'Confirmed'; });
        var already = rows.some(function (r) { return String(r.id || '') === 'RECV-' + tx; });
        return !hasRecv && confirmed && !already;
      }).slice(0, 8);
      var i = 0;
      (function next() {
        if (i >= targets.length) return;
        var tx = targets[i++];
        runCmd('txpow txpowid:' + tx, function (res) {
          try {
            var p = payload(res);
            var txn = p && p.body && (p.body.txn || p.body.transaction);
            var outs = txn && Array.isArray(txn.outputs) ? txn.outputs : [];
            var o = outs[0];
            // The receive leg is only real if output 0 is a USER coin: g3 forward-pricing commits
            // put the ESCROW at output 0 (a covenant address) and the actual receive arrives in a
            // LATER keeper-clear txn — blindly adopting outs[0] fabricated "+100 Reclaimed Winiwa".
            if (o && coinIsCovenant(o)) { next(); return; }
            var tok = o ? String(o.tokenid || '').toLowerCase() : '';
            var amt = o ? Number(o.tokenamount != null ? o.tokenamount : o.amount) : NaN;
            var ccy = tokenCcy[tok];
            if (o && Number.isFinite(amt) && amt > 0 && ccy) {
              var title = ccy === 'Winiwa' ? 'Reclaimed Winiwa' : ('Minted ' + ccy);
              var tms = Number(p.header && p.header.timemilli) || Number(groups[tx][0].ts) || 0;
              var dateText = '';
              if (tms > 1500000000000) {
                var d = new Date(tms);
                dateText = d.toLocaleString('en-GB', { month: 'short', day: '2-digit' })
                  + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
              }
              var up = {
                id: 'RECV-' + tx,
                dir: 'in',
                icon: '↙',
                title: title,
                counterparty: (groups[tx].filter(function (r) { return r.counterparty; })[0] || {}).counterparty
                  || (ccy === 'Winiwa' ? 'Protocol (USDw)' : ('Protocol (' + ccy + ')')),
                category: ccy,
                date: dateText,
                amt: Math.abs(amt),
                ccy: ccy,
                explorerTxId: tx,
                status: 'Confirmed',
                minimaOnChain: true,
                pendingIncoming: false,
                balanceAlreadyApplied: true,
                directionLabel: 'Incoming',
                ts: tms || Date.now(),
                note: 'Receive leg restored from the mined transaction (covenant output 0 pays the recipient).'
              };
              if (typeof window.stablesUpsertUserActivityRows === 'function') window.stablesUpsertUserActivityRows([up]);
              try { console.log('[TxMirror] rebuilt receive leg for ' + tx.slice(0, 14) + ' -> +' + amt + ' ' + ccy); } catch (_) { /* ignore */ }
              try { if (typeof window.renderActivity === 'function') window.renderActivity(); } catch (_) { /* ignore */ }
              try { if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity(); } catch (_) { /* ignore */ }
            }
          } catch (_) { /* ignore */ }
          next();
        });
      })();
    } catch (_) { /* ignore */ }
  }

  function rescueFailedRows(txpows, details, done) {
    if (typeof window.stablesListFailedOptimisticRows !== 'function'
      || typeof window.stablesRemoveActivityRowById !== 'function') { done(); return; }
    var failed = window.stablesListFailedOptimisticRows();
    if (!failed.length) { done(); return; }
    try { console.log('[TxMirror] rescue pass: ' + failed.length + ' failed/stuck local rows'); } catch (_) { /* ignore */ }
    // Tight window vs the txpow's REAL chain time (v0.0.3.12): a failed local row is only
    // rescued by a txn that happened around when the user acted — never by an old lookalike.
    var WINDOW_MS = 30 * 60 * 1000;

    function rescueRow(f, txid, how) {
      f.rescued = true;
      try { window.stablesRemoveActivityRowById(f.id); } catch (_) { /* ignore */ }
      if (txid) delete known[String(txid)];
      try { console.log('[TxMirror] rescued false-failed row ' + String(f.id).slice(0, 26) + ' (' + how + ') tx ' + String(txid).slice(0, 12)); } catch (_) { /* ignore */ }
    }

    // Pass 1 — rows that recorded their transaction id when the flow broadcast (explorerTxId /
    // pendingTxnId): one authoritative `txpow onchain:` lookup decides. Found on-chain means
    // the transaction succeeded; the false-failed row is removed and importMissing (or the
    // next deep pass) represents the txpow as a proper NODE row.
    var withTxid = failed.filter(function (f) { return f.txid; });
    var wi = 0;
    (function nextTxid() {
      if (wi >= withTxid.length) { fuzzyPass(); return; }
      var f = withTxid[wi++];
      runCmd('txpow onchain:' + f.txid, function (res) {
        var r = payload(res);
        if (r && (r.found === true || r.found === 'true')) rescueRow(f, f.txid, 'onchain-txid');
        nextTxid();
      });
    })();

    // Pass 2 — rows without a recorded txid: match against history txpows by token, amount,
    // direction, and the txpow's own time. When the address-aware covenant recompute comes
    // back EMPTY on a busy node (checkaddress timeouts) fall back to the raw difference
    // entries — indeterminate must not read as "no match".
    function fuzzyPass() {
      var idx = 0;
      (function next() {
        if (idx >= txpows.length) { done(); return; }
        var i = idx++;
        var tp = txpows[i] || {};
        var txid = String(tp.txpowid || '');
        var base = txnEntries(details && details[i]);
        if (!txid || !base.length) { next(); return; }
        if (typeof window.stablesHasNodeActivityRow === 'function'
          && window.stablesHasNodeActivityRow(nodeId(txid))) { next(); return; }
        var tms = Number(tp.header && tp.header.timemilli) || 0;
        resolveEntries(txid, details && details[i], function (entries) {
          var usable = (entries && entries.length) ? entries : base;
          usable.forEach(function (e) {
            var match = failed.find(function (f) {
              return !f.rescued && !f.txid
                && String(f.ccy || '') === e.label
                && ((e.amt > 0) === (String(f.dir || '') === 'in'))
                && Math.abs(Math.abs(e.amt) - Math.abs(Number(f.amt) || 0)) <= Math.max(1e-9, Math.abs(e.amt) * 1e-6)
                && (!tms || !f.ts || Math.abs(tms - Number(f.ts)) <= WINDOW_MS);
            });
            if (match) rescueRow(match, txid, entries.length ? 'entries' : 'difference');
          });
          next();
        });
      })();
    }
  }

  // Deep reconcile: repair stored covenant rows, rescue false-failed rows, and import missing
  // NODE rows from a wider history window. Runs at arm and again ~90s later — the arm fires on
  // the first successful `history` right after node boot, when `checkaddress`/`txpow` lookups
  // are most likely to time out; the delayed pass retries on a calm node. Imports are limited
  // to txpows from the last 48h so pre-mirror-era history is never resurrected as new rows.
  function deepReconcilePass() {
    // max:250 (was 60): oracle rate updates are wallet-relevant to every covenant-tracking
    // wallet and can push the user's real transactions deep into history; zero-difference
    // entries are skipped cheaply by txnEntries, so the wider window costs one larger read.
    runCmd('history max:250', function (res) {
      var r = payload(res);
      if (!res || res.status === false || !r || !r.txpows) return;
      var cutoff = Date.now() - 48 * 60 * 60 * 1000;
      var txpows = [];
      var details = [];
      for (var i = 0; i < r.txpows.length; i++) {
        var tms = Number((r.txpows[i] || {}).header && r.txpows[i].header.timemilli) || 0;
        if (tms && tms < cutoff) continue;
        txpows.push(r.txpows[i]);
        details.push(r.details && r.details[i]);
      }
      if (!txpows.length) return;
      reconcileStoredCovenantRows(txpows, details, function () {
        rescueFailedRows(txpows, details, function () {
          importMissing(txpows, details);
        });
      });
    });
  }

  function check(txpowId) {
    var urgentId = String(txpowId || '').trim();
    if (urgentId) urgentTxpowIds[urgentId] = true;
    // A transaction build owns the node channel. On the Core companion every command is a ~520ms
    // cross-process round trip, and this 3-second history poll was landing between almost every
    // state port of a faucet claim, doubling the build and pushing it past its timeout. An urgent
    // kick (a live NEWTXPOW) still runs: that one is not routine housekeeping.
    try {
      if (!urgentId && typeof window.stablesNodeChannelBusy === 'function' && window.stablesNodeChannelBusy()) {
        recheck = true;
        return;
      }
    } catch (_) { /* if the flag cannot be read, poll as before */ }
    if (checking) { recheck = true; return; }
    checking = true;
    runCmd('history max:20', function (res) {
      checking = false;
      var r = payload(res);
      if (!res || res.status === false || !r || !r.txpows) {
        if (recheck) { recheck = false; check(); }
        return;
      }
      if (known === null) {
        known = {};
        for (var i = 0; i < r.txpows.length; i++) known[String(r.txpows[i].txpowid || '')] = true;
        try { console.log('[TxMirror] armed — ' + r.txpows.length + ' txns in history'); } catch (_) { /* ignore */ }
        // Re-track rows that were still settling when the app last closed (pending set is
        // in-memory only): group unsettled NODE- rows by their txpowid and resume the ladder.
        try {
          if (typeof window.stablesListUnsettledNodeRows === 'function') {
            window.stablesListUnsettledNodeRows().forEach(function (u) {
              var txpowid = u.id.replace(/^NODE-/, '').replace(/:.*$/, '');
              if (!txpowid) return;
              if (!pending[txpowid]) pending[txpowid] = { rows: [] };
              pending[txpowid].rows.push({ id: u.id, dirIn: u.dirIn, target: u.target || DEFAULT_TARGET });
              try { console.log('[TxMirror] re-tracking ' + u.id.slice(0, 22)); } catch (_) { /* ignore */ }
            });
          }
        } catch (_) { /* ignore */ }
        // IMMEDIATE light import of the freshest transactions using the history we ALREADY have
        // in hand (no extra node call): a payment received while the app was closed notifies via
        // the native service in ~15s, and must appear in the list the moment the app opens — not
        // after the staggered deep pass ("I get notifications for transactions I don't find in
        // the app"). Most of these 20 entries are zero-difference and skip instantly.
        try { importMissing(r.txpows, r.details, urgentTxpowIds); } catch (_) { /* deep passes still run */ }
        // The deep pass scans 250 history entries; running it AT arm (the embedded node's
        // busiest boot window) starved the node bridge and ANR'd the APK ("Stables isn't
        // responding" on launch). Stagger it: first pass 20s after arm, retries on a calmer node.
        setTimeout(deepReconcilePass, 20000);
        setTimeout(deepReconcilePass, 90000);
        setTimeout(deepReconcilePass, 5 * 60 * 1000);
        setTimeout(failStaleSettlingRows, 30000);
        setTimeout(repairCovenantReceiveAmounts, 40000);
        // Settle-mined sweep: 25s after arm, then again each 2 min so a row that mines while
        // the app is open (but whose flow died) still upgrades without a restart. The
        // receive-leg rebuild follows it (it wants statuses already settled to Confirmed).
        setTimeout(settleMinedSettlingRows, 25000);
        setTimeout(repairMissingCovenantReceiveLegs, 50000);
        window.stablesRepeatWhileVisible('tx-mirror-settle', function () { settleMinedSettlingRows(); repairMissingCovenantReceiveLegs(); }, 120000);
        return;
      }
      for (var j = r.txpows.length - 1; j >= 0; j--) {
        var id = String((r.txpows[j] || {}).txpowid || '');
        if (!id || known[id]) continue;
        known[id] = true;
        delete urgentTxpowIds[id];
        var baseEntries = txnEntries(r.details && r.details[j]);
        if (!baseEntries.length && !zeroNetInScope(r.details && r.details[j])) continue;
        // Covenant/faucet/mint transactions are app-initiated and create their own correctly
        // directed rows; skip if the app already represents this txpow (prefix match catches
        // the faucet's NODE-<txid>:winiwa id), so the mirror never adds a conflicting row.
        if (typeof window.stablesHasNodeActivityRow === 'function' && window.stablesHasNodeActivityRow(nodeId(id))) continue;
        (function (txid, detail, timemilli) {
          resolveEntries(txid, detail, function (entries, covKind, meta) {
            if (!entries || !entries.length) return;
            if (typeof window.stablesHasNodeActivityRow === 'function' && window.stablesHasNodeActivityRow(nodeId(txid))) return;
            representTxn(txid, entries, { found: false, confs: 0, block: 0, target: DEFAULT_TARGET, timemilli: timemilli }, true, true, covKind, meta);
          });
        })(id, r.details && r.details[j], Number(((r.txpows[j] || {}).header || {}).timemilli) || 0);
      }
      advancePending();
      if (recheck) { recheck = false; check(); }
    });
  }

  // Instant kick from the native/MDS event bridge, plus a steady poll as fallback.
  window.stablesTxMirrorKick = check;
  // XR2-03 test surface: the one-row-per-operation decision, exposed so it can be proven without a
  // node. It is a pure function of the resolved legs, so testing it here tests the real rule.
  window.__STABLES_TX_MIRROR_OP_SPEC__ = operationSpecFromEntries;
  /**
   * FAST WHILE A PAYMENT IS IN PLAY; OTHERWISE LET THE PUSH DO THE WORK.
   *
   * A 3-second `history max:20` is right while someone is watching a payment land. It is not right
   * for the other hours the app is simply open. Standing it down when the app is HIDDEN (2026-09-02)
   * fixed the overnight drain, but the founder's next battery report showed the standalone at 29% of
   * a day against 2% for the Core-connected build running the same UI — the difference being that
   * this app's node is IN PROCESS, so every poll spends its own battery. At 3s that is ~1,200 reads
   * an hour of screen time, most of them while the person is on Settings or the faucet page.
   *
   * Incoming payments do not depend on this poll: the native NEWTXPOW bridge kicks `check` directly,
   * and that push is what meets the "receiver sees it in about three seconds" requirement. The poll
   * is a safety net, so it runs fast only when something is actually in flight:
   *
   *   - the Receive window is open (a shop waiting to be paid), or
   *   - a row is still settling, or
   *   - the person acted in the last two minutes.
   *
   * Otherwise it drops to one read every 30 seconds. Nothing that a person is waiting on gets
   * slower; the idle hours stop costing.
   */
  var POLL_FAST_MS = 3000;
  var POLL_IDLE_MS = 30000;
  var _lastPollAt = 0;
  var _lastUserActionAt = 0;
  window.stablesNoteUserPaymentAction = function () { _lastUserActionAt = Date.now(); };
  function paymentInPlay() {
    try {
      var m = document.getElementById('recvModal');
      if (m && m.classList && m.classList.contains('open')) return true;
    } catch (_) { /* ignore */ }
    if (Date.now() - _lastUserActionAt < 120000) return true;
    try {
      var rows = (typeof window.stablesGetUserActivityRows === 'function') ? (window.stablesGetUserActivityRows() || []) : [];
      var now = Date.now();
      for (var i = 0; i < rows.length && i < 25; i++) {
        var r = rows[i];
        var s = String((r && r.status) || '').toLowerCase();
        var settling = s === 'pending' || s === 'broadcasted' || s === 'sending' || s === 'receiving' || s === 'on-chain';
        if (!settling) continue;
        /* AN OLD UNSETTLED ROW IS NOT A PAYMENT IN PLAY.
         *
         * Without this bound the fast poll never stands down: one row that never settled — a claim
         * left awaiting approval in Minima, a send that was dropped — would hold the app at a node
         * read every 3 seconds for the rest of the install's life. Proven while measuring this very
         * change: the poll reported fast even with nothing happening, because stale rows from
         * earlier testing were still listed. Anything older than ten minutes is the settle sweep's
         * business (it runs every two minutes), not the fast path's. */
        var ts = Number(r && r.ts) || 0;
        if (ts > 0 && (now - ts) > 600000) continue;
        return true;
      }
    } catch (_) { /* ignore */ }
    return false;
  }
  /* Observable, because a cadence you cannot see is a cadence nobody will notice regressing.
     Counts the reads this poll actually issued and the rate it is currently running at. */
  window.__STABLES_TX_POLL__ = { fast: false, polls: 0, lastPollAt: 0, gapMs: POLL_IDLE_MS };
  window.stablesRepeatWhileVisible('tx-mirror-poll', function () {
    var fast = paymentInPlay();
    var gap = fast ? POLL_FAST_MS : POLL_IDLE_MS;
    window.__STABLES_TX_POLL__.fast = fast;
    window.__STABLES_TX_POLL__.gapMs = gap;
    if (Date.now() - _lastPollAt < gap - 250) return;
    _lastPollAt = Date.now();
    window.__STABLES_TX_POLL__.polls++;
    window.__STABLES_TX_POLL__.lastPollAt = _lastPollAt;
    check();
  }, POLL_FAST_MS);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', check);
  } else {
    check();
  }
})();
