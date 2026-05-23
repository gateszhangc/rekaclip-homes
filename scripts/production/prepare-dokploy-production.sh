#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=/dev/null
source "$ROOT_DIR/scripts/staging/common.sh"

require_cmd jq
require_dokploy_api_key

APPLICATION_ID="${APPLICATION_ID:-SyxPfMjtt2opW4XCxU2Wk}"
PRODUCTION_URL="${PRODUCTION_URL:-https://www.easyclaw.pro}"
PRODUCTION_BACKEND_BASE_URL="${PRODUCTION_BACKEND_BASE_URL:-http://144.91.66.233:5001}"
DEPLOY_WAIT_SECONDS="${DEPLOY_WAIT_SECONDS:-900}"
DEPLOY_POLL_INTERVAL_SECONDS="${DEPLOY_POLL_INTERVAL_SECONDS:-5}"

classify_status() {
  local value
  value="$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')"
  if [[ "$value" =~ ^(success|successful|ready|deployed|done|complete|completed)$ ]]; then
    printf '%s\n' "success"
    return 0
  fi
  if [[ "$value" =~ ^(error|failed|failure|cancelled|canceled|killed)$ ]]; then
    printf '%s\n' "failed"
    return 0
  fi
  if [[ "$value" =~ (running|building|queued|pending|preparing|starting|deploying|processing|in_progress) ]]; then
    printf '%s\n' "pending"
    return 0
  fi
  printf '%s\n' "unknown"
}

sync_environment() {
  local tmp_env payload env_string
  tmp_env="$(mktemp)"
  PRODUCTION_URL="$PRODUCTION_URL" \
    PRODUCTION_BACKEND_BASE_URL="$PRODUCTION_BACKEND_BASE_URL" \
    "$SCRIPT_DIR/render-dokploy-env.sh" "$tmp_env"
  env_string="$(cat "$tmp_env")"
  rm -f "$tmp_env"

  payload="$(jq -cn \
    --arg applicationId "$APPLICATION_ID" \
    --arg env "$env_string" \
    '{applicationId: $applicationId, env: $env, buildArgs: null, buildSecrets: null, createEnvFile: true}')"
  dokploy_request POST /application.saveEnvironment "$payload" >/dev/null
}

trigger_deployment() {
  local payload
  payload="$(jq -cn --arg applicationId "$APPLICATION_ID" '{applicationId: $applicationId}')"
  dokploy_request POST /application.deploy "$payload" >/dev/null
}

wait_for_deployment() {
  local started_at latest_json latest_id latest_status phase latest_error
  started_at="$(date +%s)"

  while true; do
    latest_json="$(dokploy_request GET "/deployment.all?applicationId=$APPLICATION_ID" | jq -c '([.. | objects | select(.deploymentId? != null)] | sort_by(.createdAt // .created_at // "") | last) // empty')"
    latest_id="$(jq -r '.deploymentId // empty' <<<"$latest_json")"
    latest_status="$(jq -r '(.status // .state // .deploymentStatus // .result // empty) // empty' <<<"$latest_json")"
    latest_error="$(jq -r '.errorMessage // empty' <<<"$latest_json")"
    phase="$(classify_status "$latest_status")"

    if [[ "$phase" == "success" ]]; then
      printf 'deploymentId=%s\n' "$latest_id"
      printf 'deploymentStatus=%s\n' "$latest_status"
      return 0
    fi

    if [[ "$phase" == "failed" ]]; then
      fail "Dokploy deployment failed (deploymentId=${latest_id:-n/a}, status=${latest_status:-unknown}, error=${latest_error:-n/a})"
    fi

    if (( $(date +%s) - started_at >= DEPLOY_WAIT_SECONDS )); then
      fail "timed out waiting for Dokploy deployment (deploymentId=${latest_id:-n/a}, status=${latest_status:-unknown})"
    fi

    sleep "$DEPLOY_POLL_INTERVAL_SECONDS"
  done
}

sync_environment
trigger_deployment
wait_for_deployment

printf 'applicationId=%s\n' "$APPLICATION_ID"
printf 'primaryUrl=%s\n' "$PRODUCTION_URL"
