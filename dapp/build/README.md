# MiniDapp package (MDS) — Stables showcase `v00.00.00.00.03`

## Layout (aligned with GitHub Pages `dapp/`)

The **showcase** hub zip uses the same shape as the **`dapp/`** root on Pages, **without** other channel trees or ship folders:

| Path | Role |
|------|------|
| **`dapp.conf`** | Package manifest; **`web`** must be **`1-showcase/index.html`**. |
| **`1-showcase/index.html`** | Full MiniDapp UI (scripts **`../assets/…`**, images **`../agent.png`**, etc.). |
| **`assets/`** | JS, CSS, routes, **`lib/mds.js`**, QR helpers, **`config/runtime-config.js`**, … |
| **`agent.png`**, **`stables_icon.png`**, stickers, SVG | Zip **root** (siblings of **`1-showcase/`** and **`assets/`**). |
| **`index.html`** (root) | Optional **redirect** to **`1-showcase/`** for direct browser opens. |

**Do not** include **`2-demo/`**, **`3-test/`**, **`4-prod/`**, or **`1-showcase/latest-version/`** inside the hub zip.

## Packaging rule

Build the zip from a **staging folder**: copy **only** the allowlisted **files** and the **`assets/`** tree from **`dapp/`** root, then copy **`1-showcase/index.html`** into **`staging/1-showcase/index.html`** (not the whole **`1-showcase/`** directory, so ship zips are not nested). Then **`Compress-Archive`** the **contents** of staging.

**Canonical filename:**

| File | Purpose |
|------|---------|
| **`Stables_v00.00.00.00.03.mds.zip`** | Installable MiniDapp for the Minima hub (**showcase** line) |

## Build the zip (PowerShell, from repo root)

```powershell
$root = "1_development/stream_1_app/website/dapp"
$stage = Join-Path $env:TEMP ("stables_showcase_zip_" + [guid]::NewGuid().ToString("n"))
New-Item -ItemType Directory -Path $stage -Force | Out-Null
$includeFiles = @(
  "dapp.conf", "index.html", "CHANGELOG.md",
  "agent.png", "stables_icon.png", "shop_sticker_minimal_v0.0.01.png", "treasure-chest.svg",
  "license", "readme.md", "component_browser.html", "template_complete.html", "template_demo.html",
  "test-mds-connection.html"
)
foreach ($name in $includeFiles) {
  $src = Join-Path $root $name
  if (Test-Path -LiteralPath $src) {
    Copy-Item -LiteralPath $src -Destination (Join-Path $stage $name) -Force
  }
}
Copy-Item -LiteralPath (Join-Path $root "assets") -Destination (Join-Path $stage "assets") -Recurse -Force
$sc = Join-Path $stage "1-showcase"
New-Item -ItemType Directory -Path $sc -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $root "1-showcase\index.html") -Destination (Join-Path $sc "index.html") -Force
New-Item -ItemType Directory -Path (Join-Path $root "build") -Force | Out-Null
$zip = Join-Path $root "build/Stables_v00.00.00.00.03.mds.zip"
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $zip -Force
Remove-Item -LiteralPath $stage -Recurse -Force
```

Copy the resulting zip into **`dapp/1-showcase/latest-version/`** when publishing to GitHub (and update **`VERSION_HISTORY.md`** per Council process).

## Install on your node

1. Copy **`Stables_v00.00.00.00.03.mds.zip`** to the device that runs Minima.
2. In the **MiniDapp hub**, install the zip and open **Stables** from the hub list.
3. The hub loads **`1-showcase/index.html`** per **`dapp.conf`**.
