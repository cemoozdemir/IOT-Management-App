import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
} from "../api/deviceApi";
import { AuthContext } from "../context/AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";

const Dashboard: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [newDevice, setNewDevice] = useState({ name: "", type: "" });
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const sensorData = useWebSocket("ws://localhost:5000"); // Connect to WebSocket

  const handleLogout = () => {
    auth?.logout();
    navigate("/login");
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await getDevices();
      setDevices(response.data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  const handleCreate = async () => {
    try {
      await createDevice(newDevice);
      fetchDevices();
    } catch (error) {
      console.error("Error creating device:", error);
    }
  };

  const handleUpdate = async (id: string, status: string) => {
    try {
      await updateDevice(id, { ...devices.find((d) => d.id === id), status });
      fetchDevices();
    } catch (error) {
      console.error("Error updating device:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDevice(id);
      fetchDevices();
    } catch (error) {
      console.error("Error deleting device:", error);
    }
  };

  return (
    <div>
      <button onClick={handleLogout}>Logout</button>
      <h2>Device Dashboard</h2>

      <div>
        <input
          type="text"
          placeholder="Device Name"
          onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
        />
        <input
          type="text"
          placeholder="Device Type"
          onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value })}
        />
        <button onClick={handleCreate}>Add Device</button>
      </div>

      <h3>Live Sensor Data</h3>
      {sensorData ? (
        <div>
          <p>🌡 Temperature: {sensorData.temperature}°C</p>
          <p>💧 Humidity: {sensorData.humidity}%</p>
          <p>
            🕒 Last Updated:{" "}
            {new Date(sensorData.timestamp).toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <p>Waiting for sensor data...</p>
      )}

      <ul>
        {devices.map((device) => (
          <li key={device.id}>
            {device.name} ({device.type}) - {device.status}
            <button
              onClick={() =>
                handleUpdate(
                  device.id,
                  device.status === "online" ? "offline" : "online"
                )
              }
            >
              Toggle Status
            </button>
            <button onClick={() => handleDelete(device.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
