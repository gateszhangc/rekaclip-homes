#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

require_cmd jq
require_dokploy_api_key

PRODUCTION_APPLICATION_ID="${PRODUCTION_APPLICATION_ID:-SyxPfMjtt2opW4XCxU2Wk}"
STAGING_URL="${STAGING_URL:-https://staging.easyclaw.pro}"
STAGING_BACKEND_BASE_URL="${STAGING_BACKEND_BASE_URL:-http://144.91.64.239:5000}"
DEFAULT_STAGING_DATABASE_URL="${DEFAULT_STAGING_DATABASE_URL:-postgresql://easyclaw_staging_app:cee8f59fa94ee6462e5d8d785fa3147891520b5a28084be8@161.97.103.117:5432/easyclaw_staging?sslmode=require}"
OUTPUT_PATH="${1:-}"

APP_JSON="$(dokploy_request GET "/application.one?applicationId=$PRODUCTION_APPLICATION_ID")"
CURRENT_ENV="$(jq -r '.env // ""' <<<"$APP_JSON")"
[[ -n "$CURRENT_ENV" ]] || fail "production application $PRODUCTION_APPLICATION_ID has empty Dokploy env"

WORK_FILE="$(mktemp)"
printf '%s\n' "$CURRENT_ENV" > "$WORK_FILE"
STAGING_DATABASE_URL="${STAGING_DATABASE_URL:-$DEFAULT_STAGING_DATABASE_URL}"

upsert_env_line "$WORK_FILE" "NEXT_PUBLIC_WEB_URL" "$STAGING_URL"
upsert_env_line "$WORK_FILE" "AUTH_URL" "$STAGING_URL/api/auth"
upsert_env_line "$WORK_FILE" "NEXTAUTH_URL" "$STAGING_URL/api/auth"
upsert_env_line "$WORK_FILE" "AUTH_TRUST_HOST" "true"
upsert_env_line "$WORK_FILE" "BACKEND_BASE_URL" "$STAGING_BACKEND_BASE_URL"
upsert_env_line "$WORK_FILE" "NEXT_PUBLIC_API_URL" "$STAGING_BACKEND_BASE_URL"
upsert_env_line "$WORK_FILE" "DATABASE_URL" "$STAGING_DATABASE_URL"

if [[ -n "$OUTPUT_PATH" ]]; then
  mkdir -p "$(dirname "$OUTPUT_PATH")"
  cp "$WORK_FILE" "$OUTPUT_PATH"
else
  cat "$WORK_FILE"
fi

rm -f "$WORK_FILE"
