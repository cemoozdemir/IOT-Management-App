const test =
  require("node:test");

const assert =
  require("node:assert/strict");

process.env.DB_NAME =
  "device_auth_test_db";
process.env.DB_USER =
  "device_auth_test_user";
process.env.DB_PASS =
  "device_auth_test_password";
process.env.DB_HOST =
  "127.0.0.1";
process.env.JWT_SECRET =
  "device-auth-test-jwt-secret";

const {
  generateDeviceCredential,
} = require(
  "../dist/utils/deviceCredential.js"
);

const {
  authenticateDevice,
} = require(
  "../dist/middleware/deviceAuthMiddleware.js"
);

const DeviceCredential =
  require(
    "../dist/models/DeviceCredential.js"
  ).default;

const createResponse = () => {
  const state = {
    statusCode: null,
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
  "device authentication accepts only valid active Device credentials",
  async () => {
    const generated =
      generateDeviceCredential();

    const originalFindOne =
      DeviceCredential.findOne;

    try {
      let lastUsedAt = null;

      DeviceCredential.findOne =
        async (options) => {
          assert.equal(
            options.where.lookupId,
            generated.lookupId
          );

          assert.equal(
            options.where.revokedAt,
            null
          );

          return {
            id:
              "credential-id",
            deviceId:
              "device-id",
            secretHash:
              generated.secretHash,

            async update(values) {
              lastUsedAt =
                values.lastUsedAt;
            },
          };
        };

      const request = {
        headers: {
          authorization:
            `Device ${generated.rawCredential}`,
        },
      };

      const result =
        createResponse();

      let nextCalled = false;

      await authenticateDevice(
        request,
        result.response,
        () => {
          nextCalled = true;
        }
      );

      assert.equal(
        nextCalled,
        true
      );

      assert.deepEqual(
        request.device,
        {
          id:
            "device-id",
          credentialId:
            "credential-id",
        }
      );

      assert.ok(
        lastUsedAt instanceof Date
      );

      const missing =
        createResponse();

      let missingNext = false;

      await authenticateDevice(
        {
          headers: {},
        },
        missing.response,
        () => {
          missingNext = true;
        }
      );

      assert.equal(
        missingNext,
        false
      );

      assert.equal(
        missing.state.statusCode,
        401
      );

      const wrongScheme =
        createResponse();

      await authenticateDevice(
        {
          headers: {
            authorization:
              `Bearer ${generated.rawCredential}`,
          },
        },
        wrongScheme.response,
        () => {
          throw new Error(
            "Unexpected next"
          );
        }
      );

      assert.equal(
        wrongScheme.state.statusCode,
        401
      );

      const parts =
        generated.rawCredential
          .split(".");

      const tamperedSecret =
        (
          parts[1][0] === "A"
            ? "B"
            : "A"
        ) +
        parts[1].slice(1);

      const tampered =
        `${parts[0]}.${tamperedSecret}`;

      const tamperedResult =
        createResponse();

      let tamperedNext = false;

      await authenticateDevice(
        {
          headers: {
            authorization:
              `Device ${tampered}`,
          },
        },
        tamperedResult.response,
        () => {
          tamperedNext = true;
        }
      );

      assert.equal(
        tamperedNext,
        false
      );

      assert.equal(
        tamperedResult.state.statusCode,
        401
      );

      assert.deepEqual(
        tamperedResult.state.body,
        {
          error:
            "Invalid device credential",
        }
      );

      DeviceCredential.findOne =
        async () => null;

      const revokedOrUnknown =
        createResponse();

      await authenticateDevice(
        {
          headers: {
            authorization:
              `Device ${generated.rawCredential}`,
          },
        },
        revokedOrUnknown.response,
        () => {
          throw new Error(
            "Unexpected next"
          );
        }
      );

      assert.equal(
        revokedOrUnknown
          .state
          .statusCode,
        401
      );
    } finally {
      DeviceCredential.findOne =
        originalFindOne;
    }
  }
);
