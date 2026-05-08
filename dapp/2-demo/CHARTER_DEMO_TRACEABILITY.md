# Stables Demo MiniDapp — Charter traceability handout

**Audience:** Agents and developers working on **`1_development/stream_1_app/website/dapp/2-demo/`** (demo channel).  
**Purpose:** One checklist so the **demo** visibly reflects the **Stables Charter** and handshake **protocol mechanics**, without inventing economics.

**Authority order (never invert):**

1. **`0_handshake/protocol_mechanics_spec.md`** — wins any numeric or mechanical conflict.
2. **`1_development/stream_3_governance/prod_governance_papers/stables_charter.md`** — intent, governance, risk framing, UX principles.
3. **`0_handshake/handshake.md`** — process, comms law, versioning, CHANGELOG rules.

**Before you ship UI copy that explains mint, burn, fees, CR, Coverage Fund, or xMinima:** run **handshake Step 0b** (read `protocol_mechanics_spec.md` first).

**Canonical demo tree:** `1_development/stream_1_app/website/dapp/2-demo/` — see **`0_handshake/minidapp_version.md`**. Log user-visible work in **`dapp/2-demo/CHANGELOG.md`**. Update **`1_development/stream_1_app/ui_inventory/app_ui_inventory.md`** when routes or major sections change.

---

## 1. Mission, philosophy, transition (Preamble + Article I)

| Charter idea | Demo deliverable (examples) |
|--------------|-----------------------------|
| Sovereign banking on Minima; bridge to fiat units of account; **circulation over accumulation** | Mission / About copy; one short “why Stables” panel |
| Human access to money; Stables as **means**, not terminal asset | Ethos strip on home or settings |
| **Dual destination** (infrastructure + financial sovereignty) | Two-column explainer or academy cards |
| **Transition doctrine** (staged path, honest uncertainty) | Timeline or staged cards; avoid “finished world” tone |
| **Open platform**; lenders on top; **merchant shop loans** as early borrowing case | Academy or “Build on Stables” note |
| **Treasury buckets** including **Human Rights Retrocession** | Educational list (no fake treasury execution unless real) |
| **Retrocession**: pseudonymous **Eligibility Commitment**, caps, receipts, merchant validation | Stub UX or explainer modal; label as “design direction” if not wired |
| **Concentration + flow monitoring** (I.5.4) | Read-only panel or placeholders with honest “monitoring only” labels |
| **Minima archive / base-layer monitoring** (I.5.6) | Short explainer + link to public-safe docs only (no credentials) |

---

## 2. Monetary core and mechanics (Article II + `protocol_mechanics_spec.md`)

| Topic | Must match mechanics spec | Demo deliverable |
|-------|-----------------------------|------------------|
| **Minima-only** collateral | Yes | Mint screen, collateral explainer |
| **Mint / burn fees** | **No friction, no fees** on mint/burn | Copy and fee line items |
| **Payment fees** | `Fee = min($1.00, amount × 0.01%)` | Show on **spend / transfer** paths, not on mint/burn |
| **Solvency / backing ratio** | Per spec | Dashboard or Mint section |
| **Floating redemption** | Honest when BR &lt; 1 | Clear user copy, no “always $1” lie |
| **CR regimes** (normal / guarded / critical) | Tables in spec | Status pill or academy section |
| **Coverage Fund / cf** | Junior tier; yield to **cf** holders | Coverage UI + copy |
| **xMinima** | **Zero transaction-fee revenue**; equity / stress role | Invest / exchange copy must not claim fee yield |
| **Oracle issuance gate** | Mint can gate; redemption continues | Separate messaging for mint vs redeem |
| **Three pillars + risk topology** (II.8–II.9) | Narrative only | One structured explainer (Academy) |

---

## 3. Architecture and mental model (Article III)

| Charter section | Demo deliverable |
|-------------------|------------------|
| **Layer model** (L0–L3) | Diagram or bullets |
| **Execution vs settlement**; **dual finality** | Academy module; align with off-ramp / payment copy |
| **Off-chain claims** (signed state, sequencing) | Explain where relevant; do not imply instant global settlement |
| **III.4 Value network vs information network** | Dedicated short page or academy card (anti-copy framing) |

---

## 4. Merchants and rails (Article IV + Annex C.1)

| Charter idea | Demo deliverable |
|--------------|------------------|
| **Merchant flywheel** | One diagram or flow |
| **IV.6–IV.7 Merchant-first**; **cash ↔ Stables** as **primary** onboarding story | **On/Off Ramp** page: lead with merchant path; ramps / CEX / USDT / bridge **secondary** |
| **Merchant credit loop** (circulation, future consumption) | Copy only unless product sim exists; no false interest promises |

---

## 4.1 x402 readiness track (optional integration surface)

| Objective | Demo expectation |
|-----------|------------------|
| Keep x402 as **modular** and **optional** | Treat as adapter path above core, not as monetary dependency |
| Explain machine-native payment flow clearly | Add short academy/devtools note: `402 quote -> payment proof -> settlement check -> access` |
| Preserve invariant boundaries | Never imply x402 can bypass issuance/redemption/solvency/oracle constraints |
| Avoid finality confusion | Label asynchronous states: accepted, pending verification, globally settled |
| Stay provider-agnostic | UI wording must not hard-lock to one facilitator/chain unless explicitly configured |
| Track risk in watch channels | Add one pointer to `#technology-watch` for standard changes and incident notes |

External references for builders:
- `https://www.x402.org/`
- `https://docs.x402.org/core-concepts/http-402`

---

## 5. Oracle (Article V)

| Idea | Demo deliverable |
|------|------------------|
| Multi-source, median, smoothing, integrity | Short academy or tooltip text; **issuance vs redemption** distinction |

---

## 6. Transparency, external refs, network safety (Article VI)

| Charter section | Demo deliverable |
|-----------------|------------------|
| **Structural transparency** (collateral, liabilities, BR, stress) | Dashboard / simulator entry (even simplified) |
| **VI.3** Bluechip / Pharos | **Link only** to URLs in **`0_handshake/links.md`** “Independent stablecoin risk and ratings” block; include **non-endorsement** disclaimer |
| **VI.4 Network truth and isolation detection** | Status indicator (healthy → offline), warnings before pay/receive, optional diagnostics, **privacy toggles**; never claim perfect global truth |

---

## 7. Governance, horizon scan, comms (Article VII)

| Idea | Demo deliverable |
|------|------------------|
| Governance phases; code-first limits | Academy or Council page summary |
| Founder → Council transfer | High-level checklist only (no secrets) |
| **VII.7–VII.8** horizon scanning + routing | **More → Community / Legal & notices**: Discord **STRATEGIC WATCH** + Telegram routing per **`links.md`**; roster “when published” |

---

## 8. Anchoring (Article VIII)

| Idea | Demo deliverable |
|------|------------------|
| Future Integritas anchoring | “Planned verification” copy only; no fake hashes |

---

## 9. AI (Article IX)

| Idea | Demo deliverable |
|------|------------------|
| StablesAgent is **non-authoritative** | Disclosures; point to on-chain state + docs; confirm on high-impact actions |

---

## 10. Closing values (Article X)

| Idea | Demo deliverable |
|------|------------------|
| Self-custody, visibility, unconditional exit framing | One closing card or settings legal summary |

---

## 11. Risk and security awareness (Annex B + recent rows)

| Topic | Demo deliverable |
|-------|------------------|
| Risk categories at high level | Optional “Risk atlas lite” or link to Charter Annex B |
| **Connectivity / internet shortage** | Mention in network truth or risk copy where relevant |
| **Peer-to-node malware / supply chain (row 25)** | Security tips: signed updates, no seed sharing; calm tone |

---

## 12. Non-functional (handshake)

- **`APP_STAGE: demo`** and version pill per **`runtime-config.js`** + **`minidapp_version.md`**.
- **`web_component_spec.md`** + **`2_current/stream_1_app/prod_brand_masters/`** for visuals.
- **No em dash (—)** in public-facing copy per **`handshake.md` §4** (use hyphen or rephrase).
- **Do not use the word “doctrine”** in user-facing text; use “Charter,” “official papers,” or “architectural rules.”

---

## 13. Suggested implementation order (demo)

1. **Truth surfaces:** dashboard (BR, collateral, liabilities) + **network truth** indicator.  
2. **Money paths:** Mint/Burn + **fee-on-spend** only where applicable.  
3. **Onboarding story:** On/Off Ramp **merchant-first**, then technical routes.  
4. **Education:** Academy modules for **layers**, **execution vs settlement**, **value vs information**.  
5. **Governance / risk / external refs:** lighter pages with **links** and disclaimers.

---

## 14. x402 readiness — concrete task list with file targets (demo)

Use this as the implementation brief for the coding agent.

### 14.1 Create payment intent and status contract

- **Add:** `1_development/stream_1_app/website/dapp/2-demo/assets/x402/payment-intent.js`
  - Export status constants:
    - `quoted`
    - `paid_submitted`
    - `verifying`
    - `settled`
    - `failed`
    - `expired`
  - Export a schema/helper for canonical fields:
    - `payment_id`, `resource_id`, `amount`, `asset`, `expiry_ts`, `nonce`, `request_hash`, `status`, `created_at`, `updated_at`
- **Wire usage in:** `assets/app.js` (global registration) and route modules that need paid action state.

### 14.2 Add provider-agnostic adapter interface (stub only)

- **Add:** `1_development/stream_1_app/website/dapp/2-demo/assets/x402/adapter.js`
  - Interface:
    - `getQuote(resource, params)`
    - `submitProof(intent, proofPayload)`
    - `verifySettlement(intent)`
  - Return mocked deterministic responses for demo mode.
- **Config flag:** `1_development/stream_1_app/website/dapp/2-demo/assets/config/runtime-config.js`
  - Add toggles such as:
    - `X402_ENABLED` (default `false`)
    - `X402_MODE` (`mock`)
    - `X402_PROVIDER` (`none`)

### 14.3 Add x402 service orchestration and replay guards

- **Add:** `1_development/stream_1_app/website/dapp/2-demo/assets/x402/service.js`
  - Intent lifecycle orchestration.
  - Idempotency and replay guard checks using:
    - `payment_id`
    - `nonce`
    - `request_hash`
  - Single-use mark (`used_at`) before granting resource access.
- **Persist local demo ledger:** localStorage namespace with compact records for:
  - intents
  - status transitions
  - failures (with reason codes)

### 14.4 Add user-facing status and finality-safe copy

- **Update:** `1_development/stream_1_app/website/dapp/2-demo/index.html`
  - Add reusable status badge component (or panel) for payment state.
  - Add explanatory text:
    - “Accepted” is not equal to “Globally settled.”
    - Show explicit pending verification state.
- **Update route copy in:** `assets/routes/exchange.js` and/or `assets/routes/wallet.js` (where paid actions are surfaced).

### 14.5 Add one visible demo page/module for machine payments

- **Preferred route module:** `1_development/stream_1_app/website/dapp/2-demo/assets/routes/protocol.js`
  - Add section: “Machine payments (x402 readiness)”
  - Show flow: `402 quote -> payment proof -> settlement check -> access`
  - Include disclaimer:
    - optional integration surface,
    - no bypass of issuance/redemption/solvency/oracle rules.

### 14.6 Add structured telemetry log (debug only)

- **Add:** `1_development/stream_1_app/website/dapp/2-demo/assets/x402/log.js`
  - Event types:
    - `quote_requested`
    - `quote_received`
    - `proof_submitted`
    - `verification_started`
    - `verification_passed`
    - `verification_failed`
    - `intent_expired`
  - Keep data minimal; no sensitive key material.

### 14.7 Update legal/notices references and governance watch pointer

- **Update:** `index.html` section for Legal & notices / Community links
  - Add short pointer:
    - x402 standard watch updates are tracked in Discord `#technology-watch`.
  - Do not claim endorsement of any one facilitator.

### 14.8 Required documentation updates after code changes

- **Update:** `1_development/stream_1_app/website/dapp/2-demo/CHANGELOG.md`
  - Add user-visible lines for x402 readiness UI states and page/module changes.
- **Update:** `1_development/stream_1_app/ui_inventory/app_ui_inventory.md`
  - If a new visible section/page is added.
- **Keep this file updated:** `CHARTER_DEMO_TRACEABILITY.md` section 14 checklist progress.

### 14.9 Acceptance checklist (definition of done)

- [ ] Intent schema exists and is reused.
- [ ] Adapter interface exists and is mock-functional.
- [ ] Status states render in UI with finality-safe wording.
- [ ] Replay/idempotency checks are enforced in service layer.
- [ ] At least one route/page demonstrates full mocked flow.
- [ ] Changelog and UI inventory are updated where required.

---

*End of handout. Update this file when the Charter adds new articles or when demo scope changes materially.*
