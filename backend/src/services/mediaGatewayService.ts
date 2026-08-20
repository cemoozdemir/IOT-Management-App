import * as http from "node:http";
import CameraSource from "../models/CameraSource";
import {
  decryptCameraSourceAuth,
} from "../utils/cameraSourceConfig";

const DEFAULT_MEDIA_GATEWAY_API_URL =
  "http://127.0.0.1:9997";

const MEDIA_GATEWAY_TIMEOUT_MS =
  3_000;

const STREAM_PATH_PATTERN =
  /^[A-Za-z0-9_-]{8,96}$/;

const LOOPBACK_HOSTS =
  new Set([
    "127.0.0.1",
    "localhost",
    "::1",
    "[::1]",
  ]);

export class MediaGatewayError
  extends Error {
  public readonly statusCode:
    | number
    | null;

  constructor(
    message: string,
    statusCode:
      | number
      | null = null
  ) {
    super(message);

    this.name =
      "MediaGatewayError";

    this.statusCode =
      statusCode;
  }
}

export type MediaCameraSource =
  Pick<
    CameraSource,
    | "streamPath"
    | "enabled"
    | "sourceScheme"
    | "sourceHost"
    | "sourcePort"
    | "sourcePath"
    | "authCiphertext"
    | "authIv"
    | "authTag"
  >;

export interface MediaGatewayPathConfig {
  source: string;
  sourceOnDemand: boolean;
  sourceOnDemandStartTimeout: string;
  sourceOnDemandCloseAfter: string;
  maxReaders: number;
  record: boolean;
  rtspTransport: "tcp";
}

const getMediaGatewayApiUrl =
  (): URL => {
    const raw =
      process.env
        .MEDIA_GATEWAY_API_URL
        ?.trim() ||
      DEFAULT_MEDIA_GATEWAY_API_URL;

    let parsed: URL;

    try {
      parsed =
        new URL(raw);
    } catch {
      throw new MediaGatewayError(
        "Media gateway API URL is invalid"
      );
    }

    if (
      parsed.protocol !==
      "http:"
    ) {
      throw new MediaGatewayError(
        "Media gateway API must use HTTP on loopback"
      );
    }

    if (
      !LOOPBACK_HOSTS.has(
        parsed.hostname
      )
    ) {
      throw new MediaGatewayError(
        "Media gateway API must use a loopback host"
      );
    }

    if (
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.search !== "" ||
      parsed.hash !== ""
    ) {
      throw new MediaGatewayError(
        "Media gateway API URL contains unsupported components"
      );
    }

    if (
      parsed.pathname !== "/" &&
      parsed.pathname !== ""
    ) {
      throw new MediaGatewayError(
        "Media gateway API URL must not contain a path"
      );
    }

    parsed.pathname = "/";

    return parsed;
  };

const requestMediaGateway =
  async (
    method: string,
    pathname: string,
    body?:
      object
  ): Promise<number> => {
    const base =
      getMediaGatewayApiUrl();

    const target =
      new URL(
        pathname,
        base
      );

    const payload =
      body === undefined
        ? null
        : JSON.stringify(
            body
          );

    return new Promise<
      number
    >(
      (
        resolve,
        reject
      ) => {
        const request =
          http.request(
            target,
            {
              method,
              headers:
                payload === null
                  ? {
                      Accept:
                        "application/json",
                    }
                  : {
                      Accept:
                        "application/json",
                      "Content-Type":
                        "application/json",
                      "Content-Length":
                        Buffer.byteLength(
                          payload
                        ),
                    },
            },
            (response) => {
              const statusCode =
                response.statusCode ??
                0;

              // MediaMTX validation errors can echo
              // a source URL. Never retain or surface
              // response bodies from this internal API.
              response.resume();

              response.once(
                "end",
                () => {
                  resolve(
                    statusCode
                  );
                }
              );

              response.once(
                "error",
                () => {
                  reject(
                    new MediaGatewayError(
                      "Media gateway response failed"
                    )
                  );
                }
              );
            }
          );

        request.setTimeout(
          MEDIA_GATEWAY_TIMEOUT_MS,
          () => {
            request.destroy();
          }
        );

        request.once(
          "error",
          () => {
            reject(
              new MediaGatewayError(
                "Media gateway is unavailable"
              )
            );
          }
        );

        if (
          payload !== null
        ) {
          request.write(
            payload
          );
        }

        request.end();
      }
    );
  };

const requireValidStreamPath =
  (
    streamPath: string
  ): void => {
    if (
      !STREAM_PATH_PATTERN.test(
        streamPath
      )
    ) {
      throw new MediaGatewayError(
        "Camera stream path is invalid"
      );
    }
  };

const pathEndpoint =
  (
    operation:
      | "get"
      | "add"
      | "patch"
      | "delete",
    streamPath: string
  ): string => {
    requireValidStreamPath(
      streamPath
    );

    return (
      `/v3/config/paths/${operation}/` +
      encodeURIComponent(
        streamPath
      )
    );
  };

const formatHost =
  (
    host: string
  ): string => {
    if (
      host.includes(":") &&
      !host.startsWith("[")
    ) {
      return `[${host}]`;
    }

    return host;
  };

export const buildCameraSourceUrl =
  (
    camera:
      MediaCameraSource
  ): string => {
    const sourcePath =
      camera.sourcePath
        .startsWith("/")
        ? camera.sourcePath
        : `/${camera.sourcePath}`;

    const base =
      (
        `${camera.sourceScheme}://` +
        `${formatHost(
          camera.sourceHost
        )}:` +
        `${camera.sourcePort}` +
        sourcePath
      );

    let source: URL;

    try {
      source =
        new URL(base);
    } catch {
      throw new MediaGatewayError(
        "Stored camera source is invalid"
      );
    }

    const protectedConfig =
      decryptCameraSourceAuth({
        authCiphertext:
          camera.authCiphertext,
        authIv:
          camera.authIv,
        authTag:
          camera.authTag,
      });

    if (
      protectedConfig.username !==
        "" ||
      protectedConfig.password !==
        ""
    ) {
      source.username =
        protectedConfig.username;

      source.password =
        protectedConfig.password;
    }

    source.search =
      protectedConfig.search;

    return source.toString();
  };

export const buildMediaGatewayPathConfig =
  (
    camera:
      MediaCameraSource
  ): MediaGatewayPathConfig => {
    return {
      source:
        buildCameraSourceUrl(
          camera
        ),

      // Explicitly send these fields instead of
      // relying on path-default inheritance when
      // creating configuration through the API.
      sourceOnDemand:
        true,

      sourceOnDemandStartTimeout:
        "10s",

      sourceOnDemandCloseAfter:
        "15s",

      maxReaders:
        4,

      record:
        false,

      rtspTransport:
        "tcp",
    };
  };

export const mediaGatewayPathExists =
  async (
    streamPath: string
  ): Promise<boolean> => {
    const status =
      await requestMediaGateway(
        "GET",
        pathEndpoint(
          "get",
          streamPath
        )
      );

    if (
      status === 404
    ) {
      return false;
    }

    if (
      status >= 200 &&
      status < 300
    ) {
      return true;
    }

    throw new MediaGatewayError(
      "Media gateway path lookup failed",
      status
    );
  };

export const removeMediaGatewayPath =
  async (
    streamPath: string
  ): Promise<boolean> => {
    const status =
      await requestMediaGateway(
        "DELETE",
        pathEndpoint(
          "delete",
          streamPath
        )
      );

    if (
      status === 404
    ) {
      return false;
    }

    if (
      status >= 200 &&
      status < 300
    ) {
      return true;
    }

    throw new MediaGatewayError(
      "Media gateway path removal failed",
      status
    );
  };

export const ensureMediaGatewayPath =
  async (
    camera:
      MediaCameraSource
  ): Promise<
    | "added"
    | "updated"
    | "removed"
    | "absent"
  > => {
    requireValidStreamPath(
      camera.streamPath
    );

    if (
      !camera.enabled
    ) {
      const removed =
        await removeMediaGatewayPath(
          camera.streamPath
        );

      return removed
        ? "removed"
        : "absent";
    }

    const exists =
      await mediaGatewayPathExists(
        camera.streamPath
      );

    const method =
      exists
        ? "PATCH"
        : "POST";

    const operation =
      exists
        ? "patch"
        : "add";

    const status =
      await requestMediaGateway(
        method,
        pathEndpoint(
          operation,
          camera.streamPath
        ),
        buildMediaGatewayPathConfig(
          camera
        )
      );

    if (
      status < 200 ||
      status >= 300
    ) {
      throw new MediaGatewayError(
        exists
          ? "Media gateway path update failed"
          : "Media gateway path creation failed",
        status
      );
    }

    return exists
      ? "updated"
      : "added";
  };

export const isMediaGatewayHealthy =
  async (): Promise<boolean> => {
    try {
      const status =
        await requestMediaGateway(
          "GET",
          "/v3/info"
        );

      return (
        status >= 200 &&
        status < 300
      );
    } catch {
      return false;
    }
  };
