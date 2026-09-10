# Stables - Documentation

Stables is an experimental, protocol-focused research project built on Winiwa.
The project explores minting, burning, oracle, and collateralization mechanisms
for a non-custodial, censorship-resistant monetary system.

## What changed in this version (test v0.0.11.88)

This coordinated testing update includes the changes since public version .63:

- Notes grouped by address, retaining amount, age and selection across groups.
- Four xWiniwa vault lanes and corrected coordination of concurrent mint and burn operations.
- MAX uses spendable funds; arriving amounts and privacy states are clearer.
- Retail testing groundwork binds QR payment matching to recipient, token, exact amount and invoice identity, with fresh confirmation checks. Merchant business tools remain deferred from the public test scope.
- Failed wallet proofs remain retryable, and concurrent receive-address requests share one node read.
- Standalone Android loads the app while its node starts. Payment actions still require fresh node proof.
- Clearer recovery errors, rate displays, unavailable-asset states and proof-sharing diagnostics.

This is a testing release. Faster screen loading does not establish cold-payment readiness. End-to-end card-speed checkout and isolated battery efficiency remain under measurement.

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
