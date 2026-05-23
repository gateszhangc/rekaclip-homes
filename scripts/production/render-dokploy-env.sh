#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT_DIR/scripts/staging/common.sh"

OUTPUT_PATH="${1:-}"
ENV_SOURCE_PATH="${ENV_SOURCE_PATH:-$ROOT_DIR/.env.production}"
PRODUCTION_URL="${PRODUCTION_URL:-https://www.easyclaw.pro}"
PRODUCTION_BACKEND_BASE_URL="${PRODUCTION_BACKEND_BASE_URL:-http://144.91.66.233:5001}"

[[ -f "$ENV_SOURCE_PATH" ]] || fail "missing env source: $ENV_SOURCE_PATH"

WORK_FILE="$(mktemp)"
python3 - "$ENV_SOURCE_PATH" > "$WORK_FILE" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_text().splitlines()

for raw in source:
    line = raw.strip()
    if not line or line.startswith("#"):
        continue
    if "=" not in line:
        continue
    key, value = line.split("=", 1)
    key = key.strip()
    value = value.strip()
    if not key:
        continue
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]
    print(f"{key}={value}")
PY

upsert_env_line "$WORK_FILE" "NEXT_PUBLIC_WEB_URL" "$PRODUCTION_URL"
upsert_env_line "$WORK_FILE" "AUTH_URL" "$PRODUCTION_URL/api/auth"
upsert_env_line "$WORK_FILE" "NEXTAUTH_URL" "$PRODUCTION_URL/api/auth"
upsert_env_line "$WORK_FILE" "AUTH_TRUST_HOST" "true"
upsert_env_line "$WORK_FILE" "BACKEND_BASE_URL" "$PRODUCTION_BACKEND_BASE_URL"
upsert_env_line "$WORK_FILE" "NEXT_PUBLIC_API_URL" "$PRODUCTION_BACKEND_BASE_URL"

if [[ -n "$OUTPUT_PATH" ]]; then
  mkdir -p "$(dirname "$OUTPUT_PATH")"
  cp "$WORK_FILE" "$OUTPUT_PATH"
else
  cat "$WORK_FILE"
fi

rm -f "$WORK_FILE"
