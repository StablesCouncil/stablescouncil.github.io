# Stables MiniDapp Version History

This is the public, easy-to-read release log for the package mirrored in `dapp/latest-version/`.

| Version | Internal label | Stage | Published on | Package | Main developments | Author | Commit |
|---|---|---|---|---|---|---|---|
| `v0.0.0.3.44` | `v00.00.00.03.44` | demo | 2026-06-18 | **`Stables_v0.0.0.3.44.mds.zip`** | Payment protection tiers, auto-save across settings and notes, Android biometric unlock for protected pay, quieter split payment on Send, contact payment tier, StablesAgent FAQ with return to main menu. | `Stables Council` | *(set on publish)* |
| `v0.0.0.3.42` | `v00.00.00.03.42` | demo | 2026-06-17 | **`Stables_v0.0.0.3.42.mds.zip`** | Six colour themes (including Paper), in-app Android APK updates from Settings, home-screen branding from My profile, StablesAgent and guided tours combined under Help, All links aligned with stablescouncil.org, safer wallet recovery on Android, Network section in Settings, theme and activity polish since v0.0.0.3.31. | `Stables Council` | *(set on publish)* |
| `v0.0.0.3.31` | `v00.00.00.03.31` | demo | 2026-06-16 | **`Stables_v0.0.0.3.31.mds.zip`** | Catches the web demo up to the 0.0.0.3 line (also shipped as the standalone Android app). Sending wallet now shows the correct transaction id that resolves on the Minima explorer (it no longer surfaces the inner transaction id); an on-chain send reads "Pending confirmation" until the node confirms it, then the confirmed history row replaces it with a working explorer link. Wallet recovery asks a short safety check first, the Connect panel is clearer about the RPC port (node port + 4) and how to start a node, dropdown menus are readable, and transaction history is pulled in after a recovery. | `Stables Council` | *(set on publish)* |
| `v0.0.0.2.16` | `v00.00.00.02.16` | demo | 2026-06-10 | **`Stables_v0.0.0.2.16.mds.zip`** | Sprint build on top of 2.10. Send Minima from the web version via the node's RPC (small CORS proxy ships with the dapp). Newest-first activity ordering, block-confirmation counter shown under each amount (target 1 to 30), toasts wrap on mobile, currency popup buttons fit, Investment portfolio Winiwa valuation fix. Simpler, plain-language Connect panel (RPC URL auto-uses the proxy). Homepage GitHub link wraps on mobile. No em-dashes anywhere (new handshake writing rule). | `Stables Council` | [`9ef45b3`](https://github.com/StablesCouncil/stablescouncil.github.io/commit/9ef45b3) |
| `v0.0.0.2.10` | `v00.00.00.02.10` | demo | 2026-06-09 | **`Stables_v0.0.0.2.10.mds.zip`** | Live wallet (instant incoming detection + per-transaction block-confirmation counters, user-set target 1–30), per-asset Mint/Burn toggle, editable Exchange "receive" amount (reverse calc), one minimalistic MAX + right-aligned amount inputs app-wide, "+ New address" generates a real node address + check-address tool, "incoming not yet in total" indicator, auto-updating history + refresh, wallet-isolation fix (no cross-wallet history), Winiwa USD valuation fix, version-driven download button, per-build version shown everywhere | `Stables Council` | [`55b2efb`](https://github.com/StablesCouncil/stablescouncil.github.io/commit/55b2efb) |
| `v0.0.0.1` | `v00.00.00.01.00` | demo | Review package, not released | **`Stables_v0.0.0.1.mds.zip`** | Demo review package: Showcase/Demo split, native MINIMA baseline, Winiwa/Wables demo scope, Coverage fund, On/Off Ramp, Links, Feedback | `StablesCouncilExec` | *(set on publish)* |
| `v0.0.0.0.3` | `v00.00.00.00.03` | showcase | 2026-04-09 | **`Stables_v0.0.0.0.3.mds.zip`** | Third showcase drop: Mint xWiniwa chart reliability, fetch/MDS/synthetic fallback, Pages `dapp/` aligned | `StablesCouncilExec` | *(set on push)* |
| `v00.00.02` | `v00.00.00.02` | showcase | 2026-04-02 | `Stables_v00.00.02.mds.zip` | On/off-ramp flow redesign, welcome-flow improvements, legal/privacy clarifications, versioning alignment | `StablesCouncilExec` | [`076c4ce`](https://github.com/StablesCouncil/stablescouncil.github.io/commit/076c4ce) |
| `v00.00.01` | `v00.00.00.01` | showcase | 2026-04-01 | `Stables_v00.00.01.mds.zip` | Published static showcase baseline and install package alignment | `StablesCouncilExec` | [`6f685e0`](https://github.com/StablesCouncil/stablescouncil.github.io/commit/6f685e0) |

## Update rule

When publishing a new version:

1. Add a new top row with the latest version.
2. Keep `Author` as the publishing identity.
3. Include a short "Main developments" summary.
4. Link the exact release commit.
