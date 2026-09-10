function renderFaucet(ctx) {
  const { $, app, setHeaderButtons, faucetGrant, navigate, safeRender } = ctx;

  // ✅ LIBRARY COMPLIANT: No page title/description
  $('pageTitle').textContent = 'Faucet (test)';
  $('pageDesc').textContent = '';
  setHeaderButtons([]);

  // ✅ LIBRARY COMPLIANT: Main container with gap: 14px (removed .stack and .card)
  const appRegistry = window.__STABLES_TV81_APP_REGISTRY__ || { ready: false, status: 'LOADING' };
  const projected = appRegistry.registry || {};
  const assets = projected.assets || {};
  const faucet = projected.faucet || {};
  const reg = (window.STABLES_CONFIG && window.STABLES_CONFIG.TEST_TOKEN_REGISTRY) || {};
  const amtAtoms = faucet.claim_amount_atoms;
  const amt = amtAtoms == null ? null : String(amtAtoms);
  const winiwaId = (assets.WINIWA && assets.WINIWA.token_id) || reg.winiwa_token_id || '';
  const usdwId = (assets.USDW && assets.USDW.token_id) || reg.usdw_token_id || '';
  const xwiniwaId = (assets.XWINIWA && assets.XWINIWA.token_id) || reg.xwiniwa_token_id || '';
  const faucetCovenant = faucet.address || reg.faucet_covenant_address || '';
  const ready = appRegistry.ready === true && !!winiwaId && !!faucetCovenant && amt != null;
  const ref = (value, missing) => value
    ? `<a href="${explorerBase}${value}" target="_blank" style="color:var(--c)"><code>${value}</code></a>`
    : `<span style="color:var(--muted)">${missing}</span>`;
  const explorerBase = 'https://explorer.minima.global/search?q=';
  app.innerHTML = `
    <div style="display:grid; gap:14px">
      <!-- ✅ BTN-001: Primary button (padding: 16px, font: 16px / 900, full-width) -->
      <button class="primary" id="claimBtn" ${ready ? '' : 'disabled'} style="padding: 16px; font-size: 16px; font-weight: 900; width: 100%;">${ready ? `Get Winiwa` : 'Faucet not deployed'}</button>

      <div style="border:1px solid rgba(103,232,249,0.3); border-radius:8px; padding:12px; font-size:13px; background:rgba(16,24,38,0.6)">
        <div style="font-weight:700; margin-bottom:8px">TestV008 protocol identities</div>
        <div style="margin-bottom:8px; color:${ready ? 'var(--ok)' : 'var(--muted)'}">${ready ? 'Deployed, behavior unverified' : (appRegistry.reason || 'Loading the TestV008 registry…')}</div>
        <div style="margin-bottom:6px"><strong>Winiwa</strong> (faucet base)<br>
          Token: ${ref(winiwaId, 'Not deployed')}<br>
          Faucet covenant/pool: ${ref(faucetCovenant, 'Not deployed')}
        </div>
        <div style="margin-bottom:6px"><strong>USDw</strong> (minted at market-rated Winiwa collateral)<br>
          Token: ${ref(usdwId, 'Not deployed')}
        </div>
        <div style="margin-bottom:6px"><strong>xWiniwa</strong> (equity, locked Winiwa)<br>
          Token: ${ref(xwiniwaId, 'Not deployed')}
        </div>
        <div style="margin-top:8px; font-size:12px; opacity:0.8">
          Registry: TV81-REGISTRY-001 · ABI: TV81-ABI-001<br>
          Missing identities never fall back to a historical generation.
        </div>
      </div>
    </div>
  `;

  $('claimBtn').onclick = () => {
    if (!ready) {
      if (typeof showToast === 'function') showToast('TestV008 faucet is not deployed yet.', { tone: 'amber', durationMs: 6000 });
      return;
    }
    // In 3-test/ tree for test channel, the pour MUST trigger on-chain covenant tx. Never fall to demo local-only.
    if (typeof window.__STABLES_TEST_CLAIM_FAUCET_WINIWA__ === 'function') {
      const p = window.__STABLES_TEST_CLAIM_FAUCET_WINIWA__();
      if (p && typeof p.catch === 'function') {
        p.catch(function (e) {
          if (typeof showToast === 'function') {
            showToast((e && e.message) ? e.message : 'Faucet claim failed', { tone: 'amber', durationMs: 6000 });
          }
        });
      }
      navigate('wallet');
      safeRender();
      return;
    }
    // If not ready, at least try to register or show clear message. Do not grant demo 10k.
    if (typeof showToast === 'function') {
      showToast('On-chain test claim not ready. Ensure test-channel-bootstrap.js loaded and node connected.', { tone: 'amber', durationMs: 8000 });
    }
    navigate('wallet');
    safeRender();
  };
}

window.StablesRoutes = window.StablesRoutes || {};
window.StablesRoutes.renderFaucet = renderFaucet;



