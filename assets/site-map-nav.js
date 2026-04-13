/**
 * Previous / Next navigation — same order as All links (links.html):
 * Home → Playing Field → Circular economy → Banking system → Ambassador Program → All links (this hub).
 */
(function () {
  var ORDER = [
    { href: "https://stablescouncil.org/", label: "Home Page" },
    { href: "https://stablescouncil.org/playing_field.html", label: "The Playing Field" },
    { href: "https://stablescouncil.org/circulareconomy/", label: "Stables circular economy" },
    { href: "https://stablescouncil.org/bankingsystem/", label: "Our Banking System" },
    { href: "https://stablescouncil.org/ambassadorsprogramdesc.html", label: "Ambassador Program" },
    { href: "https://stablescouncil.org/links.html", label: "All links" },
  ];

  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        n.setAttribute(k, attrs[k]);
      });
    }
    return n;
  }

  function textSpan(cls, t) {
    var s = document.createElement("span");
    s.className = cls;
    s.textContent = t;
    return s;
  }

  function btnLink(href, dirLabel, targetLabel, primary) {
    var a = el("a", "btn " + (primary ? "btn-primary" : "btn-secondary"), {
      href: href,
      rel: "noopener noreferrer",
    });
    a.appendChild(textSpan("site-map-nav__dir", dirLabel));
    a.appendChild(textSpan("site-map-nav__target", targetLabel));
    return a;
  }

  function btnDisabled(dirLabel, targetLabel) {
    var s = el("span", "btn btn-secondary site-map-nav__disabled");
    s.setAttribute("aria-disabled", "true");
    s.appendChild(textSpan("site-map-nav__dir", dirLabel));
    s.appendChild(textSpan("site-map-nav__target", targetLabel));
    return s;
  }

  function resolvePrevNext(nav) {
    var role = (nav.getAttribute("data-site-map-role") || "").trim();
    if (role === "qr") {
      return { prev: ORDER[0], next: ORDER[1] };
    }
    var raw = nav.getAttribute("data-site-map-index");
    var idx = raw != null && raw !== "" ? parseInt(raw, 10) : NaN;
    if (isNaN(idx) || idx < 0 || idx >= ORDER.length) {
      return null;
    }
    var last = ORDER.length - 1;
    return {
      prev: idx === 0 ? null : ORDER[idx - 1],
      next: idx === last ? ORDER[0] : ORDER[idx + 1],
    };
  }

  function init() {
    var nav = document.getElementById("siteMapNav");
    if (!nav) return;
    var pair = resolvePrevNext(nav);
    if (!pair) return;

    nav.innerHTML = "";

    var row = el("div", "buttons site-map-nav__buttons");

    if (pair.prev) {
      row.appendChild(btnLink(pair.prev.href, "Previous", pair.prev.label, false));
    } else {
      row.appendChild(btnDisabled("Previous", "—"));
    }

    if (pair.next) {
      row.appendChild(btnLink(pair.next.href, "Next", pair.next.label, true));
    } else {
      row.appendChild(btnDisabled("Next", "—"));
    }

    nav.appendChild(row);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
