import { failed, fetchText, metric, ok, sourceConfig, today } from "./_shared.mjs";

const name = "public-profiles";

function firstNumber(patterns, text) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const raw = (match[1] || match[0]).replace(/,/g, "").trim();
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

async function collectPublicCount(id, url, patterns, sourceDetail) {
  if (!url) return null;
  const html = await fetchText(url, { timeoutMs: 30000 });
  const value = firstNumber(patterns, html);
  if (value === null) return null;
  return metric(value, {
    measuredAt: today(),
    source: url,
    sourceDetail,
    collector: name,
    quality: "public-page-snapshot",
  });
}

export async function collect() {
  const config = sourceConfig();
  const metrics = {};
  const notes = [];
  const errors = [];

  const targets = [
    {
      id: "moltbook_followers",
      url: config.moltbook?.url,
      patterns: [
        /([\d,]+)\s+followers/i,
        /followers[^0-9]{0,40}([\d,]+)/i,
      ],
      detail: "Public Moltbook profile follower count parsed from profile HTML.",
    },
    {
      id: "tiktok_followers",
      url: config.tiktok?.url,
      patterns: [
        /"followerCount"\s*:\s*([\d]+)/i,
        /([\d,]+)\s+followers/i,
      ],
      detail: "Public TikTok profile follower count parsed from profile HTML.",
    },
    {
      id: "twitch_followers",
      url: config.twitch?.url,
      patterns: [
        /([\d,]+)\s+followers/i,
        /"followersCount"\s*:\s*([\d]+)/i,
      ],
      detail: "Public Twitch profile follower count parsed from profile HTML.",
    },
  ];

  for (const target of targets) {
    try {
      const value = await collectPublicCount(target.id, target.url, target.patterns, target.detail);
      if (value) metrics[target.id] = value;
      else notes.push(`${target.id}: no stable public count found.`);
    } catch (error) {
      errors.push(`${target.id}: ${error.message}`);
    }
  }

  const result = ok(name, metrics, notes);
  if (errors.length) result.errors = errors;
  return result;
}
