# `dapp/` - Pages-Hosted MiniDapp

This folder is part of the active public website source:

`1_development/stream_1_app/website/dapp/`

It maps to:

`https://stablescouncil.org/dapp/`

## Layout

- `index.html` - Dapp landing / redirect entry when present
- `dapp.conf` - MiniDapp package config
- `assets/` - shared app assets
- `1-showcase/` - showcase channel
- `2-demo/` - demo channel
- `3-test/` - test channel placeholder
- `4-prod/` - prod channel placeholder
- `latest-version/` - current public demo install package only

Keep active package surfaces lean. Only the current validated `.mds.zip` belongs in `latest-version/` or `2-demo/build/`. Older zips, old alias routes, and retired package archives belong under `3_archive/stream_1_app/`.

## Workflow

Serve the parent `website/` tree directly:

```powershell
node 1_development/stream_1_app/work/tools/website/serve-local.mjs ../../website 8080
```

Policy and stage details live in `0_handshake/minidapp_version.md` and `MINIDAPP_VERSIONING.md`.
