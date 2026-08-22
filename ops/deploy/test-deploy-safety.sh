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
