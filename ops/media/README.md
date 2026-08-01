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

This directory only defines the media service contract.

Installation, firewall changes, Nginx proxying and service
activation are performed in a later deployment step.
