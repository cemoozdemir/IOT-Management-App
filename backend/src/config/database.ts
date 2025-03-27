import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import path from "path";

// Ensure env file is loaded from dist
dotenv.config({
  path: path.resolve(__dirname, "../.env.production"),
});


console.log("✅ Loaded ENV:", {
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASS: process.env.DB_PASS,
  DB_HOST: process.env.DB_HOST,
});

const sequelize = new Sequelize(
  String(process.env.DB_NAME),
  String(process.env.DB_USER),
  String(process.env.DB_PASS), // <- this MUST be casted
  {
    host: String(process.env.DB_HOST),
    dialect: "postgres",
    logging: false,
  }
);

export default sequelize;
