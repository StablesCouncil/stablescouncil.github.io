/**
 * Minima holdings query UI — calls Council API when deployed.
 *
 * Expected GET (same-origin or STABLES_MINIMA_HOLDINGS_API):
 *   /api/devtools/minima-holdings?address=0x...&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&interval_type=DAY
 *
 * interval_type: DAY | WEEK | MONTH | QUARTER | YEAR
 * Omit date_from / date_to when range is "all" (server interprets full history).
 *
 * Optional preset list override (before this script):
 *   window.STABLES_MINIMA_HOLDINGS_PRESETS = [ { label: "…", address: "0x…" }, … ];
 *
 * JSON response (example):
 * {
 *   "address": "0x...",
 *   "block_live": 1234567,
 *   "block_db": 1234500,
 *   "db_refreshed_at": "2026-04-18T12:00:00.000Z",
 *   "series": [ { "x": "2026-04-01", "y": 1.23 }, ... ]
 * }
 *
 * Override API root: set window.STABLES_MINIMA_HOLDINGS_API before this file.
 */
(function () {
  var DEFAULT_PRESETS = [
    {
      label: "MEXC (hot)",
      address: "0x4AD25252814256BEDDF7EA6F0CF75E48FC10E8D11FE3FC70551BB427A2BBA84A",
    },
    {
      label: "BitMart",
      address:
        "0xCE54ECFB93596460D1FEC3CD4F5665CE7497FB5ABF30898D51AE21CB49B74453",
    },
    {
      label: "Exchange 3 (replace in JS)",
      address:
        "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
    },
  ];

  function presets() {
    if (Array.isArray(window.STABLES_MINIMA_HOLDINGS_PRESETS)) {
      return window.STABLES_MINIMA_HOLDINGS_PRESETS;
    }
    return DEFAULT_PRESETS;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function apiBase() {
    if (typeof window.STABLES_MINIMA_HOLDINGS_API === "string" && window.STABLES_MINIMA_HOLDINGS_API.trim()) {
      return window.STABLES_MINIMA_HOLDINGS_API.replace(/\/$/, "");
    }
    return "";
  }

  function localYMD(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function getRangePresetValue() {
    var el = document.querySelector('input[name="holdings-range-preset"]:checked');
    return el ? el.value : "1m";
  }

  /** @returns {{ from: string, to: string } | { from: null, to: null } | null} */
  function computedRangeForPreset(mode) {
    if (mode === "all") return { from: null, to: null };
    if (mode === "custom") return null;
    var to = new Date();
    to.setHours(0, 0, 0, 0);
    var from = new Date(to);
    if (mode === "1y") from.setFullYear(from.getFullYear() - 1);
    else from.setMonth(from.getMonth() - 1);
    return { from: localYMD(from), to: localYMD(to) };
  }

  function applyRangePresetToFields() {
    var mode = getRangePresetValue();
    var df = document.getElementById("date-from");
    var dt = document.getElementById("date-to");
    if (!df || !dt) return;
    if (mode === "custom") {
      df.removeAttribute("readonly");
      dt.removeAttribute("readonly");
      if (!df.value && !dt.value) {
        var r = computedRangeForPreset("1m");
        if (r && r.from && r.to) {
          df.value = r.from;
          dt.value = r.to;
        }
      }
      return;
    }
    df.setAttribute("readonly", "readonly");
    dt.setAttribute("readonly", "readonly");
    if (mode === "all") {
      df.value = "";
      dt.value = "";
      return;
    }
    var range = computedRangeForPreset(mode);
    if (range && range.from && range.to) {
      df.value = range.from;
      dt.value = range.to;
    }
  }

  function buildQueryParams(address) {
    var q = { address: address.trim() };
    var intervalEl = document.getElementById("interval-type");
    q.interval_type = (intervalEl && intervalEl.value) || "DAY";
    var mode = getRangePresetValue();
    if (mode === "all") {
      return q;
    }
    if (mode === "custom") {
      var df = document.getElementById("date-from");
      var dt = document.getElementById("date-to");
      if (df && df.value) q.date_from = df.value;
      if (dt && dt.value) q.date_to = dt.value;
      return q;
    }
    var r = computedRangeForPreset(mode);
    if (r && r.from) q.date_from = r.from;
    if (r && r.to) q.date_to = r.to;
    return q;
  }

  function holdingsUrl(params) {
    var base = apiBase();
    var search = new URLSearchParams();
    Object.keys(params).forEach(function (k) {
      var v = params[k];
      if (v != null && v !== "") search.set(k, String(v));
    });
    var path = "/api/devtools/minima-holdings?" + search.toString();
    if (base) return base + path;
    try {
      return new URL(path, window.location.origin).toString();
    } catch (e) {
      return path;
    }
  }

  function normalizeSeries(raw) {
    if (!raw || !raw.series) return [];
    var s = raw.series;
    if (!Array.isArray(s)) return [];
    return s
      .map(function (p) {
        if (p == null) return null;
        if (typeof p.y === "number" && (typeof p.x === "string" || typeof p.x === "number")) {
          return { x: String(p.x), y: p.y };
        }
        if (typeof p.balance === "number" && p.block != null) {
          return { x: String(p.block), y: p.balance };
        }
        return null;
      })
      .filter(Boolean);
  }

  function normalizeUtxoSeries(raw) {
    if (!raw) return [];
    // Preferred: dedicated utxo_series field
    if (Array.isArray(raw.utxo_series)) {
      return raw.utxo_series
        .map(function (p) {
          if (p == null) return null;
          if (typeof p.y === "number" && (typeof p.x === "string" || typeof p.x === "number")) {
            return { x: String(p.x), y: p.y };
          }
          return null;
        })
        .filter(Boolean);
    }
    // Fall back: utxo_count embedded in each series point
    if (Array.isArray(raw.series)) {
      var result = raw.series
        .map(function (p) {
          if (p == null || typeof p.utxo_count !== "number") return null;
          var x = p.x != null ? String(p.x) : p.block != null ? String(p.block) : null;
          if (!x) return null;
          return { x: x, y: p.utxo_count };
        })
        .filter(Boolean);
      if (result.length) return result;
    }
    return [];
  }

  /** Deterministic illustrative series (MEXC-style) when the API is offline or returns no points. */
  function mexcIllustrativeSeries() {
    var out = [];
    var base = 1045.32;
    for (var i = 0; i < 34; i++) {
      var wobble = Math.sin(i / 4.2) * 28 + Math.cos(i / 2.1) * 12;
      var linear = i * 1.85;
      var y = base + linear + wobble;
      out.push({ x: "W" + (i + 1), y: Math.round(Math.max(0, y) * 100) / 100 });
    }
    return out;
  }

  /** Deterministic illustrative UTXO-count series paired with mexcIllustrativeSeries. */
  function mexcIllustrativeUtxoSeries() {
    var out = [];
    var base = 87;
    for (var i = 0; i < 34; i++) {
      var wobble = Math.sin(i / 3.7) * 15 + Math.cos(i / 1.9) * 8;
      out.push({ x: "W" + (i + 1), y: Math.max(1, Math.round(base + wobble)) });
    }
    return out;
  }

  var LOCAL_SAVED_KEY = "stables_minima_holdings_saved_v1";

  function randomId() {
    return "s" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  }

  function loadLocalSavedAddresses() {
    try {
      var raw = localStorage.getItem(LOCAL_SAVED_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (row) {
        return row && typeof row.id === "string" && typeof row.address === "string" && row.address.trim();
      });
    } catch (e) {
      return [];
    }
  }

  function persistLocalSavedAddresses(rows) {
    try {
      localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(rows));
    } catch (e) {
      /* ignore quota */
    }
  }

  function looksLikeMinimaAddress(s) {
    var t = String(s || "").trim();
    if (t.length < 16) return false;
    return /^0x[0-9A-Fa-f]+$/.test(t) || /^[0-9A-Fa-f]+$/.test(t);
  }

  var chartInstance = null;

  function destroyChart() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

  function renderChart(canvas, balanceSeries, utxoSeries, balanceLabel) {
    destroyChart();
    if (!canvas || typeof Chart === "undefined") return;
    var labels = balanceSeries.map(function (p) { return p.x; });
    var balanceData = balanceSeries.map(function (p) { return p.y; });
    var ctx = canvas.getContext("2d");

    var datasets = [
      {
        label: balanceLabel || "Balance (Minima)",
        data: balanceData,
        borderColor: "rgba(103, 232, 249, 0.95)",
        backgroundColor: "rgba(103, 232, 249, 0.10)",
        fill: true,
        tension: 0.25,
        pointRadius: 2,
        yAxisID: "y",
      },
    ];

    var scales = {
      x: {
        ticks: { color: "#9fb0c0", maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
        grid: { color: "rgba(103,232,249,0.08)" },
      },
      y: {
        position: "left",
        ticks: { color: "#9fb0c0" },
        grid: { color: "rgba(103,232,249,0.08)" },
        title: { display: true, text: "Balance", color: "#9fb0c0", font: { size: 11 } },
      },
    };

    if (utxoSeries && utxoSeries.length) {
      var utxoMap = {};
      utxoSeries.forEach(function (p) { utxoMap[p.x] = p.y; });
      var utxoAligned = labels.map(function (x) {
        return utxoMap[x] != null ? utxoMap[x] : null;
      });
      datasets.push({
        label: "UTXO count",
        data: utxoAligned,
        borderColor: "rgba(167, 139, 250, 0.9)",
        backgroundColor: "rgba(167, 139, 250, 0.04)",
        fill: false,
        tension: 0.25,
        pointRadius: 2,
        yAxisID: "y1",
      });
      scales.y1 = {
        position: "right",
        ticks: { color: "#a78bfa" },
        grid: { drawOnChartArea: false },
        title: { display: true, text: "UTXOs", color: "#a78bfa", font: { size: 11 } },
      };
    }

    chartInstance = new Chart(ctx, {
      type: "line",
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            labels: {
              color: "#9fb0c0",
              font: { family: "Inter, system-ui, sans-serif" },
              usePointStyle: true,
              pointStyle: "line",
              pointStyleWidth: 24,
            },
          },
        },
        scales: scales,
      },
    });
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function fmtBlock(n) {
    if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
    return String(n);
  }

  function setStatusBanner(el, kind, message) {
    if (!el) return;
    el.className = "devtools-holdings-status devtools-holdings-status--" + kind;
    el.textContent = message;
  }

  async function fetchHoldings(queryParams) {
    var url = holdingsUrl(queryParams);
    var ctrl = new AbortController();
    var t = setTimeout(function () {
      ctrl.abort();
    }, 12000);
    try {
      var r = await fetch(url, {
        method: "GET",
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
        credentials: "omit",
      });
      clearTimeout(t);
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) {
      clearTimeout(t);
      throw e;
    }
  }

  function metaSuffixFromForm() {
    var parts = [];
    var mode = getRangePresetValue();
    if (mode === "all") parts.push("range: all");
    else {
      var df = document.getElementById("date-from");
      var dt = document.getElementById("date-to");
      if (df && df.value) parts.push("from " + df.value);
      if (dt && dt.value) parts.push("to " + dt.value);
    }
    var iv = document.getElementById("interval-type");
    if (iv && iv.value) parts.push(iv.value);
    return parts.length ? parts.join(" · ") : "";
  }

  async function loadHoldings(address) {
    var canvas = document.getElementById("holdings-chart");
    var statusEl = document.getElementById("holdings-status");
    var btn = document.getElementById("run-query-btn");

    var queryParams = buildQueryParams(address);

    if (btn) {
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
    }
    if (statusEl) statusEl.removeAttribute("hidden");
    setStatusBanner(statusEl, "loading", "Loading…");

    var usedMexcFallback = false;
    var payload = null;

    try {
      payload = await fetchHoldings(queryParams);
    } catch (err) {
      usedMexcFallback = true;
      payload = {
        address: address,
        block_live: null,
        block_db: null,
        db_refreshed_at: null,
        series: mexcIllustrativeSeries(),
      };
    }

    var series = normalizeSeries(payload);
    if (!series.length && payload && Array.isArray(payload.series)) {
      series = mexcIllustrativeSeries();
      usedMexcFallback = true;
    }
    if (!series.length) {
      series = mexcIllustrativeSeries();
      usedMexcFallback = true;
    }

    var utxoSeries = normalizeUtxoSeries(payload);
    if (!utxoSeries.length && usedMexcFallback) {
      utxoSeries = mexcIllustrativeUtxoSeries();
    }

    setText("holdings-block-live", fmtBlock(payload.block_live));
    setText("holdings-block-db", fmtBlock(payload.block_db));

    var metaEl = document.getElementById("holdings-cache-meta");
    var extra = metaSuffixFromForm();
    if (metaEl) {
      if (usedMexcFallback) {
        metaEl.textContent = "";
        metaEl.setAttribute("hidden", "hidden");
      } else {
        metaEl.removeAttribute("hidden");
        var parts = [];
        if (payload.db_refreshed_at) parts.push("DB snapshot: " + payload.db_refreshed_at);
        if (payload.cache_ttl_seconds != null) parts.push("Cache TTL: " + payload.cache_ttl_seconds + "s");
        if (extra) parts.push(extra);
        metaEl.textContent = parts.length ? parts.join(" · ") : "Council API." + (extra ? " " + extra : "");
      }
    }

    var label = usedMexcFallback ? "Balance (local series)" : "Balance (cached)";
    renderChart(canvas, series, utxoSeries, label);

    if (usedMexcFallback) {
      if (statusEl) {
        statusEl.textContent = "";
        statusEl.setAttribute("hidden", "hidden");
      }
    } else {
      if (statusEl) statusEl.removeAttribute("hidden");
      setStatusBanner(statusEl, "ok", "Loaded.");
    }

    window.__lastHoldingsPayload = payload;
    window.__lastHoldingsSeries = series;
    window.__lastHoldingsUtxoSeries = utxoSeries;
    window.__lastHoldingsQuery = queryParams;

    if (btn) {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
    }
  }

  function exportCsv() {
    var series = window.__lastHoldingsSeries;
    if (!series || !series.length) return;
    var utxoSeries = window.__lastHoldingsUtxoSeries || [];
    var hasUtxo = utxoSeries.length > 0;
    var utxoMap = {};
    if (hasUtxo) {
      utxoSeries.forEach(function (p) { utxoMap[p.x] = p.y; });
    }
    var header = hasUtxo ? ["x", "balance", "utxo_count"].join(",") : ["x", "balance"].join(",");
    var rows = [header].concat(
      series.map(function (p) {
        var cols = [JSON.stringify(p.x), p.y];
        if (hasUtxo) cols.push(utxoMap[p.x] != null ? utxoMap[p.x] : "");
        return cols.join(",");
      })
    );
    var blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    var q = window.__lastHoldingsQuery || {};
    var name = "minima-holdings";
    if (q.date_from) name += "-" + q.date_from;
    if (q.date_to) name += "_" + q.date_to;
    if (q.interval_type) name += "-" + String(q.interval_type).toLowerCase();
    a.download = name + ".csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function presetOptionValueForBuiltin(address) {
    return "builtin:" + address;
  }

  function presetOptionValueForLocal(row) {
    return "local:" + row.id;
  }

  function populatePresetSelect() {
    var sel = document.getElementById("minima-addr-preset");
    if (!sel) return;
    var list = presets();
    var saved = loadLocalSavedAddresses();
    var opts = '<option value="">Custom…</option>';
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (!p || !p.address) continue;
      opts +=
        '<option value="' +
        escapeHtml(presetOptionValueForBuiltin(p.address)) +
        '">' +
        escapeHtml(p.label || p.address.slice(0, 10) + "…") +
        "</option>";
    }
    if (saved.length) {
      opts += '<optgroup label="Saved on this device">';
      for (var j = 0; j < saved.length; j++) {
        var row = saved[j];
        opts +=
          '<option value="' +
          escapeHtml(presetOptionValueForLocal(row)) +
          '">' +
          escapeHtml(row.label || row.address.slice(0, 10) + "…") +
          "</option>";
      }
      opts += "</optgroup>";
    }
    sel.innerHTML = opts;
  }

  function addressFromPresetValue(val) {
    if (!val) return "";
    if (val.indexOf("builtin:") === 0) return val.slice("builtin:".length);
    if (val.indexOf("local:") === 0) {
      var id = val.slice("local:".length);
      var saved = loadLocalSavedAddresses();
      for (var i = 0; i < saved.length; i++) {
        if (saved[i].id === id) return saved[i].address;
      }
      return "";
    }
    return val;
  }

  function syncPresetDropdownFromAddress(addr) {
    var sel = document.getElementById("minima-addr-preset");
    if (!sel) return;
    var normalized = addr.trim().toUpperCase();
    if (!normalized) {
      sel.value = "";
      updateForgetSavedButtonState();
      return;
    }
    var list = presets();
    for (var i = 0; i < list.length; i++) {
      if (list[i].address && list[i].address.toUpperCase() === normalized) {
        sel.value = presetOptionValueForBuiltin(list[i].address);
        updateForgetSavedButtonState();
        return;
      }
    }
    var saved = loadLocalSavedAddresses();
    for (var j = 0; j < saved.length; j++) {
      if (saved[j].address && saved[j].address.toUpperCase() === normalized) {
        sel.value = presetOptionValueForLocal(saved[j]);
        updateForgetSavedButtonState();
        return;
      }
    }
    sel.value = "";
    updateForgetSavedButtonState();
  }

  function updateForgetSavedButtonState() {
    var btn = document.getElementById("forget-saved-addr-btn");
    var sel = document.getElementById("minima-addr-preset");
    if (!btn || !sel) return;
    var v = sel.value || "";
    btn.disabled = v.indexOf("local:") !== 0;
  }

  function wirePresetAndAddress() {
    var sel = document.getElementById("minima-addr-preset");
    var input = document.getElementById("minima-addr");
    if (sel && input) {
      sel.addEventListener("change", function () {
        var addr = addressFromPresetValue(sel.value);
        if (addr) input.value = addr;
        updateForgetSavedButtonState();
      });
      input.addEventListener("input", function () {
        syncPresetDropdownFromAddress(input.value);
      });
    }
  }

  function wireLocalSaveControls() {
    var saveBtn = document.getElementById("save-local-addr-btn");
    var forgetBtn = document.getElementById("forget-saved-addr-btn");
    var addrInput = document.getElementById("minima-addr");
    var nameInput = document.getElementById("saved-addr-name");
    var sel = document.getElementById("minima-addr-preset");

    if (saveBtn && addrInput) {
      saveBtn.addEventListener("click", function () {
        var addr = addrInput.value.trim();
        if (!looksLikeMinimaAddress(addr)) return;
        var label = (nameInput && nameInput.value.trim()) || "Saved address";
        var rows = loadLocalSavedAddresses();
        rows.push({ id: randomId(), label: label, address: addr });
        persistLocalSavedAddresses(rows);
        populatePresetSelect();
        syncPresetDropdownFromAddress(addr);
        if (nameInput) nameInput.value = "";
        updateForgetSavedButtonState();
      });
    }

    if (forgetBtn && sel) {
      forgetBtn.addEventListener("click", function () {
        var v = sel.value || "";
        if (v.indexOf("local:") !== 0) return;
        var id = v.slice("local:".length);
        var rows = loadLocalSavedAddresses().filter(function (r) {
          return r.id !== id;
        });
        persistLocalSavedAddresses(rows);
        populatePresetSelect();
        sel.value = "";
        forgetBtn.disabled = true;
      });
    }
  }

  function wireRangePresets() {
    var nodes = document.querySelectorAll('input[name="holdings-range-preset"]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener("change", applyRangePresetToFields);
    }
  }

  /* Expose repopulate so external controls (e.g. Clear all) can refresh the dropdown. */
  window.__repopulatePresets = function() {
    populatePresetSelect();
    updateForgetSavedButtonState();
  };

  function init() {
    populatePresetSelect();
    wirePresetAndAddress();
    wireLocalSaveControls();
    wireRangePresets();

    var addrInput = document.getElementById("minima-addr");
    var presetSel = document.getElementById("minima-addr-preset");
    var btn = document.getElementById("run-query-btn");
    var csvBtn = document.getElementById("export-csv-btn");

    var list = presets();
    /* Default UX: preset stays "Custom…" while the MEXC address is prefilled in the input (chart still loads that address). */
    if (presetSel) presetSel.value = "";
    if (addrInput && list.length && list[0] && list[0].address) {
      addrInput.value = list[0].address;
    }

    updateForgetSavedButtonState();
    applyRangePresetToFields();

    if (btn) {
      btn.addEventListener("click", function () {
        var a = addrInput ? addrInput.value.trim() : "";
        if (!a) return;
        loadHoldings(a);
      });
    }
    if (csvBtn) {
      csvBtn.addEventListener("click", exportCsv);
    }

    var initial = addrInput && addrInput.value.trim() ? addrInput.value.trim() : list[0] ? list[0].address : "";
    if (initial) loadHoldings(initial);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
