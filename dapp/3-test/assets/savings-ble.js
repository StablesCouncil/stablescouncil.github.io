/*
 * Stables Savings payments by Bluetooth (founder 2026-10-04, build 0.0.12.031, Machinery D094): "QR plus Bluetooth for
 * payments from savings ... notice plus the relay for when the payer is offline ... could it work by linking in the
 * receiver too?". A Savings payment always ends on the Minima chain; Bluetooth adds two things between two phones that
 * are side by side (the payer just scanned the receiver's Savings code):
 *
 *   NOTICE  The payer's node accepted the payment: the payer's phone tells the receiver's phone at once, which shows it
 *           as "Incoming" in Recent activity (and flashes it) before its own node has seen it. The activity mirror
 *           adopts that row when the real transaction arrives (same currency and amount, recent: one row, law 2).
 *   RELAY   The payer's phone has no internet: it builds and signs the payment itself (the txn commands), hands the
 *           signed transaction over by Bluetooth, and the receiver's phone puts it on the network (txnimport, txncheck,
 *           txnpost). The payer keeps it too and posts it when it is back online; whichever phone is online first sends
 *           it. Proven on mainnet nodes before building: SAVINGS-RELAY-01-R1 (signed on 9101, posted by 9201, mined).
 *
 * Until the payment is in a block the payer could still spend the same money elsewhere, so the receiver's row says
 * "Incoming" and never "Received" before the chain does.
 *
 * The receiver is found without changing any QR code: its phone advertises a link derived from its own Savings address
 * (the first 8 bytes of SHA-256 of the address text), and the payer derives the same link from the address it scanned.
 * Bluetooth moves bytes through the native bridge (InstantBle on the standalone Android app; window.stablesBleEvent,
 * shared with the Stables card code, which hands Savings messages here). Elsewhere (web, MiniDapp, Core companion)
 * nothing here runs and Savings payments work exactly as before.
 */
(function () {
  'use strict';
  var W = window, D = document;
  var MSG = 'stables-savings';
  var ble = { listening: '', asked: false, pending: {} };

  function log(m) { try { console.log('[savings-ble] ' + m); } catch (_) { /* ignore */ } }
  function bridge() { var b = W.StablesNative; return b && typeof b.bleState === 'function' && typeof b.blePay === 'function' ? b : null; }
  function bleNow() { var b = bridge(); if (!b) return 'absent'; try { return String(b.bleState() || 'absent'); } catch (_) { return 'absent'; } }
  function node() { return W.__STABLES_INSTANT_NODE__ || null; }
  function isOpen(id) { var e = D.getElementById(id); return !!(e && e.classList.contains('open')); }
  function onSavings(id) { return isOpen(id) && typeof W.stablesPaymentAccountView === 'function' && W.stablesPaymentAccountView(id) !== 'instant'; }

  /** The Bluetooth link of a Savings address: 8 bytes of SHA-256 of its text, lower case, hex. */
  async function linkOf(address) {
    var a = String(address || '').trim().toLowerCase();
    if (!a || !W.crypto || !W.crypto.subtle) return '';
    var h = new Uint8Array(await W.crypto.subtle.digest('SHA-256', new TextEncoder().encode(a)));
    var out = '';
    for (var i = 0; i < 8; i++) out += (h[i] < 16 ? '0' : '') + h[i].toString(16);
    return out;
  }
  function shownAddress() {
    var e = D.getElementById('recvAddr');
    return e ? String(e.getAttribute('data-full-address') || e.textContent || '').trim() : '';
  }

  /* ---------------- the receiver: listens while Savings Receive shows its address ---------------- */
  function syncListening() {
    var b = bridge();
    if (!b) return;
    var want = onSavings('recvModal') && bleNow() === 'on' ? shownAddress() : '';
    (want ? linkOf(want) : Promise.resolve('')).then(function (link) {
      if (link === ble.listening) return;
      // The Stables card's Receive owns the radio while it is open; Savings only ever sets or clears its own link.
      if (!link && !ble.listening) return;
      ble.listening = link;
      try { b.bleReceiverSet(link); } catch (_) { /* ignore */ }
      log(link ? 'listening for Savings payments' : 'stopped listening');
    });
  }

  /** A message from the payer's phone (the native side hands every Bluetooth payment to the page). */
  function onPayment(ev) {
    var b = bridge();
    var id = String(ev.id || '');
    var m = null;
    try { m = JSON.parse(String(ev.text || '')); } catch (_) { m = null; }
    var answer = function (s) { if (b) { try { b.bleReceiverResult(id, s); } catch (_) { /* ignore */ } } };
    if (!m || m.stables !== MSG) { answer('refused:malformed'); return; }
    var amt = Math.abs(Number(m.amount) || 0);
    var ccy = String(m.ccy || '');
    if (!(amt > 0) || !ccy) { answer('refused:malformed'); return; }
    if (m.kind === 'notice') {
      showIncoming(amt, ccy, 'Sent by the payer’s phone; waiting for the Minima network.');
      answer('noticed');
      return;
    }
    if (m.kind === 'relay' && /^0x[0-9a-fA-F]+$/.test(String(m.hex || ''))) {
      showIncoming(amt, ccy, 'The payer’s phone is offline: this phone is putting it on the Minima network.');
      relayPost(String(m.hex)).then(function () { answer('posted'); }, function (e) {
        log('relay post refused: ' + (e && e.message));
        answer('refused:' + String((e && e.message) || 'refused').slice(0, 60));
      });
      return;
    }
    answer('refused:unknown');
  }
  /** The row shown at once: "Incoming", not yet on the chain; the mirror adopts it when the transaction arrives. */
  function showIncoming(amt, ccy, note) {
    var id = 'BLE-IN-' + Date.now().toString(36);
    if (typeof W.stablesUpsertUserActivityRows === 'function') {
      W.stablesUpsertUserActivityRows([{
        id: id, dir: 'in', icon: '↙', title: 'Received', counterparty: 'Nearby phone (Bluetooth)', category: ccy,
        amt: amt, ccy: ccy, status: 'Incoming', ts: Date.now(), localOrigin: true, minimaOnChain: false,
        pendingIncoming: false, note: note
      }]);
    }
    try { if (typeof W.renderWalletRecentActivity === 'function') W.renderWalletRecentActivity(); } catch (_) { /* ignore */ }
    try { if (typeof W.stablesFlashArrivedRow === 'function') W.stablesFlashArrivedRow(id); } catch (_) { /* ignore */ }
    try { if (typeof W.stablesTxMirrorKick === 'function') W.stablesTxMirrorKick(); } catch (_) { /* ignore */ }
  }
  /** Put a payment signed on the payer's phone on the network from this phone. */
  async function relayPost(hex) {
    var n = node();
    if (!n || typeof n.cmd !== 'function') throw new Error('no-node');
    var id = 'savings_relay_' + Date.now().toString(36);
    // A dropped connection to the node must not lose the payment: the import is tried again (seen in the lab: one
    // "read ECONNRESET" on the first import, then a clean post, SAVINGS-RELAY-01-R1).
    for (var t = 1; ; t++) {
      try { await n.cmd('txnimport id:' + id + ' data:' + hex, 'taking a payment from a nearby phone', 60000); break; }
      catch (e) {
        if (t >= 3 || !/ECONNRESET|timed out|timeout|abort|failed to fetch|network|not returning/i.test(String((e && e.message) || e))) throw e;
        await new Promise(function (r) { setTimeout(r, 1500 * t); });
      }
    }
    try {
      var c = await n.cmd('txncheck id:' + id, 'checking a payment from a nearby phone', 60000);
      var v = (c && c.valid) || {};
      var sig = Array.isArray(v.signatures) ? v.signatures.every(function (s) { return s && s.valid === true; }) : v.signatures;
      if (!(v.basic === true && sig === true && v.mmrproofs === true && v.scripts === true)) throw new Error('not-valid');
      await n.cmd('txnpost id:' + id + ' txndelete:true', 'sending a payment from a nearby phone', 120000);
      log('relayed a payment to the network');
      try { if (typeof W.stablesTxMirrorKick === 'function') W.stablesTxMirrorKick(); } catch (_) { /* ignore */ }
    } catch (e) {
      try { await n.cmd('txndelete id:' + id, 'clearing', 15000); } catch (_) { /* gone */ }
      throw e;
    }
  }

  /* ---------------- the payer ---------------- */
  /** After the payer's node accepted a single-recipient Savings payment: tell the receiver's phone at once. */
  function notice(p) {
    var b = bridge();
    if (!b || bleNow() !== 'on' || !p || !p.to) return;
    linkOf(p.to).then(function (link) {
      if (!link) return;
      var ref = 'savings-' + Date.now().toString(36);
      ble.pending[ref] = { kind: 'notice' };
      b.blePay(link, ref, JSON.stringify({ stables: MSG, kind: 'notice', amount: Number(p.amount) || 0, ccy: String(p.ccy || ''), tokenId: String(p.tokenId || ''), ts: Date.now() }));
    });
  }
  /** True when this phone should relay instead of sending: no internet, Bluetooth on, a node to sign with. */
  function shouldRelay() {
    return bleNow() === 'on' && W.navigator && W.navigator.onLine === false && !!node();
  }
  /**
   * The payer has no internet: build and sign the payment here (the txn commands), keep it, hand it to the receiver's
   * phone by Bluetooth, and post it ourselves when back online (whichever phone is online first sends it).
   *   p {to, amount (decimal string), tokenId, ccy}; resolves {txnid} once handed to the radio, rejects when it cannot
   *   even be built (the caller then shows why, nothing is spent).
   */
  async function relaySend(p) {
    var n = node();
    var b = bridge();
    if (!n || !b) throw new Error('Bluetooth relay is not available on this device.');
    var id = 'savings_out_' + Date.now().toString(36);
    var coins = await n.gather(p.tokenId, String(p.amount), p.ccy || 'Savings', 0, 2);
    if (!coins || !coins.length) throw new Error('Not enough ' + (p.ccy || '') + ' in Savings.');
    var total = BigInt(0), scale = BigInt(100000000);
    var toAtoms = function (v) { var s = String(v).replace(/,/g, ''); var m = s.match(/^(\d+)(?:\.(\d{0,8}))?/); return m ? BigInt(m[1]) * scale + BigInt(((m[2] || '') + '00000000').slice(0, 8)) : BigInt(0); };
    var dec = function (a) { var w = (a / scale).toString(), f = (a % scale).toString().padStart(8, '0').replace(/0+$/, ''); return w + (f ? '.' + f : ''); };
    coins.forEach(function (c) { total += toAtoms(c.tokenamount != null ? c.tokenamount : c.amount); });
    var amount = toAtoms(p.amount);
    var change = total - amount;
    if (change < BigInt(0)) throw new Error('Not enough ' + (p.ccy || '') + ' in Savings.');
    var w = await n.wallet();
    var me = w && w.address;
    var cmds = ['txncreate id:' + id];
    coins.forEach(function (c) { cmds.push('txninput id:' + id + ' coinid:' + c.coinid); });
    cmds.push('txnoutput id:' + id + ' amount:' + dec(amount) + ' address:' + p.to + ' tokenid:' + p.tokenId);
    if (change > BigInt(0)) cmds.push('txnoutput id:' + id + ' amount:' + dec(change) + ' address:' + me + ' tokenid:' + p.tokenId);
    for (var i = 0; i < cmds.length; i++) await n.cmd(cmds[i], 'building the payment', 60000);
    await n.cmd('txnbasics id:' + id, 'adding the coin proofs', 120000);     // the MMR proofs and scripts, before signing
    await n.cmd('txnsign id:' + id + ' publickey:auto', 'signing the payment', 240000);
    var c = await n.cmd('txncheck id:' + id, 'checking the payment', 90000);
    var v = (c && c.valid) || {};
    if (!(v.basic === true && v.scripts === true && v.mmrproofs === true)) {
      try { await n.cmd('txndelete id:' + id, 'clearing', 15000); } catch (_) { /* gone */ }
      throw new Error('This payment could not be built offline (its proofs are too old). Connect to the internet and send it.');
    }
    var exp = await n.cmd('txnexport id:' + id, 'preparing the payment for the other phone', 60000);
    var hex = typeof exp === 'string' ? exp : String((exp && (exp.data || exp.txn)) || '');
    if (!/^0x[0-9a-fA-F]+$/.test(hex)) throw new Error('The payment could not be prepared for the other phone.');
    // Kept for posting from here once online (the receiver's phone may post it first; then ours is refused, harmlessly).
    keepForLater(id);
    var link = await linkOf(p.to);
    var ref = 'savings-' + id;
    ble.pending[ref] = { kind: 'relay', id: id };
    b.blePay(link, ref, JSON.stringify({ stables: MSG, kind: 'relay', amount: Number(p.amount) || 0, ccy: String(p.ccy || ''), tokenId: String(p.tokenId || ''), hex: hex, ts: Date.now() }));
    log('payment signed offline and handed to the receiver’s phone');
    return { txnid: id };
  }
  var LATER_KEY = 'stables_savings_relay_pending_v1';
  function laterList() { try { return JSON.parse(localStorage.getItem(LATER_KEY) || '[]') || []; } catch (_) { return []; } }
  function keepForLater(id) { try { var l = laterList(); l.push({ id: id, at: Date.now() }); localStorage.setItem(LATER_KEY, JSON.stringify(l.slice(-20))); } catch (_) { /* ignore */ } }
  function markHeld(id, patch) { try { localStorage.setItem(LATER_KEY, JSON.stringify(laterList().map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; }))); } catch (_) { /* ignore */ } }
  /* When this phone may post its own copy: at once when Bluetooth never reached the other phone (it does not have it);
     otherwise after 5 minutes, by when a copy the other phone posted is in a block and its coins read as spent (a copy
     posted while the other one is still in the mempool would be a double; seen in SAVINGS-RELAY-01-R1). */
  var HOLD_MS = 5 * 60 * 1000;
  /** Back online: post every payment signed offline that is still held here. */
  async function postHeld() {
    var n = node();
    if (!n) return;
    var l = laterList();
    if (!l.length) return;
    var keep = [];
    for (var i = 0; i < l.length; i++) {
      if (!l[i].bleFailed && Date.now() - Number(l[i].at || 0) < HOLD_MS) { keep.push(l[i]); continue; }
      try {
        // Sent already by the receiver's phone? Then its coins are spent: delete our copy, never post it again (the
        // node would accept a second post and leave a dead transaction; seen in SAVINGS-RELAY-01-R1).
        var held = await n.cmd('txnlist id:' + l[i].id, 'reading a payment signed offline', 30000);
        var txn = held && (held.transaction || (Array.isArray(held) && held[0] && held[0].transaction));
        var ins = (txn && txn.inputs) || [];
        var spent = false;
        for (var k = 0; k < ins.length && !spent; k++) {
          var found = typeof n.coinsById === 'function' ? await n.coinsById(ins[k].coinid) : [];
          var coin = (found || []).find(function (x) { return x && String(x.coinid).toLowerCase() === String(ins[k].coinid).toLowerCase(); });
          if (!coin || coin.spent === true || coin.spent === 'true') spent = true;
        }
        if (!ins.length || spent) {
          try { await n.cmd('txndelete id:' + l[i].id, 'clearing a payment already sent', 15000); } catch (_) { /* gone */ }
          log('a payment signed offline was already sent (by the other phone); our copy is deleted');
          continue;
        }
        await n.cmd('txnpost id:' + l[i].id + ' txndelete:true', 'sending a payment signed offline', 120000);
        log('posted a payment signed offline');
      } catch (e) {
        var msg = String((e && e.message) || e || '');
        // Already sent by the receiver's phone (its coins are spent) or no longer held: done either way.
        if (/timeout|network|failed to fetch|abort/i.test(msg) && Date.now() - l[i].at < 24 * 3600 * 1000) keep.push(l[i]);
      }
    }
    try { localStorage.setItem(LATER_KEY, JSON.stringify(keep)); } catch (_) { /* ignore */ }
    try { if (typeof W.stablesTxMirrorKick === 'function') W.stablesTxMirrorKick(); } catch (_) { /* ignore */ }
  }
  function onDelivery(ev) {
    var ref = String(ev.ref || ''), st = String(ev.status || '');
    var p = ble.pending[ref];
    delete ble.pending[ref];
    log('bluetooth ' + (p ? p.kind : '?') + ': ' + st + ' in ' + ev.ms + ' ms');
    if (p && p.kind === 'relay' && (st.indexOf('failed:') === 0 || st.indexOf('refused:') === 0)) {
      // Bluetooth never reached the other phone, or it could not post (no internet there either): it does not hold the
      // payment; ours goes as soon as this phone is online.
      // Bluetooth never reached the other phone: it does not have the payment; post ours as soon as we are online.
      markHeld(p.id, { bleFailed: true });
      if (W.navigator && W.navigator.onLine) postHeld().catch(function () { /* next time */ });
    }
    if (p && p.kind === 'relay' && st === 'posted') {
      // The receiver's phone sent it: ours would only be refused as a double; forget it.
      try { localStorage.setItem(LATER_KEY, JSON.stringify(laterList().filter(function (x) { return x.id !== p.id; }))); } catch (_) { /* ignore */ }
    }
  }

  /* ---------------- "Turn on Bluetooth": optional, Savings Send and Receive only, once per session ---------------- */
  function askBle() {
    if (ble.asked || typeof W.stablesConfirm !== 'function') return;
    var st = bleNow();
    if (st !== 'off' && st !== 'no-permission') return;
    ble.asked = true;
    W.stablesConfirm({
      title: 'Turn on Bluetooth',
      message: 'With Bluetooth on, the other phone learns of a payment at once, and a payment can go even when one of the two phones has no internet. Optional.',
      confirmText: 'Turn on Bluetooth'
    }).then(function (ok) { var b = bridge(); if (ok && b && typeof b.bleEnable === 'function') { try { b.bleEnable(); } catch (_) { /* ignore */ } } });
  }

  /* Watch the two sheets (no change to their own code): listen while Savings Receive is open, ask once on Savings. */
  function watch() {
    ['recvModal', 'sendModal'].forEach(function (id) {
      var e = D.getElementById(id);
      if (!e || typeof MutationObserver !== 'function') return;
      new MutationObserver(function () {
        if (onSavings(id)) askBle();
        syncListening();
      }).observe(e, { attributes: true, attributeFilter: ['class', 'data-payment-account'] });
    });
    var addr = D.getElementById('recvAddr');
    if (addr && typeof MutationObserver === 'function') new MutationObserver(syncListening).observe(addr, { attributes: true, childList: true, characterData: true, subtree: true });
    W.addEventListener('online', function () { postHeld().catch(function () { /* next time */ }); });
    if (W.navigator && W.navigator.onLine) setTimeout(function () { postHeld().catch(function () { /* next time */ }); }, 20000);
  }
  if (bridge()) { if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', watch); else watch(); }

  W.StablesSavingsBle = {
    MSG: MSG, linkOf: linkOf, notice: notice, shouldRelay: shouldRelay, relaySend: relaySend, postHeld: postHeld,
    onPayment: onPayment, onDelivery: onDelivery, onState: function () { syncListening(); }, relayPost: relayPost
  };
})();
