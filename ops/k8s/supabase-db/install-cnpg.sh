#!/usr/bin/env bash
set -euo pipefail

VERSION="${CNPG_VERSION:-1.28.1}"
MANIFEST_URL="https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.28/releases/cnpg-${VERSION}.yaml"

kubectl apply --server-side --force-conflicts -f "${MANIFEST_URL}"
kubectl -n cnpg-system rollout status deployment/cnpg-controller-manager --timeout=300s || true

kubectl -n cnpg-system patch deployment cnpg-controller-manager --type merge -p '{
  "spec": {
    "template": {
      "spec": {
        "hostNetwork": true,
        "dnsPolicy": "ClusterFirstWithHostNet",
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
                      "values": ["vmi3202159"]
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
}'

kubectl -n cnpg-system rollout restart deployment/cnpg-controller-manager
kubectl -n cnpg-system rollout status deployment/cnpg-controller-manager --timeout=300s
