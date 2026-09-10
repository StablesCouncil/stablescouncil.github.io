# Stables public website: engineering and operations

**Audience:** StablesAgent, operators, and contributors who need **how the site is built, previewed, and shipped**, not marketing copy.

**Companion docs:** User-facing messaging stays in **`website_presentation.md`**. Protocol and economics stay in **`protocol_mechanics_spec.md`**, **`stables_master_reference.md`**, and **`comprehensive_knowledge_base.md`**. The authoritative website map is **`1_development/stream_1_app/website/CANONICAL_LAYOUT.md`**. Repository release law remains in the handshake and the active website implementation plan.

---

## 1. Live site and repos

- **Public site (custom domain):** `https://stablescouncil.org/`
- **GitHub Pages origin:** `https://stablescouncil.github.io/` (same deployment; custom domain is **`stablescouncil.org`** via **`CNAME`** in the Pages repo root).
- **Pages repository:** `StablesCouncil/stablescouncil.github.io` on **`main`**. Only the **root** of that repo is what GitHub Pages serves.
- **Only authoring source:** **`1_development/stream_1_app/website/`**. Publish checkouts, archives, generated outputs, and the retired task tree are not authoring sources.

---

## 2. Canonical authoring layout (monorepo)

The complete public website and Pages-hosted MiniDapp are authored directly in:

**`1_development/stream_1_app/website/`**

| Layer | Path | Role |
|-------|------|------|
| **Public pages** | **`website/*.html`** | Root routes such as home, Resources, Playing Field, Banking System, Circular Economy, Council pages, and public tools. |
| **MiniDapp** | **`website/dapp/`** | Showcase, frozen demo, active test, future prod, shared assets, and package surfaces. |
| **Shared website assets** | **`website/assets/`**, **`website/brand/`**, **`website/stables.css`** | Shared chrome, behavior, local Inter, and approved brand exports. |
| **Root deployment files** | **`website/CNAME`**, **`website/favicon.png`**, **`website/stables_agent_avatar.png`** | Files copied to the GitHub Pages repository root. |
| **Support and publish tooling** | **`1_development/stream_1_app/work/`** | Verifiers, evidence, tasks, dependencies, and the publish checkout. Not website source. |

The optional `website/src/`, `website/tools/`, package files, and development-only routes are support material inside the source tree. They do not create a second ship tree. Normal local review serves `website/` directly and requires no build step.

---

## 3. Route map

| Source | Public URL |
|--------|------------|
| **`website/index.html`** | **`/`** (the merchant-first homepage since 2026-09-03; the previous homepage is archived under `3_archive/stream_1_app/task_old_homepage_retired_2026-09-03/`) |
| **`website/payment-app/index.html`** | **`/payment-app/`** (application access: Download for the standalone Android app; the other offers are coming soon or planned) |
| **`website/new/index.html`**, **`website/new/payment-app/index.html`** | **`/new/`**, **`/new/payment-app/`**: redirect stubs to `/` and `/payment-app/` (the candidate preview routes, kept only so old links land) |
| **`website/links.html`** | **`/links.html`** |
| **`website/playing_field.html`** | **`/playing_field.html`** |
| **`website/ambassadorsprogramdesc.html`** | **`/ambassadorsprogramdesc.html`** |
| **`website/bankingsystem.html`** | **`/bankingsystem.html`** |
| **`website/circulareconomy.html`** | **`/circulareconomy.html`** |
| **`website/brand_assets.html`** | **`/brand_assets.html`** |
| **`website/communication_plan.html`** | **`/communication_plan.html`** |
| **`website/council_dashboard.html`** | **`/council_dashboard.html`** |
| **`website/council_navigation_system.html`** | **`/council_navigation_system.html`** |
| **`website/onchain-watch.html`** | **`/onchain-watch.html`** |
| **`website/dapp/`** | **`/dapp/`** and its channel routes |

The exact inventory is maintained in `website/CANONICAL_LAYOUT.md`. Single public pages use root `.html` files. Multi-page areas use folders. Old Banking System and Circular Economy folder routes remain redirect stubs. There is no approved `qr-code.html` route or `devtools/` static website directory.

---

## 4. Local preview

Serve the active website tree directly from the repository root:

```powershell
node 1_development/stream_1_app/work/tools/website/serve-local.mjs ../../website 8080
```

Open `http://localhost:8080/`. No build or sync step is required for ordinary preview. Before trusting localhost, compare the active tree with the publish checkout and the live URL and classify every runtime-file difference.

---

## 5. Ship workflow (GitHub Pages)

1. Complete the active website implementation plan, preservation records, responsive and accessibility gates, source checks, and founder review.
2. Receive explicit founder approval for publication. Local approval and publication approval are separate decisions.
3. Build an isolated publication candidate from the validated contents of `website/`. Exclude development-only routes and tooling according to the active release plan.
4. Prove the isolated candidate against the active source and preserve `CNAME`, redirects, downloads, and required operational data.
5. Copy the approved candidate contents into the root of the publish checkout under `1_development/stream_1_app/work/publish_checkout/`.
6. Commit and push the Pages repository `main` branch with Council identity and credentials.
7. Verify the custom domain and Pages origin live, including direct routes, downloads, redirects, and rollback evidence.

The publish checkout is a deployment target only. Never author there and never overwrite unrelated dirty application work.

---

## 6. Shared website contract

Public pages load `website/stables.css` and shared files under `website/assets/`. D028 is the approved appearance authority, with controlled page adoption through the active website plan. Use locally bundled Inter and the shared button, header, footer, focus, reflow, reduced-motion, and accessibility contracts. Public website page source and rendered copy must contain no em dash character.

---

## 7. Preservation and review policy

Website migrations preserve route purpose, links, downloads, data dependencies, accessibility, responsive behavior, and truthful release status. A visual migration does not authorize content removal or publication. Changes to public narrative, application access, or release claims require their source matrix, automated evidence, and founder review.

---

## 8. StablesAgent on the site

The public site exposes StablesAgent through its shared site controls. Knowledge comes from the single authoritative brain, its generated `llms.txt`, and the deployed vector store. See `website_presentation.md` for public access points.

When operators update this document or other brain Markdown, they edit `1_development/stream_3_governance/task_stablesagent-brain-base/`, run `node build_llms_txt.js` there, and run the source and release-scope verifiers. Public GitHub and VPS brain copies are deployment targets only. Deployment and ingestion require founder approval.

---

## 9. Quick operator checklist

1. Edit only `1_development/stream_1_app/website/`.
2. Run the publish-baseline comparison and applicable website gates.
3. Review the active tree through the canonical local server.
4. Obtain explicit founder approval before creating or mutating a publication candidate.
5. Publish the approved isolated candidate through the Pages checkout and verify both live domains.
6. If public facts changed, update the authoritative brain, rebuild `llms.txt`, verify it, and deploy it only after approval.

---

## 10. Related files in the Stables repo (for humans and agents)

- **`1_development/stream_1_app/website/CANONICAL_LAYOUT.md`**: route and source map.
- **`1_development/stream_1_app/README.md`**: active source and support boundary.
- **`0_handshake/handshake.md`**, **`0_handshake/web_component_spec.md`**, **`0_handshake/session_map.md`**: governance, UI contracts, and task routing.
- **Active website implementation and release plans under `1_development/stream_1_app/work/`**: current wave, evidence, and founder gates.
