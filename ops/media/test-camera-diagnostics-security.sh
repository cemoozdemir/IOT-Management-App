#!/usr/bin/env bash
set -Eeuo pipefail
export LC_ALL=C

ROOT="$(
  cd "$(
    dirname "${BASH_SOURCE[0]}"
  )/../.." &&
  pwd
)"

fail() {
  echo "HATA: $*" >&2
  exit 1
}

cd "$ROOT"

echo '===== MEDIA CONFIG ====='

bash \
  ops/media/test-media-config.sh


echo
echo '===== BACKEND BUILD ====='

cd "$ROOT/backend"

npm run build


echo
echo '===== CAMERA SECURITY ACCEPTANCE ====='

node --test \
  tests/camera-connectivity-probe.test.js \
  tests/camera-connectivity-diagnostics.test.js \
  tests/camera-connection-health.test.js \
  tests/camera-media-readiness.test.js \
  tests/camera-source-settings.test.js \
  tests/camera-diagnostics-security-acceptance.test.js


echo
echo '===== FRONTEND CAMERA STATUS ====='

cd "$ROOT/frontend"

CI=true npm test -- \
  --watchAll=false \
  --runInBand \
  --runTestsByPath \
  src/utils/cameraConnectionStatus.test.ts


echo
echo '===== FRONTEND BUILD ====='

npm run build


echo
echo '===== STATIC SECRET BOUNDARY ====='

cd "$ROOT"

if grep -REn \
  'authCiphertext|authIv|authTag|decryptCameraSourceAuth' \
  frontend/src/api/cameraApi.ts \
  frontend/src/components/CameraSettings.tsx \
  frontend/src/utils/cameraConnectionStatus.ts
then
  fail \
    "Protected camera fields frontend boundary'yi geçti."
fi

if grep -REn \
  '127\.0\.0\.1:9997|/v3/config/paths' \
  backend/src/services/cameraMediaReadiness.ts
then
  fail \
    "Readiness layer MediaMTX runtime erişimi içeriyor."
fi

echo 'STATIC_SECRET_BOUNDARY=GEÇTİ'


echo
echo '============================================'
echo 'CAMERA_DIAGNOSTICS_SECURITY_ACCEPTANCE=GEÇTİ'
echo 'OWNERSHIP_BEFORE_NETWORK=YES'
echo 'ARBITRARY_REQUEST_TARGET=NO'
echo 'DISABLED_CAMERA_PROBE=BLOCKED'
echo 'NETWORK_ERRORS=SANITIZED'
echo 'TIMEOUT=BOUNDED'
echo 'FAILED_HEALTH=SANITIZED'
echo 'SOURCE_CHANGE_HEALTH_RESET=YES'
echo 'RAW_READINESS_ERROR_EXPOSED=NO'
echo 'MEDIAMTX_RUNTIME_IN_READINESS=NO'
echo 'FRONTEND_SECRET_BOUNDARY=GEÇTİ'
echo '============================================'
