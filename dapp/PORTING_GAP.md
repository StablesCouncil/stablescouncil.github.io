# MiniDapp channel porting gap (single ledger)

**Purpose:** Track, in **one file**, what has landed in the **lead** channel versus what still needs to flow **downstream** so you do not have to compare four trees by hand. When you say **apply downstream** (or name a target channel), work uses this table as the checklist.

**Canonical maturity (downstream order):** **prod → test → demo → showcase** (most stringent truth at the top; lower channels may simplify or simulate).

**Paths (dev):** **`4-prod/`** · **`3-test/`** · **`2-demo/`** · **`1-showcase/`** (plus showcase hub **`assets/`** at `dapp/` root per **`MINIDAPP_VERSIONING.md`**).

---

## Declared lead channel (you set this)

| Field | Value |
|-------|--------|
| **Lead (source of truth for new edits in this phase)** | `2-demo` *(change to `4-prod` / `3-test` when those trees are full forks, not placeholders)* |
| **Last reviewed** | *(date)* |
| **Notes** | Until **prod** and **test** are real product trees, **demo** remains the usual implementation target per **`0_handshake/minidapp_version.md`** **Routing**. This file still records **showcase** lag vs demo so synthetic line does not drift silently. |

---

## How to use it

1. **Implement** in the **lead** channel only (or in demo + port up—your call—but record the gap here).
2. **Add a row** per feature / fix / refactor (short id + one-line scope).
3. **Mark** each downstream cell: `done` · `n/a` (not applicable at that stage) · `open` (still to port).
4. When you order **apply downstream**, port in order **test → demo → showcase** (or skip stages marked `n/a`), then flip **`open` → `done`** and note the date in **Evidence** if useful (PR, commit, CHANGELOG section).

**Changelogs:** Still log user-visible work in **`dapp/CHANGELOG.md`** (showcase) and **`dapp/2-demo/CHANGELOG.md`** (demo) when you ship those channels; this file is **coordination**, not a substitute for release notes.

---

## Gap table (living)

| ID | Change (short) | Prod `4-prod` | Test `3-test` | Demo `2-demo` | Showcase `1-showcase` + hub `assets/` | Evidence / notes |
|----|----------------|----------------|----------------|---------------|--------------------------------------|------------------|
| *example* | *Wallet row copy tweak* | *n/a* | *n/a* | *done* | *open* | *port when synthetic-safe* |

*(Add rows above; delete the example row when you add real work.)*

---

## Quick reference: token truth (from handshake)

- **Prod / test:** real chain semantics where Council enables them.
- **Demo:** Minima-only product scope; demo mints are **not** Stables-team chain tokens.
- **Showcase:** synthetic / preview; port only when **synthetic-safe** (see **`minidapp_version.md`** **Routing**).

---

*Introduced for drive cleanup / process clarity. Authority for version labels and stages remains **`0_handshake/minidapp_version.md`** and **`dapp/MINIDAPP_VERSIONING.md`**. *
