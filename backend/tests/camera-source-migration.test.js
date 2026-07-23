const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const Sequelize =
  require("sequelize");

const migration =
  require(
    "../migrations/20260824100000-create-camera-sources.js"
  );

test(
  "camera source migration creates secure stream metadata storage",
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
            "CameraSources"
      );

    assert.ok(create);

    const attributes =
      create.attributes;

    assert.ok(
      attributes.deviceId
    );

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

    assert.ok(
      attributes.streamPath
    );

    assert.ok(
      attributes.sourceScheme
    );

    assert.ok(
      attributes.sourceHost
    );

    assert.ok(
      attributes.sourcePort
    );

    assert.ok(
      attributes.sourcePath
    );

    assert.ok(
      attributes.authCiphertext
    );

    assert.ok(
      attributes.authIv
    );

    assert.ok(
      attributes.authTag
    );

    assert.equal(
      attributes.enabled
        .defaultValue,
      true
    );

    for (
      const forbidden of [
        "sourceUrl",
        "username",
        "password",
        "credential",
      ]
    ) {
      assert.equal(
        Object.prototype
          .hasOwnProperty
          .call(
            attributes,
            forbidden
          ),
        false
      );
    }

    const streamIndex =
      calls.find(
        (call) =>
          call.op ===
            "addIndex" &&
          call.options
            ?.name ===
            "camera_sources_stream_path_uidx"
      );

    assert.ok(streamIndex);

    assert.deepEqual(
      streamIndex.fields,
      ["streamPath"]
    );

    assert.equal(
      streamIndex
        .options
        .unique,
      true
    );

    const deviceNameIndex =
      calls.find(
        (call) =>
          call.op ===
            "addIndex" &&
          call.options
            ?.name ===
            "camera_sources_device_name_uidx"
      );

    assert.ok(
      deviceNameIndex
    );

    assert.deepEqual(
      deviceNameIndex
        .fields,
      [
        "deviceId",
        "name",
      ]
    );

    assert.equal(
      deviceNameIndex
        .options
        .unique,
      true
    );

    const enabledIndex =
      calls.find(
        (call) =>
          call.op ===
            "addIndex" &&
          call.options
            ?.name ===
            "camera_sources_device_enabled_idx"
      );

    assert.ok(enabledIndex);

    assert.deepEqual(
      enabledIndex.fields,
      [
        "deviceId",
        "enabled",
      ]
    );

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
            "CameraSources"
      )
    );
  }
);
