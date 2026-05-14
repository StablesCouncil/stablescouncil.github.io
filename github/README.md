# Minima holdings query - community address submissions

This folder documents how **address labels** and **operator notes** on the [Minima Onchain Watch](https://stablescouncil.org/onchain-watch.html) page relate to **GitHub**.

- The on-page **Save address** modal can save an address locally on the user's device.
- The **Share with community** flow opens a prefilled GitHub submission.
- Community submissions become visible on the live website only after a Council maintainer reviews the issue and comments `/accept`.
- The `/accept` workflow publishes the entry to `github/community-addresses.json` and closes the submission.
- Use your **normal GitHub identity** for attribution. Do not put secrets, keys, or session tokens in submissions.

## Public list

The live Onchain Watch page reads:

`/github/community-addresses.json`

Each entry must use this shape:

```json
{
  "label": "Example label",
  "address": "0x...",
  "contributor": "github-username",
  "notes": "Public operator context. No secrets.",
  "added": "YYYY-MM-DD"
}
```

## Control model

- Users may propose additions through the Onchain Watch GitHub submission flow.
- Users may not push directly to `main`.
- Council maintainers review submissions and comment `/accept` when an entry should be added to the public JSON list.
- Council maintainers are the only party that should correct or remove published addresses.
- If an address is wrong, stale, spammy, or sensitive, Council can edit or remove it from `community-addresses.json` and commit the correction.

**Query string (holdings API):** `address`, optional `date_from` / `date_to` (YYYY-MM-DD, omitted when range is **All**), and `interval_type` one of `DAY`, `WEEK`, `MONTH`, `QUARTER`, `YEAR`.

**Repo:** [stablescouncil.github.io](https://github.com/StablesCouncil/stablescouncil.github.io), path `onchain-watch.html`.
