# Stables MiniDapp channels: showcase, demo, test

*For StablesAgent and external AIs when users ask which version of the Stables app is live, which
one they should open, and what each one proves. Rewritten 2026-08-01. The previous version of this
document was dated 2026-04-01 and described a `v0.01.x` line, repo paths that no longer exist, and a
Mint chart that is not in the product.*

## The three channels, and which one matters

| Channel | Status | What it is |
|---|---|---|
| **Showcase** (`dapp/1-showcase/`) | Legacy preview | The earliest public UX shell, with simulated data. Kept for reference; not the current product. |
| **Demo** (`dapp/2-demo/`) | **Frozen** | The hardened wallet line: payment protection, QR scanning, themes, settings auto-save. Native Minima send and receive were real; Winiwa and Wables balances were simulated. No new work happens here. |
| **Test** (`dapp/3-test/`) | **Active** | The sole active development line and the basis of the first community test. Real Winiwa and xWiniwa on Minima mainnet, with **no value**. |

If someone asks which they should use, the answer is the **test channel**, through the
standalone Android app (v0.0.11.63, Download on https://stablescouncil.org/payment-app/; people who already run the official Minima Core app can take the Minima Core companion from the same page instead). The frozen
demo package `v0.0.0.3.45` is history, not something to point a new tester at.

## Do not assert a version from memory

Version numbers move, and this document will go stale between updates. **Read them, do not recall
them:**

- The published Android test version is the constant `ANDROID_TEST_VERSION` in
  `1_development/stream_1_app/website/assets/site-download-version.js`, which fills the Download
  button on the access page. At the time of writing it is `0.0.11.63`.
- The active test-channel build is `APP_BUILD_VERSION` plus `APP_BUILD_ITERATION` in
  `dapp/3-test/assets/config/runtime-config.js`. It changes most days.

If a user asks for an exact current version and you cannot read those sources, say so and point them
at the Council's official channels rather than guessing.

## What the first community test actually contains

The test channel's first community release is the **Stables test release**: install the standalone Stables Android app, which runs its own Minima node on the phone, claim Winiwa from the on-chain faucet, mint it into xWiniwa at one for
one, burn xWiniwa back to Winiwa, and send or receive both. **Trading, stablecoins such as USDw,
Coverage Funds, merchant tools and the Ambassador program are not part of it.** The binding
statement is **`release_scope_boundary.md`** in this knowledge base; the detail is in
**`minidapp_test_channel_overview.md`**.

## Feedback

Structured public feedback is submitted from inside the app through the feedback page. That route is
included in the first community test.

## Retired claims, so they are not repeated

The following appeared in the previous version of this document and are **no longer true or no
longer relevant**. Do not restate them:

- a showcase version line of `v0.01.01` published with `v0.01.02` in development, and the
  `prod_stables_app_v0.01.0x` repo folders those pointed at;
- a **Mint xWiniwa chart** drawing a CoinGecko Winiwa-USD series, a demo xWiniwa strip, and a
  leverage line derived from the coverage ratio. There is no such chart in the shipped test release,
  and xWiniwa is minted at **par**, not at a leveraged or market rate;
- any framing that treats the demo channel as the current build.
