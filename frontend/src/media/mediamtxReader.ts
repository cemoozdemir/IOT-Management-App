export interface MediaMTXReaderConfig {
  url:
    string;

  user:
    string;

  pass:
    string;

  token:
    string;

  onError:
    (
      error:
        string
    ) => void;

  onTrack:
    (
      event:
        RTCTrackEvent
    ) => void;

  onDataChannel:
    (
      event:
        RTCDataChannelEvent
    ) => void;
}

export interface MediaMTXReader {
  close:
    () => void;
}

export type MediaMTXReaderConstructor =
  new (
    config:
      MediaMTXReaderConfig
  ) => MediaMTXReader;

declare global {
  interface Window {
    MediaMTXWebRTCReader?:
      MediaMTXReaderConstructor;
  }
}

const SCRIPT_ID =
  "mediamtx-reader-v1-19-2";

const SCRIPT_PATH =
  "/vendor/mediamtx/reader-v1.19.2.js";

let loadPromise:
  Promise<
    MediaMTXReaderConstructor
  > |
  null = null;

const getLoadedReader =
  ():
    | MediaMTXReaderConstructor
    | null => {
    return (
      window
        .MediaMTXWebRTCReader ??
      null
    );
  };

export const loadMediaMTXReader =
  (): Promise<
    MediaMTXReaderConstructor
  > => {
    const loaded =
      getLoadedReader();

    if (loaded) {
      return Promise.resolve(
        loaded
      );
    }

    if (loadPromise) {
      return loadPromise;
    }

    loadPromise =
      new Promise(
        (
          resolve,
          reject
        ) => {
          const finish =
            () => {
              const reader =
                getLoadedReader();

              if (!reader) {
                reject(
                  new Error(
                    "MediaMTX reader did not initialize"
                  )
                );
                return;
              }

              resolve(
                reader
              );
            };

          const existing =
            document.getElementById(
              SCRIPT_ID
            ) as
              | HTMLScriptElement
              | null;

          if (existing) {
            existing.addEventListener(
              "load",
              finish,
              {
                once:
                  true,
              }
            );

            existing.addEventListener(
              "error",
              () => {
                reject(
                  new Error(
                    "MediaMTX reader failed to load"
                  )
                );
              },
              {
                once:
                  true,
              }
            );

            return;
          }

          const script =
            document.createElement(
              "script"
            );

          script.id =
            SCRIPT_ID;

          script.src =
            SCRIPT_PATH;

          script.async =
            true;

          script.addEventListener(
            "load",
            finish,
            {
              once:
                true,
            }
          );

          script.addEventListener(
            "error",
            () => {
              loadPromise =
                null;

              reject(
                new Error(
                  "MediaMTX reader failed to load"
                )
              );
            },
            {
              once:
                true,
            }
          );

          document.head.appendChild(
            script
          );
        }
      );

    return loadPromise;
  };
