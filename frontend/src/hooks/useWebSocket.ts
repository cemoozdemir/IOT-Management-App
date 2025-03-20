import { useEffect, useState } from "react";

interface SensorData {
  temperature: string;
  humidity: string;
  timestamp: string;
}

const useWebSocket = (url: string): SensorData | null => {
  const [data, setData] = useState<SensorData | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);

    socket.onmessage = (event: MessageEvent) => {
      const parsedData = JSON.parse(event.data);
      setData(parsedData);
    };

    socket.onclose = () => console.log("WebSocket closed");

    return () => socket.close();
  }, [url]);

  return data;
};

export { useWebSocket };
