# How the first Stables stablecoin will be created

*Decided by the founder for the Council on 2026-11-14 (decisions D27-s to D27-y, which replace the earlier
design of 2026-09-08). This describes a **future phase**. It is not part of the current community test, and
nothing in it can be done in the app today. It will first be rehearsed with test tokens that have no value
(USDw for the stablecoin, xWiniwa for the equity). Several numbers are deliberately not decided yet and are
listed at the end. If someone asks when this happens, the honest answer is that no date is set.*

## The short version

The first stablecoin is created by a **public subscription**. Anyone can take part, in Minima, for the
stablecoin, for the equity (xMinima), or both. Everything subscribed goes into the reserve that backs the
stablecoin. The subscribers themselves set the opening rate, inside a range the Council approved in advance.
Settling the subscription is the moment the stablecoin is born, and anyone can do it. No key controls the
vault, ever.

## Why the shops come first

A stablecoin is worth something because you can spend it. What makes one unit worth one dollar of goods is
that shops accept it for one dollar of goods. That is the anchor, and it is why merchant commitments come
before a launch.

A commitment means a shop agrees to accept Stables as payment. That can be an annual listing in the app or a
public engagement. A listing is a directory entry: it is not an endorsement and not a guarantee. Where a group
of committed shops sits in one country, that country's currency is the one created first.

## The subscription

- **Two sides.** People who want the stablecoin subscribe on one side. People who want to carry the equity,
  xMinima, subscribe on the other. A person can do both.
- **Each side states a limit.** Someone subscribing for the stablecoin says the highest rate, in Minima per
  unit, they accept. Someone subscribing for xMinima says the lowest rate at which they are willing to carry
  the risk. xMinima is issued at one Minima per unit at this point.
- **One rate for everyone.** When the subscription closes, one opening rate is found: the rate at which the
  stablecoin people asked for is fully covered by the equity people offered, with the cushion the launch sheet
  requires. Everyone receives that same rate. Anyone whose limit was not met gets all their Minima back.
- **Everything goes to the reserve.** The Minima from the stablecoin side backs the stablecoin. The Minima
  from the equity side is the cushion that absorbs Minima's ups and downs. Nothing is kept aside.

The people who set the opening rate are the people who hold the result, which is the fairest way to find it.
Nobody announces a price.

## The range and the safety stops

Before a subscription opens, the Council approves its launch sheet by vote. The sheet sets a range the
opening rate must fall in. The range is centred on the price of Minima over the previous week, and its width
follows how much that price moved during that week.

That price comes from a published reference: the combined price of Minima across the trading venues, taken as
snapshots that are put on the chain so anyone can check them. The reference has one job: to fence a launch and
to stop it if conditions are not right. After the launch, the stablecoin's price never comes from it.

The subscription stops and refunds everyone, in full, if:

- too little is subscribed on either side;
- the opening rate lands on the edge of the range, which means the market moved beyond it;
- the reference price moves past a set limit while the subscription is open.

If nobody settles the subscription in time, each person can take their own refund without anyone's help.

## After the opening

The stablecoin trades on Minima Bay's venues: mostly on The Rapids, the fast venue, and on The Pool, which is
fully on the chain. Market makers and traders keep the two in line with each other. From then on, the
stablecoin's price inside the system is read only from confirmed trades on The Pool, which every node can
check for itself.

Anyone can return the stablecoin to the vault at any time and receive Minima for it. Once trading is
established, measured by checks the chain makes on its own (enough trades, enough different traders, over
enough time), creating new stablecoin opens to everyone, automatically. Nobody can open it early and nobody
can hold it back.

## How the price works without an oracle

There are two prices, and it helps to keep them apart.

**Inside the system**, all that matters is how many Minima one stablecoin is worth. Both sides of that are on
the chain, so it is read from confirmed trades. Nobody declares it.

**Outside the system**, what makes a unit mean a dollar is shops accepting it for a dollar of goods. That is a
network of people who decided to take it.

## Using the vault

- **Paying someone costs nothing.** A payment between people never touches the vault.
- **Creating or returning stablecoin at the vault** pays a small published margin. It stays in the reserve as
  part of the equity, which carries the price risk. Its size is fenced by the vault's own rules.
- **Returning stablecoin** pays its value, less that margin, while the backing is at or above 100 percent. If
  the backing were ever below 100 percent, returning pays the exact share of what is there, with no margin. It
  is never negative, and nobody can take more than exists.
- **Returning stablecoin always works**, even when the price has not been updated for a while. Joining or
  leaving the equity waits until the price is current, so that nobody can use an old price at the expense of
  stablecoin holders.

## One equity token

There is one equity token for all Stables stablecoins: xMinima (xWiniwa in the test). It carries the risk for
every stablecoin on the one balance sheet and earns the margin.

## What the Council decides

Not the price. The Council approves each launch sheet (the range, the minimums, the safety stops and the
dates), which tokens and venues are official, and the safety settings that keep minting and returning away
from a manipulated price. Voting weight comes from pledging xMinima, which means committing it and accepting a
lock, so influence follows capital placed at risk.

The Council holds no key to the vault and no money of its own in the launch. Trading on the venues is done by
independent market makers.

## What is not decided yet

Stated plainly, because the answer to these is currently "not yet", not a number being withheld:

- how the range is computed exactly (the window, the centre, the width)
- the minimums and the limits of each safety stop
- how large the equity cushion must be
- the size of the vault margin
- who publishes the reference snapshots, and how many publishers there are
- the thresholds for opening stablecoin creation to everyone
- how long a pledge is locked for
- how many committed shops count as enough to launch a currency

There is also no date. This describes how it will work, not when.
