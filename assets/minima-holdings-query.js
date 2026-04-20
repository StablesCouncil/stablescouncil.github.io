/**
 * Minima holdings query UI — calls Council API when deployed.
 *
 * Expected GET (same-origin or STABLES_MINIMA_HOLDINGS_API):
 *   /api/devtools/minima-holdings?address=0x...|Mx...&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&interval_type=DAY
 *
 * interval_type: DAY | WEEK | MONTH | QUARTER | YEAR
 * Omit date_from / date_to when range is "all" (server interprets full history).
 *
 * Optional preset list override (before this script):
 *   window.STABLES_MINIMA_HOLDINGS_PRESETS = [ { label: "…", address: "0x…" }, … ];
 *
 * JSON response (example):
 * {
 *   "address": "0x...",      // canonical address used for query
 *   "address_input": "Mx...", // optional original input when user typed Mx
 *   "block_live": 1234567,
 *   "block_db": 1234500,
 *   "db_refreshed_at": "2026-04-18T12:00:00.000Z",
 *   "series": [ { "x": "2026-04-01", "y": 1.23 }, ... ]
 * }
 *
 * Override API root: set window.STABLES_MINIMA_HOLDINGS_API before this file.
 */
(function () {
  /* No hardcoded preset addresses — community list loads from github/community-addresses.json. */
  var DEFAULT_PRESETS = [];

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
    /* Fallback: always point at the Council VPS so a stale cached page still works. */
    return "https://agent.stablescouncil.org";
  }

  function localYMD(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function getRangePresetValue() {
    var el = document.querySelector('input[name="holdings-range-preset"]:checked');
    return el ? el.value : "all";
  }

  function setRangePresetValue(mode) {
    var el = document.querySelector('input[name="holdings-range-preset"][value="' + mode + '"]');
    if (el) el.checked = true;
  }

  function getIntervalTypeValue() {
    var radio = document.querySelector('input[name="holdings-interval-type"]:checked');
    if (radio && radio.value) return String(radio.value).toUpperCase();
    var sel = document.getElementById("interval-type");
    return (sel && sel.value ? String(sel.value) : "DAY").toUpperCase();
  }

  /** @returns {{ from: string, to: string } | { from: null, to: null } | null} */
  function computedRangeForPreset(mode) {
    if (mode === "all") return { from: null, to: null };
    if (mode === "custom") return null;
    var to = new Date();
    to.setHours(0, 0, 0, 0);
    var from = new Date(to);
    if (mode === "1y")      from.setFullYear(from.getFullYear() - 1);
    else if (mode === "3m") from.setMonth(from.getMonth() - 3);
    else                    from.setMonth(from.getMonth() - 1);
    return { from: localYMD(from), to: localYMD(to) };
  }

  function applyRangePresetToFields() {
    var mode = getRangePresetValue();
    var df = document.getElementById("date-from");
    var dt = document.getElementById("date-to");
    if (!df || !dt) return;
    if (mode === "custom") {
      if (!df.value && !dt.value) {
        var r = computedRangeForPreset("1m");
        if (r && r.from && r.to) {
          df.value = r.from;
          dt.value = r.to;
        }
      }
      return;
    }
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
    q.interval_type = getIntervalTypeValue();
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
          var out = { x: String(p.x), y: p.y };
          if (p.block_db_snapshot != null && Number.isFinite(Number(p.block_db_snapshot))) {
            out.block_db_snapshot = Number(p.block_db_snapshot);
          } else if (p.period_max_block != null && Number.isFinite(Number(p.period_max_block))) {
            out.block_db_snapshot = Number(p.period_max_block);
          } else if (p.block != null && Number.isFinite(Number(p.block))) {
            out.block_db_snapshot = Number(p.block);
          }
          return out;
        }
        if (typeof p.balance === "number" && p.block != null) {
          return { x: String(p.block), y: p.balance, block_db_snapshot: Number(p.block) };
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

  /** Format a Date as "YYYY-MM-DD". */
  function ymd(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  /** Deterministic illustrative series when the API is offline or returns no points.
   *  Uses real dates (weekly, going back 34 weeks from today) so the axis always shows dates. */
  function mexcIllustrativeSeries() {
    var out = [];
    var base = 1045.32;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    for (var i = 0; i < 34; i++) {
      var d = new Date(today);
      d.setDate(d.getDate() - (33 - i) * 7);
      var wobble = Math.sin(i / 4.2) * 28 + Math.cos(i / 2.1) * 12;
      var linear = i * 1.85;
      var y = base + linear + wobble;
      out.push({ x: ymd(d), y: Math.round(Math.max(0, y) * 100) / 100 });
    }
    return out;
  }

  /** Deterministic illustrative UTXO-count series paired with mexcIllustrativeSeries. */
  function mexcIllustrativeUtxoSeries() {
    var out = [];
    var base = 87;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    for (var i = 0; i < 34; i++) {
      var d = new Date(today);
      d.setDate(d.getDate() - (33 - i) * 7);
      var wobble = Math.sin(i / 3.7) * 15 + Math.cos(i / 1.9) * 8;
      out.push({ x: ymd(d), y: Math.max(1, Math.round(base + wobble)) });
    }
    return out;
  }

  // ── Timeline result cache ──────────────────────────────────────────────────
  // Caches successful API responses in localStorage for CACHE_TTL_MS.
  // The DB updates ~once per day; 6 hours is a safe freshness window.
  var CACHE_KEY_PREFIX = "stables_hcache_v1:";
  var CACHE_TTL_MS     = 6 * 60 * 60 * 1000; // 6 hours

  function cacheKey(params) {
    return CACHE_KEY_PREFIX +
      (params.address   || "") + ":" +
      (params.date_from || "all") + ":" +
      (params.date_to   || "all") + ":" +
      (params.interval_type || "DAY");
  }

  function getCached(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (!entry || typeof entry.ts !== "number" || !entry.payload) return null;
      if (Date.now() - entry.ts > CACHE_TTL_MS) {
        localStorage.removeItem(key);
        return null;
      }
      return entry.payload;
    } catch (e) {
      return null;
    }
  }

  function setCached(key, payload) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), payload: payload }));
    } catch (e) {
      /* quota exceeded or private mode — silent */
    }
  }

  /** Prune all stale cache entries to keep localStorage tidy. */
  function pruneCache() {
    try {
      var now = Date.now();
      var toRemove = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(CACHE_KEY_PREFIX) !== 0) continue;
        try {
          var e = JSON.parse(localStorage.getItem(k));
          if (!e || now - e.ts > CACHE_TTL_MS) toRemove.push(k);
        } catch (_) { toRemove.push(k); }
      }
      toRemove.forEach(function (k) { localStorage.removeItem(k); });
    } catch (_) { /* silent */ }
  }
  // ──────────────────────────────────────────────────────────────────────────

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
    return /^0x[0-9A-Fa-f]+$/.test(t) || /^[0-9A-Fa-f]+$/.test(t) || /^Mx[0-9A-Za-z]+$/.test(t);
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
        position: "right",
        ticks: { color: "#9fb0c0" },
        grid: { color: "rgba(103,232,249,0.08)" },
        title: { display: false },
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
        ticks: {
          color: "#a78bfa",
          callback: function (value) { return String(Math.round(Number(value))); },
        },
        grid: { drawOnChartArea: false },
        title: { display: false },
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
          tooltip: {
            displayColors: false,
            callbacks: {
              label: function (ctx) {
                var v = ctx.parsed && ctx.parsed.y != null ? ctx.parsed.y : null;
                var n = v == null ? "—" : Number(v).toLocaleString("en-GB");
                return "━ " + String(ctx.dataset && ctx.dataset.label ? ctx.dataset.label : "") + ": " + n;
              },
            },
          },
        },
        scales: scales,
      },
    });
    chartInstance._hasRealData = true;
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

  function setChartLoading(isLoading) {
    var overlay = document.getElementById("holdings-loading-overlay");
    if (!overlay) return;
    if (isLoading) overlay.removeAttribute("hidden");
    else overlay.setAttribute("hidden", "hidden");
  }

  async function fetchHoldingsRemote(queryParams) {
    var url = holdingsUrl(queryParams);
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 45000);
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

  /**
   * Returns { payload, fromCache }.
   * Checks localStorage first; only calls the API on a miss or expired entry.
   */
  async function fetchHoldings(queryParams) {
    var key = cacheKey(queryParams);
    var cached = getCached(key);
    if (cached) return { payload: cached, fromCache: true };
    var payload = await fetchHoldingsRemote(queryParams);
    setCached(key, payload);
    return { payload: payload, fromCache: false };
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
    if (statusEl) {
      statusEl.setAttribute("hidden", "hidden");
      statusEl.textContent = "";
    }
    setChartLoading(true);

    var fromCache = false;
    var payload = null;

    try {
      var result = await fetchHoldings(queryParams);
      payload   = result.payload;
      fromCache = result.fromCache;

      /* Update block info only when the payload contains real values. */
      if (payload.block_live != null) setText("holdings-block-live", fmtBlock(payload.block_live));
      if (payload.block_db   != null) setText("holdings-block-db",   fmtBlock(payload.block_db));
      if (typeof window.setBlockBehind === "function") {
        window.setBlockBehind(payload.block_behind);
      }

      var series     = normalizeSeries(payload);
      var utxoSeries = normalizeUtxoSeries(payload);

      if (!series.length) {
        /* API responded but returned no rows — keep skeleton chart, show info. */
        setStatusBanner(statusEl, "ok", "No data returned for this address in the selected range.");
        return;
      }

      renderChart(canvas, series, utxoSeries, "Minima balance");
      if (statusEl) {
        statusEl.setAttribute("hidden", "hidden");
        statusEl.textContent = "";
      }

      window.__lastHoldingsPayload      = payload;
      window.__lastHoldingsSeries       = series;
      window.__lastHoldingsUtxoSeries   = utxoSeries;
      window.__lastHoldingsQuery        = queryParams;
    } catch (err) {
      var msg;
      if (window.location.protocol === "file:") {
        msg = "Page opened from a local file — browser blocks outbound requests. " +
              "Open from stablescouncil.org or a local server to query live data.";
      } else if (err && err.name === "AbortError") {
        msg = "Request timed out. The API did not respond in 45 s — the query may still be running; try a narrower date range or MONTH/YEAR interval.";
      } else if (err && err.message) {
        msg = err.message;
      } else {
        msg = "Network error — check connection and try again.";
      }
      setStatusBanner(statusEl, "error", msg);
      return; /* leave the empty chart skeleton intact */
    } finally {
      setChartLoading(false);
      if (btn) { btn.disabled = false; btn.removeAttribute("aria-busy"); }
    }
  }

  function exportCsv() {
    var series = window.__lastHoldingsSeries;
    if (!series || !series.length) return;
    var payload = window.__lastHoldingsPayload || {};
    var q = window.__lastHoldingsQuery || {};
    var blockDb = payload.block_db != null ? payload.block_db : "";
    var utxoSeries = window.__lastHoldingsUtxoSeries || [];
    var hasUtxo = utxoSeries.length > 0;
    var utxoMap = {};
    if (hasUtxo) {
      utxoSeries.forEach(function (p) { utxoMap[p.x] = p.y; });
    }
    var header = hasUtxo
      ? ["date_indicative", "block_db_snapshot", "balance", "utxo_count"].join(",")
      : ["date_indicative", "block_db_snapshot", "balance"].join(",");
    var rows = [header].concat(
      series.map(function (p) {
        var rowBlock = p.block_db_snapshot != null ? p.block_db_snapshot : blockDb;
        var cols = [JSON.stringify(p.x), rowBlock, p.y];
        if (hasUtxo) cols.push(utxoMap[p.x] != null ? utxoMap[p.x] : "");
        return cols.join(",");
      })
    );
    var blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    var name = "minima-holdings";
    var addr = q.address || payload.address || "";
    if (addr) {
      var shortAddr = addr.length > 16 ? (addr.slice(0, 8) + "..." + addr.slice(-8)) : addr;
      name += "-" + shortAddr;
    }
    var latestBlock = payload.block_db;
    if (latestBlock != null && latestBlock !== "") name += "-block-" + String(latestBlock);
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
    var opts = '<option value="">— enter address above —</option>';
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
      nodes[i].addEventListener("change", function () {
        applyRangePresetToFields();
        /* If no query has been run yet (chart has no real data), refresh the skeleton. */
        if (!chartInstance || !chartInstance._hasRealData) {
          renderEmptyChart(document.getElementById("holdings-chart"));
        }
      });
    }
  }

  function wireDateAutoCustom() {
    var df = document.getElementById("date-from");
    var dt = document.getElementById("date-to");
    function promoteToCustom() {
      if (getRangePresetValue() !== "custom") setRangePresetValue("custom");
    }
    if (df) {
      df.addEventListener("input", promoteToCustom);
      df.addEventListener("change", promoteToCustom);
    }
    if (dt) {
      dt.addEventListener("input", promoteToCustom);
      dt.addEventListener("change", promoteToCustom);
    }
  }

  function wireIntervalTypeRadios() {
    var sel = document.getElementById("interval-type");
    var nodes = document.querySelectorAll('input[name="holdings-interval-type"]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener("change", function () {
        if (sel) sel.value = this.value;
      });
    }
  }

  /* Expose repopulate so external controls (e.g. Clear all) can refresh the dropdown. */
  window.__repopulatePresets = function() {
    populatePresetSelect();
    updateForgetSavedButtonState();
  };

  /** Render an empty chart frame so the timeline is visible before any query runs. */
  function renderEmptyChart(canvas) {
    destroyChart();
    if (!canvas || typeof Chart === "undefined") return;

    /* Build date labels that match the active range selection (default: 1 month). */
    var mode = getRangePresetValue();
    var r = (mode === "all" || mode === "custom") ? computedRangeForPreset("1m") : computedRangeForPreset(mode);
    var labels = [];
    if (r && r.from && r.to) {
      var d = new Date(r.from);
      var end = new Date(r.to);
      var step = (mode === "1y") ? 7 : 1; /* weekly ticks for 1-year view */
      while (d <= end) {
        labels.push(ymd(d));
        d.setDate(d.getDate() + step);
      }
    }
    if (!labels.length) {
      /* Ultimate fallback: last 30 days */
      var today = new Date();
      for (var i = 29; i >= 0; i--) {
        var fd = new Date(today);
        fd.setDate(today.getDate() - i);
        labels.push(ymd(fd));
      }
    }

    var nullData = labels.map(function () { return null; });
    var ctx = canvas.getContext("2d");
    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Balance (Minima)",
            data: nullData,
            borderColor: "rgba(103,232,249,0.25)",
            backgroundColor: "rgba(103,232,249,0.04)",
            fill: true,
            tension: 0.25,
            pointRadius: 0,
            yAxisID: "y",
          },
          {
            label: "UTXO count",
            data: nullData,
            borderColor: "rgba(167,139,250,0.25)",
            backgroundColor: "transparent",
            fill: false,
            tension: 0.25,
            pointRadius: 0,
            yAxisID: "y1",
          },
        ],
      },
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
          tooltip: {
            displayColors: false,
            callbacks: {
              label: function (ctx) {
                var v = ctx.parsed && ctx.parsed.y != null ? ctx.parsed.y : null;
                var n = v == null ? "—" : Number(v).toLocaleString("en-GB");
                return "━ " + String(ctx.dataset && ctx.dataset.label ? ctx.dataset.label : "") + ": " + n;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: "#9fb0c0", maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
            grid: { color: "rgba(103,232,249,0.08)" },
          },
          y: {
            position: "right",
            min: 0,
            ticks: { color: "#9fb0c0" },
            grid: { color: "rgba(103,232,249,0.08)" },
            title: { display: false },
          },
          y1: {
            position: "right",
            min: 0,
            ticks: {
              color: "#a78bfa",
              callback: function (value) { return String(Math.round(Number(value))); },
            },
            grid: { drawOnChartArea: false },
            title: { display: false },
          },
        },
      },
    });
  }

  function init() {
    pruneCache(); /* quietly remove stale cache entries on page load */
    populatePresetSelect();
    wirePresetAndAddress();
    wireLocalSaveControls();
    wireRangePresets();
    wireDateAutoCustom();
    wireIntervalTypeRadios();

    var addrInput = document.getElementById("minima-addr");
    var btn = document.getElementById("run-query-btn");
    var csvBtn = document.getElementById("export-csv-btn");

    updateForgetSavedButtonState();
    applyRangePresetToFields();

    /* Render the empty chart frame immediately so the timeline is visible. */
    renderEmptyChart(document.getElementById("holdings-chart"));

    if (btn) {
      /* Single click → use cache if available.
         Shift+click or double-click → bypass cache, force fresh fetch. */
      btn.addEventListener("click", function (e) {
        var a = addrInput ? addrInput.value.trim() : "";
        if (!a) return;
        if (e.shiftKey || e.detail >= 2) {
          var key = cacheKey(buildQueryParams(a));
          try { localStorage.removeItem(key); } catch (_) {}
        }
        loadHoldings(a);
      });
      btn.title = "Shift+click or double-click to bypass cache and fetch fresh data";
    }
    if (csvBtn) {
      csvBtn.addEventListener("click", exportCsv);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
