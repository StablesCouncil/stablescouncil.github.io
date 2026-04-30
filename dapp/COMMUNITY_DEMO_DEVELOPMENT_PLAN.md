# Stables MiniDapp - Community Demo Development Plan

**Status:** Active working document  
**Scope:** `1_development/stream_1_app/dapp/`  
**Primary target:** `dapp/2-demo/`  
**Purpose:** Keep the MiniDapp moving toward a community-built product, with a clear release bar, visible roadmap, and a shared reference for ongoing work.

---

## 0. Current status snapshot

### Primary planning document

This file is the current high-level source for:

- the objective
- the channel model
- the release bar
- the active backlog
- the delivery order
- the current path forward

### Where we stand now

| Area | Status | Notes |
|------|--------|-------|
| **Community objective** | Defined | The app is being positioned as a community-built product, not a personal side project |
| **Working plan** | In place | This file is the main roadmap reference |
| **Charter alignment** | Integrated into plan | Charter traceability points reviewed and added as demo technical points |
| **Showcase / Demo model** | Direction agreed | Needs implementation in the app |
| **Top pill selector** | Not started | First major implementation task |
| **Demo truth baseline** | Partly established | Demo already supports native MINIMA send / receive with connected node |
| **Demo onboarding message** | Planned | Need explicit first-message framing for zip install, wallet baseline, and mint / burn UI test scope |
| **Wallet / activity cleanup** | Planned | Includes send cleanup, FX activity visibility, and time filters |
| **Coverage Fund rework** | Planned | Needs metric order and naming cleanup |
| **On/Off Ramp restructure** | Planned | Merchant-first path needs to lead |
| **Links / copy cleanup** | Planned | Includes Faucet / acquisition wording fixes |
| **Personalization module scaffold** | Planned | “Make my bank look mine” |
| **Release cadence framework** | Defined | Frequent public demo releases with clear changelog and feedback loop |

### Current milestone

**Current working milestone:** establish the Showcase / Demo split cleanly enough that the rest of the app can be refined on top of it without structural confusion.

### Immediate next implementation block

1. Showcase / Demo selector on the top pill  
2. Channel truth model for showcase versus demo  
3. Wallet / Send / Activity cleanup  
4. Coverage Fund rework  
5. On/Off Ramp restructure  
6. Links and Faucet / acquisition copy cleanup  
7. “Make my bank look mine” scaffold  
8. Release notes and changelog summary

---

## 1. Main objective

The main objective is not only to improve the app technically, but to onboard the community into its development.

The MiniDapp should progressively feel like:

- a **community project**, not a personal project
- a product that is being **built in the open**
- a product with **frequent, understandable releases**
- a product where people can **see what is live, what is demo-only, and what is coming next**

This means the app should not pretend to be finished. It should feel coherent, truthful, active, and easy to follow.

---

## 2. Channel model

The MiniDapp should use the same product surface across channels, with different data truth and depth.

### Showcase

**Role:** Aspirational public bank view.

- Same pages and general functionality as demo
- Large synthetic / illustrative data set
- Designed to show what a mature Stables bank could look like once the network and community are live
- No claim of real protocol or node truth

### Demo

**Role:** Community development build.

- Same pages and general functionality as showcase
- Uses real user node data where available
- Already supports **native MINIMA send and receive** when the node is connected
- Allows demo-only Winiwa / Wables flows inside the app
- These demo-only assets must remain clearly marked as **not real blockchain tokens**
- Should be the main public build for onboarding feedback and participation

### Product rule

- **Showcase and demo should not drift into two different products**
- The top app version indicator should become a **channel selector**
- The user should be able to switch between **Showcase** and **Demo**
- Internal canonical versioning remains per handshake policy
- Display formatting can be simplified for humans, for example `v0.0.0.0.3` instead of `v00.00.00.00.03`

---

## 3. Demo v1 release bar

This first community demo does **not** need to feel finished. It **does** need to feel intentional.

### Required qualities

- Clear difference between **showcase** and **demo**
- No misleading copy about what is live
- No obvious dead-end interactions presented as ready
- Preserve and clearly communicate that **demo already functions as a MINIMA wallet** for node-connected send / receive
- Strong enough polish that community members can explore, react, and give feedback
- Visible roadmap inside the product
- Changelog discipline and regular communication rhythm

### Acceptable for this release

- Some sections can remain **coming soon**
- Some advanced systems can remain illustrative
- Some future customization surfaces can be scaffolded before they are fully implemented

### Not acceptable for this release

- Prototype leftovers that break trust
- Stale copy that describes the wrong channel
- Unclear asset truth
- Broken navigation between major sections
- Release artifacts and docs that contradict the app

---

## 4. Active development points

The items below are the current reference backlog for the next public demo cycle.

### Charter alignment note

The demo plan must stay aligned with:

- `1_development/stream_1_app/dapp/2-demo/CHARTER_DEMO_TRACEABILITY.md`
- `0_handshake/protocol_mechanics_spec.md`

Where the Charter handout expresses intent, the demo should translate that into visible product surfaces without inventing protocol mechanics.
Where mechanics are involved, the protocol spec wins.

### A. Structure the showcase/demo setup

- Make showcase and demo operate as two views of the same app surface
- Use the top version pill as a selector
- Keep shared UX structure across channels
- Use different data truth by channel:
  - **Showcase:** rich fake ecosystem data
  - **Demo:** real node-linked data where available + demo-only Winiwa/Wables flows

### B. Top version indicator becomes a selector

- Replace the static version pill at the top of Wallet with a selector
- Selector must let the user switch between:
  - Showcase
  - Demo
- Keep the product language simple and visible
- Keep canonical internal versioning untouched, but shorten display format where helpful

### B1. Demo first-message onboarding

- Add a first message in the demo that explains the current practical entry point
- State that the demo can be installed in the node from the zip file
- State that the app can already be used as a simple **MINIMA wallet** for send / receive
- State that users can already test the **mint / burn token UI**
- Keep the message precise about scope:
  - MINIMA wallet behavior is real when node-connected
  - mint / burn token UI testing does not imply all token flows are fully live

### C. Wallet / send / activity cleanup

- Remove the big text in **Send**
- Make sure FX exchanges are listed in transactions on the main page too
- Add transaction filters for:
  - date
  - period
  - timeframe
- Verify the visible amount selector / amount dropdown behavior everywhere it matters

### D. Coverage Fund improvements

- Show first:
  - current fund size
  - accumulated fees
  - annualized historical return
- Use the selector label **Coverage fund**
- Make the section feel like a real evolving protocol surface, even when some metrics stay illustrative

### E. On/Off Ramp restructuring

Split the page into two sections:

1. **Find a merchant nearby / DIY exchange**
- First explain local exchange into paper money through community / merchant routes

2. **Current available route**
- Then present the current exchange / bridge / ramp path that exists today

### F. Personalization module after updates

After **App updates**, add a full section:

**Make my bank look mine**

This section should progressively cover:

- personal styling and identity
- future themes (flowers, cars, gym, etc.)
- future full customization tools
- future ability to share created customizations with the community
- creator credit
- wallet address for donations / support

For now, where not yet implemented, use a clear **coming soon** state rather than hiding the direction.

### G. Links page in-app

- Add / keep a proper in-app **Links** page
- Make it easy for community users to verify official properties
- Use it as part of the trust model for open development

### H. Copy fixes for Faucet / acquisition language

Change wording so it reflects current truth:

- Replace **Acquire** wording where needed
- In places like:
  - `To acquire MINIMA (Winiwa currently in this test phase), use On/Off Ramp.`
- Redirect that logic to **Faucet** where Faucet is the truthful current action
- Also fix similar wording on the Faucet page and any related surfaces, for example:
  - `Acquire Winiwa to mint Wables tokens`

### I. Bring more of the presentation into the web base version

- The web base version should carry more of the quality, narrative clarity, and ecosystem framing of the presentation
- This does **not** mean turning the app into the presentation
- It means the app should better reflect the same level of product storytelling and intention

### J. Visible roadmap inside the product

- Keep major future sections visible where useful
- Label them clearly as **coming soon**
- Use them to invite feedback and signal direction
- The app should communicate that this is **Demo v1 of many**

### K. Charter-derived demo technical points

These are the Charter / mechanics items that should be turned into precise demo-facing implementation points.

#### 1. Truth surfaces and protocol state

- Add or strengthen a protocol truth surface that shows:
  - collateral / assets
  - liabilities
  - equity
  - backing or coverage state
- Make the CR regime legible:
  - normal
  - guarded
  - critical
- Keep wording aligned with `protocol_mechanics_spec.md`
- Do not imply a hard always-$1 promise when floating redemption logic is part of the system explanation

#### 2. Payment fees versus mint / burn fees

- Make the UI distinction explicit:
  - **mint / burn:** no friction, no fees
  - **payments / transfers:** fee formula applies where the app explains user payment economics
- Do not show payment-fee logic on mint / burn flows
- Do not claim xMinima receives transaction-fee revenue

#### 3. Coverage Fund precision

- Coverage Fund screen should clearly communicate:
  - current fund size
  - accumulated fees
  - annualized historical return
  - junior / first-loss character
  - cf-holder yield role
- If simplified, clearly label what is illustrative versus what is live

#### 4. xMinima precision

- Any invest / mint / exchange copy touching xMinima should state or preserve:
  - equity role
  - stress absorption role
  - no transaction-fee revenue
  - liquidity / exit constraints under stress

#### 5. Merchant-first onboarding

- On/Off Ramp must lead with merchant-first and local-circulation logic
- Technical routes such as exchanges / bridge / DIY paths should appear second
- The app should support the story that circulation and merchant usage matter more than passive holding

#### 6. Network truth and isolation awareness

- Keep or improve the node / network truth indicator
- Make it legible when the app is:
  - live with node truth
  - illustrative only
  - offline / degraded / not connected
- Warn calmly before actions that depend on node connectivity
- Do not claim perfect global truth

#### 7. Architecture and education modules

- Academy or explainer modules should progressively cover:
  - layer model
  - execution versus settlement
  - value network versus information network
  - staged transition / honest uncertainty
- These can begin as lightweight cards or academy entries before becoming deep modules

#### 8. Governance and transparency

- Council / governance pages should support:
  - code-first limits
  - founder-to-council transition framing
  - transparency and treasury visibility
  - routing to official community spaces
- Use links and summaries, not fake governance execution

#### 9. Retrocession / monitoring / future rails

- Retrocession, concentration monitoring, and future verification / anchoring can appear as:
  - stubs
  - explainer panels
  - coming-soon modules
- But they should be framed as **design direction** until genuinely wired

#### 10. StablesAgent framing

- StablesAgent should remain visibly useful but non-authoritative
- High-impact actions should point users back to:
  - on-chain state
  - official docs
  - official links

#### 11. Risk and security awareness

- Security and legal areas should calmly cover:
  - self-custody
  - visibility / transparency
  - unconditional exit framing
  - update hygiene / signed software expectations
  - no seed sharing
  - connectivity limits where relevant

#### 12. Open development posture

- The demo should visibly support community onboarding into development through:
  - links
  - changelog visibility
  - feedback routes
  - roadmap surfaces
  - frequent release rhythm

#### 13. x402 readiness

- Keep x402 as a **modular optional adapter layer**, not a monetary dependency.
- Add a provider-agnostic mock path first:
  - intent contract
  - adapter interface
  - service orchestration
  - replay/idempotency guards
- Add at least one visible demo module that explains the machine-payment flow:
  - `402 quote -> payment proof -> settlement check -> access`
- Keep wording finality-safe:
  - accepted
  - pending verification
  - globally settled
- Never imply x402 bypasses issuance, redemption, solvency, or oracle constraints.
- Add a governance/watch pointer for standard changes and incident tracking in `#technology-watch`.
- Track concrete work items in `COMMUNITY_DEMO_TASK_TRACKER.md` and implementation details in `CHARTER_DEMO_TRACEABILITY.md` section 14.

---

## 5. Release cadence and community rhythm

The Demo line should move on a frequent public cadence.

### Target rhythm

- Aim for at least **two releases per week** when possible
- Not necessarily daily
- But frequently enough that the community sees motion and momentum

### Each release should include

- a clean changelog update
- a short public summary of what changed
- an explicit ask for feedback
- a sense of what is next

### Product posture

- We are in DeFi
- We are coding in the open
- The app should make this visible without becoming chaotic

---

## 6. Delivery order

### Must ship in the next demo cycle

- Showcase / Demo selector on the top pill
- Structural split between showcase and demo truth
- Keep **native MINIMA wallet send / receive** as a protected core flow in demo
- Add the **demo first-message onboarding** for zip install, wallet baseline, and mint / burn UI scope
- Remove oversized Send text
- FX exchanges on main-page transactions
- Transaction date / period / timeframe filtering
- Coverage Fund metrics reorder and naming cleanup
- On/Off Ramp two-section structure
- Links page surfaced cleanly in-app
- Copy cleanup for Faucet / acquisition wording
- Short display version format

### Should follow immediately after

- Personalization module scaffold: **Make my bank look mine**
- Better presentation logic in the web base version
- Cleaner roadmap presentation for coming modules

### Can remain visible as coming soon

- Theme catalog
- Full free customization interface
- Community sharing of custom skins
- Creator credit and donation wallet flows
- Any other future surfaces that are clearly framed and not misleading

---

## 7. Operating rules for this document

- This is a **living document**
- Update it when priorities change
- Keep it aligned with the real release plan, not aspirational clutter
- When a point is completed, either:
  - move it to a done section later, or
  - remove it after the change is captured clearly in changelog / version notes

### Companion files

- `dapp/2-demo/CHANGELOG.md`
- `dapp/CHANGELOG.md`
- `dapp/PORTING_GAP.md`
- `dapp/MINIDAPP_VERSIONING.md`
- `dapp/2-demo/CHARTER_DEMO_TRACEABILITY.md`
- `0_handshake/minidapp_version.md`

---

## 8. Immediate next working pass

The next implementation pass should follow this order:

1. Build the **Showcase / Demo selector**
2. Lock the **channel truth model**
3. Clean **Wallet / Send / Activity**
4. Rework **Coverage Fund**
5. Rework **On/Off Ramp**
6. Fix **Links** and **Faucet / acquisition** copy
7. Add **Make my bank look mine** scaffold
8. Prepare release notes and public-facing changelog summary

---

**Working principle:** We are not trying to make the app look finished. We are trying to make it feel like a serious community product that people can believe in, follow, and help shape.
