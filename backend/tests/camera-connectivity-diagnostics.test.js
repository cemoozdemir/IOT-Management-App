const test =
  require("node:test");

const assert =
  require("node:assert/strict");

process.env.DB_NAME =
  "camera_diagnostics_test";

process.env.DB_USER =
  "camera_diagnostics_user";

process.env.DB_PASS =
  "camera_diagnostics_password";

process.env.DB_HOST =
  "127.0.0.1";

process.env.JWT_SECRET =
  "camera-diagnostics-jwt-secret";

process.env.CAMERA_SOURCE_KEY =
  "22".repeat(32);

const {
  CameraConnectivityDiagnosticError,
  diagnoseCameraConnectivity,
  serializeCameraConnectivityDiagnostic,
} = require(
  "../dist/routes/camera.js"
);

test(
  "diagnostic probes only stored camera host and port",
  async () => {
    const camera = {
      enabled:
        true,

      sourceHost:
        "camera.internal",

      sourcePort:
        8554,

      sourcePath:
        "/private/live",

      authCiphertext:
        "encrypted-secret",

      authIv:
        "00112233445566778899aabb",

      authTag:
        "00112233445566778899aabbccddeeff",
    };

    let observedTarget =
      null;

    const result =
      await diagnoseCameraConnectivity(
        camera,
        async (
          target
        ) => {
          observedTarget =
            target;

          return {
            reachable:
              true,
            status:
              "connected",
            elapsedMs:
              12,
          };
        }
      );

    assert.deepEqual(
      observedTarget,
      {
        host:
          "camera.internal",
        port:
          8554,
      }
    );

    assert.deepEqual(
      result,
      {
        reachable:
          true,
        status:
          "connected",
        elapsedMs:
          12,
      }
    );

    const serialized =
      JSON.stringify(
        observedTarget
      );

    assert.equal(
      serialized.includes(
        "private/live"
      ),
      false
    );

    assert.equal(
      serialized.includes(
        "encrypted-secret"
      ),
      false
    );
  }
);

test(
  "disabled camera cannot trigger connectivity probe",
  async () => {
    let called =
      false;

    await assert.rejects(
      () =>
        diagnoseCameraConnectivity(
          {
            enabled:
              false,
            sourceHost:
              "camera.internal",
            sourcePort:
              554,
          },
          async () => {
            called =
              true;

            return {
              reachable:
                true,
              status:
                "connected",
              elapsedMs:
                1,
            };
          }
        ),
      (
        error
      ) => {
        assert.equal(
          error instanceof
            CameraConnectivityDiagnosticError,
          true
        );

        assert.equal(
          error.code,
          "camera_disabled"
        );

        return true;
      }
    );

    assert.equal(
      called,
      false
    );
  }
);

test(
  "diagnostic response exposes only sanitized connectivity state",
  () => {
    const result =
      serializeCameraConnectivityDiagnostic(
        "camera-123",
        {
          reachable:
            false,
          status:
            "connection_refused",
          elapsedMs:
            18,
        }
      );

    assert.deepEqual(
      result,
      {
        cameraId:
          "camera-123",
        connectivity: {
          reachable:
            false,
          status:
            "connection_refused",
          elapsedMs:
            18,
        },
      }
    );

    const json =
      JSON.stringify(result);

    assert.equal(
      json.includes(
        "password"
      ),
      false
    );

    assert.equal(
      json.includes(
        "sourcePath"
      ),
      false
    );
  }
);

test(
  "compiled router contains authenticated connectivity diagnostic endpoint",
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
        "/:id/diagnostics/connectivity"
      ),
      true
    );

    assert.equal(
      compiled.includes(
        "findOwnedCamera"
      ),
      true
    );
  }
);
