const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const net =
  require("node:net");

const {
  CameraConnectivityProbeInputError,
  classifyCameraConnectivityError,
  probeCameraConnectivity,
} = require(
  "../dist/services/cameraConnectivityProbe.js"
);

const errorWithCode =
  (
    code,
    message = "network failure"
  ) => {
    const error =
      new Error(message);

    error.code =
      code;

    return error;
  };

test(
  "camera connectivity probe connects to a reachable TCP endpoint",
  async () => {
    const server =
      net.createServer(
        (socket) => {
          socket.end();
        }
      );

    await new Promise(
      (
        resolve,
        reject
      ) => {
        server.once(
          "error",
          reject
        );

        server.listen(
          0,
          "127.0.0.1",
          resolve
        );
      }
    );

    try {
      const address =
        server.address();

      assert.ok(
        address
      );

      assert.equal(
        typeof address,
        "object"
      );

      const result =
        await probeCameraConnectivity({
          host:
            "127.0.0.1",
          port:
            address.port,
          timeoutMs:
            1000,
        });

      assert.equal(
        result.reachable,
        true
      );

      assert.equal(
        result.status,
        "connected"
      );

      assert.equal(
        Number.isInteger(
          result.elapsedMs
        ),
        true
      );

      assert.equal(
        result.elapsedMs >= 0,
        true
      );
    } finally {
      await new Promise(
        (
          resolve,
          reject
        ) => {
          server.close(
            (error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            }
          );
        }
      );
    }
  }
);

test(
  "probe normalizes bracketed IPv6 without changing connectivity semantics",
  async () => {
    let observedHost =
      null;

    const result =
      await probeCameraConnectivity(
        {
          host:
            "[::1]",
          port:
            554,
          timeoutMs:
            500,
        },
        async (
          host
        ) => {
          observedHost =
            host;
        }
      );

    assert.equal(
      observedHost,
      "::1"
    );

    assert.equal(
      result.reachable,
      true
    );

    assert.equal(
      result.status,
      "connected"
    );
  }
);

test(
  "probe classifies timeout without exposing the raw error",
  async () => {
    const secret =
      "rtsp://admin:camera-password@example";

    const result =
      await probeCameraConnectivity(
        {
          host:
            "camera.local",
          port:
            554,
          timeoutMs:
            500,
        },
        async () => {
          throw errorWithCode(
            "ETIMEDOUT",
            secret
          );
        }
      );

    assert.deepEqual(
      {
        reachable:
          result.reachable,
        status:
          result.status,
      },
      {
        reachable:
          false,
        status:
          "timeout",
      }
    );

    assert.equal(
      JSON.stringify(
        result
      ).includes(
        "camera-password"
      ),
      false
    );
  }
);

test(
  "probe classifies common network failures",
  async () => {
    const cases = [
      [
        "ENOTFOUND",
        "dns_error",
      ],
      [
        "EAI_AGAIN",
        "dns_error",
      ],
      [
        "ECONNREFUSED",
        "connection_refused",
      ],
      [
        "ENETUNREACH",
        "network_unreachable",
      ],
      [
        "EHOSTUNREACH",
        "network_unreachable",
      ],
    ];

    for (
      const [
        code,
        expected,
      ] of cases
    ) {
      assert.equal(
        classifyCameraConnectivityError(
          errorWithCode(
            code
          )
        ),
        expected
      );

      const result =
        await probeCameraConnectivity(
          {
            host:
              "camera.local",
            port:
              554,
          },
          async () => {
            throw errorWithCode(
              code
            );
          }
        );

      assert.equal(
        result.reachable,
        false
      );

      assert.equal(
        result.status,
        expected
      );
    }
  }
);

test(
  "unknown network errors collapse to a sanitized status",
  async () => {
    const result =
      await probeCameraConnectivity(
        {
          host:
            "camera.local",
          port:
            8554,
        },
        async () => {
          throw new Error(
            "username=admin password=secret-value"
          );
        }
      );

    assert.equal(
      result.reachable,
      false
    );

    assert.equal(
      result.status,
      "connection_error"
    );

    const serialized =
      JSON.stringify(
        result
      );

    assert.equal(
      serialized.includes(
        "admin"
      ),
      false
    );

    assert.equal(
      serialized.includes(
        "secret-value"
      ),
      false
    );
  }
);

test(
  "probe rejects URL or credential material in host input",
  async () => {
    await assert.rejects(
      () =>
        probeCameraConnectivity({
          host:
            "admin:secret@camera.local",
          port:
            554,
        }),
      CameraConnectivityProbeInputError
    );

    await assert.rejects(
      () =>
        probeCameraConnectivity({
          host:
            "rtsp://camera.local/live",
          port:
            554,
        }),
      CameraConnectivityProbeInputError
    );
  }
);

test(
  "probe validates port and timeout bounds",
  async () => {
    await assert.rejects(
      () =>
        probeCameraConnectivity({
          host:
            "camera.local",
          port:
            0,
        }),
      CameraConnectivityProbeInputError
    );

    await assert.rejects(
      () =>
        probeCameraConnectivity({
          host:
            "camera.local",
          port:
            65536,
        }),
      CameraConnectivityProbeInputError
    );

    await assert.rejects(
      () =>
        probeCameraConnectivity({
          host:
            "camera.local",
          port:
            554,
          timeoutMs:
            50,
        }),
      CameraConnectivityProbeInputError
    );

    await assert.rejects(
      () =>
        probeCameraConnectivity({
          host:
            "camera.local",
          port:
            554,
          timeoutMs:
            20000,
        }),
      CameraConnectivityProbeInputError
    );
  }
);
