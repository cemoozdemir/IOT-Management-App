import axios from "axios";

const API_URL = "http://localhost:5001/api/devices";

export const getDevices = async () => {
  return axios.get(API_URL);
};

export const createDevice = async (device: { name: string; type: string }) => {
  return axios.post(API_URL, device);
};

export const updateDevice = async (
  id: string,
  device: { name: string; type: string; status: string }
) => {
  return axios.put(`${API_URL}/${id}`, device);
};

export const deleteDevice = async (id: string) => {
  return axios.delete(`${API_URL}/${id}`);
};
