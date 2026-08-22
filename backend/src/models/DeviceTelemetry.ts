import {
  DataTypes,
  Model,
} from "sequelize";
import sequelize from "../config/database";
import Device from "./Device";

class DeviceTelemetry extends Model {
  public id!: string;
  public deviceId!: string;
  public eventId!: string;
  public metric!: string;
  public value!: number;
  public unit!: string | null;
  public recordedAt!: Date;
  public receivedAt!: Date;
}

DeviceTelemetry.init(
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

    eventId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    metric: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },

    value: {
      type: DataTypes.DOUBLE,
      allowNull: false,
    },

    unit: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },

    recordedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    receivedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName:
      "DeviceTelemetry",
    tableName:
      "DeviceTelemetry",
    timestamps: false,
    indexes: [
      {
        name:
          "device_telemetry_device_event_uidx",
        unique: true,
        fields: [
          "deviceId",
          "eventId",
        ],
      },
      {
        name:
          "device_telemetry_device_recorded_idx",
        fields: [
          "deviceId",
          "recordedAt",
        ],
      },
    ],
  }
);

Device.hasMany(
  DeviceTelemetry,
  {
    foreignKey: "deviceId",
    onDelete: "CASCADE",
  }
);

DeviceTelemetry.belongsTo(
  Device,
  {
    foreignKey: "deviceId",
  }
);

export default DeviceTelemetry;
