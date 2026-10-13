/*
 * Route 2 behind the existing Instant account (task_route2_tee_payments, plan item 1.7).
 *
 * Offline coins held by one-use keys in the phone's TEE live in the Android app's native engine
 * (route2/R2Engine). This file only adapts that engine to the account object instant-balance.js
 * already uses: no screen, element or route is added. Holding coins is a detected capability
 * (founder 2026-10-11: Android-only holding); without it every call passes straight through to the
 * existing account, which is what web and the MiniDapp run.
 *
 * On a phone that holds coins the old card money is set aside (founder 2026-10-11: "no need to carry
 * over legacy, we can discard these, we are in test phase with no value token"):
 *
 *  - state()         the Instant balance is the coins held
 *  - receiverCode()  every code carries a coin request ("Coin request:" line, 127 bytes; amount 0 when
 *                    the code has none, so the payer chooses) and the certificate chains this phone holds
 *                    ("Coin chains:"), which a payer leaves out of its payment; older builds ignore both
 *  - pay()           paid from coins only; a code without a coin request comes from an older version
 *  - receive()       a coin payment ("Stables coin payment") is checked and credited by the engine; an
 *                    old-style payment is refused
 *  - journal()       one row per coin movement, beside the earlier rows
 */
(function (W) {
  'use strict';
  var HEAD = 'Stables coin payment';
  var REQUEST_LABEL = 'Coin request', CHAINS_LABEL = 'Coin chains';
  var ROW = 'INSTANT-R2-';

  function bridge() {
    var n = W.StablesNative || W.StablesAndroid;
    return n && typeof n.r2Call === 'function' ? n : null;
  }
  function call(op, args) {
    var n = bridge();
    if (!n) return { ok: false, code: 'unavailable' };
    try { return JSON.parse(n.r2Call(op, JSON.stringify(args || {}))); } catch (e) { return { ok: false, code: 'unavailable', detail: String(e && e.message) }; }
  }
  /* Calls that read the node (state, scan) run on the engine's own thread and answer later: a synchronous bridge call
     blocks the page, and a tap arriving then answers late (R2-CAMPAIGN-07). */
  var pending = {}, seq = 0;
  W.stablesR2Result = function (id, json) {
    var done = pending[id];
    if (!done) return;
    delete pending[id];
    try { done(JSON.parse(json)); } catch (e) { done({ ok: false, code: 'unavailable' }); }
  };
  function callAsync(op, args) {
    var n = bridge();
    if (!n || typeof n.r2CallAsync !== 'function') return Promise.resolve(call(op, args));
    return new Promise(function (resolve) {
      var id = 'r2-' + (++seq);
      pending[id] = resolve;
      try { n.r2CallAsync(id, op, JSON.stringify(args || {})); } catch (e) { delete pending[id]; resolve({ ok: false, code: 'unavailable' }); }
    });
  }
  var holding = null;
  // The coin request shown on the Receive screen, by token:amount. A request is paid once: any credit or load clears them.
  var requests = {};
  // The watch stays on: another Add or a Remove may still be on its way (founder's Pro, build 111: the first credit stopped
  // it and the second Add's row stayed Broadcasted). It stops by itself once nothing is pending.
  function forgetRequests() { Object.keys(requests).forEach(function (k) { delete requests[k]; }); }
  /* While a coin request is open, look for a vault deposit naming it every 15 s while the app is visible (the battery
     law). A load is credited by the phone's own node read, then the page redraws (onChange). */
  var watch = null, watchSince = 0, onChange = null;
  function watchLoads() {
    watchSince = Date.now();                                          // at most 10 minutes from the last request or Add
    if (watch || typeof W.stablesRepeatWhileVisible !== 'function') return;
    try { console.log('[route2] watch on'); } catch (_) { /* no console */ }
    watch = W.stablesRepeatWhileVisible('route2-loads', function () {
      // A Remove on its way keeps the watch on until the money is in Savings.
      var exiting = readExits().some(function (x) { return x.status === 'posted' || x.status === 'signed'; });
      var loading = readLoads().some(function (l) { return l.status !== 'credited'; });
      var asking = Object.keys(requests).length > 0;
      if (!exiting && ((!loading && !asking) || Date.now() - watchSince > 10 * 60 * 1000)) {
        try { console.log('[route2] watch off: nothing on its way'); } catch (_) { /* no console */ }
        stopWatching(); return;
      }
      try { scanLoads(); } catch (e) { try { console.log('[route2] scanLoads failed: ' + e); } catch (_) { /* no console */ } }
      try { scanExits(); } catch (e) { try { console.log('[route2] scanExits failed: ' + e); } catch (_) { /* no console */ } }
    }, 15000);
  }
  function stopWatching() { if (watch && typeof watch.stop === 'function') watch.stop(); watch = null; }
  /** True when this phone can hold coins: its TEE makes keys that pass the receivers' rules. */
  function canHold() {
    if (holding == null) { var r = call('available'); holding = !!(r && r.ok && r.holding); }
    return holding;
  }
  function isCoinPayment(text) { return String(text || '').replace(/^\s+/, '').indexOf(HEAD) === 0; }
  function fieldOf(text, label) {
    var m = String(text || '').match(new RegExp('(?:^|\\n)\\s*' + label + '\\s*:\\s*([A-Za-z0-9_-]+)'));
    return m ? m[1] : null;
  }
  function bundleOf(text) { return fieldOf(text, 'Bundle'); }
  function requestOf(code) { return code && typeof code === 'object' ? code.coinRequest || null : fieldOf(code, REQUEST_LABEL); }
  function chainsOf(code) { return code && typeof code === 'object' ? code.coinChains || null : fieldOf(code, CHAINS_LABEL); }
  function err(P, code, detail) {
    // The reason is kept: a Remove on Graphene said only "This device cannot hold a Stables card" (build 121), whatever refused.
    var e = P && typeof P.InstantError === 'function' ? P.InstantError(code, detail || undefined) : new Error(detail || code);
    e.code = code; e.instant = true;
    if (detail) { e.detail = detail; try { console.log('[route2] refused ' + code + ': ' + detail); } catch (_) { /* no console */ } }
    return e;
  }
  /** Engine refusal codes in the words the Instant screens already use. */
  function refusalCode(r) {
    if (!r) return 'unavailable';
    if (r.code === 'request' && /already paid/.test(r.detail || '')) return 'duplicate';
    if (r.code === 'request') return 'wrong-receiver';
    if (r.code === 'double-spend') return 'bad-signature';
    if (r.code === 'unavailable') return 'unavailable';
    return 'malformed';
  }
  /* Right after the app starts, its built-in node needs a moment: an engine call answers node-starting meanwhile.
     The balance waits for the node (asking every 2 s, for up to 2 minutes) instead of declaring the card unavailable. */
  function whenNodeReady(op, args) {
    var started = Date.now();
    return new Promise(function (resolve) {
      (function again() {
        callAsync(op, args).then(function (r) {
          if (r && r.code === 'node-starting' && Date.now() - started < 120000) { setTimeout(again, 2000); return; }
          resolve(r);
        });
      })();
    });
  }
  /** A node answer's body. The built-in node puts it under "response"; through Minima Core it can come at the top level
   *  (instant-chain.js reads both). A Remove on the Graphene phone (Core) found no Savings address (build 123). */
  function answerOf(r) {
    if (!r || typeof r !== 'object') return {};
    var b = r.response !== undefined ? r.response : r;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { return {}; } }
    if (b && typeof b === 'object' && !Array.isArray(b) && b.response && typeof b.response === 'object' && !b.address && !b.txpowid) b = b.response;
    return b && typeof b === 'object' ? b : {};
  }
  function hex(t) { return String(t || '').toLowerCase().replace(/^0x/, ''); }
  /** One journal entry per coin movement. A payment is keyed by the receiver's request key, as when it was paid (one row). */
  function entryOf(e) {
    var outgoing = e.kind === 'out';
    var entry = { id: ROW + (outgoing ? 'OUT-' + (e.ref || e.id) : 'IN-' + e.id), kind: outgoing ? 'out' : 'in',
      amount: e.amount, tokenId: hex(e.token), ts: Number(e.ts) };
    if (outgoing && e.ref) entry.ref = 'r2-' + e.ref;
    if (outgoing && e.delivered) entry.delivered = { ts: Number(e.ts), via: 'nfc', result: 'credited' };
    return entry;
  }

  function wrap(account, P, opts) {
    if (!account || !canHold()) return account;
    onChange = opts && typeof opts.onChange === 'function' ? opts.onChange : null;
    try {
      console.log('[route2] wrap: loads ' + JSON.stringify(readLoads().map(function (l) { return [String(l.keyHash).slice(0, 8), l.status, l.block]; }))
        + ' exits ' + JSON.stringify(readExits().map(function (x) { return [String(x.coinId).slice(0, 8), x.status, x.block]; })));
    } catch (_) { /* no console */ }
    // An Add or a Remove still on its way when the app (re)starts is followed again at once: nothing else re-arms the
    // watch after a restart, and an Add then stayed "+X" for good (founder's Pro, build 110).
    if (readLoads().some(function (l) { return l.status !== 'credited'; }) ||
        readExits().some(function (x) { return x.status === 'posted' || x.status === 'signed'; })) watchLoads();
    var out = Object.create(account);

    out.state = function () {
      return account.state().then(function (s) {
        return whenNodeReady('state', {}).then(function (r) { return [s, r]; });
      }).then(function (pair) {
        var s = pair[0], r = pair[1];
        if (!r.ok) throw err(P, 'unavailable', r.detail);
        // Coins only: the old card money is set aside on a coin phone.
        var balances = {};
        Object.keys(s.balances || {}).forEach(function (t) { balances[t] = BigInt(0); });
        Object.keys(r.balances || {}).forEach(function (t) { balances[hex(t)] = BigInt(r.balances[t]); });
        var copy = {};
        Object.keys(s).forEach(function (k) { copy[k] = s[k]; });
        copy.balances = balances;
        copy.coins = r;
        return copy;
      });
    };

    out.receiverCode = function (extra) {
      return account.receiverCode(extra).then(function (rc) {
        if (!rc) return rc;
        var amount = rc.amount == null ? '0' : String(rc.amount);   // 0: any amount, the payer chooses
        var key = hex(rc.tokenId) + ':' + amount;
        var req = requests[key];
        if (!req) {
          var r = call('request', { token: hex(rc.tokenId), amount: amount });
          if (!r.ok) return rc;
          req = requests[key] = r.request;
        }
        var ch = call('chains');
        var copy = {};
        Object.keys(rc).forEach(function (k) { copy[k] = rc[k]; });
        copy.text = rc.text + '\n' + REQUEST_LABEL + ': ' + req + (ch.ok && ch.chains ? '\n' + CHAINS_LABEL + ': ' + ch.chains : '');
        copy.coinRequest = req;
        watchLoads();
        return copy;
      });
    };

    out.pay = function (codeText, amountAtoms, payOpts) {
      var req = requestOf(codeText);
      // A code without a coin request comes from a phone on an older version.
      if (!req) return Promise.reject(err(P, 'version'));
      // The coin request names the receiver; the old engine's receiver check (WebCrypto) is not run inside the tap.
      var parsed = codeText && typeof codeText === 'object' ? codeText : P.parse(codeText);
      if (!parsed || parsed.type !== 'receiver') return Promise.reject(err(P, 'malformed'));
      return Promise.resolve(parsed).then(function (code) {
        var token = hex((payOpts && payOpts.tokenId) || code.tokenId);
        if (hex(code.tokenId) !== token) throw err(P, 'asset');
        if (code.amount != null && BigInt(amountAtoms) !== code.amount) throw err(P, 'amount-invalid');
        // A cheap read: the payer's page has 600 ms while the phones touch (R2-CAMPAIGN-04 took 1.2 s with the full state).
        var bal = call('balance', { token: token });
        // Coins that cannot be read are never replaced by other money without a word (R2-CAMPAIGN-02).
        if (!bal.ok) throw err(P, 'unavailable', bal.detail);
        if (BigInt(bal.atoms || '0') < BigInt(amountAtoms)) throw err(P, 'insufficient');
        var r = call('pay', { request: req, amount: String(amountAtoms), known: chainsOf(codeText) || '' });
        // A request this phone already paid is never paid again (R2-CAMPAIGN-09): said as a duplicate, nothing moved.
        if (!r.ok && r.code === 'already-paid') throw err(P, 'duplicate', r.detail);
        if (!r.ok) throw err(P, r.code === 'pay' ? 'insufficient' : 'unavailable', r.detail);
        delete requests[token + ':' + String(amountAtoms)];
        var ts = Date.now();
        var payment = { ref: 'r2-' + r.ref, coin: true, amount: String(amountAtoms), tokenId: token, payeeId: code.payeeId,
          text: HEAD + '\nBundle: ' + r.bundle, ts: ts };
        var entry = { id: ROW + 'OUT-' + r.ref, kind: 'out', amount: String(amountAtoms), tokenId: token, ref: payment.ref, ts: ts };
        return { status: 'paid', payment: payment, entry: entry };
      });
    };

    out.receive = function (paymentText, info) {
      // Old card money is set aside on a coin phone: an old-style payment is refused, nothing credited.
      if (!isCoinPayment(paymentText)) return Promise.reject(err(P, 'old-scheme'));
      var b = bundleOf(paymentText);
      if (!b) return Promise.reject(err(P, 'malformed'));
      var r = call('receive', { bundle: b });
      if (!r.ok) return Promise.reject(err(P, refusalCode(r), r.detail));
      if (!r.accepted) return Promise.reject(err(P, refusalCode(r), r.detail));
      forgetRequests();                                                    // the code shown was paid: the next one is fresh
      var entry = { id: ROW + 'IN-' + r.coinId, kind: 'in', amount: r.amount, tokenId: hex(r.token), ts: Date.now(),
        via: String((info && info.via) || ''), ack: r.ack };
      return Promise.resolve({ status: 'credited', entry: entry });
    };

    out.journal = function () {
      return Promise.all([account.journal(), callAsync('state')]).then(function (both) {
        var rows = both[0], r = both[1];
        if (!r.ok || !r.events) return rows;
        // A claimed Add is shown by its own record ("To Stables card", Added), never again as a "Received".
        var claimedLoads = {};
        readLoads().forEach(function (l) { if (l.coinId) claimedLoads[hex(l.coinId)] = true; });
        // An exit is shown by its own record ("To Savings"), never as a payment received.
        var mine = r.events.filter(function (e) { return e.kind !== 'lost' && e.kind !== 'exit' && !(e.kind === 'load' && claimedLoads[hex(e.id)]); }).map(entryOf);
        return rows.concat(mine).sort(function (a, b) { return a.ts - b.ts; });
      });
    };

    /* The receiver answered (NFC or Bluetooth): recorded with the coin payment, so its row reads received. */
    out.markDelivered = function (ref, info) {
      if (String(ref || '').indexOf('r2-') !== 0) return account.markDelivered(ref, info);
      var key = String(ref).slice(3);
      var d = call('delivered', { ref: key });
      if (!d.ok || !d.known) return Promise.resolve(null);
      return callAsync('state').then(function (r) {
        var e = r.ok && r.events ? r.events.filter(function (x) { return x.kind === 'out' && x.ref === key; })[0] : null;
        if (!e) return null;
        var entry = entryOf(e);
        entry.delivered = { ts: Date.now(), via: String((info && info.via) || ''), result: String((info && info.result) || '') };
        return entry;
      });
    };
    out.outgoing = function (ref) {
      if (String(ref || '').indexOf('r2-') === 0) return Promise.resolve(null);
      return account.outgoing(ref);
    };
    return out;
  }

  /**
   * Add (founder 2026-10-11, "Add makes coins"): a fresh open coin request, then ONE Savings send with two outputs
   * (trace-design.md 13.11, generation R2T3): the anchor (1 atom at the anchor address, its kept state naming the
   * request) and the value (the amount at the R2T3 vault). The phone credits it from its own node after three
   * confirmations, once the deposit is proven. From the vault the money comes back only by an exit (Remove).
   */
  var VAULT = '0x78A7881E711158B9E3AECCB026223822D401440B864218E106122DC18B5CC7F0';
  // Generation R2T3 (build .108): the council on the server, one Remove may spend several vault coins. R2T2 coins still pay.
  var R2T3 = { anchor: '0x3DC4BD9985D5924FEFB11C8F97A01AAE5C8D88CA4C270F9FD9889DB4CF45EE60',
    vault: '0xD7B367D654F20186DA21BE1B82BA1B4DF4FE0103CBDF12A50C7E4A7DC88F22B0', tag: '0x52325433',
    request: '0xB13ADD36D874B2E0640AEB1F06B9AC1B5B37EC784AAD318A1463CC13DF2ED3F7', requestTag: '0x52325445', atom: '0.00000001' };
  function load(atoms, tokenId, node, P) {
    if (!canHold()) return Promise.reject(err(P, 'unavailable'));
    if (!node || typeof node.cmd !== 'function') return Promise.reject(err(P, 'unavailable'));
    var token = hex(tokenId), amount = P.atomsToDecimal(BigInt(atoms));
    var r = call('request', { token: token, amount: '0' });
    if (!r.ok || !r.keyHash) return Promise.reject(err(P, 'unavailable', r.detail));
    var state = JSON.stringify({ 0: R2T3.tag, 1: '0x' + r.keyHash.toUpperCase(), 2: amount, 3: '0x' + token.toUpperCase() });
    var multi = JSON.stringify([R2T3.anchor + ':' + R2T3.atom, R2T3.vault + ':' + amount]);
    return node.cmd('send multi:' + multi + ' tokenid:0x' + token.toUpperCase() + ' state:' + state, 'Stables card', 120000)
      .then(function (res) {
        if (res && res.status !== false) {
          var resp = answerOf(res);
          var txpowid = String(resp.txpowid || (resp.txpow && resp.txpow.txpowid) || '');
          var list = readLoads();
          list.push({ keyHash: hex(r.keyHash), amount: String(atoms), tokenId: token, ts: Date.now(), status: 'posted', txpowid: txpowid, block: 0, depth: -1 });
          writeLoads(list);
          res.coinLoadEntry = loadEntryOf(list[list.length - 1]);
        }
        watchLoads();
        return res;
      });
  }

  /* COIN LOAD RECORDS (founder 2026-10-11: "the 2500 sent to the card is presented as a regular sending"; "the amount on
     the card, after minutes, this is still not shown"). One record per Add, kept on this phone: the card shows its amount
     on the way at once ("+X" beside the card figure, as an Add always did), the row reads "To Stables card" with its
     confirmations, then Added when the phone credits it. The node's own send of it is not shown (tx-mirror.js). */
  var LOADS_KEY = 'stables.route2.loads.v1';
  function readLoads() {
    try { var v = JSON.parse(W.localStorage.getItem(LOADS_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; }
  }
  function writeLoads(list) {
    try { W.localStorage.setItem(LOADS_KEY, JSON.stringify(list.slice(-50))); } catch (_) { /* the row comes back with the next Add */ }
  }
  function loadEntryOf(l) {
    return { id: ROW + 'LOAD-' + l.keyHash, kind: 'load', coinLoad: true, amount: String(l.amount), tokenId: l.tokenId, ts: Number(l.ts),
      status: l.status === 'credited' ? 'credited' : 'posted', txpowid: l.txpowid || '', block: Number(l.block) || 0,
      depth: Number(l.depth), confirmBlocks: 3, coinId: l.coinId || '' };
  }
  function loadEntries() { return canHold() ? readLoads().map(loadEntryOf) : []; }
  /** A scan's answer applied to the records: confirmations of the deposits on their way, Added for those credited. */
  function noteScan(r) {
    if (!r || !r.ok) return false;
    var list = readLoads(), changed = false;
    (r.pending || []).forEach(function (p) {
      var l = list.filter(function (x) { return x.keyHash === hex(p.keyHash) && x.status !== 'credited'; })[0];
      if (l && (l.block !== Number(p.block) || l.depth !== Number(p.depth))) { l.block = Number(p.block) || 0; l.depth = Number(p.depth); changed = true; }
    });
    // Claimed by this scan, or credited earlier (the engine repeats every credited load: one missed answer cannot leave a
    // row Broadcasted).
    (r.claimed || []).concat(r.loaded || []).forEach(function (c) {
      var l = list.filter(function (x) { return x.keyHash === hex(c.keyHash) && x.status !== 'credited'; })[0];
      if (l) { l.status = 'credited'; l.coinId = hex(c.coinId); l.depth = 3; changed = true; }
    });
    if (changed) writeLoads(list);
    if (changed || (r.claimed && r.claimed.length) || (r.pending && r.pending.length)) {
      try { console.log('[route2] loads: claimed ' + (r.claimed || []).length + ', pending ' + (r.pending || []).length + ', records ' + list.length + ', changed ' + changed); } catch (_) { /* no console */ }
    }
    return changed;
  }

  /** Loads: vault deposits naming one of this phone's open coin requests (online, the phone's own node). */
  // When the scan started (0: none). An answer that never comes back must not stop every later scan: after a minute
  // the next one goes ahead (founder's Pro, build 112: one scan at start, then none, and the rows stayed Broadcasted).
  var scanning = 0;
  function scanLoads() {
    if (!canHold()) return Promise.resolve({ ok: false, code: 'unavailable' });
    if (scanning && Date.now() - scanning < 60000) return Promise.resolve({ ok: true, claimed: [] });
    scanning = Date.now();
    return callAsync('scan').catch(function () { return { ok: false }; }).then(function (r) {
      scanning = 0;
      var moved = noteScan(r);
      if (r && r.ok && r.claimed && r.claimed.length) forgetRequests();
      if ((moved || (r && r.ok && r.claimed && r.claimed.length)) && onChange) {
        try { onChange(r.claimed || []); } catch (_) { /* the balance shows at the next refresh */ }
      }
      return r;
    });
  }

  /* REMOVE TO SAVINGS (Stage 2, trace-design.md 13.11). The engine picks one coin of exactly the amount (a self-hop on
     the card first when needed) and signs its exit line with the coin's own key, which the TEE destroys: from that moment
     the money has left the card. The page then posts the exit request from Savings: 1 atom of the currency at the
     request address, its kept state carrying the amount, the payout address and the package. The test council approves
     it within minutes; if it stays silent, the request pays after 20 blocks. One record per Remove, kept on this phone,
     drawn as the "To Savings" row; the Savings figure shows the amount arriving at once ("+X"). */
  var EXITS_KEY = 'stables.route2.exits.v1';
  function readExits() {
    try { var v = JSON.parse(W.localStorage.getItem(EXITS_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; }
  }
  function writeExits(list) {
    try { W.localStorage.setItem(EXITS_KEY, JSON.stringify(list.slice(-50))); } catch (_) { /* the engine keeps the exit itself */ }
  }
  function exitEntryOf(x) {
    return { id: ROW + 'EXIT-' + x.coinId, kind: 'offload', coinExit: true, amount: String(x.amount), tokenId: x.tokenId, ts: Number(x.ts),
      status: x.status === 'received' ? 'received' : (x.status === 'refused' ? 'restored' : 'posted'), txpowid: x.txpowid || '',
      block: Number(x.block) || 0, depth: Number(x.depth), wait: Number(x.wait) || 20, settled: x.status === 'received',
      note: x.status === 'unposted' ? 'The request to Savings was not sent: ' + (x.error || 'no answer') : '' };
  }
  function exitEntries() { return canHold() ? readExits().map(exitEntryOf) : []; }
  /** Rows an earlier build drew for a Remove as a payment received on the card (build 111); the activity list forgets them. */
  function strayExitRows() {
    var ids = readExits().map(function (x) { return ROW + 'IN-' + hex(x.coinId); });
    // The node's own rows for the Add's deposit and the Remove's request (before build 117 the node history drew them as
    // plain Sent rows besides "To Stables card" and "To Savings"): one row per operation (law 2).
    readLoads().concat(readExits()).forEach(function (r) {
      if (!r.txpowid) return;
      ids.push(typeof W.stablesNodeActivityId === 'function' ? W.stablesNodeActivityId(r.txpowid) : 'NODE-' + String(r.txpowid).toLowerCase());
    });
    return ids;
  }
  function remove(atoms, tokenId, payout, node, P) {
    if (!canHold()) return Promise.reject(err(P, 'unavailable'));
    if (!node || typeof node.cmd !== 'function') return Promise.reject(err(P, 'unavailable'));
    var token = hex(tokenId);
    var addr = payout ? Promise.resolve(payout) : node.cmd('getaddress', 'Stables card', 60000).then(function (g) {
      var a = answerOf(g).address;
      if (!a) { try { console.log('[route2] getaddress gave no address: ' + JSON.stringify(g).slice(0, 300)); } catch (_) { /* no console */ } }
      if (!a) throw err(P, 'unavailable', 'No Savings address. Nothing was moved.');
      return a;
    });
    return addr.then(function (to) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(String(to))) throw err(P, 'unavailable', 'This Savings address cannot receive. Nothing was moved.');
      var r = call('exit', { token: token, amount: String(atoms), payout: hex(to) });
      // Money added before this version rests on the old vault, which has no way back yet: said plainly, nothing moved.
      if (!r.ok) throw err(P, r.code === 'pay' ? 'insufficient' : (r.code === 'exit-generation' ? 'exit-generation' : 'unavailable'), r.detail);
      var state = { 0: R2T3.requestTag, 10: '0x' + r.packageHash.toUpperCase(), 11: '0x' + r.coinId.toUpperCase(), 12: P.atomsToDecimal(BigInt(r.amount)),
        13: '0x' + token.toUpperCase(), 14: '0x' + hex(to).toUpperCase(), 17: R2T3.atom };
      r.chunks.forEach(function (c, i) { state[30 + i] = '0x' + c.toUpperCase(); });
      var x = { coinId: r.coinId, amount: String(r.amount), tokenId: token, payout: hex(to), ts: Date.now(), status: 'signed', wait: r.wait };
      var list = readExits(); list.push(x); writeExits(list);
      // The node follows the request only if it knows the request contract: Minima Core never listed it, so the app could
      // neither follow the Remove nor post its fallback (Graphene, 2026-10-13). Registered first; a refusal changes nothing.
      return node.cmd('newscript trackall:false script:"' + R2T3_SCRIPTS.request + '"', 'Stables card', 60000)
        .then(function () { return null; }, function () { return null; })
        .then(function () { return node.cmd('send address:' + r.requestAddress + ' amount:' + R2T3.atom + ' tokenid:0x' + token.toUpperCase() + ' state:' + JSON.stringify(state), 'Stables card', 180000); })
        .then(function (res) {
          var l = readExits(), rec = l.filter(function (e) { return e.coinId === r.coinId; })[0];
          if (res && res.status !== false) {
            var resp = answerOf(res);
            rec.txpowid = String(resp.txpowid || (resp.txpow && resp.txpow.txpowid) || '');
            rec.status = 'posted';
            call('exitProgress', { coinId: r.coinId, status: 1, request: rec.txpowid });
          } else {
            // The coin has left the card (its key signed the exit line); the package stays in the engine for a new request.
            rec.status = 'unposted'; rec.error = String((res && res.error) || '');
          }
          writeExits(l);
          res = res || {};
          res.coinExitEntry = exitEntryOf(rec);
          watchLoads();
          return res;
        });
    });
  }
  /** Where each Remove stands: the request on chain, its age against the fallback wait, the money in Savings. */
  function noteExits(r) {
    if (!r || !r.ok || !r.exits) return false;
    var list = readExits(), changed = false;
    r.exits.forEach(function (e) {
      var x = list.filter(function (l) { return hex(l.coinId) === hex(e.coinId) && l.status !== 'received'; })[0];
      if (!x) return;
      if (e.open && (x.block !== Number(e.block) || x.depth !== Number(e.depth))) { x.block = Number(e.block); x.depth = Number(e.depth); x.request = e.request; x.status = 'posted'; changed = true; }
      // The engine reports paid only once the request is spent and the amount sits at the payout address.
      if (!e.open && e.paid) { x.status = 'received'; if (e.paidCoin) x.paidCoin = e.paidCoin; changed = true; }
    });
    if (changed) writeExits(list);
    try { console.log('[route2] exits: ' + r.exits.length + ' reported, records ' + JSON.stringify(list.map(function (l) { return [String(l.coinId).slice(0, 8), l.status, l.block]; })) + ', changed ' + changed); } catch (_) { /* no console */ }
    return changed;
  }
  function scanExits() {
    if (!canHold() || !readExits().some(function (x) { return x.status !== 'received'; })) return Promise.resolve(false);
    return callAsync('exitScan').then(function (r) {
      if (!r || !r.ok) { try { console.log('[route2] exitScan refused: ' + JSON.stringify(r)); } catch (_) { /* no console */ } }
      var moved = noteExits(r);
      if (moved && onChange) { try { onChange([]); } catch (_) { /* the next refresh shows it */ } }
      (r && r.ok && r.exits || []).forEach(function (e) {
        if (e.open && e.request && Number(e.depth) >= (Number(e.wait) || 20) + 1) postFallback(W.__STABLES_INSTANT_NODE__, e).catch(function () { /* next block */ });
      });
      return moved;
    });
  }

  /* FALLBACK (Stage 2, COUNCIL_ATTESTATION_DESIGN 3.2): a request W blocks old that the council neither paid nor rejected
     pays itself, and anyone may post that payout. While the app is open it posts it for its own Removes, at most once a
     block: no signature, only the two R2T3 scripts (registered on this phone's node so it can attach them), the request
     and one vault coin that covers it. The council stays the faster path; this is what makes a Remove unstoppable. */
  var R2T3_SCRIPTS = {
    request: 'LET sealaddr=0xAA222EFD8CC8E87A1616E3F8BAD1936A1363501C88337B53809664EF5E9EDF50 LET sealtok=0x0E277A26E58F352BE2967C095E4587A671A28AED7A3EBED31D43093FDA3F2E82 ASSERT @INPUT EQ 0 ASSERT SAMESTATE(10 14) IF MULTISIG(5 0xD1E4C6666D3473F0A4B75751567A2F6970500972034ECEF85FBEE10E4869DC6B 0x0C6DF55B4169511B8128BDE007D05EBC910B6999466686FF2EDEDF5994C21B26 0xD5DC53E95705C76D4776890EA0FAF15F3E64C67AED8B86C78B526FB47799BCE0 0x2625B4E2797EB2DDCC0CA964C5D2DE8A129CD52FF00908D0F7689A49E3B52169 0x584906F78CE40991C508EDA678773F8EBB5305D6641B9DD10652F19C32E809E6 0x06871BEFB8E07E74095D4F0F6020B36A44E93E0D2B51469DB4DE804DFF5EB5F1 0xAA24D255893D1EAA4805ABD0A2026298C77752D612D2D113D725C9EB21C9E07E) THEN RETURN TRUE ENDIF ASSERT VERIFYOUT(0 STATE(14) STATE(12) STATE(13) FALSE) ASSERT STATE(17) EQ @AMOUNT ASSERT VERIFYOUT(1 STATE(14) STATE(17) @TOKENID FALSE) IF @COINAGE GTE 20 THEN RETURN TRUE ENDIF ASSERT GETINADDR(STATE(16)+1) EQ sealaddr ASSERT GETINTOK(STATE(16)+1) EQ sealtok RETURN PROOF(@COINID 0 STATE(20) 0 STATE(25))',
    vault: 'LET lab=0xF0EC7DA9D13EABE32FA358C410D3153156E18ED362365DA01AC2DC2177AED42F LET labaddr=0xE9373F1602002A51803B645413FC837C0FC51B3671CC4DB9334B91BD39250325 LET reqaddr=0xB13ADD36D874B2E0640AEB1F06B9AC1B5B37EC784AAD318A1463CC13DF2ED3F7 IF SIGNEDBY(lab) THEN LET p=100+@INPUT ASSERT STATE(p) EQ @AMOUNT RETURN VERIFYOUT(@INPUT labaddr STATE(p) @TOKENID FALSE) ENDIF ASSERT GETINADDR(0) EQ reqaddr LET n=STATE(16) ASSERT (@INPUT GTE 1) AND (@INPUT LTE n) AND (n LTE 8) ASSERT STATE(13) EQ @TOKENID ASSERT STATE(12) GT 0 LET sum=0 LET i=1 WHILE i LTE n DO ASSERT GETINADDR(i) EQ @ADDRESS ASSERT GETINTOK(i) EQ @TOKENID LET sum=sum+GETINAMT(i) LET i=i+1 ENDWHILE ASSERT VERIFYOUT(0 STATE(14) STATE(12) @TOKENID FALSE) LET rem=sum-STATE(12) ASSERT STATE(15) EQ rem IF rem GT 0 THEN RETURN VERIFYOUT(2 @ADDRESS STATE(15) @TOKENID FALSE) ENDIF RETURN rem EQ 0' };
  var fallbackTried = {};
  function postFallback(node, e) {
    if (!node || typeof node.cmd !== 'function') return Promise.resolve(false);
    var tip = Number(e.tip) || 0;
    if (fallbackTried[e.coinId] && tip - fallbackTried[e.coinId] < 1) return Promise.resolve(false);
    fallbackTried[e.coinId] = tip;
    function cmd(c) { return node.cmd(c, 'Stables card', 120000).then(function (r) { if (!r || r.status === false) throw new Error(String((r && r.error) || 'refused: ' + c.split(' ')[0])); return answerOf(r); }); }
    var id = 'r2fb' + String(e.coinId).slice(0, 8), q, state, pick;
    return cmd('coins coinid:' + e.request).then(function (list) {
      q = (list || [])[0];
      if (!q || q.spent) throw new Error('request gone');
      state = {};
      (q.state || []).forEach(function (v) { state[v.port] = String(v.data); });
      return cmd('coins address:' + R2T3.vault + ' tokenid:' + state[13]);
    }).then(function (coins) {
      var atomsOf = function (a) { var p = String(a).split('.'); return BigInt(p[0]) * BigInt(100000000) + BigInt(((p[1] || '') + '00000000').slice(0, 8)); };
      var need = atomsOf(state[12]);
      // The smallest single coin that covers it; else the largest coins until they do, at most 8 (R2T3).
      var open = (coins || []).filter(function (c) { return !c.spent; });
      var one = open.filter(function (c) { return atomsOf(c.tokenamount) >= need; })
        .sort(function (a, b) { return atomsOf(a.tokenamount) < atomsOf(b.tokenamount) ? -1 : 1; })[0];
      pick = one ? [one] : [];
      if (!one) {
        var sum = BigInt(0);
        open.sort(function (a, b) { return atomsOf(a.tokenamount) > atomsOf(b.tokenamount) ? -1 : 1; })
          .forEach(function (c) { if (sum < need && pick.length < 8) { pick.push(c); sum += atomsOf(c.tokenamount); } });
        if (sum < need) throw new Error('the vault coins do not cover it');
      }
      var total = pick.reduce(function (t, c) { return t + atomsOf(c.tokenamount); }, BigInt(0));
      var rem = total - need;
      var remDec = rem > BigInt(0) ? (rem / BigInt(100000000)).toString() + '.' + (rem % BigInt(100000000)).toString().padStart(8, '0') : '0';
      remDec = remDec.indexOf('.') > 0 ? remDec.replace(/0+$/, '').replace(/\.$/, '') : remDec;
      var steps = [
        'newscript trackall:false script:"' + R2T3_SCRIPTS.request + '"',
        'newscript trackall:false script:"' + R2T3_SCRIPTS.vault + '"',
        'txndelete id:' + id,
        'txncreate id:' + id,
        'txninput id:' + id + ' coinid:' + q.coinid,
      ].concat(pick.map(function (c) { return 'txninput id:' + id + ' coinid:' + c.coinid; })).concat([
        'txnoutput id:' + id + ' amount:' + state[12] + ' address:' + state[14] + ' tokenid:' + state[13] + ' storestate:false',
        'txnoutput id:' + id + ' amount:' + q.tokenamount + ' address:' + state[14] + ' tokenid:' + q.tokenid + ' storestate:false'
      ]);
      if (rem > BigInt(0)) steps.push('txnoutput id:' + id + ' amount:' + remDec + ' address:' + R2T3.vault + ' tokenid:' + state[13] + ' storestate:false');
      [10, 11, 12, 13, 14].forEach(function (p) { steps.push('txnstate id:' + id + ' port:' + p + ' value:' + state[p]); });
      steps.push('txnstate id:' + id + ' port:15 value:' + remDec);
      steps.push('txnstate id:' + id + ' port:16 value:' + pick.length);
      steps.push('txnstate id:' + id + ' port:17 value:' + q.tokenamount);
      steps.push('txnbasics id:' + id);
      return steps.reduce(function (p, c) {
        return p.then(function () { return c.indexOf('txndelete') === 0 ? node.cmd(c, 'Stables card', 60000) : cmd(c); });
      }, Promise.resolve());
    }).then(function () { return cmd('txncheck id:' + id); }).then(function (check) {
      var v = (check && check.valid) || {};
      if (!(v.basic && v.signatures && v.mmrproofs && v.scripts)) throw new Error('payout not valid yet: ' + JSON.stringify(v));
      return cmd('txnpost id:' + id + ' txndelete:true');
    }).then(function () {
      var list = readExits(), x = list.filter(function (l) { return l.coinId === e.coinId; })[0];
      if (x) { x.fallbackPosted = Date.now(); writeExits(list); }
      return true;
    });
  }

  W.StablesRoute2 = { wrap: wrap, canHold: canHold, isCoinPayment: isCoinPayment, scanLoads: scanLoads, load: load, loadEntries: loadEntries,
    remove: remove, exitEntries: exitEntries, strayExitRows: strayExitRows, scanExits: scanExits, postFallback: postFallback, VAULT: VAULT, R2T3: R2T3, HEAD: HEAD };
})(typeof window !== 'undefined' ? window : this);
