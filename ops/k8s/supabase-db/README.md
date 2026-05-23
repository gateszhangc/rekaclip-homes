# Supabase Postgres on K8s

This directory contains the worker-only deployment assets for migrating the
Supabase `postgres` database into the current K8s cluster.

## Fixed constraints

- No new pod may be scheduled onto `vmi3197978`, `vmi3197979`, or `vmi3197980`.
- All database and database-ops workloads must stay on workers:
  - `vmi3202158`
  - `vmi3202159`
  - `vmi3202160`
- Source database is the Supabase `postgres` database.
- Migration scope is the full non-system schema set: `59` schemas.

## Topology

- `vmi3202158`
  - `supabase-pg-1`
  - initial primary
- `vmi3202159`
  - `supabase-pg-2`
  - synchronous standby
  - `cert-manager`
  - `cnpg-controller-manager`
- `vmi3202160`
  - `supabase-pg-3`
  - asynchronous standby
  - `cert-manager-webhook`
  - `cert-manager-cainjector`
  - `plugin-barman-cloud`

## Install order

1. Install `cert-manager`
2. Install `CloudNativePG`
3. Install `Barman Cloud Plugin`
4. Create `supabase-db` namespace
5. Create source secret
6. Apply bootstrap cluster
7. Verify imported schemas and extensions
8. Promote to 3-instance HA
9. Create object store and backups
10. Run restore test

## Source connection

Tested source endpoints:

- Direct:
  - `db.cwvfcwpbdmolwjwhrzkw.supabase.co:5432`
- Session pooler:
  - `aws-1-ap-southeast-1.pooler.supabase.com:5432`

In this cluster, worker pods resolve the direct host to IPv6-only. The bootstrap
defaults therefore use the session pooler on `5432`, not the transaction pooler.
Do not use the transaction pooler on port `6543` for import.

## Image compatibility

- `supabase/postgres:17.6.1.056` contains `postgres` as `uid=101` and `gid=102`.
- CloudNativePG defaults to `26:26`, so all cluster manifests in this directory
  explicitly set `postgresUID: 101` and `postgresGID: 102`.
- The bootstrap cluster pre-creates `supabase_admin` because CloudNativePG
  skips importing this superuser role, while Supabase role inheritance uses it
  as the grantor.
- The bootstrap cluster passes `--no-owner` and `--no-acl` to `pg_restore`.
  This avoids pre-data restore failures on Supabase-specific owner and grant
  objects while still restoring the full 59-schema database structure and data.

## Files

- `10-cert-manager-values.yaml`
  - worker-only scheduling patch values
- `20-cnpg-operator-values.yaml`
  - worker-only scheduling patch values
- `30-barman-plugin-values.yaml`
  - worker-only scheduling patch values
- `40-namespace.yaml`
  - `supabase-db` namespace
- `50-source-secret.template.yaml`
  - source DB secret template
- `51-backup-secret.template.yaml`
  - object storage secret template
- `60-cluster-bootstrap.yaml`
  - single-instance import cluster on `vmi3202158`
- `61-cluster-ha.yaml`
  - three-instance HA cluster on workers
- `70-object-store.yaml`
  - Barman object store resource
- `71-scheduled-backup.yaml`
  - scheduled physical backup
- `72-on-demand-backup.yaml`
  - first backup resource
- `80-restore-test.yaml`
  - restore validation cluster
- `90-verify.sql`
  - schema/extension verification SQL
- `install-cert-manager.sh`
- `install-cnpg.sh`
- `install-barman-plugin.sh`
- `bootstrap-import.sh`
- `promote-ha.sh`
- `apply-backup.sh`
- `run-verify.sh`
- `apply-role-memberships.sh`
- `91-role-memberships.sql`

## Required environment variables

For bootstrap import:

```bash
export SUPABASE_SOURCE_HOST=aws-1-ap-southeast-1.pooler.supabase.com
export SUPABASE_SOURCE_PORT=5432
export SUPABASE_SOURCE_DB=postgres
export SUPABASE_SOURCE_USER=postgres.cwvfcwpbdmolwjwhrzkw
export SUPABASE_SOURCE_SSLMODE=require
export SUPABASE_SOURCE_PASSWORD='...'
```

For backups:

```bash
export BACKUP_DESTINATION_PATH='s3://<bucket>/supabase-pg'
export BACKUP_ENDPOINT_URL='https://<account>.r2.cloudflarestorage.com'
export BACKUP_ACCESS_KEY_ID='...'
export BACKUP_SECRET_ACCESS_KEY='...'
```

## Commands

Install prerequisites:

```bash
cd /Users/a1-6/Desktop/code/test/test11/easyclaw-v3/ops/k8s/supabase-db
./install-cert-manager.sh
./install-cnpg.sh
./install-barman-plugin.sh
```

Bootstrap import:

```bash
cd /Users/a1-6/Desktop/code/test/test11/easyclaw-v3/ops/k8s/supabase-db
./bootstrap-import.sh
```

Promote to HA:

```bash
cd /Users/a1-6/Desktop/code/test/test11/easyclaw-v3/ops/k8s/supabase-db
./promote-ha.sh
```

Apply backups:

```bash
cd /Users/a1-6/Desktop/code/test/test11/easyclaw-v3/ops/k8s/supabase-db
./apply-backup.sh
```

Run verification:

```bash
cd /Users/a1-6/Desktop/code/test/test11/easyclaw-v3/ops/k8s/supabase-db
./run-verify.sh
```

Re-apply Supabase role memberships after import:

```bash
cd /Users/a1-6/Desktop/code/test/test11/easyclaw-v3/ops/k8s/supabase-db
./apply-role-memberships.sh
```

## Validation

- No new pod on any control-plane node:

```bash
kubectl get pods -A -o wide | rg 'vmi3197978|vmi3197979|vmi3197980'
```

- Check imported schemas:

```bash
kubectl -n supabase-db exec -it supabase-pg-1 -- psql -U postgres -d postgres -f /tmp/verify.sql
```

- Check services:

```bash
kubectl -n supabase-db get svc
```

- Check failover:

```bash
kubectl -n supabase-db delete pod supabase-pg-1
kubectl -n supabase-db get cluster supabase-pg -w
```

## Notes

- In this K3s cluster, admission webhooks on worker pod IPs time out from the
  control-plane. `cert-manager-webhook` and `cnpg-controller-manager` therefore
  run with `hostNetwork: true` while still staying on worker nodes.
- Current local R2 credentials were not verified for backup write access.
- CloudNativePG role-membership import logs permission errors on `GRANTED BY supabase_admin`.
  The role graph from source is captured in `91-role-memberships.sql` and can be
  re-applied after the cluster becomes ready.
- If object-store credentials are not writable, keep the cluster running but do
  not treat it as production-ready.
