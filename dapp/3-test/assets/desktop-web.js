/*
 * Desktop web shell, second generation (founder direction 2026-08-09).
 *
 * Mounts the desktop application shell on the WEB SURFACE ONLY at >=1024px: a fixed right
 * sidebar carrying the app's own brand block, its own More-drawer as the navigation, and its
 * own status cluster. Nothing is rebuilt and nothing new is offered: the three nodes are MOVED,
 * with placeholders recorded so the mobile composition is restored exactly when the shell
 * unmounts (narrow window, or a surface that is not webapp). P2: a wider screen arranges
 * differently, it never offers differently.
 *
 * It also stamps every page with its assigned desktop treatment (data-dw + --dw-max). The
 * assignment of record lives in work/Machinery/projects/stables-desktop-web/desktop-web.v1.json;
 * the desktop audit compares these stamps against that registry, so this map cannot drift from
 * the registered one without a gate failing.
 *
 * The APK bridge can declare itself late (DOMContentLoaded), so the surface is re-read on every
 * sync and the shell never mounts for 'apk' or 'dapp'.
 */
(function () {
  'use strict';

  /* Route -> treatment. max is the measured column for focus pages; null means the treatment's
     own CSS decides. Measured from the mobile content, not inferred from page names. */
  var TREATMENTS = {
    'wallet': { t: 'home' },
    'mint': { t: 'task' },
    'exchange': { t: 'task' },
    'settings-legal': { t: 'document' },
    /* form: a 560px task-measure column. Fields and the commit action share one column edge,
       so a full-layout action spans exactly what the fields span (the alignment law). */
    'faucet': { t: 'form' },
    'invoice': { t: 'form' },
    'feedback': { t: 'form' },
    'my-shop': { t: 'form' },
    'ambassador': { t: 'form' },
    'settings-profile': { t: 'form' },
    'settings-updates': { t: 'form' },
    'settings-security': { t: 'form' },
    'wallet-management': { t: 'form' },
    /* focus: ONE reading measure for every single-column page (founder ruling 2026-08-09:
       a different width per page is structure that brings only confusion). 720 is the
       registered P4 reading maximum; wide media scrolls inside it. */
    'activity': { t: 'focus' },
    'treasury': { t: 'focus' },
    'invest': { t: 'focus' },
    'portfolio-simulator': { t: 'focus' },
    'onoff-ramp': { t: 'focus' },
    'council-comms': { t: 'focus' },
    'contacts': { t: 'focus' },
    'spend': { t: 'focus' },
    'chat': { t: 'workstation' }, /* two-pane: contacts list beside the conversation */
    'council': { t: 'focus' },
    'help-academy': { t: 'focus' },
    'help-links': { t: 'focus' },
    'apps': { t: 'focus' },
    'hosted-app': { t: 'focus' }
  };

  var mounted = false;
  var moved = []; /* { node, placeholder } in mount order */
  var media = window.matchMedia ? window.matchMedia('(min-width: 1024px)') : null;

  function surface() {
    return document.documentElement.getAttribute('data-stables-surface') || '';
  }

  function stampTreatments() {
    Object.keys(TREATMENTS).forEach(function (route) {
      var page = document.getElementById('page-' + route);
      if (!page) return;
      var spec = TREATMENTS[route];
      page.setAttribute('data-dw', spec.t);
      if (spec.max) page.style.setProperty('--dw-max', spec.max);
    });
  }

  function adopt(node, slot) {
    if (!node || !slot) return;
    var placeholder = document.createComment('dw-slot');
    node.parentNode.insertBefore(placeholder, node);
    slot.appendChild(node);
    moved.push({ node: node, placeholder: placeholder });
  }

  /* The menu collapses to an icon rail (founder 2026-08-09: only the page icons and the logo).
     The preference survives reloads; the toggle lives in the sidebar, outside every page, so
     the page-scoped capability comparison is untouched. */
  var COLLAPSE_KEY = 'stables_dw_menu_collapsed';


  function mount() {
    if (mounted) return;
    var brand = document.querySelector('.topbar .brand');
    var drawer = document.getElementById('drawer');
    var trailing = document.querySelector('.topbar-trailing');
    var version = document.getElementById('drawerVersionStatus');
    var langSwitcher = document.querySelector('#drawer .drawer-lang-bar .app-lang-switcher');
    if (!drawer) return; /* nothing to build a navigation from */

    try {
      if (localStorage.getItem(COLLAPSE_KEY) === '1') {
        document.documentElement.classList.add('dw-collapsed');
      }
    } catch (_) { /* no storage: the menu simply starts expanded */ }

    var sidebar = document.createElement('aside');
    sidebar.id = 'dwSidebar';
    sidebar.setAttribute('aria-label', 'Navigation');
    document.body.insertBefore(sidebar, document.body.firstChild);

    adopt(brand, sidebar);
    adopt(drawer, sidebar);

    /* The mobile bootstrap can establish Wallet before its first navigate() call. Seed the
       rail's current-page contract from the active page so the selected label is truthful from
       the first desktop paint; later navigation keeps using the canonical navigate() updater. */
    if (!drawer.querySelector('.ditem[aria-current]')) {
      var activePage = document.querySelector('.page.active[id^="page-"]');
      var activeRoute = activePage ? activePage.id.slice(5) : 'wallet';
      var activeRow = drawer.querySelector('.ditem[data-menu-destination="' + activeRoute + '"]');
      if (activeRow) activeRow.setAttribute('aria-current', 'page');
    }

    /* D031: language is one ordinary Preferences item, not a quick control in the rail head.
       Move the existing switcher and its existing menu, so language state and handlers remain
       the single mobile source of truth. */
    var preferences = Array.prototype.find.call(drawer.querySelectorAll('.dsect'), function (section) {
      var title = section.querySelector('.dsect-t');
      return title && title.textContent.trim() === 'Preferences';
    });
    if (preferences && langSwitcher) {
      var langItem = document.createElement('div');
      langItem.className = 'ditem dw-language-item';
      langItem.setAttribute('data-desktop-preference', 'language');
      adopt(langSwitcher, langItem);
      var info = document.createElement('div');
      info.className = 'dinfo';
      info.innerHTML = '<div class="dname">Language</div><div class="ddesc">Choose the language used by Stables</div>';
      langItem.appendChild(info);
      preferences.appendChild(langItem);
      moved.push({ node: langItem, placeholder: null });
    }

    /* D031: connection truth and the full version status form the rail footer, with version
       last. Both are the app's existing controls, moved with exact restoration placeholders. */
    var footer = document.createElement('div');
    footer.id = 'dwSidebarFooter';
    sidebar.appendChild(footer);
    adopt(trailing, footer);
    adopt(version, footer);
    moved.push({ node: footer, placeholder: null });

    /* A collapsed row is icon-only; its name follows the pointer as an instant flyout beside
       the rail (founder 2026-08-09). One fixed element on the body escapes the navigation's
       scroll clipping; it reads the row's own .dname, so it can never say the wrong name. */
    var tip = document.createElement('div');
    tip.id = 'dwTip';
    tip.hidden = true;
    document.body.appendChild(tip);
    moved.push({ node: tip, placeholder: null }); /* removed on unmount below */
    drawer.addEventListener('mouseover', function (event) {
      if (!document.documentElement.classList.contains('dw-collapsed')) { tip.hidden = true; return; }
      var row = event.target && event.target.closest ? event.target.closest('.ditem') : null;
      var name = row && row.querySelector('.dname');
      if (!row || !name) { tip.hidden = true; return; }
      var rect = row.getBoundingClientRect();
      tip.textContent = name.textContent.trim();
      tip.style.top = (rect.top + rect.height / 2) + 'px';
      tip.style.left = (rect.left - 12) + 'px';
      tip.hidden = false;
    });
    drawer.addEventListener('mouseleave', function () { tip.hidden = true; });
    drawer.addEventListener('click', function () { tip.hidden = true; });

    /* D031 two-click rail: collapsed, the first click on a different icon navigates and leaves
       the rail collapsed; the second click on that now-current icon expands it. Expanded, a
       click on the row already current collapses it. CAPTURE PHASE is load-bearing: the row's onclick
       navigates and moves aria-current to the clicked row before a bubble listener would run,
       which would make every row read as current and collapse on every navigation. */
    drawer.addEventListener('click', function (event) {
      var row = event.target && event.target.closest ? event.target.closest('.ditem') : null;
      if (!row) return;
      var collapsed = document.documentElement.classList.contains('dw-collapsed');
      if (collapsed) {
        if (row.getAttribute('aria-current')) {
          document.documentElement.classList.remove('dw-collapsed');
          try { localStorage.setItem(COLLAPSE_KEY, '0'); } catch (_) { /* ignore */ }
        }
        tip.hidden = true;
      } else if (row.getAttribute('aria-current')) {
        document.documentElement.classList.add('dw-collapsed');
        try { localStorage.setItem(COLLAPSE_KEY, '1'); } catch (_) { /* ignore */ }
      }
    }, true);

    document.documentElement.classList.add('dw-active');
    mounted = true;
  }

  function unmount() {
    if (!mounted) return;
    document.documentElement.classList.remove('dw-active');
    /* Restore in reverse so nested anchors resolve. An entry without a placeholder is a
       shell-owned element (the flyout tip): it is simply removed. */
    for (var i = moved.length - 1; i >= 0; i -= 1) {
      var m = moved[i];
      if (!m.placeholder) {
        if (m.node.parentNode) m.node.parentNode.removeChild(m.node);
        continue;
      }
      if (m.placeholder.parentNode) {
        m.placeholder.parentNode.insertBefore(m.node, m.placeholder);
        m.placeholder.parentNode.removeChild(m.placeholder);
      }
    }
    moved = [];
    var sidebar = document.getElementById('dwSidebar');
    if (sidebar && sidebar.parentNode) sidebar.parentNode.removeChild(sidebar);
    mounted = false;
  }

  /* Founder 2026-10-15: "On desktop we miss the eye to unblur, and let's have the home with the icons instead of the old
     menu, let's replicate what we have on mobile". The desktop shell (right sidebar, More-drawer navigation) is no
     longer mounted: a wide screen shows the same app as the phone, with Home's icons and the Wallet's eye. The shell
     code stays for a later desktop design; DESKTOP_SHELL turns it back on. */
  var DESKTOP_SHELL = false;
  function sync() {
    var wide = media ? media.matches : window.innerWidth >= 1024;
    if (DESKTOP_SHELL && wide && surface() === 'webapp') mount();
    else unmount();
    syncHomeCols();
  }

  /* THE WIDE HOME (founder 2026-10-15: "use the full width of the screen"; and "on the desktop's home page we need to
     have the same functionalities as on mobile, drag-drop page, create groups and so on"). Layout in desktop-wide.css.
     index.html asks stablesHomeCols() for the number of Home columns in every slot computation (placing, collision,
     the drop target under the pointer, Alt+arrows, the overview cards). On a phone it is 4. On a wide web window this
     replaces it with the columns that fit the frame: (frame width + gap) / (128 px minimum column + gap), at least 4.
     A slot is a place in reading order, so the saved arrangement reads row by row at either width, and every phone
     gesture (hold to lift, drop on a free place, join, groups, Hide from Home, Alt+arrows) works unchanged with a
     mouse; the mouse wiring (pointerType 'mouse', the same hold time) already exists in index.html.
     The count is published as --dw2-home-cols on <html> for the grid; a change of count (window resized) redraws Home.
     Phone and APK: wideHome() is false, the original function answers, nothing is published. */
  var HOME_MIN_COL = 128;  /* px, the column minimum: a 60 px icon and its name keep the phone's breathing room */
  var HOME_COL_GAP = 4;    /* px, the phone grid's own column gap (.page-grid gap: 18px 4px) */
  var FRAME = 1440;        /* px, --dw2-frame in desktop-wide.css */
  function wideHome() {
    var wide = media ? media.matches : window.innerWidth >= 1024;
    return wide && surface() === 'webapp';
  }
  function wideHomeCols() {
    /* innerWidth, not clientWidth: Home hides the page scrollbar, and the count must not flip when it does. */
    var vw = window.innerWidth;
    var gutter = Math.min(64, Math.max(32, window.innerWidth * 0.04)); /* clamp(32px, 4vw, 64px) */
    var frame = Math.min(FRAME, vw - 2 * gutter);
    return Math.max(4, Math.floor((frame + HOME_COL_GAP) / (HOME_MIN_COL + HOME_COL_GAP)));
  }
  var phoneHomeCols = null;
  var lastHomeCols = 4;
  function patchHome() {
    if (typeof window.stablesHomeCols !== 'function' || phoneHomeCols) return;
    phoneHomeCols = window.stablesHomeCols;
    window.stablesHomeCols = function () {
      if (!wideHome()) return phoneHomeCols();
      var cols = wideHomeCols();
      /* The grid's column count and the slot math are always the same number: publish it as it is asked. */
      if (document.documentElement.style.getPropertyValue('--dw2-home-cols') !== String(cols)) {
        document.documentElement.style.setProperty('--dw2-home-cols', String(cols));
      }
      return cols;
    };
    syncHomeCols();
  }
  function syncHomeCols() {
    if (!phoneHomeCols) return;
    var cols = window.stablesHomeCols();
    if (wideHome()) document.documentElement.style.setProperty('--dw2-home-cols', String(cols));
    else document.documentElement.style.removeProperty('--dw2-home-cols');
    if (cols === lastHomeCols) return;
    lastHomeCols = cols;
    var home = document.getElementById('pageCarousel');
    if (home && home.classList.contains('open') && typeof window.stablesRenderHome === 'function') {
      try { window.stablesRenderHome(); } catch (_) { /* drawn again on the next open */ }
    }
  }

  function init() {
    stampTreatments();
    patchHome();
    sync();
    if (media) {
      /* The Home column count follows the window width, not only the 1024 px boundary. */
      window.addEventListener('resize', syncHomeCols);
      if (typeof media.addEventListener === 'function') media.addEventListener('change', sync);
      else if (typeof media.addListener === 'function') media.addListener(sync);
    }
    /* The surface attribute is re-applied on DOMContentLoaded by the bootstrap; watch it so a
       late APK declaration tears the shell down rather than leaving a desktop shell in an APK. */
    try {
      new MutationObserver(sync).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-stables-surface']
      });
    } catch (_) { /* older engines: the media listener still governs width */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
