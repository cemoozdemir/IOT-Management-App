import rateLimit from "express-rate-limit";
import {
  AuthenticatedRequest,
} from "../types/AuthenticatedRequest";
import {
  DeviceAuthenticatedRequest,
} from "../types/DeviceAuthenticatedRequest";

export const RATE_LIMITS = {
  api: {
    windowMs:
      15 * 60 * 1000,
    max: 20_000,
  },

  login: {
    windowMs:
      15 * 60 * 1000,
    max: 20,
  },

  register: {
    windowMs:
      60 * 60 * 1000,
    max: 10,
  },

  userRead: {
    windowMs:
      15 * 60 * 1000,
    max: 600,
  },

  userMutation: {
    windowMs:
      15 * 60 * 1000,
    max: 120,
  },

  deviceTelemetry: {
    windowMs:
      60 * 1000,
    max: 300,
  },
} as const;

const commonOptions = {
  standardHeaders:
    "draft-7" as const,
  legacyHeaders:
    false,
  message: {
    error:
      "Too many requests",
  },
  passOnStoreError:
    false,
};

export const apiRateLimiter =
  rateLimit({
    ...commonOptions,
    ...RATE_LIMITS.api,
  });

export const loginRateLimiter =
  rateLimit({
    ...commonOptions,
    ...RATE_LIMITS.login,
    skipSuccessfulRequests:
      true,
  });

export const registerRateLimiter =
  rateLimit({
    ...commonOptions,
    ...RATE_LIMITS.register,
  });

export const userReadRateLimiter =
  rateLimit({
    ...commonOptions,
    ...RATE_LIMITS.userRead,

    keyGenerator: (
      req
    ) =>
      (
        req as
          AuthenticatedRequest
      ).user?.id ??
      "anonymous-user",
  });

export const userMutationRateLimiter =
  rateLimit({
    ...commonOptions,
    ...RATE_LIMITS.userMutation,

    keyGenerator: (
      req
    ) =>
      (
        req as
          AuthenticatedRequest
      ).user?.id ??
      "anonymous-user",
  });

export const deviceTelemetryRateLimiter =
  rateLimit({
    ...commonOptions,
    ...RATE_LIMITS.deviceTelemetry,

    keyGenerator: (
      req
    ) =>
      (
        req as
          DeviceAuthenticatedRequest
      ).device?.id ??
      "anonymous-device",
  });
