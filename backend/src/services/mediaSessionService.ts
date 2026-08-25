import CameraSource
  from "../models/CameraSource";

import {
  createMediaReadToken,
  MEDIA_SESSION_TTL_SECONDS,
} from "../utils/mediaSessionToken";

const STREAM_PATH_PATTERN =
  /^[A-Za-z0-9_-]{8,96}$/;

export interface MediaSessionResponse {
  cameraId: string;
  streamPath: string;

  expiresIn:
    number;

  authorization: {
    scheme:
      "Bearer";
    token:
      string;
  };

  playback: {
    webrtcWhep:
      string;
    hlsPlaylist:
      string;
  };
}

export type MediaSessionCamera =
  Pick<
    CameraSource,
    | "id"
    | "streamPath"
    | "enabled"
  >;

export const buildMediaSessionResponse =
  (
    camera:
      MediaSessionCamera,
    userId:
      string
  ): MediaSessionResponse => {
    if (
      !camera.enabled
    ) {
      throw new Error(
        "Camera is disabled"
      );
    }

    if (
      !STREAM_PATH_PATTERN.test(
        camera.streamPath
      )
    ) {
      throw new Error(
        "Camera stream path is invalid"
      );
    }

    const token =
      createMediaReadToken(
        userId,
        camera.id,
        camera.streamPath
      );

    const encodedPath =
      encodeURIComponent(
        camera.streamPath
      );

    return {
      cameraId:
        camera.id,

      streamPath:
        camera.streamPath,

      expiresIn:
        MEDIA_SESSION_TTL_SECONDS,

      authorization: {
        scheme:
          "Bearer",
        token,
      },

      playback: {
        webrtcWhep:
          `/media/webrtc/${encodedPath}/whep`,

        hlsPlaylist:
          `/media/hls/${encodedPath}/index.m3u8`,
      },
    };
  };
