# PR #16 — API and device security hardening

Date: 2026-08-22

## Why

The authenticated device and telemetry foundations are now complete,
but several generic HTTP attack surfaces remained:

- no explicit JSON body-size ceiling;
- no route-specific request throttling;
- public auth accepted unbounded inputs;
- email identity was not normalized;
- new passwords had no minimum length policy;
- device metadata accepted unbounded values;
- unhandled application errors could fall through to Express defaults;
- registration logged serialized exception detail;
- an unused unauthenticated WebSocket listener was active.

## Request boundaries

Global JSON body limit:

- 16 KiB
- strict JSON mode

Authentication:

- email normalized with trim + lowercase;
- email maximum 254 characters;
- new password minimum 12 characters;
- password maximum 128 characters;
- existing shorter passwords remain valid for login compatibility;
- public role input remains ignored;
- user email lookup is case-insensitive.

Device metadata:

- name maximum 100 characters;
- type maximum 64 characters;
- both reject control characters;
- metadata is trimmed before persistence;
- empty metadata updates are rejected;
- status remains telemetry-derived and cannot be manually written.

## Rate limits

Broad `/api` abuse ceiling:

- 20,000 requests / 15 minutes / client IP

Authentication:

- login: 20 failed/non-success requests / 15 minutes / IP;
- register: 10 requests / hour / IP.

Authenticated user traffic:

- reads: 600 / 15 minutes / authenticated user;
- mutations: 120 / 15 minutes / authenticated user.

Authenticated device telemetry:

- 300 telemetry events / minute / authenticated device.

The broad IP ceiling is deliberately high so multiple legitimate IoT
devices behind one NAT are not constrained before device authentication.

## Proxy policy

`trust proxy` is narrowed from unrestricted trust to one reverse-proxy
hop.

Production continues to bind the Node API to loopback.

## Error handling

Adds deterministic JSON responses for:

- oversized body: HTTP 413;
- malformed JSON: HTTP 400;
- unknown route: HTTP 404;
- unexpected server failure: HTTP 500.

Unexpected error logs contain method, path and error class only.
Request bodies, credential values and raw database error messages are
not serialized.

## WebSocket surface

The unused `ws` listener is removed.

The unused direct `ws` and `@types/ws` npm dependencies are also
removed. A future authenticated realtime transport should be introduced
as a separately designed feature rather than inheriting this empty,
unauthenticated listener.

## Frontend

Registration now communicates the 12-character password policy and
bounds email/password input lengths.

HTTP 429 authentication errors receive an explicit user-facing message.

## Database

No schema migration.

All existing five migrations remain unchanged.

## Verification

- TypeScript build;
- focused security-hardening tests;
- registration role regression;
- auth identity regression;
- no-custom-token regression;
- device credential regressions;
- telemetry ingestion regressions;
- presence regressions;
- telemetry read contract regressions;
- migration-only ownership regression;
- frontend production build;
- GitHub Actions fresh PostgreSQL migration/read/rollback/reapply gate.

## Deferred

- dependency modernization / CRA replacement;
- password reset / email verification;
- account lockout or distributed rate-limit storage;
- authenticated realtime transport;
- legacy status-column removal;
- production deployment, handled only after PR #17.
