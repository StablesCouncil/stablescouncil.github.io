# Stables MiniDapp Version History

This is the public, easy-to-read release log for the package mirrored in `dapp/latest-version/`.

| Version | Internal label | Stage | Published on | Package | Main developments | Author | Commit |
|---|---|---|---|---|---|---|---|
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
