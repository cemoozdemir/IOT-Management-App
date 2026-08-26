const test =
  require("node:test");

const assert =
  require("node:assert/strict");

process.env.DB_NAME =
  "media_auth_test";

process.env.DB_USER =
  "media_auth_user";

process.env.DB_PASS =
  "media_auth_password";

process.env.DB_HOST =
  "127.0.0.1";

process.env.MEDIA_SESSION_SECRET =
  "media-auth-test-secret-"
  + "66".repeat(32);

const {
  createMediaReadToken,
} = require(
  "../dist/utils/mediaSessionToken.js"
);

const {
  authorizeMediaRequest,
} = require(
  "../dist/services/mediaAuthorizationService.js"
);

const makeToken =
  () =>
    createMediaReadToken(
      "user-123",
      "camera-456",
      "cam_0123456789abcdef"
    );

const acceptingLookup =
  async (
    identity
  ) => {
    assert.deepEqual(
      identity,
      {
        userId:
          "user-123",

        cameraId:
          "camera-456",

        streamPath:
          "cam_0123456789abcdef",
      }
    );

    return true;
  };

test(
  "valid WebRTC read request is authorized",
  async () => {
    const authorized =
      await authorizeMediaRequest(
        {
          token:
            makeToken(),

          action:
            "read",

          path:
            "cam_0123456789abcdef",

          protocol:
            "webrtc",

          user:
            "",

          password:
            "",

          ip:
            "127.0.0.1",

          id:
            "session-id",

          query:
            "",
        },
        acceptingLookup
      );

    assert.equal(
      authorized,
      true
    );
  }
);

test(
  "valid HLS read request is authorized",
  async () => {
    const authorized =
      await authorizeMediaRequest(
        {
          token:
            makeToken(),

          action:
            "read",

          path:
            "cam_0123456789abcdef",

          protocol:
            "hls",
        },
        acceptingLookup
      );

    assert.equal(
      authorized,
      true
    );
  }
);

test(
  "publish action is rejected",
  async () => {
    let lookupCalled =
      false;

    const authorized =
      await authorizeMediaRequest(
        {
          token:
            makeToken(),

          action:
            "publish",

          path:
            "cam_0123456789abcdef",

          protocol:
            "webrtc",
        },
        async () => {
          lookupCalled =
            true;
          return true;
        }
      );

    assert.equal(
      authorized,
      false
    );

    assert.equal(
      lookupCalled,
      false
    );
  }
);

test(
  "token cannot be reused for another stream path",
  async () => {
    let lookupCalled =
      false;

    const authorized =
      await authorizeMediaRequest(
        {
          token:
            makeToken(),

          action:
            "read",

          path:
            "cam_fedcba9876543210",

          protocol:
            "webrtc",
        },
        async () => {
          lookupCalled =
            true;
          return true;
        }
      );

    assert.equal(
      authorized,
      false
    );

    assert.equal(
      lookupCalled,
      false
    );
  }
);

test(
  "unsupported protocol is rejected",
  async () => {
    const authorized =
      await authorizeMediaRequest(
        {
          token:
            makeToken(),

          action:
            "read",

          path:
            "cam_0123456789abcdef",

          protocol:
            "rtsp",
        },
        async () =>
          true
      );

    assert.equal(
      authorized,
      false
    );
  }
);

test(
  "database ownership lookup can revoke a valid token",
  async () => {
    const authorized =
      await authorizeMediaRequest(
        {
          token:
            makeToken(),

          action:
            "read",

          path:
            "cam_0123456789abcdef",

          protocol:
            "hls",
        },
        async () =>
          false
      );

    assert.equal(
      authorized,
      false
    );
  }
);

test(
  "malformed authentication payload is rejected",
  async () => {
    assert.equal(
      await authorizeMediaRequest(
        null,
        acceptingLookup
      ),
      false
    );

    assert.equal(
      await authorizeMediaRequest(
        {
          token:
            "",

          action:
            "read",

          path:
            "cam_0123456789abcdef",

          protocol:
            "hls",
        },
        acceptingLookup
      ),
      false
    );
  }
);
