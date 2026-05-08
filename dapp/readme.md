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

Published zips go under each channel's `latest-version/` folder when shipped.

## Workflow

Serve the parent `website/` tree directly:

```powershell
node 1_development/stream_1_app/work/tools/website/serve-local.mjs ../../website 8080
```

Policy and stage details live in `0_handshake/minidapp_version.md` and `MINIDAPP_VERSIONING.md`.

