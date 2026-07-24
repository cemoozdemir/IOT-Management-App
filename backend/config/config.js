const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
  path: path.resolve(
    __dirname,
    "..",
    ".env.production"
  ),
});

const requireEnv = (name) => {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value;
};

const databaseConfig = {
  username: requireEnv("DB_USER"),
  password: requireEnv("DB_PASS"),
  database: requireEnv("DB_NAME"),
  host: requireEnv("DB_HOST"),
  dialect: "postgres",
};

module.exports = {
  development: {
    ...databaseConfig,
  },
  production: {
    ...databaseConfig,
  },
};
