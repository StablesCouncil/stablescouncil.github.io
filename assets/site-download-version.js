// Single source of truth for the public "Download" button on the website.
//
// PUBLISHED_DEMO_VERSION is the latest demo MiniDapp package that actually exists
// in /dapp/latest-version/. Bump this ONE value when a new .mds.zip is published and
// every element marked with data-demo-download updates its label and link automatically,
// and every element marked with data-demo-published-version shows the published label (e.g. links hub badge).
//
// Note: this tracks the DOWNLOADABLE (published) package, not the dev line in
// dapp/2-demo/ (which may be ahead). Only bump after the new zip is in latest-version/.
(function () {
  var PUBLISHED_DEMO_VERSION = '0.0.0.3.42';
  var ZIP_PATH = '/dapp/latest-version/Stables_v' + PUBLISHED_DEMO_VERSION + '.mds.zip';

  function apply() {
    var downloadNodes = document.querySelectorAll('[data-demo-download]');
    for (var i = 0; i < downloadNodes.length; i++) {
      downloadNodes[i].setAttribute('href', ZIP_PATH);
      downloadNodes[i].textContent = 'Download v' + PUBLISHED_DEMO_VERSION;
    }
    var versionNodes = document.querySelectorAll('[data-demo-published-version]');
    for (var j = 0; j < versionNodes.length; j++) {
      versionNodes[j].textContent = 'v' + PUBLISHED_DEMO_VERSION;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
