(function () {
  const CFG = window.STABLES_CONFIG || {};
  const DEMO_REAL = !!CFG.DEMO_REAL_ONCHAIN_WALLET;
  const USER_ACTIVITY_STORAGE_KEY = CFG.USER_ACTIVITY_STORAGE_KEY || 'stables_demo_user_activity_v1';
  // Bump this token whenever node-row attribution changes meaningfully, to one-time purge + rebuild
  // stale on-chain rows from older builds (see migrateStaleNodeRowsIfNeeded).
  const ACTIVITY_SCHEMA_KEY = (CFG.USER_ACTIVITY_STORAGE_KEY || 'stables_demo_user_activity_v1') + '_schema';
  const ACTIVITY_SCHEMA = 'node-attrib-stables-token-gate-2026-07-01-v3';
  const WALLET_OWNER_KEY = CFG.WALLET_OWNER_KEY || 'stables_demo_wallet_owner_v1';
  // Session cache keys are VERSIONED with the activity storage key (2026-07-10): sessionStorage
  // survives reloads, so an unversioned session cache re-seeded abandoned (phantom) rows after
  // every storage-key bump — the bump looked like it "didn't work".
  const TEST_ACTIVITY_SESSION_KEY = USER_ACTIVITY_STORAGE_KEY + '_session_v1';
  const TEST_ACTIVITY_SESSION_OWNER_KEY = USER_ACTIVITY_STORAGE_KEY + '_session_owner_v1';
  const ACTIVITY_PAGE_SIZE = CFG.ACTIVITY_PAGE_SIZE || 25;
  const CONTACT_NOTES_KEY = CFG.CONTACT_NOTES_KEY || 'stables_contact_notes_v1';
  const SUSPICIOUS_TX_KEY = CFG.SUSPICIOUS_TX_KEY || 'stables_suspicious_tx_ids_v1';
  const HIDDEN_TX_KEY = CFG.HIDDEN_TX_KEY || 'stables_hidden_tx_ids_v1';
  const SOFT_HIDDEN_TX_KEY = CFG.SOFT_HIDDEN_TX_KEY || 'stables_soft_hidden_tx_ids_v1';
  const HIDDEN_SHOPS_KEY = CFG.HIDDEN_SHOPS_KEY || 'stables_hidden_shop_names_v1';

  function isExplorerTxpowId(id) {
    if (typeof window.stablesIsExplorerTxpowId === 'function') return window.stablesIsExplorerTxpowId(id);
    const t = String(id || '').trim().toLowerCase();
    return /^0x[a-f0-9]{64}$/.test(t) && /^0x0{2,}/.test(t);
  }

  /** Any 64-hex on-chain id (txpow or inner txn) usable for history / txpow lookups. */
  function isLikelyTxpowHash(id) {
    const t = normalizeTxHash(id);
    return /^0x[a-f0-9]{64}$/.test(t);
  }

  function rowMinedTxpowKey(r) {
    if (!r) return '';
    const fromId = nodeTxpowHashFromActivityId(r.id);
    if (fromId && isLikelyTxpowHash(fromId)) return fromId;
    const fromExp = normalizeTxHash(r.explorerTxId);
    if (isLikelyTxpowHash(fromExp)) return fromExp;
    return '';
  }

  /**
   * A genuine, confirmed on-chain row sourced from node history (real txpow id, not an optimistic
   * local row). It was attributed to OUR own address after infra/covenant exclusion, so it is a real
   * wallet transaction and must never be hidden by faucet/pool "phantom" heuristics or amount caps.
   */
  function isGenuineConfirmedNodeRow(r) {
    return !!(r && r.minimaOnChain && r.localOrigin !== true
      && String(r.id || '').indexOf('NODE-') === 0 && rowMinedTxpowKey(r));
  }

  function normalizeTxHash(h) {
    return String(h || '').trim().toLowerCase();
  }

  function nodeActivityId(txpowid) {
    const h = normalizeTxHash(txpowid);
    return h ? ('NODE-' + h) : '';
  }
  window.stablesNodeActivityId = nodeActivityId;

  function activityAddressTokens(addr) {
    return String(addr || '').split(/[,;\n]/).map(s => s.trim().toLowerCase()).filter(Boolean);
  }

  function activityAddressesOverlap(a, b) {
    const A = activityAddressTokens(a);
    const B = activityAddressTokens(b);
    if (!A.length || !B.length) return true;
    return A.some(x => B.some(y => x === y || x.includes(y) || y.includes(x)));
  }

  function isOptimisticOutRow(r) {
    if (!r || r.dir !== 'out' || !r.minimaOnChain) return false;
    const id = String(r.id || '');
    if (id.indexOf('MINIMA-') === 0) return true;
    if (r.localOrigin === true && id.indexOf('NODE-') !== 0) return true;
    return isActivityUnsettledStatus(r.status) && !isExplorerTxpowId(r.explorerTxId) && id.indexOf('NODE-') !== 0;
  }

  function isActivityUnsettledStatus(status) {
    const s = String(status || '').toLowerCase();
    return s === 'pending' || s === 'sending' || s === 'broadcasted' || s === 'on-chain' || s === 'onchain' || s === 'confirming';
  }

  function activityCcySame(a, b) {
    return normalizeActivityCcyLabel(a) === normalizeActivityCcyLabel(b);
  }

  /** App-originated rows (faucet, optimistic sends) — never dropped on wallet-owner reconcile. */
  function isAppLocalActivityRow(r) {
    if (!r) return false;
    if (r.localOrigin === true) return true;
    const id = String(r.id || '');
    if (id.indexOf('WINIWA-FAUCET-') === 0) return true;
    if (id.indexOf('FAUCET-IN-') === 0) return true;
    if (id.indexOf('FAUCET-POUR-') === 0) return true;
    if (id.indexOf('NODE-') === 0 && id.indexOf(':winiwa') > 0) return true;
    return isOptimisticOutRow(r);
  }

  function outgoingSendMatch(optimistic, nodeRow) {
    if (!isOptimisticOutRow(optimistic) || !nodeRow || nodeRow.dir !== 'out') return false;
    const nodeId = String(nodeRow.id || '');
    if (nodeId.indexOf('NODE-') !== 0) return false;
    const amtA = Math.abs(Number(optimistic.amt) || 0);
    const amtB = Math.abs(Number(nodeRow.amt) || 0);
    if (Math.abs(amtA - amtB) >= 0.01) return false;
    if (!activityCcySame(optimistic.ccy, nodeRow.ccy)) return false;
    const oTxn = normalizeTxHash(optimistic.pendingTxnId);
    const nTxn = normalizeTxHash(nodeRow.txnId);
    if (oTxn && nTxn && oTxn === nTxn) return true;
    const nTxp = normalizeTxHash(nodeRow.explorerTxId || nodeId.slice(5));
    const oTxp = normalizeTxHash(optimistic.explorerTxId);
    if (oTxp && nTxp && oTxp === nTxp) return true;
    const tO = Number(optimistic.ts) || 0;
    const tN = Number(nodeRow.ts) || 0;
    const maxDeltaMs = optimistic.localOrigin === true ? (2 * 60 * 60 * 1000) : (15 * 60 * 1000);
    if (tO && tN && Math.abs(tO - tN) > maxDeltaMs) return false;
    if (activityAddressesOverlap(optimistic.address, nodeRow.address)) return true;
    // Browser/RPC writes are intentionally opaque, so token sends can have no transactionid.
    // Node history may also expose the recipient in hex while the optimistic row stores Mx.
    // For app-originated sends, amount + currency + close timestamp is the stable fallback.
    if (optimistic.localOrigin === true && tO && tN) return true;
    return false;
  }

  function isOptimisticInRow(r) {
    if (!r || r.dir !== 'in' || !r.minimaOnChain) return false;
    const id = String(r.id || '');
    if (r.localOrigin === true && id.indexOf('NODE-') !== 0) return true;
    return isActivityUnsettledStatus(r.status) && !isExplorerTxpowId(r.explorerTxId) && id.indexOf('NODE-') !== 0;
  }

  // Mirror of outgoingSendMatch for the incoming leg (e.g. the "Received USDw" half of a mint, or a
  // received token): an optimistic local IN row and the node-detected IN row for the same transaction
  // can otherwise both render until the slow reconcile amount-match (1e-6 tol) finally merges them on a
  // later sync — the visible "two rows that collapse to one". Matching here (amount + ccy + close time,
  // same 0.01 tol as the outgoing path) lets the node row absorb the optimistic one in the SAME upsert,
  // so the duplicate never paints. Faucet pours keep their dedicated merge path above.
  function incomingReceiveMatch(optimistic, nodeRow) {
    if (!isOptimisticInRow(optimistic) || !nodeRow || nodeRow.dir !== 'in') return false;
    if (typeof isFaucetPourLocalRow === 'function' && isFaucetPourLocalRow(optimistic)) return false;
    const nodeId = String(nodeRow.id || '');
    if (nodeId.indexOf('NODE-') !== 0) return false;
    const amtA = Math.abs(Number(optimistic.amt) || 0);
    const amtB = Math.abs(Number(nodeRow.amt) || 0);
    if (Math.abs(amtA - amtB) >= 0.01) return false;
    if (!activityCcySame(optimistic.ccy, nodeRow.ccy)) return false;
    const oTxn = normalizeTxHash(optimistic.pendingTxnId);
    const nTxn = normalizeTxHash(nodeRow.txnId);
    if (oTxn && nTxn && oTxn === nTxn) return true;
    const nTxp = normalizeTxHash(nodeRow.explorerTxId || nodeId.slice(5));
    const oTxp = normalizeTxHash(optimistic.explorerTxId);
    if (oTxp && nTxp && oTxp === nTxp) return true;
    const tO = Number(optimistic.ts) || 0;
    const tN = Number(nodeRow.ts) || 0;
    const maxDeltaMs = optimistic.localOrigin === true ? (2 * 60 * 60 * 1000) : (15 * 60 * 1000);
    if (tO && tN && Math.abs(tO - tN) > maxDeltaMs) return false;
    if (activityAddressesOverlap(optimistic.address, nodeRow.address)) return true;
    if (optimistic.localOrigin === true && tO && tN) return true;
    return false;
  }

  function activityRowRank(r) {
    let s = 0;
    if (r && r.status === 'Confirmed') s += 4;
    else if (r && isActivityUnsettledStatus(r.status)) s += 2;
    if (isExplorerTxpowId(r && r.explorerTxId)) s += 2;
    if (Number(r && r.block) > 0) s += 1;
    return s;
  }

  function pruneDuplicateNodeRowsByTxpow() {
    const groups = new Map();
    USER_ACTIVITY.forEach(r => {
      if (!r || String(r.id || '').indexOf('NODE-') !== 0) return;
      const hash = nodeTxpowHashFromActivityId(r.id)
        || normalizeTxHash(r.explorerTxId || String(r.id).slice(5));
      if (!hash) return;
      const key = hash + '|' + (r.dir || '') + '|' + (r.ccy || '');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    const dropIds = new Set();
    groups.forEach(rows => {
      if (!rows.length) return;
      rows.sort((a, b) => activityRowRank(b) - activityRowRank(a));
      const keep = rows[0];
      const legSuffix = activityRowLegSuffix(keep.id);
      const hash = nodeTxpowHashFromActivityId(keep.id)
        || normalizeTxHash(keep.explorerTxId || String(keep.id).slice(5));
      if (hash) {
        keep.id = legSuffix ? ('NODE-' + hash + legSuffix) : nodeActivityId(hash);
        if (keep.explorerTxId) keep.explorerTxId = hash;
      }
      for (let i = 1; i < rows.length; i++) dropIds.add(String(rows[i].id));
    });
    if (!dropIds.size) return;
    USER_ACTIVITY = USER_ACTIVITY.filter(r => !dropIds.has(String(r.id)));
  }

  function pruneOutgoingSendDuplicates() {
    const nodeOuts = USER_ACTIVITY.filter(r => r && r.dir === 'out' && String(r.id || '').indexOf('NODE-') === 0);
    if (!nodeOuts.length) return;
    USER_ACTIVITY = USER_ACTIVITY.filter(r => {
      if (!isOptimisticOutRow(r)) return true;
      return !nodeOuts.some(n => outgoingSendMatch(r, n));
    });
  }

  // A covenant mint/burn shows the app's local incoming row ("Minting xWiniwa", "Minting USDw",
  // "Reclaiming Winiwa", …) AND the node sync's generic NODE- "Received <ccy>" incoming row for the
  // exact same on-chain receipt. They are one event; keep the local row (clearer label, already
  // carries its own confirmation) and drop the node duplicate that shares its txpow hash. Without
  // this, an xWiniwa mint shows three rows (sent Winiwa + received xWiniwa + Minting xWiniwa).
  function pruneIncomingCovenantDuplicates() {
    const localInHashes = new Set();
    USER_ACTIVITY.forEach(function (r) {
      if (!r || r.dir !== 'in' || r.localOrigin !== true) return;
      if (String(r.id || '').indexOf('NODE-') === 0) return;
      const h = rowMinedTxpowKey(r) || normalizeTxHash(r.explorerTxId) || normalizeTxHash(r.pendingTxnId);
      if (h) localInHashes.add(h);
    });
    if (!localInHashes.size) return;
    USER_ACTIVITY = USER_ACTIVITY.filter(function (r) {
      if (!r || r.dir !== 'in') return true;
      if (String(r.id || '').indexOf('NODE-') !== 0) return true;
      const h = nodeTxpowHashFromActivityId(r.id) || normalizeTxHash(r.explorerTxId);
      return !(h && localInHashes.has(h));
    });
  }

  function isFaucetClaimActivityRow(r) {
    if (!r || r.dir !== 'in' || r.ccy !== 'Winiwa') return false;
    if (isFaucetPourLocalRow(r)) return true;
    const id = String(r.id || '');
    const title = String(r.title || '').toLowerCase();
    const cp = String(r.counterparty || '').toLowerCase();
    const note = String(r.note || '').toLowerCase();
    return (id.indexOf('NODE-') === 0 && id.indexOf(':winiwa') > 0
      && (title.indexOf('faucet') >= 0 || title.indexOf('covenant pour') >= 0
        || cp.indexOf('faucet covenant') >= 0 || note.indexOf('covenant pour') >= 0));
  }

  function faucetClaimMergeSourceRow(r) {
    if (!r || r.dir !== 'in' || normalizeActivityCcyLabel(r.ccy) !== 'Winiwa') return false;
    if (isFaucetPourLocalRow(r)) return true;
    /* Identity, never wording. This used to match the literal title "faucet claim submitted", which
       chained the merge to a display string: renaming the title would silently have stopped faucet
       rows de-duplicating. Both builders stamp faucetClaim and the covenant counterparty, so the
       row can be recognised without reading its label. The note/counterparty checks stay for rows
       already in localStorage from builds before the flag existed. */
    if (r.faucetClaim === true) return true;
    const cp = String(r.counterparty || '').toLowerCase();
    const note = String(r.note || '').toLowerCase();
    return cp.indexOf('on-chain faucet covenant') >= 0
      || cp.indexOf('faucet covenant') >= 0
      || note.indexOf('faucet covenant') >= 0
      || note.indexOf('covenant pour') >= 0;
  }

  function faucetClaimRowKey(r) {
    if (!isFaucetClaimActivityRow(r)) return '';
    return rowMinedTxpowKey(r)
      || normalizeTxHash(r.pendingTxnId)
      || normalizeTxHash(r.txnId)
      || (isFaucetPourLocalRow(r) ? 'local-faucet-pour' : '');
  }

  function faucetClaimMergeKey(r) {
    if (!r || r.dir !== 'in' || normalizeActivityCcyLabel(r.ccy) !== 'Winiwa') return '';
    const direct = faucetClaimRowKey(r);
    if (direct) return direct;
    if (!faucetClaimMergeSourceRow(r)) return '';
    return rowMinedTxpowKey(r)
      || normalizeTxHash(r.explorerTxId)
      || normalizeTxHash(r.pendingTxnId)
      || normalizeTxHash(r.txnId)
      || '';
  }

  function normalizeFaucetClaimRow(r) {
    if (!isFaucetClaimActivityRow(r)) return false;
    let changed = false;
    /* The canonical faucet title carries no lifecycle word. This function runs on every reconcile
       pass, so whatever it writes here IS the row's title for ever — and it used to re-stamp
       "Faucet claim submitted" on a row that had long since confirmed, which is why the label never
       changed no matter what a later upsert passed. The stage lives in `status`. */
    if (r.title !== 'Faucet claim') {
      r.title = 'Faucet claim';
      changed = true;
    }
    if (r.faucetClaim !== true) { r.faucetClaim = true; changed = true; }
    if (r.counterparty !== 'On-chain faucet covenant') {
      r.counterparty = 'On-chain faucet covenant';
      changed = true;
    }
    if (String(r.status || '') === 'Confirmed' && String(r.note || '').toLowerCase().indexOf('waiting') >= 0) {
      r.note = 'On-chain faucet covenant claim';
      changed = true;
    }
    return changed;
  }

  function pruneDuplicateFaucetClaimRows() {
    // Txpow hashes that belong to a local faucet-pour row (the optimistic claim row). The node sync
    // separately logs the received coin as a generic "Received Winiwa" (NODE-<hash>:winiwa) row, so a
    // node incoming-Winiwa row sharing one of these hashes is the SAME claim and must be merged —
    // otherwise the claim shows twice (faucet row + received row).
    const faucetPourHashes = new Set();
    const faucetPourRefs = [];
    USER_ACTIVITY.forEach(function (r) {
      if (faucetClaimMergeSourceRow(r)) {
        const h = rowMinedTxpowKey(r) || normalizeTxHash(r.explorerTxId) || normalizeTxHash(r.pendingTxnId);
        if (h) faucetPourHashes.add(h);
        const k = faucetClaimMergeKey(r);
        if (k) faucetPourRefs.push({ key: k, amt: Math.abs(Number(r.amt) || 0), ts: Number(r.ts || 0) });
      }
    });
    const groups = new Map();
    USER_ACTIVITY.forEach(function (r) {
      let key = faucetClaimMergeKey(r);
      if (!key && r && r.dir === 'in' && normalizeActivityCcyLabel(r.ccy) === 'Winiwa') {
        const idh = nodeTxpowHashFromActivityId(r.id) || normalizeTxHash(r.explorerTxId);
        if (idh && faucetPourHashes.has(idh)) key = idh;
        // Fallback: a generic node "Received Winiwa" row whose hash does NOT match the pour (the mined
        // txpow id can differ from the mempool transaction id the pour tracked) is still the same claim
        // when it matches a faucet pour by amount + close time. Faucet claims are a fixed deliberate
        // amount, so a same-amount Winiwa receive next to the pour is that pour, not a separate payment.
        if (!key && String(r.id || '').indexOf('NODE-') === 0 && r.localOrigin !== true) {
          const amt = Math.abs(Number(r.amt) || 0);
          const ts = Number(r.ts || 0);
          for (let i = 0; i < faucetPourRefs.length; i++) {
            const ref = faucetPourRefs[i];
            if (Math.abs(ref.amt - amt) < 1e-6 && (!ref.ts || !ts || Math.abs(ref.ts - ts) < 15 * 60 * 1000)) { key = ref.key; break; }
          }
        }
      }
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    if (!groups.size) return false;
    const dropRows = new Set();
    let changed = false;
    groups.forEach(function (rows) {
      if (!rows.length) return;
      // If any row in the group is a faucet claim/pour, the survivor wears the faucet framing even if
      // the highest-ranked (confirmed node) row was logged generically as "Received Winiwa".
      const hasFaucet = rows.some(function (r) { return isFaucetClaimActivityRow(r) || isFaucetPourLocalRow(r); });
      rows.sort(function (a, b) { return activityRowRank(b) - activityRowRank(a); });
      const keep = rows[0];
      if (normalizeFaucetClaimRow(keep)) changed = true;
      if (hasFaucet && keep.counterparty !== 'On-chain faucet covenant') {
        keep.title = 'Faucet claim';
        keep.counterparty = 'On-chain faucet covenant';
        keep.category = 'Winiwa';
        keep.faucetClaim = true;
        changed = true;
      }
      rows.slice(1).forEach(function (r) {
        dropRows.add(r);
        // Recognise the absorbed row by what it IS, not by the words in its label.
        if (isFaucetClaimActivityRow(r) || isFaucetPourLocalRow(r)) {
          keep.title = 'Faucet claim';
          keep.counterparty = 'On-chain faucet covenant';
          keep.faucetClaim = true;
          keep.localOrigin = keep.localOrigin || r.localOrigin;
        }
      });
    });
    if (dropRows.size) {
      USER_ACTIVITY = USER_ACTIVITY.filter(function (r) { return !dropRows.has(r); });
      changed = true;
    }
    return changed;
  }

  // The wallet's last faucet-claim time derived from its on-chain Activity (each node row carries the
  // txpow header time). This is the authoritative cooldown source: it follows the WALLET, not the
  // browser's localStorage, so a different browser / cleared storage cannot reset the 1h limit (the
  // synced on-chain history brings the real last-claim time with it). Returns 0 if none found.
  window.stablesGetOnChainLastFaucetClaimTs = function stablesGetOnChainLastFaucetClaimTs() {
    let latest = 0;
    try {
      USER_ACTIVITY.forEach(function (r) {
        // Only THIS app's own optimistic claim rows carry an accurate claim timestamp. Imported
        // NODE rows use the IMPORT time as `ts`, so counting them would resurrect a phantom cooldown
        // every time history re-imports an older claim (ts≈now). The durable, accurate cooldown source
        // is the localStorage claim key set at claim time; this on-chain signal is a same-session extra.
        if (!r || r.dir !== 'in' || r.localOrigin !== true || !isFaucetClaimActivityRow(r)) return;
        // A FAILED claim is not a claim: the v0.0.8.38 phone attempt failed txncheck, its row was
        // honestly marked status Failed, and this scanner still counted its timestamp, arming a
        // phantom 1h cooldown. Only rows that are not failed pace the wallet (founder 2026-07-18).
        if (/^failed$/i.test(String(r.status || ''))) return;
        const ts = Number(r.ts || 0);
        if (Number.isFinite(ts) && ts > latest) latest = ts;
      });
    } catch (_) { /* ignore */ }
    return latest;
  };

  function pruneLegacyNodeRowsWhenLegsExist() {
    const legHashes = new Set();
    USER_ACTIVITY.forEach(r => {
      if (!r || activityRowLegSuffix(r.id) === '') return;
      const hash = nodeTxpowHashFromActivityId(r.id);
      if (hash) legHashes.add(hash);
    });
    if (!legHashes.size) return;
    USER_ACTIVITY = USER_ACTIVITY.filter(r => {
      if (!r || String(r.id || '').indexOf('NODE-') !== 0) return true;
      if (activityRowLegSuffix(r.id)) return true;
      const hash = nodeTxpowHashFromActivityId(r.id);
      return !legHashes.has(hash);
    });
  }

  function isPhantomTestChannelActivityRow(r) {
    if (!r || String((window.STABLES_CONFIG || {}).APP_STAGE || '').toLowerCase() !== 'test') return false;
    if (r.localOrigin === true) return false; // never phantom app-initiated (optimistic) rows for test channel
    if (isGenuineConfirmedNodeRow(r)) return false; // a real confirmed on-chain tx is always shown, never capped/hidden
    const amt = Math.abs(Number(r.amt) || 0);
    const cap = faucetClaimAmountCap();
    if (r.ccy === 'USDw' && r.dir === 'in' && amt > 100000 && !r.localOrigin) return true;
    if (r.ccy === 'Winiwa' && r.dir === 'in') {
      if (!r.localOrigin && !isFaucetPourLocalRow(r) && amt > cap) return true;
      if (!r.localOrigin && !isFaucetPourLocalRow(r)
        && (isTestInfraAddress(r.counterparty) || isTestInfraAddress(r.address))) {
        return true;
      }
    }
    if (r.ccy === 'MINIMA' && r.dir === 'out' && !r.localOrigin
      && amt > 1 && (isTestInfraAddress(r.counterparty) || isTestInfraAddress(r.address)
        || String(r.title || '').indexOf('faucet') >= 0)) {
      return true;
    }
    if (r.dir === 'in' && !r.localOrigin && isTestInfraAddress(r.address)) {
      return true;
    }
    return false;
  }

  function prunePhantomFaucetPoolActivityRows() {
    const fac = faucetCovenantConfig();
    const cap = faucetClaimAmountCap();
    const maxWinShow = cap;
    const maxUsdwShow = 100000;
    USER_ACTIVITY = USER_ACTIVITY.filter(function (r) {
      if (!r) return false;
      if (isPhantomTestChannelActivityRow(r)) return false;
      if (isGenuineConfirmedNodeRow(r)) return true; // real confirmed on-chain tx: always show, never cap
      const amt = Math.abs(Number(r.amt) || 0);
      if (r.ccy === 'USDw' && r.dir === 'in' && amt > maxUsdwShow && !r.localOrigin) return false;
      if (fac && r.ccy === 'Winiwa' && r.dir === 'in') {
        if (isFaucetPourLocalRow(r) || String(r.id || '').indexOf(':winiwa') >= 0) {
          return amt <= maxWinShow * 2;
        }
        if (amt > maxWinShow) return false;
      }
      if (r.ccy === 'MINIMA' && r.dir === 'out' && String(r.id || '').indexOf(':minima') < 0
        && amt > 1 && String(r.title || '').toLowerCase().indexOf('faucet') >= 0) {
        return false;
      }
      if (r.dir === 'in' && !r.localOrigin && isTestInfraAddress(r.address)) {
        return false;
      }
      return true;
    });
    if (!fac) return;
    USER_ACTIVITY.forEach(function (r) {
      if (!r || r.ccy !== 'Winiwa' || r.dir !== 'in') return;
      if (isGenuineConfirmedNodeRow(r)) return; // real on-chain receive keeps its true amount
      const amt = Math.abs(Number(r.amt) || 0);
      if (amt > maxWinShow && String(r.id || '').indexOf(':winiwa') >= 0) {
        r.amt = cap;
        r.title = r.title || 'Received Winiwa (covenant pour)';
      }
    });
  }

  function normalizeActivityRowAmount(row) {
    if (!row) return row;
    const v = Math.abs(Number(row.amt) || 0);
    if (row.dir === 'out') row.amt = v > 0 ? -v : 0;
    else if (row.dir === 'in') row.amt = v;
    if (String((window.STABLES_CONFIG || {}).APP_STAGE || '').toLowerCase() === 'test'
      && row.localOrigin === true && row.dir === 'in') {
      const title = String(row.title || '').toLowerCase();
      const ccy = String(row.ccy || '');
      if ((ccy === 'USDw' && title.indexOf('minted usdw') >= 0)
        || (ccy === 'xWiniwa' && title.indexOf('minted xwiniwa') >= 0)
        || (ccy === 'Winiwa' && title.indexOf('burn reclaim') >= 0)) {
        row.balanceAlreadyApplied = true;
      }
    }
    return row;
  }

  function normalizeAllActivityRowAmounts() {
    USER_ACTIVITY.forEach(normalizeActivityRowAmount);
  }

  /**
   * A confirmed node row (from history; has a txpow hash, not localOrigin) supersedes the optimistic
   * local row for the same token movement. Removes the optimistic+confirmed duplicate so each real
   * transaction shows once, settled, with the chain-true amount.
   */
  function confirmedNodeSupersedesOptimisticRow(localRow, nodeRow) {
    if (!localRow || !nodeRow) return false;
    if (nodeRow.ccy !== localRow.ccy) return false;
    if ((Number(nodeRow.amt) > 0) !== (Number(localRow.amt) > 0)) return false;
    if (Math.abs(Math.abs(Number(nodeRow.amt)) - Math.abs(Number(localRow.amt))) >= 1e-6) return false;
    const localTime = Number(localRow.ts || 0);
    const nodeTime = Number(nodeRow.ts || 0);
    // Amount alone is not identity. A person can legitimately repeat the same small send, and the
    // old fallback deleted the new optimistic row when any historical NODE row had the same amount.
    // Both rows need real times inside the same settlement window before this heuristic may merge.
    if (!localTime || !nodeTime || Math.abs(localTime - nodeTime) > 30 * 60 * 1000) return false;
    return activityAddressesOverlap(localRow.address, nodeRow.address);
  }
  if (String((window.STABLES_CONFIG || {}).APP_STAGE || '').toLowerCase() === 'test') {
    window.__STABLES_TEST_CONFIRMED_NODE_SUPERSEDES_OPTIMISTIC__ = confirmedNodeSupersedesOptimisticRow;
  }

  function pruneOptimisticRowsSupersededByNode() {
    const confirmed = USER_ACTIVITY.filter(function (r) {
      return r && r.minimaOnChain && r.localOrigin !== true
        && isLikelyTxpowHash(r.explorerTxId) && r.ccy;
    });
    if (!confirmed.length) return false;
    const used = new Set();
    const keep = [];
    let dropped = 0;
    for (let i = 0; i < USER_ACTIVITY.length; i++) {
      const r = USER_ACTIVITY[i];
      // Faucet pour/claim rows are owned by pruneDuplicateFaucetClaimRows (which merges them into the
      // node row WITH the faucet framing). Never drop them here, or the "Faucet claim submitted" framing
      // is lost and the claim collapses to a bare "Received Winiwa".
      if (r && isFaucetClaimActivityRow(r)) { keep.push(r); continue; }
      // A row waiting for the person's approval in Minima was never posted, so nothing on chain can
      // be "the same transaction, confirmed". Without this the waiting row is silently absorbed by
      // any earlier confirmed row of the same amount and address inside the 30-minute window, and
      // the person is left with no row at all — worse than the wrong status, because there is
      // nothing on screen to explain why their money did not move (proven on the live host,
      // 2026-09-02: a 1 xWiniwa mint awaiting approval was eaten by a 1 xWiniwa mint from minutes
      // earlier).
      if (r && r.awaitingApproval === true) { keep.push(r); continue; }
      if (r && r.localOrigin === true && !isLikelyTxpowHash(r.explorerTxId) && r.ccy) {
        const m = confirmed.find(function (c) {
          if (used.has(c.id)) return false;
          return confirmedNodeSupersedesOptimisticRow(r, c);
        });
        if (m) { used.add(m.id); dropped++; continue; }
      }
      keep.push(r);
    }
    if (dropped) USER_ACTIVITY = keep;
    return dropped > 0;
  }

  /**
   * An optimistic local row that never linked to a chain tx (no txpow hash, no pending txn id) and is
   * older than the settle window is a phantom (its transaction failed or was dropped). Drop it so it
   * does not sit at "1/y" forever — e.g. the conflicting rapid-click mint attempts.
   */
  function pruneStaleUnconfirmedOptimisticRows() {
    const MAX_AGE_MS = 12 * 60 * 1000;
    const now = Date.now();
    const before = USER_ACTIVITY.length;
    USER_ACTIVITY = USER_ACTIVITY.filter(function (r) {
      if (!r || r.localOrigin !== true) return true;
      if (isLikelyTxpowHash(r.explorerTxId)) return true;
      if (normalizeTxHash(r.pendingTxnId)) return true; // posted, may still settle
      // Waiting on a person is not a phantom. Someone may leave a Minima approval sitting for far
      // longer than the 12-minute settle window, and deleting their only explanation of why nothing
      // happened is the opposite of honest.
      if (r.awaitingApproval === true) return true;
      const ts = Number(r.ts || 0);
      const stale = ts > 0 && (now - ts) > MAX_AGE_MS;
      const unsettled = isActivityUnsettledStatus(r.status) || r.pendingIncoming === true;
      return !(stale && unsettled);
    });
    return USER_ACTIVITY.length !== before;
  }

  function isLocalMintBurnOptimisticRow(r) {
    if (!r || r.localOrigin !== true || !r.minimaOnChain) return false;
    const id = String(r.id || '').toUpperCase();
    const title = String(r.title || '').toLowerCase();
    const cp = String(r.counterparty || '').toLowerCase();
    if (id.indexOf('MINT-') === 0 || id.indexOf('BURN-') === 0) return true;
    if (title.indexOf('minted usdw') >= 0) return true;
    if (title.indexOf('receiving usdw') >= 0) return true;
    if (title.indexOf('generating usdw mint') >= 0) return true;
    if (title.indexOf('sent winiwa (mint collateral)') >= 0) return true;
    if (title.indexOf('locked winiwa collateral') >= 0) return true;
    if (title.indexOf('generating collateral lock') >= 0) return true;
    if (cp.indexOf('issuer (test mint)') >= 0) return true;
    if (cp.indexOf('collateral pool (test)') >= 0) return true;
    return false;
  }

  function pruneStaleLocalMintBurnRowsWithoutChainProof() {
    const MAX_NO_ID_AGE_MS = 12 * 60 * 1000;
    const MAX_PENDING_ID_AGE_MS = 60 * 60 * 1000;
    const now = Date.now();
    const before = USER_ACTIVITY.length;
    USER_ACTIVITY = USER_ACTIVITY.filter(function (r) {
      if (!isLocalMintBurnOptimisticRow(r)) return true;
      if (String(r.status || '').toLowerCase() === 'failed') return true;
      if (isLikelyTxpowHash(r.explorerTxId)) return true;
      const pending = normalizeTxHash(r.pendingTxnId);
      const ts = Number(r.ts || 0);
      const age = ts > 0 ? (now - ts) : Number.POSITIVE_INFINITY;
      const maxAge = pending ? MAX_PENDING_ID_AGE_MS : MAX_NO_ID_AGE_MS;
      if (age <= maxAge) return true;

      // If node history imported the exact same token leg, keep the node row and drop only the
      // stale local optimistic copy. Otherwise the stale local row is a failed/dropped build.
      return false;
    });
    return USER_ACTIVITY.length !== before;
  }

  // Older builds could String() a nested token object into the literal "[object Object]" and bake it
  // into a row's ccy/title (e.g. an xWiniwa mint logging a "Received [object Object]" twin of the real
  // "Received xWiniwa" row). The label functions now prevent this for new rows, but already-stored rows
  // keep the corrupt label and carry no tokenid to re-derive from. Such a row is always a duplicate of a
  // correctly-labelled sibling (balances come from coins, not the log), so drop it.
  function pruneCorruptTokenLabelRows() {
    const corrupt = function (v) { return /\[object\s+\w+\]/i.test(String(v == null ? '' : v)); };
    const before = USER_ACTIVITY.length;
    USER_ACTIVITY = USER_ACTIVITY.filter(function (r) {
      if (!r) return true;
      return !(corrupt(r.ccy) || corrupt(r.category) || corrupt(r.title));
    });
    return USER_ACTIVITY.length !== before;
  }

  // A row stored before xWiniwa was in the sync token map carries a raw token id as its label/ccy
  // (e.g. "Received 0x5d0cbe…" / "+123.00 0x5d0cbe…"). Relabel any such already-stored row to the
  // proper token name from the live config map (exact id, or prefix match for a truncated id).
  function repairRawTokenIdLabelRows() {
    const map = liveTokenMapFromConfig();
    const ids = Object.keys(map);
    const resolve = function (v) {
      const s = String(v == null ? '' : v).trim().toLowerCase();
      if (!/^0x[0-9a-f]{4,}$/.test(s)) return '';
      if (map[s]) return map[s];
      // truncated id (display form) — match a known id that starts with it (>= 6 hex chars to be safe)
      if (s.length >= 8) { for (let i = 0; i < ids.length; i++) { if (ids[i].indexOf(s) === 0) return map[ids[i]]; } }
      return '';
    };
    let changed = false;
    USER_ACTIVITY.forEach(function (r) {
      if (!r) return;
      const label = resolve(r.ccy) || resolve(r.category);
      if (!label) return;
      if (r.ccy !== label) { r.ccy = label; changed = true; }
      if (r.category && resolve(r.category)) r.category = label;
      const t = String(r.title || '');
      if (/^(Sent|Received)\s+0x[0-9a-f]{4,}/i.test(t)) {
        r.title = t.replace(/(Sent|Received)\s+0x[0-9a-f]+/i, '$1 ' + label);
        changed = true;
      }
    });
    return changed;
  }

  /**
   * Diagnostic: log whenever a pruner/filter removes an incoming row, so silent Activity
   * drops are visible in logcat (APK console forwarding) and DevTools. Removals only.
   */
  function stablesTraceIncomingDrop(where, row) {
    try {
      if (!row || row.dir !== 'in') return;
      console.log('[Stables detect] drop ' + where + ' id=' + String(row.id || '').slice(0, 44)
        + ' ccy=' + row.ccy + ' amt=' + row.amt + ' status=' + row.status);
    } catch (_) { /* ignore */ }
  }

  function reconcileActivityDuplicates() {
    // Merge a faucet pour row with its node "Received Winiwa" row (keeping the faucet framing) BEFORE the
    // generic optimistic-supersede pruner runs — otherwise that pruner drops the faucet pour as a plain
    // superseded optimistic row, losing the "Faucet claim submitted" framing and briefly showing two rows.
    const steps = [
      ['native', pruneNativeMinimaActivityRows],
      ['non-stables-token', pruneNonStablesTestTokenNodeRows],
      ['corrupt-label', pruneCorruptTokenLabelRows],
      ['repair-label', repairRawTokenIdLabelRows],
      ['dup-node-txpow', pruneDuplicateNodeRowsByTxpow],
      ['legacy-when-legs', pruneLegacyNodeRowsWhenLegsExist],
      ['phantom-pool', prunePhantomFaucetPoolActivityRows],
      ['dup-faucet-1', pruneDuplicateFaucetClaimRows],
      ['optimistic-superseded', pruneOptimisticRowsSupersededByNode],
      ['stale-unconfirmed-optimistic', pruneStaleUnconfirmedOptimisticRows],
      ['stale-mintburn', pruneStaleLocalMintBurnRowsWithoutChainProof],
      ['dup-faucet-2', pruneDuplicateFaucetClaimRows],
      ['outgoing-dup', pruneOutgoingSendDuplicates],
      ['incoming-covenant-dup', pruneIncomingCovenantDuplicates],
    ];
    steps.forEach(function (step) {
      const before = new Map();
      USER_ACTIVITY.forEach(function (r) { if (r && r.dir === 'in') before.set(String(r.id || ''), r); });
      step[1]();
      const after = new Set(USER_ACTIVITY.map(function (r) { return String((r && r.id) || ''); }));
      before.forEach(function (row, id) { if (!after.has(id)) stablesTraceIncomingDrop(step[0], row); });
    });
    normalizeAllActivityRowAmounts();
  }

  // ── Block-confirmation counter ───────────────────────────────────────────────
  // Each on-chain MINIMA tx shows how many blocks deep it is (live counter), out of a
  // user-settable target (default 1). 0 = still in the mempool / awaiting the first block.
  const CONFIRM_TARGET_KEY = CFG.CONFIRM_TARGET_KEY || 'stables_confirm_target_v1';
  let CONFIRM_TARGET = (function () {
    try { const v = parseInt(localStorage.getItem(CONFIRM_TARGET_KEY), 10); return (Number.isFinite(v) && v >= 1 && v <= 30) ? v : 1; }
    catch (_) { return 1; }
  })();
  // Compatibility APIs. The value-based confirmation policy (payment-security.js) is the
  // primary system; this single global target remains the fallback when the policy engine
  // is unavailable or disabled. Setting it also flattens all policy levels to the same
  // depth so legacy callers keep a consistent app-wide effect.
  window.stablesGetConfirmTarget = function () { return CONFIRM_TARGET; };
  window.stablesSetConfirmTarget = function (n) {
    const v = Math.max(1, Math.min(30, parseInt(n, 10) || 1));
    CONFIRM_TARGET = v;
    try { localStorage.setItem(CONFIRM_TARGET_KEY, String(v)); } catch (_) { /* ignore */ }
    try {
      const ps = window.StablesPaymentSecurity;
      if (ps && typeof ps.getConfirmationPolicy === 'function' && typeof ps.saveConfirmationPolicy === 'function') {
        const policy = ps.getConfirmationPolicy();
        policy.levels.forEach(function (l) { l.blocks = v; });
        ps.saveConfirmationPolicy(policy);
      }
    } catch (_) { /* ignore */ }
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    if (typeof updateGlobalUI === 'function') updateGlobalUI();
    return v;
  };
  // Confirmations for a tx row: tip - block + 1 (1 = mined in the latest block); 0 = pending.
  function txConfirmations(x) {
    if (!x || !x.minimaOnChain) return null;
    const b = Number(x.block || 0);
    if (!b) return 0;
    const L = window.__STABLES_LIVE_NODE;
    const tip = Number((L && L.block != null) ? L.block : 0);
    if (!tip || tip < b) return 1;
    return Math.max(1, tip - b + 1);
  }

  // ── Row-level confirmation policy ────────────────────────────────────────────
  // Each on-chain row carries its own confirmation target (confirmTarget), stamped at first
  // ingest from the value-based policy in payment-security.js. The stamp never changes after
  // creation, so editing settings later does not retarget existing transactions. Legacy rows
  // without a stamp derive their target dynamically from the current policy and row value.
  function stablesFiatValueForActivityRow(row) {
    if (!row) return 0;
    const amt = Math.abs(Number(row.amt) || 0);
    if (!(amt > 0)) return 0;
    const ps = window.StablesPaymentSecurity;
    if (ps && typeof ps.fiatEquivalent === 'function') {
      try {
        const eq = ps.fiatEquivalent(amt, normalizeActivityCcyLabel(row.ccy));
        if (Number.isFinite(eq) && eq >= 0) return eq;
      } catch (_) { /* ignore */ }
    }
    return amt;
  }

  function stablesConfirmPolicyForRow(row) {
    const ps = window.StablesPaymentSecurity;
    if (ps && typeof ps.confirmationTargetFor === 'function') {
      try {
        return ps.confirmationTargetFor({ fiatTotal: stablesFiatValueForActivityRow(row) });
      } catch (_) { /* ignore */ }
    }
    return { blocks: CONFIRM_TARGET, label: '', upTo: null, fiatTotal: stablesFiatValueForActivityRow(row) };
  }

  function stablesGetConfirmTargetForRow(row) {
    const stamped = row ? parseInt(row.confirmTarget, 10) : NaN;
    if (Number.isFinite(stamped) && stamped >= 1 && stamped <= 30) return stamped;
    return stablesConfirmPolicyForRow(row).blocks;
  }

  /**
   * Stamp a row with its confirmation policy (idempotent: an existing valid stamp wins).
   * ctxOrValue: optional classifyTier-shaped ctx (sender path) or a plain fiat value.
   */
  function stablesStampConfirmPolicyOnRow(row, ctxOrValue) {
    if (!row || typeof row !== 'object') return row;
    const existing = parseInt(row.confirmTarget, 10);
    if (Number.isFinite(existing) && existing >= 1 && existing <= 30) return row;
    let policy = null;
    const ps = window.StablesPaymentSecurity;
    if (ps && typeof ps.confirmationTargetFor === 'function') {
      try {
        const ctx = (ctxOrValue && typeof ctxOrValue === 'object')
          ? ctxOrValue
          : { fiatTotal: (ctxOrValue === undefined || ctxOrValue === null) ? stablesFiatValueForActivityRow(row) : (Number(ctxOrValue) || 0) };
        policy = ps.confirmationTargetFor(ctx);
      } catch (_) { policy = null; }
    }
    if (!policy) policy = { blocks: CONFIRM_TARGET, label: '', fiatTotal: stablesFiatValueForActivityRow(row) };
    row.confirmTarget = policy.blocks;
    if (policy.label) row.confirmPolicyLabel = policy.label;
    row.confirmFiatValue = policy.fiatTotal;
    return row;
  }

  /** Keep the first stamp when an optimistic row merges into its node-synced replacement. */
  function carryConfirmStamp(fromRow, toRow) {
    if (!fromRow || !toRow) return;
    const stamp = parseInt(fromRow.confirmTarget, 10);
    if (!Number.isFinite(stamp) || stamp < 1 || stamp > 30) return;
    const existing = parseInt(toRow.confirmTarget, 10);
    if (Number.isFinite(existing) && existing >= 1 && existing <= 30) return;
    toRow.confirmTarget = stamp;
    if (fromRow.confirmPolicyLabel) toRow.confirmPolicyLabel = fromRow.confirmPolicyLabel;
    if (fromRow.confirmFiatValue !== undefined) toRow.confirmFiatValue = fromRow.confirmFiatValue;
  }

  window.stablesGetConfirmTargetForRow = stablesGetConfirmTargetForRow;
  window.stablesStampConfirmPolicyOnRow = stablesStampConfirmPolicyOnRow;
  window.stablesConfirmPolicyForRow = stablesConfirmPolicyForRow;
  window.stablesFiatValueForActivityRow = stablesFiatValueForActivityRow;

  /** UI counter: incoming receive warning and tx rows never show 0/y while still settling. */
  function txConfirmationsShown(x) {
    const c = txConfirmations(x);
    if (c === null) return null;
    if (c >= 1) return c;
    if (isIncomingSettlingRow(x)) return 1;
    return c;
  }

  function txConfirmVisualState(c, target) {
    if (c >= target) return 'done';
    if (c <= 0) return 'pending';
    return 'confirming';
  }

  // Compact "x/target" confirmation line shown under the amount on each on-chain tx.
  // Capped at the row's own target (so a deep tx reads e.g. 3/3, muted); 0/target while pending.
  function txConfirmLine(x) {
    /* A transaction Minima has QUEUED for the person's approval is not in the mempool and is not
       failed: it has not been signed yet. Neither of the words below is true of it. "receiving" is
       actively misleading — nothing is arriving, and it left a claim looking like it was in flight
       for as long as the approval sat untapped (observed on the live host, 2026-09-02: the row read
       "receiving" for over a minute while the real state was "waiting for you"). */
    if (x && x.awaitingApproval === true && String(x.status) !== 'Confirmed') {
      return '<div class="tx-conf-amt tx-conf--pending">awaiting approval</div>';
    }
    if (String(x && x.status) === 'Failed') {
      return '<div class="tx-conf-amt tx-conf--failed">failed</div>';
    }
    const c = txConfirmationsShown(x);
    if (c === null) return '';
    const t = stablesGetConfirmTargetForRow(x);
    const real = txConfirmations(x);
    const confirmed = String(x.status) === 'Confirmed';
    if (!confirmed && real === 0) {
      // Mempool stage of the status ladder: the node has seen the transaction,
      // no block yet. Direction-aware wording per the locked ladder spec.
      const word = x.dir === 'in' ? 'receiving' : (x.dir === 'self' ? 'combining' : 'sending');
      return '<div class="tx-conf-amt tx-conf--pending">' + word + '</div>';
    }
    const shown = confirmed ? t : Math.min(Math.max(c, 1), t);
    const state = (real >= t || confirmed)
      ? 'done'
      : txConfirmVisualState(shown, t);
    const label = (state === 'done')
      ? 'confirmed'
      : ((x.dir === 'in' ? 'received ' : 'sent ') + shown + '/' + t);
    return '<div class="tx-conf-amt tx-conf--' + state + '">' + label + '</div>';
  }
  window.stablesTxConfirmations = txConfirmations;

  // Status-ladder row treatment: settling rows get the amber edge; a row flashes once when
  // it first appears (fresh) or when its ladder status advances. Signatures are tracked per
  // list so the same transaction flashes in both the wallet recent list and Activity.
  const _txRowLadderSigs = Object.create(null);
  function applyTxRowLadderState(row, x, listId) {
    try {
      const conf = txConfirmations(x);
      const settling = x.minimaOnChain && String(x.status) !== 'Confirmed' && String(x.status) !== 'Failed'
        && (x.pendingIncoming === true || isActivityUnsettledStatus(x.status)
          || (conf !== null && conf < stablesGetConfirmTargetForRow(x)));
      if (settling) row.classList.add('tx-row--settling');
      const key = String(listId || '') + '|' + String(x.id || '');
      const sig = String(x.status || '') + '|' + String(conf === null ? '' : conf);
      const prev = _txRowLadderSigs[key];
      const fresh = Math.abs(Date.now() - Number(x.ts || 0)) < 2 * 60 * 1000;
      const amountsHidden = document.body.classList.contains('bal-privacy');
      if (!amountsHidden && ((prev !== undefined && prev !== sig) || (prev === undefined && fresh))) {
        row.classList.add('tx-row--flash');
      }
      _txRowLadderSigs[key] = sig;
    } catch (_) { /* presentation only */ }
  }

  function renderWalletSettlementBanner(list) {
    // Retired (v0.0.3.14): this synthetic amber banner duplicated the pour's real activity row —
    // and could contradict it (banner said "confirmed / tracking" while the honest row was still
    // "receiving"). ONE transaction, ONE row: the activity row is the only pour presentation.
  }

  function activeFaucetSettlementStatus() {
    const s = window.__STABLES_FAUCET_SETTLEMENT_STATUS__;
    return s && s.active ? s : null;
  }

  function faucetSettlementDetailText(s) {
    const elapsed = s && s.startedAt ? Math.max(0, Math.floor((Date.now() - Number(s.startedAt)) / 1000)) : 0;
    if (elapsed >= 90) {
      return 'Still waiting for confirmation. Your node may be behind; use refresh or check Minima Wallet history before retrying.';
    }
    if (elapsed >= 30) {
      return 'Still waiting for the next block. You can keep using Stables; Activity refreshes automatically.';
    }
    return (s && s.detail) || 'Waiting for confirmation. No action needed.';
  }

  function faucetSettlementShortId(s) {
    const raw = String((s && (s.txid || s.pendingTxnId)) || '').trim();
    if (!raw) return '';
    return raw.slice(0, 10) + '...' + raw.slice(-6);
  }

  function rowMatchesActiveFaucetSettlement(row, s) {
    if (!s || !isFaucetClaimActivityRow(row)) return false;
    const statusKeys = [normalizeTxHash(s.txid), normalizeTxHash(s.pendingTxnId)].filter(Boolean);
    const rowTx = rowMinedTxpowKey(row);
    const rowPending = normalizeTxHash(row.pendingTxnId) || normalizeTxHash(row.txnId);
    if (statusKeys.length && rowTx && statusKeys.indexOf(rowTx) >= 0) return true;
    if (statusKeys.length && rowPending && statusKeys.indexOf(rowPending) >= 0) return true;
    if (!statusKeys.length) return isFaucetPourLocalRow(row);
    return false;
  }

  function faucetSettlementRowRank(row) {
    let s = activityRowRank(row);
    if (rowMinedTxpowKey(row)) s += 8;
    if (String(row.id || '').indexOf('NODE-') === 0) s += 4;
    if (isFaucetPourLocalRow(row)) s += 2;
    return s;
  }

  function primaryFaucetSettlementRow(items, status) {
    if (!status) return null;
    const matches = items.filter(function (x) { return rowMatchesActiveFaucetSettlement(x, status); });
    if (!matches.length) return null;
    matches.sort(function (a, b) { return faucetSettlementRowRank(b) - faucetSettlementRowRank(a); });
    return matches[0];
  }

  function filterActiveFaucetSettlementRows(items, status, primary) {
    if (!status || !primary) return items;
    return items.filter(function (x) {
      return !rowMatchesActiveFaucetSettlement(x, status) || x === primary;
    });
  }

  function faucetSettlementDisplayForRow(row, status) {
    if (!rowMatchesActiveFaucetSettlement(row, status)) return null;
    const detail = faucetSettlementDetailText(status);
    const shortId = faucetSettlementShortId(status);
    return {
      title: status.title || 'Faucet claim submitted',
      detail: detail + (shortId ? ' · ' + shortId : ''),
      conf: 'tracking',
      highlight: true,
    };
  }

  function txpowMinedBlock(tp) {
    if (!tp) return 0;
    const header = tp.header || {};
    const raw = header.block != null ? header.block : (header.blocknumber != null ? header.blocknumber : 0);
    const b = Number(String(raw).replace(/,/g, ''));
    return Number.isFinite(b) && b > 0 ? Math.floor(b) : 0;
  }

  function activityRowMatchesTxpow(row, txpowId, txnId) {
    const want = normalizeTxHash(txpowId);
    const wantTxn = normalizeTxHash(txnId);
    if (!row) return false;
    const fromId = nodeTxpowHashFromActivityId(row.id);
    const fromExp = isLikelyTxpowHash(row.explorerTxId) ? normalizeTxHash(row.explorerTxId) : '';
    const fromPending = normalizeTxHash(row.pendingTxnId);
    const fromTxn = normalizeTxHash(row.txnId);
    if (want && ((fromId && fromId === want) || (fromExp && fromExp === want))) return true;
    if (wantTxn && ((fromPending && fromPending === wantTxn) || (fromTxn && fromTxn === wantTxn))) return true;
    return false;
  }

  function applyTxpowBlockToActivityRows(txpow) {
    const id = normalizeTxHash(txpow && txpow.txpowid);
    const tid = txpowTxnId(txpow);
    const blk = txpowMinedBlock(txpow);
    if (!id && !tid) return false;
    let changed = false;
    USER_ACTIVITY.forEach(function (r) {
      if (!r || !r.minimaOnChain) return;
      if (!activityRowMatchesTxpow(r, id, tid)) return;
      if (id) {
        if (normalizeTxHash(r.explorerTxId) !== id) {
          r.explorerTxId = id;
          changed = true;
        }
        if (isFaucetPourLocalRow(r) || String(r.id || '') === 'FAUCET-POUR-WINIWA') {
          const leg = r.ccy === 'Winiwa' ? ':winiwa' : '';
          const nextId = 'NODE-' + id + leg;
          if (r.id !== nextId) {
            r.id = nextId;
            changed = true;
          }
        }
      }
      if (tid && !r.txnId) {
        r.txnId = tid;
        changed = true;
      }
      if (blk > 0 && Number(r.block || 0) !== blk) {
        r.block = blk;
        changed = true;
      }
      if (blk > 0 && isActivityUnsettledStatus(r.status) && txConfirmations(r) < stablesGetConfirmTargetForRow(r)) {
        r.status = 'On-chain';
        changed = true;
      }
    });

    // If we learned a mined block from this txpow, make sure the live tip is at least this high so
    // txConfirmations and the "submitted" badge don't stay stuck at 0 even if the status poll is lagging
    // (common during heavy history worker on phone).
    if (blk > 0) {
      try {
        const L = window.__STABLES_LIVE_NODE;
        if (L) {
          const cur = Number(L.block || 0);
          if (!cur || blk > cur) {
            L.block = blk;
          }
        }
      } catch (_) {}
    }

    // If any row just received its block and now meets the confirmation target, treat it
    // like a confirmation event for balance settling (helps plain sends and live txpow paths).
    if (changed) {
      try {
        // Re-evaluate after the block update; if any row is now at target, kick a settle.
        const nowConfirmed = USER_ACTIVITY.some(function (r) {
          return r && r.minimaOnChain && txConfirmations(r) >= stablesGetConfirmTargetForRow(r);
        });
        if (nowConfirmed) {
          setTimeout(function () {
            try {
              // (hold-clear removed — success paths never clear; the stabilizer releases on convergence)
              if (typeof window.stablesRefreshLiveNodeBalances === 'function') window.stablesRefreshLiveNodeBalances({ reason: 'settlement', attempts: 5, forceDuringTxSync: true, preserveWiniwa: false });
            } catch (_) {}
          }, 80);
        }
      } catch (_) { /* best effort */ }
    }

    return changed;
  }
  window.stablesApplyTxpowToActivityRows = applyTxpowBlockToActivityRows;

  function coerceTxpowPayload(payload) {
    return (payload && payload.txpowid) ? payload
      : (payload && payload.txpow && payload.txpow.txpowid) ? payload.txpow
      : null;
  }

  async function loadTxpowById(txpowId) {
    const id = normalizeTxHash(txpowId);
    if (!id) return null;
    try {
      const direct = await mdsCommand('txpow txpowid:' + id);
      if (!mdsOk(direct)) return null;
      return coerceTxpowPayload(coerceMdsPayloadLocal(direct.response));
    } catch (_) {
      return null;
    }
  }

  function refreshSettlingActivityUi() {
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    if (typeof window.stablesRenderPendingIncomingIndicator === 'function') {
      window.stablesRenderPendingIncomingIndicator();
    }
    if (typeof updateGlobalUI === 'function') updateGlobalUI();
    try {
      const modal = document.getElementById('agentActionModal');
      const modalView = modal ? String(modal.dataset.stablesView || '') : '';
      if (selectedTxId && modal && modal.classList.contains('open') && modalView !== 'tx-progress' && modalView !== 'incoming-progress') {
        const tx = getTxById(selectedTxId);
        const missingMinedId = tx && tx.minimaOnChain
          && !(normalizeTxHash(tx.explorerTxId) || nodeTxpowHashFromActivityId(tx.id));
        if (tx && (isIncomingSettlingRow(tx) || missingMinedId) && typeof window.openActivityDetail === 'function') {
          window.openActivityDetail(selectedTxId);
        }
      }
    } catch (_) { /* ignore */ }
  }

  function finalizeSettledActivityRows() {
    let changed = false;
    const confirmedCcys = new Set();
    USER_ACTIVITY.forEach(function (r) {
      if (!r || !r.minimaOnChain) return;
      const conf = txConfirmations(r);
      if (conf === null || conf < stablesGetConfirmTargetForRow(r)) return;
      if (r.pendingIncoming) { r.pendingIncoming = false; changed = true; }
      if (isActivityUnsettledStatus(r.status)) {
        r.status = 'Confirmed';
        changed = true;
        // Capture the currency so we can force the wallet balance to authoritative value now.
        try {
          const c = String(r.ccy || r.category || '').trim();
          if (c) confirmedCcys.add(c);
        } catch (_) {}
      }
      if (r.note && String(r.note).indexOf('awaiting confirmation') >= 0) {
        r.note = '';
        changed = true;
      }
    });

    // When we just marked row(s) Confirmed, force a balance refresh. Do NOT clear the
    // optimistic holds here (v52 attributed trace: sendable still lags the change coin at
    // this exact moment, so the clear put the churn dip on screen). The stabilizer releases
    // on convergence, which the forced refresh accelerates.
    if (confirmedCcys.size > 0) {
      const ccys = Array.from(confirmedCcys);
      setTimeout(function () {
        try {
          if (typeof window.stablesRefreshLiveNodeBalances === 'function') {
            window.stablesRefreshLiveNodeBalances({ reason: 'settlement', attempts: 6, forceDuringTxSync: true, preserveWiniwa: false });
          }
          // One more quick refresh a bit later in case the node needs an extra tick
          setTimeout(function () {
            try { if (typeof window.stablesRefreshLiveNodeBalances === 'function') window.stablesRefreshLiveNodeBalances({ reason: 'settlement', attempts: 3, forceDuringTxSync: true, preserveWiniwa: false }); } catch (_) {}
          }, 1200);
        } catch (_) { /* ignore */ }
      }, 60);
    }

    return changed;
  }

  window.stablesRefreshPendingSettlement = async function stablesRefreshPendingSettlement() {
    // Phase 2 rebuild (v70): per-row txpow polling retired — tx-mirror.js advances row
    // status via `txpow onchain:` on its own cycle. Keep the pure-UI refresh only.
    try { refreshSettlingActivityUi(); } catch (_) { /* ignore */ }
    return false;
  };

  window.stablesOnLiveBlockTick = function stablesOnLiveBlockTick() {
    window.stablesRefreshPendingSettlement().catch(function () { /* ignore */ });
  };

  const TX_NOTES_KEY = CFG.TX_NOTES_KEY || 'stables_tx_notes_v1';
  const MERCHANT_RATINGS_KEY = CFG.MERCHANT_RATINGS_KEY || 'stables_merchant_ratings_v1';
  const CONTACT_FAVORITES_KEY = CFG.CONTACT_FAVORITES_KEY || 'stables_contact_favorites_v1';
  const CONTACT_PAYMENT_TIER_KEY = CFG.CONTACT_PAYMENT_TIER_KEY || 'stables_contact_payment_tier_v1';
  const BACKUP_STORAGE_KEY = CFG.BACKUP_STORAGE_KEY || 'stables_last_config_backup_ts';
  const BACKUP_REMINDER_HOURS = CFG.BACKUP_REMINDER_HOURS || 48;
  const BACKUP_FIRST_SEEN_KEY = CFG.BACKUP_FIRST_SEEN_KEY || 'stables_backup_first_seen_ts';
  const SEED_PHRASE_SAVED_CONFIRMED_KEY = CFG.SEED_PHRASE_SAVED_CONFIRMED_KEY || 'stables_seedphrase_saved_confirmed_v1';

  if (CFG.RESET_VAULT_KEY_CONFIRMATION_ON_EACH_LOAD) {
    try {
      localStorage.removeItem(SEED_PHRASE_SAVED_CONFIRMED_KEY);
    } catch (_) {}
  }

  const SHOWCASE_CONTACTS = [
    { name: 'Alex', category: 'Friend', address: 'MxA1...9f21', city: 'Amsterdam, NL' },
    { name: 'Maria', category: 'Friend', address: 'MxB2...3ca8', city: 'Lisbon, PT' },
    { name: 'Sam', category: 'Friend', address: 'MxC3...88de', city: 'Berlin, DE' },
    { name: 'Ground Coffee Roasters', category: 'Coffee', address: 'MxD4...2be1', city: 'London, UK' },
    { name: 'Open Pages Bookshop', category: 'Books', address: 'MxE5...6cd4', city: 'London, UK' },
    { name: 'City Transit', category: 'Transport', address: 'MxF6...7ef2', city: 'Amsterdam, NL' },
    { name: 'Green Basket Market', category: 'Groceries', address: 'MxG7...55ab', city: 'Utrecht, NL' },
    { name: 'Northwind Gym', category: 'Wellness', address: 'MxH8...a9f0', city: 'Rotterdam, NL' },
    { name: 'RentVault', category: 'Housing', address: 'MxI9...11aa', city: 'Amsterdam, NL' },
    { name: 'Nimbus Subscriptions', category: 'Subscription', address: 'MxJ0...84cc', city: 'Remote' }
  ];
  const DEMO_CONTACTS = DEMO_REAL ? [] : SHOWCASE_CONTACTS;

  const SHOP_PROFILES = {
    'Ground Coffee Roasters': {
      icon: '☕', name: 'Ground Coffee Roasters', category: 'Cafe', city: 'Berlin, DE', status: 'Open',
      accepts: ['USDw', 'EURw'], avgTicket: '4.50 USDw', openHours: 'Mon-Sat · 07:00-19:00',
      promos: ['10% off espresso before 10:00', 'Buy 5 coffees, get 1 free', 'Free oat milk upgrade this week']
    },
    'The Bread Collective': {
      icon: '🥖', name: 'The Bread Collective', category: 'Bakery', city: 'Amsterdam, NL', status: 'Open',
      accepts: ['USDw', 'EURw', 'GBPw'], avgTicket: '7.80 USDw', openHours: 'Tue-Sun · 06:30-18:30',
      promos: ['Morning combo: coffee + croissant 5.90 USDw', '15% discount on sourdough after 17:00']
    },
    'Open Pages Bookshop': {
      icon: '📚', name: 'Open Pages Bookshop', category: 'Books', city: 'London, UK', status: 'New',
      accepts: ['USDw', 'GBPw'], avgTicket: '12.20 USDw', openHours: 'Daily · 10:00-20:00',
      promos: ['12% off first purchase', '2-for-1 selected paperbacks', 'Weekend author-signing voucher']
    }
  };

  const ICON_BY_CATEGORY = { Friend: '↙', Coffee: '🏪', Books: '📚', Transport: '🚇', Groceries: '🛒', Wellness: '💪', Housing: '🏠', Subscription: '💳' };
  const CCY_ROTATION = ['USDw', 'EURw', 'GBPw'];
  const BASE_DATE = new Date('2026-03-19T14:32:00');
  const DEMO_ACTIVITY = [];
  if (!DEMO_REAL) {
    for (let i = 0; i < 75; i++) {
      const cp = DEMO_CONTACTS[i % DEMO_CONTACTS.length];
      const dir = i % 3 === 0 ? 'in' : 'out';
      const ccy = CCY_ROTATION[i % CCY_ROTATION.length];
      const magnitude = ((i * 17) % 260) + (dir === 'in' ? 25 : 6.5);
      const amt = Number((dir === 'in' ? magnitude : -magnitude).toFixed(2));
      const dt = new Date(BASE_DATE.getTime() - (i * 7.25 * 60 * 60 * 1000));
      const dateText = dt.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      DEMO_ACTIVITY.push({
        id: `TX-${String(100001 + i)}`, dir, icon: ICON_BY_CATEGORY[cp.category] || (dir === 'in' ? '↙' : '↗'),
        counterparty: cp.name, category: cp.category, title: `${dir === 'in' ? 'Received from' : 'Paid'} ${cp.name}`,
        date: dateText, ts: dt.getTime(), amt, ccy, address: cp.address, fee: Number((Math.max(0.02, Math.abs(amt) * 0.0001)).toFixed(2)),
        explorerTxId: toDemoTradeId(`TX-${String(100001 + i)}`),
        status: i % 19 === 0 ? 'Pending' : 'Confirmed', note: i % 5 === 0 ? 'Monthly recurring flow' : 'Demo payment',
        directionLabel: dir === 'in' ? 'Incoming' : 'Outgoing'
      });
    }
  }

  let USER_ACTIVITY = [];
  let _activityOwnerId = '';
  let _txSyncInFlight = false; // true while a node history sync runs (drives the loading indicator)
  let _txSyncWorkerActive = false;
  let _txSyncPending = false;
  let _txSyncRunId = 0;
  let _txSyncWatchdog = null;
  const TX_SYNC_UI_GATE_TIMEOUT_MS = 90000;

  function readStoredOwnerId() {
    try {
      const raw = String(localStorage.getItem(WALLET_OWNER_KEY) || '').trim();
      if (!raw || raw.charAt(0) === '[') return '';
      return raw.toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function persistOwnerId(id) {
    const v = String(id || '').trim().toLowerCase();
    if (!v) return;
    _activityOwnerId = v;
    try { localStorage.setItem(WALLET_OWNER_KEY, v); } catch (_) { /* ignore */ }
  }

  function readTestSessionActivityRows() {
    if ((window.STABLES_CONFIG || {}).APP_STAGE !== 'test') return [];
    try {
      const j = JSON.parse(sessionStorage.getItem(TEST_ACTIVITY_SESSION_KEY) || '[]');
      return Array.isArray(j) ? j : [];
    } catch (_) {
      return [];
    }
  }
  function writeTestSessionActivityRows(rows) {
    if ((window.STABLES_CONFIG || {}).APP_STAGE !== 'test') return;
    try {
      sessionStorage.setItem(TEST_ACTIVITY_SESSION_KEY, JSON.stringify(rows.slice(0, 80)));
      const owner = _activityOwnerId || readStoredOwnerId();
      if (owner) sessionStorage.setItem(TEST_ACTIVITY_SESSION_OWNER_KEY, owner);
    } catch (_) { /* ignore */ }
  }
  function mergeTestSessionActivityRows() {
    if ((window.STABLES_CONFIG || {}).APP_STAGE !== 'test') return;
    const ownerId = _activityOwnerId || readStoredOwnerId();
    let sessionOwner = '';
    try { sessionOwner = String(sessionStorage.getItem(TEST_ACTIVITY_SESSION_OWNER_KEY) || '').trim().toLowerCase(); } catch (_) { /* ignore */ }
    if (sessionOwner && ownerId && sessionOwner !== ownerId) {
      writeTestSessionActivityRows([]);
      return;
    }
    const sessionRows = readTestSessionActivityRows();
    if (!sessionRows.length) return;
    const byId = new Map(USER_ACTIVITY.map(r => [String(r.id || ''), r]));
    sessionRows.forEach(row => {
      if (!row || !row.id) return;
      if (!byId.has(String(row.id))) USER_ACTIVITY.unshift(row);
    });
    reconcileActivityDuplicates();
  }

  function loadUserActivityFromStorage() {
    USER_ACTIVITY = [];
    if (!DEMO_REAL) return;
    try {
      const raw = localStorage.getItem(USER_ACTIVITY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        USER_ACTIVITY = parsed;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rows)) {
        const bundleOwner = String(parsed.ownerId || '').trim().toLowerCase();
        const storedOwner = readStoredOwnerId();
        if (bundleOwner && storedOwner && bundleOwner !== storedOwner) {
          USER_ACTIVITY = [];
        } else {
          _activityOwnerId = bundleOwner || storedOwner;
          USER_ACTIVITY = parsed.rows;
        }
      }
    } catch (_) {
      USER_ACTIVITY = [];
    }
    let beforeReconcile = '';
    try { beforeReconcile = JSON.stringify(USER_ACTIVITY); } catch (_) { beforeReconcile = ''; }
    migrateStaleNodeRowsIfNeeded();
    mergeTestSessionActivityRows();
    reconcileActivityDuplicates();
    try {
      if (beforeReconcile && JSON.stringify(USER_ACTIVITY) !== beforeReconcile) persistUserActivityToStorage();
    } catch (_) { /* ignore */ }
  }

  /**
   * One-time self-heal: drop confirmed node-origin rows (NODE-…, not localOrigin) persisted by an
   * earlier attribution build, because before the mint/burn covenant was excluded those rows could
   * carry wrong amounts/directions (e.g. a mint's collateral leg shown as a +receive). They are always
   * re-derivable from node history, so the next sync rebuilds them correctly. App-local/optimistic
   * rows (faucet pours, pending sends) are preserved. Runs once per schema token per wallet.
   */
  function migrateStaleNodeRowsIfNeeded() {
    if (!DEMO_REAL) return;
    let stored = '';
    try { stored = localStorage.getItem(ACTIVITY_SCHEMA_KEY) || ''; } catch (_) { /* ignore */ }
    if (stored === ACTIVITY_SCHEMA) return;
    const before = USER_ACTIVITY.length;
    USER_ACTIVITY = USER_ACTIVITY.filter(function (r) {
      if (!r) return false;
      if (r.localOrigin === true) return true;
      return String(r.id || '').indexOf('NODE-') !== 0; // re-derive on-chain rows from node history
    });
    try { localStorage.setItem(ACTIVITY_SCHEMA_KEY, ACTIVITY_SCHEMA); } catch (_) { /* ignore */ }
    if (USER_ACTIVITY.length !== before) persistUserActivityToStorage();
  }
  function persistUserActivityToStorage() {
    if (!DEMO_REAL) return;
    try {
      const ownerId = _activityOwnerId || readStoredOwnerId();
      const payload = ownerId
        ? { ownerId: ownerId, rows: USER_ACTIVITY }
        : USER_ACTIVITY;
      localStorage.setItem(USER_ACTIVITY_STORAGE_KEY, JSON.stringify(payload));
    } catch (_) { /* ignore */ }
  }
  loadUserActivityFromStorage();

  window.stablesAppendUserActivityRow = function (row) {
    if (!DEMO_REAL || !row || !row.id) return;
    if (isNativeMinimaActivityRow(row)) return;
    normalizeActivityRowAmount(row);
    if (typeof row.ts !== 'number' || !Number.isFinite(row.ts) || row.ts <= 0) row.ts = Date.now();
    if (row.minimaOnChain) stablesStampConfirmPolicyOnRow(row);
    if (row.dir === 'out' && row.minimaOnChain) {
      const nodeOuts = USER_ACTIVITY.filter(r => r && r.dir === 'out' && String(r.id || '').indexOf('NODE-') === 0);
      if (isOptimisticOutRow(row) && nodeOuts.some(n => outgoingSendMatch(row, n))) return;
    }
    // Idempotent by id: never stack two rows for the same id.
    const dupIdx = USER_ACTIVITY.findIndex(r => r && String(r.id) === String(row.id));
    if (dupIdx !== -1) USER_ACTIVITY.splice(dupIdx, 1);
    USER_ACTIVITY.unshift(row);
    reconcileActivityDuplicates();
    if (USER_ACTIVITY.length > 200) USER_ACTIVITY.length = 200;
    persistUserActivityToStorage();
    if ((window.STABLES_CONFIG || {}).APP_STAGE === 'test' && isAppLocalActivityRow(row)) {
      const sessionRows = readTestSessionActivityRows().filter(r => String(r.id) !== String(row.id));
      sessionRows.unshift(row);
      writeTestSessionActivityRows(sessionRows);
    }
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
    // Extra timeout force to ensure wallet recent list updates even if called during tab render or early load (fixes invisible tx)
    setTimeout(function () {
      try {
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        if (typeof window.renderActivity === 'function') window.renderActivity();
      } catch (_) {}
    }, 200);
  };
  window.stablesReloadUserActivityFromStorage = loadUserActivityFromStorage;

  // ── Phase 2 rebuild (v70): lean writers for tx-mirror.js ─────────────────────────────
  // Node-truth rows bypass the legacy reconciliation heuristics entirely. Idempotent by id:
  // an existing row is updated in place (status ladder), a new row may adopt a recent
  // optimistic local row (the send flow's "Sending…" row, a faucet/mint pour row) with the
  // same direction/token/amount so its title and semantics survive and the list never
  // shows both.
  window.stablesHasNodeActivityRow = function (idPrefix) {
    const p = String(idPrefix || '');
    if (!p) return false;
    return USER_ACTIVITY.some(r => r && String(r.id || '').indexOf(p) === 0);
  };

  // Still-settling node rows (for tx-mirror.js to re-track its confirmation ladder after an
  // app restart — the ladder's pending set is in-memory only).
  window.stablesListUnsettledNodeRows = function () {
    return USER_ACTIVITY
      .filter(r => r && String(r.id || '').indexOf('NODE-') === 0
        && r.minimaOnChain && String(r.status || '') !== 'Confirmed' && String(r.status || '') !== 'Failed')
      .map(r => ({
        id: String(r.id),
        dirIn: r.dir === 'in',
        target: Number(r.confirmTarget) || 0
      }));
  };

  // On-chain mirror rows for the covenant correction pass: an outgoing row that is really a
  // faucet/mint claim (wrong direction), or an incoming row that this node merely relayed for
  // someone else (wrong on the pool-operator node). Returns id, txpowid, direction and signed
  // amount so the mirror can re-resolve against chain + address ownership and remove/repair.
  window.stablesListNodeRowsForRecheck = function () {
    // NODE- rows AND RECV- rows (mirror-rebuilt receive legs) are both node-derived and both
    // re-judged against chain ownership by the mirror's reconcile sweep (2026-07-10).
    return USER_ACTIVITY
      .filter(r => r && (String(r.id || '').indexOf('NODE-') === 0 || String(r.id || '').indexOf('RECV-') === 0) && r.minimaOnChain)
      .map(r => ({
        id: String(r.id),
        dir: r.dir,
        amt: Number(r.amt) || 0,
        ccy: normalizeActivityCcyLabel(r.ccy),
        title: String(r.title || ''),
        // One-row-per-trade metadata: the sweep must know a fill row is already merged.
        g3Merged: r.g3Merged === true,
        txid: String(r.explorerTxId || '').trim()
          || String(r.id).replace(/^NODE-/, '').replace(/^RECV-/, '').replace(/:.*$/, '')
      }));
  };

  // App-created optimistic rows currently shown as Failed (or still unsettled), for the
  // mirror's rescue pass: a matching on-chain txpow means the transaction succeeded and the
  // row is a false failure to remove.
  window.stablesListFailedOptimisticRows = function () {
    return USER_ACTIVITY
      .filter(r => r && r.minimaOnChain === true && r.localOrigin === true
        && String(r.id || '').indexOf('NODE-') !== 0
        && (String(r.status || '') === 'Failed'
          || isActivityUnsettledStatus(String(r.status || '')) || r.pendingIncoming === true))
      .map(r => ({
        id: String(r.id),
        ccy: normalizeActivityCcyLabel(r.ccy),
        dir: String(r.dir || ''),
        amt: Math.abs(Number(r.amt) || 0),
        ts: Number(r.ts || 0) || 0,
        txid: normalizeTxHash(r.explorerTxId) || normalizeTxHash(r.pendingTxnId) || ''
      }));
  };

  // Hard-remove a mirror row by exact id (used by the correction pass so a corrected row can
  // be re-imported cleanly). Persists and re-renders.
  window.stablesRemoveActivityRowById = function (id) {
    const key = String(id || '');
    if (!key) return false;
    const before = USER_ACTIVITY.length;
    USER_ACTIVITY = USER_ACTIVITY.filter(r => !(r && String(r.id) === key));
    if (USER_ACTIVITY.length === before) return false;
    persistUserActivityToStorage();
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    return true;
  };

  // Auto-expiry: an app-created optimistic on-chain row (a send "Sending" or faucet "Pouring"
  // row) that is still unsettled and NOT a NODE- row after this long never landed on-chain.
  // BUT: adoption into a NODE-<txid> row only happens on the LIVE mirror path — when the
  // transaction settles while the app is closed (WebView frozen / process gone), the next
  // launch imports it as a separate NODE row and the optimistic twin is left behind. So before
  // failing a row (and for rows already wrongly marked Failed), look for a matching NODE row:
  // same direction, currency, and amount near the same time means the transaction SUCCEEDED —
  // the local row is a duplicate and is removed, not failed.
  const OPTIMISTIC_EXPIRY_MS = 10 * 60 * 1000;
  //NODE rows now carry the REAL on-chain time as their ts (tx-mirror stamps the txpow header's
  //timemilli — v0.0.3.12), so twin/adoption matching anchors on when the transaction actually
  //happened, and the window is TIGHT. The old 48h window (needed when NODE ts was the import
  //time) let a fresh pour adopt a five-hour-old claim's identity and falsely confirm — the
  //"confirmed +1,000 but balance unchanged" trust breaker.
  const NODE_TWIN_WINDOW_MS = 30 * 60 * 1000;

  function findNodeTwinRow(r, consumedNodeIds) {
    const amt = Math.abs(Number(r.amt) || 0);
    if (!(amt > 0)) return null;
    const ccy = normalizeActivityCcyLabel(r.ccy);
    const dir = String(r.dir || '');
    const ts = Number(r.ts || 0) || 0;
    const tol = Math.max(1e-9, amt * 1e-6);
    return USER_ACTIVITY.find(function (n) {
      return n && String(n.id || '').indexOf('NODE-') === 0
        && !consumedNodeIds.has(String(n.id))
        && String(n.dir || '') === dir
        && normalizeActivityCcyLabel(n.ccy) === ccy
        && Math.abs(Math.abs(Number(n.amt) || 0) - amt) <= tol
        && (!ts || Math.abs(Number(n.ts || 0) - ts) <= NODE_TWIN_WINDOW_MS);
    }) || null;
  }

  function expireStaleOptimisticRows() {
    const now = Date.now();
    let changed = false;
    const consumedNodeIds = new Set();
    const removeIds = [];
    // One-time hygiene: purge ghost skeleton rows (no title/ccy) created by the pre-fix
    // status-only upsert fall-through — they persist in storage on devices that hit the bug.
    USER_ACTIVITY.forEach(function (r) {
      if (r && r.id && !r.title && !r.ccy) { removeIds.push(String(r.id)); changed = true; }
    });
    USER_ACTIVITY.forEach(function (r) {
      if (!r || r.minimaOnChain !== true || r.localOrigin !== true) return;
      if (String(r.id || '').indexOf('NODE-') === 0) return; // landed on-chain (adopted)
      const s = String(r.status || '');
      const unsettled = isActivityUnsettledStatus(s) || r.pendingIncoming === true;
      if (s !== 'Failed' && !unsettled) return;
      const twin = findNodeTwinRow(r, consumedNodeIds);
      if (twin) {
        // Transaction succeeded (node row is the truth): drop the optimistic duplicate.
        // Also heals rows this expiry wrongly failed before the twin check existed.
        consumedNodeIds.add(String(twin.id));
        removeIds.push(String(r.id));
        changed = true;
        return;
      }
      if (s === 'Failed' || s === 'Confirmed') return;
      // A row that recorded its accepted transaction id (e.g. a self-send, whose zero net
      // diff means no NODE twin ever forms) is NOT a phantom — the node accepted it. Leave
      // it to the settle-mined sweep, which confirms it from chain truth via `txpow`.
      if (isLikelyTxpowHash(r.explorerTxId) || normalizeTxHash(r.pendingTxnId)) return;
      const ts = Number(r.ts || 0) || 0;
      if (!ts || (now - ts) < OPTIMISTIC_EXPIRY_MS) return;
      r.status = 'Failed';
      r.pendingIncoming = false;
      r.note = 'This transaction did not confirm on-chain. You can delete it.';
      changed = true;
    });
    if (removeIds.length) {
      USER_ACTIVITY = USER_ACTIVITY.filter(function (r) {
        return !(r && removeIds.indexOf(String(r.id)) !== -1);
      });
    }
    if (changed) {
      persistUserActivityToStorage();
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    }
    return changed;
  }
  window.stablesExpireStaleOptimisticRows = expireStaleOptimisticRows;
  window.stablesRepeatWhileVisible('optimistic-row-expiry', expireStaleOptimisticRows, 60000);

  window.stablesMirrorUpsertRow = function (row, adoptLocal) {
    if (!DEMO_REAL || !row || !row.id) return null;
    const id = String(row.id);
    const existingIdx = USER_ACTIVITY.findIndex(r => r && String(r.id) === id);
    if (existingIdx !== -1) {
      const keep = USER_ACTIVITY[existingIdx];
      ['status', 'block', 'note', 'pendingIncoming', 'txConfirmations', 'confirmTarget'].forEach(function (k) {
        if (row[k] !== undefined) keep[k] = row[k];
      });
      persistUserActivityToStorage();
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
      //Ladder moves change the settling overlay, so the currency rows + hero total must repaint.
      scheduleWalletBalanceRepaint();
      return keep;
    }
    // Status-only ladder updates (advancePending sends {id, status, block, …}) must NEVER create
    // a row: if the original row is gone (deleted, migrated, adopted), inserting the partial
    // object produced the "undefined / undefined / +0" ghost rows seen on-device.
    if (!row.title || !row.ccy) return null;
    normalizeActivityRowAmount(row);
    if (typeof row.ts !== 'number' || !Number.isFinite(row.ts) || row.ts <= 0) row.ts = Date.now();
    if (row.minimaOnChain) stablesStampConfirmPolicyOnRow(row);
    if (adoptLocal) {
      //Matches the twin-heal window in expireStaleOptimisticRows: a settled-while-closed
      //transaction must still adopt its local row at next-launch import. Adopted rows are
      //spliced out on match, so an already-represented send can never be matched twice.
      //Anchor on the node row's CHAIN time (row.ts), not on "now": a local optimistic row is
      //only this transaction's twin if it was created around when the txn actually happened.
      const RECENT_MS = NODE_TWIN_WINDOW_MS;
      const anchorTs = Number(row.ts) > 0 ? Number(row.ts) : Date.now();
      const m = USER_ACTIVITY.findIndex(r => r
        && String(r.id || '').indexOf('NODE-') !== 0
        && r.dir === row.dir
        && activityCcySame(r.ccy, row.ccy)
        && Math.abs(Math.abs(Number(r.amt) || 0) - Math.abs(Number(row.amt) || 0)) < 1e-9
        && Math.abs(anchorTs - Number(r.ts || 0)) < RECENT_MS);
      if (m !== -1) {
        const local = USER_ACTIVITY.splice(m, 1)[0];
        ['title', 'counterparty', 'category', 'icon', 'address', 'confirmTarget', 'confirmPolicyLabel', 'confirmFiatValue', 'flowId'].forEach(function (k) {
          if (local[k] !== undefined && local[k] !== '') row[k] = local[k];
        });
        // In-progress action titles settle with the node row ("Sending X" → "Sent X").
        if (typeof row.title === 'string' && /^Sending /.test(row.title)) {
          row.title = row.title.replace(/^Sending /, 'Sent ');
        }
      }
    }
    USER_ACTIVITY.unshift(row);
    if (USER_ACTIVITY.length > 200) USER_ACTIVITY.length = 200;
    persistUserActivityToStorage();
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
    //A new incoming row must show in the currency balances + hero total immediately (settling
    //overlay), not only after the next balance poll repaints the wallet.
    scheduleWalletBalanceRepaint();
    return row;
  };

  //Coalesced wallet repaint. The mirror can upsert dozens of rows in a burst (initial import,
  //advance cycles); one updateGlobalUI per upsert stalls the WebView main thread (ANRs observed
  //on-device) and a mid-typing rebuild can blur the focused input, hiding the keyboard.
  let _walletRepaintTimer = null;
  function scheduleWalletBalanceRepaint() {
    if (_walletRepaintTimer) return;
    _walletRepaintTimer = setTimeout(function () {
      _walletRepaintTimer = null;
      try { if (typeof window.updateGlobalUI === 'function') window.updateGlobalUI(); } catch (_) { /* ignore */ }
    }, 300);
  }

  // Live lookup of a tracked activity row by id (used by the "Send submitted" modal to pick up
  // the mined txpow id on the fly as the settlement tracker resolves it).
  window.stablesGetUserActivityRowById = function (id) {
    const key = String(id || '').trim();
    if (!key) return null;
    return USER_ACTIVITY.find(r => r && String(r.id) === key) || null;
  };

  // Structured progress for the "Send submitted" tracker, derived from the live activity row using
  // the same confirmation logic the Activity page uses (txConfirmations / CONFIRM_TARGET). Stages:
  // built -> sent (broadcast / mempool) -> mined (txpow id / block) -> confirmed (>= target blocks).
  // High-water mark per tracked send id, so the stepper only ever moves forward (see below).
  const SEND_PROGRESS_LATCH = Object.create(null);

  function findActivityRowByTxRef(txid, pendingTxnId) {
    const h = normalizeTxHash(txid);
    const ptn = normalizeTxHash(pendingTxnId);
    if (!h && !ptn) return null;
    for (let i = 0; i < USER_ACTIVITY.length; i++) {
      const r = USER_ACTIVITY[i];
      if (!r) continue;
      const rh = normalizeTxHash(r.explorerTxId) || nodeTxpowHashFromActivityId(r.id);
      const rp = normalizeTxHash(r.pendingTxnId) || normalizeTxHash(r.txnId);
      if ((h && rh && rh === h) || (ptn && rp && rp === ptn)) return r;
    }
    return null;
  }

  function sendProgressSnapshot(row) {
    if (!row) return null;
    return {
      amt: Number(row.amt) || 0,
      ccy: String(row.ccy || ''),
      dir: String(row.dir || ''),
      address: String(row.address || ''),
      ts: Number(row.ts || 0)
    };
  }

  function sendProgressMatchSnapshot(snapshot, row) {
    if (!snapshot || !row || String(row.dir || '') !== 'out' || !row.minimaOnChain) return false;
    if (normalizeActivityCcyLabel(row.ccy) !== normalizeActivityCcyLabel(snapshot.ccy)) return false;
    const wantAmt = Math.abs(Number(snapshot.amt) || 0);
    const rowAmt = Math.abs(Number(row.amt) || 0);
    const tol = Math.max(1e-8, Math.max(wantAmt, rowAmt) * 0.000001);
    if (Math.abs(wantAmt - rowAmt) > tol) return false;
    const wantTs = Number(snapshot.ts || 0);
    const rowTs = Number(row.ts || 0);
    if (wantTs && rowTs && Math.abs(wantTs - rowTs) > (2 * 60 * 60 * 1000)) return false;
    if (snapshot.address && row.address && !activityAddressesOverlap(snapshot.address, row.address)) return false;
    return true;
  }

  function findConfirmedOutgoingReplacement(baseRow, snapshot) {
    const snap = snapshot || sendProgressSnapshot(baseRow);
    if (!snap) return null;
    let best = null;
    USER_ACTIVITY.forEach(function (r) {
      if (!r || r === baseRow) return;
      if (String(r.id || '').indexOf('NODE-') !== 0 && r.localOrigin === true) return;
      const matches = baseRow ? outgoingSendMatch(baseRow, r) : sendProgressMatchSnapshot(snap, r);
      if (!matches) return;
      if (!best || activityRowRank(r) > activityRowRank(best)) best = r;
    });
    return best;
  }

  window.stablesGetSendProgressById = function (id) {
    const latch = SEND_PROGRESS_LATCH[id] || { sent: false, mined: false, confirmed: false, confirmations: 0, txid: '', pendingTxnId: '', snapshot: null, target: 0 };
    let target = (Number(latch.target) >= 1) ? Number(latch.target) : CONFIRM_TARGET;
    const p = {
      found: false, failed: false,
      built: true, sent: false, mined: false, confirmed: false,
      confirmations: 0, target: target, txid: '', pendingTxnId: '',
      /* The row id is the stepper's stable timing key, and the row's own timestamp is the one
         moment any transaction can honestly be timed from (see stablesStepTimes). */
      rowId: String(id || ''), startedAt: 0
    };
    let row = window.stablesGetUserActivityRowById(id);
    // The optimistic send row gets superseded/merged into the node-synced row once it confirms, so the
    // original id can vanish mid-flight. Follow the transaction to its current row (by txpow / mempool
    // id we latched earlier) instead of resetting the stepper to the start.
    if (!row) row = findActivityRowByTxRef(latch.txid, latch.pendingTxnId);
    if (!row && latch.snapshot) row = findConfirmedOutgoingReplacement(null, latch.snapshot);
    if (row && row.localOrigin === true && row.dir === 'out' && String(row.status || '') !== 'Confirmed') {
      row = findConfirmedOutgoingReplacement(row, latch.snapshot) || row;
    }
    if (row) {
      p.found = true;
      p.startedAt = Number(row.ts) || 0;
      target = stablesGetConfirmTargetForRow(row);
      p.target = target;
      const st = String(row.status || '');
      p.failed = st === 'Failed';
      p.pendingTxnId = String(row.pendingTxnId || row.txnId || '').trim();
      const txHash = normalizeTxHash(row.explorerTxId) || nodeTxpowHashFromActivityId(row.id);
      const realConf = txConfirmations(row);            // null | 0 | >=1
      const confNow = (realConf == null) ? 0 : realConf;
      const block = Number(row.block || 0);
      const statusConfirmed = st === 'Confirmed';
      p.mined = !!(row.minimaOnChain && (txHash || block > 0)) || confNow > 0 || statusConfirmed || st === 'On-chain';
      p.sent = p.mined || !!p.pendingTxnId || st === 'Sending' || st === 'Broadcasted' || st === 'On-chain' || st === 'Confirmed';
      p.txid = (p.mined && isLikelyTxpowHash(txHash)) ? txHash : '';
      p.confirmed = !p.failed && (statusConfirmed || (p.mined && confNow >= target));
      p.confirmations = p.confirmed ? target : Math.max(0, Math.min(confNow, target));
    }
    // Monotonic latch: a send only ever moves forward. A transient missing row or a re-synced
    // confirmation count must never drag the stepper backwards (built -> sent -> mined -> confirmed).
    if (!p.failed) {
      p.sent = p.sent || latch.sent;
      p.mined = p.mined || latch.mined;
      p.confirmed = p.confirmed || latch.confirmed;
      if (p.confirmed) { p.sent = true; p.mined = true; }
      p.confirmations = Math.max(p.confirmations, Number(latch.confirmations) || 0);
      if (p.confirmed) p.confirmations = target;
      if (!p.txid && latch.txid) p.txid = latch.txid;
      if (!p.pendingTxnId && latch.pendingTxnId) p.pendingTxnId = latch.pendingTxnId;
      // Once we have any progress, keep reporting "found" so the modal never falls back to the seed.
      p.found = p.found || latch.sent || latch.mined || latch.confirmed;
    }
    SEND_PROGRESS_LATCH[id] = {
      sent: p.sent, mined: p.mined, confirmed: p.confirmed,
      confirmations: p.confirmations,
      txid: p.txid || latch.txid || '',
      pendingTxnId: p.pendingTxnId || latch.pendingTxnId || '',
      snapshot: row ? sendProgressSnapshot(row) : (latch.snapshot || null),
      target: target
    };
    return p;
  };

  const EXCHANGE_PAIR_ROWS = [
    ['USDw', 'EURw', 0.918],
    ['EURw', 'GBPw', 0.872],
    ['GBPw', 'USDw', 1.286],
    ['USDw', 'JPYw', 151.4],
    ['EURw', 'USDw', 1.089],
    ['USDw', 'CADw', 1.36],
    ['EURw', 'JPYw', 165.2],
    ['Winiwa', 'USDw', 0.00846],
    ['CNYw', 'USDw', 0.138],
    ['CHFw', 'EURw', 1.052]
  ];
  const DEMO_EXCHANGES = [];
  if (!DEMO_REAL) {
    for (let i = 0; i < 14; i++) {
      const [fromCcy, toCcy, rate] = EXCHANGE_PAIR_ROWS[i % EXCHANGE_PAIR_ROWS.length];
      const fromAmt = Number((42 + i * 23.17 + (i % 4) * 55).toFixed(2));
      const toAmt = Number((fromAmt * rate).toFixed(2));
      const dt = new Date(BASE_DATE.getTime() - (i * 33 * 60 * 60 * 1000));
      const dateText = dt.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
      const rateDec = rate < 0.02 ? 6 : 4;
      DEMO_EXCHANGES.push({
        id: `EX-${String(90001 + i)}`,
        fromCcy,
        toCcy,
        fromAmt,
        toAmt,
        rateLabel: `1 ${fromCcy} ≈ ${rate.toFixed(rateDec)} ${toCcy} (indicative)`,
        date: dateText,
        fee: 0,
        status: i % 17 === 0 ? 'Pending' : 'Confirmed',
        note: 'Instant conversion · demo preview'
      });
    }
  }

  function activitySource() {
    const src = DEMO_REAL ? USER_ACTIVITY : DEMO_ACTIVITY;
    if (String((window.STABLES_CONFIG || {}).APP_STAGE || '').toLowerCase() !== 'test') return src;
    return src.filter(function (r) { return !isNativeMinimaActivityRow(r); });
  }
  window.stablesGetUserActivityRows = function () {
    try { return activitySource().slice(); } catch (_) { return []; }
  };

  let activityFilter = 'all';
  let activityCcyFilter = 'all';
  let activitySearch = '';
  let activitySort = 'date_desc';
  let activityTimeframe = 'all';
  let activityPeriod = 'all';
  let activityDateFrom = '';
  let activityDateTo = '';
  let activityPage = 0;
  let selectedTxId = null;
  let selectedExchangeId = null;
  let selectedContactName = '';
  let chatContactName = '';
  const CONTACTS_BOOK = new Map(DEMO_CONTACTS.map(c => [c.name, { ...c, saved: false }]));
  const suspiciousTx = new Set(JSON.parse(localStorage.getItem(SUSPICIOUS_TX_KEY) || '[]'));
  const deletedTx = new Set(JSON.parse(localStorage.getItem(HIDDEN_TX_KEY) || '[]'));
  const hiddenTx = new Set(JSON.parse(localStorage.getItem(SOFT_HIDDEN_TX_KEY) || '[]'));
  const hiddenShops = new Set(JSON.parse(localStorage.getItem(HIDDEN_SHOPS_KEY) || '[]'));
  const contactNotes = JSON.parse(localStorage.getItem(CONTACT_NOTES_KEY) || '{}');
  const txNotes = JSON.parse(localStorage.getItem(TX_NOTES_KEY) || '{}');
  const DEFAULT_FAVORITES = DEMO_REAL ? [] : ['Alex', 'Maria', 'Sam'];
  const contactFavorites = new Set(
    localStorage.getItem(CONTACT_FAVORITES_KEY)
      ? JSON.parse(localStorage.getItem(CONTACT_FAVORITES_KEY))
      : DEFAULT_FAVORITES
  );
  const contactPaymentTiers = JSON.parse(localStorage.getItem(CONTACT_PAYMENT_TIER_KEY) || '{}');
  const merchantRatings = Array.isArray(JSON.parse(localStorage.getItem(MERCHANT_RATINGS_KEY) || '[]'))
    ? JSON.parse(localStorage.getItem(MERCHANT_RATINGS_KEY) || '[]')
    : [];
  const MERCHANT_RATING_MIN_SPEND_USD = 3;
  const MERCHANT_RATING_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h between edits per merchant+rater
  const MERCHANT_RATING_MAX_COMMENT = 240;
  let pendingMerchantRatingShop = '';
  let pendingMerchantValidationShop = '';

  /** Parsed JSON waiting for user to choose Replace vs Combine in the import modal. */
  let pendingConfigImportPayload = null;

  function persistSuspicious() { localStorage.setItem(SUSPICIOUS_TX_KEY, JSON.stringify(Array.from(suspiciousTx))); }
  function persistHiddenTx() { localStorage.setItem(HIDDEN_TX_KEY, JSON.stringify(Array.from(deletedTx))); }
  function persistSoftHidden() { localStorage.setItem(SOFT_HIDDEN_TX_KEY, JSON.stringify(Array.from(hiddenTx))); }
  function persistHiddenShops() { localStorage.setItem(HIDDEN_SHOPS_KEY, JSON.stringify(Array.from(hiddenShops))); }
  function persistNotes() { localStorage.setItem(CONTACT_NOTES_KEY, JSON.stringify(contactNotes)); }
  function persistTxNotes() { localStorage.setItem(TX_NOTES_KEY, JSON.stringify(txNotes)); }
  function persistFavorites() { localStorage.setItem(CONTACT_FAVORITES_KEY, JSON.stringify(Array.from(contactFavorites))); }
  function persistContactPaymentTiers() { localStorage.setItem(CONTACT_PAYMENT_TIER_KEY, JSON.stringify(contactPaymentTiers)); }

  function normalizeContactAddrKey(addr) {
    const s = String(addr || '').trim();
    const mx = s.match(/Mx[A-Za-z0-9]{20,}/i);
    if (mx) return mx[0];
    const hx = s.match(/0x[0-9A-Fa-f]{40,}/i);
    if (hx) return hx[0];
    return s.toLowerCase();
  }

  function normalizePaymentTier(tier) {
    if (window.StablesPaymentSecurity && typeof window.StablesPaymentSecurity.normalizeContactTier === 'function') {
      return window.StablesPaymentSecurity.normalizeContactTier(tier);
    }
    const t = String(tier || 'inherit').toLowerCase();
    return ['inherit', 'quick', 'standard', 'protected'].includes(t) ? t : 'inherit';
  }

  /* Address book, read-only, for other surfaces (the chat merges these so every saved contact
     shows up there too — founder 2026-08-10). Name + Minima address only; the chat holds its own
     encryption key per contact. */
  window.stablesGetAddressBook = function () {
    return Array.from(CONTACTS_BOOK.values()).map(function (c) {
      return { name: c.name, mx: c.address || '', category: c.category || '' };
    });
  };
  window.stablesLookupContactForSend = function (rawTo) {
    const raw = String(rawTo || '').trim();
    if (!raw) return null;
    const all = Array.from(CONTACTS_BOOK.values());
    for (let i = 0; i < all.length; i++) {
      const c = all[i];
      if (raw === c.name || raw.includes(c.address)) return c;
      if (raw.indexOf(c.name + ' ·') === 0 || raw.indexOf(c.name + '·') === 0) return c;
    }
    const key = normalizeContactAddrKey(raw);
    for (let j = 0; j < all.length; j++) {
      if (normalizeContactAddrKey(all[j].address) === key) return all[j];
    }
    return null;
  };

  window.stablesResolveSendContactTier = function (rawTo) {
    const c = window.stablesLookupContactForSend(rawTo);
    if (!c) return 'inherit';
    const key = normalizeContactAddrKey(c.address);
    if (contactPaymentTiers[key]) return normalizePaymentTier(contactPaymentTiers[key]);
    if (c.paymentTier) return normalizePaymentTier(c.paymentTier);
    return 'inherit';
  };

  window.stablesGetContactPaymentTier = function (name) {
    const c = CONTACTS_BOOK.get(name);
    if (!c) return 'inherit';
    const key = normalizeContactAddrKey(c.address);
    return normalizePaymentTier(contactPaymentTiers[key] || c.paymentTier || 'inherit');
  };

  window.stablesSetContactPaymentTier = function (name, tier) {
    const c = CONTACTS_BOOK.get(name);
    if (!c) return;
    const key = normalizeContactAddrKey(c.address);
    const t = normalizePaymentTier(tier);
    contactPaymentTiers[key] = t;
    c.paymentTier = t;
    persistContactPaymentTiers();
  };

  function paymentTierChipSuffix(tier) {
    const t = normalizePaymentTier(tier);
    if (t === 'protected') return ' 🛡';
    if (t === 'quick') return ' ⚡';
    return '';
  }
  function persistMerchantRatings() { localStorage.setItem(MERCHANT_RATINGS_KEY, JSON.stringify(merchantRatings)); }
  function getTxById(id) {
    const raw = String(id || '');
    const direct = activitySource().find(x => String(x.id || '') === raw);
    if (direct) return direct;
    const cleanRawHash = nodeTxpowHashFromActivityId(raw) || raw;
    const key = normalizeTxHash(cleanRawHash);
    if (!key) return null;
    return activitySource().find(function (x) {
      if (!x) return false;
      const fromId = normalizeTxHash(x.id);
      const fromNodeId = nodeTxpowHashFromActivityId(x.id);
      const fromExplorer = normalizeTxHash(x.explorerTxId);
      const fromPending = normalizeTxHash(x.pendingTxnId);
      const fromTxn = normalizeTxHash(x.txnId);
      return (fromId && fromId === key)
        || (fromNodeId && fromNodeId === key)
        || (fromExplorer && fromExplorer === key)
        || (fromPending && fromPending === key)
        || (fromTxn && fromTxn === key);
    }) || null;
  }
  function getExchangeById(id) { return DEMO_EXCHANGES.find(x => x.id === id); }
  function getExplorerBaseUrl() {
    const raw = (window.STABLES_CONFIG && window.STABLES_CONFIG.MINIMA_EXPLORER_TX_BASE_URL) || '';
    const fallback = 'https://explorer.minima.global/search?q=';
    return String(raw || fallback).trim();
  }
  function toDemoTradeId(txId) {
    const n = parseInt(String(txId || '').replace(/[^\d]/g, ''), 10) || 1;
    return '0x' + n.toString(16).padStart(64, '0');
  }
  function txExplorerUrl(tx) {
    const base = getExplorerBaseUrl();
    const mined = tx ? (normalizeTxHash(tx.explorerTxId) || nodeTxpowHashFromActivityId(tx.id)) : '';
    const id = encodeURIComponent(String(mined || tx?.pendingTxnId || tx?.id || ''));
    return `${base}${id}`;
  }
  function getTxNote(tx) {
    if (!tx || !tx.id) return '';
    const saved = String(txNotes[tx.id] || '').trim();
    if (saved) return saved;
    return String(tx.note || '').trim();
  }

  function findMinedActivityRowForDetail(tx) {
    if (!tx || !tx.minimaOnChain) return null;
    const ownHash = normalizeTxHash(tx.explorerTxId) || nodeTxpowHashFromActivityId(tx.id);
    if (ownHash) return tx;
    const pending = normalizeTxHash(tx.pendingTxnId) || normalizeTxHash(tx.txnId);
    const txTs = Number(tx.ts || 0);
    const txAmt = Math.abs(Number(tx.amt) || 0);
    const txSign = Number(tx.amt) >= 0 ? 1 : -1;
    const rows = activitySource();
    let best = null;
    rows.forEach(function (r) {
      if (!r || r === tx || !r.minimaOnChain || r.localOrigin === true) return;
      const hash = normalizeTxHash(r.explorerTxId) || nodeTxpowHashFromActivityId(r.id);
      if (!hash) return;
      if (pending) {
        const rPending = normalizeTxHash(r.pendingTxnId) || normalizeTxHash(r.txnId);
        if (rPending && rPending === pending) {
          best = r;
          return;
        }
      }
      if (String(r.ccy || '') !== String(tx.ccy || '')) return;
      if ((Number(r.amt) >= 0 ? 1 : -1) !== txSign) return;
      const amtDelta = Math.abs(Math.abs(Number(r.amt) || 0) - txAmt);
      const amtTol = Math.max(1e-6, txAmt * 0.000001);
      if (amtDelta > amtTol) return;
      const rTs = Number(r.ts || 0);
      if (txTs && rTs && Math.abs(rTs - txTs) > 20 * 60 * 1000) return;
      if (!best || Number(r.block || 0) > Number(best.block || 0)) best = r;
    });
    return best;
  }

  function rowLooksLikeMinedWithoutTxpow(row) {
    return !!(row && row.minimaOnChain
      && Number(row.block || 0) > 0
      && !(normalizeTxHash(row.explorerTxId) || nodeTxpowHashFromActivityId(row.id)));
  }

  function rowMatchesHistoryTxpowCandidate(row, txpow, walletRows) {
    if (!row || !txpow || !txpow.txpowid || !Array.isArray(walletRows) || !walletRows.length) return false;
    const rowBlock = Number(row.block || 0);
    const txBlock = txpowMinedBlock(txpow);
    if (rowBlock && txBlock && rowBlock !== txBlock) return false;
    const rowAmt = Math.abs(Number(row.amt) || 0);
    const rowDir = String(row.dir || '');
    const rowCcy = normalizeActivityCcyLabel(row.ccy);
    return walletRows.some(function (r) {
      if (!r) return false;
      if (String(r.dir || '') !== rowDir) return false;
      if (normalizeActivityCcyLabel(r.ccy) !== rowCcy) return false;
      const candAmt = Math.abs(Number(r.amt) || 0);
      const tol = Math.max(1e-6, Math.max(rowAmt, candAmt) * 0.000001);
      return Math.abs(candAmt - rowAmt) <= tol;
    });
  }

  async function resolveMinedTxpowForDetailRow(row) {
    if (!rowLooksLikeMinedWithoutTxpow(row)) return '';
    const canRpc = !!(typeof window.stablesGetRpcConfig === 'function'
      && window.stablesGetRpcConfig()
      && typeof window.stablesRpcSendCommand === 'function');
    const canMds = !!(typeof window.MDS !== 'undefined' && window.MDS && window.MDS.cmd);
    if (!canRpc && !canMds) return '';
    try {
      const resp = await mdsCommand('history max:160');
      if (!mdsOk(resp)) return '';
      const payload = coerceMdsPayloadLocal(resp.response);
      const txpows = Array.isArray(payload && payload.txpows) ? payload.txpows
        : Array.isArray(payload) ? payload
        : Array.isArray(payload && payload.history) ? payload.history
        : [];
      for (let i = 0; i < txpows.length; i++) {
        let tp = txpows[i];
        if (!tp || !tp.txpowid) continue;
        if (!txpowHasBody(tp)) {
          const full = await loadTxpowById(tp.txpowid);
          if (full) tp = full;
        }
        const rows = await rowsFromLiveTxpow(tp);
        if (!rowMatchesHistoryTxpowCandidate(row, tp, rows)) continue;
        const id = normalizeTxHash(tp.txpowid);
        if (!id) continue;
        row.explorerTxId = id;
        row.id = 'NODE-' + id + ':' + String(row.ccy || '').toLowerCase();
        persistUserActivityToStorage();
        refreshSettlingActivityUi();
        return id;
      }
    } catch (_) { /* best-effort */ }
    return '';
  }

  function followSelectedTxReplacement(droppedRow, replacementRow) {
    if (!droppedRow || !replacementRow || !selectedTxId) return;
    if (String(selectedTxId) !== String(droppedRow.id)) return;
    selectedTxId = replacementRow.id;
  }

  function upsertUserActivityRows(rows) {
    if (!DEMO_REAL || !Array.isArray(rows) || !rows.length) return 0;
    const byId = new Map(USER_ACTIVITY.map(row => [String(row.id || ''), row]));
    let changed = 0;
    rows.forEach(row => {
      if (!row || !row.id) return;
      if (isPhantomTestChannelActivityRow(row)) { stablesTraceIncomingDrop('upsert-phantom', row); return; }
      if (isNativeMinimaActivityRow(row)) { stablesTraceIncomingDrop('upsert-native', row); return; }
      normalizeActivityRowAmount(row);
      /* A row's note is what the person reads about a failure. The node's wording ("TxPoW size
         too large.. 95243/65536") is rewritten once, centrally, with the unit it omitted (founder
         2026-09-03: "when we say size too large, we should mention the measure used"). */
      if (row.note && typeof window.stablesHumanNodeError === 'function') {
        try { const h = window.stablesHumanNodeError(row.note); if (h && h.text) row.note = h.text; } catch (_) { /* keep the raw note */ }
      }
      const id = String(row.id);
      // De-duplicate by the on-chain transaction id: when a node row NODE-<txpowid> arrives, drop any
      // OTHER existing row that represents the same transaction, whatever its id prefix. This covers an
      // optimistic local send row (id MINIMA-<ts> or NODE-<sendid>) whose explorerTxId is the txpowid,
      // so a single send never shows twice (once pending, once confirmed).
      if (id.indexOf('NODE-') === 0) {
        const txpid = nodeTxpowHashFromActivityId(id);
        const legSuffix = id.indexOf(':') >= 0 ? id.slice(id.indexOf(':')) : '';
        const normId = txpid ? ('NODE-' + txpid + legSuffix) : id;
        row.id = normId;
        if (row.explorerTxId) row.explorerTxId = txpid || row.explorerTxId;
        const rowTxnId = normalizeTxHash(row.txnId);
        for (let i = USER_ACTIVITY.length - 1; i >= 0; i--) {
          const r = USER_ACTIVITY[i];
          if (!r) continue;
          if (String(r.id) === normId) continue;
          const rTxid = normalizeTxHash(r.explorerTxId ||
            (String(r.id).indexOf('NODE-') === 0 ? nodeTxpowHashFromActivityId(r.id) : ''));
          const rPending = normalizeTxHash(r.pendingTxnId);
          let drop = false;
          if (rTxid && txpid && rTxid === txpid) {
            if (activityRowsSameEconomicLeg(r, row)) {
              drop = true;
            } else if (faucetClaimMergeSourceRow(r) && row.dir === 'in' && row.ccy === 'Winiwa') {
              drop = true;
              Object.assign(row, {
                title: r.title || row.title,
                counterparty: r.counterparty || row.counterparty,
                note: r.note || row.note,
                localOrigin: true,
              });
            } else if (!activityRowLegSuffix(r.id) && activityRowLegSuffix(row.id)
              && r.dir === row.dir && r.ccy === row.ccy) {
              drop = true;
            }
          } else if (faucetClaimMergeSourceRow(r) && row.dir === 'in' && row.ccy === 'Winiwa'
            // Without a txid/pending correlation, only absorb the node twin of a LOCAL optimistic
            // faucet pour with the same amount close in time. The previous unconditional match
            // rebranded (or swallowed) every plain wallet-to-wallet Winiwa receive as a faucet claim.
            && isFaucetPourLocalRow(r)
            && Math.abs(Math.abs(Number(r.amt) || 0) - Math.abs(Number(row.amt) || 0)) < 0.000001
            && Math.abs(Number(r.ts || 0) - Number(row.ts || 0)) < 15 * 60 * 1000) {
            drop = true;
            Object.assign(row, {
              title: r.title || row.title,
              counterparty: r.counterparty || row.counterparty,
              note: r.note || row.note,
              localOrigin: true,
            });
          } else if (rPending && rowTxnId && rPending === rowTxnId) {
            if (r.dir === 'in' && row.dir === 'out') {
              drop = false;
            } else if (faucetClaimMergeSourceRow(r) && row.dir === 'in') {
              drop = true;
              Object.assign(row, {
                title: r.title || row.title,
                counterparty: r.counterparty || row.counterparty,
                note: r.note || row.note,
                localOrigin: true,
              });
            } else {
              drop = true;
              if (r.localOrigin && r.dir === 'in' && row.dir === 'in' && txpid) {
                row.explorerTxId = txpid;
                row.dir = 'in';
                row.status = isActivityUnsettledStatus(row.status) ? 'Confirmed' : row.status;
                row.title = r.title || row.title;
                row.counterparty = r.counterparty || row.counterparty;
                row.note = r.note || row.note;
                row.localOrigin = true;
              }
            }
          } else if (outgoingSendMatch(r, row)) {
            drop = true;
          } else if (incomingReceiveMatch(r, row)) {
            drop = true;
            // Carry the optimistic row's friendlier framing (e.g. "Minted USDw" / "Protocol (USDw)")
            // onto the surviving node row so the merge keeps context instead of a bare "Received".
            if (r.localOrigin) {
              row.title = r.title || row.title;
              row.counterparty = r.counterparty || row.counterparty;
              row.note = r.note || row.note;
              row.localOrigin = true;
            }
          }
          if (drop) {
            carryConfirmStamp(r, row);
            followSelectedTxReplacement(r, row);
            USER_ACTIVITY.splice(i, 1);
            byId.delete(String(r.id));
          }
        }
      }
      const upsertId = String(row.id);
      if (byId.has(upsertId)) {
        const existingRow = byId.get(upsertId);
        // First stamp wins: never let a re-synced node row retarget an already-stamped row.
        const keepStamp = parseInt(existingRow.confirmTarget, 10);
        if (Number.isFinite(keepStamp) && keepStamp >= 1 && keepStamp <= 30) {
          row.confirmTarget = existingRow.confirmTarget;
          if (existingRow.confirmPolicyLabel !== undefined) row.confirmPolicyLabel = existingRow.confirmPolicyLabel;
          if (existingRow.confirmFiatValue !== undefined) row.confirmFiatValue = existingRow.confirmFiatValue;
        }
        Object.assign(existingRow, row);
        if (existingRow.minimaOnChain) stablesStampConfirmPolicyOnRow(existingRow);
      } else {
        // Update-only for partial payloads: a status/txid upsert whose original row was
        // adopted into a node row must NOT resurrect it as a bare row (renders "+0" /
        // "undefined" ghosts — proven in the v74 mint trace). A legitimate creation always
        // carries an amount and a currency.
        const hasAmt = Number.isFinite(Number(row.amt)) && Number(row.amt) !== 0;
        if (!hasAmt && !row.ccy) { stablesTraceIncomingDrop('upsert-miss-partial', row); return; }
        if (row.minimaOnChain) stablesStampConfirmPolicyOnRow(row);
        USER_ACTIVITY.unshift(row);
        byId.set(upsertId, row);
      }
      changed++;
    });
    reconcileActivityDuplicates();
    if (USER_ACTIVITY.length > 500) USER_ACTIVITY.length = 500;
    if (finalizeSettledActivityRows()) changed++;
    persistUserActivityToStorage();
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
    if (typeof updateGlobalUI === 'function') updateGlobalUI();
    return changed;
  }
  window.stablesUpsertUserActivityRows = upsertUserActivityRows;

  /**
   * Is this row waiting on a PERSON rather than on the chain?
   *
   * The settlement watchers ask the node "did this transaction land yet" and, when it has not, mark
   * the row failed. That is right for a transaction that was posted and went nowhere, and wrong for
   * one Minima has queued for approval: it has not landed because it has not been SIGNED yet, and
   * calling that a failure is how an action awaiting the person's own approval reported itself as
   * failed while the approval was still sitting in front of them (founder, 2026-09-02).
   */
  window.stablesActivityRowAwaitingApproval = function (rowId) {
    const id = String(rowId || '');
    if (!id) return false;
    for (let i = 0; i < USER_ACTIVITY.length; i++) {
      const r = USER_ACTIVITY[i];
      if (r && String(r.id) === id) return r.awaitingApproval === true;
    }
    return false;
  };

  function coerceMdsPayloadLocal(payload) {
    try {
      if (typeof window.stablesCoerceMdsPayload === 'function') return window.stablesCoerceMdsPayload(payload);
      if (typeof payload === 'string') {
        const s = payload.trim();
        if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) return JSON.parse(s);
      }
    } catch (_) { /* ignore */ }
    return payload;
  }

  function mdsOk(resp) {
    if (typeof window.stablesMdsCmdOk === 'function') return window.stablesMdsCmdOk(resp);
    return !!(resp && (resp.status === true || resp.status === 'true' || resp.success === true));
  }

  function mdsCommand(command) {
    return new Promise((resolve) => {
      try {
        const rpcCfg = typeof window.stablesGetRpcConfig === 'function' ? window.stablesGetRpcConfig() : null;
        if (rpcCfg && typeof window.stablesRpcSendCommand === 'function') {
          window.stablesRpcSendCommand(command).then(resolve).catch(function () { resolve(null); });
          return;
        }
        if (typeof window.MDS === 'undefined' || !window.MDS || !window.MDS.cmd) {
          resolve(null);
          return;
        }
        window.MDS.cmd(command, function (resp) { resolve(resp); });
      } catch (_) { resolve(null); }
    });
  }

  async function findRecentTxpowByTxnId(pendingTxnId) {
    const want = normalizeTxHash(pendingTxnId);
    if (!want) return null;
    const historyCmds = ['history max:120', 'history max:300 offset:0', 'history max:500', 'history'];
    for (let i = 0; i < historyCmds.length; i++) {
      const resp = await mdsCommand(historyCmds[i]);
      if (!mdsOk(resp)) continue;
      const payload = coerceMdsPayloadLocal(resp.response);
      const txpows = Array.isArray(payload && payload.txpows) ? payload.txpows
        : Array.isArray(payload) ? payload
        : Array.isArray(payload && payload.history) ? payload.history
        : [];
      for (let h = 0; h < txpows.length; h++) {
        let tp = txpows[h];
        if (!tp || !tp.txpowid) continue;
        const tid = txpowTxnId(tp);
        if (tid && tid === want) return tp;
        const id = normalizeTxHash(tp.txpowid);
        if (id) {
          const full = await loadTxpowById(id);
          if (full && txpowTxnId(full) === want) return full;
        }
      }
    }
    return null;
  }

  function historyTxpowsFromPayload(payload) {
    return Array.isArray(payload && payload.txpows) ? payload.txpows
      : Array.isArray(payload) ? payload
      : Array.isArray(payload && payload.history) ? payload.history
      : Array.isArray(payload && payload.transactions) ? payload.transactions
      : [];
  }

  function outgoingRowMatchesCandidate(baseRow, candidateRow) {
    if (!baseRow || !candidateRow) return false;
    if (String(candidateRow.dir || '') !== 'out') return false;
    if (normalizeActivityCcyLabel(candidateRow.ccy) !== normalizeActivityCcyLabel(baseRow.ccy)) return false;
    const baseAmt = Math.abs(Number(baseRow.amt) || 0);
    const candAmt = Math.abs(Number(candidateRow.amt) || 0);
    const tol = Math.max(1e-8, Math.max(baseAmt, candAmt) * 0.000001);
    if (Math.abs(baseAmt - candAmt) > tol) return false;
    const baseTs = Number(baseRow.ts || 0);
    const candTs = Number(candidateRow.ts || 0);
    if (baseTs && candTs && candTs < baseTs - (10 * 60 * 1000)) return false;
    if (baseTs && candTs && candTs > baseTs + (2 * 60 * 60 * 1000)) return false;
    return true;
  }

  async function findRecentOutgoingTxpowByActivityRow(rowId) {
    const baseRow = window.stablesGetUserActivityRowById(rowId);
    if (!baseRow || String(baseRow.dir || '') !== 'out') return null;
    const historyCmds = ['history max:80', 'history max:160 offset:0', 'history max:300'];
    let txpows = [];
    for (let i = 0; i < historyCmds.length && !txpows.length; i++) {
      const resp = await mdsCommand(historyCmds[i]);
      if (!mdsOk(resp)) continue;
      txpows = historyTxpowsFromPayload(coerceMdsPayloadLocal(resp.response));
    }
    if (!txpows.length) return null;
    const hydrated = [];
    const limit = Math.min(txpows.length, 80);
    for (let i = 0; i < limit; i++) {
      const tp = txpows[i];
      if (!tp || !tp.txpowid) continue;
      const full = txpowHasBody(tp) ? tp : await hydrateTxpowForLiveIngest(tp);
      if (full && txpowHasBody(full)) hydrated.push(full);
    }
    if (!hydrated.length) return null;
    const walletCtx = await buildWalletContext(hydrated);
    if (!walletCtx || (!walletCtx.addresses.size && !walletCtx.ownedCoinIds.size && !walletCtx.publicKeys.size)) return null;
    const tokenMap = liveTokenMapFromConfig();
    for (let i = 0; i < hydrated.length; i++) {
      const tp = hydrated[i];
      if (!txpowMinedBlock(tp)) continue;
      const rows = markLiveRowsByBlockState(txpowBodyToUserRows(tp, walletCtx, tokenMap), tp);
      if (rows.some(function (row) { return outgoingRowMatchesCandidate(baseRow, row); })) {
        return { txpow: tp, rows: rows };
      }
    }
    return null;
  }

  window.stablesTrackOutgoingSendSettlement = function stablesTrackOutgoingSendSettlement(rowId, pendingTxnId, options) {
    // Phase 2 rebuild (v70): retired — tx-mirror.js adopts the optimistic send row when the
    // transaction appears in node history and owns its confirmation ladder from there.
    if (true) return;
  };

  function collectObjectsDeep(obj, out, depth) {
    if (depth > 10 || obj == null) return;
    if (Array.isArray(obj)) {
      obj.forEach(item => collectObjectsDeep(item, out, depth + 1));
      return;
    }
    if (typeof obj !== 'object') return;
    out.push(obj);
    Object.keys(obj).forEach(k => collectObjectsDeep(obj[k], out, depth + 1));
  }

  // A Minima token name can be a nested object: a coin carries `token: { name: { name, description } }`,
  // so a naive String() yields "[object Object]". Recursively unwrap to the plain string.
  function tokenNameString(v) {
    if (v == null) return '';
    if (typeof v === 'string') {
      const s = v.trim();
      // A row whose name was String()'d from a nested object in an older build is the literal
      // "[object Object]" - never a real token name, so treat it as unknown (fall back to tokenId).
      return /\[object\s+\w+\]/i.test(s) ? '' : s;
    }
    if (typeof v === 'object') {
      return tokenNameString(v.name) || tokenNameString(v.ticker) || tokenNameString(v.token) || '';
    }
    return String(v).trim();
  }

  function tokenLabelFromRow(row) {
    if (!row || typeof row !== 'object') return 'MINIMA';
    const tokenId = String(row.tokenid != null ? row.tokenid : (row.tokenId != null ? row.tokenId : '')).toLowerCase();
    if (tokenId === '0x00' || tokenId === '0x0' || tokenId === '0') return 'MINIMA';
    // Prefer the live config map by tokenId - it is authoritative and immune to a corrupted name field.
    if (tokenId) {
      const mapped = liveTokenMapFromConfig()[tokenId];
      if (mapped) return mapped;
    }
    const raw = (tokenNameString(row.token) || tokenNameString(row.tokenname) || tokenNameString(row.name)
      || tokenNameString(row.ticker) || tokenNameString(row.currency) || tokenId || 'Token').trim();
    const compact = raw.replace(/\s+/g, '').toLowerCase();
    if (compact === 'xminima' || compact === 'xwiniwa') return 'xWiniwa';
    if (compact.includes('coverage') || compact.includes('usdwcf')) return 'USDwcf';
    if (compact.includes('winiwa') && !compact.includes('x')) return 'Winiwa';
    const stable = raw.match(/\b[A-Z]{2,6}w\b/);
    if (stable) return stable[0];
    return raw;
  }

  function isMinimaTokenId(tokenId) {
    if (tokenId == null || tokenId === '') return true;
    const t = String(tokenId).trim().toLowerCase();
    return t === '0x00' || t === '0x0' || t === '0' || /^0x0+$/.test(t);
  }

  function isNativeMinimaActivityRow(r) {
    return !!(r && normalizeActivityCcyLabel(r.ccy) === 'MINIMA');
  }

  function pruneNativeMinimaActivityRows() {
    if (String((window.STABLES_CONFIG || {}).APP_STAGE || '').toLowerCase() !== 'test') return;
    USER_ACTIVITY = USER_ACTIVITY.filter(function (r) {
      return !isNativeMinimaActivityRow(r);
    });
  }

  function isAllowedTestActivityCcy(ccy) {
    const c = normalizeActivityCcyLabel(ccy);
    return c === 'Winiwa' || c === 'USDw' || c === 'xWiniwa';
  }

  function pruneNonStablesTestTokenNodeRows() {
    if (String((window.STABLES_CONFIG || {}).APP_STAGE || '').toLowerCase() !== 'test') return;
    USER_ACTIVITY = USER_ACTIVITY.filter(function (r) {
      if (!r || !r.minimaOnChain) return true;
      if (isAllowedTestActivityCcy(r.ccy)) return true;
      return false;
    });
  }

  function minimaCoinsOnly(coins) {
    if (!Array.isArray(coins)) return [];
    return coins.filter(c => c && isMinimaTokenId(c.tokenid != null ? c.tokenid : c.tokenId));
  }

  function sumMinimaCoins(coins) {
    return minimaCoinsOnly(coins).reduce((acc, c) => {
      const v = parseFloat(String(c.amount || c.value || 0).replace(/,/g, ''));
      return acc + (Number.isFinite(v) ? v : 0);
    }, 0);
  }

  function testChannelTokenIdSet() {
    const cfg = window.STABLES_CONFIG || {};
    if (cfg.APP_STAGE !== 'test') return null;
    const reg = cfg.TEST_TOKEN_REGISTRY || {};
    const set = new Set();
    [reg.winiwa_token_id, reg.usdw_token_id, reg.xwiniwa_token_id].forEach(function (id) {
      const s = String(id || '').trim().toLowerCase();
      if (s) set.add(s);
    });
    return set.size ? set : null;
  }

  function coinTokenId(c) {
    return String(c && (c.tokenid != null ? c.tokenid : c.tokenId != null ? c.tokenId : '')).toLowerCase();
  }

  function activityCoinsForWallet(coins) {
    if (!Array.isArray(coins)) return [];
    const testIds = testChannelTokenIdSet();
    if (!testIds) return minimaCoinsOnly(coins);
    return coins.filter(function (c) {
      if (!c) return false;
      const tid = coinTokenId(c);
      return testIds.has(tid);
    });
  }

  function coinActivityAmount(c) {
    const tid = coinTokenId(c);
    const raw = isMinimaTokenId(tid)
      ? (c.amount || c.value || 0)
      : (c.tokenamount != null ? c.tokenamount : (c.amount || c.value || 0));
    const v = parseFloat(String(raw).replace(/,/g, ''));
    return Number.isFinite(v) ? v : 0;
  }

  function sumActivityCoins(coins) {
    return activityCoinsForWallet(coins).reduce(function (acc, c) {
      return acc + coinActivityAmount(c);
    }, 0);
  }

  function txStateValue(txn, port) {
    const states = Array.isArray(txn && txn.state) ? txn.state : [];
    for (let i = 0; i < states.length; i++) {
      const s = states[i] || {};
      if (String(s.port) === String(port)) return String(s.data || '').trim();
    }
    return '';
  }

  function dominantActivityCcy(coins) {
    const list = activityCoinsForWallet(coins);
    const nonMinima = list.filter(function (c) { return !isMinimaTokenId(coinTokenId(c)); });
    if (!nonMinima.length) return 'MINIMA';
    const reg = (window.STABLES_CONFIG || {}).TEST_TOKEN_REGISTRY || {};
    const tid = coinTokenId(nonMinima[0]);
    if (tid === String(reg.winiwa_token_id || '').toLowerCase()) return 'Winiwa';
    if (tid === String(reg.usdw_token_id || '').toLowerCase()) return 'USDw';
    if (tid === String(reg.xwiniwa_token_id || '').toLowerCase()) return 'xWiniwa';
    return tokenLabelFromRow(nonMinima[0]);
  }

  function nodeTxpowHashFromActivityId(id) {
    const raw = String(id || '');
    if (raw.indexOf('NODE-') !== 0) return '';
    const body = raw.slice(5);
    const colon = body.indexOf(':');
    return normalizeTxHash(colon >= 0 ? body.slice(0, colon) : body);
  }

  function txpowTxnId(tp) {
    const txn = (tp && tp.body && (tp.body.txn || tp.body.transaction)) || {};
    return normalizeTxHash(txn.transactionid || txn.txid || '');
  }

  function activityRowPendingTxLookupKey(r) {
    if (!r) return '';
    const mined = rowMinedTxpowKey(r);
    if (mined) return mined;
    const fromPending = normalizeTxHash(r.pendingTxnId);
    const fromTxn = normalizeTxHash(r.txnId);
    return fromPending || fromTxn || '';
  }

  function activityRowLegSuffix(id) {
    const raw = String(id || '');
    if (raw.indexOf('NODE-') !== 0) return '';
    const colon = raw.indexOf(':');
    return colon >= 0 ? raw.slice(colon) : '';
  }

  function activityRowsSameEconomicLeg(existing, incoming) {
    if (!existing || !incoming) return false;
    const legA = activityRowLegSuffix(existing.id);
    const legB = activityRowLegSuffix(incoming.id);
    if (legA && legB) return legA === legB;
    if (!legA && !legB) {
      return (existing.dir || '') === (incoming.dir || '')
        && (existing.ccy || '') === (incoming.ccy || '');
    }
    return false;
  }

  function isFaucetPourLocalRow(r) {
    const id = String(r && r.id || '');
    return id.indexOf('FAUCET-POUR-') === 0
      || id.indexOf('FAUCET-IN-') === 0;
  }

  function nodeActivityLegId(txpowid, leg) {
    const h = normalizeTxHash(txpowid);
    if (!h) return '';
    return leg ? ('NODE-' + h + ':' + leg) : nodeActivityId(h);
  }

  function faucetCovenantConfig() {
    const cfg = window.STABLES_CONFIG || {};
    if (String(cfg.APP_STAGE || '').toLowerCase() !== 'test') return null;
    if (String(cfg.TEST_FAUCET_MODE || '').toLowerCase() !== 'covenant') return null;
    const cov = String(cfg.TEST_FAUCET_COVENANT_ADDRESS || '').trim().toLowerCase();
    const winId = String((cfg.TEST_TOKEN_REGISTRY || {}).winiwa_token_id || '').trim().toLowerCase();
    if (!cov || !winId) return null;
    return { covenant: cov, winiwaTokenId: winId };
  }

  function faucetCovenantAddresses() {
    const fac = faucetCovenantConfig();
    if (!fac) return new Set();
    const cfg = window.STABLES_CONFIG || {};
    const reg = cfg.TEST_TOKEN_REGISTRY || {};
    const set = new Set([fac.covenant]);
    [cfg.TEST_FAUCET_COVENANT_MINIADDRESS, reg.faucet_covenant_miniaddress].forEach(function (mx) {
      const s = String(mx || '').trim().toLowerCase();
      if (s) set.add(s);
    });
    return set;
  }

  function mintBurnCovenantConfig() {
    const cfg = window.STABLES_CONFIG || {};
    if (String(cfg.APP_STAGE || '').toLowerCase() !== 'test') return null;
    if (String(cfg.TEST_MINT_BURN_MODE || '').toLowerCase() !== 'covenant') return null;
    const cov = String(cfg.TEST_MINT_BURN_COVENANT_ADDRESS || '').trim().toLowerCase();
    const reg = cfg.TEST_TOKEN_REGISTRY || {};
    const winId = String(reg.winiwa_token_id || '').trim().toLowerCase();
    const usdId = String(reg.usdw_token_id || '').trim().toLowerCase();
    if (!cov || !winId || !usdId) return null;
    return { covenant: cov, winiwaTokenId: winId, usdwTokenId: usdId };
  }

  function mintBurnCovenantAddresses() {
    const mb = mintBurnCovenantConfig();
    if (!mb) return new Set();
    const cfg = window.STABLES_CONFIG || {};
    const reg = cfg.TEST_TOKEN_REGISTRY || {};
    const set = new Set([mb.covenant]);
    [reg.pool_miniaddress].forEach(function (mx) {
      const s = String(mx || '').trim().toLowerCase();
      if (s) set.add(s);
    });
    return set;
  }

  /** Issuer, pool, and covenant — tracked on mainnet but never the user's wallet. */
  function testInfraAddresses() {
    const cfg = window.STABLES_CONFIG || {};
    if (String(cfg.APP_STAGE || '').toLowerCase() !== 'test') return new Set();
    const reg = cfg.TEST_TOKEN_REGISTRY || {};
    const set = faucetCovenantAddresses();
    // The mint/burn covenant is wallet-tracked on this node but is NOT the user's wallet. Excluding it
    // (like the faucet covenant, pool, and issuer) lets mint/burn legs compute a real user-side delta
    // instead of netting to zero, so mint and burn transactions are attributed and shown.
    mintBurnCovenantAddresses().forEach(function (a) { if (a) set.add(a); });
    [
      reg.pool_miniaddress,
      reg.issuer_miniaddress,
      cfg.TEST_FAUCET_COVENANT_ADDRESS,
      reg.faucet_covenant_address,
      cfg.TEST_MINT_BURN_COVENANT_ADDRESS,
      cfg.TEST_XWINIWA_COVENANT_ADDRESS,
      cfg.TEST_XWINIWA_COVENANT_MINIADDRESS,
      reg.xwiniwa_covenant_address,
      reg.xwiniwa_covenant_miniaddress,
      cfg.TEST_GENESIS3_PROD_FAUCET_ADDRESS,
    ].forEach(function (v) {
      const s = String(v || '').trim().toLowerCase();
      if (s) set.add(s);
      const h = normalizeTxHash(s);
      if (h) set.add(h);
    });
    // GENESIS-3 covenant addresses (self-maintaining: every *_address field of the TEST_GENESIS3
    // block + its lab sub-block). The node TRACKS these keyless covenants so their coins appear in
    // wallet reads — without this exclusion a vault/faucet seed imports as a phantom "Received"
    // (founder-caught 2026-07-10: +10,000,000 Winiwa row from the pilot faucet seed).
    const g3 = cfg.TEST_GENESIS3 || {};
    [g3, g3.lab || {}].forEach(function (blk) {
      Object.keys(blk).forEach(function (k) {
        if (!/_address$/.test(k)) return;
        const s = String(blk[k] || '').trim().toLowerCase();
        if (s) set.add(s);
        const h = normalizeTxHash(s);
        if (h) set.add(h);
      });
    });
    return set;
  }

  function isFaucetCovenantAddress(addr) {
    const a = String(addr || '').trim().toLowerCase();
    if (!a) return false;
    const cov = faucetCovenantAddresses();
    if (cov.has(a)) return true;
    const h = normalizeTxHash(a);
    return !!(h && cov.has(h));
  }

  function isTestInfraAddress(addr) {
    const a = String(addr || '').trim().toLowerCase();
    if (!a) return false;
    if (isFaucetCovenantAddress(a)) return true;
    const infra = testInfraAddresses();
    if (infra.has(a)) return true;
    const h = normalizeTxHash(a);
    return !!(h && infra.has(h));
  }
  window.stablesIsTestInfraAddress = isTestInfraAddress;

  function coinAtTestInfraAddress(c) {
    if (!c) return false;
    return ['address', 'mxaddress', 'miniaddress'].some(function (f) {
      return isTestInfraAddress(c[f]);
    });
  }

  /** Pool / issuer / covenant UTXOs — tracked via trackall but never the user's wallet. */
  function filterOutTestInfraCoins(coins) {
    if (!Array.isArray(coins)) return [];
    return coins.filter(function (c) {
      return c && !coinAtTestInfraAddress(c);
    });
  }

  function filterOutFaucetCovenantCoins(coins) {
    return filterOutTestInfraCoins(coins);
  }

  function coinsAreOnlyTestInfra(coins) {
    const list = activityCoinsForWallet(coins);
    if (!list.length) return false;
    return list.every(coinAtTestInfraAddress);
  }

  function winiwaOutputsToUser(coins) {
    const fac = faucetCovenantConfig();
    if (!fac) return [];
    return filterOutTestInfraCoins(activityCoinsForWallet(coins)).filter(function (c) {
      return coinTokenId(c) === fac.winiwaTokenId;
    });
  }

  function faucetClaimAmountCap() {
    const reg = (window.STABLES_CONFIG || {}).TEST_TOKEN_REGISTRY || {};
    const n = Number(reg.faucet_claim_amount || 1000);
    return Number.isFinite(n) && n > 0 ? n : 1000;
  }

  function txpowWrapperToActivityRows(wrapper) {
    const row = txpowWrapperToActivity(wrapper);
    if (!row) return [];
    const fac = faucetCovenantConfig();
    const txpow = (wrapper.txpow && wrapper.txpow.txpowid) ? wrapper.txpow : wrapper;
    const relevant = (wrapper.txpow && wrapper.relevant) ? wrapper.relevant : (wrapper.relevant || {});
    const txn = (txpow.body && (txpow.body.txn || txpow.body.transaction)) || {};
    const allInputs = Array.isArray(txn.inputs) ? txn.inputs : [];
    const allOutputs = Array.isArray(txn.outputs) ? txn.outputs : [];
    const txid = row.explorerTxId || '';

    // ── Mint/burn covenant split ───────────────────────────────────────────────
    // The wrapper collapses a market-rated MINT or BURN to a single net row. For
    // visibility we want both legs: the token the user sent and the token received.
    const mb = mintBurnCovenantConfig();
    if (mb) {
      const mbAddrs = mintBurnCovenantAddresses();
      const touchesMb = allInputs.some(c => mbAddrs.has(String(c.address || '').trim().toLowerCase()))
        || allOutputs.some(c => mbAddrs.has(String(c.address || '').trim().toLowerCase()));
      if (touchesMb) {
        const userOuts = filterOutTestInfraCoins(activityCoinsForWallet(allOutputs));
        const userIns = filterOutTestInfraCoins(activityCoinsForWallet(allInputs));
        const winOut = userOuts.filter(c => coinTokenId(c) === mb.winiwaTokenId);
        const winIn = userIns.filter(c => coinTokenId(c) === mb.winiwaTokenId);
        const usdOut = userOuts.filter(c => coinTokenId(c) === mb.usdwTokenId);
        const usdIn = userIns.filter(c => coinTokenId(c) === mb.usdwTokenId);
        const winNet = sumActivityCoins(winOut) - sumActivityCoins(winIn);
        const usdNet = sumActivityCoins(usdOut) - sumActivityCoins(usdIn);
        const legs = [];
        if (Math.abs(usdNet) > 1e-9) {
          legs.push(Object.assign({}, row, {
            id: nodeActivityLegId(txid, 'usdw'),
            dir: usdNet > 0 ? 'in' : 'out',
            icon: usdNet > 0 ? '↙' : '↗',
            counterparty: 'Collateral covenant',
            category: 'USDw',
            title: usdNet > 0 ? 'Minted USDw' : 'Burned USDw',
            amt: Math.abs(usdNet),
            ccy: 'USDw',
            directionLabel: usdNet > 0 ? 'Incoming' : 'Outgoing',
            localOrigin: false,
            note: usdNet > 0 ? 'Covenant mint confirmed' : 'Covenant burn confirmed'
          }));
        }
        if (Math.abs(winNet) > 1e-9) {
          legs.push(Object.assign({}, row, {
            id: nodeActivityLegId(txid, 'winiwa'),
            dir: winNet > 0 ? 'in' : 'out',
            icon: winNet > 0 ? '↙' : '↗',
            counterparty: 'Collateral covenant',
            category: 'Winiwa',
            title: winNet > 0 ? 'Reclaimed Winiwa' : 'Locked Winiwa collateral',
            amt: Math.abs(winNet),
            ccy: 'Winiwa',
            directionLabel: winNet > 0 ? 'Incoming' : 'Outgoing',
            localOrigin: false,
            note: winNet > 0 ? 'Covenant burn confirmed' : 'Covenant mint confirmed'
          }));
        }
        if (legs.length) return legs;
      }
    }

    if (!fac) return [row];
    const relOut = filterOutTestInfraCoins(
      activityCoinsForWallet(Array.isArray(relevant.outputs) ? relevant.outputs : [])
    );
    const winiwaToUs = winiwaOutputsToUser(Array.isArray(relevant.outputs) ? relevant.outputs : []);
    const poolSpend = allInputs.some(function (c) {
      return coinTokenId(c) === fac.winiwaTokenId && coinAtTestInfraAddress(c);
    });
    const signed = relevant.weSigned === true || row.dir === 'out';
    if (!signed || !poolSpend || !winiwaToUs.length) {
      if (poolSpend && !winiwaToUs.length) return [];
      if (fac && poolSpend && row.ccy === 'Winiwa' && row.dir === 'in'
        && Math.abs(Number(row.amt) || 0) > faucetClaimAmountCap()) {
        return [];
      }
      if (isPhantomTestChannelActivityRow(row)) { stablesTraceIncomingDrop('wrapper-phantom', row); return []; }
      return [row];
    }

    let winAmt = winiwaToUs.reduce(function (acc, c) {
      return acc + coinActivityAmount(c);
    }, 0);
    const claimCap = faucetClaimAmountCap();
    if (winAmt > claimCap * 2) winAmt = claimCap;
    if (!(winAmt > 0)) return [row];

    const winRow = Object.assign({}, row, {
      id: nodeActivityLegId(txid, 'winiwa'),
      dir: 'in',
      icon: String.fromCharCode(8601),
      counterparty: 'On-chain faucet covenant',
      category: 'Winiwa',
      /* A row outlives the stage it was born in, and the merge carries titles forward, so the title
         says WHAT this is and the status says where it got to. It used to read "Faucet claim
         submitted" for ever, still claiming to be submitted long after it confirmed. */
      title: 'Faucet claim',
      faucetClaim: true,
      amt: Math.abs(winAmt),
      ccy: 'Winiwa',
      directionLabel: 'Incoming',
      localOrigin: true,
      note: row.note || 'On-chain faucet covenant claim',
    });
    return [winRow];
  }

  function txpowWrapperToActivity(wrapper) {
    if (!wrapper || typeof wrapper !== 'object') return null;
    const txpow = (wrapper.txpow && wrapper.txpow.txpowid) ? wrapper.txpow : wrapper;
    const relevant = (wrapper.txpow && wrapper.relevant) ? wrapper.relevant : {};
    const id = normalizeTxHash(txpow.txpowid || '');
    if (!id || id.length < 8) return null;
    const header = txpow.header || {};
    let parsedDate = null;
    if (header.date) { parsedDate = new Date(header.date); if (isNaN(parsedDate.getTime())) parsedDate = null; }
    if (!parsedDate && header.timemilli) {
      const ms = parseInt(String(header.timemilli), 10);
      if (!isNaN(ms)) parsedDate = new Date(ms);
    }
    const txn = (txpow.body && (txpow.body.txn || txpow.body.transaction)) || {};
    const allInputs = Array.isArray(txn.inputs) ? txn.inputs : [];
    const allOutputs = Array.isArray(txn.outputs) ? txn.outputs : [];
    
    let dir, amount = 0, counterpartyAddr = '';
    let hasValuesBlock = false;

    const valuesArr = Array.isArray(wrapper.values) ? wrapper.values : Array.isArray(txpow.values) ? txpow.values : null;
    if (valuesArr) {
      const minimaVal = valuesArr.find(v => isMinimaTokenId(v.tokenid != null ? v.tokenid : (v.token != null ? v.token : '')));
      if (minimaVal) {
        hasValuesBlock = true;
        const netValue = parseFloat(String(minimaVal.amount || minimaVal.value || 0).replace(/,/g, ''));
        if (Number.isFinite(netValue) && netValue !== 0) {
          if (netValue < 0) {
            dir = 'out';
            amount = Math.abs(netValue);
          } else {
            dir = 'in';
            amount = Math.abs(netValue);
          }
        }
      }
    }

    let weSigned = false;
    if (relevant.weSigned === true) {
      weSigned = true;
    } else if (Array.isArray(txpow.body?.witness?.signatures)) {
      // Fallback check if publicKeys were passed down or known somehow
    }

    if (!hasValuesBlock) {
      const relIn = filterOutTestInfraCoins(
        activityCoinsForWallet(Array.isArray(relevant.inputs) ? relevant.inputs : [])
      );
      const relOut = filterOutTestInfraCoins(
        activityCoinsForWallet(Array.isArray(relevant.outputs) ? relevant.outputs : [])
      );
      if (relIn.length === 0 && relOut.length === 0 && !weSigned) return null;
      if (!weSigned && coinsAreOnlyTestInfra(Array.isArray(relevant.inputs) ? relevant.inputs : [])
        && !relOut.length) {
        return null;
      }
      const inSum = sumActivityCoins(relIn);
      const outSum = sumActivityCoins(relOut);
      
      if (weSigned) {
        dir = 'out';
        const trueInSum = inSum > 0 ? inSum : sumActivityCoins(activityCoinsForWallet(allInputs));
        amount = Math.max(0, trueInSum - outSum);
      } else if (relIn.length > 0 && relOut.length > 0) {
        dir = 'out';
        amount = Math.max(0, inSum - outSum);
      } else if (relIn.length > 0) {
        dir = 'out';
        amount = inSum;
      } else {
        dir = 'in';
        amount = outSum;
      }
    }

    if (dir === 'out') {
      const ourInAddrs = new Set((Array.isArray(relevant.inputs) ? relevant.inputs : []).map(c => String(c.address || '').trim()).filter(Boolean));
      const ourOutAddrs = new Set((Array.isArray(relevant.outputs) ? relevant.outputs : []).map(c => String(c.address || '').trim()).filter(Boolean));
      const recipients = activityCoinsForWallet(allOutputs).filter(c => c.address && !ourInAddrs.has(String(c.address).trim()) && !ourOutAddrs.has(String(c.address).trim()));
      if (recipients.length > 0) counterpartyAddr = String(recipients[0].address).trim();
    } else if (dir === 'in') {
      const senders = activityCoinsForWallet(allInputs);
      if (senders.length > 0 && senders[0].address) counterpartyAddr = String(senders[0].address).trim();
    }

    if (!dir) return null;
    const previewRow = {
      dir: dir,
      amt: amount,
      ccy: dominantActivityCcy(
        filterOutFaucetCovenantCoins(
          activityCoinsForWallet(Array.isArray(relevant.outputs) ? relevant.outputs : allOutputs)
        ).concat(activityCoinsForWallet(allInputs))
      ),
      counterparty: '',
      address: counterpartyAddr,
      localOrigin: false,
    };
    if (isPhantomTestChannelActivityRow(previewRow)) return null;
    let counterparty = 'Minima network';
    if (counterpartyAddr) {
      let found = false;
      for (const c of CONTACTS_BOOK.values()) {
        if (c.address && c.address === counterpartyAddr) { counterparty = c.name; found = true; break; }
      }
      if (!found) {
        counterparty = counterpartyAddr.length > 22
          ? counterpartyAddr.slice(0, 8) + String.fromCharCode(8230) + counterpartyAddr.slice(-6)
          : counterpartyAddr;
      }
    }
    const dateText = parsedDate
      ? parsedDate.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' ' + String.fromCharCode(183) + ' ' + parsedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
      : 'Node history';
    const relCoins = dir === 'in'
      ? filterOutFaucetCovenantCoins(
        activityCoinsForWallet(Array.isArray(relevant.outputs) ? relevant.outputs : allOutputs)
      )
      : activityCoinsForWallet(Array.isArray(relevant.inputs) ? relevant.inputs : allInputs);
    const ccyLabel = dominantActivityCcy(relCoins.length ? relCoins : activityCoinsForWallet(allOutputs.concat(allInputs)));
    return {
      id: nodeActivityId(id),
      dir,
      icon: dir === 'out' ? String.fromCharCode(8599) : String.fromCharCode(8601),
      counterparty,
      category: ccyLabel,
      title: (dir === 'out' ? 'Sent ' : 'Received ') + ccyLabel,
      date: dateText,
      amt: dir === 'out' ? -Math.abs(amount) : Math.abs(amount),
      ccy: ccyLabel,
      address: counterpartyAddr,
      fee: 0,
      explorerTxId: id,
      txnId: String(txn.transactionid || '').trim(),
      status: 'Confirmed',
      note: '',
      directionLabel: dir === 'out' ? 'Outgoing' : 'Incoming',
      minimaOnChain: true,
      block: (header && header.block != null) ? (Number(String(header.block).replace(/,/g, '')) || 0) : 0,
      ts: parsedDate ? parsedDate.getTime() : 0,
      rawTxpow: wrapper
    };
  }
  /**
   * Builds a WalletContext for direction/amount classification of raw txpow objects.
   *
   * Three-source address collection:
   *   1. keys      -  all addresses ever generated in the wallet (Minima keeps these even after use)
   *   2. coins     -  current unspent MINIMA coins; each coin has both 0x and Mx address fields
   *                 so we can build a cross-format map (Mx ↔ 0x) for every known address
   *   3. coinids   -  for every input coinid appearing in txpowList, call `coins coinid:X`;
   *                 Minima nodes store spent coins and return them by coinid, so we can
   *                 confirm ownership of inputs that are no longer in the UTXO set
   *
   * isOurCoin(c) matches against both address formats AND known owned coinids.
   */
  async function buildWalletContext(txpowList) {
    const addresses = new Set();   // canonical lowercase: 0x... and Mx...
    const ownedCoinIds = new Set(); // lowercase coinids we own or owned
    const publicKeys = new Set();  // lowercase public keys to detect if we signed a tx
    const fmtMap = {};             // lowercase addr → lowercase other-format addr

    function addAddr(v) {
      if (!v) return;
      const s = String(v).trim().toLowerCase();
      if (s.length > 6 && !isTestInfraAddress(s)) addresses.add(s);
    }
    function addCoin(c) {
      if (!c) return;
      const h = c.address    ? String(c.address).trim().toLowerCase()    : null;
      if (isTestInfraAddress(h) || isTestInfraAddress(c.mxaddress) || isTestInfraAddress(c.miniaddress)) {
        return;
      }
      const m = c.mxaddress  ? String(c.mxaddress).trim().toLowerCase()  : null;
      const n = c.miniaddress? String(c.miniaddress).trim().toLowerCase(): null;
      // add all address variants
      if (h) addresses.add(h);
      if (m) addresses.add(m);
      if (n) addresses.add(n);
      // record cross-format mappings so keys addresses can be resolved to their partner format
      if (h && m) { fmtMap[h] = m; fmtMap[m] = h; }
      if (h && n) { fmtMap[h] = n; fmtMap[n] = h; }
      if (m && n && m !== n) { fmtMap[m] = n; fmtMap[n] = m; }
      if (c.coinid) ownedCoinIds.add(String(c.coinid).trim().toLowerCase());
    }

    // ── Source 1: keys  -  all keys/addresses ever generated ──
    try {
      const kr = await mdsCommand('keys');
      if (mdsOk(kr)) {
        const kp = coerceMdsPayloadLocal(kr.response);
        const klist = Array.isArray(kp) ? kp : Array.isArray(kp && kp.keys) ? kp.keys : [];
        klist.forEach(k => {
          if (!k) return;
          ['address', 'mxaddress', 'miniaddress'].forEach(f => addAddr(k[f]));
          if (k.publickey) publicKeys.add(String(k.publickey).trim().toLowerCase());
        });
      }
    } catch (_) {}

    // ── Source 2: unspent MINIMA coins  -  provides both address formats per coin ──
    try {
      for (const cmd of ['coins relevant:true tokenid:0x00', 'coins tokenid:0x00', 'coins relevant:true']) {
        const cr = await mdsCommand(cmd);
        if (!mdsOk(cr)) continue;
        const cp = coerceMdsPayloadLocal(cr.response);
        const coins = Array.isArray(cp) ? cp : Array.isArray(cp && cp.coins) ? cp.coins : [];
        coins.forEach(c => addCoin(c));
        if (addresses.size > 0) break;
      }
    } catch (_) {}

    // After source 2 we have a fmtMap. Walk the keys addresses and resolve any missing formats.
    [...addresses].forEach(a => {
      const other = fmtMap[a];
      if (other && !addresses.has(other)) addresses.add(other);
    });

    // ── Source 3: scripts  -  ALL the wallet's simple (SIGNEDBY) addresses, including ones whose coins
    // are already spent. Current coins alone miss spent-input addresses, which broke history attribution.
    // The covenant is a non-simple KISS script, so filtering to `simple` naturally excludes infra.
    try {
      const sr = await mdsCommand('scripts');
      if (mdsOk(sr)) {
        const sp = coerceMdsPayloadLocal(sr.response);
        const slist = Array.isArray(sp) ? sp : Array.isArray(sp && sp.scripts) ? sp.scripts : [];
        slist.forEach(function (s) {
          if (!s) return;
          if (s.simple === true || s.simple === 'true') {
            addAddr(s.address); addAddr(s.miniaddress); addAddr(s.mxaddress);
            if (s.publickey) publicKeys.add(String(s.publickey).trim().toLowerCase());
          }
        });
      }
    } catch (_) {}

    // ── Source 4: coinid lookup only for unresolved inputs ──
    // Spent token inputs sometimes need `coins coinid:X`, but doing this for every input overloads
    // lightweight RPC nodes. After keys, current coins, and scripts are loaded, skip any input that
    // already matches a known wallet address and cap the remaining fallback lookups.
    if (Array.isArray(txpowList)) {
      const inputCids = new Set();
      txpowList.forEach(tp => {
        if (!tp || !tp.body) return;
        const txn = tp.body.txn || tp.body.transaction || {};
        (Array.isArray(txn.inputs) ? txn.inputs : []).forEach(c => {
          if (!c || !c.coinid) return;
          const cid = String(c.coinid).trim();
          if (!cid || ownedCoinIds.has(cid.toLowerCase()) || coinAtTestInfraAddress(c)) return;
          const hasKnownAddress = ['address', 'mxaddress', 'miniaddress'].some(function (f) {
            const v = c[f];
            return v && addresses.has(String(v).trim().toLowerCase());
          });
          if (!hasKnownAddress) inputCids.add(cid);
        });
      });
      let coinidLookups = 0;
      for (const cid of inputCids) {
        if (ownedCoinIds.has(cid.toLowerCase())) continue;
        if (coinidLookups >= 40) break;
        coinidLookups++;
        try {
          const r = await mdsCommand('coins coinid:' + cid);
          if (mdsOk(r)) {
            const cp = coerceMdsPayloadLocal(r.response);
            const coins = Array.isArray(cp) ? cp : Array.isArray(cp && cp.coins) ? cp.coins : cp ? [cp] : [];
            if (coins.length > 0 && coins[0]) {
              const c = coins[0];
              const h = c.address ? String(c.address).trim().toLowerCase() : null;
              const m = c.mxaddress ? String(c.mxaddress).trim().toLowerCase() : null;
              const n = c.miniaddress ? String(c.miniaddress).trim().toLowerCase() : null;
              // Only claim this spent coin as ours if its address was already established from
              // keys/coins/scripts (Sources 1-3). If we add it unconditionally, a covenant mint
              // by ANOTHER wallet would return that wallet's Winiwa input coin here, and we'd
              // add their address to ours — making isOurCoin treat their whole wallet as ours.
              const knownToBeOurs = (h && addresses.has(h)) || (m && addresses.has(m)) || (n && addresses.has(n));
              if (knownToBeOurs) {
                ownedCoinIds.add(cid.toLowerCase());
                if (h && !isTestInfraAddress(h)) addresses.add(h);
                if (m && !isTestInfraAddress(m)) addresses.add(m);
                if (n && !isTestInfraAddress(n)) addresses.add(n);
              }
            }
          }
        } catch (_) {}
      }
    }

    function isOurCoin(c) {
      if (!c) return false;
      if (isTestInfraAddress(c.address) || isTestInfraAddress(c.mxaddress) || isTestInfraAddress(c.miniaddress)) {
        return false;
      }
      if (c.coinid && ownedCoinIds.has(String(c.coinid).trim().toLowerCase())) return true;
      return ['address', 'mxaddress', 'miniaddress'].some(f => {
        const v = c[f];
        return v && addresses.has(String(v).trim().toLowerCase());
      });
    }

    return { addresses, ownedCoinIds, publicKeys, isOurCoin };
  }

  /**
   * Clean per-transaction attribution: from a hydrated txpow body, compute the wallet's net per token
   * (sum of OUR outputs minus OUR inputs, where "ours" = simple SIGNEDBY addresses from buildWalletContext,
   * which excludes the covenant). One row per non-zero token leg, e.g. a mint = +amt USDw and -amt Winiwa.
   */
  function txpowBodyToUserRows(txpow, walletCtx, tokenMap) {
    if (!txpow || !txpow.txpowid) return [];
    const txid = normalizeTxHash(txpow.txpowid);
    if (!txid || txid.length < 8) return [];
    const txn = (txpow.body && (txpow.body.txn || txpow.body.transaction)) || {};
    const ins = Array.isArray(txn.inputs) ? txn.inputs : [];
    const outs = Array.isArray(txn.outputs) ? txn.outputs : [];
    const net = {};
    const tokenMoves = {};
    const allowedTestTokenIds = testChannelTokenIdSet();
    const addLeg = function (c, sign) {
      if (!walletCtx.isOurCoin(c)) return;
      const t = String((typeof coinTokenId === 'function' ? coinTokenId(c) : (c.tokenid || '0x00')) || '0x00').toLowerCase();
      if (allowedTestTokenIds && !allowedTestTokenIds.has(t)) return;
      const amt = (typeof coinActivityAmount === 'function')
        ? coinActivityAmount(c)
        : Number(c.tokenamount != null ? c.tokenamount : c.amount) || 0;
      net[t] = (net[t] || 0) + sign * amt;
      if (!tokenMoves[t]) tokenMoves[t] = { inputs: [], outputs: [], inTotal: 0, outTotal: 0 };
      if (sign < 0) {
        tokenMoves[t].inputs.push({ coin: c, amt: amt });
        tokenMoves[t].inTotal += amt;
      } else {
        tokenMoves[t].outputs.push({ coin: c, amt: amt });
        tokenMoves[t].outTotal += amt;
      }
    };
    outs.forEach(function (c) { addLeg(c, 1); });
    ins.forEach(function (c) { addLeg(c, -1); });
    const block = txpowMinedBlock(txpow);
    const header = txpow.header || {};
    let when = null;
    if (header.date) { const dd = new Date(header.date); if (!isNaN(dd.getTime())) when = dd; }
    if (!when && header.timemilli) { const ms = parseInt(String(header.timemilli), 10); if (!isNaN(ms)) when = new Date(ms); }
    if (!when) when = new Date();
    const dateText = when.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · '
      + when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const coinDisplayAddress = function (coin) {
      return String((coin && (coin.miniaddress || coin.mxaddress || coin.address)) || '').trim();
    };
    const shortDisplayAddress = function (addr) {
      const s = String(addr || '').trim();
      return s.length > 22 ? s.slice(0, 8) + String.fromCharCode(8230) + s.slice(-6) : s;
    };
    const firstExternalOutputAddress = function (tokenId) {
      const want = String(tokenId || '').toLowerCase();
      for (let i = 0; i < outs.length; i++) {
        const c = outs[i];
        if (!c) continue;
        const tk = String(coinTokenId(c) || '').toLowerCase();
        if (want && tk !== want) continue;
        if (walletCtx.isOurCoin(c)) continue;
        if (isTestInfraAddress(c.address) || isTestInfraAddress(c.mxaddress) || isTestInfraAddress(c.miniaddress)) continue;
        const addr = coinDisplayAddress(c);
        if (addr) return addr;
      }
      return '';
    };
    const out = [];
    Object.keys(net).forEach(function (tk) {
      const v = net[tk];
      if (!Number.isFinite(v) || Math.abs(v) < 1e-9) return;
      const isMinima = tk === '0x00' || /^0x0+$/.test(tk);
      if (isMinima) return;
      const ccy = tokenMap[tk] || tk.slice(0, 8);
      const sentToAddress = v < 0 ? firstExternalOutputAddress(tk) : '';
      out.push({
        id: 'NODE-' + txid + ':' + String(ccy).toLowerCase(),
        dir: v > 0 ? 'in' : 'out',
        icon: v > 0 ? '↙' : '↗',
        counterparty: (v < 0 && sentToAddress) ? shortDisplayAddress(sentToAddress) : 'On-chain',
        category: ccy,
        title: (v > 0 ? 'Received ' : 'Sent ') + ccy,
        date: dateText,
        amt: v,
        ccy: ccy,
        address: sentToAddress,
        fee: 0,
        explorerTxId: txid,
        pendingTxnId: '',
        status: 'Confirmed',
        directionLabel: v > 0 ? 'Incoming' : 'Outgoing',
        minimaOnChain: true,
        localOrigin: false,
        block: block,
        ts: when.getTime(),
        pendingIncoming: false,
        rawTxpow: txpow
      });
    });
    if (!out.length) {
      Object.keys(tokenMoves).forEach(function (tk) {
        const move = tokenMoves[tk];
        if (!move || !move.inputs.length || !move.outputs.length) return;
        const isMinima = tk === '0x00' || /^0x0+$/.test(tk);
        if (isMinima) return;
        const netValue = net[tk] || 0;
        if (Math.abs(netValue) > 1e-9) return;
        const nonZeroOutputs = move.outputs
          .map(function (x) { return Number(x.amt) || 0; })
          .filter(function (v) { return Number.isFinite(v) && v > 0; })
          .sort(function (a, b) { return a - b; });
        const moved = nonZeroOutputs.length ? nonZeroOutputs[0] : Math.min(move.inTotal, move.outTotal);
        if (!Number.isFinite(moved) || moved <= 0) return;
        const ccy = tokenMap[tk] || tk.slice(0, 8);
        const sentToAddress = firstExternalOutputAddress(tk);
        out.push({
          id: 'NODE-' + txid + ':' + String(ccy).toLowerCase(),
          dir: 'out',
          icon: '↗',
          counterparty: sentToAddress ? shortDisplayAddress(sentToAddress) : 'On-chain',
          category: ccy,
          title: 'Sent ' + ccy,
          date: dateText,
          amt: -moved,
          ccy: ccy,
          address: sentToAddress,
          fee: 0,
          explorerTxId: txid,
          pendingTxnId: '',
          status: 'Confirmed',
          directionLabel: 'Outgoing',
          minimaOnChain: true,
          localOrigin: false,
          block: block,
          ts: when.getTime(),
          pendingIncoming: false,
          rawTxpow: txpow
        });
      });
    }
    if (!out.length) {
      const recipient = txStateValue(txn, 21).toLowerCase();
      const testIds = testChannelTokenIdSet();
      if (recipient && testIds) {
        outs.forEach(function (c) {
          if (!c) return;
          const tk = coinTokenId(c);
          if (!testIds.has(tk)) return;
          const addrs = [
            c.address,
            c.mxaddress,
            c.miniaddress
          ].map(function (v) { return String(v || '').trim().toLowerCase(); }).filter(Boolean);
          if (!addrs.some(function (a) { return a === recipient; })) return;
          if (addrs.some(function (a) { return isTestInfraAddress(a); })) return;
          // CRITICAL: the covenant's declared recipient (STATE 21) must be THIS wallet. Without this
          // check, every covenant mint/burn (made by ANY tester) was shown as the viewer's own
          // "Received … · Stables covenant", because the node tracks the shared covenant and the coin
          // simply went to whoever minted. Only keep it when the receiving coin is actually ours.
          if (!walletCtx || !walletCtx.isOurCoin(c)) return;
          const amt = coinActivityAmount(c);
          if (!Number.isFinite(amt) || amt <= 0) return;
          const ccy = tokenMap[tk] || tk.slice(0, 8);
          out.push({
            id: 'NODE-' + txid + ':' + String(ccy).toLowerCase(),
            dir: 'in',
            icon: '↙',
            counterparty: 'Stables covenant',
            category: ccy,
            title: 'Received ' + ccy,
            date: dateText,
            amt: amt,
            ccy: ccy,
            address: '',
            fee: 0,
            explorerTxId: txid,
            pendingTxnId: '',
            status: 'Confirmed',
            note: 'Confirmed covenant transaction',
            directionLabel: 'Incoming',
            minimaOnChain: true,
            localOrigin: false,
            block: block,
            ts: when.getTime(),
            pendingIncoming: false
          });
        });
      }
    }
    return out;
  }

  function liveTokenMapFromConfig() {
    const tokenMap = {
      '0x00': 'MINIMA',
      '0x0': 'MINIMA',
      '0': 'MINIMA',
      '0x0000000000000000000000000000000000000000000000000000000000000000': 'MINIMA'
    };
    const treg = (window.STABLES_CONFIG || {}).TEST_TOKEN_REGISTRY || {};
    if (treg.winiwa_token_id) tokenMap[String(treg.winiwa_token_id).toLowerCase()] = 'Winiwa';
    if (treg.usdw_token_id) tokenMap[String(treg.usdw_token_id).toLowerCase()] = 'USDw';
    if (treg.xwiniwa_token_id) tokenMap[String(treg.xwiniwa_token_id).toLowerCase()] = 'xWiniwa';
    return tokenMap;
  }

  function txpowHasBody(txpow) {
    const txn = txpow && txpow.body && (txpow.body.txn || txpow.body.transaction);
    return !!(txn && (Array.isArray(txn.inputs) || Array.isArray(txn.outputs)));
  }

  async function hydrateTxpowForLiveIngest(txpowOrId) {
    const id = normalizeTxHash(typeof txpowOrId === 'string' ? txpowOrId : (txpowOrId && txpowOrId.txpowid));
    if (!id) return null;
    if (txpowHasBody(txpowOrId)) return txpowOrId;
    const loaded = await loadTxpowById(id);
    return loaded || (txpowOrId && typeof txpowOrId === 'object' ? txpowOrId : { txpowid: id });
  }

  function markLiveRowsByBlockState(rows, txpow) {
    const block = txpowMinedBlock(txpow);
    rows.forEach(function (row) {
      if (!row || !row.minimaOnChain) return;
      row.block = block || Number(row.block || 0) || 0;
      stablesStampConfirmPolicyOnRow(row);
      const confirmedNow = row.block > 0 && txConfirmations(row) >= stablesGetConfirmTargetForRow(row);
      row.status = confirmedNow ? 'Confirmed' : 'On-chain';
      row.pendingIncoming = row.dir === 'in' && !confirmedNow;
      if (row.dir === 'in' && !confirmedNow && !String(row.note || '').trim()) {
        row.note = row.block > 0
          ? 'Incoming found on-chain. Waiting for confirmation target.'
          : 'Incoming found by your node. Waiting for the first block.';
      }
    });
    return rows;
  }

  async function rowsFromLiveTxpow(txpow) {
    if (!txpow || !txpow.txpowid) return [];
    const hydrated = await hydrateTxpowForLiveIngest(txpow);
    if (!txpowHasBody(hydrated)) return [];
    const walletCtx = await buildWalletContext([hydrated]);
    if (!walletCtx || (!walletCtx.addresses.size && !walletCtx.ownedCoinIds.size && !walletCtx.publicKeys.size)) return [];
    return markLiveRowsByBlockState(
      txpowBodyToUserRows(hydrated, walletCtx, liveTokenMapFromConfig()),
      hydrated
    );
  }

  window.stablesSyncNodeTransactions = async function (silent) {
    // Phase 2 rebuild (v70): the history sync worker is retired. tx-mirror.js owns on-chain
    // rows (initial import, live mempool rows, confirmation ladder) with single cheap node
    // commands, so nothing monopolizes the node bridge anymore. Body below is dead code
    // pending physical deletion.
    if (!silent) {
      const el = document.getElementById('nodeTxSyncStatus');
      if (el) el.textContent = 'Live: transactions mirror your node history automatically.';
    }
    if (true) return;
  };

  // ── Live updates (mirrors the Minima wallet's event-driven behaviour) ───────────────
  // The Minima wallet does not wait for a manual refresh: its MDS callback reacts to
  // NEWBALANCE / NEWBLOCK (confirmations) and NEWTXPOW (a transaction arriving on the
  // network) so incoming payments show up instantly. We replicate that here.

  // Cached set of our addresses (both 0x and Mx forms) for fast incoming matching.
  let _walletAddrCache = null;
  let _walletAddrCacheTs = 0;
  const WALLET_ADDR_CACHE_TTL_MS = 60000;

  async function ensureWalletAddrCache(force) {
    const now = Date.now();
    if (!force && _walletAddrCache && (now - _walletAddrCacheTs) < WALLET_ADDR_CACHE_TTL_MS) {
      return _walletAddrCache;
    }
    const addrs = new Set();
    const add = (v) => {
      if (!v) return;
      const s = String(v).trim().toLowerCase();
      if (s.length > 6 && !isTestInfraAddress(s)) addrs.add(s);
    };
    try {
      const kr = await mdsCommand('keys');
      if (mdsOk(kr)) {
        const kp = coerceMdsPayloadLocal(kr.response);
        const klist = Array.isArray(kp) ? kp : Array.isArray(kp && kp.keys) ? kp.keys : [];
        klist.forEach(k => { if (k) ['address', 'mxaddress', 'miniaddress'].forEach(f => add(k[f])); });
      }
    } catch (_) { /* ignore */ }
    if (addrs.size > 0) { _walletAddrCache = addrs; _walletAddrCacheTs = now; }
    return _walletAddrCache || addrs;
  }
  window.stablesInvalidateWalletAddrCache = function () { _walletAddrCache = null; _walletAddrCacheTs = 0; };
  window.stablesPrewarmWalletAddrCache = function () {
    ensureWalletAddrCache(true).catch(function () { /* ignore */ });
  };

  const _seenIncomingTxids = new Set();

  async function resolveWalletOwnerId() {
    try {
      if (typeof window.MDS === 'undefined' || !window.MDS || !window.MDS.cmd) return '';
      const kr = await mdsCommand('keys');
      if (!mdsOk(kr)) return '';
      const kp = coerceMdsPayloadLocal(kr.response);
      const klist = Array.isArray(kp) ? kp : Array.isArray(kp && kp.keys) ? kp.keys : [];
      for (let i = 0; i < klist.length; i++) {
        const k = klist[i];
        if (!k) continue;
        const id = String(k.address || k.miniaddress || k.mxaddress || '').trim().toLowerCase();
        if (id.length >= 8) return id;
      }
    } catch (_) { /* ignore */ }
    return '';
  }

  function clearActivityCacheForWalletSwitch(nextOwnerId) {
    // Keep app-local / optimistic rows (faucet, mint, sends) even on owner reconcile glitches.
    // Only drop non-local history rows when switching wallets.
    USER_ACTIVITY = USER_ACTIVITY.filter(r => r && r.localOrigin === true);
    _activityOwnerId = String(nextOwnerId || '').trim().toLowerCase();
    try {
      const ownerId = _activityOwnerId;
      localStorage.setItem(
        USER_ACTIVITY_STORAGE_KEY,
        JSON.stringify({ ownerId: ownerId, rows: USER_ACTIVITY })
      );
    } catch (_) { /* ignore */ }
    // Do not wipe session rows for local ones
    // writeTestSessionActivityRows( readTestSession... filtered? but for now keep behavior minimal );
    try { sessionStorage.removeItem(TEST_ACTIVITY_SESSION_OWNER_KEY); } catch (_) { /* ignore */ }
    try { _seenIncomingTxids.clear(); } catch (_) { /* ignore */ }
    if (typeof window.stablesInvalidateWalletAddrCache === 'function') {
      window.stablesInvalidateWalletAddrCache();
    }
    // Do NOT reset test token balances here. Balances for Winiwa/USDw must come live from the node (like native Minima wallet).
    // Resetting caused "balance is reset" on every reconcile/refresh. Only clear non-local activity rows (already done above).
    if (typeof updateGlobalUI === 'function') {
      updateGlobalUI();
    }
    if (_activityOwnerId) persistOwnerId(_activityOwnerId);
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    if (typeof updateGlobalUI === 'function') updateGlobalUI();
  }

  // Wallet-identity guard: activity is cached in localStorage per MiniDapp install. Bind it to the
  // node's primary key address (from `keys`), not tracked covenant/script coins — otherwise opening
  // a different wallet in the same browser falsely matches on shared tracked addresses.
  async function reconcileActivityOwnerForCurrentWallet() {
    if (!DEMO_REAL) return false;
    const currentId = await resolveWalletOwnerId();
    if (!currentId) return false;

    let storedOwnerId = readStoredOwnerId();
    if (!storedOwnerId) {
      try {
        const legacyRaw = String(localStorage.getItem(WALLET_OWNER_KEY) || '').trim();
        if (legacyRaw.charAt(0) === '[') {
          const arr = JSON.parse(legacyRaw);
          if (Array.isArray(arr) && arr.length) {
            const legacySet = new Set(arr.map(function (a) { return String(a).trim().toLowerCase(); }));
            if (!legacySet.has(currentId)) {
              clearActivityCacheForWalletSwitch(currentId);
              return true;
            }
          }
        }
      } catch (_) { /* ignore */ }
    }

    if (storedOwnerId && storedOwnerId !== currentId) {
      clearActivityCacheForWalletSwitch(currentId);
      return true;
    }
    if (_activityOwnerId && _activityOwnerId !== currentId) {
      clearActivityCacheForWalletSwitch(currentId);
      return true;
    }

    _activityOwnerId = currentId;
    persistOwnerId(currentId);
    persistUserActivityToStorage();
    return false;
  }
  window.stablesReconcileActivityOwner = reconcileActivityOwnerForCurrentWallet;
  window.stablesGuardActivityWalletOwner = async function (options) {
    const opts = options || {};
    if (opts.invalidateCache && typeof window.stablesInvalidateWalletAddrCache === 'function') {
      window.stablesInvalidateWalletAddrCache();
    }
    return reconcileActivityOwnerForCurrentWallet();
  };

  /**
   * Instant activity ingest on every NEWTXPOW (and right after txnpost). Mirrors the Minima wallet:
   * incoming payments, sends, and faucet pours appear immediately — no history sync wait.
   */
  window.stablesIngestLiveTxpow = async function stablesIngestLiveTxpow(txpow) {
    // Phase 2 rebuild (v70): retired. Its txpow-body hydration starved behind the (also
    // retired) history worker and dropped mempool rows with an empty token label.
    // tx-mirror.js reads `history` difference (token + amount present at mempool time).
    if (true) return;
  };
  window.stablesHandleIncomingTxpow = window.stablesIngestLiveTxpow;

  const _tracedIngestTxids = new Set();

  function fastTimeout(promise, ms, fallback) {
    return Promise.race([
      promise,
      new Promise(function (resolve) { setTimeout(function () { resolve(fallback); }, ms); })
    ]);
  }

  /**
   * Detection notifier for the poll-driven ingest path. The standalone APK's embedded node
   * delivers no MDS events, so the live-poll relevant-txpow scan is the only always-on
   * detector there — and before this it imported rows silently. Raise the same incoming
   * warning popup + toast the NEWTXPOW event path shows, once per txpow per session, and
   * only for rows still below their confirmation target (never for old settled history).
   */
  function notifyDetectedIncomingRows(rows, txid) {
    const id = normalizeTxHash(txid || '');
    if (!id || _seenIncomingTxids.has(id)) return;
    const list = rows || [];
    // Prefer a still-settling row (amber "detected" popup). When relay loses the race with the
    // block, the first sight of a payment is already confirmed — announce it anyway (green
    // "confirmed" popup) as long as it is fresh, instead of staying silent.
    const settlingRow = list.find(function (r) { return r && r.dir === 'in' && isIncomingSettlingRow(r); });
    let freshConfirmedRow = null;
    if (!settlingRow) {
      const RECENT_MS = 5 * 60 * 1000;
      freshConfirmedRow = list.find(function (r) {
        return r && r.dir === 'in' && !deletedTx.has(r.id)
          && Math.abs(Date.now() - Number(r.ts || 0)) < RECENT_MS;
      });
    }
    const inRow = settlingRow || freshConfirmedRow;
    if (!inRow) return;
    _seenIncomingTxids.add(id);
    try { console.log('[Stables detect] incoming txpow ' + id.slice(0, 18) + '… popup (' + (settlingRow ? 'settling' : 'fresh-confirmed') + ') at ' + new Date().toISOString()); } catch (_) { /* ignore */ }
    try {
      if (typeof window.stablesShowIncomingPaymentWarning === 'function') {
        window.stablesShowIncomingPaymentWarning(inRow);
      }
    } catch (_) { /* ignore */ }
    if (CFG.INCOMING_POPUP_ENABLED && typeof window.showToast === 'function') {
      const amtStr = Math.abs(Number(inRow.amt) || 0);
      const shown = amtStr >= 1
        ? amtStr.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : amtStr.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
      window.showToast(
        settlingRow
          ? ('Incoming ' + shown + ' ' + inRow.ccy + ' detected. Awaiting confirmation.')
          : ('Incoming ' + shown + ' ' + inRow.ccy + ' received and confirmed.'),
        { tone: settlingRow ? 'amber' : 'ok', durationMs: 6500 }
      );
    }
  }

  async function fastIngestTxpowCandidate(candidate) {
    const full = await hydrateTxpowForLiveIngest(candidate);
    if (!full || !full.txpowid) return 0;
    const rows = await rowsFromLiveTxpow(full);
    const _tid = normalizeTxHash(full.txpowid);
    if (_tid && !_tracedIngestTxids.has(_tid)) {
      _tracedIngestTxids.add(_tid);
      try { console.log('[Stables detect] ingest ' + _tid.slice(0, 18) + ' rows=' + rows.length + ' body=' + txpowHasBody(full)); } catch (_) { /* ignore */ }
    }
    if (!rows.length) {
      if (applyTxpowBlockToActivityRows(full)) {
        persistUserActivityToStorage();
        refreshSettlingActivityUi();
        return 1;
      }
      return 0;
    }
    const changed = upsertUserActivityRows(rows);
    applyTxpowBlockToActivityRows(full);
    if (finalizeSettledActivityRows()) persistUserActivityToStorage();
    refreshSettlingActivityUi();
    notifyDetectedIncomingRows(rows, full.txpowid);
    return changed || rows.length;
  }

  function txpowsFromResponsePayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    if (Array.isArray(payload.txpows)) return payload.txpows;
    if (Array.isArray(payload.txpowslist)) return payload.txpowslist;
    if (Array.isArray(payload.response)) return payload.response;
    if (payload.txpow && payload.txpow.txpowid) return [payload.txpow];
    if (payload.txpowid) return [payload];
    return [];
  }

  function merchantWatchTokenIdForCcy(ccy) {
    const c = normalizeActivityCcyLabel(ccy);
    const reg = (window.STABLES_CONFIG || {}).TEST_TOKEN_REGISTRY || {};
    if (c === 'Winiwa' || c === 'WINIMA') return String(reg.winiwa_token_id || '').trim().toLowerCase();
    if (c === 'USDw') return String(reg.usdw_token_id || '').trim().toLowerCase();
    if (c === 'xWiniwa') return String(reg.xwiniwa_token_id || '').trim().toLowerCase();
    return '';
  }

  function merchantWatchCoinAddressSet(coin) {
    const out = new Set();
    if (!coin || typeof coin !== 'object') return out;
    ['address', 'mxaddress', 'miniaddress'].forEach(function (k) {
      const v = String(coin[k] || '').trim().toLowerCase();
      if (v) out.add(v);
    });
    collectAddrForms(coin).forEach(function (v) { if (v) out.add(String(v).trim().toLowerCase()); });
    return out;
  }

  function merchantWatchCoinMatchesAddress(coin, expectedAddr, walletCtx) {
    const want = String(expectedAddr || '').trim().toLowerCase();
    if (want) {
      const got = merchantWatchCoinAddressSet(coin);
      if (got.has(want)) return true;
    }
    return !!(walletCtx && typeof walletCtx.isOurCoin === 'function' && walletCtx.isOurCoin(coin));
  }

  async function merchantWatchMatchTxpow(txpow, expected) {
    const full = await hydrateTxpowForLiveIngest(txpow);
    if (!full || !full.txpowid || !txpowHasBody(full)) return null;
    const tokenId = String(expected.tokenId || '').trim().toLowerCase();
    if (!tokenId) return null;
    const amount = Number(expected.amount) || 0;
    const amountRequired = amount > 0;
    const txn = (full.body && (full.body.txn || full.body.transaction)) || {};
    const outs = Array.isArray(txn.outputs) ? txn.outputs : [];
    if (!outs.length) return null;
    const walletCtx = await buildWalletContext([full]);
    const tolerance = Math.max(0.000001, Number(expected.tolerance) || 0.01);
    for (let i = 0; i < outs.length; i++) {
      const coin = outs[i];
      if (!coin || coinTokenId(coin) !== tokenId) continue;
      if (!merchantWatchCoinMatchesAddress(coin, expected.address, walletCtx)) continue;
      const amt = coinActivityAmount(coin);
      if (amountRequired && Math.abs(amt - amount) > tolerance) continue;
      const block = txpowMinedBlock(full);
      return {
        ok: true,
        source: 'live-txpow',
        txpowid: normalizeTxHash(full.txpowid),
        block: block,
        status: block > 0 ? 'On-chain' : 'Broadcasted',
        dir: 'in',
        amt: amt,
        ccy: normalizeActivityCcyLabel(expected.ccy),
        address: String(expected.address || ''),
        ts: Date.now()
      };
    }
    return null;
  }

  window.stablesFindMerchantIncomingPayment = async function stablesFindMerchantIncomingPayment(options) {
    if (!DEMO_REAL) return null;
    const opts = options || {};
    const expected = {
      amount: Number(opts.amount || opts.amt) || 0,
      ccy: normalizeActivityCcyLabel(opts.ccy || opts.currency || ''),
      tokenId: merchantWatchTokenIdForCcy(opts.ccy || opts.currency || ''),
      address: String(opts.address || '').trim(),
      tolerance: Number(opts.tolerance) || 0.01,
      sinceMs: Number(opts.sinceMs || opts.since || 0) || 0
    };
    if (!expected.ccy || !expected.tokenId) return null;
    const amountRequired = expected.amount > 0;

    const rows = activitySource();
    const now = Date.now();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.dir !== 'in') continue;
      if (normalizeActivityCcyLabel(r.ccy) !== expected.ccy) continue;
      if (amountRequired && Math.abs(Math.abs(Number(r.amt) || 0) - expected.amount) > expected.tolerance) continue;
      const ts = Number(r.ts || r.time || 0) || 0;
      if (expected.sinceMs && ts && ts < expected.sinceMs - 5000) continue;
      if (ts && now - ts > 5 * 60 * 1000) continue;
      return {
        ok: true,
        source: 'activity',
        txpowid: normalizeTxHash(r.explorerTxId) || nodeTxpowHashFromActivityId(r.id),
        block: Number(r.block || 0) || 0,
        status: String(r.status || 'Detected'),
        dir: 'in',
        amt: Math.abs(Number(r.amt) || 0),
        ccy: expected.ccy,
        address: String(r.address || expected.address || ''),
        ts: ts || now
      };
    }

    const resp = await fastTimeout(mdsCommand('txpow relevant:true max:24'), 1200, null);
    if (mdsOk(resp)) {
      const payload = coerceMdsPayloadLocal(resp.response);
      const txpows = txpowsFromResponsePayload(payload).slice(0, 24);
      for (let i = 0; i < txpows.length; i++) {
        const match = await fastTimeout(merchantWatchMatchTxpow(txpows[i], expected), 800, null);
        if (match && match.ok) {
          try { await fastTimeout(fastIngestTxpowCandidate(txpows[i]), 800, 0); } catch (_) { /* ignore */ }
          return match;
        }
      }
    }

    return null;
  };
  window.stablesFindIncomingPayment = window.stablesFindMerchantIncomingPayment;

  window.stablesFastIncomingScan = async function stablesFastIncomingScan(options) {
    // Phase 2 rebuild (v92): retired — this per-token coins/getaddress burst saturated the
    // embedded node's bridge (2-5s per command on-device). tx-mirror.js owns incoming
    // detection from `history`, kicked by the native NEWTXPOW push.
    if (true) return;
  };

  window.stablesStartIncomingFastWatch = function stablesStartIncomingFastWatch(reason, txpowId) {
    // Phase 2 rebuild (v70): retired — tx-mirror.js is kicked directly by node events.
    if (true) return;
  };

  // Find a boolean `relevant` flag anywhere in a checkaddress response.
  function findRelevantFlag(obj, depth) {
    if (depth > 6 || obj == null || typeof obj !== 'object') return null;
    // OWNERSHIP prefers "simple" (our own key) over "relevant" (merely tracked): covenant
    // pool addresses are relevant on every claimer's node, and reading relevant as "mine"
    // misattributed other users' covenant transactions (founder 2026-07-07).
    if (Object.prototype.hasOwnProperty.call(obj, 'simple')) {
      const s = obj.simple;
      if (s === true || s === 'true' || s === 1) return true;
      if (s === false || s === 'false' || s === 0) return false;
      if (s && typeof s === 'object' && (s.relevant === true || s.relevant === 'true')) return true;
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'relevant')) {
      const v = obj.relevant;
      if (v === true || v === 'true' || v === 1) return true;
      if (v === false || v === 'false' || v === 0) return false;
    }
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const r = findRelevantFlag(obj[keys[i]], depth + 1);
      if (r !== null) return r;
    }
    return null;
  }

  // Collect every 0x / Mx address string found anywhere in a parsed object.
  function collectAddrForms(obj, seed) {
    const forms = new Set();
    if (seed) { const s = String(seed).trim().toLowerCase(); if (s.length > 6) forms.add(s); }
    (function walk(o, d) {
      if (d > 8 || o == null) return;
      if (typeof o === 'string') {
        const mm = o.match(/\bMx[A-Za-z0-9]{20,}\b/);
        if (mm) forms.add(mm[0].toLowerCase());
        const hx = o.match(/\b0x[0-9A-Fa-f]{40,128}\b/i);
        if (hx) forms.add(hx[0].toLowerCase());
        return;
      }
      if (typeof o !== 'object') return;
      Object.keys(o).forEach(k => walk(o[k], d + 1));
    })(obj, 0);
    return forms;
  }

  /**
   * Returns { ok:true } if the given address is one of this wallet's addresses, else
   * { ok:false, reason }. The node's `checkaddress` command is authoritative: it returns a
   * `relevant` flag that means "this address belongs to / is tracked by this node". We trust
   * that when present, and only fall back to matching against keys/coins if the flag is absent.
   */
  window.stablesIsOwnAddress = async function (addr) {
    const raw = String(addr || '').trim();
    if (!raw) return { ok: false, reason: 'empty' };

    let forms = new Set([raw.toLowerCase()]);
    try {
      const r = await mdsCommand('checkaddress address:' + raw);
      if (mdsOk(r)) {
        const p = coerceMdsPayloadLocal(r.response);
        const rel = findRelevantFlag(p, 0);
        if (rel === true) return { ok: true };
        if (rel === false) return { ok: false, reason: 'notfound' };
        // No `relevant` flag in this node version → gather forms for the fallback match.
        forms = collectAddrForms(p, raw);
      }
    } catch (_) { /* ignore */ }

    // Fallback: match against our keys/coins address set.
    const set = await ensureWalletAddrCache(true);
    if (!set || set.size === 0) return { ok: false, reason: 'noaddrs' };
    for (const f of forms) { if (set.has(f)) return { ok: true }; }
    return { ok: false, reason: 'notfound' };
  };

  function normalizeActivityCcyLabel(ccy) {
    const c = String(ccy || '').trim();
    if (c === 'WINIMA') return 'Winiwa';
    return c;
  }

  // A settling cue has to end. The wallet total and the affected currency row pulse continuously
  // (1.1s infinite) while any incoming row is still settling, and that state was bounded only by the
  // row reaching its confirmation target. A row whose confirmations never resolve — no block stamped,
  // a pendingIncoming flag nothing later clears, a node that stopped reporting — left the balance
  // pulsing indefinitely (founder 2026-07-26: "flashing for more than one hour since the latest
  // operation"). Past this window the row is no longer *settling* in any useful sense, so the cue
  // stops and the wallet shows node truth. It matches the stabilizer's own 20-minute hard cap, which
  // means the held figure is already released by then and the pulse was outliving the thing it
  // described. The row itself is untouched: its status still reads honestly in Activity.
  const SETTLING_CUE_MAX_MS = 20 * 60 * 1000;
  function isIncomingSettlingRow(x) {
    if (!x || x.dir !== 'in' || deletedTx.has(x.id)) return false;
    if (!x.minimaOnChain && !x.pendingIncoming && !x.localOrigin) return false;
    if (String(x.status) === 'Confirmed' && !x.pendingIncoming) return false;
    const started = Number(x.ts || 0);
    if (started > 0 && (Date.now() - started) > SETTLING_CUE_MAX_MS) return false;
    const conf = txConfirmations(x);
    if (conf !== null && conf >= stablesGetConfirmTargetForRow(x)) return false;
    return x.pendingIncoming === true || isActivityUnsettledStatus(x.status);
  }

  /** Amount to add to hero total before the node balance includes the mined coin. */
  //A received coin only enters the node's `sendable` balance at Minima's coin-confirm depth,
  //not at first inclusion, so the overlay must carry the amount through that whole window or
  //the incoming payment vanishes from the displayed balance between 1 conf and full depth.
  const NODE_COIN_CONFIRM_DEPTH = 3;
  function incomingRowOverlayAmt(x) {
    if (x && x.balanceAlreadyApplied === true) return 0;
    const block = Number(x.block || 0);
    const conf = txConfirmations(x);
    if (block > 0 && conf !== null && conf >= NODE_COIN_CONFIRM_DEPTH) return 0;
    return Math.abs(Number(x.amt) || 0);
  }

  function getWalletSettlingState() {
    const seenTx = new Set();
    const overlayByCcy = {};
    let flashCount = 0;
    // Rows can carry different targets; the subline shows the row with the most blocks left.
    let worst = null;
    activitySource().forEach(x => {
      if (!isIncomingSettlingRow(x)) return;
      const txKey = nodeTxpowHashFromActivityId(x.id)
        || normalizeTxHash(x.explorerTxId)
        || String(x.id || '');
      if (txKey && seenTx.has(txKey)) return;
      if (txKey) seenTx.add(txKey);
      const overlay = incomingRowOverlayAmt(x);
      if (overlay > 0) {
        const ccy = normalizeActivityCcyLabel(x.ccy);
        overlayByCcy[ccy] = (overlayByCcy[ccy] || 0) + overlay;
      }
      flashCount++;
      const conf = txConfirmationsShown(x);
      if (conf !== null) {
        const rowTarget = stablesGetConfirmTargetForRow(x);
        const shownConf = Math.max(1, Math.min(conf, rowTarget));
        const remaining = rowTarget - shownConf;
        if (!worst || remaining > worst.remaining) {
          worst = { conf: shownConf, target: rowTarget, remaining: remaining };
        }
      }
    });
    return {
      overlayByCcy: overlayByCcy,
      flashing: flashCount > 0,
      count: flashCount,
      confirmations: (flashCount > 0 && worst) ? worst.conf : 1,
      target: (flashCount > 0 && worst) ? worst.target : 1,
    };
  }
  window.stablesGetWalletSettlingState = getWalletSettlingState;

  /**
   * Pulses the hero total while incoming payments settle; subline shows block progress.
   */
  function renderPendingIncomingIndicator() {
    const el = document.getElementById('wHeroPendingIncoming');
    const state = getWalletSettlingState();
    const wTotal = document.querySelector('.w-total');
    if (wTotal) wTotal.classList.toggle('w-total--settling', state.flashing);
    if (!el) return;
    // User-facing policy: incoming updates live in the transaction list only.
    // Keep the hero line hidden to avoid duplicate messaging above Send/Receive.
    el.style.display = 'none';
    el.textContent = '';
    try {
      if (wTotal) el.classList.toggle('bal-hidden', wTotal.classList.contains('bal-hidden'));
    } catch (_) { /* ignore */ }
  }
  window.stablesRenderPendingIncomingIndicator = renderPendingIncomingIndicator;

  // Debounced live re-sync of node history, fired on NEWBALANCE / NEWBLOCK.
  let _liveResyncTid = null;
  window.stablesLiveResyncTransactions = function () {
    // Phase 2 rebuild (v70): retired — tx-mirror.js poll + event kicks replace it.
    if (true) return;
  };

  window.openTxExplorer = function () {
    if (typeof window.openModal === 'function') {
      window.openModal('minimaExplorerComingModal');
      return;
    }
    if (typeof window.showToast === 'function') {
      window.showToast('Demo: link to the Minima explorer will be added at a later stage.', { tone: 'amber', durationMs: 3800 });
    }
  };
  function fmtAmt(a) {
    const abs = Math.abs(Number(a) || 0);
    if (abs === 0) return '0';
    let minD = 2;
    let maxD = 2;
    if (abs < 0.001) { minD = 6; maxD = 6; }
    else if (abs < 0.01) { minD = 4; maxD = 4; }
    else if (abs < 1) { minD = 3; maxD = 3; }
    else if (abs < 10) { minD = 2; maxD = 2; }
    else { minD = 2; maxD = 2; }
    return abs.toLocaleString('en-US', { minimumFractionDigits: minD, maximumFractionDigits: maxD });
  }

  function activityAmtSignedDisplay(x) {
    const outgoing = !!(x && x.dir === 'out');
    const v = Math.abs(Number(x && x.amt) || 0);
    /* Combining or splitting notes moves money from this wallet to this wallet: neither received
       nor sent, so neither the plus nor the minus, and neither colour (2026-09-03). */
    if (x && x.dir === 'self') return { cls: 'self', sign: '', value: fmtAmt(v) };
    /* A transaction that FAILED moved nothing. Painting its intended amount green with a plus told
       the founder his failed mint had received 21,359.89 xWiniwa (phone, 2026-09-03). The figure
       stays, so the row still says what was attempted, but with no sign and no colour. */
    if (x && String(x.status) === 'Failed') return { cls: 'self', sign: '', value: fmtAmt(v) };
    return {
      cls: outgoing ? 'neg' : 'pos',
      sign: outgoing ? '−' : '+',
      value: fmtAmt(v),
    };
  }
  function activityIconClass(x) {
    if (x && x.dir === 'self') return 'self-ic';
    return (x && x.dir === 'in') ? 'in-ic' : 'out-ic';
  }
  function activityMatchesDir(x) {
    if (activityFilter === 'all' || activityFilter === 'hidden') return true;
    return x.dir === activityFilter;
  }

  function parseActivityDateValue(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;
    const direct = new Date(text);
    if (!Number.isNaN(direct.getTime())) return direct;

    const mdTime = text.match(/^([A-Za-z]{3})\s+(\d{1,2})\s+·\s+(\d{2}):(\d{2})$/);
    if (mdTime) {
      const now = new Date();
      let year = now.getFullYear();
      const probe = new Date(`${mdTime[1]} ${mdTime[2]} ${year} ${mdTime[3]}:${mdTime[4]}:00`);
      if (!Number.isNaN(probe.getTime())) {
        if (probe.getTime() - now.getTime() > 36 * 60 * 60 * 1000) {
          probe.setFullYear(year - 1);
        }
        return probe;
      }
    }

    const fallback = new Date(text.replace('·', '').replace(/\s+/g, ' '));
    if (!Number.isNaN(fallback.getTime())) return fallback;
    return null;
  }

  function activityMatchesTimeframe(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return activityTimeframe === 'all';
    if (activityTimeframe === 'all') return true;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (activityTimeframe === 'today') {
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return date >= start && date < end;
    }
    if (activityTimeframe === 'week') {
      const weekStart = new Date(start);
      const day = weekStart.getDay();
      const diff = day === 0 ? 6 : day - 1;
      weekStart.setDate(weekStart.getDate() - diff);
      return date >= weekStart;
    }
    if (activityTimeframe === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= monthStart;
    }
    if (activityTimeframe === 'year') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return date >= yearStart;
    }
    return true;
  }

  function activityMatchesPeriod(date) {
    if (activityPeriod === 'all') return true;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
    const days = parseInt(String(activityPeriod).replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(days) || days <= 0) return true;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);
    return date >= cutoff;
  }

  function activityMatchesDateRange(date) {
    if (!activityDateFrom && !activityDateTo) return true;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return false;
    if (activityDateFrom) {
      const from = new Date(`${activityDateFrom}T00:00:00`);
      if (!Number.isNaN(from.getTime()) && date < from) return false;
    }
    if (activityDateTo) {
      const to = new Date(`${activityDateTo}T23:59:59.999`);
      if (!Number.isNaN(to.getTime()) && date > to) return false;
    }
    return true;
  }

  function activityTimestamp(tx) {
    // Prefer a real numeric timestamp captured at row creation. The displayed `date` string has
    // no year (e.g. "09 Jun · 18:23"), so parsing it puts year-old transactions in the current
    // year and floats them to the top, the `ts` field avoids that.
    if (tx && typeof tx.ts === 'number' && Number.isFinite(tx.ts) && tx.ts > 0) return tx.ts;
    const date = parseActivityDateValue(tx && tx.date);
    return date ? date.getTime() : 0;
  }

  function sortActivityItems(items) {
    if (activitySort === 'amount_desc') {
      return items.sort((a, b) => Math.abs(b.amt) - Math.abs(a.amt));
    }
    return items.sort((a, b) => activityTimestamp(b) - activityTimestamp(a));
  }

  function getFilteredActivity() {
    const q = (activitySearch || '').toLowerCase().trim();
    const hiddenOnly = activityFilter === 'hidden';
    return activitySource().filter(x => {
      if (deletedTx.has(x.id)) return false;
      if (hiddenOnly) {
        if (!hiddenTx.has(x.id)) return false;
      } else {
        if (hiddenTx.has(x.id)) return false;
        if (hiddenShops.has(x.counterparty)) return false;
      }
      if (!activityMatchesDir(x)) return false;
      if (activityCcyFilter !== 'all' && x.ccy !== activityCcyFilter) return false;
      const txDate = parseActivityDateValue(x.date);
      if (!activityMatchesTimeframe(txDate)) return false;
      if (!activityMatchesPeriod(txDate)) return false;
      if (!activityMatchesDateRange(txDate)) return false;
      const note = getTxNote(x).toLowerCase();
      if (q && !x.counterparty.toLowerCase().includes(q) && !x.category.toLowerCase().includes(q) && !note.includes(q)) return false;
      return true;
    });
  }
  function latestContactTx(name, dir) {
    return activitySource().find(x => !deletedTx.has(x.id) && x.counterparty === name && x.dir === dir) || null;
  }

  function txsForShop(shopName) {
    return activitySource().filter(x => x.counterparty === shopName);
  }

  function escUi(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeId(v) {
    return String(v || '').trim();
  }

  function usdRateForCcy(ccy) {
    const code = String(ccy || '').trim();
    const map = {
      USDw: 1, EURw: 1.089, GBPw: 1.271, JPYw: 0.0067, CADw: 0.735,
      AUDw: 0.654, CHFw: 1.123, CNYw: 0.138, ILSw: 0.274, IRRw: 0.00002381,
      BRLw: 0.20, IDRw: 0.000063, INRw: 0.012, NGNw: 0.00067, PKRw: 0.0036, RUBw: 0.011,
      MINIMA: 0.00846, Winiwa: 0.00846, xWiniwa: 0.09529
    };
    return map[code] || 1;
  }

  function txAmountUsd(tx) {
    return Math.abs(Number(tx?.amt || 0)) * usdRateForCcy(tx?.ccy);
  }

  function getCurrentRaterAddress() {
    const addr = String(document.getElementById('walletAddr')?.title || '').trim();
    if (addr && !addr.toLowerCase().includes('loading')) return addr;
    return 'MxDEMO_RATER_ADDRESS';
  }

  function getEligibleShopTransactions(shopName) {
    return activitySource()
      .filter(tx => tx.counterparty === shopName && tx.dir === 'out' && !deletedTx.has(tx.id))
      .slice()
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  function getShopSpendUsd(shopName) {
    return getEligibleShopTransactions(shopName).reduce((sum, tx) => sum + txAmountUsd(tx), 0);
  }

  function getShopRatingRows(shopName) {
    return merchantRatings.filter(r => r && r.shopName === shopName && r.status !== 'deleted');
  }

  function getShopRatingSummary(shopName) {
    const rows = getShopRatingRows(shopName);
    if (!rows.length) return { count: 0, weighted: 0, rounded: 0 };
    let weightedNum = 0;
    let weightedDen = 0;
    rows.forEach(r => {
      const score = Number(r.score || 0);
      const weight = Math.max(1, Number(r.weightUSD || 1));
      if (score > 0) {
        weightedNum += score * weight;
        weightedDen += weight;
      }
    });
    const weighted = weightedDen > 0 ? (weightedNum / weightedDen) : 0;
    return { count: rows.length, weighted, rounded: Math.round(weighted * 10) / 10 };
  }

  function buildMerchantRatingSummaryHtml(shopName) {
    const sum = getShopRatingSummary(shopName);
    const score = sum.count ? sum.rounded : 4.5;
    const starsHtml = buildStarsHtml(score, 14);
    const meta = sum.count
      ? `${sum.count} reviews · weighted by spent amount`
      : 'Demo rating preview';
    return `<div  style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <div style="display:flex;gap:2px;align-items:center" aria-label="Merchant rating stars">${starsHtml}</div>
      </div>
      <div class="xs mu"  style="margin-top:6px">${meta}</div>`;
  }

  function renderSpendShopRatingBadges() {
    document.querySelectorAll('[data-stables-shop]').forEach(card => {
      const name = card.getAttribute('data-stables-shop');
      if (!name) return;
      let row = card.querySelector('.shop-rating-line');
      if (!row) {
        row = document.createElement('div');
        row.className = 'shop-rating-line';
        row.style.cssText = 'margin-top:6px;font-size:11px;font-weight:800;color:var(--m)';
        const info = card.querySelector('.minfo');
        if (info) info.appendChild(row);
      }
      const sum = getShopRatingSummary(name);
      const score = sum.count ? sum.rounded : 4.5;
      row.innerHTML = `<span style="display:flex;gap:2px;align-items:center">${buildStarsHtml(score, 12)}</span>`;
    });
  }

  function buildStarsHtml(score, sizePx) {
    const filled = Math.max(0, Math.min(5, Math.floor(score)));
    return Array.from({ length: 5 }, (_, i) => {
      const active = i < filled;
      return `<span style="font-size:${sizePx}px;line-height:1;color:${active ? '#fbbf24' : 'rgba(255,255,255,.35)'}">${active ? '★' : '☆'}</span>`;
    }).join('');
  }

  window.openMerchantRatingComposer = function (shopName, prefillTxId) {
    const shop = SHOP_PROFILES[shopName];
    if (!shop) return;
    pendingMerchantRatingShop = shopName;
    const raterAddress = getCurrentRaterAddress();
    const txs = getEligibleShopTransactions(shopName);
    const spendUsd = getShopSpendUsd(shopName);
    const canRate = spendUsd >= MERCHANT_RATING_MIN_SPEND_USD;
    const txOptions = txs.map(tx => {
      const usd = txAmountUsd(tx);
      const label = `${tx.id} · ${Number(Math.abs(tx.amt) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${tx.ccy} (~$${Number(usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
      return `<option value="${escUi(tx.id)}" ${prefillTxId === tx.id ? 'selected' : ''}>${escUi(label)}</option>`;
    }).join('');
    const existing = merchantRatings.find(r => r.shopName === shopName && r.raterAddress === raterAddress && r.status !== 'deleted');
    const existingNote = existing ? '<div class="xs mu"  style="margin-bottom:8px">You already reviewed this merchant. Submitting again updates your signed review after cooldown.</div>' : '';
    const disabled = (!canRate || !txs.length) ? 'disabled' : '';
    const body = `<div  style="padding:10px;border-radius:10px;margin-bottom:10px">
      <div  style="font-size:13px;font-weight:900;color:var(--t)">Rate ${escUi(shopName)}</div>
      <div class="xs mu"  style="margin-top:6px">Framework (preview): onchain + signed by interacting address; weighted by spent amount to reduce spam.</div>
    </div>
    <div  style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div  style="padding:10px;border-radius:10px"><div class="xs mu">Interacted spend</div><div  style="font-size:13px;font-weight:800;margin-top:4px">$${Number(spendUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
      <div  style="padding:10px;border-radius:10px"><div class="xs mu">Signer address</div><div  style="font-size:12px;font-weight:800;margin-top:4px;word-break:break-all">${escUi(raterAddress)}</div></div>
    </div>
    ${existingNote}
    <label class="flabel" style="margin-bottom:6px">Score</label>
    <select data-mx-dropdown id="merchantRateScore" class="fsel" style="margin-bottom:10px">
      <option value="5">5 · Excellent</option><option value="4">4 · Good</option><option value="3" selected>3 · Neutral</option><option value="2">2 · Weak</option><option value="1">1 · Poor</option>
    </select>
    <label class="flabel" style="margin-bottom:6px">Linked transaction</label>
    <select data-mx-dropdown id="merchantRateTx" class="fsel" style="margin-bottom:10px">${txOptions || '<option value="">No eligible payments yet</option>'}</select>
    <label class="flabel" style="margin-bottom:6px">Comment (optional)</label>
    <textarea id="merchantRateComment" class="finput" rows="3" maxlength="${MERCHANT_RATING_MAX_COMMENT}" placeholder="Share your experience..." style="resize:vertical;margin-bottom:12px"></textarea>
    <div class="xs mu"  style="margin-bottom:12px">Anti-spam in this framework: one signed review per merchant/address, cooldown between edits, and weight from linked spend amount.</div>
    <div class="flex gap8"  style="justify-content:center"><button class="btn btn-w btn-g" ${disabled} onclick="submitMerchantRating()">Submit signed review</button></div>
    ${!canRate ? `<div class="xs mu"  style="margin-top:10px;color:var(--am)">Need at least $${Number(MERCHANT_RATING_MIN_SPEND_USD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} spent with this merchant to rate.</div>` : ''}`;
    document.getElementById('agentActionTitle').textContent = 'Merchant rating';
    const titleRight = document.getElementById('agentActionTitleRight');
    if (titleRight) titleRight.innerHTML = '';
    document.getElementById('agentActionContent').innerHTML = body;
    document.getElementById('agentActionModal').classList.add('open');
  };

  window.submitMerchantRating = function () {
    const shopName = pendingMerchantRatingShop;
    if (!shopName) return;
    const score = Math.max(1, Math.min(5, parseInt(document.getElementById('merchantRateScore')?.value || '3', 10)));
    const txId = String(document.getElementById('merchantRateTx')?.value || '').trim();
    const commentRaw = String(document.getElementById('merchantRateComment')?.value || '').trim();
    const comment = commentRaw.slice(0, MERCHANT_RATING_MAX_COMMENT);
    const tx = getTxById(txId);
    if (!tx || tx.counterparty !== shopName || tx.dir !== 'out') {
      if (typeof window.showToast === 'function') window.showToast('Choose a valid linked payment first');
      return;
    }
    const raterAddress = getCurrentRaterAddress();
    const spendUsd = getShopSpendUsd(shopName);
    if (spendUsd < MERCHANT_RATING_MIN_SPEND_USD) {
      if (typeof window.showToast === 'function') window.showToast(`Need at least $${Number(MERCHANT_RATING_MIN_SPEND_USD || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} spent to rate`);
      return;
    }
    const now = Date.now();
    const existing = merchantRatings.find(r => r.shopName === shopName && r.raterAddress === raterAddress && r.status !== 'deleted');
    if (existing && (now - Number(existing.updatedAt || existing.createdAt || 0)) < MERCHANT_RATING_COOLDOWN_MS) {
      if (typeof window.showToast === 'function') window.showToast('Please wait before updating this review again');
      return;
    }
    const review = {
      reviewId: existing?.reviewId || `MR-${shopName}-${raterAddress}-${now}`,
      shopName,
      raterAddress,
      linkedTxId: tx.id,
      linkedTxAmount: Math.abs(Number(tx.amt || 0)),
      linkedTxCurrency: tx.ccy,
      weightUSD: Math.max(1, Math.min(300, txAmountUsd(tx))),
      score,
      comment,
      status: 'active',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      // Onchain/signature scaffold for future implementation.
      onchain: {
        network: 'minima',
        signerAddress: raterAddress,
        signature: 'pending_wallet_signature',
        anchorTxId: 'pending_onchain_anchor',
        spamGuard: { minSpendUSD: MERCHANT_RATING_MIN_SPEND_USD, cooldownMs: MERCHANT_RATING_COOLDOWN_MS }
      }
    };
    if (existing) {
      const idx = merchantRatings.indexOf(existing);
      if (idx >= 0) merchantRatings[idx] = review;
    } else {
      merchantRatings.push(review);
    }
    persistMerchantRatings();
    renderSpendShopRatingBadges();
    if (typeof window.renderContactsPage === 'function') window.renderContactsPage();
    if (typeof window.showToast === 'function') window.showToast('Merchant review saved (signed/onchain framework)');
    window.openShopProfile(shopName);
  };

  window.openSelectedContactMerchantRating = function () {
    if (!selectedContactName || !SHOP_PROFILES[selectedContactName]) return;
    window.openMerchantRatingComposer(selectedContactName);
  };

  window.openTxMerchantRating = function () {
    const tx = getTxById(selectedTxId);
    if (!tx || !SHOP_PROFILES[tx.counterparty]) return;
    window.openMerchantRatingComposer(tx.counterparty, tx.id);
  };

  window.openMerchantValidationComposer = function (shopName) {
    const shopNameSafe = normalizeId(shopName) || 'My merchant';
    pendingMerchantValidationShop = shopNameSafe;
    const suggestedUser = normalizeId(selectedContactName && CONTACTS_BOOK.has(selectedContactName) ? CONTACTS_BOOK.get(selectedContactName).address : '');
    const body = `<div  style="padding:10px;border-radius:10px;margin-bottom:10px">
      <div  style="font-size:13px;font-weight:900;color:var(--t)">Validate participant from ${escUi(shopNameSafe)}</div>
      <div class="xs mu"  style="margin-top:6px">Pseudonymous trust anchor (phase 1): one validation per merchant + user pair.</div>
    </div>
    <label class="flabel" style="margin-bottom:6px">Merchant id</label>
    <input id="merchantValidationMerchantId" class="finput" value="${escUi(shopName)}" style="margin-bottom:10px" />
    <label class="flabel" style="margin-bottom:6px">User id (address / pseudonymous id)</label>
    <input id="merchantValidationUserId" class="finput" placeholder="Mx..." value="${escUi(suggestedUser)}" style="margin-bottom:10px" />
    <label class="flabel" style="margin-bottom:6px">Settlement link (optional tx id)</label>
    <input id="merchantValidationTxRef" class="finput" placeholder="0x... or TX-..." style="margin-bottom:12px" />
    <div class="xs mu"  style="margin-bottom:12px">Validation is one-time for this merchant/user pair and contributes to the Trust Score.</div>
    <div class="flex gap8"  style="justify-content:center"><button class="btn btn-w btn-g" onclick="submitMerchantValidation()">Issue validation</button></div>`;
    document.getElementById('agentActionTitle').textContent = 'Merchant validation';
    const titleRight = document.getElementById('agentActionTitleRight');
    if (titleRight) titleRight.innerHTML = '';
    document.getElementById('agentActionContent').innerHTML = body;
    document.getElementById('agentActionModal').classList.add('open');
  };

  window.submitMerchantValidation = function () {
    if (!pendingMerchantValidationShop) return;
    const svc = window.StablesTrustRetro;
    if (!svc || typeof svc.issueMerchantValidation !== 'function') {
      if (typeof window.showToast === 'function') window.showToast('Trust module not loaded');
      return;
    }
    const merchantId = normalizeId(document.getElementById('merchantValidationMerchantId')?.value || pendingMerchantValidationShop);
    const userId = normalizeId(document.getElementById('merchantValidationUserId')?.value || '');
    const txRef = normalizeId(document.getElementById('merchantValidationTxRef')?.value || '');
    if (!merchantId || !userId) {
      if (typeof window.showToast === 'function') window.showToast('Merchant id and user id are required');
      return;
    }
    const out = svc.issueMerchantValidation({ merchant_id: merchantId, user_id: userId, tx_ref: txRef || null });
    if (!out || !out.ok) {
      if (typeof window.showToast === 'function') window.showToast((out && out.error) || 'Validation failed');
      return;
    }
    const profile = svc.upsertTrustProfile(userId);
    if (typeof window.showToast === 'function') {
      window.showToast(`Validation issued. Trust score now ${profile.trust_score_v1}`);
    }
    if (SHOP_PROFILES[pendingMerchantValidationShop]) {
      window.openShopProfile(pendingMerchantValidationShop);
    } else if (typeof window.closeAgentActionModal === 'function') {
      window.closeAgentActionModal();
    }
  };

  window.setActivityFilter = function (f) {
    activityFilter = f;
    ['actFilterAll', 'actFilterIn', 'actFilterOut', 'actFilterHidden'].forEach(id => {
      const control = document.getElementById(id);
      control?.classList.remove('active');
      control?.setAttribute('aria-pressed', 'false');
    });
    if (f === 'in') document.getElementById('actFilterIn')?.classList.add('active');
    if (f === 'out') document.getElementById('actFilterOut')?.classList.add('active');
    if (f === 'hidden') document.getElementById('actFilterHidden')?.classList.add('active');
    if (f === 'all') document.getElementById('actFilterAll')?.classList.add('active');
    const activeFilter = f === 'in' ? 'actFilterIn' : (f === 'out' ? 'actFilterOut' : (f === 'hidden' ? 'actFilterHidden' : 'actFilterAll'));
    document.getElementById(activeFilter)?.setAttribute('aria-pressed', 'true');
    activityPage = 0;
    window.renderActivity();
  };

  window.setActivityCcyFilter = function (f) {
    activityCcyFilter = f;
    const sel = document.getElementById('actCcySelect');
    if (sel) sel.value = f || 'all';
    activityPage = 0;
    window.renderActivity();
  };

  window.resetActivityFilters = function () {
    activityFilter = 'all';
    activityCcyFilter = 'all';
    activityTimeframe = 'all';
    activityPeriod = 'all';
    activityDateFrom = '';
    activityDateTo = '';
    ['actFilterAll', 'actFilterIn', 'actFilterOut', 'actFilterHidden'].forEach(id => {
      const control = document.getElementById(id);
      control?.classList.remove('active');
      control?.setAttribute('aria-pressed', 'false');
    });
    document.getElementById('actFilterAll')?.classList.add('active');
    document.getElementById('actFilterAll')?.setAttribute('aria-pressed', 'true');
    const ccySel = document.getElementById('actCcySelect');
    if (ccySel) ccySel.value = 'all';
    const timeSel = document.getElementById('actTimeSelect');
    if (timeSel) timeSel.value = 'all';
    const dateRow = document.getElementById('actDateRangeRow');
    if (dateRow) dateRow.hidden = true;
    // Reset clears the app-drawn day/month/year controls as well as the hidden ISO values,
    // so the visible range can never disagree with the range that is filtering.
    activityDateClearParts();
    activityPage = 0;
    window.renderActivity();
  };

  window.setActivitySort = function (mode) {
    activitySort = mode === 'amount_desc' ? 'amount_desc' : 'date_desc';
    document.getElementById('actSortDate')?.classList.remove('active');
    document.getElementById('actSortAmount')?.classList.remove('active');
    document.getElementById('actSortDate')?.setAttribute('aria-pressed', 'false');
    document.getElementById('actSortAmount')?.setAttribute('aria-pressed', 'false');
    if (activitySort === 'date_desc') document.getElementById('actSortDate')?.classList.add('active');
    if (activitySort === 'amount_desc') document.getElementById('actSortAmount')?.classList.add('active');
    document.getElementById(activitySort === 'date_desc' ? 'actSortDate' : 'actSortAmount')?.setAttribute('aria-pressed', 'true');
    activityPage = 0;
    window.renderActivity();
  };

  window.setActivityTimeframe = function (mode) {
    activityTimeframe = ['today', 'week', 'month', 'year'].includes(mode) ? mode : 'all';
    ['actTimeframeAll', 'actTimeframeToday', 'actTimeframeWeek', 'actTimeframeMonth', 'actTimeframeYear'].forEach(id => document.getElementById(id)?.classList.remove('on'));
    if (activityTimeframe === 'today') document.getElementById('actTimeframeToday')?.classList.add('on');
    else if (activityTimeframe === 'week') document.getElementById('actTimeframeWeek')?.classList.add('on');
    else if (activityTimeframe === 'month') document.getElementById('actTimeframeMonth')?.classList.add('on');
    else if (activityTimeframe === 'year') document.getElementById('actTimeframeYear')?.classList.add('on');
    else document.getElementById('actTimeframeAll')?.classList.add('on');
    activityPage = 0;
    window.renderActivity();
  };

  window.setActivityPeriod = function (mode) {
    activityPeriod = ['7d', '30d', '90d', '365d'].includes(mode) ? mode : 'all';
    ['actPeriodAll', 'actPeriod7d', 'actPeriod30d', 'actPeriod90d', 'actPeriod365d'].forEach(id => document.getElementById(id)?.classList.remove('on'));
    if (activityPeriod === '7d') document.getElementById('actPeriod7d')?.classList.add('on');
    else if (activityPeriod === '30d') document.getElementById('actPeriod30d')?.classList.add('on');
    else if (activityPeriod === '90d') document.getElementById('actPeriod90d')?.classList.add('on');
    else if (activityPeriod === '365d') document.getElementById('actPeriod365d')?.classList.add('on');
    else document.getElementById('actPeriodAll')?.classList.add('on');
    activityPage = 0;
    window.renderActivity();
  };

  window.setActivityDateRange = function (fromValue, toValue) {
    activityDateFrom = String(fromValue || '').trim();
    activityDateTo = String(toValue || '').trim();
    activityPage = 0;
    window.renderActivity();
  };

  /* ---------------------------------------------------------------------------
   * App-drawn custom date range (D023 law 1).
   *
   * `<input type="date">` handed the whole choice to Android, which drew a grey
   * platform sheet next to the app's own Currency and Period dropdowns on the same
   * page. That is the exact failure D023 was written about, and no document-based
   * gate can see inside an operating-system surface.
   *
   * Each bound is three registered MNU-001 dropdowns over one hidden ISO value.
   * No new element definition was needed: day, month and year are the same
   * dropdown with different content, and content is an axis.
   * ------------------------------------------------------------------------- */
  const ACTIVITY_DATE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ACTIVITY_DATE_YEAR_SPAN = 6;

  function activityDatePartEl(bound, part) {
    const prefix = bound === 'to' ? 'activityDateTo' : 'activityDateFrom';
    return document.getElementById(prefix + part);
  }

  function activityDateValueEl(bound) {
    return document.getElementById(bound === 'to' ? 'activityDateTo' : 'activityDateFrom');
  }

  function activityDateFillOptions(select, options, placeholder) {
    if (!select) return;
    const keep = select.value;
    let html = '<option value="">' + placeholder + '</option>';
    for (const option of options) {
      html += '<option value="' + option.value + '">' + option.label + '</option>';
    }
    select.innerHTML = html;
    // Keep a chosen part when the list is rebuilt, so changing month does not silently drop a day.
    select.value = [...select.options].some(o => o.value === keep) ? keep : '';
  }

  function activityDateDaysInMonth(year, month) {
    if (!month) return 31;
    const y = year ? Number(year) : 2024; // a leap year, so 29 stays offered until a year is chosen
    return new Date(y, Number(month), 0).getDate();
  }

  function activityDateSyncDays(bound) {
    const daySel = activityDatePartEl(bound, 'Day');
    if (!daySel) return;
    const month = activityDatePartEl(bound, 'Month')?.value || '';
    const year = activityDatePartEl(bound, 'Year')?.value || '';
    const count = activityDateDaysInMonth(year, month);
    const current = Number(daySel.value || 0);
    const days = [];
    for (let d = 1; d <= count; d += 1) days.push({ value: String(d), label: String(d) });
    activityDateFillOptions(daySel, days, 'Day');
    // A 31st that no longer exists in the chosen month is dropped rather than silently kept.
    daySel.value = current >= 1 && current <= count ? String(current) : '';
  }

  function activityDateBuildParts() {
    const thisYear = new Date().getFullYear();
    for (const bound of ['from', 'to']) {
      const monthSel = activityDatePartEl(bound, 'Month');
      const yearSel = activityDatePartEl(bound, 'Year');
      if (monthSel && !monthSel.options.length) {
        activityDateFillOptions(monthSel,
          ACTIVITY_DATE_MONTHS.map((label, index) => ({ value: String(index + 1), label })), 'Month');
      }
      if (yearSel && !yearSel.options.length) {
        const years = [];
        for (let i = 0; i < ACTIVITY_DATE_YEAR_SPAN; i += 1) {
          years.push({ value: String(thisYear - i), label: String(thisYear - i) });
        }
        activityDateFillOptions(yearSel, years, 'Year');
      }
      activityDateSyncDays(bound);
    }
    try { window.stablesSyncDropdowns?.(document); } catch (_) { /* the settle scan will catch it */ }
  }

  function activityDateCompose(bound) {
    const day = activityDatePartEl(bound, 'Day')?.value || '';
    const month = activityDatePartEl(bound, 'Month')?.value || '';
    const year = activityDatePartEl(bound, 'Year')?.value || '';
    // A bound filters only when it is a whole date. A half-chosen date narrows nothing.
    if (!day || !month || !year) return '';
    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }

  window.setActivityDatePart = function (bound) {
    const which = bound === 'to' ? 'to' : 'from';
    activityDateSyncDays(which);
    const value = activityDateCompose(which);
    const valueEl = activityDateValueEl(which);
    if (valueEl) valueEl.value = value;
    window.setActivityDateRange(
      activityDateValueEl('from')?.value || '',
      activityDateValueEl('to')?.value || ''
    );
  };

  function activityDateClearParts() {
    for (const bound of ['from', 'to']) {
      for (const part of ['Day', 'Month', 'Year']) {
        const el = activityDatePartEl(bound, part);
        if (el && el.value) { el.value = ''; el.dispatchEvent(new Event('change', { bubbles: true })); }
      }
      const valueEl = activityDateValueEl(bound);
      if (valueEl) valueEl.value = '';
    }
  }

  window.clearActivityDateRange = function () {
    if (!activityDateFrom && !activityDateTo) { activityDateClearParts(); return; }
    activityDateClearParts();
    window.setActivityDateRange('', '');
  };

  window.stablesBuildActivityDateParts = activityDateBuildParts;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activityDateBuildParts);
  } else {
    activityDateBuildParts();
  }

  window.setActivitySearch = function (value) { activitySearch = String(value || ''); activityPage = 0; window.renderActivity(); };
  window.showNextActivityPage = function () { const items = getFilteredActivity(); const maxPage = Math.max(0, Math.ceil(items.length / ACTIVITY_PAGE_SIZE) - 1); activityPage = Math.min(maxPage, activityPage + 1); window.renderActivity(); };
  window.showPrevActivityPage = function () { activityPage = Math.max(0, activityPage - 1); window.renderActivity(); };

  function txListLoadingHtml(msg) {
    return '<div class="tx-list-state" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:18px 12px;color:var(--m);font-size:13px;font-weight:600">'
      + '<span style="display:inline-block;font-size:16px;color:var(--c);animation:txRefreshSpin .8s linear infinite">⟳</span>'
      + '<span>' + (msg || 'Loading transaction history…') + '</span></div>';
  }
  function txListEmptyHtml(msg) {
    return '<div class="tx-list-state" style="text-align:center;padding:16px 12px;color:var(--m);font-size:13px">' + (msg || 'No transactions yet.') + '</div>';
  }

  function makeTransactionRowClickable(row, txId) {
    if (!row || !txId) return;
    row.dataset.txId = String(txId);
    row.dataset.txAction = 'open-transaction';
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-label', 'Open transaction details');
    row.style.cursor = 'pointer';
    if (String(row.tagName || '').toUpperCase() === 'BUTTON') row.type = 'button';
    row.onclick = function (ev) {
      return openTransactionRowFromEvent(row, ev);
    };
    row.onkeydown = function (ev) {
      const key = ev && (ev.key || ev.code);
      if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
        return openTransactionRowFromEvent(row, ev);
      }
      return true;
    };
  }

  function openTransactionRowFromEvent(row, ev) {
    if (!row) return;
    const txId = resolveTransactionRowId(row);
    return openTransactionRowById(txId, ev);
  }

  function jsStringLiteral(value) {
    return JSON.stringify(String(value || ''));
  }

  function openTransactionRowById(txId, ev) {
    if (ev && ev.__stablesTxRowHandled) return false;
    if (ev) {
      try { ev.__stablesTxRowHandled = true; } catch (_) { /* ignore */ }
      if (typeof ev.preventDefault === 'function') ev.preventDefault();
      if (typeof ev.stopPropagation === 'function') ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
    }
    if (!txId || typeof window.openActivityDetail !== 'function') return false;
    try {
      window.openActivityDetail(txId);
    } catch (err) {
      openFallbackActivityDetail(txId, err);
    }
    return false;
  }
  window.stablesOpenTransactionRowById = openTransactionRowById;

  function currentActivityPageItems() {
    const items = sortActivityItems(getFilteredActivity());
    const start = activityPage * ACTIVITY_PAGE_SIZE;
    return items.slice(start, Math.min(items.length, start + ACTIVITY_PAGE_SIZE));
  }

  function currentWalletRecentItems() {
    return sortActivityItems(
      activitySource().filter(x => !deletedTx.has(x.id) && !hiddenTx.has(x.id) && !hiddenShops.has(x.counterparty))
    ).slice(0, 10);
  }

  function resolveTransactionRowId(row) {
    if (!row) return '';
    const existing = row.dataset ? String(row.dataset.txId || '') : '';
    if (existing) return existing;
    const list = row.closest ? row.closest('#activityList, #walletRecentList') : null;
    if (!list) return '';
    const rows = Array.prototype.slice.call(list.querySelectorAll('.tx-row'));
    const idx = rows.indexOf(row);
    if (idx < 0) return '';
    const items = list.id === 'activityList' ? currentActivityPageItems() : currentWalletRecentItems();
    const tx = items[idx];
    const txId = tx && tx.id ? String(tx.id) : '';
    if (txId && row.dataset) row.dataset.txId = txId;
    return txId;
  }

  function hydrateTransactionRows(listId, items) {
    const list = document.getElementById(listId);
    if (!list) return;
    Array.prototype.slice.call(list.querySelectorAll('.tx-row')).forEach(function (row, idx) {
      const tx = items && items[idx];
      const txId = tx && tx.id ? String(tx.id) : (row.dataset ? row.dataset.txId : '');
      if (txId) makeTransactionRowClickable(row, txId);
    });
  }

  function hydrateVisibleTransactionRows() {
    hydrateTransactionRows('activityList', currentActivityPageItems());
    hydrateTransactionRows('walletRecentList', currentWalletRecentItems());
  }

  function openFallbackActivityDetail(txId, err) {
    const tx = getTxById(txId);
    const titleEl = document.getElementById('agentActionTitle');
    const contentEl = document.getElementById('agentActionContent');
    const modal = document.getElementById('agentActionModal');
    if (!titleEl || !contentEl || !modal || !tx) return;
    selectedTxId = tx.id;
    const amtDisp = activityAmtSignedDisplay(tx);
    titleEl.textContent = 'Transaction details';
    const titleRight = document.getElementById('agentActionTitleRight');
    if (titleRight) titleRight.innerHTML = transactionDetailsAgentButtonHtml();
    const fallbackTxHash = normalizeTxHash(tx.explorerTxId) || nodeTxpowHashFromActivityId(tx.id);
    const fallbackTxRef = fallbackTxHash
      ? '<a href="' + escUi(txExplorerUrl(tx)) + '" target="_blank" rel="noopener noreferrer" title="' + escUi(fallbackTxHash) + '" class="btn" style="width:auto;padding:0;border:none;background:none;font-size:12px;font-weight:900;color:var(--c);text-decoration:underline;text-align:left">View transaction</a>'
      : '<div style="font-size:12px;font-weight:800;color:var(--m)">Transaction details are syncing.</div>';
    contentEl.innerHTML = '<div style="margin-bottom:12px;font-size:16px;font-weight:900;color:var(--t)">'
      + escUi(tx.title || 'Transaction')
      + '</div><div class="xs mu" style="margin-bottom:10px">'
      + escUi(tx.date || '')
      + '</div><div class="tx-amt ' + amtDisp.cls + ' bal-amount" style="margin-bottom:10px">'
      + amtDisp.sign + amtDisp.value + ' ' + escUi(tx.ccy || '')
      + '</div><div style="margin-bottom:10px">'
      + fallbackTxRef
      + '</div><div class="xs mu">Some optional detail fields were incomplete, so this row opened in compact mode.</div>';
    modal.classList.remove('agent-action-notice');
    modal.classList.add('open');
    const panel = modal.querySelector('.modal');
    if (panel) panel.scrollTop = 0;
    try { console.warn('[Stables] Compact transaction detail fallback', err); } catch (_) { /* ignore */ }
  }

  function transactionDetailsAgentButtonHtml() {
    // Contextual agent icons were removed app-wide; help will be surfaced from the main agent later.
    return '';
  }

  function installTransactionListClickDelegates() {
    installTransactionDocumentRouter();
    ['activityList', 'walletRecentList'].forEach(function (id) {
      const list = document.getElementById(id);
      if (!list || list.dataset.txClickDelegate === '1') return;
      list.dataset.txClickDelegate = '1';
      list.addEventListener('click', function (ev) {
        const row = ev.target && ev.target.closest ? ev.target.closest('.tx-row') : null;
        if (!row || !list.contains(row)) return;
        openTransactionRowFromEvent(row, ev);
      });
      list.addEventListener('keydown', function (ev) {
        const key = ev && (ev.key || ev.code);
        if (key !== 'Enter' && key !== ' ' && key !== 'Spacebar') return;
        const row = ev.target && ev.target.closest ? ev.target.closest('.tx-row') : null;
        if (!row || !list.contains(row)) return;
        openTransactionRowFromEvent(row, ev);
      });
    });
  }

  function installTransactionDocumentRouter() {
    if (!document || !document.body || document.body.dataset.stablesTxRowRouter === '1') return;
    document.body.dataset.stablesTxRowRouter = '1';
    document.addEventListener('click', function (ev) {
      const row = ev.target && ev.target.closest
        ? ev.target.closest('#activityList .tx-row, #walletRecentList .tx-row')
        : null;
      if (!row) return;
      openTransactionRowFromEvent(row, ev);
    }, true);
  }

  // ONE transaction, ONE row (founder 2026-07-07): a covenant mint/burn stores two legs
  // (spend + receive — the per-currency balance machinery needs both), but the user must see
  // a single transaction. Merge leg-pairs at RENDER time: the receive side is primary, the
  // spend amount becomes a secondary line, and the pair shows the less-settled status.
  function stablesGroupCovenantLegs(items) {
    // A covenant mint/burn can be represented by up to THREE stored rows: the two optimistic
    // legs (which may lack dir/ccy/minimaOnChain entirely) plus the mirror's imported leg —
    // group EVERYTHING sharing the transaction id into one rendered row. Direction is derived
    // from title/amount when the field is absent; duplicated spend legs dedupe to one line.
    const tsOf = function (x) { const m = String(x.id || '').match(/-(\d{10})\d*$/); return m ? m[1] : ''; };
    // A flow stamps the same flowId on both optimistic legs at creation, so the pair renders
    // as ONE row from the very first paint. The txid arrives later (and on the node-mirror
    // row, which has no flowId) — so keys are unioned: any row carrying BOTH aliases its
    // tx-key to the flow-key, and mixed groups can never split mid-flight.
    const txKeyAlias = {};
    (items || []).forEach(function (x) {
      if (!x || !x.flowId) return;
      const tx = String(x.explorerTxId || '').toLowerCase();
      if (tx) txKeyAlias['tx:' + tx.slice(0, 24)] = 'f:' + x.flowId;
      const p = String(x.pendingTxnId || '').toLowerCase();
      if (p) txKeyAlias['p:' + p] = 'f:' + x.flowId;
    });
    const keyOf = function (x) {
      if (x.flowId) return 'f:' + x.flowId;
      const tx = String(x.explorerTxId || '').toLowerCase();
      if (tx) { const k = 'tx:' + tx.slice(0, 24); return txKeyAlias[k] || k; }
      const p = String(x.pendingTxnId || '').toLowerCase();
      if (p) { const k = 'p:' + p; return txKeyAlias[k] || k; }
      const t = tsOf(x);
      return t ? ('ts:' + t) : '';
    };
    const isLeg = function (x) {
      return !!x && (
        /protocol \((usdw|xwiniwa)\)/i.test(String(x.counterparty || '')) ||
        /^(mint|burn)-/i.test(String(x.id || '')) ||
        /^(mint(ing|ed)|burn(ing|ed)|lock(ing|ed)|reclaim(ing|ed))\b/i.test(String(x.title || ''))
      );
    };
    const dirOf = function (x) {
      if (x.dir === 'in' || x.dir === 'out') return x.dir;
      const amt = Number(x.amt);
      if (Number.isFinite(amt) && amt !== 0) return amt > 0 ? 'in' : 'out';
      return /^(mint(ing|ed)|reclaim(ing|ed)|receiv)/i.test(String(x.title || '')) ? 'in' : 'out';
    };
    const rank = function (s) {
      const m = { 'Failed': 0, 'Pending': 1, 'Broadcasted': 2, 'Sending': 3, 'Receiving': 3, 'On-chain': 4, 'Sent': 5, 'Received': 5, 'Confirmed': 6 };
      return (m[String(s)] != null) ? m[String(s)] : 3;
    };
    const pickBest = function (rows) {
      // Prefer a row with a real amount, then the more-settled one (mirror rows carry both).
      return rows.slice().sort(function (a, b) {
        const aAmt = Number.isFinite(Number(a.amt)) && Number(a.amt) !== 0 ? 1 : 0;
        const bAmt = Number.isFinite(Number(b.amt)) && Number(b.amt) !== 0 ? 1 : 0;
        if (aAmt !== bAmt) return bAmt - aAmt;
        return rank(b.status) - rank(a.status);
      })[0];
    };
    const groups = new Map(); const order = [];
    items.forEach(function (x) {
      if (!x) return;
      const k = isLeg(x) ? keyOf(x) : '';
      const gk = k || ('solo:' + String(x.id));
      if (!groups.has(gk)) { groups.set(gk, []); order.push(gk); }
      groups.get(gk).push(x);
    });
    const out = [];
    order.forEach(function (gk) {
      const g = groups.get(gk);
      if (g.length === 1 || gk.indexOf('solo:') === 0) { out.push(g[0]); return; }
      const hasAmt = function (x) { const n = Number(x.amt); return Number.isFinite(n) && n !== 0; };
      const ins = g.filter(function (x) { return dirOf(x) === 'in'; });
      const outs = g.filter(function (x) { return dirOf(x) === 'out'; });
      const insWithAmt = ins.filter(hasAmt);
      let primary, spend = outs.length ? pickBest(outs) : null;
      if (insWithAmt.length) {
        primary = pickBest(insWithAmt);
      } else if (spend && hasAmt(spend)) {
        // Historic receive legs can have lost their amount in old upserts — never render "+0";
        // show the spend leg alone (still ONE row for the transaction).
        primary = spend; spend = null;
      } else {
        primary = pickBest(g); spend = null;
      }
      const merged = Object.assign({}, primary);
      let worst = merged.status;
      g.forEach(function (x) { if (rank(x.status) < rank(worst)) worst = x.status; });
      merged.status = worst;
      // The best-informed row can be a bare status-upsert (amount + txid but no display
      // fields — rendered literal "undefined · undefined"); borrow what the other legs
      // of the same transaction still carry.
      ['date', 'counterparty', 'icon', 'category', 'directionLabel', 'title'].forEach(function (f) {
        if (merged[f]) return;
        for (let gi = 0; gi < g.length; gi++) { if (g[gi][f]) { merged[f] = g[gi][f]; break; } }
      });
      if (spend && primary !== spend) merged.__legSpend = spend;
      out.push(merged);
    });
    // Last-resort display defaults: whatever reaches a template must never print "undefined".
    out.forEach(function (x) {
      if (!x) return;
      if (!x.icon) x.icon = (x.dir === 'out') ? '↗' : '↙';
      if (!x.date) {
        const ts = Number(x.ts) || Number((String(x.id || '').match(/(\d{13})/) || [])[1]) || 0;
        if (ts > 1500000000000) {
          const d = new Date(ts);
          x.date = d.toLocaleString('en-GB', { month: 'short', day: '2-digit' })
            + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        } else x.date = '';
      }
      if (!x.counterparty) {
        const t = String(x.title || '');
        x.counterparty = /usdw/i.test(t) ? 'Protocol (USDw)'
          : (/xwiniwa/i.test(t) ? 'Protocol (xWiniwa)'
            : (/faucet|pour/i.test(t) ? 'On-chain faucet covenant' : ''));
      }
      if (!x.category) x.category = x.counterparty || normalizeActivityCcyLabel(x.ccy) || '';
    });
    return out;
  }

  function stablesLegSpendLineHtml(x) {
    try {
      const spend = x && x.__legSpend;
      if (!spend) return '';
      const disp = activityAmtSignedDisplay(spend);
      const ccy = normalizeActivityCcyLabel(spend.ccy);
      return '<div class="xs mu" style="margin-top:2px;text-align:right">' + disp.sign + disp.value + ' ' + ccy + '</div>';
    } catch (_) { return ''; }
  }

  window.renderActivity = function () {
    installTransactionListClickDelegates();
    const list = document.getElementById('activityList'); if (!list) return;
    const nextBtn = document.getElementById('activityMoreBtn');
    const prevBtn = document.getElementById('activityPrevBtn');
    const items = stablesGroupCovenantLegs(sortActivityItems(getFilteredActivity()));
    const start = activityPage * ACTIVITY_PAGE_SIZE;
    const end = Math.min(items.length, start + ACTIVITY_PAGE_SIZE);
    list.innerHTML = '';
    if (!items.length) {
      if (activitySource().length === 0 && _txSyncInFlight) list.innerHTML = txListLoadingHtml('Loading transaction history…');
      else if (activitySource().length === 0) list.innerHTML = txListEmptyHtml('No transactions yet.');
      else list.innerHTML = txListEmptyHtml('No transactions match your filters.');
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      return;
    }
    items.slice(start, end).forEach(x => {
      const row = document.createElement('button');
      row.className = 'tx-row';
      if (suspiciousTx.has(x.id)) row.style.borderColor = 'rgba(248,113,113,.45)';
      const note = getTxNote(x);
      const amtDisp = activityAmtSignedDisplay(x);
      const ccyDisplay = normalizeActivityCcyLabel(x.ccy);
      row.innerHTML = `<div class="tx-ic ${activityIconClass(x)}">${x.icon}</div><div class="tx-info"><div class="tx-t">${x.title}</div><div class="tx-d">${[x.date, (x.minimaOnChain && x.counterparty) ? x.counterparty : x.category].filter(Boolean).join(' · ')}${suspiciousTx.has(x.id) ? ' · Suspicious' : ''}${note ? ' · Note' : ''}</div></div><div class="tx-amt-wrap"><div class="tx-amt ${amtDisp.cls} bal-amount">${amtDisp.sign}${amtDisp.value} ${ccyDisplay}</div>${stablesLegSpendLineHtml(x)}${txConfirmLine(x)}</div>`;
      applyTxRowLadderState(row, x, 'activityList');
      makeTransactionRowClickable(row, x.id);
      list.appendChild(row);
    });
    hydrateTransactionRows('activityList', items.slice(start, end));
    const hasPrev = activityPage > 0;
    const hasNext = end < items.length;
    if (prevBtn) prevBtn.style.display = hasPrev ? '' : 'none';
    if (nextBtn) { nextBtn.style.display = hasNext ? '' : 'none'; if (hasNext) nextBtn.textContent = `See next ${Math.min(25, items.length - end)} ▸`; }
  };

  // A trading row is recognised by the id prefix its creator stamps: order placement (ORD/ORDER/FBA),
  // fills and sweeps (FILL/TAKE), cancels (CANCEL) and liquidity ladders (LP). Matching on the id
  // keeps this in one place; if a new trade action is added, give it a TV81- prefix and it inherits
  // this behaviour rather than reappearing on the Wallet by accident.
  const TRADE_ROW_ID = /^TV81-(ORD|ORDER|FBA|FILL|TAKE|CANCEL|LP)-/i;
  function isTradeActivityRow(row) {
    try { return TRADE_ROW_ID.test(String((row && row.id) || '')); } catch (_) { return false; }
  }
  window.__STABLES_IS_TRADE_ROW__ = isTradeActivityRow;

  window.renderWalletRecentActivity = function () {
    installTransactionListClickDelegates();
    const list = document.getElementById('walletRecentList');
    if (!list) return;
    // Auto-pull node history on boot/re-render even when cached rows exist, so new transactions
    // made outside the app do not wait for an empty cache or a live NEWBALANCE event.
    const rpcCfg = (typeof window.stablesGetRpcConfig === 'function') ? window.stablesGetRpcConfig() : null;
    const canRpcSync = !!(rpcCfg && typeof window.stablesRpcSendCommand === 'function');
    const canMdsSync = !!(typeof window.MDS !== 'undefined' && window.MDS && window.MDS.cmd);
    const lastSyncAt = Number(window._activityLastAutoSync || 0);
    const rpcUrl = String((rpcCfg && rpcCfg.url) || '');
    const localRpc = /\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(rpcUrl);
    const syncStaleMs = activitySource().length === 0 ? 0 : (canRpcSync ? (localRpc ? 4500 : 9000) : 45000);
    if (DEMO_REAL && !_txSyncWorkerActive && !_txSyncInFlight &&
        typeof window.stablesSyncNodeTransactions === 'function' &&
        (canRpcSync || canMdsSync) && (Date.now() - lastSyncAt) > syncStaleMs) {
      window._activityLastAutoSync = Date.now();
      window.stablesSyncNodeTransactions(true);
    }
    // Always kick live balance refresh with preserve on wallet recent render (fixes test token refresh struggles once and for all)
    if (DEMO_REAL && !_txSyncInFlight && typeof window.stablesRefreshLiveNodeBalances === 'function') {
      window.stablesRefreshLiveNodeBalances({ attempts: 2, preserveWiniwa: true }); // deliberately no reason: a repaint is a timer, not an event
    }
    // Trading is reported on the Trade page, not here (founder ruling 2026-07-26). Order placement,
    // fills, sweeps, cancels and liquidity ladders belong to the market surface; the Wallet shows
    // money moving in and out of the wallet. The rows still EXIST and still appear in full Activity,
    // so nothing is lost or hidden, they simply do not crowd the Wallet's recent list.
    let items = stablesGroupCovenantLegs(sortActivityItems(
      activitySource().filter(x => !deletedTx.has(x.id) && !hiddenTx.has(x.id) && !hiddenShops.has(x.counterparty)
        && !isTradeActivityRow(x))
    )).slice(0, 10);
    const faucetStatus = activeFaucetSettlementStatus();
    const faucetPrimary = primaryFaucetSettlementRow(items, faucetStatus);
    items = filterActiveFaucetSettlementRows(items, faucetStatus, faucetPrimary);
    list.innerHTML = '';
    if (!faucetPrimary) renderWalletSettlementBanner(list);
    if (!items.length) {
      if (!list.children.length) {
        list.innerHTML = (_txSyncInFlight && activitySource().length === 0)
          ? txListLoadingHtml('Loading transaction history…')
          : txListEmptyHtml('No recent activity yet.');
      }
      return;
    }
    items.forEach(x => {
      const row = document.createElement('button');
      row.className = 'tx-row';
      if (suspiciousTx.has(x.id)) row.style.borderColor = 'rgba(248,113,113,.45)';
      const faucetDisplay = faucetSettlementDisplayForRow(x, faucetStatus);
      if (faucetDisplay && faucetDisplay.highlight) {
        row.style.borderColor = 'rgba(250, 204, 21, .45)';
        row.style.background = 'rgba(250, 204, 21, .08)';
      }
      const note = getTxNote(x);
      const amtDisp = activityAmtSignedDisplay(x);
      const txTitle = faucetDisplay ? faucetDisplay.title : x.title;
      const txDetail = faucetDisplay
        ? faucetDisplay.detail
        : `${[x.date, (x.minimaOnChain && x.counterparty) ? x.counterparty : x.category].filter(Boolean).join(' · ')}${suspiciousTx.has(x.id) ? ' · Suspicious' : ''}${note ? ' · Note' : ''}`;
      const txConf = faucetDisplay
        ? '<div class="tx-conf-amt tx-conf--confirming">' + faucetDisplay.conf + '</div>'
        : txConfirmLine(x);
      const ccyDisplay = normalizeActivityCcyLabel(x.ccy);
      row.innerHTML = `<div class="tx-ic ${activityIconClass(x)}">${x.icon}</div><div class="tx-info"><div class="tx-t">${txTitle}</div><div class="tx-d">${txDetail}</div></div><div class="tx-amt-wrap"><div class="tx-amt ${amtDisp.cls} bal-amount">${amtDisp.sign}${amtDisp.value} ${ccyDisplay}</div>${stablesLegSpendLineHtml(x)}${txConf}</div>`;
      applyTxRowLadderState(row, x, 'walletRecentList');
      makeTransactionRowClickable(row, x.id);
      list.appendChild(row);
    });
    hydrateTransactionRows('walletRecentList', items);
  };

  window.renderExchangeRecentList = function () {
    if (DEMO_REAL && typeof window.__STABLES_PERSISTED_EXCHANGE_LIST_RENDERER === 'function') {
      return window.__STABLES_PERSISTED_EXCHANGE_LIST_RENDERER();
    }
    const list = document.getElementById('exchangeRecentList');
    if (!list) return;
    list.innerHTML = '';
    DEMO_EXCHANGES.forEach(x => {
      const row = document.createElement('div');
      row.className = 'tx-row';
      row.style.cursor = 'pointer';
      const exFrom = Number(x.fromAmt || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const exTo = Number(x.toAmt || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      row.innerHTML = `<div class="tx-ic" >⇄</div><div class="tx-info"><div class="tx-t">${x.fromCcy} → ${x.toCcy}</div><div class="tx-d">${x.date}${x.status === 'Pending' ? ' · Pending' : ''}</div></div><div class="tx-amt bal-amount"  style="color:var(--c)">${exFrom} → ${exTo}</div>`;
      row.addEventListener('click', () => window.openExchangeDetail(x.id));
      list.appendChild(row);
    });
  };

  window.openExchangeDetail = function (id) {
    const ex = getExchangeById(id);
    if (!ex) return;
    selectedExchangeId = id;
    const statusColor = ex.status === 'Confirmed' ? 'var(--gr)' : 'var(--am)';
    const body = `<div  style="margin-bottom:8px;display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:${statusColor};display:inline-block"></span><span class="xs mu">${ex.status}</span></div>
      <div  style="padding:12px;border-radius:12px;margin-bottom:10px">
        <div class="fbet"><div><div  style="font-size:16px;font-weight:900;color:var(--t)">${ex.fromCcy} → ${ex.toCcy}</div><div class="xs mu">Currency conversion</div></div><div  style="text-align:right"><div class="tx-amt bal-amount"  style="color:var(--t)">−${Number(ex.fromAmt || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${ex.fromCcy}</div><div class="xs mu"  style="color:var(--gr)">+${Number(ex.toAmt || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${ex.toCcy}</div></div></div>
      </div>
      <div class="flex gap8"  style="margin-bottom:10px;flex-wrap:wrap;justify-content:center">
        <button class="btn" onclick="repeatExchangeFromDetail()">Use same pair</button>
      </div>
      <details>
        <summary style="cursor:pointer;font-size:13px;font-weight:800;color:var(--m);margin-bottom:8px">Details</summary>
        <div  style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div  style="padding:10px;border-radius:10px"><div class="xs mu">Exchange ID</div><div  style="font-size:12px;font-weight:800;margin-top:4px;word-break:break-all">${ex.id}</div></div>
          <div  style="padding:10px;border-radius:10px"><div class="xs mu">Date</div><div  style="font-size:12px;font-weight:800;margin-top:4px">${ex.date}</div></div>
          <div  style="padding:10px;border-radius:10px;grid-column:1 / -1"><div class="xs mu">Quote</div><div  style="font-size:12px;font-weight:800;margin-top:4px">${ex.rateLabel}</div></div>
          <div  style="padding:10px;border-radius:10px;grid-column:1 / -1"><div class="xs mu">Fee</div><div  style="font-size:12px;font-weight:800;margin-top:4px">${ex.fee === 0 ? 'No fee (demo)' : String(ex.fee)}</div></div>
        </div>
        <div class="xs mu">${ex.note}</div>
      </details>`;
    document.getElementById('agentActionTitle').textContent = 'Exchange details';
    const titleRight = document.getElementById('agentActionTitleRight');
    if (titleRight) titleRight.innerHTML = '';
    document.getElementById('agentActionContent').innerHTML = body;
    document.getElementById('agentActionModal').classList.add('open');
  };

  window.repeatExchangeFromDetail = function () {
    const ex = getExchangeById(selectedExchangeId);
    if (!ex) return;
    const fromEl = document.getElementById('exFrom');
    const fromSel = document.getElementById('exFromCcy');
    const toSel = document.getElementById('exToCcy');
    if (fromEl) fromEl.value = String(ex.fromAmt);
    if (fromSel) fromSel.value = ex.fromCcy;
    if (toSel) toSel.value = ex.toCcy;
    if (typeof calcRate === 'function') calcRate();
    window.closeAgentActionModal();
    if (typeof window.navigate === 'function') window.navigate('exchange');
    if (typeof window.showToast === 'function') window.showToast('Amounts filled  -  review and tap Exchange now');
  };

  window.openActivityDetail = function (id) {
    let tx = getTxById(id); if (!tx) return;
    const minedDetailRow = findMinedActivityRowForDetail(tx);
    if (minedDetailRow) tx = minedDetailRow;
    const originalDetailId = String(tx.id || '');
    if (rowLooksLikeMinedWithoutTxpow(tx)) {
      resolveMinedTxpowForDetailRow(tx).then(function (resolved) {
        if (resolved && selectedTxId === originalDetailId && typeof window.openActivityDetail === 'function') {
          window.openActivityDetail(tx.id);
        }
      }).catch(function () { /* ignore */ });
    }
    selectedTxId = tx.id;
    const suspicious = suspiciousTx.has(tx.id);
    const txNote = getTxNote(tx);
    const _confN = txConfirmationsShown(tx);
    const _realConf = txConfirmations(tx);
    const _statusConfirmed = tx.status === 'Confirmed';
    const pendingInner = String(tx.pendingTxnId || '').trim();
    const submittedLocalOutgoing = !!(tx.minimaOnChain && tx.localOrigin === true && tx.dir === 'out'
      && (String(tx.status || '') === 'Sending'
        || String(tx.status || '') === 'Broadcasted'
        || String(tx.note || '').toLowerCase().indexOf('submitted to your minima node') >= 0
        || String(tx.note || '').toLowerCase().indexOf('broadcasted to minima peers') >= 0));
    const _hasMinedTxpow = !!(tx.minimaOnChain && (normalizeTxHash(tx.explorerTxId) || nodeTxpowHashFromActivityId(tx.id)));
    const _hasMinedBlock = _hasMinedTxpow && _realConf > 0;
    const _rowTarget = stablesGetConfirmTargetForRow(tx);
    const _confFinal = tx.minimaOnChain
      ? (_hasMinedTxpow && ((_confN === null) ? _statusConfirmed : (_statusConfirmed || _realConf >= _rowTarget)))
      : ((_confN === null) ? _statusConfirmed : (_statusConfirmed || _realConf >= _rowTarget));
    const statusColor = _confFinal ? 'var(--gr)' : 'var(--am)';
    const _confShown = _confFinal ? _rowTarget : ((_confN === null || _realConf <= 0) ? 0 : Math.min(Math.max(_confN, 1), _rowTarget));
    const statusText = (_confN === null)
      ? tx.status
      : (_confFinal
        ? ('Confirmed · ' + _confShown + '/' + _rowTarget + ' blocks')
        : (!_hasMinedBlock
          ? (((pendingInner || _hasMinedTxpow || String(tx.status || '') === 'Broadcasted') ? 'Transaction broadcasted' : (submittedLocalOutgoing ? 'Submitted to node' : 'Generating send id')) + (_confShown > 0 ? (' · ' + _confShown + '/' + _rowTarget + ' blocks') : ''))
          : ('On-chain · ' + _confShown + '/' + _rowTarget + ' blocks')));
    const canRateMerchant = !!SHOP_PROFILES[tx.counterparty] && tx.dir === 'out';
    const feeDisp = Number(tx.fee || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const txHashFromNodeId = nodeTxpowHashFromActivityId(tx.id);
    const txHash = String(normalizeTxHash(tx.explorerTxId) || txHashFromNodeId || '');
    const txCounterparty = String(tx.counterparty || '').trim();
    const txAddress = String(tx.address || '').trim();
    const genericOnChainCounterparty = /^(on-chain|minima network)$/i.test(txCounterparty);
    const txContactValue = (txAddress && genericOnChainCounterparty)
      ? txAddress
      : (txCounterparty && (txCounterparty === txAddress || txCounterparty.indexOf(String.fromCharCode(8230)) >= 0))
      ? txAddress
      : (txCounterparty || txAddress);
    const txAddressLabel = String(tx.dir || '') === 'out'
      ? (txAddress ? 'Sent to address' : 'Contact / Address')
      : (String(tx.dir || '') === 'in' ? 'Received from' : (String(tx.dir || '') === 'self' ? 'Within this wallet' : 'Contact / Address'));
    const txAddressSubline = (txAddress && txContactValue !== txAddress)
      ? `<div class="xs mu"  style="margin-top:6px;word-break:break-all;font-size:11px">${escUi(txAddress)}</div>`
      : '';
    const txHashIsMined = !!(txHashFromNodeId || Number(tx.block || 0) > 0 || _realConf > 0 || _statusConfirmed);
    const hasRealExplorer = !!tx.minimaOnChain && isLikelyTxpowHash(txHash) && txHashIsMined;
    const tradeIdBlock = hasRealExplorer
      ? `<div  style="padding:0 4px;margin-bottom:8px"><div class="xs mu"  style="margin-bottom:6px;font-weight:700;color:var(--t)">Transaction</div><a href="${escUi(txExplorerUrl(tx))}" target="_blank" rel="noopener noreferrer" title="${escUi(txHash)}" class="btn" style="width:auto;padding:0;border:none;background:none;font-size:12px;font-weight:900;color:var(--c);text-decoration:underline;display:inline-block;text-align:left">View transaction</a></div>`
      : (tx.minimaOnChain
        ? (pendingInner
          ? `<div  style="padding:0 4px;margin-bottom:8px"><div class="xs mu"  style="margin-bottom:6px;font-weight:700;color:var(--t)">Transaction</div><div  style="font-size:12px;font-weight:800;color:var(--c)">Transaction broadcasted</div><div class="xs mu"  style="margin-top:4px;color:var(--m)">View transaction appears as soon as the transaction is mined.</div></div>`
          : (submittedLocalOutgoing
            ? `<div  style="padding:0 4px;margin-bottom:8px"><div class="xs mu"  style="margin-bottom:6px;font-weight:700;color:var(--t)">Transaction</div><div  style="font-size:12px;font-weight:800;color:var(--c)">Transaction broadcasted</div><div class="xs mu"  style="margin-top:4px;color:var(--m)">View transaction appears after your node exposes the mined receipt.</div></div>`
            : `<div  style="padding:0 4px;margin-bottom:8px"><div class="xs mu"  style="margin-bottom:6px;font-weight:700;color:var(--t)">Transaction</div><div  style="font-size:12px;font-weight:800;color:var(--am)">Syncing transaction</div><div class="xs mu"  style="margin-top:4px;color:var(--m)">View transaction appears after your node posts and the network mines it.</div></div>`))
        : `<div  style="padding:0 4px;margin-bottom:8px"><div class="xs mu"  style="margin-bottom:6px;font-weight:700;color:var(--t)">Transaction</div><button class="btn" style="width:auto;padding:0;border:none;background:none;font-size:12px;font-weight:900;color:var(--c);text-decoration:underline;text-align:left" onclick="openTxExplorer()">View transaction</button></div>`);
    const txAmtDisp = activityAmtSignedDisplay(tx);
    const txAmtDecimals = (tx.ccy === 'MINIMA' || Math.abs(Number(tx.amt) || 0) < 1) ? 6 : 2;
    const txAmtValue = Math.abs(Number(tx.amt) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: txAmtDecimals,
    });
    /* THE PROGRESS VIEW STAYS AVAILABLE AFTER SETTLEMENT (founder 2026-09-02: "keep the view
       progress always available even when the transaction is settled so that we can always refer to
       the timing details of it in the app").
       It used to vanish the moment a transaction finished — exactly when its timings become
       something you want to look back on rather than watch. Any transaction with an on-chain
       identity has a timeline worth reading, including a failed one: when it stopped is as much a
       fact as when it landed. */
    const _showProgressBtn = !!(tx.minimaOnChain
      || normalizeTxHash(tx.explorerTxId)
      || String(tx.pendingTxnId || tx.txnId || '').trim());
    const _policyLine = tx.minimaOnChain
      ? `<div class="xs mu" style="margin-bottom:8px;padding:0 2px">Completion target: ${_rowTarget} block${_rowTarget > 1 ? 's' : ''}${tx.confirmPolicyLabel ? ' · ' + escUi(tx.confirmPolicyLabel) + ' level' : ''}</div>`
      : '';
    const body = `<div  style="margin-bottom:8px;display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:${statusColor};display:inline-block"></span><span class="xs mu">${statusText}</span></div>
      ${_policyLine}
      <div  style="margin-bottom:16px;padding:0 4px">
        <div class="fbet"><div><div  style="font-size:16px;font-weight:900;color:var(--t)">${tx.title}</div><div class="xs mu"  style="margin-top:2px">${tx.date}</div></div><div  style="text-align:right"><div class="tx-amt ${txAmtDisp.cls} bal-amount">${txAmtDisp.sign}${txAmtValue} ${normalizeActivityCcyLabel(tx.ccy)}</div><div class="xs mu">Fee ${feeDisp} ${normalizeActivityCcyLabel(tx.ccy)}</div></div></div>
      </div>
      <div  style="margin-bottom:16px;padding:0 4px">
        <div class="xs mu"  style="margin-bottom:6px;font-weight:700;color:var(--t)">${txAddressLabel}</div>
        <div  style="display:flex;gap:8px">
          <input class="finput" id="txDetailContactInput" value="${escUi(txContactValue)}" style="flex-grow:1;padding:8px;font-size:13px" placeholder="Enter contact name" onblur="saveTransactionContact({silent:true, skipReopen:true})">
        </div>
        ${txAddressSubline}
      </div>
      
      <div  style="margin-bottom:12px">
        <label class="flabel" style="margin-bottom:6px">Transaction note</label>
        <textarea class="finput" id="txDetailNoteInput" rows="2" placeholder="Add a note for this transaction..." style="resize:vertical;margin-bottom:8px" oninput="scheduleTransactionNoteSave()" onblur="saveTransactionNote({silent:true, skipReopen:true})">${txNote}</textarea>
      </div>

      <div class="flex gap8"  style="margin-bottom:16px;flex-wrap:wrap;justify-content:center">
        ${_showProgressBtn ? '<button class="btn btn-secondary" onclick="reopenTxProgressFromDetail()">View progress</button>' : ''}
        <button class="btn" onclick="repeatTransactionFromDetail()">Repeat</button>
        ${canRateMerchant ? '<button class="btn btn-w btn-g" onclick="openTxMerchantRating()">Rate merchant</button>' : ''}
        <button class="btn" onclick="saveTxCounterpartyToContacts()">Add to contacts</button>
        <button class="btn" onclick="toggleSuspiciousTx()">${suspicious ? 'Unflag suspicious' : 'Flag suspicious'}</button>
        ${hiddenTx.has(tx.id)
          ? `<button class="btn" onclick="unhideTransactionFromHistory()">Show</button>`
          : `<button class="btn" onclick="hideTransactionFromHistory()">Hide</button>`}
        <button class="btn" onclick="deleteTransactionFromHistory()">Delete</button>
      </div>

      <details>
        <summary style="cursor:pointer;font-size:13px;font-weight:800;color:var(--m);margin-bottom:8px">Advanced Details</summary>
        <div  style="display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:10px">
          ${tradeIdBlock}
        </div>

        ${tx.rawTxpow ? `
        <div  style="border-top:1px solid rgba(103,232,249,.1);padding-top:12px;margin-top:4px;margin-bottom:12px">
          <div class="xs mu"  style="margin-bottom:8px;text-align:center;font-weight:700">Developer Tools</div>
          <div class="flex gap8"  style="justify-content:center">
            <button class="btn btn-w" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(JSON.stringify(tx.rawTxpow, null, 2))}')); if(window.showToast) window.showToast('Raw TX JSON copied to clipboard!');">Copy Raw TX Data</button>
          </div>
        </div>` : ''}
      </details>`;
    document.getElementById('agentActionTitle').textContent = 'Transaction details';
    const titleRight = document.getElementById('agentActionTitleRight');
    if (titleRight) titleRight.innerHTML = transactionDetailsAgentButtonHtml();
    document.getElementById('agentActionContent').innerHTML = body;
    const txModal = document.getElementById('agentActionModal');
    if (txModal) {
      txModal.dataset.stablesView = 'transaction-detail';
      txModal.classList.remove('agent-action-notice');
      txModal.classList.add('open');
      const panel = txModal.querySelector('.modal');
      if (panel) panel.scrollTop = 0;
    }
  };

  window.closeAgentActionModal = function () {
    const modal = document.getElementById('agentActionModal');
    if (!modal) return;
    modal.classList.remove('open', 'agent-action-notice');
    delete modal.dataset.stablesView;
    if (typeof window.stablesStopSendResultModalTxPoll === 'function') window.stablesStopSendResultModalTxPoll();
  };
  window.toggleSuspiciousTx = function () { if (!selectedTxId) return; if (suspiciousTx.has(selectedTxId)) suspiciousTx.delete(selectedTxId); else suspiciousTx.add(selectedTxId); persistSuspicious(); window.openActivityDetail(selectedTxId); window.renderActivity(); window.renderWalletRecentActivity(); };
  window.hideTransactionFromHistory = function () {
    if (!selectedTxId) return;
    hiddenTx.add(selectedTxId);
    persistSoftHidden();
    window.closeAgentActionModal();
    window.renderActivity();
    window.renderWalletRecentActivity();
    if (typeof window.showToast === 'function') window.showToast('Transaction soft-hidden. Use Hidden filter to review');
  };
  window.unhideTransactionFromHistory = function () {
    if (!selectedTxId) return;
    hiddenTx.delete(selectedTxId);
    persistSoftHidden();
    window.openActivityDetail(selectedTxId);
    window.renderActivity();
    window.renderWalletRecentActivity();
    if (typeof window.showToast === 'function') window.showToast('Transaction back in main lists');
  };
  window.deleteTransactionFromHistory = function () {
    if (!selectedTxId) return;
    deletedTx.add(selectedTxId);
    hiddenTx.delete(selectedTxId);
    persistHiddenTx();
    persistSoftHidden();
    window.closeAgentActionModal();
    window.renderActivity();
    window.renderWalletRecentActivity();
    if (typeof window.showToast === 'function') window.showToast('Transaction removed from local view');
  };

  // Reopen the live progress popup for a still-settling row from the transaction details view,
  // so a dismissed sender/receiver popup can always be recovered from the transaction list.
  window.reopenTxProgressFromDetail = function () {
    const tx = getTxById(selectedTxId);
    if (!tx) return;
    if (String(tx.dir || '') === 'in') {
      if (typeof window.stablesShowIncomingPaymentWarning === 'function') {
        window.stablesShowIncomingPaymentWarning(tx, { force: true });
      }
      return;
    }
    if (typeof window.stablesShowSendResultModal === 'function') {
      const ccy = normalizeActivityCcyLabel(tx.ccy);
      const amt = Math.abs(Number(tx.amt) || 0);
      window.stablesShowSendResultModal({
        title: 'Payment progress',
        status: String(tx.title || ('Sending ' + ccy)),
        amount: amt + ' ' + ccy,
        address: String(tx.address || ''),
        txid: normalizeTxHash(tx.explorerTxId) || '',
        pendingTxnId: String(tx.pendingTxnId || tx.txnId || ''),
        pendingOnChain: true,
        progressTitle: 'Payment status',
        rowId: String(tx.id),
        openProgress: true,
        note: 'You can close this. Activity keeps updating.'
      });
    }
  };

  window.repeatTransactionFromDetail = function () {
    const tx = getTxById(selectedTxId); if (!tx) return;
    const draft = { party: `${tx.counterparty} · ${tx.address}`, amount: String(Math.abs(tx.amt).toFixed(2)), ccy: tx.ccy };
    window.closeAgentActionModal();
    if (tx.dir === 'in') window.openModalWithDraft('recvModal', draft);
    else window.openModalWithDraft('sendModal', draft);
  };
  let _txNoteSaveTimer = null;
  window.scheduleTransactionNoteSave = function () {
    if (_txNoteSaveTimer) clearTimeout(_txNoteSaveTimer);
    _txNoteSaveTimer = setTimeout(function () {
      _txNoteSaveTimer = null;
      window.saveTransactionNote({ silent: true, skipReopen: true });
    }, 450);
  };

  window.saveTransactionNote = function (opts) {
    const options = opts && typeof opts === 'object' ? opts : {};
    if (!selectedTxId) return;
    const input = document.getElementById('txDetailNoteInput');
    const value = String(input?.value || '').trim();
    if (value) txNotes[selectedTxId] = value;
    else delete txNotes[selectedTxId];
    persistTxNotes();
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    if (!options.skipReopen && typeof window.openActivityDetail === 'function') window.openActivityDetail(selectedTxId);
    if (!options.silent && typeof window.showToast === 'function') window.showToast('Transaction note saved');
  };
  window.saveTransactionContact = function (opts) {
    const options = opts && typeof opts === 'object' ? opts : {};
    if (!selectedTxId) return;
    const tx = getTxById(selectedTxId); if (!tx) return;
    const input = document.getElementById('txDetailContactInput');
    const newName = String(input?.value || '').trim();
    if (!newName || newName === tx.address || newName === tx.counterparty) return;

    const contactObj = { name: newName, category: tx.category || 'MINIMA', address: tx.address, city: 'Unknown', saved: true, paymentTier: 'inherit' };
    CONTACTS_BOOK.set(newName, contactObj);
    
    activitySource().forEach(t => {
      if (t.address === tx.address) {
        t.counterparty = newName;
        if (t.category !== 'MINIMA' && t.category !== 'Token') {
          // Keep existing titles for custom ones if any, but default ones update:
          t.title = (t.dir === 'out' ? 'Paid ' : 'Received from ') + newName;
        } else {
          t.title = (t.dir === 'out' ? 'Sent to ' : 'Received from ') + newName;
        }
      }
    });
    
    if (!options.silent && typeof window.showToast === 'function') window.showToast('Contact updated');
    window.renderActivity();
    window.renderWalletRecentActivity();
    if (!options.skipReopen && typeof window.openActivityDetail === 'function') window.openActivityDetail(selectedTxId);
  };
  window.saveTxCounterpartyToContacts = function () {
    const tx = getTxById(selectedTxId); if (!tx) return;
    const existing = CONTACTS_BOOK.get(tx.counterparty) || { name: tx.counterparty, category: tx.category, address: tx.address, city: 'Unknown', saved: false };
    existing.saved = true; CONTACTS_BOOK.set(tx.counterparty, existing); selectedContactName = tx.counterparty;
    window.closeAgentActionModal();
    if (typeof window.navigate === 'function') window.navigate('contacts');
    window.renderContactsPage();
  };
  window.openTxCounterpartyContact = function () { const tx = getTxById(selectedTxId); if (!tx) return; selectedContactName = tx.counterparty; window.closeAgentActionModal(); if (typeof window.navigate === 'function') window.navigate('contacts'); window.renderContactsPage(); };

  window.renderContactsPage = function () {
    const list = document.getElementById('contactsList'); if (!list) return;
    const search = String(document.getElementById('contactsSearchInput')?.value || '').toLowerCase().trim();
    const contacts = Array.from(CONTACTS_BOOK.values()).filter(c => !search || c.name.toLowerCase().includes(search) || c.category.toLowerCase().includes(search));
    // Sort favorites first, then alphabetically
    contacts.sort((a, b) => {
      const aFav = contactFavorites.has(a.name);
      const bFav = contactFavorites.has(b.name);
      if (aFav !== bFav) return aFav ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    list.innerHTML = '';
    if (!contacts.length) {
      const row = document.createElement('div');
      row.className = 'tx-row';
      row.style.cssText = 'display:flex;align-items:center;gap:8px';
      row.innerHTML = '<div class="tx-ic in-ic">👤</div><div class="tx-info"  style="flex:1;min-width:0"><div class="tx-t">No contacts yet</div><div class="tx-d">Your saved contacts will appear here.</div></div>';
      list.appendChild(row);
    }
    contacts.forEach(c => {
      const txCount = activitySource().filter(x => !deletedTx.has(x.id) && x.counterparty === c.name).length;
      const shopHidden = hiddenShops.has(c.name);
      const isFav = contactFavorites.has(c.name);
      const row = document.createElement('div');
      row.className = 'tx-row';
      row.style.cssText = 'display:flex;align-items:center;gap:8px';
      row.innerHTML = `<div class="tx-ic in-ic">${isFav ? '⭐' : '👤'}</div><div class="tx-info"  style="flex:1;min-width:0"><div class="tx-t">${c.name}</div><div class="tx-d">${c.category} · ${txCount} transactions${shopHidden ? ' · Merchant hidden from Spend' : ''}</div></div><div class="badge ${c.saved ? 'b-gr' : 'b-cy'}"  style="flex-shrink:0">${c.saved ? 'Saved' : 'Demo'}</div><button type="button" title="${isFav ? 'Remove from favourites' : 'Add to favourites'}" style="flex-shrink:0;background:none;border:none;cursor:pointer;font-size:16px;padding:4px 6px;color:${isFav ? '#fbbf24' : 'var(--m)'}" onclick="event.stopPropagation();toggleContactFavorite('${c.name.replace(/'/g, "\\'")}')">★</button>`;
      row.querySelector('.tx-info').addEventListener('click', () => { selectedContactName = c.name; window.renderSelectedContact(); });
      row.querySelector('.tx-ic').addEventListener('click', () => { selectedContactName = c.name; window.renderSelectedContact(); });
      list.appendChild(row);
    });
    window.renderSelectedContact();
  };

  window.renderSelectedContact = function () {
    const card = document.getElementById('contactDetailCard'); if (!card) return;
    const section = document.getElementById('contactDetailSection');
    if (!selectedContactName || !CONTACTS_BOOK.has(selectedContactName)) {
      if (section) section.style.display = 'none';
      return;
    }
    const c = CONTACTS_BOOK.get(selectedContactName);
    const txCount = activitySource().filter(x => !deletedTx.has(x.id) && x.counterparty === c.name).length;
    const latestOut = latestContactTx(c.name, 'out');
    const latestIn = latestContactTx(c.name, 'in');
    document.getElementById('contactDetailName').textContent = c.name;
    const shopHid = hiddenShops.has(c.name);
    document.getElementById('contactDetailMeta').textContent = `${c.category} · ${txCount} tx · ${c.city}${shopHid ? ' · Merchant hidden on Spend' : ''}`;
    document.getElementById('contactDetailAddress').textContent = c.address;
    const latestSentEl = document.getElementById('contactLatestSent');
    const latestRecvEl = document.getElementById('contactLatestReceived');
    const fmtLatest = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (latestSentEl) latestSentEl.textContent = latestOut ? `${fmtLatest(Math.abs(latestOut.amt))} ${latestOut.ccy} · ${latestOut.date}` : 'No sent transaction yet';
    if (latestRecvEl) latestRecvEl.textContent = latestIn ? `${fmtLatest(Math.abs(latestIn.amt))} ${latestIn.ccy} · ${latestIn.date}` : 'No received transaction yet';
    const notes = document.getElementById('contactNotes');
    if (notes) notes.value = contactNotes[c.name] || '';
    const tierSel = document.getElementById('contactPaymentTier');
    if (tierSel) tierSel.value = window.stablesGetContactPaymentTier(c.name);
    const shopBtn = document.getElementById('contactShopBtn');
    const isShop = !!SHOP_PROFILES[c.name];
    if (shopBtn) shopBtn.hidden = !isShop;
    const rateBtn = document.getElementById('contactRateMerchantBtn');
    if (rateBtn) rateBtn.hidden = !isShop;
    if (section) section.style.removeProperty('display');
  };

  let _contactNotesSaveTimer = null;
  window.scheduleContactNotesSave = function () {
    if (_contactNotesSaveTimer) clearTimeout(_contactNotesSaveTimer);
    _contactNotesSaveTimer = setTimeout(function () {
      _contactNotesSaveTimer = null;
      window.saveContactNotes({ silent: true });
    }, 450);
  };

  window.saveContactNotes = function (opts) {
    const options = opts && typeof opts === 'object' ? opts : {};
    if (!selectedContactName) return;
    const notes = document.getElementById('contactNotes');
    contactNotes[selectedContactName] = String(notes?.value || '').trim();
    persistNotes();
    if (!options.silent && typeof window.showToast === 'function') window.showToast('Contact notes saved');
  };

  window.saveContactPaymentTier = function () {
    if (!selectedContactName) return;
    const tierSel = document.getElementById('contactPaymentTier');
    const tier = tierSel ? tierSel.value : 'inherit';
    window.stablesSetContactPaymentTier(selectedContactName, tier);
    if (typeof window.renderSendContactChips === 'function') window.renderSendContactChips();
    if (typeof window.stablesUpdateSendTierHint === 'function') window.stablesUpdateSendTierHint();
    if (typeof window.showToast === 'function') window.showToast('Payment tier saved for this contact.');
  };

  window.openContactTransactions = function () {
    if (!selectedContactName) return;
    activitySearch = selectedContactName;
    const input = document.getElementById('activitySearchInput');
    if (input) input.value = activitySearch;
    activityPage = 0;
    if (typeof window.navigate === 'function') window.navigate('activity');
    window.renderActivity();
  };
  window.openContactConversation = function () { if (!selectedContactName) return; chatContactName = selectedContactName; if (typeof window.navigate === 'function') window.navigate('chat'); window.renderChatContext(); };
  window.renderChatContext = function () { const label = document.getElementById('chatContactLabel'); if (!label) return; if (!chatContactName) { label.style.display = 'none'; return; } label.style.display = ''; label.textContent = `Conversation with ${chatContactName}`; };

  function escCouncilHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
  }

  function compareSemverLike(a, b) {
    const pa = String(a || '0').split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b || '0').split('.').map((n) => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length, 3);
    for (let i = 0; i < len; i++) {
      const da = pa[i] || 0;
      const db = pb[i] || 0;
      if (da < db) return -1;
      if (da > db) return 1;
    }
    return 0;
  }

  function formatDisplayVersion(rawVersion) {
    const raw = String(rawVersion || '').trim();
    if (!raw) return 'v0';
    return 'v' + raw.split('.').map((part) => {
      const n = Number(part);
      return Number.isFinite(n) ? String(n) : String(part).trim();
    }).join('.');
  }

  function criticalityPresentation(level) {
    const x = String(level || 'medium').toLowerCase();
    const map = {
      low: { label: 'Low', border: 'rgba(103,232,249,.38)', bg: 'rgba(103,232,249,.08)' },
      medium: { label: 'Medium', border: 'rgba(251,191,36,.45)', bg: 'rgba(251,191,36,.1)' },
      high: { label: 'High', border: 'rgba(249,115,22,.5)', bg: 'rgba(249,115,22,.12)' },
      critical: { label: 'Critical', border: 'rgba(248,113,113,.55)', bg: 'rgba(248,113,113,.14)' }
    };
    return map[x] || map.medium;
  }

  function buildAppVersionBannerHtml() {
    const cfg = window.STABLES_CONFIG || {};
    // Use the full iteration-baked version (e.g. 0.0.0.2.10) so the comparison matches
    // latestPublishedVersion and we never flag a "false update" on the live build.
    let current = String(cfg.APP_BUILD_VERSION || '0.0.0').trim();
    const _iterN = Number(cfg.APP_BUILD_ITERATION);
    if (Number.isFinite(_iterN) && _iterN > 0) {
      const _cs = current.split('.');
      _cs[_cs.length - 1] = String(Math.trunc(_iterN)).padStart(2, '0');
      current = _cs.join('.');
    }
    const pol = cfg.APP_UPDATE_POLICY && typeof cfg.APP_UPDATE_POLICY === 'object' ? cfg.APP_UPDATE_POLICY : {};
    const latest = String(pol.latestPublishedVersion || current).trim();
    const displayCurrent = formatDisplayVersion(current);
    const displayLatest = formatDisplayVersion(latest);
    const cmp = compareSemverLike(current, latest);
    const needsUpdate = cmp < 0;
    const zipUrl = typeof cfg.MDS_ZIP_URL === 'string' ? cfg.MDS_ZIP_URL.trim() : '';

    if (!needsUpdate) {
      return `<div class="app-section app-section--caption-bottom app-section--caption-bottom--mt20"><div class="stitle-row"><div class="stitle">App version</div></div><div class="card app-section-card"  style="padding:14px;margin-bottom:8px">
        <div  style="display:flex;align-items:flex-start;gap:10px">
          <span style="font-size:22px;line-height:1;flex-shrink:0" aria-hidden="true">✅</span>
          <div  style="min-width:0">
            <div  style="font-size:14px;line-height:1.55;font-weight:800;color:var(--muted)">This install is on the latest app version (${escCouncilHtml(displayCurrent)}).</div>
          </div>
        </div>
      </div></div>`;
    }

    const wu = pol.whenUpdateNeeded && typeof pol.whenUpdateNeeded === 'object' ? pol.whenUpdateNeeded : {};
    const crit = criticalityPresentation(wu.criticality);
    const what = escCouncilHtml(wu.whatChanged || 'See council release notes for this version.').replace(/\n/g, '<br>');
    const detRaw = typeof wu.details === 'string' ? wu.details.trim() : '';
    const det = detRaw ? escCouncilHtml(detRaw).replace(/\n/g, '<br>') : '';
    const zipName = `Stables_${displayLatest}.mds.zip`;
    const zipBtn = zipUrl
      ? `<a class="btn btn-w" style="display:block;text-align:center;margin-top:14px;text-decoration:none;box-sizing:border-box;font-size:14px;font-weight:900;padding:14px 16px" href="${escAttr(zipUrl)}" target="_blank" rel="noopener">Download ${escCouncilHtml(zipName)}</a>`
      : '';

    return `<div class="app-section app-section--caption-bottom app-section--caption-bottom--mt20"><div class="stitle-row"><div class="stitle">App version</div></div><div class="card app-section-card"  style="padding:14px;margin-bottom:8px;border:1px solid ${crit.border};background:${crit.bg}">
      <div  style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
        <span style="font-size:22px;line-height:1;flex-shrink:0" aria-hidden="true">⚠️</span>
        <div  style="min-width:0">
          <div  style="font-size:14px;font-weight:900;color:var(--t);margin-bottom:4px">App update available</div>
          <div  style="font-size:14px;line-height:1.55;font-weight:800;color:var(--muted)">This install is <strong style="color:var(--t)">${escCouncilHtml(displayCurrent)}</strong>. Latest published: <strong style="color:var(--t)">${escCouncilHtml(displayLatest)}</strong>.</div>
        </div>
      </div>
      <div  style="display:inline-block;padding:6px 12px;border-radius:999px;font-size:13px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;border:1px solid ${crit.border};color:var(--t);margin-bottom:10px">Criticality: ${escCouncilHtml(crit.label)}</div>
      <div  style="font-size:14px;font-weight:900;color:var(--t);margin-bottom:6px">What is updated</div>
      <div  style="font-size:14px;line-height:1.55;font-weight:800;color:var(--muted)">${what}</div>
      ${det ? `<div  style="margin-top:10px;font-size:14px;line-height:1.55;font-weight:700;color:var(--muted)">${det}</div>` : ''}
      ${zipBtn}
    </div></div>`;
  }

  function buildCouncilCommunicationsHtml() {
    const raw = (window.STABLES_CONFIG || {}).COUNCIL_COMMUNICATIONS;
    const block = raw && typeof raw === 'object' ? raw : {};
    const items = Array.isArray(block.items) ? block.items : [];
    const intro = typeof block.intro === 'string' && block.intro.trim()
      ? block.intro.trim()
      : 'This channel is for Stables Council only: security incidents, required updates, and other critical communication. It is not for casual chat.';
    let itemsHtml = '';
    if (!items.length) {
      itemsHtml = '<div class="xs mu"  style="margin-top:8px;opacity:.9;font-weight:800;line-height:1.45">No council bulletins in this build.</div>';
    } else {
      itemsHtml = items.map((it) => {
        const title = escCouncilHtml(it.title || 'Notice');
        const date = it.date ? escCouncilHtml(it.date) : '';
        const body = escCouncilHtml(it.body || '').replace(/\n/g, '<br>');
        return `<div  style="margin-top:10px;padding:10px 12px;border-radius:12px">
          <div  style="font-size:13px;font-weight:900;color:var(--t)">${title}</div>
          ${date ? `<div class="xs mu"  style="margin-top:2px;font-weight:700">${date}</div>` : ''}
          <div class="xs mu"  style="margin-top:6px;line-height:1.5;font-weight:700;color:var(--muted)">${body}</div>
        </div>`;
      }).join('');
    }
    return `<div class="app-section app-section--caption-bottom"><div class="stitle-row"><div class="stitle">Official notices</div></div><div class="card app-section-card"  style="padding:14px;margin-bottom:8px;background:linear-gradient(135deg,rgba(103,232,249,.05),rgba(167,139,250,.06))">
      <div  style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
        <span style="font-size:22px;line-height:1;flex-shrink:0" aria-hidden="true">🏛️</span>
        <div  style="min-width:0;font-size:14px;line-height:1.55;font-weight:800;color:var(--muted)">${escCouncilHtml(intro)}</div>
      </div>
      ${itemsHtml}
    </div></div>`;
  }

  window.renderCouncilCommunicationPanels = function () {
    const html = buildAppVersionBannerHtml() + buildCouncilCommunicationsHtml();
    const el = document.getElementById('councilCommsPageMount');
    if (el) el.innerHTML = html;
  };

  window.openSelectedContactShop = function () { if (!selectedContactName) return; window.openShopProfile(selectedContactName); };

  window.refreshSpendShopCards = function () {
    document.querySelectorAll('[data-stables-shop]').forEach(el => {
      const n = el.getAttribute('data-stables-shop');
      el.style.display = n && hiddenShops.has(n) ? 'none' : '';
    });
    renderSpendShopRatingBadges();
  };

  window.shopHideAllTransactions = function (shopName) {
    const n = String(shopName || '').trim();
    if (!n) return;
    txsForShop(n).forEach(x => hiddenTx.add(x.id));
    persistSoftHidden();
    window.closeAgentActionModal();
    window.renderActivity();
    window.renderWalletRecentActivity();
    if (typeof window.showToast === 'function') window.showToast('All payments with this merchant are soft-hidden');
  };

  window.shopDeleteAllTransactions = function (shopName) {
    const n = String(shopName || '').trim();
    if (!n) return;
    const msg = `Remove every transaction with ${n} from my local history? This stays on device only; use backup if I export settings.`;
    // D023 law 1: the app asks, not the platform. And a confirmation it cannot draw is a NO,
    // where the previous form deleted the history unasked whenever window.confirm was missing.
    if (typeof window.stablesConfirm !== 'function') return;
    window.stablesConfirm({ title: 'Remove transactions', message: msg, confirmText: 'Remove', danger: true })
      .then(ok => { if (ok) shopDeleteAllTransactionsConfirmed(n); });
  };

  function shopDeleteAllTransactionsConfirmed(n) {
    txsForShop(n).forEach(x => { deletedTx.add(x.id); hiddenTx.delete(x.id); });
    persistHiddenTx();
    persistSoftHidden();
    window.closeAgentActionModal();
    window.renderActivity();
    window.renderWalletRecentActivity();
    if (typeof window.renderContactsPage === 'function') window.renderContactsPage();
    if (typeof window.showToast === 'function') window.showToast('Transactions removed from local view');
  }

  window.shopHideFromSpend = function (shopName) {
    const n = String(shopName || '').trim();
    if (!n) return;
    hiddenShops.add(n);
    persistHiddenShops();
    window.refreshSpendShopCards();
    window.closeAgentActionModal();
    window.renderActivity();
    window.renderWalletRecentActivity();
    if (typeof window.renderContactsPage === 'function') window.renderContactsPage();
    if (typeof window.showToast === 'function') window.showToast('Merchant hidden from Merchants tab');
  };

  window.shopUnhideFromSpend = function (shopName) {
    const n = String(shopName || '').trim();
    if (!n) return;
    hiddenShops.delete(n);
    persistHiddenShops();
    window.refreshSpendShopCards();
    window.renderActivity();
    window.renderWalletRecentActivity();
    if (typeof window.renderContactsPage === 'function') window.renderContactsPage();
    window.openShopProfile(n);
    if (typeof window.showToast === 'function') window.showToast('Merchant visible on Merchants again');
  };

  window.openShopProfile = function (name) {
    const shop = SHOP_PROFILES[name];
    if (!shop) { if (typeof window.showToast === 'function') window.showToast('No merchant profile available yet'); return; }
    const promos = (shop.promos || []).map(p => `<li style="margin:0 0 6px 0">${p}</li>`).join('');
    const sn = JSON.stringify(shop.name);
    const shopHidden = hiddenShops.has(shop.name);
    const ratingSummary = buildMerchantRatingSummaryHtml(shop.name);
    const body = `<div class="mcard"  style="margin-bottom:10px;cursor:default"><div class="mic">${shop.icon}</div><div class="minfo"><div class="mn">${shop.name}</div><div class="mt2">${shop.category} · ${shop.city}</div></div><div class="badge ${shop.status === 'Open' ? 'b-gr' : 'b-cy'}">${shop.status}</div></div>
      <div  style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px"><div  style="padding:10px;border-radius:10px"><div class="xs mu">Open Hours</div><div  style="font-size:12px;font-weight:800;margin-top:4px">${shop.openHours}</div></div><div  style="padding:10px;border-radius:10px"><div class="xs mu">Average Ticket</div><div  style="font-size:12px;font-weight:800;margin-top:4px">${shop.avgTicket}</div></div></div>
      <div  style="padding:10px;border-radius:10px;margin-bottom:10px"><div class="xs mu">Accepted Currencies</div><div  style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">${shop.accepts.map(c => `<span class="ccy-pill on" style="cursor:default">${c}</span>`).join('')}</div></div>
      <div  style="padding:10px;border-radius:10px;margin-bottom:10px"><div  style="font-size:13px;font-weight:800;margin-bottom:6px">Merchant rating</div>${ratingSummary}<div class="xs mu"  style="margin-top:8px">Onchain + signed review framework (weighted by spend).</div></div>
      <div  style="padding:10px;border-radius:10px;margin-bottom:10px"><div  style="font-size:13px;font-weight:800;margin-bottom:6px">Current promotions</div><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.4">${promos}</ul></div>
      <div  style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(103,232,249,.12)">
        <div  style="font-size:10px;font-weight:800;color:var(--m);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">History &amp; list</div>
        <div class="flex gap8"  style="flex-wrap:wrap;justify-content:center">
          <button class="btn btn-w btn-g" onclick="openMerchantRatingComposer(${sn})">Rate merchant</button>
          <button class="btn" onclick="shopHideAllTransactions(${sn})">Hide all transactions</button>
          <button class="btn" onclick="shopDeleteAllTransactions(${sn})">Delete all (local)</button>
          ${shopHidden
    ? `<button class="btn btn-w btn-g" onclick="shopUnhideFromSpend(${sn})">Show merchant on Merchants</button>`
    : `<button class="btn" onclick="shopHideFromSpend(${sn})">Hide merchant from Merchants</button>`}
        </div>
      </div>`;
    document.getElementById('agentActionTitle').textContent = '';
    const titleRight = document.getElementById('agentActionTitleRight');
    if (titleRight) titleRight.innerHTML = '';
    document.getElementById('agentActionContent').innerHTML = body;
    document.getElementById('agentActionModal').classList.add('open');
  };

  function normalizeConfigImportPayload(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const keys = ['notes', 'txNotes', 'suspicious', 'softHiddenTx', 'deletedTx', 'hiddenShops'];
    const hasSomething = keys.some(k => raw[k] != null);
    if (!hasSomething) return null;
    const notesOk = raw.notes && typeof raw.notes === 'object' && !Array.isArray(raw.notes);
    const txOk = raw.txNotes && typeof raw.txNotes === 'object' && !Array.isArray(raw.txNotes);
    return {
      notes: notesOk ? { ...raw.notes } : {},
      txNotes: txOk ? { ...raw.txNotes } : {},
      suspicious: Array.isArray(raw.suspicious) ? raw.suspicious.map(String).filter(Boolean) : [],
      softHiddenTx: Array.isArray(raw.softHiddenTx) ? raw.softHiddenTx.map(String).filter(Boolean) : [],
      deletedTx: Array.isArray(raw.deletedTx) ? raw.deletedTx.map(String).filter(Boolean) : [],
      hiddenShops: Array.isArray(raw.hiddenShops) ? raw.hiddenShops.map(String).filter(Boolean) : []
    };
  }

  function refreshAfterConfigImport() {
    window.renderActivity();
    window.renderWalletRecentActivity();
    if (typeof window.renderContactsPage === 'function') window.renderContactsPage();
  }

  window.triggerConfigBackupImport = function () {
    const input = document.getElementById('configBackupFileInput');
    if (input) input.click();
  };

  window.handleConfigBackupFileChosen = function (input) {
    const f = input && input.files && input.files[0];
    if (input) input.value = '';
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result || ''));
        const norm = normalizeConfigImportPayload(raw);
        if (!norm) {
          if (typeof window.showToast === 'function') window.showToast('That file is not a Stables backup.');
          return;
        }
        pendingConfigImportPayload = norm;
        window.showConfigImportModeModal();
      } catch (_) {
        if (typeof window.showToast === 'function') window.showToast('Could not read that file. Use the backup you exported from Stables.');
      }
    };
    reader.onerror = () => {
      if (typeof window.showToast === 'function') window.showToast('Could not read file.');
    };
    reader.readAsText(f);
  };

  window.cancelPendingConfigImport = function () {
    pendingConfigImportPayload = null;
    window.closeAgentActionModal();
  };

  window.showConfigImportModeModal = function () {
    if (!pendingConfigImportPayload) return;
    const titleEl = document.getElementById('agentActionTitle');
    const bodyEl = document.getElementById('agentActionContent');
    const modal = document.getElementById('agentActionModal');
    if (!titleEl || !bodyEl || !modal) return;
    titleEl.textContent = 'Import preferences';
    const titleRight = document.getElementById('agentActionTitleRight');
    if (titleRight) titleRight.innerHTML = '';
    bodyEl.innerHTML =
      '<div class="xs mu"  style="margin-bottom:12px;line-height:1.55">Choose how to use this file. Flags, hidden items, and notes will be updated as described below.</div>'
      + '<div  style="padding:12px;border-radius:12px;margin-bottom:10px">'
      + '<div  style="font-size:12px;font-weight:900;color:var(--c);margin-bottom:6px">Replace</div>'
      + '<div class="xs mu"  style="line-height:1.45">Clears the same kinds of data on this device, then loads <strong>only</strong> what is in the file. Use when this device should match the other one exactly.</div>'
      + '</div>'
      + '<div  style="padding:12px;border-radius:12px;margin-bottom:14px">'
      + '<div  style="font-size:12px;font-weight:900;color:var(--pu);margin-bottom:6px">Combine</div>'
      + '<div class="xs mu"  style="line-height:1.45"><strong>Flags &amp; hides:</strong> keep everything that is marked on <em>either</em> device. <strong>Notes:</strong> if both have a note for the same item, the <strong>imported</strong> one is kept.</div>'
      + '</div>'
      + '<div class="flex gap8"  style="flex-wrap:wrap;justify-content:center">'
      + '<button type="button" class="btn btn-w btn-g" style="flex:1;min-width:140px" onclick="applyPendingConfigImport(\'replace\')">Replace with file</button>'
      + '<button type="button" class="btn btn-w" style="flex:1;min-width:140px" onclick="applyPendingConfigImport(\'combine\')">Combine with device</button>'
      + '</div>'
      + '<div  style="text-align:center;margin-top:10px"><button type="button" class="btn" style="width:auto;padding:6px 12px;font-size:12px" onclick="cancelPendingConfigImport()">Cancel</button></div>';
    modal.classList.add('open');
  };

  /**
   * @param {'replace'|'combine'} mode
   */
  window.applyPendingConfigImport = function (mode) {
    if (!pendingConfigImportPayload) return;
    const p = pendingConfigImportPayload;
    pendingConfigImportPayload = null;
    const m = mode === 'combine' ? 'combine' : 'replace';

    if (m === 'replace') {
      suspiciousTx.clear();
      p.suspicious.forEach(id => suspiciousTx.add(id));
      hiddenTx.clear();
      p.softHiddenTx.forEach(id => hiddenTx.add(id));
      deletedTx.clear();
      p.deletedTx.forEach(id => deletedTx.add(id));
      hiddenShops.clear();
      p.hiddenShops.forEach(name => hiddenShops.add(name));
      Object.keys(contactNotes).forEach(k => { delete contactNotes[k]; });
      Object.assign(contactNotes, p.notes);
      Object.keys(txNotes).forEach(k => { delete txNotes[k]; });
      Object.assign(txNotes, p.txNotes);
    } else {
      p.suspicious.forEach(id => suspiciousTx.add(id));
      p.softHiddenTx.forEach(id => hiddenTx.add(id));
      p.deletedTx.forEach(id => deletedTx.add(id));
      p.hiddenShops.forEach(name => hiddenShops.add(name));
      Object.assign(contactNotes, p.notes);
      Object.assign(txNotes, p.txNotes);
    }

    persistSuspicious();
    persistSoftHidden();
    persistHiddenTx();
    persistHiddenShops();
    persistNotes();
    persistTxNotes();
    window.closeAgentActionModal();
    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, String(Date.now()));
    } catch (_) {}
    window.updateBackupStatus();
    refreshAfterConfigImport();
    if (typeof window.showToast === 'function') {
      window.showToast(m === 'replace' ? 'Preferences replaced from file' : 'Preferences merged from file');
    }
  };

  window.runConfigBackupNow = function () {
    const snapshot = {
      ts: new Date().toISOString(),
      notes: contactNotes,
      suspicious: Array.from(suspiciousTx),
      txNotes,
      softHiddenTx: Array.from(hiddenTx),
      deletedTx: Array.from(deletedTx),
      hiddenShops: Array.from(hiddenShops),
      info: 'Local settings backup (not seed-recoverable)'
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stables-local-config-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    localStorage.setItem(BACKUP_STORAGE_KEY, String(Date.now()));
    if (typeof window.showToast === 'function') window.showToast('Export saved');
    window.updateBackupStatus();
  };

  window.updateBackupStatus = function () {
    const ts = Number(localStorage.getItem(BACKUP_STORAGE_KEY) || 0);
    const el = document.getElementById('backupStatusLabel');
    if (!el) return;
    if (!ts) { el.textContent = 'Last backup: never'; return; }
    const agoH = Math.max(0, Math.floor((Date.now() - ts) / 3600000));
    el.textContent = `Last backup: ${agoH}h ago`;
  };

  window.openBackupSettings = function () {
    if (typeof window.navigate === 'function') window.navigate('settings-security');
    const modal = document.getElementById('agentActionModal');
    if (modal) modal.classList.remove('open');
    setTimeout(() => {
      document.getElementById('settingsSeedPhraseSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  // Temporary kill switch: keep backup timestamp/status updates, but suppress reminder popup.
  const BACKUP_REMINDER_MODAL_ENABLED = false;
  window.checkBackupReminder = function () {
    const now = Date.now();
    const ts = Number(localStorage.getItem(BACKUP_STORAGE_KEY) || 0);
    let firstSeen = Number(localStorage.getItem(BACKUP_FIRST_SEEN_KEY) || 0);
    if (!firstSeen) {
      firstSeen = now;
      localStorage.setItem(BACKUP_FIRST_SEEN_KEY, String(firstSeen));
    }

    const ageMs = now - (ts || firstSeen);
    const overdue = ageMs > (BACKUP_REMINDER_HOURS * 3600000);
    const welcomeOpen = document.getElementById('welcomeSetupModal')?.classList.contains('open');
    const seedOpen = document.getElementById('seedPhraseSecurityModal')?.classList.contains('open');
    const vaultHelpOpen = document.getElementById('vaultHelpChoiceModal')?.classList.contains('open');
    if (welcomeOpen || seedOpen || vaultHelpOpen) {
      window.updateBackupStatus();
      return;
    }
    if (overdue && BACKUP_REMINDER_MODAL_ENABLED) {
      const titleEl = document.getElementById('agentActionTitle');
      const bodyEl = document.getElementById('agentActionContent');
      const modal = document.getElementById('agentActionModal');
      if (titleEl && bodyEl && modal) {
        titleEl.textContent = 'Critical: my Vault key';
        const titleRight = document.getElementById('agentActionTitleRight');
        if (titleRight) titleRight.innerHTML = '';
        bodyEl.innerHTML =
          '<div  style="padding:12px;border-radius:12px;margin-bottom:12px">'
          + '<div  style="font-size:11px;font-weight:900;color:#fbbf24;margin-bottom:8px;text-transform:uppercase;letter-spacing:.07em">Protect on-chain assets</div>'
          + '<div class="xs mu"  style="line-height:1.55;margin:0">If I lose my <strong style="color:var(--t)">Vault key</strong>, I can lose <strong style="color:var(--t)">everything</strong>. No preference file replaces it: not notes, not hidden lists, not flags.</div>'
          + '</div>'
          + '<div class="xs mu"  style="margin-bottom:14px;line-height:1.5">Saving labels or hidden lists is handy, but <strong>far less important</strong> than my Vault key. Open Security to check my Vault key; use Export only if I want to copy preferences to another device.</div>'
          + '<button type="button" class="btn btn-w btn-g" style="width:100%;margin-bottom:10px" onclick="openBackupSettings()">Open Security: Vault key and preferences</button>'
          + '<div class="xs mu"  style="text-align:center"><button type="button" class="btn" style="width:auto;padding:6px 12px;font-size:11px" onclick="runConfigBackupNow()">Export preferences only</button></div>';
        modal.classList.add('open');
      }
    }
    window.updateBackupStatus();
  };

  /** Populate Settings backup section from STABLES_CONFIG (onchain vs local lists). */
  window.refreshSettingsBackupCopy = function () {
    const cfg = window.STABLES_CONFIG || {};
    const notIn = document.getElementById('settingsNotInExportList');
    const inExport = document.getElementById('settingsInExportList');
    if (notIn) {
      const items = cfg.ONCHAIN_RECOVERED || [];
      notIn.innerHTML = items.map(x => `<li style="margin:0 0 6px 0">${x}</li>`).join('');
    }
    if (inExport) {
      const items = cfg.LOCAL_CONFIG_ONLY || [];
      inExport.innerHTML = items.map(x => `<li style="margin:0 0 6px 0">${x}</li>`).join('');
    }
    const keysEl = document.getElementById('settingsExportJsonKeysNote');
    if (keysEl) {
      keysEl.innerHTML = 'The file is for Stables only. It never contains my Vault key.';
    }
  };

  let seedModalWaitAttempts = 0;
  let vaultSecurityModalTimer = null;

  /**
   * After welcome closes: wait (no visible timer), then open the Vault backup modal.
   * Delay: STABLES_CONFIG.VAULT_SECURITY_MODAL_DELAY_MS (default 1 minute).
   */
  window.startVaultSecurityModalCountdown = function () {
    try {
      if (localStorage.getItem(SEED_PHRASE_SAVED_CONFIRMED_KEY) === '1') return;
    } catch (_) {}
    if (vaultSecurityModalTimer) {
      clearTimeout(vaultSecurityModalTimer);
      vaultSecurityModalTimer = null;
    }
    const delayMs = Math.max(
      5000,
      Number((window.STABLES_CONFIG || {}).VAULT_SECURITY_MODAL_DELAY_MS) || 60000
    );
    vaultSecurityModalTimer = setTimeout(() => {
      vaultSecurityModalTimer = null;
      if (typeof window.scheduleSeedPhraseSecurityModal === 'function') {
        window.scheduleSeedPhraseSecurityModal();
      }
    }, delayMs);
  };

  window.scheduleSeedPhraseSecurityModal = function () {
    try {
      if (localStorage.getItem(SEED_PHRASE_SAVED_CONFIRMED_KEY) === '1') return;
    } catch (_) {}
    const welcome = document.getElementById('welcomeSetupModal');
    if (welcome && welcome.classList.contains('open')) return;
    const agentModal = document.getElementById('agentActionModal');
    if (agentModal && agentModal.classList.contains('open')) {
      seedModalWaitAttempts += 1;
      if (seedModalWaitAttempts < 25) setTimeout(() => window.scheduleSeedPhraseSecurityModal(), 500);
      return;
    }
    const vaultHelpModal = document.getElementById('vaultHelpChoiceModal');
    if (vaultHelpModal && vaultHelpModal.classList.contains('open')) {
      seedModalWaitAttempts += 1;
      if (seedModalWaitAttempts < 25) setTimeout(() => window.scheduleSeedPhraseSecurityModal(), 500);
      return;
    }
    seedModalWaitAttempts = 0;
    if (typeof window.openAgent === 'function') {
      window.openAgent(false);
      return;
    }
    const modal = document.getElementById('seedPhraseSecurityModal');
    if (!modal || modal.classList.contains('open')) return;
    modal.classList.add('open');
  };

  window.closeSeedPhraseSecurityModal = function () {
    document.getElementById('seedPhraseSecurityModal')?.classList.remove('open');
  };

  window.confirmSeedPhraseSaved = function () {
    try {
      localStorage.setItem(SEED_PHRASE_SAVED_CONFIRMED_KEY, '1');
    } catch (_) {}
    window.closeSeedPhraseSecurityModal();
    if (typeof window.refreshAgentAttentionBadges === 'function') window.refreshAgentAttentionBadges(true);
  };

  /** Legacy no-ops: periodic Vault reminders UI removed; keep names so older bookmarks don’t throw. */
  window.finishVaultPeriodicReminderChoice = function () {};
  window.setVaultPeriodicReminderPrefFromSettings = function () {};
  window.updateVaultReminderSettingsLabel = function () {};

  /** Periodic Vault toasts removed - function kept for callers that still invoke it. */
  window.maybeShowVaultSoftReminder = function () {};

  window.deferSeedPhraseBackupNow = function () {
    window.closeSeedPhraseSecurityModal();
    if (typeof window.navigate === 'function') window.navigate('settings-security');
    setTimeout(() => {
      document.getElementById('settingsSeedPhraseSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  };

  /** Remind me: dismiss only; prompt returns on next visit until user chooses Yes. */
  window.deferSeedPhraseRemindLater = function () {
    window.closeSeedPhraseSecurityModal();
    if (typeof window.refreshAgentAttentionBadges === 'function') window.refreshAgentAttentionBadges();
  };

  window.showStorageScopeInfo = function () {
    const onchain = (CFG.ONCHAIN_RECOVERED || []).map(x => `<li>${x}</li>`).join('');
    const local = (CFG.LOCAL_CONFIG_ONLY || []).map(x => `<li>${x}</li>`).join('');
    const body = `<div  style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div  style="padding:10px;border-radius:10px"><div  style="font-size:12px;font-weight:800;color:var(--gr);margin-bottom:6px">Recovered from seed phrase / onchain</div><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.4">${onchain}</ul></div>
      <div  style="padding:10px;border-radius:10px"><div  style="font-size:12px;font-weight:800;color:var(--c);margin-bottom:6px">Local config file only</div><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.4">${local}</ul></div>
    </div>`;
    document.getElementById('agentActionTitle').textContent = 'Storage scope';
    const titleRight = document.getElementById('agentActionTitleRight');
    if (titleRight) titleRight.innerHTML = '';
    document.getElementById('agentActionContent').innerHTML = body;
    document.getElementById('agentActionModal').classList.add('open');
  };

  // --- Send modal quick contacts ---
  window.renderSendContactChips = function () {
    const wrap = document.getElementById('sendContactChips');
    if (!wrap) return;
    wrap.innerHTML = '';
    const MAX_CHIPS = 5;
    const all = Array.from(CONTACTS_BOOK.values());
    const favs = all.filter(c => contactFavorites.has(c.name)).sort((a, b) => a.name.localeCompare(b.name));
    const rest = all.filter(c => !contactFavorites.has(c.name)).sort((a, b) => a.name.localeCompare(b.name));
    // Favourites first, then fill remaining slots with non-favourites, max 5 total
    const shown = [...favs, ...rest].slice(0, MAX_CHIPS);
    shown.forEach(c => {
      const chip = document.createElement('button');
      chip.className = 'ccy-pill';
      chip.style.cursor = 'pointer';
      const isFav = contactFavorites.has(c.name);
      const tier = window.stablesGetContactPaymentTier(c.name);
      chip.textContent = (isFav ? '⭐ ' : '') + c.name + paymentTierChipSuffix(tier);
      chip.title = c.address + (tier !== 'inherit' ? ' · ' + tier + ' pay tier' : '');
      chip.addEventListener('click', () => window.setSendRecipient(c.name, c.address, 'contact_chip'));
      wrap.appendChild(chip);
    });
  };

  window.setSendRecipient = function (name, address, source) {
    const input = document.getElementById('sendToInput');
    if (!input) return;
    input.value = `${name} · ${address}`;
    window.STABLES_SEND_SOURCE = source || 'contact_chip';
    if (typeof window.stablesUpdateSendTierHint === 'function') window.stablesUpdateSendTierHint();
  };

  // --- Contact picker overlay (shared across all address inputs) ---
  window.toggleContactFavorite = function (name) {
    if (contactFavorites.has(name)) {
      contactFavorites.delete(name);
    } else {
      contactFavorites.add(name);
    }
    persistFavorites();
    // Re-render everything that uses favorites ordering
    window.renderContactsPage();
    window.renderSendContactChips();
    // If picker is still open, re-render it
    const overlay = document.getElementById('contactPickerOverlay');
    if (overlay && overlay.style.display !== 'none') {
      const targetId = overlay.getAttribute('data-target-input');
      window._renderContactPickerList(targetId);
    }
  };

  window._renderContactPickerList = function (targetInputId) {
    const listEl = document.getElementById('contactPickerList');
    if (!listEl) return;
    const q = String(document.getElementById('contactPickerSearch')?.value || '').toLowerCase().trim();
    const all = Array.from(CONTACTS_BOOK.values()).filter(c =>
      !q || c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
    );
    const favs = all.filter(c => contactFavorites.has(c.name)).sort((a, b) => a.name.localeCompare(b.name));
    const rest = all.filter(c => !contactFavorites.has(c.name)).sort((a, b) => a.name.localeCompare(b.name));
    listEl.innerHTML = '';

    function makeRow(c) {
      const isFav = contactFavorites.has(c.name);
      const row = document.createElement('div');
      row.className = 'cpicker-row';
      row.innerHTML =
        `<div class="cpicker-row-ic">${isFav ? '⭐' : '👤'}</div>` +
        `<div class="cpicker-row-info">` +
          `<div class="cpicker-row-name">${c.name}</div>` +
          `<div class="cpicker-row-sub">${c.category} · <span style="font-family:monospace;font-size:11px">${c.address}</span></div>` +
        `</div>` +
        `<button type="button" class="cpicker-fav-btn" title="${isFav ? 'Remove favourite' : 'Add favourite'}" ` +
          `onclick="event.stopPropagation();toggleContactFavorite('${c.name.replace(/'/g, "\\'")}')">★</button>`;
      row.querySelector('.cpicker-row-info').addEventListener('click', () => {
        window.fillContactInput(targetInputId, c.name, c.address);
        window.closeContactPicker();
      });
      row.querySelector('.cpicker-row-ic').addEventListener('click', () => {
        window.fillContactInput(targetInputId, c.name, c.address);
        window.closeContactPicker();
      });
      const favBtn = row.querySelector('.cpicker-fav-btn');
      favBtn.style.color = isFav ? '#fbbf24' : 'var(--m)';
      return row;
    }

    if (favs.length) {
      const lbl = document.createElement('div');
      lbl.className = 'cpicker-section-label';
      lbl.textContent = '⭐ Favourites';
      listEl.appendChild(lbl);
      favs.forEach(c => listEl.appendChild(makeRow(c)));
    }
    if (rest.length) {
      if (favs.length) {
        const lbl = document.createElement('div');
        lbl.className = 'cpicker-section-label';
        lbl.textContent = 'Contacts';
        listEl.appendChild(lbl);
      }
      rest.forEach(c => listEl.appendChild(makeRow(c)));
    }
    if (!all.length) {
      const empty = document.createElement('div');
      empty.style.cssText = 'text-align:center;color:var(--m);font-size:13px;padding:24px 0;';
      empty.textContent = q ? 'No contacts match your search.' : 'No contacts yet.';
      listEl.appendChild(empty);
    }
  };

  window.openContactPicker = function (targetInputId) {
    const overlay = document.getElementById('contactPickerOverlay');
    if (!overlay) return;
    overlay.setAttribute('data-target-input', targetInputId || '');
    const searchEl = document.getElementById('contactPickerSearch');
    if (searchEl) searchEl.value = '';
    window._renderContactPickerList(targetInputId);
    overlay.style.display = 'flex';
    requestAnimationFrame(() => overlay.classList.add('cpicker-open'));
    if (searchEl) setTimeout(() => searchEl.focus(), 120);
  };

  window.closeContactPicker = function () {
    const overlay = document.getElementById('contactPickerOverlay');
    if (!overlay) return;
    overlay.classList.remove('cpicker-open');
    setTimeout(() => { overlay.style.display = 'none'; }, 220);
  };

  window.fillContactInput = function (targetInputId, name, address) {
    const el = document.getElementById(targetInputId);
    if (!el) return;
    el.value = `${name} · ${address}`;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  // --- First install setup ---
  window.toggleWelcomeCcy = function (el) {
    if (!el) return;
    if (el.dataset && el.dataset.ccy === 'MINIMA') {
      el.classList.remove('on');
      el.style.display = 'none';
      return;
    }
    el.classList.toggle('on');
    if (typeof window.renderCurrencyPillVisual === 'function') {
      window.renderCurrencyPillVisual(el);
    }
    window.updateWelcomePrimaryOptions();
    if (typeof window.persistWelcomeCurrencyChoicesIfValid === 'function') {
      window.persistWelcomeCurrencyChoicesIfValid();
    }
  };

  window.persistWelcomeCurrencyChoicesIfValid = function () {
    const selected = Array.from(document.querySelectorAll('#welcomeCurrencies .ccy-pill.on'))
      .map(x => x.dataset?.ccy).filter(code => code && code !== 'MINIMA');
    if (!selected.length) return;
    if (typeof window.persistWelcomeCurrencyChoices === 'function') {
      window.persistWelcomeCurrencyChoices();
    }
  };

  window.selectAllWelcomeCurrencies = function () {
    const pills = Array.from(document.querySelectorAll('#welcomeCurrencies .ccy-pill'));
    pills.forEach((p) => {
      if (p.dataset && p.dataset.ccy === 'MINIMA') {
        p.classList.remove('on');
        p.style.display = 'none';
        return;
      }
      if (!p.classList.contains('on')) window.toggleWelcomeCcy(p);
    });
  };

  window.unselectAllWelcomeCurrencies = function () {
    const pills = Array.from(document.querySelectorAll('#welcomeCurrencies .ccy-pill'));
    pills.forEach((p) => {
      if (p.dataset && p.dataset.ccy === 'MINIMA') {
        p.classList.remove('on');
        p.style.display = 'none';
        return;
      }
      if (p.classList.contains('on')) window.toggleWelcomeCcy(p);
    });
  };

  window.updateWelcomePrimaryOptions = function () {
    const sel = document.getElementById('welcomePrimary');
    if (!sel) return;
    const prev = String(sel.value || '');
    const selected = Array.from(document.querySelectorAll('#welcomeCurrencies .ccy-pill.on'))
      .map(x => String(x.dataset?.ccy || '').trim())
      .filter(code => code !== 'MINIMA')
      .filter(Boolean);
    const options = (selected.length ? selected : ['USDw']).slice().sort((a, b) => {
      const la = a === 'MINIMA' ? 'Winiwa' : a;
      const lb = b === 'MINIMA' ? 'Winiwa' : b;
      return la.localeCompare(lb);
    });
    sel.innerHTML = '';
    options.forEach(code => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = (typeof window.currencyDisplayLabel === 'function')
        ? window.currencyDisplayLabel(code)
        : code;
      sel.appendChild(opt);
    });
    const preferred = options.includes('WINIMA') ? 'WINIMA' : (options.includes('EURw') ? 'EURw' : options[0]);
    const next = options.includes(prev) ? prev : preferred;
    sel.value = next;
  };

  function syncWelcomeModalFabAccess() {
    try {
      const open = document.getElementById('welcomeSetupModal')?.classList.contains('open');
      document.body.classList.toggle('welcome-setup-open', !!open);
    } catch (_) {}
  }

  window.closeWelcomeSetup = function () {
    if (typeof closeAppLangMenus === 'function') closeAppLangMenus();
    try {
      sessionStorage.removeItem('stables_welcome_showcase_route_v1');
    } catch (_) {}
    const modal = document.getElementById('welcomeSetupModal');
    if (modal) modal.classList.remove('open');
    syncWelcomeModalFabAccess();

    const afterWelcomeMs = Math.max(
      500,
      Number((window.STABLES_CONFIG || {}).AUTO_OPEN_CONNECT_NODE_AFTER_WELCOME_MS) || 1800
    );
    setTimeout(() => {
      if (typeof window.stablesTryAutoOpenNodeConnectModal === 'function') {
        window.stablesTryAutoOpenNodeConnectModal();
      }
    }, afterWelcomeMs);

    setTimeout(() => {
      if (typeof window.checkBackupReminder === 'function') window.checkBackupReminder();
    }, 400);
    setTimeout(() => {
      if (typeof window.startVaultSecurityModalCountdown === 'function') {
        window.startVaultSecurityModalCountdown();
      } else if (typeof window.scheduleSeedPhraseSecurityModal === 'function') {
        window.scheduleSeedPhraseSecurityModal();
      }
    }, 300);

    // Reset steps when closing (next open starts at showcase intro unless a flow sets another step).
    const stepShowcaseIntro = document.getElementById('welcomeStepShowcaseIntro');
    const stepLang = document.getElementById('welcomeStepLang');
    const stepCurrencies = document.getElementById('welcomeStepCurrencies');
    const stepTourChoice = document.getElementById('welcomeStepTourChoice');
    const stepNerdTrack = document.getElementById('welcomeStepNerdTrack');
    const stepShowcaseMsg = document.getElementById('welcomeStepShowcaseMsg');
    const stepTourUseCase = document.getElementById('welcomeStepTourUseCase');
    const stepPIntro = document.getElementById('welcomeStepPersonalizeIntro');
    const stepP1 = document.getElementById('welcomeStepPersonalize1');
    const stepP2 = document.getElementById('welcomeStepPersonalize2');
    const stepP3 = document.getElementById('welcomeStepPersonalize3');
    const stepP4 = document.getElementById('welcomeStepPersonalize4');
    if (stepShowcaseIntro) stepShowcaseIntro.style.display = '';
    if (stepLang) stepLang.style.display = 'none';
    if (stepCurrencies) stepCurrencies.style.display = 'none';
    if (stepTourChoice) stepTourChoice.style.display = 'none';
    if (stepNerdTrack) stepNerdTrack.style.display = 'none';
    if (stepShowcaseMsg) stepShowcaseMsg.style.display = 'none';
    if (stepTourUseCase) stepTourUseCase.style.display = 'none';
    if (stepPIntro) stepPIntro.style.display = 'none';
    if (stepP1) stepP1.style.display = 'none';
    if (stepP2) stepP2.style.display = 'none';
    if (stepP3) stepP3.style.display = 'none';
    if (stepP4) stepP4.style.display = 'none';
    try {
      sessionStorage.removeItem('stables_guided_tour_from_menu_v1');
    } catch (_) {}
  };

  function showWelcomeStep(step) {
    const stepShowcaseIntro = document.getElementById('welcomeStepShowcaseIntro');
    const stepLang = document.getElementById('welcomeStepLang');
    const stepCurrencies = document.getElementById('welcomeStepCurrencies');
    const stepTourChoice = document.getElementById('welcomeStepTourChoice');
    const stepNerdTrack = document.getElementById('welcomeStepNerdTrack');
    const stepShowcaseMsg = document.getElementById('welcomeStepShowcaseMsg');
    const stepTourUseCase = document.getElementById('welcomeStepTourUseCase');
    const stepPIntro = document.getElementById('welcomeStepPersonalizeIntro');
    const stepP1 = document.getElementById('welcomeStepPersonalize1');
    const stepP2 = document.getElementById('welcomeStepPersonalize2');
    const stepP3 = document.getElementById('welcomeStepPersonalize3');
    const stepP4 = document.getElementById('welcomeStepPersonalize4');
    if (stepShowcaseIntro) stepShowcaseIntro.style.display = step === 'showcaseIntro' ? '' : 'none';
    if (stepLang) stepLang.style.display = step === 'lang' ? '' : 'none';
    if (stepCurrencies) stepCurrencies.style.display = step === 'currencies' ? '' : 'none';
    if (step === 'currencies') {
      document.querySelectorAll('#welcomeCurrencies .ccy-pill[data-ccy]').forEach((pill) => {
        if (typeof window.renderCurrencyPillVisual === 'function') window.renderCurrencyPillVisual(pill);
      });
      if (typeof window.updateWelcomePrimaryOptions === 'function') window.updateWelcomePrimaryOptions();
    }
    if (stepTourChoice) stepTourChoice.style.display = step === 'tourChoice' ? '' : 'none';
    if (stepNerdTrack) stepNerdTrack.style.display = step === 'nerdTrack' ? '' : 'none';
    if (stepShowcaseMsg) stepShowcaseMsg.style.display = step === 'showcaseMsg' ? '' : 'none';
    if (stepTourUseCase) stepTourUseCase.style.display = step === 'tourUseCase' ? '' : 'none';
    if (stepPIntro) stepPIntro.style.display = step === 'personalizeIntro' ? '' : 'none';
    if (stepP1) stepP1.style.display = step === 'personalize1' ? '' : 'none';
    if (stepP2) stepP2.style.display = step === 'personalize2' ? '' : 'none';
    if (stepP3) stepP3.style.display = step === 'personalize3' ? '' : 'none';
    if (stepP4) stepP4.style.display = step === 'personalize4' ? '' : 'none';
  }

  window.goWelcomeFromShowcaseIntro = function () {
    showWelcomeStep('lang');
  };

  window.goWelcomeToTourChoice = function () {
    showWelcomeStep('tourChoice');
  };

  const WELCOME_BANK_NAME_KEY = 'stables_bank_display_name_v1';

  window.persistWelcomeCurrencyChoices = function () {
    const selected = Array.from(document.querySelectorAll('#welcomeCurrencies .ccy-pill.on'))
      .map(x => x.dataset?.ccy).filter(code => code && code !== 'MINIMA');
    const selectedPrimary = document.getElementById('welcomePrimary')?.value || '';
    const primary = selected.includes(selectedPrimary)
      ? selectedPrimary
      : (selected.includes('WINIMA') ? 'WINIMA' : (selected.includes('EURw') ? 'EURw' : (selected[0] || 'WINIMA')));

    const pills = Array.from(document.querySelectorAll('#ccyDisplayPills .ccy-pill'));
    pills.forEach(p => {
      const code = p.dataset?.ccy;
      if (code === 'MINIMA') {
        p.classList.remove('on');
        p.style.display = 'none';
        return;
      }
      const shouldOn = selected.includes(code);
      if (!code) return;
      if (shouldOn && !p.classList.contains('on') && typeof window.toggleCcyPill === 'function') window.toggleCcyPill(p);
      if (!shouldOn && p.classList.contains('on') && typeof window.toggleCcyPill === 'function') window.toggleCcyPill(p);
    });

    if (typeof window.setPrimary === 'function') window.setPrimary(primary, true);
  };

  window.finalizeWelcomeSetup = function () {
    const lang = document.getElementById('welcomeLang')?.value || 'en';

    const bankDraft = String(document.getElementById('welcomeBankNameInput')?.value || '').trim();
    try {
      if (bankDraft) localStorage.setItem(WELCOME_BANK_NAME_KEY, bankDraft);
    } catch (_) {}

    localStorage.setItem('stables_welcome_done_v1', '1');
    localStorage.setItem('stables_lang_pref', lang);

    let showcaseRoute = null;
    try {
      showcaseRoute = sessionStorage.getItem('stables_welcome_showcase_route_v1');
      sessionStorage.removeItem('stables_welcome_showcase_route_v1');
    } catch (_) {}

    if (showcaseRoute === 'node') {
      try {
        localStorage.setItem('stables_showcase_install_intent_v1', '1');
      } catch (_) {}
    }

    if (typeof window.refreshTopbarBrand === 'function') window.refreshTopbarBrand();
    if (typeof window.closeWelcomeSetup === 'function') window.closeWelcomeSetup();
  };

  window.goWelcomeAfterCurrencySave = function () {
    const selected = Array.from(document.querySelectorAll('#welcomeCurrencies .ccy-pill.on'))
      .map(x => x.dataset?.ccy).filter(Boolean);
    if (!selected.length) {
      if (typeof window.showToast === 'function') {
        window.showToast('Pick at least one currency.', { tone: 'amber', durationMs: 3800 });
      }
      return;
    }
    window.persistWelcomeCurrencyChoices();
    showWelcomeStep('personalizeIntro');
  };

  window.goWelcomePersonalizeFromIntro = function () {
    const input = document.getElementById('welcomeBankNameInput');
    if (input) {
      try {
        const saved = String(localStorage.getItem(WELCOME_BANK_NAME_KEY) || '').trim();
        if (saved) input.value = saved;
      } catch (_) {}
    }
    showWelcomeStep('personalize1');
  };

  window.goWelcomePersonalizeNext = function (fromStep) {
    if (fromStep === 1) {
      const name = String(document.getElementById('welcomeBankNameInput')?.value || '').trim();
      try {
        if (name) localStorage.setItem(WELCOME_BANK_NAME_KEY, name);
        else localStorage.removeItem(WELCOME_BANK_NAME_KEY);
      } catch (_) {}
      if (typeof window.refreshTopbarBrand === 'function') window.refreshTopbarBrand();
      // Profile picture step removed: go straight to the contacts step.
      showWelcomeStep('personalize3');
      if (typeof window.renderWelcomeDirectoryPreview === 'function') {
        window.renderWelcomeDirectoryPreview();
      }
      return;
    }
  };

  /** Welcome personalize step 3 (final): show "later stage" notice, then refresh the contacts preview in place. */
  window.openWelcomeContactsFromPersonalize = function () {
    const modal = document.getElementById('agentActionModal');
    const title = document.getElementById('agentActionTitle');
    const titleRight = document.getElementById('agentActionTitleRight');
    const content = document.getElementById('agentActionContent');
    if (!modal || !title || !content) {
      // Fallback: preserve onboarding continuity even if notice UI is unavailable.
      if (typeof window.renderWelcomeDirectoryPreview === 'function') window.renderWelcomeDirectoryPreview();
      return;
    }
    title.textContent = 'Contacts';
    if (titleRight) titleRight.innerHTML = '';
    modal.classList.add('agent-action-notice');
    content.innerHTML = `
      <p class="sec-body" style="margin:0 0 12px;line-height:1.55;color:#fbbf24">
        Opening <strong style="color:#fbbf24">Contacts</strong> from this onboarding step will be added in a <strong style="color:#fbbf24">later stage</strong>.
      </p>
      <button class="btn btn-w" style="width:100%" onclick="closeWelcomeContactsComingSoonModal(event)">OK</button>
    `;
    modal.classList.add('open');
  };

  window.closeWelcomeContactsComingSoonModal = function (ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    const topModal = document.getElementById('agentActionModal');
    if (topModal) topModal.classList.remove('open', 'agent-action-notice');
    if (typeof window.renderWelcomeDirectoryPreview === 'function') window.renderWelcomeDirectoryPreview();
  };

  window.finishWelcomePersonalization = function () {
    const bank = String(document.getElementById('welcomeBankNameInput')?.value || '').trim()
      || String(localStorage.getItem(WELCOME_BANK_NAME_KEY) || '').trim();
    try {
      if (bank) localStorage.setItem(WELCOME_BANK_NAME_KEY, bank);
    } catch (_) {}

    const nameEl = document.getElementById('councilNameInput');
    if (nameEl && bank) {
      const cur = String(nameEl.value || '').trim();
      if (!cur || cur === 'Council Member') nameEl.value = bank;
    }

    if (typeof window.saveCouncilMemberProfile === 'function') {
      try {
        window.saveCouncilMemberProfile();
      } catch (_) {}
    }

    window.finalizeWelcomeSetup();
  };

  window.applyWelcomeSetup = function (opts) {
    const skipCurrency = opts && opts.skipCurrency === true;
    if (!skipCurrency) window.persistWelcomeCurrencyChoices();
    window.finalizeWelcomeSetup();
  };

  /** After showcase web/node choice: remember route and open currency step (unless guided tour was opened from More → Help). */
  window.goWelcomeFromShowcaseRoute = function (route) {
    const r = String(route || '').trim().toLowerCase() === 'node' ? 'node' : 'web';
    try {
      sessionStorage.setItem('stables_welcome_showcase_route_v1', r);
    } catch (_) {}
    if (r === 'node') {
      const url = String(window.STABLES_CONFIG?.MDS_ZIP_URL || '').trim();
      if (url) {
        try {
          window.open(url, '_blank', 'noopener,noreferrer');
        } catch (_) {}
      }
    }

    let fromMenuTour = false;
    try {
      fromMenuTour = sessionStorage.getItem('stables_guided_tour_from_menu_v1') === '1';
    } catch (_) {}
    if (fromMenuTour) {
      try {
        sessionStorage.removeItem('stables_guided_tour_from_menu_v1');
      } catch (_) {}
      if (typeof window.updateWelcomeLanguage === 'function') window.updateWelcomeLanguage();
      window.applyWelcomeSetup({ skipCurrency: true });
      return;
    }

    showWelcomeStep('currencies');
    if (typeof window.updateWelcomeLanguage === 'function') window.updateWelcomeLanguage();
    if (typeof window.updateWelcomePrimaryOptions === 'function') window.updateWelcomePrimaryOptions();
  };

  window.updateWelcomeLanguage = function () {
    const stepLangWrap = document.getElementById('welcomeStepLang');
    // Welcome copy is English-only until translations are finalized.
    const dir = 'ltr';
    if (stepLangWrap) stepLangWrap.setAttribute('dir', dir);

    const elTitle = document.getElementById('welcomeTitle');
    const elCongrats = document.getElementById('welcomeCongrats');
    const elShowcaseIntroBody = document.getElementById('welcomeShowcaseIntroBody');
    const elWelcomeUnderstandBtn = document.getElementById('welcomeUnderstandBtn');
    const elIntroBody = document.getElementById('welcomeIntroBody');
    const elShowcase = document.getElementById('welcomeShowcaseCopy');
    const elTourChoiceHead = document.getElementById('welcomeTourChoiceHead');
    const elTourMerchantBtn = document.getElementById('welcomeTourMerchantBtn');
    const elTourShopAmbassadorBtn = document.getElementById('welcomeTourShopAmbassadorBtn');
    const elTourPersonBtn = document.getElementById('welcomeTourPersonBtn');
    const elTourNerdBtn = document.getElementById('welcomeTourNerdBtn');
    const elExploreBtn = document.getElementById('welcomeExploreBtn');
    const elUseTitle = document.getElementById('welcomeUseTitle');
    const elUsePrompt = document.getElementById('welcomeUsePrompt');
    const elPersonalBtn = document.getElementById('welcomePersonalBtn');
    const elMerchantBtn = document.getElementById('welcomeMerchantBtn');
    const elShowcaseHereBtn = document.getElementById('welcomeShowcaseHereBtn');
    const elShowcaseNodeBtn = document.getElementById('welcomeShowcaseNodeBtn');
    // This element may not exist after copy/layout updates.
    const elShowcaseFinalMsg = document.getElementById('welcomeShowcaseFinalMsg');
    const elWelcomeCurrencyIntro = document.getElementById('welcomeCurrencyIntro');
    const elWelcomeCurrencyNote = document.getElementById('welcomeCurrencyNote');

    const elNerdTrackTitle = document.getElementById('welcomeNerdTrackTitle');
    const elNerdTrackBody = document.getElementById('welcomeNerdTrackBody');
    const elNerdTrackTechBtn = document.getElementById('welcomeNerdTrackTechBtn');
    const elNerdTrackFinanceBtn = document.getElementById('welcomeNerdTrackFinanceBtn');

    const copy = {
      en: {
        congrats: 'Congratulations on becoming your bank.',
        /** Step 0 only: demo notice + Telegram (HTML safe, static). */
        welcomeShowcaseIntroHtml:
          '<p class="sec-body">This is the <strong style="color:var(--t)">Stables demo</strong> (<strong style="color:var(--t)">version __APP_VERSION__</strong>), the channel after the earlier showcase preview. The showcase showed direction and early UI; this demo adds deeper wiring: <strong style="color:var(--t)">Connect node</strong> for live chain height and on-chain MINIMA transaction, more wallet and flow experiments, and the same feedback loop.</p>' +
          '<p class="sec-body">The Stables dapp can be downloaded <a href="__MDS_REPO_URL__" target="_blank" rel="noopener noreferrer">here</a> as a MiniDapp zip package. Write mode is required for StablesAgent, sending feedback, and other features that use the network.</p>' +
          '<p class="sec-body"><strong style="color:var(--t)">What you can try:</strong> explore the app, use <strong style="color:var(--t)">StablesAgent</strong> (it may be busy, retry shortly), send feedback under <strong style="color:var(--t)">More - Feedback</strong>, test native MINIMA receive and send when your node is live, and use the mint / burn UI as it evolves toward the test phase.</p>' +
          '<p class="sec-body"><strong style="color:var(--t)">What is not here yet:</strong> a finished product, full guided tours as shipped features, or guarantees on agent capacity.</p>' +
          '<p class="sec-body">Updates still land often. If you use the MiniDapp on your Minima node, refresh the package from <a href="__MDS_REPO_URL__" target="_blank" rel="noopener noreferrer">the download link</a> when a new build is published.</p>' +
          '<p class="sec-body">The Stables community can be reached at <a href="https://t.me/stablescommunity" target="_blank" rel="noopener noreferrer">t.me/stablescommunity</a>.</p>',
        showcaseIntroUnderstandBtn: 'I understand',
        title: '',
        introParas: [
          'Your bank opens up great possibilities, and real responsibilities too.',
          'Don’t worry: we are a community that supports each other. You will be able to find all the information you need in order to set your bank securely.'
        ],
        showcase:
          'A fuller guided tour will arrive in a later build.\n\nFor now, explore this demo in the app. Open the agent from the main bottom icon [AGENT_ICON] or from the small top buttons in each section. The agent has limited capacity and may say it is busy, so retry shortly. You can talk to the agent in your language of choice.',
        currencySetupIntro:
          'Let’s just set up your currency of choice now, so that your bank is already personalised.',
        currencySetupNote:
          'Chosen currencies are arbitrary for now. In production, currencies will be added as demand appears, and this structure lets us add the main paper currencies quite easily.',
        tourChoiceHint: 'Pick your path for the StablesAgent guided tour.',
        tourMerchantBtn: 'I\'m a merchant. I want to know how this will streamline my business process.',
        tourShopAmbassadorBtn:
          'I want to become a shop ambassador and explore what the earning opportunities are.',
        tourPersonBtn: 'I\'m a person. I want to understand what I\'ll be able to do with my bank.',
        tourNerdBtn: 'I\'m a nerd. I want to understand how this holds together.',
        nerdTrackTitle: 'Pick your nerd deep dive',
        nerdTrackBody: 'Choose what you want to inspect first in this demo.',
        nerdTrackTechBtn: 'Tech + blockchain',
        nerdTrackFinanceBtn: 'Financial side: how Stables is structured and ensures the peg',
        exploreBtn: 'I\'m a viewer. I want to look around.',
        showcaseHereBtn: 'OK, I\'ll go explore for now',
        showcaseNodeBtn: 'Access MiniDapp package for my node',
        showcaseFinalMsg: 'See you back on your node.',
        useTitle: 'How will you mainly use the app?',
        usePrompt: 'Personal or merchant?',
        personalBtn: 'Personal',
        merchantBtn: 'Merchant'
      }
    };

    const c = copy.en;
    if (elShowcaseIntroBody) {
      const cfg = (window && window.STABLES_CONFIG) || {};
      const rawVersion = String(cfg.APP_BUILD_VERSION || 'unknown').trim();
      const iteration = Number(cfg.APP_BUILD_ITERATION);
      const versionLabel = rawVersion && rawVersion !== 'unknown'
        ? (() => {
            const parts = rawVersion.replace(/^v/i, '').split('.');
            if (Number.isFinite(iteration) && iteration > 0) {
              parts[parts.length - 1] = String(Math.trunc(iteration)).padStart(2, '0');
            }
            return 'v' + parts.map(part => {
              if (/^0\d+$/.test(part)) return part;
              const n = Number(part);
              return Number.isFinite(n) ? String(n) : String(part).trim();
            }).join('.');
          })()
        : 'unknown';
      const repoUrl = String(cfg.MDS_ZIP_URL || 'https://stablescouncil.org/dapp/3-test/build/Stables_v0.0.10.83.mds.zip').trim();
      const introHtml = String(c.welcomeShowcaseIntroHtml || '')
        .replace(/__APP_VERSION__/g, versionLabel)
        .replace(/__MDS_REPO_URL__/g, repoUrl);
      if (introHtml) elShowcaseIntroBody.innerHTML = introHtml;
      else elShowcaseIntroBody.textContent = '';
    }
    if (elWelcomeUnderstandBtn && c.showcaseIntroUnderstandBtn) {
      elWelcomeUnderstandBtn.textContent = c.showcaseIntroUnderstandBtn;
    }
    if (elWelcomeCurrencyIntro && c.currencySetupIntro) {
      elWelcomeCurrencyIntro.textContent = c.currencySetupIntro;
    }
    if (elWelcomeCurrencyNote && c.currencySetupNote) {
      elWelcomeCurrencyNote.textContent = c.currencySetupNote;
    }

    if (!elTitle || !elCongrats || !elIntroBody) return;
    if (c.congrats) elCongrats.textContent = c.congrats;
    const welcomeTitleText = (c.title != null && String(c.title).trim()) || '';
    if (welcomeTitleText) {
      elTitle.style.display = '';
      elTitle.textContent = welcomeTitleText;
    } else {
      elTitle.style.display = 'none';
    }
    elIntroBody.innerHTML = '';
    const paras = Array.isArray(c.introParas) ? c.introParas : [];
    paras.forEach((p, i) => {
      const pe = document.createElement('p');
      pe.className = i < paras.length - 1 ? 'sec-body ui-mb-6' : 'sec-body ui-m-0';
      pe.textContent = p;
      elIntroBody.appendChild(pe);
    });
    if (elShowcase) {
      const showcaseText = String(c.showcase || '');
      const iconHtml = '<img src="agent.png" alt="StablesAgent" class="asset-icon-inline">';
      const showcaseHtml = showcaseText
        .replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[ch]))
        .replace(/\n/g, '<br>')
        .replace(/\[AGENT_ICON\]/g, iconHtml);
      elShowcase.innerHTML = showcaseHtml;
    }
    if (elTourChoiceHead) elTourChoiceHead.textContent = c.tourChoiceHint || '';
    if (elExploreBtn) elExploreBtn.textContent = c.exploreBtn;
    if (elTourMerchantBtn) elTourMerchantBtn.textContent = c.tourMerchantBtn;
    if (elTourShopAmbassadorBtn) elTourShopAmbassadorBtn.textContent = c.tourShopAmbassadorBtn;
    if (elTourPersonBtn) elTourPersonBtn.textContent = c.tourPersonBtn;
    if (elTourNerdBtn) elTourNerdBtn.textContent = c.tourNerdBtn;
    if (elUseTitle) elUseTitle.textContent = c.useTitle;
    if (elUsePrompt) elUsePrompt.textContent = c.usePrompt;
    if (elPersonalBtn) elPersonalBtn.textContent = c.personalBtn;
    if (elMerchantBtn) elMerchantBtn.textContent = c.merchantBtn;
    if (elShowcaseHereBtn) elShowcaseHereBtn.textContent = c.showcaseHereBtn;
    if (elShowcaseNodeBtn) elShowcaseNodeBtn.textContent = c.showcaseNodeBtn;
    if (elShowcaseFinalMsg) elShowcaseFinalMsg.textContent = c.showcaseFinalMsg;

    if (elNerdTrackTitle) elNerdTrackTitle.textContent = c.nerdTrackTitle;
    if (elNerdTrackBody) elNerdTrackBody.textContent = c.nerdTrackBody;
    if (elNerdTrackTechBtn) elNerdTrackTechBtn.textContent = c.nerdTrackTechBtn;
    if (elNerdTrackFinanceBtn) elNerdTrackFinanceBtn.textContent = c.nerdTrackFinanceBtn;
  };

  window.setWelcomeTourChoice = function (choice) {
    const c = String(choice || '').trim();
    localStorage.setItem('stables_welcome_tour_choice_v1', c);
    if (c === 'nerd') {
      showWelcomeStep('nerdTrack');
      return;
    }

    // Merchant, shop/ambassador, person, explore: web vs node, then currency setup.
    showWelcomeStep('showcaseMsg');
  };

  window.setWelcomeNerdTrack = function (track) {
    const t = String(track || '').trim();
    localStorage.setItem('stables_welcome_nerd_track_v1', t);
    showWelcomeStep('showcaseMsg');
  };

  window.openStablesMdsZipFromWelcome = function () {
    // Remember that the user took the fast path so the next real-node run can show a special message.
    try {
      localStorage.setItem('stables_showcase_install_intent_v1', '1');
    } catch (_) {}

    if (typeof window.closeWelcomeSetup === 'function') window.closeWelcomeSetup();

    const url = window.STABLES_CONFIG?.MDS_ZIP_URL;
    if (!url) {
      if (typeof window.showToast === 'function') window.showToast('Download link not set', 'Ask Charles to set MDS_ZIP_URL in runtime-config.js.');
      return;
    }
    window.open(url, '_blank');
  };

  window.setWelcomeUseCase = function (useCase) {
    const u = String(useCase || '').trim();
    localStorage.setItem('stables_welcome_use_case_v1', u);
    window.closeWelcomeSetup();
    if (typeof window.showToast === 'function') window.showToast('Setup saved');
  };

  window.renderWelcomeDirectoryPreview = function () {
    const el = document.getElementById('welcomeDirectoryList');
    if (!el) return;
    el.innerHTML = '';
    let n = 0;
    for (const c of CONTACTS_BOOK.values()) {
      if (n++ >= 14) break;
      const row = document.createElement('div');
      row.style.cssText = 'padding:8px 10px;border-radius:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px';
      const name = document.createElement('span');
      name.style.fontWeight = '700';
      name.style.color = 'var(--t)';
      name.textContent = c.name;
      const cat = document.createElement('span');
      cat.style.color = 'var(--m)';
      cat.style.fontSize = '12px';
      cat.textContent = c.category || '';
      row.appendChild(name);
      row.appendChild(cat);
      el.appendChild(row);
    }
    if (!n) {
      const row = document.createElement('div');
      row.style.cssText = 'padding:10px;border-radius:10px;font-size:13px;color:var(--m);text-align:center';
      row.textContent = 'No contacts yet.';
      el.appendChild(row);
    }
  };

  /** Legacy alias: guided tours now live inside the StablesAgent drawer. */
  window.openWelcomeGuidedToursFromMenu = function () {
    if (typeof window.openAgentGuidedTour === 'function') {
      window.openAgentGuidedTour();
      return;
    }
    if (typeof window.openAgent === 'function') {
      window.openAgent(false);
      return;
    }
    const modal = document.getElementById('welcomeSetupModal');
    if (!modal) return;
    modal.classList.add('open');
    syncWelcomeModalFabAccess();
    const langSel = document.getElementById('welcomeLang');
    if (langSel) {
      try {
        const pref = localStorage.getItem('stables_lang_pref');
        if (pref && Array.from(langSel.options).some(o => o.value === pref)) langSel.value = pref;
      } catch (_) {}
    }
    if (typeof window.updateWelcomeLanguage === 'function') window.updateWelcomeLanguage();
    showWelcomeStep('tourChoice');
  };

  setTimeout(() => {
    if (typeof window.renderCouncilCommunicationPanels === 'function') window.renderCouncilCommunicationPanels();
  }, 50);

  setTimeout(() => {
    if (typeof window.refreshSettingsBackupCopy === 'function') window.refreshSettingsBackupCopy();
  }, 120);

  // Initialize reminders once.
  setTimeout(() => window.checkBackupReminder(), 1600);
  setTimeout(() => {
    installTransactionListClickDelegates();
    hydrateVisibleTransactionRows();
    const activityPageEl = document.getElementById('page-activity');
    if (activityPageEl && activityPageEl.classList.contains('active') && typeof window.renderActivity === 'function') {
      window.renderActivity();
    }
  }, 250);
  setTimeout(() => window.renderWalletRecentActivity(), 650);
  setTimeout(() => { if (typeof window.renderExchangeRecentList === 'function') window.renderExchangeRecentList(); }, 660);
  setTimeout(() => { if (typeof window.refreshSpendShopCards === 'function') window.refreshSpendShopCards(); }, 400);
  setTimeout(() => {
    window.updateWelcomePrimaryOptions();
    const langSel = document.getElementById('welcomeLang');
    if (langSel) {
      try {
        const pref = localStorage.getItem('stables_lang_pref');
        if (pref && Array.from(langSel.options).some(o => o.value === pref)) langSel.value = pref;
      } catch (_) {}
    }
    // Welcome now lives in the StablesAgent dialog timeline. Keep the legacy modal dormant
    // so older controls still have a fallback, but do not auto-open it on load.
    try {
      if (typeof window.refreshAgentAttentionBadges === 'function') window.refreshAgentAttentionBadges();
    } catch (_) {}
    if (typeof window.updateWelcomeLanguage === 'function') window.updateWelcomeLanguage();
  }, 700);
})();
