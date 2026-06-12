# Stables - Documentation

Stables is an experimental, protocol-focused research project built on Winiwa.
The project explores minting, burning, oracle, and collateralization mechanisms
for a non-custodial, censorship-resistant monetary system.

## What changed in this version (demo v0.0.0.2.17)

Connect Stables to your own Pure Minima node, right in your browser. Highlights:

- **Connect to your own Pure Minima node over RPC.** Run a Minima node yourself and link the web app straight to it, no MinimaOS install needed. Your keys never leave your node. Enable RPC on your node (`rpc enable:true`, no password), enter its RPC address, and connect with a blank password. Works against a clean Pure Minima core node or a full node, and both reads and sends go over RPC.
- **Auto-reconnect after a refresh.** Once connected, the app restores the connection to your node on the next page load, no need to re-enter the address.
- **Receive: choose and verify your address.** One editable receiving-address field. The app checks with your node that the address belongs to your wallet before showing the QR, so you never share an address that is not yours.
- **Real MINIMA precision.** Balances and amounts no longer round small MINIMA down to 0.00. Native MINIMA shows up to six decimals with trailing zeros trimmed (for example 0.000611); stablecoins stay at two.
- **Simplified Connect panel.** One clear path, with the step-by-step detail in the contextual StablesAgent help (tap the agent icon). The MinimaOS-install step moved out of the connect window; the download stays on the website.

Full detail in `CHANGELOG.md`.

> This is an early testing release. There may be bugs and unexpected behavior. Only connect a wallet holding funds you are willing to lose. The code is open for review at github.com/StablesCouncil/stablescouncil.github.io; if in doubt, seek a third party opinion. Using the app at this stage is a testing contribution to the community, and we appreciate it.

## Status

Stables is currently in early research and closed development.
There is no public product, no live deployment, and no real-value usage.

All materials published here are non-binding and informational only.

## Purpose of this repository

This repository serves as a public documentation reference for Stables.

It is intended to:
- provide transparency on the project’s direction and methodology,
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

All protocol behavior, if and when implemented, is enforced by code
and subject to technical, security, and operational constraints.




