# Stables MiniDapp - Demo / Navi / Dashboard Coherence Audit

**Status:** Active integration audit  
**Date:** 2026-05-14  
**Scope:** `1_development/stream_1_app/website/dapp/` and public draft Navi / Dashboard files  
**Primary demo target:** `1_development/stream_1_app/website/dapp/2-demo/`

---

## Purpose

This file keeps the Community Demo work coherent with the public Navigation System and Dashboard.

The rule is simple:

1. `COMMUNITY_DEMO_TASK_TRACKER.md` says what the demo team is doing.
2. `navi_items.json` says where that work appears in the public roadmap.
3. `dashboard_metrics.json` / `dashboard_state.json` say which signals are measurable.
4. The app route proves the work exists or needs review.

When these four layers disagree, fix the source layer first, then regenerate public data.

---

## Source Files

| Layer | File | Role |
|------|------|------|
| Demo execution | `dapp/COMMUNITY_DEMO_TASK_TRACKER.md` | Task status, review state, release state |
| Demo plan | `dapp/COMMUNITY_DEMO_DEVELOPMENT_PLAN.md` | Product direction and current milestone |
| Demo code | `dapp/2-demo/index.html` plus `dapp/2-demo/assets/` | Actual working app surface |
| Demo changelog | `dapp/2-demo/CHANGELOG.md` | User-visible changes |
| UI inventory | `1_development/stream_1_app/work/docs/ui_inventory/app_ui_inventory.md` | Page and control map |
| Navi generated data | `navi_items.json` | Public Navigation System cards |
| Navi generator | `tools/build-full-navi-inventory.mjs` | Source for generated Navi cards |
| Dashboard generated data | `dashboard_metrics.json`, `dashboard_state.json` | Public Dashboard metrics and state |
| Dashboard generator | `tools/generate-dashboard-state.mjs` | Source for computed tracker signals |

---

## Immediate Crosswalk

| Tracker | Task | Navi card(s) | Dashboard signal(s) | App route / source | Current state | Coherence gap |
|---|---|---|---|---|---|---|
| `CD-001` | Showcase / Demo selector | `technical-network-mds-runtime-truth`, `technical-next-demo-cycle` | `channel_selector_implemented`, `channel_selector_confirmed` | `dapp/2-demo/#wallet` | Confirmed in tracker | Dashboard generator computes the signal, but generated Dashboard metrics do not currently expose these operational-signal IDs. |
| `CD-002` | Channel truth model | `technical-network-mds-runtime-truth`, `technical-next-demo-cycle`, `financial-demo-token-ui-scope` | `channel_truth_model_defined`, `demo_token_truth_copy_ready`, `demo_status` | `dapp/2-demo/`, `dapp/MINIDAPP_VERSIONING.md`, `dapp/PORTING_GAP.md` | Ready for review | Top channel selector now carries a compact truth note. Review still needs page-level verification tying channel, node state, synthetic/demo token scope, and porting evidence together. |
| `CD-003` | Protect demo MINIMA wallet baseline | `technical-demo-minima-wallet-baseline`, `technical-wallet-send-receive-qr-surface` | `demo_minima_wallet_baseline_verified` | `dapp/2-demo/#wallet`, send / receive modals | Ready for review | Code baseline is present: demo real-onchain wallet mode is enabled, receive uses node `getaddress` for `MINIMA`, and send uses MDS `send ... tokenid:0x00` after Node live. Review still needs localhost + real MiniDapp hub verification before confirmation. |
| `CD-003A` | Demo onboarding message | `technical-demo-minima-wallet-baseline`, `technical-next-demo-cycle` | `demo_onboarding_message_ready` | Welcome / first-message flow in `dapp/2-demo/index.html` and `assets/routes/activity-contacts.js` | Ready for review | First welcome notice now states demo zip/package install path, native MINIMA send/receive scope when Node live, mint/burn UI test scope, and demo-only Winiwa / Wables limits. Review still needs visual copy pass in the modal. |
| `CD-004` | Short display version format | `technical-network-mds-runtime-truth` | Not currently exposed | Top channel/version pill, Settings version hint, Council communications version banner | Ready for review | Visible version labels use short display format while config, update comparison, and zip filename logic keep canonical internal versioning. No dedicated Dashboard signal exists. |
| `CD-005` | Send screen cleanup | `technical-demo-minima-wallet-baseline`, `technical-wallet-send-receive-qr-surface` | `send_cleanup_review_state` | Send modal | Ready for review | Static review 2026-05-14: old large Send block is absent and recipient/amount/currency/confirm controls remain. Still needs visual/function review before confirmation. |
| `CD-006` | Main-page FX activity visibility | `technical-demo-minima-wallet-baseline`, `technical-demo-activity-history-surface` | `fx_activity_visibility_review_state` | `dapp/2-demo/#wallet`, `dapp/2-demo/#activity` | Ready for review | Static review 2026-05-14: exchange completion appends an Activity row in real-onchain demo mode, and activity rows sort by parsed transaction time. Still needs an exchange action test and wallet recent-activity check. |
| `CD-007` | Activity time filtering | `technical-demo-activity-history-surface`, `technical-demo-minima-wallet-baseline` | `activity_filters_review_state` | `dapp/2-demo/#activity` | Ready for review | Static review 2026-05-14: timeframe, relative period, and date-range controls plus filter functions are present. Still needs interactive date/period/timeframe test cases. |
| `CD-008` | Amount selector verification | `technical-demo-minima-wallet-baseline`, `technical-wallet-send-receive-qr-surface` | `amount_selector_review_state` | Send, receive, exchange, invoice, mint, coverage fund, LP forms | Ready for review | Shared currency dropdown panels now move to a fixed layer on open, size to the viewport, and open upward when bottom space is tight. Still needs route-by-route visual review across Send, Receive, Exchange, Invoice, Mint, Coverage fund, and LP forms. |
| `CD-009` | Coverage Fund summary first | `technical-invest-coverage-fund-ui`, `technical-coverage-fund-performance-surface`, `financial-coverage-fund-cf-tokens` | `coverage_fund_summary_order_ready` | `dapp/2-demo/#invest` | Ready for review | Coverage fund tab now starts with current fund size, accumulated fees, and annualized historical return before 30-day and historical charts. Needs visual review for mobile density. |
| `CD-010` | Coverage Fund naming cleanup | `technical-invest-coverage-fund-ui`, `technical-coverage-fund-performance-surface` | `coverage_fund_label_aligned` | `dapp/2-demo/#invest` | Ready for review | Selector and visible app labels now use `Coverage fund`; chart legend/tooltip wording uses `Fund assets` instead of inconsistent fund naming. Needs visual copy pass before confirmation. |
| `CD-011` | Coverage Fund truth alignment | `technical-invest-coverage-fund-ui`, `financial-coverage-fund-cf-tokens`, `financial-protocol-truth-guard` | `coverage_fund_truth_copy_aligned` | `dapp/2-demo/#invest`, `protocol_mechanics_spec.md` | Ready for review | Coverage fund tab now includes a mechanics note aligned with `0_handshake/protocol_mechanics_spec.md`: junior / first-loss buffer, cf-token fee value for composition risk, no xMinima transaction-fee revenue, and illustrative demo accounting. Needs protocol-copy review before confirmation. |
| `CD-012` | On/Off Ramp merchant-first structure | `technical-onoff-ramp-surface`, `technical-merchant-ramp-shops-ux`, `financial-merchant-first-ramp-ux` | `merchant_ramp_structure_ready` | `dapp/2-demo/#onoff-ramp`, `#exchange`, `#spend` | Ready for review | On/Off Ramp now leads with merchant / DIY cash exchange and presents the existing MINIMA / venue route as the second technical route. Needs visual and product-copy review before confirmation. |
| `CD-013` | Links page in-app | `technical-official-links-surface`, `community-public-presence-reach`, `community-social-profiles-live-registry` | `social_profiles_ready`, `community_telegram_ready`, `council_official_ready`, `navi_metric_link_coverage` | `dapp/2-demo/#help-links`, `links.html` | Ready for review | In-app All links now includes official links page, onion resilience page, onion mirror address, and communication plan alongside public domains/socials. Needs final trust-label review against `links.html`. |
| `CD-014` | Faucet / acquisition copy cleanup | `financial-demo-token-ui-scope`, `technical-demo-faucet-surface` if added, `technical-onoff-ramp-surface` | Not currently dedicated | `dapp/2-demo/#faucet`, `#onoff-ramp`, mint copy | Ready for review | Mint copy now points demo Winiwa testing to Get Winiwa / Faucet, Faucet header uses credit wording, and older route copy no longer says test MINIMA. No explicit Dashboard signal yet. |
| `CD-015` | Make my bank look mine scaffold | `technical-settings-updates-surface`, `technical-profile-identity-surface` | Not currently dedicated | `dapp/2-demo/#settings-updates`, `#settings-profile` | Ready for review | Settings and updates now has a coming-soon **Make my bank look mine** scaffold directly after App updates, with theme examples, future free customization/community-sharing scope, creator credit, and a demo donation wallet placeholder. |
| `CD-016` | Presentation quality uplift | `community-demo-release-rhythm`, `community-global-growth`, possibly website presentation cards | Not currently dedicated | Website home, App-wide copy and presentation-level surfaces | Ready for review | Website home now includes an operating-loop narrative section that connects self-custody, merchant payments, local circulation, and visible risk surfaces without turning the Dapp into a presentation page. |
| `CD-017` | Visible roadmap surfaces | `technical-next-demo-cycle`, `community-demo-release-rhythm`, `community-first-review-quest` | `demo_status`, `feedback_items_routed_to_tracker` | In-app roadmap / release notes / feedback | Ready for review | Feedback now starts with a Demo roadmap block showing what to review now, coming-soon feedback types, and next modules. This gives reviewers a visible package before broad community feedback. |
| `CD-018` | Community release rhythm | `community-demo-release-rhythm`, `technical-next-demo-cycle`, `community-public-feedback-intake` | `demo_release_notes_ready`, `feedback_items_routed_to_tracker`, `github_feedback_open` | `dapp/2-demo/CHANGELOG.md`, `dapp/2-demo/DEMO_RELEASE_REVIEW_PACKAGE.md` | Ready for review | Added a Demo release review package with build link, changelog summary, review focus, known limits, feedback ask, and next step; Council communications now includes a 2026-05-14 review notice. |

---

## Charter / Mechanics Crosswalk

| Tracker | Task | Navi card(s) | Dashboard signal(s) | App route / source | Current state | Coherence gap |
|---|---|---|---|---|---|---|
| `CA-001` | Protocol truth surface | `financial-protocol-truth-guard`, `financial-balance-sheet-visibility`, `technical-treasury-protocol-state-surface` | Not currently dedicated | `#treasury`, `#invest`, `protocol_mechanics_spec.md` | Later demo cycle | Needs balance-sheet explanation that does not imply live protocol accounting. |
| `CA-002` | CR regime visibility | `financial-backing-ratio-visibility`, `technical-treasury-protocol-state-surface` | Not currently dedicated | `#treasury`, stress surfaces | Later demo cycle | Needs normal / guarded / critical language tied to visible information, not a hard lock. |
| `CA-003` | Fee distinction clarity | `financial-fee-economics`, `financial-protocol-truth-guard` | Not currently dedicated | Payment-copy surfaces | Later demo cycle | Must keep mint/burn no-fee and payment fee formula separate. |
| `CA-004` | xMinima truth alignment | `financial-xminima-equity-router`, `financial-demo-token-ui-scope` | Not currently dedicated | `#mint`, `#invest`, `#treasury` | Later demo cycle | Must preserve xMinima as equity with zero transaction-fee revenue. |
| `CA-005` | Merchant-first onboarding story | `financial-merchant-first-ramp-ux`, `technical-onoff-ramp-surface`, `community-merchant-preparation` | `merchant_ramp_structure_ready` | `#onoff-ramp`, `#spend`, `#my-shop` | Next demo cycle | Overlaps with `CD-012`; treat as the mechanics/narrative source for that implementation. |
| `CA-006` | Network truth indicator | `technical-network-mds-runtime-truth`, `technical-demo-minima-wallet-baseline` | `channel_truth_model_defined`, `demo_status` | Top pill, node status, wallet state | Later demo cycle | Needs review language for node-live, illustrative only, offline/degraded. |
| `CA-007` | Architecture learning surfaces | `community-help-academy-guided-tours`, `technical-academy-guided-help-surface` | Not currently dedicated | `#help-academy`, guided tours | Later demo cycle | Keep as education backlog until demo review package is coherent. |
| `CA-008` | Governance and transparency surfaces | `community-council-creation-charter`, `technical-council-communications-surface`, `technical-legal-notices-surface` | Council / feedback metrics only | `#council`, `#council-comms`, `#settings-legal` | Later demo cycle | Needs public-safe Charter and Council route consistency. |
| `CA-009` | StablesAgent non-authoritative framing | `community-stablesagent-knowledge-loop`, `technical-council-communications-surface` | `agent_answer_gaps`, `agent_feedback_items` | StablesAgent drawer / help surfaces | Later demo cycle | Needs copy boundary for high-impact actions. |
| `CA-010` | Risk and security awareness | `technical-security-vault-key-surface`, `technical-dev-security-hygiene`, `technical-legal-notices-surface` | Not currently dedicated | `#settings-security`, legal/security modals | Later demo cycle | Needs calm no-seed-sharing and update hygiene language as part of safety review. |

---

## x402 Crosswalk

The x402 board is intentionally later-cycle work. Do not let it block the next Demo coherence pass.

| Tracker | Task | Navi card(s) | Dashboard signal(s) | App route / source | Current state | Coherence gap |
|---|---|---|---|---|---|---|
| `X4-001` | x402 intent contract | No dedicated Navi card yet | None | `assets/x402/payment-intent.js` planned | Later demo cycle | Needs a dedicated card only when implementation starts. |
| `X4-002` | x402 adapter and service scaffold | No dedicated Navi card yet | None | `assets/x402/adapter.js`, `service.js` planned | Later demo cycle | Keep provider-agnostic and mock-only until standard/facilitator choice exists. |
| `X4-003` | x402 user-facing status surfaces | No dedicated Navi card yet | None | Status component planned | Later demo cycle | Must preserve finality-safe language: accepted is not globally settled. |
| `X4-004` | x402 visible demo module | No dedicated Navi card yet | None | `assets/routes/protocol.js` planned | Later demo cycle | Needs route owner before public visibility. |
| `X4-005` | x402 governance watch and docs | `community-communication-platform-strategy` or future technology-watch card | None | Legal/notices pointer planned | Later demo cycle | Add only when x402 work becomes active. |

---

## Generator Coherence Findings

### 1. Dashboard computes demo operational signals, but the public metrics file does not expose them

**Resolved 2026-05-14:** `dashboard_metrics.json` now includes demo readiness Operational Signal definitions, and `tools/generate-dashboard-state.mjs` preserves both KPI metrics and Operational Signals during generation.

`tools/generate-dashboard-state.mjs` computes these values from `COMMUNITY_DEMO_TASK_TRACKER.md`:

- `channel_selector_implemented`
- `channel_selector_confirmed`
- `channel_truth_model_defined`
- `demo_minima_wallet_baseline_verified`
- `demo_onboarding_message_ready`
- `demo_release_notes_ready`
- `send_cleanup_review_state`
- `fx_activity_visibility_review_state`
- `activity_filters_review_state`
- `amount_selector_review_state`
- `coverage_fund_summary_order_ready`
- `coverage_fund_label_aligned`
- `coverage_fund_truth_copy_aligned`
- `demo_token_truth_copy_ready`
- `merchant_ramp_structure_ready`
- `demo_status`

Previously, `dashboard_metrics.json` exposed mostly community-facing KPIs. The framework says controlled work should be **Operational Signal**, so these operational-signal IDs now have metric objects.

**Fix applied:** added an Operational Signal section to `dashboard_metrics.json` for the demo readiness signals, and updated `generate-dashboard-state.mjs` so these IDs survive generation.

### 2. Navi generator references operational signals, but generated cards lose them

**Resolved 2026-05-14:** `tools/build-full-navi-inventory.mjs` now separates Dashboard KPI IDs from Operational Signal IDs and filters Navi card metrics against the combined Dashboard metric ID set.

`tools/build-full-navi-inventory.mjs` assigns demo operational metrics to cards, for example:

- `technical-demo-minima-wallet-baseline`
- `technical-demo-activity-history-surface`
- `technical-invest-coverage-fund-ui`
- `technical-network-mds-runtime-truth`
- `technical-next-demo-cycle`
- `technical-onoff-ramp-surface`

Previously, the generated `navi_items.json` had many of those card `metrics` arrays empty because `build-full-navi-inventory.mjs` filtered card metrics against KPI-only Dashboard IDs, which excluded the operational-signal IDs.

**Fix applied:** split the filter set into:

- `dashboardKpiMetrics`
- `dashboardOperationalSignals`
- `dashboardMetricIds = KPI + Operational`

Then filter Navi card metrics against all Dashboard IDs, while Dashboard presentation can still separate KPIs from Operational Signals.

### 3. Tracker and Navi card ownership are mostly aligned

The next demo cycle already maps cleanly:

- Wallet / Send / Activity: `technical-demo-minima-wallet-baseline`, `technical-demo-activity-history-surface`, `technical-wallet-send-receive-qr-surface`
- Coverage Fund: `technical-invest-coverage-fund-ui`, `technical-coverage-fund-performance-surface`, `financial-coverage-fund-cf-tokens`
- Ramp / merchant-first flow: `technical-onoff-ramp-surface`, `technical-merchant-ramp-shops-ux`, `financial-merchant-first-ramp-ux`
- Links: `technical-official-links-surface`, `community-public-presence-reach`
- Release rhythm: `technical-next-demo-cycle`, `community-demo-release-rhythm`, `community-public-feedback-intake`

The main problem is not missing conceptual mapping. The problem is that the generated Dashboard/Navi data does not yet expose the operational linkages that the scripts already know how to compute.

---

## Coherent Next Execution Order

Use this order before new feature work:

1. **Fix operational-signal plumbing**  
   Add demo readiness Operational Signal metric definitions and make both generators preserve them.

2. **Regenerate Navi and Dashboard**  
   Run the Navi builder and Dashboard generator, then verify that cards contain the tracker-derived metric IDs.

3. **Review implemented-but-unconfirmed demo work**  
   Verify `CD-005`, `CD-006`, and `CD-007` in the app. Only then check Review / Confirm in the tracker.

4. **Implement the remaining next-cycle coherence items**  
   `CD-002`, `CD-003`, `CD-003A`, `CD-009`, `CD-012`, `CD-013`, `CD-014`.

5. **Prepare the Demo review package**  
   Use `technical-next-demo-cycle` as the public-facing bundle: build link, changelog summary, known limitations, feedback ask, blocker list.

---

## Definition Of Coherent

The next Demo cycle is coherent when:

- Every top-priority `CD-*` item has one Navi card owner.
- Every active Navi owner has at least one Dashboard KPI or Operational Signal where appropriate.
- Controlled internal work is labelled **Operational Signal**, not KPI.
- Community/user outcomes remain Dashboard KPIs.
- The app route, tracker row, changelog line, Navi card, and Dashboard signal all tell the same story.
- `CD-005`, `CD-006`, and `CD-007` are reviewed in the app before being treated as done.
