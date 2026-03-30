#!/usr/bin/env node
/**
 * Upload feedback JSON files from the agent server disk to the public GitHub repo.
 * Idempotent: skips files that already exist at the same path on GitHub.
 *
 * Run daily via cron on the Vultr host after web_agent writes to feedback_submissions/.
 *
 * Usage:
 *   export GITHUB_TOKEN=ghp_...   # classic PAT: repo scope, or fine-grained Contents write
 *   node tools/sync_feedback_to_github.mjs /path/to/feedback_submissions
 *
 * Env (optional):
 *   GITHUB_FEEDBACK_OWNER   (default StablesCouncil)
 *   GITHUB_FEEDBACK_REPO    (default stablescouncil.github.io)
 *   GITHUB_FEEDBACK_PATH    (default feedback/submissions)
 *   FEEDBACK_SUBMISSIONS_DIR — if set, used as source when no CLI path is given
 *
 * Exit 0 always unless fatal misconfig; prints summary of uploaded / skipped / failed.
 */

import fs from 'fs/promises';
import path from 'path';

const GH_TOKEN = process.env.GITHUB_TOKEN || '';
const GH_OWNER = process.env.GITHUB_FEEDBACK_OWNER || 'StablesCouncil';
const GH_REPO = process.env.GITHUB_FEEDBACK_REPO || 'stablescouncil.github.io';
const GH_PATH_PREFIX = (process.env.GITHUB_FEEDBACK_PATH || 'feedback/submissions').replace(/^\/+|\/+$/g, '');

const sourceDir = path.resolve(
  process.argv[2] || process.env.FEEDBACK_SUBMISSIONS_DIR || ''
);

function ghContentsUrl(pathInRepo) {
  const encoded = pathInRepo.split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encoded}`;
}

async function githubGet(pathInRepo) {
  const url = ghContentsUrl(pathInRepo);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }
  return { ok: res.ok, status: res.status, data };
}

async function githubPut(pathInRepo, contentUtf8, message) {
  const url = ghContentsUrl(pathInRepo);
  const content = Buffer.from(contentUtf8, 'utf8').toString('base64');
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message, content })
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
  }
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  if (!GH_TOKEN) {
    console.error('Missing GITHUB_TOKEN');
    process.exit(1);
  }
  if (!sourceDir) {
    console.error('Pass source directory as argv[1] or set FEEDBACK_SUBMISSIONS_DIR');
    process.exit(1);
  }

  let entries;
  try {
    entries = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch (e) {
    console.error('Cannot read source dir:', sourceDir, e.message);
    process.exit(1);
  }

  const jsonFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.json'));
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const e of jsonFiles) {
    const fname = e.name;
    const apiPath = `${GH_PATH_PREFIX}/${fname}`;
    const localPath = path.join(sourceDir, fname);

    const head = await githubGet(apiPath);
    if (head.status === 200) {
      skipped += 1;
      continue;
    }
    if (head.status !== 404) {
      console.error('GET', apiPath, head.status, head.data?.message || '');
      failed += 1;
      continue;
    }

    let body;
    try {
      body = await fs.readFile(localPath, 'utf8');
    } catch (err) {
      console.error('Read failed', localPath, err.message);
      failed += 1;
      continue;
    }

    let title = 'sync feedback';
    try {
      const j = JSON.parse(body);
      title = (j.title || 'feedback').slice(0, 72);
    } catch {
      /* ignore */
    }

    const put = await githubPut(apiPath, body, `feedback: sync ${fname} (${title})`);
    if (put.ok) {
      uploaded += 1;
      console.log('Uploaded', apiPath);
    } else {
      console.error('PUT', apiPath, put.status, put.data?.message || JSON.stringify(put.data));
      failed += 1;
    }
  }

  console.log(
    JSON.stringify({
      source: sourceDir,
      repo: `${GH_OWNER}/${GH_REPO}`,
      path: GH_PATH_PREFIX,
      files_seen: jsonFiles.length,
      uploaded,
      skipped,
      failed
    })
  );

  if (failed > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
