# Stables MiniDapp — Wallet & Send features

## Sending Minima

The send flow lives in the wallet's Send modal. It supports single and multi-recipient sends.

### How sending reaches the node (standalone app, web, MinimaOS)

**In the published test release the app is the standalone Android app, and this is the case that
matters for testers.** It runs its own Minima node on the phone; the wallet, the keys and the node
data live inside the app. There is no pairing step, no RPC address to enter and no RPC password: if a
user is being asked for one, they are not on the standalone app. The assets a tester can send in this
test are **Winiwa and xWiniwa only**.

The two cases below are development and parity surfaces, not the test artifact.

In the **web version**, the app connects to your Minima node over **RPC**, and both reads (balances, block height, activity) and **sends** go over that RPC. Enable the node's RPC with no password (`rpc enable:true`) and a browser can talk to it directly: enter the node's RPC address in Connect (the RPC port is the node's main port + 4) and leave the RPC password blank. (If the node runs RPC with a password, a small local CORS proxy is also needed, because a browser cannot send the auth header to Minima directly.) In the **MinimaOS-installed app**, sends run over MDS in write mode with no extra setup.

### Single send
Enter a recipient address (or scan QR), enter amount, choose currency, tap **Confirm send**. The app builds: `send address:ADDR amount:AMT tokenid:0x00`

### Payment protection tiers (v0.0.0.3.45)
Three send speeds on top of normal wallet security:
- **Quick pay:** QR scans that include address and amount can send immediately when the total stays under the user's quick-pay limit (optional 2-second undo in Settings, Security).
- **Standard pay:** Review, then tap Confirm send.
- **Protected pay:** Requires a 4-digit **payment code** before a significant send, a multi-recipient send, or a contact marked Protected pay. Set the code under Settings, Security, Payment protection (Set payment code is always visible on that card). On the standalone Android app, protected pay can use fingerprint or face when the device supports it, with payment code as fallback.

Limits use the **wallet primary currency** (the starred currency on the Wallet page, for example Minima). Each contact can override tier on the contact detail card (Inherit, Quick pay, Standard pay, Protected pay).

### Multi-recipient send (up to 14)
Minima supports up to 14 outputs in one transaction. In the Stables send modal:
- Tap the muted **Split across multiple recipients** link below the amount row (or **+ Add recipient** once split mode is active)
- The counter shows e.g. **2 / 14**
- All recipients share the same currency (selected once on row 1)
- The confirm button updates to **Confirm send to N** when N > 1
- The app builds: `send multi:["ADDR1:AMT1","ADDR2:AMT2",...]`
- Total balance check runs against the sum of all amounts

### Paste-to-expand
Users can paste a comma- or newline-separated list of `ADDRESS:AMOUNT` pairs directly into the first address field. The app automatically splits them into separate recipient rows. Example paste:
```
MxG080...:0.002, MxG081...:0.003
MxG082...:0.005
```

### Inline QR camera
The send modal opens with a live camera strip at the top. It auto-starts when the modal opens. Point at any Minima address QR code — the address fills automatically and the camera closes. Tap **✕ Close** to dismiss the camera without scanning. The QR scanner FAB button at the bottom of the app also opens this send modal directly.

### Contact book
The 📖 button next to the address field opens the contact picker, allowing users to select saved contacts as recipients.

### Payment protection tiers (Quick / Standard / Protected)

Stables classifies each send into one of three tiers for speed and safety:

| Tier | Behaviour |
|------|-----------|
| **Quick pay** | When you scan a payment QR that includes address and amount, and the total is under your quick-pay limit, the send can execute immediately (optional 2-second undo in Settings → Security). |
| **Standard pay** | You review the recipient and amount, then tap **Confirm send**. |
| **Protected pay** | Requires your 4-digit **payment code** before confirm. Applies when the amount reaches your significant threshold, you send to multiple recipients, or the contact is set to Protected pay. |

Limits use your **wallet primary currency** (the starred currency on Wallet, for example Minima). Other assets are converted to that primary equivalent before comparing limits (same rates as the send modal ≈ line). Configure limits under **Settings → Security → Payment protection**.

**Payment code:** 4-digit spending guard, set under Payment protection or inline on first protected send. Stored as a salted hash on the device only, not your Vault key. On the Stables phone app, fingerprint or face can confirm a protected send instead (Security, Payment protection, "How you confirm a protected send"); phone lock screen still protects the app today.

**Contact payment tier:** On a contact's detail card, set **Payment tier** to Inherit (amount rules), Quick pay, Standard pay, or Protected pay. Favourite chips in the send modal show tier hints.

---

## UTXOs — what they are and why they matter

### What is a UTXO?
UTXO stands for Unspent Transaction Output. In Minima (like Bitcoin), your balance is not a single number in a database — it is made up of many individual coin fragments, each from a previous receive event. Every time you receive Minima, a new UTXO (coin fragment) is created.

When you send, Minima selects one or more of these fragments as inputs, combines them, and creates new outputs.

### Why too many UTXOs is a problem
- **Slow coin selection:** The wallet has to evaluate more fragments to find the right combination.
- **Transaction limits:** Each Minima transaction has a limit on how many inputs it can consume. If you have hundreds of tiny UTXOs, some transactions may fail because they would need too many inputs at once.
- **Wallet performance:** High UTXO counts can slow down balance queries.

### Who accumulates UTXOs quickly?
- Merchants who receive many small payments
- Users who run multi-send operations frequently (each recipient output may later generate its own fragments)
- Anyone who receives many small top-ups from a faucet

### How to explain UTXOs to users without jargon
Use the phrase **"coin fragments"** or **"wallet health"**. For example: *"Your wallet has 47 coin fragments. Consolidating them into one will speed up future transactions."*

### UTXO consolidation (planned feature)
A one-tap **Consolidate** action in the wallet will merge all coin fragments by sending the full balance back to the user's own address. Minima command: `consolidate tokenid:0x00` (or specify a token). The UI should show the before/after fragment count and ask for confirmation before executing. This feature is planned but not yet built.

---

## Currency support in the send modal

The currency selector shows all vault balances: Minima (native), mUSD, mCAD, mEUR, mCHF, and any other stablecoin tokens in the vault. For multi-recipient sends, all recipients receive the same currency in one transaction. Cross-currency multi-send (e.g. send mUSD to one address and mCAD to another in one tx) is not supported — one currency per transaction.

---

## Minima send command reference

| Scenario | Command format |
|---|---|
| Single send (Minima) | `send address:MxABC amount:1.0 tokenid:0x00` |
| Single send (token) | `send address:MxABC amount:1.0 tokenid:0xTOKENID` |
| Multi-send (up to 14) | `send multi:["MxABC:1.0","MxDEF:2.0"]` — native Minima only in current build |
| Consolidate UTXOs | `consolidate tokenid:0x00` |

All commands run on **Minima mainnet**. Stables never uses testnet.
