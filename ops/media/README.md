# Media gateway

IoT Manager uses MediaMTX as the media gateway between
camera sources and web clients.

Pinned baseline:

- MediaMTX 1.19.2
- RTSP / RTSPS camera sources
- WebRTC for the primary live view
- HLS as a fallback
- localhost-only Control API

## Network layout

MediaMTX listeners:

- `127.0.0.1:9997` — Control API
- `127.0.0.1:8554` — internal RTSP
- `127.0.0.1:8888` — HLS
- `127.0.0.1:8889` — WebRTC HTTP / WHEP
- `:8189/udp` — WebRTC ICE media

The HTTP listeners are intended to remain behind Nginx.

The Control API must never be exposed by Nginx or the
public firewall.

## Dynamic camera paths

Camera source URLs are not committed to `mediamtx.yml`.

The backend owns camera configuration and creates,
updates and removes MediaMTX paths through the localhost
Control API.

Expected Control API operations:

- `GET /v3/config/paths/list`
- `GET /v3/config/paths/get/{name}`
- `POST /v3/config/paths/add/{name}`
- `PATCH /v3/config/paths/patch/{name}`
- `DELETE /v3/config/paths/delete/{name}`

The MediaMTX path name is the opaque `CameraSource.streamPath`.

## Camera credentials

RTSP usernames, passwords and query tokens are stored by
the backend in encrypted form.

The frontend never receives them.

Only the backend reconstructs a camera source URL before
passing it to the localhost MediaMTX Control API.

## Authentication

WebRTC and HLS read requests are delegated to:

`http://127.0.0.1:3001/api/media/auth`

The backend media-auth route is added separately.

Control API authentication is excluded because the API is
bound exclusively to loopback.

## WebRTC host

Production can advertise the public host without changing
the committed configuration:

`MTX_WEBRTCADDITIONALHOSTS=iot.ozdmr.dev`

This belongs in:

`/etc/iot-manager/mediamtx.env`

and must not contain camera credentials.

## Deployment

The repository contains the media deployment contract, but
development does not automatically install, enable or start
MediaMTX and does not change the host firewall or Nginx.

### Install without activation

Run:

    sudo ./ops/media/install-mediamtx.sh

The installer:

- pins MediaMTX 1.19.2;
- downloads the official release archive;
- verifies the archive against the official
  `checksums.sha256`;
- creates the dedicated `iot-media` system account;
- installs the binary, configuration and systemd unit;
- preserves an existing `/etc/iot-manager/mediamtx.env`;
- runs `systemctl daemon-reload`;
- does not enable or start the service by default.

### Activate explicitly

After reviewing production configuration:

    sudo ./ops/media/install-mediamtx.sh --activate

Activation enables and restarts:

    iot-manager-media.service

### Nginx

`nginx-media.conf` is intended to be included inside the
existing HTTPS server block.

It proxies:

- `/media/webrtc/` to `127.0.0.1:8889`;
- `/media/hls/` to `127.0.0.1:8888`.

The MediaMTX Control API on port `9997` and internal RTSP
listener on port `8554` must never be proxied publicly.

The proxy forwards the short-lived browser Authorization
header used by WebRTC/WHEP and authenticated HLS.

### Firewall

See `FIREWALL.md`.

Only UDP port `8189` is intended to be opened specifically
for direct WebRTC ICE media traffic.

### Runtime preflight

After MediaMTX has been activated:

    sudo ./ops/media/runtime-preflight.sh

The preflight checks:

- systemd service state;
- localhost-only Control API, RTSP, HLS and WHEP listeners;
- absence of public TCP listeners on those ports;
- UDP `8189` ICE listener;
- localhost Control API health;
- Nginx syntax when Nginx is installed.
