# Stables MiniDapp - Community Demo Task Tracker

**Status:** Active execution tracker  
**Scope:** `1_development/stream_1_app/website/dapp/`  
**Primary target:** `dapp/2-demo/`  
**Companion plan:** `COMMUNITY_DEMO_DEVELOPMENT_PLAN.md`
**Coherence audit:** `COMMUNITY_DEMO_COHERENCE_AUDIT.md`
**Visual quality reference:** `0_handshake/visual_quality_system.md`

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
| Core release implementation | Shipping | **`v0.0.0.3.42` published** 2026-06-17 (web zip, GitHub Release APK, publish checkout). **`v0.0.0.3.43` built locally** (full in-app updater: remote config fetch, native download, SHA256, installer) — publish planned next session with other dev. `CD-001`–`CD-018` implemented (many still at Ready for review); `CD-019`–`CD-022` released in `v0.0.0.2.17`; **`CD-023` released** in the `0.0.0.3` line (`v0.0.0.3.31` / `v0.0.0.3.42`); **`CD-024` APK line live** with embedded node, Security/recovery, themes, home-screen branding; **`CD-025`–`CD-027`** added today (see board) |
| Channel structure | Ready for review | Three-channel reality: web (`2-demo`), MiniDapp zip, standalone APK. Onion BCP mirrors all three (`CD-027`). Selector and channel truth still need page-level sign-off |
| Wallet truth baseline | Confirmed (Android) | Native MINIMA send/receive verified on standalone APK; `CD-003` live review passed 2026-06-17. MiniDapp hub + web cross-check still open |
| Demo onboarding message | Ready for review | Demo explains zip/package install path, native MINIMA wallet scope, and mint / burn UI test scope |
| Release tracker | In place | Use this file for execution state; `VERSION_HISTORY.md` and `demo_publish_checklist.md` are the publish runbooks |
| Community cadence | Active | Steady demo pushes during small-community test phase; Telegram/X drafts per release; always ship **latest only** online |

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
- Review visual rendering as a release blocker per `0_handshake/visual_quality_system.md`: spacing, typography, hierarchy, and section rhythm must look intentional on the actual screen, not only be functionally correct

---

## Core release board

| ID | Task | Key elements | Implementation | Review | Confirm | Status | Released | Version |
|----|------|--------------|----------------|--------|---------|--------|----------|---------|
| CD-001 | Showcase / Demo selector | Structure the setup between Showcase and Demo; turn the top version indicator / wallet pill into a selector; allow switching between Showcase and Demo for now; keep shared app surface | [x] | [x] | [x] | Confirmed | [ ] | Target: next demo cycle |
| CD-002 | Channel truth model | Showcase = rich synthetic bank state; Demo = real node-linked data where available plus demo-only Winiwa / Wables; keep channel scope visible and truthful | [x] | [x] | [x] | Confirmed | [ ] | Target: next demo cycle |
| CD-003 | Protect demo MINIMA wallet baseline | Preserve native MINIMA send / receive in demo when node or MiniMask is connected; use sendable MINIMA as spendable balance and show locked MINIMA separately when available | [x] | [x] | [x] | Confirmed | [ ] | Target: next demo cycle; live review passed 2026-06-17 |
| CD-003A | Demo onboarding message | Add first-message onboarding note with direct zip download link, short version format, concise write-mode requirement, and truthful current demo / test-phase boundary | [x] | [x] | [x] | Confirmed | [ ] | Target: next demo cycle |
| CD-003B | MiniMask browser wallet path | Add MiniMask as a browser-wallet connection option for native MINIMA balance, receive address, QR, and send without requiring Stables to be installed in MinimaOS; split MEG network reachability from wallet/account readiness | [x] | [ ] | [ ] | Deferred | [ ] | Deferred |
| CD-004 | Short display version format | Use human-readable display labels like `Showcase · v0.0.0.0.3` and package names like `Stables_v0.0.0.0.3.mds.zip`; active demo config now also uses `v0.0.0.1` style labels | [x] | [x] | [x] | Confirmed | [ ] | Target: next demo cycle |
| CD-005 | Send screen cleanup | Remove the big text in Send; tighten clarity without reducing function | [x] | [x] | [x] | Confirmed | [ ] | Target: next demo cycle |
| CD-006 | Main-page FX activity visibility | Make FX exchanges appear in recent activity on the main page too | [x] | [x] | [x] | Confirmed | [ ] | Target: next demo cycle |
| CD-007 | Activity time filtering | Add transaction filtering by date, period, and timeframe | [x] | [x] | [x] | Confirmed | [ ] | Target: next demo cycle |
| CD-008 | Amount selector verification | Review visible amount selector / dropdown / rising menu behavior across flows; make sure opened menus are visible, usable, and not clipped; fix inconsistencies | [x] | [ ] | [ ] | Ready for review | [ ] | Target: next demo cycle |
| CD-009 | Coverage Fund summary first | Show current fund size, accumulated fees, and annualized historical return first | [x] | [ ] | [ ] | Ready for review | [ ] | Target: next demo cycle |
| CD-010 | Coverage Fund naming cleanup | Use selector label `Coverage fund`; keep copy aligned with mechanics | [x] | [ ] | [ ] | Ready for review | [ ] | Target: next demo cycle |
| CD-011 | Coverage Fund truth alignment | Clarify junior / first-loss role, cf-holder yield role, and what is illustrative vs live | [x] | [ ] | [ ] | Ready for review | [ ] | Target: next demo cycle |
| CD-012 | On/Off Ramp merchant-first structure | Split into two sections: first, find a nearby merchant who accepts exchange between Stables and paper money / DIY community exchange; second, present the currently available technical route | [x] | [ ] | [ ] | Ready for review | [ ] | Target: next demo cycle |
| CD-013 | Links page in-app | Add or strengthen in-app Links page for official properties and trust surfaces; include new website links such as the onion resilience page and keep app Links aligned with the public website Links page | [x] | [x] | [ ] | Ready for review | [x] | **v0.0.0.3.42** — mirrors `stablescouncil.org/links.html`; BCP onion address corrected |
| CD-014 | Faucet / acquisition copy cleanup | Replace misleading `Acquire` wording; change copy such as `To acquire MINIMA (Winiwa currently in this test phase), use On/Off Ramp.` so the truthful current action points to Faucet where appropriate; update Faucet page copy such as `Acquire Winiwa to mint Wables tokens` | [x] | [ ] | [ ] | Ready for review | [ ] | Target: next demo cycle |
| CD-015 | Make my bank look mine scaffold | Add personalization module just after App updates; title it **Make my bank look mine**; mirror welcome personalization direction; add coming-soon theme list examples (flowers, cars, gym, etc.); note future free customization interface, community sharing, creator credit, and donation wallet address | [x] | [ ] | [ ] | Ready for review | [ ] | Target: post next demo cycle |
| CD-016 | Presentation quality uplift | Implement more elements of the presentation in the website / web base version: clarity, product storytelling, and ecosystem framing without turning the app into a presentation page | [x] | [ ] | [ ] | Ready for review | [ ] | Target: post next demo cycle |
| CD-017 | Visible roadmap surfaces | Keep future modules visible where useful and clearly labeled as coming soon | [x] | [ ] | [ ] | Ready for review | [ ] | Target: rolling |
| CD-018 | Community release rhythm | Release at a steady cadence with clear changelog, feedback ask, and next-step communication | [x] | [ ] | [ ] | Ready for review | [ ] | Target: rolling |
| CD-019 | Connect to your own Pure Minima node (RPC) | Connect the web app directly to a Minima node the user runs, over RPC, with no MinimaOS install; works against a clean Pure Minima core node or a full node; reads and sends both over RPC; replaces the old MDS-hub browser-connect; contextual StablesAgent help for enabling RPC (`rpc enable:true`) and finding the port via `status` (node port + 4). Validated on laptop and Android phone over LAN | [x] | [x] | [x] | Released | [x] | v0.0.0.2.17 |
| CD-020 | Receive: editable, node-verified address | One editable receiving-address field; the app checks with the node that the address belongs to the wallet before showing the QR; the standalone check-address tool folded in | [x] | [x] | [x] | Released | [x] | v0.0.0.2.17 |
| CD-021 | Native MINIMA display precision | Show native MINIMA up to six decimals with trailing zeros trimmed instead of rounding small amounts to `0.00`; stablecoins stay at two decimals (`fmtBase`) | [x] | [x] | [x] | Released | [x] | v0.0.0.2.17 |
| CD-022 | Connect resilience and simplification | Auto-reconnect to the saved node on page refresh; RPC URL auto-prepends `http://`; Connect panel reduced to one path with the step-by-step detail in the contextual StablesAgent help; MinimaOS-install option removed from the modal (download stays on the homepage) | [x] | [x] | [x] | Released | [x] | v0.0.0.2.17 |
| CD-023 | Transaction hash truth and explorer link | Send confirmation shows the real on-chain `txpowid` (was an internal coin id), labels it pending until confirmed, and links to the Minima explorer; activity rows carry the corrected `explorerTxId` for surfacing there too | [x] | [x] | [x] | Released | [x] | **v0.0.0.3.31** / **v0.0.0.3.42** |
| CD-024 | Standalone Android app with embedded Minima node | One APK: Stables UI (packaged 2-demo) + embedded Minima core node; internal bridge (no RPC port); wallet create / seed backup / recovery; Security page; Network section in Settings; home-screen branding from My profile; sideload via `StablesCouncil/stables-app`. Recovery on-device test still pending; notification icon, FLAG_SECURE, seed password-lock remain APK fast-follows per sprint plan §4 | [x] | [ ] | [ ] | In progress | [x] | **APK v0.0.0.3.42** live on GitHub Releases; web/MiniDapp at **v0.0.0.3.42** |
| CD-025 | In-app APK self-update | Settings and updates checks stablescouncil.org for `ANDROID_APK_UPDATE`, downloads the signed APK natively, verifies SHA256, shows progress, opens the Android installer — no browser sideload as primary path. Requires one manual install of the build that ships `fetchText` | [x] | [ ] | [ ] | Ready for review | [ ] | **Built: v0.0.0.3.43** (publish next session); partial scaffold in **v0.0.0.3.42** |
| CD-026 | Onion BCP three access streams | Every publish refreshes Tor fallback: webapp mirror, MiniDapp zip, Android APK; manifest + SHA256SUMS; `build-onion-site.ps1` + `check-onion-bcp-assurance.ps1` | [x] | [ ] | [ ] | Ready for review | [x] | **v0.0.0.3.42** rebuilt locally 2026-06-17; **VPS Tor deploy** still operator step |
| CD-027 | Appearance themes (six + Paper) | Settings colour themes: Stables dark, Slate, Solar, Rose, Violet, Paper light; block-height pill and side menu follow active theme | [x] | [ ] | [ ] | Ready for review | [x] | **v0.0.0.3.42** |
| CD-028 | Help: StablesAgent + guided tours unified | More → Help: single StablesAgent entry (guided tours, setup help, ask anything) instead of separate rows | [x] | [ ] | [ ] | Ready for review | [x] | **v0.0.0.3.42** |
| CD-029 | Wallet recovery safety gate (Android) | Short safety check before replacing a wallet; Recover disabled until questions answered; StablesAgent escape hatch | [x] | [ ] | [ ] | Ready for review | [x] | **v0.0.0.3.42** |

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
| `v0.0.0.1` | No | Current demo working line; tracker introduced after this point |
| `v0.0.0.2.10` | 2026-06-09 | First v2 demo published; live wallet, per-transaction confirmation counters, per-asset mint/burn, editable Exchange receive |
| `v0.0.0.2.16` | 2026-06-10 | Web sending via node RPC + CORS proxy; newest-first activity; mobile toast fixes; no-em-dash writing rule |
| `v0.0.0.2.17` | 2026-06-12 | Connect to your own Pure Minima node over RPC (no MinimaOS install); editable + node-verified receive; native MINIMA precision; auto-reconnect; simplified Connect panel; contextual agent help. `CD-019`–`CD-022` |
| `v0.0.0.3.31` | 2026-06-16 | `0.0.0.3` line catch-up; transaction-hash truth (`CD-023`); wallet recovery safety; Connect/RPC clarity; Android APK same build line |
| `v0.0.0.3.42` | 2026-06-17 | Themes (`CD-027`), unified Help (`CD-028`), All links (`CD-013`), recovery gate (`CD-029`), in-app update scaffold, Network in Settings, home-screen branding, onion BCP three streams (`CD-026`). APK + web + zip on GitHub Pages. Follow-up Pages **`1088737`**: `links.html` published-version badge + handshake publish-surface sync |
| `v0.0.0.3.43` | Built, not published | Full in-app APK updater (`CD-025`): remote `runtime-config.js` fetch, native download with progress, SHA256 verify, installer. Publish next session with other developments |

---

## Immediate focus

**Council priority (unchanged):** harden the **released wallet to bug-free** across web, MiniDapp, and APK. Defer the Stables function (mint/burn, Coverage Fund, xMinima, x402) to a later cycle. Source: `SPRINT_PLAN_three_channel_2026-06.md` §5.

### Next session (publish block)

**Handover:** `work/tasks/task_recovery_and_handover/session_handover_2026-06-17.md`

1. [ ] **Close 3.42 hygiene** — live-verify `links.html` badge + Download; promote `2_current/`; ledger; brain; 3.42 comms if not sent
2. [ ] **Ship `v0.0.0.3.43`** with other developments — zip, Pages, GitHub Release APK, `ANDROID_APK_UPDATE` sha256, `VERSION_HISTORY`, `data-demo-published-version`, onion rebuild + Tor deploy (`demo_publish_checklist.md`)
3. [ ] **Community comms** — Telegram + X for 3.43 delta (in-app updates now self-contained after one install)
4. [ ] **Tester instruction** — install 3.43 once manually; confirm Settings → **Check for updates** and **Download and install update** on a test device

### Week focus (bug-free closure)

Drive **Ready for review** CD items to **Confirmed** via real three-channel testing (localhost → hub → APK):

| Priority | ID | Why now |
|----------|-----|---------|
| 1 | `CD-008` | Amount selector / dropdown clipping — recurring UX defect class |
| 2 | `CD-005`, `CD-006`, `CD-007` | Send, FX activity, time filters — core wallet surfaces |
| 3 | `CD-014` | Faucet / acquisition copy truth |
| 4 | `CD-009`–`CD-011` | Coverage Fund display — light pass only (no new protocol) |
| 5 | `CD-001`, `CD-002` | Showcase/Demo selector page-level verification |

### APK line (`CD-024` remaining)

| Item | Status |
|------|--------|
| Recovery on-device test (megammrsync rescan) | **Blocking** for calling APK "stable" |
| Notification icon (§4.2 sprint plan) | Planned |
| FLAG_SECURE on seed surfaces (§4.3) | Planned |
| Seed password-lock Option A (§4.4) | Planned |
| `navi_items.json` pass — three-channel copy (sprint §5.3) | Planned |

### Explicitly deferred (do not start)

- **CA-001**–**CA-010** Charter/mechanics depth
- **X4-001**–**X4-005** x402 module
- **CD-003B** MiniMask browser path
- Desktop self-running apps (sprint Phase 4)

**Working principle:** ship the latest build often during community test; close the review backlog with device-verified passes, not more features.

---

**Working principle:** the broad plan explains where we are going; this tracker shows what exists, what is still open, what has been reviewed, and what has actually shipped. Visual quality is part of implementation quality: human users feel spacing, hierarchy, and balance before they understand the code, so random-looking rendering is a defect.
