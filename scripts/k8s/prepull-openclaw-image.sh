#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST_PATH="${ROOT_DIR}/ops/k8s/openclaw-image-prepull.yaml"
NAMESPACE="${OPENCLAW_K8S_NAMESPACE:-easyclaw-openclaw}"
DAEMONSET_NAME="${OPENCLAW_IMAGE_PREPULL_NAME:-openclaw-image-prepull}"
TIMEOUT="${OPENCLAW_IMAGE_PREPULL_TIMEOUT:-10m}"
ACTION="${1:-apply}"

show_status() {
  kubectl get daemonset "${DAEMONSET_NAME}" -n "${NAMESPACE}"
  echo
  kubectl get pods -n "${NAMESPACE}" -l "app.kubernetes.io/name=${DAEMONSET_NAME}" -o wide
}

case "${ACTION}" in
  apply)
    kubectl apply -f "${MANIFEST_PATH}"
    kubectl rollout status "daemonset/${DAEMONSET_NAME}" -n "${NAMESPACE}" --timeout="${TIMEOUT}"
    echo
    show_status
    ;;
  status)
    show_status
    ;;
  delete|cleanup)
    kubectl delete -f "${MANIFEST_PATH}"
    ;;
  *)
    echo "Usage: $0 [apply|status|delete]" >&2
    exit 1
    ;;
esac
