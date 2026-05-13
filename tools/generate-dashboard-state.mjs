import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(__dirname, "..");

const paths = {
  navi: path.join(websiteRoot, "navi_items.json"),
  metrics: path.join(websiteRoot, "dashboard_metrics.json"),
  state: path.join(websiteRoot, "dashboard_state.json"),
  manual: path.join(websiteRoot, "dashboard_manual_inputs.json"),
  snapshotLatest: path.join(websiteRoot, "data", "dashboard_snapshots", "latest.json"),
  tracker: path.join(websiteRoot, "dapp", "COMMUNITY_DEMO_TASK_TRACKER.md"),
  versioning: path.join(websiteRoot, "dapp", "MINIDAPP_VERSIONING.md"),
  demoIndex: path.join(websiteRoot, "dapp", "2-demo", "index.html"),
  demoActivityContacts: path.join(websiteRoot, "dapp", "2-demo", "assets", "routes", "activity-contacts.js"),
  demoTrustRetro: path.join(websiteRoot, "dapp", "2-demo", "assets", "routes", "trust-retro.js"),
  feedbackSubmissions: path.join(websiteRoot, "feedback", "submissions"),
};

const INDICATOR_GROUPS = [
  "Users",
  "Community / Council development",
  "Ambassadors / Merchant networks",
];

const SUCCESS_METRIC_IDS = new Set([
  "x_followers",
  "x_engagement_actions",
  "instagram_followers",
  "instagram_engagement_actions",
  "telegram_community_members",
  "simplex_group_support_members",
  "telegram_community_messages",
  "telegram_council_members",
  "telegram_council_post_views",
  "telegram_council_reactions",
  "telegram_council_comments_or_replies",
  "facebook_page_followers",
  "facebook_group_members",
  "youtube_subscribers",
  "youtube_recent_views",
  "tiktok_followers",
  "twitch_followers",
  "moltbook_followers",
  "discord_members",
  "discord_council_thread_participants",
  "discord_council_messages",
  "council_questions_submitted",
  "council_role_interest_signals",
  "interested_ambassadors",
  "ambassador_topic_activity",
  "ambassador_questions_collected",
  "showcase_feedback_total",
  "showcase_feedback_new",
  "github_feedback_total",
  "github_feedback_open",
  "feedback_items_routed_to_tracker",
  "agent_telegram_questions",
  "agent_web_questions",
  "agent_total_questions",
  "agent_answer_gaps",
  "agent_feedback_items",
  "merchant_directory_listings",
  "merchant_payment_requests_created",
  "merchant_validations_issued",
  "merchant_reviews_submitted",
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function readJsonIfExists(file, fallback) {
  return fs.existsSync(file) ? readJson(file) : fallback;
}

function writeJson(file, data) {
  const tempFile = `${file}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(tempFile, file);
}

function exists(relPath) {
  return fs.existsSync(path.join(websiteRoot, relPath));
}

function countBy(items, getter) {
  return items.reduce((acc, item) => {
    const key = getter(item) || "Unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function average(items, getter) {
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => sum + Number(getter(item) || 0), 0);
  return Number((total / items.length).toFixed(1));
}

function parseTracker(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const rows = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("| CD-")) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    const id = cells[1];
    if (!id) continue;
    rows[id] = {
      id,
      task: cells[2] || "",
      implementation: cells[4] || "",
      review: cells[5] || "",
      confirm: cells[6] || "",
      status: cells[7] || "",
      released: cells[8] || "",
      version: cells[9] || "",
    };
  }
  return rows;
}

function countFeedbackSubmissions(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((file) => file.endsWith(".json")).length;
}

function countShopProfiles(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const match = text.match(/const SHOP_PROFILES = \{([\s\S]*?)\n  \};/);
  if (!match) return 0;
  return [...match[1].matchAll(/^\s{4}'[^']+'\s*:/gm)].length;
}

function fileHas(file, pattern) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  return pattern.test(text) ? "yes" : "no";
}

function deriveShowcaseVersion(file) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const match = text.match(/Stables_v(\d{2}\.\d{2}\.\d{2}\.\d{2}\.\d{2})\.mds\.zip/);
  return match ? `v${match[1]}` : "v00.00.00.00.03";
}

function setMetric(metricsById, id, value, measuredAt, valueMode, sourceDetail) {
  const metric = metricsById.get(id);
  if (!metric) return;
  metric.latestValue = value;
  metric.lastMeasured = measuredAt;
  metric.valueMode = valueMode;
  metric.sourceDetail = sourceDetail;
  if ((metric.unit === "count" || metric.unit === "percent") && typeof value === "number") {
    if (!Array.isArray(metric.history)) metric.history = [];
    if (!metric.history.some((point) => point.date === measuredAt)) {
      metric.history.push({ date: measuredAt, value });
    }
  }
}

function trackerYes(row, field) {
  return row && row[field] === "[x]" ? "yes" : "no";
}

function trackerStatus(row) {
  return row?.status || null;
}

function valueIsEntered(value) {
  return value !== null && value !== undefined && value !== "";
}

function resetRuntimeMetric(metric) {
  metric.latestValue = null;
  metric.previousValue = null;
  metric.weeklyChange = null;
  metric.history = [];
  metric.lastMeasured = null;
  metric.valueMode = "manual-missing";
  metric.sourceDetail = "No automated snapshot exists and no manual value has been entered yet.";
  delete metric.manualQuality;
  delete metric.snapshotCollector;
  delete metric.snapshotQuality;
}

function feedPlan(metric) {
  const source = String(metric.source || "");
  const sourceType = metric.sourceType || "manual-weekly-snapshot";
  const valueMode = metric.valueMode || "manual-missing";

  if (valueMode === "computed") {
    if (sourceType === "file" || sourceType === "local-file") {
      return {
        feedMode: "Local computed",
        feedCadence: "On dashboard generation",
        dataPullStatus: "wired-local",
        feedNextStep: "Keep this wired through tools/generate-dashboard-state.mjs and extend the parser when the source file becomes richer.",
      };
    }
    if (sourceType === "external-link") {
      return {
        feedMode: "Local readiness check",
        feedCadence: "On dashboard generation",
        dataPullStatus: "wired-local",
        feedNextStep: "Replace file-existence readiness with a URL/API availability check if this becomes a live availability metric.",
      };
    }
    return {
      feedMode: "Computed from local tracker",
      feedCadence: "On dashboard generation",
      dataPullStatus: "wired-local",
      feedNextStep: "Move the underlying tracker or ledger data into a structured source when weekly review starts.",
    };
  }

  if (valueMode === "snapshot") {
    if (metric.snapshotQuality === "public-page-snapshot") {
      return {
        feedMode: "Public profile snapshot",
        feedCadence: "When tools/collect-dashboard-snapshots.mjs runs",
        dataPullStatus: "public-snapshot",
        feedNextStep: "Replace this public-page parser with the official platform API when credentials and permissions are available.",
      };
    }
    return {
      feedMode: "Automated snapshot",
      feedCadence: "When tools/collect-dashboard-snapshots.mjs runs",
      dataPullStatus: sourceType === "file" || sourceType === "local-file" ? "wired-local" : "live-api",
      feedNextStep: "Keep this collector wired through tools/collect-dashboard-snapshots.mjs and monitor snapshot freshness.",
    };
  }

  if (/^https?:\/\//i.test(source)) {
    if (/x\.com/i.test(source)) {
      return {
        feedMode: "X API candidate",
        feedCadence: "Daily or weekly API pull",
        dataPullStatus: "api-candidate",
        feedNextStep: "Add an X API bearer token to the server-side agent and pull user public_metrics plus recent post public_metrics into a local snapshot file.",
      };
    }
    if (/instagram\.com/i.test(source)) {
      return {
        feedMode: "Meta Graph API candidate",
        feedCadence: "Daily or weekly API pull",
        dataPullStatus: "api-candidate",
        feedNextStep: "Connect the Instagram professional account through Meta Graph API permissions, then store follower and publication snapshots locally.",
      };
    }
    if (/facebook\.com/i.test(source)) {
      return {
        feedMode: "Meta Graph API candidate",
        feedCadence: "Daily or weekly API pull",
        dataPullStatus: "api-candidate",
        feedNextStep: "Validate Page or Group API permissions, then pull public follower/member counts through a server-side token.",
      };
    }
    if (/youtube\.com/i.test(source)) {
      return {
        feedMode: "YouTube Data API candidate",
        feedCadence: "Daily or weekly API pull",
        dataPullStatus: "api-candidate",
        feedNextStep: "Add a YouTube Data API key server-side and pull channel statistics plus recent upload/view snapshots.",
      };
    }
    if (/discord\.gg|discord\.com/i.test(source)) {
      return {
        feedMode: "Discord API candidate",
        feedCadence: "Daily or weekly API pull",
        dataPullStatus: "api-candidate",
        feedNextStep: "Use the Discord invite or guild endpoint with counts enabled, then persist approximate member snapshots locally.",
      };
    }
    if (/t\.me/i.test(source)) {
      return {
        feedMode: "Telegram API candidate",
        feedCadence: "Daily or weekly API pull",
        dataPullStatus: "api-candidate",
        feedNextStep: "Add a Telegram bot/admin credential where required and pull member/message snapshots into the dashboard feed file.",
      };
    }
    if (/simplex\.im/i.test(source)) {
      return {
        feedMode: "SimpleX manual snapshot",
        feedCadence: "Weekly manual baseline",
        dataPullStatus: "manual-now",
        feedNextStep: "Enter the SimpleX group member count manually until an approved SimpleX export or collector exists.",
      };
    }
    if (/tiktok\.com|twitch\.tv/i.test(source)) {
      return {
        feedMode: "Platform API candidate",
        feedCadence: "Weekly API or controlled manual pull",
        dataPullStatus: "api-candidate",
        feedNextStep: "Confirm the current platform API access level for this account, then wire the allowed public count fields or keep a controlled manual snapshot.",
      };
    }
    if (/moltbook\.com/i.test(source)) {
      return {
        feedMode: "Public profile fetch candidate",
        feedCadence: "Weekly API or controlled public-page pull",
        dataPullStatus: "api-candidate",
        feedNextStep: "Confirm whether Moltbook exposes a stable API or public follower field, then pull it server-side into the dashboard snapshot file.",
      };
    }
    return {
      feedMode: "Public profile manual snapshot",
      feedCadence: "Weekly manual baseline",
      dataPullStatus: "manual-now",
      feedNextStep: "Enter the public count in dashboard_manual_inputs.json; later replace with an approved platform API or public-profile fetch.",
    };
  }

  if (/agent logs/i.test(source)) {
    return {
      feedMode: "Agent log snapshot",
      feedCadence: "Weekly manual baseline",
      dataPullStatus: "semi-structured",
      feedNextStep: "Define the agent log export schema, then compute the count from the exported log file.",
    };
  }

  if (/github|feedback ledger|api/i.test(source)) {
    return {
      feedMode: "Repository or feedback ledger snapshot",
      feedCadence: "Weekly manual baseline",
      dataPullStatus: "semi-structured",
      feedNextStep: "Point the generator at the GitHub issue/search API or local feedback ledger once the tracker schema is stable.",
    };
  }

  if (/telegram|discord|x analytics|instagram|youtube|facebook|tiktok|twitch/i.test(source)) {
    return {
      feedMode: "Platform API candidate",
      feedCadence: "Weekly API or controlled manual pull",
      dataPullStatus: "api-candidate",
      feedNextStep: "Confirm the platform credential and API access level, then replace dashboard_manual_inputs.json with a server-side snapshot file.",
    };
  }

  return {
    feedMode: "Manual review snapshot",
    feedCadence: "Weekly manual baseline",
    dataPullStatus: "manual-now",
    feedNextStep: "Record the reviewed value in dashboard_manual_inputs.json and replace with a structured source when the workstream produces one.",
  };
}

function addGroup(groups, group) {
  if (!groups.includes(group)) groups.push(group);
}

function classifyMetricGroups(metric) {
  const id = metric.id || "";
  const category = metric.category || "";
  const groups = [];
  const councilSpecific = /telegram_council|discord_council|council_questions|council_role/i.test(id);

  if (/merchant|ambassador/i.test(id) || /merchant|ambassador/i.test(metric.name || "") || /Ambassador/i.test(category)) {
    addGroup(groups, "Ambassadors / Merchant networks");
  }

  if (councilSpecific || /council|navi|dashboard_metric|social_profiles_ready|communication_plan_page_ready/i.test(id) || /Navi|Group Readiness/i.test(category)) {
    addGroup(groups, "Community / Council development");
  }

  if (!councilSpecific && !/ambassador|merchant/i.test(id) && (/^(x|instagram|facebook_page|facebook_group|telegram_community|simplex_group_support|youtube|tiktok|twitch|moltbook|discord_members)_|recent_posts|recent_views|engagement_actions/i.test(id) || /demo|channel|wallet|activity|amount|coverage|token|feedback|github_feedback|showcase|agent|stablesagent|send_|fx_/i.test(id) || /App |Protocol Copy|Public Feedback|StablesAgent|Community Reach/i.test(category))) {
    addGroup(groups, "Users");
  }

  if (!groups.length) addGroup(groups, "Community / Council development");

  const primaryIndicatorGroup = groups.includes("Users")
    ? "Users"
    : groups.includes("Community / Council development")
        ? "Community / Council development"
        : "Ambassadors / Merchant networks";

  return { primaryIndicatorGroup, indicatorGroups: groups };
}

function annotateMetricFeeds(metrics) {
  for (const metric of metrics) {
    if (!metric.valueMode) metric.valueMode = "manual-missing";
    if (!metric.sourceDetail) {
      metric.sourceDetail = metric.valueMode === "manual-missing"
        ? "Manual-only value from dashboard_manual_inputs.json has not been entered yet."
        : "Source detail pending.";
    }
    Object.assign(metric, classifyMetricGroups(metric));
    Object.assign(metric, feedPlan(metric));
  }
}

function main() {
  const navi = readJson(paths.navi);
  const metricsData = readJson(paths.metrics);
  const manual = fs.existsSync(paths.manual)
    ? readJson(paths.manual)
    : { measurementDate: new Date().toISOString().slice(0, 10), values: {} };
  const snapshot = readJsonIfExists(paths.snapshotLatest, { measurementDate: null, metrics: {} });

  const measuredAt = manual.measurementDate || "manual-date-missing";
  const snapshotMeasuredAt = snapshot.measurementDate || snapshot.generatedAt || measuredAt;
  const items = navi.items || [];
  metricsData.metrics = (metricsData.metrics || []).filter((metric) => SUCCESS_METRIC_IDS.has(metric.id));
  const metrics = metricsData.metrics;
  for (const metric of metrics) resetRuntimeMetric(metric);
  const metricsById = new Map(metrics.map((metric) => [metric.id, metric]));
  const tracker = parseTracker(paths.tracker);
  const feedbackTotal = countFeedbackSubmissions(paths.feedbackSubmissions);
  const showcaseVersion = deriveShowcaseVersion(paths.versioning);

  const statusCounts = countBy(items, (item) => item.status);
  const workStateCounts = countBy(items, (item) => item.workState);
  const streamCounts = {};
  const streamProgress = {};
  for (const stream of navi.streams || []) {
    const streamItems = items.filter((item) => (item.streams || [item.stream]).includes(stream));
    streamCounts[stream] = streamItems.length;
    streamProgress[stream] = average(streamItems, (item) => item.progress);
  }

  const phaseCounts = {};
  const phaseProgress = {};
  for (const phase of navi.appPhases || []) {
    const phaseItems = items.filter((item) => (item.appPhases || []).includes(phase));
    phaseCounts[phase] = phaseItems.length;
    phaseProgress[phase] = average(phaseItems, (item) => item.progress);
  }

  const categoryCounts = {};
  const categoryProgress = {};
  for (const category of navi.categories || []) {
    const categoryItems = items.filter((item) => item.category === category);
    categoryCounts[category] = categoryItems.length;
    categoryProgress[category] = average(categoryItems, (item) => item.progress);
  }

  const activeItems = items.filter((item) => item.workState === "active");
  const blockedItems = items.filter((item) => item.status === "Blocked");
  const readyItems = metrics.filter((metric) => String(metric.latestValue || "").toLowerCase().includes("ready"));
  const destinationItems = items.filter((item) => item.workState === "destination");
  const metricLinkCoverage = items.length
    ? Math.round((items.filter((item) => (item.metrics || []).length).length / items.length) * 100)
    : 0;

  const metricIds = new Set(metrics.map((metric) => metric.id));
  const itemIds = new Set(items.map((item) => item.id));
  const missingMetricLinks = items.flatMap((item) =>
    (item.metrics || []).filter((metricId) => !metricIds.has(metricId)).map((metricId) => `${item.id}:${metricId}`)
  );
  const missingNaviLinks = metrics.flatMap((metric) =>
    (metric.relatedNaviItems || []).filter((itemId) => !itemIds.has(itemId)).map((itemId) => `${metric.id}:${itemId}`)
  );

  const computedValues = {
    navi_items_total: items.length,
    navi_not_started: statusCounts["Not started"] || 0,
    navi_drafting: statusCounts.Drafting || 0,
    navi_in_progress: statusCounts["In progress"] || 0,
    navi_testing: statusCounts.Testing || 0,
    navi_live: statusCounts.Live || 0,
    navi_blocked: statusCounts.Blocked || 0,
    navi_average_progress: average(items, (item) => item.progress),
    navi_items_with_metrics: items.filter((item) => (item.metrics || []).length).length,
    navi_metric_link_coverage: metricLinkCoverage,
    channel_selector_implemented: trackerYes(tracker["CD-001"], "implementation"),
    channel_selector_confirmed: trackerYes(tracker["CD-001"], "confirm"),
    channel_truth_model_defined: trackerYes(tracker["CD-002"], "implementation"),
    demo_minima_wallet_baseline_verified: trackerYes(tracker["CD-003"], "review"),
    demo_onboarding_message_ready: trackerYes(tracker["CD-003A"], "implementation"),
    demo_release_notes_ready: trackerYes(tracker["CD-018"], "implementation"),
    send_cleanup_review_state: trackerStatus(tracker["CD-005"]),
    fx_activity_visibility_review_state: trackerStatus(tracker["CD-006"]),
    activity_filters_review_state: trackerStatus(tracker["CD-007"]),
    amount_selector_review_state: trackerStatus(tracker["CD-008"]),
    coverage_fund_summary_order_ready: trackerYes(tracker["CD-009"], "implementation"),
    coverage_fund_label_aligned: trackerYes(tracker["CD-010"], "implementation"),
    coverage_fund_truth_copy_aligned: trackerStatus(tracker["CD-011"]),
    demo_token_truth_copy_ready: trackerYes(tracker["CD-002"], "implementation"),
    merchant_ramp_structure_ready: trackerYes(tracker["CD-012"], "implementation"),
    merchant_channel_ready: exists("dapp/2-demo/index.html") && fileHas(paths.demoActivityContacts, /merchantBtn|tourMerchantBtn|shop ambassador/i) === "yes" ? "yes" : "no",
    merchant_profiles_ready: fileHas(paths.demoActivityContacts, /const SHOP_PROFILES|openShopProfile/),
    merchant_rating_surface_ready: fileHas(paths.demoActivityContacts, /openMerchantRatingComposer|submitMerchantRating|merchantRatings/),
    merchant_validation_surface_ready: fileHas(paths.demoTrustRetro, /issueMerchantValidation|merchant-validation/i),
    merchant_payment_request_surface_ready: fileHas(paths.demoIndex, /Create Invoice|merchant QR|payment request|Open merchant checkout|page-invoice/i),
    community_telegram_ready: exists("links.html") ? "yes" : "no",
    council_official_ready: exists("links.html") ? "yes" : "no",
    social_profiles_ready: exists("links.html") && exists("communication_plan.html") ? "yes" : "no",
    communication_plan_page_ready: exists("communication_plan.html") ? "yes" : "no",
    ambassador_topic_ready: "yes",
    feedback_destination_ready: exists("dapp/2-demo/assets/data/feedback_submission.v1.schema.json") ? "yes" : "no",
    github_feedback_ready: exists("feedback/README.md") ? "yes" : "no",
    stablesagent_ready: exists("links.html") ? "yes" : "no",
    dashboard_metric_sources_ready: 100,
    showcase_live: exists("dapp/1-showcase/index.html") ? "yes" : "no",
    showcase_version: showcaseVersion,
    showcase_feedback_total: feedbackTotal,
    showcase_feedback_new: feedbackTotal,
    github_feedback_total: feedbackTotal,
    github_feedback_open: feedbackTotal,
    feedback_categories_ready: exists("dapp/2-demo/assets/data/feedback_submission.v1.schema.json") ? "yes" : "no",
    demo_status: "In progress",
    feedback_triage_categories_ready: exists("dapp/2-demo/assets/data/feedback_submission.v1.schema.json") ? "yes" : "no",
    feedback_items_routed_to_tracker: 0,
  };

  for (const [id, value] of Object.entries(computedValues)) {
    setMetric(metricsById, id, value, measuredAt, "computed", "Generated from local website/Navi/Dapp sources.");
  }

  for (const [id, entry] of Object.entries(snapshot.metrics || {})) {
    const value = entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
    if (!valueIsEntered(value)) continue;
    const entryMeasuredAt = entry?.measuredAt || snapshotMeasuredAt;
    const sourceDetail = entry?.sourceDetail || entry?.source || "Automated dashboard snapshot.";
    setMetric(metricsById, id, value, entryMeasuredAt, "snapshot", sourceDetail);
    const metric = metricsById.get(id);
    if (metric && entry && typeof entry === "object") {
      metric.snapshotCollector = entry.collector || null;
      metric.snapshotQuality = entry.quality || null;
    }
  }

  for (const [id, value] of Object.entries(manual.values || {})) {
    const metric = metricsById.get(id);
    if (!metric) continue;
    if (valueIsEntered(value)) {
      const manualSource = manual.sources?.[id];
      const sourceDetail = manualSource?.sourceDetail || manualSource?.source || "Manual override from dashboard_manual_inputs.json.";
      setMetric(metricsById, id, value, manualSource?.measuredAt || measuredAt, "manual", sourceDetail);
      if (manualSource?.quality) metric.manualQuality = manualSource.quality;
    } else if (!valueIsEntered(metric.latestValue)) {
      setMetric(metricsById, id, null, null, "manual-missing", "No automated snapshot exists and no manual value has been entered yet.");
    }
  }

  annotateMetricFeeds(metrics);

  const computedMetricCount = metrics.filter((metric) => metric.valueMode === "computed").length;
  const snapshotMetricCount = metrics.filter((metric) => metric.valueMode === "snapshot").length;
  const manualMetricCount = metrics.filter((metric) => String(metric.valueMode || "").startsWith("manual")).length;
  const measuredMetricCount = metrics.filter((metric) => metric.latestValue !== null && metric.latestValue !== undefined).length;
  const dataCoveragePercent = metrics.length ? Math.round((measuredMetricCount / metrics.length) * 100) : 0;

  const leadingDappPhase = Object.entries(phaseCounts)
    .filter(([phase]) => phase !== "Prod")
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "Demo";

  const nextAttentionArea = activeItems
    .filter((item) => item.status !== "Live")
    .sort((a, b) => Number(a.progress || 0) - Number(b.progress || 0))[0];

  const dashboardState = {
    version: "0.1",
    updated: measuredAt,
    generatedBy: "tools/generate-dashboard-state.mjs",
    devOnlyDraft: true,
    overallState: blockedItems.length ? "blocked" : "moving",
    overallStateLabel: blockedItems.length ? "Blocked work needs attention" : "Moving in draft",
    situation: blockedItems.length
      ? `${blockedItems.length} blocked Navi item${blockedItems.length === 1 ? "" : "s"} need attention before this draft can advance.`
      : `${activeItems.length} active Navi items are moving, no blocked items are recorded, and ${computedMetricCount} Dashboard metrics are computed from local sources.`,
    leadingDappPhase,
    nextAttentionArea: nextAttentionArea
      ? {
          id: nextAttentionArea.id,
          title: nextAttentionArea.title,
          stream: nextAttentionArea.stream,
          progress: nextAttentionArea.progress,
          nextStep: nextAttentionArea.nextStep,
        }
      : null,
    counts: {
      items: items.length,
      activeWork: activeItems.length,
      laterWork: workStateCounts.later || 0,
      destinations: destinationItems.length,
      blocked: blockedItems.length,
      readyForReviewSignals: readyItems.length,
      metrics: metrics.length,
      computedMetrics: computedMetricCount,
      snapshotMetrics: snapshotMetricCount,
      manualMetrics: manualMetricCount,
      measuredMetrics: measuredMetricCount,
      dataCoveragePercent,
      missingMetricLinks: missingMetricLinks.length,
      missingNaviLinks: missingNaviLinks.length,
    },
    statusCounts,
    streamCounts,
    streamProgress,
    categoryCounts,
    categoryProgress,
    dappPhaseCounts: phaseCounts,
    dappPhaseProgress: phaseProgress,
    validation: {
      missingMetricLinks,
      missingNaviLinks,
      liveUrlsExpectedTo404: true,
      publishState: "dev-only draft",
    },
  };

  metricsData.updated = measuredAt;
  metricsData.generatedBy = "tools/generate-dashboard-state.mjs";
  metricsData.displayMode = "success-percentages-plus-absolute-values";
  metricsData.groupSuccessBaselines = {
    Users: 2,
    "Community / Council development": 1,
    "Ambassadors / Merchant networks": 1,
  };
  metricsData.valueModes = {
    computed: "Derived from local website files, Navi data, Dapp tracker, version docs, or feedback files.",
    snapshot: "Collected by tools/collect-dashboard-snapshots.mjs from platform APIs, public endpoints, or structured local ledgers.",
    manual: "Entered in dashboard_manual_inputs.json because no local automatic source exists.",
    "manual-missing": "Manual-only value intentionally not entered yet.",
  };
  metricsData.dataPullStatuses = {
    "wired-local": "Already computed from local project files by the dashboard generator.",
    "live-api": "Collected into a sanitized local snapshot by an authenticated or approved platform collector.",
    "public-snapshot": "Collected from a public profile page; useful as an interim feed but lower confidence than an official API.",
    "api-candidate": "Can likely be automated through a platform API or authenticated server-side fetch once credentials and permissions are configured.",
    "semi-structured": "Has a recognizable source but still needs a stable parser or API pull.",
    "manual-now": "Requires a weekly manual value until a stable external or internal feed exists.",
  };
  metricsData.indicatorGroups = INDICATOR_GROUPS;

  writeJson(paths.metrics, metricsData);
  writeJson(paths.state, dashboardState);
  console.log(`Generated ${path.relative(websiteRoot, paths.state)} and refreshed ${path.relative(websiteRoot, paths.metrics)}.`);
}

main();
