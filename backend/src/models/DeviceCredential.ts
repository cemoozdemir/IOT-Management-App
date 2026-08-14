import {
  DataTypes,
  Model,
} from "sequelize";
import sequelize from "../config/database";
import Device from "./Device";

class DeviceCredential extends Model {
  public id!: string;
  public deviceId!: string;
  public lookupId!: string;
  public secretHash!: string;

  public lastUsedAt!:
    | Date
    | null;

  public revokedAt!:
    | Date
    | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DeviceCredential.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue:
        DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },

    deviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Device,
        key: "id",
      },
    },

    lookupId: {
      type: DataTypes.STRING(24),
      allowNull: false,
      unique: true,
      validate: {
        is: /^[a-f0-9]{24}$/,
      },
    },

    secretHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        is: /^[a-f0-9]{64}$/,
      },
    },

    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName:
      "DeviceCredential",
    tableName:
      "DeviceCredentials",
    timestamps: true,
    indexes: [
      {
        name:
          "device_credentials_device_revoked_idx",
        fields: [
          "deviceId",
          "revokedAt",
        ],
      },
      {
        name:
          "device_credentials_one_active_per_device_uidx",
        unique: true,
        fields: [
          "deviceId",
        ],
        where: {
          revokedAt: null,
        },
      },
    ],
  }
);

Device.hasMany(
  DeviceCredential,
  {
    foreignKey: "deviceId",
    onDelete: "CASCADE",
  }
);

DeviceCredential.belongsTo(
  Device,
  {
    foreignKey: "deviceId",
  }
);

export default DeviceCredential;
