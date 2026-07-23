#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

ROOT="$(
  cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." &&
  pwd -P
)"

WRAPPER="$ROOT/deploy.sh"
DEPLOY="$ROOT/ops/deploy/deploy.sh"
ROLLBACK="$ROOT/ops/deploy/rollback.sh"
RESTORE="$ROOT/ops/deploy/restore-database.sh"

for file in \
  "$WRAPPER" \
  "$DEPLOY" \
  "$ROLLBACK" \
  "$RESTORE"
do
  bash -n "$file"
done

if grep -nE \
  '\$\{[[:space:]]*$' \
  "$DEPLOY" \
  "$ROLLBACK" \
  "$RESTORE"
then
  echo 'HATA: Runtime bad-substitution riski taşıyan multiline parameter expansion bulundu.'
  exit 1
fi

"$DEPLOY" \
  --help \
  >/dev/null

"$ROLLBACK" \
  --help \
  >/dev/null

"$RESTORE" \
  --help \
  >/dev/null

grep -qF -- \
  '--expected-sha' \
  "$DEPLOY"

grep -qF \
  'git_source' \
  "$DEPLOY"

grep -qF \
  'archive' \
  "$DEPLOY"

grep -qF \
  'npm ci' \
  "$DEPLOY"

grep -qF \
  'pg_dump' \
  "$DEPLOY"

grep -qF \
  'pg_restore' \
  "$DEPLOY"

grep -qF \
  'db:migrate' \
  "$DEPLOY"

grep -qF -- \
  '--allow-artifact-rollback-after-migration' \
  "$DEPLOY"

grep -qF \
  'application-pre-deploy.tar.gz' \
  "$DEPLOY"

grep -qF \
  'database-pre-deploy.dump' \
  "$DEPLOY"

grep -qF \
  'backend/.env.production' \
  "$DEPLOY"

grep -qF \
  'DATABASE AUTOMATIC RESTORE=YOK' \
  "$DEPLOY"

grep -qF \
  'env -i' \
  "$DEPLOY"

grep -qF \
  'PM2_SECRET_DUPLICATION=YOK' \
  "$DEPLOY"

grep -qF \
  'DATABASE_MUTATION=YOK' \
  "$ROLLBACK"

grep -qF \
  'RESTORE_PREDEPLOY_DATABASE' \
  "$RESTORE"

grep -qF \
  'database-pre-restore-current-' \
  "$RESTORE"

grep -qF \
  'DROP SCHEMA public CASCADE' \
  "$RESTORE"

if grep -E \
  'pm2[[:space:]]+delete[[:space:]]+all' \
  "$WRAPPER" \
  "$DEPLOY" \
  "$ROLLBACK" \
  "$RESTORE"
then
  echo 'HATA: pm2 delete all yasak.'
  exit 1
fi

if grep -E \
  'rm[[:space:]]+-rf[[:space:]]+/var/www/html' \
  "$WRAPPER" \
  "$DEPLOY" \
  "$ROLLBACK" \
  "$RESTORE"
then
  echo 'HATA: Direct nginx-root destructive delete yasak.'
  exit 1
fi

if grep -E \
  '(^|[[:space:]])npm[[:space:]]+install([[:space:]]|$)' \
  "$DEPLOY"
then
  echo 'HATA: Deployment npm install kullanmamalı.'
  exit 1
fi

if grep -F \
  'db:migrate:undo' \
  "$DEPLOY" \
  "$ROLLBACK"
then
  echo 'HATA: Runtime rollback migration undo kullanmamalı.'
  exit 1
fi

if grep -E \
  'set[[:space:]]+-x|echo.*DB_PASS|echo.*JWT_SECRET' \
  "$DEPLOY" \
  "$ROLLBACK" \
  "$RESTORE"
then
  echo 'HATA: Secret logging riski.'
  exit 1
fi

#
# Deploy, artifact rollback and database restore must serialize
# production mutations through one shared lock.
#
for runtime in "$DEPLOY" "$ROLLBACK" "$RESTORE"; do
  grep -qF \
    'LOCK_FILE="/run/lock/iot-management-app-deploy.lock"' \
    "$runtime"

  grep -qF \
    'flock -n 9' \
    "$runtime"
done

grep -qF \
  'APPLICATION_BACKUP_SHA256=VERIFIED' \
  "$ROLLBACK"

grep -qF \
  'SHA256SUMS' \
  "$ROLLBACK"

grep -qF \
  'IOT_API_PORT' \
  "$ROLLBACK"

grep -qF \
  'DATABASE_BACKUP_SHA256=VERIFIED' \
  "$RESTORE"

grep -qF \
  'SHA256SUMS' \
  "$RESTORE"

grep -qF \
  'MANIFEST_PROD' \
  "$RESTORE"

grep -qF \
  'Database backup başka production path' \
  "$RESTORE"

#
# Root deployment reads Git metadata without optional index writes.
#
grep -qF \
  'GIT_OPTIONAL_LOCKS=0' \
  "$DEPLOY"

#
# Legacy process compatibility is narrow:
# unset or production only.
#
grep -qF \
  'CURRENT_PM2_NODE_ENV=LEGACY_UNSET_ACCEPTED' \
  "$DEPLOY"

grep -qF \
  'CURRENT_PM2_NODE_ENV=PRODUCTION' \
  "$DEPLOY"

grep -qF \
  'PM2 NODE_ENV açıkça production dışında' \
  "$DEPLOY"

#
# Canonical production env may be unset during transition,
# but may never explicitly declare a non-production environment.
#
grep -qF \
  'IOT_CANON_NODE_ENV="${NODE_ENV:-}"' \
  "$DEPLOY"

grep -qF \
  'CANONICAL_ENV_NODE_ENV=UNSET_ACCEPTED' \
  "$DEPLOY"

grep -qF \
  'CANONICAL_ENV_NODE_ENV=PRODUCTION' \
  "$DEPLOY"

grep -qF \
  'Canonical .env.production NODE_ENV production dışında' \
  "$DEPLOY"

#
# Newly created PM2 process has a strict invariant.
#
grep -qF \
  'process_node_env' \
  "$DEPLOY"

grep -qF \
  '[ "$process_node_env" = "production" ]' \
  "$DEPLOY"

grep -qF \
  'POST_DEPLOY_PM2_NODE_ENV=PRODUCTION' \
  "$DEPLOY"

#
# The PM2 NODE_ENV jq command must continue onto its filter line.
# bash -n does not detect a missing continuation here.
#
grep -qF -- \
  '    jq -r --arg app "$PM2_APP" \' \
  "$DEPLOY"

# Verify the jq expression itself returns the expected value.
printf '%s\n' \
  '[{"name":"iot-api","pm2_env":{"NODE_ENV":"production"}}]' |
jq -r --arg app "iot-api" \
  '.[] | select(.name == $app) | (.pm2_env.NODE_ENV // "")' |
grep -qx 'production'

#
# Frontend artifacts served directly by Nginx must remain
# traversable/readable even when the root deployment runs
# under a restrictive umask.
#
grep -qF \
  '"$NEW_PROD/frontend/build"' \
  "$DEPLOY"

grep -qF \
  '-exec chmod 0755 {} +' \
  "$DEPLOY"

grep -qF \
  '-exec chmod 0644 {} +' \
  "$DEPLOY"

SAFETY_LINE="$(
  grep -n \
    'database-pre-restore-current-' \
    "$RESTORE" |
  head -n1 |
  cut -d: -f1
)"

DROP_LINE="$(
  grep -n \
    'DROP SCHEMA public CASCADE' \
    "$RESTORE" |
  head -n1 |
  cut -d: -f1
)"

[ -n "$SAFETY_LINE" ]
[ -n "$DROP_LINE" ]

[ "$SAFETY_LINE" -lt "$DROP_LINE" ] || {
  echo 'HATA: Current DB safety dump destructive restore öncesinde değil.'
  exit 1
}

echo 'DEPLOY_SAFETY_CONTRACT=GEÇTİ'
