/*
 * The Stables web app is no longer hosted here (2026-10-19). Stables is one Android app: https://stablescouncil.org/#download
 * This file stays only so that older Android test builds, which read it to check for updates, still learn about the
 * current APK. Keep ANDROID_APK_UPDATE equal to releases/android-update.json at every release.
 */
window.STABLES_CONFIG = {
  ANDROID_APK_UPDATE: {
    /** SHA-256 and signer fingerprint are filled from the exact signed artifact before publication. */
    latestVersion: '0.0.14.046',
    versionCode: 14046,
    expectedPackageName: 'org.stablescouncil.stables',
    downloadUrl:
      'https://github.com/StablesCouncil/stables-app/releases/download/app-v0.0.14.046/Stables_v0.0.14.046.apk',
    sha256: '49c2ef3fa05e47e3227ac9672c294cae2269102b6c978483049c3855a98f48e2',
    signerSha256: 'dabb1b2a79b134b6008e6401735d649c140b51f2c4a83eb001b2ffdad5ce5dd4',
    releasesPageUrl: 'https://github.com/StablesCouncil/stables-app/releases',
    /** Dedicated immutable-shape metadata used by hardened standalone builds. */
    remoteManifestUrl: 'https://stablescouncil.org/releases/android-update.json',
    /** Live config the app fetches to detect newer APKs (standalone Android only). */
    remoteConfigUrl:
      'https://stablescouncil.org/dapp/3-test/assets/config/runtime-config.js'
  },
};
