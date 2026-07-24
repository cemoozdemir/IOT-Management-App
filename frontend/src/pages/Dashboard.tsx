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
  revokeDeviceCredential,
  rotateDeviceCredential,
} from "../api/deviceApi";
import {
  getLatestTelemetry,
  LatestTelemetryMeasurement,
} from "../api/telemetryApi";
import { AppShell } from "../layout/AppShell";
import CameraSettings from "../components/CameraSettings";
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
  CredentialCodeRow,
  CredentialDescription,
  CredentialEyebrow,
  CredentialHeader,
  CredentialNotice,
  CredentialNoticeBody,
  CredentialTitle,
  CredentialValue,
  CredentialWarning,
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
  TelemetryDevice,
  TelemetryFooter,
  TelemetryList,
  TelemetryMessage,
  TelemetryMetric,
  TelemetryReading,
  TelemetryRow,
  TelemetryTimestamp,
  WorkspaceGrid,
} from "../styles/dashboard";

interface Device {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline";
  lastSeenAt?: string | null;
}

interface OneTimeCredential {
  deviceId: string;
  deviceName: string;
  value: string;
  source: "created" | "rotated";
}

interface DashboardProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const DASHBOARD_POLL_INTERVAL_MS =
  10_000;

const formatTimestamp = (
  value: string
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unknown time";
  }

  return date.toLocaleString();
};

const formatTelemetryValue = (
  value: number,
  unit: string | null
) => {
  const formatted =
    new Intl.NumberFormat(
      undefined,
      {
        maximumFractionDigits:
          3,
      }
    ).format(value);

  return unit
    ? `${formatted} ${unit}`
    : formatted;
};

const Dashboard: React.FC<DashboardProps> = ({
  toggleTheme,
  isDarkMode,
}) => {
  const [devices, setDevices] =
    useState<Device[]>([]);

  const [
    telemetry,
    setTelemetry,
  ] = useState<
    LatestTelemetryMeasurement[]
  >([]);

  const [
    telemetryError,
    setTelemetryError,
  ] = useState<string | null>(
    null
  );

  const [
    telemetryRefreshedAt,
    setTelemetryRefreshedAt,
  ] = useState<string | null>(
    null
  );

  const [
    telemetryTruncated,
    setTelemetryTruncated,
  ] = useState(false);

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

  const [
    oneTimeCredential,
    setOneTimeCredential,
  ] = useState<OneTimeCredential | null>(
    null
  );

  const [
    credentialCopied,
    setCredentialCopied,
  ] = useState(false);

  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const fetchDevices =
    useCallback(
      async (
        showLoading:
          boolean = true,
        surfaceError:
          boolean = true
      ) => {
        if (showLoading) {
          setLoading(true);
        }

        if (surfaceError) {
          setError(null);
        }

        try {
          const response =
            await getDevices();

          setDevices(
            Array.isArray(
              response.data
            )
              ? response.data
              : []
          );
        } catch {
          if (surfaceError) {
            setError(
              "Devices could not be loaded. Please try again."
            );
          }
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      []
    );

  const fetchTelemetry =
    useCallback(async () => {
      try {
        const response =
          await getLatestTelemetry();

        const data =
          response.data;

        setTelemetry(
          Array.isArray(
            data?.measurements
          )
            ? data.measurements
            : []
        );

        setTelemetryRefreshedAt(
          typeof data?.generatedAt ===
            "string"
            ? data.generatedAt
            : null
        );

        setTelemetryTruncated(
          data?.truncated ===
            true
        );

        setTelemetryError(
          null
        );
      } catch {
        setTelemetryError(
          "Telemetry refresh is temporarily unavailable."
        );
      }
    }, []);

  useEffect(() => {
    let cancelled =
      false;

    let timerId:
      number |
      undefined;

    const schedulePoll =
      () => {
        timerId =
          window.setTimeout(
            () => {
              void poll();
            },
            DASHBOARD_POLL_INTERVAL_MS
          );
      };

    const poll =
      async () => {
        await Promise.all([
          fetchDevices(
            false,
            false
          ),
          fetchTelemetry(),
        ]);

        if (!cancelled) {
          schedulePoll();
        }
      };

    void (
      async () => {
        await Promise.all([
          fetchDevices(),
          fetchTelemetry(),
        ]);

        if (!cancelled) {
          schedulePoll();
        }
      }
    )();

    return () => {
      cancelled =
        true;

      if (
        timerId !==
        undefined
      ) {
        window.clearTimeout(
          timerId
        );
      }
    };
  }, [
    fetchDevices,
    fetchTelemetry,
  ]);

  const deviceNames =
    useMemo(
      () =>
        new Map(
          devices.map(
            (device) => [
              device.id,
              device.name,
            ]
          )
        ),
      [devices]
    );

  const recentTelemetry =
    useMemo(
      () =>
        [...telemetry]
          .sort(
            (
              left,
              right
            ) =>
              Date.parse(
                right.recordedAt
              ) -
              Date.parse(
                left.recordedAt
              )
          )
          .slice(
            0,
            8
          ),
      [telemetry]
    );

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

    if (oneTimeCredential) {
      setError(
        "Save or dismiss the current device credential before creating another device."
      );
      return;
    }

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
      const response =
        await createDevice({
          name,
          type,
        });

      const issued =
        response.data?.credential;

      const device =
        response.data?.device;

      if (
        !device?.id ||
        typeof issued?.value !== "string" ||
        !issued.value ||
        issued.shownOnce !== true
      ) {
        throw new Error(
          "Invalid device credential response"
        );
      }

      setOneTimeCredential({
        deviceId: device.id,
        deviceName: device.name,
        value: issued.value,
        source: "created",
      });

      setCredentialCopied(false);

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

  const copyCredential = async () => {
    if (!oneTimeCredential) {
      return;
    }

    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
          "function"
      ) {
        await navigator.clipboard.writeText(
          oneTimeCredential.value
        );
      } else {
        const textarea =
          document.createElement("textarea");

        textarea.value =
          oneTimeCredential.value;

        textarea.setAttribute(
          "readonly",
          ""
        );

        textarea.style.position =
          "fixed";

        textarea.style.opacity =
          "0";

        document.body.appendChild(
          textarea
        );

        textarea.select();

        const copied =
          document.execCommand("copy");

        document.body.removeChild(
          textarea
        );

        if (!copied) {
          throw new Error(
            "Clipboard copy failed"
          );
        }
      }

      setCredentialCopied(true);
      setError(null);
    } catch {
      setCredentialCopied(false);

      setError(
        "Credential could not be copied. Select the value and copy it manually."
      );
    }
  };

  const dismissCredential = () => {
    setOneTimeCredential(null);
    setCredentialCopied(false);
  };

  const handleRotateCredential = async (
    device: Device
  ) => {
    if (oneTimeCredential) {
      setError(
        "Save or dismiss the current device credential before rotating another credential."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Rotate the credential for "${device.name}"? The existing device credential will stop working immediately.`
      );

    if (!confirmed) {
      return;
    }

    setBusyDeviceId(device.id);
    setError(null);

    try {
      const response =
        await rotateDeviceCredential(
          device.id
        );

      const issued =
        response.data?.credential;

      if (
        typeof issued?.value !== "string" ||
        !issued.value ||
        issued.shownOnce !== true
      ) {
        throw new Error(
          "Invalid credential rotation response"
        );
      }

      setOneTimeCredential({
        deviceId: device.id,
        deviceName: device.name,
        value: issued.value,
        source: "rotated",
      });

      setCredentialCopied(false);
    } catch {
      setError(
        "Device credential could not be rotated."
      );
    } finally {
      setBusyDeviceId(null);
    }
  };

  const handleRevokeCredential = async (
    device: Device
  ) => {
    const confirmed =
      window.confirm(
        `Revoke the active credential for "${device.name}"? The physical device will no longer be able to authenticate until a new credential is issued.`
      );

    if (!confirmed) {
      return;
    }

    setBusyDeviceId(device.id);
    setError(null);

    try {
      await revokeDeviceCredential(
        device.id
      );

      if (
        oneTimeCredential?.deviceId ===
        device.id
      ) {
        dismissCredential();
      }
    } catch {
      setError(
        "Device credential could not be revoked."
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

      if (
        oneTimeCredential?.deviceId ===
        device.id
      ) {
        dismissCredential();
      }

      await fetchDevices();
      await fetchTelemetry();
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

      {oneTimeCredential && (
        <CredentialNotice
          role="status"
          aria-live="polite"
        >
          <CredentialNoticeBody>
            <CredentialHeader>
              <div>
                <CredentialEyebrow>
                  {oneTimeCredential.source ===
                  "created"
                    ? "Device created"
                    : "Credential rotated"}
                </CredentialEyebrow>

                <CredentialTitle>
                  Save the credential for{" "}
                  {oneTimeCredential.deviceName}
                </CredentialTitle>

                <CredentialDescription>
                  This credential is shown only
                  once. Copy it to the physical
                  device configuration before
                  dismissing this panel. It cannot
                  be retrieved again later.
                </CredentialDescription>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={dismissCredential}
              >
                Dismiss
              </Button>
            </CredentialHeader>

            <CredentialCodeRow>
              <CredentialValue
                aria-label="Device credential"
              >
                {oneTimeCredential.value}
              </CredentialValue>

              <Button
                type="button"
                onClick={() =>
                  void copyCredential()
                }
              >
                {credentialCopied
                  ? "Copied"
                  : "Copy credential"}
              </Button>
            </CredentialCodeRow>

            <CredentialWarning>
              Dismissing or refreshing the page
              permanently removes this raw
              credential from the interface.
              The server stores only a
              non-reversible hash.
            </CredentialWarning>
          </CredentialNoticeBody>
        </CredentialNotice>
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
            Seen within the last 2 minutes
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
            No recent authenticated telemetry
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
              <StatusDot
                $active={
                  !telemetryError &&
                  recentTelemetry.length >
                    0
                }
              />

              {telemetryError
                ? "Telemetry refresh unavailable"
                : recentTelemetry.length >
                    0
                  ? "Authenticated telemetry active"
                  : "Waiting for device telemetry"}
            </StatusLine>

            {telemetryError && (
              <TelemetryMessage>
                {telemetryError}
                {" "}
                Previously loaded measurements
                remain visible below.
              </TelemetryMessage>
            )}

            {recentTelemetry.length ===
            0 ? (
              <TelemetryMessage>
                No authenticated telemetry has
                been received yet. Devices can
                send measurements to the
                telemetry ingestion endpoint
                after being configured with their
                one-time device credential.
              </TelemetryMessage>
            ) : (
              <TelemetryList>
                {recentTelemetry.map(
                  (
                    measurement
                  ) => (
                    <TelemetryRow
                      key={
                        measurement.id
                      }
                    >
                      <div>
                        <TelemetryDevice>
                          {deviceNames.get(
                            measurement.deviceId
                          ) ??
                            "Unknown device"}
                        </TelemetryDevice>

                        <TelemetryMetric>
                          {
                            measurement.metric
                          }
                        </TelemetryMetric>
                      </div>

                      <div>
                        <TelemetryReading>
                          {formatTelemetryValue(
                            measurement.value,
                            measurement.unit
                          )}
                        </TelemetryReading>

                        <TelemetryTimestamp>
                          {formatTimestamp(
                            measurement.recordedAt
                          )}
                        </TelemetryTimestamp>
                      </div>
                    </TelemetryRow>
                  )
                )}
              </TelemetryList>
            )}

            <TelemetryFooter>
              Polling every 10 seconds
              {telemetryRefreshedAt
                ? ` · Last refresh ${formatTimestamp(
                    telemetryRefreshedAt
                  )}`
                : ""}
              {telemetryTruncated
                ? " · Showing the most recent 250 device metrics"
                : ""}
            </TelemetryFooter>
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
                  Boolean(oneTimeCredential) ||
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

                          {device.lastSeenAt && (
                            <span>
                              Last seen{" "}
                              {formatTimestamp(
                                device.lastSeenAt
                              )}
                            </span>
                          )}
                        </DeviceMeta>
                      </div>

                      <DeviceActions>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            busy ||
                            Boolean(
                              oneTimeCredential
                            )
                          }
                          onClick={() =>
                            void handleRotateCredential(
                              device
                            )
                          }
                        >
                          Rotate credential
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            void handleRevokeCredential(
                              device
                            )
                          }
                        >
                          Revoke credential
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

      <CameraSettings
        devices={devices}
      />
    </AppShell>
  );
};

export default Dashboard;
