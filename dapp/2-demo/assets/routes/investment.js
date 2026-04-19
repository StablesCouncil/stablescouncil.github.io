function renderInvestment(ctx) {
  const { $, app, state, fmt, setHeaderButtons, open } = ctx;

  // ✅ LIBRARY COMPLIANT: No page title/description
  $('pageTitle').textContent = '';
  $('pageDesc').textContent = '';
  setHeaderButtons([]);

  // Invest page options
  const investOptions = [
    { key: 'xwiniwa', label: 'xWiniwa Position', desc: 'Equity-like position, no fixed yield.', qty: state.balances.x, price: state.prices.xMinimaUSD, lev: state.metrics.leverageX },
    { key: 'coverage', label: 'Coverage Fund', desc: 'cUSD tokens, earn fees with conversion risk.', qty: 0, price: 1, lev: null },
    { key: 'lp', label: 'Liquidity Fund', desc: 'Winiwa/xWiniwa LP pair (planned)', qty: 0, price: 0, lev: null },
  ];

  const totalValue = investOptions.reduce((a, r) => a + (r.qty * r.price), 0);

  // Store selected asset in global state for modal interaction
  window.selectedWalletAsset = window.selectedWalletAsset || 'minima';

  // ✅ LIBRARY COMPLIANT: Main container with gap: 14px (removed .stack and .card)
  app.innerHTML = `
    <div style="display:grid; gap:14px;">
      <!-- ✅ TXT-002: Column Headers (11px / 600 / uppercase / 0.5px spacing) -->
      <div style="display:flex; justify-content:space-between; color:var(--muted); font-size:11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 0;">
        <div style="width:240px; padding-left: 0;">Protocol Currency</div>
        <div style="width:110px; text-align:right">Quantity</div>
        <div style="width:110px; text-align:right">Value (mUSD)</div>
      </div>

      <!-- ✅ LAY-002: Asset Rows (220px / 110px / 110px, padding: 12px, gap: 12px) -->
      ${investOptions.map(r => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding: 12px; background: rgba(103,232,249,.03); border-radius: 12px; border: 1px solid rgba(103,232,249,.10); cursor: pointer;"
             onclick="window.selectWalletAsset('${r.key}')">
          <div style="width:240px; display:flex; align-items:center; gap:6px; justify-content:flex-start;">
            <!-- ✅ INP-003: Radio button with flex-shrink: 0 -->
            <input type="radio" name="walletAsset" value="${r.key}" ${window.selectedWalletAsset === r.key ? 'checked' : ''}
                   onchange="window.selectWalletAsset('${r.key}')" style="flex-shrink: 0; margin: 0;" />
            <div style="display: flex; flex-direction: column; gap: 2px; flex: 1; padding-left: 8px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <!-- ✅ Content text: 14px / 900 -->
                <span style="font-weight:900; color:var(--text); font-size: 14px;">${r.label}</span>
                <!-- ✅ TAG-003: LEV badge (9px / 700) -->
                ${r.lev ? `<span style="background: rgba(251, 191, 36, 0.15); color: var(--warn); padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700;">LEV ${r.lev.toFixed(1)}×</span>` : ''}
              </div>
              <div style="font-size: 11px; color: var(--muted);">${r.desc}</div>
            </div>
          </div>
          <!-- ✅ Values: 14px / 900, right-aligned, 110px width -->
          <div style="width:110px; text-align:right; font-weight:900; font-size: 14px;">${r.key === 'lp' ? '-' : fmt(r.qty)}</div>
          <div style="width:110px; text-align:right; font-weight:900; font-size: 14px;">${r.key === 'lp' ? '-' : fmt(r.qty * r.price)}</div>
        </div>
      `).join('')}
      
      <!-- ✅ Total Section: rgba(11,15,20,.25) background, margin-top: 10px, padding: 14px 10px, NO border-top -->
      <div style="margin-top: 10px; padding: 14px 10px; border-radius: 12px; background: rgba(11,15,20,.25);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <!-- ✅ Total label: 14px / 800 / uppercase / 0.5px spacing -->
          <div style="font-size: 14px; font-weight: 800; color: var(--text); text-transform: uppercase; letter-spacing: 0.5px;">Total Investment Value</div>
          <!-- ✅ Total value: 18px / 900 -->
          <div style="font-size: 18px; font-weight: 900;">${fmt(totalValue)} <span style="font-size: 13px; color: var(--muted); font-weight: 700;">mUSD</span></div>
        </div>
      </div>

      <!-- ✅ LAY-001: 3-Button Grid (1fr 1fr 1fr, gap: 12px, margin-top: 10px) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 10px;">
        <!-- ✅ BTN-001: Primary button (padding: 16px, font: 16px / 900) -->
        <button class="primary" id="openSend" style="padding: 16px; font-size: 16px; font-weight: 900;">Send</button>
        <!-- ✅ BTN-002: Ghost buttons (padding: 16px, font: 16px / 900) -->
        <button class="ghost" id="openReceive" style="padding: 16px; font-size: 16px; font-weight: 900;">Receive</button>
        <button class="ghost" id="openSwap" style="padding: 16px; font-size: 16px; font-weight: 900;">Swap</button>
      </div>
    </div>
  `;

  // Event handlers
  $('openReceive').onclick = () => {
    const ra = $('recvAddr');
    if (ra) ra.textContent = state.wallet.address;

    const recvSelect = $('recvAsset');
    if (recvSelect) recvSelect.value = window.selectedWalletAsset;

    window.generateReceiveQR(state.wallet.address);

    open('recvBackdrop');
  };

  $('openSend').onclick = () => {
    const sendSelect = $('sendAsset');
    if (sendSelect) sendSelect.value = window.selectedWalletAsset;

    open('sendBackdrop');
  };

  $('openSwap').onclick = () => {
    location.hash = '#/swap';
  };
}

window.StablesRoutes = window.StablesRoutes || {};
window.StablesRoutes.renderInvestment = renderInvestment;




