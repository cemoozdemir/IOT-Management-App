import { useEffect, useState, useRef } from "react";

interface SensorData {
  temperature: string;
  humidity: string;
  timestamp: string;
}

const useWebSocket = (url: string): SensorData | null => {
  const [data, setData] = useState<SensorData | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Check if WebSocket URL is provided
    if (!url) {
      console.error("⚠️ WebSocket URL is missing.");
      return;
    }

    // Get JWT token from storage
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      console.error(
        "⚠️ No authentication token found. WebSocket connection aborted."
      );
      return;
    }

    // Connect WebSocket with token
    const wsUrl = `${url}?token=${token}`;
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () =>
      console.log("✅ WebSocket connected to", wsUrl);

    socketRef.current.onmessage = (event: MessageEvent) => {
      try {
        const parsedData = JSON.parse(event.data);
        console.log("📡 Received sensor data:", parsedData);
        setData(parsedData);
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    };

    socketRef.current.onerror = (event) =>
      console.error("⚠️ WebSocket error:", event);

    socketRef.current.onclose = (event) => {
      console.warn("⚠️ WebSocket closed:", event.code, event.reason);
      setTimeout(() => {
        console.log("🔄 Reconnecting WebSocket...");
        socketRef.current = new WebSocket(wsUrl);
      }, 2000);
    };

    return () => socketRef.current?.close();
  }, [url]);

  return data;
};

export { useWebSocket };
