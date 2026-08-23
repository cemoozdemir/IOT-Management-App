import CameraSource from "../models/CameraSource";
import {
  ensureMediaGatewayPath,
  removeMediaGatewayPath,
} from "./mediaGatewayService";

const SAFE_GATEWAY_ERROR =
  "Media gateway reconciliation failed";

export type CameraMediaAction =
  | "configure"
  | "remove";

export interface CameraMediaReconciliationResult {
  ok: boolean;
  action: CameraMediaAction;
  errorCode:
    | "gateway_error"
    | null;
}

export interface CameraMediaReconciliationSummary {
  total: number;
  configured: number;
  removed: number;
  failed: number;
}

const setLastError =
  async (
    camera: CameraSource,
    value:
      | string
      | null
  ): Promise<void> => {
    if (
      camera.lastError ===
      value
    ) {
      return;
    }

    await camera.update({
      lastError:
        value,
    });
  };

export const reconcileCameraMediaState =
  async (
    camera: CameraSource
  ): Promise<
    CameraMediaReconciliationResult
  > => {
    const action:
      CameraMediaAction =
      camera.enabled
        ? "configure"
        : "remove";

    try {
      if (camera.enabled) {
        await ensureMediaGatewayPath(
          camera
        );
      } else {
        await removeMediaGatewayPath(
          camera.streamPath
        );
      }

      await setLastError(
        camera,
        null
      );

      return {
        ok: true,
        action,
        errorCode:
          null,
      };
    } catch {
      // Never store MediaMTX response text or
      // reconstructed RTSP credentials.
      await setLastError(
        camera,
        SAFE_GATEWAY_ERROR
      ).catch(
        () => undefined
      );

      return {
        ok: false,
        action,
        errorCode:
          "gateway_error",
      };
    }
  };

export const detachCameraMediaState =
  async (
    camera: CameraSource
  ): Promise<
    CameraMediaReconciliationResult
  > => {
    try {
      await removeMediaGatewayPath(
        camera.streamPath
      );

      await setLastError(
        camera,
        null
      );

      return {
        ok: true,
        action:
          "remove",
        errorCode:
          null,
      };
    } catch {
      await setLastError(
        camera,
        SAFE_GATEWAY_ERROR
      ).catch(
        () => undefined
      );

      return {
        ok: false,
        action:
          "remove",
        errorCode:
          "gateway_error",
      };
    }
  };

export const reconcileAllCameraMediaStates =
  async (): Promise<
    CameraMediaReconciliationSummary
  > => {
    const cameras =
      await CameraSource.findAll({
        order: [
          [
            "createdAt",
            "ASC",
          ],
        ],
      });

    const summary:
      CameraMediaReconciliationSummary = {
        total:
          cameras.length,
        configured:
          0,
        removed:
          0,
        failed:
          0,
      };

    for (
      const camera
      of cameras
    ) {
      const result =
        await reconcileCameraMediaState(
          camera
        );

      if (!result.ok) {
        summary.failed +=
          1;
        continue;
      }

      if (
        result.action ===
        "configure"
      ) {
        summary.configured +=
          1;
      } else {
        summary.removed +=
          1;
      }
    }

    return summary;
  };
