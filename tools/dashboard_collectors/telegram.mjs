import { env, failed, fetchJson, metric, ok, skipped, sourceConfig, today } from "./_shared.mjs";

const name = "telegram";

async function chatMemberCount(token, chatId) {
  const url = `https://api.telegram.org/bot${encodeURIComponent(token)}/getChatMemberCount?chat_id=${encodeURIComponent(chatId)}`;
  const data = await fetchJson(url);
  if (!data?.ok) throw new Error(data?.description || "Telegram API returned ok=false.");
  return data.result;
}

export async function collect() {
  const config = sourceConfig().telegram || {};
  const token = env("TELEGRAM_BOT_TOKEN");
  if (!token) return skipped(name, "Set TELEGRAM_BOT_TOKEN plus chat ids to collect Telegram counts.");

  const communityChat = env("TELEGRAM_COMMUNITY_CHAT_ID") || config.communityChatId || "";
  const councilChat = env("TELEGRAM_COUNCIL_CHAT_ID") || config.councilChatId || "";
  if (!communityChat && !councilChat) return skipped(name, "Set TELEGRAM_COMMUNITY_CHAT_ID or TELEGRAM_COUNCIL_CHAT_ID.");

  try {
    const measuredAt = today();
    const metrics = {};

    if (communityChat) {
      metrics.telegram_community_members = metric(await chatMemberCount(token, communityChat), {
        measuredAt,
        source: `Telegram chat ${communityChat}`,
        sourceDetail: "Telegram Bot API getChatMemberCount.",
        collector: name,
      });
    }

    if (councilChat) {
      metrics.telegram_council_members = metric(await chatMemberCount(token, councilChat), {
        measuredAt,
        source: `Telegram chat ${councilChat}`,
        sourceDetail: "Telegram Bot API getChatMemberCount.",
        collector: name,
      });
    }

    return ok(name, metrics, ["Telegram message volume still needs an exported message ledger or admin API strategy."]);
  } catch (error) {
    return failed(name, error);
  }
}
