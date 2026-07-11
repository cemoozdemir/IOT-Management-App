const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const Sequelize =
  require("sequelize");

const migration =
  require(
    "../migrations/20260822093000-create-device-credentials.js"
  );

test(
  "device credential migration creates hash-only credential storage and lastSeenAt",
  async () => {
    const calls = [];

    const queryInterface = {
      sequelize: {
        async transaction(callback) {
          return callback({
            marker:
              "transaction",
          });
        },
      },

      async addColumn(
        table,
        column,
        definition,
        options
      ) {
        calls.push({
          op: "addColumn",
          table,
          column,
          definition,
          options,
        });
      },

      async createTable(
        table,
        attributes,
        options
      ) {
        calls.push({
          op: "createTable",
          table,
          attributes,
          options,
        });
      },

      async addIndex(
        table,
        fields,
        options
      ) {
        calls.push({
          op: "addIndex",
          table,
          fields,
          options,
        });
      },

      async dropTable(
        table,
        options
      ) {
        calls.push({
          op: "dropTable",
          table,
          options,
        });
      },

      async removeColumn(
        table,
        column,
        options
      ) {
        calls.push({
          op: "removeColumn",
          table,
          column,
          options,
        });
      },
    };

    await migration.up(
      queryInterface,
      Sequelize
    );

    const addLastSeen =
      calls.find(
        (call) =>
          call.op ===
            "addColumn" &&
          call.table ===
            "Devices" &&
          call.column ===
            "lastSeenAt"
      );

    assert.ok(addLastSeen);
    assert.equal(
      addLastSeen
        .definition
        .allowNull,
      true
    );

    const createCredential =
      calls.find(
        (call) =>
          call.op ===
            "createTable" &&
          call.table ===
            "DeviceCredentials"
      );

    assert.ok(
      createCredential
    );

    const attributes =
      createCredential.attributes;

    assert.ok(
      attributes.deviceId
    );

    assert.equal(
      attributes.deviceId
        .references
        .model,
      "Devices"
    );

    assert.ok(
      attributes.lookupId
    );

    assert.equal(
      attributes.lookupId
        .unique,
      true
    );

    assert.ok(
      attributes.secretHash
    );

    assert.ok(
      attributes.revokedAt
    );

    assert.ok(
      attributes.lastUsedAt
    );

    const activeUniqueIndex =
      calls.find(
        (call) =>
          call.op ===
            "addIndex" &&
          call.table ===
            "DeviceCredentials" &&
          call.options?.name ===
            "device_credentials_one_active_per_device_uidx"
      );

    assert.ok(
      activeUniqueIndex
    );

    assert.equal(
      activeUniqueIndex
        .options
        .unique,
      true
    );

    assert.deepEqual(
      activeUniqueIndex
        .fields,
      ["deviceId"]
    );

    assert.deepEqual(
      activeUniqueIndex
        .options
        .where,
      {
        revokedAt: null,
      }
    );

    for (
      const forbidden of [
        "rawCredential",
        "secret",
        "token",
      ]
    ) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          attributes,
          forbidden
        ),
        false
      );
    }

    await migration.down(
      queryInterface,
      Sequelize
    );

    assert.ok(
      calls.some(
        (call) =>
          call.op ===
            "dropTable" &&
          call.table ===
            "DeviceCredentials"
      )
    );

    assert.ok(
      calls.some(
        (call) =>
          call.op ===
            "removeColumn" &&
          call.table ===
            "Devices" &&
          call.column ===
            "lastSeenAt"
      )
    );
  }
);
