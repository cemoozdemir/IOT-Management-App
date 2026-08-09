import {
  getCameraConnectionView,
} from "./cameraConnectionStatus";

describe(
  "camera connection status",
  () => {
    test(
      "disabled state takes precedence",
      () => {
        expect(
          getCameraConnectionView({
            enabled:
              false,
            lastConnectedAt:
              "2026-08-07T12:00:00Z",
            lastError:
              "timeout",
          })
        ).toEqual({
          state:
            "disabled",
          label:
            "Disabled",
        });
      }
    );

    test(
      "known normalized error becomes a safe user label",
      () => {
        expect(
          getCameraConnectionView({
            enabled:
              true,
            lastConnectedAt:
              "2026-08-07T12:00:00Z",
            lastError:
              "connection_refused",
          })
        ).toEqual({
          state:
            "error",
          label:
            "Connection refused",
        });
      }
    );

    test(
      "successful previous connection is connected",
      () => {
        expect(
          getCameraConnectionView({
            enabled:
              true,
            lastConnectedAt:
              "2026-08-07T12:00:00Z",
            lastError:
              null,
          })
        ).toEqual({
          state:
            "connected",
          label:
            "Connected",
        });
      }
    );

    test(
      "camera without health history is not tested",
      () => {
        expect(
          getCameraConnectionView({
            enabled:
              true,
            lastConnectedAt:
              null,
            lastError:
              null,
          })
        ).toEqual({
          state:
            "untested",
          label:
            "Not tested",
        });
      }
    );

    test(
      "unknown persisted error text is never displayed",
      () => {
        const secret =
          "rtsp://admin:password@camera/private";

        const result =
          getCameraConnectionView({
            enabled:
              true,
            lastConnectedAt:
              null,
            lastError:
              secret,
          });

        expect(
          result
        ).toEqual({
          state:
            "error",
          label:
            "Connection error",
        });

        expect(
          JSON.stringify(
            result
          )
        ).not.toContain(
          "password"
        );
      }
    );
  }
);
