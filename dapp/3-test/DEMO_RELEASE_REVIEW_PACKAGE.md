# Demo Release Review Package

**Date:** 2026-05-14  
**Channel:** Demo  
**Build label:** `v0.0.0.1` (`Demo · v0.0.0.1` in the app)  
**Public package location:** `https://raw.githubusercontent.com/StablesCouncil/stablescouncil.github.io/main/dapp/latest-version/Stables_v0.0.0.1.mds.zip`  
**Build source location:** `dapp/2-demo/build/Stables_v0.0.0.1.mds.zip`

This package is the review note for the next public Demo pass. It should be copied into release notes, Telegram, X, or Council communications when the build is published.

## What Changed

- Showcase and Demo are separated in the top channel selector.
- Demo truth copy now states the boundary between node-linked native MINIMA and demo-only Winiwa / Wables balances.
- Demo onboarding explains the MiniDapp zip install path, write-mode expectation, native MINIMA send/receive scope, and mint/burn UI test scope.
- Visible versions use the short `v0.0.0.1` style while canonical internal versioning stays unchanged.
- Send, Activity, exchange history, time filters, and amount dropdown visibility were cleaned up for review.
- Coverage fund now starts with fund size, accumulated fees, and annualized historical return, with aligned mechanics copy.
- On/Off Ramp now leads with merchant or DIY cash exchange before the current technical venue path.
- In-app Links now includes the public links page, onion resilience page, onion mirror, and communication plan.
- Faucet and mint copy now points demo Winiwa credit to Get Winiwa instead of implying MINIMA acquisition.
- Settings includes the coming-soon Make my bank look mine personalization scaffold.
- Website home includes the operating-loop story: self-custody, merchant payments, local circulation, and visible risk.
- Feedback now starts with a visible Demo roadmap and coming-soon review path.

## What To Review Now

- Channel selector: switch between Showcase and Demo and confirm the labels are clear.
- Wallet: connect a node and verify native MINIMA receive/send still works when Node live is available.
- Mint: confirm Winiwa / Wables copy reads as demo-only and no-value.
- Activity: run an exchange and check main-page recent activity plus date/time filters.
- Coverage fund: review summary order, labels, and mechanics note.
- On/Off Ramp: review merchant-first section and the current technical route.
- Settings: review App updates and Make my bank look mine.
- Feedback: confirm the roadmap block and public-feedback warnings are understandable.

## Known Limits

- Winiwa and Wables balances in this Demo have no monetary value.
- Stablecoin mint/burn flows are UI tests, not production live mint products.
- Only native MINIMA is expected to settle on-chain, and only when the node is live and the user sends a valid address.
- Council communications are config-backed prototype notices, not a signed Council feed yet.
- App-specific feedback and bug-report types are visible but not active yet.
- Personal themes and community theme sharing are coming-soon scaffolds only.

## Feedback Ask

Please send feedback on:

- confusing Demo versus Showcase boundaries,
- native MINIMA wallet regressions,
- misleading token, Coverage fund, or fee wording,
- merchant-first ramp clarity,
- missing official links or trust surfaces,
- UI areas that feel too much like a finished product when they are still demo-only.

Use **More → Feedback** in the MiniDapp. Keep feedback public-safe: no private keys, seed phrases, personal secrets, or contact details you do not want published.

## Next Step

Prepare the dated release note from this package, publish the build link, invite structured review, and keep the next patch small enough that reviewers can see what changed.
