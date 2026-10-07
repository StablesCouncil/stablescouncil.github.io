// Single source of truth for what the website offers people to install.
//
// THE DEMO LINE IS SUPERSEDED. `PUBLISHED_DEMO_VERSION` was the demo MiniDapp in
// /dapp/latest-version/, and the site's Download button pointed straight at that zip. The demo is
// frozen and the test channel is the active line, so a button offering v0.0.0.3.45 was sending
// people to a build we no longer stand behind. The demo version is kept here because the links hub
// still labels the demo track honestly as superseded, but it is no longer a download target.
//
// THE TEST CHANNEL IS THE ACTIVE OFFER. The homepage carries Download for Android and a desktop
// QR code. The Android app itself asks whether to use its built-in node or Minima Core.
// /payment-app/ only redirects to /#download. /android/ starts the APK download for a scanned code.
//
// One published test version drives the coordinated downloads. DEMO_FROZEN_VERSION
// labels the historical demo separately; its name must not be used for current links.
//
// Bump PUBLISHED_DEMO_VERSION at publication, and keep the zip present at
// the path below. Elements are marked:
//   [data-demo-download]          a Download control, routed to the homepage download section
//   [data-demo-published-version] shows the demo label, e.g. the links hub badge
//   [data-test-channel-download]  a real link to the current test package
//   [data-test-channel-version]   the current test label and its truth statement
(function () {
  var PUBLISHED_DEMO_VERSION = '0.0.12.068';
  var TEST_CHANNEL_VERSION = PUBLISHED_DEMO_VERSION;
  /* The coordinated test release is three surfaces: one Android app, the MiniDapp and the web app.
     This one version drives the Android download
     ([data-android-test-download="standalone"]) and its version line
     ([data-android-test-version]). */
  // The frozen demo line, shown only as a label on the links hub Demo card. PUBLISHED_DEMO_VERSION
  // below tracks the published test iteration (release pointer rule), so it can no longer label the demo.
  var DEMO_FROZEN_VERSION = '0.0.0.3.45';
  var ANDROID_TEST_VERSION = PUBLISHED_DEMO_VERSION;
  var ANDROID_APK_URL = 'https://github.com/StablesCouncil/stables-app/releases/download/app-v'
    + ANDROID_TEST_VERSION + '/Stables_v' + ANDROID_TEST_VERSION + '.apk';
  var ACCESS_PAGE = '/#download';
  var TEST_ZIP_PATH = '/dapp/latest-version/Stables_v' + TEST_CHANNEL_VERSION + '.mds.zip';

  function apply() {
    // A general Download control opens the homepage section. The Android button is a direct APK link.
    var downloadNodes = document.querySelectorAll('[data-demo-download]');
    for (var i = 0; i < downloadNodes.length; i++) {
      downloadNodes[i].setAttribute('href', ACCESS_PAGE);
      downloadNodes[i].removeAttribute('download');
      downloadNodes[i].textContent = 'Get the app';
    }

    // The demo card names the frozen demo build; its Superseded pill says the rest (founder 2026-09-03:
    // no "superseded" beside the version).
    var versionNodes = document.querySelectorAll('[data-demo-published-version]');
    for (var j = 0; j < versionNodes.length; j++) {
      versionNodes[j].textContent = 'v' + DEMO_FROZEN_VERSION;
    }

    var testDownloadNodes = document.querySelectorAll('[data-test-channel-download]');
    for (var k = 0; k < testDownloadNodes.length; k++) {
      testDownloadNodes[k].setAttribute('href', TEST_ZIP_PATH);
    }

    var androidNodes = document.querySelectorAll('[data-android-test-download="standalone"]');
    for (var a = 0; a < androidNodes.length; a++) {
      androidNodes[a].setAttribute('href', ANDROID_APK_URL);
    }
    // The bare version beside Public Testing on the links hub, from the same constant as Install.
    var androidLabelNodes = document.querySelectorAll('[data-android-test-version-label]');
    for (var l = 0; l < androidLabelNodes.length; l++) {
      androidLabelNodes[l].textContent = 'v' + ANDROID_TEST_VERSION;
    }
    var androidVersionNodes = document.querySelectorAll('[data-android-test-version]');
    for (var b = 0; b < androidVersionNodes.length; b++) {
      androidVersionNodes[b].textContent = 'Test channel v' + ANDROID_TEST_VERSION + '. Test tokens only, no value, no risk!';
    }
    var testVersionNodes = document.querySelectorAll('[data-test-channel-version]');
    for (var m = 0; m < testVersionNodes.length; m++) {
      testVersionNodes[m].textContent =
        'Test channel v' + TEST_CHANNEL_VERSION + '. Test tokens only, no value, no risk!';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
