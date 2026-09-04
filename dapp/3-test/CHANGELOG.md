# Changelog

## [Unreleased]

## [0.0.11.53] - 2026-09-04

Iterations 40 to 53 of 2026-09-04, released together as the standalone Android app v0.0.11.53.

### Changed
- **How you confirm a protected send is two setting rows, both always on screen.** The biometrics
  control was a checkbox under the payment-code button, rendered only once a code existed and never
  on a device without the native bridge, so a person who had not set a code could not learn that
  fingerprint or face was on offer (founder 2026-09-04: "present the option to set a biometric
  confirmation much more obviously, now it is hidden"). The Payment protection card now carries a
  titled block, "How you confirm a protected send", with a **Payment code** row (Set / Change) and a
  **Fingerprint or face** row, each in the app's settings-row shape (title and copy leading, control
  trailing). The biometrics row is live when the device can do it and a code exists; otherwise it is
  disabled with copy naming which of the two is missing ("Set a payment code first", "Not set up on
  this phone", "Not available on this device"). Nothing is hidden.
- **Commas for thousands, everywhere, inputs included** (founder 2026-09-04). Figures that were
  rendered straight from `toFixed` or a raw number are grouped: the Wallet management notes total
  (`6755.563` was the founder's screenshot), the order-book tables and stats, the exchange lines and
  price-impact confirmation, the sweep activity note, the tx mirror's "For N Winiwa" notes, the
  council sales list. Amount inputs still typed `number` cannot show a separator at all, so the
  three payment-protection thresholds, the confirmation-policy amounts, the exchange pair, the order
  ticket, liquidity deposits, the coverage fund amount, the invoice amount and the recovery key-uses
  move onto the existing `data-financial-amount` grouper, and every reader of theirs strips the
  comma back out (`Number("1,000")` is `NaN`, `parseInt("1,000")` is `1`). Values written into
  those fields by code (MAX fills, exchange calculation, settings render) are grouped on write via
  `stablesGroupAmountInput` / `tv81GroupField`.

### Changed
- **The release-profile refusal names the product.** `stablesReleaseRefuse` said "... is not included
  in the xWiniwa core test release." It now says "... is not part of this Stables test release."
  (founder 2026-09-04: do not use the "xWiniwa core test" wording anywhere). The internal profile
  id `xwiniwa-core` is an identifier and is never shown.

### Fixed
- **Payment progress shows a time beside every step it watched, and how long the current step has
  run.** The stepper already had a timing store, keyed on `p.txid || p.pendingTxnId || p.rowId`.
  During a live send those identifiers arrive one after another, so the key changed twice in flight
  and each change read as first sight of a new transaction, which by design stamps already-done
  steps as unknown: no time beside anything (founder 2026-09-04, old phone). The activity row id is
  the one name that holds for the whole flight, so `stablesStepTimes` now takes the names in that
  order, re-homes a record found under an alias instead of forgetting it, and stamps `built` from
  the row's own timestamp on first sight (the one moment any transaction can honestly be timed
  from). The active step shows elapsed time in the same slot, measured from the last finished step,
  via `stablesStepElapsedHtml`; the modal already re-renders every 1.5 s.
- **"Relaying to the network" is no longer said on hope.** The node's `status` reports its peer
  count and the app never looked. `stablesRecordNodeTipTime` now records `network.connected` as
  `__STABLES_LIVE_NODE.peers`; the Broadcasting step (`stablesRelaySubText`) says when the bank has
  no peers, or is still catching up, instead of spinning; the Settings network line says "Alone"
  with zero peers and otherwise how many nodes it is connected to; the fingerprint carries `peers`.

### Fixed
- **A faucet claim the node can still see is never called "failed".** The founder's phone showed the
  pour row marked `failed` and, directly beneath it, a second row for the SAME claim reading
  `receiving  +1,000.00 Winiwa`. That second row is written by the tx mirror, and its wording is
  literal: `ladder(found:false)` writes "Seen by your Minima node - waiting for a block". So the node
  was holding the transaction while the app was calling it failed. The cause is
  `pollMinedFaucetTxpow`, which scanned node history against a fixed **180 s** deadline; a node that
  has just resynced, or is thinly peered, needs longer than three blocks' worth of patience. A
  deadline passing is the app running out of patience, never evidence that a transaction failed.
  `markFaucetClaimNotConfirmedRow` now carries a second guard alongside the awaiting-approval one:
  if `faucetClaimSeenByNode` finds a live incoming Winiwa row for this claim's amount inside the
  hour, the row stays `Pending` with "Your node has the claim and is waiting for a block", and the
  faucet card reads "Faucet claim on its way" instead of "not confirmed". `Pending` ranks below the
  mirror's `Receiving`, so the two rows now merge into one instead of contradicting each other on
  screen.
- **A failed claim gives the hour back.** The 1 h countdown is stamped into `localStorage` the moment
  the claim is posted, and nothing ever cleared it, so a claim that failed locked the person out for
  an hour over a transaction that never happened (founder: "when it's the case the countdown should
  be reset"). New `stablesResetFaucetWiniwaCooldown()` sweeps every stamp under the claim-key prefix
  (the stamp is written under a per-wallet suffixed key, and the suffix in memory may not be the one
  that was written) and re-renders the button, and the genuine-failure path calls it. The on-chain
  source needed no change: `stablesGetOnChainLastFaucetClaimTs` already ignores failed rows.

### Changed
- **Faucet settlement poll budget 180 s to 600 s.** Minima blocks are ~50 s and the claim's own
  completion target is 3 blocks, so the old budget left no margin for a node catching up.

### v0.0.11.49 - The hide-amounts control really disappears

- Founder 2026-09-04, second report: "even here the eye is covering the text". v0.0.11.48 marked
  the control hidden and it carried on rendering.
- The cause, measured rather than guessed: `[data-machinery-scope="wallet"] #balHideBtn` sets
  `display: grid !important`, and an id with `!important` outranks the app's own
  `.btn[hidden] { display: none !important }`, because an id beats a class. The attribute was set
  and the button stayed on screen, 48 by 48, on top of the words. The rule now carries its own
  `[hidden]` companion.
- **The wider lesson, worth more than the fix: any `!important` display rule on an id silently
  defeats `el.hidden`.** Where one exists it needs a `[hidden]` companion, or hiding will look
  like it worked everywhere except on screen.
- And the reason it shipped broken: the check read `el.hidden`, the property, which was `true`.
  Verified now by pixels in all four states: up to date 48x48 visible, out of date 0x0, resyncing
  0x0, recovered 48x48 again.

### v0.0.11.48 - The message arrives as a pop-up, and nothing sits on top of it

- Founder 2026-09-04: "the eye makes the text reading difficult, I think the message should be a
  pop up".
- **The eye stands down while the card is up.** `balHideBtn` floats in the balance card's top-right
  corner to hide AMOUNTS; with an explanation in place of an amount it has nothing to hide, so it
  was a control that could do nothing, sitting on the sentence. Same rule as the camera's Close
  button. It returns the moment a balance does.
- **The out-of-date message arrives as a pop-up, once per app open.** It opens the SAME
  confirmation the button opens rather than a second sheet in front of it: one set of words, one
  action, Back to dismiss (law 34, no Cancel). A standing state does not deserve a dialog on every
  glance at the Wallet, and the card behind it carries the message for the rest of the session, so
  dismissing costs nothing. It never opens over another dialog.
- **The shared confirmation now reads in paragraphs.** Its text is set with `textContent` (never
  `innerHTML`, because these messages carry amounts and addresses), so every blank line was
  collapsing and a three-paragraph explanation arrived as one wall of words. `white-space:
  pre-line` fixes it for every confirmation in the app.
- A first attempt built a bespoke sheet and was thrown away: it reused `.wallet-onboarding-card`,
  which is `display:none` by default and revealed by another flow's code, so the backdrop dimmed
  over an invisible card. Measured rather than guessed, then replaced with the surface the app
  already proves.

### v0.0.11.47 - The Wallet page says when your bank is out of date, and resyncs it

- Founder 2026-09-04, after installing on the older phone: "we still have nothing there telling the
  user what to do. From the wallet page, we should have a whole process." The diagnosis and the
  cure were on Settings, Network - the one page a person who is not technical will never open -
  while the Wallet showed `0.00` and `Syncing…`, which reads as "my money is gone and the app is
  stuck". Showing 0.00 in that state is not neutral, it is a false statement about someone's money.
- **When the bank cannot catch up, the balance area carries the explanation and the action**, and
  the hero figure stands down; the two never share the screen. It names how long the bank has been
  offline, says the money is safe on the network, and offers one full-width action.
- **A first run is never told its bank is out of date.** A bank that has fallen behind and a bank
  finishing its first sync look identical to a naive check; the card requires a real block height
  and a real tip time, so a brand-new install on the day of installing sees the ordinary wallet.
- **The resync is a visible job, not a spinner**: the same card carries the phase (checking the
  network, fetching the records and finding your money, almost done restarting) with the block
  height, keeps the action disabled while it runs, and says the app restarts by itself.
- **"Repair" is gone from the product** (founder: "let's avoid using the term repair, let's use
  resync with the network"). The copy, the confirmation, the Settings button and the code all say
  resync now, including the identifiers, so the source reads like the product.
- Verified on the running app across every state: first run and up to date and 20 hours behind all
  show the ordinary wallet; 66 days behind shows the card; the three running phases each read
  correctly with the action disabled; and once the bank is current again the card disappears and
  the balance returns.

### v0.0.11.46 - A way into the full list, and a quieter camera

- **Recent activity has a See all on the right, into the Activity page** (founder 2026-09-04).
  The control existed but a machinery rule had hidden it since 2026-07-25, on the reasoning that it
  was "redundant once a transaction returns there by itself". That is true of the route back after
  a payment, but it is not a way IN: reading the last few rows and wanting the rest is its own
  intention and nothing on the screen served it. It sits in the title row's trailing slot (law 33)
  as a named text action (ACT-008); it used to borrow `max-link`, the amount-row MAX variant, plus
  three inline styles to undo that class's own shouting. The rule still stands a `max-link` down
  inside the activity list itself, where an amount-row control has no business.
- **A closed camera no longer says "Camera off."** (founder: "we dont need the camera is off
  here"). The control in the corner already reads **Camera**, which states what happened and offers
  the way back; a sentence repeating it is one more thing to read for nothing. The status line
  stays for messages that carry news, such as a camera that could not open.

### v0.0.11.45 - No connect-a-node flash, and a one-tap repair

- **The "Connect your Minima node" banner no longer flashes on start-up.** Founder, older phone:
  "it briefly showed the node connection message at the top". The banner was visible in the markup
  and hidden a moment later by script, so every open painted it until the JavaScript caught up, and
  the slower the phone the longer it showed. The standalone app carries its own node and has
  nothing for anyone to connect, so that message was never true there for even a moment. It now
  starts hidden and is revealed only when it genuinely applies.
- **A bank that has been offline too long says so at once, instead of "Watching for progress".**
  The founder's phone was **66 days** behind and sat on that line for long minutes. Peers refuse to
  serve a node that far back (Minima logs `We are Too old to sync new user!` and disconnects), so
  waiting could never have worked. Past two days behind, the app says the bank cannot catch up on
  its own and offers the repair immediately. Inside that window the catching-up wording is
  unchanged, because there it is true.
- **Repairing is one tap and one confirmation.** Founder: "we have to make it easy for non crypto
  people, this should even be done automatically, the user should only have to confirm the action".
  Reaching the repair used to mean reading about MegaMMR, checking a host and port, ticking an
  acknowledgement and pressing a red button called "Resync from MegaMMR": four steps of vocabulary
  nobody outside this project has, and not one of them a decision a person can actually make. The
  Network section now offers **Repair my bank**, which asks the only question that is theirs, in
  plain words (what it does, how long, that their money, key and settings are untouched), and then
  runs it with the default recovery node. The Resync section is unchanged for anyone who wants to
  choose their own node.

### v0.0.11.44 - Opening the app asks the node once, not thirty times

- Founder: "syncing every time I access the app takes long, maybe too long for a user in retail
  payment". Measured on the phone, one ordinary open (logcat `StablesNodePathHandler`):
  **255 node commands, 33.7 seconds of node time**, of which `history` was asked **30 times**
  (11.9s) and `balance` **10 times** (8.5s). Twenty of those thirty-three seconds were the same
  two questions. Several subsystems each want the wallet's balance and history at start-up and
  each paid for its own round trip through a queue that serialises them, so they added up instead
  of overlapping.
- Identical read commands issued close together now share one answer: an in-flight call is joined
  rather than duplicated, and a just-finished one is reused for 1.5s. Matched on the exact command
  string, so `coins address:A` never borrows the answer to `coins address:B`. Writes, and anything
  that changes the wallet when you call it (`getaddress` hands out a fresh address every time),
  always go to the node.
- Verified on the running app: ten identical balance reads cost **one** round trip; two different
  `coins address:` cost two; two `getaddress` cost two; a `status` either side of the window costs
  two. The node is never asked anything different, only fewer times.
- **Measured on the phone, same open, before and after: 255 commands / 33.7s became 175 / 27.3s.**
- A longer share window during start-up was tried and removed: it changed nothing (179 / 28.5s, ie
  noise), because the remaining duplicates are not close in time, they are different questions.
  `history` is asked as `max:20`, `max:40`, `max:50`, `max:100` and `max:250` by different
  subsystems, and five distinct command strings cannot share one answer however long the window is.
  Making one large history read serve the smaller ones is the next real gain and is not attempted
  here, because it means trimming a node response and each caller's expectations have to be checked
  first.

### v0.0.11.43 - Answer on the first try, and one camera control

- **The agent answers the first time you ask.** Founder: "it seems we often have to ask twice".
  Four identical requests to the live agent, back to back, took **3.2s, 14.9s, 24.4s, 3.2s**: the
  agent serialises work behind one model queue, so how long an answer takes depends on what is in
  front of it, not on the question. The app was built for the fast case, aborting the request at
  15s and declaring "StablesAgent unavailable" at 18s, so every slow answer was killed on the way
  in. Asking twice worked because the second ask landed in a quiet moment.
  - The request now waits 45s, well past the measured 24.4s tail.
  - The app retries once itself, so it does the second ask instead of the person.
  - It never declares the agent unavailable while a request is still in flight, and after 8s it
    says "StablesAgent is still working on it…" without ending the wait or reopening the
    composer, because a silent twenty seconds is what made people ask again.
- **One camera control, in one place.** Founder: "when we close the camera, the button to turn it
  back on should take the place of the close button and we dont need the close button there".
  Close and Camera now share the same corner and exactly one is ever shown: Close while the camera
  is on, Camera once it is off. Offering Close for a camera that is already closed was a control
  that could do nothing.

### v0.0.11.42 - Founder review of 2026-09-04

- **Receive is dark blue again.** The wallet accent was painted by position
  (`#walletSendReceiveRow .act-btn:first-child`), so moving Send to the trailing position handed
  Receive the accent and both buttons came out cyan. The accent now follows `data-role="primary"`,
  so it travels with the button instead of with the slot.
- **StablesAgent answers again.** The app only ever asked through an iframe postMessage bridge and
  waited 12 to 18 seconds for a reply that never came, then said "StablesAgent unavailable". The
  agent's HTTP API answered the same question in under a second the whole time. The app now asks
  the API first and keeps the bridge as a fallback. And it sends the QUESTION: the language
  instruction it used to glue onto the end diluted the retrieval embedding, which is why a live
  agent that knew the answer replied "I don't have information about a network contribution in the
  provided context". Measured both ways. The founder's own question now answers in about 2 seconds.
- **The agent opens as the Stables testing phase app**, not "the xWiniwa core", in all four
  languages, and no longer tells standalone users that Minima Core holds their wallet.
- **A bank that is behind no longer shows a balance as confirmed.** The wallet proof went `ready`
  as soon as the node ANSWERED, so a node 114,000 blocks back reported a confirmed balance under a
  banner saying it was still catching up. It now reads `stale` while the node is behind, and the
  actions that would spend it stay closed.
- **Catching up shows progress.** "Updating" now says how old the newest block it holds is, and
  whether the gap is closing ("1,420 blocks gained since this page opened") or not ("has not
  gained a block in 20 minutes, so waiting will not fix it"). When it is stuck, a **Repair with
  Resync** control appears in Network and takes the person to the resync form.
- **The contribution charts sit under their own measures**, each with its own y axis (the strip's
  maximum, in that chart's unit) and its own dates. Two unlabelled rectangles under a shared date
  line became two labelled charts.
- Website: the home illustration no longer collapses on older phones. Its square canvas came only
  from `aspect-ratio`, which older Android WebViews lack, so the nodes piled up and the core circle
  stretched into an ellipse; there is now a padding fallback, and at narrow widths the core is a
  card sized to its text rather than a 122px circle its words could not fit inside.
- On-chain watch: Explorer and Download CSV are one pair again. The site's bare-button rule made
  the button 48px in a white box while the link stayed 44px and plain; both are now the same
  control at the same height on the same line.

### v0.0.11.41 - The node could see the vault all along

- **Mint and burn were dead on any node that had not taken the vault's coins into its own coin
  set, which is every fresh install.** The app read the vault with
  `coins address:<vault> relevant:false`. Measured on Minima 1.0.45.15 from inside the running
  MiniDapp: that question returns 0 coins, while `coins address:<vault>` returns the same three
  unspent coins the vault needs (reserve, balance, pool). The app then reported "the vault balance
  or reserve coin is not locally proven" and disabled both actions. It read as the pruning window
  and was not: the coins were 213 blocks old.
- One helper now asks both ways and merges by coin id (`tv81CoinsAtAddress`, `tv81CoinsById`), so
  neither form can hide a covenant coin from the other. Every covenant read moved onto it: the
  vault, the beacon, the market engine, the order and result addresses, the book-source registry,
  the anchor head and pages, and every re-check of an order or state coin by id.
- The faucet was never affected because its own lookup already asked the plain question. That is
  why claiming worked on a node where minting refused.

### v0.0.11.40 - Send on the right, Receive on the left

- Founder 2026-09-03: "from the wallet page and everywhere it makes sense, put the send button on
  the right, it will be used more often, and the receive on the left". Registered in the UI system
  reference as part of the placement axis (law 33) so it is a rule and not four separate edits:
  wherever Send and Receive are offered side by side, Receive leads and Send trails.
- Applied to the four places that offer both: the Wallet hero action row, the direction switcher
  inside the Send sheet and inside the Receive sheet, and the currency action sheet. The switcher
  keeps one fixed order in both sheets and only moves which segment is active, because a peer
  selector that reorders itself teaches nothing.

## [0.0.11.39] - 2026-09-03

- Standalone Android: the payment-received notification names the token the way a person does. A Minima token name can be a JSON object, and the node can hand it over as a string; the phone showed `Received 1000 {"name":"Winiwa"}`. One rule (`IncomingCoins.displayName`) now unwraps every form, in the notification and in the in-app incoming line, with a unit test for each shape.

## [0.0.11.38] - 2026-09-03

Published as the standalone Android app (test channel). The MiniDapp zip and the web build follow later; the website shows them as coming soon. Everything below, from v0.0.11.19 up, is in this release.

### v0.0.11.38 - One place for an action, one escape for a sheet, and the notes in your hands

- Founder 2026-09-03, from seven screenshots: "align all buttons and use standardized size, I
  would opt to put the buttons on the right hand side"; "we need one rule that we will apply across
  the whole app"; "avoid cancel button, here we have a back button, that's enough"; "in no place we
  should have touching buttons"; "the burn button on the confirm page should have the same burn red
  color"; "when we say size too large, we should mention the measure used"; "it should be proposed
  directly to combine them"; "be able to pick the one we want to combine"; "the merge/combine or
  even split should be listed in the activities too".
- **One rule for where an action sits (law 33).** An action that belongs to one row of text is that
  row's trailing control; an action that belongs to a card sits in the card's action row at the
  trailing edge; only the one primary submit of a form or sheet is full width. Standard size
  throughout. Wallet management is rebuilt on it: Refresh and Tidy up now at the card's trailing
  edge, Auto-sweep dust as a settings row with its control on the right, Generate new address as a
  row action.
- **A sheet's escape is its Back; no Cancel button (law 34).** Removed from the generic confirm, the
  recovery confirm, the node-terminal warning (which gains its Back), the payment-code keypad and
  the faucet burn overlay (which gains its Back). The confirm no longer rewrites its button's class
  list, which is what left "Combine notes" and "Cancel" touching.
- **A burn's confirmation is red.** The mint/burn confirmation submit takes the burn role for a
  burn, the same full-width action in the burn's colour; mints and trades stay primary.
- **The "Confirmations to finalise" row is gone** from Wallet management: it only pointed at the
  Confirmation policy section on Security, where the setting actually lives.
- **Node errors carry their unit.** "TxPoW size too large.. 95243/65536" now reads "This
  transaction is 93 KB. The network limit is 64 KB. It spends too many notes at once: combine your
  notes first, then try again." with the action "Manage notes" beside it. Rewritten once, centrally
  (`stablesHumanNodeError`), for every toast and every row note.
- **The notes sheet.** Each token on Wallet management now has a Manage action that opens the exact
  notes of that token (amount and age, one row each) in the registered data table. Pick the notes,
  choose how many notes to end with, read the transaction's estimated size against the 64 KB limit,
  and rebuild: the app builds the transaction itself (the picked notes in, N notes to your own
  address out, amounts split in exact string arithmetic) because the node's own consolidate cannot
  take a list of notes. A combine or a split appears in Activity as a transaction within this
  wallet: no plus, no minus, its own icon, and it settles like any other.
- Website: the release is the standalone Android app. The MiniDapp and web builds are shown as
  coming soon on the access page, the homepage and the links hub; one constant in
  `site-download-version.js` drives every Android download control. The new site's phone footer
  takes the same centred layout as every secondary page.
- Gate: `verify-notes-manager.mjs` runs the notes arithmetic in a VM (a split adds back to its total
  exactly, size and limit, the rewritten error) and checks the contract (no Cancel button in any
  sheet, the burn confirmation's role toggle, the removed row, the data table in the sheet).

### v0.0.11.37 - The open app costs less battery

- Founder 2026-09-03, from Android's battery screen: "the battery usage of the app seems way too
  high" (Stables 49 percent since the last full charge). Measured on the phone before changing
  anything: of the 614 mAh drain, 183 was ours, and 82 of our 118 mAh of CPU was spent while the
  app was OPEN, not in the background. Idle on the Wallet page the app burned about 55 percent of
  a core. Numbers, tables and method: `work/docs/BATTERY_MEASUREMENT_2026-09-03.md`.
- **One owner for the wallet balance read.** `balance` costs the phone's node about 680 ms and was
  being read 6.6 times a minute at rest, because three callers each believed they owned it: the
  wallet repaint kick, the live poll (its own pull plus a test-channel patch that added another),
  and the readiness sweep. They now go through `stablesNodeReadBudget`: a read caused by an EVENT
  (the person acted, a block landed, the node pushed, the app returned to the front, a readiness
  subject is unproven) runs immediately; a read caused by a TIMER runs only when the answer we
  hold is genuinely old (90 s on the phone, 8 s while a transaction the person is watching is in
  play). Bursts coalesce into one read; a read that fails leaves the answer stale so the next
  timer retries. Every call site now names its reason, and an unknown reason is a timer.
- **The live poll stops re-reading the balance when nobody is waiting for money.** While the
  Receive sheet or a merchant QR is open it keeps its brisk cadence (a payment is visible to the
  receiver the moment it is broadcast, and that is the retail moment). Otherwise it falls back to
  one read a minute on the phone, 20 s on web, where there is no native push.
- **Repaints only when the screen changed.** The wallet list, the activity list and the global UI
  repaint were called 60 to 70 times a minute drawing an identical screen. `stablesRenderGate`
  puts a signature in front of each: a changed screen repaints at once, an unchanged one is
  skipped, and nothing is skipped for longer than 5 seconds, so anything a signature cannot see
  still reaches the screen.
- **Jobs that stop when they are told to.** Five stop paths held a repeating-job handle and passed
  it to `clearInterval`, which does nothing at all to an object: opening Send once left a native
  bridge call running every 800 ms for the life of the app, and the faucet countdown, the faucet
  pour and settlement renderers and the on-chain chat scan (which asks the node for coins) all
  outlived what they were watching. They now call `stablesStopRepeat`, and the scheduler treats a
  label as the job's identity, so arming one twice replaces it instead of running two. The Send
  readiness check also drops from 800 ms to 2.5 s, and the invoice-recognition countdown only
  runs while its own page is on screen.
- **The transaction mirror pays for a decision once per device.** Every app open spent about 100
  `txpow txpowid` reads in a 20-second burst re-learning that the same oracle updates and other
  people's covenant legs are not rows in this wallet. That answer is conclusive when it is made
  (an indeterminate lookup is already reported as unknown, never as "not mine"), so it is now
  remembered on the device, keyed by token set and cleared when the wallet changes.
- Gate: `verify-node-read-budget.mjs`, wired into four-platform parity. It runs the budget, the
  render gate, the scheduler and the whole transaction mirror in a VM — the mirror twice, sharing
  one store, to prove the second open pays nothing. Nine mutations were each proven to fail it.

### v0.0.11.36 - Security page and the quick-pay undo, after the founder's phone review

- Founder 2026-09-03, from three phone screenshots: "we have to better design this Undo pop-up",
  "we don't see they are different settings", "change the Remove for a X, I never understood what
  it was", and "by default make just one 3 blocks confirmation, not multiple".
- The quick-pay undo notice used to be the centre-screen notice box with an inline-styled button
  inside it, sitting over the Send and Receive buttons and naming the asset by its code (WINIMA).
  It is now the toast's undo variant: one line above the bottom nav, "Quick pay 22 Winiwa" and the
  text action Undo, gone by itself when the 2-second window closes (the wallet row is the feedback
  once the payment goes).
- Confirmation policy is its own titled section on the Security page, like every other setting,
  instead of a divider inside the payment-protection card.
- Removing a confirmation level is a round 44 px icon action with the cross glyph, an accessible
  name and a tooltip. This reverses 2026-08-09, when a bare cross box had read as a mystery and
  became a named text action; the named action was not understood either.
- Default confirmation policy: one level, every amount complete at 3 blocks. A stored policy that
  still equals the old five-tier default (never chosen) follows the new default; a customised one
  stays. The single catch-all row reads "All amounts".
- Gate `verify-payment-security.mjs` executes the defaults, the migration, the row renderer and the
  undo notice markup in a VM; wired into four-platform parity.

### v0.0.11.35 - The figures one by one, and a daily chart

- Founder 2026-09-03: "present that a bit better, the elements one by one", "could we even add a
  graph, on a daily basis". The single status line under the Network contribution row becomes four
  label/value rows (TxPoW contributed today, TxPoW in total, Online today, Hash rate) and, once
  there is more than one day to show, "Last N days": two bar strips, TxPoW per day and time online
  per day, one hue with today emphasised, each bar carrying its own tooltip, the rows above serving
  as the table. One strip per measure; never two scales on one plot.
- The service now keeps up to 30 closed days (day, TxPoW, time online) in the same stored record,
  closed at local midnight; the bridge JSON carries them as `history`. The gate executes the roll
  and the chart data against the shipped jar and the drawing in a VM.

### v0.0.11.34 - What this phone did for Minima today

- Founder 2026-09-03: "yes for a counter". Under the Network contribution row, one line: TxPoW
  contributed today (with the lifetime total), time online today, and the device hash rate.
  Founder's word is TxPoW, not unit.
- A TxPoW that does not become a block adds nothing to the chain by itself: the block miner only
  includes messages carrying a transaction. What the network gets is the attempt, hashed against
  both thresholds at once, so the phone's expected share of blocks over a day equals its share of
  the total hashing. The count and the hash rate together are the truthful measure.
- The service already sees every completed TxPoW (the same event that drives the level), so the
  count costs nothing; time online is accumulated by the 30-second monitor; the hash rate is the
  figure the node measures at boot and stores. No node command is run. The day rolls at local
  midnight. `ContributionStats` is pure Java and the gate executes it against the shipped jar;
  the line's formatting runs in the gate's VM.

### v0.0.11.33 - Network contribution: how much this phone helps run Minima

- Founder decision 2026-09-03. A new row in Settings, Node: "Network contribution: how much this
  phone helps run Minima", with four levels: Pause, Minimum, Balanced (default), Maximum. One line
  of copy and the level names; StablesAgent explains the rest.
- The level decides ONE thing: the embedded node's automine cadence (`Main.AUTOMINE_TIMER`, the
  delay between the empty proof-of-work units this phone volunteers). Balanced maps exactly onto
  Minima's own two settings (500,000 ms on battery, 50,000 ms on a charger), so a person who never
  touches the row gets exactly what they had. Maximum runs at 50,000 either way. Minimum runs at
  2,000,000 ms on battery (40 block-times, four times quieter than low power, still about 43 units a
  day so the node is visibly participating) and 50,000 on a charger. Pause stops the pulse on both.
- The battery receiver in the standalone service used to decide the cadence on its own (plugged =
  normal, unplugged = low power). It now reports the charger state to one place,
  `applyNetworkContribution`, which combines it with the stored level. The level is applied when the
  node finishes booting, on every charger change, and the moment the row is changed.
- A level change is immediate. The miner re-arms its own pulse after every unit with the timer it
  finds then, and Minima's timer queue has no cancel, so a new timer alone would take effect only
  when the pulse already waiting fires: up to the previous level's whole period, 33 minutes from
  Minimum (measured on the phone before this was fixed). `MinePulse` reaches the queue inside the
  process, removes the waiting pulse and posts exactly one fresh one (none for Pause), so there is
  never more than one pulse chain and Pause stops the very next unit. A 30-second monitor re-applies
  drift, removes a stray or duplicate pulse and re-arms a lost one; if the queue ever becomes
  unreachable (a jar that moved its fields) the service falls back to waiting for the chain. A
  person's own transactions are mined on demand and are unaffected at every level, Pause included.
  An automine unit is recognised by its empty transaction, never by the txpow's `istransaction`
  flag (false for every txpow until its proof-of-work is done); the phone caught the first build
  getting that wrong.
- Measured first, on battery, before building (2026-09-03, phone unplugged 2h+): the app process
  used 4.6% of one core over 60 s; NOTIFYMANAGER and MINER used none. The existing low-power path
  does engage unplugged.
- THE BATTERY DAY WAS NEVER THE MINER. The same measurement after a node restart reproduced the
  founder's reading exactly, on reported battery power: NOTIFYMANAGER at 81 to 86% of a core plus
  GC at 23 to 30%, in a window at Maximum and in a window at Pause alike, while the MINER thread was
  the only level-dependent term (14.8% at Maximum, 0 at Pause). The notify thread was inside the
  service's own NEWBALANCE handler, which ran `coins relevant:true` in-process on every block and
  parsed the result: on this economy that command returns about 23 MB of JSON, because the tracked
  covenant addresses carry tens of thousands of coins. One event took over eleven minutes, and
  while it ran no other node event reached the app (no block, no incoming payment). Fixed: confirmed
  receipts are now netted from the NEWCOIN events the node already posts for every relevant coin
  (own change against own spends, protocol addresses ignored) and flushed on NEWBALANCE, with no
  node command at all; receipts are reported only once the node is at the chain tip so a node
  catching up does not replay history as alerts. `IncomingCoins` is pure Java and the gate executes
  it against the shipped jar.
- Gate: `work/tools/verify-network-contribution.mjs` compiles and executes the mapping with the JDK
  and drives the settings row's functions against a fake bridge; wired into four-platform parity.
  Dev hooks for the release phone: `SET_NETWORK_CONTRIBUTION` / `LOG_NETWORK_CONTRIBUTION`
  broadcasts, guarded by `android.permission.DUMP` (the adb shell holds it, an ordinary app cannot).
  Found on the way: the node service is not exported, so `am startservice` from adb has never
  reached it; the documented `CLEAN_SHUTDOWN` intent is unreachable the same way, and `stopSelf()`
  never reaches `onDestroy` while the activity is bound to the service. The clean-shutdown hook now
  runs the node's own `quit compact:true` and exits the process once it returns. Every apply logs
  `CONTRIBUTION level=... AUTOMINE_TIMER=... queue=...` for read-back.

### v0.0.11.32 - The idle app stops interrogating its own node

- Founder battery report 2026-09-02: the standalone took 29% of a day. The comparison that matters
  is in the same screenshot - "Stables for Minima Core" ran the SAME UI for 1h22 of screen time at
  2%, while the standalone cost 29% for 2h41. The difference is that the standalone's node is IN
  PROCESS: every poll it makes spends its own battery, where the Core build's identical polls cross
  to another process.
- The transaction mirror polled `history max:20` every 3 seconds for as long as the app was OPEN -
  roughly 1,200 node reads per hour of screen time, most of them while the person was on Settings or
  the faucet page. It now runs at 3s only while a payment is in play (Receive window open, a row
  settling, or the person acted in the last two minutes) and otherwise once every 30 seconds.
  Measured: 10 polls/30s in play, 1 poll/30s idle.
- Incoming detection is UNCHANGED and still meets the retail requirement: the native NEWTXPOW bridge
  calls the mirror directly and does not go through this throttle. The poll was only ever a net.
- An unsettled row older than ten minutes no longer counts as "in play". Without that bound one
  stale row - a claim left awaiting approval, a dropped send - pinned the app at a node read every
  3 seconds for the life of the install. Found while measuring this change: the first version still
  reported fast when idle, because old test rows were still listed.
- `window.__STABLES_TX_POLL__` exposes the cadence so a regression is observable.


### v0.0.11.31 - The progress view outlives the transaction

- Founder 2026-09-02: "keep the view progress always available even when the transaction is settled
  so that we can always refer to the timing details of it in the app." The "View progress" button
  used to disappear the moment a transaction finished - exactly when its timings stop being
  something you watch and become something you look back on. It now shows for any transaction with
  an on-chain identity, including a failed one: when it stopped is as much a fact as when it landed.
- Step timings are persisted, so they survive closing the app. In memory alone the promise lasted
  until the app was next opened, which on a phone is almost immediately.
- The app only times what it WATCHED happen. Reopening an old transaction would otherwise stamp
  "now" against every completed step and present last week's payment as though it had flown through
  in milliseconds. Whatever is already done the first time a transaction is seen is recorded as
  having no known time and renders blank; only observed transitions get a real stamp.


### v0.0.11.30 - Broadcast is its own step

- Founder 2026-09-02: a payment is visible to the receiver as soon as it is BROADCAST, about three
  seconds, long before any block - and over a shop counter that is the moment that matters.
- The sending tracker now has a **Broadcasted** step between Sent and On-chain: "On the network.
  The receiver can see it now." The step that used to read "On-chain" ticked the moment a TxPoW id
  appeared, which is broadcast, not mining - it was naming the wrong event. On-chain now waits for a
  real block.
- The receiving tracker's first step reads "Broadcast received - seen by your Minima node, before
  any block", naming what happened rather than the app noticing it.
- The block count no longer floors at 1. That floor existed so a ticked On-chain step would not sit
  beside "0/2 blocks" (2026-09-01); with broadcast split out it became the opposite lie, claiming
  "1/3 blocks" for a transaction that was only broadcast.
- Receive-side detection is unchanged and already pre-block: tx-mirror reads mempool-inclusive
  history on a native NEWTXPOW kick with a 3s poll fallback, and the receive window closes from that
  signal, not from confirmation.


### v0.0.11.29 - Ask whether the transaction is ready, not how many keys signed it

- The app sat on "awaiting approval" for ever even after the approval succeeded (founder
  2026-09-02). The 0.0.11.27 waiter polled for the signature COUNT to rise, which for a faucet claim
  can never happen: it spends covenant coins, which are script-locked rather than key-signed. The
  approval response proved it - "The command was successful" with `"keys": []`.
- The waiter now asks the node's own verdict, `txncheck.valid` (basic + scripts + mmrproofs +
  signatures), which is what actually decides whether a transaction can be posted.
- It also checks ONCE before waiting: a covenant claim is often complete the moment txnbasics has
  run, so where no signature is really needed the claim finishes with no approval prompt at all.
- Measured on the live host, and it confirms the 0.0.11.27 reorder: after approval the transaction
  read `signatures: 0`, `valid.signatures: true`, `valid.mmrproofs: FALSE` - unpostable, because the
  old order ran txnbasics AFTER the signature, so it never ran once the sign was queued.


### v0.0.11.28 - The MiniDapp never asks you to connect a node

- The connect-node banner was still appearing in the MiniDapp during boot (founder 2026-09-02:
  "make sure we don't see this connect to node in the mds build"). The 0.0.11.19 fix asked
  stablesPlatform(), which is declared thousands of lines below the connection state machine: any
  render before that declaration caught the ReferenceError, fell through to the wire transport, and
  painted the prompt.
- Recognition now reads the URL, which answers the question before any app code runs: MDS serves
  each MiniDapp from /<dapp-uid>/ and hands it a session uid.
- Belt and braces: a first-paint guard marks the document on a MiniDapp origin and hides the banner
  and connect button in CSS, so nothing can be painted even while the app is still starting.
- Proven by serving the built dapp under a real MDS-shaped URL and sampling 14 times through boot:
  the banner never appeared and the connect text never reached the screen. The web build still
  offers to connect, as it must.


### v0.0.11.27 - Approving a claim now finishes it

- Founder, 2026-09-02: "even when approved the transaction doesn't go through." A faucet claim is a
  seven-command build, and approving in Minima runs the ONE queued command (`txnsign`) and nothing
  else. The app had already given up, so txncheck / txnexport / txnpost were never issued: the
  transaction was signed in the node's memory and never broadcast. A plain `send` worked because it
  is a single command.
- Probed on the live host: `txnsign` is the ONLY write-restricted command in the build. txncreate,
  txnbasics, txncheck, txnexport, txnpost and txndelete are all allowed under read permission.
- So `txnbasics` now runs BEFORE the signature, making the signature the last thing the build needs;
  when it queues, the app waits for approval and then finishes the remaining steps itself. One tap,
  no second approval.
- The wait uses `txncheck` (read-only, reports the signature count). It must never use
  `mds action:pending`: that is a write command, so asking whether the person has approved would
  file another request for them to approve.
- `txnsign ... txnpost:true` is NOT supported - the node answers "Invalid parameter : txnpost",
  identical to a bogus control parameter. The `txnpost` field in its response is output-only.


### v0.0.11.26 - A waiting transaction says it is waiting

- A row awaiting your approval in Minima read "receiving", the mempool wording, because an incoming
  pending row borrows it. Nothing was arriving: the transaction had not even been signed. Observed
  on the live host holding "receiving" for over a minute while the true state was "waiting for you".
  It now reads "awaiting approval".
- This is the display half of the 0.0.11.25 fix, which stopped the same row being overwritten to
  "failed" by the watchers that ask the chain whether it has landed.


### v0.0.11.25 - Not landed yet is not failed

- A faucet claim waiting for your approval in Minima was still being reported as FAILED (founder,
  2026-09-02: "still failed in the mds"). Traced live on the MDS host: the claim builds fine
  (poolCoin true, stateCoin true), reaches Step 4/6 signing, Minima queues it, and the app shows the
  correct "waiting for your approval" message - and then one of five settlement watchers, which ask
  the node whether the claim has appeared in history, overwrites the row to failed. It has not
  appeared because it has not been SIGNED yet.
- A row waiting on a PERSON now vetoes that downgrade (`stablesActivityRowAwaitingApproval`). Only a
  caller that explicitly passes a status may touch it - that is the permission path itself, which
  sets Pending. Every "did it land" watcher leaves it alone.
- The read-permission gate now covers this, checking the guard actually returns early rather than
  merely mentioning the helper: the first version of the check passed a body whose condition had
  been neutered.


### v0.0.11.24 - A row stops naming a stage it has left

- A faucet claim read "Faucet claim submitted" for ever, long after it had confirmed. The label was
  not merely stale: `normalizeFaucetClaimRow` re-stamped that exact string on every reconcile pass,
  so no later update could change it. Faucet rows now read "Faucet claim", with the stage in status.
- Order rows had the same fault ("Sell order submitted" / "Buy order submitted") and now read
  "Sell order" / "Buy order".
- Faucet rows are recognised by identity (`faucetClaim` + the covenant counterparty), not by the
  words in their title. The de-duplication used to match the literal string "faucet claim
  submitted", so renaming the label would silently have stopped faucet rows merging.
- New gate: verify-activity-row-titles.mjs, proven to fail on all four regressions.


### v0.0.11.23 - Follow a transaction through time

- Every step of a transaction shows the time it completed, on both the outgoing and the incoming
  tracker (founder 2026-09-02). The time is stamped ONCE, the first moment a step reads done: the
  trackers re-render every 1.5s, so a time derived at render would read "now" on every repaint and
  say nothing about how long anything took. A step that has not happened shows no time at all.
- xWiniwa wears **xW**, not xM. "xM" was left over from xMinima and named the wrong asset on every
  row and avatar. Winiwa is the test asset; Minima is the node, network and chain.


### v0.0.11.22 - A waiting action stays on screen

- Fixes a fault introduced in 0.0.11.21: the app polled `mds action:pending` every 6 seconds to
  notice when you had approved something. Under read permission `mds` is ITSELF a write command, so
  it does not answer - it gets queued. That poll would have added an approval request to your Minima
  queue every six seconds, asking whether you had answered yet by filing another thing to answer.
  There is no polling now; a queued action settles from the chain like any other transaction.
- A row waiting for your approval is no longer deleted. It was being absorbed by the prune that
  merges an optimistic row into a confirmed one of the same amount and address, so an action
  awaiting approval left NO row at all. It was never posted, so nothing on chain can supersede it.
- New gate: verify-read-permission-safety.mjs, proven to fail on all four regressions including the
  6-second poll.


### v0.0.11.21 - Read-only Minima installs work

- Read-only is the ordinary permission model, not a fault: the app asks, Minima asks you, you
  approve. Stables no longer refuses an action up front, and no longer tells anyone to grant write
  access. Faucet, Mint and Burn all attempt normally.
- A command Minima has QUEUED now reads "Waiting for your approval in Minima" as a Pending row,
  instead of a Failed one that stayed failed after you approved it.
- The app watches its own pending queue (`mds action:pending`, which answers even to a read-only
  install) and re-proves balances the moment you answer, so a waiting row resolves itself.
- Permission is detected from the transport's own flag, never by matching words in an error string.
  The previous code tested for the substring "read-only access", so rewording the sentence would
  silently have turned every waiting action back into a failure.


### v0.0.11.20 - One gap, one owner

- Half and MAX are back on the Send page. The markup was always there; a migration stylesheet hid
  it with `display:none !important`. The rule now: quick amounts belong to any field that SPENDS a
  balance, so Mint, Burn and Send all carry them. Receive asks for an amount and has none.
- Spacing is a rule instead of a per-page opinion. The gap under the Mint/Burn control was 62px,
  made of 24px margin + 20px section padding + 18px card padding: three decisions nobody took
  together. It is now 24px, one step of the scale. On Send the same missing ownership had the
  opposite effect, with the available line flush against the address box; it now sits 18px clear.
- New shared component `.ui-amount-head`: "what you can spend", the shortcuts and the input are one
  thing, spaced once, in all 5 money fields.
- New gate: verify-spacing-rules.mjs, proven to fail on each rule it holds. It found a sixth money
  field already drifting to its own margin value.


### v0.0.11.19 - MiniDapp: no phantom node connection, no long syncing delay

- The MiniDapp build no longer shows "Connecting to your Minima node" or offers "Connection
  settings". It runs inside Minima, so there is no connection to make, lose or configure.
- The wallet no longer sits on "Proof unavailable" beside a working node. The balance proof used
  to refuse to run whenever an RPC health flag was false; that flag is cleared by missed polls and
  only a successful poll restores it, so a starved poll deadlocked it permanently. Where the node
  is part of the runtime the app now asks it and lets the answer decide.
- Returning to the app re-proves balances immediately instead of waiting up to 20 seconds. The
  live poll had opted out of the catch-up run, justified by a native resume hook that exists on
  only one of the four surfaces.
- New gate: verify-node-transport-truth.mjs, proven to fail on each of the four regressions.


## [0.0.11.18] - 2026-09-02

- **A transaction waiting for your approval is no longer reported as failed.** When Stables is
  installed in Minima with read-only access it cannot sign, so Minima queues each signature for you
  to approve. Stables read that as an error: it announced that signing had failed on your node and
  told you to try again, wrote "failed" against the claim, and then asked you to approve something
  that could never finish, because it had already abandoned the remaining steps. Approving it changed
  nothing, which is exactly what you saw.
- Stables now recognises a queued command for what it is. It says plainly that it has read-only
  access and needs write access to sign, the activity row names that as the reason instead of
  blaming your node, and it stops offering "try again" for something that cannot succeed. Once it
  has learned this, it declines before building a transaction rather than half-way through one.

## [0.0.11.17] - 2026-09-02

- **The MiniDapp no longer sits forever on "syncing" and "proof unavailable".** Version 0.0.11.13
  taught the app to stop working while nobody is looking at it, which is what stopped it draining the
  battery overnight. To do that it has to know whether anyone is looking, and inside the Minima app
  the answer it received was wrong: that window reports itself as hidden from the moment it opens and
  never corrects itself. So the app believed nobody was ever looking. It checked the node once at
  startup, before the node could possibly answer, and then never again. Whatever it happened to see
  in that first instant is what you were left staring at.
- The app now only believes it is hidden once the window has proved it reports such changes at all,
  and anything that has never once succeeded keeps trying regardless. Being wrong about someone
  watching costs a little work; being wrong the other way costs the whole app. Leaving the app still
  stands its work down as before, so the battery fix is untouched.

## [0.0.11.16] - 2026-09-02

- **Every build of a version now lives in one place, and every version before it is kept beside it.**
  The folder that holds the latest release carries all three things people actually install: the
  MiniDapp package and both Android apps. When a new version is produced, the previous set moves
  together into that folder's archive, complete, so the history of what shipped is never scattered
  and never thrown away.

## [0.0.11.15] - 2026-09-02

- **One place now holds the latest package.** Five folders claimed to hold it and all five disagreed.
  Two of them held builds that were never released and return "not found" on the live site, while the
  one package people can actually download had been filed away in an archive folder. A sixth copy,
  meant only to mirror what is public, had collected nine files including two development builds of
  the phone app that were never released to anyone.
- Everything that was never released has been moved out, nothing deleted, and each folder now says
  plainly what it is for: one working folder for the package being prepared, and mirrors that carry
  only what is genuinely public. The offline Tor build reads that working folder and refuses to build
  when the package named on the website is missing from it, so this had quietly broken it too.

## [0.0.11.14] - 2026-09-02

- **Minting now finishes.** The mint itself always worked and always reached the chain, but the very
  last step of a SUCCESSFUL mint crashed: it tried to clear the amount box using a reference that
  did not exist there. Everything after that line was skipped, so the amount you typed stayed on
  screen, the quote never recalculated, and the confirmed balance refresh never ran. The same
  mistake sat in three other places, on the USDw mint and burn paths.
- **The Core app knows it is an Android app.** It identified itself as a web page, so it took the
  browser's transaction poll (every 2 seconds instead of every 6) on a phone battery, and it asked
  for the desktop composition rather than the app one. Both Android packages now answer that
  question the same way.

## [0.0.11.13] - 2026-09-02

- **The app stops working when you stop looking at it.** Overnight it took 80 percent of a phone
  battery, and Android attributed 42 percent of everything used that day to Stables, on 1 hr 44 min
  of background. The node itself was behaving: the app releases its CPU wake lock the moment you
  leave. The problem was on the other side of the same app. Twenty-seven separate repeating timers
  kept running in the background and pulled the processor straight back awake: the transaction list
  asked the node for news every 3 seconds, balances every 20, and a diagnostic reading scanned the
  chain twice a minute, all night.
- No single timer was the fault. "Should this keep running right now" had twenty-seven private
  answers, and none of them knew whether anyone was looking. There is one answer now, and every
  repeating job in the app shares it: work stops when you leave and runs again the instant you come
  back, so returning to the app is as fresh as before without anything having burned battery to keep
  it that way. A payment you have already sent keeps being followed, because that is your money in
  flight and the app was already keeping the node awake for it.
- A diagnostic that only exists to describe which node a build was reading no longer repeats at all.
  It reads once. Nothing that exists for our benefit should cost you battery.
- **A build that does not parse can no longer pass.** While making the change above, one unclosed
  quotation mark shipped into the app's main script. JavaScript stops dead at a syntax error, so
  everything defined after that point simply did not exist: no page navigation, no transport choice,
  no version fingerprint. Every existing check passed it, because they all read the source as text
  and found four identical copies across the four platforms. The first thing checked now, before
  anything else, is whether every script on every platform actually parses.

## [0.0.11.12] - 2026-09-02

- **Mint is reachable again, and the reason it was not is now impossible to repeat.** On a healthy
  node the app reported the xWiniwa vault proof as "syncing" forever, on the phone and on the
  MiniDapp, so minting was refused. The vault coins were never the problem: they sat at the covenant
  address, correctly shaped, created in the SAME BLOCK as the faucet coins the app read happily, and
  calling the vault read by hand returned a proven balance and reserve in 2.1 seconds. Nothing ever
  called it. The vault proof could only be started by opening the Mint page, and if that one attempt
  failed it was never tried again.
- Wallet balance, faucet level and vault proof were three private copies of one lifecycle: reach the
  node, decide whether to trust the answer. The copies drifted, and the vault ended up with one
  driver where the faucet had four. They now share a single readiness engine that drives every
  subject at boot, on first node connection, on page navigation, and on a persistent sweep, so no
  surface can quietly end up with fewer ways to recover than its neighbour.
- The conformance gate could pass two runtimes sitting on different nodes. It now records which node
  each runtime is on, how far back that node still holds full blocks, and whether it can see the
  vault and faucet covenant coins at all, and it refuses to call cross-node agreement a pass.

## [0.0.11.11] - 2026-09-01

- **Your balance is what you own, not what you can spend this minute.** Sending 321 Winiwa out of
  1,000 made the wallet read 0.00. Nothing was lost: Minima is a UTXO chain, so the send spent the
  whole 1,000 coin and returned 678.88 as change, and that change cannot move again until it reaches
  coin depth. The wallet was showing the SPENDABLE figure, which was genuinely zero for those few
  minutes, so the app said the money was gone while the person still held it.
- Owned and spendable are now two questions with two answers. Every balance a person reads shows
  what they own; "Available:" and MAX keep the spendable figure, so nothing can be offered for
  sending that the chain would refuse. We are building for people who have used a bank app, and a
  bank app does not tell you your money vanished because it is briefly unclearable.

## [0.0.11.10] - 2026-09-01

- **The mint leverage chart is removed.** It plotted MEXC MINIMA/USDT klines labelled "Winiwa - USD"
  and "xWiniwa - USD", directly beneath a line stating there is no market for xWiniwa. It drew only
  where the runtime could reach MEXC, so whether a market appeared to exist was decided by network
  reachability: the MiniDapp fetches through MDS.net and drew it, browsers are blocked by CORS and
  fell back to "Graph coming soon". There is no honest dormant form of a market that does not exist,
  so the surface is gone rather than hidden, and nothing calls MEXC any more.
- **A payment that is on-chain no longer reports zero blocks.** The stepper showed a ticked On-chain
  step above "Confirming (0/2 blocks)", which contradicts itself: being on-chain is one block. The
  count now floors at one once mined.

## [0.0.11.09] - 2026-09-01

- **Every build now reports its own runtime fingerprint.** Behaviour is proven on the standalone app
  on a phone, so that build is the reference the others must match. A release-signed APK has WebView
  debugging disabled, so no debugger can ever inspect the reference; instead the app prints one line
  describing itself, which reaches a debugger on web and the MiniDapp and logcat on the phone. One
  code path measures all four runtimes, with no per-platform scraping to disagree about.
- `verify-platform-conformance.mjs` collects those fingerprints and diffs them. Every difference must
  be declared in `platform-divergence.json` with a reason, or it fails. File parity proved 63
  identical files all day while the MiniDapp was unusable, because identical files behave
  differently; this compares behaviour instead. A runtime that could not be reached is reported NOT
  RUN and never counted as agreement.

## [0.0.11.08] - 2026-09-01

- **The faucet level loads on the MiniDapp.** The previous build fixed the transport for ordinary
  node commands but not for the *urgent* read path, which the faucet level uses. That path chose RPC
  on a test that is always true, `typeof stablesRpcSendCommandNow === 'function'`, without ever
  asking whether RPC was configured, so on the MiniDapp it left over a transport that platform does
  not have and the level retried until it gave up with "Faucet proof unavailable". The pool itself
  was never in doubt: 999,840,000 Winiwa, unspent, visible to the node throughout.
- There is now ONE answer to how a node command leaves the app, `stablesNodeCommandTransport()`, and
  the three sites that used to decide for themselves all ask it. The gate covers the whole family
  rather than the single site that was reported, and fails if any of them goes back to testing that
  a function exists.
- **A dialog is one box, not a box inside a box.** `.ui-modal-frame` positions a dialog; the `.modal`
  inside it paints the surface. The frame was being given a surface as well, so at any width where it
  is not edge to edge a second box showed around the card. Both desktop surfaces had already
  cancelled it locally; the cause is fixed once now, and the frame no longer paints anywhere.

## [0.0.11.07] - 2026-09-01

- **The MiniDapp build now talks to the node it is running inside.** It reported "Proof unavailable"
  for every balance while sitting on a healthy, fully synced node. The node channel was fine and was
  answering in under a second: the app simply was not using it. Where a command could go over either
  transport, the browser RPC bridge was preferred unconditionally, and that bridge points at a local
  CORS proxy meant for the web development surface. From an https MiniDapp origin every call to it
  fails, so the whole app read as disconnected.
- The rule is now explicit and shared: a platform that carries its own node, the MiniDapp over MDS
  and the standalone over its in-process node, never selects the browser bridge. The Core companion
  is excluded, because it really does pair with Minima Core. A gate fails the build if the bridge
  becomes reachable from a self-hosted platform again.
- **"Core connection" no longer appears in the MiniDapp.** There is nothing to pair when the app is
  installed into the node itself. Surfaces whose purpose is reaching a node over the network are
  removed on those platforms rather than shown inert.

## [0.0.11.06] - 2026-09-01

- **The Core companion can now finish a faucet claim.** With the channel contention fixed in the
  previous build, the claim reached the end and then stopped one step short of posting: the
  companion was refusing `txnexport`, the command that reads back the transaction Stables has just
  assembled so the claim can record its permanent id. It was missing from the companion's list of
  allowed commands, so the claim failed and no transaction was ever created. It is allowed now; it
  exports only what the app itself built, and moves no funds.
- The rest of the companion's command boundary was checked against the standalone's at the same
  time. Everything else it refuses, it refuses on purpose: the seed, the vault, backup, restore and
  chain repair all belong to Minima Core, not to Stables.
- **A choice between two things now looks like one.** The top bar identity setting was two buttons
  that swapped colour, which reads as two actions you could both press. It is now the same
  segmented control used for Mint and Burn: one setting, showing its current value.

## [0.0.11.05] - 2026-09-01

- **The MiniDapp build no longer asks you to connect a node.** It runs inside one, so there was
  nothing to connect and no address to type; the form was a question with no answer. It now says
  where the node is, the same way the standalone does.

- **Claiming from the faucet works on the Minima Core companion.** It failed there while working on
  the standalone, and the reason was speed, not permissions. On the companion every node command is
  a cross-process round trip of about half a second; a claim needs roughly twenty-five of them in
  order. Meanwhile the app's routine refreshes were using the same single channel, landing between
  almost every step of the build and roughly doubling how long it took, until it ran out of time and
  gave up with "Pouring" still on screen.
- **A transaction build now owns the node channel.** While one is in progress, refreshes that only
  keep the display current wait their turn. This is detected where commands are sent, so it protects
  every operation, not just claiming. A build that stalls releases the channel by itself.
- **The time allowed for an operation now reflects how it is connected.** The same work through Core
  is inherently slower than through the app's own node, so it is given proportionate room instead of
  a budget written for a node that answers instantly.

## [0.0.11.04] - 2026-09-01

- **The connect steps no longer touch the button below them.** The last line of the instructions sat
  directly against the connect action, so the two read as one block. There is now a clear space
  between what you read and what you press.

## [0.0.11.03] - 2026-09-01

- **The StablesAgent panel no longer sits under the phone's status bar.** The drawer is full height,
  so its header started at the very top of the screen and the clock overlapped the agent's name. It
  now begins below the status bar, using the same inset the rest of the app already respects.
- **Connecting to Minima Core is explained once, and correctly.** The steps were numbered twice, by
  the list and again by hand, so they read "1. 1", "2. 2", "3. 3". The list now numbers itself.
- **The instructions say the thing that was missing:** you do not install Stables into Core. Opening
  the app registers it by itself, and what remains is to allow it in Core, twice. The steps also say
  what each permission buys: balances load once Stables is enabled, and Mint, Burn and Send need
  Admin because only Core can sign.
- Step explanations are no longer set in the same heavy weight as the step titles, so the three
  steps read as three steps.

## [0.0.11.02] - 2026-09-01

- **Surfaces use the app's own dark blue, never black.** Forty-five near-black surfaces, including
  the currency list on Exchange and Receive, were painted from a near-black colour that had nothing
  to do with the design set. They now use the dark blue the set already defines, keeping the weight
  each surface was given. Shadows stay dark, because a shadow is not a surface.
- **Every dropdown looks like the same dropdown.** The exchange currency list now wears exactly the
  surface the registered dropdown wears, so the menu you meet on Activity is the menu you meet
  everywhere.
- **Receive closes when the payment arrives, not only when the node announces it by name.** The
  handoff used to require the incoming event to carry a transaction id; without it the payment
  landed in Activity but the Receive window stayed open. A fresh incoming payment now counts while
  Receive is open, whatever route reported it.
- The Receive screen no longer confirms "Your wallet address" beneath the address it is showing.

## [0.0.11.01] - 2026-09-01

**The first release line.** Development ran to `0.0.10.115`; the version people will see starts here
rather than advertising a hundred and fifteen internal iterations. Nothing in the app changed with
this renumbering. Android `versionCode` continues upward, from `10115` to `11001`, so updates still
install over existing ones.

Everything the `0.0.10` line built is in this release:

- Your own Minima node inside the app, holding your own keys. No server holds your money.
- Claim test Winiwa, mint xWiniwa one for one, burn it back, send and receive.
- The app draws its own lists, pickers, confirmations and messages. Nothing is handed to an
  operating-system dialog, and a confirmation the app cannot draw is answered no rather than assumed.
- The phone is only kept awake while you have the app open or a transaction is settling.
- The wallet shows the balance it last proved, and when, instead of a blank while it catches up.
- Amounts stay where you put them, with one keyboard.

## [0.0.10.115] - 2026-09-01

- **The wallet shows the balance it last proved, and when.** Opening the app after a break showed
  `Syncing…` and nothing else until the node caught up, which is honest but reads as broken. The
  wallet now shows the last balance it actually proved, in the quiet style it uses for anything that
  is not live, with the time it was last seen. It is never presented as current, it is dropped after
  seven days, and Send, Claim, Mint and Burn stay switched off until a fresh proof arrives.
- The website download version, the app's own idea of the newest release, and the Android update
  manifest now have to agree with the build, and a check refuses the mismatch. The download button
  had been advertising a version from June.

## [0.0.10.114] - 2026-09-01

- **The stray status message is gone.** A small green `Up to date` pill placed itself beside the top
  bar's status dot. Most pages no longer have a top bar, so it had nothing to anchor to and appeared
  half off the bottom-left corner of the screen, usually under the Faucet. It is removed rather than
  repositioned: the network status surface already says this, and it says it all the time, including
  when the news is bad.

## [0.0.10.113] - 2026-09-01

- **One keyboard, and it is the phone's.** The app carried its own keypad for amounts so that a
  general-purpose keyboard would not cover half the screen. On the device it never replaced that
  keyboard, it joined it: Android does not reliably honour the suppression the keypad depended on,
  so both appeared at once. Two keypads is worse than the one we were improving on, so ours is gone
  from every build. Amounts keep their right alignment and their thousands separators.
- **The app stops keeping your phone awake when you are not using it.** The node held a wake lock
  for as long as it ran, including hours in the background, which is why Stables was the largest
  consumer of battery on the device. The CPU is now held awake while you have the app open, so an
  incoming payment is still noticed immediately, and for five minutes after any transaction you
  submit, so nothing in flight can be stranded. Otherwise the phone is allowed to sleep. A redundant
  Wi-Fi lock was removed at the same time.

## [0.0.10.112] - 2026-09-01

- **An amount stays where you put it, and only the app's keypad opens.** The right alignment was
  hanging off the field's keyboard hint, which the keypad changes while it owns the field, so the
  number jumped to the left the moment it was tapped. Alignment now follows the field itself. The
  phone keyboard was also being asked for before the keypad could decline it; the refusal is now
  settled at startup, so there is no moment at which the system keyboard can appear.
- **The desktop app reads as one centred column.** Supporting information follows the task it
  supports instead of floating in a second column, and the page's own controls are centred with the
  rest of it rather than sitting against the left edge. Every region, its order and its content are
  unchanged.
- **The Mint chart says `Graph coming soon`** instead of `Unavailable.`
- Links to GitHub now point at the Stables application repository.

## [0.0.10.111] - 2026-09-01

- **v0.0.10.111 - the accent marks the recommended action, and nothing else.** The full-width layout
  class was listed in the primary role's colour rule, so every full-width action was painted the
  accent whatever its role. Eleven quiet reference links across My shop, Council, Updates and Legal
  came out solid cyan, and the Legal page's seven-row section index became one unbroken accent slab.
  Width and role are separate things; only the role decides the colour now.
- A list of identical rows inside one card is understood as a list, so a section index no longer
  reads as controls that have lost their spacing. The spacing rule is unchanged everywhere else and
  still catches two different controls that touch.

## [0.0.10.110] - 2026-09-01

- **v0.0.10.110 - a dropdown built later is still drawn by Stables.** App-drawn lists were applied
  by a timer that gave up ten seconds after launch. Ambassador, My shop and Feedback build their
  forms the first time they are opened, so anyone who reached them later than that got nine native
  lists and, on Android, the operating system's own picker. Enhancement now follows the page itself,
  so a control is app-drawn whenever it appears.
- The runtime gate found this immediately after it learned to look, and a contract check now pins
  the rule.

## [0.0.10.109] - 2026-09-01

- **v0.0.10.109 - Stables draws every list, picker, confirmation and message.** The custom Activity
  date range used the Android date picker; burning xWiniwa, combining wallet notes, removing a
  merchant's transactions and resetting the Council profile were confirmed by system dialogs, and
  several failure messages ended in one. All of them now use the app's own controls and its own
  confirmation and notice surfaces.
- **A confirmation the app cannot draw is answered no.** Three of those paths previously continued
  as if the person had agreed whenever no dialog channel existed, which could burn xWiniwa or delete
  local history unasked. Every one of them now refuses instead.
- **Leaving the custom period clears the custom range.** Choosing a different period hid the date
  controls but kept filtering by them, so Activity showed a narrowed list under a period that said
  otherwise.
- **The rule now has a check behind it.** The platform-drawn surface count was recorded but never
  compared, and it only ever read `index.html`, so twenty-two operating-system surfaces inside the
  asset scripts were invisible to the one gate written to find them. It now reads every shipped
  script, ignores comments, names the offending file, and holds the count at zero in both the static
  and the runtime gate. Five unreferenced route modules that still shipped in every archive and APK
  are retired.

## [0.0.10.108] - 2026-09-01

- **v0.0.10.108 - amount fields support tap-position editing.** The app keypad keeps amount inputs
  editable while suppressing the system keyboard, so a person can tap between digits, move the
  caret, replace a selection, and delete at that position. Grouping preserves the selected logical
  position and the original input mode returns when the keypad closes.
- **App-drawn controls retain their vertical spacing.** Enhanced dropdown wrappers now inherit the
  source control's registered layout utilities. This restores the intended space between Mint's
  asset selector and Mint/Burn control and prevents the same loss across other pages. The runtime
  gate checks all 25 pages at four widths for dropped wrapper spacing and touching stacked controls.

## [0.0.10.107] - 2026-08-31

- **v0.0.10.107 - every editable field has a visible insertion caret.** Text, numeric, search,
  password, telephone, URL, email, and multiline fields now use the registered cyan focus colour
  for the caret instead of inheriting the white text colour that disappeared on Android. The
  four-viewport runtime UI gate now checks this on every visible editable field across all pages.

## [0.0.10.106] - 2026-08-31

- **v0.0.10.106 - standalone Terminal controls remain operational after live-log use.** Terminal
  commands now use the standalone app's private RPC bridge directly instead of entering the generic
  MDS callback path, and every command restores the prompt after a bounded success or failure.
- Pausing or locking the live log aborts its in-flight request. Clear immediately empties both
  command and live output, clears the native diagnostic ring, and cannot be undone by a late fetch.
  The live surface transfers only its newest 200 lines, avoids unchanged DOM rewrites, and caps
  rendered text so log activity cannot monopolize the mobile WebView.

## [0.0.10.105] - 2026-08-31

- **v0.0.10.105 - the standalone node Terminal is one conventional console.** Command output and
  the optional live node log now share one bounded, scrollable terminal viewport. A full-width
  prompt stays attached below it, with compact Run, Live log, Copy, and Clear controls.
- Enter runs a command, Up and Down recall recent commands, and Ctrl or Command plus L clears the
  console. Commands remain serialized while the embedded node responds, and terminal output is
  bounded so a long session cannot grow the page indefinitely.

## [0.0.10.104] - 2026-08-31

- **v0.0.10.104 - standalone Resync now describes its scope accurately.** The acknowledgement
  explains that Resync replaces the app's local blockchain copy while preserving the existing Vault
  key and Stables data. The settings page no longer claims that a Vault-key backup is part of this
  wallet-preserving operation.
- The post-restart Resync status stays hidden instead of prematurely claiming completion while the
  node continues updating through the normal network-status surface.

## [0.0.10.103] - 2026-08-31

- **v0.0.10.103 - standalone settings and Activity controls are simplified.** The standalone app
  removes the redundant Node connection row whose Manage action returned to the same settings page.
  The chain-recovery section is now named Resync.
- Activity now follows the registered search-first data-index composition. Search, Direction,
  Currency, Period, and Sort by are presented as coherent labeled groups, with selected segmented
  controls exposing their state to accessibility tools.

## [0.0.10.102] - 2026-08-31

- **v0.0.10.102 - hidden transaction values no longer flash through the privacy eye.** Privacy mode
  now suppresses transaction-row, settling-balance, and balance-update animations. Its mask also
  keeps authoritative priority over animated opacity and text-shadow, so live Activity refreshes
  cannot briefly brighten a hidden number.

## [0.0.10.101] - 2026-08-31

- **v0.0.10.101 - View progress remains open while a transaction settles.** Live Activity refreshes
  now distinguish transaction details from the explicitly opened progress surface. The tracker keeps
  updating in place and remains visible until the user closes it instead of being replaced by the
  details page on the next node refresh.

## [0.0.10.100] - 2026-08-31

- **v0.0.10.100 - block zero is a loading state, never a displayed chain height.** The standalone
  network panel and sync pill now say `Syncing` until the node proves a positive block height. This
  prevents the embedded node's startup value from looking like a completed chain state while its
  saved tree is still loading or the guarded MegaMMR repair is running.

## [0.0.10.99] - 2026-08-31

- **v0.0.10.99 - block-zero repair waits for the embedded node.** Physical phone verification of
  v0.0.10.98 found that the automatic check could run while the Minima startup flag was still
  false, then exit without retrying. It now retries every five seconds for up to two minutes before
  reading the authoritative block height and entering the same preflight-checked MegaMMR path.

## [0.0.10.98] - 2026-08-31

- **v0.0.10.98 - automatic standalone MegaMMR bootstrap.** After startup, the standalone app
  detects a block-zero embedded node, validates the configured MegaMMR source, and performs one
  wallet-preserving resync automatically. This repairs a chain with no crossover without requiring
  the person to find the manual recovery control.
- The automatic path is attempted once per installed version, never supplies or replaces a Vault
  phrase, and leaves a failed source safely at block zero for a manual retry or endpoint change.

## [0.0.10.97] - 2026-08-31

- **v0.0.10.97 - wallet-preserving MegaMMR chain resync.** The standalone Repair synchronization
  flow now uses `megammrsync action:resync` without a phrase, so the current wallet and Vault key
  remain unchanged while a MegaMMR-enabled node supplies a current chain and wallet coin proofs.
- Before Minima can reset local chain state, Android downloads and validates a complete MegaMMR
  response for the current wallet. An ordinary peer, unreachable endpoint, or invalid response
  fails without changing the local chain. The selectable default remains
  `spartacusrex.com:9001`.
- The recovery screen states the evidence boundary explicitly: MegaMMR restores wallet coins, not
  old application records or historical tracked-script state.

## [0.0.10.96] - 2026-08-30

- **v0.0.10.96 - archive capability is checked before chain replacement.** Stables now sends a
  read-only archive protocol probe to the chosen endpoint and requires at least one archive block
  before it permits Minima's chain-resync command to reset local chain data. A reachable ordinary
  peer or MegaMMR node, including one that returns only a cascade, fails safely without changing
  the local chain.
- The inline status distinguishes Checking, Resyncing, Restarting, and Failed. The requested
  `spartacusrex.com:9001` default remains visible and selectable, but it cannot pass the destructive
  boundary unless it actually starts serving archive blocks.

## [0.0.10.95] - 2026-08-30

- **v0.0.10.95 - honest archive recovery completion.** The selectable standalone chain-resync
  flow now distinguishes an archive-enabled source from an ordinary peer or MegaMMR node. A peer
  that answers the protocol but returns zero archive blocks is reported as unsuitable instead of
  leaving the app in a permanent Resyncing state or claiming success.
- After the archive command finishes, Android now retires the stopped embedded-node service,
  clears its stale Main instance, and relaunches a fresh node. Failure evidence survives that
  restart, while a source that supplied archive blocks advances through the normal restart and
  updating lifecycle. The requested default remains `spartacusrex.com:9001`, and the endpoint
  remains user-selectable.

## [0.0.10.94] - 2026-08-30

- **v0.0.10.94 - selectable standalone chain resync.** Settings and updates now exposes a
  standalone-only Repair synchronization flow for an embedded node that is too old for ordinary
  peer catch-up. The recovery endpoint is user-selectable and defaults to
  `spartacusrex.com:9001`.
- The Android boundary accepts only a validated `host:port`, constructs the wallet-preserving
  `archive action:resync` command natively, and cannot accept a seed phrase or arbitrary node
  options. The page states the exact local-chain replacement and restart scope and requires the
  user to acknowledge a Vault-key backup before starting.
- The long-running resync persists its lifecycle across activity recreation and relaunches only
  after the old embedded node has completed shutdown, avoiding a restart into a stale node
  instance.

## [0.0.10.93] - 2026-08-30

- **v0.0.10.93 - standalone connection-boundary and sync recovery.** The standalone Android
  runtime now removes the external Core connection destination from its menu instead of relying
  on the HTML `hidden` attribute, which the menu's author CSS could override. Web, MDS, and the
  Core-connected Android runtime retain their applicable connection controls.
- The embedded-node service now starts with the current MegaMMR bootstrap peer and refreshes both
  that peer and the maintained public peer list after every service start and periodically while
  running. This also covers boot and in-place-update starts that bypass the launcher activity.

## [0.0.10.92] - 2026-08-30

- **v0.0.10.92 - clean Faucet footer state.** Removed the StablesAgent control's obsolete
  hover-only `×` removal glyph. Touch browsers can retain a synthetic hover after tapping a nearby
  bottom-menu item; the glyph could therefore appear as stray clipped text over the Faucet icon.
  The floating control remains draggable and can still be shown or hidden from the agent panel.

## [0.0.10.91] - 2026-08-30

- **v0.0.10.91 - exact faucet settlement.** The faucet now records the prepared transaction's
  immutable `transactionid` before posting, ignores txnpost's provisional pre-mining `txpowid`,
  and resolves confirmation through bounded exact-ID history lookups. A pending faucet row from
  an older build resumes from that same immutable ID after restart; no recipient, amount, or
  covenant-shape matching is used. A legacy row that retained no immutable ID is moved out of the
  perpetual Broadcast state into an explicit needs-review state instead of guessing completion.
- Added `txnexport` to the standalone embedded-node command allowlist so the app can record this
  immutable identity before the asynchronous mining step.

## [0.0.10.87] - 2026-08-30

- **v0.0.10.87 - continuous Android app ground.** Both the embedded-node standalone app and the
  Minima Core companion now paint the executable Stables ground (`#16334f`) across the Android
  system splash, native window, standalone node-start screen, host layout, and first WebView frame.
  This removes the black loading surface without changing the shared product UI or either app's
  node boundary.

## [0.0.10.86] - 2026-08-30

- **v0.0.10.86 - explicit Core Android platform boundaries.** The Core companion declares camera
  hardware optional, so QR photo and live-camera support do not exclude devices without a camera.
  Its dynamic response receiver now uses Android's explicit cross-package exported flag on every
  supported version, while retaining the target-package and registered Minima-identity checks
  before accepting Core responses or notifications.

## [0.0.10.85] - 2026-08-30

- **v0.0.10.85 - distinct Android and MiniDapp identities.** The embedded-node package remains
  **Stables**, the native Minima Core companion is now **Stables for Minima Core**, and the MDS
  package is **Stables MiniDapp**, so testers can distinguish all three installed surfaces. The
  standalone menu no longer exposes the inapplicable Core-connection destination; its built-in
  node status and controls remain under Settings and updates. The standalone manifest remains free
  of `minimaapi`, while the Core companion remains the only package registered through Minima Core.

## [0.0.10.84] - 2026-08-30

- **v0.0.10.84 - resilient live Wallet receive and Android QR camera.** An expired Wallet
  proof is now an active Syncing state that immediately retries the node instead of becoming a
  terminal Stale label. Exact NEWTXPOW ids survive the mirror's initial-history race, and a
  matched incoming broadcast closes Receive, returns to Wallet, refreshes Recent activity, and
  brings that section into view without waiting on a redundant ten-second lookup. The draggable
  StablesAgent action now owns its touch gesture instead of scrolling the mobile page. The
  Core-connected APK adds the same trusted-origin live-camera permission and QR-photo chooser
  bridge already present in standalone Android, while retaining its no-INTERNET boundary.

## [0.0.10.83] - 2026-08-30

- **v0.0.10.83 - verified standalone Android updates.** Standalone Android updates now require
  an exact SHA-256, accept only approved HTTPS release origins, and verify the downloaded APK's
  package identity, increasing version code, and signing certificate before Android can open it.
  The app reads a dedicated release manifest and cleanly stops the embedded node before handing
  the verified APK to Android's installer. Existing application data remains in place during a
  same-package, same-signer update.

- **v0.0.10.82 - one standard desktop page width.** Ordinary single-column desktop pages now
  share the centered 720px measure wherever their structure permits. Focused transaction tasks
  remain at 560px and genuine multi-region compositions retain their registered frame geometry.
  Actions on the wider standard pages keep their natural maximum instead of stretching into
  720px slabs. Routes, fields, content, data, and transaction behavior are unchanged.

- **v0.0.10.81 - bounded Wallet and My Assets order.** Wallet now uses the centered 720px
  reading measure on desktop, keeping asset names, balances, and activity close enough to read as
  one account column. The desktop-only Wallet destination now leads My Assets immediately before
  Mint and burn, while Testing phase still opens with Faucet. Wallet content, routes, balances,
  activity, and transaction behavior are unchanged.

- **v0.0.10.80 - pages centered in the canvas.** Every desktop page frame remains centered in
  the available canvas, and every bounded single-column form or reading treatment now centers
  within that frame at every width. Genuine multi-region layouts remain centered as complete
  compositions. Page content, navigation, controls, data, and behavior are unchanged.

- **v0.0.10.79 - Wallet activity follows Assets.** Recent activity now remains beneath the
  Assets section in the Wallet at every viewport width. The desktop `home` treatment and runtime
  audit enforce the same vertical flow while preserving all balances, assets, activity data,
  navigation, and transaction behavior.

- **v0.0.10.78 - Faucet first in the side menu.** The existing Testing phase and Faucet section
  now precedes every other destination, including the desktop-only Wallet row. Its route, icon,
  description, and faucet behavior are unchanged. The application-map gate now requires Faucet
  to be the first destination on both mobile and desktop menu projections.

- **v0.0.10.77 - inline xWiniwa mint commitment.** The Mint page now keeps its exact You send and
  You receive values beside the transaction action. The primary label repeats the amount as
  `Confirm mint ... xWiniwa` and executes the existing confirmed transaction path directly,
  without opening the former confirmation modal or a native browser prompt. A failing-first Mint
  behavior check now protects the inline commitment and direct-confirmation boundary.

- **v0.0.10.76 - one Preferences icon language.** The desktop Language control no longer paints
  its full 48px accessible action target as an oversized icon. The target remains intact, while
  its visible globe now uses the same 28px glass mark as every other rail item. The desktop audit
  compares its rendered geometry and treatment with a peer rail icon on every route and width.

- **v0.0.10.75 - desktop navigation and connection choices (founder direction).** The desktop
  build label now reads Desktop beside APK and MiniDapp. Its navigation rail is on the right,
  keeps direct navigation on the first collapsed-icon click, expands only when the current icon
  is clicked again, moves Language into Preferences, moves the version to the rail bottom, and
  removes the duplicate agent shortcut from the rail head. Selected-route headings remain in the
  accessibility tree but no longer repeat visually in the page canvas. Send restores the existing
  exact-amount multiple-recipient builder on desktop. Connection now presents in-app, embedded,
  and external-node choices: external RPC is restricted to loopback, while embedded selection is
  enabled only when an installed Stables Desktop host advertises the required capability.

- **v0.0.10.74 - My profile, structure walk (founder: let's work on the page My profile).** Four
  findings, each fixed at the mechanism that produced it rather than on the element it was noticed
  on. (1) THE BOTTOM MENU HAD NO THIRD PLACE: the rows read First, Second, Fourth, Fifth, because
  the fixed Wallet slot had been deleted from the sequence instead of standing down inside it. A
  sequence with a hole reads as a fault. Wallet now keeps its own third row, stood down, so the
  caption "Wallet always stays in the middle" is SHOWN and not merely asserted. (2) ONE CAUSE
  produced the page's two worst alignments: `.ui-row-stack` already says a stacked row's control
  spans its column, but the app-drawn dropdown copies `ui-row-control` onto its own wrapper and so
  restated the 190px bound at higher specificity, leaving a 190px control under a full-width label
  and a full-width divider, aligned to nothing. One shared rule fixes the bottom-menu selects and
  the custom-currency select together, and the desktop audit now measures every stacked row's
  control against its column (proven against the defect first: 190px in 560px at all four widths,
  4 findings, then green at 128 observations). (3) The council picture was a RAW BROWSER FILE INPUT
  in OS grey while the bank picture two sections above did the identical job with the app's own
  action; it now uses the same Choose image action and filename line, and the four inlined
  declarations both had copied became one registered `ui-file-name` class. (4) RESET, the one
  control that throws work away, held the full-column span on a page that has no commit action at
  all, because every field saves as you edit; it takes its natural width now. The same fact was
  also written two different ways in two footnotes and is written once.

- **v0.0.10.73 - a waiting message says why (founder: it still shows sending after all these
  minutes).** My bug: the retry loop returned early when there was no node, so a queued message
  never re-attempted and never updated - it sat on "Sending…" forever with no explanation. Now the
  retry runs even with no node (that being exactly the stuck case), every attempt records its
  outcome on the row, and the row states it plainly: "Waiting for your node" when the node is not
  connected, "Waiting for them" when the recipient has not opened messaging yet, "Sending…" only
  while an attempt is genuinely in flight. Nothing is lost and nothing pretends: the message still
  leaves by itself the moment the obstacle clears, and its row is promoted in place.

- **v0.0.10.72 - the conversation reads like a messenger (founder: make sure the visual is right).**
  Your own messages repeated your avatar on every line and sat at inconsistent distances from the
  edge; bubbles were cramped and one narrow bubble clipped its word. Now: your messages hide your
  own avatar (you know who you are) and align to ONE right edge with a real gutter; theirs keep
  their avatar on the left; bubbles have proper padding, wrap long words, and are bounded at 78%
  of the pane; and the time - or "Sending…" - sits under each bubble on its own side. Measured
  after the change: own bubbles align at a single right gutter, theirs at a single left one.

- **v0.0.10.71 - you write, it is sent (founder: no key business in the way).** Pressing Send used
  to be refused when the recipient's key had not appeared yet, or when the node was not connected -
  both of which are the app's problem, not the person's. Now the message is written into the
  conversation IMMEDIATELY (marked "Sending…"), the composer clears, and delivery happens as soon
  as it can: at once if everything is ready, otherwise on the next scan cycle once the key appears
  in the on-chain directory, arrives with their first message, or the node reconnects. When it
  goes, the row already on screen is promoted in place - it keeps its position and simply stops
  saying "Sending…" - so nothing is duplicated and nothing is lost. This is exactly how a message
  written with no signal behaves in any messenger, and no key or node wording reaches the surface.

- **v0.0.10.70 - adding a contact always works (founder: we should have it working directly).**
  Pasting a Minima address whose key was not yet in the directory was REFUSED, which is a dead end
  for the most ordinary case: you have someone's address and they have not opened messaging yet.
  Now the contact saves immediately and the conversation opens; the contact is simply PENDING its
  key, shown as "Waiting for their key" in the list. The key then resolves by itself two ways: the
  on-chain directory is re-checked on every scan cycle, and a first message from them carries their
  Minima address, so their key is adopted the moment they write. When it resolves, the conversation
  and its history migrate from the address to the key with nothing lost. Only SENDING waits, with
  one honest line instead of a refusal at the door.

- **v0.0.10.69 - a name is optional; renaming is always possible (founder).** New chat no longer
  demands a name: paste an address and the conversation starts, with the person shown by their
  address, shortened for reading (the avatar takes its letter from the address too). The field is
  labelled "Name (optional)" and invites rather than blocks. Naming is never lost: the conversation
  menu gains RENAME, which turns the conversation title into an input in place - Enter saves, Escape
  cancels, and the list updates immediately - so a contact can be named or renamed at any time.

- **v0.0.10.68 - a plain Minima address is enough to start a chat (founder: this address is good).**
  Pasting a bare `Mx…` was refused, because a message must be encrypted to the recipient's key and
  an address carries none. Rather than force people to exchange a compound code, the app now
  publishes ONE tiny KEY DIRECTORY entry on-chain - a dust coin at the same chat covenant whose
  state announces, in the clear, "this Minima address uses this chat key" (port 98; port 90 keeps
  the node key so the same ownership rule applies). Nothing private is exposed: an address and a
  public key are what a person hands out anyway. Pasting a bare address now looks the key up in
  that directory and starts the conversation; if the person has never opened messaging the refusal
  says exactly that. The entry publishes once when messaging starts (checking the chain first so it
  never spends twice), republishes when you change your id, and is EXCLUDED from message
  housekeeping so it outlives the message window. Proven end to end on the dev chain: published,
  then resolved from a bare address to the correct key.

- **v0.0.10.67 - chat search no longer collapses to an empty box (founder).** The search field
  shared one row with Share-my-id and New-chat and got squeezed to nothing on a narrow pane. It now
  takes its own full-width row below the two actions, so it always shows its placeholder and is
  usable at any width.

- **v0.0.10.66 - chat list is now a real contact list (founder batch).** It merges the app address
  book, so every saved contact appears in chat, deduplicated by Minima address or name; a contact
  from the book that has no chat address yet is shown and tapping it opens New chat pre-filled with
  their name, ready for the address they share. A search bar filters the list by name. Each contact
  can be HIDDEN (from the conversation menu), and a "Show hidden (N)" toggle appears at the bottom of
  the list to reveal them. The conversation header gains an options menu with Hide, Delete chat
  (clears the messages, keeps the contact) and Delete contact (removes both), each confirmed. The
  redundant "Chats" heading is removed - the page title already says Chat.

- **v0.0.10.65 - the shared address leads with your Minima address (founder: why not share the Mx
  address here?).** The bundled address showed the encryption key first (`0x…`), so it read as a
  hex key rather than your address. It now leads with your Minima (Mx) address and appends the
  sealed-box key (`Mx…~0x…`), so what you share and copy reads as your address while still carrying
  the key a message must be encrypted to. Parsing classifies each part by shape, so either order -
  and a bare address or bare key - still resolves; addresses shared before this change keep working.

- **v0.0.10.64 - segmented controls redesigned at the root (founder: still not satisfied with how
  we present consecutive choice buttons; make it cleaner like The Pool).** The selected segment was
  a faint tint plus a thin underline, which read as confusing. It is now a SOLID FILL on a recessed
  track - the choice reads at a glance - with the accent for a neutral/positive segment and the
  light-red consequence for a destructive DIRECTION (burn / sell), keyed off data-side. The change
  lives in the lit language and the adoption layer, so it ripples to EVERY segmented control:
  Single/Bulk orders, Buy/Sell, Market/Limit, the activity and merchant filters, and Mint/Burn.
  Mint page, same slice: the ASSET is chosen on top (founder), the Mint/Burn direction becomes that
  same segmented control with a coin and a flame icon in the two buttons and Burn in light red, and
  on desktop the supporting chart pins to the TOP of the form region (grid-row 1) instead of
  floating down the page (founder: put it up, level with the elements on the left). The desktop and
  contract audits enforce the new mint control via an updated pin.

- **v0.0.10.63 - two-pane messenger + the minimaMail identity model (founder: build it in two
  columns like every messaging app; use the Mx and share it in the profile).** The chat is now
  two panes: on desktop the contacts list sits on the left and the open conversation fills a wide
  pane on the right (the conversation is no longer a modal - it is an inline pane); on a phone the
  two stack and the page shows one at a time, list then conversation with a back control. Chat is
  registered as a two-pane workstation in the desktop-web layer so its layout spans the frame
  rather than the reading measure, the same mechanism the Trade workstation uses. Identity now
  follows minimaMail: your shareable ADDRESS bundles your sealed-box encryption key WITH your
  Minima receiving address (`0x<key>~Mx<address>`) under one word - address - so one thing lets a
  contact both message AND pay you (founder: do not invent different terms for the same thing);
  the profile shows your address (QR + copy); adding a contact pastes their address, and a bare Mx
  is refused with a reason (a message must be
  encrypted to their key, which the code carries). Sent messages now include your Minima address
  too, so a first message teaches the recipient how to pay you back.

- **v0.0.10.62 - change-id is a direct inline confirmation, not a full screen (founder).** Tapping
  Change id in the profile dialog now swaps the action row in place for a short warning and a
  Change-id / Cancel pair - no second screen opens. This doubles as the app's first COMPACT
  confirmation: until now the only confirm (stablesConfirm) was hardwired to the full-screen
  modal shape, which is why a yes/no felt like a whole page. Recorded as the missing pattern to
  register (compact confirm vs full-screen task) in the coherence assessment below.

- **v0.0.10.61 - chat gets the real messenger shape (founder: list + full conversation box; the
  profile is triggered to share, not shown constantly).** The identity card and the stacked
  thread section are gone. The chat page IS the conversation list now - one clean screen. Tapping
  a conversation opens a full conversation SCREEN (the app's screen-modal pattern): back arrow,
  contact name, a scrolling message column, and the composer pinned below, auto-scrolled to the
  latest. Your personal profile is no longer permanent chrome - "Share my id" opens it as a
  QR-plus-copy-plus-change dialog only when you choose to share, and "New chat" is a small dialog
  too. Sending scrolls to the newest message; opening a chat lands at the bottom. This is the
  standard messaging-app structure (list screen / conversation screen / share-profile action)
  instead of everything stacked on one page.

- **v0.0.10.60 - the chat becomes a real messenger (founder: make it like a really messaging
  app; give me the id as QR, copy it, and let me change it).** Three parts now: **You** - your
  chat id rendered as a scannable QR (reusing the app's own QRCode library, no CDN) with Copy and
  Change-id; the id is still seed-derived so it survives a reinstall from the same seed, but a
  rotation index folded into the derivation lets you change it at will (with a clear warning that
  contacts need the new id). **Chats** - the conversation list, one row per person with avatar,
  name, time and last-message preview, most-recent first, plus a New-chat form. **Thread** - the
  open conversation with its messages and composer living together like a real app, an "All chats"
  way back, hidden until a chat is chosen. The list, QR and identity now render on every
  navigation to the page (a missing nav hook had left them blank until an action fired), and the
  message time is formatted cleanly (was showing a stray trailing colon). The address book remains
  the Contacts page; folding the chat id into the contact record so the two share one people list
  is recorded as the next slice.

- **v0.0.10.59 - multiple contacts, multiple conversations (founder: a setup with many contacts
  and chats at once).** The single-peer field from D1 scaffolding is replaced by a real messaging
  structure: a Contacts section listing every saved person (name + a preview of their last
  message, the active one highlighted) with an add-contact form; a Conversation section titled
  with the open contact and filtered to only their messages; and a composer that targets the
  selected contact (Enter to send). The load-bearing design fact: a sender CANNOT reopen a
  message sealed to the recipient, so outgoing messages are stored locally at send time tagged
  with who they went to - that peer tag is what groups conversations, and scanning now handles
  incoming (openable) coins only. The bug behind "Invalid contact chat id" is fixed at the input:
  pasting a Minima Mx address where the 0x chat id belongs fails with "A chat id starts with 0x
  and is 64 characters - not a Minima (Mx) address." Contact rows are a registered list component;
  the page keeps its even four-section rhythm (walk: 0 bare, 0 drift).

- **v0.0.10.58 - chat page aligned to the app's structure.** The D1 chat surface was assembled in
  a hurry and broke the page rhythm: the chat-id card was crammed above the Conversation title in
  one malformed section (stray closing divs), and the composer was stranded in a far section with
  a large empty gap. It is now three clean sections - Your chat id, Conversation, Send a message -
  each a standard app-section with its own stitle, one shared 24px rhythm and quiet dividers, the
  same shape as Activity, Council and every other page (walk: 0 bare actions, 0 appearance drift,
  even section gaps). Also this session, no app change: the two-independent-node encrypted
  conversation was proven across the dev chain, closing D1's transport (CHAT_ONCHAIN_PLAN D1 PROOF).

- **v0.0.10.57 - on-chain chat, D1 web transport (built and proven).** The messaging platform
  from CHAT_ONCHAIN_PLAN is real code now, behind a Settings toggle (off by default). A message
  is a Winiwa dust coin sent to a shared RECLAIMABLE covenant address with a libsodium-sealed
  blob in coin state port 99 and the sender node key in port 90; the inbox is the set of coins
  at that address the recipient key can trial-decrypt. Identity derives from the node seed
  per session over the app own node connection (the node is the keychain - nothing persists
  in the WebView). Proven end-to-end on the dev chain: the sealed-box crypto round-trips and
  rejects the wrong key (vendored, no CDN); a real coin carried an encrypted message that the
  recipient decrypted and an unrelated key could not; and the covenant reclaim-after-N path
  spent an aged message coin so it LEFT the coin set - the chain forgets, exactly as the
  no-inflation design requires. The chat page gains an honest chat-id card and a working
  composer (no success toast - the appearing row is the feedback); auto-reclaim of your own
  aged messages runs as default housekeeping, never a setting. Not yet: two-independent-node
  proof (peer node was down), image downscale send (D1 remainder), payment bubbles (D2), phone
  notification setting (D3). Full evidence: CHAT_ONCHAIN_PLAN.md D1 PROOF.

- **v0.0.10.56 — the chat is real or it is empty (founder: no demo conversation).** The three
  staged bubbles (Alex, dinner, thanks) are deleted; the conversation region now shows an honest
  empty state and an id-addressed message list waiting for real rows, and the composer's Send
  refuses honestly with a toast until the transport ships (no surface hidden, no pretending).
  The transport direction is decided from a source analysis of minimaCore's minimaMail: it is
  FULLY ON-CHAIN — every message is a 0.000000001 MINIMA coin to a shared CHAINMAIL address with
  the libsodium-sealed blob in coin state port 99; the inbox is the set of coins at that address
  your key can open (trial-decrypt); identity derives once from the node seed; the node is dumb
  transport; auto-replies are rate-bounded because every reply costs a real coin and a WOTS key
  use. That is the same state-coin pattern as our proven rolling book anchor, needs no Maxima,
  no relay and no hosted service, and therefore satisfies the dependency-free protocol law.

- **v0.0.10.55 — one rate language, one information set (founder: use Rate as on the exchange
  page, consistently; show the amount received everywhere there is an exchange).** The mint and
  burn tabs drop their one-direction "xWiniwa price" row for the exchange's flippable Rate row —
  tap it to read "1 xWiniwa = R Winiwa" or the opposite direction, one shared flip state across
  both tabs, one renderer. The Winiwa spot-price row stays (it is a different truth). The
  generalisation is now law: M-CMP-TRANSACTION 1.2.0 states the information set every conversion
  surface presents before commitment — available balance, one flippable Rate row, and the amount
  received (result row where computed, You-receive field where enterable; a prose estimate is
  not a substitute). Surveyed all five conversion surfaces: mint, burn, exchange and the wables
  forms conform; the trade ticket states its receive amount only inside a prose sentence and is
  queued for recomposition in the walk report. The price-display-currency setting's sub-line
  stops naming the removed row.

- **v0.0.10.54 — the commit of a destructive direction wears the consequence (founder: mint
  burn and other other-side action boxes go light red).** The lit language already stated the
  principle for destructive OPERATIONS ("a destructive action is never the accent", the
  .btn-danger rule); it now states it for destructive DIRECTIONS too: a transaction commit
  carrying `data-side="burn"` or `data-side="sell"` paints solid light red (#fb7185, dark ink)
  while Mint and Buy keep the accent. The direction truth lives on the control itself — static
  on the two burn commits, written by the ticket's side switch — so the selector, its selected
  state, and its commit now speak one colour language end to end. A first attempt in the
  adoption layer lost silently to the lit language's heavier :not() chain; the rule therefore
  lives in the same lit layer at matching weight, which is the standing lesson about that trap.

- **v0.0.10.53 — a status line is typography, not chrome (founder: rework the ugly input box).**
  The node-connection line under "Minima node" wore the floating-banner treatment — border,
  radius, opaque fill — because one rule painted every `.mx-status` the same, conflating two
  functions: a floating status SURFACE (toast, banner, ticket quote) and an in-row status LINE.
  The rule now binds surfaces only (`.mx-status:not(.set-sub)`), and the in-row line carries its
  truth as a leading state dot instead — green connected, amber connecting, red unreachable,
  quiet grey otherwise — driven by a `data-state` the connection renderer already knew. Banners
  and toasts keep their frame; every settings row now reads in one voice.

- **v0.0.10.52 — the direction speaks its own name; the rows are the toggle.** The mint page's
  icon-only mode switch (coin die and flame) is replaced by the registered worded side choice
  (SEL-006) — the same element the panel toggles and Buy/Sell already use, so one function keeps
  one appearance — and Burn, the destructive direction, now wears the light-red consequence
  colour by the same rule as Sell (the rule covers both sides in one place; the dead icon-switch
  CSS went with it). And the desktop menu now collapses and expands the VS Code way (founder):
  collapsed, clicking any destination icon expands the menu and navigates; expanded, clicking
  the destination that is already current collapses back to the icon rail. The dedicated
  chevron control is deleted, and the desktop audit's collapsed-rail probe toggles the same way
  the user does. Two more founder findings in the same slice: a repeated list entry's navigation
  is a quiet text action, so the three boxed View merchant bars became "View merchant →" text
  actions (M-CMP-DATA-LIST); and the five Where-to-buy-Minima venues stopped wearing full card
  chrome — a venue is a row (name left, market link right, one quiet rule between rows), so the
  list lost its empty spacing while every link keeps the 44px touch target.

- **v0.0.10.51 — the whole-app walk (founder: "walk the whole app, we will review the end
  result").** A new walk instrument measured every route the same way: action appearance
  groups, every distinct type voice, section rhythm, card paint voices, and — the decisive
  detector — actions living OUTSIDE the registered system, invisible to the contract audit.
  The walk found 21 of them and brought every one under the law: the activity filters and
  sorts and the merchant promotions filter were currency pills borrowed as segmented
  controls — they are now the registered peer-state shell (ui-segmented) with the proper
  active state; the four Select all / Unselect all controls are actions, not currency states,
  and became registered text actions; the two on/off-ramp step actions and the two icon
  buttons (hide-amounts, contact book) joined the button system; four one-off action shells
  (.step-action-btn, .wallet-icon-btn, .cpicker-book-btn CSS) are deleted. Re-measured after:
  0 unregistered actions on every walked route (the two remaining flags are the currency
  pill's legitimate home use). Open verdicts recorded for review: one appearance split on
  settings-profile (secondary/compact renders 15px/pad20 in rows but 16px/pad16 standalone)
  and the walk artifacts (work/scratch/walk/*.json) hold the full per-route facts.

- **v0.0.10.50 — assembly walk batch one: four founder findings, each fixed at its origin,
  clause before code.** Three clauses joined the composition registry (all 1.2.0-candidate,
  catalogue rebuilt): a swap pair's direction control sits ON THE SEAM, equidistant between the
  two field boxes it swaps (M-CMP-AMOUNT-ENTRY); a switch swaps the content it governs IN PLACE,
  inside the region the switch heads, never elsewhere on the page (M-CMP-ORDER-TICKET); peer
  entries stack as rows and never wrap into a pile of button-shaped chips, and a repeated card's
  navigation action is compact, never a full-width bar (M-CMP-DATA-LIST). The app then
  implemented them: the exchange flip control measures 0.0px off the seam midpoint (the lit
  language now carries the vertical half of its law; the desktop audit fails at ±2px drift);
  the Bulk orders surface moved inside the ticket panel it always belonged to — the switch no
  longer promises content that mounts below the fold (audited); the six academy topics stack as
  one list at every width; the three View merchant actions are compact, and their dead
  tone-border paint (proven overridden by the lit language, both the old inline version and any
  replacement) is deleted rather than repainted. Also fixed at the root: navigate() crashed on
  every non-tab destination because two unguarded references to the removed `tab-more` element
  survived in openMore/closeMoreNow — both now guard, matching the pattern the rest of the file
  already used.

- **v0.0.10.49 — the inline-style floor is measured, ruled, and recorded (no silent gaming of a
  ratchet).** The display-state slice was analysed to its root and deliberately NOT executed:
  the 85 `display:none/block` markers are the declared initial half of the runtime-visibility
  contract the UI System Reference §5.4 already exempts, and the codebase's show-by-clearing
  idiom (`el.style.display = ''`, ternary `? '' : 'none'` — 30 of 68 candidate ids entangled
  across three scans) makes a CSS migration churn with real regression risk against working
  surfaces. The ruling is recorded in FROM_SYSTEM_TO_PRODUCT_PLAN Phase 3: the target is zero
  UNDECLARED styling, with the exempt state/data floor itemised. What did burn: the mint chart's
  three hand-drawn legend swatches converge to the registered `ui-legend-line` with named
  series-colour modifiers (accent/purple/success — one legend appearance, P6), and six more
  singletons fold into existing utilities on the spacing scale (`ui-relative`, `ui-wrap ui-gap-3`,
  `ui-divider-section`, `ui-col ui-gap-1`, `ui-grid-equal`), taking three off-scale gaps
  (4/6/10×14 px) onto the token scale. Inline styles 361 → 353, every remaining one now either
  exempt state or an itemised defect.

- **v0.0.10.48 — one dialog measure (modal pass step 2 + C2, the one-measure ruling applied to
  overlays).** The dialog-card family carried identical paint fractured over five max-widths
  (400/420/440/460/720). One registered measure now exists — `--modal-dialog-max: 460px` —
  consumed by the welcome dialog contract, the agent-action notice, and the big-QR modal; the
  per-id inline widths are deleted, and their amber/cyan tonal inline styling went with them
  because measurement proved it dead (the lit language already paints these panels flat). The
  sticker sheet alone earns the named `.modal--wide` variant at 720, the reading measure.
  Re-measured after the change: the 27 live overlays form **8 paint groups, the dialog family
  ONE group of 11 at one width**; every remaining singleton is named and justified in the C1
  artifact (white QR panel, panel-token bottom sheet, the two drawers, one hybrid hint card).
  Dead weight out in the same slice: the unused `.ui-modal-notice` rules and — closing plan item
  C2 — the retired hidden par-swap card with its four dead handlers (`tv81SwapConfirmed` stays:
  it is the live exchange's vault-par fallback). Inline styles 368 → 361.

- **v0.0.10.47 — debt burn: 23 inline styles fall (391 → 368), each fixed at its origin, none
  hidden.** Repeated inline patterns are promoted to the system where they belonged: one
  `ui-terminal-output` appearance now owns every monospace log surface (the node-log pane had
  drifted 11px/360px/.55 from the terminal's 12px/320px/.5 — same function, one appearance, P6),
  `ui-terminal-field` the command input, `ui-num-field`/`ui-num-field-xs` the compact numeric
  settings inputs, `ui-avatar-ph` the avatar placeholder glyphs, `ui-lh-relaxed` the generated
  quiz prose, and the component variants `calc-row-rate` and `set-row-quiet` join their base
  components. Two patterns were proven dead by live measurement before deletion: the mint/burn
  reset wrappers (computed values identical without them) and the ramp step-number backgrounds
  (the lit language already forces its glass with `!important`). The exchange micro-labels keep
  only their registered class. Instruments, not claims: all 7 behavior probes (SCR-001..007) now
  hold live evidence in `desktop-observations.v1.json` — drawer scroll measured in the adopted
  sidebar, the agent conversation region, the terminal output contract, and the receive-modal
  probe repaired (it matched the whole button text and the icon glyph broke it silently). Modal
  pass step 1 is measured: 27 live overlays in 11 paint groups by their panel's computed
  contract (never the backdrop), recorded in `overlay-panel-groups.v1.json` — one transaction
  canon already converged, one dialog family fractured over five max-widths awaiting the
  one-measure ruling, outliers named.

- **v0.0.10.45 — THREE MEASURES, nothing else (founder ruling: one common structure; multiple
  column widths hurt the brain and bring only confusion).** The width vocabulary collapsed from
  five arbitrary values (560/640/680/760/900) to three registered measures with roles, declared
  once as tokens and consumed everywhere: **560 the task measure** (money and forms, P7), **720
  the reading measure** (every single-column page; identical to the registered P4 maximum; wide
  media scrolls inside it), **1180 the frame** (spent only where a real second region earns it:
  home, task+context, document+index, workstation). The registry records the ruling; the audit
  enforces it; the widened reading column immediately exposed Council's vote button stretched
  to 356px by its row, closed by the general law that the registered natural maximum binds
  every action in an open region. Revision proposal **R002** (Machinery/revision-proposals)
  moves the whole desktop system into the registries so the maps and catalogues are the origin
  again: the system defines, the app consumes.

- **v0.0.10.45 — an enhancement inherits its host's layout contract (founder: the receive
  format row collapsed to one word per line).** `mx-dropdown` replaces a native select with an
  app-drawn wrapper that was always full width, discarding whatever layout contract the select
  carried. A select bound as a settings row control (`ui-row-control`, one registered width) lost
  that bound on enhancement, the wrapper spanned the row, and the label beside it was crushed to
  a one-word-per-line column. The enhancer now carries the row-control class onto its wrapper,
  and the wrapper honours it. Every enhanced dropdown in a settings row inherits the fix, on
  every platform.
- **v0.0.10.45 — the Academy welcomes with what it is (founder: no serious product greets
  people with bare chips).** The page opens with "Learn to be your own bank": what a topic is
  (a questionnaire you can retake, a star that fills in, the certificate it builds toward),
  that Security is open first and why, and that the five further topics open during the test
  phase. Every sentence states something the page really does today.

- **v0.0.10.45 — a control says what it does (founder: "what are these X... people will just
  walk away").** The confirmation policy's remove control was a bare multiplication-sign box —
  a mystery costing exactly the energy the product exists to save. It is now the app's
  registered quiet text action, named **Remove**, on every platform. The rows themselves gain
  the app's rhythm (12px gaps, the remove aligned to the row's end); their fields were already
  the registered `finput` — the alien look was the layout, not a new input, so no second field
  variant existed to merge.

- **v0.0.10.45 — two founder board findings, two root rules.**
  - **Direction pairs sit side by side (founder: Deposit and Withdraw).** Two commit verbs
    carrying the same registered `transaction` role are peers of one operation, never
    hierarchy, so they row even inside a declared action stack — pinned to the column's edges,
    each at the registered 320px maximum. The .44 stack exemption now protects mixed-role
    stacks only. Trap recorded: a bare `display: flex` left the stack's own `flex-direction:
    column` standing, so the row must state its geometry completely.
  - **Separation is layout, never borrowed chrome (founder: Trade elements touching, no
    structure).** The root: the mobile terminal spaced its panels with borders and card
    surfaces, which the lit language deliberately stands down; stacked on a phone nothing
    shows, but the desktop grid put stood-down panels side by side and the book ran into the
    ticket. Panels that share a row now own their separation as the grid's gap (28x40), the
    market bar anchors the terminal with a clear band before the panels, and the truth panels
    get their own air. Same defect family as the collapsed-rail centring: a reservation must
    live in exactly one place.

- **v0.0.10.44 — structure pass, second rule-class: the pair rule must be pure.** Two defects,
  one mechanism. On My shop, the pair-row rule matched a card holding a label, an input, a
  divider and two buttons, and flattened all of it into one crammed line: **a container holding
  anything besides its two buttons is a content block and never rows.** On Ambassadors, the
  pair's child rule fired inside a declared action stack that the row rule could not convert (a
  grid with its own weight), producing three different widths and alignments in one stack: **a
  declared stack never rows, because a primary above a secondary is hierarchy, not a pair.**
  Ambassadors now reads as three consistent full-width rows on the 560 column; My shop as clean
  form rows. The desktop audit's pair check gained the same distinction (same-role pairs only),
  so hierarchy stacks stop being findings.

- **v0.0.10.43 — the structure-first pass opens with its first rule-class (founder: all pages
  are frustrating to open; fix at the root).** The rule: **a stood-down container family must
  leave rows behind, not floating fragments.** When the lit language stood the card families
  down, repeating collections lost their item boundaries: on Merchants, each promotion's
  kicker, title, meta and action read as four orphans stacked in space. On the desktop surface
  a repeating collection now separates its items with hairlines and keeps one internal rhythm.
  Applied to the promotions collection first; the same rule covers every stood-down repeating
  family as the founder's board walk names them. The pass runs from the **Page structure review
  board** (Maps and catalogues in /work): finding, trace to clause, one shared rule, check that
  fails first, never per page.

- **v0.0.10.42 — the Merchant Cash Exchange card says "Coming soon" (founder), not
  "Unavailable".** The feature is planned; the label now says so instead of sounding broken.
  Same wording on every platform from the one shared source.

- **v0.0.10.41 — the On/off ramp reads in the founder's order, on every platform.** Merchant
  Cash Exchange stays on top, **Where to buy Minima sits directly below it** (it had been at the
  foot of the page), and the technical route follows. In the venue list, **BitMart is removed**
  (the exchange is closing) and two on-chain venues join: **The Pool**
  (github.com/minima-bay/the-minima-pool) and **Pandadex**
  (github.com/eurobuddha/minima-core-apks). The two route-step links that pointed at "venues
  below" now say above. One shared source, so Web, MiniDapp and both Android platforms carry
  the same order.
- **v0.0.10.41 — no block height in the desktop menu (founder).** The sync pill's live state
  painted the chain counter into the sidebar's status cluster, a figure that decides nothing
  there (minimal-information law). While the node is live and healthy the pill stands down on
  desktop; the network dot carries the truth, and the Connect, Connecting and Node issue states
  still surface because those are actionable. Mobile surfaces are unchanged.

- **v0.0.10.41 — the version reads in full in the desktop menu head (founder: display the
  version elegantly, in full).** The mobile pill's own rule reserves fixed space for its
  neighbours (`max-width: calc(100% - 104px)`) and ellipsizes the label, which in the 264px
  sidebar cut "v0.0.10.40" to "v0.0.1...". On desktop the row's arithmetic adds up instead: the
  chip sizes to its content (no ellipsis), the StablesAgent and language controls slim to the
  registered 44px icon size, and the head bar trims its side padding. Verified by measurement,
  not by eye: the label's scroll width fits its client width exactly.

- **v0.0.10.40 — collapsed-rail centring, at the source (founder: make sure the icons are
  centred; how do we make sure these points are solved at the source?).** The marks sat up to
  11px off the rail's centre. Cause: FOUR stacked side reservations (scrollbar space, drawer
  padding, group padding, group hairline margins) squeezed the content box below the 46px row
  width; an over-constrained box cannot centre — its auto margins collapse to zero and then
  negative. The source rule: **one reservation.** `scrollbar-gutter: stable both-edges` gives
  the whole sidebar one symmetric centring reference, and every box between the rail and a row
  keeps zero side padding while collapsed. **The guarantee is a gate, not vigilance:** the
  desktop audit now collapses the rail at every width and fails if any mark or the selector
  ring sits more than 1.5px off the rail's centre, or if a row name is visible while collapsed
  (proven against the defect: it reported 11px, then 3px, then passed). Probe lesson recorded:
  measuring synchronously inside the same evaluate that toggles the class read a stale
  !important resolution in headless Chrome and blamed the wrong rule; the audit lets a frame
  pass between toggling and measuring.

- **v0.0.10.39 — the alignment law, at the root (founder: "the button size here makes no sense,
  it is not aligned with anything... go to the root of that, not fix element by element").** The
  first desktop layer capped every full-width action at 320px, so a commit button aligned to
  nothing: not the fields above it, not the column edge. That cap was one rule producing the
  same defect on every form page. The root law replacing it: **an action aligns to the column it
  lives in.** Inside a bounded task or form column, a full-layout action SPANS the column,
  exactly like the fields above it (this is the registered `M-EL-ACTION` fullWidthRule); in an
  open region it keeps its natural width, at most the registered 320px; an action pair divides
  its row completely so both actions end on the column's own edges. To make the law hold by
  construction, a new **form treatment** fixes form-led pages to the 560px task measure (faucet,
  invoice, feedback, my shop, ambassadors, profile, updates, security, wallet management —
  registry updated), and below 1280 a task page's stacked sections keep the same measure. The
  desktop audit enforces it: any action wider than 320px outside a bounded ≤560px column fails,
  116 observations green at 1024/1280/1440/1920.
- **v0.0.10.39 — collapsed menu refinements (founder).** The selector in the collapsed rail is a
  46px square ring hugging the page mark, not a tall pill stretched around it; hovering a
  collapsed row shows the page's name instantly in a flyout beside the rail (one fixed element
  reading the row's own label, so it can never say the wrong name; it escapes the navigation's
  scroll clipping, which a CSS-only tooltip could not).

- **v0.0.10.38 — six founder directions in one pass.**
  (1) The version status, StablesAgent and language controls sit at the **top of the menu**,
  directly under the brand, exactly where the mobile drawer carries them, with a hairline
  separating them from the destinations. (2) The current destination wears the **outlined
  selector** from the charter navigation: a rounded accent ring drawn with an inset shadow (so
  row geometry never shifts between states) plus a soft outer glow, white text, replacing the
  filled accent pill. (3) **The menu collapses to an icon rail** (76px: the logo and the page
  marks only), toggled by a quiet chevron at the rail's foot, remembered across reloads; row
  names survive as native tooltips, group boundaries become hairlines, and the canvas and
  dialogs follow automatically because they read `--dw-sidebar`. The toggle lives outside every
  page, so the page-scoped capability comparison is untouched. (4) **The Exchange page says what
  it does**: the two groups are named You send and You receive (the retired par-swap card's own
  language returning to the live form, on every surface), available balance and quick amounts
  share the label row, and on desktop the flip control centres between the groups as the
  conversion connector. The commit action and its runtime relabels are sentence case (Exchange
  now). (5) **Selecting Trade highlights Trade**: `navigate()` rewrites the trade route onto the
  shared exchange page before the menu marker synced, so the menu marked Exchange while Trade
  was open; the marker now follows the destination the person chose. (6) **The StablesAgent
  control is visible**: on the navy ground the assistant chip was nearly invisible; on desktop
  it sits on a light chip with a soft lift, and a stale mobile drawer-open state can no longer
  erase it.

- **v0.0.10.37 — desktop sidebar polish (founder: "we can get something with a better look").**
  The sidebar now wears the app's own glass chrome (a faint wash with blur and a solid fallback,
  per the house glass rule) over the ambient field; navigation rows are compact with one small
  uniform glass mark each and **no separators** (spacing and group headings carry the structure);
  group headings quieten to small letterspaced caps; the current destination is a **rounded
  accent pill** with dark text and a dark-tinted mark; the brand block gains its hairline; the
  navigation gains a thin quiet scrollbar. **Trap recorded:** the lit drawer language styles
  `.ditem` / `.dic` / `.dsect-t` with `!important`, so the first desktop restatement lost
  silently (big circular marks, row separators and 16px padding survived the screenshots); the
  desktop rules now carry the same weight. Web surface only; MiniDapp and Android unaffected.

- **v0.0.10.36 — the sidebar's current destination is unmistakable (founder finding: the
  selected tab needed a different highlight).** The faint accent edge bar and soft tint stand
  down; the current row now lights the way the mobile bottom tab always has, full accent with
  the identity layer's dark on-accent text, so one language marks "you are here" on every
  surface (P6). The marker outranks the Faucet row's inline amber tint, and its icon tile goes
  transparent on the lit row.

- **v0.0.10.35 — the desktop web integration is rebuilt from scratch (founder direction
  2026-08-09: take the mobile content and design one complete desktop version, discarding the
  current one).** The new integration is `assets/desktop-web.css` + `assets/desktop-web.js`,
  active only on the webapp surface at 1024px and above; the MiniDapp and APK surfaces are
  untouched at every width (probed: `?preview=dapp` at 1440 keeps the 580px column, bottom tabs
  and topbar; `?preview=webapp` at 390 is unchanged).
  - **Shell.** A fixed 264px left sidebar carries the app's own brand block, its own More-drawer
    as the navigation (compact rows, group headings, one accent-marked current destination), and
    its own status cluster (network dot, version pill, connect pill) — the three nodes are MOVED
    by `desktop-web.js` with placeholders recorded for exact restoration below 1024px, so
    nothing is rebuilt and nothing can drift from the mobile source (P2). The topbar and bottom
    tabs are hidden on desktop; the canvas is all product. Dialogs centre on the canvas.
  - **Treatments.** Every route is stamped with a registered desktop treatment
    (`work/Machinery/projects/stables-desktop-web/desktop-web.v1.json`): `home` (Wallet: balance
    and verbs lead, recent activity beside), `task` (Mint, Exchange: 560px task column, marked
    context beside from 1280), `document` (Legal: 680px measure, quiet section index beside,
    sticky), `focus` (each remaining page at its own measured width, 560–900px, on the open
    ground), and the Trade view as a `workstation` (chart and book beside the order ticket,
    truth panels sharing a row), scoped to the view because Exchange and Trade share one page.
  - **Retired.** `desktop-webapp.css` (the pinned right-hand drawer rail and the page-by-page
    composition programme) is unlinked and kept on disk as history. The desktop audit
    (`audit-desktop-webapp.mjs`) is rewritten against the new registry: shell checks (sidebar,
    brand left, one current destination, no mobile chrome), per-treatment width law, workstation
    probe, and the carried lessons (exactly one visible page, double-surface, pair rule, P4
    reading measure, P6 shape law, P8 truth first). 116 observations, passing at 1024, 1280,
    1440 and 1920.
  - Fixed along the way, desktop-scope only: the section index presented as six accent slabs
    (`.btn-w` blanket background) now presents as its registered quiet role; a lone
    `ui-flex-1` danger action stretched to the settings column width, now capped at the
    registered 320px natural width; the wallet-active rule that hides the topbar trailing
    cluster no longer hides the sidebar's persistent connection status.

- **Fixed: the Wallet and Legal pages rendered on top of every other route on desktop.** The region
  grid was written as `.page[data-mx-composition][data-mx-regions] { display: grid }`. When the
  region host IS the page element, as it is for Wallet and Legal, that competes with the
  `display: none` hiding every inactive page and wins on specificity, so both pages were on screen
  permanently. Navigating to Activities showed the Wallet balance and Send/Receive stacked above it.
  Every page-level region selector is now guarded with `.active`.
- **This was the same defect class as the action pair rule forcing `display: flex` over an inline
  `display: none`, reintroduced while generalising that fix.** A layout rule beating a state rule.
  The gates missed it both times for the same reason: every check began at `.page.active`, so none
  of them could see a page that should not have been rendered at all. **The desktop audit now fails
  whenever the number of visible pages is not exactly one** and names the offenders. 108 observations
  passed while the product was visibly broken; that gap is what this check closes.

- **Legal & notices has a real section index, on every surface.** Six sections and over a thousand
  pixels of prose with no way to reach Data use except scrolling past Security. The index is built
  at runtime from the page's **own headings**, so its labels cannot drift from the sections they
  name and carry whatever language the page is in without a second dictionary. It is present on
  mobile as well as desktop, deliberately: a desktop-only derived index would put six controls on
  desktop that no phone user has, the same P2 defect closed on Create invoice. Buttons rather than
  anchors, because `routeFromHash` reads `location.hash`; focus moves explicitly so keyboard
  behaviour matches the link a person expects. On desktop it becomes the complementary pane and the
  page joins Mint, Exchange and Wallet as composed. Measured at 1440: prose column 680px, index
  380px beside it; at 390 both stack at 342px.
- **A document's text column is bounded in px, not in fr.** A 1.6fr primary inside the 1180 frame
  resolves to about 727px at 1920, over the 720px reading measure P4 enforces. Fractional columns
  do not respect a measure; the document archetype uses `minmax(0, 680px)`.
- **The Stables Academy was measured, and it is not a document today.** It had been recorded as
  "same as Legal and notices" on inference. It is one section holding a Telegram link and six topic
  buttons, five of them disabled: 240px tall, no prose, one heading. A one-entry section index is
  decoration, so it stays uncomposed. Its `M-CMP-DOCUMENT` assignment describes what the Academy
  will be when it carries course material; if it stays a list of topic choices it is a task hub.

- **The desktop rail now says where you are.** Measured across all 25 routes it marked **zero**
  current destinations, so the only navigation desktop has looked identical on every page. The
  bottom tabs it replaced had always lit exactly one slot; when the rail took over at 1024px that
  state was simply lost. `M-CMP-NAV-RAIL` has registered one current marker since D029 and the
  composition laboratory enforced it, but nothing measured the running app. The rail row now
  carries `aria-current="page"` and a marker scoped to the web surface, so the mobile drawer is
  untouched. Capability parity could never have caught this: it compares which controls exist, not
  which one is current. The desktop audit now fails on any count other than one.
- **The rail scrolls, and always did.** A note carried across several passes recorded that the full
  page list "does not fit" a 900px rail. Measured: 28 rows, 2493px of content, and the last
  destination reaches the viewport when the rail is scrolled. Rows are 70px because of their icon,
  not because of the description, which desktop already hides. Not a defect; the note is withdrawn.
- **Council communications is reclassified from conversation to document.** It was assigned on the
  strength of its name. The page has no composer and no reply path — it is App version plus dated
  Official notices, read in order — and a composer that is always reachable is part of what the
  conversation archetype IS. Registry corrected with the reason.
- **Chat, Legal and notices, and The Stables Academy are recorded as deliberately not composed.**
  Chat is correctly a conversation but carries no counterpart or topic content, so its pane would
  hold decoration. The two documents earn a section index, which the pages do not have; deriving one
  on desktop only would put a control on desktop that mobile lacks, the exact P2 violation closed on
  Create invoice a run ago. A section index on both surfaces is a product change, not a composition,
  so it waits for a decision rather than being invented.

- **Wallet and Exchange join Mint as composed desktop pages, and composition became declarative.**
  The Mint implementation was page-specific CSS, which would have meant a bespoke block per page,
  the per-page layout invention the composition law forbids. A page now declares three things in
  markup: `data-mx-composition` names its registered archetype, `data-mx-regions` names the element
  holding both regions, `data-mx-region="context"` marks supporting truth. Composing the next page
  is three attributes and no new CSS. A money form keeps its 560px task column while an account
  home spends its width, from the same mechanism, because the rule keys off the archetype.
- **Faucet and Create invoice deliberately keep the mobile measure.** Both have two task sections
  and no supporting truth to move. A pane for them could only hold a second action, which the pane
  may not carry, or decoration, which P3 forbids. Recorded with the reason rather than composed for
  the sake of a count.
- **Status colours align to the D028 golden baseline.** The baseline uses `#34d399` for success and
  `#fb7185` for danger, and the public website already resolved exactly those; the app had drifted,
  mapping success onto the accent `#67e8f9` so a success state was indistinguishable from a primary
  action. The app was the drifted side, so the app moved. Both are single tokens, 55 and 38 uses.
  Status colours are now enforced P1 roles rather than observations awaiting a ruling.
- **The content frame stays at 1180px** (D029 ruling 1), matching the migrated website, on the
  reasoning that D029's intent is continuity with the website and 1180 is what the website now is.

- **Mint is the first page with a real desktop composition.** Every page was the mobile layout
  bounded to 580px inside a desktop shell, which is honest but not composed. Mint goes first because
  it is the registered transaction canon, so the other money pages align to it rather than each one
  inventing an answer. Width buys structure and not size: the mint floor note and the leverage chart
  move beside the form as the complementary pane from 1280, while the direction switch, asset
  choice, amount field and commit action stay inside a 560px task column at 1024, 1280, 1440 and
  1920. Measured: page 714/970/1130, task column 560 at all three, context beside the task from
  1280. `?preview=dapp` is unchanged at 390 with a 342 column and the context below it. Nothing
  moved in the DOM; the two supporting blocks carry `data-mx-region="context"` and the grid places
  them, so reading order, hooks and the accessibility tree are what they were.
- **The no-stretch rule now reads the registry instead of hardcoding one answer.** It said "keep
  the 580px measure" for all 25 pages, which is right for an uncomposed page and wrong for the
  first composed one, so the first real composition would have had to weaken the gate to land.
  `desktop-page-composition.v1.json` lists which pages have earned a composition, and a listed page
  is held to more, not less: bounded task column, a complementary region genuinely beside it at
  1280 and above, prose measure and content frame unchanged. Listing a route without composing it
  fails the audit.
- **Created the two page kinds D029 names and the registry lacked** (Composition System 32 to 34):
  `M-CMP-COMMUNICATION` and `M-CMP-DOCUMENT`. Chat, Council communications, Legal and notices and
  The Stables Academy were mapped to a searchable data index and to financial detail, which is the
  nearest fit and the wrong function: an index is a set you filter and a conversation is a sequence
  you read from the end and reply to, and financial detail aligns figures a document does not have.
  Eight new captures pass the same audit as the other eight archetypes.
- **P1 has a check.** `M-STD-BRAND-CONTINUITY` registers 10 identity roles and the audit resolves
  both sides in a real browser, so notation cannot create or hide a finding. All 10 match across 12
  public website pages and the application. Status colours disagree and are reported as observations
  for a ruling rather than quietly excluded.

- **A desktop layout rule was deciding what you are allowed to do (P2).** The pair-row rule set
  `display: flex !important`, and an !important declaration outranks an inline style, so it
  un-hid `#invRecognitionForm` — the checkout-recognition form the app keeps closed until merchant
  mode, a settled sale and a 45-second delay all hold. On desktop, "Run checks", "Recognize this
  customer" and its confirmation checkbox were reachable with none of those conditions met; on
  mobile they were correctly absent. The `!important` was never needed: rewriting the declaration
  to normal priority in the live cascade left all 13 legitimate pair rows at `flex` and changed
  only that one element. Removed, plus `:not([hidden])` for the attribute case. Registered as
  `pairRuleBoundary` on `M-EL-ACTION`: the pair rule governs arrangement and may never change an
  element's display from none.
- **The parity gate was reporting a difference that was not there.** `mx-dropdown.js` re-scans
  every 500ms and, once it enhances a `<select>`, hides it and exposes a trigger named after the
  selected option, so one control reads as `"Select a categoryFood & drink…"` before enhancement
  and `"Select a category"` after. A fixed 320ms settle landed either side of that tick on one
  surface and not the other, inventing a My shop finding. The audit now drives the enhancement and
  samples until two consecutive reads agree.

- **Restated the registered compact minimum without a scope precondition.** `machinery-app.css`
  applies it only under `[data-machinery-scope="app"]`, so a subtree missing that marker fell back
  to the 56px default. The desktop layer now restates the definition's own 48px.
- **P6 finding remains open.** One `secondary/compact` action on Ambassadors still measures 56px
  against its siblings' 48px. Ruled out by measurement: font size, line height, padding, flex
  stretch, the scoped minimum, and browser caching. The audit holds the line on it.

- **An action's height is its own (P6).** In a flex row the default `align-items: stretch` grew a
  compact action to match a taller neighbour, so one registered role measured 48px beside one
  control and 56px beside another on the same page. Actions in row utilities now centre themselves
  instead of stretching. Scoped to row utilities deliberately: in a column flex `align-self` acts on
  the horizontal axis and would break full-width actions.

- **Registered a desktop axis for `M-EL-ACTION`** (element registry 1.1.0-candidate): minimum
  160px, maximum 320px, plus a `fullWidthRule` (full width is legitimate only inside a bounded task
  column of at most 560px) and a `pairRule` (two actions of equal weight sit on one row at natural
  width, not stacked full width). Registry first, then the check, then the app.
- **Implemented the pair rule once for the whole app** instead of per page, and added a desktop
  audit check that fails on any stacked pair. It found three offending containers across
  Ambassadors, Feedback and Security that nobody had reported.

- **Cleaned the StablesAgent header.** It no longer carries a language selector or a close control.
  Language is one app-wide choice made in the side menu rather than a second control that can
  disagree with it, and the house rule recorded with MIG-005 is that a dialog carries no close or X
  control; a person leaves by clicking outside.

- **No page stretches on desktop.** Giving every page the full 1180px frame only widened mobile
  rows until fields, dropdowns and commit buttons ran the width of the screen, which is a stretched
  layout rather than a composed one. Until a page earns a real desktop composition it keeps its
  composed measure and sits inside the frame instead of filling it. The desktop audit now fails on
  a stretched page, so this cannot quietly come back.
- **Dialogs centre on the content region, not the monitor.** `.mback` is a fixed inset:0 backdrop,
  so with the rail on the right every pop-up centred on the viewport while the page behind it
  centred in the narrower content region.
- **One surface per dialog, for real.** The earlier direct-child rule did not win; the audit proved
  the frame was still painting on every page. The positioning frame never paints.
- **The desktop audit now opens dialogs.** Its double-surface check previously never ran, because
  no dialog is open during route navigation, so a passing run proved less than it appeared to.

- **The mark goes home on desktop.** With no bottom tabs, clicking the logo and name navigates to
  Wallet, as it does on the website. Mobile keeps the brand's profile-settings behaviour.
- **The desktop Wallet row uses the app's own wallet icon**, lifted from the mobile Wallet tab
  rather than drawn again as an emoji.
- **Added a desktop runtime audit** (`work/tools/audit-desktop-webapp.mjs`). Every existing runtime
  gate measured 320 to 760px, so nothing checked 1024 and above, which is where every desktop
  defect so far has lived. It drives all 25 routes at 1024, 1280, 1440 and 1920 and checks
  horizontal overflow, the brand staying left, a surface never painted twice, nothing exceeding the
  bounded frame, and the rail being the only navigation.

- **Made Wallet reachable from the desktop menu.** Removing the bottom tabs on desktop had left the
  home destination unreachable from the only navigation on screen. A `data-desktop-only` Wallet row
  appears in the rail and is hidden on every mobile surface, so the mobile side menu is unchanged.
- **Revised the page-map gate deliberately rather than relaxing it.** The founder law that Wallet,
  Send and Receive never appear in the side menu still applies to every row a phone can see. The
  gate now also requires the desktop-only rows to be exactly `[wallet]`, so the exception cannot
  become a back door; proven to fail by marking a second row desktop-only.
- **Kept the new row a row.** Revealing it with a generic `display: block` stacked its icon above
  its label; a menu item is a flex row and is restored to its own display.

- **Kept the brand left aligned on desktop.** The top bar is a 580px centred column, so in a wide
  viewport the logo and name drifted to the middle of the screen. The bar now spans the content
  region and the name and tagline stack from the left.
- **Removed a second box around desktop dialogs.** A dialog is a backdrop, a positioning frame and
  the modal itself, and both the frame and the modal painted a surface. On a narrow screen the
  frame is edge to edge so only one box reads; in a wide viewport it became a visible box around
  the box. The frame no longer paints.

- **Restored the mobile alignment of the wallet page on desktop.** The 1140px frame had spread the
  balance, the asset rows and their amounts across the full width until the page read as stretched
  rather than composed. Wallet content returns to the mobile column and alignment; the desktop
  frame still owns the ground and the navigation.

- **Moved the desktop navigation to the right** and made its rows compact. The two-line
  descriptions written for a full-width mobile drawer pushed the page list past the bottom of a
  300px rail, so at desktop width the name and icon stay and the description and chevron stand
  down. Same rows, same order, same handlers.
- **Returned full-width actions to their natural size on desktop.** A full-width action is a mobile
  layout where full width is a natural width; carried into a 1140px frame it reads as a
  half-screen slab, which was the loudest reason the desktop pages looked like stretched mobile.

- **Gave the desktop web surface one navigation instead of two.** Mobile has five bottom tabs plus
  a More drawer listing every page; on a wide screen both were visible at once. At 1024px and above
  the web surface now hides the bottom tabs and pins the page menu open as a left rail.
- **Pinned the real menu rather than building a second one.** The rail is the existing drawer
  markup, so every destination, group heading, order and handler stays the app's own and cannot
  drift from the menu. It stays open regardless of the `.open` class, so a navigation that calls
  `closeMore()` cannot dismiss the only navigation on screen.
- **Left the mobile surfaces alone.** MiniDapp and both Android builds keep the bottom tabs and the
  drawer at every width; measured unchanged at 390px.

- **Gave the web surface a real desktop composition at 1024px and above (D029).** The bottom
  navigation becomes a persistent left rail carrying the same tabs in the same order, and the
  working content uses a bounded desktop frame instead of a 580px column centred in a wide window.
- **Scoped it to the web surface only.** A new `data-stables-surface` flag on the document element
  resolves to `webapp`, `dapp` or `apk`, and the desktop layer requires `webapp`. The MiniDapp and
  both Android builds keep the shipped mobile composition at every width, and the flag is
  re-applied on DOMContentLoaded so a late native bridge cannot leave an APK on the desktop layer.
- **Added no destination, action or figure.** The desktop layer moves what exists and invents
  nothing, per the founder parity direction.

## [0.0.10.15] - 2026-08-06 working candidate

- **Moved The Stables Academy into Community in the side menu.** Its existing route, content, and behavior remain unchanged.
- **Added a navigation-group regression check.** The application-map gate now requires the Academy destination to appear exactly once between the Community and Help headings.

## [0.0.10.14] - 2026-08-06 working candidate

- **Made the side-menu header fully opaque.** Scrolling destinations can no longer show through or visually collide with the version, Agent, and Language controls.
- **Kept the header as the drawer's stable top boundary.** Its sticky position, safe-area spacing, actions, and divider remain unchanged.

## [0.0.10.13] - 2026-08-06 working candidate

- **Made dropdown labels and associated values readable as separate columns.** Asset and currency menus now reserve independent space for the label, balance or status, and selection indicator without collisions.
- **Made selected triggers use their width efficiently.** The currency remains the primary label and the secondary line shows its value without repeating the currency name.
- **Added dropdown layout verification.** Runtime evidence now checks open dropdown rows for clipped, overlapping, or off-panel label and value content at every audited viewport.

## [0.0.10.12] - 2026-08-06 working candidate

- **Kept transaction diagnostics out of customer-facing messages.** Faucet, mint, burn, vault, trade, and reset validation failures now state the actionable product condition without exposing internal proof flags or referring to an absent top-bar sync colour.
- **Preserved full diagnostics for developers.** Detailed validation data remains in the runtime console for investigation without being presented in product dialogs.

## [0.0.10.11] - 2026-08-06 working candidate

- **Changed the app from explanatory presentation to direct product state.** Removed redundant page subtitles, destination descriptions, future-update essays, and long usage instructions from product routes.
- **Kept required truth at the point of action.** Transaction consequences, unavailable control states, test-token status, fees, balances, recovery effects, Vault-key warnings, and legal notices remain visible.
- **Made StablesAgent the contextual guidance path.** The global agent trigger identifies page-specific help, retains the active route as context, and is operable by pointer or keyboard.

## [0.0.10.10] - 2026-08-06 working candidate

- **Adopted the approved North Star visual identity across the complete product.** All 25 routed pages and shared overlays now use the lifted blue ambient field, open content sections, glass controls and chrome, white hierarchy, and cyan primary action language.
- **Preserved product content and behaviour while replacing the presentation layer.** Existing route, form, transaction, menu, modal, and runtime hooks remain intact; Invest tabs and amount-visibility controls now expose their state to assistive technology.
- **Made the identity fixed across all platforms.** The retired theme picker no longer presents competing product themes, and the build is prepared for synchronized Web, MDS, standalone Android, and Core-connected Android verification.

## [0.0.10.09] - 2026-08-03 working candidate

- **Fixed the Portfolio simulator's large empty space above its content.** The routed page is now mounted inside the shared scroll surface and begins at the same top position as the other app pages.
- **Closed the regression blind spot.** The 26-route content gate now verifies that every page is a direct child of the route host and starts inside the initial viewport, in addition to checking its content and controls.

## [0.0.10.08] - 2026-08-03 working candidate

- **Restored the canonical v0.0.9.50 product pages instead of recreating substitutes.** Exchange, Trade, Treasury, Council, the portfolio simulator, order-book settings, and the faucet test-token section again expose their original information architecture and retained interaction hooks.
- **Kept the limited test boundary honest without deleting product context.** Operations outside the Winiwa/xWiniwa test scope remain visibly unavailable and refuse before transaction construction or posting; status cards no longer replace complete page bodies.
- **Added a permanent page-content preservation gate.** A 26-route contract now checks required content and visible regions against baseline commit `fe9ff840`; four-platform parity fails if a future release gate wraps or removes a page body.

## [0.0.10.07] - 2026-08-03 working candidate

- **Every defined page is now present and navigable.** Invest, On/off ramp, Merchants, My shop, Create invoice, and Ambassadors open their complete page bodies from the side menu instead of appearing as disabled rows.
- **Page availability is separate from feature availability.** USDw, stablecoin, market, merchant-settlement, treasury, and governance operations remain guarded and are described as activating in an upcoming version; an unfinished operation can no longer remove its owning page.
- **The rule is enforced across all four platforms.** The canonical page map and release-profile gates now fail if any named page is hidden, disabled, or missing from the complete route registry.

## [0.0.10.06] - 2026-08-03 working candidate

- **Corrected the side-menu product map.** Wallet remains the fixed centre destination, and Send and Receive remain Wallet actions; none of the three is duplicated in the side menu.
- **Restored Exchange, Trade, Treasury, and Council as routed pages.** Each destination opens its own correctly titled page. Unfinished stablecoin, order-placement, treasury, voting, and budget operations remain hidden behind the release feature gates and are described honestly as coming in later updates.
- **Kept all four platforms synchronized.** Web, MDS, standalone Android, and Core-connected Android share the v0.0.10.06 source and release-profile contract.

## [0.0.10.05] - 2026-08-03 working candidate

- **Portfolio simulator is now a standalone routed page (v0.0.10.05).** Its side-menu row opens a normal app page with shared header geometry instead of a floating drawer. The page states the current Winiwa/xWiniwa test boundary; the existing USDw, stablecoin, and coverage-fund simulation controls remain preserved behind their deferred feature gate.

## [0.0.10.04] - 2026-08-02 working candidate

- **The side menu now shows the complete product map (v0.0.10.04).** The previous gate incorrectly treated the limited-release allowlist as the complete menu inventory and hid 11 destinations. Exchange, Trade, Invest, Portfolio simulator, On/Off Ramp, Merchants, My shop, Invoice, Ambassadors, Treasury, and Council are visible again and clearly labelled **Not in this test**. Their route and feature guards still refuse entry before any deferred operation begins. All 24 page containers and all six menu-only flows now have one explicit menu destination.

## [0.0.10.03] - 2026-08-02 working candidate

- **The side menu now includes every active release destination (v0.0.10.03).** Wallet, Send, Receive, and Core connection join the existing Faucet, Mint and burn, Activities, support, and preference pages. Deferred USDw, trading, merchant, and governance surfaces remain excluded from the release menu. A release-profile gate now compares the complete menu destination set with the approved route and feature boundary.

## [0.0.10.02] - 2026-08-02 working candidate

- **Full-screen page titles now align with their back arrows (v0.0.10.02).** The shared back control corrects the chevron font's 3 px low optical baseline on all 10 full-screen flows while preserving the centred 44 px touch target. Web, MDS, Core-connected Android, and standalone Android receive the same source.

## [0.0.10.01] - 2026-08-02 working candidate

- **Opened the coordinated four-platform test release line at v0.0.10.01.** Web, MDS, the Core-connected APK, and the standalone APK now use one exact version identity and remain subject to the complete parity gate. The two-digit iteration is preserved in user-facing labels and package metadata. This prepares the candidate only; it does not claim that signing, multi-wallet rehearsal, or publication is complete.

## [0.0.9.73] - 2026-08-02 working candidate

- **The Wallet logo is now the exact top boundary for every surface (v0.0.9.73).** Physical-device measurement aligns all 24 routes and all 10 full-screen flows at or below the Wallet mark, including the final 4 px optical offset between the safe inset and the mark itself.

## [0.0.9.72] - 2026-08-02 working candidate

- **Full-screen flows now clear the phone header (v0.0.9.72).** The shared screen geometry again honors the Android safe inset instead of losing to generic dialog padding. Physical comparison then identified a final 4 px optical offset to the Wallet mark, closed in v0.0.9.73.

## [0.0.9.71] - 2026-08-02 working candidate

- **Version, Agent, and Language now share one visual center (v0.0.9.71).** The hidden language-name button no longer occupies a row above the globe, so all three menu-header controls align vertically while retaining the phone safe area and 48 px icon targets.

## [0.0.9.70] - 2026-08-02 working candidate

- **The four app platforms now move together (v0.0.9.70).** One mandatory verifier compares the complete active Web source, MDS archive, standalone Android assets, and Core-connected Android assets, allowing only each shell's documented boot adapter. The standard sync command refreshes all four before either Android build.

- **The menu header now clears the phone status area (v0.0.9.70).** Its safe-area-aware header remains visible while the menu scrolls. Agent and Language use registered 48 px icon targets and sit side by side at the right instead of leaving Agent isolated in the middle.

## [0.0.9.69] - 2026-08-02 working candidate

- **The standalone APK now matches the Core APK's full-screen presentation (v0.0.9.69).** Its embedded-node WebView paints behind the complete Android status and navigation areas instead of ending at their inner edges. The same device safe-area bridge protects foreground content, and Android system icons follow the selected dark or Paper theme. The standalone node lifecycle, wallet, recovery, biometric protection, internal command bridge, and signed update path are preserved.

## [0.0.9.68] - 2026-08-02 release candidate

- **The app background now covers the whole phone screen (v0.0.9.68).** The Core shell no longer ends the WebView halfway through Android's status bar, which placed a colour seam through the clock and battery indicators. The WebView now paints edge to edge behind both system bars, while device-reported safe-area insets move only foreground content and bottom navigation clear of the cutout and gesture area. Android system-bar icons also follow the light Paper theme.

## [0.0.9.67] - 2026-08-02 release candidate

- **Wallet edit controls survive release filtering (v0.0.9.67).** Release filtering can rebuild a currency row's cells while retaining the row element. The row-level duplicate-listener guard previously returned before restoring the favorite and add/remove controls, leaving the wallet-management row without its registered icon actions. Child controls are now restored first, while row-level drag and click listeners remain single-bound.

- **Release-candidate authority is complete (v0.0.9.66).** R1 through R4 are closed with retained evidence, including explicit founder approval of the rewritten Agent and prefilled content. Package metadata and release notes now identify one candidate for the signing and three-wallet rehearsal gates.

- **Release pages have complete accessible names, and pre-law operations can self-heal (v0.0.9.65).** Every included release route plus Send, Receive, and Core connection now passes the Chromium accessibility tree at the reference viewport, 200 percent text zoom, and 400 percent reflow. Form controls that previously relied on visual proximity now carry explicit accessible names. The Core history payload remains bounded to three entries; only stored rows matching the old mint/burn two-leg shape are resolved individually by exact transaction ID, migrated only after Core proves the transaction is on-chain, and rebuilt through the current one-operation/one-row classifier. Other old history is untouched.

- **Repeated small sends keep their own Activity row (v0.0.9.64).** The optimistic-row supersede fallback used currency, direction, and amount without a time boundary. A new `0.000001 Winiwa` self-send was therefore deleted as a duplicate of a different `0.000001 Winiwa` send from July 31 before the new transaction ID arrived. Amount is not identity. The fallback now requires both rows to carry chain times within 30 minutes and compatible addresses; direct transaction-ID matching remains authoritative.

- **The Core-connected app has a truthful update route (v0.0.9.63).** Settings treated only the separate embedded-node shell as an Android package. On the Core-connected APK it therefore kept the MiniDapp download sentence and hid every APK control, leaving no valid update path. The Core-connected package now shows its native installed version, explains that it has no Internet permission, and offers the signed Stables APK releases through the device browser. The embedded-node updater and MiniDapp package paths are unchanged.

- **The balance total says why it has no figure, and the faucet message waits for syncing (v0.0.9.62).** The hero total showed a silent dash whenever it could not print an honest number, so a person could not tell "still reading the chain" from "nothing to show". It now carries the same four-state truth as the rows, in the same words: **Syncing…**, **Proof unavailable**, **Stale**, or the figure. The state word drops to a readable 20px rather than wearing the 60px weight a number wants. Separately, the faucet nudge no longer appears until syncing is done: telling someone their wallet is empty is a claim about **proven** balances, and while the wallet still reads Syncing the app does not know that yet. The existing settle window still guards against a transient zero; this guards against speaking before the proof exists.

- **A mint or a burn is one Activity row, not two (v0.0.9.60).** Both are a single transaction carrying two accounting legs, and the mirror wrote one row per leg. The amounts, transaction ids, blocks and confirmation states were all correct, but two rows is a false account of what the person did: they performed one operation. The row now states what arrived and notes what it cost (`Minted xWiniwa · +1 · For 1 Winiwa.`), carries both legs on itself so no transaction detail is lost, and uses the Mint and Burn vocabulary. The stored-row reconciler judges history against the same rule, so two-leg rows written before this law purge themselves and re-import as one. Faucet claims, ordinary sends, and any transaction with more than two legs are deliberately untouched. This is the same founder law already applied to the two-transaction forward-pricing trade; the difference is only that both legs here live in one transaction.

- **The last two prefilled agent surfaces now describe this release (v0.0.9.59).** Payment protection told a tester the payment code was "separate from your Vault key (24 words)", which is wrong for a Core-connected build where **Minima Core holds the wallet and the seed and Stables never has it**, and it offered phone biometrics that only exist in the separate standalone app. Both are corrected in English, French, Spanish and Chinese, and the seed answer now states plainly that nobody should ever hand a recovery phrase to anyone. The first-run tour no longer opens by offering to make the tester a merchant ambassador with earning opportunities, because that destination is deferred; the two merchant paths are release-gated rather than deleted, so they return with the merchant economy.

- **StablesAgent works on the shipped APK instead of failing in silence (v0.0.9.58).** The Core-connected app holds no Android network permission by design, but the agent loaded its chat in an in-app frame, and `AGENT_URL` still pointed at a `127.0.0.1` development address, so a tester would have got a composer that appeared to be listening and never answered. Agent questions now leave for the device browser through a narrow https-only native bridge; the in-app frame is never loaded on that build; and if no browser answers, the app says so in plain words in all four languages. The public agent address replaces the localhost override. External links elsewhere in the app use the same path.

- **The guided welcome series describes the release that ships (v0.0.9.58).** The StablesAgent welcome flows were inherited from the frozen demo line: they offered Wables, illustrative balances, Coverage and Liquidity Funds, Merchant mode and an embedded node, and told the tester their app *is* the node. Rewritten in English, French, Spanish and Chinese around Core pairing, the Winiwa faucet, par mint and burn, the four proof states, and valueless test tokens. The investing and merchant tracks are removed rather than reworded, because their destinations are not in this release.

- **Deferred stablecoin material no longer looks live (v0.0.9.57).** The release profile now names the assets the build may present, and USDw and the fiat display currencies are removed from the wallet currency list, the display-currency choices in Preferences, the send and receive asset lists, and the Activity currency filter. They are removed rather than switched off, because wallet edit mode deliberately shows every switched-off row with a control to add it back. USDw was also genuinely sendable, so the send path checks the release boundary before the token map and a selection restored from an earlier build cannot re-enable it. The exported USDw peg-covenant hook now refuses before it can construct or post a stablecoin transaction, and the boot prewarm no longer registers that covenant on the tester's node. Mint, the wallet faucet nudge and the sample chat message name only the assets that ship.

- **Amount fields keep the caret and show grouping commas (v0.0.9.56).** The app keypad no longer blurs an amount field or forces every edit onto the end. A person can tap between digits, select a range, insert, or delete from that position while the keypad keeps the field focused. Financial amount fields group thousands with commas during native typing and keypad entry while preserving the logical caret position; MAX and half values use the same presentation. A runtime regression drives `1,234.56` to `12,934.56` by inserting in the middle, deletes back to the original value, and verifies `1,234,567.89` under native input formatting.

- **Legacy snapshots can no longer enter the V9 proof path (v0.0.9.56).** The rolling-anchor reader now requires the live `TV91` generation tag on both head and page coins and binds every page to the head's snapshot id before decoding or importing any record. Recent legacy pages that omit their generation now resolve to Proof unavailable instead of being accepted as release proof material.

- **Missing proofs no longer look like zero or leave money actions live (v0.0.9.56).** Wallet balances now move through explicit Syncing, Proof unavailable, Ready, and Stale states. Winiwa and xWiniwa rows and the wallet total fail closed until a live balance response proves them. The faucet names cached data Stale and keeps Claim disabled. The xWiniwa page now shows its vault-proof state, and Mint/Burn remain disabled in both the UI and transaction hooks until the exact wallet and vault coins are locally proven. A 12-state runtime verifier covers wallet, faucet, and vault labels plus action gating.

- **The release now says Mint and Burn consistently (v0.0.9.56).** User-facing xWiniwa and deferred stablecoin action copy no longer calls a burn a redemption. xWiniwa burns say that Winiwa is received, stablecoin protocol notes describe the burn path, and Coverage Fund copy uses Withdraw. The compatibility-only `cf_redeem` direction key remains unchanged because it is an internal ABI identifier, not product vocabulary.

- **A Core timeout can no longer look connected (v0.0.9.56).** A timed-out command now overrides stale registration and balance-poller state with one app-wide `Minima Core is not responding` warning and a direct recovery action. The warning clears only after a fresh command response from Core, so Settings, the connection screen and every app page report the same transport truth through a Core stop and restart.

- **The APK header sits closer to the phone bar, and the agent button moves again (v0.0.9.55).** The native Core-connected shell uses half the effective Android status-bar/display-cutout top inset while retaining full side and bottom protection. The shared floating agent button now initializes its existing pointer-drag controller when the page is ready and reserves its touch gesture from browser scrolling, so press-drag moves and saves it while a clean tap still opens the agent.

- **The Android app is named Stables and its header clears the phone status bar (v0.0.9.54).** The Core-connected APK keeps its existing package and pairing identity, but its user-visible Android and Minima Core Apps label drops the technical word “Core.” The native host now reserves the device-reported system-bar and display-cutout inset above the packaged web canvas, with keyboard/navigation clearance below, so the Stables mark and name cannot mix with phone status content.

- **The first-test app can now pair with the already installed Minima Core (v0.0.9.53).** The separate `org.stablescouncil.stables.core` Android shell registers through the proven `minimaapi` package protocol, sends explicit-package allowlisted commands, correlates raw object or batch responses, validates the persisted Minima identity, receives Core notifications, bounds history reads to three entries, and reconnects after returning from Core. The app-wide connection truth now distinguishes Core missing, waiting, disabled, read-only, permissions ready and fully connected. The connection screen explains the tester-controlled Enable/Admin steps and never asks for an RPC port in the Core APK. No embedded node or Android Internet permission is present.

- **The first test release now has one fail-closed product boundary (v0.0.9.52).** The xWiniwa-core release profile keeps Wallet, Faucet, xWiniwa Mint/Burn, Send, Receive, Activities, Core connection/settings, security, profile, help, Academy, feedback, chat/contacts and notices. Deferred market, stablecoin, investment, merchant-payment, treasury, governance, simulator and test-token-reset routes no longer appear in release navigation, saved bottom bars are reconciled to the allowed set, direct navigation is refused, and every deferred transaction export checks the same profile before it can build or post. The implementation preserves the deferred source for later Pool and stablecoin work without presenting it as shipped functionality.

- **Node connection is clear before it is needed (v0.0.9.51).** When Stables has no live node, every page now carries the same persistent status banner with a direct Connect node action. A real reconnect attempt says Connecting; a failed attempt says the node is not connected and gives the recovery action; a confirmed connection removes the banner. Settings no longer begins with an open-ended Checking label. The connection screen is rebuilt around the current state, two plainly labeled fields, a node-port-to-RPC-port example, one primary Connect node action, and concise wallet-access guidance. Browser preview no longer interrupts the first page with the old automatic connection popup, while the standalone Android app continues to suppress connect prompts during its embedded node startup.

- **One dropdown, one way of showing the options (v0.0.9.50).** The founder pointed at Mint's open list and asked for that format everywhere. That list is drawn by Android, so converging on it meant choosing between our own panel wearing the format and a real `<select>` on every control; he chose our own panel. It gives the same list on Android, in the hub and on the web, keeps the app's theme in every dialog, and is the only version the catalogue can show for real, because an operating-system sheet has no DOM to capture. The format: 56px full-width rows, name left, a 24px ring on the right filled on the chosen row, hairlines between rows, a glass panel, and an active row that lifts rather than darkens. **The native select stays in the page as the source of truth, hidden**, because thirty controls read their value by id and hang their behaviour off inline `onchange`: choosing a row sets `value` and dispatches a bubbling `change`, so **31 controls changed appearance and not one handler was rewritten**. Proven on Mint: picking the second row set the value to USDw, fired change once, updated the trigger and closed the panel. `platformDrawnSurfaceCount` fell from 25 to 3.

- **The catalogue can finally show a dropdown open (v0.0.9.50).** Three things were in the way, and each fix is general. Capture only revealed inline `display:none`, and the panel closes with the `hidden` attribute, so the catalogue could only ever have shown a dropdown shut. The specimen chooser prefers the shortest instance, which is right for a control and wrong for a container, because the shortest menu surface in the app is an empty one. And a menu is positioned against its trigger, so with no trigger in a card it rendered as an empty box. MNU-002 now carries the real open list at its real geometry, captured from the running app.

- **The bottom bar gets its band back (v0.0.9.49).** On the phone the icons sat against the upper edge of the bar. The top bar has always added the safe area to its height (`calc(var(--th) + var(--safe-top) + 24px)`); the bottom bar declared a flat 64px and then padded the home-indicator inset **out of its own inside**, so on a device with an indicator the five tabs were left roughly 30px to stand in. It now adds the band the same way the top bar does, the inset is named `--safe-bottom` beside `--safe-top` rather than written inline, and the bar itself grows from 64 to 72px. Page and screen clearance follow the same sum, so nothing ends up under it.

- **The reference documents sit on the app's background (v0.0.9.49).** The founder, on the catalogue: still a dark background. The charter document language kept the flat `#0b0f14` while the app has been on the lit surface since D021, so every generated document read as a different product from the one it documents. `charter-document.css` now carries the app's own base and its two radial layers, resolved once from the default theme with the recipe written beside them, because a generated document has to render standalone from disk with no app stylesheet to read. All seven documents move together.

- **A task is a screen, and now it is testable (v0.0.9.48).** D022 law 4 said this in July and the mint confirmation was still a pop-up, because "a task is a screen" reads like a judgement call and every new modal got judged again. The test is what the surface does: **an action that changes state makes it a screen; only dismissals make it a dialog.** A confirmation is a task, since confirming a mint is the moment the money moves. The mint/burn confirmation, the faucet claim, the shared confirm, the payment code, node connect and the two recovery steps are full screens with a back control, keeping every id, opener and handler. The two "coming soon" notices, feedback success, the terminal warning, the vault help choice, the shop sticker and the seed invite stay dialogs on purpose. The welcome flow and the recovery progress surface are left for their own slice, the first because it is a first-run sequence with its own presentation, the second because you must not be able to walk out of it mid-way. `audit-app-ui-contract.ps1` now fails on any modal carrying `action-transaction` that is not a screen, ratcheted at 0.

- **The mark leaves with the page (v0.0.9.48).** The wallet was the last page with a bar, and a bar stays put while its content scrolls under it, which is exactly the header behaviour removed everywhere else. The mark and the bank name sit on the background now and scroll away like the balance beneath them. The document is the scroller, so the change is one line, `fixed` to `absolute`: same markup, same click target, same handlers, and no glass, blur or hairline, because there is nothing left to float over.

- **My profile rebuilt where it was unreadable (v0.0.9.48).** Five settings rows carried five inline widths (92, 110, 118, 130, 142 px), and a native control sizes itself to its widest option, so on a phone the label was squeezed to nothing. One `ui-row-control` width now, and `ui-row-stack` for rows whose options are too long for any side-by-side width: the four bottom-menu places and the custom currency picker. The raw file input, which draws an operating-system control, is hidden behind a registered Choose image action per D023.

- **Three spacing and scrolling rules, stated once (v0.0.9.48).** Half and MAX are one control in two parts, so they sit at 6px (`ui-quick-amounts`), not the 8px between two unrelated things, on every amount field in the app. The order book keeps its scroll gesture and loses the visible bar (`ui-scroll-quiet`). Both are in the reference as laws 23 and 25, not as local tweaks.

- **The keypad no longer covers the field it is typing into (v0.0.9.48).** The page scroll area has reserved the keypad's height since iteration 29, but a screen is its own scroller and never received that reserve, so on Send the amount box sat underneath it. Every surface that can host an amount field reserves it now, and the keypad scrolls its own field into view on the frame after the reserve lands.

- **A target fix that had only ever held on paper (v0.0.9.48).** The confirmation-level remove control measured 34px against its declared 44px. The note left on 2026-07-25 blamed flex shrinkage and widened the button, which could not work: the control is a grid item and the row's last track was itself 34px, so widening the button could not widen the column it sits in. Track and control move together now, at the registered 44px icon target.

- **The reference documents speak one language (v0.0.9.47).** The founder found the reference and inventory documents in as many looks as there were generators, which is the D023 fault one layer up: "present a generated reference document" is one function and it had six implementations, each with its own colours inside its own build script. There is now one source, `Machinery/standards/charter-document.css`, inlined by the generators, and no generated document states a colour literal again. Everything is prefixed `--ch-` / `.ch-` on purpose: these pages embed live specimens of the app theme and of Machinery, and an unprefixed token would repaint the very specimens the page exists to show. Specimen surfaces deliberately keep the app's own background, because a component rendered on anything else stops being evidence.

- **Two defects the gates had stopped seeing (v0.0.9.47).** Re-running the runtime audit, which had not run since v0.0.9.30, failed on two counts that had nothing to do with this work and everything to do with the gap. The feedback page ran 6px off screen at 320px: the Demo roadmap grid used `max-content 1fr`, and a `1fr` track keeps `min-width:auto`, so its longest unbreakable content set a floor the 272px column could not honour and the whole section broke out of its parent by 30px. It is `minmax(0,1fr)` now. And the confirmation-level remove control measured 34px against its own declared 40px: it was a flex item free to shrink, so the target fix recorded on 2026-07-25 only ever held on paper. Both predate this run; the first was proven pre-existing by reverting this run's change and re-measuring the same 301.63px.

- **Five elements that no capture had ever seen (v0.0.9.47).** Regenerating at the contracted 1024 viewport surfaced five unclassified elements the previous artifacts missed, because an inventory only sees pages that were opened in the captured session and these live in JS-built rows. The four remove-row controls on Ambassador and My shop were a bare `✕` on raw utility classes at a 28px and 36px box, under the 44px minimum and invisible to the runtime gate that is supposed to catch exactly that; they now carry the registered compact icon action. The feedback Telegram paragraph was unclassified inline-styled text and takes the documented support-text class. Raising the debt baseline instead would have been an explanation where the law asks for a fix.

- **The price chart opens readable (v0.0.9.46).** On phone widths it auto-collapsed to a 56px band, so the price line, three labelled gridlines and the whole time axis were squeezed into a strip too thin to read - which is what the founder was looking at. That default made sense when the chart sat mid-page and the room mattered more than the detail. The page now reads chart, book, ticket: the chart is the first thing on screen and a reason to open the page at all, so it starts at its full height. Tapping the Price header still collapses it for anyone who wants the space back; only the default changed.

- **The bottom bar gets its breathing room back (v0.0.9.45).** Founder on mobile: no space above the icons, and the touch targets read badly. My own regression from iteration 37. When the fixed tab buttons became four user-chosen slots I authored their labels as `nlbl`, but the stylesheet has only ever known `.nlabel` (10px, weight 700). So every slot label fell back to 16px body text, which grew the button and swallowed the padding above the icon. The Wallet button kept its authored markup and its correct class, which is why it alone looked right and the four around it did not. Renamed in the markup and in the writer that repaints the slots, so nothing can drift apart again.

- **Bulk Orders is set aside, and says so (v0.0.9.44).** It escrows into `markets.XWINIWA_WINIWA.order_address` while the book and every taker use the direct-take covenant, so an order placed there is invisible and untakeable. Rather than leave an action that quietly puts funds somewhere useless, the tab stays exactly where it is, states **Coming later. Place orders one at a time on Trade for now**, and the action declines. The surface is visible because the product has bulk orders in it; it simply is not live yet, which is what a dormant surface should say. The rewire is specified in `V9_APP_WORK_PLAN.md` phase A and the guard is one flag to remove.

- **A fill that cannot be priced exactly is now refused, not ignored (v0.0.9.43).** The planner checks every leg before anything is built: cost is `base_atoms x limit_atoms`, and if that is not a whole number of units the order stops with a plain sentence asking for a slightly different amount. The snapping added in v0.0.9.42 means this should never fire, which is exactly why it has to speak if it ever does — the previous behaviour was to resolve successfully, post nothing, and leave the person watching an unchanged balance. That silence is what made the Exchange failure cost a full session to find, and it is the one outcome the honest-refusal law does not allow. Verified not to block legitimate orders: a live two-leg plan (a full fill at 1.005 plus a partial at 1.20) prices exactly and passes.

- **The Exchange works (v0.0.9.42).** Proven on mainnet: 0.3 Winiwa in, `0.29999853` Winiwa spent and `0.298506` xWiniwa received, exactly the figures on the confirmation. The last piece was the crumb. Snapping a partial fill to a size its price can express leaves a few atoms over, and the planner was letting those spill onto the **next** price level - buying 0.00000145 xWiniwa at 1.20 and pushing the total cost to 0.30000027, above the 0.3 being spent, which is both wrong and inexpressible. A snap means that level is filled as finely as its price allows, so the sweep now stops there and reports the rest unfilled. Nobody is ever charged more than they agreed, and no order chases dust up the book.

- **Why the Exchange could never execute (v0.0.9.41).** Root cause proven on mainnet. A fill costs `base_atoms x limit_atoms / 1e8`, so a partial fill whose cost is not a WHOLE number of atoms cannot exist on chain - and the engine did not refuse it, it simply did nothing. At the 1.005 ask, `0.29850746` xWiniwa costs `29999999.73` atoms and the order silently vanished; `0.3` costs `30150000` atoms exactly and executed immediately, on-chain, in the same minute. That is why the **Exchange** never worked while the **Trade ticket** usually did: the Exchange is driven by a quote amount ("spend 0.3 Winiwa"), so dividing by the price produces these sizes as a matter of course, whereas a person typing a base size lands on round numbers. Two changes follow. **The planner snaps a partial fill down** to the nearest size the price can express exactly (never up, so it can never spend more than was agreed; a full fill is left exactly as it rests). **And the Exchange now runs the market order rather than reimplementing it** - it had grown its own copy of the book read, plan, confirmation and executor, and one function with one reference is what keeps the two from drifting again. The price-impact agreement stays where it belongs, on the Exchange, asked before the order confirmation. **Still open:** with both changes in place the Exchange run still did not move the node, so it remains unproven; the snap is not yet taking effect on the live path and that is the next thread to pull.

- **Navigation stops throwing, and the Exchange stops failing in silence (v0.0.9.40).** Found by driving the real money paths end to end on-chain. **navigate() threw on any page whose bottom-bar button is now a user-chosen slot**: iteration 37 replaced the fixed tab buttons with slots, but navigate still looked one up by name, so `tab-mint` came back null and the throw landed mid-function, skipping every page-specific init below it. The active destination is now found by which slot carries the page. **The Exchange executed a different number than it confirmed**: a 0.3 Winiwa buy at 1.005 produced 0.2985074626865672 base, and that raw division result was handed to the engine while the modal showed the rounded 0.29850746. It now executes exactly what it states. **And an exchange can no longer fail invisibly**: the only report of failure was a single toast call, so anything wrong upstream left the person tapping Confirm and watching nothing happen. Failure now falls back through the field error and the console, and a 45-second watchdog says so plainly if the engine never settles. **Known open, not fixed:** the Exchange sweep still reports success while the node shows no movement, so the Exchange remains unproven on V9; the Trade page path is unaffected and was re-proven on-chain in this same run.

- **Every page is assigned to a side-menu section, and the bulk form appears where it is asked for (v0.0.9.39).** The menu is the app complete index, so a page reachable only from the bottom bar could be stranded the moment that bar is reconfigured. A previous pass added the missing rows but anchored them by text match and landed six in the wrong section, with My shop listed twice; the grouping is now rebuilt from the rows themselves, so no row markup changed and each simply moved to where it belongs. **Wallet is deliberately absent**: it is the permanent middle of the bottom bar, and a menu row for it would be a second door to the one place always already reachable. **Merchants and Exchange is renamed Merchants** and holds the shop-side pages (On/Off Ramp, Merchants, My shop, Invoice, Ambassadors). **Help holds only what helps**: the agent, the academy, the links and feedback, instead of the six unrelated pages that had drifted into it. **The bulk order form now opens directly under the selector that summons it** rather than below My orders and My trades, where choosing Bulk orders looked like it did nothing. **The price chart no longer loops**: it was drawn in the order samples were recorded while positioned by block height, so any sample arriving out of order sent the line backwards and closed a loop; the series is now sorted by block, carries one point per block, and drops samples older than the window instead of piling them onto the left edge. **Mark is renamed Mid** in the market bar, because it is the book mid and the book already labels that row Mid. **The wallet balance stops pulsing forever.** The total and the affected currency row pulse continuously while an incoming payment settles, and that cue was bounded only by the row reaching its confirmation target. On the founder node, four take rows were sitting with a pending-incoming flag, a status of On-chain and no block stamped, so their confirmation count was pinned at zero and could never reach the target: measured ages 587 to 726 minutes, all four still driving the pulse. The cue now also ends after twenty minutes, matching the balance stabilizer own hard cap, which means the held figure had already been released and the pulse was outliving the thing it described. The rows are untouched and still read honestly in Activity. **Build and the order cancel X become quiet actions**, carrying no surface of their own, and the registered quiet role now actually enforces its lighter weight (it stated 700 without precedence, so the button family 800 kept winning). **The agent sits beside the language control** in the menu head, since both are ways of changing how the app speaks to you. **The custom asset and pair selectors join the lit language**: every native field had been stood down to glass while the custom triggers kept the old opaque slab, which is what the founder recognised on the trade pair control as V8 styling. One rule, so every asset picker in the app updates at once. **The bulk action label is fixed at the source**: the rename to Add Orders lived only in the markup, and the runtime writer put "Deposit to liquidity" straight back on the button at every preview (the resume state said "Resume liquidity" too).

- **The Trade page reads in the order the work happens, and a selector stops pretending to be a heading (v0.0.9.38).** Founder direction, eight changes, all verified on the running app rather than by reading the stylesheet. **The page now reads chart, book, then ticket**: you look at the price, then at the depth you are about to take, then you place the order. **The pair control is a real dropdown again.** It was flattened to a bare label by a rule I wrote on the founder's own 2026-07-25 instruction to stop it dominating the bar; narrow was right, edgeless was not, and with no border there was no sign a second market existed to choose. It is now built from the app's **registered** selector (`ex-ccy-dd`) instead of a secondary action, which is the honest classification: a pair is a choice, not an action. That also explains why a local rule could never have fixed it — the framework enforces registered action geometry with `!important`, and it was right to win. **Every dropdown caret in the app was drawing as a small block**, found while checking that one: the language layer recoloured all four borders of a CSS triangle, so the two that must stay transparent filled in. It now recolours the top edge only, which fixes every selector at once. **Placing one order and placing many are one section** with a Single order / Bulk orders selector, instead of a second section further down that read as a different feature. **Bulk sides are named by the asset they commit** (Both, xWiniwa, Winiwa) rather than the venue words Asks and Bids. **Concentration is the same full-width bar as Bins / side**, with a live value. **Open orders becomes My orders**, which is what it lists. **The chart fills its panel**: it now takes its drawing box from the element it is in and redraws when that box changes, because a chart drawn while the panel was still laying out kept stale, narrow coordinates and sat letterboxed in a full-width panel for the rest of the session. Also in this iteration: **the chart's timeline stops moving** — it was scaled to the range of whatever trades existed, so the same chart re-labelled its own axis every time a trade arrived; the window is now a fixed 24 hours ending at the newest block, so the labels stay put and only the line moves. **Cancel becomes an X** in the orders table, which is a column of one action per row and not a place for a word. **Spot sits between Curve and Bid-Ask**, since it is the middle of that range and was listed first. And the bulk section and its action are named for what they do, **Bulk Orders** and **Add Orders**, rather than borrowing pool language ("Add liquidity", "Deposit to liquidity") for something that places ordinary orders on the book.

- **The bottom menu becomes the person's own, Exchange centres, and trading leaves the Wallet list (v0.0.9.37).** **The bottom bar is now four places the person chooses around a fixed Wallet**, defaulting left to right to Faucet, Mint, Wallet, Trade, More. The choices are offered in Settings and updates, grouped by the same sections the side menu uses, so the bar is a shortcut to what someone actually uses rather than a fixed guess. Wallet is not offered: it is the app's home, and moving it would move the one control muscle memory relies on. More stays available as a choice because it is the door to every page not in the bar. **The Exchange page sits centred** in the space the shell gives it: the page is short, so top-aligned content left a large empty band underneath. It centres only when there is room, so a tall screen centres while a short one still scrolls rather than clipping the top. **Trading rows no longer appear in the Wallet's recent list** (founder ruling: trading is reported on the Trade page). The rows still exist and still appear in full Activity, so nothing is lost or hidden; they simply stop crowding the Wallet, which is for money moving in and out. A trade row is recognised by its `TV81-` id prefix, so a future trade action inherits the behaviour instead of reappearing by accident.

- **The Trade page is reworked (v0.0.9.36).** Founder direction, seven changes. **Trading stays on the Trade page**: placing an order, sweeping and adding liquidity no longer jump to the Wallet, and the panels refresh in place (this resolves a question the UX laws had explicitly parked awaiting a ruling; send, receive, mint and burn still go to the Wallet). **The pair is a dropdown** that names every market the product will have, with USDw / Winiwa listed as coming soon rather than omitted, because a dormant market is stated, never hidden. **The book scrolls** instead of hiding depth behind "Show more depth". **Build replaces the reconstruct disclosure**, sitting beside the book title: rebuilding is a plain action, not a confession that something is broken, and it needs no confirmation because it imports proofs locally and posts nothing. The **snapshot age line is silent when healthy** and speaks only when a snapshot is missing or incomplete. **Trades become a sortable table beside open orders**, defaulting to My trades with a Mine/All selector, so the two panels read as one family instead of a table beside a list. **The chart plots price against time**: the y axis carries labelled price gridlines and the x axis is scaled by block height at the chain's cadence, so a burst of trades is drawn close together and a quiet hour is drawn wide, which sample-index spacing could not express. Alignment pass on the panel heads and the cancel column. The pair menu reuses the **registered** menu option rather than a bespoke row, after the audit ratchet correctly caught the bespoke version as unmapped debt.

- **An order the wallet cannot cover is refused in the app, not by the node (v0.0.9.35).** Founder report: the ticket read **"Available: 0 Winiwa"**, the Buy button fired anyway, and the node answered with the raw error `No Coins of tokenid:0xd4f5dd35… available!`. The Available line was honest; the action simply did not respect it. A live button that can only fail is what the honest-refusal law exists to prevent, and a raw node error is not a user message. The ticket now checks the wallet before touching the node and explains the shortfall in plain words, including **why** the balance is lower than expected: Winiwa committed to resting orders is escrowed on-chain and is not spendable until the order fills or is cancelled. A market order is re-checked against the **planned** sweep, not an estimate, because its true cost is only known once the fill is planned. Unknown is still not zero: if the balance has not loaded the ticket says it is syncing rather than refusing wrongly, and any failure inside the guard lets the order through rather than blocking a legitimate one.

- **Minting works on a node that never watched the vault, and two reporting bugs go with it (v0.0.9.34).** Three founder reports from one session, all real. **Minting refused** with "The vault balance state coin is not visible yet" on both peer nodes, and the cause was not sync: the vault's coins were created at deployment and are days older than the ~1,080-block unpruned window, so a node that was not tracking the vault back then cannot see them and there is no per-coin network fetch. The faucet had exactly this problem and the on-chain snapshot solved it; the vault was simply never added. **The snapshot now carries the vault's coins as well**, so a fresh node can mint as well as claim with no hosted service, and the reader classifies them by covenant address so they never enter the book. **The faucet claim double-counted itself** in the currency row (row showed true + 1,000 while the hero stayed honest): the optimistic credit was "balance before the claim + claim amount" but read the balance *after* posting, so a refresh that had already reflected the claim made it count twice. The pre-claim balance is now captured before anything is posted, which makes the target correct by construction. **Reconstruct reported raw coin counts** ("16 already held") in a place anyone reads as orders; it now says what was repaired, and says plainly when nothing was missing.

- **The order book stops reporting correct filtering as damage (v0.0.9.33).** Founder question: "how can the node know the number of orders and not be able to display them?" It could not, and that was the bug. The notice counted every coin at the engine address that did not become a row as *unreadable* and pointed at Reconstruct. Most were neither unreadable nor repairable: the direct-take covenant is **token-agnostic and serves every pair from one address**, so abandoned TV81 order coins still rest there and are filtered out by token id exactly as designed. On the founder's node that was **21 of 23 coins**, announced as damage on a book that was perfectly correct, and Reconstruct could never have cleared them. The reader now separates three outcomes: coins it holds but cannot read (state-blind, malformed, bad ports) which is the only case that raises the notice and the only one Reconstruct repairs; coins belonging to another pair or generation, logged and never surfaced; and coins already spent by a fill or cancel, likewise logged only. Book contents are unchanged, the same orders render as before; what changed is that the app no longer calls a healthy book broken.

- **The node connection is reachable again, from Settings (v0.0.9.32).** Founder report: there was no way to reach the RPC connection on the web build. The dialog itself was fine; the only door to it was the top-bar sync pill, and iteration 21 removed that bar from every page except the wallet. The Network card that would have been the obvious home is standalone-app only, so on web the app talked to a node it never named and offered no way to change. **Settings and updates** now carries a **Node connection** row that states which node is in use, whether it is actually responding, and opens the same dialog. It is shown on every platform per the no-hidden-surface law: on the standalone app the opener already delegates to the native network settings, so the control is correct there too. The line refreshes from the existing network-status paths, so it needs no poll of its own, and updates the moment the dialog closes. No new component: the row reuses the registered settings row and a registered compact secondary action.

- **The exported market-sweep hook now reaches the live engine (v0.0.9.31).** Found while re-proving the trade journey on V9: `__STABLES_TV81_EXECUTE_SWEEP` pointed only at the legacy fill path, which validates a `MARKET_ID` state port the direct-take order layout does not carry, so it refused every real order with "The selected order belongs to an unsupported market". **No user impact at any point** and nothing in the app was broken: the Trade tab dispatches through `tv81ExecuteMarketTicket`, which has always used the direct-take engine, and that is the path proven on-chain today. What was wrong was the exported hook, which is what an agent or test harness reaches for. It now dispatches exactly as the UI does, with its signature unchanged, so it still takes a preview from `__STABLES_TV81_PREVIEW_SWEEP` (that planner already read the direct book correctly). Presentation, routes, ids, handlers and transaction mechanics are untouched.

- **A dropdown looks like a dropdown (v0.0.9.30).** A select and a plain field were the same rectangle, so the asset selector on Mint gave no sign it opened. The cause was mine: the language layer set `background` on fields, and the shorthand also clears `background-image`, which is exactly what a native select draws its chevron with. Fields now set `background-color` only, and every dropdown in the app carries the same chevron at a size meant to be seen, in the theme's own ink, sitting in the 40px of right padding the field already reserved, so no geometry changed. Verified across all pages: 14 native selects and 3 custom asset pickers, none without a mark.

- **Our own keypad for amounts, and one quick-amount control everywhere (v0.0.9.29).** A phone keyboard is a general tool: its layout changes by locale, it carries a return key and suggestions that mean nothing for an amount, and it covers half the screen to offer letters nobody can type into a number. Amounts now open **the app's own keypad** instead. A focused input summons the system keyboard and there is no way to ask it not to, so the field is made readonly while the keypad owns it and restored the moment it closes; it engages only in the standalone app or on a coarse-pointer device, because making a field readonly would break typing on a real keyboard. Every key dispatches a real `input` event, so the calculators and validators already bound to these fields keep working. One bug found while building it: a `type="number"` field **rejects a value ending in a separator**, so reading the field back after each key silently lost everything typed before the dot; the typed string is now held separately and the field is shown the closest value it can hold. **Quick amounts are one control in one place:** whether the set is a half and a MAX or a row of percentages, they read as text actions on the availability line above the field. The trading page had them as boxed chips underneath it, which is why they looked unrelated to the same control everywhere else.

- **Pinch zoom actually works on the phone (v0.0.9.28).** The zoomability rule has been in the standard since D008 and the page had always allowed scaling: its viewport is `width=device-width, initial-scale=1` with no `user-scalable=no` anywhere, which is why zoom worked in the browser. The app is a WebView, and a WebView gates the **pinch gesture behind its built-in zoom controls, which default to off** — so `setSupportZoom()`, which defaults to true, had been doing nothing on its own. The controls are enabled now, their on-screen +/- buttons are left off so the gesture is the whole interface, and wide-viewport mode is on so the WebView honours the page's own viewport rather than substituting its own. Note that `touch-action: manipulation` on controls still suppresses double-tap-to-zoom by design; pinch is the gesture.

- **Menus close when you click away, and the map tells the truth again (v0.0.9.27).** **Clicking beside an open dropdown now closes it, everywhere in the app.** Each menu used to close only when its own trigger was pressed again or another menu opened, so one could stay open while a person carried on elsewhere; a single listener in the capture phase covers every menu in the product, including the panels that get portaled to `<body>` for positioning. **Wallet management moves into Preferences** and sheds the explanatory prose: the app states values and offers controls, the agent explains, and the page drops from about 2,000 to 1,500 pixels of screen. **The repeated location and shop blocks** leave their tinted boxes and are held by space and a hairline like every other group, which is what removed the last of the boxed-in fields. **Nested containers reach zero.** The detector was also corrected twice, honestly: it had counted a single hairline as a box, when D021 permits hairlines and they are how open rows are held together now; and it had counted the parts of a segmented control as nesting, when a track holding segments is one registered element by definition. With both corrected the real count is zero, and the ratchet now holds it there. **`/design/map` is generated from the app.** It was written by hand weeks ago and had come to describe an app that no longer existed, which is worse than no map since it is what an agent reads before touching the UI. `build-visual-charter-map.mjs` now builds it from the measured inventory, the element and composition registries, the recorded language, the migration contracts and the gate baselines, and it carries every link from the previous version forward so regenerating can never orphan a document. It stamps itself STALE when the measured inventory and the app disagree.

- **The Trade page (v0.0.9.26).** Four things, all of them the page telling you something it should not. **The market bar was sticky**, so it followed you down the screen like a header the page already has; it now scrolls with the market it describes. **The pair selector** was a filled button holding two words, which is what made it look like it owned five eighths of the page; the pair is the subject of the screen rather than an action on it, so it now reads as a heading you can change, a name and a chevron with no surface. Its geometry stays the registered action size, so it is still a real target and still one of the family, and the heading feel comes from weight rather than a type size no other action has. **Amount fields scaled with the viewport** up to 32px, which made a form input shout louder than anything around it; they settle at one stated 20px, still tabular and still the heaviest thing in their own row, and the runtime gate's expectation moves with them. **An unchosen Buy or Sell side** was a near-black slab, which on a lit surface reads as a hole punched in the page rather than as "not selected"; it is glass now, and the chosen side keeps its own semantic tone.

- **Only Winiwa, xWiniwa and USDw are selected by default (v0.0.9.25).** The wallet opened with seven currencies switched on (Winiwa, xWiniwa, USDw, EURw, GBPw, CADw, CNYw), five of which have no on-chain existence yet, so a new wallet showed a list of rows that could only ever read 0.00. The default set is now the three assets that are real today; every other currency stays in the list and is switched on from Settings when it matters. Anyone who has already chosen their own set keeps it: this changes the default, it does not reset a choice.

- **Direction first, and the mark carries the wait (v0.0.9.24).** On Exchange, the swap-direction control sat against the left edge of the card; it now sits on the centre line between the two amounts, which is where the eye goes when it asks which way round this is. On Mint, the order is reversed: the **Mint/Burn switch comes first and the asset second**, because what you are doing comes before what you are doing it to. On Android, the boot screen no longer shows a generic spinning wheel under the logo: the **Stables mark itself breathes** while the embedded node starts. It is a View animation rather than an ObjectAnimator for the same reason the old arrow was, a ValueAnimator freezes when the system animator duration scale is 0 and the screen would look hung. **The colour themes now take full effect, background included.** The language stated its own colours as literals, so all six themes rendered the same lit blue surface and the theme choice stopped at the chrome. Every value, the field, the ink, the glass, the lines and the accent, is now derived from the active theme's own variables, so paper is a genuinely light surface with dark ink and a blue accent, rose is rose, solar is amber, and so on. Ink on the accent is the theme's background, which is why it stays readable whether the accent is bright cyan on near-black or deep blue on white.

- **Two visual rules become gates instead of good intentions (v0.0.9.23).** The founder asked how to stop bad surfaces reappearing rather than fixing them one at a time, so both problems were turned into checks. **A page opens with its own content:** an action whose whole effect is `navigate()` elsewhere may not sit between a page header and its first section, because destinations belong to the bottom bar and the menu. The Merchants page opened with two pills that only went to My shop and Ambassadors, and Contacts had a Back button that only went to the Wallet; both are gone, and `audit-app-ui-contract.ps1` now fails on any new one. **No container inside a container:** a surface drawn inside another surface is what made the confirmation policy read as a pile of nested slabs (a rounded group holding a darker field inside a bordered row). Those wrappers stand down, which took the app from 53 nested surfaces to 29, and `audit-app-ui-nesting.mjs` records that as a one-way ratchet: existing debt is stated honestly, new nesting fails the gate. The ratchet is deliberate rather than a demand for zero, because some nesting is legitimate and forcing it apart would help no one.

- **The StablesAgent dialog joins the language (v0.0.9.22).** Only its head had adopted the surface: the conversation panel underneath painted its own near-black background over the lit field, so the dialog stayed dark from the head down. That panel now stands down like every other container and lets the field through, the compose field reads as glass like every other field, and the privacy warning keeps its meaning without sitting on a slab. **Its header is rearranged onto one line:** the language select had grown to full field width, pushing the two icon controls onto a row of their own and leaving a 129px pile at the top of the dialog. Identity sits left, the language and the two controls sit right, and the name and context truncate rather than forcing anything to wrap; the header is now 73px.

- **The faucet nudge no longer flashes on a funded wallet (v0.0.9.21).** The first balance repaint after the node loads reads every currency as zero, which is indistinguishable from an empty wallet, so the dialog opened and then closed again a moment later once the real amounts arrived. Emptiness now has to **hold**: the dialog is scheduled rather than shown, any balance appearing inside the settle window cancels it, and the conditions are re-tested at the end of the window before anything appears. Hiding stays immediate, because only appearing needs to wait. **The header bar is gone from every page** except the wallet, where the mark sits directly on the background; the band it reserved is reclaimed, so pages start at the top of the screen. **The side menu, the agent panel and the Trade view** leave their boxes and join the language. **Exchange and Trade lead the My Assets section** of the menu and each states its own page name and subtitle; Exchange and Treasury gained the subtitles they were missing, so every page that has a header now names itself. **The faucet page** drops the You receive row, the faucet level and the ask-the-team line, and its claim reads like Burn test tokens: a name, a line, an action. **A destructive action no longer wears the accent** (the burn button had become cyan, which says do this). Verified three ways: nothing appears during the window, a wallet whose funds arrive late never shows it at all, and a genuinely empty wallet still gets it.

- **The faucet nudge only appears on an empty wallet (v0.0.9.20).** It was already gated on an empty wallet, but it was driven from the global balance repaint, which runs on every page and had no page check, so an empty wallet could put the dialog over Mint, Exchange or Settings. It is now scoped to the wallet page as well as to an empty wallet. Verified both ways: with funds it stays closed, and while empty it opens on the wallet and stays closed on Mint, Exchange and Settings. **The On/Off ramp route steps also leave their boxes** and sit on the background like everything else: the sequence is already carried by the step numbers and the rail beside them, so the outline around each one said nothing the number had not already said.

- **The whole app gets the wallet's feeling (v0.0.9.19).** Three changes, one intent. **The side menu** adopts the language: destinations become open rows with one uniform glass mark each, a white name and a quiet line, held by hairlines instead of boxes. **Exchange and Trade become two destinations** in the menu rather than two tabs of one page; they still share one implementation, so no market, order or liquidity code moved, and the in-page tab bar stands down because the question is now answered by the route. **Every remaining container family stands down app-wide** (`exchange-card`, `ui-inset-panel`, `mcard`, `merchant-promo-card`, `prop-card`, `addr-box`, and the domain cards), not just the two the wallet happened to use: pages like On/Off Ramp were still full of boxes carrying dark legacy fills that read as holes punched in a lit page. Diagram nodes, fields, chrome and meaningful state surfaces keep their boundaries, because those earn them.

- **Mint becomes one unified page (v0.0.9.18).** Mint and Burn were two large buttons, repeated inside the xWiniwa panel and again inside the stablecoin panel, which made the direction look like the commitment. They are now a **single quiet switch for the whole page**, defaulting to Mint, and both asset panels follow it, so changing asset never changes what a person asked to do. The commitment stays where it belongs: the action at the bottom of the form. The **xWiniwa/Stables switcher is gone**: the asset is chosen in one dropdown listing xWiniwa and every live stablecoin, and the currency pickers inside the mint and burn forms stand down, so the asset is answered in one place. Picking a stablecoin sets both the mint and the burn currency, so the form never disagrees with the chooser. No handler, id or transaction path changed.

- **Pop-ups become screens, and the language reaches every page (v0.0.9.17).** Send, Receive, and the currency and transaction detail are now full pages with a back control and a title, not dialogs floating over the app. They keep their modal ids, openers and close handlers, so no route, hook or money path moved; only the presentation changed. The pattern is one rule, `data-modal-shape="screen"`, so the next screen costs an attribute. **The open and lit language now covers all 24 pages**, not the wallet alone: every page opts in with `data-machinery-lit`. Two pages overflowed once the wider gutter exposed content that was already too wide, and are fixed: an inline settings row now wraps, and the ramp diagram scrolls inside itself while the page stays reachable. **On the wallet the mark, name and line sit directly on the background** rather than in a header, with no connection indicator; every other page keeps its header. **Privacy blur is proportional to the text** it hides, because at a fixed 8px the 60px balance was still readable. The agent icon defaults to the top right. Runtime audit passes: 24 pages at 320, 360, 390 and 760, no overflow, no undersized target, no role violation, no geometry drift.

- **The wallet takes the reference's proportions, Receive is reworked, and the element gate tells the truth again (v0.0.9.16, MIG-005).** Founder direction: adopt the proportions of `explorations/wallet-modern.html`. The page gutter becomes the reference's 24px and every edge on the screen shares it, so the separator under a holding ends where the text above it ends. Rows move to the reference's 18px rhythm, the balance grows to 60px with the reference's tight tracking, the two verbs get real air above and below them, and holdings adopt one type scale: name 16px, its qualifier 13.5px muted, amount 16px, converted value 13.5px muted. **Currency marks become one family:** every holding now wears the same 38px glass disc, the letter badges and the country flags alike, instead of a row of differently shaped badges. (The full-bleed rows shipped earlier in the day are reverted: the reference puts the separator on the gutter, and the reference wins.) **Receive is reworked.** The duplicate "Large QR" button is gone: the code itself is the control, as asked, so it is now announced as a button, reachable from the keyboard, and shows a real press. The code gets room, a glass frame and a white field once drawn. Both money dialogs also get their name back as a title, which they lost when the Send/Receive switcher stood down in v0.0.9.14. **The active destination in the bottom bar** was blue text on a blue pill, which the lit surface made unreadable in every theme; it now wears the accent with its own ink. **The element gate is honest again:** the runtime audit had been failing against a contract that never existed, asking for action padding no registered definition specified, while real drift hid in the noise. The pins now state the registered geometry, a full-width action is measured by its own size axis, and a bottom sheet is measured as the dialog sheet it is rather than as a centered modal. Four controls were misclassified and are now what they actually are: the balance-visibility control and the language globes are icon actions, the photo-scan fallback is a quiet action, and the wallet's two verbs are a primary and its peer choice rather than two utility buttons. The registry's `icon` role, present in the allowed axes since the start but never implemented, is now implemented. **The runtime audit passes for the first time in this series:** 24 pages at 320, 360, 390 and 760, no overflow, no undersized target, no role violation, no geometry drift. Presentation and classification only: no money-movement, MDS, node or transaction change.

- **Elements sit on the app background, and rows use the whole screen (v0.0.9.15, MIG-005).** A general rule from the founder: present elements directly on the background of the app rather than inside defined sections, and use the full width of the screen. Three things were in the way on the wallet. **The light field was painted on the page element**, so it stopped where that element stopped: a hard seam ran across the screen 84px down, and the wallet read as a lit section sitting on a darker app. The field now belongs to a fixed layer that is the app column at full height, so the surface is continuous from the top of the screen to the bottom. It stays constrained to the app column, so the earlier fix holds too: on a window wider than the column there is still no seam where the column ends. **Cards were still clipping.** A card clips its children to a rounded box, and with the box itself stood down that clip survived only as a cut across the top and sides of the currencies and activity lists. Stood-down cards no longer clip. **Rows stopped short of the edge.** A separator that ends before the screen edge draws the outline of a section, which is the one thing this language does not have, so rows now span the full width of the app and give the gutter back to their text from the inside: the row, its separator and its touch area reach the edge while the reading edge stays aligned with everything else. One bug found on the way: an activity row is a `button`, and a button sizes itself to its content, so `width:auto` looked right on a phone and left the separator hanging in mid air on a wide window; the width is now stated. The shared rules moved into a reusable layer, `assets/machinery-language.css`, that a page opts into with `data-machinery-lit`, so the language is written once instead of copied into each page's sheet, and the wallet sheet now carries only what is particular to the wallet. **Only the Wallet opts in**, at the founder's direction, until the general approach is agreed. Presentation only: no structure, id, route, handler, money-movement, MDS, node or transaction change.

- **Send and Receive dialogs adopt the language, and the wallet edge is fixed (v0.0.9.14, MIG-005).** The two verbs the wallet exists for now carry the same open and lit language as the page that launches them: one lit surface, containers stood down, labels muted, fields as glass, and the accent reserved for the action that moves money. They are addressed by id rather than the wallet scope because they live in the shared modal layer, so the treatment holds wherever they are opened from. **Fewer controls in both dialogs:** the Send/Receive switcher at the head is gone (the dialog you opened is the one you wanted), the quick-amount chips are gone, and scanning from a saved photo becomes quiet underlined text rather than a full-width button, since it is a rare fallback. **The "broken side" is fixed:** the light field was painted on the viewport with `background-attachment: fixed`, so on any window wider than the 580px app column a seam appeared where the column ended. The field now belongs to the app column itself and the base tone is continuous behind it, at any width. Measured in privacy mode: rows span exactly the same 14 to 376 as the action row, with no horizontal overflow. The transaction history is renamed **Activities**. Presentation only, apart from the recorded rename.

- **Wallet: fewer controls, and transactions return to the history (v0.0.9.12, MIG-005).** The **"View all" control is gone** from the wallet's latest activity, and the **"Currencies" section name is gone** from the holdings list: the balance above and the rows themselves already say what they are. **Closing a transaction opened from the wallet now leaves the person in "My transactions"** rather than back at the balance, because reviewing one payment usually means reviewing the ones around it; the hook is scoped so it only redirects when the transaction was opened from the wallet, and it never blocks the dialog from closing. The Activity page already carried the name "📋 My transactions", so no rename was needed.

- **Wallet: two real bugs fixed and the screen given its full width (v0.0.9.11, MIG-005).** **The faucet dialog never appeared** because `.wallet-onboarding-card` carries `display: none` in its own class, left over from when the card was toggled by inline style; inside the modal shell the overlay controls visibility, so the card stayed invisible at zero width. **The balance rendered as a cyan bar** because `.w-total` paints itself with a gradient text fill (`-webkit-text-fill-color: transparent`), which silently ignores any `color` rule; the balance is now solid white, per the language rule that the accent belongs to the primary action alone. **The currency is now named while the amount is still arriving**, so a person is never watching an unlabelled placeholder. The **hide control loses its circle** and sits directly on the surface like everything else, keeping its 44px target without drawing a container. And the **wallet now uses the full phone width**: a single narrow gutter with no nested padding inside it, so every row runs edge to edge instead of paying for three levels of inset. Presentation only.

- **Wallet refinements from founder review (v0.0.9.10, MIG-005).** Three corrections on the migrated wallet. The **balance visibility control** was a speck at the edge of the screen; it is now a proper 44px circular target in the language, so hiding balances is a real action rather than a hunt. The **page starts higher** now that the header is gone, recovering the space the removed chrome was holding. The **latest activity keeps its section name**: the previous build hid the section label for both the balance and the activity list, when only the balance needed it removed (the hero already names the unit). The rule is now scoped precisely to the section containing the balance hero, so every other section keeps its name. Presentation only.

- **Wallet stripped to the money, and a new house rule for dialogs (v0.0.9.9, MIG-005).** Three changes on the wallet page and one law. **The header is gone entirely** on the wallet: no brand, no status, no connect control competing with the balance. It remains on every other page, and the connect dialog still opens by itself when the node is not live, so nothing became unreachable. **Latest activity joins the open language:** transaction rows lose their boxes and tinted borders and become open rows with hairline separators and white tabular amounts, matching holdings directly above them. **The faucet nudge is no longer a card wedged above the balance:** it is a dialog over a blurred backdrop, shown only when the node is live and the wallet is genuinely empty, exactly as before. **New house rule, recorded: dialogs carry no close or X control; a person leaves by clicking outside**, the same gesture everywhere in the app. Dismissal is remembered for the session, otherwise the next balance repaint would put the dialog straight back on screen. The dialog reuses the app's existing `if(event.target===this)` click-outside idiom rather than inventing a new one. Behaviour change limited to that dialog; no money-movement, MDS, node, or transaction code touched.

- **The Wallet page adopts the open and lit language (v0.0.9.8, MIG-005, decision record D021).** First page of the app built in the new visual language, scoped deliberately to the Wallet alone as the proof before extending. One lit surface (a lifted blue base with a two-tone light field) with glass top bar and bottom navigation, applied through `body:has(#page-wallet.active)` so it appears **only while the wallet is the active page** and every other page renders exactly as before; browsers without `:has()` simply keep the current look, which is a safe fallback. Within the page: containers stand down (section cards become transparent, grouping comes from spacing and type), the balance becomes the one large thing on screen, Send and Receive become two real side-by-side buttons with the accent spent on Send alone, and holdings become open rows with uniform glass marks and hairline separators instead of per-currency tinted cards. Per-currency colour coding stands down because the language gives the accent to the primary action. Registered as machine contract `wallet-open-and-lit-migration.v1.json` with preserved hooks, so `verify-migrations.mjs` proves the wallet's ids and handlers cannot silently move. **Presentation only:** no structure, id, route, handler, money-movement, MDS, node, or transaction change.

- **The action family is adopted from the element catalogue — MIG-004, the first real element adoption (v0.0.9.7, decision record D020).** Reviewing v0.0.9.6 the founder observed that the changes were subtle and the ELEMENT_CATALOGUE elements did not look implemented. That was correct: MIG-003 had delivered a conformance floor only, its `elementBindings` was empty, and the whole app carried just 95 `mx-*` identities, all inside the MIG-001 trade region. This build adopts the first real element family. **193 actions across all 24 pages** now carry the registered `M-EL-ACTION` identity (`mx-action` plus `data-role`, with `data-size` and `data-layout` axes): 99 secondary, 39 primary, 26 choice, 14 transaction, 10 quiet, 5 danger. The adoption stylesheet implements the definition's actual contract — **56px default action height (commitment actions grow from the legacy 52px), 48px compact, 12px radius, 20px horizontal padding, 48px minimum width**, plus the registered focus-visible and disabled states. Unlike the previous build this is plainly visible on every screen. **65 element bindings** are written into the machine contract, so `verify-migrations.mjs` now proves on every run that each identified action keeps its identity, required class, and axes. Cascade ownership is explicit: `machinery-app.css` now loads before `machinery-ui.css`, so at equal specificity the MIG-001 trade adapter keeps ownership of the trade region. **Additive only:** the sweep adds classes and data attributes; no id, route, handler, structure, money, MDS, or node change, and no colour literal is introduced, so all six themes keep their own language. Element adoption continues family by family: typography, surfaces, fields, then status and overlays.

- **Fix: two navigation destinations could appear active at once (v0.0.9.6, found by MIG-003 verification).** `navigate()` cleared the `.active` class from the four real tabs only. `#tab-more` is not in that list, so once it lit (any drawer page: settings, activity, council, faucet and the rest) it was never cleared, and returning to Wallet, Mint, Invest or Merchants left **More lit alongside the real tab**. The bottom bar then showed two active destinations, which the navigation element contract forbids. `navigate()` now clears `#tab-more` explicitly before lighting the correct destination. Pre-existing bug, unrelated to the presentation migration, surfaced by the cross-theme screenshot pass; one-line state fix, no route, handler, or id change.

- **Whole-app presentation adoption — MIG-003, the one run (v0.0.9.6, decision record D019).** The owner resolved every open product decision in the reality-to-target gap (decision sheet Groups A and B) and authorized a single implementation run adopting the North Star presentation across the whole application. This build applies the **North Star mobile presentation floor on every surface** through one scoped stylesheet, `assets/machinery-app.css` (`[data-machinery-scope="app"]` on `<body>`), registered as a machine-verifiable contract with **63 preserved hooks** covering every uniquely-identified interactive element in the app — so `verify-migrations.mjs` now proves on every run that no id or handler in the whole application silently changed. Measured first, not guessed: an audit of all 24 pages found 1,113 text elements below the 14px legibility floor and 138 touch targets below 48px. The run raises the systematic support-text classes (`.xs`, `.flabel`, `.stitle`, `.ccy-pill`, `.app-page-header__sub`, exchange currency-row classes) to 14px and the standalone controls (`.ccy-pill`, `.max-link`) to 48px. **Evidence-based exemptions are recorded rather than forced:** inline prose links keep their intrinsic height (the element law classifies inline links separately from row links, and forcing 48px would break the sentences they live in), `.circle-orb` diagram nodes are absolutely-positioned illustration geometry, and native sliders/checkboxes/toggles keep platform geometry. **Presentation only:** no structure, id, route, handler, script, money-movement, MDS, node, or transaction change; the stylesheet sets **no colour at all**, so all six themes keep their own language (DEC-003); copy is untouched beyond the mechanical law (DEC-004). Specificity is held at (0,2,0) so the MIG-001 trade adapter and the MIG-002 shell sheet keep ownership of their regions. Full per-role typography is adopted surface by surface during the element reviews; this run is the floor, not the ceiling. Also added the six previously unmapped pages (contacts, chat, on-off ramp, ambassador, my shop, invoice) to the migration ledger, closing a silent completeness hole.

- **Paper-theme active tab restored under the MIG-002 shell override (v0.0.9.5, DEC-003).** The founder resolved decision DEC-003: the full multi-theme system is kept (recorded deviation from the single North Star identity). Audit of that decision's consequences found the MIG-002 shell stylesheet defeated the paper (light) theme's own `.ntab.active` language by cascade order, tinting the light shell with the dark theme's cyan pill. `machinery-shell.css` now restates paper's values at higher specificity, so paper renders exactly as it did before MIG-002 while all dark themes keep the North Star clean pill. Rule recorded in the stylesheet and decision sheet: future shell work drives colors from theme variables, never literals. CSS only; no id, route, handler, or script change.

- **Bottom navigation aligned to the North Star shell language — MIG-002 (v0.0.9.4).** First production migration under the Machinery framework's Wave 7 migration lifecycle (authorized by decision record D018; contract `work/Machinery/migration/contracts/MIG-002-shell-navigation.md`). The shipped app's shell was frozen read-only, then the bottom navigation's presentation was brought to the approved North Star language: the active tab is now a clean filled pill (North Star `--mint-soft` fill, no competing outline border) and the nav icon uses the North Star 18px size. Implemented the same way as MIG-001 — a scoped stylesheet `assets/machinery-shell.css` (`[data-machinery-scope="shell"]`) layered over the base, not an ad-hoc inline edit — and registered as a machine-verifiable contract (`projects/stables-current-app/migrations/shell-navigation-migration.v1.json`) so `verify-migrations.mjs` now proves on every run that the five nav hooks keep their exact handlers. **Presentation only** — nothing else changed: all five tabs (Mint, Invest, Wallet, Merchants, More), every `#tab-*` id, the `navigate()` router, the `.page`/`.active` model, all 24 `#page-*` routes, and the per-page money/node dispatch hooks are preserved exactly. The founder chose to preserve the current five-tab information architecture and align only its look (recorded, deliberate deviation from the North Star's four-destination model); adopting the four-destination model remains a possible later, separately authorized migration. Key migration finding: the shipped shell and the North Star already share the same accent hue (`#67e8f9`), radius, and structure, so shell alignment is low-effort. No money-movement, MDS, node, or transaction code touched. Verified on web preview (app boots, all pages navigate); founder device verification pending.

- **xWiniwa par vault live on V9 — mint/burn works again (v0.0.9.3).** The xWiniwa NAV vault (deposit Winiwa → receive xWiniwa; burn xWiniwa → receive Winiwa) is redeployed on the V9 token set and wired into the app, so the xWiniwa mint/burn surface — dormant since the genesis reset — works again. It is the proven TV81_XWINIWA_VAULT_V1 covenant (D13 par law: 1 Winiwa = 1 xWiniwa both directions while no stablecoin external supply exists), rebuilt against the fresh V9 Winiwa/xWiniwa ids with a fresh address (`0xf4b1826c…`), seeded with a 100,000,000 xWiniwa reserve. The vault is app-compatible by construction — its generation and tags match what the existing v8 vault code (`tv81VaultOnChain`) expects — so **no front-end code changed**; only `registry.xwiniwa_vault` now points at the V9 vault. Proven on mainnet: the par mint/burn round-trip closed cleanly on an isolated dust-prove (mint 10, burn 10, reserve/issued/pool all reconcile, value conserved), and a mint driven through the real app path issued 5 xWiniwa for 5 Winiwa. The remaining ~900M xWiniwa stays in cold custody until the price-based (NAV/market) phase, which upgrades this same vault later. No covenant/engine/trade-math change beyond the token identity it points at.

- **Faucet-proof anchor extension — the faucet is now claimable on a fresh node with zero VPS (v0.0.9.2).** The rolling book anchor already carried order proofs so a new node can rebuild the book from the chain; it now also carries the **faucet pool coin + state coin proofs** in each snapshot. The opt-in publisher (`tv81AnchorPublishSnapshot`) reserves up to two record slots for the current faucet coins (and can publish a faucet-only snapshot even when the book is empty); the reader (`tv81AnchorGapFill`) imports every record so a fresh node holds the faucet coins and can immediately claim Winiwa, while recognising faucet coins by their covenant address and keeping them out of the book source list (counted as `faucetProof` in the `[STABLES-ANCHOR]` log). This closes the dependency-free loop: with any install publishing snapshots, a brand-new node claims from the faucet and rebuilds the book without touching any hosted service. No covenant, engine, or trade-math change.

- **V9 GENESIS RESET — clean two-wallet restart on a fresh token set (v0.0.9.1, TestV009 line).** The whole test economy is re-created fresh on two purpose-built wallets: **Hot** (operational, the only signer) and **Cold** (custody, never signs). No legacy asset is carried over. New tokens minted on Hot: Winiwa `0xd4f5dd35…` (1B), xWiniwa `0xefa53eff…` (1B), USDw `0x9174ad44…` (100M); xWiniwa reserve + full USDw supply moved to Cold, dormant. **Full-supply unattended faucet:** the entire 1B Winiwa lives in the permissionless faucet pool at `0x5e08c5dc…` (generation id `0x5c868a0f…`, tag 9101, claim 1000 / 72-block cooldown) — no issuer, no refill path, no human intervention ever again; dust-proven both branches to exhaustion and a real production claim confirmed on mainnet. **Direct-take order book** proven on the fresh xWiniwa/Winiwa pair (the token-agnostic engine `0x0DC32630…` is reused; V9 isolation is by token id). This app build cuts the runtime over to the V9 assets: `TEST_TOKEN_REGISTRY` and the registry projection carry the new token ids, generation id, and live faucet; the direct market points at the new pair; the **state beacon is dropped** (the rolling anchor supersedes it); the **anchor generation tag moves to "TV91"** (`0x54563931`); and all activity/wallet/faucet/cooldown **storage keys are bumped to a V9 namespace** so every install (including the phone) abandons stale TV81 rows and caches on first load. The internal code namespace strings (TestV008 / v0.0.8.1 / tv81 / TV81-REGISTRY-001) are deliberately kept to avoid a high-risk global rename — they are not on-chain identity. xWiniwa mint/burn and USDw surfaces stay visible but refuse honestly until their fresh V9 vault chain is built (later P6 work), per the no-hidden-surface law. Version line resets to v0.0.9.0, iteration 1. Full transition record: `stream_3_governance/task_wallet_transition/WALLET_TRANSITION_PLAN.md` + `V9_GENESIS_REGISTRY.json`. No covenant/engine/trade-math logic change to the app itself — only the on-chain identity it points at.

- **"Publish book snapshots" settings toggle — R4 ships live (v0.0.8.81).** The in-app anchor publisher `tv81AnchorPublishSnapshot` was VERIFIED end-to-end this run on a quiet funded node (web preview over plain RPC, per the founder's no-emulator direction): it published a 16-order page + head funded by Winiwa dust, the app's own reader validated it (`READY_WITH_COVERAGE`, head age 0), and a second node (Test12) independently captured and validated the same snapshot via ordinary sync — all 16 records locally validated executable. With the publisher proven, the founder-approved settings toggle now ships in Settings and updates → Order book: label "Publish book snapshots", default OFF, support line "Shares the order book on-chain so new users can rebuild it. Uses a trace of Winiwa per update." (exact approved copy). Built from existing catalogued components (section shell, standard card, the Node-card checkbox row idiom, ui-* utilities — zero new inline styles). When ON: one immediate publish if no fresh head exists (the existing `tv81SetAnchorPublish` contract), then a heartbeat inside the 30-minute anchor pass that republishes only when no validated head exists or the newest is past the 600-block cadence; the publisher refuses honestly without live orders or a funded wallet, and a mid-run failure leaves read-only behavior unchanged. Known v1 bounds (recorded): single page (first 16 live order coins, no priority ordering — the multi-page/prioritized packer is the follow-up), no delta publishing (full snapshot only). Two harness findings recorded for web-preview publishing: the ~7.5KB page-payload `txnstate` command exceeds Node.js's default 16KB HTTP header limit in the local CORS proxy (`--max-http-header-size` fixes it; the phone's native bridge is unaffected), and the VPS oracle-node RPC needs a curl-style transport. No covenant, engine, or trade-math change.

- **Faucet proof recovery after node or bridge outages (v0.0.8.80).** Failed faucet and state-beacon tracking attempts no longer latch permanently after a temporary RPC or node outage. The Faucet retries proof reads in the background, renders the existing honest `Proof unavailable` state while no verified proof exists, and automatically recovers the level and claim readiness when the participant node returns. No fabricated balance, remote-value fallback, covenant, engine, or trade-math change.

- **Trade-tab improvements: book scroll, sortable open-orders table, liquidity concentration slider + side scope (v0.0.8.79, founder findings/direction 2026-07-24).** (1) **Order book scroll** — the expanded book now renders ALL price levels inside a bounded scroll container (`.tv81-book-side`, max-height + overflow-y) instead of hard-capping at 9 per side, so a deep book is fully viewable (founder: "the orderbook is missing a scrolling capacity so the user can see all orders"). Collapsed default stays 5 rows. (2) **Open orders is now a real sortable table** — Side · Price · Size · Filled · Age columns, tap a header to sort (`tv81RenderMyOrdersTable` / `tv81SortMyOrders`, rendered from a cached row set so sorting needs no chain re-read), replacing the previous list. (3) **Add liquidity — concentration slider + side scope** — a continuous curvature control (`_tv81LpCurve`, weight ∝ level^(curve·3): concentrated-to-middle ↔ flat ↔ concentrated-to-tails, near-mid bins thinned-not-zero in tails mode) generalises the old Spot/Curve/Bid-Ask, which become its presets; a Both/Asks/Bids side-scope selector gates which side(s) get orders with the deposit fields following; the preview heatmap now shows the actual normalized weights. The ladder already compiles to real direct-take resting orders. No covenant, engine, or trade-math change. (R4 in-app publish toggle deferred this iteration: the publisher `tv81AnchorPublishSnapshot` is implemented but ships DORMANT — no toggle wired — pending verification on a quiet/embedded node; the VPS daemon keeps publishing.)

- **Fix phantom dust-receipt activity rows (v0.0.8.78, founder phone finding 2026-07-24).** After the anchor shipped, the app showed "Received Winiwa +0.000001 · On-chain sender" rows in Activity. Root cause: R1 tracks the book-anchor head/page covenants with `newscript trackall:true`, so every published page/head dust coin (0.000001 Winiwa) appearing at those tracked addresses was picked up by the tx-mirror incoming reconciler as a user payment. Fix: the anchor head/page addresses, the direct-take order covenant (`direct_market.order_address`), and the book-source registry are added to the tx-mirror infrastructure-address set (`__STABLES_TV81_INFRA_ADDRS__`, kind `book`), so their tracked coins are classified as covenant coins and excluded from the activity net (only wallet-OWNED receipts render as rows) — deterministic, independent of `checkaddress` behavior on tracked script addresses. Also prevents order-escrow coins from creating duplicate rows alongside the explicit one-row order-placement entry. Pure activity-reconciler logic; no UI, engine, covenant, or trade-math change.

- **Rolling book anchor — R2: the chain feeds the visible book (v0.0.8.77, founder-approved).** The boot anchor pass now goes beyond observation: after validating the newest on-chain snapshot it imports every order proof this node lacks (`coinimport track:true`, locally verified — spent or stale records fail import and drop by design, which is what makes delta tombstones harmless), merges all snapshot coin ids into the book reader's held-order merge list (the v0.0.8.72 mechanism), and refreshes the book panel. A single decision-relevant status line appears in the book section ("Book snapshot: verified, Xm old", with honest waiting/incomplete states — never a false empty book), refreshed by a 30-minute periodic re-pass. The manual "Reconstruct book" control is now ANCHOR-FIRST: it reads the on-chain snapshot before HTTP sources, which demote to accelerator/fallback (a user-entered source URL is always honored). Publishing dust is WINIWA per the founder ruling — no MINIMA float, faucet, or display anywhere; any install that has claimed the faucet can publish snapshots. Protocol side proven on mainnet 2026-07-23 (phases 0–3, delta cycle, forged-head rejection, publisher race, Winiwa-funded snapshot validated by a clean newcomer node).
 founder-approved integration design 2026-07-23).** The common-book availability path is moving from external transports to rolling on-chain proof snapshots (fixed head/page covenant addresses; protocol proven on mainnet the same day: clean-node forward capture, aged-proof import + on-chain take of an out-of-window order, the A→B→C relay baton, live delta publishing, forged-head rejection, and a simultaneous-publisher race — journal `task_test_channel/tools/tv81/anchor/anchor-deployment-journal.json`). This iteration is OBSERVATION ONLY: a new `book_anchor` registry block carries the canonical addresses/scripts/bounds; the boot chain tracks both covenants (clean-form registration via the existing `ensureCovenantTracked`) so the node forward-captures every future snapshot; `tv81AnchorReadSnapshot` validates the newest captured snapshot fully locally — newest-first in-age head selection (flood-capped at 16), page-hash recompute via the beacon's proven WebCrypto SHA-256, pages_root recompute, bounded binary payload decode with fail-closed checks — and reports ONLY to logcat (`[STABLES-ANCHOR]`) and `window.__STABLES_ANCHOR__` with honest states (READY_WITH_COVERAGE / DISAGREEMENT_OR_INCOMPLETE / PROOF_UNAVAILABLE; never an invented empty book). No proof import, no book merge, no UI change (that is R2 with the founder device check). HTTP gap-fill remains the live path unchanged.

- **Controlled Machinery runtime gate completed (v0.0.8.75).** The all-page runtime audit now evaluates legacy components and registered Machinery identities as separate governed populations during the controlled migration, while enforcing exact geometry for migrated section titles, compact and full secondary actions, transaction actions, and responsive financial amount fields. The gate exposed one real mismatch: the Add liquidity `stitle` retained the legacy 700 weight while the other migrated section titles used 800; the product adapter now resolves every migrated section title to the same 20/24 px, 800 definition. No DOM ID, handler, information order, data source, covenant, transaction-engine, or trade-math change.

- **Trade and liquidity adopt the reusable Machinery element system (v0.0.8.74).** The founder-approved v0.0.8.67 Trade information architecture is preserved while the live surface is bound to registered `M-EL-*` definitions through durable `mx-*` identities and a scoped product adapter. Financial labels and support text now meet the 14 px mobile role, amount fields and compact controls meet the 48 px target, commitment actions meet 56 px, order and liquidity selectors use the shared tab and financial-side definitions, truth lists declare their scroll owner, and empty or reconstruct feedback uses the shared status treatment. `MIG-001` locks all consequential DOM IDs and handlers so this visual migration cannot silently change the order engine. No covenant, coin selection, signing, market-data source, transaction, or trade-math change. Builds on the official full Minima core upgrade in v0.0.8.73.

- **Embedded node upgraded to the official full Minima core — Maxima restored (v0.0.8.73, Maxima spike Phase 2 slice 1).** The APK's embedded node ran the minimarex stripped core (`minima.jar` v1.1.1.26, a diverged fork build with the ENTIRE Maxima subsystem deleted — `maxima` returned the core's own "Command not found", spike fact M7), which made the approved "Make my node a book source" opt-in role impossible on devices. The vendored jar is now the **official Minima core 1.0.45.15** (the `org/minima` classes repackaged from the battle-proven Test12 desktop jar; H2/BouncyCastle keep coming from gradle exactly as before). The app's entire jar API surface was inventoried first and verified present (Minima.mainStarter/runMinimaCMD, Main, MinimaDB, NotifyManager, ParamConfigurer, BIP39, json, messages — no fork-only classes were used). This restores Maxima (M1-M6 proven host-side: cold host-relay send to a NAT'd node 388ms e2e, 16KB payload intact; reply requires the requester's contact address in the payload; contact addresses churn on restart so the pointer heartbeat republishes them). No dapp JS change beyond the version stamp; UI assets identical to v0.0.8.72. Soak checklist: boot, chain sync, wallet/balance intact, book renders, place/cancel, `maxima action:info` + cold send from the emulator embedded node. The v0.0.8.70/71 diagnostics proved the phone held all five order coins unspent, at the right address, with full state - yet its address scan returned one. The node's own `coins` documentation settles it: `relevant:false` searches only the UNPRUNED chain, so orders older than the phone's pruning window were invisible to the scan (the newest, in-window ask was the only one shown). The reader now merges every source-served order coinid the node holds (the list the gap-fill already discovers), re-validated exactly like scanned coins: side, both token ids, nonzero price and size, unspent. No new trust - each coin's proof was chain-verified on import, and a stale or spent entry simply fails validation. The phone now renders the same full book as every other surface without any manual step. No covenant, engine, or trade-math change.

- **Gap-fill held-row diagnostics (v0.0.8.71).** Each held order coin now logs its spent flag, stored address, state-port count, and creation height to logcat, to pin why the phone's address scan returns one coin while coinid lookups find all five. Diagnostic build only. No covenant, engine, or trade-math change.

- **Book reader truth log + honest unreadable-order note (v0.0.8.70, founder report: phone shows one ask and Reconstruct reports held=5 without changing the book).** The direct-take reader silently skipped any held coin that failed a check, so a partial book looked complete. It now logs every held coin's disposition once per session (`[STABLES-BOOK] read:` lines in logcat: spent / state-blind / side / token / zero / malformed, plus a query-count line), and the book panel shows an honest "N held order(s) are not readable on this node yet" note pointing at the Reconstruct control. Diagnostic-and-honesty build for the phone partial-book investigation. No covenant, engine, or trade-math change.

- **Book state self-heal + honest Reconstruct feedback (v0.0.8.69, founder report 2026-07-22: "I see only one ask on my phone" and the Reconstruct button "seems to do nothing").** (1) **The one-ask root cause:** a light node can hold an order coin and its MMR proof but not its state ports (the v0.0.8.39 state-blind law); the direct-take book reader silently skipped those coins, so the phone showed only the orders created while it watched (held=5 at gap-fill, one visible ask). The reader now self-heals each state-blind order coin node-locally (coinexport -> coinimport of the node's OWN proof, the faucet's `ensureCoinStatePresent` pattern), at most once per coin per session with a 2-minute retry, so the periodic refresh cannot hammer the bridge. The full book now converges by itself within a refresh cycle - no manual step. (2) **Reconstruct UX:** the expander toggle and the action button both read "Reconstruct book", so tapping the toggle looked dead (it only opens the panel); the toggle now reads "Book incomplete? Reconstruct", and a live status line under the button narrates the run (preparing / fetching with the per-source timeout warning / the done counts) per the founder's feedback law that a 20-30s action must say it is working. No covenant, engine, or trade-math change.

- **On-device CLOB repair run (v0.0.8.68, found by founder-directed emulator testing 2026-07-22).** Five defects found by driving the Trade tab on the emulator APK against mainnet and fixed: (1) **Maker cancel repointed to the direct-take engine** - `tv81CancelOrderOnChain` still validated the retired V2 coin layout (tag 8111 at port 2, maker key 13, refund 14), so every in-app cancel on the direct-take book died with "Not an order coin." Direct-take coins (side at port 2, maker 5, refund 6, key 10) now follow the proven toolkit recipe (`tools/tv81/order-direct.mjs cancel`): refund output of the full escrow, take slots 30-38 zeroed, action flag `STATE(23)=2`, txnbasics, explicit maker signature, best-effort fee signature, txncheck scripts/basic/mmrproofs, post. The legacy V2 path is kept for legacy coins. (2) **Trade-truth reads throttled** - `tv81RefreshTradeTruth` ran every 15s unconditionally (plus on every 20s book-panel pass), each run a `history max:100` plus per-txpow follow-ups, saturating the embedded node's single command bridge; measured on-device: a market sweep's `txnsign` hit its timeout ~13 minutes after the tap and failed with "Node command timed out". Reads are now one-in-flight, at most one success per 120s (a new fill can only land with a new block), 30s retry after failure, only while the Trade view is open, and a direct-take market no longer falls through to the retired engine's readers (a failed read surfaces honestly as "unavailable" instead of querying the wrong engine). (3) **Command timeout layers aligned** - `StablesNodePathHandler.COMMAND_TIMEOUT_MS` (native 60s) undercut the JS layer's own budgets (up to 180s for txnsign), so a `txnsign` on a busy embedded node (post-boot catch-up) died at exactly 60s with "Node command timed out" even though the app was prepared to wait; proven twice on-device (a market sweep on v0.0.8.67, a maker cancel on the first v0.0.8.68 build). The native cap is now 240s, above every JS step budget again per its own documented invariant, and the JS sign budgets are aligned to it (235s for the market sweep and maker cancel signs - on the retry the native sign COMPLETED at 122s, so the old layers would still have killed it). Cancel errors now also console.error to logcat like the market path. (4) **Ticket busy state** - the Place action disables and reads "Building…" while a build is in flight and refuses further taps; two taps had stacked two independent in-flight builds that opened confirm modals ~16 minutes apart. (5) **Honest Available line** - the ticket's "Available: 0 Winiwa" was a false zero printed before the balance detail loaded (wallet held 995.95); it now renders the loaded value or an honest "Available: syncing…" state and refreshes itself (D22: a zero renders only when emptiness is positively proven). No covenant, engine, or trade-math change.

- **Trade tab pro redesign (v0.0.8.67, founder-approved 2026-07-22 — all items of `TRADE_TAB_REDESIGN_PROPOSAL.md`).** HONESTY: the chart, Last stat, and Recent trades now read **direct-take confirmed fills** via a new parser (`tv81ReadDirectConfirmedTrades` — one row per order input at that maker's OWN limit, `STATE(40+i)` fill, continuation-aware terminal flag); the old reader only recognised the retired V2 engine, which is why real trades showed "No confirmed V2 fills yet" and the chart fell back to a synthetic-looking session-mid line. The mid-book row is labelled **Mid** (it showed the mid under a "Spread" label), spread renders `—` when either side is empty, "No trades yet" replaces jargon, and the bottom nav gets an opaque base so content can no longer be read through it. PRO BOOK: prices 4 dp / sizes 2 dp with tabular numerals everywhere (`tv81FmtPx`/`tv81FmtQty`), 5 levels per side on mobile with a quiet "Show more depth" expander (9 expanded), tap-a-row → limit ticket unchanged. FLUIDITY: quick-size chips 25/50/75/Max (`ui-amount-chips`, approved as the ONE quick-amount reference; Exchange ½/MAX merges to it in a follow-up), sticky market bar with Last direction colour (`tv81-up`/`tv81-down`), chart collapsible (default collapsed under 760 px, header tap toggles), the Trade view hides the page-title row so market data reaches the first screen, the Reconstruct control demoted to a quiet `ui-text-action` expander, and the Add-liquidity card aligned to the standard card shell (amber tone removed). Variant register updated with the five rulings. Known follow-ups recorded: Exchange ½/MAX merge; transient confirmed+unconfirmed double-count in the balance importer (seen as "Balance: 7 xWiniwa" while settling — self-corrects on confirmation); app-as-losing-racer failure UX still unobserved. No covenant, trade, or balance logic changed.

- **Manual "Reconstruct book" control — common-book slice 3 (v0.0.8.66, founder-requested).** The Trade tab's Order book section gains the explicit sovereignty control approved on 2026-07-21: an optional source-URL field (`finput`, FLD-001 shell) and a **Reconstruct book** action (`btn btn-w btn-secondary` — a supporting command, not a transaction). It runs the same proven pipeline as the automatic boot gap-fill (`tv81BookGapFill`, now accepting prepended manual sources): ensure the order + registry covenants are tracked, fetch order-coin blobs from the user-entered source first and the chain-discovered pointer registry second, `coinimport track:true` only what this node lacks, then re-render the book. Trust unchanged: every blob is validated by the user's own node against its own chain, so the entered host can be anyone's — it can only withhold, never forge. Feedback per the founder laws: quiet on success (the refreshed book is the feedback), an honest toast only when no source was reachable or the run failed. No covenant, trade, or balance logic changed.

- **Gap-fill transport completed on-device; two light-node laws recorded (v0.0.8.65).** The v64 emulator run proved the remaining pieces and their laws: (1) **light-node retro-surface is unreliable for coins created before tracking** — after tracking the pointer registry, pointers posted an hour earlier never appeared in the emulator node's view (unlike the full-node lab law of fact 4); the design's own heartbeat answers this: refreshing the pointers on Test12 made the emulator **forward-capture both new pointer coins within one block**, after which discovery found `sources=2` from pure chain data. (2) **Android also blocks cleartext HTTP at the native layer** (`Cleartext HTTP traffic not permitted` from the fetchText bridge), the second transport gate after the WebView mixed-content block — production book sources must serve **https**. For the dev loop, a network-security config now permits cleartext exclusively to `10.0.2.2` (the emulator's host alias, inert on real devices; the global cleartext ban is unchanged). Android packaging change + doc/version stamp only; no dapp logic changed from v64.

- **Boot tracking + gap-fill now survive the post-boot bridge congestion (v0.0.8.64).** The first on-device run of v0.0.8.63 proved the failure mode: the embedded node's command bridge is congested for the first minutes after boot (the same condition that timed out DT2's first trade build), the single boot `newscript` timed out ("Faucet step timed out while tracking the order book"), and the whole tracking→gap-fill chain died silently on attempt 1. The chain is now `bookBootAttempt(n)`: up to 4 attempts with increasing backoff (90s·n), status carries the attempt number in `__STABLES_BOOK_TRACKING__` and the `[STABLES-BOOK]` logcat lines. Web preview was unaffected (verified on v63: `gap-fill: sources=2 reachable=1 held=1 imported=0 failed=0` — chain discovery, per-owner pointer dedupe, endpoint fetch, and held-coin skip all correct).

- **Automatic order-book gap-fill from on-chain-discovered sources — common-book slice 2 (v0.0.8.63).** The app now closes the newcomer's ~15-hour visibility gap by itself: at boot (45s after covenant tracking, retried once if no source answers — the freshly booted embedded node's bridge is congested at first) it reads the **book-source pointer registry** from its own node (covenant `LET owner=PREVSTATE(10) RETURN SIGNEDBY(owner)` @ `0x45D60C5F…`, proven on-chain: post + third-party-spend refusal + owner heartbeat refresh; pointers are heartbeat-refreshed so the registry itself always sits inside every fresh node's unpruned window), dedupes pointers per owner, fetches each endpoint's `/book` blob list, and `coinimport track:true`s **only the order coins its node doesn't already hold**. Blobs are self-certifying — the node validates each MMR proof against its own chain, so sources are interchangeable and untrusted for validity (they can only withhold, never forge; the take path self-corrects staleness on-chain). Transport: plain `fetch` on the web preview; on the standalone app the WebView's https origin blocks plain-http (mixed content, found during the provider spike), so fetches ride the native `StablesNative.fetchText` bridge behind a new promise dispatcher that preserves the existing APK-update callback. New: `tv81BookGapFill` / `tv81ReadBookSources` / `tv81FetchTextAny`, `book_sources` registry block, `[STABLES-BOOK] gap-fill:` logcat line + `window.__STABLES_BOOK_GAPFILL__`. Serving side (out-of-app, proven separately): read-only `tools/tv81/book-provider.mjs` (GET /book + /health only) and pointer toolkit `tools/tv81/book-pointer.mjs`. No covenant, trade, or balance logic changed.

- **Order book tracked at boot — common-book slice 1 (v0.0.8.62, founder-approved design 2026-07-21).** The direct-take order covenant is now registered (`tv81DirectEnsureTracked`) during app boot, alongside the beacon prefetch, instead of only when the Trade surface first opens. Because `trackall` captures only orders arriving after tracking begins, every hour untracked was an hour of the shared book this node could never natively hold; from this build, each install is a complete holder of the live CLOB from install day onward, and the in-window last ~15 hours retro-surfaces immediately at first boot. Outcome is surfaced as `window.__STABLES_BOOK_TRACKING__` and a `[STABLES-BOOK]` console line (visible in logcat via StablesWeb) so boot tracking is confirmable on the device. Never blocks boot; the Trade-path ensure remains as a harmless idempotent backstop. This is step 1 of the approved keeper-free common-book stack (next: out-of-window blob gap-fill, on-chain provider-pointer discovery, manual full reconstruct, opt-in book-source toggle — design in `CLOB_DELIVERY_PLAN.md`).

- **DT2 PROVEN: the direct-take sweep runs end-to-end on the embedded node, and the trade credit now renders (v0.0.8.61).** The full first-user journey was executed on the Android emulator's embedded node (Minima v1.1.1.26, app v0.0.8.60, the phone-faithful surface): in-app faucet pour of 1,000 Winiwa (pool 9,992,000 → 9,991,000, confirmed on-chain), then an in-app market buy of 2.2 xWiniwa that swept THREE asks in ONE transaction — txn `0x0000B3D01A2B7ACC…` (block 2219294) spent order coins 1@1.05 + 1@1.10 + 0.5@1.20 and paid 1.05 / 1.10 / 0.24 Winiwa to each maker at its OWN limit (0.2 partial of the marginal), re-rested SELL 0.3@1.20, and returned 2.2 xWiniwa + 997.61 Winiwa change (exactly 1000 − 2.39) to the taker. Makers were the Test12 wallet and the taker was the emulator's own seed, so this is also the **independent two-wallet trade** — no self-trade caveat remains. The confirm modal showed exactly send 2.39 / receive 2.2. **Defect found and fixed during verification:** the sweep executor appended the activity row but set no optimistic balances, so the received token's incoming credit had no releasing event and the balance stabilizer auto-froze it at the pre-trade value (`__BAL_RELEASES__` showed `xWiniwa auto-freeze node:2.2 held:0` indefinitely; the pay side converged only via the TxMirror settlement). A market fill now applies the mint-canon optimistic pair — pay token out, received token in, `clearTestTokenBalanceDetails` — in the same paint. Known issues recorded for follow-up (not fixed in this iteration): the wallet Winiwa row transiently double-counted the faucet claim (row 2,000 vs true 1,000) while the hero stayed honest; the trade ticket's "Available" line can read 0 before the balance detail loads (display only — the executor gathers real coins itself).

- **Trading engine is now the DIRECT-TAKE CLOB (v0.0.8.60, DT1).** Founder direction (2026-07-21): "each maker fills at their own limit, anything else is unacceptable" — uniform-price FBA is retired as the engine. The app's trade layer is repointed from the FBA batch market to a **price-time-priority direct-take CLOB**: a market order is now a REAL fill, not a resting crossing-limit. `tv81ExecuteMarketTicket` builds ONE sweep transaction (`tv81DirectExecuteSweep`) that spends the maker order coins it crosses (orders are the leading inputs so order `i` sits at `@INPUT=i`, `STATE(30+i)=i`, `STATE(40+i)=fill`), pays **each maker its own limit**, and re-rests only the marginal (last) order's remainder as a continuation at slot `k`; limit orders (`tv81DirectPlaceOrder`) rest until a taker fills them. New functions `tv81DirectCfg / tv81DirectReadBook / tv81DirectBuildOrder / tv81DirectPlaceOrder / tv81DirectPlanSweep / tv81DirectExecuteSweep`, wired behind `registry.direct_market` (covenant `0x0DC32630`); `tv81ReadOrderBook`, `tv81PlaceLimitFromTicket`, `tv81ExecuteMarketTicket` now prefer direct-take (FBA + legacy kept as fallbacks). Taker payment coins are selected with `gatherSendableUserCoins` (`sendable:true`) — covenant coins the wallet merely tracks fail scripts, which was the sole cause of the transient full-fill failures during proving. Confirm modal shows the exact pay/receive; one activity row per fill ("Bought/Sold xWiniwa … across N orders, each at its own price"); navigates to Wallet. **Covenant `scripts/tv81_order_direct_v1.kiss` @ `0x0DC3263082DEE69C…` proven end-to-end on Test12** (SELL partial+full, continuation retake, BUY partial, maker-signed cancel, and a multi-bin market sweep of 4 orders across 3 prices where the taker paid exactly 6.4 quote for 6 base — each maker at its own limit — all `scripts:true`, POSTED; journal `tools/tv81/order-direct-deployment-journal.json`). **Proven end-to-end on the web preview (Test12) via the app UI:** a market buy of 1 filled the best ask (paid 1.1 Winiwa for 1 xWiniwa), and a market buy of 2.5 swept THREE asks in one txn (1@1.12 + 1@1.16 + 0.5@1.20 partial), paid exactly 2.88 Winiwa, and re-rested SELL 0.5@1.20 — the confirm modal showed the exact pay/receive and one activity row landed. Device (embedded-node) + independent two-wallet run is DT2.

- **Trading CLOB is now the FBA batch market (v0.0.8.59, BR4).** The app's trade layer is repointed from the continuous engine to the proven Frequent Batch Auction market: it reads the batch order book (order covenant `0xDCC1E1F7`, DISPLAY amounts, side 1=BUY/2=SELL), submits FBA order coins for both limit and market tickets (a "market" order is an aggressive crossing limit), and shows that each order "settles at the next batch clear." A permissionless keeper (`tools/tv81/batch-market.mjs keeper`) clears crossing batches at a uniform price with no shared per-fill coin — which is exactly the wall that blocked the continuous take on the phone, so this works from any node. New app functions `tv81FbaReadBook / tv81FbaBuildOrder / tv81FbaPlaceOrderOnChain / tv81FbaLastPrice`, wired in behind `registry.batch_market`; `tv81ReadOrderBook`, `tv81PlaceLimitFromTicket`, and `tv81ExecuteMarketTicket` delegate to FBA when it's configured (legacy continuous path kept as fallback). Proven on a full node (web preview → Test12): an app-submitted SELL 2@0.99 cleared against a crossing BUY 2@1.01 at P\*=1.00 (`0x65E6A7F6`, scripts:true), both filled, result coin advanced. Market toolkit + clearer + keeper: `tools/tv81/batch-market.mjs` + `batch-clear.mjs`, journal `batch-market-deployment-journal.json`. Phone/multi-node verification is the next step (BR5). No covenant or on-chain logic changed — the batch engine was already proven (B-A1..B-A6).

- **Embedded node now tracks the order-book covenant, so it holds other nodes' orders (v0.0.8.57, ROOT-CAUSE fix, proven on-device).** The whole "the phone can't see the full book or take" symptom traced to one hidden crash: the standalone node's Minima (v1.1.1.26) throws a `NullPointerException` (`ScriptRow.toJSON() on null`) inside `newscript` when the script is a large MULTI-LINE covenant (the 8208-char order-book engine triggers it; small scripts register fine). The app ships each covenant as its raw commented multi-line script and `ensureCovenantTracked` swallowed the failure, so the engine was never tracked and the node retained only coins it created itself, pruning every other node's order. Fix: before `newscript`, the app now asks the node for its OWN canonical single-line clean of the script (`runscript` returns `clean.{script,address}`); that clean form registers with no crash and hashes to the SAME covenant address, so tracking succeeds. The Android node-bridge filter also now permits newlines for `runscript` (as it already did for `newscript`) so the raw multi-line script can be cleaned. Verified end-to-end on the phone: after the fix the engine shows `track:true` and the node captured a fresh order placed from another node (Test12). `trackall` only captures orders arriving AFTER tracking, so covenants must be tracked early; older orders come via resync/`coinimport` (follow-up). This is the foundation under the CLOB, the faucet, and the vault on the phone. No covenant, on-chain logic, or address changed (the clean script is Minima's own canonical form of the same covenant).

- **Light node shows the full order book, not just its own order (v0.0.8.56, founder report "there is only the order you created, all the other orders from the other node are missing").** After placing a limit order on the phone, the book showed only that one order and none of the ladder from the Test12 node. Root cause: `tv81ReadOrderBook`'s live read on a light node only returns order coins the node itself created, and the beacon fallback (which carries the complete keeper-published ladder) only triggered when the live read was `asks.length === 0 && bids.length === 0`. Once the user's own order made the live read non-empty, the fallback stopped firing, so the partial one-order live book was shown instead of the full beacon ladder. Verified on-chain during the report that neither the live book on Test12 (best bid 0.9999 / ask 1.0001, full ladders) nor the beacon leaf (asks 1.0001/1.0002/1.0003, bids 0.9999/0.9998/...) was actually empty. Fix: the beacon snapshot is now preferred for the display ladder whenever it covers more price levels than the local read has orders (the light-node case), while the node's own live order coins are merged into `book.orders` so My Orders and cancel still work; a full node (order count >= price-level count) keeps its authoritative live read untouched, and market-take stays refused on the beacon-sourced book (v0.0.8.54). Display-only change; transaction logic, covenant behaviour, and node state are unchanged.

- **Standalone node accepts CLOB limit-order placement (v0.0.8.55, found driving the phone directly).** With v0.0.8.54 on the phone, the market buy correctly refused (light node), so the next check was a limit order, which the confirm dialog built correctly ("Order confirmation", "0.99 Winiwa into escrow") but the embedded node then rejected: logcat showed `StablesNodePathHandler rejected invalid send`. Root cause: the standalone app's node bridge validates `send` commands with a regex (`SEND_SINGLE_PATTERN`) that ended at `tokenid:...`, but a CLOB order-placement send carries a trailing `state:{...}` blob to write the order coin's ports, so the regex never matched and **every** limit order failed with "invalid send". This never showed on the web preview because that path talks to Test12 over RPC and bypasses the standalone node's validator. Fix: `SEND_SINGLE_PATTERN` now permits an optional `state:{...}` suffix restricted to a JSON-safe charset (digits, letters, quotes, `:` `,` `.` `{}` `[]` `_` `-`, whitespace) with no shell metacharacters; `containsDangerousPattern` still runs first as a backstop, and plain sends are unaffected (verified: order-with-state matches, plain send matches, a semicolon in state is rejected). Android node-bridge change only; the covenant, on-chain logic, and dapp trading code are unchanged. (Market orders on a light node remain honestly refused per v0.0.8.54 - a light node cannot hold the live order coins to take against.)

- **Honest light-node trading + cache-bust fix (v0.0.8.54, founder report "a market buy triggers 'available depth is 0'").** Reproduced on the phone via logcat: a market buy showed a book with depth (drawn from the verified beacon snapshot) then failed with "available depth is 0". Root cause is architectural, not a code defect: the phone runs a light node that cannot hold the covenant order-coins, so `tv81ReadOrderBook` returns `source:'beacon'` (display-only bins, empty `orders`), and `tv81PlanMarketSweepFromBook` finds no live asks to sweep. The engine itself is fine (proven end-to-end on the full node in v0.0.8.53). Fixes: (1) `tv81ExecuteMarketTicket` now checks `book.source === 'beacon'` and refuses with a clear reason ("this device can show the order book but not take from it yet ... place a limit order, or trade from a node that holds the live book") instead of the confusing depth-0 error, per the D22 truth law; (2) the book panel shows a view-only note (`tv81obViewOnly`) and sets `window.__TV81_BOOK_VIEW_ONLY__` when the book is a beacon snapshot; (3) **limit-order placement is deliberately left working on a light node** — it only escrows the user's own tokens (no covenant input) and already navigates to Wallet; (4) trade errors now `console.error` so they reach logcat (this run's phone error was invisible because the catch only raised a toast). **Also fixed the stale asset cache-bust tags:** the four `<script src=...?v=tv81-852>` tags in index.html were frozen at 852, so on an APK update the WebView could serve cached old JS (a real risk that my own v0.0.8.53 fix might not load on the phone); the platform sync now stamps `?v=tv81-8<iteration>` on every build so each build actually busts the cache. No transaction logic, covenant behaviour, or node state changed.

- **CLOB trade confirm modals no longer mislabel as a USDw burn (v0.0.8.53, founder report "the CLOB trade failed").** Reproduced on the web preview against Test12: a market buy of 1 xWiniwa popped a confirm dialog headed "On-chain USDw burn / Confirm burn" (correct amounts and a "Buy 1 xWiniwa" button, but burn wording). Root cause: the whole trade surface — market sweep (`tv81ExecuteMarketTicket`), limit orders (`tv81PlaceLimitFromTicket` and the second place path), the Exchange front-end (`tv81-exchange`), swap (`tv81-swap`) and liquidity (`tv81-liquidity`) — reuses the shared `openMintBurnConfirm` dialog, and those `tv81-*` ops are neither `mint` nor `xwiniwa`, so eyebrow/title/button fell through to the modal's burn defaults. Fix is two-layer: (1) `openMintBurnConfirm` is now trade-aware — any `tv81-*` op with no explicit eyebrow/title renders no burn eyebrow and a neutral "Confirm" instead of "Confirm burn"; (2) the market and limit callers pass explicit "Confirm buy" / "Confirm sell" / "Confirm order" titles. **The underlying CLOB market path was verified functionally correct end-to-end on-chain** during diagnosis: the fill txn posted (`0x28A760F3…`, explorer `0x24B104EE…`) and settled to COMPLETED (1 fill, ~42s), with the activity row + balance flash appended on post per the founder's feedback model. Confirm-dialog labelling fix only; transaction logic, covenant behaviour, and node state are unchanged. (Open, for founder direction: the trade path gives no in-flight progress and does not navigate to Wallet after the order, so on the Exchange screen a working ~50s settle can still look like nothing happened.)

- **Order book renders from the state beacon on a fresh light node (v0.0.8.52).** The faucet already fell back to the beacon (v0.0.8.50); the order book did not, so on a light node — which does not retain the per-order covenant coins — `tv81ReadOrderBook` returned an empty book and the market showed "No asks / No bids". It now falls back, only when the live read is genuinely empty, to `tv81BookFromBeacon`: the beacon's verified `book` leaf (`a=<price:remAtoms,…>|b=<…>`, keeper-ordered best-first) is parsed into the same `{bins,bestAskAtoms,bestBidAtoms,spreadAtoms}` shape the render consumes, so asks/bids/spread display with nothing external. Display-only: `orders` is empty (aggregated bins), and taking an order still requires the live order coin (the beacon carries no spendable coin). Full nodes and in-window order coins keep the authoritative live book. Paired with `beacon-keeper.mjs`, which publishes the live faucet level + book snapshot into the beacon each heartbeat. No transaction logic, covenant behaviour, or node state changed.

- **Proactive state-beacon prefetch on boot (v0.0.8.51).** The v0.0.8.50 beacon reader only ran inside the faucet's "Proof unavailable" fallback, so on an already-synced node it stayed dormant and its light-node capture path was never exercised. Boot now calls `tv81ReadBeacon()` directly (after the faucet eager-load): it tracks the beacon covenant and reads+verifies the beacon coin at launch, warming the reader cache so the fallback is instant, and exercising the capture path (a fresh light node retro-surfaces the in-window beacon coin once it tracks the address). The outcome is stored on `window.__STABLES_BEACON_STATUS__` and logged as a distinctive `[STABLES-BEACON]` console line, which the standalone app forwards to logcat (`StablesWeb`) so beacon capture/verification is confirmable on the phone. No user-visible change on nodes where the live read works; no transaction logic, covenant behaviour, or node state changed.

- **On-chain state beacon reader — faucet level from the chain on a fresh node (v0.0.8.50).** A fresh light node cannot fetch the pruned/out-of-window covenant coins, so the Winiwa faucet read on the phone hit the honest "Proof unavailable" state. New reader (`tv81ReadBeacon`) reads a single tracked BEACON coin whose `STATE(0)` is a Merkle root committing the app state (book/faucet/registry/params as leaf preimages in `STATE(10..13)`), verifies every leaf against the root **in-browser** (WebCrypto SHA-256 — proven byte-identical to Minima's KISS `SHA2`, with node `hash type:sha2` as fallback), and — where the live pool coin is not locally provable — shows the beacon's faucet level instead of "Proof unavailable". Claiming stays disabled because the pool coin the claim must spend is still not locally held (display vs take). The hardened beacon covenant binds `root == MerkleRoot(leaves)` on-chain (proven 4/4), so no keeper can publish a lying root; canonical beacon `0x49AC035F…` on mainnet, config in the registry projection (`state_beacon`), full design in `TV81_ONCHAIN_STATE_BEACON_DESIGN.md`. Display/reachability change; transaction logic, covenant behaviour, and node state are unchanged.

- **Empty order book on fresh nodes fixed (v0.0.8.49, founder report).** The book was structurally empty on the phone while the same in-window ladder rendered on Test12: the registry projection shipped the faucet and vault scripts but never the market-engine script, and the book/price-state readers queried `coins address:<engine>` without tracking it first — and address queries return nothing for untracked addresses even when the coins are inside the unpruned window (the 2026-07-18 lab law). The exact registered `TV81_MARKET_ENGINE_V2` text now ships in `order_book.script` (sha `6eae1169…` verified byte-exact through the JSON round-trip), and `tv81EnsureEngineTracked` registers it once per session before order-book reads and price-state finds. Fresh nodes now see orders and the price state the moment those coins are in-window. Display/reachability fix; transaction logic, covenant behaviour, and node state are unchanged.

- **False "Payment received" alerts for order-book escrows fixed (v0.0.8.48, founder report).** The founder's phone buzzed "Payment received" for each ladder order the Test12 wallet placed. Root cause: the Android service's incoming-payment detector excludes protocol addresses parsed from `runtime-config.js` (keys matching covenant/pool/issuer/burn — the 2026-07-07 fix), but the TV81 generation's covenant addresses (market engine, D13 vault, price state) live in the registry PROJECTION JSON, so tracked engine escrow coins counted as income. `infraAddresses()` now also loads every 0x/Mx value from `testv008-v0.0.8.1-app-registry.json` (the registry contains only protocol identities, never user addresses). Covers both alert paths (NEWBALANCE "Payment received" and NEWTXPOW "Payment incoming" share the set). Android-service change only; web behaviour, transaction logic, covenant behaviour, and node state are unchanged.

- **xWiniwa reserve hidden from the Mint page; kept reachable in the background (v0.0.8.47, founder direction).** The "xWiniwa reserve available" row is removed — it's of no interest to the user, and with a 100M reserve minting feels effectively unlimited. The reserve must still be spendable, so `stablesRefreshXwiniwaReserveLevel` now runs headless: it always ensures the vault covenant is tracked (background reachability) and only renders when a display element is present (there no longer is one). The mint executor independently re-tracks and validates the reserve at build time, so minting never depends on the reader having run. No transaction logic or covenant behaviour changed; the reserve cap is a real covenant limit (100M, far beyond any test need) and remains enforced by the chain, not shown.

- **CRITICAL: xWiniwa mint/burn quote pinned to par to match the D13 vault (v0.0.8.46).** The first real UI mint of the P12-10 gauntlet exposed a ~100x cost misstatement: the Mint page, confirm modal, and executor all quoted `1 Winiwa → ~100 xWiniwa` (rate read near the old 0.01 floor from the orphaned xWiniwa covenant), while the deployed D13 par vault enforces `q_x == W` and so forced the transaction to actually spend ~100 Winiwa (proven from the vault state coin: ports `q_x` = `W` = 99.50248756). Fixed across all three quote paths — `stablesXwRateMint`/`stablesXwRateBurn` (new `stablesXwiniwaParRate` guard), the price-display row, and the bootstrap mint/burn executors — to use strict par (1) in the tv81 generation. This is correct while `L_par = 0` (the whole pre-USDw-launch phase); the residual-NAV vault supplies a real rate after USDw launches. Verified on web: `5 Winiwa → 5 xWiniwa`, modal send=receive=5. Behaviour/quote-correctness fix; covenant behaviour and node state are unchanged.

- **Primary card bare amount, actually (v0.0.8.45).** v0.0.8.44 targeted the wrong element: the visible pinned card is `.ccy-primary` (the matching list row is hidden in normal mode), and its `.ccy-pri-bal` writer appended the currency name to the amount. The writer now renders the bare amount (the card's left tag already names the currency), and the v0.0.8.44 CSS rule is reverted since it only affected the edit-mode list. Display-only change; transaction logic, covenant behaviour, and node state are unchanged.

- **Primary card shows the bare amount (v0.0.8.44, founder direction).** The v0.0.8.43 equivalent-line blanking was necessary but not sufficient: in the selected-card layout the `.ccy-sec-name` element flows inline after the amount, so the card still read "1,000.00 Winiwa" beside the Winiwa tag. A named CSS rule hides the name on the selected card only; non-selected rows keep their name subline. Display-only change; transaction logic, covenant behaviour, and node state are unchanged.

- **Currencies order and primary-row cleanup (v0.0.8.43, founder directions).** The wallet currency list now orders Winiwa first, xWiniwa second, then the stablecoins (`DEFAULT_WALLET_CCY_ORDER`); devices that had locked the old USDw-first default order migrate once (`stables_ccy_order_prelaunch_migrated_v1` marker) while manual drag orders set afterwards are never touched. The primary row's equivalent line no longer repeats its own amount and currency ("1,000.00 Winiwa" under 1,000.00) — it renders empty for the primary row only, with its contribution to the hero total unchanged; all other rows keep their equivalent lines. Display-only change; transaction logic, covenant behaviour, and node state are unchanged.

- **Pre-launch wallet primary defaults to Winiwa (v0.0.8.42, founder option A).** With the primary set to a stablecoin, the hero total cannot honestly include Winiwa before the community launch creates a real USDw price, so it dashed (the earlier `24.10 USDw` figure was legacy demo-rate residue). Per the founder's ruling: in the tv81 generation a saved stablecoin primary (written by older defaults or welcome flows) migrates to Winiwa once (`stables_primary_prelaunch_migrated_v1` marker); first-run defaults were already Winiwa; an explicit re-selection afterwards persists and is never re-migrated. The hero now reads in real units ("Winiwa equivalent"), reflects pours and exchanges instantly and honestly (with the v0.0.8.41 optimistic-hold immediacy), and the USDw denomination becomes meaningful after launch. Display-only change; transaction logic, covenant behaviour, and node state are unchanged.

- **Hero total reflects a pour immediately; equivalent values stay white (v0.0.8.41, founder directions).** The wallet hero total was gated behind the first full node-balance sync (`__STABLES_LIVE_BAL_SYNCED_ONCE`), so a pour on a freshly booted node moved the currency rows optimistically while the headline stayed a dash — the founder's report. Optimistic holds now lift that pre-sync dash (they are display-truthful under the stabilizer law), so the total moves in the same paint as the rows; the unpriced-holdings honesty gate is unchanged, so no false or incomplete total can print. Also completes the white-value direction: the row renderer was repainting equivalent values green/red inline on every pass, overriding the v0.0.8.39 static class change — it now clears inline color and lets `ui-tone-text` govern, which also heals rows painted by older sessions. Presentation and display-truth change only; transaction logic, covenant behaviour, and node state are unchanged.

- **Real root cause of the phone claim failures: the APK bridge rejected `newscript` (v0.0.8.40).** The v0.0.8.39 pour retried from the phone failed identically, and the bridge log finally showed it: `StablesNodePathHandler rejected dangerous command: newscript …` — the Android command filter rejects any command containing newlines, and canonical KISS covenant scripts contain newlines (their address is the hash of the exact text). So no covenant script was EVER registered on the standalone APK's node; `txnbasics` attached zero scripts and every claim failed txncheck with `scripts=false`. The bridge filter now lets newlines through for `newscript` only (all other metacharacters still rejected, all other commands unchanged). This corrects v0.0.8.39's changelog claim: the "state-blind window coin" theory was wrong for this failure — the state coin carried its state and the self-heal correctly found nothing to heal; `ensureCoinStatePresent` remains as an unverified defensive guard. No web-surface behavior changes in this iteration.

- **Light-node claims self-heal their state; honest cooldown; founder aesthetic fixes (v0.0.8.39).** Root-caused the first v0.0.8.38 phone claim failure: a light node that retro-surfaces an in-window covenant coin holds the coin and its MMR proof but its local coins view can lack the STATE variables, so the claim built from null ports and the covenant refused (`scripts=false`, carried state output `state:[]`). New `ensureCoinStatePresent` restores the state entirely node-locally (`coinexport` of the node's own proof → `coinimport track:true` → re-read; fails closed with an honest message if still unavailable) and is wired into the faucet claim's state-coin input; the vault balance-state and order/price-state builders are queued for the same wiring (recorded, not yet wired). Failed claims no longer pace the wallet: the on-chain cooldown scanner skips rows with status `Failed` (the failed phone attempt had armed a phantom one-hour countdown). Founder aesthetic directions: the `Next claim available in …` hint under the pour button is gone (the button itself carries the countdown), and all 20 wallet currency-row equivalent values render in the primary text tone instead of danger red (`ui-tone-danger` → `ui-tone-text`). Verification target: a successful pour from the phone.

- **D22 four-state truth law on the faucet and xWiniwa reserve levels (v0.0.8.38).** A zero level now renders only when emptiness is positively proven: after the retry ladder, the reader probes the covenant's native state coin at the same address — state coin visible with no pool/reserve coin proves genuine exhaustion (renders `0`), while neither coin visible means the covenant coins sit outside this node's ~1,080-block unpruned window and renders `Proof unavailable`, never a false zero (the failure mode confirmed on the founder's phone at v0.0.8.37, where a tip-synced light node painted `0 Winiwa` against a 9,994,000-Winiwa on-chain pool). Claiming stays disabled in both non-positive states because the pool coin, a required transaction input, is not locally proven. Applies to `stablesRefreshFaucetLevel` and `stablesRefreshXwiniwaReserveLevel`; display text and gating only — transaction logic, covenant behaviour, and node state are unchanged. Known limitation recorded honestly: chain-direct acquisition for out-of-window coins (proof providers per the amended D22 Standard mode, or coin freshness through natural activity) is later P12-03 work; this slice removes the lie, it does not yet restore the number on light nodes.

- **Selector function taxonomy applied app-wide (v0.0.8.37, founder direction).** Every selector in the app is now exactly one of three functions with three unmistakable looks: view/section switches stay `SEL-001` peer selectors (Exchange/Trade, xWiniwa/Stables, Investment views, Send/Receive); in-form configuration uses `SEL-005` quiet tabs (Market/Limit, and Spot/Curve/Bid-Ask converted); operation direction uses the `SEL-006` side toggle — both Mint/Burn pairs converted with mint solid-filling success green and burn solid-filling danger red, the create/dispose analog of Buy/Sell. The taxonomy is law in the reference (§6.3): a new selector must be classified before implementation, and one look for two different functions is the same defect as two looks for one function. All mode-switch ids and handlers (`setXwmMode`, `setWablesMode`, `tv81SetLpShape`) unchanged. Presentation-only change: transaction logic, covenant behaviour, and node state are unchanged.

- **Freshness law, readable inventory sections, and trimmed side toggle (v0.0.8.36).** Founder review actions: the Buy/Sell side toggle is trimmed from 48 to 44 px (doc and CSS updated together). The inventory's confusing page structure is fixed: tab/panel wrapper DIVs now flatten so their internal app-sections index as real sections (the whole Trade tab no longer collapses into one mislabeled section), and sections can carry explicit `data-section-label` names — the Trade terminal is labeled. Most importantly, "every app change is reflected across all supporting documents" is now written law AND machine-enforced: the static audit hard-fails whenever the generated catalogue/inventory carry a different version than `dapp.conf` (`artifactsFresh`), so an app edit without regenerated documents cannot pass a gate or commit. Presentation/framework change only: transaction logic, covenant behaviour, and node state are unchanged.

- **Visual-weight hierarchy on the Trade ticket (v0.0.8.35, founder design direction).** Different functions now look different, per the professional-terminal pattern: the order-type choice (Market/Limit) became `SEL-005` Ticket tabs — quiet text tabs on a baseline rule with an accent underline on the active tab — and the market-direction choice (Buy/Sell) became `SEL-006` Side toggle — two equal cells where the selected side solid-fills green (buy) or red (sell) with app-background text, the loudest selector in the app. Page/section switching (Exchange/Trade, xWiniwa/Stables, Invest views) remains the standard `SEL-001` peer selector, so the three selector functions on one screen are now unmistakably distinct. Both new components were founder-approved, written into the reference (§6.3, visual-weight hierarchy law) and the Variant register before implementation, and added to the generator registry; dead legacy side-switch CSS was removed. All ticket ids and handlers (`tv81TicketMarket/Limit`, `tv81SideBuy/Sell`, `tv81SetOrderMode/Side`) are unchanged. Presentation-only change: transaction logic, covenant behaviour, and node state are unchanged.

- **One selector reference and the Variant Law (v0.0.8.34).** Retired `SEL-004` (founder decision: one function, one reference): the visible-inactive treatment is folded into the complete `SEL-001` definition, so every selector in the app — Mint xWiniwa/Stables, Mint/Burn, Exchange/Trade, Market/Limit, Buy/Sell, Send/Receive, Invest views — now renders from one definition with readable text, a neutral filled surface, and a visible border on every unselected option. The `ui-segment--section` class was removed from markup and CSS; the generator maps any reintroduction to the retired reference and the audit requires zero SEL-004 resolutions (tripwire). Structurally, product-wide **law 10 "One function, one reference — no variants"** and the **Variant register (§2.3)** were added to the reference and anchored in `handshake.md` and the capsule: axes (role, size, layout, density, semantic state, tone) belong to one definition; any second appearance for the same function requires founder approval recorded in the register before code. The register lists three PENDING FOUNDER RULINGS with merge recommendations: SUR-002 domain card tones, FLD-002 large exchange amount, and the agent composer field. Presentation/framework change only: transaction logic, covenant behaviour, and node state are unchanged.

- **ACT-001 uniformity pass across the whole app (v0.0.8.33).** Surveyed every transaction action in static markup and JS templates: all 16 financial submit/confirm triggers on Mint, Exchange, Faucet, Send, Invest, Trade, and Liquidity carry the exact family signature (`btn btn-w btn-lg` + role + `action-transaction`; the one layout-axis addition is the paired burn confirm's `ui-flex-1`). Verified that near-miss candidates are correctly OUTSIDE the family: the chat and feedback Send buttons, wallet quick-action navigation, on/off-ramp route links, and the merchant Release Goods outcome action. The generic in-app Confirm dialog is documented as polymorphic — it already renders at the exact transaction geometry and serves both financial and non-financial confirmations. Retired the stray, unreferenced `technical_route_draft.html` (2026-05-20) from the shipped app tree to `work/scratch/`. Presentation/audit pass only: transaction logic, covenant behaviour, and node state are unchanged.

- **Faucet aligned to Mint canon; chart legends and control accents systemized (v0.0.8.32, PAG-001 batch 2).** The Faucet claim card now uses the Mint block recipes: "You receive" and "Faucet level" are BLK-005 `calc-row` label/value rows (the amber boxed panel was removed under the Mint minimal-form default — **listed for founder veto**; the claim amount keeps its warning tone), and the cooldown hint uses spacing utilities. The Invest coverage-fund action block was verified already on canon (BLK-004 with asset-picker variant plus an equal Deposit/Withdraw transaction pair). Chart legend keys (`ui-legend-dot/line/dash`), the 96 px chart frames (`ui-chart-frame`), and range-slider accents (global rule, like checkboxes) moved from inline styles to named system classes; the Profile and Welcome currency-pill wraps use the shared layout utilities. Static inline styles fell 428 to 414. All faucet/burn transaction hooks unchanged. Presentation-only change: transaction logic, covenant behaviour, and node state are unchanged.

- **Exchange aligned to the Mint canonical transaction blocks (v0.0.8.31, PAG-001 batch 1).** The Exchange swap surface now uses the exact Mint block recipes: the BLK-004 amount entry (Available/Balance line with ½/MAX above a standard 48 px `finput`, multi-asset variant keeping the asset picker beside the field) and the BLK-005 info list (the exchange rate is now a Mint-style label/value `calc-row` whose value is the tap-to-flip text action; keyboard access comes from the native button). Removals under the Mint minimal-form default, **listed for founder veto**: the `Send` and `Receive` micro-label kickers (direction is communicated by the Available/Balance lines, the asset pickers, and the flip control), and the large 20 px `ex-input` amount style on this page (replaced by the canonical field geometry; `FLD-002` remains catalogued pending review). All transaction hooks (`exFrom`, `exTo`, `exFromCcy`, `exToCcy`, `ratePill`, `executeExchangeNow`, `flipEx`, `flipRatePill`) are unchanged. Presentation-only change: transaction logic, covenant behaviour, and node state are unchanged.

- **All repeated inline patterns systemized; agent drawer becomes a component family (v0.0.8.30).** Wave three migrated the remaining repeated inline styles (98 attributes) into named system classes: small-support text, dividers (`ui-hr`, `ui-hr-soft`, soft bottom border, top-divided rows), cells and tables (`ui-pad-cell`, `ui-cell`, `ui-table`, `ui-list-indent`), the transaction status dot/ring family (`ui-status-dot--ok/--fail`, `ui-status-ring`), the named spinner scale (`--xs`, `--sm`), the monospace field and value treatments, layout utilities (column, gaps, wraps, inline-center, relative, opaque, dashed, cursor states), and the amber modal-handle tone. The StablesAgent drawer was rebuilt as a named component family (`agent-dlg-*`): its header icon buttons, Back/Next controls, and Send action are now standard `btn` roles with 44 px targets and CSS hover (inline `onmouseenter/onmouseleave` style handlers removed), and the composer input meets the touch minimum. Static inline styles fell from 538 to 428 — every remaining static attribute is a page-unique one-off, runtime visibility state, or template-driven value. Both audits pass on all 24 pages at every gated width; the repo structure gate passes; the baseline is frozen at 428. Presentation-only change: transaction logic, covenant behaviour, and node state are unchanged.

- **Inline-style debt down 724 to 538 via named system classes (v0.0.8.29).** Migrated 186 static inline styles to the App UI System: typography emphasis (`ui-body-strong`, new `ui-emph-800`/`ui-emph-900`, `ui-label-strong`, `ui-feature-title`, `ui-micro-label`), layout and behaviour utilities (`ui-flex-gap-2`, `ui-block`, `ui-wrap`, `ui-justify-center`, `ui-break-all`, `ui-overflow-hidden`, `ui-overflow-x`, `ui-pointer`, `ui-underline`, `ui-dim`, `ui-resize-y`, `ui-pr-3`, `ui-pad-y-3`, `ui-pad-b-2`), token-grid spacing normalizations (7/10/14 px legacy margins and paddings snapped to the 8/12/16 scale), and repeated composites promoted to named components (`ui-list-cell`, `ui-cell`, `ui-detail-row`, `ui-divider-top`, `ui-divider-top-pad`, `ui-inset-panel`, `ui-inset-field`, `ui-list-indent`, `ui-mono-value`). Checkboxes and radios now share one global 20 px accent-tone rule instead of per-element sizing. Removed the dead `truth-tab` legacy classes from the Mint section selector. Static and runtime audits pass on all 24 pages at every gated width; the inline-style baseline is frozen at 538. Presentation-only change: transaction logic, covenant behaviour, and node state are unchanged.

- **Wallet currency rows restored and no giant agent-icon flash (v0.0.8.28).** The system layer's icon-action rule was forcing `display:inline-flex !important` on the wallet edit-mode star and hide-toggle, so every currency row showed a permanent star and an empty 44 px box overlapping the balances in normal mode. Those two controls now keep the shared 44 px touch-target geometry but respect their state-driven visibility: they render only while wallet edit is on, and edit mode reserves 64 px on the right so the pinned toggle never covers the balance. Separately, `assets/app-ui-system.css` was loading at the end of the document, so every refresh rendered the page (including the agent floating button image at natural resolution) before component CSS arrived; the stylesheet now loads render-blocking in the head after the legacy styles, preserving cascade order, and the agent image carries explicit 32 px intrinsic dimensions. Presentation-only fixes: transaction logic, covenant behaviour, and node state are unchanged.

- **Zero inline button styling and zero inline hard-coded colours (v0.0.8.27).** Every `.btn` action is now free of inline styles: runtime-hidden buttons and links (contact merchant actions, APK update/check, camera photo scan, Pure Minima disconnect, biometric unlock, settings download links) use the `hidden` attribute with `.btn[hidden]` state support; the recover and safety-quiz submit buttons use native `disabled` instead of inline opacity/pointer-events; redundant `text-decoration`/`display` styles were removed from every `.btn` anchor; and the terminal danger button dropped its local border tint. All 42 inline hard-coded colours were replaced with theme tokens or named rules: theme-picker palette chips moved to CSS keyed by `data-theme-id`, checkbox accents use `var(--c)`/`var(--am)`, the APK progress gradient, QR scan surfaces, agent drawer inks, language options, and transaction status dots use tokens, and the merchant payment QR box and instant-payment success panel use the shared `recv-qr-host--fixed` and `ui-inline-note--success` classes. Legacy `finput`, `fsel`, `ex-input`, and asset-picker geometry declarations superseded by the App UI System layer were removed. Static inline styles fell from 770 to 724 and the baseline was frozen at the lower counts; static and runtime audits pass on all 24 pages at every gated width. Presentation-only change: transaction logic, covenant behaviour, and node state are unchanged.

- **Visible inactive Mint asset section selector (v0.0.8.26).** Added the documented `ui-segment--section` selector variant to the top-level xWiniwa/Stables choice. Its inactive option now retains readable text, a neutral filled surface, and a visible border, while the selected option keeps the existing cyan state and the shared selector geometry remains unchanged. The switching function now updates `.active` and `aria-pressed` atomically so only one option can receive selected styling. Presentation-only change: Mint/Burn modes, transaction logic, covenant behaviour, and node state are unchanged.

- **Full-width Mint and Burn forms (v0.0.8.25).** Removed the redundant 18 px horizontal card-body inset from both xWiniwa and Stables Mint/Burn panels while preserving their vertical rhythm and the page's standard outer gutters. Added the named `ui-px-0` composition utility and applied it only to the two shared Mint card bodies, so selectors, fields, asset pickers, and transaction actions use the complete section width in every Mint and Burn mode. Presentation-only change: transaction logic, covenant behaviour, and node state are unchanged.

- **Rationalisation debt cleared to zero (v0.0.8.24).** All 53 remaining rationalisation instances were remapped to approved catalogue references: the payment-code keypad keys are standard choice/secondary actions; the recovery-quiz answers are full-width choice actions with answer-state tone only; the send-camera overlay controls are compact secondary actions with positioning-only composition classes; the multi-recipient split control and the tap-to-flip exchange rate readout use the new named `ui-text-action` class (the ACT-008 executable); the Add liquidity heading and the On/Off-Ramp flow headings use the section-title role; the welcome, Vault-key, recovery, terminal-warning, and charter modal prose plus the on/off-ramp and payment-security notes use the body/support typography roles; and the StablesAgent images use the named inline-icon and small-avatar scales. The topbar network dot, channel/version pill, and sync pill are now classified as icon action, secondary action, and status pill. Added `.btn[hidden]` state support and the `ui-mb-8` flow utility; static inline styles fell from 789 to 770 and the baseline was frozen at the lower counts. Static and runtime audits pass across all 24 pages at 320, 360, 390, and 760 px; every recorded element now maps to an approved reference. Presentation-only work: no transaction logic, covenant behaviour, or node state changed.

- **Executable UI library, complete inventory, and one transaction-action family (v0.0.8.23).** Extracted the authoritative normalization layer from the monolithic app document into `assets/app-ui-system.css`, and added a generated, self-contained HTML component catalogue covering typography, action roles and sizes, selectors, fields, dropdowns, surfaces, statuses, rows, modal anatomy, asset sizes, and data states. Added generated HTML and JSON inventories of the global shell, all 24 pages, and all 22 overlays, with semantic family, source identity, label, visibility, DOM path, and computed geometry for every captured user-facing element. Mint, burn, Buy xWiniwa, Exchange Now, swap, liquidity, coverage-fund, faucet, send, and confirmation triggers now use the single `action-transaction` family; market direction no longer changes submit-button styling. Static and runtime audits now enforce that transaction mapping and the typography, button, field, dropdown, selector, surface, modal, asset, navigation, overflow, and touch-target contracts. No transaction execution, covenant, node-state, or deferred-platform logic changed.

- **One peer selector and named asset scale across the app (v0.0.8.22).** Replaced the separate Invest tabs, Mint asset tabs, Mint/Burn switches, Exchange/Trade action-card selector, Trade Market/Limit and Buy/Sell controls, liquidity pattern buttons, and Send/Receive tabs with one `ui-segmented` / `ui-segment` component. All 10 groups and 21 peer items now share equal-width 44 px geometry, spacing, radii, typography, focus, pressed semantics, and neutral active treatment; Buy/Sell retains semantic success/danger tone without changing shape. Removed the xWiniwa-only purple active exception and made legacy selector classes a hard static-audit failure. Moved every static image away from inline sizing into the named shell, modal, inline, media, avatar, token, and flag scale, with inline-styled images now blocked. Expanded the runtime gate to enforce button-size families, selectors, modal shells, icon actions, and bottom navigation across all 24 pages at 320, 360, 390, and 760 px. Static inline styles fell from 809 to 790. This is presentation and UI-system work only; transaction logic, covenant behaviour, node state, and deferred downstream parity are unchanged.

- **App-wide UI source cleanup and responsive matrix (v0.0.8.21).** Removed superseded page-local geometry and moved repeated spacing, alignment, typography emphasis, semantic tone, field-row, action-stack, and section-density patterns into the authoritative App UI System. Static inline-style attributes fell from the frozen 1,633 baseline to 809; inline button geometry fell from 86 to zero; inline button styling fell from 110 to 22; and hard-coded inline colours fell from 72 to 42. Standard, Dense, Featured, and Flush section densities now replace arbitrary padding, while body/support/micro-label roles replace local type overrides. The runtime UI gate now measures all 24 pages at 320, 360, 390, and 760 px; every viewport passes with zero horizontal overflow, zero undersized visible actions, one button role per `.btn`, and one computed geometry per core component family. Exchange, Trade, liquidity, Wallet, and Profile/Settings received visual browser review. This pass changed presentation and source structure only: no transaction logic, covenant behaviour, node state, onion, Android, MiniDapp, APK, or package parity changed.

## Released iterations

- **App-wide UI system and interaction normalization (v0.0.8.20).** Installed the measured mobile-first UI reference as the executable late CSS layer and mandatory agent workflow dependency. Equivalent components now share the same typography, spacing, radii, action role/size/layout axes, 44/48 px touch geometry, fields, dropdown rows, tabs, segments, pills, repeated icon controls, modal shells, page rhythm, and focus treatment across all 24 pages. Every static `.btn` now has exactly one semantic role; the Exchange/Trade selector uses pressed state instead of stacking `btn-choice` and `btn-primary`; legacy clickable pills/rows receive keyboard and pressed-state semantics; and both exchange flip controls are native buttons. This is a test-app-only normalization pass: no transaction logic, covenant behaviour, onion, Android, MiniDapp, APK, or package parity changed.

- **Fail-closed pending liquidity posts (v0.0.8.19, R4 passed).** The v0.0.8.18 R3 retest proved that freezing maker identity alone was necessary but insufficient: reload could occur while an order transaction was still in the mempool, and another spendable wallet coin allowed Resume to post the same frozen order again. Both identical BIDs—same order ID, nonce, identity, price and quantity—settled in block 2,210,777. The journal now writes an unresolved `pending` record with the exact order ID before calling `send`. On reload it only waits for that ID; it never automatically reposts an unresolved submission, and it fails closed if the chain does not resolve within the registered timeout. Confirmation also hard-stops if more than one coin carries the expected order ID. Formal R4 then passed: 36/36 static ladders; an exact in-flight Spot reload with no repost; Curve/4 placement, partial V2 fill/continuation and cancellation; and the maximum Bid-Ask/12 ladder with 24 unique orders, exact totals, both-node equality, confirmed Activity reconstruction, and exact cleanup. Final chain state retained only the preserved historical BID with empty mempools on both nodes. This is xWiniwa/Winiwa development evidence, not production certification or deferred-platform parity.

- **Liquidity resume identity fix (v0.0.8.18).** The first formal interruption test of v0.0.8.17 exposed a real duplicate-order bug: the journal froze each maker nonce but rebuilt the maker receive/refund address after reload, and the wallet supplied a new owned address. The already-submitted BID therefore derived a different order ID and was posted twice. Liquidity journals now freeze the complete maker identity—receive address, refund address, and public key—once before the first post and reuse it for every order and every resumed reconstruction; incomplete legacy journals fail closed. The nine valueless R2 test orders, including the duplicate, were maker-cancelled and the preserved pre-run BID remained untouched. Full R3 on-chain retest follows under a new frozen source hash.

- **Minimal-information Trade and real selectable liquidity bins (v0.0.8.17).** Removed decorative `Live` dots/labels, repeated panel kickers, the persistent order-mode explanation, the redundant Liquidity display label, and the legacy exchange rate-status ornament; action-critical balances, quotes, confirmation boundaries, failures, and empty states remain. Add liquidity now lets the user select 1–12 bins per side, defaulting to the 12 positions available on each side of the 25-column par-centred grid. Spot distributes evenly, Curve weights toward par, and Bid-Ask weights outward; the graph and the actual ASK/BID ladder share the same count and weighting. Multi-order placement now freezes deterministic order nonces in a local journal, waits for each order and spendable change, detects a previously posted order before retrying, and offers Resume liquidity after interruption rather than silently duplicating or losing the remainder. No transaction was posted during implementation or UI verification.

- **Chart-first Trade and permanent Add liquidity (v0.0.8.16).** The price chart is now the first full-width Trade panel after pair/market truth, followed by the complete ticket and order book. Add liquidity is no longer an Advanced disclosure: it is a permanent full-width section below recent trades, restoring the prior Liquidity display structure with Spot, Curve, and Bid-Ask controls; a 25-bin selected-pattern graphic; live Winiwa grid and active-range labels; xWiniwa and Winiwa deposit fields with balances/MAX; and the real deposit action. Empty fields still show the selected real ladder geometry instead of a blank strip: Spot concentrates one tick either side of par, Curve tapers across three ticks, and Bid-Ask weights outward across the same three levels. Shape clicks use the TV81 renderer directly so the legacy illustrative USD heatmap cannot overwrite live Winiwa labels. Existing real order-ladder compilation and confirmation remain unchanged; no transaction was posted.

- **Single-column Trade flow (v0.0.8.15).** Trade no longer places any sections side by side. The app-width shell now uses the same full-width scroll sequence at every viewport: market truth, complete order ticket, chart, order book, open orders, recent trades, then advanced liquidity. This removes the compressed wide-layout ticket/chart and the split open-orders/trades row, giving every field, graph, depth row, owner action, and confirmed trade the full available width. The mobile-first ordering and compact phone spacing from v0.0.8.14 remain unchanged. All trading IDs and live V2 behavior are preserved; no transaction was posted.

- **Mobile-first Trade hierarchy (v0.0.8.14).** The phone layout no longer asks the user to cross the chart and order book before reaching order entry. At 520px and below it now presents immediate pair/Mark/Last/Spread truth, then the complete order ticket, followed by the price chart and depth book. Mobile spacing, panel padding, chart height, ticket rhythm, and field summaries were tightened so the default Market order ticket—including side, size, balance, MAX, quote, action, and price-boundary hint—fits above the fixed bottom navigation on a 360×800 viewport. The wide app layout remains the professional side-by-side terminal introduced in v0.0.8.13. Live Test12 data still reconstructed the 0.9999 bid, wallet order, and four confirmed fills; no transaction was posted.

- **Professional Trade terminal redesign (v0.0.8.13).** The Trade tab is now one responsive workstation instead of a 1,562px stack of equal-weight sections. A compact pair-and-market bar anchors Mark, Last, and Spread; the chart and classic depth book form the market view; and a clearly dominant Market/Limit × Buy/Sell ticket sits beside it at wide app widths. On phones, the ticket moves ahead of the order book so context and action arrive before secondary depth. Open orders and confirmed trades are compact, aligned truth panels with subordinate cancel actions, while liquidity provision remains a quiet advanced disclosure. Runtime-rendered book, order, and trade rows now use named design-system classes rather than inline visual styling; depth width and SVG geometry remain data-driven. The existing IDs, real V2 construction, confirmation, cancellation, reconstruction, and Test12 RPC behavior are unchanged. Live responsive review used the real 0.9999 bid, one wallet order, and four confirmed fills; no transaction was posted.

- **Clean-session order lifecycle reconstruction (v0.0.8.12).** Startup and the 15-second market-truth pass now rebuild confirmed V2 order placements and maker cancellations from node history and exact transaction topology, alongside the existing confirmed-fill reconstruction. Placement requires a real action-0 engine output carrying tag 8111; cancellation requires action 2, the matching engine input, and an exact token/amount refund to the pinned refund address. Wallet ownership uses `checkaddress` simple-key truth. Deterministic Activity IDs update any optimistic row, generic node twins for the same TxPoW are removed, final TxPoW/block/confirmation data replaces local pending data, and a clean browser profile can reconstruct the lifecycle without a private server database. A clean-session test deleted all eight market rows and rebuilt four placements plus four fills with their mined identities. A fresh active-V2 ASK for 0.1 xWiniwa at 1.0004 confirmed in block 2,210,477, then maker cancellation returned exactly 0.1 xWiniwa in block 2,210,481; the reader refused to classify the cancellation while it was only in history/mempool and admitted it once `txpow onchain` became true. Both nodes observed the same results. This advances P8-04 and the P8/P9 startup-truth frontier for xWiniwa/Winiwa; USDw and full cross-operation reconciliation remain later work.

- **Reconstructed trades and resumable market execution (v0.0.8.11).** The Trade page now derives recent trades only from confirmed V2 fill transactions: it verifies the order input, fill action, on-chain TxPoW, exact base/quote deltas, continuation/terminal state, operation ID, block, and price-state successor. Last trade and the chart use those confirmed fills rather than session-only mid samples. The same reconstruction repairs each locally optimistic fill Activity row with its final mined TxPoW, correct on-chain/confirmation status, role-aware received amount, and partial/terminal note; unrelated tracked covenant activity is not attributed to the wallet. Sequential market sweeps persist a local rebuildable journal, record an unresolved posted fill before waiting, reconcile order consumption plus price-nonce advance after reload, refuse a second post while the prior result is unknown, and resume only the missing base quantity inside the originally confirmed worst-price boundary. A dedicated valueless run then interrupted a two-order 1-xWiniwa buy after the first 0.5-xWiniwa post, reloaded the application, and resumed from the journal without reposting: fills at 1.0002 and 1.0003 confirmed on both nodes in blocks 2,210,454 and 2,210,460, total quote was exactly 1.00025 Winiwa, both ASK coins were consumed, and the price state advanced from nonce 2 to 4 at `0x310C4BA8…CCF44E` with four observations and 3-xWiniwa cumulative raw volume. P7-11 and P7-12 are closed for the xWiniwa/Winiwa development path; this is not production certification.

- **Activated and proved the instruction-safe market engine (v0.0.8.10).** The exact V2 covenant is registered on canonical TestV008 at `0x33150309…D5CF58`; its dense 110-port xWiniwa/Winiwa price-state anchor `0xDE7F5494…35C3D85` was confirmed in block 2,210,410 and observed identically by TestV008 and Test12. The two resting V1 orders were maker-cancelled through the real Test12 application wallet in blocks 2,210,417 and 2,210,420. The app then placed a replacement 2-xWiniwa ASK at 1.0001 and the exact floor-rounded BID at 0.9999 on V2 (blocks 2,210,430 and 2,210,434), partially filled 1 xWiniwa from the ASK (block 2,210,436), recreated an exact same-ID/same-price 1-xWiniwa continuation, and terminally filled that continuation (block 2,210,438). Both nodes observed every canonical block. Price nonce advanced 0→2, the ring holds two observations and 2 xWiniwa raw volume, and the active/candidate/median price is 1.0001; current price-state coin is `0x2F9CAE3E…37A551`. TestV008 remains canonical on RPC 9105 and Test12 remains the same-mainnet development participant on RPC 9005 (browser bridge 9006). This is narrow valueless-asset development evidence, not a production-readiness claim.

- **Added: presentation-only exchange rates for wallet totals (v0.0.8.9).** Multi-currency portfolio totals and row ≈ lines again convert into the primary currency using MEXC Winiwa/USD (live via MDS, same-origin presentation proxy on the local preview server, or last-good cache) plus the seeded fiat FX table. These rates are display-only — mint, burn, CLOB, and covenant settlement do not use them. Hard reload required; restart the local website server so `/__stables/presentation/mexc-minima` is available.

- **Fixed: Balance hero is a multi-currency portfolio total in the primary unit (v0.0.8.8).** Reverts the mistaken single-asset hero. The total sums every counted currency converted into the primary (e.g. Winiwa + xWiniwa → Winiwa total when Winiwa is primary). Denomination always follows the primary — no silent Winiwa hijack when primary is USDw, no "Main X · total in Y" copy. Unpriced holdings show "—" on the row; if nothing can convert into the primary yet, the hero is a quiet dash rather than a false single-currency figure. Hard reload required.

- **Fixed: primary currency is shown prominently on the Wallet again (v0.0.8.6).** Settings says "Shown prominently on my Wallet", but the pinned primary card had been retired and forced `display:none`, so choosing USDw only left a quiet list row while Winiwa's gold accent still looked like the main asset. The primary card is restored (large balance + name for the main currency, including 0.00), the matching list row is hidden in normal mode to avoid a twin, and edit mode still uses the full list for reorder/stars. Hard reload required.

- **Fixed: empty-balance currencies can be set as main and look like it stuck (v0.0.8.5).** Set as primary already accepted a 0.00 row, but for unpriced pre-launch stables the hero kept saying "Winiwa equivalent", so empty USDw/EURw looked blocked. The hero now keeps the main currency in the label when the total must stay in Winiwa (`Main USDw · total in Winiwa`), and setPrimary documents that balance is never a gate. Hard reload required.

- **Fixed: Set as primary on the Currency sheet looked broken (v0.0.8.4).** The star did update `BASE_CCY`, but the main-currency highlight was invisible on USDw, Winiwa, and xWiniwa because per-currency row accents outranked `.ccy-sec-row--selected`. Selected styles now win, the sheet star uses a proper click handler with filled/outline state, and `setPrimary` keeps Settings in sync, enables a hidden currency if needed, and exports `window.setPrimary`. Hard reload required.

- **Opened the production-shaped v0.0.8.1 development line (iteration 3).** Per founder direction there is no v0.0.7.16 and packaging/parity surfaces remain deferred while the web development application is completed. The real `xWiniwa/Winiwa` CLOB now has app-side full and partial fill construction: every fill co-spends the resting order and current price-state coin, pays maker and taker at the pinned order price, recreates an exact same-terms remainder when partial, advances the authenticated fill ring and price-state commitment, validates the complete covenant transaction, and posts only after all validity gates pass. The Trade market ticket previews exact live depth and executes sequential best-price fills inside the confirmed worst-price boundary instead of bypassing the book through the par vault. A clean browser profile takes its default web transport from the declared TV81 CORS bridge while retaining TestV008 RPC 9005 as the sole canonical node identity. Live `txncheck` evidence then exposed the deployed V1 engine's consensus-boundary defect without posting: its dynamic 84-port ring scan exceeds Minima's 1,024-instruction KISS ceiling (`scripts=false`, all other validity gates true). A V2 engine now preserves the exact 21-fill capped weighted median with literal sums, parses and registers at `0x33150309…D5CF58`, and executes its price branch in 851 instructions. It is not active yet: the running participant wallet has no sendable native Minima for the replacement 0.0001 price-state coin, and the preserved canonical TestV008 node may not be started without explicit direction. The active registry therefore remains on V1 and fill settlement remains honestly blocked. This is a valueless-asset development build and does not claim production readiness.

- **Exchange tab is the multi-token exchange, wired to reality (v0.0.7.15).** Per founder direction the Exchange tab uses the multi-token shell (any token selectable, flag dropdowns, Send/Receive, MAX, rate pill). Only the live pair executes: Winiwa and xWiniwa are active and swap at protocol par through the vault; every other token (USDw, EURw, GBPw, and the rest) is shown as Coming soon and cannot be selected. The simple par-swap card is retired (hidden). The rate pill reads 1:1 for the live pair and a coming-soon note otherwise, the Exchange Now button disables for non-live pairs, and Available/Balance read live node balances. The hardcoded-FX demo path no longer runs in this generation. Verified live: default Winiwa to xWiniwa at par, coming-soon tags on all inactive tokens, and a real 3-Winiwa exchange executed through the shell.

- **Exchange tab shows one swap only (v0.0.7.14).** The tab had doubled: the real on-chain Winiwa/xWiniwa par swap plus a leftover hardcoded-FX demo exchange (fabricated balances, non-live USDw/EURw rates). The demo card and its Recent exchanges list are removed (hidden so load-time references do not break), leaving the single real swap, now with an Available line and MAX for parity with the old shell. Verified live: one swap card, Available reads the live balance, legacy card gone.

- **The Trade tab is now a full CLOB (v0.0.7.13, unverified beyond the recorded live operations).** Per founder direction the Exchange page tabs are Exchange (simple swap) and Trade (the order book), and the Trade tab carries the four load-bearing CLOB elements: a pair selector (xWiniwa/Winiwa, structured for more as stablecoins launch), a price chart (session mid sparkline with an honest empty state until confirmed trades exist), a classic Price/Size/Total order book with red asks descending to the spread, a mid/spread row, green bids below, and cumulative depth shading, and a Market/Limit x Buy/Sell order ticket with size, limit price, MAX, a live quote line, and best-price context. Market orders take instant liquidity at protocol par via the vault; Limit orders rest on the book (book-sweeping market orders arrive with P7-08 fill settlement). Tapping a book row prefills the limit price. The provide-liquidity shapes remain under a collapsible Provide liquidity section. Verified live from Test12: Exchange|Trade tabs, pair selector, Mark 0.9999, order book with the resting bid, and the order ticket placing a limit sell.
- **Full order-book histogram in the Liquidity-funds visual language (v0.0.7.12, unverified beyond the recorded render).** The Exchange Liquidity depth chart is now a complete 25-tick histogram centred on the mid price: every tick bin is drawn (empty ticks as faint baseline stubs), bids in cyan left of centre and asks in the warm accent right of it, opacity fading with distance from the mid, and hover or tap reveals the exact price and size of any bar. The center line reads the live mid (1 xWiniwa = N Winiwa), the range labels show the grid bounds in Winiwa, and the total reflects real escrowed value. The Add-liquidity preview uses the same grid with the Active range label from the demo. Everything is computed from live chain orders. Verified live via the CDP harness: 25 depth bars and a 25-bar preview around par, the resting 0.9999 bid one bin left of centre. A fresh MiniDapp zip (Stables_v12.mds.zip) was packaged so hub installs match the web build.
- **Invest page drops the retired Liquidity funds tab (v0.0.7.11).** The experience fully lives on the Exchange page Liquidity tab, so the leftover pointer tab is removed per founder direction. A previously stored Liquidity-funds tab preference now falls back to My investment, and the Exchange order book is unaffected. Verified live via the CDP harness.

- **Liquidity funds live on the Exchange page (v0.0.7.10, unverified beyond the recorded live operations).** The Liquidity funds experience moves from Invest into the Exchange Liquidity tab and connects to the real backend end to end. The depth chart renders the live order book from chain coins (bids green, asks red, tap a bar for price and size, best bid/ask/spread and escrowed totals shown); Place an order submits a real limit order; and the Spot, Curve, and Bid-Ask shapes now compile dual-token deposits into ladders of real resting orders around protocol par, previewed honestly before a single confirm places them all. The old fake deposit success toast is gone; the Invest tab keeps a pointer to the new home. Live from the Test12 tester: a Spot deposit placed the book's first real orders (2 xWiniwa ask at 1.0001; matching Winiwa bid at 0.9999). Multi-order deposits place sequentially and report honestly if a later order must wait for coin confirmation.

- **Two-tab Exchange: simple swap plus the live order book (v0.0.7.9, unverified beyond the recorded live operations).** The Exchange page now has two tabs per founder direction. Exchange is a simple swap between Winiwa and xWiniwa whose liquidity design is the CLOB; until book liquidity and fill settlement are live it routes through the deployed D13 vault at exactly protocol par, with the rate stated honestly. Liquidity is the real xWiniwa/Winiwa order book: live asks/bids grouped by tick, best bid/ask and spread, limit-order entry with tick-rounding disclosure, and maker cancellation refunding the whole unfilled escrow, all against the registered TV81 market engine. The legacy conversion card remains below the swap; the old Invest Liquidity funds tab points to the new home. Live proof from the Test12 tester wallet: a 5-Winiwa swap minted 5 xWiniwa at par through the vault (balance nonce 3, pool 65, issued 65 exactly). Fresh-node lesson recorded: covenant coins created before a node tracks the script need imported MMR proofs; the tester path now includes script tracking plus proof import, and a public TV81 covenant-proofs endpoint is noted as an ops item.

- **Fixed: Recent activity empty after TV81 claims and trades (v0.0.7.8, unverified).** The tx mirror compared history/txpow token ids with case-sensitive equality against the lowercase registry projection, so every Minima-uppercase token id looked out of scope and the whole history window was skipped — balances worked (different path) while the list stayed blank. Token matching is now case-insensitive; TV81 vault/market/faucet addresses also merge into the covenant set when the async registry loads (with kind tags for honest Faucet claim / Minted xWiniwa titles). Hard-refresh so `?v=tv81-8` assets load.

- **Wallet total denominates in Winiwa, the protocol numeraire (v0.0.7.7, unverified).** The hero total and per-currency equivalents were gated on a live external spot feed that the oracle-free TV81 generation deliberately does not have, so they showed a permanent dash. The only authenticated conversion in this generation is protocol par (D13: 1 xWiniwa = 1 Winiwa while no stablecoin exists), so the wallet now totals Winiwa plus xWiniwa at par, labels the hero with the display name of the effective base, and shows an honest dash for anything without an authenticated price (USDw until its launch, fiat rows). When the saved primary currency itself has no authenticated price, the hero falls back to Winiwa denomination. Verified live via the CDP harness: hero 990,002,000.00 Winiwa on the treasury wallet with USDw and EURw rows dashed. Asset cache stamps bumped to tv81-7 with the version.

- **First full user-journey test pass and fix batch (v0.0.7.6 continued, founder-authorized agent testing).** Driven through the real UI via the CDP harness: wallet balances render node truth; the Mint page deposited 100 Winiwa for 100 xWiniwa at par (mined block 2207907, all txncheck gates true) and burned 40 back (nonce 2, pooled Winiwa and issued xWiniwa exactly equal both times); the Faucet page poured 1,000 Winiwa end to end in-app (pool 9,998,000, claim nonce 2). Fixes from the pass: the legacy registry gate no longer blocks TV81 xWiniwa mint/burn; the faucet covenant script now ships in the registry projection so a fresh node (emulator, new community wallet) can claim at all; TV81 protocol addresses joined the activity infra-exclusion set so covenant coins can never import as user rows; and the xWiniwa mint and burn flows now write ONE activity row per trade (founder law) with the counterpart amount in the note instead of a second leg. Known remaining gap: wallet-facing pour pacing can be bypassed by a fresh browser profile (app-level pacing only, as D12 states).

- **Balance truth restored after the poisoned first-claim session (v0.0.7.6 continued).** A clean session against the same node computes the correct balances (verified via the CDP harness: Winiwa 990,001,000 and USDw 100,000,000 on the treasury node), so the all-zero wallet came from per-origin session state written by the pre-fix pour flow. The activity storage key bumps to `tv81b` so every client abandons the poisoned rows (including the contradictory green-check "failed +1,000" row) and re-imports history from node truth, which now contains the real confirmed claim. Expectation note: on the treasury node the wallet truthfully shows the full remaining supply; tester-sized balances belong to fresh wallets (emulator APK).

- **Faucet pour hardening from the first live claim (v0.0.7.6, unverified fixes).** The first real pour surfaced three defects, all fixed: (1) a raw node exception (java.lang.NullPointerException) reached the user unattributed — sign, finalize, and post failures now name the failing step and log the full detail to the console; (2) a failed pour left a phantom "receiving" activity row that also armed the cooldown pill — the failure path now converts the row to an honest "Faucet claim failed" state and clears the optimistic balance; (3) the optimistic +1,000 Winiwa never applied because an unguarded global read threw a silently-swallowed ReferenceError — the balance now updates the moment the pour is submitted and the token row and global figure flash to announce it. The first claim itself was completed and confirmed on-chain (block 2207882): the faucet covenant enforced the exact 1,000-Winiwa release, pool remainder, and state advance on its first live spend.

- **xWiniwa mint and burn live against the D13 par vault (v0.0.7.5, unverified).** In the exclusive TestV008 generation the existing Mint page now executes real on-chain xWiniwa operations: deposit Winiwa to receive xWiniwa and burn xWiniwa to receive Winiwa, both at exactly 1:1 while no stablecoin exists, through the deployed keyless vault covenant. The executor builds the full covenant transaction (reserve, balance state, and pool coins plus user funds), validates with the mmrproofs-gated txncheck before posting, and inherits the existing confirm modal, one-row activity, wallet navigation, and orphan-retry rebuild. The Mint page reserve level now reads the live 100,000,000-xWiniwa vault reserve, and the vault script ships in the registry projection so fresh nodes can track and spend the covenant coins. The Faucet page already routes end to end through the deployed TV81 faucet. No behavioral test was run and no production-readiness claim is made; the first user claim, deposit, and burn are the test.

- **TestV008 price-state reader route and CLOB readers (v0.0.7.4, unverified).** Added the market price-state block to the app registry projection (shared engine address, tag 8106, port band 90-199, both state coin IDs explicitly null) and a fail-closed reader in the bootstrap that reports NOT_DEPLOYED for both pairs until the controlled two-coin construction ceremony records real state coin IDs. Added the app-side order-book reader (strict tag/generation/market/tick/escrow normalization, display-only bins, best bid/ask/spread/depth) and the ASK/BID placement builder (D03 protective rounding with entered/quantized disclosure, exact escrow arithmetic, deterministic order IDs, unposted DRAFT construction only). The price-state construction route itself is frozen in tools/tv81/price-state-deployment-manifest.json (market 1 resolved from contract as CLOB reference only; market 2 blocked on the USDw launch-price decision). Later the same run, after the founder-approved D13 ceremonies, the registry projection was reconciled with the deployed identities: the live xWiniwa/Winiwa price-state coin, and the D13 par vault (address, 100,000,000-xWiniwa reserve coin, and par-1 pooled balance state coin). The app remains read-only against all of them until the P5-08/P9 wiring lands. No price is invented and no behavioral or production-readiness claim is made.

- **TestV008 faucet deployment slice (v0.0.7.3, unverified).** Registered and funded the v0.0.8.1 Winiwa faucet with a 10,000,000-Winiwa initial reserve, a 1,000-Winiwa full claim, and 72-block / approximately one-hour wallet pacing. The app registry now carries the confirmed covenant, pool, and state-coin identities. No privileged refill exists, no claim transaction was performed, and no behavioral or production-readiness claim is made.

- **TestV008 asset identity and market-engine slice (v0.0.7.2, unverified).** Mapped the three confirmed v0.0.8.1 token IDs into the browser and balance registry, recorded the exact shared market-engine address for both pairs, and preserved fail-closed behavior for the still-missing faucet, reserves, and protocol state coins. The assets were deployed under the controlled D10 ceremony; no behavioral test or production-readiness claim was made.

- **TestV008 registry cutover foundation (v0.0.7.1, unverified).** Added the `TV81-REGISTRY-001` / `TV81-ABI-001` browser projection and fail-closed loader, set TestV008 and RPC 9005 as the exclusive v0.0.8.1 generation, cleared all active token and faucet deployment identities, removed historical fallback IDs from the Faucet route, and now render an honest “not deployed” state until controlled construction populates the registry. This is a static implementation slice; no node transaction or behavioral test was performed.

## Historical unreleased notes
- **Slice 2: wallet display repointed to genesis-6 (v0.0.6.2).** TEST_TOKEN_REGISTRY now maps the wallet/balance layer to the genesis-6 Winiwa (0xCCC07E6D), xWiniwa (0xE65F396B), and LPxw (0x0989CF86) token ids; usdw id cleared (no stablecoin at genesis-6). Faucet address unchanged (deterministic 0x6F2E8362). Verified live via CDP: registry ids correct, USDw empty, slice-1 pool reader still par 1.0. No visible surface change yet (balances are 0 until faucet claim = slice 3).
- **v0.0.6 line opens: GENESIS-6 pool generation, slice 1 (v0.0.6.1).** The app now reads the live xWiniwa/Winiwa pool directly off the chain (TestV006 via the CORS proxy) with NO oracle: added the TEST_GENESIS6 config block (token ids, covenant addresses, price base/step, margin) and a self-contained pool reader (window.__STABLES_G6_READ_POOL) that returns the par price and reserves from the pool state coin. Verified live via CDP: price 1.0 exact, 10000/10000 reserves. Foundation for the remaining wiring slices (wallet display, faucet, pool swap, liquidity, launch flow); the g2/g3/g5 accretion is removed at cutover. No surface change yet.
- **v0.0.5 line opens: the genesis-5 generation (v0.0.5.1).** Genesis-5 was ceremonied from the fresh TestV005 issuer per V5_GENERATION_PLAN.md (set one only: Winiwa 1B with the whole supply in the faucet, USDw, cfUSDw, and xWiniwa live at its theoretical price with an on-chain 0.01-Winiwa floor; price freshness 6 blocks; no per-order cap this generation). This iteration adds the genesis5 registry (assets/config/genesis5-registry.json) to the app tree; the from-scratch backend rebuild (V5_BACKEND_CONTRACT.md) lands in the following iterations. No user-visible change yet.
- **No tabs hidden — the v4.20 dormancy gate is removed (v0.0.4.32).** Founder law: every developed surface stays visible; hiding reads as destruction. The prod-profile gate that hid the xWiniwa mint/burn tab, the Liquidity funds tab, and the tab bar (and rewrote the Mint page subtitle) is deleted — the page returns to its v0.0.4.19 shape on top of all fixes since. Dormant backends refuse honestly when used; they do not disappear. No hide gate may ever be added again without explicit founder sign-off.
- **Two transaction-truth hardenings found during one-row verification (v0.0.4.31).** (1) A g2-era override in the bootstrap pinned the activity storage key to `stables_test_user_activity_g3`, silently neutering every runtime-config key bump this week (g31/g31b/g31c) — the override is removed; runtime-config owns the key. (2) Indeterminate `checkaddress` is not "not ours": when ownership lookups time out on a busy node, the transaction's coins netted to "[]", which the reconcile sweep read as "relayed — purge" and could wipe LEGITIMATE rows (observed live: the whole list vanished during a proxy outage window). Unresolved ownership now reports indeterminate — the sweep keeps the row and a later pass retries, the same law as txpow timeouts.
- **ONE ROW PER TRADE (v0.0.4.30).** Founder law: a mint/burn/CF/exchange is ONE activity row at all points, never two legs. A forward-pricing trade is two on-chain transactions (the user's commit, then the keeper's clear minutes later) linked by the escrow coin the clear spends — the mirror now represents the pair as a single row: placing an order shows "Mint USDw · −222 Winiwa" (pending), and the fill transforms it into "Minted USDw · +3.11 USDw" with the deposit kept in the note ("For 222 Winiwa."). Refunds show "Order refunded"; CF and exchange orders get the same treatment (CF share tokens now labeled via a registry map published for the mirror). The self-healing reconcile sweep judges stored rows against the same merged spec, so the existing two-leg history on every device collapses to one-row form automatically on the next deep pass.
- **Regression fix: order flows land on Wallet, no success messages (v0.0.4.29).** Founder law (restated 2026-07-10, now recorded permanently): after confirming a mint/burn/CF/exchange order the app navigates to the **Wallet page** — exactly what the V3 direct-mint flows did (`navigate('wallet')`) and the forward-pricing rewrite dropped. All success toasts removed ("Order placed.", "Order filled — your currency has arrived."): navigation plus the activity row are the feedback; error toasts stay.
- **Order confirm modal minimal (v0.0.4.28).** Founder direction: the FORWARD-PRICED ORDER eyebrow is removed and the modal title is now **Order confirmation** (You send / You receive / Confirm order - nothing else). Applied to all five order confirms (mint, burn via both paths, CF, exchange).
- **Mint page pilot leftovers cleaned (v0.0.4.27).** Founder-caught after hiding the parked xWiniwa tab: the page subtitle still said "Mint and burn xWiniwa and USDw" and a single floating "Stables" tab remained. In the pilot profile the subtitle reads "Mint and burn USDw" and the one-tab bar is hidden entirely. (xWiniwa's page returns with one config change when its slice goes live.)
- **Order confirm goes minimal (v0.0.4.26).** Founder direction: the confirm modal button reads **Confirm order** (the page button already says Place order), the receive line is just "~ N CCY" (the ~ carries the estimate meaning), toasts say "Order placed.", and the open-orders card shows Pending / Executing... - all mechanism explanations live with StablesAgent, not the app.
- **Removed the forward-pricing rate row (v0.0.4.25).** Founder direction (minimal-information law): the "Executes at the next published price / Forward pricing" line is gone from the Mint/Burn page - the receive field's "estimate" is the one decision-relevant hint, and StablesAgent answers the how/why.
- **Transactions sweep completes (v0.0.4.24).** The ownership sweep now also covers mirror-rebuilt RECV- rows and re-judges TITLES: a stored row whose framing disagrees with what current code would produce (stale-code labels such as a mint leg titled Coverage fund) is removed and rebuilt correctly on the next import pass.
- **Transactions: self-healing ownership sweep (v0.0.4.23).** Rather than only blocking phantoms at import time, the stored-row reconciler now re-judges EVERY node-origin row against on-chain ownership truth on each deep pass - any row no importer should have created (from any code path, past or present) is purged automatically. Indeterminacy is now explicit end-to-end: a timed-out txpow lookup returns null (retry later), never an empty "not ours" or a raw tracked difference, so busy-node imports can neither create phantoms nor delete legitimate rows.
- **Transactions truth, final (v0.0.4.22).** The last phantom source: when the mirror's `txpow` lookup times out (typical at arm on a busy node), it fell back to the node's raw tracked difference - indeterminate read as "import it" and covenant-seed coins became the user's rows. Indeterminate now means SKIP (the staggered deep passes retry on a calm node) - the same 'never poison on timeout' law as the checkaddress cache. History key bumped to `g31c` and asset stamps to `?v=g31c` for a clean rebuild under fully-fixed import code.
- **Transactions truth, part 2 (v0.0.4.21).** Acceptance testing of v0.0.4.20 exposed three more defects, all fixed: (a) the SESSION activity cache was not versioned with the storage key, so abandoned phantom rows re-seeded the list after every key bump (sessionStorage survives hard refresh) - session keys now derive from the storage key; (b) `cf_commit_address` aliases the same address as `commit_address` (one commit serves all directions) and overwrote its covenant kind, mislabeling mint legs as Coverage fund - first kind now wins; (c) the g2-era receive-leg repair adopted output 0 of a commit txn (the covenant escrow) and fabricated a "Reclaimed Winiwa +100" row - it now skips covenant-address outputs (a g3 order's receive arrives in the keeper's clear txn, imported separately).
- **Pilot audit board cleared in one pass (v0.0.4.20).** (1) **Transactions truth** - tx-mirror now recognizes every genesis-3.1 covenant address (self-maintained from `TEST_GENESIS3`) and ALWAYS resolves candidate rows through the txpow's real coins with per-address ownership (`checkaddress simple`), instead of trusting the node's raw tracked difference. Kills the phantom "+10,000,000 received" (faucet seed) and "Sent USDw" (keeper clear) rows; adds honest Coverage-fund row titles; history key bumped to `g31b` to abandon persisted phantoms. (2) **Exchange honesty** - with forward pricing on, non-live pairs refuse ("Exchange for this pair is not live yet") instead of running the local demo conversion. (3) **Treasury truth** - the balance sheet reads the pilot's on-chain pool coin (pC @40, assets @50, liabilities @51, deposit = pool amount, equity = pool - backing, NAV par; coverage shows an honest "999%+" while liabilities are dust). (4) **Dormancy gates** - the xWiniwa mint tab and Liquidity-funds tab are hidden in the prod profile while parked/demo. (5) **CF assets gated** to the live class set (pilot: USDw). (6) Asset URLs cache-busted (`?v=g31b`) so config and code can never load from different versions again.
- **Fixed: phantom "+10,000,000 Winiwa received" activity row (v0.0.4.19).** Founder-caught: the node tracks the pilot's keyless covenants, so the faucet SEED coin imported as the user's own incoming payment. The activity infra-exclusion (`testInfraAddresses`) now self-maintains from the `TEST_GENESIS3` block (every `*_address` field + the lab sub-block + the prod faucet), and the activity storage key bumps `g3 -> g31` so the already-persisted phantom row is abandoned and history re-imports clean.
- **Wallet now displays the pilot tokens (v0.0.4.18).** Founder-caught on the preview ("I see nothing"): the wallet balance/display layer maps token ids from `TEST_TOKEN_REGISTRY`, which still carried the genesis-2 ids — so pilot balances (e.g. the 1000-Winiwa faucet claim) were invisible while old g2 leftovers still showed. The registry block now maps the genesis-3.1 pilot ids (Winiwa `0x1D9423E1…`, USDw `0xADC2DE44…`, xWiniwa `0xD4B075C5…`, faucet `0x6F2E8362…`). The g2 covenant fields remain (inert while forward pricing is on).
- **THE APP IS ON THE GENESIS-3.1 USDw PILOT (v0.0.4.17).** `TEST_FORWARD_PRICING_PROFILE` flipped to **prod**: mint/burn/CF now place forward-pricing orders against the pilot covenants on **mainnet** — ONE commit covenant for every direction (`0xC2DDCE5F…`), the USDw per-currency vault (rate port 60), the separate Winiwa collateral pool, and the **feeless** Coverage Fund (D1). The faucet is the ceremony's 10M Winiwa carve-out (`0x6F2E8362…`, 1000/claim). The registry loader now prefers the `genesis31` block; swap is OFF in the pilot (one currency, `swap_commit_address` empty — the Exchange keeps its local path). Oracle + keeper run live from the VPS (`stables-oracle-g31`, 120s loop, keeper enabled after the founder-watched first clear `0xA5009FAA…`). Active set: **USDw only** — extension one currency at a time after the deep gauntlet + founder sign-off (pilot-first law, 2026-07-10).
- **Changed: shorter Burn test tokens helper copy (v0.0.4.16).** Removed the redundant "Real MINIMA is untouched" sentence. The section now reads: "Burn all test tokens on-chain and reset test-token state."
- **Fixed: faucet level now follows the active claim profile (v0.0.4.15).** The forward-pricing claim path uses the active lab/prod faucet, but the level reader still queried the retired genesis-2 Winiwa faucet. That returned zero and left the page looking unresolved even though the active lab faucet held live pool coins. Level, readiness, and claim now resolve through the same `g3prof` faucet address and collateral token when forward pricing is active, while legacy mode retains its existing covenant query. Forward-profile pool coins are counted in the same form the claim path can spend, including their deployed state-carrying form.
- **Changed: faucet level preloads after node connection (v0.0.4.14).** The early boot fetch could run before RPC was responsive, leaving faucet readiness unresolved until the user opened the Faucet page. The first successful RPC response now starts the faucet pool-level read in the background, alongside receive-address prewarming. Opening Faucet remains a freshness check, not the trigger that makes the data available.
- **Fixed: transient node warning clears after connection (v0.0.4.13).** The node-command watchdog can warn while a session is still starting, then the block-height pill can turn green while the warning remains over the wallet. Node warnings are now tracked separately and the existing RPC-confirmed path dismisses only the matching node notice. Real connection failures remain visible, and an unrelated toast that appears in the meantime is not hidden.
- **Exchange now places on-chain forward-pricing FX swap orders (v0.0.4.12).** When a pair is live (`window.__STABLES_G3_SWAP_LIVE(from,to)` = forward pricing on + a swap commit configured + both sides resolving to on-chain tokens), the Exchange button places a **dir-2** order — deposit the from-currency, receive the to-currency at the **next published cross rate** — through the same "Place order" confirm as mint/burn/CF; the keeper clears at maturity. The place-order executor now handles dir 2 (`fromCcy`/`toCcy` resolve both legs via `g3prof.swapTok`); `g3prof` gains `swap_commit_address` + `swapTok(ccy)`. The lab profile wires the proven on-chain swap deployment (per-currency-rate-port covenants, unequal rates — clears 0x63CF3439 / 0xE77651C6), with LABCF standing in as the second currency of the pair (displayed EURw), exactly as in the covenant proof. Pairs that aren't live keep the existing local demo behaviour. (Also fixed in the same slice: the prod profile's `cfShareTok` now reads the registry's real shape — `currencies[ccy].cf`, not a nonexistent `cf_shares` block — and prod `swapTok` only resolves ACTIVE currencies, so dormant pairs can't place orders.)
- **Coverage Fund deposit/withdraw are now on-chain forward-pricing orders (v0.0.4.11).** The CF page no longer just simulates locally: when the fund is live (forward pricing on + a CF commit configured for the profile — `window.__STABLES_G3_CF_LIVE()`), **Deposit** places a **dir-3** order (deposit your currency → receive coverage-fund shares at the next published NAV) and **Withdraw** a **dir-4** order (shares → currency), each through the same "Place order" forward-pricing confirm as mint/burn; the keeper clears at maturity. The place-order executor (`__STABLES_TEST_PLACE_ORDER_G3__`) now handles dir 3/4 (deposit token + commit + port-30 target picked per direction); `g3prof` gains `cf_commit_address` + `cfShareTok(ccy)`; the lab CF deployment (commit/vault/LABCF share — deposit/withdraw proven on-chain, txpow 0x85D01180 / 0x05D740B7) is wired into the lab profile. Off (legacy) the CF page keeps its local behaviour. This lands alongside the genesis-3 covenant set being proven end-to-end on-chain (mint, burn, **swap**, CF, gate fee), so the app's CF surface now reflects a real backend.
- **Multi-currency mint/burn dropdown is now profile-aware (v0.0.4.10).** The Mint/Burn currency picker no longer hard-codes "USDw only". Its "Soon" gate (`stablesIsReleaseMintBurnCode`) now reads the live active set published by the forward-pricing layer (`window.__STABLES_G3_ACTIVE_MINT_CCY`): **lab** = USDw only (the single lab currency — honest), **prod** = the registry's active currencies (USDw, EURw, GBPw, JPYw, CADw, AUDw, CHFw, TRYw, BRLw). The mint list is union'd with the active set so a currency that's active in production but absent from the static list (BRLw) still appears and is selectable, and the "not live yet" toast is now per-currency instead of always naming USDw. So flipping `TEST_FORWARD_PRICING_PROFILE` to `prod` turns the dropdown's Soon tags real — the last app-visible piece of multi-currency go-live. Legacy g2 (flag off) stays USDw-only.
- **Production wiring — the app is now profile-aware (v0.0.4.9).** Added `TEST_FORWARD_PRICING_PROFILE` (`lab` | `prod`) and a `g3prof` resolver that every forward-pricing path (order executor, faucet, open-orders card) reads for its addresses, collateral token, decimals, faucet, and currency→token-id map. **`lab`** = Test12 single-currency LABU/LABW (0-dec, proven); **`prod`** = production genesis-3 — Winiwa collateral, 8-decimal, the 9 registry currencies (loaded from genesis3-registry.json), production commit/vault/CF. So flipping the flag to `prod` (after the genesis-3.1 faucet carve-out ceremony + filling in the prod faucet address) is the entire app side of go-live. The selected currency now threads through to the order (`currencyCode` → `port 30`), and the "Place order" button relabel self-heals via a MutationObserver (the app was re-setting it on recalc). Lab flow re-verified (order posts). Plan: `PRODUCTION_GOLIVE_PLAN.md`.
- **Mint/Burn page reframed for forward pricing (v0.0.4.8).** The UI now tells the truth about the commit→clear backend instead of wearing genesis-2 clothes. When forward pricing is on: "You spend" → **"You deposit"**, the fixed **Rate** line → **"Executes at the next published price · Forward pricing"**, "You receive" → **"You'll receive · estimate"**, and the button reads **Place order** — for both mint and burn. So an order reads as a forward-priced order (amount is an estimate, executes at the next price), matching what the covenant actually does. Genesis-2 defaults stay in the HTML, so the g2 build is unchanged when the flag is off.
- **Forward-pricing mint PROVEN end-to-end through the app + bug fix (v0.0.4.7).** Ran the full test against the Test12 lab from a live-connected web preview: the Mint button reads **Place order**, the confirm shows the forward-pricing copy, the order posts a commit on-chain, and the keeper auto-fills it — **+166 LABU delivered to the wallet** (verified repeatedly). Fixed a real bug found during the test: `executeMintWablesTest` balance-checked the genesis-2 Winiwa token (which a lab wallet doesn't hold), bailing before the forward-pricing confirm; it now skips the g2 gate and reads the collateral amount directly. `TEST_FORWARD_PRICING` set true for lab testing (flip back to false to ship the g2-default build). Added a keeper `loop` mode (`keeper-lab-verify.mjs loop`) that auto-fills orders + keeps reserves fresh, and a test runbook (`FORWARD_PRICING_TEST_RUNBOOK.md`).
- **Added: forward-pricing BURN orders (v0.0.4.6).** Burn now mirrors mint under `TEST_FORWARD_PRICING`: the Burn button becomes **Place order**, the confirm shows forward-pricing copy, and it places a dir-1 sell order (deposit currency → collateral at the next published price). The place-order executor is now dir-aware (`__STABLES_TEST_PLACE_ORDER_G3__({dir})`, mint alias kept) and the keeper is dir-aware (mint releases currency + grows the collateral pool; burn releases collateral + grows the currency reserve — same coins, swapped roles). Burn proven end-to-end on Test12: 1000 LABU order → keeper cleared → +5 LABW to the recipient (txpow 0x38F6A7E1). Both buttons relabel verified live via CDP.
- **Added: genesis-3 forward-pricing UX + lab faucet (v0.0.4.5).** Wired the commit→clear experience end to end behind `TEST_FORWARD_PRICING` (or `?fwd=1` to preview; default OFF so genesis-2 is unchanged): the Mint button becomes **Place order**, the confirm shows forward-pricing copy ("≈ N at the next published price — not the price now"), an **Open orders** card lists pending/executing orders and flips to filled when the keeper clears them, and a lab **LABW faucet** covenant pours collateral to fresh test wallets (per-claim cap, change back to itself). All mechanics proven on Test12: place-order commit clears (txpow 0x165E0371), faucet claim pours (0xCC151CD6); the UX (button relabel + confirm copy + config) verified live in-browser via CDP.
- **Added: genesis-3 forward-pricing place-order groundwork (v0.0.4.4).** First slice of the commit→clear rewire, built behind a `TEST_FORWARD_PRICING` flag (default OFF, so the genesis-2 instant mint is unchanged). Adds a lab genesis-3 config profile (`TEST_GENESIS3.lab` — commit/vault/collateral/currency on Test12) and a place-order executor (`__STABLES_TEST_PLACE_MINT_ORDER_G3__`) that posts a COMMIT: deposit collateral to the forward-pricing covenant with the order state (dir=mint, recipient, target currency on port 30), which the keeper clears at the next published price. The exact commit the executor builds was proven on-chain end-to-end: placed → matured → keeper cleared it → recipient received the currency (txpow 0x165E0371). UI wiring (place-order confirm copy + pending→filled card) follows next.
- **Fixed: display exchange rates corrected to live market (v0.0.4.3).** Founder-caught: the wallet's USDw/EURw exchange showed 1 EURw = 1.089 USDw when the real rate is ~1.143. Root cause was a hardcoded, stale FX matrix in the genesis-2 display layer (nothing wrong with the on-chain oracle, which posts correct rates). All 9 launch-active currencies — USDw, EURw, GBPw, JPYw, CADw, AUDw, CHFw, TRYw, BRLw — now carry current market anchors (EUR 1.1434, GBP 1.3414, CHF 1.2387, TRY 46.8/USD, and BRLw, which previously had no rate row at all, now added). The genesis-3 rewire will replace this whole matrix with the live on-chain oracle rates; this is the interim correctness fix.
- **GENESIS-3 line opens — v0.0.4.1.** The protocol was rebuilt and re-issued on Minima mainnet: a forward-pricing (commit → clear) multi-currency stablecoin bank backed by a single collateral pool in keyless vaults, with a gate-fee Coverage Fund. The whole covenant security model was proven on-chain first (no free mint — every release requires a matured commit + real deposit; two-leg banded rates; FX swaps that never touch collateral; unskippable gate fees), then genesis-3 was executed and verified: all 38 tokens (18 currencies + 18 CF shares + Winiwa + xWiniwa) minted with 100% of supply seeded to covenant addresses no key controls, issuer wallet provably empty. Active currencies at launch: USDw, EURw, GBPw, JPYw, CADw, AUDw, CHFw, TRYw, BRLw (MEXC feed); the rest dormant. App rewiring to the genesis-3 tokens/covenants + the commit→clear UX follows on this line.
- **Fixed: Treasury never flashes a negative/Short state on a fresh node (v0.0.3.94).** Caught rebuilding the test node: before the covenant pools load, the balance sheet reads negative assets (just the accounting offset), which briefly rendered a −19,111 deposit and a Short bar. Coverage, leverage, deposit and the split now wait for real positive assets and show — until then. (v0.0.3.95: also cleared the placeholder 999% and the 73/27 default split that flashed before the sheet loaded.)
- **Changed: Treasury split visual drops the sub-labels (v0.0.3.93).** Removed 'owed to savers' / 'cushion' under the amounts (minimal-information law); the bar keeps the percentage split and the Stablecoins / xWiniwa amounts.
- **Changed: Treasury split visual reworked for clarity (v0.0.3.92).** Founder-caught on the phone: the old bar read as two separate blocks and the ratio was not legible. Now it is ONE seamless bar with the deposit total (the whole) above it, the liability : equity share shown as a big percentage inside each part, and the named amounts as clean labels below — never crammed into a thin slice.
- **Changed: the Treasury balance sheet is now a picture (v0.0.3.91).** Founder direction: present the state, not explain it. The deposited Winiwa (assets) is drawn as one bar split in two — the stablecoin backing (what is owed to savers) and the xWiniwa cushion (equity) — with the coverage ratio as how far the whole reaches past the owed line. Minimal text. The simulator slider now shows the corresponding Winiwa price at each position and re-splits the bar live, so anyone can see the cushion flex first as the price moves.
- **Added: full-history recovery option + honest fast-recovery copy (v0.0.3.91).** Fast recovery (default) restores money only — the copy no longer over-promises history. A new Settings recovery option, Full history, does an archive resync from the Council archive node so past transactions come back too (slower).
- **Fixed: xWiniwa is a default currency again (v0.0.3.90).** Founder-caught on a fresh install: xWiniwa did not appear because its display pill was off by default, so it was never enabled. The pill is now on by default (xWiniwa 3rd, after USDw and Winiwa, per DEFAULT_WALLET_CCY_ORDER), and a one-time migration adds it to installs opened before this and resets the order so it lands 3rd.
- **Changed: recovery-flow copy is banking language (v0.0.3.90).** The Recovering screen, the Replace-confirm, and the safety quiz now say bank (not wallet/node) and money (not coins/funds); Vault key is kept as the app term (only the first-run setup box says seed phrase).
- **Fixed: no scary 'Replace this wallet?' from first-run recovery (v0.0.3.89).** Founder-caught: recovering via the new first-run window still showed 'Replace this wallet? … your funds could be lost forever' + the safety quiz — confusing on a fresh install where the wallet is brand-new and empty. Those gates are for replacing a FUNDED wallet from Settings; the first-run path now goes straight to recovery. Settings recovery keeps the full confirm + quiz.
- **Changed: first-run window wording (v0.0.3.87).** The recover box now says 'seed phrase' (clearer than 'Vault key' for users), and the explanatory line under Create new bank is removed. The subtitle uses 'seed phrase' too (v0.0.3.88) so the window never mixes 'Vault key' and 'seed phrase' for the same thing.
- **Changed: first-run setup is one clear window (v0.0.3.86).** Founder request: on first launch, ask create-new vs recover-existing in a single window — the Vault-key input box is shown FIRST (recover an existing bank) with a Recover button that lights up once a full key is entered, and Create new bank sits below it. Recovering feeds the SAME safety chain as Settings (replace-confirm → 2-question quiz → node replace + rescan); creating keeps the freshly auto-generated bank and goes straight to backing up its key.
- **Changed: the backup reminder names the uninstall risk (v0.0.3.85).** Pre-public-test decision (prominent warning, not forced): the persistent Vault-key card now says plainly that uninstalling the app erases the wallet, so a tester understands the stakes before funding it. The card already stays until the key is backed up; only the wording is stronger.
- **Fixed: a send to your own address no longer false-fails (v0.0.3.84).** Gauntlet-caught: a self-send nets to zero in the wallet diff, so the mirror treated the mined transaction as 'not ours', never adopted the row, and the expiry sweep marked it Failed ('did not confirm') although it confirmed on-chain 21s after posting. The accepted transaction id is now stamped onto the row at send time, and the settle-mined sweep confirms it from chain truth regardless of the diff. (The explorer-txid extractor rejects a freshly-submitted txpowid — no mined leading-zeros yet — so the RAW txpowid is read straight off the response for internal tracking, and any row carrying an accepted id is exempt from the phantom-expiry sweep.) A send is fire-and-forget with no synchronous txid, so a self-send (recipient = your own address) is now settled directly once the node accepts it, with the honest note 'Sent to your own address — the funds stayed in your wallet', rather than false-failing.
- **Fixed: optimistic balance steps seed from what the user SEES (v0.0.3.84).** Gauntlet-caught: an xWiniwa burn seeded the Winiwa optimistic hold from raw WALLET_WINIWA at click time — which node coin churn had momentarily zeroed — so the wallet displayed 9.95 instead of ~895 for two minutes until the stabilizer adopted truth. All four mint/burn flows now base their optimistic steps on the displayed value (active stabilizer hold first, then the balance), for both the step and the failure rollback.
- **Fixed: false 'Payment received' alerts for other users' protocol activity (v0.0.3.84).** Founder-caught on the phone: 'Received 100 Winiwa' matching nothing he did — another wallet's USDw mint had locked 100 Winiwa into the covenant pool, and since every claimer's node TRACKS the pool address, the notifier's 'balance' read counted pool coins as the user's and fired on the delta. The native notifier now sums only the wallet's own coins (covenant/infra addresses from the packaged registry excluded, both alert paths), and the app-layer ownership tests (mirror import + incoming detection) now require checkaddress 'simple' (our own key) instead of 'relevant' (merely tracked) — closing the phantom 'Received xWiniwa' activity rows from other users' mints as well.
- **Fixed: the empty-wallet screen no longer flashes (v0.0.3.84).** Founder-caught on the web preview: the 'Get started with Winiwa' card was hidden and re-shown (30ms later) by EVERY balance repaint, so an empty wallet blinked the card — and the whole layout under it — every few seconds. The sync is now idempotent: it computes the desired state and touches the DOM only when that state changes.
- **Fixed: pour-then-mint no longer fails for a brand-new wallet (v0.0.3.84).** The fresh-wallet gauntlet caught it: a new user who pours and immediately mints got 'Not enough Winiwa' with 1,000 in the wallet — a freshly received coin only becomes spendable at coin depth (~3 blocks). The USDw and xWiniwa flows now WAIT for depth when the wallet's total covers the amount (honest 'still settling' status, up to ~2.5 min) and only fail truthfully ('still settling — try again in a minute') if the wait runs out; the misleading 'claim from the faucet' message is reserved for true shortfalls.
- **Changed: the three platforms are distinct (v0.0.3.83).** Founder pre-ship rule: web is purely web, the APK purely Android, the zip purely MinimaOS. One canonical platform identity (stablesPlatform(): android / minidapp / web — Android bridge flag, MinimaOS hub uid/origin, else web) now gates the platform surfaces: the APK in-app updater is Android-only (already was), the .mds.zip download shows only on MinimaOS, and the pure web surface offers no package downloads at all — it always serves the running build.
- **Changed: balance-sheet unit lines are consistent (v0.0.3.82).** Each part's second measure is its own account unit: assets in Winiwa, liabilities in USDw (always shown), equity in xWiniwa (equity ÷ NAV).
- **Fixed: the balance sheet balances (v0.0.3.81).** Founder-caught: assets did not equal liabilities + equity — the Assets line showed the raw covenant Winiwa pools while Equity uses the protocol's offset-adjusted accounting. All three lines now come from the same accounting (effective assets = E + L, the figure the coverage ratio and leverage already used) through one sheet-derived rate, so the identity holds exactly as displayed. Also removed at founder request: the stables-in-circulation block (redundant with Liabilities) and the Market·24h block.
- **Added: element audit — sections stay, only prose goes (v0.0.3.80).** Founder rule confirmed: every developed section/element remains; stripping applies to explanations only. The two DATA blocks fully removed in the v73 Treasury cleanup return as minimal chain-true versions: 'Stables in circulation' by unit (amount + share bar per unit; grows as more units launch) and 'Market · 24h' (live venue volume + change, dash when the feed has none). Deliberately NOT restored: the holder-concentration estimates (demo-fabricated data — returns when an indexer provides real figures), the sim 'protocol status' word and the sim council-pledge bar. Everything else app-wide was verified intact (the Invest LP graph, all flows).
- **Added: leverage, coverage history and stress test back on the Treasury — minimalist and chain-true (v0.0.3.79).** Leverage headlines beside the coverage ratio (same assets ÷ equity figure as the xWiniwa page). The coverage-ratio history is now REAL: the app records the observed live ratio (one sample per 30 minutes, persisted on the device, ~2 days depth) and draws a slim sparkline — the old hardcoded illustrative series is gone. The stress simulator is one slider and one result line: Winiwa price −30…+30% against the live balance sheet (liabilities stay USD-pegged, assets scale) → coverage, leverage and equity in the wallet primary currency. Verification caught the first stress math using raw pool assets while the protocol's cr uses OFFSET-adjusted effective assets (E_eff + L) — the simulator now stresses the protocol's own accounting and reproduces the live headline exactly at 0%; the leverage figure everywhere (Treasury + xWiniwa page) was corrected to (E_eff + L) / E_eff for the same reason (the v78 T / E_eff form overstated gearing).
- **Added: current leverage ratio on the xWiniwa page (v0.0.3.78).** "Leverage n×" on both mint and burn tabs beside the price — protocol assets ÷ equity from the live chain-true balance sheet (how geared the xWiniwa holders' equity is to the Winiwa price); a dash until the balance sheet is read or when equity is not positive. The mint page refreshes the balance sheet on entry.
- **Changed: coverage ratio leads the Treasury page (v0.0.3.77).** Moved above the Assets/Liabilities/Equity lines — the one health figure first, the statement beneath it.
- **Changed: the balance sheet reads in one currency (v0.0.3.76).** Founder: present all parts clearly in the same currency — the wallet currency — then in their respective account units. Assets, Liabilities and Equity now all headline in the wallet primary currency, with each part's own unit on the subline (assets in Winiwa, liabilities in USDw, equity in Winiwa; the unit line hides when it would repeat the headline). Conversions use live rates only — quiet dash until they land. Stripped in the same pass (founder: the app presents what the decision needs, explanations live with StablesAgent): the 'Balance sheet' section title, the 'Live from the chain' freshness line, the market detail block (Winiwa price / xWiniwa NAV / circulation / explorer link) and both explanatory paragraphs around the reference addresses.
- **Changed: the hero total's index "w" is optically smaller (v0.0.3.75).** The app-wide .68em ratio read too large at the hero's 46px next to the small-size occurrences; the hero span is now .5em.
- **Changed: wallet-row sublines keep the currency name (v0.0.3.75).** Founder: 'I don't get the meaning of sendable' + the name must not disappear on funded rows. The subline now always shows the currency name (as the zero-balance rows do); 'Available x' appears only when part of the balance genuinely cannot be spent yet, and the Minima row appends 'Confirming x' only while a receive matures.
- **Fixed: a mint/burn presents as ONE stable transaction, final form from the first moment (v0.0.3.74).** Founder: the list showed the mechanics — successive Sending / Receiving / Locking legs during a mint, which 'creates confusion and uncertainty'. Three churn sources closed: (1) the two optimistic legs were inserted in two separate upserts (a spend-only render beat showed 'Locking…' alone) — now created atomically in one call; (2) their ids took two separate timestamps that could straddle a second boundary and split the render group — both legs now share one flow timestamp AND an explicit flowId; (3) the render merge now unions flow and transaction keys (a row carrying both bridges them), so the pair, and later the node-mirror row, present as the same single row through the whole flow: receive-primary title (Minting USDw / Minting xWiniwa / Reclaiming Winiwa), +amount, cost as the secondary line, quiet status word until confirmed. The live proof run then caught a FOURTH source at the confirmation step: when a covenant txn imports as two node legs, leg 0 took the unsuffixed NODE-<hash> id — and the legacy-duplicate pruner deletes the unsuffixed row whenever suffixed legs exist, eating the RECEIVE leg (the row flipped to a spend-only 'Locked Winiwa' at confirmation until the repair sweep healed it ~2 min later). Multi-leg imports now suffix every leg id, and adopted node rows inherit the flowId. A FIFTH source closed on the second proof run: a late status upsert re-created the adopted optimistic row as a bare '+0' ghost for ~1 min — upserts are now update-only when the id is missing and the payload carries no amount/currency.
- **Changed: Treasury page rebuilt as one clear balance sheet (v0.0.3.73).** Founder: "difficult to understand — we should have a clear view on the assets, liability and equity." The page is now a single chain-true statement: Assets (Winiwa held by the protocol's covenants, with USD context), Liabilities (stables in circulation with their Winiwa value at the chain rate), Equity (assets minus liabilities — what belongs to xWiniwa holders), the liabilities-vs-equity bar, the coverage ratio, and one market line (Winiwa price, xWiniwa NAV, xWiniwa in circulation, explorer link). The sim instruments — liability-structure pie + history scrub, holder-concentration estimates, ALM stress-test slider, coverage evolution graph — are removed (minimal-information law; depth lives with the agent). Reference addresses and Treasury transactions stay.
- **Fixed: quick pay actually fires (v0.0.3.72).** Founder-caught: scanning a 1 USDw payment QR (under the quick-pay limit) still demanded Confirm send. Reproduced on the emulator via the real scan handler: the payload was valid and the tier classified "quick" — then `stablesTryQuickPayFromQr` crashed on `StablesPaymentSecurity.displayFavCcy()` (API long since renamed to `displayPrimaryCcy`), a silent TypeError inside the deferred call that killed the flow right before the send was scheduled, on every platform. The dead line is removed; a scanned payment QR under the limit now auto-sends with no confirm tap.
- **Fixed: the index "w" shows at the total-balance level too (v0.0.3.71).** The hero total paints its text with a background-clip gradient + transparent fill; backgrounds don't inherit into child spans, so the small "w" was in the DOM but invisible. The span now re-applies the same gradient — the index w renders everywhere, hero included.
- **Changed: Exchange page stripped to the action (v0.0.3.70).** Header prose, the "New conversion" caption, the LP graph and the "Provide liquidity" cross-link removed (LP lives on Invest); the rate line loses "No fees" and the stale hardcoded placeholder. **Tap the rate to read it in the other direction** (1 A = x B ⇄ 1 B = y A); the chosen reading sticks through recalculation. The "Exchange complete" popup is gone — the result is visible in balances and Recent exchanges.
- **Fixed: mined transactions can no longer sit "receiving" forever (v0.0.3.70).** Founder-caught: a USDw mint rendered "undefined · undefined" and stayed amber although its transaction had been mined ~60 blocks earlier (verified on-chain, block 2,194,883). When a flow dies (reload/app closed) its row never got the Confirmed upgrade — and a stuck settling row keeps that token's row and the header total pulsing forever (this was also the phantom xWiniwa flashing during pours). A settle-mined sweep now checks unsettled rows against chain truth at boot and every 2 minutes, upgrades them to Confirmed at their real block, and refills missing display fields.
- **Fixed: xWiniwa mints present like USDw mints — incoming, + in green (v0.0.3.70).** Founder-caught: an xWiniwa mint whose optimistic receive row was superseded kept only its spend leg ("Locking Winiwa" −250, red). A rebuild pass now restores the lost receive leg from the mined transaction itself (covenant output 0 pays the recipient) as a stable RECV row, so the one-row merge leads with "+amount xWiniwa" and the Winiwa cost is the secondary line.
- **Fixed: activity rows can never render "undefined" (v0.0.3.70).** Status-only upserts could create bare rows without date/counterparty/icon; the one-row merge now borrows missing fields from the transaction's other stored legs, with last-resort defaults (date from the row id's timestamp, counterparty from the title, direction icon), and the detail line skips empty parts.
- **Changed: the settling flash is unmistakable and on the right token (v0.0.3.70).** The affected currency row now pulses with an amber glow ring and amount pulse while funds settle, and the header total pulses clearly (deeper opacity swing). The wrong-token flashing was the stuck-row defect above.
- **Fixed: wallet total never paints from the placeholder price (v0.0.3.69).** Founder-caught (third report): the header total swung 1,000 → 830.97 → 1,000.89 because cross-currency rates were seeded at boot from a hardcoded placeholder Winiwa price, corrected only when the live rate landed. Rates are now seeded ONLY from the live spot; until it lands, the header total and every per-row equivalent show a quiet "—" and then appear directly at the correct figure — a value is never shown and then revised. The header total additionally waits for the first live node balance sync (the boot trace showed it painting "0.00" from unloaded quantities for ~4s before the node answered), so it renders exactly once, at the true value.
- **Changed: success-confirmation popups removed (v0.0.3.69).** "USDw set as primary currency", "Payment QR scanned", coverage-fund deposit/withdraw confirmations, the burn confirmation and the demo-address toast are gone — the result of the action is visible on screen. Messages appear only when an action does NOT go through.
- **Fixed: the boot-splash arrow now spins (v0.0.3.69).** The "Connecting your bank to the network…" screen used a stock ProgressBar whose indeterminate animation runs on the system animator clock and can sit frozen (always frozen on the dev emulator, where animator scales are zeroed). Replaced with a refresh-arrow icon rotated by a View animation, which spins regardless of system animation settings — on the phone and the emulator alike.
- **Changed: the stablecoin "w" renders as a small index character (v0.0.3.69).** App-wide text pass: the trailing w in USDw/EURw/GBPw/CADw/CNYw displays at reduced size (index style) everywhere it appears, including re-rendered lists; plain text (and everything code reads) is unchanged.
- **Changed: mints always present as incoming, + in green (v0.0.3.68).** The one-row merge leads with the received token whenever its amount is known; historic receive rows that lost their amounts in old upserts are now repaired at boot with CHAIN-TRUE values read from the mined transaction's own outputs (the covenant guarantees output 0 pays the recipient), so every mint — old or new — renders as "+amount received" with the cost as the secondary line.
- **Fixed: MAX truly exact on the USDw mint (v0.0.3.67).** The v66 fix filled the spend side exactly, but `calcIssue` then mirrored the floored USDw amount BACK into the spend field, rewriting 1,000 as 999.999998 (it would also mangle hand-typed Winiwa amounts). When the spend side is the source of the calculation (MAX, ½, or typing Winiwa), the mirror is suppressed.
- **Fixed: USDw mint MAX fills exactly the available amount (v0.0.3.66).** MAX computed the USDw receive first and back-derived the spend, showing 999.999998 instead of 1,000. It now fills the SPEND side with exactly the available Winiwa and derives the USDw from it (floored 8dp, so the builder-ceiled collateral never exceeds the balance). The ½ button follows the same path.
- **Changed: Counterparty row removed from the mint/burn confirm (v0.0.3.66)** (minimal-information law — the window shows You send / You receive / the action).
- *(carries v0.0.3.65)* **Fixed: the pour button reacts instantly** — the working state engages synchronously on tap instead of after the wallet round-trip.
- **Fixed: the pour button reacts instantly (v0.0.3.65).** The first visible status used to wait for the wallet-address round-trip (~1–3s on the phone), so the tap felt dead. The working state — button disabled with the pour timer and the inline status card — now engages synchronously on tap, before any await; the claim flow then advances it normally.
- **Added: stale-settling sweep (v0.0.3.64).** Founder-caught: an orphaned mint posted from a pre-rebuild session sat "sending" forever (the rescue machinery only inspects recent transactions). On boot, any local row still settling after 2 hours whose transaction is not on-chain is marked Failed with an honest note — an orphaned covenant transaction never spends its inputs, so the funds are untouched and a retry is safe.
- **Changed: no Cancel after the recovery security questions (v0.0.3.63).** The quiz screen keeps a single action — "Recover wallet" — once the questions are answered; the opt-out point is the preceding "Replace this wallet?" screen, and tapping outside the box still dismisses.
- **Fixed: one-row merge v3 — never "+0" (v0.0.3.62).** Historic optimistic receive legs lost their amount in old upserts, so the v61 merge rendered "+0" primaries. When the receive side has no displayable amount, the row now falls back to the spend leg alone — still exactly one row per transaction; new transactions carry their amounts normally.
- **Fixed: one-row merge v2 (v0.0.3.61).** The v60 pairing keyed on fields the optimistic legs do not carry (dir/minimaOnChain) and missed that a covenant transaction can be stored as THREE rows (two optimistic legs + the mirror import). The merge now groups everything sharing a transaction id, derives direction from title/amount when absent, picks the best-informed receive row as primary, and dedupes the doubled spend legs into one secondary line.
- **Changed: one transaction, one row (v0.0.3.60).** A covenant mint/burn keeps its two stored legs (the per-currency balance machinery needs them) but renders as a SINGLE transaction: the receive side is the row, the spend amount appears as a secondary line beneath it, and the pair carries the less-settled status. Applies to the wallet Recent activity and the Activity page.
- **Changed: the faucet pours directly from the button (v0.0.3.59).** The confirmation window (recipient + pool addresses + covenant sentence) is retired — "Get 1,000 Winiwa" claims immediately after the cooldown and faucet-level checks; amount and next-claim time already live on the page.
- **Changed: the Treasury page is the single home for every on-chain reference (v0.0.3.59).** Added the three token ids (Winiwa, USDw, xWiniwa) to the existing block (covenants, faucet pool, issuer, oracle key) — full values, explorer-linked. Action pages carry none.
- **Fixed: privacy blur covers everything (v0.0.3.59).** The eye toggle tagged elements once, so untagged values (header total, Sendable sublines) and re-rendered rows (the xWiniwa amount, transaction lists) stayed readable. Blur is now body-scoped CSS by selector — every value on the wallet page including Recent activity and the Activity list blurs, re-renders included — and the preference persists across refresh and restart.
- **Fixed: pour showed 2,000 while sendable was 1,000 (v0.0.3.58).** The wallet row's figure was the stabilized balance PLUS a separate row-status-driven "incoming overlay" — a second display layer that stacked pending amounts on the number (and could double-count against the optimistic hold). The row now shows the one stabilized figure that the traces prove moves once per transaction; the overlay only drives the settling glow. The mint-page "Available" labels align to the same spendable figure.
- **Fixed: currency order changed by itself (v0.0.3.58).** The wallet list's boot restore fell back to the SETTINGS pills drag order — a different sequence that moved xWiniwa around — and those polluted orders persisted. The fallback is removed, a one-time migration resets any saved order to the locked default (USDw, Winiwa, xWiniwa, EURw, GBPw, CADw, CNYw — the founder's chosen sequence), and only an explicit drag in edit mode reorders.
- **Fixed: MAX filled more than the available balance (v0.0.3.57).** Founder-caught on the phone: the "Available:" labels show the stabilized balance, but the MAX buttons read legacy mirror variables (`WALLET_WINIWA`/`WALLET_XWM`) that optimistic handlers bump ahead of it — and the USDw mint MAX converted at the spot mid instead of the covenant's live mint rate, quoting more USDw than the collateral affords. All mint/burn MAX buttons now read exactly the label's stabilized spendable figure, and USDw MAX divides by the live chain mint rate (floored to 8dp).
- **Changed: no price-source attribution on the mint pages (v0.0.3.56).** The Winiwa price rows show the plain figure — "(MEXC)" and the "on-chain oracle rate" wording removed from the xWiniwa panel and the USDw Rate line (minimal-information law; provenance lives with the agent and the Treasury page, which keeps its labeled source).
- **Added: xWiniwa price on the Mint page, in the wallet's chosen currency (v0.0.3.55).** Founder request: both tabs show the live on-chain NAV rate (mint rate on Mint, burn rate on Burn) valued in the wallet's price-display currency ('auto' = the primary currency; 'MINIMA/Winiwa' shows the raw Winiwa rate). Values are tiny near the 0.01 Winiwa floor, so formatting uses significant digits. Replaces the stale hardcoded "1 Winiwa" placeholder that the minimal-strip removed in v46.
- **Fixed: pour "completed" in 3 seconds with no transaction id (v0.0.3.54).** Founder-caught on the phone: the pour-completion matcher falls back to shape-matching recent history (faucet covenant → your wallet) — and on a wallet that has claimed before, an OLD claim matches instantly, so the pour looked complete before the real transaction could even post. The chain was fine (the claim mined normally); the display lied. All three completion matchers (faucet, USDw mint/burn, xWiniwa mint/burn — the mint ones match exact repeated amounts, same landmine) now accept only transactions no older than the flow that is looking for them (60s clock skew allowed). Completion now shows at true mining time (~one block) with the real transaction id.
- **Fixed: the LAST hold-killers — five success-path clears removed (v0.0.3.53).** The v52 trace still dipped: the event log again showed the hold dying eventlessly. A full audit of `stablesClearOptimisticBalance` callers found five SUCCESS-path clears, each firing exactly when `sendable` still lags: the on-confirmation covenant refresh, the NEWBALANCE handler, a nine-shot post-send timer (0.3s–36s — a guaranteed mid-flight kill after every send), and two row-confirmed settlement paths. Design rule now enforced: **only failure handlers clear a hold** (revert to raw truth); every success path leaves release to the stabilizer's convergence / time-stability / settlement-lag rules. The forced refreshes stay — they accelerate convergence, which releases the hold the correct way.
- **Fixed: ROOT CAUSE of the balance swings (v0.0.3.52).** The v50 attributed trace ended the hunt: the explicit hold vanished with NO release event — it was being destroyed by the incoming-detection path, which cleared holds whenever a currency's total/unconfirmed rose ("the node now reflects the funds"). Mid-mint, the unconfirmed change coin raises the total while SENDABLE (the displayed figure) is still deep in the churn dip — so the hold died at the worst moment and the dip reached the screen; the auto-freeze then froze the dip. Holds are no longer cleared there; they release only via the stabilizer's convergence/stability/lag rules (which the traces show working). This was also why v44–v49's release-rule fixes never fully cured it.
- **Changed: minimalist sweep wave 2 (v0.0.3.51).** Invest Coverage-fund tab (duplicate title, "see My investment…" navigational prose), Liquidity funds tab (duplicate title), Treasury (accounting-methodology paragraph → agent; explorer link kept), Settings backup section (the two "what's covered" enumeration cards and the Replace/Combine walkthrough → agent; the import flow itself asks Replace-or-Combine; the "separate from my Vault key" safety line stays).
- **Added: stabilizer event log (v0.0.3.50).** The v49 trace still showed one incoming-side dip despite the direction guard, meaning a release path fired that inference hadn't identified. Every hold create/release now records its rule, node value and held value into a capped in-page ring buffer (`__BAL_RELEASES__`), so the verification trace attributes any swing to the exact line responsible.
- **Fixed: balance stabilizer v5 — the lag guard is direction-based (v0.0.3.49).** The v48 trace still dipped once on the incoming leg: the guard matched the deficit against summed row amounts, but some rows (the xW mint receive leg) store no `amt`, so the sum was 0 and the release passed. The guard now reasons by direction: node missing money + a row settled INCOMING in the last 10 minutes = lag, hold; node showing excess + recent OUTGOING = lag, hold; anything else stable for 150s is adopted. Winiwa (spent side) has traced perfectly flat since v47.
- **Changed: minimalist sweep — Faucet + Invest (v0.0.3.49).** Faucet: duplicate no-value explainer and "Claim Winiwa" label removed; the "Test tokens" reference card removed entirely (it also carried stale genesis-1 ids — live references belong to the Treasury page and the agent). Invest "My investment": duplicate title and instructional paragraphs removed; the principal currency moved into the "≈ Value" column header.
- **Fixed: balance stabilizer v4 — settlement-lag guard (v0.0.3.48).** The v47 trace was one dip from perfect: the spent side held a single steady value through the whole mint, but the incoming leg dipped once — before an incoming coin lands, the raw node value is perfectly stable, so time-stability alone cannot distinguish "settled truth" from "not arrived yet". Now a stable value whose deficit from the held value equals the net of rows settled in the last 10 minutes is treated as node lag and held through; anything else stable for 150s is adopted as truth.
- **Changed: currency dropdown badge reads "Soon" everywhere (v0.0.3.48)** (was "Later" in mint/burn mode).
- **Fixed: balance stabilizer v3 — stability is time-based, not poll-based (v0.0.3.47).** The v45 trace still showed one release into churn: the brisk poll ticks ~3× within one ~50s block, so a 3-poll "stable" streak adopted a value whose change coin was still unconfirmed (2,322 → 1,372 after the row turned green). A node value now counts as truth only when reported unchanged for ≥150s (two block times) with nothing settling — churn moves every block; real balances don't.
- **Changed: Mint page stripped to decision-essentials (v0.0.3.46).** Per the minimal-information law (as little on screen as possible; depth lives with the agent): removed the "Mint & burn xWiniwa"/"Mint & burn USDw" section labels (the page header already says it), the "xWiniwa price" rows on both mint and burn, the "xWiniwa NAV (oracle-signed, on-chain)" line, and every oracle-attribution line (⚖️ links included) on both panels. Kept, per earlier founder direction: available balance + amount + ½/MAX, the Winiwa market price row, the received amount, the reserve level, the leverage chart, and the floor-price sentence with the live-Treasury link.
- **Fixed: balance stabilizer v2 — releases only into truth (v0.0.3.45).** The v44 sampler trace showed clean per-transaction steps but stopwatch releases into raw churn (2,422 → 1,422 → 422 mid-mint). Two root causes: in-flight detection read `window.USER_ACTIVITY`, which is undefined in the bootstrap's scope on the APK — silently disabling ALL settlement awareness, so every hold died on the flat 3-minute idle expiry; and releases didn't require convergence. Now: rows come from the real activity sources (`stablesGetUserActivityRows` / stored rows), and a hold ends ONLY when the node converges to the held value, OR nothing is settling and the node reports the same value on 3 consecutive polls (external change = stable truth), OR the 20-minute hard cap. No stopwatch ever releases into a transient.
- **Fixed: balances no longer swing during pour/mint/burn/send (v0.0.3.44).** Reported: "the currencies balance and total balance go in all directions — at moments just one leg of the transaction is considered." Two gaps in the balance stabilizer: (1) holds existed only when a submit hook set one, so incoming pours/transfers (and any dropped hold) exposed the raw UTXO churn — spent inputs vanish, change sits unconfirmed, legs land at different blocks; now ANY currency with a settling row is auto-frozen at its on-screen value, so the balance moves once per transaction and stays put. (2) When the last row confirmed, the hold released into whatever the node momentarily reported — dipping at the exact moment the row turned green; release now requires the node to have converged to the held value (or a 90s settlement grace). The total header derives from the same stabilized values.
- **Fixed: the large dead area under the last element of every page (v0.0.3.43).** The global `.scroll-area` reserved nav + 80px under all pages, stacking with page padding into ~250px of emptiness after the wallet's last transaction. Nav clearance is now a single tight source (nav + 16px) app-wide; the wallet page's own bottom padding returned to 16px.
- **Added: fresh-install covenant coin bootstrap (v0.0.3.42).** A newly-installed bank cannot see covenant reserve/pool coins created before its initial chain download (coin relevance) — caught by the gauntlet: a fresh wallet's xWiniwa mint failed "reserve is empty" while 899.8M sat on-chain; every new user would have hit this. The oracle service now publishes coinexport proofs of the current covenant coins (refreshed every tick, served at agent.stablescouncil.org/covenant-proofs), and when a covenant query comes up empty the app imports them (node-verified against the chain MMR — public data, not a trust point) and retries. Wired into the USDw builder, xWiniwa builder and faucet claim.
- **Fixed: orphaned mint/burn no longer sits "Sending" forever (v0.0.3.42).** The retry wrapper treated the post-time transaction id as proof of mining, so a mint orphaned by a competing state-coin spend (oracle tick or another minter) was declared done and stuck. The wrapper now verifies real settlement — the arrival of the user's output coin on-chain (a txpow lookup on the posting node is NOT a mined signal) — watching up to 8 minutes per attempt, automatically rebuilding against the fresh state coin when a competitor takes it (with an honest "rebuilding yours automatically" notice), and flagging the final result orphaned if all attempts fail.
- **Changed: protocol counterparty labels unified (v0.0.3.42).** Remaining stale row labels from the legacy issuer/pool model ("Issuer (test)", "Issuer / pool (test burn)", "xWiniwa covenant", "Covenant reserve") now read Protocol (USDw) / Protocol (xWiniwa). No legacy transaction path existed — the labels were the last remnant.
- **Changed: wallet page ends at the last transaction (v0.0.3.41).** The bottom "View all activity ▸" button is removed (superseded by the quiet "View all" in the section title row), and the large empty space after the rows is gone — it was nav-bar clearance padded INSIDE the list; the clearance now sits on the page container, sized to just clear the fixed bottom nav.
- **Added: "View all" link on the wallet page's Recent activity section (v0.0.3.40).** A quiet sentence-case text link in the section title row, right-aligned in the existing actions slot, opening the Activity page. No box, no button chrome — consistent with the minimalist surface law.
- **Fixed: the adb clean-shutdown hook now quits the node, not the service (v0.0.3.39).** Verified live that the v0.0.3.38 receiver fired but nothing shut down: the app UI keeps MinimaService bound, and Android defers `stopService()` on a bound service indefinitely. The receiver now runs the node's own `quit` (full save, "Shut down completed OK" logged) — same clean path as the in-app console. `dev-up.ps1` hardened to match: adb calls target the emulator serial explicitly (no more "more than one device" with the phone attached), and installs are gated on the confirmed clean shutdown — it refuses to install over a live node.
- **Fixed: CRITICAL — the native bridge alias was undefined on the real APK (v0.0.3.38).** `window.StablesNative` (the alias all native-feature calls go through) was defined inside the localhost-only preview script, whose early exit on the APK's `appassets` host meant it never existed exactly where the native bridge lives. Every `window.StablesNative &&…` guard silently no-opped on the phone: the background toggle never persisted (founder: "keep my bank running comes back automatically"), and the payment-readiness gate, in-app updater bridge and launcher personalization were silently dead. The alias now installs unconditionally at the top of the page, before any surface detection. Found by driving the real APK: `stablesSetBackground(false)` left the pref `true`; after the fix the wrapper writes persist.
- **Fixed: "Keep my bank running in the background" OFF now actually stops the bank (v0.0.3.38).** The switch saved a preference that (via the alias bug above) was never written from the real app, so the node always kept running and the switch snapped back ON. The service-side honor logic (stop the node cleanly on app close when OFF) already existed and now receives a real preference.
- **Added: adb-triggerable clean node shutdown (v0.0.3.38, dev/ops).** `am startservice … -a org.stablescouncil.stables.action.CLEAN_SHUTDOWN` asks the service to save and exit properly. Exists so an APK update never again has to kill the node process mid-write — that corrupted two emulator chain databases on 2026-07-06.
- **Fixed: wallet recovery no longer false-fails with "RPC command timed out after 45 seconds" (v0.0.3.37).** Recovery runs `megammrsync` — restore the Vault key, regenerate 64 one-time-sig keys (CPU-heavy on a phone), resync the chain — which legitimately takes minutes, while the RPC transport aborted every command at a blanket 45s. The node kept recovering after the abort, so the user saw a failure while recovery was actually succeeding. Long-running commands (megammrsync, restore, backup, archive, resync, seedrestore, vault) now get a 15-minute transport window; and if a timeout still occurs during recovery, the progress modal stays up with "Recovery is still running on your bank…" instead of a false error (on the standalone app the node restarts and the app relaunches itself on completion).
- **Fixed: status stuck on "Updating" when fully synced, on devices whose clock runs behind the network (v0.0.3.36).** Caught live at the end of the emulator's fresh sync: the node held the newest block, but that block's timestamp was ~15s ahead of the device clock, and `stablesNodeIsSynced()` required `age >= 0` — so a "future" tip (ordinary clock skew between the device and the block's miner) read as not-synced and the pill stayed amber forever. The freshness window now tolerates skew in both directions (±5 min).
- **Fixed: tapping the top-bar status dot lands on Network, not Node (v0.0.3.35).** The tap did navigate + scroll to the Network section, but the App-updates section above finishes its version-check layout after that first scroll and shifts the page, leaving the viewport on Node. The scroll now re-anchors once layout is stable, and the section carries a header-aware scroll margin so it sits below the fixed top bar.
- **Changed: minimalist surface law — no section-level boxes anywhere (v0.0.3.34).** Founder: the app had drifted back to every section wrapped in a rounded box-on-box ("we have the background of the app and then as much as possible we should have the elements, without any extra layers"). One global rule now strips box chrome (background, border, radius, blur, shadow) and side padding from every `.app-section-card` (77 sections), with `!important` so it also beats the ~60 legacy inline styles; sections are title + full-width content, separated by spacing. The Invest page's inner grouping boxes (Deposit or withdraw, Coverage fund summary, charts, composition — the design the founder called out) and the Treasury Assets/Liabilities tiles are flattened too. Interactive elements (inputs, buttons, rows, dropdowns) keep their styling.
- **Removed: "Check connection" button on Settings → Network (v0.0.3.34).** The status above it is live (refreshed on every node poll), so the button only re-ran what already runs; the error-state copy no longer references it ("It keeps retrying automatically.").
- **Fixed: the background-service notification speaks banking language and tracks the real state (v0.0.3.33).** Reported: the app said `Updating` while the phone-level notification still said `Connecting to the network…` ("but we are updating"). The foreground notification (the one proving the bank runs in the background) had its own hardcoded text that only changed to `Connected` after a new block. It now mirrors the in-app Network states: `Updating — your bank is catching up…` while behind, `Up to date` once the latest block is fresh (same 5-minute freshness rule the app uses), refreshed on every block.
- **Fixed: the header status chip no longer says "Connecting" when the bank is merely catching up (v0.0.3.32).** Reported after v0.0.3.31: "I still see connecting." The sliding chip next to the status dot had its own labels — amber flashed `Connecting` (which reads as "the bank is not running in the background", false) and green flashed `Connected`. It now uses the Network page's banking states: amber = `Updating`, green = `Up to date`. The amber itself was honest — the emulator's embedded node was at block 0 rebuilding its chain after the reinstall (its lone peer attempt was failing; peers re-seeded).
- **Fixed: reopening the app no longer shows "Connecting your bank" when the bank never stopped (v0.0.3.31).** Reported: "why is the app showing connecting every time I open it, isn't it running in the background?" It IS running (the background service keeps the node alive — that's why notifications arrive with the app closed); the launch flow just didn't say so. Every icon tap routed through the boot splash ("Connecting your bank to the network…") even when the node was already up, and after a long background freeze the Network pill sat amber until the next scheduled poll (~20s). Two fixes: the launcher now goes straight to the Stables screen when the background node is already running (splash only plays on a genuine cold boot), and a native resume hook forces an immediate status+balance verification the moment the screen comes back, so the pill shows the true state within one round-trip.
- **Changed: Network status speaks banking language (v0.0.3.30).** Per the locked terminology rule (no blockchain vocabulary anywhere in the app except "block height"), the Network stage strings are rewritten: `Synced / Your node is connected and fully synced with the chain` → `Up to date / Your bank is online and up to date with the network`; `Syncing / …catching up with the chain…` → `Updating / Your bank is catching up with the network. Transactions settle once it is up to date`; offline/error/connecting details drop "node" for "bank".
- **Fixed: a notified payment now appears in the list the moment the app opens (v0.0.3.30).** Reported: "I get notifications at the phone level of transactions I don't find in the app." The phone notification comes from the native background service (~15s, app closed); the in-app list is filled by the mirror, whose history import was staggered to 20s after launch (the ANR fix), so opening the app straight from a notification showed no matching row for up to half a minute. The mirror now immediately imports from the 20 history entries it already fetched at arm (no extra node call — zero-difference entries skip instantly), keeping the heavy 250-entry sweep on its 20s stagger.
- **Changed: mint-leg naming is parallel across tokens (v0.0.3.29).** `Locking Winiwa for USDw` (was `Locking Winiwa collateral`, counterparty now `Protocol (USDw)` instead of `Covenant collateral`), matching `Locking Winiwa for xWiniwa`; mirror import labels aligned: `Locked Winiwa for USDw`, `Reclaimed Winiwa from USDw` / `from xWiniwa`.
- **Changed: imported covenant transactions carry protocol labels (v0.0.3.28).** The founder spotted a USDw mint whose collateral leg displayed as generic `Sent Winiwa · On-chain recipient`. The mirror already resolves which covenant a transaction touches (for direction correctness); it now also uses that to title imported rows: `Locked Winiwa collateral (USDw mint)` / `Minted USDw` / `Burned USDw` / `Reclaimed Winiwa (USDw burn)` with counterparty `Protocol (USDw)` — and the xWiniwa/faucet equivalents. App-originated rows keep their own titles via adoption; this covers history imports and settled-while-closed transactions. Existing stored rows keep their old titles; new imports are labeled.
- **Fixed: in-flight balance hold no longer expires on a stopwatch (v0.0.3.27).** The optimistic balance hold had a flat 3-minute expiry, so on a slow confirmation the display reverted to the stale pre-debit node value while the transaction was still `sending` (reported: full Winiwa shown with 2,031.60 locked in flight). The hold now persists while any row for that token is still settling, with a 20-minute hard safety cap; the 3-minute expiry only applies when nothing is in flight.
- **Removed: informative status-confirmation popups (v0.0.3.26).** `Connected to your node` (the node-status dot + live balances already convey it) and `New Minima receive address generated` (the address and QR update on screen). Consistent with the popup policy — popups are for security and on-chain events, not self-evident confirmations. Error and actionable-guidance toasts are kept.
- **Removed: `Address scanned` toast after a QR scan in Send (v0.0.3.25).** The scanned address fills the field visibly, so the popup was redundant (popup policy: reserved for security / on-chain events). A payment QR that also captures an amount keeps a brief `Payment QR scanned` toast.
- **Added: app-side orphan retry for mint/burn (v0.0.3.24).** The USDw and xWiniwa covenants each spend a single state coin, so a competing transaction (an oracle rate-update or another minter) can orphan an in-flight mint/burn — its input is spent and it never confirms. Instead of failing, the builder now returns the state-coin id it used, and a retry wrapper checks after posting: if the transaction didn't mine AND that state coin was taken by someone else, it rebuilds against the FRESH state coin and reposts (up to 3 attempts, 1.5s apart). The orphan check gates the retry precisely, so a merely-slow transaction is never double-posted (no double-spend: if the first txn is genuinely orphaned its collateral coins are freed for the rebuild). This is the robustness answer to the single-state-coin serialization; sharding remains a future production-scale option.
- **Fixed: wallet display settings are refresh-proof (v0.0.3.24).** The default currency order is now locked into storage on first load, so a refresh always reads the same explicit order rather than re-deriving it from the DOM. Combined with the v0.0.3.22 enabled-selection persistence, both the currency order and which currencies are shown now survive every refresh. (Note: a device still on a pre-v0.0.3.22 build lacks the enabled-persistence fix — update to see it.)
- **Fixed: xWiniwa/USDw mint failed with a signing timeout on slow embedded nodes (v0.0.3.23).** Reported: the mint ran for minutes then failed "timed out while signing the xWiniwa covenant transaction." The covenant spend includes the ~900,000,000 reserve coin, and generating its signature + MMR proof is CPU-heavy on a phone/emulator embedded node — over the old 60s sign timeout (a desktop node finishes in seconds, which is why the web preview succeeded). Raised the covenant-step timeouts on BOTH builders: sign 60s→180s, build 45s→90s, basics 30s→120s, check 45s→90s, post 70s→120s. They resolve the instant the step completes, so fast nodes are unaffected.
- **Fixed: outgoing debit now shows immediately (v0.0.3.23).** On a mint the +credit appeared instantly (settling overlay) but the −collateral debit lagged until the node registered the spend ("the +xWiniwa is in the total but not the −Winiwa"). `stablesSetOptimisticBalance` now also patches the displayed balance detail, so both sides move on submit; the node refresh reconciles back to truth on convergence.
- **Added: ½ button beside MAX (v0.0.3.23).** A "½" quick-fill now sits next to MAX on the balance-spending fields — mint xWiniwa, burn xWiniwa, mint USDw, burn USDw, send, and exchange — reusing each field's MAX logic and halving the result (floored to 8dp).
- **Fixed: CRITICAL — mint/burn covenant remainder lost precision, failing transactions (v0.0.3.22).** The xWiniwa mint failed on-chain (`txncheck basic=false scripts=false`). Root cause: `covleft = covenant_reserve − amount` was a JavaScript float subtraction, and with a large reserve (≈900,000,000 xWiniwa) minus a fractional release (89.49500634) the result needs 17 significant figures — beyond float64's ~15–16 — so the last decimal was wrong (899,999,799.5049937 instead of …49366). That broke token conservation (basic=false) and the covenant's `covleft EQ (@AMOUNT − amt)` assert (scripts=false). It only surfaced after v0.0.3.15 made the mint amount fractional; whole-number amounts happened to divide cleanly. Fix: `covleft` and user change are now computed with exact BigInt string math (`subTokenAmountStr`, 8-decimal scale) on BOTH the xWiniwa and USDw builders, using the reserve coin's amount as a string so it never passes through a lossy Number().
- **Fixed: oracle no longer orphans in-flight user mint/burns (v0.0.3.22).** The live oracle posted a rate update to each covenant's single state coin on nearly every 5-min tick; a user mint/burn must spend that same coin, so an oracle post mid-transaction orphaned the user's input (it sat pending to the 10-min expiry → failed). The oracle is now calmed: 20-minute interval, 1.5% rate / 2% sheet threshold (was 0.25%), and a contention guard that skips a tick if the covenant state coin is unconfirmed or already spent (a user transaction is in flight).
- **Fixed: in-flight balance no longer reverts to the pre-transaction value (v0.0.3.21).** Reported on an xWiniwa mint: the balance jumped to +6,494 xWiniwa on submit, then fell back to 0.00 while the row still read "receiving". Root cause in `stablesReconcileOptimistic`: the optimistic hold was released the instant it found ANY Confirmed row for that token — and a wallet with earlier confirmed mints/claims always has one, so the next balance poll dropped the hold and showed the still-zero node value. Fix: the hold is released on a confirmed row ONLY when nothing for that token is still settling (no pending/receiving/on-chain row in flight); an in-flight transaction keeps its optimistic balance until the node converges. Applies to all tokens (Winiwa/USDw/xWiniwa).
- **Changed: default wallet currency order locked (v0.0.3.21).** Fresh installs (no saved order) now get USDw, Winiwa, xWiniwa, EURw, GBPw, CADw, CNYw via an explicit `DEFAULT_WALLET_CCY_ORDER`, instead of relying on implicit DOM order (which interleaved default-hidden currencies). Users who have dragged their own order keep it.
- **Changed: Mint tab icon shows the physical act of minting (v0.0.3.20).** The bank emoji is replaced with a flat emoji-style inline SVG of a coin press: steel die descending onto a gold coin (Stables amber) on an anvil, with impact sparks — matching the founder's coin-striking reference and the v0.0.3.19 Wallet bifold treatment.
- **Changed: Wallet tab icon is a leather bifold wallet (v0.0.3.19).** The bottom-nav money-bag emoji is replaced with a flat, emoji-styled inline SVG bifold: brown leather body and flap, stitched edging, gold snap clasp, and a cyan card peeking from the fold (ties into the app accent). Unicode has no wallet emoji, so the SVG is drawn to sit visually alongside the emoji tabs and sizes off the same `.nicon` font metric.
- **Fixed: "Open the Connect panel" advisory suppressed on the standalone APK (v0.0.3.18).** The 9s node-command watchdog popped "Session opened, but node commands are not returning. Open the Connect panel to link your own Minima node." on the APK — where the node is EMBEDDED and no Connect surface exists, so it instructed an impossible action. On the APK the condition now logs quietly (the embedded node is simply still starting/syncing; balances load when it's ready); web/MiniDapp surfaces keep the advisory.
- **Fixed: Mint xWiniwa button did nothing (v0.0.3.17).** The v0.0.3.15 quote unification used `floor8`/`ceil8`, which are LOCAL to the covenant-builder function — the mint/burn hooks threw a ReferenceError before opening the confirm modal, and because the page delegations didn't catch async rejections the button failed silently. Fixes: module-scope `rate8Floor`/`rate8Ceil` helpers; and a **never-silent rule** on all four mint/burn entry points (USDw + xWiniwa, mint + burn) — any startup error now shows an amber "could not start: <reason>" message instead of dying as an unhandled rejection.
- **Fixed: balance no longer dips back after a claim confirms (v0.0.3.16).** During settling the overlay showed the incoming amount; at "confirmed" (3 confs) the overlay dropped — but the node only moves the coin into `sendable` at coin depth, one beat later, so the displayed total fell back to the pre-transaction value (node truth was 4,000 while the app showed 3,000). The incoming settling overlay is now held ONE block past the confirm target and the ladder keeps tracking until that release is written, so the display hands over seamlessly from overlay to sendable. Also: button-less informative boxes (Stables Charter notice, Minima explorer notice) now close on a tap ANYWHERE — inside or outside the box — and the "Tap anywhere outside to close" hint sentence is removed (pattern for all no-button info boxes).
- **Fixed: one xWiniwa quote everywhere — the confirm modal no longer disagrees with the page (v0.0.3.15).** The founder caught the confirm-mint modal showing a different quantity than the page quote. Root cause: THREE semantics for the same input — the page quoted `winiwa ÷ ratemint`, the modal claimed 1:1, and the covenant builder treated the input as xWiniwa-OUT (locking `input × ratemint` Winiwa). At any non-par NAV all three differed. Fix: the input field is defined as the WINIWA you contribute; the execute hook now reads the live state-coin rates and computes the exact covenant terms once — `xwmOut = floor8(winiwaIn / ratemint)`, `collateral = ceil8(xwmOut × ratemint)` — and the page quote, confirm modal, optimistic activity rows, optimistic balances and the on-chain build all use those same numbers. Burn side same treatment (`winiwaOut = floor8(xwmIn × rateburn)` shown in the modal and rows, was 1:1). Also: new "Winiwa price" (MEXC) row on the Mint → xWiniwa panel; floor-price copy now reads "A mint floor price of 0.01 Winiwa applies while there is no market for xWiniwa" (equity sentence removed, Treasury link kept); stale "(Test11)" network label removed from the confirm modals.
- **Fixed: one pour, one row — duplicate presentation and "undefined" ghost rows removed (v0.0.3.14).** From the founder's on-device report:
  - The synthetic amber "Faucet claim confirmed / tracking" banner (injected above the transaction lists by `renderWalletSettlementBanner`) duplicated the pour's real activity row and could contradict it (banner "confirmed" while the honest row was still "receiving"). Retired — the activity row is the single pour presentation.
  - "undefined / undefined / +0" ghost rows: status-only ladder updates (`{id, status, …}`) for a row that no longer exists (deleted/migrated/adopted) fell through `stablesMirrorUpsertRow`'s insert path and created skeleton rows. Update-only calls now never create rows, and a hygiene pass purges any persisted ghosts on devices that hit the bug.
- **Fixed: APK launch ANR ("Stables isn't responding") (v0.0.3.13).** The v0.0.3.11 deep history import (widened to 250 entries to survive oracle-update noise) ran AT mirror arm — the embedded node's busiest boot window — starving the node bridge and freezing the UI thread on launch. The first deep pass is now staggered to 20s after arm (retries at 90s and 5min unchanged). Also: first build installed to the physical phone since the 0.0.3 line opened.
- **Fixed: honest transaction rows — real on-chain time, no false confirmations, no faucet bounce (v0.0.3.12).** Root-caused from the founder's live report (a pour row showing "Confirmed 15:22" whose txid was actually a 10:27 on-chain claim, while his real pour was still in the mempool):
  - **Real on-chain time everywhere.** Mirror rows now stamp the txpow header's `timemilli` as the row's date and `ts` (was the import/recovery time — a row imported at 15:14 for a 13:27 transaction displayed 15:14).
  - **No more identity theft between transactions.** Twin-heal/adoption/rescue matching now anchors on the transaction's CHAIN time with a tight 30-minute window (was: any lookalike within 48 hours of "now"). Previously a fresh pour could adopt a five-hour-old claim's txid and instantly show "Confirmed" while the actual pour was unconfirmed — the exact "confirmed +1,000 but balance unchanged" trust breaker. Now a pending pour honestly shows Pouring/Receiving until ITS OWN txpow confirms.
  - **Post-pour bounce fixed.** `focusFaucetPourStatusInline` navigated the user BACK to the faucet page (to show a floating status card), defeating the v0.0.3.6 go-to-wallet flow (reproduced: faucet → wallet at +8s → faucet at +9s). It no longer navigates; pour feedback is the wallet balance + Activity row.
  - **Activity storage g2 → g3**: pre-fix rows (wrong times, possibly wrong adopted txids) are abandoned; the list re-imports from node history with correct chain times.
  - VPS oracle node: restarted with `-p2pnodes megammr.minima.global:9001` (fresh node found no peers without a bootstrap).
- **Fixed: web preview showed balances but NO transactions — the tx mirror never armed on the RPC surface (v0.0.3.11).** Reproduced headlessly on the exact web-preview stack (fresh Chrome profile → connect RPC → balances load, zero activity rows, zero `[TxMirror]` logs). Root cause: `tx-mirror.js` `runCmd` tried `MDS.cmd` FIRST, and on the web/core-node surface an MDS shim object exists but dead-ends (no MiniDapp host), so every `history` call died silently — while balance code (RPC-first) worked, which is exactly the assets-without-transactions split. Fix: RPC-first transport everywhere a Connect-node RPC is configured, MDS otherwise (APK/zip unchanged): `tx-mirror.js` `runCmd`, the bootstrap balance-sheet hook (now uses `mdsCmdAsync`), and both covenant-rate refreshers (new shared `stablesAnyNodeCmd`). Also: with CoinGecko removed, a browser that cannot reach MEXC (CORS) was stuck on the default $0.00846 price — the USD spot now falls back to the **oracle-signed MEXC price published in the covenant state coin (port 54)**, so the price context is chain-truth on every surface.
- **Changed: Treasury polish + honesty pass (v0.0.3.10).** Per Charles's review of the live Treasury page:
  - **Menu order:** Treasury is now the first item in Community; My transactions is first in My Assets.
  - **Snapshot card simplified:** the balance-sheet detail block shows only what the headline cells do not (xWiniwa NAV, xWiniwa in circulation, liabilities in Winiwa, MEXC price) — no number appears twice; the always-"unavailable" per-wallet "Live minting collateral" box is removed from the page.
  - **The stress simulator is real:** when the live balance sheet is loaded, the ALM/stress protocol state is seeded from it (effective assets = E_eff + L in Winiwa; liabilities = external USDw), so the slider stresses the actual protocol (at CR 107%, implied leverage ~15x) instead of demo constants.
  - **Treasury transactions are real:** the four fabricated demo rows are retired; the list starts EMPTY with an honest empty state, and going forward is fed from on-chain movements at the protocol reference addresses using the same row shape as My transactions (NODE-row format), with council notes attached on top.
  - **Mx address convention (locked 2026-07-05):** addresses are always presented in their full Mx form (0x only for the oracle public key, which has no Mx form); nothing is truncated ("a truncated identifier carries no information"); explorer links go through the search endpoint so both forms resolve; new "Visualise the treasury on the explorer" link on the balance-sheet block pointing at the USDw covenant pool.
  - **Label cleanups:** "Simply ALM + stress test" → "ALM + stress test"; "Winiwa holders (chain-wide slice, demo)" → "Winiwa holders (chain-wide slice)".
  - Also: oracle service files staged on the VPS (`~/stables-oracle/`); migration runbook at `task_test_channel/ORACLE_VPS_RUNBOOK.md` (blocked only on the founder's seed ceremony).
- **Changed: one price, chain truth — quotes come from the covenant, the Treasury page goes live, CoinGecko is gone (v0.0.3.9).** The full V3 wiring pass (per `task_test_channel/IMPLEMENTATION_PLAN_V3_END_TO_END.md`):
  - **USDw quotes = on-chain oracle rates.** Mint conversion uses the state-coin `ratemint` (port 40) and burn uses `rateburn` (port 41) — previously the mint quoted a CoinGecko-derived spot (188.37 vs the chain's 174.56 on the day this was proven, so the modal over-promised burns by ~8% and mints overpaid collateral by ~7%). New `stablesRefreshUsdwLiveRates` cache (refreshed with the spot tick and on balance-change detection); `issueUsdwPerWiniwa`/`issueWiniwaPerUsdw`/`treasuryRedemptionWiniwaPerUsd` return the chain rate for USDw with NO spot fallback (quote shows '—' until the rate is read, never a number the chain would not honour). Mint/burn rate lines now read "1 USDw = … Winiwa · on-chain oracle rate".
  - **xWiniwa quotes = NAV rates.** `calcXwm`/`calcXwmBurn`/`recalcMintXwmPanelsOnly` now quote `winiwa/ratemint` on mint and `xwm*rateburn` on burn from the equity covenant's state coin (was hardcoded 1:1). The "Current leverage: 1:1 covenant" row is replaced by "xWiniwa NAV (oracle-signed, on-chain): <live NAV>", plus equity explainer copy with a link to the live Treasury.
  - **CoinGecko removed from the channel.** Spot USD comes from MEXC only (the same feed the on-chain oracle signs): `refreshWiniwaSpotFromMexc` browser path goes straight to MEXC, `price-oracle.js` is MEXC-only, the xWiniwa chart now uses MEXC daily klines (365d), the price-references legal copy is rewritten, and `COINGECKO_MINIMA_URL` is deleted from runtime-config.
  - **Treasury page is LIVE from the chain.** New `__STABLES_TEST_READ_BALANCE_SHEET__` (bootstrap) computes the protocol balance sheet on the user's own node from the covenant addresses per the registry `balance_sheet` model: Assets T = Winiwa at the two covenant pools; Liabilities S = external USDw (reserve-seed net-issuance + recorded gifts); Equity E_eff = (T − L) + the recorded genesis offset (NAV defined = par at the 2026-07-05 accounting snapshot); NAV = E_eff/X floored at 0.01. Rendered into the headline Assets/Liabilities/Equity cells + a new balance-sheet detail block ("computed from your node at block N") + a "Protocol reference addresses" section (covenants labeled treasury pools, issuer/faucet labeled excluded inventory, oracle pubkey) with explorer links. The per-wallet activity-ledger snapshot and the ALM stress slider no longer overwrite the headline cells when the chain read is available. New config block `TEST_BALANCE_SHEET` mirrors the registry constants.
  - **Backend shipped alongside (task_test_channel):** `tools/read-balance-sheet.mjs` (live T/S/X/E/CR/NAV reader + `--snapshot` offset calculator; registry `balance_sheet` block recorded with the snapshot), `oracle-rate-service.mjs` now consumes the REAL balance sheet (F5 wired — placeholder T=1,S=0,X=1 deleted; refuses to sign if sanity checks fail; skips the post when rates are unchanged; `--covenant both`), and the oracle runs on a 5-minute cadence against the StablesKey node (:9205) — first real-balance-sheet rate updates posted on mainnet: USDw 180.75539569/178.95683453 (`0x3DB2F063…`), xWiniwa 1.00500001/0.995 (`0x7410FC02…`, first non-par spread-carrying xWiniwa rate). `dev-up.ps1` now starts the oracle node + rate service; both sync tools default to `-Channel 3-test`.
- **Fixed: in-app USDw mint/burn was dead on v0.0.3.7 — missing `pool_miniaddress` in the genesis-2 registry block (v0.0.3.8).** Driving the real mint flow on the emulator (release gauntlet) showed every USDw mint/burn exiting immediately with the toast "Test registry incomplete. Check runtime-config TEST_TOKEN_REGISTRY." Root cause: `test-channel-bootstrap.js` gates USDw mint/burn on `reg.pool_miniaddress` (the USDw covenant miniaddress, used for the confirm modal, activity rows, and address matching), and the genesis-2 repoint of `TEST_TOKEN_REGISTRY` dropped that key — the covenant 0x-address was updated but its Mx form was not carried over. xWiniwa and faucet were unaffected (their miniaddress keys exist). Fix: restored `pool_miniaddress` = `MxG084PU43T9UDHVEB95HWDWF1QDW6P6P81VHC7TFPKF2JHZM5860227FN5PSTQ` (registry `mint_burn.covenant_miniaddress`, = `0x99F107D4…`). This also means the v0.0.3.2 "all genesis-2 flows verified" run predates whatever repoint dropped the key; USDw mint/burn was silently broken from that point through v0.0.3.7.
- **Changed: xWiniwa valued off the live on-chain NAV; balances re-render on every detection (v0.0.3.7).**
  - **xWiniwa price now follows the live equity covenant.** The valuation (`xwmSimUsdPrice`) previously multiplied a **hardcoded** `TEST_XWINIWA_PRICE_WINIWA` (= 1) by the Winiwa/USD price — a stale comment even called the covenant "immutable fixed 1 Winiwa ↔ 1 xWiniwa" (the *old* design). It now reads the **live NAV (Winiwa per xWiniwa) off the covenant state coin** (ports 40/41 mint/burn rate, NAV = their mid) via a new cached `stablesRefreshXwiniwaLiveNav`, refreshed on each price tick and on balance-change detection; the hardcoded value is now only the genesis-par fallback. **Note:** at genesis, external xWiniwa ≈ 0, so the real NAV (`E/X`) is par (1) by construction — this is correct, not a bug. The ratio moves off par once xWiniwa is meaningfully distributed **and** the operator oracle posts a real NAV (the oracle still uses a par placeholder for xWiniwa: `oracle-rate-service.mjs` feeds `computePricing` fixed `T=1,S=0,X=1`; wiring the real on-chain balance sheet + running it with the offline oracle key remains a backend task).
  - **Balances reflect a detected transaction immediately.** On the native `NEWBALANCE` push, the app now explicitly re-reads node balances (which already include mempool/unconfirmed coins via `readTokenBalanceDetail`) and re-renders every token row, so a send/receive/mint/burn updates the displayed amount the instant the node sees it, not only after confirmation.
- **Changed: faucet cooldown wording + post-pour navigation (v0.0.3.6).** The faucet claim button's cooldown label now reads **"Next pour in …"** instead of "Available in …". And after a successful pour the app navigates **straight to the Wallet page**, so the user lands on the balance (which already reflects the optimistic +claim) and the Activity row instead of staying on the faucet page.
- **Fixed: genesis-2 activity cleanup — old-token rows, phantom faucet cooldown, and the WINIMA label (v0.0.3.5).** Three post-reissue issues:
  - **Old-token transactions still listed.** After the genesis-2 token reissue, the Activity list kept showing transactions from the retired genesis-1 tokens (same display names, different ids). tx-mirror already skips out-of-scope tokens on new imports, but the stale rows were persisted in localStorage from before the switch and never purged. Bumped `USER_ACTIVITY_STORAGE_KEY` and (the overriding) `test-channel-bootstrap.js` value `v1 → g2`, so the pre-reissue rows are abandoned and tx-mirror re-imports only the current genesis-2 rows from node history (last 48h; genesis-2 is newer than that).
  - **Phantom faucet cooldown.** The pour button showed "next claim in…" with no recent claim. `stablesGetOnChainLastFaucetClaimTs` scanned Activity for faucet rows by currency *name* and used each row's `ts` — but imported NODE rows carry the *import* time, so a re-imported older claim (ts≈now) resurrected the cooldown. It now counts only the app's own `localOrigin` claim rows (accurate ts); the durable cooldown source remains the localStorage claim key. Also bumped `FAUCET_WINIWA_LAST_CLAIM_STORAGE_KEY` `v1 → g2` to clear any stale timestamp.
  - **WINIMA in the balance hero.** The hero total/subtitle rendered the internal currency code (`WINIMA`) instead of the display name; it now maps through `displayCcyCodeForUI` → "Winiwa".
- **Changed: pop-ups are now for alerts only; balance reflects on submit (v0.0.3.4).** Removed the confirmation pop-ups that fired after a user's own on-chain action: the shared "Transaction submitted…" toast (`stablesShowTxProgressModal`) is now a no-op, and the built→sent→mined progress modal (`stablesShowSendResultModal`) no longer opens — this covers **faucet pour, USDw mint/burn, xWiniwa mint/burn, and send**. Feedback for these is the Activity row (appended on submit, upgraded on node detect) plus the live balance; the underlying settlement tracking is unchanged. Error/insufficient-funds/security messages still alert via their amber toasts, and incoming-payment notifications (an event, not a self-action confirmation) are unchanged. Also: the **faucet pour now updates the balance immediately** on submit — it sets an optimistic +claim (via `stablesSetOptimisticBalance`) instead of clearing the optimistic hold, so the Winiwa shows the moment you pour and self-reconciles to the node value once the row confirms. (Supersedes the v0.0.3.3 faucet-only pop-up removal below.)
- **Changed: no pop-up after a Winiwa faucet pour (v0.0.3.3).** A covenant faucet claim previously fired the generic "Transaction submitted. See Activity list for details." toast (via `stablesShowTxProgressModal`) on submit. Per the popup policy (a low-friction, self-explanatory pour does not need an interrupting message), that call is removed from the faucet claim path only — mint, burn and send keep their submit toast. Feedback for a pour is now the inline settlement card plus the Activity row. (Full end-to-end on-chain verification of all genesis-2 flows — receive, USDw mint/burn, xWiniwa mint/burn, send — passed on v0.0.3.2, balances reconciled exactly.)
- **Fixed: genesis-2 Winiwa faucet claim failed on-chain validation (`scripts=false`) (v0.0.3.2).** In-app faucet claims on the genesis-2 covenant failed txncheck with `scripts=false basic=true mmrproofs=true` ("Faucet claim failed validation"). Root cause was a seed/app mismatch on the covenant's identity tag: the covenant's `SAMESTATE(99 99)` pins state port 99 immutable for the life of the state coin, but the genesis-2 faucet was seeded with port 99 = `2` (the seed tool `faucetStatePayload` overloaded it with `OP_CLAIM`), while the app hardcoded the `7` tag used by the USDw/xWiniwa covenants — so every claim's recreated state coin carried the wrong tag and the script rejected it. The pool-coin branch passed (it only reads ports 20/21/25), which is why basic/mmrproofs were true and only the script failed. Fix: the claim now **reads port 99 off the live state coin and carries that exact value forward** (new `readStatePort` helper; `faucetStatePorts` takes the tag as a parameter, `7` fallback), mirroring how the price-band path reads rates 40/41 from the state coin — self-healing whether the coin holds `2` or `7`. The seed tool (`task_test_channel/tools/mint-burn-lib.mjs`) is also corrected to seed the `7` tag on any future faucet redeploy. (Supersedes the "faucet works as-is" claim in the entry below.) Verified on mainnet: claim now passes txncheck (`scripts=true`) and posts.
- **Opened the 0.0.3 line — genesis-2 + hardened on-chain covenants (v1).** Version bumped to v0.0.3.1 to mark the test-channel genesis-2 milestone: a clean single-issuer token reissue (fresh Winiwa/USDw/xWiniwa) and hardened **signed-oracle price-band covenants** now live and proven on Minima mainnet. The chain now enforces a fair mint/burn rate (a raw transaction can no longer drain the reserve or pool — the fix for the Fable red-team's critical finding), with an operator-signed oracle setting the rate. Covers the market USDw mint/burn and the new **xWiniwa equity** covenant (contribute Winiwa, receive xWiniwa at NAV). App wiring (v1): runtime-config repointed to the genesis-2 token ids + price-band covenant addresses + minified scripts + tag 7; the **USDw mint/burn builder now reads the operator-signed rate from the covenant state coin (ports 40/41), makes amt/coll respect the on-chain band, and carries the rate through** (new `readStateRatePorts`). Faucet works as-is on the new covenant/id. The **xWiniwa mint/burn builder is reworked from the old 1:1 to the equity price-band** — mint contributes `amount*ratemint` Winiwa collateral for `amount` xWiniwa; burn returns `amount` xWiniwa for `amount*rateburn` Winiwa; both read ports 40/41 from the state coin and are band-enforced on-chain. STILL TO DO: rate-aware mint/burn confirm text + reading the live xWiniwa NAV from the state coin for display (currently par fallback), and end-to-end emulator validation of all three flows. Underlying work in `stream_3_governance/task_test_channel/` (registry, GENESIS2_RUNBOOK, PRICEBAND_COVENANT_DESIGN, XWINIWA_EQUITY_SPEC, pricing-engine.mjs, oracle-rate-service.mjs).
- **Fixed: tapping the background notification now opens the Stables app (v127).** The always-on node notification opened the legacy Minima Core screen when tapped, because its tap target was hardcoded to the old `MainActivity`. It now launches the app the same way the launcher icon does (`getLaunchIntentForPackage` → StartActivity → StablesActivity), reusing the running task if the app is already open. Applies to both the persistent status notification and incoming-payment notifications (both share `createDefaultPending`).
- **Changed: form-validation messages are now inline errors, not popups (v126).** Instead of a centered popup floating over the screen, a validation error now shows right where the problem is: the offending field gets a red border and a short red message appears directly beneath it, clearing the moment you edit the field. New reusable helper `stablesFieldError(fieldEl, msg)` (+ `.field-error` / `.finput--error` styles that span a full row in grid, flex, or block layouts). Converted the money and merchant forms: exchange (pick currencies / enter amount / no rate / insufficient), USDw mint + burn and xWiniwa mint + burn (enter amount / not enough balance — in both the demo path and the live test-channel path), coverage fund deposit + withdraw, and the merchant invoice (amount / reference / participant / validate). Popups are now reserved for security and on-chain events. (Kept as popups: council-execution-locked security gate, registry/config errors; a few low-frequency validations — image pickers, merchant business-name, budget-total — still to convert.)
- **Removed: demo-version placeholder boxes (v126).** The test channel emulates production (only difference: Winiwa stands in for Minima), so hardcoded demo content that misrepresented functionality is gone: the fake "My addresses" list (two placeholder `Mx688…`/`Mx3f2…` addresses with a fake "copied" tap — replaced by just the real "Generate new address" action), the two fabricated Council governance proposals ("Add Turkish Lira", "Increase Savings Pool fee share" with invented vote counts and fake vote buttons), and the fabricated "Past resolutions" card (fake Q4 2026 budget allocation). The real Council content stays: the Stables Charter section, the live Council budget, and the interactive budget-allocation vote card. (Real preview features — merchant onboarding, the Ambassador program, the security quiz — are untouched; they are actual planned functionality shown in preview, not demo placeholder data.)
- **Removed: result-confirmation popups across the app (v126).** Per the popup-policy audit (popups reserved for security + on-chain interactions), ~29 "it happened" toasts were removed: address/onboarding-grant/share copied, bank & council profile saved/reset, bank picture/avatar saved, custom image set/cleared, "using saved/default profile settings", balances reset, activity refreshed, vote recorded, budget vote recorded, StablesAgent opened / button hidden, opening Charter, sale recorded, participant recognized, campaign/onboarding preview saved, and the first-run "you are quick" banner. The underlying actions still happen; they just no longer interrupt with a popup. (Kept: on-chain/transaction/node/faucet/mint/security messages, and validation guards that abort an action. The ~30 form-validation messages — "enter an amount", etc. — are still popups pending an inline-error pass; a few demo poll/placeholder toasts remain.)
- **Added: node pause respects boot-start (v126).** The existing "Keep my bank running in the background" toggle (Settings → Node) already stopped the node when the app is closed and is wired through the native bridge. Boot-start now also honours it: if you turn background running off to save battery, the node no longer auto-starts after a reboot either. The always-on default is unchanged.
- **Removed: the launcher notification-badge dot on the app icon (v126).** The always-on node posts a persistent foreground notification, which made the Android launcher show a permanent "unread" dot on the Stables icon. The node-status notification channel now sets `setShowBadge(false)`. Because Android locks a channel's badge setting once created, the channel was renamed from the legacy `MinimaServiceChannel` to `StablesNodeChannel` (a fresh channel, so the setting applies even on an in-place update) and the old one is deleted — this also removes a user-visible "Minima" string from the system notification settings. The incoming-payment channel keeps its badge (a received payment is worth a dot).
- **Changed: enlarge-QR box is now just the QR (v126).** Tapping "Large QR" on Receive opened a box with a title, a paragraph of instructions, and a Close button. It now shows only the enlarged QR code; tap anywhere outside to close. Part of keeping on-screen text minimal.
- **Changed: removed dismiss-only buttons from info modals (v126).** Info/notice modals (the Minima-explorer notice, the shop-sticker box) no longer carry a redundant "OK"/"Close" button — tapping outside the box closes it, matching the Charter notice. Buttons stay where there is a real choice (confirm/cancel pairs, or an action like Print).
- **Added: node auto-starts on boot and runs in the background (v126).** The `BootReceiver` was disabled (an outdated comment claimed starting a foreground service from `BOOT_COMPLETED` crashes on Android 12+ — it is actually an explicit exemption). It is now enabled and also listens for `LOCKED_BOOT_COMPLETED` (direct-boot) and `MY_PACKAGE_REPLACED` (app update), so after a reboot the embedded Minima node starts headless and keeps posting incoming-payment notifications with the app closed. It is gated on the `SEED_SET` pref, which the Stables onboarding never set (only the legacy Minima wallet flow did) — `StartServiceActivity` now sets it after the first successful startup, so boot-start arms once a wallet exists.
- **Changed: notification icon is now the official Stables mark, single and clean (v126).** The status-bar / left glyph was a flat "S" ribbon that read as an unclear shape. It is now a SOLID monochrome hexagon-S derived directly from the official `stables_logo` brand master (the hexagon filled with the S as negative space, anti-aliased, at all densities) so it reads clearly as the Stables logo even at the small notification-circle size — an outline version was too thin to recognise. This same icon sits in the status bar next to other apps. The redundant full-colour large logo on the right of the notification was removed; the single hexagon-S reads better than a big logo beside it.
- **Added: on-chain xWiniwa reserve level on the Mint page (v126).** The Mint → xWiniwa panel now shows "xWiniwa reserve available" — the live covenant reserve the mint can still release — using the same track-then-read, never-show-a-false-0 pattern as the Winiwa faucet level. Refreshes when the Mint page opens and when the xWiniwa tab is selected.
- **Removed: currency-editor enable/disable popup (v126).** Entering/leaving wallet currency edit mode no longer shows a toast (the pencil highlight and row affordances already signal it). Part of limiting popups to security and on-chain interactions.
- **Fixed + changed: node notification now appears, shows the Stables identity, and reads as a banking app (v125).** Several related fixes to the standalone APK's notifications:
  - **Notification never appeared on the phone:** the `POST_NOTIFICATIONS` runtime permission (Android 13+) was only ever requested by the legacy Minima `MainActivity`, which the Stables shell does not launch — so on a fresh install it was never granted and the node's foreground notification (and the incoming-payment heads-up) were silently suppressed. `StablesActivity` now requests it on startup.
  - **Minima "M" → official Stables logo:** the status-bar small icon used `ic_minima`. The small icon (which Android renders as a tinted monochrome silhouette for every app) is now a Stables mark, and the full-colour **official** Stables logo (`drawable/stables_logo`) is set as the notification large icon so the real brand logo shows in the shade.
  - **"Be your bank", not node jargon:** the persistent notification is now titled "Stables" with "Be your bank" as the text (previously the title became a bare block number once the node synced).
  - **No blockchain jargon on the front notification:** the status line no longer shows the block height — it reads a plain "Connecting to the network…" / "Connected". Block/chain detail stays in the in-app node console for those who look for it.
  - **De-Minima stray text:** the in-app terminal's "Welcome to Minima Core" banner is now "Welcome to the Stables node console" (kept the honest "run Minima node commands" line).
- **Fixed: rescue hardened after v123 still missed the stranded covenant rows (v124).** Two gaps: (1) rows that got far enough to record their transaction id (`explorerTxId`/`pendingTxnId`) are now checked directly with `txpow onchain:` — one authoritative lookup instead of fuzzy matching; (2) for rows without a txid, an empty result from the address-aware covenant recompute on a busy node (all `checkaddress` lookups timing out) was read as "no match" — it now falls back to the raw `difference` entries, so indeterminate never blocks a rescue. Added a rescue inventory log line and a third deep pass at +5 minutes (after a long offline stretch the node can still be block-syncing at +90s).
- **Fixed: false-"Failed" covenant rows now rescue themselves against on-chain history (v123).** Root cause of the remaining stuck rows: the mirror arms on the first successful `history` right after node boot — its busiest phase — and a timed-out `checkaddress` was cached as "not our address" for the whole session, so covenant transactions (USDw mint, xWiniwa lock) resolved to "not ours", were never imported as NODE rows, and their optimistic rows had no twin to heal against. Fixes: indeterminate `checkaddress` results are no longer cached; a deep reconcile pass (repair + rescue + import over `history max:60`, limited to txpows from the last 48h so pre-mirror history is not resurrected) runs at arm and again 90 seconds later on a calm node; and a new rescue step matches each stored Failed row against on-chain txpows by token, amount, direction, and the txpow's own time — a match removes the false-failed row and imports the transaction as a proper NODE row with its real ladder status.
- **Fixed: twin-heal window widened to 48h (v122).** On-device evidence (a 23:36 covenant mint marked failed while its 1.75 USDw plainly arrived — wallet held exactly 1.75 − 0.35 = 1.40 USDw) showed the v121 60-minute twin window can never match settled-while-closed transactions: an imported NODE row's ts is the IMPORT time, often hours after the local row's ts. The window now spans 48h; matches remain strictly one-to-one so repeated identical faucet claims still pair with their own twin.
- **Fixed: successful transactions no longer show as "Failed" (v121).** The v115 auto-expiry assumed a successful optimistic row ("Sending…", "Pouring…") is always adopted into its NODE-<txid> row — but adoption only ran on the live mirror path. A transaction that settled while the app was closed (or the WebView frozen in background) imported as a separate NODE row at next launch, leaving the local twin stranded until the 10-minute expiry wrongly flipped it to "Failed" beside the real, successful row. Fixes: (1) initial import now also adopts matching local rows (no incoming-notify side effect); (2) the expiry checks for a NODE twin (same direction/currency/amount within an hour) before failing — a match means the transaction succeeded, so the duplicate is removed; (3) the same check heals rows already wrongly marked Failed on load, so existing false "Failed" entries disappear on the next app start; (4) the adoption window was widened from 10 to 60 minutes to cover the settled-while-closed case (adopted rows are consumed on match, so no double-matching).
- **Fixed: receive (QR) window now actually closes when the incoming payment is detected (v120).** The v95/v96 auto-close existed but its guards kept the window open in the common case: the window's currency selector had to match the incoming token even when no amount was requested (a plain shared QR on USDw stayed open for a Winiwa receive), and an address-verification lookup that failed or timed out silently blocked the close. Now the currency+amount match is enforced only for invoice-style QRs (an amount was entered); the pays-the-displayed-address check keeps the v96 simultaneous-payments guard but only a *confirmed* mismatch blocks the close — an unknown/timed-out lookup no longer leaves the QR hanging after a real receive.
- **Fixed: Android keyboard now opens on the first tap into any input (v119).** Root cause found on-device with IME tracing: the first tap into a field moved DOM focus (caret appeared, input connection created) but Chromium never requested the keyboard — it only auto-shows the IME when it attributes the focus change to its own tap gesture, and on this WebView that attribution reliably failed for the first tap, so a second tap (on the already-focused field) was needed. Fix: on `focusin` of an editable field the web layer calls the new `StablesAndroid.requestShowKeyboard()` bridge, which runs `InputMethodManager.showSoftInput` on the WebView's live input connection — keyboard rises on the first tap; a no-op when already visible and on web/MiniDapp surfaces. The earlier v116 native change (WebView focusable-in-touch-mode + focus-on-touch) stays as groundwork.
- **Fixed: mirror-row wallet repaints coalesced; focus diagnostics added (v118).** The v116 change that repainted the wallet on every mirror upsert ran once per row — during the initial import or a settling advance cycle that is dozens of `updateGlobalUI` calls in a burst, which stalled the WebView main thread (ANRs observed on the emulator) and could blur a focused input mid-typing. Repaints now coalesce through a 300ms timer (`scheduleWalletBalanceRepaint`). Added a permanent logcat-only focus trace (`[Stables focus]` via the StablesWeb console bridge) that logs focus gain/loss, whether the losing input was detached from the DOM, and viewport resizes — for diagnosing the "keyboard closes itself about a second after tapping an input" report on-device.
- **Fixed: currency balances + total now show pending incoming through the whole settling window (v117).** The settling overlay (activity rows) previously dropped an incoming amount at 1 confirmation, but a received coin only enters the node's `sendable` balance at Minima's coin-confirm depth (3 blocks) — so the amount vanished from the displayed balance between first inclusion and full depth. The overlay now carries the amount until depth 3, and a mirror row landing/advancing triggers a wallet repaint (`updateGlobalUI` from `stablesMirrorUpsertRow`) so rows + hero total react seconds after the txpow is seen instead of at the next poll. **Important pitfall documented:** the display must stay sendable-based — a first attempt (v116) rendered the node's confirmed+unconfirmed total, but on any wallet that ever claimed from the faucet the node tracks the covenant address, so `balance` totals include the shared covenant POOL coins (~1M Winiwa / the USDw mint reserve) and inflated tester balances ~600x. Never surface `confirmed`/`unconfirmed`/`total` from the node balance as a wallet holding; only `sendable` is wallet-only.
- **Fixed: Android keyboard now opens on the first tap into an input (v116).** The WebView never held touch-mode view focus, so the first tap only moved focus to the WebView itself and a second tap was needed to reach the input and raise the keyboard. The shell activity now makes the WebView focusable-in-touch-mode, focuses it at startup, and re-takes focus on touch (dialogs can steal it), so the keyboard appears on the first tap.
- **Added: stuck optimistic transactions auto-expire to "failed" (v115).** An app-created on-chain optimistic row (a send "Sending" row or a faucet "Pouring" row) that is still unsettled and has not been adopted into a NODE-<txid> row 10 minutes after creation never landed on-chain (a successful one would have been mirrored from node history by then). It now flips to status "Failed" (red "failed" status line) and stays in the transaction list, deletable via the existing Delete button in transaction details. Minima has no way to cancel a broadcast transaction, so this covers the only stuck case: a local optimistic row whose transaction never reached the chain. Runs on a 60s local timer (`stablesExpireStaleOptimisticRows`), no node calls; NODE- rows (node truth) are never expired.
- **Changed: balance shows pending incoming immediately (v114).** The displayed token total now includes the node's `unconfirmed` amount (confirmed + unconfirmed), matching the official Minima wallet, so an incoming payment reflects in the balance the instant the node sees it in the mempool — not only after it is mined. Outgoing already updated instantly (spent coins leave `sendable`). The node's `unconfirmed` is a token amount; the coin count is the separate `coins` field.
- **Changed: covenant claim direction is now address-aware (v114).** The covenant recompute (faucet/mint/burn/xWiniwa) now counts only coins at addresses that are actually ours (verified with `checkaddress`, cached), instead of assuming the sole non-covenant party is us. On a normal wallet a claim still reads +1000 received; on the faucet-pool operator node (e.g. Test12, which the web preview connects to) a claim it merely relays for another wallet now nets to nothing and is dropped, instead of wrongly showing as "+1000 received." The arm-time repair pass was generalized to also remove such already-stored relayed/phantom rows (in or out) via `stablesListNodeRowsForRecheck`.
- **Added: one-time correction of already-stored wrong covenant rows (v109).** The v109 direction fix stops new wrong rows, but a faucet claim stored as "-1000 sent" before the fix stayed in localStorage. On mirror arm, each stored outgoing NODE row whose txpow is a covenant claim is now removed and re-imported with the corrected incoming direction (`stablesListOutgoingNodeRows` / `stablesRemoveActivityRowById`).
- **Fixed: faucet/covenant claims no longer show as an outgoing "-1000 Winiwa" row (v109-v113).** The tx mirror decided direction from the raw node `difference` sign, but a faucet claim spends the shared covenant pool coin (the covenant script is spendable-by-anyone, so the node counts it as wallet-relevant), making the net `difference` negative even though tokens are received — so after a reinstall (no app row to defer to) the historical faucet claim imported as a -1000 outgoing row. The mirror now fetches the raw txpow only when a token nets negative, and if the transaction touches a known covenant address (faucet/mint/burn/xWiniwa, from config) it recomputes each token's true direction from the coin flow at non-covenant addresses only (in a covenant tx the sole non-covenant party is us), using each coin's `tokenamount` (the token quantity, e.g. 1000 Winiwa) rather than `amount` (the tiny MINIMA-equivalent). Added the app-row guard to the live path so a fresh claim's own row is never duplicated, and a case-insensitive history lookup in the correction pass (Minima returns txpowids uppercase; stored NODE ids are lowercased). Balance was always correct (it comes from the `balance` command); only the transaction row's direction was wrong.
- **Fixed: app-wide button size/color consistency pass (v108).** Fixed the reported Mint USDw vs Burn USDw size mismatch (Mint had `btn-lg`, Burn didn't) and applied the same fix to Mint/Burn xWiniwa so all four mint/burn actions on the Mint page are now equally-sized big primary/secondary CTAs. Also normalized: Merchant "Release Goods"/"Wait for full confirmation" (previously had custom one-off font-size/padding only on Release Goods), and the "Cancel"/"Hide"/"Recover"-style secondary buttons across the Reveal Seed, wallet recovery, terminal warning, and language-coming-soon modals, which previously used the plain unstyled `.btn` look instead of `.btn-secondary` next to a colored primary/danger sibling.
- **Fixed: Mint page xWiniwa/Stables tab row spacing aligned (v107).** The top-level tab row on the Mint page now uses the same margin-top/margin-bottom rhythm as the Invest page tabs, and the redundant extra top margin on the panels below it was removed to avoid doubled spacing.
- **Changed: Receive window now follows Send window shell styling (v106).** Receive modal width, padding, and radius were aligned to the Send modal so both surfaces share the same structure and visual rhythm.
- **Fixed: receive copy button clipping/overflow hardening (v106).** The button now uses stronger width constraints so generic `.btn` sizing cannot push it out of the row on smaller screens.
- **Fixed: receive modal copy button visibility/layout (v105).** The copy control now has explicit icon+text styling and adjusted width so it stays readable and tappable on mobile screens.
- **Fixed: stale faucet pending row no longer inflates Winiwa total when claim is not confirmed (v104).** If a faucet claim does not resolve to a mined txpow, the faucet row now transitions out of settling (`pendingIncoming=false`, status set to not confirmed/failed), preventing phantom +1,000 overlays that could show totals like 2,000 with only 1,000 sendable.
- **Changed: portfolio simulator micro-pass tightened side drawer layout (v104).** The simulator drawer is now narrower with tighter header/body padding so it reads as a cleaner utility panel.
- **Changed: removed unrelated "My portfolio" block from Merchants page (v103).** The Merchants tab now focuses on merchant discovery/promotions without portfolio duplication.
- **Changed: side panel title is now "Portfolio simulator" (v103).** Renamed from "My bank holdings" to match the feature intent.
- **Fixed: simulator side panel no longer blocks main-page access (v103).** The portfolio simulator drawer now behaves as a non-blocking utility panel so base pages remain accessible while it is open.
- **Changed: informational non-warning modals now use shared message-box taxonomy (v103).** Help/demo/info/success notices now use the same shell family (`stables-msgbox` variants) for consistent popup language.
- **Fixed: wallet faucet onboarding message no longer appears while incoming is settling (v102).** The "Get started with Winiwa" card now stays hidden whenever an incoming transaction is pending/confirming, so it does not show right after a faucet claim submission.
- **Changed: second-pass non-toast warning/confirm modals now share one message-box shell (v102).** Confirm and warning dialogs (generic confirm, recovery confirm/quiz, terminal danger warning, faucet claim confirm, mint/burn confirm) now use the same modal shell language for visual consistency.
- **Changed: standardized all in-app popup messages to one centered notice box (v101).** All `showToast(...)` messages now use the same centered text box and remain visible until the user taps outside (or presses Escape), so messages like privacy/auto status are consistent across the app.
- **Fixed: receive copy button reduced for smaller screens (v101).** The copy control beside Receiving address now uses a narrower width so the row fits better on mobile viewports.
- **Fixed: faucet claim is now blocked until faucet level is retrieved (v100).** The claim button stays disabled while faucet level is Loading/Syncing, and tapping claim during that state is hard-blocked with a sync message. This prevents early pours that can get created before pool readiness is confirmed.
- **Changed: removed wallet-top incoming settling message above Send/Receive (v99).** The hero line that showed messages like "Incoming +... settling · x/y blocks" is now always hidden. Incoming payment visibility remains in the transaction list only (live rows + settlement ladder), avoiding duplicate messaging on the wallet hero.
- **Adjusted: receive modal now visibly smaller and denser on phone (v98).** Follow-up to v97 with stronger sizing reductions: receive modal width/height reduced, QR block reduced, address row compacted, and Copy button narrowed further so the receive window no longer feels oversized on mobile screens.
- **Fixed: receive modal fit, address row, copy button size, and Auto toggle state (v97).** The receive window no longer overflows on phone widths, receiving-address layout now keeps the input fully visible, the Copy button uses a compact fixed width, and the Receive Auto button now visibly switches between OFF and ON when pressed.
- **Fixed: receive window's 300ms watcher flooded the node; auto-close is now merchant-safe matched (v96).** With the receive (QR) window open, the legacy 300ms payment watcher fired ~5 txpow lookups per second on-device, saturating the embedded node and starving the tx mirror — the incoming row and the v95 auto-close were delayed past 2 minutes. The polling interval is gone; NEWTXPOW event handlers still drive the status line. The auto-close now matches before closing, so simultaneous payments to the same wallet cannot close the wrong screen: token must equal the window's currency, an entered amount must match exactly, and the transaction must pay the exact address shown (verified against the txpow outputs, one lookup, only on detection).
- **Added: receive window closes itself on incoming payment (v95).** When tx-mirror injects a live incoming row (node sees the payment at mempool), it notifies `stablesOnMirrorIncomingDetected`, which closes the open receive (QR) window — the receiver lands on the flashing list row instead of dismissing the QR by hand. Receive-side twin of the send's fire-and-close; initial history import never triggers it.
- **Changed: status-ladder row treatment + final rebuild hygiene (v94).** The transaction row's confirmation line now speaks the locked ladder vocabulary: "receiving"/"sending" at mempool, "received x/t"/"sent x/t" while confirming, "confirmed" at target. Settling rows carry a quiet amber edge (`tx-row--settling`) and a row flashes once (`tx-row--flash`, cyan pulse) when it first appears or its ladder status advances — in both the wallet recent list and Activity. Orphan sweep: deleted the five provably dead helper functions left by the v93 body strip (ensureMinedRowBlockHeights, setTxSyncInFlight/WorkerActive, refreshPendingIncomingRowBlocks, fastScanRelevantTxpows) plus dead scan-state variables and the unreachable else-branch in stablesOnLiveBlockTick — activity-contacts.js is down to 5,821 lines from 6,887 at the rebuild's start; helpers used by live features (merchant watcher, detail views, send-progress reopen) were verified and kept. TX radar is now OFF (`TX_RADAR_ENABLED: false`) — its measurement polls no longer run; flip to 'console' or true only for dev measurement sessions.
- **Changed: Phase 4 balance mirror + physical deletion of retired engines (v93).** On a regular (non-issuer) wallet, `stablesRefreshLiveNodeBalances` now stops after the single `balance` command — the scoped coins/keys scan (15-25s of node time per run on-device) only runs on the issuer/treasury node, where the coin-ceiling filter needs per-coin data; the issuer determination and wallet fingerprint are cached per session, removing the recurring `getaddress`/`keys` cost. Physically deleted the unreachable bodies of the six retired engines in `activity-contacts.js` (history sync worker, live txpow ingest, incoming fast watch, live resync, outgoing settlement tracker, fast incoming scan): 532 dead lines removed; their now-orphaned internal helpers remain for a later sweep. TX mirror's `advance` logcat line now logs transitions only.
- **Fixed: balance-refresh retry storms coalesced (v92).** `stablesRefreshLiveNodeBalances` now runs one bundle at a time with a cooldown (APK 12s / web 4s; post-send force 2.5s) and retries capped at 2 (callers asked for up to 8). Bridge logs showed each bundle costs 15-25s of node time on-device (keys ~8s, getaddress 5-8s, coins x3), and overlapping chains from every NEWBALANCE burst kept the node saturated indefinitely.
- **Fixed: balance-poll flood saturated the embedded node (v92).** On-device bridge logs showed the live-read loop's 1.2s cadence firing getaddress (~5s each) + 3× coins + balance continuously, maxing the embedded node so every other command (including the mirror's `history`) queued past 15s. The poll is now a safety net (APK 20s — native NEWBALANCE/NEWBLOCK events carry the UI; localhost web 4s; remote 8s) and the per-token `stablesFastIncomingScan` coins burst is retired (tx-mirror.js owns incoming detection).
- **Fixed: TX mirror froze when the node bridge dropped a callback (v92).** On-device: one `history` callback never returned from the APK bridge (during block processing), which left the mirror's in-flight gate stuck and stopped all further polling and ladder advancement — the on-screen row stayed at "Receiving" even after the transaction confirmed. Every mirror/radar node command now carries a 15s hard timeout that fires the callback with null, so a dropped bridge response can never wedge the loop; the next poll recovers automatically (`[TxMirror] cmd timeout, recovering` in logcat). Verified on-device end to end: fire → Receiving row ~3s after the push → Received → Confirmed, plus restart re-tracking resuming a stuck row.
- **Get started with Winiwa nudge gated on node connection + empty wallet.** The onboarding card only appears after the node reports rpcOk *and* `stablesWalletHasAnyStablesBalance()` confirms zero Winiwa/xWiniwa/etc. balances from node data. It will no longer pop up on initial load or before a confirmed connection.
- **Winiwa faucet nudge stricter gating.** Now requires nodeConnected (rpcOk) AND hasNodeData (test token detail or minima received from node) before checking !hasBalance. Prevents the "Get started with Winiwa" card from appearing until a real node response has confirmed the wallet state.
- **Winiwa nudge: avoid premature display.** Added early `el.style.display='none'` + hasNodeData guard (test details or minima present) + explicit initial hide + calls on balance. The card now only appears post full node confirmation of empty wallet.
- **Faucet nudge flash fix (node loaded flag).** Introduced __STABLES_WALLET_NODE_LOADED flag set only inside the main balance pull success after node data applied. Nudge sync now requires the flag + nodeConnected before checking empty. Added initial hide and reset on failure. Prevents the "Get started with Winiwa" card from appearing just before balances/amounts are rendered from the node.
- **Faucet nudge timing: removed premature eval.** Removed the direct call to stablesSyncWalletGetWiniwaHint inside the balance response (which could fire before Winiwa details updated and amounts painted). Now relies only on post-paint calls in updateGlobalUI (after syncVaultWalletUI) and the loaded flag. Prevents showing before amounts.
- **Faucet nudge: ensure post-refresh eval.** In NEWBALANCE handler, now chain the updateGlobalUI (which does hint after paint) to after the refreshLiveNodeBalances promise settles for on-chain test tokens. Guarantees Winiwa details are in before nudge logic runs. Combined with previous flag and removal of direct call, eliminates the pop-just-before-amounts.
- **Receive: address before amount, listening message removed.** Reordered receive elements after QR/Large QR to: Receiving address, then Amount+ccy (so QR, address, amount). Removed the initial "Listening for incoming USDw payment..." (and similar) from startReceivePaymentWatch; the status div remains for "Payment detected" etc. Bumped for consistency.
- **Faucet nudge no longer pops before amounts.** When deciding to show (empty wallet post-load), use setTimeout(30ms) so the syncVaultWalletUI paint and browser render of balance amounts happen first. Combined with promise chaining after refresh and removal of early calls, eliminates the flash.
- **Receive modal cleanup.** Removed the "Listening for incoming USDw payment..." (and similar listening) message from recvLiveStatus. Reordered elements so after QR/Large QR: Receiving address section, then Amount (optional)+currency, for QR, address, amount flow consistent with send side (reader, address, amount).
- **Nudge initial hidden reinforced.** Added style="display:none" inline on #walletGetWiniwaHint for extra safety before any JS runs.
- **Faucet nudge timing fix.** Added __STABLES_WALLET_NODE_LOADED flag, set true only after successful node balance pull in pull function. The nudge sync now requires the flag (in addition to nodeConnected) so it only evaluates after amounts/balances have been loaded from node. Prevents the "Get started with Winiwa" card from popping just before the amount is displayed. Also reset flag on disconnect/failure. Initial hide reinforced.
- **Receive modal element order fixed for consistency.** Now strictly: QR code (with Large QR), Amount (optional) + currency selector, then Receiving address (input + Copy). Matches the requested "qr code, amount and address" ordering and aligns common UI elements (QR/reader + amount) in the same vertical positions relative to each other across send and receive modals.
- **QR/reader and amount positions aligned for send/receive consistency.** QR code (receive) and camera/reader (send) are now in the same place immediately after the tab row in both modals. Amount (optional) + currency selector placed right under the visual/QR-reader in receive (matching the "below visual" pattern on send). Common elements like QR/reader and amount input now at consistent vertical positions across the two screens.
- **QR/reader visual containers matched.** Both now use identical 280px square wrapper (border, radius, bg, aspect-ratio) so they occupy the exact same space on screen.
- **Receive amount/currency moved below QR.** The Amount (optional) input and currency selector are now positioned under the QR code + Large QR button in the receive tab (for consistency with the send side, where amount fields appear below the primary visual/scan area).
- **Receive address input uses full box space.** The "Receiving address" field now flexes to fill the entire available width of its row (using flex:1), allowing the abbreviated address (e.g. MxG086...U40SJS and longer variants) to display more characters when space permits. Abbreviation now uses 8+...+8 for more visible prefix/suffix.
- **Removed receive help text.** The explanatory line "Edit the address to receive into a specific wallet address. The QR appears once it is verified as yours." has been removed from below the address field.
- **Version status indicator simplified.** Removed "Up to date" text from the drawer version pill (e.g. no longer "v0.0.2.75 Up to date"). Only the colored dot now indicates status (green = up to date, amber = update available, cyan = checking). Version label shows only the version.
- **Eye moved to upper right corner of balance.** The hide/show eye is now absolutely positioned in the top-right of the balance card (where indicated in screenshot).
- **Receive: +New address now updates the address box.** Fixed so clicking + New address updates both the QR and the "Receiving address" input field.
- **Receiving address display.** Regular body font size (15px), middle hidden with ... (e.g. Mx1234...abcd), beginning+end kept. Copy always uses full original address (from canonical), never the displayed ... version.

- **Balance hide eye moved to right of total.** The eye icon for hiding amounts is now placed directly to the right of the large balance total in the wallet hero (inline in the amount row).
- **Receiver (optional) removed from receive tab.** The label and the name/account ID input row (with contact picker) have been removed from the Receive tab in the modal for a simpler flow.

- **Changed: Phase 2 transaction-process rebuild — the list mirrors the node (v70).** Retired the legacy engines that caused every measured failure: the history sync worker (monopolized the node bridge for 40s+), the live txpow ingest (dropped mempool rows on a hydration race), the outgoing settlement tracker, the fast incoming watch, and the per-row pending-settlement poller (all are early-return no-ops pending physical deletion). `tx-mirror.js` now owns on-chain rows end to end: initial import of missing history, live rows at mempool time (kicked by the native NEWTXPOW push + 3s poll), and a status ladder driven by single `txpow onchain:` lookups — Receiving/Sending (mempool) → Received/Sent (in a block, n/target) → Confirmed (target blocks). New node rows adopt the matching optimistic local row (send/faucet/mint) so titles survive and nothing duplicates ("Sending X" settles to "Sent X"). Send is now fire-and-close on every platform: modal closes on dispatch, no "Send submitted" result modal, no post-send sync cascade; errors still surface as toasts and a Failed row. New lean writers `stablesMirrorUpsertRow` / `stablesHasNodeActivityRow` bypass legacy reconciliation heuristics entirely.
- **Added: TX mirror — incoming rows land in the transaction list straight from node history (v69).** The v68 no-popup test exposed a legacy ingest failure: the txpow-body hydration used by `stablesIngestLiveTxpow` starves behind the history sync worker on-device, so the incoming row was repeatedly dropped as "non-stables-token" (empty ccy) and the list stayed empty until confirmation. New `assets/tx-mirror.js` bypasses that path entirely: it reads `history` (token + signed amount are present in `difference` at mempool time), and upserts a simple "Received <token> — Detected" row keyed `NODE-<txpowid>` via `stablesAppendUserActivityRow` within seconds of broadcast (instant kick from the native NEWTXPOW push + 3s poll). The later full history import replaces the row in place (same id) with settlement status. Incoming only; sends keep their existing flow.
- **Changed: user-oriented receive UX — transaction list only, no popups (v68).** Incoming payments now appear directly in the Activity/transaction list at mempool detection (the early-notification path proven on-device in v67: native NEWTXPOW push → row within seconds of broadcast). The automatic "Incoming payment detected/confirmed" modal and the announce toasts are gated behind `INCOMING_POPUP_ENABLED` (false by default); the progress modal still opens on explicit user request from transaction details. TX radar strip switched to `'console'` mode (logcat/console timestamps for measurement, no on-screen UI).
- **Added: TX radar dev strip to visually prove early incoming notification (v67).** New `assets/tx-radar.js` (gated by `TX_RADAR_ENABLED` in runtime-config, ON for this proof run, must be OFF for any publish): a fixed bottom timestamp strip that logs `FIRED` when a send is dispatched, `EVT` when a node event reaches the app's JS layer (native push on APK, MDS event on web), and a flashing `IN/OUT` line when a new wallet-relevant txn appears in the node's `history` (2s poll on web, 6s safety poll + push on APK). Hooks are purely additive (four one-line touches: native event entry, MDS NEWTXPOW branch, send dispatch, send accept); no existing send/receive/activity behavior changed. Run the proof with sender and receiver windows side by side: the wall-clock delta between the sender's FIRED line and the receiver's IN line is the measured early-notification time.
- **Receive window now shows "Amount received" prominently.** On fast detection in merchant Customer display (the receive pop-up with amount + QR), mdAmt now clearly displays "Amount received: XX.XX Ccy" (updated from the detection data) instead of just the expected amount. Initial state clarified as "Amount to receive:". This ensures the received amount is visible on this window as soon as the node detects the tx (via balance delta or relevant txpow match). Bumped iteration.
- **Back to simplest transaction process (v65).** Per request: dropped complex receive/send progress windows and heavy state machine for tx status. On submit: basic row in Activity list. On any detection (NEWTXPOW, relevant txpow scan, balance delta): immediate simple "DETECTED-..." row + existing ingest so the listing shows the tx as soon as the node sees it (mempool level). txConfirmLine now just "detected" early instead of "submitted". Fancy modals replaced by minimal toast + list. Mint/burn/send still execute the same, but visibility is now simple list entry ASAP. This undoes the over-complication. 
- **Great fast UX/UI for receiving wallet / merchant in-store (v63).** Implemented the solution for ASAP incoming notification on the connected phone (local node + proxy): native events + tight relevant txpow + balance delta in receive context now immediately drive a polished positive UI in the Customer display (and receive flows). On exact fast match: "Payment received instantly by your node", success card, "Release Goods" primary button for small daily amounts (per policy), clear "let the client go" copy. Event handlers force the merchant watcher check for sub-second UI update. General receive benefits from faster event path. This is the great actionable merchant experience instead of "awaiting".
- **Fixed: sender saw a false "Incoming payment detected" popup from its own change (v62).** An outgoing send returns its change to the sender's wallet as an unconfirmed coin, which raised the balance `unconfirmed` trigger and opened the incoming-payment popup on the sending wallet. The unconfirmed-rise popup is now suppressed while a fresh outgoing row (same token, within 2 minutes) is in flight; genuine receives are unaffected because the txpow-ingest announcements only fire for incoming rows.
- **Added: instant OS payment notification while the app is backgrounded (v61).** Android freezes the WebView when Stables is not on screen, so in-app detection cannot run there. The foreground service now checks every NEWTXPOW transaction in-process (outputs relevant via `checkaddress`, inputs not ours, dedupe per txpow, off the notify thread) and posts the high-priority "Payment incoming" heads-up the moment a payment to this wallet reaches the node's mempool - seconds after broadcast, screen off or app closed. The confirmed "Payment received" alert from the balance path is unchanged, and the OS alert is skipped while the app is foregrounded (the in-app popup covers that case).
- **Fixed: NEWTXPOW ingest reliability (v60).** Unpeered measurement showed the txpow reaches the phone's node ~4s after broadcast even over public P2P, but the single ingest attempt after the push could silently fail or hang (node bridge busy with history sync), leaving the popup to the ~40s confirmation path. The native NEWTXPOW handler now retries ingest at 0/2/5/10s (idempotent; the seen-txid set gates the popup), fires an immediate balance check in parallel, and the live-ingest path traces start/body/row outcomes per txpow so failures are visible in logcat.
- **Fixed: NEWTXPOW forwarding delivers the txpow id (v59).** On-device vocabulary measurement (v58) proved NEWTXPOW reaches the embedded node ~2.6s after a direct-peered broadcast while NEWCOIN/NEWBALANCE lag by up to a minute, but the service's id extraction aborted on the event's data shape so the app never ingested it. The extraction now handles both txpow-object and bare-id shapes (with a shape-diagnostic log when neither matches), NEWCOIN is forwarded as a balance trigger, and the JS bridge logs every native NEWTXPOW push. Expected end-to-end: popup within a few seconds of broadcast on peered nodes.
- **Changed: node event vocabulary diagnostics + NEWTRANSACTION forwarding (v58).** Direct-peer testing showed NEWBALANCE can lag a mempool arrival by tens of seconds (node-internal emission timing, not relay). The service now forwards NEWTRANSACTION (wallet-relevant transaction) the same as NEWTXPOW, and logs every non-noise node event name to logcat so the exact event/timing vocabulary of the embedded node can be measured on-device.
- **Added: native node event push on the standalone APK (v57).** The embedded node already posts NOTIFY events in-process (the same stream the official Minima wallet uses for its instant payment notifications) - MinimaService now forwards NEWBALANCE, NEWTXPOW, and NEWBLOCK through MinimaServiceListener to StablesActivity, which injects them into the WebView (`window.stablesOnNativeNodeEvent`). NEWBALANCE triggers the incoming-payment detector immediately and NEWTXPOW ingests the transaction by id, so receiver-side detection reacts within milliseconds of the node seeing a payment instead of waiting for the 1.2s poll and its laggier query surfaces. The poll loop remains as fallback for web/RPC surfaces without push.
- **Fixed: incoming payments could announce nothing when relay lost the race to the block (v56).** P2P relay to the receiver takes ~15-60s while blocks arrive ~45s apart, so a payment often reaches the receiver's node already confirmed - and the popup logic deliberately skipped settled rows, leaving no message at all (reported as "I see nothing" / "only Winiwa works"; USDw detection itself verified working on-device). A fresh incoming row (within 5 minutes) now always announces: amber "detected" popup when still settling, green "received and confirmed" popup + toast when first seen post-confirmation. The per-token detection cooldown drops from 45s to 15s so rapid repeat test payments each announce, and the vibration cue now fires for both detected and fresh-confirmed announcements.
- **Fixed: detection popup amount for balance-unconfirmed detection (v55).** Minima's balance `unconfirmed` field is a pending coin count, not a token amount, so the mempool-window popup could report "1.00 Winiwa" for a 7 Winiwa payment. The unconfirmed rise is now only the trigger: the popup opens with "Incoming Winiwa - amount confirming" and the popup poll fills in the real amount as soon as the mempool txpow row is ingested; the confirmed state always shows the exact amount.
- **Fixed: wallet-to-wallet Winiwa receives were swallowed or rebranded as faucet claims (v54).** The uncorrelated faucet-claim merge in the Activity upsert matched ANY incoming Winiwa node row against ANY existing faucet-claim row, so a plain transfer from another wallet either disappeared into an old faucet row or rendered as "Faucet claim submitted · faucet covenant" (root cause of receives showing a balance change but no transaction message). The no-txid merge now requires a local optimistic pour row with the same amount within 15 minutes; txid- and pending-id-correlated merges are unchanged. Verified live on device: mempool-window popup (v53) fired pre-mining for a 6 Winiwa transfer and the row now imports with its own identity.
- **Added: mempool-window incoming detection + Activity drop diagnostics (v53).** Receiver-side testing showed the relevant-txpow scan only sees an incoming transaction once it is mined (~30-45s), so the always-on detector now also watches each test token's balance `unconfirmed` field: a rising unconfirmed raises the "Incoming payment detected" popup immediately (synthetic detected row; the popup re-attaches to the real Activity row once ingested), and a bare balance pull stays alive during the history sync worker so this works mid-sync. Also added removal tracing around every Activity pruner and the upsert phantom/native gates (`[Stables detect] drop <step>`), to diagnose incoming wallet-to-wallet rows that import but never render. Transaction details View progress button aligned to contract roles (btn-secondary).
- **Fixed: wallet Send/Receive action buttons (v52).** Restored previous HTML structure and inline styles for the .act-row and .act-icon elements on the wallet hero (matching the prior good implementation from showcase patterns). Grid now explicitly 1fr 1fr with previous sizing for the two buttons. Bumped for the restore.
- **Changed: UI component standards enforcement (v51).** Reverted over-expansion of button modifiers from prior attempt. Strict alignment to visual_quality_system.md roles only (primary/choice/secondary/danger/disabled/link-action) + .btn-w/.btn-lg. Removed .btn-compact, .btn-inline, .btn-truth, .btn-g and their stacked usages. Updated APP UI CONTRACT comment and plan document. Buttons now use pre-approved elements only for solid, professional consistency.
- **Changed: App UI Contract v1 phase 1 (v50).** Added the cross-surface App UI Contract for actions, surfaces, fields, graph shells, status treatments, and assets; added a baseline-aware audit script to block new component drift; started the first executable cleanup pass on Wallet plus Send/Receive modal structure.
- **Changed: restructured Preferences pages (v49).** Moved "Wallet addresses" section (address privacy, receive format, address list) from My profile into Wallet management for logical grouping with notes, privacy level, and consolidation. Cleaned "Settings and updates" page subtitle and drawer description (removed stale references to theme/display/addresses). Updated Wallet management subtitle to reflect new content.
- **Fixed: Payment protection primary currency basis (v48).** Payment protection now reads the same wallet primary currency used by the Wallet page, so a USDw-primary wallet shows USDw for quick-pay, protected-pay, daily-cap, and confirmation thresholds instead of falling back to Minima.
- **Changed: My shop drawer subtitle (v47).** Replaced the off-state "Turn Merchant on" instruction under My shop in the More drawer with page-descriptive copy for the shop profile, invoices, dashboard, and campaign tools.
- **Changed: Payment protection settings design (v46).** Reworked the Security page Payment protection section so the wallet primary currency is shown as the threshold unit before any limits, quick-pay/protected-pay/daily-cap fields carry that unit beside the value, and confirmation policy rows read as complete rules instead of disconnected inputs. Phone layouts now stack confirmation amount and block controls so units stay legible.
- **Changed: Minima/Winiwa terminology guard (v44).** Removed the legacy runtime text mask that rewrote visible "Minima" copy into "Winiwa", which could corrupt infrastructure and safety labels such as "Minima Security app" and "Stables or Minima". Native Minima now remains Minima in display labels, Winiwa remains the valueless test token, and the USDw mint/burn confirmation identifies the surface as the Minima mainnet test channel rather than a testnet.
- **Fixed: incoming-payment detection starved by the history sync worker (v43).** On-device diagnostics (v42) showed every live-poll tick being skipped while `__STABLES_TX_HISTORY_WORKER_ACTIVE` was set — on the embedded-APK node the history worker runs long and often, so receiver-side detection was effectively dead outside the special QR watchers. The poll's worker guard now still runs the throttled relevant-txpow scan (the actual detector) while skipping only the balance/status work, so an incoming payment raises the detection popup even mid-sync.
- **Added: on-device detection diagnostics (v42).** The standalone app now forwards the WebView console to logcat (tag `StablesWeb`), and the detection pipeline logs low-noise traces: poll armed + cadence, relevant-txpow scan heartbeat, first-time txpow ingest results, polls skipped by the history worker, and the moment the incoming popup fires. This makes receiver-side payment detection measurable over adb on a release build without enabling remote WebView debugging.
- **Fixed: always-on incoming payment detection on the standalone APK (v41).** The embedded node delivers no MDS push events, so the live-poll relevant-txpow scan is the only always-on detector in the APK — and it imported incoming rows silently, so a merchant on Wallet home never saw "Incoming payment detected". The poll-scan ingest now raises the same receiver warning popup + toast as the event path (once per txpow, only for rows still below their confirmation target). The in-process APK bridge is now treated as a local node (poll every 1.2s instead of 2.5s, txpow scan gap 1.1s instead of 2.2s), first detection triggers a short vibration on Android, and the detection path logs timestamps for latency measurement.
- **Added: value-based confirmation policy (v40).** The single global confirmation target is replaced by up to five user-configurable value levels under Settings > Security > Payment protection (defaults: up to 50 -> 1 block, 500 -> 2, 2,500 -> 3, 10,000 -> 5, above -> 10). Every on-chain row is stamped with its own completion target at creation (sender rows from the send tier context, incoming rows from the receiver's local policy), so editing settings later never retargets existing transactions. Activity counters, balance settlement, sender and receiver progress popups, and transaction details all follow the row-specific target (`on-chain 1/5`, `confirmed 5/5`), receiver copy now reads "Wait for x/y confirmation blocks before treating this as paid." / "Payment confirmed by your y-block policy.", QR quick-pay rows carry the same stamp without loosening any quick-pay gating, and a still-settling transaction's progress popup can be reopened from Transaction details via View progress. A deliberate legacy global target (>1) migrates into all levels once; the old key stays as fallback.
- **Fixed: receive warning and sender progress for normal wallet transfers (v39).** The Receive QR now listens even when the amount is blank, treating it as "any incoming payment" for the selected currency/address. The sender progress popup now keeps forcing receipt/history/balance refreshes while open and no longer gives up after three minutes, so a mined transaction can advance out of `Going on-chain`.
- **Changed: outgoing transaction details label the recipient field as Sent to address (v38).** When an outgoing on-chain row has a recipient address, the details modal now labels the main field `Sent to address` and fills it with the full recipient address.
- **Fixed: outgoing transaction details now show the sent-to address (v37).** Confirmed on-chain outgoing rows now preserve the external recipient output address from node history. The Activity list stays compact with a shortened address, while Transaction details shows the full sent-to address instead of the generic `On-chain` label.
- **Fixed: wallet balances now follow spendable node coins after confirmed sends (v36).** Wallet rows and Send max now use node sendable balances for Winiwa/USDw/xWiniwa, and the live refresh now overrides stale aggregate `balance` rows with `coins relevant:true sendable:true` totals so a completed outgoing transfer immediately drops the visible wallet balance.
- **Changed: incoming payments now show a receiver-side warning until confirmation (v35).** Live incoming detection now opens a visible receiver warning modal from the same node txpow path that previously only showed a toast. The Receive QR status and merchant customer display now use amber "detected, awaiting confirmation" language instead of green success before settlement, and the sender progress modal clarifies that the receiver sees the warning when the receiver's own node detects the broadcast.
- **Fixed: token balances now update promptly when Activity shows "confirmed 1/1" (v34).** Sends, mints, burns and faucet claims could leave the wallet totals showing stale/optimistic values even after the Activity row flipped to confirmed. Now: (1) `stablesReconcileOptimistic` immediately releases the hold for a ccy as soon as any matching row is `Confirmed`; (2) `finalizeSettledActivityRows` and `applyTxpowBlockToActivityRows` explicitly clear optimistic + force several `stablesRefreshLiveNodeBalances(..., forceDuringTxSync: true)` when a row reaches the confirmation target; (3) strengthened post-send kick timers and covenant settlement paths with clears + higher attempt counts + pending-settlement refresh; (4) extra force calls in the confirmation hot paths. Balances should now snap in lockstep with the confirmed status.
- **Fixed: mobile MinimaOS faucet level loads through MDS (v33).** The Faucet page no longer waits for the live-node poll to mark `rpcOk` before reading the covenant pool in MiniDapp mode, and it now tries both faucet covenant address forms when reading coins so mobile hub responses do not leave the level stuck on `Syncing`.
- **Fixed: faucet pour balances now follow node truth (v32).** The test wallet no longer loads old cached token balances or credits Winiwa before a faucet transaction is visible to the node. A failed or unconfirmed pour refreshes Winiwa from the node instead of leaving a phantom 1,000 Winiwa balance that cannot mint USDw.
- **Fixed: MinimaOS history import is restricted to Stables test tokens only (v31).** Hydrated node-history attribution now ignores every token id except the configured Winiwa, USDw, and xWiniwa ids, and cached unknown-token node rows are pruned on reconciliation so unrelated Minima wallet tokens no longer appear in Stables Activity.
- **Fixed: faucet claim no longer renders twice after pouring (v30).** Faucet-framed `Faucet claim submitted` rows now absorb the generic node-history `Received Winiwa` twin even when the mined txpow id differs from the local pour row, so a faucet pour shows once.
- **Fixed: token supply is never treated as wallet balance (v29).** The wallet parser now ignores Minima token-row `total` values because they can represent full token supply (for example `100000000`) rather than this wallet's holdings. Cached v28 supply-sized totals are clamped back to the wallet-owned sendable/confirmed amount on load.
- **Fixed: confirmed token balances now display as held balance while sendable stays separate (v28).** Wallet rows and totals now use the node-confirmed token total instead of collapsing to `sendable`, so a confirmed USDw/Winiwa receive no longer shows as 0 just because the coin is not yet spendable. Transaction details also use the standard `View transaction` link text instead of exposing the full hash in user-facing panels.
- **Fixed: mint/send progress now follows node acceptance instead of stale pending UI (v27).** Covenant mint/burn builds now prewarm the protocol covenant, accept successful batched node command wrappers without falling back to slow serial rebuilds, show real build/sign/validate/post phases in the progress modal, and mark posted covenant rows `Broadcasted`/`On-chain` as soon as the node returns a transaction id.
- **Fixed: normal Receive QR now has live incoming detection (v26).** While a Receive modal QR is open for a specific Stables token amount, the app now watches live relevant txpows and node balance changes for that exact address/amount, so the receiving wallet can show `Payment detected` before slower history/mining sync catches up.
- **Added: active merchant receiver watcher (v25).** While the merchant customer-display QR is open, the app now runs a dedicated fast receiver-side loop that matches live relevant txpows by destination address, token, and exact amount so the merchant can see `Payment on its way` before mining. The merchant QR now carries currency/amount/address, and scan-to-pay applies the QR currency on the sender side.
- **Added: side-menu version status (v24).** The More drawer now shows the installed app version at the top beside the language control, with an up-to-date/checking/update-available indicator linked to Settings and updates.
- **Fixed: native MINIMA rows hidden from Stables activity (v23).** Test-channel node history now imports only Stables-related test tokens (Winiwa, USDw, xWiniwa). Native MINIMA transactions made in the Minima wallet are purged from saved Stables activity and no longer render as Winiwa rows.
- **Merchant receive speed for in-store (v22).** When the Invoice "Customer display" (fullscreen QR for a specific amount) is open, arm an ultra-aggressive ~300ms watcher. It forces `stablesFastIncomingScan` (relevant txpow for mempool "on its way") + `stablesRefreshLiveNodeBalances`. Additionally snapshots the token total and directly compares balance detail total delta for the *exact* expected amount — shows "Payment on its way" in the merchant UI the moment the node balance reflects the receive (mempool). This is the critical path for retail: merchant sees the info within a second of send, before any on-chain confirmation. Updates status line, amount display, and toast. Auto-stops on match or close. Bumped for consistent APK packaging.

## [0.0.2.19]
- **Changed: simpler payment popup copy.** The send progress modal now uses short customer-facing labels, hides the full tx hash behind a `View transaction` link, and removes engineering wording while keeping the same live node-backed status loop.

## [0.0.2.18]
- **Fixed: receiver-side live detection loop.** The live node poll now triggers throttled relevant-txpow scans while the wallet is open, so incoming payments are not dependent on balance/history events before appearing.
- **Changed: sender payment wording.** The send modal now says `Accepted by node` for the post-send success step, avoiding an overclaim that peer propagation was independently acknowledged.

## [0.0.2.17]
- **Fixed: payment broadcast speed and status clarity.** Incoming activity now scans live relevant txpows before history so a recipient can see broadcast payments before mining/history indexing; outgoing sends now switch from submitted/sending to broadcasted as soon as the node accepts the send.

## [0.0.2.16]
- **Changed: Wallet total default.** New installs now default the Wallet total scope to all wallet currencies; users can still switch to selected-only in My profile.

## [0.0.2.15]
- **Added: Wallet total scope setting.** My profile now lets users choose whether the Wallet page total balance includes only selected display currencies or all wallet currencies; selected mode now counts selected currencies even when the Wallet list is collapsed.

## [0.0.2.14]
- **Fixed: full sender payment progress restored.** The send popup again shows the full built -> sent -> receipt -> confirmed process; the confirmed Activity replacement-row matcher from v0.0.2.13 remains active so receipt and confirmation steps can advance while the popup is still open.

## [0.0.2.13]
- **Fixed: open sender payment modal now follows the confirmed Activity row.** When node history has already produced the confirmed `Sent ...` row, the still-open send popup matches that replacement by token, amount, address and time so it can move to confirmed instead of remaining on the optimistic local row.

## [0.0.2.11]
- **Changed: receipt syncing uses the spinner again.** The sender modal still says the payment was sent, but the background receipt/final-confirmation step is shown with the normal spinner instead of the yellow waiting dot.

## [0.0.2.10]
- **Changed: sender-side payment UI now treats successful node sends as sent immediately.** A successful `send` no longer leaves the merchant-flow modal spinning at "Checking settlement"; it shows the payment as sent, with the receipt txpow id and final confirmation syncing in the background.

## [0.0.2.9]
- **Fixed: Wallet faucet prompt now ignores native MINIMA.** The main Wallet page onboarding card only hides when Stables-related balances exist: Winiwa, USDw/other Wables, xWiniwa, or their incoming overlays.
- **Fixed: submitted outgoing sends no longer show "Generating send id" in Transaction details.** If a local outgoing row has already been submitted to the node but no mined txpow id is exposed yet, the details panel now shows "Submitted to node" and explains that it is waiting for node history to expose the txpow id.

## [0.0.2.8]
- **Changed: wallet faucet prompt only appears for a fully empty wallet.** The main Wallet page no longer shows the Winiwa faucet onboarding card just because Winiwa is zero; it now checks the surfaced wallet balances across native MINIMA, Winiwa, USDw and other Wables, xWiniwa, and incoming overlays.

## [0.0.2.7]
- **Fixed: MinimaOS faucet level could stay on "Syncing..." while RPC web showed the pool immediately.** Covenant coin reads now accept wrapped MDS responses (`{ coins: [...] }`) as well as bare arrays, and pool/state coin filters normalize Minima boolean flags such as `true`, `false`, `"true"`, and `"false"`.

## [0.0.2.6]
- **Fixed: sender-side payment progress could stay stuck while the receiver already had the funds.** The fast send tracker now resolves settlement from recent node history by hydrating mined txpows and matching the sender's outgoing row by token, amount, and send time, even when the initial `send` response does not expose a useful transaction id. The progress copy now says "Checking settlement" instead of implying the payment is still waiting to mine.

## [0.0.2.5]
- **Fixed: MinimaOS zip opened as the web preview.** Hub URLs with `uid=` are now treated as real MiniDapp runs, the preview platform selector stays hidden, saved web RPC settings no longer open the Pure Minima connect flow inside the installed zip, and the MiniDapp connects through the node MDS session.

## [0.0.2.4]
- **Fixed: 3-test MiniDapp zip packaging for MinimaOS install.** The package builder now excludes `latest-version/`, preventing an old nested `.mds.zip` from being included inside the install package, and the MinimaOS-facing `dapp.conf` description is short again instead of carrying the full changelog history.

## [0.0.2.3]
- **Fixed: wallet-context coinid lookup contaminated `addresses` with other wallets' addresses.** `buildWalletContext` Source 4 fetches spent input coins by coinid to confirm we owned them. But it was adding the returned coin's address unconditionally — so when a covenant mint by **another tester** appeared in history, fetching their Winiwa payment coinid returned their wallet address, which was then treated as ours. `isOurCoin` would pass for all of their subsequent coins, leaking their transactions into our activity. The fix: Source 4 now only records the coinid as owned and adds address variants if the coin's address was already established by keys/coins/scripts (Sources 1–3). Combined with a schema migration bump to purge rows stored under the previous state.

## [0.0.2.2]
- **Fixed: a wallet showed other wallets' transactions.** Every node tracks the shared faucet/USDw/xWiniwa covenants (to read pool/reserve levels), so a node's `history` contains covenant transactions — faucet claims, mints, burns — made by **other** testers, and Minima marks them relevant. The RPC/bare-txpow history path already gated each row on actual wallet ownership, but the MDS/embedded "wrappers" path did **not** — it trusted history's relevance and rendered every covenant transaction as the viewer's own. That path now builds the wallet context and keeps a transaction only when this wallet owns a coin in it (a real input/output at one of its addresses) or signed it. Privacy- and correctness-critical for the test cohort.

## [0.0.2.1]
- **New version line 0.0.2.x** (moving toward the first public test ship). `APP_BUILD_VERSION` is now `0.0.2.0` with the iteration reset to 1; the bump-guard hook now allows the iteration reset when the version line changes (per the documented flow), and the pill/version no longer zero-pads the iteration (reads `0.0.2.1`, not `0.0.2.01`). Zip line bumped to `0.0.0.2.x`.
- **Fixed: a confirmed mint/receive could leave the balance stale (even after minutes).** On a node treated as the issuer, the "tester-sized" balance cap summed coins via a single address (`address:testerMx`). Minima rotates `getaddress`, so a mint/faucet/receive lands at a freshly generated address and was **excluded** — the balance ignored just-received funds (e.g. a confirmed +25.36 USDw mint kept showing the old total). It now sums the wallet's tester-sized coins across **all** its addresses (`relevant:true`), so received funds count immediately.
- **Faster minting build.** The ~12 serial `txncreate`/`txninput`/`txnoutput`/`txnstate` build commands are now sent to the node in a single semicolon-batched call (USDw + xWiniwa mint/burn) instead of one round-trip each, with a safe per-step fallback if a batch can't be validated. Combined with v0.0.1.269's tighter RPC gap + cached covenant tracking, "Building transaction" is markedly quicker.

## [0.0.1.270]
- **Token balances settle to the confirmed value without the post-confirmation lag.** After a transaction showed "confirmed 1/1", the balance could keep showing the held optimistic value because `stablesReconcileOptimistic` only releases a hold when the node value *exactly converges* (or after a 3-min expiry), and nothing released it on confirmation. Now: (1) `forceConfirmedCovenantBalanceRefresh` clears the optimistic holds before refreshing (the tx is on-chain, so the node is authoritative); (2) the brisk balance poll releases a currency's hold the moment it detects that balance increase on-chain, then refreshes to the node value; (3) the covenant confirm chain's initial waits were cut from 5s/4s to 1.5s so the authoritative settle starts sooner. Net: the balance snaps to the real node value right when the transaction confirms.

## [0.0.1.269]
- **Faster "Building transaction".** The build step runs ~16 node commands serially (track covenant, read coins, ~12 `txn*` build steps, sign/basics/check/post) — the later progress steps look instant only because the work is already done. Two safe speedups: (1) the inter-command RPC queue gap is now **20ms for a localhost node** instead of 120ms (it was pure latency for a local node — ~16 commands × 100ms saved ≈ 1.6s off the build on the web/desktop RPC path); (2) the covenant `newscript trackall` is now **tracked once per session and cached** (`ensureCovenantTracked`) instead of re-running on every mint/burn, removing a full round-trip per build.

## [0.0.1.268]
- **Removed the contextual agent icons app-wide.** The small "Ask StablesAgent" icon that appeared on individual popups/cards is gone everywhere: the Currency action sheet (kept the ★ set-as-primary), the Portfolio Simulator drawer (replaced with a real close ✕), transaction details, Exchange details, Merchants, App version, Official notices, and the Feedback roadmap. The main floating agent and the agent dialog (and its avatars/showcase) are unchanged — contextual help will be surfaced from the main agent later. (`transactionDetailsAgentButtonHtml` now returns empty, the title-right slots set empty, and the inline `agent-mini-btn` buttons were stripped; `.agent-mini-btn` CSS is now unused.)

## [0.0.1.267]
- **Every transaction now uses the progress window, shown directly — no more "submitted" toasts.** Mint, burn (USDw + xWiniwa) previously fired amber toasts ("Stables is locking… / Wallet balances will refresh…") around the flow. Those are removed; each flow now opens the stepped transaction progress window **immediately on submit** (seeded on "Building transaction"), then advances Sent → Mining → Confirmed — same as Send and the faucet pour.
- **Balance-update flash indicator.** The total balance and the impacted currency amount(s) now briefly flash (a bright cyan pulse) to signal "your balance is being updated" — on transaction submit and again when the change lands on-chain. Wired into the on-chain incoming/increase detector (flashes the specific currency that changed), the confirmed-balance refresh, and each flow's submit (mint/burn/xWiniwa, faucet, send). New `window.stablesFlashBalanceUpdate(ccy)`; the Winiwa row's internal `data-ccy="WINIMA"` is mapped so it matches.

## [0.0.1.266]
- **Faucet claim really shows as one row now (and keeps its framing).** The v263 amount+time merge was being undone by ordering: `pruneOptimisticRowsSupersededByNode` ran *before* `pruneDuplicateFaucetClaimRows` and dropped the faucet pour row as a generic superseded optimistic — so the claim briefly showed twice and then collapsed to a bare "Received Winiwa" (losing the "Faucet claim submitted" framing, as seen on older rows). Fixed two ways: the faucet merge now runs **before** the generic optimistic-supersede pruner, and that pruner now **skips faucet claim/pour rows entirely** (they're owned by the faucet merge, which keeps the framing). Result: a single "Faucet claim submitted" row from the start.

## [0.0.1.265]
- **Default RPC connect URL is now `http://localhost:9005`** (was `http://localhost:9105`) in the Pure Minima RPC connect field and its hint. 9005 is the RPC of a node on Minima's default port 9001 (9001 + 4), which is the standard local/dev node (Test12), so a fresh connect prefills the right value. A saved URL still overrides the default.

## [0.0.1.264]
- **Faucet cooldown is now enforced from the wallet's on-chain history, not just localStorage.** Previously the 1h cooldown lived only in browser localStorage, so a different browser (or cleared storage) on the same wallet could claim again immediately. The cooldown now also folds in the wallet's real last faucet claim derived from synced on-chain Activity (`stablesGetOnChainLastFaucetClaimTs`, using each node row's txpow header time), so it follows the WALLET. Three places: the button countdown (`stablesFaucetWiniwaRemainingMs` consults the on-chain time), the faucet page open (now pulls on-chain history then re-renders the countdown), and an **authoritative gate at claim time** — the claim first syncs on-chain history (bounded ~4.5s) and re-checks, persisting the on-chain time to the local key, so a fresh browser is blocked and the just-opened progress popup is dismissed with a "try again in …" notice. (Note: this is robust app-level enforcement against the different-browser bypass; it is not an on-chain covenant-level per-claimant limit.)

## [0.0.1.263]
- **Faucet claim no longer shows two rows ("Faucet claim submitted" + "Received Winiwa").** The optimistic pour row tracks the mempool transaction id, but the node-history "Received Winiwa" row carries the mined txpow id — in Minima these can differ, so the existing hash-based merge missed and the claim showed twice before resolving. `pruneDuplicateFaucetClaimRows` now has an amount + close-time fallback: a generic `NODE-` Winiwa receive that matches a faucet pour by amount (and within 15 min) is grouped with it and merged, so the claim shows as a single row from the start. The fallback only applies while a faucet pour row exists (right after a claim), so an unrelated same-amount receive later is unaffected.

## [0.0.1.262]
- **Bigger, clearer "get started" nudge on an empty wallet.** The small one-line "Get Winiwa from the faucet…" hint at the top of the Wallet page is now a prominent card (faucet icon, a bold "Get started with Winiwa" heading, the explainer line, and a full-width "Open the faucet" button) shown until the wallet holds Winiwa. Same show/hide trigger, much higher visibility for first-time users.
- **Faucet progress popup now appears the moment you tap claim.** Instead of waiting until the claim posts, the transaction progress popup opens immediately on tap, seeded on "Building transaction" (active), then advances through Sent → Mining → Confirmed as the pour posts and settles. It is dismissed if the build/post fails. (Added a `building` seed to the shared tracker for the pre-post state.)

## [0.0.1.261]
- **Incoming payments now show (and notify) within ~1s on every surface.** The recipient previously only reacted instantly on the MinimaOS hub (which pushes NEWBALANCE/NEWTXPOW events); on the web-RPC and embedded-APK node paths (no push events) an incoming Winiwa/USDw/xWiniwa only surfaced on the slow full-sync cycle, so it lagged far behind the native Minima wallet. The brisk balance poll (~1.2s) already fetches the full `balance` — it now also watches the **test-token** totals/sendable in that same response (no extra network) via `stablesDetectIncomingFromBalanceResponse`. On any increase it fires the existing fast-watch (which ingests the txpow, creates the receive row and shows the "Incoming X" notification) plus a balance refresh. Detecting the **total** catches a mempool/unconfirmed receive the instant it is sent to the network; detecting **sendable** catches confirmation.

## [0.0.1.260]
- **One unified on-chain progress popup for every transaction type.** The stepped "Send submitted" tracker (Transaction built → Sent to network → Mining on-chain → Confirming/Confirmed, driven live off the activity row) is now shown for **mint, burn, and the faucet pour** too, not just sends. Exposed `window.stablesShowTxProgressModal` (a thin generic wrapper over the send tracker, with a "Transaction progress" section header) and wired it into all five covenant flows (USDw mint/burn, xWiniwa mint/burn, faucet claim) at submit time, each tracking its receive/pour row through to confirmation.
- **Replaced the bespoke faucet pour animation** with that shared popup: the floating pour-status card (`renderFaucetPourStatusSurfaces`) is now suppressed and the faucet claim shows the same progress tracker as every other on-chain action, so the experience is consistent across the app.

## [0.0.1.259]
- **No more flashing duplicate Activity row that collapses to one.** An incoming/receive leg (e.g. the "Received USDw" half of a mint) could briefly show as two rows — the optimistic local row and the node-detected row — before the reconcile pass merged them on a later sync. Outgoing sends already had an immediate fuzzy merge (`outgoingSendMatch`); added the symmetric `incomingReceiveMatch` (amount + currency + close-time, same 0.01 tolerance) so the node row absorbs the optimistic one in the **same** upsert, and the duplicate never paints. The surviving row keeps the friendlier framing (e.g. "Minted USDw" / "Protocol (USDw)") rather than collapsing to a bare "Received".

## [0.0.1.258]
- **Mint/burn confirm screen no longer shows a meaningless truncated address.** The "Counterparty" row displayed a clipped, non-clickable miniaddress (e.g. `MxG080UYSF0KKN0UVHEK0Y…`) for USDw mint/burn and xWiniwa mint/burn. The counterparty of a mint/burn is always the on-chain protocol covenant, so it now reads a clear label — **Protocol (USDw)** or **Protocol (xWiniwa)** — at all four call sites, with the render-level fallback also a label (never a sliced address), and the row's monospace/break styling dropped since it's no longer an address.

## [0.0.1.257]
- **Balance now updates in lockstep with a confirmation.** A just-confirmed incoming receive (or a settling mint/burn) showed "confirmed 1/1" in Activity while the wallet balance still read the old amount, because the node-history sync and the per-token balance poll ran on independent cycles. `stablesSyncNodeTransactions` now kicks an immediate `stablesRefreshLiveNodeBalances` whenever it imports new/changed rows (gated on `imported`, fire-and-forget), so the total updates as soon as the transaction lands instead of waiting for the next balance poll.
- **xWiniwa Activity rows no longer show the raw token id.** The history-sync token map added Winiwa and USDw from the registry but omitted xWiniwa, so a received xWiniwa was labelled with its raw id (e.g. "Received 0x5d0cbe…" / "+123.00 0x5d0cbe…"). Added xWiniwa to that map (new rows), and added `repairRawTokenIdLabelRows` to the reconcile pass to relabel any already-stored row whose ccy/title is a raw (or truncated) test-token id back to its proper name (Winiwa / USDw / xWiniwa).

## [0.0.1.256]
- **Activity can no longer show "Received [object Object]".** An xWiniwa mint could log a corrupt twin of the real "Received xWiniwa" row because a nested Minima token object (`coin.token = { name: { name: 'xWiniwa' } }`) had been `String()`'d into the literal `"[object Object]"` and baked into the row's `ccy`/`title`. Hardened three ways in `activity-contacts.js`: (1) `tokenLabelFromRow` now resolves the label from the **token id via the live config map first** (authoritative, immune to a corrupted name field) before consulting any name field; (2) `tokenNameString` treats the literal `"[object Object]"` (and any `"[object X]"`) as an unknown name so it falls through to the id; (3) new `pruneCorruptTokenLabelRows` in the reconcile pass drops any already-stored row whose `ccy`/`category`/`title` still carries the corrupt label — it is always a duplicate of the correctly-labelled row, and balances derive from coins, not the log.
- **Live-covenant verification (in-app, mainnet):** confirmed the USDw mint flow end-to-end on the device build — spent 55 Winiwa, minted 0.294575 USDw against the live USDw covenant (`confirmed 1/1`), and re-confirmed xWiniwa mint on the freshly redeployed covenant.

## [0.0.1.255]
- **Currency pickers now float held tokens to the top.** In every currency dropdown the tokens with a balance > 0 are listed first, above the coming-soon currencies, instead of being buried below them (the Send picker previously showed xWiniwa under eight "SOON" fiat). Done in the two shared renderers so it applies app-wide: `refreshVaultCurrencyDropdown` (Send, Receive, Mint, Burn, invoice, coverage fund, LP — partitions `getCodesFn()` held-first, re-run on each open) and `refreshExchangeCcyDropdownBalances` (Exchange from/to — reorders rows held-first on open). Held tokens and zero-balance tokens each keep their original relative order. The Wallet page's main currency list keeps its user-set (drag-to-reorder) order.

## [0.0.1.254]
- **Currency edit: the star is now tappable to set the main currency directly.** It was `pointer-events: none` (indicator only — you had to press + to add, then tap the row), so its existing click handler (which adds the currency if needed, then sets it primary) never fired. In edit mode the star now takes pointer events, so one tap on a star makes that currency your main one, adding it first if it wasn't shown.
- **Edit mode auto-exits on an outside tap.** A capture-phase document click listener turns edit mode off as soon as you tap anywhere outside `#walletCurrenciesSection` (the pen and all in-section controls are inside it, so they don't trigger it).

## [0.0.1.253]
- **My Assets moved to the top of the More menu**, directly after the Faucet (Testing phase) section and above Merchants & Exchange.

## [0.0.1.252]
- **More menu reorganised: new "My Assets" section.** Split the "Merchants & Exchange" group — **My transactions** and **Portfolio simulator** moved into a new **My Assets** section, joined by a new **Wallet management** entry. Merchants & Exchange keeps On/Off Ramp, Ambassadors, My shop and Exchange.
- **New Wallet management page** (`page-wallet-management`) — the foundation for UTXO/notes management:
  - **Your notes:** introduces the "coins as banknotes" model and shows a live per-token note count, total, and dust flag (`stablesRefreshWalletNotes` reads `coins relevant:true`).
  - **Privacy level:** Regular vs Merchant (stronger). Merchant forces dust auto-sweep off (no automatic address-linking) and warns harder before consolidation.
  - **Consolidation:** explains lazy consolidation (combine only when a payment needs it), with an auto dust-sweep toggle and user-set thresholds (dust size, tidy-up reminder), all persisted (`stables_wallet_mgmt_v1`).
  - **Tidy up now:** manual `consolidate` per token, feeless, gated by a privacy-level-aware "this publicly links the addresses" confirmation.
  - Note: this ships the framework + settings + live notes view + manual consolidation; the lazy/just-in-time staged-send engine and advanced coin control are the planned follow-ups.

## [0.0.1.251]
- **Send progress tracker no longer regresses, and now reaches Confirmed.** The "Send submitted" stepper recomputed its state each poll from the tracked optimistic row, but once that row is superseded/merged into the node-synced confirmed row (or its fields briefly flickered during a re-sync), `stablesGetSendProgressById` lost the row and reset — so it could show "Mined on-chain" then jump back to "Sent to network" and never reach "Confirmed" even though Activity showed `confirmed 1/1`. Fixed two ways: (1) a **monotonic latch** (`SEND_PROGRESS_LATCH`) so built→sent→mined→confirmed only ever advances; (2) `findActivityRowByTxRef` **follows the transaction to its current row** by txpow/mempool id when the original id vanishes, so the stepper tracks through the optimistic→node handover to Confirmed.
- **Send stepper uses present tense while in progress.** The active step now reads "Sending to network" / "Mining on-chain" / "Confirming" (present continuous) and switches to the completed past tense ("Sent to network ✓") once done, instead of showing a past-tense label for a step still happening.

## [0.0.1.250]
- **xWiniwa is now sendable.** It was shown as "SOON" in the Send/Receive currency picker even though the send executor already maps xWiniwa to its token id and routes it as a real node send (alongside Winiwa and USDw). The only blocker was the `stablesIsSendReceiveCode` gate, which now includes `xWiniwa`. Available balance and the send all resolve through the existing `getVaultBalance`/sendTokenId paths.
- **Wallet edit view: the + / − add/remove buttons now line up on the right.** They were appended into each card's right-aligned balance cell and flowed below the balance, so their x-position drifted with each currency's balance width / card height. The toggle is now absolutely positioned at the row's right edge and vertically centred (`.ccy-row-toggle` → `position:absolute; right:12px; top:50%`), with `padding-right` reserved on the row so it never overlaps the balance — every + / − aligns regardless of balance.

## [0.0.1.249]
- **Fixed an xWiniwa mint showing three Activity rows instead of two.** A mint (lock Winiwa → receive xWiniwa) was rendering as "Sent Winiwa" + "Received 0x5d0cbe" + "Minting xWiniwa". Two bugs: (1) `liveTokenMapFromConfig` in [activity-contacts.js](assets/routes/activity-contacts.js) only mapped Winiwa and USDw, so the node-detected xWiniwa receipt fell back to the raw token id (`0x5d0cbe`) instead of "xWiniwa" — added xWiniwa to the map. (2) There was no dedup merging that node receipt with the app's own optimistic "Minting xWiniwa" row (the existing `pruneOptimisticRowsSupersededByNode` only drops local rows that have **no** txpow hash, and the mint row gets one once posted). Added `pruneIncomingCovenantDuplicates`, which drops a node incoming row when a local incoming row shares its txpow hash — so the mint now shows the clean "Sent Winiwa" + "Minting xWiniwa" pair (covers USDw/xWiniwa mint and burn receive legs). Also fixed `tokenLabelFromRow` returning **"[object Object]"** for a node-attributed receipt: a Minima coin's `token`/`name` field is a nested object (`{name:{name:'xWiniwa',description}}`), and a naive `String()` stringified it — it now recursively unwraps to the plain token name (so an unmatched node receipt at least reads "Received xWiniwa").
- **On-chain token reference panel now shows the current xWiniwa token + covenant.** `populateFaucetTokenRefs` didn't fill the `xwiniwa` / `xwiniwa-covenant` reference rows, so they still showed the retired (orphaned) token `0x75656BEA…` and covenant `0xF47906E9…`. They are now config-driven (new token `0x5D0CBEB1…`, covenant `0x1AAEBCAE…`), and the static fallback markup was updated to match.

## [0.0.1.248]
- **Network-status message is now a slide-in pill beside the top-bar dot.** Replaced the centered "Your bank is connected to the network ✓" popup (standalone app) with a small pill anchored just left of the status dot: it slides in from the right edge of the screen, shows **"Connected"** (green dot) or **"Connecting"** (amber dot), holds for ~3 seconds, then slides back out to the right. Driven by network-state transitions (`stablesFlashNetStatus` / `stablesMaybeFlashNetStatus` in `stablesUpdateNetworkUI`), so it flashes whenever the dot turns green or amber. On app open the native startup splash has already connected the node (so the transition fires while hidden), so the WebView's `onPageFinished` calls `stablesFlashRevealNetStatus()` to flash the current state once the dapp is actually on screen. Web preview keeps its existing toast.

## [0.0.1.247]
- **Fixed xWiniwa mint/burn failing for fresh wallets — xWiniwa redeployed on mainnet.** Root cause: the previous xWiniwa token (`0x75656BEA…`) and its reserve-release covenant (`0xF47906E9…`) had been seeded off an unconfirmed change coin and were **orphaned off the canonical chain**, so a clean/fresh node could neither see nor spend them — every mint built against a covenant coin the node didn't have and failed. Fix: freshly created a new xWiniwa token `0x5D0CBEB1…` (supply 1,000,000) and redeployed the covenant at `0x1AAEBCAEBCBD…` (miniaddress `MxG080QYQUATF5TC…`), then seeded it from **confirmed** coins (pool 1,000 Winiwa, reserve 100,000 xWiniwa, one state coin tag 17) so it is canonical and visible to fresh nodes. **Both mint and burn proven on-chain:** mint tx `0xC31373E5…` confirmed (10 xWiniwa released, 10 Winiwa locked), burn tx `0x7DE80F28…` confirmed (covenant returns to pool 1,000 / reserve 100,000). `runtime-config.js` now points at the new token + covenant (id, address, miniaddress and the minified covenant script, which hashes to the new address); covenant ports, state tag (17) and the feeless build are unchanged.
- **Raised the Android node-bridge command timeout from 10s to 60s (fixes "Node command timed out" mint/send/claim failures).** The standalone APK's WebView-to-node bridge capped every node command at 10 seconds. On an embedded node still syncing (or any loaded device) a single `getaddress`/`balance` routinely takes 8-10s, so the cap was firing constantly mid-flow and returning "Node command timed out" — surfaced to the user as a failed mint/send/faucet claim even though nothing was actually wrong (the repeated "getaddress took 10010 ms" log lines were the timeout firing, not slow successes). The cap is now 60s, which sits above the JS-layer per-command timeouts (30-70s) so they remain the control plane, while still bounding a genuinely hung command on the single-threaded executor. (Android-only change; web/zip unaffected.)
- **Covenant transactions now require `mmrproofs` before posting (no more false debits).** All three on-chain covenant paths (faucet claim, USDw mint/burn, xWiniwa mint/burn) previously gated `txncheck` on `scripts && basic` only. On a freshly-synced node that just started tracking a covenant address, the pool/reserve coins can be present **without a current MMR proof**, so `txncheck` passed scripts+basic, the transaction posted, the wallet was optimistically debited — and then the transaction was orphaned by mainnet peers (invalid proof), reverting the balance. The gate now also requires `valid.mmrproofs`; when proofs aren't ready yet it throws a clear "your node is still syncing the pool, wait for the green light and retry" instead of posting a doomed transaction. The actual `txncheck` flags are now always logged for diagnosis. (This matched the already-correct reset-burn gate.)

## [0.0.1.246]
- **Balance no longer flashes "only the remaining UTXO" while a transaction processes.** When you spend a coin, Minima consumes the input immediately but the change output is unconfirmed for a few blocks, so the node's `sendable` briefly collapses to whatever other coins you hold. The v245 optimistic guard already held the expected value, but on a debit it released as soon as the node reported a *lower* value — which is exactly that dip. `stablesReconcileOptimistic` now holds the expected value until the node's balance **converges** to it (within a small relative tolerance), in either direction, so the balance stays steady through the change-confirmation window for sends, mints, burns and claims. Still releases on convergence or the 3-min safety expiry.

## [0.0.1.245]
- **Balances reflect a confirmed mint/burn/send/claim immediately and don't revert.** The wallet was already credited/debited optimistically, but `applyTestTokenBalances` then overwrote it with the node's `balance`, which lags (a received coin isn't counted until it has enough confirmations; a spent coin lingers) — so the balance snapped back to a stale number even though Activity showed "confirmed 1/1". Added a direction-aware optimistic guard: `stablesSetOptimisticBalance(ccy, value, 'in'|'out')` records the expected value, and `applyTestTokenBalances` reconciles each node value through `stablesReconcileOptimistic` — on a credit it won't drop below the expected value until the node reaches it; on a debit it won't rise above; it releases when the node catches up or after 3 min. The detail cache (the "Sendable" subline) is overlaid to match. Registered at every balance-changing site: USDw mint/burn, xWiniwa mint/burn, Winiwa/USDw/xWiniwa send, and faucet claim; failure paths clear the guard so a failed op doesn't hold a wrong value.

## [0.0.1.244]
- **Fixed: "Get 1,000 Winiwa" did nothing.** `openFaucetClaimConfirm()` still ran `document.getElementById('faucetConfirmFee').textContent = 'Free'`, but that fee row was removed in v242 when faucet claims became free — so the call threw a null-reference error, the confirm modal never opened, and the button looked dead. Removed the dead line; the claim confirm opens again. (The mint/burn confirm fee/network setters were already `if (el)`-guarded, so they were unaffected.)
- **Mint confirm tidy-up:** removed the "Network: Minima test (Test12)" row and the "This builds and signs a covenant transaction… test tokens with no official value." paragraph from the mint/burn confirm screen.

## [0.0.1.243]
- **Faucet 1-hour cooldown is now enforced across app restarts.** The cooldown timestamp is stored under a per-wallet key (`…_<walletSuffix>`), but the suffix is a window global set only during a claim, so on a fresh app launch (every APK open) the read used the un-suffixed key, found nothing, and the button showed "Get 1,000 Winiwa" with no countdown — letting claims repeat within the hour. Fix: (1) the suffix is now persisted (`stables_faucet_cooldown_suffix_v1`) and re-established on load; (2) `stablesFaucetWiniwaRemainingMs` now takes the most recent claim time across the primary key **and any per-wallet suffixed keys**, so the cooldown is found regardless of suffix state (also recovers an existing cooldown written before this fix). The button shows the countdown and blocks repeat claims.

## [0.0.1.242]
- **Removed native MINIMA as a holdable asset (kept the Minima node/network/chain infrastructure).** Now that every on-chain flow is feeless, native MINIMA is no longer surfaced as a token, removing the Winiwa-vs-Minima confusion. Removed: the Minima row in the My investment portfolio summary; the `#ccyRowNativeMinima` wallet currency row; MINIMA from `stablesIsSendReceiveCode` + `SEND_RECEIVE_SOON_CCY_LIST` (Send/Receive no longer lists Minima); the faucet "Your Minima balance" block. `currencyDisplayLabel('MINIMA')` now falls back to "Winiwa" so any residual path can't leak a "Minima" token label, and the asset text mask continues to convert non-infrastructure "Minima" prose to "Winiwa". Node/network/chain wording and "By Stables on Minima" are unchanged.
- **Removed all fee mentions** (the flows are feeless): the faucet "Network fee" row + confirm-modal fee row, the mint/burn confirm "Signing fee" row, the "signing fee is burned by the network" sentences, the More-drawer "network signing fee 0.0001 MINIMA" copy, and the mint/burn confirm dialogs no longer mention a 0.0001 Minima signing cost.
- **Onboarding nudge moved to the Wallet page.** "Get Winiwa from the faucet, then mint or burn xWiniwa and USDw." now sits at the top of the Wallet page (was on Mint), drops the "(1,000 per hour)" detail, and **auto-hides once the user holds any Winiwa** (`stablesSyncWalletGetWiniwaHint`, driven by `updateGlobalUI`).

## [0.0.1.241]
- **USDw and xWiniwa mint/burn are now feeless too.** Same proven pattern as the faucet: `mintBurnCovenantOnChain` (USDw) and `xwiniwaCovenantOnChain` (xWiniwa) drop the MINIMA float input and change; the new state-coin dust (LAST output) is set to the consumed state coin so the native (0x00) token balances exactly with **burn 0**; the "you need 0.0001 MINIMA to sign" gates are removed and the confirm `feeText` reads "Free". Both covenant scripts reference no MINIMA, so this is an off-chain build change only. A 0-MINIMA wallet can now mint and burn.
  - **Proven on mainnet:** built a feeless USDw mint against the live covenant `0x3FF52041…` → `txncheck` `{basic, signatures, mmrproofs, scripts}` all true (2 covenant inputs + user Winiwa, no MINIMA, burn 0). xWiniwa uses the identical build. (Full end-to-end mint/burn is exercised on the emulator: feeless faucet → mint → burn.)

## [0.0.1.240]
- **Faucet claim no longer appears twice in Activity.** The optimistic faucet row (`FAUCET-POUR-WINIWA`) and the node-sync "Received Winiwa" row (`NODE-<txpowid>:winiwa`) are the same on-chain event but were keyed differently, so both survived. `pruneDuplicateFaucetClaimRows` now also pulls a node incoming-Winiwa row into the faucet group when it shares a faucet-pour row's txpow hash, keeps one row, and forces the faucet framing ("Faucet claim submitted" / "On-chain faucet covenant") onto the survivor even when the highest-ranked row was logged generically as "Received Winiwa".

## [0.0.1.239]
- **Feeless Winiwa faucet — a fresh wallet with 0 MINIMA can now claim.** The claim no longer requires a 0.0001 MINIMA signing fee. Worked through the covenant coin math (`faucet_covenant.kiss` references no MINIMA; the 0.0001 was only an optional network burn): the claim spends just the covenant **pool coin + state coin**, and the new state-coin dust (LAST output) is set to the consumed state coin's amount so the native (0x00) token balances exactly with **burn 0**. `claimFaucetCovenantOnChain` drops the MINIMA input and change; the **pre-claim MINIMA gate** (which produced the "Pour blocked: you need 0.0001 MINIMA" card) is removed; the optimistic MINIMA debit after a claim is removed; faucet copy now reads "Network fee: Free" / "Faucet claims are feeless" (page, confirm modal, cooldown hint). Mint/burn covenants (USDw, xWiniwa) are unchanged — they still use a MINIMA fee.
  - **Proven on mainnet before shipping** (per COVENANT_ENGINEERING_PLAYBOOK §1/§6): built the feeless claim against the live Test12 node → `txncheck` returned `{basic, signatures, mmrproofs, scripts}` all true; posted with `burn:0`, 2 inputs (pool + state, no MINIMA), 3 outputs; mined in the next block (txpow `0x65002086DA3FE68B21F809351FA44D4FACACC802F2D7DC39AD637553E650431F`, block 2179571) — pool rolled 33,000 → 32,000 Winiwa and a fresh recipient address received 1,000 Winiwa.
- **Faucet level reliability.** `stablesRefreshFaucetLevel` now retries an empty read up to 4 times (3s apart) before trusting a "0", while any positive read still shows immediately — fixes the false "0 Winiwa" from one-shot read/index timing on a fresh node.

## [0.0.1.238]
- **Faucet level: fast + correct.** `stablesRefreshFaucetLevel` was slow and could show a false "0 Winiwa". Now: (1) it ensures the node tracks the faucet covenant once per session (`ensureFaucetCovenantScript`) before reading — a fresh RPC session / embedded APK node that wasn't tracking the covenant previously read empty and rendered 0; (2) it reads via the urgent path (`findCovenantCoinsUrgent`, bypassing the polling queue) so the amount returns fast; (3) any positive read is shown immediately regardless of sync heuristics (fixes the web case sitting on "Syncing…" even though the pool — 33,000 Winiwa — was readable, because `stablesNodeIsSynced()` isn't always set on the RPC path); (4) a zero read only renders "0 Winiwa" when the node is genuinely synced and we didn't just start tracking, else it stays "Syncing…" and retries once after 3s.
- **Pour status card: fixed + non-jumping.** Kept the v233 `position: fixed` floating card and added a reserved text area: `.faucet-pour-status-card__detail` now has `min-height: 56px` (sized for the longest multi-line pour message) and `font-size: 13px`, so the card keeps a stable height and neither the page nor the card's own contents move as the message changes through the pour.

## [0.0.1.237]
- **xWiniwa default placeholder price: 1 xWiniwa = 0.1 Minima (Winiwa).** New config knob `TEST_XWINIWA_PRICE_WINIWA: 0.1` in runtime-config; index.html reads it into `TEST_XWINIWA_PRICE_WINIWA` and a new `xwmSimUsdPrice()` returns `TEST_XWINIWA_PRICE_WINIWA * SIM_Winiwa_PRICE` in the test covenant channel (else the old leverage-derived demo price). All three `SIM_XWM_PRICE` assignments now call it, so **portfolio valuation, wallet equivalents and exchange** value xWiniwa at 0.1 Minima (via `stablesWalletConversionRate` / `investSummaryRateToBase`). Scope limited per decision: the **on-chain mint/burn covenant stays fixed 1 Winiwa ⇄ 1 xWiniwa** — the mint/burn amount calc and the mint-page price rows (`xwmPriceDisplay`, `xwmMintWiniwaPriceDisplay`, both on `#page-mint`) are unchanged and keep showing the real 1:1, so nothing the node actually does is misrepresented. Replace the one config value with a real market (orderbook DEX) price later.

## [0.0.1.236]
- **"Send submitted" window is now a live progress tracker, not static.** It renders a 4-stage stepper — **Transaction built → Sent to network → Mined on-chain → Confirmed** — that advances in real time, each stage showing a green check (done), spinner (active) or hollow dot (pending), with the mempool id, the clickable on-chain explorer id, and block confirmations (`N/target`) as they resolve. New `window.stablesGetSendProgressById(rowId)` in activity-contacts.js derives the stage flags from the live activity row using the same confirmation logic the Activity page uses (`txConfirmations` / `CONFIRM_TARGET`); `stablesShowSendResultModal` renders the stepper (`stablesSendProgressHtml`) into `#stablesSendProgress` and the 1.5s poller now re-renders the whole tracker and keeps running until the send is **confirmed/failed** (was: stopped as soon as the txid appeared). Self-terminates on confirm/fail, modal close, content swap, or a 180s budget. Replaces the v234 static-id-only update.

## [0.0.1.235]
- **Fixed the giant StablesAgent logo artifact in pop-ups.** The "Ask StablesAgent" mini button (`.agent-mini-btn`) had **no CSS at all** for its `agent.png` image — only `.agent-fab img` was ever sized. So in every place that button renders (transaction details modal, "App version"/Council-communications cards, and the 3 feedback cards) the image fell back to its natural resolution and burst out of the 34×34 button as a huge logo overflowing the popup. Added `.agent-mini-btn` + `.agent-mini-btn img` rules (icon pinned to 20×20, button styled as a chip with `overflow:hidden` as a hard guarantee no oversized child can ever spill again). Whole-app `<img>` audit done: all 8 previously-unsized images were `agent.png` inside `.agent-fab` (already sized) or `.agent-mini-btn` (now sized) — no other oversized-image artifacts remain.

## [0.0.1.234]
- **"Send submitted" window now updates live.** Previously `stablesShowSendResultModal` rendered once (`content.innerHTML = body`) and never refreshed, so its Transaction id stayed on "Generating send id" even after the send was mined and the recipient already had the txid. Fix: the tx-id area is now a re-renderable block (`#stablesSendResultTxBlock`, built by `stablesSendResultTxBlockHtml`), and a 1.5s poller (`stablesStartSendResultModalTxPoll`) reads the tracked activity row by `rowId` (new `window.stablesGetUserActivityRowById` over `USER_ACTIVITY`) and re-renders just that block when the mined `explorerTxId` resolves (flipping "Generating send id" → a clickable explorer link) or when the mempool id appears. The poller self-terminates on resolve / modal close / content swap / a 180s budget, and `closeAgentActionModal` stops it explicitly. The send flow now passes `rowId: sendRowId` into the modal; the settlement tracker (`stablesTrackOutgoingSendSettlement`) already populates `explorerTxId` on that row, so no new resolution logic was needed.

## [0.0.1.233]
- **Faucet level is now honest (no false "0 Winiwa").** Verified on mainnet (Test12 node): the faucet covenant `0xF38393DF…` holds a Winiwa coin with `tokenamount: 33000`, `storestate: false`, `spent: false` — the pool is full, not empty. The old reading was wrong because `coins address:<covenant>` returns empty during the node's initial block download, and `stablesRefreshFaucetLevel` rendered that as a hard "0 Winiwa" (and the pour threw "Faucet pool is empty… issuer must seed"). Fixes: (1) the level reader now gates on `stablesNodeIsSynced()` + `__STABLES_LIVE_NODE.rpcOk` and reads via `mdsCmdData` so it can tell a real array response (trustworthy, may be a true 0) from an error/non-array (inconclusive); when not synced or inconclusive it shows "Syncing…", never a fake 0. (2) The covenant pour now distinguishes "node not synced (pool unreadable, not empty)" from a genuinely empty pool and messages accordingly.
- **Pour no longer shifts the page.** The pour status card (`.faucet-pour-status-card`) is now `position: fixed` (floating, bottom-centre, dismissible via a × button), so showing/hiding it never reflows the faucet page. Pour progress and result text are routed into that card instead of the inline `#faucetCooldownHint` `<p>` (whose growth was the other source of jump), and the success/failure hint writes were removed. `focusFaucetPourStatusInline` no longer scrolls to the card (it is always on-screen while on the faucet page), avoiding a scroll jump. The card lives inside `#page-faucet`, so it auto-hides on other pages; `.page` has no transformed ancestor, so fixed positioning is viewport-correct.

## [0.0.1.232]
- Real native Minima (tokenid 0x00) is now a first-class asset across the send sequence, distinct from the Winiwa test token. (1) Label: `currencyDisplayLabel('MINIMA')` now returns "Minima" instead of "Winiwa". The surfaces that show the native asset carry `data-no-minima-mask` so `stablesMaskNativeMinimaFrontendText` leaves the legitimate label alone — added to the currency action sheet (wrapped when the asset is MINIMA), the wallet `#ccyRowNativeMinima` row, the Send/Receive currency selector (trigger label + hint + dropdown panel for both `sendCcy` and `reqCcy`), and `#sendAvailLine`. So tapping the Minima position now shows "0.2674 Minima", not "Winiwa". (2) Availability: Minima is now selectable and sendable in the Send and Receive windows — added `MINIMA` to `stablesIsSendReceiveCode` and to `SEND_RECEIVE_SOON_CCY_LIST` (after Winiwa). The on-chain path was already fully wired (`stablesExecuteSendPayload` maps MINIMA -> tokenid 0x00 native send; `formatAvailableLineForVaultCcy`, `formatBalanceForWalletDropdown` and the MAX helper already handled MINIMA) — it was only gated off in the selector. The Winiwa test token (WINIMA) is unchanged.

## [0.0.1.231]
- My investment fixes following review: (1) the real native asset row now stays labelled **Minima**. The table writes "Minima", but `stablesMaskNativeMinimaFrontendText` (the Minima->Winiwa asset text mask) re-runs on every DOM mutation and was rewriting it to "Winiwa"; added `data-no-minima-mask` to that row's `<tr>` (the same exemption the faucet MINIMA-fee block uses) so the mask skips it. The first row (the Winiwa test asset) stays "Winiwa". (2) Clearer clickable affordance: each tappable position row now ends with a cyan chevron (›, visible at rest — not hover-only, which matters on touch) and its label carries a dotted cyan underline; hover brightens both and nudges the chevron, and `:active` gives a press flash. Added a 4th (chevron) column to the table; the non-interactive "Liquidity funds" and "Total" rows get an empty chevron cell so columns stay aligned.

## [0.0.1.230]
- My investment → Portfolio summary now surfaces every position and makes each one actionable. Renamed the first row from "Winiwa (test)" to "Winiwa" and the native-node row stays "Minima" (the older build still showed it as "Winiwa"), matching the wallet currency list. The full position set already rendered (Winiwa, Minima, xWiniwa, enabled stables, and the coverage fund) — each asset row is now tappable and opens the existing send / receive / exchange sheet via `openCurrencyActions(code)` (the same sheet a wallet row opens). The coverage fund row (USDwcf) opens its own panel via `setInvestTab('cf')` since send/receive/exchange does not apply to a fund position. Added a tap-affordance hover style (`#investSummaryTableBody tr.invest-row`) and a "Tap a position to send, receive or exchange it" hint in the card. The "Liquidity funds" and "Total" rows stay non-interactive.

## [0.0.1.229]
- Top-bar network status light now reflects true sync state instead of just RPC reachability. Previously `stablesGetNetworkStatus` returned `connected` (green) as soon as `L.rpcOk` was true, so the light was green even while the embedded node was still doing initial block download (IBD) and silently dropping incoming transactions — masking why submitted txns never confirmed. Now: red = not connected (node down / unreachable), amber = connected to the node but not yet synced (catching up / IBD / tip unknown), green = connected AND synced to chain tip. Sync is detected via tip-block-time freshness: the in-process node's `status` `chain.time` is in the device's own timezone, so a synced node's tip is seconds old while an IBD node's tip lags; `stablesNodeIsSynced()` returns true only when the tip is within 5 min of now (`stablesRecordNodeTipTime` captures it on each status poll). Verified across all states headlessly.

## [0.0.1.228]
- The floating StablesAgent button (`.agent-fab`, z-index 750) no longer overlaps modals/popups. Several modals sit below z-index 750 (e.g. `#agentActionModal` "Transaction details" at 645), so the FAB and its halo rendered on top of them. Added a CSS rule — `body:has(.mback.open) .agent-fab, body:has(.dback.open) .agent-fab { display:none !important }` — that drops the FAB out of view for the duration of any modal/drawer overlay and restores it after. Covers all current and future overlays without per-modal z-index chasing (`:has()` is supported in the Android WebView + Chrome).

## [0.0.1.227]
- Faucet "Your Minima balance" + "0.0001 MINIMA per faucet claim" now display as native MINIMA instead of being flipped to Winiwa by the asset text mask. The signing fee is paid in native MINIMA, so that block is the correct balance to surface. Fixed by adding `data-no-minima-mask` to that block (the "Faucet level" block below it stays Winiwa, the test asset). The value is set as MINIMA by `syncFaucetMinimaBalance`.
- Notification consistency: `stablesShowCertErrorPopup` (node connection / cert errors) now routes through the standard `showToast` notification card (amber) instead of its own bespoke fixed popup, so all transient notices share one look. Legacy inline popup kept only as a fallback when showToast is unavailable.

## [0.0.1.226]
- Moved the floating StablesAgent button's show/hide control into the StablesAgent dialog header (a ◎/⊖ toggle in the header, next to the close button) and removed the "Show agent icon" entry from the More menu. The toggle reflects current state and flips it; the post-delete notice now points to the StablesAgent window instead of the menu. The agent dialog stays reachable without the floating button via the per-section assistant buttons.

## [0.0.1.225]
- The StablesAgent floating button (`.agent-fab`) is now a true movable floating icon. Replaced the old HTML5 `draggable` (which only supported drag-to-delete and barely worked on touch) with Pointer Event handling: drag it anywhere (touch + mouse), clamped to the viewport, and its position persists across sessions (`stables_agent_fab_pos`). A short move threshold distinguishes a tap (opens the agent) from a drag (moves it); deletion is now via the close (×) button only.
- Made agent-button recovery discoverable: deleting it now shows a notice pointing to More menu → "Show agent icon" (the restore entry that already existed but was easy to miss).

## [0.0.1.224]
- Vault key (seed phrase) backup no longer hangs on "Reading from your node..." when the embedded node is mid-sync (IBD). The Vault key is a fast local wallet read, but during IBD every node command takes several seconds and the live balance/block poller kept the command queue full, so the `vault` call could appear to never return. `stablesRevealSeed` now pauses the live node poller for the duration of the read, runs a single prioritized `vault` via `stablesNodeCommandWithTimeout` (30s bound), and on timeout/failure re-enables the button with a clear "node is still syncing — try again" message. Polling is always resumed afterwards. Diagnosis from logcat: `StablesNodePathHandler [getaddress] took 10007 ms`, `[keys] took 6959 ms` during IBD.

## [0.0.1.223]
- Unified the in-app message styling so notices no longer collapse into the amber "oval" pill. `showToast` now auto-renders longer / multi-line messages as the rounded-rect notice card (`toast--prose`) and keeps the pill only for short one-liners (callers can still force either via `opts.prose`). This fixes, for example, the faucet "You need a 0.0001 MINIMA signing fee…" notice.
- Replaced native browser `window.confirm()` prompts with a uniform in-app confirm dialog (`stablesConfirm({title,message,confirmText,cancelText,danger})` → Promise<boolean>, built from the standard `.modal` + `.btn` classes). Routed the "Prepare more keys" prompt and the mint-confirm fallback through it. Note: `assets/app.js` and `assets/modals.js` are not loaded by the shell, so their legacy `alert()`/`showToast` definitions are dead code and were left untouched.

## [0.0.1.222]
- Generalized the native bridge: the UI now calls `window.StablesNative.<fn>()` instead of the platform-specific `window.StablesAndroid`. A small dynamic getter resolves `StablesNative` to whichever self-node shell injected a bridge (`StablesAndroid` today; `StablesDesktop`/`StablesIOS` later), so one UI source drives every platform. Returns `undefined` when no shell is present (web), preserving the previous web-mode guards. Migrated all call sites (biometric auth, app version, APK install/update, background toggle, node-readiness, launcher branding).

## [0.0.1.221]
- Incoming-payment in-app detection (`NEWTXPOW` ingest) now recognizes xWiniwa alongside Winiwa and USDw, so the "Incoming X xWiniwa found" toast + Activity row fire for all three on-chain test tokens. Added `xwiniwa_token_id` to `testChannelTokenIdSet` and an explicit xWiniwa label in `dominantActivityCcy`.
- Paired with a native standalone-APK enhancement (outside this web tree): the in-process node service now posts a rich closed-app "Payment received — Received X <token>" heads-up notification on incoming funds (balance-delta detection, all tokens), suppressed while the app is foreground since the toast already covers that.

## [0.0.1.220]
- Fixed the Send (and Receive) currency reverting to Winiwa right after selecting USDw. `refreshWalletModalCurrencySelects` — called by `updateGlobalUI()` on every balance sync — was hard-resetting the hidden `sendCcy`/`reqCcy` inputs to WINIMA, discarding the user's pick. It now preserves the current selection when it is a valid send/receive code (only falling back to WINIMA when it is not), matching how the legacy `<select>` branch already preserved the prior value. This also makes the currency-popup Send/Receive preselect (e.g. USDw) stick instead of snapping back to Winiwa.

## [0.0.1.219]
- Fixed USDw send being impossible because the "Confirm send" button stayed stuck on "Loading balance...". Two causes addressed:
  - The Send modal's balance load was skipped whenever a tx-history sync was in flight (e.g. an Activity RPC 502 loop), so the USDw balance detail never arrived. The Send-modal load now passes `forceDuringTxSync: true` (bounded, foreground one-shot) so it can't be starved by the background sync gate.
  - The fast balance path only recorded a detail entry for tokens that had a balance row, so a wallet holding Winiwa but no USDw row left USDw's detail undefined forever. After any valid `balance` response, every configured test token (Winiwa, USDw, xWiniwa) now gets a detail entry (default 0 when absent), detail-only so optimistic wallet values are preserved.

## [0.0.1.218]
- Currency-actions popup (tap a currency in the Wallet) now shows icons on its action buttons: an up arrow on Send and a down arrow on Receive (matching the wallet hero Send/Receive arrows), plus an up/down swap arrow on Exchange.
- Confirmed the popup Send and Receive open the transfer window pre-selected with the tapped currency (Send/Receive route through `openModalWithCurrency` so the chosen currency, e.g. USDw, is already selected).

## [0.0.1.217]
- Fixed preview selector version formatting by trimming a trailing `.0` from APP_BUILD_VERSION before appending APP_BUILD_ITERATION (for example `v0.0.1.217`, not `v0.0.1.0.217`).

## [0.0.1.216]
- Added build version text to the local PREVIEW selector bar (`v<APP_BUILD_VERSION>.<APP_BUILD_ITERATION>`), so each dev run shows exact build identity directly in the preview switcher.

## [0.0.1.215]
- Standardized USDw mint/burn progress copy so activity rows and toast messages use one professional lifecycle language across covenant actions.
- Tightened confirmed covenant settlement refresh so wallet balances are forced back through live node sync after mined USDw mint/burn rows confirm.
- Expanded RPC history hydration so confirmed node transactions in the verifier window are imported into Activity instead of stopping after the first page of header-only txpows.
- Added a covenant-recipient fallback so confirmed Stables test-token txpows remain visible in Activity even when wallet-net attribution cannot derive a simple signed address row.

## [0.0.1.214]
- Added Minima balance display on Faucet page (separate from wallet total); shows the user's current MINIMA balance needed for network signing fees without counting toward the main wallet balance.

## [0.0.1.213]
- Moved The Stables Academy menu item from Help section to Community section; StablesAgent now appears as the first item in the Help section for better UX flow.

## [0.0.1.212]
- Added Portfolio Simulator menu item to Merchants & Exchange section; allows users to quickly access the portfolio simulator from the More drawer.

## [0.0.1.211]
- Added "Show agent icon" menu item in More drawer; allows users to restore the agent FAB if it was previously hidden via the close button.

## [0.0.1.210]
- Added draggable agent FAB with close button (×) overlay for improved UX; agent icon can now be repositioned or dismissed by dragging to the drop zone in the bottom-right corner.

## [0.0.1.209]
- **v0.0.1.203:** Simplified faucet pour progress so elapsed time appears only in the inline status card. The disabled Pour button now reads `Pouring...`, and the preflight hint describes the current step without a second elapsed-time counter.
- **v0.0.1.202:** Added the xWiniwa covenant address and miniaddress to the test-channel infrastructure filter so tracked reserve/pool coins cannot be counted as user wallet balance or selected as user inputs during xWiniwa mint/burn.
- **v0.0.1.201:** Wired the xWiniwa Mint page route to the proven on-chain reserve-release covenant. The xWiniwa buttons now use the same confirmation, pending Activity rows, txid linking, balance refresh, and failure rollback pattern as USDw mint/burn; the test-channel calculator now shows the actual fixed 1 Winiwa <-> 1 xWiniwa covenant rate instead of the old local preview leverage.
- **v0.0.1.200:** Promoted xWiniwa from registry-only metadata to a known on-chain test token in the app shell. Live balance refresh now reads the configured xWiniwa token ID into the xWiniwa wallet balance, xWiniwa send/receive resolves to the real token ID, and token-hash classification includes xWiniwa alongside Winiwa and USDw. The xWiniwa protocol mint/burn route remains review-gated.
- **v0.0.1.199:** Added the confirmed xWiniwa token and covenant proof IDs to the test runtime registry for review. The registry now exposes xWiniwa token `0x75656BEA...0318`, covenant `0xF47906E9...4256`, covenant miniaddress, and state tag `17`; validation log records the 10 xWiniwa mint/burn round trip and negative `txncheck` cases. xWiniwa transaction UI remains review-gated.
- **v0.0.1.198:** Fixed faucet claim address retrieval while connected. The confirmation sheet now uses the same test wallet resolver as the actual pour, prefers the active RPC connection before MDS fallback, accepts all node `getaddress` response shapes, and keeps retrying lookup while a node transport is present instead of showing `No wallet address found`.
- **v0.0.1.197:** Hardened Winiwa faucet pours against slow node/RPC responses. Faucet commands now use faucet-specific longer RPC timeouts, and recoverable timeout/post delays render as `Faucet claim still tracking` while Stables polls node history instead of showing `Pour failed`.
- **v0.0.1.196:** Simplified the faucet pour lifecycle to a single inline status card. Confirming a pour now brings the user directly to the Faucet page status section, with no separate popup, no `Open status` button, and no `Keep in Faucet page` button.
- **v0.0.1.195:** Made faucet claim address lookup explicit and more robust. The confirmation sheet now shows a pulsing "retrieving address from node" state, retries multiple connected-node address sources, enables Pour only after a real wallet receive address is available, and shows a clear no-address state if the node still returns nothing.
- **v0.0.1.194:** Standardised the remaining modal StablesAgent buttons to the over-panel top-right placement for faucet claim confirmation, faucet pour status, and mint/burn confirmation, matching Transaction Details and Send/Receive modals.
- **v0.0.1.193:** Standardised Transaction Details to the floating StablesAgent placement over the modal's top-right corner. Hardened USDw burn settlement so the two optimistic burn rows poll the mint/burn covenant transaction shape, receive the mined txpow id, and cleanly mark failure/revert optimistic balances if the covenant burn cannot post.
- **v0.0.1.192:** Fixed Transaction Details for mined-but-not-final rows. When a transaction shows on-chain progress such as `1/3 blocks`, the Advanced Details section now displays the mined txpow id as the Transaction id instead of `Generating send id`; rows that have a mined block but lost their txpow id are defensively resolved from recent node history.
- **v0.0.1.191:** Reworked the on-chain Winiwa faucet pour lifecycle into one persistent status window. The same build/submit/confirm state now updates inside that window without separate floating toast gaps, and if the user closes it the Faucet page shows the identical status inline in the pouring section.
- **v0.0.1.190:** Added the contextual StablesAgent button to the Send submitted / sending transaction step, so users can ask about tx id generation, receiver notification, and block confirmation directly from that modal.
- **v0.0.1.189:** Added mandatory fast incoming detection for the receiving wallet. NEWTXPOW events now hydrate the txpow body immediately, insert Winiwa/USDw incoming Activity rows from the receiver's own wallet context, and start a 30-second fast watch on new txpow, balance, and block events so the receiver sees incoming funds within seconds and the first mined block updates the same row toward confirmation.
- **v0.0.1.188:** Fixed the Receive modal address display. Winiwa, USDw, xWiniwa, and native Minima now all resolve the connected wallet's Minima receive address instead of falling back to a demo address path; MDS lookup falls back to RPC when needed, the visible address input syncs from the same canonical address used by Copy, and the QR is withheld until that address is available.
- **v0.0.1.187:** Simplified the wallet recovery relaunch modal copy by removing the extra reassurance sentence.
- **v0.0.1.186:** Added a protocol ledger structure for Treasury accounting. Treasury now reads in-memory Activity rows first, then persisted rows, and derives USDw issued, Winiwa locked for USDw, xWiniwa supply, Winiwa locked for xWiniwa, total Winiwa collateral, and xWiniwa equity value. The live Treasury box now presents xWiniwa supply alongside Winiwa collateral, USDw issued, and burn rate.
- **v0.0.1.185:** Removed Treasury reserve-difference fallback entirely. The live Treasury card now displays only transaction-derived mint/burn ledger values; if those real values are unavailable, locked Winiwa, issued USDw, burn rate, Assets, Liabilities, Equity, and CR are cleared to dashes instead of showing inferred reserve numbers.
- **v0.0.1.184:** Fixed Treasury CR accounting for the live mint/burn path. Treasury now derives issued USDw and locked Winiwa from confirmed/submitted mint/burn Activity transaction legs when available, deduped by tx id, and uses the covenant reserve-difference method only as a fallback/diagnostic. This avoids false under-collateralised readings caused by treating the technical USDw reserve baseline as a financial reserve.
- **v0.0.1.183:** Wallet headline totals now add only enabled and visible wallet currencies, so hidden/non-displayed node assets such as native MINIMA cannot inflate the displayed balance. The top-bar version pill now opens Settings and updates directly, and Android automatic update checks fall back to bundled package info silently while manual "Check for updates" still reports failures. Bumped runtime, MiniDapp, and Android metadata.
- **v0.0.1.182:** Corrected Treasury semantics and reverted the Mint/Stables color split. Treasury now presents only user-deposited Winiwa collateral and issued USDw as the liability; the USDw reserve remains an internal test-covenant derivation detail and is no longer shown or exposed in the public snapshot. CR remains collateral value divided by issued USDw, so normal operation should sit above 100% and only Winiwa price deterioration can pull it below parity. Removed the yellow/purple `truth-*` treatment from Mint/Stables controls and changed the Mint page hint back to the unified muted style.
- **v0.0.1.181:** First-release mint/burn gating and Treasury truth pass. Mint/Burn currency dropdowns now keep only USDw selectable while other stable currencies remain visible but greyed as later-release options. Treasury now reads the live mint/burn covenant from the connected node, showing Winiwa collateral, issued USDw, CR, and the implied USDw burn payout rate; USDw burn calculators prefer this Treasury burn rate once loaded, with spot only as pre-sync fallback. Added explicit `TEST_MINT_BURN_USDW_RESERVE_INITIAL` so issued USDw derives from the internal test reserve movement. xWiniwa status remains test-local/derived: Winiwa lock accounting exists, but there is not yet a separate on-chain xWiniwa token/covenant burn path.
- **v0.0.1.180:** Big smoke pass follow-up for the instant send lifecycle. Browser/RPC sends no longer mistake Winiwa/USDw token ids for transaction ids when the write response is opaque, and mined node-history rows can now replace local `sending` rows by amount/currency/time even when the recipient address appears in a different format. Existing `WINIMA` activity rows render as `Winiwa`. Smoke: activity-history verifier passed against headed Chrome v180 with the current 24h node window, circular-economy tests passed, and the headed label/lifecycle check passed.
- **v0.0.1.179:** Restored the instant send lifecycle wording for on-chain MINIMA/Winiwa/USDw sends. Outgoing rows now appear immediately as `sending`, switch to `on-chain x/y` only after a mined block is known, and become `confirmed x/y` once the user-configured confirmation target is reached. The send result modal and Transaction Details no longer use the confusing `pending` / `Awaiting mined txpow` language for normal sends.
- **v0.0.1.178:** Moved the active test-channel build line from `v0.0.0.1.xxx` to `v0.0.1.xxx`. Runtime config now uses `APP_BUILD_VERSION: 0.0.1.0` with iteration `178`, and `dapp.conf` / Android metadata use the full `0.0.1.178` version. Local sync and APK rebuild required so the mobile package carries the same version.
- **v0.0.0.1.177:** Reduced UI text density by removing hide/delete explanatory paragraphs from Transaction Details and merchant profiles. The same operational detail now lives in StablesAgent knowledge for Activity, Transaction Details, and Merchants, with an agent button added to merchant profiles. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.176:** Removed native grey scrollbars from form fields and replaced default app scrollbars with thin themed rails. Transaction notes and other `.finput` text fields still scroll, but no longer show the browser's chunky OS scrollbar inside the field. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.175:** Made USDw/Winiwa token sends feel as immediate as native MINIMA sends. Confirming a token send now inserts an outgoing pending Activity row before the node write returns, updates that same row with the pending transaction id when the node accepts it, shows the mempool id in the send confirmation modal, and starts a fast settlement/history poll so the row links to the mined txpow after the next block. RPC wallet history auto-sync is also tighter so the receiving wallet sees incoming token rows within a few seconds instead of waiting for the old stale-list threshold. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.174:** Fixed duplicate faucet claim display during and after settlement. The active faucet tracking/confirmed status now decorates the matching Activity row instead of rendering a second banner above it, and faucet claim rows are deduplicated by mined txpow / pending transaction id so a successful claim settles to one visible transaction. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.173:** Fixed Transaction Details for mint/burn rows after confirmation. When node history replaces a local pending row with the mined `NODE-<txpowid>` row, an already-open details modal now follows the replacement and re-renders so the Transaction id link appears after mining. Details also recover the txpow id from matching node-history rows and no longer show `1/1` as confirmed when a row has no mined txpow id. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.172:** Completed the stale optimistic mint-row cleanup by persisting load-time Activity reconciliation back to local storage. v171 removed unproved `Minted USDw` rows from the rendered list, but a dirty storage bundle could reintroduce them on the next page load. The cleanup now rewrites storage after reconciliation changes. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.171:** Fixed stale optimistic mint rows from older test builds that could show `Minted USDw` / `Sent Winiwa (mint collateral)` even though the wallet balance correctly came from live node coins and the claimed amount never mined. Local mint/burn rows with no txpow, no usable pending id, and no chain proof are now scrubbed after the settle window, including stale rows that old builds made look like `1/1`. Unmined rows now show `generating` / `pending` instead of a misleading `1/1` confirmation count. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.170:** Polished the v169 scroll behavior. The mint confirmation path now centers the Wallet Recent Activity list after inserting the `Generating USDw mint` / `Generating collateral lock` rows, so the sticky top bar does not hide the first generated row. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.169:** Tightened the v168 mint UX so the generated transaction is not just inserted into Activity, but brought on-screen. After confirming a covenant mint, Wallet opens and scrolls Recent Activity into view with the `Generating USDw mint` / `Generating collateral lock` rows before the node build/post finishes. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.168:** Fixed the mint UX visibility gap. After confirmation, covenant mint now opens the wallet list immediately and shows two visible pending rows, `Generating USDw mint` and `Generating collateral lock`, before the transaction build/post completes. Once the node returns ids, those rows upgrade to the normal `Receiving USDw` / `Locked Winiwa collateral` confirming state; build/post failures now leave explicit failed rows and revert the optimistic balance. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.167:** Fixed final mint settlement reconciliation after the headed v166 proof. The v166 UI mint posted and mined on-chain (`0x0000810E...14CD`, block `2174027`) but the pending Activity rows could keep the pre-mined post id. Mint settlement now polls recent history by exact covenant mint amount, Winiwa collateral, recipient, and pending transaction id, then replaces the pending rows with the mined txpow id. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.166:** Fixed the headed-browser mint preflight false-negative. v165 loaded and the form calculated spend/receive correctly, but the Mint button could still toast `Insufficient on-chain Winiwa` because aggregate balance detail lagged behind direct sendable coin state. The mint preflight now falls back to the same direct `gatherSendableUserCoins()` path used by the covenant builder before blocking the confirmation sheet. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.165:** Fixed the remaining mint command-path stall found in headed testing. A direct diagnostic rebuild/check/post of the covenant mint succeeded (`0x00022282...880E`, block `2174011`), proving the covenant and transaction shape were valid. The app mint path still used queued coin reads for the mint/burn reserve, state coin, and user token inputs, unlike the verified direct path. Those mint/burn reads now use the urgent direct RPC helper, with MDS fallback unchanged. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.164:** Fixed the v163 headed-browser mint settlement gap. The small v163 test mint posted on-chain (`0x00024F5C...6603`, block `2173979`) but the browser kept the corrected covenant rows pending without a txid when the complex `txnpost` response was not usable. Mint/burn now treats `txnpost` timeout/response loss as recoverable: it scans recent node history for the exact covenant state ports, recipient, USDw/Winiwa amounts, and covenant address, then attaches the mined txpow to the pending rows. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.163:** Verified the user's `25 Jun 01:01` USDw mint in the headed browser as a real on-chain covenant txpow (`0x00021322...6603E`, block `2173424`): `0.582106 USDw` was released to the wallet, `111 Winiwa` was locked into the covenant, and the USDw reserve remainder stayed in the covenant. Fixed the misleading instant/pending Activity copy that still said `Issuer (test mint)` / `Collateral pool (test)` before node-history reconciliation. Mint/burn transaction build/sign/check/post now uses direct RPC when configured, with MDS fallback unchanged. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.162:** Completed the headed-browser reset fix. v161 proved cooldown clearing worked but token erasure did not: Minima's simple `send` command returned `No Coins ... available` for the tracked test-token UTXOs. Reset now gathers wallet-owned Winiwa/USDw coin IDs, builds/signs/checks/posts explicit burn transactions to a tracked `RETURN FALSE` script address, and only clears cooldown after required burns complete. The visible reset copy preserves native `MINIMA` wording. No covenant/script change. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.161:** Fixed the headed-browser reset-button failure. The Burn all test tokens modal opened, but Confirm Burn left Winiwa/USDw and the faucet cooldown unchanged because reset burn writes were still routed through the shared RPC queue. Reset burn commands now use direct RPC when a direct RPC config is present, with MDS fallback unchanged. No covenant/script change. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.160:** Fixed the headed-browser faucet stall found in UX verification. The claim modal opened and the optimistic wallet row appeared, but the transaction build stayed at `Step 3/6` because faucet write commands were still using the shared RPC queue behind balance/history sync. Faucet build/sign/check/post commands now use direct RPC when a direct RPC config is present, with MDS fallback unchanged. No covenant/script change. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.159:** Fixed a faucet-pour readiness gate that could block the on-chain claim even when direct RPC or MDS command execution was available. The covenant path itself is healthy: local RPC proof found the 45,000 Winiwa pool coin, state coin, and MINIMA float, then posted a `scripts:true` / `basic:true` claim. No covenant/script change. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.158:** Closed the faucet post-submit UX gap. After `txnpost` succeeds, Wallet now shows a persistent settlement banner above Recent Activity and the faucet row reads "Faucet claim submitted" with copy saying confirmation is being tracked and no action is needed. If confirmation is slow or the background checker cannot finish, the banner changes to "still tracking" and tells the user to refresh or check Minima Wallet history before retrying. On confirmation, it briefly changes to "confirmed" and then clears. No covenant/script change. Bumped iteration + dapp.conf. Local sync only; no zip package built.
- **v0.0.0.1.157:** Fixed the Recent Activity refresh button in web/RPC sessions. The button previously required `MDS.cmd`, so a valid browser RPC session could skip the node sync and only re-render stale local rows. It now uses the same RPC-or-MDS readiness gate as the importer, pulls node history in both session types, and clears the refresh spinner after 45 seconds with a clear "node may be busy" toast instead of leaving the user in a void. Includes the v156 faucet pour progress UX. No covenant/script change. Bumped iteration + dapp.conf. Zip package required for installed MiniDapp testing.
- **v0.0.0.1.156:** Faucet pours now show live phase and elapsed-time progress instead of a static "Pouring" state. The claim button/hint advances through preflight, covenant tracking, coin reading, transaction building, signing, validation, posting, and submitted states, adds "node still working" guidance after long waits, and uses faucet-specific timeouts with copy that tells the user to check Wallet history/Stables Activity before retrying. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.155:** Faucet level no longer caches a transient `unavailable` result. The level lookup can briefly fail if it runs before RPC/covenant tracking is ready, but that failure is now only rendered, not stored as the cached value. The next refresh can replace it with the real covenant pool balance (currently 45,000 Winiwa on the test node). No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.154:** Tightened the v153 fresh-transaction sync path. History import now exposes a separate `__STABLES_TX_HISTORY_WORKER_ACTIVE` flag, and live balance polling pauses while that worker is active even if cached transaction rows are already visible. This prevents visible cached rows from reopening balance polling and starving the import before a fresh node transaction is written into Activity. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.153:** Fixed the fresh-transaction regression found by the new verifier. Recent Activity now performs a throttled background history sync on boot/render even when cached rows already exist, so a new node transaction made outside Stables is imported after reload instead of being skipped because the list was non-empty. The sync timestamp is stamped when a history import starts to avoid render loops. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.152:** Cleaned up the v151 zero-net Winiwa history rows so they rebuild without a user-facing "Note" marker. The 24 June Minima Wallet self-send/split transactions still import as confirmed Sent Winiwa rows. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.151:** Fixed missing 24 June Winiwa history rows. Minima Wallet records some Winiwa sends/splits as relevant transactions where all token inputs and outputs are wallet-owned, so the wallet's net token balance is zero. Stables previously suppressed those txpows as no-op balance changes. The Activity importer now emits a confirmed "Sent Winiwa" row for zero-net owned token movements, using the moved output amount, and bumps the activity schema so node-derived rows rebuild from live history. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.150:** Live balance polling now resumes once transaction rows are visible, even if a late history callback leaves the sync flag set. The `stablesRefreshLiveNodeBalances()` and live block/balance poll gates still pause during the empty transaction loading state, but they no longer suppress normal balance refreshes after Recent Activity has rows. This keeps the queue protected while fixing the visible transaction display and avoiding stale balance suppression. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.149:** Added a bounded UI gate for history import plus a separate internal worker guard. If a Minima callback or queued RPC command hangs after transactions are already rendered, the visible loading/balance-poll gate now releases after 90 seconds, while the worker guard still prevents overlapping history imports until the original async path exits. This prevents a stale `__STABLES_TX_HISTORY_SYNC_IN_FLIGHT` flag from keeping live balances paused indefinitely. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.148:** Stopped silent live history re-syncs from chaining forever behind an active history import. `stablesSyncNodeTransactions(true)` now returns immediately if a sync is already in flight, while manual refreshes can still queue one follow-up. `stablesLiveResyncTransactions()` also skips while the shared history-sync flag is set. This prevents NEWBALANCE/NEWBLOCK events from keeping the Activity importer busy after rows have already rendered. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.147:** Fixed the remaining "Loading transaction history..." hang caused by RPC queue starvation after the v146 fallback fix. Activity history sync now sets a shared `__STABLES_TX_HISTORY_SYNC_IN_FLIGHT` flag and wallet Recent Activity no longer triggers live token-balance refreshes while the import is running. The live block/balance poll also skips non-forced ticks during history sync, and `stablesRefreshLiveNodeBalances()` returns early unless explicitly forced. This lets `history` and `txpow` calls progress instead of sitting behind repeated `keys`/`balance` refreshes. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.146:** Fixed the remaining Activity spinner path in browser/Pure Minima sessions. `mds.js` now routes `MDS.cmd` through `window.stablesRpcSendCommand()` whenever a saved RPC config is available, even if `window.__STABLES_RPC_MODE` has not been stamped yet during boot. This prevents early Activity and balance/history calls from falling back to `/cmd?uid=` POSTs on the static dev server, which return 501 and can leave the transaction list showing "Loading transaction history...". No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.145:** Transaction history loading fix for web/RPC test sessions. Browser RPC reads now pass through a single-command queue with a short gap and one transient 502 retry, so Activity history import no longer bursts `keys`, `balance`, `history`, `txpow`, and `coins` requests into the node at once. `stablesSyncNodeTransactions` now queues one follow-up refresh when live events fire during an active sync instead of starting overlapping imports. `buildWalletContext` now reads wallet scripts before spent-coin fallback and only calls `coins coinid:X` for unresolved inputs, capped to avoid runaway call volume. The local CORS RPC proxy now uses one keep-alive upstream socket and retries one failed GET before returning 502. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.144:** Mint and burn transactions now appear in Activity, and the web RPC bridge works against a non-SSL node. **(1) Bridge:** `work/tools/cors-rpc-proxy.js` hardcoded `https` to the node RPC, but local test node **Test12** serves RPC over plain **http**, so every call 502'd and the web dapp synced no history (empty Activity). The proxy now probes the RPC port at startup and uses whichever scheme answers (or an explicit 5th `scheme` arg); backward-compatible with `-rpcssl` nodes. **(2) Attribution (the core fix):** the **mint/burn covenant `0x3FF52041` was missing from `testInfraAddresses()`**. On a node that tracks the covenant, its coins were counted as the user's wallet, so the per-token net of every mint/burn cancelled to zero and `txpowBodyToUserRows` (the RPC Strategy-A0 path) emitted **no row**. The covenant (and its pool) is now excluded like the faucet covenant/pool/issuer, so mint, burn, faucet claims, sends, and receives all compute a real user-side delta and show. Verified against Test12's live `history`: 13 of 23 transactions now produce correct rows (e.g. burn +82 Winiwa / −0.5 USDw, mint +1 USDw / −164 Winiwa, faucet +1,000 Winiwa, send −1 Winiwa, receive +0.22 MINIMA); the rest are genuine zero-impact self-consolidations. **(3) Robustness:** added `isGenuineConfirmedNodeRow()`; real confirmed on-chain rows (with a txpow id) are never hidden or amount-capped by the faucet/pool "phantom" heuristics, so large genuine receives (>1,000 Winiwa) are no longer suppressed or clamped. **(4) Self-heal:** added `migrateStaleNodeRowsIfNeeded()` — on load, confirmed on-chain rows (NODE-…) saved by an earlier attribution build are purged once (app-local/optimistic rows kept) and an activity-schema token is stamped, so the next node sync rebuilds them with the correct covenant-excluded amounts and directions. Without this, a tab that had already cached pre-fix rows kept showing them (e.g. a mint's collateral leg as "+164 Winiwa received" instead of "−164 sent"). Verified end-to-end by driving the running app headlessly over Chrome DevTools Protocol: a clean sync imports 25 correctly-signed rows (`Imported 25 tx [src=rpc-attrib n=23 addr=128]`), and a seeded stale +164 Winiwa row is dropped on reload while the optimistic faucet row is kept. **(5) Winiwa/Minima terminology:** the frontend text mask (`stablesMaskNativeMinimaFrontendText`) was rewriting **every** "Minima" to "Winiwa", including infrastructure terms, so the app told users to "link your own Winiwa node". Winiwa is the test **asset/token**; the **node, network, chain, address, and OS are Minima**. The mask is now asset-only: it preserves "Minima" when followed by node/nodes/address/chain/network/OS/hub/MDS/RPC/blockchain/peer/mainnet/explorer/ecosystem/protocol/wallet (and "Minima-based"). Also fixed two hardcoded strings: the RPC session-error popup now says "link your own **Minima** node" (reverting the wrong v0.0.0.1.127 change), and `test-mds-connection.html` now says "not running in **MinimaOS**". No covenant/script change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.143:** Fixed the front-end ↔ blockchain bridge flapping/reload loop that made the Faucet and Mint buttons unresponsive. Root cause: the wallet-change guard in `test-channel-bootstrap.js` fingerprinted the connected wallet using `getaddress`, but Minima's `getaddress` returns a fresh address on every call, so the guard thought the wallet changed on every balance refresh and triggered `location.reload()` repeatedly. This re-initialised MDS, reset the UI, and blocked button handlers. Fix: added `fetchWalletStableFingerprint()` which uses the first public key from the deterministic `keys` command, and updated the guard to compare this stable fingerprint. The connection pill now stays solid, modals open reliably, and faucet/mint flows proceed. Diagnostic page (`diagnostic.html`) confirms raw RPC is stable (29 polls / 0 fails). Selenium UI automation now drives Faucet + Mint end-to-end. No covenant change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.142:** Faucet level eager-load and currency popup agent placement. `stablesRefreshFaucetLevel` now caches the last faucet pool balance and refreshes it in the background during app boot, so the Faucet page shows the value immediately on open instead of a "Loading…" spinner. The currency actions popup now places the StablesAgent help button as the rightmost header control (star/favorite sits to its left). Added a modal/popup StablesAgent placement rule to `0_handshake/web_component_spec.md`. No covenant change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.141:** Unified signing-fee confirmations across USDw mint and burn. Added a styled `mintBurnConfirmModal` that mirrors the faucet claim confirmation: amber summary box, StablesAgent button fixed top-right, no Cancel button (tap backdrop to close), and clear rows for You send, You receive, Signing fee (0.0001 MINIMA), Counterparty, and Network. The mint wrapper now opens this modal instead of the native `window.confirm`; the burn wrapper now shows the same confirmation before posting. Both fall back to a native confirm if the modal helper is unavailable. Added a matching `AGENT_KNOWLEDGE` entry so StablesAgent can explain the modal fields. No covenant change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.140:** Faucet cooldown display improved. After a successful pour the button is disabled and shows a live "Available in …" countdown, and the hint below the button now displays the remaining cooldown time clearly (e.g. "Next claim available in 59m 32s · On-chain test Winiwa, no monetary value."). The cooldown logic was already in place; this just makes it visible immediately. No covenant change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.139:** Faucet claim now updates the wallet balance immediately after the transaction is posted, matching send/receive behaviour. The code optimistically credits `WALLET_WINIWA` (+1,000), debits `WALLET_NATIVE_MINIMA` (−0.0001 signing fee), saves the vault state, and refreshes the UI, then reconciles with the node in the background. No covenant change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.138:** Faucet claim reliability fix. Restored the `newscript trackall:true` call at the start of the faucet claim (non-fatal) because a node that does not actively track the faucet covenant script can build transactions that fail `txncheck`/peer validation and leave no on-chain trace. Kept the parallel coin lookups and progress messages from v0.0.0.1.137. Moved `txncheck` back to the happy path and added a guard that throws if `txnpost` returns no transaction id. Post-claim settlement now refreshes balances and activity within ~1s instead of waiting 4s, so the new Winiwa appears immediately. No covenant change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.137:** Faucet claim speed-up. The on-chain pour was slow because every claim resent the full faucet covenant script (`newscript`) over RPC and ran three coin lookups sequentially, followed by an explicit `txncheck` before posting. Removed the redundant `newscript` call, parallelised the pool/state/MINIMA coin lookups, and moved `txncheck` to the failure path only. Added live progress messages under the button so the user sees each phase. No covenant change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.136:** Added StablesAgent help to the faucet claim confirmation modal. The agent button now sits fixed in the top-right corner of the modal, and a new `AGENT_KNOWLEDGE` entry explains the confirmation fields: receive amount, 0.0001 MINIMA signing fee, recipient address, faucet pool, cooldown, and that Winiwa is a valueless test token. No covenant or app logic change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.135:** Faucet level loading indicator. The Faucet page "Faucet level" line now shows a small spinner + "Loading…" while the on-chain pool balance is being fetched, instead of the previous empty/ellipsis state. No covenant or app logic change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.134:** Faucet fee label fix. The network signing fee is paid in native MINIMA, so the Faucet page summary box, confirmation modal, More-drawer description, faucet hint, and toast messages now explicitly show "MINIMA" instead of being masked to "Winiwa" by the test-channel text mask. Added a `data-no-minima-mask` escape hatch for any UI copy that must name the native asset. No covenant or app logic change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.133:** Faucet confirmation modal cleanup: removed the Cancel button. Users can close the modal by tapping the backdrop (consistent with the rest of the app). No covenant or app logic change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.132:** Faucet fee visibility in the test channel. Replaced the small sentence under the claim button with a prominent amber-bordered summary box above the button that shows "You receive 1,000 Winiwa" and "Network signing fee 0.0001 MINIMA" in large bold type. No covenant or app logic change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.131:** Faucet page copy tweak: removed the "~N claims left" suffix from the Faucet level line (`stablesRefreshFaucetLevel`). The total Winiwa remaining is sufficient. No covenant or app logic change. Bumped iteration + dapp.conf. Hard reload not required for this copy-only change.
- **v0.0.0.1.130:** Faucet claim UX for the test channel. **(1)** Added a clear "On-chain covenant pour: your node signs the transaction and burns a 0.0001 MINIMA signing fee" line under the Faucet claim button. **(2)** Updated the More-drawer Faucet description to name the 0.0001 MINIMA signing fee. **(3)** Added `faucetClaimConfirmModal`: tapping "Get 1,000 Winiwa" now opens a confirmation window that presents all transaction parameters — receive amount, signing fee, recipient address, faucet pool, and cooldown — before the user confirms the pour. Legacy non-covenant faucet mode still claims directly without the modal. No covenant change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.129:** More-menu reorganisation for the test channel. The Faucet drawer item is now in its own **"Testing phase"** section at the very top of the More menu, above "Merchants & Exchange". No covenant or app logic change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.128:** Activity-list fixes for the test channel so all related mint/burn legs show. **(1)** `buildWalletContext` now looks up coinids for every spent token input (not just MINIMA) and records the coin's addresses, so the Strategy A0 per-token net attribution sees Winiwa/USDw collateral inputs that are no longer in the UTXO set. **(2)** `txpowWrapperToActivityRows` now detects mint/burn covenant transactions and emits separate `NODE-<txid>:usdw` and `NODE-<txid>:winiwa` leg rows instead of a single collapsed row. **(3)** Fixed a latent ReferenceError in the faucet split path where `allOutputs` was undefined. No covenant change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html + routes cache).
- **v0.0.0.1.127:** Test-channel copy: the RPC session-opened error popup now says "Open the Connect panel to link your own Winiwa node" instead of "Minima node", matching the Winiwa text mask used throughout the test channel. No covenant or app logic change. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.126:** Fixed market-rated burn optimistic accounting in `test-channel-bootstrap.js`. The burn "receive" activity row and the instant Winiwa wallet increment were still using the USDw `burnAmt` instead of the computed `reclaimWiniwa`, so the UI looked 1:1 even though the covenant transaction was already market-rated. Also cleaned up mint/burn toasts and row notes that still said "1:1 Winiwa". No covenant change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.125:** Fixed MINIMA signing-fee change calculation in `test-channel-bootstrap.js`. `faucetClaim` and `mintBurnCovenantOnChain` now compute `minChange` with 8-dp normalization (`toFixed(8)`) so a MINIMA coin with a long decimal representation does not produce a float-tail change output that breaks `txncheck basic:false`. Discovered during live end-to-end CLI testing against the running Test12 node. Also fixed the same integer-state formatting bug in `task_circular_economy_testbench/onchain/verify-market.mjs` and `verify-burn-market.mjs` (values like `16` are now emitted as `16.00000000` so Minima parses them as number type 2, matching output amounts). No covenant change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.124:** Validation log and public test-token registry refresh. `validation_log.md` now has a "Current test channel state — Test11" section with live token IDs, covenant addresses, and app wiring status; older Test07/Test08 sections are marked historical/superseded. `test-token-registry.json` restructured with `current` (Test11) and `historical` (Test07) sections. No covenant or app UI change. Bumped iteration + dapp.conf. Hard reload not required for docs-only change.
- **v0.0.0.1.123:** Test-channel runtime config cleanup. `APP_UPDATE_POLICY`, `ANDROID_APK_UPDATE`, `MDS_ZIP_URL`, fallback URLs in `index.html` / `activity-contacts.js`, Council communications, and feedback roadmap now reference the test channel instead of demo v3.45. `ANDROID_APK_UPDATE` leaves `latestVersion`/`downloadUrl`/`sha256` blank until the first signed test APK is published, and `remoteConfigUrl` points to `/dapp/3-test/assets/config/runtime-config.js`. `COUNCIL_TREASURY_MINIMA_ADDRESS` cleared (no live test treasury). Added `-NoZip` switch to `sync-all-platforms-dev.ps1` for local-server workflows. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.122:** Frontend network-asset UX moved to Winiwa-only. Native MINIMA is filtered out of Wallet rows, Settings display choices, welcome currency choices, Send/Receive selectors, Exchange choices, and primary-currency defaults; stale saved MINIMA primary values migrate to Winiwa. Added a frontend text mask so remaining rendered UI copy says Winiwa while internal node plumbing stays unchanged. USDw on-chain mint now prompts for confirmation that minting uses a 0.0001 Minima node signing cost before any transaction work starts. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.121:** Mint stable-currency selectors are now real active dropdowns instead of inert styled boxes. The Mint "You receive" selector and Burn "You burn" selector share the full rated stable list (USDw, EURw, GBPw, JPYw, CADw, AUDw, CHFw, CNYw, VNDw, TRYw, ILSw, IRRw), while Winiwa remains the fixed collateral/reclaim side. Added ILSw/IRRw to the stable balance set so selected currencies are tracked consistently. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.120:** Send QR scanner now has a small in-panel camera restart control. If the live stream is closed, blocked, or unavailable, the camera square stays recoverable instead of leaving the user with only the photo fallback; QR scan success still hides the camera area after filling the payment. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.119:** Wallet Send and Receive now open with the currency selected in the Wallet list instead of resetting to Minima. Direct row actions also honor the row currency through the same modal path. Non-sendable preview currencies still fall back to Minima until they have a real send/receive path. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.118:** Removed the color-dot markers from Wallet and Mint for a quieter, more minimal test UI. The readiness language is now carried only by element tone: amber surfaces for Winiwa/USDw test-token paths, cyan surfaces for native Minima, and purple surfaces for xWiniwa local-preview actions. Added the color-language explanation to StablesAgent wallet and mint help instead of visible UI labels. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.117:** Wallet and Mint now use the minimalist color-only readiness language instead of textual chips. Amber marks Winiwa/USDw test-token paths, cyan marks native Minima, and purple marks xWiniwa local-preview surfaces. Removed the one-off `live node` suffix from the Minima wallet row because node-backed status belongs to the connection state, not only to one asset row. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.116:** Currency selector boxes now match the height of their paired input box, consistently app-wide. `.finput` uses `13px` vertical padding while `.ex-ccy-dd__btn` used `10px`, so every selector sat slightly shorter than its amount input. Since input + selector live in a `1fr auto` grid that defaults to `align-items:stretch` (the selector cell already stretches to the row height), added `height:100%` + `min-height:100%` to `.ex-ccy-dd__btn` so the button fills its cell and equals the input. One shared-class rule fixes Send/Receive, Mint/Burn (Stables + xWiniwa), CF deposit, and Exchange selectors at once; standalone selectors with no definite-height parent fall back to `auto` (unchanged). Also rewrote `dapp.conf` as a single clean manifest — its `description` had been accumulating stranded trailing JSON across many builds (invalid JSON in a MiniDapp manifest, tolerated until now). No covenant/script change. Hard reload required.
- **v0.0.0.1.115:** Send/Receive currency selector: Winiwa + USDw are now **selectable** (they became on-chain sendable in v112), and the redundant per-row/selector balance is removed. The VAULT_DD wallet-mode dropdown hardcoded `code !== 'MINIMA'` as disabled ("Soon"), force-reset the value to MINIMA, and blocked clicks — so even though sends worked, you couldn't pick Winiwa/USDw. New `stablesIsSendReceiveCode()` (MINIMA/Winiwa/USDw) drives the enabled/disabled state, the value reset, and the click guard; demo fiats (EURw/GBPw/…) stay "Soon". The selector's balance line is now blank in Send/Receive mode (the "Available: X sendable" line under the input already shows it). No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.114:** Stables/USDw mint-burn polish + a decimal mint fix. **(1)** Removed the duplicate **"Available USDw"** line on the burn tab — the "You burn" line already shows Available + MAX. **(2)** Renamed the mint **"USDw" tab → "Stables"** (the production stablecoin category). **(3)** Likely fix for **Mint not working on decimal amounts**: `mintBurnCovenantOnChain` computed `covleft = covCoin − amt` and `userChange = userTotal − coll` in JS float, which for decimals (e.g. minting 6.853537 USDw locking 1,111.000032 Winiwa) can yield a tail like `74.99996799999999`; passed on-chain that breaks the exact token conservation (`txncheck basic:false`) and the covenant's `covleft EQ (@AMOUNT − amt)` check, so nothing posts. `amt`/`coll`/`covleft`/`userChange` are now normalised to 8-dp token precision (`cleanTok`). Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.113:** xWiniwa Burn tab now mirrors the Mint tab. The **Current leverage** row, the **live Winiwa price source** line, and the **leverage chart** lived inside `#xwmMintBlock`, so they vanished when you switched to Burn. Moved all three into a **shared section below both `#xwmMintBlock` and `#xwmBurnBlock`** (same element ids, so the existing chart render targeting `#xwmLeverageChartSvg` and the oracle/leverage updates keep working), so they're visible on either tab. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.112:** **Winiwa + USDw are sendable to other wallets on-chain.** `stablesExecuteSendPayload` only did a real node send for `rawCode === 'MINIMA'` (hardcoded `tokenid:0x00`) and simulated everything else ("Sent (demo)"). Now it resolves an on-chain `sendTokenId` for MINIMA (`0x00`) + the test tokens (Winiwa → `winiwa_token_id`, USDw → `usdw_token_id`) and routes them all as a real transfer (`send address:… amount:… tokenid:<id>`, or multi with `tokenid` appended) through the node — RPC in web mode, MDS otherwise. The optimistic balance decrement, the activity row (`category`/`ccy`/`title`/`note`), and the result modal/toast now reflect the actual token instead of hardcoded MINIMA, and a token send triggers a `stablesRefreshLiveNodeBalances`. Confirmed on Test11 that `send … tokenid:<winiwa>` posts (`status:true`, txpowid). Other currencies (EURw/GBPw/xWiniwa/cf) remain simulated (no real token). Both test tokens use free-transfer scripts (the covenants already move them), so the node accepts the transfers. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.111:** **Market-rated mint/burn (Winiwa = Minima).** The mint is no longer a fake 1:1 — it reflects reality. **New covenant** `onchain/scripts/collateral_covenant_market.kiss` → `0x3FF52041…`, identical to the hardened reserve-release design except **output-2 collateral is a declared `STATE(23)` amount** instead of pinned to the released amount (`coll GT 0` is the only collateral sanity check). So the app locks **market-rated Winiwa** per USDw at the live Minima price (~164 Winiwa per 1 USDw at ~$0.0061), and burning releases the matching Winiwa. **Verified end-to-end on Test11:** deploy + seed (150 USDw + 500 Winiwa + state coin, `txncheck` pass) → **mint 1 USDw locking 164 Winiwa** (`scripts:true/basic:true`, posted) → **burn 0.5 USDw reclaiming 82 Winiwa** (`scripts:true/basic:true`, posted). App wiring: `mintBurnCovenantOnChain(op, amt, coll)` sets `STATE(23)=coll` + output-2`=coll` and re-tracks the covenant script first (covers the `prfs is null` after a node restart); the mint/burn execute flows read the UI's market-rated Winiwa field as the collateral; `issueUsdwPerWiniwa`/`issueWiniwaPerUsdw` convert at the live rate; the rate line shows "1 Winiwa = 1 Minima ≈ \$X"; config points `TEST_MINT_BURN_COVENANT_ADDRESS`/`_SCRIPT` at the new covenant (ports 30/20/21/**23**/24/99). **App-trusted:** the covenant trusts the app to lock fair collateral (the chain can't price Winiwa); fine for valueless test tokens — worst case is a re-seed. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.110:** Faucet claim reliability + diagnostics + cooldown on the button. Verified on-chain that app claims were **not posting** (faucet pool stayed at 48,000) and that it was **not** the cooldown (the claim passed the cooldown check — "Pour started" toast — then failed to post). The app-only step the testbench skips is `ensureFaucetCovenantScript()` — a `newscript` with the long covenant script on every claim — which can fail over a constrained RPC path (e.g. URI length) and was silently aborting the whole claim before it built. Made it **non-fatal** (the node that deployed/seeded the covenant already tracks it; if not, `findFaucetPoolCoin` gives a clear pool error). Also the claim now **surfaces the exact failure** — the failing build step, or the `txncheck` validity flags (`scripts`/`basic`/`signatures`/`mmrproofs`) — instead of a generic "failed script check" message, matching the mint's diagnostics. Separately, a **cooldown-blocked claim now shows the live "Available in mm:ss" countdown on the button** (via `syncFaucetWiniwaClaimButton`), not only a toast, so it's obvious why a tap does nothing. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.109:** Faucet claim button gives instant feedback. The on-chain claim ran an `await findSendableMinimaCoin(...)` RPC round-trip **before** `setFaucetPourInProgress(true)`, so the button stayed "Get 1,000 Winiwa" and looked unresponsive until that returned — you couldn't tell the tap registered. Moved the busy state to fire **synchronously on click** (before the first await): the button immediately becomes disabled + "Pouring…", and is restored if the MINIMA pre-check fails (with the same clear error). Disabling up front also prevents accidental double-claims while the check runs. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.108:** CRITICAL — faucet pour was never landing on-chain. Verified against the node: the wallet showed an optimistic +1,000 Winiwa "settling" row, but on-chain the wallet held **zero** Winiwa (only the 0.32 MINIMA), while the faucet covenant pool sat full at 49,000 — i.e. claims weren't posting. Root cause: `faucetStatePorts` set **port 99 = '2'** (an `OP` value carried over from a different/older faucet covenant schema, with extra bridge/schema/token ports), but the **deployed** faucet covenant (`onchain/scripts/faucet_covenant.kiss`, which the verified `onchain/claim.mjs` drives) requires the **state tag `"7"` at port 99** for its `SAMESTATE(99 99)` check. So every app claim failed `txncheck` (`scripts:false`) and silently never posted, while the optimistic UI row stayed. Fix: `faucetStatePorts` now emits exactly `{20: amount, 21: recipient, 25: poolleft, 99: '7'}` — byte-for-byte the verified testbench build. Confirmed end-to-end that `claim.mjs` posts a real pour (`txncheck scripts:true/basic:true`, pool 49000→48000) against the same node, so the covenant + RPC posting are sound; this aligns the app to it. Mint/burn were unaffected (they already set port 99 = `MINT_BURN_TAG` = '7'). No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.107:** Faucet page level + help link. The Faucet now shows a **Faucet level** line — the Winiwa remaining in the on-chain faucet covenant pool, read live via `coins tokenid:<winiwa> address:<faucet covenant>` and summed (`window.stablesRefreshFaucetLevel`, refreshed on faucet-page open) — with an approximate "claims left" count, plus a note pointing testers to the **Telegram help topic** (`t.me/stablescommunity/129`) to request more Winiwa if the pool runs low. Faucet header sub simplified to "Claim test Winiwa on-chain. No official value." (Winiwa-only). Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.106:** Winiwa-focused copy. The Mint banner dropped the multi-token wording ("Winiwa, xWiniwa and USDw … xWiniwa uses Winiwa as base. These three only for now.") and now reads "Get Winiwa from the faucet (1,000 per hour), then mint or burn USDw on-chain." The wallet test-token note changed from "Winiwa and USDw are on-chain test tokens … Use them to test mint flows for xWiniwa and USDw." to "Winiwa is an on-chain test token with no official value. Claim it from the faucet to test the on-chain flows." Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.105:** Two fixes toward the first test release. **(1) Mint button works again.** The on-chain test mint/burn covenant is **1:1** (`__STABLES_TEST_EXECUTE_MINT_WABLES__`: `winiwaCost = mintAmt`, locks N Winiwa to mint N USDw), but v104's dual-field converted spend↔receive via the **oracle rate** (`SIM_Winiwa_PRICE/usdPerUnit` ≈ 0.006455), so typing a Winiwa amount produced a tiny/zero `issueAmt` and the mint did effectively nothing. `issueUsdwPerWiniwa`/`issueWiniwaPerUsdw` now return **1** (1:1, matching the covenant), and the rate rows show "1 Winiwa = 1 USDw" / "1 USDw = 1 Winiwa"; the live Winiwa market price stays only on the oracle reference line, not as the mint ratio. **(2) Faucet duplicate "settling" row.** The pour created an optimistic row keyed `FAUCET-POUR-WINIWA`, but the post-mine call passed the real txid, which keyed a **second** row (`NODE-<txid>:winiwa`) — two "settling · 1/1" rows that never cleared. All claim-flow updates now reuse `FAUCET_POUR_ROW_ID` (one row, updated in place) and the mined update calls `linkMinedTxpowToActivityRows` (the same machinery the mint uses), so the row advances to confirmed and merges with the node history row by txid instead of duplicating. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.104:** Mint/Burn dual-currency input. The amount can now be entered in **either** the base stablecoin **or** Winiwa, via two linked fields (like the Exchange screen). **Mint:** "You spend" (Winiwa) + "You receive" (USDw). **Burn:** "You burn" (USDw) + "You receive" (Winiwa). Editing either field updates the other live through the oracle rate (`issueUsdwPerWiniwa`/`issueWiniwaPerUsdw` = `SIM_Winiwa_PRICE / usdPerUnit`); the field the user is typing in is never clobbered (programmatic `.value` set doesn't fire `oninput`, so no loop). **The on-chain path is unchanged:** `issueAmt`/`reclaimAmt` remain the canonical USDw amount the test covenant mint/burn read; the new Winiwa fields (`issueWiniwaAmt`/`reclaimWiniwaAmt`) only mirror them. MAX still fills from available balance and the mirror fills the paired field. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.103:** Transaction details modal cleanup. Removed the redundant **Close** button from the header (the `agentActionModal` already closes on a backdrop tap), and the **StablesAgent icon is now pinned at the top-right of the box for every transaction-detail variant** (the main render at activity-contacts.js ~3280 and the fallback render ~3012), matching the exchange-detail header — so it's always in the same place. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.102:** Near-instant updates against a localhost node. Polling latency is dominated by the poll *interval*, not the round-trip (a localhost RPC call is ~ms). So `stablesArmMdsLivePolling` now uses a **~1.2s** balance poll when the connected RPC node is localhost (`localhost`/`127.0.0.1`/`0.0.0.0`), versus 2.5s for a remote node — incoming payments and balance changes feel demo-grade. Still serialized + in-flight-guarded + last-seen heartbeat, so the tighter cadence on a (cheap) localhost node does not reintroduce churn or pill flap. Context: the *truly* instant, sub-second-push feel of the published demo came from running as an installed MiniDapp on the node's **MDS hub** (the node pushes `NEWBALANCE`), which the browser→RPC dev-server path can only approximate by fast polling; for full demo parity the test channel should be installed on the node's MDS. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.101:** UX polish toward the demo-grade feel. **(1) No connect-window flash on refresh.** In web/RPC mode `__STABLES_MDS_DEBUG_CONNECT` is true, so the load handler would pop the RPC connect panel after 1200ms whenever the first poll hadn't landed yet, then close it once auto-reconnect connected (line ~18266) — a visible flash on every refresh. `stablesTryAutoOpenNodeConnectModal` now returns early when a saved node URL exists (`stables_rpc_url`/`stables_direct_node_url`): auto-reconnect connects silently and the panel is never shown. It still opens for genuine first-time users (nothing to reconnect to), and a truly unreachable saved node still surfaces via the pill + cert-error fallback. **(2) Instant first Receive QR.** The receive-address cache (`__STABLES_NODE_RECEIVE_ADDRESS_PAIR`) is cleared on connect, so the first Receive open paid a `getaddress` round-trip before the QR appeared. `stablesMarkNodeRpcConfirmed` now prewarms it in the background on first connect, so opening Receive hits the cache and renders the QR immediately (subsequent opens were already instant). No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.100:** Restored **fast incoming-payment detection** (retail-critical, non-negotiable). v97 slowed the RPC poll to 6s to cut churn, which also slowed how fast a received payment appeared (up to 6s) — a regression for retail, where a receive must show in a couple of seconds, including in the **mempool before block inclusion**. Fix: **decoupled** the two reads. `balance` is polled briskly again (**~2.5s** in RPC mode, matching the pre-v97 feel), so an incoming coin (which the node reports as `unconfirmed`, surfaced as the v98 "Confirming" figure) shows within ~2.5s; `block` height, which only changes every ~50s, is fetched at most every ~12s (gated by `wantBlock` / `__STABLES_LAST_BLOCK_POLL`), so most ticks are a single `balance` request. All the connection-stability fixes stay in place — serialized (one request open at a time), in-flight guard (no pileup), and the last-seen heartbeat (pill stays steady through blips) — so the faster cadence does **not** reintroduce the churn or the pill flap. MDS mode is unchanged and still gets the instant `NEWBALANCE` push (forced refresh). No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.99:** Connection pill no longer flaps in Pure Minima (web/RPC) mode. After v97 the indicator started flipping between the block height/"Live" and "Node issue" because the v97 debounce made the node's *intermittent* poll failures visible (before v97, `rpcOk` never reset in RPC mode, so the pill was permanently "Live" and hid them). A polled core node will occasionally error a request under load, which is **not** a disconnect. Fix: a **last-seen heartbeat**, `stablesMarkNodeRpcConfirmed` stamps `lastOkAt` on every good poll, and `stablesNoteLivePollFailure` now only sets `rpcOk=false` when **both** several polls in a row have failed **and** there has been no successful poll for ~45s. So the pill stays solidly "Live" through transient blips (a handful of missed requests never flips it) and only shows a problem on a genuine sustained outage, recovering on the next good poll. Also stopped firing a pointless `block` request when `status` itself failed (skip straight to balance). No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.98:** Wallet MINIMA row now shows **received-but-confirming** MINIMA. A freshly received coin is not spendable until it is a few blocks deep, so right after a receive the row read `Sendable 0.00 · Locked 0.00` and looked like nothing arrived. The node `balance` already exposes this (the gap `confirmed − sendable`, plus any mempool `unconfirmed`), but the parser dropped `unconfirmed` and the row labelled the gap "Locked", which reads wrong for an incoming coin. Now `stablesParseMdsMinimaFromBalanceResponse` returns a `confirming` figure (`(confirmed − sendable) + unconfirmed`), and a shared `stablesFormatMinimaSubline()` renders the MINIMA row + primary card as `Sendable X · Confirming Y`, showing the **Confirming** part only when there is MINIMA still maturing (clean `Sendable X` otherwise). So a fresh receive is visible immediately and moves to Sendable once it is deep enough. No covenant/script change. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.97:** Stopped the constant connect/disconnect churn on the node's RPC port (e.g. `:9105`) in Pure Minima (web/RPC) mode. The live poll was firing **three concurrent** `MDS.cmd` HTTP requests (`status`, `block`, `balance`) **every 2.8s**, each a fresh no-keep-alive connection, so a core node logged a storm of opens/closes and could pile up requests when briefly busy. The poll is now **serialized** (status → balance, at most one request open at a time; the `block` call is only a fallback when `status` doesn't carry the tip), **skips if a previous poll is still in flight** (15s self-clearing guard), and runs at a **gentler 6s cadence in RPC mode** (the local MDS hub keeps 2.8s). Event-driven refreshes (NEWBALANCE, post-send) pass `force` to bypass the guard for an immediate read. Added a **failure debounce**: a few missed polls no longer flip the indicator, only ≥4 consecutive failures surface a connection problem, and it recovers on the next good poll (this also makes RPC-mode status truthful on a real outage, previously it could read "live" forever). Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.96:** Faucet page "Test tokens" reference block was still showing the **retired Test07** ids (hardcoded in `index.html`, not read from config), so testers saw and could trust dead addresses. Updated to the live Test11 values (Winiwa `0x04BF179E…`, USDw `0x6164689A…`, faucet covenant `0xF38393DF…`, mint covenant `MxG080UYSF…`, issuer `MxG083PTM…`) and, more importantly, made the block **config-driven**: each value carries a `data-faucet-ref` and `populateFaucetTokenRefs()` (called from `syncFaucetUiLabels`) writes the ids + explorer links from `TEST_TOKEN_REGISTRY`, so it can never go stale on a future redeploy, update the config in one place. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.95:** Faucet claim now pre-checks the MINIMA balance **before** creating the optimistic row, and shows a clear error if there is no float. An on-chain claim is built and signed by the user's own node, which costs a **0.0001 MINIMA signing fee**. Previously a claim with 0 MINIMA left a stuck "Building on-chain claim transaction…" row (the MINIMA check threw deep in the build, after the row existed, and the catch only toasted). Now a pre-flight check up front surfaces "you need a 0.0001 MINIMA signing fee, receive a little MINIMA first" and creates no row. Reworded the faucet hint and the claim/mint-burn error copy to name the 0.0001 MINIMA signing fee (dropped the confusing "not a network fee"). Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.94:** Wallet-change guard for multi-wallet-in-one-browser. `localStorage` is per browser origin, so switching the connected wallet (different node/seed) in the same browser was showing the previous wallet's cached balances, activity, and faucet cooldown (assets were not owner-guarded, only activity was). The balance refresh now fingerprints the connected wallet (default address); when it changes, it clears the per-wallet caches (`stables_test_wallet_v1`, `stables_test_exchange_hist_v1`, `USER_ACTIVITY_STORAGE_KEY`, `WALLET_OWNER_KEY`, faucet cooldown) plus the in-memory last-known/detail, and reloads once for a clean slate (loop-guarded by a stored fingerprint + a per-session reload flag; first load just records). Different MDS origins (per-node) already had separate storage; this targets same-origin wallet switches (e.g. the dev server connecting to different nodes). Note (not a code change): a brand-new tester node has 0 MINIMA, and the faucet claim needs a small MINIMA float to sign (it throws "needs MINIMA float, receive MINIMA first") — fund the node before claiming. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.93:** Wallet no longer displays the issuer node's full minted token supply. On the **issuer** wallet (its address matches `TEST_TOKEN_REGISTRY.issuer_miniaddress`), the fast `balance` path was showing the entire supply it holds (~100M Winiwa). Now, on the issuer node only, the test-token rows are recomputed from `coins` and exclude any coin larger than `TEST_WALLET_COIN_CEILING` (default 100,000), so the wallet reflects tester-sized faucet/mint activity instead of the bulk supply. Tester nodes (address != issuer) are unaffected. New `TEST_WALLET_COIN_CEILING` config field. Bumped iteration + dapp.conf. Hard reload required.
- **v0.0.0.1.92:** Re-pointed the test channel to the fresh **Test11** mainnet deployment. Updated `runtime-config` `TEST_TOKEN_REGISTRY` (Winiwa `0x04BF179E…`, USDw `0x6164689A…`, issuer `MxG083PTM…`), the mint/burn covenant (`0x1EAF1E0A…`) + minified script, the faucet covenant (`0xF38393DF…`) + minified script, and `TEST_ISSUER_RPC_URL` → `9005`. The previous config pointed at the retired Test07 tokens/covenants, so the app showed 0 USDw and a stale Winiwa figure; it now reads the live Test11 balances and mint/burn/faucet hit the covenants verified end-to-end on mainnet (mint, burn, faucet claim, and a chain==model conformance run all PASS). Both embedded covenant scripts re-verified to `newscript` to the deployed addresses. Source of truth: `task_circular_economy_testbench/onchain/`. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.90:** Smoothed transaction row opening in Wallet recent and Activity. Added a document-level transaction row router plus stable per-row metadata so the full transaction box opens details consistently after rerenders and tx hash reconciliation. Transaction details now get an explicit Close action and reset modal scroll on open. Updated the handshake agent session rule so every app-code agent run increments the active MiniDapp build number. Bumped iteration + dapp.conf.
- **v0.0.0.1.89:** Cut test channel over to hardened collateral covenant v3 (production-grade). Closes tokenid substitution attack and skim attack: tokenids now hardcoded in script (no more STATE(22)/STATE(23)), added @TOKENID verification on covenant input coin, and on-chain ASSERT covleft EQ (@AMOUNT - amt) remainder enforcement. Mint/burn builder updated to drop the two token ports. New covenant address (script hash change); migration via deploy + seed at v3. Faucet stays Winiwa-only (test Minima substitute). Test phase: full app built on Winiwa/USDw (swap to Minima/USDs for prod is only the collateral token acceptance + naming). Bumped iteration + dapp.conf. Update address/script in runtime-config after running the v3 deploy. Hard reload required.
- **v0.0.0.1.88:** Clean per-transaction activity attribution from node history. Root problem: the node tracks the covenant, so its `relevant`/`difference` view nets out a real mint and shows seeds as the user's; and the wallet address set built from *current* coins missed spent-input addresses. Fix: `buildWalletContext` now also reads `scripts` and adds every simple (`RETURN SIGNEDBY`) wallet address (the complete set, incl. spent; the covenant is a non-simple script so it is excluded). New history strategy hydrates each recent header-only txpow (`txpow txpowid:`) and computes the wallet's net per token from inputs/outputs at our addresses only, emitting one confirmed row per token leg (a mint = +amt USDw and −amt Winiwa; faucet = +Winiwa; send = −amt; no covenant pollution, no phantom seed rows). Re-added `pruneOptimisticRowsSupersededByNode` to merge each optimistic row into its confirmed node row. Validated against the live node: mints/burns/faucets/sends all reconstruct with correct user-only amounts. (Per-sync cost: `scripts` + up to 30 `txpow` fetches; cap can be tuned later.) No covenant/script change.
- **v0.0.0.1.87:** Activity reliability for mint/burn. (1) Node history sync now runs over the RPC bridge (web/Pure Minima), not only the MinimaOS MDS hub. (2) Mint/burn optimistic rows are now linked to the real posted txid (stable row ids + `stablesUpsertUserActivityRows` stamp + a settlement kick), so a successful mint/burn advances to confirmed instead of sticking at a pending counter. (3) Added `pruneStaleUnconfirmedOptimisticRows`: an optimistic row that never linked to a chain tx and is older than the settle window (a failed/dropped attempt) is dropped, clearing the leftover stuck pending rows from earlier rapid-click conflicts. Note: full history reconstruction from this node is not reliable because the node tracks the covenant (its "relevant" view nets out a real mint and shows covenant seeds as the user's), and header-history can't attribute spent inputs — so the fix settles the correct optimistic rows rather than reconstructing rows from history. No covenant/script change.
- **v0.0.0.1.86:** Fixed USDw mint/burn not registering on rapid clicks. Root cause (diagnosed by replaying the exact UI transaction against the node: it posts AND confirms): mint and burn both spend the covenant's single state coin, so clicking again before the first confirms fired mutually-conflicting transactions that the network dropped, leaving only stuck optimistic `1/2` rows. Added a shared single-flight guard on covenant mint/burn (`mintBurnBeginInFlight`/`EndInFlight`, ~70s hold = one confirmation window; released immediately on failure for fast retry) so a second mint/burn is blocked with a clear toast instead of conflicting. Covenant mint confirmed delivering decimal USDw on-chain (CLI `0xBDBF7B4B…` 11.11, replay `0x596A…` 7.77). Activity history-from-node + optimistic-row reconciliation is the next fix. No covenant/script change.
- **v0.0.0.1.85:** Removed the manual Activity "Sync node transactions" button and its visible helper copy. Wallet recent and Activity transaction rows now render as native `button` controls with a direct inline opener fallback, while keeping delegated/capture handlers and stale-row hydration as backup. Removed remaining transaction-detail copy that told users to manually sync. Bumped iteration + dapp.conf.
- Fixed local APK preview seed-invite overlay from auto-opening in dev preview mode so hidden preview backdrops no longer block Wallet or Activity transaction row taps.
- **v0.0.0.1.84:** Made closed `.mback` modal backdrops explicitly inert (`pointer-events: none`, restored only on `.open`) so hidden/closed node-connection overlays cannot intercept Wallet or Activity transaction row clicks. Bumped iteration + dapp.conf.
- **v0.0.0.1.83:** Added hydration for already-rendered Wallet recent and Activity rows, including rows without `data-tx-id`, so the active Activity screen is repaired after route-module load. Transaction detail opening now resolves row ids by visible list index and falls back to a compact detail modal if optional on-chain row fields are malformed. Bumped iteration + dapp.conf.
- **v0.0.0.1.82:** Hardened Wallet recent activity and Activity transaction row opening with a capture-phase row click handler, direct row fallback, keyboard support through the same opener, and bottom-nav-safe list spacing so lower rows are not hidden under fixed controls. Bumped iteration + dapp.conf.
- **v0.0.0.1.81:** Removed the Faucet explorer footnote below the test-token references. Transaction rows in Wallet recent activity and Activity now render as explicit clickable controls with keyboard support and a delegated fallback, and the transaction detail opener tolerates missing counterparty/address fields. Bumped iteration + dapp.conf.
- **v0.0.0.1.80:** Mint/burn covenant builder now surfaces the exact failure (which build step failed, or the txncheck validity flags + per-token conservation mismatch) to the toast and console, so a failed UI mint/burn is diagnosable instead of silently leaving an optimistic row. Confirmed on-chain that the collateral covenant mint works for decimal amounts (CLI repro `0xBDBF7B4B…`, 11.11 USDw delivered); the UI failure is being traced from the surfaced error. No covenant/script change.
- **v0.0.0.1.79:** Removed pool locked token amounts from Winiwa/USDw wallet row presentation; test-token rows now show only sendable wallet balance. Pending on-chain activity settlement now reads real `txpow`/`history` data through MDS or direct RPC, corrects previously guessed block heights, and no longer infers mined blocks from the current tip. Bumped iteration + dapp.conf.
- **v0.0.0.1.78:** Shortened the Faucet claim button label to "Get 1,000 Winiwa" by removing the "(on-chain, test token)" parenthetical from the runtime label helper. Bumped iteration + dapp.conf.
- **v0.0.0.1.77:** Tightened Faucet burn confirmation layout so the burn address wraps cleanly inside the modal. Bumped iteration + dapp.conf.
- **v0.0.0.1.76:** Restructured the Faucet test-token reference block into aligned token rows with wrapping explorer links. Fixed Burn all test tokens so intentional burns can clear Winiwa/USDw balances without the normal test-wallet preserve logic restoring stale Winiwa, and kept burn activity visible after the reset. Bumped iteration + dapp.conf.
- **v0.0.0.1.75:** Corrected test-token wallet rows to display sendable/available balances, not total balances that include locked covenant funds. The localhost webapp refresh path now uses direct RPC for the node `balance` command instead of requiring `MDS.cmd`, so hard refresh should reconcile Winiwa to the native wallet's sendable amount. Bumped iteration + dapp.conf.
- **v0.0.0.1.74:** Aligned test-token wallet display with the Minima wallet balance view. Winiwa and USDw now use the node `balance` rows as display truth, showing total token balance in the row and Available/Locked in the subline, while mint/burn actions still use available/spendable amounts. Optimistic mint/burn clears stale token detail until the next node reconciliation. Bumped iteration + dapp.conf.
- **v0.0.0.1.73:** Removed the manual "Force refresh test balances" wallet button. Test wallet balances now depend on automatic node reconciliation, persisted test wallet state, and pending transaction handling rather than a user escape hatch. Bumped iteration + dapp.conf.
- **v0.0.0.1.72:** Fixed wallet asset total mismatch during pending test flows. Optimistic incoming USDw, Winiwa reclaim, and xWiniwa rows now still show as settling transactions but no longer add a second pending overlay after their balance has already been applied to the wallet. Bumped iteration + dapp.conf.
- **v0.0.0.1.71:** Fixed test wallet persistence. The test channel now uses test-specific wallet/exchange storage keys, migrates from the old demo-named wallet key, no longer clears wallet/activity/cooldown state on hard refresh, and saves optimistic Winiwa, xWiniwa and USDw balance changes immediately so the wallet can restore the same balances before node reconciliation. Bumped iteration + dapp.conf.
- **v0.0.0.1.70:** Updated visible test-channel copy in Wallet help, Welcome guidance, Merchants, Mint tour, oracle labels, and send/merchant guidance so testers see live Winiwa, xWiniwa and USDw test-token flows instead of stale demo/Wables-only guidance. Bumped iteration + dapp.conf.
- **v0.0.0.1.69:** Corrected the Mint stress status label from "Minting Locked" to "Guarded" so the test channel matches locked Stables mechanics: CR is visible risk information, not a protocol mint/burn permission gate. Bumped iteration + dapp.conf.
- **v0.0.0.1.68:** USDw mint/burn is now **fully trustless on-chain** via `collateral_covenant_v2` (reserve-release model). Replaced the two-step issuer-API path (`/mint-usdw`, `/burn-usdw`) with a single atomic covenant transaction the user's node builds and signs itself; the issuer signs nothing. MINT locks `amount` Winiwa and releases `amount` USDw 1:1 from the covenant reserve; BURN returns USDw and reclaims Winiwa from the pool. Added `TEST_MINT_BURN_MODE: 'covenant'` + `TEST_MINT_BURN_COVENANT_ADDRESS`/`_SCRIPT` to runtime-config; new `mintBurnCovenantOnChain()` in test-channel-bootstrap.js (mirrors the proven faucet covenant claim). Legacy issuer-API path kept behind `TEST_MINT_BURN_MODE: 'api'` as fallback. Proven on Minima mainnet from the wallet node (MINT `0xA3A7BA40…`, BURN `0xFD2E5C54…`, 1:1 conservation verified). Covenant `0xD3A28EBC…06E`. Bumped iteration + dapp.conf. Hard reload required (monolithic index.html cache).
- **v0.0.0.1.67:** All explorer links in the Faucet panel now consistently use https://explorer.minima.global/search?q= (including for token IDs). Winiwa and USDw token codes are now clickable links. Covenant, pool and issuer also use search links. Updated both the live #page-faucet (index.html) and faucet.js. Bumped iteration.
- **v0.0.0.1.66:** Made the faucet page info (token IDs, covenant/pool/issuer addresses + direct explorer links) visible in the actual loaded UI. The references block is now inside the static #page-faucet (the one shown by navigate). Updated drawer label to "Faucet", page header to "Faucet (test)". Bumped iteration and dapp.conf. Hard reload required to see (monolithic index.html cache).
- **v0.0.0.1.65:** Faucet page (the one with "Get ... Winiwa" button, titled "Faucet (test)" in header) now includes the full token + pool references and Minima explorer links as requested. Added "Force refresh test balances" button in wallet ccy list for 3-test to help pull live test token balances. Removed default-hidden for USDw and xWiniwa ccy rows so they appear in wallet. Version 65.
- **v0.0.0.1.59:** Fixed "i dont see any transaction in the wallet": extra setTimeout forces in all optimistic append paths (pour, xWiniwa mint, USDw mint) and appendUserActivityRow. All tests (Winiwa pour on-chain, xWiniwa mint, USDw mint) now show tx in wallet recent + activity with correct UX (optimistic + live). Version 59. Synced dapp.conf.
- **v0.0.0.1.52:** Additional robustness for on-chain test tx progress. Added extra force renders of x/y counters, settling indicators and activity on every NEWBLOCK (fast 1-block feedback). Bumped iteration and synced dapp.conf. Matches the full hardened wallet and activity behaviour from the session summaries (instant display, live counters, no phantom balances, optimistic pours).
- **v0.0.0.1.51:** Reconstruction session bump. Reinforced all described transaction lifecycle features from prior session summaries (optimistic rows, x/y counters, auto-settle, balance preserve, infra filtering, instant ingest, try/finally sync, comma formatting, 1,000 on-chain covenant pour, no demo fallbacks). Source state now fully matches the complete test channel UX and on-chain faucet. Synced dapp.conf and prepared for three-platform verification on active line.
- **v0.0.0.1.50:** Version bump and hand-off build. Synced `dapp.conf` description with iteration; packaged `Stables_v0.0.0.1.50.mds.zip`. Includes v5 covenant faucet config, full test tx UX from v0.0.0.1.49, and on-chain pour sequence. Hard reload or reinstall zip to pick up.

- **v0.0.0.1.49:** Full one-shot rebuild from today's work (executed after plan confirmation): 
  - Enforced , thousand separators (en-US toLocale, fmtLocaleInt, updated formatters, toasts, balances, activity).
  - Restored full tx in-progress: x/y counters (txConfirmLine, txConfirmationsShown), amber settling subline, pendingIncoming overlays on hero + per-ccy, pulse, auto-settle on NEWBLOCK/NEWBALANCE/NEWTXPOW, immediate optimistic rows with localOrigin for pours/mints.
  - Faucet pour full sequence: "Pour started" toast+button, optimistic row (FAUCET-POUR, pendingIncoming, minimaOnChain), navigate to wallet, post covenant tx, update row+ingest, background poll mined+ingest+refresh(preserve)+sync.
  - Balance no reset: fast balance path, preserve last known, no zero in reconcile, auto-kick sync, no 5min throttle, relaxed phantom filters.
  - Mint matches pour (optimistic + indicators).
  - Cleaned all demo 10k/10000 texts and fallbacks in 3-test/ (always 1,000 test on-chain, strong isTest guards in claim, routes, shell).
  - Force UI updates (renderPending, updateGlobalUI, renders) after rows and on boot.
  - try/finally in sync for no stuck spinner.
  - Version + full changelog.
  Hard reload or rebuild to see (cache was hiding). Source now has the complete test on-chain tx process.

- **v0.0.0.1.45:** Cleaned more old demo "10,000" / 10000 strings from 3-test/index.html (including updating fallback branches to test 1,000 + comma). Further strengthened claimFaucetWiniwa guard and amt logic. The dapp structure (large index.html with embedded + loaded scripts) means browser cache of *previous* versions of the JS files can make it look like test changes are "lost" or "replaced by old demo" until you hard-reload (Ctrl+Shift+R) the page loading the *current* edited source. This is inherent to the current Minima dapp format (single-file for compatibility). Source edits are the truth and persist. We are retrieving the lost tx process by ensuring the shell doesn't leak demo fallbacks and the advanced logic in activity-contacts.js (x/y, settling, pour sequence) is the one used for test. No more 10k in test UI paths.
- **v0.0.0.1.42:** Reviewed the entire transaction process from ~v0.0.0.1.30 (x/y live counters, amber "settling" sublines + hero pulse, per-currency pending overlays, immediate NEWTXPOW/NEWBLOCK ingest + auto-settle, special pour leg handling and sequence). Reinforced for Winiwa in test channel to prevent any regression to older interface. Added explicit post-append kicks (refreshPendingSettlement, onLiveBlockTick, liveResync) in appendTestFaucet to guarantee the full display and event sequence triggers for pours.
  - Winiwa balances and tx rows now show the pending + x/y immediately and update live as designed.
- **v0.0.0.1.40:** Fixed stuck "spinning wheel" / loading indicator when retrieving transactions (the _txSyncInFlight flag could remain true if any error occurred during history sync).
  - Wrapped node history sync core logic in try/finally so _txSyncInFlight is *always* cleared and renders run (prevents perpetual spinner).
  - Error is logged but never leaves UI in loading state.
  - Retains all prior immediate display, no-reset, fast balance, auto-kick, and comma separator work.
- **v0.0.0.1.39:** Wallet balances (Winiwa, USDw, etc.) and transactions now display automatically and immediately on connect / wallet view / refresh — no more reset to 0 and no artificial delay. Matches native Minima wallet behaviour.
  - Added fast direct 'balance' path in test token refresh (applied instantly before slower scoped 'coins' queries).
  - Aggressive preserve of last-known positive balance on 0/null results (never reset on refresh).
  - Removed balance zeroing from activity owner reconcile (only activity rows filtered).
  - Early boot + live polling + NEWBALANCE now kick fast balance refresh + node tx sync + recent activity render.
  - Transactions load via auto-kick + immediate sync on empty lists.
- Consistent comma (,) as thousand separator everywhere for user-facing numbers (balances, activity amounts, tx details, faucet, vault, counts, blocks, toasts).
  - Fixed `fmt()` (app.js) and `fmtAmt()` (activity) to always use 'en-US' locale formatting.
  - Replaced bare .toFixed() and undefined-locale toLocaleString() for amounts with locale-aware formatters that produce 1,000 style.
  - All money displays and large integers now uniformly use commas.
- Mint (xWiniwa + USDw) now matches faucet pour UX exactly: instant button reaction + optimistic activity rows on click (localOrigin protected), immediate currency total + hero balance update with pulse/indicator, pending tx status and block-count progress on rows. Early append + optimistic balance before network/issuer steps + background sync (same pattern as faucet NEWTXPOW/pendingIncoming handling).
- **v0.0.0.1.36:** Historical transactions (node 'history') were not loading automatically at all.
  - Always force history sync (not throttled) when navigating to My transactions / activity page.
  - Added kickoff for sync in renderWalletRecentActivity if empty (test on-chain).
  - Relaxed isPhantom... and prune: prune incoming from infra only if the row's 'address' (user side) is infra itself. Legitimate historical receives (counterparty=issuer but to user addr) now kept.
  - Version bumped for this run on local 8095. Historical + optimistic txs should load auto when viewing lists.
- **v0.0.0.1.32:** Wallet **Currencies** section shows **6 enabled rows by default** (was 3); additional currencies remain behind **Show more currencies**.
- **v0.0.0.1.31:** **Instant transaction display** (like Minima wallet): `NEWTXPOW` ingests sends, faucet pours, and incoming payments immediately; txnpost response ingests without waiting for history sync; wallet recent activity keeps showing optimistic rows while sync runs in the background.
- **v0.0.0.1.30:** Incoming payments **pass 1/y and auto-settle**: mined txpow ids assign block height from chain tip when history lags; settlement runs on **NEWBALANCE** and **NEWBLOCK**; receive warning clears once confirmed (no longer stuck at 1/y).
- **v0.0.0.1.29:** **Phantom pool/covenant UTXO rows** (issuer pool replenish, tracked script noise) no longer import as user receives or bogus MINIMA sends; infra coins filtered at pool + issuer + covenant addresses; faucet pour balance **no longer wipes to 0** while the indexer catches up.
- **v0.0.0.1.28:** Wallet **receive settling warning** (amber subline) and transaction **x/y counters** stay aligned — both show at least **1/y** while an incoming payment is settling; mined txs count as 1+ even if chain tip has not refreshed yet.
- **v0.0.0.1.27:** **x/y counter and auto-settle** now resolve pending rows by mempool `transactionid` (faucet pour) as well as txpow id; mined block height is applied immediately from history/`txpow` on each NEWBLOCK; open transaction detail live-updates while settling.
- **v0.0.0.1.26:** Incoming payment **x/y block counter** advances on each new block, pulls mined block height from node history, and **auto-settles** rows (Confirmed + wallet overlay cleared) when the target is reached — no manual sync.
- **v0.0.0.1.25:** Wallet **per-currency totals** (Winiwa, Minima, USDw, etc.) include incoming mempool payments while they settle — same overlay as the hero total, with a pulse on the affected row. Send/mint MAX still uses confirmed balance only.
- **v0.0.0.1.24:** Wables mint and burn **Wables price** row is tappable — flips between `1 USDw ≈ X Winiwa` and `1 Winiwa ≈ Y USDw` (persists per browser).
- **v0.0.0.1.23:** Wables mint page **Available Winiwa** no longer drops to 0 after USDw mint: balance refresh queries sendable coins at all `keys` addresses (hex + Mx), retries while the indexer catches up, and applies an optimistic deduction after the pool send.
- **v0.0.0.1.22:** Test wallet no longer treats issuer/pool/covenant addresses as yours when a second node tracks those scripts on mainnet. Balances sum **sendable coins at your `keys` addresses only** (not node-wide `balance` or `relevant:true` pool UTXOs). Activity sync drops phantom USDw/Winiwa rows (e.g. **100,000,000** reserve); wallet vault clears on wallet-owner switch.
- **v0.0.0.1.21:** Winiwa and USDw wallet balances use `balance tokenid:… address:<your receive hex>` — no longer the node-wide total (fixes **100,000,000 USDw** showing when connected to the issuer reserve or tracked pool UTXOs).
- **v0.0.0.1.20:** Outgoing activity rows (incl. faucet MINIMA float) always show **−**; amount sign follows `dir: out`, not stored polarity alone.
- **v0.0.0.1.19:** Browser tab title follows `APP_STAGE` (Test channel shows **Test · Stables**, not Demo).
- **v0.0.0.1.18:** Faucet pour Activity shows **+1,000 Winiwa** (claim leg only): covenant pool replenish/seed outputs excluded from incoming amount when `trackall` tracks the faucet script.
- **v0.0.0.1.17:** Activity cache bound to the node’s primary key address (not tracked covenant coins). Opening a different wallet in the same browser clears localStorage + session activity before sync; guard runs on MDS connect and Activity open.
- **v0.0.0.1.16:** Wallet hero total includes incoming amounts immediately and pulses until each payment reaches the user’s settlement block target (default **1 block**); amber subline shows `x/1` progress. Applies to MINIMA and Winiwa (faucet pour).
- **v0.0.0.1.15:** Covenant pour navigates to Wallet (not Activity); single stable `FAUCET-POUR-WINIWA` optimistic row updated in place; Activity dedupe matches txpow + leg (Winiwa row no longer dropped when MINIMA float leg syncs).
- **v0.0.0.1.14:** Covenant pour shows immediate “Pour started” toast + button state; optimistic Activity row on click; history sync splits faucet tx into +Winiwa and −MINIMA float rows (no longer drops incoming leg).
- **v0.0.0.1.13:** Faucet covenant v5 split-pool — each pour splits pool input (out0 claim, out1 remainder at covenant) so the next pour is possible in the same txn; `STATE(25)` pool_remain; pool coin must be ≥ 2× claim amount.
- **v0.0.0.1.12:** Covenant pour polls node history for mined `txpowid` after mempool post; Activity merges faucet rows via `pendingTxnId` on sync.
- **v0.0.0.1.11:** Faucet claim MINIMA float reserve lowered to `0.0001` (`TEST_FAUCET_MINIMA_FLOAT_RESERVE`). Activity row stores mempool `transactionid` until mined `txpowid` syncs.
- **v0.0.0.1.10:** Faucet uses on-chain covenant pour (`TEST_FAUCET_MODE: covenant`) — any synced wallet with MINIMA float can claim 1,000 Winiwa via MDS `txncreate` (no issuer API). Per-wallet cooldown key. v4 covenant address in `runtime-config.js`.
- Forked shell from `2-demo/` for test channel (`APP_STAGE: test`, `v0.0.0.1.01`).
- Added `assets/test-channel-bootstrap.js` for on-chain Winiwa faucet via local API (`8789`).
- `runtime-config.js`: `TEST_TOKEN_REGISTRY`, issuer RPC URL, faucet endpoints.
- Level 1 blocked on issuer MINIMA float: retry `tokencreate` per `task_test_channel/LEVEL1_NODE_SETUP.md`.
- **v0.0.0.1.02:** Wired 3-test UI to real on-chain test tokens (Level 2 interim). Faucet uses issuer API (no localStorage demo credit). `stablesRefreshLiveNodeBalances()` syncs Winiwa and USDw from MDS `balance`. Mint USDw: user MDS-sends Winiwa to pool, then `/mint-usdw` on issuer API. Burn: user MDS-sends USDw to issuer, then `/burn-usdw`. Registry fields: `usdw_token_id`, `pool_miniaddress`. Issuer API extended in `task_test_channel/tools/test-faucet-server.mjs`.
- **v0.0.0.1.04:** Channel pill shows version only (no “Test” label). Menu: demo channel marked Superseded at v0.0.0.3.49; active test line shows version only. Synced `feedback.js` platform/page pickers and consent-gated Send from demo.
- **v0.0.0.1.05:** Faucet fix for MiniDapp (`MDS.net.GET` to issuer API). More drawer + button use `1,000` comma format (`en-US`). Side menu faucet copy synced for test channel.
- **v0.0.0.1.06:** Channel menu: drop “channel” label, wrap Superseded badges, menu rows show stage + version (Test · v0.0.0.1.06); closed pill shows version only.
- **v0.0.0.1.07:** Activity sync includes test-channel Winiwa and USDw (not MINIMA-only). Faucet claim appends incoming row and triggers node history sync.
- **v0.0.0.1.08:** Fixed Activity empty after faucet: wallet-owner reconcile no longer wipes app-local rows (faucet/optimistic); test-specific activity storage keys; faucet opens Activity after claim.
- **v0.0.0.1.09:** Faucet errors when issuer RPC is wrong node (Test08 on 9005 vs Test07 issuer). Issuer `/health` reports Winiwa sendable; Activity also mirrors faucet rows in sessionStorage.

**Purpose:** Every change worth telling users, Council, or social channels gets a line here **when you merge the change** into this version. At release, copy the section for that version into release notes, Telegram, and X.

**Format:** [Keep a Changelog](https://keepachangelog.com/) style. Use **Added**, **Changed**, **Fixed**, **Removed**, **Security** as needed. Dates in ISO (`YYYY-MM-DD`).

---

### [Unreleased], next daily build

- **v0.0.0.1.91:** Fixed recent activity and transaction list detail opening by cleaning prefix hashes in getTxById, and resolved infinite document layout re-open loop by passing skipReopen: true on contact and note input blur.

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
