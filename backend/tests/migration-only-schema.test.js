const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const fs =
  require("node:fs");

const path =
  require("node:path");

const serverPath =
  path.resolve(
    __dirname,
    "..",
    "src",
    "server.ts"
  );

const migrationPath =
  path.resolve(
    __dirname,
    "..",
    "migrations",
    "20260822093000-create-device-credentials.js"
  );

test(
  "application startup never mutates schema and PR12 schema changes remain migration-owned",
  () => {
    const server =
      fs.readFileSync(
        serverPath,
        "utf8"
      );

    const migration =
      fs.readFileSync(
        migrationPath,
        "utf8"
      );

    assert.equal(
      server.includes(
        "sequelize.sync"
      ),
      false,
      "server startup must not call sequelize.sync"
    );

    assert.equal(
      server.includes(
        "sync({ alter:"
      ),
      false,
      "server startup must not use alter synchronization"
    );

    assert.equal(
      server.includes(
        "sync({ force:"
      ),
      false,
      "server startup must not use force synchronization"
    );

    assert.equal(
      server.includes(
        "await sequelize.authenticate()"
      ),
      true,
      "startup should verify database connectivity without changing schema"
    );

    assert.equal(
      migration.includes(
        '"lastSeenAt"'
      ),
      true
    );

    assert.equal(
      migration.includes(
        '"DeviceCredentials"'
      ),
      true
    );

    assert.equal(
      migration.includes(
        "createTable("
      ),
      true
    );

    assert.equal(
      migration.includes(
        "addColumn("
      ),
      true
    );

    assert.equal(
      migration.includes(
        "dropTable("
      ),
      true
    );

    assert.equal(
      migration.includes(
        "removeColumn("
      ),
      true
    );
  }
);
