import axios from "axios";
import {
  API_BASE_URL,
} from "./config";

const CAMERA_API_URL =
  `${API_BASE_URL}/cameras`;

export interface CameraSourceSummary {
  scheme:
    | "rtsp"
    | "rtsps";
  host: string;
  port: number;
  protectedConnectionData: boolean;
}

export interface CameraRecord {
  id: string;
  deviceId: string;
  name: string;
  streamPath: string;
  enabled: boolean;

  source:
    CameraSourceSummary;

  lastConnectedAt:
    | string
    | null;

  lastError:
    | string
    | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateCameraInput {
  deviceId: string;
  name: string;
  sourceUrl: string;
  enabled?: boolean;
}

export interface UpdateCameraInput {
  name?: string;
  sourceUrl?: string;
  enabled?: boolean;
}

export const getCameras =
  async () => {
    return axios.get<
      CameraRecord[]
    >(
      CAMERA_API_URL
    );
  };

export const createCamera =
  async (
    input:
      CreateCameraInput
  ) => {
    return axios.post<
      CameraRecord
    >(
      CAMERA_API_URL,
      input
    );
  };

export const updateCamera =
  async (
    id: string,
    input:
      UpdateCameraInput
  ) => {
    return axios.put<
      CameraRecord
    >(
      `${CAMERA_API_URL}/${id}`,
      input
    );
  };

export const deleteCamera =
  async (
    id: string
  ) => {
    return axios.delete(
      `${CAMERA_API_URL}/${id}`
    );
  };
