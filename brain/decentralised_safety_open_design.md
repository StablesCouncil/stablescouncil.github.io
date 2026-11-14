# No central point: how Stables keeps working without its operator (open design, feedback wanted)

Status, stated plainly. Written 2026-11-03 from the Stables development notes. Everything here runs with
**valueless test tokens** (Winiwa, xWiniwa) on Minima mainnet, or is a **design not yet deployed**. Nothing here has had
an external audit. Each section says whether it is **built and seen working**, **built, not yet deployed** or **decided,
not yet built**. The founder's goal: no central point anywhere, so the system keeps working if the approvers' server
disappears. We want other builders and agents to find the holes.

## 1. Every phone can answer proof requests (built and seen working, test release 0.0.14.081)

- **The problem:** after a long resync, a phone's node may lose the proofs of its own card deposits. Without them, its
  card money can only leave through the approvers, which are a central point.
- **How it works:** the phone leaves a small request on chain at a keyless "proof post box": a coin anyone may spend,
  naming the deposits it needs. Any node that follows the card's deposits answers by spending that coin back to the post
  box with fresh proofs attached.
- **No trust needed:** the asking phone's node checks every proof itself. A wrong answer can move nothing. No signature
  and no key are involved.
- **Every Stables app can now answer,** not only the approvers' server. The built-in node answers only while charging on
  Wi-Fi, to protect the battery. Apps that use a separate node app answer only if the person switches it on, because
  following every deposit adds load to that node.
- **The approvers' server now waits about 10 minutes (12 blocks) before answering,** so phones get the first chance. It is
  one answerer among many, and a backstop.
- **Seen on 2026-11-02:** with the approvers' server stopped, a phone answered a request and its answer was mined in
  Minima block 2,399,310.

## 2. A free, keyless maintenance token (built)

- Housekeeping (proof requests, shared snapshot pages) costs tiny amounts. It is paid in **SAND**, a separate free token,
  never in the person's money.
- SAND comes from a **keyless on-chain faucet**: a coin whose script hands out 1 SAND per claim to anyone, with no
  server and no signature.
- **Since 0.0.14.080, every wallet claims 1 SAND at install,** whichever node it uses. One SAND covers 100 million proof
  requests.
- Open question: a keyless faucet can be drained by anyone. What should refill it, and how should claims be limited
  without a server?

## 3. Guardians watch the approvers (designed; first version being built)

- The card's vault pays money back on chain only with the approvers' approval: 7 of 11 keys. Today those 11 keys sit on
  one server, accepted for the testing phase.
- **Guardians** are independent programs, each with its own key. They re-check every payout request against the facts
  on chain.
- **Any single guardian can stop a payout it finds wrong.** 3 can freeze everything; 5 release a freeze.
- **Every payout waits about 3 hours (216 blocks).** Guardians are guaranteed at least about 2 hours to act.
- Guardians never pay anyone. They can only stop, freeze and release.
- **The first guardians will run on a phone, a PC and a separate server,** none of them the approvers' server. The
  guardian program is being written now.

## 4. A fallback that stops censorship (in the design, on for the card)

- If a person asks to take money out and the approvers approve nothing for about 3 days, anyone can carry out the payout (no program does it by itself yet: the guardian program will, and until then it is posted by hand),
  with no approver key. The cap is 1,000 test tokens a day, and guardians can still stop a bad one.
- So approvers who are alive but ignore someone cannot keep that person's money.
- Known limit: the fallback works only while the approvers' heartbeat is fresh. If the approvers' server dies, recovery
  goes through guardian succession instead.

## 5. Making guardian capture harder (built in the next vault design; decided for the card before real money)

These two rules are already in the next vault design, used first by the Minima Bay Bridge. The founder decided both go
on for the Stables card before any real money, and as early as possible.

- **Handover to backup approvers:**
  - Without it, 6 of 9 guardians could install any new approver keys after a long silence, so 6 captured guardians
    could take the vault.
  - With it, guardians can only announce a handover. After a 7-day public wait anyone carries it out, and it can only
    install backup approvers fixed at the start.
  - Working approvers or a guardian release cancel it.
  - The cost: the backup keys must be kept safe from day one, and recovery is slower.
- **Public guardian swap:**
  - Without it, if only 3 guardians stay active, they can fill every silent seat with people they choose after 60 days.
  - With it, a swap is announced, waits 7 days in public, and needs a majority of all 9 seats. The current holder voids
    it just by checking in.
  - The cost: refilling seats after many guardians truly vanish is harder.

## Questions we want feedback on

- Are the waits right: 3 hours before a payout, 3 days for the fallback, 7 days for a handover or a swap? A shorter
  wait pays people faster but asks more of guardians.
- How do you keep guardians independent and awake over years, without paying them in a way that makes them a target?
- Who should hold the backup approvers' keys, and how should they be stored?
- Is a phone a reasonable home for a guardian, given that Android can stop background apps?
- What breaks first if most users run phones and nobody runs a server?
