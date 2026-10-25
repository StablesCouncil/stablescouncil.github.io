# The Stables card: paying phone to phone by touch

Source of truth: the public evidence repository https://github.com/StablesCouncil/stables-card-evidence (also https://stablescouncil.org/stables-card-evidence/). Written 2026-10-21 from that README. Status: **an experiment on Minima mainnet with valueless test tokens (Winiwa, xWiniwa). It needs a thorough security review by independent experts before any production use. It has not been audited.**

## What it is

The Stables card is the offline part of the Stables Android app. A person adds money to the card from their on-chain Savings (an Add), pays another phone by holding the two phones together (NFC), with no network and nothing written on chain at the moment of payment, and takes money back to Savings on chain (a Remove). Only the Add and the Remove touch the chain.

## How a payment is safe without a network

- Money on the card is a set of coins. Each coin is owned by a key made inside the phone's secure hardware (the TEE, the trusted execution environment of the phone's processor).
- Each key can sign exactly once: the hardware enforces a usage limit of 1 and the key is gone after its signature. So the same coin cannot be signed away twice.
- To pay, the phone signs a hand-over (a hop) that gives the coin to a fresh one-use key made by the receiving phone.
- Before accepting, the receiving phone checks the coin's whole history: every signature, and a certificate chain proving every key was made inside genuine secure hardware (Android key attestation, rooted in Google's attestation roots), back to a real deposit it reads on chain.
- A coin can be paid onward again and again, phone to phone, before it ever goes back on chain. Seen on chain on 2026-10-12: a coin passed through 6 hand-overs between two phones before its exit, and its exit carried all 6 signatures and 10 key certificates.
- The paying phone checks the other phone is still there before each signature, so a touch that ends early leaves nothing signed and nothing owed. If a touch breaks after signing, the phones settle it over the Minima network: the receiver either has it (Sent) or refuses it for good and the payer is refunded to Savings.

## Paying by code, at a distance (from v0.0.14.046)

- Instead of holding the phones together, the payer can scan the other phone's Get paid code (a QR code) and press Confirm send. The card signs the payment exactly as for a tap, and the signed payment travels to the other phone over the Minima network inside a tiny one-atom transaction to the receiver's Savings address. No Bluetooth, no server, no relay.
- The receiving phone reads it as soon as it is on the network (it does not wait for a block), checks it like a tap, credits it, and sends a signed confirmation back to the payer the same way. Usually confirmed within about a minute.
- Privacy: the payment and the messages that settle it are encrypted so that only the receiving phone can read them. Still visible to anyone on the network: that a transaction went between the two phones' Savings addresses. The app says this under Confirm send and on Get paid. Paying by tap keeps everything between the two phones; a future option is to carry payments by code over Maxima instead.
- A tap that breaks before the payment was handed over is sent the same way by itself 20 seconds later; a payment is never credited twice.

## How fraud is stopped

- Sign the same coin twice: the chip allows one signature per key.
- Create money from nothing: every history starts at a real deposit into the vault, read on chain; amounts add up at every hand-over.
- Use a copied or software key: the certificate chain to Google's hardware root is checked by every receiver and at exit.
- Pay one coin to two people (only possible with a broken chip): two hand-overs signed by one key are a proof that names the device; the second exit of the coin is refused.

## Taking money back to Savings (the vault, generation R2T5, since 2026-10-17)

- A Remove posts a request on chain carrying the coin's whole history. A test Council (7 of 11 keys) checks it and approves it in a sealed list.
- An approved payout waits about 2 hours (144 blocks). During that time independent guardians can stop a wrong approval.
- Nine guardians: any one can stop a request (delay only); three freeze all payouts; the Council cannot lift a freeze, five guardians can; six can install a new Council after a long Council silence or freeze. A dishonest guardian can delay, never pay.
- The chain remembers every paid card coin (an exit record), so a coin paid once can never be paid again, by the Council or by the fallback.
- Daily caps written into the contracts bound what can be paid in a day.
- If the Council disappears, money freezes; it never flows out. A request can pay without the Council only after 3 days and only while the Council is alive.
- No contract has a lab key.

## What is not proven yet (say this plainly)

- The Council and the guardians are test keys held by the founding team; dispersing them to independent people is the next step.
- Test tokens only; amounts are small on purpose.
- Payments by tap are off chain; a payment by code travels encrypted inside a one-atom transaction. Card coins reach the chain when they leave the card.
- Trust roots: a broken phone chip would break the one-use guarantee; double spends stay detectable, not preventable.
- Not audited by an external security firm.

## Recent changes in the app

- 0.0.14.046 (released 2026-10-25): pay by scanning a code, over the Minima network and encrypted for the receiver; a broken tap is finished by itself; a payment that never arrived is refunded; the screen lock while paying always opens with its slider; every coin is always counted in the Wallet total; card money survives a resync of the node (the phone keeps a copy of each deposit proof and gives it back); Remove takes everything off the card in as many parts as needed.

Download the Android app: https://stablescouncil.org/#download
