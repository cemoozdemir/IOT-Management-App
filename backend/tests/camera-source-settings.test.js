const test =
  require("node:test");

const assert =
  require("node:assert/strict");

process.env.DB_NAME =
  "camera_settings_test";
process.env.DB_USER =
  "camera_settings_user";
process.env.DB_PASS =
  "camera_settings_password";
process.env.DB_HOST =
  "127.0.0.1";
process.env.JWT_SECRET =
  "camera-settings-jwt-secret";
process.env.CAMERA_SOURCE_KEY =
  "11".repeat(32);

const {
  CameraSourceInputError,
  decryptCameraSourceAuth,
  generateCameraStreamPath,
  parseCameraSourceUrl,
} = require(
  "../dist/utils/cameraSourceConfig.js"
);

const {
  serializeCameraSource,
  validateCameraCreateBody,
  validateCameraUpdateBody,
} = require(
  "../dist/routes/camera.js"
);

test(
  "camera source url is split and protected data is encrypted",
  () => {
    const parsed =
      parseCameraSourceUrl(
        "rtsp://cam%40user:p%40ss@192.168.1.20:8554/live/main?token=abc123"
      );

    assert.equal(
      parsed.sourceScheme,
      "rtsp"
    );

    assert.equal(
      parsed.sourceHost,
      "192.168.1.20"
    );

    assert.equal(
      parsed.sourcePort,
      8554
    );

    assert.equal(
      parsed.sourcePath,
      "/live/main"
    );

    assert.ok(
      parsed.authCiphertext
    );

    assert.match(
      parsed.authIv,
      /^[a-f0-9]{24}$/
    );

    assert.match(
      parsed.authTag,
      /^[a-f0-9]{32}$/
    );

    const protectedData =
      decryptCameraSourceAuth(
        parsed
      );

    assert.deepEqual(
      protectedData,
      {
        username:
          "cam@user",
        password:
          "p@ss",
        search:
          "?token=abc123",
      }
    );

    assert.equal(
      JSON.stringify(parsed)
        .includes("p@ss"),
      false
    );

    assert.equal(
      JSON.stringify(parsed)
        .includes("abc123"),
      false
    );
  }
);

test(
  "camera source without protected data does not require encrypted fields",
  () => {
    const parsed =
      parseCameraSourceUrl(
        "rtsps://camera.local/live"
      );

    assert.equal(
      parsed.sourceScheme,
      "rtsps"
    );

    assert.equal(
      parsed.sourcePort,
      554
    );

    assert.equal(
      parsed.authCiphertext,
      null
    );

    assert.equal(
      parsed.authIv,
      null
    );

    assert.equal(
      parsed.authTag,
      null
    );
  }
);

test(
  "camera source only accepts rtsp transports",
  () => {
    assert.throws(
      () =>
        parseCameraSourceUrl(
          "https://camera.local/live"
        ),
      CameraSourceInputError
    );
  }
);

test(
  "camera stream paths are opaque and unique",
  () => {
    const first =
      generateCameraStreamPath();

    const second =
      generateCameraStreamPath();

    assert.match(
      first,
      /^cam_[a-f0-9]{24}$/
    );

    assert.match(
      second,
      /^cam_[a-f0-9]{24}$/
    );

    assert.notEqual(
      first,
      second
    );
  }
);

test(
  "camera create validation rejects direct credential fields",
  () => {
    const rejected =
      validateCameraCreateBody({
        deviceId:
          "550e8400-e29b-41d4-a716-446655440000",
        name:
          "Front door",
        sourceUrl:
          "rtsp://camera.local/live",
        password:
          "should-not-be-accepted",
      });

    assert.equal(
      rejected.ok,
      false
    );

    const accepted =
      validateCameraCreateBody({
        deviceId:
          "550e8400-e29b-41d4-a716-446655440000",
        name:
          "Front door",
        sourceUrl:
          "rtsp://camera.local/live",
        enabled:
          true,
      });

    assert.equal(
      accepted.ok,
      true
    );
  }
);

test(
  "camera update validation is partial but strict",
  () => {
    assert.equal(
      validateCameraUpdateBody(
        {}
      ).ok,
      false
    );

    assert.equal(
      validateCameraUpdateBody({
        enabled:
          false,
      }).ok,
      true
    );

    assert.equal(
      validateCameraUpdateBody({
        deviceId:
          "550e8400-e29b-41d4-a716-446655440000",
      }).ok,
      false
    );
  }
);

test(
  "camera serializer never exposes protected source fields",
  () => {
    const camera = {
      toJSON() {
        return {
          id:
            "camera-id",
          deviceId:
            "device-id",
          name:
            "Front door",
          streamPath:
            "cam_0123456789abcdef01234567",
          sourceScheme:
            "rtsp",
          sourceHost:
            "192.168.1.20",
          sourcePort:
            554,
          sourcePath:
            "/private/live",
          authCiphertext:
            "encrypted-secret",
          authIv:
            "00112233445566778899aabb",
          authTag:
            "00112233445566778899aabbccddeeff",
          enabled:
            true,
          lastConnectedAt:
            null,
          lastError:
            null,
          createdAt:
            new Date(
              "2026-07-16T12:00:00Z"
            ),
          updatedAt:
            new Date(
              "2026-07-16T12:00:00Z"
            ),
        };
      },
    };

    const result =
      serializeCameraSource(
        camera
      );

    const json =
      JSON.stringify(result);

    assert.equal(
      json.includes(
        "encrypted-secret"
      ),
      false
    );

    assert.equal(
      json.includes(
        "/private/live"
      ),
      false
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty
        .call(
          result,
          "authCiphertext"
        ),
      false
    );

    assert.deepEqual(
      result.source,
      {
        scheme:
          "rtsp",
        host:
          "192.168.1.20",
        port:
          554,
        protectedConnectionData:
          true,
      }
    );
  }
);
