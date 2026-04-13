/**
 * Section dots for #navDotsRail + IntersectionObserver (presentation / links parity).
 * Sections: body[data-rail-sections] as a selector, else #main-content section[data-links-section], else .container > section, else all section.
 */
(function () {
  function querySections() {
    var sel = document.body.getAttribute("data-rail-sections");
    var n;
    if (sel) {
      try {
        n = document.querySelectorAll(sel);
      } catch (e) {
        n = null;
      }
    }
    if (!n || !n.length) {
      n = document.querySelectorAll("#main-content section[data-links-section]");
    }
    if (!n || !n.length) {
      n = document.querySelectorAll(".container > section");
    }
    if (!n || !n.length) {
      n = document.querySelectorAll("section");
    }
    return n;
  }

  function initRailDots() {
    var rail = document.getElementById("navDotsRail");
    if (!rail) return;
    var sections = querySections();
    rail.innerHTML = "";
    if (!sections.length) {
      rail.setAttribute("aria-hidden", "true");
      return;
    }
    rail.removeAttribute("aria-hidden");
    var dots = [];
    var addVisible = document.body.getAttribute("data-rail-add-visible") === "1";

    sections.forEach(function (section, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "site-chrome-nav-dot" + (i === 0 ? " active" : "");
      dot.setAttribute("aria-label", "Go to section " + (i + 1));
      dot.addEventListener("click", function () {
        section.scrollIntoView({ behavior: "smooth" });
      });
      rail.appendChild(dot);
      dots.push(dot);
    });

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          if (addVisible) {
            entry.target.classList.add("visible");
          }
          var index = Array.prototype.indexOf.call(sections, entry.target);
          if (index < 0) return;
          dots.forEach(function (d, j) {
            d.classList.toggle("active", j === index);
          });
        });
      },
      { threshold: 0.35 }
    );
    Array.prototype.forEach.call(sections, function (section) {
      observer.observe(section);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRailDots);
  } else {
    initRailDots();
  }
})();
