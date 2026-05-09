#!/usr/bin/env sh
set -eu

BASE_URL="${1:-https://stablescouncil.org/onion-resilience}"
OUT_DIR="${2:-$HOME/Stables_BCP_Copy}"
BASE_URL="${BASE_URL%/}"

mkdir -p "$OUT_DIR/downloads"
curl -fsSL "$BASE_URL/downloads/MANIFEST.json" -o "$OUT_DIR/downloads/MANIFEST.json"

python3 - "$OUT_DIR/downloads/MANIFEST.json" <<'PY' > "$OUT_DIR/.stables_bcp_files"
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8-sig") as handle:
    manifest = json.load(handle)

for item in manifest.get("files", []):
    path = item.get("path")
    if path:
        print(path)
PY

while IFS= read -r relative; do
    [ -n "$relative" ] || continue
    target="$OUT_DIR/$relative"
    mkdir -p "$(dirname "$target")"
    curl -fsSL "$BASE_URL/$relative" -o "$target"
done < "$OUT_DIR/.stables_bcp_files"

rm -f "$OUT_DIR/.stables_bcp_files"
printf '%s\n' "Stables BCP copy updated at $OUT_DIR"
