/**
 * Stables payment tier system: Quick pay, Standard pay, Protected pay.
 * Loaded before send handlers; uses window.convertFromCcyToBaseEq and BASE_CCY when present.
 */
(function () {
  'use strict';

  var SETTINGS_KEY = 'stables_payment_security_v1';
  var PIN_HASH_KEY = 'stables_payment_code_v1';
  var DAILY_KEY = 'stables_quick_pay_daily_v1';
  var CARD_SPEND_KEY = 'stables_card_spend_v1';
  var LOCKOUT_KEY = 'stables_payment_code_lockout_v1';
  var LEGACY_CONFIRM_TARGET_KEY = 'stables_confirm_target_v1';
  var CONFIRM_MIGRATED_KEY = 'stables_confirmation_policy_migrated_v1';

  var DEFAULTS = {
    quickPayEnabled: true,
    quickPayLimit: 50,
    significantThreshold: 500,
    dailyQuickPayCap: 200,
    quickPayUndo: false,
    biometricEnabled: false,
    confirmationPolicyEnabled: true
  };

  /**
   * Value thresholds are in the wallet primary currency (same unit as quick-pay limits).
   * Founder 2026-09-03: "by default make just one 3 blocks confirmation, not multiple". One level; a person can
   * still add value tiers. Founder 2026-10-04 (build 0.0.12.025): "by default, let's make the default of block to 1
   * in the confirmation": every amount complete at 1 block.
   */
  var DEFAULT_CONFIRMATION_LEVELS = [
    { label: 'All', upTo: null, blocks: 1 }
  ];
  /** The five-tier default shipped before 2026-09-03. A stored copy that still equals it was never
      chosen by the person, so it follows the new default; anything else is theirs and stays. */
  var LEGACY_DEFAULT_CONFIRMATION_LEVELS = [
    { label: 'Small', upTo: 50, blocks: 1 },
    { label: 'Everyday', upTo: 500, blocks: 2 },
    { label: 'Significant', upTo: 2500, blocks: 3 },
    { label: 'Large', upTo: 10000, blocks: 5 },
    { label: 'Critical', upTo: null, blocks: 10 }
  ];
  function isLegacyDefaultLevels(levels) {
    if (!Array.isArray(levels) || levels.length !== LEGACY_DEFAULT_CONFIRMATION_LEVELS.length) return false;
    for (var i = 0; i < levels.length; i++) {
      var a = levels[i] || {}, b = LEGACY_DEFAULT_CONFIRMATION_LEVELS[i];
      var au = (a.upTo === null || a.upTo === undefined || a.upTo === '') ? null : Number(a.upTo);
      if (au !== b.upTo || Number(a.blocks) !== b.blocks) return false;
    }
    return true;
  }
  var MIN_CONFIRM_BLOCKS = 1;
  var MAX_CONFIRM_BLOCKS = 30;
  var MAX_CONFIRM_LEVELS = 5;

  var VALID_CONTACT_TIERS = ['inherit', 'quick', 'standard', 'protected'];
  var VALID_PIN_LENGTH = 4;
  var MAX_PIN_ATTEMPTS = 5;
  var LOCKOUT_MS = 15 * 60 * 1000;
  var UNDO_MS = 2000;

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) { /* ignore */ }
  }

  function getSettings() {
    var saved = readJson(SETTINGS_KEY, {});
    return {
      quickPayEnabled: saved.quickPayEnabled !== false,
      quickPayLimit: finiteNum(saved.quickPayLimit, DEFAULTS.quickPayLimit),
      cardLevels: normalizeCardLevels(saved.cardLevels),
      significantThreshold: finiteNum(saved.significantThreshold, DEFAULTS.significantThreshold),
      dailyQuickPayCap: finiteNum(saved.dailyQuickPayCap, DEFAULTS.dailyQuickPayCap),
      quickPayUndo: !!saved.quickPayUndo,
      biometricEnabled: !!saved.biometricEnabled,
      confirmationPolicyEnabled: saved.confirmationPolicyEnabled !== false,
      confirmationLevels: normalizeConfirmationLevels(isLegacyDefaultLevels(saved.confirmationLevels) ? null : saved.confirmationLevels)
    };
  }

  /**
   * Stables card levels (build 0.0.12.036, Machinery D098; founder 2026-10-04: "the one touch, confirmation or pin/bio
   * confirmation should be set for single transaction, day and week level, let's have this match what we already have
   * at the global app level"). The three steps the Savings tiers have (Quick pay, Standard pay, Protected pay), for
   * the card, each bounded per payment, per day and per week:
   *   - One touch: holding the phones together pays, nothing to press;
   *   - Confirm: Confirm send, then the tap;
   *   - above both: the payment code or fingerprint, then the tap.
   * A payment takes the first step whose three limits it fits, counting what the card already paid today and in the
   * last 7 days. A per-payment limit of 0 switches that step off; a day or week limit of 0 sets no limit, as the
   * Savings daily cap does. Payments are counted in the main currency, as the Savings tiers count them.
   */
  var CARD_LEVEL_DEFAULTS = {
    tap: { payment: 50, day: 200, week: 500 },
    confirm: { payment: 500, day: 1000, week: 3000 }
  };
  var CARD_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  /* Build 0.0.12.038 (founder's Pro: "The quick pay required 2 touches"): the card's levels no longer start from the
     Savings quick-pay limit. His was below 22, so a 22 Winiwa tap fell to Confirm although the card showed 50. The card
     has its own defaults until the person sets its levels on the card's window. */
  function normalizeCardLevels(raw) {
    var out = {};
    ['tap', 'confirm'].forEach(function (step) {
      var src = raw && raw[step] ? raw[step] : {};
      var def = CARD_LEVEL_DEFAULTS[step];
      out[step] = {
        payment: Math.max(0, finiteNum(src.payment, def.payment)),
        day: Math.max(0, finiteNum(src.day, def.day)),
        week: Math.max(0, finiteNum(src.week, def.week))
      };
    });
    return out;
  }
  function cardSpendLog() {
    var log = readJson(CARD_SPEND_KEY, []);
    var since = Date.now() - CARD_WEEK_MS;
    return Array.isArray(log) ? log.filter(function (x) { return x && x.at > since && finiteNum(x.fiat, 0) > 0; }) : [];
  }
  /** What the card paid today (calendar day) and in the last 7 days, in the main currency. */
  function cardSpend() {
    var start = new Date(); start.setHours(0, 0, 0, 0);
    var day = 0, week = 0;
    cardSpendLog().forEach(function (x) { var f = finiteNum(x.fiat, 0); week += f; if (x.at >= start.getTime()) day += f; });
    return { day: day, week: week };
  }
  function recordCardSpend(fiatAmount) {
    var amt = finiteNum(fiatAmount, 0);
    if (!(amt > 0)) return;
    var log = cardSpendLog();
    log.push({ at: Date.now(), fiat: amt });
    writeJson(CARD_SPEND_KEY, log);
  }
  function fitsCardStep(lim, fiat, spent) {
    return lim.payment > 0 && fiat <= lim.payment + 1e-9
      && (!(lim.day > 0) || spent.day + fiat <= lim.day + 1e-9)
      && (!(lim.week > 0) || spent.week + fiat <= lim.week + 1e-9);
  }
  /** 'tap' (one touch), 'confirm', or 'code' (payment code or fingerprint) for a card payment of this value. */
  function cardTier(fiatTotal) {
    var fiat = finiteNum(fiatTotal, 0);
    if (!(fiat > 0)) return 'code';
    var lv = getSettings().cardLevels, spent = cardSpend();
    if (fitsCardStep(lv.tap, fiat, spent)) return 'tap';
    if (fitsCardStep(lv.confirm, fiat, spent)) return 'confirm';
    return 'code';
  }
  /** What one touch can still pay at once: the per-payment limit, less what the day and week have used. */
  function cardTapRoom() {
    var lim = getSettings().cardLevels.tap, spent = cardSpend();
    if (!(lim.payment > 0)) return 0;
    var room = lim.payment;
    if (lim.day > 0) room = Math.min(room, lim.day - spent.day);
    if (lim.week > 0) room = Math.min(room, lim.week - spent.week);
    return Math.max(0, room);
  }
  function cardTapAllows(fiatTotal) { return cardTier(fiatTotal) === 'tap'; }
  /* D123 (founder 2026-10-06): one card payment made by code (at a distance) is capped at the card's one-touch DAY
     level, 200 by default, so it follows what the person set for the card. 0 there means no day limit: the default
     cap of 200 then applies. */
  function cardDistanceCap() {
    var day = getSettings().cardLevels.tap.day;
    return day > 0 ? day : CARD_LEVEL_DEFAULTS.tap.day;
  }

  function cardLevelsEsc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  /**
   * The card levels as one table (One touch / Confirm by Payment / Day / Week), drawn into every
   * [data-card-levels] host: the card's own window and Payment security show the same values, saved on change.
   */
  function renderCardLevels() {
    var hosts = document.querySelectorAll('[data-card-levels]');
    if (!hosts.length) return;
    var lv = getSettings().cardLevels, spent = cardSpend(), unit = displayPrimaryCcy();
    var names = { tap: 'One touch', confirm: 'Confirm' };
    var cols = [['payment', 'Payment'], ['day', 'Day'], ['week', 'Week']];
    Array.prototype.forEach.call(hosts, function (host) {
      if (host.contains(document.activeElement)) return;     // never redraw under the person's typing
      var html = '<div class="card-levels__grid" role="table" aria-label="Stables card levels, in ' + cardLevelsEsc(unit) + '">'
        + '<span role="columnheader"></span>' + cols.map(function (c) { return '<span class="card-levels__col" role="columnheader">' + c[1] + '</span>'; }).join('');
      ['tap', 'confirm'].forEach(function (step) {
        html += '<span class="card-levels__step" role="rowheader">' + names[step] + '</span>';
        cols.forEach(function (c) {
          html += '<input class="finput card-levels__in" data-financial-amount type="text" inputmode="decimal" autocomplete="off"'
            + ' data-card-step="' + step + '" data-card-limit="' + c[0] + '" aria-label="' + names[step] + ', up to per ' + c[1].toLowerCase() + ' (' + cardLevelsEsc(unit) + ')"'
            + ' value="' + cardLevelsEsc(groupInputAmount(lv[step][c[0]])) + '">';
        });
      });
      html += '</div><p class="xs mu card-levels__note">Above these: payment code or fingerprint. Paid today '
        + cardLevelsEsc(formatPrimaryAmount(spent.day)) + ', last 7 days ' + cardLevelsEsc(formatPrimaryAmount(spent.week)) + ' ' + cardLevelsEsc(unit) + '.</p>';
      host.innerHTML = html;
      Array.prototype.forEach.call(host.querySelectorAll('.card-levels__in'), function (inp) {
        inp.addEventListener('change', function () {
          var next = getSettings().cardLevels;
          var v = finiteNum(inp.value, NaN);
          if (Number.isFinite(v) && v >= 0) next[inp.getAttribute('data-card-step')][inp.getAttribute('data-card-limit')] = v;
          saveSettings({ cardLevels: next });
          inp.blur();
          renderCardLevels();
          try { window.dispatchEvent(new CustomEvent('stables:card-levels')); } catch (_) { /* old WebView */ }
        });
      });
    });
  }

  function saveSettings(partial) {
    var cur = getSettings();
    var next = Object.assign({}, cur, partial || {});
    writeJson(SETTINGS_KEY, next);
    return next;
  }

  function finiteNum(v, fallback) {
    /* Amount fields are grouped as a person types, so "1,000" arrives here.
       A MISSING or empty value is the default, never zero (build 102). The comma handling of
       2026-09-07 turned `undefined` into `Number('')`, which is 0, so a person who had never saved
       the Security page got a quick-pay limit, a significant threshold and a daily cap of 0: every
       send was Protected pay and quick pay never ran, against the defaults above (50, 500, 200).
       Before that change `Number(undefined)` was NaN and fell back, as it does again here. An
       explicit 0 is still honoured. */
    var s = String(v == null ? '' : v).replace(/,/g, '').trim();
    if (s === '') return fallback;
    var n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  /* The grouped form of a stored amount, for writing back into an amount field. */
  function groupInputAmount(n) {
    var x = finiteNum(n, 0);
    return x.toLocaleString('en-US', { maximumFractionDigits: 8 });
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function getDailyQuickSpend() {
    var rec = readJson(DAILY_KEY, {});
    if (rec.date !== todayKey()) return 0;
    return finiteNum(rec.total, 0);
  }

  function recordQuickPaySpend(fiatAmount) {
    var amt = finiteNum(fiatAmount, 0);
    if (!(amt > 0)) return;
    var rec = readJson(DAILY_KEY, {});
    var total = rec.date === todayKey() ? finiteNum(rec.total, 0) : 0;
    writeJson(DAILY_KEY, { date: todayKey(), total: total + amt });
  }

  function wouldExceedDailyCap(fiatAmount) {
    var settings = getSettings();
    var cap = settings.dailyQuickPayCap;
    if (!(cap > 0)) return false;
    return getDailyQuickSpend() + finiteNum(fiatAmount, 0) > cap + 1e-9;
  }

  function primaryCurrencyCode() {
    if (typeof window.stablesGetPrimaryCcy === 'function') {
      var primary = window.stablesGetPrimaryCcy();
      if (primary) return primary;
    }
    return (typeof window.BASE_CCY !== 'undefined' && window.BASE_CCY) ? window.BASE_CCY : 'MINIMA';
  }

  function fiatEquivalent(amount, ccyCode) {
    var base = primaryCurrencyCode();
    var from = String(ccyCode || '').trim();
    var amt = finiteNum(amount, 0);
    if (!(amt > 0)) return 0;
    if (from === base) return amt;
    if (typeof window.convertFromCcyToBaseEq === 'function') {
      var eq = window.convertFromCcyToBaseEq(amt, from, base);
      if (Number.isFinite(eq)) return eq;
    }
    return amt;
  }

  function displayPrimaryCcy() {
    if (typeof window.displayCcyCodeForUI === 'function') {
      return window.displayCcyCodeForUI(primaryCurrencyCode());
    }
    return primaryCurrencyCode();
  }

  function primaryAmountDecimals() {
    var base = primaryCurrencyCode();
    if (typeof window.decimalsForCcyForUI === 'function') {
      return window.decimalsForCcyForUI(base);
    }
    return base === 'MINIMA' || base === 'WINIMA' ? 4 : 2;
  }

  function formatPrimaryAmount(n) {
    var dec = primaryAmountDecimals();
    return finiteNum(n, 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: dec });
  }

  function clampConfirmBlocks(n) {
    var v = parseInt(n, 10);
    if (!Number.isFinite(v)) return null;
    return Math.min(MAX_CONFIRM_BLOCKS, Math.max(MIN_CONFIRM_BLOCKS, v));
  }

  function defaultConfirmationLevels() {
    return DEFAULT_CONFIRMATION_LEVELS.map(function (l) {
      return { label: l.label, upTo: l.upTo, blocks: l.blocks };
    });
  }

  /**
   * Normalize a confirmation-levels array: clamp blocks to 1..30, drop invalid rows,
   * sort bounded levels ascending by upTo, keep exactly one catch-all (upTo: null) last,
   * cap at MAX_CONFIRM_LEVELS. Invalid or empty input falls back to defaults.
   */
  function normalizeConfirmationLevels(levels) {
    if (!Array.isArray(levels) || !levels.length) return defaultConfirmationLevels();
    var bounded = [];
    var catchAll = null;
    levels.forEach(function (raw) {
      if (!raw || typeof raw !== 'object') return;
      var blocks = clampConfirmBlocks(raw.blocks);
      if (blocks === null) return;
      var label = String(raw.label || '').trim();
      var upTo = (raw.upTo === null || raw.upTo === undefined || raw.upTo === '') ? null : Number(String(raw.upTo).replace(/,/g, ''));
      if (upTo === null) {
        if (!catchAll) catchAll = { label: label || 'Above', upTo: null, blocks: blocks };
        return;
      }
      if (!Number.isFinite(upTo) || upTo <= 0) return;
      bounded.push({ label: label, upTo: upTo, blocks: blocks });
    });
    bounded.sort(function (a, b) { return a.upTo - b.upTo; });
    var seenUpTo = {};
    bounded = bounded.filter(function (l) {
      var k = String(l.upTo);
      if (seenUpTo[k]) return false;
      seenUpTo[k] = true;
      return true;
    });
    if (!bounded.length && !catchAll) return defaultConfirmationLevels();
    if (!catchAll) {
      catchAll = { label: 'Above', upTo: null, blocks: bounded[bounded.length - 1].blocks };
    }
    var out = bounded.slice(0, MAX_CONFIRM_LEVELS - 1);
    out.push(catchAll);
    out.forEach(function (l, i) { if (!l.label) l.label = l.upTo === null ? 'Above' : 'Level ' + (i + 1); });
    return out;
  }

  function normalizeConfirmationPolicy(policy) {
    var p = policy && typeof policy === 'object' ? policy : {};
    return {
      enabled: p.enabled !== false,
      levels: normalizeConfirmationLevels(p.levels)
    };
  }

  function getConfirmationPolicy() {
    var s = getSettings();
    return { enabled: s.confirmationPolicyEnabled, levels: s.confirmationLevels };
  }

  function saveConfirmationPolicy(policy) {
    var p = normalizeConfirmationPolicy(policy);
    return saveSettings({
      confirmationPolicyEnabled: p.enabled,
      confirmationLevels: p.levels
    });
  }

  /** Legacy single global target (read directly; activity-contacts.js may not be loaded yet). */
  function legacyConfirmTarget() {
    try {
      var v = parseInt(localStorage.getItem(LEGACY_CONFIRM_TARGET_KEY), 10);
      if (Number.isFinite(v) && v >= MIN_CONFIRM_BLOCKS && v <= MAX_CONFIRM_BLOCKS) return v;
    } catch (_) { /* ignore */ }
    return 1;
  }

  /** Pick the confirmation level for a value in the wallet primary currency. upTo is inclusive. */
  function confirmationLevelForValue(fiatTotal) {
    var policy = getConfirmationPolicy();
    if (!policy.enabled) {
      return { label: 'Global', upTo: null, blocks: legacyConfirmTarget() };
    }
    var amt = finiteNum(fiatTotal, 0);
    var levels = policy.levels;
    for (var i = 0; i < levels.length; i++) {
      if (levels[i].upTo === null || amt <= levels[i].upTo + 1e-9) return levels[i];
    }
    return levels[levels.length - 1];
  }

  /** Same ctx shape as classifyTier(ctx). Returns { blocks, label, upTo, fiatTotal }. */
  function confirmationTargetFor(ctx) {
    var c = ctx || {};
    var fiatTotal = finiteNum(c.fiatTotal, 0);
    var level = confirmationLevelForValue(fiatTotal);
    return { blocks: level.blocks, label: level.label, upTo: level.upTo, fiatTotal: fiatTotal };
  }

  /**
   * One-time migration from the old single global target. A stored value of 1 is the old
   * default (and the old slider wrote it on input), so only a deliberate deeper target (>1)
   * seeds all levels; otherwise the new tiered defaults apply. Old key is kept as fallback.
   */
  function migrateLegacyConfirmTarget() {
    try {
      if (localStorage.getItem(CONFIRM_MIGRATED_KEY)) return;
      var saved = readJson(SETTINGS_KEY, {});
      if (!Array.isArray(saved.confirmationLevels)) {
        var old = parseInt(localStorage.getItem(LEGACY_CONFIRM_TARGET_KEY), 10);
        if (Number.isFinite(old) && old > 1 && old <= MAX_CONFIRM_BLOCKS) {
          saved.confirmationLevels = defaultConfirmationLevels().map(function (l) {
            l.blocks = old;
            return l;
          });
          saved.confirmationPolicyEnabled = true;
          writeJson(SETTINGS_KEY, saved);
        }
      }
      localStorage.setItem(CONFIRM_MIGRATED_KEY, '1');
    } catch (_) { /* ignore */ }
  }
  migrateLegacyConfirmTarget();

  /* "set it this way too on my 2 phones for the next update" (founder 2026-10-04, build 0.0.12.025). Once per
     install: a policy that is still the previous one-level default (3 blocks) becomes the new default (1 block). A
     policy the person changed (another block count, value tiers) is theirs and stays. */
  var CONFIRM_ONE_BLOCK_KEY = 'stables_confirmation_default_1_v1';
  function migrateToOneBlockDefault() {
    try {
      if (localStorage.getItem(CONFIRM_ONE_BLOCK_KEY)) return;
      var saved = readJson(SETTINGS_KEY, {});
      var lv = saved.confirmationLevels;
      if (Array.isArray(lv) && lv.length === 1 && lv[0] && (lv[0].upTo === null || lv[0].upTo === undefined) && Number(lv[0].blocks) === 3) {
        saved.confirmationLevels = defaultConfirmationLevels();
        writeJson(SETTINGS_KEY, saved);
      }
      localStorage.setItem(CONFIRM_ONE_BLOCK_KEY, '1');
    } catch (_) { /* ignore */ }
  }
  migrateToOneBlockDefault();

  function normalizeContactTier(tier) {
    var t = String(tier || 'inherit').toLowerCase();
    return VALID_CONTACT_TIERS.indexOf(t) >= 0 ? t : 'inherit';
  }

  /**
   * @param {object} ctx
   * @param {number} ctx.fiatTotal - total in favourite currency equivalent
   * @param {number} ctx.recipientCount
   * @param {string} ctx.source - qr | manual | contact_chip
   * @param {string} ctx.contactTier - inherit | quick | standard | protected
   * @param {boolean} ctx.qrHasAmount
   * @param {boolean} ctx.nodeWritable
   * @returns {'quick'|'standard'|'protected'}
   */
  function classifyTier(ctx) {
    var c = ctx || {};
    var settings = getSettings();
    var contactTier = normalizeContactTier(c.contactTier);
    var fiatTotal = finiteNum(c.fiatTotal, 0);
    var count = Math.max(1, parseInt(c.recipientCount, 10) || 1);

    if (count > 1) return 'protected';
    if (contactTier === 'protected') return 'protected';
    if (fiatTotal >= settings.significantThreshold - 1e-9) return 'protected';
    if (contactTier === 'standard') return 'standard';

    if (
      c.source === 'qr' &&
      c.qrHasAmount &&
      settings.quickPayEnabled &&
      c.nodeWritable !== false &&
      fiatTotal > 0 &&
      fiatTotal <= settings.quickPayLimit + 1e-9 &&
      !wouldExceedDailyCap(fiatTotal) &&
      contactTier !== 'standard' &&
      contactTier !== 'protected'
    ) {
      return 'quick';
    }
    return 'standard';
  }

  function requiresPaymentCode(tier) {
    return tier === 'protected';
  }

  function tierLabel(tier) {
    if (tier === 'quick') return 'Quick pay';
    if (tier === 'protected') return 'Protected pay';
    return 'Standard pay';
  }

  function hasPaymentCode() {
    var rec = readJson(PIN_HASH_KEY, null);
    return !!(rec && rec.hash && rec.salt);
  }

  function getLockout() {
    return readJson(LOCKOUT_KEY, { until: 0, fails: 0 });
  }

  function isLockedOut() {
    var lo = getLockout();
    return lo.until && Date.now() < lo.until;
  }

  function lockoutRemainingMs() {
    var lo = getLockout();
    if (!lo.until) return 0;
    return Math.max(0, lo.until - Date.now());
  }

  function recordPinFailure() {
    var lo = getLockout();
    var fails = (lo.fails || 0) + 1;
    if (fails >= MAX_PIN_ATTEMPTS) {
      writeJson(LOCKOUT_KEY, { until: Date.now() + LOCKOUT_MS, fails: 0 });
    } else {
      writeJson(LOCKOUT_KEY, { until: 0, fails: fails });
    }
  }

  function clearPinFailures() {
    writeJson(LOCKOUT_KEY, { until: 0, fails: 0 });
  }

  function bytesToHex(buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  function hashPin(pin, salt) {
    var data = new TextEncoder().encode(String(salt) + String(pin));
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      return window.crypto.subtle.digest('SHA-256', data).then(function (buf) {
        return bytesToHex(buf);
      });
    }
    return Promise.resolve(simpleHash(String(salt) + String(pin)));
  }

  function simpleHash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return 'djb2_' + (h >>> 0).toString(16);
  }

  function setPaymentCode(pin) {
    var p = String(pin || '');
    if (!/^\d{4}$/.test(p)) return Promise.resolve(false);
    var salt = bytesToHex((window.crypto || crypto).getRandomValues(new Uint8Array(8)));
    return hashPin(p, salt).then(function (hash) {
      writeJson(PIN_HASH_KEY, { salt: salt, hash: hash, v: 1 });
      clearPinFailures();
      return true;
    });
  }

  function verifyPaymentCode(pin) {
    if (isLockedOut()) return Promise.resolve({ ok: false, locked: true });
    var rec = readJson(PIN_HASH_KEY, null);
    if (!rec || !rec.hash || !rec.salt) return Promise.resolve({ ok: false, needsSetup: true });
    var p = String(pin || '');
    if (!/^\d{4}$/.test(p)) {
      recordPinFailure();
      return Promise.resolve({ ok: false });
    }
    return hashPin(p, rec.salt).then(function (hash) {
      if (hash === rec.hash) {
        clearPinFailures();
        return { ok: true };
      }
      recordPinFailure();
      return { ok: false };
    });
  }

  var _pendingPinCallback = null;
  var _biometricPendingCallback = null;
  var _pinEntry = '';
  var _pinSetupStep = 0;
  var _pinSetupFirst = '';

  function isBiometricAvailable() {
    try {
      return !!(window.StablesNative
        && typeof window.StablesNative.isBiometricAvailable === 'function'
        && window.StablesNative.isBiometricAvailable());
    } catch (_) {
      return false;
    }
  }

  function shouldTryBiometric() {
    if (!hasPaymentCode()) return false;
    if (!getSettings().biometricEnabled) return false;
    return isBiometricAvailable();
  }

  function refreshBiometricModalButton() {
    var btn = document.getElementById('paymentCodeBiometricBtn');
    if (!btn) return;
    var show = hasPaymentCode() && isBiometricAvailable();
    btn.hidden = !show;
  }

  function deliverBiometricToCallback(ok) {
    var cb = _biometricPendingCallback || _pendingPinCallback;
    _biometricPendingCallback = null;
    if (ok) {
      closePaymentCodeModal();
      if (cb) cb(true);
      return;
    }
  }

  function startBiometricAuth(onSuccess, reason) {
    if (!isBiometricAvailable()) {
      if (typeof onSuccess === 'function') openPaymentCodeModal(onSuccess);
      return;
    }
    _biometricPendingCallback = typeof onSuccess === 'function' ? onSuccess : null;
    window.stablesBiometricResult = function (ok) {
      if (ok) {
        deliverBiometricToCallback(true);
        return;
      }
      var cb = _biometricPendingCallback;
      _biometricPendingCallback = null;
      openPaymentCodeModal(cb);
    };
    try {
      window.StablesNative.authenticateBiometric(reason || 'Confirm this protected send');
    } catch (_) {
      _biometricPendingCallback = null;
      openPaymentCodeModal(onSuccess);
    }
  }

  function tryBiometricFromModal() {
    if (!hasPaymentCode()) return;
    startBiometricAuth(_pendingPinCallback, 'Confirm this protected send');
  }

  function resetPinModalState() {
    _pinEntry = '';
    _pinSetupStep = 0;
    _pinSetupFirst = '';
    updatePinDots();
  }

  function updatePinDots() {
    var dots = document.querySelectorAll('#paymentCodeDots .pay-code-dot');
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('pay-code-dot--filled', i < _pinEntry.length);
    }
  }

  function setPinStatus(msg, tone) {
    var el = document.getElementById('paymentCodeStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.style.color = tone === 'amber' ? 'var(--am)' : tone === 'ok' ? 'var(--gr)' : 'var(--m)';
  }

  function refreshPinModalTitle() {
    var title = document.getElementById('paymentCodeTitle');
    if (!title) return;
    if (!hasPaymentCode()) {
      title.textContent = _pinSetupStep === 0 ? 'Set your payment code' : 'Confirm payment code';
      return;
    }
    title.textContent = 'Enter payment code';
  }

  function closePaymentCodeModal() {
    var modal = document.getElementById('paymentCodeModal');
    if (modal) modal.classList.remove('open');
    _pendingPinCallback = null;
    resetPinModalState();
  }

  function openPaymentCodeModal(onSuccess) {
    if (isLockedOut()) {
      var mins = Math.ceil(lockoutRemainingMs() / 60000);
      if (typeof window.showToast === 'function') {
        window.showToast('Too many attempts. Try again in about ' + mins + ' minute(s).', { tone: 'amber', durationMs: 5200 });
      }
      return;
    }
    _pendingPinCallback = typeof onSuccess === 'function' ? onSuccess : null;
    resetPinModalState();
    refreshPinModalTitle();
    setPinStatus(hasPaymentCode() ? '4-digit spending guard for significant sends.' : 'Choose a 4-digit code for protected sends.');
    refreshBiometricModalButton();
    var modal = document.getElementById('paymentCodeModal');
    if (modal) modal.classList.add('open');
  }

  function onPinDigit(d) {
    if (isLockedOut()) return;
    if (_pinEntry.length >= VALID_PIN_LENGTH) return;
    _pinEntry += String(d);
    updatePinDots();
    if (_pinEntry.length < VALID_PIN_LENGTH) return;

    if (!hasPaymentCode()) {
      if (_pinSetupStep === 0) {
        _pinSetupFirst = _pinEntry;
        _pinEntry = '';
        _pinSetupStep = 1;
        updatePinDots();
        refreshPinModalTitle();
        setPinStatus('Enter the same code again.');
        return;
      }
      if (_pinEntry !== _pinSetupFirst) {
        _pinEntry = '';
        _pinSetupFirst = '';
        _pinSetupStep = 0;
        updatePinDots();
        refreshPinModalTitle();
        setPinStatus('Codes did not match. Try again.', 'amber');
        return;
      }
      setPaymentCode(_pinEntry).then(function (ok) {
        if (!ok) {
          setPinStatus('Could not save code. Try again.', 'amber');
          resetPinModalState();
          refreshPinModalTitle();
          return;
        }
        setPinStatus('Payment code set.', 'ok');
        var cb = _pendingPinCallback;
        closePaymentCodeModal();
        if (cb) cb(true);
      });
      return;
    }

    verifyPaymentCode(_pinEntry).then(function (res) {
      if (res && res.ok) {
        var cb = _pendingPinCallback;
        closePaymentCodeModal();
        if (cb) cb(true);
        return;
      }
      _pinEntry = '';
      updatePinDots();
      if (res && res.locked) {
        closePaymentCodeModal();
        openPaymentCodeModal(_pendingPinCallback);
        return;
      }
      var lo = getLockout();
      var left = MAX_PIN_ATTEMPTS - (lo.fails || 0);
      setPinStatus(left > 0 ? 'Incorrect code. ' + left + ' attempt(s) left.' : 'Incorrect code.', 'amber');
    });
  }

  function onPinBackspace() {
    if (!_pinEntry.length) return;
    _pinEntry = _pinEntry.slice(0, -1);
    updatePinDots();
  }

  function requestPaymentCode(onSuccess) {
    if (shouldTryBiometric()) {
      startBiometricAuth(onSuccess, 'Confirm this protected send');
      return;
    }
    openPaymentCodeModal(onSuccess);
  }

  var _quickPayTimer = null;
  var _quickPayCancelled = false;

  function cancelPendingQuickPay() {
    _quickPayCancelled = true;
    if (_quickPayTimer) {
      clearTimeout(_quickPayTimer);
      _quickPayTimer = null;
    }
    if (typeof window.stablesHideToast === 'function') window.stablesHideToast();
  }

  function scheduleQuickPay(executeFn, meta) {
    var settings = getSettings();
    if (!settings.quickPayUndo) {
      if (typeof executeFn === 'function') executeFn();
      return;
    }
    _quickPayCancelled = false;
    var label = meta && meta.label ? meta.label : 'Sending…';
    if (typeof window.showToast === 'function') {
      // One line above the nav: what is about to be sent, and the one way to stop it. The notice
      // leaves with the window; the wallet row is the feedback once the payment goes (founder law).
      window.showToast(
        '<span class="toast-undo__msg">' + label + '</span>'
          + '<button type="button" class="max-link toast-undo__action mx-action" id="stablesQuickPayUndoBtn">Undo</button>',
        { html: true, variant: 'undo', autoDismiss: true, durationMs: UNDO_MS + 300 }
      );
      setTimeout(function () {
        var btn = document.getElementById('stablesQuickPayUndoBtn');
        if (btn) btn.addEventListener('click', function (e) {
          e.stopPropagation();
          cancelPendingQuickPay();
          if (typeof window.showToast === 'function') window.showToast('Quick pay cancelled.');
        });
      }, 0);
    }
    _quickPayTimer = setTimeout(function () {
      _quickPayTimer = null;
      if (!_quickPayCancelled && typeof executeFn === 'function') executeFn();
    }, UNDO_MS);
  }

  var _panelSaveTimer = null;
  var _panelListenersBound = false;
  var _suppressPanelSave = false;
  var PANEL_SAVE_DEBOUNCE_MS = 450;

  function readPanelSettingsPartial() {
    var qe = document.getElementById('paySecQuickEnabled');
    var ql = document.getElementById('paySecQuickLimit');
    var sig = document.getElementById('paySecSignificant');
    var cap = document.getElementById('paySecDailyCap');
    var undo = document.getElementById('paySecUndo');
    var bio = document.getElementById('paySecBiometric');
    var confEnabled = document.getElementById('paySecConfirmEnabled');
    var confWrap = document.getElementById('paySecConfirmLevels');
    var cur = getSettings();
    return {
      quickPayEnabled: !!(qe && qe.checked),
      quickPayLimit: finiteNum(ql && ql.value, DEFAULTS.quickPayLimit),
      cardLevels: cur.cardLevels,
      significantThreshold: finiteNum(sig && sig.value, DEFAULTS.significantThreshold),
      dailyQuickPayCap: finiteNum(cap && cap.value, DEFAULTS.dailyQuickPayCap),
      quickPayUndo: !!(undo && undo.checked),
      biometricEnabled: !!(bio && bio.checked && hasPaymentCode() && isBiometricAvailable()),
      confirmationPolicyEnabled: confEnabled ? !!confEnabled.checked : cur.confirmationPolicyEnabled,
      confirmationLevels: (confWrap && confWrap.querySelector('[data-conf-row]'))
        ? readConfirmationLevelsFromPanel()
        : cur.confirmationLevels
    };
  }

  function readConfirmationLevelsFromPanel() {
    var wrap = document.getElementById('paySecConfirmLevels');
    if (!wrap) return getSettings().confirmationLevels;
    var levels = [];
    var rows = wrap.querySelectorAll('[data-conf-row]');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var upToEl = row.querySelector('[data-conf-upto]');
      var blocksEl = row.querySelector('[data-conf-blocks]');
      levels.push({
        label: row.getAttribute('data-conf-label') || '',
        upTo: upToEl ? upToEl.value : null,
        blocks: blocksEl ? blocksEl.value : 1
      });
    }
    return normalizeConfirmationLevels(levels);
  }

  function confirmationLevelRowHtml(level) {
    var blocksInput = '<input class="finput" type="number" data-conf-blocks min="' + MIN_CONFIRM_BLOCKS
      + '" max="' + MAX_CONFIRM_BLOCKS + '" step="1" inputmode="numeric" value="' + level.blocks
      + '" aria-label="Required blocks">';
    if (level.upTo === null) {
      // With no value tier above it, the catch-all is simply every amount.
      var catchAllLabel = (typeof level.isOnlyLevel === 'boolean' && level.isOnlyLevel) ? 'All amounts' : 'Above highest threshold';
      return '<div data-conf-row data-conf-label="' + level.label + '" class="paysec-rule paysec-rule--catchall">'
        + '<div class="paysec-rule-label">' + catchAllLabel + '</div>'
        + '<div class="paysec-rule-value paysec-rule-value--blocks">' + blocksInput + '<span class="paysec-input-unit">blocks</span></div>'
        + '<span class="paysec-rule-spacer" aria-hidden="true"></span>'
        + '</div>';
    }
    return '<div data-conf-row data-conf-label="' + level.label + '" class="paysec-rule">'
      + '<div class="paysec-rule-label">Value up to</div>'
      + '<div class="paysec-rule-value paysec-rule-value--amount">'
      + '<input class="finput" data-financial-amount type="text" data-conf-upto inputmode="decimal" autocomplete="off" value="' + groupInputAmount(level.upTo)
      + '" aria-label="Amount threshold">'
      + '<span class="paysec-input-unit" data-paysec-primary-unit>MINIMA</span>'
      + '</div>'
      + '<div class="paysec-rule-value paysec-rule-value--blocks">' + blocksInput + '<span class="paysec-input-unit">blocks</span></div>'
      /* Founder 2026-09-03: "change the Remove for a X, I never understood what it was". This
         reverses 2026-08-09, when a bare box with a multiplication sign had read as a mystery and
         became a named text action. The cross returns as a proper icon action (ACT-009): a 44 px
         round control with the app's cross glyph, an accessible name and a tooltip, not a bare box. */
      + '<button type="button" data-conf-remove class="paysec-rule-remove mx-action" aria-label="Remove level" title="Remove level"><span aria-hidden="true">&times;</span></button>'
      + '</div>';
  }

  function syncPrimaryCurrencyLabels(fav) {
    var label = fav || displayPrimaryCcy();
    var nameNodes = document.querySelectorAll('[data-paysec-primary-name]');
    for (var i = 0; i < nameNodes.length; i++) nameNodes[i].textContent = label;
    var unitNodes = document.querySelectorAll('[data-paysec-primary-unit]');
    for (var j = 0; j < unitNodes.length; j++) unitNodes[j].textContent = label;
  }

  function renderConfirmationPolicyPanel() {
    var s = getSettings();
    var enabledEl = document.getElementById('paySecConfirmEnabled');
    if (enabledEl) enabledEl.checked = !!s.confirmationPolicyEnabled;
    var body = document.getElementById('paySecConfirmBody');
    if (body) body.style.display = s.confirmationPolicyEnabled ? '' : 'none';
    var wrap = document.getElementById('paySecConfirmLevels');
    if (!wrap) return;
    var only = s.confirmationLevels.length === 1;
    wrap.innerHTML = s.confirmationLevels.map(function (level) {
      var l = { label: level.label, upTo: level.upTo, blocks: level.blocks, isOnlyLevel: only };
      return confirmationLevelRowHtml(l);
    }).join('');
    var addBtn = document.getElementById('paySecConfirmAddBtn');
    if (addBtn) addBtn.disabled = s.confirmationLevels.length >= MAX_CONFIRM_LEVELS;
    syncPrimaryCurrencyLabels(displayPrimaryCcy());
  }

  function addConfirmationLevelFromPanel() {
    autoSaveSettingsFromPanel();
    var s = getSettings();
    var levels = s.confirmationLevels.slice();
    if (levels.length >= MAX_CONFIRM_LEVELS) return;
    var catchAll = levels.pop();
    var lastBounded = levels.length ? levels[levels.length - 1] : null;
    levels.push({
      label: '',
      upTo: lastBounded ? lastBounded.upTo * 2 : DEFAULTS.quickPayLimit,
      blocks: lastBounded ? Math.min(MAX_CONFIRM_BLOCKS, lastBounded.blocks + 1) : 1
    });
    levels.push(catchAll);
    saveConfirmationPolicy({ enabled: s.confirmationPolicyEnabled, levels: levels });
    renderConfirmationPolicyPanel();
  }

  function resetConfirmationPolicyDefaults() {
    saveConfirmationPolicy({ enabled: true, levels: defaultConfirmationLevels() });
    renderConfirmationPolicyPanel();
  }

  function autoSaveSettingsFromPanel() {
    if (_suppressPanelSave) return;
    saveSettings(readPanelSettingsPartial());
    renderSettingsPanelDailyOnly();
  }

  function renderSettingsPanelDailyOnly() {
    var s = getSettings();
    var fav = displayPrimaryCcy();
    var dailyLbl = document.getElementById('paySecDailySpent');
    if (dailyLbl) {
      var spent = getDailyQuickSpend();
      dailyLbl.textContent = 'Quick pay today: ' + formatPrimaryAmount(spent) + ' / ' + formatPrimaryAmount(s.dailyQuickPayCap) + ' ' + fav;
    }
  }

  function schedulePanelAutoSave() {
    if (_suppressPanelSave) return;
    if (_panelSaveTimer) clearTimeout(_panelSaveTimer);
    _panelSaveTimer = setTimeout(function () {
      _panelSaveTimer = null;
      autoSaveSettingsFromPanel();
    }, PANEL_SAVE_DEBOUNCE_MS);
  }

  function bindSettingsPanelAutoSave() {
    if (_panelListenersBound) return;
    _panelListenersBound = true;
    var ids = ['paySecQuickLimit', 'paySecSignificant', 'paySecDailyCap'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', schedulePanelAutoSave);
      el.addEventListener('change', autoSaveSettingsFromPanel);
    });
    ['paySecQuickEnabled', 'paySecUndo', 'paySecBiometric'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', autoSaveSettingsFromPanel);
    });
    var confWrap = document.getElementById('paySecConfirmLevels');
    if (confWrap) {
      confWrap.addEventListener('input', schedulePanelAutoSave);
      confWrap.addEventListener('change', autoSaveSettingsFromPanel);
      confWrap.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('[data-conf-remove]') : null;
        if (!btn) return;
        var row = btn.closest('[data-conf-row]');
        if (row) row.parentNode.removeChild(row);
        autoSaveSettingsFromPanel();
        renderConfirmationPolicyPanel();
      });
    }
    var confEnabled = document.getElementById('paySecConfirmEnabled');
    if (confEnabled) {
      confEnabled.addEventListener('change', function () {
        autoSaveSettingsFromPanel();
        renderConfirmationPolicyPanel();
      });
    }
  }

  function renderSettingsPanel() {
    _suppressPanelSave = true;
    renderConfirmationPolicyPanel();
    var s = getSettings();
    var fav = displayPrimaryCcy();
    var map = {
      paySecQuickEnabled: s.quickPayEnabled,
      paySecQuickLimit: s.quickPayLimit,
      paySecSignificant: s.significantThreshold,
      paySecDailyCap: s.dailyQuickPayCap,
      paySecUndo: s.quickPayUndo,
      paySecBiometric: s.biometricEnabled
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!map[id];
      else el.value = groupInputAmount(map[id]);
    });
    syncPrimaryCurrencyLabels(fav);
    renderCardLevels();
    var dailyLbl = document.getElementById('paySecDailySpent');
    if (dailyLbl) {
      var spent = getDailyQuickSpend();
      dailyLbl.textContent = 'Quick pay today: ' + formatPrimaryAmount(spent) + ' / ' + formatPrimaryAmount(s.dailyQuickPayCap) + ' ' + fav;
    }
    /* The two ways to confirm a protected send, each a row that is always on screen.
     *
     * The code row's action reads Set until a code exists, then Change. The biometrics row is
     * live only when the device can do it AND a code exists (biometrics sit on top of the code,
     * never instead of one); otherwise it is disabled and its copy says which of the two is
     * missing. It used to be hidden in both cases, so a person with no code could not learn the
     * option existed at the one moment they would want to (founder 2026-09-04). */
    var hasCode = hasPaymentCode();
    var codeBtn = document.getElementById('paySecCodeBtn');
    if (codeBtn) {
      /* Page review 2026-10 (D121): a row action stays secondary either way; the Security page has one main
         action ("Open Minima Security app"). */
      codeBtn.textContent = hasCode ? 'Change' : 'Set';
      codeBtn.classList.remove('btn-primary');
      codeBtn.classList.add('btn-secondary');
      codeBtn.setAttribute('data-role', 'secondary');
    }
    var codeCopy = document.getElementById('paySecCodeCopy');
    if (codeCopy) {
      codeCopy.textContent = hasCode
        ? 'Set. Asked before every protected send.'
        : '4 digits, asked before every protected send.';
    }
    var bridge = !!(window.StablesNative && typeof window.StablesNative.isBiometricAvailable === 'function');
    var available = isBiometricAvailable();
    var bioOn, bioText;
    if (!bridge) {
      bioOn = false;
      bioText = 'Not available on this device. On the Stables phone app, fingerprint or face can confirm protected sends.';
    } else if (!available) {
      bioOn = false;
      bioText = 'Not set up on this phone. Add a fingerprint or face in the phone settings, then turn this on here.';
    } else if (!hasCode) {
      bioOn = false;
      bioText = 'Set a payment code first. Fingerprint or face then confirms in its place.';
    } else {
      bioOn = true;
      bioText = 'Confirm protected sends with your fingerprint or face. Your payment code always works too.';
    }
    var bio = document.getElementById('paySecBiometric');
    if (bio) {
      bio.disabled = !bioOn;
      if (!bioOn) bio.checked = false;
    }
    var bioCopy = document.getElementById('paySecBiometricCopy');
    if (bioCopy) bioCopy.textContent = bioText;
    var bioRow = document.getElementById('paySecBiometricRow');
    if (bioRow) bioRow.setAttribute('aria-disabled', bioOn ? 'false' : 'true');
    _suppressPanelSave = false;
    bindSettingsPanelAutoSave();
  }

  function saveSettingsFromPanel() {
    autoSaveSettingsFromPanel();
  }

  function setPaymentCodeFlow() {
    if (!hasPaymentCode()) {
      openPaymentCodeModal(function () { renderSettingsPanel(); });
      return;
    }
    openPaymentCodeModal(function () {
      _pinSetupStep = 0;
      _pinSetupFirst = '';
      try { localStorage.removeItem(PIN_HASH_KEY); } catch (_) { /* ignore */ }
      openPaymentCodeModal(function () { renderSettingsPanel(); });
    });
  }

  function changePaymentCodeFlow() {
    setPaymentCodeFlow();
  }

  window.StablesPaymentSecurity = {
    getSettings: getSettings,
    saveSettings: saveSettings,
    getDailyQuickSpend: getDailyQuickSpend,
    recordQuickPaySpend: recordQuickPaySpend,
    wouldExceedDailyCap: wouldExceedDailyCap,
    fiatEquivalent: fiatEquivalent,
    primaryCurrencyCode: primaryCurrencyCode,
    displayPrimaryCcy: displayPrimaryCcy,
    formatPrimaryAmount: formatPrimaryAmount,
    classifyTier: classifyTier,
    cardTapAllows: cardTapAllows,
    cardDistanceCap: cardDistanceCap,
    cardTier: cardTier,
    cardTapRoom: cardTapRoom,
    cardSpend: cardSpend,
    recordCardSpend: recordCardSpend,
    renderCardLevels: renderCardLevels,
    requiresPaymentCode: requiresPaymentCode,
    tierLabel: tierLabel,
    hasPaymentCode: hasPaymentCode,
    requestPaymentCode: requestPaymentCode,
    scheduleQuickPay: scheduleQuickPay,
    cancelPendingQuickPay: cancelPendingQuickPay,
    renderSettingsPanel: renderSettingsPanel,
    saveSettingsFromPanel: saveSettingsFromPanel,
    autoSaveSettingsFromPanel: autoSaveSettingsFromPanel,
    bindSettingsPanelAutoSave: bindSettingsPanelAutoSave,
    setPaymentCodeFlow: setPaymentCodeFlow,
    changePaymentCodeFlow: changePaymentCodeFlow,
    tryBiometricFromModal: tryBiometricFromModal,
    isBiometricAvailable: isBiometricAvailable,
    onPinDigit: onPinDigit,
    onPinBackspace: onPinBackspace,
    closePaymentCodeModal: closePaymentCodeModal,
    normalizeContactTier: normalizeContactTier,
    getConfirmationPolicy: getConfirmationPolicy,
    saveConfirmationPolicy: saveConfirmationPolicy,
    normalizeConfirmationPolicy: normalizeConfirmationPolicy,
    confirmationLevelForValue: confirmationLevelForValue,
    confirmationTargetFor: confirmationTargetFor,
    defaultConfirmationLevels: defaultConfirmationLevels,
    addConfirmationLevelFromPanel: addConfirmationLevelFromPanel,
    resetConfirmationPolicyDefaults: resetConfirmationPolicyDefaults,
    renderConfirmationPolicyPanel: renderConfirmationPolicyPanel
  };
})();
