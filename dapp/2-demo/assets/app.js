'use strict';

// ------------------------------
// Prototype State (structure-first)
// ------------------------------
const state = {
  phase: 'capped',
  walletConnected: true, // in-app: de facto connected

  // Real prices from oracle (updated every 30s)
  prices: {
    minimaUSD: 0.0084, // Will be updated by oracle
    xMinimaUSD: 0.0084 / 4,
    mUSD: 1,
    smUSD: 1,
    // Multi-currency exchange rates
    mCAD: 1.35,  // 1 mUSD = 1.35 mCAD
    mCHF: 0.88,  // 1 mUSD = 0.88 mCHF  
    mEUR: 0.92,  // 1 mUSD = 0.92 mEUR
  },

  // FAKE BALANCES (faucet-controlled for PUC testing)
  balances: {
    minima: 0,
    x: 0,
    m: 0,  // mUSD
    sm: 0,
    // Multi-currency balances
    cad: 0,  // mCAD
    chf: 0,  // mCHF
    eur: 0,  // mEUR
  },
  mint: { deposited: 0 },

  // Real wallet data (from MDS)
  wallet: { address: 'Loading...' }, // Will be updated by MDS
  chain: { height: 0, synced: false }, // Will be updated by MDS

  // Factory (prototype UX state)
  factory: {
    mintAmount: 2000,                 // MINIMA committed as collateral
    allocMinima: { m: 1000, sm: 500, x: 500 }, // allocation in MINIMA value buckets (sum = mintAmount)
    locks: { m: false, sm: false, x: false },
  },

  // Protocol caps (prototype)
  caps: { globalMintCap: 100000, mintedTotal: 0 },

  // Protocol parameters (updated values per roadmap)
  params: {
    coverage: {
      min: 1.05,
      targetMint: 3.00,        // 300% for minting
      maintenance: 2.00,       // 200% maintenance
      rebalanceTrigger: 2.00,  // 200% triggers rebalancing
      counterRebalance: 2.50,  // 250% triggers counter-rebalancing
    }
  },

  // Metrics (prototype)
  metrics: { leverageX: 1.15, stabilityProgress: 0.12 },

  gates: { canDeposit: false, canMint: false },
};

const $ = (id) => document.getElementById(id);
const app = $('app');

function fmt(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

// ------------------------------
// Pricing helpers (prototype)
// ------------------------------
function tokenPriceUSD(key) {
  if (key === 'm') return state.prices.mUSD;
  if (key === 'sm') return state.prices.smUSD;
  if (key === 'x') return state.prices.xMinimaUSD;
  if (key === 'minima') return state.prices.minimaUSD;
  return 0;
}

// Allocation buckets are MINIMA value.
// Convert MINIMA allocation -> token qty at current fake prices.
function tokenQtyFromMinimaValue(key, minimaValue) {
  const vMin = Number(minimaValue || 0);
  const pMin = Number(state.prices.minimaUSD || 0);
  const pTok = Number(tokenPriceUSD(key) || 0);
  if (pMin <= 0 || pTok <= 0) return 0;
  const usd = vMin * pMin;
  return usd / pTok;
}

// Convert token qty -> MINIMA value (for token input field)
function minimaValueFromTokenQty(key, qty) {
  const q = Number(qty || 0);
  const pMin = Number(state.prices.minimaUSD || 0);
  const pTok = Number(tokenPriceUSD(key) || 0);
  if (pMin <= 0) return 0;
  const usd = q * pTok;
  return usd / pMin;
}

// ------------------------------
// UI helpers
// ------------------------------
function showToast(title, body) {
  $('toastTitle').textContent = title;
  $('toastBody').textContent = body;
  const t = $('toast');
  t.style.display = 'block';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.style.display = 'none', 2400);
}

function btn(label, cls, onClick, disabled = false) {
  const b = document.createElement('button');
  b.textContent = label;
  if (cls) b.className = cls;
  b.disabled = !!disabled;
  b.addEventListener('click', onClick);
  return b;
}

function setHeaderButtons(buttons) {
  const wrap = $('headerButtons');
  wrap.innerHTML = '';
  buttons.forEach(b => wrap.appendChild(b));
}

// ------------------------------
// Protocol metrics
// ------------------------------
function coverageRatio() {
  // Coverage ratio = USD value(collateral) ÷ USD value(Stables supply)
  const StablesUSD = ((state.balances.m || 0) * state.prices.mUSD) + ((state.balances.sm || 0) * state.prices.smUSD);
  if (StablesUSD <= 0) return Infinity;
  const collateralUSD = (state.mint.deposited || 0) * (state.prices.minimaUSD || 0);
  return collateralUSD / StablesUSD;
}

function coverageStatus(r) {
  if (!Number.isFinite(r)) return { label: 'No Stables supply', color: 'var(--muted)' };
  if (r >= state.params.coverage.targetMint) return { label: 'Healthy', color: 'var(--good)' };
  if (r >= state.params.coverage.maintenance) return { label: 'Maintenance', color: 'var(--warn)' };
  return { label: 'Rebalance zone', color: 'var(--bad)' };
}

function updateTop() {
  // Display MINIMA price with change indicator
  const price = state.prices?.minimaUSD || 0;

  // Initialize tracking variables
  if (!state._prevPrice) state._prevPrice = price;
  if (!state._priceDirection) state._priceDirection = 'neutral'; // 'up', 'down', 'neutral'

  const prevPrice = state._prevPrice;

  // Update direction when price changes
  if (price > prevPrice) {
    state._priceDirection = 'up';
  } else if (price < prevPrice) {
    state._priceDirection = 'down';
  }
  // If price === prevPrice, keep previous direction

  state._prevPrice = price;

  // Always show arrow based on current direction
  let priceChangeHtml = '';
  if (state._priceDirection === 'up') {
    priceChangeHtml = ' <span style="color: #22c55e; font-size: 14px;">▲</span>';
  } else if (state._priceDirection === 'down') {
    priceChangeHtml = ' <span style="color: #ef4444; font-size: 14px;">▼</span>';
  }

  $('minimaPrice').innerHTML = price > 0 ? `$${price.toFixed(5)}${priceChangeHtml}` : '\u2026';

  // Display wallet address (truncated)
  const addr = state.wallet.address || 'Loading...';
  const displayAddr = addr.length > 20 ? addr.substring(0, 8) + '...' + addr.substring(addr.length - 6) : addr;
  $('walletAddr').textContent = displayAddr;
  $('walletAddr').title = addr; // Full address on hover

  // Block status with connection indicator
  const syncTxt = state.chain?.synced ? 'Synced' : 'Syncing';
  const isConnected = state.chain?.height > 0 && state.wallet.address && !state.wallet.address.includes('Loading');
  const statusDot = isConnected ? '<span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #22c55e; margin-right: 6px; box-shadow: 0 0 6px #22c55e;"></span>' : '';

  const bh = Number(state.chain?.height || 0);
  const blockLabel = bh > 0 ? `${statusDot}${fmt(bh)}` : '\u2014';
  const blockEl = $('blockStatus');
  blockEl.innerHTML = blockLabel;
  blockEl.title = bh > 0
    ? 'Block height from your node (MDS)'
    : 'Showcase: live block height appears when you open Stables in Winiwa / MiniDapp (MDS).';
  $('phaseText').textContent = 'Prototype - no real functionality yet';
  $('phasePill').querySelector('.badge').style.background = state.phase === 'capped' ? 'var(--warn)' : 'var(--good)';
}

function updateGates() {
  state.gates.canDeposit = state.balances.minima > 0;
  state.gates.canMint = state.balances.minima > 0;
  $('gateFaucet').textContent = 'TEST'; // Changed from RARELY
}

function setActiveNav(route) {
  document.querySelectorAll('#nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
}

// ------------------------------
// Routing
// ------------------------------
const routes = {
  wallet: window.StablesRoutes?.renderWallet,
  investment: window.StablesRoutes?.renderInvestment,
  swap: window.StablesRoutes?.renderSwap,
  factory: window.StablesRoutes?.renderFactory,
  protocol: window.StablesRoutes?.renderProtocol,
  contacts: window.StablesRoutes?.renderContacts,
  chat: window.StablesRoutes?.renderChat,
  council: window.StablesRoutes?.renderCouncil,
  console: window.StablesRoutes?.renderCouncil, // alias (old)
  feedback: window.StablesRoutes?.renderFeedback,
  faucet: window.StablesRoutes?.renderFaucet,
};

function currentRoute() {
  const hash = location.hash || '#/wallet';
  const r = hash.replace('#/', '').split('?')[0];
  return routes[r] ? r : 'wallet';
}

function navigate(route) { location.hash = '#/' + route; }

function getContext() {
  return {
    state,
    $,
    app,
    fmt,
    tokenPriceUSD,
    tokenQtyFromMinimaValue,
    minimaValueFromTokenQty,
    showToast,
    btn,
    setHeaderButtons,
    navigate,
    safeRender,
    coverageRatio,
    coverageStatus,
    open,
    close,
    faucetGrant,
  };
}

function safeRender() {
  // Preserve focus/typing across rerenders (prevents inputs "deactivating" mid-entry)
  const ae = document.activeElement;
  const activeId = ae && ae.id ? ae.id : null;
  const isTextInput = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA');
  const selStart = isTextInput && typeof ae.selectionStart === 'number' ? ae.selectionStart : null;
  const selEnd = isTextInput && typeof ae.selectionEnd === 'number' ? ae.selectionEnd : null;

  try {
    updateTop();
    updateGates();
    const r = currentRoute();
    setActiveNav(r);

    console.log('[Render] Rendering route:', r, 'Function exists:', !!routes[r]);

    if (routes[r] && typeof routes[r] === 'function') {
      routes[r](getContext());
    } else {
      console.error('[Render] Route function not found for:', r);
      app.innerHTML = `
        <div class="card">
          <h3>Route Error</h3>
          <div class="muted">Route "${r}" not found. Available routes: ${Object.keys(routes).join(', ')}</div>
          <div class="hr"></div>
          <button class="primary" onclick="location.hash='#/wallet'">Go to Wallet</button>
        </div>
      `;
    }

    // Restore focus if element still exists
    if (activeId) {
      const el = document.getElementById(activeId);
      if (el && typeof el.focus === 'function') {
        el.focus({ preventScroll: true });
        if (isTextInput && selStart !== null && selEnd !== null && typeof el.setSelectionRange === 'function') {
          try { el.setSelectionRange(selStart, selEnd); } catch (_) {/* ignore */ }
        }
      }
    }
  } catch (e) {
    console.error('[Render] Error:', e);
    app.innerHTML = `
      <div class="card">
        <h3>Prototype error</h3>
        <div class="muted">The UI hit an exception. Open console for details.</div>
        <div class="hr"></div>
        <pre style="white-space:pre-wrap; color:var(--muted); font-size:12px">${String(e && e.stack ? e.stack : e)}</pre>
        <div class="hr"></div>
        <button class="primary" id="reloadBtn">Reload</button>
      </div>
    `;
    $('reloadBtn').onclick = () => location.reload();
    showToast('Error', 'UI exception - see console.');
  }
}

window.addEventListener('hashchange', safeRender);

// ------------------------------
// Modals
// ------------------------------
function open(backdropId) {
  const el = $(backdropId);
  el.style.display = 'flex';
  el.setAttribute('aria-hidden', 'false');
}

function close(backdropId) {
  const el = $(backdropId);
  el.style.display = 'none';
  el.setAttribute('aria-hidden', 'true');
}

function openOnboard(force = false) {
  const needsWiniwa = state.balances.minima <= 0;
  if (force || needsWiniwa) open('onboardBackdrop');
}

$('phasePill').addEventListener('click', () => open('phaseBackdrop'));
$('closePhase').addEventListener('click', () => close('phaseBackdrop'));
$('phaseBackdrop').addEventListener('click', (e) => { if (e.target === $('phaseBackdrop')) close('phaseBackdrop'); });

$('setCapped').addEventListener('click', () => {
  state.phase = 'capped';
  close('phaseBackdrop');
  showToast('Phase', 'Prototype - no real functionality yet');
  safeRender();
});

$('setUncapped').addEventListener('click', () => {
  state.phase = 'uncapped';
  close('phaseBackdrop');
  showToast('Phase', 'Prototype - no real functionality yet');
  safeRender();
});

$('onboardBackdrop').addEventListener('click', (e) => { if (e.target === $('onboardBackdrop')) close('onboardBackdrop'); });

// Fixed faucet amount
function faucetGrant(amount) {
  const granted = Number(amount || 10000);
  state.balances.minima += granted;
  showToast('Faucet', `Granted ${fmt(granted)} test WINIWA.`);
}

$('quickFaucet').addEventListener('click', () => {
  faucetGrant(10000);
  close('onboardBackdrop');
  navigate('wallet');
  safeRender();
});

$('continueApp').addEventListener('click', () => {
  close('onboardBackdrop');
  navigate('wallet');
  safeRender();
});

$('onboardHelp').addEventListener('click', () => {
  showToast('Faucet', 'A faucet gives free test tokens so you can try the app safely.');
});

// Receive / Send modals
$('recvBackdrop').addEventListener('click', (e) => { if (e.target === $('recvBackdrop')) close('recvBackdrop'); });
$('sendBackdrop').addEventListener('click', (e) => { if (e.target === $('sendBackdrop')) close('sendBackdrop'); });
$('closeRecv').addEventListener('click', () => close('recvBackdrop'));
$('closeSend').addEventListener('click', () => close('sendBackdrop'));

$('copyReceive').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(state.wallet.address);
    showToast('Receive', 'Address copied.');
  } catch (_) {
    showToast('Receive', 'Copy not available in this environment.');
  }
});

$('confirmSend').addEventListener('click', () => {
  const a = $('sendAsset').value;
  const to = $('sendTo').value.trim();
  const amt = Number($('sendAmt').value);

  if (!to) return showToast('Send', 'Enter a destination address.');
  if (!amt || amt <= 0) return showToast('Send', 'Enter an amount.');

  const getBal = () => a === 'minima' ? state.balances.minima : a === 'm' ? state.balances.m : a === 'sm' ? state.balances.sm : state.balances.x;
  const setBal = (v) => {
    if (a === 'minima') state.balances.minima = v;
    if (a === 'm') state.balances.m = v;
    if (a === 'sm') state.balances.sm = v;
    if (a === 'x') state.balances.x = v;
  };

  const bal = getBal();
  if (amt > bal) return showToast('Send', 'Insufficient balance.');

  setBal(bal - amt);
  showToast('Send', `Sent ${fmt(amt)} ${a === 'minima' ? 'MINIMA' : a === 'm' ? 'mUSD' : a === 'sm' ? 'smUSD' : 'xMINIMA'}.`);
  close('sendBackdrop');
  $('sendTo').value = '';
  safeRender();
});

// Walkthrough Logic
let currentWtSlide = 0;
const totalWtSlides = 5;

function updateWtDisplay() {
  for (let i = 0; i < totalWtSlides; i++) {
    const slide = $(`wtSlide${i}`);
    if (slide) slide.classList.toggle('active', i === currentWtSlide);
    const dot = $('wtDots').children[i];
    if (dot) {
      if (i === currentWtSlide) {
        dot.style.background = 'var(--accent)';
      } else {
        dot.style.background = 'var(--line)';
      }
    }
  }

  $('wtPrev').style.visibility = currentWtSlide === 0 ? 'hidden' : 'visible';
  $('wtNext').innerText = currentWtSlide === totalWtSlides - 1 ? 'Done' : 'Next';
}

function closeWalkthrough() {
  close('wtBackdrop');
  currentWtSlide = 0;
  updateWtDisplay();
}

$('wtBtn').addEventListener('click', () => {
  currentWtSlide = 0;
  updateWtDisplay();
  openModal('wtBackdrop');
});

$('closeWt').addEventListener('click', closeWalkthrough);
$('wtBackdrop').addEventListener('click', (e) => { if (e.target === $('wtBackdrop')) closeWalkthrough(); });

$('wtPrev').addEventListener('click', () => {
  if (currentWtSlide > 0) {
    currentWtSlide--;
    updateWtDisplay();
  }
});

$('wtNext').addEventListener('click', () => {
  if (currentWtSlide < totalWtSlides - 1) {
    currentWtSlide++;
    updateWtDisplay();
  } else {
    closeWalkthrough();
  }
});

// ------------------------------
// MDS Integration (Real blockchain data)
// ------------------------------

// Wait for MDS to be injected by MinimaOS
function waitForMDS(callback, maxRetries = 20, retryDelay = 200) {
  let retries = 0;

  const checkMDS = () => {
    if (typeof MDS !== 'undefined') {
      console.log('[MDS] MDS object detected, initializing...');
      callback();
    } else {
      retries++;
      if (retries < maxRetries) {
        console.log(`[MDS] Waiting for MDS... (attempt ${retries}/${maxRetries})`);
        setTimeout(checkMDS, retryDelay);
      } else {
        console.warn('[MDS] MDS not available after max retries - using mock data');
        callback(); // Proceed anyway with mock data
      }
    }
  };

  checkMDS();
}

async function initializeRealData() {
  console.log('[Init] Initializing MDS connection...');

  // Check if MDS is available
  if (typeof MDS === 'undefined') {
    console.warn('[Init] MDS not available - wallet/block from chain unavailable; price via CoinGecko in browser');
    state.wallet.address = 'MxG0…DEMO (No MDS)';
    state.chain.height = 0;
    state.chain.synced = false;
    safeRender();
    return;
  }

  console.log('[Init] MDS object found, calling MDS.init()...');

  // CRITICAL: Must call MDS.init() with callback BEFORE any MDS.cmd() calls
  MDS.init(function (msg) {
    console.log('[MDS] Init callback received:', msg);

    // MDS is now fully initialized and ready
    if (msg.event === 'inited') {
      console.log('[MDS] ✅ MDS fully initialized and ready!');

      // Now safe to call MDS commands
      fetchWalletData();
      fetchChainStatus();
    }
  });
}

// Fetch wallet address (only call after MDS.init completes)
function fetchWalletData() {
  console.log('[Wallet] Fetching address...');

  MDS.cmd("getaddress", function (response) {
    console.log('[Wallet] Response:', response);

    if (response.status && response.response) {
      const addr = response.response.miniaddress || response.response.address;
      state.wallet.address = addr || 'No address found';
      console.log('[Wallet] ✅ Address loaded:', state.wallet.address);
    } else {
      console.error('[Wallet] ❌ Failed:', response.error || 'Unknown error');
      state.wallet.address = 'Error: ' + (response.error || 'Failed to load');
    }
    safeRender();
  });
}

// Fetch chain status (only call after MDS.init completes)
function fetchChainStatus() {
  console.log('[Chain] Fetching status...');

  MDS.cmd("status", function (response) {
    console.log('[Chain] Response:', response);

    if (response.status && response.response && response.response.chain) {
      state.chain.height = response.response.chain.block;
      state.chain.synced = true;
      console.log('[Chain] ✅ Block height:', state.chain.height);
    } else {
      console.error('[Chain] ❌ Failed:', response.error || 'Unknown error');
    }
    safeRender();
  });

  // Update chain height every 2 seconds
  setInterval(() => {
    MDS.cmd("status", function (response) {
      if (response.status && response.response && response.response.chain) {
        state.chain.height = response.response.chain.block;
        state.chain.synced = true;
        updateTop();
      }
    });
  }, 2200);
}

// Initialize price oracle
async function initializePriceOracle() {
  console.log('[Init] Starting price oracle...');

  if (typeof PriceOracle === 'undefined') {
    console.warn('[Init] PriceOracle not available');
    return;
  }

  try {
    // Fetch initial prices
    const prices = await PriceOracle.getAllPrices();
    state.prices = prices;
    console.log('[Init] Initial prices loaded:', prices);

    // Start auto-update
    PriceOracle.startAutoUpdate(() => {
      // Update prices in state
      PriceOracle.getAllPrices().then(prices => {
        state.prices = prices;
        safeRender();
      });
    });

    safeRender();
  } catch (error) {
    console.error('[Init] Failed to initialize oracle:', error);
  }
}

// Expose globally for currency switcher
window.getContext = getContext;
window.safeRender = safeRender;

// ------------------------------
// Boot
// ------------------------------
if (!location.hash) location.hash = '#/wallet';

// Initial render
safeRender();

// Wait for MDS to be ready, then initialize
waitForMDS(() => {
  initializeRealData();
  initializePriceOracle();

  // Show onboard modal if needed
  setTimeout(() => openOnboard(false), 100);
});

// ------------------------------
// Lightweight self-tests (dev)
// ------------------------------
(function runSelfTests() {
  try {
    console.assert(typeof routes.wallet === 'function', 'route wallet missing');
    console.assert(typeof routes.swap === 'function', 'route swap missing');
    console.assert(typeof routes.factory === 'function', 'route factory missing');
    console.assert(typeof routes.protocol === 'function', 'route protocol missing');
    console.assert(typeof routes.council === 'function', 'route council missing');
    console.assert(typeof routes.faucet === 'function', 'route faucet missing');
    console.assert(document.querySelectorAll('#nav a').length >= 7, 'nav items missing');

    const ctx = getContext();
    ctx.state.factory = ctx.state.factory || {};
    const s = (ctx.state.factory.allocMinima?.m || 0) + (ctx.state.factory.allocMinima?.sm || 0) + (ctx.state.factory.allocMinima?.x || 0);
    console.assert(s === (ctx.state.factory.mintAmount || 0), 'factory allocMinima must sum to mintAmount');
  } catch (e) {
    console.error('Self-tests failed', e);
  }
})();




