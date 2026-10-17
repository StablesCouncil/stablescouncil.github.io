# Stables first community test: what is in scope and what is not

*Authoritative scope boundary for StablesAgent and external AIs. Written 2026-08-01 for the first Stables test release (`TV81-P12-XR1`, decisions `TV81-D23` and `TV81-D24`); updated 2026-09-03 when the standalone Android app became the first published artifact. If any other
document in this knowledge base describes a capability as available and this document says it is
deferred, **this document wins.** Every statement below is about what a tester can actually do.*

> **On the future stablecoin launch (added 2026-09-08).** How the first stablecoin will eventually be
> created has now been settled by the Council and written down. It changes nothing here: stablecoins
> remain **out of scope** for this test and switched off in the build. That plan describes a future
> phase with no date and several numbers still undecided.

## The one-line answer

The first Stables community test is the **Stables test release**: claim Winiwa from an on-chain faucet, mint
it into xWiniwa at one for one, burn xWiniwa back to Winiwa, and send or receive both. Trading,
stablecoins, investing products and merchant tools are **not part of this test** and are switched off
in the build.

## What a tester can do

- Install the **Stables Android app** (v0.0.14.002). It is one app. It can run its own Minima node, or use Minima Core on the same phone. The person chooses on first open when Core is present, and later under Settings and updates, Your node. Each node is its own wallet. The separate Core-connected app is retired.
- Claim **Winiwa** from the on-chain faucet covenant.
- Put Winiwa or xWiniwa on the **Stables card** from Savings (Manage card), **pay another phone by holding the two phones together**, with no network needed, and take money back to Savings. Each coin on the card is held by a one-use key inside the phone's secure chip. The card needs an Android phone whose chip makes one-use keys; it was tested on a Pixel 7 Pro (stock Android) and a Pixel 7 (GrapheneOS). On any other device, and in the web app or MiniDapp, the card shows "Not on this device" and takes nothing. A withdrawal to Savings is approved by the test Council within minutes; if the Council stays silent it pays itself after 20 blocks. The on-chain evidence, every chip signature included, is public at https://stablescouncil.org/stables-card-evidence/.
- **Mint** Winiwa into **xWiniwa** at par, one for one, through the on-chain vault covenant.
- **Burn** xWiniwa back into Winiwa at the same par rate, in whole or in part.
- **Send and receive** Winiwa and xWiniwa using Minima addresses or a QR code.
- Read honest balances, honest transaction states, and an Activity record.
- Use the profile, preferences, security, help, Academy, links and feedback pages.

## What is NOT in this test

None of the following is available to a tester, and none of it can move funds in this build. Each
one is deferred by decision `TV81-D23`, not cancelled.

Each bullet repeats the boundary on purpose, so that no single statement can be read out of context.

- **USDw and every other stablecoin are not part of this test.** You cannot mint USDw, burn USDw, or
  hold it in this release. There is no launch price, no uniform seed and no pooled coverage-ratio
  accounting. USDw is not offered as a wallet asset, a send option, a mint asset or an activity
  filter. It is deferred, not cancelled.
- **The fiat display currencies are not part of this test.** EURw, GBPw, JPYw, CADw, AUDw, CHFw,
  CNYw, VNDw, TRYw and the rest do not exist as tokens, cannot be sent to a friend, cannot be
  received, and are not shown anywhere in the release build. If someone asks to send EURw or GBPw,
  the honest answer is that those currencies are not available in this test at all.
- **Trading of any kind is not part of this test.** There is no Trade page, no Exchange, no Bulk
  Orders, no order book, no liquidity ladders and no market pricing in this release. You cannot
  place an order, fill an order, cancel an order or swap one asset for another. The trading venue is
  deferred to a separate project and a later Council decision.
- **The `xWiniwa/Winiwa` and `USDw/Winiwa` markets are not part of this test.** Neither market is
  reachable in the release build.
- **Coverage Funds are not part of this test.** You cannot deposit into a Coverage Fund, you cannot
  withdraw from one, and it pays nothing to anyone today. The same is true of every other
  stablecoin-dependent investment product. Nothing in this release is a yield or return opportunity.
- **Market-priced xWiniwa issuance and forward minting are not part of this test.** The only rate in
  this release is par, one for one.
- **Merchant tools and the Ambassador program are not part of this test.** You cannot list a shop,
  onboard a merchant, run a campaign, or earn from listings in this release. The Ambassador economy
  is designed and documented, but it is not shipped software and there is nothing to join today. The
  On/Off ramp, Treasury and Council governance surfaces are deferred in the same way.

If a user asks for any of these, say plainly that it is not part of this test release, that the
design work exists and is preserved, and that it returns only through a later Council decision.

## The assets are valueless

**Winiwa and xWiniwa are test tokens with no value.** They are real tokens on Minima mainnet, so the
transactions are real and consume real chain capacity, but the tokens themselves are not money, are
not an investment, and are not redeemable for anything. Nobody should send real value to a
test-token address. A tester needs a small amount of real MINIMA to pay signing fees.

- Winiwa token id: `0xd4f5dd3546f25d327cbf2b6867e193ce5db6491ac9c65bbdcecaca1a6688063f`
- xWiniwa token id: `0xefa53eff58616ddbdf0b6d6dbb4e18f041c4509fb3db3b7e5482b99abc72f127`
- Faucet covenant: `0x5e08c5dcd965b9460c4734dc6113ae747c98dfec31b13feadf5805d464f49930`

## How the app reaches the chain

The Android artifact is one **Stables app** (v0.0.14.002, published 2026-10-17). It can run **its own Minima node inside the app**, or use **Minima Core** already on the phone. The person chooses on a new install when Core is present, and later in Settings and updates, Your node. Each choice is its own wallet. Switching moves no funds and restarts the app. The separate Core-connected download is retired.

- Install from **https://stablescouncil.org/payment-app/** or from the GitHub release **StablesCouncil/stables-app, tag app-v0.0.14.002**, file `Stables_v0.0.14.002.apk`. Verify the SHA-256 published with the release before installing an APK from anywhere else.
- With the built-in node, nothing else has to be installed. There is no RPC address and no RPC password. With Minima Core, allow Stables inside Core. Stables does not ask for an RPC address in either case.
- **Each node keeps its own wallet.** In the built-in mode the wallet lives inside Stables. In Minima Core mode, Minima Core holds the wallet and the seed. Stables never asks for a seed phrase or a vault key. Anyone asking a user for one is attacking them. Install a new version over the old one; **do not uninstall**.
- A payment through Minima Core is not claimed for this release. The release showed the Core connection and that the built-in wallet returns when you switch back.
- **Network contribution** is a setting in the app: how much the phone helps run Minima while on
  battery (Pause, Minimum, Balanced, Maximum). On the charger the node always runs at full speed.
  The app shows what the phone contributed: TxPoW today and in total, time online, hash rate, and a
  daily chart.
- Because the app runs the node, it holds the Android network permission the node needs.

The coordinated v0.0.14.002 release also includes `Stables_v0.0.14.002.mds.zip` for MinimaOS and the web app at `https://stablescouncil.org/dapp/3-test/`. MinimaOS uses its host node; the web app needs a connected node. The separate Core-connected app is retired.

Use the versioned downloads on the official access page and GitHub release.

## Balances tell the truth or say nothing

A current spendable figure requires the exact coins to be proven from the chain. The app may retain a remembered balance with a last-seen or syncing label; that is not payment readiness. The proof state controls the matching action:

- **Syncing** while the app is still reading.
- **Proof unavailable** when the required coins cannot be proven from this node.
- **Ready** when the exact coins are proven.
- **Stale** when the data is older than it should be.

A blank or an explicitly remembered figure must not be presented as a current zero or a ready balance. Send, Claim, Mint and Burn are disabled until the
coins they depend on are proven. If a user reports a missing number, that is usually the app being
truthful about proof, not a bug.

## Status of the release itself

Stables v0.0.14.002 is the coordinated testing release dated 2026-10-17 for the web app, MinimaOS and one Android app, and the first of the 0.0.14 line. It succeeds v0.0.13.007 from 2026-10-13. Its headline is the Stables card made more robust:

- **Card money that proves itself at any age.** Every Add now goes through a deposit gate on Minima mainnet. The gate's contract only lets the deposit's marker exist together with the payment into the vault, and Minima derives a coin's id from the transaction that made it, so any phone can check a deposit from its marker alone, however old it is. Each phone's node keeps the proofs of the deposits behind its card money and passes them on with each payment. Card money on older deposits moves onto new ones by itself (the card refresh), through the Council.
- **Payments that break off are settled.** If the phones part after the payer signed but before the receiver confirmed, the payment shows "Not confirmed". After two minutes the payer's phone asks the receiver over the network: if the receiver has it, it reads Sent; if not, the receiver signs a refusal and the Council refunds the amount to the payer's Savings.
- **Double payments caught at exit.** The Council keeps every hand-over it has approved, so a coin paid to two people by a broken chip is refused when the second copy tries to leave the card.
- **Smaller details.** A short sound and vibration when a tap reads a payment request and waits for the person to confirm; a Card upkeep setting (Automatic, When charging, Off); technical transactions hidden from Activity unless shown in Settings, Advanced.

The evidence for the card, with the contracts and the code to check it, is at https://stablescouncil.org/stables-card-evidence/.

The release is `StablesCouncil/stables-app`, tag `app-v0.0.14.002`, with access through https://stablescouncil.org/payment-app/. It is an early testing update for the Minima community. Stablecoin issuance, trading, merchant business tools and production use remain outside this release. Winiwa and xWiniwa have no value. Report problems through the in-app feedback page.

The app can appear while the standalone node boots, but payments still require fresh status and wallet proofs. Card-speed checkout, guaranteed cold-payment readiness and isolated battery efficiency have not been established.
