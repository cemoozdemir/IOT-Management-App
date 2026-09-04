#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

VERSION="1.19.2"

ROOT="$(
  cd "$(
    dirname "${BASH_SOURCE[0]}"
  )" &&
  pwd
)"

SERVICE_NAME="iot-manager-media.service"

CONFIG_DIR="/etc/iot-manager"
CONFIG_FILE="$CONFIG_DIR/mediamtx.yml"
ENV_FILE="$CONFIG_DIR/mediamtx.env"

BINARY="/usr/local/bin/mediamtx"

ACTIVATE=false

fail() {
  echo "HATA: $*" >&2
  exit 1
}

usage() {
  cat <<'USAGE'
Usage:
  sudo ./install-mediamtx.sh
  sudo ./install-mediamtx.sh --activate

Without --activate:
- installs/verifies MediaMTX
- installs configuration and systemd unit
- preserves an existing mediamtx.env
- runs systemctl daemon-reload
- DOES NOT enable or start the service

With --activate:
- performs the same installation
- enables and restarts iot-manager-media.service
USAGE
}

case "${1:-}" in
  "")
    ;;
  --activate)
    ACTIVATE=true
    ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

[ "$(id -u)" -eq 0 ] ||
  fail "root yetkisi gerekli."

for command_name in \
  curl \
  tar \
  sha256sum \
  install \
  systemctl \
  getent \
  groupadd \
  useradd
do
  command -v "$command_name" \
    >/dev/null 2>&1 ||
    fail "$command_name bulunamadı."
done

case "$(uname -m)" in
  x86_64|amd64)
    ARCH="amd64"
    ;;
  aarch64|arm64)
    ARCH="arm64"
    ;;
  *)
    fail \
      "Desteklenmeyen mimari: $(uname -m)"
    ;;
esac

ARCHIVE="mediamtx_v${VERSION}_linux_${ARCH}.tar.gz"

RELEASE_BASE="https://github.com/bluenviron/mediamtx/releases/download/v${VERSION}"

TMP="$(
  mktemp -d
)"

cleanup() {
  rm -rf "$TMP"
}

trap cleanup EXIT

echo "VERSION=$VERSION"
echo "ARCH=$ARCH"
echo "ARCHIVE=$ARCHIVE"

echo
echo '===== DOWNLOAD CHECKSUMS ====='

curl \
  --fail \
  --location \
  --silent \
  --show-error \
  "$RELEASE_BASE/checksums.sha256" \
  --output "$TMP/checksums.sha256"

test -s \
  "$TMP/checksums.sha256" ||
  fail \
    "checksums.sha256 boş."

echo 'CHECKSUM_MANIFEST=İNDİRİLDİ'

echo
echo '===== DOWNLOAD BINARY ARCHIVE ====='

curl \
  --fail \
  --location \
  --silent \
  --show-error \
  "$RELEASE_BASE/$ARCHIVE" \
  --output "$TMP/$ARCHIVE"

test -s \
  "$TMP/$ARCHIVE" ||
  fail \
    "MediaMTX archive boş."

echo 'ARCHIVE=İNDİRİLDİ'

echo
echo '===== VERIFY SHA256 ====='

CHECKSUM_LINE="$(
  grep -E \
    "^[0-9a-fA-F]{64}[[:space:]]+\\*?${ARCHIVE}$" \
    "$TMP/checksums.sha256" |
  head -n 1 ||
  true
)"

[ -n "$CHECKSUM_LINE" ] ||
  fail \
    "Archive resmi checksum manifestinde bulunamadı."

printf '%s\n' \
  "$CHECKSUM_LINE" \
  > "$TMP/expected.sha256"

(
  cd "$TMP"

  sha256sum \
    --check \
    expected.sha256
)

echo 'SHA256_VERIFY=GEÇTİ'

echo
echo '===== EXTRACT ====='

tar \
  -xzf \
  "$TMP/$ARCHIVE" \
  -C "$TMP"

test -x \
  "$TMP/mediamtx" ||
  fail \
    "Archive içinde executable mediamtx yok."

echo 'EXTRACT=GEÇTİ'

echo
echo '===== SYSTEM ACCOUNT ====='

if ! getent group \
  iot-media \
  >/dev/null
then
  groupadd \
    --system \
    iot-media
fi

if ! id \
  iot-media \
  >/dev/null 2>&1
then
  useradd \
    --system \
    --gid iot-media \
    --home-dir /nonexistent \
    --shell /usr/sbin/nologin \
    iot-media
fi

echo 'SYSTEM_ACCOUNT=GEÇTİ'

echo
echo '===== INSTALL FILES ====='

install \
  --directory \
  --owner=root \
  --group=iot-media \
  --mode=0750 \
  "$CONFIG_DIR"

install \
  --owner=root \
  --group=root \
  --mode=0755 \
  "$TMP/mediamtx" \
  "$BINARY"

install \
  --owner=root \
  --group=iot-media \
  --mode=0640 \
  "$ROOT/mediamtx.yml" \
  "$CONFIG_FILE"

if [ ! -e "$ENV_FILE" ]; then
  install \
    --owner=root \
    --group=iot-media \
    --mode=0640 \
    "$ROOT/mediamtx.env.example" \
    "$ENV_FILE"

  echo "ENV_CREATED=$ENV_FILE"
else
  echo "ENV_PRESERVED=$ENV_FILE"
fi

install \
  --owner=root \
  --group=root \
  --mode=0644 \
  "$ROOT/mediamtx.service" \
  "/etc/systemd/system/$SERVICE_NAME"

systemctl daemon-reload

echo 'FILES_INSTALLED=YES'

echo
echo '===== ACTIVATION ====='

if "$ACTIVATE"; then
  systemctl enable \
    "$SERVICE_NAME"

  systemctl restart \
    "$SERVICE_NAME"

  systemctl is-active \
    --quiet \
    "$SERVICE_NAME"

  echo 'SERVICE_ACTIVE=YES'
else
  echo 'SERVICE_ACTIVE=NOT_CHANGED'
fi

echo
echo '============================================'
echo 'MEDIAMTX_INSTALLER=GEÇTİ'
echo "VERSION=$VERSION"
echo "SERVICE=$SERVICE_NAME"
echo 'NGINX_MUTATION=YOK'
echo 'FIREWALL_MUTATION=YOK'
echo '============================================'
