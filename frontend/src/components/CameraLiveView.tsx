import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createMediaSession,
} from "../api/mediaApi";

import {
  loadMediaMTXReader,
  MediaMTXReader,
} from "../media/mediamtxReader";

import {
  CameraLiveHeader,
  CameraLivePanel,
  CameraLiveStatus,
  CameraVideo,
  CameraVideoFrame,
} from "../styles/cameraLive";

import {
  Button,
} from "./ui/button";

interface CameraLiveViewProps {
  cameraId:
    string;

  cameraName:
    string;

  onClose:
    () => void;
}

type LiveState =
  | "connecting"
  | "live"
  | "error";

const CameraLiveView:
  React.FC<
    CameraLiveViewProps
  > = ({
    cameraId,
    cameraName,
    onClose,
  }) => {
    const videoRef =
      useRef<
        HTMLVideoElement
      >(null);

    const readerRef =
      useRef<
        MediaMTXReader |
        null
      >(null);

    const [
      liveState,
      setLiveState,
    ] = useState<
      LiveState
    >(
      "connecting"
    );

    const [
      error,
      setError,
    ] = useState<
      string |
      null
    >(
      null
    );

    useEffect(
      () => {
        let cancelled =
          false;

        const closeReader =
          () => {
            if (
              readerRef.current
            ) {
              readerRef
                .current
                .close();

              readerRef.current =
                null;
            }

            const video =
              videoRef.current;

            if (
              video &&
              video.srcObject
            ) {
              const stream =
                video.srcObject as
                  MediaStream;

              stream
                .getTracks()
                .forEach(
                  (
                    track
                  ) => {
                    track.stop();
                  }
                );

              video.srcObject =
                null;
            }
          };

        const start =
          async () => {
            setLiveState(
              "connecting"
            );

            setError(
              null
            );

            try {
              const [
                response,
                Reader,
              ] =
                await Promise.all([
                  createMediaSession(
                    cameraId
                  ),

                  loadMediaMTXReader(),
                ]);

              if (cancelled) {
                return;
              }

              const session =
                response.data;

              if (
                !session ||
                session.cameraId !==
                  cameraId ||
                session
                  .authorization
                  .scheme !==
                  "Bearer" ||
                typeof session
                  .authorization
                  .token !==
                  "string" ||
                session
                  .authorization
                  .token ===
                  ""
              ) {
                throw new Error(
                  "Invalid media session"
                );
              }

              const whepUrl =
                new URL(
                  session
                    .playback
                    .webrtcWhep,
                  window
                    .location
                    .origin
                ).toString();

              const reader =
                new Reader({
                  url:
                    whepUrl,

                  user:
                    "",

                  pass:
                    "",

                  token:
                    session
                      .authorization
                      .token,

                  onError:
                    () => {
                      if (
                        cancelled
                      ) {
                        return;
                      }

                      setLiveState(
                        "error"
                      );

                      setError(
                        "WebRTC stream is unavailable."
                      );
                    },

                  onTrack:
                    (
                      event
                    ) => {
                      if (
                        cancelled
                      ) {
                        return;
                      }

                      const stream =
                        event
                          .streams[0];

                      if (
                        !stream ||
                        !videoRef
                          .current
                      ) {
                        return;
                      }

                      videoRef
                        .current
                        .srcObject =
                        stream;

                      setLiveState(
                        "live"
                      );

                      setError(
                        null
                      );
                    },

                  onDataChannel:
                    () => {
                      /*
                       * Camera playback currently
                       * requires media tracks only.
                       */
                    },
                });

              readerRef.current =
                reader;
            } catch {
              if (
                cancelled
              ) {
                return;
              }

              setLiveState(
                "error"
              );

              setError(
                "Live camera session could not be started."
              );
            }
          };

        void start();

        return () => {
          cancelled =
            true;

          closeReader();
        };
      },
      [
        cameraId,
      ]
    );

    const statusLabel =
      liveState ===
      "live"
        ? "Live"
        : liveState ===
            "connecting"
          ? "Connecting..."
          : error ??
            "Unavailable";

    return (
      <CameraLivePanel>
        <CameraLiveHeader>
          <span>
            Live ·{" "}
            {cameraName}
          </span>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={
              onClose
            }
          >
            Close
          </Button>
        </CameraLiveHeader>

        <CameraLiveStatus
          role={
            liveState ===
            "error"
              ? "alert"
              : "status"
          }
          $error={
            liveState ===
            "error"
          }
        >
          {statusLabel}
        </CameraLiveStatus>

        <CameraVideoFrame>
          <CameraVideo
            ref={
              videoRef
            }
            controls
            muted
            autoPlay
            playsInline
          />
        </CameraVideoFrame>
      </CameraLivePanel>
    );
  };

export default CameraLiveView;
