import {
  DataTypes,
  Model,
} from "sequelize";
import sequelize from "../config/database";
import Device from "./Device";

class CameraSource extends Model {
  public id!: string;
  public deviceId!: string;

  public name!: string;
  public streamPath!: string;

  public sourceScheme!:
    | "rtsp"
    | "rtsps";

  public sourceHost!: string;
  public sourcePort!: number;
  public sourcePath!: string;

  public authCiphertext!:
    | string
    | null;

  public authIv!:
    | string
    | null;

  public authTag!:
    | string
    | null;

  public enabled!: boolean;

  public lastConnectedAt!:
    | Date
    | null;

  public lastError!:
    | string
    | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CameraSource.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue:
        DataTypes.UUIDV4,
      primaryKey: true,
    },

    deviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: Device,
        key: "id",
      },
    },

    name: {
      type:
        DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    streamPath: {
      type:
        DataTypes.STRING(96),
      allowNull: false,
      validate: {
        is: /^[A-Za-z0-9_-]{8,96}$/,
      },
    },

    sourceScheme: {
      type:
        DataTypes.STRING(8),
      allowNull: false,
      validate: {
        isIn: [
          [
            "rtsp",
            "rtsps",
          ],
        ],
      },
    },

    sourceHost: {
      type:
        DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    sourcePort: {
      type:
        DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 554,
      validate: {
        min: 1,
        max: 65535,
      },
    },

    sourcePath: {
      type:
        DataTypes.STRING(1024),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    authCiphertext: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    authIv: {
      type:
        DataTypes.STRING(32),
      allowNull: true,
    },

    authTag: {
      type:
        DataTypes.STRING(32),
      allowNull: true,
    },

    enabled: {
      type:
        DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    lastConnectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName:
      "CameraSource",
  }
);

Device.hasMany(
  CameraSource,
  {
    foreignKey:
      "deviceId",
    onDelete:
      "CASCADE",
  }
);

CameraSource.belongsTo(
  Device,
  {
    foreignKey:
      "deviceId",
  }
);

export default CameraSource;
