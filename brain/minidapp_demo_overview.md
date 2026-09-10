# Stables MiniDapp, Demo channel overview (FROZEN — superseded by Test channel)

*Historical reference only. For the current active build, see **`minidapp_test_channel_overview.md`**.*

## Status

The **Demo Channel** (`dapp/2-demo/`) is **frozen** at its last build (**v0.0.0.3.52** dev / **v0.0.0.3.45** last published). No new work happens on the demo line. Do not point a user at the demo as the current Stables build, and do not describe its simulated Wables balances as something that works.

## What it was

The Demo channel was an early testing release used to harden wallet, send/receive, payment protection, themes, settings auto-save, and other UI surfaces. In the demo:

- **Native Minima send and receive were real and on-chain.**
- **Winiwa / Wables balances were simulated / illustrative**, not live on-chain tokens.
- **Minting and burning flows were UI tests** against demo Winiwa from the faucet.

## What was carried forward

All demo-hardened features (payment protection, QR scanner, live wallet, auto-save, themes, Help, Settings, APK updater UI) were inherited by the Test channel, where they now operate against **real on-chain Winiwa and xWiniwa**. USDw is deferred out of the first community test; see `release_scope_boundary.md`.

## How it was accessed

- Web: `stablescouncil.org/dapp/2-demo/`
- MiniDapp zip: `stablescouncil.org/dapp/latest-version/Stables_v0.0.0.3.45.mds.zip`
- Android APK: GitHub Releases `app-v0.0.0.3.45`

These demo URLs remain available for historical reference but should not be pointed to as the current Stables build.
