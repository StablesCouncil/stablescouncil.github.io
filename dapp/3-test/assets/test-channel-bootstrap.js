/**
 * Test channel overrides (APP_STAGE: test).
 * Loads after runtime-config.js. Wires on-chain Winiwa faucet, USDw/xWiniwa mint/burn, and live balances.
 */
(function () {
  'use strict';

  const cfg = window.STABLES_CONFIG || {};
  if (cfg.APP_STAGE !== 'test') return;
  const tv81Exclusive = String(cfg.TEST_PROTOCOL_GENERATION || '').toLowerCase() === 'tv81';

  function releaseFeatureAllowed(feature) {
    if (typeof window.stablesReleaseAllowsFeature === 'function') {
      return window.stablesReleaseAllowsFeature(feature);
    }
    const profile = cfg.FIRST_TEST_RELEASE_PROFILE;
    if (!profile || !Array.isArray(profile.enabledFeatures)) return true;
    return profile.enabledFeatures.indexOf(String(feature || '')) >= 0;
  }

  function releaseRequireFeature(feature, label) {
    if (releaseFeatureAllowed(feature)) return true;
    if (typeof window.stablesReleaseRequireFeature === 'function') {
      window.stablesReleaseRequireFeature(feature, label);
    } else {
      try { showToast(String(label || feature) + ' is not included in this test release.', { tone: 'amber', durationMs: 7000 }); } catch (_) { /* ignore */ }
    }
    return false;
  }

  function releaseDeferredError(label) {
    const err = new Error(String(label || 'This feature') + ' is not included in this test release.');
    err.code = 'RELEASE_FEATURE_DEFERRED';
    return err;
  }

  // Keyboard/focus diagnostics (logcat-only via the StablesWeb console bridge): logs which
  // element gains/loses focus and whether the lost input was detached from the DOM, so
  // "keyboard closes itself ~1s after tapping an input" reports are diagnosable on-device
  // with `adb logcat StablesWeb:D *:S`.
  try {
    const focusName = function (el) {
      if (!el) return 'none';
      return (el.id || (typeof el.className === 'string' && el.className.split(' ')[0]) || el.tagName || 'unknown');
    };
    document.addEventListener('focusin', function (e) {
      const t = e.target;
      if (!t || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')) return;
      try { console.log('[Stables focus] IN ' + focusName(t)); } catch (_) { /* ignore */ }
      // Keyboard on first tap (standalone APK): Chromium only auto-shows the IME when it
      // attributes the focus change to its own tap gesture; in this WebView the first tap into
      // a field moves DOM focus without that attribution (keyboard needed a second tap). Ask the
      // shell to show it explicitly — no-op when it is already up, or on web/MiniDapp surfaces.
      try {
        const kbType = String(t.type || '').toLowerCase();
        const wantsKeyboard = t.tagName === 'TEXTAREA'
          || (t.tagName === 'INPUT'
            && !/^(checkbox|radio|button|submit|reset|file|range|color|date|time|datetime-local|month|week|hidden)$/.test(kbType)
            && !t.readOnly && !t.disabled);
        if (wantsKeyboard && window.StablesAndroid
          && typeof window.StablesAndroid.requestShowKeyboard === 'function') {
          setTimeout(function () {
            try {
              if (document.activeElement === t) window.StablesAndroid.requestShowKeyboard();
            } catch (_) { /* ignore */ }
          }, 80);
        }
      } catch (_) { /* ignore */ }
    }, true);
    document.addEventListener('focusout', function (e) {
      const t = e.target;
      if (!t || !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')) return;
      const detached = !document.documentElement.contains(t);
      try {
        console.log('[Stables focus] OUT ' + focusName(t) + ' -> ' + focusName(e.relatedTarget)
          + (detached ? ' (INPUT DETACHED FROM DOM)' : ''));
      } catch (_) { /* ignore */ }
    }, true);
    window.addEventListener('resize', function () {
      try {
        console.log('[Stables focus] resize ' + window.innerWidth + 'x' + window.innerHeight
          + ' active=' + focusName(document.activeElement));
      } catch (_) { /* ignore */ }
    });
  } catch (_) { /* diagnostics only */ }

  const reg = cfg.TEST_TOKEN_REGISTRY || {};
  const faucetMode = String(cfg.TEST_FAUCET_MODE || 'api').toLowerCase();
  const apiUrl = String(cfg.TEST_FAUCET_API_URL || reg.faucet_api_url || 'http://127.0.0.1:8789').replace(/\/+$/, '');
  const claimAmount = tv81Exclusive ? Number(reg.faucet_claim_amount || 0) : Number(reg.faucet_claim_amount || cfg.TEST_FAUCET_CLAIM_AMOUNT || 1000);
  const winiwaTokenId = String(reg.winiwa_token_id || '').trim();
  const usdwTokenId = String(reg.usdw_token_id || '').trim();
  const xwiniwaTokenId = String(reg.xwiniwa_token_id || '').trim();
  const poolMiniaddress = String(reg.pool_miniaddress || '').trim();
  const issuerMiniaddress = String(reg.issuer_miniaddress || '').trim();
  const covenantAddress = String(
    (tv81Exclusive ? reg.faucet_covenant_address : (cfg.TEST_FAUCET_COVENANT_ADDRESS || reg.faucet_covenant_address)) || ''
  ).trim();
  const covenantMiniaddress = String(
    (tv81Exclusive ? reg.faucet_covenant_miniaddress : (cfg.TEST_FAUCET_COVENANT_MINIADDRESS || reg.faucet_covenant_miniaddress)) || ''
  ).trim();
  const covenantScript = tv81Exclusive ? '' : String(cfg.TEST_FAUCET_COVENANT_SCRIPT || '').trim();
  // Trustless mint/burn covenant (collateral_covenant_v3 hardened). 'covenant' = on-chain atomic; 'api' = legacy issuer.
  const mintBurnMode = String(cfg.TEST_MINT_BURN_MODE || 'api').toLowerCase();
  const mintBurnCovenantAddress = String(
    (tv81Exclusive ? reg.mint_burn_covenant_address : (cfg.TEST_MINT_BURN_COVENANT_ADDRESS || reg.mint_burn_covenant_address)) || ''
  ).trim();
  const mintBurnCovenantScript = tv81Exclusive ? '' : String(cfg.TEST_MINT_BURN_COVENANT_SCRIPT || '').trim();
  const MINT_BURN_TXN_ID = 'stables_mint_burn';
  const MINT_BURN_TAG = String(cfg.TEST_MINT_BURN_STATE_TAG || '7');
  const xwiniwaMintBurnMode = String(cfg.TEST_XWINIWA_MINT_BURN_MODE || reg.xwiniwa_mint_burn_mode || 'covenant').toLowerCase();
  const xwiniwaCovenantAddress = String(
    (tv81Exclusive ? reg.xwiniwa_covenant_address : (cfg.TEST_XWINIWA_COVENANT_ADDRESS || reg.xwiniwa_covenant_address)) || ''
  ).trim();
  const xwiniwaCovenantMiniaddress = String(
    cfg.TEST_XWINIWA_COVENANT_MINIADDRESS || reg.xwiniwa_covenant_miniaddress || ''
  ).trim();
  const xwiniwaCovenantScript = tv81Exclusive ? '' : String(cfg.TEST_XWINIWA_COVENANT_SCRIPT || '').trim();
  const XWINIWA_TXN_ID = 'stables_xwiniwa_mint_burn';
  const XWINIWA_TAG = String(cfg.TEST_XWINIWA_STATE_TAG || reg.xwiniwa_state_tag || '17');
  // ============================================================================================
  // GENESIS-6 (the POOL GENERATION, live on TestV006) — slice 1: config + pool reader.
  // No oracle. The pool state coin carries the book; the price is read straight off the chain.
  // This reader is SELF-CONTAINED (its own fetch to the genesis-6 RPC/proxy) so it is verifiable
  // before any surface is wired. Later slices (faucet, swap, LP) build on it.
  // ============================================================================================
  const g6cfg = tv81Exclusive ? {} : (cfg.TEST_GENESIS6 || {});
  async function g6Rpc(command) {
    const base = String(g6cfg.rpc_url || 'http://localhost:9006').replace(/\/$/, '');
    const res = await fetch(base + '/' + encodeURIComponent(command), { method: 'GET', cache: 'no-store' });
    const text = await res.text();
    try { return JSON.parse(text); } catch (_) { return { status: false, error: text || ('HTTP ' + res.status) }; }
  }
  function g6StateMap(coin) {
    const m = {};
    ((coin && coin.state) || []).forEach(function (s) { m[Number(s.port)] = s.data; });
    return m;
  }
  // Read the live pool: returns { price, winiwa, xwiniwa, activeBin, nonce, lpRemaining } or null.
  async function g6ReadPool() {
    if (!g6cfg.pool_address) return null;
    const j = await g6Rpc('coins address:' + g6cfg.pool_address);
    const coins = (j && j.response) || [];
    // the pool STATE coin is the storestate coin carrying the book (has slot 9 = active bin)
    const pool = coins.filter(function (c) { return c && !c.spent && c.storestate; })
      .find(function (c) { return g6StateMap(c)[9] !== undefined; });
    if (!pool) return null;
    const st = g6StateMap(pool);
    const activeBin = Number(st[9]);
    const price = Number(g6cfg.price_base) + activeBin * Number(g6cfg.price_step);
    return {
      price: price,
      winiwa: st[1],
      xwiniwa: st[2],
      activeBin: activeBin,
      nonce: st[0],
      lpRemaining: st[3],
    };
  }
  window.__STABLES_G6_CFG = g6cfg;
  window.__STABLES_G6_RPC = g6Rpc;
  window.__STABLES_G6_READ_POOL = g6ReadPool;

  // GENESIS-3 forward-pricing (commit→clear). Lab profile (Test12) while proving; flip TEST_FORWARD_PRICING
  // on per surface once verified. An order = a COMMIT (collateral → commit covenant); the keeper clears it.
  const g3cfg = cfg.TEST_GENESIS3 || {};
  const g3lab = g3cfg.lab || {};
  const forwardPricing = tv81Exclusive ? false : (!!cfg.TEST_FORWARD_PRICING || (function () { try { return /[?&]fwd=1/.test(location.search); } catch (_) { return false; } })());
  const G3_ORDER_TXN_ID = 'stables_g3_order';
  // PROFILE resolver (lab | prod) — the ONE place the executor + faucet read addresses/tokens/decimals.
  // Flipping TEST_FORWARD_PRICING_PROFILE to 'prod' (after the genesis-3.1 ceremony) is the whole app-side
  // of go-live: prod uses Winiwa collateral (8-dec), the 9 currencies (from genesis3-registry.json), and
  // the production commit/vault/CF. Lab is single-currency LABU/LABW (0-dec).
  const g3profileName = String(cfg.TEST_FORWARD_PRICING_PROFILE || 'lab').toLowerCase();
  let g3Registry = null;
  const g3prof = (g3profileName === 'prod') ? {
    name: 'prod',
    commit_address: g3cfg.commit_address, vault_address: g3cfg.vault_address, cf_vault_address: g3cfg.cf_vault_address,
    cf_commit_address: g3cfg.cf_commit_address || '',
    wintok: g3cfg.winiwa_token_id, decimals: 8,
    faucet_address: cfg.TEST_GENESIS3_PROD_FAUCET_ADDRESS || '', faucet_claim: Number(cfg.TEST_GENESIS3_PROD_FAUCET_CLAIM || 100),
    active: g3cfg.active || [],
    currencyTok: function (ccy) { try { const c = g3Registry && g3Registry.currencies && g3Registry.currencies[ccy]; return (c && c.tokenid) || ''; } catch (_) { return ''; } },
    cfShareTok: function (ccy) { try { const c = g3Registry && g3Registry.currencies && g3Registry.currencies[ccy]; return (c && c.cf) || ''; } catch (_) { return ''; } },
    swap_commit_address: g3cfg.swap_commit_address || '',
    swapTok: function (ccy) { try { const c = g3Registry && g3Registry.currencies && g3Registry.currencies[ccy]; return (c && c.active && c.tokenid) || ''; } catch (_) { return ''; } }
  } : {
    name: 'lab',
    commit_address: g3lab.commit_address, vault_address: g3lab.vault_address, cf_vault_address: g3lab.cf_vault_address || '',
    cf_commit_address: g3lab.cf_commit_address || '',
    wintok: g3lab.wintok, decimals: 0,
    faucet_address: g3lab.faucet_address, faucet_claim: Number(g3lab.faucet_claim || 1000),
    active: ['USDw'],
    currencyTok: function () { return g3lab.covtok; },   // single lab currency (LABU), shown as USDw
    cfShareTok: function () { return g3lab.cf_share_token || ''; },   // single lab cf share (LABCF), shown as USDwcf
    swap_commit_address: g3lab.swap_commit_address || '',
    // Lab swap pair (proven on-chain): USDw = LABU (vaultA @port60), the configured second ccy = LABCF (vaultB @port61)
    swapTok: function (ccy) {
      if (ccy === 'USDw') return g3lab.covtok;
      if (ccy === (g3lab.swap_pair_to_ccy || 'EURw')) return g3lab.swap_pair_to_token || '';
      return '';
    }
  };
  // Faucet presentation and claim readiness must read the SAME active profile. Forward-pricing
  // lab/prod claims use g3prof, while the legacy path uses the genesis-2 registry covenant.
  const activeFaucetUsesForwardProfile = !!(forwardPricing && g3prof.faucet_address && g3prof.wintok);
  const activeFaucetAddress = activeFaucetUsesForwardProfile ? String(g3prof.faucet_address) : covenantAddress;
  const activeFaucetTokenId = activeFaucetUsesForwardProfile ? String(g3prof.wintok) : winiwaTokenId;
  // Token-id -> display-label map for the transaction mirror (tx-mirror.js): the pilot's other
  // currencies + CF share classes live in the async registry, which the mirror's static config
  // cannot see. Labels match the UI ('EURw', 'USDwcf', …).
  function publishG3TokenLabels() {
    try {
      var map = {};
      if (g3profileName === 'prod' && g3Registry && g3Registry.currencies) {
        Object.keys(g3Registry.currencies).forEach(function (ccy) {
          var c = g3Registry.currencies[ccy] || {};
          if (c.tokenid) map[String(c.tokenid).toLowerCase()] = ccy;
          if (c.cf) map[String(c.cf).toLowerCase()] = ccy + 'cf';
        });
      } else if (g3profileName !== 'prod') {
        if (g3lab.covtok) map[String(g3lab.covtok).toLowerCase()] = 'USDw';
        if (g3lab.cf_share_token) map[String(g3lab.cf_share_token).toLowerCase()] = 'USDwcf';
        if (g3lab.wintok) map[String(g3lab.wintok).toLowerCase()] = 'Winiwa';
        if (g3lab.swap_pair_to_token) map[String(g3lab.swap_pair_to_token).toLowerCase()] = g3lab.swap_pair_to_ccy || 'EURw';
      }
      window.__STABLES_G3_TOKEN_LABELS = map;
    } catch (_) { /* ignore */ }
  }
  publishG3TokenLabels();
  if (g3profileName === 'prod' && g3cfg.registry_url) {
    try { fetch(g3cfg.registry_url, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { g3Registry = (j && (j.genesis31 || j.genesis3)) || j; publishG3TokenLabels(); }).catch(function () {}); } catch (_) {}
  }
  // Expose the live mint/burn currency set so the UI currency-dropdown gate (stablesIsReleaseMintBurnCode)
  // is profile-aware: lab = single currency (USDw), prod = the registry's active currencies. With forward
  // pricing off (legacy g2) it stays USDw-only. This is what turns the dropdown's "Soon" tags real once
  // the app points at production genesis-3.
  window.__STABLES_G3_ACTIVE_MINT_CCY = function () {
    try { return forwardPricing ? (g3prof.active || ['USDw']).slice() : ['USDw']; } catch (_) { return ['USDw']; }
  };
  // Single-flight guard: mint AND burn both spend the covenant's ONE state coin, so two in-flight
  // operations are mutually conflicting and the network drops them. Block overlap until ~confirmed.
  let _mintBurnInFlight = false;
  const MINT_BURN_INFLIGHT_HOLD_MS = 70000; // ~one mainnet block + propagation
  function mintBurnBeginInFlight() {
    if (_mintBurnInFlight) return false;
    _mintBurnInFlight = true;
    setTimeout(function () { _mintBurnInFlight = false; }, MINT_BURN_INFLIGHT_HOLD_MS);
    return true;
  }
  function mintBurnEndInFlight() { _mintBurnInFlight = false; }
  window.__STABLES_TEST_MINT_BURN_IN_FLIGHT__ = function () { return _mintBurnInFlight; };
  const FAUCET_TXN_ID = 'stables_faucet_claim';
  const FAUCET_DUST = '0.0000000000000000000000000001';
  const FAUCET_MINIMA_RESERVE = Number(cfg.TEST_FAUCET_MINIMA_FLOAT_RESERVE) > 0
    ? Number(cfg.TEST_FAUCET_MINIMA_FLOAT_RESERVE)
    : 0.0001;
  const FAUCET_STATE = {
    BRIDGE_NONCE: 0,
    SCHEMA: 1,
    LAST_OP: 2,
    AMOUNT: 20,
    RECIPIENT: 21,
    WINIWA_TOK: 22,
    POOL_REMAIN: 25,
    OP: 99,
  };
  const TV81_FAUCET_STATE = {
    SCHEMA: 0,
    GENERATION_ID: 1,
    TAG: 2,
    NONCE: 3,
    WALLET_COOLDOWN_BLOCKS: 4,
    FULL_CLAIM_ATOMS: 5,
    INITIAL_RESERVE_ATOMS: 6,
    CUMULATIVE_CLAIMED_ATOMS: 7,
    STATUS: 8,
    WINIWA_TOKEN_ID: 9,
    CLAIM_ATOMS: 20,
    RECIPIENT: 21,
    POOL_REMAINING_ATOMS: 22,
    OPERATION_ID: 23,
    ACTION: 24,
  };

  // Burn address for test tokens only (never use for real MINIMA). Script is unspendable.
  const TEST_BURN_SCRIPT = 'RETURN FALSE';
  const TEST_BURN_ADDRESS = '0xABA005476D2B3CD7F251B9783E64C124C9670BB358695F04D91B2057BB64CB49';
  const TEST_BURN_MINIADDRESS = 'MxG085BK02KER9B7JBV4KDPF0V69G94P5JGNCQZD5FG9M8R41BRMP6B97QR097V';
  const RESET_BURN_TXN_ID_PREFIX = 'stables_reset_burn_';
  window.TEST_BURN_ADDRESS = TEST_BURN_MINIADDRESS;
  window.TEST_BURN_HEX_ADDRESS = TEST_BURN_ADDRESS;

  function faucetMinPoolInput(amt) {
    return tv81Exclusive ? Number(amt) : Number(amt) * 2;
  }

  cfg.FAUCET_WINIWA_COOLDOWN_MS = 3600000;
  // GENESIS-2 (2026-07-05): keys bumped v1 -> g2 so pre-reissue persisted activity (old token ids) and
  // any stale faucet-cooldown timestamp are abandoned. These override runtime-config, so bump here too.
  // V9 genesis reset (2026-07-24): bump the faucet-cooldown key so any stale TV81 claim timestamp
  // is abandoned (the fresh V9 faucet is a different covenant).
  cfg.FAUCET_WINIWA_LAST_CLAIM_STORAGE_KEY = tv81Exclusive
    ? 'stables_test_faucet_winiwa_last_claim_v9'
    : 'stables_test_faucet_winiwa_last_claim_g2';
  cfg.DEMO_REAL_ONCHAIN_WALLET = true;
  // USER_ACTIVITY_STORAGE_KEY is owned by runtime-config (single source). A g2-era override here
  // ('..._g3') silently pinned the key and neutered every runtime-config key bump (g31/g31b/g31c)
  // — found 2026-07-10 during the one-row-per-trade verification. V9: bumped to _v9 (must match the
  // runtime-config WALLET_OWNER_KEY bump or this override silently wins).
  cfg.WALLET_OWNER_KEY = 'stables_test_wallet_owner_v9';

  function fmtInt(n) {
    if (typeof window.stablesFmtLocaleInt === 'function') return window.stablesFmtLocaleInt(n);
    const x = Number(n);
    if (!Number.isFinite(x)) return '0';
    return x.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }

  function fmtTokenAmt(n, maxFrac) {
    const x = Number(n);
    if (!Number.isFinite(x)) return '0';
    const abs = Math.abs(x);
    const dec = maxFrac == null ? (abs > 0 && abs < 1 ? 8 : 4) : Number(maxFrac);
    const s = x.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: Number.isFinite(dec) ? dec : 8,
    });
    return s.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
  }

  function coinFlagTrue(v) {
    return v === true || String(v).trim().toLowerCase() === 'true';
  }

  function coinIsUnspent(c) {
    return !!(c && !coinFlagTrue(c.spent));
  }

  function coinIsState(c) {
    return coinFlagTrue(c && c.storestate);
  }

  function coinTokenAmount(c) {
    const v = Number(c && (c.tokenamount != null ? c.tokenamount : c.amount));
    return Number.isFinite(v) ? v : 0;
  }

  function coinIsSpendablePool(c, minAmount) {
    return coinIsUnspent(c) && !coinIsState(c) && coinTokenAmount(c) >= (Number(minAmount) || 0);
  }

  function extractTxidFromIssuerResult(result) {
    if (!result) return '';
    if (typeof result === 'string') return result.trim();
    if (typeof result === 'object') {
      return String(result.txpowid || result.txid || result.response || '').trim();
    }
    return '';
  }

  function extractTxidsFromMdsPost(res) {
    let pendingTxnId = '';
    if (typeof window.stablesExtractTransactionIdFromMdsResponse === 'function') {
      pendingTxnId = window.stablesExtractTransactionIdFromMdsResponse(res) || '';
    }
    // Always try direct extraction from txnpost responses (covenant txs, complex builds)
    // txnpost often returns { transactionid: "...", txpowid?: "..." } or response wrapper
    const body = mdsPayload(res) || {};
    const r = (res && res.response) || {};
    if (!pendingTxnId) {
      pendingTxnId = String(body.transactionid || body.txid || body.txnid || r.transactionid || r.txid || '').trim();
    }
    if (!pendingTxnId) {
      // Keep this fallback transaction-id-only. An immediate txnpost `txpowid` is the
      // pre-mining object hash and is not stable enough to use as an explorer identity.
      const seen = typeof WeakSet === 'function' ? new WeakSet() : null;
      const findTransactionId = function (value, depth) {
        if (!value || typeof value !== 'object' || depth > 8) return '';
        if (seen) {
          if (seen.has(value)) return '';
          seen.add(value);
        }
        const direct = String(value.transactionid || '').trim();
        if (/^0x[a-f0-9]{64}$/i.test(direct)) return direct;
        const keys = Object.keys(value);
        for (let i = 0; i < keys.length; i++) {
          const nested = findTransactionId(value[keys[i]], depth + 1);
          if (nested) return nested;
        }
        return '';
      };
      pendingTxnId = findTransactionId(res, 0) || findTransactionId(body, 0);
    }
    // Never return txnpost's outer txpow or txpowid. The command starts asynchronous mining,
    // so even a provisional hash that happens to begin with zeroes is not the mined identity.
    return { explorerTxId: '', pendingTxnId: pendingTxnId, txpow: null };
  }

  let _faucetPourStartedAt = 0;
  let _faucetPourTimer = null;
  let _faucetPourStatus = '';
  let _faucetPourStep = '';

  function shortTxId(id) {
    const s = String(id || '').trim();
    if (s.length <= 18) return s;
    return s.slice(0, 10) + '...' + s.slice(-6);
  }

  let _faucetPourStatusClearTimer = null;

  function faucetPourStatusPhaseText(phase) {
    const p = String(phase || '').toLowerCase();
    if (p === 'preflight') return 'Checking node';
    if (p === 'building') return 'Building claim';
    if (p === 'submitted') return 'Submitted to node';
    if (p === 'tracking') return 'Tracking confirmation';
    if (p === 'confirmed') return 'Confirmed on-chain';
    if (p === 'error') return 'Needs attention';
    return 'Pour status';
  }

  function fillFaucetPourStatusSurface(prefix, state) {
    const titleEl = document.getElementById(prefix + 'Title');
    const phaseEl = document.getElementById(prefix + 'Phase');
    const detailEl = document.getElementById(prefix + 'Detail');
    const amountEl = document.getElementById(prefix + 'Amount');
    const txEl = document.getElementById(prefix + 'Txid');
    const txRow = document.getElementById(prefix + 'TxRow');
    const elapsedEl = document.getElementById(prefix + 'Elapsed');
    if (titleEl) titleEl.textContent = state.title || 'Winiwa pour';
    if (phaseEl) phaseEl.textContent = faucetPourStatusPhaseText(state.phase);
    if (detailEl) detailEl.textContent = state.detail || '';
    if (amountEl) amountEl.textContent = (state.amountText || fmtInt(claimAmount)) + ' Winiwa';
    const tx = state.txid || state.pendingTxnId || '';
    if (txEl) txEl.textContent = tx ? shortTxId(tx) : 'Generating send id';
    if (txRow) txRow.style.display = tx || state.active ? 'flex' : 'none';
    if (elapsedEl) {
      const elapsed = state.startedAt ? Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000)) : 0;
      elapsedEl.textContent = elapsed ? (elapsed + 's') : '';
    }
  }

  function renderFaucetPourStatusSurfaces() {
    // The floating pour status card is superseded by the shared on-chain transaction progress popup
    // (window.stablesShowTxProgressModal, the same built → sent → mined → confirmed tracker used by
    // Send / mint / burn), so the inline card is no longer displayed. State objects are still kept for
    // the settlement-tracking logic; only the visible surface is suppressed.
    const inline = document.getElementById('faucetPourStatusInline');
    if (inline) inline.style.display = 'none';
  }

  function focusFaucetPourStatusInline() {
    // No navigation. This used to pull the user BACK to the faucet page to show the floating
    // status card — which fought the post-pour go-to-wallet flow (v0.0.3.6) and produced the
    // reported faucet→wallet→faucet bounce. Per the popup policy the pour feedback is the
    // wallet balance + the Activity row; the status card still renders if the user happens to
    // be on the faucet page.
  }

  function setFaucetPourStatusSurface(options) {
    const opts = options || {};
    if (_faucetPourStatusClearTimer) {
      clearTimeout(_faucetPourStatusClearTimer);
      _faucetPourStatusClearTimer = null;
    }
    const prev = window.__STABLES_FAUCET_POUR_STATUS__ || {};
    const resetTimer = opts.resetTimer === true || !prev.startedAt;
    const state = {
      visible: opts.visible !== false,
      active: opts.active !== false,
      keepVisible: opts.keepVisible === true || opts.active === false,
      phase: opts.phase || prev.phase || 'building',
      title: opts.title || prev.title || 'Winiwa pour',
      detail: opts.detail || opts.status || prev.detail || 'Preparing on-chain claim for ' + fmtInt(claimAmount) + ' Winiwa.',
      amountText: opts.amountText || prev.amountText || fmtInt(claimAmount),
      txid: opts.txid || prev.txid || '',
      pendingTxnId: opts.pendingTxnId || prev.pendingTxnId || '',
      startedAt: resetTimer ? Date.now() : (opts.startedAt || prev.startedAt || Date.now())
    };
    window.__STABLES_FAUCET_POUR_STATUS__ = state;
    renderFaucetPourStatusSurfaces();
    if (opts.autoOpen !== false) focusFaucetPourStatusInline();
  }

  function clearFaucetPourStatusSurface(delayMs) {
    const clearNow = function () {
      window.__STABLES_FAUCET_POUR_STATUS__ = null;
      renderFaucetPourStatusSurfaces();
    };
    const delay = Math.max(0, Number(delayMs) || 0);
    if (!delay) {
      clearNow();
      return;
    }
    if (_faucetPourStatusClearTimer) clearTimeout(_faucetPourStatusClearTimer);
    _faucetPourStatusClearTimer = setTimeout(clearNow, delay);
  }

  window.openFaucetPourStatusModal = function () {
    renderFaucetPourStatusSurfaces();
    focusFaucetPourStatusInline();
  };

  window.closeFaucetPourStatusModal = function () {
    renderFaucetPourStatusSurfaces();
  };

  // Dismiss the floating pour-status card. Any in-flight pour keeps tracking in the background
  // (settlement status / Activity still update); this only hides the card.
  window.dismissFaucetPourStatus = function () {
    clearFaucetPourStatusSurface(0);
  };

  function faucetPourElapsedSeconds() {
    return _faucetPourStartedAt ? Math.max(0, Math.floor((Date.now() - _faucetPourStartedAt) / 1000)) : 0;
  }

  function renderFaucetPourProgress() {
    if (!_faucetPourStartedAt) return;
    const btn = document.getElementById('faucetClaimWiniwaBtn');
    const elapsed = faucetPourElapsedSeconds();
    const status = _faucetPourStatus || 'Preparing on-chain claim for ' + fmtInt(claimAmount) + ' Winiwa';
    let text = (_faucetPourStep ? _faucetPourStep + ' - ' : '') + status + '.';
    if (elapsed >= 60) {
      text += ' Taking longer than usual; your node may still be signing or posting. Check Wallet history before retrying.';
    } else if (elapsed >= 20) {
      text += ' Node is still working. Keep this tab open.';
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Pouring...';
    }
    // Pour progress text goes into the floating status card (which never reflows the page),
    // not the inline cooldown hint. Keeping the hint untouched stops the page from jumping
    // while a pour runs.
    const st = window.__STABLES_FAUCET_POUR_STATUS__;
    if (st) st.detail = text;
    renderFaucetPourStatusSurfaces();
  }

  // Exposed so the tap handler can show the working state SYNCHRONOUSLY (founder 2026-07-07:
  // the pour button felt dead for a moment — the first status update used to wait for the
  // wallet fetch round-trip).
  window.stablesSetFaucetPourInProgress = function (active, statusMsg, options) {
    return setFaucetPourInProgress(active, statusMsg, options);
  };

  function setFaucetPourInProgress(active, statusMsg, options) {
    const opts = options || {};
    const btn = document.getElementById('faucetClaimWiniwaBtn');
    const hint = document.getElementById('faucetCooldownHint');
    if (active) {
      if (!_faucetPourStartedAt || opts.resetTimer === true) {
        _faucetPourStartedAt = Date.now();
      }
      _faucetPourStatus = statusMsg || _faucetPourStatus || 'Preparing on-chain claim for ' + fmtInt(claimAmount) + ' Winiwa';
      if (opts.step) _faucetPourStep = String(opts.step);
      setFaucetPourStatusSurface({
        active: true,
        resetTimer: opts.resetTimer === true,
        phase: opts.phase || (String(opts.step || '').toLowerCase() === 'preflight' ? 'preflight' : 'building'),
        title: opts.title || 'Winiwa pour',
        detail: _faucetPourStatus,
        amountText: fmtInt(claimAmount)
      });
      if (_faucetPourTimer) window.stablesStopRepeat(_faucetPourTimer);
      _faucetPourTimer = window.stablesRepeatWhileVisible('faucet-pour', renderFaucetPourProgress, 1000);
      renderFaucetPourProgress();
      return;
    }
    if (_faucetPourTimer) {
      window.stablesStopRepeat(_faucetPourTimer);
      _faucetPourTimer = null;
    }
    _faucetPourStartedAt = 0;
    _faucetPourStatus = '';
    _faucetPourStep = '';
    if (btn) {
      btn.disabled = false;
    }
    if (hint) {
      if (faucetMode === 'covenant' && !(typeof window.stablesFaucetWiniwaRemainingMs === 'function'
        && window.stablesFaucetWiniwaRemainingMs() > 0)) {
        hint.style.display = 'block';
        hint.textContent = 'On-chain covenant pour, claimable by any synced wallet.';
      }
    }
    if (typeof window.syncFaucetWiniwaClaimButton === 'function') {
      window.syncFaucetWiniwaClaimButton();
    }
  }

  function faucetTimeoutError(label) {
    return new Error(
      'Faucet step timed out while ' + label
      + '. Your node may still be processing it. Check Wallet history and Stables Activity before retrying.'
    );
  }

  function withFaucetTimeout(promise, label, timeoutMs) {
    // Every node command on the Core companion is a cross-process round trip of roughly half a
    // second, where the standalone answers in-process almost instantly. A budget written for an
    // embedded node is simply wrong there, so it is scaled rather than guessed at: the operation is
    // identical, only the transport is slower (founder's failed pour, 2026-09-01).
    const coreTransport = !!window.__STABLES_CORE_CONNECTED_APP;
    const base = Math.max(5000, Number(timeoutMs) || 50000);
    const ms = coreTransport ? base * 3 : base;
    return new Promise(function (resolve, reject) {
      let done = false;
      const timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(faucetTimeoutError(label));
      }, ms);
      Promise.resolve(promise).then(function (res) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(res);
      }).catch(function (err) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function isRecoverableFaucetTimeout(err) {
    const msg = String((err && err.message) || err || '').toLowerCase();
    return msg.indexOf('timed out') >= 0
      || msg.indexOf('timeout') >= 0
      || msg.indexOf('abort') >= 0;
  }

  async function faucetRpcSendCommand(cmd, timeoutMs) {
    const cfgRpc = typeof stablesGetRpcConfig === 'function' ? stablesGetRpcConfig() : null;
    if (!cfgRpc || !cfgRpc.url) throw new Error('RPC not configured');
    const endpoint = cfgRpc.url + '/' + encodeURIComponent(cmd);
    const headers = {};
    if (cfgRpc.pass) headers.Authorization = 'Basic ' + btoa(cfgRpc.user + ':' + cfgRpc.pass);
    const ms = Math.max(15000, Number(timeoutMs) || 70000);
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const tid = ctl ? setTimeout(function () { try { ctl.abort(); } catch (_) { /* ignore */ } }, ms) : null;
      try {
        const res = await fetch(endpoint, {
          method: 'GET',
          headers: headers,
          cache: 'no-store',
          signal: ctl ? ctl.signal : undefined
        });
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch (_) { json = { status: false, error: text || ('HTTP ' + res.status) }; }
        if (res.status === 502 && attempt === 0) {
          await sleep(250);
          continue;
        }
        if (!res.ok && json.status === undefined) json.status = false;
        return json;
      } catch (err) {
        if (err && err.name === 'AbortError') {
          throw faucetTimeoutError('waiting for the node response');
        }
        if (attempt === 0) {
          await sleep(250);
          continue;
        }
        throw err;
      } finally {
        if (tid) clearTimeout(tid);
      }
    }
    return { status: false, error: 'RPC command failed after retry' };
  }

  /**
   * Wait for the person to approve the queued signature, using only READ commands.
   *
   * `txncheck` reports the transaction's signature count and costs nothing but a read, so this can
   * poll without filing a single extra approval request. (Polling `mds action:pending` would file
   * one every tick — `mds` is itself a write command.)
   *
   * Bounded, and it stops early when the app is hidden: a person who has walked away has not
   * approved anything, and the claim can be finished the next time they open the app. A timeout is
   * NOT a failure — the caller leaves the row honestly waiting.
   */
  async function waitForFaucetSignatureApproval(maxMs) {
    const deadline = Date.now() + Math.max(30000, Number(maxMs) || 240000);
    let announced = false;
    while (Date.now() < deadline) {
      try {
        if (typeof window.stablesAppVisible === 'function' && !window.stablesAppVisible()) return false;
      } catch (_) { /* if visibility cannot be read, keep waiting */ }
      if (!announced) {
        announced = true;
        try {
          setFaucetPourInProgress(true, 'Waiting for your approval in Minima', { step: 'Step 4/6' });
        } catch (_) { /* ignore */ }
      }
      await sleep(4000);
      try {
        const res = await faucetMdsCmd('txncheck id:' + FAUCET_TXN_ID, 'checking the claim signature', 20000);
        const body = mdsPayload(res);
        /* ASK WHETHER THE TRANSACTION IS READY, NOT HOW MANY KEYS SIGNED IT.
         *
         * The first version waited for the signature COUNT to rise, which for this transaction can
         * never happen: a faucet claim spends covenant coins, which are script-locked rather than
         * key-signed. The founder's approval came back "The command was successful" with
         * `"keys": []` — nothing was signed with a key, and the app waited for ever (2026-09-02).
         *
         * The node's own verdict is the right question. `valid.signatures` is true once nothing is
         * outstanding, and all four flags together mean the transaction can be posted. */
        const valid = (body && body.valid) || {};
        if (valid.basic && valid.scripts && valid.mmrproofs && valid.signatures) return true;
      } catch (_) { /* a check that cannot run is not an answer; try again */ }
    }
    return false;
  }

  function faucetMdsCmd(cmd, label, timeoutMs) {
    const rpcCfg = typeof stablesGetRpcConfig === 'function' ? stablesGetRpcConfig() : null;
    if (rpcCfg) {
      return withFaucetTimeout(new Promise(function (resolve, reject) {
        faucetRpcSendCommand(cmd, Math.max(15000, Number(timeoutMs) || 70000) + 15000).then(function (res) {
          if (typeof stablesMdsCmdOk === 'function' && stablesMdsCmdOk(res)) resolve(res);
          else {
            const err = typeof stablesMdsSendErrorText === 'function'
              ? stablesMdsSendErrorText(res)
              : ((res && res.error) || 'Command failed');
            reject(new Error(err));
          }
        }).catch(reject);
      }), label, timeoutMs);
    }
    return withFaucetTimeout(mdsCmdAsync(cmd), label, timeoutMs);
  }

  /* A TRANSACTION BUILD OWNS THE NODE CHANNEL.
   *
   * On the Core companion every node command is a cross-process IPC round trip: ~520ms idle, and
   * ~1050ms once the channel is busy. A faucet claim needs about twenty-five sequential commands
   * (create, two inputs, three outputs, fourteen state ports, sign, post). That is slow but
   * survivable on its own.
   *
   * What killed it was the background pollers sharing the same serialized channel. The founder's
   * failed pour on 2026-09-01 shows a `history max:3`, a `balance`, a `status` or a `txpow`
   * interleaved between almost every single state port, roughly doubling the elapsed time. The
   * build reached state port 13 after twenty-four seconds, blew its timeout, and failed with
   * "Pouring..." still on screen. On the standalone the same commands are in-process, so none of
   * this is visible and the poll cost is nothing.
   *
   * So while a transaction is being built, refreshes that only keep the display current stand
   * down. This is detected at the dispatcher rather than wrapped around each money path, so every
   * build - claim, mint, burn, send - is covered, including ones written later.
   */
  const NODE_BUILD_IDLE_MS = 15000;
  function stablesNodeBuildNoteCommand(cmd) {
    const name = String(cmd || '').trim().split(/[\s:]/)[0].toLowerCase();
    if (name === 'txncreate') {
      window.__STABLES_NODE_BUILD_ACTIVE = true;
    } else if (name === 'txnpost' || name === 'txndelete') {
      window.__STABLES_NODE_BUILD_ACTIVE = false;
    }
    if (window.__STABLES_NODE_BUILD_ACTIVE) {
      // A build that dies mid-way must not silence the app for ever.
      window.__STABLES_NODE_BUILD_UNTIL = Date.now() + NODE_BUILD_IDLE_MS;
    }
  }
  window.stablesNodeChannelBusy = function () {
    if (!window.__STABLES_NODE_BUILD_ACTIVE) return false;
    if (Date.now() > (window.__STABLES_NODE_BUILD_UNTIL || 0)) {
      window.__STABLES_NODE_BUILD_ACTIVE = false;
      return false;
    }
    return true;
  };

  function directOrMdsCmd(cmd, label, timeoutMs) {
    stablesNodeBuildNoteCommand(cmd);
    const rpcCfg = typeof stablesGetRpcConfig === 'function' ? stablesGetRpcConfig() : null;
    if (rpcCfg) {
      return withFaucetTimeout(new Promise(function (resolve, reject) {
        faucetRpcSendCommand(cmd, Math.max(15000, Number(timeoutMs) || 70000) + 15000).then(function (res) {
          if (typeof stablesMdsCmdOk === 'function' && stablesMdsCmdOk(res)) resolve(res);
          else {
            const err = typeof stablesMdsSendErrorText === 'function'
              ? stablesMdsSendErrorText(res)
              : ((res && res.error) || 'Command failed');
            reject(new Error(err));
          }
        }).catch(reject);
      }), label, timeoutMs);
    }
    return withFaucetTimeout(mdsCmdAsync(cmd), label, timeoutMs);
  }

  // Track a covenant script with the node only once per session. `newscript trackall:true` is
  // idempotent but costs a full node round-trip (and can re-scan) every time; the covenant addresses
  // never change within a session, so caching removes one command from each mint/burn build, speeding
  // up the "Building transaction" step. Safe: once tracked, the node keeps tracking it.
  const _trackedCovenantAddrs = new Set();
  async function ensureCovenantTracked(addr, script, label, timeoutMs) {
    const key = String(addr || '').trim().toLowerCase();
    if (key && _trackedCovenantAddrs.has(key)) return;
    // ROOT CAUSE FIX (2026-07-20): the embedded standalone node (Minima 1.1.1.26) throws inside
    // `newscript` for large MULTI-LINE covenant scripts, so covenant tracking silently failed on the
    // phone and the node never held the order-book / faucet / vault coins (it kept only coins it
    // created itself). Register the node's OWN canonical single-line clean of the script instead:
    // `runscript` returns clean.{script,address}; that clean form registers without the crash and
    // hashes to the SAME covenant address (proven on-device — the phone then captured another node's
    // order). Fall back to the raw script only if the clean is unavailable or its address does not
    // match (small scripts register raw either way).
    let toRegister = String(script);
    try {
      const rs = await directOrMdsCmd('runscript script:"' + String(script).replace(/"/g, '\\"') + '"',
        'preparing ' + (label || 'covenant script'), timeoutMs || 30000);
      const clean = rs && rs.response && rs.response.clean;
      if (clean && clean.script && (!key || String(clean.address || '').toLowerCase() === key)) {
        toRegister = clean.script;
      }
    } catch (_) { /* keep raw; small scripts still register */ }
    await directOrMdsCmd('newscript trackall:true script:"' + toRegister.replace(/"/g, '\\"') + '"', label || 'tracking the covenant script', timeoutMs || 30000);
    if (key) _trackedCovenantAddrs.add(key);
  }

  // Run a sequence of node commands in a SINGLE call (semicolon-batched) instead of one round-trip per
  // command — the bulk of "Building transaction" is ~12 serial txncreate/txninput/txnoutput/txnstate
  // calls. The node runs them in order and returns a per-command result array. If batching is somehow
  // unavailable or any step fails, fall back to the per-step path (clearing the partial draft first) so
  // the build is never left half-applied.
  async function directOrMdsCmdBatch(steps, label, timeoutMs) {
    if (!Array.isArray(steps) || !steps.length) return;
    if (steps.length === 1) { await directOrMdsCmd(steps[0], label, timeoutMs); return; }
    let ok = false;
    try {
      const joined = steps.join(';');
      const rpcCfg = typeof stablesGetRpcConfig === 'function' ? stablesGetRpcConfig() : null;
      let res;
      if (rpcCfg) res = await withFaucetTimeout(faucetRpcSendCommand(joined, Math.max(15000, Number(timeoutMs) || 45000) + 15000), label, timeoutMs);
      else res = await withFaucetTimeout(mdsCmdAsync(joined), label, timeoutMs);
      const payload = typeof stablesCoerceMdsPayload === 'function'
        ? stablesCoerceMdsPayload(res && res.response)
        : (res && res.response);
      const arr = Array.isArray(res) ? res
        : Array.isArray(payload) ? payload
        : (payload && Array.isArray(payload.response)) ? payload.response
        : (res && Array.isArray(res.response)) ? res.response
        : null;
      if (Array.isArray(arr)) {
        ok = arr.length >= steps.length && arr.slice(0, steps.length).every(function (r) {
          return r && (r.status === true || r.status === 'true');
        });
      } else {
        // Some Minima surfaces answer a successful semicolon batch as one wrapper rather than an
        // array. Treat a true wrapper as success; otherwise we wrongly redo every command slowly.
        ok = typeof stablesMdsCmdOk === 'function' ? stablesMdsCmdOk(res) : !!(res && (res.status === true || res.status === 'true'));
      }
    } catch (_) { ok = false; }
    if (ok) return;
    const idm = String(steps[0] || '').match(/id:(\S+)/);
    if (idm) { try { await directOrMdsCmd('txndelete id:' + idm[1], 'clearing partial draft', 15000); } catch (_) { /* ignore */ } }
    for (let i = 0; i < steps.length; i++) {
      try { await directOrMdsCmd(steps[i], label, timeoutMs); }
      catch (e) { throw new Error('Build step failed (' + String(steps[i]).split(' ')[0] + '): ' + ((e && e.message) || e)); }
    }
  }

  const FAUCET_POUR_ROW_ID = 'FAUCET-POUR-WINIWA';
  let _faucetSettlementTimer = null;

  function renderFaucetSettlementStatus() {
    try { if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity(); } catch (_) {}
    try { if (typeof window.renderActivity === 'function') window.renderActivity(); } catch (_) {}
  }

  function setFaucetSettlementStatus(active, options) {
    const opts = options || {};
    if (_faucetSettlementTimer) {
      window.stablesStopRepeat(_faucetSettlementTimer);
      _faucetSettlementTimer = null;
    }
    if (!active) {
      window.__STABLES_FAUCET_SETTLEMENT_STATUS__ = null;
      renderFaucetSettlementStatus();
      return;
    }
    window.__STABLES_FAUCET_SETTLEMENT_STATUS__ = {
      active: true,
      title: opts.title || 'Faucet claim submitted',
      detail: opts.detail || 'Waiting for confirmation. No action needed.',
      amountText: opts.amountText || fmtInt(claimAmount),
      txid: opts.txid || opts.pendingTxnId || '',
      pendingTxnId: opts.pendingTxnId || '',
      startedAt: opts.startedAt || Date.now()
    };
    setFaucetPourStatusSurface({
      active: true,
      phase: opts.phase || 'submitted',
      title: opts.title || 'Faucet claim submitted',
      detail: opts.detail || 'Waiting for confirmation. No action needed.',
      amountText: opts.amountText || fmtInt(claimAmount),
      txid: opts.txid || '',
      pendingTxnId: opts.pendingTxnId || '',
      startedAt: opts.startedAt || undefined,
      resetTimer: false
    });
    _faucetSettlementTimer = window.stablesRepeatWhileVisible('faucet-settlement', renderFaucetSettlementStatus, 5000);
    renderFaucetSettlementStatus();
  }

  function finishFaucetSettlementStatus(message, txid) {
    if (_faucetSettlementTimer) {
      window.stablesStopRepeat(_faucetSettlementTimer);
      _faucetSettlementTimer = null;
    }
    window.__STABLES_FAUCET_SETTLEMENT_STATUS__ = {
      active: true,
      title: 'Faucet claim confirmed',
      detail: message || 'Confirmed on-chain. The Winiwa balance and Activity row are up to date.',
      amountText: fmtInt(claimAmount),
      txid: txid || '',
      pendingTxnId: '',
      startedAt: Date.now()
    };
    setFaucetPourStatusSurface({
      active: false,
      keepVisible: true,
      phase: 'confirmed',
      title: 'Faucet claim confirmed',
      detail: message || 'Confirmed on-chain. The Winiwa balance and Activity row are up to date.',
      amountText: fmtInt(claimAmount),
      txid: txid || '',
      pendingTxnId: '',
      resetTimer: false,
      autoOpen: true
    });
    renderFaucetSettlementStatus();
    setTimeout(function () {
      window.__STABLES_FAUCET_SETTLEMENT_STATUS__ = null;
      renderFaucetSettlementStatus();
    }, 15000);
    clearFaucetPourStatusSurface(15000);
  }

  /* Has the node actually SEEN this claim?
   *
   * The tx mirror writes its own row the moment the node reports the transaction, with status
   * Receiving and the note "Seen by your Minima node - waiting for a block". That row is proof the
   * claim exists on the node; a settlement watcher that has merely run out of patience must not
   * contradict it. Matched on identity, not wording: an incoming Winiwa row, for this claim's
   * amount, inside the hour, that is not the pour row itself. */
  function faucetClaimSeenByNode(rowId) {
    const mine = String(rowId || FAUCET_POUR_ROW_ID);
    try {
      const getRows = window.stablesGetUserActivityRows;
      const getById = window.stablesGetUserActivityRowById;
      if (typeof getRows !== 'function') return false;
      const pour = (typeof getById === 'function') ? getById(mine) : null;
      const wantAmt = pour ? Math.abs(Number(pour.amt) || 0) : 0;
      const cutoff = Date.now() - 3600000;
      return getRows().some(function (r) {
        if (!r || String(r.id || '') === mine) return false;
        if (r.dir !== 'in') return false;
        const ccy = String(r.ccy || r.category || '').toLowerCase();
        if (ccy !== 'winiwa' && ccy !== 'winima') return false;
        if (Number(r.ts || 0) < cutoff) return false;
        /* Same amount, so an unrelated incoming payment cannot vouch for the claim. */
        if (wantAmt > 0 && Math.abs(Math.abs(Number(r.amt) || 0) - wantAmt) > 1e-6) return false;
        const st = String(r.status || '').toLowerCase();
        return st === 'receiving' || st === 'received' || st === 'broadcasted'
          || st === 'on-chain' || st === 'pending' || st === 'confirmed';
      });
    } catch (_) { return false; }
  }
  window.stablesFaucetClaimSeenByNode = faucetClaimSeenByNode;

  function markFaucetClaimNotConfirmedRow(detail, title, rowId, status) {
    const msg = String(detail || 'No faucet transaction is visible in your node history yet.').trim();
    /* NOT LANDED YET IS NOT THE SAME AS FAILED.
     *
     * Five settlement watchers call this when the claim is not visible in node history. For a
     * posted transaction that is a real failure. For one Minima has QUEUED for approval it is
     * simply not signed yet — and overwriting it here is why a claim reported itself as failed
     * while the approval was still sitting in Minima waiting to be tapped (founder 2026-09-02,
     * "still failed in the mds"). Proven from the live host: the claim reached Step 4/6 signing,
     * was queued, showed the correct waiting message, and was then marked failed by this path.
     *
     * Only a caller that explicitly passes a status may touch such a row (that is the permission
     * path itself, which sets Pending); every "did it land" watcher leaves it alone. */
    try {
      if (!status && typeof window.stablesActivityRowAwaitingApproval === 'function'
        && window.stablesActivityRowAwaitingApproval(String(rowId || FAUCET_POUR_ROW_ID))) {
        try { console.log('[faucet-claim] not-confirmed watcher skipped: row is awaiting approval in Minima'); } catch (_) { /* ignore */ }
        return;
      }
    } catch (_) { /* if the check cannot run, fall through to the old behaviour */ }
    /* SEEN BY THE NODE IS NOT FAILED EITHER.
     *
     * Same shape as the guard above, and the same class of mistake: a watcher writing a verdict it
     * has no standing to write. If the node is holding the claim, the honest state is "waiting for
     * a block", and Pending ranks below the mirror's Receiving so the two rows merge into one
     * instead of contradicting each other on screen (founder 2026-09-04, "the transaction is not
     * going through" - it was going through). */
    let stillTravelling = false;
    try {
      if (!status && faucetClaimSeenByNode(rowId)) stillTravelling = true;
    } catch (_) { /* fall through */ }
    if (stillTravelling) {
      const waitingNote = 'Your node has the claim and is waiting for a block. No action needed.';
      try {
        if (typeof window.stablesUpsertUserActivityRows === 'function') {
          window.stablesUpsertUserActivityRows([{
            id: String(rowId || FAUCET_POUR_ROW_ID),
            title: 'Faucet claim',
            status: 'Pending',
            note: waitingNote,
            pendingIncoming: true
          }]);
        }
        /* The card on the faucet page must not say "not confirmed" either. */
        const cur = window.__STABLES_FAUCET_SETTLEMENT_STATUS__ || {};
        setFaucetSettlementStatus(true, {
          title: 'Faucet claim on its way',
          detail: waitingNote,
          txid: cur.txid || '',
          pendingTxnId: cur.pendingTxnId || '',
          amountText: cur.amountText || '',
          startedAt: cur.startedAt || Date.now()
        });
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        if (typeof window.renderActivity === 'function') window.renderActivity();
      } catch (_) { /* ignore */ }
      try { console.log('[faucet-claim] not-confirmed watcher skipped: the node still has the claim'); } catch (_) {}
      return;
    }
    try {
      if (typeof window.stablesUpsertUserActivityRows === 'function') {
        window.stablesUpsertUserActivityRows([{
          id: String(rowId || FAUCET_POUR_ROW_ID),
          title: String(title || 'Faucet claim not confirmed'),
          /* Callers may pass 'Pending' for a command Minima has queued for approval; only a
             genuine failure defaults to Failed. */
          status: String(status || 'Failed'),
          awaitingApproval: String(status || '') === 'Pending',
          note: msg,
          pendingIncoming: false,
          balanceAlreadyApplied: true
        }]);
      }
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.updateGlobalUI === 'function') window.updateGlobalUI();
      if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
    } catch (_) { /* ignore */ }
    /* The countdown paces REAL claims, so a claim that never landed must not cost the person an
       hour of lockout with no way to try again (founder 2026-09-04, "when it's the case the
       countdown should be reset").
     *
     * Strictly AFTER the row above is marked Failed, and the ordering is not cosmetic: the
     * remaining time is read from the wallet's Activity as well as from localStorage, and only a
     * FAILED row is discounted there. Resetting first cleared the stamp and then re-armed the full
     * hour from the very row being failed - measured, 59:59 left with no stamp on disk. */
    try {
      if (String(status || 'Failed') === 'Failed'
        && typeof window.stablesResetFaucetWiniwaCooldown === 'function') {
        window.stablesResetFaucetWiniwaCooldown();
      }
    } catch (_) { /* the countdown simply keeps running */ }
  }

  function appendTestFaucetActivityRow(amount, txid, pendingTxnId, options) {
    const opts = options || {};
    const upsertFn = typeof window.stablesUpsertUserActivityRows === 'function'
      ? window.stablesUpsertUserActivityRows
      : null;
    const appendFn = typeof window.stablesAppendUserActivityRow === 'function'
      ? window.stablesAppendUserActivityRow
      : null;
    if (!upsertFn && !appendFn) return;
    const now = new Date();
    const dateText = now.toLocaleString('en-GB', { month: 'short', day: '2-digit' })
      + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const normTx = String(txid || '').trim().toLowerCase();
    let id = opts.id || '';
    if (!id) {
      if (normTx) {
        id = 'NODE-' + normTx + ':winiwa';
      } else if (faucetMode === 'covenant') {
        id = FAUCET_POUR_ROW_ID;
      } else {
        id = 'WINIWA-FAUCET-' + Date.now();
      }
    }
    const pouring = opts.pouring === true;
    const submitted = opts.submitted === true;
    const row = {
      id: id,
      dir: 'in',
      icon: '↙',
      counterparty: 'On-chain faucet covenant',
      category: 'Winiwa',
      /* One name for one thing, in every state. The stage belongs to `status`, which the row
         already carries and which updates; a lifecycle word baked into the title does not. */
      title: opts.title || 'Faucet claim',
      faucetClaim: true,
      date: dateText,
      amt: Math.abs(Number(amount) || 0),
      ccy: 'Winiwa',
      address: '',
      fee: 0,
      explorerTxId: txid || '',
      pendingTxnId: pendingTxnId || '',
      status: pouring ? 'Pending' : ((txid || pendingTxnId) ? 'Pending' : 'Confirmed'),
      note: opts.note || (pouring
        ? 'Building on-chain claim transaction…'
        : (txid
            ? 'On-chain covenant pour (explorer link active)'
          : (pendingTxnId
            ? 'Submitted to the node. Waiting for confirmation; no action needed.'
            : 'On-chain test token from faucet covenant'))),
      directionLabel: 'Incoming',
      minimaOnChain: true,
      localOrigin: true,
      block: 0,
      ts: Date.now(),
      pendingIncoming: pouring || !!(txid || pendingTxnId)
    };
    if (upsertFn) {
      upsertFn([row]);
    } else {
      appendFn(row);
    }
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    // Force tx progress and balance indicator for the pour (x/y, amber, pending overlay)
    try { if (typeof window.updateGlobalUI === 'function') window.updateGlobalUI(); } catch (_) {}
    try { if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator(); } catch (_) {}
    // Force the full on-chain tx progress display (x/y counters, amber settling, pending incoming indicator on hero and Winiwa row) immediately after the pour row is added.
    // This restores the v1.30+ sequence for pours: optimistic row -> immediate balance update with indicator -> live updates on events.
    try { if (typeof window.updateGlobalUI === 'function') window.updateGlobalUI(); } catch (_) {}
    try { if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator(); } catch (_) {}
    try { if (typeof window.stablesRefreshPendingSettlement === 'function') window.stablesRefreshPendingSettlement().catch(function(){}); } catch (_) {}
    // Trigger immediate Winiwa balance + pending incoming indicator + x/y display on the row (latest settling sequence)
    try { if (typeof window.updateGlobalUI === 'function') window.updateGlobalUI(); } catch (_) {}
    try { if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator(); } catch (_) {}
    // Force the full v1.30+ transaction in-progress (x/y counters, auto-settle, block advance, amber) for this pour row
    // and the sequence of events (ingest, pending, mined update, NEWBLOCK tick).
    try {
      if (typeof window.stablesRefreshPendingSettlement === 'function') {
        window.stablesRefreshPendingSettlement().catch(function () {});
      }
      if (typeof window.stablesOnLiveBlockTick === 'function') {
        window.stablesOnLiveBlockTick();
      }
      if (typeof window.stablesLiveResyncTransactions === 'function') {
        window.stablesLiveResyncTransactions();
      }
    } catch (_) {}
    // Extra robust force for wallet recent list visibility (in case navigate or tab render cleared it)
    setTimeout(function () {
      try {
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        if (typeof window.renderActivity === 'function') window.renderActivity();
        if (typeof window.updateGlobalUI === 'function') window.updateGlobalUI();
      } catch (_) {}
    }, 150);
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function publishWalletProofState(state, reason) {
    const prev = window.__STABLES_WALLET_PROOF_STATE__ || {};
    const now = Date.now();
    const next = {
      state: state || 'syncing',
      reason: String(reason || ''),
      updatedAt: now,
      lastReadyAt: state === 'ready' ? now : Number(prev.lastReadyAt || 0)
    };
    window.__STABLES_WALLET_PROOF_STATE__ = next;
    try { if (typeof window.stablesApplyReleaseProofUi === 'function') window.stablesApplyReleaseProofUi(); } catch (_) { /* fail closed */ }
    try { if (typeof window.updateGlobalUI === 'function') window.updateGlobalUI(); } catch (_) { /* fail closed */ }
    return next;
  }
  window.stablesPublishWalletProofState = publishWalletProofState;
  if (!window.__STABLES_WALLET_PROOF_STATE__) publishWalletProofState('syncing', 'Waiting for the first live balance proof.');

  async function waitForTestTokenBalanceDetail(code, attempts) {
    const key = String(code || '') === 'WINIMA' ? 'Winiwa' : String(code || '');
    const n = Math.max(1, Number(attempts) || 1);
    for (let i = 0; i < n; i++) {
      try {
        const d = (window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {})[key];
        if (d && typeof d === 'object') return d;
      } catch (_) { /* ignore */ }
      if (typeof window.stablesRefreshLiveNodeBalances === 'function') {
        await window.stablesRefreshLiveNodeBalances({ reason: 'user-action', attempts: 3 });
      }
      await sleep(400);
    }
    try {
      return (window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {})[key] || null;
    } catch (_) {
      return null;
    }
  }

  function mdsNetReady() {
    return typeof MDS !== 'undefined' && MDS.net && typeof MDS.mainhost === 'string' && MDS.mainhost.length > 0;
  }

  /** Issuer API: MDS.net.GET on connected node (MiniDapp), fetch in plain browser. */
  function testIssuerApiGet(pathAndQuery) {
    const url = apiUrl + pathAndQuery;
    if (mdsNetReady() && typeof MDS.net.GET === 'function') {
      return new Promise(function (resolve, reject) {
        MDS.net.GET(url, function (response) {
          try {
            if (!response || !response.status) {
              reject(new Error((response && response.error) || 'Node could not reach issuer API'));
              return;
            }
            const raw = response.response != null ? String(response.response) : '';
            const data = raw ? JSON.parse(raw) : {};
            resolve({ data: data, viaMds: true });
          } catch (e) {
            reject(e);
          }
        });
      });
    }
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      return res.json().then(function (data) {
        return { data: data, httpOk: res.ok, status: res.status, viaMds: false };
      });
    });
  }

  function parseBalanceRows(response) {
    if (typeof stablesMdsCmdOk !== 'function' || !stablesMdsCmdOk(response)) return null;
    const r = typeof stablesCoerceMdsPayload === 'function'
      ? stablesCoerceMdsPayload(response.response)
      : response.response;
    if (Array.isArray(r)) return r;
    if (r && Array.isArray(r.balance)) return r.balance;
    if (r && Array.isArray(r.tokens)) return r.tokens;
    return null;
  }

  function readTokenAmount(row) {
    const raw = row.sendable != null ? row.sendable
      : (row.available != null ? row.available
        : (row.spendable != null ? row.spendable
          : (row.confirmed != null ? row.confirmed
            : (row.balance != null ? row.balance
              : (row.amount != null ? row.amount : row.tokenamount)))));
    const x = parseFloat(String(raw == null ? '' : raw).replace(/,/g, ''));
    return Number.isFinite(x) ? x : 0;
  }

  function parseTokenNumber(v) {
    const x = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
    return Number.isFinite(x) ? x : null;
  }

  function readTokenBalanceDetail(row) {
    // In Minima token rows, `total` can be the token's full supply, not this wallet's balance.
    // Wallet holdings must come from wallet-owned fields only.
    const totalRaw = row && (row.confirmed != null ? row.confirmed
      : (row.balance != null ? row.balance
        : (row.amount != null ? row.amount : row.tokenamount)));
    const availableRaw = row && (row.sendable != null ? row.sendable
      : (row.available != null ? row.available
        : (row.spendable != null ? row.spendable
          : (row.confirmed != null ? row.confirmed : null))));
    const lockedRaw = row && (row.locked != null ? row.locked : null);
    let total = parseTokenNumber(totalRaw);
    let available = parseTokenNumber(availableRaw);
    let locked = parseTokenNumber(lockedRaw);
    if (total == null && available != null && locked != null) total = available + locked;
    if (available == null && total != null && locked != null) available = Math.max(0, total - locked);
    if (locked == null && total != null && available != null) locked = Math.max(0, total - available);
    if (total == null && available != null) total = available;
    if (available == null && total != null) available = total;
    if (locked == null) locked = 0;
    // Include pending (mempool) coins in the displayed total so an incoming payment shows the
    // instant the node sees it — matching the official Minima wallet (confirmed + unconfirmed).
    // The node's `unconfirmed` is a token amount (the coin count is the separate `coins` field).
    const unconfirmed = parseTokenNumber(row && row.unconfirmed);
    if (unconfirmed != null && unconfirmed !== 0 && Number.isFinite(Number(total))) {
      total = Number(total) + Number(unconfirmed);
    }
    return {
      total: Number(total) || 0,
      available: Number(available) || 0,
      locked: Number(locked) || 0,
      unconfirmed: Number(unconfirmed) || 0
    };
  }

  async function fetchTesterAddress() {
    async function fetchAddressViaRpcFallback() {
      if (typeof stablesRpcSendCommand !== 'function') return '';
      for (let i = 0; i < 3; i++) {
        try { console.log('[address] getaddress via RPC fallback attempt ' + (i + 1)); } catch (_) {}
        try {
          const res = await stablesRpcSendCommand('getaddress');
          if (typeof stablesParseGetaddressAddressPair === 'function') {
            const pair = stablesParseGetaddressAddressPair(res);
            const a = (pair && (pair.mx || pair.hex)) || '';
            if (a) return a;
          }
          if (res && res.response) {
            const a = String(res.response.miniaddress || res.response.address || '').trim();
            if (a) return a;
          }
        } catch (_) { /* retry */ }
        await sleep(650);
      }
      return '';
    }

    if (typeof window.stablesFetchMdsReceiveAddress === 'function') {
      return new Promise(function (resolve, reject) {
        let done = false;
        const finish = function (addr) {
          if (done) return;
          const a = String(addr || '').trim();
          if (a.length >= 20) {
            try { console.log('[address] receive address resolved'); } catch (_) {}
            done = true;
            clearTimeout(tid);
            resolve(a);
          }
        };
        const tid = setTimeout(function () {
          if (done) return;
          try { console.log('[address] receive address timed out, trying RPC fallback'); } catch (_) {}
          fetchAddressViaRpcFallback().then(function (addr) {
            finish(addr);
            if (!done) {
              try { console.warn('[address] RPC fallback returned no address'); } catch (_) {}
              done = true;
              reject(new Error('Connect your node and wait for live sync, then try again.'));
            }
          }).catch(function () {
            if (done) return;
            try { console.warn('[address] RPC fallback failed'); } catch (_) {}
            done = true;
            reject(new Error('Connect your node and wait for live sync, then try again.'));
          });
        }, 3500);
        window.stablesFetchMdsReceiveAddress(function (addr) {
          finish(addr);
        });
      });
    }
    if (typeof Minima !== 'undefined' && Minima.getAddress) {
      return Minima.getAddress();
    }
    if (typeof MDS !== 'undefined' && MDS.cmd) {
      return new Promise(function (resolve, reject) {
        MDS.cmd('getaddress', function (r) {
          if (typeof stablesParseGetaddressAddressPair === 'function') {
            const pair = stablesParseGetaddressAddressPair(r);
            const a = pair.mx || pair.hex || '';
            if (a) return resolve(a);
          }
          if (r && r.status && r.response && r.response.miniaddress) resolve(r.response.miniaddress);
          else reject(new Error((r && r.error) || 'getaddress failed'));
        });
      });
    }
    throw new Error('No Minima address provider');
  }

  function mdsCmdAsync(cmd) {
    stablesNodeBuildNoteCommand(cmd);
    return new Promise(function (resolve, reject) {
      const rpcCfg = typeof stablesGetRpcConfig === 'function' ? stablesGetRpcConfig() : null;
      const canRpc = !!(rpcCfg && typeof stablesRpcSendCommand === 'function');
      const canMds = !!(typeof MDS !== 'undefined' && MDS.cmd);
      if (!canRpc && !canMds) {
        reject(new Error('Connect your Minima node first'));
        return;
      }
      const onResult = function (res) {
        if (typeof stablesMdsCmdOk === 'function' && stablesMdsCmdOk(res)) { resolve(res); return; }
        // A queued command is not a failed one. MDS answers `pending:true` when this MiniDapp has
        // read-only permission and the person is being asked to approve the command in Minima.
        // Mark the rejection so callers can tell "you must approve this" from "this went wrong",
        // instead of writing a permanent "failed" row for something never attempted on chain.
        const outcome = (typeof stablesNodeCmdOutcome === 'function')
          ? stablesNodeCmdOutcome(res)
          : 'failed';
        if (outcome === 'needs-confirmation') {
          try { if (typeof stablesNoteNodeWriteBlocked === 'function') stablesNoteNodeWriteBlocked(); } catch (_) { /* ignore */ }
          /* Remember the queue entry so the watcher can tell when the person answers it. The uid
             comes back on the response; if this build of MDS omits it the watcher still works,
             because it reads the whole queue and notices entries leaving. */
          try {
            const puid = String((res && (res.pendinguid || res.pendingUID)) || '');
            if (puid && Array.isArray(window.__STABLES_NODE_PENDING_UIDS__)
                && window.__STABLES_NODE_PENDING_UIDS__.indexOf(puid) < 0) {
              window.__STABLES_NODE_PENDING_UIDS__.push(puid);
            }
          } catch (_) { /* ignore */ }
          const pe = new Error(typeof window.stablesNodeWriteBlockedMessage === 'function'
            ? window.stablesNodeWriteBlockedMessage()
            : 'This command is waiting to be confirmed in Minima.');
          pe.needsConfirmation = true;
          reject(pe);
          return;
        }
        const err = typeof stablesMdsSendErrorText === 'function'
          ? stablesMdsSendErrorText(res)
          : ((res && res.error) || 'Command failed');
        reject(new Error(err));
      };
      // One shared decision for every node command (stablesNodeCommandTransport). Never test
      // `typeof stablesRpcSendCommand === 'function'` here: it is always true and decides nothing.
      const preferRpc = (typeof stablesNodeCommandTransport === 'function')
        ? stablesNodeCommandTransport() === 'rpc'
        : canRpc;
      if (canRpc && preferRpc) {
        stablesRpcSendCommand(cmd).then(onResult).catch(reject);
      } else {
        MDS.cmd(cmd, onResult);
      }
    });
  }

  function mdsPayload(res) {
    if (!res) return null;
    return typeof stablesCoerceMdsPayload === 'function'
      ? stablesCoerceMdsPayload(res.response)
      : res.response;
  }

  async function mdsCmdData(cmd) {
    const res = await mdsCmdAsync(cmd);
    return mdsPayload(res);
  }

  async function fetchTesterWallet() {
    let res = null;
    const useRpc = (typeof stablesNodeCommandTransport === 'function')
      ? stablesNodeCommandTransport() === 'rpc'
      : typeof stablesRpcSendCommandNow === 'function';
    if (useRpc && typeof stablesRpcSendCommandNow === 'function') {
      res = await stablesRpcSendCommandNow('getaddress');
    } else if (typeof MDS !== 'undefined' && MDS.cmd) {
      res = await mdsCmdAsync('getaddress');
    }
    if (res) {
      if (typeof stablesParseGetaddressAddressPair === 'function') {
        const pair = stablesParseGetaddressAddressPair(res);
        const body = mdsPayload(res);
        const hex = pair.hex
          || (body && body.address ? String(body.address).trim() : '');
        const mx = pair.mx
          || (body && body.miniaddress ? String(body.miniaddress).trim() : '');
        if (hex.length >= 40) {
          return { address: hex, miniaddress: mx || hex };
        }
      }
      const body = mdsPayload(res);
      if (body && body.address) {
        return {
          address: String(body.address).trim(),
          miniaddress: String(body.miniaddress || body.address).trim(),
        };
      }
    }
    const display = await fetchTesterAddress();
    if (display && display.length >= 20) {
      return { address: display, miniaddress: display };
    }
    throw new Error('Connect your node and wait for live sync, then try again.');
  }
  window.__STABLES_TEST_FETCH_TESTER_WALLET__ = fetchTesterWallet;

  // Stable wallet fingerprint for the wallet-change guard.
  // getaddress returns a fresh key each call, so using its miniaddress caused
  // an infinite reload loop. The first key from `keys` is deterministic for a seed.
  async function fetchWalletStableFingerprint() {
    try {
      const data = await mdsCmdData('keys');
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.keys) ? data.keys : null);
      if (list && list.length && list[0] && list[0].publickey) {
        return String(list[0].publickey).trim().toLowerCase();
      }
    } catch (_) { /* ignore */ }
    return '';
  }

  function faucetStatePorts(recipientHex, amount, poolRemain, tag99) {
    // Must match the DEPLOYED faucet covenant (scripts/faucet_covenant_g2.kiss) exactly: amt@20,
    // recipient@21, poolleft@25, and the constant covenant tag at port 99. The covenant's
    // SAMESTATE(99 99) pins port 99 IMMUTABLE for the life of the state coin, so the value the claim
    // writes MUST equal the value already stored on the live state coin. That value is decided at seed
    // time and cannot be migrated later. The genesis-2 faucet was seeded with '2' (the seed tool
    // overloaded port 99 with OP_CLAIM), while USDw/xWiniwa were seeded with '7' — so we no longer
    // hardcode a tag here: the caller reads port 99 off the live state coin and passes it in. Falls
    // back to '7' only if the state coin has no port 99 (e.g. a fresh redeploy seeded with the tag).
    const ports = {};
    ports[FAUCET_STATE.AMOUNT] = String(amount);        // 20
    ports[FAUCET_STATE.RECIPIENT] = recipientHex;       // 21
    if (poolRemain != null && poolRemain !== '') {
      ports[FAUCET_STATE.POOL_REMAIN] = String(poolRemain); // 25
    }
    ports[99] = (tag99 != null && tag99 !== '') ? String(tag99) : '7'; // carried forward from the live state coin
    return ports;
  }

  function tokenDisplayToAtoms8(value) {
    let s = String(value == null ? '' : value).trim();
    if (!/^(0|[1-9][0-9]*)(\.[0-9]{1,8})?$/.test(s)) throw new Error('Invalid 8-decimal token amount: ' + s);
    const parts = s.split('.');
    return BigInt(parts[0]) * 100000000n + BigInt(((parts[1] || '') + '00000000').slice(0, 8));
  }

  async function sha256HexUtf8(text) {
    if (!(window.crypto && window.crypto.subtle && typeof window.TextEncoder === 'function')) {
      throw new Error('This browser cannot construct deterministic faucet operation IDs.');
    }
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
    return '0x' + Array.from(new Uint8Array(digest)).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  async function tv81FaucetStatePorts(stateCoin, recipientHex, poolRemainDisplay) {
    const p = TV81_FAUCET_STATE;
    const ports = {};
    for (let port = 0; port <= 19; port++) {
      const value = readStatePort(stateCoin, port);
      if (value == null) throw new Error('TV81 faucet state coin is missing port ' + port + '.');
      ports[port] = String(value);
    }
    const claimAtoms = BigInt(String(readStatePort(stateCoin, p.FULL_CLAIM_ATOMS) || '0'));
    if (claimAtoms !== tokenDisplayToAtoms8(String(claimAmount))) {
      throw new Error('TV81 faucet claim amount does not match the immutable state policy.');
    }
    const nonce = BigInt(String(readStatePort(stateCoin, p.NONCE) || '0')) + 1n;
    const cumulative = BigInt(String(readStatePort(stateCoin, p.CUMULATIVE_CLAIMED_ATOMS) || '0')) + claimAtoms;
    const poolRemainingAtoms = tokenDisplayToAtoms8(poolRemainDisplay);
    const generationId = String(readStatePort(stateCoin, p.GENERATION_ID) || reg.generation_id || '').toLowerCase();
    const recipient = String(recipientHex).toLowerCase();
    const values = [generationId, nonce.toString(), recipient, claimAtoms.toString()];
    const encoded = values.map(function (value) { return String(value).length + ':' + value; }).join('|');
    const operationId = await sha256HexUtf8('stables|tv81|faucet-claim|v1|4|' + encoded + '\n');
    ports[p.NONCE] = nonce.toString();
    ports[p.CUMULATIVE_CLAIMED_ATOMS] = cumulative.toString();
    ports[p.STATUS] = poolRemainingAtoms === 0n ? '2' : '1';
    ports[p.CLAIM_ATOMS] = claimAtoms.toString();
    ports[p.RECIPIENT] = recipient;
    ports[p.POOL_REMAINING_ATOMS] = poolRemainingAtoms.toString();
    ports[p.OPERATION_ID] = operationId;
    ports[p.ACTION] = '1';
    return ports;
  }

  async function findCovenantCoins(cmdParts) {
    const data = await mdsCmdData(cmdParts.join(' '));
    return Array.isArray(data) ? data : [];
  }

  // Urgent read path: bypass the shared RPC queue so faucet coin lookups do not get stuck
  // behind live balance/activity polling. Only safe for read-only commands that tolerate
  // concurrent execution with queued writes. Falls back to the queued path when no direct
  // RPC function is available.
  async function urgentMdsCmdData(cmd) {
    // Urgent means "skip the polling queue", NOT "always use RPC". The old guard tested only that
    // the RPC function existed, which is always true, so on the MiniDapp every urgent read left
    // over a transport that platform does not have and the faucet level never loaded.
    const useRpc = (typeof stablesNodeCommandTransport === 'function')
      ? stablesNodeCommandTransport() === 'rpc'
      : typeof stablesRpcSendCommandNow === 'function';
    if (useRpc && typeof stablesRpcSendCommandNow === 'function') {
      const res = await stablesRpcSendCommandNow(cmd);
      const payload = typeof stablesCoerceMdsPayload === 'function'
        ? stablesCoerceMdsPayload(res && res.response)
        : (res && res.response);
      return payload;
    }
    return mdsCmdData(cmd);
  }

  // Coins recovered from an on-chain snapshot, indexed by the covenant address they sit at.
  // WHY: `coins address:` searches only the UNPRUNED chain, so a coin imported from a snapshot but
  // older than this node's window is HELD yet invisible to every address scan. The book already
  // worked around this per-coin; the vault did not, which is why minting refused with "the vault
  // balance state coin is not visible yet" on a node that had just imported that very coin
  // (founder report 2026-07-26). Fixing it in the shared lookup covers vault, faucet and anything
  // added later, instead of each caller reinventing the merge.
  /* Ask the node for the coins at a covenant address the way that actually returns them.
   *
   * Measured on Minima 1.0.45.15, on a freshly synced node, against the live V9 vault
   * (0xF4B1826C…), with both queries issued from inside the running MiniDapp over MDS:
   *
   *     coins address:<vault> relevant:false   ->  0 coins
   *     coins address:<vault>                  ->  3 unspent coins (reserve, balance, pool)
   *
   * The help text says `relevant:false` searches every coin in the unpruned chain, so every
   * covenant read in this file passed it. It does not behave that way for an address the node has
   * not taken into its own coin set: the faucet answers both ways only because the claim path
   * imports its coins. The vault does not, so a node that could see all three vault coins reported
   * "The vault balance or reserve coin is not locally proven" and disabled mint and burn. It read
   * as the pruning-window problem and was not: the coins were 213 blocks old.
   *
   * So: ask both ways and merge by coin id. The plain form finds in-window covenant coins the
   * node has not adopted; the `relevant:false` form is kept because it is what answers on a node
   * that HAS adopted them, and neither is a superset of the other. Snapshot-recovered coins are
   * merged by their callers on top of this, since those are out of window entirely.
   */
  async function tv81CoinsAtAddress(address, extraParts) {
    const addr = String(address || '').trim();
    if (!addr) return [];
    const tail = (extraParts && extraParts.length) ? ' ' + extraParts.join(' ') : '';
    const rows = function (data) {
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.coins)) return data.coins;
      return [];
    };
    let plain = [];
    let scoped = [];
    try { plain = rows(await mdsCmdData('coins address:' + addr + tail)); } catch (_) { /* one form is enough */ }
    try { scoped = rows(await mdsCmdData('coins address:' + addr + ' relevant:false' + tail)); } catch (_) { /* ditto */ }
    const seen = {};
    const out = [];
    for (const c of plain.concat(scoped)) {
      if (!c || !c.coinid) continue;
      const k = String(c.coinid).toLowerCase();
      if (seen[k]) continue;
      seen[k] = true;
      out.push(c);
    }
    return out;
  }
  window.tv81CoinsAtAddress = tv81CoinsAtAddress;

  /* Same measured fault, same shape, for a single coin:
   *     coins coinid:<a vault coin> relevant:false  ->  0
   *     coins coinid:<a vault coin>                 ->  1
   * Every read of a covenant coin by id goes through here, so a re-check of an order, a state coin
   * or a vault coin cannot silently decide the coin is gone. It returns a LIST, the same shape the
   * node's payload had, because "no rows" is a meaningful answer to several callers (an order coin
   * that is really spent) and turning it into null would have changed what they concluded. */
  async function tv81CoinsById(coinid) {
    const id = String(coinid || '').trim();
    if (!id) return [];
    const rows = function (data) {
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.coins)) return data.coins;
      return (data && data.coinid) ? [data] : [];
    };
    let plain = [];
    let scoped = [];
    try { plain = rows(await mdsCmdData('coins coinid:' + id)); } catch (_) { /* one form is enough */ }
    try { scoped = rows(await mdsCmdData('coins coinid:' + id + ' relevant:false')); } catch (_) { /* ditto */ }
    const seen = {};
    const out = [];
    for (const c of plain.concat(scoped)) {
      if (!c || !c.coinid) continue;
      const k = String(c.coinid).toLowerCase();
      if (seen[k]) continue;
      seen[k] = true;
      out.push(c);
    }
    return out;
  }
  window.tv81CoinsById = tv81CoinsById;

  window.__TV81_SNAPSHOT_COINS__ = window.__TV81_SNAPSHOT_COINS__ || {};
  function tv81NoteSnapshotCoin(addr, coinid) {
    if (!addr || !coinid) return;
    const k = String(addr).toLowerCase();
    const m = window.__TV81_SNAPSHOT_COINS__;
    m[k] = m[k] || [];
    if (m[k].indexOf(String(coinid)) < 0) m[k].push(String(coinid));
  }

  async function findCovenantCoinsUrgent(cmdParts) {
    const data = await urgentMdsCmdData(cmdParts.join(' '));
    let out = [];
    if (Array.isArray(data)) out = data;
    else if (data && Array.isArray(data.coins)) out = data.coins;
    else if (data && data.response && Array.isArray(data.response.coins)) out = data.response.coins;
    // Merge snapshot-recovered coins the address scan cannot see (out of the unpruned window).
    // Each is re-fetched by coin id and re-validated by the caller exactly like a scanned coin, so
    // this adds no trust: a spent or stale entry simply fails the caller's checks and drops out.
    try {
      const addrPart = (cmdParts || []).map(String).find(function (p) { return /^address:/i.test(p); });
      if (addrPart) {
        const addr = addrPart.slice(8).toLowerCase();
        const extra = (window.__TV81_SNAPSHOT_COINS__ || {})[addr] || [];
        const have = {};
        out.forEach(function (c) { if (c && c.coinid) have[String(c.coinid).toLowerCase()] = true; });
        for (let i = 0; i < extra.length; i++) {
          if (have[String(extra[i]).toLowerCase()]) continue;
          try {
            const one = await mdsCmdData('coins coinid:' + extra[i]);
            const c = Array.isArray(one) ? one[0] : one;
            if (c && c.coinid && !c.spent) out.push(c);
          } catch (_) { /* a missing or spent snapshot coin is simply not merged */ }
        }
      }
    } catch (_) { /* merging is best-effort; the scan result still stands */ }
    return out;
  }

  // ============================================================================================
  // TV81 market price-state reader (P6-01) and order-book projection (P7-05/06/07), fail-closed.
  // The price lifecycle is oracle-free: token-holder launch state and the authenticated D05 CLOB
  // state are the only sources. Until the controlled ceremony records real state coin IDs in the
  // registry projection, the reader reports NOT_DEPLOYED and no surface may invent a price.
  // These are read-only chain queries; nothing here signs, posts, or mutates the node.
  // ============================================================================================
  const TV81_PRICE_STATE = {
    SCHEMA: 90, GENERATION_ID: 91, TAG: 92, MARKET_ID: 93, MODE: 94,
    ACTIVE_PRICE_ATOMS: 95, LAUNCH_PRICE_ATOMS: 96, MARKET_CANDIDATE_ATOMS: 97,
    EFFECTIVE_STATE_NONCE: 98, LATEST_ELIGIBLE_FILL_NONCE: 99, STALE_AFTER: 100,
    PRICE_NONCE: 101, OBSERVATION_COUNT: 102, NEXT_RING_CURSOR: 103,
    WEIGHTED_MEDIAN_ATOMS: 104, RAW_BASE_VOLUME_ATOMS: 105, OBSERVATION_NONCE_SPAN: 106,
    DISTINCT_MAKER_COUNT: 107, BEST_BID: 108, BEST_ASK: 109, SPREAD_NUM: 110,
    BID_DEPTH: 111, ASK_DEPTH: 112, HISTORY_COMMITMENT: 113, AUTHORITY_PROPOSAL_ID: 114,
    STATUS: 115,
  };
  const TV81_ORDER_STATE = {
    SCHEMA: 0, GENERATION_ID: 1, TAG: 2, MARKET_ID: 3, SIDE: 4, PRICE_ATOMS: 5,
    TICK_ATOMS: 6, BASE_TOKEN_ID: 7, QUOTE_TOKEN_ID: 8, ESCROW_TOKEN_ID: 9,
    ORIGINAL_BASE_ATOMS: 10, REMAINING_BASE_ATOMS: 11, MAKER_RECEIVE: 12, MAKER_PUBKEY: 13,
    REFUND: 14, ORDER_ID: 15, MAKER_NONCE: 16, PRICE_TICK_INDEX: 17,
    CUM_FILLED_BASE: 18, CURRENT_ESCROW: 19, CUM_QUOTE: 20,
    REQUESTED_FILL_BASE: 21, TAKER_RECEIVE: 22, ACTION: 23, OPERATION_ID: 24,
  };
  const TV81_PRICE_MODE_NAMES = { 1: 'TOKEN_HOLDER_LAUNCH_PRICE', 2: 'CLOB_MARKET_PRICE', 3: 'CLOB_REFERENCE_ONLY' };

  let _tv81AppRegistryCache = null;
  async function tv81AppRegistry() {
    if (_tv81AppRegistryCache) return _tv81AppRegistryCache;
    const url = String((cfg.TEST_VERSION_0081 && cfg.TEST_VERSION_0081.registry_url) || '').trim();
    if (!url) throw new Error('The TV81 registry projection URL is not configured.');
    const res = await fetch(url, { cache: 'no-store' });
    const j = await res.json();
    if (!j || j.source_registry_id !== 'TV81-REGISTRY-001') {
      throw new Error('The TV81 registry projection is missing or invalid.');
    }
    _tv81AppRegistryCache = j;
    return j;
  }

  function tv81StateBigInt(stateCoin, port, label) {
    const raw = readStatePort(stateCoin, port);
    if (raw == null) throw new Error('TV81 state coin is missing port ' + port + ' (' + label + ').');
    const s = String(raw);
    if (!/^(0|[1-9][0-9]*)$/.test(s)) throw new Error('TV81 port ' + port + ' (' + label + ') is not canonical unsigned base-10: ' + s);
    return BigInt(s);
  }

  async function tv81ChainBlock() {
    try {
      const st = await mdsCmdData('status');
      const block = Number(st && st.chain && st.chain.block);
      return Number.isFinite(block) && block > 0 ? BigInt(block) : null;
    } catch (_) { return null; }
  }

  // Track the market-engine script once per session so `coins address:<engine>` returns the
  // order and price-state coins on a FRESH node. Without this the book is structurally empty on
  // any node that did not deploy the engine (2026-07-18 founder report: empty book on the phone
  // while the same in-window ladder rendered on Test12 — the lab law: address queries return
  // nothing for untracked addresses even when the coins are inside the unpruned window). The
  // exact registered script ships in the registry projection (order_book.script, sha 6eae1169…).
  let _tv81EngineTracked = false;
  let _tv81EngineTracking = null;
  async function tv81EnsureEngineTracked(registry) {
    if (_tv81EngineTracked) return true;
    if (_tv81EngineTracking) return _tv81EngineTracking;
    _tv81EngineTracking = (async function () {
      try {
        const ob = (registry && registry.order_book) || {};
        const script = String(ob.script || '');
        const addr = String(ob.engine_address || '');
        if (!script || !addr) return false;
        await ensureCovenantTracked(addr, script, 'tracking the market engine script', 30000);
        _tv81EngineTracked = true;
        return true;
      } catch (_) {
        return false;
      } finally {
        _tv81EngineTracking = null;
      }
    })();
    return _tv81EngineTracking;
  }

  // ── TV81 on-chain state beacon reader ────────────────────────────────────────────────────
  // A fresh light node cannot fetch the covenant order/faucet coins from the network (they are
  // pruned or were never tracked in-window), so it reads a single BEACON coin instead: its
  // STATE(0) is a Merkle ROOT committing the app state (book/faucet/registry/params), carried as
  // leaf preimages in STATE(10..13). The root binds the leaves on-chain (covenant
  // tv81_beacon_v1.kiss, binding proven 4/4), so any node holding the coin verifies every leaf
  // against the root with plain SHA-256 — no trusted server. Minima SHA2 == standard SHA-256 and
  // CONCAT == raw byte concat (both proven 2026-07-18), so the whole tree is verified in-browser
  // with WebCrypto, node `hash type:sha2` only as a fallback. Beacon = DISPLAY; taking an order
  // still needs that order coin's proof imported (design doc §9).
  async function tv81Sha256(hex0x) {
    const hex = String(hex0x || '').replace(/^0x/i, '');
    if (!/^([0-9a-fA-F]{2})*$/.test(hex) || hex.length === 0) throw new Error('SHA2 input must be non-empty even-length hex.');
    try {
      if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        const buf = await crypto.subtle.digest('SHA-256', bytes);
        return '0x' + Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      }
    } catch (_) { /* fall through to node */ }
    const data = await mdsCmdData('hash data:0x' + hex + ' type:sha2');
    const d = String((data && data.hash) || '').toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(d)) throw new Error('The node did not return a valid SHA2 digest.');
    return d;
  }
  function tv81ConcatHex(a, b) {
    return '0x' + String(a).replace(/^0x/i, '') + String(b).replace(/^0x/i, '');
  }
  // Rebuild the Merkle root from the leaf PREIMAGES exactly as the node/covenant does:
  // leaf = SHA2(preimage); balanced pairwise reduction (odd node duplicated). For the current
  // 4-leaf beacon this is SHA2(CONCAT(SHA2(CONCAT(l0 l1)) SHA2(CONCAT(l2 l3)))).
  async function tv81BeaconRoot(preimageHexes) {
    let level = [];
    for (const p of preimageHexes) level.push(await tv81Sha256(p));
    while (level.length > 1) {
      const next = [];
      for (let i = 0; i < level.length; i += 2) {
        const a = level[i];
        const b = (i + 1 < level.length) ? level[i + 1] : level[i];
        next.push(await tv81Sha256(tv81ConcatHex(a, b)));
      }
      level = next;
    }
    return String(level[0] || '').toLowerCase();
  }
  // Decode a leaf preimage "TV81BEACON|<kind>|k=v|k=v" into { _raw, kind, ...kv }.
  function tv81ParseBeaconLeaf(hex0x) {
    const hex = String(hex0x || '').replace(/^0x/i, '');
    let s = '';
    for (let i = 0; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    const parts = s.split('|');
    const out = { _raw: s, kind: parts[1] || '' };
    for (let i = 2; i < parts.length; i++) {
      const eq = parts[i].indexOf('=');
      if (eq > 0) out[parts[i].slice(0, eq)] = parts[i].slice(eq + 1);
    }
    return out;
  }
  let _tv81BeaconCache = null;
  let _tv81BeaconCacheAt = 0;
  let _tv81BeaconTracked = false;
  let _tv81BeaconTracking = null;
  async function tv81EnsureBeaconTracked(beacon) {
    if (_tv81BeaconTracked) return true;
    if (_tv81BeaconTracking) return _tv81BeaconTracking;
    _tv81BeaconTracking = (async function () {
      try {
        if (!beacon || !beacon.script || !beacon.covenant_address) return false;
        await ensureCovenantTracked(beacon.covenant_address, beacon.script, 'tracking the state beacon', 30000);
        _tv81BeaconTracked = true;
        return true;
      } catch (_) {
        return false;
      } finally {
        _tv81BeaconTracking = null;
      }
    })();
    return _tv81BeaconTracking;
  }
  // Read + verify the beacon. Returns null if unconfigured; otherwise
  // { available, verified, root, coinId, schema, leaves:{book,faucet,registry,params} }.
  // A verified result is cached briefly. Never throws — callers treat absence/unverified as
  // "no beacon data" and keep their existing logic.
  async function tv81ReadBeacon() {
    try {
      const now = Date.now();
      if (_tv81BeaconCache && (now - _tv81BeaconCacheAt) < 15000) return _tv81BeaconCache;
      const registry = await tv81AppRegistry();
      const beacon = registry && registry.state_beacon;
      if (!beacon || !beacon.covenant_address || !beacon.ports) return null;
      await tv81EnsureBeaconTracked(beacon);
      const ports = beacon.ports;
      const data = await tv81CoinsAtAddress(String(beacon.covenant_address).toLowerCase());
      const coins = Array.isArray(data) ? data : (data && Array.isArray(data.coins) ? data.coins : []);
      let best = null;
      let bestSchema = -1;
      for (const c of coins) {
        if (!c || c.spent) continue;
        if (readStatePort(c, ports.root) == null) continue;
        const sc = Number(readStatePort(c, ports.schema));
        if (Number.isFinite(sc) && sc > bestSchema) { bestSchema = sc; best = c; }
      }
      if (!best) return { available: false, verified: false };
      const root = String(readStatePort(best, ports.root) || '').toLowerCase();
      const order = Array.isArray(beacon.leaf_order) ? beacon.leaf_order : [];
      const leafHexes = order.map(function (name) { return String(readStatePort(best, ports[name]) || ''); });
      if (!root || leafHexes.some(function (h) { return !/^0x([0-9a-f]{2})+$/i.test(h); })) {
        return { available: true, verified: false };
      }
      let computed;
      try { computed = await tv81BeaconRoot(leafHexes); } catch (_) { return { available: true, verified: false }; }
      const verified = computed === root;
      const leaves = {};
      order.forEach(function (name, i) { leaves[name] = tv81ParseBeaconLeaf(leafHexes[i]); });
      const out = { available: true, verified: verified, root: root, coinId: String(best.coinid || ''), schema: bestSchema, leaves: leaves };
      if (verified) { _tv81BeaconCache = out; _tv81BeaconCacheAt = now; }
      return out;
    } catch (_) { return null; }
  }
  try { window.tv81ReadBeacon = tv81ReadBeacon; } catch (_) { /* ignore */ }

  // Convert the beacon's verified book leaf into the same shape tv81ReadOrderBook returns, for
  // DISPLAY on a fresh light node that cannot read the per-order coins. The book leaf is
  // "TV81BEACON|book|seq=N|a=<price:remAtoms,...>|b=<price:remAtoms,...>" with asks ascending
  // (best first) and bids descending (best first) — the keeper's ordering, matching the render.
  // Individual orders are not available (aggregated bins only); taking an order still needs the
  // live order coin, so `orders` is empty and this is display-only.
  async function tv81BookFromBeacon(marketCode, market, tick) {
    const beacon = await tv81ReadBeacon();
    if (!beacon || !beacon.verified || !beacon.leaves || !beacon.leaves.book) return null;
    const parseSide = function (str) {
      return String(str || '').split(',').filter(Boolean).map(function (pair) {
        const idx = pair.indexOf(':');
        if (idx < 0) return null;
        const priceAtoms = pair.slice(0, idx), baseAtoms = pair.slice(idx + 1);
        if (!/^[0-9]+$/.test(priceAtoms) || !/^[0-9]+$/.test(baseAtoms) || baseAtoms === '0') return null;
        return { priceAtoms: priceAtoms, baseAtoms: baseAtoms, orderCount: 0 };
      }).filter(Boolean);
    };
    const askBins = parseSide(beacon.leaves.book.a);
    const bidBins = parseSide(beacon.leaves.book.b);
    if (askBins.length === 0 && bidBins.length === 0) return null;
    const bestAsk = askBins.length ? askBins[0].priceAtoms : null;
    const bestBid = bidBins.length ? bidBins[0].priceAtoms : null;
    const depth = function (bins) { return bins.reduce(function (s, x) { return s + BigInt(x.baseAtoms); }, 0n).toString(); };
    return {
      market: marketCode, marketId: market.market_id, tickAtoms: tick.toString(),
      orders: { asks: [], bids: [] },
      bins: { asks: askBins, bids: bidBins },
      bestAskAtoms: bestAsk, bestBidAtoms: bestBid,
      spreadAtoms: (bestAsk != null && bestBid != null) ? (BigInt(bestAsk) - BigInt(bestBid)).toString() : null,
      askDepthBaseAtoms: depth(askBins), bidDepthBaseAtoms: depth(bidBins),
      excludedInvalidCoins: 0, behavioralClaim: false, source: 'beacon',
    };
  }

  async function tv81FindPriceStateCoin(registry, marketCode) {
    const market = (registry.markets || {})[marketCode];
    if (!market) throw new Error('Unknown TV81 market: ' + marketCode);
    await tv81EnsureEngineTracked(registry);
    const ps = registry.price_state || {};
    const engine = String(ps.engine_address || market.order_address || '').toLowerCase();
    if (!engine) throw new Error('The TV81 market-engine address is missing.');
    const configuredId = ps.state_coin_ids ? ps.state_coin_ids[marketCode] : null;
    if (configuredId) {
      try {
        const direct = await tv81CoinsById(String(configuredId));
        const rows = Array.isArray(direct) ? direct : (direct && Array.isArray(direct.coins) ? direct.coins : []);
        const current = rows.find(function (c) { return c && !c.spent; });
        if (current) return current;
      } catch (_) { /* continuation discovery below */ }
    }
    const data = await tv81CoinsAtAddress(engine);
    const coins = Array.isArray(data) ? data : (data && Array.isArray(data.coins) ? data.coins : []);
    const generationId = String(registry.generation_id || '').toLowerCase();
    const candidates = coins.filter(function (coin) {
      if (!coin || coin.spent || String(coin.tokenid || '').toLowerCase() !== '0x00') return false;
      try {
        return String(coin.address || '').toLowerCase() === engine
          && tv81StateBigInt(coin, TV81_PRICE_STATE.TAG, 'price-state tag') === 8106n
          && String(readStatePort(coin, TV81_PRICE_STATE.GENERATION_ID) || '').toLowerCase() === generationId
          && tv81StateBigInt(coin, TV81_PRICE_STATE.MARKET_ID, 'price-state market') === BigInt(market.market_id);
      } catch (_) { return false; }
    }).sort(function (a, b) { return (Number(b.created) || 0) - (Number(a.created) || 0); });
    return candidates[0] || null;
  }

  // Read one market's authenticated price state. Fail-closed: NOT_DEPLOYED until the controlled
  // ceremony fills state_coin_ids; never substitutes a launch, historical, or app-selected price.
  async function tv81ReadMarketPriceState(marketCode) {
    const registry = await tv81AppRegistry();
    const market = (registry.markets || {})[marketCode];
    if (!market) throw new Error('Unknown TV81 market: ' + marketCode);
    const ps = registry.price_state || {};
    const configuredCoinId = ps.state_coin_ids ? ps.state_coin_ids[marketCode] : null;
    if (!configuredCoinId) {
      return {
        deployed: false, status: 'NOT_DEPLOYED', market: marketCode, marketId: market.market_id,
        reason: 'The ' + marketCode + ' market price-state coin has not been created by the controlled TestV008 ceremony.',
      };
    }
    const coin = await tv81FindPriceStateCoin(registry, marketCode);
    if (!coin) return { deployed: false, status: 'STATE_COIN_NOT_FOUND', market: marketCode, coinId: String(configuredCoinId) };
    if (String(coin.address || '').toLowerCase() !== String(ps.engine_address || '').toLowerCase()) {
      throw new Error('The ' + marketCode + ' price-state coin is not at the registered market-engine address.');
    }
    const p = TV81_PRICE_STATE;
    if (tv81StateBigInt(coin, p.TAG, 'tag') !== 8106n) throw new Error('The ' + marketCode + ' price-state coin does not carry tag 8106.');
    const generationId = String(readStatePort(coin, p.GENERATION_ID) || '').toLowerCase();
    if (generationId !== String(registry.generation_id || '').toLowerCase()) {
      throw new Error('The ' + marketCode + ' price-state coin belongs to a different generation.');
    }
    if (tv81StateBigInt(coin, p.MARKET_ID, 'market id') !== BigInt(market.market_id)) {
      throw new Error('The ' + marketCode + ' price-state coin carries the wrong market ID.');
    }
    const mode = Number(tv81StateBigInt(coin, p.MODE, 'mode'));
    const modeName = TV81_PRICE_MODE_NAMES[mode];
    if (!modeName) throw new Error('The ' + marketCode + ' price-state coin carries an unknown mode: ' + mode);
    const activeAtoms = tv81StateBigInt(coin, p.ACTIVE_PRICE_ATOMS, 'active price');
    const staleAfter = tv81StateBigInt(coin, p.STALE_AFTER, 'stale threshold');
    const created = Number(coin.created);
    const chainBlock = await tv81ChainBlock();
    const coinAge = (chainBlock != null && Number.isFinite(created)) ? chainBlock - BigInt(created) : null;
    const stale = mode === 1 ? false : (coinAge == null ? null : coinAge >= staleAfter);
    return {
      deployed: true,
      status: 'DEPLOYED_UNVERIFIED',
      market: marketCode,
      marketId: market.market_id,
      coinId: String(coin.coinid || configuredCoinId),
      mode: mode,
      modeName: modeName,
      isParPriceInstance: market.market_id === 2,
      activePriceAtoms: activeAtoms.toString(),
      hasActivePrice: activeAtoms > 0n,
      launchPriceAtoms: tv81StateBigInt(coin, p.LAUNCH_PRICE_ATOMS, 'launch price').toString(),
      observationCount: Number(tv81StateBigInt(coin, p.OBSERVATION_COUNT, 'observation count')),
      priceNonce: tv81StateBigInt(coin, p.PRICE_NONCE, 'price nonce').toString(),
      ringStatus: Number(tv81StateBigInt(coin, p.STATUS, 'ring status')),
      coinAgeBlocks: coinAge == null ? null : coinAge.toString(),
      staleAfterBlocks: staleAfter.toString(),
      stale: stale,
    };
  }

  // Discover unspent order coins for one market and project the strict, normalized book
  // (P7-05 discovery, P7-06 bins, P7-07 metrics). Invalid or foreign coins are excluded and
  // counted, never repaired. Aggregation is display-only; chain priority is created block then
  // coin ID, matching the frozen contract.
  async function tv81ReadOrderBook(marketCode) {
    const registry = await tv81AppRegistry();
    // FBA batch market takes over the book when configured (BR4): read the batch order coins.
    if (tv81DirectCfg(registry)) { try { return await tv81DirectReadBook(); } catch (e) { /* fall through */ } }
    if (tv81FbaCfg(registry)) { try { return await tv81FbaReadBook(); } catch (e) { /* fall through to legacy */ } }
    const market = (registry.markets || {})[marketCode];
    if (!market) throw new Error('Unknown TV81 market: ' + marketCode);
    const assets = registry.assets || {};
    const baseTokenId = String((assets[market.base] || {}).token_id || '').toLowerCase();
    const quoteTokenId = String((assets[market.quote] || {}).token_id || '').toLowerCase();
    if (!baseTokenId || !quoteTokenId) throw new Error('TV81 market ' + marketCode + ' token identities are missing.');
    const tick = BigInt(String(market.tick_atoms));
    const engine = String(market.order_address || '').toLowerCase();
    await tv81EnsureEngineTracked(registry);
    const data = await tv81CoinsAtAddress(engine);
    const coins = Array.isArray(data) ? data : (data && Array.isArray(data.coins) ? data.coins : []);
    const o = TV81_ORDER_STATE;
    const orders = [];
    let excluded = 0;
    for (const coin of coins) {
      if (!coin || coin.spent) continue;
      try {
        if (String(coin.address || '').toLowerCase() !== engine) { excluded++; continue; }
        if (tv81StateBigInt(coin, o.TAG, 'tag') !== 8111n) { excluded++; continue; }
        const generationId = String(readStatePort(coin, o.GENERATION_ID) || '').toLowerCase();
        if (generationId !== String(registry.generation_id || '').toLowerCase()) { excluded++; continue; }
        if (tv81StateBigInt(coin, o.MARKET_ID, 'market id') !== BigInt(market.market_id)) continue;
        const side = Number(tv81StateBigInt(coin, o.SIDE, 'side'));
        if (side !== 1 && side !== 2) { excluded++; continue; }
        const price = tv81StateBigInt(coin, o.PRICE_ATOMS, 'price');
        const stateTick = tv81StateBigInt(coin, o.TICK_ATOMS, 'tick');
        if (stateTick !== tick || price <= 0n || price % tick !== 0n) { excluded++; continue; }
        if (String(readStatePort(coin, o.BASE_TOKEN_ID) || '').toLowerCase() !== baseTokenId) { excluded++; continue; }
        if (String(readStatePort(coin, o.QUOTE_TOKEN_ID) || '').toLowerCase() !== quoteTokenId) { excluded++; continue; }
        const escrowTokenId = String(readStatePort(coin, o.ESCROW_TOKEN_ID) || '').toLowerCase();
        if (escrowTokenId !== (side === 1 ? baseTokenId : quoteTokenId)) { excluded++; continue; }
        if (String(coin.tokenid || '').toLowerCase() !== escrowTokenId) { excluded++; continue; }
        const original = tv81StateBigInt(coin, o.ORIGINAL_BASE_ATOMS, 'original base');
        const remaining = tv81StateBigInt(coin, o.REMAINING_BASE_ATOMS, 'remaining base');
        const cumFilled = tv81StateBigInt(coin, o.CUM_FILLED_BASE, 'cumulative filled');
        if (original <= 0n || remaining <= 0n || remaining > original || cumFilled + remaining !== original) { excluded++; continue; }
        const escrow = tv81StateBigInt(coin, o.CURRENT_ESCROW, 'current escrow');
        const cumQuote = tv81StateBigInt(coin, o.CUM_QUOTE, 'cumulative quote');
        if (side === 1) {
          if (escrow !== remaining) { excluded++; continue; }
        } else {
          // BID escrow law: original escrow floor(original*price/1e8) less cumulative quote paid.
          const originalEscrow = (original * price) / 100000000n;
          if (escrow <= 0n || escrow !== originalEscrow - cumQuote) { excluded++; continue; }
        }
        orders.push({
          coinId: String(coin.coinid || ''),
          orderId: String(readStatePort(coin, o.ORDER_ID) || ''),
          side: side === 1 ? 'ASK' : 'BID',
          priceAtoms: price.toString(),
          tickIndex: (price / tick).toString(),
          originalBaseAtoms: original.toString(),
          remainingBaseAtoms: remaining.toString(),
          currentEscrowAtoms: escrow.toString(),
          cumulativeQuoteAtoms: cumQuote.toString(),
          makerReceiveAddress: String(readStatePort(coin, o.MAKER_RECEIVE) || ''),
          createdBlock: Number(coin.created) || 0,
        });
      } catch (_) { excluded++; }
    }
    // Chain priority inside a tick: confirmed creation height, then coin ID.
    const byPriority = function (a, b) {
      return a.createdBlock !== b.createdBlock ? a.createdBlock - b.createdBlock : a.coinId.localeCompare(b.coinId);
    };
    const asks = orders.filter(function (x) { return x.side === 'ASK'; })
      .sort(function (a, b) { const pa = BigInt(a.priceAtoms), pb = BigInt(b.priceAtoms); return pa === pb ? byPriority(a, b) : (pa < pb ? -1 : 1); });
    const bids = orders.filter(function (x) { return x.side === 'BID'; })
      .sort(function (a, b) { const pa = BigInt(a.priceAtoms), pb = BigInt(b.priceAtoms); return pa === pb ? byPriority(a, b) : (pa > pb ? -1 : 1); });
    const toBins = function (rows) {
      const bins = []; const index = {};
      for (const row of rows) {
        let bin = index[row.priceAtoms];
        if (!bin) { bin = { priceAtoms: row.priceAtoms, orderCount: 0, baseAtoms: 0n }; index[row.priceAtoms] = bin; bins.push(bin); }
        bin.orderCount++; bin.baseAtoms += BigInt(row.remainingBaseAtoms);
      }
      return bins.map(function (b) { return { priceAtoms: b.priceAtoms, orderCount: b.orderCount, baseAtoms: b.baseAtoms.toString() }; });
    };
    const bestAsk = asks.length ? asks[0].priceAtoms : null;
    const bestBid = bids.length ? bids[0].priceAtoms : null;
    // Light node: it only retains order coins IT created, so the live read above can be a PARTIAL
    // book. In particular, once the user places their own order the live read returns exactly that
    // one order, which used to suppress the beacon fallback and hide every order from other nodes
    // ("only my order shows", founder report 2026-07-20). Prefer the beacon's complete, verified
    // keeper-published snapshot for the DISPLAY ladder whenever it covers more of the book than the
    // local read sees, but MERGE the node's own live order coins into `orders` so My Orders and
    // cancel/own-order actions still work. A full node (whose live read already covers the book, so
    // order count >= price-level count) keeps its authoritative live book untouched.
    try {
      const beaconBook = await tv81BookFromBeacon(marketCode, market, tick);
      if (beaconBook) {
        const liveOrderCount = asks.length + bids.length;
        const beaconLevelCount = beaconBook.bins.asks.length + beaconBook.bins.bids.length;
        if (liveOrderCount === 0 || beaconLevelCount > liveOrderCount) {
          beaconBook.orders = { asks: asks, bids: bids };
          return beaconBook;
        }
      }
    } catch (_) { /* keep the honest live book */ }
    return {
      market: marketCode,
      marketId: market.market_id,
      tickAtoms: tick.toString(),
      orders: { asks: asks, bids: bids },
      bins: { asks: toBins(asks), bids: toBins(bids) },
      bestAskAtoms: bestAsk,
      bestBidAtoms: bestBid,
      spreadAtoms: (bestAsk != null && bestBid != null) ? (BigInt(bestAsk) - BigInt(bestBid)).toString() : null,
      askDepthBaseAtoms: asks.reduce(function (s, x) { return s + BigInt(x.remainingBaseAtoms); }, 0n).toString(),
      bidDepthBaseAtoms: bids.reduce(function (s, x) { return s + BigInt(x.remainingBaseAtoms); }, 0n).toString(),
      excludedInvalidCoins: excluded,
      behavioralClaim: false,
    };
  }

  // ============================================================================================
  // TV81 FBA batch market (BR4, 2026-07-20). The trading CLOB cleared by a Frequent Batch Auction:
  // users SUBMIT order coins to the order covenant; a permissionless keeper CLEARS crossing batches
  // (no shared per-fill coin, so it works from any node incl. the phone). Order state: 2 side(1=BUY,
  // 2=SELL) 3 limit(1e8) 4 size(base DISPLAY) 5 maker 6 refund 7 refundMinCoinage 8 basetok 9 quotetok
  // 10 makerpub 11 escrow(DISPLAY). SELL escrows `size` base; BUY escrows `size*limit/1e8` quote.
  // ============================================================================================
  function tv81FbaCfg(registry) { return (registry && registry.batch_market) || null; }
  function tv81FbaFmt(n) {
    const s = (Math.round(Number(n) * 1e8) / 1e8).toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
    return s === '' || s === '-0' ? '0' : s;
  }
  async function tv81FbaEnsureTracked(registry) {
    const cfg = tv81FbaCfg(registry); if (!cfg) return;
    if (cfg.order_script) await ensureCovenantTracked(cfg.order_address, cfg.order_script, 'tracking the batch order book', 30000);
    if (cfg.result_script) await ensureCovenantTracked(cfg.result_address, cfg.result_script, 'tracking the batch result coin', 30000);
  }
  async function tv81FbaReadBook() {
    const registry = await tv81AppRegistry();
    const cfg = tv81FbaCfg(registry);
    if (!cfg) throw new Error('No FBA batch market configured.');
    await tv81FbaEnsureTracked(registry);
    const base = String(cfg.base_token_id).toLowerCase(), quote = String(cfg.quote_token_id).toLowerCase();
    const tick = BigInt(String(cfg.tick_atoms || '10000'));
    const data = await tv81CoinsAtAddress(String(cfg.order_address).toLowerCase());
    const coins = Array.isArray(data) ? data : (data && Array.isArray(data.coins) ? data.coins : []);
    const orders = [];
    for (const c of coins) {
      if (!c || c.spent) continue;
      try {
        const side = Number(readStatePort(c, 2));
        if (side !== 1 && side !== 2) continue;
        if (String(readStatePort(c, 8) || '').toLowerCase() !== base) continue;
        if (String(readStatePort(c, 9) || '').toLowerCase() !== quote) continue;
        const priceAtoms = BigInt(String(readStatePort(c, 3)));
        const sizeAtoms = tokenDisplayToAtoms8(String(readStatePort(c, 4)));
        if (priceAtoms <= 0n || sizeAtoms <= 0n) continue;
        orders.push({
          coinId: String(c.coinid || ''), side: side === 1 ? 'BID' : 'ASK',
          priceAtoms: priceAtoms.toString(), tickIndex: (priceAtoms / tick).toString(),
          originalBaseAtoms: sizeAtoms.toString(), remainingBaseAtoms: sizeAtoms.toString(),
          currentEscrowAtoms: '0', cumulativeQuoteAtoms: '0',
          makerReceiveAddress: String(readStatePort(c, 5) || ''), createdBlock: Number(c.created) || 0,
        });
      } catch (_) { /* skip malformed */ }
    }
    const asks = orders.filter(o => o.side === 'ASK').sort((a, b) => { const x = BigInt(a.priceAtoms), y = BigInt(b.priceAtoms); return x === y ? 0 : (x < y ? -1 : 1); });
    const bids = orders.filter(o => o.side === 'BID').sort((a, b) => { const x = BigInt(a.priceAtoms), y = BigInt(b.priceAtoms); return x === y ? 0 : (x > y ? -1 : 1); });
    const toBins = (rows) => { const idx = {}, out = []; for (const r of rows) { let b = idx[r.priceAtoms]; if (!b) { b = { priceAtoms: r.priceAtoms, orderCount: 0, baseAtoms: 0n }; idx[r.priceAtoms] = b; out.push(b); } b.orderCount++; b.baseAtoms += BigInt(r.remainingBaseAtoms); } return out.map(b => ({ priceAtoms: b.priceAtoms, orderCount: b.orderCount, baseAtoms: b.baseAtoms.toString() })); };
    const bestAsk = asks.length ? asks[0].priceAtoms : null, bestBid = bids.length ? bids[0].priceAtoms : null;
    let lastPstar = null;
    try { const lp = await tv81FbaLastPrice(); lastPstar = lp; } catch (_) { /* ignore */ }
    return {
      market: 'XWINIWA_WINIWA', marketId: 1, tickAtoms: tick.toString(),
      orders: { asks: asks, bids: bids }, bins: { asks: toBins(asks), bids: toBins(bids) },
      bestAskAtoms: bestAsk, bestBidAtoms: bestBid,
      spreadAtoms: (bestAsk != null && bestBid != null) ? (BigInt(bestAsk) - BigInt(bestBid)).toString() : null,
      askDepthBaseAtoms: asks.reduce((s, x) => s + BigInt(x.remainingBaseAtoms), 0n).toString(),
      bidDepthBaseAtoms: bids.reduce((s, x) => s + BigInt(x.remainingBaseAtoms), 0n).toString(),
      excludedInvalidCoins: 0, behavioralClaim: false, source: 'fba', lastPstarAtoms: lastPstar,
    };
  }
  async function tv81FbaLastPrice() {
    const registry = await tv81AppRegistry();
    const cfg = tv81FbaCfg(registry); if (!cfg) return null;
    const data = await tv81CoinsAtAddress(String(cfg.result_address).toLowerCase());
    const coins = Array.isArray(data) ? data : (data && Array.isArray(data.coins) ? data.coins : []);
    const cur = coins.filter(c => c && !c.spent).sort((a, b) => Number(readStatePort(b, 1)) - Number(readStatePort(a, 1)))[0];
    if (!cur) return null;
    const pstar = String(readStatePort(cur, 20) || '0'), lastp = String(readStatePort(cur, 7) || '0');
    return (pstar !== '0' ? pstar : lastp); // 1e8 atoms
  }
  async function tv81FbaBuildOrder(sideAskBid, priceDisplay, sizeDisplay) {
    const registry = await tv81AppRegistry();
    const cfg = tv81FbaCfg(registry);
    if (!cfg) throw new Error('No FBA batch market configured.');
    const isSell = String(sideAskBid).toUpperCase() === 'ASK';
    const sideCode = isSell ? 2 : 1;
    const tick = BigInt(String(cfg.tick_atoms || '10000'));
    let limit = BigInt(Math.round(Number(priceDisplay) * 1e8));
    // Protective tick rounding: ASK up, BID down (same discipline as the continuous path).
    limit = isSell ? ((limit + tick - 1n) / tick) * tick : (limit / tick) * tick;
    if (limit <= 0n) throw new Error('Price rounds to zero; raise it.');
    const size = tv81FbaFmt(sizeDisplay);
    if (!(Number(size) > 0)) throw new Error('Enter a positive size.');
    const escrowTok = isSell ? cfg.base_token_id : cfg.quote_token_id;
    const escrow = isSell ? size : tv81FbaFmt(Number(size) * (Number(limit) / 1e8));
    if (!(Number(escrow) > 0)) throw new Error('Escrow rounds to zero.');
    const wallet = await fetchTesterWallet();
    const addr = String(wallet.address || '').toLowerCase();
    const pub = await tv81WalletPubkey();
    const st = { 2: String(sideCode), 3: limit.toString(), 4: size, 5: addr, 6: addr,
      7: String(cfg.refund_min_coinage || 20), 8: String(cfg.base_token_id).toLowerCase(),
      9: String(cfg.quote_token_id).toLowerCase(), 10: pub, 11: escrow };
    return {
      kind: 'TV81_FBA_ORDER', side: isSell ? 'ASK' : 'BID',
      disclosure: { quantizedPriceAtoms: limit.toString(), changedByRounding: BigInt(Math.round(Number(priceDisplay) * 1e8)) !== limit },
      escrow: { tokenId: escrowTok, display: escrow },
      sizeDisplay: size, priceDisplay: tv81FbaFmt(Number(limit) / 1e8),
      command: 'send address:' + String(cfg.order_address).toLowerCase() + ' amount:' + escrow
        + ' tokenid:' + String(escrowTok).toLowerCase() + ' state:' + JSON.stringify(st),
    };
  }
  async function tv81FbaPlaceOrderOnChain(plan) {
    if (!plan || plan.kind !== 'TV81_FBA_ORDER') throw new Error('No FBA order to place.');
    const res = await directOrMdsCmd(plan.command, 'submitting the order', 90000);
    const extracted = extractTxidsFromMdsPost(res) || {};
    try {
      if (typeof window.stablesAppendUserActivityRow === 'function') {
        const now = new Date();
        window.stablesAppendUserActivityRow({
          id: 'TV81-FBA-' + (extracted.explorerTxId || String(Date.now())).slice(2, 14), dir: 'out', icon: '↗',
          counterparty: 'Order book (xWiniwa/Winiwa)', category: plan.side === 'ASK' ? 'xWiniwa' : 'Winiwa',
          title: plan.side === 'ASK' ? 'Sell order' : 'Buy order',
          date: now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
          amt: -Math.abs(Number(plan.escrow.display)), ccy: plan.side === 'ASK' ? 'xWiniwa' : 'Winiwa', fee: 0,
          explorerTxId: extracted.explorerTxId || '', pendingTxnId: extracted.pendingTxnId || '', status: 'Pending',
          note: (plan.side === 'ASK' ? 'Sell' : 'Buy') + ' ' + plan.sizeDisplay + ' xWiniwa at ' + plan.priceDisplay + ' Winiwa. Settles at the next batch clear.',
          minimaOnChain: true, localOrigin: true, pendingIncoming: false,
        });
      }
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate([plan.side === 'ASK' ? 'xWiniwa' : 'Winiwa']);
    } catch (_) { /* ignore */ }
    try { if (typeof navigate === 'function') navigate('wallet'); } catch (_) { /* ignore */ }
    return extracted;
  }

  // ---- Direct-take price-time CLOB (PROVEN on-chain 2026-07-21; the trading engine, supersedes FBA) ----
  // A taker spends the maker order coins it crosses and pays EACH maker its OWN limit; a market order is
  // ONE sweep transaction over several orders; the marginal order partial-fills and re-rests. No keeper,
  // no clearing coin, no shared state. Order state ports 2..11; take block: STATE(23) action (1=take,
  // 2=cancel), STATE(30+@INPUT) = order's maker-payment output slot, STATE(40+@INPUT) = base filled.
  // This mirrors the byte-for-byte proven tools/tv81/order-direct.mjs. GOTCHA proven while building it:
  // taker payment coins MUST be sendable (covenant coins the wallet merely tracks fail scripts) — hence
  // gatherSendableUserCoins; and orders are the leading inputs so order i sits at @INPUT=i (pa_i=i).
  function tv81DirectCfg(registry) { return (registry && registry.direct_market) || null; }
  async function tv81DirectEnsureTracked(registry) {
    const cfg = tv81DirectCfg(registry); if (!cfg) return;
    if (cfg.order_script) await ensureCovenantTracked(cfg.order_address, cfg.order_script, 'tracking the order book', 30000);
  }

  // --- Common-book gap-fill (founder-approved design 2026-07-21; slice 2, v0.0.8.63) ---
  // Book sources announce themselves with heartbeat-refreshed pointer coins at the on-chain
  // registry (book_sources block). The app reads the pointers from its OWN node, fetches order
  // blobs from each endpoint, and imports only coins the node doesn't already hold. Blobs are
  // self-certifying (the node validates the MMR proof locally), so sources are interchangeable
  // and untrusted for validity — they can only withhold, never forge.
  function tv81BookSourcesCfg(registry) { return (registry && registry.book_sources) || null; }
  async function tv81EnsureBookRegistryTracked(registry) {
    const cfg = tv81BookSourcesCfg(registry); if (!cfg) return;
    if (cfg.registry_script) await ensureCovenantTracked(cfg.registry_address, cfg.registry_script, 'tracking the book-source registry', 30000);
  }
  function tv81HexToUtf8(hex) {
    try {
      const s = String(hex || '').replace(/^0x/i, '');
      let out = '';
      for (let i = 0; i + 1 < s.length; i += 2) out += String.fromCharCode(parseInt(s.slice(i, i + 2), 16));
      return decodeURIComponent(escape(out));
    } catch (_) { return String(hex || ''); }
  }
  // Fetch text from an arbitrary URL on every surface: the standalone WebView's https origin
  // blocks plain-http fetch (mixed content — proven during the provider spike), so the native
  // StablesNative.fetchText bridge carries it there; the web preview uses plain fetch. The
  // native callback is single-slot (window.stablesNativeTextFetched), so a dispatcher hands
  // responses for OUR urls to the pending promise and everything else to the original handler.
  const _tv81NativeFetchPending = {};
  function tv81FetchTextAny(url, timeoutMs) {
    const native = window.StablesNative && typeof window.StablesNative.fetchText === 'function';
    if (!native) {
      return fetch(url, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      });
    }
    if (!window.__TV81_NATIVE_FETCH_HOOKED__) {
      window.__TV81_NATIVE_FETCH_HOOKED__ = true;
      const original = window.stablesNativeTextFetched;
      window.stablesNativeTextFetched = function (u, body, error) {
        const pending = _tv81NativeFetchPending[u];
        if (pending) {
          delete _tv81NativeFetchPending[u];
          clearTimeout(pending.tid);
          const err = String(error || '').trim();
          if (err) pending.reject(new Error(err)); else pending.resolve(String(body || ''));
          return;
        }
        if (typeof original === 'function') original(u, body, error);
      };
    }
    return new Promise(function (resolve, reject) {
      const tid = setTimeout(function () {
        delete _tv81NativeFetchPending[url];
        reject(new Error('native fetch timeout'));
      }, timeoutMs || 20000);
      _tv81NativeFetchPending[url] = { resolve: resolve, reject: reject, tid: tid };
      try { window.StablesNative.fetchText(url); } catch (e) {
        delete _tv81NativeFetchPending[url]; clearTimeout(tid); reject(e);
      }
    });
  }
  // Live pointers from the local node: tag matches, http transport, deduped per owner (newest wins).
  async function tv81ReadBookSources() {
    const registry = await tv81AppRegistry();
    const cfg = tv81BookSourcesCfg(registry); if (!cfg) return [];
    const data = await tv81CoinsAtAddress(String(cfg.registry_address).toLowerCase());
    const coins = Array.isArray(data) ? data : (data && Array.isArray(data.coins) ? data.coins : []);
    const portOf = function (c, p) { const st = c.state || []; for (let i = 0; i < st.length; i++) if (Number(st[i].port) === p) return st[i].data; return null; };
    const byOwner = {};
    coins.filter(function (c) { return c && !c.spent && String(portOf(c, 0)) === String(cfg.pointer_tag || '21'); }).forEach(function (c) {
      const owner = String(portOf(c, 10) || '');
      const created = Number(c.created || 0);
      if (!byOwner[owner] || created > byOwner[owner].created) {
        byOwner[owner] = { endpoint: tv81HexToUtf8(portOf(c, 1)), since: String(portOf(c, 2) || '0'), transport: String(portOf(c, 3) || '1'), owner: owner, created: created, coinid: c.coinid };
      }
    });
    return Object.keys(byOwner).map(function (k) { return byOwner[k]; }).filter(function (p) { return p.transport === '1' && /^https?:\/\//i.test(p.endpoint); });
  }
  // Import every order coin the local node doesn't hold, from the first sources that answer.
  // extraSources (optional): endpoints tried FIRST — the manual "Reconstruct book" control passes
  // the user-entered host here, ahead of chain-discovered sources.
  async function tv81BookGapFill(extraSources) {
    const status = { at: Date.now(), sources: 0, reachable: 0, held: 0, imported: 0, failed: 0 };
    try {
      const extras = (extraSources || []).filter(function (u) { return /^https?:\/\//i.test(String(u || '')); })
        .map(function (u) { return { endpoint: String(u).trim(), since: '0', transport: '1', owner: 'manual' }; });
      const sources = extras.concat(await tv81ReadBookSources());
      status.sources = sources.length;
      const seen = {};
      for (let i = 0; i < sources.length && i < 4; i++) {
        let payload = null;
        try { payload = JSON.parse(await tv81FetchTextAny(sources[i].endpoint, 20000)); } catch (e) {
          try { console.log('[STABLES-BOOK] source unreachable ' + sources[i].endpoint + ': ' + ((e && e.message) || e)); } catch (_) {}
          continue;
        }
        status.reachable++;
        const coins = (payload && payload.coins) || [];
        for (let j = 0; j < coins.length; j++) {
          const entry = coins[j];
          if (!entry || !entry.coinid || !entry.blob || seen[entry.coinid]) continue;
          seen[entry.coinid] = true;
          // The served order-coin ids double as the reader's out-of-window merge list (2026-07-22
          // phone law: `coins address:` only scans the UNPRUNED chain, so held orders older than
          // this node's pruning window are invisible to the scan even though the node provably
          // holds them; they are merged into the book by coinid instead).
          try {
            window.__TV81_BOOK_SOURCE_COINS__ = window.__TV81_BOOK_SOURCE_COINS__ || [];
            if (window.__TV81_BOOK_SOURCE_COINS__.indexOf(String(entry.coinid)) < 0) window.__TV81_BOOK_SOURCE_COINS__.push(String(entry.coinid));
          } catch (_) { /* ignore */ }
          try {
            const local = await mdsCmdData('coins coinid:' + entry.coinid);
            const row = Array.isArray(local) ? local[0] : local;
            const held = Array.isArray(local) ? local.length > 0 : !!(local && local.coinid);
            if (held) {
              status.held++;
              // Diagnostic for the phone partial-book case (2026-07-22): is the held row spent,
              // at the engine address, and does it carry state? One line per coin, in logcat.
              try { console.log('[STABLES-BOOK] held ' + String(entry.coinid).slice(0, 14) + ' spent=' + (row && row.spent) + ' addr=' + String((row && row.address) || '').slice(0, 14) + ' state=' + (row && Array.isArray(row.state) ? row.state.length : 'none') + ' created=' + (row && row.created)); } catch (_) { /* ignore */ }
              continue;
            }
          } catch (_) { /* fall through to import */ }
          try {
            await directOrMdsCmd('coinimport track:true data:' + entry.blob, 'importing an order coin proof', 30000);
            status.imported++;
          } catch (e) { status.failed++; }
        }
      }
      try { console.log('[STABLES-BOOK] gap-fill: sources=' + status.sources + ' reachable=' + status.reachable + ' held=' + status.held + ' imported=' + status.imported + ' failed=' + status.failed); } catch (_) {}
    } catch (e) {
      status.error = String((e && e.message) || e);
      try { console.log('[STABLES-BOOK] gap-fill error: ' + status.error); } catch (_) {}
    }
    try { window.__STABLES_BOOK_GAPFILL__ = status; } catch (_) {}
    return status;
  }
  window.tv81BookGapFill = tv81BookGapFill;
  window.tv81ReadBookSources = tv81ReadBookSources;
  // Manual "Reconstruct book in full" (founder-approved control): tracks the covenants, pulls
  // from the user-entered source first (falls back to chain-discovered sources), re-renders the
  // book. Quiet on success per the founder feedback laws (the refreshed book IS the feedback);
  // an honest toast only when nothing was reachable.
  window.tv81ReconstructBook = async function () {
    const field = document.getElementById('tv81BookSourceUrl');
    const button = document.getElementById('tv81ReconstructBtn');
    const statusEl = document.getElementById('tv81ReconstructStatus');
    const say = function (t) { if (statusEl) statusEl.textContent = t; };
    const customUrl = field && String(field.value || '').trim();
    if (button) { button.disabled = true; button.textContent = 'Reconstructing…'; }
    say('Preparing (tracking the order covenant)…');
    try {
      const registry = await tv81AppRegistry();
      await tv81DirectEnsureTracked(registry);
      await tv81EnsureBookRegistryTracked(registry);
      // R2: the ON-CHAIN ANCHOR is the primary reconstruction path; HTTP sources are the
      // accelerator/fallback (always tried when the user entered a URL, else only if the
      // anchor pass was not READY).
      say('Reading the on-chain book snapshot…');
      try { await tv81AnchorEnsureTracked(registry); } catch (_) {}
      const a = await tv81AnchorGapFill();
      let s = null;
      if (customUrl || a.state !== 'READY_WITH_COVERAGE') {
        say('Fetching order coins from book sources (can take ~30s per unreachable source)…');
        s = await tv81BookGapFill(customUrl ? [customUrl] : []);
      } else {
        s = { sources: 0, reachable: 0, held: a.held, imported: a.imported, failed: a.failed, anchor: true };
      }
      if (s && s.sources > 0 && s.reachable === 0) {
        say('');
        if (typeof showToast === 'function') showToast('No book source reachable. Check the source URL or try again later.');
      } else {
        say(s ? (s.anchor
          // Say what was REPAIRED, not raw coin counts. "16 already held" was read as "16 orders in
          // the book" (founder, 2026-07-26) when it meant coin proofs across every pair and
          // generation, of which only the current market's become rows. Nothing-to-do is the common
          // case and should say so plainly; only an actual import is worth a number.
          ? ('Done: on-chain snapshot verified. ' + (s.imported
              ? (s.imported + ' missing proof' + (s.imported === 1 ? '' : 's') + ' recovered'
                 + (s.failed ? ', ' + s.failed + ' stale dropped' : '') + '. Refreshing the book…')
              : ('Nothing was missing' + (s.failed ? ', ' + s.failed + ' stale dropped' : '') + '. Refreshing the book…')))
          : ('Done: ' + s.reachable + ' source(s) read, ' + s.held + ' already held, ' + s.imported + ' imported' + (s.failed ? ', ' + s.failed + ' failed' : '') + '. Refreshing the book…')) : 'Refreshing the book…');
        try { await tv81RefreshOrderBookPanel().catch(function () { /* best-effort */ }); } catch (_) { /* display refresh best-effort */ }
        setTimeout(function () { say(''); }, 12000);
      }
    } catch (e) {
      say('');
      if (typeof showToast === 'function') showToast('Reconstruct failed: ' + ((e && e.message) || e));
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Reconstruct book'; }
    }
  };
  // ================= ROLLING ON-CHAIN BOOK ANCHOR — R1 DARK READER =================
  // Founder-approved integration (ANCHOR_APP_INTEGRATION_DESIGN.md, 2026-07-23). R1 is
  // OBSERVATION ONLY: track the head/page covenants at boot, forward-capture snapshots via
  // ordinary sync, validate them fully (page hash + pages_root + bounded decode), and report in
  // logcat + window.__STABLES_ANCHOR__. NO import, NO book merge, NO UI (that is R2). All
  // validation is local; a publisher can only withhold, never forge.
  function tv81AnchorCfg(registry) { return (registry && registry.book_anchor) || null; }
  const TV81_ANCHOR_GENERATION = '0x54563931'; // "TV91": live V9 generation only.
  function tv81AnchorGeneration(cfg) {
    return String((cfg && cfg.generation_tag) || TV81_ANCHOR_GENERATION).toLowerCase();
  }
  async function tv81AnchorEnsureTracked(registry) {
    const cfg = tv81AnchorCfg(registry); if (!cfg) return false;
    await ensureCovenantTracked(cfg.page_address, cfg.page_script, 'tracking the book-anchor page covenant', 30000);
    await ensureCovenantTracked(cfg.head_address, cfg.head_script, 'tracking the book-anchor head covenant', 30000);
    return true;
  }
  function tv81AnchorPort(coin, p) {
    const st = (coin && coin.state) || [];
    for (let i = 0; i < st.length; i++) if (Number(st[i].port) === p) return st[i].data;
    return null;
  }
  // Bounded binary page decode: [u16 count] then per record [32B coinid][u16 blobLen][blob].
  function tv81AnchorDecodePage(payloadHex, bounds) {
    const hex = String(payloadHex || '').replace(/^0x/i, '');
    if (!/^([0-9a-fA-F]{2})+$/.test(hex)) throw new Error('bad page payload hex');
    if (hex.length / 2 > (bounds.page_bytes || 32768)) throw new Error('page byte limit');
    let off = 0;
    const need = function (n) { if (off + n > hex.length) throw new Error('truncated page'); };
    need(4); const count = parseInt(hex.substr(off, 4), 16); off += 4;
    if (!(count >= 1 && count <= (bounds.page_orders || 16))) throw new Error('bad record count');
    const seen = {}; const records = [];
    for (let i = 0; i < count; i++) {
      need(64); const coinid = '0x' + hex.substr(off, 64); off += 64;
      need(4); const blen = parseInt(hex.substr(off, 4), 16); off += 4;
      if (!(blen >= 1 && blen <= 4096)) throw new Error('blob size out of range');
      need(blen * 2); const blob = '0x' + hex.substr(off, blen * 2); off += blen * 2;
      const key = coinid.toLowerCase();
      if (seen[key]) throw new Error('duplicate coinid in page');
      seen[key] = true;
      records.push({ coinid: coinid, blob: blob });
    }
    if (off !== hex.length) throw new Error('trailing bytes');
    return records;
  }
  const tv81AnchorU16 = function (n) { return (n & 0xFFFF).toString(16).padStart(4, '0'); };
  async function tv81AnchorPagesRoot(snapshotId, pageHashes, orderCount) {
    let hex = String(snapshotId).replace(/^0x/i, '') + tv81AnchorU16(pageHashes.length) + tv81AnchorU16(orderCount);
    for (let i = 0; i < pageHashes.length; i++) hex += String(pageHashes[i]).replace(/^0x/i, '');
    return tv81Sha256('0x' + hex);
  }
  // Encode a page payload (mirror of tv81AnchorDecodePage): [u16 count] then per record
  // [32B coinid][u16 blobLen][blob]. Returns { payloadHex, pageHash } (hash via the same
  // WebCrypto SHA-256 the reader uses). Used by the opt-in in-app publisher (R4).
  async function tv81AnchorEncodePage(records) {
    let hex = tv81AnchorU16(records.length);
    for (let i = 0; i < records.length; i++) {
      const cid = String(records[i].coinid).replace(/^0x/i, '');
      const blob = String(records[i].blob).replace(/^0x/i, '');
      if (cid.length !== 64) throw new Error('coinid must be 32 bytes');
      if (blob.length < 2 || blob.length / 2 > 4096) throw new Error('blob size out of range');
      hex += cid + tv81AnchorU16(blob.length / 2) + blob;
    }
    const payloadHex = '0x' + hex.toUpperCase();
    const pageHash = await tv81Sha256(payloadHex);
    return { payloadHex: payloadHex, pageHash: pageHash, bytes: hex.length / 2 };
  }
  // Read + validate the newest complete in-age snapshot. Dark: returns a status object and logs;
  // touches nothing else. States follow D22: READY_WITH_COVERAGE | DISAGREEMENT_OR_INCOMPLETE |
  // PROOF_UNAVAILABLE (never an invented empty book).
  async function tv81AnchorReadSnapshot() {
    const registry = await tv81AppRegistry();
    const cfg = tv81AnchorCfg(registry);
    if (!cfg) return { state: 'PROOF_UNAVAILABLE', reason: 'no anchor config' };
    const bounds = cfg.bounds || {};
    const generation = tv81AnchorGeneration(cfg);
    const tipData = await mdsCmdData('status');
    const tip = Number(tipData && tipData.chain && tipData.chain.block);
    const rowsOf = function (d) { return Array.isArray(d) ? d : (d && Array.isArray(d.coins) ? d.coins : (d ? [d] : [])); };
    const headData = await tv81CoinsAtAddress(String(cfg.head_address).toLowerCase());
    const candidateHeads = rowsOf(headData)
      .filter(function (c) { return c && !c.spent && String(tv81AnchorPort(c, 0)) === '2'; })
      .filter(function (c) { return tip - Number(c.created) <= (bounds.max_head_age_blocks || 900); });
    const heads = candidateHeads
      .filter(function (c) { return String(tv81AnchorPort(c, 2) || '').toLowerCase() === generation; })
      .sort(function (a, b) { return Number(b.created) - Number(a.created); })
      .slice(0, bounds.max_heads_scanned || 16);
    if (!heads.length) return {
      state: 'PROOF_UNAVAILABLE',
      reason: candidateHeads.length ? 'no in-age V9 head captured yet' : 'no in-age head captured yet',
      generation: generation,
      rejectedGenerationHeads: candidateHeads.length,
      tip: tip
    };
    const pageData = await tv81CoinsAtAddress(String(cfg.page_address).toLowerCase());
    const pagesByCoinId = {};
    rowsOf(pageData).filter(function (c) {
      return c && !c.spent
        && String(tv81AnchorPort(c, 0)) === '1'
        && String(tv81AnchorPort(c, 2) || '').toLowerCase() === generation;
    })
      .forEach(function (c) { pagesByCoinId[c.coinid.toLowerCase()] = c; });
    let lastReason = 'no complete valid snapshot';
    for (let h = 0; h < heads.length; h++) {
      const head = heads[h];
      try {
        const snapId = tv81AnchorPort(head, 4);
        const pageCount = Number(tv81AnchorPort(head, 5));
        const orderCount = Number(tv81AnchorPort(head, 6));
        const wantRoot = String(tv81AnchorPort(head, 7) || '').toLowerCase();
        const idsHex = String(tv81AnchorPort(head, 20) || '').replace(/^0x/i, '');
        if (!(pageCount >= 1 && pageCount <= (bounds.max_pages || 64))) throw new Error('page count bounds');
        if (idsHex.length !== pageCount * 64) throw new Error('page id list length');
        const pageHashes = []; let total = 0; let missing = null;
        for (let i = 0; i < pageCount; i++) {
          const id = '0x' + idsHex.substr(i * 64, 64);
          const pc = pagesByCoinId[id.toLowerCase()];
          if (!pc) { missing = id; break; }
          if (String(tv81AnchorPort(pc, 4) || '').toLowerCase() !== String(snapId || '').toLowerCase()) {
            throw new Error('page snapshot id mismatch');
          }
          const pageHash = String(tv81AnchorPort(pc, 8) || '');
          const payload = tv81AnchorPort(pc, 20);
          const digest = await tv81Sha256(payload);
          if (digest.toLowerCase() !== pageHash.toLowerCase()) throw new Error('page hash mismatch');
          total += tv81AnchorDecodePage(payload, bounds).length;
          pageHashes.push(pageHash);
        }
        if (missing) { lastReason = 'missing page ' + missing.slice(0, 14); continue; }
        if (total !== orderCount) throw new Error('order count mismatch');
        const root = await tv81AnchorPagesRoot(snapId, pageHashes, total);
        if (root.toLowerCase() !== wantRoot) throw new Error('pages root mismatch');
        return { state: 'READY_WITH_COVERAGE', headCoin: head.coinid, headAge: tip - Number(head.created), pageCount: pageCount, orderCount: total, snapshotId: snapId, generation: generation, tip: tip };
      } catch (e) { lastReason = String((e && e.message) || e); }
    }
    return { state: 'DISAGREEMENT_OR_INCOMPLETE', reason: lastReason, headsScanned: heads.length, tip: tip };
  }
  window.tv81AnchorReadSnapshot = tv81AnchorReadSnapshot;
  window.tv81AnchorEnsureTracked = tv81AnchorEnsureTracked;
  // ---- R2: the anchor feeds the VISIBLE book. Validate the newest snapshot, import any order
  // proof this node lacks (same trusted primitive as HTTP gap-fill: the node verifies each blob
  // against its own chain), and merge every snapshot coin id into __TV81_BOOK_SOURCE_COINS__ —
  // the existing held-order merge list the book reader already consumes (v0.0.8.72 law). The
  // anchor is now the PRIMARY availability path; HTTP sources remain a manual accelerator.
  async function tv81AnchorGapFill() {
    const status = { at: Date.now(), state: 'PROOF_UNAVAILABLE', imported: 0, held: 0, failed: 0, merged: 0 };
    try {
      const registry = await tv81AppRegistry();
      const cfg = tv81AnchorCfg(registry);
      if (!cfg) return status;
      const snap = await tv81AnchorReadSnapshot();
      status.state = snap.state;
      status.headAge = snap.headAge;
      if (snap.state !== 'READY_WITH_COVERAGE') {
        try { window.__STABLES_ANCHOR__ = Object.assign({}, snap, { at: Date.now() }); } catch (_) {}
        return status;
      }
      // Re-resolve the winning head's pages to get the records (the read validated them already).
      const bounds = cfg.bounds || {};
      // Faucet coins ride in the snapshot (faucet-proof extension) but are NOT book orders — recognise
      // them by the faucet covenant address so they are imported (Winiwa claimable on a fresh node)
      // yet kept out of the book source list.
      const faucetAddr = String(((registry || {}).faucet || {}).address || '').toLowerCase();
      // Vault coins ride along too (vault-proof extension): imported so a fresh node can MINT, but
      // recognised by the vault covenant address so they never enter the book source list.
      const vaultAddr = String(((registry || {}).xwiniwa_vault || {}).address || '').toLowerCase();
      const headData = await mdsCmdData('coins coinid:' + snap.headCoin);
      const head = Array.isArray(headData) ? headData[0] : headData;
      const idsHex = String(tv81AnchorPort(head, 20) || '').replace(/^0x/i, '');
      for (let i = 0; i < Number(tv81AnchorPort(head, 5)); i++) {
        const pid = '0x' + idsHex.substr(i * 64, 64);
        const pcData = await mdsCmdData('coins coinid:' + pid);
        const pc = Array.isArray(pcData) ? pcData[0] : pcData;
        if (!pc) continue;
        const records = tv81AnchorDecodePage(tv81AnchorPort(pc, 20), bounds);
        for (let r = 0; r < records.length; r++) {
          const rec = records[r];
          let atFaucet = false;
          let atVault = false;
          try {
            const local = await mdsCmdData('coins coinid:' + rec.coinid);
            const localCoin = Array.isArray(local) ? local[0] : local;
            const held = !!(localCoin && localCoin.coinid);
            if (held && faucetAddr && String(localCoin.address || '').toLowerCase() === faucetAddr) atFaucet = true;
            if (held && vaultAddr && String(localCoin.address || '').toLowerCase() === vaultAddr) atVault = true;
            if (held) tv81NoteSnapshotCoin(localCoin.address, localCoin.coinid);
            if (held) {
              status.held++;
            } else {
              await directOrMdsCmd('coinimport track:true data:' + rec.blob, 'importing a proof from the on-chain snapshot', 30000);
              status.imported++;
              // Post-import: classify the freshly imported coin so faucet proofs are counted, not booked.
              try {
                const after = await mdsCmdData('coins coinid:' + rec.coinid);
                const ac = Array.isArray(after) ? after[0] : after;
                if (ac && faucetAddr && String(ac.address || '').toLowerCase() === faucetAddr) atFaucet = true;
                if (ac && vaultAddr && String(ac.address || '').toLowerCase() === vaultAddr) atVault = true;
                if (ac) tv81NoteSnapshotCoin(ac.address, ac.coinid);
              } catch (_) {}
            }
          } catch (_) { status.failed++; continue; /* spent/stale records fail import by design and drop */ }
          if (atFaucet) { status.faucetProof = (status.faucetProof || 0) + 1; continue; }
          if (atVault) { status.vaultProof = (status.vaultProof || 0) + 1; continue; }
          try {
            window.__TV81_BOOK_SOURCE_COINS__ = window.__TV81_BOOK_SOURCE_COINS__ || [];
            if (window.__TV81_BOOK_SOURCE_COINS__.indexOf(String(rec.coinid)) < 0) { window.__TV81_BOOK_SOURCE_COINS__.push(String(rec.coinid)); status.merged++; }
          } catch (_) {}
        }
      }
      try { window.__STABLES_ANCHOR__ = Object.assign({}, snap, { at: Date.now(), gapfill: { imported: status.imported, held: status.held, failed: status.failed, merged: status.merged, faucetProof: status.faucetProof || 0, vaultProof: status.vaultProof || 0 } }); } catch (_) {}
      try { console.log('[STABLES-ANCHOR] gap-fill: state=' + status.state + ' merged=' + status.merged + ' imported=' + status.imported + ' held=' + status.held + ' failed=' + status.failed + ' faucetProof=' + (status.faucetProof || 0) + ' vaultProof=' + (status.vaultProof || 0)); } catch (_) {}
    } catch (e) {
      status.error = String((e && e.message) || e);
      try { console.log('[STABLES-ANCHOR] gap-fill error: ' + status.error); } catch (_) {}
    }
    return status;
  }
  window.tv81AnchorGapFill = tv81AnchorGapFill;

  // ---- R4: OPT-IN in-app publisher. When the "Publish book snapshots" setting is ON, the app
  // publishes a snapshot of the live book to the anchor covenants (one page + head), funded by a
  // trace of the wallet's own Winiwa. Default OFF. Single-page (<=16 orders) in this version; a
  // deep book publishes its first page (a fuller multi-page publisher is a follow-up). Posts real
  // transactions — same txn-builder idiom as order placement.
  const TV81_ANCHOR_PUBLISH_PREF = 'stables_anchor_publish_enabled';
  function tv81AnchorPublishEnabled() {
    if (!releaseFeatureAllowed('trade')) return false;
    try { return localStorage.getItem(TV81_ANCHOR_PUBLISH_PREF) === '1'; } catch (_) { return false; }
  }
  let _tv81AnchorPublishing = false;
  async function tv81AnchorPublishSnapshot() {
    if (!releaseRequireFeature('trade', 'Order book publishing')) return { error: 'release feature deferred' };
    if (_tv81AnchorPublishing) return { skipped: 'already publishing' };
    _tv81AnchorPublishing = true;
    try {
      const registry = await tv81AppRegistry();
      const cfg = tv81AnchorCfg(registry);
      const dcfg = tv81DirectCfg(registry);
      if (!cfg || !dcfg) return { error: 'no anchor/market config' };
      const bounds = cfg.bounds || {};
      const rowsOf = function (d) { return Array.isArray(d) ? d : (d && Array.isArray(d.coins) ? d.coins : (d ? [d] : [])); };
      // live order coins (state port 2 present, unspent)
      const orderData = await tv81CoinsAtAddress(String(dcfg.order_address).toLowerCase());
      const live = rowsOf(orderData).filter(function (c) { return c && !c.spent && (c.state || []).some(function (s) { return Number(s.port) === 2; }); });
      const pageMax = bounds.page_orders || 16;
      const records = [];
      // FAUCET-PROOF EXTENSION (V9, dependency-free law): carry the faucet pool + state coin proofs
      // in the snapshot so a FRESH node can CLAIM Winiwa with zero VPS. The reader imports every
      // record; faucet coins are recognised by their covenant address and kept OUT of the book list
      // (see tv81AnchorGapFill). Reserve up to 2 record slots; snapshots stay publishable even when
      // the book is empty (faucet-only snapshot).
      let faucetRecs = 0;
      try {
        const fa = String(((registry || {}).faucet || {}).address || '').toLowerCase();
        const fWin = String(dcfg.quote_token_id).toLowerCase();
        if (fa) {
          const fcoins = rowsOf(await tv81CoinsAtAddress(fa)).filter(function (c) { return c && !c.spent; });
          const fpool = fcoins.find(function (c) { return String(c.tokenid || '').toLowerCase() === fWin; });
          const fstate = fcoins.find(function (c) { return String(c.tokenid || '').toLowerCase() === '0x00' && (c.state || []).length; });
          const flist = [fpool, fstate];
          for (let fi = 0; fi < flist.length; fi++) {
            const fc = flist[fi];
            if (!fc) continue;
            const ex = await mdsCmdData('coinexport coinid:' + fc.coinid);
            const blob = (ex && ex.data) ? ex.data : ex;
            if (typeof blob === 'string' && blob.length > 10) { records.push({ coinid: fc.coinid, blob: blob }); faucetRecs++; }
          }
        }
      } catch (_) { /* faucet proof is best-effort; a book-only snapshot is still valid */ }
      // VAULT-PROOF EXTENSION (2026-07-26, founder report: "there is a problem with the minting").
      // Minting refused with "The vault balance state coin is not visible yet" on BOTH peers, because
      // the vault's coins were created at deployment and are days older than the ~1,080-block unpruned
      // window: a node that was not tracking the vault back then cannot see them, and there is no
      // per-coin network fetch. The faucet had exactly this problem and the snapshot solved it; the
      // vault was simply never added. Carry the vault's balance-state, reserve and pool coins too, so
      // a fresh node can MINT as well as CLAIM with zero hosted services. Same shape as above: the
      // reader imports every record and classifies by covenant address, keeping these out of the book.
      let vaultRecs = 0;
      try {
        const va = String(((registry || {}).xwiniwa_vault || {}).address || '').toLowerCase();
        if (va) {
          const vcoins = rowsOf(await tv81CoinsAtAddress(va)).filter(function (c) { return c && !c.spent; });
          for (let vi = 0; vi < vcoins.length; vi++) {
            const ex = await mdsCmdData('coinexport coinid:' + vcoins[vi].coinid);
            const blob = (ex && ex.data) ? ex.data : ex;
            if (typeof blob === 'string' && blob.length > 10) { records.push({ coinid: vcoins[vi].coinid, blob: blob }); vaultRecs++; }
          }
        }
      } catch (_) { /* vault proof is best-effort, like the faucet proof */ }
      const capped = live.slice(0, Math.max(0, pageMax - faucetRecs - vaultRecs));
      for (let i = 0; i < capped.length; i++) {
        const ex = await mdsCmdData('coinexport coinid:' + capped[i].coinid);
        const blob = (ex && ex.data) ? ex.data : ex;
        if (typeof blob === 'string' && blob.length > 10) records.push({ coinid: capped[i].coinid, blob: blob });
      }
      if (!records.length) return { skipped: 'nothing to publish (no orders, no faucet coins)' };
      const page = await tv81AnchorEncodePage(records);
      const pub = await tv81WalletPubkey();
      const wallet = await fetchTesterWallet();
      const dust = '0.000001';
      const WINIWA = String(dcfg.quote_token_id).toLowerCase();
      // pick a short-decimal Winiwa funding coin (RPC 34-sig-digit precision law)
      const fundData = await mdsCmdData('coins relevant:true sendable:true tokenid:' + WINIWA);
      const funds = rowsOf(fundData).filter(function (c) {
        if (!c || c.spent || (c.state || []).length) return false;
        const amt = String(c.tokenamount != null ? c.tokenamount : c.amount);
        return (amt.split('.')[1] || '').length <= 12 && Number(amt) >= 0.001;
      }).sort(function (a, b) { return Number(a.tokenamount || a.amount) - Number(b.tokenamount || b.amount); });
      if (!funds.length) return { error: 'no clean Winiwa funding coin' };
      const fund = funds[0];
      const fundAmt = String(fund.tokenamount != null ? fund.tokenamount : fund.amount);
      const change = tv81FbaFmt(Number(fundAmt) - Number(dust));
      const gen = tv81AnchorGeneration(cfg), reghash = '0x' + '00'.repeat(32); // V9 generation tag "TV91" (was "TV81" 0x54563831)
      const snapId = '0x' + (BigInt(Date.now()) * 1000n).toString(16).padStart(64, '0').slice(-64).toUpperCase();
      // ---- page txn ----
      const pageTxn = 'stables_anchor_page';
      try { await directOrMdsCmd('txndelete id:' + pageTxn, 'clearing draft', 15000); } catch (_) {}
      const pSteps = ['txncreate id:' + pageTxn,
        'txninput id:' + pageTxn + ' coinid:' + fund.coinid,
        'txnoutput id:' + pageTxn + ' amount:' + dust + ' address:' + String(cfg.page_address).toLowerCase() + ' tokenid:' + WINIWA + ' storestate:true',
        'txnoutput id:' + pageTxn + ' amount:' + change + ' address:' + wallet.address + ' tokenid:' + WINIWA + ' storestate:false'];
      const pState = { 0: '1', 1: cfg.schema_page, 2: gen, 3: reghash, 4: snapId, 5: '0', 6: '1', 7: String(records.length), 8: page.pageHash, 10: pub, 20: page.payloadHex };
      Object.keys(pState).forEach(function (p) { pSteps.push('txnstate id:' + pageTxn + ' port:' + p + ' value:' + pState[p]); });
      await directOrMdsCmdBatch(pSteps, 'building the book snapshot page', 120000);
      await directOrMdsCmd('txnbasics id:' + pageTxn, 'funding the snapshot page', 120000);
      await directOrMdsCmd('txnsign id:' + pageTxn + ' publickey:auto', 'signing the snapshot page', 120000);
      const pv = (mdsPayload(await directOrMdsCmd('txncheck id:' + pageTxn, 'validating the page', 90000)) || {}).valid || {};
      if (!(pv.scripts && pv.basic && pv.mmrproofs)) return { error: 'page validation failed', valid: pv };
      await directOrMdsCmd('txnpost id:' + pageTxn + ' txndelete:true', 'posting the snapshot page', 90000);
      // ---- wait for the page coin to confirm, then head ----
      let pageCoinId = null;
      for (let t = 0; t < 30 && !pageCoinId; t++) {
        await new Promise(function (r) { setTimeout(r, 6000); });
        const pd = rowsOf(await tv81CoinsAtAddress(String(cfg.page_address).toLowerCase()));
        const hit = pd.find(function (c) { return c && !c.spent && (c.state || []).some(function (s) { return Number(s.port) === 8 && String(s.data).toLowerCase() === page.pageHash.toLowerCase(); }); });
        if (hit) pageCoinId = hit.coinid;
      }
      if (!pageCoinId) return { error: 'page not confirmed in time' };
      const pagesRoot = await tv81AnchorPagesRoot(snapId, [page.pageHash], records.length);
      const tipData = await mdsCmdData('status');
      const tip = Number(tipData && tipData.chain && tipData.chain.block) || 0;
      const fund2Data = await mdsCmdData('coins relevant:true sendable:true tokenid:' + WINIWA);
      const funds2 = rowsOf(fund2Data).filter(function (c) {
        if (!c || c.spent || (c.state || []).length) return false;
        const amt = String(c.tokenamount != null ? c.tokenamount : c.amount);
        return (amt.split('.')[1] || '').length <= 12 && Number(amt) >= 0.001;
      }).sort(function (a, b) { return Number(a.tokenamount || a.amount) - Number(b.tokenamount || b.amount); });
      if (!funds2.length) return { error: 'no funding coin for head', pageCoinId: pageCoinId };
      const fund2 = funds2[0];
      const fund2Amt = String(fund2.tokenamount != null ? fund2.tokenamount : fund2.amount);
      const change2 = tv81FbaFmt(Number(fund2Amt) - Number(dust));
      const headTxn = 'stables_anchor_head';
      try { await directOrMdsCmd('txndelete id:' + headTxn, 'clearing draft', 15000); } catch (_) {}
      const hSteps = ['txncreate id:' + headTxn,
        'txninput id:' + headTxn + ' coinid:' + fund2.coinid,
        'txnoutput id:' + headTxn + ' amount:' + dust + ' address:' + String(cfg.head_address).toLowerCase() + ' tokenid:' + WINIWA + ' storestate:true',
        'txnoutput id:' + headTxn + ' amount:' + change2 + ' address:' + wallet.address + ' tokenid:' + WINIWA + ' storestate:false'];
      const hState = { 0: '2', 1: cfg.schema_head, 2: gen, 3: reghash, 4: snapId, 5: '1', 6: String(records.length), 7: pagesRoot, 8: String(tip), 10: pub, 20: pageCoinId };
      Object.keys(hState).forEach(function (p) { hSteps.push('txnstate id:' + headTxn + ' port:' + p + ' value:' + hState[p]); });
      await directOrMdsCmdBatch(hSteps, 'building the book snapshot head', 120000);
      await directOrMdsCmd('txnbasics id:' + headTxn, 'funding the snapshot head', 120000);
      await directOrMdsCmd('txnsign id:' + headTxn + ' publickey:auto', 'signing the snapshot head', 120000);
      const hv = (mdsPayload(await directOrMdsCmd('txncheck id:' + headTxn, 'validating the head', 90000)) || {}).valid || {};
      if (!(hv.scripts && hv.basic && hv.mmrproofs)) return { error: 'head validation failed', valid: hv, pageCoinId: pageCoinId };
      await directOrMdsCmd('txnpost id:' + headTxn + ' txndelete:true', 'posting the snapshot head', 90000);
      try { console.log('[STABLES-ANCHOR] published snapshot: ' + records.length + ' orders, page ' + pageCoinId.slice(0, 14)); } catch (_) {}
      return { published: true, orders: records.length, pageCoinId: pageCoinId, snapshotId: snapId };
    } catch (e) {
      try { console.log('[STABLES-ANCHOR] publish error: ' + ((e && e.message) || e)); } catch (_) {}
      return { error: String((e && e.message) || e) };
    } finally { _tv81AnchorPublishing = false; }
  }
  window.tv81AnchorPublishSnapshot = tv81AnchorPublishSnapshot;
  window.tv81AnchorPublishEnabled = tv81AnchorPublishEnabled;
  window.tv81SetAnchorPublish = function (on) {
    if (on && !releaseRequireFeature('trade', 'Order book publishing')) {
      try { localStorage.setItem(TV81_ANCHOR_PUBLISH_PREF, '0'); } catch (_) { /* ignore */ }
      const blockedEl = document.getElementById('tv81PublishToggle');
      if (blockedEl) blockedEl.checked = false;
      return;
    }
    try { localStorage.setItem(TV81_ANCHOR_PUBLISH_PREF, on ? '1' : '0'); } catch (_) {}
    const el = document.getElementById('tv81PublishToggle');
    if (el) el.checked = !!on;
    // On enable, publish once now if there is a book and no fresh head from anyone.
    if (on) { tv81AnchorReadSnapshot().then(function (s) { if (s.state !== 'READY_WITH_COVERAGE' || (s.headAge || 0) > (600)) tv81AnchorPublishSnapshot(); }).catch(function () {}); }
  };
  // One decision-relevant status line for the book section (minimal-information law): age of the
  // last validated snapshot, or the honest non-ready state. Called after each anchor pass.
  function tv81AnchorStatusLine() {
    const s = window.__STABLES_ANCHOR__ || null;
    const el = document.getElementById('tv81ReconstructStatus');
    if (!el || !s) return;
    if (el.textContent && el.textContent.indexOf('Reconstruct') >= 0) return; // manual run owns the line
    if (s.state === 'READY_WITH_COVERAGE') {
      // SILENT WHEN HEALTHY (founder 2026-07-26: remove "Book snapshot: verified, 8h old"). A verified
      // snapshot is the normal case and needs no line; announcing it every render is the same fault as
      // reporting correct filtering as damage. The contract keeps the SEMANTICS (three D22 states) and
      // allows presentation to move, so the two non-ready states still speak below.
      el.textContent = '';
    } else if (s.state === 'PROOF_UNAVAILABLE') {
      el.textContent = 'Book snapshot: waiting for the next on-chain snapshot';
    } else {
      el.textContent = 'Book snapshot: incomplete, keeping last good book';
    }
  }
  window.tv81AnchorStatusLine = tv81AnchorStatusLine;
  // ================= END ROLLING ANCHOR R1+R2 =================
  async function tv81DirectReadBook() {
    const registry = await tv81AppRegistry();
    const cfg = tv81DirectCfg(registry);
    if (!cfg) throw new Error('No direct-take market configured.');
    await tv81DirectEnsureTracked(registry);
    const base = String(cfg.base_token_id).toLowerCase(), quote = String(cfg.quote_token_id).toLowerCase();
    const tick = BigInt(String(cfg.tick_atoms || '10000'));
    const data = await tv81CoinsAtAddress(String(cfg.order_address).toLowerCase());
    const coins = Array.isArray(data) ? data : (data && Array.isArray(data.coins) ? data.coins : []);
    const orders = [];
    // Reader truth log (2026-07-22, the phone one-visible-ask case): the node can hold order coins
    // that this query does not return, or that fail a check below. Silent skipping made a partial
    // book look complete, so every disposition is logged once per coin per session (visible in
    // logcat), and the held-but-unrenderable count is returned for the panel to show honestly.
    window.__TV81_BOOK_READ_LOGGED__ = window.__TV81_BOOK_READ_LOGGED__ || {};
    const logOnce = function (key, msg) {
      if (window.__TV81_BOOK_READ_LOGGED__[key]) return;
      window.__TV81_BOOK_READ_LOGGED__[key] = true;
      try { console.log('[STABLES-BOOK] read: ' + msg); } catch (_) { /* ignore */ }
    };
    logOnce('count', 'coins query returned ' + coins.length + ' coin(s) at the engine address');
    // State-blind order coins (the phone's one-visible-ask case, 2026-07-22): a light node can
    // hold an order coin and its MMR proof but not its state ports (the v0.0.8.39 law), and the
    // port reads below then silently skip it, so the book shows only the coins created while this
    // node watched. Heal node-locally (coinexport -> coinimport of the node's OWN proof), at most
    // once per coin per session (with a 2-minute retry after a failed heal) so the periodic
    // refresh cannot hammer the bridge.
    window.__TV81_STATE_HEAL_TRIED__ = window.__TV81_STATE_HEAL_TRIED__ || {};
    // Three OUTCOMES, not one (fixed 2026-07-26 after a founder report: "how can the node know the
    // number of orders and not display them?"). The old code counted every non-rendered coin as
    // `unreadable` and told the user to run Reconstruct. Most of them were neither unreadable nor
    // repairable: the direct-take covenant is token-agnostic and serves EVERY pair from one address,
    // so the abandoned TV81 order coins rest there too and are filtered out by token id exactly as
    // designed. On the founder's node that was 21 of 23 coins, reported as damage on a book that was
    // perfectly correct. Reconstruct could never have cleared them.
    //   unreadable  - held but not legible (state-blind, malformed, bad ports). Reconstruct helps.
    //   otherMarket - read fine, belongs to a different pair/generation. Normal. Never a warning.
    //   spentSkipped - already filled or cancelled. Normal churn. Never a warning.
    let unreadable = 0;
    let otherMarket = 0;
    let spentSkipped = 0;
    for (const c0 of coins) {
      if (!c0 || c0.spent) { if (c0 && c0.coinid) { spentSkipped++; logOnce('spent-' + c0.coinid, 'skip ' + String(c0.coinid).slice(0, 14) + ': node reports the coin SPENT'); } continue; }
      try {
        let c = c0;
        if (!(Array.isArray(c.state) && c.state.length)) {
          const cid = String(c.coinid || '');
          const tried = window.__TV81_STATE_HEAL_TRIED__[cid] || 0;
          if (Date.now() - tried < 120000) { unreadable++; continue; }
          window.__TV81_STATE_HEAL_TRIED__[cid] = Date.now();
          logOnce('blind-' + cid, 'coin ' + cid.slice(0, 14) + ' is state-blind; healing');
          c = await ensureCoinStatePresent(c, 'order coin');
        }
        const side = Number(readStatePort(c, 2));
        if (side !== 1 && side !== 2) { unreadable++; logOnce('side-' + c.coinid, 'skip ' + String(c.coinid).slice(0, 14) + ': side port reads "' + readStatePort(c, 2) + '"'); continue; }
        if (String(readStatePort(c, 8) || '').toLowerCase() !== base) { otherMarket++; logOnce('basetok-' + c.coinid, 'skip ' + String(c.coinid).slice(0, 14) + ': base token is another pair/generation'); continue; }
        if (String(readStatePort(c, 9) || '').toLowerCase() !== quote) { otherMarket++; logOnce('quotetok-' + c.coinid, 'skip ' + String(c.coinid).slice(0, 14) + ': quote token is another pair/generation'); continue; }
        const priceAtoms = BigInt(String(readStatePort(c, 3)));
        const sizeDisplay = tv81FbaFmt(String(readStatePort(c, 4)));
        const sizeAtoms = tokenDisplayToAtoms8(sizeDisplay);
        if (priceAtoms <= 0n || sizeAtoms <= 0n) { unreadable++; logOnce('empty-' + c.coinid, 'skip ' + String(c.coinid).slice(0, 14) + ': zero price or size'); continue; }
        orders.push({
          coinId: String(c.coinid || ''), side: side === 1 ? 'BID' : 'ASK',
          priceAtoms: priceAtoms.toString(), tickIndex: (priceAtoms / tick).toString(),
          originalBaseAtoms: sizeAtoms.toString(), remainingBaseAtoms: sizeAtoms.toString(),
          currentEscrowAtoms: '0', cumulativeQuoteAtoms: '0',
          makerReceiveAddress: String(readStatePort(c, 5) || ''), createdBlock: Number(c.created) || 0,
          // rich fields the sweep builder needs (each order settles at its OWN limit):
          limitAtoms: priceAtoms.toString(), sizeDisplay: sizeDisplay,
          maker: String(readStatePort(c, 5) || ''), refund: String(readStatePort(c, 6) || ''),
          mpub: String(readStatePort(c, 10) || ''), basetok: String(readStatePort(c, 8) || ''),
          quotetok: String(readStatePort(c, 9) || ''), escrowDisplay: tv81FbaFmt(String(readStatePort(c, 11) || '0')),
        });
      } catch (e) { unreadable++; logOnce('malformed-' + (c0 && c0.coinid), 'skip ' + String((c0 || {}).coinid).slice(0, 14) + ': ' + String((e && e.message) || e).slice(0, 80)); }
    }
    if (unreadable > 0) logOnce('unreadable-' + unreadable, unreadable + ' held coin(s) at the engine address are NOT legible as orders (see the skip lines above)');
    // Logged, never surfaced: these are correct exclusions, not a problem the user can act on.
    if (otherMarket > 0) logOnce('othermkt-' + otherMarket, otherMarket + ' coin(s) at the engine address belong to another pair/generation and were filtered out (expected: the covenant is token-agnostic)');
    if (spentSkipped > 0) logOnce('spent-' + spentSkipped, spentSkipped + ' coin(s) at the engine address are already spent (filled or cancelled)');
    // Out-of-window merge (2026-07-22 phone law): `coins address:` scans only the UNPRUNED chain,
    // so orders older than this node's pruning window are invisible to the scan even though the
    // node holds them with valid proofs (verified spent=false, correct address, state present on
    // the founder's phone). Merge every source-served order coinid the node holds, re-validated
    // exactly like the scanned coins. Each coin's proof was chain-verified on import, so this
    // adds no trust; a stale or spent entry simply fails validation and drops out.
    const sourceIds = Array.isArray(window.__TV81_BOOK_SOURCE_COINS__) ? window.__TV81_BOOK_SOURCE_COINS__ : [];
    const have = {};
    orders.forEach(function (o) { have[o.coinId.toLowerCase()] = true; });
    for (const sid of sourceIds) {
      if (!sid || have[String(sid).toLowerCase()]) continue;
      try {
        const found = await mdsCmdData('coins coinid:' + sid);
        const c = Array.isArray(found) ? found[0] : found;
        if (!c || c.spent) continue;
        const side = Number(readStatePort(c, 2));
        if (side !== 1 && side !== 2) continue;
        if (String(readStatePort(c, 8) || '').toLowerCase() !== base) continue;
        if (String(readStatePort(c, 9) || '').toLowerCase() !== quote) continue;
        const priceAtoms = BigInt(String(readStatePort(c, 3)));
        const sizeDisplay = tv81FbaFmt(String(readStatePort(c, 4)));
        const sizeAtoms = tokenDisplayToAtoms8(sizeDisplay);
        if (priceAtoms <= 0n || sizeAtoms <= 0n) continue;
        logOnce('merged-' + sid, 'merged out-of-window order ' + String(sid).slice(0, 14) + ' into the book (held with valid proof, older than the pruning window)');
        orders.push({
          coinId: String(c.coinid || ''), side: side === 1 ? 'BID' : 'ASK',
          priceAtoms: priceAtoms.toString(), tickIndex: (priceAtoms / tick).toString(),
          originalBaseAtoms: sizeAtoms.toString(), remainingBaseAtoms: sizeAtoms.toString(),
          currentEscrowAtoms: '0', cumulativeQuoteAtoms: '0',
          makerReceiveAddress: String(readStatePort(c, 5) || ''), createdBlock: Number(c.created) || 0,
          limitAtoms: priceAtoms.toString(), sizeDisplay: sizeDisplay,
          maker: String(readStatePort(c, 5) || ''), refund: String(readStatePort(c, 6) || ''),
          mpub: String(readStatePort(c, 10) || ''), basetok: String(readStatePort(c, 8) || ''),
          quotetok: String(readStatePort(c, 9) || ''), escrowDisplay: tv81FbaFmt(String(readStatePort(c, 11) || '0')),
        });
        have[String(sid).toLowerCase()] = true;
      } catch (_) { /* skip */ }
    }
    const asks = orders.filter(o => o.side === 'ASK').sort((a, b) => { const x = BigInt(a.priceAtoms), y = BigInt(b.priceAtoms); return x === y ? 0 : (x < y ? -1 : 1); });
    const bids = orders.filter(o => o.side === 'BID').sort((a, b) => { const x = BigInt(a.priceAtoms), y = BigInt(b.priceAtoms); return x === y ? 0 : (x > y ? -1 : 1); });
    const toBins = (rows) => { const idx = {}, out = []; for (const r of rows) { let b = idx[r.priceAtoms]; if (!b) { b = { priceAtoms: r.priceAtoms, orderCount: 0, baseAtoms: 0n }; idx[r.priceAtoms] = b; out.push(b); } b.orderCount++; b.baseAtoms += BigInt(r.remainingBaseAtoms); } return out.map(b => ({ priceAtoms: b.priceAtoms, orderCount: b.orderCount, baseAtoms: b.baseAtoms.toString() })); };
    const bestAsk = asks.length ? asks[0].priceAtoms : null, bestBid = bids.length ? bids[0].priceAtoms : null;
    return {
      market: 'XWINIWA_WINIWA', marketId: 1, tickAtoms: tick.toString(),
      orders: { asks: asks, bids: bids }, bins: { asks: toBins(asks), bids: toBins(bids) },
      bestAskAtoms: bestAsk, bestBidAtoms: bestBid,
      spreadAtoms: (bestAsk != null && bestBid != null) ? (BigInt(bestAsk) - BigInt(bestBid)).toString() : null,
      askDepthBaseAtoms: asks.reduce((s, x) => s + BigInt(x.remainingBaseAtoms), 0n).toString(),
      bidDepthBaseAtoms: bids.reduce((s, x) => s + BigInt(x.remainingBaseAtoms), 0n).toString(),
      excludedInvalidCoins: 0, behavioralClaim: false, source: 'direct', unreadableCount: unreadable,
      otherMarketCount: otherMarket, spentSkippedCount: spentSkipped,
      // Direct-take last price = observed trades (no result coin); mid of the live book as a stand-in.
      lastPstarAtoms: (bestAsk != null && bestBid != null) ? ((BigInt(bestAsk) + BigInt(bestBid)) / 2n).toString() : (bestAsk || bestBid || null),
    };
  }
  async function tv81DirectBuildOrder(sideAskBid, priceDisplay, sizeDisplay) {
    const registry = await tv81AppRegistry();
    const cfg = tv81DirectCfg(registry);
    if (!cfg) throw new Error('No direct-take market configured.');
    const isSell = String(sideAskBid).toUpperCase() === 'ASK';
    const sideCode = isSell ? 2 : 1;
    const tick = BigInt(String(cfg.tick_atoms || '10000'));
    let limit = BigInt(Math.round(Number(priceDisplay) * 1e8));
    limit = isSell ? ((limit + tick - 1n) / tick) * tick : (limit / tick) * tick; // ASK up, BID down
    if (limit <= 0n) throw new Error('Price rounds to zero; raise it.');
    const size = tv81FbaFmt(sizeDisplay);
    if (!(Number(size) > 0)) throw new Error('Enter a positive size.');
    const escrowTok = isSell ? cfg.base_token_id : cfg.quote_token_id;
    const escrow = isSell ? size : tv81FbaFmt(Number(size) * (Number(limit) / 1e8));
    if (!(Number(escrow) > 0)) throw new Error('Escrow rounds to zero.');
    const wallet = await fetchTesterWallet();
    const addr = String(wallet.address || '').toLowerCase();
    const pub = await tv81WalletPubkey();
    const st = { 2: String(sideCode), 3: limit.toString(), 4: size, 5: addr, 6: addr,
      7: String(cfg.refund_min_coinage || 20), 8: String(cfg.base_token_id).toLowerCase(),
      9: String(cfg.quote_token_id).toLowerCase(), 10: pub, 11: escrow };
    return {
      kind: 'TV81_DIRECT_ORDER', side: isSell ? 'ASK' : 'BID',
      disclosure: { quantizedPriceAtoms: limit.toString(), changedByRounding: BigInt(Math.round(Number(priceDisplay) * 1e8)) !== limit },
      escrow: { tokenId: escrowTok, display: escrow },
      sizeDisplay: size, priceDisplay: tv81FbaFmt(Number(limit) / 1e8),
      command: 'send address:' + String(cfg.order_address).toLowerCase() + ' amount:' + escrow
        + ' tokenid:' + String(escrowTok).toLowerCase() + ' state:' + JSON.stringify(st),
    };
  }
  async function tv81DirectPlaceOrder(plan) {
    if (!plan || plan.kind !== 'TV81_DIRECT_ORDER') throw new Error('No order to place.');
    const res = await directOrMdsCmd(plan.command, 'submitting the order', 90000);
    const extracted = extractTxidsFromMdsPost(res) || {};
    try {
      if (typeof window.stablesAppendUserActivityRow === 'function') {
        const now = new Date();
        window.stablesAppendUserActivityRow({
          id: 'TV81-ORD-' + (extracted.explorerTxId || String(Date.now())).slice(2, 14), dir: 'out', icon: '↗',
          counterparty: 'Order book (xWiniwa/Winiwa)', category: plan.side === 'ASK' ? 'xWiniwa' : 'Winiwa',
          title: plan.side === 'ASK' ? 'Sell order' : 'Buy order',
          date: now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
          amt: -Math.abs(Number(plan.escrow.display)), ccy: plan.side === 'ASK' ? 'xWiniwa' : 'Winiwa', fee: 0,
          explorerTxId: extracted.explorerTxId || '', pendingTxnId: extracted.pendingTxnId || '', status: 'Pending',
          note: (plan.side === 'ASK' ? 'Sell' : 'Buy') + ' ' + plan.sizeDisplay + ' xWiniwa at ' + plan.priceDisplay + ' Winiwa. Rests on the book until a taker fills it.',
          minimaOnChain: true, localOrigin: true, pendingIncoming: false,
        });
      }
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate([plan.side === 'ASK' ? 'xWiniwa' : 'Winiwa']);
    } catch (_) { /* ignore */ }
    // Trading STAYS on the Trade page (founder ruling 2026-07-26, supersedes the navigate-to-Wallet law for trading only: send/receive/mint/burn still go to Wallet). The activity row and the balance flash are the feedback, and the trade panels refresh in place.
    try { if (typeof window.tv81RefreshOrderBookPanel === "function") window.tv81RefreshOrderBookPanel(); } catch (_) { /* ignore */ }
    return extracted;
  }
  // Plan a market sweep from a live book: opposite side, best-for-taker first, greedy fill; only the
  // marginal (last) order partial-fills. Returns legs + totals (all in display units). Throws if empty.
  function tv81DirectPlanSweep(book, side, requestedDisplay) {
    const buy = side === 'buy';
    const src = buy ? ((book.orders && book.orders.asks) || []) : ((book.orders && book.orders.bids) || []);
    let remaining = Number(tv81FbaFmt(requestedDisplay));
    const legs = [];
    for (const o of src) {
      if (remaining <= 1e-9) break;
      const avail = Number(o.sizeDisplay);
      let f = Math.min(remaining, avail);
      const partial = f < avail - 1e-9;
      // A partial fill has to cost a WHOLE number of atoms, or it cannot exist on chain and the
      // sweep dies without ever posting. Cost = base_atoms x limit_atoms / 1e8, so base_atoms must
      // be a multiple of 1e8 / gcd(limit_atoms, 1e8); at a limit of 1.005 that step is 200 atoms.
      // Proven on mainnet 2026-07-26: 0.29850746 xWiniwa at 1.005 needs 29999999.73 atoms and the
      // order silently did nothing, while 0.3 (30150000 atoms, exact) executed immediately. This is
      // why the Exchange never worked and the Trade ticket usually did — the Exchange is driven by a
      // quote amount ("spend 0.3 Winiwa"), so it produces these sizes as a matter of course, whereas
      // a person typing a base size lands on round numbers. Snapping DOWN never spends more than the
      // person agreed; a full fill is left exactly as it rests, since the maker's own size already
      // priced itself when the order was placed.
      let snappedDown = false;
      if (partial) {
        try {
          const U = 100000000n;
          const lim = BigInt(String(o.limitAtoms));
          const gcd = function (a, b) { while (b) { const t = a % b; a = b; b = t; } return a; };
          const step = U / gcd(lim, U);
          if (step > 1n) {
            const atoms = BigInt(tokenDisplayToAtoms8(tv81FbaFmt(f)));
            const snapped = (atoms / step) * step;
            if (snapped > 0n && snapped !== atoms) { f = Number(tv81AtomsToDisplay8(snapped)); snappedDown = true; }
          }
        } catch (e) { try { window.__TV81_SNAP_ERR__ = String((e && e.message) || e); } catch (__) { /* ignore */ } }
      }
      legs.push({ o: o, f: tv81FbaFmt(f), partial: partial });
      remaining = Number(tv81FbaFmt(remaining - f));
      // Do NOT chase the crumb up the book. Snapping leaves a few atoms over, and letting them spill
      // to the next price level bought 0.00000145 xWiniwa at 1.20 and pushed the total cost ABOVE the
      // amount being spent (0.30000027 for a 0.3 exchange). The snap means this level is filled to the
      // finest size its price can express, so the sweep stops there and reports the remainder unfilled.
      if (snappedDown) break;
    }
    if (!legs.length) throw new Error('No ' + (buy ? 'asks' : 'bids') + ' are available to take yet: your node is still capturing the live order coins for this side. Place a limit order, or give the book a moment.');
    // REFUSE, do not no-op. A leg whose cost is not a whole number of atoms cannot be posted, and
    // for a long time the engine simply did nothing with it: the promise resolved, no transaction
    // existed, and the person watched an unchanged balance. The planner snaps sizes so this should
    // never trigger, which is exactly why it must speak if it ever does — a silent success is the one
    // outcome the honest-refusal law forbids, and it cost a full session to find (2026-07-26).
    legs.forEach(function (l) {
      try {
        const costAtoms = BigInt(tokenDisplayToAtoms8(l.f)) * BigInt(String(l.o.limitAtoms));
        if (costAtoms % 100000000n !== 0n) {
          throw new Error("This size cannot be filled exactly at " + (Number(l.o.limitAtoms) / 1e8)
            + ": its cost is not a whole number of units. Try a slightly different amount.");
        }
      } catch (e) {
        if (e instanceof RangeError || (e && /whole number of units/.test(String(e.message)))) throw e;
        throw new Error("This order could not be priced exactly. Try a slightly different amount.");
      }
    });
    const px = a => Number(a) / 1e8;
    const quotef = leg => tv81FbaFmt(Number(leg.f) * px(leg.o.limitAtoms));
    const totalQuote = tv81FbaFmt(legs.reduce((s, l) => s + Number(quotef(l)), 0));
    const totalBase = tv81FbaFmt(legs.reduce((s, l) => s + Number(l.f), 0));
    const plan = { buy: buy, legs: legs, quotef: quotef, totalQuote: totalQuote, totalBase: totalBase, unfilled: tv81FbaFmt(remaining) };
    // Last plan kept for inspection: a sweep that does nothing leaves no other trace to read.
    try { window.__TV81_LAST_PLAN__ = { side: side, requested: String(requestedDisplay), totalBase: totalBase, totalQuote: totalQuote, legs: legs.map(function (l) { return { f: l.f, partial: l.partial, limit: String(l.o.limitAtoms), avail: String(l.o.sizeDisplay) }; }) }; } catch (_) { /* ignore */ }
    return plan;
  }
  async function tv81DirectExecuteSweep(side, requestedDisplay) {
    const registry = await tv81AppRegistry();
    const cfg = tv81DirectCfg(registry);
    if (!cfg) throw new Error('No direct-take market configured.');
    const book = await tv81DirectReadBook();
    const plan = tv81DirectPlanSweep(book, side, requestedDisplay);
    const buy = plan.buy, legs = plan.legs, quotef = plan.quotef, totalQuote = plan.totalQuote, totalBase = plan.totalBase;
    const k = legs.length;
    const wallet = await fetchTesterWallet();
    const taker = String(wallet.address || '').toLowerCase();
    const base = String(cfg.base_token_id).toLowerCase(), quote = String(cfg.quote_token_id).toLowerCase();
    const payTok = buy ? quote : base;
    const payTotal = buy ? totalQuote : totalBase;
    const paymentCoins = await gatherSendableUserCoins(payTok, Number(payTotal));
    if (!paymentCoins.length) throw new Error('Not enough spendable ' + (buy ? 'Winiwa' : 'xWiniwa') + ' to cover this order.');
    const paidSum = paymentCoins.reduce((s, c) => s + Number(c.tokenamount || '0'), 0);
    const change = tv81FbaFmt(paidSum - Number(payTotal));
    const txnId = 'stables_tv81_sweep_' + String(legs[0].o.coinId).slice(2, 12);
    try { await directOrMdsCmd('txndelete id:' + txnId, 'clearing the previous sweep draft', 15000); } catch (_) { /* ignore */ }
    const steps = ['txncreate id:' + txnId];
    legs.forEach(function (l) { steps.push('txninput id:' + txnId + ' coinid:' + l.o.coinId); });   // orders = inputs 0..k-1 (@INPUT=i)
    paymentCoins.forEach(function (c) { steps.push('txninput id:' + txnId + ' coinid:' + c.coinid); });
    const states = { 23: '1' };
    legs.forEach(function (l, i) {
      states[30 + i] = String(i);   // pa_i = i: order i's maker payment sits at output i
      states[40 + i] = l.f;         // fill for order i
      if (buy) steps.push('txnoutput id:' + txnId + ' amount:' + quotef(l) + ' address:' + l.o.maker + ' tokenid:' + quote + ' storestate:false'); // SELL maker gets quote
      else steps.push('txnoutput id:' + txnId + ' amount:' + l.f + ' address:' + l.o.maker + ' tokenid:' + base + ' storestate:false');           // BUY maker gets base
    });
    const m = legs[k - 1]; // only the marginal (last) order can partial-fill; its continuation goes at slot k
    if (m.partial) {
      const newsize = tv81FbaFmt(Number(m.o.sizeDisplay) - Number(m.f));
      if (buy) {
        steps.push('txnoutput id:' + txnId + ' amount:' + newsize + ' address:' + String(cfg.order_address).toLowerCase() + ' tokenid:' + base + ' storestate:true');
        Object.assign(states, { 2: '2', 3: String(m.o.limitAtoms), 5: m.o.maker, 6: m.o.refund, 7: String(cfg.refund_min_coinage || 20), 8: base, 9: quote, 10: m.o.mpub, 4: newsize, 11: newsize });
      } else {
        const newescrow = tv81FbaFmt(Number(m.o.escrowDisplay) - Number(quotef(m)));
        steps.push('txnoutput id:' + txnId + ' amount:' + newescrow + ' address:' + String(cfg.order_address).toLowerCase() + ' tokenid:' + quote + ' storestate:true');
        Object.assign(states, { 2: '1', 3: String(m.o.limitAtoms), 5: m.o.maker, 6: m.o.refund, 7: String(cfg.refund_min_coinage || 20), 8: base, 9: quote, 10: m.o.mpub, 4: newsize, 11: newescrow });
      }
    }
    if (buy) steps.push('txnoutput id:' + txnId + ' amount:' + totalBase + ' address:' + taker + ' tokenid:' + base + ' storestate:false');   // taker aggregate base
    else steps.push('txnoutput id:' + txnId + ' amount:' + totalQuote + ' address:' + taker + ' tokenid:' + quote + ' storestate:false');       // taker aggregate quote
    if (Number(change) > 0) steps.push('txnoutput id:' + txnId + ' amount:' + change + ' address:' + taker + ' tokenid:' + payTok + ' storestate:false');
    Object.keys(states).forEach(function (p) { steps.push('txnstate id:' + txnId + ' port:' + p + ' value:' + states[p]); });
    await directOrMdsCmdBatch(steps, 'building the market order', 120000);
    await directOrMdsCmd('txnbasics id:' + txnId, 'funding the market order', 120000);   // MINIMA fee only; token payment is manual
    await directOrMdsCmd('txnsign id:' + txnId + ' publickey:auto', 'signing the market order', 235000);
    const checkRes = await directOrMdsCmd('txncheck id:' + txnId, 'validating the market order', 90000);
    const valid = (mdsPayload(checkRes) || {}).valid || {};
    if (!valid.scripts || !valid.basic || !valid.mmrproofs) {
      try { console.error('[market-order] txncheck failed:', JSON.stringify(valid)); } catch (_) { /* ignore */ }
      throw new Error('The order could not be validated. Please try again.');
    }
    const postRes = await directOrMdsCmd('txnpost id:' + txnId + ' txndelete:true', 'posting the market order', 90000);
    const extracted = extractTxidsFromMdsPost(postRes) || {};
    const recvLabel = buy ? 'xWiniwa' : 'Winiwa', payLabel = buy ? 'Winiwa' : 'xWiniwa';
    const recvDisplay = buy ? totalBase : totalQuote;
    // Both legs move optimistically in the same paint (mint canon): without the receive-side
    // credit the stabilizer auto-freezes the incoming token at its pre-trade value and the
    // bought amount never renders (proven on the emulator embedded node, DT2).
    try {
      const payDisplay = buy ? totalQuote : totalBase;
      const basePay = stablesDisplayedBalanceForOptimistic(payLabel);
      const baseRecv = stablesDisplayedBalanceForOptimistic(recvLabel);
      stablesSetOptimisticBalance(payLabel, Math.max(0, basePay - Number(payDisplay)), 'out');
      stablesSetOptimisticBalance(recvLabel, baseRecv + Number(recvDisplay), 'in');
      clearTestTokenBalanceDetails(['Winiwa', 'xWiniwa']);
    } catch (_) { /* ignore */ }
    try {
      if (typeof window.stablesAppendUserActivityRow === 'function') {
        const now = new Date();
        window.stablesAppendUserActivityRow({
          id: 'TV81-TAKE-' + (extracted.explorerTxId || String(Date.now())).slice(2, 14), dir: 'in', icon: '↙',
          counterparty: 'Order book (xWiniwa/Winiwa)', category: recvLabel,
          title: buy ? 'Bought xWiniwa' : 'Sold xWiniwa',
          date: now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
          amt: Math.abs(Number(recvDisplay)), ccy: recvLabel, fee: 0,
          explorerTxId: extracted.explorerTxId || '', pendingTxnId: extracted.pendingTxnId || '',
          status: extracted.explorerTxId ? 'On-chain' : 'Pending',
          note: (buy ? 'Paid ' + tv81G(totalQuote) + ' Winiwa for ' + tv81G(totalBase) + ' xWiniwa' : 'Sold ' + tv81G(totalBase) + ' xWiniwa for ' + tv81G(totalQuote) + ' Winiwa') + ' across ' + k + ' order' + (k === 1 ? '' : 's') + ', each at its own price.',
          minimaOnChain: true, localOrigin: true, pendingIncoming: true,
        });
      }
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate([payLabel, recvLabel]);
    } catch (_) { /* ignore */ }
    // Trading STAYS on the Trade page (founder ruling 2026-07-26, supersedes the navigate-to-Wallet law for trading only: send/receive/mint/burn still go to Wallet). The activity row and the balance flash are the feedback, and the trade panels refresh in place.
    try { if (typeof window.tv81RefreshOrderBookPanel === "function") window.tv81RefreshOrderBookPanel(); } catch (_) { /* ignore */ }
    return extracted;
  }

  function tv81AtomsToDisplay8(atoms) {
    const whole = atoms / 100000000n;
    const frac = (atoms % 100000000n).toString().padStart(8, '0').replace(/0+$/, '');
    return frac ? whole.toString() + '.' + frac : whole.toString();
  }

  // Build one permissionless ASK/BID placement as an unposted DRAFT plan (P7-03/P7-04 app
  // transaction construction). A placement is a plain send of the escrow to the registered
  // market-engine address carrying the frozen 0-24 order state; there is no covenant input.
  // D03 protective rounding is applied and disclosed (ASK rounds up, BID rounds down) so the
  // confirming user sees the entered and the quantized price. This builder never signs or posts;
  // the confirm-and-post user path lands with the P9-05 Exchange wiring.
  async function tv81BuildOrderPlacement(input) {
    const registry = await tv81AppRegistry();
    const marketCode = String(input && input.marketCode || '');
    const market = (registry.markets || {})[marketCode];
    if (!market) throw new Error('Unknown TV81 market: ' + marketCode);
    const assets = registry.assets || {};
    const baseTokenId = String((assets[market.base] || {}).token_id || '').toLowerCase();
    const quoteTokenId = String((assets[market.quote] || {}).token_id || '').toLowerCase();
    if (!baseTokenId || !quoteTokenId) throw new Error('TV81 market ' + marketCode + ' token identities are missing.');
    const side = String(input.side || '').toUpperCase();
    if (side !== 'ASK' && side !== 'BID') throw new Error('Order side must be ASK or BID.');
    const requireUint = function (value, label) {
      const s = String(value == null ? '' : value);
      if (!/^(0|[1-9][0-9]*)$/.test(s)) throw new Error(label + ' must be canonical unsigned base-10 atoms.');
      return BigInt(s);
    };
    const requireHex = function (value, label) {
      const s = String(value == null ? '' : value).toLowerCase();
      if (!/^0x[0-9a-f]+$/.test(s)) throw new Error(label + ' must be 0x-prefixed hex.');
      return s;
    };
    const entered = requireUint(input.enteredPriceAtoms, 'Entered price');
    const quantity = requireUint(input.baseQuantityAtoms, 'Base quantity');
    if (entered === 0n || quantity === 0n) throw new Error('Price and base quantity must be positive.');
    const tick = BigInt(String(market.tick_atoms));
    // D03 protective rounding: ASK up to the next tick, BID down to the prior tick.
    const price = side === 'ASK' ? ((entered + tick - 1n) / tick) * tick : (entered / tick) * tick;
    if (price === 0n) throw new Error('Protective BID rounding produced a zero price; raise the entered price.');
    // Exact totals: ASK escrows base; BID escrows floor(quantity * price / 1e8) quote atoms.
    const escrowAtoms = side === 'ASK' ? quantity : (quantity * price) / 100000000n;
    if (escrowAtoms === 0n) throw new Error('The order escrow rounds to zero; increase quantity or price.');
    const makerReceiveAddress = requireHex(input.makerReceiveAddress, 'Maker receive address');
    const refundAddress = requireHex(input.refundAddress, 'Refund address');
    const makerPublicKey = requireHex(input.makerPublicKey, 'Maker public key');
    const makerNonce = requireUint(input.makerNonce, 'Maker nonce');
    const generationId = String(registry.generation_id || '').toLowerCase();
    const idValues = [generationId, String(market.market_id), makerPublicKey, makerNonce.toString(),
      side, price.toString(), quantity.toString(), makerReceiveAddress];
    const encoded = idValues.map(function (v) { return String(v).length + ':' + v; }).join('|');
    const orderId = await sha256HexUtf8('stables|tv81|order|v1|8|' + encoded + '\n');
    const o = TV81_ORDER_STATE;
    const state = {};
    for (let port = 0; port <= 24; port++) state[String(port)] = '0';
    state[o.SCHEMA] = '1';
    state[o.GENERATION_ID] = generationId;
    state[o.TAG] = '8111';
    state[o.MARKET_ID] = String(market.market_id);
    state[o.SIDE] = side === 'ASK' ? '1' : '2';
    state[o.PRICE_ATOMS] = price.toString();
    state[o.TICK_ATOMS] = tick.toString();
    state[o.BASE_TOKEN_ID] = baseTokenId;
    state[o.QUOTE_TOKEN_ID] = quoteTokenId;
    state[o.ESCROW_TOKEN_ID] = side === 'ASK' ? baseTokenId : quoteTokenId;
    state[o.ORIGINAL_BASE_ATOMS] = quantity.toString();
    state[o.REMAINING_BASE_ATOMS] = quantity.toString();
    state[o.MAKER_RECEIVE] = makerReceiveAddress;
    state[o.MAKER_PUBKEY] = makerPublicKey;
    state[o.REFUND] = refundAddress;
    state[o.ORDER_ID] = orderId;
    state[o.MAKER_NONCE] = makerNonce.toString();
    state[o.PRICE_TICK_INDEX] = (price / tick).toString();
    state[o.CURRENT_ESCROW] = escrowAtoms.toString();
    state['253'] = '0'; state['254'] = '0'; state['255'] = '0';
    const escrowTokenId = state[o.ESCROW_TOKEN_ID];
    const escrowDisplay = tv81AtomsToDisplay8(escrowAtoms);
    return {
      kind: 'TV81_ORDER_PLACEMENT',
      lifecycle: 'DRAFT',
      posted: false,
      market: marketCode,
      marketId: market.market_id,
      side: side,
      orderId: orderId,
      disclosure: {
        enteredPriceAtoms: entered.toString(),
        quantizedPriceAtoms: price.toString(),
        changedByRounding: entered !== price,
        tickAtoms: tick.toString(),
        orderTotalQuoteAtoms: (side === 'ASK'
          ? ((quantity * price + 99999999n) / 100000000n)
          : (quantity * price) / 100000000n).toString(),
      },
      escrow: { tokenId: escrowTokenId, atoms: escrowAtoms.toString(), display: escrowDisplay },
      covenantAddress: String(market.order_address || ''),
      transactionState: state,
      command: 'send address:' + String(market.order_address || '')
        + ' amount:' + escrowDisplay
        + ' tokenid:' + escrowTokenId
        + ' state:' + JSON.stringify(state),
    };
  }

  function tv81DenseCoinState(coin, first, last) {
    const state = {};
    for (let port = first; port <= last; port++) {
      const value = readStatePort(coin, port);
      if (value == null) throw new Error('TV81 coin ' + String(coin.coinid || '') + ' is missing state port ' + port + '.');
      state[String(port)] = String(value);
    }
    return state;
  }

  function tv81CumulativeQuote(side, filledAtoms, priceAtoms) {
    const numerator = BigInt(filledAtoms) * BigInt(priceAtoms);
    return side === 'ASK' ? (numerator + 99999999n) / 100000000n : numerator / 100000000n;
  }

  async function tv81HashHexPair(left, right) {
    const clean = function (value, label) {
      const s = String(value || '').toLowerCase();
      if (!/^0x(?:[0-9a-f]{2})+$/.test(s)) throw new Error(label + ' must be even-length 0x hex.');
      return s.slice(2);
    };
    const a = clean(left, 'Previous market history commitment');
    const b = clean(right, 'Fill operation ID');
    // KISS `SHA2` is the consensus VM primitive and is not interchangeable with the
    // browser's WebCrypto SHA-256 result. Ask the connected Minima node to evaluate the
    // exact primitive so STATE(113) matches SHA2(CONCAT(PREVSTATE(113) STATE(24))).
    const data = await mdsCmdData('hash data:0x' + a + b + ' type:sha2');
    const digest = String((data && data.hash) || '').toLowerCase();
    if (!/^0x[0-9a-f]{64}$/.test(digest)) throw new Error('The node did not return a valid KISS SHA2 digest.');
    return digest;
  }

  async function tv81AdvancePriceStateForFill(priceCoin, orderState, fillAtoms, operationId) {
    const p = TV81_PRICE_STATE;
    const next = tv81DenseCoinState(priceCoin, 90, 199);
    const marketId = BigInt(orderState[String(TV81_ORDER_STATE.MARKET_ID)]);
    const eligible = marketId === 1n ? fillAtoms > 0n : fillAtoms >= 100000000n;
    if (!eligible) return { eligible: false, state: next };

    const previousCount = Number(BigInt(next[String(p.OBSERVATION_COUNT)]));
    const cursor = Number(BigInt(next[String(p.NEXT_RING_CURSOR)]));
    if (previousCount < 0 || previousCount > 21 || cursor < 0 || cursor >= 21) {
      throw new Error('The market price-state ring metadata is invalid.');
    }
    const nextNonce = BigInt(next[String(p.PRICE_NONCE)]) + 1n;
    const target = 116 + cursor * 4;
    next[String(target)] = orderState[String(TV81_ORDER_STATE.PRICE_ATOMS)];
    next[String(target + 1)] = fillAtoms.toString();
    next[String(target + 2)] = nextNonce.toString();
    next[String(target + 3)] = String(orderState[String(TV81_ORDER_STATE.MAKER_PUBKEY)]).toLowerCase();
    const count = Math.min(previousCount + 1, 21);
    const rows = [];
    for (let slot = 0; slot < count; slot++) {
      const first = 116 + slot * 4;
      rows.push({
        price: BigInt(next[String(first)]),
        raw: BigInt(next[String(first + 1)]),
        nonce: BigInt(next[String(first + 2)]),
        maker: String(next[String(first + 3)]).toLowerCase(),
      });
    }
    const weighted = rows.map(function (row) { return { price: row.price, weight: row.raw > 1000000000n ? 1000000000n : row.raw }; })
      .sort(function (a, b) { return a.price === b.price ? 0 : (a.price < b.price ? -1 : 1); });
    const totalWeight = weighted.reduce(function (sum, row) { return sum + row.weight; }, 0n);
    let through = 0n;
    let candidate = 0n;
    for (let i = 0; i < weighted.length; i++) {
      const below = through;
      through += weighted[i].weight;
      if (2n * below < totalWeight && 2n * through >= totalWeight) { candidate = weighted[i].price; break; }
    }
    if (candidate <= 0n) throw new Error('Could not derive the capped weighted-median fill price.');
    const rawVolume = rows.reduce(function (sum, row) { return sum + row.raw; }, 0n);
    const nonces = rows.map(function (row) { return row.nonce; });
    const lowNonce = nonces.reduce(function (a, b) { return a < b ? a : b; });
    const highNonce = nonces.reduce(function (a, b) { return a > b ? a : b; });
    const mode = Number(BigInt(next[String(p.MODE)]));

    next[String(p.MARKET_CANDIDATE_ATOMS)] = candidate.toString();
    next[String(p.LATEST_ELIGIBLE_FILL_NONCE)] = nextNonce.toString();
    next[String(p.STALE_AFTER)] = '120';
    next[String(p.PRICE_NONCE)] = nextNonce.toString();
    next[String(p.OBSERVATION_COUNT)] = String(count);
    next[String(p.NEXT_RING_CURSOR)] = String((cursor + 1) % 21);
    next[String(p.WEIGHTED_MEDIAN_ATOMS)] = candidate.toString();
    next[String(p.RAW_BASE_VOLUME_ATOMS)] = rawVolume.toString();
    next[String(p.OBSERVATION_NONCE_SPAN)] = (highNonce - lowNonce + 1n).toString();
    next[String(p.DISTINCT_MAKER_COUNT)] = String(new Set(rows.map(function (row) { return row.maker; })).size);
    next[String(p.HISTORY_COMMITMENT)] = await tv81HashHexPair(next[String(p.HISTORY_COMMITMENT)], operationId);
    if (mode === 1) {
      next[String(p.STATUS)] = count === 21 ? '2' : '1';
    } else if (mode === 2 || mode === 3) {
      next[String(p.ACTIVE_PRICE_ATOMS)] = candidate.toString();
      next[String(p.EFFECTIVE_STATE_NONCE)] = nextNonce.toString();
      next[String(p.STATUS)] = count === 21 ? '3' : '1';
    } else {
      throw new Error('The market price-state mode is unsupported: ' + mode + '.');
    }
    return { eligible: true, state: next, nextNonce: nextNonce.toString(), candidateAtoms: candidate.toString() };
  }

  async function tv81BuildOrderFillPlan(orderCoin, priceCoin, fillBaseAtoms, takerReceiveAddress) {
    const o = TV81_ORDER_STATE;
    const order = tv81DenseCoinState(orderCoin, 0, 24);
    const sideNumber = Number(BigInt(order[String(o.SIDE)]));
    const side = sideNumber === 1 ? 'ASK' : (sideNumber === 2 ? 'BID' : '');
    if (!side) throw new Error('The order side is invalid.');
    const fill = BigInt(fillBaseAtoms);
    const remainingBefore = BigInt(order[String(o.REMAINING_BASE_ATOMS)]);
    const filledBefore = BigInt(order[String(o.CUM_FILLED_BASE)]);
    const original = BigInt(order[String(o.ORIGINAL_BASE_ATOMS)]);
    const price = BigInt(order[String(o.PRICE_ATOMS)]);
    if (fill <= 0n || fill > remainingBefore) throw new Error('The fill quantity exceeds the live order remainder.');
    if (filledBefore + remainingBefore !== original) throw new Error('The live order quantity state is inconsistent.');
    const cumulativeAfter = filledBefore + fill;
    const quoteBefore = tv81CumulativeQuote(side, filledBefore, price);
    const quoteAfter = tv81CumulativeQuote(side, cumulativeAfter, price);
    const quoteDelta = quoteAfter - quoteBefore;
    if (quoteDelta <= 0n) throw new Error('The requested fill rounds to zero quote atoms.');
    if (BigInt(order[String(o.CUM_QUOTE)]) !== quoteBefore) throw new Error('The live order cumulative quote is inconsistent.');
    const remainingAfter = remainingBefore - fill;
    const escrowBefore = BigInt(order[String(o.CURRENT_ESCROW)]);
    const escrowAfter = side === 'ASK' ? remainingAfter : escrowBefore - quoteDelta;
    if (escrowAfter < 0n || (remainingAfter > 0n && escrowAfter === 0n)) {
      throw new Error('The partial fill would leave an unusable order remainder.');
    }
    const taker = String(takerReceiveAddress || '').toLowerCase();
    if (!/^0x[0-9a-f]+$/.test(taker)) throw new Error('The taker receive address is invalid.');
    const idValues = [String(order[String(o.ORDER_ID)]).toLowerCase(), String(orderCoin.coinid || '').toLowerCase(), cumulativeAfter.toString(), taker];
    const encoded = idValues.map(function (v) { return String(v).length + ':' + v; }).join('|');
    const operationId = await sha256HexUtf8('stables|tv81|fill|v1|4|' + encoded + '\n');
    order[String(o.REMAINING_BASE_ATOMS)] = remainingAfter.toString();
    order[String(o.CUM_FILLED_BASE)] = cumulativeAfter.toString();
    order[String(o.CURRENT_ESCROW)] = escrowAfter.toString();
    order[String(o.CUM_QUOTE)] = quoteAfter.toString();
    order[String(o.REQUESTED_FILL_BASE)] = fill.toString();
    order[String(o.TAKER_RECEIVE)] = taker;
    order[String(o.ACTION)] = '1';
    order[String(o.OPERATION_ID)] = operationId;
    const priceAdvance = await tv81AdvancePriceStateForFill(priceCoin, order, fill, operationId);
    const baseToken = String(order[String(o.BASE_TOKEN_ID)]).toLowerCase();
    const quoteToken = String(order[String(o.QUOTE_TOKEN_ID)]).toLowerCase();
    return {
      kind: 'TV81_ORDER_FILL', operationId: operationId, side: side,
      marketId: order[String(o.MARKET_ID)], orderId: order[String(o.ORDER_ID)],
      orderCoinId: String(orderCoin.coinid), priceStateCoinId: String(priceCoin.coinid),
      priceAtoms: price.toString(), fillBaseAtoms: fill.toString(), quoteAtoms: quoteDelta.toString(),
      remainingBaseAtoms: remainingAfter.toString(), terminal: remainingAfter === 0n,
      makerAddress: String(order[String(o.MAKER_RECEIVE)]), takerAddress: taker,
      paymentTokenId: side === 'ASK' ? quoteToken : baseToken,
      paymentAtoms: side === 'ASK' ? quoteDelta.toString() : fill.toString(),
      receiveTokenId: side === 'ASK' ? baseToken : quoteToken,
      receiveAtoms: side === 'ASK' ? fill.toString() : quoteDelta.toString(),
      continuationTokenId: String(order[String(o.ESCROW_TOKEN_ID)]).toLowerCase(),
      continuationAtoms: escrowAfter.toString(), orderState: order,
      priceState: priceAdvance.state, previousPriceNonce: String(readStatePort(priceCoin, TV81_PRICE_STATE.PRICE_NONCE)),
      nextPriceNonce: priceAdvance.nextNonce || String(readStatePort(priceCoin, TV81_PRICE_STATE.PRICE_NONCE)),
      expectedHistoryCommitment: priceAdvance.state[String(TV81_PRICE_STATE.HISTORY_COMMITMENT)],
      priceObservationEligible: priceAdvance.eligible,
      priceStateAmount: String(priceCoin.amount || '0.0001'),
    };
  }

  async function tv81LoadOrderCoin(orderCoinId) {
    const data = await tv81CoinsById(String(orderCoinId));
    const coins = Array.isArray(data) ? data : (data && Array.isArray(data.coins) ? data.coins : []);
    return coins.find(function (coin) { return coin && !coin.spent; }) || null;
  }

  async function tv81FillOrderOnChain(orderCoinId, fillBaseAtoms) {
    const registry = await tv81AppRegistry();
    const wallet = await fetchTesterWallet();
    const orderCoin = await tv81LoadOrderCoin(orderCoinId);
    if (!orderCoin) throw new Error('The selected order is no longer unspent. Refresh the book.');
    const marketId = Number(tv81StateBigInt(orderCoin, TV81_ORDER_STATE.MARKET_ID, 'order market'));
    const marketCode = marketId === 1 ? 'XWINIWA_WINIWA' : (marketId === 2 ? 'USDW_WINIWA' : '');
    if (!marketCode) throw new Error('The selected order belongs to an unsupported market.');
    const priceCoin = await tv81FindPriceStateCoin(registry, marketCode);
    if (!priceCoin) throw new Error('The current market price-state coin is not visible on this node.');
    const plan = await tv81BuildOrderFillPlan(orderCoin, priceCoin, BigInt(fillBaseAtoms), String(wallet.address).toLowerCase());
    const paymentDisplay = tv81AtomsToDisplay8(BigInt(plan.paymentAtoms));
    const receiveDisplay = tv81AtomsToDisplay8(BigInt(plan.receiveAtoms));
    const paymentLabel = plan.paymentTokenId === xwiniwaTokenId.toLowerCase() ? 'xWiniwa' : 'Winiwa';
    const receiveLabel = plan.receiveTokenId === xwiniwaTokenId.toLowerCase() ? 'xWiniwa' : 'Winiwa';
    const paymentCoins = await gatherUserCoinsWithSettleWait(plan.paymentTokenId, paymentDisplay, paymentLabel);
    const paymentTotal = paymentCoins.reduce(function (sum, coin) { return sum + tokenDisplayToAtoms8(String(coin.tokenamount || '0')); }, 0n);
    const paymentChange = paymentTotal - BigInt(plan.paymentAtoms);
    if (paymentChange < 0n) throw new Error('The wallet payment coins do not cover this fill.');

    const txnId = 'stables_tv81_fill_' + String(orderCoin.coinid).slice(2, 14);
    try { await directOrMdsCmd('txndelete id:' + txnId, 'clearing the previous fill draft', 15000); } catch (_) { /* ignore */ }
    const steps = [
      'txncreate id:' + txnId,
      'txninput id:' + txnId + ' coinid:' + orderCoin.coinid,
      'txninput id:' + txnId + ' coinid:' + priceCoin.coinid,
    ];
    paymentCoins.forEach(function (coin) { steps.push('txninput id:' + txnId + ' coinid:' + coin.coinid); });
    steps.push('txnoutput id:' + txnId + ' amount:' + paymentDisplay + ' address:' + plan.makerAddress + ' tokenid:' + plan.paymentTokenId + ' storestate:false');
    steps.push('txnoutput id:' + txnId + ' amount:' + receiveDisplay + ' address:' + plan.takerAddress + ' tokenid:' + plan.receiveTokenId + ' storestate:false');
    if (!plan.terminal) {
      steps.push('txnoutput id:' + txnId + ' amount:' + tv81AtomsToDisplay8(BigInt(plan.continuationAtoms)) + ' address:' + String(orderCoin.address) + ' tokenid:' + plan.continuationTokenId + ' storestate:true');
    }
    steps.push('txnoutput id:' + txnId + ' amount:' + plan.priceStateAmount + ' address:' + String(priceCoin.address) + ' tokenid:0x00 storestate:true');
    if (paymentChange > 0n) {
      steps.push('txnoutput id:' + txnId + ' amount:' + tv81AtomsToDisplay8(paymentChange) + ' address:' + String(wallet.address) + ' tokenid:' + plan.paymentTokenId + ' storestate:false');
    }
    Object.keys(plan.orderState).forEach(function (port) { steps.push('txnstate id:' + txnId + ' port:' + port + ' value:' + plan.orderState[port]); });
    Object.keys(plan.priceState).forEach(function (port) { steps.push('txnstate id:' + txnId + ' port:' + port + ' value:' + plan.priceState[port]); });
    steps.push('txnstate id:' + txnId + ' port:253 value:0');
    steps.push('txnstate id:' + txnId + ' port:254 value:0');
    steps.push('txnstate id:' + txnId + ' port:255 value:0');
    await directOrMdsCmdBatch(steps, 'building the order fill', 120000);
    await directOrMdsCmd('txnsign id:' + txnId + ' publickey:auto', 'signing the order fill', 180000);
    await directOrMdsCmd('txnbasics id:' + txnId, 'finalizing the order fill', 120000);
    const checkRes = await directOrMdsCmd('txncheck id:' + txnId, 'validating the order fill', 90000);
    const checkBody = mdsPayload(checkRes) || {};
    const valid = checkBody.valid || {};
    if (!valid.scripts || !valid.basic || !valid.mmrproofs) {
      try { console.error('[order-fill] txncheck failed:', JSON.stringify(checkBody)); } catch (_) { /* ignore */ }
      throw new Error('The order could not be completed. Please try again.');
    }
    const postRes = await directOrMdsCmd('txnpost id:' + txnId + ' txndelete:true', 'posting the order fill', 90000);
    const extracted = extractTxidsFromMdsPost(postRes) || {};
    Object.assign(extracted, { operationId: plan.operationId, orderCoinId: plan.orderCoinId, fillPlan: plan });
    _tv81TradeCache.at = 0;
    try {
      if (typeof window.stablesAppendUserActivityRow === 'function') {
        const now = new Date();
        window.stablesAppendUserActivityRow({
          id: 'TV81-FILL-' + plan.operationId.slice(2, 14), dir: 'in', icon: '↙',
          counterparty: 'Order book (xWiniwa/Winiwa)', category: receiveLabel,
          title: plan.side === 'ASK' ? 'Bought xWiniwa' : 'Sold xWiniwa',
          date: now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
          amt: Math.abs(Number(receiveDisplay)), ccy: receiveLabel, fee: 0,
          explorerTxId: extracted.explorerTxId || '', pendingTxnId: extracted.pendingTxnId || '',
          status: extracted.explorerTxId ? 'On-chain' : 'Pending',
          note: 'Paid ' + paymentDisplay + ' ' + paymentLabel + ' at ' + tv81AtomsToDisplay8(BigInt(plan.priceAtoms)) + ' Winiwa per xWiniwa.',
          minimaOnChain: true, localOrigin: true, pendingIncoming: true,
        });
      }
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate([paymentLabel, receiveLabel]);
    } catch (_) { /* ignore */ }
    return extracted;
  }

  async function tv81WaitForFillAdvance(result) {
    const plan = result && result.fillPlan;
    if (!plan) throw new Error('The fill result is missing its reconciliation plan.');
    const registry = await tv81AppRegistry();
    const marketCode = Number(plan.marketId) === 1 ? 'XWINIWA_WINIWA' : 'USDW_WINIWA';
    for (let attempt = 0; attempt < 48; attempt++) {
      const old = await tv81CoinsById(plan.orderCoinId).catch(function () { return null; });
      const rows = Array.isArray(old) ? old : (old && Array.isArray(old.coins) ? old.coins : []);
      const consumed = rows.length === 0 || rows.every(function (coin) { return !!coin.spent; });
      const current = await tv81FindPriceStateCoin(registry, marketCode).catch(function () { return null; });
      const nonce = current ? BigInt(String(readStatePort(current, TV81_PRICE_STATE.PRICE_NONCE) || '0')) : 0n;
      if (consumed && nonce > BigInt(plan.previousPriceNonce)) return true;
      await sleep(5000);
    }
    throw new Error('The fill result is still unknown after waiting for confirmation. Do not resubmit it automatically; refresh the book and Activity first.');
  }

  function tv81PlanMarketSweepFromBook(book, side, requestedAtoms) {
    const buy = side === 'buy';
    const rows = buy ? book.orders.asks : book.orders.bids;
    let remaining = BigInt(requestedAtoms);
    let quoteTotal = 0n;
    const fills = [];
    for (let i = 0; i < rows.length && remaining > 0n; i++) {
      const order = rows[i];
      const available = BigInt(order.remainingBaseAtoms);
      const take = available < remaining ? available : remaining;
      const before = BigInt(order.originalBaseAtoms) - available;
      const q = tv81CumulativeQuote(order.side, before + take, BigInt(order.priceAtoms))
        - tv81CumulativeQuote(order.side, before, BigInt(order.priceAtoms));
      if (q <= 0n) continue;
      fills.push({ orderCoinId: order.coinId, fillBaseAtoms: take.toString(), priceAtoms: order.priceAtoms, quoteAtoms: q.toString() });
      quoteTotal += q;
      remaining -= take;
    }
    if (remaining > 0n) throw new Error('The live order book cannot fill the full requested size. Available depth is ' + tv81AtomsToDisplay8(BigInt(requestedAtoms) - remaining) + ' xWiniwa.');
    return {
      side: side, requestedBaseAtoms: String(requestedAtoms), fills: fills, quoteTotalAtoms: quoteTotal.toString(),
      worstPriceAtoms: fills.length ? fills[fills.length - 1].priceAtoms : null,
    };
  }

  const TV81_SWEEP_STORAGE_KEY = 'stables_tv81_market_sweep_v1';

  function tv81ReadSweepJournal() {
    try {
      const j = JSON.parse(localStorage.getItem(TV81_SWEEP_STORAGE_KEY) || 'null');
      return j && j.schema === 1 ? j : null;
    } catch (_) { return null; }
  }

  function tv81WriteSweepJournal(journal) {
    journal.updatedAt = Date.now();
    try { localStorage.setItem(TV81_SWEEP_STORAGE_KEY, JSON.stringify(journal)); } catch (_) { /* rebuildable cache only */ }
    return journal;
  }

  async function tv81NewSweepJournal(preview) {
    const wallet = await fetchTesterWallet();
    const seed = [String(wallet.address).toLowerCase(), preview.side, preview.requestedBaseAtoms,
      preview.worstPriceAtoms, String(Date.now())].join('|');
    return tv81WriteSweepJournal({
      schema: 1,
      sweepId: await sha256HexUtf8('stables|tv81|market-sweep|v1|' + seed + '\n'),
      status: 'ACTIVE',
      side: preview.side,
      requestedBaseAtoms: String(preview.requestedBaseAtoms),
      remainingBaseAtoms: String(preview.requestedBaseAtoms),
      worstPriceAtoms: String(preview.worstPriceAtoms),
      quoteTotalAtomsAtConfirmation: String(preview.quoteTotalAtoms || '0'),
      completed: [],
      pending: null,
      createdAt: Date.now(),
    });
  }

  async function tv81SettleSweepPending(journal) {
    if (!journal.pending) return journal;
    const pending = journal.pending;
    // The journal is written before confirmation wait. Reconciliation uses only chain truth:
    // old order consumed plus a strictly newer authenticated price nonce. Until both are true,
    // no second fill may be posted.
    await tv81WaitForFillAdvance({ fillPlan: pending.fillPlan });
    const remaining = BigInt(journal.remainingBaseAtoms) - BigInt(pending.fillPlan.fillBaseAtoms);
    if (remaining < 0n) throw new Error('The saved market sweep has an invalid remaining quantity.');
    journal.remainingBaseAtoms = remaining.toString();
    journal.completed.push({
      orderCoinId: pending.fillPlan.orderCoinId,
      operationId: pending.fillPlan.operationId,
      fillBaseAtoms: pending.fillPlan.fillBaseAtoms,
      pendingTxnId: pending.pendingTxnId || '',
      explorerTxId: pending.explorerTxId || '',
      confirmedAt: Date.now(),
    });
    journal.pending = null;
    return tv81WriteSweepJournal(journal);
  }

  async function tv81ExecuteMarketSweep(preview) {
    if (!preview || !/^(buy|sell)$/.test(String(preview.side || ''))
      || !/^[1-9][0-9]*$/.test(String(preview.requestedBaseAtoms || ''))
      || !/^[1-9][0-9]*$/.test(String(preview.worstPriceAtoms || ''))) {
      throw new Error('The confirmed market-sweep preview is invalid.');
    }
    let journal = tv81ReadSweepJournal();
    if (journal && journal.status === 'ACTIVE') {
      const same = journal.side === preview.side
        && journal.requestedBaseAtoms === String(preview.requestedBaseAtoms)
        && journal.worstPriceAtoms === String(preview.worstPriceAtoms);
      if (!same) throw new Error('A previous market sweep is unfinished. Resume it before starting another.');
    } else {
      journal = await tv81NewSweepJournal(preview);
    }
    if (journal.pending) journal = await tv81SettleSweepPending(journal);
    while (BigInt(journal.remainingBaseAtoms) > 0n) {
      const remaining = BigInt(journal.remainingBaseAtoms);
      const book = await tv81ReadOrderBook('XWINIWA_WINIWA');
      const rows = journal.side === 'buy' ? book.orders.asks : book.orders.bids;
      const worst = BigInt(journal.worstPriceAtoms);
      const order = rows.find(function (row) {
        const price = BigInt(row.priceAtoms);
        return journal.side === 'buy' ? price <= worst : price >= worst;
      });
      if (!order) {
        throw new Error('Market depth changed after ' + journal.completed.length
          + ' confirmed fill(s). No compatible order remains inside the confirmed price limit.');
      }
      const available = BigInt(order.remainingBaseAtoms);
      const take = available < remaining ? available : remaining;
      const result = await tv81FillOrderOnChain(order.coinId, take);
      journal.pending = {
        fillPlan: result.fillPlan,
        pendingTxnId: result.pendingTxnId || '',
        explorerTxId: result.explorerTxId || '',
        postedAt: Date.now(),
      };
      tv81WriteSweepJournal(journal);
      journal = await tv81SettleSweepPending(journal);
    }
    journal.status = 'COMPLETED';
    journal.completedAt = Date.now();
    tv81WriteSweepJournal(journal);
    await tv81RefreshOrderBookPanel();
    return { sweepId: journal.sweepId, completedFills: journal.completed.length, requestedBaseAtoms: journal.requestedBaseAtoms };
  }

  async function tv81ResumeMarketSweep() {
    const journal = tv81ReadSweepJournal();
    if (!journal || journal.status !== 'ACTIVE') throw new Error('There is no unfinished market sweep to resume.');
    return tv81ExecuteMarketSweep({
      side: journal.side,
      requestedBaseAtoms: journal.requestedBaseAtoms,
      worstPriceAtoms: journal.worstPriceAtoms,
      quoteTotalAtoms: journal.quoteTotalAtomsAtConfirmation,
    });
  }

  // ============================================================================================
  // TV81 D13 par vault (deployed 2026-07-14): xWiniwa mint/burn at exactly 1:1 while no
  // stablecoin exists. One keyless covenant address holds the balance state coin (ports 60-89),
  // the unissued xWiniwa reserve (ports 25-28), and the Winiwa pool coin. The executor mirrors
  // the proven faucet-claim discipline: build -> sign -> basics -> txncheck (scripts+basic+
  // mmrproofs gate) -> post. Behavior is unverified under D07 until a user operates it.
  // ============================================================================================
  const TV81_VAULT_TXN_ID = 'stables_tv81_vault_op';

  // Prefetched vault display identity for synchronous UI (confirm modals). Populated once the
  // registry projection loads; empty until then, never a hardcoded identity.
  let tv81VaultMiniaddr = '';
  if (tv81Exclusive) {
    try {
      tv81AppRegistry().then(function (r) {
        tv81VaultMiniaddr = String((r.xwiniwa_vault || {}).miniaddress || (r.xwiniwa_vault || {}).address || '');
        // Protocol infra addresses must never import as user coins (mirror exclusion set).
        // kinds map drives tx-mirror covenant row titles (faucet / xwiniwa / usdw).
        const infra = new Set();
        const kinds = Object.create(null);
        const add = function (v, kind) {
          const s = String(v || '').trim().toLowerCase();
          if (!s) return;
          infra.add(s);
          if (kind && !kinds[s]) kinds[s] = kind;
        };
        add((r.xwiniwa_vault || {}).address, 'xwiniwa');
        add((r.xwiniwa_vault || {}).miniaddress, 'xwiniwa');
        add((r.price_state || {}).engine_address, 'usdw');
        add((r.order_book || {}).engine_address, 'usdw');
        add((r.faucet || {}).address, 'faucet');
        add((r.faucet || {}).miniaddress, 'faucet');
        try {
          const markets = r.markets || {};
          Object.keys(markets).forEach(function (mk) {
            add((markets[mk] || {}).order_address, 'usdw');
          });
        } catch (_) { /* ignore */ }
        // The direct-take CLOB covenant (order coins = the book) and the book-anchor +
        // book-source infra: their coins are TRACKED (trackall) so a published page/head dust
        // coin (0.000001 Winiwa) or an order-escrow coin would otherwise import as a phantom
        // "Received Winiwa · On-chain sender" activity row (founder finding 2026-07-24). They are
        // protocol infrastructure, never user payments — exclude from the activity/incoming feed.
        add((r.direct_market || {}).order_address, 'book');
        add((r.book_anchor || {}).head_address, 'book');
        add((r.book_anchor || {}).page_address, 'book');
        add((r.book_sources || {}).registry_address, 'book');
        window.__STABLES_TV81_INFRA_ADDRS__ = infra;
        window.__STABLES_TV81_INFRA_KINDS__ = kinds;
      }).catch(function () { /* stays empty; executor fails closed on its own read */ });
    } catch (_) { /* ignore */ }
  }
  function xwiniwaCounterpartyAddress() {
    return tv81Exclusive ? tv81VaultMiniaddr : (xwiniwaCovenantMiniaddress || xwiniwaCovenantAddress);
  }

  async function tv81VaultCoins(vault) {
    let coins = await tv81CoinsAtAddress(vault.address);
    // Merge coins recovered from an on-chain snapshot. `coins address:` searches only the UNPRUNED
    // chain, and the vault's coins are older than that window on any node that did not track the
    // vault from deployment, so the scan returns nothing even after the proofs were imported. This
    // is the same per-coin merge the book uses; each coin is re-validated by the port checks below,
    // so it adds no trust. Without it, minting refuses on every fresh node (founder, 2026-07-26).
    try {
      const extra = (window.__TV81_SNAPSHOT_COINS__ || {})[String(vault.address).toLowerCase()] || [];
      const have = {};
      coins.forEach(function (c) { if (c && c.coinid) have[String(c.coinid).toLowerCase()] = true; });
      for (let i = 0; i < extra.length; i++) {
        if (have[String(extra[i]).toLowerCase()]) continue;
        try {
          const one = await mdsCmdData('coins coinid:' + extra[i]);
          const c = Array.isArray(one) ? one[0] : one;
          if (c && c.coinid) coins = coins.concat([c]);
        } catch (_) { /* a spent or missing snapshot coin is simply not merged */ }
      }
    } catch (_) { /* merging is best-effort; the scan result still stands */ }
    const unspent = coins.filter(function (c) { return c && !c.spent; });
    const byAtoms = function (a, b) {
      const x = tokenDisplayToAtoms8(String(a.tokenamount || a.amount || '0'));
      const y = tokenDisplayToAtoms8(String(b.tokenamount || b.amount || '0'));
      return x === y ? 0 : (x > y ? -1 : 1);
    };
    const reserve = unspent.filter(function (c) {
      return String(c.tokenid).toLowerCase() === xwiniwaTokenId.toLowerCase() && String(readStatePort(c, 27)) === '8102';
    }).sort(byAtoms)[0] || null;
    const balances = unspent.filter(function (c) {
      return String(c.tokenid).toLowerCase() === '0x00' && String(readStatePort(c, 62)) === '8107';
    }).sort(function (a, b) {
      const x = BigInt(String(readStatePort(a, 88) || '0'));
      const y = BigInt(String(readStatePort(b, 88) || '0'));
      return x === y ? 0 : (x > y ? -1 : 1);
    });
    const pool = unspent.filter(function (c) {
      return String(c.tokenid).toLowerCase() === winiwaTokenId.toLowerCase();
    }).sort(byAtoms)[0] || null;
    return { reserve: reserve, balance: balances[0] || null, pool: pool };
  }

  function publishXwiniwaVaultProofState(state, details) {
    const prev = window.__STABLES_XWINIWA_VAULT_PROOF_STATE__ || {};
    const now = Date.now();
    const next = Object.assign({
      state: state || 'syncing',
      updatedAt: now,
      lastReadyAt: state === 'ready' ? now : Number(prev.lastReadyAt || 0),
      canMint: false,
      canBurn: false
    }, details || {});
    window.__STABLES_XWINIWA_VAULT_PROOF_STATE__ = next;
    try { if (typeof window.stablesApplyReleaseProofUi === 'function') window.stablesApplyReleaseProofUi(); } catch (_) { /* fail closed */ }
    return next;
  }
  window.stablesPublishXwiniwaVaultProofState = publishXwiniwaVaultProofState;
  if (!window.__STABLES_XWINIWA_VAULT_PROOF_STATE__) {
    publishXwiniwaVaultProofState('syncing', { reason: 'Waiting for the first xWiniwa vault proof.' });
  }

  // Read-only vault projection for surfaces: reserve, pooled Winiwa, issued xWiniwa, par NAV.
  async function tv81ReadVaultState() {
    const registry = await tv81AppRegistry();
    const vault = registry.xwiniwa_vault;
    if (!vault || !vault.address) return { deployed: false, status: 'NOT_DEPLOYED' };
    const coins = await tv81VaultCoins(vault);
    if (!coins.balance || !coins.reserve) {
      return { deployed: false, status: 'VAULT_COINS_NOT_VISIBLE', reason: 'The vault state coins are not visible yet; wait for chain sync.' };
    }
    return {
      deployed: true,
      status: 'DEPLOYED_UNVERIFIED',
      address: vault.address,
      parLaw: vault.par_law,
      reserveXwiniwa: String(coins.reserve.tokenamount || '0'),
      poolWiniwa: coins.pool ? String(coins.pool.tokenamount || '0') : '0',
      issuedXwiniwa: tv81AtomsToDisplay8(BigInt(String(readStatePort(coins.balance, 68) || '0'))),
      balanceNonce: String(readStatePort(coins.balance, 88) || '0'),
      navPar: '1.0'
    };
  }

  // Execute one par vault operation through the node. op 0 = deposit Winiwa -> mint xWiniwa,
  // op 1 = burn xWiniwa -> receive Winiwa; `amount` is the xWiniwa quantity either way (par 1:1).
  async function tv81VaultOnChain(op, amount) {
    const registry = await tv81AppRegistry();
    const vault = registry.xwiniwa_vault;
    if (!vault || !vault.address || !vault.script) {
      throw new Error('The xWiniwa vault is not recorded in the TestV008 registry projection.');
    }
    if (!winiwaTokenId || !xwiniwaTokenId) throw new Error('TV81 token identities are missing.');
    const wallet = await fetchTesterWallet();
    const atoms = tokenDisplayToAtoms8(String(amount));
    if (atoms <= 0n) throw new Error('Enter a positive amount.');
    const amtDisplay = tv81AtomsToDisplay8(atoms);

    await ensureCovenantTracked(vault.address, vault.script, 'tracking the xWiniwa vault covenant', 30000);
    const coins = await tv81VaultCoins(vault);
    if (!coins.balance) throw new Error('The vault balance state coin is not visible yet. Wait for chain sync and retry.');
    if (!coins.reserve) throw new Error('The xWiniwa reserve coin is not visible yet. Wait for chain sync and retry.');

    const bal = function (port) {
      const value = readStatePort(coins.balance, port);
      if (value == null) throw new Error('The vault balance state coin is missing port ' + port + '.');
      return String(value);
    };
    if (bal(66) !== '0' || bal(81) !== '0') {
      throw new Error('The par vault only operates while no stablecoin exists; this state coin reports otherwise.');
    }

    const reserveAtoms = tokenDisplayToAtoms8(String(coins.reserve.tokenamount || '0'));
    const poolAtoms = coins.pool ? tokenDisplayToAtoms8(String(coins.pool.tokenamount || '0')) : 0n;
    const prev68 = BigInt(bal(68));
    const prev82 = BigInt(bal(82));
    const prev88 = BigInt(bal(88));
    const reservePrevNonce = BigInt(String(readStatePort(coins.reserve, 28) || '0'));

    let userCoins;
    let poolIn = 0n;
    if (op === 0) {
      // Deposit must leave at least one atom in the reserve (covenant law).
      if (atoms >= reserveAtoms) throw new Error('Amount exceeds the issuable xWiniwa reserve.');
      poolIn = poolAtoms; // merge the canonical pool coin whenever one exists
      userCoins = await gatherUserCoinsWithSettleWait(winiwaTokenId, amtDisplay, 'Winiwa');
    } else {
      if (op !== 1) throw new Error('Unknown vault operation.');
      if (atoms > prev68) throw new Error('Amount exceeds the issued xWiniwa supply.');
      if (!coins.pool || poolAtoms < atoms) {
        throw new Error('The Winiwa pool coin cannot cover this burn yet. Try a smaller amount.');
      }
      poolIn = poolAtoms;
      userCoins = await gatherUserCoinsWithSettleWait(xwiniwaTokenId, amtDisplay, 'xWiniwa');
    }
    const userTotalAtoms = userCoins.reduce(function (s, c) { return s + tokenDisplayToAtoms8(String(c.tokenamount || '0')); }, 0n);
    if (userTotalAtoms < atoms) throw new Error('Not enough ' + (op === 0 ? 'Winiwa' : 'xWiniwa') + ' to cover this operation.');
    const changeAtoms = userTotalAtoms - atoms;

    const next68 = op === 0 ? prev68 + atoms : prev68 - atoms;
    const next82 = op === 0 ? prev82 - atoms : prev82 + atoms;
    const next63 = op === 0 ? poolIn + atoms : poolIn - atoms;
    const recipient = String(wallet.address).toLowerCase();
    const generationId = String(registry.generation_id || '').toLowerCase();
    const idValues = [generationId, String(op === 0 ? 1 : 2), (prev88 + 1n).toString(), recipient, atoms.toString()];
    const encoded = idValues.map(function (v) { return String(v).length + ':' + v; }).join('|');
    const operationId = await sha256HexUtf8('stables|tv81|vault-op|v1|5|' + encoded + '\n');

    const ports = {
      25: '1', 26: generationId, 27: '8102', 28: (reservePrevNonce + 1n).toString(),
      29: op === 0 ? '1' : '2', 30: recipient, 31: atoms.toString(), 32: atoms.toString(),
      33: operationId, 34: poolIn.toString(),
      60: bal(60), 61: bal(61), 62: bal(62),
      63: next63.toString(), 64: bal(64),
      65: next63.toString(), 66: bal(66), 67: next63.toString(),
      68: next68.toString(), 69: next68 > 0n ? '100000000' : '0',
      70: bal(70), 71: bal(71), 72: bal(72), 73: bal(73), 74: bal(74), 75: bal(75),
      76: bal(76), 77: bal(77), 78: bal(78),
      79: next63.toString(), 80: '0', 81: bal(81),
      82: next82.toString(), 83: bal(83), 84: bal(84), 85: bal(85), 86: bal(86), 87: bal(87),
      88: (prev88 + 1n).toString(), 89: bal(89),
    };

    const stateDust = String(coins.balance.amount || '0.0001');
    try { await directOrMdsCmd('txndelete id:' + TV81_VAULT_TXN_ID, 'clearing the previous vault draft', 15000); } catch (_) { /* ignore */ }
    const steps = [
      'txncreate id:' + TV81_VAULT_TXN_ID,
      'txninput id:' + TV81_VAULT_TXN_ID + ' coinid:' + coins.reserve.coinid,
      'txninput id:' + TV81_VAULT_TXN_ID + ' coinid:' + coins.balance.coinid,
    ];
    if (poolIn > 0n) steps.push('txninput id:' + TV81_VAULT_TXN_ID + ' coinid:' + coins.pool.coinid);
    for (let u = 0; u < userCoins.length; u++) {
      steps.push('txninput id:' + TV81_VAULT_TXN_ID + ' coinid:' + userCoins[u].coinid);
    }
    if (op === 0) {
      const reserveLeft = tv81AtomsToDisplay8(reserveAtoms - atoms);
      steps.push('txnoutput id:' + TV81_VAULT_TXN_ID + ' amount:' + amtDisplay + ' address:' + wallet.address + ' tokenid:' + xwiniwaTokenId + ' storestate:false');
      steps.push('txnoutput id:' + TV81_VAULT_TXN_ID + ' amount:' + reserveLeft + ' address:' + vault.address + ' tokenid:' + xwiniwaTokenId + ' storestate:true');
      steps.push('txnoutput id:' + TV81_VAULT_TXN_ID + ' amount:' + tv81AtomsToDisplay8(next63) + ' address:' + vault.address + ' tokenid:' + winiwaTokenId + ' storestate:false');
      steps.push('txnoutput id:' + TV81_VAULT_TXN_ID + ' amount:' + stateDust + ' address:' + vault.address + ' tokenid:0x00 storestate:true');
      if (changeAtoms > 0n) {
        steps.push('txnoutput id:' + TV81_VAULT_TXN_ID + ' amount:' + tv81AtomsToDisplay8(changeAtoms) + ' address:' + wallet.address + ' tokenid:' + winiwaTokenId + ' storestate:false');
      }
    } else {
      const reservePlus = tv81AtomsToDisplay8(reserveAtoms + atoms);
      steps.push('txnoutput id:' + TV81_VAULT_TXN_ID + ' amount:' + amtDisplay + ' address:' + wallet.address + ' tokenid:' + winiwaTokenId + ' storestate:false');
      steps.push('txnoutput id:' + TV81_VAULT_TXN_ID + ' amount:' + reservePlus + ' address:' + vault.address + ' tokenid:' + xwiniwaTokenId + ' storestate:true');
      if (next63 > 0n) {
        steps.push('txnoutput id:' + TV81_VAULT_TXN_ID + ' amount:' + tv81AtomsToDisplay8(next63) + ' address:' + vault.address + ' tokenid:' + winiwaTokenId + ' storestate:false');
      }
      steps.push('txnoutput id:' + TV81_VAULT_TXN_ID + ' amount:' + stateDust + ' address:' + vault.address + ' tokenid:0x00 storestate:true');
      if (changeAtoms > 0n) {
        steps.push('txnoutput id:' + TV81_VAULT_TXN_ID + ' amount:' + tv81AtomsToDisplay8(changeAtoms) + ' address:' + wallet.address + ' tokenid:' + xwiniwaTokenId + ' storestate:false');
      }
    }
    Object.keys(ports).forEach(function (p) {
      steps.push('txnstate id:' + TV81_VAULT_TXN_ID + ' port:' + p + ' value:' + ports[p]);
    });

    await directOrMdsCmdBatch(steps, 'building the xWiniwa vault transaction', 90000);
    await directOrMdsCmd('txnsign id:' + TV81_VAULT_TXN_ID + ' publickey:auto', 'signing the xWiniwa vault transaction', 180000);
    await directOrMdsCmd('txnbasics id:' + TV81_VAULT_TXN_ID, 'finalizing the xWiniwa vault transaction', 120000);
    const checkRes = await directOrMdsCmd('txncheck id:' + TV81_VAULT_TXN_ID, 'validating the xWiniwa vault transaction', 90000);
    const checkBody = mdsPayload(checkRes) || {};
    const valid = checkBody.valid || {};
    const flags = 'scripts=' + valid.scripts + ' basic=' + valid.basic
      + ' signatures=' + valid.signatures + ' mmrproofs=' + valid.mmrproofs;
    try { console.log('[tv81-vault] txncheck flags:', flags); } catch (_) { /* ignore */ }
    if (!valid.scripts || !valid.basic || !valid.mmrproofs) {
      try { console.error('[tv81-vault] txncheck failed:', JSON.stringify(checkBody)); } catch (_) { /* ignore */ }
      if (valid.scripts && valid.basic && !valid.mmrproofs) {
        throw new Error('Your node is still syncing the vault coins. Please wait for syncing to finish and try again.');
      }
      throw new Error('The vault transaction could not be validated. Please try again.');
    }
    const postRes = await directOrMdsCmd('txnpost id:' + TV81_VAULT_TXN_ID + ' txndelete:true', 'posting the xWiniwa vault transaction', 70000);
    const extracted = extractTxidsFromMdsPost(postRes);
    if (!extracted || (!extracted.explorerTxId && !extracted.pendingTxnId)) {
      throw new Error('Vault operation posted but no transaction id was returned. Check Activity or the console.');
    }
    // Orphan-watch fields (covenantWithOrphanRetry): if a competing spend consumes the balance
    // state coin and our output never arrives, the flow rebuilds against fresh chain state.
    extracted.usedStateCoinId = coins.balance.coinid;
    extracted.recipientAddress = wallet.address;
    extracted.outAmt = amtDisplay;
    extracted.outTokenId = op === 0 ? xwiniwaTokenId : winiwaTokenId;
    return extracted;
  }

  // ============================================================================================
  // TV81 Exchange: live xWiniwa/Winiwa order book (P9-05/06/07). Placement is a single send of
  // the escrow to the market-engine address carrying the frozen 0-24 order state; cancellation
  // is a maker-signed spend refunding the whole unfilled escrow. Fill settlement (P7-08) is a
  // later slice; until then the book, placement, and cancel are fully live.
  // ============================================================================================
  const TV81_CANCEL_TXN_ID = 'stables_tv81_order_cancel';
  let _tv81PubkeyCache = '';
  async function tv81WalletPubkey() {
    if (_tv81PubkeyCache) return _tv81PubkeyCache;
    const body = await mdsCmdData('keys');
    const list = Array.isArray(body) ? body : (body && Array.isArray(body.keys) ? body.keys : []);
    const pub = String((list[0] || {}).publickey || '').toLowerCase();
    if (!/^0x[0-9a-f]+$/.test(pub)) throw new Error('Could not resolve a wallet public key for the order.');
    _tv81PubkeyCache = pub;
    return pub;
  }

  async function tv81QuoteOrder(side, priceDisplay, qtyDisplay, makerNonce, fixedIdentity) {
    const identity = fixedIdentity || {};
    let walletAddress = String(identity.makerReceiveAddress || '').toLowerCase();
    if (!/^0x[0-9a-f]+$/.test(walletAddress)) {
      const wallet = await fetchTesterWallet();
      walletAddress = String(wallet.address || '').toLowerCase();
    }
    const refundAddress = String(identity.refundAddress || walletAddress).toLowerCase();
    const pub = /^0x[0-9a-f]+$/.test(String(identity.makerPublicKey || '').toLowerCase())
      ? String(identity.makerPublicKey).toLowerCase()
      : await tv81WalletPubkey();
    return tv81BuildOrderPlacement({
      marketCode: 'XWINIWA_WINIWA',
      side: side,
      enteredPriceAtoms: tokenDisplayToAtoms8(String(priceDisplay)).toString(),
      baseQuantityAtoms: tokenDisplayToAtoms8(String(qtyDisplay)).toString(),
      makerReceiveAddress: walletAddress,
      refundAddress: refundAddress,
      makerPublicKey: pub,
      makerNonce: String(makerNonce == null ? Date.now() : makerNonce)
    });
  }

  async function tv81PlaceOrderOnChain(plan) {
    if (!plan || plan.kind !== 'TV81_ORDER_PLACEMENT') throw new Error('No order plan to place.');
    const res = await directOrMdsCmd(plan.command, 'placing the order on-chain', 90000);
    const extracted = extractTxidsFromMdsPost(res);
    try {
      if (typeof window.stablesAppendUserActivityRow === 'function') {
        const now = new Date();
        window.stablesAppendUserActivityRow({
          id: 'TV81-ORDER-' + plan.orderId.slice(2, 14),
          dir: 'out',
          icon: '↗',
          counterparty: 'Order book (xWiniwa/Winiwa)',
          category: plan.side === 'ASK' ? 'xWiniwa' : 'Winiwa',
          title: plan.side === 'ASK' ? 'Sell order placed' : 'Buy order placed',
          date: now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
          amt: -Math.abs(Number(plan.escrow.display)),
          ccy: plan.side === 'ASK' ? 'xWiniwa' : 'Winiwa',
          fee: 0,
          explorerTxId: (extracted && extracted.explorerTxId) || '',
          pendingTxnId: (extracted && extracted.pendingTxnId) || '',
          status: 'Pending',
          note: 'Limit ' + tv81AtomsToDisplay8(BigInt(plan.disclosure.quantizedPriceAtoms)) + ' Winiwa per xWiniwa.',
          minimaOnChain: true,
          localOrigin: true,
          pendingIncoming: false
        });
      }
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    } catch (_) { /* ignore */ }
    try { if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate([plan.side === 'ASK' ? 'xWiniwa' : 'Winiwa']); } catch (_) { /* ignore */ }
    try { if (typeof navigate === 'function') navigate('wallet'); } catch (_) { /* ignore */ }
    return extracted;
  }

  function tv81AppendCancelActivityRow(coin, escrowAmt, extracted) {
    try {
      if (typeof window.stablesAppendUserActivityRow === 'function') {
        const now = new Date();
        window.stablesAppendUserActivityRow({
          id: 'TV81-CANCEL-' + String(coin.coinid).slice(2, 14),
          dir: 'in',
          icon: '↙',
          counterparty: 'Order book (xWiniwa/Winiwa)',
          category: 'xWiniwa',
          title: 'Order cancelled',
          date: now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
          amt: Math.abs(Number(escrowAmt)),
          ccy: String(coin.tokenid).toLowerCase() === xwiniwaTokenId.toLowerCase() ? 'xWiniwa' : 'Winiwa',
          fee: 0,
          explorerTxId: (extracted && extracted.explorerTxId) || '',
          status: 'Pending',
          note: 'Unfilled escrow returns to your wallet.',
          minimaOnChain: true,
          localOrigin: true,
          pendingIncoming: true
        });
      }
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    } catch (_) { /* ignore */ }
  }

  async function tv81CancelOrderOnChain(orderCoinId) {
    const registry = await tv81AppRegistry();
    const data = await tv81CoinsById(String(orderCoinId));
    const coins = Array.isArray(data) ? data : (data && Array.isArray(data.coins) ? data.coins : []);
    const coin = coins.find(function (c) { return c && !c.spent; });
    if (!coin) throw new Error('This order coin is no longer unspent; refresh the book.');
    const escrowAmt = String(coin.tokenamount || coin.amount);
    try { await directOrMdsCmd('txndelete id:' + TV81_CANCEL_TXN_ID, 'clearing the previous cancel draft', 15000); } catch (_) { /* ignore */ }
    // Direct-take order coin (tv81_order_direct_v1): port 2 side (1=BUY/2=SELL), 5 maker, 6 refund,
    // 10 maker public key. Cancel = maker-signed spend returning the escrow to the refund address
    // with action flag STATE(23)=2 (the proven recipe in tools/tv81/order-direct.mjs cancel).
    const dcfg = tv81DirectCfg(registry);
    const isDirect = !!dcfg
      && (String(readStatePort(coin, 2)) === '1' || String(readStatePort(coin, 2)) === '2')
      && String(readStatePort(coin, 8) || '').toLowerCase() === String(dcfg.base_token_id || '').toLowerCase()
      && String(readStatePort(coin, 9) || '').toLowerCase() === String(dcfg.quote_token_id || '').toLowerCase();
    let makerKey;
    if (isDirect) {
      const refundAddr = String(readStatePort(coin, 6) || '');
      if (!refundAddr) throw new Error('The order coin does not carry a refund address.');
      makerKey = String(readStatePort(coin, 10) || '').toLowerCase();
      const steps = [
        'txncreate id:' + TV81_CANCEL_TXN_ID,
        'txninput id:' + TV81_CANCEL_TXN_ID + ' coinid:' + coin.coinid,
        'txnoutput id:' + TV81_CANCEL_TXN_ID + ' amount:' + escrowAmt + ' address:' + refundAddr + ' tokenid:' + coin.tokenid + ' storestate:false',
      ];
      for (let i = 0; i <= 8; i++) steps.push('txnstate id:' + TV81_CANCEL_TXN_ID + ' port:' + (30 + i) + ' value:0'); // refund sits at output 0 for any @INPUT
      steps.push('txnstate id:' + TV81_CANCEL_TXN_ID + ' port:23 value:2'); // action = cancel
      await directOrMdsCmdBatch(steps, 'building the cancel transaction', 60000);
      if (!/^0x[0-9a-f]+$/.test(makerKey)) throw new Error('The order coin does not carry a maker key.');
      let signKey = makerKey;
      try {
        const kb = await mdsCmdData('keys');
        const klist = Array.isArray(kb) ? kb : (kb && Array.isArray(kb.keys) ? kb.keys : []);
        const hit = klist.find(function (k) { return String((k || {}).publickey || '').toLowerCase() === makerKey; });
        if (hit) signKey = String(hit.publickey);
      } catch (_) { /* fall back to the stored form */ }
      await directOrMdsCmd('txnbasics id:' + TV81_CANCEL_TXN_ID, 'finalizing the cancel', 120000);
      await directOrMdsCmd('txnsign id:' + TV81_CANCEL_TXN_ID + ' publickey:' + signKey, 'signing the cancel', 235000);
      // txnbasics may have added a MINIMA fee coin that also needs a signature; best-effort.
      try { await directOrMdsCmd('txnsign id:' + TV81_CANCEL_TXN_ID + ' publickey:auto', 'signing the fee coin', 120000); } catch (_) { /* ignore */ }
      const checkRes = await directOrMdsCmd('txncheck id:' + TV81_CANCEL_TXN_ID, 'validating the cancel', 90000);
      const valid = (mdsPayload(checkRes) || {}).valid || {};
      if (!valid.scripts || !valid.basic || !valid.mmrproofs) {
        try { console.error('[cancel-order] txncheck failed:', JSON.stringify(valid)); } catch (_) { /* ignore */ }
        throw new Error('The cancellation could not be validated. Please try again.');
      }
      const postRes = await directOrMdsCmd('txnpost id:' + TV81_CANCEL_TXN_ID + ' txndelete:true', 'posting the cancel', 70000);
      const extractedDirect = extractTxidsFromMdsPost(postRes);
      tv81AppendCancelActivityRow(coin, escrowAmt, extractedDirect);
      // The returned escrow must reach the balance detail at once: clear the cached details so the
      // next balance sync rebuilds them (mint canon; the Trade ticket Available line reads that
      // detail and otherwise keeps the pre-cancel value for minutes - proven on-device 2026-07-22).
      try { clearTestTokenBalanceDetails(['Winiwa', 'xWiniwa']); } catch (_) { /* ignore */ }
      try { if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate([String(coin.tokenid).toLowerCase() === xwiniwaTokenId.toLowerCase() ? 'xWiniwa' : 'Winiwa']); } catch (_) { /* ignore */ }
      return extractedDirect;
    }
    if (String(readStatePort(coin, 2)) !== '8111') throw new Error('Not an order coin.');
    const refundAddr = String(readStatePort(coin, 14) || '');
    const steps = [
      'txncreate id:' + TV81_CANCEL_TXN_ID,
      'txninput id:' + TV81_CANCEL_TXN_ID + ' coinid:' + coin.coinid,
      'txnoutput id:' + TV81_CANCEL_TXN_ID + ' amount:' + escrowAmt + ' address:' + refundAddr + ' tokenid:' + coin.tokenid + ' storestate:false',
      'txnstate id:' + TV81_CANCEL_TXN_ID + ' port:23 value:2',
    ];
    await directOrMdsCmdBatch(steps, 'building the cancel transaction', 60000);
    // The only input is a script coin, so publickey:auto finds nothing to sign and the covenant's
    // SIGNEDBY(maker) check fails. Sign explicitly with the order's pinned maker key (port 13).
    makerKey = String(readStatePort(coin, 13) || '').toLowerCase();
    if (!/^0x[0-9a-f]+$/.test(makerKey)) throw new Error('The order coin does not carry a maker key.');
    // txnsign looks keys up case-sensitively; resolve the wallet's original-cased key.
    let signKey = makerKey;
    try {
      const kb = await mdsCmdData('keys');
      const klist = Array.isArray(kb) ? kb : (kb && Array.isArray(kb.keys) ? kb.keys : []);
      const hit = klist.find(function (k) { return String((k || {}).publickey || '').toLowerCase() === makerKey; });
      if (hit) signKey = String(hit.publickey);
    } catch (_) { /* fall back to the stored form */ }
    await directOrMdsCmd('txnsign id:' + TV81_CANCEL_TXN_ID + ' publickey:' + signKey, 'signing the cancel', 120000);
    await directOrMdsCmd('txnbasics id:' + TV81_CANCEL_TXN_ID, 'finalizing the cancel', 60000);
    const checkRes = await directOrMdsCmd('txncheck id:' + TV81_CANCEL_TXN_ID, 'validating the cancel', 60000);
    const valid = (mdsPayload(checkRes) || {}).valid || {};
    if (!valid.scripts || !valid.basic || !valid.mmrproofs) {
      try { console.error('[cancel-order] txncheck failed:', JSON.stringify(valid)); } catch (_) { /* ignore */ }
      throw new Error('The cancellation could not be validated. Please try again.');
    }
    const postRes = await directOrMdsCmd('txnpost id:' + TV81_CANCEL_TXN_ID + ' txndelete:true', 'posting the cancel', 70000);
    const extracted = extractTxidsFromMdsPost(postRes);
    try {
      if (typeof window.stablesAppendUserActivityRow === 'function') {
        const now = new Date();
        window.stablesAppendUserActivityRow({
          id: 'TV81-CANCEL-' + String(coin.coinid).slice(2, 14),
          dir: 'in',
          icon: '↙',
          counterparty: 'Order book (xWiniwa/Winiwa)',
          category: 'xWiniwa',
          title: 'Order cancelled',
          date: now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
          amt: Math.abs(Number(escrowAmt)),
          ccy: String(coin.tokenid).toLowerCase() === xwiniwaTokenId.toLowerCase() ? 'xWiniwa' : 'Winiwa',
          fee: 0,
          explorerTxId: (extracted && extracted.explorerTxId) || '',
          status: 'Pending',
          note: 'Unfilled escrow returns to your wallet.',
          minimaOnChain: true,
          localOrigin: true,
          pendingIncoming: true
        });
      }
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    } catch (_) { /* ignore */ }
    return extracted;
  }

  // --- Trade (CLOB) surface ----------------------------------------------------------------
  function tv81FmtPrice(atoms) { return tv81AtomsToDisplay8(BigInt(String(atoms))); }
  // Number discipline (founder-approved redesign 2026-07-22): one format per role everywhere —
  // prices 4 dp, sizes/totals 2 dp, tabular-aligned by the row CSS. Atoms in, fixed string out.
  /* Grouped for the eye (founder 2026-09-04: commas for thousands, everywhere). Anything that
     needs the exact string for arithmetic or the node keeps using tv81FbaFmt. */
  function tv81G(v, dec) {
    const x = Number(String(v == null ? '' : v).replace(/,/g, ''));
    if (!Number.isFinite(x)) return '0';
    return x.toLocaleString('en-US', {
      minimumFractionDigits: dec == null ? 0 : dec,
      maximumFractionDigits: dec == null ? 8 : dec
    });
  }
  function tv81FmtPx(atoms) { return tv81G(Number(BigInt(String(atoms))) / 1e8, 4); }
  function tv81FmtQty(atoms) { return tv81G(Number(BigInt(String(atoms))) / 1e8, 2); }
  /* Amount fields are grouped as a person types, so their value carries commas. */
  function tv81FieldNum(id) {
    return Number(String((document.getElementById(id) || {}).value || '').replace(/,/g, '')) || 0;
  }
  function tv81GroupField(el) {
    try {
      if (el && typeof window.stablesFormatFinancialAmountInput === 'function') window.stablesFormatFinancialAmountInput(el);
    } catch (_) { /* the raw digits are still right */ }
  }
  let _tv81ObTimer = null;
  const TV81_PAR_ATOMS = 100000000n;
  function tv81SetText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
  const _tv81MidHistory = []; // confirmed trade prices when available; live mid only before the first trade
  let _tv81TradeCache = { at: 0, rows: [] };
  let _tv81OrderEventCache = { at: 0, rows: [] };

  function tv81HistoryTxpows(body) {
    if (!body) return [];
    if (Array.isArray(body)) {
      return body.reduce(function (all, row) {
        return all.concat(Array.isArray(row && row.txpows) ? row.txpows : []);
      }, []);
    }
    return Array.isArray(body.txpows) ? body.txpows : (Array.isArray(body.history) ? body.history : []);
  }

  async function tv81ReadConfirmedTrades(limit) {
    const take = Math.max(1, Math.min(100, Number(limit) || 20));
    if (Date.now() - _tv81TradeCache.at < 4000) return _tv81TradeCache.rows.slice(0, take);
    const registry = await tv81AppRegistry();
    const engine = String(((registry.order_book || {}).engine_address) || '').toLowerCase();
    if (!/^0x[0-9a-f]+$/.test(engine)) throw new Error('The active V2 engine address is missing.');
    const history = await mdsCmdData('history max:100');
    const listed = tv81HistoryTxpows(history);
    const seen = Object.create(null);
    const rows = [];
    for (let i = 0; i < listed.length; i++) {
      let tp = listed[i];
      const txpowId = String((tp || {}).txpowid || '').toLowerCase();
      if (!/^0x[0-9a-f]+$/.test(txpowId) || seen[txpowId]) continue;
      seen[txpowId] = true;
      if (!tp.body || !tp.body.txn) tp = await fetchTxpowById(txpowId);
      const txn = tp && tp.body && tp.body.txn;
      if (!txn || !Array.isArray(txn.inputs) || txn.inputs.length < 2 || !Array.isArray(txn.state)) continue;
      const orderInput = txn.inputs[0];
      const priceInput = txn.inputs[1];
      if (String(orderInput.address || '').toLowerCase() !== engine || String(priceInput.address || '').toLowerCase() !== engine) continue;
      if (String(readStatePort(orderInput, 2) || '') !== '8111' || String(readStatePort(priceInput, 92) || '') !== '8106') continue;
      const nextState = { state: txn.state };
      if (String(readStatePort(nextState, 23) || '') !== '1') continue;
      const onchain = await mdsCmdData('txpow onchain:' + txpowId).catch(function () { return null; });
      if (!onchain || !(onchain.found === true || onchain.found === 'true')) continue;
      try {
        const sideCode = Number(BigInt(String(readStatePort(orderInput, 4))));
        const side = sideCode === 1 ? 'ASK' : (sideCode === 2 ? 'BID' : '');
        if (!side) continue;
        const fillBaseAtoms = BigInt(String(readStatePort(nextState, 21)));
        const quoteBefore = BigInt(String(readStatePort(orderInput, 20) || '0'));
        const quoteAfter = BigInt(String(readStatePort(nextState, 20)));
        const quoteAtoms = quoteAfter - quoteBefore;
        const remainingAtoms = BigInt(String(readStatePort(nextState, 11)));
        const operationId = String(readStatePort(nextState, 24) || '').toLowerCase();
        const priceAtoms = String(readStatePort(orderInput, 5));
        if (fillBaseAtoms <= 0n || quoteAtoms <= 0n || !/^0x[0-9a-f]+$/.test(operationId)) continue;
        const header = tp.header || {};
        rows.push({
          txpowId: txpowId,
          transactionId: String(txn.transactionid || '').toLowerCase(),
          operationId: operationId,
          orderId: String(readStatePort(orderInput, 15) || '').toLowerCase(),
          orderCoinId: String(orderInput.coinid || '').toLowerCase(),
          side: side,
          priceAtoms: priceAtoms,
          fillBaseAtoms: fillBaseAtoms.toString(),
          quoteAtoms: quoteAtoms.toString(),
          remainingBaseAtoms: remainingAtoms.toString(),
          terminal: remainingAtoms === 0n,
          makerAddress: String(readStatePort(orderInput, 12) || '').toLowerCase(),
          takerAddress: String(readStatePort(nextState, 22) || '').toLowerCase(),
          priceNonceBefore: String(readStatePort(priceInput, 101) || '0'),
          priceNonceAfter: String(readStatePort(nextState, 101) || '0'),
          priceStateOutputCoinId: String((txn.outputs || []).filter(function (o) {
            return String(o.address || '').toLowerCase() === engine && String(o.tokenid || '').toLowerCase() === '0x00';
          }).map(function (o) { return o.coinid; })[0] || '').toLowerCase(),
          block: Number(onchain.block) || Number(header.block) || 0,
          blockId: String(onchain.blockid || '').toLowerCase(),
          confirmations: Number(onchain.confirmations) || 0,
          timeMs: Number(header.timemilli) || 0,
        });
      } catch (_) { /* malformed candidate: exclude rather than repair */ }
    }
    rows.sort(function (a, b) { return b.block - a.block || b.timeMs - a.timeMs || a.txpowId.localeCompare(b.txpowId); });
    _tv81TradeCache = { at: Date.now(), rows: rows };
    return rows.slice(0, take);
  }

  // Rebuild V2 placement and cancellation Activity from confirmed transaction topology. This
  // is deliberately independent of optimistic local rows: a clean browser profile can recover
  // the same order lifecycle, while a returning profile upserts the original deterministic row.
  async function tv81ReadConfirmedOrderEvents(limit) {
    const take = Math.max(1, Math.min(100, Number(limit) || 50));
    if (Date.now() - _tv81OrderEventCache.at < 4000) return _tv81OrderEventCache.rows.slice(0, take);
    const registry = await tv81AppRegistry();
    const engine = String(((registry.order_book || {}).engine_address) || '').toLowerCase();
    if (!/^0x[0-9a-f]+$/.test(engine)) throw new Error('The active V2 engine address is missing.');
    const history = await mdsCmdData('history max:100');
    const listed = tv81HistoryTxpows(history);
    const seen = Object.create(null);
    const rows = [];
    for (let i = 0; i < listed.length; i++) {
      let tp = listed[i];
      const txpowId = String((tp || {}).txpowid || '').toLowerCase();
      if (!/^0x[0-9a-f]+$/.test(txpowId) || seen[txpowId]) continue;
      seen[txpowId] = true;
      if (!tp.body || !tp.body.txn) tp = await fetchTxpowById(txpowId);
      const txn = tp && tp.body && tp.body.txn;
      if (!txn || !Array.isArray(txn.inputs) || !Array.isArray(txn.outputs) || !Array.isArray(txn.state)) continue;
      const nextState = { state: txn.state };
      const action = String(readStatePort(nextState, 23) || '0');
      let kind = '';
      let orderCoin = null;
      let refundCoin = null;
      if (action === '0') {
        orderCoin = txn.outputs.find(function (coin) {
          return coin && String(coin.address || '').toLowerCase() === engine
            && String(readStatePort(nextState, 2) || readStatePort(coin, 2) || '') === '8111';
        }) || null;
        if (orderCoin) kind = 'PLACED';
      } else if (action === '2') {
        orderCoin = txn.inputs.find(function (coin) {
          return coin && String(coin.address || '').toLowerCase() === engine
            && String(readStatePort(coin, 2) || '') === '8111';
        }) || null;
        if (orderCoin) {
          const refundAddress = String(readStatePort(orderCoin, 14) || '').toLowerCase();
          refundCoin = txn.outputs.find(function (coin) {
            return coin && String(coin.address || '').toLowerCase() === refundAddress
              && String(coin.tokenid || '').toLowerCase() === String(orderCoin.tokenid || '').toLowerCase()
              && String(coin.tokenamount || coin.amount || '') === String(orderCoin.tokenamount || orderCoin.amount || '');
          }) || null;
          if (refundCoin) kind = 'CANCELLED';
        }
      }
      if (!kind || !orderCoin) continue;
      const onchain = await mdsCmdData('txpow onchain:' + txpowId).catch(function () { return null; });
      if (!onchain || !(onchain.found === true || onchain.found === 'true')) continue;
      try {
        const stateCoin = kind === 'PLACED' ? nextState : orderCoin;
        const sideCode = Number(BigInt(String(readStatePort(stateCoin, 4))));
        const side = sideCode === 1 ? 'ASK' : (sideCode === 2 ? 'BID' : '');
        const orderId = String(readStatePort(stateCoin, 15) || '').toLowerCase();
        const orderCoinId = String(orderCoin.coinid || '').toLowerCase();
        const refundAddress = String(readStatePort(stateCoin, 14) || '').toLowerCase();
        const makerAddress = String(readStatePort(stateCoin, 12) || '').toLowerCase();
        if (!side || !/^0x[0-9a-f]+$/.test(orderId) || !/^0x[0-9a-f]+$/.test(orderCoinId)) continue;
        const header = tp.header || {};
        rows.push({
          kind: kind,
          txpowId: txpowId,
          transactionId: String(txn.transactionid || '').toLowerCase(),
          orderId: orderId,
          orderCoinId: orderCoinId,
          side: side,
          priceAtoms: String(readStatePort(stateCoin, 5)),
          baseAtoms: String(readStatePort(stateCoin, 11) || readStatePort(stateCoin, 10)),
          escrowTokenId: String(orderCoin.tokenid || '').toLowerCase(),
          escrowDisplay: String(orderCoin.tokenamount || orderCoin.amount || '0'),
          makerAddress: makerAddress,
          refundAddress: refundAddress,
          block: Number(onchain.block) || Number(header.block) || 0,
          blockId: String(onchain.blockid || '').toLowerCase(),
          confirmations: Number(onchain.confirmations) || 0,
          timeMs: Number(header.timemilli) || 0,
        });
      } catch (_) { /* malformed candidate: exclude rather than repair */ }
    }
    rows.sort(function (a, b) { return b.block - a.block || b.timeMs - a.timeMs || a.txpowId.localeCompare(b.txpowId); });
    _tv81OrderEventCache = { at: Date.now(), rows: rows };
    return rows.slice(0, take);
  }

  function tv81RemoveActivityTwins(canonicalId, txpowId, transactionId) {
    if (typeof window.stablesGetUserActivityRows !== 'function'
      || typeof window.stablesRemoveActivityRowById !== 'function') return;
    const ids = [txpowId, transactionId].map(function (v) { return String(v || '').toLowerCase(); }).filter(Boolean);
    (window.stablesGetUserActivityRows() || []).forEach(function (row) {
      if (!row || row.id === canonicalId) return;
      const represented = [row.explorerTxId, row.pendingTxnId, row.txid]
        .map(function (v) { return String(v || '').toLowerCase(); });
      if (represented.some(function (v) { return ids.indexOf(v) >= 0; })) {
        try { window.stablesRemoveActivityRowById(row.id); } catch (_) { /* ignore */ }
      }
    });
  }

  async function tv81ReconcileOrderActivity(events) {
    if (typeof window.stablesUpsertUserActivityRows !== 'function') return;
    const registry = await tv81AppRegistry();
    const xToken = String((((registry.assets || {}).XWINIWA || {}).token_id) || '').toLowerCase();
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const makerMine = await tv81IsAddressMine(e.makerAddress);
      const refundMine = await tv81IsAddressMine(e.refundAddress);
      if (!makerMine && !refundMine) continue;
      const placed = e.kind === 'PLACED';
      const canonicalId = placed
        ? 'TV81-ORDER-' + e.orderId.slice(2, 14)
        : 'TV81-CANCEL-' + e.orderCoinId.slice(2, 14);
      tv81RemoveActivityTwins(canonicalId, e.txpowId, e.transactionId);
      const ccy = e.escrowTokenId === xToken ? 'xWiniwa' : 'Winiwa';
      const status = e.confirmations >= 3 ? 'Confirmed' : 'On-chain';
      const d = new Date(e.timeMs || Date.now());
      window.stablesUpsertUserActivityRows([{
        id: canonicalId,
        dir: placed ? 'out' : 'in', icon: placed ? '↗' : '↙',
        counterparty: 'Order book (xWiniwa/Winiwa)', category: ccy,
        title: placed ? (e.side === 'ASK' ? 'Sell order placed' : 'Buy order placed') : 'Order cancelled',
        date: d.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · '
          + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
        amt: (placed ? -1 : 1) * Math.abs(Number(e.escrowDisplay)), ccy: ccy, fee: 0,
        explorerTxId: e.txpowId, pendingTxnId: '', status: status, block: e.block,
        txConfirmations: e.confirmations, ts: e.timeMs || Date.now(),
        note: placed
          ? 'Limit ' + tv81FmtPrice(e.priceAtoms) + ' Winiwa per xWiniwa.'
          : 'Unfilled escrow returned to the maker wallet.',
        minimaOnChain: true, localOrigin: false, pendingIncoming: !placed && status !== 'Confirmed',
        tv81OrderEvent: true, tv81OrderId: e.orderId, tv81OrderCoinId: e.orderCoinId,
      }]);
    }
  }

  async function tv81ReconcileTradeActivity(trades) {
    if (typeof window.stablesUpsertUserActivityRows !== 'function') return;
    for (let i = 0; i < trades.length; i++) {
      const t = trades[i];
      const takerMine = await tv81IsAddressMine(t.takerAddress);
      const makerMine = await tv81IsAddressMine(t.makerAddress);
      if (!takerMine && !makerMine) continue;
      const takerView = takerMine;
      let title, ccy, amtAtoms, paidText;
      if (takerView) {
        if (t.side === 'ASK') {
          title = 'Bought xWiniwa'; ccy = 'xWiniwa'; amtAtoms = t.fillBaseAtoms;
          paidText = 'Paid ' + tv81FmtPrice(t.quoteAtoms) + ' Winiwa';
        } else {
          title = 'Sold xWiniwa'; ccy = 'Winiwa'; amtAtoms = t.quoteAtoms;
          paidText = 'Sold ' + tv81FmtPrice(t.fillBaseAtoms) + ' xWiniwa';
        }
      } else if (t.side === 'ASK') {
        title = 'Sold xWiniwa'; ccy = 'Winiwa'; amtAtoms = t.quoteAtoms;
        paidText = 'Sold ' + tv81FmtPrice(t.fillBaseAtoms) + ' xWiniwa';
      } else {
        title = 'Bought xWiniwa'; ccy = 'xWiniwa'; amtAtoms = t.fillBaseAtoms;
        paidText = 'Paid ' + tv81FmtPrice(t.quoteAtoms) + ' Winiwa';
      }
      const status = t.confirmations >= 3 ? 'Confirmed' : 'On-chain';
      const d = new Date(t.timeMs || Date.now());
      window.stablesUpsertUserActivityRows([{
        id: 'TV81-FILL-' + t.operationId.slice(2, 14),
        dir: 'in', icon: '↙', counterparty: 'Order book (xWiniwa/Winiwa)', category: ccy,
        title: title,
        date: d.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · '
          + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
        amt: Number(tv81FmtPrice(amtAtoms)), ccy: ccy, fee: 0,
        explorerTxId: t.txpowId, pendingTxnId: '', status: status, block: t.block,
        txConfirmations: t.confirmations, ts: t.timeMs || Date.now(),
        note: (t.terminal ? 'Terminal fill. ' : 'Partial fill with a confirmed continuation. ')
          + paidText + ' at ' + tv81FmtPrice(t.priceAtoms) + ' Winiwa per xWiniwa.',
        minimaOnChain: true, localOrigin: true, pendingIncoming: status !== 'Confirmed',
        tv81Trade: true, tv81OperationId: t.operationId,
      }]);
    }
    try { if (typeof window.renderActivity === 'function') window.renderActivity(); } catch (_) { /* ignore */ }
    try { if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity(); } catch (_) { /* ignore */ }
  }

  // DIRECT-TAKE fill parser (the live engine): a fill txn's leading inputs are order coins at the
  // direct order address sharing STATE(23)=1; each order input i is ONE fill at that maker's OWN
  // limit (PREVSTATE(3)), base filled in STATE(40+i) (display units). Only the last order input
  // can partial-fill (its continuation returns to the order address).
  async function tv81ReadDirectConfirmedTrades(limit) {
    const take = Math.max(1, Math.min(100, Number(limit) || 20));
    const registry = await tv81AppRegistry();
    const cfg = tv81DirectCfg(registry);
    if (!cfg) return null;
    const orderAddr = String(cfg.order_address).toLowerCase();
    const history = await mdsCmdData('history max:100');
    const listed = tv81HistoryTxpows(history);
    const seen = Object.create(null);
    const rows = [];
    for (let i = 0; i < listed.length && rows.length < take; i++) {
      let tp = listed[i];
      const txpowId = String((tp || {}).txpowid || '').toLowerCase();
      if (!/^0x[0-9a-f]+$/.test(txpowId) || seen[txpowId]) continue;
      seen[txpowId] = true;
      if (!tp.body || !tp.body.txn) tp = await fetchTxpowById(txpowId);
      const txn = tp && tp.body && tp.body.txn;
      if (!txn || !Array.isArray(txn.inputs) || !Array.isArray(txn.state)) continue;
      const shared = { state: txn.state };
      if (String(readStatePort(shared, 23) || '') !== '1') continue;
      const orderInputs = [];
      for (let k = 0; k < txn.inputs.length; k++) {
        if (String((txn.inputs[k].address || '')).toLowerCase() === orderAddr) orderInputs.push({ inp: txn.inputs[k], idx: k });
        else break;   // orders are the LEADING inputs by construction
      }
      if (!orderInputs.length) continue;
      const onchain = await mdsCmdData('txpow onchain:' + txpowId).catch(function () { return null; });
      if (!onchain || !(onchain.found === true || onchain.found === 'true')) continue;
      const hasContinuation = (txn.outputs || []).some(function (o) { return String((o.address || '')).toLowerCase() === orderAddr; });
      const block = String((tp.header || {}).block || '');
      for (let k = orderInputs.length - 1; k >= 0 && rows.length < take; k--) {
        const oi = orderInputs[k];
        try {
          const sideCode = Number(BigInt(String(readStatePort(oi.inp, 2))));
          const fillAtoms = tokenDisplayToAtoms8(String(readStatePort(shared, 40 + oi.idx) || '0'));
          const limitAtoms = BigInt(String(readStatePort(oi.inp, 3)));
          if (fillAtoms <= 0n || limitAtoms <= 0n) continue;
          rows.push({
            txpowId: txpowId, block: block,
            side: sideCode === 2 ? 'ASK' : 'BID',
            priceAtoms: limitAtoms.toString(),
            fillBaseAtoms: fillAtoms.toString(),
            terminal: !(hasContinuation && k === orderInputs.length - 1),
          });
        } catch (_) { /* skip malformed input */ }
      }
    }
    return rows;
  }

  // Trade-truth read throttle (2026-07-22): the confirmed-fills read costs a `history` call plus
  // per-txpow follow-ups on the single node command bridge. Unthrottled 15s polling (plus the 20s
  // book timer calling this on every pass) saturated the embedded node's bridge so badly that a
  // market sweep's txnsign timed out on-device. Gate it: one read in flight at most, at most one
  // successful read per 120s (a new fill can only land with a new block, ~50s), 30s retry after a
  // failure, and no read at all while the Trade view is closed.
  let _tv81TradeTruthInFlight = false;
  let _tv81TradeTruthNextAt = 0;
  async function tv81RefreshTradeTruth(force) {
    const now = Date.now();
    if (_tv81TradeTruthInFlight) return null;
    if (!force && now < _tv81TradeTruthNextAt) return null;
    _tv81TradeTruthInFlight = true;
    try {
      const registry = await tv81AppRegistry();
      let trades;
      if (tv81DirectCfg(registry)) {
        // Direct-take market: read direct fills only. A failed read must NOT fall through to the
        // retired engine's readers (wrong engine, and more bridge load); it surfaces honestly as
        // "unavailable" via the caller's catch instead.
        trades = await tv81ReadDirectConfirmedTrades(20);
        if (!trades) throw new Error('The direct-take market is not configured.');
      } else {
        trades = await tv81ReadConfirmedTrades(20);
        await tv81ReconcileTradeActivity(trades);
        const orderEvents = await tv81ReadConfirmedOrderEvents(50);
        await tv81ReconcileOrderActivity(orderEvents);
      }
      _tv81TradeTruthNextAt = Date.now() + 120000;
    const host = document.getElementById('tv81ConfirmedTrades');
    const last = trades[0] || null;
    const lastEl = document.getElementById('tv81StatLast');
    if (lastEl) {
      lastEl.textContent = last ? tv81FmtPx(last.priceAtoms) : '—';
      lastEl.classList.remove('tv81-up', 'tv81-down');
      // The pro cue: Last coloured by direction vs the previous fill.
      if (last && trades[1]) {
        const d = BigInt(last.priceAtoms) - BigInt(trades[1].priceAtoms);
        if (d > 0n) lastEl.classList.add('tv81-up');
        else if (d < 0n) lastEl.classList.add('tv81-down');
      }
    }
    if (trades.length) {
      // Keep the BLOCK with each price: the chart plots price against time, and block height is the
      // only clock the chain gives us (~50s per block). Without it the x axis was just sample index,
      // which spaces a burst of trades the same as an hour of quiet (founder 2026-07-26).
      const chronological = trades.slice().reverse().map(function (t) {
        return { p: Number(t.priceAtoms), b: Number(t.block) || 0 };
      });
      _tv81MidHistory.splice(0, _tv81MidHistory.length);
      chronological.slice(-120).forEach(function (pt) { _tv81MidHistory.push(pt); });
      tv81DrawChart();
    }
    if (!host) return trades;
    window.__TV81_TRADES_ALL__ = trades;
    tv81RenderTradesTable();
    return trades;
    } catch (e) {
      _tv81TradeTruthNextAt = Date.now() + 30000;
      throw e;
    } finally {
      _tv81TradeTruthInFlight = false;
    }
  }

  let _tv81OrderMode = 'market';
  let _tv81OrderSide = 'buy';

  // Classic order-book table: asks (red) descending to the spread, a mid/spread row, bids
  // (green) below, each row with a depth-shaded background sized to cumulative total. Plus the
  // Mark/Spread stat strip and the price chart. All derived from live chain orders.
  async function tv81RefreshOrderBookPanel() {
    const asksHost = document.getElementById('tv81obAsks');
    if (!asksHost) return;
    let book;
    try { book = await tv81ReadOrderBook('XWINIWA_WINIWA'); }
    catch (e) { asksHost.innerHTML = '<div class="xs mu">Book unavailable: ' + String((e && e.message) || e) + '</div>'; return; }
    const bidsHost = document.getElementById('tv81obBids');
    const emptyEl = document.getElementById('tv81obEmpty');
    const anyOrders = book.bins.asks.length + book.bins.bids.length > 0;
    if (emptyEl) emptyEl.style.display = anyOrders ? 'none' : 'block';
    // View-only signal (light node): the book is a verified beacon snapshot, not takeable here.
    // Flag it so the ticket and the market path can be honest (D22) rather than erroring on a tap.
    const viewOnly = book.source === 'beacon';
    window.__TV81_BOOK_VIEW_ONLY__ = viewOnly;
    const viewOnlyEl = document.getElementById('tv81obViewOnly');
    if (viewOnlyEl) viewOnlyEl.hidden = !viewOnly;
    // Held-but-unrenderable order coins must not be invisible (the phone one-visible-ask case):
    // say so and point at the repair control instead of presenting a partial book as complete.
    const unreadEl = document.getElementById('tv81obUnreadable');
    if (unreadEl) {
      const un = Number(book.unreadableCount || 0);
      unreadEl.hidden = !(un > 0);
      if (un > 0) unreadEl.textContent = un + ' held order(s) are not readable on this node yet. Use "Book incomplete? Reconstruct" below to repair.';
    }

    const row = function (b, sideColor, cum) {
      const priceA = BigInt(b.priceAtoms), sizeA = BigInt(b.baseAtoms);
      const totalWiniwa = (sizeA * priceA) / 100000000n;
      const shade = Math.min(100, Number(cum * 100n / (maxCum > 0n ? maxCum : 1n)));
      return '<div class="tv81-book-row tv81-book-row--' + sideColor + '" style="--tv81-depth:' + shade + '%" '
        + 'onclick="window.tv81FillPriceFromBook&&tv81FillPriceFromBook(\'' + tv81FmtPx(b.priceAtoms) + '\')">'
        + '<div class="tv81-book-depth"></div>'
        + '<span>' + tv81FmtPx(b.priceAtoms) + '</span>'
        + '<span>' + tv81FmtQty(b.baseAtoms) + '</span>'
        + '<span>' + tv81FmtQty(totalWiniwa.toString()) + '</span></div>';
    };

    // Mobile-first density: 5 levels per side by default; EXPANDED shows ALL levels so a deep
    // book is fully visible, held inside a bounded scroll container (founder 2026-07-24: "the
    // orderbook is missing a scrolling capacity so the user can see all orders").
    const depthCap = window.__TV81_BOOK_EXPANDED__ ? Math.max(9, book.bins.asks.length, book.bins.bids.length) : 5;
    const asks = book.bins.asks.slice(0, depthCap);
    let maxCum = 0n; let cum = 0n;
    const asksCum = asks.map(function (a) { cum += (BigInt(a.baseAtoms) * BigInt(a.priceAtoms)) / 100000000n; if (cum > maxCum) maxCum = cum; return cum; });
    const bids = book.bins.bids.slice(0, depthCap);
    cum = 0n;
    const bidsCum = bids.map(function (b) { cum += (BigInt(b.baseAtoms) * BigInt(b.priceAtoms)) / 100000000n; if (cum > maxCum) maxCum = cum; return cum; });
    // asksHost is column-reverse so array order [best..worst] renders best nearest the spread.
    asksHost.innerHTML = asks.map(function (a, i) { return row(a, 'ask', asksCum[i]); }).join('') || '<div class="tv81-empty-state">No asks</div>';
    if (bidsHost) bidsHost.innerHTML = bids.map(function (b, i) { return row(b, 'bid', bidsCum[i]); }).join('') || '<div class="tv81-empty-state">No bids</div>';
    const depthToggle = document.getElementById('tv81BookDepthToggle');
    if (depthToggle) {
      const more = book.bins.asks.length > 5 || book.bins.bids.length > 5;
      depthToggle.hidden = !more;
      depthToggle.textContent = window.__TV81_BOOK_EXPANDED__ ? 'Show less depth' : 'Show more depth';
    }

    const tick = BigInt(book.tickAtoms);
    const mid = (book.bestBidAtoms && book.bestAskAtoms)
      ? (BigInt(book.bestBidAtoms) + BigInt(book.bestAskAtoms)) / 2n
      : (book.bestBidAtoms ? BigInt(book.bestBidAtoms) : (book.bestAskAtoms ? BigInt(book.bestAskAtoms) : TV81_PAR_ATOMS));
    tv81SetText('tv81obMidRow', tv81FmtPx(mid.toString()));
    const spreadPct = (book.spreadAtoms != null && mid > 0n)
      ? (Number(BigInt(book.spreadAtoms) * 10000n / mid) / 100).toFixed(2) + '%' : '—';
    tv81SetText('tv81obSpreadPct', spreadPct);
    tv81SetText('tv81StatMark', tv81FmtPx(mid.toString()));
    tv81SetText('tv81StatSpread', book.spreadAtoms != null ? tv81FmtPx(book.spreadAtoms) + ' (' + spreadPct + ')' : '—');
    window.__TV81_BEST__ = { bid: book.bestBidAtoms, ask: book.bestAskAtoms, mid: mid.toString(), tick: tick.toString() };

    // Price chart: append the current mid to the session ring and redraw the sparkline.
    const last = _tv81MidHistory[_tv81MidHistory.length - 1];
    if (!last || last !== mid.toString()) _tv81MidHistory.push(mid.toString());
    if (_tv81MidHistory.length > 120) _tv81MidHistory.shift();
    tv81DrawChart();

    tv81RenderMyOrders(book);
    tv81RefreshTradeTruth().catch(function (e) {
      const host = document.getElementById('tv81ConfirmedTrades');
      if (host) host.innerHTML = '<div class="mu">Confirmed trades unavailable: ' + String((e && e.message) || e) + '</div>';
    });
  }

  // Price on Y, time on X, both labelled (founder 2026-07-26). Time comes from block height at the
  // chain's ~50s cadence, so a burst of trades is drawn close together and a quiet hour is drawn wide,
  // which sample-index spacing could not express. Only geometry is inline (allowed for SVG); every
  // colour comes from the theme.
  function tv81DrawChart() {
    const svg = document.getElementById('tv81ChartSvg');
    if (!svg) return;
    const empty = document.getElementById('tv81ChartEmpty');
    let pts = _tv81MidHistory
      .map(function (d) { return (d && typeof d === 'object') ? { p: Number(d.p), b: Number(d.b) } : { p: Number(d), b: 0 }; })
      .filter(function (d) { return Number.isFinite(d.p) && d.p > 0; });
    // Redraw when the box changes size. The drawing is sized from the element, so a chart drawn while
    // the panel was still laying out (or on the other tab) kept a stale, narrow viewBox and sat
    // letterboxed inside a full-width panel. One observer, attached once — and attached BEFORE the
    // empty-chart return, or a node with no trades yet never gets one.
    if (!svg.__tv81Ro && typeof ResizeObserver === 'function') {
      svg.__tv81Ro = new ResizeObserver(function () {
        // No "did the width change" guard: the drawing carries the width it was made at, so the only
        // reliable test is comparing the box against what is already drawn. A guard on the observed
        // width alone let a chart drawn mid-layout keep stale, narrow coordinates forever.
        const r = svg.getBoundingClientRect();
        const w = Math.round(r.width || 0), h = Math.round(r.height || 0);
        const vb = String(svg.getAttribute('viewBox') || '').split(' ');
        if (w > 50 && h >= 24 && (vb[2] !== String(w) || vb[3] !== String(h))) tv81DrawChart();
      });
      svg.__tv81Ro.observe(svg);
    }
    if (pts.length < 2) { svg.innerHTML = ''; if (empty) empty.style.display = 'flex'; return; }
    if (empty) empty.style.display = 'none';

    const prices = pts.map(function (d) { return d.p; });
    const lo = Math.min.apply(null, prices), hi = Math.max.apply(null, prices);
    const span = (hi - lo) || (hi * 0.0002) || 1;
    const yLo = lo - span * 0.1, yHi = hi + span * 0.1;
    // FIXED time window (founder 2026-07-26). Scaling x to the data's own range made the axis move
    // every time a trade arrived, so the same chart re-labelled itself for no reason the person could
    // see. The window is now a constant 24 hours ending at the newest block, so the labels stay put
    // and only the line moves. Trades older than the window are simply outside the view.
    const TV81_CHART_WINDOW_BLOCKS = 1728;  // 24h at the chain's ~50s cadence
    const blocks = pts.map(function (d) { return d.b; });
    const bMax = Math.max.apply(null, blocks);
    const timeReal = bMax > 0;
    const bHi = bMax;
    const bLo = bHi - TV81_CHART_WINDOW_BLOCKS;
    // A time series must be drawn in time order (founder 2026-07-26: "the graph is all messed up,
    // time series making a loop"). The line was drawn in the order samples were recorded while x came
    // from block height, so any sample that arrived out of order sent the line backwards and closed a
    // loop. Sorting by block fixes the direction; keeping one point per block stops a vertical spike
    // where several samples share a block; and points older than the window are dropped rather than
    // clamped onto the left edge, where they used to pile into a vertical wall.
    if (timeReal) {
      const perBlock = new Map();
      pts.forEach(function (d) { if (d.b >= bLo) perBlock.set(d.b, d); });
      pts = Array.from(perBlock.values()).sort(function (a, b) { return a.b - b.b; });
      if (pts.length < 2) { svg.innerHTML = ''; if (empty) empty.style.display = 'flex'; return; }
    }

    // FULL WIDTH (founder 2026-07-26). A fixed 320-wide viewBox with "meet" letterboxed the chart in
    // a wider container. Sizing the viewBox to the element's real pixel width makes one SVG unit one
    // pixel: the drawing fills the width and the axis text keeps its intended size undistorted
    // (which "none" would have stretched).
    // BOTH axes must be measured: a viewBox 150 tall inside a 142px-tall box letterboxes sideways
    // again under "meet", which is the same defect in the other direction.
    const box = svg.getBoundingClientRect();
    const W = Math.max(280, Math.round(box.width || svg.clientWidth || 320));
    // Take the height as measured, with no floor. A floor was worse than the problem: the chart panel
    // has a collapsed state 56px tall, so a 142-unit box drawn into it was scaled to fit by "meet"
    // and letterboxed back to a third of the width. The drawing fills whatever box it is given.
    const H = Math.round(box.height || svg.clientHeight || 0);
    if (W < 50 || H < 24) return;                    // not laid out yet; the observer redraws
    const padL = 44, padR = 8, padT = 8, padB = 20;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const x = function (d, i) {
      const t = timeReal
        ? Math.max(0, Math.min(1, (d.b - bLo) / (bHi - bLo)))
        : i / (pts.length - 1);
      return padL + (W - padL - padR) * t;
    };
    const y = function (v) { return padT + (H - padT - padB) * (1 - (v - yLo) / (yHi - yLo)); };

    const line = pts.map(function (d, i) { return (i ? 'L' : 'M') + x(d, i).toFixed(1) + ' ' + y(d.p).toFixed(1); }).join(' ');
    const area = line + ' L' + x(pts[pts.length - 1], pts.length - 1).toFixed(1) + ' ' + (H - padB)
      + ' L' + x(pts[0], 0).toFixed(1) + ' ' + (H - padB) + ' Z';

    // Y axis: three price gridlines, labelled in the theme's muted ink.
    let axes = '';
    for (let g = 0; g <= 2; g++) {
      const v = yLo + (yHi - yLo) * (g / 2);
      const gy = y(v);
      axes += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1)
        + '" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>'
        + '<text x="' + (padL - 6) + '" y="' + (gy + 3).toFixed(1) + '" text-anchor="end" font-size="9"'
        + ' fill="currentColor" fill-opacity="0.6">' + tv81FmtPx(Math.round(v).toString()) + '</text>';
    }
    // X axis: oldest to newest, in elapsed time rather than block numbers.
    // Fixed tick labels for a fixed window: 24h, 12h, now. These never move, whatever the data does.
    axes += '<line x1="' + padL + '" y1="' + (H - padB) + '" x2="' + (W - padR) + '" y2="' + (H - padB)
      + '" stroke="currentColor" stroke-opacity="0.18" stroke-width="1"/>';
    if (timeReal) {
      const ticks = [{ t: 0, s: '24h' }, { t: 0.5, s: '12h' }, { t: 1, s: 'now' }];
      ticks.forEach(function (tk) {
        const tx = padL + (W - padL - padR) * tk.t;
        const anchor = tk.t === 0 ? 'start' : (tk.t === 1 ? 'end' : 'middle');
        axes += '<text x="' + tx.toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + anchor
          + '" font-size="9" fill="currentColor" fill-opacity="0.6">' + tk.s + '</text>';
      });
    }

    svg.innerHTML = '<defs><linearGradient id="tv81cg" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="var(--c,#67e8f9)" stop-opacity="0.28"/><stop offset="1" stop-color="var(--c,#67e8f9)" stop-opacity="0"/></linearGradient></defs>'
      + axes
      + '<path d="' + area + '" fill="url(#tv81cg)"/>'
      + '<path d="' + line + '" fill="none" stroke="var(--c,#67e8f9)" stroke-width="1.6"/>';
    // The axis now carries the price range, so the strip below states the window instead of repeating it.
    // The axis carries the window now, so the strip below is redundant and stays empty.
    tv81SetText('tv81ChartLo', '');
    tv81SetText('tv81ChartHi', '');
  }

  window.tv81ToggleBookDepth = function () {
    window.__TV81_BOOK_EXPANDED__ = !window.__TV81_BOOK_EXPANDED__;
    tv81RefreshOrderBookPanel().catch(function () { /* re-render best-effort */ });
  };
  window.tv81ToggleReconstruct = function () {
    const wrap = document.getElementById('tv81ReconstructWrap');
    if (wrap) wrap.hidden = !wrap.hidden;
  };
  window.tv81ToggleChart = function () {
    const panel = document.getElementById('tv81ChartPanel');
    if (panel) panel.classList.toggle('tv81-chart-collapsed');
  };
  // Quick-size chips (founder-approved; ONE reference shared with the Exchange ½/MAX function).
  window.tv81TicketPct = function (frac) {
    const d = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {};
    const el = document.getElementById('tv81TicketSize');
    if (!el) return;
    const f = Math.max(0, Math.min(1, Number(frac) || 0));
    if (_tv81OrderSide === 'buy') {
      const availAtoms = tokenDisplayToAtoms8(String((d.Winiwa || {}).available || 0));
      const ask = BigInt(String((window.__TV81_BEST__ || {}).ask || '0'));
      if (ask <= 0n) { el.value = '0'; window.tv81TicketQuote && tv81TicketQuote(); return; }
      const frac8 = BigInt(Math.round(f * 1e8));
      el.value = tv81AtomsToDisplay8(availAtoms * frac8 / 100000000n * 100000000n / ask); tv81GroupField(el);
    } else {
      const availAtoms = tokenDisplayToAtoms8(String((d.xWiniwa || {}).available || 0));
      el.value = tv81AtomsToDisplay8(availAtoms * BigInt(Math.round(f * 1e8)) / 100000000n); tv81GroupField(el);
    }
    window.tv81TicketQuote && tv81TicketQuote();
  };

  window.tv81FillPriceFromBook = function (priceDisplay) {
    if (_tv81OrderMode !== 'limit') window.tv81SetOrderMode && tv81SetOrderMode('limit');
    const el = document.getElementById('tv81TicketPrice');
    if (el) { el.value = priceDisplay; tv81GroupField(el); window.tv81TicketQuote && tv81TicketQuote(); }
  };

  async function tv81IsAddressMine(addr) {
    window.__TV81_ADDR_MINE__ = window.__TV81_ADDR_MINE__ || {};
    const a = String(addr || '').toLowerCase();
    if (!a) return false;
    if (a in window.__TV81_ADDR_MINE__) return window.__TV81_ADDR_MINE__[a];
    let mine = false;
    try {
      const r = await mdsCmdData('checkaddress address:' + a);
      mine = !!(r && (r.simple === true || r.simple === 'true'
        || (r.simple && (r.simple.relevant === true || r.simple.relevant === 'true'))));
    } catch (_) { mine = false; }
    window.__TV81_ADDR_MINE__[a] = mine;
    return mine;
  }

  async function tv81RenderMyOrders(book) {
    const mineHost = document.getElementById('tv81obMine');
    if (!mineHost) return;
    try {
      const allRows = book.orders.asks.concat(book.orders.bids);
      const mineFlags = await Promise.all(allRows.map(function (o) { return tv81IsAddressMine(o.makerReceiveAddress); }));
      const mineRows = allRows.filter(function (_, i) { return mineFlags[i]; });
      let tip = 0;
      try { const st = await mdsCmdData('status'); tip = Number(st && st.chain && st.chain.block) || 0; } catch (_) {}
      window.__TV81_MY_ORDERS__ = mineRows.map(function (o) {
        const orig = Number(o.originalBaseAtoms || o.remainingBaseAtoms || 0);
        const rem = Number(o.remainingBaseAtoms || 0);
        return {
          coinId: o.coinId,
          side: o.side === 'ASK' ? 'Sell' : 'Buy',
          sideKey: o.side === 'ASK' ? 1 : 0,
          priceAtoms: o.priceAtoms,
          price: Number(o.priceAtoms) / 1e8,
          sizeAtoms: o.remainingBaseAtoms,
          size: rem / 1e8,
          filledPct: orig > 0 ? Math.round((orig - rem) / orig * 100) : 0,
          ageBlocks: tip && o.createdBlock ? Math.max(0, tip - Number(o.createdBlock)) : null
        };
      });
      window.__TV81_MY_ORDERS_TIP__ = tip;
      tv81RenderMyOrdersTable();
    } catch (_) { /* ignore */ }
  }

  // Open orders as a real sortable table (founder 2026-07-24): Side · Price · Size · Filled · Age,
  // tap a header to sort. Renders from the cached row set so sorting needs no chain re-read.
  let _tv81MyOrdersSort = { col: 'age', dir: 1 };
  // Trades table (founder 2026-07-26): same shape as open orders, so the two read as one family
  // rather than a table beside a list. "My trades" is the default view; the selector switches to
  // every trade on the market. Mine are recognised by the wallet's own maker/taker addresses.
  let _tv81TradesScope = 'mine';
  let _tv81TradesSort = { col: 'block', dir: -1 };
  window.tv81SetTradesScope = function (scope) {
    _tv81TradesScope = scope === 'all' ? 'all' : 'mine';
    ['tv81TradesScopeMine', 'tv81TradesScopeAll'].forEach(function (id) {
      const b = document.getElementById(id);
      if (b) b.classList.toggle('active', (id === 'tv81TradesScopeAll') === (_tv81TradesScope === 'all'));
    });
    tv81RenderTradesTable();
  };
  window.tv81SortTrades = function (col) {
    if (_tv81TradesSort.col === col) _tv81TradesSort.dir *= -1;
    else _tv81TradesSort = { col: col, dir: 1 };
    tv81RenderTradesTable();
  };
  // Ownership uses the SAME resolved cache the open-orders table uses (tv81IsAddressMine populates
  // window.__TV81_ADDR_MINE__), so "mine" means the same thing in both tables rather than two
  // definitions that can disagree. The cache is address -> boolean and is filled asynchronously by
  // the orders pass; an address not yet resolved simply reads as not-mine until it is.
  function tv81TradeIsMine(t) {
    try {
      const cache = window.__TV81_ADDR_MINE__ || {};
      const hay = [t.maker, t.taker, t.makerAddress, t.takerAddress, t.makerReceiveAddress]
        .filter(Boolean).map(function (a) { return String(a).toLowerCase(); });
      return hay.some(function (a) { return cache[a] === true; });
    } catch (_) { return false; }
  }
  function tv81RenderTradesTable() {
    const host = document.getElementById('tv81ConfirmedTrades');
    if (!host) return;
    const all = (window.__TV81_TRADES_ALL__ || []).slice();
    const rows = _tv81TradesScope === 'all' ? all : all.filter(tv81TradeIsMine);
    if (!rows.length) {
      host.innerHTML = '<div class="tv81-empty-state mx-status" data-state="empty" data-tone="neutral">'
        + (_tv81TradesScope === 'all' ? 'No trades on this market yet.' : 'No trades from this wallet yet.')
        + '</div>';
      return;
    }
    const s = _tv81TradesSort;
    const key = { side: 'side', price: 'priceAtoms', size: 'fillBaseAtoms', block: 'block' }[s.col] || 'block';
    rows.sort(function (a, b) {
      let av = a[key], bv = b[key];
      if (key === 'priceAtoms' || key === 'fillBaseAtoms') { av = Number(av || 0); bv = Number(bv || 0); }
      if (av == null) av = -1; if (bv == null) bv = -1;
      return (av === bv ? 0 : (av < bv ? -1 : 1)) * s.dir;
    });
    const arrow = function (col) { return s.col === col ? (s.dir > 0 ? ' ↑' : ' ↓') : ''; };
    const th = function (col, label) { return '<th class="tv81-ot-th" onclick="window.tv81SortTrades&&tv81SortTrades(\'' + col + '\')">' + label + arrow(col) + '</th>'; };
    host.innerHTML = '<table class="tv81-orders-table"><thead><tr>'
      + th('side', 'Side') + th('price', 'Price') + th('size', 'Size') + th('block', 'Block') + '<th class="tv81-ot-th">State</th>'
      + '</tr></thead><tbody>'
      + rows.slice(0, 50).map(function (t) {
          const action = t.side === 'ASK' ? 'Buy' : 'Sell';
          const sideClass = t.side === 'ASK' ? 'tv81-side-label--buy' : 'tv81-side-label--sell';
          return '<tr class="tv81-ot-row">'
            + '<td><span class="tv81-side-label ' + sideClass + '">' + action + '</span></td>'
            + '<td class="tv81-ot-num">' + tv81FmtPx(t.priceAtoms) + '</td>'
            + '<td class="tv81-ot-num">' + tv81FmtQty(t.fillBaseAtoms) + '</td>'
            + '<td class="tv81-ot-num">' + t.block + '</td>'
            + '<td class="tv81-ot-num">' + (t.terminal ? 'Final' : 'Partial') + '</td></tr>';
        }).join('')
      + '</tbody></table>';
  }
  window.tv81RenderTradesTable = tv81RenderTradesTable;

  window.tv81SortMyOrders = function (col) {
    if (_tv81MyOrdersSort.col === col) _tv81MyOrdersSort.dir *= -1;
    else _tv81MyOrdersSort = { col: col, dir: 1 };
    tv81RenderMyOrdersTable();
  };
  function tv81RenderMyOrdersTable() {
    const mineHost = document.getElementById('tv81obMine');
    if (!mineHost) return;
    const rows = (window.__TV81_MY_ORDERS__ || []).slice();
    if (!rows.length) { mineHost.innerHTML = '<div class="tv81-empty-state">No open orders from this wallet.</div>'; return; }
    const s = _tv81MyOrdersSort;
    const key = { side: 'sideKey', price: 'price', size: 'size', filled: 'filledPct', age: 'ageBlocks' }[s.col] || 'ageBlocks';
    rows.sort(function (a, b) {
      const av = a[key] == null ? -1 : a[key], bv = b[key] == null ? -1 : b[key];
      return (av === bv ? 0 : (av < bv ? -1 : 1)) * s.dir;
    });
    const arrow = function (col) { return s.col === col ? (s.dir > 0 ? ' ↑' : ' ↓') : ''; };
    const th = function (col, label) { return '<th class="tv81-ot-th" onclick="window.tv81SortMyOrders&&tv81SortMyOrders(\'' + col + '\')">' + label + arrow(col) + '</th>'; };
    const ageText = function (b) { if (b == null) return '—'; const m = Math.round(b * 50 / 60); return m >= 60 ? Math.round(m / 60) + 'h' : m + 'm'; };
    mineHost.innerHTML = '<table class="tv81-orders-table"><thead><tr>'
      + th('side', 'Side') + th('price', 'Price') + th('size', 'Size') + th('filled', 'Filled') + th('age', 'Age') + '<th class="tv81-ot-th"></th>'
      + '</tr></thead><tbody>'
      + rows.map(function (o) {
          const sideClass = o.side === 'Sell' ? 'tv81-side-label--sell' : 'tv81-side-label--buy';
          return '<tr class="tv81-ot-row">'
            + '<td><span class="tv81-side-label ' + sideClass + '">' + o.side + '</span></td>'
            + '<td class="tv81-ot-num">' + tv81FmtPx(o.priceAtoms) + '</td>'
            + '<td class="tv81-ot-num">' + tv81FmtQty(o.sizeAtoms) + '</td>'
            + '<td class="tv81-ot-num">' + o.filledPct + '%</td>'
            + '<td class="tv81-ot-num">' + ageText(o.ageBlocks) + '</td>'
            // Cancel is an X (founder 2026-07-26): the word repeated down every row shouted louder
            // than the numbers, and the action is obvious from position. aria-label keeps it named
            // for anyone not reading the glyph.
            + '<td><button class="btn btn-link-action tv81-row-x mx-action" data-role="quiet"'
            + ' aria-label="Cancel this order" title="Cancel this order"'
            + ' onclick="window.__STABLES_TV81_CANCEL_UI__(\'' + o.coinId + '\')">&times;</button></td></tr>';
        }).join('')
      + '</tbody></table>';
  }

  // --- Pair selector (single pair now; structured for more) ---
  // Every pair the product will have, listed always (no surface is ever hidden). A pair whose market
  // does not exist yet is shown as coming soon rather than omitted, so the menu states the shape of
  // the product instead of pretending there is only one market (founder 2026-07-26).
  const TV81_PAIRS = [
    { code: 'XWINIWA_WINIWA', label: 'xWiniwa / Winiwa', live: true },
    { code: 'USDW_WINIWA', label: 'USDw / Winiwa', live: false },
  ];
  window.tv81TogglePairMenu = function () {
    const menu = document.getElementById('tv81PairMenu');
    if (!menu) return;
    if (menu.style.display === 'none') {
      // Reuse the REGISTERED menu option (MNU-003 `topbar-channel-option`, title + sub) rather than a
      // bespoke pair row: one function, one reference. The bespoke `tv81-pair-option` was unmapped
      // visual debt and the audit ratchet caught it the moment the menu was first captured open.
      // "Coming soon" is simply the option's sub line, and a dormant market is listed, never hidden.
      menu.innerHTML = TV81_PAIRS.map(function (p) {
        if (p.live) {
          return '<button type="button" class="topbar-channel-option" role="option" aria-selected="true" onclick="window.tv81TogglePairMenu()">'
            + '<span class="topbar-channel-option-title">' + p.label + '</span>'
            + '<span class="topbar-channel-option-sub">Live market</span></button>';
        }
        return '<button type="button" class="topbar-channel-option" role="option" aria-disabled="true" disabled>'
          + '<span class="topbar-channel-option-title">' + p.label + '</span>'
          + '<span class="topbar-channel-option-sub">Coming soon</span></button>';
      }).join('');
      menu.style.display = 'block';
    } else { menu.style.display = 'none'; }
    const button = document.getElementById('tv81PairBtn');
    if (button) button.setAttribute('aria-expanded', menu.style.display === 'block' ? 'true' : 'false');
  };
  window.tv81ToggleProvide = function () {
    const body = document.getElementById('tv81ProvideBody');
    if (!body) return;
    body.style.display = '';
    try { window.tv81LpPreview(); } catch (_) { /* ignore */ }
  };

  // --- Order ticket: Market/Limit x Buy/Sell ---
  // Single order or bulk, one selector over one act (founder 2026-07-26). The bulk form keeps its own
  // markup and id, so nothing about how it builds orders changed; only which of the two is on screen.
  window.tv81SetOrderCount = function (count) {
    const bulk = count === 'bulk';
    const single = document.getElementById('tv81TicketBody');
    const bulkSection = document.getElementById('tv81LiquiditySection');
    ['tv81OrderCountSingle', 'tv81OrderCountBulk'].forEach(function (id) {
      const b = document.getElementById(id);
      if (b) b.classList.toggle('active', (id === 'tv81OrderCountBulk') === bulk);
    });
    if (single) single.hidden = bulk;
    if (bulkSection) bulkSection.hidden = !bulk;
    if (bulk) { try { window.tv81LpPreview && window.tv81LpPreview(); } catch (_) { /* ignore */ } }
  };

  window.tv81SetOrderMode = function (mode) {
    _tv81OrderMode = mode === 'limit' ? 'limit' : 'market';
    const m = document.getElementById('tv81TicketMarket'), l = document.getElementById('tv81TicketLimit');
    if (m) m.classList.toggle('active', _tv81OrderMode === 'market');
    if (l) l.classList.toggle('active', _tv81OrderMode === 'limit');
    const pw = document.getElementById('tv81LimitPriceWrap');
    if (pw) pw.style.display = _tv81OrderMode === 'limit' ? '' : 'none';
    window.tv81TicketQuote && tv81TicketQuote();
  };
  // Ticket "Available" line (2026-07-22): it read `... || 0` off the balance detail, so before the
  // detail loaded it printed a false "Available: 0 Winiwa" (a real zero is only renderable when
  // emptiness is positively proven, D22). Render the loaded value, otherwise an honest syncing
  // state, and kick the balance refresh so the line resolves by itself.
  let _tv81AvailSyncing = false;
  function tv81SyncTicketAvail() {
    const d = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {};
    const entry = _tv81OrderSide === 'buy' ? d.Winiwa : d.xWiniwa;
    if (entry && Number.isFinite(Number(entry.available))) {
      tv81SetText('tv81TicketAvail', 'Available: ' + fmtTokenAmt(entry.available) + (_tv81OrderSide === 'buy' ? ' Winiwa' : ' xWiniwa'));
      return;
    }
    tv81SetText('tv81TicketAvail', 'Available: syncing…');
    if (!_tv81AvailSyncing) {
      _tv81AvailSyncing = true;
      waitForTestTokenBalanceDetail(_tv81OrderSide === 'buy' ? 'WINIMA' : 'xWiniwa', 5)
        .catch(function () { /* best-effort */ })
        .then(function () { _tv81AvailSyncing = false; tv81SyncTicketAvail(); });
    }
  }
  window.tv81SetOrderSide = function (side) {
    _tv81OrderSide = side === 'sell' ? 'sell' : 'buy';
    const b = document.getElementById('tv81SideBuy'), s = document.getElementById('tv81SideSell');
    if (b) b.classList.toggle('active', _tv81OrderSide === 'buy');
    if (s) s.classList.toggle('active', _tv81OrderSide === 'sell');
    const place = document.getElementById('tv81TicketPlace');
    if (place && !_tv81TicketBusy) {
      place.textContent = (_tv81OrderSide === 'buy' ? 'Buy' : 'Sell') + ' xWiniwa';
      place.dataset.side = _tv81OrderSide;
      delete place.dataset.idleLabel;
    }
    tv81LpSyncAvail();
    tv81SyncTicketAvail();
    window.tv81TicketQuote && tv81TicketQuote();
  };
  window.tv81TicketMax = function () {
    const d = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {};
    const el = document.getElementById('tv81TicketSize');
    if (!el) return;
    if (_tv81OrderSide === 'buy') {
      const availableAtoms = tokenDisplayToAtoms8(String((d.Winiwa || {}).available || 0));
      const ask = BigInt(String((window.__TV81_BEST__ || {}).ask || '0'));
      el.value = ask > 0n ? tv81AtomsToDisplay8(availableAtoms * 100000000n / ask) : '0'; tv81GroupField(el);
    } else {
      el.value = String((d.xWiniwa || {}).available || 0);
    }
    window.tv81TicketQuote && tv81TicketQuote();
  };
  window.tv81TicketQuote = function () {
    const size = tv81FieldNum('tv81TicketSize');
    const line = document.getElementById('tv81TicketQuoteLine');
    if (!line) return;
    if (!(size > 0)) { line.textContent = '—'; return; }
    if (_tv81OrderMode === 'market') {
      const best = window.__TV81_BEST__ || {};
      const px = _tv81OrderSide === 'buy' ? best.ask : best.bid;
      if (!px) { line.textContent = 'No compatible live order-book depth.'; return; }
      const price = Number(tv81FmtPrice(px));
      line.textContent = _tv81OrderSide === 'buy'
        ? 'Estimated from best ask: pay ~' + fmtTokenAmt(size * price) + ' Winiwa for ' + fmtTokenAmt(size) + ' xWiniwa.'
        : 'Estimated from best bid: receive ~' + fmtTokenAmt(size * price) + ' Winiwa for ' + fmtTokenAmt(size) + ' xWiniwa.';
    } else {
      const price = tv81FieldNum('tv81TicketPrice');
      if (!(price > 0)) { line.textContent = 'Enter a limit price.'; return; }
      line.textContent = (_tv81OrderSide === 'buy' ? 'Escrow ' : 'Sell ')
        + fmtTokenAmt(_tv81OrderSide === 'buy' ? size * price : size) + ' '
        + (_tv81OrderSide === 'buy' ? 'Winiwa' : 'xWiniwa') + ' resting at ' + fmtTokenAmt(price) + ' Winiwa.';
    }
  };
  // Ticket busy state (2026-07-22): the build behind a Place tap can take minutes on the embedded
  // node's bridge. Without feedback the user taps again, stacking parallel in-flight builds (proven
  // on-device: two taps produced two independent sweep flows ~16 minutes apart). Guard the tap,
  // disable the action, and say what is happening until the confirm modal opens or the build fails.
  let _tv81TicketBusy = false;
  function tv81SetTicketBusy(busy) {
    _tv81TicketBusy = !!busy;
    const b = document.getElementById('tv81TicketPlace');
    if (!b) return;
    if (busy) {
      if (!b.dataset.idleLabel) b.dataset.idleLabel = b.textContent;
      b.disabled = true;
      b.textContent = 'Building…';
    } else {
      b.disabled = false;
      b.textContent = b.dataset.idleLabel || ((_tv81OrderSide === 'buy' ? 'Buy' : 'Sell') + ' xWiniwa');
    }
  }
  // Refuse before touching the node when the wallet cannot cover the order (founder report
  // 2026-07-26: the ticket showed "Available: 0 Winiwa", the Buy button fired anyway, and the node
  // answered with the raw error "No Coins of tokenid:0xd4f5dd35... available!"). The Available line
  // was honest; the action simply did not respect it. A live button that can only fail is exactly
  // what the honest-refusal law exists to prevent, and a raw node error is not a user message.
  // Returns an explanation string when the order cannot be covered, or '' when it can.
  function tv81TicketShortfall(side, mode, size, price) {
    const d = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {};
    const buy = side === 'buy';
    const entry = buy ? d.Winiwa : d.xWiniwa;
    // Unknown is not zero (D22): if the balance has not loaded, say so rather than refusing wrongly.
    if (!entry || !Number.isFinite(Number(entry.available))) return 'Balance is still syncing. Try again in a moment.';
    const have = Number(entry.available);
    let need;
    if (buy) {
      const px = mode === 'limit' ? Number(price) : Number(tv81FmtPrice((window.__TV81_BEST__ || {}).ask || 0));
      if (!(px > 0)) return '';                 // no reference price: let the planner speak
      need = size * px;
    } else {
      need = size;                              // selling escrows the base asset itself
    }
    if (have >= need - 1e-9) return '';
    const unit = buy ? 'Winiwa' : 'xWiniwa';
    return 'Not enough ' + unit + '. This order needs ' + fmtTokenAmt(need) + ' ' + unit
      + ' and ' + (have > 0 ? 'only ' + fmtTokenAmt(have) + ' is available' : 'none is available')
      + '. Winiwa committed to resting orders is escrowed on-chain and is not spendable until the order fills or is cancelled.';
  }

  window.tv81SubmitTicket = function () {
    if (!releaseRequireFeature('trade', 'Trade')) return;
    if (_tv81TicketBusy) return;
    const size = tv81FieldNum('tv81TicketSize');
    if (!(size > 0)) { try { window.stablesFieldError('tv81TicketSize', 'Enter a size'); } catch (_) { /* ignore */ } return; }
    try {
      const px0 = tv81FieldNum('tv81TicketPrice');
      const short = tv81TicketShortfall(_tv81OrderSide, _tv81OrderMode, size, px0);
      if (short) { try { showToast(short, { tone: 'amber', durationMs: 9000 }); } catch (_) { /* ignore */ } return; }
    } catch (_) { /* a guard failure must never block a legitimate order */ }
    const done = function () { tv81SetTicketBusy(false); };
    if (_tv81OrderMode === 'market') {
      tv81SetTicketBusy(true);
      Promise.resolve(tv81ExecuteMarketTicket(_tv81OrderSide, size)).then(done, done);
    } else {
      const price = tv81FieldNum('tv81TicketPrice');
      if (!(price > 0)) { try { window.stablesFieldError('tv81TicketPrice', 'Enter a limit price'); } catch (_) { /* ignore */ } return; }
      tv81SetTicketBusy(true);
      Promise.resolve(tv81PlaceLimitFromTicket(_tv81OrderSide === 'buy' ? 'BID' : 'ASK', price, size)).then(done, done);
    }
  };
  async function tv81ExecuteMarketTicket(side, size) {
    try {
      const reg0 = await tv81AppRegistry();
      if (tv81DirectCfg(reg0)) {
        // Direct-take: a market order is a REAL fill — one sweep txn over the crossed orders, each maker
        // paid its own limit; the marginal order partial-fills. Preview the sweep, confirm exact numbers.
        const dbook = await tv81DirectReadBook();
        const dplan = tv81DirectPlanSweep(dbook, side, String(size));
        // A market order's true cost is only known once the sweep is planned, so re-check the wallet
        // against the PLAN rather than an estimate. Without this a sweep can still be posted that the
        // node must reject for want of coins (founder report 2026-07-26).
        try {
          const dd = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {};
          const payEntry = side === 'buy' ? dd.Winiwa : dd.xWiniwa;
          const payNeed = Number(side === 'buy' ? dplan.totalQuote : dplan.totalBase);
          if (payEntry && Number.isFinite(Number(payEntry.available)) && Number(payEntry.available) < payNeed - 1e-9) {
            const u = side === 'buy' ? 'Winiwa' : 'xWiniwa';
            showToast('Not enough ' + u + '. This fill needs ' + fmtTokenAmt(payNeed) + ' ' + u
              + ' and only ' + fmtTokenAmt(payEntry.available) + ' is available.', { tone: 'amber', durationMs: 9000 });
            return;
          }
        } catch (_) { /* a guard failure must never block a legitimate order */ }
        const payLabel = side === 'buy' ? 'Winiwa' : 'xWiniwa';
        const sendText = (side === 'buy' ? dplan.totalQuote + ' Winiwa' : dplan.totalBase + ' xWiniwa');
        const receiveText = (side === 'buy' ? dplan.totalBase + ' xWiniwa' : dplan.totalQuote + ' Winiwa');
        const nOrders = dplan.legs.length;
        const run = function () {
          tv81DirectExecuteSweep(side, String(size)).then(function () { tv81RefreshOrderBookPanel(); }).catch(function (e) {
            const msg = String((e && e.message) || e);
            try { console.error('[tv81 direct-market]', msg); } catch (_) { /* ignore */ }
            let shown = false;
            try { showToast(msg, { tone: 'amber', durationMs: 9000 }); shown = true; } catch (_) { /* fall through */ }
            // Never let a failed order pass unremarked because one reporting channel is unavailable.
            if (!shown) { try { window.stablesFieldError('tv81TicketSize', msg); shown = true; } catch (__) { /* fall through */ } }
            // D023 law 1: the last resort is the app's own notice, never a platform dialog.
            if (!shown) { try { shown = !!window.stablesNotify(msg, { tone: 'amber' }); } catch (__) { /* ignore */ } }
          });
        };
        if (dplan.unfilled && Number(dplan.unfilled) > 0) {
          try { showToast('Book depth fills ' + tv81G(dplan.totalBase) + ' of ' + tv81G(size) + ' xWiniwa; the rest has no resting orders.', { tone: 'amber', durationMs: 7000 }); } catch (_) { /* ignore */ }
        }
        if (typeof window.openMintBurnConfirm === 'function') {
          window.openMintBurnConfirm({
            op: 'tv81-market', eyebrowText: '', titleText: 'Order confirmation',
            sendText: sendText, receiveText: receiveText,
            feeText: 'Free', counterparty: 'Order book (xWiniwa/Winiwa)', address: '', network: 'Minima mainnet test channel',
            buttonText: (side === 'buy' ? 'Buy ' : 'Sell ') + dplan.totalBase + ' xWiniwa', onConfirm: run,
          });
        } else { run(); }
        return;
      }
      if (tv81FbaCfg(reg0)) {
        // FBA has no direct fill: a "market" order is an aggressive crossing limit that the next
        // batch clear settles at the uniform price. Buy crosses just above best ask; sell just below
        // best bid; with no opposite side yet, rest at the last clear price (or par).
        const fbook = await tv81FbaReadBook();
        const tick = BigInt(String((tv81FbaCfg(reg0).tick_atoms) || '10000'));
        const fallback = fbook.lastPstarAtoms ? BigInt(fbook.lastPstarAtoms) : 100000000n;
        let px = side === 'buy'
          ? (fbook.bestAskAtoms ? BigInt(fbook.bestAskAtoms) + tick : fallback)
          : (fbook.bestBidAtoms ? BigInt(fbook.bestBidAtoms) - tick : fallback);
        if (px <= 0n) px = tick;
        const fplan = await tv81FbaBuildOrder(side === 'buy' ? 'BID' : 'ASK', tv81FbaFmt(Number(px) / 1e8), String(size));
        const run = function () { tv81FbaPlaceOrderOnChain(fplan).then(function () { tv81RefreshOrderBookPanel(); }).catch(function (e) { try { console.error('[tv81 fba-market]', (e && e.message) || e); } catch (_) {} try { showToast(String((e && e.message) || e), { tone: 'amber', durationMs: 9000 }); } catch (_) {} }); };
        if (typeof window.openMintBurnConfirm === 'function') {
          window.openMintBurnConfirm({
            op: 'tv81-market', eyebrowText: '', titleText: 'Order confirmation',
            sendText: fplan.escrow.display + ' ' + (side === 'buy' ? 'Winiwa' : 'xWiniwa') + ' into escrow',
            receiveText: (side === 'buy' ? 'Buy ' : 'Sell ') + fplan.sizeDisplay + ' xWiniwa at market. Settles at the next batch clear.',
            feeText: 'Free', counterparty: 'Order book (xWiniwa/Winiwa)', address: '', network: 'Minima mainnet test channel',
            buttonText: (side === 'buy' ? 'Buy ' : 'Sell ') + fplan.sizeDisplay + ' xWiniwa', onConfirm: run,
          });
        } else { run(); }
        return;
      }
      const requested = tokenDisplayToAtoms8(String(size));
      const book = await tv81ReadOrderBook('XWINIWA_WINIWA');
      // A market fill must spend the maker's LIVE order coins this node actually holds. The beacon
      // may fill the DISPLAY (bins) while `orders` carries only what the node has captured so far, so
      // refuse based on live takeable depth on the needed side, NOT on book.source (updated 2026-07-20
      // once covenant tracking was fixed: the node can now hold real orders while the beacon still
      // shows a fuller ladder). Placing a LIMIT order always works (it only escrows the user's tokens).
      const sideOrders = side === 'buy'
        ? ((book.orders && book.orders.asks) || [])
        : ((book.orders && book.orders.bids) || []);
      if (sideOrders.length === 0) {
        throw new Error('No ' + (side === 'buy' ? 'asks' : 'bids') + ' are available to take yet: your node is still capturing the live order coins for this side. Place a limit order, or give the book a moment to fill in.');
      }
      const preview = tv81PlanMarketSweepFromBook(book, side, requested);
      const quote = tv81AtomsToDisplay8(BigInt(preview.quoteTotalAtoms));
      const base = tv81AtomsToDisplay8(requested);
      const fromLabel = side === 'buy' ? 'Winiwa' : 'xWiniwa';
      const toLabel = side === 'buy' ? 'xWiniwa' : 'Winiwa';
      const sendText = side === 'buy' ? quote + ' Winiwa' : base + ' xWiniwa';
      const receiveText = side === 'buy' ? base + ' xWiniwa' : quote + ' Winiwa';
      const run = function () {
        tv81ExecuteMarketSweep(preview).catch(function (e) {
          try { console.error('[tv81 market-sweep]', (e && e.message) || e); } catch (_) { /* ignore */ }
          try { showToast(String((e && e.message) || e), { tone: 'amber', durationMs: 9000 }); } catch (_) { /* ignore */ }
        });
      };
      if (typeof window.openMintBurnConfirm === 'function') {
        window.openMintBurnConfirm({
          op: 'tv81-market',
          // This is a CLOB trade, not a mint/burn: give the shared confirm modal an explicit
          // trade title and no eyebrow, otherwise op 'tv81-market' falls through to the modal's
          // burn defaults and reads "On-chain USDw burn / Confirm burn" for a plain buy/sell.
          eyebrowText: '', titleText: 'Order confirmation',
          sendText: sendText, receiveText: receiveText,
          feeText: 'Free', counterparty: 'Order book (xWiniwa/Winiwa)',
          address: registryEngineMini() || '', network: 'Minima mainnet test channel',
          buttonText: (side === 'buy' ? 'Buy ' : 'Sell ') + base + ' xWiniwa', onConfirm: run
        });
      } else { run(); }
    } catch (e) {
      try { console.error('[tv81 market-ticket]', (e && e.message) || e); } catch (_) { /* ignore */ }
      try { showToast(String((e && e.message) || e), { tone: 'amber', durationMs: 8000 }); } catch (_) { /* ignore */ }
    }
  }
  async function tv81PlaceLimitFromTicket(side, priceDisplay, sizeDisplay) {
    try {
      const reg0 = await tv81AppRegistry();
      if (tv81DirectCfg(reg0)) {
        const dplan = await tv81DirectBuildOrder(side, priceDisplay, sizeDisplay);
        const escrowLabel = dplan.escrow.display + ' ' + (side === 'ASK' ? 'xWiniwa' : 'Winiwa');
        const run = function () { tv81DirectPlaceOrder(dplan).then(function () { tv81RefreshOrderBookPanel(); }).catch(function (e) { try { console.error('[tv81 direct-place]', (e && e.message) || e); } catch (_) { /* ignore */ } try { showToast(String((e && e.message) || e), { tone: 'amber', durationMs: 8000 }); } catch (_) { /* ignore */ } }); };
        if (typeof window.openMintBurnConfirm === 'function') {
          window.openMintBurnConfirm({
            op: 'tv81-order', eyebrowText: '', titleText: 'Order confirmation',
            sendText: escrowLabel + ' into escrow',
            receiveText: (side === 'ASK' ? 'Sell' : 'Buy') + ' ' + dplan.sizeDisplay + ' xWiniwa at ' + dplan.priceDisplay + ' Winiwa'
              + (dplan.disclosure.changedByRounding ? ' (rounded to tick)' : '') + '. Rests until a taker fills it.',
            feeText: 'Free', counterparty: 'Order book (xWiniwa/Winiwa)', address: '', network: 'Minima mainnet test channel',
            buttonText: 'Submit order', onConfirm: run,
          });
        } else { run(); }
        return;
      }
      if (tv81FbaCfg(reg0)) {
        const fplan = await tv81FbaBuildOrder(side, priceDisplay, sizeDisplay);
        const escrowLabel = fplan.escrow.display + ' ' + (side === 'ASK' ? 'xWiniwa' : 'Winiwa');
        const run = function () { tv81FbaPlaceOrderOnChain(fplan).then(function () { tv81RefreshOrderBookPanel(); }).catch(function (e) { try { console.error('[tv81 fba-place]', (e && e.message) || e); } catch (_) {} try { showToast(String((e && e.message) || e), { tone: 'amber', durationMs: 8000 }); } catch (_) {} }); };
        if (typeof window.openMintBurnConfirm === 'function') {
          window.openMintBurnConfirm({
            op: 'tv81-order', eyebrowText: '', titleText: 'Order confirmation',
            sendText: escrowLabel + ' into escrow',
            receiveText: (side === 'ASK' ? 'Sell' : 'Buy') + ' ' + fplan.sizeDisplay + ' xWiniwa at ' + fplan.priceDisplay + ' Winiwa'
              + (fplan.disclosure.changedByRounding ? ' (rounded to tick)' : '') + '. Settles at the next batch clear.',
            feeText: 'Free', counterparty: 'Order book (xWiniwa/Winiwa)', address: '', network: 'Minima mainnet test channel',
            buttonText: 'Submit order', onConfirm: run,
          });
        } else { run(); }
        return;
      }
      const plan = await tv81QuoteOrder(side, priceDisplay, sizeDisplay);
      const quantized = tv81FmtPrice(plan.disclosure.quantizedPriceAtoms);
      const escrowLabel = plan.escrow.display + ' ' + (side === 'ASK' ? 'xWiniwa' : 'Winiwa');
      const run = function () { tv81PlaceOrderOnChain(plan).then(function () { tv81RefreshOrderBookPanel(); }).catch(function (e) { try { showToast(String((e && e.message) || e), { tone: 'amber', durationMs: 8000 }); } catch (_) { /* ignore */ } }); };
      if (typeof window.openMintBurnConfirm === 'function') {
        window.openMintBurnConfirm({
          op: 'tv81-order',
          // An order placement is not a burn: without an explicit title the shared modal defaults
          // to "On-chain USDw burn / Confirm burn" (op 'tv81-order' is neither mint nor xwiniwa).
          eyebrowText: '', titleText: 'Order confirmation',
          sendText: escrowLabel + ' into escrow',
          receiveText: (side === 'ASK' ? 'Sell' : 'Buy') + ' ' + sizeDisplay + ' xWiniwa at ' + quantized + ' Winiwa'
            + (plan.disclosure.changedByRounding ? ' (rounded to tick)' : ''),
          feeText: 'Free', counterparty: 'Order book (xWiniwa/Winiwa)',
          address: registryEngineMini() || '', network: 'Minima mainnet test channel',
          buttonText: 'Place limit order', onConfirm: run
        });
      } else { run(); }
    } catch (e) { try { showToast(String((e && e.message) || e), { tone: 'amber', durationMs: 8000 }); } catch (_) { /* ignore */ } }
  }

  // --- Liquidity funds: shape ladder compiled into REAL limit orders around protocol par ---
  const TV81_LP_GRID_BINS = 25;
  const TV81_LP_MAX_BINS = 12;
  const TV81_LP_JOURNAL_KEY = 'stables.tv81.liquidity-placement.v1';
  // Concentration is a CONTINUOUS curvature (founder 2026-07-24): bin at distance-level L
  // (1..count) gets weight L^p, with p = curve * sharpness. p>0 => outer bins heavier (tails);
  // p=0 => flat; p<0 => inner bins heavier (concentrated toward the middle). Near-mid bins stay
  // present, never zero, in tails mode (founder default: thinned, not pure wings). The old
  // Spot/Curve/Bid-Ask shapes are the presets curve 0 / -1 / +1.
  let _tv81LpCurve = 0;        // -1 center .. 0 flat .. +1 tails
  let _tv81LpSide = 'both';    // 'both' | 'asks' | 'bids' (founder 2026-07-24)
  let _tv81LpBins = TV81_LP_MAX_BINS;
  let _tv81LpRunning = false;
  const TV81_LP_CURVE_SHARPNESS = 3;

  function tv81LpWeightFloats(count) {
    const p = _tv81LpCurve * TV81_LP_CURVE_SHARPNESS;
    const out = [];
    for (let i = 0; i < count; i++) out.push(Math.pow(i + 1, p));
    return out;
  }
  function tv81LpWeights(count) {
    const floats = tv81LpWeightFloats(count);
    const max = Math.max.apply(null, floats.concat([1e-9]));
    return floats.map(function (w) { return BigInt(Math.max(1, Math.round((w / max) * 1000000))); });
  }
  // Journal/label compatibility: a discrete name derived from the continuous curve.
  function tv81LpShapeLabel() {
    return _tv81LpCurve <= -0.34 ? 'curve' : (_tv81LpCurve >= 0.34 ? 'bidask' : 'spot');
  }

  function tv81LpSlices(total, weights) {
    const sum = weights.reduce(function (s, w) { return s + w; }, 0n);
    let used = 0n;
    return weights.map(function (weight, i) {
      const slice = i === weights.length - 1 ? total - used : total * weight / sum;
      used += slice;
      return slice;
    });
  }

  function tv81LpLadder() {
    const depX = tokenDisplayToAtoms8(String((document.getElementById('lpDepX') || {}).value || '0').replace(/,/g, '') || '0');
    const depW = tokenDisplayToAtoms8(String((document.getElementById('lpDepW') || {}).value || '0').replace(/,/g, '') || '0');
    const tick = 10000n;
    const weights = tv81LpWeights(_tv81LpBins);
    const xSlices = tv81LpSlices(depX, weights);
    const wSlices = tv81LpSlices(depW, weights);
    const orders = [];
    const wantAsks = _tv81LpSide !== 'bids';
    const wantBids = _tv81LpSide !== 'asks';
    weights.forEach(function (_, i) {
      const level = BigInt(i + 1);
      if (wantAsks && xSlices[i] > 0n) {
        const q = xSlices[i];
        if (q > 0n) orders.push({ side: 'ASK', priceAtoms: TV81_PAR_ATOMS + tick * level, qtyAtoms: q });
      }
      if (wantBids && wSlices[i] > 0n) {
        const priceAtoms = TV81_PAR_ATOMS - tick * level;
        const wSlice = wSlices[i];
        const q = wSlice * 100000000n / priceAtoms;
        if (q > 0n) orders.push({ side: 'BID', priceAtoms: priceAtoms, qtyAtoms: q });
      }
    });
    orders.forEach(function (o) { o.escrowAtoms = o.side === 'ASK' ? o.qtyAtoms : (o.qtyAtoms * o.priceAtoms) / 100000000n; });
    return orders;
  }

  function tv81LpLoadJournal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(TV81_LP_JOURNAL_KEY) || 'null');
      return parsed && parsed.version === 1 && Array.isArray(parsed.orders) ? parsed : null;
    } catch (_) { return null; }
  }

  function tv81LpSaveJournal(journal) {
    try { localStorage.setItem(TV81_LP_JOURNAL_KEY, JSON.stringify(journal)); } catch (_) { /* ignore */ }
  }

  function tv81LpClearJournal() {
    try { localStorage.removeItem(TV81_LP_JOURNAL_KEY); } catch (_) { /* ignore */ }
  }

  function tv81LpUpdateSubmit(progressText) {
    const button = document.getElementById('tv81LpSubmit');
    if (!button) return;
    const journal = tv81LpLoadJournal();
    button.disabled = _tv81LpRunning;
    if (progressText) button.textContent = progressText;
    else if (journal && Number(journal.next || 0) < journal.orders.length) {
      button.textContent = 'Resume orders (' + Number(journal.next || 0) + '/' + journal.orders.length + ')';
    } else button.textContent = 'Add Orders';
  }

  window.tv81LpPreview = function () {
    const host = document.getElementById('lpHeatmap');
    if (!host) return;
    const ladder = tv81LpLadder();
    const tick = 10000n;
    const half = (TV81_LP_GRID_BINS - 1) / 2;
    const cells = [];
    // Honest preview: bar heights are the ACTUAL normalized weights of the active curve. i>0 is
    // the ask side (above par), i<0 the bid side (below par); side scope masks the inactive side.
    const floats = tv81LpWeightFloats(_tv81LpBins);
    const maxf = Math.max.apply(null, floats.concat([1e-9]));
    for (let i = -half; i <= half; i++) {
      const distance = Math.abs(i);
      const sideActive = i > 0 ? (_tv81LpSide !== 'bids') : (i < 0 ? (_tv81LpSide !== 'asks') : false);
      let h = 4;
      if (distance > 0 && distance <= _tv81LpBins && sideActive) {
        h = Math.round(12 + 86 * (floats[distance - 1] / maxf));
      }
      cells.push('<div class="tv81-lp-bar" style="--tv81-lp-height:' + h
        + '%;--tv81-lp-opacity:' + (h > 4 ? '0.95' : '0.14') + '" aria-hidden="true"></div>');
    }
    host.innerHTML = cells.join('');
    tv81SetText('tv81LpLowLabel', tv81FmtPrice((TV81_PAR_ATOMS - tick * BigInt(half)).toString()) + ' Winiwa');
    tv81SetText('tv81LpHighLabel', tv81FmtPrice((TV81_PAR_ATOMS + tick * BigInt(half)).toString()) + ' Winiwa');
    if (ladder.length) {
      const lows = ladder.map(function (o) { return o.priceAtoms; }).sort(function (a, b) { return a === b ? 0 : (a < b ? -1 : 1); });
      tv81SetText('lpActiveLabel', tv81FmtPrice(lows[0]) + ' – ' + tv81FmtPrice(lows[lows.length - 1]) + ' · ' + ladder.length + ' orders');
    } else {
      const levels = BigInt(_tv81LpBins);
      tv81SetText('lpActiveLabel', tv81FmtPrice((TV81_PAR_ATOMS - tick * levels).toString())
        + ' – ' + tv81FmtPrice((TV81_PAR_ATOMS + tick * levels).toString()));
    }
    tv81LpUpdateSubmit();
  };

  // Presets set the continuous curve: Curve=center(-1), Spot=flat(0), Bid-Ask=tails(+1).
  window.tv81SetLpShape = function (shape) {
    const curve = shape === 'curve' ? -1 : (shape === 'bidask' ? 1 : 0);
    window.tv81SetLpCurve(curve);
  };
  // The continuous concentration cursor (slider range -100..+100 -> curve -1..+1).
  window.tv81SetLpCurve = function (value) {
    let c = Number(value);
    if (!isFinite(c)) c = 0;
    if (Math.abs(c) > 1.5) c = c / 100;              // slider passes -100..100; presets pass -1..1
    _tv81LpCurve = Math.max(-1, Math.min(1, c));
    const slider = document.getElementById('tv81LpCurve');
    if (slider && Number(slider.value) !== Math.round(_tv81LpCurve * 100)) slider.value = String(Math.round(_tv81LpCurve * 100));
    // Concentration now reads as the same bar as Bins / side, so it needs the same live value.
    const curveOut = document.getElementById('tv81LpCurveValue');
    if (curveOut) curveOut.textContent = String(Math.round(_tv81LpCurve * 100));
    const label = tv81LpShapeLabel();
    [['shapeSpot', 'spot'], ['shapeCurve', 'curve'], ['shapeBidAsk', 'bidask']].forEach(function (pair) {
      const el = document.getElementById(pair[0]);
      if (el) el.classList.toggle('active', label === pair[1]);
    });
    window.tv81LpPreview();
  };
  // Side scope: which side(s) get orders. Deposit fields follow (founder 2026-07-24).
  window.tv81SetLpSide = function (side) {
    _tv81LpSide = side === 'asks' ? 'asks' : (side === 'bids' ? 'bids' : 'both');
    [['tv81LpSideBoth', 'both'], ['tv81LpSideAsks', 'asks'], ['tv81LpSideBids', 'bids']].forEach(function (pair) {
      const el = document.getElementById(pair[0]);
      if (el) el.classList.toggle('active', _tv81LpSide === pair[1]);
    });
    const xField = document.getElementById('tv81LpFieldX');
    const wField = document.getElementById('tv81LpFieldW');
    if (xField) xField.style.display = (_tv81LpSide === 'bids') ? 'none' : '';
    if (wField) wField.style.display = (_tv81LpSide === 'asks') ? 'none' : '';
    window.tv81LpPreview();
  };

  window.tv81SetLpBins = function (value) {
    const next = Math.max(1, Math.min(TV81_LP_MAX_BINS, Math.round(Number(value) || TV81_LP_MAX_BINS)));
    _tv81LpBins = next;
    const input = document.getElementById('tv81LpBins');
    const output = document.getElementById('tv81LpBinsValue');
    if (input && Number(input.value) !== next) input.value = String(next);
    if (output) output.textContent = String(next);
    window.tv81LpPreview();
  };

  function tv81LpSyncAvail() {
    try {
      const d = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {};
      tv81SetText('lpAvailX', fmtTokenAmt((d.xWiniwa || {}).available || 0) + ' xWiniwa');
      tv81SetText('lpAvailW', fmtTokenAmt((d.Winiwa || {}).available || 0) + ' Winiwa');
    } catch (_) { /* ignore */ }
  }
  window.fillLpQuoteMax = function () {
    const d = (window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {}).xWiniwa || {};
    const el = document.getElementById('lpDepX'); if (el) { el.value = String(d.available || 0); window.tv81LpPreview(); }
  };
  window.fillLpBaseMax = function () {
    const d = (window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {}).Winiwa || {};
    const el = document.getElementById('lpDepW'); if (el) { el.value = String(d.available || 0); window.tv81LpPreview(); }
  };

  async function tv81LpOrderCount(orderId) {
    const target = String(orderId || '').toLowerCase();
    const book = await tv81ReadOrderBook('XWINIWA_WINIWA');
    return (book.orders.asks || []).concat(book.orders.bids || []).filter(function (order) {
      return String(order.orderId || '').toLowerCase() === target;
    }).length;
  }

  async function tv81LpOrderExists(orderId) {
    return await tv81LpOrderCount(orderId) > 0;
  }

  async function tv81LpWaitForOrder(orderId, position, total, attempts) {
    const max = attempts || 60;
    for (let i = 0; i < max; i++) {
      const count = await tv81LpOrderCount(orderId);
      if (count > 1) throw new Error('Duplicate liquidity order ID detected while confirming order ' + position + '.');
      if (count === 1) return true;
      tv81LpUpdateSubmit('Confirming ' + position + '/' + total);
      await new Promise(function (resolve) { setTimeout(resolve, 5000); });
    }
    return false;
  }

  async function tv81LpCreateJournal(ladder, totX, totW, sendParts) {
    const nonceBase = BigInt(Date.now()) * 100n;
    const wallet = await fetchTesterWallet();
    const walletAddress = String(wallet.address || '').toLowerCase();
    const makerPublicKey = String(await tv81WalletPubkey()).toLowerCase();
    if (!/^0x[0-9a-f]+$/.test(walletAddress) || !/^0x[0-9a-f]+$/.test(makerPublicKey)) {
      throw new Error('Could not freeze the wallet identity for this liquidity run.');
    }
    return {
      version: 1,
      createdAt: Date.now(),
      shape: tv81LpShapeLabel(),
      curve: _tv81LpCurve,
      side: _tv81LpSide,
      binsPerSide: _tv81LpBins,
      next: 0,
      pending: null,
      totalXAtoms: totX.toString(),
      totalWAtoms: totW.toString(),
      sendParts: sendParts,
      identity: {
        makerReceiveAddress: walletAddress,
        refundAddress: walletAddress,
        makerPublicKey: makerPublicKey
      },
      orders: ladder.map(function (order, i) {
        return {
          side: order.side,
          priceAtoms: order.priceAtoms.toString(),
          qtyAtoms: order.qtyAtoms.toString(),
          makerNonce: (nonceBase + BigInt(i)).toString()
        };
      })
    };
  }

  async function tv81LpRunJournal(journal) {
    if (_tv81LpRunning) return;
    _tv81LpRunning = true;
    tv81LpSaveJournal(journal);
    try {
      const identity = journal && journal.identity || {};
      if (!/^0x[0-9a-f]+$/.test(String(identity.makerReceiveAddress || '').toLowerCase())
        || !/^0x[0-9a-f]+$/.test(String(identity.refundAddress || '').toLowerCase())
        || !/^0x[0-9a-f]+$/.test(String(identity.makerPublicKey || '').toLowerCase())) {
        throw new Error('This liquidity journal does not contain a frozen maker identity and cannot resume safely.');
      }
      while (journal.next < journal.orders.length) {
        const index = Number(journal.next || 0);
        const order = journal.orders[index];
        const position = index + 1;
        const plan = await tv81QuoteOrder(order.side, tv81FmtPrice(order.priceAtoms), tv81AtomsToDisplay8(BigInt(order.qtyAtoms)), order.makerNonce, identity);
        if (journal.pending) {
          if (Number(journal.pending.index) !== index || String(journal.pending.orderId || '').toLowerCase() !== String(plan.orderId).toLowerCase()) {
            throw new Error('Liquidity journal pending-order identity does not match its next order.');
          }
          tv81LpUpdateSubmit('Confirming ' + position + '/' + journal.orders.length);
          if (!await tv81LpWaitForOrder(plan.orderId, position, journal.orders.length)) {
            throw new Error('Order ' + position + ' has an unresolved prior submission. It was not reposted. Resume later.');
          }
          journal.pending = null;
          journal.next = position;
          tv81LpSaveJournal(journal);
          continue;
        }
        let exists = await tv81LpOrderExists(plan.orderId);
        if (!exists) {
          tv81LpUpdateSubmit('Placing ' + position + '/' + journal.orders.length);
          await gatherUserCoinsWithSettleWait(plan.escrow.tokenId, Number(plan.escrow.display), order.side === 'ASK' ? 'xWiniwa' : 'Winiwa');
          // A prior attempt may have confirmed while its change coin was settling.
          exists = await tv81LpOrderExists(plan.orderId);
          if (!exists) {
            journal.pending = {
              index: index,
              orderId: plan.orderId,
              preparedAt: Date.now(),
              status: 'POST_OUTCOME_UNKNOWN_UNTIL_CHAIN_RECONCILIATION'
            };
            tv81LpSaveJournal(journal);
            try {
              await directOrMdsCmd(plan.command, 'placing liquidity order ' + position + '/' + journal.orders.length, 90000);
            } catch (sendError) {
              if (!await tv81LpWaitForOrder(plan.orderId, position, journal.orders.length, 12)) throw sendError;
              exists = true;
            }
          }
        }
        if (!exists && !await tv81LpWaitForOrder(plan.orderId, position, journal.orders.length)) {
          throw new Error('Order ' + position + ' is still awaiting confirmation.');
        }
        journal.pending = null;
        journal.next = position;
        tv81LpSaveJournal(journal);
      }

      const totX = BigInt(journal.totalXAtoms || '0');
      const totW = BigInt(journal.totalWAtoms || '0');
      try {
        if (typeof window.stablesAppendUserActivityRow === 'function') {
          const now = new Date();
          window.stablesAppendUserActivityRow({
            id: 'TV81-LP-' + journal.createdAt, dir: 'out', icon: '↗',
            counterparty: 'Order book (xWiniwa/Winiwa)', category: 'xWiniwa',
            title: 'Liquidity deployed (' + journal.orders.length + ' orders)',
            date: now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
            amt: -Number(tv81AtomsToDisplay8(totX + totW)), ccy: totX > 0n && totW > 0n ? 'xWiniwa' : (totX > 0n ? 'xWiniwa' : 'Winiwa'),
            fee: 0, status: 'Confirmed', note: journal.sendParts.join(' + ') + ' escrowed across ' + journal.orders.length + ' resting orders.',
            minimaOnChain: true, localOrigin: true, pendingIncoming: false
          });
          if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        }
      } catch (_) { /* ignore */ }
      tv81LpClearJournal();
      const depX = document.getElementById('lpDepX'), depW = document.getElementById('lpDepW');
      if (depX) depX.value = '';
      if (depW) depW.value = '';
      try { if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate(['Winiwa', 'xWiniwa']); } catch (_) { /* ignore */ }
      try { await tv81RefreshOrderBookPanel(); } catch (_) { /* ignore */ }
      try { window.tv81LpPreview(); } catch (_) { /* ignore */ }
    // Trading STAYS on the Trade page (founder ruling 2026-07-26, supersedes the navigate-to-Wallet law for trading only: send/receive/mint/burn still go to Wallet). The activity row and the balance flash are the feedback, and the trade panels refresh in place.
    try { if (typeof window.tv81RefreshOrderBookPanel === "function") window.tv81RefreshOrderBookPanel(); } catch (_) { /* ignore */ }
    } catch (error) {
      tv81LpSaveJournal(journal);
      const message = 'Placed ' + Number(journal.next || 0) + ' of ' + journal.orders.length + ' orders. Tap Resume liquidity to continue. (' + String((error && error.message) || error) + ')';
      try { showToast(message, { tone: 'amber', durationMs: 9000 }); } catch (_) { /* ignore */ }
    } finally {
      _tv81LpRunning = false;
      tv81LpUpdateSubmit();
    }
  }

  window.tv81LpDeposit = async function () {
    if (!releaseRequireFeature('bulk-orders', 'Bulk Orders')) return;
    // DORMANT, and it says so (founder 2026-07-26). Bulk Orders escrows into the wrong covenant —
    // markets.XWINIWA_WINIWA.order_address rather than the direct-take book everything trades — so an
    // order placed here is invisible and untakeable. The surface stays visible per the no-hidden-surface
    // law, but it must refuse rather than take funds somewhere useless. Remove this guard when the
    // ladder is rewired (phase A of V9_APP_WORK_PLAN.md); nothing else about the form changes.
    if (!window.__TV81_BULK_ORDERS_ENABLED__) {
      const msg = "Bulk orders are not live yet. Place orders one at a time on Trade for now.";
      try { showToast(msg, { tone: "amber", durationMs: 7000 }); } catch (_) {
        try { window.stablesFieldError("lpDepW", msg); } catch (__) { /* ignore */ }
      }
      return;
    }
    try {
      const pending = tv81LpLoadJournal();
      if (pending && Number(pending.next || 0) < pending.orders.length) {
        await tv81LpRunJournal(pending);
        return;
      }
      const ladder = tv81LpLadder();
      if (!ladder.length) { try { window.stablesFieldError('lpDepW', 'Enter a deposit amount'); } catch (_) { /* ignore */ } return; }
      const totX = ladder.filter(function (o) { return o.side === 'ASK'; }).reduce(function (s, o) { return s + o.escrowAtoms; }, 0n);
      const totW = ladder.filter(function (o) { return o.side === 'BID'; }).reduce(function (s, o) { return s + o.escrowAtoms; }, 0n);
      const sendParts = [];
      if (totX > 0n) sendParts.push(tv81AtomsToDisplay8(totX) + ' xWiniwa');
      if (totW > 0n) sendParts.push(tv81AtomsToDisplay8(totW) + ' Winiwa');
      const run = async function () {
        try {
          const journal = await tv81LpCreateJournal(ladder, totX, totW, sendParts);
          await tv81LpRunJournal(journal);
        } catch (error) {
          try { showToast(String((error && error.message) || error), { tone: 'amber', durationMs: 9000 }); } catch (_) { /* ignore */ }
        }
      };
      if (typeof window.openMintBurnConfirm === 'function') {
        window.openMintBurnConfirm({
          op: 'tv81-liquidity',
          sendText: sendParts.join(' + ') + ' into escrow',
          receiveText: ladder.length + ' resting order' + (ladder.length === 1 ? '' : 's') + ' around par 1.0000',
          feeText: 'Free',
          counterparty: 'Order book (xWiniwa/Winiwa)',
          address: registryEngineMini() || '',
          network: 'Minima mainnet test channel',
          buttonText: 'Place ' + ladder.length + ' order' + (ladder.length === 1 ? '' : 's'),
          onConfirm: function () { run(); }
        });
      } else { await run(); }
    } catch (e) { try { showToast(String((e && e.message) || e), { tone: 'amber', durationMs: 8000 }); } catch (_) { /* ignore */ } }
  };

  window.__STABLES_TV81_CANCEL_UI__ = async function (coinId) {
    if (!releaseRequireFeature('trade', 'Trade')) return;
    try {
      await tv81CancelOrderOnChain(coinId);
      await tv81RefreshOrderBookPanel();
    } catch (e) { try { console.error('[tv81 direct-cancel]', (e && e.message) || e); } catch (_) { /* ignore */ } try { showToast(String((e && e.message) || e), { tone: 'amber', durationMs: 7000 }); } catch (_) { /* ignore */ } }
  };

  window.__STABLES_TV81_PLACE_UI__ = async function () {
    if (!releaseRequireFeature('trade', 'Trade')) return;
    try {
      const sideEl = document.getElementById('tv81obSide');
      const qtyEl = document.getElementById('tv81obQty');
      const priceEl = document.getElementById('tv81obPrice');
      const side = sideEl && sideEl.value === 'BID' ? 'BID' : 'ASK';
      const qty = qtyEl ? qtyEl.value : '';
      const price = priceEl ? priceEl.value : '';
      if (!(Number(qty) > 0)) return window.stablesFieldError ? window.stablesFieldError('tv81obQty', 'Enter a quantity') : undefined;
      if (!(Number(price) > 0)) return window.stablesFieldError ? window.stablesFieldError('tv81obPrice', 'Enter a limit price') : undefined;
      const plan = await tv81QuoteOrder(side, price, qty);
      const quantized = tv81FmtPrice(plan.disclosure.quantizedPriceAtoms);
      const escrowLabel = plan.escrow.display + ' ' + (side === 'ASK' ? 'xWiniwa' : 'Winiwa');
      const run = function () {
        tv81PlaceOrderOnChain(plan).catch(function (e) {
          try { showToast(String((e && e.message) || e), { tone: 'amber', durationMs: 8000 }); } catch (_) { /* ignore */ }
        });
      };
      if (typeof window.openMintBurnConfirm === 'function') {
        window.openMintBurnConfirm({
          op: 'tv81-order',
          // An order placement is not a burn: without an explicit title the shared modal defaults
          // to "On-chain USDw burn / Confirm burn" (op 'tv81-order' is neither mint nor xwiniwa).
          eyebrowText: '', titleText: 'Order confirmation',
          sendText: escrowLabel + ' into escrow',
          receiveText: (side === 'ASK' ? 'Sell' : 'Buy') + ' ' + qty + ' xWiniwa at ' + quantized + ' Winiwa'
            + (plan.disclosure.changedByRounding ? ' (entered ' + price + ', rounded to the tick)' : ''),
          feeText: 'Free',
          counterparty: 'Order book (xWiniwa/Winiwa)',
          address: (registryEngineMini() || ''),
          network: 'Minima mainnet test channel',
          buttonText: 'Place order',
          onConfirm: run
        });
      } else { run(); }
    } catch (e) { try { showToast(String((e && e.message) || e), { tone: 'amber', durationMs: 8000 }); } catch (_) { /* ignore */ } }
  };
  let _tv81EngineMini = '';
  function registryEngineMini() { return _tv81EngineMini; }

  // --- Two-tab Exchange (founder direction 2026-07-15): Exchange = simple swap whose liquidity
  // comes from the CLOB (routed at protocol par until book liquidity and fill settlement are
  // live); Liquidity = the full order book. ---
  window.tv81SetExchangeTab = function (tab) {
    const swap = document.getElementById('tv81ExTabSwap');
    const trade = document.getElementById('tv81ExTabLiquidity');
    const bSwap = document.getElementById('tv81ExTabBtnSwap');
    const bTrade = document.getElementById('tv81ExTabBtnLiq');
    const exchangeBoundary = document.getElementById('releaseExchangeBoundary');
    const tradeBoundary = document.getElementById('releaseTradeBoundary');
    const isTrade = tab === 'trade' || tab === 'liquidity';
    if (swap) swap.style.display = isTrade ? 'none' : '';
    if (trade) trade.style.display = isTrade ? '' : 'none';
    if (exchangeBoundary) exchangeBoundary.style.display = isTrade ? 'none' : '';
    if (tradeBoundary) tradeBoundary.style.display = isTrade ? '' : 'none';
    // Mobile-first header compression (founder-approved): the Trade view drops the page-title
    // row so market data reaches the first screen; the Exchange view keeps it.
    // Every destination names itself (founder 2026-07-25): now that Trade is its own
    // destination rather than a tab, it keeps the page header and states its own name and
    // subtitle instead of hiding the header to save a row.
    try {
      const pageHead = document.querySelector('#page-exchange .app-page-header');
      if (pageHead) pageHead.style.display = '';
      const t = document.getElementById('exchangePageTitle');
      const sub = document.getElementById('exchangePageSub');
      if (t) t.textContent = isTrade ? 'Trade' : 'Exchange';
      if (sub) sub.textContent = isTrade
        ? 'Order book, your orders and liquidity'
        : 'Swap between your currencies instantly';
    } catch (_) { /* ignore */ }
    // The chart opens at full height on every width (founder 2026-07-26: "the price chart looks bad").
    // It used to auto-collapse below 760px to save room when it sat mid-page, and at 56px the line,
    // three price gridlines and the time axis were crammed into a band too thin to read. Since the
    // page was reordered to chart, book, ticket the chart is the first thing on the screen and the
    // reason to open the page, so it starts readable. Tapping the Price header still collapses it for
    // anyone who wants the space back - the control is unchanged, only the default.
    if (bSwap) {
      bSwap.classList.toggle('active', !isTrade);
      bSwap.setAttribute('aria-pressed', !isTrade ? 'true' : 'false');
    }
    if (bTrade) {
      bTrade.classList.toggle('active', isTrade);
      bTrade.setAttribute('aria-pressed', isTrade ? 'true' : 'false');
    }
    if (isTrade) { try { tv81RefreshOrderBookPanel(); } catch (_) { /* ignore */ } }
    else { try { window.tv81InitExchangeShell(); } catch (_) { /* ignore */ } }
  };

  // --- Multi-token Exchange shell wired to reality (founder direction 2026-07-15) ---------
  // Any token can be selected, but only the live pair (Winiwa <-> xWiniwa, par via the vault)
  // executes. Every other token is marked "Coming soon" and cannot be picked.
  window.__STABLES_TV81_EXCLUSIVE__ = tv81Exclusive;
  const TV81_EX_ACTIVE = ['Winiwa', 'xWiniwa'];
  window.tv81ExActive = function (ccy) { return TV81_EX_ACTIVE.indexOf(String(ccy)) >= 0; };

  // Decorate the exchange currency dropdowns: non-active rows get a "Coming soon" tag and are
  // visibly disabled. Safe to call repeatedly (idempotent).
  window.tv81DecorateExchangeDropdowns = function () {
    if (!tv81Exclusive) return;
    ['exFromCcyPanel', 'exToCcyPanel'].forEach(function (pid) {
      const panel = document.getElementById(pid);
      if (!panel) return;
      panel.querySelectorAll('.ex-ccy-dd__row').forEach(function (row) {
        const code = row.getAttribute('data-ccy');
        const active = window.tv81ExActive(code);
        row.style.opacity = '';
        row.style.pointerEvents = '';
        row.classList.toggle('ex-ccy-dd__row--disabled', !active);
        row.setAttribute('aria-disabled', active ? 'false' : 'true');
        const amtEl = row.querySelector('.ex-ccy-dd__row-amt');
        if (amtEl && !active) amtEl.textContent = 'Coming soon';
      });
      // Active tokens float to the top.
      const rows = Array.prototype.slice.call(panel.querySelectorAll('.ex-ccy-dd__row'));
      rows.sort(function (a, b) { return (window.tv81ExActive(b.getAttribute('data-ccy')) ? 1 : 0) - (window.tv81ExActive(a.getAttribute('data-ccy')) ? 1 : 0); });
      rows.forEach(function (r) { panel.appendChild(r); });
    });
  };

  // Live quote for the exchange shell. Live pair -> 1:1 par and enable; otherwise "Coming soon"
  // and disable the button. Returns true when it handled the pair (tv81 mode only).
  // Exchange prices from the ORDER BOOK, not a constant (founder 2026-07-26). It used to quote a flat
  // 1 Winiwa = 1 xWiniwa, which is a claim the market does not make: the real rate depends on the size
  // being exchanged and the offers actually resting. The Exchange is a taker over the CLOB, so it now
  // walks the same depth a market order would consume and reports the rate that size really gets,
  // plus the price impact against the best available price and an honest liquidity state.
  const TV81_EX_IMPACT_CONFIRM_PCT = 2;   // above this, the person must agree before executing
  const TV81_EX_IMPACT_WARN_PCT = 0.5;    // above this, say so but do not gate

  // Walk the resting side a taker would consume. Buying spends `quote` and receives base; selling
  // gives `base` and receives quote. Returns the fill and the effective price, or null when the book
  // cannot cover the size (which is a liquidity answer, not an error).
  function tv81ExWalk(book, side, amount) {
    const rows = side === 'buy'
      ? ((book.orders && book.orders.asks) || [])
      : ((book.orders && book.orders.bids) || []);
    if (!rows.length || !(amount > 0)) return null;
    const best = Number(rows[0].priceAtoms) / 1e8;
    let remaining = amount, base = 0, quote = 0;
    for (const o of rows) {
      const px = Number(o.priceAtoms) / 1e8;
      const availBase = Number(o.remainingBaseAtoms) / 1e8;
      if (!(px > 0) || !(availBase > 0)) continue;
      if (side === 'buy') {
        const costAll = availBase * px;
        const spend = Math.min(remaining, costAll);
        const got = spend / px;
        base += got; quote += spend; remaining -= spend;
      } else {
        const take = Math.min(remaining, availBase);
        base += take; quote += take * px; remaining -= take;
      }
      if (remaining <= 1e-9) break;
    }
    if (base <= 0) return null;
    const effective = quote / base;                       // Winiwa per xWiniwa, both directions
    const impactPct = best > 0 ? Math.abs(effective - best) / best * 100 : 0;
    return { base: base, quote: quote, effective: effective, best: best, impactPct: impactPct, shortfall: Math.max(0, remaining) };
  }

  window.tv81ExchangeCalc = function () {
    if (!tv81Exclusive) return false;
    const from = String((document.getElementById('exFromCcy') || {}).value || '');
    const to = String((document.getElementById('exToCcy') || {}).value || '');
    const amt = parseFloat(String((document.getElementById('exFrom') || {}).value || '').replace(/,/g, '')) || 0;
    const btn = document.querySelector('#page-exchange button[onclick="executeExchangeNow()"]');
    const pill = document.getElementById('ratePill');
    const exTo = document.getElementById('exTo');
    const live = window.tv81ExActive(from) && window.tv81ExActive(to) && from !== to;
    const bookPair = (from === 'Winiwa' && to === 'xWiniwa') || (from === 'xWiniwa' && to === 'Winiwa');
    if (live && bookPair) {
      const book = window.__TV81_EX_BOOK__ || null;
      const side = from === 'Winiwa' ? 'buy' : 'sell';
      const walk = book ? tv81ExWalk(book, side, amt) : null;
      window.__TV81_EX_QUOTE__ = walk;
      if (!book) {
        if (exTo) exTo.value = '';
        if (pill) pill.textContent = 'Reading the order book…';
        if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; btn.textContent = 'Exchange now'; }
      } else if (!(amt > 0)) {
        if (exTo) exTo.value = '';
        const bestRows = side === 'buy' ? (book.orders.asks || []) : (book.orders.bids || []);
        if (pill) pill.textContent = bestRows.length
          ? ('Best ' + tv81G(Number(bestRows[0].priceAtoms) / 1e8, 4) + ' Winiwa per xWiniwa')
          : 'No offers on this side yet';
        if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; btn.textContent = 'Exchange now'; }
      } else if (!walk) {
        if (exTo) exTo.value = '';
        if (pill) pill.textContent = 'No offers on this side yet';
        if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; btn.textContent = 'Exchange now'; }
      } else {
        const receive = side === 'buy' ? walk.base : walk.quote;
        if (exTo) { exTo.value = receive > 0 ? receive.toFixed(6).replace(/0+$/, '').replace(/\.$/, '') : ''; tv81GroupField(exTo); }
        if (pill) pill.textContent = '1 xWiniwa = ' + tv81G(walk.effective, 4) + ' Winiwa';
        if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.textContent = 'Exchange now'; }
      }
      tv81ExRenderImpact(walk, amt, from);
      try { window.tv81SyncExchangeAvail(); } catch (_) { /* ignore */ }
      return true;
    }
    if (live) {
      if (exTo) exTo.value = amt > 0 ? String(amt) : '';
      if (pill) pill.textContent = '1 ' + from + ' = 1 ' + to;
      if (btn) { btn.disabled = false; btn.style.opacity = ''; btn.textContent = 'Exchange now'; }
    } else {
      if (exTo) exTo.value = '';
      if (pill) pill.textContent = (from === to) ? 'Pick two different tokens' : (from + ' / ' + to + ' — coming soon');
      if (btn) { btn.disabled = true; btn.style.opacity = '0.55'; btn.textContent = 'Coming soon'; }
    }
    try { window.tv81SyncExchangeAvail(); } catch (_) { /* ignore */ }
    return true;
  };

  // Price impact and the liquidity state, in one line under the amounts. Silent when there is nothing
  // to say (no size entered): a quiet surface is the normal case.
  function tv81ExRenderImpact(walk, amt, fromCcy) {
    const el = document.getElementById('tv81ExImpact');
    if (!el) return;
    if (!walk || !(amt > 0)) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    const pct = walk.impactPct;
    if (walk.shortfall > 1e-9) {
      const covered = fromCcy === 'Winiwa' ? (amt - walk.shortfall) : walk.base;
      el.setAttribute('data-tone', 'warning');
      el.textContent = 'The book only covers ' + tv81G(covered, 4) + ' ' + fromCcy
        + ' of this size. Reduce the amount or place a limit order on Trade.';
      return;
    }
    const impactText = 'Price impact ' + pct.toFixed(2) + '%';
    if (pct >= TV81_EX_IMPACT_CONFIRM_PCT) {
      el.setAttribute('data-tone', 'warning');
      el.textContent = impactText + '. Thin liquidity at this size: you will be asked to confirm.';
    } else if (pct >= TV81_EX_IMPACT_WARN_PCT) {
      el.setAttribute('data-tone', 'warning');
      el.textContent = impactText + '. This size moves the price.';
    } else {
      el.setAttribute('data-tone', 'neutral');
      el.textContent = impactText + '. Deep enough at this size.';
    }
  }

  // The quote reads a cached book so typing stays instant; this keeps the cache warm.
  window.tv81ExchangeRefreshBook = async function () {
    try {
      const reg = await tv81AppRegistry();
      if (!tv81DirectCfg(reg)) return;
      window.__TV81_EX_BOOK__ = await tv81DirectReadBook();
      try { window.tv81ExchangeCalc(); } catch (_) { /* ignore */ }
    } catch (_) { /* a failed refresh leaves the last good book in place */ }
  };

  // Above the threshold the person agrees explicitly before anything is posted. Below it, nothing is
  // asked: a normal-sized exchange should not be interrupted.
  window.tv81ExchangeNeedsImpactConfirm = function () {
    const w = window.__TV81_EX_QUOTE__;
    return !!(w && w.impactPct >= TV81_EX_IMPACT_CONFIRM_PCT);
  };

  window.tv81SyncExchangeAvail = function () {
    const from = String((document.getElementById('exFromCcy') || {}).value || '');
    const d = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {};
    const map = { Winiwa: (d.Winiwa || {}).available, xWiniwa: (d.xWiniwa || {}).available, USDw: (d.USDw || {}).available };
    const av = map[from];
    const line = document.getElementById('exSendAvailLine');
    if (line) line.textContent = 'Available: ' + (av != null ? fmtTokenAmt(av) + ' ' + from : '—');
    const bal = document.getElementById('exRecvAvailLine');
    const to = String((document.getElementById('exToCcy') || {}).value || '');
    if (bal) bal.textContent = 'Balance: ' + (map[to] != null ? fmtTokenAmt(map[to]) + ' ' + to : '—');
  };

  window.tv81ExchangeExecute = function () {
    if (!releaseRequireFeature('exchange', 'Exchange')) return true;
    if (!tv81Exclusive) return false;
    const from = String((document.getElementById('exFromCcy') || {}).value || '');
    const to = String((document.getElementById('exToCcy') || {}).value || '');
    const amt = parseFloat(String((document.getElementById('exFrom') || {}).value || '').replace(/,/g, '')) || 0;
    if (!(window.tv81ExActive(from) && window.tv81ExActive(to) && from !== to)) {
      try { showToast(from + ' / ' + to + ' is coming soon. Winiwa and xWiniwa are live now.', { tone: 'amber', durationMs: 5000 }); } catch (_) { /* ignore */ }
      return true;
    }
    if (!(amt > 0)) { try { window.stablesFieldError('exFrom', 'Enter an amount'); } catch (_) { /* ignore */ } return true; }

    // Winiwa <-> xWiniwa now executes as a TAKER OVER THE ORDER BOOK (founder 2026-07-26), which is
    // what the architecture always said the Exchange is: a market-order front end sourcing liquidity
    // from the CLOB. It previously routed to the vault at a flat par, so the quote ignored both size
    // and the offers actually resting. Above the impact threshold the person agrees explicitly first.
    const bookPair = (from === 'Winiwa' && to === 'xWiniwa') || (from === 'xWiniwa' && to === 'Winiwa');
    if (bookPair && window.__TV81_EX_BOOK__) {
      const side = from === 'Winiwa' ? 'buy' : 'sell';
      const walk = window.__TV81_EX_QUOTE__;
      if (!walk) {
        try { showToast('No offers on this side of the book yet. Place a limit order on Trade instead.', { tone: 'amber', durationMs: 7000 }); } catch (_) { /* ignore */ }
        return true;
      }
      if (walk.shortfall > 1e-9) {
        try { showToast('The book cannot cover this size. Reduce the amount or place a limit order on Trade.', { tone: 'amber', durationMs: 8000 }); } catch (_) { /* ignore */ }
        return true;
      }
      // The size handed to the engine must be a real token amount, not a raw division result. A buy
      // of 0.3 Winiwa at 1.005 gives 0.2985074626865672 base, and passing that straight through made
      // the sweep throw "Cannot convert undefined to a BigInt" — tokens here carry 8 decimals. The
      // modal was already showing the rounded figure, so the number confirmed and the number executed
      // had quietly diverged (founder run 2026-07-26: Confirm did nothing at all).
      const baseSize = tv81FbaFmt(side === 'buy' ? walk.base : amt);
      const impact = walk.impactPct;
      // An exchange IS a market order (founder 2026-07-26), so it now RUNS the market order rather
      // than reimplementing it. This branch had grown its own copy of the whole thing — book read,
      // plan, confirmation modal, executor call, error handling — and the copy is what failed: it
      // reported success while the node saw no transaction, on the same day the Trade ticket path
      // was proven on-chain. One function, one reference. Delegating also gives the Exchange the
      // ticket's wallet pre-check and its exact planned numbers, which this copy never had. When
      // multi-asset routing arrives (two books crossed for one exchange) it extends that single
      // path instead of a second one that can drift again.
      const runMarket = function () { tv81ExecuteMarketTicket(side, String(baseSize)); };
      // The price-impact agreement stays here: it is the Exchange's own rule, and it is asked BEFORE
      // the order confirmation so the cost is agreed first and the numbers are confirmed second.
      if (impact >= TV81_EX_IMPACT_CONFIRM_PCT && typeof window.openMintBurnConfirm === 'function') {
        window.openMintBurnConfirm({
          op: 'tv81-exchange', eyebrowText: '', titleText: 'Confirm price impact',
          sendText: 'Price impact ' + impact.toFixed(2) + '%',
          receiveText: 'Best price ' + tv81G(walk.best, 4) + ', you get ' + tv81G(walk.effective, 4) + ' Winiwa per xWiniwa',
          feeText: 'Free', counterparty: 'Order book (xWiniwa/Winiwa)', address: '',
          network: 'Minima mainnet test channel',
          buttonText: 'I understand, exchange anyway', onConfirm: runMarket,
        });
      } else { runMarket(); }
      return true;
    }

    // Fallback while the book is still loading: the vault par path (op 0 mint / op 1 burn).
    const op = from === 'Winiwa' ? 0 : 1;
    const run = function () { tv81SwapConfirmed(op, amt); };
    if (typeof window.openMintBurnConfirm === 'function') {
      window.openMintBurnConfirm({
        op: 'tv81-exchange',
        sendText: fmtTokenAmt(amt) + ' ' + from,
        receiveText: fmtTokenAmt(amt) + ' ' + to + ' (par)',
        feeText: 'Free', counterparty: 'Protocol (xWiniwa)',
        address: tv81VaultMiniaddr || '', network: 'Minima mainnet test channel',
        buttonText: 'Exchange ' + fmtTokenAmt(amt) + ' ' + from, onConfirm: run
      });
    } else { run(); }
    return true;
  };

  // Set the live default pair and decorate, once the shell exists.
  window.tv81InitExchangeShell = function () {
    if (!tv81Exclusive) return;
    const f = document.getElementById('exFromCcy'), t = document.getElementById('exToCcy');
    const fl = document.getElementById('exFromCcyLabel'), tl = document.getElementById('exToCcyLabel');
    if (f && !window.tv81ExActive(f.value)) { f.value = 'Winiwa'; if (fl) fl.textContent = 'Winiwa'; }
    if (t && !window.tv81ExActive(t.value)) { t.value = 'xWiniwa'; if (tl) tl.textContent = 'xWiniwa'; }
    window.tv81DecorateExchangeDropdowns();
    window.tv81ExchangeCalc();
  };

  async function tv81SwapConfirmed(op, amt) {
    const rowId = 'TV81-SWAP-' + Date.now();
    const inCcy = op === 0 ? 'xWiniwa' : 'Winiwa';
    const outCcy = op === 0 ? 'Winiwa' : 'xWiniwa';
    try {
      const baseIn = stablesDisplayedBalanceForOptimistic(inCcy);
      const baseOut = stablesDisplayedBalanceForOptimistic(outCcy);
      stablesSetOptimisticBalance(outCcy, Math.max(0, baseOut - amt), 'out');
      stablesSetOptimisticBalance(inCcy, baseIn + amt, 'in');
    } catch (_) { /* ignore */ }
    try {
      if (typeof window.stablesAppendUserActivityRow === 'function') {
        const now = new Date();
        window.stablesAppendUserActivityRow({
          id: rowId, dir: 'in', icon: '↙',
          counterparty: 'Exchange (xWiniwa/Winiwa)',
          category: inCcy,
          title: op === 0 ? 'Swapping Winiwa for xWiniwa' : 'Swapping xWiniwa for Winiwa',
          date: now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
          amt: Math.abs(amt), ccy: inCcy, fee: 0,
          status: 'Pending', note: 'For ' + fmtTokenAmt(amt) + ' ' + outCcy + '.',
          minimaOnChain: true, localOrigin: true, balanceAlreadyApplied: true, pendingIncoming: true
        });
      }
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    } catch (_) { /* ignore */ }
    try { if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate(['Winiwa', 'xWiniwa']); } catch (_) { /* ignore */ }
    try { if (typeof navigate === 'function') navigate('wallet'); } catch (_) { /* ignore */ }
    try {
      const posted = await window.__STABLES_TEST_XWINIWA_COVENANT__(op, amt);
      if (typeof window.stablesUpsertUserActivityRows === 'function') {
        window.stablesUpsertUserActivityRows([{
          id: rowId,
          explorerTxId: (posted && posted.explorerTxId) || '',
          pendingTxnId: (posted && posted.pendingTxnId) || '',
          status: (posted && posted.explorerTxId) ? 'On-chain' : 'Pending',
          note: 'For ' + fmtTokenAmt(amt) + ' ' + outCcy + '. Confirming on-chain.'
        }]);
      }
    } catch (e) {
      const msg = (e && e.message) || 'Swap failed';
      try {
        if (typeof window.stablesUpsertUserActivityRows === 'function') {
          window.stablesUpsertUserActivityRows([{ id: rowId, title: 'Swap failed', status: 'Failed', note: msg, pendingIncoming: false }]);
        }
        stablesClearOptimisticBalance(['Winiwa', 'xWiniwa']);
      } catch (_) { /* ignore */ }
      try { showToast(msg, { tone: 'amber', durationMs: 8000 }); } catch (_) { /* ignore */ }
    }
  }

  // The Liquidity tab markup is static in index.html; init wires the live data, previews,
  // and refresh cycle. Overrides of setLpShape/fillLp*Max land after the page scripts define
  // their legacy versions, so the real-data implementations win.
  function tv81InitExchangeSurfaces() {
    // Point the legacy Liquidity-funds renderers at the real implementations so no code path
    // can paint demo bins or fake totals into the live panel.
    try { window.renderLpLiveBins = tv81RefreshOrderBookPanel; } catch (_) { /* ignore */ }
    try { window.renderHeatmap = window.tv81LpPreview; } catch (_) { /* ignore */ }
    try { window.syncLpBaseUI = tv81LpSyncAvail; } catch (_) { /* ignore */ }
    try { window.tv81SetExchangeTab('swap'); } catch (_) { /* ignore */ }
    try { window.tv81InitExchangeShell(); } catch (_) { /* ignore */ }
    try { window.tv81SetOrderMode('market'); } catch (_) { /* ignore */ }
    try { window.tv81SetOrderSide('buy'); } catch (_) { /* ignore */ }
    try { window.tv81LpPreview(); } catch (_) { /* ignore */ }
    tv81LpSyncAvail();
    tv81SyncTicketAvail();
    tv81RefreshOrderBookPanel();
    if (!_tv81ObTimer) {
      _tv81ObTimer = window.stablesRepeatWhileVisible('order-book-panel', function () {
        const el = document.getElementById('tv81obAsks');
        if (el && el.getBoundingClientRect().height >= 0 && document.getElementById('tv81ExTabLiquidity') && document.getElementById('tv81ExTabLiquidity').style.display !== 'none') {
          tv81RefreshOrderBookPanel(); tv81LpSyncAvail(); tv81SyncTicketAvail();
        }
      }, 20000);
    }
  }
  if (tv81Exclusive) {
    try {
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tv81InitExchangeSurfaces);
      else tv81InitExchangeSurfaces();
      tv81AppRegistry().then(function (r) {
        _tv81EngineMini = String((r.order_book || {}).engine_address || '');
      }).catch(function () { /* ignore */ });
      const reconcileTrades = function () {
        const tab = document.getElementById('tv81ExTabLiquidity');
        if (!tab || tab.style.display === 'none') return;   // only while the Trade view is open
        tv81RefreshTradeTruth().catch(function () { /* retry per the built-in backoff */ });
      };
      setTimeout(reconcileTrades, 3000);
      window.stablesRepeatWhileVisible('reconcile-trades', reconcileTrades, 15000);
    } catch (_) { /* ignore */ }
  }

  // Development hooks used by the existing Trade surface and the CDP evidence harness.
  try {
    window.__STABLES_TV81_PRICE_STATE = tv81ReadMarketPriceState;
    window.__STABLES_TV81_ORDER_BOOK = tv81ReadOrderBook;
    window.__STABLES_TV81_BUILD_ORDER = function () {
      if (!releaseRequireFeature('trade', 'Trade')) throw releaseDeferredError('Trade');
      return tv81BuildOrderPlacement.apply(null, arguments);
    };
    window.__STABLES_TV81_VAULT_STATE = tv81ReadVaultState;
    window.__STABLES_TV81_QUOTE_ORDER = function () {
      if (!releaseRequireFeature('trade', 'Trade')) throw releaseDeferredError('Trade');
      return tv81QuoteOrder.apply(null, arguments);
    };
    window.__STABLES_TV81_PLACE_ORDER = async function () {
      if (!releaseRequireFeature('trade', 'Trade')) throw releaseDeferredError('Trade');
      return tv81PlaceOrderOnChain.apply(null, arguments);
    };
    window.__STABLES_TV81_CANCEL_ORDER = async function () {
      if (!releaseRequireFeature('trade', 'Trade')) throw releaseDeferredError('Trade');
      return tv81CancelOrderOnChain.apply(null, arguments);
    };
    window.__STABLES_TV81_BUILD_FILL = function () {
      if (!releaseRequireFeature('trade', 'Trade')) throw releaseDeferredError('Trade');
      return tv81BuildOrderFillPlan.apply(null, arguments);
    };
    window.__STABLES_TV81_FILL_ORDER = async function () {
      if (!releaseRequireFeature('trade', 'Trade')) throw releaseDeferredError('Trade');
      return tv81FillOrderOnChain.apply(null, arguments);
    };
    window.__STABLES_TV81_PREVIEW_SWEEP = function () {
      if (!releaseRequireFeature('trade', 'Trade')) throw releaseDeferredError('Trade');
      return tv81PlanMarketSweepFromBook.apply(null, arguments);
    };
    // 2026-07-26: this hook pointed ONLY at the legacy fill path, which validates a MARKET_ID state
    // port that the direct-take order layout does not have, so driving the app through it against a
    // real V9 order failed with "The selected order belongs to an unsupported market." No user
    // impact (the UI dispatches correctly via tv81ExecuteMarketTicket) but a trap for any harness
    // driving the app through the exported hooks. It now dispatches exactly as the UI does, and the
    // signature is unchanged: it still takes a preview from __STABLES_TV81_PREVIEW_SWEEP, which
    // already plans correctly against the direct book.
    window.__STABLES_TV81_EXECUTE_SWEEP = async function (preview) {
      if (!releaseRequireFeature('trade', 'Trade')) throw releaseDeferredError('Trade');
      const reg = await tv81AppRegistry();
      if (tv81DirectCfg(reg)) {
        // Direct-take drives from side + display size; the engine re-reads the book itself.
        return tv81DirectExecuteSweep(preview.side, tv81AtomsToDisplay8(BigInt(preview.requestedBaseAtoms)));
      }
      return tv81ExecuteMarketSweep(preview);
    };
    window.__STABLES_TV81_RESUME_SWEEP = async function () {
      if (!releaseRequireFeature('trade', 'Trade')) throw releaseDeferredError('Trade');
      return tv81ResumeMarketSweep.apply(null, arguments);
    };
    window.__STABLES_TV81_SWEEP_JOURNAL = tv81ReadSweepJournal;
    window.__STABLES_TV81_TRADES = tv81ReadConfirmedTrades;
    window.__STABLES_TV81_RECONCILE_TRADES = tv81RefreshTradeTruth;
    window.__STABLES_TV81_ORDER_EVENTS = tv81ReadConfirmedOrderEvents;
    window.__STABLES_TV81_RECONCILE_MARKET_ACTIVITY = async function () {
      const trades = await tv81ReadConfirmedTrades(20);
      const events = await tv81ReadConfirmedOrderEvents(50);
      await tv81ReconcileTradeActivity(trades);
      await tv81ReconcileOrderActivity(events);
      return { trades: trades, orderEvents: events };
    };
  } catch (_) { /* ignore */ }

  // Fresh-install bootstrap. A newly-installed node cannot see covenant reserve/pool coins
  // created before its initial chain download (coin relevance): observed 2026-07-06 — a fresh
  // wallet's xWiniwa mint failed "reserve is empty" while 899.8M xWiniwa sat intact on-chain.
  // When a covenant coin query comes up empty, fetch the current coin proofs published by the
  // protocol (refreshed every oracle tick) and coinimport them. Proofs are public chain data:
  // the node verifies each one against the chain MMR on import, so this is a convenience
  // bootstrap, not a trust point — any archive node could serve the same proofs.
  const COVENANT_PROOFS_URL = 'https://agent.stablescouncil.org/covenant-proofs';
  let _covProofsLastTry = 0;
  async function bootstrapCovenantCoins() {
    if (Date.now() - _covProofsLastTry < 60000) return false; // at most once a minute
    _covProofsLastTry = Date.now();
    try {
      const res = await fetch(COVENANT_PROOFS_URL, { cache: 'no-store' });
      if (!res || !res.ok) return false;
      const j = await res.json();
      const proofs = Array.isArray(j && j.proofs) ? j.proofs : [];
      let ok = 0;
      for (const p of proofs) {
        if (!p || typeof p.data !== 'string' || !p.data.startsWith('0x')) continue;
        try {
          const r = await mdsCmdAsync('coinimport track:true data:' + p.data);
          if (r && (r.status !== false || /already have/i.test(String(r.error || '')))) ok++;
        } catch (e) {
          if (/already have/i.test(String((e && e.message) || e))) ok++;
        }
      }
      try { console.log('[Stables covenant] fresh-install coin bootstrap: ' + ok + '/' + proofs.length + ' proofs imported'); } catch (_) { /* ignore */ }
      return ok > 0;
    } catch (_) { return false; }
  }

  function readStoredUserActivityRowsForTreasury() {
    const out = [];
    const seen = new Set();
    const addRows = function (rows) {
      if (!Array.isArray(rows)) return;
      rows.forEach(function (row) {
        if (!row || typeof row !== 'object') return;
        const id = String(row.id || '') || JSON.stringify(row).slice(0, 120);
        if (seen.has(id)) return;
        seen.add(id);
        out.push(row);
      });
    };
    try {
      if (typeof window.stablesGetUserActivityRows === 'function') addRows(window.stablesGetUserActivityRows());
    } catch (_) { /* ignore */ }
    try {
      const key = String(cfg.USER_ACTIVITY_STORAGE_KEY || 'stables_test_user_activity_v1').trim();
      const raw = key ? localStorage.getItem(key) : '';
      if (!raw) return out;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) addRows(parsed);
      else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rows)) addRows(parsed.rows);
    } catch (_) { /* ignore */ }
    return out;
  }

  function treasuryTxKey(row) {
    const id = String((row && row.id) || '').trim();
    const direct = String((row && (row.explorerTxId || row.txpowid || row.txid || row.pendingTxnId)) || '').trim();
    if (direct) return direct.toLowerCase();
    const node = id.match(/^NODE-([^:]+)(?::.+)?$/i);
    return node ? node[1].toLowerCase() : '';
  }

  function treasuryRowKind(row) {
    if (!row || typeof row !== 'object') return '';
    const status = String(row.status || '').toLowerCase();
    const title = String(row.title || '').toLowerCase();
    const note = String(row.note || '').toLowerCase();
    const cp = String(row.counterparty || '').toLowerCase();
    const text = [title, note, cp, String(row.id || '').toLowerCase()].join(' ');
    if (status.indexOf('fail') >= 0 || title.indexOf('failed') >= 0 || note.indexOf('failed') >= 0) return '';
    if (text.indexOf('faucet') >= 0 || text.indexOf('reset') >= 0) return '';
    const ccy = String(row.ccy || row.category || '').toLowerCase();
    const dir = String(row.dir || '').toLowerCase();
    if (ccy === 'usdw') {
      if (dir === 'in' && (text.indexOf('mint') >= 0 || text.indexOf('receiving usdw') >= 0 || text.indexOf('covenant reserve') >= 0)) return 'mintUsd';
      if (dir === 'out' && text.indexOf('burn') >= 0) return 'burnUsd';
    }
    if (ccy === 'xwiniwa') {
      if (dir === 'in' && text.indexOf('mint') >= 0) return 'mintXwm';
      if (dir === 'out' && text.indexOf('burn') >= 0) return 'burnXwm';
    }
    if (ccy === 'winiwa' || ccy === 'winima') {
      if (dir === 'out' && text.indexOf('xwiniwa mint') >= 0) return 'lockXwmWin';
      if (dir === 'in' && text.indexOf('xwiniwa') >= 0 && text.indexOf('burn') >= 0) return 'reclaimXwmWin';
      if (dir === 'out' && (text.indexOf('collateral lock') >= 0 || text.indexOf('mint collateral') >= 0 || text.indexOf('covenant collateral') >= 0 || text.indexOf('winiwa for usdw') >= 0)) return 'lockWin';
      if (dir === 'in' && (text.indexOf('burn reclaim') >= 0 || text.indexOf('reclaim') >= 0)) return 'reclaimWin';
    }
    return '';
  }

  function deriveMintBurnTreasuryFromActivity() {
    const rows = readStoredUserActivityRowsForTreasury();
    const groups = new Map();
    const xwSeen = new Set();
    const xw = { minted: 0, burned: 0, winiwaLocked: 0, winiwaReleased: 0 };
    rows.forEach(function (row) {
      const kind = treasuryRowKind(row);
      if (!kind) return;
      const amt = Math.abs(Number(row.amt || row.amount || 0));
      if (!(amt > 0)) return;
      if (kind === 'mintXwm' || kind === 'burnXwm' || kind === 'lockXwmWin' || kind === 'reclaimXwmWin') {
        const id = String(row.id || '') + ':' + kind;
        if (xwSeen.has(id)) return;
        xwSeen.add(id);
        if (kind === 'mintXwm') xw.minted += amt;
        else if (kind === 'burnXwm') xw.burned += amt;
        else if (kind === 'lockXwmWin') xw.winiwaLocked += amt;
        else if (kind === 'reclaimXwmWin') xw.winiwaReleased += amt;
        return;
      }
      const key = treasuryTxKey(row);
      // USDw Treasury accounting needs a tx id so generated rows do not become real issuance.
      if (!key) return;
      if (!groups.has(key)) groups.set(key, { mintUsd: 0, lockWin: 0, burnUsd: 0, reclaimWin: 0 });
      const g = groups.get(key);
      // Local optimistic rows and later node rows can both exist for the same tx. Keep the largest
      // economic leg per token/kind so one tx cannot double-count itself.
      g[kind] = Math.max(Number(g[kind]) || 0, amt);
    });

    let issuedUsdw = 0;
    let winiwaLocked = 0;
    let mintCount = 0;
    let burnCount = 0;
    groups.forEach(function (g) {
      if (g.mintUsd > 0 && g.lockWin > 0) {
        issuedUsdw += g.mintUsd;
        winiwaLocked += g.lockWin;
        mintCount++;
      }
      if (g.burnUsd > 0 && g.reclaimWin > 0) {
        issuedUsdw -= g.burnUsd;
        winiwaLocked -= g.reclaimWin;
        burnCount++;
      }
    });
    issuedUsdw = Math.max(0, Number(issuedUsdw.toFixed(8)));
    winiwaLocked = Math.max(0, Number(winiwaLocked.toFixed(8)));
    const xWiniwaSupply = Math.max(0, Number((xw.minted - xw.burned).toFixed(8)));
    const xWiniwaWiniwaLocked = Math.max(0, Number((xw.winiwaLocked - xw.winiwaReleased).toFixed(8)));
    return {
      issuedUsdw: issuedUsdw,
      stableWiniwaLocked: winiwaLocked,
      xWiniwaSupply: xWiniwaSupply,
      xWiniwaWiniwaLocked: xWiniwaWiniwaLocked,
      winiwaLocked: Number((winiwaLocked + xWiniwaWiniwaLocked).toFixed(8)),
      mintCount: mintCount,
      burnCount: burnCount,
      txCount: groups.size,
      xWiniwaTxCount: xwSeen.size
    };
  }

  /**
   * PROTOCOL balance sheet, live from the chain (Flow 2). Same model as the registry
   * `balance_sheet` block and tools/read-balance-sheet.mjs — one accounting truth, three consumers.
   * Uses only covenant-address coin queries (the wallet tracks both covenants) + config constants.
   */
  window.__STABLES_TEST_READ_BALANCE_SHEET__ = async function readProtocolBalanceSheet(winiwaUsd) {
    // GENESIS-3.1 PILOT (audit #2): the balance sheet comes from the pilot's on-chain truth —
    // the collateral pool coin carries pC(40) + the oracle-audited sheet (50 assetsUSD / 51
    // liabUSD); the pool amount is the deposit. xWiniwa is parked (none circulating), NAV par.
    if (forwardPricing && g3profileName === 'prod' && g3cfg.collateral_vault_address) {
      const coinsAtG3 = async function (addr) {
        try { const r = await mdsCmdAsync('coins address:' + addr); return (r && r.response) || []; } catch (_) { return []; }
      };
      const poolCoins = await coinsAtG3(g3cfg.collateral_vault_address);
      const pool = poolCoins
        .filter(function (c) { return !c.spent && c.storestate && String(c.tokenid) === String(g3cfg.winiwa_token_id); })
        .sort(function (a, b) { return Number(b.tokenamount) - Number(a.tokenamount); })[0];
      if (pool) {
        const pv = function (n) { const e = (pool.state || []).find(function (s) { return Number(s.port) === n; }); const v = e ? Number(e.data) : NaN; return Number.isFinite(v) ? v : null; };
        const pC = pv(40), aUSD = pv(50), lUSD = pv(51);
        if (pC > 0 && aUSD != null && lUSD != null) {
          window.__STABLES_G3_PC = pC;   // live collateral rate for display conversions
          let blockNum = null;
          try { const st2 = await mdsCmdAsync('status'); blockNum = Number(st2 && st2.response && st2.response.chain && st2.response.chain.block) || null; } catch (_) {}
          const L_w = lUSD / pC;                                   // Winiwa backing the owed USD
          const T_w = Number(pool.tokenamount) || 0;               // deposited collateral (Winiwa)
          const ratio = lUSD > 0 ? (aUSD / lUSD) : Infinity;
          return {
            at: Date.now(), block: blockNum, source: 'oracle-state-coin', winiwaUsd: pC,
            assets: { T: T_w },
            liabilities: { usdwExternal: lUSD, L_winiwa: L_w },
            equity: { E_eff: Math.max(0, T_w - L_w), xwiniwaExternal: 0 },
            nav: 1, navAtFloor: false,
            cr: ratio > 9.99 ? Infinity : ratio   // Infinity renders as the honest "999%+"
          };
        }
      }
      throw new Error('Pilot balance sheet not readable yet (pool coin/ports pending).');
    }
    const bsCfg = (window.STABLES_CONFIG || {}).TEST_BALANCE_SHEET || null;
    if (!bsCfg || !mintBurnCovenantAddress || !xwiniwaCovenantAddress) {
      throw new Error('Balance-sheet config incomplete (TEST_BALANCE_SHEET / covenant addresses).');
    }
    // mdsCmdAsync = RPC-first transport (web preview / core-node mode) with MDS fallback (APK/zip).
    const coinsAt = async function (addr) {
      try { const r = await mdsCmdAsync('coins address:' + addr); return (r && r.response) || []; } catch (_) { return []; }
    };
    const sumTok = function (coins, tokenid) {
      return coins
        .filter(function (c) { return !c.spent && String(c.tokenid).toUpperCase() === String(tokenid).toUpperCase(); })
        .reduce(function (s, c) { return s + Number(c.tokenamount || c.amount || 0); }, 0);
    };
    let block = null;
    try {
      const st = await mdsCmdAsync('status');
      block = Number(st && st.response && st.response.chain && st.response.chain.block) || null;
    } catch (_) { block = null; }
    const usdwCovCoins = await coinsAt(mintBurnCovenantAddress);
    const floor = Number(bsCfg.nav_floor_winiwa) > 0 ? Number(bsCfg.nav_floor_winiwa) : 0.01;

    // PRIMARY: the oracle-audited snapshot published in the USDw covenant state coin
    // (ports 50=T 51=S 52=X 53=E_eff 54=winiwaUsd, refreshed with every rate update).
    // A light wallet's own coin view of the covenants can be incomplete (it only indexes coins it
    // has seen), so the signed on-chain snapshot is the display truth; local math is the fallback.
    const stateCoin = usdwCovCoins.find(function (c) { return String(c.tokenid) === '0x00' && c.state && c.state.length; }) || null;
    const portVal = function (n) {
      if (!stateCoin) return null;
      const e = (stateCoin.state || []).find(function (s) { return Number(s.port) === n; });
      const v = e ? Number(e.data) : NaN;
      return Number.isFinite(v) ? v : null;
    };
    const oT = portVal(50), oS = portVal(51), oX = portVal(52), oE = portVal(53), oP = portVal(54);
    if (oT != null && oS != null && oX != null && oE != null && oP != null && oP > 0) {
      const L = oS / oP;
      const nav = oX > 0 ? Math.max(oE / oX, floor) : 1;
      return {
        at: Date.now(),
        block: block,
        source: 'oracle-state-coin',
        winiwaUsd: oP,
        assets: { T: oT },
        liabilities: { usdwExternal: oS, L_winiwa: L },
        equity: { E_eff: oE, xwiniwaExternal: oX },
        nav: nav,
        navAtFloor: oX > 0 && (oE / oX) < floor,
        cr: L > 0 ? ((oE + L) / L) : Infinity
      };
    }

    // FALLBACK: compute locally from this node's covenant coin view (may understate on light wallets).
    const xwCovCoins = await coinsAt(xwiniwaCovenantAddress);
    const tUsdwPool = sumTok(usdwCovCoins, winiwaTokenId);
    const tXwPool = sumTok(xwCovCoins, winiwaTokenId);
    const usdwAtCov = sumTok(usdwCovCoins, usdwTokenId);
    const xwAtCov = sumTok(xwCovCoins, xwiniwaTokenId);
    const T = tUsdwPool + tXwPool;
    const S = Math.max(0, (Number(bsCfg.usdw_reserve_seed) - usdwAtCov) + Number(bsCfg.gifted_usdw || 0));
    const X = Math.max(0, (Number(bsCfg.xwiniwa_reserve_seed) - xwAtCov) + Number(bsCfg.gifted_xwiniwa || 0));
    const price = Number(winiwaUsd) > 0 ? Number(winiwaUsd) : 0;
    const L = price > 0 ? (S / price) : 0;
    const eRaw = T - L;
    const eEff = eRaw + Number(bsCfg.equity_offset_winiwa || 0);
    const nav = X > 0 ? Math.max(eEff / X, floor) : 1;
    const cr = L > 0 ? ((eEff + L) / L) : Infinity;
    return {
      at: Date.now(),
      block: block,
      source: 'local-coin-view',
      winiwaUsd: price,
      assets: { usdwCovenantWiniwaPool: tUsdwPool, xwiniwaCovenantWiniwaPool: tXwPool, T: T },
      liabilities: { usdwExternal: S, L_winiwa: L },
      equity: { E_raw: eRaw, E_eff: eEff, offset: Number(bsCfg.equity_offset_winiwa || 0), xwiniwaExternal: X },
      nav: nav,
      navAtFloor: X > 0 && (eEff / X) < floor,
      cr: cr,
      reserves: { usdwAtCovenant: usdwAtCov, xwiniwaAtCovenant: xwAtCov }
    };
  };

  window.__STABLES_TEST_READ_MINT_BURN_TREASURY__ = async function readMintBurnTreasurySnapshot() {
    if (!mintBurnCovenantAddress || !winiwaTokenId || !usdwTokenId) {
      throw new Error('Mint/burn covenant treasury is not configured.');
    }
    const activityLedger = deriveMintBurnTreasuryFromActivity();
    if (!(activityLedger.issuedUsdw > 0) && !(activityLedger.xWiniwaSupply > 0)) {
      throw new Error('No real mint/burn Treasury ledger is available yet.');
    }
    const winiwaLocked = activityLedger.winiwaLocked;
    const issuedUsdw = activityLedger.issuedUsdw;
    return {
      address: mintBurnCovenantAddress,
      issuedUsdw: issuedUsdw,
      winiwaLocked: winiwaLocked,
      stableWiniwaLocked: activityLedger.stableWiniwaLocked,
      xWiniwaSupply: activityLedger.xWiniwaSupply,
      xWiniwaWiniwaLocked: activityLedger.xWiniwaWiniwaLocked,
      burnWiniwaPerUsd: issuedUsdw > 0 ? (activityLedger.stableWiniwaLocked / issuedUsdw) : 0,
      activityLedger: activityLedger,
      source: 'mint-burn-activity-ledger'
    };
  };

  async function findFaucetPoolCoin() {
    const pool = await findCovenantCoinsUrgent([
      'coins',
      'tokenid:' + winiwaTokenId,
      'address:' + covenantAddress,
    ]);
    const minPool = faucetMinPoolInput(claimAmount);
    const unspent = pool.filter(function (c) {
      return coinIsSpendablePool(c, minPool);
    });
    return unspent.sort(function (a, b) {
      return Number(b.tokenamount) - Number(a.tokenamount);
    })[0] || null;
  }

  async function findFaucetLevelCoins() {
    const queries = [
      ['coins', 'tokenid:' + activeFaucetTokenId, 'address:' + activeFaucetAddress],
    ];
    if (!activeFaucetUsesForwardProfile && covenantMiniaddress) {
      queries.push(['coins', 'tokenid:' + activeFaucetTokenId, 'address:' + covenantMiniaddress]);
    }
    queries.push(['coins', 'address:' + activeFaucetAddress]);
    if (!activeFaucetUsesForwardProfile && covenantMiniaddress) {
      queries.push(['coins', 'address:' + covenantMiniaddress]);
    }
    queries.push(['coins', 'tokenid:' + activeFaucetTokenId]);

    const isFaucetCoin = function (coin) {
      if (!coin || String(coin.tokenid || '').toLowerCase() !== activeFaucetTokenId.toLowerCase()) return false;
      const addr = String(coin.address || coin.miniaddress || '').trim().toLowerCase();
      if (!addr) return false;
      return addr === activeFaucetAddress.toLowerCase()
        || (!activeFaucetUsesForwardProfile && covenantMiniaddress && addr === covenantMiniaddress.toLowerCase());
    };
    const isAvailableFaucetCoin = function (coin) {
      // The forward-profile faucet spends its token pool coins exactly as deployed, including
      // storestate:true coins. The legacy covenant keeps a separate state coin and only spends
      // non-state token pool coins.
      return activeFaucetUsesForwardProfile ? coinIsUnspent(coin) : coinIsSpendablePool(coin, 0);
    };

    let best = [];
    for (let i = 0; i < queries.length; i++) {
      try {
        const coins = await findCovenantCoinsUrgent(queries[i]);
        const filtered = coins.filter(isFaucetCoin);
        if (filtered.some(function (c) { return isAvailableFaucetCoin(c) && coinTokenAmount(c) > 0; })) {
          return filtered;
        }
        if (!best.length && filtered.length) best = filtered;
      } catch (_) { /* try the next query shape */ }
    }
    return best;
  }

  // Public: how much Winiwa is left in the on-chain faucet covenant pool, for the Faucet page level.
  // Caches the last fetched value so the Faucet page can render immediately on open while refreshing in the background.
  let _faucetLevelTracked = false;
  let _faucetLevelTracking = null;
  // The persistent retry that kept the faucet alive through a slow node start now belongs to the
  // shared readiness engine, which runs it for EVERY subject. Keeping a private copy here is what
  // let the faucet quietly own a recovery driver the vault did not have. This shim stays so the
  // call sites read the same; it schedules nothing of its own.
  function scheduleFaucetLevelRetry() {
    /* the readiness sweep re-runs any subject that is not proven; nothing to schedule here */
  }
  // True only after a trusted live faucet-level read in this app session.
  // While false, claiming stays disabled to avoid creating a pour before pool readiness is known.
  window.__STABLES_FAUCET_LEVEL_READY__ = false;
  window.stablesRefreshFaucetLevel = async function stablesRefreshFaucetLevel(attempt) {
    attempt = Number(attempt) || 0;
    const el = document.getElementById('faucetLevelWiniwa');
    const cached = window.__STABLES_FAUCET_LEVEL_CACHED__ === 'unavailable'
      ? ''
      : window.__STABLES_FAUCET_LEVEL_CACHED__;
    const render = function (text) {
      if (el) el.textContent = text;
    };
    const setReady = function (ready, state) {
      window.__STABLES_FAUCET_LEVEL_READY__ = !!ready;
      window.__STABLES_FAUCET_LEVEL_STATE__ = state || (ready ? 'ready' : 'syncing');
      try {
        if (typeof window.syncFaucetWiniwaClaimButton === 'function') window.syncFaucetWiniwaClaimButton();
      } catch (_) { /* ignore */ }
    };
    setReady(false, cached ? 'stale' : 'syncing');
    // A cached value is last-known information, not a current proof. Name it Stale and keep the
    // claim disabled until this session receives a fresh covenant-coin read.
    if (cached && el) {
      render('Stale · ' + cached);
    } else if (el) {
      el.innerHTML = '<span class="stables-qr-spinner" style="width:12px;height:12px;border-width:2px" aria-hidden="true"></span><span>Loading…</span>';
    }
    // Honest "syncing" state: a spinner + label, used whenever we cannot trust the read yet so
    // we never paint a false "0 Winiwa" (an empty `coins address:<covenant>` result during the
    // node's initial block download / before it tracks the covenant looks identical to a genuinely
    // empty pool).
    const renderSyncing = function () {
      if (!el) return;
      el.innerHTML = '<span class="stables-qr-spinner" style="width:12px;height:12px;border-width:2px" aria-hidden="true"></span><span>Syncing…</span>';
    };
    const retryOrUnavailable = function () {
      if (attempt < 4) {
        if (!cached) renderSyncing();
        setReady(false, cached ? 'stale' : 'syncing');
        setTimeout(function () { try { window.stablesRefreshFaucetLevel(attempt + 1); } catch (_) { /* ignore */ } }, 3000);
        return true;
      }
      render('Proof unavailable');
      window.__STABLES_FAUCET_LEVEL_CACHED__ = 'unavailable';
      setReady(false, 'proof-unavailable');
      scheduleFaucetLevelRetry(15000);
      return false;
    };
    try {
      if (!activeFaucetAddress || !activeFaucetTokenId) {
        render('unavailable');
        setReady(false, 'unavailable');
        return;
      }
      const hasRpc = !!(typeof stablesGetRpcConfig === 'function' && stablesGetRpcConfig() && typeof stablesRpcSendCommand === 'function');
      const hasMds = !!(typeof MDS !== 'undefined' && MDS.cmd);
      if (!hasRpc && !hasMds) { retryOrUnavailable(); return; }
      const L = window.__STABLES_LIVE_NODE;
      if (!(L && L.rpcOk) && typeof window.stablesPullBlockAndBalanceFromMds === 'function') {
        try { window.stablesPullBlockAndBalanceFromMds(true); } catch (_) { /* best-effort */ }
      }
      // Make sure the node tracks the faucet covenant before reading, so `coins address:` can return
      // the pool. A fresh RPC session / embedded APK node may not track it yet, which otherwise reads
      // as a false 0. Best-effort, once per session (idempotent if already tracked).
      if (!_faucetLevelTracked) {
        if (!activeFaucetUsesForwardProfile) {
          if (!_faucetLevelTracking) {
            _faucetLevelTracking = ensureFaucetCovenantScript().then(function () {
              _faucetLevelTracked = true;
              return true;
            }).catch(function () {
              return false;
            }).finally(function () {
              _faucetLevelTracking = null;
            });
          }
          await _faucetLevelTracking;
        } else {
          _faucetLevelTracked = true;
        }
      }
      // Urgent read path (bypasses the polling queue) so the amount returns fast instead of waiting
      // behind live balance/activity polling.
      const coins = await findFaucetLevelCoins();
      if (!Array.isArray(coins)) { retryOrUnavailable(); return; }
      const total = coins.reduce(function (s, c) {
        const available = activeFaucetUsesForwardProfile ? coinIsUnspent(c) : coinIsSpendablePool(c, 0);
        return available ? s + coinTokenAmount(c) : s;
      }, 0);
      if (total > 0) {
        // A positive read is always trustworthy — show it immediately, regardless of sync heuristics.
        const text = Number(total).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' Winiwa';
        render(text);
        window.__STABLES_FAUCET_LEVEL_CACHED__ = text;
        setReady(true, 'ready');
        return;
      }
      // total === 0: an empty read on a fresh node can be index/re-scan timing rather than a truly
      // empty pool, so retry a few times before trusting it. A positive read above short-circuits.
      if (attempt < 4) { retryOrUnavailable(); return; }
      // After retries (D22 four-state truth law): a zero may render only when emptiness is
      // positively proven. The faucet's native state coin lives at the same covenant address:
      // state coin visible + no pool coin = the pool is genuinely exhausted; neither visible =
      // the covenant coins sit outside this node's unpruned window (~1,080 blocks) and the honest
      // state is "Proof unavailable", never zero. Claiming stays disabled in both cases because
      // the pool coin, a required transaction input, is not locally proven.
      const synced = (typeof window.stablesNodeIsSynced === 'function') ? window.stablesNodeIsSynced() : true;
      if (!synced) {
        retryOrUnavailable();
        return;
      }
      let stateCoinVisible = false;
      try { stateCoinVisible = !!(await findFaucetStateCoin()); } catch (_) { stateCoinVisible = false; }
      if (stateCoinVisible) {
        render('0 Winiwa');
        window.__STABLES_FAUCET_LEVEL_CACHED__ = '0 Winiwa';
        setReady(false, 'empty');
        return;
      }
      // The live pool coin is not locally provable (fresh light node: pruned / out-of-window).
      // Fall back to the on-chain state beacon: a single tracked coin whose Merkle root commits
      // the faucet level, verified in-browser against the root. This shows the level with no
      // trusted server instead of "Proof unavailable". Claiming stays DISABLED (setReady(false))
      // because the pool coin the claim must spend is still not locally held — display vs take.
      try {
        const beacon = await tv81ReadBeacon();
        if (beacon && beacon.verified && beacon.leaves && beacon.leaves.faucet && beacon.leaves.faucet.level != null) {
          const lvl = Number(beacon.leaves.faucet.level);
          if (Number.isFinite(lvl) && lvl >= 0) {
            const text = lvl.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' Winiwa';
            render(text);
            window.__STABLES_FAUCET_LEVEL_CACHED__ = text;
            setReady(false, 'proof-unavailable');
            return;
          }
        }
      } catch (_) { /* fall through to the honest unavailable state */ }
      render('Proof unavailable');
      window.__STABLES_FAUCET_LEVEL_CACHED__ = 'unavailable';
      setReady(false, 'proof-unavailable');
      scheduleFaucetLevelRetry(15000);
    } catch (_) {
      retryOrUnavailable();
    }
  };

  // On-chain xWiniwa reserve level (the xWiniwa the mint covenant can still release). Same
  // pattern as the Winiwa faucet level: track the covenant first (a fresh embedded/RPC node may
  // not yet index coins at an address it did not create — an untracked read looks like a false 0),
  // read the covenant's xWiniwa pool coins, and never paint a false 0 while the node is syncing.
  let _xwiniwaReserveTracked = false;
  // Founder direction 2026-07-18: the xWiniwa reserve is NOT shown to the user (minting feels
  // unlimited — the 100M reserve is far beyond any test need), but it must stay REACHABLE in the
  // background so the mint executor can always spend the reserve coin. This routine therefore runs
  // headless: it always ensures the covenant is tracked (background reachability) and only renders
  // if the (now removed) display element is present. The mint executor independently re-tracks and
  // validates the reserve at build time, so minting never depends on this having run first.
  window.stablesRefreshXwiniwaReserveLevel = async function stablesRefreshXwiniwaReserveLevel(attempt) {
    attempt = Number(attempt) || 0;
    const el = document.getElementById('xwmReserveLevel');
    const cached = window.__STABLES_XWINIWA_RESERVE_CACHED__;
    const render = function (text) { if (el) el.textContent = text; };
    const renderSyncing = function () {
      if (el) el.innerHTML = '<span class="stables-qr-spinner" style="width:12px;height:12px;border-width:2px" aria-hidden="true"></span><span>Syncing…</span>';
    };
    const previousVaultProof = window.__STABLES_XWINIWA_VAULT_PROOF_STATE__ || {};
    if (!previousVaultProof.lastReadyAt) {
      publishXwiniwaVaultProofState('syncing', { reason: 'Refreshing xWiniwa vault coins.' });
    } else if (Date.now() - Number(previousVaultProof.lastReadyAt) > 180000) {
      publishXwiniwaVaultProofState('stale', { reason: 'Refreshing a stale xWiniwa vault proof.' });
    }
    if (el) {
      if (cached) render(cached);
      else el.innerHTML = '<span class="stables-qr-spinner" style="width:12px;height:12px;border-width:2px" aria-hidden="true"></span><span>Loading…</span>';
    }
    try {
      // TV81: the reserve is the state-carrying xWiniwa coin at the deployed D13 vault address.
      let reserveAddr = xwiniwaCovenantAddress;
      let reserveScript = xwiniwaCovenantScript;
      if (tv81Exclusive) {
        try {
          const tvVault = (await tv81AppRegistry()).xwiniwa_vault || {};
          reserveAddr = String(tvVault.address || '');
          reserveScript = String(tvVault.script || '');
        } catch (_) { reserveAddr = ''; }
      }
      if (!reserveAddr || !xwiniwaTokenId) {
        render('Proof unavailable');
        publishXwiniwaVaultProofState('proof-unavailable', { reason: 'The xWiniwa vault identity is incomplete.' });
        return;
      }
      const hasRpc = !!(typeof stablesGetRpcConfig === 'function' && stablesGetRpcConfig() && typeof stablesRpcSendCommand === 'function');
      const hasMds = !!(typeof MDS !== 'undefined' && MDS.cmd);
      if (!hasRpc && !hasMds) {
        if (!cached) renderSyncing();
        publishXwiniwaVaultProofState('proof-unavailable', { reason: 'No node transport is available for the vault read.' });
        return;
      }
      if (!_xwiniwaReserveTracked) {
        try { await ensureCovenantTracked(reserveAddr, reserveScript, 'tracking the xWiniwa covenant script', 30000); } catch (_) { /* non-fatal */ }
        _xwiniwaReserveTracked = true;
      }
      if (tv81Exclusive) {
        const registry = await tv81AppRegistry();
        const vault = registry.xwiniwa_vault || {};
        const provenCoins = await tv81VaultCoins(vault);
        if (provenCoins.balance && provenCoins.reserve) {
          const reserveAmount = Number(provenCoins.reserve.tokenamount || 0);
          const poolAmount = provenCoins.pool ? Number(provenCoins.pool.tokenamount || 0) : 0;
          const issuedAtoms = BigInt(String(readStatePort(provenCoins.balance, 68) || '0'));
          const text = reserveAmount.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' xWiniwa';
          render(text);
          window.__STABLES_XWINIWA_RESERVE_CACHED__ = text;
          publishXwiniwaVaultProofState('ready', {
            reason: 'Current vault balance and reserve coins are locally proven.',
            canMint: reserveAmount > 0,
            canBurn: !!provenCoins.pool && poolAmount > 0 && issuedAtoms > 0n,
            reserveXwiniwa: reserveAmount,
            poolWiniwa: poolAmount
          });
          return;
        }
        if (attempt < 4) {
          if (!cached) renderSyncing();
          setTimeout(function () { try { window.stablesRefreshXwiniwaReserveLevel(attempt + 1); } catch (_) { /* ignore */ } }, 3000);
          return;
        }
        const syncedVaultNode = (typeof window.stablesNodeIsSynced === 'function') ? window.stablesNodeIsSynced() : true;
        if (!syncedVaultNode) {
          if (!cached) renderSyncing();
          publishXwiniwaVaultProofState(previousVaultProof.lastReadyAt ? 'stale' : 'syncing', { reason: 'The node is still syncing.' });
          return;
        }
        render('Proof unavailable');
        window.__STABLES_XWINIWA_RESERVE_CACHED__ = '';
        publishXwiniwaVaultProofState('proof-unavailable', { reason: 'The vault balance or reserve coin is not locally proven.' });
        return;
      }
      const coins = await findCovenantCoinsUrgent(['coins', 'tokenid:' + xwiniwaTokenId, 'address:' + reserveAddr]);
      if (!Array.isArray(coins)) { if (!cached) renderSyncing(); return; }
      const total = coins.reduce(function (s, c) {
        if (tv81Exclusive) return coinIsUnspent(c) ? s + coinTokenAmount(c) : s;
        return coinIsSpendablePool(c, 0) ? s + coinTokenAmount(c) : s;
      }, 0);
      if (total > 0) {
        const text = Number(total).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' xWiniwa';
        render(text);
        window.__STABLES_XWINIWA_RESERVE_CACHED__ = text;
        return;
      }
      // Empty read can be index/re-scan timing on a fresh node; retry a few times before trusting 0.
      if (attempt < 4) {
        if (!cached) renderSyncing();
        setTimeout(function () { try { window.stablesRefreshXwiniwaReserveLevel(attempt + 1); } catch (_) { /* ignore */ } }, 3000);
        return;
      }
      const synced = (typeof window.stablesNodeIsSynced === 'function') ? window.stablesNodeIsSynced() : true;
      if (!synced) { if (!cached) renderSyncing(); return; }
      // D22 four-state truth law: zero only when emptiness is positively proven. The vault's
      // native balance-state coin sits at the same address; visible state coin + no reserve coin
      // = genuinely empty reserve; neither visible = outside this node's unpruned window.
      let vaultStateVisible = false;
      try {
        const vaultCoins = await findCovenantCoinsUrgent(['coins', 'address:' + reserveAddr]);
        vaultStateVisible = (vaultCoins || []).some(function (c) {
          return coinIsUnspent(c) && coinIsState(c) && String(c.tokenid || '').toLowerCase() === '0x00';
        });
      } catch (_) { vaultStateVisible = false; }
      if (vaultStateVisible) { render('0 xWiniwa'); window.__STABLES_XWINIWA_RESERVE_CACHED__ = '0 xWiniwa'; }
      else { render('Proof unavailable'); window.__STABLES_XWINIWA_RESERVE_CACHED__ = ''; }
    } catch (err) {
      if (!cached) renderSyncing();
      const previous = window.__STABLES_XWINIWA_VAULT_PROOF_STATE__ || {};
      const synced = (typeof window.stablesNodeIsSynced === 'function') ? window.stablesNodeIsSynced() : true;
      publishXwiniwaVaultProofState(previous.lastReadyAt ? 'stale' : (synced ? 'proof-unavailable' : 'syncing'), {
        reason: (err && err.message) || 'The xWiniwa vault proof read failed.'
      });
    }
  };

  async function findFaucetStateCoin() {
    const coins = await findCovenantCoinsUrgent(['coins', 'address:' + covenantAddress]);
    return coins.find(function (c) {
      return coinIsUnspent(c) && coinIsState(c) && String(c.tokenid || '').toLowerCase() === '0x00';
    }) || null;
  }

  // D22/P12-03 state self-heal (found 2026-07-18 on the first v0.0.8.38 phone claim): a light
  // node that retro-surfaces an in-window covenant coin holds the coin and its MMR proof, but
  // its local coins view can lack the coin's STATE variables — the claim then builds from null
  // ports and the covenant refuses (scripts=false; carried state output rendered state:[]).
  // Re-import the coin from the node's OWN proof (coinexport -> coinimport track:true) and
  // re-read. Entirely node-local: no provider, no external source. Fails closed if the state is
  // still missing rather than building an invalid transaction.
  async function ensureCoinStatePresent(coin, label) {
    if (!coin || !coin.coinid) return coin;
    if (Array.isArray(coin.state) && coin.state.length) return coin;
    const id = String(coin.coinid);
    try { console.log('[state-heal] ' + (label || 'coin') + ' is state-blind; self-importing ' + id); } catch (_) { /* ignore */ }
    const exp = await urgentMdsCmdData('coinexport coinid:' + id);
    const data = exp && (typeof exp.data === 'string' ? exp.data : (exp.coinproof && exp.coinproof.data));
    if (!data || String(data).indexOf('0x') !== 0) {
      throw new Error('Cannot read the ' + (label || 'covenant') + ' state on this node yet. Try again after the next block.');
    }
    try {
      await urgentMdsCmdData('coinimport track:true data:' + data);
    } catch (e) {
      if (!/already have|already in/i.test(String((e && e.message) || e))) throw e;
    }
    const again = await findCovenantCoinsUrgent(['coins', 'coinid:' + id]);
    const fresh = (again || []).find(function (c) { return String(c.coinid || '').toLowerCase() === id.toLowerCase(); });
    if (fresh && Array.isArray(fresh.state) && fresh.state.length) {
      try { console.log('[state-heal] ' + (label || 'coin') + ' state restored (' + fresh.state.length + ' ports)'); } catch (_) { /* ignore */ }
      return fresh;
    }
    throw new Error('The ' + (label || 'covenant') + ' state is still unavailable on this node. Try again after the next block.');
  }

  async function findSendableMinimaCoin(minAmount) {
    const coins = await findCovenantCoinsUrgent(['coins', 'relevant:true', 'sendable:true', 'tokenid:0x00']);
    const need = Number(minAmount) || FAUCET_MINIMA_RESERVE;
    return coins.find(function (c) { return Number(c.amount) >= need; })
      || coins[0]
      || null;
  }

  async function ensureFaucetCovenantScript() {
    let scriptText = covenantScript;
    if (tv81Exclusive && !scriptText) {
      // TV81 ships the deployed faucet script in the registry projection so a FRESH node
      // (emulator embedded node, new community wallet) can track and spend the covenant coins.
      // Without this, only nodes that already track the script could ever claim.
      try { scriptText = String(((await tv81AppRegistry()).faucet || {}).script || ''); } catch (_) { scriptText = ''; }
    }
    if (!scriptText) {
      throw new Error('TEST_FAUCET_COVENANT_SCRIPT missing in runtime-config.js');
    }
    const escaped = scriptText.replace(/"/g, '\\"');
    const deployed = await urgentMdsCmdData('newscript trackall:true script:"' + escaped + '"');
    if (deployed && deployed.address && covenantAddress
      && String(deployed.address).toLowerCase() !== covenantAddress.toLowerCase()) {
      console.warn('Faucet script address mismatch', deployed.address, covenantAddress);
    }
    return deployed;
  }

  async function claimFaucetCovenantOnChain(wallet) {
    try { console.log('[faucet-claim] claimFaucetCovenantOnChain entered'); } catch (_) {}
    if (!covenantAddress || !winiwaTokenId) {
      throw new Error('Covenant faucet not configured in runtime-config.js');
    }

    // Make sure the node tracks the faucet covenant script before we try to spend from it.
    // This call is non-fatal: the seeding node already tracks it, but a fresh RPC session may not.
    // Without this, txncheck/txnpost can fail silently or produce transactions that peers reject.
    try {
      setFaucetPourInProgress(true, 'Tracking faucet covenant script', { step: 'Step 1/6' });
      try { console.log('[faucet-claim] Step 1/6: ensureFaucetCovenantScript'); } catch (_) {}
      await withFaucetTimeout(ensureFaucetCovenantScript(), 'tracking the faucet covenant script', 30000);
      try { console.log('[faucet-claim] Step 1/6: done'); } catch (_) {}
    } catch (e) {
      try { console.warn('[faucet] ensureFaucetCovenantScript failed; continuing (node likely already tracks the covenant):', (e && e.message) || e); } catch (_) { /* ignore */ }
    }

    setFaucetPourInProgress(true, 'Reading faucet pool and signing-fee coins', { step: 'Step 2/6' });

    // Feeless claim: only the covenant pool coin + state coin are needed (no MINIMA input).
    try { console.log('[faucet-claim] Step 2/6: looking up pool + state coins (feeless)'); } catch (_) {}
    let [poolCoin, stateCoin] = await withFaucetTimeout(Promise.all([
      findFaucetPoolCoin(),
      findFaucetStateCoin(),
    ]), 'reading faucet coins from your node', 45000);
    try { console.log('[faucet-claim] Step 2/6: poolCoin=', !!poolCoin, 'stateCoin=', !!stateCoin); } catch (_) {}

    // Fresh-install bootstrap: covenant coins from before this node's initial download are
    // not relevance-indexed; import the protocol-published proofs and retry once.
    if (!poolCoin && await bootstrapCovenantCoins()) {
      poolCoin = await withFaucetTimeout(findFaucetPoolCoin(), 'rereading the faucet pool', 45000);
    }

    if (!poolCoin) {
      // Distinguish "node not synced yet" (the pool is unreadable, NOT empty) from a genuine
      // empty/too-small pool. During initial block download the covenant coins are not in the
      // local DB yet, so asserting "pool empty / issuer must seed" would be wrong.
      const synced = (typeof window.stablesNodeIsSynced === 'function') ? window.stablesNodeIsSynced() : true;
      if (!synced) {
        throw new Error(
          'Your node is still syncing, so the faucet pool cannot be read yet (it is not empty). '
            + 'Wait for the status light to turn green, then try again.'
        );
      }
      const minPool = faucetMinPoolInput(claimAmount);
      throw new Error(
        'Faucet pool is empty or too small on chain (need >= ' + minPool
          + ' Winiwa for auto-replenish). Issuer must seed the covenant pool, then wait for sync.'
      );
    }

    // State self-heal BEFORE building: on a light node the retro-surfaced state coin can be
    // state-blind (coin + proof held, state variables absent) — build from it and the covenant
    // refuses. Restore the state from the node's own proof or fail closed with an honest message.
    if (stateCoin) {
      stateCoin = await withFaucetTimeout(ensureCoinStatePresent(stateCoin, 'faucet state coin'), 'restoring the faucet state', 45000);
    }

    const poolRemain = subTokenAmountStr(String(poolCoin.tokenamount), String(claimAmount));
    if ((!tv81Exclusive && Number(poolRemain) < claimAmount) || Number(poolRemain) < 0) {
      throw new Error(tv81Exclusive
        ? 'The TV81 faucet reserve cannot fund a full 1,000-Winiwa claim.'
        : 'Faucet pool coin too small for another pour after this claim. Issuer must top up the covenant pool.');
    }

    if (!stateCoin) {
      throw new Error('Faucet state coin missing at covenant address. Wait for chain sync and retry.');
    }

    setFaucetPourInProgress(true, 'Building claim transaction', { step: 'Step 3/6' });
    try { console.log('[faucet-claim] Step 3/6: building transaction'); } catch (_) {}
    try {
      await faucetMdsCmd('txndelete id:' + FAUCET_TXN_ID, 'clearing the previous faucet draft', 15000);
    } catch (_) { /* ignore */ }

    // TV81 advances the complete frozen 0..24 overlay. Historical generations retain their
    // deployed port-99 layout so this exclusive cutover cannot silently build an old transaction.
    const ports = tv81Exclusive
      ? await tv81FaucetStatePorts(stateCoin, wallet.address, poolRemain)
      : faucetStatePorts(wallet.address, claimAmount, poolRemain, readStatePort(stateCoin, 99));
    // Feeless claim (proven on mainnet: txncheck scripts:true, posted with burn 0). Inputs are the
    // covenant pool coin + state coin only — no MINIMA float. The native (0x00) token balances
    // exactly because the new state-coin dust (LAST output) equals the consumed state coin, so the
    // burn is 0 and a brand-new wallet with zero MINIMA can claim. See COVENANT_ENGINEERING_PLAYBOOK §1.
    const stateDust = String(stateCoin.amount || FAUCET_DUST);
    const steps = [
      'txncreate id:' + FAUCET_TXN_ID,
      'txninput id:' + FAUCET_TXN_ID + ' coinid:' + poolCoin.coinid,
      'txninput id:' + FAUCET_TXN_ID + ' coinid:' + stateCoin.coinid,
      'txnoutput id:' + FAUCET_TXN_ID + ' amount:' + claimAmount
        + ' address:' + wallet.address + ' tokenid:' + winiwaTokenId + ' storestate:false',
    ];
    if (Number(poolRemain) > 0) {
      steps.push('txnoutput id:' + FAUCET_TXN_ID + ' amount:' + poolRemain
        + ' address:' + covenantAddress + ' tokenid:' + winiwaTokenId + ' storestate:false');
    }
    steps.push('txnoutput id:' + FAUCET_TXN_ID + ' amount:' + stateDust
      + ' address:' + covenantAddress + ' tokenid:0x00 storestate:true');
    Object.keys(ports).forEach(function (p) {
      steps.push('txnstate id:' + FAUCET_TXN_ID + ' port:' + p + ' value:' + ports[p]);
    });

    for (let i = 0; i < steps.length; i++) {
      try {
        setFaucetPourInProgress(true, 'Building claim transaction (' + (i + 1) + '/' + steps.length + ')', { step: 'Step 3/6' });
        await faucetMdsCmd(steps[i], 'building the faucet transaction', 30000);
      } catch (stepErr) {
        const msg = (stepErr && stepErr.message) || String(stepErr);
        try { console.error('[faucet] build step failed:', steps[i], '→', msg); } catch (_) { /* ignore */ }
        throw new Error('Faucet build step failed (' + steps[i].split(' ')[0] + '): ' + msg);
      }
    }

    /* BASICS BEFORE SIGNING, SO THE SIGNATURE IS THE LAST THING THE BUILD NEEDS.
     *
     * On a read-only install `txnsign` is the ONLY command in this whole build that Minima queues
     * for approval — txncreate, txninput, txnoutput, txnbasics, txncheck, txnexport and txnpost are
     * all allowed (probed on the live host, 2026-09-02). Signing last therefore means exactly one
     * approval stands between the person and a finished transaction, and everything after it is
     * something the app can still do on their behalf.
     *
     * This also happens to be the documented order: basics completes the transaction, and the
     * signature is taken over the completed thing. */
    try {
      await faucetMdsCmd('txnbasics id:' + FAUCET_TXN_ID, 'finalizing transaction basics', 30000);
    } catch (basicsErr) {
      const m = (basicsErr && basicsErr.message) || String(basicsErr);
      try { console.error('[faucet-claim] txnbasics failed:', m); } catch (_) {}
      throw new Error('Finalizing the claim failed on your node (' + m + '). Please try again.');
    }

    setFaucetPourInProgress(true, 'Signing transaction on your node', { step: 'Step 4/6' });
    try { console.log('[faucet-claim] Step 4/6: signing'); } catch (_) {}
    // Sign/basics/post errors carry the failing step: a raw node exception (first live claim
    // surfaced a bare java.lang.NullPointerException) must never reach the user unattributed.
    let signQueuedForApproval = false;
    try {
      await faucetMdsCmd('txnsign id:' + FAUCET_TXN_ID + ' publickey:auto', 'signing the faucet transaction', 60000);
    } catch (signErr) {
      const m = (signErr && signErr.message) || String(signErr);
      // A command awaiting the person's approval in Minima is not a failure, and dressing it up as
      // one ("Signing the claim failed ... Please try again") sent people round a loop that could
      // never succeed.
      if (signErr && signErr.needsConfirmation) signQueuedForApproval = true;
      else {
        try { console.error('[faucet-claim] txnsign failed:', m); } catch (_) {}
        throw new Error('Signing the claim failed on your node (' + m + '). Please try again.');
      }
    }

    /* THE APPROVAL IS A PAUSE, NOT AN ENDING.
     *
     * Approving in Minima runs the queued `txnsign` and nothing else, so a build abandoned here is
     * signed and never posted — which is exactly what the founder saw: "even when approved the
     * transaction doesn't go through" (2026-09-02). The remaining steps are the app's to finish.
     *
     * Waiting is done with `txncheck`, which is READ-ONLY: it reports the transaction's signature
     * count without asking Minima for anything. That matters because the obvious way to watch for
     * an approval — polling the pending queue — is itself a write command, so asking whether the
     * person has answered would file another thing for them to answer. */
    if (signQueuedForApproval) {
      /* The queue may already be irrelevant. A claim spends covenant coins, which carry no key
         signature, so the node can consider the transaction complete the moment basics has run —
         `valid.signatures` true with a signature COUNT of zero. Check once before making anyone
         wait: if it is ready, post it and never mention an approval at all. */
      let approved = false;
      try {
        const pre = mdsPayload(await faucetMdsCmd('txncheck id:' + FAUCET_TXN_ID, 'checking the claim', 20000));
        const v = (pre && pre.valid) || {};
        if (v.basic && v.scripts && v.mmrproofs && v.signatures) {
          approved = true;
          try { console.log('[faucet-claim] transaction is already complete; no approval needed'); } catch (_) { /* ignore */ }
        }
      } catch (_) { /* fall through to waiting */ }
      if (!approved) approved = await waitForFaucetSignatureApproval();
      if (!approved) {
        const pe = new Error(typeof window.stablesNodeWriteBlockedMessage === 'function'
          ? window.stablesNodeWriteBlockedMessage()
          : 'Waiting for your approval in Minima.');
        pe.needsConfirmation = true;
        throw pe;
      }
      try { console.log('[faucet-claim] signature approved in Minima; finishing the claim'); } catch (_) {}
    }

    setFaucetPourInProgress(true, 'Validating claim transaction', { step: 'Step 5/6' });
    try { console.log('[faucet-claim] Step 5/6: txncheck'); } catch (_) {}
    const checkRes = await faucetMdsCmd('txncheck id:' + FAUCET_TXN_ID, 'validating the faucet transaction', 45000);
    const checkBody = mdsPayload(checkRes);
    const valid = (checkBody && checkBody.valid) || {};
    const fcFlags = 'scripts=' + valid.scripts + ' basic=' + valid.basic
      + ' signatures=' + valid.signatures + ' mmrproofs=' + valid.mmrproofs;
    try { console.log('[faucet] txncheck flags:', fcFlags); } catch (_) {}
    // mmrproofs MUST be true before posting (see the xWiniwa/mint paths): a freshly-synced node that
    // just started tracking the faucet covenant can hold the pool coin without a current MMR proof,
    // so a posted claim would be orphaned by mainnet and the optimistic +Winiwa never confirms.
    if (!valid.scripts || !valid.basic || !valid.mmrproofs) {
      try { console.error('[faucet] txncheck failed:', JSON.stringify(checkBody)); } catch (_) { /* ignore */ }
      if (valid.scripts && valid.basic && !valid.mmrproofs) {
        throw new Error('Your node is still syncing the faucet pool. Please wait for syncing to finish and try again.');
      }
      throw new Error('The faucet claim could not be validated. Please try again.');
    }

    // Capture the immutable inner transaction id BEFORE posting. txnpost returns a provisional
    // TxPoW id while its asynchronous miner is still working; that outer id changes and cannot
    // reconcile the eventual history row. txnexport is read-only and gives us the exact inner id
    // even if the subsequent post callback times out after the node accepted the transaction.
    const preparedRes = await faucetMdsCmd(
      'txnexport id:' + FAUCET_TXN_ID + ' showtxn:true',
      'recording the faucet transaction id',
      20000
    );
    const preparedTxnId = String((extractTxidsFromMdsPost(preparedRes) || {}).pendingTxnId || '').trim();
    if (!preparedTxnId) {
      throw new Error('The faucet transaction id could not be recorded safely. Please try again.');
    }

    setFaucetPourInProgress(true, 'Posting claim to the network', { step: 'Step 6/6' });
    try { console.log('[faucet-claim] Step 6/6: txnpost'); } catch (_) {}
    let postRes;
    try {
      postRes = await faucetMdsCmd('txnpost id:' + FAUCET_TXN_ID + ' txndelete:true', 'posting the faucet transaction', 70000);
    } catch (postErr) {
      const m = (postErr && postErr.message) || String(postErr);
      try { console.error('[faucet-claim] txnpost failed:', m); } catch (_) {}
      if (isRecoverableFaucetTimeout(postErr)) {
        const trackedErr = postErr instanceof Error ? postErr : new Error(m);
        trackedErr.pendingTxnId = preparedTxnId;
        throw trackedErr;
      }
      throw new Error('Posting the claim failed on your node (' + m + '). Please try again.');
    }
    const extracted = extractTxidsFromMdsPost(postRes);
    if (extracted && !extracted.pendingTxnId) extracted.pendingTxnId = preparedTxnId;
    try { console.log('[faucet] txnpost response:', JSON.stringify({ response: mdsPayload(postRes), extracted: extracted })); } catch (_) { /* ignore */ }
    if (!extracted || (!extracted.explorerTxId && !extracted.pendingTxnId)) {
      throw new Error('Faucet claim posted but no transaction id was returned. Check the node history or console.');
    }
    setFaucetPourInProgress(
      true,
      'Submitted to your node' + (shortTxId(extracted.explorerTxId || extracted.pendingTxnId) ? ' (' + shortTxId(extracted.explorerTxId || extracted.pendingTxnId) + ')' : '') + '; Activity is tracking confirmation',
      { step: 'Posted' }
    );

    return extracted;
  }

  // Parse a covenant state coin's stored ports 40 (ratemint) / 41 (rateburn) for price-band covenants.
  // Returns { mint, burn } as verbatim strings (SAMESTATE needs the output port to equal the stored value), or null.
  // Module-scope 8dp rounding for quote math (the covenant builder has its own local copies).
  const rate8Ceil = function (n) { return Math.ceil(Number(n) * 1e8) / 1e8; };
  const rate8Floor = function (n) { return Math.floor(Number(n) * 1e8) / 1e8; };

  // EXACT token subtraction (a - b) as a string, via BigInt at 8-decimal scale. Float subtraction
  // loses precision when a covenant reserve is large (e.g. 899,999,889) and the amount is fractional
  // (e.g. 89.49500634): 9 integer digits + 8 decimals exceeds float64's ~15-16 significant figures,
  // so `covleft = reserve - amt` came out wrong by the last digit — breaking token conservation
  // (txncheck basic=false) and the covenant's `covleft EQ @AMOUNT-amt` assert (scripts=false). Inputs
  // are parsed as strings so a large reserve amount never passes through a lossy Number().
  function subTokenAmountStr(aStr, bStr) {
    const toRaw = function (x) {
      let s = String(x).trim();
      const neg = s.startsWith('-'); if (neg) s = s.slice(1);
      let intp = s, frac = '';
      const dot = s.indexOf('.');
      if (dot >= 0) { intp = s.slice(0, dot); frac = s.slice(dot + 1); }
      frac = (frac + '00000000').slice(0, 8); // pad/truncate to 8 decimals
      const raw = BigInt(intp || '0') * 100000000n + BigInt(frac || '0');
      return neg ? -raw : raw;
    };
    let raw = toRaw(aStr) - toRaw(bStr);
    const neg = raw < 0n; if (neg) raw = -raw;
    const intp = (raw / 100000000n).toString();
    let frac = (raw % 100000000n).toString().padStart(8, '0').replace(/0+$/, '');
    return (neg ? '-' : '') + intp + (frac ? '.' + frac : '');
  }
  window.__stablesSubTokenAmountStr = subTokenAmountStr;

  function readStateRatePorts(stateCoin) {
    const st = stateCoin && stateCoin.state;
    const m = {};
    if (Array.isArray(st)) { st.forEach(function (e) { if (e && e.port != null) m[String(e.port)] = String(e.data); }); }
    else if (st && typeof st === 'object') { Object.keys(st).forEach(function (k) { m[String(k)] = String(st[k]); }); }
    if (m['40'] != null && m['41'] != null) return { mint: m['40'], burn: m['41'] };
    return null;
  }
  window.__STABLES_TEST_READ_STATE_RATES__ = readStateRatePorts;

  // Read a single STATE port's value off a live coin, as a string. Used to carry an immutable
  // covenant tag (port 99) forward across a spend: SAMESTATE(99 99) requires the recreated state
  // coin to keep the exact value the spent one held, whatever it was seeded as.
  function readStatePort(stateCoin, port) {
    const st = stateCoin && stateCoin.state;
    if (Array.isArray(st)) {
      const e = st.find(function (x) { return x && Number(x.port) === Number(port); });
      return e ? String(e.data) : null;
    }
    if (st && typeof st === 'object' && st[port] != null) return String(st[port]);
    return null;
  }

  async function findMintBurnStateCoin() {
    const coins = await findCovenantCoinsUrgent(['coins', 'address:' + mintBurnCovenantAddress]);
    return coins.find(function (c) {
      return coinIsUnspent(c) && coinIsState(c) && String(c.tokenid || '').toLowerCase() === '0x00';
    }) || null;
  }

  async function findXwiniwaStateCoin() {
    const coins = await findCovenantCoinsUrgent(['coins', 'address:' + xwiniwaCovenantAddress]);
    return coins.find(function (c) {
      return coinIsUnspent(c) && coinIsState(c) && String(c.tokenid || '').toLowerCase() === '0x00';
    }) || null;
  }

  /** Gather the fewest sendable user coins (largest first) that sum to >= target. [] if not enough. */
  async function gatherSendableUserCoins(tokenId, target) {
    const coins = await findCovenantCoinsUrgent(['coins', 'relevant:true', 'sendable:true', 'tokenid:' + tokenId]);
    const usable = coins
      .filter(function (c) {
        return coinIsUnspent(c)
          && !isTestInfraCoinAddress(c.address)
          && !isTestInfraCoinAddress(c.miniaddress);
      })
      .sort(function (a, b) { return Number(b.tokenamount) - Number(a.tokenamount); });
    const picked = [];
    let sum = 0;
    const tol = 1e-7;
    for (let i = 0; i < usable.length && sum < target - tol; i++) {
      picked.push(usable[i]);
      sum += Number(usable[i].tokenamount);
    }
    return sum >= target - tol ? picked : [];
  }

  /**
   * The base for an optimistic balance step is what the user CURRENTLY SEES — the active
   * stabilizer hold when one exists, else the balance. Never raw WALLET_* variables: node
   * coin churn can momentarily zero those (fresh-wallet gauntlet 2026-07-07: an xWiniwa burn
   * seeded Winiwa optimistic = 0 + 9.95 payout and the wallet displayed 9.95 instead of 895
   * for two minutes until the stabilizer adopted truth).
   */
  function stablesDisplayedBalanceForOptimistic(ccy) {
    try {
      const hold = (window.__STABLES_OPTIMISTIC_BAL__ || {})[ccy];
      const hv = hold ? Number(hold.value) : NaN;
      if (Number.isFinite(hv) && hv >= 0) return hv;
    } catch (_) { /* ignore */ }
    try {
      if (typeof getVaultBalance === 'function') {
        const v = Number(getVaultBalance(ccy === 'Winiwa' ? 'WINIMA' : ccy));
        if (Number.isFinite(v) && v >= 0) return v;
      }
    } catch (_) { /* ignore */ }
    return 0;
  }

  /**
   * Gather with a settle-wait (fresh-wallet gauntlet 2026-07-07: a brand-new user who pours
   * then immediately mints hit "Not enough Winiwa" — with 1,000 in the wallet. A freshly
   * received coin only becomes SENDABLE at coin depth (~3 blocks), so the gather can come up
   * empty while the balance is honest). When the wallet's total (including still-settling
   * coins) covers the target, wait for depth — up to ~2.5 min, honest status — instead of
   * failing; fail with a truthful "still settling" message only if the wait runs out.
   */
  async function gatherUserCoinsWithSettleWait(tokenId, target, tokenLabel) {
    const deadline = Date.now() + 150000;
    for (;;) {
      const picked = await gatherSendableUserCoins(tokenId, target);
      if (picked.length) return picked;
      // Does the wallet cover the target at ALL (any depth)? If not, it is a true shortfall.
      const all = await findCovenantCoinsUrgent(['coins', 'relevant:true', 'tokenid:' + tokenId]);
      const totalAnyDepth = all
        .filter(function (c) { return coinIsUnspent(c) && !isTestInfraCoinAddress(c.address) && !isTestInfraCoinAddress(c.miniaddress); })
        .reduce(function (s, c) { return s + Number(c.tokenamount); }, 0);
      if (!(totalAnyDepth >= target - 1e-7)) {
        throw new Error('Not enough ' + tokenLabel + ' in your wallet for ' + target + '. Claim from the faucet or lower the amount.');
      }
      if (Date.now() > deadline) {
        throw new Error('Your ' + tokenLabel + ' from a recent transaction is still settling. Try again in a minute.');
      }
      try {
        if (typeof window.stablesUpdateOpenTxProgressModal === 'function') {
          window.stablesUpdateOpenTxProgressModal({ built: false, phaseSub: 'Your ' + tokenLabel + ' is still settling — waiting for it to become spendable' });
        }
      } catch (_) { /* ignore */ }
      await new Promise(function (r) { setTimeout(r, 10000); });
    }
  }

  let _mintBurnPrewarmPromise = null;
  function prewarmMintBurnCovenant(reason) {
    // XR1-03: this warms the USDw peg covenant by registering its script on the tester's node at
    // every boot. It posts nothing, but it is deferred stablecoin scope doing node writes in the
    // release build, so it stands down silently (a background optimisation must not raise a refusal
    // the tester never asked for).
    if (!releaseFeatureAllowed('usdw-mint-burn')) return Promise.resolve();
    if (_mintBurnPrewarmPromise) return _mintBurnPrewarmPromise;
    _mintBurnPrewarmPromise = (async function () {
      try {
        if (mintBurnCovenantAddress && mintBurnCovenantScript) {
          await ensureCovenantTracked(mintBurnCovenantAddress, mintBurnCovenantScript, 'prewarming the mint/burn covenant', 30000);
          await Promise.allSettled([
            findCovenantCoinsUrgent(['coins', 'address:' + mintBurnCovenantAddress]),
            winiwaTokenId ? findCovenantCoinsUrgent(['coins', 'relevant:true', 'sendable:true', 'tokenid:' + winiwaTokenId]) : Promise.resolve([]),
            usdwTokenId ? findCovenantCoinsUrgent(['coins', 'relevant:true', 'sendable:true', 'tokenid:' + usdwTokenId]) : Promise.resolve([])
          ]);
        }
      } catch (e) {
        try { console.warn('[mint/burn] prewarm skipped:', reason || '', (e && e.message) || e); } catch (_) {}
      } finally {
        setTimeout(function () { _mintBurnPrewarmPromise = null; }, 30000);
      }
    })();
    return _mintBurnPrewarmPromise;
  }
  window.__STABLES_TEST_PREWARM_MINT_BURN__ = prewarmMintBurnCovenant;

  /**
   * Market-rated atomic mint/burn against the collateral covenant (app-trusted, declared collateral).
   * op 0 = MINT: release `amt` USDw, lock `coll` Winiwa (coll = amt / live rate, ~164 Winiwa per USDw).
   * op 1 = BURN: release `amt` Winiwa, burn `coll` USDw (coll = amt * live rate).
   * Built/signed by the user's node; the issuer signs nothing. The covenant declares collateral via
   * STATE(23)/output-2 (it trusts the app to lock fair market-rated collateral). Ports 30(op) 20(amt)
   * 21(recipient) 23(coll) 24(covleft) 99(tag).
   */
  async function mintBurnCovenantOnChain(op, amt, coll) {
    const flowStartMs = Date.now();
    if (!mintBurnCovenantAddress || !mintBurnCovenantScript || !winiwaTokenId || !usdwTokenId) {
      throw new Error('Mint/burn covenant not configured in runtime-config.js');
    }
    try {
      if (typeof window.stablesUpdateOpenTxProgressModal === 'function') {
        window.stablesUpdateOpenTxProgressModal({ built: false, sent: false, mined: false, phaseSub: 'Preparing covenant transaction' });
      }
    } catch (_) {}
    const wallet = await fetchTesterWallet();
    // Normalise to token precision (8-dp) so amt/coll carry no JS float tail into STATE/outputs.
    amt = Number(Number(amt).toFixed(8));
    coll = Number(Number(coll).toFixed(8));
    try {
      if (typeof window.stablesUpdateOpenTxProgressModal === 'function') {
        window.stablesUpdateOpenTxProgressModal({ built: false, phaseSub: 'Checking protocol covenant' });
      }
    } catch (_) {}
    await ensureCovenantTracked(mintBurnCovenantAddress, mintBurnCovenantScript, 'tracking the mint/burn covenant script', 30000);

    const covToken = op === 0 ? usdwTokenId : winiwaTokenId;
    const otherToken = op === 0 ? winiwaTokenId : usdwTokenId;

    try {
      if (typeof window.stablesUpdateOpenTxProgressModal === 'function') {
        window.stablesUpdateOpenTxProgressModal({ built: false, phaseSub: 'Reading protocol reserve' });
      }
    } catch (_) {}
    let covCoins = await findCovenantCoinsUrgent(['coins', 'tokenid:' + covToken, 'address:' + mintBurnCovenantAddress]);
    const pickPool = function (cs) {
      return cs.filter(function (c) { return coinIsSpendablePool(c, amt); })
        .sort(function (a, b) { return Number(b.tokenamount) - Number(a.tokenamount); })[0];
    };
    let covCoin = pickPool(covCoins);
    if (!covCoin && await bootstrapCovenantCoins()) {
      covCoins = await findCovenantCoinsUrgent(['coins', 'tokenid:' + covToken, 'address:' + mintBurnCovenantAddress]);
      covCoin = pickPool(covCoins);
    }
    if (!covCoin) {
      throw new Error('On-chain ' + (op === 0 ? 'USDw reserve' : 'Winiwa pool')
        + ' is empty or too small for this amount. Wait for sync, or the covenant needs a top up.');
    }
    const stateCoin = await findMintBurnStateCoin();
    if (!stateCoin) throw new Error('Covenant state coin missing. Wait for chain sync and retry.');

    // Price-band covenant: read the operator-signed rate from the state coin (port 40 ratemint, 41 rateburn)
    // and make amt/coll respect the on-chain band (mint: coll >= amt*ratemint; burn: amt <= coll*rateburn).
    // The txn's ports 40/41 must EQUAL the stored rate exactly (SAMESTATE), so pass them through verbatim.
    const priceBandRates = readStateRatePorts(stateCoin);
    if (priceBandRates) {
      const up8 = function (n) { return Math.ceil(Number(n) * 1e8) / 1e8; };
      const dn8 = function (n) { return Math.floor(Number(n) * 1e8) / 1e8; };
      if (op === 0) {
        const needColl = up8(amt * Number(priceBandRates.mint));
        if (coll < needColl) coll = needColl;
      } else {
        const maxAmt = dn8(coll * Number(priceBandRates.burn));
        if (amt > maxAmt) amt = maxAmt;
      }
    }

    try {
      if (typeof window.stablesUpdateOpenTxProgressModal === 'function') {
        window.stablesUpdateOpenTxProgressModal({ built: false, phaseSub: 'Selecting wallet coins' });
      }
    } catch (_) {}
    const userCoins = await gatherUserCoinsWithSettleWait(otherToken, coll, op === 0 ? 'Winiwa' : 'USDw');
    const userTotal = userCoins.reduce(function (s, c) { return s + Number(c.tokenamount); }, 0);

    // Strip JS float tails so the exact on-chain conservation + covenant remainder check pass for
    // decimal amounts (a tail like 74.99996799999999 would fail basic validity).
    const cleanTok = function (n) { return Number(Number(n).toFixed(8)); };
    // EXACT (BigInt-string) reserve remainder: the USDw reserve is large enough that a fractional
    // mint would lose the last decimal in a float subtraction and fail `covleft EQ @AMOUNT-amt`
    // (same class of bug fixed on the xWiniwa builder). covCoin.tokenamount used as a string.
    const covleft = subTokenAmountStr(String(covCoin.tokenamount), String(amt));
    const userChange = subTokenAmountStr(String(userTotal), String(coll));
    // Feeless: no MINIMA input. The new state-coin dust (LAST output) equals the consumed state coin
    // so the native (0x00) token balances exactly and the burn is 0 (same proven pattern as the
    // faucet; the covenant script references no MINIMA). A 0-MINIMA wallet can mint/burn.
    const stateDust = String(stateCoin.amount || FAUCET_DUST);

    try { await directOrMdsCmd('txndelete id:' + MINT_BURN_TXN_ID, 'clearing the previous mint/burn draft', 15000); } catch (_) { /* ignore */ }

    const steps = [
      'txncreate id:' + MINT_BURN_TXN_ID,
      'txninput id:' + MINT_BURN_TXN_ID + ' coinid:' + covCoin.coinid,
      'txninput id:' + MINT_BURN_TXN_ID + ' coinid:' + stateCoin.coinid,
    ];
    for (let u = 0; u < userCoins.length; u++) {
      steps.push('txninput id:' + MINT_BURN_TXN_ID + ' coinid:' + userCoins[u].coinid);
    }
    // out0 recipient, out1 covenant remainder of spent token, out2 collateral/return to covenant
    steps.push('txnoutput id:' + MINT_BURN_TXN_ID + ' amount:' + amt + ' address:' + wallet.address + ' tokenid:' + covToken + ' storestate:false');
    steps.push('txnoutput id:' + MINT_BURN_TXN_ID + ' amount:' + covleft + ' address:' + mintBurnCovenantAddress + ' tokenid:' + covToken + ' storestate:false');
    steps.push('txnoutput id:' + MINT_BURN_TXN_ID + ' amount:' + coll + ' address:' + mintBurnCovenantAddress + ' tokenid:' + otherToken + ' storestate:false');
    if (Number(userChange) > 0) {
      steps.push('txnoutput id:' + MINT_BURN_TXN_ID + ' amount:' + userChange + ' address:' + wallet.address + ' tokenid:' + otherToken + ' storestate:false');
    }
    // state dust back to covenant must be the LAST output (GETOUTKEEPSTATE)
    steps.push('txnoutput id:' + MINT_BURN_TXN_ID + ' amount:' + stateDust + ' address:' + mintBurnCovenantAddress + ' tokenid:0x00 storestate:true');
    const ports = {
      30: String(op), 20: String(amt), 21: wallet.address,
      23: String(coll), 24: String(covleft), 99: MINT_BURN_TAG,
    };
    // Price-band: carry the exact stored rate through ports 40/41 (SAMESTATE requires output == stored).
    if (priceBandRates) { ports[40] = priceBandRates.mint; ports[41] = priceBandRates.burn; }
    Object.keys(ports).forEach(function (p) {
      steps.push('txnstate id:' + MINT_BURN_TXN_ID + ' port:' + p + ' value:' + ports[p]);
    });

    try {
      if (typeof window.stablesUpdateOpenTxProgressModal === 'function') {
        window.stablesUpdateOpenTxProgressModal({ built: false, phaseSub: 'Building transaction' });
      }
    } catch (_) {}
    // Generous timeouts for slow embedded (mobile) nodes — see the xWiniwa builder note.
    await directOrMdsCmdBatch(steps, 'building the mint/burn covenant transaction', 90000);

    try {
      if (typeof window.stablesUpdateOpenTxProgressModal === 'function') {
        window.stablesUpdateOpenTxProgressModal({ built: false, phaseSub: 'Signing on your node' });
      }
    } catch (_) {}
    await directOrMdsCmd('txnsign id:' + MINT_BURN_TXN_ID + ' publickey:auto', 'signing the mint/burn covenant transaction', 180000);
    await directOrMdsCmd('txnbasics id:' + MINT_BURN_TXN_ID, 'finalizing the mint/burn covenant transaction', 120000);
    try {
      if (typeof window.stablesUpdateOpenTxProgressModal === 'function') {
        window.stablesUpdateOpenTxProgressModal({ built: false, phaseSub: 'Checking transaction validity' });
      }
    } catch (_) {}
    const checkRes = await directOrMdsCmd('txncheck id:' + MINT_BURN_TXN_ID, 'validating the mint/burn covenant transaction', 90000);
    const checkBody = mdsPayload(checkRes) || {};
    const valid = checkBody.valid || {};
    const mbFlags = 'scripts=' + valid.scripts + ' basic=' + valid.basic
      + ' signatures=' + valid.signatures + ' mmrproofs=' + valid.mmrproofs;
    console.log('[mint/burn] txncheck flags:', mbFlags);
    // mmrproofs MUST be true before posting (see the xWiniwa path): a freshly-synced node that just
    // started tracking the covenant can hold the coins without a current MMR proof, so a posted txn
    // would be orphaned by mainnet and the wallet falsely debited. Gate on mmrproofs.
    if (!valid.scripts || !valid.basic || !valid.mmrproofs) {
      // Surface the exact failure (which validity flag, and any per-token conservation mismatch).
      console.error('[mint/burn] txncheck failed:', JSON.stringify(checkBody));
      const coinDiag = Array.isArray(checkBody.coins)
        ? ' ' + checkBody.coins.filter(function (c) { return c && c.difference && String(c.difference) !== '0'; })
            .map(function (c) { return (c.tokenid || '').slice(0, 6) + ':' + c.difference; }).join(',')
        : '';
      if (valid.scripts && valid.basic && !valid.mmrproofs) {
        throw new Error('Your node is still syncing the reserve pool. Please wait for syncing to finish and try again.');
      }
      throw new Error('The transaction could not be validated. Please try again.');
    }
    let postRes = null;
    let postErr = null;
    try {
      try {
        if (typeof window.stablesUpdateOpenTxProgressModal === 'function') {
          window.stablesUpdateOpenTxProgressModal({ built: true, sent: false, phaseSub: 'Signed on your node', statusText: (op === 0 ? 'USDw mint ready.' : 'Burn ready.') });
        }
      } catch (_) {}
      postRes = await directOrMdsCmd('txnpost id:' + MINT_BURN_TXN_ID + ' txndelete:true', 'posting the mint/burn covenant transaction', 120000);
      console.log('[mint/burn] posted:', JSON.stringify(mdsPayload(postRes) || postRes).slice(0, 300));
    } catch (e) {
      postErr = e;
      console.warn('[mint/burn] txnpost returned no usable response; checking node history before failing:', (e && e.message) || e);
    }
    const extracted = postRes ? extractTxidsFromMdsPost(postRes) : { explorerTxId: '', pendingTxnId: '', txpow: null };
    // Extra direct capture for txnpost responses from complex covenant builds (guarantees pendingTxnId for settlement + clickability)
    try {
      const pb = mdsPayload(postRes) || {};
      const rp = (postRes && postRes.response) || {};
      const directTid = String(pb.transactionid || pb.txid || pb.txnid || rp.transactionid || rp.txid || '').trim();
      if (directTid && !extracted.pendingTxnId) extracted.pendingTxnId = directTid;
      const directPow = String(pb.txpowid || rp.txpowid || '').trim();
      if (directPow && !extracted.explorerTxId) extracted.explorerTxId = directPow;
    } catch (_) {}
    try {
      if (typeof window.stablesUpdateOpenTxProgressModal === 'function' && (extracted.pendingTxnId || extracted.explorerTxId)) {
        window.stablesUpdateOpenTxProgressModal({
          built: true,
          sent: true,
          mined: !!extracted.explorerTxId,
          txid: extracted.explorerTxId || '',
          pendingTxnId: extracted.pendingTxnId || '',
          statusText: op === 0 ? 'USDw mint sent.' : 'Burn sent.'
        });
      }
    } catch (_) {}
    if (!extracted.explorerTxId) {
      try {
        const minedTxpow = await pollMinedMintBurnTxpow(op, amt, coll, wallet.address, extracted.pendingTxnId, flowStartMs);
        if (minedTxpow) extracted.explorerTxId = minedTxpow;
      } catch (_) { /* handled below */ }
    }
    if (!extracted.explorerTxId && !extracted.pendingTxnId && postErr) {
      throw postErr;
    }
    extracted.usedStateCoinId = stateCoin.coinid;
    // For truthful post-hoc settlement verification (orphan watch): output 0 pays `amt` of
    // covToken to the user's wallet — its arrival on-chain is the proof the txn mined.
    extracted.recipientAddress = wallet.address;
    extracted.outAmt = String(amt);
    extracted.outTokenId = covToken;
    return extracted;
  }
  window.__STABLES_TEST_MINT_BURN_COVENANT__ = function () {
    // XR1-03: this is the USDw <-> Winiwa peg covenant (covToken = usdwTokenId on mint), so it is
    // deferred stablecoin scope. Its two UI callers already refuse, but the exported hook itself
    // could construct and post a real stablecoin transaction, which the release contract forbids.
    if (!releaseRequireFeature('usdw-mint-burn', 'Stablecoin mint and burn')) {
      throw releaseDeferredError('Stablecoin mint and burn');
    }
    return covenantWithOrphanRetry(mintBurnCovenantOnChain, 'mint/burn', Array.prototype.slice.call(arguments));
  };

  /**
   * xWiniwa EQUITY price-band covenant. op 0 = contribute Winiwa collateral, receive xWiniwa at the
   * operator-signed NAV rate; op 1 = return xWiniwa, receive Winiwa at the rate. `amount` is the xWiniwa
   * leg (out on mint, in on burn); the Winiwa collateral/payout is derived from the state-coin rate.
   * The chain enforces the band (coll >= amt*ratemint on mint; amt <= coll*rateburn on burn).
   */
  async function xwiniwaCovenantOnChain(op, amount) {
    const flowStartMs = Date.now();
    // TV81 exclusive generation: xWiniwa mints and burns run at par against the deployed D13
    // vault. The historical price-band covenant path below stays intact for older generations.
    if (tv81Exclusive) return tv81VaultOnChain(op, amount);
    if (xwiniwaMintBurnMode !== 'covenant' || !xwiniwaCovenantAddress || !xwiniwaCovenantScript || !winiwaTokenId || !xwiniwaTokenId) {
      throw new Error('xWiniwa covenant not configured in runtime-config.js');
    }
    const wallet = await fetchTesterWallet();
    amount = Number(Number(amount).toFixed(8));
    await ensureCovenantTracked(xwiniwaCovenantAddress, xwiniwaCovenantScript, 'tracking the xWiniwa covenant script', 30000);

    const covToken = op === 0 ? xwiniwaTokenId : winiwaTokenId;
    const otherToken = op === 0 ? winiwaTokenId : xwiniwaTokenId;

    // Equity price-band: read the operator-signed NAV rate (Winiwa per xWiniwa) from the state coin
    // (port 40 ratemint / 41 rateburn). MINT (op 0): caller `amount` = xWiniwa to receive; collateral
    // coll = amount*ratemint Winiwa. BURN (op 1): caller `amount` = xWiniwa to return (= coll); Winiwa
    // released = coll*rateburn. Ports 40/41 must equal the stored rate verbatim (SAMESTATE). 1:1 fallback.
    const stateCoin = await findXwiniwaStateCoin();
    if (!stateCoin) throw new Error('xWiniwa covenant state coin missing. Wait for chain sync and retry.');
    const xwRates = readStateRatePorts(stateCoin);
    const ceil8 = function (n) { return Math.ceil(Number(n) * 1e8) / 1e8; };
    const floor8 = function (n) { return Math.floor(Number(n) * 1e8) / 1e8; };
    let releasedAmt, coll;
    if (op === 0) {
      releasedAmt = amount;                                                   // xWiniwa released
      coll = xwRates ? ceil8(amount * Number(xwRates.mint)) : amount;         // Winiwa collateral (>= amt*ratemint)
    } else {
      coll = amount;                                                          // xWiniwa returned
      releasedAmt = xwRates ? floor8(amount * Number(xwRates.burn)) : amount; // Winiwa released (<= coll*rateburn)
    }

    let covCoins = await findCovenantCoinsUrgent(['coins', 'tokenid:' + covToken, 'address:' + xwiniwaCovenantAddress]);
    const pickPool = function (cs) {
      return cs.filter(function (c) { return coinIsSpendablePool(c, releasedAmt); })
        .sort(function (a, b) { return Number(b.tokenamount) - Number(a.tokenamount); })[0];
    };
    let covCoin = pickPool(covCoins);
    if (!covCoin && await bootstrapCovenantCoins()) {
      covCoins = await findCovenantCoinsUrgent(['coins', 'tokenid:' + covToken, 'address:' + xwiniwaCovenantAddress]);
      covCoin = pickPool(covCoins);
    }
    if (!covCoin) {
      throw new Error('On-chain ' + (op === 0 ? 'xWiniwa reserve' : 'Winiwa pool')
        + ' is empty or too small for this amount. Wait for sync, or the covenant needs a top up.');
    }

    const userCoins = await gatherUserCoinsWithSettleWait(otherToken, coll, op === 0 ? 'Winiwa' : 'xWiniwa');
    const userTotal = userCoins.reduce(function (s, c) { return s + Number(c.tokenamount); }, 0);

    const cleanTok = function (n) { return Number(Number(n).toFixed(8)); };
    // EXACT (BigInt) so a large reserve minus a fractional release keeps every decimal — the value
    // must equal the covenant's @AMOUNT-amt bit-for-bit or `covleft EQ (@AMOUNT-amt)` fails and the
    // token no longer conserves. covCoin.tokenamount is used as a STRING (never lossy-Number'd).
    const covleft = subTokenAmountStr(String(covCoin.tokenamount), String(releasedAmt));
    const userChange = subTokenAmountStr(String(userTotal), String(coll));
    // Feeless: no MINIMA input; new state-coin dust = consumed state coin so 0x00 balances, burn 0.
    const stateDust = String(stateCoin.amount || FAUCET_DUST);

    try { await directOrMdsCmd('txndelete id:' + XWINIWA_TXN_ID, 'clearing the previous xWiniwa draft', 15000); } catch (_) { /* ignore */ }

    const steps = [
      'txncreate id:' + XWINIWA_TXN_ID,
      'txninput id:' + XWINIWA_TXN_ID + ' coinid:' + covCoin.coinid,
      'txninput id:' + XWINIWA_TXN_ID + ' coinid:' + stateCoin.coinid,
    ];
    for (let u = 0; u < userCoins.length; u++) {
      steps.push('txninput id:' + XWINIWA_TXN_ID + ' coinid:' + userCoins[u].coinid);
    }
    steps.push('txnoutput id:' + XWINIWA_TXN_ID + ' amount:' + releasedAmt + ' address:' + wallet.address + ' tokenid:' + covToken + ' storestate:false');
    steps.push('txnoutput id:' + XWINIWA_TXN_ID + ' amount:' + covleft + ' address:' + xwiniwaCovenantAddress + ' tokenid:' + covToken + ' storestate:false');
    steps.push('txnoutput id:' + XWINIWA_TXN_ID + ' amount:' + coll + ' address:' + xwiniwaCovenantAddress + ' tokenid:' + otherToken + ' storestate:false');
    if (Number(userChange) > 0) {
      steps.push('txnoutput id:' + XWINIWA_TXN_ID + ' amount:' + userChange + ' address:' + wallet.address + ' tokenid:' + otherToken + ' storestate:false');
    }
    steps.push('txnoutput id:' + XWINIWA_TXN_ID + ' amount:' + stateDust + ' address:' + xwiniwaCovenantAddress + ' tokenid:0x00 storestate:true');
    const ports = {
      30: String(op), 20: String(releasedAmt), 21: wallet.address,
      23: String(coll), 24: String(covleft), 99: XWINIWA_TAG,
    };
    // Price-band: carry the exact stored rate through ports 40/41 (SAMESTATE requires output == stored).
    if (xwRates) { ports[40] = xwRates.mint; ports[41] = xwRates.burn; }
    Object.keys(ports).forEach(function (p) {
      steps.push('txnstate id:' + XWINIWA_TXN_ID + ' port:' + p + ' value:' + ports[p]);
    });

    // Timeouts generous for a SLOW EMBEDDED NODE (phone/emulator): spending the ~900M reserve coin
    // means signing + MMR-proof generation over a large coin, which is CPU-heavy on mobile and
    // exceeded the old 60s sign timeout (reported: "timed out while signing"). Desktop nodes finish
    // in seconds; the longer ceilings only matter on constrained devices and resolve as soon as done.
    await directOrMdsCmdBatch(steps, 'building the xWiniwa covenant transaction', 90000);

    await directOrMdsCmd('txnsign id:' + XWINIWA_TXN_ID + ' publickey:auto', 'signing the xWiniwa covenant transaction', 180000);
    await directOrMdsCmd('txnbasics id:' + XWINIWA_TXN_ID, 'finalizing the xWiniwa covenant transaction', 120000);
    const checkRes = await directOrMdsCmd('txncheck id:' + XWINIWA_TXN_ID, 'validating the xWiniwa covenant transaction', 90000);
    const checkBody = mdsPayload(checkRes) || {};
    const valid = checkBody.valid || {};
    const xwFlags = 'scripts=' + valid.scripts + ' basic=' + valid.basic
      + ' signatures=' + valid.signatures + ' mmrproofs=' + valid.mmrproofs;
    console.log('[xwiniwa] txncheck flags:', xwFlags);
    // mmrproofs MUST be true before posting: on a freshly-synced node that only just started
    // tracking the covenant address, the pool/reserve coins can be present but without a current
    // MMR proof, so txncheck passes scripts+basic yet the posted txn is orphaned by mainnet peers
    // (and the wallet was falsely debited). Gate on mmrproofs so we never post a doomed mint.
    if (!valid.scripts || !valid.basic || !valid.mmrproofs) {
      console.error('[xwiniwa] txncheck failed:', JSON.stringify(checkBody));
      const coinDiag = Array.isArray(checkBody.coins)
        ? ' ' + checkBody.coins.filter(function (c) { return c && c.difference && String(c.difference) !== '0'; })
            .map(function (c) { return (c.tokenid || '').slice(0, 6) + ':' + c.difference; }).join(',')
        : '';
      if (valid.scripts && valid.basic && !valid.mmrproofs) {
        throw new Error('Your node is still syncing the xWiniwa pool. Please wait for syncing to finish and try again.');
      }
      throw new Error('The transaction could not be validated. Please try again.');
    }
    let postRes = null;
    let postErr = null;
    try {
      postRes = await directOrMdsCmd('txnpost id:' + XWINIWA_TXN_ID + ' txndelete:true', 'posting the xWiniwa covenant transaction', 120000);
      console.log('[xwiniwa] posted:', JSON.stringify(mdsPayload(postRes) || postRes).slice(0, 300));
    } catch (e) {
      postErr = e;
      console.warn('[xwiniwa] txnpost returned no usable response; checking node history before failing:', (e && e.message) || e);
    }
    const extracted = postRes ? extractTxidsFromMdsPost(postRes) : { explorerTxId: '', pendingTxnId: '', txpow: null };
    try {
      const pb = mdsPayload(postRes) || {};
      const rp = (postRes && postRes.response) || {};
      const directTid = String(pb.transactionid || pb.txid || pb.txnid || rp.transactionid || rp.txid || '').trim();
      if (directTid && !extracted.pendingTxnId) extracted.pendingTxnId = directTid;
      const directPow = String(pb.txpowid || rp.txpowid || '').trim();
      if (directPow && !extracted.explorerTxId) extracted.explorerTxId = directPow;
    } catch (_) {}
    if (!extracted.explorerTxId) {
      try {
        const minedTxpow = await pollMinedXwiniwaTxpow(op, amount, wallet.address, extracted.pendingTxnId, flowStartMs);
        if (minedTxpow) extracted.explorerTxId = minedTxpow;
      } catch (_) { /* handled below */ }
    }
    if (!extracted.explorerTxId && !extracted.pendingTxnId && postErr) {
      throw postErr;
    }
    extracted.usedStateCoinId = stateCoin.coinid;
    // For truthful post-hoc settlement verification (orphan watch): output 0 pays the released
    // amount of covToken to the user's wallet — its arrival on-chain proves the txn mined.
    extracted.recipientAddress = wallet.address;
    extracted.outAmt = String(releasedAmt);
    extracted.outTokenId = covToken;
    return extracted;
  }

  // Was the covenant state coin we spent taken by a COMPETING transaction (another user, or an
  // oracle rate-update) before ours mined? If so our transaction is orphaned — its input is gone,
  // it will never confirm. Signal: the coin is spent but our txn is not the one that mined creating
  // the next state coin (we have no mined txid). This is the single-state-coin serialization losing.
  async function covenantStateOrphaned(usedStateCoinId, ourMinedTxid) {
    if (ourMinedTxid) return false; // we mined — not orphaned
    if (!usedStateCoinId) return false;
    try {
      const r = await tv81CoinsById(usedStateCoinId);
      const c = Array.isArray(r) ? r[0] : (r && r.response ? (Array.isArray(r.response) ? r.response[0] : r.response) : r);
      if (!c) return false;            // can't tell — let normal settlement handle it
      return c.spent === true;          // spent by someone, and not by us → orphaned
    } catch (_) { return false; }
  }

  // Orphan-retry wrapper: on the single-state-coin covenants a competing spend (oracle or another
  // minter) can orphan an in-flight mint/burn. Rather than fail, rebuild against the FRESH state
  // coin and repost, up to a few times. Each attempt reads current coins, so it self-heals.
  // Did our covenant txn's user-facing output (output 0: released amount to the wallet)
  // arrive on-chain? That is the only trustworthy "mined" signal on the posting node —
  // `txpow txpowid:` returns the txn from the local DB even when it never mined, and
  // explorerTxId is assigned at POST time (2026-07-06: an orphaned mint sat "Sending"
  // forever because the old wrapper treated the id as proof of mining).
  async function covenantOutputArrived(last) {
    try {
      if (!last || !last.recipientAddress || !last.outAmt || !last.outTokenId) return null;
      const r = await mdsCmdData('coins address:' + last.recipientAddress + ' tokenid:' + last.outTokenId);
      const coins = Array.isArray(r) ? r : ((r && r.response) || []);
      return coins.some(function (c) {
        return c && c.spent !== true && String(c.tokenamount || c.amount) === String(last.outAmt);
      });
    } catch (_) { return null; }
  }

  async function covenantWithOrphanRetry(builder, label, args) {
    const MAX_ATTEMPTS = 3;
    const VERIFY_MS = 8 * 60 * 1000;   // watch up to 8 min per attempt (block time ~50s)
    const POLL_MS = 20000;
    let last = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      last = await builder.apply(null, args);
      if (!last || (!last.explorerTxId && !last.pendingTxnId)) return last; // build/post failed — error already surfaced
      const deadline = Date.now() + VERIFY_MS;
      let verdict = 'pending';
      while (Date.now() < deadline) {
        await new Promise(function (r) { setTimeout(r, POLL_MS); });
        try {
          const arrived = await covenantOutputArrived(last);
          if (arrived === true) { verdict = 'mined'; break; }
          // Has the state coin we spent been consumed? If yes and our output still has not
          // arrived after a grace re-check, a competitor took it — our txn is orphaned.
          const st = await tv81CoinsById(last.usedStateCoinId);
          const c = Array.isArray(st) ? st[0] : ((st && st.response && (Array.isArray(st.response) ? st.response[0] : st.response)) || null);
          if (c && c.spent === true) {
            await new Promise(function (r) { setTimeout(r, 15000); });
            if (await covenantOutputArrived(last) === true) { verdict = 'mined'; break; }
            verdict = 'orphaned'; break;
          }
        } catch (_) { /* keep polling */ }
      }
      if (verdict === 'mined') return last;
      if (verdict === 'pending') return last; // undecided at deadline — the mirror ladder keeps watching honestly
      if (attempt < MAX_ATTEMPTS) {
        try { console.log('[' + label + '] orphaned by a competing state-coin spend — rebuilding (attempt ' + (attempt + 1) + '/' + MAX_ATTEMPTS + ')'); } catch (_) {}
        try { showToast('A competing transaction took the protocol slot — rebuilding yours automatically…', { tone: 'amber', durationMs: 4000 }); } catch (_) { /* ignore */ }
        await new Promise(function (r) { setTimeout(r, 5000); }); // let the competitor settle before re-reading coins
      } else {
        last.orphaned = true; // callers/mirror can mark the rows honestly
      }
    }
    return last;
  }

  window.__STABLES_TEST_XWINIWA_COVENANT__ = function () {
    return covenantWithOrphanRetry(xwiniwaCovenantOnChain, 'xwiniwa', Array.prototype.slice.call(arguments));
  };

  function normTxHash(h) {
    return String(h || '').trim().toLowerCase();
  }

  function coerceTxpowPayloadLocal(payload) {
    return (payload && payload.txpowid) ? payload
      : (payload && payload.txpow && payload.txpow.txpowid) ? payload.txpow
      : null;
  }

  async function fetchTxpowById(txpowId) {
    const id = normTxHash(txpowId);
    if (!id) return null;
    try {
      const res = await directOrMdsCmd(
        'txpow txpowid:' + id,
        'reading the mined faucet transaction',
        20000
      );
      return coerceTxpowPayloadLocal(mdsPayload(res));
    } catch (_) {
      return null;
    }
  }

  // A txpow only counts as OUR transaction if it is not older than the flow that is looking
  // for it (60s clock skew allowed). Founder 2026-07-06: a pour "completed" in <3s with no
  // transaction id — the shape fallback had matched a PREVIOUS claim from history (any wallet
  // that claimed before has an instantly-matching old txpow). Applies to all shape matchers.
  function txpowFreshSince(tp, sinceMs) {
    if (!sinceMs) return true;
    try {
      const t = Number(tp && tp.header && tp.header.timemilli);
      if (!Number.isFinite(t) || t <= 0) return true; // cannot tell — let amount/shape decide
      return t >= (Number(sinceMs) - 60000);
    } catch (_) { return true; }
  }

  /** Mempool post returns transactionid first; poll until history exposes its mined txpowid. */
  async function pollMinedFaucetTxpow(pendingTxnId) {
    const want = normTxHash(pendingTxnId);
    if (!want) return '';
    const deadline = Date.now() + 600000;
    while (Date.now() < deadline) {
      try {
        const histRes = await directOrMdsCmd('history max:50', 'tracking the faucet transaction', 20000);
        const hist = mdsPayload(histRes);
        const txpows = (hist && hist.txpows) || [];
        for (let i = 0; i < txpows.length; i++) {
          let tp = txpows[i];
          if (!tp || !tp.txpowid) continue;
          let txn = (tp.body && (tp.body.txn || tp.body.transaction)) || {};
          if (want && !txn.transactionid) {
            const full = await fetchTxpowById(tp.txpowid);
            if (full) {
              tp = full;
              txn = (tp.body && (tp.body.txn || tp.body.transaction)) || {};
            }
          }
          const tid = normTxHash(txn.transactionid);
          if (want && tid && tid === want) {
            return String(tp.txpowid).trim();
          }
        }
      } catch (_) { /* ignore */ }
      await sleep(5000);
    }
    return '';
  }

  async function pollMinedMintBurnTxpow(op, amt, coll, walletAddress, pendingTxnId, sinceMs) {
    const want = normTxHash(pendingTxnId);
    const recipient = normTxHash(walletAddress);
    const cov = normTxHash(mintBurnCovenantAddress);
    const covToken = normTxHash(op === 0 ? usdwTokenId : winiwaTokenId);
    const otherToken = normTxHash(op === 0 ? winiwaTokenId : usdwTokenId);
    const targetAmt = Number(amt);
    const targetColl = Number(coll);
    const closeEnough = function (a, b) {
      return Math.abs(Number(a) - Number(b)) < 0.00000001;
    };
    const stateValue = function (txn, port) {
      const states = Array.isArray(txn && txn.state) ? txn.state : [];
      const found = states.find(function (s) { return Number(s && s.port) === Number(port); });
      return found ? String(found.data) : '';
    };
    const coinTokenAmount = function (coin) {
      return Number(coin && (coin.tokenamount != null ? coin.tokenamount : coin.amount));
    };
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      try {
        const histRes = await directOrMdsCmd('history max:50', 'checking recent mint/burn history', 20000);
        const hist = mdsPayload(histRes) || {};
        const txpows = hist.txpows || hist.history || [];
        for (let i = 0; i < txpows.length; i++) {
          let tp = txpows[i];
          if (!tp || !tp.txpowid) continue;
          let txn = (tp.body && (tp.body.txn || tp.body.transaction)) || {};
          if (!txn.inputs || !txn.outputs) {
            const full = await fetchTxpowById(tp.txpowid);
            if (full) {
              tp = full;
              txn = (tp.body && (tp.body.txn || tp.body.transaction)) || {};
            }
          }
          const tid = normTxHash(txn.transactionid);
          if (want && tid && tid === want) return String(tp.txpowid).trim();
          const statesMatch = txpowFreshSince(tp, sinceMs)
            && String(stateValue(txn, 30)) === String(op)
            && closeEnough(stateValue(txn, 20), targetAmt)
            && closeEnough(stateValue(txn, 23), targetColl)
            && (!recipient || normTxHash(stateValue(txn, 21)) === recipient);
          if (!statesMatch) continue;
          const outs = Array.isArray(txn.outputs) ? txn.outputs : [];
          const received = outs.some(function (c) {
            return normTxHash(c.address) === recipient
              && normTxHash(c.tokenid) === covToken
              && closeEnough(coinTokenAmount(c), targetAmt);
          });
          const locked = outs.some(function (c) {
            return normTxHash(c.address) === cov
              && normTxHash(c.tokenid) === otherToken
              && closeEnough(coinTokenAmount(c), targetColl);
          });
          if (received && locked) return String(tp.txpowid).trim();
        }
      } catch (_) { /* ignore while the node is catching up */ }
      await sleep(5000);
    }
    return '';
  }

  async function pollMinedXwiniwaTxpow(op, amount, walletAddress, pendingTxnId, sinceMs) {
    const want = normTxHash(pendingTxnId);
    const recipient = normTxHash(walletAddress);
    const cov = normTxHash(xwiniwaCovenantAddress);
    const covToken = normTxHash(op === 0 ? xwiniwaTokenId : winiwaTokenId);
    const otherToken = normTxHash(op === 0 ? winiwaTokenId : xwiniwaTokenId);
    const targetAmt = Number(amount);
    const closeEnough = function (a, b) {
      return Math.abs(Number(a) - Number(b)) < 0.00000001;
    };
    const stateValue = function (txn, port) {
      const states = Array.isArray(txn && txn.state) ? txn.state : [];
      const found = states.find(function (s) { return Number(s && s.port) === Number(port); });
      return found ? String(found.data) : '';
    };
    const coinTokenAmount = function (coin) {
      return Number(coin && (coin.tokenamount != null ? coin.tokenamount : coin.amount));
    };
    const deadline = Date.now() + 180000;
    while (Date.now() < deadline) {
      try {
        const histRes = await directOrMdsCmd('history max:50', 'checking recent xWiniwa history', 20000);
        const hist = mdsPayload(histRes) || {};
        const txpows = hist.txpows || hist.history || [];
        for (let i = 0; i < txpows.length; i++) {
          let tp = txpows[i];
          if (!tp || !tp.txpowid) continue;
          let txn = (tp.body && (tp.body.txn || tp.body.transaction)) || {};
          if (!txn.inputs || !txn.outputs) {
            const full = await fetchTxpowById(tp.txpowid);
            if (full) {
              tp = full;
              txn = (tp.body && (tp.body.txn || tp.body.transaction)) || {};
            }
          }
          const tid = normTxHash(txn.transactionid);
          if (want && tid && tid === want) return String(tp.txpowid).trim();
          const statesMatch = txpowFreshSince(tp, sinceMs)
            && String(stateValue(txn, 30)) === String(op)
            && closeEnough(stateValue(txn, 20), targetAmt)
            && (!recipient || normTxHash(stateValue(txn, 21)) === recipient);
          if (!statesMatch) continue;
          const outs = Array.isArray(txn.outputs) ? txn.outputs : [];
          const received = outs.some(function (c) {
            return normTxHash(c.address) === recipient
              && normTxHash(c.tokenid) === covToken
              && closeEnough(coinTokenAmount(c), targetAmt);
          });
          const locked = outs.some(function (c) {
            return normTxHash(c.address) === cov
              && normTxHash(c.tokenid) === otherToken
              && closeEnough(coinTokenAmount(c), targetAmt);
          });
          if (received && locked) return String(tp.txpowid).trim();
        }
      } catch (_) { /* ignore while the node is catching up */ }
      await sleep(5000);
    }
    return '';
  }

  /* The notes sheet on Wallet management posts its own rebuild transaction and needs the same
     link from "posted" to "mined" that the faucet uses (2026-09-03). */
  window.stablesLinkMinedTxpowToActivityRows = function (rowIds, pendingTxnId, explorerTxId) {
    return linkMinedTxpowToActivityRows(rowIds, pendingTxnId, explorerTxId);
  };
  async function linkMinedTxpowToActivityRows(rowIds, pendingTxnId, explorerTxId) {
    const ids = Array.isArray(rowIds) ? rowIds.filter(Boolean) : [];
    if (!ids.length) return;
    let minedTxpowid = normTxHash(explorerTxId);
    let txpow = minedTxpowid ? await fetchTxpowById(minedTxpowid) : null;
    if (!txpow && pendingTxnId) {
      minedTxpowid = normTxHash(await pollMinedFaucetTxpow(pendingTxnId));
      txpow = minedTxpowid ? await fetchTxpowById(minedTxpowid) : null;
    }
    const finalTxid = normTxHash(txpow && txpow.txpowid) || minedTxpowid;
    if (finalTxid && typeof window.stablesUpsertUserActivityRows === 'function') {
      window.stablesUpsertUserActivityRows(ids.map(function (id) {
        return { id: id, explorerTxId: finalTxid, pendingTxnId: pendingTxnId || '' };
      }));
    }
    if (txpow && typeof window.stablesApplyTxpowToActivityRows === 'function') {
      try { window.stablesApplyTxpowToActivityRows(txpow); } catch (_) {}
    }
    if (typeof window.stablesRefreshPendingSettlement === 'function') {
      try { await window.stablesRefreshPendingSettlement(); } catch (_) {}
    }
  }

  let _faucetResumeStarted = false;

  /**
   * Reconcile a faucet row left pending by an older build. Recovery is deliberately keyed only
   * by the immutable prepared transaction id; it never guesses from amount, recipient, or shape.
   */
  async function resumePendingFaucetSettlement() {
    if (_faucetResumeStarted) return;
    let rows = [];
    try {
      rows = typeof window.stablesGetUserActivityRows === 'function'
        ? (window.stablesGetUserActivityRows() || [])
        : [];
    } catch (_) { rows = []; }
    const row = rows.find(function (candidate) {
      if (!candidate || String(candidate.status || '').toLowerCase() === 'confirmed') return false;
      if (candidate.id === FAUCET_POUR_ROW_ID) return true;
      return /^faucet claim/i.test(String(candidate.title || ''))
        && String(candidate.counterparty || '') === 'On-chain faucet covenant';
    });
    if (!row) return;
    const pendingTxnId = String(row.pendingTxnId || '').trim();
    if (!/^0x[a-f0-9]{64}$/i.test(pendingTxnId)) {
      // Builds before v0.0.10.88 sometimes retained only txnpost's temporary outer hash.
      // That value cannot identify the mined transaction safely, so stop presenting the row as
      // perpetually broadcast and explain why it requires review. Never infer completion by shape.
      markFaucetClaimNotConfirmedRow(
        'This claim was submitted by an older app version that did not retain its immutable transaction ID. Its confirmation cannot be matched safely; the Wallet balance remains the node-authoritative result. New claims use exact-ID tracking.',
        'Older faucet claim needs review',
        row.id
      );
      try { console.log('[faucet] legacy pending row has no immutable transaction id; exact recovery refused'); } catch (_) {}
      return;
    }
    _faucetResumeStarted = true;
    try {
      console.log('[faucet] resuming exact settlement for ' + shortTxId(pendingTxnId));
      setFaucetSettlementStatus(true, {
        title: 'Faucet claim syncing',
        detail: 'Checking the exact submitted transaction in node history. Do not retry yet.',
        pendingTxnId: pendingTxnId,
        amountText: fmtInt(Number(row.amt) || 0)
      });
      const minedTxpowid = await pollMinedFaucetTxpow(pendingTxnId);
      if (!minedTxpowid) {
        console.log('[faucet] exact pending transaction is not mined in local history yet');
        return;
      }
      await linkMinedTxpowToActivityRows([FAUCET_POUR_ROW_ID], pendingTxnId, minedTxpowid);
      finishFaucetSettlementStatus(
        'Confirmed on-chain. The Winiwa balance and Activity row are up to date.',
        minedTxpowid
      );
      if (typeof window.stablesRefreshLiveNodeBalances === 'function') {
        await window.stablesRefreshLiveNodeBalances({ reason: 'settlement', attempts: 4, preserveWiniwa: false });
      }
      if (typeof window.stablesSyncNodeTransactions === 'function') {
        try { await window.stablesSyncNodeTransactions(true); } catch (_) { /* ignore */ }
      }
      renderFaucetSettlementStatus();
    } catch (e) {
      try { console.log('[faucet] exact settlement resume deferred: ' + ((e && e.message) || e)); } catch (_) {}
    }
  }

  async function forceConfirmedCovenantBalanceRefresh(reason) {
    // Do NOT clear optimistic holds here (v52 attributed trace: this fired on the FIRST
    // confirmation, while `sendable` still lagged the change coin, putting the churn dip on
    // screen). Success paths never clear holds — the stabilizer releases on convergence /
    // time-stability; only FAILURE handlers may clear (revert to raw truth).
    try {
      if (typeof window.stablesRefreshLiveNodeBalances === 'function') {
        await window.stablesRefreshLiveNodeBalances({ reason: 'settlement',
          attempts: 8,
          forceDuringTxSync: true,
          preserveWiniwa: false
        });
      }
    } catch (_) { /* ignore */ }
    try {
      if (typeof window.stablesSyncNodeTransactions === 'function') {
        await window.stablesSyncNodeTransactions(true);
      }
    } catch (_) { /* ignore */ }
    try {
      if (typeof window.stablesRefreshPendingSettlement === 'function') {
        await window.stablesRefreshPendingSettlement();
      }
    } catch (_) { /* ignore */ }
    try {
      clearTestTokenBalanceDetails(['Winiwa', 'USDw', 'xWiniwa']);
      if (typeof updateGlobalUI === 'function') updateGlobalUI();
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
      // Flash the total + the test-token balances so the confirmed update is visibly signalled.
      if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate(['Winiwa', 'USDw', 'xWiniwa']);
    } catch (_) { /* ignore */ }
  }

  function isTestInfraCoinAddress(addr) {
    // TV81 protocol addresses (vault, market engine, faucet) come from the async registry
    // projection and must never import as user coins. Checked before the index.html set,
    // which predates this generation.
    try {
      const a0 = String(addr || '').trim().toLowerCase();
      if (a0 && window.__STABLES_TV81_INFRA_ADDRS__ && window.__STABLES_TV81_INFRA_ADDRS__.has(a0)) return true;
    } catch (_) { /* ignore */ }
    if (typeof window.stablesIsTestInfraAddress === 'function') {
      return window.stablesIsTestInfraAddress(addr);
    }
    const a = String(addr || '').trim().toLowerCase();
    if (!a) return false;
    const cov = String(covenantAddress || '').trim().toLowerCase();
    if (cov && a === cov) return true;
    const xcov = String(xwiniwaCovenantAddress || '').trim().toLowerCase();
    if (xcov && a === xcov) return true;
    if (xwiniwaCovenantMiniaddress && a === xwiniwaCovenantMiniaddress.toLowerCase()) return true;
    if (poolMiniaddress && a === poolMiniaddress.toLowerCase()) return true;
    if (issuerMiniaddress && a === issuerMiniaddress.toLowerCase()) return true;
    if (a === TEST_BURN_ADDRESS.toLowerCase() || a === TEST_BURN_MINIADDRESS.toLowerCase()) return true;
    return false;
  }

  async function ensureTestBurnAddress() {
    try {
      const res = await directOrMdsCmd(
        'newscript script:"' + TEST_BURN_SCRIPT.replace(/"/g, '\\"') + '" trackall:true',
        'preparing the test burn address',
        15000
      );
      const body = mdsPayload(res) || {};
      const mini = String(body.miniaddress || '').trim();
      const hex = String(body.address || '').trim();
      if (hex) window.TEST_BURN_HEX_ADDRESS = hex;
      if (mini || hex) {
        window.TEST_BURN_ADDRESS = mini || hex;
        return mini || hex;
      }
    } catch (e) {
      console.warn('Burn script tracking failed; using known burn miniaddress', e);
    }
    window.TEST_BURN_ADDRESS = TEST_BURN_MINIADDRESS;
    window.TEST_BURN_HEX_ADDRESS = TEST_BURN_ADDRESS;
    return TEST_BURN_MINIADDRESS;
  }

  /** Burn test token on-chain to dead address (for reset in test mode). Adds optimistic row. Never burns MINIMA. */
  async function burnTestTokenOnChain(tokenId, amount, ccy) {
    if (!releaseRequireFeature('test-token-reset', 'Burn all test tokens')) throw releaseDeferredError('Burn all test tokens');
    const burnAmt = Number(Number(amount).toFixed(8));
    if (!tokenId || !burnAmt || burnAmt <= 0) return false;
    const txnId = RESET_BURN_TXN_ID_PREFIX + String(ccy || 'token').toLowerCase();
    try {
      const wallet = await fetchTesterWallet();
      const burnAddress = await ensureTestBurnAddress();
      const userCoins = await gatherSendableUserCoins(tokenId, burnAmt);
      if (!userCoins.length) {
        throw new Error('No sendable ' + ccy + ' coins were found for reset burn. Wait for sync and retry.');
      }
      const userTotal = userCoins.reduce(function (s, c) { return s + Number(c.tokenamount); }, 0);
      const change = Number(Number(userTotal - burnAmt).toFixed(8));
      if (change < -0.00000001) {
        throw new Error('Not enough ' + ccy + ' for reset burn.');
      }

      try { await directOrMdsCmd('txndelete id:' + txnId, 'clearing the previous reset burn draft', 15000); } catch (_) { /* ignore */ }
      await directOrMdsCmd('txncreate id:' + txnId, 'starting the reset burn transaction', 15000);
      for (let i = 0; i < userCoins.length; i++) {
        await directOrMdsCmd('txninput id:' + txnId + ' coinid:' + userCoins[i].coinid, 'adding ' + ccy + ' reset burn inputs', 20000);
      }
      await directOrMdsCmd(
        'txnoutput id:' + txnId + ' amount:' + burnAmt + ' address:' + burnAddress + ' tokenid:' + tokenId + ' storestate:false',
        'adding the ' + ccy + ' burn output',
        20000
      );
      if (change > 0.00000001) {
        await directOrMdsCmd(
          'txnoutput id:' + txnId + ' amount:' + change + ' address:' + wallet.address + ' tokenid:' + tokenId + ' storestate:false',
          'adding the ' + ccy + ' reset burn change output',
          20000
        );
      }
      await directOrMdsCmd('txnsign id:' + txnId + ' publickey:auto', 'signing the ' + ccy + ' reset burn', 60000);
      await directOrMdsCmd('txnbasics id:' + txnId, 'finalizing the ' + ccy + ' reset burn', 30000);
      const checkRes = await directOrMdsCmd('txncheck id:' + txnId, 'validating the ' + ccy + ' reset burn', 45000);
      const checkBody = mdsPayload(checkRes) || {};
      const valid = checkBody.valid || {};
      if (!valid.scripts || !valid.basic || !valid.signatures || !valid.mmrproofs) {
        try { console.error('[reset-burn] txncheck failed for ' + ccy + ':', JSON.stringify(checkBody)); } catch (_) { /* ignore */ }
        throw new Error('The ' + ccy + ' reset could not be validated. Please try again.');
      }
      const res = await directOrMdsCmd('txnpost id:' + txnId + ' txndelete:true', 'posting the ' + ccy + ' reset burn', 70000);
      const extracted = extractTxidsFromMdsPost(res);
      // Optimistic burn row (out)
      if (typeof window.stablesAppendUserActivityRow === 'function') {
        const now = new Date();
        const dateText = now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        const row = {
          id: 'BURN-' + ccy + '-' + Date.now(),
          dir: 'out',
          icon: '🔥',
          counterparty: 'Burn address (test reset)',
          category: ccy,
          title: 'Burned ' + ccy + ' (reset)',
          date: dateText,
          amt: -Math.abs(burnAmt),
          ccy: ccy,
          address: burnAddress,
          fee: 0,
          explorerTxId: extracted.explorerTxId || '',
          pendingTxnId: extracted.pendingTxnId || ((res && res.response && res.response.transactionid) || ''),
          status: 'Pending',
          note: 'Test token burned on-chain (MINIMA untouched)',
          directionLabel: 'Outgoing',
          minimaOnChain: true,
          localOrigin: true,
          block: 0,
          ts: Date.now(),
          pendingIncoming: false
        };
        window.stablesAppendUserActivityRow(row);
      }
      return true;
    } catch (e) {
      console.warn('Burn failed for ' + ccy, e);
      throw e;
    }
  }
  window.burnTestTokenOnChain = burnTestTokenOnChain;

  async function fetchWalletKeyCoinAddresses() {
    const out = [];
    const seen = new Set();
    function pushAddr(v) {
      const s = String(v || '').trim();
      if (s.length < 8 || seen.has(s.toLowerCase())) return;
      if (isTestInfraCoinAddress(s)) return;
      seen.add(s.toLowerCase());
      out.push(s);
    }
    try {
      const res = await mdsCmdAsync('keys');
      const body = mdsPayload(res);
      const klist = Array.isArray(body) ? body : (body && Array.isArray(body.keys) ? body.keys : []);
      klist.forEach(function (k) {
        if (!k) return;
        ['address', 'miniaddress', 'mxaddress'].forEach(function (f) {
          if (k[f]) pushAddr(k[f]);
        });
      });
    } catch (_) { /* ignore */ }
    if (!out.length) {
      const wallet = await fetchTesterWallet();
      pushAddr(wallet.address);
      pushAddr(wallet.miniaddress);
    }
    if (!out.length) {
      throw new Error('Connect your node and wait for live sync, then try again.');
    }
    return out;
  }

  function sumSendableTokenCoins(coins) {
    return coins.filter(function (c) {
      if (!coinIsUnspent(c)) return false;
      if (isTestInfraCoinAddress(c.address) || isTestInfraCoinAddress(c.mxaddress) || isTestInfraCoinAddress(c.miniaddress)) {
        return false;
      }
      return true;
    }).reduce(function (sum, c) {
      return sum + (Number(c.tokenamount) || 0);
    }, 0);
  }

  async function relevantTokenSendableForWallet(tokenId) {
    if (!tokenId) return null;
    const coins = await findCovenantCoinsUrgent(['coins', 'relevant:true', 'sendable:true', 'tokenid:' + tokenId]);
    return sumSendableTokenCoins(coins);
  }

  async function readCurrentTestTokenSendableBalances() {
    const specs = [
      { prop: 'winiwa', code: 'Winiwa', tokenId: winiwaTokenId },
      { prop: 'usdw', code: 'USDw', tokenId: usdwTokenId },
      { prop: 'xwiniwa', code: 'xWiniwa', tokenId: xwiniwaTokenId }
    ].filter(function (s) { return !!s.tokenId; });
    if (!specs.length) return null;
    const results = await Promise.allSettled(specs.map(function (s) {
      return relevantTokenSendableForWallet(s.tokenId);
    }));
    const balances = {};
    const details = {};
    let any = false;
    results.forEach(function (r, i) {
      if (!r || r.status !== 'fulfilled') return;
      const n = Number(r.value);
      if (!Number.isFinite(n)) return;
      const spec = specs[i];
      balances[spec.prop] = n;
      details[spec.code] = { total: n, available: n, locked: 0, source: 'sendable-coins' };
      any = true;
    });
    return any ? { balances: balances, details: details } : null;
  }

  /** Sum sendable token coins at one wallet key address (hex or Mx). */
  async function scopedTokenSendableAtAddress(tokenId, coinAddress) {
    if (!tokenId || !coinAddress) return 0;
    const queries = [
      ['coins', 'sendable:true', 'relevant:true', 'tokenid:' + tokenId, 'address:' + coinAddress],
      ['coins', 'sendable:true', 'tokenid:' + tokenId, 'address:' + coinAddress],
    ];
    let proven = false;
    for (let i = 0; i < queries.length; i++) {
      try {
        const coins = await findCovenantCoins(queries[i]);
        proven = true;
        const sum = sumSendableTokenCoins(coins);
        if (sum > 0) return sum;
      } catch (_) { /* try next query shape */ }
    }
    return proven ? 0 : null;
  }

  async function scopedTokenSendableForWallet(tokenId) {
    const addrs = await fetchWalletKeyCoinAddresses();
    let total = 0;
    let proven = false;
    for (let i = 0; i < addrs.length; i++) {
      const amount = await scopedTokenSendableAtAddress(tokenId, addrs[i]);
      if (amount == null) continue;
      proven = true;
      total += Number(amount) || 0;
    }
    return proven ? total : null;
  }

  async function refreshTestTokenBalancesWithRetry(options) {
    const opts = options || {};
    const attempts = Math.max(1, Number(opts.attempts) || 1);
    const expectMinWiniwa = opts.expectMinWiniwa;
    const preserveWiniwa = opts.preserveWiniwa === true;
    const allowZeroWiniwa = opts.preserveWiniwa === false;
    const prevWin = (typeof WALLET_WINIWA !== 'undefined' && Number.isFinite(Number(WALLET_WINIWA)))
      ? Number(WALLET_WINIWA) : 0;
    const lastKnownWin = Number(window.__STABLES_TEST_LAST_KNOWN_WINIWA__ || 0);
    let fastHadBalanceRows = false;

    // Wallet-change guard. localStorage is per browser origin, so switching the
    // connected wallet (different node/seed) in the same browser would otherwise
    // show the previous wallet's cached balances, activity, and faucet cooldown.
    // When the wallet fingerprint (default address) changes, clear those per-wallet
    // caches and reload once for a clean slate. The first load just records it.
    try {
      const mx0 = await fetchWalletStableFingerprint();
      const FPK = 'stables_test_wallet_fingerprint_v1';
      let prevFp = '';
      try { prevFp = String(localStorage.getItem(FPK) || '').trim().toLowerCase(); } catch (_) { /* ignore */ }
      if (mx0 && mx0.length >= 40) {
        if (prevFp !== mx0) {
          try { localStorage.setItem(FPK, mx0); } catch (_) { /* ignore */ }
          const reloadGuard = 'stables_test_wallet_changed_' + mx0;
          const alreadyReloaded = !!sessionStorage.getItem(reloadGuard);
          if (prevFp && !alreadyReloaded) {
            try { sessionStorage.setItem(reloadGuard, '1'); } catch (_) { /* ignore */ }
            [(cfg && cfg.USER_ACTIVITY_STORAGE_KEY), (cfg && cfg.WALLET_OWNER_KEY),
              (cfg && cfg.FAUCET_WINIWA_LAST_CLAIM_STORAGE_KEY),
              'stables_test_wallet_v1', 'stables_test_exchange_hist_v1']
              .forEach(function (k) { if (k) { try { localStorage.removeItem(k); } catch (_) { /* ignore */ } } });
            /* Whose transactions are "not mine" is a judgement about THIS wallet, so the mirror's
               remembered non-rows go with the wallet (they are keyed by token set, not by seed). */
            try {
              for (let ki = localStorage.length - 1; ki >= 0; ki--) {
                const lk = localStorage.key(ki);
                if (lk && lk.indexOf('stables_txmirror_') === 0) localStorage.removeItem(lk);
              }
            } catch (_) { /* ignore */ }
            try { window.__STABLES_TEST_LAST_KNOWN_WINIWA__ = 0; } catch (_) { /* ignore */ }
            try { window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ = null; } catch (_) { /* ignore */ }
            try { location.reload(); } catch (_) { /* ignore */ }
            return { winiwa: null, usdw: null, xwiniwa: null, proofReady: false };
          }
        }
      }
    } catch (_) { /* fingerprint guard is best-effort */ }

    // FAST PATH for instant display (like native Minima wallet 'balance' command).
    // Use direct 'balance' query first so UI shows values immediately without waiting for 'coins' per-address scoping.
    // Scoped filter (to exclude pool/issuer) runs after for accuracy if needed.
    try {
      const balResp = await mdsCmdAsync('balance');
      if (typeof stablesMdsCmdOk === 'function' && stablesMdsCmdOk(balResp)) {
        const payload = typeof stablesCoerceMdsPayload === 'function'
          ? stablesCoerceMdsPayload(balResp.response)
          : balResp.response;
        const rows = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.balance) ? payload.balance : (payload && Array.isArray(payload.tokens) ? payload.tokens : []));
        let fastWin = null;
        let fastUsd = null;
        let fastXwm = null;
        const details = {};
        const wId = (winiwaTokenId || '').toLowerCase();
        const uId = (usdwTokenId || '').toLowerCase();
        const xId = (xwiniwaTokenId || '').toLowerCase();
        rows.forEach(function (r) {
          const id = String(r && (r.tokenid != null ? r.tokenid : r.tokenId != null ? r.tokenId : '')).toLowerCase();
          const detail = readTokenBalanceDetail(r || {});
          if (wId && id === wId && (fastWin == null || detail.total > (details.Winiwa ? details.Winiwa.total : -1))) {
            fastWin = detail.available;
            details.Winiwa = detail;
          }
          if (uId && id === uId && (fastUsd == null || detail.total > (details.USDw ? details.USDw.total : -1))) {
            fastUsd = detail.available;
            details.USDw = detail;
          }
          if (xId && id === xId && (fastXwm == null || detail.total > (details.xWiniwa ? details.xWiniwa.total : -1))) {
            fastXwm = detail.available;
            details.xWiniwa = detail;
          }
        });
        // On the ISSUER node the wallet holds the entire minted supply, so the
        // aggregated `balance` shows the bulk. Hide coins larger than a tester
        // ceiling so the issuer's wallet reflects tester-sized activity (faucet /
        // mint), not the whole supply. Tester nodes (address != issuer) are not
        // affected and keep the fast values as-is.
        let isIssuer = window.__STABLES_IS_ISSUER_NODE__;
        try {
          if (isIssuer === undefined) {
            const tw = await fetchTesterWallet();
            const testerMx = String((tw && tw.miniaddress) ? tw.miniaddress : (tw || '')).trim();
            isIssuer = !!(testerMx && issuerMiniaddress
              && testerMx.toLowerCase() === String(issuerMiniaddress).toLowerCase());
            if (testerMx) window.__STABLES_IS_ISSUER_NODE__ = isIssuer;
          }
          if (isIssuer) {
            const ceiling = Number(cfg && cfg.TEST_WALLET_COIN_CEILING) || 100000;
            const sumTesterSized = async function (tokenId) {
              if (!tokenId) return 0;
              try {
                // Sum the wallet's tester-sized coins across ALL its addresses (relevant:true), not just
                // one address — Minima rotates getaddress, so a mint/faucet/receive lands at a freshly
                // generated address. Filtering by a single address (testerMx) missed those coins, so the
                // balance ignored just-received funds (e.g. a confirmed USDw mint never showed).
                const coins = await findCovenantCoins(['coins', 'relevant:true', 'sendable:true', 'tokenid:' + tokenId]);
                return coins.filter(function (c) { return coinIsUnspent(c) && Number(c.tokenamount) <= ceiling; })
                  .reduce(function (s, c) { return s + (Number(c.tokenamount) || 0); }, 0);
              } catch (_) { return 0; }
            };
            if (wId) { fastWin = await sumTesterSized(winiwaTokenId); details.Winiwa = { total: fastWin, available: fastWin, locked: 0 }; }
            if (uId) { fastUsd = await sumTesterSized(usdwTokenId); details.USDw = { total: fastUsd, available: fastUsd, locked: 0 }; }
            if (xId) { fastXwm = await sumTesterSized(xwiniwaTokenId); details.xWiniwa = { total: fastXwm, available: fastXwm, locked: 0 }; }
          }
        } catch (_) { /* keep fast values on any failure */ }
        // We have a real balance response: guarantee a detail entry for every configured test token
        // (default 0 when the wallet holds no coin row for it). Detail-only — does NOT touch the
        // fast amounts, so an optimistic wallet value is preserved. Without this, a wallet that has a
        // Winiwa row but no USDw/xWiniwa row leaves those tokens' detail undefined, which keeps the
        // Send "Loading balance..." gate disabled forever (stablesSendNeedsLiveBalanceLoad).
        if (wId && !details.Winiwa) details.Winiwa = { total: 0, available: 0, locked: 0 };
        if (uId && !details.USDw) details.USDw = { total: 0, available: 0, locked: 0 };
        if (xId && !details.xWiniwa) details.xWiniwa = { total: 0, available: 0, locked: 0 };
        if (wId && fastWin == null) fastWin = 0;
        if (uId && fastUsd == null) fastUsd = 0;
        if (xId && fastXwm == null) fastXwm = 0;
        if (fastWin != null || fastUsd != null || fastXwm != null) {
          fastHadBalanceRows = true;
          // Apply the node's current values immediately. A positive cached Winiwa value must not survive
          // a real balance response that says the wallet holds no Winiwa.
          const preserve = !allowZeroWiniwa && preserveWiniwa;
          const winToApply = (preserve && (fastWin == null || Number(fastWin) === 0) && prevWin > 0) ? prevWin : fastWin;
          const usdToApply = fastUsd;
          applyTestTokenBalances({ winiwa: winToApply, usdw: usdToApply, xwiniwa: fastXwm }, null, details);
          // Update last known only on positive
          if (Number.isFinite(winToApply) && winToApply > 0) window.__STABLES_TEST_LAST_KNOWN_WINIWA__ = winToApply;
          else if (Number.isFinite(winToApply) && Number(winToApply) === 0) window.__STABLES_TEST_LAST_KNOWN_WINIWA__ = 0;
        }
        // Phase 4 rebuild (v93): on a regular (non-issuer) wallet the single `balance`
        // command IS the truth — the scoped coins/keys scan below exists only to exclude
        // issuer bulk supply, and on-device it cost 15-25s of node time per run. Trust the
        // fast path and stop here; the issuer node (web preview on the treasury) keeps the
        // deep scan.
        if (fastHadBalanceRows && isIssuer === false) {
          return {
            winiwa: (typeof WALLET_WINIWA !== 'undefined' ? WALLET_WINIWA : null),
            usdw: (typeof WALLET_STABLE_AMTS !== 'undefined' && WALLET_STABLE_AMTS ? WALLET_STABLE_AMTS.USDw : null),
            xwiniwa: (typeof WALLET_XWM !== 'undefined' ? WALLET_XWM : null),
            proofReady: true
          };
        }
      }
    } catch (_) { /* continue to scoped for accuracy */ }

    try {
      const spendable = await readCurrentTestTokenSendableBalances();
      if (spendable && spendable.balances) {
        const b = spendable.balances;
        const preserve = !allowZeroWiniwa && preserveWiniwa;
        const winToApply = (preserve && (b.winiwa == null || Number(b.winiwa) === 0) && prevWin > 0) ? prevWin : b.winiwa;
        applyTestTokenBalances({
          winiwa: winToApply,
          usdw: b.usdw,
          xwiniwa: b.xwiniwa
        }, null, spendable.details);
        if (Number.isFinite(Number(winToApply)) && Number(winToApply) > 0) window.__STABLES_TEST_LAST_KNOWN_WINIWA__ = Number(winToApply);
        else if (Number.isFinite(Number(winToApply)) && Number(winToApply) === 0) window.__STABLES_TEST_LAST_KNOWN_WINIWA__ = 0;
        return {
          winiwa: (typeof WALLET_WINIWA !== 'undefined' ? WALLET_WINIWA : null),
          usdw: (typeof WALLET_STABLE_AMTS !== 'undefined' && WALLET_STABLE_AMTS ? WALLET_STABLE_AMTS.USDw : null),
          xwiniwa: (typeof WALLET_XWM !== 'undefined' ? WALLET_XWM : null),
          proofReady: true
        };
      }
    } catch (_) { /* fall back to balance rows / scoped lookup */ }

    if (fastHadBalanceRows) {
      return {
        winiwa: (typeof WALLET_WINIWA !== 'undefined' ? WALLET_WINIWA : null),
        usdw: (typeof WALLET_STABLE_AMTS !== 'undefined' && WALLET_STABLE_AMTS ? WALLET_STABLE_AMTS.USDw : null),
        xwiniwa: (typeof WALLET_XWM !== 'undefined' ? WALLET_XWM : null),
        proofReady: true
      };
    }

    let winBal = null;
    let usdBal = null;
    let xwmBal = null;
    for (let i = 0; i < attempts; i++) {
      const tasks = [];
      if (winiwaTokenId) tasks.push(scopedTokenSendableForWallet(winiwaTokenId));
      else tasks.push(Promise.resolve(null));
      if (usdwTokenId) tasks.push(scopedTokenSendableForWallet(usdwTokenId));
      else tasks.push(Promise.resolve(null));
      if (xwiniwaTokenId) tasks.push(scopedTokenSendableForWallet(xwiniwaTokenId));
      else tasks.push(Promise.resolve(null));
      const amounts = await Promise.all(tasks);
      winBal = amounts[0];
      usdBal = amounts[1];
      xwmBal = amounts[2];
      const winNum = winBal == null ? null : Number(winBal);
      const expectOk = expectMinWiniwa == null || !Number.isFinite(expectMinWiniwa)
        || (Number.isFinite(winNum) && winNum >= expectMinWiniwa);
      if (expectOk || i >= attempts - 1) break;
      await sleep(5000);
    }
    if (opts.trustExpectedWiniwa === true && Number.isFinite(expectMinWiniwa) && expectMinWiniwa > 0
      && (winBal == null || Number(winBal) === 0)) {
      winBal = expectMinWiniwa;
    }
    // Always preserve previous positive value on 0/null result — prevents "balance is reset" on refresh.
    // Fast 'balance' path above already applied visible values; this keeps them stable like Minima wallet.
    if (!allowZeroWiniwa && preserveWiniwa && (winBal == null || Number(winBal) === 0) && prevWin > 0) {
      winBal = prevWin;
    }
    if (!allowZeroWiniwa && preserveWiniwa && (winBal == null || Number(winBal) === 0) && lastKnownWin > 0) {
      winBal = lastKnownWin;
    }
    if (!allowZeroWiniwa && preserveWiniwa && prevWin > 0 && (winBal == null || Number(winBal) === 0)) {
      winBal = prevWin;
    }
    if (Number.isFinite(Number(winBal)) && Number(winBal) > 0) {
      window.__STABLES_TEST_LAST_KNOWN_WINIWA__ = Number(winBal);
    } else if (Number.isFinite(Number(winBal)) && Number(winBal) === 0) {
      window.__STABLES_TEST_LAST_KNOWN_WINIWA__ = 0;
    }
    const configuredProofs = [
      !winiwaTokenId || winBal != null,
      !usdwTokenId || usdBal != null,
      !xwiniwaTokenId || xwmBal != null
    ];
    if (!configuredProofs.every(Boolean)) throw new Error('Wallet balance proof is unavailable.');
    applyTestTokenBalances({ winiwa: winBal, usdw: usdBal, xwiniwa: xwmBal });
    return { winiwa: winBal, usdw: usdBal, xwiniwa: xwmBal, proofReady: true };
  }

  // Optimistic balance guard. After an on-chain mint/burn/send/claim we credit/debit the wallet
  // immediately, but the node's `balance` lags (a received coin is not counted until it has enough
  // confirmations, and a spent coin lingers briefly), so a node refresh would otherwise REVERT the
  // change and the balance would not reflect a just-confirmed transaction. We remember the expected
  // value + direction per token and refuse to revert past it until the node actually catches up.
  // Activity rows for balance stabilization. window.USER_ACTIVITY is index.html-scoped and
  // UNDEFINED here on the APK (verified 2026-07-06) — reading it silently disabled all
  // in-flight detection, so holds died on the flat idle stopwatch mid-transaction and the
  // balance swung with the raw UTXO churn. Use the real row sources.
  function stablesActivityRowsForBalance() {
    let rows = [];
    try { if (typeof window.stablesGetUserActivityRows === 'function') rows = window.stablesGetUserActivityRows() || []; } catch (_) { /* ignore */ }
    if (!rows || !rows.length) {
      try {
        const key = String((cfg && cfg.USER_ACTIVITY_STORAGE_KEY) || 'stables_test_user_activity_g3');
        rows = JSON.parse(localStorage.getItem(key) || '[]');
      } catch (_) { rows = []; }
    }
    return Array.isArray(rows) ? rows : [];
  }

  function stablesSetOptimisticBalance(ccy, value, dir) {
    if (!ccy || !Number.isFinite(Number(value))) return;
    window.__STABLES_OPTIMISTIC_BAL__ = window.__STABLES_OPTIMISTIC_BAL__ || {};
    window.__STABLES_OPTIMISTIC_BAL__[ccy] = { value: Number(value), dir: dir === 'out' ? 'out' : 'in', ts: Date.now() };
    // Immediately reflect in the displayed balance detail so an outgoing DEBIT shows at once, not
    // only after the node registers the spend. Previously a mint's +credit appeared instantly (via
    // the settling overlay) while the −debit lagged (node sendable unchanged until the coin is
    // spent) — the reported "the +xWiniwa is in the total but not the −Winiwa". The node refresh
    // reconciles this held value back to node truth on convergence.
    try {
      const d = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {};
      const prev = d[ccy] || {};
      d[ccy] = Object.assign({}, prev, { available: Number(value), total: Number(value) });
    } catch (_) { /* ignore */ }
  }
  window.stablesSetOptimisticBalance = stablesSetOptimisticBalance;
  function stablesClearOptimisticBalance(ccys) {
    try {
      const m = window.__STABLES_OPTIMISTIC_BAL__; if (!m) return;
      (Array.isArray(ccys) ? ccys : [ccys]).forEach(function (c) { if (c) delete m[c]; });
    } catch (_) { /* ignore */ }
  }
  window.stablesClearOptimisticBalance = stablesClearOptimisticBalance;
  // Stabilizer event log (tiny, capped): every hold create/release lands here with its reason,
  // so a balance dip in a trace can be attributed to the exact rule instead of guessed at.
  function balEvt(ccy, why, nodeVal, held) {
    try {
      const L = window.__BAL_RELEASES__ = window.__BAL_RELEASES__ || [];
      L.push({ t: Date.now(), ccy: ccy, why: why, node: Number(nodeVal), held: held == null ? null : Number(held) });
      if (L.length > 200) L.shift();
    } catch (_) { /* ignore */ }
  }

  function stablesReconcileOptimistic(ccy, nodeVal) {
    try {
      const m = window.__STABLES_OPTIMISTIC_BAL__ = window.__STABLES_OPTIMISTIC_BAL__ || {};
      let e = m[ccy];

      // AUTO-FREEZE (founder 2026-07-06: "balances go in all directions" during pour/mint —
      // at moments only one leg of the transaction is reflected). Explicit holds are only set
      // by the submit hooks, so incoming pours/transfers and any hold that was dropped early
      // left the display exposed to raw UTXO churn (spent inputs gone, change unconfirmed,
      // one leg landed before the other). Now ANY currency with a settling row gets a hold,
      // frozen at the value currently on screen: the balance moves once per transaction
      // (via the explicit optimistic update) and stays put until the chain settles.
      if (!e) {
        let inFlightNow = false;
        try {
          const actsNow = stablesActivityRowsForBalance();
          const norm = String(ccy || '').toLowerCase();
          actsNow.some(function (a) {
            if (!a || !a.minimaOnChain) return false;
            const rc = String(a.ccy || a.category || '').toLowerCase();
            const match = rc === norm || (norm === 'winiwa' && rc === 'winima');
            if (!match) return false;
            const s = String(a.status || '').toLowerCase();
            if (a.pendingIncoming === true || s === 'pending' || s === 'broadcasted' || s === 'on-chain' || s === 'sending' || s === 'receiving') { inFlightNow = true; return true; }
            return false;
          });
        } catch (_) { /* ignore */ }
        if (inFlightNow) {
          let shown = Number(nodeVal);
          try {
            const d = (window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {})[ccy];
            if (d && Number.isFinite(Number(d.available))) shown = Number(d.available);
          } catch (_) { /* ignore */ }
          e = m[ccy] = { value: shown, dir: 'hold', ts: Date.now(), auto: true };
          balEvt(ccy, 'auto-freeze', nodeVal, shown);
        }
      }
      if (!e) return nodeVal;

      // Trust the node value immediately ONLY when nothing for this currency is still in flight.
      // BUGFIX (v0.0.3.21): the old check dropped the hold as soon as ANY row of this ccy was
      // Confirmed — but a wallet with earlier confirmed mints/claims always has one, so a fresh
      // mint's optimistic balance reverted to the (still-zero) node value while it was still
      // "receiving" (reported: xWiniwa jumped to 6,494 then back to 0.00 mid-mint). Now: if a row
      // for this ccy is still SETTLING, keep holding; only shortcut when no in-flight row remains.
      try {
        const acts = stablesActivityRowsForBalance();
        const ccyNorm = String(ccy || '').toLowerCase();
        const ccyMatches = function (rowCcy) {
          rowCcy = String(rowCcy || '').toLowerCase();
          return (rowCcy === ccyNorm) ||
            (ccyNorm === 'winiwa' && (rowCcy === 'winima' || rowCcy === 'winiwa')) ||
            (ccyNorm === 'usdw' && rowCcy === 'usdw') ||
            (ccyNorm === 'xwiniwa' && (rowCcy === 'xwiniwa' || rowCcy === 'x winiwa'));
        };
        const isSettling = function (a) {
          if (a.pendingIncoming === true) return true;
          const s = String(a.status || '').toLowerCase();
          return s === 'pending' || s === 'broadcasted' || s === 'on-chain'
            || s === 'sending' || s === 'receiving' || s === 'sent' || s === 'received';
        };
        let hasInFlight = false, hasConfirmed = false;
        acts.forEach(function (a) {
          if (!a || !a.minimaOnChain || !ccyMatches(a.ccy || a.category)) return;
          if (isSettling(a)) hasInFlight = true;
          if (String(a.status || '') === 'Confirmed') hasConfirmed = true;
        });
        // Release rules (founder 2026-07-06: the balance must NEVER be released into an
        // unconverged transient — the v44.0 trace showed exactly that: clean steps, then
        // stopwatch releases into raw churn, 2,422 → 1,422 → 422). A hold ends ONLY when:
        //   a) the node CONVERGES to the held value (handled below for all cases), or
        //   b) nothing is settling AND the node has reported the SAME value on 3 consecutive
        //      polls — a stable figure that differs from the hold means something external
        //      (another device, a gift) changed the balance, and the stable reading is truth —
        //   c) or the 20-minute hard safety cap fires.
        if (!hasInFlight) {
          // TIME-based stability, not poll-count: the brisk poll ticks ~3x inside one ~50s
          // block, so a count-based streak adopted a mid-churn value (change coin still
          // unconfirmed) the moment the row confirmed — the v45 trace showed 2,322 → 1,372.
          // A value only counts as truth once the node has reported it UNCHANGED for longer
          // than two block times (~150s): churn moves every block, real balances do not.
          const nTol = Math.max(1e-6, Math.abs(Number(nodeVal)) * 1e-6);
          if (e.lastNode == null || Math.abs(Number(nodeVal) - e.lastNode) > nTol) e.stableSince = Date.now();
          e.lastNode = Number(nodeVal);
          if (Date.now() - (e.stableSince || Date.now()) >= 150000) {
            // Settlement-lag guard (v47/v48 traces: incoming +4,975 dipped once): before an
            // incoming coin lands, the raw value is PERFECTLY stable — stability alone cannot
            // tell "settled truth" from "not arrived yet". DIRECTION-based (not exact-amount:
            // some rows, e.g. the xW mint receive leg, store no amt): if the node is missing
            // money versus the hold AND a row of this ccy settled INCOMING in the last 10 min,
            // the node is simply late — hold on. Mirror-image for excess money after outgoing.
            let recentIn = false, recentOut = false;
            try {
              const now = Date.now();
              stablesActivityRowsForBalance().forEach(function (a) {
                if (!a || !a.minimaOnChain || String(a.status || '') !== 'Confirmed') return;
                const rc = String(a.ccy || a.category || '').toLowerCase();
                const norm2 = String(ccy || '').toLowerCase();
                if (!(rc === norm2 || (norm2 === 'winiwa' && rc === 'winima'))) return;
                if (!a.ts || now - Number(a.ts) > 10 * 60 * 1000) return;
                if (a.dir === 'in' || Number(a.amt) > 0) recentIn = true;
                if (a.dir === 'out' || Number(a.amt) < 0) recentOut = true;
              });
            } catch (_) { /* ignore */ }
            const lagTol = Math.max(1e-6, Math.abs(e.value) * 1e-4);
            const deficit = e.value - Number(nodeVal);
            if ((deficit > lagTol && recentIn) || (deficit < -lagTol && recentOut)) {
              // the just-settled leg has not reached the node's figure yet — keep holding
            } else {
              balEvt(ccy, 'stable-adopt (in=' + recentIn + ' out=' + recentOut + ' deficit=' + deficit.toFixed(4) + ')', nodeVal, e.value);
              delete m[ccy]; return nodeVal;
            }
          }
        } else {
          e.lastNode = null; e.stableSince = null;
        }
        // Expiry follows the transaction, not a stopwatch: while a row for this ccy is still
        // settling, keep holding (hard cap 20 min as a safety valve). The old flat 3-min expiry
        // released mid-flight on slow confirmations, snapping the display back to the stale
        // pre-debit node value (reported: full Winiwa shown while 2,031.60 was locked "sending").
        // No idle stopwatch: a hold ends only on convergence, a stable external truth, or the
        // 20-minute hard cap (below). The old flat 180s expiry released mid-transaction.
      } catch (_) { /* best effort */ }

      if (Date.now() - e.ts > 20 * 60 * 1000) { balEvt(ccy, 'cap-20min', nodeVal, e.value); delete m[ccy]; return nodeVal; } // absolute safety cap
      // Hold the expected value through the UTXO churn (spent input gone, change/received coin still
      // unconfirmed) until the node's balance CONVERGES to it — in either direction. A debit briefly
      // collapses "sendable" to the remaining coins (change unconfirmed) and a credit lags low; in
      // both cases we keep showing the expected balance until the node settles on it, so the balance
      // never flashes "only the remaining UTXO". Release on a small relative match.
      const tol = Math.max(1e-6, Math.abs(e.value) * 1e-4);
      if (Math.abs(Number(nodeVal) - e.value) <= tol) { balEvt(ccy, 'converged', nodeVal, e.value); delete m[ccy]; return nodeVal; }
      return e.value;
    } catch (_) { return nodeVal; }
  }

  function applyTestTokenBalances(winBalOrRows, usdBal, detailByCcy) {
    let winBal = null;
    let usdBalOut = null;
    let xwmBal = null;
    if (Array.isArray(winBalOrRows)) {
      const rows = winBalOrRows;
      if (!rows.length) return;
      const winId = winiwaTokenId.toLowerCase();
      const usdId = usdwTokenId.toLowerCase();
      const xwmId = xwiniwaTokenId.toLowerCase();
      rows.forEach(function (t) {
        const id = String(t && t.tokenid != null ? t.tokenid : '').toLowerCase();
        const amt = readTokenAmount(t);
        if (winId && id === winId) winBal = amt;
        if (usdId && id === usdId) usdBalOut = amt;
        if (xwmId && id === xwmId) xwmBal = amt;
      });
    } else if (winBalOrRows && typeof winBalOrRows === 'object') {
      if (winBalOrRows.winiwa != null && Number.isFinite(Number(winBalOrRows.winiwa))) winBal = Number(winBalOrRows.winiwa);
      if (winBalOrRows.usdw != null && Number.isFinite(Number(winBalOrRows.usdw))) usdBalOut = Number(winBalOrRows.usdw);
      if (winBalOrRows.xwiniwa != null && Number.isFinite(Number(winBalOrRows.xwiniwa))) xwmBal = Number(winBalOrRows.xwiniwa);
    } else {
      if (winBalOrRows != null && Number.isFinite(Number(winBalOrRows))) winBal = Number(winBalOrRows);
      if (usdBal != null && Number.isFinite(Number(usdBal))) usdBalOut = Number(usdBal);
    }
    if (winBal == null && usdBalOut == null && xwmBal == null) return;
    // Don't let a lagging node balance revert a just-applied optimistic mint/burn/send/claim.
    if (winBal != null) winBal = stablesReconcileOptimistic('Winiwa', Number(winBal));
    if (usdBalOut != null) usdBalOut = stablesReconcileOptimistic('USDw', Number(usdBalOut));
    if (xwmBal != null) xwmBal = stablesReconcileOptimistic('xWiniwa', Number(xwmBal));
    if (detailByCcy && typeof detailByCcy === 'object') {
      window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ = Object.assign(
        {},
        window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {},
        detailByCcy
      );
      // Keep the "Sendable" subline (read from this detail) in step with the reconciled value so it
      // does not show a stale balance after a just-confirmed mint/burn/send/claim.
      const D = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__;
      const overlay = function (key, val) {
        if (val == null) return;
        const n = Number(val) || 0;
        const prev = D[key] || {};
        let total = n;
        try {
          const opt = window.__STABLES_OPTIMISTIC_BAL__ && window.__STABLES_OPTIMISTIC_BAL__[key];
          const optActive = opt && Date.now() - Number(opt.ts || 0) <= 180000
            && Math.abs(n - Number(opt.value || 0)) <= Math.max(1e-6, Math.abs(n) * 1e-4);
          if (optActive && opt.dir === 'in') total = Math.max(n, Number(opt.value) || 0);
          else total = n;
        } catch (_) {
          total = n;
        }
        // Deliberately NOT clamped to the node's confirmed+unconfirmed total: on any wallet that
        // tracks a covenant (everyone who claimed the faucet), that total includes the shared
        // POOL coins (~1M Winiwa), so it must never reach the display. Pending incoming is shown
        // via the activity settling overlay instead.
        D[key] = Object.assign({}, prev, { total: total, available: n, locked: Math.max(0, total - n) });
      };
      overlay('Winiwa', winBal); overlay('USDw', usdBalOut); overlay('xWiniwa', xwmBal);
    } else {
      window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {};
      if (winBal != null) {
        window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__.Winiwa = {
          total: Number(winBal) || 0,
          available: Number(winBal) || 0,
          locked: 0
        };
      }
      if (usdBalOut != null) {
        window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__.USDw = {
          total: Number(usdBalOut) || 0,
          available: Number(usdBalOut) || 0,
          locked: 0
        };
      }
      if (xwmBal != null) {
        window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__.xWiniwa = {
          total: Number(xwmBal) || 0,
          available: Number(xwmBal) || 0,
          locked: 0
        };
      }
    }
    if (winBal != null && typeof WALLET_WINIWA !== 'undefined') WALLET_WINIWA = winBal;
    if (usdBalOut != null && typeof WALLET_STABLE_AMTS !== 'undefined') WALLET_STABLE_AMTS.USDw = usdBalOut;
    if (xwmBal != null && typeof WALLET_XWM !== 'undefined') WALLET_XWM = xwmBal;
    if (typeof WALLET_WABLES !== 'undefined' && typeof computeWalletWablesUsdTotal === 'function') {
      WALLET_WABLES = computeWalletWablesUsdTotal();
    }
    if (typeof saveWalletVaultState === 'function') saveWalletVaultState();
    if (typeof updateGlobalUI === 'function') updateGlobalUI();
    if (typeof calcIssue === 'function') calcIssue();
    if (typeof calcReclaim === 'function') calcReclaim();
    if (typeof calcXwm === 'function') calcXwm();
    // Ensure recent activity (txs) also renders immediately when balances update
    try { if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity(); } catch (_) {}
    try { if (typeof window.renderActivity === 'function') window.renderActivity(); } catch (_) {}
  }

  function clearTestTokenBalanceDetails(codes) {
    try {
      const d = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {};
      (codes || []).forEach(function (code) { delete d[code]; });
      window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ = d;
    } catch (_) { /* ignore */ }
  }

  window.stablesResetTestWalletBalances = function stablesResetTestWalletBalances() {
    // In test mode, the main resetFaucetBalances now handles on-chain burn. This is legacy/local only.
    if (typeof WALLET_WINIWA !== 'undefined') WALLET_WINIWA = 0;
    if (typeof WALLET_STABLE_AMTS !== 'undefined' && WALLET_STABLE_AMTS) WALLET_STABLE_AMTS.USDw = 0;
    if (typeof WALLET_WABLES !== 'undefined') WALLET_WABLES = 0;
    try { localStorage.removeItem('stables_demo_minima_real_wallet_v1'); } catch (_) { /* ignore */ }
    window.__STABLES_TEST_VAULT_OWNER__ = null;
    if (typeof updateGlobalUI === 'function') updateGlobalUI();
  };

  // Detect an INCOMING test-token payment (Winiwa/USDw/xWiniwa) from a `balance` response the brisk
  // poll already fetched, so the recipient reacts within ~1s on EVERY surface — not only the MinimaOS
  // hub that pushes NEWBALANCE events. The web-RPC and embedded-APK node paths have no push events, so
  // without this an incoming payment only surfaces on the much slower full-sync cycle. We compare the
  // total (catches a mempool/unconfirmed receive the instant it is sent to the network) and the
  // sendable (catches confirmation) against the previous poll; on any increase we trigger the existing
  // fast-watch (which ingests the txpow, creates the receive row and fires the "Incoming X" notification)
  // and a balance refresh. Pure parse of an already-fetched response — no extra network on a normal tick.
  let _lastTestTokenBal = null;
  const _unconfirmedPopupAt = {};

  /**
   * Mempool-window detection: the node reports a mempool receive in the balance row's
   * `unconfirmed` field before any block mines it, and the embedded-APK node has no event
   * push, so a rising unconfirmed is the earliest always-on "payment detected" signal.
   * Raise the incoming warning popup immediately with a synthetic detected row; the popup's
   * own poll re-attaches to the real Activity row (by ccy/amount/time) once it is ingested.
   */
  /**
   * Our own outgoing send returns its change to this wallet as an unconfirmed coin, which
   * also raises `unconfirmed` - that is not an incoming payment. Suppress the synthetic
   * popup when a fresh outgoing row for the same token is in flight; genuine receives are
   * still announced by the txpow-ingest path (dir-in rows only).
   */
  function recentOutgoingSendFor(ccy, windowMs) {
    try {
      const rows = (typeof window.stablesGetUserActivityRows === 'function')
        ? window.stablesGetUserActivityRows()
        : (window.USER_ACTIVITY || []);
      if (!Array.isArray(rows)) return false;
      const now = Date.now();
      for (let i = 0; i < rows.length && i < 50; i++) {
        const r = rows[i];
        if (!r || r.dir !== 'out') continue;
        if (String(r.ccy || '') !== ccy && String(r.category || '') !== ccy) continue;
        const ts = Number(r.ts || 0);
        if (ts && (now - ts) < windowMs) return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  function maybeShowUnconfirmedIncomingPopup(ccy, delta) {
    try {
      const now = Date.now();
      // Short cooldown only: repeated test payments with the same token should each announce.
      if (_unconfirmedPopupAt[ccy] && (now - _unconfirmedPopupAt[ccy]) < 15000) return;
      if (recentOutgoingSendFor(ccy, 120000)) {
        try { console.log('[Stables detect] unconfirmed rise ' + ccy + ' suppressed (own send change in flight)'); } catch (_) { /* ignore */ }
        return;
      }
      _unconfirmedPopupAt[ccy] = now;
      try { console.log('[Stables detect] unconfirmed rise (' + delta + ') ' + ccy + ' popup at ' + new Date(now).toISOString()); } catch (_) { /* ignore */ }
      // The balance `unconfirmed` field is a pending COIN COUNT, not a token amount, so the
      // popup opens without an amount (amt 0 renders "amount confirming"); the popup poll
      // fills the real amount in as soon as the mempool txpow row is ingested.
      const row = {
        dir: 'in',
        amt: 0,
        ccy: ccy,
        status: 'Detected',
        pendingIncoming: true,
        ts: now,
        source: 'balance-unconfirmed'
      };
      if (typeof window.stablesShowIncomingPaymentWarning === 'function') {
        window.stablesShowIncomingPaymentWarning(row);
      }
    } catch (_) { /* ignore */ }
  }

  window.stablesDetectIncomingFromBalanceResponse = function (response) {
    try {
      const rows = parseBalanceRows(response);
      if (!Array.isArray(rows)) return;
      const ids = { Winiwa: winiwaTokenId.toLowerCase(), USDw: usdwTokenId.toLowerCase(), xWiniwa: xwiniwaTokenId.toLowerCase() };
      const cur = { Winiwa: { t: 0, s: 0, u: 0 }, USDw: { t: 0, s: 0, u: 0 }, xWiniwa: { t: 0, s: 0, u: 0 } };
      let seen = false;
      rows.forEach(function (row) {
        const id = String(row && (row.tokenid != null ? row.tokenid : row.tokenId != null ? row.tokenId : '')).toLowerCase();
        let ccy = '';
        if (id && id === ids.Winiwa) ccy = 'Winiwa';
        else if (id && id === ids.USDw) ccy = 'USDw';
        else if (id && id === ids.xWiniwa) ccy = 'xWiniwa';
        if (!ccy) return;
        const d = readTokenBalanceDetail(row || {});
        // Keep the largest row per token (issuer wallets can carry several rows).
        if (Number(d.total) > cur[ccy].t) cur[ccy].t = Number(d.total) || 0;
        if (Number(d.available) > cur[ccy].s) cur[ccy].s = Number(d.available) || 0;
        const u = parseTokenNumber(row && row.unconfirmed);
        if (u != null && u > cur[ccy].u) cur[ccy].u = u;
        seen = true;
      });
      if (!seen && !_lastTestTokenBal) return;
      const prev = _lastTestTokenBal;
      _lastTestTokenBal = cur;
      if (!prev) return;
      const EPS = 1e-9;
      let incoming = false;
      const changed = [];
      ['Winiwa', 'USDw', 'xWiniwa'].forEach(function (c) {
        if (cur[c].t > (prev[c] ? prev[c].t : 0) + EPS || cur[c].s > (prev[c] ? prev[c].s : 0) + EPS) { incoming = true; changed.push(c); }
        const prevU = prev[c] ? (prev[c].u || 0) : 0;
        if (cur[c].u > prevU + EPS) {
          maybeShowUnconfirmedIncomingPopup(c, cur[c].u - prevU);
          try { if (typeof window.stablesStartIncomingFastWatch === 'function') window.stablesStartIncomingFastWatch('unconfirmed-rise'); } catch (_) { /* ignore */ }
        }
      });
      if (incoming) {
        // Do NOT clear the optimistic holds here (root cause of the founder's "balances go in
        // all directions", proven by the v50 attributed trace): a rise in total/unconfirmed
        // does not mean SENDABLE (the displayed figure) has caught up — mid-mint the
        // unconfirmed change coin raised the total while sendable was still deep in the churn
        // dip, and clearing the hold put that dip on screen. The stabilizer releases on its
        // own convergence/stability rules; here we only accelerate detection + refresh.
        try { if (typeof window.stablesStartIncomingFastWatch === 'function') window.stablesStartIncomingFastWatch('balance-poll-increase'); } catch (_) {}
        try { if (typeof window.stablesRefreshLiveNodeBalances === 'function') window.stablesRefreshLiveNodeBalances({ reason: 'incoming', attempts: 2, preserveWiniwa: false }); } catch (_) {}
        // Flash the total + the impacted currency so the user sees the balance update land on-chain.
        try { if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate(changed); } catch (_) {}
      }
    } catch (_) { /* ignore */ }
  };

  // Phase 2 rebuild (v92): the balance bundle (keys + getaddress + coins x3 + balance) costs
  // 15-25s of node time on-device, and overlapping retry chains (attempts up to 8, spawned by
  // every NEWBALANCE burst) saturated the embedded node so badly that all other commands
  // (including the tx mirror's history) queued past their timeouts. One bundle at a time,
  // capped retries, and a cooldown between runs; native events re-trigger it soon enough.
  /* How old a proven balance may get before the app says it is re-proving (the four-state law).
     The ambient floor below is deliberately tighter, so at rest it never gets there. */
  const PROOF_REPROVE_AFTER_MS = 180000;
  let _balRefreshInFlight = null;
  let _balRefreshLastDone = 0;
  /* THE WALLET BALANCE HAS ONE OWNER (founder 2026-09-03: "the battery usage seems way too high").
   *
   * This bundle costs the phone's node about 680 ms of work, and it was running 4 times a minute
   * with nobody looking at it, because a repaint of the wallet list asked for it, the live poll
   * asked for it, and the readiness sweep asked for it, none of them able to see the others. The
   * private in-flight flag and cooldown below could only ever deduplicate calls that arrived
   * inside one window; they could not answer the real question, which is WHY this read is
   * happening. So the decision moves to stablesNodeReadBudget: something that HAPPENED (the person
   * acted, a block landed, the node pushed, the app returned) reads at once; a timer reads only
   * when the answer we hold has actually gone stale. Callers say which they are with `reason`.
   * Callers that pass no reason are timers by definition, and get the stale rule. */
  window.stablesRefreshLiveNodeBalances = function stablesRefreshLiveNodeBalances(options) {
    const hasRpc = !!(typeof stablesGetRpcConfig === 'function' && stablesGetRpcConfig() && typeof stablesRpcSendCommand === 'function');
    const hasMds = !!(typeof MDS !== 'undefined' && MDS.cmd);
    if (!hasRpc && !hasMds) {
      publishWalletProofState('proof-unavailable', 'No node balance transport is available.');
      return Promise.resolve({ proofReady: false });
    }
    const isApk = !!window.__STABLES_ANDROID_APP;
    const opts = Object.assign({}, options || {});
    opts.attempts = Math.min(Number(opts.attempts) || 1, 2);
    if (window.__STABLES_TX_HISTORY_WORKER_ACTIVE && !opts.forceDuringTxSync) return Promise.resolve();
    if (window.__STABLES_TX_HISTORY_SYNC_IN_FLIGHT && !opts.forceDuringTxSync) {
      const hasVisibleTxRows = !!document.querySelector('#walletRecentList .tx-row, #activityList .tx-row');
      if (!hasVisibleTxRows) return Promise.resolve();
    }
    /* A refresh the person is waiting on (their own send, claim, mint, trade) is an event even
       when the caller forgot to say so: forceDuringTxSync is only ever set by those paths. */
    const reason = String(opts.reason || (opts.forceDuringTxSync ? 'user-action' : 'ambient'));
    const budget = window.stablesNodeReadBudget;
    const runRefresh = function () { return stablesRunLiveNodeBalanceRefresh(opts); };
    if (!budget || typeof budget.request !== 'function') return runRefresh();
    /* WHILE A PERSON IS WATCHING THEIR MONEY MOVE, A TIMER MAY STILL LOOK.
       The moment they act, and for a minute and a half after it, the wallet is the thing they are
       staring at, so the stale rule tightens to 8 seconds; the rest of the time a timer waits for
       the answer to be genuinely old. This is also the safety net for any follow-up refresh in a
       money flow that forgets to name its reason: it cannot be left sitting on a stale figure. */
    if (reason === 'user-action' || reason === 'settlement') {
      try { window.__STABLES_LAST_USER_TXN_AT = Date.now(); } catch (_) { /* ignore */ }
    }
    const watchingMoney = (Date.now() - Number(window.__STABLES_LAST_USER_TXN_AT || 0)) < 90000;
    return budget.request('wallet-balance', {
      reason: reason,
      /* Events still collapse a burst: a block, a push and a repaint arriving together are one
         read. The window is the node's own cost, wider on the phone's embedded node. */
      minGapMs: (reason === 'user-action' || opts.forceDuringTxSync) ? 2500 : (isApk ? 12000 : 4000),
      /* A timer may re-read only this far behind the last good answer. Every real change arrives
         as an event long before this; this is the floor under a missed event, not the mechanism. */
      staleMs: watchingMoney ? 8000 : (isApk ? (PROOF_REPROVE_AFTER_MS - 30000) : 60000)
    }, runRefresh);
  };

  /* The refresh itself, once the budget has allowed it. */
  function stablesRunLiveNodeBalanceRefresh(opts) {
    // ASK THE NODE. DO NOT ASK A FLAG WHETHER TO ASK THE NODE.
    //
    // This used to refuse outright unless __STABLES_LIVE_NODE.rpcOk was true, which deadlocked the
    // MiniDapp build (founder 2026-09-02: "we have the node running in the background, so why would
    // the app not be synced?"). rpcOk is cleared by stablesNoteLivePollFailure after a few missed
    // polls, and the ONLY thing that can set it back is a successful poll — so if the poll was ever
    // starved (hidden tab, a busy node, a reconnect that parked in 'connecting') the app refused to
    // re-prove, and the refusal kept it refusing. It sat on "Proof unavailable" beside a node that
    // answered `balance` and `status` immediately when asked directly.
    //
    // Where the node is part of the runtime — the MiniDapp's own host, the standalone's in-process
    // node — it cannot be "not connected", so there is nothing to check first: ask it, and let the
    // ANSWER decide the proof state. Failure is still reported honestly, by the catch below, from
    // evidence rather than from a stale flag. A remote RPC endpoint really can be unreachable, so
    // there the pre-check is kept and still spares a dead endpoint the traffic.
    const L = window.__STABLES_LIVE_NODE;
    const nodeIsLocal = typeof window.stablesNodeTransportIsLocal === 'function'
      && window.stablesNodeTransportIsLocal();
    if (!nodeIsLocal && (!L || !L.rpcOk)) {
      publishWalletProofState('proof-unavailable', 'The connected node has not answered a live command.');
      return Promise.resolve({ proofReady: false });
    }
    const isRealTest = (cfg && cfg.DEMO_REAL_ONCHAIN_WALLET) || (cfg && cfg.APP_STAGE === 'test');
    if (opts.preserveWiniwa == null && isRealTest) {
      opts.preserveWiniwa = false;
    }
    const previousProof = window.__STABLES_WALLET_PROOF_STATE__ || {};
    if (!previousProof.lastReadyAt) {
      publishWalletProofState('syncing', 'Refreshing live wallet balances.');
    } else if (Date.now() - Number(previousProof.lastReadyAt) > PROOF_REPROVE_AFTER_MS) {
      publishWalletProofState('syncing', 'Refreshing the wallet balance proof.');
    }
    _balRefreshInFlight = refreshTestTokenBalancesWithRetry(opts)
      .then(function (r) {
        if (!r || r.proofReady !== true) throw new Error('The wallet balance response was not proven.');
        /* A node that is BEHIND answers `balance` perfectly happily, with an answer that was true
         * whenever it stopped following the chain. Until 2026-09-04 that answer was published as
         * `ready`, so a phone whose node sat 114,000 blocks back showed a confirmed balance under a
         * banner that said it was still catching up. The two cannot both be true, and the balance
         * is the one people act on (founder 2026-09-04: "the app should not confirm a balance when
         * the node is not sync").
         *
         * `stale` is exactly this state and the app already renders it everywhere a figure appears:
         * the number is the node's, the node is not current, so it is shown as not current and the
         * actions that would spend it stay closed until it is. */
        var nodeBehind = typeof window.stablesNodeIsSynced === 'function' && !window.stablesNodeIsSynced();
        if (nodeBehind) {
          publishWalletProofState('stale', typeof window.stablesNodeCatchUpReason === 'function'
            ? window.stablesNodeCatchUpReason()
            : 'Your bank is still catching up with the network, so this balance is not current yet.');
        } else {
          publishWalletProofState('ready', 'Live node balance response received.');
        }
        // First successful live sync: wallet quantities are now chain truth, so the
        // header total may render (it stays a quiet dash until then — never a figure
        // computed from unloaded zeros that would jump when the node answers).
        if (!window.__STABLES_LIVE_BAL_SYNCED_ONCE) {
          window.__STABLES_LIVE_BAL_SYNCED_ONCE = true;
          // The refresh painted while the flag was still false — repaint so the
          // header total appears the moment truth is complete.
          try { if (typeof window.updateGlobalUI === 'function') window.updateGlobalUI(); } catch (_) { /* ignore */ }
        }
        return r;
      })
      .catch(function (err) {
        const prior = window.__STABLES_WALLET_PROOF_STATE__ || {};
        const synced = (typeof window.stablesNodeIsSynced === 'function') ? window.stablesNodeIsSynced() : true;
        publishWalletProofState(prior.lastReadyAt ? 'syncing' : (synced ? 'proof-unavailable' : 'syncing'), (err && err.message) || 'Wallet balance proof unavailable.');
        return { proofReady: false };
      })
      .finally(function () {
        _balRefreshLastDone = Date.now();
        _balRefreshInFlight = null;
        try { if (typeof window.updateSendAvailLine === 'function') window.updateSendAvailLine(); } catch (_) { /* ignore */ }
        try { if (typeof window.stablesUpdateSendTierHint === 'function') window.stablesUpdateSendTierHint(); } catch (_) { /* ignore */ }
      });
    return _balRefreshInFlight;
  }

  /* THE APP MUST NOT POLL ITS OWN PENDING QUEUE. Proven on the live host, 2026-09-02.
   *
   * A watcher here used to call `mds action:pending` every 6s while anything was waiting, so a
   * waiting row could resolve itself. `mds` is ITSELF a write command, so under read permission it
   * does not answer — it gets QUEUED:
   *
   *   { status:false, pending:true, pendinguid:"0xCE49…",
   *     error:"This command needs to be confirmed and is now pending.." }
   *
   * Which means the watcher would have added a new approval request to the person's Minima queue
   * every six seconds, for as long as the app was open, purely by asking whether they had answered
   * yet. It read the queue successfully in testing only because the install had WRITE permission at
   * that moment, which is exactly when the watcher is pointless.
   *
   * So there is no polling. A queued action is settled the same way every other transaction is: the
   * transaction mirror watches the CHAIN, and when the signed transaction lands the row confirms
   * from on-chain truth. If the person declines, nothing lands and the row stays honestly waiting.
   */

  /* A PROOF THAT EXPIRES SAYS SO, SO DO NOT LET IT EXPIRE AT REST (2026-09-03, battery).
   *
   * This is the founder-approved four-state behaviour (D22): a proof older than three minutes is
   * not Ready, the app says Syncing, and it re-reads. Cutting the read cadence must not turn that
   * into a badge flickering every three minutes on an idle wallet, so the timer floor for the
   * balance sits INSIDE this window (150 s on the phone): at rest the figure is re-proven before
   * it can expire, and this path stays what it was written for — a node that is not answering. */
  window.stablesRepeatWhileVisible('wallet-proof-expiry', function () {
    try {
      const proof = window.__STABLES_WALLET_PROOF_STATE__ || {};
      if (proof.state === 'ready' && Number(proof.lastReadyAt || 0) > 0
        && Date.now() - Number(proof.lastReadyAt) > PROOF_REPROVE_AFTER_MS) {
        publishWalletProofState('syncing', 'Refreshing the wallet balance proof.');
        // Expiry is an active recovery transition, not a terminal label. Without this
        // kick the UI could remain in the expired state until some unrelated node event.
        window.stablesRefreshLiveNodeBalances({ reason: 'proof-expiry', attempts: 2, forceDuringTxSync: true });
      }
    } catch (_) { /* fail closed on the next repaint */ }
  }, 15000);

  // Keep the Faucet page "Test tokens" reference block driven by the config so it
  // can never go stale: token ids + covenant/issuer addresses are read from
  // TEST_TOKEN_REGISTRY and written into [data-faucet-ref] elements.
  function populateFaucetTokenRefs() {
    try {
      var reg = (cfg && cfg.TEST_TOKEN_REGISTRY) || {};
      var refs = {
        winiwa: reg.winiwa_token_id,
        usdw: reg.usdw_token_id,
        xwiniwa: reg.xwiniwa_token_id,
        'xwiniwa-covenant': (cfg && cfg.TEST_XWINIWA_COVENANT_ADDRESS) || reg.xwiniwa_covenant_address,
        faucet: (cfg && cfg.TEST_FAUCET_COVENANT_ADDRESS) || reg.faucet_covenant_address,
        mintpool: (cfg && cfg.TEST_MINT_BURN_COVENANT_ADDRESS) || reg.pool_miniaddress,
        issuer: reg.issuer_miniaddress
      };
      var searchBase = String((cfg && cfg.MINIMA_EXPLORER_TX_BASE_URL) || 'https://explorer.minima.global/search?q=');
      Object.keys(refs).forEach(function (k) {
        var val = String(refs[k] || '').trim();
        if (!val) return;
        var nodes = document.querySelectorAll('[data-faucet-ref="' + k + '"]');
        for (var i = 0; i < nodes.length; i++) {
          var a = nodes[i].querySelector('a');
          var code = nodes[i].querySelector('code');
          if (a) a.setAttribute('href', searchBase + val);
          if (code) code.textContent = val;
        }
      });
    } catch (_) { /* best-effort */ }
  }

  function syncFaucetUiLabels() {
    populateFaucetTokenRefs();
    const btn = document.getElementById('faucetClaimWiniwaBtn');
    if (btn && typeof window.stablesFaucetWiniwaDefaultButtonLabel === 'function') {
      btn.textContent = window.stablesFaucetWiniwaDefaultButtonLabel();
    }
    if (typeof window.stablesSyncMoreDrawerFaucetCopy === 'function') {
      window.stablesSyncMoreDrawerFaucetCopy();
    }
    const hint = document.getElementById('faucetCooldownHint');
    const remainMs = typeof window.stablesFaucetWiniwaRemainingMs === 'function'
      ? window.stablesFaucetWiniwaRemainingMs()
      : 0;
    if (hint && faucetMode === 'covenant' && !remainMs) {
      hint.style.display = 'block';
      hint.textContent = 'On-chain covenant pour, claimable by any synced wallet.';
    }
    renderFaucetPourStatusSurfaces();
  }

  // Forward-pricing LAB faucet: pour LABW collateral to the tester (change routes back to the faucet).
  async function _claimG3LabFaucet() {
    const faddr = g3prof.faucet_address, wintok = g3prof.wintok, claimAmt = Number(g3prof.faucet_claim || 1000);
    if (!faddr || !wintok) { showToast('Lab faucet not configured.', { tone: 'amber' }); return; }
    let recip; try { recip = await fetchTesterAddress(); } catch (e) { showToast('Connect your node first.', { tone: 'amber' }); return; }
    try {
      if (typeof window.stablesShowTxProgressModal === 'function') window.stablesShowTxProgressModal({ title: 'Faucet claim submitted', status: 'Claiming collateral.', amount: fmtTokenAmt(claimAmt) + ' collateral', address: 'Faucet', building: true });
      if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate(['Winiwa']);
    } catch (_) {}
    try {
      const res = await directOrMdsCmd('coins address:' + faddr, 'reading the faucet', 20000);
      let coins = mdsPayload(res) || res || []; if (!Array.isArray(coins)) coins = [];
      const pool = coins.filter(function (c) { return !c.spent && c.tokenid === wintok; }).sort(function (a, b) { return Number(b.tokenamount) - Number(a.tokenamount); })[0];
      if (!pool) throw new Error('Faucet is empty right now.');
      const change = subTokenAmountStr(String(pool.tokenamount), String(claimAmt));
      if (!(Number(change) > 0)) throw new Error('Faucet needs a refill.');
      const id = 'stables_g3_faucet_claim';
      try { await directOrMdsCmd('txndelete id:' + id, 'clearing draft', 15000); } catch (_) {}
      await directOrMdsCmdBatch([
        'txncreate id:' + id,
        'txninput id:' + id + ' coinid:' + pool.coinid,
        'txnoutput id:' + id + ' amount:' + claimAmt + ' tokenid:' + wintok + ' address:' + recip,       // pour -> claimer
        'txnoutput id:' + id + ' amount:' + change + ' tokenid:' + wintok + ' address:' + faddr          // change -> faucet (@ADDRESS)
      ], 'building the faucet claim', 90000);
      await directOrMdsCmd('txnbasics id:' + id, 'finalizing the faucet claim', 90000);
      const chk = await directOrMdsCmd('txncheck id:' + id, 'validating the faucet claim', 60000);
      const valid = (mdsPayload(chk) || {}).valid || {};
      if (!valid.scripts || !valid.basic || !valid.mmrproofs) {
        try { console.error('[agent-faucet] txncheck failed:', JSON.stringify(valid)); } catch (_) { /* ignore */ }
        throw new Error('The faucet claim could not be validated. Please try again.');
      }
      await directOrMdsCmd('txnpost id:' + id + ' txndelete:true', 'claiming from the faucet', 90000);
      try { if (typeof window.stablesStopSendResultModalTxPoll === 'function') window.stablesStopSendResultModalTxPoll(); } catch (_) {}
      try { const m = document.getElementById('agentActionModal'); if (m) m.classList.remove('open'); } catch (_) {}
      showToast('Claimed ' + fmtTokenAmt(claimAmt) + ' collateral from the faucet.');
      try { if (typeof window.stablesRefreshLiveNodeBalances === 'function') window.stablesRefreshLiveNodeBalances({ reason: 'user-action' }); } catch (_) {}
    } catch (e) {
      try { if (typeof window.stablesStopSendResultModalTxPoll === 'function') window.stablesStopSendResultModalTxPoll(); } catch (_) {}
      try { const m = document.getElementById('agentActionModal'); if (m) m.classList.remove('open'); } catch (_) {}
      showToast((e && e.message) ? e.message : 'Faucet claim failed', { tone: 'amber', durationMs: 6000 });
    }
  }

  /**
   * Refuse honestly BEFORE building a transaction when this MiniDapp cannot sign.
   *
   * Discovered the first time MDS queues a command; from then on there is no reason to assemble a
   * transaction that cannot be signed, and every reason not to leave a half-built one behind or an
   * activity row that says "failed" about something never attempted.
   */
  /**
   * How a failed attempt is described when the cause is read-only permission.
   *
   * The status stays Failed because that is true: nothing reached the chain. What was untrue was the
   * wording. The person was told signing had failed on their node and to try again, then asked to
   * approve a command, and approving it could never finish the claim because the app had already
   * abandoned the remaining steps. So they approved, saw "failed", and reasonably concluded the app
   * was broken (founder 2026-09-02). Say what actually happened and what would fix it.
   */
  /**
   * A command Minima has QUEUED is waiting for the person, not broken.
   *
   * The title carries no lifecycle word, because an activity row outlives the stage it was created
   * in and the merge logic carries titles forward: a row that says "submitted" or "failed" keeps
   * saying it long after it stopped being true.
   */
  function stablesPermissionRowText(what) {
    return {
      title: String(what || 'Transaction'),
      status: 'Pending',
      /* Marks a row that was never posted: it is waiting on a PERSON, not on the chain. The prunes
         that clean up optimistic rows must leave it alone, or the person is left with no row at
         all and no explanation of why their money did not move. */
      awaitingApproval: true,
      note: 'Waiting for your approval in Minima. Open Minima and confirm the pending action.'
    };
  }
  window.stablesPermissionRowText = stablesPermissionRowText;

  window.__STABLES_TEST_CLAIM_FAUCET_WINIWA__ = async function claimFaucetWiniwaTest() {
    if (window.__STABLES_FAUCET_LEVEL_READY__ !== true) {
      return showToast('Faucet proof must be Ready before claiming.', { tone: 'amber', durationMs: 7000 });
    }
    const claimFlowStartMs = Date.now();
    // Pre-claim balance, captured BEFORE anything is posted. The optimistic credit below is
    // "balance before the claim + claim amount", and it used to read WALLET_WINIWA *after* the post:
    // if a node refresh had already reflected the claim by then, the claim was added a second time
    // and the currency row showed true + 1000 while the hero stayed honest (founder report
    // 2026-07-26, and the long-standing balance-importer double-count residual). Capturing it here
    // makes the target correct by construction, whatever the refresh does mid-flight.
    let winiwaBeforeClaim = 0;
    try {
      const dPre = window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {};
      const dv = dPre.Winiwa && Number(dPre.Winiwa.total);
      if (Number.isFinite(dv)) winiwaBeforeClaim = dv;
      else if (typeof WALLET_WINIWA !== 'undefined' && Number.isFinite(Number(WALLET_WINIWA))) winiwaBeforeClaim = Number(WALLET_WINIWA);
    } catch (_) { winiwaBeforeClaim = 0; }
    try { console.log('[faucet-claim] __STABLES_TEST_CLAIM_FAUCET_WINIWA__ entered'); } catch (_) {}
    if (forwardPricing && g3prof.faucet_address) { return _claimG3LabFaucet(); }
    const keyFn = typeof stablesFaucetWiniwaLastClaimStorageKey === 'function'
      ? stablesFaucetWiniwaLastClaimStorageKey
      : function () { return cfg.FAUCET_WINIWA_LAST_CLAIM_STORAGE_KEY; };
    const remainFn = typeof stablesFaucetWiniwaRemainingMs === 'function'
      ? stablesFaucetWiniwaRemainingMs
      : function () {
          try {
            const last = Number(localStorage.getItem(keyFn()) || 0);
            const cd = Number(cfg.FAUCET_WINIWA_COOLDOWN_MS || 3600000);
            return last ? Math.max(0, cd - (Date.now() - last)) : 0;
          } catch (_) {
            return 0;
          }
        };

    // Authoritative cooldown: pull the wallet's on-chain history first so the limit is enforced from its
    // real last faucet claim (stablesFaucetWiniwaRemainingMs folds in the on-chain time). This makes the
    // cooldown follow the WALLET, not this browser's localStorage — a fresh browser / cleared storage
    // cannot bypass it. Bounded so a slow node never blocks the claim indefinitely.
    try {
      if (typeof window.stablesSyncNodeTransactions === 'function') {
        await Promise.race([
          Promise.resolve(window.stablesSyncNodeTransactions(true)),
          new Promise(function (res) { setTimeout(res, 4500); })
        ]);
      }
    } catch (_) { /* ignore */ }

    const left = remainFn();
    try { console.log('[faucet-claim] cooldown remain=' + left); } catch (_) {}
    if (left > 0) {
      // The progress popup may already be open (shown the moment claim was tapped) — dismiss it since
      // the claim is blocked by cooldown.
      try { if (typeof window.stablesStopSendResultModalTxPoll === 'function') window.stablesStopSendResultModalTxPoll(); } catch (_) {}
      try { const m = document.getElementById('agentActionModal'); if (m) m.classList.remove('open'); } catch (_) {}
      // Persist the on-chain last-claim time to the local cooldown key so the button countdown survives
      // even if Activity is later cleared.
      try {
        const onTs = (typeof window.stablesGetOnChainLastFaucetClaimTs === 'function') ? Number(window.stablesGetOnChainLastFaucetClaimTs()) : 0;
        if (onTs > 0) localStorage.setItem(keyFn(), String(onTs));
      } catch (_) { /* ignore */ }
      // Show the cooldown ON the button (live countdown), not just a toast, so it's obvious why a tap
      // does nothing. syncFaucetWiniwaClaimButton renders "Available in mm:ss" and ticks every second.
      if (typeof window.syncFaucetWiniwaClaimButton === 'function') { try { window.syncFaucetWiniwaClaimButton(); } catch (_) { /* ignore */ } }
      const fmt = typeof stablesFormatFaucetCooldownShort === 'function'
        ? stablesFormatFaucetCooldownShort(left)
        : Math.ceil(left / 60000) + ' min';
      if (typeof showToast === 'function') {
        showToast('Winiwa faucet: try again in ' + fmt + '.', { tone: 'amber', durationMs: 4200 });
      }
      return;
    }

    // Feeless on-chain claim: the claim is built, signed and posted by YOUR node with burn 0 (no
    // MINIMA signing fee), so there is no fee pre-check — a brand-new wallet with zero MINIMA can
    // claim. Flip straight to the busy/building state on click.
    try { console.log('[faucet-claim] faucetMode=' + faucetMode); } catch (_) {}
    if (faucetMode === 'covenant') {
      setFaucetPourStatusSurface({
        active: true,
        phase: 'building',
        title: 'Winiwa pour started',
        detail: 'Stables is building, signing, and posting an on-chain claim for ' + fmtInt(claimAmount) + ' Winiwa.',
        amountText: fmtInt(claimAmount),
        resetTimer: true
      });
      appendTestFaucetActivityRow(claimAmount, '', '', { pouring: true });
      focusFaucetPourStatusInline();
    }

    let wallet;
    try {
      try { console.log('[faucet-claim] calling fetchTesterWallet'); } catch (_) {}
      wallet = await fetchTesterWallet();
      try { console.log('[faucet-claim] fetchTesterWallet returned', wallet); } catch (_) {}
    } catch (e) {
      try { console.error('[faucet-claim] fetchTesterWallet threw', e); } catch (_) {}
      if (faucetMode === 'covenant') {
        setFaucetPourStatusSurface({
          active: false,
          keepVisible: true,
          phase: 'error',
          title: 'Pour blocked',
          detail: (e && e.message) || 'Connect your node first, then claim Winiwa.',
          amountText: fmtInt(claimAmount),
          resetTimer: false
        });
      }
      if (faucetMode === 'covenant') setFaucetPourInProgress(false);
      if (typeof showToast === 'function') {
        showToast((e && e.message) || 'Connect your node first, then claim Winiwa.', { tone: 'amber', durationMs: 5000 });
      }
      return;
    }

    if (wallet.address && wallet.address.indexOf('0x') === 0) {
      window.__STABLES_FAUCET_WALLET_COOLDOWN_SUFFIX__ = wallet.address.slice(-16).toLowerCase();
      // Persist the per-wallet suffix so the cooldown key is reproducible on the next app launch.
      // Without this the suffix (a window global set only during a claim) is lost on restart, the
      // cooldown is read under the un-suffixed key, and the 1h limit is silently bypassed.
      try { localStorage.setItem('stables_faucet_cooldown_suffix_v1', window.__STABLES_FAUCET_WALLET_COOLDOWN_SUFFIX__); } catch (_) { /* ignore */ }
    }

    if (faucetMode === 'covenant') {
      let covenantClaimError = '';
      let covenantClaimPosted = false;
      let covenantClaimTracking = false;
      try {
        try { console.log('[faucet-claim] calling claimFaucetCovenantOnChain'); } catch (_) {}
        const posted = await claimFaucetCovenantOnChain(wallet);
        try { console.log('[faucet-claim] claimFaucetCovenantOnChain returned:', posted); } catch (_) {}
        const txid = posted.explorerTxId || '';
        const pendingTxnId = posted.pendingTxnId || '';
        try {
          localStorage.setItem(keyFn(), String(Date.now()));
        } catch (_) { /* ignore */ }

        // Reflect the incoming Winiwa immediately: set an optimistic +claim so the balance updates the
        // moment the pour is submitted, not only once the node confirms. stablesReconcileOptimistic
        // trusts the node value again as soon as the Activity row is Confirmed, so this self-heals.
        // WALLET_WINIWA is an index.html global that may be undefined here — a bare read threw a
        // silently-swallowed ReferenceError and the optimistic balance never applied (first live claim).
        try {
          // Use the PRE-CLAIM balance captured at the top of this flow, never a value read after the
          // post: by this point a refresh may already include the claim, and adding it again is the
          // double-count. Also never go backwards, and never exceed the pre-claim figure by more
          // than one claim, so a stale read cannot inflate the row either.
          const target = winiwaBeforeClaim + Number(claimAmount || 0);
          const nowKnown = (typeof WALLET_WINIWA !== 'undefined' && Number.isFinite(Number(WALLET_WINIWA)))
            ? Number(WALLET_WINIWA) : 0;
          stablesSetOptimisticBalance('Winiwa', Math.max(target, Math.min(nowKnown, target)), 'in');
        } catch (_) { /* ignore */ }
        // Flash the token row and the global figure so the balance visibly announces the update.
        try { if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate(['Winiwa']); } catch (_) { /* ignore */ }
        try { if (typeof updateGlobalUI === 'function') updateGlobalUI(); } catch (_) { /* ignore */ }

        covenantClaimPosted = true;
        setFaucetSettlementStatus(true, {
          title: 'Faucet claim submitted',
          detail: 'Waiting for confirmation. No action needed.',
          txid: txid,
          pendingTxnId: pendingTxnId,
          amountText: fmtInt(claimAmount)
        });
        appendTestFaucetActivityRow(claimAmount, txid, pendingTxnId, {
          id: FAUCET_POUR_ROW_ID,
          submitted: true,
          note: 'Sent to your node. Waiting for confirmation; no action needed.'
        });
        // Take the user straight to the wallet after pouring so they land on the balance (which now
        // reflects the optimistic +claim immediately) and the Activity row, not the faucet page.
        try { if (typeof navigate === 'function') navigate('wallet'); } catch (_) { /* ignore */ }
        // No pop-up after pouring: the faucet claim is low-friction and self-explanatory, so we do NOT
        // open the tx-progress modal here (unlike mint/burn, which stay modal). Feedback is the inline
        // settlement card (setFaucetSettlementStatus, above) plus the Activity row, both non-blocking.
        if (posted.txpow && typeof window.stablesIngestLiveTxpow === 'function') {
          window.stablesIngestLiveTxpow(posted.txpow);
        }
        void (async function backgroundFaucetSettle() {
          try {
            // Refresh balances and activity as soon as the tx hits the mempool so the user sees the
            // new Winiwa right away. Mempool coins are already visible to the node's balance command.
            await sleep(800);
            await window.stablesRefreshLiveNodeBalances({ reason: 'settlement',
              attempts: 4,
              preserveWiniwa: false,
            });
            if (typeof window.stablesSyncNodeTransactions === 'function') {
              try { await window.stablesSyncNodeTransactions(true); } catch (_) { /* ignore */ }
            }

            // Then poll for the mined txpowid so the activity row can be upgraded from pending to confirmed.
            let minedTxpowid = txid;
            if (!minedTxpowid && pendingTxnId) {
              minedTxpowid = await pollMinedFaucetTxpow(pendingTxnId);
            }
            if (minedTxpowid) {
              appendTestFaucetActivityRow(claimAmount, minedTxpowid, pendingTxnId, { id: FAUCET_POUR_ROW_ID });
              finishFaucetSettlementStatus('Confirmed on-chain. The Winiwa balance and Activity row are up to date.', minedTxpowid);
              // Advance the single optimistic pour row to confirmed (same machinery the mint uses) so it
              // stops showing "settling · 1/1" and merges with the node history row by txid.
              try { linkMinedTxpowToActivityRows([FAUCET_POUR_ROW_ID], pendingTxnId, minedTxpowid).catch(function () {}); } catch (_) {}
              try {
                const hist = await mdsCmdData('history max:40');
                const txpows = (hist && hist.txpows) || [];
                for (let hi = 0; hi < txpows.length; hi++) {
                  const tp = txpows[hi];
                  if (!tp || normTxHash(tp.txpowid) !== normTxHash(minedTxpowid)) continue;
                  if (typeof window.stablesIngestLiveTxpow === 'function') {
                    await window.stablesIngestLiveTxpow(tp);
                  }
                  break;
                }
              } catch (_) { /* ignore */ }
            } else {
              const curStatus = window.__STABLES_FAUCET_SETTLEMENT_STATUS__ || {};
              const notConfirmedMsg = 'No faucet transaction is visible in your node history yet. Your wallet balance was refreshed from the node.';
              setFaucetSettlementStatus(true, {
                title: 'Faucet claim not confirmed',
                detail: notConfirmedMsg,
                txid: txid,
                pendingTxnId: pendingTxnId,
                amountText: fmtInt(claimAmount),
                startedAt: curStatus.startedAt || Date.now()
              });
              markFaucetClaimNotConfirmedRow(notConfirmedMsg);
              try { stablesClearOptimisticBalance('Winiwa'); } catch (_) { /* ignore */ }
              try { await window.stablesRefreshLiveNodeBalances({ reason: 'settlement', attempts: 2, preserveWiniwa: false, forceDuringTxSync: true }); } catch (_) { /* ignore */ }
            }

            // One final balance refresh after settlement/polling.
            await window.stablesRefreshLiveNodeBalances({ reason: 'settlement',
              attempts: 4,
              preserveWiniwa: false,
            });
            if (typeof window.stablesSyncNodeTransactions === 'function') {
              try { await window.stablesSyncNodeTransactions(true); } catch (_) { /* ignore */ }
            }
          } catch (_) {
            const curStatus = window.__STABLES_FAUCET_SETTLEMENT_STATUS__ || {};
            const notConfirmedMsg = 'Stables could not confirm the faucet transaction. Your wallet balance was refreshed from the node.';
            setFaucetSettlementStatus(true, {
              title: 'Faucet claim not confirmed',
              detail: notConfirmedMsg,
              txid: txid,
              pendingTxnId: pendingTxnId,
              amountText: fmtInt(claimAmount),
              startedAt: curStatus.startedAt || Date.now()
            });
            markFaucetClaimNotConfirmedRow(notConfirmedMsg);
            try { stablesClearOptimisticBalance('Winiwa'); } catch (_) { /* ignore */ }
            try { await window.stablesRefreshLiveNodeBalances({ reason: 'settlement', attempts: 2, preserveWiniwa: false, forceDuringTxSync: true }); } catch (_) { /* ignore */ }
          }
        })();
      } catch (err) {
        try { console.error('[faucet-claim] covenant claim error:', err); } catch (_) {}
        if (isRecoverableFaucetTimeout(err)) {
          const recoveryTxnId = String((err && err.pendingTxnId) || '').trim();
          const detail = 'Your node is still processing the pour. Stables is checking wallet history and will update this card when the claim appears on-chain. Do not retry yet.';
          covenantClaimPosted = true;
          covenantClaimTracking = true;
          setFaucetSettlementStatus(true, {
            title: 'Faucet claim still tracking',
            detail: detail,
            amountText: fmtInt(claimAmount),
            startedAt: Date.now()
          });
          appendTestFaucetActivityRow(claimAmount, '', '', {
            id: FAUCET_POUR_ROW_ID,
            submitted: true,
            title: 'Faucet claim tracking',
            note: 'Node response timed out, but the claim may still be building or posting. Stables is checking history.'
          });
          void (async function recoverTimedOutFaucetClaim() {
            try {
              const minedTxpowid = await pollMinedFaucetTxpow(recoveryTxnId);
              if (minedTxpowid) {
                appendTestFaucetActivityRow(claimAmount, minedTxpowid, '', { id: FAUCET_POUR_ROW_ID });
                finishFaucetSettlementStatus('Confirmed on-chain. The Winiwa balance and Activity row are up to date.', minedTxpowid);
                if (typeof window.stablesRefreshLiveNodeBalances === 'function') {
                  await window.stablesRefreshLiveNodeBalances({ reason: 'settlement',
                    attempts: 4,
                    preserveWiniwa: false
                  });
                }
                if (typeof window.stablesSyncNodeTransactions === 'function') {
                  try { await window.stablesSyncNodeTransactions(true); } catch (_) { /* ignore */ }
                }
                setFaucetPourInProgress(false);
              } else {
                const curStatus = window.__STABLES_FAUCET_SETTLEMENT_STATUS__ || {};
                const notConfirmedMsg = 'The node has not returned the faucet transaction. Your wallet balance was refreshed from the node.';
                setFaucetSettlementStatus(true, {
                  title: 'Faucet claim not confirmed',
                  detail: notConfirmedMsg,
                  amountText: fmtInt(claimAmount),
                  startedAt: curStatus.startedAt || Date.now()
                });
                markFaucetClaimNotConfirmedRow(notConfirmedMsg);
                try { stablesClearOptimisticBalance('Winiwa'); } catch (_) { /* ignore */ }
                try { await window.stablesRefreshLiveNodeBalances({ reason: 'settlement', attempts: 2, preserveWiniwa: false, forceDuringTxSync: true }); } catch (_) { /* ignore */ }
                setFaucetPourInProgress(false);
              }
            } catch (_) {
              const curStatus = window.__STABLES_FAUCET_SETTLEMENT_STATUS__ || {};
              const notConfirmedMsg = 'The node did not return a final faucet status. Your wallet balance was refreshed from the node.';
              setFaucetSettlementStatus(true, {
                title: 'Faucet claim not confirmed',
                detail: notConfirmedMsg,
                amountText: fmtInt(claimAmount),
                startedAt: curStatus.startedAt || Date.now()
              });
              markFaucetClaimNotConfirmedRow(notConfirmedMsg);
              try { stablesClearOptimisticBalance('Winiwa'); } catch (_) { /* ignore */ }
              try { await window.stablesRefreshLiveNodeBalances({ reason: 'settlement', attempts: 2, preserveWiniwa: false, forceDuringTxSync: true }); } catch (_) { /* ignore */ }
              setFaucetPourInProgress(false);
            }
          })();
          if (typeof showToast === 'function') {
            showToast('Node is still processing the Winiwa pour. Stables is tracking it from history.', { tone: 'amber', durationMs: 7000 });
          }
          return;
        }
        covenantClaimError = (err && err.message) || 'Covenant faucet claim failed';
        // Roll back the optimistic pour state: the claim never reached the chain, so the
        // "receiving" activity row must become an honest failure (a phantom row also armed the
        // cooldown pill on the first live claim) and no optimistic balance may survive.
        try {
          /* A queued command is waiting for the person, not a claim that went wrong. Read it from
             the flag the transport sets, never by matching words in the message: the previous
             version tested for the substring "read-only access", so rewording the sentence silently
             turned every waiting claim back into a failure. */
          const permFaucet = (err && err.needsConfirmation) ? stablesPermissionRowText('Faucet claim') : null;
          markFaucetClaimNotConfirmedRow(
            permFaucet ? permFaucet.note : covenantClaimError,
            permFaucet ? permFaucet.title : 'Faucet claim failed',
            null,
            permFaucet ? permFaucet.status : 'Failed');
        } catch (_) { /* ignore */ }
        try { stablesClearOptimisticBalance('Winiwa'); } catch (_) { /* ignore */ }
        setFaucetPourStatusSurface({
          active: false,
          keepVisible: true,
          phase: 'error',
          title: 'Pour failed',
          detail: covenantClaimError,
          amountText: fmtInt(claimAmount),
          resetTimer: false
        });
        if (typeof showToast === 'function') {
          showToast(covenantClaimError, { tone: 'amber', durationMs: 9000 });
        }
        setFaucetSettlementStatus(false);
      } finally {
        if (!covenantClaimTracking) setFaucetPourInProgress(false);
        // Pour outcome (failed / submitted) is shown in the floating status card and the toast,
        // not the inline cooldown hint — so the page does not grow/shift on a result. The hint
        // is left for its short cooldown/info line only.
      }
      return;
    }

    const address = wallet.miniaddress || wallet.address;
    if (typeof showToast === 'function') {
      showToast('Requesting ' + fmtInt(claimAmount) + ' Winiwa from test issuer…', { tone: 'amber', durationMs: 5000 });
    }

    try {
      const out = await testIssuerApiGet('/claim?address=' + encodeURIComponent(address));
      const data = out.data || {};
      const ok = data.ok === true;
      if (!ok) {
        let msg;
        if (data.error === 'rate_limited') {
          msg = 'Faucet limit: ' + fmtInt(claimAmount) + ' Winiwa per hour per wallet.';
        } else if (data.error === 'issuer_not_ready' || (data.message && String(data.message).indexOf('Test07') >= 0)) {
          msg = data.message || 'Issuer node offline or has no Winiwa. Start Test07 (issuer) on RPC 9006, then restart test-faucet-server.mjs.';
        } else if (String(data.error || '').indexOf('No Coins of tokenid') >= 0) {
          msg = 'Wrong node on issuer RPC (no Winiwa). Start Test07 issuer — not your tester wallet on port 9005.';
        } else {
          msg = data.message || data.error || 'Faucet claim failed';
        }
        if (typeof showToast === 'function') showToast(msg, { tone: 'amber', durationMs: 8000 });
        return;
      }
      try {
        localStorage.setItem(keyFn(), String(Date.now()));
      } catch (_) { /* ignore */ }
      if (typeof syncFaucetWiniwaClaimButton === 'function') syncFaucetWiniwaClaimButton();
      const txid = extractTxidFromIssuerResult(data.result);
      appendTestFaucetActivityRow(claimAmount, txid);
      if (typeof navigate === 'function') navigate('activity');
      if (typeof showToast === 'function') {
        showToast(
          'Received ' + fmtInt(claimAmount) + ' on-chain Winiwa. See Activity for the incoming row.',
          { tone: 'amber', durationMs: 6000 }
        );
      }
      await sleep(10000);
      await window.stablesRefreshLiveNodeBalances({ reason: 'user-action' });
      if (typeof window.stablesSyncNodeTransactions === 'function') {
        try { await window.stablesSyncNodeTransactions(true); } catch (_) { /* ignore */ }
      }
    } catch (err) {
      const hint = mdsNetReady()
        ? 'Issuer API unreachable from your node. Run test-faucet-server.mjs where RPC listens, or set TEST_FAUCET_API_URL to a reachable host.'
        : 'Faucet unreachable. Start test-faucet-server.mjs on the issuer machine.';
      if (typeof showToast === 'function') {
        showToast((err && err.message) ? (err.message + ' — ' + hint) : hint, { tone: 'amber', durationMs: 7000 });
      }
      throw err;
    }
  };

  window.__STABLES_TEST_EXECUTE_MINT_WABLES__ = async function executeMintWablesTest() {
    if (!releaseRequireFeature('usdw-mint-burn', 'Stablecoin mint and burn')) throw releaseDeferredError('Stablecoin mint and burn');
    try { console.log('[mint] __STABLES_TEST_EXECUTE_MINT_WABLES__ entered'); } catch (_) {}
    if (typeof vaultExecutionAllowed === 'function' && !vaultExecutionAllowed()) {
      return showToast('Council execution locked - only Executive (Multisig) can execute council decisions.');
    }
    const amtEl = document.getElementById('issueAmt');
    if (!amtEl) return showToast('Mint form not ready - try again');
    const mintAmt = typeof readVaultAmountFromInput === 'function' ? readVaultAmountFromInput(amtEl) : 0;
    if (!(mintAmt > 0)) return window.stablesFieldError('issueAmt', 'Enter an amount');
    const issueCcy = typeof walletParseCcySel === 'function' ? walletParseCcySel('issueCcy') : 'USDw';
    // FORWARD-PRICING: place an ORDER. Skip the genesis-2 Winiwa/registry balance checks — the order
    // deposits lab collateral (g3lab.wintok), which the order executor gathers + validates itself.
    if (forwardPricing && g3prof.commit_address) {
      const wcEl = document.getElementById('issueWiniwaAmt');
      const escrow = (wcEl && typeof readVaultAmountFromInput === 'function') ? readVaultAmountFromInput(wcEl) : 0;
      if (!(escrow > 0)) return window.stablesFieldError('issueWiniwaAmt', 'Enter how much collateral to deposit.');
      const runOrder = function () { _placeOrderConfirmed(0, escrow, 'issueAmt', issueCcy); };
      if (typeof window.openMintBurnConfirm === 'function') {
        window.openMintBurnConfirm({
          op: 'mint', eyebrowText: '', titleText: 'Order confirmation',
          sendText: fmtTokenAmt(escrow) + ' Winiwa',
          receiveText: '≈ ' + fmtTokenAmt(mintAmt) + ' ' + issueCcy,
          feeText: 'Free', counterparty: 'Protocol (forward pricing)',
          address: g3prof.commit_address, network: 'Minima mainnet test channel (Test12)',
          buttonText: 'Confirm order', onConfirm: runOrder
        });
      } else { runOrder(); }
      return;
    }
    if (issueCcy !== 'USDw') {
      return showToast('Test channel: only USDw mint is on-chain right now.');
    }
    if (!winiwaTokenId || !usdwTokenId || !poolMiniaddress) {
      return showToast('Test registry incomplete. Check runtime-config TEST_TOKEN_REGISTRY.', { tone: 'amber', durationMs: 6000 });
    }

    // Market-rated collateral: lock the Winiwa the UI computed at the live rate (the "You spend"
    // field), not 1:1. Read it before showing the confirmation modal.
    const winiwaCostEl = document.getElementById('issueWiniwaAmt');
    const winiwaCost = (winiwaCostEl && typeof readVaultAmountFromInput === 'function') ? readVaultAmountFromInput(winiwaCostEl) : 0;
    if (!(winiwaCost > 0)) {
      return window.stablesFieldError('issueWiniwaAmt', 'Enter how much Winiwa to lock.');
    }

    let winiwaDetail = null;
    try { winiwaDetail = (window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {}).Winiwa || null; } catch (_) { winiwaDetail = null; }
    if (!winiwaDetail && typeof window.stablesRefreshLiveNodeBalances === 'function') {
      await window.stablesRefreshLiveNodeBalances({ reason: 'user-action' });
      winiwaDetail = await waitForTestTokenBalanceDetail('Winiwa', 4);
    }
    let winiwaBefore = winiwaDetail && Number.isFinite(Number(winiwaDetail.available))
      ? Number(winiwaDetail.available)
      : (Number(WALLET_WINIWA) || 0);
    const tol = 1e-5;
    if (winiwaCost > winiwaBefore + tol) {
      let directSendable = 0;
      try {
        const directCoins = await gatherSendableUserCoins(winiwaTokenId, winiwaCost);
        directSendable = directCoins.reduce(function (s, c) { return s + Number(c.tokenamount || 0); }, 0);
      } catch (_) { directSendable = 0; }
      if (directSendable > winiwaBefore) winiwaBefore = directSendable;
      if (winiwaCost > winiwaBefore + tol) {
        return window.stablesFieldError('issueWiniwaAmt', 'Not enough Winiwa. Claim from the faucet or wait for your balance to refresh.');
      }
    }

    let address;
    try {
      address = await fetchTesterAddress();
    } catch (e) {
      return showToast('Connect your node first.', { tone: 'amber', durationMs: 5000 });
    }

    // FORWARD-PRICING (commit→clear): mint = place an order that executes at the NEXT published price.
    const runConfirmed = forwardPricing
      ? function () { _placeOrderConfirmed(0, winiwaCost, 'issueAmt'); }
      : function () { _executeMintWablesTestConfirmed(mintAmt, winiwaCost, address, winiwaBefore); };

    // Styled confirmation modal (matches faucet). Falls back to native confirm if unavailable.
    try { console.log('[mint] about to open modal, openMintBurnConfirm=' + typeof window.openMintBurnConfirm); } catch (_) {}
    if (typeof window.openMintBurnConfirm === 'function') {
      window.openMintBurnConfirm(forwardPricing ? {
        op: 'mint',
        eyebrowText: '',
        titleText: 'Order confirmation',
        sendText: fmtTokenAmt(winiwaCost) + ' Winiwa',
        receiveText: '≈ ' + fmtTokenAmt(mintAmt) + ' ' + issueCcy,
        feeText: 'Free',
        counterparty: 'Protocol (forward pricing)',
        address: g3prof.commit_address || "",
        network: 'Minima mainnet test channel (Test12)',
        buttonText: 'Confirm order',
        onConfirm: runConfirmed
      } : {
        op: 'mint',
        sendText: fmtTokenAmt(winiwaCost) + ' Winiwa',
        receiveText: fmtTokenAmt(mintAmt) + ' USDw',
        feeText: 'Free',
        counterparty: 'Protocol (USDw)',
        address: poolMiniaddress,
        network: 'Minima mainnet test channel (Test12)',
        buttonText: 'Mint ' + fmtTokenAmt(mintAmt) + ' USDw',
        onConfirm: runConfirmed
      });
    } else if (typeof window.stablesConfirm === 'function') {
      window.stablesConfirm({ title: forwardPricing ? 'Place order' : 'Confirm mint', message: forwardPricing ? 'Place this order?' : 'Mint USDw via the on-chain covenant on your node. Continue?', confirmText: forwardPricing ? 'Confirm order' : 'Mint' }).then(function (ok) {
        if (!ok) { showToast(forwardPricing ? 'Order cancelled.' : 'Mint cancelled.'); return; }
        runConfirmed();
      });
    } else {
      runConfirmed();
    }
  };

  // Place a forward-priced mint order (a COMMIT). Optimistic "order placed" feedback + a pending row; the
  // keeper clears it at the next published price and the fill arrives as the target currency.
  async function _placeOrderConfirmed(dir, escrow, clearFieldId, currencyCode) {
    try {
      if (typeof window.stablesShowTxProgressModal === 'function') window.stablesShowTxProgressModal({
        title: 'Order submitted', status: 'Placing your order.', amount: fmtTokenAmt(escrow) + (dir === 0 ? ' Winiwa' : ' ' + (currencyCode || 'USDw')), address: 'Forward pricing', building: true
      });
    } catch (_) {}
    try {
      await window.__STABLES_TEST_PLACE_ORDER_G3__({ dir: dir, escrow: escrow, currencyCode: currencyCode });
      try { if (typeof window.stablesStopSendResultModalTxPoll === 'function') window.stablesStopSendResultModalTxPoll(); } catch (_) {}
      try { const m = document.getElementById('agentActionModal'); if (m) m.classList.remove('open'); } catch (_) {}
      // No success message (founder law: no popups — navigation IS the feedback). Land on Wallet,
      // exactly like the V3 mint/burn flows did.
      try { const f = document.getElementById(clearFieldId); if (f) f.value = ''; } catch (_) {}
      try { if (dir === 0) { if (typeof calcIssue === 'function') calcIssue(); } else if (typeof calcReclaim === 'function') calcReclaim(); } catch (_) {}
      try { if (typeof window.stablesRefreshG3Orders === 'function') window.stablesRefreshG3Orders(); } catch (_) {}
      try { if (typeof navigate === 'function') navigate('wallet'); } catch (_) {}
    } catch (e) {
      try { if (typeof window.stablesStopSendResultModalTxPoll === 'function') window.stablesStopSendResultModalTxPoll(); } catch (_) {}
      try { const m = document.getElementById('agentActionModal'); if (m) m.classList.remove('open'); } catch (_) {}
      showToast((e && e.message) ? e.message : 'Could not place order', { tone: 'amber', durationMs: 7000 });
    }
  }

  // Coverage Fund is LIVE (forward-pricing) when forward pricing is on AND a CF commit + share token
  // are configured for the active profile. Used by the app's CF page to choose the on-chain path.
  window.__STABLES_G3_CF_LIVE = function () {
    if (!releaseFeatureAllowed('coverage-fund')) return false;
    try { return !!(forwardPricing && g3prof.cf_commit_address && (typeof g3prof.cfShareTok === 'function') && g3prof.cfShareTok(g3prof.active[0] || 'USDw')); } catch (_) { return false; }
  };
  // CF deposit (dir 3: currency -> shares) / withdraw (dir 4: shares -> currency) as a forward-pricing
  // order, with a confirm modal mirroring mint/burn. The keeper clears at the next published NAV.
  window.__STABLES_TEST_CF_ORDER__ = function (dir, amount, asset) {
    if (!releaseRequireFeature('coverage-fund', 'Coverage Fund')) return;
    asset = asset || (g3prof.active[0] || 'USDw');
    const amt = Number(amount);
    if (!(amt > 0)) { if (typeof showToast === 'function') showToast('Enter an amount.', { tone: 'amber' }); return; }
    const shareLabel = (typeof displayCcyCodeForUI === 'function' ? displayCcyCodeForUI(asset) : asset) + 'cf';
    const isDeposit = Number(dir) === 3;
    const depositLabel = isDeposit ? asset : shareLabel;   // deposit currency / withdraw shares
    const receiveLabel = isDeposit ? shareLabel : asset;
    const runOrder = function () { _placeOrderConfirmed(Number(dir), amt, 'cfAmount', asset); };
    if (typeof window.openMintBurnConfirm === 'function') {
      window.openMintBurnConfirm({
        op: isDeposit ? 'mint' : 'burn',
        eyebrowText: '', titleText: 'Order confirmation',
        sendText: fmtTokenAmt(amt) + ' ' + depositLabel,
        receiveText: '≈ ' + fmtTokenAmt(amt) + ' ' + receiveLabel,
        feeText: 'Free', counterparty: 'Coverage fund (forward pricing)',
        address: g3prof.cf_commit_address, network: 'Minima mainnet test channel (Test12)',
        buttonText: 'Confirm order', onConfirm: runOrder
      });
    } else { runOrder(); }
  };

  // FX swap is LIVE (forward-pricing) for a given from->to pair when forward pricing is on AND a swap
  // commit is configured AND both sides resolve to on-chain tokens. Used by the Exchange page.
  window.__STABLES_G3_SWAP_LIVE = function (fromCcy, toCcy) {
    if (!releaseFeatureAllowed('exchange')) return false;
    try {
      return !!(forwardPricing && g3prof.swap_commit_address && typeof g3prof.swapTok === 'function'
        && fromCcy !== toCcy && g3prof.swapTok(fromCcy) && g3prof.swapTok(toCcy));
    } catch (_) { return false; }
  };
  // Exchange as a forward-pricing dir-2 order (from-currency -> to-currency at the next published
  // cross rate), with the same confirm as mint/burn/CF. The keeper clears at maturity.
  window.__STABLES_TEST_SWAP_ORDER__ = function (amount, fromCcy, toCcy) {
    if (!releaseRequireFeature('exchange', 'Exchange')) return;
    const amt = Number(amount);
    if (!(amt > 0)) { if (typeof showToast === 'function') showToast('Enter an amount.', { tone: 'amber' }); return; }
    const runOrder = async function () {
      try {
        if (typeof window.stablesShowTxProgressModal === 'function') window.stablesShowTxProgressModal({
          title: 'Order submitted', status: 'Placing your order.', amount: fmtTokenAmt(amt) + ' ' + fromCcy, address: 'Forward pricing', building: true
        });
      } catch (_) {}
      try {
        await window.__STABLES_TEST_PLACE_ORDER_G3__({ dir: 2, escrow: amt, fromCcy: fromCcy, toCcy: toCcy });
        try { if (typeof window.stablesStopSendResultModalTxPoll === 'function') window.stablesStopSendResultModalTxPoll(); } catch (_) {}
        try { const m = document.getElementById('agentActionModal'); if (m) m.classList.remove('open'); } catch (_) {}
        // No success message (founder law) — land on Wallet like every other order flow.
        try { const f = document.getElementById('exFrom'); if (f) f.value = ''; } catch (_) {}
        try { if (typeof window.stablesRefreshG3Orders === 'function') window.stablesRefreshG3Orders(); } catch (_) {}
        try { if (typeof navigate === 'function') navigate('wallet'); } catch (_) {}
      } catch (e) {
        try { if (typeof window.stablesStopSendResultModalTxPoll === 'function') window.stablesStopSendResultModalTxPoll(); } catch (_) {}
        try { const m = document.getElementById('agentActionModal'); if (m) m.classList.remove('open'); } catch (_) {}
        showToast((e && e.message) ? e.message : 'Could not place order', { tone: 'amber', durationMs: 7000 });
      }
    };
    if (typeof window.openMintBurnConfirm === 'function') {
      window.openMintBurnConfirm({
        op: 'mint', eyebrowText: '', titleText: 'Order confirmation',
        sendText: fmtTokenAmt(amt) + ' ' + fromCcy,
        receiveText: '≈ ' + toCcy,
        feeText: 'Free', counterparty: 'Protocol (FX swap, forward pricing)',
        address: g3prof.swap_commit_address, network: 'Minima mainnet test channel (Test12)',
        buttonText: 'Confirm order', onConfirm: runOrder
      });
    } else { runOrder(); }
  };

  // GENESIS-3 forward-pricing: PLACE ORDER = post a COMMIT (collateral escrow -> commit covenant).
  // The keeper clears it after maturity at the oracle-pinned rate (no rate is read/chosen here).
  // Lab profile (LABW collateral -> lab commit) while proving. opts: { escrow, targetCcy? }.
  // Place a forward-pricing order (a COMMIT). opts: { dir (0 mint / 1 burn), escrow, targetCcy? }.
  //   MINT (0): deposit collateral (wintok) -> keeper releases currency.
  //   BURN (1): deposit currency (covtok)   -> keeper releases collateral.
  window.__STABLES_TEST_PLACE_ORDER_G3__ = async function placeOrderG3(opts) {
    opts = opts || {};
    const dir = Number(opts.dir || 0);
    const releaseFeature = dir === 2 ? 'exchange' : ((dir === 3 || dir === 4) ? 'coverage-fund' : 'usdw-mint-burn');
    const releaseLabel = dir === 2 ? 'Exchange' : ((dir === 3 || dir === 4) ? 'Coverage Fund' : 'Stablecoin mint and burn');
    if (!releaseRequireFeature(releaseFeature, releaseLabel)) throw releaseDeferredError(releaseLabel);
    const escrow = Number(opts.escrow);
    const wintok = g3prof.wintok;                                        // collateral (LABW lab / Winiwa prod)
    const covtok = opts.targetCcy || g3prof.currencyTok(opts.currencyCode || (g3prof.active[0] || 'USDw'));  // selected currency (keeper reads port 30)
    const cfshare = (typeof g3prof.cfShareTok === 'function') ? g3prof.cfShareTok(opts.currencyCode || (g3prof.active[0] || 'USDw')) : '';
    // dir 0 mint (deposit collateral) / 1 burn (deposit currency) -> currency commit.
    // dir 2 FX swap (deposit from-currency -> to-currency) -> swap commit (opts.fromCcy / opts.toCcy).
    // dir 3 CF deposit (deposit currency -> cf shares) / 4 CF withdraw (deposit cf shares -> currency) -> CF commit.
    let depositTok, commitAddr, targetTok;
    if (dir === 2) {
      const fromTok = (typeof g3prof.swapTok === 'function') ? g3prof.swapTok(opts.fromCcy) : '';
      const toTok = (typeof g3prof.swapTok === 'function') ? g3prof.swapTok(opts.toCcy) : '';
      depositTok = fromTok; commitAddr = g3prof.swap_commit_address; targetTok = toTok;
    }
    else if (dir === 3) { depositTok = covtok; commitAddr = g3prof.cf_commit_address; targetTok = cfshare; }
    else if (dir === 4) { depositTok = cfshare; commitAddr = g3prof.cf_commit_address; targetTok = covtok; }
    else { depositTok = (dir === 0 ? wintok : covtok); commitAddr = g3prof.commit_address; targetTok = covtok; }
    if (!(escrow > 0)) throw new Error('Enter an amount.');
    if (!commitAddr || !depositTok || !targetTok) throw new Error('Genesis-3 ' + g3prof.name + ' profile incomplete (missing commit/token for dir ' + dir + ').');
    let address;
    try { address = await fetchTesterAddress(); } catch (e) { throw new Error('Connect your node first.'); }

    const coins = await gatherSendableUserCoins(depositTok, escrow);
    const total = coins.reduce(function (s, c) { return s + Number(c.tokenamount || 0); }, 0);
    if (total < escrow - 1e-9) throw new Error(dir === 0 ? 'Not enough collateral to place this order.' : (dir === 4 ? 'Not enough coverage-fund shares to withdraw.' : 'Not enough balance to place this order.'));
    const change = subTokenAmountStr(String(total), String(escrow));

    try { await directOrMdsCmd('txndelete id:' + G3_ORDER_TXN_ID, 'clearing the previous order draft', 15000); } catch (_) {}
    const steps = ['txncreate id:' + G3_ORDER_TXN_ID];
    for (let i = 0; i < coins.length; i++) steps.push('txninput id:' + G3_ORDER_TXN_ID + ' coinid:' + coins[i].coinid);
    // out0 = escrow -> commit covenant, STORING the order state (10 dir, 21 recipient, 30 currency)
    steps.push('txnoutput id:' + G3_ORDER_TXN_ID + ' amount:' + escrow + ' address:' + commitAddr + ' tokenid:' + depositTok + ' storestate:true');
    if (Number(change) > 0) steps.push('txnoutput id:' + G3_ORDER_TXN_ID + ' amount:' + change + ' address:' + address + ' tokenid:' + depositTok + ' storestate:false');
    steps.push('txnstate id:' + G3_ORDER_TXN_ID + ' port:10 value:' + dir);         // dir (0 mint / 1 burn / 3 CF deposit / 4 CF withdraw)
    steps.push('txnstate id:' + G3_ORDER_TXN_ID + ' port:21 value:' + address);    // recipient (fill + refund destination)
    steps.push('txnstate id:' + G3_ORDER_TXN_ID + ' port:30 value:' + targetTok);  // TARGET token the keeper delivers (advisory): currency for mint/burn/withdraw, cf-share for deposit
    await directOrMdsCmdBatch(steps, 'building your order', 90000);

    await directOrMdsCmd('txnsign id:' + G3_ORDER_TXN_ID + ' publickey:auto', 'signing your order', 180000);
    await directOrMdsCmd('txnbasics id:' + G3_ORDER_TXN_ID, 'finalizing your order', 120000);
    const checkRes = await directOrMdsCmd('txncheck id:' + G3_ORDER_TXN_ID, 'validating your order', 90000);
    const valid = (mdsPayload(checkRes) || {}).valid || {};
    if (!valid.basic || !valid.signatures || !valid.mmrproofs) {
      try { console.error('[g3-order] txncheck failed:', JSON.stringify(valid)); } catch (_) { /* ignore */ }
      throw new Error('The order could not be validated. Please try again.');
    }
    const postRes = await directOrMdsCmd('txnpost id:' + G3_ORDER_TXN_ID + ' txndelete:true', 'placing your order', 120000);
    const body = mdsPayload(postRes) || postRes;
    try { console.log('[g3-order] placed dir ' + dir + ' escrow ' + escrow + ' -> ' + String(commitAddr).slice(0, 12)); } catch (_) {}
    return body;
  };
  // back-compat alias: mint = dir 0
  window.__STABLES_TEST_PLACE_MINT_ORDER_G3__ = function (opts) { return window.__STABLES_TEST_PLACE_ORDER_G3__(Object.assign({ dir: 0 }, opts || {})); };

  // ---- Forward-pricing OPEN ORDERS card (pending → filled) ----
  const G3_ORDER_STATE = { known: {}, timer: null };
  function g3StateVal(coin, port) {
    const s = (coin.state || []).find(function (x) { return Number(x.port) === Number(port); });
    return s ? s.data : undefined;
  }
  function g3EnsureOrdersCard() {
    let card = document.getElementById('g3OrdersCard');
    if (card) return card;
    const anchor = document.getElementById('mintWablesMintBlock');
    if (!anchor || !anchor.parentNode) return null;
    card = document.createElement('div');
    card.id = 'g3OrdersCard';
    card.style.cssText = 'display:none;margin-top:16px;padding:14px 16px;border:1px solid var(--hair,rgba(255,255,255,.08));border-radius:14px;background:var(--panel2,rgba(255,255,255,.02))';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    return card;
  }
  function g3RenderOrders(orders, matureage) {
    const card = g3EnsureOrdersCard();
    if (!card) return;
    if (!orders.length) { card.style.display = 'none'; card.innerHTML = ''; return; }
    const rows = orders.map(function (o) {
      const ready = Number(o.age || 0) >= matureage;
      const status = ready ? 'Executing…' : 'Pending';
      const dot = ready ? 'var(--gr,#34d399)' : 'var(--am,#f5b544)';
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--hair,rgba(255,255,255,.06))">'
        + '<span style="display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:' + dot + ';flex:none"></span>'
        + '<span>' + fmtTokenAmt(Number(o.tokenamount)) + ' collateral</span></span>'
        + '<span style="color:var(--m,#93a0b8);font-size:12.5px;text-align:right">' + status + '</span></div>';
    }).join('');
    card.innerHTML = '<div style="font-weight:700;margin-bottom:2px">My orders</div>' + rows;
    card.style.display = 'block';
  }
  window.stablesRefreshG3Orders = async function () {
    if (!forwardPricing || !g3prof.commit_address) return;
    let address; try { address = await fetchTesterAddress(); } catch (_) { return; }
    let coins = [];
    try { const res = await directOrMdsCmd('coins address:' + g3prof.commit_address, 'reading your orders', 20000); coins = mdsPayload(res) || res || []; } catch (_) { return; }
    if (!Array.isArray(coins)) coins = [];
    const mine = coins.filter(function (c) { return !c.spent && String(g3StateVal(c, 21) || '').toLowerCase() === String(address).toLowerCase(); });
    // fill detection: a known order that's no longer present has been cleared by the keeper (filled)
    const nowIds = {}; mine.forEach(function (c) { nowIds[c.coinid] = true; });
    Object.keys(G3_ORDER_STATE.known).forEach(function (id) {
      if (!nowIds[id]) {
        // No "order filled" popup (founder law: no success messages) — the balance and the
        // activity row are the feedback.
        try { if (typeof window.stablesRefreshLiveNodeBalances === 'function') window.stablesRefreshLiveNodeBalances({ reason: 'settlement' }); } catch (_) {}
        delete G3_ORDER_STATE.known[id];
      }
    });
    mine.forEach(function (c) { G3_ORDER_STATE.known[c.coinid] = true; });
    g3RenderOrders(mine, Number((g3profileName==="prod"?(g3cfg.matureage):(g3cfg.lab&&g3cfg.lab.matureage))||2));
  };
  // when forward pricing is on: relabel the mint button, start a light refresh loop
  if (forwardPricing) {
    // Reframe the Mint form to tell the truth about forward pricing: you DEPOSIT collateral, the amount
    // you receive is an ESTIMATE, and it executes at the NEXT published price (not a fixed rate now).
    const relabel = function () {
      try {
        ['issueMintWablesBtn', 'reclaimBurnWablesBtn'].forEach(function (id) { const b = document.getElementById(id); if (b) b.textContent = 'Place order'; });
        // FOUNDER LAW (2026-07-10): NO tabs are ever hidden. The v0.0.4.20 pilot dormancy gate
        // (xWiniwa + Liquidity-funds tabs) read as destruction of the product's shape and is
        // removed — every developed surface stays visible; dormant backends refuse honestly
        // instead of disappearing. Never re-add a hide gate without explicit founder sign-off.
        const sl = document.getElementById('mintSpendLabel'); if (sl) sl.textContent = 'You deposit';
        ['mintReceiveLabel', 'burnReceiveLabel'].forEach(function (id) { const rl = document.getElementById(id); if (rl) rl.textContent = "You'll receive · estimate"; });
        // Minimal-information law (founder 2026-07-10): no rate/mechanism copy on the page —
        // the receive field already says "estimate"; StablesAgent answers the how/why.
        ['mintRateRow', 'burnRateRow'].forEach(function (id) {
          const rr = document.getElementById(id);
          if (rr && rr.style.display !== 'none') rr.style.display = 'none';
        });
      } catch (_) {}
    };
    try { document.addEventListener('DOMContentLoaded', relabel); } catch (_) {}
    relabel();
    // The app re-sets the mint/burn button text on recalc (e.g. "Mint 166 USDw"), reverting the relabel.
    // Self-heal: re-apply "Place order" whenever a button's text drifts back (MutationObserver + a slow
    // interval fallback). Cheap — only observes the two buttons' subtree.
    try {
      const watch = function () {
        ['issueMintWablesBtn', 'reclaimBurnWablesBtn'].forEach(function (id) {
          const b = document.getElementById(id); if (!b || b.__fwdObserved) return; b.__fwdObserved = true;
          const mo = new MutationObserver(function () { if (b.textContent !== 'Place order') b.textContent = 'Place order'; });
          mo.observe(b, { childList: true, characterData: true, subtree: true });
        });
      };
      watch();
      [400, 1200, 2500].forEach(function (ms) { setTimeout(function () { relabel(); watch(); }, ms); });
    } catch (_) {}
    if (!G3_ORDER_STATE.timer) G3_ORDER_STATE.timer = window.stablesRepeatWhileVisible('g3-orders', function () { try { relabel(); window.stablesRefreshG3Orders(); } catch (_) {} }, 20000);
    try { window.stablesRefreshG3Orders(); } catch (_) {}
  }

  async function _executeMintWablesTestConfirmed(mintAmt, winiwaCost, address, winiwaBefore) {
    const handlerFlowStartMs = Date.now();
    // Single-flight: block overlapping mint/burn so we never fire conflicting spends of the one covenant
    // state coin (the cause of "I clicked mint 4 times and nothing happened, just duplicate pending rows").
    if (mintBurnMode === 'covenant' && !mintBurnBeginInFlight()) {
      return showToast('A mint or burn is already in progress. Wait for it to confirm before starting another.', { tone: 'amber', durationMs: 4500 });
    }

    // Stable ids so we can stamp the real txid onto these rows after the covenant posts (lets the
    // existing settlement machinery advance them past 0/1 instead of leaving a stuck pending row).
    // ONE shared flow timestamp + flowId: both legs group into a single rendered row from the very
    // first paint (founder 2026-07-07: never present the legs — one transaction, final form only).
    const mintFlowTs = Date.now();
    const mintFlowId = 'FLOW-' + mintFlowTs;
    const mintSpendRowId = 'MINT-SEND-WINIWA-' + mintFlowTs;
    const mintReceiveRowId = 'MINT-USDW-' + mintFlowTs;

    // INSTANT optimistic feedback (same rules as faucet pour): append activity rows + balance change immediately on click
    // Button reaction + currency totals + pending indicator for tx status / block count
    try {
      const appendFn = typeof window.stablesAppendUserActivityRow === 'function' ? window.stablesAppendUserActivityRow : null;
      const upsertFn = typeof window.stablesUpsertUserActivityRows === 'function' ? window.stablesUpsertUserActivityRows : null;
      const fn = upsertFn || appendFn;
      if (fn) {
        const now = new Date();
        const dateText = now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        // Winiwa spend leg (to pool) - optimistic out immediately
        const spendRow = {
          id: mintSpendRowId,
          dir: 'out',
          icon: '↗',
          counterparty: 'Protocol (USDw)',
          category: 'Winiwa',
          title: 'Locking Winiwa for USDw',
          date: dateText,
          amt: -Math.abs(winiwaCost),
          ccy: 'Winiwa',
          address: poolMiniaddress || '',
          fee: 0,
          explorerTxId: '',
          pendingTxnId: '',
          status: 'Pending',
          note: 'Preparing covenant transaction',
          directionLabel: 'Outgoing',
          minimaOnChain: true,
          localOrigin: true,
          block: 0,
          ts: mintFlowTs,
          flowId: mintFlowId,
          pendingIncoming: false
        };
        // (single atomic upsert with the receive leg below — no spend-only render beat)
        // USDw receive leg - optimistic incoming immediately (will show block count / status indicator + total pulse)
        const receiveRow = {
          id: mintReceiveRowId,
          dir: 'in',
          icon: '↙',
          counterparty: 'Protocol (USDw)',
          category: 'USDw',
          title: 'Minting USDw',
          date: dateText,
          amt: Math.abs(mintAmt),
          ccy: 'USDw',
          address: address || '',
          fee: 0,
          explorerTxId: '',
          pendingTxnId: '',
          status: 'Pending',
          note: 'Preparing covenant transaction',
          directionLabel: 'Incoming',
          minimaOnChain: true,
          localOrigin: true,
          balanceAlreadyApplied: true,
          block: 0,
          ts: mintFlowTs,
          flowId: mintFlowId,
          pendingIncoming: true
        };
        if (upsertFn) upsertFn([spendRow, receiveRow]); else { appendFn(spendRow); appendFn(receiveRow); }
        if (typeof window.renderActivity === 'function') window.renderActivity();
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        // Extra force for wallet tx visibility
        setTimeout(function () {
          try { if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity(); } catch (_) {}
        }, 150);
      }
    } catch (_) { /* ignore */ }

    // Instant balance + total change (outgoing Winiwa deduct; USDw receive will overlay via pending row + activity)
    const baseWiniwa = stablesDisplayedBalanceForOptimistic('Winiwa');
    const expectWiniwaAfter = Math.max(0, baseWiniwa - winiwaCost);
    if (typeof WALLET_WINIWA !== 'undefined') WALLET_WINIWA = expectWiniwaAfter;
    // Optimistic credit for target so currency total updates immediately (reconciled on real receive)
    if (typeof WALLET_STABLE_AMTS !== 'undefined' && WALLET_STABLE_AMTS) {
      WALLET_STABLE_AMTS.USDw = stablesDisplayedBalanceForOptimistic('USDw') + mintAmt;
    }
    try { stablesSetOptimisticBalance('Winiwa', expectWiniwaAfter, 'out'); stablesSetOptimisticBalance('USDw', (Number(WALLET_STABLE_AMTS && WALLET_STABLE_AMTS.USDw) || 0), 'in'); } catch (_) { /* ignore */ }
    clearTestTokenBalanceDetails(['Winiwa', 'USDw']);
    if (typeof saveWalletVaultState === 'function') saveWalletVaultState();
    if (typeof updateGlobalUI === 'function') updateGlobalUI();
    if (typeof calcIssue === 'function') calcIssue();
    if (mintBurnMode === 'covenant' && typeof navigate === 'function') {
      navigate('wallet');
      setTimeout(function () {
        try {
          if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
          if (typeof window.renderActivity === 'function') window.renderActivity();
          if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
          if (typeof window.stablesRefreshPendingSettlement === 'function') window.stablesRefreshPendingSettlement();
          const recent = document.getElementById('walletRecentList');
          const target = recent || (recent && recent.closest('.app-section'));
          if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'center' });
        } catch (_) {}
      }, 100);
    }

    if (mintBurnMode === 'covenant') {
      // Show the transaction progress window directly (seeded on "Building transaction") instead of a
      // toast; the post-submit call below re-shows it with the live row to drive it to confirmed.
      try {
        if (typeof window.stablesShowTxProgressModal === 'function') window.stablesShowTxProgressModal({
          title: 'Mint submitted', status: 'USDw minting.',
          amount: fmtTokenAmt(mintAmt) + ' USDw', address: 'Protocol (USDw)', building: true
        });
      } catch (_) {}
      try { if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate(['Winiwa','USDw']); } catch (_) {}
      let posted;
      try {
        posted = await window.__STABLES_TEST_MINT_BURN_COVENANT__(0, mintAmt, winiwaCost);
      } catch (e) {
        const errMsg = (e && e.message) || 'Covenant mint failed';
        try {
          if (typeof window.stablesUpsertUserActivityRows === 'function') {
            window.stablesUpsertUserActivityRows([
              {
                id: mintSpendRowId,
                title: 'Winiwa collateral failed',
                status: 'Failed',
                note: errMsg,
                pendingIncoming: false
              },
              {
                id: mintReceiveRowId,
                title: 'USDw mint failed',
                status: 'Failed',
                note: errMsg,
                pendingIncoming: false,
                balanceAlreadyApplied: true
              }
            ]);
          }
          if (typeof WALLET_WINIWA !== 'undefined') WALLET_WINIWA = baseWiniwa;
          if (typeof WALLET_STABLE_AMTS !== 'undefined' && WALLET_STABLE_AMTS) {
            WALLET_STABLE_AMTS.USDw = Math.max(0, (Number(WALLET_STABLE_AMTS.USDw) || 0) - mintAmt);
          }
          try { stablesClearOptimisticBalance(['Winiwa', 'USDw']); } catch (_) { /* ignore */ }
          clearTestTokenBalanceDetails(['Winiwa', 'USDw']);
          if (typeof saveWalletVaultState === 'function') saveWalletVaultState();
          if (typeof updateGlobalUI === 'function') updateGlobalUI();
          if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
          if (typeof window.renderActivity === 'function') window.renderActivity();
          if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
        } catch (_) {}
        mintBurnEndInFlight();
        return showToast(errMsg, { tone: 'amber', durationMs: 8000 });
      }
      if (posted && posted.txpow && typeof window.stablesIngestLiveTxpow === 'function') {
        try { window.stablesIngestLiveTxpow(posted.txpow); } catch (_) {}
      }
      // Link optimistic rows to the real txid so the settlement machinery advances them to confirmed.
      try {
        const mtxid = (posted && posted.explorerTxId) || '';
        const mptn = (posted && posted.pendingTxnId) || '';
        if (typeof window.stablesUpsertUserActivityRows === 'function') {
          window.stablesUpsertUserActivityRows([
            {
              id: mintSpendRowId,
              title: 'Locking Winiwa for USDw',
              explorerTxId: mtxid,
              pendingTxnId: mptn,
              status: mtxid ? 'On-chain' : ((mtxid || mptn) ? 'Broadcasted' : 'Pending'),
              note: (mtxid || mptn) ? 'Accepted by node. Confirming on-chain.' : 'Submitted to node. Waiting for transaction id.'
            },
            {
              id: mintReceiveRowId,
              title: 'Minting USDw',
              explorerTxId: mtxid,
              pendingTxnId: mptn,
              status: mtxid ? 'On-chain' : ((mtxid || mptn) ? 'Broadcasted' : 'Pending'),
              note: (mtxid || mptn) ? 'Accepted by node. Confirming on-chain.' : 'Submitted to node. Waiting for transaction id.'
            }
          ]);
        }
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        if (typeof window.renderActivity === 'function') window.renderActivity();
        if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
        try {
          if (typeof window.stablesShowTxProgressModal === 'function') window.stablesShowTxProgressModal({
            title: 'Mint submitted', status: 'USDw minting.',
            amount: fmtTokenAmt(mintAmt) + ' USDw', address: 'Protocol (USDw)',
            rowId: mintReceiveRowId, txid: mtxid, pendingTxnId: mptn
          });
        } catch (_) {}
        if (mptn || mtxid) {
          setTimeout(function () {
            (async function () {
              let minedTxid = '';
              try {
                minedTxid = await pollMinedMintBurnTxpow(0, mintAmt, winiwaCost, address, mptn, handlerFlowStartMs);
              } catch (_) { minedTxid = ''; }
              await linkMinedTxpowToActivityRows([mintSpendRowId, mintReceiveRowId], mptn, minedTxid || mtxid);
              if (minedTxid || mtxid) await forceConfirmedCovenantBalanceRefresh('usdw-mint-confirmed');
            })().catch(function () { /* ignore */ });
          }, 1500);
        }
        if (typeof window.stablesRefreshPendingSettlement === 'function') {
          setTimeout(function () { try { window.stablesRefreshPendingSettlement(); } catch (_) {} }, 1500);
        }
      } catch (_) {}
      // The field is looked up here, not inherited from the caller. `amtEl` was the caller's
      // const, so this line threw ReferenceError on every SUCCESSFUL operation and killed the
      // rest of this function: the amount stayed on screen, the quote never recalculated and
      // the confirmed balance refresh never ran (proved on-chain, MDS host, 2026-09-02).
      const clearAmtEl = document.getElementById('issueAmt');
      if (clearAmtEl) clearAmtEl.value = '';
      if (typeof calcIssue === 'function') calcIssue();
      if (typeof navigate === 'function') navigate('wallet');
      await sleep(8000);
      await window.stablesRefreshLiveNodeBalances({ reason: 'user-action', attempts: 6, expectMinWiniwa: expectWiniwaAfter, preserveWiniwa: false });
      setTimeout(function () {
        try {
          if (typeof window.stablesSyncNodeTransactions === 'function') window.stablesSyncNodeTransactions(true);
          if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
          if (typeof window.renderActivity === 'function') window.renderActivity();
        } catch (_) {}
      }, 3000);
      return;
    }

    if (typeof showToast === 'function') {
      showToast('Step 1/2: sending ' + fmtTokenAmt(winiwaCost) + ' Winiwa to collateral pool…', { tone: 'amber', durationMs: 8000 });
    }

    let sendPendingId = '';
    try {
      const sendCmd = 'send address:' + poolMiniaddress + ' amount:' + winiwaCost + ' tokenid:' + winiwaTokenId;
      const sendRes = await mdsCmdAsync(sendCmd);
      // Capture mempool / tx id for optimistic row reconciliation and status (same as faucet)
      if (sendRes && sendRes.response) {
        sendPendingId = sendRes.response.transactionid || sendRes.response.txpowid || sendRes.response.txid || '';
      } else if (sendRes && sendRes.txpowid) {
        sendPendingId = sendRes.txpowid;
      }
    } catch (e) {
      return showToast((e && e.message) || 'Winiwa send to pool failed', { tone: 'amber', durationMs: 6000 });
    }

    // Enrich the optimistic spend row with real pending id if available (for block count / settling)
    if (sendPendingId) {
      try {
        const upsertFn = typeof window.stablesUpsertUserActivityRows === 'function' ? window.stablesUpsertUserActivityRows : null;
        if (upsertFn) {
          // lightweight update of the pending id on the matching local row
          upsertFn([{
            id: 'MINT-SEND-WINIWA-' + (Date.now() - 1000), // approximate; the upsert logic inside will match by other keys too
            pendingTxnId: sendPendingId,
            status: 'Pending'
          }]);
        }
      } catch (_) {}
    }

    if (typeof updateGlobalUI === 'function') updateGlobalUI();
    if (typeof calcIssue === 'function') calcIssue();

    if (typeof showToast === 'function') {
      showToast('Step 2/2: issuer releasing USDw (wait ~30s)…', { tone: 'amber', durationMs: 12000 });
    }
    await sleep(30000);

    try {
      const out = await testIssuerApiGet(
        '/mint-usdw?address=' + encodeURIComponent(address) + '&amount=' + encodeURIComponent(String(mintAmt))
      );
      const data = out.data || {};
      if (data.ok !== true) {
        return showToast(data.error || 'Issuer mint failed', { tone: 'amber', durationMs: 6000 });
      }
    } catch (e) {
      return showToast('Issuer API unreachable. Is test-faucet-server.mjs running?', { tone: 'amber', durationMs: 6000 });
    }

    await sleep(15000);
    await window.stablesRefreshLiveNodeBalances({ reason: 'user-action',
      attempts: 8,
      expectMinWiniwa: expectWiniwaAfter,
    });

    // Reconcile / settle any optimistic rows with real chain data (the early optimistic rows already gave instant UI)
    const mintInputEl = document.getElementById('xwmAmt');
    if (mintInputEl) mintInputEl.value = '';
    if (typeof calcIssue === 'function') calcIssue();
    if (typeof showToast === 'function') {
      showToast('USDw mint submitted. Wallet balances will refresh from your node as soon as the transaction confirms.', { tone: 'amber', durationMs: 6000 });
    }
    if (typeof navigate === 'function') navigate('wallet');
    // Trigger background history sync and renders so block count / status indicators advance and rows settle like faucet
    setTimeout(function () {
      try {
        if (typeof window.stablesSyncNodeTransactions === 'function') window.stablesSyncNodeTransactions(true);
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        if (typeof window.renderActivity === 'function') window.renderActivity();
      } catch (_) {}
    }, 3000);
  };

  window.__STABLES_TEST_EXECUTE_BURN_WABLES__ = async function executeBurnWablesTest() {
    if (!releaseRequireFeature('usdw-mint-burn', 'Stablecoin mint and burn')) throw releaseDeferredError('Stablecoin mint and burn');
    try { console.log('[burn] __STABLES_TEST_EXECUTE_BURN_WABLES__ entered'); } catch (_) {}
    if (typeof vaultExecutionAllowed === 'function' && !vaultExecutionAllowed()) {
      return showToast('Council execution locked - only Executive (Multisig) can execute council decisions.');
    }
    const amtEl = document.getElementById('reclaimAmt');
    if (!amtEl) return showToast('Burn form not ready - try again');
    const burnAmt = typeof readVaultAmountFromInput === 'function' ? readVaultAmountFromInput(amtEl) : 0;
    const reclaimCcy = typeof walletParseCcySel === 'function' ? walletParseCcySel('reclaimCcy') : 'USDw';
    if (reclaimCcy !== 'USDw') {
      return showToast('Test channel: only USDw burn is on-chain (market-rate Winiwa reclaim).');
    }
    if (!winiwaTokenId || !usdwTokenId || !issuerMiniaddress) {
      return showToast('Test registry incomplete. Check runtime-config TEST_TOKEN_REGISTRY.', { tone: 'amber', durationMs: 6000 });
    }
    if (!(burnAmt > 0)) return window.stablesFieldError('reclaimAmt', 'Enter an amount');
    // Market-rated: burn `burnAmt` USDw to reclaim the Winiwa the UI computed at the live rate
    // (the "You receive" field). amt = Winiwa released, coll = USDw burned.
    const reclaimWinEl = document.getElementById('reclaimWiniwaAmt');
    const reclaimWiniwa = (reclaimWinEl && typeof readVaultAmountFromInput === 'function') ? readVaultAmountFromInput(reclaimWinEl) : 0;
    if (!(reclaimWiniwa > 0)) return window.stablesFieldError('reclaimAmt', 'Enter an amount.');

    let usdDetail = null;
    try { usdDetail = (window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {}).USDw || null; } catch (_) { usdDetail = null; }
    if (!usdDetail && typeof window.stablesRefreshLiveNodeBalances === 'function') {
      await window.stablesRefreshLiveNodeBalances({ reason: 'user-action' });
      usdDetail = await waitForTestTokenBalanceDetail('USDw', 4);
    }
    const stableBal = usdDetail && Number.isFinite(Number(usdDetail.available))
      ? Number(usdDetail.available)
      : (Number(WALLET_STABLE_AMTS && WALLET_STABLE_AMTS.USDw) || 0);
    if (burnAmt > stableBal) {
      const hasDetail = !!((window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {}).USDw);
      return window.stablesFieldError('reclaimAmt', hasDetail ? 'Not enough USDw' : 'USDw balance is still loading, try again in a moment.');
    }

    let address;
    try {
      address = await fetchTesterAddress();
    } catch (e) {
      return showToast('Connect your node first.', { tone: 'amber', durationMs: 5000 });
    }

    // FORWARD-PRICING (commit→clear): burn = place a sell order (deposit currency → collateral at the next price).
    const runConfirmed = forwardPricing
      ? function () { _placeOrderConfirmed(1, burnAmt, 'reclaimAmt', (typeof walletParseCcySel==='function'?walletParseCcySel('reclaimCcy'):'USDw')); }
      : function () { _executeBurnWablesTestConfirmed(burnAmt, reclaimWiniwa, address, stableBal); };

    // Styled confirmation modal (matches faucet and USDw mint). Falls back to native confirm if unavailable.
    try { console.log('[burn] about to open modal, openMintBurnConfirm=' + typeof window.openMintBurnConfirm); } catch (_) {}
    if (typeof window.openMintBurnConfirm === 'function') {
      window.openMintBurnConfirm(forwardPricing ? {
        op: 'burn',
        eyebrowText: '',
        titleText: 'Order confirmation',
        sendText: fmtTokenAmt(burnAmt) + ' USDw',
        receiveText: '≈ ' + fmtTokenAmt(reclaimWiniwa) + ' Winiwa',
        feeText: 'Free',
        counterparty: 'Protocol (forward pricing)',
        address: g3prof.commit_address || "",
        network: 'Minima mainnet test channel (Test12)',
        buttonText: 'Confirm order',
        onConfirm: runConfirmed
      } : {
        op: 'burn',
        sendText: fmtTokenAmt(burnAmt) + ' USDw',
        receiveText: fmtTokenAmt(reclaimWiniwa) + ' Winiwa',
        feeText: 'Free',
        counterparty: 'Protocol (USDw)',
        address: issuerMiniaddress,
        network: 'Minima mainnet test channel (Test12)',
        buttonText: 'Burn ' + fmtTokenAmt(burnAmt) + ' USDw',
        onConfirm: runConfirmed
      });
    } else {
      // D023 law 1 and the app's own commitment surface: an irreversible burn is confirmed by
      // Stables or it does not happen. Handing the decision to a platform dialog is forbidden, and
      // proceeding because no confirmation channel exists is worse - that branch used to burn
      // without asking wherever the WebView provides no JS dialog.
      return showToast('Burn cannot be confirmed right now. Reopen the page and try again.', { tone: 'amber', durationMs: 6000 });
    }
  };

  async function _executeBurnWablesTestConfirmed(burnAmt, reclaimWiniwa, address, stableBal) {
    const handlerFlowStartMs = Date.now();
    // Single-flight: block overlapping mint/burn (shared covenant state coin) — see mint handler.
    if (mintBurnMode === 'covenant' && !mintBurnBeginInFlight()) {
      return showToast('A mint or burn is already in progress. Wait for it to confirm before starting another.', { tone: 'amber', durationMs: 4500 });
    }

    // Stable ids so the real txid can be stamped onto these rows after the covenant posts (settlement).
    const burnFlowTs = Date.now();
    const burnFlowId = 'FLOW-' + burnFlowTs;
    const burnSpendRowId = 'BURN-SEND-USDW-' + burnFlowTs;
    const burnReceiveRowId = 'BURN-WINIWA-' + burnFlowTs;

    // INSTANT optimistic + balance (same as faucet and USDw mint): rows appear, totals change with pending status indicator immediately
    try {
      const appendFn = typeof window.stablesAppendUserActivityRow === 'function' ? window.stablesAppendUserActivityRow : null;
      const upsertFn = typeof window.stablesUpsertUserActivityRows === 'function' ? window.stablesUpsertUserActivityRows : null;
      const fn = upsertFn || appendFn;
      if (fn) {
        const now = new Date();
        const dateText = now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        const spendRow = {
          id: burnSpendRowId,
          dir: 'out',
          icon: '↗',
          counterparty: 'Protocol (USDw)',
          category: 'USDw',
          title: 'Burning USDw',
          date: dateText,
          amt: -Math.abs(burnAmt),
          ccy: 'USDw',
          address: issuerMiniaddress || '',
          fee: 0,
          explorerTxId: '',
          pendingTxnId: '',
          status: 'Pending',
          note: 'Preparing covenant transaction',
          directionLabel: 'Outgoing',
          minimaOnChain: true,
          localOrigin: true,
          block: 0,
          ts: burnFlowTs,
          flowId: burnFlowId,
          pendingIncoming: false
        };
        // (single atomic upsert with the receive leg below — no spend-only render beat)
        const receiveRow = {
          id: burnReceiveRowId,
          dir: 'in',
          icon: '↙',
          counterparty: 'Protocol (USDw)',
          category: 'Winiwa',
          title: 'Reclaiming Winiwa',
          date: dateText,
          amt: Math.abs(reclaimWiniwa),
          ccy: 'Winiwa',
          address: address || '',
          fee: 0,
          explorerTxId: '',
          pendingTxnId: '',
          status: 'Pending',
          note: 'Preparing covenant transaction',
          directionLabel: 'Incoming',
          minimaOnChain: true,
          localOrigin: true,
          balanceAlreadyApplied: true,
          block: 0,
          ts: burnFlowTs,
          flowId: burnFlowId,
          pendingIncoming: true
        };
        if (upsertFn) upsertFn([spendRow, receiveRow]); else { appendFn(spendRow); appendFn(receiveRow); }
        if (typeof window.renderActivity === 'function') window.renderActivity();
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      }
    } catch (_) { /* ignore */ }

    // Instant currency total + hero balance update for burn (deduct USDw, Winiwa incoming via pending row + activity)
    const baseStableBal = stablesDisplayedBalanceForOptimistic('USDw');
    const expectUsdwAfter = Math.max(0, baseStableBal - burnAmt);
    const baseWiniwaBeforeBurn = stablesDisplayedBalanceForOptimistic('Winiwa');
    if (typeof WALLET_STABLE_AMTS !== 'undefined' && WALLET_STABLE_AMTS) WALLET_STABLE_AMTS.USDw = expectUsdwAfter;
    if (typeof WALLET_WINIWA !== 'undefined') WALLET_WINIWA = baseWiniwaBeforeBurn + reclaimWiniwa;
    try { stablesSetOptimisticBalance('USDw', expectUsdwAfter, 'out'); stablesSetOptimisticBalance('Winiwa', baseWiniwaBeforeBurn + reclaimWiniwa, 'in'); } catch (_) { /* ignore */ }
    clearTestTokenBalanceDetails(['Winiwa', 'USDw']);
    if (typeof saveWalletVaultState === 'function') saveWalletVaultState();
    if (typeof updateGlobalUI === 'function') updateGlobalUI();

    if (mintBurnMode === 'covenant') {
      // Transaction progress window directly (seeded), no toast.
      try {
        if (typeof window.stablesShowTxProgressModal === 'function') window.stablesShowTxProgressModal({
          title: 'Burn submitted', status: 'USDw burning.',
          amount: fmtTokenAmt(burnAmt) + ' USDw → ' + fmtTokenAmt(reclaimWiniwa) + ' Winiwa',
          address: 'Protocol (USDw)', building: true
        });
      } catch (_) {}
      try { if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate(['USDw','Winiwa']); } catch (_) {}
      let posted;
      try {
        posted = await window.__STABLES_TEST_MINT_BURN_COVENANT__(1, reclaimWiniwa, burnAmt);
      } catch (e) {
        const errMsg = (e && e.message) || 'Covenant burn failed';
        try {
          if (typeof window.stablesUpsertUserActivityRows === 'function') {
            window.stablesUpsertUserActivityRows([
              {
                id: burnSpendRowId,
                title: 'USDw burn failed',
                status: 'Failed',
                note: errMsg,
                pendingIncoming: false
              },
              {
                id: burnReceiveRowId,
                title: 'Winiwa reclaim failed',
                status: 'Failed',
                note: errMsg,
                pendingIncoming: false,
                balanceAlreadyApplied: true
              }
            ]);
          }
          if (typeof WALLET_STABLE_AMTS !== 'undefined' && WALLET_STABLE_AMTS) WALLET_STABLE_AMTS.USDw = baseStableBal;
          if (typeof WALLET_WINIWA !== 'undefined') WALLET_WINIWA = baseWiniwaBeforeBurn;
          try { stablesClearOptimisticBalance(['Winiwa', 'USDw']); } catch (_) { /* ignore */ }
          clearTestTokenBalanceDetails(['Winiwa', 'USDw']);
          if (typeof saveWalletVaultState === 'function') saveWalletVaultState();
          if (typeof updateGlobalUI === 'function') updateGlobalUI();
          if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
          if (typeof window.renderActivity === 'function') window.renderActivity();
          if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
        } catch (_) {}
        mintBurnEndInFlight();
        return showToast(errMsg, { tone: 'amber', durationMs: 8000 });
      }
      if (posted && posted.txpow && typeof window.stablesIngestLiveTxpow === 'function') {
        try { window.stablesIngestLiveTxpow(posted.txpow); } catch (_) {}
      }
      // Link optimistic rows to the real txid so the settlement machinery advances them to confirmed.
      try {
        const btxid = (posted && posted.explorerTxId) || '';
        const bptn = (posted && posted.pendingTxnId) || '';
        if (typeof window.stablesUpsertUserActivityRows === 'function') {
          window.stablesUpsertUserActivityRows([
            {
              id: burnSpendRowId,
              title: 'Burning USDw',
              explorerTxId: btxid,
              pendingTxnId: bptn,
              status: btxid ? 'On-chain' : ((btxid || bptn) ? 'Broadcasted' : 'Pending'),
              note: (btxid || bptn) ? 'Accepted by node. Confirming on-chain.' : 'Submitted to node. Waiting for transaction id.'
            },
            {
              id: burnReceiveRowId,
              title: 'Reclaiming Winiwa',
              explorerTxId: btxid,
              pendingTxnId: bptn,
              status: btxid ? 'On-chain' : ((btxid || bptn) ? 'Broadcasted' : 'Pending'),
              note: (btxid || bptn) ? 'Accepted by node. Confirming on-chain.' : 'Submitted to node. Waiting for transaction id.'
            }
          ]);
        }
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        if (typeof window.renderActivity === 'function') window.renderActivity();
        if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
        try {
          if (typeof window.stablesShowTxProgressModal === 'function') window.stablesShowTxProgressModal({
            title: 'Burn submitted', status: 'USDw burning.',
            amount: fmtTokenAmt(burnAmt) + ' USDw → ' + fmtTokenAmt(reclaimWiniwa) + ' Winiwa',
            address: 'Protocol (USDw)',
            rowId: burnReceiveRowId, txid: btxid, pendingTxnId: bptn
          });
        } catch (_) {}
        setTimeout(function () {
          (async function () {
            let minedTxid = '';
            try {
              minedTxid = await pollMinedMintBurnTxpow(1, reclaimWiniwa, burnAmt, address, bptn, handlerFlowStartMs);
            } catch (_) { minedTxid = ''; }
            await linkMinedTxpowToActivityRows([burnSpendRowId, burnReceiveRowId], bptn, minedTxid || btxid);
            if (minedTxid || btxid) await forceConfirmedCovenantBalanceRefresh('usdw-burn-confirmed');
          })().catch(function () { /* ignore */ }).finally(function () { mintBurnEndInFlight(); });
        }, 1500);
        if (typeof window.stablesRefreshPendingSettlement === 'function') {
          setTimeout(function () { try { window.stablesRefreshPendingSettlement(); } catch (_) {} }, 1500);
        }
      } catch (_) {}
      // The field is looked up here, not inherited from the caller. `amtEl` was the caller's
      // const, so this line threw ReferenceError on every SUCCESSFUL operation and killed the
      // rest of this function: the amount stayed on screen, the quote never recalculated and
      // the confirmed balance refresh never ran (proved on-chain, MDS host, 2026-09-02).
      const clearAmtEl = document.getElementById('reclaimAmt');
      if (clearAmtEl) clearAmtEl.value = '';
      if (typeof calcReclaim === 'function') calcReclaim();
      if (typeof navigate === 'function') navigate('wallet');
      await sleep(8000);
      await window.stablesRefreshLiveNodeBalances({ reason: 'user-action', attempts: 6, preserveWiniwa: false });
      setTimeout(function () {
        try {
          if (typeof window.stablesSyncNodeTransactions === 'function') window.stablesSyncNodeTransactions(true);
          if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
          if (typeof window.renderActivity === 'function') window.renderActivity();
        } catch (_) {}
      }, 3000);
      return;
    }

    if (typeof showToast === 'function') {
      showToast('Step 1/2: sending ' + fmtTokenAmt(burnAmt) + ' USDw to issuer…', { tone: 'amber', durationMs: 8000 });
    }

    try {
      const sendCmd = 'send address:' + issuerMiniaddress + ' amount:' + burnAmt + ' tokenid:' + usdwTokenId;
      await mdsCmdAsync(sendCmd);
    } catch (e) {
      return showToast((e && e.message) || 'USDw send to issuer failed', { tone: 'amber', durationMs: 6000 });
    }

    if (typeof showToast === 'function') {
      showToast('Step 2/2: issuer burning USDw and releasing Winiwa (up to 2 min)…', { tone: 'amber', durationMs: 90000 });
    }
    await sleep(35000);

    try {
      const burnCtrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const burnTid = burnCtrl ? setTimeout(function () { burnCtrl.abort(); }, 180000) : null;
      let out;
      if (mdsNetReady() && typeof MDS.net.GET === 'function') {
        out = await testIssuerApiGet(
          '/burn-usdw?address=' + encodeURIComponent(address) + '&amount=' + encodeURIComponent(String(burnAmt))
        );
      } else {
        const res = await fetch(
          apiUrl + '/burn-usdw?address=' + encodeURIComponent(address) + '&amount=' + encodeURIComponent(String(burnAmt)),
          { cache: 'no-store', signal: burnCtrl ? burnCtrl.signal : undefined }
        );
        if (burnTid) clearTimeout(burnTid);
        out = { data: await res.json(), httpOk: res.ok };
      }
      if (burnTid) clearTimeout(burnTid);
      const data = out.data || {};
      if (data.ok !== true) {
        return showToast(data.error || 'Issuer burn failed', { tone: 'amber', durationMs: 6000 });
      }
    } catch (e) {
      return showToast('Issuer burn timed out or failed. Check issuer node and retry.', { tone: 'amber', durationMs: 6000 });
    }

    await sleep(15000);
    await window.stablesRefreshLiveNodeBalances({ reason: 'user-action' });
    // The field is looked up here, not inherited from the caller. `amtEl` was the caller's
    // const, so this line threw ReferenceError on every SUCCESSFUL operation and killed the
    // rest of this function: the amount stayed on screen, the quote never recalculated and
    // the confirmed balance refresh never ran (proved on-chain, MDS host, 2026-09-02).
    const clearAmtEl = document.getElementById('reclaimAmt');
    if (clearAmtEl) clearAmtEl.value = '';

    if (typeof calcReclaim === 'function') calcReclaim();
    if (typeof showToast === 'function') {
      showToast('Burned ' + fmtTokenAmt(burnAmt) + ' USDw and received Winiwa from pool (test, market rate).', { tone: 'amber', durationMs: 6000 });
    }
    if (typeof navigate === 'function') navigate('wallet');
    // Trigger sync + renders so the early optimistic burn rows get block count / tx status updates and settle
    setTimeout(function () {
      try {
        if (typeof window.stablesSyncNodeTransactions === 'function') window.stablesSyncNodeTransactions(true);
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        if (typeof window.renderActivity === 'function') window.renderActivity();
      } catch (_) {}
    }, 3000);
  };

  // Test xWiniwa covenant route (fixed 1:1 Winiwa <-> xWiniwa)
  window.__STABLES_TEST_EXECUTE_MINT_XWM__ = async function executeMintXwmTest() {
    const walletProof = window.__STABLES_WALLET_PROOF_STATE__ || {};
    const vaultProof = window.__STABLES_XWINIWA_VAULT_PROOF_STATE__ || {};
    if (walletProof.state !== 'ready' || vaultProof.state !== 'ready' || vaultProof.canMint === false) {
      return showToast('Wallet and vault proofs must be Ready before minting.', { tone: 'amber', durationMs: 7000 });
    }
    if (typeof vaultExecutionAllowed === 'function' && !vaultExecutionAllowed()) {
      return showToast('Council execution locked - only Executive (Multisig) can execute council decisions.');
    }
    const amtEl = document.getElementById('xwmAmt');
    if (!amtEl) return showToast('Mint form not ready - try again');
    const mintAmt = typeof readVaultAmountFromInput === 'function' ? readVaultAmountFromInput(amtEl) : 0;
    if (!(mintAmt > 0)) return window.stablesFieldError('xwmAmt', 'Enter an amount');
    // TV81: the exclusive generation needs only the token IDs here; the deployed D13 vault
    // identity lives in the app registry projection and the executor fails closed on it.
    if (!winiwaTokenId || !xwiniwaTokenId || (!tv81Exclusive && (!xwiniwaCovenantAddress || !xwiniwaCovenantScript))) {
      return showToast('xWiniwa registry incomplete. Check runtime-config TEST_TOKEN_REGISTRY.', { tone: 'amber', durationMs: 6000 });
    }

    let winiwaDetail = null;
    try { winiwaDetail = (window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {}).Winiwa || null; } catch (_) { winiwaDetail = null; }
    if (!winiwaDetail && typeof window.stablesRefreshLiveNodeBalances === 'function') {
      await window.stablesRefreshLiveNodeBalances({ reason: 'user-action' });
      winiwaDetail = await waitForTestTokenBalanceDetail('Winiwa', 4);
    }
    let winiwaBefore = winiwaDetail && Number.isFinite(Number(winiwaDetail.available))
      ? Number(winiwaDetail.available)
      : (Number(WALLET_WINIWA) || 0);
    const tol = 1e-5;
    if (mintAmt > winiwaBefore + tol) {
      let directSendable = 0;
      try {
        const directCoins = await gatherSendableUserCoins(winiwaTokenId, mintAmt);
        directSendable = directCoins.reduce(function (s, c) { return s + Number(c.tokenamount || 0); }, 0);
      } catch (_) { directSendable = 0; }
      if (directSendable > winiwaBefore) winiwaBefore = directSendable;
      if (mintAmt > winiwaBefore + tol) {
        return window.stablesFieldError('xwmAmt', 'Not enough Winiwa. Claim from the faucet or wait for your balance to refresh.');
      }
    }

    let address;
    try {
      address = await fetchTesterAddress();
    } catch (e) {
      return showToast('Connect your node first.', { tone: 'amber', durationMs: 5000 });
    }

    // ONE quote semantic (v0.0.3.15): the input field is the WINIWA you contribute. Compute the
    // exact covenant terms HERE so the page quote, the confirm modal, the activity rows and the
    // chain all show the same numbers: xwmOut = winiwaIn / ratemint (floored), collateral locked
    // = ceil8(xwmOut × ratemint) ≤ winiwaIn. Previously the modal claimed 1:1 and the builder
    // treated the input as xWiniwa-out — three different quantities at any non-par NAV.
    // TV81 D13 par vault: strict par (q_x == W) is enforced on-chain while L_par = 0, so the mint
    // rate is exactly 1 and must NOT be read from the old orphaned xWiniwa covenant (its ~0.01 NAV
    // made xwmOut = winiwaIn / 0.01 ≈ 100 while the par vault then forced W = q_x, silently spending
    // ~100x the displayed cost). Found in the first phone-gauntlet mint 2026-07-18.
    let xwRatesLive = null;
    if (!tv81Exclusive) {
      try {
        const rc = await mdsCmdAsync('coins address:' + xwiniwaCovenantAddress);
        const sc = ((rc && rc.response) || []).find(function (c) { return String(c.tokenid) === '0x00' && c.state && c.state.length; });
        xwRatesLive = readStateRatePorts(sc);
      } catch (_) { xwRatesLive = null; }
      if (!xwRatesLive && window.__STABLES_XW_LIVE_RATES__ && Number(window.__STABLES_XW_LIVE_RATES__.mint) > 0) {
        xwRatesLive = window.__STABLES_XW_LIVE_RATES__;
      }
    }
    const rateMintLive = tv81Exclusive ? 1 : (xwRatesLive && Number(xwRatesLive.mint) > 0 ? Number(xwRatesLive.mint) : 1);
    const xwmOut = rate8Floor(mintAmt / rateMintLive);
    if (!(xwmOut > 0)) return window.stablesFieldError('xwmAmt', 'Amount too small at the current NAV rate.');
    const collWiniwa = rate8Ceil(xwmOut * rateMintLive);

    // The Mint screen already presents the exact send and receive commitment beside its action.
    // The labeled transaction button is the confirmation step, so do not interrupt it with a
    // second modal or native browser prompt.
    _executeMintXwmTestConfirmed(xwmOut, address, winiwaBefore, collWiniwa);
  };

  // mintAmt = xWiniwa to receive (covenant `amount` semantics); collWiniwa = exact Winiwa locked.
  async function _executeMintXwmTestConfirmed(mintAmt, address, winiwaBefore, collWiniwa) {
    const handlerFlowStartMs = Date.now();
    if (xwiniwaMintBurnMode === 'covenant' && !mintBurnBeginInFlight()) {
      return showToast('A mint or burn is already in progress. Wait for it to confirm before starting another.', { tone: 'amber', durationMs: 4500 });
    }
    const collOut = Number(collWiniwa) > 0 ? Number(collWiniwa) : Math.abs(mintAmt);
    const xwMintFlowTs = Date.now();
    const xwMintFlowId = 'FLOW-' + xwMintFlowTs;
    const mintSpendRowId = 'MINT-XW-SEND-WINIWA-' + xwMintFlowTs;
    const mintReceiveRowId = 'MINT-XWINIWA-' + xwMintFlowTs;

    try {
      const appendFn = typeof window.stablesAppendUserActivityRow === 'function' ? window.stablesAppendUserActivityRow : null;
      const upsertFn = typeof window.stablesUpsertUserActivityRows === 'function' ? window.stablesUpsertUserActivityRows : null;
      const fn = upsertFn || appendFn;
      if (fn) {
        const now = new Date();
        const dateText = now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        const spendRow = {
          id: mintSpendRowId,
          dir: 'out',
          icon: '↗',
          counterparty: 'Protocol (xWiniwa)',
          category: 'Winiwa',
          title: 'Locking Winiwa for xWiniwa',
          date: dateText,
          amt: -Math.abs(collOut),
          ccy: 'Winiwa',
          address: xwiniwaCounterpartyAddress() || '',
          fee: 0,
          explorerTxId: '',
          pendingTxnId: '',
          status: 'Pending',
          note: 'Preparing covenant transaction',
          directionLabel: 'Outgoing',
          minimaOnChain: true,
          localOrigin: true,
          block: 0,
          ts: xwMintFlowTs,
          flowId: xwMintFlowId,
          pendingIncoming: false
        };
        // (single atomic upsert with the receive leg below — no spend-only render beat)
        const receiveRow = {
          id: mintReceiveRowId,
          dir: 'in',
          icon: '↙',
          counterparty: 'Protocol (xWiniwa)',
          category: 'xWiniwa',
          title: 'Minting xWiniwa',
          date: dateText,
          amt: Math.abs(mintAmt),
          ccy: 'xWiniwa',
          address: address || '',
          fee: 0,
          explorerTxId: '',
          pendingTxnId: '',
          status: 'Pending',
          note: 'Preparing covenant transaction',
          directionLabel: 'Incoming',
          minimaOnChain: true,
          localOrigin: true,
          balanceAlreadyApplied: true,
          block: 0,
          ts: xwMintFlowTs,
          flowId: xwMintFlowId,
          pendingIncoming: true
        };
        // ONE ROW PER TRADE (founder law): the mint is a single row carrying the deposit in
        // its note; the spend leg never renders as its own row.
        void spendRow;
        receiveRow.note = 'For ' + fmtTokenAmt(collOut) + ' Winiwa.';
        if (upsertFn) upsertFn([receiveRow]); else appendFn(receiveRow);
        if (typeof window.renderActivity === 'function') window.renderActivity();
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      }
    } catch (_) { /* ignore */ }

    const baseWiniwa = stablesDisplayedBalanceForOptimistic('Winiwa');
    const baseXwm = stablesDisplayedBalanceForOptimistic('xWiniwa');
    const expectWiniwaAfter = Math.max(0, baseWiniwa - collOut);
    if (typeof WALLET_WINIWA !== 'undefined') WALLET_WINIWA = expectWiniwaAfter;
    if (typeof WALLET_XWM !== 'undefined') WALLET_XWM = baseXwm + mintAmt;
    try { stablesSetOptimisticBalance('Winiwa', expectWiniwaAfter, 'out'); stablesSetOptimisticBalance('xWiniwa', baseXwm + mintAmt, 'in'); } catch (_) { /* ignore */ }
    clearTestTokenBalanceDetails(['Winiwa', 'xWiniwa']);
    if (typeof saveWalletVaultState === 'function') saveWalletVaultState();
    if (typeof updateGlobalUI === 'function') updateGlobalUI();
    if (typeof calcXwm === 'function') calcXwm();
    if (typeof navigate === 'function') navigate('wallet');

    try {
      if (typeof window.stablesShowTxProgressModal === 'function') window.stablesShowTxProgressModal({
        title: 'Mint submitted', status: 'xWiniwa minting.',
        amount: fmtTokenAmt(mintAmt) + ' xWiniwa', address: 'Protocol (xWiniwa)', building: true
      });
    } catch (_) {}
      try { if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate(['Winiwa','xWiniwa']); } catch (_) {}
    let posted;
    try {
      posted = await window.__STABLES_TEST_XWINIWA_COVENANT__(0, mintAmt);
    } catch (e) {
      const errMsg = (e && e.message) || 'xWiniwa covenant mint failed';
      const permMint = (e && e.needsConfirmation) ? stablesPermissionRowText('xWiniwa mint') : null;
      try {
        if (typeof window.stablesUpsertUserActivityRows === 'function') {
          window.stablesUpsertUserActivityRows([
            { id: mintReceiveRowId, title: permMint ? permMint.title : 'xWiniwa mint failed', status: permMint ? permMint.status : 'Failed', note: permMint ? permMint.note : errMsg, awaitingApproval: !!permMint, pendingIncoming: false, balanceAlreadyApplied: true }
          ]);
        }
        if (typeof WALLET_WINIWA !== 'undefined') WALLET_WINIWA = baseWiniwa;
        if (typeof WALLET_XWM !== 'undefined') WALLET_XWM = baseXwm;
        try { stablesClearOptimisticBalance(['Winiwa', 'xWiniwa']); } catch (_) { /* ignore */ }
        clearTestTokenBalanceDetails(['Winiwa', 'xWiniwa']);
        if (typeof saveWalletVaultState === 'function') saveWalletVaultState();
        if (typeof updateGlobalUI === 'function') updateGlobalUI();
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        if (typeof window.renderActivity === 'function') window.renderActivity();
        if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
      } catch (_) {}
      mintBurnEndInFlight();
      return showToast(errMsg, { tone: 'amber', durationMs: 8000 });
    }
    if (posted && posted.txpow && typeof window.stablesIngestLiveTxpow === 'function') {
      try { window.stablesIngestLiveTxpow(posted.txpow); } catch (_) {}
    }
    try {
      const txid = (posted && posted.explorerTxId) || '';
      const ptn = (posted && posted.pendingTxnId) || '';
      if (typeof window.stablesUpsertUserActivityRows === 'function') {
        window.stablesUpsertUserActivityRows([
          {
            id: mintReceiveRowId,
            title: 'Minting xWiniwa',
            explorerTxId: txid,
            pendingTxnId: ptn,
            status: txid ? 'On-chain' : ((txid || ptn) ? 'Broadcasted' : 'Pending'),
            note: (txid || ptn) ? 'Accepted by node. Confirming on-chain.' : 'Submitted to node. Waiting for transaction id.'
          }
        ]);
      }
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
      try {
        if (typeof window.stablesShowTxProgressModal === 'function') window.stablesShowTxProgressModal({
          title: 'Mint submitted', status: 'xWiniwa minting.',
          amount: fmtTokenAmt(mintAmt) + ' xWiniwa', address: 'Protocol (xWiniwa)',
          rowId: mintReceiveRowId, txid: txid, pendingTxnId: ptn
        });
      } catch (_) {}
      setTimeout(function () {
        (async function () {
          let minedTxid = '';
          try { minedTxid = await pollMinedXwiniwaTxpow(0, mintAmt, address, ptn, handlerFlowStartMs); } catch (_) { minedTxid = ''; }
          await linkMinedTxpowToActivityRows([mintSpendRowId, mintReceiveRowId], ptn, minedTxid || txid);
          if (minedTxid || txid) await forceConfirmedCovenantBalanceRefresh('xwiniwa-mint-confirmed');
        })().catch(function () { /* ignore */ }).finally(function () { mintBurnEndInFlight(); });
      }, 1500);
      if (typeof window.stablesRefreshPendingSettlement === 'function') {
        setTimeout(function () { try { window.stablesRefreshPendingSettlement(); } catch (_) {} }, 1500);
      }
    } catch (_) {}
    // The field is looked up here, not inherited from the caller. `amtEl` was the caller's
    // const, so this line threw ReferenceError on every SUCCESSFUL operation and killed the
    // rest of this function: the amount stayed on screen, the quote never recalculated and
    // the confirmed balance refresh never ran (proved on-chain, MDS host, 2026-09-02).
    const clearAmtEl = document.getElementById('xwmAmt');
    if (clearAmtEl) clearAmtEl.value = '';
    if (typeof calcXwm === 'function') calcXwm();
    await sleep(8000);
    await window.stablesRefreshLiveNodeBalances({ reason: 'user-action', attempts: 6, expectMinWiniwa: expectWiniwaAfter, preserveWiniwa: false });
    setTimeout(function () {
      try {
        if (typeof window.stablesSyncNodeTransactions === 'function') window.stablesSyncNodeTransactions(true);
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        if (typeof window.renderActivity === 'function') window.renderActivity();
      } catch (_) {}
    }, 3000);
  }

  window.__STABLES_TEST_EXECUTE_BURN_XWM__ = async function executeBurnXwmTest() {
    const walletProof = window.__STABLES_WALLET_PROOF_STATE__ || {};
    const vaultProof = window.__STABLES_XWINIWA_VAULT_PROOF_STATE__ || {};
    if (walletProof.state !== 'ready' || vaultProof.state !== 'ready' || vaultProof.canBurn === false) {
      return showToast('Wallet and vault proofs must be Ready before burning.', { tone: 'amber', durationMs: 7000 });
    }
    if (typeof vaultExecutionAllowed === 'function' && !vaultExecutionAllowed()) {
      return showToast('Council execution locked - only Executive (Multisig) can execute council decisions.');
    }
    const burnEl = document.getElementById('xwmBurnAmt');
    if (!burnEl) return showToast('Burn form not ready - try again');
    const burnAmt = typeof readVaultAmountFromInput === 'function' ? readVaultAmountFromInput(burnEl) : 0;
    if (!(burnAmt > 0)) return window.stablesFieldError('xwmBurnAmt', 'Enter an amount');
    // TV81: the exclusive generation needs only the token IDs here; the deployed D13 vault
    // identity lives in the app registry projection and the executor fails closed on it.
    if (!winiwaTokenId || !xwiniwaTokenId || (!tv81Exclusive && (!xwiniwaCovenantAddress || !xwiniwaCovenantScript))) {
      return showToast('xWiniwa registry incomplete. Check runtime-config TEST_TOKEN_REGISTRY.', { tone: 'amber', durationMs: 6000 });
    }

    let xDetail = null;
    try { xDetail = (window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {}).xWiniwa || null; } catch (_) { xDetail = null; }
    if (!xDetail && typeof window.stablesRefreshLiveNodeBalances === 'function') {
      await window.stablesRefreshLiveNodeBalances({ reason: 'user-action' });
      xDetail = await waitForTestTokenBalanceDetail('xWiniwa', 4);
    }
    const xBal = xDetail && Number.isFinite(Number(xDetail.available))
      ? Number(xDetail.available)
      : (Number(WALLET_XWM) || 0);
    if (burnAmt > xBal + 1e-5) {
      const hasDetail = !!((window.__STABLES_TEST_TOKEN_BALANCE_DETAIL__ || {}).xWiniwa);
      return window.stablesFieldError('xwmBurnAmt', hasDetail ? 'Not enough xWiniwa' : 'xWiniwa balance is still loading, try again in a moment.');
    }

    let address;
    try {
      address = await fetchTesterAddress();
    } catch (e) {
      return showToast('Connect your node first.', { tone: 'amber', durationMs: 5000 });
    }
    // Quote the covenant's exact burn payout for the confirm modal (was shown 1:1):
    // Winiwa out = floor8(xWiniwa in × rateburn) — the same formula the builder enforces.
    // TV81 D13 par vault: burn is strict par (1 xWiniwa -> 1 Winiwa) while L_par = 0; do not read
    // the old orphaned xWiniwa covenant rate (see the mint note above).
    let xwBurnRates = null;
    if (!tv81Exclusive) {
      try {
        const rcB = await mdsCmdAsync('coins address:' + xwiniwaCovenantAddress);
        const scB = ((rcB && rcB.response) || []).find(function (c) { return String(c.tokenid) === '0x00' && c.state && c.state.length; });
        xwBurnRates = readStateRatePorts(scB);
      } catch (_) { xwBurnRates = null; }
      if (!xwBurnRates && window.__STABLES_XW_LIVE_RATES__ && Number(window.__STABLES_XW_LIVE_RATES__.burn) > 0) {
        xwBurnRates = window.__STABLES_XW_LIVE_RATES__;
      }
    }
    const rateBurnLive = tv81Exclusive ? 1 : (xwBurnRates && Number(xwBurnRates.burn) > 0 ? Number(xwBurnRates.burn) : 1);
    const burnWiniwaOut = rate8Floor(burnAmt * rateBurnLive);

    const runConfirmed = function () {
      _executeBurnXwmTestConfirmed(burnAmt, address, xBal, burnWiniwaOut);
    };

    if (typeof window.openMintBurnConfirm === 'function') {
      window.openMintBurnConfirm({
        op: 'burn-xwiniwa',
        sendText: fmtTokenAmt(burnAmt) + ' xWiniwa',
        receiveText: fmtTokenAmt(burnWiniwaOut) + ' Winiwa',
        feeText: 'Free',
        counterparty: 'Protocol (xWiniwa)',
        address: xwiniwaCounterpartyAddress(),
        network: 'Minima mainnet test channel',
        buttonText: 'Burn ' + fmtTokenAmt(burnAmt) + ' xWiniwa',
        onConfirm: runConfirmed
      });
    } else {
      // D023 law 1 and the app's own commitment surface: an irreversible burn is confirmed by
      // Stables or it does not happen. Handing the decision to a platform dialog is forbidden, and
      // proceeding because no confirmation channel exists is worse - that branch used to burn
      // without asking wherever the WebView provides no JS dialog.
      return showToast('Burn cannot be confirmed right now. Reopen the page and try again.', { tone: 'amber', durationMs: 6000 });
    }
  };

  // burnAmt = xWiniwa returned; winiwaOut = exact Winiwa payout at rateburn (covenant formula).
  async function _executeBurnXwmTestConfirmed(burnAmt, address, xBal, winiwaOut) {
    const handlerFlowStartMs = Date.now();
    if (xwiniwaMintBurnMode === 'covenant' && !mintBurnBeginInFlight()) {
      return showToast('A mint or burn is already in progress. Wait for it to confirm before starting another.', { tone: 'amber', durationMs: 4500 });
    }
    const payoutWiniwa = Number(winiwaOut) > 0 ? Number(winiwaOut) : Math.abs(burnAmt);
    const xwBurnFlowTs = Date.now();
    const xwBurnFlowId = 'FLOW-' + xwBurnFlowTs;
    const burnSpendRowId = 'BURN-XW-SEND-XWINIWA-' + xwBurnFlowTs;
    const burnReceiveRowId = 'BURN-XW-WINIWA-' + xwBurnFlowTs;

    try {
      const appendFn = typeof window.stablesAppendUserActivityRow === 'function' ? window.stablesAppendUserActivityRow : null;
      const upsertFn = typeof window.stablesUpsertUserActivityRows === 'function' ? window.stablesUpsertUserActivityRows : null;
      const fn = upsertFn || appendFn;
      if (fn) {
        const now = new Date();
        const dateText = now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' · ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        const spendRow = {
          id: burnSpendRowId,
          dir: 'out',
          icon: '↗',
          counterparty: 'Protocol (xWiniwa)',
          category: 'xWiniwa',
          title: 'Burning xWiniwa',
          date: dateText,
          amt: -Math.abs(burnAmt),
          ccy: 'xWiniwa',
          address: xwiniwaCounterpartyAddress() || '',
          fee: 0,
          explorerTxId: '',
          pendingTxnId: '',
          status: 'Pending',
          note: 'Preparing covenant transaction',
          directionLabel: 'Outgoing',
          minimaOnChain: true,
          localOrigin: true,
          block: 0,
          ts: xwBurnFlowTs,
          flowId: xwBurnFlowId,
          pendingIncoming: false
        };
        // (single atomic upsert with the receive leg below — no spend-only render beat)
        const receiveRow = {
          id: burnReceiveRowId,
          dir: 'in',
          icon: '↙',
          counterparty: 'Protocol (xWiniwa)',
          category: 'Winiwa',
          title: 'Reclaiming Winiwa',
          date: dateText,
          amt: Math.abs(payoutWiniwa),
          ccy: 'Winiwa',
          address: address || '',
          fee: 0,
          explorerTxId: '',
          pendingTxnId: '',
          status: 'Pending',
          note: 'Preparing covenant transaction',
          directionLabel: 'Incoming',
          minimaOnChain: true,
          localOrigin: true,
          balanceAlreadyApplied: true,
          block: 0,
          ts: xwBurnFlowTs,
          flowId: xwBurnFlowId,
          pendingIncoming: true
        };
        // ONE ROW PER TRADE (founder law): the burn is a single row carrying the burned
        // quantity in its note; the spend leg never renders as its own row.
        void spendRow;
        receiveRow.note = 'For ' + fmtTokenAmt(burnAmt) + ' xWiniwa.';
        if (upsertFn) upsertFn([receiveRow]); else appendFn(receiveRow);
        if (typeof window.renderActivity === 'function') window.renderActivity();
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      }
    } catch (_) { /* ignore */ }

    const baseXwm = stablesDisplayedBalanceForOptimistic('xWiniwa');
    const baseWiniwa = stablesDisplayedBalanceForOptimistic('Winiwa');
    if (typeof WALLET_XWM !== 'undefined') WALLET_XWM = Math.max(0, baseXwm - burnAmt);
    if (typeof WALLET_WINIWA !== 'undefined') WALLET_WINIWA = baseWiniwa + payoutWiniwa;
    try { stablesSetOptimisticBalance('xWiniwa', Math.max(0, baseXwm - burnAmt), 'out'); stablesSetOptimisticBalance('Winiwa', baseWiniwa + payoutWiniwa, 'in'); } catch (_) { /* ignore */ }
    clearTestTokenBalanceDetails(['Winiwa', 'xWiniwa']);
    if (typeof saveWalletVaultState === 'function') saveWalletVaultState();
    if (typeof updateGlobalUI === 'function') updateGlobalUI();
    if (typeof calcXwmBurn === 'function') calcXwmBurn();
    if (typeof navigate === 'function') navigate('wallet');

    try {
      if (typeof window.stablesShowTxProgressModal === 'function') window.stablesShowTxProgressModal({
        title: 'Burn submitted', status: 'xWiniwa burning.',
        amount: fmtTokenAmt(burnAmt) + ' xWiniwa → Winiwa', address: 'Protocol (xWiniwa)', building: true
      });
    } catch (_) {}
      try { if (typeof window.stablesFlashBalanceUpdate === 'function') window.stablesFlashBalanceUpdate(['xWiniwa','Winiwa']); } catch (_) {}
    let posted;
    try {
      posted = await window.__STABLES_TEST_XWINIWA_COVENANT__(1, burnAmt);
    } catch (e) {
      const errMsg = (e && e.message) || 'xWiniwa covenant burn failed';
      const permBurn = (e && e.needsConfirmation) ? stablesPermissionRowText('xWiniwa burn') : null;
      try {
        if (typeof window.stablesUpsertUserActivityRows === 'function') {
          window.stablesUpsertUserActivityRows([
            { id: burnReceiveRowId, title: permBurn ? permBurn.title : 'xWiniwa burn failed', status: permBurn ? permBurn.status : 'Failed', note: permBurn ? permBurn.note : errMsg, awaitingApproval: !!permBurn, pendingIncoming: false, balanceAlreadyApplied: true }
          ]);
        }
        if (typeof WALLET_XWM !== 'undefined') WALLET_XWM = baseXwm;
        if (typeof WALLET_WINIWA !== 'undefined') WALLET_WINIWA = baseWiniwa;
        try { stablesClearOptimisticBalance(['Winiwa', 'xWiniwa']); } catch (_) { /* ignore */ }
        clearTestTokenBalanceDetails(['Winiwa', 'xWiniwa']);
        if (typeof saveWalletVaultState === 'function') saveWalletVaultState();
        if (typeof updateGlobalUI === 'function') updateGlobalUI();
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        if (typeof window.renderActivity === 'function') window.renderActivity();
        if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
      } catch (_) {}
      mintBurnEndInFlight();
      return showToast(errMsg, { tone: 'amber', durationMs: 8000 });
    }
    if (posted && posted.txpow && typeof window.stablesIngestLiveTxpow === 'function') {
      try { window.stablesIngestLiveTxpow(posted.txpow); } catch (_) {}
    }
    try {
      const txid = (posted && posted.explorerTxId) || '';
      const ptn = (posted && posted.pendingTxnId) || '';
      if (typeof window.stablesUpsertUserActivityRows === 'function') {
        window.stablesUpsertUserActivityRows([
          {
            id: burnReceiveRowId,
            title: 'Reclaiming Winiwa',
            explorerTxId: txid,
            pendingTxnId: ptn,
            status: txid ? 'On-chain' : ((txid || ptn) ? 'Broadcasted' : 'Pending'),
            note: (txid || ptn) ? 'Accepted by node. Confirming on-chain.' : 'Submitted to node. Waiting for transaction id.'
          }
        ]);
      }
      if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      if (typeof window.renderActivity === 'function') window.renderActivity();
      if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
      try {
        if (typeof window.stablesShowTxProgressModal === 'function') window.stablesShowTxProgressModal({
          title: 'Burn submitted', status: 'xWiniwa burning.',
          amount: fmtTokenAmt(burnAmt) + ' xWiniwa → Winiwa', address: 'Protocol (xWiniwa)',
          rowId: burnReceiveRowId, txid: txid, pendingTxnId: ptn
        });
      } catch (_) {}
      setTimeout(function () {
        (async function () {
          let minedTxid = '';
          try { minedTxid = await pollMinedXwiniwaTxpow(1, burnAmt, address, ptn, handlerFlowStartMs); } catch (_) { minedTxid = ''; }
          await linkMinedTxpowToActivityRows([burnSpendRowId, burnReceiveRowId], ptn, minedTxid || txid);
          if (minedTxid || txid) await forceConfirmedCovenantBalanceRefresh('xwiniwa-burn-confirmed');
        })().catch(function () { /* ignore */ }).finally(function () { mintBurnEndInFlight(); });
      }, 1500);
      if (typeof window.stablesRefreshPendingSettlement === 'function') {
        setTimeout(function () { try { window.stablesRefreshPendingSettlement(); } catch (_) {} }, 1500);
      }
    } catch (_) {}
    const burnInputEl = document.getElementById('xwmBurnAmt');
    if (burnInputEl) burnInputEl.value = '';
    if (typeof calcXwmBurn === 'function') calcXwmBurn();
    await sleep(8000);
    await window.stablesRefreshLiveNodeBalances({ reason: 'user-action', attempts: 6, preserveWiniwa: false });
    setTimeout(function () {
      try {
        if (typeof window.stablesSyncNodeTransactions === 'function') window.stablesSyncNodeTransactions(true);
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
        if (typeof window.renderActivity === 'function') window.renderActivity();
      } catch (_) {}
    }, 3000);
  }

  function patchLivePull() {
    const origPull = window.stablesPullBlockAndBalanceFromMds;
    if (typeof origPull === 'function' && !window.__STABLES_TEST_PULL_PATCHED__) {
      window.__STABLES_TEST_PULL_PATCHED__ = true;
      window.stablesPullBlockAndBalanceFromMds = function () {
        origPull();
        // Fast test token balances for instant display (no reset, immediate like Minima)
        try { window.stablesRefreshLiveNodeBalances({ attempts: 1 }); } catch (_) {}
        // Kick tx history so recent activity populates without delay
        try {
          if (typeof window.stablesSyncNodeTransactions === 'function' && typeof window.MDS !== 'undefined' && window.MDS && window.MDS.cmd) {
            window.stablesSyncNodeTransactions(true);
          }
        } catch (_) {}
        try { if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity(); } catch (_) {}
      };
    }
  }

  function scrubStaleTestVaultUsdW() {
    try {
      if (localStorage.getItem('stables_test_wallet_v1')) return;
      const raw = localStorage.getItem('stables_demo_minima_real_wallet_v1');
      if (!raw) return;
      const j = JSON.parse(raw);
      const usdw = Number(j && j.stables && j.stables.USDw);
      if (!Number.isFinite(usdw) || usdw < 100000) return;
      j.stables.USDw = 0;
      localStorage.setItem('stables_test_wallet_v1', JSON.stringify(j));
      if (typeof WALLET_STABLE_AMTS !== 'undefined') WALLET_STABLE_AMTS.USDw = 0;
      if (typeof WALLET_WABLES !== 'undefined' && typeof computeWalletWablesUsdTotal === 'function') {
        WALLET_WABLES = computeWalletWablesUsdTotal();
      }
      if (typeof updateGlobalUI === 'function') updateGlobalUI();
    } catch (_) { /* ignore */ }
  }

  function bootTestChannel() {
    scrubStaleTestVaultUsdW();
    syncFaucetUiLabels();
    patchLivePull();
    // Force the full v1.30+ tx progress display (x/y, settling, pending indicators) on boot for test
    // to ensure the advanced on-chain behavior is active and not masked by any old demo paths in the shell.
    setTimeout(function () {
      try {
        if (typeof window.stablesRefreshLiveNodeBalances === 'function') {
          window.stablesRefreshLiveNodeBalances({ reason: 'boot', attempts: 1 });
        }
      } catch (_) {}
      try {
        if (typeof window.stablesSyncNodeTransactions === 'function' && typeof window.MDS !== 'undefined' && window.MDS && window.MDS.cmd) {
          window.stablesSyncNodeTransactions(true);
        }
      } catch (_) {}
      try { if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity(); } catch (_) {}
      try { if (typeof window.updateGlobalUI === 'function') window.updateGlobalUI(); } catch (_) {}
      try { if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator(); } catch (_) {}
      // Readiness subjects register with the shared engine instead of each arranging its own boot
      // load. The engine drives all of them at boot, on first node connection, on page navigation
      // and on a persistent sweep, so the faucet cannot end up with four drivers while the vault
      // has one. `isReady` is the subject's own honest answer, never a guess made out here.
      try {
        const R = window.stablesReadiness;
        if (R && typeof R.register === 'function') {
          R.register({
            key: 'wallet',
            label: 'Wallet balance proof',
            refresh: function () {
              if (typeof window.stablesRefreshLiveNodeBalances !== 'function') return null;
              return window.stablesRefreshLiveNodeBalances({ reason: 'readiness', attempts: 1 });
            },
            isReady: function () { return (window.__STABLES_WALLET_PROOF_STATE__ || {}).state === 'ready'; }
          });
          R.register({
            key: 'faucet',
            label: 'Faucet pool level',
            refresh: function () {
              if (typeof window.stablesRefreshFaucetLevel !== 'function') return null;
              return window.stablesRefreshFaucetLevel();
            },
            isReady: function () { return window.__STABLES_FAUCET_LEVEL_READY__ === true; }
          });
          R.register({
            key: 'vault',
            label: 'xWiniwa vault proof',
            refresh: function () {
              if (typeof window.stablesRefreshXwiniwaReserveLevel !== 'function') return null;
              return window.stablesRefreshXwiniwaReserveLevel();
            },
            isReady: function () { return (window.__STABLES_XWINIWA_VAULT_PROOF_STATE__ || {}).state === 'ready'; }
          });
          R.arm();
        }
      } catch (_) { /* a readiness driver must never break boot */ }
      // Proactively read + verify the on-chain state beacon on boot. This tracks the beacon covenant
      // and warms tv81ReadBeacon's cache so the faucet fallback is instant, and exercises the
      // light-node CAPTURE path (a fresh node retro-surfaces the in-window beacon coin once it tracks
      // the address). The distinctive console line surfaces the outcome in logcat (WebView console →
      // "StablesWeb") so beacon capture/verification is confirmable on the phone. Never blocks boot.
      try {
        if (typeof tv81ReadBeacon === 'function') {
          tv81ReadBeacon().then(function (b) {
            const status = b
              ? { available: !!b.available, verified: !!b.verified, coinId: b.coinId || null, schema: (b.schema != null ? b.schema : null), faucetLevel: (b.leaves && b.leaves.faucet && b.leaves.faucet.level) || null }
              : { available: false, verified: false };
            try { window.__STABLES_BEACON_STATUS__ = Object.assign({ at: Date.now() }, status); } catch (_) {}
            try { console.log('[STABLES-BEACON] ' + JSON.stringify(status)); } catch (_) {}
          }).catch(function (e) { try { console.log('[STABLES-BEACON] error ' + ((e && e.message) || e)); } catch (_) {} });
        }
      } catch (_) {}
      // Track the order-book covenant at BOOT, not first Trade-tab open (common-book design,
      // founder-approved 2026-07-21). trackall only captures orders arriving AFTER tracking, so
      // every hour untracked is an hour of the shared book this node can never natively hold;
      // tracking from boot makes each install a complete book-holder from install day onward
      // (and retro-surfaces the in-window last ~15h immediately). Never blocks boot.
      // The freshly booted embedded node's command bridge is congested for the first minutes
      // (proven: DT2 trade builds and the first v63 boot-tracking newscript both timed out), so
      // the whole tracking->gap-fill chain retries with a backoff instead of dying on attempt 1.
      try {
        const bookBootAttempt = function (attempt) {
          tv81AppRegistry().then(function (registry) {
            return tv81DirectEnsureTracked(registry).then(function () {
              return tv81EnsureBookRegistryTracked(registry);
            });
          }).then(function () {
            try { window.__STABLES_BOOK_TRACKING__ = { at: Date.now(), tracked: true, attempt: attempt }; } catch (_) {}
            try { console.log('[STABLES-BOOK] order covenant tracked at boot (attempt ' + attempt + ')'); } catch (_) {}
            setTimeout(function () {
              tv81BookGapFill().then(function (s) {
                if (s && (s.error || (s.sources > 0 && s.reachable === 0))) setTimeout(function () { tv81BookGapFill(); }, 120000);
              }).catch(function () { /* logged inside */ });
            }, 45000);
          }).catch(function (e) {
            try { window.__STABLES_BOOK_TRACKING__ = { at: Date.now(), tracked: false, attempt: attempt, error: String((e && e.message) || e) }; } catch (_) {}
            try { console.log('[STABLES-BOOK] boot tracking attempt ' + attempt + ' failed: ' + ((e && e.message) || e)); } catch (_) {}
            if (attempt < 4) setTimeout(function () { bookBootAttempt(attempt + 1); }, 90000 * attempt);
          });
        };
        bookBootAttempt(1);
      } catch (_) {}
      // ROLLING ANCHOR R1 (dark): track the head/page covenants at boot so this node
      // forward-captures every future snapshot, then run one validation pass and report to
      // logcat + window.__STABLES_ANCHOR__. Observation only — no import, no book merge, no UI.
      // Same congestion-tolerant retry shape as book tracking (the boot bridge is busy early).
      try {
        const anchorBootAttempt = function (attempt) {
          tv81AppRegistry().then(function (registry) {
            return tv81AnchorEnsureTracked(registry);
          }).then(function (tracked) {
            if (!tracked) return;
            try { console.log('[STABLES-ANCHOR] covenants tracked at boot (attempt ' + attempt + ')'); } catch (_) {}
            setTimeout(function () {
              // R2: full pass — validate newest snapshot, import missing proofs, merge coin ids
              // into the book reader's held-order list, surface the one status line.
              tv81AnchorGapFill().then(function () {
                try { tv81AnchorStatusLine(); } catch (_) {}
                try { if (typeof tv81RefreshOrderBookPanel === 'function') tv81RefreshOrderBookPanel().catch(function () {}); } catch (_) {}
              }).catch(function (e) {
                try { console.log('[STABLES-ANCHOR] pass error: ' + ((e && e.message) || e)); } catch (_) {}
              });
              // periodic re-pass well inside the 600-block cadence; cheap when nothing changed.
              window.stablesRepeatWhileVisible('anchor-gapfill', function () {
                tv81AnchorGapFill().then(function () {
                  try { tv81AnchorStatusLine(); } catch (_) {}
                  // R4: opt-in publisher heartbeat (default OFF). Publish a fresh snapshot only
                  // when no validated head exists or the newest is past the cadence; the
                  // publisher itself refuses honestly without live orders or a funded wallet.
                  try {
                    if (tv81AnchorPublishEnabled()) {
                      const s = window.__STABLES_ANCHOR__ || {};
                      if (s.state !== 'READY_WITH_COVERAGE' || (Number(s.headAge) || 0) > 600) tv81AnchorPublishSnapshot();
                    }
                  } catch (_) {}
                }).catch(function () {});
              }, 1800000);
            }, 60000);
          }).catch(function (e) {
            try { console.log('[STABLES-ANCHOR] boot attempt ' + attempt + ' failed: ' + ((e && e.message) || e)); } catch (_) {}
            if (attempt < 4) setTimeout(function () { anchorBootAttempt(attempt + 1); }, 90000 * attempt);
          });
        };
        anchorBootAttempt(1);
        // R4: reflect the persisted publish preference on the settings toggle at boot.
        try { const pt = document.getElementById('tv81PublishToggle'); if (pt) pt.checked = tv81AnchorPublishEnabled(); } catch (_) {}
      } catch (_) {}
      try { prewarmMintBurnCovenant('boot'); } catch (_) {}
    }, 150);
    // Older standalone builds could persist txnpost's provisional outer txpowid. Resume by the
    // immutable transactionid after the activity store and embedded command bridge have started.
    setTimeout(function () { try { resumePendingFaucetSettlement(); } catch (_) {} }, 3500);
    setTimeout(function () { try { prewarmMintBurnCovenant('idle'); } catch (_) {} }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootTestChannel);
  } else {
    bootTestChannel();
  }
})();
