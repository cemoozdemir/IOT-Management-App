const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const fs =
  require("node:fs");

const path =
  require("node:path");

process.env.DB_NAME =
  "security_hardening_db";

process.env.DB_USER =
  "security_hardening_user";

process.env.DB_PASS =
  "security_hardening_password";

process.env.DB_HOST =
  "127.0.0.1";

process.env.JWT_SECRET =
  "security-hardening-test-secret";

const {
  MIN_PASSWORD_LENGTH,
  validateAuthBody,
  validateDeviceCreateBody,
  validateDeviceUpdateBody,
} = require(
  "../dist/utils/requestValidation.js"
);

const {
  RATE_LIMITS,
  deviceTelemetryRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  userMutationRateLimiter,
  userReadRateLimiter,
} = require(
  "../dist/middleware/rateLimits.js"
);

const User =
  require(
    "../dist/models/User.js"
  ).default;

const {
  registerHandler,
} = require(
  "../dist/routes/auth.js"
);

const authRouter =
  require(
    "../dist/routes/auth.js"
  ).default;

const deviceRouter =
  require(
    "../dist/routes/device.js"
  ).default;

const telemetryRouter =
  require(
    "../dist/routes/telemetry.js"
  ).default;

const routeFor = (
  router,
  routePath,
  method
) => {
  return router.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path ===
        routePath &&
      layer.route.methods[
        method
      ]
  );
};

test(
  "authentication input is normalized and bounded",
  () => {
    const registration =
      validateAuthBody(
        {
          email:
            "  USER@Example.COM  ",
          password:
            "correct-horse-123",
          role:
            "admin",
        },
        "register"
      );

    assert.equal(
      registration.ok,
      true
    );

    assert.equal(
      registration.value.email,
      "user@example.com"
    );

    assert.equal(
      registration.value.password,
      "correct-horse-123"
    );

    const tooShort =
      validateAuthBody(
        {
          email:
            "user@example.com",
          password:
            "short",
        },
        "register"
      );

    assert.equal(
      tooShort.ok,
      false
    );

    assert.equal(
      MIN_PASSWORD_LENGTH,
      12
    );

    const oldLoginPassword =
      validateAuthBody(
        {
          email:
            "user@example.com",
          password:
            "legacy",
        },
        "login"
      );

    assert.equal(
      oldLoginPassword.ok,
      true,
      "login must remain compatible with existing shorter passwords"
    );

    const tooLong =
      validateAuthBody(
        {
          email:
            "user@example.com",
          password:
            "x".repeat(
              129
            ),
        },
        "login"
      );

    assert.equal(
      tooLong.ok,
      false
    );
  }
);

test(
  "device metadata is normalized and bounded",
  () => {
    const created =
      validateDeviceCreateBody(
        {
          name:
            "  Kitchen Sensor  ",
          type:
            "  ESP32  ",
        }
      );

    assert.deepEqual(
      created,
      {
        ok:
          true,
        value: {
          name:
            "Kitchen Sensor",
          type:
            "ESP32",
        },
      }
    );

    const controls =
      validateDeviceCreateBody(
        {
          name:
            "bad\u0000name",
          type:
            "sensor",
        }
      );

    assert.equal(
      controls.ok,
      false
    );

    const tooLong =
      validateDeviceCreateBody(
        {
          name:
            "x".repeat(
              101
            ),
          type:
            "sensor",
        }
      );

    assert.equal(
      tooLong.ok,
      false
    );

    const statusWrite =
      validateDeviceUpdateBody(
        {
          status:
            "online",
        }
      );

    assert.equal(
      statusWrite.ok,
      false
    );

    assert.equal(
      statusWrite.error,
      "Device status is derived from telemetry"
    );

    const emptyUpdate =
      validateDeviceUpdateBody(
        {}
      );

    assert.equal(
      emptyUpdate.ok,
      false
    );
  }
);

test(
  "public registration normalizes email and never persists requested role",
  async () => {
    const originalFindOne =
      User.findOne;

    const originalCreate =
      User.create;

    let created =
      null;

    try {
      User.findOne =
        async () =>
          null;

      User.create =
        async (
          attributes
        ) => {
          created =
            attributes;

          return {
            id:
              "security-user",
            role:
              attributes.role,
          };
        };

      let statusCode =
        null;

      let responseBody =
        null;

      await registerHandler(
        {
          body: {
            email:
              "  MixedCase@Example.COM ",
            password:
              "correct-horse-123",
            role:
              "admin",
          },
        },
        {
          status(code) {
            statusCode =
              code;
            return this;
          },

          json(payload) {
            responseBody =
              payload;
            return this;
          },
        }
      );

      assert.equal(
        statusCode,
        201
      );

      assert.equal(
        created.email,
        "mixedcase@example.com"
      );

      assert.equal(
        created.role,
        "user"
      );

      assert.equal(
        responseBody.role,
        "user"
      );
    } finally {
      User.findOne =
        originalFindOne;

      User.create =
        originalCreate;
    }
  }
);

test(
  "sensitive routes have explicit rate-limit middleware",
  () => {
    const registerRoute =
      routeFor(
        authRouter,
        "/register",
        "post"
      );

    const loginRoute =
      routeFor(
        authRouter,
        "/login",
        "post"
      );

    const createDevice =
      routeFor(
        deviceRouter,
        "/",
        "post"
      );

    const listDevices =
      routeFor(
        deviceRouter,
        "/",
        "get"
      );

    const latestTelemetry =
      routeFor(
        telemetryRouter,
        "/latest",
        "get"
      );

    const ingestTelemetry =
      routeFor(
        telemetryRouter,
        "/",
        "post"
      );

    for (
      const route of [
        registerRoute,
        loginRoute,
        createDevice,
        listDevices,
        latestTelemetry,
        ingestTelemetry,
      ]
    ) {
      assert.ok(
        route
      );
    }

    assert.equal(
      registerRoute
        .route
        .stack[0]
        .handle,
      registerRateLimiter
    );

    assert.equal(
      loginRoute
        .route
        .stack[0]
        .handle,
      loginRateLimiter
    );

    assert.equal(
      createDevice
        .route
        .stack[1]
        .handle,
      userMutationRateLimiter
    );

    assert.equal(
      listDevices
        .route
        .stack[1]
        .handle,
      userReadRateLimiter
    );

    assert.equal(
      latestTelemetry
        .route
        .stack[1]
        .handle,
      userReadRateLimiter
    );

    assert.equal(
      ingestTelemetry
        .route
        .stack[1]
        .handle,
      deviceTelemetryRateLimiter
    );

    assert.equal(
      RATE_LIMITS.login.max,
      20
    );

    assert.equal(
      RATE_LIMITS.register.max,
      10
    );

    assert.equal(
      RATE_LIMITS.deviceTelemetry.max,
      300
    );
  }
);

test(
  "server shell bounds payloads, sanitizes errors, and exposes no WebSocket listener",
  () => {
    const serverSource =
      fs.readFileSync(
        path.join(
          __dirname,
          "../src/server.ts"
        ),
        "utf8"
      );

    const authSource =
      fs.readFileSync(
        path.join(
          __dirname,
          "../src/routes/auth.ts"
        ),
        "utf8"
      );

    assert.match(
      serverSource,
      /app\.set\(\s*"trust proxy",\s*1\s*\)/
    );

    assert.match(
      serverSource,
      /limit:\s*"16kb"/
    );

    assert.match(
      serverSource,
      /strict:\s*true/
    );

    assert.match(
      serverSource,
      /apiRateLimiter/
    );

    assert.match(
      serverSource,
      /entity\.too\.large/
    );

    assert.match(
      serverSource,
      /entity\.parse\.failed/
    );

    assert.match(
      serverSource,
      /Internal server error/
    );

    assert.doesNotMatch(
      serverSource,
      /from\s+["']ws["']/
    );

    assert.doesNotMatch(
      serverSource,
      /new\s+Server\s*\(/
    );

    assert.doesNotMatch(
      authSource,
      /JSON\.stringify\s*\(\s*err/
    );
  }
);
