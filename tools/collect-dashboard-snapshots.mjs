#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collect as collectDiscord } from "./dashboard_collectors/discord.mjs";
import { collect as collectLocalLedgers } from "./dashboard_collectors/local-ledgers.mjs";
import { collect as collectManualBaselines } from "./dashboard_collectors/manual-baselines.mjs";
import { collect as collectMeta } from "./dashboard_collectors/meta.mjs";
import { collect as collectPublicProfiles } from "./dashboard_collectors/public-profiles.mjs";
import { collect as collectTelegram } from "./dashboard_collectors/telegram.mjs";
import { collect as collectX } from "./dashboard_collectors/x.mjs";
import { collect as collectYouTube } from "./dashboard_collectors/youtube.mjs";
import { today, writeJson } from "./dashboard_collectors/_shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(__dirname, "..");
const snapshotDir = path.join(websiteRoot, "data", "dashboard_snapshots");
const generatedAt = new Date().toISOString();
const measurementDate = today();

const collectors = [
  collectLocalLedgers,
  collectManualBaselines,
  collectX,
  collectMeta,
  collectYouTube,
  collectTelegram,
  collectDiscord,
  collectPublicProfiles,
];

const results = [];
const metrics = {};

for (const collect of collectors) {
  const result = await collect();
  results.push(result);
  for (const [id, value] of Object.entries(result.metrics || {})) {
    metrics[id] = value;
  }
}

const snapshot = {
  version: "0.1",
  generatedAt,
  measurementDate,
  generatedBy: "tools/collect-dashboard-snapshots.mjs",
  metrics,
  collectors: results.map((result) => ({
    name: result.name,
    status: result.status,
    metricCount: Object.keys(result.metrics || {}).length,
    notes: result.notes || [],
    errors: result.errors || [],
  })),
};

writeJson(path.join(snapshotDir, "latest.json"), snapshot);
writeJson(path.join(snapshotDir, `${measurementDate}.json`), snapshot);

const okCount = results.filter((result) => result.status === "ok").length;
const skippedCount = results.filter((result) => result.status === "skipped").length;
const failedCount = results.filter((result) => result.status === "failed").length;
console.log(`Wrote data/dashboard_snapshots/latest.json with ${Object.keys(metrics).length} metrics.`);
console.log(`Collectors: ${okCount} ok, ${skippedCount} skipped, ${failedCount} failed.`);
if (failedCount && process.env.DASHBOARD_COLLECT_STRICT === "1") {
  process.exitCode = 1;
}
