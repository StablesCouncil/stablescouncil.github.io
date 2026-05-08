import { ok } from "./_shared.mjs";

const name = "local-ledgers";

export async function collect() {
  return ok(name, {}, [
    "No production merchant directory ledger is wired yet. Demo merchant profiles are intentionally excluded from success metrics.",
  ]);
}
