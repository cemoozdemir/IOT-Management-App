import express, {
  NextFunction,
  Response,
} from "express";
import sequelize from "../config/database";
import {
  authenticate,
} from "../middleware/authMiddleware";
import Device from "../models/Device";
import {
  AuthenticatedRequest,
} from "../types/AuthenticatedRequest";
import {
  withDerivedDevicePresence,
} from "../utils/devicePresence";
import {
  issueDeviceCredential,
  revokeActiveDeviceCredentials,
  rotateDeviceCredential,
} from "../services/deviceCredentialService";

const router = express.Router();

type DevicePlainRecord =
  Record<string, unknown> & {
    lastSeenAt?:
      | Date
      | string
      | null;
  };

const serializeDevice = (
  device: Device,
  now: Date = new Date()
) => {
  const plain =
    device.toJSON() as
      DevicePlainRecord;

  return withDerivedDevicePresence(
    plain,
    now
  );
};

const findOwnedDevice = async (
  deviceId: string,
  userId: string
) => {
  return Device.findOne({
    where: {
      id: deviceId,
      userId,
    },
  });
};

// Create a device and issue its first credential.
// The raw credential is returned only in this response.
router.post(
  "/",
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const name =
        typeof req.body?.name ===
        "string"
          ? req.body.name.trim()
          : "";

      const type =
        typeof req.body?.type ===
        "string"
          ? req.body.type.trim()
          : "";

      if (!req.user) {
        res.status(403).json({
          error:
            "User not authenticated",
        });
        return;
      }

      if (!name || !type) {
        res.status(400).json({
          error:
            "Device name and type are required",
        });
        return;
      }

      const result =
        await sequelize.transaction(
          async (transaction) => {
            const device =
              await Device.create(
                {
                  name,
                  type,
                  userId:
                    req.user!.id,
                  // Presence is derived from lastSeenAt.
                  // A newly registered device has never
                  // sent authenticated telemetry and is
                  // therefore presented as offline.
                },
                {
                  transaction,
                }
              );

            const issued =
              await issueDeviceCredential(
                device.id,
                transaction
              );

            return {
              device,
              issued,
            };
          }
        );

      res.status(201).json({
        device:
          serializeDevice(
            result.device
          ),
        credential: {
          value:
            result
              .issued
              .rawCredential,
          credentialId:
            result
              .issued
              .credentialId,
          shownOnce: true,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get all devices owned by the authenticated user.
// Raw device credentials are never returned here.
router.get(
  "/",
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(403).json({
          error:
            "User not authenticated",
        });
        return;
      }

      const devices =
        await Device.findAll({
          where: {
            userId:
              req.user.id,
          },
        });

      const now =
        new Date();

      res.json(
        devices.map(
          (device) =>
            serializeDevice(
              device,
              now
            )
        )
      );
    } catch (err) {
      next(err);
    }
  }
);

// Update user-managed device metadata.
// Presence/status is owned exclusively by
// authenticated telemetry and lastSeenAt.
router.put(
  "/:id",
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const body =
        req.body &&
        typeof req.body ===
          "object"
          ? req.body
          : {};

      if (!req.user) {
        res.status(403).json({
          error:
            "User not authenticated",
        });
        return;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "status"
        )
      ) {
        res.status(400).json({
          error:
            "Device status is derived from telemetry",
        });
        return;
      }

      const device =
        await findOwnedDevice(
          req.params.id,
          req.user.id
        );

      if (!device) {
        res.status(404).json({
          error:
            "Device not found",
        });
        return;
      }

      const updates:
        Record<
          string,
          unknown
        > = {};

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "name"
        )
      ) {
        updates.name =
          body.name;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          body,
          "type"
        )
      ) {
        updates.type =
          body.type;
      }

      await device.update(
        updates
      );

      res.json(
        serializeDevice(
          device
        )
      );
    } catch (err) {
      next(err);
    }
  }
);

// Rotate the credential for an owned device.
// Existing active credentials are revoked
// before a new raw credential is issued.
router.post(
  "/:id/credential/rotate",
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(403).json({
          error:
            "User not authenticated",
        });
        return;
      }

      const device =
        await findOwnedDevice(
          req.params.id,
          req.user.id
        );

      if (!device) {
        res.status(404).json({
          error:
            "Device not found",
        });
        return;
      }

      const issued =
        await rotateDeviceCredential(
          device.id
        );

      res.status(201).json({
        credential: {
          value:
            issued.rawCredential,
          credentialId:
            issued.credentialId,
          shownOnce: true,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Revoke all active credentials for an owned device.
// This endpoint is intentionally idempotent.
router.delete(
  "/:id/credential",
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(403).json({
          error:
            "User not authenticated",
        });
        return;
      }

      const device =
        await findOwnedDevice(
          req.params.id,
          req.user.id
        );

      if (!device) {
        res.status(404).json({
          error:
            "Device not found",
        });
        return;
      }

      const revokedCount =
        await revokeActiveDeviceCredentials(
          device.id
        );

      res.json({
        revoked:
          revokedCount > 0,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Delete an owned device.
// DeviceCredentials cascade through the DB FK.
router.delete(
  "/:id",
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(403).json({
          error:
            "User not authenticated",
        });
        return;
      }

      const deleted =
        await Device.destroy({
          where: {
            id:
              req.params.id,
            userId:
              req.user.id,
          },
        });

      if (!deleted) {
        res.status(404).json({
          error:
            "Device not found",
        });
        return;
      }

      res.json({
        message:
          "Device deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
