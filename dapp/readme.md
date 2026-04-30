# `dapp/` — live site mirror (`/dapp/`)

This folder is the **authoritative workspace copy** of **`https://stablescouncil.org/dapp/`** (same paths under **`dapp/`** on disk as in the URL). It sits beside **`task_stablescouncil_github_io/`** under **`1_development/stream_1_app/`** (see **`../README.md`**).

- **Do not** duplicate this tree under **`task_stablescouncil_github_io/webpages/`**.
- **Build for preview / ship:** from **`task_stablescouncil_github_io/`**, run **`npm run sync:site`** (copies **`../dapp/`** → **`site/dapp/`**).
- **Publication parity:** after push to **`StablesCouncil/stablescouncil.github.io`**, promote matching material to **`2_current`** per **`0_handshake/handshake.md`** §1.
- **Layout:** **Showcase** hub slice at **`dapp/`** root (**`1-showcase/`**, **`assets/`**, **`dapp.conf`**, root **`index.html`** redirect). **Demo**, **test**, and **prod** use **`2-demo/`**, **`3-test/`**, **`4-prod/`**. Published zips go under each channel’s **`latest-version/`** when shipped. Retired **previous-versions** READMEs: **`3_archive/stream_1_app/task_archived_dapp_channel_previous_versions_2026-04-16/dapp/`** only. **Channel index (parity):** **`2_current/stream_1_app/dapp/`**, **`3_archive/stream_1_app/dapp/`**. **Showcase** **`.mds.zip`:** **`build/README.md`** (staging allowlist). **Demo** **`.mds.zip`:** **`2-demo/build/README.md`**.
- **Policy and stages:** **`0_handshake/minidapp_version.md`**, **`MINIDAPP_VERSIONING.md`**.
- **Working plan:** **`COMMUNITY_DEMO_DEVELOPMENT_PLAN.md`** — living reference for the community-demo release bar, backlog, and cadence.
- **Execution tracker:** **`COMMUNITY_DEMO_TASK_TRACKER.md`** — precise task list with implementation / review / confirm / release status.
- **Local workflow:** **`LOCALHOST_DEV_ENVIRONMENT.md`** — how to run the MiniDapp and site on `localhost`, local feedback API, and node-connected browser testing.

**Note:** A lowercase **`readme.md`** may exist from legacy trees; **`README.md`** (this file) is the operator entry for the mirror.
