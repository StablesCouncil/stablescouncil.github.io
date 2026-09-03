# Stables Website Localhost Environment

**Status:** Active
**Scope:** `1_development/stream_1_app/website/`

## Active Source

The public website and Pages-hosted MiniDapp are served from one tree:

`C:\Users\Charles\Documents\Stables\1_development\stream_1_app\website\`

This tree contains the homepage, website pages, shared assets, and `dapp/`.

## Run Local Preview

From the website folder:

```powershell
npm start
```

The equivalent command from the Stables repository root is:

```powershell
node 1_development/stream_1_app/work/tools/website/serve-local.mjs ../../website 8080
```

Use this Node preview rather than a plain static file server. It also provides the read-only
`/work/` and `/work/design/` mounts used by the founder review surfaces.

Open:

```text
http://localhost:8080/
http://localhost:8080/new/
http://localhost:8080/new/review/
http://localhost:8080/dapp/
http://localhost:8080/dapp/1-showcase/
http://localhost:8080/dapp/2-demo/
http://localhost:8080/dapp/3-test/?preview=webapp
http://localhost:8080/work/
```

## Source Boundary

Support folders, generated outputs, mirrors, archives, and publish checkouts are not authoring sources. If a change belongs on the public website, make it in `website/` first, then publish the validated `website/` tree.

## Node-Connected Checks

The Web harness connects to a local Pure Minima node through the in-app `Connect node` flow.
Use the node's RPC port, which is its main port plus 4. For example:

- Node main port `9201` uses RPC port `9205`.
- Enter `http://127.0.0.1:9205` in the Stables node connection.
- RPC must be enabled and must permit the browser origin. Do not expose RPC beyond an interface and
  network boundary you control.

Port `9003` is the HTTPS MDS hub for a node whose main port is `9001`; it is not the generic RPC
port. A MiniDapp that depends on MDS injection must be installed and opened through that node's real
MiniHub rather than through the Web harness.

Use the real MiniDapp hub for final host/runtime verification when a change depends on MDS injection, WebView permissions, package install behaviour, camera behaviour, or host origin.
