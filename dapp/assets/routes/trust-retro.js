/**
 * Phase 1 foundation for merchant-validation trust + retrocession eligibility.
 * Non-breaking scaffold: data model helpers and deterministic calculators only.
 */
(function () {
  const CFG = window.STABLES_CONFIG || {};

  const KEYS = {
    validations: CFG.TRUST_VALIDATIONS_KEY || 'stables_trust_validations_v1',
    trustProfiles: CFG.TRUST_PROFILES_KEY || 'stables_trust_profiles_v1',
    expenses: CFG.RETRO_EXPENSES_KEY || 'stables_retro_expenses_v1',
    windows: CFG.RETRO_WINDOWS_KEY || 'stables_retro_windows_v1',
    snapshots: CFG.RETRO_SNAPSHOTS_KEY || 'stables_retro_snapshots_v1',
    abuseSignals: CFG.ABUSE_SIGNALS_KEY || 'stables_abuse_signals_v1',
  };

  const PARAMS = {
    minReceiptAmount: Number(CFG.RETRO_MIN_RECEIPT_AMOUNT || 0.01),
    maxInScopePerWindow: Number(CFG.RETRO_MAX_IN_SCOPE_PER_WINDOW || 1000),
    maxMerchantValidationsPerDay: Number(CFG.TRUST_MAX_VALIDATIONS_PER_MERCHANT_PER_DAY || 100),
  };

  function readArray(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeArray(key, value) {
    localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function getDayKey(iso) {
    return String(iso || '').slice(0, 10);
  }

  function normalizeId(v) {
    return String(v || '').trim();
  }

  function buildValidationId(merchantId, userId, createdAt) {
    return `TV-${merchantId}-${userId}-${String(createdAt).replace(/[:.]/g, '-')}`;
  }

  function hasPairValidation(validations, merchantId, userId) {
    return validations.some(function (v) {
      return v && v.merchant_id === merchantId && v.user_id === userId && v.status !== 'revoked';
    });
  }

  function countMerchantValidationsOnDay(validations, merchantId, dayKey) {
    return validations.filter(function (v) {
      return v && v.merchant_id === merchantId && getDayKey(v.created_at) === dayKey;
    }).length;
  }

  function emitAbuseSignal(type, subjectId, score, detail) {
    const signals = readArray(KEYS.abuseSignals);
    signals.push({
      signal_id: `AS-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      subject_id: subjectId || null,
      score: Number(score || 0),
      detail: detail || null,
      created_at: nowIso(),
    });
    writeArray(KEYS.abuseSignals, signals);
    return signals[signals.length - 1];
  }

  function issueMerchantValidation(input) {
    const merchantId = normalizeId(input && input.merchant_id);
    const userId = normalizeId(input && input.user_id);
    const txRef = normalizeId(input && input.tx_ref) || null;
    if (!merchantId || !userId) return { ok: false, error: 'merchant_id and user_id are required' };

    const validations = readArray(KEYS.validations);
    if (hasPairValidation(validations, merchantId, userId)) {
      return { ok: false, error: 'Validation already exists for this merchant/user pair' };
    }

    const createdAt = nowIso();
    const dayKey = getDayKey(createdAt);
    const issuedToday = countMerchantValidationsOnDay(validations, merchantId, dayKey);
    if (issuedToday >= PARAMS.maxMerchantValidationsPerDay) {
      emitAbuseSignal('merchant_validation_spike', merchantId, 0.7, {
        issued_today: issuedToday,
        threshold: PARAMS.maxMerchantValidationsPerDay,
      });
      return { ok: false, error: 'Merchant daily validation limit reached' };
    }

    const rec = {
      validation_id: buildValidationId(merchantId, userId, createdAt),
      merchant_id: merchantId,
      user_id: userId,
      tx_ref: txRef,
      created_at: createdAt,
      status: 'active',
    };
    validations.push(rec);
    writeArray(KEYS.validations, validations);
    return { ok: true, validation: rec };
  }

  function computeTrustScoreV1(userId) {
    const uid = normalizeId(userId);
    const validations = readArray(KEYS.validations).filter(function (v) {
      return v && v.user_id === uid && v.status === 'active';
    });
    const uniqMerchants = new Set(validations.map(function (v) { return v.merchant_id; }));
    const uniqueCount = uniqMerchants.size;
    const trustScoreV1 = Math.min(100, uniqueCount * 10);
    return {
      user_id: uid,
      unique_validating_merchants_count: uniqueCount,
      trust_score_v1: trustScoreV1,
      factors: { model: 'unique_merchant_count_x10_cap100' },
      last_updated_at: nowIso(),
    };
  }

  function upsertTrustProfile(userId) {
    const profile = computeTrustScoreV1(userId);
    const profiles = readArray(KEYS.trustProfiles);
    const idx = profiles.findIndex(function (p) { return p && p.user_id === profile.user_id; });
    if (idx >= 0) profiles[idx] = profile;
    else profiles.push(profile);
    writeArray(KEYS.trustProfiles, profiles);
    return profile;
  }

  function submitExpense(expense) {
    const userId = normalizeId(expense && expense.user_id);
    if (!userId) return { ok: false, error: 'user_id is required' };
    const lines = Array.isArray(expense && expense.lines) ? expense.lines : [];
    if (!lines.length) return { ok: false, error: 'At least one line item is required' };

    let hasInScope = false;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] || {};
      const amount = Number(line.amount || 0);
      if (!Number.isFinite(amount) || amount < PARAMS.minReceiptAmount) {
        return { ok: false, error: `Line ${i + 1}: invalid amount` };
      }
      if (line.scope_flag === 'in_scope') hasInScope = true;
    }
    if (!hasInScope) return { ok: false, error: 'At least one line must be marked in_scope or use open_text rationale' };

    const rec = {
      expense_id: `EX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: userId,
      merchant_id: normalizeId(expense.merchant_id) || null,
      receipt_ref: normalizeId(expense.receipt_ref) || null,
      submitted_at: nowIso(),
      lines: lines.map(function (l, idx) {
        return {
          line_id: normalizeId(l.line_id) || `L${idx + 1}`,
          description: String(l.description || '').trim(),
          amount: Number(l.amount || 0),
          currency: normalizeId(l.currency) || 'USDw',
          scope_flag: l.scope_flag === 'out_of_scope' ? 'out_of_scope' : 'in_scope',
        };
      }),
    };

    const expenses = readArray(KEYS.expenses);
    expenses.push(rec);
    writeArray(KEYS.expenses, expenses);
    return { ok: true, expense: rec };
  }

  function ensureRetroWindow(windowId, startAt, endAt) {
    const windows = readArray(KEYS.windows);
    if (windows.some(function (w) { return w && w.window_id === windowId; })) return;
    windows.push({
      window_id: windowId,
      start_at: startAt,
      end_at: endAt,
      params: {
        max_in_scope_per_window: PARAMS.maxInScopePerWindow,
      },
    });
    writeArray(KEYS.windows, windows);
  }

  function computeEligibilityV1(userId, windowId) {
    const uid = normalizeId(userId);
    const win = readArray(KEYS.windows).find(function (w) { return w && w.window_id === windowId; });
    if (!win) return { ok: false, error: 'retrocession window not found' };
    const startMs = Date.parse(win.start_at);
    const endMs = Date.parse(win.end_at);

    const expenses = readArray(KEYS.expenses).filter(function (e) {
      if (!e || e.user_id !== uid) return false;
      const ts = Date.parse(e.submitted_at);
      return Number.isFinite(ts) && ts >= startMs && ts <= endMs;
    });

    let inScopeTotal = 0;
    expenses.forEach(function (e) {
      (e.lines || []).forEach(function (l) {
        if (l && l.scope_flag === 'in_scope') inScopeTotal += Number(l.amount || 0);
      });
    });

    const cap = Number((win.params && win.params.max_in_scope_per_window) || PARAMS.maxInScopePerWindow);
    const eligibleBase = Math.max(0, Math.min(inScopeTotal, cap));
    const snapshot = {
      user_id: uid,
      window_id: windowId,
      in_scope_total: Number(inScopeTotal.toFixed(6)),
      eligible_base: Number(eligibleBase.toFixed(6)),
      cap_applied: inScopeTotal > cap,
      estimated_band: eligibleBase <= 0 ? 'none' : eligibleBase < cap * 0.33 ? 'low' : eligibleBase < cap * 0.66 ? 'mid' : 'high',
      explain: [
        `In-scope total in window: ${inScopeTotal.toFixed(2)}`,
        `Window cap: ${cap.toFixed(2)}`,
      ],
      created_at: nowIso(),
    };

    const snapshots = readArray(KEYS.snapshots);
    snapshots.push(snapshot);
    writeArray(KEYS.snapshots, snapshots);
    return { ok: true, snapshot: snapshot };
  }

  window.StablesTrustRetro = {
    keys: KEYS,
    params: PARAMS,
    issueMerchantValidation: issueMerchantValidation,
    computeTrustScoreV1: computeTrustScoreV1,
    upsertTrustProfile: upsertTrustProfile,
    submitExpense: submitExpense,
    ensureRetroWindow: ensureRetroWindow,
    computeEligibilityV1: computeEligibilityV1,
    emitAbuseSignal: emitAbuseSignal,
  };
})();
