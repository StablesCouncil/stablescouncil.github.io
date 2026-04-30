# MiniDapp package (MDS) — Stables demo `v00.00.00.01.00`

## Layout (demo hub tree)

The **demo** channel ships as a **self-contained** folder: **`dapp.conf`** at the zip root with **`web`** = **`index.html`**, sibling **`assets/`**, root **`index.html`**, and root art (**`agent.png`**, **`stables_icon.png`**, …). Same shape as **`/dapp/2-demo/`** on GitHub Pages.

**Do not** wrap the zip in an extra parent folder. The archive root must look like this app folder root.

## Packaging rule

Zip the **contents** of **`1_development/stream_1_app/dapp/2-demo/`** (this folder’s parent is **`dapp/`** on the full site; for the **demo-only** zip, zip **`dapp/2-demo/`** itself), **not** a parent wrapper directory. **Exclude** the **`build/`** directory (generated zips and notes).

**Canonical filename** (version in the name):

| File | Purpose |
|------|---------|
| **`Stables_v00.00.00.01.00_demo.mds.zip`** | Installable MiniDapp for the Minima hub (**demo** line) |

## Build the zip (PowerShell, from repo root)

```powershell
$dev = "1_development/stream_1_app/dapp/2-demo"
$items = Get-ChildItem -LiteralPath $dev -Force | Where-Object { $_.Name -ne 'build' }
Compress-Archive -LiteralPath ($items.FullName) -DestinationPath "$dev/build/Stables_v00.00.00.01.00_demo.mds.zip" -Force
```

Adjust the path if your clone layout differs. After ship, run **`npm run sync:site`** if the public **`site/`** tree must reflect other **`dapp/`** changes.

## Install on your node

1. Copy **`Stables_v00.00.00.01.00_demo.mds.zip`** to the device that runs Minima.
2. In the **MiniDapp hub**, install the zip and open **Stables** from the hub list.
3. **`dapp.conf`** **`web`** is **`index.html`** at zip root (demo channel).
