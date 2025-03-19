import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();
console.log("Connecting to database:", process.env.DB_NAME); // Debugging line

const sequelize = new Sequelize(
  (process.env.DB_NAME as string) || "iot_db", // Fallback to iot_db
  (process.env.DB_USER as string) || "cemozdemir",
  (process.env.DB_PASS as string) || "123cem123",
  {
    host: process.env.DB_HOST || "127.0.0.1",
    dialect: "postgres",
    logging: false,
  }
);

export default sequelize;
