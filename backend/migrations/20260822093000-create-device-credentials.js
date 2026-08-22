module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        await queryInterface.addColumn(
          "Devices",
          "lastSeenAt",
          {
            type: Sequelize.DATE,
            allowNull: true,
          },
          {
            transaction,
          }
        );

        await queryInterface.createTable(
          "DeviceCredentials",
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
            lookupId: {
              type: Sequelize.STRING(24),
              allowNull: false,
              unique: true,
            },
            secretHash: {
              type: Sequelize.STRING(64),
              allowNull: false,
            },
            lastUsedAt: {
              type: Sequelize.DATE,
              allowNull: true,
            },
            revokedAt: {
              type: Sequelize.DATE,
              allowNull: true,
            },
            createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
            },
            updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
            },
          },
          {
            transaction,
          }
        );

        await queryInterface.addIndex(
          "DeviceCredentials",
          [
            "deviceId",
            "revokedAt",
          ],
          {
            name:
              "device_credentials_device_revoked_idx",
            transaction,
          }
        );

        await queryInterface.addIndex(
          "DeviceCredentials",
          ["deviceId"],
          {
            name:
              "device_credentials_one_active_per_device_uidx",
            unique: true,
            where: {
              revokedAt: null,
            },
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
          "DeviceCredentials",
          {
            transaction,
          }
        );

        await queryInterface.removeColumn(
          "Devices",
          "lastSeenAt",
          {
            transaction,
          }
        );
      }
    );
  },
};
