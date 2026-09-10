/* Ordinary token-payment identity. No covenant inputs or signing authority live here. */
(function (W) {
  'use strict';
  var PORT = 255;
  var ID = /^0x53544201[0-9a-f]{32}$/i;
  function decimal(value) {
    var m = String(value == null ? '' : value).trim().match(/^(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
    if (!m) return null;
    var exponent = Number(m[3] || 0), digits = m[1] + (m[2] || ''), point = m[1].length + exponent;
    if (!Number.isInteger(exponent) || Math.abs(exponent) > 44 || digits.length > 128) return null;
    if (point <= 0) digits = '0'.repeat(1 - point) + digits, point = 1;
    if (point >= digits.length) digits += '0'.repeat(point - digits.length);
    var whole = digits.slice(0, point).replace(/^0+(?=\d)/, '') || '0';
    var fraction = digits.slice(point).replace(/0+$/, '');
    if (fraction.length > 44 || whole.length > 128) return null;
    return whole + (fraction ? '.' + fraction : '');
  }
  function atoms(value) {
    var s = decimal(value);
    if (s === null) return null;
    var p = s.split('.');
    return BigInt(p[0] + (p[1] || '').padEnd(44, '0'));
  }
  function tokenId(ccy) {
    var r = (W.STABLES_CONFIG || {}).TEST_TOKEN_REGISTRY || {};
    return String(/^(winiwa|winima)$/i.test(ccy) ? r.winiwa_token_id : ccy === 'xWiniwa' ? r.xwiniwa_token_id : ccy === 'USDw' ? r.usdw_token_id : ccy === 'MINIMA' ? '0x00' : '').toLowerCase();
  }
  function create(amount, ccy, address, reference, canonicalAddress, blocks) {
    var value = decimal(amount), token = tokenId(ccy);
    if (!value || atoms(value) <= 0n || !/^0x[0-9a-f]+$/i.test(token)) throw Error('Enter a supported asset and an exact positive amount.');
    if (!W.crypto || !W.crypto.getRandomValues) throw Error('Secure payment identifiers are unavailable.');
    var bytes = new Uint8Array(16); W.crypto.getRandomValues(bytes);
    return {id:'0x53544201' + Array.from(bytes).map(function (b) { return b.toString(16).padStart(2,'0'); }).join(''),
      amount:value, ccy:ccy, tokenId:token, address:String(address), canonicalAddress:String(canonicalAddress || address),
      reference:String(reference || ''), createdAt:Date.now(), expiresAt:Date.now()+15*60*1000,
      blocks:Math.max(1, Math.min(30, Number(blocks) || 3))};
  }
  function parse(text) {
    if (!/(?:^|\n)Payment ID:/i.test(text)) return null;
    function field(label) { var m = String(text).match(new RegExp('(?:^|\\n)' + label + ':\\s*([^\\r\\n]+)', 'i')); return m && m[1].trim(); }
    var invoice = {id:field('Payment ID'), amount:decimal(field('Amount')), tokenId:field('Token ID'), address:field('Address'), expiresAt:Number(field('Expires'))};
    if (!ID.test(invoice.id || '') || !invoice.amount || atoms(invoice.amount) <= 0n || !/^0x[0-9a-f]+$/i.test(invoice.tokenId || '')
      || !/^(?:0x[0-9a-f]{40,128}|Mx[a-z0-9]{20,})$/i.test(invoice.address || '') || !Number.isSafeInteger(invoice.expiresAt)) throw Error('Invalid payment request.');
    invoice.tokenId = invoice.tokenId.toLowerCase();
    if (Date.now() > invoice.expiresAt) throw Error('This payment request has expired. Ask for a new QR.');
    return invoice;
  }
  function sendState(invoice, outputs, token) {
    if (!invoice) return '';
    if (!ID.test(invoice.id) || Date.now() > invoice.expiresAt) throw Error('This payment request has expired or is invalid.');
    if (outputs.length !== 1 || String(token).toLowerCase() !== invoice.tokenId
      || outputs[0].addr !== invoice.address || decimal(outputs[0].amt) !== invoice.amount) throw Error('The payment no longer matches the scanned invoice. Scan it again.');
    return ' state:' + JSON.stringify({'255':invoice.id});
  }
  function match(tx, invoice, now) {
    if (!tx || !/^0x[0-9a-f]{64}$/i.test(tx.txpowid || '') || !invoice || !ID.test(invoice.id)) return null;
    if (now > invoice.expiresAt) return null;
    var body = tx.body && (tx.body.txn || tx.body.transaction), time = Number(tx.header && tx.header.timemilli);
    if (!body || !Number.isFinite(time) || time <= 0 || time > now + 30000 || time < invoice.createdAt - 30000) return null;
    var states = (body.state || []).filter(function (s) { return Number(s.port) === PORT; });
    if (states.length !== 1 || String(states[0].data).toLowerCase() !== invoice.id.toLowerCase()) return null;
    var sum = 0n, count = 0;
    for (var coin of (body.outputs || [])) {
      if (String(coin.tokenid).toLowerCase() !== invoice.tokenId) continue;
      var addresses = [coin.address, coin.mxaddress, coin.miniaddress].filter(Boolean);
      if (!addresses.some(function (a) { return String(a).toLowerCase() === invoice.canonicalAddress.toLowerCase() || String(a) === invoice.address; })) continue;
      var quantity = atoms(coin.tokenamount == null ? coin.amount : coin.tokenamount);
      if (quantity === null) return null;
      sum += quantity; count++;
    }
    if (!count || sum !== atoms(invoice.amount)) return null;
    return {ok:true, txpowid:tx.txpowid.toLowerCase(), amt:invoice.amount, ccy:invoice.ccy,
      address:invoice.address, invoiceId:invoice.id, source:'invoice-txpow', ts:time, status:'Detected'};
  }
  // Local, bounded diagnostics only. Never retain commands, addresses, amounts or credentials.
  var timingRows = [], timingSequence = 0;
  function startTiming() {
    var now = function () { return W.performance && W.performance.now ? W.performance.now() : Date.now(); };
    var start = now(), row = {id: ++timingSequence, phases: []};
    timingRows.push(row);
    if (timingRows.length > 32) timingRows.shift();
    return function (phase) {
      if (['prepared', 'node-request', 'node-response', 'transport-error'].indexOf(phase) < 0 || row.phases.length >= 8) return;
      row.phases.push({phase: phase, elapsedMs: Math.max(0, Math.round(now() - start))});
    };
  }
  function readTimings() { return JSON.parse(JSON.stringify(timingRows)); }
  W.StablesRetail = {decimal:decimal, atoms:atoms, tokenId:tokenId, create:create, parse:parse, sendState:sendState, match:match,
    startTiming:startTiming, readTimings:readTimings};
})(window);
