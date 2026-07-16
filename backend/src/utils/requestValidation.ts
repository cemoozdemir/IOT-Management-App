const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u001f\u007f]/;

export const MAX_EMAIL_LENGTH =
  254;

export const MIN_PASSWORD_LENGTH =
  12;

export const MAX_PASSWORD_LENGTH =
  128;

export const MAX_DEVICE_NAME_LENGTH =
  100;

export const MAX_DEVICE_TYPE_LENGTH =
  64;

type ValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: string;
    };

const asBodyObject = (
  rawBody: unknown
):
  | Record<
      string,
      unknown
    >
  | null => {
  if (
    !rawBody ||
    typeof rawBody !==
      "object" ||
    Array.isArray(rawBody)
  ) {
    return null;
  }

  return rawBody as
    Record<
      string,
      unknown
    >;
};

export type AuthValidationMode =
  | "login"
  | "register";

export interface ValidatedAuthBody {
  email: string;
  password: string;
}

export const validateAuthBody = (
  rawBody: unknown,
  mode:
    AuthValidationMode
): ValidationResult<
  ValidatedAuthBody
> => {
  const body =
    asBodyObject(
      rawBody
    );

  if (!body) {
    return {
      ok: false,
      error:
        "Authentication body must be an object",
    };
  }

  if (
    typeof body.email !==
    "string"
  ) {
    return {
      ok: false,
      error:
        "A valid email address is required",
    };
  }

  const email =
    body.email
      .trim()
      .toLowerCase();

  if (
    !email ||
    email.length >
      MAX_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(
      email
    )
  ) {
    return {
      ok: false,
      error:
        "A valid email address is required",
    };
  }

  if (
    typeof body.password !==
    "string" ||
    body.password.length ===
      0 ||
    body.password.length >
      MAX_PASSWORD_LENGTH
  ) {
    return {
      ok: false,
      error:
        mode ===
        "register"
          ? "Password must be between 12 and 128 characters"
          : "Email and password are required",
    };
  }

  if (
    mode === "register" &&
    body.password.length <
      MIN_PASSWORD_LENGTH
  ) {
    return {
      ok: false,
      error:
        "Password must be between 12 and 128 characters",
    };
  }

  return {
    ok: true,
    value: {
      email,
      password:
        body.password,
    },
  };
};

interface DeviceMetadata {
  name: string;
  type: string;
}

const normalizeDeviceText = (
  value: unknown,
  label: string,
  maxLength: number
): ValidationResult<
  string
> => {
  if (
    typeof value !==
    "string"
  ) {
    return {
      ok: false,
      error:
        `${label} must be a string`,
    };
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      maxLength ||
    CONTROL_CHARACTER_PATTERN.test(
      normalized
    )
  ) {
    return {
      ok: false,
      error:
        `${label} format is invalid`,
    };
  }

  return {
    ok: true,
    value:
      normalized,
  };
};

export const validateDeviceCreateBody =
  (
    rawBody: unknown
  ): ValidationResult<
    DeviceMetadata
  > => {
    const body =
      asBodyObject(
        rawBody
      );

    if (!body) {
      return {
        ok: false,
        error:
          "Device body must be an object",
      };
    }

    const name =
      normalizeDeviceText(
        body.name,
        "Device name",
        MAX_DEVICE_NAME_LENGTH
      );

    if (!name.ok) {
      return name;
    }

    const type =
      normalizeDeviceText(
        body.type,
        "Device type",
        MAX_DEVICE_TYPE_LENGTH
      );

    if (!type.ok) {
      return type;
    }

    return {
      ok: true,
      value: {
        name:
          name.value,
        type:
          type.value,
      },
    };
  };

export const validateDeviceUpdateBody =
  (
    rawBody: unknown
  ): ValidationResult<
    Partial<
      DeviceMetadata
    >
  > => {
    const body =
      asBodyObject(
        rawBody
      );

    if (!body) {
      return {
        ok: false,
        error:
          "Device body must be an object",
      };
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          body,
          "status"
        )
    ) {
      return {
        ok: false,
        error:
          "Device status is derived from telemetry",
      };
    }

    const updates:
      Partial<
        DeviceMetadata
      > = {};

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          body,
          "name"
        )
    ) {
      const name =
        normalizeDeviceText(
          body.name,
          "Device name",
          MAX_DEVICE_NAME_LENGTH
        );

      if (!name.ok) {
        return name;
      }

      updates.name =
        name.value;
    }

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          body,
          "type"
        )
    ) {
      const type =
        normalizeDeviceText(
          body.type,
          "Device type",
          MAX_DEVICE_TYPE_LENGTH
        );

      if (!type.ok) {
        return type;
      }

      updates.type =
        type.value;
    }

    if (
      Object.keys(
        updates
      ).length === 0
    ) {
      return {
        ok: false,
        error:
          "At least one device metadata field is required",
      };
    }

    return {
      ok: true,
      value:
        updates,
    };
  };
