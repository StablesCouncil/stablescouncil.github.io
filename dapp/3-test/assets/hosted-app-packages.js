/* D076: approved web-package storage. Slice A never executes downloaded code. */
(function (W) {
    'use strict';
    const LIST = 'assets/config/third-party-apps.json';
    const LIMIT = 32 * 1024 * 1024, EXPANDED = 64 * 1024 * 1024;
    const HOSTS = new Set(['stablescouncil.org', 'www.stablescouncil.org', 'github.com',
        'raw.githubusercontent.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com']);
    let approved = [], loading = null;
    const installed = new Set(), active = new Map();
    function urlAllowed(raw) {
        try { const u = new URL(raw); return u.protocol === 'https:' && HOSTS.has(u.hostname)
            && !u.username && !u.password && !u.port && !u.hash && !u.pathname.includes('/latest/'); }
        catch (_) { return false; }
    }
    function safePath(s) {
        return typeof s === 'string' && s.length > 0 && s.length <= 240 && /^[A-Za-z0-9_./ -]+$/.test(s)
            && !s.startsWith('/') && !s.includes('\\') && !s.split('/').some(x => x === '..' || x === '.' || x === '');
    }
    function downloadable(a) {
        const p = a && a.package;
        return !!p && urlAllowed(p.url) && /^[0-9a-f]{64}$/.test(p.sha256 || '')
            && safePath(String(p.entry || '').split('?')[0]) && /\.html$/.test(p.entry.split('?')[0])
            && typeof p.version === 'string' && /^[0-9A-Za-z.-]{1,40}$/.test(p.version);
    }
    function validate(list) {
        if (!list || list.v !== 2 || !Array.isArray(list.apps)) return [];
        const seen = new Set();
        return list.apps.filter(a => {
            if (!a || !/^[a-z0-9-]{1,40}$/.test(a.id || '') || seen.has(a.id)
                || typeof a.name !== 'string' || !a.name || typeof a.publisher !== 'string' || !a.publisher
                || !/^apps\/[A-Za-z0-9_-]+\.png$/.test(a.icon || '') || !urlAllowed(a.web)) return false;
            const reservation = a.id === 'the-pool' && a.preinstalled === true && a.package
                && a.package.status === 'awaiting-package' && a.package.url === '' && a.package.sha256 === '';
            if (!reservation && !downloadable(a)) return false;
            seen.add(a.id); return true;
        });
    }
    const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
    const sha = bytes => W.crypto.subtle.digest('SHA-256', bytes).then(hex);
    function crc32(bytes) {
        let c = 0xffffffff;
        for (const b of bytes) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0); }
        return (c ^ 0xffffffff) >>> 0;
    }
    async function boundedRead(stream, limit) {
        const reader = stream.getReader(), chunks = []; let n = 0;
        try {
            for (;;) { const r = await reader.read(); if (r.done) break; n += r.value.byteLength;
                if (n > limit) throw new Error('Package size exceeds the approved limit.'); chunks.push(r.value); }
        } catch (e) { await reader.cancel().catch(() => {}); throw e; }
        const bytes = new Uint8Array(n); let at = 0;
        for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
        return bytes;
    }
    async function verifyZip(bytes, entry) {
        if (bytes.byteLength > LIMIT || bytes.byteLength < 22) throw new Error('Check the app package.');
        const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), len = bytes.length;
        let end = -1;
        for (let i = len - 22; i >= Math.max(0, len - 65557); i--)
            if (v.getUint32(i, true) === 0x06054b50 && i + 22 + v.getUint16(i + 20, true) === len) { end = i; break; }
        if (end < 0 || v.getUint16(end + 4, true) || v.getUint16(end + 6, true)) throw new Error('Check the ZIP layout.');
        const count = v.getUint16(end + 10, true), size = v.getUint32(end + 12, true), offset = v.getUint32(end + 16, true);
        if (!count || count > 2048 || v.getUint16(end + 8, true) !== count || offset + size !== end) throw new Error('Check the ZIP directory.');
        let cursor = offset, total = 0, hasEntry = false; const names = new Set(), spans = [];
        for (let k = 0; k < count; k++) {
            if (cursor + 46 > end || v.getUint32(cursor, true) !== 0x02014b50) throw new Error('Check the ZIP record.');
            const flags = v.getUint16(cursor + 8, true), method = v.getUint16(cursor + 10, true), crc = v.getUint32(cursor + 16, true);
            const compressed = v.getUint32(cursor + 20, true), expanded = v.getUint32(cursor + 24, true);
            const nl = v.getUint16(cursor + 28, true), el = v.getUint16(cursor + 30, true), cl = v.getUint16(cursor + 32, true);
            const local = v.getUint32(cursor + 42, true), attrs = v.getUint32(cursor + 38, true), unixType = (attrs >>> 16) & 0xf000;
            if (cursor + 46 + nl + el + cl > end || v.getUint16(cursor + 34, true) || flags & ~0x808
                || ![0, 8].includes(method) || ![0, 0x4000, 0x8000].includes(unixType)) throw new Error('Check the ZIP format.');
            const name = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(cursor + 46, cursor + 46 + nl));
            const directory = name.endsWith('/'), path = directory ? name.slice(0, -1) : name;
            if (!safePath(path) || names.has(path.toLowerCase())) throw new Error('Check the package paths.');
            names.add(path.toLowerCase()); total += expanded;
            if (total > EXPANDED || expanded > LIMIT || compressed > LIMIT || (directory && expanded)) throw new Error('Check the expanded package size.');
            if (local + 30 > offset || v.getUint32(local, true) !== 0x04034b50
                || v.getUint16(local + 6, true) !== flags || v.getUint16(local + 8, true) !== method) throw new Error('Check the ZIP file header.');
            const lnl = v.getUint16(local + 26, true), lel = v.getUint16(local + 28, true), start = local + 30 + lnl + lel;
            const localName = new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(local + 30, local + 30 + lnl));
            if (localName !== name || start + compressed > offset || spans.some(s => local < s[1] && start + compressed > s[0])) throw new Error('Check the ZIP file range.');
            spans.push([local, start + compressed]);
            let plain = bytes.subarray(start, start + compressed);
            if (method === 8) plain = await boundedRead(new Blob([plain]).stream().pipeThrough(new DecompressionStream('deflate-raw')), Math.min(expanded, LIMIT));
            if (plain.length !== expanded || crc32(plain) !== crc) throw new Error('Check the package contents.');
            if (!directory && name === entry.split('?')[0]) hasEntry = true;
            cursor += 46 + nl + el + cl;
        }
        if (cursor !== end || !hasEntry) throw new Error('Check the app entry page.');
    }
    function database() {
        return new Promise((resolve, reject) => {
            const r = W.indexedDB.open('stables-approved-app-packages-v1', 1);
            r.onupgradeneeded = () => r.result.createObjectStore('packages', { keyPath: 'id' });
            r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
            r.onblocked = () => reject(new Error('Close another Apps catalogue and try again.'));
        });
    }
    async function stored(a) {
        const db = await database();
        try { return await new Promise((resolve, reject) => { const tx = db.transaction('packages', 'readonly'), r = tx.objectStore('packages').get(a.id);
            r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
        finally { db.close(); }
    }
    async function save(a, bytes) {
        const db = await database();
        try { await new Promise((resolve, reject) => { const tx = db.transaction('packages', 'readwrite');
            tx.objectStore('packages').put({ id: a.id, version: a.package.version, sha256: a.package.sha256, bytes });
            tx.oncomplete = resolve; tx.onabort = tx.onerror = () => reject(tx.error || new Error('Try the installation again.')); }); }
        finally { db.close(); }
    }
    function native() { const n = W.StablesAndroid || W.StablesCore; return n && typeof n.hostedAppState === 'function' && typeof n.installHostedApp === 'function' ? n : null; }
    async function refresh() {
        installed.clear();
        for (const a of approved) {
            if (a.preinstalled && a.package.status === 'awaiting-package') { installed.add(a.id); continue; }
            try {
                const n = native();
                if (n) { if (JSON.parse(n.hostedAppState(a.id)).installed) installed.add(a.id); }
                else { const r = await stored(a); if (r && r.version === a.package.version && r.sha256 === a.package.sha256
                    && await sha(r.bytes) === a.package.sha256) { await verifyZip(new Uint8Array(r.bytes), a.package.entry); installed.add(a.id); } }
            } catch (_) { /* An incomplete or changed package needs Install. */ }
        }
    }
    function load() {
        if (loading) return loading;
        loading = fetch(LIST, { cache: 'no-cache', credentials: 'same-origin' }).then(r => { if (!r.ok) throw new Error('Try loading Apps again.'); return r.json(); })
            .then(async list => { approved = Object.freeze(validate(list).map(a => Object.freeze({ ...a, package: Object.freeze({ ...a.package }) }))); await refresh(); return approved; }).catch(e => { loading = null; throw e; });
        return loading;
    }
    async function install(id, onChange) {
        if (active.has(id)) return active.get(id);
        const run = (async () => {
            await load(); const a = approved.find(x => x.id === id);
            if (!downloadable(a)) throw new Error('The publisher is preparing this package.');
            const n = native();
            if (n) {
                await new Promise((resolve, reject) => { const timeout = setTimeout(() => { W.removeEventListener('stables-hosted-package', handler); reject(new Error('Check Apps again in a moment.')); }, 120000);
                    const handler = e => { if (e.detail.id !== id) return; const d = e.detail;
                        if (d.phase === 'progress') { onChange(d.percent); return; }
                        W.removeEventListener('stables-hosted-package', handler); clearTimeout(timeout);
                        if (d.phase === 'installed') resolve(); else reject(new Error(d.message || 'Try the installation again.')); };
                    W.addEventListener('stables-hosted-package', handler);
                    try { n.installHostedApp(id); } catch (e) { W.removeEventListener('stables-hosted-package', handler); clearTimeout(timeout); reject(e); }
                });
            } else {
                const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 120000);
                try { const r = await fetch(a.package.url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal });
                    if (!r.ok || !urlAllowed(r.url || a.package.url) || Number(r.headers.get('content-length')) > LIMIT || !r.body) throw new Error('Try the package download again.');
                    const bytes = await boundedRead(r.body, LIMIT);
                    if (await sha(bytes) !== a.package.sha256) throw new Error('The package changed. Ask the publisher for the approved version.');
                    await verifyZip(bytes, a.package.entry); await save(a, bytes.buffer); }
                finally { clearTimeout(timer); }
            }
            await refresh(); if (!installed.has(id)) throw new Error('Try saving this app again.');
            return a;
        })();
        active.set(id, run);
        try { return await run; } finally { active.delete(id); }
    }
    W.StablesHostedPackages = Object.freeze({ load, refresh, install, installed: id => installed.has(id), downloadable, validate, verifyZip, urlAllowed });
})(window);
