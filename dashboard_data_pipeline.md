# Council Dashboard Data Pipeline

The Dashboard does not call platform APIs from the browser. Collectors run server-side or locally, write a sanitized snapshot, and the static Dashboard reads generated JSON.

## Flow

1. `tools/collect-dashboard-snapshots.mjs`
   - runs all collectors
   - writes `data/dashboard_snapshots/latest.json`
   - also writes a dated snapshot such as `data/dashboard_snapshots/2026-05-06.json`

2. `tools/generate-dashboard-state.mjs`
   - reads metric definitions from `dashboard_metrics.json`
   - reads automated values from `data/dashboard_snapshots/latest.json`
   - reads manual overrides from `dashboard_manual_inputs.json`
   - writes refreshed `dashboard_metrics.json` and `dashboard_state.json`

3. `council_dashboard.html`
   - reads only local JSON files
   - never receives API keys or platform tokens

## Commands

From `1_development/stream_1_app/website`:

```powershell
npm run dashboard:collect
npm run dashboard:generate
npm run dashboard:update
```

`dashboard:update` runs the collector pass and then regenerates the dashboard state. By default, failed external collectors are recorded in the snapshot but do not stop generation. Set `DASHBOARD_COLLECT_STRICT=1` when a scheduled job should fail on collector errors.

## Credentials

Set credentials as environment variables on the machine or server running the collectors. Do not write them into public files.
Public handles and invite codes live in `dashboard_sources.json`; collectors use those values when environment variables are not set.

```powershell
$env:X_BEARER_TOKEN="..."
$env:DASHBOARD_X_USERNAME="StablesCouncil"

$env:META_ACCESS_TOKEN="..."
$env:INSTAGRAM_BUSINESS_ACCOUNT_ID="..."
$env:FACEBOOK_PAGE_ID="..."

$env:YOUTUBE_API_KEY="..."
$env:YOUTUBE_CHANNEL_ID="..."

$env:TELEGRAM_BOT_TOKEN="..."
$env:TELEGRAM_COMMUNITY_CHAT_ID="@stablescommunity"
$env:TELEGRAM_COUNCIL_CHAT_ID="@stablescouncilofficial"

$env:DISCORD_INVITE_CODE="..."
```

Alternative Discord mode:

```powershell
$env:DISCORD_BOT_TOKEN="..."
$env:DISCORD_GUILD_ID="..."
```

## Precedence

Values are merged in this order:

1. local computed values from project files
2. automated snapshot values from collectors
3. non-empty manual overrides from `dashboard_manual_inputs.json`

Empty manual values do not erase automated snapshots. They only mark a metric as missing when no snapshot or computed value exists.

## Feed Status

- `wired-local`: computed from local project files or structured local ledgers
- `live-api`: collected through an authenticated or approved platform collector
- `public-snapshot`: collected from a public profile page and treated as lower confidence than an official API
- `api-candidate`: can likely be automated after credentials and permissions are configured
- `semi-structured`: needs a stable parser or source export
- `manual-now`: still requires a weekly manual value

## Fill Plan

The implementation plan is tracked in `dashboard_feed_plan.json`.

Current priority:

1. Keep only real values in `data/dashboard_snapshots/latest.json`.
2. Use manual public baselines only when the value and source are visible and recorded.
3. Add low-friction API credentials next: YouTube, Telegram, Discord.
4. Move X, Instagram, and Facebook from manual/public baselines to official APIs when credentials are available.
5. Do not count demo merchant profiles as merchant-network success. Merchant metrics need a real production or declared public-test ledger.

## Current Collectors

- `local-ledgers`: structured local ledgers only; demo merchant profiles are intentionally excluded from success metrics
- `manual-baselines`: non-empty manual baselines mirrored into the latest snapshot with their source notes
- `x`: X followers and recent engagement, with `X_BEARER_TOKEN`
- `meta`: Instagram followers and Facebook page followers, with Meta Graph API credentials
- `youtube`: subscriber count and channel views, with YouTube Data API
- `telegram`: community and council member counts, with Telegram Bot API
- `discord`: member count, with invite counts or bot/guild access
- `public-profiles`: lower-confidence public profile snapshots for Moltbook, TikTok, and Twitch when a stable public count is exposed

Metrics that still need platform-specific strategy remain manual or API-candidate until credentials and permissions exist.
