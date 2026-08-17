# PR #18 — Legacy PM2 preflight compatibility

Date: 2026-08-22

## Production preflight evidence

After PR #17 merged, `--preflight-only` stopped before any production
mutation.

The following gates had passed:

- `.env.production` owner `root:root`;
- `.env.production` mode `0600`;
- source branch `main`;
- source HEAD matched merged main;
- `origin/main` matched merged main;
- PM2 process was online;
- PM2 script path was the expected production backend.

The failing field was PM2 launch metadata:

`NODE_ENV` was unset.

## Legacy PM2 metadata

The existing application predates the new clean PM2 launcher.

The application independently loads:

`backend/.env.production`

using the application environment loader.

Therefore an unset value in old PM2 launch metadata is not sufficient
evidence that the running Node process lacks configuration loaded
inside the process.

Preflight now accepts:

- PM2 `NODE_ENV=production`;
- PM2 `NODE_ENV` unset as the legacy transition state.

Every explicit non-production value is rejected.

## Canonical environment

If canonical `.env.production` explicitly contains `NODE_ENV`, it must
be `production`.

An unset value is accepted because the new launcher explicitly injects
`NODE_ENV=production`.

## Post-deployment invariant

The new safe launcher still has a strict rule.

After PM2 start, deployment reads PM2 metadata again and requires:

`NODE_ENV=production`

Failure enters the normal deployment failure/rollback path.

## Root Git index incident

The first root `--preflight-only` execution also caused `.git/index` in
the developer checkout to become root-owned.

The index was repaired manually back to `pun:pun`; source files were
unchanged.

The deployment Git wrapper now sets:

`GIT_OPTIONAL_LOCKS=0`

for all Git source reads.

This prevents read-only root Git commands such as `git status` from
performing optional index refresh writes.

## Production

Neither the failed preflight nor this PR performs:

- artifact replacement;
- PM2 restart;
- migration;
- database mutation;
- production secret modification.

## Remote review correction — jq command continuation

Remote patch review identified a shell runtime defect in the new
post-deployment PM2 `NODE_ENV` verification.

The generated command had:

`jq -r --arg app "$PM2_APP"`

on one line without a shell continuation before the jq filter.

Although `bash -n` accepts that syntax, runtime execution would treat
the following filter line as a separate command.

The command now includes the required continuation.

The deployment safety test was extended to:

- require the exact continued jq command shape;
- execute the jq expression against a small representative PM2 JSON
  payload and require `production`.

No production deployment or database mutation occurred.
