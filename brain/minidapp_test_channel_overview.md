# Stables MiniDapp, Test channel overview (active development line)

*For StablesAgent and external AIs: what the Stables test channel is, what works on-chain today, how
a tester reaches it, and how it relates to the frozen demo and to future production. Rewritten 2026-08-01 for the first Stables test release; updated 2026-09-10 for the coordinated v0.0.11.88 testing release. The binding scope statement is
**`release_scope_boundary.md`**; where this document and that one disagree, that one wins.*

## What the test channel is

The **Test channel** (`dapp/3-test/`, stage `test`) is the **sole active Stables MiniDapp
development line**. The earlier Demo channel (`dapp/2-demo/`) is frozen. Production, meaning real
Minima collateral and real stablecoin issuance, is a future phase that begins only after the test
work is proven.

In the test channel:

- **Winiwa** is a practice stand-in for Minima: a real token on Minima mainnet with **no value**.
- **xWiniwa** is the equity-side test token, also real on mainnet and also with **no value**.
- The flows that ship are **fully on-chain and trustless**. The issuer created the tokens and seeded
  the covenant pools; it does not sign user transactions and does not need to be online.

It is an **early testing release**. There may be bugs and unexpected behaviour. Testers should use a
dedicated test wallet, or one holding only funds they are willing to risk. Using the app at this
stage is a testing contribution to the community and it is appreciated. The code is open for review
at `github.com/StablesCouncil/stablescouncil.github.io`; if in doubt, seek a third-party opinion.

## What ships in the first community test

- **Own node on the phone.** The standalone Stables Android app runs its own Minima node inside
  the app. Nothing else has to be installed and there is no pairing step. The **Network
  contribution** setting decides how much the phone helps run Minima on battery (Pause, Minimum,
  Balanced, Maximum); on the charger the node runs at full speed.
- **Winiwa faucet, trustless and covenant-based.** Any synced wallet with a small MINIMA signing fee
  can claim Winiwa from the on-chain faucet covenant. There is a cooldown between claims. The whole
  supply sits in the permissionless pool: there is no issuer to ask and no refill step.
- **xWiniwa mint and burn at par, trustless and covenant-based.** The user's Core node builds and
  signs an atomic transaction against the vault covenant. One Winiwa becomes one xWiniwa, and one
  xWiniwa becomes one Winiwa, in either direction. The contract enforces the rate; the app does not.
  Burns may be partial, and the remainder can be burned later.
- **Winiwa and xWiniwa send and receive**, on-chain, using native sends with the test token ids,
  including QR.
- **Honest balances and Activity.** Four proof states (Syncing, Proof unavailable, Ready, Stale),
  actions disabled until the required coins are proven, and no simulated success anywhere.
- **Support surfaces:** profile, preferences, security, help, Academy, links and feedback.

## What is deferred out of this test

Deferred means switched off in the build and unable to move funds, not cancelled:

- USDw and every other stablecoin, including all minting, burning and coverage-ratio accounting;
- the fiat display currencies (EURw, GBPw, JPYw and the rest), which have no tokens;
- trading of any kind: Trade, Exchange, Bulk Orders, order books, liquidity ladders, market pricing;
- Coverage Funds and other stablecoin-dependent investment products;
- market-priced xWiniwa issuance and forward minting, since the only rate here is par;
- merchant tools, the Ambassador program, the On/Off ramp, Treasury and Council governance surfaces.

The trading venue is owned by a separate project and returns to the Stables release only through a
later Council decision and a completed handover.

## How to access the test channel

1. **Standalone Android app, v0.0.11.88, testing release 2026-09-10.** Install from
   https://stablescouncil.org/payment-app/ (the Download button) or from the GitHub release
   `StablesCouncil/stables-app`, tag `app-v0.0.11.88`, file `Stables_v0.0.11.88.apk`; verify
   the SHA-256 published with the release. Install a new version over the old one and never
   uninstall: the wallet stays on the device.
2. **Minima Core companion, v0.0.11.88, testing release 2026-09-10 (first released at v0.0.11.60 on 2026-09-05), pairing-tested, not rehearsed.** For
   phones that already run the official Minima Core Android app: the companion has no node of its
   own and no Internet permission; it pairs with Core on the same phone and uses Core's node and
   wallet. Same GitHub release, file `StablesCore_v0.0.11.88.apk`, same signing certificate, and
   the second Download button on the access page. Sends through Core need the payment code set in
   the app. Tested on one phone (reconnect, claim, mint, partial and full burn, each on the chain);
   the three-wallet rehearsal has not happened yet.
3. **MinimaOS MiniDapp, v0.0.11.88 testing release.** Install or update `Stables_v0.0.11.88.mds.zip` through the MinimaOS hub. It uses that node and its wallet. An existing installation does not update automatically when the download changes.
4. **Web app, v0.0.11.88 testing release.** Open `https://stablescouncil.org/dapp/3-test/` and connect a node for chain operations. The browser does not contain an embedded node.

This coordinated update succeeds public v0.0.11.63. All four access options are listed at https://stablescouncil.org/payment-app/.

## Startup and retail testing groundwork in v0.0.11.88

Currency notes are grouped by wallet address, with amounts, ages and individual selection retained. Select all covers every address.

The standalone app opens while its node starts. Payment actions still require fresh node status and wallet proofs. Failed proofs remain retryable, and concurrent receive-address requests share one node read. Faster screen loading is not proof of cold-payment readiness or battery efficiency.

Retail testing groundwork binds incoming payment matching to invoice identity, recipient, token, exact amount and expiry, and checks confirmation policy again before release. Merchant business tools remain deferred from the public test scope. Broadcast detection is not block confirmation; no extra Maxima submission message is required.

## Other changes included since public v0.0.11.63 (developed through v0.0.11.82)

**Each currency says what is still arriving.** A faucet claim or a mint only counts in your balance
once the network has confirmed it, which takes a few minutes. Until then the figure on a currency row
did not include it, and nothing on the screen said so, so a person could not tell whether the amount
they had just claimed was already counted. The row now carries the amount on its own, for example
"+1,000.00", directly under the balance, with no wording at all. It appears only while that amount is
genuinely not yet in the figure above it, so a plus figure always means "on top of what you can see"
and no plus figure means everything is counted. It disappears by itself once the amount is final. A
faucet claim or a mint adds no plus figure, because the app credits those to your balance the moment
they are sent and there is nothing left to add; the row still pulses gently while it confirms. The currency pinned at the top of the wallet, which
is where most people look first, had no settling signal at all before this and now carries the same
line. If the app cannot prove your balance yet it shows no figure and no arriving line either: an
unproven number is never shown as though it were current.

**MAX offers only what you can actually spend.** Claiming Winiwa and then pressing MAX on the Mint
page could put more in the field than the wallet could pay, and the mint was refused with "Not enough
Winiwa in your wallet". A claim belongs to you the moment it lands and shows in your balance straight
away, but coins cannot be spent until the network has confirmed them a few blocks later. MAX now
reads what can actually be moved, so it can never offer more than the network will accept. A payment
on its way out still lowers your balance immediately.
**The xWiniwa vault runs as four independent lanes.** A mint and a burn no longer wait for each
other and can be confirmed in the same block.

**Your app can help someone who has just installed Stables.** A brand new install after a quiet day
cannot see the faucet or the vault, because a node only sees coins its own window still reaches. Your
app can publish a small proof to Minima that any node reads for itself, with no server in the way.
You can turn this off, and the app now says whether it wrote and why not.

**Other changes.** Opening the app no longer stalls while every repeating job fires at once. Mint
prices xWiniwa in Winiwa rather than leaving the price line empty. Exchange says when it opens
instead of quoting an order book this release does not include, and a button that cannot be pressed
is shown as unavailable. A currency this test does not have says so instead of showing a balance of
0. Hiding your amounts now also stops the settling animation, which previously still signalled that
money was landing.
## What was new in v0.0.11.63 (2026-09-06): the battery release

Everything in this release is about what the app asks its node when nobody is waiting on anything,
measured on a phone before and after.

- **The Minima Core companion asks Core about ten times less while idle and nothing from the
  pocket**, with the same screens and the same freshness: Core's own pushes carry the app between
  reads, a balance or block push that arrives while the app is hidden is remembered and answered on
  return, and an incoming payment still lands through the transaction push within seconds. Measured
  on a Pixel: 8.2 commands a minute on screen to 3.0; 2.25 a minute in the background to 0.33.
- **The standalone app no longer re-tracks an old faucet claim on every open.** It used to resume
  the most recent faucet claim that was not confirmed, whatever its verdict, and ask for the history
  every five seconds for ten minutes, with a "Faucet claim syncing" card on the Wallet the whole
  time. A claim is resumed only while it is genuinely settling.
- **Merged mint and burn rows are no longer re-judged, removed and re-created on every open**, and
  an old failed row no longer makes every open re-read transactions that were never this wallet's.
- **The on-chain chat scans every 15 seconds only while the Chat page is on screen**; elsewhere it is
  a two-minute safety net, kicked at once by the node's transaction push.
- **A node that cannot yet prove the faucet pool is retried gently** instead of sixty times a minute.
- **The app keeps a ledger of who asked the node what** and prints it every five minutes on screen,
  so the next cadence is attributed rather than guessed.

Measured on the same Pixel, standalone, idle on the Wallet page: 24 node commands a minute at
v0.0.11.62 to 5 to 9 a minute at v0.0.11.63; the first five minutes after an open: 277 commands to 78.
If someone asks whether the app drains the battery: the open app's node traffic was measured and cut
in this release; the numbers above are the measured ones, and the embedded node's own syncing work
is separate from the app's asking.

## What is new in v0.0.11.60 (2026-09-06)

- **A second mint or burn waits for the first to land.** Every mint and burn spends the vault's one
  balance state coin, so two in flight are a double spend and the network keeps only the first. The
  app used to guard that with a 70 second timer; a burn measured on a phone took four minutes to
  mine and a second one started three minutes later vanished in silence. The guard now holds until
  the coin the operation spent is gone from the node, survives a restart, and lets the next
  operation through the moment the chain has moved. Meanwhile a second attempt is told: your
  previous mint or burn is still being confirmed.
- **A dropped mint or burn is marked failed within minutes**, with the balance corrected, and it
  stays failed across restarts.
- **A settling claim or burn is credited once, never twice**: the token row and the total agree while
  a transaction is landing.
- **Notes are combined before a payment that would spend too many.** Pre-approved by default through
  the Wallet management setting Combine notes when a payment needs it; turned off, the app asks
  first with the exact figures.
- **The bank says when it has drifted off the network** and offers the resync: a node that came back
  on its own divergent copy of history can look connected and moving while sharing nothing with
  everyone else. Nothing is shown while the bank is healthy. On the companion the button opens
  Minima Core.
- The burn confirmation wears the same red as the burn button. StablesAgent is told what page you
  are on and what was just said, and answers once.
- **The Minima Core companion is published** for the first time (see How to access, item 2).

## What was new in v0.0.11.53 (2026-09-04)

- **Your bank tells you when it is out of date.** A phone that has been offline too long to catch
  up on its own says so on the Wallet page, in place of the balance, and offers one action: Resync
  with the network. The message also arrives once as a pop-up. A first run is never told this.
  Settings, Network says how far behind the bank is and whether the gap is closing.
- **Nothing is called failed while your node still has it.** A faucet claim the node had accepted
  used to be marked failed after three minutes while the node was still relaying it. A claim the
  node can see now waits; a claim that genuinely fails hands the faucet countdown back.
- **Payment progress shows the time each step finished and how long the current step has run.**
  Broadcasting says when the bank has no peers to relay to; Settings, Network reads "Alone" or
  "Connected to N other nodes".
- **Fingerprint or face is offered in the open.** Under Payment protection, "How you confirm a
  protected send" has two rows: Payment code (Set, then Change) and Fingerprint or face. A row the
  phone cannot honour is greyed out and says why.
- **Commas for thousands everywhere**, in every figure and every amount field.
- Opening the app asks the node once for what several parts want at the same moment. Mint and
  burn work on a fresh node. StablesAgent answers on the first try. Send sits on the right and
  Receive on the left wherever both are offered. Recent activity has See all.

## What is new in v0.0.11.38

- **Network contribution:** choose how much the phone helps run Minima on battery (Pause, Minimum,
  Balanced, Maximum), the charger always at full speed. The app shows what the phone contributed:
  TxPoW today and in total, time online, hash rate, and a daily chart.
- The open app uses about a third of the battery it did.
- **Your notes, in your hands:** on Wallet management, each token has Manage. See the exact notes
  (the coins) behind a balance, pick the ones to combine or split, choose how many notes to end
  with, and see the transaction size against the network limit before sending.
- **Errors in plain words:** a transaction that is too large says so in kilobytes and offers Manage
  notes on the spot.
- One place for every action; a sheet closes with its Back; burn confirmations are red.
- Security page: Payment protection and Confirmation policy as two sections.
- Every step of a payment shows when it completed. Broadcasted is its own step: the receiver sees a
  payment the moment it is on the network.

## StablesAgent inside the test channel

The in-app StablesAgent opens with a short guided series covering **What works right now** (the
faucet, par mint and burn, send and receive), **Set up my bank**, and **Explore the app**. That
series is local to the app and works offline.

Free-text questions are answered by the agent on the web (https://agent.stablescouncil.org and the
Telegram bot). If no answer can be reached, the app says so rather than leaving a question
unanswered in silence.

## Relationship to Demo and Production

| Channel | Status | Token mapping | What it proves |
|---------|--------|---------------|----------------|
| **Showcase** | Legacy preview | Simulated | First UX shell |
| **Demo** | **Frozen** | Simulated Winiwa and Wables | Hardened wallet, payment protection, themes |
| **Test** | **Active development** | Real Winiwa and xWiniwa on mainnet, no value | Trustless faucet, covenant par mint and burn, on-chain sends, honest proof states |
| **Production** | Future phase | Real Minima and real stablecoins | Real value, full protocol economics |

## Frequently asked, in plain words

- **What is Stables?** A merchant-owned banking system built on the Minima blockchain and run by the
  Stables Council: independent businesses and their customers hold and move money in a system they
  own, with stablecoins designed for everyday payments and a community treasury behind them. Today
  it is in an early testing phase on Minima mainnet with valueless test tokens; the stablecoins, the
  trading surfaces and the merchant tools are designed but not part of this test.
- **What can I test today?** Claim Winiwa from the on-chain faucet, mint it into xWiniwa one for
  one, burn xWiniwa back to Winiwa, and send or receive both, every step a real transaction on
  Minima mainnet signed by your own wallet.
- **How do I get Winiwa?** From the Faucet page in the app: 1,000 Winiwa per claim, once per wallet
  per hour, from an on-chain covenant that nobody approves and nobody can refuse. The node must be
  synced first.
- **What are Winiwa and xWiniwa?** Two real tokens on Minima mainnet made for this test, both with
  no value. Winiwa stands in for Minima itself; xWiniwa stands in for the equity side of the
  protocol, minted one for one against Winiwa in the vault and burned back at par.
- **Is my money safe?** In this test there is no money at stake: the tokens have no value and
  nothing is an investment. The wallet, the node and the keys live inside the app on the person's
  device; Stables never asks for a seed phrase or a vault key, and anyone who does is attacking
  them. It is an early build: use a dedicated test wallet or one holding only funds you are willing
  to risk, never send real value to test-token addresses, keep recovery details backed up, and
  update by installing over the old version, never by uninstalling.
- **Where do I download the app?** From stablescouncil.org/payment-app: the standalone Android app
  (its own Minima node on the phone) or the Minima Core companion (uses the official Minima Core
  app's node), both from the GitHub release with SHA-256 checksums. The MiniDapp for MinimaOS and
  the web version come later.

## Safety framing for users

- Winiwa and xWiniwa have **no value**. Nothing here is money and nothing here is an investment.
- The test channel runs on **Minima mainnet**, so transactions consume real on-chain capacity and
  require a small MINIMA balance for signing fees.
- Do not send real value to test-token addresses.
- **The node, the wallet and the keys live inside the Stables app on the device. Stables never asks
  for a seed phrase or a vault key.** Anyone who asks a user for one is attacking them. Never
  uninstall the app to update it; install the new version over the old one.
- Report bugs and regressions through the in-app feedback page.
