function renderCouncil(ctx) {
  const { $, app, state, showToast, safeRender, setHeaderButtons } = ctx;

  // ✅ LIBRARY COMPLIANT: No page title/description
  $('pageTitle').textContent = '';
  $('pageDesc').textContent = '';
  setHeaderButtons([]);

  const p = state.params.coverage;

  // ✅ LIBRARY COMPLIANT: Main container with gap: 14px (removed .stack and .card)
  app.innerHTML = `
    <div style="display:grid; gap:14px;">
      <!-- Progress Bar -->
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
          <div style="color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Stability Progress</div>
          <div style="font-size: 14px; font-weight: 900;">${Math.round(Math.max(0, Math.min(1, Number(state.metrics.stabilityProgress || 0))) * 100)}%</div>
        </div>
        <div style="height:14px; border-radius:999px; border:1px solid rgba(34,48,68,.85); background:rgba(11,15,20,.35); overflow:hidden">
          <div style="height:100%; width:${Math.round(Math.max(0, Math.min(1, Number(state.metrics.stabilityProgress || 0))) * 100)}%; background:rgba(103,232,249,.25)"></div>
        </div>
      </div>

      <!-- Divider -->
      <div class="hr"></div>

      <!-- Coverage Policy -->
      <div>
        <div style="color: var(--muted); font-size: 12px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Coverage Policy</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <div style="color: var(--muted); font-size: 12px; margin-bottom: 6px;">Minimum</div>
            <!-- ✅ TXT-001: KPI Display (32px / 900) -->
            <div style="font-size: 32px; font-weight: 900; line-height: 1.1;">${p.min.toFixed(2)}×</div>
          </div>
          <div>
            <div style="color: var(--muted); font-size: 12px; margin-bottom: 6px;">Target (minting)</div>
            <div style="font-size: 32px; font-weight: 900; line-height: 1.1;">${p.targetMint.toFixed(2)}×</div>
          </div>
          <div>
            <div style="color: var(--muted); font-size: 12px; margin-bottom: 6px;">Maintenance</div>
            <div style="font-size: 32px; font-weight: 900; line-height: 1.1;">${p.maintenance.toFixed(2)}×</div>
          </div>
          <div>
            <div style="color: var(--muted); font-size: 12px; margin-bottom: 6px;">Rebalance trigger</div>
            <div style="font-size: 32px; font-weight: 900; line-height: 1.1;">${p.rebalanceTrigger.toFixed(2)}×</div>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="hr"></div>

      <!-- Edit Form (collapsible) -->
      <details>
        <summary style="cursor: pointer; font-weight: 700; font-size: 14px;">Edit Policy</summary>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px;">
          <div>
            <label for="crMin" style="display: block; color: var(--muted); font-size: 12px; margin-bottom: 6px;">Minimum</label>
            <!-- ✅ INP-001: Text input (auto-styled) -->
            <input id="crMin" type="number" min="1" step="0.01" value="${p.min.toFixed(2)}" />
          </div>
          <div>
            <label for="crTarget" style="display: block; color: var(--muted); font-size: 12px; margin-bottom: 6px;">Target to mint</label>
            <input id="crTarget" type="number" min="1" step="0.01" value="${p.targetMint.toFixed(2)}" />
          </div>
          <div>
            <label for="crMaint" style="display: block; color: var(--muted); font-size: 12px; margin-bottom: 6px;">Maintenance</label>
            <input id="crMaint" type="number" min="1" step="0.01" value="${p.maintenance.toFixed(2)}" />
          </div>
          <div>
            <label for="crRebal" style="display: block; color: var(--muted); font-size: 12px; margin-bottom: 6px;">Rebalance</label>
            <input id="crRebal" type="number" min="1" step="0.01" value="${p.rebalanceTrigger.toFixed(2)}" />
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;">
          <!-- ✅ BTN-001 & BTN-002 -->
          <button class="primary" id="applyCR" style="padding: 16px; font-size: 16px; font-weight: 900;">Apply</button>
          <button class="ghost" id="resetCR" style="padding: 16px; font-size: 16px; font-weight: 900;">Reset</button>
        </div>
      </details>

      <!-- Divider -->
      <div class="hr"></div>

      <!-- Emergency Actions -->
      <div>
        <div style="color: var(--muted); font-size: 12px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Emergency Actions</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <button class="ghost" id="pauseMint" style="padding: 16px; font-size: 16px; font-weight: 900;">Pause Mint</button>
          <button class="ghost" id="pauseBurn" style="padding: 16px; font-size: 16px; font-weight: 900;">Pause Burn</button>
          <button class="primary" id="publishNotice" style="padding: 16px; font-size: 16px; font-weight: 900;">Publish Notice</button>
        </div>
      </div>
    </div>
  `;

  $('applyCR').onclick = () => {
    const min = Number($('crMin').value);
    const target = Number($('crTarget').value);
    const maint = Number($('crMaint').value);
    const rebal = Number($('crRebal').value);

    if (![min, target, maint, rebal].every(v => Number.isFinite(v) && v >= 1)) {
      return showToast('Council', 'All ratios must be ≥ 1.00');
    }
    if (!(min <= rebal && rebal <= maint && maint <= target)) {
      return showToast('Council', 'Order expected: min ≤ rebalance ≤ maintenance ≤ target.');
    }

    state.params.coverage.min = min;
    state.params.coverage.targetMint = target;
    state.params.coverage.maintenance = maint;
    state.params.coverage.rebalanceTrigger = rebal;

    showToast('Council', 'Coverage policy applied.');
    safeRender();
  };

  $('resetCR').onclick = () => {
    state.params.coverage = { min: 1.05, targetMint: 1.20, maintenance: 1.10, rebalanceTrigger: 1.08 };
    showToast('Council', 'Reset to defaults.');
    safeRender();
  };

  $('pauseMint').onclick = () => showToast('Council', 'Mint pause toggled.');
  $('pauseBurn').onclick = () => showToast('Council', 'Burn pause toggled.');
  $('publishNotice').onclick = () => showToast('Council', 'Notice published.');
}

window.StablesRoutes = window.StablesRoutes || {};
window.StablesRoutes.renderCouncil = renderCouncil;




