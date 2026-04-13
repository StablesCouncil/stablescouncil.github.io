/**
 * Eleventy: builds selected pages from ./src into the site root for GitHub Pages.
 * Run: npm install && npm run build
 *
 * playing_field.html is hand-maintained at repo root (not emitted here).
 */
module.exports = function (eleventyConfig) {
  /* Root assets (stables.css, assets/, brand/, …) stay in the repo; only templates are compiled here. */

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: ".",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
