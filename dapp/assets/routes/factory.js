const allocKeys = ['m', 'sm', 'x'];

function portfolioSnapshot(state, tokenQtyFromMinimaValue, mult, includePendingMint) {
  const m = Math.max(0, 1 + Number(mult || 0));
  const pMin = state.prices.minimaUSD * m;
  const pX = (state.prices.minimaUSD / 4) * m;

  let qMin = Number(state.balances.minima || 0);
  let qM = Number(state.balances.m || 0);
  let qSM = Number(state.balances.sm || 0);
  let qX = Number(state.balances.x || 0);
  let vDeposit = Number(state.mint.deposited || 0);

  if (includePendingMint) {
    const amt = Math.max(0, Math.floor(Number(state.factory.mintAmount || 0)));
    qMin = Math.max(0, qMin - amt);
    vDeposit = vDeposit + amt;
    qX = qX + tokenQtyFromMinimaValue('x', state.factory.allocMinima.x);
    qSM = qSM + tokenQtyFromMinimaValue('sm', state.factory.allocMinima.sm);
    qM = qM + tokenQtyFromMinimaValue('m', state.factory.allocMinima.m);
  }

  const usdMin = qMin * pMin;
  const usdX = qX * pX;
  const usdM = qM * 1;
  const usdSM = qSM * 1;
  const usdMint = vDeposit * pMin;

  const total = usdMin + usdX + usdM + usdSM + usdMint;

  const StablesUSD = usdM + usdSM;
  const cr = StablesUSD > 0 ? (usdMint / StablesUSD) : Infinity;
  const zone = (!Number.isFinite(cr)) ? 'none' : (cr >= state.params.coverage.maintenance ? 'ok' : (cr >= state.params.coverage.rebalanceTrigger ? 'maint' : 'rebal'));

  return {
    prices: { pMin, pX },
    qty: { minima: qMin, m: qM, sm: qSM, x: qX, mint: vDeposit },
    usd: { minima: usdMin, m: usdM, sm: usdSM, x: usdX, mint: usdMint },
    total,
    cr,
    zone,
  };
}

function portfolioSeries(state, tokenQtyFromMinimaValue, includePendingMint) {
  const xs = [];
  for (let pct = -50; pct <= 50; pct += 5) {
    const snap = portfolioSnapshot(state, tokenQtyFromMinimaValue, pct / 100, includePendingMint);
    xs.push({ pct, total: snap.total });
  }
  return xs;
}

function renderSimChart(seriesNow, seriesAfter) {
  const w = 720, h = 160, pad = 18;
  const all = [...seriesNow, ...seriesAfter].map(d => d.total);
  const minV = Math.min(...all);
  const maxV = Math.max(...all);
  const span = Math.max(1e-9, maxV - minV);

  const xFor = (pct) => {
    const t = (pct + 50) / 100;
    return pad + t * (w - pad * 2);
  };
  const yFor = (v) => {
    const t = (v - minV) / span;
    return (h - pad) - t * (h - pad * 2);
  };

  const pathFor = (arr) => arr.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(d.pct).toFixed(2)} ${yFor(d.total).toFixed(2)}`).join(' ');

  return `
    <div class="card" style="padding:12px">
      <div class="muted">Portfolio value vs MINIMA price move</div>
      <div style="margin-top:10px">
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="display:block; border-radius:14px; border:1px solid rgba(34,48,68,.75); background:rgba(11,15,20,.18)">
          <line x1="${xFor(0)}" y1="${pad}" x2="${xFor(0)}" y2="${h - pad}" stroke="rgba(159,176,192,.25)" />
          <path d="${pathFor(seriesNow)}" fill="none" stroke="rgba(159,176,192,.55)" stroke-width="3" />
          <path d="${pathFor(seriesAfter)}" fill="none" stroke="rgba(103,232,249,.75)" stroke-width="3" />
        </svg>
      </div>
      <div class="muted" style="margin-top:8px">Grey = current · Cyan = after mint</div>
    </div>
  `;
}

function renderSimBreakdown(snap, fmt, showCR) {
  const rows = [
    { label: 'MINIMA', qty: snap.qty.minima, usd: snap.usd.minima },
    { label: 'mUSD', qty: snap.qty.m, usd: snap.usd.m },
    { label: 'smUSD', qty: snap.qty.sm, usd: snap.usd.sm },
    { label: 'xMINIMA', qty: snap.qty.x, usd: snap.usd.x },
    { label: 'Mint (MINIMA)', qty: snap.qty.mint, usd: snap.usd.mint },
  ];

  const crTxt = Number.isFinite(snap.cr) ? `${snap.cr.toFixed(2)}×` : '∞';
  const zoneLabel = snap.zone === 'ok' ? 'Healthy' : snap.zone === 'maint' ? 'Maintenance' : snap.zone === 'rebal' ? 'Rebalance zone' : 'No Stables supply';
  const zoneColor = snap.zone === 'ok' ? 'var(--good)' : snap.zone === 'maint' ? 'var(--warn)' : snap.zone === 'rebal' ? 'var(--bad)' : 'var(--muted)';

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px">
      <div class="muted">Total</div>
      <div style="font-weight:900; font-size: 14px;">${fmt(snap.total)} <span class="muted" style="font-size:12px">mUSD</span></div>
    </div>
    ${showCR ? `<div class="muted" style="margin-top:8px">Coverage: <strong>${crTxt}</strong> · <strong style="color:${zoneColor}">${zoneLabel}</strong></div>` : ''}
    <div class="hr"></div>
    <div style="display:grid; gap:10px">
      <div style="display:flex; justify-content:space-between; color:var(--muted); font-size:12px">
        <div style="min-width:140px">Asset</div>
        <div style="flex:1; text-align:right">Qty</div>
        <div style="flex:1; text-align:right">Value</div>
      </div>
      ${rows.map(r => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px">
          <div style="min-width:140px; font-weight:900; font-size: 14px;">${r.label}</div>
          <div style="flex:1; text-align:right; font-weight:900; font-size: 14px;">${fmt(r.qty)}</div>
          <div style="flex:1; text-align:right; font-weight:900; font-size: 14px;">${fmt(r.usd)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function allocSlider(state, tokenQtyFromMinimaValue, fmt, key, nameHtml, subtitle) {
  const max = Math.max(0, Math.floor(state.factory.mintAmount || 0));
  const vMin = Math.max(0, Math.floor(state.factory.allocMinima[key] || 0));
  const disabled = max <= 0 ? 'disabled' : '';

  const locked = !!state.factory.locks?.[key];
  const lockLabel = locked ? '🔒' : '🔓';

  const qty = tokenQtyFromMinimaValue(key, vMin);
  const pct = max > 0 ? (vMin / max) * 100 : 0;

  return `
    <div class="asset-row">
      <div class="asset-head">
        <div style="display:flex; align-items:flex-start; gap:10px">
          <button class="iconbtn" id="lock_${key}" title="Lock this slider">${lockLabel}</button>
          <div>
            <div class="asset-name">${nameHtml}</div>
            <div class="asset-sub">${subtitle}</div>
          </div>
        </div>
        <div class="amt" style="text-align:right">
          <div style="font-weight:900" id="alloc_val_hdr_${key}">${fmt(vMin)} <span class="muted" style="font-size:12px">MINIMA</span></div>
          <div class="muted" style="margin-top:2px" id="alloc_pct_${key}">${pct.toFixed(0)}%</div>
        </div>
      </div>

      <div class="asset-controls">
        <div class="line">
          <input id="alloc_rng_${key}" type="range" min="0" max="${max}" value="${vMin}" ${disabled} />
        </div>
        <div class="line" style="justify-content:space-between">
          <span class="muted">0 → ${fmt(max)} MINIMA</span>
          <span class="muted">Minting: <strong id="alloc_qty_${key}">${fmt(qty)}</strong> tokens</span>
        </div>

        <div class="line">
          <div style="flex:1">
            <label for="alloc_in_${key}">Tokens</label>
            <input id="alloc_in_${key}" type="number" inputmode="decimal" autocomplete="off" min="0" step="0.0001" value="${qty}" />
          </div>
          <div style="flex:1">
            <label>Value (MINIMA)</label>
            <div style="padding:10px 12px; border-radius:14px; border:1px solid rgba(34,48,68,.85); background:rgba(11,15,20,.20); font-weight:900; text-align:right" id="alloc_val_${key}">${fmt(vMin)} <span class="muted" style="font-size:12px">MINIMA</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function normalizeFactoryState(state) {
  let amt = Math.max(0, Math.floor(Number(state.factory?.mintAmount || 0)));
  if (!state.factory) state.factory = { mintAmount: amt, allocMinima: { m: 0, sm: 0, x: 0 }, locks: { m: false, sm: false, x: false } };
  if (!state.factory.allocMinima) state.factory.allocMinima = { m: 0, sm: 0, x: 0 };
  if (!state.factory.locks) state.factory.locks = { m: false, sm: false, x: false };

  allocKeys.forEach(k => state.factory.allocMinima[k] = Math.max(0, Math.floor(Number(state.factory.allocMinima[k] || 0))));

  if (amt === 0) {
    state.factory.allocMinima = { m: 0, sm: 0, x: 0 };
    return;
  }

  const lockedKeys = allocKeys.filter(k => state.factory.locks[k]);
  const unlockedKeys = allocKeys.filter(k => !state.factory.locks[k]);

  const lockedTotal = lockedKeys.reduce((a, k) => a + (state.factory.allocMinima[k] || 0), 0);
  if (lockedTotal > amt) {
    const s = lockedTotal || 1;
    lockedKeys.forEach(k => state.factory.allocMinima[k] = Math.floor((state.factory.allocMinima[k] || 0) * amt / s));
  }

  let sum = allocKeys.reduce((a, k) => a + (state.factory.allocMinima[k] || 0), 0);

  if (sum === 0) {
    // Default allocation derived from target coverage ratio.
    // StablesMinimaValue = mintAmount / target; xMINIMA gets the remainder.
    const target = Math.max(1.0, Number(state.params?.coverage?.targetMint || 1.0));
    const StablesMin = Math.floor(amt / target);
    const x = Math.max(0, amt - StablesMin);
    const sm = Math.floor(StablesMin * 0.60);
    const m = Math.max(0, StablesMin - sm);
    state.factory.allocMinima = { m, sm, x };
    return;
  }

  if (sum !== amt) {
    const lockedTotal2 = lockedKeys.reduce((a, k) => a + (state.factory.allocMinima[k] || 0), 0);
    const remainder = Math.max(0, amt - lockedTotal2);

    if (unlockedKeys.length === 0) {
      const first = allocKeys[0];
      state.factory.allocMinima[first] = Math.max(0, (state.factory.allocMinima[first] || 0) + (amt - sum));
      return;
    }

    const baseSum = unlockedKeys.reduce((a, k) => a + (state.factory.allocMinima[k] || 0), 0) || 1;
    const scaled = {};
    unlockedKeys.forEach(k => scaled[k] = Math.floor((state.factory.allocMinima[k] || 0) * remainder / baseSum));
    const s = unlockedKeys.reduce((a, k) => a + scaled[k], 0);
    scaled[unlockedKeys[0]] += (remainder - s);
    unlockedKeys.forEach(k => state.factory.allocMinima[k] = scaled[k]);
  }
}

function setFactoryMintAmount(state, newAmt) {
  newAmt = Math.max(0, Math.floor(Number(newAmt || 0)));
  state.factory.mintAmount = newAmt;

  if (newAmt === 0) {
    state.factory.allocMinima = { m: 0, sm: 0, x: 0 };
    return;
  }

  const lockedKeys = allocKeys.filter(k => state.factory.locks[k]);
  const unlockedKeys = allocKeys.filter(k => !state.factory.locks[k]);
  const lockedTotal = lockedKeys.reduce((a, k) => a + (state.factory.allocMinima[k] || 0), 0);
  const remainder = Math.max(0, newAmt - lockedTotal);

  if (unlockedKeys.length === 0) {
    const first = allocKeys[0];
    const others = allocKeys.reduce((a, k) => a + (k === first ? 0 : (state.factory.allocMinima[k] || 0)), 0);
    state.factory.allocMinima[first] = Math.max(0, newAmt - others);
    normalizeFactoryState(state);
    return;
  }

  const oldUnlockedSum = unlockedKeys.reduce((a, k) => a + (state.factory.allocMinima[k] || 0), 0);

  if (oldUnlockedSum === 0) {
    // Default allocation derived from target coverage ratio.
    const target = Math.max(1.0, Number(state.params?.coverage?.targetMint || 1.0));
    const StablesMin = Math.floor(newAmt / target);
    const xDefault = Math.max(0, newAmt - StablesMin);
    const smDefault = Math.floor(StablesMin * 0.60);
    const mDefault = Math.max(0, StablesMin - smDefault);

    const tmp = { m: 0, sm: 0, x: 0 };
    tmp.x = xDefault;
    tmp.sm = smDefault;
    tmp.m = mDefault;

    // Apply only to unlocked keys, keep locked as-is
    unlockedKeys.forEach(k => state.factory.allocMinima[k] = Math.max(0, Math.floor(tmp[k] || 0)));
    normalizeFactoryState(state);
    return;
  }

  const scaled = {};
  unlockedKeys.forEach(k => scaled[k] = Math.floor((state.factory.allocMinima[k] || 0) * remainder / oldUnlockedSum));
  const s = unlockedKeys.reduce((a, k) => a + scaled[k], 0);
  scaled[unlockedKeys[0]] += (remainder - s);
  unlockedKeys.forEach(k => state.factory.allocMinima[k] = scaled[k]);

  normalizeFactoryState(state);
}

function wireAllocSliders(ctx) {
  const { state, showToast, safeRender, tokenQtyFromMinimaValue, minimaValueFromTokenQty, fmt } = ctx;
  const total = Math.max(0, Math.floor(state.factory.mintAmount || 0));

  // lock toggles
  allocKeys.forEach(k => {
    const lockBtn = document.getElementById('lock_' + k);
    if (lockBtn) {
      lockBtn.onclick = () => {
        state.factory.locks[k] = !state.factory.locks[k];
        showToast('Lock', `${k === 'm' ? 'mUSD' : k === 'sm' ? 'smUSD' : 'xMINIMA'} ${state.factory.locks[k] ? 'locked' : 'unlocked'}.`);
        safeRender();
      };
    }
  });

  const updateRowUI = (k) => {
    const vMin = Math.max(0, Math.floor(state.factory.allocMinima[k] || 0));
    const qty = tokenQtyFromMinimaValue(k, vMin);
    const pct = total > 0 ? (vMin / total) * 100 : 0;

    const rng = document.getElementById('alloc_rng_' + k);
    const qEl = document.getElementById('alloc_qty_' + k);
    const valEl = document.getElementById('alloc_val_' + k);
    const hdrVal = document.getElementById('alloc_val_hdr_' + k);
    const pctEl = document.getElementById('alloc_pct_' + k);
    const inEl = document.getElementById('alloc_in_' + k);

    if (rng) { rng.max = String(total); rng.value = String(vMin); }
    if (qEl) qEl.textContent = fmt(qty);
    if (valEl) valEl.innerHTML = `${fmt(vMin)} <span class="muted" style="font-size:12px">MINIMA</span>`;
    if (hdrVal) hdrVal.innerHTML = `${fmt(vMin)} <span class="muted" style="font-size:12px">MINIMA</span>`;
    if (pctEl) pctEl.textContent = `${pct.toFixed(0)}%`;
    if (inEl) inEl.value = String(qty);
  };

  const redistribute = (sourceKey, newVal) => {
    newVal = Math.max(0, Math.floor(Number(newVal || 0)));

    const lockedOther = allocKeys.filter(k => k !== sourceKey && state.factory.locks[k]);
    const unlockedOther = allocKeys.filter(k => k !== sourceKey && !state.factory.locks[k]);

    const lockedSum = lockedOther.reduce((a, k) => a + (state.factory.allocMinima[k] || 0), 0);
    const maxForSource = Math.max(0, total - lockedSum);
    if (newVal > maxForSource) newVal = maxForSource;

    state.factory.allocMinima[sourceKey] = newVal;

    const remainder = Math.max(0, total - lockedSum - newVal);

    if (unlockedOther.length === 0) {
      normalizeFactoryState(state);
      return;
    }

    const baseSum = unlockedOther.reduce((a, k) => a + (state.factory.allocMinima[k] || 0), 0);

    if (baseSum === 0) {
      const each = Math.floor(remainder / unlockedOther.length);
      unlockedOther.forEach((k, idx) => {
        state.factory.allocMinima[k] = (idx === unlockedOther.length - 1)
          ? (remainder - each * (unlockedOther.length - 1))
          : each;
      });
    } else {
      const scaled = {};
      unlockedOther.forEach(k => scaled[k] = Math.floor((state.factory.allocMinima[k] || 0) * remainder / baseSum));
      const s = unlockedOther.reduce((a, k) => a + scaled[k], 0);
      scaled[unlockedOther[0]] += (remainder - s);
      unlockedOther.forEach(k => state.factory.allocMinima[k] = scaled[k]);
    }

    normalizeFactoryState(state);
  };

  // sliders + token inputs
  allocKeys.forEach(k => {
    const rng = document.getElementById('alloc_rng_' + k);
    const inEl = document.getElementById('alloc_in_' + k);

    if (rng) {
      rng.addEventListener('input', () => {
        if (state.factory.locks[k]) { updateRowUI(k); return; }
        redistribute(k, rng.value);
        allocKeys.forEach(updateRowUI);
      });
    }

    if (inEl) {
      // Token inputs set token quantity. This can expand/contract the mint amount.
      // (Sliders still behave as "keep-total-constant" tools.)
      inEl.addEventListener('change', () => {
        if (state.factory.locks[k]) { updateRowUI(k); return; }

        const qty = Math.max(0, Number(inEl.value || 0));
        const vMin = Math.max(0, Math.floor(minimaValueFromTokenQty(k, qty)));

        // Set this bucket, keep other buckets as-is.
        state.factory.allocMinima[k] = vMin;

        // New mint amount becomes the sum of all buckets (top-to-bottom task flow).
        const newTotal = Math.max(0,
          Math.floor((state.factory.allocMinima.m || 0) + (state.factory.allocMinima.sm || 0) + (state.factory.allocMinima.x || 0))
        );
        state.factory.mintAmount = newTotal;

        normalizeFactoryState(state);
        safeRender();
      });
    }
  });

  allocKeys.forEach(updateRowUI);
}

function renderFactory(ctx) {
  const {
    $, app, state, fmt, showToast, safeRender,
    tokenQtyFromMinimaValue, minimaValueFromTokenQty, setHeaderButtons
  } = ctx;

  $('pageTitle').textContent = 'Stablescoin Factory';
  $('pageDesc').textContent = 'Mint test assets. (Test-only, no value)';
  setHeaderButtons([]);

  normalizeFactoryState(state);

  const remaining = Math.max(0, state.caps.globalMintCap - state.caps.mintedTotal);
  const canMintNow = state.balances.minima > 0 && state.factory.mintAmount > 0;
  const mintDisabled = (!canMintNow || state.factory.mintAmount > state.balances.minima || state.factory.mintAmount > remaining);

  if (typeof state.factory.simPct !== 'number') state.factory.simPct = 0;

  const snapNow = portfolioSnapshot(state, tokenQtyFromMinimaValue, state.factory.simPct / 100, false);
  const snapAfter = portfolioSnapshot(state, tokenQtyFromMinimaValue, state.factory.simPct / 100, true);
  const seriesNow = portfolioSeries(state, tokenQtyFromMinimaValue, false);
  const seriesAfter = portfolioSeries(state, tokenQtyFromMinimaValue, true);

  app.innerHTML = `
    <div style="display:grid; gap:14px;">

      <div class="card">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap">
          <div>
            <div class="muted" style="font-size: 12px;">Wallet MINIMA</div>
            <div class="kpi" style="font-size: 32px; font-weight: 900;">${fmt(state.balances.minima)}</div>
          </div>
          <div class="muted" style="text-align:right; max-width:360px">
            Need more test MINIMA? <a href="#/faucet" style="color:var(--accent); font-weight:900">Open faucet</a>
          </div>
        </div>

        <div class="hr"></div>

        <label for="mintAmt">Total Winiwa you want to use for minting</label>
        <input id="mintAmt" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" value="${Math.floor(state.factory.mintAmount)}" />
        <div class="muted" style="margin-top:10px">This is the total collateral committed for this mint.</div>
      </div>

      <div class="card">
        <div class="muted">Allocate (sum equals total mint amount)</div>
        <div class="hr"></div>

        <div class="slider-wrap">
          ${allocSlider(state, tokenQtyFromMinimaValue, fmt, 'x', '<span class="em">xWiniwa</span>', 'Beneficial owner of the protocol.')}
          ${allocSlider(state, tokenQtyFromMinimaValue, fmt, 'sm', 'smUSD', 'Protection layer for the protocol (more constrained).')}
          ${allocSlider(state, tokenQtyFromMinimaValue, fmt, 'm', 'mUSD', 'Day-to-day payment Stables unit.')}
        </div>

        <div class="hr"></div>

        <div style="display:grid; gap:10px; justify-items:center; text-align:center">
          <button class="primary bigbtn" id="mintAll" style="width:min(560px, 100%); font-size:16px" ${mintDisabled ? 'disabled' : ''}>Mint</button>
          <div class="muted" style="max-width:640px">Test-only assets. No real-world value.</div>
        </div>
      </div>

      <div class="card">
        <div class="step-title">
          <div style="font-weight:900">Simulator</div>
          <div class="muted">Winiwa price ±50%</div>
        </div>
        <div class="hr"></div>

        <div style="display:grid; gap:10px">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap">
            <div class="muted">Price move</div>
            <div style="font-weight:900">${state.factory.simPct >= 0 ? '+' : ''}${state.factory.simPct.toFixed(0)}%</div>
          </div>
          <input id="simPct" type="range" min="-50" max="50" value="${state.factory.simPct}" />
        </div>

        <div class="hr"></div>

        ${renderSimChart(seriesNow, seriesAfter)}

        <div class="hr"></div>

        <div class="row two">
          <div class="card">
            <h3 style="margin:0">Current wallet + mint</h3>
            <div class="muted" style="margin-top:6px">Quantities stay fixed. Values move with MINIMA.</div>
            <div class="hr"></div>
            ${renderSimBreakdown(snapNow, fmt)}
          </div>
          <div class="card">
            <h3 style="margin:0">After this mint</h3>
            <div class="muted" style="margin-top:6px">Preview only (nothing executed).</div>
            <div class="hr"></div>
            ${renderSimBreakdown(snapAfter, fmt, true)}
          </div>
        </div>
      </div>

    </div>
  `;

  $('mintAmt').addEventListener('input', () => {
    const raw = String($('mintAmt').value || '');
    const digits = raw.replace(/[^0-9]/g, '');
    const v = Math.max(0, Math.floor(Number(digits || 0)));
    state.factory.mintAmount = v;
    setFactoryMintAmount(state, v);
    safeRender();
  });

  const sp = $('simPct');
  if (sp) {
    sp.addEventListener('input', () => {
      state.factory.simPct = Number(sp.value);
      safeRender();
    });
  }

  wireAllocSliders({
    state,
    showToast,
    safeRender,
    tokenQtyFromMinimaValue,
    minimaValueFromTokenQty,
    fmt,
  });

  const mintBtn = $('mintAll');
  if (mintBtn) {
    mintBtn.onclick = () => {
      normalizeFactoryState(state);
      const amt = state.factory.mintAmount;
      if (!amt || amt <= 0) return showToast('Mint', 'Enter a positive mint amount.');

      const remainingNow = Math.max(0, state.caps.globalMintCap - state.caps.mintedTotal);
      if (amt > remainingNow) return showToast('Mint blocked', 'Exceeds remaining global cap.');
      if (amt > state.balances.minima) return showToast('Mint blocked', 'Insufficient MINIMA in wallet.');

      state.balances.minima -= amt;
      state.mint.deposited += amt;

      state.balances.x += tokenQtyFromMinimaValue('x', state.factory.allocMinima.x);
      state.balances.sm += tokenQtyFromMinimaValue('sm', state.factory.allocMinima.sm);
      state.balances.m += tokenQtyFromMinimaValue('m', state.factory.allocMinima.m);

      state.caps.mintedTotal += amt;

      showToast('Mint', `Minted ${fmt(tokenQtyFromMinimaValue('x', state.factory.allocMinima.x))} xWiniwa, ${fmt(tokenQtyFromMinimaValue('sm', state.factory.allocMinima.sm))} smUSD, ${fmt(tokenQtyFromMinimaValue('m', state.factory.allocMinima.m))} mUSD.`);
      safeRender();
    };
  }
}

window.StablesRoutes = window.StablesRoutes || {};
window.StablesRoutes.renderFactory = renderFactory;




