# Stables MiniDapp Version History

This is the public, easy-to-read release log for published MiniDapp builds.

**Canonical full label:** **`vPM.Pn.TT.DD.SS`** (five groups). Current showcase: **`v00.00.00.00.03`**. Short **`v00.00.03`** and four-segment **`v00.00.00.03`** mean the same when prod is unused. Full explanation: [MINIDAPP_VERSIONING.md](../../MINIDAPP_VERSIONING.md).

| Version | Full label | Stage | Published on | Package | Main developments | Author | Commit |
|---|---|---|---|---|---|---|---|
| `v00.00.03` | **`v00.00.00.00.03`** | showcase | 2026-04-09 | **`Stables_v00.00.00.00.03.mds.zip`** | Third showcase drop: five-segment **SS=03**, Mint xWiniwa chart reliability (fetch/MDS/synthetic fallback), dev tree **`dapp/`** (then also **`prod_stables_app_v00.00.00.00.03/`**; that folder **archived 2026-04-15**), Pages **`dapp/`** aligned | `StablesCouncilExec` | *(set on push)* |
| `v00.00.02` | `v00.00.00.02` ≡ `v00.00.00.00.02` | showcase | 2026-04-02 | `Stables_v00.00.02.mds.zip` (binary in **monorepo** **`3_archive/stream_1_app/task_archived_dapp_showcase_previous_mds_2026-04-16/`**) | On/off-ramp flow redesign, welcome-flow improvements, legal/privacy clarifications, versioning alignment | `StablesCouncilExec` | [`076c4ce`](https://github.com/StablesCouncil/stablescouncil.github.io/commit/076c4ce) |
| `v00.00.01` | `v00.00.00.01` | showcase | 2026-04-01 | `Stables_v00.00.01.mds.zip` (binary in **monorepo** **`3_archive/stream_1_app/task_archived_dapp_showcase_previous_mds_2026-04-16/`**) | Published static showcase baseline and install package alignment | `StablesCouncilExec` | [`6f685e0`](https://github.com/StablesCouncil/stablescouncil.github.io/commit/6f685e0) |

**Note:** **The Stables Academy** is **not** attributed to **`v00.00.02`** in Council scope; treat Academy and similar as **post-cut** until a row explicitly lists them.

**Note (2026-04-09):** **`Stables_v00.00.02.mds.zip`** was moved out of **`latest-version/`** when **`Stables_v00.00.00.00.03.mds.zip`** became current (later **2026-04-16:** that and other historical zips consolidated into **`3_archive/.../task_archived_dapp_showcase_previous_mds_2026-04-16/`**).

**Note (2026-04-15):** **Showcase** **`latest-version/`** and **`previous-versions/`** now live under **`dapp/1-showcase/`** (per-channel).

**Note (2026-04-16):** Historical showcase **`.mds.zip`** files (older than current **latest-version**) were **moved** to **`3_archive/stream_1_app/task_archived_dapp_showcase_previous_mds_2026-04-16/`**. All four channels’ **`previous-versions/`** documentation was **moved** to **`3_archive/stream_1_app/task_archived_dapp_channel_previous_versions_2026-04-16/dapp/`** (**`1-showcase`** … **`4-prod`**). **Later (same cleanup):** those **`previous-versions/`** paths were **removed** from active **`1_development/.../dapp/`**; use archive + **`2_current`/`3_archive`** **`dapp/`** README indexes only.

**Note (2026-04-16):** Root **`dapp/latest-version/`** and **`dapp/previous-versions/`** (browser redirect stubs to **`showcase/`**) **retired** from the dev tree; copies archived at **`3_archive/stream_1_app/task_archived_dapp_root_redirect_stubs_2026-04-16/`**. Old root URLs **404** on Pages once that ship lands.

## Update rule

When publishing a new version:
1. Add a new top row with the latest version.
2. Keep `Author` as the publishing identity (current standard: `StablesCouncilExec`).
3. Include a short "Main developments" summary (1 line).
4. Link the exact release commit.
