# Latest MiniDapp package

This folder contains the current Stables MiniDapp release for node installs (filename matches the declared version and stage, e.g. `Stables_v00.00.02.mds.zip` or `Stables_v00.00.00.02_showcase.mds.zip`).

**How version numbers and stages work (showcase / demo / test / prod):** see **[MINIDAPP_VERSIONING.md](../MINIDAPP_VERSIONING.md)** in this repo.

## Version policy

- `dapp/latest-version/` always contains the newest published build.
- `dapp/previous-versions/` stores all historical builds and is never pruned.
- When a new version is published, move the outgoing `latest-version` package into `previous-versions` and then publish the new `latest-version`.

Current published build: **v00.00.02** (full stage label **v00.00.00.02**, showcase) — `Stables_v00.00.02.mds.zip` in this folder.

Direct download (raw):  
`https://github.com/StablesCouncil/stablescouncil.github.io/raw/main/dapp/latest-version/Stables_v00.00.02.mds.zip`

Release history (easy view, with author):  
`https://github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/latest-version/VERSION_HISTORY.md`
