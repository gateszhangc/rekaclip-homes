#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

usage() {
  cat <<'EOF'
Usage:
  scripts/k8s/build-and-push-images.sh <staging|production> [image-tag]

Behavior:
  - Builds an environment-specific web image because NEXT_PUBLIC_* values are
    compiled into the Next.js bundle during `next build`.
  - Builds one backend image that can be reused by both overlays.
  - Reuses the existing registry credentials from the live
    `easyclaw/dokploy-fleet-ghcr` pull secret.
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

ENVIRONMENT="${1:-}"
IMAGE_TAG="${2:-$(git -C "$ROOT_DIR" rev-parse --short HEAD)}"

if [[ -z "$ENVIRONMENT" ]]; then
  usage
  exit 1
fi

case "$ENVIRONMENT" in
  staging|production) ;;
  *)
    usage
    exit 1
    ;;
esac

require_cmd kubectl
require_cmd jq
require_cmd docker
require_cmd git

REGISTRY="${REGISTRY:-registry.144.91.77.245.sslip.io}"
# Optional: when Docker Hub is unreachable, set e.g. BASE_IMAGE=docker.m.daocloud.io/library/node:20-alpine
BASE_IMAGE="${BASE_IMAGE:-node:20-alpine}"
BACKEND_IMAGE_REPO="${BACKEND_IMAGE_REPO:-$REGISTRY/easyclaw-backend}"
WEB_IMAGE_REPO="${WEB_IMAGE_REPO:-$REGISTRY/easyclaw-web}"
WEB_ENV_FILE="${WEB_ENV_FILE:-deploy/k8s/build-env/${ENVIRONMENT}.env}"
WEB_IMAGE="${WEB_IMAGE_REPO}:${ENVIRONMENT}-${IMAGE_TAG}"
BACKEND_IMAGE="${BACKEND_IMAGE_REPO}:${IMAGE_TAG}"

TEMP_DOCKER_CONFIG="$(mktemp -d)"
cleanup() {
  rm -rf "$TEMP_DOCKER_CONFIG"
}
trap cleanup EXIT

kubectl get secret dokploy-fleet-ghcr -n easyclaw -o json \
  | jq -r '.data[".dockerconfigjson"]' \
  | base64 -d > "$TEMP_DOCKER_CONFIG/config.json"
export DOCKER_CONFIG="$TEMP_DOCKER_CONFIG"

docker build --platform linux/amd64 \
  --build-arg BASE_IMAGE="$BASE_IMAGE" \
  --build-arg BUILD_ENV_FILE="$WEB_ENV_FILE" \
  --tag "$WEB_IMAGE" \
  --file "$ROOT_DIR/Dockerfile" \
  "$ROOT_DIR"

docker build --platform linux/amd64 \
  --build-arg BASE_IMAGE="$BASE_IMAGE" \
  --tag "$BACKEND_IMAGE" \
  --file "$ROOT_DIR/backend/Dockerfile" \
  "$ROOT_DIR/backend"

docker push "$WEB_IMAGE"
docker push "$BACKEND_IMAGE"

printf 'web_image=%s\n' "$WEB_IMAGE"
printf 'backend_image=%s\n' "$BACKEND_IMAGE"
