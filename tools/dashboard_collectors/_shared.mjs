import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const websiteRoot = path.resolve(__dirname, "..", "..");

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function env(name) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : "";
}

export function readJsonIfExists(file, fallback = null) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

export function sourceConfig() {
  return readJsonIfExists(path.join(websiteRoot, "dashboard_sources.json"), {});
}

export function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function metric(value, detail) {
  return {
    value,
    measuredAt: detail.measuredAt || today(),
    source: detail.source || "",
    sourceDetail: detail.sourceDetail || detail.source || "Automated dashboard collector.",
    collector: detail.collector,
    quality: detail.quality || "live-api",
  };
}

export function skipped(name, reason) {
  return {
    name,
    status: "skipped",
    metrics: {},
    notes: [reason],
  };
}

export function ok(name, metrics, notes = []) {
  return {
    name,
    status: "ok",
    metrics,
    notes,
  };
}

export function failed(name, error) {
  return {
    name,
    status: "failed",
    metrics: {},
    errors: [error?.message || String(error)],
  };
}

export async function fetchJson(url, options = {}) {
  const timeoutMs = options.timeoutMs || 20000;
  const signal = options.signal || AbortSignal.timeout(timeoutMs);
  const response = await fetch(url, {
    ...options,
    signal,
    headers: {
      Accept: "application/json",
      "User-Agent": "StablesCouncilDashboard/0.1",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.detail || data?.title || data?.error?.message || data?.error || text || response.statusText;
    throw new Error(`${response.status} ${response.statusText}: ${message}`);
  }
  return data;
}

export async function fetchText(url, options = {}) {
  const timeoutMs = options.timeoutMs || 20000;
  const signal = options.signal || AbortSignal.timeout(timeoutMs);
  const response = await fetch(url, {
    ...options,
    signal,
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "StablesCouncilDashboard/0.1",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 200)}`);
  }
  return text;
}

export function readTextIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function writeJson(file, data) {
  ensureDir(path.dirname(file));
  const tempFile = `${file}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(tempFile, file);
}
