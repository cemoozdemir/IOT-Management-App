import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  createDevice,
  deleteDevice,
  getDevices,
  updateDevice,
} from "../api/deviceApi";
import { AppShell } from "../layout/AppShell";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  CountBadge,
  DeviceActions,
  DeviceForm,
  DeviceList,
  DeviceMeta,
  DeviceName,
  DeviceRow,
  EmptyState,
  ErrorBanner,
  Field,
  Label,
  MetricCard,
  MetricHint,
  MetricLabel,
  MetricsGrid,
  MetricValue,
  SectionHeader,
  StatusBadge,
  StatusDot,
  StatusLine,
  TelemetryMessage,
  WorkspaceGrid,
} from "../styles/dashboard";

interface Device {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline";
}

interface DashboardProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({
  toggleTheme,
  isDarkMode,
}) => {
  const [devices, setDevices] =
    useState<Device[]>([]);

  const [newDevice, setNewDevice] =
    useState({
      name: "",
      type: "",
    });

  const [loading, setLoading] =
    useState(true);

  const [isCreating, setIsCreating] =
    useState(false);

  const [
    busyDeviceId,
    setBusyDeviceId,
  ] = useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const fetchDevices =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const response =
          await getDevices();

        setDevices(
          Array.isArray(response.data)
            ? response.data
            : []
        );
      } catch {
        setError(
          "Devices could not be loaded. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void fetchDevices();
  }, [fetchDevices]);

  const onlineCount = useMemo(
    () =>
      devices.filter(
        (device) =>
          device.status === "online"
      ).length,
    [devices]
  );

  const offlineCount =
    devices.length - onlineCount;

  const handleLogout = () => {
    auth?.logout();
    navigate("/auth");
  };

  const handleCreate = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const name =
      newDevice.name.trim();

    const type =
      newDevice.type.trim();

    if (!name || !type) {
      setError(
        "Device name and type are required."
      );
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createDevice({
        name,
        type,
        status: "online",
      });

      setNewDevice({
        name: "",
        type: "",
      });

      await fetchDevices();
    } catch {
      setError(
        "Device could not be created."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (
    device: Device
  ) => {
    const nextStatus =
      device.status === "online"
        ? "offline"
        : "online";

    setBusyDeviceId(device.id);
    setError(null);

    try {
      await updateDevice(
        device.id,
        {
          name: device.name,
          type: device.type,
          status: nextStatus,
        }
      );

      await fetchDevices();
    } catch {
      setError(
        "Device status could not be updated."
      );
    } finally {
      setBusyDeviceId(null);
    }
  };

  const handleDelete = async (
    device: Device
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${device.name}"?`
      );

    if (!confirmed) {
      return;
    }

    setBusyDeviceId(device.id);
    setError(null);

    try {
      await deleteDevice(device.id);
      await fetchDevices();
    } catch {
      setError(
        "Device could not be deleted."
      );
    } finally {
      setBusyDeviceId(null);
    }
  };

  return (
    <AppShell
      title="Overview"
      subtitle="Monitor your workspace and manage connected devices from one place."
      isDarkMode={isDarkMode}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
    >
      {error && (
        <ErrorBanner
          role="alert"
          aria-live="assertive"
        >
          {error}
        </ErrorBanner>
      )}

      <MetricsGrid>
        <MetricCard>
          <MetricLabel>
            Total devices
          </MetricLabel>
          <MetricValue>
            {devices.length}
          </MetricValue>
          <MetricHint>
            Registered in this workspace
          </MetricHint>
        </MetricCard>

        <MetricCard>
          <MetricLabel>
            Online
          </MetricLabel>
          <MetricValue>
            {onlineCount}
          </MetricValue>
          <MetricHint>
            Currently marked online
          </MetricHint>
        </MetricCard>

        <MetricCard>
          <MetricLabel>
            Offline
          </MetricLabel>
          <MetricValue>
            {offlineCount}
          </MetricValue>
          <MetricHint>
            Currently marked offline
          </MetricHint>
        </MetricCard>
      </MetricsGrid>

      <WorkspaceGrid>
        <Card>
          <CardHeader>
            <CardTitle>
              Live telemetry
            </CardTitle>
            <CardDescription>
              Real-time device measurements
            </CardDescription>
          </CardHeader>

          <CardContent>
            <StatusLine>
              <StatusDot />
              Telemetry transport not configured
            </StatusLine>

            <TelemetryMessage>
              Live sensor data will appear here
              after a device transport and
              authenticated telemetry channel are
              configured.
            </TelemetryMessage>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Add device
            </CardTitle>
            <CardDescription>
              Register a device in your workspace
            </CardDescription>
          </CardHeader>

          <CardContent>
            <DeviceForm
              onSubmit={handleCreate}
            >
              <Field>
                <Label htmlFor="device-name">
                  Device name
                </Label>

                <Input
                  id="device-name"
                  name="device-name"
                  autoComplete="off"
                  placeholder="e.g. Living room sensor"
                  value={newDevice.name}
                  onChange={(event) =>
                    setNewDevice(
                      (current) => ({
                        ...current,
                        name:
                          event.target.value,
                      })
                    )
                  }
                />
              </Field>

              <Field>
                <Label htmlFor="device-type">
                  Device type
                </Label>

                <Input
                  id="device-type"
                  name="device-type"
                  autoComplete="off"
                  placeholder="e.g. ESP32"
                  value={newDevice.type}
                  onChange={(event) =>
                    setNewDevice(
                      (current) => ({
                        ...current,
                        type:
                          event.target.value,
                      })
                    )
                  }
                />
              </Field>

              <Button
                type="submit"
                loading={isCreating}
                disabled={
                  !newDevice.name.trim() ||
                  !newDevice.type.trim()
                }
              >
                Add device
              </Button>
            </DeviceForm>
          </CardContent>
        </Card>
      </WorkspaceGrid>

      <Card>
        <CardHeader>
          <SectionHeader>
            <div>
              <CardTitle>
                Devices
              </CardTitle>
              <CardDescription>
                Manage registered IoT devices
              </CardDescription>
            </div>

            <CountBadge>
              {devices.length}
            </CountBadge>
          </SectionHeader>
        </CardHeader>

        <CardContent
          aria-live="polite"
          aria-busy={loading}
        >
          {loading ? (
            <EmptyState>
              Loading devices...
            </EmptyState>
          ) : devices.length === 0 ? (
            <EmptyState>
              No devices have been added yet.
              Use the form above to register your
              first device.
            </EmptyState>
          ) : (
            <DeviceList>
              {devices.map(
                (device) => {
                  const busy =
                    busyDeviceId ===
                    device.id;

                  return (
                    <DeviceRow
                      key={device.id}
                    >
                      <div>
                        <DeviceName>
                          {device.name}
                        </DeviceName>

                        <DeviceMeta>
                          <span>
                            {device.type}
                          </span>

                          <StatusBadge
                            $online={
                              device.status ===
                              "online"
                            }
                          >
                            {device.status}
                          </StatusBadge>
                        </DeviceMeta>
                      </div>

                      <DeviceActions>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            void handleUpdate(
                              device
                            )
                          }
                        >
                          {device.status ===
                          "online"
                            ? "Set offline"
                            : "Set online"}
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busy}
                          onClick={() =>
                            void handleDelete(
                              device
                            )
                          }
                        >
                          Delete
                        </Button>
                      </DeviceActions>
                    </DeviceRow>
                  );
                }
              )}
            </DeviceList>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
};

export default Dashboard;
