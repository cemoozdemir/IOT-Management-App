import type {
  CameraConnectivityProbeResult,
  CameraConnectivityStatus,
} from "./cameraConnectivityProbe";

export interface CameraConnectionHealthUpdate {
  lastConnectedAt?:
    | Date
    | null;

  lastError:
    CameraConnectivityStatus
    | null;
}

export interface CameraConnectionHealthWritable {
  update(
    values:
      CameraConnectionHealthUpdate
  ): Promise<unknown>;
}

export const buildCameraConnectionHealthUpdate =
  (
    result:
      CameraConnectivityProbeResult,
    connectedAt:
      Date
  ): CameraConnectionHealthUpdate => {
    if (
      result.reachable &&
      result.status ===
        "connected"
    ) {
      return {
        lastConnectedAt:
          connectedAt,
        lastError:
          null,
      };
    }

    /*
     * Connectivity probe results contain only
     * normalized status identifiers. Raw socket
     * errors, URLs and camera credentials must
     * never be persisted here.
     */
    return {
      lastError:
        result.status,
    };
  };

export const resetCameraConnectionHealth =
  (): CameraConnectionHealthUpdate => {
    /*
     * A connectivity result belongs to one
     * specific source endpoint. Replacing that
     * endpoint invalidates the previous health.
     */
    return {
      lastConnectedAt:
        null,

      lastError:
        null,
    };
  };

export const applyCameraConnectionHealth =
  async (
    camera:
      CameraConnectionHealthWritable,
    result:
      CameraConnectivityProbeResult,
    now:
      () => Date =
        () => new Date()
  ): Promise<
    CameraConnectionHealthUpdate
  > => {
    const update =
      buildCameraConnectionHealthUpdate(
        result,
        now()
      );

    await camera.update(
      update
    );

    return update;
  };
