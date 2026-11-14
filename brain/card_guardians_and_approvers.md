# The Stables card's approvers, guardians and their programs

Written 2026-11-03. Status: **testing phase.** The Stables card runs on Minima mainnet with valueless test tokens
(Winiwa, xWiniwa). Every approver key and every guardian key is still held by the Stables lab. The programs described
here are version **0.1.0-test** and will change before any real money. Nothing here has had an external audit.

Public sources (link to these when answering):
- Card Guardians page (seats, approver keys, live status): https://stablescouncil.org/guardians.html
- Guardian documentation: https://github.com/StablesCouncil/stables-card-evidence/blob/main/docs/GUARDIANS.md
- Security plan: https://github.com/StablesCouncil/stables-card-evidence/blob/main/docs/SECURITY_PLAN.md
- The programs' code: https://github.com/StablesCouncil/stables-card-evidence/tree/main/programs (git tag
  `programs-v0.1.0-test`, changelog in `programs/CHANGELOG.md`)
- Card figures: https://stablescouncil.org/test-dashboard.html#card

## The newest vault, R2T6 (on mainnet since 4 November 2026, test tokens)

The sections below describe R2T5, the vault public testers' cards use. R2T6 is its successor and differs as follows.

- **Address:** vault 0xABE3A0418FE472C2A96325B1939A9FAB74A927873B26A5CC5F389EFB68656429, seal head
  0x2EF19A1992254D658332085AAAEA09AEC0245D711F4A9756C3F12E107723E88D.
- **Keys:** the 11 approver keys are spread over three machines, and any 7 sign a seal. The Stables lab still holds every
  key, and the 9 guardian seats are still lab keys. Never say they are independent.
- **Payout wait on the R2T6 vault:** on the R2T6 vault an approved payout waits between 216 and 288 blocks after its seal is mined, 3 to 4 hours and usually close to 4. Guardians always have at least 3 hours to act.
- **Refusals:** if the approvers refuse a valid request, five of the nine guardians can have it paid, after 3 days. A
  refusal is final only if the approvers confirm it after 7 days.
- **Silent approvers:** after 3 days of silence, six guardians can only announce a handover to backup approvers fixed
  when the vault was created. After a 7-day public wait anyone can carry it out.
- **Read on 9 November 2026 (block 2,410,567):** 43 seals in all, 3 of them guardian actions; 4 payouts after a seal and
  1 by the 3-day rule; 1 request refused; none open. The request left undecided on purpose was paid by the 3-day rule
  with no approver signature on 9 November, in block 2,410,567. A freeze and its release were rehearsed on mainnet.
- **Programs:** the guardian and approvers' programs for R2T6 are version 0.2.0-test, published in `programs/` of the
  evidence repository (git tag `programs-v0.2.0-test`).

## Words used

- **The approvers:** the group of 11 keys that approve or refuse requests to move card money back to Savings. Any 7
  sign a decision (a "seal"). Older documents and the code call them "the Council". The word Council is now kept for
  decisions taken by the Stables community, the Stables Council.
- **The guardians:** 9 seats, each a key plus a program run by a different operator (a person or an organisation), that watch the approvers.
- **The vault:** a script on Minima, with no owner key, that holds the money behind every card. Its address for vault
  generation R2T5 is 0x5E2497EC163480AEC7C15B43A62FDBED9595FA38ED1DE2ACC4A0A4F0E1287791.

## How it works when everything is normal

- Paying with the card needs no one: card money moves from phone to phone by touch, offline, with no server.
- Moving card money back to Savings: the app posts a request; the approvers check it, usually within a minute or two,
  and approve it in a seal; after a safety wait of 144 blocks (about 2 hours) the vault pays. Recent requests reached
  Savings in about 2 to 4 hours in all.
- Nobody holds the money: the vault pays only by its own rules. Neither the approvers, nor the guardians, nor the
  Stables lab can take money out any other way.

## What keeps it safe and unstoppable

- Every payout is checked twice: by the approvers, then by the nine guardians during the 2-hour wait. One guardian can
  stop a wrong payout; three freeze all payouts; five lift a freeze; the approvers cannot lift a freeze.
- If the approvers do not answer a request, the vault allows it to be paid after 3 days with no approver key, as long
  as their heartbeat (a seal at least every 6 hours) is under a day old. No program posts that payout by itself yet: the
  guardian program will (being built); until then it is posted by hand.
- If the approvers disappear, payouts pause instead of opening. After 3 days of silence (or 7 days frozen), six of the
  nine guardians can install new approvers.
- A coin paid once can never be paid again: the chain keeps an exit record of every paid card coin.
- Known limit, fix designed: if the approvers explicitly refuse a valid request, that money stays locked in the vault.
  On 13 October 2026 a 166.1 Winiwa withdrawal was wrongly refused and the Stables lab paid it back by hand, as it will
  for any wrongful refusal until the fix. The fix, for the next vault: five guardians can overrule a refusal. Meanwhile
  every guardian raises an urgent alert when the approvers refuse a request it found good.

## What an approver and a guardian are, technically

Each is two things: **keys** written into the vault, and a **program** that uses them.

- The vault was created with a fingerprint (the seal head,
  0xD6462FFC684A99C146D0FFE4D1681FF61BD7DB99122ECBDD64E7F702AF425561) that holds the 11 approver public keys, the 9
  guardian public keys and the rules. The vault accepts a transaction only with enough valid signatures from those
  keys, and only for what the rules allow. Keys can be replaced without a new vault.
- Keys are Minima's one-time-signature keys, which can sign only a limited number of times. Each program signs through
  a journal that counts every key's uses.
- **The approvers' program** (`programs/approvers/r2t5-council.mjs`) runs beside a Minima node holding the 11 keys.
  Every 30 seconds it checks new requests with the card's verifier (`R2Checker.java`), seals new approvals and refusals
  and at least every 6 hours as a heartbeat, posts refusals, pays approved requests after their wait and publishes the
  exit lists. Today it runs on one server held by the Stables lab.
- **The guardian program** (`programs/guardian/guardian.mjs`) runs on the guardian's own machine next to its own
  Minima node, never relying on the approvers' server. Every 5 minutes it re-checks open requests with the same
  verifier, rebuilds every seal's approved and refused lists from the chain and compares them with its own verdicts,
  stops a request it finds wrong (after checking it twice, 20 blocks apart), checks in on chain every 7 days, and
  writes each decision to a hash-chained log it can publish hourly to its own public repository. It alerts its owner
  over Parlons!, with no central chat server. It is read only unless posting is switched on twice. Freezes, releases
  and replacing the approvers are prepared for the owner to sign, not signed alone. It can run in a Docker "guardian
  box" with its own node. An Android guardian mode is designed, not built.
- Status: the guardian program passes 65 of 65 tests offline. Its first real transaction, a check-in for seat 1
  (Bridle), was mined in block 2,400,643 on 3 November 2026. No guardian program runs continuously yet and none
  publishes its log yet.

## What programming language the guardian and approvers' programs are written in

The guardian program and the approvers' program are written in **JavaScript** and run with **Node.js** (version 20 or
newer). Their files end in `.mjs`, which means JavaScript modules. The check of each request, `R2Checker.java`, is
written in **Java** and is the same code the Stables phone app uses. The vault's rules themselves are written in
**KISS VM**, Minima's on-chain script language, so they run on Minima, not in any program. The guardian box uses
Docker and shell scripts. All of it is in https://github.com/StablesCouncil/stables-card-evidence/tree/main/programs,
version 0.1.0-test, from the testing phase.

## The nine guardian seats

Farrier (seat 0), Bridle (1), Paddock (2), Halter (3), Stirrup (4), Tackroom (5), Lantern (6, planned on a phone),
Hayloft (7, planned on a personal computer), Gatepost (8, planned on a separate server). All keys are held by the
Stables lab today. Each guardian checks in on chain; a seat counts as active for 30 days after a check-in, and a seat
whose guardian has not checked in for 60 days can be filled by election.

## Who will run them

The Stables Council will decide who operates each approver and guardian role, by bidding and for a fixed term, with pay that
rises with measured quality. Operators can be people or organisations. See `stables_council_one_structure.md`.

## Are they independent? The security plan

Not yet. In the testing phase the Stables lab holds all 11 approver keys (on one server) and all 9 guardian keys. That
is acceptable only because the tokens have no value. The vault is safe as long as no one reaches 7 approver keys, or 6
guardian keys, or both groups together. Before any real money:

1. No machine and no person holds 7 approver keys: the 11 spread over at least three machines and operators. The
   approvers' program needs multi-machine signing for this; it is not built yet.
2. Approvers and guardians never share a machine or a person.
3. No one holds 6 guardian seats: seats run by independent operators.
4. Next vault: guardians can only hand over to backup approvers fixed at the start, after a 7-day public wait, so six
   captured guardians cannot take control.
5. Next vault: five guardians can overrule a refusal.
6. Each key holder guards their key and its use journal.
7. No central point in the software; the code is public.
8. Everyone can see who is awake: check-ins on chain, hourly guardian status, the Card Guardians page.

Gates before real money: the above in place, guardian programs running and publishing, an external review, and the
decision taken by the Stables Council, the community.

## Answering rules for this topic

- Asked whether a withdrawal "pays itself" after 3 days: say the vault allows it to be paid after 3 days with no
  approver key, but no program posts that payout by itself yet; the guardian program will, and until then it is posted
  by hand. Never say it pays itself automatically today.
- Always say these programs are from the testing phase (version 0.1.0-test) and will change.
- Never say the approvers or guardians are independent today: the Stables lab holds every key.
- Never present the card as handling real money: Winiwa and xWiniwa have no value.
