# Stables MiniDapp - Localhost Development Environment

**Status:** Active local workflow  
**Scope:** `1_development/stream_1_app/dapp/` and `task_stablescouncil_github_io/`  
**Purpose:** Reproduce as much of the online / browser environment as possible on `localhost`, while keeping a clear boundary between browser development and real MiniDapp-hub verification.

---

## 1. Short answer

Yes, we can reproduce a **strong local development environment** on `localhost`.

This local environment can cover:

- the public website shell
- the demo app in the browser
- local feedback submission
- node-connected MINIMA send / receive through **Connect node**
- most UI / product / routing work

What it does **not** perfectly reproduce:

- the exact MiniDapp hub runtime
- native host injection behavior as if opened directly from the Minima hub
- all WebView / host permission behavior

So the correct workflow is:

1. **Build and iterate on localhost**
2. **Connect localhost to the node when needed**
3. **Do final verification inside the real MiniDapp hub**

---

## 2. Recommended local modes

There are **two** useful localhost modes.

### Mode A - Full local site shell (recommended default)

Use this when you want the app inside the same environment shape as the public site.

**Folder:**  
`C:\Users\Charles\Documents\Stables\1_development\stream_1_app\task_stablescouncil_github_io`

**Commands:**

```powershell
Set-Location "C:\Users\Charles\Documents\Stables\1_development\stream_1_app\task_stablescouncil_github_io"
npm run sync:site
npm run serve:site
```

**Open:**

```text
http://localhost:8080/dapp/2-demo/
```

Use this mode when you want:

- site-like routing
- full browser experience
- realistic public web behavior
- latest `dapp/` source mirrored into `site/dapp/`

### Mode B - Direct raw `dapp/` serving (fast app-only loop)

Use this when you want to test the app directly from the authoritative `dapp/` tree without going through the generated `site/` output.

**Folder:**  
`C:\Users\Charles\Documents\Stables\1_development\stream_1_app\task_stablescouncil_github_io`

**Command:**

```powershell
Set-Location "C:\Users\Charles\Documents\Stables\1_development\stream_1_app\task_stablescouncil_github_io"
npm run serve:dapp
```

**Open:**

```text
http://localhost:8081/2-demo/
```

Use this mode when you want:

- the quickest loop on `dapp/2-demo/`
- app-only work without the full site shell
- immediate checks while editing MiniDapp files

---

## 3. Local feedback API

The demo is already wired to use a local feedback API on localhost.

**Folder:**  
`C:\Users\Charles\Documents\Stables\1_development\stream_2_community\task_x_public_feedback_ledger`

**Command:**

```powershell
Set-Location "C:\Users\Charles\Documents\Stables\1_development\stream_2_community\task_x_public_feedback_ledger"
node tools/feedback_submit_server.mjs
```

**Expected API:**

```text
http://127.0.0.1:8788/api/feedback
```

### Notes

- On `localhost` / `127.0.0.1`, the demo feedback route already knows how to use this local server.
- This is the easiest way to test structured feedback end to end without depending on the remote agent host.

---

## 4. Node-connected localhost workflow

The demo already supports a browser-based **Connect node** flow.

### Standard path

1. Open the demo on localhost
2. Use **Connect node**
3. Use your node host and port

**Default local values:**

- Host: `127.0.0.1`
- Port: `9003`

### If `publicmds: false`

If the node rejects calls because `publicmds` is off, use the existing session-uid workflow:

1. Open Stables from the actual MiniDapp hub
2. Copy the `uid=` value from the address bar, or the full hub URL
3. Paste it into the **Hub session uid** field in the Connect node modal on localhost

### What localhost + Connect node gives us

- live block height
- live MINIMA balance
- real MINIMA send / receive behavior where the app supports it
- near-real product validation without leaving the browser workflow

---

## 5. Recommended day-to-day workflow

### For feature work

```powershell
Set-Location "C:\Users\Charles\Documents\Stables\1_development\stream_1_app\task_stablescouncil_github_io"
npm run serve:dapp
```

Then open:

```text
http://localhost:8081/2-demo/
```

### For full-page/site checks

```powershell
Set-Location "C:\Users\Charles\Documents\Stables\1_development\stream_1_app\task_stablescouncil_github_io"
npm run sync:site
npm run serve:site
```

Then open:

```text
http://localhost:8080/dapp/2-demo/
```

### For feedback testing

Run the feedback server in a second terminal:

```powershell
Set-Location "C:\Users\Charles\Documents\Stables\1_development\stream_2_community\task_x_public_feedback_ledger"
node tools/feedback_submit_server.mjs
```

### For node-truth checks

- Open the demo on localhost
- Use **Connect node**
- Validate the MINIMA wallet flows and connectivity states

### For final release validation

Always do a final pass from:

- the actual MiniDapp hub / package environment

Because localhost is strong, but still not identical to the true host runtime.

---

## 6. What localhost is good for

Localhost is the **main development environment** for:

- UI implementation
- copy changes
- routing and navigation
- activity / wallet logic
- feedback flow
- most product testing
- node-connected browser validation

---

## 7. What still needs real MiniDapp verification

Use the real MiniDapp environment before calling a change done when it touches:

- MDS host injection behavior
- WebView permissions
- camera behavior in host context
- package install / launch behavior
- anything sensitive to MiniDapp host origin

---

## 8. Environment summary

| Environment | Best use | Limit |
|-------------|----------|-------|
| **Direct `dapp/` localhost** | Fastest app iteration | Not full site shell |
| **Generated `site/` localhost** | Full public-web-like checks | Still not the true MiniDapp host |
| **Local feedback server** | End-to-end feedback testing | Not the remote production agent |
| **Localhost + Connect node** | Real MINIMA wallet behavior in browser | Still not the true hub runtime |
| **Real MiniDapp hub** | Final verification | Slower iteration |

---

## 9. Practical rule

Use this rule until a better workflow replaces it:

- **Build on localhost**
- **Connect localhost to the node**
- **Verify final behavior in the real MiniDapp hub**

That gives us speed without losing truth.
