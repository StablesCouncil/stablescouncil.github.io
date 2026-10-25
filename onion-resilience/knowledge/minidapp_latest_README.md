# Stables - Documentation

Stables is an experimental, protocol-focused research project built on Winiwa.
The project explores minting, burning, oracle, and collateralization mechanisms
for a non-custodial, censorship-resistant monetary system.

## What changed in this version (test v0.0.14.046)

One Android app: it uses its built-in node, or Minima Core on the same phone. The MiniDapp is retired; a desktop app is coming. The changelog lists each step since v0.0.14.017.

- Pay with the Stables card by scanning a code: the payment goes to the other phone over the Minima network, without Bluetooth, and is confirmed back within about a minute.
- A payment by code and its settle-up messages are encrypted for the receiver; the screens say plainly what stays visible on the network.
- A tap that breaks is finished by itself over the network 20 seconds later; a payment that never arrived is refunded.
- The screen lock while paying: Get paid locks at the first touch, a tap on the panel locks earlier, the slider always opens it; turning the phone no longer restarts a payment.
- Every coin is always counted in the Wallet total, also while the card reads or money is on its way to Savings.
- Card money survives a resync of the node: the phone keeps a copy of each deposit proof and gives it back to the node after a resync (proven on Minima Core 1.7.2).
- Resyncing Minima Core is guided step by step, one button per step; Stables does every step it can by itself.
- The Stables card is an experiment awaiting an independent security review, and the app says so.

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
