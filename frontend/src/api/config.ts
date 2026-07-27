const configuredApiBase =
  process.env.REACT_APP_API_URL?.trim();

export const API_BASE_URL = (
  configuredApiBase || "/api"
).replace(/\/+$/, "");
