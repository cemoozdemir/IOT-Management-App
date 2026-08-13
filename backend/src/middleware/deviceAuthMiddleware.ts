import {
  NextFunction,
  Request,
  Response,
} from "express";
import DeviceCredential from "../models/DeviceCredential";
import {
  parseDeviceCredential,
  verifyDeviceCredential,
} from "../utils/deviceCredential";
import { DeviceAuthenticatedRequest } from "../types/DeviceAuthenticatedRequest";

const getRawDeviceCredential = (
  request: Request
): string | null => {
  const authorization =
    request.headers.authorization;

  if (!authorization) {
    return null;
  }

  const parts =
    authorization
      .trim()
      .split(/\s+/);

  if (
    parts.length !== 2 ||
    parts[0] !== "Device"
  ) {
    return null;
  }

  return parts[1];
};

export const authenticateDevice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const rawCredential =
    getRawDeviceCredential(req);

  if (!rawCredential) {
    res.status(401).json({
      error:
        "Device authentication required",
    });
    return;
  }

  const parsed =
    parseDeviceCredential(
      rawCredential
    );

  if (!parsed) {
    res.status(401).json({
      error:
        "Invalid device credential",
    });
    return;
  }

  try {
    const credential =
      await DeviceCredential.findOne({
        where: {
          lookupId:
            parsed.lookupId,
          revokedAt: null,
        },
      });

    if (
      !credential ||
      !verifyDeviceCredential(
        rawCredential,
        credential.secretHash
      )
    ) {
      res.status(401).json({
        error:
          "Invalid device credential",
      });
      return;
    }

    (
      req as DeviceAuthenticatedRequest
    ).device = {
      id: credential.deviceId,
      credentialId:
        credential.id,
    };

    await credential.update({
      lastUsedAt: new Date(),
    });

    next();
  } catch (error) {
    next(error);
  }
};
