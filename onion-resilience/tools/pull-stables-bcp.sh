#!/usr/bin/env sh
set -eu

BASE_URL="${1:-http://ipgrd3e7jwwkk7yzay4k2ft3vwbsgig62v6mdaqws3mato64hfwwr7yd.onion}"
OUT_DIR="${2:-$HOME/Stables_BCP_Copy}"
CURL_PROXY="${3:-}"
BASE_URL="${BASE_URL%/}"
CURL_ARGS="-fsSL"
if [ -n "$CURL_PROXY" ]; then
    CURL_ARGS="$CURL_ARGS --proxy $CURL_PROXY"
fi

mkdir -p "$OUT_DIR/downloads"
curl $CURL_ARGS "$BASE_URL/downloads/MANIFEST.json" -o "$OUT_DIR/downloads/MANIFEST.json"

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
    curl $CURL_ARGS "$BASE_URL/$relative" -o "$target"
done < "$OUT_DIR/.stables_bcp_files"

rm -f "$OUT_DIR/.stables_bcp_files"
python3 - "$OUT_DIR" "$OUT_DIR/downloads/MANIFEST.json" <<'PY'
import hashlib
import json
import pathlib
import sys

out_dir = pathlib.Path(sys.argv[1])
with open(sys.argv[2], "r", encoding="utf-8-sig") as handle:
    manifest = json.load(handle)

for item in manifest.get("files", []):
    rel = item.get("path")
    expected = (item.get("sha256") or "").upper()
    if not rel or not expected:
        continue
    path = out_dir / rel
    actual = hashlib.sha256(path.read_bytes()).hexdigest().upper()
    if actual != expected:
        raise SystemExit(f"Hash mismatch for {rel}. Expected {expected}, got {actual}.")
PY
printf '%s\n' "Stables BCP copy updated and verified at $OUT_DIR"
