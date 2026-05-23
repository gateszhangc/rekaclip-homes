#!/usr/bin/env bash
# Next.js dev on PORT (default 3000) with HTTP(S) proxy env for outbound API calls.
# Override: HTTP_PROXY, HTTPS_PROXY, ALL_PROXY, PORT, NODE_USE_ENV_PROXY
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export NODE_USE_ENV_PROXY="${NODE_USE_ENV_PROXY:-1}"
export HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:7890}"
export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:7890}"
export ALL_PROXY="${ALL_PROXY:-socks5://127.0.0.1:7890}"
export PORT="${PORT:-3000}"
export NODE_NO_WARNINGS=1

exec node node_modules/next/dist/bin/next dev --turbopack
