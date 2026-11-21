# Bansify Mail Android (`Bansify/mailapp`): Domain (`bansify.com`) & Brand (`Bansify Mail`) Migration Prompt

Paste the prompt below into the coding agent working in **`Bansify/mailapp`**.
Do not run this prompt inside `Bansify/accounts`, `Bansify/accountsapp`, or `Bansify/mail`.

---

Work only in this `Bansify/mailapp` repository on the active session branch. First read `README.md`, `app/build.gradle.kts`, `app/src/main/AndroidManifest.xml`, `app/src/main/res/values/strings.xml`, `app/src/main/java/com/gothwad/mail/auth/GothwadEndpoints.kt`, `app/src/main/java/com/gothwad/mail/auth/MailAuthModels.kt`, `app/src/main/java/com/gothwad/mail/auth/MailAuthSessionManager.kt`, `app/src/main/java/com/gothwad/mail/auth/broker/BrokerModels.kt`, `app/src/main/java/com/gothwad/mail/data/remote/MailApiClient.kt`, `app/src/main/java/com/gothwad/mail/data/repository/MailMappers.kt`, `tools/check_android_scaffold.py`, `tools/check_docs.py`, and `.github/workflows/release.yml` before editing.

## Why `Bansify/mailapp` Needs This Update

Both `Bansify/accounts` and `Bansify/mail` have been migrated from `gothwadtech.com` (`accounts.gothwadtech.com`, `mail.gothwadtech.com`) and `Gothwad Mail` / `Gothwad Accounts` to **`bansify.com`** (`accounts.bansify.com`, `mail.bansify.com`) and **`Bansify Mail`** / **`Bansify Accounts`**.
An incomplete open PR (`#6`) in `Bansify/mailapp` only updated a few UI labels to "Bansify Email" and completely missed `GothwadEndpoints.kt`, `MailApiClient.kt`, `AndroidManifest.xml` App Links (`mail.gothwadtech.com`), fallback `@gothwadtech.com` email domains, and unit tests.

---

## Mandatory Compatibility Invariants (Enforced by `tools/check_android_scaffold.py` & `Bansify/accounts`)

Do **NOT** change any of the following technical identifiers:
1. **`applicationId = "com.bansify.mail"`** in `app/build.gradle.kts` (and `applicationIdSuffix = ".debug"`).
2. **Kotlin `package com.gothwad.mail.*` declarations and class/file names** (`GothwadMailAuth`, `GothwadEndpoints`, `KnownGothwadApps`, etc. — `.github/workflows/android-ci.yml` and `tools/check_android_scaffold.py` reference them).
3. **OAuth `CLIENT_ID = "gothwad-mail"`** and custom scheme **`com.gothwad.mail:/oauth/callback`** (`${gothwadRedirectScheme}`).
4. **ContentProvider authority `${applicationId}.bansify.account.directory`** and `<queries>` package `com.bansify.accounts` (`tools/check_android_scaffold.py` enforces both).
5. **Required `README.md` sections and documented secrets/endpoints** enforced by `tools/check_docs.py` (`## Architecture`, `### Endpoints used`, `## Build and test`, `## Manual device checks`, and the 4 `RELEASE_KEYSTORE_BASE64` / `KEYSTORE_PASSWORD` / `KEY_ALIAS` / `KEY_PASSWORD` secret names).

---

## Exact File-by-File Changes Required in `Bansify/mailapp`

### 1. Update All Runtime Endpoints, Hosts & App Links (`gothwadtech.com` -> `bansify.com`)

1. **`app/src/main/AndroidManifest.xml`**:
   - In `.auth.AccountCallbackActivity`, change `android:host="mail.gothwadtech.com"` to `android:host="mail.bansify.com"`.
   - Keep the custom-scheme `<data android:scheme="${gothwadRedirectScheme}" />` intent-filter with scheme only (no `android:host` or `android:path`).
2. **`app/src/main/java/com/gothwad/mail/auth/GothwadEndpoints.kt`**:
   - Update all domain constants to `bansify.com`:
     ```kotlin
     const val REDIRECT_URI_APP_LINK: String = "https://mail.bansify.com/oauth/callback"
     const val ACCOUNTS_BASE_URL: String = "https://accounts.bansify.com"
     const val MAIL_API_BASE_URL: String = "https://mail.bansify.com/api"
     const val MAIL_API_HOST: String = "mail.bansify.com"
     const val ACCOUNTS_API_HOST: String = "accounts.bansify.com"
     ```
   - Keep `CLIENT_ID = "gothwad-mail"` and `REDIRECT_URI_CUSTOM_SCHEME = "com.gothwad.mail:/oauth/callback"` unchanged.
3. **`app/src/main/java/com/gothwad/mail/data/remote/MailApiClient.kt`**:
   - Update companion constants:
     ```kotlin
     const val DEFAULT_BASE_URL: String = "https://mail.bansify.com/api"
     const val GothwadMailHost: String = "mail.bansify.com"
     ```
4. **Fallback `@gothwadtech.com` Email Addresses in Auth, Broker & Repository Mappers**:
   - `app/src/main/java/com/gothwad/mail/auth/MailAuthModels.kt` (line 32):
     `val mailboxAddress: String get() = email.ifBlank { "$username@bansify.com" }`
   - `app/src/main/java/com/gothwad/mail/auth/MailAuthSessionManager.kt` (line 566):
     `email = email?.takeIf { it.isNotBlank() } ?: "$username@bansify.com",`
   - `app/src/main/java/com/gothwad/mail/auth/broker/BrokerModels.kt` (line 122):
     `?: username?.takeIf { it.isNotBlank() }?.let { "$it@bansify.com" }`
   - `app/src/main/java/com/gothwad/mail/data/repository/MailMappers.kt` (lines 73, 176, 211):
     - `val senderEmail = message.from.email.ifBlank { "unknown@bansify.com" }`
     - `val email = user.email.ifBlank { "$username@bansify.com" }`
     - `val email = info.email?.takeIf { it.isNotBlank() } ?: existing?.email ?: "$username@bansify.com"`

### 2. Rebrand All User-Visible Strings & Compose Screens (`Gothwad Mail` -> `Bansify Mail`, `Gothwad Account` -> `Bansify Account`)

Use **`Bansify Mail`** (consistent with `Bansify/accounts` and `Bansify/mail`) across all UI strings:
1. **`app/src/main/res/values/strings.xml`**:
   - `<string name="app_name">Bansify Mail</string>`
   - `<string name="signed_out_title">Welcome to Bansify Mail</string>`
   - `<string name="signed_out_subtitle">Sign in with your Bansify Account to read and send email</string>`
   - `<string name="sign_in_with_gothwad">Sign in with Bansify</string>` (keep the `name="sign_in_with_gothwad"` resource ID unchanged).
2. **`app/src/main/java/com/gothwad/mail/data/model/MailModels.kt` & `app/src/main/java/com/gothwad/mail/data/repository/MailMappers.kt`**:
   - Default signature: `"Sent from Gothwad Mail"` -> `"Sent from Bansify Mail"`.
3. **`app/src/main/java/com/gothwad/mail/data/remote/MailApiClient.kt` & `MailApiModels.kt` & `auth/*.kt`**:
   - Replace user-facing error messages referencing `Gothwad Mail`, `Gothwad Account`, and `Gothwad Accounts` with `Bansify Mail`, `Bansify Account`, and `Bansify Accounts`.
4. **`app/src/main/java/com/gothwad/mail/ui/components/AccountSwitcherDialog.kt` & `MailNavigationDrawer.kt`**:
   - Replace `"Gothwad Mail"` -> `"Bansify Mail"` and `"Manage your Gothwad Account"` -> `"Manage your Bansify Account"`.
5. **`app/src/main/java/com/gothwad/mail/ui/screens/InboxScreen.kt`, `NativeAuthSheet.kt`, `SettingsScreen.kt`, `SignedOutScreen.kt`, and `viewmodel/MailViewModel.kt`**:
   - In `InboxScreen.kt`: fallback `"Pawan Gothwad"` -> `"Bansify User"` (or `"Pawan"`).
   - In `NativeAuthSheet.kt`:
     - `"Sign in to Gothwad"` -> `"Sign in to Bansify"`
     - `"Create a Gothwad Account"` -> `"Create a Bansify Account"`
     - `"Your new account is created on Gothwad Accounts"` -> `"Your new account is created on Bansify Accounts"`
   - In `SettingsScreen.kt`, `SignedOutScreen.kt`, and `MailViewModel.kt`:
     - Replace all `"Gothwad Mail"` -> `"Bansify Mail"`, `"Gothwad Account"` -> `"Bansify Account"`, `"Gothwad Accounts"` -> `"Bansify Accounts"`, `"Sign in with Gothwad"` -> `"Sign in with Bansify"`, and `"Gothwad apps"` -> `"Bansify apps"`.

### 3. Update All Unit Tests, `README.md` & `.github/workflows/release.yml`

1. **Unit Tests (`app/src/test/java/com/gothwad/mail/**/*.kt`)**:
   - In `PkceTest.kt`, `CallbackValidatorTest.kt`, `MailAuthSessionManagerTest.kt`, `NativeAuthTest.kt`, `PeerBrokerDiscoveryTest.kt`, `MailApiClientTest.kt`, and `MailRepositorySyncTest.kt`:
     - Replace all `accounts.gothwadtech.com`, `mail.gothwadtech.com`, `mail.gothwadtech.com%2Foauth%2Fcallback`, and `@gothwadtech.com` URLs/emails with `accounts.bansify.com`, `mail.bansify.com`, `mail.bansify.com%2Foauth%2Fcallback`, and `@bansify.com`.
     - Update any test assertions that check for `"Gothwad Accounts"` / `"Gothwad Mail"` strings if the underlying string was updated.
2. **`README.md`**:
   - Replace `accounts.gothwadtech.com` -> `accounts.bansify.com`, `mail.gothwadtech.com` -> `mail.bansify.com`, and `Gothwad Mail` / `Gothwad Accounts` -> `Bansify Mail` / `Bansify Accounts` while preserving all required headings, endpoint paths, and secret names checked by `tools/check_docs.py`.
3. **`.github/workflows/release.yml`**:
   - Keep all required steps, secrets, and Gradle tasks enforced by `tools/check_android_scaffold.py` (`Publish versioned GitHub Release`, `Publish rolling pre-release`, `:app:assembleRelease`, `:app:assembleDebug`, `:app:bundleRelease`, `apksigner`, `zipalign`, `steps.signing.outputs.can_sign`, `on:\n  push:`), and update the output APK/AAB filenames and release title from `GothwadMail-v...` / `Gothwad-Mail-v...` / `Gothwad Mail` to `BansifyMail-v...` / `Bansify-Mail-v...` / `Bansify Mail`.

---

## Verification, PR Merge & Final Response Instructions

1. Run and pass all checks locally:
   ```bash
   python3 tools/check_android_scaffold.py
   python3 tools/check_docs.py
   ./gradlew testDebugUnitTest assembleDebug
   ```
2. Commit your changes, push to the active branch (`git push -u origin <active-branch>`), open a pull request to `main`, and merge it using `gh pr merge <number> --merge`.
3. Close the superseded incomplete PR #6 (`gh pr close 6 --repo Bansify/mailapp`).
4. Check the GitHub Actions workflow runs on the merged `main` commit (`gh run list --repo Bansify/mailapp --branch main --limit 5`) and report the status of the CI and Release APK build to the user, along with any repository secret checks (`RELEASE_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) if needed.
