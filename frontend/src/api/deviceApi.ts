import axios from "axios";
import { API_BASE_URL } from "./config";

const DEVICE_API_URL =
  `${API_BASE_URL}/devices`;

export const getDevices = async () => {
  return axios.get(DEVICE_API_URL);
};

export const createDevice = async (
  device: {
    name: string;
    type: string;
    status?: string;
  }
) => {
  return axios.post(
    DEVICE_API_URL,
    device
  );
};

export const updateDevice = async (
  id: string,
  device: {
    name: string;
    type: string;
    status: string;
  }
) => {
  return axios.put(
    `${DEVICE_API_URL}/${id}`,
    device
  );
};

export const deleteDevice = async (
  id: string
) => {
  return axios.delete(
    `${DEVICE_API_URL}/${id}`
  );
};
