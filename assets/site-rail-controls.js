/**
 * Globe / share menus for pages using site-chrome-side-rail (onclick handlers).
 * Shared by links.html, index.html, and other static pages.
 */
var STABLES_SHARE_TEXT =
  "Stables | Be your bank - Money that is truly yours. Secure, Pseudonymous and Unstoppable.";

function toggleLangMenu() {
  var menu = document.getElementById("langMenu");
  if (menu) menu.classList.toggle("active");
}

function toggleShareMenu() {
  var menu = document.getElementById("shareMenu");
  if (menu) menu.classList.toggle("active");
}

function closeShareMenu() {
  var menu = document.getElementById("shareMenu");
  if (menu) menu.classList.remove("active");
}

function closeLangMenu() {
  var menu = document.getElementById("langMenu");
  if (menu) menu.classList.remove("active");
}

/** From links / map pages: set presentation language and open the home presentation. */
function goPresentationLang(code) {
  try {
    localStorage.setItem("stables_lang", code);
  } catch (e) {}
  closeLangMenu();
  var base = window.location.origin;
  if (!base || base === "null" || base.indexOf("file:") === 0) {
    base = "https://stablescouncil.org";
  }
  window.location.href = base + "/";
}

/**
 * Optional: try native share on mobile, then fall back to the rail share menu.
 * Assign to window.handleShareMenu on pages that want this behaviour.
 */
function handleShareMenu() {
  var url = window.location.href;
  var title = "Stables | Be your bank";
  var text = STABLES_SHARE_TEXT;

  if (navigator.share) {
    navigator
      .share({ title: title, text: text, url: url })
      .then(function () {})
      .catch(function (err) {
        if (err && err.name !== "AbortError") {
          toggleShareMenu();
        }
      });
    return;
  }
  toggleShareMenu();
}

function shareToTwitter() {
  var url = encodeURIComponent(window.location.href);
  var text = encodeURIComponent(STABLES_SHARE_TEXT);
  window.open(
    "https://twitter.com/intent/tweet?url=" + url + "&text=" + text,
    "_blank",
    "width=550,height=420"
  );
  closeShareMenu();
}

function shareToFacebook() {
  var url = encodeURIComponent(window.location.href);
  window.open(
    "https://www.facebook.com/sharer/sharer.php?u=" + url,
    "_blank",
    "width=550,height=420"
  );
  closeShareMenu();
}

function shareToLinkedIn() {
  var url = encodeURIComponent(window.location.href);
  window.open(
    "https://www.linkedin.com/sharing/share-offsite/?url=" + url,
    "_blank",
    "width=550,height=420"
  );
  closeShareMenu();
}

function shareToWhatsApp() {
  var url = encodeURIComponent(window.location.href);
  var text = encodeURIComponent(STABLES_SHARE_TEXT + " ");
  window.open("https://wa.me/?text=" + text + url, "_blank");
  closeShareMenu();
}

function shareToTelegram() {
  var url = encodeURIComponent(window.location.href);
  var text = encodeURIComponent(STABLES_SHARE_TEXT);
  window.open("https://t.me/share/url?url=" + url + "&text=" + text, "_blank");
  closeShareMenu();
}

function copyLink() {
  var url = window.location.href;
  var menu = document.getElementById("shareMenu");
  var btn = menu ? menu.querySelector("button:last-child") : null;
  var originalHtml = btn ? btn.innerHTML : "";

  function finishOk() {
    if (btn) {
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';
      setTimeout(function () {
        btn.innerHTML = originalHtml;
        closeShareMenu();
      }, 2000);
    } else {
      closeShareMenu();
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(finishOk).catch(function () {
      fallbackCopy();
    });
  } else {
    fallbackCopy();
  }

  function fallbackCopy() {
    try {
      var ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      finishOk();
    } catch (err) {
      if (btn) btn.innerHTML = originalHtml;
      alert("Could not copy link.");
      closeShareMenu();
    }
  }
}

document.addEventListener("click", function (event) {
  if (!event.target.closest(".lang-switcher")) {
    closeLangMenu();
  }
  if (!event.target.closest(".share-switcher")) {
    closeShareMenu();
  }
});

/** Scroll-hide / scroll-show header (app-style behaviour). */
(function () {
  var header = null;
  var lastY = 0;
  var ticking = false;
  var THRESHOLD = 6; // px minimum scroll delta before triggering

  function init() {
    header = document.querySelector(".site-chrome-header");
    if (!header) return;
    lastY = window.scrollY || 0;
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  function update() {
    ticking = false;
    if (!header) return;
    var y = window.scrollY || 0;
    var delta = y - lastY;
    if (Math.abs(delta) < THRESHOLD) return;
    if (delta > 0 && y > 60) {
      header.classList.add("site-chrome-header--hidden");
    } else {
      header.classList.remove("site-chrome-header--hidden");
    }
    lastY = y;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
