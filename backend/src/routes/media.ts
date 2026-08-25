import express, {
  Response,
} from "express";

import {
  authenticate,
} from "../middleware/authMiddleware";

import {
  userReadRateLimiter,
} from "../middleware/rateLimits";

import CameraSource
  from "../models/CameraSource";

import Device
  from "../models/Device";

import {
  reconcileCameraMediaState,
} from "../services/cameraMediaReconciliationService";

import {
  buildMediaSessionResponse,
} from "../services/mediaSessionService";

import {
  AuthenticatedRequest,
} from "../types/AuthenticatedRequest";

const router =
  express.Router();

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const findOwnedCamera =
  async (
    cameraId:
      string,
    userId:
      string
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

          required:
            true,
        },
      ],
    });
  };

router.post(
  "/sessions/:cameraId",
  authenticate,
  userReadRateLimiter,
  async (
    req:
      AuthenticatedRequest,
    res:
      Response
  ): Promise<void> => {
    if (!req.user) {
      res.status(403).json({
        error:
          "User not authenticated",
      });
      return;
    }

    if (
      !UUID_PATTERN.test(
        req.params.cameraId
      )
    ) {
      res.status(400).json({
        error:
          "cameraId must be a UUID",
      });
      return;
    }

    const camera =
      await findOwnedCamera(
        req.params.cameraId,
        req.user.id
      );

    if (!camera) {
      res.status(404).json({
        error:
          "Camera not found",
      });
      return;
    }

    if (!camera.enabled) {
      res.status(409).json({
        error:
          "Camera is disabled",
      });
      return;
    }

    const reconciliation =
      await reconcileCameraMediaState(
        camera
      );

    if (
      !reconciliation.ok
    ) {
      res.status(503).json({
        error:
          "Media gateway unavailable",
      });
      return;
    }

    const session =
      buildMediaSessionResponse(
        camera,
        req.user.id
      );

    res.status(201).json(
      session
    );
  }
);

export default router;
