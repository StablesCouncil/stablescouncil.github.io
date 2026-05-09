# Stables MiniDapp: stages and version numbers

**For the community.** This page explains how we name builds and what **showcase**, **demo**, **test**, and **prod** mean for on-chain scope. It stays aligned with Council handshake **`0_handshake/minidapp_version.md`** in the main Stables workspace.

**Authoring and ship:** Edit this file under **`1_development/stream_1_app/website/dapp/`** (same tree as **`https://stablescouncil.org/dapp/`**). Serve the parent **`website/`** tree directly for preview, then publish the validated **`website/`** tree to GitHub Pages.

**Read on GitHub (rendered):**  
[github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/MINIDAPP_VERSIONING.md](https://github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/MINIDAPP_VERSIONING.md)

---

## Channel model (showcase, demo, test, prod)

- **One shell, one UX direction:** the same app routes and design system across stages. **Channels differ by functionality** (what may run: simulation vs demo mint semantics vs real test tokens vs prod), plus the **data and backends** those features require, not by maintaining unrelated product UIs.
- **Showcase** mirrors the **most advanced** experience the Council wants visitors to see, with **rich synthetic / sample data** so the surface reads like a finished product. It stays **synthetic-safe**: changes port from **demo** only when wiring does not imply chain or token truth that showcase does not have (see **Routing (agents)** in handshake **`minidapp_version.md`**).
- **Test** and **prod** use the same stage names in **`APP_STAGE`** and policy. On Pages, placeholder shells live at **`dapp/3-test/`** and **`dapp/4-prod/`** ( **`latest-version/`** per channel when used) until Council ships those lines. Token and environment truth per stage are in the table below and in **Demo vs test**.
- **Identifiers vs display:** folder names, zips, **`APP_BUILD_VERSION`**, and **`dapp.conf`** use the **canonical two-digit** five-segment form (e.g. **`v00.00.00.00.03`**). Marketing or in-app copy may use a shorter human-readable spelling **only as display**, without changing Council paths or artifact names.

### Pages `dapp/` layout (four channels)

Under **`1_development/stream_1_app/website/dapp/`**, routes are grouped **by channel**. Each channel has **`latest-version/`** for published **`.mds.zip`** lines when shipped. Retired **previous-versions** READMEs and related copy for all four channels live only in archive.

| Folder | Stage | Live URL | Notes |
|--------|-------|----------|--------|
| **`1-showcase/`** | showcase | **`/dapp/1-showcase/`** | Main preview shell; **`1-showcase/latest-version/`** holds the current **showcase** **`.mds.zip`**. Older-label docs: **`3_archive/.../task_archived_dapp_channel_previous_versions_2026-04-16/dapp/1-showcase/`**; historical **`.mds.zip`** binaries: **`3_archive/stream_1_app/task_archived_dapp_showcase_previous_mds_2026-04-16/`**. Resource URLs use **`../assets/`**, **`../agent.png`**, etc. |
| **`2-demo/`** | demo | **`/dapp/2-demo/`** | Full demo tree. Demo **`.mds.zip`** recipe and **`build/`** output: **`dapp/2-demo/build/README.md`**. Retired empty **`latest-version`** / **`latest version`** placeholders: **`3_archive/stream_1_app/task_archived_dapp_2_demo_latest_placeholders_2026-04-16/`**. Other archived notes: **`3_archive/.../task_archived_dapp_channel_previous_versions_2026-04-16/dapp/2-demo/`**. |
| **`3-test/`** | test | **`/dapp/3-test/`** | Placeholder shell until a **test** zip ships; **`3-test/latest-version/`** reserved. Archived notes: **`3_archive/.../task_archived_dapp_channel_previous_versions_2026-04-16/dapp/3-test/`**. |
| **`4-prod/`** | prod | **`/dapp/4-prod/`** | Placeholder shell until first **prod** ship; **`4-prod/latest-version/`** reserved. Archived notes: **`3_archive/.../task_archived_dapp_channel_previous_versions_2026-04-16/dapp/4-prod/`**. |

Root **`dapp.conf`** uses **`"web": "1-showcase/index.html"`** so the default hub entry matches **showcase**. **Raw** URLs for showcase zips use **`dapp/1-showcase/latest-version/`** only (former root **`dapp/latest-version/`** / **`dapp/previous-versions/`** redirect stubs **retired 2026-04-16**, archived under **`3_archive/stream_1_app/task_archived_dapp_root_redirect_stubs_2026-04-16/`**).

---

## Canonical full label: `vPM.Pn.TT.DD.SS` (five two-digit groups)

Read **left to right**. **Showcase** line keeps **`PM.Pn.TT.DD`** at **`00`** and advances **SS** (e.g. **`v00.00.00.00.02`**).

| Position | Segment | Stage | What is on-chain (Stables product) |
|:--:|:--:|:--|:--|
| 1 | **PM** | **Prod major** | **`00`** until the first prod-channel ship |
| 2 | **Pn** | **Prod minor** | Optional patch on the same prod major |
| 3 | **TT** | **Test** | **Minima + Winiwa + Wables** as **real on-chain tokens**, no (or test-only) official value |
| 4 | **DD** | **Demo** | **Minima only** for the Stables product. **No** Stables-team tokens on-chain. In-app “stables” / xWiniwa mint uses **Winiwa only** and is **not** a blockchain token |
| 5 | **SS** | **Showcase** | **Nothing** on-chain for the Stables product; synthetic UI and local simulation |

**Legacy four-segment `vPP.TT.DD.SS`:** When **prod major and minor are both zero**, **`v00.00.00.02`** means the same as **`v00.00.00.00.02`** (collapsed prod pair).

**Legacy short form `vNN.NN.NN`:** **`v00.00.02`** is shorthand for **`v00.00.00.00.02`** during transition.

### How you know which build you have

1. **Stage** is stated on the package: **zip filename**, **`dapp.conf`**, **`runtime-config.js`** (`APP_STAGE`), or release notes: `showcase | demo | test | prod`.
2. **Counters:** When we ship a release for a stage, we bump **that stage’s** two-digit group (see handshake **`minidapp_version.md`**).
3. **Dev folder (showcase source):** **`1_development/stream_1_app/website/dapp/`** (**`1-showcase/`**, root **`assets/`**, **`dapp.conf`**; hub zip **`dapp/build/README.md`**).

### Demo vs test (important)

- **Demo:** Stables / xWiniwa flows are **mintable with Winiwa only** in the app. They are **not** Minima chain tokens.
- **Test:** Winiwa / Wables (and related) are **real on-chain** test tokens with **no official value**. They are **not** production Stables.

### Zip naming

We recommend: **`Stables_vPM.Pn.TT.DD.SS_<stage>.mds.zip`**  
Examples: **`Stables_v00.00.00.00.03.mds.zip`** (current **showcase** **`1-showcase/latest-version/`**), **`Stables_v00.00.02.mds.zip`** / legacy **`Stables_v0.01.01.mds.zip`** (older **showcase** drops, binaries in **`3_archive/.../task_archived_dapp_showcase_previous_mds_2026-04-16/`**).

### Zip contents (Pages `dapp/` vs packager zip from `prod_*`)

**GitHub Pages `dapp/`** (this repo) matches the **Packaging Rule** shape for showcase: root **`dapp.conf`** with **`"web": "1-showcase/index.html"`**, **`1-showcase/index.html`**, sibling **`assets/`**, plus **`2-demo/`**, **`3-test/`**, **`4-prod/`** as sibling channel trees. Root art, optional root **`index.html`** redirect.

**`.mds.zip`** for showcase uses the same hub entry (**`1-showcase/index.html`**). Build per **`dapp/build/README.md`** (staging from **`dapp/`** root; **omit** **`2-demo/`**, **`3-test/`**, **`4-prod/`**, **`1-showcase/latest-version/`**, and other non-hub paths). See **`0_handshake/handshake.md`** (Packaging Rule).

---

## Where to get the MiniDapp

- **Showcase latest zip:** [dapp/1-showcase/latest-version/](https://github.com/StablesCouncil/stablescouncil.github.io/tree/main/dapp/1-showcase/latest-version)
- **Showcase history:** [VERSION_HISTORY.md](https://github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/1-showcase/latest-version/VERSION_HISTORY.md)
- **Demo zip build:** **`dapp/2-demo/build/README.md`** (local **`build/`** folder). When Council publishes a demo line to Pages, a **`latest-version/`** folder may appear in the Pages repo again; dev no longer keeps empty placeholders.
- **Test / prod zips (when published):** [dapp/3-test/latest-version/](https://github.com/StablesCouncil/stablescouncil.github.io/tree/main/dapp/3-test/latest-version) · [dapp/4-prod/latest-version/](https://github.com/StablesCouncil/stablescouncil.github.io/tree/main/dapp/4-prod/latest-version)

---

*Last updated: 2026-04-30 (Council): active Pages-hosted MiniDapp source is under **`website/dapp/`** inside the single public website tree.*