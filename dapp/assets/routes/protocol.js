function renderProtocol(ctx) {
  const { $, app, state, fmt, coverageRatio, coverageStatus, setHeaderButtons } = ctx;

  // ✅ LIBRARY COMPLIANT: No page title/description
  $('pageTitle').textContent = '';
  $('pageDesc').textContent = '';
  setHeaderButtons([]);

  const remaining = Math.max(0, state.caps.globalMintCap - state.caps.mintedTotal);
  const stableSupply = (state.balances.m || 0) + (state.balances.sm || 0);
  const cr = coverageRatio();
  const covTxt = Number.isFinite(cr) ? `${cr.toFixed(2)}×` : '∞';
  const cs = coverageStatus(cr);

  // ✅ LIBRARY COMPLIANT: Main container with gap: 14px (removed .stack and .card)
  app.innerHTML = `
    <div style="display:grid; gap:14px;">
      <!-- Coverage Ratio Section -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <div style="color: var(--muted); font-size: 12px; margin-bottom: 6px;">Current Coverage</div>
          <!-- ✅ TXT-001: KPI Display (32px / 900) -->
          <div style="font-size: 32px; font-weight: 900; line-height: 1.1;">${covTxt}</div>
          <div style="color: ${cs.color}; font-size: 14px; font-weight: 700; margin-top: 8px;">${cs.label}</div>
        </div>
        <div>
          <div style="color: var(--muted); font-size: 12px; margin-bottom: 6px;">Thresholds</div>
          <div style="color: var(--muted); font-size: 12px; margin-top: 8px;">Minimum: <strong>${state.params.coverage.min.toFixed(2)}×</strong></div>
          <div style="color: var(--muted); font-size: 12px;">Target: <strong>${state.params.coverage.targetMint.toFixed(2)}×</strong></div>
          <div style="color: var(--muted); font-size: 12px;">Maintenance: <strong>${state.params.coverage.maintenance.toFixed(2)}×</strong></div>
          <div style="color: var(--muted); font-size: 12px;">Rebalance: <strong>${state.params.coverage.rebalanceTrigger.toFixed(2)}×</strong></div>
        </div>
      </div>

      <!-- Divider -->
      <div class="hr"></div>

      <!-- High-level Snapshot -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <div style="color: var(--muted); font-size: 12px; margin-bottom: 6px;">Total Collateral</div>
          <!-- ✅ TXT-001: KPI Display (32px / 900) -->
          <div style="font-size: 32px; font-weight: 900; line-height: 1.1;">$<span id="totalCollatUsd">${fmt(state.mint.deposited * state.prices.minimaUSD)}</span></div>
          <div style="color: var(--muted); font-size: 12px; margin-top: 4px;">${fmt(state.mint.deposited)} MINIMA</div>
        </div>
        <div>
          <div style="color: var(--muted); font-size: 12px; margin-bottom: 6px;">Global Headroom</div>
          <!-- ✅ TXT-001: KPI Display (32px / 900) -->
          <div style="font-size: 32px; font-weight: 900; line-height: 1.1;">${fmt(remaining)}</div>
        </div>
      </div>

      <!-- Divider -->
      <div class="hr"></div>

      <!-- Supplies -->
      <div>
        <div style="color: var(--muted); font-size: 12px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Supplies</div>
        <div style="color: var(--muted); font-size: 12px; margin-top: 6px;">mUSD: <strong>${fmt(state.balances.m)}</strong></div>
        <div style="color: var(--muted); font-size: 12px;">smUSD: <strong>${fmt(state.balances.sm)}</strong></div>
        <div style="color: var(--muted); font-size: 12px;">Stables supply: <strong>${fmt(stableSupply)}</strong></div>
        <div style="color: var(--muted); font-size: 12px;">xMINIMA: <strong>${fmt(state.balances.x)}</strong></div>
      </div>
    </div>
  `;
}

window.StablesRoutes = window.StablesRoutes || {};
window.StablesRoutes.renderProtocol = renderProtocol;




