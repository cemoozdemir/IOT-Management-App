const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_NAME = "token_duration_test_db";
process.env.DB_USER = "token_duration_test_user";
process.env.DB_PASS = "token_duration_test_password";
process.env.DB_HOST = "127.0.0.1";
process.env.JWT_SECRET =
  "token-duration-policy-test-secret";

const {
  tokenHandler,
} = require("../dist/routes/auth.js");

const {
  verifyToken,
} = require("../dist/utils/auth.js");

const createResponse = () => {
  const state = {
    statusCode: 200,
    body: null,
  };

  return {
    state,

    response: {
      status(code) {
        state.statusCode = code;
        return this;
      },

      json(body) {
        state.body = body;
        return this;
      },
    },
  };
};

const expectedLifetime = {
  "30d": 30 * 24 * 60 * 60,
  "90d": 90 * 24 * 60 * 60,
  "180d": 180 * 24 * 60 * 60,
};

test(
  "device token duration is restricted to server allowlist",
  () => {
    for (const duration of [
      "30d",
      "90d",
      "180d",
    ]) {
      const res = createResponse();

      tokenHandler(
        {
          user: {
            id: "duration-policy-user",
          },
          body: {
            duration,
          },
        },
        res.response
      );

      assert.equal(
        res.state.statusCode,
        200
      );

      assert.equal(
        typeof res.state.body?.token,
        "string"
      );

      const decoded =
        verifyToken(res.state.body.token);

      assert.equal(
        decoded.id,
        "duration-policy-user"
      );

      assert.equal(
        decoded.exp - decoded.iat,
        expectedLifetime[duration]
      );
    }

    const defaultRes =
      createResponse();

    tokenHandler(
      {
        user: {
          id: "default-duration-user",
        },
        body: {},
      },
      defaultRes.response
    );

    assert.equal(
      defaultRes.state.statusCode,
      200
    );

    const defaultDecoded =
      verifyToken(
        defaultRes.state.body.token
      );

    assert.equal(
      defaultDecoded.exp -
        defaultDecoded.iat,
      expectedLifetime["30d"]
    );

    for (const invalidDuration of [
      "1h",
      "1d",
      "365d",
      "3650d",
      "",
      null,
      30,
      180,
      {
        value: "30d",
      },
      ["30d"],
    ]) {
      const res = createResponse();

      tokenHandler(
        {
          user: {
            id: "invalid-duration-user",
          },
          body: {
            duration: invalidDuration,
          },
        },
        res.response
      );

      assert.equal(
        res.state.statusCode,
        400
      );

      assert.deepEqual(
        res.state.body,
        {
          error:
            "Invalid token duration",
        }
      );

      assert.equal(
        Object.prototype.hasOwnProperty.call(
          res.state.body,
          "token"
        ),
        false
      );
    }
  }
);
