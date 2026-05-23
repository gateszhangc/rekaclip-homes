#!/usr/bin/env bash
set -euo pipefail

SERVER="${SERVER:-root@109.123.245.185}"
SERVER_HOST="${SERVER_HOST:-${SERVER##*@}}"
REMOTE_DIR="${REMOTE_DIR:-/opt/easyclaw-backend}"
WORK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCHIVE_PATH="${ARCHIVE_PATH:-/tmp/easyclaw-backend-$(date +%Y%m%d-%H%M%S).tar.gz}"

PORT="${PORT:-5000}"
ENCRYPTION_KEY="${ENCRYPTION_KEY:-f16fa862f2b766c9ffe863caf4cd7db7c3c09bedfa6b5ece99704a9e93378975}"
DATABASE_URL="${DATABASE_URL:-postgresql://postgres.cwvfcwpbdmolwjwhrzkw:IT4QqJEN1Me1aoAd@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres}"
BACKEND_SERVER_HOST="${BACKEND_SERVER_HOST:-109.123.245.185}"
DOCKER_HOST="${DOCKER_HOST:-unix:///var/run/docker.sock}"
AUTH_DISABLED="${AUTH_DISABLED:-false}"
OPENCLAW_IMAGE="${OPENCLAW_IMAGE:-fourplayers/openclaw:2026.3.23-2}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://${SERVER_HOST}:${PORT}/health}"

echo "==> Preparing backend package from ${WORK_DIR}"
cd "${WORK_DIR}"
COPYFILE_DISABLE=1 tar czf "${ARCHIVE_PATH}" \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.DS_Store \
  .

echo "==> Ensuring remote directory exists: ${SERVER}:${REMOTE_DIR}"
ssh "${SERVER}" "mkdir -p '${REMOTE_DIR}'"

echo "==> Uploading package"
scp "${ARCHIVE_PATH}" "${SERVER}:${REMOTE_DIR}/backend.tar.gz"

echo "==> Deploying on remote host"
ssh "${SERVER}" "bash -s" <<EOF
set -euo pipefail
cd '${REMOTE_DIR}'
find . -mindepth 1 -maxdepth 1 ! -name '.env' ! -name 'backend.tar.gz' -exec rm -rf {} +
tar xzf backend.tar.gz --no-same-owner
rm -f backend.tar.gz

cat > .env <<'ENV'
PORT=${PORT}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
DATABASE_URL=${DATABASE_URL}
BACKEND_SERVER_HOST=${BACKEND_SERVER_HOST}
DOCKER_HOST=${DOCKER_HOST}
AUTH_DISABLED=${AUTH_DISABLED}
OPENCLAW_IMAGE=${OPENCLAW_IMAGE}
ENV
chmod 600 .env

export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD='docker compose'
else
  COMPOSE_CMD='docker-compose'
fi

CONFLICT_IDS=\$(docker ps -q --filter "publish=${PORT}" || true)
for id in \$CONFLICT_IDS; do
  name=\$(docker inspect --format '{{.Name}}' "\$id" | sed 's#^/##')
  if [[ "\$name" != "easyclaw-backend-api-1" ]]; then
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
