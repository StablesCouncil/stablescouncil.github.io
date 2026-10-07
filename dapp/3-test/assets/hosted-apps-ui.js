/* D076: the four-slot desktop tile and full Apps page. */
var _thirdPartyApps = [], _thirdPartyLoading = null, _homeAppsOpen = '';
var _thirdPartyRun = Object.create(null);
(function (W) {
    'use strict';
    const P = W.StablesHostedPackages;
    const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    let catalogue = false;
    const app = id => _thirdPartyApps.find(a => a.id === id);
    const icon = a => 'assets/config/' + a.icon;
    const POSITION_KEY = 'stables_apps_positions_v1', MAX_POSITIONS = 256;
    let savedPositions = null, refreshPending = false;
    function positions() {
        let raw = savedPositions;
        if (!raw) {
            try { const saved = JSON.parse(W.localStorage.getItem(POSITION_KEY) || 'null'); raw = saved && saved.v === 1 && Array.isArray(saved.slots) ? saved.slots : []; }
            catch (_) { raw = []; }
        }
        const installed = _thirdPartyApps.filter(a => P.installed(a.id)), allowed = new Set(installed.map(a => a.id)), seen = new Set();
        const slots = raw.slice(0, MAX_POSITIONS).map(id => { if (!allowed.has(id) || seen.has(id)) return null; seen.add(id); return id; });
        for (const a of installed) if (!seen.has(a.id)) { const at = slots.indexOf(null); if (at >= 0) slots[at] = a.id; else slots.push(a.id); }
        while (slots.length && !slots[slots.length - 1]) slots.pop();
        return slots;
    }
    const orderedApps = () => positions().filter(Boolean).map(app).filter(Boolean);
    const columns = rows => Math.max(1, Math.floor((rows.clientWidth + 24) / 96));
    function moveApp(id, to) {
        const slots = positions(), from = slots.indexOf(id);
        if (from < 0 || !Number.isInteger(to) || to < 0 || to >= MAX_POSITIONS || from === to) return false;
        while (slots.length <= to) slots.push(null);
        slots[from] = slots[to] || null; slots[to] = id;
        while (slots.length && !slots[slots.length - 1]) slots.pop();
        savedPositions = slots;
        let saved = true;
        try { W.localStorage.setItem(POSITION_KEY, JSON.stringify({ v: 1, slots })); } catch (_) { saved = false; }
        refresh();
        const notice = document.getElementById('appsLoadState');
        notice.classList.toggle('app-visually-hidden', saved);
        notice.textContent = saved ? app(id).name + ' moved to position ' + (to + 1) + '.' : 'App positions could not be saved.';
        return true;
    }
    function renderInstalled(rows) {
        const slots = positions(), cols = columns(rows), count = Math.min(MAX_POSITIONS, Math.max(2, Math.ceil(slots.length / cols) + 1) * cols);
        rows.innerHTML = Array.from({ length: count }, (_, i) => slots[i] ? row(app(slots[i]), i)
            : '<div class="mx-launcher-slot" data-app-slot="' + i + '" aria-hidden="true"></div>').join('');
    }
    function refresh() {
        if (hold && hold.armed) { refreshPending = true; return; }
        refreshPending = false;
        const rows = document.getElementById('installedAppsList'), cat = document.getElementById('appsCatalogue');
        if (rows) renderInstalled(rows);
        if (cat) { cat.hidden = !catalogue; const list = document.getElementById('appsCatalogueList');
            const choices = _thirdPartyApps.filter(a => !P.installed(a.id));
            list.innerHTML = choices.map(a => row(a)).join('');
            document.getElementById('appsCatalogueEmpty').hidden = choices.length > 0; }
        const h = document.getElementById('pageCarousel');
        if (h && h.classList.contains('open') && typeof W.stablesRenderHome === 'function') W.stablesRenderHome();
    }
    async function load() {
        if (_thirdPartyLoading) return _thirdPartyLoading;
        _thirdPartyLoading = P.load().then(list => { _thirdPartyApps = list; refresh(); return list; })
            .catch(() => { const notice = document.getElementById('appsLoadState'); notice.classList.remove('app-visually-hidden'); notice.textContent = 'Open Apps again to load the catalogue.'; return []; })
            .finally(() => { _thirdPartyLoading = null; });
        return _thirdPartyLoading;
    }
    function action(a) {
        if (_thirdPartyRun[a.id] && _thirdPartyRun[a.id].phase === 'downloading') return { act: 'busy', label: 'Installing' };
        return P.installed(a.id) ? { act: 'open', label: 'Open' } : P.downloadable(a) ? { act: 'install', label: 'Install' } : null;
    }
    function row(a, position) {
        const ac = action(a), run = _thirdPartyRun[a.id] || {}, id = esc(a.id);
        const label = (ac && ac.act === 'install' ? 'Install ' : ac && ac.act === 'busy' ? 'Installing ' : 'Open ') + a.name;
        return '<div class="mx-launcher-item' + (Number.isInteger(position) ? ' mx-launcher-slot' : '') + '" role="listitem" data-third-party-row="' + id + '"' + (Number.isInteger(position) ? ' data-app-slot="' + position + '"' : '') + '>'
            + '<button type="button" class="mx-action mx-launcher__icon" data-role="icon" data-size="launcher" data-third-party-app="' + id + '" data-third-party-action="' + (ac ? ac.act : 'preparing') + '" aria-label="' + esc(label) + '" aria-haspopup="dialog" aria-describedby="appsInfoHint"' + (ac && ac.act === 'busy' ? ' aria-disabled="true"' : '') + ' onclick="stablesThirdPartyAct(\'' + id + '\')">'
            + '<img class="mx-icon mx-launcher__image" data-size="application" src="' + esc(icon(a)) + '" alt="" draggable="false"></button>'
            + '<span class="mx-launcher__name">' + esc(a.name) + '</span>'
            + '<span class="mx-launcher__note" role="status" aria-live="polite"' + (run.note ? '' : ' hidden') + '>' + esc(run.note) + '</span></div>';
    }
    function tile() {
        const slots = orderedApps().slice(0, 4);
        let html = '';
        for (let i = 0; i < 4; i++) {
            const a = slots[i];
            html += a ? '<button type="button" class="home-apps__app mx-launcher-group__slot" data-third-party-app="' + esc(a.id) + '" aria-label="Open ' + esc(a.name) + '" onclick="event.stopPropagation();stablesThirdPartyTileTap(this.getAttribute(\'data-third-party-app\'))"><span class="mx-launcher-preview-frame" aria-hidden="true"><img class="home-apps__icon" src="' + esc(icon(a)) + '" alt="" draggable="false"></span><span class="home-apps__name mx-type" data-role="micro">' + esc(a.name) + '</span></button>'
                : '<button type="button" class="home-apps__add mx-launcher-group__slot" aria-label="Apps, empty slot ' + (i + 1) + '" onclick="event.stopPropagation();stablesOpenAppsPanel()"></button>';
        }
        return '<div class="ditem home-tile home-tile--apps" tabindex="0" data-home-item="apps" data-home-widget="apps" aria-label="Apps" onclick="stablesOpenAppsPanel()" onkeydown="if(event.target===this&&(event.key===\'Enter\'||event.key===\' \')){event.preventDefault();stablesOpenAppsPanel()}"><div class="home-apps mx-launcher-group">' + html + '</div><div class="dinfo"><div class="dname">Apps</div></div></div>';
    }
    function openPage() {
        if (typeof _carouselQuietUntil === 'number' && Date.now() < _carouselQuietUntil) return;
        catalogue = false; document.getElementById('appsCatalogueToggle').setAttribute('aria-expanded', 'false'); W.navigate('apps'); refresh(); load();
    }
    function open(a) {
        if (!a || !P.installed(a.id)) return false;
        const title = document.getElementById('hostedAppTitle'), state = document.getElementById('hostedAppState');
        title.textContent = a.name;
        state.textContent = a.id === 'the-pool' ? 'The Pool is coming to Stables, with trading on your Stables wallet.'
            : a.name + ' is installed. Its hosted page is being prepared.';
        W.navigate('hosted-app'); return true;
    }
    async function act(id) {
        const a = app(id), ac = a && action(a);
        if (!ac || ac.act === 'busy') return;
        if (ac.act === 'open') { open(a); return; }
        _thirdPartyRun[id] = { phase: 'downloading', note: '' }; refresh();
        try { await P.install(id, percent => { _thirdPartyRun[id].note = 'Installing ' + Math.max(0, Math.min(100, Number(percent) || 0)) + '%'; refresh(); });
            _thirdPartyRun[id] = {}; refresh(); }
        catch (e) { _thirdPartyRun[id] = { note: e.message || 'Try the installation again.' }; refresh(); }
    }
    let hold = null, openingClickUntil = 0, openedPointer = null, infoOpener = null;
    function cancelHold(suppress) {
        if (!hold) return;
        clearTimeout(hold.timer); cancelAnimationFrame(hold.scrollFrame);
        if (suppress || hold.armed || hold.opened) openingClickUntil = Date.now() + 650;
        if (hold.ghost) hold.ghost.remove();
        hold.target.classList.remove('is-lifted');
        try { if (hold.target.hasPointerCapture(hold.pointer)) hold.target.releasePointerCapture(hold.pointer); } catch (_) {}
        document.querySelectorAll('#installedAppsList .is-drop-target').forEach(e => e.classList.remove('is-drop-target'));
        document.getElementById('installedAppsList').classList.remove('is-arranging');
        hold = null;
        if (refreshPending) refresh();
    }
    function closeInfo() {
        W.closeModal('hostedAppInfoModal');
        if (infoOpener && infoOpener.isConnected && infoOpener.getClientRects().length) infoOpener.focus();
    }
    function showInfo(id, opener) {
        const a = app(id); if (!a) return;
        infoOpener = (opener && opener.isConnected ? opener : null) || document.querySelector('#page-apps [data-third-party-app="' + id + '"]');
        document.getElementById('hostedAppInfoTitle').textContent = a.name;
        document.getElementById('hostedAppInfoContent').innerHTML = '<img class="mx-icon mx-launcher__image" data-size="application" src="' + esc(icon(a)) + '" alt="">'
            + '<p class="xs">Publisher: ' + esc(a.publisher) + '</p>'
            + (a.package.version ? '<p class="xs">Version: ' + esc(a.package.version) + '</p>' : '')
            + '<p class="xs">' + esc(a.summary) + '</p>'
            + '<button type="button" class="btn btn-link-action mx-action" data-role="quiet" data-third-party-about="' + esc(a.id) + '" onclick="stablesThirdPartyAbout(\'' + esc(a.id) + '\')">About</button>';
        W.openModal('hostedAppInfoModal');
        document.querySelector('#hostedAppInfoModal .mx-screen-back').focus();
    }
    function wireInfo() {
        const page = document.getElementById('page-apps');
        const rows = document.getElementById('installedAppsList');
        const target = e => e.target.closest && e.target.closest('.mx-launcher__icon[data-third-party-app]');
        function markDestination(state) {
            const cell = document.elementFromPoint(state.x, state.y)?.closest('#installedAppsList [data-app-slot]');
            rows.querySelectorAll('.is-drop-target').forEach(e => e.classList.remove('is-drop-target'));
            state.destination = cell ? Number(cell.dataset.appSlot) : null;
            if (cell) cell.classList.add('is-drop-target');
        }
        function autoScroll(state) {
            if (hold !== state || !state.armed) return;
            if (state.moved) {
                const area = page.closest('.scroll-area'), r = area && area.getBoundingClientRect();
                if (r) { const dy = state.y < r.top + 36 ? -12 : state.y > r.bottom - 36 ? 12 : 0; if (dy) { area.scrollTop += dy; markDestination(state); } }
            }
            state.scrollFrame = requestAnimationFrame(() => autoScroll(state));
        }
        function lift(state) {
            if (hold !== state) return;
            state.armed = true;
            state.ghost = state.target.closest('.mx-launcher-item').cloneNode(true);
            state.ghost.classList.add('mx-launcher-ghost'); state.ghost.setAttribute('aria-hidden', 'true'); state.ghost.inert = true;
            state.ghost.style.left = state.x + 'px'; state.ghost.style.top = state.y + 'px';
            document.body.appendChild(state.ghost); state.target.classList.add('is-lifted'); rows.classList.add('is-arranging');
            try { state.target.setPointerCapture(state.pointer); } catch (_) {}
            autoScroll(state);
        }
        page.addEventListener('contextmenu', e => { const b = target(e); if (!b) return; e.preventDefault(); cancelHold(); showInfo(b.dataset.thirdPartyApp, b); });
        page.addEventListener('keydown', e => {
            const b = target(e); if (!b) return;
            if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); cancelHold(true); showInfo(b.dataset.thirdPartyApp, b); return; }
            if (e.altKey && rows.contains(b) && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
                e.preventDefault(); cancelHold(true);
                const id = b.dataset.thirdPartyApp, from = positions().indexOf(id), cols = columns(rows);
                const delta = { ArrowLeft:-1, ArrowRight:1, ArrowUp:-cols, ArrowDown:cols }[e.key];
                if (moveApp(id, from + delta)) rows.querySelector('[data-third-party-app="' + id + '"]')?.focus();
            }
        });
        page.addEventListener('pointerdown', e => {
            if (hold && hold.pointer !== e.pointerId) { cancelHold(true); return; }
            const b = target(e); if (!b || e.button !== 0 || !e.isPrimary) return;
            cancelHold();
            const state = { pointer: e.pointerId, x: e.clientX, y: e.clientY, startX:e.clientX, startY:e.clientY, target: b, installed:rows.contains(b), destination:null };
            state.timer = setTimeout(() => { if (hold !== state) return; if (state.installed) lift(state); else { state.opened = true; openedPointer = state.pointer; showInfo(b.dataset.thirdPartyApp, b); } }, state.installed ? 400 : 500);
            hold = state;
        });
        document.addEventListener('pointermove', e => {
            if (!hold || e.pointerId !== hold.pointer) return;
            const state = hold, distance = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
            if (!state.armed) { if (distance > 10) cancelHold(true); return; }
            state.x = e.clientX; state.y = e.clientY; if (distance > 10) state.moved = true;
            state.ghost.style.left = state.x + 'px'; state.ghost.style.top = state.y + 'px';
            if (state.moved) markDestination(state);
        }, { passive: true });
        document.addEventListener('pointerup', e => {
            if (!hold || e.pointerId !== hold.pointer) return;
            const state = hold;
            if (openedPointer === e.pointerId) openedPointer = null;
            cancelHold(state.armed || state.opened || state.moved);
            if (state.armed) {
                if (state.moved) { if (state.destination !== null) moveApp(state.target.dataset.thirdPartyApp, state.destination); }
                else showInfo(state.target.dataset.thirdPartyApp, state.target);
            }
        }, true);
        document.addEventListener('pointercancel', e => { if (hold && e.pointerId === hold.pointer) { openedPointer = null; cancelHold(true); } }, true);
        document.addEventListener('scroll', () => { if (hold && !hold.armed) cancelHold(true); }, { capture: true, passive: true });
        page.addEventListener('touchstart', e => { if (e.touches.length > 1) cancelHold(true); }, { passive: true });
        document.addEventListener('touchmove', e => { if (hold && hold.armed && e.touches.length === 1) e.preventDefault(); }, { passive:false });
        document.addEventListener('click', e => { if (Date.now() < openingClickUntil) { e.preventDefault(); e.stopImmediatePropagation(); openingClickUntil = 0; } }, true);
        W.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (hold) { e.preventDefault(); e.stopImmediatePropagation(); cancelHold(true); } else if (document.getElementById('hostedAppInfoModal').classList.contains('open')) { e.preventDefault(); e.stopImmediatePropagation(); closeInfo(); } }, true);
        new MutationObserver(() => { if (!document.getElementById('hostedAppInfoModal').classList.contains('open') && infoOpener && infoOpener.isConnected && infoOpener.getClientRects().length) infoOpener.focus(); }).observe(document.getElementById('hostedAppInfoModal'), { attributes: true, attributeFilter: ['class'] });
        new MutationObserver(() => { if (!page.classList.contains('active')) cancelHold(true); }).observe(page, { attributes:true, attributeFilter:['class'] });
        let lastWidth = rows.clientWidth;
        new ResizeObserver(() => { if (rows.clientWidth !== lastWidth) { lastWidth = rows.clientWidth; cancelHold(true); refresh(); } }).observe(rows);
        W.addEventListener('storage', e => { if (e.key === POSITION_KEY) { savedPositions = null; cancelHold(true); refresh(); } });
    }
    W.stablesAppInfo = showInfo;
    W.stablesCloseAppInfo = closeInfo;
    W.stablesHomeAppsTileHtml = tile;
    W.stablesThirdPartyLoad = load;
    W.stablesThirdPartyApp = app;
    W.stablesThirdPartyIcon = icon;
    W.stablesThirdPartyHasDownload = P.downloadable;
    W.stablesThirdPartyActionFor = id => app(id) ? action(app(id)) : null;
    W.stablesThirdPartyAction = action;
    W.stablesThirdPartyTileTap = id => { if (typeof _carouselQuietUntil === 'number' && Date.now() < _carouselQuietUntil) return; if (!open(app(id))) openPage(); };
    W.stablesOpenAppsPanel = openPage; // existing desktop event name; now a real page, never homeFolder
    W.stablesRenderAppsPanel = refresh;
    W.stablesThirdPartyRefresh = refresh;
    W.stablesThirdPartyAct = act;
    W.stablesThirdPartyAbout = id => { const a = app(id); if (a) W.stablesOpenExternalLink(a.web); };
    W.stablesAppsCatalogue = () => { catalogue = !catalogue; document.getElementById('appsCatalogueToggle').setAttribute('aria-expanded', String(catalogue)); refresh(); };
    W.stablesHostedPackageEvent = (id, phase, message) => W.dispatchEvent(new CustomEvent('stables-hosted-package', { detail: { id, phase, percent: parseInt(message, 10), message } }));
    document.addEventListener('DOMContentLoaded', () => { wireInfo(); load(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && _thirdPartyApps.length) P.refresh().then(refresh); });
})(window);
