const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const Sequelize =
  require("sequelize");

const migration =
  require(
    "../migrations/20260822110000-create-device-telemetry.js"
  );

test(
  "telemetry migration owns an idempotent hash-free device telemetry schema",
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

      async createTable(
        table,
        attributes,
        options
      ) {
        calls.push({
          op:
            "createTable",
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
          op:
            "addIndex",
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
          op:
            "dropTable",
          table,
          options,
        });
      },
    };

    await migration.up(
      queryInterface,
      Sequelize
    );

    const create =
      calls.find(
        (call) =>
          call.op ===
            "createTable" &&
          call.table ===
            "DeviceTelemetry"
      );

    assert.ok(create);

    const attributes =
      create.attributes;

    for (
      const required of [
        "id",
        "deviceId",
        "eventId",
        "metric",
        "value",
        "unit",
        "recordedAt",
        "receivedAt",
      ]
    ) {
      assert.ok(
        attributes[required],
        `${required} missing`
      );
    }

    assert.equal(
      attributes
        .deviceId
        .references
        .model,
      "Devices"
    );

    assert.equal(
      attributes
        .deviceId
        .onDelete,
      "CASCADE"
    );

    for (
      const forbidden of [
        "credential",
        "credentialId",
        "lookupId",
        "secret",
        "secretHash",
        "token",
        "rawCredential",
      ]
    ) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          attributes,
          forbidden
        ),
        false,
        `${forbidden} must not be persisted`
      );
    }

    const eventIndex =
      calls.find(
        (call) =>
          call.op ===
            "addIndex" &&
          call.options?.name ===
            "device_telemetry_device_event_uidx"
      );

    assert.ok(eventIndex);

    assert.equal(
      eventIndex.options.unique,
      true
    );

    assert.deepEqual(
      eventIndex.fields,
      [
        "deviceId",
        "eventId",
      ]
    );

    const recordedIndex =
      calls.find(
        (call) =>
          call.op ===
            "addIndex" &&
          call.options?.name ===
            "device_telemetry_device_recorded_idx"
      );

    assert.ok(recordedIndex);

    assert.deepEqual(
      recordedIndex.fields,
      [
        "deviceId",
        "recordedAt",
      ]
    );

    await migration.down(
      queryInterface
    );

    assert.ok(
      calls.some(
        (call) =>
          call.op ===
            "dropTable" &&
          call.table ===
            "DeviceTelemetry"
      )
    );
  }
);
