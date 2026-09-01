import axios from "axios";

import {
  API_BASE_URL,
} from "./config";

const MEDIA_API_URL =
  `${API_BASE_URL}/media`;

export interface MediaSession {
  cameraId:
    string;

  streamPath:
    string;

  expiresIn:
    number;

  authorization: {
    scheme:
      "Bearer";

    token:
      string;
  };

  playback: {
    webrtcWhep:
      string;

    hlsPlaylist:
      string;
  };
}

export const createMediaSession =
  async (
    cameraId:
      string
  ) => {
    return axios.post<
      MediaSession
    >(
      `${MEDIA_API_URL}/sessions/${cameraId}`
    );
  };
