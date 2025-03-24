import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
const envPath = path.resolve(__dirname, "../../../.env");

const sequelize = new Sequelize(
  process.env.DB_NAME || "iot_db",
  process.env.DB_USER || "cemozdemir",
  process.env.DB_PASS || "123cem123",
  {
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: "postgres",
    logging: false,
  }
);

export default sequelize;
