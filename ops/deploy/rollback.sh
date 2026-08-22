#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C
umask 077

PROD_DIR="${IOT_PROD_DIR:-/home/IOT-Management-App}"

PUBLIC_BASE="${IOT_PUBLIC_BASE:-https://iot.ozdmr.dev}"

PM2_APP="${IOT_PM2_APP:-iot-api}"

BACKUP_DIR=""

usage() {
  cat <<'USAGE'
Usage:
  sudo ops/deploy/rollback.sh \
    --backup-dir <pre-deploy-backup-directory> \
    [--production-dir <path>] \
    [--public-base <url>] \
    [--pm2-app <name>]

This command restores only the previous application artifact.

It NEVER restores or rolls back the database.
USAGE
}

fail() {
  echo "HATA: $*" >&2
  exit 1
}

http_code() {
  curl \
    -sS \
    -o /dev/null \
    -w '%{http_code}' \
    --max-time 10 \
    "$1"
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

    --public-base)
      PUBLIC_BASE="${2%/}"
      shift 2
      ;;

    --pm2-app)
      PM2_APP="$2"
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
  fail "Rollback root olarak çalıştırılmalı."
}

[ -n "$BACKUP_DIR" ] || {
  fail "--backup-dir zorunlu."
}

PROD_DIR="$(
  readlink -m -- "$PROD_DIR"
)"

BACKUP_DIR="$(
  readlink -m -- "$BACKUP_DIR"
)"

ENV_FILE="$PROD_DIR/backend/.env.production"

MANIFEST="$BACKUP_DIR/manifest.txt"

ARCHIVE="$BACKUP_DIR/application-pre-deploy.tar.gz"

[ -f "$MANIFEST" ] || fail "manifest.txt bulunamadı"
[ -f "$ARCHIVE" ] || fail "application backup bulunamadı"
[ -f "$ENV_FILE" ] || fail "canonical .env.production yok"

[ "$(
  stat -c '%U:%G' "$ENV_FILE"
)" = "root:root" ] || {
  fail ".env.production root:root değil."
}

[ "$(
  stat -c '%a' "$ENV_FILE"
)" = "600" ] || {
  fail ".env.production mode 600 değil."
}

MANIFEST_PROD="$(
  awk \
    -F= \
    '$1 == "production_dir" {
       print substr($0, index($0, "=") + 1)
     }' \
    "$MANIFEST"
)"

[ "$MANIFEST_PROD" = "$PROD_DIR" ] || {
  fail "Backup başka production path'e ait."
}

PROD_NAME="$(basename -- "$PROD_DIR")"

STAMP="$(
  date -u +%Y%m%dT%H%M%SZ
)"

RESTORE_ROOT="$(
  mktemp \
    -d \
    "/var/tmp/iot-rollback.XXXXXX"
)"

cleanup() {
  set +e

  if [[ "$RESTORE_ROOT" == /var/tmp/iot-rollback.* ]] &&
     [ -d "$RESTORE_ROOT" ]
  then
    rm -rf -- "$RESTORE_ROOT"
  fi
}

trap cleanup EXIT

tar \
  -tzf \
  "$ARCHIVE" \
  >/dev/null

tar \
  -xzf \
  "$ARCHIVE" \
  -C "$RESTORE_ROOT"

RESTORED="$RESTORE_ROOT/$PROD_NAME"

[ -f "$RESTORED/backend/dist/server.js" ] || {
  fail "Backup backend dist/server.js içermiyor."
}

[ -f "$RESTORED/frontend/build/index.html" ] || {
  fail "Backup frontend build içermiyor."
}

install \
  --owner=root \
  --group=root \
  --mode=0600 \
  "$ENV_FILE" \
  "$RESTORED/backend/.env.production"

NEXT="${PROD_DIR}.rollback-next-${STAMP}"

CURRENT="${PROD_DIR}.pre-rollback-${STAMP}"

FAILED="${PROD_DIR}.rollback-failed-${STAMP}"

[ ! -e "$NEXT" ] || fail "Rollback NEXT path zaten var"
[ ! -e "$CURRENT" ] || fail "Rollback CURRENT path zaten var"

mv \
  "$RESTORED" \
  "$NEXT"

start_clean_pm2() {
  pm2 \
    delete \
    "$PM2_APP" \
    >/dev/null 2>&1 ||
  true

  (
    cd "$PROD_DIR/backend"

    env -i \
      HOME=/root \
      USER=root \
      LOGNAME=root \
      PATH="$PATH" \
      PM2_HOME="${PM2_HOME:-/root/.pm2}" \
      NODE_ENV=production \
      pm2 \
      start \
      dist/server.js \
      --name \
      "$PM2_APP"
  )

  pm2 save >/dev/null
}

pm2 \
  delete \
  "$PM2_APP" \
  >/dev/null 2>&1 ||
true

mv \
  "$PROD_DIR" \
  "$CURRENT"

if ! mv \
  "$NEXT" \
  "$PROD_DIR"
then
  mv \
    "$CURRENT" \
    "$PROD_DIR"

  start_clean_pm2

  fail "Rollback artifact production path'e alınamadı."
fi

if ! start_clean_pm2
then
  pm2 delete "$PM2_APP" >/dev/null 2>&1 || true

  mv \
    "$PROD_DIR" \
    "$FAILED"

  mv \
    "$CURRENT" \
    "$PROD_DIR"

  start_clean_pm2 || true

  fail "Rollback PM2 start başarısız; current artifact geri alındı."
fi

sleep 2

LOCAL_CODE="$(
  http_code \
    "http://127.0.0.1:3001/api/health" ||
  true
)"

PUBLIC_FRONTEND="$(
  http_code \
    "$PUBLIC_BASE/" ||
  true
)"

PUBLIC_DEVICES="$(
  http_code \
    "$PUBLIC_BASE/api/devices" ||
  true
)"

PUBLIC_HEALTH="$(
  http_code \
    "$PUBLIC_BASE/api/health" ||
  true
)"

echo "LOCAL_HEALTH=$LOCAL_CODE"
echo "PUBLIC_FRONTEND=$PUBLIC_FRONTEND"
echo "PUBLIC_DEVICES=$PUBLIC_DEVICES"
echo "PUBLIC_HEALTH=$PUBLIC_HEALTH"

if [ "$LOCAL_CODE" != "200" ] ||
   [ "$PUBLIC_FRONTEND" != "200" ] ||
   [ "$PUBLIC_DEVICES" != "401" ] ||
   [ "$PUBLIC_HEALTH" != "200" ]
then
  pm2 delete "$PM2_APP" >/dev/null 2>&1 || true

  mv \
    "$PROD_DIR" \
    "$FAILED"

  mv \
    "$CURRENT" \
    "$PROD_DIR"

  start_clean_pm2 || true

  fail "Rollback health başarısız; rollback öncesi artifact geri alındı."
fi

cat >> "$BACKUP_DIR/manifest.txt" <<EOF_MANIFEST
artifact_rollback_utc=$STAMP
artifact_rollback_success=true
database_restored=false
pre_rollback_artifact=$CURRENT
EOF_MANIFEST

echo
echo 'ARTIFACT_ROLLBACK=SUCCESS'
echo "PRE_ROLLBACK_ARTIFACT=$CURRENT"
echo 'DATABASE_MUTATION=YOK'
