#!/usr/bin/env node
/**
 * Aggregate public feedback submissions into one index for sort / group / filter.
 *
 * Usage (from task_x_public_feedback_ledger):
 *   node tools/build_feedback_index.mjs
 *   node tools/build_feedback_index.mjs ./feedback/submissions ./feedback/index.json
 *
 * First arg: submissions directory (recursive .json scan).
 * Second arg: output path for index.json (default: <submissions>/../index.json).
 *
 * Output shape (index_version 1):
 *   generated_at, submissions_root, count, items[], groups.by_topic_domain, by_kind, by_month
 * Each item: file, submitted_at, topic_domain, kind, title, topic_sub, app_page_id (nullable), …
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TASK_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SUBMISSIONS = path.join(TASK_ROOT, 'feedback', 'submissions');
const INDEX_VERSION = 1;

async function walkJsonFiles(dir, acc = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walkJsonFiles(full, acc);
    else if (e.isFile() && e.name.endsWith('.json') && e.name !== 'index.json') acc.push(full);
  }
  return acc;
}

function monthKey(iso) {
  if (!iso || typeof iso !== 'string') return 'unknown';
  const m = iso.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(m) ? m : 'unknown';
}

function safeItem(fileRel, obj) {
  const ac = obj.app_context || {};
  return {
    file: fileRel.replace(/\\/g, '/'),
    schema_version: obj.schema_version ?? null,
    submitted_at: obj.submitted_at || null,
    topic_domain: obj.topic_domain || null,
    topic_sub: obj.topic_sub ?? null,
    kind: obj.kind || null,
    title: typeof obj.title === 'string' ? obj.title.slice(0, 300) : null,
    app_page_id: ac.page_id ?? null,
    source_client: obj.source?.client ?? null,
    source_app_build: obj.source?.app_build ?? null,
  };
}

function pushGroup(map, key, fileRel) {
  const k = key || 'unknown';
  if (!map[k]) map[k] = [];
  map[k].push(fileRel);
}

async function main() {
  const submissionsArg = process.argv[2];
  const outArg = process.argv[3];
  const submissionsRoot = path.resolve(submissionsArg || DEFAULT_SUBMISSIONS);
  const indexPath = outArg
    ? path.resolve(outArg)
    : path.join(path.dirname(submissionsRoot), 'index.json');

  const files = await walkJsonFiles(submissionsRoot);
  const items = [];
  const errors = [];

  const feedbackRoot = path.dirname(submissionsRoot);
  for (const abs of files) {
    const relFromSubmissions = path.relative(submissionsRoot, abs);
    const relToFeedback = path.relative(feedbackRoot, abs).replace(/\\/g, '/');
    let raw;
    try {
      raw = await fs.readFile(abs, 'utf-8');
    } catch (e) {
      errors.push({ file: relFromSubmissions, error: String(e.message || e) });
      continue;
    }
    let obj;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      errors.push({ file: relFromSubmissions, error: 'invalid JSON' });
      continue;
    }
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      errors.push({ file: relFromSubmissions, error: 'not a JSON object' });
      continue;
    }
    const item = safeItem(relToFeedback, obj);
    items.push(item);
  }

  items.sort((a, b) => {
    const ta = Date.parse(a.submitted_at || '') || 0;
    const tb = Date.parse(b.submitted_at || '') || 0;
    return tb - ta;
  });

  const by_topic_domain = {};
  const by_kind = {};
  const by_month = {};
  for (const it of items) {
    const f = it.file;
    pushGroup(by_topic_domain, it.topic_domain, f);
    pushGroup(by_kind, it.kind, f);
    pushGroup(by_month, monthKey(it.submitted_at), f);
  }

  const out = {
    index_version: INDEX_VERSION,
    generated_at: new Date().toISOString(),
    submissions_root: 'submissions',
    count: items.length,
    items,
    groups: {
      by_topic_domain,
      by_kind,
      by_month,
    },
    build_errors: errors.length ? errors : undefined,
  };

  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, JSON.stringify(out, null, 2) + '\n', 'utf-8');
  console.log(`Wrote ${indexPath} (${items.length} items, ${errors.length} errors)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
