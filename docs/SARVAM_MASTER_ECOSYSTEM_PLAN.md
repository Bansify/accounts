# Bansify Ecosystem Master Plan & Multi-Repo Execution Prompt (For Sarvam / Indus AI)

Copy and paste this document (or instruct **Sarvam / Indus AI** to read `docs/SARVAM_MASTER_ECOSYSTEM_PLAN.md` from `Bansify/accounts`) to execute a complete, phase-by-phase stabilization, UI unification, and Cloudflare deployment across all **`Bansify/*`** repositories.

---

## 0. Global Ecosystem Standards (Enforce Across Every Repository)

### A. Canonical Domain & Brand Architecture
- **Root Domain:** `bansify.com` (`0` occurrences of `gothwadtech.com` or `bansifytech.com` permitted in runtime code, configs, or user-visible copy).
- **Core Hosts:**
  - `https://bansify.com` (`Bansify/bansify` — Official Website & shared shell assets)
  - `https://accounts.bansify.com` (`Bansify/accounts` Pages UI + `/api/*` & `/.well-known/assetlinks.json` Worker routes)
  - `https://api.bansify.com` (`Bansify/accounts` Worker Custom Domain — **must** be used for all server-to-server Worker calls such as `/api/auth/me` and `/api/oauth/userinfo`)
  - `https://mail.bansify.com` (`Bansify/mail` Pages UI + `mail.bansify.com/api/*` Worker route + `*@bansify.com` Email Routing catch-all)
  - `https://ai.bansify.com` (`Bansify/ai` Pages UI + `ai.bansify.com/api/*` Worker route)
  - `https://meet.bansify.com` (`Bansify/meet` Pages UI + `meet.bansify.com/api/*` signaling Worker route)
  - `https://drive.bansify.com` (`Bansify/drive` Pages UI + `drive.bansify.com/api/*` Worker route)
  - `https://kiwistore.bansify.com`, `https://kiwiconsole.bansify.com`, `https://kiwiadmin.bansify.com` (`Bansify/store`)
  - `https://pay.bansify.com` (`Bansify/pay`), `https://files.bansify.com` (`Bansify/files`), `https://gitplus.bansify.com` (`Bansify/gitplus`), `https://grixchat.bansify.com` (`Bansify/grixchat`), `https://remotedesktop.bansify.com` (`Bansify/remotedesk`), `https://docs.bansify.com` (`Bansify/docs`), `https://notes.bansify.com` (`Bansify/notes`), `https://photos.bansify.com` (`Bansify/photos`).

### B. The Bansify Five-Card Shell UI Standard
Every Bansify web application must share the exact visual geometry established in `Bansify/bansify`, `Bansify/mail`, and `Bansify/accounts`:
1. **Color Tokens & Typography:**
   - Primary accent: `#0494f4` (`hover: #0382d6`).
   - Light mode (`html.light` / `[data-theme="light"]`): canvas `#f8f9fa`, card surface `#ffffff`, border `#dadce0`, text `#202124`, muted `#5f6368`.
   - Dark mode (`html.dark` / `[data-theme="dark"]`): canvas `#212121`, card surface `#2a2a2a` / `#212121`, border `#333333`, text `#e8eaed`, muted `#9aa0a6`.
   - Fonts: `'Plus Jakarta Sans', system-ui, sans-serif` for body; `'Space Grotesk', sans-serif` for headings.
2. **Five-Card Desktop & Responsive Mobile Geometry (`12px` outer gap, `18px` card radius):**
   - **Card 1 — Left Navigation Card (`260px` expanded / `68px` collapsed):**
     - Header: `36x36px` rounded `10px` `#0494f4` brand icon tile (`/icon-192.png`) + two-tone title (`<b>Bansify</b> <span style="color:#0494f4"><Product></span>`) + collapse chevron button.
     - Body: vertical navigation items with a strict **`4px` gap** (`gap: 4px`) between every row, `40px` row height, `10px` border radius, active row tinted `rgba(4, 148, 244, 0.12)` with `#0494f4` text/icon.
     - Footer: `Settings` row + inline Light/Dark theme toggle button.
   - **Card 2 — Bottom-Left Social Card (`56px` height):**
     - 6 brand-colored `32x32px` rounded `8px` social icon tiles (X `#000000`, Instagram `#E4405F`, YouTube `#FF0000`, LinkedIn `#0A66C2`, Telegram `#26A5E4`, GitHub `#24292F`).
   - **Card 3 — Top Search / Action Bar Card (`52px` height):**
     - Positioned strictly above Card 4 (never overlapping Card 1 or Card 5), containing the global search input (`Ctrl K`) and primary contextual actions.
   - **Card 4 — Main Content Card (`flex: 1`, full width between Left Nav and Right Dock):**
     - Single unified card surface (`overflow-y: auto`), no nested double-card borders around the whole page.
   - **Card 5 — Right-Hand App Dock Card (`60px` width, full height):**
     - Top: `36x36px` circular account avatar button that opens the shared Bansify Account Menu (`https://accounts.bansify.com/widget/account-menu.js` -> `window.BansifyAccountMenu.open(...)`).
     - Divider + vertical stack of `34x34px` rounded `10px` `#0494f4` app tiles linking to Bansify Website, Accounts, Mail, AI, Meet, Drive, Files, Notes, Photos, Pay, Store, and GitPlus.
3. **Mail-Style Startup Splash Screen:**
   - Centered `52x52px` rounded `14px` `#0494f4` icon tile (`/icon-192.png`), `<b>Bansify</b> <span style="color:#0494f4"><Product></span>`, `140x3px` indeterminate `#0494f4` progress bar, and `"Checking your Bansify account…"` status copy.

### C. Identity, Multi-Account & Code Quality Rules
- **100% Pure English:** Zero Hindi/Hinglish words in any UI label, error message, comment, or documentation file.
- **File Size Limit:** Keep every source, style, SQL, test, and Markdown file `<= 500` lines (split larger modules cleanly).
- **Upstream Cookie & Authuser Forwarding:** Every Worker that calls `https://api.bansify.com/api/auth/me` must:
  1. Forward the incoming `X-Gothwad-Authuser` / `X-Bansify-Authuser` header (for `/u/0`..`/u/5` tab isolation).
  2. Forward all rotated `Set-Cookie` headers matching `/^(?:gothwad|bansify)_[a-z0-9_]+=/i` back to the browser so token rotation never signs the user out.

---

## Phase 1: `Bansify/bansify` (Official Website) & `Bansify/accounts` (Central Identity Hub)

1. **`Bansify/bansify`:**
   - Review and merge open **PR #36** (`feat(shell): publish the five-card shell as a reusable asset`) so `https://bansify.com/shell/bansify-shell.css` and `https://bansify.com/shell/bansify-shell.js` are published in production.
   - Verify `npm run build` and Cloudflare Pages deployment on `bansify.com` and `www.bansify.com`.
2. **`Bansify/accounts`:**
   - Ensure `migrations/0014_first_party_native.sql` and `migrations/0015_ai_first_party.sql` are applied to the production Cloudflare D1 `accounts` database (`392aacf8-1b43-490a-9519-ced4daf5a40f`).
   - Confirm `ecosystem_apps` in production D1 has `com.bansify.accounts` (`gothwad-accounts-android`), `com.bansify.mail` (`gothwad-mail`), and `com.bansify.ai` (`gothwad-ai`) with release SHA-256 fingerprint `504e2fc78ab68e018b848fc102762e4499a08803412e66a40b2b09403c6149b6` so `https://accounts.bansify.com/.well-known/assetlinks.json` and `/api/apps/trusted` include all official Android apps.
   - Run `npm run build && npm test` and confirm all 335 tests pass with 0 failures.

---

## Phase 2: `Bansify/ai` (Bansify AI Web + Cloudflare Worker)

`Bansify/ai` already has the Five-Card Shell (`src/ui/BansifyShell.tsx`) and D1/KV Worker (`worker/src/index.ts`), but 5 of the 6 navigation sections currently render `<ComingSoon />`. Fix the following:

1. **Remove Hinglish in `src/ui/ComingSoon.tsx`:**
   - Line 33: change `"Chat pe wapas jao"` to `"Back to Chat"`.
2. **Forward Rotated Accounts Cookies in `worker/src/auth.ts`:**
   - In `resolveCookie`, do not discard `res.headers.getSetCookie()` when `https://api.bansify.com/api/auth/me` rotates session cookies; capture `/^(?:gothwad|bansify)_[a-z0-9_]+=/i` cookies and attach them to the Worker's outgoing `Response` (matching `Bansify/mail` `keepAccountsCookies`).
3. **Wire Real Functional Views for All Navigation Sections in `src/ui/BansifyShell.tsx`:**
   - **`history` (History):** Connect to the existing D1 endpoints in `worker/src/conversations.ts` (`GET /api/conversations`, `GET /api/conversations/:id`, `DELETE /api/conversations/:id`). Render the user's saved conversations with search filter, timestamp, click-to-resume in Chat, and delete button.
   - **`models` (Models):** Render an interactive Model & Provider Catalog using the live `/api/models` response (`fetchModels()`), showing provider status (`Groq`, `Gemini`, `Cloudflare Workers AI`, `OpenRouter`, `SambaNova`, `Sarvam`), context window, and a button to set the active model for Chat.
   - **`studio` (Studio):** Mount the existing repository workspace components (`src/components/RepoSelector.tsx`, `FileTree.tsx`, `CodeEditor.tsx`, `ZipUploader.tsx`, `AiCompanionPanel.tsx`) inside the content card so users can browse/edit GitHub repos and upload/unpack ZIP payloads.
   - **`library` (Prompt Library) & `scheduled` (Scheduled Tasks):** Wire `library` to saved system prompts/templates (allowing one-click launch into Chat) and wire `scheduled` to `worker/src/scheduler.ts` (`/api/schedules`).
   - **`settings` (Settings):** Render inline settings inside the content card (theme selector, default AI model/provider, clear local chat cache, and `"Manage your Bansify Account"` link to `https://accounts.bansify.com/me`).
4. **Clean Up Legacy References:**
   - Remove the remaining 2 `gothwadtech.com` hits and dead Supabase client files (`src/lib/supabase*` if unused), keeping `worker/` 100% Cloudflare D1 + KV native.
   - Run `npm run build`, deploy Worker `ai` (`ai.bansify.com/api/*`) and Pages `bansifyai` (`ai.bansify.com`).

---

## Phase 3: `Bansify/aiapp` (Bansify AI Android App)

1. Close obsolete open **PR #2** (`gh pr close 2 --repo Bansify/aiapp`), as PRs #4 and #5 already shipped on `main`.
2. Replace the remaining 17 `Gothwad` and 5 `supabase` references in comments/strings with `Bansify`.
3. Add `public/.well-known/assetlinks.json` in **`Bansify/ai`** (`public/.well-known/assetlinks.json`) for `package_name: "com.bansify.ai"` with fingerprint `50:4E:2F:C7:8A:B6:8E:01:8B:84:8F:C1:02:76:2E:44:99:A0:88:03:41:2E:66:A4:0B:2B:09:40:3C:61:49:B6` so Android App Links (`https://ai.bansify.com/oauth/callback`) verify automatically.
4. Run `python3 tools/check_android_scaffold.py && python3 tools/check_docs.py && ./gradlew testDebugUnitTest assembleDebug` in `Bansify/aiapp`.

---

## Phase 4: `Bansify/meet` (Bansify Meet Web + Signaling Worker + Accounts SSO)

`Bansify/meet` received the Five-Card Shell in PR #3 (`67e75be`), but it currently has no `Bansify/accounts` authentication and no backend signaling Worker.

1. **Integrate `Bansify/accounts` SSO & Shared Account Widget (`src/App.tsx`, `src/ui/BansifyShell.tsx`):**
   - Add the Mail-style startup splash screen while checking `GET https://accounts.bansify.com/api/auth/me` (`credentials: 'include'`).
   - Populate `userName`, `userEmail`, and `userAvatar` in `BansifyShell` and `GreenRoom` / `MeetingRoom` from the authenticated Bansify Account (with a clean `"Sign in"` button redirecting to `https://accounts.bansify.com/signin?next=https://meet.bansify.com` when signed out).
   - Load `https://accounts.bansify.com/widget/account-menu.js` and wire `onAccount` in `BansifyShell` to `window.BansifyAccountMenu.open(...)`.
   - Replace `localStorage.getItem('gothwad_meet_theme')` with `'bansify_meet_theme'`.
2. **Add Cloudflare Worker Signaling Backend (`worker/wrangler.toml`, `worker/src/index.ts`, `sql/01_meet_schema.sql`):**
   - Create `worker/wrangler.toml` (`name = "meet"`, route `meet.bansify.com/api/*`, D1 database `meet` or Durable Object room coordinator) with `[vars]` `APP_DOMAIN = "bansify.com"`, `ACCOUNTS_API_URL = "https://api.bansify.com"`, `ACCOUNTS_WEB_URL = "https://accounts.bansify.com"`.
   - Implement REST/polling or WebSocket signaling endpoints (`/api/meet/rooms`, `/api/meet/rooms/:code/join`, `/api/meet/rooms/:code/signal`, `/api/meet/rooms/:code/chat`, `/api/meet/rooms/:code/leave`) so multiple participants joining `https://meet.bansify.com/?room=abc-defg-hij` establish real peer-to-peer WebRTC audio/video/screen-share and in-call chat.

---

## Phase 5: `Bansify/drive` (Bansify Drive Web + Worker + Five-Card Shell)

`Bansify/drive` still has **73 `gothwadtech.com` references** and uses an older UI layout.

1. **Complete Domain & Brand Migration (`gothwadtech.com` -> `bansify.com`, `Gothwad Drive` -> `Bansify Drive`):**
   - `src/config/brand.ts`: set `DEFAULT_APP_DOMAIN = "bansify.com"`, `ACCOUNTS_WEB_ORIGIN = "https://accounts.bansify.com"`, `DRIVE_WEB_ORIGIN = "https://drive.bansify.com"`.
   - `worker/src/http.ts`: set default domain to `'bansify.com'`.
   - `src/lib/gothwadSso.ts`, `src/lib/gothwadBootstrap.ts`, `src/components/auth/AuthWizard.tsx`, and `tests/**`: replace all `gothwadtech.com` URLs/emails with `bansify.com`.
   - Ensure `worker/` forwards rotated `gothwad_*` and `bansify_*` `Set-Cookie` headers and `X-Gothwad-Authuser` / `X-Bansify-Authuser`.
2. **Adopt the Bansify Five-Card Shell & Startup Splash:**
   - Replace the legacy header/sidebar with the Five-Card Shell (`My Drive`, `Shared with me`, `Recent`, `Starred`, `Trash`, `Vault`, `Settings` with `4px` nav row gap, top search + `+ Upload` bar card, main files content card, bottom-left social card, and right-hand `APP_DOCK` with shared `account-menu.js` avatar trigger).
   - Add the Mail-style startup splash screen (`Bansify Drive`, `#0494f4` tile, progress bar).
   - Verify `npm test`, `npm run build`, and deploy Cloudflare Pages + Worker `drive` (`drive.bansify.com/api/*`).

---

## Phase 6: `Bansify/store` (Bansify Store / Kiwi Store Web + Worker + Five-Card Shell)

1. Replace the 175 leftover `Gothwad` UI/code references across `src/`, `shared/`, `worker/`, and `docs/` with `Bansify` (keeping OAuth `client_id = "kiwi-store"` and wire cookie names compatible with `Bansify/accounts`).
2. Wrap the Store (`kiwistore.bansify.com`), Console (`kiwiconsole.bansify.com`), and Admin (`kiwiadmin.bansify.com`) surfaces in the **Bansify Five-Card Shell** (`4px` nav row gap, top search pill, main content card, bottom-left social card, right-hand `APP_DOCK`, shared `account-menu.js` sheet, and startup splash screen).
3. Run `npm test && npm run build` and deploy Worker + Pages.

---

## Phase 7: `Bansify/pay` & `Bansify/files`

1. **`Bansify/pay` (`pay.bansify.com`):**
   - Upgrade `web/index.html` and `src/` to the **Bansify Five-Card Shell** with sections: `Overview`, `Send & Request`, `Transactions`, `Payment Methods`, and `Settings`.
   - Connect to `Bansify/accounts` SSO (`/api/auth/me` + `https://accounts.bansify.com/widget/account-menu.js`) and add the Mail-style startup splash screen.
2. **`Bansify/files` (`files.bansify.com` + Android `com.bansify.files`):**
   - Upgrade `web/` to the **Bansify Five-Card Shell** with `APP_DOCK`, social links card, and `account-menu.js`.
   - Register `gothwad-files` (`package: 'com.bansify.files'`, `redirects: ['https://files.bansify.com/oauth/callback', 'com.bansify.files:/oauth/callback']`) in `Bansify/accounts` `first-party.ts` when adding cloud sync/account sign-in to the Android app.

---

## Phase 8: `Bansify/gitplus`, `Bansify/remotedesk`, `Bansify/docs` & `Bansify/grixchat`

1. **`Bansify/gitplus` (`gitplus.bansify.com`):**
   - Replace all 59 `gothwadtech.com` and 133 `Gothwad` references with `bansify.com` and `Bansify GitPlus`.
   - Update `wrangler.jsonc`, `functions/`, and `src/` to authenticate against `https://api.bansify.com` and `https://accounts.bansify.com`.
   - Apply the **Bansify Five-Card Shell** (`Repositories`, `Pull Requests`, `Issues`, `Actions`, `Settings`) + `account-menu.js`.
2. **`Bansify/remotedesk` (`remotedesktop.bansify.com`):**
   - Replace all 46 `gothwadtech.com` and 177 `Gothwad` references with `bansify.com` and `Bansify Remote Desktop`.
   - Apply the **Bansify Five-Card Shell** (`Remote Devices`, `Share Screen`, `Hyper-V VM`, `Host Installer`, `Settings`) + `account-menu.js`.
3. **`Bansify/docs` (`docs.bansify.com`):**
   - Replace all `gothwadtech.com` and `Gothwad Tech` references with `bansify.com` and `Bansify`.
   - Apply the **Bansify Five-Card Shell** so the documentation portal looks identical to the Official Website, Mail, AI, and Accounts.
4. **`Bansify/grixchat` (`grixchat.bansify.com`):**
   - Replace the remaining 21 `gothwadtech.com` references with `bansify.com`, wire `https://accounts.bansify.com/widget/account-menu.js`, and apply the Five-Card Shell (`Chats`, `Channels`, `Calls`, `Contacts`, `Settings`).

---

## Phase 9: `Bansify/notes` (`notes.bansify.com`) & `Bansify/photos` (`photos.bansify.com`)

Both repositories currently contain only an initial `README.md`. Build and deploy both as 100% Cloudflare-native apps (Vite + React + TypeScript + Tailwind + Cloudflare Worker + D1, zero Supabase):
1. **`Bansify/notes`:**
   - Five-Card Shell (`Notes`, `Checklists`, `Pinned`, `Archive`, `Trash`, `Settings`), D1 `notes` schema (`notes_items` scoped by `owner_username`), `Bansify/accounts` cookie + Bearer (`gothwad-notes`) auth, and rich markdown/checklist editor.
2. **`Bansify/photos`:**
   - Five-Card Shell (`Photos`, `Albums`, `Favorites`, `Shared`, `Trash`, `Settings`), D1 `photos` metadata + Cloudflare R2/D1 media storage, and `Bansify/accounts` cookie + Bearer auth.

---

## Phase 10: Android Ecosystem Final Verification (`accountsapp`, `mailapp`, `aiapp`)

1. In **`Bansify/mailapp`**, replace the last 2 leftover `gothwadtech.com` references in `docs/` or tests with `bansify.com`.
2. Verify `KnownGothwadApps.FIRST_PARTY_PACKAGES` across **`Bansify/accountsapp`**, **`Bansify/mailapp`**, and **`Bansify/aiapp`** includes the exact same set of `com.bansify.*` package names (`com.bansify.accounts`, `com.bansify.mail`, `com.bansify.ai`, `com.bansify.files`, `com.bansify.drive`, `com.bansify.store`, `com.bansify.tube`, `com.bansify.notes`, `com.bansify.contacts`) and ContentProvider authority `${applicationId}.bansify.account.directory`.
3. Run `./gradlew test assembleDebug` across all Android repositories and verify green GitHub Actions CI + signed Release APK artifacts.
