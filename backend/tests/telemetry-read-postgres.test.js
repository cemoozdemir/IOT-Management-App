const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const sequelize =
  require(
    "../dist/config/database.js"
  ).default;

const router =
  require(
    "../dist/routes/telemetry.js"
  ).default;

const latestRoute =
  router.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path ===
        "/latest" &&
      layer.route.methods.get
  );

assert.ok(
  latestRoute
);

const handler =
  latestRoute.route.stack[
    latestRoute.route.stack.length -
      1
  ].handle;

const OWNER_USER =
  "11111111-1111-4111-8111-111111111111";

const OTHER_USER =
  "22222222-2222-4222-8222-222222222222";

const OWNER_DEVICE =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const OTHER_DEVICE =
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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
  "PostgreSQL latest query selects newest metric and isolates ownership",
  async () => {
    try {
      await sequelize.query(
        `
        DELETE FROM "Users"
        WHERE "id" IN (
          :ownerUser,
          :otherUser
        )
        `,
        {
          replacements: {
            ownerUser:
              OWNER_USER,
            otherUser:
              OTHER_USER,
          },
        }
      );

      await sequelize.query(
        `
        INSERT INTO "Users"
        (
          "id",
          "email",
          "password",
          "role",
          "createdAt",
          "updatedAt"
        )
        VALUES
        (
          :ownerUser,
          'owner-pr15@example.invalid',
          'not-a-real-password',
          'user',
          NOW(),
          NOW()
        ),
        (
          :otherUser,
          'other-pr15@example.invalid',
          'not-a-real-password',
          'user',
          NOW(),
          NOW()
        )
        `,
        {
          replacements: {
            ownerUser:
              OWNER_USER,
            otherUser:
              OTHER_USER,
          },
        }
      );

      await sequelize.query(
        `
        INSERT INTO "Devices"
        (
          "id",
          "name",
          "type",
          "status",
          "userId",
          "lastSeenAt",
          "createdAt",
          "updatedAt"
        )
        VALUES
        (
          :ownerDevice,
          'Owner Device',
          'sensor',
          'offline',
          :ownerUser,
          NULL,
          NOW(),
          NOW()
        ),
        (
          :otherDevice,
          'Other Device',
          'sensor',
          'offline',
          :otherUser,
          NULL,
          NOW(),
          NOW()
        )
        `,
        {
          replacements: {
            ownerDevice:
              OWNER_DEVICE,
            otherDevice:
              OTHER_DEVICE,
            ownerUser:
              OWNER_USER,
            otherUser:
              OTHER_USER,
          },
        }
      );

      await sequelize.query(
        `
        INSERT INTO "DeviceTelemetry"
        (
          "id",
          "deviceId",
          "eventId",
          "metric",
          "value",
          "unit",
          "recordedAt",
          "receivedAt"
        )
        VALUES
        (
          '10000000-0000-4000-8000-000000000001',
          :ownerDevice,
          '20000000-0000-4000-8000-000000000001',
          'temperature',
          20.0,
          'C',
          '2026-08-22T10:00:00Z',
          '2026-08-22T10:00:01Z'
        ),
        (
          '10000000-0000-4000-8000-000000000002',
          :ownerDevice,
          '20000000-0000-4000-8000-000000000002',
          'temperature',
          22.5,
          'C',
          '2026-08-22T10:05:00Z',
          '2026-08-22T10:05:01Z'
        ),
        (
          '10000000-0000-4000-8000-000000000005',
          :ownerDevice,
          '20000000-0000-4000-8000-000000000005',
          'temperature',
          23.0,
          'C',
          '2026-08-22T10:05:00Z',
          '2026-08-22T10:05:01Z'
        ),
        (
          '10000000-0000-4000-8000-000000000003',
          :ownerDevice,
          '20000000-0000-4000-8000-000000000003',
          'humidity',
          45.0,
          '%',
          '2026-08-22T10:04:00Z',
          '2026-08-22T10:04:01Z'
        ),
        (
          '10000000-0000-4000-8000-000000000004',
          :otherDevice,
          '20000000-0000-4000-8000-000000000004',
          'temperature',
          99.0,
          'C',
          '2026-08-22T10:06:00Z',
          '2026-08-22T10:06:01Z'
        )
        `,
        {
          replacements: {
            ownerDevice:
              OWNER_DEVICE,
            otherDevice:
              OTHER_DEVICE,
          },
        }
      );

      const response =
        createResponse();

      let nextError =
        null;

      await handler(
        {
          user: {
            id:
              OWNER_USER,
          },
        },
        response.response,
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
        response.state.statusCode,
        200
      );

      assert.equal(
        response.state.body
          .truncated,
        false
      );

      assert.equal(
        response.state.body
          .measurements
          .length,
        2
      );

      for (
        const measurement of
        response.state.body
          .measurements
      ) {
        assert.equal(
          measurement.deviceId,
          OWNER_DEVICE
        );
      }

      const byMetric =
        new Map(
          response.state.body
            .measurements
            .map(
              (measurement) => [
                measurement.metric,
                measurement,
              ]
            )
        );

      assert.equal(
        byMetric
          .get(
            "temperature"
          )
          .value,
        23
      );

      assert.equal(
        byMetric
          .get(
            "temperature"
          )
          .id,
        "10000000-0000-4000-8000-000000000005"
      );

      assert.equal(
        byMetric
          .get(
            "temperature"
          )
          .recordedAt,
        "2026-08-22T10:05:00.000Z"
      );

      assert.equal(
        byMetric
          .get(
            "humidity"
          )
          .value,
        45
      );

      assert.equal(
        response.state.body
          .measurements
          .some(
            (measurement) =>
              measurement.deviceId ===
              OTHER_DEVICE
          ),
        false
      );
    } finally {
      try {
        await sequelize.query(
          `
          DELETE FROM "Users"
          WHERE "id" IN (
            :ownerUser,
            :otherUser
          )
          `,
          {
            replacements: {
              ownerUser:
                OWNER_USER,
              otherUser:
                OTHER_USER,
            },
          }
        );
      } finally {
        await sequelize.close();
      }
    }
  }
);
