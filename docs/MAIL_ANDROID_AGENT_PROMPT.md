# Bansify Mail Android (`Bansify/mailapp`) — Runtime Fixes, Zero-Browser Cross-App SSO & Direct Native Auth Prompt

> **How to use:** Copy and paste the prompt below into the Arena coding agent working inside **`Bansify/mailapp`**.

---

```markdown
You are working inside `Bansify/mailapp` (`com.gothwad.mail`).

## Standing Rules
1. **100% Pure English** across all Kotlin code, Compose UI, strings, comments, tests, and docs.
2. **Preserve Everything That Currently Works:** Keep the existing Browser / Chrome Custom Tabs OAuth 2.0 + S256 PKCE flow (`GothwadMailAuth.launchSignIn` / `OAuthHttpClient`), `EncryptedTokenStore`, Room v2 offline-first sync, `MailApiClient`, and existing tests intact.
3. **Fix Two Runtime Bugs + Upgrade to Zero-Browser Cross-App Silent SSO & Direct Native Worker Sign-In:**
   - Fix the `/api/session` missing Bearer header in `MailApiClient.kt` and the custom-scheme `<intent-filter>` in `AndroidManifest.xml` (plus untrack `.gradle/` cache files).
   - When a user is already signed into `Bansify Accounts` (`com.gothwad.accounts`) or another official Gothwad app on the phone, sign in **automatically via Binder IPC + PKCE (`issue_peer_code`) in <1 second with ZERO browser and ZERO permissions screen**.
   - Provide a **100% Native Jetpack Compose Sign-In / Sign-Up / 2FA / Forgot Password UI** talking directly to `https://accounts.bansify.com/api/mobile/auth/*` over `OkHttp` so `Bansify Mail` works even if **no browser is installed on the phone**, while keeping **"Sign in with Browser"** (`CustomTabsIntent`) as a secondary button.

---

## 1. Fix Two Runtime Bugs & Untrack `.gradle/` Cache Files

1. **`app/src/main/java/com/gothwad/mail/data/remote/MailApiClient.kt` (`executeRaw`, lines 188–196):**
   - Remove the `if (url.pathSegments.lastOrNull() == ROUTE_SESSION)` block that sends `GET /api/session` without `Authorization: Bearer <token>`.
   - `GET /api/session` on `https://mail.bansify.com` requires authentication (`requireSession`), so `api.session()` must attach `Authorization: Bearer $token` just like every other `/api/*` endpoint.
   - Update the `/api/session` unit test in `app/src/test/java/com/gothwad/mail/data/remote/MailApiClientTest.kt` to assert `assertEquals("Bearer test-token", request.getHeader("Authorization"))`.
2. **`app/src/main/AndroidManifest.xml` (lines 48–56):**
   - On `AccountCallbackActivity`, change the custom-scheme `<data>` element from:
     ```xml
     <data
         android:scheme="${gothwadRedirectScheme}"
         android:host="oauth"
         android:path="/callback" />
     ```
     to:
     ```xml
     <data android:scheme="${gothwadRedirectScheme}" />
     ```
     (matching `Bansify/accountsapp`) so Android intercepts single-slash `com.gothwad.mail:/oauth/callback` redirects as well as `https://mail.bansify.com/oauth/callback`.
3. **Remove tracked `.gradle/` files:**
   - Run `git rm -r --cached .gradle || true` and ensure `.gradle/` is in `.gitignore`.

---

## 2. Zero-Browser Automatic Cross-App Silent SSO (`issue_peer_code` + `POST /api/mobile/auth/peer-code`)

When `Bansify Accounts` (`com.gothwad.accounts`) or another official Gothwad app is signed in on the phone, `Bansify Mail` must be able to sign in **automatically without opening a browser or showing a permissions screen**:

1. **Server Endpoint (`POST https://accounts.bansify.com/api/mobile/auth/peer-code`):**
   - Authenticated with `Authorization: Bearer <peer_app_valid_first_party_access_token>`.
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
2. **Update `AccountDirectoryProvider.kt` (`app/src/main/java/com/gothwad/mail/auth/broker/AccountDirectoryProvider.kt`):**
   - Override `call(method: String, arg: String?, extras: Bundle?): Bundle?`:
     - Verify `TrustVerifier.isTrustedUid(context, Binder.getCallingUid())`. If untrusted, return `Bundle().apply { putBoolean("ok", false); putString("error", "untrusted_caller") }`.
     - When `method == "issue_peer_code"`:
       - Read `user_id` (or `username`/`email`), `target_client_id`, `redirect_uri`, `scope`, `code_challenge`, and `code_challenge_method` (default `"S256"`) from `extras`.
       - Find the matching local account in `MailAuthSessionManager` / `EncryptedTokenStore`, ensure a fresh `access_token` (refreshing via `OAuthHttpClient.refreshToken` if expired), and call `OAuthHttpClient.issuePeerAuthCode(...)` (`POST https://accounts.bansify.com/api/mobile/auth/peer-code`).
       - Return a `Bundle` with `putBoolean("ok", true)`, `putString("code", code)`, `putString("redirect_uri", redirectUri)`, `putString("scope", scope)`.
3. **Update `PeerBrokerClient.kt` & `GothwadMailAuth.kt` / `MailAuthSessionManager.kt`:**
   - Add `PeerBrokerClient.requestPeerAuthCode(sourcePackage, userId, targetClientId, redirectUri, scope, codeChallenge): Result<PeerAuthCodeResult>`.
   - When the user taps **"Continue as <DiscoveredAccount>"** on `SignInWelcomeScreen` or `AccountSwitcherDialog` — **AND automatically on app startup when 0 local accounts are signed in and at least 1 verified `DiscoveredAccount` is found from a peer app (`com.gothwad.accounts`)**:
     - Generate a fresh S256 PKCE `(codeVerifier, codeChallenge)`.
     - Call `PeerBrokerClient.requestPeerAuthCode(...)` on `content://${discovered.sourcePackage}.accountprovider` with `targetClientId = "gothwad-mail"`, `redirectUri = GothwadEndpoints.REDIRECT_URI_CUSTOM_SCHEME`, `scope = GothwadEndpoints.OAUTH_SCOPE`, and `codeChallenge`.
     - If `requestPeerAuthCode` returns a `code`, immediately exchange `(code, codeVerifier)` via `OAuthHttpClient.exchangeAuthorizationCode(...)` (`POST /api/oauth/token`), fetch `/api/oauth/userinfo`, and persist the session in `EncryptedTokenStore` — **logging the user in silently in <1 second with ZERO browser**!
     - Only if `requestPeerAuthCode` fails (for example, the peer app is older or its token is expired), fall back to opening the native Sign-In sheet pre-filled with `discovered.email`.

---

## 3. Direct Native Android Sign-In / Sign-Up / MFA / Forgot Password (`/api/mobile/auth/*` — Zero Browser Required)

Add direct native authentication methods to `OAuthHttpClient.kt` and `MailAuthSessionManager.kt` / `GothwadMailAuth.kt` calling `https://accounts.bansify.com/api/mobile/auth/*`:

1. **`POST /api/mobile/auth/check-identifier`** — `{ "identifier": "..." }` -> `{ "ok": true, "exists": true|false, "kind": "...", "error"?: "..." }`
2. **`POST /api/mobile/auth/check-username`** — `{ "username": "..." }` -> `{ "ok": true, "available": true|false, "valid": true|false, "email": "...@bansify.com", "error"?: "..." }`
3. **`POST /api/mobile/auth/signin`** —
   ```json
   {
     "client_id": "gothwad-mail",
     "scope": "profile email offline_access mail",
     "identifier": "<username | email | phone>",
     "password": "<password>"
   }
   ```
   - Returns `200` with `{ "ok": true, "access_token": "...", "refresh_token": "...", "expires_in": 900, "scope": "profile email offline_access mail", "user": { ... } }` (immediately fetch `/api/oauth/userinfo` or map and save in `EncryptedTokenStore`!).
   - Or returns `202` with `{ "ok": true, "mfa_required": true, "challenge": "<64-hex>", "expires_in": 300, "message": "..." }`.
4. **`POST /api/mobile/auth/signin/mfa`** —
   ```json
   {
     "client_id": "gothwad-mail",
     "scope": "profile email offline_access mail",
     "challenge": "<64-hex>",
     "code": "<6-digit-totp-or-recovery-code>"
   }
   ```
   - Returns `200` with `{ "ok": true, "access_token": "...", "refresh_token": "...", "expires_in": 900, "user": { ... } }`.
5. **`POST /api/mobile/auth/signup`** —
   ```json
   {
     "client_id": "gothwad-mail",
     "scope": "profile email offline_access mail",
     "first_name": "...",
     "last_name": "...",
     "username": "...",
     "password": "...",
     "recovery_email": "...",
     "phone_number": "...",
     "date_of_birth": "YYYY-MM-DD",
     "gender": "..."
   }
   ```
   - Returns `201` with `{ "ok": true, "access_token": "...", "refresh_token": "...", "expires_in": 900, "user": { ... } }`.
6. **`POST /api/mobile/auth/forgot-password` & `POST /api/mobile/auth/reset-password`** —
   - `{ "username": "..." }` and `{ "token": "...", "password": "..." }`.

### UI Integration in `SignInWelcomeScreen.kt` & `AccountSwitcherDialog`:
- Make the primary **"Sign in with Bansify"** (and **"Add another account"**) action open a **100% Native Jetpack Compose Sign-In / Sign-Up / 2FA / Forgot Password Dialog or Sheet** right inside `Bansify Mail` (Step 1: Username/Email/Phone + "Create account" link -> Step 2: Password + "Forgot password?" link -> Step 3: 6-digit Authenticator/Backup code if `mfa_required == true`).
- Keep **"Sign in with Browser"** as a secondary outlined/text button that launches the existing Chrome Custom Tabs OAuth 2.0 + S256 PKCE flow (`GothwadMailAuth.launchSignIn`).

---

## 4. Verification & Delivery
1. Add unit tests in `app/src/test/` covering:
   - `GET /api/session` sending `Authorization: Bearer <token>`
   - Direct native sign-in, MFA verification, sign-up, and `issue_peer_code` silent cross-app token exchange.
2. Run `./gradlew testDebugUnitTest assembleDebug` and verify 0 errors.
3. Commit, push to the active branch, and merge the pull request to `main`.
```
