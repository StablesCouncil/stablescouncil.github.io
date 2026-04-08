# Stables MiniDapp Version History

This is the public, easy-to-read release log for published MiniDapp builds.

**Canonical full label:** **`vPM.Pn.TT.DD.SS`** (five groups). Current showcase: **`v00.00.00.00.03`**. Short **`v00.00.03`** and four-segment **`v00.00.00.03`** mean the same when prod is unused. Full explanation: [MINIDAPP_VERSIONING.md](../MINIDAPP_VERSIONING.md).

| Version | Full label | Stage | Published on | Package | Main developments | Author | Commit |
|---|---|---|---|---|---|---|---|
| `v00.00.03` | **`v00.00.00.00.03`** | showcase | 2026-04-09 | **`Stables_v00.00.00.00.03.mds.zip`** | Third showcase drop: five-segment **SS=03**, Mint xWiniwa chart reliability (fetch/MDS/synthetic fallback), folder **`prod_stables_app_v00.00.00.00.03`**, Pages **`dapp/`** aligned | `StablesCouncilExec` | *(set on push)* |
| `v00.00.02` | `v00.00.00.02` ≡ `v00.00.00.00.02` | showcase | 2026-04-02 | `Stables_v00.00.02.mds.zip` (in **[previous-versions](../previous-versions/)**) | On/off-ramp flow redesign, welcome-flow improvements, legal/privacy clarifications, versioning alignment | `StablesCouncilExec` | [`076c4ce`](https://github.com/StablesCouncil/stablescouncil.github.io/commit/076c4ce) |
| `v00.00.01` | `v00.00.00.01` | showcase | 2026-04-01 | `Stables_v00.00.01.mds.zip` | Published static showcase baseline and install package alignment | `StablesCouncilExec` | [`6f685e0`](https://github.com/StablesCouncil/stablescouncil.github.io/commit/6f685e0) |

**Note:** **The Stables Academy** is **not** attributed to **`v00.00.02`** in Council scope; treat Academy and similar as **post-cut** until a row explicitly lists them.

**Note (2026-04-09):** **`Stables_v00.00.02.mds.zip`** was moved from **`latest-version/`** to **[dapp/previous-versions/](https://github.com/StablesCouncil/stablescouncil.github.io/tree/main/dapp/previous-versions)** when **`Stables_v00.00.00.00.03.mds.zip`** became current.

## Update rule

When publishing a new version:
1. Add a new top row with the latest version.
2. Keep `Author` as the publishing identity (current standard: `StablesCouncilExec`).
3. Include a short "Main developments" summary (1 line).
4. Link the exact release commit.
