import { env, failed, fetchJson, metric, ok, skipped, sourceConfig, today } from "./_shared.mjs";

const name = "discord";

export async function collect() {
  const config = sourceConfig().discord || {};
  const inviteCode = env("DISCORD_INVITE_CODE") || config.inviteCode || "";
  const botToken = env("DISCORD_BOT_TOKEN");
  const guildId = env("DISCORD_GUILD_ID");

  if (!inviteCode && !(botToken && guildId)) {
    return skipped(name, "Set DISCORD_INVITE_CODE, or DISCORD_BOT_TOKEN plus DISCORD_GUILD_ID, to collect Discord members.");
  }

  try {
    const measuredAt = today();
    let value = null;
    let source = "";
    let sourceDetail = "";

    if (inviteCode) {
      const data = await fetchJson(`https://discord.com/api/v10/invites/${encodeURIComponent(inviteCode)}?with_counts=true`, { timeoutMs: 30000 });
      value = data?.approximate_member_count;
      source = config.url || `https://discord.gg/${inviteCode}`;
      sourceDetail = "Discord invite endpoint approximate_member_count.";
    } else {
      const data = await fetchJson(`https://discord.com/api/v10/guilds/${encodeURIComponent(guildId)}?with_counts=true`, {
        headers: { Authorization: `Bot ${botToken}` },
      });
      value = data?.approximate_member_count;
      source = `Discord guild ${guildId}`;
      sourceDetail = "Discord guild endpoint approximate_member_count.";
    }

    const metrics = {};
    if (value !== null && value !== undefined) {
      metrics.discord_members = metric(Number(value), {
        measuredAt,
        source,
        sourceDetail,
        collector: name,
      });
    }

    return ok(name, metrics);
  } catch (error) {
    return failed(name, error);
  }
}
