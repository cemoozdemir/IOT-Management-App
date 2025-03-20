import express, { Application } from "express";
import http from "http";
import WebSocket, { Server } from "ws";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth";
import { verifyToken } from "./utils/auth";
import { authenticate, authorizeRole } from "./middleware/authMiddleware";
import User from "./models/User";
import sequelize from "./config/database";
import deviceRoutes from "./routes/device";

// Load environment variables
dotenv.config();

// Sync database safely
sequelize.sync({ alter: true }).then(() => {
  console.log("Database synced without data loss.");
});

const app: Application = express();

// Security middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiter
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/devices", authenticate, deviceRoutes);

app.get("/api/admin", authenticate, authorizeRole("admin"), (req, res) => {
  res.json({ message: "Admin access granted" });
});

app.get("/api/user", authenticate, authorizeRole("user"), (req, res) => {
  res.json({ message: "User access granted" });
});

// WebSocket server
const server = http.createServer(app);
const wss = new Server({ server });

// WebSocket Server: Authenticate + Send Real-Time Sensor Data
wss.on("connection", async (ws, req) => {
  try {
    console.log("🔹 Incoming WebSocket connection request.");

    const queryParams = new URLSearchParams(req.url?.split("?")[1]);
    const token = queryParams.get("token");

    if (!token) {
      console.warn("❌ WebSocket rejected: No token.");
      ws.close(1008, "No token provided");
      return;
    }

    const decoded = verifyToken(token);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      console.warn("❌ WebSocket rejected: User not found.");
      ws.close(1008, "Invalid user");
      return;
    }

    console.log(`✅ User ${user.id} connected via WebSocket.`);

    ws.on("message", (message: string) => {
      try {
        const sensorData = JSON.parse(message);
        console.log("📡 Received Sensor Data:", sensorData);

        // 🔹 Broadcast to all clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(sensorData));
          }
        });
      } catch (error) {
        console.error("❌ Invalid sensor data:", error);
      }
    });

    ws.on("close", (code, reason) => {
      console.warn(`⚠️ User disconnected. Code: ${code}, Reason: ${reason}`);
    });
  } catch (err) {
    console.error("❌ WebSocket authentication failed:", err);
    ws.close(1011, "Internal error");
  }
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
