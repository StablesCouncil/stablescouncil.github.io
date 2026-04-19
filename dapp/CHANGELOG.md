# Changelog — Stables MiniDapp

**Purpose:** Every change worth telling users, Council, or social channels gets a line here **when you merge the change** into this version. At release, copy the section for that version into release notes, Telegram, and X.

**Format:** [Keep a Changelog](https://keepachangelog.com/) style. Use **Added**, **Changed**, **Fixed**, **Removed**, **Security** as needed. Dates in ISO (`YYYY-MM-DD`).

---

## [Unreleased]

**Parallel demo channel:** demo line lives in **`dapp/2-demo/`** (label **`v00.00.00.01.00`**, **`APP_STAGE: demo`**). **Default new product work** happens there; **`dapp/`** at repo root also holds the **showcase** Pages shell. See **`0_handshake/minidapp_version.md`**.

Post–**v00.00.03** work in the active dev folder. **Do not** describe these items as part of showcase **v00.00.03** in public posts until this section is merged into a new released label and zip.

### Added

- **`dapp/PORTING_GAP.md`:** Single **lead vs downstream** ledger (prod → test → demo → showcase) so porting gaps are tracked in one place; see **`0_handshake/minidapp_version.md`** pointer.

### Changed

- **Community links (Discord):** **More → Community → Legal & notices** Discord invite updated to **`https://discord.gg/rTdqwRGPXR`** (canonical **`0_handshake/links.md`**). Same URL in **showcase** shell **`1-showcase/index.html`**.

- **`0_handshake/handshake.md`:** **Active MiniDapp trees** bullet now references **`dapp/PORTING_GAP.md`** as optional porting ledger (routing defaults unchanged).

- **`dapp/2-demo/`:** Removed duplicate **`latest-version/`** and **`latest version/`** placeholder folders (README-only); **archived** at **`3_archive/stream_1_app/task_archived_dapp_2_demo_latest_placeholders_2026-04-16/`**. **`MINIDAPP_VERSIONING.md`** updated (demo zip pointer → **`2-demo/build/README.md`**).

- **Drive cleanup (2026-04-16):** Removed **`dapp/*/previous-versions/`** from active **`1_development/.../dapp/`** (all four channels); content stays in **`3_archive/stream_1_app/task_archived_dapp_channel_previous_versions_2026-04-16/dapp/`**. Added four-channel README indexes at **`2_current/stream_1_app/dapp/`** and **`3_archive/stream_1_app/dapp/`**. **`handshake.md`**, **`minidapp_version.md`**, **`MINIDAPP_VERSIONING.md`**, **`dapp/readme.md`**, **`stream_1_app/README.md`**, **`dapp/build/README.md`**, **`1-showcase/latest-version/`**, **`task_archived_dapp_root_redirect_stubs_2026-04-16/README.md`**.

- **Channel folder names (2026-04-16):** **`showcase/`** → **`1-showcase/`**, **`demo/`** → **`2-demo/`**, **`test/`** → **`3-test/`**, **`prod/`** → **`4-prod/`** under **`dapp/`** (disk and public URLs, e.g. **`/dapp/1-showcase/`**). Root **`dapp.conf`** **`web`** = **`1-showcase/index.html`**; root **`index.html`** redirects to **`1-showcase/`**. **`MINIDAPP_VERSIONING.md`**, **`minidapp_version.md`**, **`handshake.md`**, **`session_map.md`**, **`global_knowledge_base.md`**, **`.cursor/rules/stables-handshake.mdc`**, **`stream_1_app/README.md`**, **`dapp/readme.md`**, **`handover_document.md`**, **`dapp/build/README.md`**, archive redirect stubs, **`2_current/.../github_pages_website_engineering.md`**, StablesAgent brain ( **`llms.txt`** rebuild).

### Removed

- **Root `dapp/latest-version/`** and **`dapp/previous-versions/`** (redirect-only **`index.html`** stubs to **`showcase/`**). **Moved** to **`3_archive/stream_1_app/task_archived_dapp_root_redirect_stubs_2026-04-16/`**. Bookmarks must use **`dapp/1-showcase/latest-version/`**; old root URLs **404** on Pages after ship. **`handshake.md`**, **`minidapp_version.md`**, **`MINIDAPP_VERSIONING.md`**, **`dapp/readme.md`**, **`stream_1_app/README.md`**, **`VERSION_HISTORY.md`** updated.

- **`dapp/v00.00.00.00.03/`** and **`dapp/v00.00.00.01.00/`** (redirect-only **`index.html`** stubs). **Showcase** and **demo** each have a single shell: **`dapp/1-showcase/index.html`** and **`dapp/2-demo/index.html`**. Old **`/dapp/v00.00.00.00.03/`** and **`/dapp/v00.00.00.01.00/`** URLs will **404** on static Pages unless you add another redirect mechanism. **`MINIDAPP_VERSIONING.md`**, **`minidapp_version.md`**, **`session_map.md`**, **`handover_document.md`**, **`stream_1_app/README.md`**, **`dapp/README.md`**, **`latest-version/README.md`** updated.

### Changed

- **Per-channel install paths on Pages:** current showcase **`.mds.zip`** and **`VERSION_HISTORY.md`** under **`dapp/1-showcase/latest-version/`**; other channels use **`latest-version/`** when published. Retired **previous-versions** READMEs: **`3_archive/.../task_archived_dapp_channel_previous_versions_2026-04-16/`** only. **`runtime-config.js`** / **`activity-contacts.js`** default GitHub tree URL points at **`dapp/1-showcase/latest-version`**. Showcase hub zip staging (**`dapp/build/README.md`**) copies **`1-showcase/index.html`** only (not nested ship folders). **`MINIDAPP_VERSIONING.md`**, **`minidapp_version.md`**, **`minidapp_version_log.md`**, **`handshake.md`** (Packaging Rule), **`stables-handshake.mdc`**, **`stream_1_app/README.md`**, **`dapp/README.md`**, StablesAgent brain **`minidapp_showcase_app.md`** / **`website_presentation.md`**, **`llms.txt`** (rebuild).

- **Showcase historical zips (2026-04-16):** Older showcase **`.mds.zip`** files (**`Stables_v00.00.01.mds.zip`**, **`Stables_v00.00.02.mds.zip`**, **`Stables_v0.01.01.mds.zip`**) **moved** to **`3_archive/stream_1_app/task_archived_dapp_showcase_previous_mds_2026-04-16/`**. **`VERSION_HISTORY.md`** rows updated.

- **Showcase consolidation (2026-04-15):** **`prod_stables_app_v00.00.00.00.03/`** **moved** to **`3_archive/stream_1_app/task_archived_prod_stables_app_v00_00_00_00_03_2026-04-15/`** ( **`FROZEN.md`** ); **`dapp/`** (**`showcase/`**, root **`assets/`**, **`dapp.conf`**) is the **only** active showcase hub path. Added **`dapp/build/README.md`** (staging zip recipe) and operator **`dapp/README.md`** ( **`readme.md`** remains legacy copy from the old prod tree). **`minidapp_version.md`**, **`handshake.md`**, **`minidapp_version_log.md`**, **`web_component_spec.md`**, **`latest-version/README.md`**, **`MINIDAPP_VERSIONING.md`**, **`.cursor/rules/stables-handshake.mdc`**, **`global_knowledge_base.md`**, **`stream_1_app/README.md`**, **`handover_document.md`**, **`ui_inventory`**, **`FEEDBACK_CLICK_BY_CLICK_GITHUB.md`**, **`HANDOVER_agent_adapt_on_off_ramp_page.md`**, **`dapp/2-demo/CHANGELOG.md`**, **`dapp/latest-version/VERSION_HISTORY.md`**.

- **Demo consolidation (2026-04-15):** **`prod_stables_app_demo/`** **moved** to **`3_archive/stream_1_app/task_archived_prod_stables_app_demo_2026-04-15/`** ( **`FROZEN.md`** ); **`dapp/2-demo/`** is the **only** active demo product path. **`minidapp_version.md`**, **`handshake.md`** (Packaging Rule), **`.cursor/rules/stables-handshake.mdc`**, **`global_knowledge_base.md`**, **`stream_1_app/README.md`**, **`handover_document.md`**, **`ui_inventory`**, **`MINIDAPP_VERSIONING.md`**, **`minidapp_version_log.md`**, **`dapp/2-demo/build/README.md`**, **`dapp/2-demo/CHANGELOG.md`**.

- **Pages `dapp/` layout (2026-04-16):** Full shells under **`dapp/1-showcase/`** and **`dapp/2-demo/`**. Root **`dapp.conf`** **`web`** = **`showcase/index.html`**. **`MINIDAPP_VERSIONING.md`**, **`latest-version/README.md`**, **`webpages/README.md`**, **`stream_1_app/README.md`**, **`session_map.md`**, **`minidapp_version.md`**, **`handover_document.md`**, demo **`index.html`** canonical **`/dapp/2-demo/`** updated.
- **Drive alignment and cleaning:** **`stream_1_app/README.md`** documents the folder map and **`dapp/2-demo/`** as the demo edit target. **`handover_document.md`** adds a **Publication parity** operator checklist (dev → Pages → web → **`2_current`** → brain). **`global_knowledge_base.md`** layer 5 references the **`dapp/`** web mirror. **`dapp/README.md`** links to **`stream_1_app/README.md`**. Showcase **`prod_*` `CHANGELOG`** historical line corrected (Pages path **`stream_1_app/dapp/`**).

### Fixed

- **Mint xWiniwa chart (CoinGecko history):** **`fetchJsonForApp`** tries **browser `fetch` first** (12s abort timeout), then **MDS `net.GET`** (10s). MDS unwrap accepts **HTTP `status` 200–299** (not only **`stablesMdsCmdOk`**) plus **`stablesCoerceMdsPayload`**. If both fail, the chart renders a **synthetic daily curve** from **`SIM_Winiwa_PRICE`** so the Mint page never sticks on **Loading…** when the network or WebView blocks APIs.

### Changed

- **GitHub Pages / web: showcase URL:** The full interactive page moved from **`/dapp/index.html`** to **`/dapp/1-showcase/index.html`**. **`/dapp/index.html`** is a short **redirect** to **`showcase/`**. Canonical and Open Graph URLs for the live preview point at **`https://stablescouncil.org/dapp/1-showcase/`** (and the GitHub Pages host equivalent). Script and image paths in the page use **`../assets/`**, **`../agent.png`**, etc. **`assets/routes/feedback.js`** and **`activity-contacts.js`** use **`../agent.png`** for inline agent thumbnails so they resolve from the **`showcase/`** document.

- **`dapp.conf` hub entry:** **`web`** is **`showcase/index.html`** so **`.mds.zip`** installs match the **Pages** tree (same relative layout: **`showcase/`** + **`assets/`** at zip root).

- **Docs (zip = Pages):** **`MINIDAPP_VERSIONING.md`** adds *Zip contents (same as GitHub Pages `dapp/`)* ( **`dapp.conf`**, **`showcase/index.html`**, **`assets/`**, root images, optional root redirect). **`latest-version/README.md`** links that section and **`../build/README.md`** for build steps.

- **Dev folder rename (showcase):** **`prod_stables_app_v00.00.02`** → **`prod_stables_app_v00.00.00.00.03`** so the path matches the canonical five-segment label. Handshake, **`minidapp_version.md`**, UI inventory, and Cursor rules point at the new folder. **GitHub Pages** working copy: **`1_development/stream_1_app/dapp/`** was refreshed from this tree (excluding **`build/`** and **`latest version/`**); **`MINIDAPP_VERSIONING.md`** and **`latest-version/VERSION_HISTORY.md`** note the alignment. *(Later: **`prod_stables_app_v00.00.00.00.03/`** archived **2026-04-15**; active path **`dapp/`**.)*

- **Version label (showcase):** **`APP_BUILD_VERSION`**, **`dapp.conf` `version`**, and top bar default use the canonical **five-segment** body **`00.00.00.00.03`** (`vPM.Pn.TT.DD.SS`, see **`0_handshake/minidapp_version.md`**). **`APP_UPDATE_POLICY.latestPublishedVersion`** matches this label; Council comms compares legacy **three-segment** labels as **`a.b.c` → `a.b.0.0.c`** in **`activity-contacts.js`**.

### Added

- **`MINIDAPP_VERSIONING.md` (Pages / zip mirror):** **Channel model** section (one shell and UX; stages differ by functionality and backends; showcase as advanced synthetic preview; optional test/prod folders; canonical two-digit labels vs display-only shorthand). **Authoring and ship** paragraph: edit under **`1_development/stream_1_app/dapp/`**, run **`npm run sync:site`**, ship **`site/dapp/MINIDAPP_VERSIONING.md`** with the rest of **`site/`**. Handshake **`0_handshake/minidapp_version.md`** points at this path for the next refresh.

- **Wallet: Vietnamese đồng (VNDw):** Full demo integration: **wallet row** (balance + equivalent), **persisted** in demo wallet state with other stables, **exchange** and **vault dropdowns** (send/receive, mint issue/reclaim, invoice, LP quote, coverage fund deposit). **Settings:** primary currency, price display, custom badge currency, and **display pill** (Viet flag via **flagcdn** + **₫** icon in icon mode). **Rates:** `RATES` gains a **VNDw** row/column from a demo anchor (**~25,000 VND per 1 USDw**); **Winiwa / xWiniwa** edges stay in sync via **`syncWiniwaRatesFromSpot`**. **UI formatting:** **0** decimal places for amounts (same family as JPY/CNY). **Liability risk profile** and **coverage fund** demo composition include **VNDw**.

- **Receive modal QR:** Loads **`assets/qrcode.js`** and renders a **scannable QR** from receive currency, optional amount, and address. **Minima** encodes full **`Mx…`** plus optional amount line when **Node live**; demo currencies encode a short **Stables receive request** text (full **`Mx…`** only when the address is not truncated). Placeholder copy when the address is not ready yet.
- **Receive QR for phone cameras:** Inline QR is **larger** (~248px), **black on white**, with **padding** as a quiet zone. **Large QR for phone camera** (and **tap the QR**) opens an overlay with a **~320px** code plus short tips (brightness, steady hold). Closing **Receive** also closes the large-QR overlay.
- **MiniDapp hub: Scan to Pay camera:** **Scan to Pay** modal (**Use camera**) uses the Web **`getUserMedia`** video path (and **`BarcodeDetector`** when the WebView supports it, else **`jsQR`** from **`assets/jsQR.min.js`**). **MDS does not add a camera API**; whether the camera works depends on the **Minima app** granting camera to the MiniDapp **WebView**. On success, a full **`Mx…`** payload fills **Send** and opens the send modal. Copy explains hub vs paste fallback.
- **Scan to Pay camera (laptop webcam):** **getUserMedia** now **falls back** from rear camera (**environment**) to **user** (webcam / front), then generic video constraints, so **laptop webcams** can scan a **QR shown on a phone** (same decoder as phone-at-screen). Modal copy describes both directions.
- **Native MINIMA receive: Mx vs 0x:** **`getaddress`** is parsed into **`{ mx, hex }`** ( **`miniaddress` / `mxaddress` / deep JSON search** for **`Mx…`**, plus **`0x…`** script-style strings). **Receive** defaults to **Mx** when the node provides it; **Settings → Appearance → Native MINIMA receive format** switches to **0x hex** when you want that label. **Send** sanitization and **QR** accept **Mx** (including non-hex wallet alphabets) or **0x**. If the reply has **only 0x** while **Mx** is preferred, the hint under the address explains **Settings** / **Minima update**.

- **Receive (copy / QR expectations):** Receive modal **subtitle** and **hint** under the address now state that non-**MINIMA** **`Mx…`** lines are **showcase demos** (format-like only); **real native MINIMA** receive uses **Minima** + **Node live** **`getaddress`**. **+ New address** toast says **demo / not on-chain MINIMA**.

- **Send MINIMA: recipient parsing:** **`stablesSanitizeMinimaSendAddress`** no longer rejects valid **`Mx…`** pastes that include invisible Unicode (zero-width / BOM / non-breaking space), which could make Android show our old “paste a Minima address” style message even when the field looked correct. We strip those characters, extract the first **`Mx` + hex** run, and require the same minimum length as elsewhere. **Send** recipient field gets **`autocomplete` / `autocapitalize` / `spellcheck`** hints to reduce keyboard mangling. Modal copy notes that showcase demo receive strings may still be **rejected by the node** if they are not real on-chain addresses.

- **Receive tap-to-copy:** Showcase receive line was a shortened **`Mx…`** string and **+ New address** generated another shortened demo address, so clipboard matched the ellipsis form. Default demo address is now **full-length `Mx` + 64 hex**, **`data-full-address`** stays in sync for non-**MINIMA** currencies, and **`copyAddr`** falls back to the last full entry if the visible text still contains **`...`**.

- **Scan to Pay camera (Android / stuck on “Starting camera”):** **Permissions API** hint when the browser supports **`navigator.permissions.query` for `camera`** (blocked vs prompt). **7s** slow hint and **22s** hard stop with **Minima → Android Settings → Camera** steps if **getUserMedia** never completes (common when the host WebView does not finish permission). **video.play()** guarded with a **12s** timeout and cleanup.

- **Wallet: Winiwa (test) vs Minima (on-chain):** Two separate list rows and send/receive currencies: **WINIMA** = showcase **Winiwa (test)** balance (faucet, mint xWiniwa, demo send); **MINIMA** = native **Minima (on-chain)** from MDS **balance** (not stored in demo wallet JSON). **Send** with **Minima** still uses `send … tokenid:0x00` when **Node live**. **Receive** with **Minima** loads your address via MDS **`getaddress`** when live; **Winiwa** receive stays demo copy. Demo **Exchange** includes **MINIMA** alongside **Winiwa** (same spot math as Winiwa in `RATES`).
- **MiniDapp: on-chain MINIMA send:** With **MDS** active and **Node live**, **Send** with currency **Minima** runs `send address:… amount:… tokenid:0x00` on the node, then refreshes balance from MDS. **Winiwa** send stays **demo**. Other send currencies stay **demo** (local wallet simulation). `build/README.md` documents **zipping**, **installing** the `.mds.zip`, and hub vs `file://` usage.
- **Connect node (showcase):** Top bar **Connect node** opens a modal to load **`mds.js`** with optional **MDS host/port** (saved in localStorage). When MDS connects (MiniDapp hub or a working debug link), the header shows **live chain block height** and the **Minima (on-chain)** row shows **live balance** from the node. Browsers often block HTTPS pages from calling `http://127.0.0.1`; the modal explains using the Stables MiniDapp on the node as the reliable path.
- **Node connection trust cues:** **Node live** (green) only after the node answers **status** or **balance**; until then the pill shows **MDS starting…** (amber). **Block height** parsing accepts JSON-string payloads and **`chain.height`** as well as **`chain.block`**. The **Minima** currency row is **unhidden** when the node is live so on-chain MINIMA is visible without **Show more**; a short status line may still appear under the hero equivalent while block or balance is loading.
- **MDS reliability:** Polling also runs the Minima **`block`** command (tip) when **`status`** JSON shape varies; deep search for **`block` / `height` / `tip`** in nested objects; treats **`status: 1`** or **`"true"`** as success; **400ms** delay before the first pull; **`MDSFAIL`** from `mds.js` surfaces as **MDS issue** (red) with error in the button tooltip; add **`?MDS_LOGGING`** hint for console tracing.
- **MDS vs local file:** If **`MDS` never appears** (for example **`file:///…/index.html`**), an **amber banner** under the top bar explains that Minima does not inject MDS there; **Connect node** modal adds copy to use the **MiniDapp hub URL** or set **MDS host** to the node **LAN IP** (example **10.10.0.2**) and port **9003**. Banner hides once MDS **`inited`** fires.
- **MiniDapp hub auto-connect:** **`index.html`** now includes **`assets/lib/mds.js`** so the hub does not need to inject a global **`MDS`**. On **`http:` / `https:`** with a real **hostname** (hub URL), **`MDS.init`** runs automatically against that host (**`file://`** still uses **Connect node** + **DEBUG_HOST**). **`stablesIsMinidappHostedOrigin()`** gates auto-init vs debug; hint banner logic updated.
- **Connect node host field:** **Normalizes** pasted hub URLs (strips **`https://`**, path, and moves **:port** into the port field). Explains that **`mds.js` builds `https://HOST:PORT/mdscommand_/`**, so a full URL in **MDS host** was invalid. After a failed debug session, **reload** is prompted before reconnecting. **`MDS.DEBUG_*` is only set** when **`mds.js` was loaded via Connect** (not when MDS is injected by the hub).

### Changed

- **MDS origin notice:** When MDS cannot auto-connect (e.g. **file://**, missing **mds.js**, or wrong origin), an **amber dismissible popup** explains next steps. **Close** or backdrop sets **`sessionStorage`** so it stays out of the way for the rest of the tab session; **Open Connect node** closes the popup and opens the **Connect node** modal. **z-index 298** keeps it **under** the welcome flow (**300**) when both apply.
- **Welcome tour (person path):** Button label now says **what I'll be able to do with my bank** (aligned with **Be your bank** wording).
- **Welcome personalisation intro:** **I'll do that later** restored on **Personalise your bank** (after currencies); ends setup the same way as on steps 1–3 (**`finalizeWelcomeSetup()`**).
- **StablesAgent:** **`STABLES_AGENT_OPEN_EXTERNAL_WHEN_MDS`** defaults to **`false`**; FAB / More menu / section pens open the **side drawer only** (no extra browser tab). Set **`true`** in **`runtime-config.js`** only if the agent **iframe** is blocked on the host.
- **MINIMA / Winiwa spot:** **`refreshWiniwaSpotFromMexc`** tolerates **`MDS.net.GET`** response shapes; without MDS, **CoinGecko** is tried before browser **MEXC** fetch for a reliable live MINIMA USD price on static hosts. **Wallet / Exchange / Invest** use **`stablesWalletConversionRate`** (**`SIM_Winiwa_PRICE`** / **`SIM_XWM_PRICE`**) so Winiwa row equivalents follow live spot, not only the seeded **`RATES`** matrix.
- **Receive modal:** **Add tip** and **Open merchant checkout (invoice)** only show when **Merchant** is on under **Settings → Appearance** (same gate as **My shop**).
- **Wallet hero:** Removed the extra **Minima / MINIMA** amount line between the principal **equivalent** and **Send / Receive** (balances stay in **Currencies**). The small **waiting for node** status line under the equivalent is unchanged when MDS is still catching up.
- **Top bar node status:** **Connect node** and the separate **block height** pill are merged into **one** control: **status dot** (red / amber / green) **+** label (**Connect**, **MDS starting…**, **MDS issue**, or **live block height**). Still opens **Connect node** on tap. A small **waiting for node** line may appear under the hero equivalent while block or balance details are still loading.
- **Vault currency dropdowns (one shared UI):** Exchange Send/Receive, Mint Wables **issue** and **reclaim**, **invoice** currency, **Send** / **Receive** modals, **coverage fund** deposit asset, and **LP quote** currency all use the same custom list: **code + live balance**, cyan-accent panel, active row, balance on the closed trigger, **no visible scrollbar** (still scrollable). Values stay on **hidden inputs** so existing helpers (`walletParseCcySel`, `populateCurrencySelect`, `syncCfDepositUI`, `populateLpBaseCurrencies`, etc.) keep working.

- **Help, Stables Academy:** subtitle under the page title now reads **Questionnaires, score tracking, certificates** (plural).

- **Social link previews (X / Discord / others):** Open Graph and Twitter Card meta on the showcase shell with canonical URL `https://stablescouncil.org/dapp/`, preview image `https://stablescouncil.org/brand/assets/twitter-header.png` (site brand header, not StablesAgent art), `twitter:site` (`@StablesCouncil`), `og:image` width/height 1500×500 to match that asset, and alt **Stables MiniDapp showcase** (no em dash).

- **Help → The Stables Academy** (first Help item): Security questionnaire (10 random from bank, 3 options, mandatory gate + minimum 6/10), retake cool-down, best score kept, optional demographics after quiz, anonymized public-DB consent, certificate + share; other topics listed as coming soon.
- **Stables Academy Security flow:** one question at a time; demographics and consent after the 10 knowledge questions; choice to show correctness **after each answer** or **only at the end**.

---

## [00.00.00.00.03] — 2026-04-09 (showcase published, third showcase drop)

Third published showcase line build (**short `v00.00.03`**, five-segment **`v00.00.00.00.03`**). **`Stables_v00.00.00.00.03.mds.zip`** was the current package under **`dapp/1-showcase/latest-version/`** on GitHub Pages; **`Stables_v00.00.02.mds.zip`** and earlier showcase zips are in **`3_archive/stream_1_app/task_archived_dapp_showcase_previous_mds_2026-04-16/`** (supersedes older **`dapp/previous-versions/`** paths).

### Changed

- Bumped **`APP_BUILD_VERSION`**, **`dapp.conf`**, top bar pill, and **`latestPublishedVersion`** to **`00.00.00.00.03`**.
- Dev folder path **`prod_stables_app_v00.00.00.00.03`** matched the shipped label; handshake and versioning docs aligned. *(Superseded **2026-04-15**: active showcase hub path is **`dapp/`**.)*

---

## [00.00.02] — 2026-04-02 (showcase published)

Released showcase build **v00.00.02** (“v2”). See `0_handshake/minidapp_version_log.md` for scope vs later dev-only features (**Academy is not in this release**).

### Changed

- Bumped `APP_BUILD_VERSION` / `dapp.conf` to `00.00.02` for the published showcase line (aligned with published zip when shipped).
- **Mint xWiniwa** chart now uses an **EMA-smoothed leverage trace** while preserving the same live endpoint value.
- **Legal & notices / Privacy** were consolidated: legal section retitled to **Minima dependencies**, copy clarified around architecture/device responsibility/self-custody framing, privacy wording shifted to **local-storage/no telemetry from this static copy**, and security/legal blocks gained clearer StablesAgent/Charter guidance via `openStablesCharterUrl()`.
- **On/Off Ramp** was rebuilt into a release-ready flow: mirrored **6-step on-ramp/off-ramp**, clearer venue/bridge ordering, section title **Where to buy Minima**, and a single **Paper ↔ Stables (And back)** visual with icon references and optional-step styling.
- **On/Off Ramp interactions** now deep-link key steps to Mint: **step 6 Mint Stables** opens Mint Wables mint block and **step 1 Burn to MINIMA** opens Burn Wables block.
- **On/Off Ramp copy/UI** finalized: step 1 partner-exchange wording, step 5 send-MINIMA wording, Stables hub simplified label, compact inline **Get Winiwa - No value** control beside step 4, and right-aligned long-label layout fixes.
- **Welcome personalisation** flow now keeps continuity: **Open Contacts** shows a same-style **later stage** notice and continues to Step 4, and **Step 4** no longer shows **I'll do that later**.
- **Welcome showcase intro** now adds a helper line under **I understand**: users can click outside the modal to skip the whole welcome process.
- **Welcome personalisation intro** is cleaner: removed the **Optional** badge and removed the intro **I'll do that later** button, keeping the modal-exit behaviour as the skip path.
- **Browser tab title** is now fixed to **Stables - BYB** and no longer changes with personalised bank naming.
- **Top bar subtitle behavior** now defaults to **Be your bank** and only switches to **By Stables/Minima** when a custom bank name is set.
- **My profile** now includes explicit mode controls: **Use my settings** and **Use default settings**, so users can keep profile data saved but switch branding behavior at any time.

### Added

- **Invest → Maximize** tab: copy and outbound links to stake MINIMA via the official Minima **Maximize** MiniDapp (MiniDapps hub + docs).
- **Mint xWiniwa**: chart **below** the Mint xWiniwa button: **three** traces — **Winiwa · USD** (spot), **xWiniwa · USD** (spot × leverage), **Leverage** (right axis from **CR% / (CR% − 100%)**, e.g. 130% → 130/30); historical leg interpolates **`CR_HIST_DATA`** with **today** = live `#protocolCRBig`; **Current leverage** row + `SIM_XWM` / mint math use same formula. ~365d CoinGecko Winiwa spot; hover/touch tooltip; tighter margins, taller plot.
- **Welcome → currencies/personalisation**: **Unselect all** next to **Select all**; **Save and continue** into optional personalisation (**Step 1–4 of 4**: bank name, profile picture, contacts onboarding, directory preview); **Finish** saves council profile (name + avatar when set) and closes welcome. Bank-name copy clarifies **private vs on transactions**, changeable anytime in **My profile**.
- **Branding**: MiniDapp **headline** / page **title** / default top bar tagline **By Stables on Minima** (replaces “Be your bank” in those places). **Top bar** shows **My profile** picture and display name (or welcome bank name) when set; when the title is **personalised** (not the default **Stables** wordmark), the subtitle switches to **by Stables/Minima**. **Brand hover**: custom panel (cyan–purple gradient text, dark frame) **“My bank made possible by Stables on Minima”** replaces the old **Home** `title` tooltip; keyboard focus shows the same panel. **Touch (`hover: none`)**: tap the **tagline** to toggle that panel; tap the tooltip, outside the bar, or the logo/title row to dismiss / go home. Center pill **Showcase · v…** tracks **`APP_BUILD_VERSION`** from `runtime-config.js` (currently **00.00.02**).
- **Legal & notices**: **Minima dependencies** section (foundation + corporate independence + open networks + **unstoppable** framing + non-custodial seizure/blocking; not legal advice).
- **Amount inputs**: **Available** balance for the relevant asset next to **Exchange** (send + receive balance hint), **Send** / **Receive** modals, **Create invoice**, **Coverage fund** deposit amount, **Burn Wables** (per selected stable); **MAX** fills the field from that balance (where it already existed for mint / LP, unchanged). Labels refresh with **global UI** and currency changes.
- **Send / Receive modals**: currency **dropdown options** show **each enabled wallet currency with its balance** (`Code · amount`, tabular numbers, wider select). Refreshes whenever the wallet UI syncs.

---

## [0.01.01] — 2026-03-31 (frozen)

**Frozen snapshot:** `3_archive/stream_1_app/prod_stables_app_v0.01.01/`  
**Public:** Web Showcase at `https://stablescouncil.org/dapp/`; node package `Stables_v0.01.01.mds.zip` in `stablescouncil.github.io` → `dapp/latest-version/`.

### Added

- Full static Showcase app deployed under Pages `/dapp/` (replacing placeholder page).
- Versioned MiniDapp zip for node installs (`Stables_v0.01.01.mds.zip`).
- Structured **More → Feedback** on **web** (POST to Council feedback API); node path uses `MDS.net.POST` where applicable.
- Welcome / showcase copy: write mode vs read mode wording; toast styling for long errors.

### Changed

- Public site CTAs: **Test the showcase** → `stablescouncil.org/dapp/`; hero simplified (single primary CTA).
- Handshake / comms: X hashtag rules surfaced in `global_knowledge_base.md`, `session_map.md`, Cursor rule; `stables_master_reference` aligned with `handshake.md` §4.

### Fixed

- (Node) Feedback delivery still under investigation for some mobile nodes; web feedback path verified working.

### Known

- `latestPublishedVersion` in config tracks last **published** zip on GitHub; bump when shipping a new zip.
