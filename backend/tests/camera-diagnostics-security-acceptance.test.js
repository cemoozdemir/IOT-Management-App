const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const fs =
  require("node:fs");

const path =
  require("node:path");

process.env.DB_NAME =
  "camera_security_acceptance_test";

process.env.DB_USER =
  "camera_security_acceptance_user";

process.env.DB_PASS =
  "camera_security_acceptance_password";

process.env.DB_HOST =
  "127.0.0.1";

process.env.JWT_SECRET =
  "camera-security-acceptance-jwt-secret";

process.env.CAMERA_SOURCE_KEY =
  "44".repeat(32);

const {
  CameraConnectivityProbeInputError,
  probeCameraConnectivity,
} = require(
  "../dist/services/cameraConnectivityProbe.js"
);

const {
  applyCameraConnectionHealth,
  resetCameraConnectionHealth,
} = require(
  "../dist/services/cameraConnectionHealth.js"
);

const {
  getCameraMediaReadiness,
  serializeCameraMediaReadiness,
} = require(
  "../dist/services/cameraMediaReadiness.js"
);

const {
  CameraConnectivityDiagnosticError,
  diagnoseCameraConnectivity,
} = require(
  "../dist/routes/camera.js"
);

const routeSource =
  fs.readFileSync(
    path.join(
      __dirname,
      "../src/routes/camera.ts"
    ),
    "utf8"
  );

const readinessSource =
  fs.readFileSync(
    path.join(
      __dirname,
      "../src/services/cameraMediaReadiness.ts"
    ),
    "utf8"
  );

const getRouteBlock =
  (
    method,
    routePath
  ) => {
    const pathIndex =
      routeSource.indexOf(
        `"${routePath}"`
      );

    assert.notEqual(
      pathIndex,
      -1,
      `route not found: ${routePath}`
    );

    const start =
      routeSource.lastIndexOf(
        `router.${method}(`,
        pathIndex
      );

    assert.notEqual(
      start,
      -1,
      `router.${method} start not found`
    );

    const next =
      routeSource.indexOf(
        "\nrouter.",
        pathIndex
      );

    return routeSource.slice(
      start,
      next === -1
        ? routeSource.length
        : next
    );
  };


test(
  "diagnostics requires authentication, rate limiting and ownership before network probe",
  () => {
    const block =
      getRouteBlock(
        "post",
        "/:id/diagnostics/connectivity"
      );

    assert.equal(
      block.includes(
        "authenticate"
      ),
      true
    );

    assert.equal(
      block.includes(
        "userMutationRateLimiter"
      ),
      true
    );

    const ownership =
      block.indexOf(
        "findOwnedCamera("
      );

    const probe =
      block.indexOf(
        "diagnoseCameraConnectivity("
      );

    assert.notEqual(
      ownership,
      -1
    );

    assert.notEqual(
      probe,
      -1
    );

    assert.equal(
      ownership < probe,
      true
    );

    /*
     * Diagnostics may only use the stored camera.
     * It must not accept an arbitrary network
     * target from the request body.
     */
    assert.equal(
      block.includes(
        "req.body"
      ),
      false
    );

    assert.equal(
      block.includes(
        "sourceUrl"
      ),
      false
    );

    assert.equal(
      block.includes(
        "sourceHost"
      ),
      false
    );

    assert.equal(
      block.includes(
        "sourcePort"
      ),
      false
    );
  }
);


test(
  "media readiness requires authentication and ownership before state disclosure",
  () => {
    const block =
      getRouteBlock(
        "get",
        "/:id/media/readiness"
      );

    assert.equal(
      block.includes(
        "authenticate"
      ),
      true
    );

    assert.equal(
      block.includes(
        "userReadRateLimiter"
      ),
      true
    );

    const ownership =
      block.indexOf(
        "findOwnedCamera("
      );

    const readiness =
      block.indexOf(
        "getCameraMediaReadiness("
      );

    assert.notEqual(
      ownership,
      -1
    );

    assert.notEqual(
      readiness,
      -1
    );

    assert.equal(
      ownership < readiness,
      true
    );
  }
);


test(
  "disabled camera cannot initiate connectivity network access",
  async () => {
    let dialed =
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
            dialed =
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
      dialed,
      false
    );
  }
);


test(
  "low-level network errors collapse to sanitized connectivity state",
  async () => {
    const secret =
      "admin:camera-password";

    const result =
      await probeCameraConnectivity(
        {
          host:
            "camera.internal",

          port:
            554,
        },
        async () => {
          const error =
            new Error(
              `socket failure ${secret}`
            );

          error.code =
            "E_PRIVATE_CAMERA_FAILURE";

          throw error;
        }
      );

    assert.deepEqual(
      result,
      {
        reachable:
          false,

        status:
          "connection_error",

        elapsedMs:
          result.elapsedMs,
      }
    );

    const json =
      JSON.stringify(
        result
      );

    assert.equal(
      json.includes(
        secret
      ),
      false
    );

    assert.equal(
      json.includes(
        "E_PRIVATE_CAMERA_FAILURE"
      ),
      false
    );
  }
);


test(
  "connectivity timeout remains bounded by validation contract",
  async () => {
    await assert.rejects(
      () =>
        probeCameraConnectivity({
          host:
            "camera.internal",

          port:
            554,

          timeoutMs:
            99,
        }),
      CameraConnectivityProbeInputError
    );

    await assert.rejects(
      () =>
        probeCameraConnectivity({
          host:
            "camera.internal",

          port:
            554,

          timeoutMs:
            10001,
        }),
      CameraConnectivityProbeInputError
    );
  }
);


test(
  "failed connectivity persists only normalized failure status",
  async () => {
    let persisted =
      null;

    const camera = {
      async update(
        values
      ) {
        persisted =
          values;
      },
    };

    await applyCameraConnectionHealth(
      camera,
      {
        reachable:
          false,

        status:
          "network_unreachable",

        elapsedMs:
          15,
      }
    );

    assert.deepEqual(
      persisted,
      {
        lastError:
          "network_unreachable",
      }
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          persisted,
          "lastConnectedAt"
        ),
      false
    );
  }
);


test(
  "source replacement invalidates previous camera health",
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
  "raw persisted camera errors never escape through media readiness",
  () => {
    const secret =
      "rtsp://admin:secret-camera-password@camera/private";

    const readiness =
      getCameraMediaReadiness({
        enabled:
          true,

        lastConnectedAt:
          null,

        lastError:
          secret,
      });

    assert.deepEqual(
      readiness,
      {
        ready:
          false,

        status:
          "connection_error",

        lastConnectedAt:
          null,
      }
    );

    const serialized =
      JSON.stringify(
        serializeCameraMediaReadiness(
          "camera-123",
          "cam_0123456789abcdef01234567",
          readiness
        )
      );

    assert.equal(
      serialized.includes(
        "secret-camera-password"
      ),
      false
    );

    assert.equal(
      serialized.includes(
        "rtsp://"
      ),
      false
    );
  }
);


test(
  "historical readiness layer has no MediaMTX Control API runtime dependency",
  () => {
    for (
      const forbidden
      of [
        "127.0.0.1:9997",
        "/v3/config/paths",
        "axios",
        "fetch(",
        "createConnection",
      ]
    ) {
      assert.equal(
        readinessSource.includes(
          forbidden
        ),
        false,
        `unexpected runtime dependency: ${forbidden}`
      );
    }
  }
);
