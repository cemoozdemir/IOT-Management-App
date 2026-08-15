import axios from "axios";
import { API_BASE_URL } from "./config";

const DEVICE_API_URL =
  `${API_BASE_URL}/devices`;

export interface DeviceRecord {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline";
  lastSeenAt?: string | null;
}

export interface IssuedCredential {
  value: string;
  credentialId: string;
  shownOnce: true;
}

export interface CreateDeviceResponse {
  device: DeviceRecord;
  credential: IssuedCredential;
}

export interface RotateCredentialResponse {
  credential: IssuedCredential;
}

export interface RevokeCredentialResponse {
  revoked: boolean;
}

export const getDevices = async () => {
  return axios.get<DeviceRecord[]>(
    DEVICE_API_URL
  );
};

export const createDevice = async (
  device: {
    name: string;
    type: string;
  }
) => {
  return axios.post<CreateDeviceResponse>(
    DEVICE_API_URL,
    device
  );
};

export const rotateDeviceCredential =
  async (
    id: string
  ) => {
    return axios.post<RotateCredentialResponse>(
      `${DEVICE_API_URL}/${id}/credential/rotate`
    );
  };

export const revokeDeviceCredential =
  async (
    id: string
  ) => {
    return axios.delete<RevokeCredentialResponse>(
      `${DEVICE_API_URL}/${id}/credential`
    );
  };

export const deleteDevice = async (
  id: string
) => {
  return axios.delete<{
    message: string;
  }>(
    `${DEVICE_API_URL}/${id}`
  );
};
