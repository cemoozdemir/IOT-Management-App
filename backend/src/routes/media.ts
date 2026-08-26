import express, {
  NextFunction,
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
  authorizeMediaRequest,
  MediaAuthorizationIdentity,
} from "../services/mediaAuthorizationService";

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

const mediaAuthorizationLookup =
  async (
    identity:
      MediaAuthorizationIdentity
  ): Promise<boolean> => {
    const camera =
      await CameraSource.findOne({
        where: {
          id:
            identity.cameraId,

          streamPath:
            identity.streamPath,

          enabled:
            true,
        },

        include: [
          {
            model:
              Device,

            where: {
              userId:
                identity.userId,
            },

            attributes: [],

            required:
              true,
          },
        ],
      });

    return Boolean(
      camera
    );
  };

/*
 * MediaMTX HTTP authentication callback.
 *
 * MediaMTX POSTs its authentication payload here.
 * Only short-lived media-read tokens for the exact
 * camera path are accepted.
 *
 * Never log request bodies or token values.
 */
router.post(
  "/auth",
  async (
    req,
    res:
      Response,
    next:
      NextFunction
  ): Promise<void> => {
    try {
      const authorized =
        await authorizeMediaRequest(
          req.body,
          mediaAuthorizationLookup
        );

      if (!authorized) {
        res.status(401).json({
          error:
            "Unauthorized media request",
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      /*
       * Database or internal failures must fail
       * closed. Passing to the common handler
       * returns 500, which MediaMTX interprets
       * as an authentication failure.
       */
      next(error);
    }
  }
);

router.post(
  "/sessions/:cameraId",
  authenticate,
  userReadRateLimiter,
  async (
    req:
      AuthenticatedRequest,
    res:
      Response,
    next:
      NextFunction
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

    try {
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
    } catch (error) {
      next(error);
    }
  }
);

export default router;
