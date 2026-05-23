#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

: "${SUPABASE_SOURCE_HOST:=aws-1-ap-southeast-1.pooler.supabase.com}"
: "${SUPABASE_SOURCE_PORT:=5432}"
: "${SUPABASE_SOURCE_DB:=postgres}"
: "${SUPABASE_SOURCE_USER:=postgres.cwvfcwpbdmolwjwhrzkw}"
: "${SUPABASE_SOURCE_SSLMODE:=require}"
: "${SUPABASE_SOURCE_PASSWORD:?SUPABASE_SOURCE_PASSWORD is required}"

kubectl apply -f "${SCRIPT_DIR}/40-namespace.yaml"

envsubst < "${SCRIPT_DIR}/50-source-secret.template.yaml" | kubectl apply -f -
kubectl apply -f "${SCRIPT_DIR}/60-cluster-bootstrap.yaml"

kubectl -n supabase-db wait --for=condition=Ready cluster/supabase-pg --timeout=1800s
kubectl -n supabase-db get pods -o wide
