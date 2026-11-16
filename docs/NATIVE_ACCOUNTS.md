# First-party OAuth and Android Accounts backend

Local implementation on `arena/dbdb9048-accounts`. No remote migration, deployment,
secret change, DNS change, sibling repository edit or Android APK build was performed.

## Trust boundary

OAuth is restricted to operator-approved `ecosystem_apps.first_party = 1` and
`active = 1`. Unknown, unapproved and disabled clients receive HTTP 400
`unauthorized_client` from authorize, decision and token. Userinfo and mobile APIs
also check current approval, grants, credential bindings, password version and expiry.
There is no self-service client registration. A request field cannot approve a client.

**A public client ID, package name, CORS policy or custom URI scheme is not proof of
an official APK.** PKCE protects the authorization response; it does not attest the
caller. Verify release signing certificates locally on Android when trusting another
app. Prefer verified HTTPS App Links. Consider attestation as a separate defense,
not a replacement for user consent or bearer authorization. Public URLs remain callable.

## Registration and migration

The complete migration is [`../migrations/0014_first_party_native.sql`](../migrations/0014_first_party_native.sql).
It adds these columns without rebuilding existing tables:

```sql
ALTER TABLE ecosystem_apps ADD COLUMN first_party INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ecosystem_apps ADD COLUMN android_package TEXT;
ALTER TABLE ecosystem_apps ADD COLUMN android_cert_sha256 TEXT NOT NULL DEFAULT '[]';
ALTER TABLE ecosystem_apps ADD COLUMN active INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ecosystem_apps ADD COLUMN allowed_scopes TEXT NOT NULL DEFAULT '[]';
ALTER TABLE oauth_credential_bindings ADD COLUMN bot_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE oauth_credential_bindings ADD COLUMN source_session_id TEXT;
```

Certificate insert/update triggers reject anything except JSON arrays of lowercase
64-hex hashes. The operator must supply **release** fingerprints; the server cannot
infer whether an otherwise valid hash came from a debug or release certificate.
No fingerprints are seeded. `[]` means no Android signing identity has been configured.

The migration and empty-database runtime bootstrap register these seven public clients:

| Client ID | Android package | Allowed scopes (in addition to profile, email, offline_access) |
|---|---|---|
| gothwad-accounts-android | com.gothwad.accounts | drive.read, account.read, account.profile.write |
| gothwad-accounts-sample-alpha | com.gothwad.accounts.sample.alpha | None |
| gothwad-accounts-sample-beta | com.gothwad.accounts.sample.beta | None |
| gothwad-mail | com.gothwad.mail | mail |
| gothwad-drive | com.gothwad.drive | drive, drive.read |
| kiwi-store | com.gothwad.store | None |
| gothwad-tube | com.gothwad.tube | None |

Every package has its exact `<package>:/oauth/callback` URI. Accounts, Mail, Drive,
Kiwi Store and Tube also have `https://<service>.<APP_DOMAIN>/oauth/callback`;
Accounts uses `accounts`, and Kiwi Store uses `kiwistore`. Samples are scheme-only.
`kiwistore://oauth/callback` and previously registered web/native callbacks are retained.
Existing grants, user data, certificate hashes and disabled status are preserved.
The migration explicitly approves these seven rows and clears their old secret hashes
because they are now **public S256 clients**. Audit existing confidential consumers
before rollout: they must support PKCE; do not embed an old secret in an APK.
Other clients default to unapproved, including historical catalog/core-service rows.
`is_verified` and `is_core` alone do not authorize OAuth.

Scope checks reject unknown or unauthorized scopes rather than silently dropping them.
Redirect matching is exact, with no wildcard or DEV_MODE localhost bypass. Registered
loopback HTTP works only in DEV_MODE; production redirects require HTTPS or a
registered custom scheme. Set `OAUTH_CUSTOM_SCHEMES = "false"` after HTTPS migration
if native fallback schemes are no longer needed. Production DEV_MODE remains false.

Runtime seeds run only once, recorded as `14_first_party_native` in
`auth_schema_versions`; later operator deapproval is not silently undone.

### Migration order and exact commands

**These are review instructions, not permission to run remote operations.**
Existing databases must have schema 00–13 before applying migration 14, **before**
deploying this Worker. Older databases are not silently altered by runtime PRAGMA,
introspection or opportunistic ALTER TABLE. `sql/00`–`05` remain unchanged/idempotent.
Wrangler now uses `migrations_dir = "../migrations"`; this directory starts at 14
and does not replace the historical SQL setup instructions for 00–13.

Run from the repository root against an existing **local** schema 00–13 database:

```sh
npx wrangler d1 migrations list accounts --local --config cloudflare-worker/wrangler.toml
npx wrangler d1 migrations apply accounts --local --config cloudflare-worker/wrangler.toml
npx wrangler deploy --config cloudflare-worker/wrangler.toml --dry-run
```

Wrangler's migration ledger makes repeated `migrations apply` safe. The SQL's ALTER
statements themselves are intentionally one-time; do not paste/replay them twice.
A completely empty local DB can instead bootstrap directly through the Worker, which
already creates the new columns. Do not then apply migration 14 to that new schema.
For a migration rehearsal, initialize legacy SQL first, then apply 14 before starting
the new Worker. Tests exercise both upgrade and empty-database paths using real SQLite.

The checked-in migration targets the configured production domain. Before its **first**
application on a different installation, regenerate from configuration or an explicit domain:

```sh
node --experimental-strip-types tools/generate-first-party-sql.mjs example.com > migrations/0014_first_party_native.sql
```

After separate owner approval, backup, migration review, release-key/Turnstile setup
and coordinated frontend/API routing, the corresponding **remote-only review commands** are:

```sh
npx wrangler d1 migrations list accounts --remote --config cloudflare-worker/wrangler.toml
npx wrangler d1 migrations apply accounts --remote --config cloudflare-worker/wrangler.toml
npx wrangler deploy --config cloudflare-worker/wrangler.toml
```

None of these remote commands was executed. Do not deploy before the prerequisites.
Do not rerun old registration scripts after migration 14: some replace redirect lists.

## Bot controls without APK secrets

Production config sets `TURNSTILE_REQUIRED = "true"`. Configure a public
`TURNSTILE_SITE_KEY` and the private Worker secret `TURNSTILE_SECRET_KEY` for the
Accounts hostname (and API_DOMAIN if authorize is opened directly there) **before release**. Missing keys fail closed with 503; there is
no production fallback or bundled test key. The local harness leaves verification
disabled explicitly by omitting the production setting; bot tests use mocked siteverify.
Actual provider verification was not attempted in the sandbox.

Signin/signup, including `?add=1`, display an ephemeral Turnstile dialog and submit
`turnstile_token`. The consent page displays an authorization widget. The backend
checks provider success, hostname and exact action (`signin`, `signup`, `authorize`).
Tokens are not put in URLs or browser storage. An approval cannot mint a code until
verification succeeds. Merely reading authorize or cancelling does not mint credentials.
The account chooser, explicit Add account, displayed scopes, state, redirect and S256
are preserved; **consent auto-skip is not implemented**.

The successful interactive check is stored on the code binding and inherited by
access/refresh bindings atomically. Token exchange never trusts a caller's proof flag.
With enforcement enabled, pre-existing unverified code/refresh chains require fresh
browser authorization (`invalid_grant`); established verified refresh chains do not
need Turnstile, a browser cookie, a client secret, GMS or the Accounts APK installed.
Google OIDC/MFA/passkey proofs retain their existing separate checks and limits.

Persistent edge-IP limits: signin 60/10 minutes; signup 10/hour; authorize/decision
share 30/minute; token 120/minute; revoke 30/minute; mobile 60/minute. Missing edge IPs
share a bucket; X-Forwarded-For cannot choose a bucket. These are fixed-window D1
controls, not a distributed-bot defense or availability guarantee. Review edge/WAF
controls and shared-NAT limits separately; no such remote rules were changed here.

## Bearer contract and mobile endpoints

Access tokens must be `oauth_access`, signed, unexpired, from AUTH_HUB_URL, with
`aud == client_id`, a live `oauth_credential_bindings` entry and the current grant/password.
Session JWTs, cookie-only requests and revoked grants cannot authorize native APIs.

`GET /oauth/userinfo` preserves existing sub/profile/email/drive fields. `profile`
adds given_name, family_name and created_at alongside name/preferred_username/picture/
updated_at. `email` derives the primary address from username and APP_DOMAIN. Drive
usage is returned only for drive/drive.read; write_access requires drive. Only approved
first-party `account.read` exposes phone/recovery address verification, DOB/gender and security
session/grant/passkey counts, has_password, last recorded password_changed_at and mfa_enabled. Phone verification is
reported false because no verified-phone ledger exists; recovery presence is not proof.
No password hashes, OTP seeds, recovery codes, passkey keys or OAuth credentials are emitted.

All routes below require first-party **gothwad-accounts-android audience**, plus:

| Endpoint | Scope | Result / restrictions |
|---|---|---|
| GET /api/mobile/sessions | account.read | Up to 100 own web sessions; current marks the authorization's source browser session |
| POST /api/mobile/sessions/revoke-others | account.profile.write | Revoke other web refresh credentials/sessions; preserve original source session if it still exists |
| GET /api/mobile/activity | account.read | Latest 100 own events, no raw user agent |
| GET /api/mobile/authorizations | account.read | Up to 100 own service grants |
| POST /api/mobile/authorizations/revoke | account.profile.write | JSON `{ "app_id": "..." }`; revoke that user's entire target grant, including core grants or itself |
| PATCH /api/mobile/profile | account.profile.write | Only first_name, last_name, date_of_birth, gender |

Names are trimmed, at most 100 characters, no controls or angle brackets; first_name
cannot be empty. DOB must be a real past calendar date from 1900 onward, or an empty
string to clear it. Gender is the existing enum or an empty string to clear it.
Unknown fields and non-string values are rejected. Credential, phone/recovery, MFA,
passkey, username, avatar and account-delete changes stay in existing web fresh-proof
flows. Mutations repeat live credential/password/grant/client checks inside SQL.

Web sessions and OAuth authorizations are distinct. Signing out other web sessions
does not silently revoke unrelated app grants. Native authorization revoke is a
user-initiated service disconnect, not account deletion. Existing web cookie revoke
and its core-service protection remain unchanged. Account credentials are never
shared between apps; this backend does not implement Android AccountManager ownership,
broker failover, installed-account discovery or per-app selected-account storage.

### Native token revocation

`POST /oauth/revoke` accepts a bearer and form `client_id`, `token`, optional
`token_type_hint` (`refresh_token` or `access_token`). The target must belong to
**both the caller's user and client**. Unknown/cross-owner/cross-client/rotated targets
return HTTP 400 `{ "error": "invalid_grant" }`; invalid bearer returns 401.
A successful revocation disconnects the whole user/client grant, atomically invalidating
all its bindings, pending codes and refresh credentials. Another user's/client's
credentials remain valid. Refresh rotation and revocation serialize atomically;
a consumed refresh cannot be reused. Reconsent cannot revive a revoked binding.

## App Links and trusted-app discovery

`GET /.well-known/assetlinks.json` serves the configured `ANDROID_ASSETLINKS_JSON`
or derives the Accounts package's release fingerprints from its active first-party
DB registration. Relation is `delegate_permission/common.handle_all_urls` and target
namespace is `android_app`. Android output uses colon-separated uppercase hashes;
DB/manifest hashes are lowercase without colons. Invalid overrides return 503;
missing fingerprints return `[]`, not a fabricated association.

**Routing is a release prerequisite:** route the exact public Accounts-host
`/.well-known/assetlinks.json` to this Worker, outside `/api/*`, with JSON and no
redirect/auth requirement. No DNS/Worker route was changed here. On Mail, Drive,
Kiwi Store and Tube hosts, their owners must serve equivalent JSON for their own
package/release certs and handle their own HTTPS callbacks. Do not serve the Accounts
package association as a substitute on every sibling host. Samples are scheme-only.

`GET /api/apps/trusted` returns version 1, issuer, issued_at/expires_at (15 minutes),
and active first-party client IDs/packages/release fingerprints. Without a key it
explicitly returns `signed: false`: this must **not** be trusted as signed broker policy.
With private JWK `TRUSTED_APPS_SIGNING_JWK` and public `TRUSTED_APPS_KEY_ID`, it also
returns a compact `jws` (Ed25519/EdDSA or ECDSA P-256/ES256). Configured signing failures
return 503 rather than downgrading. Pin separately distributed public keys in the
consumer, verify the JWS algorithm/key ID/issuer/expiry, and use the signed payload,
not unsigned duplicate JSON fields. Empty certificate lists cannot authorize a broker.

Optional `/oauth/handoff` is deliberately deferred until an Android broker/device
binding design is proven. There is no insecure caller-supplied first_party shortcut.

## Verification

See [the verification report and complete changed-file list](NATIVE_ACCOUNTS_VERIFICATION.md).
Local checks do not certify deployed behavior, real Turnstile delivery, Android App
Link verification, device account ownership/failover or physical-device security.
