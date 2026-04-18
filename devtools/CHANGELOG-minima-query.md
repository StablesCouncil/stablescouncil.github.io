# Minima holdings query (devtools)

## 2026-04-16

- Chart fallback when the holdings API is unreachable or empty now uses a fixed **MEXC-style illustrative** series (not random “demo” copy) and quieter status/meta for that path.
- **Save address**: names and addresses can be stored in **this browser only**; they appear under “Saved on this device” in the preset list. Public, shareable naming still goes through **GitHub** (`devtools/minima-query/github`).
- Removed the long API contract paragraph and the extra in-page “All links · Minima dev tools home” line from this page (site chrome and footer unchanged).
- Default preset **BitMart** address updated. **Discord channel** panel copy now describes the channel as a place to discuss and share on-chain analysis.
- On first load the **Saved address** control stays on **Custom…** while the default MEXC address is filled in the **Minima address** field (chart still loads for that address).
- `devtools/minima-query/github/README.md` notes the Stables mirror path and that **stablescouncil.org** updates only after copying into the GitHub Pages repo.
- Page layout: removed devtools breadcrumb line; **Block live** / **Block (DB)** pills are compact at the top; **Minima address** field is first, then preset dropdown; removed the long preset hint under the dropdown.
