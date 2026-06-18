(function () {
  'use strict';

  function getScrollEl() {
    return document.getElementById('demoLaunchCardScroll');
  }

  function getHintEl() {
    return document.getElementById('demoLaunchScrollHint');
  }

  function updateDemoLaunchScrollHint() {
    var scrollEl = getScrollEl();
    var hint = getHintEl();
    if (!scrollEl || !hint) return;
    var scrollable = scrollEl.scrollHeight > scrollEl.clientHeight + 8;
    var atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 12;
    hint.hidden = !(scrollable && !atBottom);
  }

  function scrollDemoLaunchMore() {
    var scrollEl = getScrollEl();
    if (!scrollEl) return;
    var lead = scrollEl.querySelector('.demo-launch-lead');
    if (lead) {
      lead.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    scrollEl.scrollBy({ top: Math.round(scrollEl.clientHeight * 0.45), behavior: 'smooth' });
  }

  function openDemoLaunch(e) {
    if (e) e.preventDefault();
    var m = document.getElementById('demoLaunchModal');
    if (!m) return;
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () {
      updateDemoLaunchScrollHint();
      setTimeout(updateDemoLaunchScrollHint, 120);
    });
  }

  function closeDemoLaunch() {
    var m = document.getElementById('demoLaunchModal');
    if (!m) return;
    m.classList.remove('open');
    document.body.style.overflow = '';
  }

  window.openDemoLaunch = openDemoLaunch;
  window.closeDemoLaunch = closeDemoLaunch;

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDemoLaunch();
  });

  function initDemoLaunchModal() {
    var scrollEl = getScrollEl();
    var hint = getHintEl();
    if (scrollEl) {
      scrollEl.addEventListener('scroll', updateDemoLaunchScrollHint, { passive: true });
    }
    if (hint) {
      hint.addEventListener('click', scrollDemoLaunchMore);
    }
    window.addEventListener('resize', updateDemoLaunchScrollHint);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDemoLaunchModal);
  } else {
    initDemoLaunchModal();
  }
})();