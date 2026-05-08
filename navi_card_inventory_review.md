# Navi Card Inventory Review

Status: discussion draft  
Scope: Council Navigation System card architecture  
Source baseline: `1_development/stream_1_app/website/navi_items.json`  
Important constraint: this document does not rewrite live Navi data. It is the review layer before the next `navi_items.json` update.

## Purpose

The current Navi card set is useful, but it was built as an early draft. The next phase is to turn Navi into a real component map of Stables: app functionality, protocol and financial mechanics, community growth, and Council structure.

Each card should answer one clear question:

> What component of Stables does this card represent, what objective does it move forward, and what evidence shows where it stands?

## Card Contract

Every proposed card should eventually define:

- Category: the higher-level component group the card belongs to.
- Stream: Technical, Financial, Community, or Cross-stream.
- Dapp phase: Showcase, Demo, Test, Prod, possibly multiple.
- Title: the visible card name.
- Objective: one sentence explaining what the card moves forward.
- Scope: what belongs inside this card.
- Exclusions: what should not be mixed into this card.
- Evidence: source docs, tracker items, Dashboard metrics, or proof basis.
- Public links: only public URLs should appear in the live Navi card. Use relevant Dapp element or stage, website/public asset, and social discussion channel. Charter chapters, specs, trackers, and draft source anchors stay in the internal working document until they are public.
- Cross-reference lenses: every live card should have `charterRefs` and `dappRefs` so Navi can be filtered from either direction: every Charter chapter should point toward relevant cards, and every Dapp aspect should point toward the cards that support it.
- Risk references: every live card should carry `riskRefs` from Charter Annex B where applicable. Use the annex categories specifically: Oracle Risk, Liquidity Risk, Market Depth Risk, Early-Stage Volatility, Governance Risk, Smart Contract Risk, Economic Attack Vectors, Operational Risk, Concentration Risk, Transition Risk, Competitive Attack, and Confidence Risk.
- Suggested role: active, later, destination, or candidate.
- Recommendation: keep, rename, split, merge, add, defer.

Granularity rule: a Navi card must be at least the equivalent of an app page, stream module, or reviewable work package. Small functions, controls, ledgers, release checklist fragments, and one-off UI fixes should be folded into the broader card they support.

Grounding rule: every card must start from a real action or maintained asset. Avoid titles like "trust", "readiness", or "presence" when they hide the work. Prefer grounded cards such as `Development Repository And Folder Structure`, `Development Infrastructure And Tooling`, `Development Environment Security Hygiene`, `Deployment Test And Public Preview Verification`, and `Domain, GitHub And Social Links Registry`. Each card should name what must exist, where it is linked, and how a reviewer marks it live/draft/missing or pass/fix/open.

Risk-annex rule: Annex B is still a Phase 2 draft matrix, but its risk categories are binding enough for Navi mapping now. Cards should not invent vague "risk" labels; they should reference the exact Annex B categories and eventually connect each one to structural mitigation, monitoring metrics, and response boundaries.

Coverage-audit rule: the card set must be checked from the source system outward, not only from existing Navi cards. The minimum source list is the Demo app surfaces, app traceability handout, protocol mechanics spec, current state/path, Charter articles, and all Charter annexes. When a source names an implementable or reviewable package, Navi needs either a dedicated card or an explicit dependency inside a broader card.

## Coverage Gap Map

The May 2026 audit found several source-defined work packages that were underrepresented when only risk labels were added. These are now treated as Navi card candidates or live generated cards:

| Source element | Navi treatment | Reason |
|---|---|---|
| Article V Oracle Framework and oracle integrity gating | `Oracle Framework And Integrity Gate` | Oracle design is a real protocol decision package: sources, aggregation, smoothing, outlier handling, integrity score, mint gating, and redemption boundary. |
| Annex A Mathematical Annex | `Mathematical Annex And Stress Model` | Formulas and stress models are implementation inputs, not only documentation. |
| Annex B Risk Review and Mitigation Framework | `Risk Matrix And Response Boundaries` | Each risk must have scenario, impact, probability, mitigation, monitoring metric, and deterministic response boundary. |
| Annex C Governance Transition Roadmap | `Governance Transition Mechanics` | Decentralisation milestones, decision scopes, thresholds, timelocks, seats, rotation, and time-weighted governance are operational mechanics. |
| Annex D Anchoring Protocol Specification and Article VIII | `On-Chain Anchoring And Public Verification` | Canonical format, hash, Integritas anchoring, signatures, public verification, and amendment versioning are a technical work package. |
| Current state/path smart contract gap | `Smart Contract Specification Package` | Minting, xMinima router, Coverage Fund, merchant payments, lending boundary, and invariant enforcement need reviewable specs before implementation. |
| Protocol mechanics secondary-market requirement | `Secondary Market And DEX Liquidity Requirements` | Tradable pairs, market depth, DEX routes, and liquidity warnings are required for xMinima/cf/stablecoin mechanics. |

## Dapp Lens Coverage Rule

The Dapp Lens is now page-based. Every visible Dapp Lens option should return at least one relevant card. Empty page filters are treated as missing ownership, not acceptable UX. The first closure pass adds page-owner cards for:

- `Demo Activity And Transaction History Surface`
- `Demo Contacts And Notes Surface`
- `Demo Chat And Private Messages Surface`
- `Demo Settings, Profile And Security Surface`
- `Demo Invoice And Merchant QR Surface`
- `Demo Get Winiwa Faucet Surface`
- `Help, Academy And Guided Tours`

These cards exist so Dapp pages such as Chat, Contacts, Get Winiwa, Create Invoice, Settings and updates, My profile, Security, and Help/Academy can be filtered directly from Navi.

## Category Layer

The stream layout stays solid, but the card system needs a category layer so Navi can show more components without becoming a wall of cards. A category is not a new stream. It is a grouping inside or across streams.

Proposed categories:

- **Community Communication And Feedback**: content runway, official surfaces, feedback intake, release rhythm, review quests, StablesAgent learning. This category spans Showcase, Demo, Test, and Prod; when feedback is applicable, link first to the relevant Dapp feedback surface, then website and social/community surfaces.
- **Dapp Channels And Development Infrastructure**: Dapp stage structure, repository/folder organization, development tools, secured environment, deployment verification, node connection model, and release packaging.
- **Wallet And User Banking**: wallet, balances, send, receive, QR, contacts, activity, security, settings.
- **Mint, Burn And Token Scope**: demo-only assets, test tokens, production stablecoins, xMinima, mint/burn truth.
- **Merchant Banking Tools**: shops, invoices, merchant profile, merchant display, on/off ramp, merchant wallet validation, point-of-sale path.
- **Invest And Coverage Fund**: Coverage Fund UI, cf tokens, liquidity funds, yield language, risk and illustrative values.
- **Protocol Mechanics And Solvency**: balance sheet, fees, Coverage Fund mechanics, xMinima router, oracles, solvency visibility.
- **Merchant Network Economics**: merchant entry/listing, local exchange, circulation, settlement, cluster liquidity, treasury interactions.
- **Ambassadors And Cluster Growth**: ambassadors, mentors, merchants, cluster spark, Cluster Challenge, local accepting networks.
- **Council Formation And Handover**: Charter, Council as community achievement, seat/voting design, parameter governance, handover, custody.
- **Destinations**: sovereign banking device, financial system basis for builders, autonomous Council, production stable layer.

The merchant network should appear in all three streams:

- Technical: merchant functionality in the app.
- Financial: financial soundness and circulation of the merchant network.
- Community: merchants built through ambassadors, clusters, and local trust.

## Documentation Synthesis

### App And MiniDapp Domain

The app is not a single screen. It is a staged MiniDapp product surface with multiple truth levels.

Main components found in the app documentation:

- Channel model: Showcase, Demo, Test, Prod.
- Current lead build: Demo, with Showcase as the public synthetic line.
- Demo connectivity: Demo primarily connects through MDS.
- Test expectation: by Test phase, the Dapp should move toward standalone node function incorporated early, not remain only an MDS-connected demo surface.
- Wallet baseline: native MINIMA send and receive when connected to a node.
- Mint and Burn: demo-only Winiwa/Wables UI flows in Demo; not production token behavior.
- Activity and wallet cleanup: send cleanup, FX visibility, time filters, amount selector review.
- Invest: Coverage Fund, liquidity funds, and truth alignment.
- Merchant app functionality: shops, merchant display, merchant profile, invoices, QR/payment requests, merchant wallet validation, on/off ramp, nearby merchant exchange, current route fallback.
- More drawer and support surfaces: links, settings, security, legal, feedback, faucet/acquisition.
- Release process: changelog, feedback ask, visible roadmap, frequent demo releases.
- Porting discipline: lead channel tracking and downstream channel safety.
- Future technical items: x402 readiness, network/MDS truth, StablesAgent framing, traceability to Charter and mechanics.

Key source anchors:

- `0_handshake/minidapp_version.md`
- `1_development/stream_1_app/work/docs/ui_inventory/app_ui_inventory.md`
- `1_development/stream_1_app/website/dapp/COMMUNITY_DEMO_DEVELOPMENT_PLAN.md`
- `1_development/stream_1_app/website/dapp/COMMUNITY_DEMO_TASK_TRACKER.md`
- `1_development/stream_1_app/website/dapp/PORTING_GAP.md`
- `1_development/stream_1_app/website/dapp/MINIDAPP_VERSIONING.md`

### Financial And Protocol Domain

The financial system should not be represented as generic "finance". It has distinct components that need their own cards.

Main components found in mechanics and governance docs:

- Balance sheet truth: Minima assets, stablecoin liabilities, Coverage Fund instruments, xMinima equity.
- Fee economics: transaction fee formula and fee destination.
- Coverage Fund and cf tokens: NAV-style valuation, first-loss layer, fee claim.
- xMinima: equity exposure, smart router, formula price, no transaction-fee revenue under the locked mechanics.
- Mint and burn mechanics: stablecoins, xMinima, Coverage Fund deposit/redeem, and secondary market requirements.
- Merchant payment economics: merchant-first circulation, payment acceptance, listing/entry logic, local liquidity, settlement reliability, and cluster-level financial soundness.
- Merchant network finance: merchant density, local exchange availability, money velocity, payment volume, treasury contributions, and economic resilience of clusters.
- Test channel truth: real on-chain test tokens, no official value.
- Prod truth: real Minima and production Stables mechanics.
- Drift guard: some living docs conflict with the locked mechanics around fee destination, so protocol mechanics and handshake should win until reconciled.

Key source anchors:

- `0_handshake/protocol_mechanics_spec.md`
- `0_handshake/stables_master_reference.md`
- `0_handshake/handshake.md`
- `2_current/stream_3_governance/prod_protocol_specs/current_state_and_path.md`

### Community Growth Domain

Community is not only social posting. It is a staged growth system that eventually supports real merchant networks and Council formation.

Main components found in community documentation:

- Public presence: website, links, social profiles, Telegram, X, Instagram, Facebook, Discord, YouTube, TikTok, Twitch.
- Content runway: trust and transparency, platform guide, six-month journey, pillars, mechanics, build process, technical deep dive, community proof.
- Feedback loops: Telegram group, GitHub issues, public feedback intake, Demo changelog and feedback asks.
- Ambassador path: ambassadors before merchants, mentor/onboarder reward logic, onboarding guide, role definition.
- Merchant path: merchant preparation through ambassadors, merchant FAQ, objections, onboarding flow, wallet validation basis, merchant education, and merchant support.
- Cluster growth: ambassadors and clusters go together; either can bring the other. The first cluster needs champions, merchants, users, and local trust at the same time.
- Merchant community building: ambassadors recruit, educate, support, and protect the merchant network instead of treating merchants as a later isolated sales task.
- Community proof: tester and early adopter program, feedback reports, user stories.
- StablesAgent loop: public Q&A, knowledge base, answer gaps, community questions.

Key source anchors:

- `0_handshake/links.md`
- `2_current/stream_3_governance/task_dev_utils/plan/multi_platform_content_strategy.md`
- `2_current/stream_3_governance/task_dev_utils/plan/platform_tone_guide.md`
- `1_development/stream_2_community/task_ambassador_proposition/ambassador_framework_proposition.md`
- `1_development/stream_1_app/website/dapp/COMMUNITY_DEMO_DEVELOPMENT_PLAN.md`

### Council And Governance Domain

Council is not a separate governance stream in Navi. It belongs in Community as an achievement and hurdle passed: the community becomes capable of structured stewardship.

The Charter was reviewed as a core source for this draft. It defines mission, three destinations, transition doctrine, open platform doctrine, invariant boundaries, Council role, and handover direction. The current review still needs human discussion before these become final cards, but the proposed Council cards below are grounded in those Charter concepts.

Main components found in Council documentation:

- Charter: foundational draft and structural identity.
- Council role: architect of expansion, ecosystem coordinator, guardian of invariant integrity.
- Council phases: foundational Council, parameter governance, token-holder participation, open Council stewardship.
- Seat model: 20 seats designed, not live.
- Voting design: time-weighted voting concept.
- Governance boundaries: Council cannot become discretionary monetary operator.
- Immutable vs adjustable: monetary invariants fixed; app and governance surfaces can evolve within boundaries.
- Handover: domains, servers, keys, assets, adjustable variables, custody model, zero founder control destination.
- StablesAgent: eventual neutral voice of Council, not authoritative before governance is live.

Key source anchors:

- `2_current/stream_3_governance/prod_stables_charter/stables_charter.md`
- `2_current/stream_3_governance/prod_stables_charter/stables_charter_companion.md`
- `2_current/stream_3_governance/prod_protocol_specs/current_state_and_path.md`
- `0_handshake/handshake.md`

## Current Card Inventory Review

### Technical Stream

| Current card | Recommendation | Reason |
|---|---|---|
| MiniDapp Channel Structure | Merge | Too small for a card; channel truth belongs inside `Dapp Channel, Node Connection And Release Surface`. |
| Demo MINIMA Wallet Baseline | Merge | Real capability, but should be part of `Demo Wallet And Activity Surface`. |
| Wallet and Activity Cleanup | Merge | Tracker rows and acceptance checks inside `Demo Wallet And Activity Surface`, not a standalone card. |
| Coverage Fund UI Alignment | Keep, possibly move to Financial later | It is a UI task now, but its truth source is financial mechanics. |
| Demo Release Readiness | Merge | Release bar belongs inside `Demo Review Package`, not a standalone card. |
| In-App Trust And Official Links | Replace | Too vague; split into dev security hygiene, deployment verification, and domain/GitHub/social registry. |
| Sovereign Banking Device | Keep as destination | Valid long-term technical destination. |

### Financial Stream

Main objective: maintain the peg. Financial Stream cards should be read through that lens first: mint/burn discipline, solvency, Coverage Fund, local liquidity, settlement reliability, fee economics, and protocol accounting all exist to keep Stables stable before they become growth or builder surfaces.

| Current card | Recommendation | Reason |
|---|---|---|
| Locked Mechanics Reference | Split | Too broad. Should become protocol truth guard plus dedicated financial mechanics cards. |
| Demo Token UI Scope | Keep | Needed to prevent Demo token confusion. |
| Merchant-First Ramp UX | Keep | Bridges app UX, merchant strategy, and financial circulation. |
| Community Release Rhythm | Consider moving to Cross-stream | It is not mainly financial. It supports release and community feedback. |
| Later Protocol Truth Surfaces | Split | Covers too many mechanics: fees, Coverage Fund, xMinima, balance sheet, risk. |
| Test Channel Preparation | Keep | Needed phase card for real test-token work. |
| Financial System Basis For Builders And Community Fee Redistribution | Keep as destination | Valid long-term financial destination when framed as infrastructure for builders and financial players, not as Stables becoming a lender. |

### Community Stream

| Current card | Recommendation | Reason |
|---|---|---|
| Building Momentum | Keep | Baseline reach and public surface card. |
| Communication Plan | Keep, sharpen | Should connect to content phase runway and public education. |
| Ambassador Network | Keep | Central bridge before merchant onboarding. |
| Merchant Preparation | Keep | Necessary downstream of Ambassador Network. |
| Global Growth | Split or sharpen | Currently broad. Could split into content runway, tester/community proof, and cluster growth. |
| Unified Clusters | Keep, expand later | Valid later stage; needs Cluster Spark / Challenge detail. |
| Council Creation and Charter | Keep, maybe move to Governance cluster inside Community | Key Council component. |
| Council Handover | Keep | Long-term operational transfer card. |
| Community Destination | Keep as destination | Valid community destination. |
| Public Feedback Intake | Keep | Real current feedback loop. |

### Cross-Stream Cards

| Current card | Recommendation | Reason |
|---|---|---|
| Next Demo Cycle | Rename/merge | Current execution should be represented as `Demo Review Package`, a broader reviewable work package. |
| First Review Quest | Keep | Good later card for structured community review. |

## Proposed Master Card Inventory

This is a discussion draft, not the final live Navi set.

### Technical Stream - Proposed

#### 1. Removed: Showcase / Demo Channel Structure

- Category: Dapp Channels And Development Infrastructure
- Phases: Showcase, Demo
- Role: removed
- Recommendation: merge into `Dapp Channel, Node Connection And Release Surface`
- Reason: the channel selector and channel-truth split are important, but they are functions of the full Dapp channel and release surface, not card-sized components.
- Replacement scope: channel truth, stage labels, MDS/standalone node state, porting state, and release evidence.
- Evidence rule: channel truth should be reviewed through the broader channel/release card.

#### 2. Demo Wallet And Activity Surface

- Category: Wallet And User Banking
- Phases: Demo
- Role: active
- Recommendation: merge `Demo MINIMA Wallet Baseline` and `Wallet And Activity Cleanup`
- Objective: Make the Demo wallet and activity pages a reviewable node-connected banking surface.
- Scope: native MINIMA send/receive, balances, node-connected state, onboarding explanation, recent activity, filters, amount selection, Demo-only token boundary.
- Exclusions: Coverage Fund, merchant ramp, Council screens.
- Evidence: complete only when wallet send/receive, balances, activity entries, filters, and amount selection can be reviewed together.

#### 3. Removed: Wallet And Activity Cleanup

- Category: Wallet And User Banking
- Phases: Demo
- Role: removed
- Recommendation: merge into `Demo Wallet And Activity Surface`
- Reason: these are page-level acceptance checks for the wallet/activity surface, not a standalone component card.
- Replacement scope: wallet/activity review checklist.
- Evidence rule: individual fixes should remain tracker rows or KPIs inside the broader wallet card.

#### 4. Demo Invest And Coverage Fund UI

- Category: Invest And Coverage Fund
- Phases: Demo
- Role: later
- Recommendation: rename existing `Coverage Fund UI Alignment`
- Objective: Make Invest and Coverage Fund screens readable while staying aligned with protocol truth.
- Scope: Coverage Fund metric order, naming, illustrative labels, yield language, cf-holder language.
- Exclusions: full financial protocol card; this is app surface alignment.
- Evidence: tracker CD-009, CD-010, CD-011; protocol mechanics spec.

#### 5. Merchant Ramp And Shops UX

- Category: Merchant Banking Tools
- Phases: Demo
- Role: later
- Recommendation: add or keep as cross-reference with Financial `Merchant-First Ramp UX`
- Objective: Make merchant exchange, shops, invoices, and ramp surfaces reflect the real merchant-first path.
- Scope: On/Off Ramp, Shops, invoices, merchant display, merchant profile, payment requests, QR receive, wallet validation, nearby merchant exchange, current available route.
- Exclusions: ambassador economics and cluster growth.
- Evidence: app UI inventory, tracker CD-012, merchant strategy docs.

#### 6. Merchant Wallet And Validation UX

- Category: Merchant Banking Tools
- Phases: Demo, Test
- Role: candidate
- Recommendation: add
- Objective: Define how merchant wallets become recognizable, usable, and eventually valid inputs for merchant identity.
- Scope: merchant wallet profile, payment receiving, invoice history, validation status, pseudonymous merchant identity path.
- Exclusions: Council identity policy and full cluster economics.
- Evidence: app UI inventory, Charter identity direction, merchant preparation docs.

#### 7. Merchant Point-Of-Sale Path

- Category: Merchant Banking Tools
- Phases: Demo, Test, Prod
- Role: candidate
- Recommendation: add
- Objective: Turn merchant acceptance into a concrete app path instead of only a community ambition.
- Scope: payment requests, QR checkout, merchant display, settlement visibility, receipt/invoice flow, accepting-network readiness.
- Exclusions: ambassador recruitment and treasury finance.
- Evidence: app UI inventory, current state and path merchant API direction, Charter merchant settlement network.

#### 8. Removed: In-App Trust And Official Links

- Category: Dapp Channels And Development Infrastructure
- Phases: Showcase, Demo
- Role: removed
- Recommendation: replace with grounded cards
- Reason: "trust" and "official links" are outcomes, not a concrete work package.
- Replacement scope: `Development Environment Security Hygiene`, `Deployment Test And Public Preview Verification`, and `Domain, GitHub And Social Links Registry`.
- Evidence rule: each replacement must point to the public link, Dapp screen, social channel, GitHub/domain record, or checklist that proves the work exists.

#### 9. Dapp Channel, Node Connection And Release Surface

- Category: Dapp Channels And Development Infrastructure
- Phases: Demo, Test, Prod
- Role: candidate
- Recommendation: keep as broad channel/node/release card
- Objective: Make the Dapp channel state, node connection model, and release evidence truthful across Showcase, Demo, Test, and Prod.
- Scope: channel truth, sync pill, MDS connector, node state, degraded/disconnected labels, standalone-node readiness, porting state, release evidence.
- Exclusions: wallet page behavior, merchant page behavior, protocol economics.
- Evidence: complete only when a reviewer can inspect channel truth, node state, porting status, and release evidence together.

#### 10. Removed: Channel Porting Ledger

- Category: Dapp Channels And Development Infrastructure
- Phases: Showcase, Demo, Test, Prod
- Role: removed
- Recommendation: merge into `Dapp Channel, Node Connection And Release Surface`
- Reason: the ledger is evidence for channel/release discipline, not an app-page-level card.
- Replacement scope: porting rows appear as proof inside the channel/release card.
- Evidence rule: lead-channel/downstream rows stay in the tracker or porting doc.

#### 11. Removed: x402 And Bridge Readiness

- Category: Dapp Channels And Development Infrastructure
- Phases: Demo, Test
- Role: removed
- Recommendation: merge into `Test Standalone Node Requirement` and `Dapp Channel, Node Connection And Release Surface`
- Reason: bridge/x402 is a prerequisite or dependency, not a full card until there is a concrete Dapp page/module to review.
- Replacement scope: Test readiness requirements and node/channel capability checks.
- Evidence rule: keep x402/bridge as dependency rows until the surface exists.

#### 12. Removed: MiniDapp Versioning And Ship Checklist

- Category: Dapp Channels And Development Infrastructure
- Phases: Showcase, Demo, Test, Prod
- Role: removed
- Recommendation: do not add as a Navi card
- Reason: this is a process/control note, not a verifiable development todo on its own.
- Replacement: concrete version/package requirements should live inside `Demo Review Package`, `Dapp Channel, Node Connection And Release Surface`, or the exact feature card they block.
- Evidence rule: Navi cards must expose an inspectable output, pass/fail checkpoint, owner/source, and done/open status.

#### 13. Removed: Demo Review Release Gate

- Category: Dapp Channels And Development Infrastructure
- Phases: Demo
- Role: removed
- Recommendation: merge into `Demo Review Package`
- Reason: the gate is a checklist inside a review package, not a separate Navi card.
- Replacement scope: package contains build link, changelog, review notes, feedback ask, known limitations, and blockers.
- Evidence rule: pass/fail gate lives as a KPI/proof requirement inside the review package card.

#### 14. Demo Review Package

- Category: Dapp Channels And Development Infrastructure
- Phases: Demo
- Role: active
- Recommendation: keep as the current technical review bundle
- Objective: Assemble the next public Demo review package from channel selector, onboarding, wallet, cleanup, release notes, and feedback tasks.
- Scope: build link, changelog, review notes, feedback ask, and blocker list.
- Exclusions: long-term protocol implementation and cluster expansion.
- Evidence: complete only when a tester can open the package and see build, changelog, notes, feedback ask, and blockers.

#### 15. Test Standalone Node Requirement

- Category: Dapp Channels And Development Infrastructure
- Phases: Test
- Role: candidate
- Recommendation: add
- Objective: Make standalone node readiness a Test-phase requirement instead of leaving the app dependent on the Demo MDS connector model.
- Scope: standalone node path, MDS-to-standalone transition, node function incorporated early, Test package criteria.
- Exclusions: Demo-only MDS connector behavior.
- Evidence: MiniDapp versioning, node connection direction, Test phase definition.

#### 16. Testing App Easter Egg Minting

- Category: Mint, Burn And Token Scope
- Phases: Test
- Role: candidate
- Recommendation: add
- Objective: Define the app-side testing feature where users can discover and freely mint NFT easter eggs inside the testing app.
- Scope: free NFT minting, easter egg discovery, testing app UX, non-value framing, connection to feedback farming.
- Exclusions: paid NFT sale, treasury financing, or production token value claims.
- Evidence: user-defined testing direction; needs a dedicated source doc once approved.

#### 17. Sovereign Banking Device

- Category: Destinations
- Phases: Prod
- Role: destination
- Recommendation: keep
- Objective: Describe the long-term technical destination for a dedicated banking device and app integration.
- Scope: Minima node on chip, Stables Dapp integration, secure/offline-capable participation.
- Exclusions: current Demo app work.
- Evidence: Charter, current state and path.

### Financial Stream - Proposed

#### 1. Peg Mechanics Claim Guard

- Category: Protocol Mechanics And Solvency
- Phases: Showcase, Demo, Test, Prod
- Role: active
- Recommendation: split from `Locked Mechanics Reference`
- Objective: Ensure every public app and Navi claim supports the locked peg-maintenance mechanics.
- Scope: fee truth, xMinima truth, Coverage Fund truth, mint/burn truth, no false CR or live-protocol claims.
- Exclusions: individual financial mechanics cards.
- Evidence: `protocol_mechanics_spec.md`, `handshake.md`.

#### 2. Peg Balance Sheet Truth

- Category: Protocol Mechanics And Solvency
- Phases: Demo, Test, Prod
- Role: candidate
- Recommendation: add
- Objective: Explain the protocol balance sheet components that maintain the peg before deeper financial surfaces are shown.
- Scope: Minima assets, stablecoin liabilities, Coverage Fund instruments, xMinima equity, peg accounting.
- Exclusions: UI ordering and community education posts.
- Evidence: protocol mechanics spec, Charter, current state and path.

#### 3. Peg Fee Economics

- Category: Protocol Mechanics And Solvency
- Phases: Demo, Test, Prod
- Role: candidate
- Recommendation: add
- Objective: Make fee formula, fee flow, and fee destination unambiguous as peg-maintenance controls.
- Scope: transaction fee formula, cap, no minimum, fee flow, peg support, Coverage Fund/cf holders under locked mechanics.
- Exclusions: merchant listing fees and community treasury operations unless separately confirmed.
- Evidence: protocol mechanics spec and handshake.

#### 4. Coverage Fund And cf Tokens

- Category: Invest And Coverage Fund
- Phases: Demo, Test, Prod
- Role: candidate
- Recommendation: split from `Later Protocol Truth Surfaces`
- Objective: Explain the Coverage Fund as a junior/first-loss peg-protection layer with cf-token accounting.
- Scope: NAV, deposit/redeem, first-loss role, fee claim, risk language.
- Exclusions: app layout details; those belong in `Demo Invest And Coverage Fund UI`.
- Evidence: protocol mechanics spec.

#### 5. xMinima Equity And Router

- Category: Protocol Mechanics And Solvency
- Phases: Demo, Test, Prod
- Role: candidate
- Recommendation: split from `Later Protocol Truth Surfaces`
- Objective: Explain xMinima as protocol equity, not a transaction-fee claim.
- Scope: formula price, smart router, equity exposure, liquidity risk.
- Exclusions: cf-token yield and Coverage Fund UI.
- Evidence: protocol mechanics spec and handshake.

#### 6. Demo Token UI Scope

- Category: Mint, Burn And Token Scope
- Phases: Demo
- Role: later
- Recommendation: keep
- Objective: Clarify what users can test in Demo around token and peg-control surfaces without implying production token behavior or real value.
- Scope: demo-only Winiwa/Wables, mint/burn UI scope, peg-related labels, separation from real MINIMA wallet behavior.
- Exclusions: Test real-token disclaimers.
- Evidence: MiniDapp versioning and demo plan.

#### 7. Merchant-First Ramp UX

- Category: Merchant Network Economics
- Phases: Demo
- Role: later
- Recommendation: keep
- Objective: Restructure ramp language around the real merchant-first exchange path.
- Scope: nearby merchant, DIY exchange, current available route, no premature merchant-network claim.
- Exclusions: ambassador role and merchant cluster growth.
- Evidence: demo tracker CD-012 and community growth docs.

#### 8. Merchant Network Soundness

- Category: Merchant Network Economics
- Phases: Demo, Test, Prod
- Role: candidate
- Recommendation: add
- Objective: Define what makes the merchant network financially usable, not just socially present.
- Scope: merchant density, local exchange routes, settlement reliability, circulation, payment volume, money velocity, cluster liquidity.
- Exclusions: app UI widgets and ambassador recruitment scripts.
- Evidence: current state and path, Charter merchant-driven economic relevance, Dashboard future merchant metrics.

#### 9. Merchant Treasury And Entry Logic

- Category: Merchant Network Economics
- Phases: Demo, Test, Prod
- Role: candidate
- Recommendation: add
- Objective: Clarify how merchant/ambassador entry economics support the Council treasury and network growth.
- Scope: entry/listing logic, 16 Big Mac framing where approved, reward split, treasury contribution, avoiding mentor bypass.
- Exclusions: production monetary mechanics until protocol terms are locked.
- Evidence: ambassador proposition, current state and path, Charter Council treasury direction.

#### 10. Merchant Settlement And Local Liquidity

- Category: Merchant Network Economics
- Phases: Test, Prod
- Role: candidate
- Recommendation: add
- Objective: Track the path from merchant acceptance to reliable local settlement and liquidity.
- Scope: settlement path, merchant-to-user exchange, local liquidity, bridge/x402 dependencies, cluster circulation.
- Exclusions: Demo-only app mockups.
- Evidence: Charter merchant settlement network, current state and path, bridge readiness.

#### 11. Test Channel Preparation

- Category: Mint, Burn And Token Scope
- Phases: Test
- Role: later
- Recommendation: keep
- Objective: Prepare the future Test channel after Demo is truthful and reviewed.
- Scope: real on-chain test tokens, no official value, test package criteria.
- Exclusions: production launch claims.
- Evidence: MiniDapp versioning.

#### 12. Financial System Basis For Builders And Community Fee Redistribution

- Category: Destinations
- Phases: Prod
- Role: destination
- Recommendation: keep
- Objective: Describe the long-term financial destination where Stables becomes the financial system basis: stable settlement, protocol accounting, on-chain credit inputs, and community fee redistribution that builders and financial players can build on top of.
- Scope: stable settlement, protocol accounting, on-chain credit inputs, builder integration boundaries, merchant financial rails, community fee mechanisms, and permissionless infrastructure for external financial players.
- Exclusions: Stables acting as a lender, promising personal or commercial loans, or treating current Demo financial UI as production finance.
- Evidence: Charter, current state and path.

#### 13. Doc Truth And Drift Guard

- Category: Protocol Mechanics And Solvency
- Phases: Showcase, Demo, Test, Prod
- Role: candidate
- Recommendation: add
- Objective: Prevent public docs, app copy, and Navi from drifting away from locked mechanics.
- Scope: reconcile living docs, flag conflicts, route mechanics claims to authoritative specs, and make sure public wording does not contradict locked mechanics.
- Exclusions: implementing mechanics themselves.
- Evidence: handshake, protocol mechanics spec, current state and path conflict around fee flow.

Clarification: this is not meant as an abstract internal-control card for readers. It means "truth maintenance": when app copy, Navi, Dashboard, or public documentation talks about mechanics, fees, xMinima, Coverage Fund, merchant treasury, or Council authority, it must route back to the authoritative source and flag any drift before it becomes public confusion.

### Community Stream - Proposed

#### 1. Public Presence And Reach

- Category: Community Communication And Feedback
- Phases: Showcase
- Role: active
- Recommendation: rename `Building Momentum`
- Objective: Establish official public surfaces and measurable reach baselines.
- Scope: website, social links, Telegram, X, Instagram, Facebook, follower/member baselines.
- Exclusions: content strategy and ambassador onboarding.
- Evidence: `links.md`, Dashboard reach metrics.

#### 2. Content Phase Runway

- Category: Community Communication And Feedback
- Phases: Showcase, Demo
- Role: candidate
- Recommendation: add or split from `Communication Plan`
- Objective: Make the public narrative sequence visible and measurable.
- Scope: Phase -2 foundation, platform guide, journey content, pillars, mechanics, build process, community proof.
- Exclusions: app release notes and Council governance mechanics.
- Evidence: multi-platform content strategy and tone guide.

#### 3. Communication Plan

- Category: Community Communication And Feedback
- Phases: Showcase
- Role: active
- Recommendation: keep and sharpen
- Objective: Prepare how Stables, Navi, and the draft state are explained publicly.
- Scope: tone, post drafts, Navi feedback ask, platform adaptation.
- Exclusions: full content calendar and ambassador economics.
- Evidence: content strategy, tone guide, Navi metrics.

#### 4. Public Feedback Intake

- Category: Community Communication And Feedback
- Phases: Showcase, Demo
- Role: active
- Recommendation: keep
- Objective: Turn public feedback into structured inputs for the next Demo cycle.
- Scope: feedback destination, bug/UX/question separation, feedback counts, tracker routing.
- Exclusions: social growth metrics and release cadence.
- Evidence: feedback files, feedback schema, Dashboard feedback metrics.

#### 5. StablesAgent Community Knowledge Loop

- Category: Community Communication And Feedback
- Phases: Showcase, Demo
- Role: candidate
- Recommendation: add
- Objective: Use community questions and answer gaps to improve public knowledge.
- Scope: web agent, Telegram questions if available, answer gaps, knowledge base updates.
- Exclusions: official Council decisions.
- Evidence: brain docs, StablesAgent links, Dashboard agent metrics.

#### 6. Demo Community Release Rhythm

- Category: Community Communication And Feedback
- Phases: Demo
- Role: candidate
- Recommendation: move/split from `Community Release Rhythm`
- Objective: Keep releases understandable by pairing changelogs, open items, feedback asks, and visible roadmap.
- Scope: release notes, feedback asks, what changed, what needs review, what comes next.
- Exclusions: financial velocity as economic metric.
- Evidence: demo development plan and tracker.

#### 7. First Review Quest

- Category: Community Communication And Feedback
- Phases: Demo
- Role: later
- Recommendation: keep, but reflect inside Community Stream instead of a fourth cross-stream column
- Objective: Invite community review only once the Demo cycle is coherent enough to inspect.
- Scope: wallet baseline, channel truth, merchant ramp, feedback flow, copy clarity.
- Exclusions: broad marketing campaign.
- Evidence: demo release bar and feedback metrics.

#### 8. Feedback Farming Program

- Category: Community Communication And Feedback
- Phases: Demo, Test
- Role: candidate
- Recommendation: add
- Objective: Turn feedback into a visible participation program connected to testing app easter eggs and structured review.
- Scope: feedback prompts, feedback routing, free NFT/easter egg rewards, tester participation, issue categories, review reports.
- Exclusions: paid NFT sale, production incentives, or merchant treasury mechanics.
- Evidence: user-defined testing direction, feedback schema, Dashboard feedback metrics.

#### 9. Ambassador Network

- Category: Ambassadors And Cluster Growth
- Phases: Showcase, Demo
- Role: later
- Recommendation: keep
- Objective: Build the ambassador layer before direct merchant onboarding.
- Scope: ambassador role, interest signals, onboarding guide, mentor/onboarder logic.
- Exclusions: direct merchant onboarding before ambassadors.
- Evidence: ambassador proposition, discussion topic, Dashboard ambassador metrics.

#### 10. Ambassador And Merchant Cell Model

- Category: Ambassadors And Cluster Growth
- Phases: Showcase, Demo
- Role: candidate
- Recommendation: add
- Objective: Show how ambassadors and merchants grow together as local cells instead of separate programs.
- Scope: active onboarder, mentor, merchant, Council treasury split, no bypass incentive, local trust.
- Exclusions: technical merchant point-of-sale implementation.
- Evidence: ambassador proposition and community growth docs.

#### 11. Merchant Preparation

- Category: Ambassadors And Cluster Growth
- Phases: Demo
- Role: later
- Recommendation: keep
- Objective: Prepare merchant onboarding through ambassadors.
- Scope: merchant FAQ, objections, onboarding flow, wallet validation path, education/support path, first accepting merchant criteria.
- Exclusions: Cluster Challenge and full merchant network claims.
- Evidence: ambassador docs, strategic roadmap, merchant ramp metric.

#### 12. Cluster Spark

- Category: Ambassadors And Cluster Growth
- Phases: Demo, Test
- Role: candidate
- Recommendation: add
- Objective: Define the first local cluster target where ambassadors and merchants reinforce each other.
- Scope: first cluster, cluster champions, ambassadors, 50+ users, 10+ merchants, merchant support loop.
- Exclusions: mature cluster federation.
- Evidence: current state and path.

#### 13. Cluster Challenge

- Category: Ambassadors And Cluster Growth
- Phases: Test, Prod
- Role: candidate
- Recommendation: add or combine with `Unified Clusters`
- Objective: Convert cluster growth into staged Bronze, Silver, and Gold progression.
- Scope: challenge tiers, local density, merchant/user targets, progress signals.
- Exclusions: current Demo onboarding.
- Evidence: current state and path.

#### 14. Global Growth

- Category: Community Communication And Feedback
- Phases: Showcase, Demo, Test
- Role: active
- Recommendation: split or sharpen
- Objective: Develop self-onboarding and growth loops beyond the first channels.
- Scope: self-onboarding toolkit, growth schemas, weekly reach.
- Exclusions: clusters and Council governance if those become separate cards.
- Evidence: current Navi data and growth strategy docs.

#### 15. Unified Clusters

- Category: Ambassadors And Cluster Growth
- Phases: Test, Prod
- Role: later
- Recommendation: keep, likely after adding Cluster Spark
- Objective: Develop local accepting networks and cluster federation.
- Scope: cluster definition, merchant growth quest, cluster metrics.
- Exclusions: first ambassador onboarding.
- Evidence: current state and path.

#### 16. Council Creation And Charter

- Category: Council Formation And Handover
- Phases: Showcase, Demo, Test
- Role: active
- Recommendation: keep
- Objective: Present the Charter and Council model as the cornerstone of autonomous execution.
- Scope: Charter, Council role, ambassadors, merchants, feedback cycle, identity path.
- Exclusions: handover operations and seat/voting implementation detail if split.
- Evidence: Charter, Charter companion, Navi metrics.

#### 17. Council Seat And Voting Design

- Category: Council Formation And Handover
- Phases: Test, Prod
- Role: candidate
- Recommendation: add
- Objective: Separate designed Council structure from what is actually live.
- Scope: 20-seat model, founding/elected/merit seats, voting weights, designed-not-live framing.
- Exclusions: Charter philosophy and handover assets.
- Evidence: current state and path, Charter.

#### 18. Council Handover

- Category: Council Formation And Handover
- Phases: Prod
- Role: later
- Recommendation: keep
- Objective: Define the transition from core development control to Council custody and execution.
- Scope: domains, servers, keys, assets, adjustable variables, custody, accountability.
- Exclusions: current public draft communications.
- Evidence: handshake, current state and path, Charter.

#### 19. Community Destination

- Category: Destinations
- Phases: Prod
- Role: destination
- Recommendation: keep
- Objective: Describe the long-term community destination for autonomous Council operation and pseudonymous on-chain identity.
- Scope: elected Council actors, executive arm, autonomous operation, cluster maturity.
- Exclusions: near-term communication and ambassador setup.
- Evidence: Charter and current Navi data.

### Cross-Stream Handling Rule

Navi should keep a three-column structure: Technical, Financial, Community. There should not be a fourth visible Cross-Stream column.

When a card touches multiple streams, it should be reflected in the stream where the reader needs to act first, with cross-stream dependencies or linked related cards inside the card content.

Former cross-stream concepts are now placed as follows:

- `Demo Review Package` belongs in Technical because it coordinates the current Demo execution block as a reviewable package.
- `Demo Community Release Rhythm`, `First Review Quest`, and `Feedback Farming Program` belong in Community because they organize participation and review.
- `Testing App Easter Egg Minting` belongs in Technical because it is a testing-app feature, with a dependency on Community feedback farming.
- `Doc Truth And Drift Guard` belongs in Financial/Protocol because its highest-risk function is preventing mechanics drift.

## Proposed First Implementation Priority

Do not add every candidate at once. First update should make Navi clearer without exploding the card count.

Suggested first update:

1. Merge small function cards into page/module cards. `MiniDapp Channel Structure`, `Channel Porting Ledger`, and x402/bridge tracking belong inside `Dapp Channel, Node Connection And Release Surface`.
2. Rename `Building Momentum` to `Public Presence And Reach`.
3. Rename `Coverage Fund UI Alignment` to `Demo Invest And Coverage Fund UI`.
4. Split `Locked Mechanics Reference` into:
   - `Protocol Truth Guard`
   - `Fee Economics`
   - `Coverage Fund And cf Tokens`
   - `xMinima Equity And Router`
5. Move or reframe `Community Release Rhythm` as cross-stream `Demo Community Release Rhythm`.
6. Introduce categories immediately in the first live Navi update.
7. Add the merchant backbone cards:
   - `Merchant Ramp And Shops UX`
   - `Merchant Wallet And Validation UX`
   - `Merchant Point-Of-Sale Path`
   - `Merchant Network Soundness`
   - `Merchant Treasury And Entry Logic`
   - `Merchant Settlement And Local Liquidity`
   - `Ambassador And Merchant Cell Model`
   - `Cluster Spark`
8. Treat all merchant backbone cards as active enough to be visible now, even if their implementation status differs.
9. Add only the most useful non-merchant gap cards now:
   - `Dapp Channel, Node Connection And Release Surface`
   - `Test Standalone Node Requirement`
   - `Testing App Easter Egg Minting`
   - `Feedback Farming Program`
   - `Public Post Queue By Dapp Phase`
   - `StablesAgent FAQ Gap Log`
   - `Council Seat And Voting Design`
   - `Protocol Claim Audit Queue`

Everything else can stay as later candidate until the first review pass is approved.

## Content Decisions From Review

1. Cross-stream reflection is acceptable where the same component truly belongs in multiple places. Coverage Fund/cf truth can appear in Financial and Technical when it shapes both protocol meaning and app UI.
2. There is no separate Governance stream for now. Council belongs in Community because Council formation is a community achievement and a hurdle passed.
3. Cluster and ambassador work go hand in hand. One can bring the other, so Cluster Spark should not be hidden until ambassadors are complete.
4. The previous funding interpretation should be replaced. NFTs are testing-app easter eggs that can be minted for free. The related community mechanism is a feedback farming program.
5. x402 readiness should be visible, and bridge readiness should sit beside it as a Test-phase prerequisite.
6. `Doc Truth And Drift Guard` means truth maintenance: keeping Navi, app copy, Dashboard, and public docs aligned with authoritative mechanics and Charter boundaries.
7. The visible Navi structure should remain three columns only: Technical, Financial, Community. Cross-stream concepts should be reflected inside their respective stream cards, not as a fourth column.
8. Merchant app functionality, merchant network soundness, ambassador/merchant cell model, and cluster spark should all be treated as active discussion cards now.
9. Standalone node readiness should be a Test-phase requirement card.
10. Categories should be introduced immediately in the first live Navi update.

## Feedback Farming Working Model

This can be designed from the app structure already known from Showcase and Demo, without waiting for a full app-tree review.

Relevant app surfaces:

- **Feedback**: structured submissions, bugs, UX issues, questions, feature requests.
- **My profile**: tester identity, earned badges/easter eggs, participation history.
- **Wallet / Activity**: wallet tests, send/receive tests, activity visibility tests, node connection checks.
- **Shops / On-Off Ramp / Merchant surfaces**: merchant-flow tests, invoice/payment request tests, merchant exchange path reviews.
- **Council / Ambassador surfaces**: governance understanding, ambassador onboarding, merchant preparation, review quests.
- **Testing app rewards area**: future place for free NFT easter eggs, tester categories, and quest completion markers.

Actions that can count:

- Submit structured feedback through the app.
- Report a bug with enough context to reproduce.
- Review a specific screen or flow after a release note asks for it.
- Test wallet send/receive and report node/MDS behavior.
- Test merchant flows: shop, invoice, QR/payment request, on/off ramp, merchant profile.
- Test feedback categories and confirm whether feedback routes correctly.
- Complete review quests such as "wallet baseline", "channel truth", "merchant ramp", or "copy clarity".
- Re-test a fixed issue and confirm whether it is solved.

Reward / recognition types:

- Free NFT easter eggs minted inside the testing app.
- Tester role categories, not just collectibles.
- Quest completion markers.
- Review participation badges.
- Specialist categories such as Bug Hunter, UX Reviewer, Merchant Tester, Node Tester, Bridge Tester, Ambassador Helper, Cluster Builder, and Council Reviewer.

Important limits:

- These NFTs are free testing-app easter eggs.
- They should not imply financial value.
- They should not replace the real feedback tracker.
- They should help people see their contribution history and motivate better testing.

## Remaining Discussion Questions

1. Which first tester categories should launch first: Bug Hunter, UX Reviewer, Merchant Tester, Node Tester, Ambassador Helper, or another smaller set?
2. Should free NFT easter eggs appear first in `My profile`, in the Feedback flow, or in a dedicated testing rewards area?
3. For Test standalone node readiness, what will the Minima team make available: full node function inside the Dapp, packaged local node helper, or a non-MDS connector path?
4. For the category UI, should each stream show only the first few categories with a `Show more` button, or should each category box collapse independently?

## Implementation Decisions Locked

- First tester category to launch: **UX Reviewer**.
- Free NFT easter egg placement: undecided for now; implementation can proceed with the concept documented, then placement can be decided from the app UI.
- Test standalone node readiness: depends on what the Minima team makes available. Navi should mark it as a Test-phase requirement and external dependency, not guess the connector design.
- Category UI: implement a concrete first version instead of debating UI options abstractly. Review will happen from the visible result.

## Review Notes

- The current stream structure remains solid: Technical, Financial, Community, with cross-stream cards where needed.
- A category layer is likely needed to avoid exploding the visible card count while still reflecting the project components.
- The visible page should stay a three-column structure; cross-stream meaning belongs inside card content and dependencies.
- Merchants must be treated as foundational, not as a late community add-on: app functionality, financial soundness, and ambassador-led community growth all depend on them.
- The main problem is not visual structure anymore. It is card granularity.
- Some current cards are too broad and hide important components.
- Some important docs are not represented at all, especially merchant app functionality, merchant network soundness, porting discipline, fee economics, cf vs xMinima, Council seat/voting design, content phase runway, bridge/x402 readiness, standalone node readiness, and StablesAgent community learning.
- The next live update should probably be a careful rename/split/add pass, not a full rewrite.
