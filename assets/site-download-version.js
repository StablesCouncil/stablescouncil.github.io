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
// Two constants, two jobs:
//   PUBLISHED_DEMO_VERSION  the frozen demo, labelled superseded wherever it is shown
//   TEST_CHANNEL_VERSION    the active line, driving the access page and its download
//
// Bump TEST_CHANNEL_VERSION together with the app's dapp.conf version, and keep the zip present at
// the path below. Elements are marked:
//   [data-demo-download]          the site Download control, now routed to the access page
//   [data-demo-published-version] shows the demo label, e.g. the links hub badge
//   [data-test-channel-download]  a real link to the current test package
//   [data-test-channel-version]   the current test label and its truth statement
(function () {
  var PUBLISHED_DEMO_VERSION = '0.0.11.38';
  var TEST_CHANNEL_VERSION = '0.0.11.38';
  /* THE RELEASE IS THE STANDALONE ANDROID APP (founder 2026-09-03: "let's release the Standalone
     APK first with the updated website"). This one constant drives every Android download control
     on the site ([data-android-test-download="standalone"]) and its version line
     ([data-android-test-version]); the MiniDapp and web builds are shown as coming soon. */
  // The frozen demo line, shown only as a label on the links hub Demo card. PUBLISHED_DEMO_VERSION
  // below tracks the published test iteration (release pointer rule), so it can no longer label the demo.
  var DEMO_FROZEN_VERSION = '0.0.0.3.45';
  var ANDROID_TEST_VERSION = '0.0.11.38';
  var ANDROID_APK_URL = 'https://github.com/StablesCouncil/stables-app/releases/download/app-v'
    + ANDROID_TEST_VERSION + '/Stables_v' + ANDROID_TEST_VERSION + '.apk';
  var ACCESS_PAGE = '/payment-app/';
  var TEST_ZIP_PATH = '/dapp/3-test/build/Stables_v' + TEST_CHANNEL_VERSION + '.mds.zip';

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
