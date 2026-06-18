# Changelog  -  Stables MiniDapp

**Purpose:** Every change worth telling users, Council, or social channels gets a line here **when you merge the change** into this version. At release, copy the section for that version into release notes, Telegram, and X.

**Format:** [Keep a Changelog](https://keepachangelog.com/) style. Use **Added**, **Changed**, **Fixed**, **Removed**, **Security** as needed. Dates in ISO (`YYYY-MM-DD`).

---

### [Unreleased], next daily build

Ongoing demo line. Changes are logged here as they are made, then move into a dated, published section on release. Build identity is the `APP_BUILD_ITERATION` counter, shown in the pill, `dapp.conf`, and the zip name (e.g. `Stables_v0.0.0.3.45.mds.zip`).

---

## [0.0.0.3.45] - 2026-06-18 (demo · published)

Published to GitHub Pages, GitHub Releases (Android), and onion BCP. Supersedes **v0.0.0.3.44**. **Three-platform parity fix:** APK embedded UI now matches web and MiniDapp zip (v0.0.0.3.44 APK had shipped with a stale `index.html`).

#### Fixed

- **APK / web / zip drift.** `sync-stables-ui.ps1` now run immediately before every APK build; publish checklist requires identical `index.html` hashes across `2-demo/`, Pages `dapp/2-demo/`, onion `webapp/`, and APK `assets/stables/`.
- **Website no-JS fallbacks** on homepage and `links.html` updated to match `PUBLISHED_DEMO_VERSION`.

---

## [0.0.0.3.44] - 2026-06-18 (demo · published)

Published to GitHub Pages. Supersedes **v0.0.0.3.42**.

#### Added

- **Payment protection tiers (Quick pay, Standard pay, Protected pay).** QR scans with address and amount can quick pay under your limit (optional 2-second undo in Settings → Security). Standard sends still use Confirm send. Significant amounts, multi-recipient sends, and protected contacts require a 4-digit payment code (inline setup on first use).
- **Contact payment tier.** Each contact can be set to Inherit, Quick pay, Standard pay, or Protected pay on the contact detail card. Favourite send chips show tier hints.
- **Settings → Security → Payment protection.** Configure quick pay limit, significant threshold, daily quick-pay cap, and payment code in your wallet primary currency (for example Minima when that is your starred currency). Set payment code is always visible on the card.
- **Android biometric unlock for protected pay.** On the standalone Android app, protected sends can use device biometrics when available, with payment code as fallback.
- **Payment protection agent menu.** The ⓢ icon on that section opens StablesAgent with FAQ buttons for the payment code, on-device storage, biometrics, and Minima primary limits. Contextual FAQ answers include a path back to the main agent menu.

#### Changed

- **Auto-save across the app.** Payment protection settings, contact notes, transaction notes, council profile edits, welcome currency choices, and address privacy now save on change (debounced where needed). Explicit Save buttons removed from those surfaces.
- **Send split payment is quieter.** Multi-recipient send is a muted optional link below the amount row, not a full-width button competing with MAX.
- **Feedback Demo roadmap is config-driven.** `runtime-config.js` → `DEMO_FEEDBACK_ROADMAP` holds summary, now review, coming soon, and next modules; `feedback.js` builds the block at render time and uses the live build pill label (not stale `APP_BUILD_VERSION` only).

#### Shipped artifacts

- **Android APK** `Stables_v0.0.0.3.44.apk` on GitHub Releases (`app-v0.0.0.3.44`), onion BCP mirror, and in-app updater via `ANDROID_APK_UPDATE`.
- **Web MiniDapp zip** `Stables_v0.0.0.3.44.mds.zip` on GitHub Pages and onion BCP.

#### Fixed

- **Website published-version surfaces stay in sync.** `site-download-version.js` now also drives the **`links.html`** Demo Channel badge via **`data-demo-published-version`**; `dapp/latest-version/README.md` and in-app zip fallbacks no longer point at obsolete **`v0.0.0.1.0`**.
- **StablesAgent contextual help had no return path.** After opening payment protection FAQ from Settings, users can return to the main agent menu via Back.

---

## [0.0.0.3.42] - 2026-06-17 (demo · published)

Published to GitHub Pages, GitHub Releases (Android), and the BCP onion mirror. Supersedes **v0.0.0.3.31**.

#### Added

- **In-app Android APK updates from Settings.** In the standalone app, Settings and updates can download the signed APK from GitHub Releases, verify its SHA256, and open the Android installer without leaving Stables. Bump `ANDROID_APK_UPDATE` in `runtime-config.js` when Council publishes a new release.
- **Android home screen follows My profile branding.** In the standalone app, the launcher name and icon now sync with your bank display name and bank picture from My profile (or the welcome personalisation flow). Switch back to default settings to restore the Stables launcher entry. The first time you add a bank picture, Android may offer to pin an exact shortcut to your home screen.
- **Six colour themes in Settings.** Appearance now offers Stables dark (default), Slate (grey-blue midpoint), Solar (amber/gold), Rose (pink), Violet (purple), and Paper (stark high-contrast light). Each theme tints the full shell, including the More side menu. Your choice is saved on this device.
- **Safety check before wallet recovery (standalone app).** Replacing a wallet with a recovered Vault key is irreversible, so it now asks two quick questions first: who can recover your funds if you lose your Vault key, and how to protect funds before replacing a wallet. The Recover button stays disabled until both are answered correctly, and a wrong answer offers to talk it through with StablesAgent. The warning now also states that unbacked funds could be lost forever.

#### Changed

- **Settings and updates on Android** no longer sends users to the website homepage for APK updates; the page compares the installed version to the published GitHub release and offers one-tap download and install when an update is available.
- **More menu: one StablesAgent entry for help.** Guided tours and StablesAgent were separate rows under Help; they are now a single StablesAgent item that opens the agent drawer with welcome paths, guided tour stops, setup help, and free-form questions.
- **All links page matches the public website map.** More → All links now mirrors [stablescouncil.org/links.html](https://stablescouncil.org/links.html): website map, community, and Council sections with the same URLs and descriptions. The broken clearnet onion-resilience path is removed; continuity and verification resources point to the BCP resilience onion site (Tor Browser).
- **Block height pill follows the active theme.** The live sync pill no longer keeps a fixed dark panel on Paper; it uses theme surfaces and borders so white mode reads consistently with the rest of the top bar.
- **Standalone app: quieter top bar and a Network section in Settings.** The version pill sits on the right on every device so the logo and slogan keep room on the left. In the Android app, block height and Connect are gone from the top bar; a small status dot (green, amber, or red) opens Settings → Network instead of the Connect modal. That section shows connection status, block height, and a Check connection action. The Connect modal no longer auto-opens on app launch.
- **Photo QR scan is always available in Send.** The "Use a photo to scan QR code" option now stays visible while the live camera is running, not only when the camera is blocked. When the live camera works, choosing a photo opens the normal file picker (screenshots and saved images). When the live camera is unavailable, the same button still uses the device camera via the native capture fallback.
- **Connect panel is clearer about the RPC port and how to start a node.** The panel now states the rule that your RPC port is your node's port + 4 (a node on port 9101 has its RPC on 9105), defaults the RPC URL to the direct no-password port `9105`, adds a copyable desktop launch command (`java -jar minima.jar ... -port 9101 -rpcenable true`), and tells you to leave the password blank for a node started that way.
- **Recovery progress screen explains the node restart.** During wallet recovery the node restarts and the app relaunches itself. The progress screen now states this is normal and that the balance and transaction history sync from your node when it returns.

#### Fixed

- **Broken onion resilience clearnet link removed.** `stablescouncil.org/onion-resilience/` is not published on GitHub Pages; the app now lists the BCP resilience onion address from the official links page instead.
- **Light appearance is readable end to end.** The old light toggle only swapped a few background tokens, so cards, inputs, and chrome stayed dark. Themes now drive shared surface, border, text, and accent tokens across the shell.
- **Side menu follows the active theme.** The More drawer (background, header, language bar, section labels, row captions, and hover states) now uses theme tokens instead of a fixed dark panel, so Solar, Rose, Violet, and Paper read clearly and look distinct from Stables dark.
- **Light theme contrast pass.** Paper uses near-black text on white, stronger borders on controls, and darker drawer captions. Colourful dark themes use accent-tinted section labels in the side menu.
- **Duplicate transaction rows are merged after send and node sync.** An optimistic local send row (`MINIMA-…`) and the authoritative node-history row (`NODE-…`) for the same payment no longer both stay in Activity or wallet recent activity. Reconciliation matches by txpow id (case-normalized), inner transaction id, amount, recipient, and time, and keeps the node row.
- **Pending sends no longer show a wrong transaction id.** An unmined send response can carry a 64-hex value that is not the proof-of-work hash the explorer indexes. The app now accepts only mined txpow ids (leading-zero PoW prefix) for explorer links. Until that exists, the send confirmation and transaction detail show "Pending confirmation" with no hash, not a dead explorer link.
- **Sending wallet now shows the correct, explorer-resolvable transaction id.** A send still surfaced the inner transaction id (a plain hash with no leading zeros) as the transaction id, so tapping it on the explorer returned "did not match any records", while the receiving wallet showed the right `txpowid`. The send response does not contain the mined `txpowid` yet, so the app no longer guesses a hash from it: an on-chain send now reads "Pending confirmation" until the node confirms it, then the confirmed history row (which carries the real `txpowid`) replaces the pending one with a working explorer link. The pending and confirmed rows are reconciled by the transaction id (or by amount, recipient, and time) so a single send never appears twice.
- **Transaction hash shows the real on-chain id and links to the explorer.** The send confirmation showed an internal value (the first 64-hex string in the node's response, often a coin id), not the transaction's `txpowid`. It now extracts the actual `txpowid`, labels it as pending until confirmed, and makes it a clickable link to the Minima explorer. Activity rows already carry the corrected `explorerTxId` for when the hash is surfaced there too.
- **Connect messages no longer reference a removed "Option 2".** Several node-connection status and error messages still pointed to "Option 2 in the Connect panel" from when the panel had two options; they now refer to the single Connect panel directly.
- **Dropdown menus are readable.** The recovery-depth selector showed muted text on a light grey background, which was hard to read. It now uses the app's standard dark dropdown styling, and the same dark option list and color scheme are applied to other native selects so their text stays legible.
- **Transaction history is pulled in after a recovery.** The recovery flow called a function that did not exist, so the recovered wallet's history was not imported. It now triggers the real node-transaction sync (the same one behind the Sync node transactions button and the on-connect auto-sync). Note the node must finish its MegaMMR resync before the full history is available.

---

### [0.0.0.2.17], 2026-06-12 (demo · published)

Demo build `0.0.0.2.17` published to GitHub Pages. The headline: a new way to use Stables in your browser, connect straight to your own Pure Minima node over RPC, with no MinimaOS install. This supersedes the earlier MDS-hub browser-connect from the unreleased window.

#### Added

- **Connect to your own Pure Minima node over RPC.** The Connect panel now links the web app directly to a Minima node you run, over RPC, with no MinimaOS install needed. Your keys never leave your node. Enable RPC on your node (`rpc enable:true`, no password), enter your node's RPC address, and connect with a blank password. It works the same against a clean Pure Minima core node or a full node, and both reads (balance, block height, activity) and sends go over RPC. The contextual StablesAgent help in the panel walks through enabling RPC and finding your RPC port with the `status` command (it is your node's port + 4).
- **Auto-reconnect after a refresh.** Once you have connected, the app restores the connection to your node automatically on the next page load, no need to re-enter the address.
- **Receive: choose and verify your receiving address.** The receive screen now has one editable address field. Type or paste any address you want to receive into, and the app checks with your node that the address belongs to your wallet before it shows the QR, so you never share an address that is not yours. The separate "check an address" tool is folded into this.

#### Changed

- **Native MINIMA shown with real precision.** Balances and amounts no longer round small MINIMA down to `0.00`. Native MINIMA shows up to six decimals with trailing zeros trimmed (for example `0.000611`); fiat-style stablecoins stay at two decimals.
- **Connect panel simplified.** One clear path: connect to your Pure Minima node. The RPC URL accepts an address with or without `http://` (added automatically). The copy is minimal, with the step-by-step detail moved into the contextual StablesAgent help (tap the agent icon at the top of the panel).

#### Removed

- **MinimaOS-install option removed from the Connect panel.** The in-app "install the .mds.zip in MinimaOS" step was removed from the connect window to keep it focused on connecting to your node. The download stays on the website's first page.

#### Fixed

- **No more duplicate "Sent" rows.** A send could appear twice (the optimistic row plus the node-history import of the same transaction). The optimistic row now uses the transaction's own node id, so the sync updates that single row instead of adding a second entry; existing duplicates are cleaned on the next sync.
- **Wallet activity ordered newest-first.** Rows now carry a real numeric timestamp and sort by it, so older or failed transactions no longer float to the top.
- **Incoming-payment notice fully visible on mobile.** The toast now wraps and caps its width, so the whole message shows on any screen.

---

### [0.0.0.2.10], 2026-06-09 (demo · published)

First v2 demo published to GitHub Pages (release commit `55b2efb`). `dapp.conf` / `APP_BUILD_VERSION` line is `0.0.0.2`, build iteration `10`; homepage Download button and `latestPublishedVersion` are now `0.0.0.2.10`.

#### Added

- **Live block-confirmation counter under each transaction amount.** Each on-chain MINIMA transaction shows a small `x/target` confirmation count directly under the amount, in Recent activity, the My transactions list, and the transaction detail. `0/3` (amber) while still in the mempool, `1/3`/`2/3` (cyan) as blocks arrive, and a muted `3/3` once final (capped at the target). The target is user-settable in Settings → Wallet addresses ("Confirmations to finalise", **1–30**, default 3) and persists. Counters refresh automatically on every new block.
- **Exchange: type the exact amount you want to receive.** The Exchange RECEIVE box is no longer read-only, enter a target amount in the receive currency (e.g. an exact number of EURw) and the SEND amount is back-calculated from the rate (`calcRateReverse`). Typing in SEND still computes RECEIVE as before; the two never fight (programmatic value sets don't retrigger each other). Reviewed the rest of the app: the only other read-only inputs are the merchant webhook URL/secret previews, which are display-only by design.
- **Agent welcome shows the live version.** The StablesAgent welcome bubble hardcoded `(v0.0.0.1.0)`; it now uses a `{{APP_VERSION}}` token resolved at render time to the current build label (same as the top-bar pill, e.g. `v0.0.0.2.04`), via a shared `stablesBuildLabel()` helper, so it always matches the running build.
- **Feedback "Demo roadmap" updated to the current dev build.** The badge now reads the live `APP_BUILD_VERSION` (Demo v0.0.0.2.0), and the review focus reflects the live native MINIMA wallet (send/receive, QR, instant incoming detection, auto-updating history + refresh, new-address and address-check tools) plus currency ranking.
- **Loading indicator for transaction history.** While node history is being pulled, the Recent activity section and My transactions list show a spinning "Loading transaction history…" indicator instead of appearing empty. When there genuinely are no transactions, they show a clear empty state ("No recent activity yet." / "No transactions yet." / "No transactions match your filters.") instead of a blank area.
- **Refresh button on My transactions and Recent activity.** Both the "My transactions" page (Filters & history header) and the wallet "Recent activity" section now have a ⟳ refresh button that re-pulls node transaction history and re-renders both lists. It spins while syncing; with no node session it simply re-renders the local activity.
- **Receive: "+ New address" now generates a real node address.** For native Minima, the button calls the node's `getaddress` (a fresh address from your default key set that the node and the Minima wallet both track and recognise), then updates the address box, QR, and copy target with it (and refreshes the incoming-detection address set). It deliberately does not use `newaddress`, which creates a key the wallet's standard address list does not show. Previously the button only displayed a message pointing users to another app. Falls back to a clear "connect your node" message when no node is connected.
- **Receive: check an address belongs to this wallet.** A collapsible "Check an address belongs to this wallet" block under the Receive buttons accepts an Mx… or 0x… address and confirms whether the connected node owns it. Ownership is taken from the node's authoritative `checkaddress` `relevant` flag (matching against keys/coins is only a fallback for node versions that do not return it), so addresses the wallet owns but has never received coins on are correctly recognised.
- **"Incoming, not yet in your total" indicator.** When an incoming MINIMA payment is detected on the network but not yet confirmed, a small amber line under the hero balance shows the pending amount (e.g. "Incoming +202,985.00 MINIMA, not yet in your total"), so it is clear the balance does not include it yet. It clears automatically once the payment confirms and the total updates, sums multiple pending receipts, and respects the hide-amounts toggle.
- **Live transactions and instant incoming detection (matches the Minima wallet).** The MDS event stream is now handled directly instead of relying only on polling and manual sync. On `NEWBALANCE` the wallet balance and node transaction history refresh automatically; on `NEWBLOCK` the block height updates immediately; and on `NEWTXPOW` an incoming MINIMA payment is detected as soon as it reaches the node, **before it is confirmed in a block**. An incoming payment to one of your addresses (where you are not the sender) shows an instant "Incoming … MINIMA detected, awaiting confirmation" notification and a Pending row in My transactions and wallet recent activity. When the transaction confirms, the same row (keyed by its txpow id) flips to Confirmed via the history sync. Adds a cached wallet-address set (from `keys` + `coins`) for fast matching.
- **Rank the selected currency anywhere.** The main currency is no longer pinned to the top of the wallet list. It now appears as a highlighted row inline and can be dragged to any position in the ranking (in currencies edit mode), with selection decoupled from order. The top BALANCE card still follows the selected currency. In edit mode, **drag a row to reorder it** and **tap a row to set it as the main currency**; the ★ is a non-blocking indicator (it no longer sits in the grab path), so grabbing a currency moves it instead of selecting it. The ★ in the currency actions modal still sets the main currency too.

#### Changed

- **MAX is now a minimalistic "Available"-line link (MetaMask-style); all amount inputs are the same width.** The MAX control no longer sits inside the input row, it is a small text link (`.max-link`) on the "Available …" line. This fixes the Exchange, where the inline MAX made the Send box narrower than Receive, and is applied app-wide for consistency (Send, Exchange send, Coverage fund, Mint/Burn xWiniwa, Mint/Burn Wables, Create invoice, Liquidity-fund deposits). Every amount input now spans the full box width (with its selector where applicable).
- **All numeric / amount inputs are right-aligned.** New app-wide convention: number fields and decimal-entry fields (`input[type="number"]`, `input[inputmode="decimal"]`) align their value to the right of the box (banking style). Text fields (addresses, names, memos) are unaffected.

- **Build iteration also flows into `dapp.conf` and the in-app "App updates" label.** The MinimaOS install/update dialog reads `dapp.conf` `version` + `description`; both now carry the full iteration (e.g. `0.0.0.2.07`, with the version stamped into the description text) so the dialog shows the complete build, and the in-app Settings "Download Stables_…" label uses the same full label. The packager derives version, pill, zip name, and `dapp.conf` from a single `APP_BUILD_ITERATION` so they never drift.
- **Per-build iteration in the version pill and zip filename (no build confusion).** A dev build iteration (`APP_BUILD_ITERATION` in `runtime-config.js`) is shown as the trailing segment of the version, the top-bar pill reads e.g. **v0.0.0.2.01**, and the build is packaged as **`Stables_v0.0.0.2.01.mds.zip`** so each test build is uniquely identifiable both in-app and by filename. Bumped on every change during the testing line and reset to 1 when `APP_BUILD_VERSION` changes / a version is published.
- **Mint page restructured around a per-asset Mint/Burn toggle.** The top tabs are now **xWiniwa** and **Wables** (was "Mint xWiniwa" / "Mint Wables"). Within each, a **Mint | Burn** segmented toggle (same style as the tabs) switches one shared, consistent control block, Available + MAX line, amount input, currency selector (Wables), and the action button, instead of stacking a separate Burn section below Mint. xWiniwa and Wables use identical layout/logic; the xWiniwa leverage chart stays under the Mint view. On/Off Ramp deep-links open the right mode automatically. Existing mint/burn calc and execute logic is unchanged.
- **No native number-spinner arrows on any input.** The grey up/down stepper arrows on number inputs were only suppressed for `.finput` fields, so other number inputs (e.g. the Exchange "New conversion" Send amount, which uses `ex-input`) still showed them. The spinner-hide rule is now global (`input[type="number"]`), removing the arrows from every input box app-wide.
- **Centered confirmation toasts dismiss on click-outside / Escape.** The modal-like centered toasts (e.g. the "Added 10,000 demo Winiwa" faucet confirmation, "Connected to your node") now close when you click outside the box or press Escape, instead of only auto-dismissing on a timer. Clicks inside the toast (e.g. the "Mint xWiniwa & Wables" button) still work.
- **Invest (Coverage fund), action first.** The "Deposit or withdraw" block now sits at the top of the Coverage fund tab (the action we want users to take), with the summary, performance charts, historical view, and fund composition below it as decision-support. The deposit panel gets a slightly stronger cyan accent to read as the primary action.
- **One canonical amount control across the whole app.** Every amount-entry surface now uses the same pattern as the Send modal: an "Available … / MAX" line, then a row with the amount input and a single shared currency selector (`ex-ccy-dd--wide`). Applied to Coverage fund deposit/withdraw, Mint Wables, Burn Wables, Create invoice, and the Liquidity-fund selector (Send and Receive already used it). No more per-screen variants (compact/field widths, selector-on-its-own-row, or MAX in different places). Single-currency inputs without a choice (Mint/Burn xWiniwa) keep their input + MAX but are not given a fake selector.
- **Website download button is now version-driven.** The homepage and Links demo-launch modal button replaces the static "Install on MinimaOS" label with "Download v0.0.0.1.0". Both the label and the package link are generated from a single published-version source (`website/assets/site-download-version.js`), so future version bumps update every Download button in one place.
- **Opened the v0.0.0.2.0 demo development line.** Bumped `dapp.conf` `version` and `runtime-config.js` `APP_BUILD_VERSION` to `0.0.0.2.0` and `APP_BUILD_DATE` to `2026-06-07`. `latestPublishedVersion` and the download link remain `0.0.0.1.0` (no new package published yet).

#### Fixed

- **Clear guidance when sending fails on the read-only web connection.** A browser connecting to a node's MDS cross-origin is read-only by Minima's design, so the node refuses WRITE commands (`send`) with "Public MDS cannot run WRITE commands". Instead of dumping that raw node error, the Send modal now shows an actionable notice, read-only web connection; open Stables from your MinimaOS hub (write access) to send; viewing balances and receiving still work, and keeps the notice visible on later send attempts. (Platform constraint, not an app bug; sending requires the MinimaOS-installed app.)
- **Investment "Portfolio summary" valued Winiwa at 1:1 with USDw.** The summary called the rate helper with `'WINIWA'`, but the currency normalizer only mapped `MINIMA`/`WINIMA` → `Winiwa`, so `'WINIWA'` fell through to a default rate of 1, showing e.g. 9,666.78 Winiwa as 9,666.78 USDw instead of ~76.6 USDw at the live Winiwa price. The caller now passes `'Winiwa'`, and the normalizer also accepts `'WINIWA'` so it can't silently fall through again. (xWiniwa was already correct.)
- **Currency popup buttons fit on mobile.** In the per-currency popup (tap a currency in the wallet), the Send and Receive buttons overflowed on narrow screens (Receive was cut off). They now use an even two-column grid that shrinks to fit, with Exchange full-width below.
- **No misleading first-paint flashes (version pill + balance).** The top-bar version pill and the balance hero had stale hardcoded placeholders baked into the HTML (`v0.0.0.1.0` and `3,450.75`) that flashed for a moment on load before the JS set the real values, making a fresh/connected v2 wallet briefly look like the old build with a fake balance. They now start neutral (empty version, `0.00` balance), so nothing wrong is shown before hydration.
- **A new wallet no longer shows the previous wallet's transactions.** Node-synced activity is stored locally per MiniDapp install, so using the demo with a different wallet (different seed) on the same install showed the old wallet's history. Activity is now bound to the wallet's own addresses: when a sync detects an address set with no overlap with the stored owner (a different wallet), the stored activity is cleared before importing, so each wallet only shows its own transactions.
- **Currency dropdowns open on-screen now (real root cause).** The dropdown panel uses `position: fixed`, but the glassmorphic cards (`backdrop-filter`) create a containing block that traps fixed positioning, so the panel was being placed ~250px too low, below the viewport, making it look like the selector "didn't open" (most visible on Mint Wables / Coverage fund / Invoice, which sit inside glass cards; Send/Receive were fine because they're in modals). The panel is now portaled to `<body>` while open so `fixed` is relative to the viewport, and restored to its original place on close. Verified headless: the panel opens directly under the button, fully on-screen, rows clickable, selection applies. (This was compounded by the agent drawer auto-opening over the controls, fixed separately.)
- **Changing the language no longer pops up the old welcome.** Selecting a language from the side menu showed the "language coming soon" notice and then unconditionally re-opened the first-run welcome setup modal. It now only returns to the welcome if the language was changed from inside the welcome flow; changing it from the side menu just shows the notice and closes.
- **Currency selectors (and other right-column controls) no longer blocked by the agent drawer.** The StablesAgent drawer was auto-opening on load; its full backdrop + opaque 360px right-side panel sit on top of controls like the Mint Wables / Coverage fund currency selector, so clicks landed on the drawer and nothing happened. The drawer **no longer auto-opens**, it stays available from the floating agent button (with its attention badge), and first-run onboarding is handled by the centered, click-outside-dismissible welcome modal. Verified end-to-end with a headless click test: on load the drawer stays closed and the selector opens on a real click.
- **Hard refresh now resets the faucet cooldown too.** The hard-reload demo reset wiped balances (Winiwa, Wables, exchange history, activity) but left the Winiwa faucet cooldown timer running, leaving the user at 0 Winiwa yet still locked out of the faucet. The reset now also clears the faucet cooldown so Winiwa can be claimed again immediately.
- **Feedback sending failed with "Connection refused: getsockopt" on a connected node.** When the demo ran on a localhost origin with a Minima node connected, the feedback POST used the local test URL `http://127.0.0.1:8788/api/feedback`, but it is sent via `MDS.net.POST` which runs on the node, so `127.0.0.1` resolved to the node's own loopback (nothing listening). The local test server is now used only for genuine local browser dev with no node session; when a node is connected the POST goes to the public feedback API (`agent.stablescouncil.org/api/feedback`).
- **Minima sendable / locked split now shows when Minima is the main currency.** Previously the "Sendable X · Locked Y" breakdown only appeared on the secondary Minima row and was lost once Minima was selected as the primary currency. The primary wallet card now carries the same live-node breakdown.

---

## [0.0.0.1.0] - 2026-06-01 (demo first drop)

First public release of the **demo** channel. Forked from showcase v0.0.0.0.3. Stage: **demo**, folder: `dapp/2-demo/`.

### Added

- **3-way welcome split:** the StablesAgent welcome opens with one short paragraph (native Minima send/receive is real on-chain, the QR scanner works) and three clear paths: **What works right now** (functionalities), **Set up my bank** (personalization), and **Explore the app** (topic paths).
- **Functionalities path:** guided path highlighting live native Minima send/receive and the QR scanner (Receive shows your QR, Send scans a code to fill the address).
- **StablesAgent dialog timeline:** first-run guidance, section-level context prompts, guided-tour entry points, and the Vault-key safety warning live inside the StablesAgent drawer as local scripted messages. The dialog keeps a single chronological session thread, shows welcome before the Vault-key checkpoint, keeps the input composer available during local flows, uses persistent welcome completion state, shows unread/warning badges on the main agent icon, and only calls the live agent when the user asks a real question.
- **StablesAgent personalisation setup tour:** currency and bank-personalisation guidance as an agent-driven setup tour. The drawer keeps the session active while opening My profile and Contacts for currency choice, bank name, profile picture, contact onboarding, and contact review.
- **Set up my shop (brand + locations model):** a merchant builds one **Brand** (name, category, specialities, description, email, website, languages) plus a list of **Locations**, each with its own address, hours, phone, delivery toggle, Merchant Cash Exchange opt-in, and its own receive address (one address per shop, with the option to consolidate).
- **Auto-detected links:** blank "add a link" inputs that detect the platform from the pasted URL (X, Instagram, Facebook, TikTok, YouTube, WhatsApp, Telegram, LinkedIn, Google Business, Moltbook) for the right icon on the merchant page.
- **Onboard a client shop (Ambassador side):** an ambassador can build a client's full profile and record a mentored 15 Big Mac listing, including a "Start from the shop's code" entry.
- **Secure "let my ambassador set up my shop" grant:** the merchant mints a one-time encrypted onboarding grant (framed as a signed Minima coin delivered over Maxima end-to-end encryption, the shop only goes live after the merchant's own signature), with copy/revoke. The ambassador enters it on their side.
- **Merchant section** moved to the top of **My shop** as the first item (Merchant functionalities on/off). The explainer lives in the StablesAgent button.
- **Council member profile** section gained a contextual StablesAgent button and explainer.
- **Currencies to display:** Coverage Fund tokens toggle (cfUSDs, cfEURs, etc.), alphabetical ordering, Select all / Unselect all controls, and a Primary currency selector that stays in sync with the enabled currencies and persists across reloads.
- **Wallet: Winiwa (test) vs Minima (on-chain):** two separate list rows and send/receive currencies. Winiwa (test) = faucet, mint xWiniwa, demo send. Minima (on-chain) = native balance from MDS (not stored in demo wallet JSON). Send with Minima uses `send` on the node when Node live. Receive with Minima loads your address via MDS `getaddress` when live. Demo Exchange includes Minima alongside Winiwa.
- **On-chain MINIMA send:** with MDS active and Node live, Send with currency Minima runs the node `send` command, then refreshes balance from MDS. Winiwa and other currencies stay demo (local wallet simulation). A result modal shows the outcome. MiniMask sends are marked as approval-needed until the extension approves, so the app no longer presents pending approval as already sent.
- **Wallet: Vietnamese dong (VNDw):** full demo integration across wallet row, exchange, vault dropdowns, settings, display pill (Viet flag + dong icon), rate anchoring (~25,000 VND per 1 USDw), zero-decimal formatting, liability risk profile, and coverage fund composition.
- **TRYw currency:** Turkish lira available in welcome currency choices, wallet display settings, currency visuals, exchange/mint dropdown lists, and static demo conversion metadata.
- **Native MINIMA token visual:** wallet currency tags, pills, and primary card now use the Minima Explorer favicon. Custom icon mode still overrides per-currency uploads.
- **Native MINIMA receive: Mx vs 0x:** Receive defaults to Mx format when the node provides it. Settings, Appearance, Native MINIMA receive format switches to 0x hex. Send and QR accept both Mx and 0x.
- **Receive modal QR:** scannable QR code from receive currency, optional amount, and address. Minima encodes full Mx plus optional amount when Node live. Inline QR is ~248 px black on white. Tap the QR opens a larger ~320 px overlay with tips for phone cameras.
- **Scan to Pay camera:** opens the camera automatically and scans QR codes using `BarcodeDetector` (with `jsQR` fallback). Falls back from rear camera to webcam/front, then generic video constraints, so laptop webcams can scan a QR shown on a phone. Multi-pass decode (full-frame, centered crops, high-contrast threshold) improves tolerance. Android permission hints and timeouts prevent the modal from getting stuck on "Starting camera."
- **Connect node modal:** install `Stables_v0.0.0.1.0.mds.zip` in MinimaOS (Option 1, labelled "Add Stables to your Minima OS"), or use the MiniMask browser wallet extension for native MINIMA balance, receive, QR, and send without installing Stables in MinimaOS. Accepts a full MinimaOS Hub URL in one connection box. Backdrop click closes the modal.
- **Connect node on launch:** when the page is not opened from the MiniDapp hub, the Connect node modal can open automatically (configurable in `runtime-config.js`). Saved host in localStorage is applied before MDS.init on localhost, GitHub Pages, and other static hosts.
- **Node connection trust cues:** Node live (green) only after the node answers status or balance. Until then the pill shows MDS starting (amber). The Minima currency row is unhidden when the node is live so on-chain MINIMA is visible without Show more.
- **MiniDapp hub auto-connect:** `index.html` includes `assets/lib/mds.js` so the hub does not need to inject a global MDS. On http/https with a real hostname, MDS.init runs automatically. `file://` origins still use Connect node.
- **MDS origin notice:** when MDS cannot auto-connect (file://, missing mds.js, or wrong origin), an amber dismissible popup explains next steps and offers Open Connect node.
- **MiniMask readiness split:** MiniMask network reachability and wallet readiness are separate states. A MEG block height shows the network is reachable, but native MINIMA balance, receive, QR, and send require a real MiniMask account address before the app treats the wallet as connected.
- **Send / Receive minimal Minima path:** Send and Receive are Minima-only for this demo cycle. Other currencies remain visible in the selector as grey "Soon" rows.
- **Send MINIMA recipient parsing:** invisible Unicode characters (zero-width, BOM, non-breaking space) are stripped from pasted Mx addresses so Android no longer rejects valid pastes.
- **Receive tap-to-copy:** default demo address is full-length Mx + 64 hex. Tap to copy always copies the full address even when the visible text is truncated.
- **Demo contacts start empty:** real demo mode no longer seeds showcase contacts or favourite quick-send chips. Contacts start from the user's saved contacts only.
- **My transactions placement + sync:** My transactions now appears under Merchants and Exchange below My shop. Sync node transactions imports available MinimaOS history rows for node-listed tokens.
- **Activity filters:** My transactions supports timeframe (Today, This week, This month, This year), relative period (Last 7d, 30d, 90d, 365d), and explicit date-from/date-to fields in addition to direction/currency filters.
- **Wallet recent activity:** recent rows are sorted by parsed transaction time so new Exchange activity surfaces on the wallet home screen.
- **Winiwa faucet cooldown:** Get 10,000 Winiwa can be claimed at most once per hour. The faucet button shows a live "Available in ..." countdown. Reset demo balances clears the cooldown.
- **Coverage fund truth copy:** mechanics note explaining the junior/first-loss role, cf-token fee-value role, xMinima fee boundary, and which Coverage fund values are illustrative in the demo.
- **On/Off Ramp structure:** the page now leads with the merchant-first cash exchange direction (find a nearby trusted merchant or use a DIY community exchange). The existing MINIMA/exchange/bridge path is kept as the second route.
- **In-app links:** All links now includes the official public links page, onion resilience page, onion mirror address, and communication plan.
- **Make my bank look mine:** Settings includes a coming-soon personalisation scaffold directly after App updates, with theme examples, future free customisation/community sharing scope, creator credit, and a demo donation wallet placeholder.
- **Visible roadmap:** Feedback opens with a compact Demo roadmap block showing what to review now, which feedback types are coming soon, and the next module direction.
- **Release review package:** `DEMO_RELEASE_REVIEW_PACKAGE.md` with build link, change summary, review focus, known limits, feedback ask, and next step. Council communications includes a review-package notice.
- **Help, The Stables Academy:** security questionnaire (10 random questions, 3 options, mandatory gate, minimum 6/10), retake cooldown, best score kept, optional demographics, anonymised public-DB consent, certificate and share. One question at a time with choice to show correctness after each answer or only at the end. Other topics listed as coming soon.
- **Button role system:** cross-surface button taxonomy (btn-primary, btn-choice, btn-secondary, btn-danger, btn-disabled, btn-link-action) applied across all demo surfaces. All former ad-hoc ghost-class usage replaced by role classes.
- **Social link previews (X / Discord / others):** Open Graph and Twitter Card meta with canonical URL, site brand header preview image, and @StablesCouncil attribution.

### Changed

- **StablesAgent welcome flow:** the first welcome message includes Demo-channel and live Minima-node scope, opens the agent drawer automatically on first app access, and presents the guided welcome tour before the exploration-path question. Completing the setup tour returns users to the path choice. Bare public links in agent messages render as clickable external links.
- **StablesAgent scroll and refresh:** reopening the agent preserves the current timeline position. Each fresh app load resets the welcome-read flag so the welcome series restarts, while in-app navigation keeps the current dialog state.
- **StablesAgent live-agent handoff:** user questions show a visible working indicator and "Requesting StablesAgent..." while making one live request attempt. If StablesAgent is unavailable or times out, a clearly labelled local generated answer is shown. The question language is detected and the model is instructed to answer in that language, preventing language drift. The drawer input blurs its caret while a request is pending.
- **StablesAgent:** opening the agent uses the in-app drawer only (no external tab). Unicode dash variants are normalised before display.
- **Dead-end-proof agent flow:** every path handoff, guided-tour stop, vault-key outcome, and setup-tour finish returns the user to a tour-options menu (Explore another topic, Set up my bank, the tour stops, and "I'm done, let me explore"). The composer is always available.
- **Personalisation tour shortened:** removed the Profile picture and Contacts steps (not relevant at this stage). The My bank step covers name and optional picture.
- **Profile page restructure:** My profile page is split into two independent sections. My bank (first): bank name, bank picture, and top bar identity mode (Use my settings / Use default). Council member (second): council name, role, council avatar, NFT contract and token ID. Each section has its own save and "Saved on this device only." footer. Top bar name and avatar read from bank settings, with council avatar as fallback.
- **Currencies to display** is the first section on the My profile page and renamed accordingly.
- **Welcome modal (first open):** copy reframed for the demo channel, covering progress since the showcase preview, what is possible to try (including node-linked MINIMA where applicable), and what is still out of scope (illustrative demo stables, no finished product claim, agent limits, write mode). "Click outside the box..." hint moved above the Stables logo so it is visible first.
- **Welcome neutral choices:** Continue personalisation and I'll do that later use the same secondary button treatment, aligned with the visual-quality rule that equal-choice actions must look equal.
- **Channel truth note:** the top bar Showcase/Demo selector includes a compact truth note. Showcase is synthetic. Demo uses node-linked native MINIMA only where the UI says Node live. Winiwa, Wables, and other Stables balances remain no-value demo balances.
- **Demo onboarding message:** the first welcome notice states that the demo can be installed on a Minima node from `Stables_v0.0.0.1.0.mds.zip`, that it already works as a simple native MINIMA wallet for receive/send when Node live, and that mint/burn testing uses demo-only Winiwa and Wables.
- **`/dapp/` web hub now lands on the demo channel** (was showcase).
- **Top bar channel switch:** the centre pill opens a channel selector to switch between Showcase and Demo directly from the wallet top bar. The pill uses a shorter human-facing display version (v0.0.0.1 style).
- **Top bar node status:** Connect node and the separate block height pill are merged into one control: status dot (red/amber/green) + label (Connect, MDS starting, MDS issue, or live block height). Still opens Connect node on tap.
- **Version display cleanup:** visible app-version labels use the short human-facing format (v0.0.0.1 style) in the top bar, Settings, and Council communications. Package download label shows `Stables_v0.0.0.1.0.mds.zip`. Settings points to the direct raw GitHub download URL.
- **Latest package mirror:** root `dapp/latest-version/` mirrors the current demo package as `Stables_v0.0.0.1.0.mds.zip`, while showcase remains under `dapp/1-showcase/latest-version/`.
- **Browser tab titles:** demo pages use short, consistent "Page, Stables" titles so the active page remains readable in narrow browser tabs.
- **Wallet hero:** removed the extra Minima/MINIMA amount line between the principal equivalent and Send/Receive (balances stay in Currencies).
- **Vault currency dropdowns (one shared UI):** Exchange, Mint Wables issue/reclaim, invoice currency, Send/Receive modals, coverage fund deposit, and LP quote currency all use the same custom list with code + live balance, cyan-accent panel, active row highlight, and no visible scrollbar.
- **Currency dropdown visibility:** shared dropdown panels position on a fixed layer, size to the viewport, and can open upward when there is not enough room below, reducing clipping in modals and card sections.
- **Real on-chain wallet mode:** demo wallet keeps the full currency list, welcome pills, Winiwa/Mint, and Exchange flows. No seeded demo activity or demo exchange list. Activity only appends rows for native MINIMA sends and Exchange now conversions. Protocol simulator globals start at zero. Minima activity detail links to the explorer when a txid is parsed.
- **Wables/fiat-stable tickers (demo):** UI labels for codes matching the Wables pattern (e.g. USDw, EURw) append "(test)" across settings pills, welcome currency step, primary currency options, vault dropdowns, exchange rate pill, mint/burn calc lines, and activity currency filters.
- **Get Winiwa:** single Get 10,000 Winiwa control (amount dropdown removed). Consistent disclaimer that Winiwa and Stables minted in this app have no monetary value.
- **Faucet and Mint copy:** clarifies demo/test boundaries for Winiwa, xWiniwa, and Wables. Mint intro separates the current demo UI from the planned test phase. Faucet copy points to Get Winiwa instead of implying users acquire MINIMA.
- **Native MINIMA balance clarity:** node-linked MINIMA treats sendable MINIMA as the spendable balance and shows locked MINIMA separately when the node balance response exposes that split.
- **Protocol stress copy:** Mint simulator CR stress messaging presents CR as visible stress information with market depth and participant rebalancing, instead of implying minting is locked at a threshold.
- **Coverage fund summary:** the Coverage fund tab starts with current fund size, accumulated historical fees, and annualised historical return before the charts.
- **Coverage fund naming:** visible labels consistently use Coverage fund. Chart wording uses Fund assets where the metric refers to the fund's asset value.
- **MINIMA/Winiwa spot (live):** wallet, exchange, and invest equivalents for Winiwa, MINIMA, and xWiniwa track live spot price from MEXC (via MDS.net.GET) or CoinGecko as a fallback for static/GitHub Pages demos.
- **Receive modal:** Add tip and Open merchant checkout (invoice) only show when Merchant is on under Settings, Appearance.
- **Send modal copy:** trimmed so the first message is clearer and shorter: users can send and receive Minima in this demo version.
- **Welcome copy cleanup:** first welcome notice uses short version labels, links directly to the downloadable `.mds.zip`, and keeps the write-mode requirement concise.
- **Community links (Discord):** More, Community, Legal and notices Discord invite updated to canonical link.
- **Repo layout:** `prod_stables_app_demo/` moved to archive. `dapp/2-demo/` is the only active demo path.
- **Charter:** Council and Legal add visible copy on the GitHub charter buttons that the first charter draft will be on GitHub over the coming weeks.
- **Website presentation uplift:** the website home page carries a tighter operating-loop story linking self-custody, merchant payments, local circulation, and visible risk surfaces before the investor section.
- **Help, Stables Academy:** subtitle under the page title now reads "Questionnaires, score tracking, certificates."
- **Stables Academy Security flow:** one question at a time. Demographics and consent after the knowledge questions. Choice to show correctness after each answer or only at the end.
- **Welcome tour (person path):** button label says "what I'll be able to do with my bank" (aligned with Be your bank wording).
- **My shop is always accessible:** opening My shop from More no longer requires Merchant mode first (the Merchant on/off toggle lives at the top of that page, so the page must open to reach it). Shop tools below the toggle stay gated until Merchant is on.
- **Scanner feedback:** an "Opening camera..." spinner shows while the live camera is acquired, and a "Reading QR code..." spinner shows while a chosen photo is decoded.
- **Connect-node certificate note:** now reads "Make sure your node is running and accept your node's certificate."
- **Top bar channel selector:** the Showcase entry carries a "Superseded" badge so users know the demo is the current channel.

### Fixed

- **Profile form not rendering:** the merchant profile form now always mounts when My shop opens.
- **Primary currency** dropdown includes Minima and Winiwa, rebuilds on Select all / Unselect all, and persists the chosen primary.
- **Coverage Fund pill** no longer shows a doubled label.
- **Charter button** opens the "coming soon" modal instead of a dead GitHub link.
- **Wallet currency add control:** the wallet edit + control can now add xWiniwa.
- **Connect node + MDS issue (500):** when the node has `publicmds: false`, MDS may reject commands with `uid=0x00`. The Connect node modal accepts the Hub session uid from the MinimaOS URL.
- **mds.js Connect-node scheme:** for MDS.DEBUG_HOST with port 9003, mainhost/filehost now use HTTPS even when the page is file:// or http://, fixing sessions that previously never completed.
- **MDS.net before MDS.init:** spot price and other network code now use MDS.net only after mainhost is set, preventing 404 requests on the static dev server.
- **QR scanner on Android:** camera permission fallbacks and timeouts prevent the Scan to Pay modal from getting stuck on "Starting camera."
- **Minima is the default primary currency on first run.** A fresh install now lands on Minima as the primary (the wallet render path defaults to it when no preference has been saved); an explicit later choice is always respected.
- **Scan-to-pay address parsing:** scanning a Receive QR that carries an amount no longer glues the "Amount" line onto the address. The scanner extracts the address and amount separately, the address stays clean, and the amount auto-fills the amount field.
- **Live camera on a desktop node:** the QR scanner now uses the live camera on a Minima node opened in a desktop browser (it previously skipped straight to the photo fallback on the hub origin). The `capture="environment"` photo fallback is kept for the Android MinimaOS WebView, where the live camera is blocked.
- Removed Unicode dash variants from demo-facing copy.

### Removed

- Duplicate "Currencies to display" heading inside the card.
- "Merchants on Stables" prose section on My shop (moved into the StablesAgent explainer).
- `latest-version/` and `latest version/` duplicate placeholder READMEs (moved to archive). Published demo `.mds.zip` builds use `build/README.md` and `2-demo/build/`.
- Seeded showcase contacts and favourite quick-send chips from demo mode.
- Receive explanatory copy, QR camera helper copy, receive address hint copy, equivalent divider text, and native number spinners from Send/Receive amount inputs.
- Extra Minima/MINIMA amount line from the wallet hero.
- Fee/demo-scope hint from under the Send amount area.
- Advanced browser-link option from the Connect node modal (installing Stables in MinimaOS is the reliable path).
- **"Connect automatically"** from the Connect node panel (it never reliably worked). The panel is now a single manual flow: accept the certificate, enter Node URL, enter Session UID, Connect.

---ge questions; choice to show correctness **after each answer** or **only at the end**.

---

## [00.00.02]  -  2026-04-02 (showcase published)

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

- **Invest scope correction:** removed the Maximize staking surface from Stables scope. MINIMA is presented for Stables/xWiniwa minting and explicitly labelled native wallet use, not as a Stables staking product.
- **Mint xWiniwa**: chart **below** the Mint xWiniwa button: **three** traces  -  **Winiwa · USD** (spot), **xWiniwa · USD** (spot × leverage), **Leverage** (right axis from **CR% / (CR% − 100%)**, e.g. 130% → 130/30); historical leg interpolates **`CR_HIST_DATA`** with **today** = live `#protocolCRBig`; **Current leverage** row + `SIM_XWM` / mint math use same formula. ~365d CoinGecko Winiwa spot; hover/touch tooltip; tighter margins, taller plot.
- **Welcome → currencies/personalisation**: **Unselect all** next to **Select all**; **Save and continue** into optional personalisation (**Step 1–4 of 4**: bank name, profile picture, contacts onboarding, directory preview); **Finish** saves council profile (name + avatar when set) and closes welcome. Bank-name copy clarifies **private vs on transactions**, changeable anytime in **My profile**.
- **Branding**: MiniDapp **headline** / page **title** / default top bar tagline **By Stables on Minima** (replaces “Be your bank” in those places). **Top bar** shows **My profile** picture and display name (or welcome bank name) when set; when the title is **personalised** (not the default **Stables** wordmark), the subtitle switches to **by Stables/Minima**. **Brand hover**: custom panel (cyan–purple gradient text, dark frame) **“My bank made possible by Stables on Minima”** replaces the old **Home** `title` tooltip; keyboard focus shows the same panel. **Touch (`hover: none`)**: tap the **tagline** to toggle that panel; tap the tooltip, outside the bar, or the logo/title row to dismiss / go home. Center pill **Showcase · v…** tracks **`APP_BUILD_VERSION`** from `runtime-config.js` (currently **00.00.02**).
- **Legal & notices**: **Minima dependencies** section (foundation + corporate independence + open networks + **unstoppable** framing + non-custodial seizure/blocking; not legal advice).
- **Amount inputs**: **Available** balance for the relevant asset next to **Exchange** (send + receive balance hint), **Send** / **Receive** modals, **Create invoice**, **Coverage fund** deposit amount, **Burn Wables** (per selected stable); **MAX** fills the field from that balance (where it already existed for mint / LP, unchanged). Labels refresh with **global UI** and currency changes.
- **Send / Receive modals**: currency **dropdown options** show **each enabled wallet currency with its balance** (`Code · amount`, tabular numbers, wider select). Refreshes whenever the wallet UI syncs.

---

## [0.01.01]  -  2026-03-31 (frozen)

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
