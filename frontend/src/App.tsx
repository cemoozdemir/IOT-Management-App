import React from "react";
import { useWebSocket } from "./hooks/useWebSocket"; // Use named import

const App: React.FC = () => {
  const messages: string[] = useWebSocket("ws://localhost:5000");

  return (
    <div>
      <h1>IoT Device Data</h1>
      <ul>
        {messages.map(
          (
            msg: string,
            index: number // Explicitly define types
          ) => (
            <li key={index}>{msg}</li>
          )
        )}
      </ul>
    </div>
  );
};

export default App;
