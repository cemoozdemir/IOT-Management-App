const test =
  require("node:test");

const assert =
  require("node:assert/strict");

process.env.DB_NAME =
  "camera_media_readiness_test";

process.env.DB_USER =
  "camera_media_readiness_user";

process.env.DB_PASS =
  "camera_media_readiness_password";

process.env.DB_HOST =
  "127.0.0.1";

process.env.JWT_SECRET =
  "camera-media-readiness-jwt-secret";

process.env.CAMERA_SOURCE_KEY =
  "33".repeat(32);

const {
  getCameraMediaReadiness,
  serializeCameraMediaReadiness,
} = require(
  "../dist/services/cameraMediaReadiness.js"
);

const {
  resetCameraConnectionHealth,
} = require(
  "../dist/services/cameraConnectionHealth.js"
);

test(
  "disabled camera is not media ready",
  () => {
    const result =
      getCameraMediaReadiness({
        enabled: false,
        lastConnectedAt:
          "2026-08-11T12:00:00Z",
        lastError: null,
      });

    assert.equal(
      result.ready,
      false
    );

    assert.equal(
      result.status,
      "disabled"
    );
  }
);

test(
  "untested enabled camera is not connected",
  () => {
    assert.deepEqual(
      getCameraMediaReadiness({
        enabled: true,
        lastConnectedAt: null,
        lastError: null,
      }),
      {
        ready: false,
        status:
          "not_connected",
        lastConnectedAt:
          null,
      }
    );
  }
);

test(
  "connection error prevents media readiness",
  () => {
    const result =
      getCameraMediaReadiness({
        enabled: true,
        lastConnectedAt:
          "2026-08-10T12:00:00Z",
        lastError:
          "timeout",
      });

    assert.equal(
      result.ready,
      false
    );

    assert.equal(
      result.status,
      "connection_error"
    );
  }
);

test(
  "successfully connected camera is media ready",
  () => {
    const connectedAt =
      "2026-08-11T15:30:00Z";

    assert.deepEqual(
      getCameraMediaReadiness({
        enabled: true,
        lastConnectedAt:
          connectedAt,
        lastError: null,
      }),
      {
        ready: true,
        status: "ready",
        lastConnectedAt:
          connectedAt,
      }
    );
  }
);

test(
  "source replacement resets connection health",
  () => {
    assert.deepEqual(
      resetCameraConnectionHealth(),
      {
        lastConnectedAt:
          null,
        lastError:
          null,
      }
    );
  }
);

test(
  "reset health produces not-connected readiness",
  () => {
    const reset =
      resetCameraConnectionHealth();

    assert.deepEqual(
      getCameraMediaReadiness({
        enabled: true,
        lastConnectedAt:
          reset.lastConnectedAt ??
          null,
        lastError:
          reset.lastError,
      }),
      {
        ready: false,
        status:
          "not_connected",
        lastConnectedAt:
          null,
      }
    );
  }
);

test(
  "readiness exposes only opaque stream identity and safe state",
  () => {
    const response =
      serializeCameraMediaReadiness(
        "camera-123",
        "cam_0123456789abcdef01234567",
        {
          ready: true,
          status: "ready",
          lastConnectedAt:
            "2026-08-11T15:30:00Z",
        }
      );

    const json =
      JSON.stringify(response);

    for (
      const forbidden of [
        "sourceHost",
        "sourcePort",
        "sourcePath",
        "authCiphertext",
        "authIv",
        "authTag",
        "password",
        "username",
        "rtsp://",
      ]
    ) {
      assert.equal(
        json.includes(
          forbidden
        ),
        false
      );
    }
  }
);

test(
  "arbitrary persisted error text is never exposed",
  () => {
    const readiness =
      getCameraMediaReadiness({
        enabled: true,
        lastConnectedAt: null,
        lastError:
          "rtsp://admin:secret-password@camera/private",
      });

    const json =
      JSON.stringify(
        serializeCameraMediaReadiness(
          "camera-123",
          "cam_0123456789abcdef01234567",
          readiness
        )
      );

    assert.equal(
      readiness.status,
      "connection_error"
    );

    assert.equal(
      json.includes(
        "secret-password"
      ),
      false
    );

    assert.equal(
      json.includes(
        "admin"
      ),
      false
    );
  }
);

test(
  "compiled router contains authenticated readiness route",
  () => {
    const fs =
      require("node:fs");

    const path =
      require("node:path");

    const compiled =
      fs.readFileSync(
        path.join(
          __dirname,
          "../dist/routes/camera.js"
        ),
        "utf8"
      );

    assert.equal(
      compiled.includes(
        "/:id/media/readiness"
      ),
      true
    );

    assert.equal(
      compiled.includes(
        "getCameraMediaReadiness"
      ),
      true
    );

    assert.equal(
      compiled.includes(
        "findOwnedCamera"
      ),
      true
    );

    assert.equal(
      compiled.includes(
        "resetCameraConnectionHealth"
      ),
      true
    );
  }
);
