import { Model, DataTypes } from "sequelize";
import sequelize from "../config/database";

class User extends Model {
  public id!: string;
  public email!: string;
  public password!: string;
  public role!: string; // New role field
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("admin", "user"),
      allowNull: false,
      defaultValue: "user",
    },
  },
  {
    sequelize,
    modelName: "User",
  }
);

export default User;
