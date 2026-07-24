import { Sequelize } from "sequelize";
import { requireEnv } from "./env";

const sequelize = new Sequelize(
  requireEnv("DB_NAME"),
  requireEnv("DB_USER"),
  requireEnv("DB_PASS"),
  {
    host: requireEnv("DB_HOST"),
    dialect: "postgres",
    logging: false,
  }
);

export default sequelize;
