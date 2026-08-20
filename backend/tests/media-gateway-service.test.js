const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const http =
  require("node:http");

process.env.DB_NAME =
  "media_gateway_test";
process.env.DB_USER =
  "media_gateway_user";
process.env.DB_PASS =
  "media_gateway_password";
process.env.DB_HOST =
  "127.0.0.1";

process.env.CAMERA_SOURCE_KEY =
  "22".repeat(32);

const {
  CameraSourceInputError,
  parseCameraSourceUrl,
} = require(
  "../dist/utils/cameraSourceConfig.js"
);

const {
  MediaGatewayError,
  buildCameraSourceUrl,
  buildMediaGatewayPathConfig,
  ensureMediaGatewayPath,
  isMediaGatewayHealthy,
  removeMediaGatewayPath,
} = require(
  "../dist/services/mediaGatewayService.js"
);

const listen =
  (
    server
  ) =>
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
  (
    server
  ) =>
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

const readRequestBody =
  (
    request
  ) =>
    new Promise(
      (
        resolve,
        reject
      ) => {
        const chunks = [];

        request.on(
          "data",
          (chunk) => {
            chunks.push(
              Buffer.from(
                chunk
              )
            );
          }
        );

        request.once(
          "end",
          () => {
            resolve(
              Buffer.concat(
                chunks
              ).toString(
                "utf8"
              )
            );
          }
        );

        request.once(
          "error",
          reject
        );
      }
    );

test(
  "camera source requires username and password together",
  () => {
    assert.throws(
      () =>
        parseCameraSourceUrl(
          "rtsp://camera-user@192.168.1.20/live"
        ),
      CameraSourceInputError
    );

    assert.throws(
      () =>
        parseCameraSourceUrl(
          "rtsp://:camera-pass@192.168.1.20/live"
        ),
      CameraSourceInputError
    );
  }
);

test(
  "media gateway client adds updates and removes an on-demand RTSP path",
  async () => {
    const requests = [];
    const configuredPaths =
      new Set();

    const server =
      http.createServer(
        async (
          request,
          response
        ) => {
          const body =
            await readRequestBody(
              request
            );

          const pathname =
            new URL(
              request.url,
              "http://127.0.0.1"
            ).pathname;

          requests.push({
            method:
              request.method,
            pathname,
            body,
          });

          if (
            request.method ===
              "GET" &&
            pathname ===
              "/v3/info"
          ) {
            response.statusCode =
              200;

            response.setHeader(
              "Content-Type",
              "application/json"
            );

            response.end(
              JSON.stringify({
                version:
                  "1.19.2",
              })
            );

            return;
          }

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
            operation ===
              "get" &&
            request.method ===
              "GET"
          ) {
            response.statusCode =
              configuredPaths.has(
                streamPath
              )
                ? 200
                : 404;

            response.end();
            return;
          }

          if (
            operation ===
              "add" &&
            request.method ===
              "POST"
          ) {
            if (
              streamPath ===
              "cam_error0123456789abcdef"
            ) {
              response.statusCode =
                400;

              // Simulate an upstream validation
              // response that contains a secret.
              response.end(
                "invalid rtsp://user:topsecret@camera/live"
              );

              return;
            }

            configuredPaths.add(
              streamPath
            );

            response.statusCode =
              200;
            response.end();
            return;
          }

          if (
            operation ===
              "patch" &&
            request.method ===
              "PATCH"
          ) {
            response.statusCode =
              configuredPaths.has(
                streamPath
              )
                ? 200
                : 404;

            response.end();
            return;
          }

          if (
            operation ===
              "delete" &&
            request.method ===
              "DELETE"
          ) {
            const existed =
              configuredPaths.delete(
                streamPath
              );

            response.statusCode =
              existed
                ? 200
                : 404;

            response.end();
            return;
          }

          response.statusCode =
            400;
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

      const parsed =
        parseCameraSourceUrl(
          "rtsp://cam%40user:p%40ss@192.168.1.20:8554/live/main?token=abc123"
        );

      const camera = {
        streamPath:
          "cam_0123456789abcdef01234567",
        enabled:
          true,
        ...parsed,
      };

      const sourceUrl =
        buildCameraSourceUrl(
          camera
        );

      const source =
        new URL(
          sourceUrl
        );

      assert.equal(
        source.protocol,
        "rtsp:"
      );

      assert.equal(
        decodeURIComponent(
          source.username
        ),
        "cam@user"
      );

      assert.equal(
        decodeURIComponent(
          source.password
        ),
        "p@ss"
      );

      assert.equal(
        source.hostname,
        "192.168.1.20"
      );

      assert.equal(
        source.port,
        "8554"
      );

      assert.equal(
        source.pathname,
        "/live/main"
      );

      assert.equal(
        source.search,
        "?token=abc123"
      );

      const pathConfig =
        buildMediaGatewayPathConfig(
          camera
        );

      assert.equal(
        pathConfig.source,
        sourceUrl
      );

      assert.equal(
        pathConfig.sourceOnDemand,
        true
      );

      assert.equal(
        pathConfig.sourceOnDemandStartTimeout,
        "10s"
      );

      assert.equal(
        pathConfig.sourceOnDemandCloseAfter,
        "15s"
      );

      assert.equal(
        pathConfig.maxReaders,
        4
      );

      assert.equal(
        pathConfig.record,
        false
      );

      assert.equal(
        pathConfig.rtspTransport,
        "tcp"
      );

      assert.equal(
        await ensureMediaGatewayPath(
          camera
        ),
        "added"
      );

      const addRequest =
        requests.find(
          (request) =>
            request.method ===
              "POST" &&
            request.pathname ===
              `/v3/config/paths/add/${camera.streamPath}`
        );

      assert.ok(
        addRequest
      );

      const addBody =
        JSON.parse(
          addRequest.body
        );

      assert.equal(
        addBody.source,
        sourceUrl
      );

      assert.equal(
        addBody.sourceOnDemand,
        true
      );

      assert.equal(
        addBody.rtspTransport,
        "tcp"
      );

      assert.equal(
        await ensureMediaGatewayPath(
          camera
        ),
        "updated"
      );

      assert.ok(
        requests.some(
          (request) =>
            request.method ===
              "PATCH" &&
            request.pathname ===
              `/v3/config/paths/patch/${camera.streamPath}`
        )
      );

      assert.equal(
        await isMediaGatewayHealthy(),
        true
      );

      assert.equal(
        await ensureMediaGatewayPath({
          ...camera,
          enabled:
            false,
        }),
        "removed"
      );

      assert.equal(
        await removeMediaGatewayPath(
          camera.streamPath
        ),
        false
      );

      const secretParsed =
        parseCameraSourceUrl(
          "rtsp://user:topsecret@192.168.1.30/live"
        );

      const secretCamera = {
        streamPath:
          "cam_error0123456789abcdef",
        enabled:
          true,
        ...secretParsed,
      };

      await assert.rejects(
        () =>
          ensureMediaGatewayPath(
            secretCamera
          ),
        (error) => {
          assert.equal(
            error instanceof
              MediaGatewayError,
            true
          );

          assert.equal(
            String(
              error.message
            ).includes(
              "topsecret"
            ),
            false
          );

          assert.equal(
            String(
              error.message
            ).includes(
              "rtsp://"
            ),
            false
          );

          return true;
        }
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
  "media gateway api refuses non-loopback endpoints",
  async () => {
    process.env
      .MEDIA_GATEWAY_API_URL =
      "http://example.com:9997";

    try {
      assert.equal(
        await isMediaGatewayHealthy(),
        false
      );
    } finally {
      delete process.env
        .MEDIA_GATEWAY_API_URL;
    }
  }
);
