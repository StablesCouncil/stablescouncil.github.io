/*
 * Route 2 behind the existing Instant account (task_route2_tee_payments, plan item 1.7).
 *
 * Offline coins held by one-use keys in the phone's TEE live in the Android app's native engine
 * (route2/R2Engine). This file only adapts that engine to the account object instant-balance.js
 * already uses: no screen, element or route is added. Holding coins is a detected capability
 * (founder 2026-10-11: Android-only holding); without it every call passes straight through to the
 * existing account, which is what web and the MiniDapp run.
 *
 * On a phone that holds coins the old card money is set aside (founder 2026-10-11: "no need to carry
 * over legacy, we can discard these, we are in test phase with no value token"):
 *
 *  - state()         the Instant balance is the coins held
 *  - receiverCode()  every code carries a coin request ("Coin request:" line, 127 bytes; amount 0 when
 *                    the code has none, so the payer chooses) and the certificate chains this phone holds
 *                    ("Coin chains:"), which a payer leaves out of its payment; older builds ignore both
 *  - pay()           paid from coins only; a code without a coin request comes from an older version
 *  - receive()       a coin payment ("Stables coin payment") is checked and credited by the engine; an
 *                    old-style payment is refused
 *  - journal()       one row per coin movement, beside the earlier rows
 */
(function (W) {
  'use strict';
  var HEAD = 'Stables coin payment';
  var REQUEST_LABEL = 'Coin request', CHAINS_LABEL = 'Coin chains';
  var ROW = 'INSTANT-R2-';

  function bridge() {
    var n = W.StablesNative || W.StablesAndroid;
    return n && typeof n.r2Call === 'function' ? n : null;
  }
  function call(op, args) {
    var n = bridge();
    if (!n) return { ok: false, code: 'unavailable' };
    try { return JSON.parse(n.r2Call(op, JSON.stringify(args || {}))); } catch (e) { return { ok: false, code: 'unavailable', detail: String(e && e.message) }; }
  }
  /* Calls that read the node (state, scan) run on the engine's own thread and answer later: a synchronous bridge call
     blocks the page, and a tap arriving then answers late (R2-CAMPAIGN-07). */
  var pending = {}, seq = 0;
  W.stablesR2Result = function (id, json) {
    var done = pending[id];
    if (!done) return;
    delete pending[id];
    try { done(JSON.parse(json)); } catch (e) { done({ ok: false, code: 'unavailable' }); }
  };
  function callAsync(op, args) {
    var n = bridge();
    if (!n || typeof n.r2CallAsync !== 'function') return Promise.resolve(call(op, args));
    return new Promise(function (resolve) {
      var id = 'r2-' + (++seq);
      pending[id] = resolve;
      try { n.r2CallAsync(id, op, JSON.stringify(args || {})); } catch (e) { delete pending[id]; resolve({ ok: false, code: 'unavailable' }); }
    });
  }
  var holding = null;
  // The coin request shown on the Receive screen, by token:amount. A request is paid once: any credit or load clears them.
  var requests = {};
  // The watch stays on: another Add or a Remove may still be on its way (founder's Pro, build 111: the first credit stopped
  // it and the second Add's row stayed Broadcasted). It stops by itself once nothing is pending.
  function forgetRequests() { Object.keys(requests).forEach(function (k) { delete requests[k]; }); }
  /* While a coin request is open, look for a vault deposit naming it every 15 s while the app is visible (the battery
     law). A load is credited by the phone's own node read, then the page redraws (onChange). */
  var watch = null, watchSince = 0, onChange = null;
  function watchLoads() {
    watchSince = Date.now();                                          // at most 10 minutes from the last request or Add
    if (watch || typeof W.stablesRepeatWhileVisible !== 'function') return;
    try { console.log('[route2] watch on'); } catch (_) { /* no console */ }
    watch = W.stablesRepeatWhileVisible('route2-loads', function () {
      // A Remove on its way keeps the watch on until the money is in Savings.
      var exiting = readExits().some(function (x) { return x.status === 'posted' || x.status === 'signed'; });
      var loading = readLoads().some(function (l) { return l.status !== 'credited'; });
      var asking = Object.keys(requests).length > 0;
      if (!exiting && ((!loading && !asking) || Date.now() - watchSince > 10 * 60 * 1000)) {
        try { console.log('[route2] watch off: nothing on its way'); } catch (_) { /* no console */ }
        stopWatching(); return;
      }
      // Adds with a known marker are credited by that one coin; the full scan only when one has none, or every fourth pass.
      var unmarked = readLoads().some(function (l) { return l.status !== 'credited' && !l.marker; });
      try { claimMarkers(); } catch (e) { try { console.log('[route2] claimMarkers failed: ' + e); } catch (_) { /* no console */ } }
      if (unmarked || (markerTick++ % 4) === 0) {
        try { scanLoads(); } catch (e) { try { console.log('[route2] scanLoads failed: ' + e); } catch (_) { /* no console */ } }
      }
      try { scanExits(); } catch (e) { try { console.log('[route2] scanExits failed: ' + e); } catch (_) { /* no console */ } }
    }, 15000);
  }
  function stopWatching() { if (watch && typeof watch.stop === 'function') watch.stop(); watch = null; }
  /** True when this phone can hold coins: its TEE makes keys that pass the receivers' rules. */
  // A yes is kept; a no is asked again after 30 s (a phone that was locked when first asked can hold a card once unlocked).
  var holdingAt = 0;
  function canHold() {
    if (holding !== true && Date.now() - holdingAt > 30000) {
      holdingAt = Date.now();
      var r = call('available'); holding = !!(r && r.ok && r.holding);
    }
    return !!holding;
  }
  function isCoinPayment(text) { return String(text || '').replace(/^\s+/, '').indexOf(HEAD) === 0; }
  function fieldOf(text, label) {
    var m = String(text || '').match(new RegExp('(?:^|\\n)\\s*' + label + '\\s*:\\s*([A-Za-z0-9_-]+)'));
    return m ? m[1] : null;
  }
  function bundleOf(text) { return fieldOf(text, 'Bundle'); }
  function requestOf(code) { return code && typeof code === 'object' ? code.coinRequest || null : fieldOf(code, REQUEST_LABEL); }
  function chainsOf(code) { return code && typeof code === 'object' ? code.coinChains || null : fieldOf(code, CHAINS_LABEL); }
  function err(P, code, detail) {
    // The reason is kept: a Remove on Graphene said only "This device cannot hold a Stables card" (build 121), whatever refused.
    var e = P && typeof P.InstantError === 'function' ? P.InstantError(code, detail || undefined) : new Error(detail || code);
    e.code = code; e.instant = true;
    if (detail) { e.detail = detail; try { console.log('[route2] refused ' + code + ': ' + detail); } catch (_) { /* no console */ } }
    return e;
  }
  /* CARD HARDENING (CARD_HARDENING_PLAN.md, 2026-10-15). The engine keeps the receiving limits the person set (per
     payment, per paying phone a day), caps received payments at one touch while the phone's security list is over 30
     days old, and holds coins at or above the fingerprint amount by keys that need the fingerprint before they sign.
     This file says each refusal in plain words, adds the receiver's limit to its code ("Coin limit", which older
     versions ignore) so a payer refuses above it before signing, and asks for the fingerprint before a Remove that
     needs it. The payer's fingerprint step for a payment is in instant-balance.js (Confirm send). */
  var LIMIT_LABEL = 'Coin limit';
  function limitOf(code) { return code && typeof code === 'object' ? code.coinLimit || null : fieldOf(code, LIMIT_LABEL); }
  /** "500 Winiwa", with the card's own currency names and commas (instant-balance.js), or the plain amount. */
  function moneyOf(atoms, tokenId, P) {
    try { if (typeof W.stablesInstantMoney === 'function') return W.stablesInstantMoney(atoms, tokenId); } catch (_) { /* below */ }
    return P && typeof P.formatAmount === 'function' ? P.formatAmount(BigInt(atoms)) : String(atoms);
  }
  /** Why a received payment was refused for a limit, in the words the receiver reads. */
  /* FIRST CONTACT (founder 2026-10-15: "The limit should be taken into account at the first phones communication and
     should display on both phones, above limit and refuse the transaction right from the start"). By tap the phones
     settle it before anything is signed (InstantNfc INTENT): the receiver reads limitMessage, the payer payerLimitMessage.
     A signed payment that still arrives above a limit (an older payer, a QR or network payment) is credited, never
     lost, and flagged with aboveLimitMessage. */
  function limitMessage(r, P) {
    if (r.limitKind === 'stale') return 'Not received: this phone’s security list is out of date. Connect to the internet once.';
    var limit = moneyOf(r.limitAtoms, r.token, P);
    if (r.limitKind === 'day') return 'Not received: above your limit of ' + limit + ' a day from this phone.';
    return 'Not received: above your limit of ' + limit + ' per payment.';
  }
  function payerLimitMessage(limitAtoms, tokenId, P) { return 'Above this receiver’s limit: max ' + moneyOf(limitAtoms, tokenId, P) + '.'; }
  function aboveLimitMessage(r, P) {
    var limit = moneyOf(r.limitAtoms, r.token, P);
    if (r.aboveLimit === 'stale') return 'Received above your limit while this phone’s security list is out of date.';
    if (r.aboveLimit === 'day') return 'Received above your limit of ' + limit + ' a day from this phone.';
    return 'Received above your limit of ' + limit + ' per payment.';
  }
  var AUTH_AGAIN = 'Confirm with your fingerprint again. Nothing was paid.';
  /** True when paying (or removing, exit) this amount signs with a fingerprint key. */
  function needsFingerprint(tokenId, atoms, exit) { return !!fingerprintReason(tokenId, atoms, exit); }
  /** '' (no fingerprint), 'large' (at or above the fingerprint amount) or 'refill' (below it, the quick purse is empty). */
  function fingerprintReason(tokenId, atoms, exit) {
    if (!canHold()) return '';
    var r = call('fingerprint', { token: hex(tokenId), amount: String(atoms), exit: !!exit });
    return r && r.ok && r.needed ? (r.reason || 'large') : '';
  }
  var REFILL_PROMPT = 'Confirm with your fingerprint once to refill quick payments.';
  /** Within the fingerprint just given: the quick purse is topped up. Never prompts; out of time it waits. */
  function refill(tokenId) {
    if (!canHold() || !fingerprintFresh()) return Promise.resolve(null);
    return callAsync('refill', { token: hex(tokenId) }).then(function (r) {
      try { if (r && r.moved) console.log('[route2] quick purse refilled'); } catch (_) { /* no console */ }
      return r;
    });
  }
  /** Every fingerprint coin back to plain keys, within one fingerprint (before removing the screen lock). */
  function unprotect(reason) {
    if (!canHold()) return Promise.resolve({ ok: false });
    var go = function () { return callAsync('unprotect', {}); };
    if (fingerprintFresh()) return go();
    return fingerprint(reason || 'Confirm moving the card off fingerprint').then(function (ok) { return ok ? go() : { ok: false, code: 'auth' }; });
  }
  /* The last fingerprint confirmed on this page: the keys accept it for 30 seconds (R2AndroidKeys.STRONG_SECONDS). */
  var fingerprintAt = 0;
  function fingerprintFresh() { return Date.now() - fingerprintAt < 25000; }
  /** The system fingerprint sheet. Resolves true once confirmed; false when cancelled or not possible. */
  function fingerprint(reason) {
    var n = W.StablesNative;
    if (!n || typeof n.authenticateCardKey !== 'function') return Promise.resolve(false);
    return new Promise(function (resolve) {
      W.stablesCardFingerprintResult = function (ok) {
        W.stablesCardFingerprintResult = null;
        if (ok) fingerprintAt = Date.now();
        resolve(!!ok);
      };
      try { n.authenticateCardKey(String(reason || 'Confirm this card payment')); } catch (e) { W.stablesCardFingerprintResult = null; resolve(false); }
    });
  }
  /** The card's security: its list's age, the limits, whether fingerprint keys can be made (engine "security"). */
  function security() { return canHold() ? call('security') : { ok: false }; }
  /** The limits the person set on the card's page, in token units ('0': no limit, or no fingerprint). */
  function syncSettings(s) {
    if (!bridge() || !s) return { ok: false };
    var args = {};
    ['perPayment', 'perPhoneDay', 'strongAt', 'oneTouch'].forEach(function (k) { if (s[k] != null && s[k] !== '') args[k] = String(s[k]); });
    return call('settings', args);
  }

  /** Engine refusal codes in the words the Instant screens already use. */
  function refusalCode(r) {
    if (!r) return 'unavailable';
    if (r.code === 'limit') return 'limit';
    if (r.code === 'request' && /already paid/.test(r.detail || '')) return 'duplicate';
    if (r.code === 'request') return 'wrong-receiver';
    if (r.code === 'double-spend') return 'bad-signature';
    if (r.code === 'unavailable') return 'unavailable';
    return 'malformed';
  }
  /* Right after the app starts, its built-in node needs a moment: an engine call answers node-starting meanwhile.
     The balance waits for the node (asking every 2 s, for up to 2 minutes) instead of declaring the card unavailable. */
  function whenNodeReady(op, args) {
    var started = Date.now();
    return new Promise(function (resolve) {
      (function again() {
        callAsync(op, args).then(function (r) {
          if (r && r.code === 'node-starting' && Date.now() - started < 120000) { setTimeout(again, 2000); return; }
          resolve(r);
        });
      })();
    });
  }
  /** A node answer's body. The built-in node puts it under "response"; through Minima Core it can come at the top level
   *  (instant-chain.js reads both). A Remove on the Graphene phone (Core) found no Savings address (build 123). */
  function answerOf(r) {
    if (!r || typeof r !== 'object') return {};
    var b = r.response !== undefined ? r.response : r;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (_) { return {}; } }
    if (b && typeof b === 'object' && !Array.isArray(b) && b.response && typeof b.response === 'object' && !b.address && !b.txpowid) b = b.response;
    return b && typeof b === 'object' ? b : {};
  }
  function hex(t) { return String(t || '').toLowerCase().replace(/^0x/, ''); }
  /** One journal entry per coin movement. A payment is keyed by the receiver's request key, as when it was paid (one row). */
  function entryOf(e) {
    var outgoing = e.kind === 'out';
    var entry = { id: ROW + (outgoing ? 'OUT-' + (e.ref || e.id) : 'IN-' + e.id), kind: outgoing ? 'out' : 'in',
      amount: e.amount, tokenId: hex(e.token), ts: Number(e.ts) };
    if (outgoing && e.ref) entry.ref = 'r2-' + e.ref;
    if (outgoing && e.delivered) entry.delivered = { ts: Number(e.ts), via: 'nfc', result: 'credited' };
    if (outgoing && e.settle != null) entry.settle = Number(e.settle);
    return entry;
  }

  function wrap(account, P, opts) {
    if (!account || !canHold()) return account;
    onChange = opts && typeof opts.onChange === 'function' ? opts.onChange : null;
    try {
      console.log('[route2] wrap: loads ' + JSON.stringify(readLoads().map(function (l) { return [String(l.keyHash).slice(0, 8), l.status, l.block]; }))
        + ' exits ' + JSON.stringify(readExits().map(function (x) { return [String(x.coinId).slice(0, 8), x.status, x.block]; })));
    } catch (_) { /* no console */ }
    // An Add or a Remove still on its way when the app (re)starts is followed again at once: nothing else re-arms the
    // watch after a restart, and an Add then stayed "+X" for good (founder's Pro, build 110).
    if (readLoads().some(function (l) { return l.status !== 'credited'; }) ||
        readExits().some(function (x) { return x.status === 'posted' || x.status === 'signed'; })) watchLoads();
    settleWatch();
    var out = Object.create(account);

    out.state = function () {
      return account.state().then(function (s) {
        return whenNodeReady('state', {}).then(function (r) { return [s, r]; });
      }).then(function (pair) {
        var s = pair[0], r = pair[1];
        if (!r.ok) throw err(P, 'unavailable', r.detail);
        // Coins only: the old card money is set aside on a coin phone.
        var balances = {};
        Object.keys(s.balances || {}).forEach(function (t) { balances[t] = BigInt(0); });
        Object.keys(r.balances || {}).forEach(function (t) { balances[hex(t)] = BigInt(r.balances[t]); });
        var copy = {};
        Object.keys(s).forEach(function (k) { copy[k] = s[k]; });
        copy.balances = balances;
        copy.coins = r;
        return copy;
      });
    };

    out.receiverCode = function (extra) {
      return account.receiverCode(extra).then(function (rc) {
        if (!rc) return rc;
        var amount = rc.amount == null ? '0' : String(rc.amount);   // 0: any amount, the payer chooses
        var key = hex(rc.tokenId) + ':' + amount;
        var req = requests[key];
        if (!req) {
          var r = call('request', { token: hex(rc.tokenId), amount: amount });
          if (!r.ok) return rc;
          req = requests[key] = r.request;
        }
        var ch = call('chains');
        // What this phone takes, read fresh for every code (the day's count moves with each payment received).
        var lim = call('limit', { token: hex(rc.tokenId) });
        var copy = {};
        Object.keys(rc).forEach(function (k) { copy[k] = rc[k]; });
        copy.text = rc.text + '\n' + REQUEST_LABEL + ': ' + req + (ch.ok && ch.chains ? '\n' + CHAINS_LABEL + ': ' + ch.chains : '')
          + (lim.ok && lim.limit ? '\n' + LIMIT_LABEL + ': ' + lim.limit : '');
        copy.coinRequest = req;
        if (lim.ok && lim.limit) copy.coinLimit = lim.limit;
        watchLoads();
        return copy;
      });
    };

    out.pay = function (codeText, amountAtoms, payOpts) {
      var req = requestOf(codeText);
      // A code without a coin request comes from a phone on an older version.
      if (!req) return Promise.reject(err(P, 'version'));
      // The coin request names the receiver; the old engine's receiver check (WebCrypto) is not run inside the tap.
      var parsed = codeText && typeof codeText === 'object' ? codeText : P.parse(codeText);
      if (!parsed || parsed.type !== 'receiver') return Promise.reject(err(P, 'malformed'));
      return Promise.resolve(parsed).then(function (code) {
        var token = hex((payOpts && payOpts.tokenId) || code.tokenId);
        if (hex(code.tokenId) !== token) throw err(P, 'asset');
        if (code.amount != null && BigInt(amountAtoms) !== code.amount) throw err(P, 'amount-invalid');
        // A cheap read: the payer's page has 600 ms while the phones touch (R2-CAMPAIGN-04 took 1.2 s with the full state).
        var bal = call('balance', { token: token });
        // Coins that cannot be read are never replaced by other money without a word (R2-CAMPAIGN-02).
        if (!bal.ok) throw err(P, 'unavailable', bal.detail);
        if (BigInt(bal.atoms || '0') < BigInt(amountAtoms)) throw err(P, 'insufficient');
        var r = call('pay', { request: req, amount: String(amountAtoms), known: chainsOf(codeText) || '', limit: limitOf(codeText) || '',
          session: String((payOpts && payOpts.session) || '') });
        // The phones parted before the signature: nothing signed, nothing owed (failed payments, 2026-10-16).
        if (!r.ok && r.code === 'touch-ended') throw err(P, 'touch-ended', TOUCH_ENDED);
        // A request this phone already paid is never paid again (R2-CAMPAIGN-09): said as a duplicate, nothing moved.
        if (!r.ok && r.code === 'already-paid') throw err(P, 'duplicate', r.detail);
        // Above what the receiving phone takes (its code says so): nothing signed, nothing paid.
        if (!r.ok && r.code === 'receiver-limit') {
          var e = err(P, 'receiver-limit', /^\d+$/.test(String(r.max)) && String(r.max) !== '0'
            ? 'That phone takes up to ' + moneyOf(r.max, token, P) + ' per payment. It can accept this one with its fingerprint or code, then hold the phones together again.' : 'That phone takes no more payments from this phone today. It can accept this one with its fingerprint or code.');
          e.max = r.max;
          throw e;
        }
        // A fingerprint coin whose 30 seconds have passed: nothing signed, nothing paid.
        if (!r.ok && r.code === 'auth') throw err(P, 'auth', AUTH_AGAIN);
        if (!r.ok) throw err(P, r.code === 'pay' ? 'insufficient' : 'unavailable', r.detail);
        delete requests[token + ':' + String(amountAtoms)];
        // Where a question about this payment goes if the receiver never answers (its Savings address, from its code).
        if (code.address) callAsync('note', { ref: r.ref, address: String(code.address) }).then(function () {
          // Older unconfirmed payments that never learned their receiver's address try this one (a wrong guess is never answered).
          return callAsync('learn', { address: String(code.address) });
        });
        var ts = Date.now();
        var payment = { ref: 'r2-' + r.ref, coin: true, amount: String(amountAtoms), tokenId: token, payeeId: code.payeeId,
          text: HEAD + '\nBundle: ' + r.bundle, ts: ts };
        var entry = { id: ROW + 'OUT-' + r.ref, kind: 'out', amount: String(amountAtoms), tokenId: token, ref: payment.ref, ts: ts };
        return { status: 'paid', payment: payment, entry: entry };
      });
    };

    out.receive = function (paymentText, info) {
      // Old card money is set aside on a coin phone: an old-style payment is refused, nothing credited.
      if (!isCoinPayment(paymentText)) return Promise.reject(err(P, 'old-scheme'));
      var b = bundleOf(paymentText);
      if (!b) return Promise.reject(err(P, 'malformed'));
      var r = call('receive', { bundle: b });
      if (!r.ok) return Promise.reject(err(P, refusalCode(r), r.detail));
      if (!r.accepted && r.code === 'limit') {
        // Nothing credited; the engine retired the request, so the next code is a fresh one.
        forgetRequests();
        return Promise.reject(err(P, 'limit', limitMessage(r, P)));
      }
      if (!r.accepted) return Promise.reject(err(P, refusalCode(r), r.detail));
      forgetRequests();                                                    // the code shown was paid: the next one is fresh
      var entry = { id: ROW + 'IN-' + r.coinId, kind: 'in', amount: r.amount, tokenId: hex(r.token), ts: Date.now(),
        via: String((info && info.via) || ''), ack: r.ack };
      // Credited above a limit the person set (the payer could not be asked first): flagged, never lost.
      if (r.aboveLimit) entry.aboveLimit = aboveLimitMessage(r, P);
      return Promise.resolve({ status: 'credited', entry: entry });
    };

    out.journal = function () {
      return Promise.all([account.journal(), callAsync('state')]).then(function (both) {
        var rows = both[0], r = both[1];
        if (!r.ok || !r.events) return rows;
        // A claimed Add is shown by its own record ("To Stables card", Added), never again as a "Received".
        var claimedLoads = {};
        readLoads().forEach(function (l) { if (l.coinId) claimedLoads[hex(l.coinId)] = true; });
        // An exit is shown by its own record ("To Savings"), never as a payment received.
        var mine = r.events.filter(function (e) { return e.kind !== 'lost' && e.kind !== 'exit' && !(e.kind === 'load' && claimedLoads[hex(e.id)]); }).map(entryOf);
        return rows.concat(mine).sort(function (a, b) { return a.ts - b.ts; });
      });
    };

    /* The receiver answered (NFC or Bluetooth): recorded with the coin payment, so its row reads received. */
    out.markDelivered = function (ref, info) {
      if (String(ref || '').indexOf('r2-') !== 0) return account.markDelivered(ref, info);
      var key = String(ref).slice(3);
      var d = call('delivered', { ref: key });
      if (!d.ok || !d.known) return Promise.resolve(null);
      return callAsync('state').then(function (r) {
        var e = r.ok && r.events ? r.events.filter(function (x) { return x.kind === 'out' && x.ref === key; })[0] : null;
        if (!e) return null;
        var entry = entryOf(e);
        entry.delivered = { ts: Date.now(), via: String((info && info.via) || ''), result: String((info && info.result) || '') };
        return entry;
      });
    };
    out.outgoing = function (ref) {
      if (String(ref || '').indexOf('r2-') === 0) return Promise.resolve(null);
      return account.outgoing(ref);
    };
    return out;
  }

  /**
   * Add (founder 2026-10-11, "Add makes coins"): a fresh open coin request, then ONE Savings send with two outputs
   * (trace-design.md 13.11, generation R2T3): the anchor (1 atom at the anchor address, its kept state naming the
   * request) and the value (the amount at the R2T3 vault). The phone credits it from its own node after three
   * confirmations, once the deposit is proven. From the vault the money comes back only by an exit (Remove).
   */
  var VAULT = '0x78A7881E711158B9E3AECCB026223822D401440B864218E106122DC18B5CC7F0';
  // Generation R2T3 (build .108): the council on the server, one Remove may spend several vault coins. R2T2 coins still pay.
  var R2T3 = { anchor: '0x3DC4BD9985D5924FEFB11C8F97A01AAE5C8D88CA4C270F9FD9889DB4CF45EE60',
    vault: '0xD7B367D654F20186DA21BE1B82BA1B4DF4FE0103CBDF12A50C7E4A7DC88F22B0', tag: '0x52325433',
    request: '0xB13ADD36D874B2E0640AEB1F06B9AC1B5B37EC784AAD318A1463CC13DF2ED3F7', requestTag: '0x52325445', atom: '0.00000001' };
  /* Generation R2T4 (DEPOSIT_PROOF_DESIGN.md, founder 2026-10-17: "proofs the phone keeps itself"). Every Add spends one
     lane coin of the deposit gate as its FIRST input; the gate's script enforces the whole transaction (output 0 the next
     lane coin, output 1 the marker, output 2 the money into the vault, port 5 the lane's next deposit number). Minima
     derives a coin's id from the first input's id and the output index, so the marker's id alone proves the deposit, at
     any age: no receiver ever needs the deposit transaction again (R2Deposits.java). Same anchor and vault as R2T3. */
  var R2T4 = { tag: '0x52325434', gate: '0x084B1E939F497E46EA5107D3B29CB82E8E547FED26EDE45984FC3890352B7CC3',
    script: 'LET gen=0x52325434 LET anchoraddr=0x3DC4BD9985D5924FEFB11C8F97A01AAE5C8D88CA4C270F9FD9889DB4CF45EE60 LET vaultaddr=0xD7B367D654F20186DA21BE1B82BA1B4DF4FE0103CBDF12A50C7E4A7DC88F22B0 ASSERT @INPUT EQ 0 ASSERT STATE(0) EQ gen ASSERT STATE(2) GT 0 ASSERT STATE(5) EQ PREVSTATE(5)+1 ASSERT STATE(6) EQ PREVSTATE(6) ASSERT VERIFYOUT(0 @ADDRESS @AMOUNT @TOKENID TRUE) ASSERT VERIFYOUT(1 anchoraddr 0.00000001 STATE(3) TRUE) RETURN VERIFYOUT(2 vaultaddr STATE(2) STATE(3) FALSE)',
    laneToken: '0xD4F5DD3546F25D327CBF2B6867E193CE5DB6491AC9C65BBDCECACA1A6688063F', atoms: BigInt(1) };
  /* Generation R2T5 (r2t5/R2T5_DESIGN.md, founder 2026-10-17: "let's implement all this"): the same gate rule, its own
     gate, anchor (nothing can spend a marker) and vault, an exit record on chain, a Council heartbeat and guardians. New
     Adds go through this gate; R2T3 money moves over by coin refresh (reason "vault"). */
  var R2T5 = { tag: '0x52325435', gate: '0x9454F9DEC8C03CBA54179F2808934A3D65B281C42124B5BA567322F2497CE9A6',
    anchor: '0x8E5DA67BE5D0E8E6E58238702B725F2BDBE982D3B264A55D8FC4A8D648E7071D',
    vault: '0x5E2497EC163480AEC7C15B43A62FDBED9595FA38ED1DE2ACC4A0A4F0E1287791',
    request: '0x5BFE17B989A7053037A3E565C42696481952295E20F2EE7128F61713176F907B',
    script: 'LET gen=0x52325435 LET anchoraddr=0x8E5DA67BE5D0E8E6E58238702B725F2BDBE982D3B264A55D8FC4A8D648E7071D LET vaultaddr=0x5E2497EC163480AEC7C15B43A62FDBED9595FA38ED1DE2ACC4A0A4F0E1287791 ASSERT @INPUT EQ 0 ASSERT STATE(0) EQ gen ASSERT STATE(2) GT 0 ASSERT STATE(5) EQ PREVSTATE(5)+1 ASSERT STATE(6) EQ PREVSTATE(6) ASSERT VERIFYOUT(0 @ADDRESS @AMOUNT @TOKENID TRUE) ASSERT VERIFYOUT(1 anchoraddr 0.00000001 STATE(3) TRUE) RETURN VERIFYOUT(2 vaultaddr STATE(2) STATE(3) FALSE)',
    laneToken: '0xD4F5DD3546F25D327CBF2B6867E193CE5DB6491AC9C65BBDCECACA1A6688063F', atoms: BigInt(1) };
  /** The gate new Adds go through (R2T5 since 0.0.14.004), with its own anchor and vault. */
  var GATE = { tag: R2T5.tag, gate: R2T5.gate, script: R2T5.script, laneToken: R2T5.laneToken, atoms: R2T5.atoms, anchor: R2T5.anchor, vault: R2T5.vault };
  var gateTracked = false;
  var lanesInFlight = {};                       // lane coin id -> when this phone spent it (another lane is used meanwhile)
  function coinState(c) {
    var out = {}, st = c && c.state;
    if (Array.isArray(st)) st.forEach(function (e) { if (e && e.port != null) out[String(e.port)] = String(e.data == null ? '' : e.data); });
    else if (st && typeof st === 'object') Object.keys(st).forEach(function (k) { var v = st[k]; out[k] = String(v && typeof v === 'object' ? v.data : v); });
    return out;
  }
  function atoms8(v) {
    var m = String(v == null ? '' : v).trim().match(/^(\d+)(?:\.(\d+))?$/);
    if (!m || (m[2] || '').length > 8) return null;
    return BigInt(m[1]) * BigInt(100000000) + BigInt(((m[2] || '') + '00000000').slice(0, 8));
  }
  function ensureGate(node) {
    if (gateTracked) return Promise.resolve();
    return node.cmd('newscript trackall:true script:"' + GATE.script + '"', 'Stables card', 60000).then(function (res) {
      var got = String((res && (res.address || (res.response && res.response.address))) || '');
      if (got.toLowerCase() !== GATE.gate.toLowerCase()) throw new Error('the deposit gate registered at another address: ' + got);
      gateTracked = true;
    });
  }
  /** One Add through the gate: {txpowid}. Tries another lane when the one it took was just spent by another phone. */
  function depositThroughGate(node, token, atoms, keyHash, attempt) {
    var C = W.StablesInstantChainCore;
    if (!C || typeof C.planCommands !== 'function' || typeof node.coinsAt !== 'function' || typeof node.gather !== 'function') return Promise.reject(new Error('the deposit builder is not available'));
    var id = 'stables_gate_add';
    var amount = BigInt(atoms), now = Date.now();
    Object.keys(lanesInFlight).forEach(function (k) { if (now - lanesInFlight[k] > 10 * 60 * 1000) delete lanesInFlight[k]; });
    return ensureGate(node).then(function () { return node.coinsAt(GATE.gate); }).then(function (coins) {
      var lanes = (coins || []).filter(function (c) {
        var st = coinState(c);
        return c && !c.spent && String(c.address || '').toLowerCase() === GATE.gate.toLowerCase() && hex(c.tokenid) === hex(GATE.laneToken)
          && /^\d+$/.test(st['5'] || '') && /^\d+$/.test(st['6'] || '') && !lanesInFlight[String(c.coinid).toLowerCase()];
      });
      if (!lanes.length) throw new Error('no deposit lane is free right now');
      var lane = lanes[Math.floor(Math.random() * lanes.length)];
      var st = coinState(lane);
      var need = amount + GATE.atoms;               // the money and the marker's atom; the lane coin carries itself
      return Promise.resolve(node.gather('0x' + token.toUpperCase(), P_dec(need), 'Savings', 1, 4)).then(function (savings) {
        var total = BigInt(0), changeTo = '';
        (savings || []).forEach(function (c) {
          var a = atoms8(c.tokenamount != null ? c.tokenamount : c.amount);
          if (a == null || hex(c.tokenid) !== token) throw new Error('a Savings coin this Add cannot count');
          total += a; if (!changeTo) changeTo = String(c.address || '');
        });
        if (!savings || !savings.length || total < need) throw new Error('Savings does not hold enough');
        var change = total - need;
        var outputs = [
          { address: GATE.gate, amount: '0.00000001', tokenid: GATE.laneToken, storestate: true },
          { address: GATE.anchor, amount: '0.00000001', tokenid: '0x' + token.toUpperCase(), storestate: true },
          { address: GATE.vault, amount: P_dec(amount), tokenid: '0x' + token.toUpperCase(), storestate: false }];
        if (change > BigInt(0)) outputs.push({ address: changeTo, amount: P_dec(change), tokenid: '0x' + token.toUpperCase(), storestate: false });
        var plan = { inputs: [lane.coinid].concat(savings.map(function (c) { return c.coinid; })), outputs: outputs,
          state: { 0: GATE.tag, 1: '0x' + keyHash.toUpperCase(), 2: P_dec(amount), 3: '0x' + token.toUpperCase(),
            5: String(Number(st['5']) + 1), 6: st['6'] } };
        var steps = C.planCommands(id, plan);
        return node.cmd('txndelete id:' + id, 'Stables card', 15000).catch(function () { return null; })
          .then(function () {
            if (typeof node.batch === 'function') return node.batch(steps, 'Stables card', 90000);
            return steps.reduce(function (p, c) { return p.then(function () { return node.cmd(c, 'Stables card', 60000); }); }, Promise.resolve());
          })
          .then(function () { return node.cmd('txnbasics id:' + id, 'Stables card', 120000); })
          .then(function () { return node.cmd('txnsign id:' + id + ' publickey:auto', 'Stables card', 240000); })
          .then(function () { return node.cmd('txncheck id:' + id, 'Stables card', 90000); })
          .then(function (check) {
            var v = (check && check.valid) || {}, sig = v.signatures;
            if (Array.isArray(sig)) sig = sig.every(function (x) { return x && x.valid === true; });
            if (!(v.basic === true && sig === true && v.mmrproofs === true && v.scripts === true)) throw new Error('the deposit did not pass its checks: ' + JSON.stringify(v));
            lanesInFlight[String(lane.coinid).toLowerCase()] = Date.now();
            return node.cmd('txnpost id:' + id + ' txndelete:true', 'Stables card', 120000);
          })
          .then(function (res) {
            try { if (typeof node.noteInFlight === 'function') node.noteInFlight(savings); } catch (_) { /* a convenience */ }
            var a = answerOf(res);
            var txpowid = String(a.txpowid || (a.txpow && a.txpow.txpowid) || (res && res.txpowid) || '');
            // The marker is output 1; its coin id is final before mining (hash of the lane coin and the index), so the
            // phone credits this Add by reading that one coin, never by listing every marker ever made (0.0.14.005).
            var outs = (a.body && a.body.txn && a.body.txn.outputs) || (a.txpow && a.txpow.body && a.txpow.body.txn && a.txpow.body.txn.outputs) || [];
            var marker = outs[1] && String(outs[1].address || '').toLowerCase() === GATE.anchor.toLowerCase() ? String(outs[1].coinid || '') : '';
            console.log('[route2] Add through the gate: lane ' + st['6'] + ' deposit ' + (Number(st['5']) + 1) + ' posted ' + txpowid + (marker ? ' marker ' + marker.slice(0, 10) : ''));
            return { status: true, response: { txpowid: txpowid, marker: marker } };
          });
      });
    }).catch(function (e) {
      node.cmd('txndelete id:' + id, 'Stables card', 15000).catch(function () { return null; });
      var msg = String((e && e.message) || e || '');
      // Another phone took the same lane coin first: try another lane, twice at most.
      if ((attempt || 0) < 2 && /mempool|already|spent|coin|mmr|lane/i.test(msg) && !/Savings/.test(msg)) {
        console.log('[route2] Add: lane taken (' + msg.slice(0, 120) + '), trying another');
        return depositThroughGate(node, token, atoms, keyHash, (attempt || 0) + 1);
      }
      throw e;
    });
  }
  function P_dec(atoms) {
    var a = BigInt(atoms), whole = (a / BigInt(100000000)).toString(), frac = (a % BigInt(100000000)).toString().padStart(8, '0').replace(/0+$/, '');
    return whole + (frac ? '.' + frac : '');
  }

  function load(atoms, tokenId, node, P, opts) {
    if (!canHold()) return Promise.reject(err(P, 'unavailable'));
    if (!node || typeof node.cmd !== 'function') return Promise.reject(err(P, 'unavailable'));
    var token = hex(tokenId);
    var r = call('request', { token: token, amount: '0' });
    if (!r.ok || !r.keyHash) return Promise.reject(err(P, 'unavailable', r.detail));
    return depositThroughGate(node, token, atoms, r.keyHash, 0)
      .then(function (res) {
        if (res && res.status !== false) {
          var resp = answerOf(res);
          var txpowid = String(resp.txpowid || (resp.txpow && resp.txpow.txpowid) || '');
          var list = readLoads();
          list.push({ keyHash: hex(r.keyHash), amount: String(atoms), tokenId: token, ts: Date.now(), status: 'posted', txpowid: txpowid, block: 0, depth: -1,
            marker: resp.marker ? hex(resp.marker) : '', refresh: !!(opts && opts.refresh) });
          writeLoads(list);
          res.coinLoadEntry = loadEntryOf(list[list.length - 1]);
        }
        watchLoads();
        return res;
      });
  }

  /* COIN LOAD RECORDS (founder 2026-10-11: "the 2500 sent to the card is presented as a regular sending"; "the amount on
     the card, after minutes, this is still not shown"). One record per Add, kept on this phone: the card shows its amount
     on the way at once ("+X" beside the card figure, as an Add always did), the row reads "To Stables card" with its
     confirmations, then Added when the phone credits it. The node's own send of it is not shown (tx-mirror.js). */
  var LOADS_KEY = 'stables.route2.loads.v1';
  function readLoads() {
    try { var v = JSON.parse(W.localStorage.getItem(LOADS_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; }
  }
  function writeLoads(list) {
    try { W.localStorage.setItem(LOADS_KEY, JSON.stringify(list.slice(-50))); } catch (_) { /* the row comes back with the next Add */ }
  }
  function loadEntryOf(l) {
    return { id: ROW + 'LOAD-' + l.keyHash, kind: 'load', coinLoad: true, amount: String(l.amount), tokenId: l.tokenId, ts: Number(l.ts),
      status: l.status === 'credited' ? 'credited' : 'posted', txpowid: l.txpowid || '', block: Number(l.block) || 0,
      depth: Number(l.depth), confirmBlocks: 3, coinId: l.coinId || '' };
  }
  // A coin refresh's Remove and Add are ONE row, "Card refresh" (refreshEntries), never two (law 2; founder 2026-10-16).
  function loadEntries() { return canHold() ? readLoads().filter(function (l) { return !l.refresh; }).map(loadEntryOf) : []; }
  /** One row per coin refresh: the Remove leg until its money is back in Savings, then the Add leg; done once credited. */
  function refreshEntries() {
    if (!canHold()) return [];
    var loads = readLoads().filter(function (l) { return l.refresh; });
    return readExits().filter(function (x) { return x.refresh; }).map(function (x) {
      var l = x.reloadKey ? loads.filter(function (y) { return y.keyHash === x.reloadKey; })[0] : null;
      if (!l && x.reloaded) l = loads.filter(function (y) { return Number(y.ts) >= Number(x.reloaded) - 60000; })[0] || null;
      var e = l ? loadEntryOf(l) : exitEntryOf(x);
      e.id = ROW + 'REFRESH-' + x.coinId; e.coinRefresh = true;
      e.ts = Number(x.ts); e.amount = String(x.amount); e.tokenId = x.tokenId;
      e.refreshDone = !!(l && l.status === 'credited');
      return e;
    });
  }
  /** A scan's answer applied to the records: confirmations of the deposits on their way, Added for those credited. */
  function noteScan(r) {
    if (!r || !r.ok) return false;
    var list = readLoads(), changed = false;
    (r.pending || []).forEach(function (p) {
      var l = list.filter(function (x) { return x.keyHash === hex(p.keyHash) && x.status !== 'credited'; })[0];
      if (l && (l.block !== Number(p.block) || l.depth !== Number(p.depth))) { l.block = Number(p.block) || 0; l.depth = Number(p.depth); changed = true; }
    });
    // Claimed by this scan, or credited earlier (the engine repeats every credited load: one missed answer cannot leave a
    // row Broadcasted).
    (r.claimed || []).concat(r.loaded || []).forEach(function (c) {
      var l = list.filter(function (x) { return x.keyHash === hex(c.keyHash) && x.status !== 'credited'; })[0];
      if (l) { l.status = 'credited'; l.coinId = hex(c.coinId); l.depth = 3; changed = true; }
    });
    if (changed) writeLoads(list);
    if (changed || (r.claimed && r.claimed.length) || (r.pending && r.pending.length)) {
      try { console.log('[route2] loads: claimed ' + (r.claimed || []).length + ', pending ' + (r.pending || []).length + ', records ' + list.length + ', changed ' + changed); } catch (_) { /* no console */ }
    }
    return changed;
  }

  /** Loads: vault deposits naming one of this phone's open coin requests (online, the phone's own node). */
  // When the scan started (0: none). An answer that never comes back must not stop every later scan: after a minute
  // the next one goes ahead (founder's Pro, build 112: one scan at start, then none, and the rows stayed Broadcasted).
  var scanning = 0;
  /* CREDIT BY MARKER (0.0.14.005, founder: "The Graphene phone is much slower than Pro"). An Add whose marker coin id is
     known is credited by one coin read. The scan below lists every marker at the anchor addresses, which on Minima Core
     took 4 to 13 seconds a pass; it now runs only when an Add has no known marker, and as a fallback every fourth pass. */
  var markerTick = 0, claimingMarkers = false;
  function claimMarkers() {
    if (claimingMarkers || !canHold()) return Promise.resolve(false);
    var open = readLoads().filter(function (l) { return l.status !== 'credited' && l.marker; });
    if (!open.length) return Promise.resolve(false);
    claimingMarkers = true;
    var credited = [];
    return open.reduce(function (pr, l) {
      return pr.then(function () {
        return callAsync('claim', { coinId: l.marker }).then(function (r) {
          if (r && r.ok && r.coinId) credited.push({ keyHash: l.keyHash, coinId: r.coinId });
          else {
            var m = String((r && (r.detail || r.message)) || '').match(/has (\d+) confirmations/);
            if (m) { var list = readLoads(), x = list.filter(function (y) { return y.keyHash === l.keyHash; })[0]; if (x && x.depth !== Number(m[1])) { x.depth = Number(m[1]); writeLoads(list); } }
          }
        }).catch(function () { /* not yet on this node: the next pass asks again */ });
      });
    }, Promise.resolve()).then(function () {
      claimingMarkers = false;
      if (!credited.length) return false;
      var list = readLoads();
      credited.forEach(function (c) { var x = list.filter(function (y) { return y.keyHash === c.keyHash; })[0]; if (x) { x.status = 'credited'; x.coinId = hex(c.coinId); x.depth = 3; } });
      writeLoads(list);
      try { console.log('[route2] loads: credited ' + credited.length + ' by marker'); } catch (_) { /* no console */ }
      forgetRequests();
      if (onChange) { try { onChange(credited); } catch (_) { /* the balance shows at the next refresh */ } }
      return true;
    });
  }
  function scanLoads() {
    if (!canHold()) return Promise.resolve({ ok: false, code: 'unavailable' });
    if (scanning && Date.now() - scanning < 60000) return Promise.resolve({ ok: true, claimed: [] });
    scanning = Date.now();
    return callAsync('scan').catch(function () { return { ok: false }; }).then(function (r) {
      scanning = 0;
      var moved = noteScan(r);
      if (r && r.ok && r.claimed && r.claimed.length) forgetRequests();
      if ((moved || (r && r.ok && r.claimed && r.claimed.length)) && onChange) {
        try { onChange(r.claimed || []); } catch (_) { /* the balance shows at the next refresh */ }
      }
      return r;
    });
  }

  /* REMOVE TO SAVINGS (Stage 2, trace-design.md 13.11). The engine picks one coin of exactly the amount (a self-hop on
     the card first when needed) and signs its exit line with the coin's own key, which the TEE destroys: from that moment
     the money has left the card. The page then posts the exit request from Savings: 1 atom of the currency at the
     request address, its kept state carrying the amount, the payout address and the package. The test council approves
     it within minutes; if it stays silent, the request pays after 20 blocks. One record per Remove, kept on this phone,
     drawn as the "To Savings" row; the Savings figure shows the amount arriving at once ("+X"). */
  var EXITS_KEY = 'stables.route2.exits.v1';
  function readExits() {
    try { var v = JSON.parse(W.localStorage.getItem(EXITS_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; }
  }
  function writeExits(list) {
    try { W.localStorage.setItem(EXITS_KEY, JSON.stringify(list.slice(-50))); } catch (_) { /* the engine keeps the exit itself */ }
  }
  function exitEntryOf(x) {
    return { id: ROW + 'EXIT-' + x.coinId, kind: 'offload', coinExit: true, amount: String(x.amount), tokenId: x.tokenId, ts: Number(x.ts),
      status: x.status === 'received' ? 'received' : (x.status === 'refused' ? 'restored' : (x.status === 'rejected' ? 'rejected' : 'posted')), txpowid: x.txpowid || '',
      block: Number(x.block) || 0, depth: Number(x.depth), wait: Number(x.wait) || 20, generation: x.generation || '', approved: !!x.approved, approvedAt: Number(x.approvedAt) || 0, payableFrom: Number(x.payableFrom) || 0, tip: Number(x.tip) || 0, settled: x.status === 'received', rejectedBlock: Number(x.rejectedBlock) || 0,
      note: x.status === 'unposted' ? 'The request to Savings was not sent: ' + (x.error || 'no answer') : '' };
  }
  function exitEntries() { return canHold() ? readExits().filter(function (x) { return !x.refresh; }).map(exitEntryOf) : []; }
  /** Rows an earlier build drew for a Remove as a payment received on the card (build 111); the activity list forgets them. */
  function strayExitRows(opts) {
    var ids = readExits().map(function (x) { return ROW + 'IN-' + hex(x.coinId); });
    var nodeRow = function (t) { return typeof W.stablesNodeActivityId === 'function' ? W.stablesNodeActivityId(t) : 'NODE-' + String(t).toLowerCase(); };
    // The node's own rows for the Add's deposit and the Remove's request (before build 117 the node history drew them as
    // plain Sent rows besides "To Stables card" and "To Savings"): one row per operation (law 2).
    readLoads().concat(readExits()).forEach(function (r) { if (r.txpowid) ids.push(nodeRow(r.txpowid)); });
    // Technical transactions (0.0.13.039): a refund's request and every package carrier, unless Advanced shows them.
    if (opts && opts.technical) {
      readRefunds().forEach(function (r) { if (r.txpowid) ids.push(nodeRow(r.txpowid)); (r.carrierTxpows || []).forEach(function (t) { ids.push(nodeRow(t)); }); });
      readExits().forEach(function (r) { (r.carrierTxpows || []).forEach(function (t) { ids.push(nodeRow(t)); }); });
    }
    return ids;
  }
  function remove(atoms, tokenId, payout, node, P, opts) {
    if (!canHold()) return Promise.reject(err(P, 'unavailable'));
    if (!node || typeof node.cmd !== 'function') return Promise.reject(err(P, 'unavailable'));
    var token = hex(tokenId);
    var addr = payout ? Promise.resolve(payout) : node.cmd('getaddress', 'Stables card', 60000).then(function (g) {
      var a = answerOf(g).address;
      if (!a) { try { console.log('[route2] getaddress gave no address: ' + JSON.stringify(g).slice(0, 300)); } catch (_) { /* no console */ } }
      if (!a) throw err(P, 'unavailable', 'No Savings address. Nothing was moved.');
      return a;
    });
    return addr.then(function (to) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(String(to))) throw err(P, 'unavailable', 'This Savings address cannot receive. Nothing was moved.');
      // A coin held by a fingerprint key leaves only after the fingerprint (item 6).
      var why = fingerprintReason(token, atoms, true);
      // A refresh moves a plain-key coin only: it never asks.
      if (!why || fingerprintFresh() || (opts && opts.refresh)) return to;
      return fingerprint(why === 'refill' ? REFILL_PROMPT : 'Confirm moving this to Savings').then(function (ok) {
        if (!ok) throw err(P, 'auth', 'Confirm with your fingerprint to move this amount. Nothing was moved.');
        return to;
      });
    }).then(function (to) {
      var args = { token: token, amount: String(atoms), payout: hex(to) };
      if (opts && opts.coinId) args.coinId = hex(opts.coinId);
      // Asynchronous (0.0.14.006): the engine may read the node first (each coin's vault), which through Minima Core takes
      // seconds; the page never waits on it (the Graphene was killed twice during a Remove on 0.0.14.005).
      return callAsync('exit', args);
    }).then(function (r) {
      r = r || { ok: false, code: 'unavailable' };
      if (!r.ok && r.code === 'auth') throw err(P, 'auth', 'Confirm with your fingerprint again. Nothing was moved.');
      if (r.ok) refill(token);                                             // within the same fingerprint, never a prompt
      // Money added before this version rests on the old vault, which has no way back yet: said plainly, nothing moved.
      if (!r.ok) throw err(P, r.code === 'pay' ? 'insufficient' : (r.code === 'exit-generation' ? 'exit-generation' : 'unavailable'), r.detail);
      var x = { coinId: r.coinId, amount: String(r.amount), tokenId: token, payout: hex(r.payout || ''), ts: Date.now(), status: 'signed', wait: r.wait, generation: r.generation || '', refresh: !!(opts && opts.refresh) };
      var list = readExits(); list.push(x); writeExits(list);
      return postPackaged(node, r, token, P.atomsToDecimal(BigInt(r.amount)))
        .then(function (res) {
          var l = readExits(), rec = l.filter(function (e) { return e.coinId === r.coinId; })[0];
          if (res && res.status !== false) {
            var resp = answerOf(res);
            rec.txpowid = String(resp.txpowid || (resp.txpow && resp.txpow.txpowid) || '');
            rec.status = 'posted'; rec.carrierTxpows = res.carrierTxpows || [];
            call('exitProgress', { coinId: r.coinId, status: 1, request: rec.txpowid });
          } else {
            // The coin has left the card (its key signed the exit line); the package stays in the engine for a new request.
            rec.status = 'unposted'; rec.error = String((res && res.error) || '');
          }
          writeExits(l);
          res = res || {};
          res.coinExitEntry = exitEntryOf(rec);
          watchLoads();
          return res;
        });
    });
  }
  /** Where each Remove stands: the request on chain, its age against the fallback wait, the money in Savings. */
  function noteExits(r) {
    if (!r || !r.ok || !r.exits) return false;
    var list = readExits(), changed = false;
    r.exits.forEach(function (e) {
      var x = list.filter(function (l) { return hex(l.coinId) === hex(e.coinId) && l.status !== 'received'; })[0];
      if (!x) return;
      if (e.open && (x.block !== Number(e.block) || x.depth !== Number(e.depth))) { x.block = Number(e.block); x.depth = Number(e.depth); x.request = e.request; x.status = 'posted'; changed = true; }
      // R2T5: approved by the Council (sealed after the request, still open) and the block it pays from.
      if (e.open && e.approved && (x.payableFrom !== Number(e.payableFrom) || !x.approved || (!x.approvedAt && Number(e.approvedAt) > 0))) { x.approved = true; x.payableFrom = Number(e.payableFrom); if (Number(e.approvedAt) > 0) x.approvedAt = Number(e.approvedAt); changed = true; }
      if (e.open && e.tip) x.tip = Number(e.tip);
      // The engine reports paid only once the request is spent and the amount sits at the payout address.
      if (!e.open && e.paid) { x.status = 'received'; if (e.paidCoin) x.paidCoin = e.paidCoin; changed = true; }
      if (!e.open && e.rejected && x.status !== 'rejected') { x.status = 'rejected'; changed = true; }
      // Rejected by the Council: its request is gone and a lone 1-atom refund reached the payout address after the request's
      // block. Each refund explains one Remove only (the earliest unexplained one), so two Removes never share it.
      if (!e.open && !e.paid && !e.rejected && x.status === 'posted' && Number(x.block) > 0 && e.loneRefunds) {
        var used = list.map(function (l) { return l.rejectedBy; }).filter(Boolean);
        var r = e.loneRefunds.filter(function (f) { return Number(f.block) > Number(x.block) && used.indexOf(f.coinId) < 0; })
          .sort(function (a, b) { return Number(a.block) - Number(b.block); })[0];
        if (r) {
          x.status = 'rejected'; x.rejectedBy = r.coinId; x.rejectedBlock = Number(r.block); changed = true;
          call('exitProgress', { coinId: x.coinId, status: 3 });
          try { console.log('[route2] exit ' + String(x.coinId).slice(0, 8) + ' rejected by the Council at block ' + r.block); } catch (_) { /* no console */ }
        }
      }
    });
    if (changed) writeExits(list);
    try { console.log('[route2] exits: ' + r.exits.length + ' reported, records ' + JSON.stringify(list.map(function (l) { return [String(l.coinId).slice(0, 8), l.status, l.block]; })) + ', changed ' + changed); } catch (_) { /* no console */ }
    return changed;
  }
  function exitAgain(x) {
    var node = W.__STABLES_INSTANT_NODE__;
    if (!node || typeof node.cmd !== 'function') return;
    var l0 = readExits(); l0.forEach(function (e) { if (e.coinId === x.coinId) e.again = Date.now(); }); writeExits(l0);
    var r = call('exitAgain', { coinId: x.coinId });
    if (!r.ok) { try { console.log('[route2] exit ' + String(x.coinId).slice(0, 8) + ' not posted again: ' + JSON.stringify(r)); } catch (_) { /* no console */ } return; }
    postPackaged(node, r, hex(r.token), decimalOf(r.amount)).then(function (res) {
      var l = readExits(), rec = l.filter(function (e) { return e.coinId === x.coinId; })[0];
      if (!rec) return;
      if (res && res.status !== false) {
        var resp = answerOf(res);
        rec.txpowid = String(resp.txpowid || (resp.txpow && resp.txpow.txpowid) || ''); rec.status = 'posted'; rec.block = 0; delete rec.rejectedBy; delete rec.rejectedBlock;
        call('exitProgress', { coinId: x.coinId, status: 1, request: rec.txpowid });
      } else { rec.error = String((res && res.error) || ''); }
      writeExits(l);
      try { console.log('[route2] exit ' + String(x.coinId).slice(0, 8) + ' posted again in carriers: ' + (res && res.status !== false)); } catch (_) { /* no console */ }
    });
  }
  function scanExits() {
    if (!canHold() || !readExits().some(function (x) { return x.status !== 'received' && x.status !== 'rejected'; })) return Promise.resolve(false);
    return callAsync('exitScan').then(function (r) {
      if (!r || !r.ok) { try { console.log('[route2] exitScan refused: ' + JSON.stringify(r)); } catch (_) { /* no console */ } }
      var moved = noteExits(r);
      if (moved && onChange) { try { onChange([]); } catch (_) { /* the next refresh shows it */ } }
      // Once: a Remove rejected because its inline package could not be paid out (before 0.0.13.037) goes again in carriers.
      readExits().filter(function (x) { return x.status === 'rejected' && !x.again; }).forEach(function (x) { exitAgain(x); });
      (r && r.ok && r.exits || []).forEach(function (e) {
        if (e.open && e.request && Number(e.depth) >= (Number(e.wait) || 20) + 1) postFallback(W.__STABLES_INSTANT_NODE__, e).catch(function () { /* next block */ });
      });
      return moved;
    });
  }

  /* FALLBACK (Stage 2, COUNCIL_ATTESTATION_DESIGN 3.2): a request W blocks old that the council neither paid nor rejected
     pays itself, and anyone may post that payout. While the app is open it posts it for its own Removes, at most once a
     block: no signature, only the two R2T3 scripts (registered on this phone's node so it can attach them), the request
     and one vault coin that covers it. The council stays the faster path; this is what makes a Remove unstoppable. */
  var R2T3_SCRIPTS = {
    request: 'LET sealaddr=0xAA222EFD8CC8E87A1616E3F8BAD1936A1363501C88337B53809664EF5E9EDF50 LET sealtok=0x0E277A26E58F352BE2967C095E4587A671A28AED7A3EBED31D43093FDA3F2E82 ASSERT @INPUT EQ 0 ASSERT SAMESTATE(10 14) IF MULTISIG(5 0xD1E4C6666D3473F0A4B75751567A2F6970500972034ECEF85FBEE10E4869DC6B 0x0C6DF55B4169511B8128BDE007D05EBC910B6999466686FF2EDEDF5994C21B26 0xD5DC53E95705C76D4776890EA0FAF15F3E64C67AED8B86C78B526FB47799BCE0 0x2625B4E2797EB2DDCC0CA964C5D2DE8A129CD52FF00908D0F7689A49E3B52169 0x584906F78CE40991C508EDA678773F8EBB5305D6641B9DD10652F19C32E809E6 0x06871BEFB8E07E74095D4F0F6020B36A44E93E0D2B51469DB4DE804DFF5EB5F1 0xAA24D255893D1EAA4805ABD0A2026298C77752D612D2D113D725C9EB21C9E07E) THEN RETURN TRUE ENDIF ASSERT VERIFYOUT(0 STATE(14) STATE(12) STATE(13) FALSE) ASSERT STATE(17) EQ @AMOUNT ASSERT VERIFYOUT(1 STATE(14) STATE(17) @TOKENID FALSE) IF @COINAGE GTE 20 THEN RETURN TRUE ENDIF ASSERT GETINADDR(STATE(16)+1) EQ sealaddr ASSERT GETINTOK(STATE(16)+1) EQ sealtok RETURN PROOF(@COINID 0 STATE(20) 0 STATE(25))',
    vault: 'LET lab=0xF0EC7DA9D13EABE32FA358C410D3153156E18ED362365DA01AC2DC2177AED42F LET labaddr=0xE9373F1602002A51803B645413FC837C0FC51B3671CC4DB9334B91BD39250325 LET reqaddr=0xB13ADD36D874B2E0640AEB1F06B9AC1B5B37EC784AAD318A1463CC13DF2ED3F7 IF SIGNEDBY(lab) THEN LET p=100+@INPUT ASSERT STATE(p) EQ @AMOUNT RETURN VERIFYOUT(@INPUT labaddr STATE(p) @TOKENID FALSE) ENDIF ASSERT GETINADDR(0) EQ reqaddr LET n=STATE(16) ASSERT (@INPUT GTE 1) AND (@INPUT LTE n) AND (n LTE 8) ASSERT STATE(13) EQ @TOKENID ASSERT STATE(12) GT 0 LET sum=0 LET i=1 WHILE i LTE n DO ASSERT GETINADDR(i) EQ @ADDRESS ASSERT GETINTOK(i) EQ @TOKENID LET sum=sum+GETINAMT(i) LET i=i+1 ENDWHILE ASSERT VERIFYOUT(0 STATE(14) STATE(12) @TOKENID FALSE) LET rem=sum-STATE(12) ASSERT STATE(15) EQ rem IF rem GT 0 THEN RETURN VERIFYOUT(2 @ADDRESS STATE(15) @TOKENID FALSE) ENDIF RETURN rem EQ 0' };
  var fallbackTried = {}, fallbackAttempts = {};
  function fbLog(m) { try { console.log('[route2] fallback ' + m); } catch (_) { /* no console */ } }
  function postFallback(node, e) {
    if (!node || typeof node.cmd !== 'function') return Promise.resolve(false);
    // R2T5 requests: the payout needs a seal copy and the exit record's proofs, which the Council or a guardian builds.
    if (e.generation === 'R2T5') return Promise.resolve(false);
    var tip = Number(e.tip) || 0;
    if (fallbackTried[e.coinId] && tip - fallbackTried[e.coinId] < 1) return Promise.resolve(false);
    fallbackTried[e.coinId] = tip;
    var attempt = fallbackAttempts[e.coinId] = (fallbackAttempts[e.coinId] || 0) + 1;
    function cmd(c) { return node.cmd(c, 'Stables card', 120000).then(function (r) { if (!r || r.status === false) throw new Error(String((r && r.error) || 'refused: ' + c.split(' ')[0])); return answerOf(r); }); }
    var id = 'r2fb' + String(e.coinId).slice(0, 8), q, state, pick;
    var tag = String(e.coinId).slice(0, 8) + ' #' + attempt + ' tip ' + tip;
    /* A node that is behind builds on coins the network already spent: its payout checks valid on the phone and is
       refused everywhere else (the Graphene on Minima Core, 2026-10-13: ten minutes of payouts, none mined). Its newest
       block must be recent before anything is posted. */
    return cmd('block').then(function (b) {
      var age = Date.now() - Number(b && b.timemilli);
      if (!(age < 10 * 60 * 1000)) throw new Error('this node is behind (newest block ' + Math.round(age / 60000) + ' min old)');
      return cmd('coins coinid:' + e.request);
    }).then(function (list) {
      q = (list || [])[0];
      if (!q || q.spent) throw new Error('request gone');
      state = {};
      (q.state || []).forEach(function (v) { state[v.port] = String(v.data); });
      return cmd('coins address:' + R2T3.vault + ' tokenid:' + state[13]);
    }).then(function (coins) {
      var atomsOf = function (a) { var p = String(a).split('.'); return BigInt(p[0]) * BigInt(100000000) + BigInt(((p[1] || '') + '00000000').slice(0, 8)); };
      var need = atomsOf(state[12]);
      /* A single coin that covers it; else the largest coins until they do, at most 8 (R2T3). Not always the smallest:
         two Removes that reach their wait in the same block both chose the same vault coin, and only one could be paid
         (the Pro's 72.4 and the Graphene's 166.1, block 2364550). Each request starts at its own place among the covering
         coins (from its coin id) and moves one place per attempt, so a coin that keeps failing is not chosen again. */
      var open = (coins || []).filter(function (c) { return !c.spent; });
      var covering = open.filter(function (c) { return atomsOf(c.tokenamount) >= need; })
        .sort(function (a, b) { return atomsOf(a.tokenamount) < atomsOf(b.tokenamount) ? -1 : 1; });
      var seed = parseInt(String(q.coinid).replace(/^0x/i, '').slice(-4), 16) || 0;
      var one = covering.length ? covering[(seed + attempt - 1) % covering.length] : null;
      pick = one ? [one] : [];
      if (!one) {
        var sum = BigInt(0);
        open.sort(function (a, b) { return atomsOf(a.tokenamount) > atomsOf(b.tokenamount) ? -1 : 1; })
          .forEach(function (c) { if (sum < need && pick.length < 8) { pick.push(c); sum += atomsOf(c.tokenamount); } });
        if (sum < need) throw new Error('the vault coins do not cover it');
      }
      var total = pick.reduce(function (t, c) { return t + atomsOf(c.tokenamount); }, BigInt(0));
      var rem = total - need;
      var remDec = rem > BigInt(0) ? (rem / BigInt(100000000)).toString() + '.' + (rem % BigInt(100000000)).toString().padStart(8, '0') : '0';
      remDec = remDec.indexOf('.') > 0 ? remDec.replace(/0+$/, '').replace(/\.$/, '') : remDec;
      var steps = [
        'newscript trackall:false script:"' + R2T3_SCRIPTS.request + '"',
        'newscript trackall:false script:"' + R2T3_SCRIPTS.vault + '"',
        'txndelete id:' + id,
        'txncreate id:' + id,
        'txninput id:' + id + ' coinid:' + q.coinid,
      ].concat(pick.map(function (c) { return 'txninput id:' + id + ' coinid:' + c.coinid; })).concat([
        'txnoutput id:' + id + ' amount:' + state[12] + ' address:' + state[14] + ' tokenid:' + state[13] + ' storestate:false',
        'txnoutput id:' + id + ' amount:' + q.tokenamount + ' address:' + state[14] + ' tokenid:' + q.tokenid + ' storestate:false'
      ]);
      if (rem > BigInt(0)) steps.push('txnoutput id:' + id + ' amount:' + remDec + ' address:' + R2T3.vault + ' tokenid:' + state[13] + ' storestate:false');
      [10, 11, 12, 13, 14].forEach(function (p) { steps.push('txnstate id:' + id + ' port:' + p + ' value:' + state[p]); });
      steps.push('txnstate id:' + id + ' port:15 value:' + remDec);
      steps.push('txnstate id:' + id + ' port:16 value:' + pick.length);
      steps.push('txnstate id:' + id + ' port:17 value:' + q.tokenamount);
      steps.push('txnbasics id:' + id);
      return steps.reduce(function (p, c) {
        return p.then(function () { return c.indexOf('txndelete') === 0 ? node.cmd(c, 'Stables card', 60000) : cmd(c); });
      }, Promise.resolve());
    }).then(function () { return cmd('txncheck id:' + id); }).then(function (check) {
      var v = (check && check.valid) || {};
      if (!(v.basic && v.signatures && v.mmrproofs && v.scripts)) throw new Error('payout not valid yet: ' + JSON.stringify(v));
      return cmd('txnpost id:' + id + ' txndelete:true');
    }).then(function (posted) {
      var txpowid = String((posted && (posted.txpowid || (posted.txpow && posted.txpow.txpowid))) || '');
      fbLog(tag + ' posted ' + txpowid + ' vault ' + pick.map(function (c) { return String(c.coinid).slice(0, 10) + '=' + c.tokenamount; }).join(','));
      var list = readExits(), x = list.filter(function (l) { return l.coinId === e.coinId; })[0];
      if (x) { x.fallbackPosted = Date.now(); x.fallbackTxpow = txpowid; writeExits(list); }
      return true;
    }, function (err) { fbLog(tag + ' not posted: ' + (err && err.message || err)); throw err; });
  }

  /* ---------- FAILED PAYMENTS (founder 2026-10-15/16, FAILED_PAYMENTS_SESSION_PROMPT.md) ----------
   * A card payment signed in a touch that broke off is Not confirmed: it never fires by itself and never blocks the next
   * payment. It settles in one of three ways: the next touch (Try again; the NFC ASK answers at once), the network two
   * minutes after it was signed (this section), or never, when the phones never meet again (money owed, shown as such).
   *
   * Over the network the payer asks the receiver "do you have payment X?" (X = the request's key hash). The receiver's
   * engine answers: HAVE, the acknowledgement naming the coin it credited (only the real receiver knows it), and the
   * payer's row reads Sent; or it refuses the request for good and signs a refusal with the request's one-use key. The
   * payer then posts the refund request to the Council exactly as a Remove posts its exit request, and the amount comes
   * back to its Savings.
   *
   * ONE TRANSPORT, TWO CALLS (founder 2026-10-16): ask(question) and answer(to, reply). Today the one-atom on-chain carrier
   * (D087) carries both, set by instant-balance.js (useTransport). No server, relay or Maxima. Keet can replace it later
   * behind the same two calls without touching the engine or this protocol. */
  var TOUCH_ENDED = 'Not paid. Hold the phones together again.';
  var QUESTION = 'Stables card question', ANSWER = 'Stables card answer';
  var transport = null;
  /** t = { ask(q): Promise, answer(to, reply): Promise, myAddress(): Promise<address> } */
  function useTransport(t) { transport = t && typeof t.ask === 'function' && typeof t.answer === 'function' ? t : null; settleWatch(); }
  function slog(m) { try { console.log('[route2] settle ' + m); } catch (_) { /* no console */ } }
  var HANDLED_KEY = 'stables.route2.questions.v1';
  function handled() { try { var v = JSON.parse(W.localStorage.getItem(HANDLED_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (_) { return {}; } }
  function markHandled(id) {
    var h = handled(); h[id] = Date.now();
    var keys = Object.keys(h).sort(function (a, b) { return h[a] - h[b]; });
    while (keys.length > 200) delete h[keys.shift()];
    try { W.localStorage.setItem(HANDLED_KEY, JSON.stringify(h)); } catch (_) { /* answered again at worst: the engine is idempotent */ }
  }
  /** This phone's Savings address, given to payees at first contact so a refusal refunds only this phone. Once per open. */
  var refundAddressSet = false;
  function ensureRefundAddress() {
    if (refundAddressSet || !transport || typeof transport.myAddress !== 'function') return Promise.resolve();
    return Promise.resolve(transport.myAddress()).then(function (a) {
      if (!/^0x[0-9a-fA-F]{64}$/.test(String(a || ''))) return;
      return callAsync('refundAddress', { address: String(a) }).then(function (r) { if (r && r.ok) refundAddressSet = true; });
    }, function () { /* next pass */ });
  }
  function fieldsOf(text) {
    var f = {};
    String(text || '').split('\n').forEach(function (l) { var i = l.indexOf(':'); if (i > 0) f[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
    return f;
  }
  /** Bytes as carrier ports from 2 on, 4,000 bytes each (an exit's port size), and back. */
  function b64ToHex(b) {
    var s = W.atob(String(b).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(b).length + 3) % 4));
    var h = ''; for (var i = 0; i < s.length; i++) h += (s.charCodeAt(i) < 16 ? '0' : '') + s.charCodeAt(i).toString(16);
    return h;
  }
  function hexToB64(h) {
    var s = ''; for (var i = 0; i + 1 < h.length; i += 2) s += String.fromCharCode(parseInt(h.substr(i, 2), 16));
    return W.btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function toPorts(b64) {
    var h = b64ToHex(b64).toUpperCase(), ports = {};
    for (var i = 0, p = 2; i < h.length; i += 8000, p++) ports[p] = '0x' + h.slice(i, i + 8000);
    return ports;
  }
  function fromPorts(ports, n) {
    var h = '';
    for (var p = 2; p < 2 + n; p++) { var v = String((ports || {})[p] || '').replace(/^\[|\]$/g, '').replace(/^0x/i, ''); if (!v) return ''; h += v; }
    return hexToB64(h);
  }
  /** Payer: ask about every payment due a question (signed over 2 minutes ago, no answer). */
  function askDue() {
    return callAsync('asks').then(function (r) {
      if (!r || !r.ok) return;
      if ((r.noAddress || []).length) slog((r.noAddress || []).length + ' unconfirmed payment(s) with no receiver address: they settle by touch only');
      return (r.due || []).reduce(function (p, q) {
        return p.then(function () {
          return Promise.resolve(transport.myAddress()).then(function (reply) {
            return transport.ask({ ref: q.ref, to: q.address, reply: String(reply || ''), payout: q.payout ? '0x' + q.payout : String(reply || ''), token: q.token });
          }).then(function () {
            slog('asked about ' + String(q.ref).slice(0, 8) + ' (' + q.amount + ' atoms) at ' + String(q.address).slice(0, 10));
            return callAsync('asked', { ref: q.ref });
          }, function (e) { slog('question about ' + String(q.ref).slice(0, 8) + ' not sent: ' + (e && e.message || e)); });
        });
      }, Promise.resolve());
    });
  }
  /**
   * A card message read from this phone's history (instant-balance.js takeCarrier hands every carrier here first).
   * Returns true when it was one: a question to answer (receiver) or an answer to take (payer).
   */
  function takeCardMessage(text, ports, txpowid) {
    var head = String(text || '').split('\n')[0];
    if (head !== QUESTION && head !== ANSWER) return false;
    if (!canHold()) return true;
    var f = fieldsOf(text), id = String(txpowid || '');
    if (id && handled()[id]) return true;
    if (!/^[0-9a-fA-F]{64}$/.test(String(f.Ref || ''))) { if (id) markHandled(id); return true; }
    if (head === QUESTION) {
      callAsync('answerAsk', { ref: f.Ref, payout: f.Payout || '' }).then(function (r) {
        if (!r || !r.ok) { slog('question ' + String(f.Ref).slice(0, 8) + ' not answered: ' + JSON.stringify(r)); return; }
        slog('asked about ' + String(f.Ref).slice(0, 8) + ': ' + r.kind);
        if (r.kind === 'unknown') { if (id) markHandled(id); return; }
        if (!r.answer || !/^0x[0-9a-fA-F]{64}$/.test(String(f.Reply || '')) || !transport) return;   // pending: asked again later
        if (r.kind === 'refused') forgetRequests();                        // the refused request is never shown again
        return transport.answer(f.Reply, { ref: f.Ref, kind: r.kind, answer: r.answer }).then(function () { if (id) markHandled(id); });
      }).catch(function (e) { slog('answer not sent: ' + (e && e.message || e)); });
      return true;
    }
    var ans = fromPorts(ports, Number(f.Parts) || 0);
    if (!ans) { if (id) markHandled(id); return true; }
    callAsync('takeAnswer', { ref: f.Ref, answer: ans }).then(function (r) {
      if (id) markHandled(id);
      slog('answer for ' + String(f.Ref).slice(0, 8) + ': ' + (r && r.ok ? 'settle ' + r.settle : JSON.stringify(r)));
      if (r && r.ok) { if (onChange) { try { onChange([]); } catch (_) { /* next refresh */ } } if (Number(r.settle) === 2) settleNow(); }
    });
    return true;
  }
  /** Payer: post the refund request for every refused payment (the Council's exit path, back to this phone's Savings). */
  var REFUNDS_KEY = 'stables.route2.refunds.v1';
  function readRefunds() { try { var v = JSON.parse(W.localStorage.getItem(REFUNDS_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } }
  function writeRefunds(l) { try { W.localStorage.setItem(REFUNDS_KEY, JSON.stringify(l.slice(-50))); } catch (_) { /* the engine keeps the state */ } }
  /*
   * PACKAGE CARRIERS (founder 2026-10-16: the permanent solution). A Remove's or a refund's package travels in carrier
   * transactions of its own (R2Exit.PACKAGE_ADDRESS, nothing ever spends them), and the request carries only its ports and
   * the parts' hashes (port 18). The Council rebuilds the package from the carriers; a payout spends the small request, so
   * it fits a block whatever the package's size (a 31,124-byte package inline made a 70,262-byte payout no block took).
   * Each send is tried again after 20 s, twice, if the node refuses it (its coins still settling from the previous one).
   */
  function postPackaged(node, r, token, amountDecimal) {
    function send(c) {
      return node.cmd(c, 'Stables card', 180000).then(function (res) {
        if (!res || res.status === false) throw new Error(String((res && res.error) || 'not sent'));
        return res;
      });
    }
    function sendAgain(c, n) {
      return send(c).catch(function (e) {
        if (n <= 0) throw e;
        return new Promise(function (ok) { setTimeout(ok, 20000); }).then(function () { return sendAgain(c, n - 1); });
      });
    }
    var tok = '0x' + token.toUpperCase(), carrierTxpows = [];
    // The node follows the request only if it knows the request contract: Minima Core never listed it, so the app could
    // neither follow the Remove nor post its fallback (Graphene, 2026-10-13). Registered first; a refusal changes nothing.
    var chain = node.cmd('newscript trackall:false script:"' + R2T3_SCRIPTS.request + '"', 'Stables card', 60000).then(function () { return null; }, function () { return null; });
    (r.parts || []).forEach(function (ports, i) {
      chain = chain.then(function () {
        var st = { 0: r.packageTag, 1: '0x' + String(r.packageHash).toUpperCase(), 2: String(i) };
        ports.forEach(function (c, j) { st[3 + j] = '0x' + String(c).toUpperCase(); });
        return sendAgain('send address:' + r.packageAddress + ' amount:' + R2T3.atom + ' tokenid:' + tok + ' state:' + JSON.stringify(st), 2).then(function (res) {
          var a = answerOf(res); var t = String(a.txpowid || (a.txpow && a.txpow.txpowid) || ''); if (t) carrierTxpows.push(t); return res;
        });
      });
    });
    return chain.then(function () {
      var state = { 0: R2T3.requestTag, 10: '0x' + String(r.packageHash).toUpperCase(), 11: '0x' + String(r.coinId).toUpperCase(), 12: amountDecimal,
        13: tok, 14: '0x' + hex(r.payout).toUpperCase(), 17: R2T3.atom, 18: '0x' + String(r.partHashes).toUpperCase() };
      try { console.log('[route2] package ' + r.packageBytes + ' bytes in ' + (r.parts || []).length + ' carrier(s), request for ' + String(r.coinId).slice(0, 8)); } catch (_) { /* no console */ }
      return sendAgain('send address:' + r.requestAddress + ' amount:' + R2T3.atom + ' tokenid:' + tok + ' state:' + JSON.stringify(state), 2)
        .then(function (res) { res.carrierTxpows = carrierTxpows; return res; });
    }).catch(function (e) { return { status: false, error: e && e.message || String(e), carrierTxpows: carrierTxpows }; });
  }
  var posting = {};
  function postRefund(ref, P) {
    var node = W.__STABLES_INSTANT_NODE__;
    if (posting[ref] || !node || typeof node.cmd !== 'function') return Promise.resolve(false);
    posting[ref] = true;
    var r = call('refund', { ref: ref });
    if (!r.ok) { posting[ref] = false; slog('refund ' + ref.slice(0, 8) + ' not packed: ' + r.code + ' ' + (r.detail || '')); return Promise.resolve(false); }
    var token = hex(r.token);
    return postPackaged(node, r, token, decimalOf(r.amount))
      .then(function (res) {
        posting[ref] = false;
        if (!res || res.status === false) { slog('refund ' + ref.slice(0, 8) + ' request not posted: ' + String((res && res.error) || 'no answer')); return false; }
        var resp = answerOf(res), txpowid = String(resp.txpowid || (resp.txpow && resp.txpow.txpowid) || '');
        call('refundProgress', { ref: ref, settle: 3, request: txpowid });
        var l = readRefunds(); l.push({ ref: ref, coinId: r.coinId, amount: String(r.amount), tokenId: token, payout: hex(r.payout), txpowid: txpowid, ts: Date.now(), carriers: true, carrierTxpows: res.carrierTxpows || [] }); writeRefunds(l);
        slog('refund ' + ref.slice(0, 8) + ' request posted ' + txpowid + ' (' + r.amount + ' atoms to ' + String(r.payout).slice(0, 10) + ')');
        return true;
      }, function (e) { posting[ref] = false; slog('refund ' + ref.slice(0, 8) + ' not posted: ' + (e && e.message || e)); return false; });
  }
  function decimalOf(atoms) {
    var a = BigInt(atoms), w = (a / BigInt(100000000)).toString(), f = (a % BigInt(100000000)).toString().padStart(8, '0').replace(/0+$/, '');
    return f ? w + '.' + f : w;
  }
  /** Where each posted refund stands: open (its request), paid into Savings, or rejected (a lone 1-atom refund after it). */
  function scanRefunds() {
    return callAsync('refundScan').then(function (r) {
      if (!r || !r.ok) return;
      (r.refunds || []).forEach(function (e) {
        var rec = readRefunds().filter(function (x) { return x.ref === e.ref; })[0];
        // Posted before 0.0.13.037 with its package inline and too large: that request can never be spent (its payout, the
        // fallback and even a rejection outsize a block), so the refund goes again at once, in carriers.
        var olds = readRefunds().filter(function (x) { return x.ref === e.ref; });
        if (e.open && olds.length && !olds.some(function (x) { return x.carriers || x.again; }) && Number(e.packageBytes) > Number(e.inlineMax || 25500)) {
          var la = readRefunds(); la.forEach(function (x) { if (x.ref === e.ref) x.again = Date.now(); }); writeRefunds(la);
          var ag0 = call('refundAgain', { ref: e.ref });
          slog('refund ' + e.ref.slice(0, 8) + ' (' + e.packageBytes + ' bytes inline, never payable) ' + (ag0 && ag0.ok ? 'goes again in carriers' : 'not posted again: ' + JSON.stringify(ag0)));
          return;
        }
        if (e.open && e.request && Number(e.depth) >= (Number(e.wait) || 20) + 1) postFallback(W.__STABLES_INSTANT_NODE__, e).catch(function () { /* next block */ });
        if (e.open && rec && Number(rec.block) !== Number(e.block)) { var l = readRefunds(); l.forEach(function (x) { if (x.ref === e.ref) x.block = Number(e.block); }); writeRefunds(l); }
        if (!e.open && !e.paid && !e.rejected && e.loneRefunds && rec && Number(rec.block) > 0) {
          var hit = e.loneRefunds.filter(function (f) { return Number(f.block) > Number(rec.block); })[0];
          if (hit) {
            call('refundProgress', { ref: e.ref, settle: 5 }); slog('refund ' + e.ref.slice(0, 8) + ' rejected by the Council at block ' + hit.block);
            // Once: an inline package too large to be paid out (before 0.0.13.037) goes again in carriers.
            if (!readRefunds().some(function (x) { return x.ref === e.ref && x.again; })) {
              var lr = readRefunds(); lr.forEach(function (x) { if (x.ref === e.ref) x.again = Date.now(); }); writeRefunds(lr);
              var ag = call('refundAgain', { ref: e.ref });
              slog('refund ' + e.ref.slice(0, 8) + (ag && ag.ok ? ' goes again in carriers' : ' not posted again: ' + JSON.stringify(ag)));
            }
          }
        }
      });
    });
  }
  /* KEEP BUNDLES SMALL (layer 1, founder 2026-10-11 and 2026-10-16). A coin whose history grew past the engine's limit
     goes to this phone's Savings by a Remove of exactly that coin and comes back by an Add of the same amount: the new
     coin's history is one anchor. Only when the phone is charging on an unmetered network, one coin at a time, never in a
     touch, and never a row or a question to the person (feedback_coin_refresh_opportunistic). */
  function refreshPass(P) {
    var node = W.__STABLES_INSTANT_NODE__;
    if (!node || typeof node.cmd !== 'function' || !P) return Promise.resolve();
    var open = readExits().filter(function (x) { return x.refresh && !x.reloaded; })[0];
    if (open) {
      if (open.status !== 'received') { watchLoads(); return Promise.resolve(); }   // its Remove is on its way
      var l = readExits(); l.forEach(function (x) { if (x.coinId === open.coinId) x.reloaded = Date.now(); }); writeExits(l);
      slog('refresh: ' + open.amount + ' atoms back in Savings, Add again');
      return load(BigInt(open.amount), open.tokenId, node, P, { refresh: true }).then(function (res) {
        if (res && res.status !== false) {
          var mine = readLoads().filter(function (y) { return y.refresh; }).slice(-1)[0];
          if (mine) { var lk = readExits(); lk.forEach(function (x) { if (x.coinId === open.coinId) x.reloadKey = mine.keyHash; }); writeExits(lk); }
        }
        if (!res || res.status === false) {
          var l2 = readExits(); l2.forEach(function (x) { if (x.coinId === open.coinId) delete x.reloaded; }); writeExits(l2);
          slog('refresh: Add not sent, next pass: ' + String((res && res.error) || 'no answer'));
        }
      }, function (e) {
        var l3 = readExits(); l3.forEach(function (x) { if (x.coinId === open.coinId) delete x.reloaded; }); writeExits(l3);
        slog('refresh: Add failed, next pass: ' + (e && e.message || e));
      });
    }
    if (readLoads().some(function (x) { return x.refresh && x.status !== 'credited'; })) return Promise.resolve();
    return callAsync('refreshDue').then(function (r) {
      if (!r || !r.ok || !(r.coins || []).length) return;
      var c = r.coins[0];
      // Card upkeep (founder 2026-10-16, a setting on the card's page): Automatic refreshes as soon as a coin needs it;
      // "Only while charging on Wi-Fi" waits for both; Off never refreshes.
      var PS = W.StablesPaymentSecurity, mode = PS && typeof PS.cardUpkeep === 'function' ? PS.cardUpkeep() : 'auto';
      var go = mode === 'auto' || (mode === 'charging' && r.charging && r.unmetered);
      slog('refresh due (' + (c.reason === 'deposit' ? 'moving off an R2T3 deposit' : 'history size') + '): coin ' + String(c.coinId).slice(0, 8) + ' history ' + c.bytes + ' bytes (limit ' + r.limit + '), depth ' + c.depth
        + ', upkeep ' + mode + (go ? ', refreshing' : (mode === 'off' ? ', off' : ', waits for charging on Wi-Fi')));
      if (!go) return;
      return remove(BigInt(c.amount), c.token, null, node, P, { coinId: c.coinId, refresh: true }).then(function (res) {
        slog('refresh: Remove ' + (res && res.status !== false ? 'posted' : 'not posted'));
      }, function (e) { slog('refresh: Remove refused: ' + (e && e.message || e)); });
    });
  }
  /** One pass: the refund address, due questions, refused payments to refund, posted refunds to follow. */
  var settling = false;
  function settleNow() {
    if (settling || !canHold() || !transport) return Promise.resolve();
    settling = true;
    var P = W.StablesInstantProtocol || null;
    sweepTechnicalRows();
    return ensureRefundAddress().then(askDue).then(function () { return callAsync('state'); }).then(function (st) {
      var outs = (st && st.ok && st.events || []).filter(function (e) { return e.kind === 'out'; });
      return outs.filter(function (e) { return Number(e.settle) === 2; }).reduce(function (p, e) { return p.then(function () { return postRefund(e.ref, P); }); }, Promise.resolve())
        .then(function () { if (outs.some(function (e) { return Number(e.settle) === 3; })) return scanRefunds(); })
        .then(function () { return refreshPass(P); });
    }).catch(function (e) { slog('pass failed: ' + (e && e.message || e)); }).then(function () { settling = false; });
  }
  /* Every 20 s while the app is visible (the battery law: stablesRepeatWhileVisible, never setInterval). The pass reads
     only the wallet until a question is due or a refund is on its way. */
  var settleTimer = null;
  function settleWatch() {
    if (settleTimer || !transport || !canHold() || typeof W.stablesRepeatWhileVisible !== 'function') return;
    settleTimer = W.stablesRepeatWhileVisible('route2-settle', settleNow, 20000);
  }

  /* Technical transactions (founder 2026-10-16): the card's one-atom housekeeping shows in Activity only in an advanced mode. */
  /* Rows an earlier build drew for that housekeeping (before 0.0.13.039) are removed once per app session: each outgoing
     one-atom node row's transaction is read from the node, and the row goes when an output paid the card's request or
     package address (its identity, never its label: law 13). Off while Technical transactions is on. */
  var technicalSwept = false;
  function sweepTechnicalRows() {
    if (technicalSwept || showTechnical() || typeof W.stablesGetUserActivityRows !== 'function' || typeof W.stablesForgetActivityRow !== 'function') return;
    var node = W.__STABLES_INSTANT_NODE__;
    if (!node || typeof node.cmd !== 'function') return;
    technicalSwept = true;
    var targets = [R2T3.request, '0xABA005476D2B3CD7F251B9783E64C124C9670BB358695F04D91B2057BB64CB49'].map(function (x) { return String(x).toLowerCase(); });
    var rows = (W.stablesGetUserActivityRows() || []).filter(function (r) {
      return r && r.explorerTxId && Number(r.amt) < 0 && Math.abs(Number(r.amt)) <= 0.00000001 + 1e-12;
    });
    rows.reduce(function (p, r) {
      return p.then(function () {
        return node.cmd('txpow txpowid:' + r.explorerTxId, 'Stables card', 60000).then(function (res) {
          var t = answerOf(res), outs = (t && t.body && t.body.txn && t.body.txn.outputs) || [];
          if (outs.some(function (o) { return targets.indexOf(String(o.address || '').toLowerCase()) >= 0; })) {
            W.stablesForgetActivityRow(r.id);
            try { console.log('[route2] technical row removed: ' + r.id); } catch (_) { /* no console */ }
          }
        }, function () { /* next session */ });
      });
    }, Promise.resolve());
  }
  var TECHNICAL_KEY = 'stables.showTechnical.v1';
  function showTechnical() { try { return W.localStorage.getItem(TECHNICAL_KEY) === '1'; } catch (_) { return false; } }
  function setShowTechnical(on) { try { W.localStorage.setItem(TECHNICAL_KEY, on ? '1' : '0'); } catch (_) { /* the default: hidden */ } }

  W.StablesRoute2 = { wrap: wrap, useTransport: useTransport, refreshEntries: refreshEntries, showTechnical: showTechnical, setShowTechnical: setShowTechnical,
    PACKAGE_ADDRESS: '0xABA005476D2B3CD7F251B9783E64C124C9670BB358695F04D91B2057BB64CB49', takeCardMessage: takeCardMessage, settleNow: settleNow,
    freshRequest: forgetRequests, QUESTION: QUESTION, ANSWER: ANSWER, toPorts: toPorts, TOUCH_ENDED: TOUCH_ENDED, canHold: canHold, isCoinPayment: isCoinPayment, scanLoads: scanLoads, load: load, loadEntries: loadEntries,
    remove: remove, exitEntries: exitEntries, strayExitRows: strayExitRows, scanExits: scanExits, postFallback: postFallback, VAULT: VAULT, R2T3: R2T3, R2T5: R2T5, HEAD: HEAD,
    needsFingerprint: needsFingerprint, fingerprintReason: fingerprintReason, refill: refill, unprotect: unprotect, REFILL_PROMPT: REFILL_PROMPT,
    /** Accept one payment above this card's own receiving limit (this token, up to these atoms, for 2 minutes). */
    acceptOnce: function (tokenId, atoms) { return callAsync('accept', { token: hex(tokenId), amount: String(atoms) }); },
    payerLimitMessage: payerLimitMessage, aboveLimitMessage: aboveLimitMessage,
    fingerprint: fingerprint, fingerprintFresh: fingerprintFresh, security: security, syncSettings: syncSettings,
    limitMessage: limitMessage, AUTH_AGAIN: AUTH_AGAIN };
})(typeof window !== 'undefined' ? window : this);
