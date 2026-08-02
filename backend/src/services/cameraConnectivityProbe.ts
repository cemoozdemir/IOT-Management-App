import {
  createConnection,
} from "node:net";

export type CameraConnectivityStatus =
  | "connected"
  | "timeout"
  | "dns_error"
  | "connection_refused"
  | "network_unreachable"
  | "connection_error";

export interface CameraConnectivityProbeTarget {
  host: string;
  port: number;
  timeoutMs?: number;
}

export interface CameraConnectivityProbeResult {
  reachable: boolean;
  status: CameraConnectivityStatus;
  elapsedMs: number;
}

export type CameraConnectivityDialer =
  (
    host: string,
    port: number,
    timeoutMs: number
  ) => Promise<void>;

const DEFAULT_TIMEOUT_MS =
  2500;

const MIN_TIMEOUT_MS =
  100;

const MAX_TIMEOUT_MS =
  10000;

export class CameraConnectivityProbeInputError
  extends Error {}

const normalizeHost =
  (
    value: string
  ): string => {
    if (
      typeof value !== "string"
    ) {
      throw new CameraConnectivityProbeInputError(
        "Camera host must be a string"
      );
    }

    const host =
      value.trim();

    if (
      host.length === 0 ||
      host.length > 255
    ) {
      throw new CameraConnectivityProbeInputError(
        "Camera host is invalid"
      );
    }

    /*
     * This service accepts only a host name or IP address.
     * Credentials, URLs, paths and query strings must never
     * reach the connectivity layer.
     */
    if (
      host.includes("@") ||
      host.includes("/") ||
      host.includes("?") ||
      host.includes("#") ||
      host.includes("://")
    ) {
      throw new CameraConnectivityProbeInputError(
        "Camera host must not contain URL data"
      );
    }

    /*
     * WHATWG URL parsing can preserve brackets around an
     * IPv6 literal. net.createConnection expects the bare
     * address.
     */
    if (
      host.startsWith("[") &&
      host.endsWith("]")
    ) {
      const unwrapped =
        host.slice(
          1,
          -1
        );

      if (
        unwrapped.length === 0
      ) {
        throw new CameraConnectivityProbeInputError(
          "Camera host is invalid"
        );
      }

      return unwrapped;
    }

    if (
      host.includes("[") ||
      host.includes("]")
    ) {
      throw new CameraConnectivityProbeInputError(
        "Camera host is invalid"
      );
    }

    return host;
  };

const validatePort =
  (
    value: number
  ): number => {
    if (
      !Number.isInteger(value) ||
      value < 1 ||
      value > 65535
    ) {
      throw new CameraConnectivityProbeInputError(
        "Camera port must be between 1 and 65535"
      );
    }

    return value;
  };

const validateTimeout =
  (
    value:
      | number
      | undefined
  ): number => {
    if (
      value === undefined
    ) {
      return DEFAULT_TIMEOUT_MS;
    }

    if (
      !Number.isInteger(value) ||
      value < MIN_TIMEOUT_MS ||
      value > MAX_TIMEOUT_MS
    ) {
      throw new CameraConnectivityProbeInputError(
        "Camera connectivity timeout is invalid"
      );
    }

    return value;
  };

export const classifyCameraConnectivityError =
  (
    error: unknown
  ): CameraConnectivityStatus => {
    const code =
      (
        error as
          NodeJS.ErrnoException
      )?.code;

    switch (code) {
      case "ETIMEDOUT":
        return "timeout";

      case "ENOTFOUND":
      case "EAI_AGAIN":
        return "dns_error";

      case "ECONNREFUSED":
        return "connection_refused";

      case "ENETUNREACH":
      case "EHOSTUNREACH":
        return "network_unreachable";

      default:
        return "connection_error";
    }
  };

export const dialCameraTcp =
  (
    host: string,
    port: number,
    timeoutMs: number
  ): Promise<void> => {
    return new Promise<void>(
      (
        resolve,
        reject
      ) => {
        let settled =
          false;

        let socket:
          ReturnType<
            typeof createConnection
          >;

        const timeoutError =
          (): NodeJS.ErrnoException => {
            const error =
              new Error(
                "Camera TCP connection timed out"
              ) as
                NodeJS.ErrnoException;

            error.code =
              "ETIMEDOUT";

            return error;
          };

        let timer:
          NodeJS.Timeout;

        const finish =
          (
            error?:
              Error
          ): void => {
            if (settled) {
              return;
            }

            settled = true;

            clearTimeout(
              timer
            );

            socket.removeAllListeners();
            socket.destroy();

            if (error) {
              reject(error);
              return;
            }

            resolve();
          };

        try {
          socket =
            createConnection({
              host,
              port,
            });
        } catch (error) {
          reject(error);
          return;
        }

        timer =
          setTimeout(
            () => {
              finish(
                timeoutError()
              );
            },
            timeoutMs
          );

        timer.unref();

        socket.once(
          "connect",
          () => {
            finish();
          }
        );

        socket.once(
          "error",
          (
            error:
              Error
          ) => {
            finish(
              error
            );
          }
        );
      }
    );
  };

export const probeCameraConnectivity =
  async (
    target:
      CameraConnectivityProbeTarget,
    dialer:
      CameraConnectivityDialer =
        dialCameraTcp
  ): Promise<
    CameraConnectivityProbeResult
  > => {
    const host =
      normalizeHost(
        target.host
      );

    const port =
      validatePort(
        target.port
      );

    const timeoutMs =
      validateTimeout(
        target.timeoutMs
      );

    const startedAt =
      Date.now();

    try {
      await dialer(
        host,
        port,
        timeoutMs
      );

      return {
        reachable:
          true,
        status:
          "connected",
        elapsedMs:
          Math.max(
            0,
            Date.now() -
              startedAt
          ),
      };
    } catch (error) {
      return {
        reachable:
          false,
        status:
          classifyCameraConnectivityError(
            error
          ),
        elapsedMs:
          Math.max(
            0,
            Date.now() -
              startedAt
          ),
      };
    }
  };
