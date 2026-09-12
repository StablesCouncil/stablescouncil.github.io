# Stables - Documentation

Stables is an experimental, protocol-focused research project built on Winiwa.
The project explores minting, burning, oracle, and collateralization mechanisms
for a non-custodial, censorship-resistant monetary system.

## What changed in this version (test v0.0.11.94)

This coordinated testing update includes the changes since public version .88:

- Your maintenance balance stays readable when the same wallet's key-use counters change, so Settings shows the confirmed figure instead of reporting it unavailable.
- An interrupted maintenance publication restarts safely, keeping its receipts and its retirement history, and never discarding an uncertain transaction.
- Unsigned maintenance refills recover after a verified competing spend, with attempt evidence preserved and retries bounded. An unknown outcome never authorizes a new claim.
- Settings shows the confirmed available SAND with plain free-refill wording. Payment balances remain separate.
- Update checks read the coordinated public release and report a retryable failure instead of reusing standalone installer metadata.
- Resync entry and confirmation use one standard control, with acknowledgement unchanged.
- Centered groups keep their actions centered with readable labels, and StablesAgent fits the visible screen and its safe area.

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
