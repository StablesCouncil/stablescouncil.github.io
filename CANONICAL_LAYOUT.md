# Canonical layout (dev = ship = promote = archive interior)

These **top-level names** are stable contracts. Do not rename casually (URLs and operators depend on them).

| Path (repo root / `site/` / `github_pages_root/`) | Purpose |
|---------------------------------------------------|---------|
| `index.html` | Home `/` |
| `links.html` | `/links.html` |
| `playing_field.html` | `/playing_field.html` |
| `qr-code.html` | `/qr-code.html` |
| `ambassadorsprogramdesc.html` | `/ambassadorsprogramdesc.html` |
| `circulareconomy/` | `/circulareconomy/` |
| `bankingsystem/` | `/bankingsystem/` |
| `devtools/minima-archive/` | `/devtools/minima-archive/` (archive mirror hub) |
| `devtools/` | `/devtools/` (hub + `minima-query/` + `minima-archive/`) |
| `assets/` | Shared JS/CSS for document pages |
| `brand/` | Logos and brand assets |
| `stables.css` | Council shell (also linked from pages) |
| `CNAME`, `favicon.png`, `stables_agent_avatar.png` | Site root files |
| `dapp/` | **Overlay only** from **`stream_1_app/dapp/`** at sync time (same paths as **`https://stablescouncil.org/dapp/`**) |

**Rule:** `github_pages_root` **must** stay aligned with this table. **`prod_stablescouncil_github_pages_root`** and **`3_archive/...`** snapshots should use **identical** relative paths inside the tree so diffs and restores stay predictable.
