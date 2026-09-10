// Single source of truth for what the website offers people to install.
//
// THE DEMO LINE IS SUPERSEDED. `PUBLISHED_DEMO_VERSION` was the demo MiniDapp in
// /dapp/latest-version/, and the site's Download button pointed straight at that zip. The demo is
// frozen and the test channel is the active line, so a button offering v0.0.0.3.45 was sending
// people to a build we no longer stand behind. The demo version is kept here because the links hub
// still labels the demo track honestly as superseded, but it is no longer a download target.
//
// THE TEST CHANNEL IS THE ACTIVE OFFER, and it is reached through /payment-app/ (the access page, at the site root since 2026-09-03) rather than as
// a bare zip link. That page states which Minima node each package needs, which is the thing a
// person has to understand before installing anything; a naked zip link answers none of it.
//
// One published test version drives the coordinated downloads. DEMO_FROZEN_VERSION
// labels the historical demo separately; its name must not be used for current links.
//
// Bump PUBLISHED_DEMO_VERSION at publication, and keep the zip present at
// the path below. Elements are marked:
//   [data-demo-download]          the site Download control, now routed to the access page
//   [data-demo-published-version] shows the demo label, e.g. the links hub badge
//   [data-test-channel-download]  a real link to the current test package
//   [data-test-channel-version]   the current test label and its truth statement
(function () {
  var PUBLISHED_DEMO_VERSION = '0.0.11.88';
  var TEST_CHANNEL_VERSION = PUBLISHED_DEMO_VERSION;
  /* The coordinated test release includes both Android apps, the MiniDapp and web app.
     This one version drives every Android download control
     on the site ([data-android-test-download="standalone"]) and its version line
     ([data-android-test-version]). */
  // The frozen demo line, shown only as a label on the links hub Demo card. PUBLISHED_DEMO_VERSION
  // below tracks the published test iteration (release pointer rule), so it can no longer label the demo.
  var DEMO_FROZEN_VERSION = '0.0.0.3.45';
  var ANDROID_TEST_VERSION = PUBLISHED_DEMO_VERSION;
  var ANDROID_APK_URL = 'https://github.com/StablesCouncil/stables-app/releases/download/app-v'
    + ANDROID_TEST_VERSION + '/Stables_v' + ANDROID_TEST_VERSION + '.apk';
  /* The Minima Core companion ships on the SAME release as the standalone app, at the same
     version (v0.0.11.60 on, 2026-09-06): [data-android-test-download="core"] and its own line
     [data-android-core-test-version]. It needs the official Minima Core app on the phone. */
  var ANDROID_CORE_APK_URL = 'https://github.com/StablesCouncil/stables-app/releases/download/app-v'
    + ANDROID_TEST_VERSION + '/StablesCore_v' + ANDROID_TEST_VERSION + '.apk';
  var ACCESS_PAGE = '/payment-app/';
  var TEST_ZIP_PATH = '/dapp/latest-version/Stables_v' + TEST_CHANNEL_VERSION + '.mds.zip';

  function apply() {
    // The former demo download becomes the way in to the app-access page. Its label names the
    // active line rather than a version that is no longer offered.
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
      androidVersionNodes[b].textContent = 'Test channel v' + ANDROID_TEST_VERSION + '. Test tokens only, no value.';
    }
    var coreNodes = document.querySelectorAll('[data-android-test-download="core"]');
    for (var c = 0; c < coreNodes.length; c++) {
      coreNodes[c].setAttribute('href', ANDROID_CORE_APK_URL);
    }
    var coreVersionNodes = document.querySelectorAll('[data-android-core-test-version]');
    for (var e = 0; e < coreVersionNodes.length; e++) {
      coreVersionNodes[e].textContent = 'Requires the official Minima Core Android app. Test channel v' + ANDROID_TEST_VERSION + '. Test tokens only, no value.';
    }

    var testVersionNodes = document.querySelectorAll('[data-test-channel-version]');
    for (var m = 0; m < testVersionNodes.length; m++) {
      testVersionNodes[m].textContent =
        'Test channel v' + TEST_CHANNEL_VERSION + '. Test tokens only, no value.';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
