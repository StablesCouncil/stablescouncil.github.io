# Stables Button System Audit

**Status:** Active alignment ledger  
**Scope:** MiniDapp demo/showcase and public website  
**Authority:** `0_handshake/visual_quality_system.md`, `0_handshake/web_component_spec.md`, `0_handshake/handshake.md`

---

## Button Role Standard

Every button must be assigned one role before color is chosen.

| Role | Class | Use |
|------|-------|-----|
| Primary | `btn-primary` | One recommended next action in a visual group |
| Equal choice | `btn-choice` | Neutral peer options where the product must not influence the decision |
| Secondary utility | `btn-secondary` | Supporting actions such as back, edit, copy, view, open details |
| Destructive / risk | `btn-danger` | Reset, delete, clear, revoke, irreversible or risk-sensitive actions |
| Disabled / soon | `btn-disabled` + `disabled` or `aria-disabled="true"` | Unavailable actions |
| Link action | `btn-link-action` | Opens a page, document, or external/internal reference |

Rules:

- One `btn-primary` maximum per obvious visual group.
- Equal choices must all use `btn-choice`.
- No inline button colors for role decisions.
- If a new role is required, update the handshake references before implementation.

---

## Implementation Sources

| Surface | Executable source | Current state |
|---------|-------------------|---------------|
| Demo MiniDapp | `1_development/stream_1_app/website/dapp/2-demo/index.html` | Role classes added |
| Showcase MiniDapp | `1_development/stream_1_app/website/dapp/1-showcase/index.html` | Pending port / audit |
| Website | `1_development/stream_1_app/website/stables.css` | Role classes added |
| Website page CSS | `1_development/stream_1_app/website/assets/*.css` | Pending audit for local overrides |

---

## Alignment Passes

### Pass 1 - Demo Critical Flows

| Area | Expected roles | Status | Notes |
|------|----------------|--------|-------|
| Welcome flow | `btn-primary` for single next actions, `btn-choice` for neutral choices, `btn-secondary` for utility | Aligned - code pass | Main welcome next actions use `btn-primary`; guided persona / use-case / personalisation equal choices use `btn-choice`; skip/support actions use `btn-secondary` |
| Send / Receive | `btn-primary` for confirm/send, `btn-secondary` for utility, `btn-disabled` for unavailable currencies/actions | Aligned - code pass | Confirm Send and merchant invoice entry use `btn-primary`; MAX, QR, large QR, new address, privacy, close use `btn-secondary`; unavailable currency rows remain custom disabled dropdown rows |
| Connect / MiniMask | `btn-primary` for connect/approve step, `btn-secondary` for support, `btn-link-action` for install/docs links | Aligned - code pass | MiniMask connect and install-steps action use `btn-primary`; close uses `btn-secondary`; download remains a text link inside the ordered install step |
| Settings | `btn-secondary` for normal utilities, `btn-danger` for resets/clear actions, `btn-link-action` for downloads/docs | Partial - code pass | App package download, Security app, Charter, and Security route use `btn-link-action`; profile save uses `btn-primary`; profile mode choices use `btn-choice`; reset/clear actions use `btn-danger`; secondary settings pages still need full Pass 2 review |
| Mint / Faucet | `btn-primary` for active mint/claim, `btn-disabled` for unavailable future flows, `btn-danger` for reset balances | Aligned - code pass | Active mint/claim actions use `btn-primary`; burn/MAX utilities use `btn-secondary`; faucet reset uses `btn-danger` |

### Pass 2 - Demo Secondary Flows

| Area | Expected roles | Status | Notes |
|------|----------------|--------|-------|
| More drawer | `btn-secondary` / `btn-link-action` | Aligned - code pass | Navigation items are `<div class="ditem">` elements, not buttons  -  no role class changes needed; drawer is correct by design |
| Merchants & Exchange | Primary only where a transaction/action is being executed | Aligned - code pass | Exchange Now and Deposit LP are `btn-primary`; MAX/utility/nav use `btn-secondary`; Provide liquidity uses `btn-secondary`; Ambassador link uses `btn-link-action`; Merchant Invoice: Record settled sale and Recognize this customer are `btn-primary`, Customer display toggle and Run checks use `btn-secondary` |
| My transactions | `btn-secondary` for filters/tools, `btn-link-action` for explorer/reference opens | Aligned - code pass | Contacts nav uses `btn-secondary`; Sync node transactions uses `btn-secondary` |
| Governance / Council | Vote/submit actions reviewed case-by-case; external references use `btn-link-action` | Aligned - code pass | Charter link uses `btn-link-action`; Vote here scroll uses `btn-secondary`; Vote budget (disabled) uses `btn-disabled`; Vote For/Against active proposals use `btn-choice vfor`/`btn-choice vag` |
| Coverage fund / LP | Primary for active execute action only; danger for withdrawal/reset only if risk-sensitive | Aligned - code pass | CF Deposit uses `btn-primary`, Withdraw uses `btn-secondary`, MAX uses `btn-secondary`; LP Deposit to Liquidity funds uses `btn-primary`, MAX buttons use `btn-secondary` |

### Pass 3 - Cross-Surface Port

| Surface | Status | Notes |
|---------|--------|-------|
| Showcase MiniDapp | Pending | Port only patterns that are truth-safe for showcase |
| Public website pages | Pending | Replace local button role drift with shared `stables.css` classes |
| Review materials / screenshots | Pending | Use same role logic in designed layouts |

---

## Audit Method

For each pass:

1. List every visible button in the target surface.
2. Assign one role from the standard.
3. Replace local class drift with the role class.
4. Remove inline color decisions where they encode hierarchy.
5. Check desktop and mobile/narrow rendering.
6. Update this ledger and the relevant changelog.
