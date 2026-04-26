# Minima holdings query — GitHub-side naming

This folder documents how **address labels** and **operator notes** on the [Minima Onchain Watch](https://stablescouncil.org/onchain-watch.html) page relate to **GitHub**.

- The on-page **Address naming** box collects a **public GitHub username**, an optional **label** for the Minima address shown in the chart panel, and optional **notes**. Nothing here is submitted automatically from static Pages; wire-up belongs on the Council API when ready.
- Use your **normal GitHub identity** for attribution. Do not put secrets, keys, or session tokens in issues or PRs.

When the Council publishes a concrete workflow (issue template, JSON schema, or PR path), add a short link here so operators have one place to look.

**Exchange presets:** The three **Saved address** options on the page are defined in **`assets/minima-holdings-query.js`** (`DEFAULT_PRESETS` or override `window.STABLES_MINIMA_HOLDINGS_PRESETS`). Replace the placeholder Exchange 2 and Exchange 3 hex with real hot-wallet addresses when known.

**Query string (holdings API):** `address`, optional `date_from` / `date_to` (YYYY-MM-DD, omitted when range is **All**), and `interval_type` one of `DAY`, `WEEK`, `MONTH`, `QUARTER`, `YEAR`.

**Repo:** [stablescouncil.github.io](https://github.com/StablesCouncil/stablescouncil.github.io) — path `devtools/minima-query/`.
