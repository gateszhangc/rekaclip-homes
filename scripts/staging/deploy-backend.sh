#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

export SERVER="${SERVER:-root@144.91.64.239}"
export SERVER_HOST="${SERVER_HOST:-144.91.64.239}"
export REMOTE_DIR="${REMOTE_DIR:-/opt/easyclaw-backend-staging}"
export PORT="${PORT:-5000}"
export BACKEND_SERVER_HOST="${BACKEND_SERVER_HOST:-144.91.64.239}"
export HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://144.91.64.239:${PORT}/health}"

exec "$ROOT_DIR/backend/scripts/deploy-backend-staging.sh"
