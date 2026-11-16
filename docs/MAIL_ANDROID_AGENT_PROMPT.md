# Gothwad Mail Android App (`GothwadTech/mailapp`): Copy-Paste Implementation Prompt

Paste the prompt below into the coding agent working in **`GothwadTech/mailapp`**.
Do not run this prompt inside `GothwadTech/accounts` or `GothwadTech/mail`.

---

Work only in this `GothwadTech/mailapp` repository on the active session branch. First read `README.md`, `gradle/libs.versions.toml`, `app/build.gradle.kts`, `app/src/main/AndroidManifest.xml`, and every file under `app/src/main/java/com/gothwad/mail/` before editing. Also inspect `GothwadTech/accountsapp` (`core/src/main/java/com/gothwad/accounts/core/*` and `.github/workflows/release.yml`) and `GothwadTech/mail` (`worker/src/*`) read-only if accessible so your OAuth, peer-broker discovery, and Mail API contracts match 100%.

All UI strings, code comments, tests, and documentation must be in 100% pure English. Preserve the existing Material 3 visual design, adaptive two-pane tablet layout, drawer/bottom navigation, and theme preferences while replacing the seeded prototype data with real Gothwad Accounts OAuth + Gothwad Mail Worker integration.

## 1. Authoritative Contracts (`GothwadTech/accounts` & `GothwadTech/mail`)

### A. Gothwad Accounts OAuth 2.0 + PKCE (`S256`) Registration
- **Application ID / Package**: `com.gothwad.mail`
- **`client_id`**: `gothwad-mail` (public first-party client, no client secret)
- **Registered `redirect_uri`s**:
  - Custom scheme (default/fallback): `com.gothwad.mail:/oauth/callback`
  - Verified HTTPS App Link: `https://mail.gothwadtech.com/oauth/callback`
- **Allowed Scopes**: `profile email offline_access mail`
- **Accounts API Base**: `https://accounts.gothwadtech.com/api`
  - Authorize (Custom Tabs): `GET https://accounts.gothwadtech.com/api/oauth/authorize` (`response_type=code`, `client_id=gothwad-mail`, `redirect_uri`, `scope=email mail offline_access profile`, `state`, `code_challenge`, `code_challenge_method=S256`, optional `login_hint=<username>`)
  - Add/Choose Account in Custom Tabs: `https://accounts.gothwadtech.com/signin?choose=1&next=<encoded_authorize_url>`
  - Token Exchange & Refresh: `POST https://accounts.gothwadtech.com/api/oauth/token` (`grant_type=authorization_code` with `code`, `code_verifier`, `redirect_uri`, `client_id=gothwad-mail`; or `grant_type=refresh_token` with `refresh_token`, `client_id=gothwad-mail`)
  - UserInfo: `GET https://accounts.gothwadtech.com/api/oauth/userinfo` (`Authorization: Bearer <access_token>`) -> returns `sub`, `preferred_username`, `name`, `given_name`, `family_name`, `email`, `picture`, `client_id`, `scopes`
  - Server Grant Revoke: `POST https://accounts.gothwadtech.com/api/oauth/revoke` (`Authorization: Bearer <access_token>`, form `client_id=gothwad-mail`, `token=<refresh_or_access_token>`)

### B. Gothwad Mail Worker REST API (`https://mail.gothwadtech.com/api`)
Every request to `https://mail.gothwadtech.com/api/*` sends `Authorization: Bearer <access_token>` and `Accept: application/json` (never attach the Bearer token to any other host or external image/attachment URL):
- `GET /api/session`: returns `{ authenticated: true, user: { username, email, name, firstName, lastName, avatarUrl }, unread: { [username]: number }, limits: { dailySendLimit, sendRemainingToday } }`
- `GET /api/mail/settings`: returns `{ retentionLimit: 500 | 1500 | 0, storageQuotaBytes, storageUsedBytes, totalMessages, starredMessages, updatedAt }`
- `PATCH /api/mail/settings`: body `{ retentionLimit: 500 | 1500 | 0 }`
- `GET /api/mail/messages?folder=inbox|starred|sent|drafts|trash&limit=50&before=<iso>` (plus optional `&q=<search>&unread=1&starred=1&hasAttachment=1`): returns `{ messages: ApiMessage[], folder, nextBefore: string | null }` where each `ApiMessage` has `{ id, folder, from: { name, email }, to: string[], cc: string[], bcc: string[], subject, snippet, receivedAt, isRead, isStarred, attachments: [{ name, type, size }] }`
- `GET /api/mail/messages/:id` (supports `If-None-Match: <etag>` -> `304 Not Modified`): returns `{ message: ApiMessage & { bodyText: string, bodyHtml: string | null } }` plus `ETag` response header
- `PATCH /api/mail/messages/:id`: body `{ isRead?: boolean, isStarred?: boolean, moveToTrash?: true, moveToInbox?: true }` -> returns `{ message: ApiMessage }`
- `POST /api/mail/messages/batch`: body `{ ids: string[], isRead?: boolean, isStarred?: boolean, moveToTrash?: boolean, moveToInbox?: boolean, deleteFromTrash?: boolean }` -> returns `{ ok: true, updated: number }`
- `DELETE /api/mail/messages/:id`: permanently deletes a message in `trash` -> `{ ok: true }`
- `DELETE /api/mail/trash`: permanently empties all messages in `trash` -> `{ ok: true, deleted: number }`
- `POST /api/mail/drafts`: body `{ id?: string | null, to: string[], cc: string[], bcc: string[], subject: string, body: string }` -> returns `{ message: ApiMessage }`
- `DELETE /api/mail/drafts/:id`: deletes a draft -> `{ ok: true }`
- `POST /api/mail/send`: body `{ to: string[], cc?: string[], bcc?: string[], subject: string, body: string, draftId?: string }` -> returns `201 { id: string | null, sent: true, saved: boolean, remainingToday: number }` (or `429 daily_limit`, `503 sending_not_configured`)

## 2. Step-by-Step Implementation Requirements

### Step 1: Dependencies, Manifest, Permissions & Release Signing (`gradle/libs.versions.toml`, `app/build.gradle.kts`, `AndroidManifest.xml`, `.github/workflows/release.yml`)
1. In `gradle/libs.versions.toml` and `app/build.gradle.kts`, add:
   - `androidx.browser:browser` (Custom Tabs)
   - `androidx.security:security-crypto` (EncryptedSharedPreferences / MasterKey for token storage)
   - `com.squareup.okhttp3:okhttp` (HTTP client)
2. In `app/build.gradle.kts`:
   - Set `manifestPlaceholders["gothwadRedirectScheme"] = "com.gothwad.mail"`.
   - Enable `buildConfig = true` under `buildFeatures`.
   - **Fix release signing**: remove `signingConfig = signingConfigs.getByName("debugConfig")` from the `release` buildType so release builds are never signed with the debug key.
   - Add `.github/workflows/release.yml` (matching `GothwadTech/accountsapp/.github/workflows/release.yml`) so GitHub Actions builds Release APK, Debug APK, and Play Store AAB and signs the Release APK/AAB using `RELEASE_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, and `KEY_PASSWORD`.
3. In `app/src/main/AndroidManifest.xml`:
   - Add `<uses-permission android:name="android.permission.INTERNET" />`.
   - Set `android:allowBackup="false"` and `android:usesCleartextTraffic="false"` on `<application>`.
   - Add `<queries>` for `https` VIEW intents, `android.support.customtabs.action.CustomTabsService`, and sibling Gothwad packages: `com.gothwad.accounts`, `com.gothwad.mail`, `com.gothwad.drive`, `com.gothwad.store`, `com.gothwad.tube`, `com.gothwad.accounts.sample.alpha`, `com.gothwad.accounts.sample.beta`.
   - Register `AccountCallbackActivity` (`android:exported="true"`, `android:excludeFromRecents="true"`) with intent filters for:
     - `<data android:scheme="${gothwadRedirectScheme}" android:path="/oauth/callback" />`
     - `<intent-filter android:autoVerify="true">` for `https://mail.gothwadtech.com/oauth/callback`.
   - Register `AccountDirectoryProvider` (`android:authorities="${applicationId}.gothwad.account.directory"`, `android:exported="true"`) for mutual certificate-verified peer account discovery across installed Gothwad apps.

### Step 2: Implement OAuth 2.0 + S256 PKCE, Encrypted Multi-Account Session Store & Peer Broker Discovery (`com.gothwad.mail.auth.*`)
Implement the native Gothwad auth & peer discovery layer (aligned with `GothwadTech/accountsapp/core`):
1. **`Pkce` & `CallbackValidator`**:
   - Cryptographically random 64-byte `code_verifier` (`S256` challenge) and 24-byte `state` per login attempt, persisted across process death in encrypted storage, consumed once, expiring after 10 minutes.
   - `CallbackValidator` strictly validates scheme, authority, path (`/oauth/callback`), constant-time `state` match, and `code` vs `error`.
2. **`EncryptedTokenStore` & `MailAuthSessionManager`**:
   - Key accounts by immutable `userId` (`sub` from `/oauth/userinfo`), storing `userId`, `username`, `email`, `displayName`, `avatarUrl`, `accessToken`, `refreshToken`, `expiresAt`, `addedAt`, `lastSeenAt`, and `deviceRemovalTombstones`.
   - Single-flight per-account token refresh (`Mutex` per `userId`): automatically refresh when `expiresAt - now <= 60_000`. Persist rotated `refresh_token` atomically. On `400 invalid_grant` or `401 invalid_token`, mark/remove the invalid credential and prompt re-authentication.
   - Support three distinct sign-out actions:
     - **Sign out of Mail (`revokeOnServer = false`)**: removes local tokens from Mail only.
     - **Disconnect Mail grant on server (`revokeOnServer = true`)**: calls `POST /api/oauth/revoke` before removing local tokens.
     - **Remove account from device**: records a tombstone and broadcasts `notifyAccountRemoved` to verified sibling Gothwad apps via `PeerBrokerClient`.
3. **Mutual Certificate-Verified Peer Account Discovery (`AccountDirectoryProvider`, `PeerBrokerClient`, `TrustVerifier`)**:
   - Implement the exact ContentProvider protocol (`method = "list_accounts"` and `method = "notify_account_removed"`, `protocolVersion = 1`) from `GothwadTech/accountsapp/core/src/main/java/com/gothwad/accounts/core/broker/`.
   - Verify both caller and target APK signing certificates (`TrustVerifier.SameSigningCertificate` with `allowDebugBuild = BuildConfig.DEBUG`, plus support for the production release certificate SHA-256 `504e2fc78ab68e018b848fc102762e4499a08803412e66a40b2b09403c6149b6`).
   - Never expose access or refresh tokens over IPC—only non-secret directory records (`userId`, `username`, `name`, `email`, `avatarUrl`, `addedAt`, `lastSeenAt`) and tombstones.
   - When an account is discovered from another installed Gothwad app (e.g., `com.gothwad.accounts`, `com.gothwad.drive`, `com.gothwad.store`) that is not yet signed in to Mail, display it in the Signed-Out screen and in `AccountSwitcherDialog` under **"Available on this device"**. Tapping it launches `signIn(activity, loginHint = discovered.username)` so the user authorizes `gothwad-mail` in one tap.

### Step 3: Remove Demo `SeedData` from Production & Wire Real Mail Worker Sync (`MailRepository`, `MailDao`, `MailDatabase`, `MailViewModel`)
1. **Zero Demo Data in Production**:
   - Remove automatic `SeedData.initialAccounts()` and `SeedData.initialThreads()` seeding from `MailRepository.ensureSeeded()`.
   - When `accounts` is empty (no signed-in Gothwad account), `MainActivity` / `MailNavGraph` must display a clean Material 3 **Signed-Out / Welcome to Gothwad Mail** screen showing:
     - Gothwad Mail branding and subtitle (`"Sign in with your Gothwad Account to read and send email"`),
     - Any **Discovered Accounts on this device** (from `PeerBrokerClient`) as one-tap cards (`"Continue as <Name> (<username>@gothwadtech.com)"`),
     - Primary **"Sign in with Gothwad"** button (opens Custom Tabs `/api/oauth/authorize`),
     - **"Use another account"** button (opens Custom Tabs `/signin?choose=1&next=...`).
2. **Per-Account Isolated Room Cache (`MailDatabase` v2)**:
   - Update `EmailThreadEntity` / `MailDao` so every cached message/thread is keyed by `(accountEmail, serverId)` (use the server UUID `id` or a deterministic key per `(accountEmail, serverId)`, plus `etag: String?` and `bodyLoaded: Boolean`).
   - Switching accounts (`switchAccount(email)`) must immediately filter all observed flows (`observeThreadsForAccount(activeEmail)`) so Account A's messages never appear under Account B.
   - Removing/signing out an account deletes that account's cached threads from Room (`deleteAllForAccount(accountEmail)`).
3. **Live Sync & Offline-First Operations in `MailRepository` + `MailViewModel`**:
   - **Folder Sync (`refreshCurrentFolder` / initial load / folder change)**:
     - Map `MailFolder.ALL_INBOXES`, `PRIMARY`, `PROMOTIONS`, `SOCIAL`, `UPDATES`, `IMPORTANT`, `ALL_MAIL` -> server `folder=inbox` (or `folder=all` for `ALL_MAIL`), `STARRED` -> `folder=starred`, `SENT` -> `folder=sent`, `DRAFT` -> `folder=drafts`, `TRASH` -> `folder=trash`.
     - Fetch `GET /api/mail/messages?folder=...` and `GET /api/mail/settings` + `GET /api/session`, upserting into Room for the active account and updating `usedStorageGb` / `totalStorageGb` (convert `storageUsedBytes` and `storageQuotaBytes`—50 MB default—into human-readable MB/GB labels in `AccountSwitcherDialog` and `SettingsScreen`).
   - **Message Detail & ETag (`openThread`)**:
     - When opening a message/thread, if `isRead` is false, optimistically mark it read locally and call `PATCH /api/mail/messages/:id { isRead: true }`.
     - Call `GET /api/mail/messages/:id` with `If-None-Match: <cachedEtag>`. On `200`, store `bodyText`, `bodyHtml`, and the new `ETag` in Room; on `304`, use the cached body in Room without re-downloading.
   - **Mutations & Undo (`toggleStar`, `toggleRead`, `deleteThreads`, `undoLastSwipe`, `emptyTrash`)**:
     - Star/unstar: optimistic Room update + `PATCH /api/mail/messages/:id { isStarred }`.
     - Move to Trash (swipe delete or toolbar delete): optimistic Room update + `PATCH /api/mail/messages/:id { moveToTrash: true }` (or `POST /api/mail/messages/batch` for multi-select).
     - **Undo Swipe**: restores in Room and calls `PATCH /api/mail/messages/:id { moveToInbox: true }`.
     - Permanent delete in Trash / Empty Trash: calls `DELETE /api/mail/messages/:id` or `DELETE /api/mail/trash`.
   - **Compose, Reply, Forward & Drafts (`sendOrScheduleEmail`, `saveDraft`, `deleteDraft`)**:
     - Saving a draft calls `POST /api/mail/drafts { id: serverDraftId, to, cc, bcc: [], subject, body }` and stores the returned server draft UUID in Room.
     - Sending calls `POST /api/mail/send { to, cc, bcc: [], subject, body, draftId: serverDraftId }`, refreshes the `sent` / `inbox` cache, and displays the server message (`"Message sent — X remaining today"` or the exact error on `429 daily_limit` / `503 sending_not_configured`).
   - **Search (`SearchScreen`)**:
     - Filter locally cached threads immediately AND debounce a server search request (`GET /api/mail/messages?q=<query>&unread=...&starred=...&hasAttachment=...`), merging results into the search view.
   - **Account Switcher (`AccountSwitcherDialog.kt`) & Settings (`SettingsScreen.kt`)**:
     - Remove the fake `showAddForm` text-field dialog in `AccountSwitcherDialog.kt`! Tapping **"Add another account"** must launch `GothwadMailAuth.signIn(activity, chooseAccount = true)`.
     - Tapping **"Manage your Gothwad Account"** opens `com.gothwad.accounts` if installed on the device, or `https://accounts.gothwadtech.com/me` via Custom Tabs.
     - Add a **Mailbox Retention** selector (`500 messages`, `1,500 messages`, `Store All (up to 50 MB)`) in `SettingsScreen.kt` wired to `PATCH /api/mail/settings`, plus **Sign out of this account** and **Remove account from this device** actions.

## 3. Verification & Tests Required Before Finishing

Add unit tests under `app/src/test/java/com/gothwad/mail/` covering:
1. `PkceTest` & `CallbackValidatorTest` (S256 vector, state validation, replay rejection, wrong scheme/host/path rejection).
2. `MailAuthSessionManagerTest` (single-flight token refresh, token rotation persistence, `invalid_grant` eviction, local sign-out vs server `POST /oauth/revoke`, peer tombstone propagation).
3. `PeerBrokerDiscoveryTest` (same-signer trust verification, discovering accounts from `com.gothwad.accounts`, never leaking tokens in `DirectorySnapshot`).
4. `MailApiClientTest` & `MailRepositorySyncTest` (Bearer header only sent to `mail.gothwadtech.com`, ETag `If-None-Match` 304 handling, per-account Room isolation, send/draft/trash/restore/batch API mapping).

Run and pass:
```bash
./gradlew testDebugUnitTest assembleDebug
```
Report all changed files, test results, and any remaining manual device check steps clearly.
