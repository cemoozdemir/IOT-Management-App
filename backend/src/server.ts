import express, { Application } from "express";
import http from "http";
import WebSocket, { Server } from "ws";
import cors from "cors"; // Eğer cors'u import etmediyseniz, bunu ekleyin
import helmet from "helmet"; // Eğer helmet'u import etmediyseniz, bunu ekleyin
import sequelize from "./config/database";
import deviceRoutes from "./routes/device";
import telemetryRoutes from "./routes/telemetry";
import authRoutes from "./routes/auth"; // Import authRoutes
import "./config/env";

const app: Application = express();

// Security middlewares
const allowedOrigin =
  process.env.NODE_ENV === "production"
    ? "https://iot.ozdmr.dev" // Prod için frontend URL'si
    : "http://localhost:3000"; // Lokal için frontend URL'si (React'in varsayılan portu)

app.use(
  cors({
    origin: allowedOrigin, // sadece belirli originleri kabul et
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// Proxy ayarini açıyoruz
app.set("trust proxy", true);

app.use(helmet());
app.use(express.json());

// health checks
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'iot-api', time: new Date().toISOString() });
});
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'iot-api', time: new Date().toISOString() });
});

// Database schema changes are managed exclusively through migrations.

app.use("/api/devices", deviceRoutes);
app.use("/api/telemetry", telemetryRoutes);
app.use("/api/auth", authRoutes); // route'u aktif hale getir

// Başka route'lar veya middleware'ler de ekleyebilirsiniz

// Sunucu başlatma
const server = http.createServer(app);
const wss = new Server({ server });

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '127.0.0.1';

const startServer = async (): Promise<void> => {
  await sequelize.authenticate();

  server.listen(PORT, HOST, () => {
    console.log(
      `🚀 Server running on http://${HOST}:${PORT}`
    );
  });
};

void startServer().catch(() => {
  console.error(
    "Database connection failed during startup"
  );
  process.exit(1);
});
