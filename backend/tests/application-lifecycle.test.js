const assert =
  require("node:assert/strict");
const test =
  require("node:test");

const {
  createGracefulShutdownHandler,
  runStartupMediaReconciliation,
} = require(
  "../dist/services/applicationLifecycleService"
);

test(
  "startup reconciliation returns summary",
  async () => {
    const summary = {
      total: 3,
      configured: 2,
      removed: 1,
      failed: 0,
    };

    const result =
      await runStartupMediaReconciliation(
        async () => summary
      );

    assert.deepEqual(
      result,
      summary
    );
  }
);

test(
  "startup reconciliation failure is non-fatal and sanitized",
  async () => {
    const originalError =
      console.error;

    const logs = [];

    console.error = (...args) => {
      logs.push(
        args.join(" ")
      );
    };

    try {
      const result =
        await runStartupMediaReconciliation(
          async () => {
            throw new Error(
              "rtsp://admin:secret@example"
            );
          }
        );

      assert.equal(
        result,
        null
      );

      assert.deepEqual(
        logs,
        [
          "Startup media reconciliation failed",
        ]
      );

      assert.equal(
        logs.join(" ").includes(
          "secret"
        ),
        false
      );
    } finally {
      console.error =
        originalError;
    }
  }
);

test(
  "graceful shutdown closes HTTP and database once",
  async () => {
    let httpCloseCount = 0;
    let databaseCloseCount = 0;

    const fakeServer = {
      listening: true,

      close(callback) {
        httpCloseCount += 1;
        callback();
      },

      closeIdleConnections() {},
      closeAllConnections() {},
    };

    const fakeSequelize = {
      async close() {
        databaseCloseCount += 1;
      },
    };

    const handler =
      createGracefulShutdownHandler(
        fakeServer,
        fakeSequelize
      );

    const originalInfo =
      console.info;

    const originalExitCode =
      process.exitCode;

    console.info = () => {};

    try {
      await handler("SIGTERM");
      await handler("SIGTERM");

      assert.equal(
        httpCloseCount,
        1
      );

      assert.equal(
        databaseCloseCount,
        1
      );

      assert.equal(
        process.exitCode,
        0
      );
    } finally {
      console.info =
        originalInfo;

      process.exitCode =
        originalExitCode;
    }
  }
);
