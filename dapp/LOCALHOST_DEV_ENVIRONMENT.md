# Stables MiniDapp Localhost Environment

**Status:** Active local workflow
**Scope:** `1_development/stream_1_app/website/dapp/`

## Default Preview

Serve the full website tree from the Stables repo root:

```powershell
node 1_development/stream_1_app/work/tools/website/serve-local.mjs ../../website 8080
```

Open:

```text
http://localhost:8080/dapp/
http://localhost:8080/dapp/1-showcase/
http://localhost:8080/dapp/2-demo/
```

This is the normal browser loop for MiniDapp UI, copy, routing, and public Pages checks.

## Local Feedback API

For local feedback testing, run the feedback server separately:

```powershell
Set-Location "C:\Users\Charles\Documents\Stables\1_development\stream_2_community\task_x_public_feedback_ledger"
node tools/feedback_submit_server.mjs
```

Expected API:

```text
http://127.0.0.1:8788/api/feedback
```

## Node-Connected Localhost

Use the in-app Connect node flow:

- Host: `127.0.0.1`
- Port: `9003`

If the node rejects calls because `publicmds` is off, open Stables from the real MiniDapp hub, copy the `uid=` value, and paste it into the Hub session uid field in the Connect node modal on localhost.

## Final Verification

Localhost is strong for iteration, but final release checks must still use the real MiniDapp hub when host runtime behaviour matters.

