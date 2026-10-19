# Stables - Documentation

Stables is an experimental, protocol-focused research project built on Winiwa.
The project explores minting, burning, oracle, and collateralization mechanisms
for a non-custodial, censorship-resistant monetary system.

## What changed in this version (test v0.0.14.017)

This test release is everything finished in the channel since v0.0.14.002. The changelog lists each step.

- The Stables card uses the R2T5 vault: a withdrawal to Savings reaches it about 2 hours after the test Council approves it, the window in which independent guardians can freeze a wrong approval.
- Stables links to official Minima Core 1.7.2 (`org.minima.core`) or the older Minima Core app, with a choice in Settings and updates, Your node.
- Card Adds appear in the transaction list at once, wait their turn and retry; a failure stays listed with its reason.
- A card payment above the receiving phone's limit can be accepted with a fingerprint or the payment code.
- A built-in node that fell far behind updates and restarts by itself, with one progress line.

## Status

Stables is in an early public testing phase. Test assets may have no market value, unfinished
features remain clearly unavailable, and this build must not be treated as production banking
software.

All materials published here are non-binding and informational only.

## Purpose of this repository

This repository serves as a public documentation reference for Stables.

It is intended to:
- provide transparency on the project's direction and methodology,
- preserve a Stables reference for published materials,
- support future review and discussion.

This repository is **not** a product release, launch announcement,
or investment offering.

## Documents

Public-facing, non-binding documents will be published progressively
under the `docs/public/` directory.

## Important notice

Nothing in this repository constitutes:
- a guarantee,
- a promise of outcome,
- an offer of investment,
- or a commitment to deploy or continue the project.
