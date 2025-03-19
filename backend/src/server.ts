import express, { Application, Request, Response, NextFunction } from "express";
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

sequelize.sync({ force: true }).then(() => {
  console.log("Database synchronized.");
});

dotenv.config();

const app: Application = express();
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

app.get("/api/admin", authenticate, authorizeRole("admin"), (req, res) => {
  res.json({ message: "Admin access granted" });
});

app.get("/api/user", authenticate, authorizeRole("user"), (req, res) => {
  res.json({ message: "User access granted" });
});

app.use("/api/auth", authRoutes);

const server = http.createServer(app);
const wss = new Server({ server });

wss.on("connection", async (ws, req) => {
  const token = req.url?.split("token=")[1];

  if (!token) {
    ws.close();
    return;
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      ws.close();
      return;
    }

    console.log(`User ${user.id} (${user.role}) connected`);

    ws.on("message", (message: string) => {
      console.log(`Received from ${user.role}: ${message}`);
      ws.send(`Echo: ${message}`);
    });

    ws.on("close", () => console.log("Client disconnected"));
  } catch {
    ws.close();
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
