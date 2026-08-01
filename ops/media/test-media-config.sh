#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

ROOT="$(
  cd "$(
    dirname "${BASH_SOURCE[0]}"
  )" &&
  pwd
)"

CONFIG="$ROOT/mediamtx.yml"
SERVICE="$ROOT/mediamtx.service"

fail() {
  echo "HATA: $*" >&2
  exit 1
}

[ -f "$CONFIG" ] ||
  fail "mediamtx.yml yok."

[ -f "$SERVICE" ] ||
  fail "mediamtx.service yok."

grep -qx \
  'api: true' \
  "$CONFIG"

grep -qx \
  'apiAddress: 127.0.0.1:9997' \
  "$CONFIG"

grep -qx \
  'hlsAddress: 127.0.0.1:8888' \
  "$CONFIG"

grep -qx \
  'webrtcAddress: 127.0.0.1:8889' \
  "$CONFIG"

grep -qx \
  'webrtcLocalUDPAddress: :8189' \
  "$CONFIG"

grep -qx \
  'rtspAddress: 127.0.0.1:8554' \
  "$CONFIG"

grep -qx \
  'rtspTransports: \[tcp\]' \
  "$CONFIG"

grep -qx \
  'rtmp: false' \
  "$CONFIG"

grep -qx \
  'srt: false' \
  "$CONFIG"

grep -qx \
  'moq: false' \
  "$CONFIG"

grep -qx \
  'metrics: false' \
  "$CONFIG"

grep -qx \
  'pprof: false' \
  "$CONFIG"

grep -qx \
  'playback: false' \
  "$CONFIG"

grep -qx \
  'authMethod: http' \
  "$CONFIG"

grep -qx \
  'authHTTPAddress: http://127.0.0.1:3001/api/media/auth' \
  "$CONFIG"

grep -qx \
  'paths: {}' \
  "$CONFIG"

grep -qF \
  'sourceOnDemand: true' \
  "$CONFIG"

grep -qF \
  'record: false' \
  "$CONFIG"

grep -qF \
  'User=iot-media' \
  "$SERVICE"

grep -qF \
  'NoNewPrivileges=true' \
  "$SERVICE"

grep -qF \
  'ProtectSystem=strict' \
  "$SERVICE"

grep -qF \
  'CapabilityBoundingSet=' \
  "$SERVICE"

#
# Control API, HLS, WebRTC HTTP and RTSP
# listeners must all remain loopback-only.
#
for forbidden in \
  'apiAddress: :9997' \
  'hlsAddress: :8888' \
  'webrtcAddress: :8889' \
  'rtspAddress: :8554'
do
  if grep -qxF \
    "$forbidden" \
    "$CONFIG"
  then
    fail \
      "Public listener bulundu: $forbidden"
  fi
done

echo 'MEDIA_CONFIG_STATIC_CONTRACT=GEÇTİ'
