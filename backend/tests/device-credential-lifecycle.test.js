const test =
  require("node:test");

const assert =
  require("node:assert/strict");

process.env.DB_NAME =
  "device_lifecycle_test_db";
process.env.DB_USER =
  "device_lifecycle_test_user";
process.env.DB_PASS =
  "device_lifecycle_test_password";
process.env.DB_HOST =
  "127.0.0.1";
process.env.JWT_SECRET =
  "device-lifecycle-test-jwt-secret";

const sequelize =
  require(
    "../dist/config/database.js"
  ).default;

const Device =
  require(
    "../dist/models/Device.js"
  ).default;

const DeviceCredential =
  require(
    "../dist/models/DeviceCredential.js"
  ).default;

const router =
  require(
    "../dist/routes/device.js"
  ).default;

const getHandler = (
  path,
  method
) => {
  const layer =
    router.stack.find(
      (candidate) =>
        candidate.route &&
        candidate.route.path ===
          path &&
        candidate.route.methods[
          method
        ]
    );

  assert.ok(
    layer,
    `route missing: ${method.toUpperCase()} ${path}`
  );

  const stack =
    layer.route.stack;

  return stack[
    stack.length - 1
  ].handle;
};

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

test(
  "device lifecycle issues one-time credentials and protects rotate/revoke by ownership",
  async () => {
    const originalTransaction =
      sequelize.transaction;

    const originalCreate =
      Device.create;

    const originalFindOne =
      Device.findOne;

    const originalCredentialCreate =
      DeviceCredential.create;

    const originalCredentialUpdate =
      DeviceCredential.update;

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

      const persistedCredentialValues =
        [];

      DeviceCredential.create =
        async (
          values,
          options
        ) => {
          persistedCredentialValues.push({
            values: {
              ...values,
            },
            transaction:
              options?.transaction,
          });

          assert.equal(
            Object.prototype.hasOwnProperty.call(
              values,
              "rawCredential"
            ),
            false
          );

          assert.equal(
            Object.prototype.hasOwnProperty.call(
              values,
              "secret"
            ),
            false
          );

          assert.match(
            values.lookupId,
            /^[a-f0-9]{24}$/
          );

          assert.match(
            values.secretHash,
            /^[a-f0-9]{64}$/
          );

          return {
            id:
              `credential-${persistedCredentialValues.length}`,
          };
        };

      let createdDeviceValues = null;
      let createdDeviceTransaction = null;

      Device.create =
        async (
          values,
          options
        ) => {
          createdDeviceValues = {
            ...values,
          };

          createdDeviceTransaction =
            options?.transaction;

          return {
            id:
              "device-created",
            ...values,

            toJSON() {
              return {
                id:
                  "device-created",
                ...values,

                // Deliberately contradictory legacy
                // storage value. API serialization
                // must ignore it and derive presence
                // from lastSeenAt.
                status:
                  "online",
                lastSeenAt:
                  null,
              };
            },
          };
        };

      const createHandler =
        getHandler(
          "/",
          "post"
        );

      const createResult =
        createResponse();

      let createNextError = null;

      await createHandler(
        {
          user: {
            id:
              "owner-user",
          },
          body: {
            name:
              "  Living Room  ",
            type:
              "  ESP32  ",
          },
        },
        createResult.response,
        (error) => {
          createNextError =
            error || null;
        }
      );

      assert.equal(
        createNextError,
        null
      );

      assert.equal(
        createResult
          .state
          .statusCode,
        201
      );

      assert.deepEqual(
        createdDeviceValues,
        {
          name:
            "Living Room",
          type:
            "ESP32",
          userId:
            "owner-user",
        }
      );

      assert.equal(
        Object.prototype.hasOwnProperty.call(
          createdDeviceValues,
          "status"
        ),
        false,
        "device creation must not persist application-managed presence status"
      );

      assert.equal(
        createResult
          .state
          .body
          .device
          .status,
        "offline",
        "new devices must be presented offline until authenticated telemetry is received"
      );

      assert.equal(
        createdDeviceTransaction,
        transactions[0]
      );

      assert.equal(
        persistedCredentialValues[0]
          .transaction,
        transactions[0]
      );

      assert.match(
        createResult
          .state
          .body
          .credential
          .value,
        /^iot_dev_[a-f0-9]{24}\.[A-Za-z0-9_-]{43}$/
      );

      assert.equal(
        createResult
          .state
          .body
          .credential
          .shownOnce,
        true
      );

      assert.equal(
        createResult
          .state
          .body
          .credential
          .credentialId,
        "credential-1"
      );

      assert.equal(
        JSON.stringify(
          persistedCredentialValues
        ).includes(
          createResult
            .state
            .body
            .credential
            .value
        ),
        false,
        "raw credential must never enter persistence payloads"
      );

      const ownershipQueries = [];

      Device.findOne =
        async (options) => {
          ownershipQueries.push(
            options.where
          );

          return {
            id:
              "owned-device",
          };
        };

      const revocations = [];

      DeviceCredential.update =
        async (
          values,
          options
        ) => {
          revocations.push({
            values,
            where:
              options.where,
            transaction:
              options.transaction,
          });

          return [1];
        };

      const rotateHandler =
        getHandler(
          "/:id/credential/rotate",
          "post"
        );

      const rotateResult =
        createResponse();

      await rotateHandler(
        {
          user: {
            id:
              "owner-user",
          },
          params: {
            id:
              "owned-device",
          },
        },
        rotateResult.response,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );

      assert.equal(
        rotateResult
          .state
          .statusCode,
        201
      );

      assert.deepEqual(
        ownershipQueries[0],
        {
          id:
            "owned-device",
          userId:
            "owner-user",
        }
      );

      assert.equal(
        revocations[0]
          .where
          .deviceId,
        "owned-device"
      );

      assert.equal(
        revocations[0]
          .where
          .revokedAt,
        null
      );

      assert.ok(
        revocations[0]
          .values
          .revokedAt instanceof Date
      );

      assert.match(
        rotateResult
          .state
          .body
          .credential
          .value,
        /^iot_dev_[a-f0-9]{24}\.[A-Za-z0-9_-]{43}$/
      );

      assert.equal(
        rotateResult
          .state
          .body
          .credential
          .shownOnce,
        true
      );

      const revokeHandler =
        getHandler(
          "/:id/credential",
          "delete"
        );

      const revokeResult =
        createResponse();

      await revokeHandler(
        {
          user: {
            id:
              "owner-user",
          },
          params: {
            id:
              "owned-device",
          },
        },
        revokeResult.response,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );

      assert.deepEqual(
        ownershipQueries[1],
        {
          id:
            "owned-device",
          userId:
            "owner-user",
        }
      );

      assert.deepEqual(
        revokeResult
          .state
          .body,
        {
          revoked: true,
        }
      );

      Device.findOne =
        async (options) => {
          assert.deepEqual(
            options.where,
            {
              id:
                "foreign-device",
              userId:
                "owner-user",
            }
          );

          return null;
        };

      const foreignResult =
        createResponse();

      const revocationCountBefore =
        revocations.length;

      const credentialCreateCountBefore =
        persistedCredentialValues.length;

      await rotateHandler(
        {
          user: {
            id:
              "owner-user",
          },
          params: {
            id:
              "foreign-device",
          },
        },
        foreignResult.response,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );

      assert.equal(
        foreignResult
          .state
          .statusCode,
        404
      );

      assert.deepEqual(
        foreignResult
          .state
          .body,
        {
          error:
            "Device not found",
        }
      );

      assert.equal(
        revocations.length,
        revocationCountBefore
      );

      assert.equal(
        persistedCredentialValues.length,
        credentialCreateCountBefore
      );
    } finally {
      sequelize.transaction =
        originalTransaction;

      Device.create =
        originalCreate;

      Device.findOne =
        originalFindOne;

      DeviceCredential.create =
        originalCredentialCreate;

      DeviceCredential.update =
        originalCredentialUpdate;
    }
  }
);
