import type { Server } from "http";
import type { Sequelize } from "sequelize";

export interface MediaReconciliationSummary {
  total: number;
  configured: number;
  removed: number;
  failed: number;
}

type ReconcileMediaState =
  () => Promise<MediaReconciliationSummary>;

export const runStartupMediaReconciliation = async (
  reconcile: ReconcileMediaState
): Promise<MediaReconciliationSummary | null> => {
  try {
    const summary = await reconcile();

    console.info(
      [
        "Startup media reconciliation completed",
        `total=${summary.total}`,
        `configured=${summary.configured}`,
        `removed=${summary.removed}`,
        `failed=${summary.failed}`,
      ].join(" ")
    );

    return summary;
  } catch {
    console.error(
      "Startup media reconciliation failed"
    );

    return null;
  }
};

const closeHttpServer = async (
  server: Server
): Promise<void> => {
  if (!server.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;

      server.closeAllConnections?.();

      reject(
        new Error(
          "HTTP server shutdown timed out"
        )
      );
    }, 10_000);

    timeout.unref();

    server.close((error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (error) {
        reject(error);
        return;
      }

      resolve();
    });

    server.closeIdleConnections?.();
  });
};

export const createGracefulShutdownHandler = (
  server: Server,
  sequelize: Sequelize
) => {
  let shuttingDown = false;

  return async (
    signal: NodeJS.Signals
  ): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    console.info(
      `Received ${signal}; shutting down`
    );

    let failed = false;

    try {
      await closeHttpServer(server);
    } catch {
      failed = true;

      console.error(
        "HTTP server graceful shutdown failed"
      );
    }

    try {
      await sequelize.close();
    } catch {
      failed = true;

      console.error(
        "Database graceful shutdown failed"
      );
    }

    process.exitCode =
      failed ? 1 : 0;

    console.info(
      failed
        ? "Graceful shutdown completed with errors"
        : "Graceful shutdown completed"
    );
  };
};
