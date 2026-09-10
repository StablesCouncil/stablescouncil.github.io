# Stables MiniDapp, Payment protection

*For StablesAgent: Quick pay, Standard pay, Protected pay, payment code, biometrics, and contact tiers. Carried into the test channel from the demo line. The tiers and the payment code work the same way; the assets a tester can send are Winiwa and xWiniwa only.*

## What it is

Payment protection adds three send speeds on top of normal wallet security.

| Tier | When it applies | What the user sees |
|------|-----------------|-------------------|
| **Quick pay** | QR scan includes address and amount, total under quick-pay limit | Send can complete immediately (optional 2-second undo in Settings, Security) |
| **Standard pay** | Default for manual sends within normal limits | Review, then **Confirm send** |
| **Protected pay** | Significant amount, multi-recipient send, or contact set to Protected pay | 4-digit **payment code** required before send |

## Where to configure

**Settings → Security → Payment protection**

- Quick pay limit
- Significant amount threshold
- Daily quick-pay cap
- **Set payment code** (always visible on the card; inline setup on first use)

Limits use the **wallet primary currency** (starred currency on Wallet, for example Minima).

## Contact payment tier

On each contact detail card: **Inherit**, **Quick pay**, **Standard pay**, or **Protected pay**. Favourite send chips show tier hints.

## Payment code storage

The payment code is hashed on device only. It is not sent to Stables servers. Council cannot recover it. If the user forgets it, they set a new code in Settings, Security.

## Android biometrics (standalone app only)

On the Stables phone app, when the phone has fingerprint or face unlock set up, a protected send can be confirmed with fingerprint or face instead of typing the code. Payment code always works too. Web and MinimaOS hub use the payment code only.

Where it is (from v0.0.11.53): More, Security, Payment protection, in the block **How you confirm a protected send**. Two rows, always on screen: **Payment code** (Set, then Change) and **Fingerprint or face** (a checkbox). Set a payment code first; until then the Fingerprint or face row is greyed out and its own line says so ("Set a payment code first"). On a phone with no fingerprint or face enrolled it says "Not set up on this phone"; on web and the MinimaOS hub it says "Not available on this device". It saves as soon as you toggle it. On a protected send the phone's fingerprint or face sheet opens first, even if the phone is already unlocked; tap "Use payment code" there, or "Use fingerprint or face" on the code screen, to switch. Fingerprint or face data never leaves the phone.

## StablesAgent help

The ⓢ icon on the Payment protection section opens contextual FAQ (payment code, storage, biometrics, Minima primary limits). After a contextual answer, **Back to main menu** returns to the main agent paths.

## Multi-recipient and protected pay

Any send to more than one recipient requires Protected pay (payment code or biometric on Android).