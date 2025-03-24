import { Model, DataTypes } from "sequelize";
import sequelize from "../../config/database";
import User from "./User"; // Ensure devices belong to users

class Device extends Model {
  public id!: string;
  public name!: string;
  public type!: string;
  public status!: string;
  public userId!: string;
}

Device.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("online", "offline"),
      defaultValue: "offline",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: User, key: "id" },
    },
  },
  {
    sequelize,
    modelName: "Device",
  }
);

// Ensure User-Device relationship
User.hasMany(Device, { foreignKey: "userId", onDelete: "CASCADE" });
Device.belongsTo(User, { foreignKey: "userId" });

export default Device;
