#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

: "${BACKUP_DESTINATION_PATH:?BACKUP_DESTINATION_PATH is required}"
: "${BACKUP_ENDPOINT_URL:?BACKUP_ENDPOINT_URL is required}"
: "${BACKUP_ACCESS_KEY_ID:?BACKUP_ACCESS_KEY_ID is required}"
: "${BACKUP_SECRET_ACCESS_KEY:?BACKUP_SECRET_ACCESS_KEY is required}"

envsubst < "${SCRIPT_DIR}/51-backup-secret.template.yaml" | kubectl apply -f -
envsubst < "${SCRIPT_DIR}/70-object-store.yaml" | kubectl apply -f -
kubectl patch -n supabase-db cluster supabase-pg --type merge -p '{
  "spec": {
    "plugins": [
      {
        "name": "barman-cloud.cloudnative-pg.io",
        "isWALArchiver": true,
        "parameters": {
          "barmanObjectName": "supabase-pg-backup"
        }
      }
    ]
  }
}'
kubectl apply -f "${SCRIPT_DIR}/71-scheduled-backup.yaml"
kubectl apply -f "${SCRIPT_DIR}/72-on-demand-backup.yaml"
