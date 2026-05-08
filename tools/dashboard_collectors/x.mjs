import { env, failed, fetchJson, metric, ok, skipped, sourceConfig, today } from "./_shared.mjs";

const name = "x";

export async function collect() {
  const config = sourceConfig().x || {};
  const bearer = env("X_BEARER_TOKEN");
  const username = env("DASHBOARD_X_USERNAME") || config.username || "StablesCouncil";
  if (!bearer) return skipped(name, "Set X_BEARER_TOKEN to collect X follower and engagement metrics.");

  try {
    const headers = { Authorization: `Bearer ${bearer}` };
    const userUrl = `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=public_metrics`;
    const userData = await fetchJson(userUrl, { headers });
    const user = userData?.data;
    const measuredAt = today();
    const metrics = {};

    if (user?.public_metrics?.followers_count !== undefined) {
      metrics.x_followers = metric(user.public_metrics.followers_count, {
        measuredAt,
        source: `https://x.com/${username}`,
        sourceDetail: "X API user public_metrics.followers_count.",
        collector: name,
      });
    }

    if (user?.id) {
      const limit = Math.max(5, Math.min(Number(env("DASHBOARD_X_RECENT_TWEET_LIMIT")) || 10, 100));
      const tweetsUrl = `https://api.x.com/2/users/${user.id}/tweets?max_results=${limit}&tweet.fields=public_metrics`;
      const tweetsData = await fetchJson(tweetsUrl, { headers });
      const engagement = (tweetsData?.data || []).reduce((sum, tweet) => {
        const p = tweet.public_metrics || {};
        return sum + Number(p.like_count || 0) + Number(p.reply_count || 0) + Number(p.retweet_count || 0) + Number(p.quote_count || 0);
      }, 0);
      metrics.x_engagement_actions = metric(engagement, {
        measuredAt,
        source: `https://x.com/${username}`,
        sourceDetail: `X API recent ${Math.min(limit, (tweetsData?.data || []).length)} posts engagement sum.`,
        collector: name,
      });
    }

    return ok(name, metrics);
  } catch (error) {
    return failed(name, error);
  }
}
