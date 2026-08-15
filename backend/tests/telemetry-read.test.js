const test =
  require("node:test");

const assert =
  require("node:assert/strict");

process.env.DB_NAME =
  "telemetry_read_test";
process.env.DB_USER =
  "telemetry_read_user";
process.env.DB_PASS =
  "telemetry_read_password";
process.env.DB_HOST =
  "127.0.0.1";
process.env.JWT_SECRET =
  "telemetry-read-test-jwt";

const sequelize =
  require(
    "../dist/config/database.js"
  ).default;

const {
  authenticate,
} = require(
  "../dist/middleware/authMiddleware.js"
);

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
  latestRoute,
  "GET /telemetry/latest route missing"
);

assert.equal(
  latestRoute.route.stack[0]
    .handle,
  authenticate,
  "latest telemetry must use user authentication"
);

const handler =
  latestRoute.route.stack[
    latestRoute.route.stack.length -
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

const row = (
  index
) => ({
  id:
    `telemetry-${index}`,
  deviceId:
    "device-owner",
  eventId:
    `event-${index}`,
  metric:
    `metric-${index}`,
  value:
    String(
      20 + index
    ),
  unit:
    "C",
  recordedAt:
    new Date(
      Date.UTC(
        2026,
        7,
        22,
        10,
        index % 60,
        0
      )
    ),
  receivedAt:
    new Date(
      Date.UTC(
        2026,
        7,
        22,
        10,
        index % 60,
        1
      )
    ),
});

test(
  "latest telemetry read is ownership-scoped and normalized",
  async () => {
    const originalQuery =
      sequelize.query;

    try {
      let queryCall =
        null;

      sequelize.query =
        async (
          sql,
          options
        ) => {
          queryCall = {
            sql,
            options,
          };

          return [
            {
              id:
                "telemetry-1",
              deviceId:
                "owned-device",
              eventId:
                "event-1",
              metric:
                "temperature",
              value:
                "21.5",
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
            },
          ];
        };

      const response =
        createResponse();

      let nextError =
        null;

      await handler(
        {
          user: {
            id:
              "owner-user",
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

      assert.ok(
        queryCall
      );

      assert.match(
        queryCall.sql,
        /DISTINCT ON/
      );

      assert.match(
        queryCall.sql,
        /INNER JOIN "Devices"/
      );

      assert.match(
        queryCall.sql,
        /d\."userId"\s*=\s*:userId/
      );

      assert.match(
        queryCall.sql,
        /LIMIT 251/
      );

      assert.match(
        queryCall.sql,
        /latest\."id" DESC/
      );

      assert.deepEqual(
        queryCall.options
          .replacements,
        {
          userId:
            "owner-user",
        }
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
        1
      );

      assert.equal(
        response.state.body
          .measurements[0]
          .value,
        21.5
      );

      assert.equal(
        response.state.body
          .measurements[0]
          .recordedAt,
        "2026-08-22T10:00:00.000Z"
      );

      assert.equal(
        JSON.stringify(
          response.state.body
        ).includes(
          "credential"
        ),
        false
      );

      assert.ok(
        Number.isFinite(
          Date.parse(
            response.state.body
              .generatedAt
          )
        )
      );
    } finally {
      sequelize.query =
        originalQuery;
    }
  }
);

test(
  "latest telemetry read fails closed without user identity",
  async () => {
    const originalQuery =
      sequelize.query;

    try {
      let called =
        false;

      sequelize.query =
        async () => {
          called =
            true;
          return [];
        };

      const response =
        createResponse();

      await handler(
        {},
        response.response,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );

      assert.equal(
        response.state.statusCode,
        403
      );

      assert.equal(
        called,
        false
      );
    } finally {
      sequelize.query =
        originalQuery;
    }
  }
);

test(
  "latest telemetry response is capped to 250 rows",
  async () => {
    const originalQuery =
      sequelize.query;

    try {
      sequelize.query =
        async () =>
          Array.from(
            {
              length: 251,
            },
            (_, index) =>
              row(index)
          );

      const response =
        createResponse();

      await handler(
        {
          user: {
            id:
              "owner-user",
          },
        },
        response.response,
        (error) => {
          if (error) {
            throw error;
          }
        }
      );

      assert.equal(
        response.state.body
          .truncated,
        true
      );

      assert.equal(
        response.state.body
          .measurements
          .length,
        250
      );
    } finally {
      sequelize.query =
        originalQuery;
    }
  }
);
