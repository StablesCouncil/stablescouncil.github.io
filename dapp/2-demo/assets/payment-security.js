/**
 * Stables payment tier system: Quick pay, Standard pay, Protected pay.
 * Loaded before send handlers; uses window.convertFromCcyToBaseEq and BASE_CCY when present.
 */
(function () {
  'use strict';

  var SETTINGS_KEY = 'stables_payment_security_v1';
  var PIN_HASH_KEY = 'stables_payment_code_v1';
  var DAILY_KEY = 'stables_quick_pay_daily_v1';
  var LOCKOUT_KEY = 'stables_payment_code_lockout_v1';

  var DEFAULTS = {
    quickPayEnabled: true,
    quickPayLimit: 50,
    significantThreshold: 500,
    dailyQuickPayCap: 200,
    quickPayUndo: false,
    biometricEnabled: false
  };

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
      significantThreshold: finiteNum(saved.significantThreshold, DEFAULTS.significantThreshold),
      dailyQuickPayCap: finiteNum(saved.dailyQuickPayCap, DEFAULTS.dailyQuickPayCap),
      quickPayUndo: !!saved.quickPayUndo,
      biometricEnabled: !!saved.biometricEnabled
    };
  }

  function saveSettings(partial) {
    var cur = getSettings();
    var next = Object.assign({}, cur, partial || {});
    writeJson(SETTINGS_KEY, next);
    return next;
  }

  function finiteNum(v, fallback) {
    var n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
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
      return !!(window.StablesAndroid
        && typeof window.StablesAndroid.isBiometricAvailable === 'function'
        && window.StablesAndroid.isBiometricAvailable());
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
    btn.style.display = show ? '' : 'none';
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
      window.StablesAndroid.authenticateBiometric(reason || 'Confirm this protected send');
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
      window.showToast(
        '<span>' + label + '</span> <button type="button" class="btn btn-secondary" style="margin-left:10px;padding:4px 10px;font-size:12px" id="stablesQuickPayUndoBtn">Undo</button>',
        { html: true, durationMs: UNDO_MS + 500 }
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
    return {
      quickPayEnabled: !!(qe && qe.checked),
      quickPayLimit: finiteNum(ql && ql.value, DEFAULTS.quickPayLimit),
      significantThreshold: finiteNum(sig && sig.value, DEFAULTS.significantThreshold),
      dailyQuickPayCap: finiteNum(cap && cap.value, DEFAULTS.dailyQuickPayCap),
      quickPayUndo: !!(undo && undo.checked),
      biometricEnabled: !!(bio && bio.checked && hasPaymentCode() && isBiometricAvailable())
    };
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
  }

  function renderSettingsPanel() {
    _suppressPanelSave = true;
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
      else el.value = String(map[id]);
    });
    var favLbl = document.getElementById('paySecFavCcyLabel');
    if (favLbl) favLbl.textContent = fav;
    var dailyLbl = document.getElementById('paySecDailySpent');
    if (dailyLbl) {
      var spent = getDailyQuickSpend();
      dailyLbl.textContent = 'Quick pay today: ' + formatPrimaryAmount(spent) + ' / ' + formatPrimaryAmount(s.dailyQuickPayCap) + ' ' + fav;
    }
    var codeBtn = document.getElementById('paySecCodeBtn');
    if (codeBtn) {
      codeBtn.textContent = hasPaymentCode() ? 'Change payment code' : 'Set payment code';
      codeBtn.classList.toggle('btn-primary', !hasPaymentCode());
      codeBtn.classList.toggle('btn-secondary', hasPaymentCode());
    }
    var bioWrap = document.getElementById('paySecBiometricWrap');
    if (bioWrap) bioWrap.style.display = (hasPaymentCode() && isBiometricAvailable()) ? '' : 'none';
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
    normalizeContactTier: normalizeContactTier
  };
})();