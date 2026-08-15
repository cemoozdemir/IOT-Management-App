# PR #15 — Telemetry read model and dashboard polling

Date: 2026-08-22

## Why

PR #13 added authenticated device telemetry ingestion.
PR #14 made `lastSeenAt` the source of online/offline presence.

The user-facing dashboard still had no safe telemetry read path and
displayed a transport placeholder.

## Read contract

`GET /api/telemetry/latest`

Authentication:

- user JWT authentication
- never device credential authentication

Ownership:

- telemetry is inner-joined to `Devices`
- only rows whose device belongs to the authenticated `userId`
  are eligible
- the endpoint accepts no arbitrary user or device owner identifier

Selection:

- latest row for each `(deviceId, metric)`
- ordered globally by event time
- response capped at 250 latest device/metric measurements
- a 251st row is fetched only to expose `truncated: true`

Response fields:

- telemetry ID
- device ID
- event ID
- metric
- numeric value
- optional unit
- recordedAt
- receivedAt

No credential material is returned.

## PostgreSQL

Adds:

`device_telemetry_device_metric_recorded_idx`

on:

- deviceId
- metric
- recordedAt DESC
- receivedAt DESC

The migration is transactional and reversible.

## Verification

Tests cover:

- user-auth middleware contract
- ownership SQL predicate
- latest-per-device/metric DISTINCT ON query
- numeric/date serialization
- 250-row response cap
- missing user identity
- reversible index migration
- real PostgreSQL latest-row behavior
- real PostgreSQL cross-user isolation
- all existing telemetry/device/presence/auth/security regressions
- frontend production build

## Dashboard

The dashboard now:

- polls devices and telemetry every 10 seconds
- refreshes presence without page reload
- displays up to eight most recent device/metric values
- keeps old data visible during a temporary telemetry refresh failure
- shows last refresh time
- displays lastSeenAt for devices
- refreshes telemetry immediately after device deletion

## Deferred

- charts and historical ranges
- arbitrary telemetry history pagination
- user-configurable polling interval
- SSE/WebSocket
- alert rules
- telemetry retention policy

## Review correction — deterministic timestamp ties

Remote review identified a deterministic-order edge case when multiple
telemetry rows share identical `recordedAt` and `receivedAt` values.

The latest-read contract now uses `id DESC` as the final stable
tie-breaker:

- inside each `(deviceId, metric)` latest-row selection;
- in the global capped result ordering;
- in the supporting PostgreSQL index.

The real PostgreSQL test includes two temperature events with identical
event and receive timestamps and verifies that the deterministic
higher-ID row is selected.
