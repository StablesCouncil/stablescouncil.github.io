import { env, failed, fetchJson, fetchText, metric, ok, skipped, sourceConfig, today } from "./_shared.mjs";

const name = "youtube";

export async function collect() {
  const config = sourceConfig().youtube || {};
  const apiKey = env("YOUTUBE_API_KEY");
  let channelId = env("YOUTUBE_CHANNEL_ID") || config.channelId || "";
  const handle = env("YOUTUBE_HANDLE") || config.handle || "@StablesCouncil";
  const channelUrl = config.url || `https://www.youtube.com/${handle}`;

  if (!channelId) {
    try {
      const html = await fetchText(channelUrl);
      const match = html.match(/"externalId":"([^"]+)"/) || html.match(/"channelId":"([^"]+)"/);
      channelId = match?.[1] || "";
    } catch {
      channelId = "";
    }
  }

  if (!apiKey || !channelId) {
    const suffix = channelId ? ` Discovered channel id: ${channelId}.` : "";
    return skipped(name, `Set YOUTUBE_API_KEY${channelId ? "" : " and YOUTUBE_CHANNEL_ID"} to collect YouTube metrics.${suffix}`);
  }

  try {
    const measuredAt = today();
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`;
    const data = await fetchJson(url);
    const stats = data?.items?.[0]?.statistics || {};
    const metrics = {};

    if (stats.subscriberCount !== undefined) {
      metrics.youtube_subscribers = metric(Number(stats.subscriberCount), {
        measuredAt,
        source: channelUrl,
        sourceDetail: "YouTube Data API channels.statistics.subscriberCount.",
        collector: name,
      });
    }

    if (stats.viewCount !== undefined) {
      metrics.youtube_recent_views = metric(Number(stats.viewCount), {
        measuredAt,
        source: channelUrl,
        sourceDetail: "YouTube Data API channels.statistics.viewCount. This is total channel views until a recent-upload window is wired.",
        collector: name,
      });
    }

    return ok(name, metrics);
  } catch (error) {
    return failed(name, error);
  }
}
