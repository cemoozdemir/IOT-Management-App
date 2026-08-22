# PR #14 — Derived device presence

Date: 2026-08-22

## Why

Device status must reflect authenticated physical-device activity,
not a user-controlled toggle or a stale database enum value.

PR #13 records `Devices.lastSeenAt` whenever authenticated telemetry
is accepted. This PR makes that timestamp the sole application-level
source of online/offline presence.

## Presence contract

A device is:

- `online` when its server-generated `lastSeenAt` is no more than
  120 seconds old.
- `offline` when `lastSeenAt` is null, invalid, in the future,
  or older than 120 seconds.

Presence is derived at read time. No scheduler or background status
writer is required.

## Changes

- Add a centralized `deriveDeviceStatus` utility.
- Override the legacy stored status value when devices are serialized.
- New devices are presented as offline until authenticated telemetry.
- Reject user attempts to write `status`.
- Keep device metadata updates limited to metadata fields.
- Remove the frontend status-write API.
- Remove manual Set online / Set offline controls.
- Update dashboard online/offline language.
- Add focused presence and route regression tests.
- Add the presence test to CI.

## Database

No migration is required.

The historical `Devices.status` column is retained temporarily for
rollback compatibility, but application behavior no longer trusts or
mutates it.

A future cleanup migration may remove that legacy storage only after
the telemetry/presence release has been accepted in production.

## Deferred

- automatic frontend polling
- latest telemetry read API
- telemetry visualization
- configurable presence window
- schema removal of the legacy status column

## Regression compatibility correction

The existing device-credential lifecycle test previously modeled
`Device.create()` as a plain object and expected application code to
persist `status: offline`.

PR #14 intentionally removes that write. The fixture now behaves like
a Sequelize instance through `toJSON()` and deliberately exposes a
contradictory legacy stored status while `lastSeenAt` is null.

This verifies both properties:

- device creation no longer writes presence status;
- API serialization ignores legacy stored status and derives the
  returned value from `lastSeenAt`.
