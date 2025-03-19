import { useNavigate } from "react-router-dom";

import React, { useState, useEffect, useContext } from "react";
import {
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
} from "../api/deviceApi";
import { AuthContext } from "../context/AuthContext";

const Dashboard: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [newDevice, setNewDevice] = useState({ name: "", type: "" });
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

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
