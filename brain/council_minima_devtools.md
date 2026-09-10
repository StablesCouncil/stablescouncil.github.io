# Council Minima dev tools (public website)

## Minima Onchain Watch

**URL:** `https://stablescouncil.org/onchain-watch.html`

**What it is:** A public Council devtool page with two main features:

1. **Holdings chart** — enter any Minima address (or pick a saved / preset address) and query its historical balance (Minima) and UTXO count over a chosen date range. Results appear as a dual-axis line chart (Balance on left axis, UTXO count on right). The chart reads from the Council archive MySQL database via the API at `https://agent.stablescouncil.org`. Displays live blockchain block height and the latest DB block height so you can see how current the data is. A **Download CSV** button exports the queried data.

   - **Range presets:** 1 month, 3 months, 1 year, All, Custom dates.
   - **Interval options:** DAY, WEEK, MONTH, QUARTER, YEAR.
   - **Saved addresses:** Users can save labelled addresses locally in the browser for quick re-query.
   - **Default / example address:** MEXC hot wallet `0x4AD25252814256BEDDF7EA6F0CF75E48FC10E8D11FE3FC70551BB427A2BBA84A`.

2. **Minima archive node download** — a direct download button for the latest full Minima archive export (`archive_latest.raw.dat`) served from the community VPS via `https://agent.stablescouncil.org/api/devtools/archive-download`. Direct file path: `http://70.34.244.170/minima-archive/archive_latest.raw.dat`. The export is updated daily by the StablesCouncil VPS. The panel shows the **latest block**, **export timestamp**, and **file size** for the current export.

3. **Discord channel link** — links directly to the on-chain analysis thread in the Stables Discord (`https://discord.com/channels/1461269219009232997/1493173250497450066`) for discussion and sharing of on-chain analysis.

**Who it is for:** Community members, archive node operators, and analysts who want to inspect Minima address holdings history or download a full archive to run their own archive node.

**How to use it (holdings):**
1. Open `https://stablescouncil.org/onchain-watch.html`.
2. Paste a Minima address (starts with `0x`) in the address field, or pick a saved address from the dropdown.
3. Choose a date range preset (or set custom dates) and an interval.
4. Click **Run query** — the chart updates with balance and UTXO count.
5. Click **Download CSV** to export the data.

**How to use it (archive download):**
1. On the same page, scroll to the **Minima archive node** panel.
2. Click **Download** to get `archive_latest.raw.dat` from the Council VPS.
3. Use the file to initialise or resync a Minima archive node.

---

## Other devtools URLs (legacy / hub)

Canonical public URLs (custom domain `stablescouncil.org`):

- **Hub:** `https://stablescouncil.org/devtools/` — lists archive chain exports for archive nodes and the Minima address holdings explorer.
- **Archive downloads (devtools path):** `https://stablescouncil.org/devtools/minima-archive/` — same `archive_*.raw.dat` files; large files served from Council VPS.
- **Holdings query (devtools path):** `https://stablescouncil.org/devtools/minima-query/` — older URL for the holdings chart.
- **Onchain Watch (canonical, current):** `https://stablescouncil.org/onchain-watch.html` — this is the current, canonical single-page version combining holdings chart + archive download + Discord link.

**All links page:** Under the **Council** section there is a single row, **Minima Onchain Watch** (chart icon), pointing to `onchain-watch.html`.

**Site chrome:** The page uses `links-page-body has-site-rail deck-chrome-page` body classes — same header/footer/rail chrome as other document deck pages. Right-hand rail nav menu includes Full presentation, Minima dev tools, All links. StablesAgent floating button is present.

**Governance runbooks** (Stables monorepo, not on the public site): operator export, MySQL read-only access, and archive scheduling live under `2_current/stream_3_governance/prod_minima_archive_admin/`.
