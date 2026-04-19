function renderSwap(ctx) {
  const { $, app, state, fmt, tokenPriceUSD, showToast, navigate, safeRender, setHeaderButtons } = ctx;

  // ✅ LIBRARY COMPLIANT: No page title/description
  $('pageTitle').textContent = '';
  $('pageDesc').textContent = '';
  setHeaderButtons([]);

  if (!state.swap) {
    // Default: mEUR → mUSD
    state.swap = { from: 'eur', to: 'm', fromAmt: 0, toAmt: 0, lastEdited: 'from' };
  }

  // Exchange rates (relative to mUSD = 1.00)
  const exchangeRates = {
    'm': 1.00,      // mUSD
    'eur': 1.17,    // mEUR
    'cad': 0.705,   // mCAD
    'chf': 1.35,    // mCHF
    'minima': 0.50, // MINIMA (placeholder)
    'sm': 1.00,     // smUSD (1:1 with mUSD)
    'x': 0.50,      // xMINIMA (placeholder)
  };

  // Transaction fee (0.1% = 0.001)
  const FEE_RATE = 0.001;

  // All currencies: payment + protocol
  const assets = [
    { k: 'm', label: 'mUSD' },
    { k: 'eur', label: 'mEUR' },
    { k: 'cad', label: 'mCAD' },
    { k: 'chf', label: 'mCHF' },
    { k: 'minima', label: 'MINIMA' },
    { k: 'sm', label: 'smUSD' },
    { k: 'x', label: 'xMINIMA' },
  ];

  // Get exchange rates
  const fromRate = exchangeRates[state.swap.from] || 1;
  const toRate = exchangeRates[state.swap.to] || 1;

  // Calculate conversion
  let fromAmt = Number(state.swap.fromAmt || 0);
  let toAmt = Number(state.swap.toAmt || 0);

  if (state.swap.lastEdited === 'from' && fromAmt > 0) {
    // Calculate toAmt from fromAmt
    toAmt = (fromAmt * fromRate) / toRate;
  } else if (state.swap.lastEdited === 'to' && toAmt > 0) {
    // Calculate fromAmt from toAmt
    fromAmt = (toAmt * toRate) / fromRate;
  }

  // Calculate fee
  const fee = fromAmt * FEE_RATE;
  const fromAmtAfterFee = fromAmt - fee;

  const fromBal = state.balances[state.swap.from] || 0;
  const canSwap = fromAmt > 0 && fromAmt <= fromBal && state.swap.from !== state.swap.to;

  // ✅ LIBRARY COMPLIANT: Main container with gap: 14px
  app.innerHTML = `
    <div style="display:grid; gap:14px;">
      <!-- Send Section -->
      <div>
        <div style="color: var(--muted); font-size: 12px; margin-bottom: 6px;">Send</div>
        <div style="display:grid; grid-template-columns: 1fr 140px; gap:10px">
          <!-- ✅ INP-001: Text input (padding: 10px 12px, border-radius: 14px) -->
          <input id="swapFromAmt" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0.00" value="${fromAmt > 0 ? fromAmt : ''}" />
          <!-- ✅ INP-002: Select dropdown -->
          <select id="swapFrom">
            ${assets.map(a => `<option value="${a.k}" ${a.k === state.swap.from ? 'selected' : ''}>${a.label}</option>`).join('')}
          </select>
        </div>
        <div class="muted" style="margin-top:8px; font-size: 12px;">Balance: <strong>${fmt(fromBal)}</strong></div>
      </div>

      <!-- Swap Arrow Button -->
      <div style="display: flex; justify-content: center; margin: -8px 0;">
        <button id="swapDirection" style="background: rgba(103,232,249,.1); border: 1px solid rgba(103,232,249,.3); border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; color: var(--accent);" title="Swap currencies">↕</button>
      </div>

      <!-- Receive Section -->
      <div>
        <div style="color: var(--muted); font-size: 12px; margin-bottom: 6px;">Receive</div>
        <div style="display:grid; grid-template-columns: 1fr 140px; gap:10px">
          <!-- ✅ INP-001: Text input (now editable) -->
          <input id="swapToAmt" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="0.00" value="${toAmt > 0 ? toAmt : ''}" />
          <!-- ✅ INP-002: Select dropdown -->
          <select id="swapTo">
            ${assets.map(a => `<option value="${a.k}" ${a.k === state.swap.to ? 'selected' : ''}>${a.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Exchange Rate Info -->
      <div style="padding: 12px; background: rgba(103,232,249,.03); border-radius: 12px; border: 1px solid rgba(103,232,249,.10);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: var(--muted); font-size: 12px;">Exchange Rate</span>
          <span style="font-size: 12px; font-weight: 700;">1 ${assets.find(a => a.k === state.swap.from)?.label || ''} = ${(fromRate / toRate).toFixed(4)} ${assets.find(a => a.k === state.swap.to)?.label || ''}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: var(--muted); font-size: 12px;">Transaction Fee (0.1%)</span>
          <span style="font-size: 12px; font-weight: 700; color: ${fee > 0 ? '#ef4444' : 'var(--muted)'};">${fee > 0 ? fmt(fee) : '0.00'} ${assets.find(a => a.k === state.swap.from)?.label || ''}</span>
        </div>
      </div>

      <!-- ✅ Divider -->
      <div class="hr"></div>

      <!-- ✅ BTN-001: Primary button (padding: 16px, font: 16px / 900) -->
      <button class="primary" id="doSwap" style="padding: 16px; font-size: 16px; font-weight: 900; width: 100%;" ${canSwap ? '' : 'disabled'}>Swap</button>
    </div>
  `;

  const sanitizeNum = (s) => {
    const raw = String(s || '').replace(',', '.');
    const clean = raw.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
    return clean;
  };

  // Event handlers - bidirectional conversion
  const fromAmtInput = $('swapFromAmt');
  const toAmtInput = $('swapToAmt');
  const fromSelect = $('swapFrom');
  const toSelect = $('swapTo');

  // From amount input
  fromAmtInput.addEventListener('input', (e) => {
    const val = sanitizeNum(e.target.value);
    e.target.value = val;
    state.swap.fromAmt = val;
    state.swap.lastEdited = 'from';
    safeRender();
  });

  // To amount input (now editable!)
  toAmtInput.addEventListener('input', (e) => {
    const val = sanitizeNum(e.target.value);
    e.target.value = val;
    state.swap.toAmt = val;
    state.swap.lastEdited = 'to';
    safeRender();
  });

  // Currency selects
  fromSelect.addEventListener('change', (e) => {
    state.swap.from = e.target.value;
    safeRender();
  });

  toSelect.addEventListener('change', (e) => {
    state.swap.to = e.target.value;
    safeRender();
  });

  // Swap direction button - flip currencies and preserve amounts
  $('swapDirection').addEventListener('click', () => {
    const tempFrom = state.swap.from;
    const tempFromAmt = state.swap.fromAmt;

    state.swap.from = state.swap.to;
    state.swap.to = tempFrom;

    // Swap amounts too
    state.swap.fromAmt = state.swap.toAmt;
    state.swap.toAmt = tempFromAmt;

    // Keep last edited state
    state.swap.lastEdited = state.swap.lastEdited === 'from' ? 'to' : 'from';

    safeRender();
  });

  // Swap button
  $('doSwap').addEventListener('click', () => {
    if (!canSwap) return;

    // In a real implementation, this would execute the swap
    // For now, show a toast
    showToast(
      'Swap',
      `Swapping ${fmt(fromAmt)} ${assets.find(a => a.k === state.swap.from)?.label} → ${fmt(toAmt)} ${assets.find(a => a.k === state.swap.to)?.label}`
    );

    // Reset
    state.swap.fromAmt = 0;
    state.swap.toAmt = 0;
    safeRender();
  });
}

// Export
window.StablesRoutes = window.StablesRoutes || {};
window.StablesRoutes.renderSwap = renderSwap;




