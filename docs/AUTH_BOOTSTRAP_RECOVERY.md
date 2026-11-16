# Browser authentication recovery: migration 14 bootstrap coupling

## Confirmed local defect

PR #31 added migration-dependent first-party triggers and client seed statements to
`getDb()`, the common initializer used by username discovery, password sessions,
Google sign-in, profile routes, internal lookups and avatars.

On an existing database, `CREATE TABLE IF NOT EXISTS` does not add columns. The
owner-provided schema lacked migration 14's ecosystem_apps and credential-binding
columns. The native setup statements then failed in the common bootstrap batch.
`getDb()` translated the failure into `Database temporarily unavailable`, so even
ordinary `/auth/check-identifier` and `/auth/google/start` failed before reaching
their own logic. Each new attempt retried the same failed bootstrap.

A real SQLite fixture using the old tables reproduced the reported username 503
before the fix. This establishes the code defect and matches the supplied schema;
this agent did not inspect production Worker runtime logs or production data, so
it does not independently establish the live deployment revision or every outage cause.
There is no evidence here that accounts were deleted or the database was destroyed.

## Recovery fix

- `getDb()` now initializes only the migration-independent browser authentication
  schema and existing baseline services. It does not run migration-14 client seeds
  or certificate triggers.
- New `getNativeDb()` is used only for `/oauth/*`, `/mobile/*`, `/apps/trusted` and
  `/.well-known/assetlinks.json` routes (with the existing optional `/api` prefix).
- Native setup explicitly checks the required columns in both tables, with no
  PRAGMA, ALTER TABLE, automatic migration or user-data rewrite.
- If columns are missing, only those routes return 503 `migration_required`.
  They never fall back to unapproved OAuth or weaken first-party/PKCE enforcement.
- Native setup failures are not cached. After an authorized migration, native routes
  can recover in the same isolate without taking browser authentication offline.
- Real storage failures remain unavailable errors, not false migration-success results.
- Fresh databases still create the new columns; official clients are initialized
  on the first native/OAuth request, not when someone checks a username.
- Existing credential/password/grant checks, browser slots, Turnstile enforcement,
  Google proof validation and production DEV_MODE=false are unchanged.

This recovery Worker can support the existing browser schema without applying
migration 14 first. Native features still require the reviewed migration. A local
patch does not repair the live service until the matching Worker is released.

## Verification

- New legacy-schema regression initially reproduced the pre-fix 503.
- Six new regressions cover existing-user discovery/password login/session, Google
  start and full callback/account selection (provider HTTP mocked), native fail-closed
  isolation, same-isolate post-migration recovery, partial migration, and native
  persistence failures. OAuth fixtures explicitly initialize the native subsystem
  before changing registrations, rather than relying on incidental browser bootstrap.
- Full suite: **333 passed**. Frontend build, strict Worker TypeScript, Wrangler
  4.162.0 dry-run bundle and whitespace checks passed locally.
- At the local investigation checkpoint, no production requests, remote SQL,
  deployment, cloud setting changes or Git publication were performed. The owner
  subsequently authorized recovery PR publication/merge; TASK.md records its status.

## Production recovery boundaries

1. Obtain approval for releasing this recovery fix. Verify the actual production
   Worker deployment command and deployed revision; a passed Pages build is not
   evidence of a Worker rollout. Do not bypass a new build failure blindly.
2. After the recovery Worker release, verify username discovery, password login,
   Google sign-in and existing sessions. Confirm native routes return migration_required
   until migration 14 is applied. Keep credentials/OTP/token values out of logs and chat.
3. If using rollback instead of the fix, use a verified matching Pages/Worker pair
   from before PR #31. Rolling back only the Worker can leave the new frontend
   requesting `/auth/bot-config` from a backend that does not support it.
4. Do not reset accounts, delete D1, rotate JWT/Google secrets or restore the whole
   database merely to fix missing schema columns. Whole-DB restoration can lose
   later writes and requires a separate recovery plan and authorization.
5. After browser recovery, back up/rehearse and apply migration 14 only with separate
   authorization. Review its public-client secret removal and scope/client policy
   changes. Verify native release fingerprints and App Links separately.
