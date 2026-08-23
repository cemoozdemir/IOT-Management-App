const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const http =
  require("node:http");

process.env.DB_NAME =
  "media_reconciliation_test";
process.env.DB_USER =
  "media_reconciliation_user";
process.env.DB_PASS =
  "media_reconciliation_password";
process.env.DB_HOST =
  "127.0.0.1";

process.env.CAMERA_SOURCE_KEY =
  "33".repeat(32);

const {
  reconcileCameraMediaState,
  detachCameraMediaState,
} = require(
  "../dist/services/cameraMediaReconciliationService.js"
);

const listen =
  (server) =>
    new Promise(
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
          () => {
            server.removeListener(
              "error",
              reject
            );

            resolve();
          }
        );
      }
    );

const close =
  (server) =>
    new Promise(
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

const makeCamera =
  (
    overrides = {}
  ) => ({
    streamPath:
      "cam_reconcile0123456789",
    enabled:
      true,
    sourceScheme:
      "rtsp",
    sourceHost:
      "192.168.1.20",
    sourcePort:
      554,
    sourcePath:
      "/live",
    authCiphertext:
      null,
    authIv:
      null,
    authTag:
      null,
    lastError:
      "previous-error",

    async update(
      values
    ) {
      Object.assign(
        this,
        values
      );

      return this;
    },

    ...overrides,
  });

test(
  "enabled camera is configured and clears reconciliation error",
  async () => {
    const configured =
      new Set();

    const server =
      http.createServer(
        (
          request,
          response
        ) => {
          const pathname =
            new URL(
              request.url,
              "http://127.0.0.1"
            ).pathname;

          const prefix =
            "/v3/config/paths/";

          if (
            !pathname.startsWith(
              prefix
            )
          ) {
            response.statusCode =
              404;
            response.end();
            return;
          }

          const parts =
            pathname
              .slice(
                prefix.length
              )
              .split("/");

          const operation =
            parts[0];

          const streamPath =
            decodeURIComponent(
              parts
                .slice(1)
                .join("/")
            );

          if (
            request.method ===
              "GET" &&
            operation ===
              "get"
          ) {
            response.statusCode =
              configured.has(
                streamPath
              )
                ? 200
                : 404;

            response.end();
            return;
          }

          if (
            request.method ===
              "POST" &&
            operation ===
              "add"
          ) {
            configured.add(
              streamPath
            );

            response.statusCode =
              200;
            response.end();
            return;
          }

          if (
            request.method ===
              "PATCH" &&
            operation ===
              "patch"
          ) {
            response.statusCode =
              configured.has(
                streamPath
              )
                ? 200
                : 404;

            response.end();
            return;
          }

          if (
            request.method ===
              "DELETE" &&
            operation ===
              "delete"
          ) {
            configured.delete(
              streamPath
            );

            response.statusCode =
              200;
            response.end();
            return;
          }

          response.statusCode =
            404;
          response.end();
        }
      );

    await listen(
      server
    );

    try {
      const address =
        server.address();

      assert.ok(
        address &&
        typeof address !==
          "string"
      );

      process.env
        .MEDIA_GATEWAY_API_URL =
        `http://127.0.0.1:${address.port}`;

      const camera =
        makeCamera();

      const result =
        await reconcileCameraMediaState(
          camera
        );

      assert.equal(
        result.ok,
        true
      );

      assert.equal(
        result.action,
        "configure"
      );

      assert.equal(
        camera.lastError,
        null
      );

      assert.equal(
        configured.has(
          camera.streamPath
        ),
        true
      );

      camera.enabled =
        false;

      const disabled =
        await reconcileCameraMediaState(
          camera
        );

      assert.equal(
        disabled.ok,
        true
      );

      assert.equal(
        disabled.action,
        "remove"
      );

      assert.equal(
        configured.has(
          camera.streamPath
        ),
        false
      );
    } finally {
      delete process.env
        .MEDIA_GATEWAY_API_URL;

      await close(
        server
      );
    }
  }
);

test(
  "gateway errors are stored as sanitized camera state",
  async () => {
    const server =
      http.createServer(
        (
          _request,
          response
        ) => {
          response.statusCode =
            500;

          response.end(
            "rtsp://user:secret@camera/private"
          );
        }
      );

    await listen(
      server
    );

    try {
      const address =
        server.address();

      assert.ok(
        address &&
        typeof address !==
          "string"
      );

      process.env
        .MEDIA_GATEWAY_API_URL =
        `http://127.0.0.1:${address.port}`;

      const camera =
        makeCamera();

      const result =
        await reconcileCameraMediaState(
          camera
        );

      assert.equal(
        result.ok,
        false
      );

      assert.equal(
        result.errorCode,
        "gateway_error"
      );

      assert.equal(
        camera.lastError,
        "Media gateway reconciliation failed"
      );

      assert.equal(
        camera.lastError.includes(
          "secret"
        ),
        false
      );
    } finally {
      delete process.env
        .MEDIA_GATEWAY_API_URL;

      await close(
        server
      );
    }
  }
);

test(
  "camera deletion is blocked when gateway detach fails",
  async () => {
    const server =
      http.createServer(
        (
          _request,
          response
        ) => {
          response.statusCode =
            500;
          response.end();
        }
      );

    await listen(
      server
    );

    try {
      const address =
        server.address();

      assert.ok(
        address &&
        typeof address !==
          "string"
      );

      process.env
        .MEDIA_GATEWAY_API_URL =
        `http://127.0.0.1:${address.port}`;

      const camera =
        makeCamera();

      const result =
        await detachCameraMediaState(
          camera
        );

      assert.equal(
        result.ok,
        false
      );

      assert.equal(
        camera.lastError,
        "Media gateway reconciliation failed"
      );
    } finally {
      delete process.env
        .MEDIA_GATEWAY_API_URL;

      await close(
        server
      );
    }
  }
);
