# Stables MiniDapp — Showcase (public) vs active dev line

*Last updated: 2026-04-01.*

This section is for StablesAgent and external AIs when users ask about the **Stables app preview** (Showcase / MiniDapp), how to open it, and how feedback works.

## 0. Version map (do not conflate)

| Line | Version | Meaning |
|------|---------|--------|
| **Public web + published zip** | **v0.01.01** | What visitors get at **https://stablescouncil.org/dapp/** and **`Stables_v0.01.01.mds.zip`** in Pages **`dapp/1-showcase/latest-version/`** until Council publishes a newer zip and redeploys web. (Former root **`dapp/latest-version/`** redirect stub **retired 2026-04-16**; see **`0_handshake/minidapp_version.md`** for current paths.) |
| **Frozen source snapshot** | **v0.01.01** | `3_archive/stream_1_app/prod_stables_app_v0.01.01/` (see `FROZEN.md` there). |
| **Active repo development** | **v0.01.02** | `1_development/stream_1_app/prod_stables_app_v0.01.02/` per `0_handshake/minidapp_version.md`. Changes are logged in **`CHANGELOG.md`** in that folder. |

If the user asks “what version is live on the web?” answer **0.01.01** until the site and **`1-showcase/latest-version`** zip are updated. If they ask “what are you building now?” answer **0.01.02** in the development folder.

## 1. What it is

- The Showcase MiniDapp is a **preview**: wallet-style UI, demos, StablesAgent hooks, and **More → Feedback** (structured public submissions). Not a final production release.
- **Frozen older UIs** (v0.2.x, etc.) live in archive folders; **do not** describe them as current unless the user asks about history.

## 2. Where to open it

- **Web (Showcase):** **https://stablescouncil.org/dapp/** (also under the Council GitHub Pages site). Marketing CTA **Test the showcase** on stablescouncil.org.
- **Minima node:** Install the **published** package from GitHub **`dapp/1-showcase/latest-version/`** (filename matches the published version, e.g. **`Stables_v0.01.01.mds.zip`** while that remains latest). Zip root = app contents, not a nested folder (`build/README.md` in the active dev folder).

## 3. MiniDapp list: write mode vs read mode

- On a **Minima node**, each MiniDapp can run in **read mode** or **write mode**.
- For Stables, **write mode** is required for features that use the node network: **StablesAgent**, **structured feedback** (HTTP POST via the node), and similar. If those fail, ask them to set Stables to **write mode** (not read mode).

## 4. Structured feedback (More → Feedback)

- Posts **public** JSON to the Council feedback API (default **`https://agent.stablescouncil.org/api/feedback`**, configurable via `FEEDBACK_SUBMIT_URL` / `runtime-config`). **Web (browser)** typically uses **`fetch`**; **node** uses **`MDS.net.POST`**. Consent required; no secrets.
- **Community:** **https://t.me/stablescommunity** and the public GitHub feedback folder linked from the app.

## 5. Known issues (Showcase)

- **Some mobile nodes:** structured feedback may not complete on the node; **web** path has been reported working. **Workaround:** Telegram or GitHub; engineering continues to debug node delivery.

## 6. Mint xWiniwa chart (Showcase)

- Location: **Mint** tab → **Mint xWiniwa**, **below** the **Mint xWiniwa** button (not above the form).
- **Three lines:**
  - **Winiwa · USD (cyan):** about the last **365 days** of spot in **USD**. Data source is **CoinGecko** `market_chart` for the **minima** id (shown in-app as **Winiwa** in this test phase; thinned points for drawing).
  - **xWiniwa · USD (purple):** demo strip **Winiwa_USD × leverage** at each time step (same leverage series as the green line). **Not** on-chain xWiniwa.
  - **Leverage (green, right axis):** derived from **headline coverage ratio** as **CR% / (CR% − 100%)** (example: **130%** → **130 / 30 ≈ 4.33×**). The chart sweeps **interpolated** values from in-app **`CR_HIST_DATA`** along the time axis and pins the **last** point to the live Treasury **CR** (`#protocolCRBig`). **Not** on-chain. **Current leverage** on the Mint form and **xWiniwa** demo pricing use the **same** formula from the current CR headline.
- **Hover or drag (touch):** vertical crosshair and a small panel with **calendar date** plus **Winiwa USD**, **xWiniwa USD**, and **leverage** at the nearest sample.
- If the chart shows **Unavailable.**, the network or API rate limit blocked the fetch (retry later; **MDS.net.GET** on node when `MDS` is present).

## 7. StablesAgent inside the app

- With **`MDS`**, StablesAgent may open in the **system browser** per `runtime-config` / in-app behaviour.

## 8. One-line answers

- **“Where is the Showcase?”** → **https://stablescouncil.org/dapp/**.
- **“Which zip matches what’s published?”** → Check **`dapp/1-showcase/latest-version/`** on the Pages repo (currently **0.01.01** until a new zip is published).
- **“Feedback won’t send on my phone node.”** → **Write mode**, **online**; else **Telegram** (**t.me/stablescommunity**).
