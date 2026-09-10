/* ---------------------------------------------------------------------------------------------
 * NOTES: THE ARITHMETIC AND THE WORDS, KEPT AWAY FROM THE SCREEN.
 *
 * Founder, 2026-09-03, after a mint failed with "TxPoW size too large.. 95243/65536": "when there
 * is an issue that a transaction fails because of too many coins, it should be proposed directly to
 * combine them"; "it should be possible for each coin to decide how many we want to combine in how
 * many coins, best would be to see exactly the coins and their size and be able to pick the one we
 * want"; "when we say size too large, we should mention the measure used".
 *
 * The node's own `consolidate` cannot take a list of coins (this node version rejects `coinid:`),
 * so choosing exact notes means building the transaction ourselves: the chosen coins in, N outputs
 * to our own address out. That needs three things done exactly, and none of them belong in a click
 * handler:
 *
 *   - splitting a decimal total into N parts that ADD BACK TO THE TOTAL, in string arithmetic,
 *     because the node rounds amounts at 34 significant digits and floating point does not even
 *     get that far ([[reference_txn_building_laws]]);
 *   - estimating the transaction's size before it is built, so a person is told "that would be
 *     93 KB, the limit is 64 KB" before the node tells them the same thing in bytes after;
 *   - turning the node's wording into ours, once, with the unit it forgot and the action it implies.
 *
 * Exercised by work/tools/verify-notes-manager.mjs, which runs this file in a VM.
 * ------------------------------------------------------------------------------------------- */
(function () {
  'use strict';

  var W = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : this);
  if (!W || W.stablesNotes) return;

  /* Minima's transaction limit, in bytes. The node reports it as "…/65536". */
  var TXPOW_MAX_BYTES = 65536;
  /* Measured on the founder's phone: a mint that spent about 80 notes weighed 95,243 bytes, so an
     input costs roughly 1,150 bytes (coin, MMR proof, script, signature share) and an output about
     300. The estimate is deliberately a little high: it must warn before the node refuses. */
  var BYTES_PER_INPUT = 1150;
  var BYTES_PER_OUTPUT = 300;
  var BYTES_BASE = 1200;

  /* ------------------------------------------------------------------ decimal arithmetic ----- */

  function decimalsOf(s) {
    var str = String(s || '0').trim();
    var i = str.indexOf('.');
    return i < 0 ? 0 : (str.length - i - 1);
  }

  /* A decimal string to an integer string scaled by 10^scale, no floating point anywhere. */
  function toScaled(s, scale) {
    var str = String(s || '0').trim();
    var neg = str.charAt(0) === '-';
    if (neg) str = str.slice(1);
    var parts = str.split('.');
    var whole = parts[0].replace(/^0+(?=\d)/, '') || '0';
    var frac = (parts[1] || '');
    if (frac.length > scale) frac = frac.slice(0, scale);
    while (frac.length < scale) frac += '0';
    var digits = (whole + frac).replace(/^0+(?=\d)/, '') || '0';
    return (neg ? '-' : '') + digits;
  }

  function fromScaled(intStr, scale) {
    var neg = intStr.charAt(0) === '-';
    var digits = neg ? intStr.slice(1) : intStr;
    while (digits.length <= scale) digits = '0' + digits;
    var whole = digits.slice(0, digits.length - scale);
    var frac = digits.slice(digits.length - scale);
    frac = frac.replace(/0+$/, '');
    return (neg ? '-' : '') + whole + (frac ? '.' + frac : '');
  }

  /**
   * Add decimal strings exactly.
   */
  function sumAmounts(list) {
    var scale = 0;
    for (var i = 0; i < list.length; i++) scale = Math.max(scale, decimalsOf(list[i]));
    var total = 0n;
    for (var j = 0; j < list.length; j++) total += BigInt(toScaled(list[j], scale));
    return fromScaled(total.toString(), scale);
  }

  /**
   * Split a decimal total into n parts that sum EXACTLY back to the total.
   * The first n-1 parts are equal (floor at the total's own precision); the last carries the
   * remainder, so nothing is created or lost to rounding.
   */
  function splitAmount(total, n) {
    var parts = Math.max(1, Math.floor(Number(n) || 1));
    var scale = decimalsOf(total);
    var totalScaled = BigInt(toScaled(total, scale));
    if (totalScaled <= 0n) return null;
    var each = totalScaled / BigInt(parts);
    if (each <= 0n) return null; // more parts than the amount can be divided into at this precision
    var out = [];
    var used = 0n;
    for (var i = 0; i < parts - 1; i++) { out.push(fromScaled(each.toString(), scale)); used += each; }
    out.push(fromScaled((totalScaled - used).toString(), scale));
    return out;
  }

  /* ------------------------------------------------------------------ size estimate --------- */

  function estimateTxnBytes(inputs, outputs) {
    var i = Math.max(0, Math.floor(Number(inputs) || 0));
    var o = Math.max(0, Math.floor(Number(outputs) || 0));
    return BYTES_BASE + i * BYTES_PER_INPUT + o * BYTES_PER_OUTPUT;
  }

  function formatKb(bytes) {
    var kb = (Number(bytes) || 0) / 1024;
    return (kb >= 10 ? Math.round(kb) : Math.round(kb * 10) / 10) + ' KB';
  }

  /** How many inputs fit under the limit with `outputs` outputs. */
  function maxInputsFor(outputs) {
    var room = TXPOW_MAX_BYTES - BYTES_BASE - Math.max(0, Number(outputs) || 0) * BYTES_PER_OUTPUT;
    return Math.max(0, Math.floor(room / BYTES_PER_INPUT));
  }

  /* ------------------------------------------------------------------ the words ------------- */

  /**
   * What a rebuild of `selected` notes into `after` notes is called. Sentence case; the verb says
   * what happens to the count, because that is the only thing the person is deciding.
   */
  function actionLabel(selected, after) {
    var s = Math.max(0, Math.floor(Number(selected) || 0));
    var a = Math.max(1, Math.floor(Number(after) || 1));
    var noteWord = function (k) { return k === 1 ? 'note' : 'notes'; };
    if (s === 0) return 'Choose notes to combine';
    if (s === 1 && a === 1) return 'One note stays one note';
    if (a < s) return 'Combine ' + s + ' ' + noteWord(s) + ' into ' + a;
    if (a > s) return (s === 1 ? 'Split 1 note into ' : 'Rebuild ' + s + ' notes into ') + a;
    return 'Rebuild ' + s + ' ' + noteWord(s) + ' into ' + a;
  }

  /**
   * The node's error, in the app's words. Only the cases the app has actually met are rewritten;
   * anything else passes through unchanged rather than being guessed at.
   * @returns {{ text: string, action: null | { label: string, fn: string } }}
   */
  function humanNodeError(raw) {
    var s = String(raw == null ? '' : raw);
    var m = /TxPoW size too large\W*\s*(\d+)\s*\/\s*(\d+)/i.exec(s);
    if (m) {
      var size = Number(m[1]);
      var limit = Number(m[2]) || TXPOW_MAX_BYTES;
      return {
        text: 'This transaction is ' + formatKb(size) + '. The network limit is ' + formatKb(limit)
          + '. It spends too many notes at once: combine your notes first, then try again.',
        action: { label: 'Manage notes', fn: 'stablesOpenNotesManager' }
      };
    }
    return { text: s, action: null };
  }

  W.stablesNotes = {
    TXPOW_MAX_BYTES: TXPOW_MAX_BYTES,
    sumAmounts: sumAmounts,
    splitAmount: splitAmount,
    estimateTxnBytes: estimateTxnBytes,
    maxInputsFor: maxInputsFor,
    formatKb: formatKb,
    actionLabel: actionLabel,
    humanNodeError: humanNodeError
  };
  /* The one name every error path can call without knowing the module. */
  W.stablesHumanNodeError = humanNodeError;
})();
