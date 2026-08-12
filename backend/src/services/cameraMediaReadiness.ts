export type CameraMediaReadinessStatus =
  | "ready"
  | "disabled"
  | "not_connected"
  | "connection_error";

export interface CameraMediaReadinessInput {
  enabled: boolean;

  lastConnectedAt:
    | Date
    | string
    | null;

  lastError:
    | string
    | null;
}

export interface CameraMediaReadiness {
  ready: boolean;

  status:
    CameraMediaReadinessStatus;

  lastConnectedAt:
    | Date
    | string
    | null;
}

export const getCameraMediaReadiness =
  (
    camera:
      CameraMediaReadinessInput
  ): CameraMediaReadiness => {
    if (!camera.enabled) {
      return {
        ready:
          false,

        status:
          "disabled",

        lastConnectedAt:
          camera.lastConnectedAt,
      };
    }

    /*
     * Persisted error contents are collapsed to
     * one safe readiness state. Raw network data
     * must never be returned from this layer.
     */
    if (camera.lastError) {
      return {
        ready:
          false,

        status:
          "connection_error",

        lastConnectedAt:
          camera.lastConnectedAt,
      };
    }

    if (!camera.lastConnectedAt) {
      return {
        ready:
          false,

        status:
          "not_connected",

        lastConnectedAt:
          null,
      };
    }

    return {
      ready:
        true,

      status:
        "ready",

      lastConnectedAt:
        camera.lastConnectedAt,
    };
  };

export const serializeCameraMediaReadiness =
  (
    cameraId: string,
    streamPath: string,
    readiness:
      CameraMediaReadiness
  ) => ({
    cameraId,
    streamPath,

    media: {
      ready:
        readiness.ready,

      status:
        readiness.status,

      lastConnectedAt:
        readiness.lastConnectedAt,
    },
  });
