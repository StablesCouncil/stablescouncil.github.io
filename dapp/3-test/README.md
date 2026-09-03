# Stables - Documentation

Stables is an experimental, protocol-focused research project built on Winiwa.
The project explores minting, burning, oracle, and collateralization mechanisms
for a non-custodial, censorship-resistant monetary system.

## What changed in this version (test v0.0.11.38)

This test build ships as the standalone Android app. Highlights since the last published build:

- **Network contribution.** A setting on the Node page: Pause, Minimum, Balanced (default) or
  Maximum, deciding how much this phone helps run Minima on battery, with the charger always at full
  speed. Under it, what the phone has contributed: TxPoW today and in total, time online today, the
  device hash rate, and a daily chart.
- **The open app costs a third of the battery it did.** One owner for the wallet balance read,
  repaints only when the screen changes, jobs that stop when they are told to, and a transaction
  mirror that pays for a decision once.
- **Your notes, in your hands.** Each token on Wallet management has Manage: the exact notes, one
  row each, pick the ones to combine or split, choose how many notes to end with, and see the
  transaction size against the network limit before you send. Combines and splits appear in
  Activity.
- **Errors in plain words.** A transaction that is too large says so in kilobytes, with the limit,
  and offers Manage notes on the spot.
- **One place for every action.** An action beside text sits at the right edge of its row; a
  card's actions sit at the card's right edge; only the one primary submit is full width. A sheet
  closes with its Back, never a Cancel button. A burn confirmation is red.
- **Security page.** Payment protection and Confirmation policy are two titled sections; the
  default policy is one level, every amount at 3 blocks; a level is removed with a cross; the
  quick-pay undo notice sits above the bottom navigation.
- **Transactions tell the time.** Every step of a send or receive shows when it completed, and
  Broadcasted is its own step: the receiver sees a payment the moment it is on the network.

Full detail in `CHANGELOG.md`.

> This is an early testing release. There may be bugs and unexpected behavior. Only connect a wallet holding funds you are willing to lose. The code is open for review at github.com/StablesCouncil/stablescouncil.github.io; if in doubt, seek a third party opinion. Using the app at this stage is a testing contribution to the community, and we appreciate it.

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
