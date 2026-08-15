# PR #13 — Telemetry ingestion foundation

Date: 2026-08-22

## Why

PR #12 established device identity but did not provide a data plane.
Physical devices need a credential-authenticated, replay-safe endpoint
before presence and dashboard telemetry can be implemented.

## What

- Add `DeviceTelemetry` migration and model.
- Add `POST /api/telemetry`.
- Require `Authorization: Device ...`.
- Require a UUIDv4 `eventId` for idempotency.
- Reject reuse of an `eventId` with a different payload.
- Store metric/value/unit/recordedAt/receivedAt only.
- Never persist device credentials or credential hashes in telemetry.
- Update `Devices.lastSeenAt` only for accepted telemetry.
- Add PostgreSQL indexes for idempotency and device/time queries.
- Add targeted telemetry route and migration tests.
- Add repository CI for backend regressions, PostgreSQL migration
  up/down/up and frontend production build.

## Explicitly deferred

- Deriving online/offline state from `lastSeenAt`.
- User-facing telemetry query endpoints.
- Dashboard polling and telemetry visualization.
- Rate limiting and broader request-hardening.
- WebSocket/SSE/MQTT transport.

These are separate follow-up PRs so the ingestion contract remains
small and independently reversible.
