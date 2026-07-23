module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(
      async (transaction) => {
        await queryInterface.createTable(
          "CameraSources",
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

            name: {
              type: Sequelize.STRING(120),
              allowNull: false,
            },

            streamPath: {
              type: Sequelize.STRING(96),
              allowNull: false,
            },

            sourceScheme: {
              type: Sequelize.STRING(8),
              allowNull: false,
            },

            sourceHost: {
              type: Sequelize.STRING(255),
              allowNull: false,
            },

            sourcePort: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 554,
            },

            sourcePath: {
              type: Sequelize.STRING(1024),
              allowNull: false,
            },

            authCiphertext: {
              type: Sequelize.TEXT,
              allowNull: true,
            },

            authIv: {
              type: Sequelize.STRING(32),
              allowNull: true,
            },

            authTag: {
              type: Sequelize.STRING(32),
              allowNull: true,
            },

            enabled: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },

            lastConnectedAt: {
              type: Sequelize.DATE,
              allowNull: true,
            },

            lastError: {
              type: Sequelize.TEXT,
              allowNull: true,
            },

            createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.fn("NOW"),
            },

            updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.fn("NOW"),
            },
          },
          {
            transaction,
          }
        );

        await queryInterface.addIndex(
          "CameraSources",
          ["streamPath"],
          {
            name:
              "camera_sources_stream_path_uidx",
            unique: true,
            transaction,
          }
        );

        await queryInterface.addIndex(
          "CameraSources",
          [
            "deviceId",
            "name",
          ],
          {
            name:
              "camera_sources_device_name_uidx",
            unique: true,
            transaction,
          }
        );

        await queryInterface.addIndex(
          "CameraSources",
          [
            "deviceId",
            "enabled",
          ],
          {
            name:
              "camera_sources_device_enabled_idx",
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
          "CameraSources",
          {
            transaction,
          }
        );
      }
    );
  },
};
