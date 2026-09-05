import {
  createGracefulShutdownHandler,
  runStartupMediaReconciliation,
} from "./services/applicationLifecycleService";
import {
  reconcileAllCameraMediaStates,
} from "./services/cameraMediaReconciliationService";
import express, {
  Application,
  ErrorRequestHandler,
} from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import sequelize from "./config/database";
import {
  apiRateLimiter,
} from "./middleware/rateLimits";
import deviceRoutes from "./routes/device";
import cameraRoutes from "./routes/camera";
import mediaRoutes from "./routes/media";
import telemetryRoutes from "./routes/telemetry";
import authRoutes from "./routes/auth";
import "./config/env";

const app: Application =
  express();

app.disable(
  "x-powered-by"
);

// The API binds only to loopback in
// production and is reached through
// one local reverse proxy.
app.set(
  "trust proxy",
  1
);

const allowedOrigin =
  process.env.NODE_ENV ===
  "production"
    ? "https://iot.ozdmr.dev"
    : "http://localhost:3000";

app.use(
  helmet()
);

app.use(
  cors({
    origin:
      allowedOrigin,
    credentials:
      true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
    ],
  })
);

// API payloads are intentionally small.
// This bounds parser memory/CPU before
// route-level validation runs.
app.use(
  express.json({
    limit:
      "16kb",
    strict:
      true,
  })
);

app.get(
  "/health",
  (_req, res) => {
    res.status(200).json({
      status:
        "ok",
      service:
        "iot-api",
      time:
        new Date()
          .toISOString(),
    });
  }
);

app.get(
  "/api/health",
  (_req, res) => {
    res.status(200).json({
      status:
        "ok",
      service:
        "iot-api",
      time:
        new Date()
          .toISOString(),
    });
  }
);

// Broad abuse ceiling. Authenticated
// user/device routes also have narrower
// identity-scoped limits.
app.use(
  "/api",
  apiRateLimiter
);

app.use(
  "/api/devices",
  deviceRoutes
);

app.use(
  "/api/cameras",
  cameraRoutes
);

app.use(
  "/api/media",
  mediaRoutes
);

app.use(
  "/api/telemetry",
  telemetryRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  (_req, res) => {
    res.status(404).json({
      error:
        "Not found",
    });
  }
);

interface RequestParsingError
  extends Error {
  type?: string;
}

const errorHandler:
  ErrorRequestHandler =
  (
    error,
    req,
    res,
    _next
  ) => {
    const parsingError =
      error as
        RequestParsingError;

    if (
      parsingError.type ===
      "entity.too.large"
    ) {
      res.status(413).json({
        error:
          "Request body too large",
      });
      return;
    }

    if (
      parsingError.type ===
      "entity.parse.failed"
    ) {
      res.status(400).json({
        error:
          "Invalid JSON body",
      });
      return;
    }

    // Do not log request bodies,
    // credentials, SQL text or raw
    // exception messages here.
    console.error(
      "Unhandled request error",
      {
        method:
          req.method,
        path:
          req.path,
        errorName:
          error instanceof
          Error
            ? error.name
            : "UnknownError",
      }
    );

    res.status(500).json({
      error:
        "Internal server error",
    });
  };

app.use(
  errorHandler
);

const server =
  http.createServer(
    app
  );

const PORT =
  Number(
    process.env.PORT
  ) || 3001;

const HOST =
  process.env.HOST ||
  "127.0.0.1";

const gracefulShutdown =
  createGracefulShutdownHandler(
    server,
    sequelize
  );

process.once(
  "SIGTERM",
  () => {
    void gracefulShutdown("SIGTERM");
  }
);

process.once(
  "SIGINT",
  () => {
    void gracefulShutdown("SIGINT");
  }
);

const startServer =
  async (): Promise<void> => {
    await sequelize.authenticate();

    await runStartupMediaReconciliation(
      reconcileAllCameraMediaStates
    );

    server.listen(
      PORT,
      HOST,
      () => {
        console.log(
          `Server running on http://${HOST}:${PORT}`
        );
      }
    );
  };

void startServer().catch(
  () => {
    console.error(
      "Database connection failed during startup"
    );
    process.exit(1);
  }
);
