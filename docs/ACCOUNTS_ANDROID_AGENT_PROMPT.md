# Bansify Accounts Android (`Bansify/accountsapp`) — Native Auth, Zero-Browser SSO & Full Native Management Prompt

> **How to use:** Copy and paste the prompt below into the Arena coding agent working inside **`Bansify/accountsapp`**.

---

```markdown
You are working inside `Bansify/accountsapp` (`com.gothwad.accounts`).

## Standing Rules
1. **100% Pure English** across all Kotlin code, Compose UI, strings, comments, tests, and docs.
2. **Preserve Everything That Currently Works:** Keep the existing Browser / Chrome Custom Tabs OAuth 2.0 + S256 PKCE flow (`GothwadAccounts.signIn` / `OAuthClient`), existing `TokenStore`, `AccountDirectoryProvider` query cursor, `PeerBrokerClient`, and existing tests working as a secondary fallback (`signInWithBrowser`).
3. **Upgrade to 100% Native Direct Worker Authentication, Zero-Browser Cross-App Silent SSO, and 100% Native Account & Security Management:**
   - Do **not** force users into a web browser for sign-in, sign-up, password reset, profile photo, phone number, recovery email, password change, 2-Step Verification (TOTP MFA), session revocation, data export, or account deletion.
   - Connect directly to the Cloudflare Worker JSON API at `https://accounts.bansify.com/api` via `OkHttp`.

---

## 1. Direct Native Android Authentication (`/api/mobile/auth/*` — Zero Browser Required)

The `Bansify/accounts` Cloudflare Worker (`https://accounts.bansify.com/api`) now provides cookie-free, direct JSON authentication endpoints for official first-party Android clients (`client_id = "gothwad-accounts-android"`, `scope = "profile email offline_access drive.read account.read account.profile.write"`):

1. **`POST /api/mobile/auth/check-identifier`**
   - Request JSON: `{ "identifier": "<username | email | phone>" }`
   - Response JSON (`200`): `{ "ok": true, "exists": true, "kind": "username" | "email" | "phone", "error"?: "..." }`
2. **`POST /api/mobile/auth/check-username`**
   - Request JSON: `{ "username": "<desired_username>" }`
   - Response JSON (`200`): `{ "ok": true, "available": true, "valid": true, "username": "...", "email": "...@bansify.com", "error"?: "..." }`
3. **`POST /api/mobile/auth/signin`**
   - Request JSON:
     ```json
     {
       "client_id": "gothwad-accounts-android",
       "scope": "profile email offline_access drive.read account.read account.profile.write",
       "identifier": "<username | email | phone>",
       "password": "<password>"
     }
     ```
   - Response JSON (`200` when MFA is not enabled):
     ```json
     {
       "ok": true,
       "access_token": "<oauth_access_jwt>",
       "refresh_token": "<oauth_refresh_token>",
       "token_type": "Bearer",
       "expires_in": 900,
       "scope": "profile email offline_access drive.read account.read account.profile.write",
       "client_id": "gothwad-accounts-android",
       "session_id": "<session_id>",
       "user": { "id": "...", "username": "...", "email": "...", "first_name": "...", "last_name": "...", "avatar_url": "..." }
     }
     ```
   - Response JSON (`202` when 2-Step Verification is enabled):
     ```json
     {
       "ok": true,
       "mfa_required": true,
       "challenge": "<64-char-hex-challenge>",
       "expires_in": 300,
       "message": "Enter an authenticator code or an unused recovery code."
     }
     ```
4. **`POST /api/mobile/auth/signin/mfa`**
   - Request JSON:
     ```json
     {
       "client_id": "gothwad-accounts-android",
       "scope": "profile email offline_access drive.read account.read account.profile.write",
       "challenge": "<64-char-hex-challenge>",
       "code": "<6-digit-totp-or-recovery-code>"
     }
     ```
   - Response JSON (`200`): Same token + user payload as `POST /api/mobile/auth/signin`.
5. **`POST /api/mobile/auth/signup`**
   - Request JSON:
     ```json
     {
       "client_id": "gothwad-accounts-android",
       "scope": "profile email offline_access drive.read account.read account.profile.write",
       "first_name": "...",
       "last_name": "...",
       "username": "...",
       "password": "...",
       "recovery_email": "...",
       "phone_number": "...",
       "date_of_birth": "YYYY-MM-DD",
       "gender": "Male" | "Female" | "Other" | "Prefer not to say" | ""
     }
     ```
   - Response JSON (`201`): Same token + user payload as `POST /api/mobile/auth/signin`.
6. **`POST /api/mobile/auth/forgot-password` & `POST /api/mobile/auth/reset-password`**
   - `forgot-password` Request: `{ "username": "<username>" }` -> `{ "ok": true, "message": "..." }`
   - `reset-password` Request: `{ "token": "<reset_token>", "password": "<new_password>" }` -> `{ "ok": true, "message": "..." }`

### What to implement in `core/` and `ui/`:
- Add these methods to `MobileAccountClient.kt` and expose suspend functions on `SessionManager` / `GothwadAccounts` / `AccountSessionController` / `AccountDashboardViewModel`.
- When `signin`, `signin/mfa`, or `signup` succeeds, immediately fetch `/api/oauth/userinfo` with the returned `access_token` (or map the returned `user` + `/oauth/userinfo`) and store the account + tokens in `TokenStore`, setting it as the active account and notifying `AccountDirectoryProvider`!
- In `SignedOutAccountScreen.kt` and the "Add another account" dialog:
  - Make the primary **"Sign in"** action open a **100% Native Jetpack Compose Sign-In / Sign-Up / 2FA / Forgot Password Dialog or Sheet** (Step 1: Identifier or Create Account -> Step 2: Password or Forgot Password -> Step 3: 2FA code if `mfa_required`).
  - Keep **"Sign in with Browser"** as a secondary outlined/text button that triggers the existing Custom Tabs OAuth PKCE flow.

---

## 2. Zero-Browser Automatic Cross-App Silent SSO (`POST /api/mobile/auth/peer-code`)

When a user is signed into `Bansify Accounts` (`com.gothwad.accounts`) or `Bansify Mail` (`com.gothwad.mail`) on the phone, the other app must be able to sign in **automatically in <1 second without opening any browser or permissions screen**:

1. **Server Endpoint (`POST /api/mobile/auth/peer-code`):**
   - Requires `Authorization: Bearer <caller_valid_first_party_access_token>`.
   - Request JSON:
     ```json
     {
       "target_client_id": "gothwad-mail",
       "redirect_uri": "com.gothwad.mail:/oauth/callback",
       "scope": "profile email offline_access mail",
       "code_challenge": "<S256_challenge>",
       "code_challenge_method": "S256"
     }
     ```
   - Response JSON (`200`):
     ```json
     {
       "ok": true,
       "code": "<one-time-pkce-code>",
       "client_id": "gothwad-mail",
       "redirect_uri": "com.gothwad.mail:/oauth/callback",
       "scope": "profile email offline_access mail",
       "expires_in": 300
     }
     ```
2. **Update `AccountDirectoryProvider.kt` (`core/src/main/java/com/gothwad/accounts/core/broker/AccountDirectoryProvider.kt`):**
   - Override `call(method: String, arg: String?, extras: Bundle?): Bundle?`:
     - Verify `TrustVerifier.isTrustedUid(context, Binder.getCallingUid())`. If untrusted, return `Bundle().apply { putBoolean("ok", false); putString("error", "untrusted_caller") }`.
     - Support `method == "issue_peer_code"`:
       - Read `user_id` (or `username`/`email`), `target_client_id`, `redirect_uri`, `scope`, `code_challenge`, and `code_challenge_method` (default `"S256"`) from `extras`.
       - Find the matching local signed-in account in `SessionManager` / `TokenStore`, obtain a fresh valid `access_token` (refreshing via `OAuthClient.refreshToken` if expired), and call `MobileAccountClient.issuePeerAuthCode(...)` (`POST /api/mobile/auth/peer-code`).
       - Return a `Bundle` with `putBoolean("ok", true)`, `putString("code", code)`, `putString("redirect_uri", redirectUri)`, `putString("scope", scope)`. (Never put raw `access_token` or `refresh_token` in the Bundle.)
3. **Update `PeerBrokerClient.kt` & `SessionManager.kt`:**
   - Add `requestPeerAuthCode(authority, userId, targetClientId, redirectUri, scope, codeChallenge): Result<String>`.
   - When the user taps **"Continue as <DiscoveredAccount>"** (or when `GothwadAccounts` initializes with 0 local accounts and discovers a verified peer account on the device), generate an S256 PKCE `(codeVerifier, codeChallenge)`, call `PeerBrokerClient.requestPeerAuthCode(...)` on `content://${discovered.sourcePackage}.accountprovider`, and exchange the returned `code` via `OAuthClient.exchangeCode(...)` (`POST /api/oauth/token`) silently in the background! Fall back to the native Sign-In sheet (pre-filled with `discovered.email`) only if the peer code call fails.

---

## 3. 100% Native Account & Security Management (`/api/mobile/*` — Zero Web Redirects)

Update `MobileAccountClient.kt`, `SessionManager.kt`, `AccountDashboardViewModel.kt`, `PersonalInfoTabScreen.kt`, `SecurityTabScreen.kt`, and `DataPrivacyTabScreen.kt` so every row opens a **native Jetpack Compose dialog/sheet** calling these live Worker endpoints (using `Authorization: Bearer <accessToken>`):

1. **Profile Photo (`POST /api/mobile/avatar` & `DELETE /api/mobile/avatar`):**
   - `POST /api/mobile/avatar` with `{ "image_base64": "data:image/jpeg;base64,...", "mime": "image/jpeg" }` -> `{ "ok": true, "avatar_url": "...", "user": { ... } }`.
   - `DELETE /api/mobile/avatar` -> `{ "ok": true, "avatar_url": null, "user": { ... } }`.
   - In `PersonalInfoTabScreen`, clicking the avatar or "Profile photo" row opens a native dialog with **"Choose photo from device"** (`ActivityResultContracts.PickVisualMedia` / `GetContent("image/*")`, downscaling to `<= 512x512` JPEG and base64-encoding) and **"Remove photo"** (when an avatar is set).
2. **Phone Number (`POST /api/mobile/phone`):**
   - Request JSON: `{ "phone_number": "+91...", "current_password": "...", "mfa_code"?: "..." }` -> `{ "ok": true, "phone_number": "...", "user": { ... } }`.
   - Clicking "Phone number" in `PersonalInfoTabScreen` opens a native Compose dialog to update or clear the phone number.
3. **Recovery Email (`POST /api/mobile/recovery-email/request` & `POST /api/mobile/recovery-email/verify`):**
   - Step 1 (`POST /api/mobile/recovery-email/request`): `{ "recovery_email": "...", "current_password": "...", "mfa_code"?: "..." }` -> `{ "ok": true, "pending": true, "message": "..." }`.
   - Step 2 (`POST /api/mobile/recovery-email/verify`): `{ "token": "<64-char-hex-token>" }` -> `{ "ok": true, "recovery_email": "...", "recovery_email_verified": true }`.
   - Clicking "Recovery email" in `PersonalInfoTabScreen` or `SecurityTabScreen` opens a native 2-step Compose dialog.
4. **Password Change (`POST /api/mobile/password`):**
   - Request JSON: `{ "current_password": "...", "new_password": "...", "mfa_code"?: "..." }` -> `{ "ok": true, "message": "..." }`.
   - Clicking "Password" in `SecurityTabScreen` opens a native Compose dialog to change (or add) the account password without signing out the current Android app.
5. **2-Step Verification / Authenticator (`GET /api/mobile/mfa/status`, `POST /api/mobile/mfa/enroll`, `POST /api/mobile/mfa/confirm`, `POST /api/mobile/mfa/recovery-codes`, `POST /api/mobile/mfa/disable`):**
   - `GET /api/mobile/mfa/status` -> `{ "ok": true, "enabled": true|false, "enrollment_available": true|false, "recovery_codes_remaining": 10 }`.
   - `POST /api/mobile/mfa/enroll` (`{ "current_password": "..." }`) -> `{ "ok": true, "enrollment_id": "...", "secret": "...", "otpauth_uri": "..." }`.
   - `POST /api/mobile/mfa/confirm` (`{ "current_password": "...", "enrollment_id": "...", "code": "123456" }`) -> `{ "ok": true, "recovery_codes": ["..."] }`.
   - `POST /api/mobile/mfa/recovery-codes` (`{ "current_password": "...", "code": "123456" }`) -> `{ "ok": true, "recovery_codes": ["..."] }`.
   - `POST /api/mobile/mfa/disable` (`{ "current_password": "...", "code": "123456" }`) -> `{ "ok": true }`.
   - Clicking "2-Step Verification" in `SecurityTabScreen` opens a native Compose management dialog/sheet (showing secret key + "Copy key" + "Open Authenticator App" `Intent(Intent.ACTION_VIEW, Uri.parse(otpauthUri))` + 6-digit confirmation + backup codes display/copy + disable).
6. **Individual Session Revocation (`POST /api/mobile/sessions/revoke`):**
   - Request JSON: `{ "session_id": "..." }` -> `{ "ok": true, "revoked": 1 }`.
   - Add a native "Sign out" button on each non-current session row in `SecurityTabScreen`.
7. **Export Account Data (`GET /api/mobile/export`):**
   - Returns the user's JSON archive (`export`, `version`, `generated_at`, `profile`, `sessions`, `connected_apps`, `recent_activity`).
   - Clicking "Export your account data" in `DataPrivacyTabScreen` fetches `/api/mobile/export` and opens the native Android Share sheet (`Intent.ACTION_SEND` with `text/plain` / `application/json`) or saves via `CreateDocument`.
8. **Delete Account (`POST /api/mobile/delete-account`):**
   - Request JSON: `{ "password": "...", "mfa_code"?: "..." }` -> `{ "ok": true, "message": "Account deleted" }`.
   - Clicking "Delete your Bansify Account" in `DataPrivacyTabScreen` opens a native Compose confirmation dialog; on success, remove the account from `TokenStore` and refresh state.

---

## 4. Domain (`bansify.com`) & Brand (`Bansify Accounts`) Rebrand
- Update all domain configuration defaults (`BuildConfig`, `AccountConfig`, Gradle `buildConfigField` / `manifestPlaceholders`, `AndroidManifest.xml` App Links `android:host`, and unit test fixtures) from `gothwadtech.com` (`accounts.gothwadtech.com`, `api.gothwadtech.com`) to **`bansify.com`** (`accounts.bansify.com`, `api.bansify.com`).
- Update all user-visible brand strings (`strings.xml`, Compose UI headings/subtitles, app name `Bansify Accounts`, and product names `Bansify Mail`, `Bansify Drive`, `Bansify Meet`, `Bansify Notes`, `Bansify Calendar`, `Bansify Contacts`, `Bansify Tube`, `Bansify Chat`) from `Gothwad` / `Gothwad Accounts` to **`Bansify`** / **`Bansify Accounts`**.
- Keep technical Android package IDs (`com.gothwad.accounts`, `com.gothwad.mail`, etc.) and OAuth `client_id` slugs (`gothwad-accounts-android`, `gothwad-mail`, etc.) unchanged for backward compatibility.

---

## 5. Verification & Delivery
1. Add unit tests in `core/src/test/` and `ui/src/test/` covering direct native sign-in/sign-up/MFA, `issue_peer_code` cross-app SSO, and the new `/api/mobile/*` methods.
2. Run `./gradlew test assembleDebug` and verify all tests and Python checks (`python3 tools/check_android_scaffold.py`, `python3 tools/check_docs.py`) pass with 0 errors.
3. Commit, push to the active branch, and merge the pull request to `main`.
```
