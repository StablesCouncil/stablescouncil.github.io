# Stables Website Localhost Environment

**Status:** Active
**Scope:** `1_development/stream_1_app/website/`

## Active Source

The public website and Pages-hosted MiniDapp are served from one tree:

`C:\Users\Charles\Documents\Stables\1_development\stream_1_app\website\`

This tree contains the homepage, website pages, shared assets, and `dapp/`.

## Run Local Preview

From the Stables repo root:

```powershell
node 1_development/stream_1_app/work/tools/website/serve-local.mjs ../../website 8080
```

Open:

```text
http://localhost:8080/
http://localhost:8080/dapp/
http://localhost:8080/dapp/1-showcase/
http://localhost:8080/dapp/2-demo/
```

## Source Boundary

Support folders, generated outputs, mirrors, archives, and publish checkouts are not authoring sources. If a change belongs on the public website, make it in `website/` first, then publish the validated `website/` tree.

## Node-Connected Checks

The demo can still be tested against a local node through the in-app Connect node flow:

- Host: `127.0.0.1`
- Port: `9003`

Use the real MiniDapp hub for final host/runtime verification when a change depends on MDS injection, WebView permissions, package install behaviour, camera behaviour, or host origin.

