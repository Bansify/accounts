# Bansify Accounts Android (`Bansify/accountsapp`): Domain (`bansify.com`) & Brand (`Bansify Accounts`) Migration Prompt

Paste the prompt below into the coding agent working in **`Bansify/accountsapp`**.
Do not run this prompt inside `Bansify/accounts`, `Bansify/mail`, or `Bansify/mailapp`.

---

Work only in this `Bansify/accountsapp` repository on the active session branch. First read `README.md`, `app/src/main/AndroidManifest.xml`, `app/src/main/java/com/gothwad/accounts/AccountsApplication.kt`, `core/src/main/java/com/gothwad/accounts/core/GothwadConfig.kt`, `ui/src/main/res/values/strings.xml`, `ui/src/main/res/values-hi/strings.xml`, `ui/src/main/java/com/gothwad/accounts/ui/model/AccountDashboardModels.kt`, `tools/check_android_scaffold.py`, `tools/check_docs.py`, and `.github/workflows/release.yml` before editing.

## Why `Bansify/accountsapp` Needs This Update

The backend (`Bansify/accounts`) has been migrated from `gothwadtech.com` (`accounts.gothwadtech.com`, `api.gothwadtech.com`) and `Gothwad Accounts` to **`bansify.com`** (`accounts.bansify.com`, `api.bansify.com`) and **`Bansify Accounts`**.
An incomplete open PR (`#6`) in `Bansify/accountsapp` only touched `strings.xml` and `README.md`, leaving all runtime URLs, App Links hosts, Compose UI screens, ecosystem catalog entries, and unit tests pointing at `accounts.gothwadtech.com` and `@gothwadtech.com`.

---

## Mandatory Compatibility Invariants (Do NOT Change These!)

To preserve backward compatibility with installed apps, Android Keystore storage, cross-app ContentProvider discovery, and `Bansify/accounts` D1 `ecosystem_apps` registrations:
1. **Android `applicationId` and namespaces are now `com.bansify.accounts`** (sample apps `com.bansify.accounts.sample.alpha`, `com.bansify.accounts.sample.beta`). Keep them at these values; the Accounts Worker's first-party client seeds, D1 `ecosystem_apps.android_package` rows and `web/.well-known/assetlinks.json` are aligned with them.
2. **Keep Kotlin `package` declarations and public SDK class/object/method names unchanged:** `package com.gothwad.accounts.*`, `GothwadAccounts`, `GothwadConfig`, `GothwadAccount`, `KnownGothwadApps`, etc.
3. **Keep OAuth `client_id` slugs unchanged:** `"gothwad-accounts-android"`, `"gothwad-mail"`, `"gothwad-drive"`, `"kiwi-store"`, `"gothwad-tube"`, etc.
4. **ContentProvider authority is `${applicationId}.bansify.account.directory`** and the custom-scheme URI is `com.bansify.accounts:/oauth/callback`. Legacy `com.gothwad.*` redirect URIs stay registered server-side so existing installs keep working.
5. **Keep `ui/src/main/res/values/strings.xml` and `ui/src/main/res/values-hi/strings.xml` resource `@string/gothwad_*` key names identical** across both files (`tools/check_android_scaffold.py` enforces `strings[0] == strings[1]`). Only update the string *values* inside the tags.

---

## Exact File-by-File Changes Required in `Bansify/accountsapp`

### 1. Runtime Domain & App Links Configuration (`gothwadtech.com` -> `bansify.com`)

1. **`app/src/main/AndroidManifest.xml`**:
   - Change `android:host="accounts.gothwadtech.com"` to `android:host="accounts.bansify.com"`.
2. **`app/src/main/java/com/gothwad/accounts/AccountsApplication.kt`**:
   - Change `"https://accounts.gothwadtech.com/oauth/callback"` to `"https://accounts.bansify.com/oauth/callback"`.
3. **`core/src/main/java/com/gothwad/accounts/core/GothwadConfig.kt`**:
   - Change default `val authBaseUrl: String = "https://accounts.gothwadtech.com/api"` to `"https://accounts.bansify.com/api"`.
4. **`ui/src/main/java/com/gothwad/accounts/ui/components/AccountSharedComponents.kt`**:
   - Change both fallback `"$it@gothwadtech.com"` expressions (lines 109 and 128) to `"$it@bansify.com"`.
5. **`ui/src/main/java/com/gothwad/accounts/ui/state/AccountDashboardViewModel.kt`**:
   - Change `"$clean@gothwadtech.com"` (line 503) and `"$it@gothwadtech.com"` (line 717) to `"$clean@bansify.com"` and `"$it@bansify.com"`.
   - Update user-visible snackbar and searchable setting labels in `AccountDashboardViewModel.kt`:
     - `"Disconnected this app grant on Gothwad server and signed out locally."` -> `"Disconnected this app grant on Bansify server and signed out locally."`
     - `"Welcome to Gothwad, ..."` -> `"Welcome to Bansify, ..."`
     - `"Gothwad Account permanently deleted"` -> `"Bansify Account permanently deleted"`
     - `"Gothwad Contacts"` -> `"Bansify Contacts"`
     - `"Gothwad Services"` -> `"Bansify Services"`

### 2. Compose UI Screens, Ecosystem Catalog & String Resources (`Gothwad` -> `Bansify`, `gothwadtech.com` -> `bansify.com`)

1. **`app/src/main/res/values/strings.xml`**:
   - Set `<string name="app_name">Bansify Accounts</string>`.
2. **`sample/src/main/res/values/strings.xml`**:
   - Set `<string name="app_name">Bansify Accounts Sample</string>`.
3. **`ui/src/main/res/values/strings.xml` and `ui/src/main/res/values-hi/strings.xml`**:
   - Keep all `name="gothwad_..."` attribute keys unchanged, and replace `Gothwad Accounts` -> `Bansify Accounts`, `Gothwad Account` -> `Bansify Account`, `Gothwad User` -> `Bansify User`, and `Gothwad` -> `Bansify` in the text values of both files.
4. **`ui/src/main/java/com/gothwad/accounts/ui/model/AccountDashboardModels.kt`**:
   - Update `GothwadEcosystemCatalog` entries so all names, descriptions, and URLs use `Bansify` and `bansify.com` (keep the `id` slugs like `"gothwad-meet"`, `"gothwad-mail"`, `"kiwi-store"`, etc. unchanged):
     - `"gothwad-meet"` -> `"Bansify Meet"`, `"Video meetings for your Bansify Account"`, `"https://meet.bansify.com"`
     - `"gothwad-mail"` -> `"Bansify Mail"`, `"Account address at bansify.com; mailbox availability is managed by Mail"`, `"https://mail.bansify.com"`
     - `"kiwi-store"` -> `"Kiwi Store"`, `"Apps and add-ons for Kiwi Store"`, `"https://kiwistore.bansify.com"`
     - `"gothwad-drive"` -> `"Bansify Drive"`, `"Files and folders on your account"`, `"https://drive.bansify.com"`
     - `"gothwad-notes"` -> `"Bansify Notes"`, `"Notes and lists, synced"`, `"https://notes.bansify.com"`
     - `"gothwad-calendar"` -> `"Bansify Calendar"`, `"Events and reminders"`, `"https://calendar.bansify.com"`
     - `"gothwad-contacts"` -> `"Bansify Contacts"`, `"People and addresses"`, `"https://contacts.bansify.com"`
     - `"gothwad-tube"` -> `"Bansify Tube (PlusTube)"`, `"Video — PlusTube"`, `"https://tube.bansify.com"`
     - `"gothwad-chat"` -> `"GrixChat (Bansify Chat)"`, `"Messaging"`, `"https://grixchat.bansify.com"`
     - `"gothwad-indogram"` -> `"Indogram"`, `"Messaging & communities"`, `"https://indogram.bansify.com"`
5. **`ui/src/main/java/com/gothwad/accounts/ui/components/NativeAuthDialog.kt`**:
   - `"Sign in to Gothwad"` -> `"Sign in to Bansify"`
   - `"Create Gothwad Account"` -> `"Create Bansify Account"`
   - `"Enter your Gothwad username, @gothwadtech.com email, or registered phone number."` -> `"Enter your Bansify username, @bansify.com email, or registered phone number."`
   - `"Enter your Gothwad username to request a password reset token via your verified recovery email."` -> `"Enter your Bansify username to request a password reset token via your verified recovery email."`
6. **`ui/src/main/java/com/gothwad/accounts/ui/components/NativeAccountManagementDialogs.kt` & `ui/src/main/java/com/gothwad/accounts/ui/GothwadAccountsScreen.kt`**:
   - `"Gothwad Account Data Export"` -> `"Bansify Account Data Export"`
   - `"Delete Gothwad Account"` -> `"Delete Bansify Account"`
   - `"Gothwad Account Data"` -> `"Bansify Account Data"`
7. **`ui/src/main/java/com/gothwad/accounts/ui/screens/*.kt` (`AccountUtilitySubScreens.kt`, `AppSettingsScreen.kt`, `ConnectedAppsTabScreen.kt`, `DataPrivacyTabScreen.kt`, `HomeTabScreen.kt`, `PeopleSharingTabScreen.kt`, `PersonalInfoTabScreen.kt`, `SecurityTabScreen.kt`)**:
   - Replace all `accounts.gothwadtech.com` and `gothwadtech.com` display strings with `accounts.bansify.com` and `bansify.com`.
   - Replace all user-visible `Gothwad Accounts`, `Gothwad Account`, `Gothwad Contacts`, `Gothwad Services`, `Gothwad Privacy Policy`, `Gothwad Terms of Service`, and `Gothwad` labels/subtitles with `Bansify Accounts`, `Bansify Account`, `Bansify Contacts`, `Bansify Services`, `Bansify Privacy Policy`, `Bansify Terms of Service`, and `Bansify`.

### 3. Unit Tests, Documentation & Release Workflow

1. **Unit Tests (`core/src/test/java/com/gothwad/accounts/core/*.kt` and `ui/src/test/java/com/gothwad/accounts/ui/*.kt`)**:
   - Replace all `@gothwadtech.com`, `accounts.gothwadtech.com`, and `tube.gothwadtech.com` test fixtures/assertions with `@bansify.com`, `accounts.bansify.com`, and `tube.bansify.com`.
   - Run `./gradlew test` and ensure every test in `:core` and `:ui` passes.
2. **Documentation (`README.md`, `app/README.md`, `docs/*.md`)**:
   - Update all `gothwadtech.com` (`accounts.gothwadtech.com`, `mail.gothwadtech.com`, `drive.gothwadtech.com`, `tube.gothwadtech.com`) references to `bansify.com` (`accounts.bansify.com`, `mail.bansify.com`, `drive.bansify.com`, `tube.bansify.com`) and `GothwadTech/accounts` -> `Bansify/accounts`, `Gothwad Accounts` -> `Bansify Accounts`.
   - Ensure all relative Markdown links remain valid (`python3 tools/check_docs.py`).
3. **Release Workflow (`.github/workflows/release.yml`)**:
   - Update the release artifact filenames and title in `.github/workflows/release.yml` from `GothwadAccounts-v...` / `Gothwad-Accounts-v...` / `Gothwad Accounts` to `BansifyAccounts-v...` / `Bansify-Accounts-v...` / `Bansify Accounts`.

---

## Verification, PR Merge & Final Response Instructions

1. Run and pass all checks locally:
   ```bash
   python3 tools/check_android_scaffold.py
   python3 tools/check_docs.py
   ./gradlew test assembleDebug
   ```
2. Commit your changes, push to the active branch (`git push -u origin <active-branch>`), open a pull request to `main`, and merge it using `gh pr merge <number> --merge`.
3. Close the superseded incomplete PR #6 (`gh pr close 6 --repo Bansify/accountsapp`).
4. Check the GitHub Actions workflow runs on the merged `main` commit (`gh run list --repo Bansify/accountsapp --branch main --limit 5`) and report the status of the CI and Release APK build to the user, along with any repository secret checks (`RELEASE_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) if needed.
