import { Request } from "express";

export type DeviceAuthenticatedRequest =
  Request & {
    device?: {
      id: string;
      credentialId: string;
    };
  };
