import path from "node:path";
import { metric, ok, readJsonIfExists, websiteRoot } from "./_shared.mjs";

const name = "manual-baselines";

function valueIsEntered(value) {
  return value !== null && value !== undefined && value !== "";
}

export async function collect() {
  const manual = readJsonIfExists(path.join(websiteRoot, "dashboard_manual_inputs.json"), { measurementDate: null, values: {}, sources: {} });
  const metrics = {};

  for (const [id, value] of Object.entries(manual.values || {})) {
    if (!valueIsEntered(value)) continue;
    const source = manual.sources?.[id] || {};
    metrics[id] = metric(value, {
      measuredAt: source.measuredAt || manual.measurementDate,
      source: source.source || "dashboard_manual_inputs.json",
      sourceDetail: source.sourceDetail || "Manual dashboard baseline from dashboard_manual_inputs.json.",
      collector: name,
      quality: source.quality || "manual-baseline",
    });
  }

  return ok(name, metrics, [
    "Mirrors non-empty manual baselines into the latest snapshot so the dashboard pull state shows every current figure.",
  ]);
}
