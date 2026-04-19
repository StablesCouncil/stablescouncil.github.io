function renderFaucet(ctx) {
  const { $, app, setHeaderButtons, faucetGrant, navigate, safeRender } = ctx;

  // ✅ LIBRARY COMPLIANT: No page title/description
  $('pageTitle').textContent = '';
  $('pageDesc').textContent = '';
  setHeaderButtons([]);

  // ✅ LIBRARY COMPLIANT: Main container with gap: 14px (removed .stack and .card)
  // ✅ Minimalist: Just the button, no explanations
  app.innerHTML = `
    <div style="display:grid; gap:14px;">
      <!-- ✅ BTN-001: Primary button (padding: 16px, font: 16px / 900, full-width) -->
      <button class="primary" id="claimBtn" style="padding: 16px; font-size: 16px; font-weight: 900; width: 100%;">Get 10,000 test MINIMA</button>
    </div>
  `;

  $('claimBtn').onclick = () => {
    faucetGrant(10000);
    navigate('wallet');
    safeRender();
  };
}

window.StablesRoutes = window.StablesRoutes || {};
window.StablesRoutes.renderFaucet = renderFaucet;




