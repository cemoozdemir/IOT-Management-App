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
  issueDeviceCredential,
  revokeActiveDeviceCredentials,
  rotateDeviceCredential,
} from "../services/deviceCredentialService";

const router = express.Router();

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
                  // Registration does not prove
                  // that the physical device is connected.
                  status:
                    "offline",
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
          result.device,
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

      res.json(devices);
    } catch (err) {
      next(err);
    }
  }
);

// Update user-managed device metadata.
// Status remains temporarily supported for
// backwards compatibility until telemetry owns it.
router.put(
  "/:id",
  authenticate,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        name,
        type,
        status,
      } = req.body;

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

      await device.update({
        name,
        type,
        status,
      });

      res.json(device);
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
