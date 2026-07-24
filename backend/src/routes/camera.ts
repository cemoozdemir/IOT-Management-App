import express, {
  NextFunction,
  Response,
} from "express";
import {
  UniqueConstraintError,
} from "sequelize";
import {
  authenticate,
} from "../middleware/authMiddleware";
import {
  userMutationRateLimiter,
  userReadRateLimiter,
} from "../middleware/rateLimits";
import CameraSource from "../models/CameraSource";
import Device from "../models/Device";
import {
  AuthenticatedRequest,
} from "../types/AuthenticatedRequest";
import {
  CameraSourceInputError,
  generateCameraStreamPath,
  parseCameraSourceUrl,
} from "../utils/cameraSourceConfig";

const router =
  express.Router();

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface CameraCreateInput {
  deviceId: string;
  name: string;
  sourceUrl: string;
  enabled: boolean;
}

interface CameraUpdateInput {
  name?: string;
  sourceUrl?: string;
  enabled?: boolean;
}

type ValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: string;
    };

const isPlainObject =
  (
    value: unknown
  ): value is
    Record<
      string,
      unknown
    > => {
    return (
      value !== null &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
    );
  };

const normalizeName =
  (
    raw: unknown
  ):
    | string
    | null => {
    if (
      typeof raw !==
      "string"
    ) {
      return null;
    }

    const value =
      raw.trim();

    if (
      value.length < 1 ||
      value.length > 120
    ) {
      return null;
    }

    return value;
  };

const normalizeSourceUrl =
  (
    raw: unknown
  ):
    | string
    | null => {
    if (
      typeof raw !==
      "string"
    ) {
      return null;
    }

    const value =
      raw.trim();

    if (
      value.length < 1 ||
      value.length > 4096
    ) {
      return null;
    }

    return value;
  };

export const validateCameraCreateBody =
  (
    body: unknown
  ): ValidationResult<
    CameraCreateInput
  > => {
    if (
      !isPlainObject(body)
    ) {
      return {
        ok: false,
        error:
          "Camera body must be an object",
      };
    }

    const allowed =
      new Set([
        "deviceId",
        "name",
        "sourceUrl",
        "enabled",
      ]);

    if (
      Object.keys(body)
        .some(
          (key) =>
            !allowed.has(key)
        )
    ) {
      return {
        ok: false,
        error:
          "Camera body contains unsupported fields",
      };
    }

    if (
      typeof body.deviceId !==
        "string" ||
      !UUID_PATTERN.test(
        body.deviceId
      )
    ) {
      return {
        ok: false,
        error:
          "deviceId must be a UUID",
      };
    }

    const name =
      normalizeName(
        body.name
      );

    if (!name) {
      return {
        ok: false,
        error:
          "Camera name is invalid",
      };
    }

    const sourceUrl =
      normalizeSourceUrl(
        body.sourceUrl
      );

    if (!sourceUrl) {
      return {
        ok: false,
        error:
          "Camera sourceUrl is invalid",
      };
    }

    if (
      body.enabled !==
        undefined &&
      typeof body.enabled !==
        "boolean"
    ) {
      return {
        ok: false,
        error:
          "enabled must be boolean",
      };
    }

    return {
      ok: true,
      value: {
        deviceId:
          body.deviceId,
        name,
        sourceUrl,
        enabled:
          body.enabled ===
          undefined
            ? true
            : body.enabled,
      },
    };
  };

export const validateCameraUpdateBody =
  (
    body: unknown
  ): ValidationResult<
    CameraUpdateInput
  > => {
    if (
      !isPlainObject(body)
    ) {
      return {
        ok: false,
        error:
          "Camera body must be an object",
      };
    }

    const allowed =
      new Set([
        "name",
        "sourceUrl",
        "enabled",
      ]);

    const keys =
      Object.keys(body);

    if (
      keys.length === 0
    ) {
      return {
        ok: false,
        error:
          "Camera update is empty",
      };
    }

    if (
      keys.some(
        (key) =>
          !allowed.has(key)
      )
    ) {
      return {
        ok: false,
        error:
          "Camera update contains unsupported fields",
      };
    }

    const result:
      CameraUpdateInput = {};

    if (
      body.name !==
      undefined
    ) {
      const name =
        normalizeName(
          body.name
        );

      if (!name) {
        return {
          ok: false,
          error:
            "Camera name is invalid",
        };
      }

      result.name =
        name;
    }

    if (
      body.sourceUrl !==
      undefined
    ) {
      const sourceUrl =
        normalizeSourceUrl(
          body.sourceUrl
        );

      if (!sourceUrl) {
        return {
          ok: false,
          error:
            "Camera sourceUrl is invalid",
        };
      }

      result.sourceUrl =
        sourceUrl;
    }

    if (
      body.enabled !==
      undefined
    ) {
      if (
        typeof body.enabled !==
          "boolean"
      ) {
        return {
          ok: false,
          error:
            "enabled must be boolean",
        };
      }

      result.enabled =
        body.enabled;
    }

    return {
      ok: true,
      value:
        result,
    };
  };

export const serializeCameraSource =
  (
    camera: CameraSource
  ) => {
    const plain =
      camera.toJSON() as
        Record<
          string,
          unknown
        >;

    return {
      id:
        plain.id,
      deviceId:
        plain.deviceId,
      name:
        plain.name,
      streamPath:
        plain.streamPath,
      enabled:
        plain.enabled,
      source: {
        scheme:
          plain.sourceScheme,
        host:
          plain.sourceHost,
        port:
          plain.sourcePort,
        protectedConnectionData:
          Boolean(
            plain.authCiphertext
          ),
      },
      lastConnectedAt:
        plain.lastConnectedAt,
      lastError:
        plain.lastError,
      createdAt:
        plain.createdAt,
      updatedAt:
        plain.updatedAt,
    };
  };

const findOwnedDevice =
  async (
    deviceId: string,
    userId: string
  ) => {
    return Device.findOne({
      where: {
        id:
          deviceId,
        userId,
      },
    });
  };

const findOwnedCamera =
  async (
    cameraId: string,
    userId: string
  ) => {
    return CameraSource.findOne({
      where: {
        id:
          cameraId,
      },
      include: [
        {
          model:
            Device,
          where: {
            userId,
          },
          attributes: [],
          required: true,
        },
      ],
    });
  };

const handleKnownCameraError =
  (
    error: unknown,
    res: Response
  ): boolean => {
    if (
      error instanceof
        CameraSourceInputError
    ) {
      res.status(400).json({
        error:
          error.message,
      });

      return true;
    }

    if (
      error instanceof
        UniqueConstraintError
    ) {
      res.status(409).json({
        error:
          "Camera name already exists for this device",
      });

      return true;
    }

    return false;
  };

router.get(
  "/",
  authenticate,
  userReadRateLimiter,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(403).json({
        error:
          "User not authenticated",
      });
      return;
    }

    try {
      const cameras =
        await CameraSource.findAll({
          include: [
            {
              model:
                Device,
              where: {
                userId:
                  req.user.id,
              },
              attributes: [],
              required: true,
            },
          ],
          order: [
            [
              "createdAt",
              "ASC",
            ],
          ],
        });

      res.json(
        cameras.map(
          serializeCameraSource
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/:id",
  authenticate,
  userReadRateLimiter,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(403).json({
        error:
          "User not authenticated",
      });
      return;
    }

    try {
      const camera =
        await findOwnedCamera(
          req.params.id,
          req.user.id
        );

      if (!camera) {
        res.status(404).json({
          error:
            "Camera not found",
        });
        return;
      }

      res.json(
        serializeCameraSource(
          camera
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/",
  authenticate,
  userMutationRateLimiter,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(403).json({
        error:
          "User not authenticated",
      });
      return;
    }

    const validation =
      validateCameraCreateBody(
        req.body
      );

    if (!validation.ok) {
      res.status(400).json({
        error:
          validation.error,
      });
      return;
    }

    try {
      const device =
        await findOwnedDevice(
          validation
            .value
            .deviceId,
          req.user.id
        );

      if (!device) {
        res.status(404).json({
          error:
            "Device not found",
        });
        return;
      }

      const parsedSource =
        parseCameraSourceUrl(
          validation
            .value
            .sourceUrl
        );

      const camera =
        await CameraSource.create({
          deviceId:
            device.id,
          name:
            validation
              .value
              .name,
          streamPath:
            generateCameraStreamPath(),
          enabled:
            validation
              .value
              .enabled,
          ...parsedSource,
        });

      res.status(201).json(
        serializeCameraSource(
          camera
        )
      );
    } catch (error) {
      if (
        handleKnownCameraError(
          error,
          res
        )
      ) {
        return;
      }

      next(error);
    }
  }
);

router.put(
  "/:id",
  authenticate,
  userMutationRateLimiter,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(403).json({
        error:
          "User not authenticated",
      });
      return;
    }

    const validation =
      validateCameraUpdateBody(
        req.body
      );

    if (!validation.ok) {
      res.status(400).json({
        error:
          validation.error,
      });
      return;
    }

    try {
      const camera =
        await findOwnedCamera(
          req.params.id,
          req.user.id
        );

      if (!camera) {
        res.status(404).json({
          error:
            "Camera not found",
        });
        return;
      }

      const updates:
        Record<
          string,
          unknown
        > = {};

      if (
        validation
          .value
          .name !==
        undefined
      ) {
        updates.name =
          validation
            .value
            .name;
      }

      if (
        validation
          .value
          .enabled !==
        undefined
      ) {
        updates.enabled =
          validation
            .value
            .enabled;
      }

      if (
        validation
          .value
          .sourceUrl !==
        undefined
      ) {
        Object.assign(
          updates,
          parseCameraSourceUrl(
            validation
              .value
              .sourceUrl
          )
        );
      }

      await camera.update(
        updates
      );

      res.json(
        serializeCameraSource(
          camera
        )
      );
    } catch (error) {
      if (
        handleKnownCameraError(
          error,
          res
        )
      ) {
        return;
      }

      next(error);
    }
  }
);

router.delete(
  "/:id",
  authenticate,
  userMutationRateLimiter,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(403).json({
        error:
          "User not authenticated",
      });
      return;
    }

    try {
      const camera =
        await findOwnedCamera(
          req.params.id,
          req.user.id
        );

      if (!camera) {
        res.status(404).json({
          error:
            "Camera not found",
        });
        return;
      }

      await camera.destroy();

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
