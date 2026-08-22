
PR #17 — Safe deploy and rollback foundation

Date: 2026-08-22

Why

The legacy root deploy.sh was destructive and non-reproducible.

It:

deleted every PM2 process;

built in place;

used npm install;

copied secrets into build output;

directly deleted the nginx document root;

had no immutable release SHA;

had no verified database backup;

had no migration gate;

had no rollback record;

had no health-gated failure recovery.

This is not acceptable for the PR12–PR16 production rollout.

New deployment contract

Deployment requires an exact 40-character merged-main SHA.

The source checkout must be:

branch main;

clean;

exactly at the supplied SHA;

equal to origin/main when that remote ref exists.

The deploy artifact comes from git archive, not from arbitrary
working-tree files.

Build

Backend and frontend are built outside the live production directory.

Both use npm ci.

No build happens inside /home/IOT-Management-App.

Secret handling

The canonical production secret remains:

backend/.env.production

Required:

owner root:root;

mode 0600.

The artifact backup explicitly excludes it.

The live secret is copied into the private stage/new artifact only.

PM2 is started from a clean environment so DB/JWT secrets do not need
to be duplicated into PM2 metadata.

Database safety

Before migration:

application artifact is archived;

PostgreSQL custom-format dump is created;

pg_restore -l verifies the dump;

migration status is recorded.

Pending migrations require explicit acknowledgement that the previous
application can run against the forward schema.

Deployment never runs db:migrate:undo.

Switch

The complete next artifact is prepared before migration and before the
live path is changed.

After successful migration:

current production directory is moved aside;

prepared artifact is moved into the canonical path;

only iot-api is replaced in PM2;

other PM2 applications are untouched.

Health

Acceptance requires:

loopback /api/health => 200;

public / => 200;

unauthenticated /api/devices => 401;

public /api/health => 200.

Automatic rollback

If failure occurs after artifact switch, the previous application
artifact is restored automatically.

The forward-migrated database remains untouched.

This is why pending migrations require explicit compatibility review.

Explicit database restore

Database restore is intentionally separate.

It requires:

--confirm RESTORE_PREDEPLOY_DATABASE

The API must already be stopped.

Before destructive schema restore, a second safety dump of the current
database is created and verified.

The database restore tool never restarts the API automatically.

CI

PR #17 adds static operational safety gates covering:

shell syntax;

immutable SHA requirement;

git archive;

npm ci;

verified PostgreSQL backup;

explicit migration acknowledgement;

no pm2 delete all;

no nginx-root destructive deletion;

no automatic migration down;

no automatic database restore;

safety dump before explicit destructive DB restore;

secret-log guardrails.

Production

This PR does not deploy anything.

Production deployment occurs only after PR #17 itself is reviewed,
merged, and the merged-main SHA is pinned.

## Development-script recovery correction

The initial PR generator stopped before modifying CI because the local
Python patch block had an indentation error.

No commit, push, pull request, database mutation, or production
deployment occurred before that failure.

The recovery also corrected two shell-safety issues found during review:

- default-value parameter expansions are now runtime-safe single-line
  `${VAR:-default}` expressions;
- safety-test grep patterns beginning with `--` use explicit `grep --`
  option termination.

A static guard now rejects multiline `${` parameter expansions in the
deployment runtime scripts.

## Safety-gate scope correction

A development recovery gate initially searched the entire
`ops/deploy` directory for prohibited runtime commands.

That produced a false positive because the operations documentation
mentions `pm2 delete all` as a forbidden command and the safety test
contains the corresponding failure message.

Negative command checks are therefore intentionally scoped to the
executable deployment, rollback and database-restore runtime scripts.
Documentation and the test implementation itself are not executable
deployment surfaces.

## Remote review correction — serialized recovery and backup integrity

Remote patch review found that deployment used a mutation lock while
standalone artifact rollback and explicit database restore did not.

All three production-mutating workflows now share:

`/run/lock/iot-management-app-deploy.lock`

Recovery validation was also strengthened:

- artifact rollback verifies its recorded SHA256 before extraction;
- database restore verifies its recorded dump SHA256 before destructive
  work;
- database restore validates backup-manifest production-path
  provenance;
- rollback loopback health derives the API port from the canonical
  production environment.

No production deployment or database mutation occurred during this
review correction.
