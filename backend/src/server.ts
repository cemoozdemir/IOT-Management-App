import express, { Application } from "express";
import http from "http";
import WebSocket, { Server } from "ws";
import dotenv from "dotenv";
import cors from "cors";  // Eğer cors'u import etmediyseniz, bunu ekleyin
import helmet from "helmet";  // Eğer helmet'u import etmediyseniz, bunu ekleyin
import sequelize from "./config/database";
import deviceRoutes from "./routes/device";

// Load environment variables
dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env', // .env.production veya .env dosyasını yükler
});

const app: Application = express();

// Security middlewares
const allowedOrigin = process.env.NODE_ENV === 'production' 
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
app.set('trust proxy', true);

app.use(helmet());
app.use(express.json());

// Sync database safely
sequelize.sync({ force: true }) // Bu kısmı "alter: true" olarak değiştirmek isteyebilirsiniz, prod'da verileri sıfırlamak istemeyebilirsiniz.

app.use("/api/devices", deviceRoutes);

// Başka route'lar veya middleware'ler de ekleyebilirsiniz

// Sunucu başlatma
const server = http.createServer(app);
const wss = new Server({ server });

// Sunucuyu başlat
server.listen(process.env.PORT || 3001, () => {
  console.log(`🚀 Server running on port ${process.env.PORT || 3001}`);
});
