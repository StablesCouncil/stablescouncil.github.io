import { env, failed, fetchJson, metric, ok, skipped, sourceConfig, today } from "./_shared.mjs";

const name = "meta";

export async function collect() {
  const config = sourceConfig();
  const token = env("META_ACCESS_TOKEN");
  const instagramUserId = env("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  const facebookPageId = env("FACEBOOK_PAGE_ID");
  if (!token || (!instagramUserId && !facebookPageId)) {
    return skipped(name, "Set META_ACCESS_TOKEN plus INSTAGRAM_BUSINESS_ACCOUNT_ID and/or FACEBOOK_PAGE_ID to collect Meta metrics.");
  }

  try {
    const measuredAt = today();
    const metrics = {};

    if (instagramUserId) {
      const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(instagramUserId)}?fields=followers_count,media_count&access_token=${encodeURIComponent(token)}`;
      const data = await fetchJson(url);
      if (data.followers_count !== undefined) {
        metrics.instagram_followers = metric(Number(data.followers_count), {
          measuredAt,
        source: config.instagram?.url || `Instagram business account ${instagramUserId}`,
          sourceDetail: "Meta Graph API Instagram followers_count.",
          collector: name,
        });
      }
    }

    if (facebookPageId) {
      const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(facebookPageId)}?fields=followers_count,fan_count&access_token=${encodeURIComponent(token)}`;
      const data = await fetchJson(url);
      const count = data.followers_count ?? data.fan_count;
      if (count !== undefined) {
        metrics.facebook_page_followers = metric(Number(count), {
          measuredAt,
        source: config.facebook?.pageUrl || `Facebook page ${facebookPageId}`,
          sourceDetail: "Meta Graph API page followers_count or fan_count.",
          collector: name,
        });
      }
    }

    return ok(name, metrics, ["Facebook group members may require separate Group API permission or a manual snapshot."]);
  } catch (error) {
    return failed(name, error);
  }
}
