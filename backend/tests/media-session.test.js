const test =
  require("node:test");

const assert =
  require("node:assert/strict");

process.env.DB_NAME =
  "media_session_test";

process.env.DB_USER =
  "media_session_user";

process.env.DB_PASS =
  "media_session_password";

process.env.DB_HOST =
  "127.0.0.1";

process.env.MEDIA_SESSION_SECRET =
  "media-session-test-secret-"
  + "44".repeat(32);

const {
  MEDIA_SESSION_TTL_SECONDS,
  createMediaReadToken,
  verifyMediaReadToken,
} = require(
  "../dist/utils/mediaSessionToken.js"
);

const {
  buildMediaSessionResponse,
} = require(
  "../dist/services/mediaSessionService.js"
);

test(
  "media token is scoped to user camera and stream",
  () => {
    const token =
      createMediaReadToken(
        "user-123",
        "camera-456",
        "cam_0123456789abcdef"
      );

    const payload =
      verifyMediaReadToken(
        token
      );

    assert.equal(
      payload.purpose,
      "media-read"
    );

    assert.equal(
      payload.userId,
      "user-123"
    );

    assert.equal(
      payload.cameraId,
      "camera-456"
    );

    assert.equal(
      payload.streamPath,
      "cam_0123456789abcdef"
    );

    assert.equal(
      payload.iss,
      "iot-management-app"
    );

    assert.equal(
      payload.aud,
      "iot-media"
    );

    assert.ok(
      payload.exp
    );

    assert.ok(
      payload.iat
    );

    assert.ok(
      payload.exp -
      payload.iat <=
      MEDIA_SESSION_TTL_SECONDS
    );
  }
);

test(
  "media session exposes no camera source credentials",
  () => {
    const session =
      buildMediaSessionResponse(
        {
          id:
            "camera-456",

          streamPath:
            "cam_0123456789abcdef",

          enabled:
            true,
        },
        "user-123"
      );

    assert.equal(
      session.cameraId,
      "camera-456"
    );

    assert.equal(
      session.expiresIn,
      90
    );

    assert.equal(
      session.authorization.scheme,
      "Bearer"
    );

    assert.match(
      session.playback.webrtcWhep,
      /^\/media\/webrtc\/cam_0123456789abcdef\/whep$/
    );

    assert.match(
      session.playback.hlsPlaylist,
      /^\/media\/hls\/cam_0123456789abcdef\/index\.m3u8$/
    );

    const serialized =
      JSON.stringify(
        session
      );

    assert.equal(
      serialized.includes(
        "rtsp://"
      ),
      false
    );

    assert.equal(
      serialized.includes(
        "sourceHost"
      ),
      false
    );

    assert.equal(
      serialized.includes(
        "password"
      ),
      false
    );
  }
);

test(
  "disabled camera cannot create media session",
  () => {
    assert.throws(
      () =>
        buildMediaSessionResponse(
          {
            id:
              "camera-456",

            streamPath:
              "cam_0123456789abcdef",

            enabled:
              false,
          },
          "user-123"
        ),
      /disabled/
    );
  }
);

test(
  "media token verification rejects another secret",
  () => {
    const token =
      createMediaReadToken(
        "user-123",
        "camera-456",
        "cam_0123456789abcdef"
      );

    process.env.MEDIA_SESSION_SECRET =
      "different-secret-"
      + "55".repeat(32);

    assert.throws(
      () =>
        verifyMediaReadToken(
          token
        )
    );

    process.env.MEDIA_SESSION_SECRET =
      "media-session-test-secret-"
      + "44".repeat(32);
  }
);
