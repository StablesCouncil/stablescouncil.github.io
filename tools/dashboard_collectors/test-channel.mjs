import { failed, fetchJson, metric, ok, sourceConfig } from "./_shared.mjs";

/* The Test Channel collector on the VPS (web agent, GET /test-dashboard) reads the Minima archive
 * and publishes the snapshot behind test-dashboard.html. Its `outcomes` block is shaped for the
 * three Test Channel metrics of the Council dashboard, so this collector only maps them across.
 * Addresses are not people; the metric notes say so. */
const name = "test-channel";

export async function collect() {
  const config = sourceConfig().testChannel || {};
  const url = config.collectorUrl || "https://agent.stablescouncil.org/test-dashboard";
  try {
    const data = await fetchJson(url);
    if (!data || !data.generated) throw new Error("collector returned no snapshot");
    const measuredAt = String(data.generated).slice(0, 10);
    const o = data.outcomes || {};
    const detail = (what) => ({
      measuredAt,
      source: url,
      sourceDetail: `${what}, read from the Minima archive by the Test Channel collector (archive ${data.archive_behind != null ? data.archive_behind + " blocks behind the tip" : "lag unknown"}). Winiwa and xWiniwa are valueless test tokens.`,
      collector: name,
      quality: "live-api",
    });
    const metrics = {
      test_channel_successful_actions_7d: metric(o.successful_actions_7d ?? null, detail("Faucet claims, mints and burns in the last seven days")),
      test_channel_active_recipient_addresses_7d: metric(o.active_recipient_addresses_7d ?? null, detail("Distinct non-custody addresses that received Winiwa or xWiniwa in the last seven days")),
      test_channel_holder_addresses: metric(o.holder_addresses ?? null, detail("Distinct non-custody addresses holding Winiwa or xWiniwa")),
    };
    return ok(name, metrics, [
      `Snapshot ${data.generated}: ${data.faucet_claims} faucet claims, ${data.breakdown?.mint_xwiniwa} mints, ${data.breakdown?.burn_xwiniwa} burns in total; USDw is not part of this test.`,
    ]);
  } catch (error) {
    return failed(name, error);
  }
}
