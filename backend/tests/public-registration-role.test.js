const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_NAME ||= "security_test_database";
process.env.DB_USER ||= "security_test_user";
process.env.DB_PASS ||= "security_test_password";
process.env.DB_HOST ||= "127.0.0.1";
process.env.JWT_SECRET ||= "security-test-jwt-secret";

const User = require("../dist/models/User.js").default;
const {
  registerHandler,
} = require("../dist/routes/auth.js");

test(
  "public registration always creates a user role",
  async () => {
    const originalFindOne = User.findOne;
    const originalCreate = User.create;

    const createdRecords = [];

    try {
      User.findOne = async () => null;

      User.create = async (attributes) => {
        createdRecords.push(attributes);

        return {
          id: `test-${createdRecords.length}`,
          role: attributes.role,
        };
      };

      const cases = [
        {
          email: "attacker-admin@example.invalid",
          password: "test-password",
          role: "admin",
        },
        {
          email: "normal-user@example.invalid",
          password: "test-password",
          role: "user",
        },
        {
          email: "no-role@example.invalid",
          password: "test-password",
        },
      ];

      for (const body of cases) {
        let statusCode = null;
        let responseBody = null;

        const req = {
          body,
        };

        const res = {
          status(code) {
            statusCode = code;
            return this;
          },

          json(payload) {
            responseBody = payload;
            return this;
          },
        };

        await registerHandler(req, res);

        assert.equal(statusCode, 201);
        assert.equal(responseBody.role, "user");
      }

      assert.equal(createdRecords.length, 3);

      for (const record of createdRecords) {
        assert.equal(record.role, "user");
      }

      assert.equal(
        createdRecords.some(
          (record) => record.role === "admin"
        ),
        false
      );
    } finally {
      User.findOne = originalFindOne;
      User.create = originalCreate;
    }
  }
);
