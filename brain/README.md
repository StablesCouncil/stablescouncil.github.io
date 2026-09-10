# StablesAgent Brain Base

## Overview
This repository contains the public **Knowledge Base** for the `@StablesAgentBot`. It serves as the single source of truth for the AI assistant running in the Stables ecosystem.

If a document or fact is not in this folder, the AI does not know it. This ensures complete control over what information is publicly disseminated and prevents the leaking of internal drafts or private working notes.

**Answering rule: design is not deployment.** Most of this base describes the Stables protocol as
designed. Very little of it is software a user can run today. `release_scope_boundary.md` is the
binding statement of what actually ships, and it outranks every other document here when the
question is "can I do X". Never present a designed capability as available, and never present a
valueless test token as money or as an investment.

## Technical Architecture
The bot operates on a **100% Local, Private, and Cost-Free** Artificial Intelligence stack:
1. **Embeddings:** When these Markdown files are updated, `@xenova/transformers` (running locally via Node.js) converts the text into mathematical vectors (`vector_db.json`).
2. **Retrieval (RAG):** When a user asks a question on Telegram, the bot searches the Vector Database to find the most relevant paragraphs from this repository.
3. **Generation:** The context is fed into a local **Llama 3.2** model (via Ollama), which drafts a polite, concise reply based *strictly* on the retrieved text.

## Transparency & Logging
To maintain full transparency with the community:
- All interactions with the AI are logged anonymously into `interaction_logs.csv`. 
- No usernames or personal identifiers are stored. 
- The CSV file will be periodically pushed to this GitHub repository so anyone can review the questions being asked and verify the AI's responses.

## Files in this folder (quick index)

| File | Purpose |
|------|---------|
| **`core_definitions.md`** | Core terms and definitions. |
| **`comprehensive_knowledge_base.md`** | Long-form synthesis (protocol, philosophy, Academy, **website ship summary**). |
| **`github_pages_website_engineering.md`** | **Canonical ops summary** for the public site: single `website/` source, direct local preview, founder-gated isolated publication candidate, Pages ship, and live verification. |
| **`website_button_hierarchy.md`** | **`btn-primary`** vs **`btn-secondary`** hierarchy for site and MiniDapp shell; points to **`web_component_spec.md`**. |
| **`council_minima_devtools.md`** | Public **Minima dev tools** URLs (`/devtools/`, archive + query subpages), links page rule (single Council row), site chrome expectations. |
| **`website_presentation.md`** | On-site marketing copy and StablesAgent / **`llms.txt`** links; points to the engineering doc for build and deploy. |
| **`charter_overview.md`**, **`banking_system_overview.md`**, **`circular_economy_diagram.md`** | Topic-specific public summaries. |
| **`minidapp_test_channel_overview.md`** | **Current active channel:** Test MiniDapp — on-chain Winiwa/USDw, trustless faucet, covenant mint/burn, access, safety framing. |
| **`minidapp_demo_overview.md`** | Demo channel — **frozen / superseded** historical reference. |
| **`minidapp_showcase_app.md`** | Showcase MiniDapp versions, feedback, and in-app behaviour notes. |

## Where this knowledge lives (operators)

**There is one authoritative brain: this folder,
`1_development/stream_3_governance/task_stablesagent-brain-base/`.** Edit here, verify here, deploy
from here. Every other location is a deployment target, never a source.

> **Retired 2026-08-01: `2_current/stream_3_governance/prod_stablesagent-brain-base/`.** That
> promoted copy was the source of a real failure. Three copies had drifted; the promoted one was six
> weeks stale, was missing the test-channel documents entirely, and described the **frozen** demo as
> the "current build" at `v0.0.0.3.44`. `ingest_knowledge.js` preferred it **silently**, so an ingest
> run on a full repo indexed the wrong knowledge and reported success. The resolver no longer reads
> it, warns when it is present, and prints the directory it chose. Do not promote into it and do not
> treat it as authoritative.

Drift between this folder and any deployed copy is machine-checkable: run
`node ../task_x_agent_node/verify_brain_sources.js`.

| Target | Path or URL | What to run |
|--------|-------------|-------------|
| **Public GitHub rollup** | **`brain/`** at the **Stables monorepo root** | Sync from **this folder**, run **`node build_llms_txt.js`**, commit **`brain/`** including **`llms.txt`**, push **`StablesCouncil/stables-agent`**. External models: **`https://raw.githubusercontent.com/StablesCouncil/stables-agent/main/brain/llms.txt`**. |
| **Council VPS (Telegram + web RAG)** | **`/home/linuxuser/stables-agent/task_stablesagent-brain-base/`** | `rsync -av --delete --exclude='.env' --exclude='.env.*'` from **this folder**, then `node ingest_knowledge.js`, then `pm2 restart stables-telegram-agent stables-web-agent`. Confirm the `🧭 Brain source:` line names the intended directory before trusting the result. **Deployment is founder-approved; it is not a routine step.** |

The VPS path in this table is the **observed** one (verified 2026-08-01). An older revision of this
document named `/root/stables-agent/...`, which is not where the agent runs.

## Contribution
To correct an AI hallucination or update its knowledge, do **not** change the rigid prompt rules. Instead, update the Markdown files in this directory (such as `core_definitions.md`) with clearer, stronger facts and re-run the ingestion script.

## How to Use It (For Users)
There are two primary ways to interact with the Stables knowledge base:

### Option 1: The Telegram Bot 
You can interact with the official Stables assistant directly in the Stables community channel by tagging `@StablesAgentBot`. It uses the local Llama 3.2 pipeline (described above) to answer questions securely and privately based on this repository.

### Option 2: External AI Models (ChatGPT, Claude)
If you prefer to use your own LLM, we have formatted the entire knowledge base into a single, internet-standard file.
You can simply paste the following prompt into ChatGPT or Claude, providing the direct URL to our `llms.txt` file:

> *"Please read the official knowledge base at https://raw.githubusercontent.com/StablesCouncil/stables-agent/main/brain/llms.txt and answer the following question about Stables: [Your Question]"*

*(Note: The `llms.txt` file is auto-generated whenever the brain base is updated, ensuring ChatGPT always has the latest facts).*
