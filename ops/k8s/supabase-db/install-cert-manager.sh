#!/usr/bin/env bash
set -euo pipefail

VERSION="${CERT_MANAGER_VERSION:-v1.19.2}"
MANIFEST_URL="https://github.com/cert-manager/cert-manager/releases/download/${VERSION}/cert-manager.yaml"

kubectl apply -f "${MANIFEST_URL}"

for deploy in cert-manager cert-manager-cainjector cert-manager-webhook; do
  kubectl -n cert-manager rollout status "deployment/${deploy}" --timeout=300s || true
done

worker_affinity() {
  local preferred_hostname="$1"
  cat <<JSON
{
  "spec": {
    "template": {
      "spec": {
        "hostNetwork": false,
        "affinity": {
          "nodeAffinity": {
            "requiredDuringSchedulingIgnoredDuringExecution": {
              "nodeSelectorTerms": [
                {
                  "matchExpressions": [
                    {
                      "key": "node-role.kubernetes.io/control-plane",
                      "operator": "DoesNotExist"
                    },
                    {
                      "key": "kubernetes.io/hostname",
                      "operator": "In",
                      "values": ["vmi3202158", "vmi3202159", "vmi3202160"]
                    }
                  ]
                }
              ]
            },
            "preferredDuringSchedulingIgnoredDuringExecution": [
              {
                "weight": 100,
                "preference": {
                  "matchExpressions": [
                    {
                      "key": "kubernetes.io/hostname",
                      "operator": "In",
                      "values": ["${preferred_hostname}"]
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    }
  }
}
JSON
}

kubectl -n cert-manager patch deployment cert-manager --type merge -p "$(worker_affinity vmi3202159)"
kubectl -n cert-manager patch deployment cert-manager-cainjector --type merge -p "$(worker_affinity vmi3202160)"
kubectl -n cert-manager patch deployment cert-manager-webhook --type merge -p "$(worker_affinity vmi3202160)"
kubectl -n cert-manager patch deployment cert-manager-webhook --type merge -p '{
  "spec": {
    "template": {
      "spec": {
        "hostNetwork": true,
        "dnsPolicy": "ClusterFirstWithHostNet"
      }
    }
  }
}'
kubectl -n cert-manager patch deployment cert-manager-webhook --type json -p='[
  {"op":"replace","path":"/spec/template/spec/containers/0/args/1","value":"--secure-port=10260"},
  {"op":"replace","path":"/spec/template/spec/containers/0/ports/0/containerPort","value":10260}
]'

for deploy in cert-manager cert-manager-cainjector cert-manager-webhook; do
  kubectl -n cert-manager rollout restart "deployment/${deploy}"
  kubectl -n cert-manager rollout status "deployment/${deploy}" --timeout=300s
done
