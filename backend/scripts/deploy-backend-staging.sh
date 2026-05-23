#!/usr/bin/env bash
set -euo pipefail

SERVER="${SERVER:-root@144.91.64.239}"
SERVER_HOST="${SERVER_HOST:-${SERVER##*@}}"
REMOTE_DIR="${REMOTE_DIR:-/opt/easyclaw-backend-staging}"
WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHIVE_PATH="${ARCHIVE_PATH:-/tmp/easyclaw-backend-staging-$(date +%Y%m%d-%H%M%S).tar.gz}"

PORT="${PORT:-5000}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-f16fa862f2b766c9ffe863caf4cd7db7c3c09bedfa6b5ece99704a9e93378975}"
DATABASE_URL="${DATABASE_URL:-postgresql://easyclaw_staging_app:cee8f59fa94ee6462e5d8d785fa3147891520b5a28084be8@161.97.103.117:5432/easyclaw_staging?sslmode=no-verify}"
DB_WRITE_FREEZE="${DB_WRITE_FREEZE:-false}"
BACKEND_SERVER_HOST="${BACKEND_SERVER_HOST:-144.91.64.239}"
DOCKER_HOST="${DOCKER_HOST:-unix:///var/run/docker.sock}"
AUTH_DISABLED="${AUTH_DISABLED:-false}"
OPENCLAW_IMAGE="${OPENCLAW_IMAGE:-fourplayers/openclaw:2026.3.23-2}"
OPENCLAW_RUNTIME_PROVIDER="${OPENCLAW_RUNTIME_PROVIDER:-k8s}"
OPENCLAW_HOMEPAGE_PROVIDER_MODE="${OPENCLAW_HOMEPAGE_PROVIDER_MODE:-mixed}"
OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER="${OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER:-false}"
OPENCLAW_K8S_KUBECONFIG_B64="${OPENCLAW_K8S_KUBECONFIG_B64:-}"
OPENCLAW_K8S_KUBECONFIG="${OPENCLAW_K8S_KUBECONFIG:-}"
OPENCLAW_K8S_NAMESPACE="${OPENCLAW_K8S_NAMESPACE:-easyclaw-openclaw}"
OPENCLAW_K8S_NODE_SELECTOR_JSON="${OPENCLAW_K8S_NODE_SELECTOR_JSON:-{\"easyclaw-role\":\"openclaw-worker\"}}"
OPENCLAW_K8S_STORAGE_CLASS="${OPENCLAW_K8S_STORAGE_CLASS:-local-path}"
OPENCLAW_K8S_PVC_SIZE="${OPENCLAW_K8S_PVC_SIZE:-5Gi}"
OPENCLAW_K8S_REQUEST_CPU="${OPENCLAW_K8S_REQUEST_CPU:-500m}"
OPENCLAW_K8S_REQUEST_MEMORY="${OPENCLAW_K8S_REQUEST_MEMORY:-1Gi}"
OPENCLAW_K8S_LIMIT_CPU="${OPENCLAW_K8S_LIMIT_CPU:-2}"
OPENCLAW_K8S_LIMIT_MEMORY="${OPENCLAW_K8S_LIMIT_MEMORY:-4Gi}"
OPENCLAW_DEPLOY_MODE="${OPENCLAW_DEPLOY_MODE:-pool}"
DEFAULT_OPENCLAW_TARGET_HOST_POOL_JSON='[{"host":"144.91.74.92"},{"host":"144.91.66.233"},{"host":"144.91.70.84"},{"host":"144.91.64.239"}]'
OPENCLAW_TARGET_HOST_POOL_JSON="${OPENCLAW_TARGET_HOST_POOL_JSON:-$DEFAULT_OPENCLAW_TARGET_HOST_POOL_JSON}"
OPENCLAW_TARGET_HOST="${OPENCLAW_TARGET_HOST:-}"
OPENCLAW_TARGET_HOST_STATE_FILE="${OPENCLAW_TARGET_HOST_STATE_FILE:-/app/state/deployment-target-hosts.json}"
OPENCLAW_POOL_PREWARM_ENABLED="${OPENCLAW_POOL_PREWARM_ENABLED:-true}"
OPENCLAW_POOL_PREWARM_CONCURRENCY="${OPENCLAW_POOL_PREWARM_CONCURRENCY:-1}"
OPENCLAW_POOL_PREWARM_INTERVAL_MS="${OPENCLAW_POOL_PREWARM_INTERVAL_MS:-0}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://${SERVER_HOST}:${PORT}/health}"

if [[ "${OPENCLAW_RUNTIME_PROVIDER}" == "k8s" && -z "${OPENCLAW_K8S_KUBECONFIG_B64}" ]]; then
  if [[ -n "${OPENCLAW_K8S_KUBECONFIG}" && -f "${OPENCLAW_K8S_KUBECONFIG}" ]]; then
    OPENCLAW_K8S_KUBECONFIG_B64="$(
      base64 < "${OPENCLAW_K8S_KUBECONFIG}" | tr -d '\n'
    )"
  else
    echo "OPENCLAW_K8S_KUBECONFIG_B64 is required for k8s runtime, or OPENCLAW_K8S_KUBECONFIG must point to a readable local kubeconfig file." >&2
    exit 1
  fi
fi

echo "==> Preparing backend package from ${WORK_DIR}"
cd "${WORK_DIR}"
COPYFILE_DISABLE=1 tar czf "${ARCHIVE_PATH}" \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.DS_Store \
  --exclude=state \
  .

echo "==> Ensuring Docker is installed on ${SERVER}"
ssh "${SERVER}" "bash -s" <<'EOF'
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y docker.io docker-compose-v2
  systemctl enable --now docker
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is unavailable after installation" >&2
  exit 1
fi
EOF

echo "==> Ensuring remote directory exists: ${SERVER}:${REMOTE_DIR}"
ssh "${SERVER}" "mkdir -p '${REMOTE_DIR}/state'"
ssh "${SERVER}" "bash -s" <<'EOF'
set -euo pipefail
mkdir -p /root/.ssh
chmod 700 /root/.ssh
if [ ! -f /root/.ssh/id_ed25519 ] && [ ! -f /root/.ssh/id_rsa ]; then
  ssh-keygen -t ed25519 -N '' -f /root/.ssh/id_ed25519 >/dev/null
fi
EOF

echo "==> Uploading package"
scp "${ARCHIVE_PATH}" "${SERVER}:${REMOTE_DIR}/backend.tar.gz"

echo "==> Deploying on remote host"
ssh "${SERVER}" "bash -s" <<EOF
set -euo pipefail
cd '${REMOTE_DIR}'
find . -mindepth 1 -maxdepth 1 ! -name '.env' ! -name 'state' ! -name 'backend.tar.gz' -exec rm -rf {} +
tar xzf backend.tar.gz --no-same-owner
rm -f backend.tar.gz
mkdir -p state

cat > .env <<'ENV'
PORT=${PORT}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
DATABASE_URL=${DATABASE_URL}
DB_WRITE_FREEZE=${DB_WRITE_FREEZE}
BACKEND_SERVER_HOST=${BACKEND_SERVER_HOST}
DOCKER_HOST=${DOCKER_HOST}
AUTH_DISABLED=${AUTH_DISABLED}
OPENCLAW_IMAGE=${OPENCLAW_IMAGE}
OPENCLAW_RUNTIME_PROVIDER=${OPENCLAW_RUNTIME_PROVIDER}
OPENCLAW_HOMEPAGE_PROVIDER_MODE=${OPENCLAW_HOMEPAGE_PROVIDER_MODE}
OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER=${OPENCLAW_K8S_AUTO_UPDATE_FOR_OPENROUTER}
OPENCLAW_K8S_KUBECONFIG_B64=${OPENCLAW_K8S_KUBECONFIG_B64}
OPENCLAW_K8S_NAMESPACE=${OPENCLAW_K8S_NAMESPACE}
OPENCLAW_K8S_NODE_SELECTOR_JSON=${OPENCLAW_K8S_NODE_SELECTOR_JSON}
OPENCLAW_K8S_STORAGE_CLASS=${OPENCLAW_K8S_STORAGE_CLASS}
OPENCLAW_K8S_PVC_SIZE=${OPENCLAW_K8S_PVC_SIZE}
OPENCLAW_K8S_REQUEST_CPU=${OPENCLAW_K8S_REQUEST_CPU}
OPENCLAW_K8S_REQUEST_MEMORY=${OPENCLAW_K8S_REQUEST_MEMORY}
OPENCLAW_K8S_LIMIT_CPU=${OPENCLAW_K8S_LIMIT_CPU}
OPENCLAW_K8S_LIMIT_MEMORY=${OPENCLAW_K8S_LIMIT_MEMORY}
OPENCLAW_DEPLOY_MODE=${OPENCLAW_DEPLOY_MODE}
OPENCLAW_TARGET_HOST_POOL_JSON=${OPENCLAW_TARGET_HOST_POOL_JSON}
OPENCLAW_TARGET_HOST=${OPENCLAW_TARGET_HOST}
OPENCLAW_TARGET_HOST_STATE_FILE=${OPENCLAW_TARGET_HOST_STATE_FILE}
OPENCLAW_POOL_PREWARM_ENABLED=${OPENCLAW_POOL_PREWARM_ENABLED}
OPENCLAW_POOL_PREWARM_CONCURRENCY=${OPENCLAW_POOL_PREWARM_CONCURRENCY}
OPENCLAW_POOL_PREWARM_INTERVAL_MS=${OPENCLAW_POOL_PREWARM_INTERVAL_MS}
ENV
chmod 600 .env

export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0
COMPOSE_CMD='docker compose'

CONFLICT_IDS=\$(docker ps -q --filter "publish=${PORT}" || true)
for id in \$CONFLICT_IDS; do
  name=\$(docker inspect --format '{{.Name}}' "\$id" | sed 's#^/##')
  if [[ "\$name" != "easyclaw-backend-dev-api-1" && "\$name" != "easyclaw-backend-api-1" ]]; then
    docker rm -f "\$id" >/dev/null 2>&1 || true
  fi
done

\$COMPOSE_CMD down >/dev/null 2>&1 || true
\$COMPOSE_CMD up -d --build
\$COMPOSE_CMD ps
EOF

echo "==> Verifying health endpoint"
for i in $(seq 1 30); do
  if curl -fsSL --max-time 3 "${HEALTHCHECK_URL}" >/dev/null 2>&1; then
    curl -fsSL "${HEALTHCHECK_URL}"
    break
  fi
  echo "  waiting for health... (${i}/30)"
  sleep 2
done
echo
echo "==> Deployment finished"
