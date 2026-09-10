# Keeping your bank up to date: Updating, catching up, and Resync

This is about the **Stables standalone Android app**, which carries its own Minima node. Your bank
is that node. When people say the app is "stuck on Updating", this page is the answer.

## What the states mean

The Network section in Settings and updates shows one of these.

- **Up to date.** The node holds the newest block. Balances are current and everything works.
- **Updating.** The node is behind the network and is trying to catch up. It also says how old the
  newest block it holds is, and whether the gap is closing.
- **Connecting.** The node is starting. Normal for the first seconds after opening the app.
- **Not connected.** The node is not running, or could not be reached. Close and reopen the app,
  and check that background mode is on.

## Why your balance is not shown as confirmed while it says Updating

A node that is behind still answers questions. It answers them with what was true when it stopped
following the chain, which may be days ago. Showing that as your balance would be showing you a
number the network no longer agrees with.

So while the app is Updating, balances are marked as not current and the actions that would spend
them (send, mint, burn, claim) stay closed. This is deliberate. **It is not a bug and it is not a
lost balance:** your coins are on the chain and your key is on your phone. The app is refusing to
tell you something it cannot currently prove.

### The four words a balance can show instead of a number

Wherever a figure would go, the app shows one of four states rather than a number it cannot stand
behind. A blank or a word in place of a balance is an answer, not a failure:

- **Syncing…** the app is reading the chain and does not have a proven figure yet.
- **Stale** the node answered, but the node itself is behind, so the figure is not current. This is
  what you see while it says Updating.
- **Proof unavailable** the node cannot currently prove the coins behind this figure, so no number
  is shown and the actions that would spend it are closed.
- **Ready** the figure is proven against the chain, and everything is available.

None of these means your money is gone. They mean the app will not show you a number it has not
proven.

## Catching up normally

A node that has been off for a few hours catches up by itself, usually in minutes. You can watch it
happen: the Network section names how far back it is and how many blocks it has gained since the
page opened. Leave the app open, on power if you can, and let it work.

## When catching up will not work, and what to do

Minima nodes catch up by asking their peers for the blocks they missed. A node that has been off
for a long time falls outside the window peers can serve, and then **waiting does not help, however
long you wait.** The app tells you when it has reached this point: it says it has not gained a block
in some minutes, and offers **Repair with Resync**.

### Resync, step by step

1. Open **Settings and updates** and scroll to **Network**. If the app is offering **Repair with
   Resync**, tap it; it takes you straight to the form. Otherwise scroll on to the **Resync**
   section.
2. Leave the **Recovery node** as it is unless you have been given another one. It must be a Minima
   node with MegaMMR enabled; the default is `spartacusrex.com:9001`.
3. Tick the acknowledgement, then start the resync.
4. Leave the app open and the phone on power. It downloads a validated chain snapshot and searches
   it for your wallet's coins.
5. The app restarts itself when the resync finishes. It then checks the node and wallet proofs before showing readiness; a restart alone does not prove that it is up to date.

### What Resync does and does not do

- It **keeps your Vault key, your settings and your local records.** Your wallet is not recreated
  and your key never leaves the phone.
- It **replaces this app's local copy of the blockchain** and finds your coins again in it.
- It **cannot invent history it never had.** App records for activity it never saw, or covenant
  state it was never tracking, do not come back.
- It is **not** a factory reset, and it does not require your recovery phrase.

## How to avoid needing it

- Open the app now and then, rather than leaving it closed for weeks.
- Leave background mode on, so the node keeps following the chain while the app is closed.
- The network contribution setting decides how hard the phone works on battery, not whether it
  follows the chain. Even at Pause the node still keeps up when the app is open.

## If you are asked for evidence

### Startup and payment readiness

The v0.0.11.86 candidate opens the standalone app screen while its embedded node starts. A visible screen or a remembered balance is not proof that a payment can be sent. Payment actions still depend on fresh node status and the required wallet coins being proven. Failed wallet proofs can be retried.

Warm resume with an already running node and cold startup are different measurements. Current testing does not establish a guaranteed cold-payment time, card-speed checkout, or battery efficiency. Keep the phone's selected network contribution setting; do not promise that Android will keep the node running permanently.

Report the **Block height** shown in the Network section, what the Updating line says about how old
the newest block is and whether it is gaining, and your app version from Settings.
