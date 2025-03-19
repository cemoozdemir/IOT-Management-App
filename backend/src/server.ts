import express, { Request, Response } from "express";
import http from "http";
import WebSocket, { Server } from "ws";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new Server({ server });

wss.on("connection", (ws: WebSocket) => {
  console.log("New client connected");

  ws.on("message", (message: string) => {
    console.log(`Received: ${message}`);
    ws.send(`Echo: ${message}`);
  });

  ws.on("close", () => console.log("Client disconnected"));
});

app.get("/", (_req: Request, res: Response) => {
  res.send("Server is running");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
