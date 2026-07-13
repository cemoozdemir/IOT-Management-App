const INDEX_NAME =
  "device_telemetry_device_metric_recorded_idx";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        await queryInterface.sequelize.query(
          `
          CREATE INDEX "${INDEX_NAME}"
          ON "DeviceTelemetry"
          (
            "deviceId",
            "metric",
            "recordedAt" DESC,
            "receivedAt" DESC,
            "id" DESC
          )
          `,
          {
            transaction,
          }
        );
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        await queryInterface.sequelize.query(
          `
          DROP INDEX "${INDEX_NAME}"
          `,
          {
            transaction,
          }
        );
      }
    );
  },
};
