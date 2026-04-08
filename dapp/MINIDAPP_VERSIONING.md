# Stables MiniDapp: stages and version numbers

**For the community.** This page explains how we name builds and what **showcase**, **demo**, **test**, and **prod** mean for on-chain scope. It stays aligned with Council handshake **`0_handshake/minidapp_version.md`** in the main Stables workspace.

**Read on GitHub (rendered):**  
[github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/MINIDAPP_VERSIONING.md](https://github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/MINIDAPP_VERSIONING.md)

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
3. **Dev folder (showcase source):** `prod_stables_app_v00.00.00.00.03` in the Stables repo (folder suffix matches showcase **SS**).

### Demo vs test (important)

- **Demo:** Stables / xWiniwa flows are **mintable with Winiwa only** in the app. They are **not** Minima chain tokens.
- **Test:** Winiwa / Wables (and related) are **real on-chain** test tokens with **no official value**. They are **not** production Stables.

### Zip naming

We recommend: **`Stables_vPM.Pn.TT.DD.SS_<stage>.mds.zip`**  
Examples: **`Stables_v00.00.00.00.03.mds.zip`** (current **`latest-version`**), **`Stables_v00.00.02.mds.zip`** (second showcase, in **`previous-versions`**), legacy **`Stables_v0.01.01.mds.zip`** where still listed.

---

## Where to get the MiniDapp

- **Latest package folder:** [dapp/latest-version/](https://github.com/StablesCouncil/stablescouncil.github.io/tree/main/dapp/latest-version) on this repo.
- **Release history:** [VERSION_HISTORY.md](https://github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/latest-version/VERSION_HISTORY.md).

---

*Last updated: 2026-04-09 (Council).*
