const test =
  require("node:test");

const assert =
  require("node:assert/strict");

process.env.DB_NAME =
  "telemetry_test_db";
process.env.DB_USER =
  "telemetry_test_user";
process.env.DB_PASS =
  "telemetry_test_password";
process.env.DB_HOST =
  "127.0.0.1";
process.env.JWT_SECRET =
  "telemetry-test-jwt-secret";

const sequelize =
  require(
    "../dist/config/database.js"
  ).default;

const Device =
  require(
    "../dist/models/Device.js"
  ).default;

const DeviceTelemetry =
  require(
    "../dist/models/DeviceTelemetry.js"
  ).default;

const {
  authenticateDevice,
} = require(
  "../dist/middleware/deviceAuthMiddleware.js"
);

const router =
  require(
    "../dist/routes/telemetry.js"
  ).default;

const routeLayer =
  router.stack.find(
    (candidate) =>
      candidate.route &&
      candidate.route.path ===
        "/" &&
      candidate.route.methods.post
  );

assert.ok(
  routeLayer,
  "POST / telemetry route missing"
);

assert.equal(
  routeLayer.route.stack[0]
    .handle,
  authenticateDevice,
  "telemetry route must use device authentication"
);

const handler =
  routeLayer.route.stack[
    routeLayer.route.stack.length -
      1
  ].handle;

const createResponse = () => {
  const state = {
    statusCode: 200,
    body: null,
  };

  return {
    state,
    response: {
      status(code) {
        state.statusCode =
          code;
        return this;
      },

      json(body) {
        state.body =
          body;
        return this;
      },
    },
  };
};

const eventId =
  "550e8400-e29b-41d4-a716-446655440000";

const createTelemetryRecord = (
  overrides = {}
) => ({
  id:
    "telemetry-id",
  deviceId:
    "device-id",
  eventId,
  metric:
    "temperature",
  value:
    21.5,
  unit:
    "C",
  recordedAt:
    new Date(
      "2026-08-22T10:00:00.000Z"
    ),
  receivedAt:
    new Date(
      "2026-08-22T10:00:01.000Z"
    ),
  ...overrides,
});

test(
  "authenticated telemetry is validated, idempotent, and updates lastSeenAt",
  async () => {
    const originalTransaction =
      sequelize.transaction;

    const originalFindOrCreate =
      DeviceTelemetry.findOrCreate;

    const originalDeviceUpdate =
      Device.update;

    try {
      const transactions = [];

      sequelize.transaction =
        async (callback) => {
          const transaction = {
            id:
              `tx-${transactions.length + 1}`,
          };

          transactions.push(
            transaction
          );

          return callback(
            transaction
          );
        };

      const findCalls = [];
      const deviceUpdates = [];

      DeviceTelemetry.findOrCreate =
        async (options) => {
          findCalls.push(
            options
          );

          return [
            createTelemetryRecord(),
            true,
          ];
        };

      Device.update =
        async (
          values,
          options
        ) => {
          deviceUpdates.push({
            values,
            options,
          });

          return [1];
        };

      const created =
        createResponse();

      let nextError = null;

      await handler(
        {
          device: {
            id:
              "device-id",
            credentialId:
              "credential-id",
          },
          body: {
            eventId,
            metric:
              " Temperature ",
            value:
              21.5,
            unit:
              "C",
            recordedAt:
              "2026-08-22T10:00:00.000Z",
          },
        },
        created.response,
        (error) => {
          nextError =
            error || null;
        }
      );

      assert.equal(
        nextError,
        null
      );

      assert.equal(
        created
          .state
          .statusCode,
        201
      );

      assert.equal(
        created
          .state
          .body
          .accepted,
        true
      );

      assert.equal(
        created
          .state
          .body
          .duplicate,
        false
      );

      assert.equal(
        findCalls[0]
          .where
          .deviceId,
        "device-id"
      );

      assert.equal(
        findCalls[0]
          .where
          .eventId,
        eventId
      );

      assert.equal(
        findCalls[0]
          .defaults
          .metric,
        "temperature"
      );

      assert.equal(
        findCalls[0]
          .defaults
          .value,
        21.5
      );

      assert.equal(
        findCalls[0]
          .transaction,
        transactions[0]
      );

      assert.equal(
        deviceUpdates.length,
        1
      );

      assert.ok(
        deviceUpdates[0]
          .values
          .lastSeenAt instanceof Date
      );

      assert.deepEqual(
        deviceUpdates[0]
          .options
          .where,
        {
          id:
            "device-id",
        }
      );

      assert.equal(
        deviceUpdates[0]
          .options
          .transaction,
        transactions[0]
      );

      DeviceTelemetry.findOrCreate =
        async () => [
          createTelemetryRecord(),
          false,
        ];

      const duplicate =
        createResponse();

      await handler(
        {
          device: {
            id:
              "device-id",
            credentialId:
              "credential-id",
          },
          body: {
            eventId,
            metric:
              "temperature",
            value:
              21.5,
            unit:
              "C",
            recordedAt:
              "2026-08-22T10:00:00.000Z",
          },
        },
        duplicate.response,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );

      assert.equal(
        duplicate
          .state
          .statusCode,
        200
      );

      assert.equal(
        duplicate
          .state
          .body
          .duplicate,
        true
      );

      const updatesBeforeConflict =
        deviceUpdates.length;

      DeviceTelemetry.findOrCreate =
        async () => [
          createTelemetryRecord({
            value:
              22.75,
          }),
          false,
        ];

      const conflict =
        createResponse();

      await handler(
        {
          device: {
            id:
              "device-id",
            credentialId:
              "credential-id",
          },
          body: {
            eventId,
            metric:
              "temperature",
            value:
              21.5,
            unit:
              "C",
            recordedAt:
              "2026-08-22T10:00:00.000Z",
          },
        },
        conflict.response,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );

      assert.equal(
        conflict
          .state
          .statusCode,
        409
      );

      assert.equal(
        deviceUpdates.length,
        updatesBeforeConflict
      );

      const invalid =
        createResponse();

      let dbCalledForInvalid =
        false;

      DeviceTelemetry.findOrCreate =
        async () => {
          dbCalledForInvalid =
            true;

          throw new Error(
            "DB should not be called"
          );
        };

      await handler(
        {
          device: {
            id:
              "device-id",
            credentialId:
              "credential-id",
          },
          body: {
            eventId:
              "not-a-uuid",
            metric:
              "temperature",
            value:
              21.5,
          },
        },
        invalid.response,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );

      assert.equal(
        invalid
          .state
          .statusCode,
        400
      );

      assert.equal(
        dbCalledForInvalid,
        false
      );

      const missingIdentity =
        createResponse();

      await handler(
        {
          body: {
            eventId,
            metric:
              "temperature",
            value:
              21.5,
          },
        },
        missingIdentity.response,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );

      assert.equal(
        missingIdentity
          .state
          .statusCode,
        401
      );
    } finally {
      sequelize.transaction =
        originalTransaction;

      DeviceTelemetry.findOrCreate =
        originalFindOrCreate;

      Device.update =
        originalDeviceUpdate;
    }
  }
);
