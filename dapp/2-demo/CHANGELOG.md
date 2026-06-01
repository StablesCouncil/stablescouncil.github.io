# Changelog  -  Stables MiniDapp

**Purpose:** Every change worth telling users, Council, or social channels gets a line here **when you merge the change** into this version. At release, copy the section for that version into release notes, Telegram, and X.

**Format:** [Keep a Changelog](https://keepachangelog.com/) style. Use **Added**, **Changed**, **Fixed**, **Removed**, **Security** as needed. Dates in ISO (`YYYY-MM-DD`).

---

### [Unreleased]

_No unreleased changes yet._

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
