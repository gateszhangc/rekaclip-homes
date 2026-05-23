#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PRIMARY_POD="${PRIMARY_POD:-supabase-pg-1}"

kubectl -n supabase-db exec -i "${PRIMARY_POD}" -- psql -U postgres -d postgres -f - < "${SCRIPT_DIR}/91-role-memberships.sql"
