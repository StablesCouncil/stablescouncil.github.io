# Stables circular economy (diagram knowledge for StablesAgent)

## Authority and scope

This document describes the **public concept map** at **https://stablescouncil.org/circulareconomy/**. It is **not** a literal balance sheet and **not** a substitute for locked protocol math.

It is also **not a description of working software**. Every role and flow on the map is designed;
almost none of it is deployed. A user today cannot mint a stablecoin, deposit into a Coverage Fund,
trade, or take part in the merchant or Ambassador economy. The first community test covers only a
valueless Winiwa faucet, xWiniwa mint and burn at par, and send and receive. See
**`release_scope_boundary.md`** before telling anyone what they can do.

For **exact mechanics** (transaction fee formula, Coverage Ratio visibility, cf token behaviour, open mint/burn rules, and the rule that **xMinima receives no transaction-fee revenue**), StablesAgent must follow **`0_handshake/protocol_mechanics_spec.md`** and **`stables_master_reference.md`** §14. If any diagram-friendly phrase here could be read as contradicting those specs, **the specs win**.

**Related public page (different map):** https://stablescouncil.org/bankingsystem/

**Terminology bridge:** Older public brain copy (for example **banking_system_overview.md**) refers to a **Liquidity Fund** on the Minima/xMinima liquidity axis. The circular economy page labels that axis **Arbitrage Fund** in Council vocabulary for this map. If a user asks, clarify: on **circulareconomy** use **Arbitrage Fund**; if they say **liquidity fund**, explain that wording differs across materials unless governance defines them as the same.

### Fund vocabulary (all valid concepts)

**Coverage Fund**, **Arbitrage Fund**, and **Liquidity Fund** are all legitimate elements in Stables materials. They answer different questions:

- **Coverage Fund:** In locked mechanics, the buffer tied to **cf** instruments, **transaction fee routing** to cf holders, stress paths between stable and xMinima exposure, and **Coverage Ratio** context. See **`protocol_mechanics_spec.md`** for exact formulas and rules.
- **Arbitrage Fund:** On **circulareconomy**, the named box on the **Minima x xMinima** axis and the opportunistic, profit-seeking behaviour the page describes for that part of the map (not a peg guarantor).
- **Liquidity Fund:** Wording still used in materials such as **banking_system_overview** for **deep Minima x xMinima liquidity** and orderly equity-side entry and exit, often described alongside **Council Treasury** support for market depth.

StablesAgent should treat these as **compatible layers of description** (map labels, banking overview, locked ledger math). If a user collapses them into one box, explain the distinction and point to the right page or spec. **Do not** treat any of the three as invalid.

---

## What this is

The Stables circular economy page is a **concept map**. It shows how external capital, on-chain economic activity, protocol treasuries, Stables (debt), xMinima (equity), merchant tooling, and two protocol funds relate in one picture.

**Subtitle on the page:** How capital, Minima, Stables, xMinima, and protocol funds interact.

---

## How to read the arrows (legend)

- **Bidirectional cyan arrows:** In this diagram, reserved for flows that represent **minting and burning mechanism relationships** (two-way coupling between the named boxes), not optional two-way trade in general.
- **Bidirectional white (non-cyan) arrows:** Two-way links that are **not** labelled as mint/burn in the legend (for example treasury and market links, or operational two-way ties).
- **One-way white arrows:** Directed flows such as spend/listing direction, fee routing, treasury allocation, or structure work feeding the economy.
- **TF\*** on the diagram means **transaction fees** (also repeated in the page footnote: **TF: transaction fees**).

---

## Nodes (exact labels as on the page)

### External capital

- **Subtitle:** From CEX/DEX (bridges)
- **Meaning:** Capital and liquidity that can enter or leave via centralised or decentralised exchanges and bridge routes (off-chain / broader market interface).

### Economic Activity

- **Subtitle:** Goods and services
- **Meaning:** Real commerce and usage where Stables-related instruments matter as part of the economy (not a specific product screen).

### Community Treasury (Asset)

- **Subtitle:** Minima
- **Meaning:** Community-side treasury positioned in the diagram as an asset centre (the page explicitly tags it **(Asset)** in the title). It is the bridge in the picture between external capital and the Stables / xMinima layer.

### Merchants listing + Promo

- **Subtitle:** Minima
- **Meaning:** Merchant-facing listing and promotion paid or denominated in Minima in this schematic (discovery and marketing rail).

### Stables (Debt)

- **Subtitle:** USDs, EURs, JPYs, +
- **Meaning:** Stablecoin-style debt instruments in the protocol narrative (tickers shown as examples; **+** means other fiat pegs in the same family).

### xMinima (Equity)

- **Subtitle:** Minima price risk takers
- **Meaning:** Leveraged equity / risk-bearing side of the structure relative to Stables as debt: participants taking Minima price (and related) risk in return for equity-like exposure in this framing.

### Council Treasury

- **Subtitle:** Minima
- **Meaning:** Council-operated treasury in Minima for governance-directed uses in this diagram (distinct from **Community Treasury (Asset)**).

### Means of Exchange

- **Subtitle:** Accepted by Merchants
- **Meaning:** What merchants actually accept at checkout in the story of the map (the cash register side of Stables usage).

### TF\*

- **Standalone label** (no subtitle on the box).
- **Footnote:** TF = transaction fees.

### Coverage Fund

*Designed, NOT deployed. Nobody can deposit into a Coverage Fund today, and it is not a yield product a user can buy.*

- **Subtitles:** Stables <-> xMinima and USDscf, EURscf, JPYscf, +
- **Meaning:** Fund whose role in the diagram is tied to the Stables / xMinima axis and coverage instruments (tickers shown as examples; **+** = other variants).

### Arbitrage Fund

- **Subtitle:** Minima <-> xMinima
- **Meaning:** Fund positioned on the Minima / xMinima axis for arbitrage-style activity. **Terminology note for the agent:** In Council copy on this page, this is **Arbitrage Fund**; do not conflate with a separate **liquidity fund** label if the user distinguishes them.

### Structure Dev

- **Subtitle:** Audit, partners, etc
- **Meaning:** Structural development spend: audits, partnerships, and similar infrastructure and credibility work.

---

## Connections (directionality as drawn)

### Top band (markets and activity)

- **External capital <-> Economic Activity** (white, both ways): Outside capital and on-chain economic activity are mutually connected in the broad loop.

### Treasury and protocol core

- **Community Treasury (Asset) <-> External capital** (white, both ways): Community treasury and external capital can move in both directions in this schematic (funding and recycling of exposure).
- **Community Treasury (Asset) <-> Stables (Debt)** (cyan, both ways): Treated in the legend as part of **mint/burn mechanism coupling**.
- **Community Treasury (Asset) <-> xMinima (Equity)** (cyan, both ways): Same **mint/burn** family of coupling in the diagram’s legend.

### Merchants and Council funding

- **Economic Activity -> Merchants listing + Promo** (white, one way): Activity feeds listings/promo demand (the diagram does not show return flow from merchants listing back to Economic Activity).
- **Merchants listing + Promo -> Council Treasury** (white, one way): Listing/promo flows into the Council Treasury side in this map.

### Stables rail and merchant acceptance

- **Stables (Debt) -> Means of Exchange** (white, one way): Stables as debt instruments map into what functions as means of exchange in commerce.
- **Stables (Debt) <-> Coverage Fund** (cyan, both ways): **Mint/burn / mechanism coupling** in the legend.
- **Means of Exchange -> TF\* -> Coverage Fund** (white, one way through TF\*): Transaction fees are shown as a directed hop from means of exchange toward Coverage Fund (single logical path on the diagram).

### xMinima rail and funds

- **xMinima (Equity) <-> Coverage Fund** (cyan, both ways): **Mint/burn / mechanism coupling** in the legend.
- **xMinima (Equity) <-> Arbitrage Fund** (cyan, both ways): **Mint/burn / mechanism coupling** in the legend.

### Council treasury allocations

- **Council Treasury -> Arbitrage Fund** (white, one way).
- **Council Treasury -> Structure Dev** (white, one way).

### Funds and structure

- **Arbitrage Fund <-> Structure Dev** (white, both ways): Bidirectional, but **not** cyan on the page: the diagram treats this as a two-way operational / funding relationship, **not** as one of the cyan mint/burn mechanism pairs.

### Closing the loop

- **Structure Dev -> Economic Activity** (white, one way): Development and partnerships feed back into economic activity (better tooling, trust, integrations).

### Large outer curve

- **Large outer curve** (white, with arrowhead along the path): A visual circularity spine linking the lower / outer part of the map back toward the upper Economic Activity region. Treat it as **narrative closure** of the loop, **not** a substitute for precise accounting.

---

## Explanatory prose on the page (substance to echo)

The page text makes three main claims the agent should be able to restate faithfully:

1. **Coverage Fund** and **Arbitrage Fund** each pursue a **self-interested objective**: maximise profit within their own risk capacity. Together, that behaviour tends to push the system toward **equilibrium** and **peg maintenance**, without claiming either fund is a peg **guarantor**.

2. The peg is **not guaranteed** by the Coverage Fund or the arbitrage function. Those actors are **opportunistic**: they exploit market opportunities during a depeg, similar in spirit to how external capital behaves.

3. The strength of the structure is a **level playing field** where different actors can pursue their own financial goals, while the design should make their interaction support peg maintenance, described on the page as a **priority ordering** idea: **Community Treasury > Debt > leveraged equity > 0** (as written on the page; interpret as **informal structural intuition**, not a formal proof).

For that to work in practice, the page lists **design requirements**: full transparency; tools for each actor to manage exposures and assess risk; visibility of the global positioning of the structure and its risks; and **low friction execution**: no unnecessary barriers and **no or minimal fees** (framing on the page; locked fee math for user transactions remains in **protocol_mechanics_spec.md**).

---

## Agent behaviour notes

- Prefer **Arbitrage Fund** wording when explaining **this** map; if users say **liquidity fund**, clarify they are not the same label in Council vocabulary unless governance defines otherwise.
- **Community Treasury (Asset)** vs **Council Treasury:** two treasuries in the diagram, different roles and links.
- **Stables (Debt)** vs **xMinima (Equity):** debt vs equity framing in this illustration; xMinima subtitle is **Minima price risk takers**.
- When asked **what the cyan arrow means**, answer with the **page legend**: bidirectional cyan = **minting and burning mechanism flows** (this diagram’s convention).
- **TF\*** always expands to **transaction fees** when explaining the map.
