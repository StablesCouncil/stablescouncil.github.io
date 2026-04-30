# Stables localhost development environment

**Status:** Active  
**Last updated:** 2026-04-24  
**Scope:** `1_development/stream_1_app/`

---

## The two sources — understand this first

There are two canonical sources. Do not confuse them.

| Source | Path | What lives here |
|--------|------|-----------------|
| **Dapp source** | `stream_1_app/dapp/` | MiniDapp code — showcase, demo, test, prod trees. **Edit here.** |
| **Website source** | `task_stablescouncil_github_io/github_pages_root/` | All public website pages (onchain-watch, links, playing field, etc.), assets, CSS, brand. **Edit here.** |

### What NOT to edit

- `github_pages_root/dapp/` — this is a **stale copy** of the dapp, present only because it was previously the authoring location. It is overridden by the canonical `stream_1_app/dapp/` at sync time. Do not edit files here.
- `webpages/pages/` — retired 2026-04-16, stale remnant, ignored by all scripts.
- `static/` — retired 2026-04-16, stale remnant, ignored by all scripts.
- `site/` — generated output only. Never edit directly.

---

## Serve commands

All commands run from:
`C:\Users\Charles\Documents\Stables\1_development\stream_1_app\task_stablescouncil_github_io\`

| Command | Serves | Port | URL | Use when |
|---------|--------|------|-----|----------|
| `npm run serve:dapp` | `stream_1_app/dapp/` | 8081 | `http://localhost:8081/2-demo/` | Fastest loop for dapp work |
| `npm run serve:dev` | `github_pages_root/` | 8080 | `http://localhost:8080/onchain-watch.html` | Quick website page checks (dapp there is stale — not for dapp work) |
| `npm run sync:site` then `npm run serve:site` | `site/` (built) | 8080 | `http://localhost:8080/dapp/2-demo/` | Full-site check with latest dapp overlaid |

### Running both simultaneously

`serve:dapp` (8081) and `serve:dev` or `serve:site` (8080) can run at the same time in separate terminals — different ports, no conflict.

---

## When to use each mode

### Dapp feature work (default)

```powershell
Set-Location "C:\Users\Charles\Documents\Stables\1_development\stream_1_app\task_stablescouncil_github_io"
npm run serve:dapp
```

Open: `http://localhost:8081/2-demo/`

Use for: UI work, copy changes, routing, wallet logic, activity flows — anything inside the MiniDapp.

### Website page work (onchain-watch, links, etc.)

```powershell
Set-Location "C:\Users\Charles\Documents\Stables\1_development\stream_1_app\task_stablescouncil_github_io"
npm run serve:dev
```

Open: `http://localhost:8080/onchain-watch.html` (or any other page)

Use for: changes to website pages, assets, CSS — not for dapp work.

### Full-site check (dapp inside website shell)

```powershell
Set-Location "C:\Users\Charles\Documents\Stables\1_development\stream_1_app\task_stablescouncil_github_io"
npm run sync:site
npm run serve:site
```

Open: `http://localhost:8080/dapp/2-demo/`

Use for: verifying the dapp behaves correctly inside the public website shell before shipping.

What `sync:site` does:
1. Copies everything from `github_pages_root/` into `site/` (skipping dev-only files)
2. Overlays `stream_1_app/dapp/` into `site/dapp/` (canonical dapp replaces stale github_pages_root copy)

### Local feedback API (optional, alongside any mode above)

```powershell
Set-Location "C:\Users\Charles\Documents\Stables\1_development\stream_2_community\task_x_public_feedback_ledger"
node tools/feedback_submit_server.mjs
```

API: `http://127.0.0.1:8788/api/feedback`

### Node-connected localhost

1. Open the demo on localhost
2. Use **Connect node** (default: host `127.0.0.1`, port `9003`)
3. Or paste a `uid=` value from a real MiniDapp hub session

---

## Summary table

| Environment | Command | Best use | Limitation |
|-------------|---------|----------|------------|
| Dapp direct | `serve:dapp` -> :8081 | Fastest dapp iteration | No website shell |
| Website pages | `serve:dev` -> :8080 | Website page work | Dapp copy is stale |
| Full site | `sync:site` + `serve:site` -> :8080 | Pre-ship site check | Slower (sync step) |
| Feedback server | `node feedback_submit_server.mjs` | End-to-end feedback | Separate terminal |
| Node connect | Connect node modal | Real MINIMA wallet | Still not the real MiniDapp hub |
| Real MiniDapp hub | Install .mds.zip | Final verification | Slowest iteration loop |

---

## Practical rule

- **Build on localhost** (serve:dapp for speed)
- **Connect to node** when testing real MINIMA flows
- **Run sync:site + serve:site** before shipping to catch site-shell issues
- **Verify in the real MiniDapp hub** for the final pass before release
