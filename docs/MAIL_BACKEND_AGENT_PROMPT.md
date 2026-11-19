# Bansify Mail Backend (`Bansify/mail`): Copy-Paste Implementation Prompt

Paste the prompt below into the coding agent working in **`Bansify/mail`**.
Do not run this prompt inside `Bansify/accounts` or `Bansify/mailapp`.

---

Work only in this `Bansify/mail` repository on the active session branch. First read `AGENTS.md`, `TASK.md`, `docs/MAIL.md`, `sql/01_mail_schema.sql`, `worker/wrangler.toml`, `worker/src/index.ts`, `worker/src/session.ts`, `worker/src/sessionPayload.ts`, `worker/src/mail-types.ts`, `worker/src/mail-read.ts`, `worker/src/mail-write.ts`, `worker/src/retention.ts`, and `worker/test/*` before editing.

Follow every rule in `AGENTS.md`:
- Every `.ts`, `.tsx`, `.mjs`, `.js`, `.css`, `.html`, `.sql`, and `.md` file must stay strictly `<= 500` lines (`npm run check:sizes`).
- 100% pure English across all code, comments, tests, and documentation (`npm run test:language`).
- Zero hardcoded domains in runtime logic; use `config.appDomain`, `config.authHubUrl`, `config.authSigninUrl`, and `config.mailUrl`.
- Do not edit `Bansify/accounts` or add new Worker secrets.

## Goal

Upgrade the `Bansify/mail` Cloudflare Worker API (`worker/src/*`) so the native Android app (**`Bansify/mailapp`**, package `com.gothwad.mail`, OAuth client `gothwad-mail`) works end-to-end alongside the existing web client, with strict OAuth Bearer scope/audience enforcement, bearer unread metadata, restore-from-trash (Undo), batch mutations, server search, and Empty Trash. Preserve 100% backward compatibility with the existing web frontend (`src/*`) and all existing Worker tests.

## 1. Authoritative `Bansify/accounts` OAuth Contract (Already Live)

In `Bansify/accounts` (`migrations/0014_first_party_native.sql` and `cloudflare-worker/src/routes/oauth.ts`):
- Official public PKCE OAuth registration:
  - `client_id`: `gothwad-mail`
  - `android_package`: `com.gothwad.mail`
  - `redirect_uris`: `["https://mail.bansify.com/oauth/callback", "com.gothwad.mail:/oauth/callback"]`
  - `allowed_scopes`: `["profile", "email", "offline_access", "mail"]`
- `GET {AUTH_HUB_URL}/api/oauth/userinfo` with `Authorization: Bearer <access_token>` validates the JWT signature, `token_use === "oauth_access"`, `first_party = 1`, `active = 1`, and the live `oauth_credential_bindings` + `app_authorizations` grant ledger in Accounts D1, and returns:
  ```json
  {
    "sub": "<user_uuid>",
    "client_id": "gothwad-mail",
    "aud": "gothwad-mail",
    "scope": "email mail offline_access profile",
    "scopes": ["email", "mail", "offline_access", "profile"],
    "preferred_username": "<username>",
    "name": "<Full Name>",
    "given_name": "<First>",
    "family_name": "<Last>",
    "email": "<username>@bansify.com",
    "email_verified": true,
    "picture": "https://..."
  }
  ```

## 2. Enforce OAuth Client Audience & `mail` Scope on Bearer Requests (`worker/src/session.ts` & `worker/src/sessionPayload.ts`)

1. In `worker/src/session.ts` (`resolveBearer`):
   - Call `GET ${config.authHubUrl}/api/oauth/userinfo` with `authorization: authHeader` and `accept: 'application/json'`.
   - Keep the existing status handling (`401`/`403` returns `null` so `requireSession` returns `401 unauthenticated`; `3xx`/`5xx`/network returns `503`).
   - Parse `client_id` / `aud` and `scopes` / `scope` from the JSON body:
     - Require `(body.client_id === 'gothwad-mail' || body.aud === 'gothwad-mail')`.
     - Parse granted scopes from `Array.isArray(body.scopes) ? body.scopes : typeof body.scope === 'string' ? body.scope.trim().split(/\s+/).filter(Boolean) : []`.
     - Require `scopes.includes('mail')`.
     - If `client_id`/`aud` is not `'gothwad-mail'` or `'mail'` is not in `scopes`, throw `new HttpError(403, 'insufficient_scope', 'OAuth token is not authorized for Bansify Mail.')`. Do not accept identity-only tokens minted for other clients (such as `kiwi-store` or `gothwad-tube`).
   - Extract `given_name` and `family_name` when strings are provided by `/api/oauth/userinfo`, falling back to splitting `name`.
   - Populate `accounts` in the returned `Session` for `source: 'bearer'` with a single `PublicAccount` entry for the authenticated user (`id: 'bearer'`, `authuser: 0`, `username`, `name`, `firstName`, `lastName`, `email`, `avatarUrl`, `accountUrl: "${config.authSigninUrl}/me"`, `lastUsedAt: null`) so `loadSessionMeta()` (`worker/src/sessionPayload.ts`) computes `unread: { [session.username]: <count> }` for Bearer callers on `GET /api/session` and `GET /api/session/meta`.

## 3. Add Native Mail Operations Needed by `Bansify/mailapp` (`worker/src/mail-types.ts`, `mail-read.ts`, `mail-write.ts`, `index.ts`)

Keep all files `<= 500` lines (split cleanly into focused modules if any file approaches 500 lines):

1. **Restore from Trash / Folder Move (`PATCH /api/mail/messages/:id`)**:
   - In `parsePatch` (`worker/src/mail-write.ts`), keep existing `{ isRead?: boolean, isStarred?: boolean, moveToTrash?: true }` support for web compatibility, and additionally allow:
     - `moveToInbox?: true` (or `folder?: 'inbox' | 'trash'`) so `Bansify/mailapp` can undo a swipe-to-trash or restore a message from Trash back to `'inbox'` (`WHERE id = ? AND to_username = ?`).
2. **Batch Message Actions (`POST /api/mail/messages/batch`)**:
   - Require a verified session and `assertSafeWrite(request, config)`.
   - Accept `{ ids: string[], isRead?: boolean, isStarred?: boolean, moveToTrash?: boolean, moveToInbox?: boolean, deleteFromTrash?: boolean }`:
     - Validate `ids` is a non-empty array of 1..100 valid message UUIDs (`parseId`).
     - Scope every SQL statement strictly with `WHERE to_username = ? AND id IN (...)`.
     - If `deleteFromTrash === true`, permanently delete matching rows where `folder = 'trash'` (`DELETE FROM mail_messages WHERE to_username = ? AND folder = 'trash' AND id IN (...)`) and return `{ ok: true, updated: <count> }`.
     - Otherwise update the requested `is_read`, `is_starred`, or `folder` (`'trash'` / `'inbox'`) columns and return `{ ok: true, updated: <count> }`.
3. **Empty Trash (`DELETE /api/mail/trash`)**:
   - Require a verified session and `assertSafeWrite(request, config)`.
   - Execute `DELETE FROM mail_messages WHERE to_username = ? AND folder = 'trash'` and return `{ ok: true, deleted: <count> }`.
4. **Server-Side Search & Filter Query Parameters on `GET /api/mail/messages`**:
   - In `parseListOptions` and `listMessages` (`worker/src/mail-read.ts`):
     - Make `folder` optional when a search query `q` or filter is provided, or support `folder=all` (which queries `folder IN ('inbox', 'sent', 'drafts')`, excluding `'trash'`) in addition to `'inbox' | 'starred' | 'sent' | 'drafts' | 'trash'`.
     - Support optional query parameters:
       - `q`: trimmed search string (1..200 chars). Filter case-insensitively across `subject`, `from_email`, `from_name`, `to_email`, and `snippet` (`LIKE '%' || ? || '%'` with escaped `%`/`_`).
       - `unread=1` or `unread=true`: filter `is_read = 0`.
       - `starred=1` or `starred=true`: filter `is_starred = 1`.
       - `hasAttachment=1` or `hasAttachment=true`: filter `attachments != '[]' AND attachments != ''`.
     - Keep `limit` (1..100, default 50) and `before` (ISO timestamp cursor) working identically.

## 4. Web OAuth Callback Passthrough for Android App Links (`public/_redirects` or Web Route)

- The web app at `https://mail.bansify.com` uses cookie SSO (`/u/0/`), while `Bansify/mailapp` registers `com.gothwad.mail:/oauth/callback` and `https://mail.bansify.com/oauth/callback`.
- Add a lightweight static callback bridge at `public/oauth/callback/index.html` (or handle `/oauth/callback` cleanly without breaking `/u/:n/` routing) that redirects `https://mail.bansify.com/oauth/callback?code=...&state=...` on Android to `intent://mail.bansify.com/oauth/callback?...#Intent;scheme=https;package=com.gothwad.mail;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end` (and provides a fallback button to `com.gothwad.mail:/oauth/callback?...`), plus `public/.well-known/assetlinks.json` for `com.gothwad.mail` with fingerprint `50:4E:2F:C7:8A:B6:8E:01:8B:84:8F:C1:02:76:2E:44:99:A0:88:03:41:2E:66:A4:0B:2B:09:40:3C:61:49:B6`.

## 5. Verification & Tests Required Before Finishing

Add unit/integration tests in `worker/test/` covering:
1. Bearer token with `client_id: 'gothwad-mail'` and `scopes: ['profile', 'email', 'offline_access', 'mail']` succeeds on `/api/session`, `/api/mail/messages`, `/api/mail/send`, etc., and returns unread count for the bearer user.
2. Bearer token for another client (e.g. `client_id: 'kiwi-store'`) or missing `'mail'` scope is rejected with `403 insufficient_scope`.
3. `PATCH /api/mail/messages/:id` with `{ moveToInbox: true }` restores a trashed message to `'inbox'`.
4. `POST /api/mail/messages/batch` and `DELETE /api/mail/trash` enforce `to_username` isolation and never touch another user's rows.
5. `GET /api/mail/messages?q=...&unread=1&starred=1&hasAttachment=1` returns matching messages only for the authenticated user.

Run and pass all checks before finishing:
```bash
npm run check:sizes
npm run lint
npm run build
npm test
npx wrangler deploy --config worker/wrangler.toml --dry-run
```
Update `TASK.md` cleanly before finishing.
