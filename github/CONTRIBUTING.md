# Community address contributions

`community-addresses.json` is the canonical list of publicly labelled Minima addresses displayed on [onchain-watch](https://stablescouncil.github.io/onchain-watch.html).

## How to contribute

1. Fork `StablesCouncil/stablescouncil.github.io`.
2. Edit `github/community-addresses.json` — add one object to the array following the schema below.
3. Open a PR with the title `[address] <your label>`.
4. The Council will verify the address on-chain, then merge.

## Schema

```json
{
  "label":       "Short name shown in the dropdown — max 40 chars",
  "address":     "0x… full Minima address (64 hex chars after 0x)",
  "contributor": "Your GitHub username",
  "notes":       "Optional: operator context, no private info",
  "added":       "YYYY-MM-DD"
}
```

## Rules

- No tokens, passwords, or private keys in any field.
- `label` must be unique in the file.
- Addresses must be verifiable on a public Minima archive node.
- The Council may edit labels for consistency before merging.
