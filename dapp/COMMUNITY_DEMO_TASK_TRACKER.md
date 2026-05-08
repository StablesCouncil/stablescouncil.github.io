# Stables MiniDapp - Community Demo Task Tracker

**Status:** Active execution tracker  
**Scope:** `1_development/stream_1_app/website/dapp/`  
**Primary target:** `dapp/2-demo/`  
**Companion plan:** `COMMUNITY_DEMO_DEVELOPMENT_PLAN.md`

---

## How to use

This file is the precise execution board for the community demo line.

Each item tracks:

- implementation state
- review state
- confirmation state
- release state
- version target or release version

### Checkbox meaning

- `Implementation`: work built in the dev tree
- `Review`: checked together after implementation
- `Confirm`: accepted as the intended product direction
- `Released`: shipped in a named version

### Status values

- `Planned`
- `In progress`
- `Ready for review`
- `Confirmed`
- `Released`
- `Deferred`

---

## Snapshot

| Track | Status | Notes |
|------|--------|-------|
| Channel structure | In progress | Selector implementation started; channel truth split still to follow |
| Wallet truth baseline | Active baseline | Demo already supports native MINIMA send / receive with connected node |
| Demo onboarding message | Planned | Demo should explain zip install path plus current wallet and mint / burn UI test scope |
| Release tracker | In place | Use this file for execution state |
| Community cadence | Planned | Frequent releases with changelog and feedback loop |

---

## Daily command set

Use these commands as the standard local startup routine.

### Full local website loop

```powershell
Set-Location "C:\Users\Charles\Documents\Stables"
node 1_development/stream_1_app/work/tools/website/serve-local.mjs ../../website 8080
```

Open:

```text
http://localhost:8080/dapp/2-demo/
```

### Local feedback API

```powershell
Set-Location "C:\Users\Charles\Documents\Stables\1_development\stream_2_community\task_x_public_feedback_ledger"
node tools/feedback_submit_server.mjs
```

Expected endpoint:

```text
http://127.0.0.1:8788/api/feedback
```

### Node-connected browser validation

- Open the demo on localhost
- Use **Connect node**
- Default local node values:
  - Host: `127.0.0.1`
  - Port: `9003`

### Final verification rule

- Build on localhost
- Connect localhost to the node
- Do final verification in the real MiniDapp hub

---

## Core release board

| ID | Task | Key elements | Implementation | Review | Confirm | Status | Released | Version |
|----|------|--------------|----------------|--------|---------|--------|----------|---------|
| CD-001 | Showcase / Demo selector | Turn top wallet pill into selector; allow switch between Showcase and Demo; keep shared app surface | [x] | [x] | [x] | Confirmed | [ ] | Target: next demo cycle |
| CD-002 | Channel truth model | Showcase = rich synthetic bank state; Demo = real node-linked data where available plus demo-only Winiwa / Wables | [ ] | [ ] | [ ] | Planned | [ ] | Target: next demo cycle |
| CD-003 | Protect demo MINIMA wallet baseline | Preserve native MINIMA send / receive in demo when node connected; do not regress current capability | [ ] | [ ] | [ ] | Planned | [ ] | Target: next demo cycle |
| CD-003A | Demo onboarding message | Add first-message onboarding note that the demo can be installed in the node from the zip file; state that it already works as a simple MINIMA wallet for send / receive and can be used to test the mint / burn token UI | [ ] | [ ] | [ ] | Planned | [ ] | Target: next demo cycle |
| CD-004 | Short display version format | Display human-readable version like `v0.0.0.0.3` while keeping canonical internal versioning unchanged | [ ] | [ ] | [ ] | Planned | [ ] | Target: next demo cycle |
| CD-005 | Send screen cleanup | Remove the big text in Send; tighten clarity without reducing function | [x] | [ ] | [ ] | Ready for review | [ ] | Target: next demo cycle |
| CD-006 | Main-page FX activity visibility | Make FX exchanges appear in recent activity on the main page too | [x] | [ ] | [ ] | Ready for review | [ ] | Target: next demo cycle |
| CD-007 | Activity time filtering | Add transaction filtering by date, period, and timeframe | [x] | [ ] | [ ] | Ready for review | [ ] | Target: next demo cycle |
| CD-008 | Amount selector verification | Review visible amount selector / dropdown behavior across flows and fix inconsistencies | [ ] | [ ] | [ ] | Planned | [ ] | Target: next demo cycle |
| CD-009 | Coverage Fund summary first | Show current fund size, accumulated fees, and annualized historical return first | [ ] | [ ] | [ ] | Planned | [ ] | Target: next demo cycle |
| CD-010 | Coverage Fund naming cleanup | Use selector label `Coverage fund`; keep copy aligned with mechanics | [ ] | [ ] | [ ] | Planned | [ ] | Target: next demo cycle |
| CD-011 | Coverage Fund truth alignment | Clarify junior / first-loss role, cf-holder yield role, and what is illustrative vs live | [ ] | [ ] | [ ] | Planned | [ ] | Target: next demo cycle |
| CD-012 | On/Off Ramp merchant-first structure | Split into two sections: nearby merchant / DIY exchange first, current technical route second | [ ] | [ ] | [ ] | Planned | [ ] | Target: next demo cycle |
| CD-013 | Links page in-app | Add or strengthen in-app Links page for official properties and trust surfaces | [ ] | [ ] | [ ] | Planned | [ ] | Target: next demo cycle |
| CD-014 | Faucet / acquisition copy cleanup | Replace misleading `Acquire` wording; point users to Faucet where that is the truthful current action | [ ] | [ ] | [ ] | Planned | [ ] | Target: next demo cycle |
| CD-015 | Make my bank look mine scaffold | Add personalization module after App updates; include future themes and creator-sharing direction as coming soon | [ ] | [ ] | [ ] | Planned | [ ] | Target: post next demo cycle |
| CD-016 | Presentation quality uplift | Bring more of the presentation's clarity and product storytelling into the web base version | [ ] | [ ] | [ ] | Planned | [ ] | Target: post next demo cycle |
| CD-017 | Visible roadmap surfaces | Keep future modules visible where useful and clearly labeled as coming soon | [ ] | [ ] | [ ] | Planned | [ ] | Target: rolling |
| CD-018 | Community release rhythm | Release at a steady cadence with clear changelog, feedback ask, and next-step communication | [ ] | [ ] | [ ] | Planned | [ ] | Target: rolling |

---

## Charter and mechanics alignment board

| ID | Task | Key elements | Implementation | Review | Confirm | Status | Released | Version |
|----|------|--------------|----------------|--------|---------|--------|----------|---------|
| CA-001 | Protocol truth surface | Show collateral / assets, liabilities, equity, and backing or coverage state in a legible way | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |
| CA-002 | CR regime visibility | Make normal / guarded / critical regime visible in the UI | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |
| CA-003 | Fee distinction clarity | Keep mint / burn as no-fee; apply payment fee logic only where payment economics are explained | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |
| CA-004 | xMinima truth alignment | Preserve that xMinima is equity, has no transaction-fee revenue, and carries stress / liquidity constraints | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |
| CA-005 | Merchant-first onboarding story | Reflect merchant-first circulation logic in onboarding and On/Off Ramp UX | [ ] | [ ] | [ ] | Planned | [ ] | Target: next demo cycle |
| CA-006 | Network truth indicator | Make it clear when the app is node-live, illustrative only, or offline / degraded | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |
| CA-007 | Architecture learning surfaces | Add or expand academy / explainer content for layers, execution vs settlement, and value vs information network | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |
| CA-008 | Governance and transparency surfaces | Strengthen Council / governance pages with code-first limits, transparency framing, and official routing | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |
| CA-009 | StablesAgent non-authoritative framing | Make clear that StablesAgent is useful but non-authoritative on high-impact actions | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |
| CA-010 | Risk and security awareness | Cover self-custody, update hygiene, connectivity limits, and no-seed-sharing guidance in calm app language | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |

---

## x402 readiness board

Source: `1_development/stream_1_app/website/dapp/2-demo/CHARTER_DEMO_TRACEABILITY.md` section 14.

| ID | Task | Key elements | Implementation | Review | Confirm | Status | Released | Version |
|----|------|--------------|----------------|--------|---------|--------|----------|---------|
| X4-001 | x402 intent contract | Add reusable intent schema and lifecycle states (`quoted`, `paid_submitted`, `verifying`, `settled`, `failed`, `expired`) | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |
| X4-002 | x402 adapter and service scaffold | Add provider-agnostic mock adapter, service orchestration, replay/idempotency guards, and local debug ledger | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |
| X4-003 | x402 user-facing status surfaces | Render finality-safe payment states in UI and explain accepted vs pending verification vs settled | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |
| X4-004 | x402 visible demo module | Add one visible demo route/section for machine payments with `402 quote -> payment proof -> settlement check -> access` and invariant-boundary disclaimer | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |
| X4-005 | x402 governance watch and docs | Add `#technology-watch` pointer, update changelog/UI inventory as needed, and keep charter traceability section 14 current | [ ] | [ ] | [ ] | Planned | [ ] | Target: later demo cycle |

---

## Release log

| Version | Released | Scope note |
|---------|----------|------------|
| `v00.00.00.01.00` | No | Current demo working line; tracker introduced after this point |

---

## Immediate focus

These are the current top-priority items for the next execution block:

1. `CD-001` Showcase / Demo selector
2. `CD-002` Channel truth model
3. `CD-003` Protect demo MINIMA wallet baseline
4. `CD-003A` Demo onboarding message
5. `CD-005` Send screen cleanup
6. `CD-006` Main-page FX activity visibility
7. `CD-007` Activity time filtering
8. `CD-009` Coverage Fund summary first
9. `CD-012` On/Off Ramp merchant-first structure
10. `CD-013` Links page in-app
11. `CD-014` Faucet / acquisition copy cleanup

---

**Working principle:** the broad plan explains where we are going; this tracker shows what exists, what is still open, what has been reviewed, and what has actually shipped.
