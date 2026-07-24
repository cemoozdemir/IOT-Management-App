import dotenv from "dotenv";
import path from "path";

// Source: backend/src/config
// Build:  backend/dist/config
// In both cases ../.. resolves to the backend root.
export const ENV_FILE = path.resolve(
  __dirname,
  "../../.env.production"
);

dotenv.config({
  path: ENV_FILE,
});

export const requireEnv = (name: string): string => {
  const value = process.env[name];

  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}`
    );
  }

  return value;
};
