/*
 * STABLES ON-CHAIN CHAT — D1 web transport (CHAT_ONCHAIN_PLAN.md, founder-approved 2026-08-10).
 *
 * minimaMail pattern on our own reclaimable covenant: one message = one Winiwa dust coin at the
 * shared chat address, sealed blob (StablesSealedBox, libsodium crypto_box_seal compatible) in
 * state port 99, sender node-key in port 90 (the covenant's reclaim identity). Inbox = trial-
 * decrypt the coins at the address. Identity derives from the node seed PER SESSION over the
 * app's own node connection — the node is the keychain; nothing persists (founder 2026-08-10).
 * Auto-reclaim of own aged messages is DEFAULT behaviour, not a setting: a polite client cleans
 * up after itself so the chain forgets (reclaim after N blocks; anyone-sweep after M).
 *
 * Test-channel lab constants (window sizes are baked into the covenant address; production
 * publish redeploys with production windows):
 *   address 0xF398EAD1CC59F94B3737057582F31969A2819D7266A0BD3FEE4E25D8153AEE39
 *   script  IF @COINAGE GT 20 THEN RETURN TRUE ENDIF
 *           IF @COINAGE GT 5 THEN RETURN SIGNEDBY(PREVSTATE(90)) ENDIF RETURN FALSE
 *
 * OFF by default behind the Settings toggle; every surface refuses honestly until enabled.
 */
(function () {
  'use strict';

  var CHAT_ADDRESS = '0xF398EAD1CC59F94B3737057582F31969A2819D7266A0BD3FEE4E25D8153AEE39';
  var RECLAIM_AFTER_BLOCKS = 5;
  var DUST = '0.00000001';
  var MAX_BLOB_HEX_CHARS = 98000; /* 49,000 bytes as 0x-hex — the one-coin bound (minimaMail law) */
  var SCAN_EVERY_MS = 15000;
  var ENABLE_KEY = 'stables_chat_onchain_enabled_v1';
  var STORE_KEY = 'stables_chat_onchain_store_v1';

  var identity = null;      /* { publicKey, secretKey, publicHex } — memory only, per session */
  var myNodeKey = '';       /* node signing pubkey, the covenant reclaim identity */
  var seenCoins = {};       /* coinid -> true, trial-decrypted this session */
  var scanTimer = null;

  function nodeCmd(cmd) {
    return new Promise(function (resolve) {
      if (typeof window.stablesNodeCmd !== 'function') { resolve(null); return; }
      try { window.stablesNodeCmd(cmd, resolve); } catch (_) { resolve(null); }
    });
  }
  function enabled() { try { return localStorage.getItem(ENABLE_KEY) === '1'; } catch (_) { return false; } }
  function utf8(s) { return new TextEncoder().encode(s); }
  function toHex(u8) {
    var out = '0x';
    for (var i = 0; i < u8.length; i += 1) out += (u8[i] < 16 ? '0' : '') + u8[i].toString(16);
    return out.toUpperCase();
  }
  function fromHex(hex) {
    var h = String(hex || '').replace(/^0x/i, '');
    if (!h || h.length % 2) return null;
    var out = new Uint8Array(h.length / 2);
    for (var i = 0; i < out.length; i += 1) out[i] = parseInt(h.substr(i * 2, 2), 16);
    return out;
  }

  /* ---- identity: the node is the keychain; a rotation index lets you change your id ---- */
  var ROT_KEY = 'stables_chat_rotation_v1';
  function getRot() { try { return parseInt(localStorage.getItem(ROT_KEY) || '0', 10) || 0; } catch (_) { return 0; } }
  async function ensureIdentity() {
    if (identity) return identity;
    var SB = window.StablesSealedBox;
    if (!SB) return null;
    var r = await nodeCmd('vault action:seed');
    var resp = (r && r.response) || {};
    var seed = resp.phrase || resp.seed || '';
    if (!seed) return null;
    /* The id is still seed-derived (so it survives a reinstall from the same seed), but a
       rotation index folded into the derivation lets a person change their id at will. */
    var sk = SB.hash512(utf8('stables-chat-v1|' + seed + '|' + getRot())).slice(0, 32);
    var kp = SB.keyPairFromSecretKey(sk);
    identity = { publicKey: kp.publicKey, secretKey: kp.secretKey, publicHex: toHex(kp.publicKey), mx: '' };
    var g = await nodeCmd('getaddress');
    var gr = (g && g.response) || {};
    myNodeKey = gr.publickey || '';
    identity.mx = gr.miniaddress || '';
    return identity;
  }
  /* Your shareable address bundles your Minima receiving address with your encryption key
     (minimaMail model). Your MINIMA ADDRESS COMES FIRST (founder 2026-08-10: it should read as
     an Mx address, not a hex key), with the sealed-box key appended so a message can be encrypted
     to you. Format: <Mx address>~<0x sealed-box key>. */
  function contactCode(id) { return id.mx ? (id.mx + '~' + id.publicHex) : id.publicHex; }
  function parseContactCode(input) {
    /* Classify each part by shape, so either order — and a bare address or bare key — parses. */
    var parts = String(input || '').trim().split('~');
    var cpk = '', mx = '';
    for (var i = 0; i < parts.length; i += 1) {
      var part = parts[i].trim();
      if (/^0x[0-9A-Fa-f]{64}$/.test(part)) cpk = normId(part);
      else if (/^Mx/i.test(part)) mx = part;
    }
    return { cpk: isChatId(cpk) ? cpk : '', mx: mx };
  }
  function rotateIdentity() {
    try { localStorage.setItem(ROT_KEY, String(getRot() + 1)); } catch (_) { /* ignore */ }
    identity = null; /* re-derived on next use */
    _announced = false; /* the new key must announce itself */
  }

  /* ---- KEY DIRECTORY (founder 2026-08-10: a plain Mx address must be enough to start a chat).
     A message has to be encrypted to the recipient's key, and an Mx address does not contain one.
     So each app publishes ONE tiny directory coin at the same chat covenant announcing the pair
     (my Minima address -> my chat key), in the clear, in coin state: port 90 = node key (so the
     same reclaim rule applies), port 98 = "Mx~0xkey". Looking someone up is then a scan of the
     address we already scan. Nothing is secret here: an address and a public key, exactly what a
     person hands out anyway. Republished when the key rotates or the announcement ages out. ---- */
  var DIR_PORT = '98';
  var _announced = false;
  var _dirCache = {};   /* MX (upper) -> chat key */

  async function announceKey() {
    if (_announced) return;
    var id = await ensureIdentity();
    if (!id || !id.mx) return;
    var pair = id.mx + '~' + id.publicHex;
    var known = await lookupKeyForMx(id.mx, true);
    if (known && normId(known) === normId(id.publicHex)) { _announced = true; return; } /* already published */
    var winiwa = ((window.STABLES_CONFIG || {}).TEST_TOKEN_REGISTRY || {}).winiwa_token_id || '';
    var state = JSON.stringify({ 90: myNodeKey, 98: toHex(utf8(pair)) });
    var r = await nodeCmd('send address:' + CHAT_ADDRESS + ' amount:' + DUST + ' tokenid:' + winiwa + ' state:' + state);
    if (r && r.status === true) _announced = true;
  }

  async function lookupKeyForMx(mx, quiet) {
    var want = String(mx || '').trim().toUpperCase();
    if (!want) return '';
    if (_dirCache[want]) return _dirCache[want];
    var r = await nodeCmd('coins address:' + CHAT_ADDRESS);
    var coins = (r && r.response) || [];
    var found = '';
    for (var i = 0; i < coins.length; i += 1) {
      var st = (coins[i].state || []).filter(function (x) { return String(x.port) === DIR_PORT; })[0];
      if (!st) continue;
      var text = '';
      try { text = new TextDecoder().decode(fromHex(st.data) || new Uint8Array()); } catch (_) { continue; }
      var parsed = parseContactCode(text);
      if (!parsed.cpk || !parsed.mx) continue;
      _dirCache[parsed.mx.toUpperCase()] = parsed.cpk;
      if (parsed.mx.toUpperCase() === want) found = parsed.cpk;
    }
    return found;
  }

  /* ---- local store: the primary record (the chain forgets by design) ---- */
  function loadStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch (_) { return []; } }
  function saveStore(rows) { try { localStorage.setItem(STORE_KEY, JSON.stringify(rows.slice(-500))); } catch (_) { /* full: oldest rows drop */ } }
  function addRow(row) {
    var rows = loadStore();
    if (rows.some(function (x) { return x.id === row.id; })) return false;
    rows.push(row);
    rows.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0) || (a.block || 0) - (b.block || 0); });
    saveStore(rows);
    return true;
  }

  /* ---- contacts: many people, each with their own conversation ---- */
  var CONTACTS_KEY = 'stables_chat_contacts_v1';
  var ACTIVE_KEY = 'stables_chat_active_v1';
  function normId(hex) { return String(hex || '').trim().toUpperCase().replace(/^0X/, '0x'); }
  function isChatId(hex) { return /^0x[0-9A-F]{64}$/.test(normId(hex)); }
  function contacts() { try { return JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]'); } catch (_) { return []; } }
  function saveContacts(list) { try { localStorage.setItem(CONTACTS_KEY, JSON.stringify(list)); } catch (_) { /* ignore */ } }
  function activePeer() { try { return localStorage.getItem(ACTIVE_KEY) || ''; } catch (_) { return ''; } }
  function setActivePeer(hex) { try { localStorage.setItem(ACTIVE_KEY, String(hex || '').indexOf('MX:') === 0 ? String(hex) : normId(hex)); } catch (_) { /* ignore */ } }
  /* A name is optional (founder 2026-08-10): with none, the person IS their address, shortened
     for reading. Naming them later is always possible, so nothing is lost by skipping it. */
  function shortAddr(a) {
    var s = String(a || '');
    return s.length > 20 ? (s.slice(0, 10) + '…' + s.slice(-6)) : s;
  }
  function contactName(peer) {
    var c = contacts().filter(function (x) { return peerOf(x) === (isPending(peer) ? peer : normId(peer)); })[0];
    if (c && c.name) return c.name;
    if (c) return shortAddr(c.mx || c.chatId);
    if (isPending(peer)) return shortAddr(mxOfPending(peer));
    return peer ? shortAddr(normId(peer)) : '';
  }
  /* A contact whose key we do not have yet is addressed by "MX:<address>" until the key resolves.
     peerOf() gives the current key for a contact record; isPending() spots the waiting state. */
  function pendingPeer(mx) { return 'MX:' + String(mx || '').trim().toUpperCase(); }
  function peerOf(c) { return c && c.chatId ? normId(c.chatId) : pendingPeer(c && c.mx); }
  function isPending(peer) { return String(peer || '').indexOf('MX:') === 0; }
  function mxOfPending(peer) { return String(peer || '').slice(3); }

  /* Resolve waiting contacts: ask the directory, and adopt keys learned from incoming messages.
     When a key arrives, the conversation rows move from the address key to the real key so no
     history is lost. */
  /* What the composer calls: the message is written into the conversation straight away and
     leaves as soon as it can (founder 2026-08-10: we send the message right away). */
  async function sendOrQueue(peer, payload) {
    var ts = Date.now();
    var localId = 'queued-' + ts;
    addRow({ id: localId, peer: peer, dir: 'out', type: payload.type || 'text',
      message: payload.message || '', image: payload.image || '', from: '', ts: ts, block: 0, queued: true });
    await attemptDelivery(peer, payload, localId);
    return { ok: true };
  }

  /* One delivery attempt that records its outcome on the row: still trying, or held back and why.
     A message never disappears and never lies about its state. */
  async function attemptDelivery(peer, payload, localId) {
    var res = null;
    try { res = await send(peer, payload, localId); } catch (_) { res = null; }
    if (res && res.ok && !res.queued) return true;
    var reason = (res && res.error) || 'waiting';
    var held = /connect a node|node refused|not connected/i.test(reason) ? 'node'
      : /waiting for key/i.test(reason) ? 'key' : 'retry';
    saveStore(loadStore().map(function (r) { return r.id === localId ? Object.assign({}, r, { held: held }) : r; }));
    if (typeof window.stablesChatOnchainRender === 'function') window.stablesChatOnchainRender();
    return false;
  }

  /* Deliver anything still waiting: a key that has since appeared, or a node that came back. */
  async function flushQueued() {
    var queued = loadStore().filter(function (r) { return r.queued; });
    if (!queued.length) return;
    for (var i = 0; i < queued.length; i += 1) {
      var q = queued[i];
      if (isPending(q.peer)) continue; /* migrated rows carry the real key now */
      await attemptDelivery(q.peer, { type: q.type, message: q.message, image: q.image }, q.id);
    }
  }

  async function resolvePending() {
    var list = contacts();
    var pending = list.filter(function (c) { return !c.chatId && c.mx; });
    if (!pending.length) return false;
    var changed = false;
    for (var i = 0; i < pending.length; i += 1) {
      var c = pending[i];
      var key = await lookupKeyForMx(c.mx);
      if (!key) continue;
      var from = pendingPeer(c.mx);
      saveContacts(contacts().map(function (x) { return (!x.chatId && x.mx === c.mx) ? Object.assign({}, x, { chatId: key }) : x; }));
      saveStore(loadStore().map(function (r) { return r.peer === from ? Object.assign({}, r, { peer: normId(key) }) : r; }));
      if (activePeer() === from) setActivePeer(key);
      changed = true;
    }
    return changed;
  }

  function contactMx(peer) {
    if (isPending(peer)) return mxOfPending(peer);
    var p = normId(peer);
    var c = contacts().filter(function (x) { return normId(x.chatId) === p; })[0];
    return c ? (c.mx || '') : '';
  }

  /* ---- send: one sealed dust coin to the active contact ---- */
  async function send(peerPubHex, payload, localId) {
    if (!enabled()) return { ok: false, error: 'Messaging is off.' };
    var SB = window.StablesSealedBox;
    var id = await ensureIdentity();
    if (!id) return { ok: false, error: 'Connect a node first.' };
    if (isPending(peerPubHex)) {
      var resolvedKey = await lookupKeyForMx(mxOfPending(peerPubHex));
      if (resolvedKey) { await resolvePending(); peerPubHex = resolvedKey; }
      else return { ok: false, queued: true, error: 'waiting for key' };
    }
    if (!isChatId(peerPubHex)) return { ok: false, error: 'That contact has no usable address yet.' };
    var peerPk = fromHex(peerPubHex);
    var body = { v: 1, t: payload.type || 'text', m: payload.message || '', i: payload.image || '', f: id.publicHex, mx: id.mx || '', ts: Date.now() };
    var blobHex = toHex(SB.seal(utf8(JSON.stringify(body)), peerPk));
    if (blobHex.length > MAX_BLOB_HEX_CHARS) return { ok: false, error: 'Message too large for one on-chain coin — shrink the image.' };
    var winiwa = ((window.STABLES_CONFIG || {}).TEST_TOKEN_REGISTRY || {}).winiwa_token_id || '';
    var state = JSON.stringify({ 90: myNodeKey, 99: blobHex });
    var r = await nodeCmd('send address:' + CHAT_ADDRESS + ' amount:' + DUST + ' tokenid:' + winiwa + " state:" + state);
    if (!r || r.status !== true) return { ok: false, error: (r && r.error) || 'The node refused the send.' };
    /* A sender cannot reopen a message sealed to the recipient, so the outgoing row is stored
       locally NOW with the plaintext and the peer it went to — that is what groups conversations. */
    if (localId) {
      /* Promote the row the person already sees: it stops saying "Sending…" and keeps its place. */
      saveStore(loadStore().map(function (r) {
        return r.id === localId ? Object.assign({}, r, { queued: false, peer: normId(peerPubHex), from: id.publicHex }) : r;
      }));
    } else {
      addRow({ id: 'out-' + body.ts, peer: normId(peerPubHex), dir: 'out', type: body.t,
        message: body.m, image: body.i, from: id.publicHex, ts: body.ts, block: 0 });
    }
    return { ok: true };
  }

  /* ---- scan: trial-decrypt the address; INCOMING only (own sends are stored at send time) ---- */
  async function scan() {
    if (!enabled()) return;
    var SB = window.StablesSealedBox;
    var id = await ensureIdentity();
    if (!id) {
      /* No node yet: still retry anything queued, so a message that could not leave updates its
         own state instead of sitting on "Sending…" forever (founder 2026-08-10). */
      await flushQueued().catch(function () { /* next cycle */ });
      return;
    }
    var r = await nodeCmd('coins address:' + CHAT_ADDRESS);
    var coins = (r && r.response) || [];
    var fresh = 0;
    for (var i = 0; i < coins.length; i += 1) {
      var c = coins[i];
      if (seenCoins[c.coinid]) continue;
      seenCoins[c.coinid] = true;
      var st = c.state || [];
      var blob = null, isDir = false;
      for (var j = 0; j < st.length; j += 1) {
        if (String(st[j].port) === '99') blob = fromHex(st[j].data);
        if (String(st[j].port) === DIR_PORT) isDir = true;
      }
      if (isDir || !blob) continue; /* a directory announcement is not a message */
      var opened = SB.open(blob, id.publicKey, id.secretKey);
      if (!opened) continue; /* not sealed to us: someone else's mail, or our own sent coin */
      var body = null;
      try { body = JSON.parse(new TextDecoder().decode(opened)); } catch (_) { body = null; }
      if (!body) continue;
      /* The sender tells us their Minima address too, so a contact we added by address alone
         gets its key from their first message — no directory needed. */
      if (body.mx) {
        var pend = contacts().filter(function (x) { return !x.chatId && String(x.mx).toUpperCase() === String(body.mx).toUpperCase(); })[0];
        if (pend) {
          var fromPeer = pendingPeer(pend.mx);
          saveContacts(contacts().map(function (x) { return (!x.chatId && x.mx === pend.mx) ? Object.assign({}, x, { chatId: normId(body.f) }) : x; }));
          saveStore(loadStore().map(function (r) { return r.peer === fromPeer ? Object.assign({}, r, { peer: normId(body.f) }) : r; }));
          if (activePeer() === fromPeer) setActivePeer(body.f);
        }
      }
      if (addRow({
        id: c.coinid, peer: normId(body.f), dir: 'in', type: body.t || 'text',
        message: body.m || '', image: body.i || '', from: normId(body.f), ts: body.ts || 0,
        block: Number(c.created) || 0,
      })) fresh += 1;
    }
    var resolved = await resolvePending().catch(function () { return false; });
    await flushQueued().catch(function () { /* retried next cycle */ });
    if ((fresh > 0 || resolved) && typeof window.stablesChatOnchainRender === 'function') window.stablesChatOnchainRender();
    reclaimAged(coins).catch(function () { /* housekeeping only */ });
  }

  /* ---- auto-reclaim own aged coins: default hygiene, never a setting ---- */
  async function reclaimAged(coins) {
    if (!myNodeKey) return;
    var s = await nodeCmd('status');
    var tip = Number((((s || {}).response || {}).chain || {}).block || 0);
    if (!tip) return;
    for (var i = 0; i < coins.length; i += 1) {
      var c = coins[i];
      /* A directory announcement must OUTLIVE the message window: it is how people find your key.
         Housekeeping reclaims messages, never the directory entry. */
      if ((c.state || []).some(function (x) { return String(x.port) === DIR_PORT; })) continue;
      var age = tip - Number(c.created || 0);
      if (age <= RECLAIM_AFTER_BLOCKS + 1) continue;
      var senderSt = (c.state || []).filter(function (x) { return String(x.port) === '90'; })[0];
      if (!senderSt || String(senderSt.data).toUpperCase() !== myNodeKey.toUpperCase()) continue;
      var g = await nodeCmd('getaddress');
      var myaddr = ((g || {}).response || {}).miniaddress || '';
      if (!myaddr) return;
      var txid = 'chatreclaim' + c.coinid.slice(2, 10);
      var winiwa = ((window.STABLES_CONFIG || {}).TEST_TOKEN_REGISTRY || {}).winiwa_token_id || '';
      await nodeCmd('txncreate id:' + txid);
      await nodeCmd('txninput id:' + txid + ' coinid:' + c.coinid);
      await nodeCmd('txnoutput id:' + txid + ' address:' + myaddr + ' amount:' + DUST + ' tokenid:' + winiwa);
      await nodeCmd('txnsign id:' + txid + ' publickey:' + myNodeKey);
      await nodeCmd('txnpost id:' + txid);
      await nodeCmd('txndelete id:' + txid);
    }
  }

  /* ---- public surface ---- */
  window.StablesChatOnchain = {
    isEnabled: enabled,
    setEnabled: function (on) {
      try { localStorage.setItem(ENABLE_KEY, on ? '1' : '0'); } catch (_) { /* ignore */ }
      if (on) start(); else stop();
    },
    myChatId: async function () { var id = await ensureIdentity(); return id ? id.publicHex : ''; },
    myContactCode: async function () { var id = await ensureIdentity(); return id ? contactCode(id) : ''; },
    myMx: async function () { var id = await ensureIdentity(); return id ? (id.mx || '') : ''; },
    contacts: contacts,
    addContact: async function (name, code) {
      var nm = String(name || '').trim(); /* optional: with no name, the address is the name */
      var parsed = parseContactCode(code);
      /* ADDING A CONTACT NEVER FAILS on a valid address (founder 2026-08-10: it should work
         directly). If their key is not known yet, the contact is saved as PENDING and the
         conversation opens; the key resolves by itself from the on-chain directory, or from
         their first message. Only SENDING waits for the key, and says so plainly. */
      if (!parsed.cpk && parsed.mx) {
        var discovered = await lookupKeyForMx(parsed.mx);
        if (discovered) parsed.cpk = discovered;
      }
      if (!parsed.cpk && !parsed.mx) return { ok: false, error: 'That is not a valid Minima address.' };
      var peer = parsed.cpk || pendingPeer(parsed.mx);
      var list = contacts();
      var existing = list.filter(function (x) { return peerOf(x) === peer; })[0];
      if (existing) { setActivePeer(peer); return { ok: true, cpk: peer, existing: true }; }
      list.push({ name: nm, chatId: parsed.cpk || '', mx: parsed.mx || '' });
      saveContacts(list);
      setActivePeer(peer);
      return { ok: true, cpk: peer };
    },
    lookupKeyForMx: lookupKeyForMx,
    removeContact: function (chatId) {
      var norm = normId(chatId);
      saveContacts(contacts().filter(function (x) { return normId(x.chatId) !== norm; }));
      if (activePeer() === norm) setActivePeer('');
    },
    renameContact: function (chatId, name) {
      var norm = normId(chatId);
      var nm = String(name || '').trim();
      saveContacts(contacts().map(function (x) { return normId(x.chatId) === norm ? Object.assign({}, x, { name: nm }) : x; }));
    },
    setHidden: function (chatId, hidden) {
      var norm = normId(chatId);
      var list = contacts().map(function (x) { return normId(x.chatId) === norm ? Object.assign({}, x, { hidden: !!hidden }) : x; });
      saveContacts(list);
      if (hidden && activePeer() === norm) setActivePeer('');
    },
    deleteChat: function (chatId) {
      /* Clear the conversation but keep the contact. */
      var norm = normId(chatId);
      saveStore(loadStore().filter(function (r) { return normId(r.peer) !== norm; }));
    },
    deleteContact: function (chatId) {
      /* Remove the contact AND its conversation. */
      var norm = normId(chatId);
      saveContacts(contacts().filter(function (x) { return normId(x.chatId) !== norm; }));
      saveStore(loadStore().filter(function (r) { return normId(r.peer) !== norm; }));
      if (activePeer() === norm) setActivePeer('');
    },
    hiddenCount: function () { return contacts().filter(function (x) { return x.hidden; }).length; },
    activePeer: activePeer,
    openConversation: function (chatId) {
      setActivePeer(chatId);
      var menu = document.getElementById('chatConvMenu'); if (menu) menu.style.display = 'none';
      var layout = document.getElementById('chatLayout');
      if (layout) layout.classList.add('has-active');
      if (typeof window.stablesChatOnchainRender === 'function') window.stablesChatOnchainRender();
      var box = document.getElementById('chatMessageList');
      if (box) setTimeout(function () { box.scrollTop = box.scrollHeight; }, 60);
    },
    closeConversation: function () {
      setActivePeer('');
      var layout = document.getElementById('chatLayout');
      if (layout) layout.classList.remove('has-active');
      if (typeof window.stablesChatOnchainRender === 'function') window.stablesChatOnchainRender();
    },
    contactName: contactName,
    rotateId: rotateIdentity,
    send: send,
    sendOrQueue: sendOrQueue,
    scanNow: scan,
    rows: loadStore,
  };

  function start() {
    if (scanTimer) return;
    scan();
    /* Publish our own (address -> key) directory entry so a contact who only has our Minima
       address can start a chat with us. Runs once; it checks the chain before spending. */
    announceKey().catch(function () { /* best effort */ });
    scanTimer = window.stablesRepeatWhileVisible('chat-scan', scan, SCAN_EVERY_MS);
  }
  function stop() {
    /* stablesStopRepeat, not clearInterval: this is a repeating-job handle, and clearInterval does
       nothing at all to an object, so locking the chat left its node scan running for the life of
       the app — asking the node for the chat address's coins every 15 s (founder 2026-09-03,
       battery). */
    if (scanTimer) { window.stablesStopRepeat(scanTimer); scanTimer = null; }
    identity = null; /* keys leave memory with the session */
  }

  /* ---- UI: many contacts, one open conversation at a time ---- */
  function esc(s) { var d = document.createElement('div'); d.textContent = String(s == null ? '' : s); return d.innerHTML; }
  function lastMsgFor(peer, rows) {
    var mine = rows.filter(function (r) { return normId(r.peer) === normId(peer); });
    return mine.length ? mine[mine.length - 1] : null;
  }
  var _chatSearch = '';
  var _showHidden = false;
  function shortId(hex) { var h = normId(hex); return h.length > 20 ? (h.slice(0, 12) + '…' + h.slice(-6)) : h; }
  function fmtTime(ts) { if (!ts) return ''; var d = new Date(ts); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
  var _lastQrId = '';
  function paintQr(hex) {
    var host = document.getElementById('chatMyQr');
    if (!host || typeof window.QRCode === 'undefined') return;
    if (hex === _lastQrId) return; /* don't rebuild an identical code on every scan */
    _lastQrId = hex;
    host.innerHTML = '';
    try { new window.QRCode(host, { text: hex, width: 168, height: 168, colorDark: '#0b0f14', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M }); } catch (_) { /* ignore */ }
  }

  window.stablesChatOnchainRender = function () {
    var rows = loadStore();
    var list = contacts();
    var active = activePeer();

    /* Pane state: a chosen conversation switches the layout (phone: replace the list; desktop:
       fill the right pane). Kept in sync here so a reload restores the open conversation. */
    var layout = document.getElementById('chatLayout');
    if (layout) { if (active) layout.classList.add('has-active'); else layout.classList.remove('has-active'); }

    /* --- You: your contact code (encryption key + Minima address), shareable by QR or copy --- */
    var idEl = document.getElementById('chatMyIdShort');
    if (enabled()) {
      window.StablesChatOnchain.myContactCode().then(function (code) {
        if (idEl) idEl.textContent = code ? shortId(code) : 'Connect a node to derive your code.';
        if (code) paintQr(code);
      });
    } else if (idEl) {
      idEl.textContent = 'Turn on on-chain messaging in Preferences.';
    }

    /* --- Chats: every saved contact, plus the address book, searchable, most-recent first --- */
    var chatsEl = document.getElementById('chatConversationsList');
    if (chatsEl) {
      /* Merge the app address book (founder 2026-08-10: all my contacts show here). A person from
         the book with no chat address yet is shown but not messageable until they share it. */
      var merged = list.slice();
      try {
        if (typeof window.stablesGetAddressBook === 'function') {
          var mxSeen = {};
          merged.forEach(function (c) { if (c.mx) mxSeen[String(c.mx).toUpperCase()] = true; });
          var nameSeen = {};
          merged.forEach(function (c) { nameSeen[(c.name || '').toLowerCase()] = true; });
          window.stablesGetAddressBook().forEach(function (ab) {
            var mxU = String(ab.mx || '').toUpperCase();
            if ((mxU && mxSeen[mxU]) || nameSeen[(ab.name || '').toLowerCase()]) return; /* already a chat contact */
            merged.push({ name: ab.name, chatId: '', mx: ab.mx, fromBook: true });
          });
        }
      } catch (_) { /* address book optional */ }

      var q = _chatSearch.trim().toLowerCase();
      var visible = merged.filter(function (c) {
        if (c.hidden && !_showHidden) return false;
        if (q && (c.name || '').toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      var withTime = visible.map(function (c) { var last = c.fromBook ? null : lastMsgFor(peerOf(c), rows); return { c: c, last: last, t: last ? (last.ts || 0) : 0 }; });
      withTime.sort(function (a, b) { return b.t - a.t || (a.c.name || '').localeCompare(b.c.name || ''); });

      chatsEl.innerHTML = withTime.length ? withTime.map(function (row) {
        var c = row.c, last = row.last;
        var preview = c.fromBook ? 'In your contacts — ask for their address to chat'
          : (last ? ((last.dir === 'out' ? 'You: ' : '') + (last.type === 'image' ? '📷 Photo' : last.message))
                  : 'No messages yet');
        var when = fmtTime(last && last.ts);
        var rowPeer = c.fromBook ? '' : peerOf(c);
        var on = rowPeer && rowPeer === (isPending(active) ? active : normId(active));
        var click = rowPeer ? ('StablesChatOnchain.openConversation(\'' + esc(rowPeer) + '\')') : ('stablesChatStartFromBook(' + JSON.stringify(esc(c.name)) + ',' + JSON.stringify(esc(c.mx || '')) + ')');
        return '<button type="button" class="chat-contact-row' + (on ? ' is-active' : '') + (c.fromBook ? ' is-book' : '') + (c.hidden ? ' is-hidden' : '') + '" onclick="' + click + '">'
          + '<span class="mavatar">' + esc(String(c.name || (c.mx || '').replace(/^Mx/i, '') || '?').slice(0, 1).toUpperCase()) + '</span>'
          + '<span class="chat-contact-text"><span class="chat-contact-top"><span class="ui-tone-text ui-label-strong chat-contact-name">' + esc(c.name || shortAddr(c.mx || c.chatId)) + '</span>'
          + (when ? '<span class="xs mu chat-contact-time">' + esc(when) + '</span>' : '') + '</span>'
          + '<span class="xs mu ui-block chat-contact-preview">' + esc(preview) + '</span></span></button>';
      }).join('') : ('<div class="xs mu">' + (q ? 'No contacts match “' + esc(_chatSearch) + '”.' : 'No chats yet. Tap New chat and paste an address.') + '</div>');

      /* Show-hidden toggle: only when something is hidden. */
      var toggle = document.getElementById('chatShowHidden');
      if (toggle) {
        var hc = window.StablesChatOnchain.hiddenCount();
        toggle.style.display = hc ? '' : 'none';
        toggle.textContent = _showHidden ? ('Hide hidden (' + hc + ')') : ('Show hidden (' + hc + ')');
      }
    }

    /* --- Thread: the open conversation, inside the conversation screen (a modal) --- */
    var convTitle = document.getElementById('chatConversationTitle');
    if (convTitle && active) convTitle.textContent = contactName(active);
    var msgList = document.getElementById('chatMessageList');
    var empty = document.getElementById('chatEmptyState');
    if (msgList && active) {
      var conv = rows.filter(function (r) { return (isPending(active) ? r.peer === active : normId(r.peer) === normId(active)); });
      if (empty) { empty.style.display = conv.length ? 'none' : 'block';
        empty.textContent = 'No messages yet. Say hello to ' + contactName(active) + '.'; }
      msgList.innerHTML = conv.map(function (r) {
        var me = r.dir === 'out';
        var body = r.type === 'image' && r.image
          ? '<img src="' + esc(r.image) + '" alt="Photo" class="chat-photo">'
          : esc(r.message || (me ? 'Sent message' : 'Message'));
        var when = r.queued
          ? (r.held === 'node' ? 'Waiting for your node' : r.held === 'key' ? 'Waiting for them' : 'Sending…')
          : (r.ts ? fmtTime(r.ts) : ('block ' + r.block));
        return '<div class="msg-row' + (me ? ' me' : '') + '"><div class="mavatar">' + (me ? 'Me' : esc(contactName(active).slice(0, 1).toUpperCase())) + '</div><div>'
          + '<div class="mbubble ' + (me ? 'bme' : 'bth') + '">' + body + '</div>'
          + '<div class="mmeta' + (me ? ' ui-text-right' : '') + '">' + esc(when) + '</div></div></div>';
      }).join('');
      var composer = document.getElementById('chatComposerInput');
      if (composer) composer.placeholder = 'Message ' + contactName(active) + '…';
    }
  };

  window.stablesChatSearch = function (term) { _chatSearch = String(term || ''); window.stablesChatOnchainRender(); };
  window.stablesChatToggleHidden = function () { _showHidden = !_showHidden; window.stablesChatOnchainRender(); };
  window.stablesChatStartFromBook = function (name, mx) {
    /* A book contact has no chat address yet. Open New chat pre-filled with their name so the
       person only pastes the address they were given. */
    window.stablesChatOpenNewChat();
    var n = document.getElementById('chatContactName'); if (n) n.value = name || '';
    var i = document.getElementById('chatContactIdInput'); if (i) { i.value = ''; setTimeout(function () { i.focus(); }, 60); }
  };
  window.stablesChatRenameActive = function () {
    /* Rename in place: the conversation title becomes an input (founder 2026-08-10: naming is
       always possible, never demanded up front). */
    var p = activePeer(); if (!p) return;
    stablesChatCloseConvMenu();
    var title = document.getElementById('chatConversationTitle');
    if (!title || title.querySelector('input')) return;
    var current = window.StablesChatOnchain.contacts().filter(function (x) { return x.chatId.toUpperCase() === p.toUpperCase(); })[0];
    var input = document.createElement('input');
    input.className = 'finput ui-mb-0 chat-rename-input';
    input.value = (current && current.name) || '';
    input.placeholder = 'Name this contact';
    input.setAttribute('aria-label', 'Contact name');
    var commit = function () {
      window.StablesChatOnchain.renameContact(p, input.value);
      window.stablesChatOnchainRender();
      title.textContent = window.StablesChatOnchain.contactName(p);
    };
    input.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') { title.textContent = window.StablesChatOnchain.contactName(p); } };
    input.onblur = commit;
    title.textContent = '';
    title.appendChild(input);
    input.focus();
    input.select();
  };
  window.stablesChatHideActive = function () {
    var p = activePeer(); if (!p) return;
    window.StablesChatOnchain.setHidden(p, true);
    window.StablesChatOnchain.closeConversation();
    stablesChatCloseConvMenu();
  };
  window.stablesChatDeleteActiveChat = async function () {
    var p = activePeer(); if (!p) return;
    var ok = true;
    if (typeof window.stablesConfirm === 'function') ok = await window.stablesConfirm({ title: 'Delete this chat', message: 'The messages on this device are removed. The contact stays in your list.', confirmText: 'Delete chat' });
    if (!ok) return;
    window.StablesChatOnchain.deleteChat(p);
    stablesChatCloseConvMenu();
    window.stablesChatOnchainRender();
  };
  window.stablesChatDeleteActiveContact = async function () {
    var p = activePeer(); if (!p) return;
    var ok = true;
    if (typeof window.stablesConfirm === 'function') ok = await window.stablesConfirm({ title: 'Delete this contact', message: 'The contact and your conversation are removed from this device.', confirmText: 'Delete contact' });
    if (!ok) return;
    window.StablesChatOnchain.deleteContact(p);
    window.StablesChatOnchain.closeConversation();
    stablesChatCloseConvMenu();
  };
  window.stablesChatToggleConvMenu = function () {
    var m = document.getElementById('chatConvMenu'); if (m) m.style.display = m.style.display === 'none' ? '' : 'none';
  };
  function stablesChatCloseConvMenu() { var m = document.getElementById('chatConvMenu'); if (m) m.style.display = 'none'; }

  window.stablesChatOpenProfile = function () {
    if (typeof window.openModal === 'function') window.openModal('chatProfileModal');
    _lastQrId = '';
    window.stablesChatOnchainRender();
  };
  window.stablesChatOpenNewChat = function () {
    if (typeof window.openModal === 'function') window.openModal('chatNewChatModal');
    var n = document.getElementById('chatContactName'); if (n) n.value = '';
    var i = document.getElementById('chatContactIdInput'); if (i) i.value = '';
  };

  function copyText(text, label) {
    if (!text) return;
    var done = function () { try { window.showToast(label + ' copied.', { durationMs: 2200 }); } catch (_) {} };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(function () { if (typeof window.stablesFallbackCopyText === 'function') window.stablesFallbackCopyText(text, done); });
    else if (typeof window.stablesFallbackCopyText === 'function') window.stablesFallbackCopyText(text, done);
  }
  window.stablesChatCopyMyId = function () { window.StablesChatOnchain.myContactCode().then(function (code) { copyText(code, 'Address'); }); };
  window.stablesChatCopyMyMx = function () { window.StablesChatOnchain.myMx().then(function (mx) { copyText(mx, 'Address'); }); };
  var DEFAULT_PROFILE_ACTIONS = ''; /* captured on first render so Cancel can restore it */
  window.stablesChatChangeId = function () {
    /* Direct, in place — a compact confirmation, not a separate screen (founder 2026-08-10). */
    var host = document.getElementById('chatProfileActions');
    if (!host) return;
    if (!DEFAULT_PROFILE_ACTIONS) DEFAULT_PROFILE_ACTIONS = host.innerHTML;
    host.classList.add('chat-confirm-inline');
    host.innerHTML = '<div class="xs mu ui-text-center ui-flow-3">A new id. Contacts need it before they can reach you again; your conversations stay on your device.</div>'
      + '<div class="ui-field-row ui-items-center">'
      + '<button data-size="compact" data-layout="full" data-role="primary" class="btn btn-w btn-primary ui-flex-1 mx-action" onclick="stablesChatConfirmChangeId()">Change id</button>'
      + '<button data-size="compact" data-role="secondary" class="btn btn-secondary mx-action" onclick="stablesChatCancelChangeId()">Cancel</button></div>';
  };
  window.stablesChatConfirmChangeId = function () {
    window.StablesChatOnchain.rotateId();
    _lastQrId = '';
    stablesChatCancelChangeId();
    window.stablesChatOnchainRender();
  };
  window.stablesChatCancelChangeId = function () {
    var host = document.getElementById('chatProfileActions');
    if (host && DEFAULT_PROFILE_ACTIONS) { host.classList.remove('chat-confirm-inline'); host.innerHTML = DEFAULT_PROFILE_ACTIONS; }
  };

  window.stablesChatAddContactFromForm = async function () {
    var nameEl = document.getElementById('chatContactName');
    var idEl = document.getElementById('chatContactIdInput');
    var r = await window.StablesChatOnchain.addContact(nameEl ? nameEl.value : '', idEl ? idEl.value : '');
    if (r.ok) {
      if (nameEl) nameEl.value = ''; if (idEl) idEl.value = '';
      if (typeof window.closeModal === 'function') window.closeModal('chatNewChatModal');
      window.StablesChatOnchain.openConversation(r.cpk); /* addContact already made it active */
    } else { try { window.showToast(r.error, { durationMs: 4600 }); } catch (_) { /* ignore */ } }
  };

  window.stablesChatSendFromComposer = async function () {
    var input = document.getElementById('chatComposerInput');
    var text = input ? String(input.value || '').trim() : '';
    if (!enabled()) {
      try { window.showToast('Messaging is off. Turn on on-chain messaging in Preferences.', { durationMs: 4600 }); } catch (_) { /* ignore */ }
      return;
    }
    if (!text) return;
    var peer = activePeer();
    if (!peer) {
      try { window.showToast('Select a contact to message first.', { durationMs: 4600 }); } catch (_) { /* ignore */ }
      return;
    }
    var r = await sendOrQueue(peer, { type: 'text', message: text });
    /* No success toast (founder law): the appearing row IS the feedback. */
    if (r.ok) {
      if (input) input.value = '';
      window.stablesChatOnchainRender();
      var box = document.getElementById('chatMessageList');
      if (box) box.scrollTop = box.scrollHeight;
      setTimeout(scan, 2500);
    }
    else { try { window.showToast(r.error, { durationMs: 4600 }); } catch (_) { /* ignore */ } }
  };

  function syncSettingsUi() {
    var t = document.getElementById('chatOnchainToggle');
    if (t) t.checked = enabled();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { syncSettingsUi(); window.stablesChatOnchainRender(); });
  else { syncSettingsUi(); window.stablesChatOnchainRender(); }

  if (enabled()) setTimeout(start, 4000); /* after the node bridge settles */
})();
