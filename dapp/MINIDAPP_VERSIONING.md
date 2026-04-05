# Stables MiniDapp: stages and version numbers

**For the community.** This page explains how we name builds and what **showcase**, **demo**, **test**, and **prod** mean for on-chain scope. It stays aligned with Council handshake `minidapp_version.md` in the main Stables workspace.

**Read on GitHub (rendered):**  
[github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/MINIDAPP_VERSIONING.md](https://github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/MINIDAPP_VERSIONING.md)

---

## Four-segment label: `vPP.TT.DD.SS`

We use one version string with **four two-digit groups**, read **left to right**:

| Position | Segment | Stage | What is on-chain (Stables product) |
|:--:|:--:|:--|:--|
| 1 | **PP** | **Prod** | **Minima + Stables** (Council-declared production stable layer) |
| 2 | **TT** | **Test** | **Minima + Winiwa + Wables** as **real on-chain tokens**, no (or test-only) official value; path toward Stables backed by real Minima |
| 3 | **DD** | **Demo** | **Minima only** for the Stables product. **No** Stables-team tokens on-chain. In-app “stables” / xWiniwa mint uses **Winiwa only** and is **not** a blockchain token |
| 4 | **SS** | **Showcase** | **Nothing** on-chain for the Stables product; synthetic UI and local simulation |

**Example:** `v00.00.00.02` means showcase counter **02**, and prod / test / demo counters still **00**.

### How you know which build you have

1. **Stage** is stated on the package: **zip filename** (e.g. `Stables_v00.00.00.02_showcase.mds.zip`), app config, or release notes: `showcase | demo | test | prod`.
2. **Counters:** When we ship a release for a stage, we bump **that stage’s** group. Other groups stay at `00` until that track ships.
3. **Short form:** During transition, **`v00.00.02`** means the same as **`v00.00.00.02`** for showcase-only packages.

### Demo vs test (important)

- **Demo:** Stables / xWiniwa flows are **mintable with Winiwa only** in the app. They are **not** Minima chain tokens.
- **Test:** Winiwa / Wables (and related) are **real on-chain** test tokens with **no official value**. They are **not** production Stables.

### Zip naming

We recommend: **`Stables_vPP.TT.DD.SS_<stage>.mds.zip`**  
Example: **`Stables_v00.00.00.02_showcase.mds.zip`**.

---

## Where to get the MiniDapp

- **Latest package folder:** [dapp/latest-version/](https://github.com/StablesCouncil/stablescouncil.github.io/tree/main/dapp/latest-version) on this repo.
- **Release history:** [VERSION_HISTORY.md](https://github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/latest-version/VERSION_HISTORY.md).

---

*Last updated: 2026-04-02 (Council).*
