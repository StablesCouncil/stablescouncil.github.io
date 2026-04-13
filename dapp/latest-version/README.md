# Latest MiniDapp package

This folder contains the current Stables MiniDapp release for node installs. **Current file:** **`Stables_v00.00.00.00.03.mds.zip`** (showcase, full label **`v00.00.00.00.03`**; short **`v00.00.03`**).

**How version numbers and stages work (showcase / demo / test / prod):** see **[MINIDAPP_VERSIONING.md](../MINIDAPP_VERSIONING.md)** in this repo.

**Zip layout (hub = Pages):** The installable archive matches **`dapp/`** on the site: **`dapp.conf`** with **`web`** = **`showcase/index.html`**, folder **`showcase/`** (main HTML), sibling **`assets/`**, and root images (**`agent.png`**, **`stables_icon.png`**, …). See **`../MINIDAPP_VERSIONING.md`** (section *Zip contents*) and **`../../../prod_stables_app_v00.00.00.00.03/build/README.md`** (from this folder: up to `stream_1_app/`, then into the showcase prod tree).

## Version policy

- `dapp/latest-version/` always contains the newest published build.
- `dapp/previous-versions/` stores all historical builds and is never pruned.
- When a new version is published, move the outgoing `latest-version` package into `previous-versions` and then publish the new `latest-version`.

Direct download (raw):  
`https://github.com/StablesCouncil/stablescouncil.github.io/raw/main/dapp/latest-version/Stables_v00.00.00.00.03.mds.zip`

Release history (easy view, with author):  
`https://github.com/StablesCouncil/stablescouncil.github.io/blob/main/dapp/latest-version/VERSION_HISTORY.md`
