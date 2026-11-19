/** Full native Android account & security management (`/api/mobile/*`). */
import type { D1Database, Env, ResponseWrapper } from '../types.ts';
import { apiError, isValidEmail, json, parseJsonStringArray, readJson } from '../http.ts';
import { hashPassword, randomToken, sha256Hex } from '../crypto.ts';
import { accessGate, type OAuthAccess } from '../oauth-access.ts';
import { confirmAccountCredential, hasPassword } from '../google-proofs.ts';
import { authorizeActionMfa, enabledMfa, matchMfaProof, proofMarkerSql, proofStatement, reserveMfaAttempt } from '../mfa-proofs.ts';
import { mfaConfigured, newRecoveryCodes } from '../mfa-crypto.ts';
import { prepareMfaEnrollment, confirmMfaEnrollment } from '../mfa-enrollment.ts';
import { fetchProfile, logActivity, presentUser } from '../users.ts';
import { sendSecurityEmail } from '../security-email.ts';

export async function handleMobileSecurityRoute(
  request: Request, db: D1Database, env: Env, route: string, ctx: OAuthAccess, wrap: ResponseWrapper,
): Promise<Response | null> {
  const uid = ctx.uid;
  const sid = ctx.binding.source_session_id || '';
  const gate = accessGate(ctx);

  // 1. Revoke Individual Session (`POST /mobile/sessions/revoke`)
  if (route === '/mobile/sessions/revoke' && request.method === 'POST') {
    const body = await readJson(request);
    const targetSid = String(body.session_id || '').trim();
    if (!targetSid) return wrap(apiError('session_id is required', 400));
    if (sid && targetSid === sid) {
      return wrap(apiError('Cannot revoke the current device session from this endpoint; use sign-out instead.', 400));
    }
    const res = await db.batch([
      db.prepare(`UPDATE auth_refresh_tokens SET revoked = 1 WHERE user_id = ? AND session_id = ? AND (${gate.sql})`).bind(uid, targetSid, ...gate.values),
      db.prepare(`DELETE FROM user_sessions WHERE user_id = ? AND id = ? AND (${gate.sql}) RETURNING id`).bind(uid, targetSid, ...gate.values),
    ]);
    await logActivity(db, uid, 'session_revoked', 'Device signed out', 'From Accounts Android', request);
    return wrap(json({ ok: true, revoked: res[1].results?.length || 0 }));
  }

  // 2. Update or Clear Phone Number (`POST /mobile/phone`)
  if (route === '/mobile/phone' && request.method === 'POST') {
    const body = await readJson(request);
    const phone = typeof body.phone_number === 'string' ? body.phone_number.trim() : null;
    if (phone === null || phone.length > 32 || (phone && !/^\+?[0-9 ()-]{7,24}$/.test(phone))) {
      return wrap(apiError('Enter a valid phone number', 400));
    }
    const password = String(body.current_password || '');
    const account = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(uid).first();
    if (!account || !(await confirmAccountCredential(request, db, uid, sid, password, String(account.password_hash)))) {
      return wrap(apiError('Verify your current password to change your phone number', 400));
    }
    const proof = await authorizeActionMfa(db, env, uid, String(body.mfa_code || '').trim());
    if (!proof) return wrap(json({ error: 'mfa_required', message: 'Enter a fresh authenticator code or unused recovery code.' }, 400));
    const updated = await db
      .prepare(`UPDATE profiles SET phone_number = ?, updated_at = ? WHERE id = ? AND (${proof.sql}) AND (${gate.sql}) RETURNING id`)
      .bind(phone || null, new Date().toISOString(), uid, ...proof.bindings, ...gate.values).first();
    if (!updated) return wrap(apiError('Security state changed. Verify again before retrying.', 409));
    await logActivity(db, uid, 'profile_update', 'Phone number updated', 'From Accounts Android', request);
    const profile = await fetchProfile(db, uid);
    return wrap(json({ ok: true, phone_number: profile?.phone_number || null, user: presentUser(profile, env) }));
  }

  // 3. Upload or Remove Avatar (`POST /mobile/avatar`, `DELETE /mobile/avatar`)
  if (route === '/mobile/avatar' && request.method === 'POST') {
    const body = await readJson(request);
    const raw = String(body.image_base64 || '');
    if (!raw) return wrap(apiError('image_base64 is required', 400));
    let b64 = raw;
    let mime = String(body.mime || 'image/jpeg');
    const m = raw.match(/^data:(image\/(?:jpeg|png|webp));base64,(.*)$/s);
    if (m) { mime = m[1]; b64 = m[2]; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) return wrap(apiError('Only JPEG, PNG or WebP images are allowed', 400));
    let bytes: Uint8Array;
    try {
      const bin = atob(b64.replace(/\s+/g, ''));
      bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    } catch { return wrap(apiError('Invalid base64 image data', 400)); }
    if (!bytes.length || bytes.length > 2 * 1024 * 1024) return wrap(apiError('Photo must be between 1 byte and 2 MB', 400));

    const etag = (await sha256Hex(bytes)).slice(0, 16);
    const nowIso = new Date().toISOString();
    if (env.AVATARS_BUCKET) {
      await env.AVATARS_BUCKET.put(`avatars/${uid}`, bytes, { httpMetadata: { contentType: mime } });
    } else {
      await db.prepare(
        `INSERT INTO user_avatars (user_id, mime_type, data, byte_size, etag, updated_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET mime_type = excluded.mime_type, data = excluded.data,
           byte_size = excluded.byte_size, etag = excluded.etag, updated_at = excluded.updated_at`,
      ).bind(uid, mime, bytes, bytes.length, etag, nowIso).run();
    }
    const relativeAvatarPath = `/api/avatars/${encodeURIComponent(uid)}?v=${etag}`;
    await db.prepare(`UPDATE profiles SET avatar_url = ?, updated_at = ? WHERE id = ? AND (${gate.sql})`)
      .bind(relativeAvatarPath, nowIso, uid, ...gate.values).run();
    await logActivity(db, uid, 'avatar_update', 'Profile photo changed', 'From Accounts Android', request);
    const presented = presentUser(await fetchProfile(db, uid), env);
    return wrap(json({ ok: true, avatar_url: presented?.avatar_url || null, user: presented }));
  }

  if (route === '/mobile/avatar' && request.method === 'DELETE') {
    if (env.AVATARS_BUCKET) await env.AVATARS_BUCKET.delete(`avatars/${uid}`).catch(() => undefined);
    await db.batch([
      db.prepare('DELETE FROM user_avatars WHERE user_id = ?').bind(uid),
      db.prepare(`UPDATE profiles SET avatar_url = NULL, updated_at = ? WHERE id = ? AND (${gate.sql})`)
        .bind(new Date().toISOString(), uid, ...gate.values),
    ]);
    await logActivity(db, uid, 'avatar_update', 'Profile photo removed', 'From Accounts Android', request);
    const presented = presentUser(await fetchProfile(db, uid), env);
    return wrap(json({ ok: true, avatar_url: null, user: presented }));
  }

  // 4. Native Password Change / Add (`POST /mobile/password`)
  if (route === '/mobile/password' && request.method === 'POST') {
    const body = await readJson(request);
    const current = String(body.current_password || '');
    const next = String(body.new_password || '');
    if (next.length < 8 || next.length > 128) return wrap(apiError('New password must be between 8 and 128 characters', 400));
    const account = await db.prepare('SELECT password_hash FROM users WHERE id = ?').bind(uid).first();
    if (!account) return wrap(json({ error: 'invalid_token' }, 401));
    const hadPwd = hasPassword(account.password_hash);
    if (hadPwd && !(await confirmAccountCredential(request, db, uid, sid, current, String(account.password_hash)))) {
      return wrap(apiError('Current password is incorrect', 400));
    }
    const proof = await authorizeActionMfa(db, env, uid, String(body.mfa_code || '').trim());
    if (!proof) return wrap(json({ error: 'mfa_required', message: 'Enter a fresh authenticator code or unused recovery code.' }, 400));
    const newHash = await hashPassword(next);
    const nowIso = new Date().toISOString();
    const won = 'EXISTS (SELECT 1 FROM users WHERE id = ? AND password_hash = ?)';
    const params = [uid, newHash];
    const results = await db.batch([
      db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ? AND password_hash = ? AND (${proof.sql}) RETURNING id`)
        .bind(newHash, nowIso, uid, account.password_hash, ...proof.bindings),
      db.prepare(`UPDATE oauth_credential_bindings SET password_snapshot = ? WHERE user_id = ? AND grant_id = ? AND (${won})`)
        .bind(newHash, uid, ctx.binding.grant_id, ...params),
      db.prepare(`DELETE FROM oauth_credential_bindings WHERE user_id = ? AND grant_id <> ? AND (${won})`)
        .bind(uid, ctx.binding.grant_id, ...params),
      db.prepare(`UPDATE auth_refresh_tokens SET revoked = 1 WHERE user_id = ? AND (session_id IS NULL OR session_id <> ?) AND (${won})`)
        .bind(uid, sid, ...params),
      db.prepare(`DELETE FROM user_sessions WHERE user_id = ? AND id <> ? AND (${won})`).bind(uid, sid, ...params),
      db.prepare(`DELETE FROM recovery_email_changes WHERE user_id = ? AND (${won})`).bind(uid, ...params),
      db.prepare(`UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0 AND (${won})`).bind(uid, ...params),
    ]);
    if (!results[0].results?.length) return wrap(apiError('Security state changed. Verify again before retrying.', 409));
    await logActivity(db, uid, 'password_change', hadPwd ? 'Password changed' : 'Password added', 'Updated from Accounts Android; other devices signed out', request);
    return wrap(json({ ok: true, user: presentUser(await fetchProfile(db, uid), env), message: 'Password saved. Other devices were signed out.' }));
  }

  // 5. Native Recovery Email Request & Verification (`POST /mobile/recovery-email/request`, `POST /mobile/recovery-email/verify`)
  if (route === '/mobile/recovery-email/request' && request.method === 'POST') {
    const body = await readJson(request);
    const newEmail = String(body.recovery_email || '').trim().toLowerCase();
    const password = String(body.current_password || '');
    if (!isValidEmail(newEmail) || newEmail.length > 254) return wrap(apiError('Enter a valid recovery email', 400));
    const account = await db.prepare('SELECT u.password_hash, p.recovery_email FROM users u JOIN profiles p ON p.id = u.id WHERE u.id = ?').bind(uid).first();
    if (!account || !(await confirmAccountCredential(request, db, uid, sid, password, String(account.password_hash)))) {
      return wrap(apiError('Current password is incorrect', 400));
    }
    const proof = await authorizeActionMfa(db, env, uid, String(body.mfa_code || '').trim());
    if (!proof) return wrap(json({ error: 'mfa_required', message: 'Enter a fresh authenticator code or unused recovery code.' }, 400));
    if (newEmail === account.recovery_email) return wrap(apiError('This recovery email is already set', 400));
    if (env.DEV_MODE !== 'true' && (!env.RESEND_API_KEY || !env.RESEND_FROM)) {
      return wrap(json({ error: 'email_unavailable', message: 'Recovery verification email is not configured.' }, 503));
    }
    const sessionAnchor = sid || String((await db.prepare('SELECT id FROM user_sessions WHERE user_id = ? LIMIT 1').bind(uid).first())?.id || '');
    if (!sessionAnchor) return wrap(apiError('Active session is required to change recovery email', 409));

    const token = randomToken();
    const hash = await sha256Hex(token);
    const expires = new Date(Date.now() + 15 * 60_000).toISOString();
    const stored = await db.prepare(
      `INSERT INTO recovery_email_changes (token_hash, user_id, session_id, new_email, previous_email, password_hash_snapshot, expires_at, consumed_by)
       SELECT ?, ?, ?, ?, ?, ?, ?, NULL WHERE EXISTS (SELECT 1 FROM users WHERE id = ? AND password_hash = ?) AND (${proof.sql})
       ON CONFLICT(user_id) DO UPDATE SET token_hash = excluded.token_hash, session_id = excluded.session_id, new_email = excluded.new_email,
         previous_email = excluded.previous_email, password_hash_snapshot = excluded.password_hash_snapshot, expires_at = excluded.expires_at, consumed_by = NULL RETURNING user_id`,
    ).bind(hash, uid, sessionAnchor, newEmail, account.recovery_email, account.password_hash, expires, uid, account.password_hash, ...proof.bindings).first();
    if (!stored) return wrap(apiError('Security state changed. Verify again before retrying.', 409));

    const link = `${env.AUTH_HUB_URL.replace(/\/+$/, '')}/verify-recovery/#token=${encodeURIComponent(token)}`;
    const delivered = await sendSecurityEmail(env, newEmail, 'Verify your Bansify recovery email',
      `Confirm the replacement recovery email for your Bansify Account within 15 minutes:\n\nVerification Token (for Bansify Accounts Android app):\n${token}\n\nOr open in browser:\n${link}`);
    if (!delivered && env.DEV_MODE !== 'true') {
      await db.prepare('DELETE FROM recovery_email_changes WHERE token_hash = ?').bind(hash).run();
      return wrap(json({ error: 'email_unavailable', message: 'Could not send verification email.' }, 503));
    }
    await logActivity(db, uid, 'recovery_change_requested', 'Recovery verification requested', 'From Accounts Android', request);
    return wrap(json({ ok: true, pending: true, message: 'Check the replacement email for your verification token or link.', ...(env.DEV_MODE === 'true' ? { dev_token: token } : {}) }));
  }

  if (route === '/mobile/recovery-email/verify' && request.method === 'POST') {
    const body = await readJson(request);
    const token = String(body.token || '').trim();
    if (!/^[a-f0-9]{64}$/.test(token)) return wrap(apiError('Verification token is invalid or expired', 400));
    const hash = await sha256Hex(token);
    const now = new Date().toISOString();
    const nonce = randomToken();
    const results = await db.batch([
      db.prepare(
        `UPDATE recovery_email_changes SET consumed_by = ?
         WHERE token_hash = ? AND user_id = ? AND consumed_by IS NULL AND expires_at > ?
           AND EXISTS (SELECT 1 FROM users u JOIN profiles p ON p.id = u.id
             WHERE u.id = recovery_email_changes.user_id AND u.password_hash = recovery_email_changes.password_hash_snapshot
               AND p.recovery_email IS recovery_email_changes.previous_email) RETURNING user_id`,
      ).bind(nonce, hash, uid, now),
      db.prepare(
        `UPDATE profiles SET recovery_email = (SELECT new_email FROM recovery_email_changes WHERE token_hash = ? AND consumed_by = ?), updated_at = ?
         WHERE id = ? AND EXISTS (SELECT 1 FROM recovery_email_changes WHERE token_hash = ? AND consumed_by = ? AND user_id = ?)`,
      ).bind(hash, nonce, now, uid, hash, nonce, uid),
      db.prepare(
        `INSERT INTO verified_recovery_emails (user_id, email, verified_at)
         SELECT user_id, new_email, ? FROM recovery_email_changes WHERE token_hash = ? AND consumed_by = ?
         ON CONFLICT(user_id) DO UPDATE SET email = excluded.email, verified_at = excluded.verified_at`,
      ).bind(now, hash, nonce),
      db.prepare('DELETE FROM recovery_email_changes WHERE token_hash = ? AND consumed_by = ?').bind(hash, nonce),
    ]);
    if (!results[0].results?.length) return wrap(apiError('Verification token is invalid or expired', 400));
    await logActivity(db, uid, 'recovery_email_verified', 'Recovery email verified', 'From Accounts Android', request);
    const profile = await fetchProfile(db, uid);
    return wrap(json({ ok: true, recovery_email: profile?.recovery_email || null, recovery_email_verified: true, user: presentUser(profile, env) }));
  }

  // 6. Native 2-Step Verification / TOTP MFA (`/mobile/mfa/*`)
  if (route.startsWith('/mobile/mfa/')) {
    const factor = await enabledMfa(db, uid);
    if (route === '/mobile/mfa/status' && request.method === 'GET') {
      const remaining = await db.prepare('SELECT COUNT(*) AS count FROM auth_mfa_recovery_codes WHERE user_id = ? AND used_by IS NULL').bind(uid).first<{ count: number }>();
      return wrap(json({ ok: true, enabled: !!factor, enrollment_available: mfaConfigured(env), recovery_codes_remaining: factor ? remaining?.count || 0 : 0 }));
    }
    if (request.method !== 'POST') return wrap(json({ error: 'not_found' }, 404));
    if (!(await reserveMfaAttempt(db, uid))) return wrap(json({ error: 'rate_limited', message: 'Too many security attempts. Wait five minutes.' }, 429, { 'Retry-After': '300' }));
    const body = await readJson(request);
    const password = String(body.current_password || '');
    const account = await db.prepare('SELECT id, username, password_hash FROM users WHERE id = ?').bind(uid).first<{ id: string; username: string; password_hash: string }>();
    if (!account || !(await confirmAccountCredential(request, db, uid, sid, password, account.password_hash))) {
      return wrap(json({ error: 'reauthentication_required', message: 'Confirm your current password.' }, 400));
    }
    const sessionAnchor = sid || String((await db.prepare('SELECT id FROM user_sessions WHERE user_id = ? LIMIT 1').bind(uid).first())?.id || '');
    if (!sessionAnchor) return wrap(apiError('Active device session is required for MFA management', 409));

    if (route === '/mobile/mfa/enroll') {
      if (factor) return wrap(json({ error: 'already_enabled', message: 'Authenticator verification is already enabled.' }, 409));
      const setup = await prepareMfaEnrollment(db, env, account, sessionAnchor);
      return wrap(json(setup ? { ok: true, ...setup } : { error: 'enrollment_changed' }, setup ? 200 : 409));
    }
    if (route === '/mobile/mfa/confirm') {
      const callerBindings = await db.prepare('SELECT * FROM oauth_credential_bindings WHERE user_id = ? AND grant_id = ?').bind(uid, ctx.binding.grant_id).all();
      const codes = await confirmMfaEnrollment(db, env, account, sessionAnchor, String(body.enrollment_id || ''), String(body.code || '').trim());
      if (!codes) return wrap(json({ error: 'invalid_mfa', message: 'Enrollment expired or the code is invalid.' }, 400));
      const restoreStmts = [];
      for (const b of callerBindings.results || []) {
        restoreStmts.push(
          db.prepare(
            `INSERT OR REPLACE INTO oauth_credential_bindings
               (credential_hash, kind, user_id, client_id, grant_id, password_snapshot, expires_at, bot_verified, source_session_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).bind(b.credential_hash, b.kind, b.user_id, b.client_id, b.grant_id, account.password_hash, b.expires_at, b.bot_verified, b.source_session_id),
        );
        if (b.kind === 'refresh') {
          restoreStmts.push(db.prepare('UPDATE oauth_refresh_tokens SET revoked = 0 WHERE token_hash = ? AND user_id = ?').bind(b.credential_hash, uid));
        }
      }
      if (restoreStmts.length) await db.batch(restoreStmts);
      await logActivity(db, uid, 'mfa_enabled', 'Authenticator verification enabled', 'From Accounts Android', request);
      return wrap(json({ ok: true, recovery_codes: codes, user: presentUser(await fetchProfile(db, uid), env) }));
    }
    if (route === '/mobile/mfa/disable' || route === '/mobile/mfa/recovery-codes') {
      if (!factor) return wrap(json({ error: 'not_enabled', message: 'Authenticator verification is not enabled.' }, 409));
      const proof = await matchMfaProof(env, factor, String(body.code || '').trim());
      if (!proof) return wrap(json({ error: 'invalid_mfa', message: 'Enter a fresh authenticator code or unused recovery code.' }, 400));
      const marker = randomToken();
      const mfaGate = 'EXISTS (SELECT 1 FROM auth_mfa_factors WHERE user_id = ? AND last_proof = ?)';
      const params = [uid, marker];
      const statements = [
        proofStatement(db, factor, proof, marker, 'EXISTS (SELECT 1 FROM users WHERE id = ? AND password_hash = ?)', [uid, account.password_hash]),
        db.prepare(`UPDATE auth_mfa_factors SET last_proof = ? WHERE user_id = ? AND version = ? AND (${proofMarkerSql(proof)}) RETURNING user_id`)
          .bind(marker, uid, factor.version, uid, marker),
        db.prepare(`DELETE FROM auth_mfa_recovery_codes WHERE user_id = ? AND (${mfaGate})`).bind(uid, ...params),
      ];
      const codes = route === '/mobile/mfa/recovery-codes' ? await newRecoveryCodes(uid) : null;
      if (codes) {
        statements.push(...codes.map((c) => db.prepare(`INSERT INTO auth_mfa_recovery_codes (code_hash, user_id, created_at) SELECT ?, ?, ? WHERE ${mfaGate}`)
          .bind(c.hash, uid, new Date().toISOString(), ...params)));
      } else {
        statements.push(
          db.prepare(`UPDATE auth_mfa_factors SET enabled = 0, secret_ciphertext = '', version = ?, last_counter = -1 WHERE user_id = ? AND (${mfaGate})`).bind(crypto.randomUUID(), uid, ...params),
          db.prepare(`UPDATE profiles SET two_factor_enabled = 0 WHERE id = ? AND (${mfaGate})`).bind(uid, ...params),
          db.prepare(`DELETE FROM auth_mfa_sessions WHERE user_id = ? AND (${mfaGate})`).bind(uid, ...params),
          db.prepare(`DELETE FROM auth_mfa_challenges WHERE user_id = ? AND (${mfaGate})`).bind(uid, ...params),
          db.prepare(`DELETE FROM oauth_credential_bindings WHERE user_id = ? AND grant_id <> ? AND (${mfaGate})`).bind(uid, ctx.binding.grant_id, ...params),
        );
      }
      const result = await db.batch(statements);
      if (!result[1].results?.length) return wrap(json({ error: 'invalid_mfa', message: 'This code was already used or verification expired.' }, 400));
      await logActivity(db, uid, codes ? 'mfa_codes_regenerated' : 'mfa_disabled', codes ? 'Recovery codes replaced' : 'Authenticator verification disabled', 'From Accounts Android', request);
      return wrap(json({ ok: true, ...(codes ? { recovery_codes: codes.map((c) => c.code) } : {}), user: presentUser(await fetchProfile(db, uid), env) }));
    }
    return wrap(json({ error: 'not_found' }, 404));
  }

  // 7. Native GDPR Data Export (`GET /mobile/export`)
  if (route === '/mobile/export' && request.method === 'GET') {
    const [profile, sessionsOut, authzOut, activityOut] = await Promise.all([
      fetchProfile(db, uid),
      db.prepare('SELECT id, device_name, browser, os, ip_address, last_active, created_at FROM user_sessions WHERE user_id = ? ORDER BY created_at DESC').bind(uid).all(),
      db.prepare('SELECT app_id, scopes, granted_at, last_used_at FROM app_authorizations WHERE user_id = ?').bind(uid).all(),
      db.prepare('SELECT id, type, title, detail, ip_address, created_at FROM account_activity WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(uid).all(),
    ]);
    return wrap(json({
      ok: true, export: 'bansify-accounts', version: 2, generated_at: new Date().toISOString(),
      profile: profile ? presentUser(profile, env) : null, sessions: sessionsOut.results || [],
      connected_apps: (authzOut.results || []).map((g) => ({ ...g, scopes: parseJsonStringArray(g.scopes) })),
      recent_activity: activityOut.results || [],
    }));
  }

  // 8. Native Permanent Account Deletion (`POST /mobile/delete-account`)
  if (route === '/mobile/delete-account' && request.method === 'POST') {
    const body = await readJson(request);
    const password = String(body.password || '');
    const userRow = await db.prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1').bind(uid).first();
    if (!userRow || !(await confirmAccountCredential(request, db, uid, sid, password, String(userRow.password_hash)))) {
      return wrap(apiError('Credential verification failed', 400));
    }
    const proof = await authorizeActionMfa(db, env, uid, String(body.mfa_code || '').trim());
    if (!proof) return wrap(json({ error: 'mfa_required', message: 'Enter a fresh authenticator code or unused recovery code.' }, 400));
    const deleted = await db.prepare(`DELETE FROM users WHERE id = ? AND password_hash = ? AND (${proof.sql}) RETURNING id`)
      .bind(uid, userRow.password_hash, ...proof.bindings).first();
    if (!deleted) return wrap(apiError('Security state changed. Verify again before retrying.', 409));
    if (env.AVATARS_BUCKET) await env.AVATARS_BUCKET.delete(`avatars/${uid}`).catch(() => undefined);
    return wrap(json({ ok: true, message: 'Account deleted' }));
  }

  return null;
}
