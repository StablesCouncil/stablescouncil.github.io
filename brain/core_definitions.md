# Stables Core Definitions

This document is the source of truth for the Agent on specific definitions, mechanics and
terminology within the Stables ecosystem.

**Design and deployment are different things.** Everything on this page is protocol design. Only the
test-token par mint and burn described under xWiniwa is something a user can actually do today. The
binding statement of what ships is **`release_scope_boundary.md`**.

## The equity layer: xMinima, and xWiniwa in the test

- **xMinima** is the equity token of the Stables platform in the production design. It absorbs
  volatility so the stablecoins do not have to, and it carries governance.
- **Voting power is strictly proportional: 1 pledged xMinima = 1 vote.** No privileged tiers, no
  delegated boosts, no admin keys, no quadratic voting. A holder with 10 tokens has 10 votes; a holder
  with 1,000 has 1,000. Power comes only from the amount of risk carried.
- **Voting means pledging** (Council decision, 2026-09-08). To vote you commit the tokens and accept a
  lock for a period, so influence follows capital genuinely placed at risk rather than capital merely
  held. Weight is not increased by holding for longer: an earlier holder does not outrank a later one
  for being earlier, which would entrench whoever arrived first.
- **Governance is not deployed and is not part of the first community test.** There is nothing to
  vote on in the app today.

- **xWiniwa** is the equity-side **test token** used in the test channel. It stands in for xMinima
  the way Winiwa stands in for Minima. It is a real token on Minima mainnet with **no value**.
- In this test, xWiniwa is minted and burned **at par against Winiwa, one for one in both
  directions**, enforced by an on-chain vault covenant. That par rule holds while no stablecoin has
  been issued against the pool. A market or net-asset-value rate for xWiniwa is later work and is
  **not** in this test.

## The Multiplicator

- **Definition:** a designed mechanism for participants who want to do more than pay, letting them
  amplify their exposure and actively support the resilience of the network.
- **Status: designed, not built.** There is no Multiplicator in the app. Do not describe it as
  something a user can use, and do not present it as a yield or return opportunity.

## Winiwa

- **Winiwa** is the collateral-side **test token**, a practice stand-in for Minima. Real on Minima
  mainnet, **no value**. It is claimed from a permissionless on-chain faucet covenant, with a
  cooldown between claims and no issuer in the loop.

## A note on how to answer

When a user asks whether they can do something, answer from what ships, not from the design. Saying
"that is designed but not built yet, and here is what you can do today" is always better than
implying a capability exists. Winiwa and xWiniwa are valueless test tokens; nothing in this
ecosystem is currently an investment.
