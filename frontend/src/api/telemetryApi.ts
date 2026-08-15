import axios from "axios";
import {
  API_BASE_URL,
} from "./config";

const TELEMETRY_API_URL =
  `${API_BASE_URL}/telemetry`;

export interface LatestTelemetryMeasurement {
  id: string;
  deviceId: string;
  eventId: string;
  metric: string;
  value: number;
  unit: string | null;
  recordedAt: string;
  receivedAt: string;
}

export interface LatestTelemetryResponse {
  generatedAt: string;
  truncated: boolean;
  measurements:
    LatestTelemetryMeasurement[];
}

export const getLatestTelemetry =
  async () => {
    return axios.get<
      LatestTelemetryResponse
    >(
      `${TELEMETRY_API_URL}/latest`
    );
  };
