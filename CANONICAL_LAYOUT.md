# Canonical Website Layout

These top-level names are stable because they map directly to public URLs and the GitHub Pages repository root.

| Path | Purpose |
|------|---------|
| `index.html` | Home `/` |
| `links.html` | `/links.html` |
| `playing_field.html` | `/playing_field.html` |
| `ambassadorsprogramdesc.html` | `/ambassadorsprogramdesc.html` |
| `bankingsystem.html` | `/bankingsystem.html` |
| `circulareconomy.html` | `/circulareconomy.html` |
| `brand_assets.html` | `/brand_assets.html` |
| `communication_plan.html` | `/communication_plan.html` |
| `council_dashboard.html` | `/council_dashboard.html` |
| `council_navigation_system.html` | `/council_navigation_system.html` |
| `onchain-watch.html` | `/onchain-watch.html` public data tool |
| `test-dashboard.html` | `/test-dashboard.html` development-only Test Channel Monitor |
| `onion-resilience/` | Development-only resilience package |
| `dapp/` | Pages-hosted MiniDapp area |
| `assets/` | Shared JS/CSS for document pages |
| `brand/` | Logos and brand assets |
| `stables.css` | Council shell CSS |
| `CNAME`, `favicon.png`, `stables_agent_avatar.png` | Site root files |

The active source tree is `1_development/stream_1_app/website/`. Publish checkouts are release
targets, not authoring sources. `2_current/stream_1_app/website/` is a deprecated historical mirror.

## Page-copy rule

Public website document pages and parallel website candidates must not use the em dash character.
Use a full stop, comma, colon, or an explicit compact data state such as `N/A`. Source and rendered
copy verification reject the character before handoff.

There is no approved `qr-code.html` page or `devtools/` website directory. QR assets remain within
their owning brand and resilience surfaces. `/api/devtools/*` names service endpoints and does not
imply a corresponding static website directory.
