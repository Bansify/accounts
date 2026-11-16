# Accounts Android app: copy-paste implementation prompt

Paste the text below into the coding agent working in the actual Accounts Android
repository. This prompt does not assert that its source has already been reviewed.
Do not run it in the Accounts web/Worker repository.

---

Work only in this Accounts Android repository. First read its engineering guidance,
README, build configuration and existing authentication/network/storage code. Identify
the actual application ID, supported Android versions, current OAuth implementation,
release-signing configuration and existing account chooser before editing. Preserve
existing UI and conventions. All UI, comments, tests and documentation must be English.
Do not deploy a backend, apply remote SQL, change DNS/secrets, publish an APK, merge a
PR, modify sibling repositories or create/commit signing keys without separate approval.

## Goal and authoritative contract

Integrate the first-party Accounts backend, not Google/GMS-dependent authentication.
The authoritative contract in GothwadTech/accounts is `docs/NATIVE_ACCOUNTS.md`, with
migration `migrations/0014_first_party_native.sql`. Read those exact current files
before implementing; do not infer undocumented routes or claim the backend is deployed.
If the repository is unavailable, ask for those files rather than guessing.

Expected public OAuth registration:
- client_id: `gothwad-accounts-android`
- Android package: `com.gothwad.accounts`
- verified HTTPS callback: `https://accounts.gothwadtech.com/oauth/callback`
- registered fallback: `com.gothwad.accounts:/oauth/callback`
- supported scopes: `profile email offline_access drive.read account.read account.profile.write`
- API base: configurable `https://accounts.gothwadtech.com/api`, subject to verified
  production routing. The backend also supports API-domain OAuth routes; use one
  configured base without duplicating or discarding `/api`.

If this app has a different existing application ID or incompatible signing setup,
report the mismatch before renaming it or assuming the registration matches.

## Implement browser OAuth safely

1. Use the system browser/Custom Tabs, Authorization Code and mandatory S256 PKCE.
   Never use a password-collecting native screen or embedded WebView as the identity
   provider. No client secret, Turnstile secret or JWT signing secret belongs in an APK.
2. Generate cryptographically random state/verifier per attempt. Keep them private,
   isolated by attempt, and safe across activity recreation. Expire old attempts and
   consume successful callbacks exactly once. Match the expected callback precisely;
   reject missing/wrong state, malformed/unsolicited/replayed callbacks and code errors.
3. Open `/oauth/authorize` with response_type=code, client_id, exact redirect_uri,
   requested scopes, state, code_challenge and code_challenge_method=S256. Exchange
   the code at `/oauth/token` using the same redirect and verifier. Do not request
   unsupported scopes or silently escalate a previously granted scope set.
4. Preserve the browser's explicit account chooser/Add account and any existing
   account-selection contracts. Do not infer the selected account from an email label.
   Use returned immutable `sub` as the local account identity, not primary email.
5. Turnstile is handled in interactive Accounts browser pages. Native refresh uses
   the server-verified authorization chain; do not put a Turnstile bypass or embedded
   secret in Android. `invalid_grant` on an old chain requires fresh browser authorization.

## Integrate native screens and safe storage

- Fetch identity via `/oauth/userinfo`. Request profile/email/offline_access for basic
  login; request account.read/account.profile.write explicitly when implementing the
  respective account-management functionality. Treat missing optional data truthfully.
- Native APIs require the Accounts Android audience and bearer token:
  GET `/mobile/sessions`, `/mobile/activity`, `/mobile/authorizations` with account.read;
  POST `/mobile/sessions/revoke-others`, `/mobile/authorizations/revoke` and PATCH
  `/mobile/profile` with account.profile.write. Paths are relative to the configured API base.
- PATCH allows only first_name, last_name, date_of_birth and gender, with the backend's
  exact validation rules. Password/phone/recovery/MFA/passkey/account-delete actions
  remain web flows with fresh verification. Do not emulate those changes locally.
- Clearly distinguish web sessions, service grants and this app's selected account.
  revoke-others signs out other web sessions, not every installed Android app.
- Store refresh credentials using Android Keystore-backed encryption, excluded from
  backup/export, not plain SharedPreferences/DataStore. Never put tokens in logs,
  crash reports, URLs, intents to arbitrary apps, analytics or clipboard. Keep access
  tokens in memory where practical. Do not expose account credentials through IPC.
- Refresh must be single-flight per account. Persist the newly rotated refresh token
  safely before reusing the chain. Never blindly retry a consumed old refresh token.
  On invalid_grant, clear the affected credentials and require authorization again.
- Keep network authentication scoped to the configured API origin. External images,
  downloads and redirects must never receive the Accounts bearer. Do not attach it
  globally to every OkHttp request. Cancellation/retries must not select another account.
- For explicit disconnect, POST `/oauth/revoke` with bearer and form client_id/token/
  optional token_type_hint. It revokes the entire user/client grant, not just one
  Android installation. Explain this before presenting it as local-only sign-out.
  Offline local removal is distinct and must not be reported as server revocation.

## Release App Links and trusted-app boundary

- Add exact HTTPS App Link intent handling with autoVerify. Retain a registered
  custom-scheme fallback only if needed and clearly document interception risk.
- Inspect release signing without generating/replacing a key. Report the package,
  certificate SHA-256 and exact assetlinks JSON needed by the Accounts host. Use only
  actual release fingerprints; do not register debug fingerprints or ask for keystore
  passwords/private keys in chat. If the release identity is absent, report it as blocked.
- `/apps/trusted` is discovery, not APK authentication. Unsigned responses and empty
  cert lists cannot authorize a broker. For optional signed policy, pin independently
  provisioned public keys and verify JWS algorithm, key ID, issuer, expiry and payload.
- Do not claim cross-app account sharing is implemented merely by sharing a UI library,
  browser cookies, a package string or the same AccountManager type.

## Cross-app account discovery: research gate, not a guessed implementation

The desired future behavior is: Mail can work alone and add A/B; Drive installed later
can discover those accounts; C added in Drive becomes available to other official apps;
Accounts installed later discovers existing accounts. Accounts APK and GMS must not
be mandatory. Account availability, selected account per app and service consent are
three separate concepts; shared availability must not grant new sensitive scopes.

Do not implement an unproven duplicate-authenticator/broker architecture in this task.
First identify Android platform restrictions and demonstrate authenticator ownership,
same-signer trust, independently installed apps, installation order, owner uninstall,
reinstall and failover on supported Android versions. If that cannot be demonstrated,
report the gap honestly and propose a separate reviewed design. No credential-sharing
exported service, unrestricted ContentProvider, APK secret, silent scope grant or
fictional `/oauth/handoff` endpoint is allowed. The backend has no handoff endpoint yet.

## Tests and handoff

Run available Gradle build/lint/unit tests and, where possible, emulator/instrumentation
checks for PKCE/state, callback replay, activity recreation, account isolation,
concurrent refresh, rotation persistence failure, invalid_grant, revocation, malformed
userinfo, denied scopes and offline/API failures. Verify external requests and redirects
never receive authorization headers. Report exactly what could not be run.

Deliver changed files, checks/results, a device test checklist and any backend/package/
release-fingerprint prerequisites. Clearly separate implemented local behavior from
production/provider/physical-device verification. Do not publish or merge automatically.
