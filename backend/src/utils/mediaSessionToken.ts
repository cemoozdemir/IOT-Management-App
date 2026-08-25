import {
  randomUUID,
} from "node:crypto";

import jwt, {
  JwtPayload,
} from "jsonwebtoken";

import {
  requireEnv,
} from "../config/env";

const MEDIA_TOKEN_ISSUER =
  "iot-management-app";

const MEDIA_TOKEN_AUDIENCE =
  "iot-media";

export const MEDIA_SESSION_TTL_SECONDS =
  90;

const STREAM_PATH_PATTERN =
  /^[A-Za-z0-9_-]{8,96}$/;

export interface MediaReadTokenPayload
  extends JwtPayload {
  purpose:
    "media-read";

  userId:
    string;

  cameraId:
    string;

  streamPath:
    string;
}

const getMediaSessionSecret =
  (): string => {
    return requireEnv(
      "MEDIA_SESSION_SECRET"
    );
  };

export const createMediaReadToken =
  (
    userId: string,
    cameraId: string,
    streamPath: string
  ): string => {
    if (
      userId.trim() === "" ||
      cameraId.trim() === "" ||
      !STREAM_PATH_PATTERN.test(
        streamPath
      )
    ) {
      throw new Error(
        "Invalid media session identity"
      );
    }

    return jwt.sign(
      {
        purpose:
          "media-read",
        userId,
        cameraId,
        streamPath,
      },
      getMediaSessionSecret(),
      {
        expiresIn:
          MEDIA_SESSION_TTL_SECONDS,

        issuer:
          MEDIA_TOKEN_ISSUER,

        audience:
          MEDIA_TOKEN_AUDIENCE,

        jwtid:
          randomUUID(),
      }
    );
  };

export const verifyMediaReadToken =
  (
    token: string
  ): MediaReadTokenPayload => {
    const decoded =
      jwt.verify(
        token,
        getMediaSessionSecret(),
        {
          issuer:
            MEDIA_TOKEN_ISSUER,

          audience:
            MEDIA_TOKEN_AUDIENCE,
        }
      );

    if (
      typeof decoded ===
        "string" ||
      decoded.purpose !==
        "media-read" ||
      typeof decoded.userId !==
        "string" ||
      decoded.userId.trim() ===
        "" ||
      typeof decoded.cameraId !==
        "string" ||
      decoded.cameraId.trim() ===
        "" ||
      typeof decoded.streamPath !==
        "string" ||
      !STREAM_PATH_PATTERN.test(
        decoded.streamPath
      )
    ) {
      throw new Error(
        "Invalid media token payload"
      );
    }

    return decoded as
      MediaReadTokenPayload;
  };
