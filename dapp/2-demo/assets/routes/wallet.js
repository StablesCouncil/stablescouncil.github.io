// WALLET.JS - REBUILT FROM template_complete.html HTML
// Taking EXACT HTML structure from template, replacing only data values

function renderWallet(ctx) {
  console.log('🎯 WALLET.JS - TEMPLATE VERSION LOADED!');
  const { $, app, state, fmt } = ctx;

  // Clear page headers
  $('pageTitle').textContent = '';
  $('pageDesc').textContent = '';

  // Payment currencies data
  const paymentAssets = [
    { key: 'm', label: 'mUSD', qty: state.balances.m, rate: 1 },
    { key: 'cad', label: 'mCAD', qty: state.balances.cad, rate: state.prices.mCAD || 1.42 },
    { key: 'eur', label: 'mEUR', qty: state.balances.eur, rate: state.prices.mEUR || 0.85 },
    { key: 'chf', label: 'mCHF', qty: state.balances.chf, rate: state.prices.mCHF || 0.74 }
  ];

  const defaultCurrency = localStorage.getItem('defaultCurrency') || 'm';
  const defaultInfo = paymentAssets.find(a => a.key === defaultCurrency) || paymentAssets[0];

  // Calculate total
  const totalValue = paymentAssets.reduce((sum, a) => {
    return sum + (a.qty / a.rate) * defaultInfo.rate;
  }, 0);

  window.selectedWalletAsset = window.selectedWalletAsset || defaultCurrency;

  // EXACT HTML FROM template_complete.html - ONLY replace data
  app.innerHTML = `
    <div style="display:grid; gap:14px;">
      
      <!-- Column Headers (240px + 110px + 110px) -->
      <div style="display:flex; justify-content:space-between; color:var(--muted); font-size:11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 0;">
        <div style="width:240px;">Payment Currency</div>
        <div style="width:110px; text-align:right;">Quantity</div>
        <div style="width:110px; text-align:right;">Value (${defaultInfo.label})</div>
      </div>

      ${paymentAssets.map((r, i) => {
    const isDefault = r.key === defaultCurrency;
    const isSelected = r.key === window.selectedWalletAsset;
    const valueInDefault = (r.qty / r.rate) * defaultInfo.rate;

    return `
      <!-- Content Row ${i + 1} ${isDefault ? '(Selected)' : ''} -->
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding: 12px; background: ${isDefault ? 'rgba(103,232,249,.08)' : 'rgba(103,232,249,.03)'}; border-radius: 12px; border: 1px solid ${isDefault ? 'rgba(103,232,249,.25)' : 'rgba(103,232,249,.10)'}; cursor: pointer;"
           onclick="window.selectWalletAsset('${r.key}')">
        <div style="width:240px; display:flex; align-items:center; gap:10px;">
          <input type="radio" name="demo" ${isSelected ? 'checked' : ''} style="flex-shrink: 0;" onchange="window.selectWalletAsset('${r.key}')" />
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight:900; color:var(--text); font-size: 14px;">${r.label}</span>
            ${isDefault
        ? '<span style="background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700;">DEFAULT</span>'
        : '<button type="button" onclick="event.stopPropagation(); window.setDefaultCurrency(\'' + r.key + '\')" style="font-size: 9px; padding: 3px 8px; border-radius: 4px; background: transparent; color: var(--muted); border: 1px solid rgba(159, 176, 192, 0.3); cursor: pointer; font-weight: 600;">Set Default</button>'
      }
          </div>
        </div>
        <div style="width:110px; text-align:right; font-weight:900; font-size: 14px;">${fmt(r.qty)}</div>
        <div style="width:110px; text-align:right; font-weight:900; font-size: 14px;">${fmt(valueInDefault)}</div>
      </div>
        `;
  }).join('')}

      <!-- Total Section -->
      <div style="margin-top: 10px; padding: 14px 10px; border-radius: 12px; background: rgba(11,15,20,.25);">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size: 14px; font-weight: 800; color: var(--text); text-transform: uppercase; letter-spacing: 0.5px;">Total Balance</div>
          <div style="font-size: 18px; font-weight: 900;">${fmt(totalValue)} <span style="font-size: 13px; color: var(--muted); font-weight: 700;">${defaultInfo.label}</span></div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 10px;">
        <button class="primary" id="openSend" style="padding: 16px; font-size: 16px; font-weight: 900;">Send</button>
        <button class="ghost" id="openReceive" style="padding: 16px; font-size: 16px; font-weight: 900;">Receive</button>
        <button class="ghost" id="openSwap" style="padding: 16px; font-size: 16px; font-weight: 900;">Swap</button>
      </div>

    </div>
  `;

  // Event handlers - keep original logic
  $('openSend').onclick = () => {
    $('sendModal').style.display = 'flex';
  };

  $('openReceive').onclick = () => {
    $('receiveModal').style.display = 'flex';
  };

  $('openSwap').onclick = () => {
    location.hash = '#/swap';
  };
}

// Global functions
window.selectWalletAsset = (key) => {
  window.selectedWalletAsset = key;
  window.StablesApp?.render();
};

window.setDefaultCurrency = (key) => {
  localStorage.setItem('defaultCurrency', key);
  window.StablesApp?.render();
  showToast('Default Currency', `Set to ${key.toUpperCase()}`);
};

// Export
window.StablesRoutes = window.StablesRoutes || {};
window.StablesRoutes.renderWallet = renderWallet;




