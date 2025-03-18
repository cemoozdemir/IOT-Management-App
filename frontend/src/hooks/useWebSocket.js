import { useEffect, useState } from "react";
import io from "socket.io-client";

const useWebSocket = (url) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = io(url);

    socket.on("message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => socket.disconnect();
  }, [url]);

  return messages;
};

export default useWebSocket;
