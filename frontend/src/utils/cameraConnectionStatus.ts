export type CameraConnectionState =
  | "connected"
  | "error"
  | "disabled"
  | "untested";

export interface CameraConnectionStateInput {
  enabled: boolean;

  lastConnectedAt:
    | string
    | null;

  lastError:
    | string
    | null;
}

export interface CameraConnectionView {
  state:
    CameraConnectionState;

  label:
    string;
}

const ERROR_LABELS:
  Record<
    string,
    string
  > = {
    timeout:
      "Connection timed out",

    dns_error:
      "Camera address unavailable",

    connection_refused:
      "Connection refused",

    network_unreachable:
      "Network unreachable",

    connection_error:
      "Connection error",
  };

export const getCameraConnectionView =
  (
    camera:
      CameraConnectionStateInput
  ): CameraConnectionView => {
    if (!camera.enabled) {
      return {
        state:
          "disabled",
        label:
          "Disabled",
      };
    }

    if (camera.lastError) {
      return {
        state:
          "error",

        /*
         * Never display arbitrary persisted
         * error text. Only explicitly known
         * normalized status values receive
         * user-facing labels.
         */
        label:
          ERROR_LABELS[
            camera.lastError
          ] ??
          "Connection error",
      };
    }

    if (camera.lastConnectedAt) {
      return {
        state:
          "connected",
        label:
          "Connected",
      };
    }

    return {
      state:
        "untested",
      label:
        "Not tested",
    };
  };
