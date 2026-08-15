import express, {
  NextFunction,
  Response,
} from "express";
import sequelize from "../config/database";
import {
  authenticateDevice,
} from "../middleware/deviceAuthMiddleware";
import Device from "../models/Device";
import DeviceTelemetry from "../models/DeviceTelemetry";
import {
  DeviceAuthenticatedRequest,
} from "../types/DeviceAuthenticatedRequest";

const router = express.Router();

const EVENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const METRIC_PATTERN =
  /^[a-z][a-z0-9._-]{0,63}$/;

const UNIT_PATTERN =
  /^[^\u0000-\u001f\u007f]{1,32}$/;

const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

const MAX_FUTURE_SKEW_MS =
  5 * 60 * 1000;

interface TelemetryPayload {
  eventId: string;
  metric: string;
  value: number;
  unit: string | null;
  recordedAt: Date;
}

type ValidationResult =
  | {
      ok: true;
      payload: TelemetryPayload;
    }
  | {
      ok: false;
      error: string;
    };

const normalizeTelemetryPayload = (
  rawBody: unknown,
  now: Date
): ValidationResult => {
  if (
    !rawBody ||
    typeof rawBody !== "object" ||
    Array.isArray(rawBody)
  ) {
    return {
      ok: false,
      error:
        "Telemetry body must be an object",
    };
  }

  const body =
    rawBody as Record<
      string,
      unknown
    >;

  if (
    typeof body.eventId !==
      "string" ||
    !EVENT_ID_PATTERN.test(
      body.eventId
    )
  ) {
    return {
      ok: false,
      error:
        "eventId must be a UUIDv4",
    };
  }

  if (
    typeof body.metric !==
    "string"
  ) {
    return {
      ok: false,
      error:
        "metric is required",
    };
  }

  const metric =
    body.metric
      .trim()
      .toLowerCase();

  if (
    !METRIC_PATTERN.test(
      metric
    )
  ) {
    return {
      ok: false,
      error:
        "metric format is invalid",
    };
  }

  if (
    typeof body.value !==
      "number" ||
    !Number.isFinite(body.value)
  ) {
    return {
      ok: false,
      error:
        "value must be a finite number",
    };
  }

  let unit: string | null =
    null;

  if (
    body.unit !== undefined &&
    body.unit !== null
  ) {
    if (
      typeof body.unit !==
      "string"
    ) {
      return {
        ok: false,
        error:
          "unit must be a string",
      };
    }

    unit =
      body.unit.trim();

    if (
      !UNIT_PATTERN.test(unit)
    ) {
      return {
        ok: false,
        error:
          "unit format is invalid",
      };
    }
  }

  if (
    typeof body.recordedAt !==
      "string" ||
    body.recordedAt.length === 0
  ) {
    return {
      ok: false,
      error:
        "recordedAt is required",
    };
  }

  if (
    !ISO_TIMESTAMP_PATTERN.test(
      body.recordedAt
    )
  ) {
    return {
      ok: false,
      error:
        "recordedAt must be an ISO 8601 timestamp",
    };
  }

  const recordedAt =
    new Date(
      body.recordedAt
    );

  if (
    Number.isNaN(
      recordedAt.getTime()
    )
  ) {
    return {
      ok: false,
      error:
        "recordedAt must be a valid timestamp",
    };
  }

  if (
    recordedAt.getTime() >
    now.getTime() +
      MAX_FUTURE_SKEW_MS
  ) {
    return {
      ok: false,
      error:
        "recordedAt is too far in the future",
    };
  }

  return {
    ok: true,
    payload: {
      eventId:
        body.eventId.toLowerCase(),
      metric,
      value:
        body.value,
      unit,
      recordedAt,
    },
  };
};

const telemetryMatches = (
  telemetry: DeviceTelemetry,
  payload: TelemetryPayload
): boolean => {
  return (
    telemetry.metric ===
      payload.metric &&
    Number(telemetry.value) ===
      payload.value &&
    (
      telemetry.unit ??
      null
    ) === payload.unit &&
    new Date(
      telemetry.recordedAt
    ).getTime() ===
      payload.recordedAt.getTime()
  );
};

router.post(
  "/",
  authenticateDevice,
  async (
    req: DeviceAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.device) {
      res.status(401).json({
        error:
          "Device authentication required",
      });
      return;
    }

    const receivedAt =
      new Date();

    const validation =
      normalizeTelemetryPayload(
        req.body,
        receivedAt
      );

    if (!validation.ok) {
      res.status(400).json({
        error:
          validation.error,
      });
      return;
    }

    const {
      eventId,
      metric,
      value,
      unit,
      recordedAt,
    } = validation.payload;

    try {
      const result =
        await sequelize.transaction(
          async (transaction) => {
            const [
              telemetry,
              created,
            ] =
              await DeviceTelemetry.findOrCreate(
                {
                  where: {
                    deviceId:
                      req.device!.id,
                    eventId,
                  },
                  defaults: {
                    deviceId:
                      req.device!.id,
                    eventId,
                    metric,
                    value,
                    unit,
                    recordedAt,
                    receivedAt,
                  },
                  transaction,
                }
              );

            if (
              !created &&
              !telemetryMatches(
                telemetry,
                validation.payload
              )
            ) {
              return {
                conflict: true,
                created: false,
                telemetry,
              };
            }

            await Device.update(
              {
                lastSeenAt:
                  receivedAt,
              },
              {
                where: {
                  id:
                    req.device!.id,
                },
                transaction,
              }
            );

            return {
              conflict: false,
              created,
              telemetry,
            };
          }
        );

      if (result.conflict) {
        res.status(409).json({
          error:
            "eventId already exists with different telemetry payload",
        });
        return;
      }

      res
        .status(
          result.created
            ? 201
            : 200
        )
        .json({
          accepted: true,
          duplicate:
            !result.created,
          telemetry: {
            id:
              result
                .telemetry
                .id,
            eventId:
              result
                .telemetry
                .eventId,
            metric:
              result
                .telemetry
                .metric,
            value:
              Number(
                result
                  .telemetry
                  .value
              ),
            unit:
              result
                .telemetry
                .unit,
            recordedAt:
              new Date(
                result
                  .telemetry
                  .recordedAt
              ).toISOString(),
          },
        });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
