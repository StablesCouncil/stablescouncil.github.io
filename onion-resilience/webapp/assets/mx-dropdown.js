/**
 * M-EL-DROPDOWN — the one dropdown.
 *
 * Founder ruling 2026-07-26: every dropdown in the app shows its options the way the Mint list
 * does — full-width rows, a generous target, the name on the left, a mark on the right showing
 * which one is chosen — and the app draws it, not the platform.
 *
 * WHY THE <select> STAYS IN THE PAGE
 * Thirty controls read their value with `getElementById(id).value`, and their behaviour hangs off
 * inline `onchange` attributes. Replacing the element would have meant rewriting all of that to
 * change how it LOOKS, which is the kind of change that breaks money paths for a visual reason.
 * So the select remains the source of truth: it keeps its id, its options, its value and every
 * handler already bound to it, and it is only hidden from view. Choosing a row sets `value` and
 * dispatches a bubbling `change`, so an inline handler fires exactly as it did before.
 *
 * A select opts in by carrying `data-mx-dropdown` in the authored markup. That is deliberate: it
 * makes the contract readable in the source and lets the audit tell an enhanced control apart from
 * a genuine platform-drawn one, which it could never do for a runtime-only enhancement.
 */
(function () {
  'use strict';

  var OPEN = null;

  function text(node) {
    return String(node && node.textContent != null ? node.textContent : '').trim();
  }

  function selectedOption(select) {
    return select.options[select.selectedIndex] || null;
  }

  function syncTrigger(dd) {
    var opt = selectedOption(dd.select);
    dd.label.textContent = opt ? text(opt) : '';
    var hint = opt ? String(opt.dataset.hint || '') : '';
    dd.hint.textContent = hint;
    dd.hint.hidden = !hint;
  }

  function buildPanel(dd) {
    var html = '';
    var kids = dd.select.children;
    for (var i = 0; i < kids.length; i++) {
      var node = kids[i];
      if (node.tagName === 'OPTGROUP') {
        html += '<div class="mx-dropdown__group">' + escapeHtml(node.label) + '</div>';
        for (var j = 0; j < node.children.length; j++) html += optionRow(node.children[j], dd);
      } else if (node.tagName === 'OPTION') {
        html += optionRow(node, dd);
      }
    }
    dd.panel.innerHTML = html;
  }

  function escapeHtml(v) {
    return String(v == null ? '' : v)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  function optionRow(opt, dd) {
    var on = opt.value === dd.select.value;
    var hint = String(opt.dataset.hint || '');
    return '<button type="button" role="option" class="mx-dropdown__option"'
      + ' aria-selected="' + (on ? 'true' : 'false') + '"'
      + (opt.disabled ? ' aria-disabled="true"' : '')
      + ' data-value="' + escapeHtml(opt.value) + '" tabindex="-1">'
      + '<span class="mx-dropdown__option-label">' + escapeHtml(text(opt)) + '</span>'
      + '<small class="mx-dropdown__option-value">' + escapeHtml(hint) + '</small>'
      + '<span class="mx-dropdown__tick" aria-hidden="true"></span>'
      + '</button>';
  }

  function close(dd) {
    if (!dd) return;
    dd.panel.hidden = true;
    dd.trigger.setAttribute('aria-expanded', 'false');
    if (OPEN === dd) OPEN = null;
  }

  function open(dd) {
    if (dd.select.disabled) return;
    if (OPEN && OPEN !== dd) close(OPEN);
    buildPanel(dd);
    dd.panel.hidden = false;
    dd.trigger.setAttribute('aria-expanded', 'true');
    OPEN = dd;
    var active = dd.panel.querySelector('[aria-selected="true"]') || dd.panel.querySelector('.mx-dropdown__option');
    if (active) {
      active.setAttribute('data-active', '');
      try { active.scrollIntoView({ block: 'nearest' }); } catch (_) { /* ignore */ }
    }
  }

  function choose(dd, value) {
    if (dd.select.value === value) { close(dd); return; }
    dd.select.value = value;
    syncTrigger(dd);
    close(dd);
    // Bubbling, so an inline onchange on the select runs exactly as before.
    dd.select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function moveActive(dd, step) {
    var rows = Array.prototype.slice.call(dd.panel.querySelectorAll('.mx-dropdown__option:not([aria-disabled="true"])'));
    if (!rows.length) return;
    var at = rows.findIndex(function (r) { return r.hasAttribute('data-active'); });
    var next = at < 0 ? 0 : Math.min(rows.length - 1, Math.max(0, at + step));
    rows.forEach(function (r) { r.removeAttribute('data-active'); });
    rows[next].setAttribute('data-active', '');
    try { rows[next].scrollIntoView({ block: 'nearest' }); } catch (_) { /* ignore */ }
  }

  function typeAhead(dd, ch) {
    var rows = Array.prototype.slice.call(dd.panel.querySelectorAll('.mx-dropdown__option'));
    var hit = rows.find(function (r) {
      return text(r.querySelector('.mx-dropdown__option-label')).toLowerCase().startsWith(ch.toLowerCase());
    });
    if (!hit) return;
    rows.forEach(function (r) { r.removeAttribute('data-active'); });
    hit.setAttribute('data-active', '');
    try { hit.scrollIntoView({ block: 'nearest' }); } catch (_) { /* ignore */ }
  }

  function enhance(select) {
    if (!select || select.dataset.mxDropdownReady === '1') return;
    select.dataset.mxDropdownReady = '1';

    var wrap = document.createElement('div');
    wrap.className = 'mx-dropdown';
    /* The wrapper replaces the select in normal flow, so it inherits every registered `ui-*`
       layout utility from the source element. Copying only `ui-row-control` fixed width in one
       setting row but silently dropped margins everywhere else, including the 16px space between
       Mint's asset picker and its Mint/Burn selector. The native select remains visually hidden;
       the wrapper now owns its complete authored layout contract. */
    select.classList.forEach(function (name) {
      if (name.indexOf('ui-') === 0) wrap.classList.add(name);
    });
    wrap.setAttribute('data-content', 'plain');

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'mx-dropdown__trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    var aria = select.getAttribute('aria-label') || select.getAttribute('title');
    if (aria) trigger.setAttribute('aria-label', aria);

    var value = document.createElement('span');
    value.className = 'mx-dropdown__value';
    var label = document.createElement('strong');
    var hint = document.createElement('small');
    hint.hidden = true;
    value.appendChild(label);
    value.appendChild(hint);

    var mark = document.createElement('span');
    mark.className = 'mx-dropdown__mark';
    mark.setAttribute('aria-hidden', 'true');
    trigger.appendChild(value);
    trigger.appendChild(mark);

    var panel = document.createElement('div');
    panel.className = 'mx-dropdown__panel';
    panel.setAttribute('role', 'listbox');
    panel.hidden = true;

    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    wrap.appendChild(select);
    select.classList.add('app-visually-hidden');
    // The select keeps its own layout out of the flow but stays focusable for assistive tech that
    // prefers the native control.
    select.setAttribute('tabindex', '-1');

    var dd = { select: select, wrap: wrap, trigger: trigger, panel: panel, label: label, hint: hint };
    select.__mxDropdown = dd;

    trigger.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (panel.hidden) open(dd); else close(dd);
    });

    trigger.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (panel.hidden) open(dd); else moveActive(dd, ev.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (panel.hidden) return;
      if (ev.key === 'Enter' || ev.key === ' ') {
        var act = panel.querySelector('[data-active]');
        if (act) { ev.preventDefault(); choose(dd, act.dataset.value); }
        return;
      }
      if (ev.key === 'Escape') { ev.preventDefault(); close(dd); trigger.focus(); return; }
      if (ev.key === 'Home') { ev.preventDefault(); moveActive(dd, -999); return; }
      if (ev.key === 'End') { ev.preventDefault(); moveActive(dd, 999); return; }
      if (ev.key.length === 1) typeAhead(dd, ev.key);
    });

    panel.addEventListener('click', function (ev) {
      var row = ev.target.closest('.mx-dropdown__option');
      if (!row || row.getAttribute('aria-disabled') === 'true') return;
      ev.preventDefault();
      ev.stopPropagation();
      choose(dd, row.dataset.value);
      trigger.focus();
    });

    // Options and value can both change from code (a currency list rebuilt, a preference restored).
    // Mirror it rather than assume the authored markup is the whole story.
    try {
      new MutationObserver(function () {
        syncTrigger(dd);
        if (!panel.hidden) buildPanel(dd);
      }).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });
    } catch (_) { /* ignore */ }
    select.addEventListener('change', function () { syncTrigger(dd); buildPanel(dd); });

    syncTrigger(dd);
    // Build the rows now rather than only on open. They then exist in the page whether or not the
    // panel is showing, which is what lets the catalogue capture the OPEN list as a real specimen
    // instead of an empty box, and what lets assistive technology read the options at any time.
    buildPanel(dd);
  }

  function scan(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('select[data-mx-dropdown]').forEach(enhance);
  }

  document.addEventListener('click', function (ev) {
    if (!OPEN) return;
    if (ev.target.closest('.mx-dropdown')) return;
    close(OPEN);
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && OPEN) close(OPEN);
  });

  window.stablesSyncDropdowns = scan;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(document); });
  else scan(document);

  /* Enhancement follows the DOM, not a clock.
     This used to be a 500ms interval that gave up after twenty passes, on the reasoning that pages
     build their controls when first opened. Ten seconds is a guess, and it was wrong: Ambassador,
     My shop and Feedback build their forms on first visit, so a person who reached any of them more
     than ten seconds after launch got NINE native selects and, on Android, the operating system's
     own list - while the static gate read `data-mx-dropdown` in the markup and counted them as
     app-drawn. Opting in is intent; the observer is what makes it true. */
  try {
    new MutationObserver(function (records) {
      for (var r = 0; r < records.length; r++) {
        var added = records[r].addedNodes;
        for (var n = 0; n < added.length; n++) {
          var node = added[n];
          if (!node || node.nodeType !== 1) continue;
          if (node.matches && node.matches('select[data-mx-dropdown]')) enhance(node);
          else if (node.querySelectorAll) scan(node);
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {
    // No observer: fall back to the old settle passes rather than leave controls native.
    var passes = 0;
    var settle = setInterval(function () {
      scan(document);
      if (++passes > 20) clearInterval(settle);
    }, 500);
  }
})();
