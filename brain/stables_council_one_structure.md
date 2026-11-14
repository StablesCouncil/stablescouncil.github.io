# The Stables Council and the one structure (card, Minima Bay, Bridge)

Written 2026-11-04. Status: **testing phase, and upcoming.** This is a decision taken on 4 November 2026. The Minima
Bay app and website still show their old "DAO" pages until their next update: the app's next version and the website
update will show "Governance" pointing to the Stables Council. Nothing below is governed yet; no vote has been held.

## One structure

The Stables card is the main piece, and it needs Minima Bay (the app that carries The Pool and The Rapids) and the
Bridge (ETH to ETHx on Minima) to exist. So all of them are held and maintained by the Stables Council, the community,
as one structure. A weakness in one part is a weakness of the whole. One rule applies to every part: no single part can
steal the funds or lock them for good, and if any one part stops, the rest still pays.

## Who governs Minima Bay

Minima Bay has no DAO of its own. It is governed by the Stables Council, the community that holds and maintains the
Stables card, Minima Bay (The Pool and The Rapids) and the Bridge as one structure. The Council decides what can be
governed for Minima Bay as a whole; a decision only reaches what comes next, and no vote can change a deployed
contract, an order or a balance. Nothing is governed yet: who votes is the Council's first decision.

What the Council decides for Minima Bay:

- **Contract versions:** whether a new contract version becomes the one the apps use. This is how Minima Bay upgrades
  without anybody holding an upgrade key.
- **Markets:** which pairs the apps list. Anyone can always trade any pair a contract supports.
- **Tick size and minimum order:** stamped into an order when it is placed, so a change applies to new orders only.
- **Book publishing:** how often the Swap's order book is written to chain for new nodes (today every 50 blocks).
- **Matchers and their fee:** who matches Trade's orders, their bond and the fee that pays them.
- **The Bridge's validators and fees:** who sits on the Bridge's committee, their bond and the fee each way.

How it works: Minima Bay's contracts have no admin key, no upgrade key and no operator, and a deployed contract cannot
be changed. So a decision sets what is normal for new orders and which contract the apps use next; the old contract
keeps running as long as anybody uses it. Decisions are taken by quarter (epochs), measured in blocks, because block
height is the only clock every node agrees on. The Swap itself is fee-less: on an order book the maker sets the price,
so the spread is the fee.

## Who operates each role (decided 9 November 2026)

Everything is held by the Stables Council, and only the operation of each role is delegated. An operator is a person or an
organisation. The roles are approver, guardian, Bridge validator, matcher, and server and software maintenance.

- The Council decides who operates each role, for how long and on what terms. It holds the mandate. Each operator keeps
  its own key and runs its own program.
- Today the development team operates every role. Over the coming months and years each one is decentralised, step by step.
- Terms are voted, for two years, and staggered: about a third of the seats come up every 8 months. An operator stays until
  replaced, so payouts carry on whatever happens to a vote.
- The Council votes the fee structure, and roles are awarded by bidding. Pay is higher when the quality is higher, such as
  uptime and contribution, measured from public facts. It never comes from customer money.
- One operator can run its role on several machines, for resilience, with one key per machine in a future vault. A seat counts once however many of its machines sign.
- Bidding is open to operators who meet a minimum quality, no operator may win enough seats to reach a threshold, and pay never counts stops or refusals.

## Answering rules for this topic

- Present the operator model as decided and still to be built: no bidding, term or vote has happened, and who votes is the
  Council's first decision. Never say a role is independent today.

- Present this as upcoming: decided on 4 November 2026, reaching the Minima Bay app and website in their next update.
  If someone has seen a "DAO" page in Minima Bay, it is the old page being replaced.
- There is no Minima Bay DAO and no governance token. Do not describe a vote, members or a treasury as existing.
- Say that the Stables Council will govern these items and that who votes is still to be decided.
- Link: https://stablescouncil.org
