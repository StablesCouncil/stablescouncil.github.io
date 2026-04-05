# Telegram (Stables community): versioning, stages, demo soon

**Channel:** community (no hashtags in Telegram per Council rules).  
**Tone:** clear, honest about what is on-chain vs simulated.

---

## Draft message (English)

Hi everyone,

Quick update on how we label Stables MiniDapp builds, so it stays clear what you are installing.

We now use a **four-part version**: **vPP.TT.DD.SS**, read left to right as **Prod · Test · Demo · Showcase**. Each pair of digits is a counter for that **stage**. Today our public builds are still **showcase** (for example **v00.00.00.02**, same idea as the shorter **v00.00.02** you may already see).

**Stages in plain language**

- **Showcase:** story and UI practice. Nothing from the Stables *product* is on-chain here; a lot is simulated in the app.
- **Demo (next):** **real Minima** on your node for the product path we are shipping in that package. **No** Stables-team tokens on-chain in that stage. Anything that looks like minting stables / xWiniwa uses **Winiwa only** inside the app and is **not** a blockchain token.
- **Test (later):** **real on-chain** Winiwa / Wables-style test tokens, **no official value**, not production Stables.
- **Prod (later):** **Minima + Stables** as Council declares for production.

Packages will carry the **stage** in the name when we publish, for example **Stables_v00.00.00.02_showcase.mds.zip**, so you always know which line you grabbed.

Full write-up (public, on GitHub):

https://github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/MINIDAPP_VERSIONING.md

We are **only a couple of days away** from the **first demo** package: **real Minima**, clearer boundaries on what is simulated vs chain, same app direction you have been following.

Thanks for testing with us. More soon.

---

## Optional short version

We published a short guide on **MiniDapp versions and stages** (showcase → demo → test → prod) and what is on-chain at each step.

Link: https://github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/MINIDAPP_VERSIONING.md

**First demo build:** expect it in **a couple of days** (real **Minima** in that package; stables / xWiniwa mint stays **Winiwa-only** and **not** on-chain in demo).

---

*Internal: align zip filename and VERSION_HISTORY row when demo ships.*
