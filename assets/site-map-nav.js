/**
 * Previous / Next navigation for the public narrative and Council sequences.
 */
(function () {
  var SEQUENCES = {
    public: {
      wrap: true,
      items: [
        { href: "/", label: "Home Page" },
        { href: "/playing_field.html", label: "The Playing Field" },
        { href: "/circulareconomy.html", label: "Stables circular economy" },
        { href: "/bankingsystem.html", label: "Our Banking System" },
        { href: "/ambassadorsprogramdesc.html", label: "Ambassador Program" },
        { href: "/links.html", label: "All links" },
        { href: "/onchain-watch.html", label: "Minima Onchain Watch" },
      ],
    },
    council: {
      wrap: false,
      items: [
        { href: "/links.html", label: "Website map" },
        { href: "/council_navigation_system.html", label: "Navigation System" },
        { href: "/council_dashboard.html", label: "Dashboard" },
        { href: "/test-dashboard.html", label: "Test Channel Monitor" },
        { href: "/communication_plan.html", label: "Communication Plan" },
        { href: null, label: "Constitutional Charter", status: "Drafting" },
      ],
    },
  };

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

  function btnDisabled(dirLabel, targetLabel, status) {
    var s = el("span", "btn btn-secondary site-map-nav__disabled");
    s.setAttribute("aria-disabled", "true");
    s.appendChild(textSpan("site-map-nav__dir", dirLabel));
    s.appendChild(textSpan("site-map-nav__target", targetLabel));
    if (status) s.appendChild(textSpan("site-map-nav__status", status));
    return s;
  }

function resolvePrevNext(nav) {
    var sequenceName = nav.getAttribute("data-site-map-sequence") || "public";
    var sequence = SEQUENCES[sequenceName];
    if (!sequence) return null;
    var order = sequence.items;
    var raw = nav.getAttribute("data-site-map-index");
    var idx = raw != null && raw !== "" ? parseInt(raw, 10) : NaN;
    if (isNaN(idx) || idx < 0 || idx >= order.length) {
      return null;
    }
    var last = order.length - 1;
    return {
      prev: idx === 0 ? (sequence.wrap ? order[last] : null) : order[idx - 1],
      next: idx === last ? (sequence.wrap ? order[0] : null) : order[idx + 1],
    };
  }

  function init() {
    var nav = document.getElementById("siteMapNav");
    if (!nav) return;
    var pair = resolvePrevNext(nav);
    if (!pair) return;

    nav.innerHTML = "";

    var row = el("div", "buttons site-map-nav__buttons");

    if (pair.prev && pair.prev.href) {
      row.appendChild(btnLink(pair.prev.href, "Previous", pair.prev.label, false));
    } else if (pair.prev) {
      row.appendChild(btnDisabled("Previous", pair.prev.label, pair.prev.status));
    } else {
      row.appendChild(btnDisabled("Previous", " - "));
    }

    if (pair.next && pair.next.href) {
      row.appendChild(btnLink(pair.next.href, "Next", pair.next.label, true));
    } else if (pair.next) {
      row.appendChild(btnDisabled("Next", pair.next.label, pair.next.status));
    } else {
      row.appendChild(btnDisabled("Next", " - "));
    }

    nav.appendChild(row);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
