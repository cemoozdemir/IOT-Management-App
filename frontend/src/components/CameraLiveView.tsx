import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import Hls, {
  ErrorData,
} from "hls.js";

import {
  createMediaSession,
  MediaSession,
} from "../api/mediaApi";

import {
  loadMediaMTXReader,
  MediaMTXReader,
} from "../media/mediamtxReader";

import {
  CameraLiveHeader,
  CameraLivePanel,
  CameraLiveStatus,
  CameraTransportBadge,
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
  | "degraded"
  | "offline";

const WEBRTC_CONNECT_TIMEOUT_MS =
  12_000;

const MAX_HLS_NETWORK_RECOVERY =
  2;

const MAX_HLS_MEDIA_RECOVERY =
  2;

const MAX_RECONNECT_DELAY_MS =
  20_000;

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

    const hlsRef =
      useRef<
        Hls |
        null
      >(null);

    const tokenRef =
      useRef(
        ""
      );

    const sessionRef =
      useRef<
        MediaSession |
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

        let webRtcTimer:
          number |
          undefined;

        let tokenRefreshTimer:
          number |
          undefined;

        let reconnectTimer:
          number |
          undefined;

        let reconnectAttempt =
          0;

        let hlsNetworkRecovery =
          0;

        let hlsMediaRecovery =
          0;

        const clearTimer =
          (
            timer:
              number |
              undefined
          ) => {
            if (
              timer !==
              undefined
            ) {
              window.clearTimeout(
                timer
              );
            }
          };

        const stopVideoTracks =
          () => {
            const video =
              videoRef.current;

            if (
              !video
            ) {
              return;
            }

            if (
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

            video.removeAttribute(
              "src"
            );

            video.load();
          };

        const closeWebRtc =
          () => {
            clearTimer(
              webRtcTimer
            );

            webRtcTimer =
              undefined;

            if (
              readerRef.current
            ) {
              readerRef
                .current
                .close();

              readerRef.current =
                null;
            }
          };

        const closeHls =
          () => {
            clearTimer(
              tokenRefreshTimer
            );

            tokenRefreshTimer =
              undefined;

            if (
              hlsRef.current
            ) {
              hlsRef
                .current
                .destroy();

              hlsRef.current =
                null;
            }
          };

        const closePlayback =
          () => {
            closeWebRtc();
            closeHls();
            stopVideoTracks();
          };

        const fetchSession =
          async () => {
            const response =
              await createMediaSession(
                cameraId
              );

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
                "" ||
              typeof session
                .expiresIn !==
                "number" ||
              session
                .expiresIn <
                30
            ) {
              throw new Error(
                "Invalid media session"
              );
            }

            sessionRef.current =
              session;

            tokenRef.current =
              session
                .authorization
                .token;

            return session;
          };

        const scheduleTokenRefresh =
          (
            session:
              MediaSession
          ) => {
            clearTimer(
              tokenRefreshTimer
            );

            const refreshSeconds =
              Math.max(
                15,
                Math.floor(
                  session.expiresIn *
                  0.55
                )
              );

            tokenRefreshTimer =
              window.setTimeout(
                async () => {
                  if (
                    cancelled ||
                    !hlsRef.current
                  ) {
                    return;
                  }

                  try {
                    const refreshed =
                      await fetchSession();

                    if (
                      cancelled
                    ) {
                      return;
                    }

                    scheduleTokenRefresh(
                      refreshed
                    );
                  } catch {
                    if (
                      cancelled
                    ) {
                      return;
                    }

                    /*
                     * Keep the current token until
                     * expiry and retry quickly.
                     */
                    tokenRefreshTimer =
                      window.setTimeout(
                        () => {
                          if (
                            sessionRef.current
                          ) {
                            scheduleTokenRefresh({
                              ...sessionRef.current,
                              expiresIn:
                                20,
                            });
                          }
                        },
                        10_000
                      );
                  }
                },
                refreshSeconds *
                  1000
              );
          };

        const scheduleReconnect =
          (
            reason:
              string
          ) => {
            closePlayback();

            if (
              cancelled
            ) {
              return;
            }

            setLiveState(
              "offline"
            );

            setError(
              reason
            );

            const delay =
              Math.min(
                MAX_RECONNECT_DELAY_MS,
                2_000 *
                  Math.pow(
                    2,
                    reconnectAttempt
                  )
              );

            reconnectAttempt =
              Math.min(
                reconnectAttempt +
                  1,
                4
              );

            clearTimer(
              reconnectTimer
            );

            reconnectTimer =
              window.setTimeout(
                () => {
                  if (
                    !cancelled
                  ) {
                    void startPlayback();
                  }
                },
                delay
              );
          };

        const startHls =
          async (
            session:
              MediaSession
          ) => {
            closeWebRtc();
            closeHls();
            stopVideoTracks();

            if (
              cancelled
            ) {
              return;
            }

            if (
              !Hls.isSupported()
            ) {
              scheduleReconnect(
                "WebRTC failed and authenticated HLS is not supported by this browser."
              );
              return;
            }

            const video =
              videoRef.current;

            if (
              !video
            ) {
              scheduleReconnect(
                "Camera video element is unavailable."
              );
              return;
            }

            hlsNetworkRecovery =
              0;

            hlsMediaRecovery =
              0;

            tokenRef.current =
              session
                .authorization
                .token;

            const hls =
              new Hls({
                lowLatencyMode:
                  true,

                backBufferLength:
                  30,

                xhrSetup:
                  (
                    xhr
                  ) => {
                    const token =
                      tokenRef.current;

                    if (
                      token
                    ) {
                      xhr.setRequestHeader(
                        "Authorization",
                        `Bearer ${token}`
                      );
                    }
                  },
              });

            hlsRef.current =
              hls;

            hls.on(
              Hls.Events.MEDIA_ATTACHED,
              () => {
                if (
                  cancelled
                ) {
                  return;
                }

                const hlsUrl =
                  new URL(
                    session
                      .playback
                      .hlsPlaylist,
                    window
                      .location
                      .origin
                  ).toString();

                hls.loadSource(
                  hlsUrl
                );
              }
            );

            hls.on(
              Hls.Events.MANIFEST_PARSED,
              () => {
                if (
                  cancelled
                ) {
                  return;
                }

                reconnectAttempt =
                  0;

                setLiveState(
                  "degraded"
                );

                setError(
                  null
                );

                void video
                  .play()
                  .catch(
                    () =>
                      undefined
                  );
              }
            );

            hls.on(
              Hls.Events.ERROR,
              (
                _event,
                data:
                  ErrorData
              ) => {
                if (
                  cancelled ||
                  !data.fatal
                ) {
                  return;
                }

                if (
                  data.type ===
                    Hls
                      .ErrorTypes
                      .NETWORK_ERROR &&
                  hlsNetworkRecovery <
                    MAX_HLS_NETWORK_RECOVERY
                ) {
                  hlsNetworkRecovery +=
                    1;

                  hls.startLoad();
                  return;
                }

                if (
                  data.type ===
                    Hls
                      .ErrorTypes
                      .MEDIA_ERROR &&
                  hlsMediaRecovery <
                    MAX_HLS_MEDIA_RECOVERY
                ) {
                  hlsMediaRecovery +=
                    1;

                  hls.recoverMediaError();
                  return;
                }

                scheduleReconnect(
                  "Camera stream is temporarily unavailable."
                );
              }
            );

            video.onplay =
              () => {
                const livePosition =
                  hls.liveSyncPosition;

                if (
                  typeof livePosition ===
                    "number" &&
                  Number.isFinite(
                    livePosition
                  )
                ) {
                  try {
                    video.currentTime =
                      livePosition;
                  } catch {
                    /*
                     * Live-edge adjustment is
                     * opportunistic.
                     */
                  }
                }
              };

            hls.attachMedia(
              video
            );

            scheduleTokenRefresh(
              session
            );
          };

        const startWebRtc =
          async (
            session:
              MediaSession
          ) => {
            closeHls();
            closeWebRtc();
            stopVideoTracks();

            const Reader =
              await loadMediaMTXReader();

            if (
              cancelled
            ) {
              return;
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

            let receivedTrack =
              false;

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
                      cancelled ||
                      receivedTrack
                    ) {
                      return;
                    }

                    void startHls(
                      session
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

                    const video =
                      videoRef.current;

                    if (
                      !stream ||
                      !video
                    ) {
                      return;
                    }

                    receivedTrack =
                      true;

                    clearTimer(
                      webRtcTimer
                    );

                    webRtcTimer =
                      undefined;

                    reconnectAttempt =
                      0;

                    video.srcObject =
                      stream;

                    setLiveState(
                      "live"
                    );

                    setError(
                      null
                    );

                    void video
                      .play()
                      .catch(
                        () =>
                          undefined
                      );
                  },

                onDataChannel:
                  () => {
                    /*
                     * No application data
                     * channels are required.
                     */
                  },
              });

            readerRef.current =
              reader;

            webRtcTimer =
              window.setTimeout(
                () => {
                  if (
                    cancelled ||
                    receivedTrack
                  ) {
                    return;
                  }

                  void startHls(
                    session
                  );
                },
                WEBRTC_CONNECT_TIMEOUT_MS
              );
          };

        async function startPlayback() {
          closePlayback();

          if (
            cancelled
          ) {
            return;
          }

          setLiveState(
            "connecting"
          );

          setError(
            null
          );

          try {
            const session =
              await fetchSession();

            if (
              cancelled
            ) {
              return;
            }

            await startWebRtc(
              session
            );
          } catch {
            if (
              cancelled
            ) {
              return;
            }

            scheduleReconnect(
              "Live camera session could not be started."
            );
          }
        }

        void startPlayback();

        return () => {
          cancelled =
            true;

          clearTimer(
            reconnectTimer
          );

          closePlayback();
        };
      },
      [
        cameraId,
      ]
    );

    const statusLabel =
      liveState ===
      "live"
        ? "Live over WebRTC"
        : liveState ===
            "degraded"
          ? "Live over HLS fallback"
          : liveState ===
              "connecting"
            ? "Connecting..."
            : error ??
              "Offline";

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

        <div>
          <CameraTransportBadge
            $degraded={
              liveState ===
              "degraded"
            }
            $offline={
              liveState ===
              "offline"
            }
          >
            {liveState ===
            "live"
              ? "WebRTC"
              : liveState ===
                  "degraded"
                ? "HLS fallback"
                : liveState ===
                    "offline"
                  ? "offline"
                  : "connecting"}
          </CameraTransportBadge>
        </div>

        <CameraLiveStatus
          role={
            liveState ===
            "offline"
              ? "alert"
              : "status"
          }
          $error={
            liveState ===
            "offline"
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
