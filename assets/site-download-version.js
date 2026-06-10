// Single source of truth for the public "Download" button on the website.
//
// PUBLISHED_DEMO_VERSION is the latest demo MiniDapp package that actually exists
// in /dapp/latest-version/. Bump this ONE value when a new .mds.zip is published and
// every element marked with data-demo-download updates its label and link automatically.
//
// Note: this tracks the DOWNLOADABLE (published) package, not the dev line in
// dapp/2-demo/ (which may be ahead). Only bump after the new zip is in latest-version/.
(function () {
  var PUBLISHED_DEMO_VERSION = '0.0.0.2.16';
  var ZIP_PATH = '/dapp/latest-version/Stables_v' + PUBLISHED_DEMO_VERSION + '.mds.zip';

  function apply() {
    var nodes = document.querySelectorAll('[data-demo-download]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute('href', ZIP_PATH);
      nodes[i].textContent = 'Download v' + PUBLISHED_DEMO_VERSION;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
