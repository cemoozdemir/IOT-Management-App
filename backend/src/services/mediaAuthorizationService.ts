import {
  verifyMediaReadToken,
} from "../utils/mediaSessionToken";

const STREAM_PATH_PATTERN =
  /^[A-Za-z0-9_-]{8,96}$/;

const MEDIA_TOKEN_MAX_LENGTH =
  8192;

export interface MediaAuthorizationIdentity {
  userId: string;
  cameraId: string;
  streamPath: string;
}

export type MediaAuthorizationLookup =
  (
    identity:
      MediaAuthorizationIdentity
  ) => Promise<boolean>;

interface MediaAuthRequest {
  token: string;
  action: "read";
  path: string;
  protocol:
    | "hls"
    | "webrtc";
}

const isPlainObject =
  (
    value:
      unknown
  ): value is
    Record<
      string,
      unknown
    > => {
    return (
      value !== null &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value
      )
    );
  };

const parseMediaAuthRequest =
  (
    body:
      unknown
  ):
    | MediaAuthRequest
    | null => {
    if (
      !isPlainObject(
        body
      )
    ) {
      return null;
    }

    const token =
      body.token;

    const action =
      body.action;

    const path =
      body.path;

    const protocol =
      body.protocol;

    if (
      typeof token !==
        "string" ||
      token.length < 1 ||
      token.length >
        MEDIA_TOKEN_MAX_LENGTH
    ) {
      return null;
    }

    if (
      action !==
      "read"
    ) {
      return null;
    }

    if (
      typeof path !==
        "string" ||
      !STREAM_PATH_PATTERN.test(
        path
      )
    ) {
      return null;
    }

    if (
      protocol !==
        "hls" &&
      protocol !==
        "webrtc"
    ) {
      return null;
    }

    return {
      token,
      action,
      path,
      protocol,
    };
  };

export const authorizeMediaRequest =
  async (
    body:
      unknown,
    lookup:
      MediaAuthorizationLookup
  ): Promise<boolean> => {
    const request =
      parseMediaAuthRequest(
        body
      );

    if (!request) {
      return false;
    }

    let identity:
      ReturnType<
        typeof verifyMediaReadToken
      >;

    try {
      identity =
        verifyMediaReadToken(
          request.token
        );
    } catch {
      return false;
    }

    if (
      identity.streamPath !==
      request.path
    ) {
      return false;
    }

    return lookup({
      userId:
        identity.userId,

      cameraId:
        identity.cameraId,

      streamPath:
        identity.streamPath,
    });
  };
