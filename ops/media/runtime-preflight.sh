#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

SERVICE="iot-manager-media.service"

fail() {
  echo "HATA: $*" >&2
  exit 1
}

for command_name in \
  systemctl \
  ss \
  curl
do
  command -v "$command_name" \
    >/dev/null 2>&1 ||
    fail "$command_name bulunamadı."
done

echo '===== MEDIA SERVICE ====='

systemctl is-active \
  --quiet \
  "$SERVICE" ||
  fail \
    "$SERVICE aktif değil."

echo 'SERVICE=ACTIVE'

check_loopback_tcp() {
  local port="$1"

  if ! ss -lntH |
    grep -E \
      "127\\.0\\.0\\.1:${port}[[:space:]]" \
      >/dev/null
  then
    fail \
      "127.0.0.1:${port}/tcp dinlenmiyor."
  fi
}

echo
echo '===== LOOPBACK LISTENERS ====='

check_loopback_tcp 9997
check_loopback_tcp 8554
check_loopback_tcp 8888
check_loopback_tcp 8889

echo 'LOOPBACK_LISTENERS=GEÇTİ'

echo
echo '===== PUBLIC LISTENER SAFETY ====='

for port in \
  9997 \
  8554 \
  8888 \
  8889
do
  if ss -lntH |
    grep -E \
      "(^|[[:space:]])(0\\.0\\.0\\.0|\\[::\\]|\\*):${port}[[:space:]]" \
      >/dev/null
  then
    fail \
      "${port}/tcp public interface üzerinde dinliyor."
  fi
done

echo 'PUBLIC_TCP_MEDIA_LISTENERS=YOK'

echo
echo '===== WEBRTC ICE ====='

if ! ss -lunH |
  grep -E \
    '(^|[[:space:]])[^[:space:]]*:8189[[:space:]]' \
    >/dev/null
then
  fail \
    "8189/udp dinlenmiyor."
fi

echo 'ICE_UDP_8189=LISTENING'

echo
echo '===== CONTROL API ====='

curl \
  --fail \
  --silent \
  --show-error \
  --max-time 3 \
  'http://127.0.0.1:9997/v3/config/global/get' \
  >/dev/null ||
  fail \
    "MediaMTX Control API health check başarısız."

echo 'CONTROL_API=HEALTHY'

echo
echo '===== NGINX ====='

if command -v nginx \
  >/dev/null 2>&1
then
  nginx -t
  echo 'NGINX_CONFIG=GEÇTİ'
else
  echo 'NGINX_CONFIG=SKIPPED_NOT_INSTALLED'
fi

echo
echo '============================================'
echo 'MEDIA_RUNTIME_PREFLIGHT=GEÇTİ'
echo 'CONTROL_API_PUBLIC=NO'
echo 'RTSP_PUBLIC=NO'
echo 'HLS_HTTP_PUBLIC=NO'
echo 'WHEP_HTTP_PUBLIC=NO'
echo 'ICE_UDP=8189'
echo '============================================'
