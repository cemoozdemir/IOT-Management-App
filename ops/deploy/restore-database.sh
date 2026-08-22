#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C
umask 077

PROD_DIR="${IOT_PROD_DIR:-/home/IOT-Management-App}"

PM2_APP="${IOT_PM2_APP:-iot-api}"

BACKUP_DIR=""

CONFIRM=""

REQUIRED_CONFIRMATION="RESTORE_PREDEPLOY_DATABASE"

usage() {
  cat <<USAGE
Usage:

  sudo ops/deploy/restore-database.sh \\
    --backup-dir <pre-deploy-backup-directory> \\
    --confirm $REQUIRED_CONFIRMATION

Requirements:

  - iot-api MUST already be stopped.
  - A fresh safety dump is made before destructive restore.
  - The public schema is replaced from the pre-deploy dump.
  - The application is NOT restarted automatically.

This operation may discard post-deployment database writes.
USAGE
}

fail() {
  echo "HATA: $*" >&2
  exit 1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --backup-dir)
      BACKUP_DIR="$2"
      shift 2
      ;;

    --production-dir)
      PROD_DIR="$2"
      shift 2
      ;;

    --pm2-app)
      PM2_APP="$2"
      shift 2
      ;;

    --confirm)
      CONFIRM="$2"
      shift 2
      ;;

    -h|--help)
      usage
      exit 0
      ;;

    *)
      fail "Bilinmeyen argüman: $1"
      ;;
  esac
done

[ "$(id -u)" -eq 0 ] || {
  fail "Database restore root olarak çalıştırılmalı."
}

[ -n "$BACKUP_DIR" ] || {
  fail "--backup-dir zorunlu."
}

[ "$CONFIRM" = "$REQUIRED_CONFIRMATION" ] || {
  fail "Explicit database restore confirmation eksik."
}

PROD_DIR="$(
  readlink -m -- "$PROD_DIR"
)"

BACKUP_DIR="$(
  readlink -m -- "$BACKUP_DIR"
)"

ENV_FILE="$PROD_DIR/backend/.env.production"

DB_DUMP="$BACKUP_DIR/database-pre-deploy.dump"

MANIFEST="$BACKUP_DIR/manifest.txt"

[ -f "$ENV_FILE" ] || fail "Canonical production env yok"
[ -f "$DB_DUMP" ] || fail "Pre-deploy DB dump yok"
[ -f "$MANIFEST" ] || fail "Backup manifest yok"

[ "$(
  stat -c '%U:%G' "$ENV_FILE"
)" = "root:root" ] || fail "env owner hatalı"

[ "$(
  stat -c '%a' "$ENV_FILE"
)" = "600" ] || fail "env mode hatalı"

PM2_JSON="$(
  pm2 jlist
)"

APP_COUNT="$(
  printf '%s' "$PM2_JSON" |
  jq \
    --arg app "$PM2_APP" \
    '[.[] | select(.name == $app)] | length'
)"

[ "$APP_COUNT" = "1" ] || {
  fail "PM2 process bulunamadı."
}

APP_STATUS="$(
  printf '%s' "$PM2_JSON" |
  jq -r \
    --arg app "$PM2_APP" \
    '.[] |
     select(.name == $app) |
     .pm2_env.status'
)"

echo "PM2_STATUS=$APP_STATUS"

[ "$APP_STATUS" = "stopped" ] || {
  fail "Database restore öncesi iot-api açıkça STOPPED olmalı."
}

set +u
# shellcheck disable=SC1090
. "$ENV_FILE"

IOT_DB_USER="${DB_USER:-}"
IOT_DB_PASS="${DB_PASS:-}"
IOT_DB_NAME="${DB_NAME:-}"
IOT_DB_HOST="${DB_HOST:-}"
IOT_DB_PORT="${DB_PORT:-5432}"

unset \
  DB_USER \
  DB_PASS \
  DB_NAME \
  DB_HOST \
  DB_PORT \
  JWT_SECRET

set -u

[ -n "$IOT_DB_USER" ] || fail "DB_USER eksik"
[ -n "$IOT_DB_PASS" ] || fail "DB_PASS eksik"
[ -n "$IOT_DB_NAME" ] || fail "DB_NAME eksik"
[ -n "$IOT_DB_HOST" ] || fail "DB_HOST eksik"

pg_restore \
  -l \
  "$DB_DUMP" \
  > /dev/null

STAMP="$(
  date -u +%Y%m%dT%H%M%SZ
)"

SAFETY_DUMP="$BACKUP_DIR/database-pre-restore-current-${STAMP}.dump"

echo '===== SAFETY DUMP OF CURRENT DATABASE ====='

PGPASSWORD="$IOT_DB_PASS" \
pg_dump \
  --host="$IOT_DB_HOST" \
  --port="$IOT_DB_PORT" \
  --username="$IOT_DB_USER" \
  --dbname="$IOT_DB_NAME" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$SAFETY_DUMP"

chmod \
  0600 \
  "$SAFETY_DUMP"

pg_restore \
  -l \
  "$SAFETY_DUMP" \
  > "$SAFETY_DUMP.contents"

[ -s "$SAFETY_DUMP.contents" ] || {
  fail "Safety dump verification başarısız."
}

echo "SAFETY_DUMP=$SAFETY_DUMP"
echo 'SAFETY_DUMP=VERIFIED'

echo '===== DESTRUCTIVE SCHEMA RESTORE ====='

PGPASSWORD="$IOT_DB_PASS" \
psql \
  --host="$IOT_DB_HOST" \
  --port="$IOT_DB_PORT" \
  --username="$IOT_DB_USER" \
  --dbname="$IOT_DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -c \
  'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'

PGPASSWORD="$IOT_DB_PASS" \
pg_restore \
  --host="$IOT_DB_HOST" \
  --port="$IOT_DB_PORT" \
  --username="$IOT_DB_USER" \
  --dbname="$IOT_DB_NAME" \
  --exit-on-error \
  --no-owner \
  --no-privileges \
  "$DB_DUMP"

PGPASSWORD="$IOT_DB_PASS" \
psql \
  --host="$IOT_DB_HOST" \
  --port="$IOT_DB_PORT" \
  --username="$IOT_DB_USER" \
  --dbname="$IOT_DB_NAME" \
  -Atqc \
  'SELECT 1;' \
  | grep -qx '1'

cat >> "$MANIFEST" <<EOF_MANIFEST
database_restore_utc=$STAMP
database_restore_success=true
database_restore_source=$DB_DUMP
database_pre_restore_safety_dump=$SAFETY_DUMP
application_restart_after_restore=false
EOF_MANIFEST

echo
echo 'DATABASE_RESTORE=SUCCESS'
echo 'APPLICATION_RESTART=YOK'
echo
echo 'Next action: restore/start the compatible application artifact.'
