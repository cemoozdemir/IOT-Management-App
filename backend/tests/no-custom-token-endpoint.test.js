const test = require("node:test");
const assert = require("node:assert/strict");

process.env.DB_NAME =
  "no_custom_token_test_db";
process.env.DB_USER =
  "no_custom_token_test_user";
process.env.DB_PASS =
  "no_custom_token_test_password";
process.env.DB_HOST =
  "127.0.0.1";
process.env.JWT_SECRET =
  "no-custom-token-endpoint-test-secret";

test(
  "auth router exposes login/register but no custom token endpoint",
  () => {
    const authModule =
      require("../dist/routes/auth.js");

    const router =
      authModule.default;

    assert.ok(router);

    const routes =
      router.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          methods:
            Object.keys(
              layer.route.methods
            ).sort(),
        }));

    const paths =
      routes.map((route) => route.path);

    assert.equal(
      paths.includes("/token"),
      false
    );

    const removedHandlerName =
      ["token", "Handler"].join("");

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        authModule,
        removedHandlerName
      ),
      false
    );

    assert.equal(
      paths.includes("/login"),
      true
    );

    assert.equal(
      paths.includes("/register"),
      true
    );
  }
);
