/* ---------------------------------------------------------------------------------------------
 * ONE OWNER FOR EXPENSIVE NODE READS, AND ONE GATE FOR EXPENSIVE REPAINTS.
 *
 * Founder, 2026-09-03, looking at Android's battery screen: "the battery usage of the app seems
 * way too high" (Stables 49 percent since the last full charge). The phone's own accounting said
 * where it went: 183 mAh of the 614 mAh drain, and 82 of its 118 mAh of CPU were spent while the
 * app was OPEN, not in the background. Idle on the Wallet page the app was burning about 55 percent
 * of a core, and the two biggest lines were both self-inflicted:
 *
 *   - `balance` was read 6.6 times a minute at 680 ms each on the phone's wallet (22 a minute on
 *     the desktop preview), because THREE independent paths each believed they owned the read: the
 *     wallet re-render kick, the live poll (twice per cycle, its own pull plus a test-channel patch
 *     that added another), and the readiness sweep. Nothing was wrong with any one of them. The
 *     fault was that there was no one place that could see all three.
 *   - The renderers ran 60 to 70 times a minute with nothing on screen changing, because every
 *     response from every one of those reads repainted the wallet, the activity list and the
 *     global UI, whether or not a single figure had moved.
 *
 * So this file answers, once, the two questions each of those paths was answering privately:
 *
 *   stablesNodeReadBudget.request(key, {reason}, run)  — may this read run right now?
 *   stablesRenderGate.install(...)                     — has anything actually changed to paint?
 *
 * THE RULE THE BUDGET ENFORCES: a read caused by an EVENT (the person acted, a block arrived, the
 * node pushed, the app came back to the front) runs immediately. A read caused by a TIMER runs only
 * if the last good answer is genuinely old. A timer must never be able to re-read the node just
 * because it fired, which is what "no timer re-reads" means; the events are what keep the app
 * current, and there is no event that does not have one.
 *
 * FAILING OPEN IS THE LAW HERE TOO (learned on 2026-09-02, [[project_background_work_battery]]):
 * an unknown key, a missing clock, a signature that cannot be computed, a read that throws — all of
 * these RUN THE WORK. Being wrong towards doing the work costs a little battery. Being wrong the
 * other way costs the app: a wallet that never refreshes and a screen that never repaints.
 *
 * Exercised by work/tools/verify-node-read-budget.mjs, which runs this file in a VM.
 * ------------------------------------------------------------------------------------------- */
(function () {
  'use strict';

  var W = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  if (!W || W.stablesNodeReadBudget) return;

  function now() { return Date.now(); }

  /* ------------------------------------------------------------------ the read budget ------ */

  /* An EVENT is something that happened to this wallet: it earns a read. Everything else is a
     timer, and a timer earns a read only when the answer it holds has actually gone stale.
     Every reason string used anywhere in the app must appear here — verify-node-read-budget.mjs
     fails the build on an unknown one, so a typo can never silently demote a user's action to
     ambient. */
  var EVENT_REASONS = {
    'boot': 1,             // first load: nothing is known yet
    'foreground': 1,       // the app came back to the front
    'new-block': 1,        // the chain moved under us
    'native-balance': 1,   // the node pushed a balance change
    'incoming': 1,         // a payment is arriving
    'user-action': 1,      // the person sent, claimed, minted, burned or traded
    'settlement': 1,       // a transaction of ours reached a new stage
    'proof-expiry': 1,     // the proof we hold has aged out and must be re-proven
    'readiness': 1,        // a readiness subject is NOT proven and is retrying
    'page-open': 1         // a surface that needs this figure was just opened
  };

  var DEFAULT_STALE_MS = 90000;

  var budgets = Object.create(null);
  var counters = { requests: 0, reads: 0, coalesced: 0, skippedFresh: 0, skippedGap: 0, byReason: Object.create(null) };

  function slot(key) {
    var k = String(key || 'default');
    return budgets[k] || (budgets[k] = { key: k, inFlight: null, lastStartAt: 0, lastOkAt: 0, lastReason: null, reads: 0 });
  }

  function isEventReason(reason) {
    return !!EVENT_REASONS[String(reason || '')];
  }

  /**
   * Ask to run an expensive node read.
   *
   * @param key   what is being read ('wallet-balance', 'live-poll-balance', …). One budget per key.
   * @param opts  { reason, staleMs, minGapMs, skipValue }
   * @param run   () => Promise, the read itself. Called only when the budget allows it.
   * @returns     the read's promise, the in-flight promise, or a resolved promise when skipped.
   *              Callers already treat "no result" as "nothing new", because the previous
   *              hand-rolled throttle returned exactly that.
   */
  function request(key, opts, run) {
    var o = opts || {};
    if (typeof run !== 'function') return Promise.resolve(o.skipValue);
    var reason = String(o.reason || 'ambient');
    var s = slot(key);
    var t = now();

    counters.requests++;
    counters.byReason[reason] = (counters.byReason[reason] || 0) + 1;

    /* One read at a time per key. This alone collapses the bursts: a native push, a block and a
       repaint arriving together used to be three reads of the same figure. */
    if (s.inFlight) { counters.coalesced++; return s.inFlight; }

    if (isEventReason(reason)) {
      var minGap = Number(o.minGapMs) || 0;
      if (minGap > 0 && s.lastStartAt && (t - s.lastStartAt) < minGap) {
        counters.skippedGap++;
        return Promise.resolve(o.skipValue);
      }
    } else {
      var staleMs = Number(o.staleMs);
      if (!isFinite(staleMs) || staleMs <= 0) staleMs = DEFAULT_STALE_MS;
      if (s.lastOkAt && (t - s.lastOkAt) < staleMs) {
        counters.skippedFresh++;
        return Promise.resolve(o.skipValue);
      }
    }

    s.lastStartAt = t;
    s.lastReason = reason;
    s.reads++;
    counters.reads++;

    var p;
    try {
      p = Promise.resolve(run());
    } catch (err) {
      s.inFlight = null;
      return Promise.reject(err);
    }
    var tracked = p.then(function (r) {
      /* Only a read that ANSWERED counts as fresh. A failure leaves the budget stale, so the next
         timer retries instead of sitting on a hole (four-state truth law: unknown is not a value). */
      s.lastOkAt = now();
      return r;
    }, function (err) {
      throw err;
    });
    /* .finally is not used: the MiniDapp's WebView is old enough on some hosts that a missing
       Promise.prototype.finally would take the whole read path down with it.
       The latch is compared against the promise STORED in it, not against the one it was derived
       from — getting that wrong (first cut of this file, caught by verify-node-read-budget.mjs)
       leaves the latch closed for ever, and then one early read silences every later one. */
    var wrapper = tracked.then(function (r) {
      if (s.inFlight === wrapper) s.inFlight = null;
      return r;
    }, function (err) {
      if (s.inFlight === wrapper) s.inFlight = null;
      throw err;
    });
    s.inFlight = wrapper;
    return s.inFlight;
  }

  W.stablesNodeReadBudget = {
    request: request,
    isEventReason: isEventReason,
    eventReasons: function () { return Object.keys(EVENT_REASONS); },
    /** A read that happened outside this budget still refreshes what the budget knows. */
    noteRead: function (key) { var s = slot(key); s.lastStartAt = now(); s.lastOkAt = now(); },
    lastOkAt: function (key) { return slot(key).lastOkAt; },
    ageMs: function (key) { var s = slot(key); return s.lastOkAt ? (now() - s.lastOkAt) : Infinity; },
    report: function () {
      var out = { counters: counters, keys: {} };
      Object.keys(budgets).forEach(function (k) {
        var s = budgets[k];
        out.keys[k] = { reads: s.reads, lastReason: s.lastReason, ageMs: s.lastOkAt ? (now() - s.lastOkAt) : null, inFlight: !!s.inFlight };
      });
      return out;
    },
    reset: function () {
      budgets = Object.create(null);
      counters = { requests: 0, reads: 0, coalesced: 0, skippedFresh: 0, skippedGap: 0, byReason: Object.create(null) };
    }
  };

  /* ----------------------------------------------------------------- the render gate ------- */

  /* A repaint is skipped only when NOTHING IT DRAWS HAS CHANGED, and never for longer than
     MAX_SKIP_MS. That ceiling is the honest part: a signature can only cover what it can see, so
     anything it cannot see (a relative time, a released balance hold) is still repainted within
     five seconds. The saving comes from the ten repaints a minute that draw an identical screen. */
  var MAX_SKIP_MS = 5000;
  var gateState = Object.create(null);
  var gateCounters = { calls: 0, painted: 0, skipped: 0, byName: Object.create(null) };

  function digestRows(rows, max) {
    if (!rows || typeof rows.length !== 'number') return null;
    var n = Math.min(rows.length, max || 60);
    var s = rows.length + '|';
    for (var i = 0; i < n; i++) {
      var r = rows[i] || {};
      s += (r.id || '') + ',' + (r.status || '') + ',' + (r.amt || '') + ',' + (r.dir || '')
        + ',' + (r.title || '') + ',' + (r.ccy || '') + ';';
    }
    return s;
  }

  /* Signatures read only PUBLIC state, and return null the moment they cannot see something —
     null means "paint, I do not know". */
  var SIGNATURES = {
    activity: function () {
      try {
        if (typeof W.stablesGetUserActivityRows !== 'function') return null;
        return digestRows(W.stablesGetUserActivityRows(), 60);
      } catch (_) { return null; }
    },
    balances: function () {
      try {
        var live = W.__STABLES_LIVE_NODE || {};
        var proof = W.__STABLES_WALLET_PROOF_STATE__ || {};
        var detail = W.__STABLES_TEST_TOKEN_BALANCE_DETAIL__;
        var d = '';
        if (detail && typeof detail === 'object') {
          var keys = Object.keys(detail).sort();
          for (var i = 0; i < keys.length; i++) {
            var v = detail[keys[i]] || {};
            d += keys[i] + ':' + v.available + '/' + v.total + '/' + v.unconfirmed + ';';
          }
        } else if (detail !== undefined && detail !== null) {
          return null;
        }
        return d + '|' + live.minima + '|' + live.block + '|' + proof.state
          + '|' + (W.__STABLES_LIVE_BAL_SYNCED_ONCE ? 1 : 0)
          + '|' + (W.__STABLES_PRIVACY_MODE ? 1 : 0)
          + '|' + (W.stablesPrimaryCcy ? W.stablesPrimaryCcy() : '');
      } catch (_) { return null; }
    }
  };

  function combine(names) {
    return function () {
      var out = '';
      for (var i = 0; i < names.length; i++) {
        var fn = SIGNATURES[names[i]];
        if (!fn) return null;
        var part = fn();
        if (part === null || part === undefined) return null;
        out += part + '##';
      }
      return out;
    };
  }

  /**
   * Put the gate in front of a repaint. Idempotent: installing twice leaves one gate.
   * @param name    the global function to wrap
   * @param sigFn   () => string|null, what the repaint draws. null = always paint.
   */
  function wrap(name, sigFn) {
    var orig = W[name];
    if (typeof orig !== 'function') return false;
    if (orig.__stablesGated) return true;
    var st = gateState[name] || (gateState[name] = { sig: null, lastPaintAt: 0 });
    var gated = function () {
      gateCounters.calls++;
      var c = gateCounters.byName[name] || (gateCounters.byName[name] = { calls: 0, painted: 0, skipped: 0 });
      c.calls++;
      var sig = null;
      try { sig = sigFn(); } catch (_) { sig = null; }
      var t = now();
      if (sig !== null && sig === st.sig && (t - st.lastPaintAt) < MAX_SKIP_MS) {
        gateCounters.skipped++; c.skipped++;
        return undefined;
      }
      st.sig = sig;
      st.lastPaintAt = t;
      gateCounters.painted++; c.painted++;
      return orig.apply(this, arguments);
    };
    gated.__stablesGated = true;
    gated.__stablesOriginal = orig;
    W[name] = gated;
    return true;
  }

  /* Is the surface this work feeds actually on screen? A per-second countdown is honest work on
     the page that shows it and pure waste on every other page, and "the app is open" is not the
     same question as "this is on screen". Fails open: an element or a page it cannot find is
     treated as visible, because being wrong towards working costs battery and being wrong the
     other way costs a frozen surface. */
  W.stablesSurfaceOnScreen = function (elementId) {
    try {
      var el = (typeof document !== 'undefined') ? document.getElementById(elementId) : null;
      if (!el) return false;
      var page = (typeof el.closest === 'function') ? el.closest('.page') : null;
      if (!page || !page.classList) return true;
      return page.classList.contains('active');
    } catch (_) { return true; }
  };

  W.stablesRenderGate = {
    /* The three repaints the measurement caught running on an unchanged screen. */
    install: function () {
      var done = [];
      if (wrap('renderWalletRecentActivity', combine(['activity', 'balances']))) done.push('renderWalletRecentActivity');
      if (wrap('renderActivity', combine(['activity']))) done.push('renderActivity');
      if (wrap('updateGlobalUI', combine(['balances']))) done.push('updateGlobalUI');
      try { console.log('[STABLES-POWER] render gate on: ' + (done.join(', ') || 'nothing to wrap')); } catch (_) { /* ignore */ }
      return done;
    },
    wrap: wrap,
    signatures: SIGNATURES,
    maxSkipMs: function () { return MAX_SKIP_MS; },
    report: function () { return gateCounters; },
    reset: function () {
      gateState = Object.create(null);
      gateCounters = { calls: 0, painted: 0, skipped: 0, byName: Object.create(null) };
    }
  };

  /* THE THREE REPAINTS DO NOT ALL EXIST AT THE SAME MOMENT. The global one is declared in the
     shell, but the wallet and activity lists are assigned by a route script that loads AFTER the
     shell's boot step has run — so the first install caught one of the three and the measurement
     showed exactly that (founder's preview, 2026-09-03). Installing is idempotent, so it simply
     runs again once the page has finished loading, and once more a little after that for a host
     that fires no load event. */
  try {
    if (typeof W.addEventListener === 'function') {
      W.addEventListener('load', function () { try { W.stablesRenderGate.install(); } catch (_) { /* ignore */ } });
    }
  } catch (_) { /* ignore */ }
  try {
    if (typeof W.setTimeout === 'function') {
      W.setTimeout(function () { try { W.stablesRenderGate.install(); } catch (_) { /* ignore */ } }, 3000);
    }
  } catch (_) { /* ignore */ }
})();
