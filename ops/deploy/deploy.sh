#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C
umask 077

SCRIPT_DIR="$(
  cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &&
  pwd -P
)"

REPO_ROOT="$(
  cd -- "$SCRIPT_DIR/../.." &&
  pwd -P
)"

SOURCE_DIR="$REPO_ROOT"

PROD_DIR="${IOT_PROD_DIR:-/home/IOT-Management-App}"

BACKUP_ROOT="${IOT_BACKUP_ROOT:-/var/backups/iot-management-app/deploy}"

PUBLIC_BASE="${IOT_PUBLIC_BASE:-https://iot.ozdmr.dev}"

PM2_APP="${IOT_PM2_APP:-iot-api}"

EXPECTED_SHA=""

PREFLIGHT_ONLY=0

ALLOW_ARTIFACT_ROLLBACK_AFTER_MIGRATION=0

LOCK_FILE="/run/lock/iot-management-app-deploy.lock"

STAGE_ROOT=""
STAGE=""
NEW_PROD=""
OLD_PROD=""
FAILED_PROD=""
BACKUP_DIR=""
STAMP=""
SHORT=""
SWAPPED=0
DEPLOY_COMMITTED=0

usage() {
  cat <<'USAGE'
Usage:
  sudo ./deploy.sh \
    --expected-sha <40-char-main-sha> \
    [--source-dir <git-checkout>] \
    [--production-dir <path>] \
    [--backup-root <path>] \
    [--public-base <url>] \
    [--pm2-app <name>] \
    [--allow-artifact-rollback-after-migration] \
    [--preflight-only]

Important:

  --expected-sha is mandatory.

  If pending database migrations exist, deployment refuses to
  continue unless:

    --allow-artifact-rollback-after-migration

  is supplied.

  That flag means the operator has reviewed the pending migrations
  and confirmed that the previous application artifact can safely
  run against the forward-migrated schema.

Database rollback is never automatic.
USAGE
}

fail() {
  echo "HATA: $*" >&2
  return 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    fail "Gerekli komut yok: $1"
  }
}

git_source() {
  git \
    -c "safe.directory=$SOURCE_DIR" \
    -C "$SOURCE_DIR" \
    "$@"
}

http_code() {
  local url="$1"

  curl \
    -sS \
    -o /dev/null \
    -w '%{http_code}' \
    --max-time 10 \
    "$url"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --expected-sha)
      [ "$#" -ge 2 ] || fail "--expected-sha değeri eksik"
      EXPECTED_SHA="$2"
      shift 2
      ;;

    --source-dir)
      [ "$#" -ge 2 ] || fail "--source-dir değeri eksik"
      SOURCE_DIR="$2"
      shift 2
      ;;

    --production-dir)
      [ "$#" -ge 2 ] || fail "--production-dir değeri eksik"
      PROD_DIR="$2"
      shift 2
      ;;

    --backup-root)
      [ "$#" -ge 2 ] || fail "--backup-root değeri eksik"
      BACKUP_ROOT="$2"
      shift 2
      ;;

    --public-base)
      [ "$#" -ge 2 ] || fail "--public-base değeri eksik"
      PUBLIC_BASE="${2%/}"
      shift 2
      ;;

    --pm2-app)
      [ "$#" -ge 2 ] || fail "--pm2-app değeri eksik"
      PM2_APP="$2"
      shift 2
      ;;

    --allow-artifact-rollback-after-migration)
      ALLOW_ARTIFACT_ROLLBACK_AFTER_MIGRATION=1
      shift
      ;;

    --preflight-only)
      PREFLIGHT_ONLY=1
      shift
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
  fail "Deployment root olarak çalıştırılmalı."
}

[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]] || {
  fail "--expected-sha tam 40 karakter Git SHA olmalı."
}

SOURCE_DIR="$(
  cd -- "$SOURCE_DIR" &&
  pwd -P
)"

PROD_DIR="$(
  readlink -m -- "$PROD_DIR"
)"

BACKUP_ROOT="$(
  readlink -m -- "$BACKUP_ROOT"
)"

ENV_FILE="$PROD_DIR/backend/.env.production"

PROD_PARENT="$(dirname -- "$PROD_DIR")"
PROD_NAME="$(basename -- "$PROD_DIR")"

for command_name in \
  git \
  npm \
  node \
  tar \
  curl \
  pm2 \
  jq \
  flock \
  pg_dump \
  pg_restore \
  psql \
  rsync \
  sha256sum \
  stat \
  mktemp
do
  require_command "$command_name"
done

exec 9>"$LOCK_FILE"

flock -n 9 || {
  fail "Başka bir IOT deployment işlemi aktif."
}

[ -d "$SOURCE_DIR/.git" ] || {
  fail "Source bir git checkout değil: $SOURCE_DIR"
}

[ -d "$PROD_DIR" ] || {
  fail "Production dizini yok: $PROD_DIR"
}

[ ! -L "$PROD_DIR" ] || {
  fail "Production path symlink olmamalı."
}

[ -f "$ENV_FILE" ] || {
  fail "Canonical production env bulunamadı."
}

ENV_OWNER="$(
  stat -c '%U:%G' "$ENV_FILE"
)"

ENV_MODE="$(
  stat -c '%a' "$ENV_FILE"
)"

echo "ENV_OWNER=$ENV_OWNER"
echo "ENV_MODE=$ENV_MODE"

[ "$ENV_OWNER" = "root:root" ] || {
  fail ".env.production root:root değil."
}

[ "$ENV_MODE" = "600" ] || {
  fail ".env.production mode 600 değil."
}

SOURCE_BRANCH="$(
  git_source branch --show-current
)"

SOURCE_HEAD="$(
  git_source rev-parse HEAD
)"

echo "SOURCE_BRANCH=$SOURCE_BRANCH"
echo "SOURCE_HEAD=$SOURCE_HEAD"
echo "EXPECTED_SHA=$EXPECTED_SHA"

[ "$SOURCE_BRANCH" = "main" ] || {
  fail "Deployment yalnız main branch üzerinden yapılabilir."
}

[ "$SOURCE_HEAD" = "$EXPECTED_SHA" ] || {
  fail "Local source HEAD expected SHA ile eşleşmiyor."
}

git_source \
  cat-file \
  -e \
  "$EXPECTED_SHA^{commit}"

if git_source \
  show-ref \
  --verify \
  --quiet \
  refs/remotes/origin/main
then
  ORIGIN_MAIN="$(
    git_source rev-parse origin/main
  )"

  echo "ORIGIN_MAIN=$ORIGIN_MAIN"

  [ "$ORIGIN_MAIN" = "$EXPECTED_SHA" ] || {
    fail "origin/main expected SHA ile eşleşmiyor."
  }
fi

[ -z "$(
  git_source status --porcelain=v1 -uall
)" ] || {
  fail "Source worktree temiz değil."
}

TREE_SHA="$(
  git_source \
    rev-parse \
    "$EXPECTED_SHA^{tree}"
)"

PM2_JSON="$(
  pm2 jlist
)"

PM2_COUNT="$(
  printf '%s' "$PM2_JSON" |
  jq \
    --arg app "$PM2_APP" \
    '[.[] | select(.name == $app)] | length'
)"

[ "$PM2_COUNT" = "1" ] || {
  fail "PM2 içinde exact $PM2_APP process sayısı 1 değil."
}

PM2_SCRIPT="$(
  printf '%s' "$PM2_JSON" |
  jq -r \
    --arg app "$PM2_APP" \
    '.[] |
     select(.name == $app) |
     .pm2_env.pm_exec_path'
)"

PM2_STATUS="$(
  printf '%s' "$PM2_JSON" |
  jq -r \
    --arg app "$PM2_APP" \
    '.[] |
     select(.name == $app) |
     .pm2_env.status'
)"

PM2_NODE_ENV="$(
  printf '%s' "$PM2_JSON" |
  jq -r \
    --arg app "$PM2_APP" \
    '.[] |
     select(.name == $app) |
     (.pm2_env.NODE_ENV // "")'
)"

echo "PM2_STATUS=$PM2_STATUS"
echo "PM2_SCRIPT=$PM2_SCRIPT"
echo "PM2_NODE_ENV=$PM2_NODE_ENV"

[ "$PM2_SCRIPT" = "$PROD_DIR/backend/dist/server.js" ] || {
  fail "PM2 script production dist/server.js değil."
}

[ "$PM2_STATUS" = "online" ] || {
  fail "PM2 iot-api online değil."
}

[ "$PM2_NODE_ENV" = "production" ] || {
  fail "PM2 NODE_ENV production değil."
}

set +u
# shellcheck disable=SC1090
. "$ENV_FILE"

IOT_DB_USER="${DB_USER:-}"
IOT_DB_PASS="${DB_PASS:-}"
IOT_DB_NAME="${DB_NAME:-}"
IOT_DB_HOST="${DB_HOST:-}"
IOT_DB_PORT="${DB_PORT:-5432}"
IOT_API_PORT="${PORT:-3001}"

unset \
  DB_USER \
  DB_PASS \
  DB_NAME \
  DB_HOST \
  DB_PORT \
  JWT_SECRET \
  PORT \
  HOST \
  NODE_ENV

set -u

[ -n "$IOT_DB_USER" ] || fail "DB_USER eksik"
[ -n "$IOT_DB_PASS" ] || fail "DB_PASS eksik"
[ -n "$IOT_DB_NAME" ] || fail "DB_NAME eksik"
[ -n "$IOT_DB_HOST" ] || fail "DB_HOST eksik"

health_gate() {
  local phase="$1"

  local local_health
  local public_frontend
  local public_devices
  local public_health

  local_health="$(
    http_code \
      "http://127.0.0.1:${IOT_API_PORT}/api/health"
  )"

  public_frontend="$(
    http_code \
      "$PUBLIC_BASE/"
  )"

  public_devices="$(
    http_code \
      "$PUBLIC_BASE/api/devices"
  )"

  public_health="$(
    http_code \
      "$PUBLIC_BASE/api/health"
  )"

  echo "${phase}_LOCAL_HEALTH=$local_health"
  echo "${phase}_PUBLIC_FRONTEND=$public_frontend"
  echo "${phase}_PUBLIC_DEVICES=$public_devices"
  echo "${phase}_PUBLIC_HEALTH=$public_health"

  [ "$local_health" = "200" ] || return 1
  [ "$public_frontend" = "200" ] || return 1
  [ "$public_devices" = "401" ] || return 1
  [ "$public_health" = "200" ] || return 1
}

echo
echo '===== PRE-DEPLOY HEALTH ====='

health_gate PRE || {
  fail "Pre-deploy health gate geçmedi."
}

if [ "$PREFLIGHT_ONLY" = "1" ]; then
  echo
  echo 'PREFLIGHT_ONLY=GEÇTİ'
  echo 'MUTATION=YOK'
  exit 0
fi

SHORT="${EXPECTED_SHA:0:12}"

STAMP="$(
  date -u +%Y%m%dT%H%M%SZ
)"

STAGE_ROOT="$(
  mktemp \
    -d \
    "/var/tmp/iot-deploy-${SHORT}.XXXXXX"
)"

STAGE="$STAGE_ROOT/source"

mkdir -p "$STAGE"

safe_cleanup() {
  set +e

  if [ -n "$STAGE_ROOT" ] &&
     [[ "$STAGE_ROOT" == /var/tmp/iot-deploy-* ]] &&
     [ -d "$STAGE_ROOT" ]
  then
    rm -rf -- "$STAGE_ROOT"
  fi

  if [ -n "$NEW_PROD" ] &&
     [[ "$NEW_PROD" == "${PROD_DIR}.next-"* ]] &&
     [ -d "$NEW_PROD" ]
  then
    rm -rf -- "$NEW_PROD"
  fi
}

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

  local process_json
  local process_count
  local process_status
  local secret_env

  process_json="$(
    pm2 jlist
  )"

  process_count="$(
    printf '%s' "$process_json" |
    jq \
      --arg app "$PM2_APP" \
      '[.[] | select(.name == $app)] | length'
  )"

  process_status="$(
    printf '%s' "$process_json" |
    jq -r \
      --arg app "$PM2_APP" \
      '.[] |
       select(.name == $app) |
       .pm2_env.status'
  )"

  secret_env="$(
    printf '%s' "$process_json" |
    jq -r \
      --arg app "$PM2_APP" \
      '.[] |
       select(.name == $app) |
       .pm2_env |
       (
         has("DB_PASS") or
         has("JWT_SECRET")
       )'
  )"

  [ "$process_count" = "1" ]
  [ "$process_status" = "online" ]
  [ "$secret_env" = "false" ]
}

rollback_live_artifact() {
  set +e

  if [ "$SWAPPED" != "1" ] ||
     [ "$DEPLOY_COMMITTED" = "1" ] ||
     [ ! -d "$OLD_PROD" ]
  then
    return 0
  fi

  echo >&2
  echo 'DEPLOY FAILURE: artifact rollback başlatılıyor.' >&2
  echo 'DATABASE AUTOMATIC RESTORE=YOK' >&2

  FAILED_PROD="${PROD_DIR}.failed-${STAMP}-${SHORT}-$$"

  pm2 \
    delete \
    "$PM2_APP" \
    >/dev/null 2>&1 ||
  true

  if [ -d "$PROD_DIR" ]; then
    mv \
      "$PROD_DIR" \
      "$FAILED_PROD"
  fi

  mv \
    "$OLD_PROD" \
    "$PROD_DIR"

  start_clean_pm2

  sleep 2

  health_gate ROLLBACK

  if [ -n "$BACKUP_DIR" ] &&
     [ -d "$BACKUP_DIR" ]
  then
    {
      echo "automatic_artifact_rollback=true"
      echo "failed_artifact=$FAILED_PROD"
      echo "database_restored=false"
    } >> "$BACKUP_DIR/manifest.txt"
  fi

  echo "ARTIFACT_ROLLBACK=UYGULANDI" >&2
  echo "FAILED_ARTIFACT=$FAILED_PROD" >&2
}

on_error() {
  local rc="$1"

  trap - ERR
  set +e

  rollback_live_artifact
  safe_cleanup

  echo >&2
  echo "DEPLOYMENT_FAILED_RC=$rc" >&2

  if [ -n "$BACKUP_DIR" ]; then
    echo "BACKUP_DIR=$BACKUP_DIR" >&2
  fi

  exit "$rc"
}

trap 'on_error $?' ERR
trap safe_cleanup EXIT

echo
echo '===== IMMUTABLE GIT ARCHIVE ====='

git_source \
  archive \
  "$EXPECTED_SHA" |
tar \
  -x \
  -C \
  "$STAGE"

[ ! -e "$STAGE/.git" ] || {
  fail "Stage içinde .git bulunmamalı."
}

echo "TREE_SHA=$TREE_SHA"

echo
echo '===== STAGED BACKEND BUILD ====='

(
  cd "$STAGE/backend"

  npm ci
  npm run build
)

[ -f "$STAGE/backend/dist/server.js" ] || {
  fail "Backend dist/server.js oluşmadı."
}

echo
echo '===== STAGED FRONTEND BUILD ====='

(
  cd "$STAGE/frontend"

  npm ci

  CI=true \
    npm run build
)

[ -f "$STAGE/frontend/build/index.html" ] || {
  fail "Frontend build/index.html oluşmadı."
}

rm -rf \
  "$STAGE/frontend/node_modules"

install \
  --owner=root \
  --group=root \
  --mode=0600 \
  "$ENV_FILE" \
  "$STAGE/backend/.env.production"

echo
echo '===== MIGRATION STATUS BEFORE MUTATION ====='

STATUS_BEFORE="$STAGE_ROOT/migrations.before.txt"

(
  cd "$STAGE/backend"

  FORCE_COLOR=0 \
  NO_COLOR=1 \
    npx \
    sequelize-cli \
    db:migrate:status \
    --env production
) |
tee "$STATUS_BEFORE"

PENDING_COUNT="$(
  grep -cE \
    '^[[:space:]]*down[[:space:]]+' \
    "$STATUS_BEFORE" ||
  true
)"

echo "PENDING_MIGRATIONS=$PENDING_COUNT"

if [ "$PENDING_COUNT" -gt 0 ] &&
   [ "$ALLOW_ARTIFACT_ROLLBACK_AFTER_MIGRATION" != "1" ]
then
  echo >&2
  echo 'Pending migration bulundu.' >&2
  echo >&2
  echo 'Migrationları backward-compatible olarak inceleyin ve' >&2
  echo 'onaylandıysa deployment komutuna şunu ekleyin:' >&2
  echo >&2
  echo '  --allow-artifact-rollback-after-migration' >&2
  echo >&2

  fail "Explicit migration compatibility acknowledgement eksik."
fi

echo
echo '===== CREATE ROOT-ONLY BACKUP ====='

install \
  --directory \
  --owner=root \
  --group=root \
  --mode=0700 \
  "$BACKUP_ROOT"

BACKUP_DIR="$BACKUP_ROOT/${STAMP}-${SHORT}"

install \
  --directory \
  --owner=root \
  --group=root \
  --mode=0700 \
  "$BACKUP_DIR"

ARTIFACT_BACKUP="$BACKUP_DIR/application-pre-deploy.tar.gz"

DB_DUMP="$BACKUP_DIR/database-pre-deploy.dump"

tar \
  --numeric-owner \
  --exclude="$PROD_NAME/backend/.env.production" \
  -C "$PROD_PARENT" \
  -czf "$ARTIFACT_BACKUP" \
  "$PROD_NAME"

tar \
  -tzf \
  "$ARTIFACT_BACKUP" \
  >/dev/null

if tar \
  -tzf \
  "$ARTIFACT_BACKUP" |
  grep -qE \
    '/backend/\.env\.production$'
then
  fail "Artifact backup production secret içeriyor."
fi

chmod \
  0600 \
  "$ARTIFACT_BACKUP"

echo 'ARTIFACT_BACKUP=VERIFIED'

echo
echo '===== DATABASE CUSTOM-FORMAT BACKUP ====='

PGPASSWORD="$IOT_DB_PASS" \
pg_dump \
  --host="$IOT_DB_HOST" \
  --port="$IOT_DB_PORT" \
  --username="$IOT_DB_USER" \
  --dbname="$IOT_DB_NAME" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$DB_DUMP"

chmod \
  0600 \
  "$DB_DUMP"

pg_restore \
  -l \
  "$DB_DUMP" \
  > "$BACKUP_DIR/database-pre-deploy.contents"

[ -s "$BACKUP_DIR/database-pre-deploy.contents" ] || {
  fail "pg_restore -l boş çıktı verdi."
}

echo 'DATABASE_BACKUP=VERIFIED'

cp \
  "$STATUS_BEFORE" \
  "$BACKUP_DIR/migrations.before.txt"

chmod \
  0600 \
  "$BACKUP_DIR/migrations.before.txt"

PREVIOUS_SHA="unknown"

if [ -f "$PROD_DIR/.deployment-sha" ]; then
  candidate="$(
    head -n1 \
      "$PROD_DIR/.deployment-sha"
  )"

  if [[ "$candidate" =~ ^[0-9a-f]{40}$ ]]; then
    PREVIOUS_SHA="$candidate"
  fi
fi

cat > "$BACKUP_DIR/manifest.txt" <<EOF_MANIFEST
status=prepared
timestamp_utc=$STAMP
production_dir=$PROD_DIR
source_dir=$SOURCE_DIR
expected_sha=$EXPECTED_SHA
expected_tree=$TREE_SHA
previous_deployment_sha=$PREVIOUS_SHA
pending_migrations=$PENDING_COUNT
automatic_database_restore=false
EOF_MANIFEST

chmod \
  0600 \
  "$BACKUP_DIR/manifest.txt"

sha256sum \
  "$ARTIFACT_BACKUP" \
  "$DB_DUMP" \
  > "$BACKUP_DIR/SHA256SUMS"

chmod \
  0600 \
  "$BACKUP_DIR/SHA256SUMS"

echo "BACKUP_DIR=$BACKUP_DIR"

echo
echo '===== PREPARE NEXT PRODUCTION ARTIFACT ====='

NEW_PROD="${PROD_DIR}.next-${STAMP}-${SHORT}"

OLD_PROD="${PROD_DIR}.previous-${STAMP}-${SHORT}"

[ ! -e "$NEW_PROD" ] || {
  fail "NEXT production path zaten var."
}

[ ! -e "$OLD_PROD" ] || {
  fail "PREVIOUS production path zaten var."
}

install \
  --directory \
  --owner=root \
  --group=root \
  --mode=0755 \
  "$NEW_PROD"

rsync \
  -a \
  --delete \
  "$STAGE/" \
  "$NEW_PROD/"

install \
  --owner=root \
  --group=root \
  --mode=0600 \
  "$ENV_FILE" \
  "$NEW_PROD/backend/.env.production"

printf '%s\n' \
  "$EXPECTED_SHA" \
  > "$NEW_PROD/.deployment-sha"

chmod \
  0644 \
  "$NEW_PROD/.deployment-sha"

[ -f "$NEW_PROD/backend/dist/server.js" ] || {
  fail "NEXT backend artifact eksik."
}

[ -f "$NEW_PROD/frontend/build/index.html" ] || {
  fail "NEXT frontend artifact eksik."
}

[ "$(
  stat -c '%U:%G' \
    "$NEW_PROD/backend/.env.production"
)" = "root:root" ] || {
  fail "NEXT env owner hatalı."
}

[ "$(
  stat -c '%a' \
    "$NEW_PROD/backend/.env.production"
)" = "600" ] || {
  fail "NEXT env mode hatalı."
}

echo 'NEXT_ARTIFACT=READY'

echo
echo '===== APPLY EXPLICIT MIGRATIONS ====='

(
  cd "$STAGE/backend"

  FORCE_COLOR=0 \
  NO_COLOR=1 \
    npx \
    sequelize-cli \
    db:migrate \
    --env production
)

STATUS_AFTER="$BACKUP_DIR/migrations.after.txt"

(
  cd "$STAGE/backend"

  FORCE_COLOR=0 \
  NO_COLOR=1 \
    npx \
    sequelize-cli \
    db:migrate:status \
    --env production
) |
tee "$STATUS_AFTER"

chmod \
  0600 \
  "$STATUS_AFTER"

if grep -qE \
  '^[[:space:]]*down[[:space:]]+' \
  "$STATUS_AFTER"
then
  fail "Migration sonrası pending migration kaldı."
fi

echo 'MIGRATION_GATE=GEÇTİ'

echo
echo '===== ATOMIC-LIKE ARTIFACT SWITCH ====='

mv \
  "$PROD_DIR" \
  "$OLD_PROD"

if ! mv \
  "$NEW_PROD" \
  "$PROD_DIR"
then
  mv \
    "$OLD_PROD" \
    "$PROD_DIR"

  fail "NEXT artifact production path'e alınamadı."
fi

NEW_PROD=""
SWAPPED=1

[ "$(
  cat "$PROD_DIR/.deployment-sha"
)" = "$EXPECTED_SHA" ] || {
  fail "Production deployment marker yanlış."
}

echo 'ARTIFACT_SWITCH=GEÇTİ'

echo
echo '===== CLEAN PM2 PROCESS REPLACEMENT ====='

start_clean_pm2

echo 'PM2_CLEAN_START=GEÇTİ'
echo 'PM2_SECRET_DUPLICATION=YOK'

echo
echo '===== POST-DEPLOY LOOPBACK HEALTH ====='

LOCAL_READY=0

for _ in $(seq 1 30); do
  code="$(
    http_code \
      "http://127.0.0.1:${IOT_API_PORT}/api/health" ||
    true
  )"

  if [ "$code" = "200" ]; then
    LOCAL_READY=1
    break
  fi

  sleep 2
done

[ "$LOCAL_READY" = "1" ] || {
  fail "Yeni backend loopback health alamadı."
}

echo 'LOOPBACK_READY=EVET'

echo
echo '===== POST-DEPLOY PUBLIC ACCEPTANCE ====='

health_gate POST || {
  fail "Post-deploy public health gate geçmedi."
}

DEPLOY_COMMITTED=1

{
  echo "status=success"
  echo "completed_utc=$(date -u +%Y%m%dT%H%M%SZ)"
  echo "previous_live_artifact=$OLD_PROD"
  echo "database_restored=false"
} >> "$BACKUP_DIR/manifest.txt"

echo
echo '============================================================'
echo ' DEPLOYMENT SUCCESS'
echo
echo " SHA=$EXPECTED_SHA"
echo " BACKUP_DIR=$BACKUP_DIR"
echo " PREVIOUS_ARTIFACT=$OLD_PROD"
echo ' DATABASE_BACKUP=VERIFIED'
echo ' DATABASE_AUTOMATIC_ROLLBACK=DISABLED'
echo ' HEALTH=PASSED'
echo '============================================================'
