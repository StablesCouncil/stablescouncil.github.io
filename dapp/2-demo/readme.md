# Stables - Documentation

Stables is an experimental, protocol-focused research project built on Winiwa.
The project explores minting, burning, oracle, and collateralization mechanisms
for a non-custodial, censorship-resistant monetary system.

## What changed in this version (demo v0.0.0.3.44)

Payment protection and polish since v0.0.0.3.42. Highlights:

- **Payment protection tiers.** Quick pay for small QR sends under your limit (optional 2-second undo). Standard pay still uses Confirm send. Protected pay requires a 4-digit payment code for significant amounts, multi-recipient sends, and protected contacts.
- **Contact payment tier.** Set each contact to Inherit, Quick pay, Standard pay, or Protected pay. Favourite send chips show tier hints.
- **Settings → Security → Payment protection.** Configure limits and your payment code in your wallet primary currency. Set payment code is always visible on the card.
- **Android biometric unlock.** On the standalone app, protected sends can use device biometrics when available.
- **Auto-save.** Payment protection, contact notes, transaction notes, council profile, welcome currencies, and address privacy save on change without explicit Save buttons.
- **Quieter split payment on Send.** Multi-recipient send is a muted optional link, not a prominent button.
- **StablesAgent FAQ.** Contextual payment protection help includes a path back to the main agent menu.

Full detail in `CHANGELOG.md`.

> This is an early testing release. There may be bugs and unexpected behavior. Only connect a wallet holding funds you are willing to lose. The code is open for review at github.com/StablesCouncil/stablescouncil.github.io; if in doubt, seek a third party opinion. Using the app at this stage is a testing contribution to the community, and we appreciate it.

## Status

Stables is currently in early research and closed development.
There is no public product, no live deployment, and no real-value usage.

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