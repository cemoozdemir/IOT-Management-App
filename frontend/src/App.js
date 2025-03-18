import React from "react";
import useWebSocket from "./hooks/useWebSocket";

function App() {
  const messages = useWebSocket("ws://localhost:5000");

  return (
    <div>
      <h1>IoT Device Data</h1>
      <ul>
        {messages.map((msg, index) => (
          <li key={index}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
