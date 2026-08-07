const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  applyCameraConnectionHealth,
  buildCameraConnectionHealthUpdate,
} = require(
  "../dist/services/cameraConnectionHealth.js"
);

test(
  "successful connectivity updates lastConnectedAt and clears lastError",
  async () => {
    const connectedAt =
      new Date(
        "2026-08-04T16:00:00.000Z"
      );

    const update =
      buildCameraConnectionHealthUpdate(
        {
          reachable:
            true,
          status:
            "connected",
          elapsedMs:
            12,
        },
        connectedAt
      );

    assert.deepEqual(
      update,
      {
        lastConnectedAt:
          connectedAt,
        lastError:
          null,
      }
    );
  }
);

test(
  "failed connectivity preserves previous lastConnectedAt",
  async () => {
    const update =
      buildCameraConnectionHealthUpdate(
        {
          reachable:
            false,
          status:
            "timeout",
          elapsedMs:
            2500,
        },
        new Date(
          "2026-08-04T16:00:00.000Z"
        )
      );

    assert.deepEqual(
      update,
      {
        lastError:
          "timeout",
      }
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          update,
          "lastConnectedAt"
        ),
      false
    );
  }
);

test(
  "health persistence receives only normalized failure state",
  async () => {
    let persisted =
      null;

    const camera = {
      async update(
        values
      ) {
        persisted =
          values;
      },
    };

    await applyCameraConnectionHealth(
      camera,
      {
        reachable:
          false,
        status:
          "connection_refused",
        elapsedMs:
          7,
      }
    );

    assert.deepEqual(
      persisted,
      {
        lastError:
          "connection_refused",
      }
    );

    const serialized =
      JSON.stringify(
        persisted
      );

    assert.equal(
      serialized.includes(
        "password"
      ),
      false
    );

    assert.equal(
      serialized.includes(
        "rtsp://"
      ),
      false
    );
  }
);

test(
  "successful persistence uses injected clock deterministically",
  async () => {
    const connectedAt =
      new Date(
        "2026-08-04T18:15:00.000Z"
      );

    let persisted =
      null;

    const camera = {
      async update(
        values
      ) {
        persisted =
          values;
      },
    };

    const result =
      await applyCameraConnectionHealth(
        camera,
        {
          reachable:
            true,
          status:
            "connected",
          elapsedMs:
            4,
        },
        () =>
          connectedAt
      );

    assert.deepEqual(
      persisted,
      {
        lastConnectedAt:
          connectedAt,
        lastError:
          null,
      }
    );

    assert.deepEqual(
      result,
      persisted
    );
  }
);

test(
  "every normalized failure status can be persisted without raw error text",
  () => {
    const statuses = [
      "timeout",
      "dns_error",
      "connection_refused",
      "network_unreachable",
      "connection_error",
    ];

    for (
      const status
      of statuses
    ) {
      const result =
        buildCameraConnectionHealthUpdate(
          {
            reachable:
              false,
            status,
            elapsedMs:
              1,
          },
          new Date()
        );

      assert.deepEqual(
        result,
        {
          lastError:
            status,
        }
      );
    }
  }
);
