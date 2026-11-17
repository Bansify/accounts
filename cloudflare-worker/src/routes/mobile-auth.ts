/**
 * =============================================================================
 * DIRECT NATIVE ANDROID AUTHENTICATION & CROSS-APP PEER SSO (`/api/mobile/auth/*`)
 * =============================================================================
 * Allows official first-party Android apps (`com.gothwad.accounts`,
 * `com.gothwad.mail`, etc.) to authenticate directly against the Cloudflare
 * Worker over HTTPS JSON (`OkHttp`) with ZERO browser / ZERO WebView required,
 * and to silently mint PKCE authorization codes across installed verified peer
 * apps on the same device without opening a browser or consent screen.
 * =============================================================================
 */

import type { D1Database, Env, ResponseWrapper } from '../types.ts';
import {
  apiError,
  GENDER_VALUES,
  identifierLooksLikePhone,
  isValidEmail,
  isValidNewUsername,
  json,
  parseJsonStringArray,
  readJson,
  RESERVED_USERNAMES,
} from '../http.ts';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  hashPassword,
  issueOAuthAccessToken,
  OAUTH_CODE_TTL_MS,
  randomToken,
  REFRESH_TOKEN_TTL_MS,
  sha256Hex,
  verifyPassword,
} from '../crypto.ts';
import { firstPartyAllowed, requestedScopes } from '../first-party.ts';
import { findOAuthClient, isRedirectUriAllowed, OAUTH_SCOPES, pkceRequestError } from '../oauth-helpers.ts';
import { oauthAccess } from '../oauth-access.ts';
import { fetchProfile, logActivity, lookupAccount, parseUserAgent, presentUser } from '../users.ts';
import { beginMfaSignIn } from '../mfa-login.ts';
import { enabledMfa, matchMfaProof, proofMarkerSql, proofStatement, reserveMfaAttempt } from '../mfa-proofs.ts';
import { handleAuthAccountsRoute } from './auth-accounts.ts';
import { oauthQuery } from '../db.ts';

async function resolveNativeClientAndScopes(
  db: D1Database,
  clientIdRaw: unknown,
  scopeRaw: unknown,
): Promise<{ client: Record<string, any>; scopes: string[] } | { errorResponse: Response }> {
  const clientId = String(clientIdRaw || '').trim();
  const client = await findOAuthClient(db, clientId);
  if (!firstPartyAllowed(client)) {
    return { errorResponse: json({ error: 'unauthorized_client', message: 'Official first-party client_id is required.' }, 400) };
  }
  const defaultScope = parseJsonStringArray(client.allowed_scopes).join(' ');
  const requested = typeof scopeRaw === 'string' && scopeRaw.trim() ? scopeRaw.trim() : defaultScope;
  const scopes = requestedScopes(client, requested, OAUTH_SCOPES);
  if (!scopes) {
    return { errorResponse: json({ error: 'invalid_scope', message: 'Requested scope is not permitted for this client.' }, 400) };
  }
  return { client, scopes };
}

async function mintNativeOAuthSession(
  request: Request,
  db: D1Database,
  env: Env,
  user: { userId: string; username: string; passwordHash: string },
  client: Record<string, any>,
  scopes: string[],
  status = 200,
): Promise<Response> {
  const sessionId = crypto.randomUUID();
  const grantId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const ua = parseUserAgent(request.headers.get('User-Agent') || 'GothwadAndroid/1.0');
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const sessionRefreshRaw = randomToken();
  const sessionRefreshHash = await sha256Hex(sessionRefreshRaw);
  const refreshExpiresIso = new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString();
  const accessExpiresIso = new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString();

  const accessToken = await issueOAuthAccessToken(env, {
    userId: user.userId,
    username: user.username,
    clientId: client.id,
    scopes,
  });
  const accessHash = await sha256Hex(accessToken);
  const oauthRefreshRaw = scopes.includes('offline_access') ? randomToken() : null;
  const oauthRefreshHash = oauthRefreshRaw ? await sha256Hex(oauthRefreshRaw) : null;
  const scopeJson = JSON.stringify(scopes);

  const statements = [
    db
      .prepare(
        `INSERT INTO user_sessions (
           id, user_id, device_name, browser, os, ip_address, remember_me, last_active, is_current, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, 1, ?)`,
      )
      .bind(sessionId, user.userId, ua.device_name || client.name || 'Android', ua.browser || 'Native App', ua.os || 'Android', ip, nowIso, nowIso),
    db
      .prepare(
        `INSERT INTO auth_refresh_tokens (token_hash, user_id, session_id, expires_at, revoked, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
      )
      .bind(sessionRefreshHash, user.userId, sessionId, refreshExpiresIso, nowIso),
    db
      .prepare(
        `INSERT INTO app_authorizations (id, user_id, app_id, scopes, granted_at, last_used_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, app_id) DO UPDATE SET scopes = excluded.scopes, last_used_at = excluded.last_used_at`,
      )
      .bind(grantId, user.userId, client.id, scopeJson, nowIso, nowIso),
    db
      .prepare(
        `INSERT INTO oauth_credential_bindings
           (credential_hash, kind, user_id, client_id, grant_id, password_snapshot, expires_at, bot_verified, source_session_id)
         SELECT ?, 'access', a.user_id, a.app_id, a.id, ?, ?, 1, ?
         FROM app_authorizations a WHERE a.user_id = ? AND a.app_id = ?`,
      )
      .bind(accessHash, user.passwordHash, accessExpiresIso, sessionId, user.userId, client.id),
  ];

  if (oauthRefreshHash) {
    statements.push(
      db
        .prepare(
          `INSERT INTO oauth_refresh_tokens (id, token_hash, user_id, client_id, scopes, expires_at, revoked, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        )
        .bind(crypto.randomUUID(), oauthRefreshHash, user.userId, client.id, scopeJson, refreshExpiresIso, nowIso),
      db
        .prepare(
          `INSERT INTO oauth_credential_bindings
             (credential_hash, kind, user_id, client_id, grant_id, password_snapshot, expires_at, bot_verified, source_session_id)
           SELECT ?, 'refresh', a.user_id, a.app_id, a.id, ?, ?, 1, ?
           FROM app_authorizations a WHERE a.user_id = ? AND a.app_id = ?`,
        )
        .bind(oauthRefreshHash, user.passwordHash, refreshExpiresIso, sessionId, user.userId, client.id),
    );
  }

  await oauthQuery(() => db.batch(statements));
  const profile = await fetchProfile(db, user.userId);
  await logActivity(db, user.userId, 'signin', `Signed in on ${client.name}`, `Scopes: ${scopes.join(', ')}`, request);

  return json(
    {
      ok: true,
      access_token: accessToken,
      ...(oauthRefreshRaw ? { refresh_token: oauthRefreshRaw } : {}),
      token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_TTL_SECONDS,
      scope: scopes.join(' '),
      client_id: client.id,
      session_id: sessionId,
      user: presentUser(profile, env),
    },
    status,
  );
}

export async function handleMobileAuthRoute(
  request: Request,
  url: URL,
  db: D1Database,
  env: Env,
  route: string,
  wrap: ResponseWrapper,
): Promise<Response | null> {
  if (!route.startsWith('/mobile/auth/')) return null;

  // 1. Check Identifier (Username / Email / Phone)
  if (route === '/mobile/auth/check-identifier' && (request.method === 'POST' || request.method === 'GET')) {
    let raw = (url.searchParams.get('identifier') || '').trim();
    if (request.method === 'POST') {
      const body = await readJson(request);
      raw = String(body.identifier || raw || '').trim();
    }
    if (!raw) return wrap(apiError('Please enter your username, email or phone number.', 400));
    const appDomain = (env.APP_DOMAIN || 'gothwadtech.com').toLowerCase();
    if (!identifierLooksLikePhone(raw) && raw.includes('@') && !raw.toLowerCase().endsWith(`@${appDomain}`)) {
      return wrap(json({ ok: false, exists: false, error: `Only @${appDomain} suffix is allowed.`, isThirdParty: true }, 400));
    }
    const found = await lookupAccount(db, raw);
    if (!found.exists) {
      const msg =
        found.kind === 'phone'
          ? "This phone number isn't registered with Gothwad Accounts."
          : "This username doesn't exist. Check the spelling, or create a new account.";
      return wrap(json({ ok: true, exists: false, error: msg }));
    }
    return wrap(json({ ok: true, exists: true, kind: found.kind }));
  }

  // 2. Check Username Availability (for Native Sign-Up)
  if (route === '/mobile/auth/check-username' && (request.method === 'POST' || request.method === 'GET')) {
    let username = (url.searchParams.get('username') || '').toLowerCase().trim();
    if (request.method === 'POST') {
      const body = await readJson(request);
      username = String(body.username || username || '').toLowerCase().trim();
    }
    if (!username || !isValidNewUsername(username)) {
      return wrap(json({ ok: true, available: false, valid: false, error: 'Username must be 3-24 characters (letters and numbers only)' }));
    }
    if (RESERVED_USERNAMES.has(username)) {
      return wrap(json({ ok: true, available: false, valid: true, error: 'This username is reserved' }));
    }
    const row = await db.prepare('SELECT id FROM users WHERE username = ? LIMIT 1').bind(username).first();
    return wrap(json({ ok: true, available: !row, valid: true, username, email: `${username}@${env.APP_DOMAIN}` }));
  }

  // 3. Direct Native Password Sign-In (Zero Browser)
  if (route === '/mobile/auth/signin' && request.method === 'POST') {
    const body = await readJson(request);
    const resolved = await resolveNativeClientAndScopes(db, body.client_id, body.scope);
    if ('errorResponse' in resolved) return wrap(resolved.errorResponse);

    const rawIdentifier = String(body.identifier || '').trim();
    const password = String(body.password || '');
    if (password.length > 128 || rawIdentifier.length > 254) return wrap(apiError('Sign-in input is too long', 400));
    if (!rawIdentifier || !password) return wrap(apiError('Username, email or phone and password are required', 400));

    const appDomain = (env.APP_DOMAIN || 'gothwadtech.com').toLowerCase();
    if (!identifierLooksLikePhone(rawIdentifier) && rawIdentifier.includes('@') && !rawIdentifier.toLowerCase().endsWith(`@${appDomain}`)) {
      return wrap(apiError(`Only @${appDomain} suffix is allowed.`, 400));
    }

    const found = await lookupAccount(db, rawIdentifier);
    if (!found.exists) {
      const msg =
        found.kind === 'phone'
          ? "This phone number isn't registered with Gothwad Accounts."
          : "This username doesn't exist. Check the spelling, or create a new account.";
      return wrap(apiError(msg, 404));
    }

    const validPassword = await verifyPassword(password, found.passwordHash);
    if (!validPassword) {
      return wrap(apiError('Incorrect password. Try again or use Forgot password.', 401));
    }

    const challenge = await beginMfaSignIn(db, found, { remember: true, addMode: false });
    if (challenge) return wrap(challenge);

    return wrap(await mintNativeOAuthSession(request, db, env, found, resolved.client, resolved.scopes, 200));
  }

  // 4. Direct Native MFA Sign-In Verification (TOTP / Backup Code)
  if (route === '/mobile/auth/signin/mfa' && request.method === 'POST') {
    const body = await readJson(request);
    const resolved = await resolveNativeClientAndScopes(db, body.client_id, body.scope);
    if ('errorResponse' in resolved) return wrap(resolved.errorResponse);

    const token = String(body.challenge || '').trim();
    const code = String(body.code || '').trim();
    const failed = () => wrap(json({ error: 'invalid_mfa', message: 'Verification failed or expired. Use a fresh code or sign in again.' }, 401));
    if (!/^[a-f0-9]{64}$/.test(token) || !code || code.length > 128) return failed();

    const hash = await sha256Hex(token);
    const now = new Date().toISOString();
    const challenge = await db
      .prepare(
        `UPDATE auth_mfa_challenges SET attempts = attempts + 1
         WHERE token_hash = ? AND used_by IS NULL AND expires_at > ? AND attempts < 5 RETURNING *`,
      )
      .bind(hash, now)
      .first();
    if (!challenge) return failed();
    if (!(await reserveMfaAttempt(db, String(challenge.user_id)))) {
      return wrap(json({ error: 'rate_limited', message: 'Too many verification attempts. Wait five minutes.' }, 429, { 'Retry-After': '300' }));
    }
    const factor = await enabledMfa(db, String(challenge.user_id));
    if (!factor || factor.version !== challenge.factor_version) return failed();
    const account = await db
      .prepare('SELECT id, username, password_hash FROM users WHERE id = ? AND password_hash = ?')
      .bind(challenge.user_id, challenge.password_hash_snapshot)
      .first();
    if (!account) return failed();
    const proof = await matchMfaProof(env, factor, code);
    if (!proof) return failed();

    const marker = randomToken();
    const live = `EXISTS (SELECT 1 FROM auth_mfa_challenges c JOIN users u ON u.id = c.user_id
      WHERE c.token_hash = ? AND c.user_id = ? AND c.used_by IS NULL AND c.attempts <= 5
        AND c.expires_at > ? AND c.factor_version = ? AND u.password_hash = c.password_hash_snapshot)`;
    const liveBindings = [hash, challenge.user_id, new Date().toISOString(), factor.version];
    const mfaRes = await db.batch([
      proofStatement(db, factor, proof, marker, live, liveBindings),
      db
        .prepare(
          `UPDATE auth_mfa_challenges SET used_by = ? WHERE token_hash = ? AND used_by IS NULL
           AND (${proofMarkerSql(proof)}) RETURNING user_id`,
        )
        .bind(marker, hash, challenge.user_id, marker),
    ]);
    if (!mfaRes[1].results?.length) return failed();

    return wrap(
      await mintNativeOAuthSession(
        request,
        db,
        env,
        { userId: String(account.id), username: String(account.username), passwordHash: String(account.password_hash) },
        resolved.client,
        resolved.scopes,
        200,
      ),
    );
  }

  // 5. Direct Native Sign-Up (Zero Browser)
  if (route === '/mobile/auth/signup' && request.method === 'POST') {
    const body = await readJson(request);
    const resolved = await resolveNativeClientAndScopes(db, body.client_id, body.scope);
    if ('errorResponse' in resolved) return wrap(resolved.errorResponse);

    const firstName = String(body.first_name || '').trim();
    const lastName = String(body.last_name || '').trim();
    const username = String(body.username || '').toLowerCase().trim();
    const password = String(body.password || '');
    const recoveryEmail = String(body.recovery_email || '').toLowerCase().trim();
    const phoneNumber = String(body.phone_number || '').trim();
    const dobRaw = String(body.date_of_birth || '').trim();
    const gender = String(body.gender || '').trim();

    if (!firstName || !lastName) return wrap(apiError('First and last name are required'));
    if (!isValidNewUsername(username)) return wrap(apiError('Username must be 3-24 chars: letters and numbers only'));
    if (RESERVED_USERNAMES.has(username)) return wrap(apiError('This username is reserved'));
    if (password.length < 8) return wrap(apiError('Password must be at least 8 characters'));
    if (password.length > 128) return wrap(apiError('Password must be at most 128 characters'));
    if (!isValidEmail(recoveryEmail)) return wrap(apiError('A valid recovery email is required'));

    if (dobRaw) {
      const d = new Date(dobRaw);
      const dobOk = /^\d{4}-\d{2}-\d{2}$/.test(dobRaw) && !isNaN(d.getTime()) && d < new Date();
      if (!dobOk) return wrap(apiError('Date of birth must be a valid past date (YYYY-MM-DD)'));
    }
    if (gender && !GENDER_VALUES.includes(gender)) {
      return wrap(apiError('Gender must be one of: ' + GENDER_VALUES.join(', ')));
    }

    const existing = await db.prepare('SELECT id FROM users WHERE username = ? LIMIT 1').bind(username).first();
    if (existing) return wrap(apiError('This username is already taken', 409));

    const userId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const passwordHash = await hashPassword(password);

    try {
      await db.batch([
        db
          .prepare('INSERT INTO users (id, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
          .bind(userId, username, passwordHash, nowIso, nowIso),
        db
          .prepare(
            `INSERT INTO profiles (
               id, username, first_name, last_name, recovery_email, phone_number,
               date_of_birth, gender, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(userId, username, firstName, lastName, recoveryEmail, phoneNumber || null, dobRaw || null, gender || null, nowIso, nowIso),
      ]);
    } catch (err: any) {
      if (String(err?.message || '').toLowerCase().includes('unique')) {
        return wrap(apiError('This username is already taken', 409));
      }
      throw err;
    }

    await logActivity(db, userId, 'signup', 'Account created', `Welcome to Gothwad, ${firstName}!`, request);
    return wrap(
      await mintNativeOAuthSession(
        request,
        db,
        env,
        { userId, username, passwordHash },
        resolved.client,
        resolved.scopes,
        201,
      ),
    );
  }

  // 6. Direct Native Forgot Password & Reset Password
  if ((route === '/mobile/auth/forgot-password' || route === '/mobile/auth/reset-password') && request.method === 'POST') {
    const mapped = route.replace('/mobile/auth/', '/auth/');
    return handleAuthAccountsRoute(request, db, env, mapped, wrap);
  }

  // 7. Cross-App Silent Peer Authorization Code Minting (Zero Browser, Zero Permission Screen)
  if (route === '/mobile/auth/peer-code' && request.method === 'POST') {
    const ctx = await oauthQuery(() => oauthAccess(request, db, env));
    if (!ctx) return wrap(json({ error: 'invalid_token' }, 401));

    const body = await readJson(request);
    const targetClientId = String(body.target_client_id || body.client_id || '').trim();
    const targetClient = await findOAuthClient(db, targetClientId);
    if (!firstPartyAllowed(targetClient)) {
      return wrap(json({ error: 'unauthorized_client' }, 400));
    }

    const defaultRedirect = Array.isArray(targetClient.redirect_uris) ? String(targetClient.redirect_uris[0] || '') : '';
    const redirectUri = String(body.redirect_uri || defaultRedirect).trim();
    if (!isRedirectUriAllowed(env, targetClient, redirectUri)) {
      return wrap(apiError('redirect_uri is not registered for target client', 400));
    }

    const defaultScope = parseJsonStringArray(targetClient.allowed_scopes).join(' ');
    const requestedScopeStr = typeof body.scope === 'string' && body.scope.trim() ? body.scope.trim() : defaultScope;
    const scopes = requestedScopes(targetClient, requestedScopeStr, OAUTH_SCOPES);
    if (!scopes) return wrap(json({ error: 'invalid_scope' }, 400));

    const challenge = body.code_challenge ? String(body.code_challenge) : null;
    const method = body.code_challenge_method ? String(body.code_challenge_method) : 'S256';
    const pkceErr = pkceRequestError(targetClient, challenge, method);
    if (pkceErr) return wrap(apiError(pkceErr, 400));

    const user = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(ctx.uid).first();
    if (!user) return wrap(json({ error: 'invalid_token' }, 401));

    const code = randomToken();
    const codeHash = await sha256Hex(code);
    const now = new Date().toISOString();
    const expires = new Date(Date.now() + OAUTH_CODE_TTL_MS).toISOString();
    const scopeJson = JSON.stringify(scopes);
    const sid = ctx.binding.source_session_id || null;

    const live = `EXISTS (SELECT 1 FROM users u
      JOIN ecosystem_apps c ON c.id = ? AND c.first_party = 1 AND c.active = 1 AND c.allowed_scopes = ?
      WHERE u.id = ? AND u.password_hash = ?)`;

    const result = await oauthQuery(() =>
      db.batch([
        db
          .prepare(
            `INSERT INTO app_authorizations (id, user_id, app_id, scopes, granted_at, last_used_at)
             SELECT ?, ?, ?, ?, ?, ? WHERE (${live})
             ON CONFLICT (user_id, app_id) DO UPDATE SET scopes = excluded.scopes, last_used_at = excluded.last_used_at`,
          )
          .bind(crypto.randomUUID(), ctx.uid, targetClient.id, scopeJson, now, now, targetClient.id, targetClient.allowed_scopes, ctx.uid, user.password_hash),
        db
          .prepare(
            `INSERT INTO oauth_auth_codes
               (code, client_id, user_id, redirect_uri, scopes, code_challenge, code_challenge_method, expires_at, used, created_at)
             SELECT ?, ?, ?, ?, ?, ?, ?, ?, 0, ? WHERE (${live}) RETURNING code`,
          )
          .bind(code, targetClient.id, ctx.uid, redirectUri, scopeJson, challenge, method, expires, now, targetClient.id, targetClient.allowed_scopes, ctx.uid, user.password_hash),
        db
          .prepare(
            `INSERT INTO oauth_credential_bindings
               (credential_hash, kind, user_id, client_id, grant_id, password_snapshot, expires_at, bot_verified, source_session_id)
             SELECT ?, 'code', a.user_id, a.app_id, a.id, ?, ?, 1, ? FROM app_authorizations a
             WHERE a.user_id = ? AND a.app_id = ? AND EXISTS (SELECT 1 FROM oauth_auth_codes WHERE code = ?)`,
          )
          .bind(codeHash, user.password_hash, expires, sid, ctx.uid, targetClient.id, code),
      ]),
    );

    if (!result[1].results?.length) {
      return wrap(json({ error: 'invalid_token' }, 401));
    }

    await logActivity(db, ctx.uid, 'app_authorized', `App connected via device SSO: ${targetClient.name}`, `Scopes: ${scopes.join(', ')}`, request);
    return wrap(
      json({
        ok: true,
        code,
        client_id: targetClient.id,
        redirect_uri: redirectUri,
        scope: scopes.join(' '),
        expires_in: Math.floor(OAUTH_CODE_TTL_MS / 1000),
      }),
    );
  }

  return wrap(json({ error: 'not_found' }, 404));
}
