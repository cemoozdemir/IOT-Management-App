import { useEffect, useState } from "react";

const useWebSocket = (url: string): string[] => {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const socket = new WebSocket(url);

    socket.onmessage = (event: MessageEvent) => {
      setMessages((prev) => [...prev, event.data]);
    };

    return () => socket.close();
  }, [url]);

  return messages;
};

export { useWebSocket }; // Ensure named export
