import express, { Application, Request, Response, NextFunction } from "express";
import http from "http";
import WebSocket, { Server } from "ws";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth";
import { verifyToken } from "./utils/auth";

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

app.use("/api/auth", authRoutes);

const server = http.createServer(app);
const wss = new Server({ server });

wss.on("connection", (ws, req) => {
  const token = req.url?.split("token=")[1];

  if (!token) {
    ws.close();
    return;
  }

  try {
    const decoded = verifyToken(token);
    console.log(`User ${decoded.id} connected`);

    ws.on("message", (message: string) => {
      console.log(`Received: ${message}`);
      ws.send(`Echo: ${message}`);
    });

    ws.on("close", () => console.log("Client disconnected"));
  } catch {
    ws.close();
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
