// src/pages/Dashboard.tsx
import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { AuthContext } from "../context/AuthContext";
import {
  getDevices,
  createDevice,
  updateDevice,
  deleteDevice,
} from "../api/deviceApi";
import { useWebSocket } from "../hooks/useWebSocket";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";

const Container = styled.div`
  display: flex;
  min-height: 100vh;
  font-family: "Segoe UI", sans-serif;
  background-color: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
`;

const Sidebar = styled.aside`
  width: 260px;
  background-color: ${(props) => props.theme.sidebarBg};
  color: ${(props) => props.theme.sidebarText};
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Main = styled.main`
  flex: 1;
  padding: 2rem;
  background-color: ${(props) => props.theme.mainBg};
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const DeviceList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const DeviceItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: ${(props) => props.theme.cardBg};
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const FlexCardContent = styled(CardContent)`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

interface DashboardProps {
  toggleTheme: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ toggleTheme }) => {
  const [devices, setDevices] = useState<any[]>([]);
  const [newDevice, setNewDevice] = useState({ name: "", type: "" });
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const sensorData = useWebSocket("ws://localhost:3001");

  const fetchDevices = async () => {
    try {
      const response = await getDevices();
      setDevices(response.data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleLogout = () => {
    auth?.logout();
    navigate("/login");
  };

  const handleCreate = async () => {
    try {
      await createDevice(newDevice);
      setNewDevice({ name: "", type: "" });
      fetchDevices();
    } catch (error) {
      console.error("Error creating device:", error);
    }
  };

  const handleUpdate = async (id: string, status: string) => {
    try {
      await updateDevice(id, {
        ...devices.find((d) => d.id === id),
        status,
      });
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
    <Container>
      <Sidebar>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "bold" }}>IoT Manager</h1>
        <Button onClick={toggleTheme}>Toggle Theme</Button>
        <nav>
          <Button style={{ width: "100%", marginBottom: "1rem" }}>
            Dashboard
          </Button>
          <Button
            style={{ width: "100%" }}
            variant="outline"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </nav>
      </Sidebar>

      <Main>
        <Section>
          <Card>
            <CardHeader>
              <CardTitle>Live Sensor Data</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </Section>

        <Section>
          <Card>
            <CardHeader>
              <CardTitle>Add Device</CardTitle>
            </CardHeader>
            <FlexCardContent>
              <Input
                placeholder="Device Name"
                value={newDevice.name}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, name: e.target.value })
                }
              />
              <Input
                placeholder="Device Type"
                value={newDevice.type}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, type: e.target.value })
                }
              />
              <Button onClick={handleCreate}>Add</Button>
            </FlexCardContent>
          </Card>
        </Section>

        <Section>
          <Card>
            <CardHeader>
              <CardTitle>Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <DeviceList>
                {devices.map((device) => (
                  <DeviceItem key={device.id}>
                    <div>
                      <p style={{ fontWeight: "bold" }}>
                        {device.name} ({device.type})
                      </p>
                      <p>Status: {device.status}</p>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <Button
                        variant="outline"
                        onClick={() =>
                          handleUpdate(
                            device.id,
                            device.status === "online" ? "offline" : "online"
                          )
                        }
                      >
                        Toggle Status
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleDelete(device.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </DeviceItem>
                ))}
              </DeviceList>
            </CardContent>
          </Card>
        </Section>
      </Main>
    </Container>
  );
};

export default Dashboard;
