import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import {
  requireEnv,
} from "../config/env";

const KEY_PATTERN =
  /^[a-fA-F0-9]{64}$/;

const CAMERA_STREAM_PREFIX =
  "cam_";

export class CameraSourceInputError
  extends Error {}

interface ProtectedCameraConfig {
  username: string;
  password: string;
  search: string;
}

export interface ParsedCameraSource {
  sourceScheme:
    | "rtsp"
    | "rtsps";
  sourceHost: string;
  sourcePort: number;
  sourcePath: string;
  authCiphertext:
    | string
    | null;
  authIv:
    | string
    | null;
  authTag:
    | string
    | null;
}

export interface CameraSourceAuthFields {
  authCiphertext:
    | string
    | null;
  authIv:
    | string
    | null;
  authTag:
    | string
    | null;
}

const getEncryptionKey =
  (): Buffer => {
    const raw =
      requireEnv(
        "CAMERA_SOURCE_KEY"
      );

    if (
      !KEY_PATTERN.test(raw)
    ) {
      throw new Error(
        "CAMERA_SOURCE_KEY must be a 64-character hex key"
      );
    }

    return Buffer.from(
      raw,
      "hex"
    );
  };

const safeDecode =
  (
    value: string
  ): string => {
    try {
      return decodeURIComponent(
        value
      );
    } catch {
      throw new CameraSourceInputError(
        "Camera URL contains invalid encoding"
      );
    }
  };

const encryptProtectedConfig =
  (
    value: ProtectedCameraConfig
  ): CameraSourceAuthFields => {
    if (
      value.username === "" &&
      value.password === "" &&
      value.search === ""
    ) {
      return {
        authCiphertext:
          null,
        authIv:
          null,
        authTag:
          null,
      };
    }

    const key =
      getEncryptionKey();

    const iv =
      randomBytes(12);

    const cipher =
      createCipheriv(
        "aes-256-gcm",
        key,
        iv
      );

    const plaintext =
      Buffer.from(
        JSON.stringify(value),
        "utf8"
      );

    const encrypted =
      Buffer.concat([
        cipher.update(
          plaintext
        ),
        cipher.final(),
      ]);

    const tag =
      cipher.getAuthTag();

    return {
      authCiphertext:
        encrypted.toString(
          "base64url"
        ),
      authIv:
        iv.toString("hex"),
      authTag:
        tag.toString("hex"),
    };
  };

export const decryptCameraSourceAuth =
  (
    fields:
      CameraSourceAuthFields
  ): ProtectedCameraConfig => {
    const {
      authCiphertext,
      authIv,
      authTag,
    } = fields;

    if (
      authCiphertext === null &&
      authIv === null &&
      authTag === null
    ) {
      return {
        username: "",
        password: "",
        search: "",
      };
    }

    if (
      !authCiphertext ||
      !authIv ||
      !authTag
    ) {
      throw new Error(
        "Camera protected configuration is incomplete"
      );
    }

    if (
      !/^[a-fA-F0-9]{24}$/.test(
        authIv
      ) ||
      !/^[a-fA-F0-9]{32}$/.test(
        authTag
      )
    ) {
      throw new Error(
        "Camera protected configuration is malformed"
      );
    }

    const decipher =
      createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        Buffer.from(
          authIv,
          "hex"
        )
      );

    decipher.setAuthTag(
      Buffer.from(
        authTag,
        "hex"
      )
    );

    const decrypted =
      Buffer.concat([
        decipher.update(
          Buffer.from(
            authCiphertext,
            "base64url"
          )
        ),
        decipher.final(),
      ]);

    const parsed =
      JSON.parse(
        decrypted.toString(
          "utf8"
        )
      ) as
        Partial<
          ProtectedCameraConfig
        >;

    if (
      typeof parsed.username !==
        "string" ||
      typeof parsed.password !==
        "string" ||
      typeof parsed.search !==
        "string"
    ) {
      throw new Error(
        "Camera protected configuration payload is invalid"
      );
    }

    return {
      username:
        parsed.username,
      password:
        parsed.password,
      search:
        parsed.search,
    };
  };

export const parseCameraSourceUrl =
  (
    rawSourceUrl: string
  ): ParsedCameraSource => {
    let parsed: URL;

    try {
      parsed =
        new URL(
          rawSourceUrl
        );
    } catch {
      throw new CameraSourceInputError(
        "Camera source URL is invalid"
      );
    }

    const scheme =
      parsed.protocol ===
      "rtsp:"
        ? "rtsp"
        : parsed.protocol ===
            "rtsps:"
          ? "rtsps"
          : null;

    if (!scheme) {
      throw new CameraSourceInputError(
        "Camera source must use rtsp or rtsps"
      );
    }

    if (
      parsed.hash !== ""
    ) {
      throw new CameraSourceInputError(
        "Camera source URL must not contain a fragment"
      );
    }

    const host =
      parsed.hostname.trim();

    if (
      host.length === 0 ||
      host.length > 255
    ) {
      throw new CameraSourceInputError(
        "Camera source host is invalid"
      );
    }

    const port =
      parsed.port === ""
        ? 554
        : Number(
            parsed.port
          );

    if (
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new CameraSourceInputError(
        "Camera source port is invalid"
      );
    }

    const sourcePath =
      parsed.pathname ||
      "/";

    if (
      sourcePath.length >
      1024
    ) {
      throw new CameraSourceInputError(
        "Camera source path is too long"
      );
    }

    const username =
      safeDecode(
        parsed.username
      );

    const password =
      safeDecode(
        parsed.password
      );

    if (
      (username === "") !==
      (password === "")
    ) {
      throw new CameraSourceInputError(
        "Camera source username and password must be provided together"
      );
    }

    const protectedFields =
      encryptProtectedConfig({
        username,
        password,
        // Query strings can contain camera access tokens.
        // Keep them encrypted instead of sourcePath.
        search:
          parsed.search,
      });

    return {
      sourceScheme:
        scheme,
      sourceHost:
        host,
      sourcePort:
        port,
      sourcePath,
      ...protectedFields,
    };
  };

export const generateCameraStreamPath =
  (): string => {
    return (
      CAMERA_STREAM_PREFIX +
      randomBytes(12)
        .toString("hex")
    );
  };
