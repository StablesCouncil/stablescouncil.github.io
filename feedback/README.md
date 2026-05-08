# Public feedback ledger

This folder is the **world-readable** store for structured feedback sent from the **Stables MiniDapp** (Feedback page). Everything here is intended to be **public forever**. Do not put private keys, seed phrases, or sensitive personal data in submissions.

## Layout

| Path | Purpose |
|------|--------|
| **`submissions/`** | One `.json` file per submission. This is the source of truth. |
| **`index.json`** | **Generated** summary of all submissions (sort + group). Do not edit by hand. |

Optional placeholder files (e.g. `.gitkeep`) may exist so empty folders are visible on GitHub.

## How feedback gets here

1. A user fills the structured form in the MiniDapp and taps **Send**.
2. The app **POST**s JSON to **`https://agent.stablescouncil.org/api/feedback`** (Stables web agent).
3. The agent stores files on the server first; the Council **syncs** new JSON files into **`feedback/submissions/`** in this repo (manual or scripted process).

So this GitHub folder is the **public mirror** of accepted submissions, not always the very first write location.

## Automated daily sync (server → GitHub)

The Stables web agent only writes to **disk on the server**. To mirror new files into **`feedback/submissions/`** here without manual uploads, run **`tools/sync_feedback_to_github.mjs`** on a schedule (for example **cron** once per day on the same host as `web_agent.js`).

- **Input:** directory where the agent stores JSON (often `feedback_submissions/` next to `web_agent.js`, or `FEEDBACK_SUBMISSIONS_DIR` if set).
- **Behaviour:** for each local `*.json`, if that path does **not** yet exist on GitHub, it is **created** via the GitHub Contents API. Existing paths are **skipped** (safe to re-run).
- **Secrets:** requires a **`GITHUB_TOKEN`** (PAT) with **Contents: write** on this repo. Store only on the server, never in git.
- **After sync:** a push to **`feedback/submissions/**`** triggers the **Build feedback index** workflow, which updates **`feedback/index.json`**.

See the Stables dev tree `task_x_public_feedback_ledger` for the script source and an example cron wrapper.

## Submission format

Each file is a single JSON object (schema version **1**). Typical fields include:

- `submitted_at` (ISO-8601)
- `topic_domain`, `topic_sub`, `kind`
- `title`, `body`
- `consent_public_ledger` (must be `true`)
- optional `public_contact`, `optional_minima_address`
- `source` (app build, client id)

The canonical JSON Schema for developers lives with the MiniDapp source (e.g. `feedback_submission.v1.schema.json` in the Stables Dapp repo).

## Aggregating, sorting, and grouping

Raw data is many small files. For **one file** to query or build a UI:

### Automated (recommended)

GitHub Actions workflow **Build feedback index** (`.github/workflows/feedback-index.yml`) runs when **`feedback/submissions/**`** changes on `main` (or on manual dispatch). It runs:

```bash
node tools/build_feedback_index.mjs feedback/submissions feedback/index.json
```

and commits **`feedback/index.json`** if it changed.

### Manual (clone this repo)

```bash
node tools/build_feedback_index.mjs feedback/submissions feedback/index.json
```

The script lives at **`tools/build_feedback_index.mjs`** in this repository.

### What `index.json` contains

- **`items`** — lightweight row per submission (`file`, `submitted_at`, `topic_domain`, `kind`, `title`, …), sorted **newest first**.
- **`groups.by_topic_domain`** — filenames grouped by `topic_domain`.
- **`groups.by_kind`** — grouped by `kind`.
- **`groups.by_month`** — grouped by `YYYY-MM` from `submitted_at`.

Each `file` value is relative to **`feedback/`** (e.g. `submissions/stables-feedback-….json`).

### Consuming from the web

After the workflow has run at least once:

- **Index (rollup):**  
  `https://raw.githubusercontent.com/StablesCouncil/stablescouncil.github.io/main/feedback/index.json`
- **Single submission:**  
  `https://raw.githubusercontent.com/StablesCouncil/stablescouncil.github.io/main/feedback/<file>`  
  where `<file>` is the path from `index.json` (e.g. `submissions/stables-feedback-2026-03-30T….json`).

Browse the tree on GitHub:  
[github.com/StablesCouncil/stablescouncil.github.io/tree/main/feedback](https://github.com/StablesCouncil/stablescouncil.github.io/tree/main/feedback)

## File naming

Submissions are typically named like:

`stables-feedback-<ISO-timestamp>-<random>.json`

Exact naming may vary depending on the writer (agent sync vs direct API).

## Council / operators

- **Rebuild index without a submission push:** GitHub → **Actions** → **Build feedback index** → **Run workflow**.
- **Update the builder script:** edit **`tools/build_feedback_index.mjs`** on `main`; the next workflow run uses the new logic.
- **Do not commit secrets** (tokens, private feedback). This folder is public.

## Related

- MiniDapp Feedback UI posts to the agent endpoint above.
- Internal dev docs and local test server live in the Stables project under `task_x_public_feedback_ledger` (sandbox); **this** `feedback/README.md` is the public explanation for the GitHub Pages repo.
