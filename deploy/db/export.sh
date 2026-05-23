#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node deploy/db/export.mjs
