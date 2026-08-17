# IOT Management App — Safe Deployment

This directory owns production deployment and rollback mechanics.

## Principles

Deployment must never:

- run from an unpinned branch state;
- use `pm2 delete all`;
- build directly inside the live production directory;
- delete the nginx document root;
- use `npm install` for reproducible builds;
- automatically run migration down operations;
- automatically restore a pre-deploy database dump.

## Production paths

Default production artifact:

`/home/IOT-Management-App`

Canonical secret:

`/home/IOT-Management-App/backend/.env.production`

The secret must remain:

- `root:root`
- mode `0600`

It is deliberately excluded from artifact backups.

## Preflight only

Before any production mutation:

```bash
sudo ./deploy.sh \
  --expected-sha <MERGED_MAIN_SHA> \
  --preflight-only

Preflight checks:

root execution;

clean main;

exact expected SHA;

optional origin/main equality;

canonical env ownership/mode;

exact iot-api PM2 process;

PM2 production environment;

loopback backend health;

public frontend;

protected API 401;

public health endpoint.

Deployment

If no pending migrations exist:

sudo ./deploy.sh \
  --expected-sha <MERGED_MAIN_SHA>

If reviewed pending migrations are backward-compatible with the
previous application artifact:

sudo ./deploy.sh \
  --expected-sha <MERGED_MAIN_SHA> \
  --allow-artifact-rollback-after-migration

The compatibility flag is deliberately explicit.

Deployment order

Immutable git archive from the expected SHA.

Backend npm ci + build in private staging.

Frontend npm ci + build in private staging.

Migration status inspection.

Root-only pre-deploy application backup.

PostgreSQL custom-format dump + pg_restore -l verification.

Prepare the complete next production artifact.

Explicit forward migrations.

Verify no migration remains down.

Move the old artifact aside.

Move the new artifact into the canonical production path.

Replace only the iot-api PM2 process from a clean environment.

Loopback health gate.

Public 200 / 401 / 200 acceptance gate.

The old live artifact is retained beside the production directory for
fast operational recovery.

Automatic failure handling

After artifact switch, a failed startup or health gate triggers an
application-artifact rollback.

The database is never restored automatically.

This prevents silent loss of post-migration writes.

Artifact rollback

sudo ops/deploy/rollback.sh \
  --backup-dir /var/backups/iot-management-app/deploy/<backup>

Artifact rollback:

restores the application archive;

preserves the current canonical .env.production;

replaces only iot-api;

verifies health;

never modifies the database.

Database restore

Database restore is a disaster-recovery operation, not a normal
deployment rollback.

First stop the API explicitly:

sudo pm2 stop iot-api

Then:

sudo ops/deploy/restore-database.sh \
  --backup-dir /var/backups/iot-management-app/deploy/<backup> \
  --confirm RESTORE_PREDEPLOY_DATABASE

Before the destructive restore, another custom-format dump of the
current database is created and verified.

The restore utility does not restart the API.

After restoring the database, restore/start a compatible application
artifact and run the health gates.

Important database rule

Never restore the pre-deploy database merely because a new application
artifact failed health checks.

A pre-deploy dump can be older than legitimate writes that occurred
after the migration.

Database restore therefore requires an explicit maintenance decision.

## Concurrency and recovery integrity

Deployment, artifact rollback and explicit database restore share one
non-blocking mutation lock:

`/run/lock/iot-management-app-deploy.lock`

Only one production mutation workflow can run at a time.

Recovery tools also verify the SHA256 records generated before
deployment:

- artifact rollback verifies the application archive before extraction;
- database restore verifies the pre-deploy database dump before
  destructive schema work.

Database restore verifies that the backup manifest belongs to the
requested production directory.

Rollback loopback health uses `PORT` from the canonical root-owned
production environment, with 3001 only as the default.
