/**
 * Minima holdings query UI — calls Council API when deployed.
 *
 * Expected GET (same-origin or STABLES_MINIMA_HOLDINGS_API):
 *   /api/devtools/minima-holdings?address=0x...
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
 * Server should cache per-address series and refresh when the MySQL archive
 * ingest advances; expose max ingested block as block_db and tip as block_live.
 *
 * Override API root: <script>window.STABLES_MINIMA_HOLDINGS_API="https://host";</script> before this file.
 */
(function () {
  var DEFAULT_ADDRESS =
    "0x4AD25252814256BEDDF7EA6F0CF75E48FC10E8D11FE3FC70551BB427A2BBA84A";

  function apiBase() {
    if (typeof window.STABLES_MINIMA_HOLDINGS_API === "string" && window.STABLES_MINIMA_HOLDINGS_API.trim()) {
      return window.STABLES_MINIMA_HOLDINGS_API.replace(/\/$/, "");
    }
    return "";
  }

  function holdingsUrl(address) {
    var base = apiBase();
    var path = "/api/devtools/minima-holdings?address=" + encodeURIComponent(address);
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

  function demoSeries() {
    var out = [];
    var v = 1000;
    for (var i = 0; i < 36; i++) {
      v += (Math.random() - 0.45) * 40;
      out.push({ x: "W" + (i + 1), y: Math.max(0, Math.round(v * 100) / 100) });
    }
    return out;
  }

  var chartInstance = null;

  function destroyChart() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

  function renderChart(canvas, points, label) {
    destroyChart();
    if (!canvas || typeof Chart === "undefined") return;
    var labels = points.map(function (p) {
      return p.x;
    });
    var data = points.map(function (p) {
      return p.y;
    });
    var ctx = canvas.getContext("2d");
    chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: label || "Balance",
            data: data,
            borderColor: "rgba(103, 232, 249, 0.95)",
            backgroundColor: "rgba(103, 232, 249, 0.12)",
            fill: true,
            tension: 0.25,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: "#9fb0c0", font: { family: "Inter, system-ui, sans-serif" } },
          },
        },
        scales: {
          x: {
            ticks: { color: "#9fb0c0", maxRotation: 45, autoSkip: true, maxTicksLimit: 12 },
            grid: { color: "rgba(103,232,249,0.08)" },
          },
          y: {
            ticks: { color: "#9fb0c0" },
            grid: { color: "rgba(103,232,249,0.08)" },
          },
        },
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

  async function fetchHoldings(address) {
    var url = holdingsUrl(address);
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

  async function loadHoldings(address, opts) {
    opts = opts || {};
    var canvas = document.getElementById("holdings-chart");
    var statusEl = document.getElementById("holdings-status");
    var btn = document.getElementById("run-query-btn");

    if (btn) {
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
    }
    setStatusBanner(statusEl, "loading", "Loading holdings…");

    var usedDemo = false;
    var payload = null;

    try {
      payload = await fetchHoldings(address);
    } catch (err) {
      usedDemo = true;
      payload = {
        address: address,
        block_live: null,
        block_db: null,
        db_refreshed_at: null,
        series: demoSeries(),
      };
    }

    var series = normalizeSeries(payload);
    if (!series.length && payload && Array.isArray(payload.series)) {
      series = demoSeries();
      usedDemo = true;
    }
    if (!series.length) {
      series = demoSeries();
      usedDemo = true;
    }

    setText("holdings-block-live", fmtBlock(payload.block_live));
    setText("holdings-block-db", fmtBlock(payload.block_db));

    var metaEl = document.getElementById("holdings-cache-meta");
    if (metaEl) {
      if (usedDemo) {
        metaEl.textContent =
          "Showing demo series: Council API not reachable or returned no points. Deploy GET /api/devtools/minima-holdings?address=… on the site origin (or set window.STABLES_MINIMA_HOLDINGS_API). Server cache refreshes when the SQL archive ingests.";
      } else {
        var parts = [];
        if (payload.db_refreshed_at) parts.push("DB snapshot: " + payload.db_refreshed_at);
        if (payload.cache_ttl_seconds != null) parts.push("Cache TTL: " + payload.cache_ttl_seconds + "s");
        metaEl.textContent = parts.length ? parts.join(" · ") : "Live data from Council API.";
      }
    }

    var label = usedDemo ? "Demo balance (API offline)" : "Balance (cached)";
    renderChart(canvas, series, label);

    if (usedDemo) {
      setStatusBanner(statusEl, "warn", "API offline or empty: demo chart shown. Wire MySQL-backed API on the server to go live.");
    } else {
      setStatusBanner(statusEl, "ok", "Loaded from Council holdings API.");
    }

    window.__lastHoldingsPayload = payload;
    window.__lastHoldingsSeries = series;

    if (btn) {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
    }
  }

  function exportCsv() {
    var series = window.__lastHoldingsSeries;
    if (!series || !series.length) return;
    var rows = [["x", "y"].join(",")].concat(
      series.map(function (p) {
        return [JSON.stringify(p.x), p.y].join(",");
      })
    );
    var blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "minima-holdings.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function init() {
    var addrInput = document.getElementById("minima-addr");
    var btn = document.getElementById("run-query-btn");
    var csvBtn = document.getElementById("export-csv-btn");

    if (addrInput && !addrInput.value.trim()) {
      addrInput.value = DEFAULT_ADDRESS;
    }

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

    var initial = addrInput && addrInput.value.trim() ? addrInput.value.trim() : DEFAULT_ADDRESS;
    loadHoldings(initial);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
