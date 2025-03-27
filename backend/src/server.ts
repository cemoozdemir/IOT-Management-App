import express, { Application } from "express";
import http from "http";
import WebSocket, { Server } from "ws";
import dotenv from "dotenv";
import cors from "cors"; // Eğer cors'u import etmediyseniz, bunu ekleyin
import helmet from "helmet"; // Eğer helmet'u import etmediyseniz, bunu ekleyin
import sequelize from "./config/database";
import deviceRoutes from "./routes/device";
import authRoutes from "./routes/auth"; // Import authRoutes
import path from 'path';
// Load environment variables

dotenv.config({ path: path.resolve(__dirname, ".env.production") });

console.log("✅ DB_PASS:", process.env.DB_PASS);

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

// Sync database safely
sequelize.sync({ alter: true }); // force: true -> alter: true

app.use("/api/devices", deviceRoutes);
app.use("/auth", authRoutes); // route'u aktif hale getir

// Başka route'lar veya middleware'ler de ekleyebilirsiniz

// Sunucu başlatma
const server = http.createServer(app);
const wss = new Server({ server });

// Sunucuyu başlat
server.listen(process.env.PORT || 3001, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 3001}`);
});
