(function () {
  const CFG = window.STABLES_CONFIG || {};
  const DEMO_REAL = !!CFG.DEMO_REAL_ONCHAIN_WALLET;
  const USER_ACTIVITY_STORAGE_KEY = CFG.USER_ACTIVITY_STORAGE_KEY || 'stables_demo_user_activity_v1';
  const ACTIVITY_PAGE_SIZE = CFG.ACTIVITY_PAGE_SIZE || 25;
  const CONTACT_NOTES_KEY = CFG.CONTACT_NOTES_KEY || 'stables_contact_notes_v1';
  const SUSPICIOUS_TX_KEY = CFG.SUSPICIOUS_TX_KEY || 'stables_suspicious_tx_ids_v1';
  const HIDDEN_TX_KEY = CFG.HIDDEN_TX_KEY || 'stables_hidden_tx_ids_v1';
  const SOFT_HIDDEN_TX_KEY = CFG.SOFT_HIDDEN_TX_KEY || 'stables_soft_hidden_tx_ids_v1';
  const HIDDEN_SHOPS_KEY = CFG.HIDDEN_SHOPS_KEY || 'stables_hidden_shop_names_v1';

  // ── Block-confirmation counter ───────────────────────────────────────────────
  // Each on-chain MINIMA tx shows how many blocks deep it is (live counter), out of a
  // user-settable target (default 3). 0 = still in the mempool / awaiting the first block.
  const CONFIRM_TARGET_KEY = CFG.CONFIRM_TARGET_KEY || 'stables_confirm_target_v1';
  let CONFIRM_TARGET = (function () {
    try { const v = parseInt(localStorage.getItem(CONFIRM_TARGET_KEY), 10); return (Number.isFinite(v) && v >= 1 && v <= 30) ? v : 3; }
    catch (_) { return 3; }
  })();
  window.stablesGetConfirmTarget = function () { return CONFIRM_TARGET; };
  window.stablesSetConfirmTarget = function (n) {
    const v = Math.max(1, Math.min(30, parseInt(n, 10) || 3));
    CONFIRM_TARGET = v;
    try { localStorage.setItem(CONFIRM_TARGET_KEY, String(v)); } catch (_) { /* ignore */ }
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    return v;
  };
  // Confirmations for a tx row: tip - block + 1 (1 = mined in the latest block); 0 = pending.
  function txConfirmations(x) {
    if (!x || !x.minimaOnChain) return null;
    const L = window.__STABLES_LIVE_NODE;
    const tip = Number((L && L.block != null) ? L.block : 0);
    const b = Number(x.block || 0);
    if (!b || !tip || tip < b) return 0;
    return Math.max(0, tip - b + 1);
  }
  // Compact "x/target" confirmation line shown under the amount on each on-chain tx.
  // Capped at the target (so a deep tx reads e.g. 3/3, muted); 0/target while still pending.
  function txConfirmLine(x) {
    const c = txConfirmations(x);
    if (c === null) return '';
    const t = CONFIRM_TARGET;
    const shown = Math.min(c, t);
    const state = c >= t ? 'done' : (c === 0 ? 'pending' : 'confirming');
    return '<div class="tx-conf-amt tx-conf--' + state + '">' + shown + '/' + t + '</div>';
  }
  window.stablesTxConfirmations = txConfirmations;
  (function syncConfirmTargetInput() {
    const apply = function () { const el = document.getElementById('confirmTargetInput'); if (el) el.value = String(CONFIRM_TARGET); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  })();
  const TX_NOTES_KEY = CFG.TX_NOTES_KEY || 'stables_tx_notes_v1';
  const MERCHANT_RATINGS_KEY = CFG.MERCHANT_RATINGS_KEY || 'stables_merchant_ratings_v1';
  const CONTACT_FAVORITES_KEY = CFG.CONTACT_FAVORITES_KEY || 'stables_contact_favorites_v1';
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
        date: dateText, amt, ccy, address: cp.address, fee: Number((Math.max(0.02, Math.abs(amt) * 0.0001)).toFixed(2)),
        explorerTxId: toDemoTradeId(`TX-${String(100001 + i)}`),
        status: i % 19 === 0 ? 'Pending' : 'Confirmed', note: i % 5 === 0 ? 'Monthly recurring flow' : 'Demo payment',
        directionLabel: dir === 'in' ? 'Incoming' : 'Outgoing'
      });
    }
  }

  let USER_ACTIVITY = [];
  let _txSyncInFlight = false; // true while a node history sync runs (drives the loading indicator)
  function loadUserActivityFromStorage() {
    USER_ACTIVITY = [];
    if (!DEMO_REAL) return;
    try {
      const j = JSON.parse(localStorage.getItem(USER_ACTIVITY_STORAGE_KEY) || '[]');
      if (Array.isArray(j)) USER_ACTIVITY = j;
    } catch (_) {
      USER_ACTIVITY = [];
    }
  }
  function persistUserActivityToStorage() {
    if (!DEMO_REAL) return;
    try {
      localStorage.setItem(USER_ACTIVITY_STORAGE_KEY, JSON.stringify(USER_ACTIVITY));
    } catch (_) { /* ignore */ }
  }
  loadUserActivityFromStorage();

  window.stablesAppendUserActivityRow = function (row) {
    if (!DEMO_REAL || !row || !row.id) return;
    USER_ACTIVITY.unshift(row);
    if (USER_ACTIVITY.length > 200) USER_ACTIVITY.length = 200;
    persistUserActivityToStorage();
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
  };
  window.stablesReloadUserActivityFromStorage = loadUserActivityFromStorage;

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
    return DEMO_REAL ? USER_ACTIVITY : DEMO_ACTIVITY;
  }

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
  function persistMerchantRatings() { localStorage.setItem(MERCHANT_RATINGS_KEY, JSON.stringify(merchantRatings)); }
  function getTxById(id) { return activitySource().find(x => x.id === id); }
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
    const id = encodeURIComponent(String(tx?.explorerTxId || tx?.id || ''));
    return `${base}${id}`;
  }
  function getTxNote(tx) {
    if (!tx || !tx.id) return '';
    const saved = String(txNotes[tx.id] || '').trim();
    if (saved) return saved;
    return String(tx.note || '').trim();
  }

  function upsertUserActivityRows(rows) {
    if (!DEMO_REAL || !Array.isArray(rows) || !rows.length) return 0;
    const byId = new Map(USER_ACTIVITY.map(row => [String(row.id || ''), row]));
    let changed = 0;
    rows.forEach(row => {
      if (!row || !row.id) return;
      const id = String(row.id);
      if (byId.has(id)) {
        Object.assign(byId.get(id), row);
      } else {
        USER_ACTIVITY.unshift(row);
        byId.set(id, row);
      }
      changed++;
    });
    if (USER_ACTIVITY.length > 500) USER_ACTIVITY.length = 500;
    persistUserActivityToStorage();
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
    if (typeof window.stablesRenderPendingIncomingIndicator === 'function') window.stablesRenderPendingIncomingIndicator();
    return changed;
  }
  window.stablesUpsertUserActivityRows = upsertUserActivityRows;

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
        if (typeof window.MDS === 'undefined' || !window.MDS || !window.MDS.cmd) {
          resolve(null);
          return;
        }
        window.MDS.cmd(command, function (resp) { resolve(resp); });
      } catch (_) { resolve(null); }
    });
  }

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

  function tokenLabelFromRow(row) {
    if (!row || typeof row !== 'object') return 'MINIMA';
    const tokenId = String(row.tokenid != null ? row.tokenid : (row.tokenId != null ? row.tokenId : '')).toLowerCase();
    if (tokenId === '0x00' || tokenId === '0x0' || tokenId === '0') return 'MINIMA';
    const raw = String(row.token || row.tokenname || row.name || row.ticker || row.currency || tokenId || 'Token').trim();
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

  function txpowWrapperToActivity(wrapper) {
    if (!wrapper || typeof wrapper !== 'object') return null;
    const txpow = (wrapper.txpow && wrapper.txpow.txpowid) ? wrapper.txpow : wrapper;
    const relevant = (wrapper.txpow && wrapper.relevant) ? wrapper.relevant : {};
    const id = String(txpow.txpowid || '').trim();
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
      const relIn = minimaCoinsOnly(Array.isArray(relevant.inputs) ? relevant.inputs : []);
      const relOut = minimaCoinsOnly(Array.isArray(relevant.outputs) ? relevant.outputs : []);
      if (relIn.length === 0 && relOut.length === 0 && !weSigned) return null;
      const inSum = sumMinimaCoins(relIn);
      const outSum = sumMinimaCoins(relOut);
      
      if (weSigned) {
        dir = 'out';
        const trueInSum = inSum > 0 ? inSum : sumMinimaCoins(minimaCoinsOnly(allInputs));
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
      const recipients = minimaCoinsOnly(allOutputs).filter(c => c.address && !ourInAddrs.has(String(c.address).trim()) && !ourOutAddrs.has(String(c.address).trim()));
      if (recipients.length > 0) counterpartyAddr = String(recipients[0].address).trim();
    } else if (dir === 'in') {
      const senders = minimaCoinsOnly(allInputs);
      if (senders.length > 0 && senders[0].address) counterpartyAddr = String(senders[0].address).trim();
    }

    if (!dir) return null;
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
    return {
      id: 'NODE-' + id,
      dir,
      icon: dir === 'out' ? String.fromCharCode(8599) : String.fromCharCode(8601),
      counterparty,
      category: 'MINIMA',
      title: (dir === 'out' ? 'Sent ' : 'Received ') + 'MINIMA',
      date: dateText,
      amt: dir === 'out' ? -Math.abs(amount) : Math.abs(amount),
      ccy: 'MINIMA',
      address: counterpartyAddr,
      fee: 0,
      explorerTxId: id,
      status: 'Confirmed',
      note: '',
      directionLabel: dir === 'out' ? 'Outgoing' : 'Incoming',
      minimaOnChain: true,
      block: (header && header.block != null) ? (Number(String(header.block).replace(/,/g, '')) || 0) : 0,
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
      if (s.length > 6) addresses.add(s);
    }
    function addCoin(c) {
      if (!c) return;
      const h = c.address    ? String(c.address).trim().toLowerCase()    : null;
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

    // ── Source 1b: scripts  -  all custom scripts tracked by the wallet ──
    try {
      const sr = await mdsCommand('scripts');
      if (mdsOk(sr)) {
        const sp = coerceMdsPayloadLocal(sr.response);
        const slist = Array.isArray(sp) ? sp : Array.isArray(sp && sp.scripts) ? sp.scripts : [];
        slist.forEach(s => {
          if (!s) return;
          ['address', 'mxaddress', 'miniaddress'].forEach(f => addAddr(s[f]));
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

    // ── Source 3: coinid lookup for every input in txpowList ──
    // `coins coinid:X` returns the coin record even for spent coins on a full Minima node,
    // letting us confirm inputs that no longer appear in the UTXO set.
    if (Array.isArray(txpowList)) {
      const inputCids = new Set();
      txpowList.forEach(tp => {
        if (!tp || !tp.body) return;
        const txn = tp.body.txn || tp.body.transaction || {};
        minimaCoinsOnly(Array.isArray(txn.inputs) ? txn.inputs : []).forEach(c => {
          if (c && c.coinid) inputCids.add(String(c.coinid).trim());
        });
      });
      for (const cid of inputCids) {
        if (ownedCoinIds.has(cid.toLowerCase())) continue;
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
              if ((h && addresses.has(h)) || (m && addresses.has(m)) || (n && addresses.has(n))) {
                ownedCoinIds.add(cid.toLowerCase());
              }
            }
          }
        } catch (_) {}
      }
    }

    function isOurCoin(c) {
      if (!c) return false;
      if (c.coinid && ownedCoinIds.has(String(c.coinid).trim().toLowerCase())) return true;
      return ['address', 'mxaddress', 'miniaddress'].some(f => {
        const v = c[f];
        return v && addresses.has(String(v).trim().toLowerCase());
      });
    }

    return { addresses, ownedCoinIds, publicKeys, isOurCoin };
  }

  window.stablesSyncNodeTransactions = async function (silent) {
    const status = document.getElementById('nodeTxSyncStatus');
    if (!silent && status) status.textContent = 'Syncing node balances and history...';
    if (typeof window.MDS === 'undefined' || !window.MDS || !window.MDS.cmd) {
      if (!silent && status) status.textContent = 'Node history sync needs MinimaOS / MDS. MiniMask exposes balance and send, not full node history here.';
      if (!silent && typeof window.showToast === 'function') window.showToast('Open from MinimaOS to sync node history.', { tone: 'amber', durationMs: 4200 });
      return;
    }

    // If this is a different wallet than the one whose activity is stored, clear it first so
    // we never show another wallet's transactions.
    try { await reconcileActivityOwnerForCurrentWallet(); } catch (_) { /* ignore */ }

    // Show the loading indicator on empty lists while we pull node history.
    _txSyncInFlight = true;
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();

    const tokenMap = {};
    try {
      const balResp = await mdsCommand('balance');
      const bal = mdsOk(balResp) ? coerceMdsPayloadLocal(balResp.response) : null;
      const rows = Array.isArray(bal) ? bal : (bal && Array.isArray(bal.balance) ? bal.balance : (bal && Array.isArray(bal.tokens) ? bal.tokens : []));
      rows.forEach(row => {
        const id = String(row && (row.tokenid != null ? row.tokenid : row.tokenId != null ? row.tokenId : '')).toLowerCase();
        if (id) tokenMap[id] = tokenLabelFromRow(row);
      });
      tokenMap['0x00'] = 'MINIMA';
      tokenMap['0x0'] = 'MINIMA';
      tokenMap['0'] = 'MINIMA';
      tokenMap['0x0000000000000000000000000000000000000000000000000000000000000000'] = 'MINIMA';
    } catch (_) { /* ignore */ }

    const commands = ['history offset:0', 'history'];
    let imported = 0;
    let sawHistory = false;
    let diagInfo = '';
    for (const cmd of commands) {
      const resp = await mdsCommand(cmd);
      if (!mdsOk(resp)) continue;
      sawHistory = true;
      const payload = coerceMdsPayloadLocal(resp.response);
      let rows = [];

      // ── Strategy A: details array ──
      // Minima nodes may include a pre-classified `details` array alongside `txpows`.
      // Each item can be { txpow, relevant:{inputs,outputs} } or similar.
      const detailsArr = Array.isArray(payload && payload.details) ? payload.details : null;
      if (detailsArr && detailsArr.length) {
        diagInfo = 'src=details n=' + detailsArr.length
          + ' keys=' + Object.keys(detailsArr[0] || {}).join(',');
        rows = detailsArr.map(d => {
          if (!d) return null;
          const txpow = (d.txpow && d.txpow.txpowid) ? d.txpow : (d.txpowid ? d : null);
          if (!txpow) return null;
          const rel = d.relevant || d.coins || d.wallet || {};
          return txpowWrapperToActivity({ txpow, relevant: rel });
        }).filter(Boolean);
      }

      // ── Strategy B: relevant map keyed by txpowid ──
      // Some Minima versions return relevant:{txpowid:{inputs,outputs},...}
      if (!rows.length) {
        const relMap = (payload && payload.relevant && typeof payload.relevant === 'object'
          && !Array.isArray(payload.relevant)) ? payload.relevant : null;
        const txpowListB = Array.isArray(payload) ? payload
          : Array.isArray(payload && payload.txpows) ? payload.txpows
          : Array.isArray(payload && payload.transactions) ? payload.transactions
          : Array.isArray(payload && payload.history) ? payload.history
          : null;
        if (relMap && txpowListB && Object.keys(relMap).length > 0) {
          diagInfo = 'src=relMap n=' + Object.keys(relMap).length;
          rows = txpowListB.map(txpow => {
            const id = String(txpow.txpowid || '').toLowerCase();
            const rel = relMap[txpow.txpowid] || relMap[id] || {};
            return txpowWrapperToActivity({ txpow, relevant: rel });
          }).filter(Boolean);
        }
      }

      // ── Strategy C: wallet-context address + coinid matching ──
      if (!rows.length) {
        const txpowList = Array.isArray(payload) ? payload
          : Array.isArray(payload && payload.txpows) ? payload.txpows
          : Array.isArray(payload && payload.transactions) ? payload.transactions
          : Array.isArray(payload && payload.history) ? payload.history
          : null;
        if (!txpowList || !txpowList.length) continue;

        const first = txpowList[0];
        const isBareTxpow = first && first.txpowid && !first.txpow;

        if (isBareTxpow) {
          const walletCtx = await buildWalletContext(txpowList);
          // Diagnostic: show what keys/coins returned + first input coin's address fields
          const firstInput = (() => {
            for (const tp of txpowList) {
              const txn = (tp.body && (tp.body.txn || tp.body.transaction)) || {};
              const ins = minimaCoinsOnly(Array.isArray(txn.inputs) ? txn.inputs : []);
              if (ins[0]) return ins[0];
            }
            return null;
          })();
          diagInfo = 'src=walletCtx addrs=' + walletCtx.addresses.size
            + ' coinIds=' + walletCtx.ownedCoinIds.size
            + (firstInput
              ? ' in.addr=' + (firstInput.address || '').slice(0, 12)
                + ' in.mx=' + (firstInput.mxaddress || '').slice(0, 8)
              : ' no-inputs');
          rows = txpowList.map(txpow => {
            if (!txpow || !txpow.txpowid) return null;
            const txn = (txpow.body && (txpow.body.txn || txpow.body.transaction)) || {};
            const allInputs = Array.isArray(txn.inputs) ? txn.inputs : [];
            const allOutputs = Array.isArray(txn.outputs) ? txn.outputs : [];
            if (walletCtx.addresses.size > 0 || walletCtx.ownedCoinIds.size > 0 || walletCtx.publicKeys.size > 0) {
              const witness = txpow.body && txpow.body.witness;
              const sigs = witness && Array.isArray(witness.signatures) ? witness.signatures : [];
              
              let usedKeys = [];
              sigs.forEach(s => {
                if (s && s.publickey) usedKeys.push(s.publickey);
                if (s && s.rootkey) usedKeys.push(s.rootkey);
                if (s && Array.isArray(s.signatures)) {
                  s.signatures.forEach(ss => {
                    if (ss && ss.publickey) usedKeys.push(ss.publickey);
                    if (ss && ss.rootkey) usedKeys.push(ss.rootkey);
                  });
                }
              });
              const weSigned = usedKeys.some(pk => pk && walletCtx.publicKeys.has(String(pk).trim().toLowerCase()));

              const relIn = minimaCoinsOnly(allInputs).filter(c => walletCtx.isOurCoin(c));
              const relOut = minimaCoinsOnly(allOutputs).filter(c => walletCtx.isOurCoin(c));
              if (weSigned || relIn.length > 0 || relOut.length > 0) {
                return txpowWrapperToActivity({ txpow, relevant: { inputs: relIn, outputs: relOut, weSigned } });
              }
            }
            return null;
          }).filter(Boolean);
        } else {
          diagInfo = 'src=wrappers';
          rows = txpowList.map(w => txpowWrapperToActivity(w)).filter(Boolean);
        }
      }

      if (rows.length) {
        imported += upsertUserActivityRows(rows);
        break;
      }
    }

    // Sync finished: clear the loading indicator (resolve to rows or the empty state).
    _txSyncInFlight = false;
    if (typeof window.renderActivity === 'function') window.renderActivity();
    if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();

    if (!silent) {
      if (status) {
        status.textContent = imported
          ? `Imported ${imported} tx. [${diagInfo}]`
          : (sawHistory
            ? ('No rows matched. [' + diagInfo + ']')
            : 'Node did not expose history to the MiniDapp.');
      }
      if (typeof window.showToast === 'function') {
        window.showToast(imported ? `Synced ${imported} node transaction row${imported === 1 ? '' : 's'}.` : 'No node history rows imported.', { durationMs: 4200 });
      }
    }
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
    const add = (v) => { if (v) { const s = String(v).trim().toLowerCase(); if (s.length > 6) addrs.add(s); } };
    try {
      const kr = await mdsCommand('keys');
      if (mdsOk(kr)) {
        const kp = coerceMdsPayloadLocal(kr.response);
        const klist = Array.isArray(kp) ? kp : Array.isArray(kp && kp.keys) ? kp.keys : [];
        klist.forEach(k => { if (k) ['address', 'mxaddress', 'miniaddress'].forEach(f => add(k[f])); });
      }
    } catch (_) { /* ignore */ }
    try {
      for (const cmd of ['coins relevant:true', 'coins relevant:true tokenid:0x00']) {
        const cr = await mdsCommand(cmd);
        if (!mdsOk(cr)) continue;
        const cp = coerceMdsPayloadLocal(cr.response);
        const coins = Array.isArray(cp) ? cp : Array.isArray(cp && cp.coins) ? cp.coins : [];
        coins.forEach(c => { if (c) ['address', 'mxaddress', 'miniaddress'].forEach(f => add(c[f])); });
        if (addrs.size > 0) break;
      }
    } catch (_) { /* ignore */ }
    if (addrs.size > 0) { _walletAddrCache = addrs; _walletAddrCacheTs = now; }
    return _walletAddrCache || addrs;
  }
  window.stablesInvalidateWalletAddrCache = function () { _walletAddrCache = null; _walletAddrCacheTs = 0; };

  const _seenIncomingTxids = new Set();

  // Wallet-identity guard: node-derived activity is persisted in localStorage, so a different
  // wallet on the same MiniDapp install must not show the previous wallet's transactions.
  // We remember a sample of the wallet's own addresses; if a later sync sees an address set with
  // NO overlap (a different seed/wallet), clear the stored activity before importing the new one.
  const WALLET_OWNER_KEY = (window.STABLES_CONFIG || {}).WALLET_OWNER_KEY || 'stables_demo_wallet_owner_v1';
  async function reconcileActivityOwnerForCurrentWallet() {
    if (!DEMO_REAL) return;
    let set;
    try { set = await ensureWalletAddrCache(true); } catch (_) { set = null; }
    if (!set || set.size === 0) return; // can't identify the wallet yet; never wipe blindly
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem(WALLET_OWNER_KEY) || '[]'); } catch (_) { stored = []; }
    const storedSet = new Set(Array.isArray(stored) ? stored : []);
    if (storedSet.size > 0) {
      let overlap = false;
      for (const a of set) { if (storedSet.has(a)) { overlap = true; break; } }
      if (!overlap) {
        // Different wallet: drop the previous wallet's transactions and pending state.
        USER_ACTIVITY = [];
        persistUserActivityToStorage();
        try { _seenIncomingTxids.clear(); } catch (_) { /* ignore */ }
        if (typeof window.renderActivity === 'function') window.renderActivity();
        if (typeof window.renderWalletRecentActivity === 'function') window.renderWalletRecentActivity();
      }
    }
    // Persist a capped sample of the current wallet's addresses as the owner fingerprint.
    try { localStorage.setItem(WALLET_OWNER_KEY, JSON.stringify(Array.from(set).slice(0, 60))); } catch (_) { /* ignore */ }
  }
  window.stablesReconcileActivityOwner = reconcileActivityOwnerForCurrentWallet;

  /**
   * Called on every NEWTXPOW. If the transaction (even while still on the network, before a
   * block confirms it) pays one of our addresses and we are not the sender, surface an
   * instant "incoming" pending row + notification. When the tx later confirms, the
   * node-history sync upserts the same `NODE-<txpowid>` id and flips it to Confirmed.
   */
  window.stablesHandleIncomingTxpow = async function (txpow) {
    try {
      if (!DEMO_REAL || !txpow || typeof txpow !== 'object') return;
      const id = String(txpow.txpowid || '').trim();
      if (!id || id.length < 8 || _seenIncomingTxids.has(id)) return;

      const txn = (txpow.body && (txpow.body.txn || txpow.body.transaction)) || {};
      const inputs = minimaCoinsOnly(Array.isArray(txn.inputs) ? txn.inputs : []);
      const outputs = minimaCoinsOnly(Array.isArray(txn.outputs) ? txn.outputs : []);
      if (!outputs.length) return;

      const addrs = await ensureWalletAddrCache(false);
      if (!addrs || addrs.size === 0) return;
      const isOurs = (c) => c && ['address', 'mxaddress', 'miniaddress'].some(f => c[f] && addrs.has(String(c[f]).trim().toLowerCase()));

      // Pure incoming only: an output pays us, and no input is ours (skip our own sends/change).
      if (inputs.some(isOurs)) return;
      const ourOutputs = outputs.filter(isOurs);
      if (!ourOutputs.length) return;

      const amount = ourOutputs.reduce((acc, c) => {
        const v = parseFloat(String(c.amount || c.value || 0).replace(/,/g, ''));
        return acc + (Number.isFinite(v) ? v : 0);
      }, 0);
      if (!(amount > 0)) return;

      _seenIncomingTxids.add(id);

      const senderAddr = inputs.length && inputs[0].address ? String(inputs[0].address).trim() : '';
      let counterparty = 'Minima network';
      if (senderAddr) {
        let matched = false;
        for (const c of CONTACTS_BOOK.values()) {
          if (c.address && c.address === senderAddr) { counterparty = c.name; matched = true; break; }
        }
        if (!matched) {
          counterparty = senderAddr.length > 22 ? senderAddr.slice(0, 8) + String.fromCharCode(8230) + senderAddr.slice(-6) : senderAddr;
        }
      }
      const now = new Date();
      const dateText = now.toLocaleString('en-GB', { month: 'short', day: '2-digit' }) + ' ' + String.fromCharCode(183) + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

      upsertUserActivityRows([{
        id: 'NODE-' + id,
        dir: 'in',
        icon: String.fromCharCode(8601),
        counterparty,
        category: 'MINIMA',
        title: 'Incoming MINIMA',
        date: dateText,
        amt: Math.abs(amount),
        ccy: 'MINIMA',
        address: senderAddr,
        fee: 0,
        explorerTxId: id,
        status: 'Pending',
        note: 'Detected on the network, awaiting confirmation',
        directionLabel: 'Incoming',
        minimaOnChain: true,
        block: 0,
        pendingIncoming: true
      }]);

      if (typeof window.showToast === 'function') {
        const amtStr = amount >= 1 ? amount.toFixed(2) : amount.toFixed(6);
        window.showToast('Incoming ' + amtStr + ' MINIMA detected, awaiting confirmation', { tone: 'success', durationMs: 5200 });
      }
    } catch (_) { /* ignore */ }
  };

  // Find a boolean `relevant` flag anywhere in a checkaddress response.
  function findRelevantFlag(obj, depth) {
    if (depth > 6 || obj == null || typeof obj !== 'object') return null;
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

  /**
   * Shows a small indicator under the hero balance when there are incoming MINIMA payments
   * detected on the network but not yet confirmed (so the user knows the pending amount is
   * NOT included in the total balance yet). Hides itself once everything is confirmed.
   */
  function renderPendingIncomingIndicator() {
    const el = document.getElementById('wHeroPendingIncoming');
    if (!el) return;
    let sum = 0;
    let count = 0;
    activitySource().forEach(x => {
      if (!x || deletedTx.has(x.id)) return;
      if (x.ccy === 'MINIMA' && x.dir === 'in' && String(x.status) === 'Pending') {
        const v = Math.abs(Number(x.amt) || 0);
        if (v > 0) { sum += v; count++; }
      }
    });
    if (count > 0 && sum > 0) {
      const amtStr = sum >= 1
        ? sum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : sum.toFixed(6);
      const label = count > 1 ? (count + ' incoming payments') : 'Incoming';
      el.textContent = label + ' +' + amtStr + ' MINIMA, not yet in your total';
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
      el.textContent = '';
    }
    // Respect the hide-amounts toggle (mirror the hero balance's blur state).
    try {
      const total = document.querySelector('.w-total');
      el.classList.toggle('bal-hidden', !!(total && total.classList.contains('bal-hidden')));
    } catch (_) { /* ignore */ }
  }
  window.stablesRenderPendingIncomingIndicator = renderPendingIncomingIndicator;

  // Debounced live re-sync of node history, fired on NEWBALANCE / NEWBLOCK.
  let _liveResyncTid = null;
  window.stablesLiveResyncTransactions = function () {
    if (typeof window.stablesSyncNodeTransactions !== 'function') return;
    if (_liveResyncTid) clearTimeout(_liveResyncTid);
    _liveResyncTid = setTimeout(function () {
      _liveResyncTid = null;
      window._activityLastAutoSync = Date.now();
      window.stablesSyncNodeTransactions(true);
    }, 900);
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
    const abs = Math.abs(a);
    if (abs === 0) return '0';
    if (abs >= 1) return abs.toFixed(2);
    if (abs >= 0.01) return abs.toFixed(3);
    if (abs >= 0.001) return abs.toFixed(4);
    return abs.toFixed(6);
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
      const label = `${tx.id} · ${Math.abs(tx.amt).toFixed(2)} ${tx.ccy} (~$${usd.toFixed(2)})`;
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
      <div  style="padding:10px;border-radius:10px"><div class="xs mu">Interacted spend</div><div  style="font-size:13px;font-weight:800;margin-top:4px">$${spendUsd.toFixed(2)}</div></div>
      <div  style="padding:10px;border-radius:10px"><div class="xs mu">Signer address</div><div  style="font-size:12px;font-weight:800;margin-top:4px;word-break:break-all">${escUi(raterAddress)}</div></div>
    </div>
    ${existingNote}
    <label class="flabel" style="margin-bottom:6px">Score</label>
    <select id="merchantRateScore" class="fsel" style="margin-bottom:10px">
      <option value="5">5 · Excellent</option><option value="4">4 · Good</option><option value="3" selected>3 · Neutral</option><option value="2">2 · Weak</option><option value="1">1 · Poor</option>
    </select>
    <label class="flabel" style="margin-bottom:6px">Linked transaction</label>
    <select id="merchantRateTx" class="fsel" style="margin-bottom:10px">${txOptions || '<option value="">No eligible payments yet</option>'}</select>
    <label class="flabel" style="margin-bottom:6px">Comment (optional)</label>
    <textarea id="merchantRateComment" class="finput" rows="3" maxlength="${MERCHANT_RATING_MAX_COMMENT}" placeholder="Share your experience..." style="resize:vertical;margin-bottom:12px"></textarea>
    <div class="xs mu"  style="margin-bottom:12px">Anti-spam in this framework: one signed review per merchant/address, cooldown between edits, and weight from linked spend amount.</div>
    <div class="flex gap8"  style="justify-content:center"><button class="btn btn-w btn-g" ${disabled} onclick="submitMerchantRating()">Submit signed review</button></div>
    ${!canRate ? `<div class="xs mu"  style="margin-top:10px;color:var(--am)">Need at least $${MERCHANT_RATING_MIN_SPEND_USD.toFixed(2)} spent with this merchant to rate.</div>` : ''}`;
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
      if (typeof window.showToast === 'function') window.showToast(`Need at least $${MERCHANT_RATING_MIN_SPEND_USD.toFixed(2)} spent to rate`);
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
    ['actFilterAll', 'actFilterIn', 'actFilterOut', 'actFilterHidden'].forEach(id => document.getElementById(id)?.classList.remove('on'));
    if (f === 'in') document.getElementById('actFilterIn')?.classList.add('on');
    if (f === 'out') document.getElementById('actFilterOut')?.classList.add('on');
    if (f === 'hidden') document.getElementById('actFilterHidden')?.classList.add('on');
    if (f === 'all') document.getElementById('actFilterAll')?.classList.add('on');
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
    ['actFilterAll', 'actFilterIn', 'actFilterOut', 'actFilterHidden'].forEach(id => document.getElementById(id)?.classList.remove('on'));
    document.getElementById('actFilterAll')?.classList.add('on');
    const ccySel = document.getElementById('actCcySelect');
    if (ccySel) ccySel.value = 'all';
    const timeSel = document.getElementById('actTimeSelect');
    if (timeSel) timeSel.value = 'all';
    const dateRow = document.getElementById('actDateRangeRow');
    if (dateRow) dateRow.style.display = 'none';
    const dateFromEl = document.getElementById('activityDateFrom');
    const dateToEl = document.getElementById('activityDateTo');
    if (dateFromEl) dateFromEl.value = '';
    if (dateToEl) dateToEl.value = '';
    activityPage = 0;
    window.renderActivity();
  };

  window.setActivitySort = function (mode) {
    activitySort = mode === 'amount_desc' ? 'amount_desc' : 'date_desc';
    document.getElementById('actSortDate')?.classList.remove('on');
    document.getElementById('actSortAmount')?.classList.remove('on');
    if (activitySort === 'date_desc') document.getElementById('actSortDate')?.classList.add('on');
    if (activitySort === 'amount_desc') document.getElementById('actSortAmount')?.classList.add('on');
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

  window.renderActivity = function () {
    const list = document.getElementById('activityList'); if (!list) return;
    const nextBtn = document.getElementById('activityMoreBtn');
    const prevBtn = document.getElementById('activityPrevBtn');
    const items = sortActivityItems(getFilteredActivity());
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
      const row = document.createElement('div');
      row.className = 'tx-row';
      if (suspiciousTx.has(x.id)) row.style.borderColor = 'rgba(248,113,113,.45)';
      const note = getTxNote(x);
      row.innerHTML = `<div class="tx-ic ${x.dir === 'in' ? 'in-ic' : 'out-ic'}">${x.icon}</div><div class="tx-info"><div class="tx-t">${x.title}</div><div class="tx-d">${x.date} · ${(x.minimaOnChain && x.counterparty) ? x.counterparty : x.category}${suspiciousTx.has(x.id) ? ' · Suspicious' : ''}${note ? ' · Note' : ''}</div></div><div class="tx-amt-wrap"><div class="tx-amt ${x.amt >= 0 ? 'pos' : 'neg'} bal-amount">${x.amt >= 0 ? '+' : '−'}${fmtAmt(x.amt)} ${x.ccy}</div>${txConfirmLine(x)}</div>`;
      row.addEventListener('click', () => window.openActivityDetail(x.id));
      list.appendChild(row);
    });
    const hasPrev = activityPage > 0;
    const hasNext = end < items.length;
    if (prevBtn) prevBtn.style.display = hasPrev ? '' : 'none';
    if (nextBtn) { nextBtn.style.display = hasNext ? '' : 'none'; if (hasNext) nextBtn.textContent = `See next ${Math.min(25, items.length - end)} ▸`; }
  };

  window.renderWalletRecentActivity = function () {
    const list = document.getElementById('walletRecentList');
    if (!list) return;
    const items = sortActivityItems(
      activitySource().filter(x => !deletedTx.has(x.id) && !hiddenTx.has(x.id) && !hiddenShops.has(x.counterparty))
    ).slice(0, 10);
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = _txSyncInFlight ? txListLoadingHtml('Loading transaction history…') : txListEmptyHtml('No recent activity yet.');
      return;
    }
    items.forEach(x => {
      const row = document.createElement('div');
      row.className = 'tx-row';
      if (suspiciousTx.has(x.id)) row.style.borderColor = 'rgba(248,113,113,.45)';
      const note = getTxNote(x);
      row.innerHTML = `<div class="tx-ic ${x.dir === 'in' ? 'in-ic' : 'out-ic'}">${x.icon}</div><div class="tx-info"><div class="tx-t">${x.title}</div><div class="tx-d">${x.date} · ${(x.minimaOnChain && x.counterparty) ? x.counterparty : x.category}${suspiciousTx.has(x.id) ? ' · Suspicious' : ''}${note ? ' · Note' : ''}</div></div><div class="tx-amt-wrap"><div class="tx-amt ${x.amt >= 0 ? 'pos' : 'neg'} bal-amount">${x.amt >= 0 ? '+' : '−'}${fmtAmt(x.amt)} ${x.ccy}</div>${txConfirmLine(x)}</div>`;
      row.addEventListener('click', () => window.openActivityDetail(x.id));
      list.appendChild(row);
    });
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
      row.innerHTML = `<div class="tx-ic" >⇄</div><div class="tx-info"><div class="tx-t">${x.fromCcy} → ${x.toCcy}</div><div class="tx-d">${x.date}${x.status === 'Pending' ? ' · Pending' : ''}</div></div><div class="tx-amt bal-amount"  style="color:var(--c)">${x.fromAmt.toFixed(2)} → ${x.toAmt.toFixed(2)}</div>`;
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
        <div class="fbet"><div><div  style="font-size:16px;font-weight:900;color:var(--t)">${ex.fromCcy} → ${ex.toCcy}</div><div class="xs mu">Currency conversion</div></div><div  style="text-align:right"><div class="tx-amt bal-amount"  style="color:var(--t)">−${ex.fromAmt.toFixed(2)} ${ex.fromCcy}</div><div class="xs mu"  style="color:var(--gr)">+${ex.toAmt.toFixed(2)} ${ex.toCcy}</div></div></div>
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
    if (titleRight) titleRight.innerHTML = '<button class="btn" title="Ask StablesAgent" style="width:auto;padding:6px 10px;font-size:12px" onclick="openAgentExplain(\'Exchange details\')"><img src="agent.png" alt="Agent" style="width:14px;height:14px;border-radius:4px;vertical-align:-2px"></button>';
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
    if (typeof window.showToast === 'function') window.showToast('Amounts filled  -  review and tap Exchange Now');
  };

  window.openActivityDetail = function (id) {
    const tx = getTxById(id); if (!tx) return;
    selectedTxId = id;
    const suspicious = suspiciousTx.has(tx.id);
    const txNote = getTxNote(tx);
    const _confN = txConfirmations(tx);
    const _confFinal = (_confN === null) ? (tx.status === 'Confirmed') : (_confN >= CONFIRM_TARGET);
    const statusColor = _confFinal ? 'var(--gr)' : 'var(--am)';
    const statusText = (_confN === null)
      ? tx.status
      : (_confN >= CONFIRM_TARGET
        ? ('Confirmed · ' + _confN + ' block' + (_confN === 1 ? '' : 's'))
        : ((_confN === 0 ? 'Awaiting confirmation' : 'Confirming') + ' · ' + _confN + '/' + CONFIRM_TARGET + ' blocks'));
    const canRateMerchant = !!SHOP_PROFILES[tx.counterparty] && tx.dir === 'out';
    const feeDisp = (Number(tx.fee) || 0).toFixed(2);
    const txHash = String(tx.explorerTxId || '');
    const hasRealExplorer = !!tx.minimaOnChain && /^0x[a-fA-F0-9]{64}$/.test(txHash);
    const tradeIdBlock = hasRealExplorer
      ? `<div  style="padding:0 4px;margin-bottom:8px"><div class="xs mu"  style="margin-bottom:6px;font-weight:700;color:var(--t)">Transaction id</div><a href="${escUi(txExplorerUrl(tx))}" target="_blank" rel="noopener noreferrer" class="btn" style="width:auto;padding:0;border:none;background:none;font-size:12px;font-weight:900;word-break:break-all;color:var(--c);text-decoration:underline;display:inline-block;text-align:left">${escUi(txHash)}</a></div>`
      : `<div  style="padding:0 4px;margin-bottom:8px"><div class="xs mu"  style="margin-bottom:6px;font-weight:700;color:var(--t)">Trade ID</div><button class="btn" style="width:auto;padding:0;border:none;background:none;font-size:12px;font-weight:900;word-break:break-all;color:var(--c);text-decoration:underline;text-align:left" onclick="openTxExplorer()">${escUi(tx.explorerTxId || tx.id)}</button></div>`;
    const body = `<div  style="margin-bottom:8px;display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:${statusColor};display:inline-block"></span><span class="xs mu">${statusText}</span></div>
      <div  style="margin-bottom:16px;padding:0 4px">
        <div class="fbet"><div><div  style="font-size:16px;font-weight:900;color:var(--t)">${tx.title}</div><div class="xs mu"  style="margin-top:2px">${tx.date}</div></div><div  style="text-align:right"><div class="tx-amt ${tx.amt >= 0 ? 'pos' : 'neg'} bal-amount">${tx.amt >= 0 ? '+' : '−'}${Math.abs(tx.amt).toFixed(2)} ${tx.ccy}</div><div class="xs mu">Fee ${feeDisp} ${tx.ccy}</div></div></div>
      </div>
      <div  style="margin-bottom:16px;padding:0 4px">
        <div class="xs mu"  style="margin-bottom:6px;font-weight:700;color:var(--t)">Contact / Address</div>
        <div  style="display:flex;gap:8px">
          <input class="finput" id="txDetailContactInput" value="${tx.counterparty === tx.address || tx.counterparty.includes('…') ? tx.address : tx.counterparty}" style="flex-grow:1;padding:8px;font-size:13px" placeholder="Enter contact name">
          <button class="btn btn-w btn-g" style="padding:8px 12px;width:auto" onclick="saveTransactionContact()">Save</button>
        </div>
        <div class="xs mu"  style="margin-top:6px;word-break:break-all;font-size:11px">${tx.address}</div>
      </div>
      
      <div  style="margin-bottom:12px">
        <label class="flabel" style="margin-bottom:6px">Transaction note</label>
        <textarea class="finput" id="txDetailNoteInput" rows="2" placeholder="Add a note for this transaction..." style="resize:vertical;margin-bottom:8px">${txNote}</textarea>
        <div class="flex gap8"  style="justify-content:center"><button class="btn btn-w btn-g" onclick="saveTransactionNote()">Save note</button></div>
      </div>

      <div class="flex gap8"  style="margin-bottom:16px;flex-wrap:wrap;justify-content:center">
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
        <div class="xs mu"  style="margin-top:12px">Use the <strong>Hidden</strong> filter on All Transactions to review soft-hidden payments. Deleted items stay gone unless you reset local config. Hiding a merchant removes it from the Merchants tab and drops its payments from the main activity list until you show the merchant again from its profile.</div>
      </details>`;
    document.getElementById('agentActionTitle').textContent = 'Transaction details';
    const titleRight = document.getElementById('agentActionTitleRight');
    if (titleRight) titleRight.innerHTML = '<button class="btn" title="Ask StablesAgent" style="width:auto;padding:6px 10px;font-size:12px" onclick="openAgentExplain(\'Transaction details\')"><img src="agent.png" alt="Agent" style="width:14px;height:14px;border-radius:4px;vertical-align:-2px"></button>';
    document.getElementById('agentActionContent').innerHTML = body;
    document.getElementById('agentActionModal').classList.add('open');
  };

  window.closeAgentActionModal = function () {
    const modal = document.getElementById('agentActionModal');
    if (!modal) return;
    modal.classList.remove('open', 'agent-action-notice');
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
  window.repeatTransactionFromDetail = function () {
    const tx = getTxById(selectedTxId); if (!tx) return;
    const draft = { party: `${tx.counterparty} · ${tx.address}`, amount: String(Math.abs(tx.amt).toFixed(2)), ccy: tx.ccy };
    window.closeAgentActionModal();
    if (tx.dir === 'in') window.openModalWithDraft('recvModal', draft);
    else window.openModalWithDraft('sendModal', draft);
  };
  window.saveTransactionNote = function () {
    if (!selectedTxId) return;
    const input = document.getElementById('txDetailNoteInput');
    const value = String(input?.value || '').trim();
    if (value) txNotes[selectedTxId] = value;
    else delete txNotes[selectedTxId];
    persistTxNotes();
    if (typeof window.showToast === 'function') window.showToast('Transaction note saved');
    window.renderActivity();
    window.renderWalletRecentActivity();
    window.openActivityDetail(selectedTxId);
  };
  window.saveTransactionContact = function () {
    if (!selectedTxId) return;
    const tx = getTxById(selectedTxId); if (!tx) return;
    const input = document.getElementById('txDetailContactInput');
    const newName = String(input?.value || '').trim();
    if (!newName || newName === tx.address) return;

    const contactObj = { name: newName, category: tx.category || 'MINIMA', address: tx.address, city: 'Unknown', saved: true };
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
    
    if (typeof window.showToast === 'function') window.showToast('Contact updated');
    window.renderActivity();
    window.renderWalletRecentActivity();
    window.openActivityDetail(selectedTxId);
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
    if (latestSentEl) latestSentEl.textContent = latestOut ? `${Math.abs(latestOut.amt).toFixed(2)} ${latestOut.ccy} · ${latestOut.date}` : 'No sent transaction yet';
    if (latestRecvEl) latestRecvEl.textContent = latestIn ? `${Math.abs(latestIn.amt).toFixed(2)} ${latestIn.ccy} · ${latestIn.date}` : 'No received transaction yet';
    const notes = document.getElementById('contactNotes');
    if (notes) notes.value = contactNotes[c.name] || '';
    const shopBtn = document.getElementById('contactShopBtn');
    const isShop = !!SHOP_PROFILES[c.name];
    if (shopBtn) shopBtn.style.display = isShop ? '' : 'none';
    const rateBtn = document.getElementById('contactRateMerchantBtn');
    if (rateBtn) rateBtn.style.display = isShop ? '' : 'none';
    if (section) section.style.removeProperty('display');
  };

  window.saveContactNotes = function () {
    if (!selectedContactName) return;
    const notes = document.getElementById('contactNotes');
    contactNotes[selectedContactName] = String(notes?.value || '').trim();
    persistNotes();
    if (typeof window.showToast === 'function') window.showToast('Contact notes saved');
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
      _cs[_cs.length - 1] = String(_iterN);
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
      return `<div class="app-section app-section--caption-bottom app-section--caption-bottom--mt20"><div class="stitle-row"><div class="stitle">App version</div><button type="button" class="agent-mini-btn" onclick="openAgentExplain('Council communications: app version status')" title="StablesAgent"><img src="agent.png" alt="StablesAgent"></button></div><div class="card app-section-card"  style="padding:14px;margin-bottom:8px">
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

    return `<div class="app-section app-section--caption-bottom app-section--caption-bottom--mt20"><div class="stitle-row"><div class="stitle">App version</div><button type="button" class="agent-mini-btn" onclick="openAgentExplain('Council communications: app update available and what changed')" title="StablesAgent"><img src="agent.png" alt="StablesAgent"></button></div><div class="card app-section-card"  style="padding:14px;margin-bottom:8px;border:1px solid ${crit.border};background:${crit.bg}">
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
    return `<div class="app-section app-section--caption-bottom"><div class="stitle-row"><div class="stitle">Official notices</div><button type="button" class="agent-mini-btn" onclick="openAgentExplain('Council communications: official bulletins and critical notices')" title="StablesAgent"><img src="agent.png" alt="StablesAgent"></button></div><div class="card app-section-card"  style="padding:14px;margin-bottom:8px;background:linear-gradient(135deg,rgba(103,232,249,.05),rgba(167,139,250,.06))">
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
    if (typeof window.confirm === 'function' && !window.confirm(msg)) return;
    txsForShop(n).forEach(x => { deletedTx.add(x.id); hiddenTx.delete(x.id); });
    persistHiddenTx();
    persistSoftHidden();
    window.closeAgentActionModal();
    window.renderActivity();
    window.renderWalletRecentActivity();
    if (typeof window.renderContactsPage === 'function') window.renderContactsPage();
    if (typeof window.showToast === 'function') window.showToast('Transactions removed from local view');
  };

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
        <div class="xs mu"  style="margin-bottom:10px">Local demo only. Soft-hidden items use the <strong>Hidden</strong> filter; deleted items stay removed until you reset local data.</div>
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
      chip.textContent = (isFav ? '⭐ ' : '') + c.name;
      chip.title = c.address;
      chip.addEventListener('click', () => window.setSendRecipient(c.name, c.address));
      wrap.appendChild(chip);
    });
  };

  window.setSendRecipient = function (name, address) {
    const input = document.getElementById('sendToInput');
    if (!input) return;
    input.value = `${name} · ${address}`;
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
    el.classList.toggle('on');
    if (typeof window.renderCurrencyPillVisual === 'function') {
      window.renderCurrencyPillVisual(el);
    }
    window.updateWelcomePrimaryOptions();
  };

  window.selectAllWelcomeCurrencies = function () {
    const pills = Array.from(document.querySelectorAll('#welcomeCurrencies .ccy-pill'));
    pills.forEach((p) => {
      if (!p.classList.contains('on')) window.toggleWelcomeCcy(p);
    });
  };

  window.unselectAllWelcomeCurrencies = function () {
    const pills = Array.from(document.querySelectorAll('#welcomeCurrencies .ccy-pill'));
    pills.forEach((p) => {
      if (p.classList.contains('on')) window.toggleWelcomeCcy(p);
    });
  };

  window.updateWelcomePrimaryOptions = function () {
    const sel = document.getElementById('welcomePrimary');
    if (!sel) return;
    const prev = String(sel.value || '');
    const selected = Array.from(document.querySelectorAll('#welcomeCurrencies .ccy-pill.on'))
      .map(x => String(x.dataset?.ccy || '').trim())
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
    const preferred = options.includes('MINIMA') ? 'MINIMA' : (options.includes('EURw') ? 'EURw' : options[0]);
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
      .map(x => x.dataset?.ccy).filter(Boolean);
    const primary = document.getElementById('welcomePrimary')?.value || (selected.includes('MINIMA') ? 'MINIMA' : (selected.includes('EURw') ? 'EURw' : (selected[0] || 'MINIMA')));

    const pills = Array.from(document.querySelectorAll('#ccyDisplayPills .ccy-pill'));
    pills.forEach(p => {
      const code = p.dataset?.ccy;
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
          '<p>This is the <strong style="color:var(--t)">Stables demo</strong> (<strong style="color:var(--t)">version __APP_VERSION__</strong>), the channel after the earlier showcase preview. The showcase showed direction and early UI; this demo adds deeper wiring: <strong style="color:var(--t)">Connect node</strong> for live chain height and on-chain MINIMA transaction, more wallet and flow experiments, and the same feedback loop.</p>' +
          '<p>The Stables dapp can be downloaded <a href="__MDS_REPO_URL__" target="_blank" rel="noopener noreferrer">here</a> as a MiniDapp zip package. Write mode is required for StablesAgent, sending feedback, and other features that use the network.</p>' +
          '<p><strong style="color:var(--t)">What you can try:</strong> explore the app, use <strong style="color:var(--t)">StablesAgent</strong> (it may be busy, retry shortly), send feedback under <strong style="color:var(--t)">More - Feedback</strong>, test native MINIMA receive and send when your node is live, and use the mint / burn UI as it evolves toward the test phase.</p>' +
          '<p><strong style="color:var(--t)">What is not here yet:</strong> a finished product, full guided tours as shipped features, or guarantees on agent capacity.</p>' +
          '<p>Updates still land often. If you use the MiniDapp on your Minima node, refresh the package from <a href="__MDS_REPO_URL__" target="_blank" rel="noopener noreferrer">the download link</a> when a new build is published.</p>' +
          '<p>The Stables community can be reached at <a href="https://t.me/stablescommunity" target="_blank" rel="noopener noreferrer">t.me/stablescommunity</a>.</p>',
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
      const versionLabel = rawVersion && rawVersion !== 'unknown'
        ? 'v' + rawVersion.replace(/^v/i, '').split('.').map(part => {
            const n = Number(part);
            return Number.isFinite(n) ? String(n) : String(part).trim();
          }).join('.')
        : 'unknown';
      const repoUrl = String(cfg.MDS_ZIP_URL || 'https://raw.githubusercontent.com/StablesCouncil/stablescouncil.github.io/main/dapp/latest-version/Stables_v0.0.0.1.0.mds.zip').trim();
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
      pe.style.margin = i < paras.length - 1 ? '0 0 22px' : '0';
      pe.style.maxWidth = '100%';
      pe.textContent = p;
      elIntroBody.appendChild(pe);
    });
    if (elShowcase) {
      const showcaseText = String(c.showcase || '');
      const iconHtml = '<img src="agent.png" alt="StablesAgent" style="width:16px;height:16px;border-radius:4px;vertical-align:-3px;margin:0 3px">';
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

  /** More → Help → Guided tours: open welcome on the StablesAgent role picker (path choice). */
  window.openWelcomeGuidedToursFromMenu = function () {
    try {
      sessionStorage.setItem('stables_guided_tour_from_menu_v1', '1');
    } catch (_) {}
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

