import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const DEVICE_CREDENTIAL_MARKER =
  "iot_dev_";

const LOOKUP_ID_PATTERN =
  /^[a-f0-9]{24}$/;

const SECRET_PATTERN =
  /^[A-Za-z0-9_-]{43}$/;

const HASH_PATTERN =
  /^[a-f0-9]{64}$/;

export interface GeneratedDeviceCredential {
  rawCredential: string;
  lookupId: string;
  secretHash: string;
}

export interface ParsedDeviceCredential {
  lookupId: string;
}

export const hashDeviceCredential = (
  rawCredential: string
): string => {
  return createHash("sha256")
    .update(rawCredential, "utf8")
    .digest("hex");
};

export const generateDeviceCredential =
  (): GeneratedDeviceCredential => {
    const lookupId =
      randomBytes(12).toString("hex");

    const secret =
      randomBytes(32).toString("base64url");

    const rawCredential =
      `${DEVICE_CREDENTIAL_MARKER}${lookupId}.${secret}`;

    return {
      rawCredential,
      lookupId,
      secretHash:
        hashDeviceCredential(rawCredential),
    };
  };

export const parseDeviceCredential = (
  rawCredential: string
): ParsedDeviceCredential | null => {
  if (
    !rawCredential.startsWith(
      DEVICE_CREDENTIAL_MARKER
    )
  ) {
    return null;
  }

  const body =
    rawCredential.slice(
      DEVICE_CREDENTIAL_MARKER.length
    );

  const separatorIndex =
    body.indexOf(".");

  if (
    separatorIndex <= 0 ||
    separatorIndex !==
      body.lastIndexOf(".")
  ) {
    return null;
  }

  const lookupId =
    body.slice(0, separatorIndex);

  const secret =
    body.slice(separatorIndex + 1);

  if (
    !LOOKUP_ID_PATTERN.test(lookupId) ||
    !SECRET_PATTERN.test(secret)
  ) {
    return null;
  }

  return {
    lookupId,
  };
};

export const verifyDeviceCredential = (
  rawCredential: string,
  expectedHash: string
): boolean => {
  if (
    !HASH_PATTERN.test(expectedHash)
  ) {
    return false;
  }

  const actual =
    Buffer.from(
      hashDeviceCredential(rawCredential),
      "hex"
    );

  const expected =
    Buffer.from(
      expectedHash,
      "hex"
    );

  if (
    actual.length !== expected.length
  ) {
    return false;
  }

  return timingSafeEqual(
    actual,
    expected
  );
};
