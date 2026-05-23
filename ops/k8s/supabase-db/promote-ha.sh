#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

kubectl apply -f "${SCRIPT_DIR}/61-cluster-ha.yaml"
kubectl -n supabase-db wait --for=condition=Ready cluster/supabase-pg --timeout=1800s
kubectl -n supabase-db get pods -o wide
