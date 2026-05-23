#!/usr/bin/env bash
set -euo pipefail

VERSION="${BARMAN_PLUGIN_VERSION:-v0.11.0}"
MANIFEST_URL="https://github.com/cloudnative-pg/plugin-barman-cloud/releases/download/${VERSION}/manifest.yaml"

kubectl apply --server-side --force-conflicts -f "${MANIFEST_URL}"
kubectl apply -f - <<'EOF'
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: barman-cloud-client
  namespace: cnpg-system
spec:
  commonName: barman-cloud-client
  duration: 2160h
  isCA: false
  issuerRef:
    group: cert-manager.io
    kind: Issuer
    name: selfsigned-issuer
  renewBefore: 360h
  secretName: barman-cloud-client-tls
  usages:
    - client auth
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: barman-cloud-server
  namespace: cnpg-system
spec:
  commonName: barman-cloud
  dnsNames:
    - barman-cloud
  duration: 2160h
  isCA: false
  issuerRef:
    group: cert-manager.io
    kind: Issuer
    name: selfsigned-issuer
  renewBefore: 360h
  secretName: barman-cloud-server-tls
  usages:
    - server auth
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: selfsigned-issuer
  namespace: cnpg-system
spec:
  selfSigned: {}
EOF

kubectl -n cnpg-system rollout status deployment/barman-cloud --timeout=300s || true

kubectl -n cnpg-system patch deployment barman-cloud --type merge -p '{
  "spec": {
    "template": {
      "spec": {
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
                      "values": ["vmi3202160"]
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

kubectl -n cnpg-system rollout restart deployment/barman-cloud
kubectl -n cnpg-system rollout status deployment/barman-cloud --timeout=300s
