(function () {
  function slug(value, fallback) {
    var cleaned = value.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return cleaned || fallback;
  }

  function init(outline) {
    var selector = outline.getAttribute("data-heading-selector") || "main h2";
    var target = outline.querySelector("[data-document-outline-links]");
    if (!target) return;

    var used = {};
    var headings = Array.prototype.slice.call(document.querySelectorAll(selector));
    headings.forEach(function (heading, index) {
      if (!heading.id) {
        var base = slug(heading.textContent.trim(), "section-" + (index + 1));
        var id = base;
        var count = 2;
        while (used[id] || document.getElementById(id)) id = base + "-" + count++;
        heading.id = id;
      }
      used[heading.id] = true;
      var link = document.createElement("a");
      link.href = "#" + heading.id;
      link.textContent = heading.textContent.trim();
      target.appendChild(link);
    });

    if (!headings.length) outline.hidden = true;
  }

  function start() {
    document.querySelectorAll("[data-document-outline]").forEach(init);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
}());
