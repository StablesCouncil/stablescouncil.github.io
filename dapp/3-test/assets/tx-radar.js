// TX radar — minimal dev instrument that proves early transaction visibility in the app.
// Renders a fixed timestamp strip (bottom of screen) and logs three kinds of lines:
//   FIRED    — sender pressed send and the command was dispatched
//   EVT …    — a node event reached this app's JS layer (native push on APK, MDS event on web)
//   IN / OUT — a new wallet-relevant transaction appeared in the node's `history`
// The wall-clock delta between FIRED (sender window) and IN (receiver window) is the proof.
// Gated by STABLES_CONFIG.TX_RADAR_ENABLED; pointer-events none so it never blocks the UI.
// Purely additive: no interaction with the existing send/activity machinery.
(function () {
  'use strict';

  var CFG = window.STABLES_CONFIG || {};
  if (!CFG.TX_RADAR_ENABLED) return;
  // 'console' mode: keep the timestamped console/logcat lines for measurement, no on-screen strip.
  var CONSOLE_ONLY = CFG.TX_RADAR_ENABLED === 'console';

  var MAX_LINES = 9;
  var known = null;          // Set of txpowids seen in history; null until first successful read arms the radar
  var checking = false;
  var recheck = '';
  var listEl = null;

  function two(n) { return (n < 10 ? '0' : '') + n; }
  function ts() {
    var d = new Date();
    return two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds()) + '.' +
      ('00' + d.getMilliseconds()).slice(-3);
  }

  function tokenLabel(tokenid) {
    var id = String(tokenid || '');
    if (id === '0x00') return 'MINIMA';
    var reg = CFG.TEST_TOKEN_REGISTRY || {};
    // Case-insensitive: history/txpow tokenids are uppercase; registry ids are often lowercase.
    var low = String(id || '').toLowerCase();
    if (low === String(reg.winiwa_token_id || '').toLowerCase()) return 'Winiwa';
    if (low === String(reg.usdw_token_id || '').toLowerCase()) return 'USDw';
    if (low === String(reg.xwiniwa_token_id || '').toLowerCase()) return 'xWiniwa';
    return id.slice(0, 10) + '…';
  }

  function ensureUi() {
    if (CONSOLE_ONLY) return false;
    if (listEl) return true;
    if (!document.body) return false;
    var style = document.createElement('style');
    style.textContent =
      '.txradar-strip{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;pointer-events:none;' +
      'background:rgba(11,15,20,0.88);border-top:1px solid rgba(103,232,249,0.35);' +
      'font:10px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#9fb0c0;padding:2px 6px 3px;}' +
      '.txradar-tag{color:#67e8f9;letter-spacing:1px;font-size:9px;}' +
      '.txradar-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.txradar-line.txradar-in{color:#67e8f9;font-weight:700;}' +
      '.txradar-line.txradar-out{color:#fbbf24;}' +
      '.txradar-line.txradar-fired{color:#a78bfa;font-weight:700;}' +
      '.txradar-line.txradar-dim{opacity:0.55;}' +
      '.txradar-line.txradar-flash{animation:txradarFlash 1.2s ease-out;}' +
      '@keyframes txradarFlash{0%{background:rgba(103,232,249,0.45);}100%{background:transparent;}}';
    document.head.appendChild(style);
    var strip = document.createElement('div');
    strip.className = 'txradar-strip';
    strip.innerHTML = '<div class="txradar-tag">TX RADAR</div>';
    listEl = document.createElement('div');
    strip.appendChild(listEl);
    document.body.appendChild(strip);
    return true;
  }

  function log(text, cls, flash) {
    var line = ts() + '  ' + text;
    try { console.log('[TxRadar] ' + line); } catch (_) { /* ignore */ }
    if (!ensureUi()) return;
    var el = document.createElement('div');
    el.className = 'txradar-line' + (cls ? ' txradar-' + cls : '') + (flash ? ' txradar-flash' : '');
    el.textContent = line;
    listEl.insertBefore(el, listEl.firstChild);
    while (listEl.childNodes.length > MAX_LINES) listEl.removeChild(listEl.lastChild);
  }

  // Same dropped-callback guard as tx-mirror.js: a command that never answers must not
  // wedge the checking gate.
  function runCmd(cmd, cb) {
    var done = false;
    var finish = function (res) {
      if (done) return;
      done = true;
      cb(res);
    };
    var tid = setTimeout(function () { finish(null); }, 15000);
    var wrapped = function (res) { clearTimeout(tid); finish(res); };
    try {
      if (typeof MDS !== 'undefined' && MDS.cmd) { MDS.cmd(cmd, wrapped); return; }
    } catch (_) { /* ignore */ }
    try {
      if (typeof window.stablesRpcSendCommand === 'function') {
        window.stablesRpcSendCommand(cmd).then(wrapped).catch(function () { wrapped(null); });
        return;
      }
    } catch (_) { /* ignore */ }
    wrapped(null);
  }

  // history response → [{ id, parts:['+5 Winiwa',…], incoming }] (newest first, relevant-only)
  function parseHistory(res) {
    try {
      var r = res && (res.response || (res[0] && res[0].response));
      if (!res || res.status === false || !r || !r.txpows) return null;
      var out = [];
      for (var i = 0; i < r.txpows.length; i++) {
        var tp = r.txpows[i] || {};
        var det = (r.details && r.details[i]) || {};
        var parts = [];
        var incoming = false;
        var diff = det.difference || {};
        for (var k in diff) {
          if (!Object.prototype.hasOwnProperty.call(diff, k)) continue;
          var amt = parseFloat(String(diff[k]));
          if (!isFinite(amt) || amt === 0) continue;
          parts.push((amt > 0 ? '+' : '') + amt + ' ' + tokenLabel(k));
          if (amt > 0) incoming = true;
        }
        out.push({ id: String(tp.txpowid || ''), parts: parts, incoming: incoming });
      }
      return out;
    } catch (_) { return null; }
  }

  function check(tag) {
    if (checking) { recheck = tag || recheck; return; }
    checking = true;
    runCmd('history max:20', function (res) {
      checking = false;
      var rows = parseHistory(res);
      if (!rows) return; // node not reachable yet — stay unarmed / retry on next tick
      if (known === null) {
        known = {};
        for (var i = 0; i < rows.length; i++) known[rows[i].id] = true;
        log('radar armed — ' + rows.length + ' existing txns ignored', 'dim');
        return;
      }
      for (var j = rows.length - 1; j >= 0; j--) {
        var row = rows[j];
        if (!row.id || known[row.id]) continue;
        known[row.id] = true;
        var desc = row.parts.length ? row.parts.join('  ') : 'relevant txn';
        log((row.incoming ? 'IN   ' : 'OUT  ') + desc + '  [' + tag + '] ' + row.id.slice(0, 12),
          row.incoming ? 'in' : 'out', true);
      }
      if (recheck) { var t = recheck; recheck = ''; check(t); }
    });
  }

  window.StablesTxRadar = {
    onNodeEvent: function (ev, txpowId) {
      var id = String(txpowId || '');
      log('EVT  ' + String(ev || '?') + (id ? ' ' + id.slice(0, 12) : ''), 'dim');
      check('push:' + ev);
    },
    fired: function (desc) {
      log('FIRED ' + String(desc || 'send'), 'fired', true);
    },
    accepted: function (desc) {
      log('NODE-ACCEPTED ' + String(desc || ''), 'dim');
    }
  };

  // Poll fallback: the APK has native push, so it only needs a slow safety poll;
  // web/RPC has no push, so the poll IS the detector — keep it tight there.
  // Both Android packages get native push, so both take the slow safety poll. Testing only the
  // standalone flag left the Core APK polling every 2s on a phone battery.
  var pollMs = (window.__STABLES_ANDROID_APP || window.__STABLES_CORE_CONNECTED_APP) ? 6000 : 2000;
  window.stablesRepeatWhileVisible('tx-radar-poll', function () { check('poll'); }, pollMs);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { check('init'); });
  } else {
    check('init');
  }
})();
