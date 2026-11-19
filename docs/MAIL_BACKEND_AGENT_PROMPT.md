# Bansify Mail (`Bansify/mail`): Complete Audit, Domain/Wire Fix & Post-Merge Guide Prompt

Paste the prompt below into the coding agent working in **`Bansify/mail`**.
Do not run this prompt inside `Bansify/accounts` or `Bansify/mailapp`.

---

Work only in this `Bansify/mail` repository on the active session branch. First read `AGENTS.md`, `README.md`, `TASK.md`, `PLAN.md`, `package.json`, `worker/wrangler.toml`, `worker/src/config.ts`, `worker/src/session.ts`, `worker/src/accounts.ts`, `worker/src/authuser.ts`, `src/services/mailApi.ts`, `src/services/authuser.ts`, `src/services/accountWidget.ts`, `src/components/Header.tsx`, `src/components/MobileDrawer.tsx`, `public/oauth/callback/index.html`, `public/.well-known/assetlinks.json`, `tools/dev-server.mjs`, `tools/account-menu-widget.stub.js`, `tests/*`, and `worker/test/*` before editing.

Follow every rule in `AGENTS.md`:
- Every `.ts`, `.tsx`, `.mjs`, `.js`, `.css`, `.html`, `.sql`, and `.md` file must stay strictly `<= 500` lines (`npm run check:sizes`).
- 100% pure English across all code, comments, tests, and documentation (`npm run test:language`).
- Zero hardcoded domains in runtime logic; use `config.appDomain`, `config.authHubUrl`, `config.authSigninUrl`, and `config.mailUrl`.
- Do not edit `Bansify/accounts` or commit real secret values.

---

## Why `Bansify/mail` Is Currently Broken After PR #17 (`9e92a89`)

PR #17 (`krinry:rename-app-to-bansify`) performed a blind search-and-replace of `gothwad` -> `bansify`, which introduced 6 critical regressions:

1. **Wrong Domain (`bansifytech.com` instead of `bansify.com`):**
   Replacing `gothwad` with `bansify` turned `gothwadtech.com` into the non-existent domain **`bansifytech.com`** (`api.bansifytech.com`, `accounts.bansifytech.com`, `mail.bansifytech.com`) across `worker/wrangler.toml`, `worker/src/config.ts`, `src/services/mailApi.ts`, `public/oauth/callback/index.html`, docs, and tests. The real production domain is **`bansify.com`** (`api.bansify.com`, `accounts.bansify.com`, `mail.bansify.com`).
2. **Broken Upstream `Bansify/accounts` Cookie Forwarding (`worker/src/session.ts`):**
   `Bansify/accounts` issues session and multi-account slot cookies prefixed with `gothwad_` (`gothwad_session`, `gothwad_session_a`..`f`, `gothwad_refresh_a`..`f`, `gothwad_active_account`, `gothwad_accounts`). PR #17 changed `keepAccountsCookies()` in `worker/src/session.ts` to `/^bansify_[a-z_]+=/i`, causing the Mail Worker to drop all rotated cookies from `Bansify/accounts`!
3. **Broken Per-Tab `authuser` Header Compatibility (`worker/src/authuser.ts`, `worker/src/session.ts`, `worker/src/accounts.ts`):**
   PR #17 changed the header to `x-bansify-authuser` only. Mail must accept both `x-bansify-authuser` and `x-gothwad-authuser` on incoming requests and send `x-gothwad-authuser` (or both headers) when calling `Bansify/accounts` upstream.
4. **Broken OAuth Client ID Check (`worker/src/session.ts`):**
   `Bansify/accounts` registers Bansify Mail in D1 `ecosystem_apps` with `client_id = 'gothwad-mail'`. PR #17 changed `MAIL_OAUTH_CLIENT_ID` to `'bansify-mail'`, rejecting real OAuth Bearer tokens from `Bansify/accounts` with `403 insufficient_scope`.
5. **Broken Android App Links & OAuth Callback Bridge (`public/.well-known/assetlinks.json` & `public/oauth/callback/index.html`):**
   `Bansify/mailapp` uses Android `applicationId = "com.gothwad.mail"`. PR #17 replaced `com.gothwad.mail` with `com.bansify.mail` and `mail.bansifytech.com`.
6. **Broken Local UI Test Harness & Widget Stub (`tools/account-menu-widget.stub.js` & `tools/dev-server.mjs`):**
   PR #17 updated `tests/ui-harness.tsx` to expect `BansifyAccountMenu`, `[data-bansify-account-menu-stub]`, `bansify_at=good`, and `x-bansify-authuser`, but left `tools/account-menu-widget.stub.js` and `tools/dev-server.mjs` untouched on `GothwadAccountMenu` and `gothwad_at=good`, breaking `npm run test:ui`!

---

## Required Fixes in `Bansify/mail`

### 1. Fix Domain Configuration & Defaults (`bansifytech.com` / `gothwadtech.com` -> `bansify.com`)

1. **`worker/wrangler.toml`**:
   - Set:
     ```toml
     APP_DOMAIN = "bansify.com"
     AUTH_HUB_URL = "https://api.bansify.com"
     AUTH_SIGNIN_URL = "https://accounts.bansify.com"
     MAIL_URL = "https://mail.bansify.com"
     ```
   - Update all comments in `worker/wrangler.toml` from `bansifytech.com` to `bansify.com` (`mail.bansify.com/api/*`, `*@bansify.com`, `accounts.bansify.com`, `api.bansify.com`).
2. **`worker/src/config.ts`**:
   - Set:
     ```ts
     const DEFAULT_APP_DOMAIN = 'bansify.com';
     const DEFAULT_AUTH_HUB_URL = 'https://accounts.bansify.com';
     const DEFAULT_MAIL_URL = 'https://mail.bansify.com';
     ```
   - Update comments from `bansifytech.com` to `bansify.com`.
3. **`src/services/mailApi.ts`**:
   - In `reauthUrl`, change `https://accounts.bansifytech.com/signin?${qs.toString()}` to `https://accounts.bansify.com/signin?${qs.toString()}`.
   - Update comments from `mail.bansifytech.com` to `mail.bansify.com`.
4. **`.env.example` and `worker/.dev.vars.example`**:
   - Replace all `gothwadtech.com` and `bansifytech.com` references with `bansify.com` (`https://api.bansify.com`, `https://accounts.bansify.com`, `https://mail.bansify.com`).
5. **All Documentation & Tests (`AGENTS.md`, `README.md`, `PLAN.md`, `TASK.md`, `docs/*.md`, `tests/*`, `worker/test/*`)**:
   - Replace every occurrence of `bansifytech.com` and `gothwadtech.com` with `bansify.com`.
   - Replace `BansifyTech/accounts` and `GothwadTech/accounts` with `Bansify/accounts`.
   - In `tests/worker-config.test.ts`, ensure the assertion checks `assert.notEqual(hub, 'https://accounts.bansify.com', ...)`.

### 2. Restore Wire Compatibility with `Bansify/accounts` (`worker/src/session.ts`, `worker/src/authuser.ts`, `worker/src/accounts.ts`)

1. **Upstream Cookie Forwarding (`worker/src/session.ts` & `tests/ui-harness.tsx`)**:
   - In `keepAccountsCookies` (`worker/src/session.ts`), accept both `gothwad_*` (live `Bansify/accounts` cookies) and `bansify_*` cookies:
     ```ts
     const cookies = all.filter((c) => /^(?:gothwad|bansify)_[a-z0-9_]+=/i.test(c));
     ```
   - In `tests/ui-harness.tsx`, update the `Set-Cookie` jar filter so it captures both `bansify_` and `gothwad_` cookies:
     ```ts
     if (name && (name.startsWith('bansify_') || name.startsWith('gothwad_'))) {
     ```
2. **Per-Tab `authuser` Header (`worker/src/authuser.ts`, `worker/src/session.ts`, `worker/src/accounts.ts`)**:
   - In `worker/src/authuser.ts` (`authUserFromRequest`), read either header:
     ```ts
     const header = normalizeAuthUser(
       request.headers.get('x-bansify-authuser') ?? request.headers.get('x-gothwad-authuser')
     );
     ```
   - In `worker/src/session.ts` (`resolveCookie`) and `worker/src/accounts.ts` (`callAccounts`), keep setting `headers['x-bansify-authuser'] = selector` AND also set `headers['x-gothwad-authuser'] = selector` (or ensure tests and upstream `Bansify/accounts` both receive the header they expect — note that `worker/test/*.test.ts` inspects `s.headers.get('x-bansify-authuser')`, while `Bansify/accounts` accepts both `X-Gothwad-Authuser` and `X-Bansify-Authuser`!). Setting both `headers['x-bansify-authuser'] = selector` and `headers['x-gothwad-authuser'] = selector` satisfies both existing unit tests and `Bansify/accounts`.
3. **OAuth Client ID (`worker/src/session.ts`)**:
   - Keep `export const MAIL_OAUTH_CLIENT_ID = 'bansify-mail';` AND define:
     ```ts
     const ACCEPTED_MAIL_OAUTH_CLIENT_IDS = new Set(['bansify-mail', 'gothwad-mail']);
     ```
   - In `assertMailToken(body, res)`:
     ```ts
     const validClient =
       (clientId !== null && ACCEPTED_MAIL_OAUTH_CLIENT_IDS.has(clientId)) ||
       (audience !== null && ACCEPTED_MAIL_OAUTH_CLIENT_IDS.has(audience));
     if (!validClient) {
       warnUpstreamFailure(INSUFFICIENT_SCOPE, res);
       throw new HttpError(403, INSUFFICIENT_SCOPE, 'OAuth token is not authorized for Bansify Mail.', {
         requiredClient: MAIL_OAUTH_CLIENT_ID,
       });
     }
     ```
   - Add a test in `worker/test/oauth-scope.test.ts` proving that a Bearer token with `client_id: 'gothwad-mail'` and `scope: 'profile email mail'` is also accepted alongside `bansify-mail`.

### 3. Fix Android App Links & OAuth Callback Bridge (`public/.well-known/assetlinks.json` & `public/oauth/callback/index.html`)

1. **`public/oauth/callback/index.html`**:
   - Fix `intent://mail.bansifytech.com/oauth/callback` -> `intent://mail.bansify.com/oauth/callback`.
   - Ensure the bridge supports both `com.bansify.mail` and `com.gothwad.mail` (keep `com.bansify.mail:/oauth/callback` and `package=com.bansify.mail` or `com.gothwad.mail` so `tests/assets.test.ts` passes and Android handoff works).
2. **`public/.well-known/assetlinks.json`**:
   - Ensure `public/.well-known/assetlinks.json` is valid JSON with SHA-256 fingerprint `50:4E:2F:C7:8A:B6:8E:01:8B:84:8F:C1:02:76:2E:44:99:A0:88:03:41:2E:66:A4:0B:2B:09:40:3C:61:49:B6` and passes `tests/assets.test.ts` (you may include entries for both `com.bansify.mail` and `com.gothwad.mail`, keeping `links[0].target.package_name === 'com.bansify.mail'` and updating `tests/assets.test.ts` if `links.length` is checked).

### 4. Fix Shared Account Widget Loader & Local Preview/Test Harness (`src/services/accountWidget.ts`, `tools/account-menu-widget.stub.js`, `tools/dev-server.mjs`)

1. **`src/services/accountWidget.ts`**:
   - Check `BansifyAccountMenu ?? GothwadAccountMenu` on both the imported module and `window` so the widget loads whether the host defines `BansifyAccountMenu` or `GothwadAccountMenu`.
2. **`tools/account-menu-widget.stub.js`**:
   - Change `HOST_TAG` to `'data-bansify-account-menu-stub'`.
   - Update user-visible labels in the stub (`aria-label="Bansify Account menu"`, `Manage your Bansify Account`, `Bansify Accounts • local widget stub`).
   - Export both `export const BansifyAccountMenu = new Controller();` and `export const GothwadAccountMenu = BansifyAccountMenu;`, and set both `globalThis.window.BansifyAccountMenu` and `globalThis.window.GothwadAccountMenu`.
3. **`tools/dev-server.mjs`**:
   - Rewrite the top comment block (lines 1–19) in 100% pure English.
   - Update default `APP_DOMAIN` to `'bansify.com'` and `AUTH_HUB_URL` to `'https://api.bansify.com'`.
   - Accept both `bansify_active=` and `gothwad_active=` cookies (`/(?:bansify|gothwad)_active=([a-f])/.exec(cookie || '')`), set both `bansify_active=${account.id}` and `gothwad_active=${account.id}` in `Set-Cookie`, accept both `bansify_at=good` and `gothwad_at=good` (and `bansify_at=no_username` / `gothwad_at=no_username`), and read `headers.get('x-bansify-authuser') || headers.get('x-gothwad-authuser')`.
   - Update seeded sample messages from `Gothwad Mail` / `gothwadtech.com` to `Bansify Mail` / `bansify.com`.

### 5. Clean Up Header Branding (`src/components/Header.tsx` & `src/components/MobileDrawer.tsx`)

- In `src/components/Header.tsx` and `src/components/MobileDrawer.tsx`, restore the two-tone brand lockup using **Bansify Mail**:
  ```tsx
  Bansify<span className="text-[#0494f4] font-semibold ml-1">Mail</span>
  ```
  (instead of lowercase `bansify`), and verify all UI smoke tests (`tests/ui-smoke.test.tsx`, `tests/ui-switcher.test.tsx`, `tests/ui-startup.test.tsx`) pass.

---

## 6. Verification, PR Merge & Live Check-Run Inspection

1. Run the full verification suite and confirm 0 errors:
   ```bash
   npm run check:sizes
   npm run lint
   npm run build
   npm test
   npx wrangler deploy --config worker/wrangler.toml --dry-run
   ```
2. Commit your changes, push to the active branch (`git push -u origin <active-branch>`), create a pull request against `main`, and merge it using `gh pr merge <number> --merge`.
3. After merging, check the GitHub check-runs on the new `main` merge commit:
   ```bash
   MAIN_SHA=$(gh api repos/Bansify/mail/commits/main --jq '.sha')
   gh api "repos/Bansify/mail/commits/$MAIN_SHA/check-runs" --jq '.check_runs[] | {name, status, conclusion, started_at, completed_at, details_url}'
   ```
   Wait 20–30 seconds if needed and report whether `Cloudflare Pages` (`gtwdmail`) and `Workers Builds: mail` triggered and succeeded on `main` (if they did not trigger on `Bansify/mail`, explain that the Cloudflare GitHub integration is still linked to the old `GothwadTech/mail` repository and needs to be reconnected using the steps below).

---

## 7. Mandatory Final Response Format: Click-by-Click Dashboard Setup Guide

In your final reply to the user (written in 100% pure English), after summarizing the merged PR and check-run results, **you MUST include a complete, click-by-click Cloudflare Dashboard & Resend setup guide** with every click and exact value explained in detail:

1. **Step 1 — Reconnect Cloudflare Pages (`gtwdmail`) to `Bansify/mail` & Attach `mail.bansify.com`:**
   - **Workers & Pages** -> **`gtwdmail`** (Pages project) -> **Settings** -> **Build** -> **Git Repository** -> **Disconnect**, then **Connect to Git** -> Organization **`Bansify`**, Repository **`mail`**, Production branch **`main`**, Build command `npm run build`, Build output directory `dist` -> **Save and Deploy**.
   - **Custom domains** tab -> **Set up a custom domain** -> enter `mail.bansify.com` -> **Continue** -> **Activate domain** (and remove `mail.gothwadtech.com` once active).
2. **Step 2 — Reconnect Cloudflare Worker (`mail`) to `Bansify/mail` & Add Route `mail.bansify.com/api/*`:**
   - **Workers & Pages** -> **`mail`** (Worker) -> **Settings** -> **Build** -> **Git Repository** -> reconnect to **`Bansify/mail`** (`main`).
   - In **Build configuration**, click **Edit** (pencil icon) and verify:
     - **Root directory**: `/`
     - **Build command**: `npm run lint` (or leave empty; do not run `vite build` for the Worker)
     - **Deploy command**: `npx wrangler deploy --config worker/wrangler.toml`
     - **Non-production branch deploy command (Preview command)**: `npx wrangler versions upload --config worker/wrangler.toml`
   - In **`mail`** Worker -> **Settings** -> **Domains & Routes** -> **+ Add** -> **Route**:
     - **Zone**: `bansify.com`
     - **Route**: `mail.bansify.com/api/*`
     - Click **Add route**.
3. **Step 3 — Configure Cloudflare Email Routing (`*@bansify.com` -> `mail` Worker) for Inbound Emails:**
   - In the Cloudflare left sidebar, click **Websites** -> select **`bansify.com`** -> click **Email** -> **Email Routing** in the left menu.
   - If Email Routing is not enabled yet on `bansify.com`, click **Get started** / **Enable Email Routing** -> **Add records and enable** (adds the Cloudflare MX and SPF DNS records automatically).
   - Open the **Routing rules** tab -> under **Catch-all address**, click **Edit**:
     - **Action**: select **Send to a Worker**
     - **Destination**: select **`mail`**
     - Toggle the Catch-all status switch to **Active** (Enabled) and click **Save**.
4. **Step 4 — Verify `mail` Worker Variables & Secrets:**
   - Open **Workers & Pages** -> **`mail`** -> **Settings** -> **Variables and Secrets**:
     - Confirm plain-text variables match `worker/wrangler.toml`:
       - `APP_DOMAIN` = `bansify.com`
       - `AUTH_HUB_URL` = `https://api.bansify.com`
       - `AUTH_SIGNIN_URL` = `https://accounts.bansify.com`
       - `MAIL_URL` = `https://mail.bansify.com`
     - Confirm encrypted **Secrets** are present:
       - `ACCOUNTS_INTERNAL_TOKEN`: must have the exact same secret value as `MAIL_INTERNAL_TOKEN` on the `accounts` Worker.
       - `RESEND_API_KEY`: your Resend API key (`re_...`) for sending outbound emails.
5. **Step 5 — Verify `bansify.com` in Resend for Outbound Emails (`username@bansify.com`):**
   - Open **https://resend.com/domains** -> click **+ Add Domain**:
     - **Name**: `bansify.com` (the root domain, because Mail sends from `username@bansify.com`, whereas Accounts uses `noreply.bansify.com`)
     - Click **Add** -> **Sign in to Cloudflare** (or copy the DKIM/SPF TXT records into Cloudflare DNS for `bansify.com`, keeping **Proxy status: DNS only**) -> click **Verify DNS Records**.
6. **Step 6 — Final Live Verification:**
   - Open `https://mail.bansify.com/api/health` and confirm it returns `{"ok":true,"service":"bansify-mail","engine":"cloudflare-d1-native","environment":"production",...}` with all `configured` flags `true`.
   - Open `https://mail.bansify.com` in the browser and test signing in, switching accounts, sending an email, and receiving an email to `<username>@bansify.com`.
