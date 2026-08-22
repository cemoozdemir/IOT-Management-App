const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const migration =
  require(
    "../migrations/20260822112500-add-telemetry-latest-index.js"
  );

test(
  "latest telemetry index migration is transactional and reversible",
  async () => {
    const calls = [];

    const queryInterface = {
      sequelize: {
        async transaction(
          callback
        ) {
          return callback({
            marker:
              "transaction",
          });
        },

        async query(
          sql,
          options
        ) {
          calls.push({
            sql,
            options,
          });
        },
      },
    };

    await migration.up(
      queryInterface
    );

    assert.equal(
      calls.length,
      1
    );

    assert.match(
      calls[0].sql,
      /CREATE INDEX "device_telemetry_device_metric_recorded_idx"/
    );

    assert.match(
      calls[0].sql,
      /"deviceId"/
    );

    assert.match(
      calls[0].sql,
      /"metric"/
    );

    assert.match(
      calls[0].sql,
      /"recordedAt" DESC/
    );

    assert.match(
      calls[0].sql,
      /"receivedAt" DESC/
    );

    assert.equal(
      calls[0]
        .options
        .transaction
        .marker,
      "transaction"
    );

    calls.length = 0;

    await migration.down(
      queryInterface
    );

    assert.equal(
      calls.length,
      1
    );

    assert.match(
      calls[0].sql,
      /DROP INDEX "device_telemetry_device_metric_recorded_idx"/
    );

    assert.equal(
      calls[0]
        .options
        .transaction
        .marker,
      "transaction"
    );
  }
);
