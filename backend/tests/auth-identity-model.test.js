const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

process.env.DB_NAME = "auth_identity_test_db";
process.env.DB_USER = "auth_identity_test_user";
process.env.DB_PASS = "auth_identity_test_password";
process.env.DB_HOST = "127.0.0.1";
process.env.JWT_SECRET = "auth-identity-test-secret";

const {
  generateToken,
  verifyToken,
} = require("../dist/utils/auth.js");

const {
  authenticate,
  authorizeRole,
} = require("../dist/middleware/authMiddleware.js");

const User = require("../dist/models/User.js").default;

const createResponse = () => {
  const state = {
    statusCode: null,
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

test(
  "JWT authentication uses an id-only identity model",
  async () => {
    const token = generateToken("identity-user-id");
    const decoded = verifyToken(token);

    assert.equal(decoded.id, "identity-user-id");
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        decoded,
        "role"
      ),
      false
    );

    const authReq = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };

    const authRes = createResponse();

    let authNextCalled = false;

    await authenticate(
      authReq,
      authRes.response,
      () => {
        authNextCalled = true;
      }
    );

    assert.equal(authNextCalled, true);

    assert.deepEqual(
      authReq.user,
      {
        id: "identity-user-id",
      }
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        authReq.user,
        "role"
      ),
      false
    );

    const malformedToken = jwt.sign(
      {
        role: "admin",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    const malformedReq = {
      headers: {
        authorization: `Bearer ${malformedToken}`,
      },
    };

    const malformedRes = createResponse();

    let malformedNextCalled = false;

    await authenticate(
      malformedReq,
      malformedRes.response,
      () => {
        malformedNextCalled = true;
      }
    );

    assert.equal(
      malformedNextCalled,
      false
    );

    assert.equal(
      malformedRes.state.statusCode,
      401
    );

    assert.deepEqual(
      malformedRes.state.body,
      {
        error: "Invalid token",
      }
    );

    const originalFindByPk = User.findByPk;

    try {
      const roleReq = {
        user: {
          id: "role-user-id",
        },
      };

      User.findByPk = async (id) => {
        assert.equal(id, "role-user-id");

        return {
          id,
          role: "admin",
        };
      };

      const allowedRes = createResponse();
      let allowedNextCalled = false;

      await authorizeRole("admin")(
        roleReq,
        allowedRes.response,
        () => {
          allowedNextCalled = true;
        }
      );

      assert.equal(
        allowedNextCalled,
        true
      );

      User.findByPk = async (id) => ({
        id,
        role: "user",
      });

      const deniedRes = createResponse();
      let deniedNextCalled = false;

      await authorizeRole("admin")(
        roleReq,
        deniedRes.response,
        () => {
          deniedNextCalled = true;
        }
      );

      assert.equal(
        deniedNextCalled,
        false
      );

      assert.equal(
        deniedRes.state.statusCode,
        403
      );

      assert.deepEqual(
        deniedRes.state.body,
        {
          error: "Forbidden",
        }
      );
    } finally {
      User.findByPk = originalFindByPk;
    }
  }
);
