module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        await queryInterface.createTable(
          "DeviceTelemetry",
          {
            id: {
              type: Sequelize.UUID,
              defaultValue: Sequelize.UUIDV4,
              primaryKey: true,
              allowNull: false,
            },
            deviceId: {
              type: Sequelize.UUID,
              allowNull: false,
              references: {
                model: "Devices",
                key: "id",
              },
              onDelete: "CASCADE",
            },
            eventId: {
              type: Sequelize.UUID,
              allowNull: false,
            },
            metric: {
              type: Sequelize.STRING(64),
              allowNull: false,
            },
            value: {
              type: Sequelize.DOUBLE,
              allowNull: false,
            },
            unit: {
              type: Sequelize.STRING(32),
              allowNull: true,
            },
            recordedAt: {
              type: Sequelize.DATE,
              allowNull: false,
            },
            receivedAt: {
              type: Sequelize.DATE,
              allowNull: false,
            },
          },
          {
            transaction,
          }
        );

        await queryInterface.addIndex(
          "DeviceTelemetry",
          [
            "deviceId",
            "eventId",
          ],
          {
            name:
              "device_telemetry_device_event_uidx",
            unique: true,
            transaction,
          }
        );

        await queryInterface.addIndex(
          "DeviceTelemetry",
          [
            "deviceId",
            "recordedAt",
          ],
          {
            name:
              "device_telemetry_device_recorded_idx",
            transaction,
          }
        );
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        await queryInterface.dropTable(
          "DeviceTelemetry",
          {
            transaction,
          }
        );
      }
    );
  },
};
