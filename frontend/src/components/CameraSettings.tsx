import {
  getCameraConnectionView,
} from "../utils/cameraConnectionStatus";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CameraRecord,
  createCamera,
  deleteCamera,
  getCameras,
  testCameraConnectivity,
  updateCamera,
} from "../api/cameraApi";
import {
  Button,
} from "./ui/button";
import CameraLiveView from "./CameraLiveView";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Input,
} from "./ui/input";
import {
  CountBadge,
  EmptyState,
  Field,
  Label,
  SectionHeader,
} from "../styles/dashboard";
import {
  CameraActions,
  CameraBadge,
  CameraCheckbox,
  CameraConnectionBadge,
  CameraEditActions,
  CameraEditPanel,
  CameraError,
  CameraForm,
  CameraHint,
  CameraList,
  CameraMeta,
  CameraName,
  CameraRow,
  CameraSecurityNote,
  CameraSelect,
  CameraStreamPath,
  CameraToggleRow,
} from "../styles/camera";

export interface CameraDeviceOption {
  id: string;
  name: string;
  type: string;
}

interface CameraSettingsProps {
  devices:
    CameraDeviceOption[];
}

interface NewCameraForm {
  deviceId: string;
  name: string;
  sourceUrl: string;
  enabled: boolean;
}

interface EditCameraForm {
  name: string;
  sourceUrl: string;
  enabled: boolean;
}

const emptyNewCamera:
  NewCameraForm = {
    deviceId: "",
    name: "",
    sourceUrl: "",
    enabled: true,
  };

const cameraSourceLabel =
  (
    camera:
      CameraRecord
  ) => {
    return (
      `${camera.source.scheme}://` +
      `${camera.source.host}:` +
      `${camera.source.port}`
    );
  };

const formatCameraConnectionTimestamp =
  (
    value: string
  ): string => {
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

const CameraSettings:
  React.FC<
    CameraSettingsProps
  > = ({
    devices,
  }) => {
    const [
      cameras,
      setCameras,
    ] = useState<
      CameraRecord[]
    >([]);

    const [
      newCamera,
      setNewCamera,
    ] = useState<
      NewCameraForm
    >(
      emptyNewCamera
    );

    const [
      editingCameraId,
      setEditingCameraId,
    ] = useState<
      string | null
    >(null);

    const [
      editCamera,
      setEditCamera,
    ] = useState<
      EditCameraForm
    >({
      name: "",
      sourceUrl: "",
      enabled: true,
    });

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [
      creating,
      setCreating,
    ] = useState(false);

    const [
      busyCameraId,
      setBusyCameraId,
    ] = useState<
      string | null
    >(null);

    const [
      testingCameraId,
      setTestingCameraId,
    ] = useState<
      string | null
    >(null);

    const [
      liveCameraId,
      setLiveCameraId,
    ] = useState<
      string | null
    >(null);

    const [
      error,
      setError,
    ] = useState<
      string | null
    >(null);

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

    const loadCameras =
      useCallback(
        async (
          showLoading:
            boolean = true
        ) => {
          if (showLoading) {
            setLoading(true);
          }

          try {
            const response =
              await getCameras();

            setCameras(
              Array.isArray(
                response.data
              )
                ? response.data
                : []
            );

            setError(null);
          } catch {
            setError(
              "Cameras could not be loaded."
            );
          } finally {
            if (showLoading) {
              setLoading(false);
            }
          }
        },
        []
      );

    useEffect(() => {
      void loadCameras();
    }, [
      loadCameras,
    ]);

    useEffect(() => {
      if (
        devices.length === 0
      ) {
        setNewCamera(
          emptyNewCamera
        );
        return;
      }

      setNewCamera(
        (current) => {
          if (
            current.deviceId &&
            devices.some(
              (device) =>
                device.id ===
                current.deviceId
            )
          ) {
            return current;
          }

          return {
            ...current,
            deviceId:
              devices[0].id,
          };
        }
      );
    }, [
      devices,
    ]);

    const handleCreate =
      async (
        event:
          React.FormEvent
      ) => {
        event.preventDefault();

        const deviceId =
          newCamera.deviceId;

        const name =
          newCamera.name.trim();

        const sourceUrl =
          newCamera
            .sourceUrl
            .trim();

        if (
          !deviceId ||
          !name ||
          !sourceUrl
        ) {
          setError(
            "Device, camera name and RTSP source are required."
          );
          return;
        }

        setCreating(true);
        setError(null);

        try {
          await createCamera({
            deviceId,
            name,
            sourceUrl,
            enabled:
              newCamera.enabled,
          });

          setNewCamera({
            deviceId,
            name: "",
            sourceUrl: "",
            enabled: true,
          });

          await loadCameras(
            false
          );
        } catch {
          setError(
            "Camera could not be added. Check the RTSP address and camera name."
          );
        } finally {
          setCreating(false);
        }
      };

    const startEdit =
      (
        camera:
          CameraRecord
      ) => {
        setEditingCameraId(
          camera.id
        );

        setEditCamera({
          name:
            camera.name,
          sourceUrl: "",
          enabled:
            camera.enabled,
        });

        setError(null);
      };

    const cancelEdit =
      () => {
        setEditingCameraId(
          null
        );

        setEditCamera({
          name: "",
          sourceUrl: "",
          enabled: true,
        });
      };

    const handleUpdate =
      async (
        event:
          React.FormEvent,
        camera:
          CameraRecord
      ) => {
        event.preventDefault();

        const name =
          editCamera.name.trim();

        const sourceUrl =
          editCamera
            .sourceUrl
            .trim();

        if (!name) {
          setError(
            "Camera name is required."
          );
          return;
        }

        setBusyCameraId(
          camera.id
        );
        setError(null);

        try {
          await updateCamera(
            camera.id,
            {
              name,
              enabled:
                editCamera.enabled,
              ...(sourceUrl
                ? {
                    sourceUrl,
                  }
                : {}),
            }
          );

          cancelEdit();

          await loadCameras(
            false
          );
        } catch {
          setError(
            "Camera settings could not be updated."
          );
        } finally {
          setBusyCameraId(
            null
          );
        }
      };

    const handleConnectivityTest =
      async (
        camera:
          CameraRecord
      ) => {
        if (!camera.enabled) {
          return;
        }

        setTestingCameraId(
          camera.id
        );

        setError(null);

        try {
          await testCameraConnectivity(
            camera.id
          );

          /*
           * Backend persists lastConnectedAt /
           * lastError. Refresh the canonical
           * camera representation afterwards.
           */
          await loadCameras(
            false
          );
        } catch {
          setError(
            "Camera connectivity test could not be completed."
          );
        } finally {
          setTestingCameraId(
            null
          );
        }
      };

    const handleDelete =
      async (
        camera:
          CameraRecord
      ) => {
        const confirmed =
          window.confirm(
            `Delete camera "${camera.name}"?`
          );

        if (!confirmed) {
          return;
        }

        setBusyCameraId(
          camera.id
        );
        setError(null);

        try {
          await deleteCamera(
            camera.id
          );

          if (
            liveCameraId ===
            camera.id
          ) {
            setLiveCameraId(
              null
            );
          }

          if (
            editingCameraId ===
            camera.id
          ) {
            cancelEdit();
          }

          await loadCameras(
            false
          );
        } catch {
          setError(
            "Camera could not be deleted."
          );
        } finally {
          setBusyCameraId(
            null
          );
        }
      };

    return (
      <Card>
        <CardHeader>
          <SectionHeader>
            <div>
              <CardTitle>
                Cameras
              </CardTitle>

              <CardDescription>
                Configure camera sources attached
                to your IoT devices
              </CardDescription>
            </div>

            <CountBadge>
              {cameras.length}
            </CountBadge>
          </SectionHeader>
        </CardHeader>

        <CardContent>
          {error && (
            <CameraError
              role="alert"
            >
              {error}
            </CameraError>
          )}

          {devices.length ===
          0 ? (
            <EmptyState>
              Add a device before configuring a
              camera source.
            </EmptyState>
          ) : (
            <>
              <CameraForm
                onSubmit={
                  handleCreate
                }
              >
                <Field>
                  <Label
                    htmlFor="camera-device"
                  >
                    Device
                  </Label>

                  <CameraSelect
                    id="camera-device"
                    value={
                      newCamera.deviceId
                    }
                    onChange={(
                      event
                    ) =>
                      setNewCamera(
                        (
                          current
                        ) => ({
                          ...current,
                          deviceId:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  >
                    {devices.map(
                      (device) => (
                        <option
                          key={
                            device.id
                          }
                          value={
                            device.id
                          }
                        >
                          {device.name}
                          {" · "}
                          {device.type}
                        </option>
                      )
                    )}
                  </CameraSelect>
                </Field>

                <Field>
                  <Label
                    htmlFor="camera-name"
                  >
                    Camera name
                  </Label>

                  <Input
                    id="camera-name"
                    autoComplete="off"
                    placeholder="e.g. Front door"
                    value={
                      newCamera.name
                    }
                    onChange={(
                      event
                    ) =>
                      setNewCamera(
                        (
                          current
                        ) => ({
                          ...current,
                          name:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </Field>

                <Field>
                  <Label
                    htmlFor="camera-source"
                  >
                    RTSP source
                  </Label>

                  <Input
                    id="camera-source"
                    type="password"
                    autoComplete="new-password"
                    spellCheck={false}
                    placeholder="rtsp://user:pass@camera/live"
                    value={
                      newCamera
                        .sourceUrl
                    }
                    onChange={(
                      event
                    ) =>
                      setNewCamera(
                        (
                          current
                        ) => ({
                          ...current,
                          sourceUrl:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                  />
                </Field>

                <Button
                  type="submit"
                  loading={
                    creating
                  }
                  disabled={
                    creating ||
                    !newCamera
                      .deviceId ||
                    !newCamera
                      .name
                      .trim() ||
                    !newCamera
                      .sourceUrl
                      .trim()
                  }
                >
                  Add camera
                </Button>
              </CameraForm>

              <CameraToggleRow>
                <CameraCheckbox
                  type="checkbox"
                  checked={
                    newCamera.enabled
                  }
                  onChange={(
                    event
                  ) =>
                    setNewCamera(
                      (
                        current
                      ) => ({
                        ...current,
                        enabled:
                          event
                            .target
                            .checked,
                      })
                    )
                  }
                />

                Enable this camera source
              </CameraToggleRow>

              <CameraHint>
                RTSP credentials and URL query
                tokens are accepted during setup
                but are never returned to this
                interface. Leave sensitive camera
                URLs out of screenshots and logs.
              </CameraHint>
            </>
          )}

          {loading ? (
            <EmptyState>
              Loading cameras...
            </EmptyState>
          ) : cameras.length ===
            0 ? (
            devices.length > 0 && (
              <EmptyState>
                No cameras have been configured
                yet.
              </EmptyState>
            )
          ) : (
            <CameraList>
              {cameras.map(
                (camera) => {
                  const busy =
                    busyCameraId ===
                    camera.id;

                  const editing =
                    editingCameraId ===
                    camera.id;

                  return (
                    <CameraRow
                      key={
                        camera.id
                      }
                    >
                      <div>
                        <CameraName>
                          {camera.name}
                        </CameraName>

                        <CameraMeta>
                          <span>
                            {deviceNames.get(
                              camera.deviceId
                            ) ??
                              "Unknown device"}
                          </span>

                          <CameraBadge
                            $active={
                              camera.enabled
                            }
                          >
                            {camera.enabled
                              ? "enabled"
                              : "disabled"}
                          </CameraBadge>

                          <span>
                            {cameraSourceLabel(
                              camera
                            )}
                          </span>

                          {camera
                            .source
                            .protectedConnectionData && (
                            <CameraBadge
                              $active
                            >
                              protected auth
                            </CameraBadge>
                          )}

                          <CameraStreamPath>
                            {
                              camera.streamPath
                            }
                          </CameraStreamPath>
                          <CameraConnectionBadge
                            $state={
                              getCameraConnectionView(
                                camera
                              ).state
                            }
                          >
                            {
                              getCameraConnectionView(
                                camera
                              ).label
                            }
                          </CameraConnectionBadge>

                          {camera.lastConnectedAt ? (
                            <span>
                              Last connected{" "}
                              {
                                formatCameraConnectionTimestamp(
                                  camera.lastConnectedAt
                                )
                              }
                            </span>
                          ) : null}

                        </CameraMeta>
                      </div>

                      <CameraActions>
                        <Button
                          type="button"
                          disabled={
                            !camera.enabled ||
                            busyCameraId ===
                              camera.id ||
                            testingCameraId ===
                              camera.id
                          }
                          onClick={() => {
                            void handleConnectivityTest(
                              camera
                            );
                          }}
                        >
                          {testingCameraId ===
                          camera.id
                            ? "Testing..."
                            : "Test connection"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            busy ||
                            !camera.enabled
                          }
                          onClick={() =>
                            setLiveCameraId(
                              (
                                current
                              ) =>
                                current ===
                                camera.id
                                  ? null
                                  : camera.id
                            )
                          }
                        >
                          {liveCameraId ===
                          camera.id
                            ? "Close live"
                            : "Live"}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            editing
                              ? cancelEdit()
                              : startEdit(
                                  camera
                                )
                          }
                        >
                          {editing
                            ? "Cancel"
                            : "Edit"}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            void handleDelete(
                              camera
                            )
                          }
                        >
                          Delete
                        </Button>
                      </CameraActions>

                      {liveCameraId ===
                        camera.id &&
                        camera.enabled && (
                        <CameraLiveView
                          cameraId={
                            camera.id
                          }
                          cameraName={
                            camera.name
                          }
                          onClose={() =>
                            setLiveCameraId(
                              null
                            )
                          }
                        />
                      )}

                      {editing && (
                        <CameraEditPanel
                          onSubmit={(
                            event
                          ) =>
                            void handleUpdate(
                              event,
                              camera
                            )
                          }
                        >
                          <Field>
                            <Label
                              htmlFor={
                                `camera-edit-name-${camera.id}`
                              }
                            >
                              Camera name
                            </Label>

                            <Input
                              id={
                                `camera-edit-name-${camera.id}`
                              }
                              value={
                                editCamera.name
                              }
                              onChange={(
                                event
                              ) =>
                                setEditCamera(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    name:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                              }
                            />
                          </Field>

                          <Field>
                            <Label
                              htmlFor={
                                `camera-edit-source-${camera.id}`
                              }
                            >
                              Replace RTSP source
                            </Label>

                            <Input
                              id={
                                `camera-edit-source-${camera.id}`
                              }
                              type="password"
                              autoComplete="new-password"
                              spellCheck={false}
                              placeholder="Leave blank to keep current source"
                              value={
                                editCamera
                                  .sourceUrl
                              }
                              onChange={(
                                event
                              ) =>
                                setEditCamera(
                                  (
                                    current
                                  ) => ({
                                    ...current,
                                    sourceUrl:
                                      event
                                        .target
                                        .value,
                                  })
                                )
                              }
                            />
                          </Field>

                          <CameraEditActions>
                            <CameraToggleRow>
                              <CameraCheckbox
                                type="checkbox"
                                checked={
                                  editCamera.enabled
                                }
                                onChange={(
                                  event
                                ) =>
                                  setEditCamera(
                                    (
                                      current
                                    ) => ({
                                      ...current,
                                      enabled:
                                        event
                                          .target
                                          .checked,
                                    })
                                  )
                                }
                              />

                              Enabled
                            </CameraToggleRow>

                            <Button
                              type="submit"
                              size="sm"
                              loading={
                                busy
                              }
                            >
                              Save
                            </Button>
                          </CameraEditActions>
                        </CameraEditPanel>
                      )}
                    </CameraRow>
                  );
                }
              )}
            </CameraList>
          )}

          <CameraSecurityNote>
            Camera passwords, usernames, URL
            query tokens and source paths are
            intentionally not returned by the
            API. Updating a source replaces the
            stored protected connection data.
          </CameraSecurityNote>
        </CardContent>
      </Card>
    );
  };

export default CameraSettings;
