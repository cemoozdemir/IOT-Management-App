import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import path from "path";

// Load correct env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
});

const sequelize = new Sequelize(
  process.env.DB_NAME!,
  process.env.DB_USER!,
  process.env.DB_PASS!,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    logging: false,
  }
);

export default sequelize;
