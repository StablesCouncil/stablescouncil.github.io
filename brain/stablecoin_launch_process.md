# How the first Stables stablecoin will be created

*Settled by the Council on 2026-09-08 (decision TV81-D27). This describes a **future phase**. It is not
part of the current community test, and nothing in it can be done in the app today. Several numbers are
deliberately not decided yet and are listed at the end. If someone asks when this happens, the honest
answer is that no date is set.*

## The short version

The first stablecoin is created by the Council in a single opening act, and from that moment its price
is decided by people trading it, not by anyone announcing a number. The Council's ability to do that
opening act then switches itself off permanently, in a way anyone can check on the chain.

## Why the equity comes first

Stablecoins are backed by Minima, and the cushion that absorbs Minima's ups and downs is the equity
layer, xMinima. How much stablecoin can safely exist depends on how much of that cushion exists. So the
first step is opening xMinima minting and letting people who want that role take it up.

This is not a scheduling preference. The capacity to issue stablecoins is bounded by the equity
underneath, so there is nothing to issue against until the equity is there.

## Why the shops come next

A stablecoin is only worth something if you can spend it. Stables has no price feed and no oracle, so
what makes one unit worth one dollar of goods is simply that shops accept it for one dollar of goods.
That is the anchor, and it is the reason merchant commitments come before a launch rather than after.

A commitment means a shop agrees to accept Stables as payment. That can be an annual listing in the app
or a public engagement. A listing is a directory entry: it is not an endorsement and not a guarantee.

Because the network is what creates value, the shops can be online as easily as on a high street. Where
a group of committed shops does sit in one country, that country's currency is the one that gets
created first. The shops choose the currency, not the other way round.

## The opening act

The Council deposits Minima and issues the first units against it, which creates both the first supply
and the market it trades on at the same moment. The opening rate is simply how much Minima was put in
for how many units issued.

There is no auction and no vote on the price, for a straightforward reason: **a price is not something a
vote can know.** What a vote would really be doing is copying a number from somewhere else. Instead the
Council commits its own money at that opening rate, which means the Council carries the cost if the rate
is wrong, rather than the public carrying it. Whoever sets the first price should be the one exposed to
it being wrong.

## Why this is not a back door

Letting the Council do something nobody else can do is exactly the kind of special power Stables exists
to remove, so it is bounded in four ways, and all four are enforced by the chain rather than promised:

1. It happens **once**, for a fixed amount.
2. It **switches itself off**. The same transaction that opens minting to everybody permanently closes
   the Council's own path.
3. Anyone can **read what was issued and what backs it**.
4. Afterwards it grants nothing at all. No further minting, no price setting, no veto.

Point 2 deserves a note, because the obvious approach would have been to destroy the Council's key and
say so. That was rejected: **nobody can prove a key was destroyed.** The claim looks exactly the same
whether it is true or not, and it would ask people for precisely the trust the project is built to
remove. So the key is not destroyed. Instead the contract simply has no door left for it to enter, and
anyone can confirm that by reading the code and the chain.

## How the price works without an oracle

There are two prices and it helps to keep them apart.

**Inside the system**, all that matters is how many Minima one stablecoin is worth. Both sides of that
are on the chain, so no outside information is needed. After the opening act, that rate is whatever
people actually paid each other for it. Confirmed trades are the price. Nobody declares it.

**Outside the system**, what makes a unit mean a dollar is shops accepting it for a dollar of goods.
That is not a feed either. It is a network of people who decided to take it.

Neither half needs anyone to be trusted, which is the whole point.

## After the opening

The market runs. Later, once the market is genuinely established rather than mostly the Council's own
activity, the system switches to reading its price from confirmed trades automatically. That switch is
scheduled and mechanical rather than a decision somebody makes, and it is blocked while the Council is
still providing most of the trading. The Council cannot hold it back by doing nothing, and it cannot be
rushed into a market that is not really there yet.

The Council will provide liquidity in the early period so trading is less jumpy, with the amount set
openly and renewed periodically. It is worth being precise about what that is and is not: the Council
makes it easier to trade, and it does **not** defend the price. The shops are what hold the value
steady.

## What people vote on

Not the price, and not the launch. Voting weight comes from pledging xMinima, which means committing it
and accepting a lock, so influence follows capital genuinely placed at risk rather than capital merely
held. What gets decided is the liquidity budget, which currency comes next, and the safety settings that
keep minting and burning away from a manipulated price.

There is no target backing ratio. How much cushion the system carries is the result of what equity
holders choose to do, not a number set by committee. The one rule that follows from the backing is
simple and always applies: while the backing is at or above 100 percent, redeeming pays full value, and
if it ever falls below, redeeming pays the honest share of what is actually there. It is never negative,
and nobody can redeem more than exists.

## What is not decided yet

Stated plainly, because the answer to these is currently "not yet", not a number being withheld:

- how large the first issuance will be
- how the opening rate is chosen and recorded
- how much liquidity the Council commits
- how long a pledge is locked for
- the exact thresholds for the automatic switch to market pricing
- how many committed shops count as enough to launch a currency

There is also no date. This describes how it will work, not when.
