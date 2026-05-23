#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=/dev/null
source "$SCRIPT_DIR/common.sh"

require_cmd jq
require_dokploy_api_key

PROJECT_ID="${PROJECT_ID:-EVRfCAcd8f8R36NXa8sfs}"
ENVIRONMENT_ID="${ENVIRONMENT_ID:-ZPhe7PgbpZfKM9_ZLi9S5}"
PRODUCTION_APPLICATION_ID="${PRODUCTION_APPLICATION_ID:-SyxPfMjtt2opW4XCxU2Wk}"
APPLICATION_NAME="${APPLICATION_NAME:-easyclaw-staging}"
APP_NAME="${APP_NAME:-$(slugify "$APPLICATION_NAME")}"
PRIMARY_URL="${PRIMARY_URL:-https://staging.easyclaw.pro}"
PRIMARY_DOMAIN="${PRIMARY_DOMAIN:-staging.easyclaw.pro}"
STAGING_BACKEND_BASE_URL="${STAGING_BACKEND_BASE_URL:-http://144.91.64.239:5000}"
GIT_BRANCH="${GIT_BRANCH:-staging}"
AUTO_DEPLOY="${AUTO_DEPLOY:-true}"
ENABLE_SUBMODULES="${ENABLE_SUBMODULES:-false}"
SERVER_ID="${SERVER_ID:-rT6gVJZTVJ6uCqXEpXWS5}"
BUILD_SERVER_ID="${BUILD_SERVER_ID:-rT6gVJZTVJ6uCqXEpXWS5}"
PUBLISHED_PORT="${PUBLISHED_PORT:-13051}"
TARGET_PORT="${TARGET_PORT:-3000}"
DOCKERFILE_PATH="${DOCKERFILE_PATH:-Dockerfile}"
DOCKER_CONTEXT_PATH="${DOCKER_CONTEXT_PATH:-.}"
DOCKER_BUILD_STAGE="${DOCKER_BUILD_STAGE:-}"
GIT_BUILD_PATH="${GIT_BUILD_PATH:-.}"
DEPLOY_WAIT_SECONDS="${DEPLOY_WAIT_SECONDS:-900}"
DEPLOY_POLL_INTERVAL_SECONDS="${DEPLOY_POLL_INTERVAL_SECONDS:-5}"

find_application_id() {
  local project_json="$1"
  local app_name="$2"
  jq -r --arg name "$app_name" '
    first([.environments[]?.applications[]? | select(.name == $name) | .applicationId][]) // empty
  ' <<<"$project_json"
}

read_production_git_url() {
  local app_json
  app_json="$(dokploy_request GET "/application.one?applicationId=$PRODUCTION_APPLICATION_ID")"
  jq -r '.customGitUrl // empty' <<<"$app_json"
}

create_application() {
  local payload
  payload="$(jq -cn \
    --arg name "$APPLICATION_NAME" \
    --arg appName "$APP_NAME" \
    --arg environmentId "$ENVIRONMENT_ID" \
    --arg serverId "$SERVER_ID" \
    '{name: $name, appName: $appName, environmentId: $environmentId, serverId: $serverId}')"
  dokploy_request POST /application.create "$payload" >/dev/null
}

configure_build() {
  local application_id="$1"
  local payload
  payload="$(jq -cn \
    --arg applicationId "$application_id" \
    --arg buildType "dockerfile" \
    --arg dockerfile "$DOCKERFILE_PATH" \
    --arg dockerContextPath "$DOCKER_CONTEXT_PATH" \
    --arg dockerBuildStage "$DOCKER_BUILD_STAGE" \
    '{
      applicationId: $applicationId,
      buildType: $buildType,
      dockerfile: $dockerfile,
      dockerContextPath: $dockerContextPath,
      dockerBuildStage: $dockerBuildStage,
      herokuVersion: null,
      railpackVersion: null
    }')"
  dokploy_request POST /application.saveBuildType "$payload" >/dev/null
}

configure_git() {
  local application_id="$1"
  local git_url="$2"
  local enable_submodules
  enable_submodules="$(bool_json "$ENABLE_SUBMODULES")"
  local payload
  payload="$(jq -cn \
    --arg applicationId "$application_id" \
    --arg customGitUrl "$git_url" \
    --arg customGitBranch "$GIT_BRANCH" \
    --arg customGitBuildPath "$GIT_BUILD_PATH" \
    --argjson enableSubmodules "$enable_submodules" \
    '{
      applicationId: $applicationId,
      customGitUrl: $customGitUrl,
      customGitBranch: $customGitBranch,
      customGitBuildPath: $customGitBuildPath,
      watchPaths: [],
      enableSubmodules: $enableSubmodules
    }')"
  dokploy_request POST /application.saveGitProvider "$payload" >/dev/null
}

configure_auto_deploy() {
  local application_id="$1"
  local auto_deploy
  auto_deploy="$(bool_json "$AUTO_DEPLOY")"
  local payload
  payload="$(jq -cn \
    --arg applicationId "$application_id" \
    --arg buildServerId "$BUILD_SERVER_ID" \
    --arg sourceType "git" \
    --argjson autoDeploy "$auto_deploy" \
    '{
      applicationId: $applicationId,
      sourceType: $sourceType,
      autoDeploy: $autoDeploy,
      buildServerId: $buildServerId
    }')"
  dokploy_request POST /application.update "$payload" >/dev/null
}

configure_port() {
  local application_id="$1"
  local app_json existing_port_id payload
  app_json="$(dokploy_request GET "/application.one?applicationId=$application_id")"
  existing_port_id="$(jq -r 'first([.ports[]?.portId][]) // empty' <<<"$app_json")"

  if [[ -n "$existing_port_id" ]]; then
    payload="$(jq -cn \
      --arg portId "$existing_port_id" \
      --argjson publishedPort "$PUBLISHED_PORT" \
      --argjson targetPort "$TARGET_PORT" \
      --arg publishMode "ingress" \
      --arg protocol "tcp" \
      '{portId: $portId, publishedPort: $publishedPort, targetPort: $targetPort, publishMode: $publishMode, protocol: $protocol}')"
    dokploy_request POST /port.update "$payload" >/dev/null
  else
    payload="$(jq -cn \
      --arg applicationId "$application_id" \
      --argjson publishedPort "$PUBLISHED_PORT" \
      --argjson targetPort "$TARGET_PORT" \
      --arg publishMode "ingress" \
      --arg protocol "tcp" \
      '{applicationId: $applicationId, publishedPort: $publishedPort, targetPort: $targetPort, publishMode: $publishMode, protocol: $protocol}')"
    dokploy_request POST /port.create "$payload" >/dev/null
  fi
}

ensure_domain() {
  local application_id="$1"
  local host="$2"
  local app_json domain_id payload

  app_json="$(dokploy_request GET "/application.one?applicationId=$application_id")"
  domain_id="$(jq -r --arg host "$host" 'first([.domains[]? | select(.host == $host) | .domainId][]) // empty' <<<"$app_json")"
  if [[ -n "$domain_id" ]]; then
    return 0
  fi

  payload="$(jq -cn \
    --arg host "$host" \
    --arg applicationId "$application_id" \
    --arg certificateType "letsencrypt" \
    '{host: $host, applicationId: $applicationId, https: true, certificateType: $certificateType, domainType: "application"}')"
  dokploy_request POST /domain.create "$payload" >/dev/null
}

sync_environment() {
  local application_id="$1"
  local tmp_env payload env_string
  tmp_env="$(mktemp)"
  DOKPLOY_API_KEY="$DOKPLOY_API_KEY" \
    PRODUCTION_APPLICATION_ID="$PRODUCTION_APPLICATION_ID" \
    STAGING_URL="$PRIMARY_URL" \
    STAGING_BACKEND_BASE_URL="$STAGING_BACKEND_BASE_URL" \
    "$SCRIPT_DIR/render-dokploy-env.sh" "$tmp_env"
  env_string="$(cat "$tmp_env")"
  rm -f "$tmp_env"

  payload="$(jq -cn \
    --arg applicationId "$application_id" \
    --arg env "$env_string" \
    '{applicationId: $applicationId, env: $env, buildArgs: null, buildSecrets: null, createEnvFile: true}')"
  dokploy_request POST /application.saveEnvironment "$payload" >/dev/null
}

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

trigger_deployment() {
  local application_id="$1"
  local payload
  payload="$(jq -cn --arg applicationId "$application_id" '{applicationId: $applicationId}')"
  dokploy_request POST /application.deploy "$payload" >/dev/null
}

wait_for_deployment() {
  local application_id="$1"
  local started_at latest_json latest_id latest_status phase latest_error
  started_at="$(date +%s)"

  while true; do
    latest_json="$(dokploy_request GET "/deployment.all?applicationId=$application_id" | jq -c '([.. | objects | select(.deploymentId? != null)] | sort_by(.createdAt // .created_at // "") | last) // empty')"
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

PROJECT_JSON="$(dokploy_request GET "/project.one?projectId=$PROJECT_ID")"
APPLICATION_ID="$(find_application_id "$PROJECT_JSON" "$APPLICATION_NAME")"

if [[ -z "$APPLICATION_ID" ]]; then
  create_application
  PROJECT_JSON="$(dokploy_request GET "/project.one?projectId=$PROJECT_ID")"
  APPLICATION_ID="$(find_application_id "$PROJECT_JSON" "$APPLICATION_NAME")"
fi

[[ -n "$APPLICATION_ID" ]] || fail "unable to resolve Dokploy applicationId for $APPLICATION_NAME"

GIT_URL="${DOKPLOY_GIT_URL:-$(read_production_git_url)}"
[[ -n "$GIT_URL" ]] || fail "unable to resolve git url for Dokploy staging application"

configure_build "$APPLICATION_ID"
configure_git "$APPLICATION_ID" "$GIT_URL"
configure_auto_deploy "$APPLICATION_ID"
configure_port "$APPLICATION_ID"
ensure_domain "$APPLICATION_ID" "$PRIMARY_DOMAIN"
sync_environment "$APPLICATION_ID"
trigger_deployment "$APPLICATION_ID"
wait_for_deployment "$APPLICATION_ID"

printf 'applicationId=%s\n' "$APPLICATION_ID"
printf 'primaryUrl=%s\n' "$PRIMARY_URL"
