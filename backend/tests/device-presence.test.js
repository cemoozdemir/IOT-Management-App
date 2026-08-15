const test =
  require("node:test");

const assert =
  require("node:assert/strict");

process.env.DB_NAME =
  "presence_test_db";
process.env.DB_USER =
  "presence_test_user";
process.env.DB_PASS =
  "presence_test_password";
process.env.DB_HOST =
  "127.0.0.1";
process.env.JWT_SECRET =
  "presence-test-jwt-secret";

const {
  DEVICE_ONLINE_WINDOW_MS,
  deriveDeviceStatus,
} = require(
  "../dist/utils/devicePresence.js"
);

const Device =
  require(
    "../dist/models/Device.js"
  ).default;

const router =
  require(
    "../dist/routes/device.js"
  ).default;

const getRoute =
  router.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path ===
        "/" &&
      layer.route.methods.get
  );

const putRoute =
  router.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path ===
        "/:id" &&
      layer.route.methods.put
  );

assert.ok(
  getRoute,
  "GET /devices route missing"
);

assert.ok(
  putRoute,
  "PUT /devices/:id route missing"
);

const getHandler =
  getRoute.route.stack[
    getRoute.route.stack.length -
      1
  ].handle;

const putHandler =
  putRoute.route.stack[
    putRoute.route.stack.length -
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

test(
  "presence derives online/offline only from lastSeenAt",
  () => {
    const now =
      new Date(
        "2026-08-22T12:00:00.000Z"
      );

    assert.equal(
      deriveDeviceStatus(
        null,
        now
      ),
      "offline"
    );

    assert.equal(
      deriveDeviceStatus(
        new Date(
          now.getTime() -
            1000
        ),
        now
      ),
      "online"
    );

    assert.equal(
      deriveDeviceStatus(
        new Date(
          now.getTime() -
            DEVICE_ONLINE_WINDOW_MS
        ),
        now
      ),
      "online"
    );

    assert.equal(
      deriveDeviceStatus(
        new Date(
          now.getTime() -
            DEVICE_ONLINE_WINDOW_MS -
            1
        ),
        now
      ),
      "offline"
    );

    assert.equal(
      deriveDeviceStatus(
        "not-a-date",
        now
      ),
      "offline"
    );

    assert.equal(
      deriveDeviceStatus(
        new Date(
          now.getTime() +
            1
        ),
        now
      ),
      "offline"
    );

    assert.throws(
      () =>
        deriveDeviceStatus(
          now,
          now,
          0
        ),
      /positive finite/
    );
  }
);

test(
  "GET devices ignores legacy stored status and derives presence",
  async () => {
    const originalFindAll =
      Device.findAll;

    try {
      const now =
        Date.now();

      Device.findAll =
        async () => [
          {
            toJSON() {
              return {
                id:
                  "fresh-device",
                userId:
                  "user-id",
                name:
                  "Fresh",
                type:
                  "sensor",
                status:
                  "offline",
                lastSeenAt:
                  new Date(
                    now -
                      1000
                  ),
              };
            },
          },
          {
            toJSON() {
              return {
                id:
                  "stale-device",
                userId:
                  "user-id",
                name:
                  "Stale",
                type:
                  "sensor",
                status:
                  "online",
                lastSeenAt:
                  new Date(
                    now -
                      DEVICE_ONLINE_WINDOW_MS -
                      5000
                  ),
              };
            },
          },
          {
            toJSON() {
              return {
                id:
                  "never-seen",
                userId:
                  "user-id",
                name:
                  "Never seen",
                type:
                  "sensor",
                status:
                  "online",
                lastSeenAt:
                  null,
              };
            },
          },
        ];

      const result =
        createResponse();

      let nextError =
        null;

      await getHandler(
        {
          user: {
            id:
              "user-id",
          },
        },
        result.response,
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
        result.state.statusCode,
        200
      );

      assert.equal(
        result.state.body[0]
          .status,
        "online"
      );

      assert.equal(
        result.state.body[1]
          .status,
        "offline"
      );

      assert.equal(
        result.state.body[2]
          .status,
        "offline"
      );
    } finally {
      Device.findAll =
        originalFindAll;
    }
  }
);

test(
  "PUT device rejects manual status and never writes it",
  async () => {
    const originalFindOne =
      Device.findOne;

    try {
      let findOneCalled =
        false;

      Device.findOne =
        async () => {
          findOneCalled =
            true;

          throw new Error(
            "findOne must not run for manual status writes"
          );
        };

      const rejected =
        createResponse();

      await putHandler(
        {
          user: {
            id:
              "user-id",
          },
          params: {
            id:
              "device-id",
          },
          body: {
            status:
              "online",
          },
        },
        rejected.response,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );

      assert.equal(
        rejected.state.statusCode,
        400
      );

      assert.deepEqual(
        rejected.state.body,
        {
          error:
            "Device status is derived from telemetry",
        }
      );

      assert.equal(
        findOneCalled,
        false
      );

      let updateValues =
        null;

      const device = {
        name:
          "Original",
        type:
          "sensor",

        async update(values) {
          updateValues =
            values;

          if (
            Object.prototype.hasOwnProperty.call(
              values,
              "name"
            )
          ) {
            this.name =
              values.name;
          }

          if (
            Object.prototype.hasOwnProperty.call(
              values,
              "type"
            )
          ) {
            this.type =
              values.type;
          }

          return this;
        },

        toJSON() {
          return {
            id:
              "device-id",
            userId:
              "user-id",
            name:
              this.name,
            type:
              this.type,
            status:
              "online",
            lastSeenAt:
              null,
          };
        },
      };

      Device.findOne =
        async () =>
          device;

      const updated =
        createResponse();

      await putHandler(
        {
          user: {
            id:
              "user-id",
          },
          params: {
            id:
              "device-id",
          },
          body: {
            name:
              "Renamed",
            type:
              "esp32",
          },
        },
        updated.response,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );

      assert.deepEqual(
        updateValues,
        {
          name:
            "Renamed",
          type:
            "esp32",
        }
      );

      assert.equal(
        Object.prototype.hasOwnProperty.call(
          updateValues,
          "status"
        ),
        false
      );

      assert.equal(
        updated.state.body.status,
        "offline"
      );
    } finally {
      Device.findOne =
        originalFindOne;
    }
  }
);
