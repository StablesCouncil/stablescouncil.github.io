# Stables Comprehensive Knowledge Base
**Version: Foundation & Philosophy (Public)**

This document synthesizes all public Stables documentation, community discussions, and architectural decisions into a single, comprehensive source of truth. It represents the deepest level of understanding of the Stables protocol, explicitly refined for precision.

> **Read this first: design is not deployment.** Sections 1 to 9 describe the Stables protocol as
> **designed**. Stablecoins, the Coverage Fund, the Ambassador program, trading and the merchant
> economy are **design, not shipped software**, and a user cannot do them today. The first community
> test is far narrower: claim Winiwa, mint and burn xWiniwa at par, send and receive both. Section 10
> states what actually ships, and **`release_scope_boundary.md`** is the binding version. When
> answering "can I do X", answer from the scope boundary, not from the design.

## 1. The Core Philosophy: Why Minima?
Stables is not another "crypto project." It is a decentralized banking system built exclusively on the **Minima blockchain**. 
Minima was chosen because it is the only network where every user runs a full validating and constructing node on their local device (phone or PC). This architecture eliminates miners, delegators, and centralized infrastructure providers, resulting in true censorship-resistance and absolute decentralization.
"Stables exists because Minima exists, not the other way around. Minima's decentralization is not just a feature, it is a prerequisite for sovereign money."

## 2. The Four Pillars of True Stable Money (The Grok Challenge)
A resilient stablecoin must achieve four nearly impossible feats. Stables is designed explicitly to survive these exact challenges:
1. **Perfect Economics:** Flawless peg stability and incentive design. Stables achieves this without fractional reserves by using massive over-collateralization of native Minima, backed by a 3-layer risk absorption structure.
2. **Battle-Tested Code:** Secure, audited, exploit-resistant software. Stables heavily stress-tests its MiniDapp on Minima mainnet using a dedicated test asset ("Winiwa", practice Minima with no real value), so the software is hardened before any real value is involved. Stables only ever runs on Minima mainnet.
3. **Massive Adoption:** Stablecoins need deep liquidity. Stables circumvents the "retail crypto" adoption hurdle by targeting Web2, non-crypto users—specifically merchants—as the entry point.
4. **Surviving Regulation & Crashes:** By building a 100% on-chain, non-custodial, decentralized structure governed by code without a corporate issuer, Stables minimizes regulatory attack vectors while remaining mathematically robust against flash crashes.

## 3. The Sovereign Monetary Architecture
Stables is not a traditional DeFi project. It is a **floating collateralized synthetic monetary layer** built on Minima. It is designed with deterministic solvency, distributed equity absorption, and no discretionary emergency logic.

### A. Stablecoins (Floating, Not Defended)
- **The Core Mechanic:** Stables does not "defend a peg" using centralized treasuries. It uses Floating Redemption. At all times, the backing ratio is visible: `Available Minima Assets / Stablecoin Liabilities`.
- **The Merchant Peg:** If the backing ratio dips below 1, redemption floats with it. However, the system's stability relies on **The Merchant Network**. As long as local merchants continue to accept 1 USDs for $1 worth of real-world goods—because it guarantees them zero transaction fees and instant settlement—the network retains its utility value regardless of secondary market fluctuations in the Minima collateral. 

### B. xMinima (Equity Absorption)
- **The Structural Buffer:** xMinima represents the equity layer. The holders of xMinima voluntarily absorb the volatility of the Minima collateral. They provide the structural foundation that keeps the Stablecoin backing ratio robust in exchange for leveraged exposure to Minima's native growth.
- **Proportional Voting:** Power resides with those who assume this structural risk: **1 pledged xMinima token = 1 vote**. No tiers, no admin keys, no quadratic voting. Voting means pledging (Council decision, 2026-09-08): the tokens are committed and locked for a period, so influence follows capital genuinely at risk rather than capital merely held. Holding for longer does not increase weight. What is decided is the liquidity budget, which currency comes next, and the safety settings that keep minting and burning away from a manipulated price. Never a price, and never the launch. How the first stablecoin is created is a separate topic with its own settled answer, covering the Council's single opening act, the switch that closes it permanently, and how the price is found by trading afterwards.

## 4. The Transition Doctrine (The Arc of Money)
Stables does not claim to be the final form of human money. It is a necessary bridge from the centralised present to a sovereign future. We view monetary history as a sequence of stages:

- **Stage −2 (Commodity Money):** Direct exchange and intermediary assets with intrinsic value (shells, salt, metals). Trust was local and mutual.
- **Stage −1 (Sound Money/State Capture):** Standardisation of gold/silver coins. Trust shifted from community to state. Coercion entered via legal tender and mandated taxation.
- **Stage 0 (Fiat/Centralised Control):** The current world. Money is issued by decree and managed by central banks. Individuals are assigned a currency by jurisdiction. Participation is mandatory; exclusion is common.
- **Stage 1 (Stables - Sovereign Opt-In):** The current phase. Stables provides synthetic pegged assets (USDs, EURs, CADs, IRTs) so participants can opt-in to a sovereign network today while maintaining familiar pricing. Minima is listed alongside these as the native destination.
- **Stage 2 (Minima-Native Economy):** As adoption deepens, participants begin pricing goods and services directly in Minima. The reliance on fiat-pegged bridges fades. Everyone becomes their bank on infrastructure they validate themselves.
- **Stage 3 (The Circular Horizon):** A future state where monetary power is a fundamental human right. It recognises the right of every human to live with dignity and operates in service of the planet.

**The StablesAgent's Role:** The Agent exists to facilitate Stage 1, guiding users and merchants across the bridge from Stage 0 to Stage 2. 

### Communication & Pitch
- **Target Audience:** Your mother, your uncle, the local shop owner.
- **The Pitch:** We never use the words blockchain, crypto, or web3 in consumer marketing. We sell: "A better alternative to cash." "Zero transaction fees." "Instant settlement." "No chargebacks."
- **Privacy:** In a world of centralized data leaks, Stables provides pseudonymous, safe financial dignity.

## 5. Funding & Community Rewards
- **Zero VCs:** There will be no venture capital raises, no private sales, and no dedicated "Project Token" sold to extract value.
- **The Core Team:** The initiators of the project are just kickstarting the protocol to eventually hand control completely to the decentralized Stables Council. The team will never touch protocol money.
- **Airdrops & NFTs (Winiwa):** To heavily stress-test the system, Stables will run an epoch-based competition using "Winiwa", a test asset (practice Minima with no real value) used in the app on Minima mainnet. Users start with Winiwa and compete to end the epoch with the highest portfolio value. Winners and active questers will be rewarded with commemorative NFTs. These NFTs hold no protocol utility and grant no special rights; they are purely an attestation of early support.
- **Socials Strategy:** Stables targets Web2 platforms aggressively (Instagram, Facebook) to reach normal users who feel disenfranchised by the traditional banking system.

## 6. Architecture Precedents
Stables is not inventing novel, untested mechanics. It is taking battle-tested economic models (such as those pioneered by MoneyOnChain on RSK) and executing them on a superior base-layer (Minima) with a superior UI/UX, pushing it fully into retail utility instead of keeping it in the DeFi niche.

## 7. The Stables Banking System: How the Mechanic Works

This section gives the Agent a clean, step‑by‑step description of how the Stables banking system works in practice, mirroring the public "Our Banking System" presentation.

### 7.1 The Three Main Actors
- **People:** Buyers, savers and senders who hold and use Stables day‑to‑day.
- **Merchants:** Sellers, providers and recipients of payments who agree to accept Stables at a 1:1 value with local pricing (for example, 1 USDs for 1 dollar worth of goods).
- **The Protocol:** The on‑chain logic that mints and burns stablecoins, manages the Coverage Fund and Liquidity Fund and routes fees.

### 7.2 The Money Layer (Stablecoins)
- **Stables:** USDs, EURs, JPYs and other synthetic currencies that are designed to hold a stable value and be used as everyday money.
- **Financial Entry (Mint / Burn):** People can lock Minima into the protocol to mint new stablecoins, and they can burn stablecoins to redeem Minima. This is the financial on‑ramp into the system.
- **Work Entry (Earn):** People and merchants can also earn Stables directly by providing goods and services or by onboarding other merchants. This is the work‑based on‑ramp.

In both cases, the result is the same: more users and merchants hold and use Stables as their money, and payments move directly between them with zero transaction fees.

### 7.3 The Internal Protocol Mechanics
- **Coverage Fund** *(designed, NOT deployed: there is no Coverage Fund in the app, nothing to deposit into, and no yield available to anyone today)***:** All transaction fees generated by the network flow into the Coverage Fund. It is the yield‑bearing buffer that strengthens the backing of the stablecoins and rewards the holders of the coverage fund tokens. When coverage is high, it can hold mostly stablecoins. When coverage is stressed, it can gradually tilt toward xMinima to absorb volatility while keeping the system solvent.
- **Liquidity Fund (xMinima / Minima):** A dedicated pool that provides deep, continuous liquidity between xMinima and Minima. It ensures that participants who take the equity side (xMinima) can always enter and exit positions without destabilizing the money layer that normal users rely on.
- **xMinima (Equity Layer):** The equity token of the protocol. xMinima holders voluntarily absorb price swings in the Minima collateral in exchange for long‑term upside and a direct role in governance. They sit structurally “behind” the stablecoin holders, taking the first hit when the market moves against the collateral but benefiting most when the network grows.
- **Council Treasury:** Funded by merchant listing and related protocol fees. The Treasury can be used to seed and maintain Liquidity Fund positions so that there is always a healthy bid and ask for xMinima without depending on external market makers.

### 7.4 How a Typical Flow Works
1. A user locks Minima into the protocol and mints USDs.
2. The user pays a merchant in USDs for real‑world goods and services. The merchant can either keep the USDs as savings or burn them to redeem Minima.
3. Every payment generates tiny fees that flow automatically to the Coverage Fund instead of to banks or card networks.
4. The Coverage Fund strengthens the overall balance sheet and rewards its token holders, while the Council Treasury builds up resources from merchant listing fees.
5. The Treasury and Liquidity Fund together ensure that xMinima remains liquid so that equity‑side participants can come and go, while ordinary users just experience instant, fee‑less payments in money that holds its value.

This whole mechanic is **design, not deployed software**: no stablecoin, Coverage Fund, Liquidity Fund or merchant payment is available to a user today. The core mechanic is therefore simple: **People and merchants use Stables as day‑to‑day money, while the Coverage Fund, Liquidity Fund and xMinima layer quietly absorb volatility and route fees in the background so that the system stays solvent and resilient over time.**

## 8. The Ambassador Program (The 16 Big Mac® Economy)

*Not part of the current test release. The Ambassador program is designed and documented, but it is not shipped software: nobody can register as an ambassador, onboard a merchant, or earn from listings today.*


The Stables Ambassador program is a professional, incentivized network designed to grow the merchant base in a Fair & Global manner. It is a "Ruled by Code" economy that rewards mentorship while protecting the treasury.

### 8.1 The Economic Core (V0.0.01)

*Not part of the current test release. The Ambassador program is designed and documented, but it is not shipped software: nobody can register as an ambassador, onboard a merchant, or earn from listings today.*

- **Universal Anchor Fee:** 16 Big Mac® (Independent Registration).
- **Mentored Registration Fee:** 15 Big Mac® (1 BM Discount for using an Ambassador).
- **Active Reward (Ambassador):** 8 Big Mac® (Fixed).
- **Mentor Reward (Trainer):** 1 Big Mac®.
- **Council Share:** 6-16 Big Mac® (Treasury Growth).
- **Fairness Anchor:** All fees are pegged to the global **Big Mac Index**.
- **Settlement:** Paid and settled in any token of Stables (USDs, EURs, CADs, etc.), Minima, or xMinima.

### 8.2 The Merchant's Choice
- **Why Stables?** Secure, Pseudonymous, Unstoppable. Zero middleman fees and instant settlement.
- **Why Listing?** Visibility on the global map, "Verified" status, and discoverability.
- **Wait, is Listing Mandatory?** No. Stables is an open protocol. Any merchant can accept Stables for free without being listed. Listing is a professional services choice.

### 8.3 The Integrity & Investment Principle

*Not part of the current test release. The Ambassador program is designed and documented, but it is not shipped software: nobody can register as an ambassador, onboard a merchant, or earn from listings today.*

- **100% Investment:** The 16 Big Mac® fee is not a payment; it is a 100% investment into the Stables infrastructure, owned collectively by its participants and managed by the Council Treasury.
- **Risk Disclosure:** Stables is a pioneer journey. While sovereignty (node/keys) is the ultimate shield, early ambassadors acknowledge the lack of protocol track record.

### 8.4 Technical Guardrail: The Shield Principle
The system is mathematically balanced so that "self-onboarding" (bypassing an ambassador) is always more expensive than joining a mentored hub. This ensures the human layer (Ambassadors) is protected by the ledger's logic.

**The StablesAgent's Role (Ambassador Support):** The Agent provides 24/7 technical and strategic support for Ambassadors, helping them manage their Hubs and merchant campaigns.

## 9. Stables Academy (Education Layer, Draft)

Stables Academy is a practical education layer for users and merchants who want to manage sovereign banking safely.

- **Purpose:** improve real-world operational confidence topic by topic, starting with security.
- **Quiz model (current prototype):** each attempt draws 10 questions from a larger question bank, each with 3 options.
- **Pass logic:** no single "perfect score" requirement. Pass requires a minimum threshold (6/10) and mandatory critical questions correct.
- **Progression logic:** retake cool-down, best score retained.
- **Community learning feedback:** users can optionally authorize anonymized demographic + score contribution to a public learning database used to improve communication priorities.
- **Recognition:** successful completion unlocks a lightweight certificate and social sharing.
- **Ambassador path direction:** completing all Academy core topics is being positioned as an onboarding prerequisite for Ambassador status once the full topic set is live.

## 10. Active development channel: Test

The **Test channel** (`dapp/3-test/`) is the sole active Stables MiniDapp development line. The earlier Demo channel (`dapp/2-demo/`) is frozen.

**The first community test is the Stables test release, and it is deliberately narrow.** Everything in sections 1 to 9 above is protocol design. Most of it is **not deployed** and is **not available to a tester**. Do not describe any of it as something a user can do today unless it appears in the list below.

- **Test channel tokens:** Winiwa and xWiniwa are real tokens on Minima mainnet with **no value**. They are not money and not an investment.
- **What ships:** the standalone Android app with its own Minima node on the phone, the trustless Winiwa faucet, **xWiniwa mint and burn at par (one for one, both directions)** through the vault covenant, Winiwa and xWiniwa send and receive, honest four-state balance truth, and the support pages.
- **Trustless flows:** the faucet and the par vault run through KISS VM covenants; the issuer seeded the pools but does not sign user transactions and need not be online.
- **Deferred out of this test:** USDw and every stablecoin, the fiat display currencies, all trading (Trade, Exchange, Bulk Orders, order books, liquidity), Coverage Funds, market-priced or forward xWiniwa issuance, merchant and Ambassador tools, the On/Off ramp, and Treasury and Council governance surfaces. Deferred means switched off in the build, not cancelled.
- **Delivery:** the published test artifacts are the **standalone Android app** and, since 2026-09-06, the **Minima Core companion** (both v0.0.11.63, GitHub release `StablesCouncil/stables-app` tag `app-v0.0.11.63`, Download buttons on https://stablescouncil.org/payment-app/; the companion needs the official Minima Core Android app on the same phone and is released as pairing-tested, not rehearsed). It runs its own Minima node inside the app; the wallet and keys live on the device. The MiniDapp package, the web build and the Core-connected companion are coming soon.
- **Production phase:** substituting Winiwa for real Minima and enabling real stablecoin issuance is a future phase that begins only after this work is proven.

For the binding scope statement see **`release_scope_boundary.md`**, and for detail see **`minidapp_test_channel_overview.md`**, both in this brain base.

## 11. Public website: where it lives and how it ships

The Council public site (**https://stablescouncil.org/**, GitHub Pages **`StablesCouncil/stablescouncil.github.io`**) is **authored in the Stables monorepo**, not by editing the Pages repo by hand as the primary workflow.

- **Single authoring source:** **`1_development/stream_1_app/website/`**, including root pages, shared assets, brand exports, `CNAME`, and the Pages-hosted MiniDapp under **`website/dapp/`**.
- **Local preview:** serve the source directly with **`node 1_development/stream_1_app/work/tools/website/serve-local.mjs ../../website 8080`**. No build step is required for ordinary review.
- **Ship:** after the publish-baseline check, full website gates, and explicit founder approval, build an isolated publication candidate from the validated `website/` contents, copy that candidate to the root of the **`stablescouncil.github.io`** publish checkout, commit, push **`main`**, and verify both live domains.
- **Source boundary:** the publish checkout, old task trees, generated outputs, archives, and `2_current` website mirror are not authoring sources.
- **Full detail for the Agent:** **`github_pages_website_engineering.md`** in this brain base and **`website/CANONICAL_LAYOUT.md`** in the monorepo.
- **Public UI buttons:** **`website_button_hierarchy.md`** (how **`btn-primary`** and **`btn-secondary`** must be used); canonical markup in **`0_handshake/web_component_spec.md`** (COMPONENTS → Buttons).
