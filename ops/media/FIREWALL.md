# Media firewall contract

MediaMTX HTTP and administrative listeners remain local to
the server. Browser HTTP traffic reaches them only through
the existing HTTPS Nginx virtual host.

## Public MediaMTX listener

Only this MediaMTX listener is intended to be directly
reachable from clients:

- `8189/udp` — WebRTC ICE media

## Loopback-only listeners

These must never be opened publicly:

- `127.0.0.1:9997/tcp` — MediaMTX Control API
- `127.0.0.1:8554/tcp` — internal RTSP listener
- `127.0.0.1:8888/tcp` — HLS HTTP
- `127.0.0.1:8889/tcp` — WebRTC/WHEP HTTP
- `127.0.0.1:3001/tcp` — IoT Manager backend API

## HTTPS paths

Nginx exposes:

- `/media/webrtc/` -> `127.0.0.1:8889`
- `/media/hls/` -> `127.0.0.1:8888`

Nginx must never proxy ports `9997` or `8554`.

## WebRTC advertised host

Production MediaMTX environment:

    MTX_WEBRTCADDITIONALHOSTS=iot.ozdmr.dev

This allows WebRTC clients to receive a publicly reachable
ICE candidate for the server.

## UFW deployment example

First inspect the current firewall:

    sudo ufw status numbered

Only after review:

    sudo ufw allow 8189/udp comment 'IoT MediaMTX WebRTC ICE'

Do not add public allow rules for:

    9997/tcp
    8554/tcp
    8888/tcp
    8889/tcp

## Failure behavior

If direct UDP ICE connectivity is unavailable, the web
application can fall back to authenticated HLS through the
existing HTTPS connection.

This fallback does not justify exposing MediaMTX HLS or
WebRTC HTTP listeners directly to the public network.
