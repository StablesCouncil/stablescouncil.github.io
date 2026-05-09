# Dashboard success metrics and data pipeline

**Live page:** https://stablescouncil.org/council_dashboard.html  
**Status:** Version 0.0.01 | Community Draft

The Dashboard is a public success measurement layer for Stables. It is not a task tracker and should not be used to show internal development progress. It tracks measurable signals that come from our work: user reach, community and Council engagement, ambassador interest, merchant-network traction, and public channel growth.

## Indicator groups

The Dashboard currently uses three main groups:

1. **Users**
2. **Community / Council development**
3. **Ambassadors / Merchant networks**

Ambassador-related measures belong in **Ambassadors / Merchant networks**, not in Community / Council development. Merchant channel activity, merchant listings, ambassador interest, and merchant-network traction also belong in that group.

Community / Council development should focus on Council-specific interest and engagement, especially from dedicated Council social channels. General community chatter belongs to the broader community side, not automatically to Council development.

## Real data vs TBD

The Dashboard must never present fake values as success metrics.

Current rules:

- If the number is collected, show the value and its source.
- If the number is manually entered, label it as a manual baseline.
- If the number needs an API or credential, label it as needing API access.
- If the number does not exist yet, show it as TBD or awaiting baseline.
- Demo app merchant profiles are not production merchant directory listings.

As of the first public draft, known real baselines include:

- X followers for `@StablesCouncil`: manually held public baseline.
- TikTok followers for the public Stables account: public page snapshot.

Merchant directory listings are not currently available as production success data unless a real production merchant directory ledger or source is wired.

## Data source files

The Dashboard data pipeline is represented by these website files:

- `dashboard_metrics.json`: metric definitions, groups, labels, sources, and Navigation links.
- `dashboard_feed_plan.json`: feed status, collection method, next step, and automation plan per metric.
- `dashboard_manual_inputs.json`: manually entered baselines that should not be invented by the UI.
- `dashboard_sources.json`: public identifiers and source URLs.
- `dashboard_state.json`: generated state consumed by the Dashboard page.
- `data/dashboard_snapshots/latest.json`: latest collected or manual snapshot.
- `tools/collect-dashboard-snapshots.mjs`: collector runner.
- `tools/generate-dashboard-state.mjs`: state generator.
- `tools/dashboard_collectors/`: collectors for X, Telegram, Discord, YouTube, Meta, public profiles, manual baselines, and local ledgers.

## Collection model

The pipeline distinguishes:

- **Manual baseline:** a value entered from a public or operator-confirmed source.
- **Public snapshot:** a value scraped or discovered from a public page where allowed and technically stable.
- **API candidate:** a value that should be automated later once credentials or API access are configured.
- **TBD / awaiting baseline:** a valid metric concept with no current measurement.

APIs or credentials may be needed for X, Telegram, Discord, Meta, YouTube, or other platforms. Until credentials exist, the Dashboard should clearly say the measure needs API access instead of pretending it is automated.

## Dashboard and Navigation link model

Dashboard measures can link back to related Navigation cards. Navigation cards can link to Dashboard measures. These links let users move between:

- the work or roadmap item that explains the initiative, and
- the success measure that tracks whether the initiative is working.

When metric IDs or Navi card IDs change, both sides must be updated together.
