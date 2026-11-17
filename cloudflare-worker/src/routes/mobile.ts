/** Full native account management & direct Android authentication routes (`/api/mobile/*`). */
import type { D1Database, Env, ResponseWrapper } from '../types.ts';
import { json, readJson, GENDER_VALUES, parseJsonStringArray } from '../http.ts';
import { oauthAccess, accessGate } from '../oauth-access.ts';
import { ACCOUNTS_ANDROID } from '../first-party.ts';
import { logActivity } from '../users.ts';
import { handleMobileAuthRoute } from './mobile-auth.ts';
import { handleMobileSecurityRoute } from './mobile-security.ts';

export function mobileProfileFields(body: Record<string, unknown>) {
  const allowed = ['first_name', 'last_name', 'date_of_birth', 'gender'];
  if (!Object.keys(body).length || Object.keys(body).some(k => !allowed.includes(k))) return null;
  const fields: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== 'string') return null;
    const v = value.trim();
    if (key.endsWith('_name')) {
      if (v.length > 100 || /[\u0000-\u001f\u007f<>]/.test(v) || (key === 'first_name' && !v)) return null;
    } else if (key === 'gender' && v && !GENDER_VALUES.includes(v)) return null;
    else if (key === 'date_of_birth' && v) {
      const date = new Date(v);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== v || v < '1900-01-01' || v >= new Date().toISOString().slice(0, 10)) return null;
    }
    fields[key] = v || (key.endsWith('_name') ? '' : null);
  }
  return fields;
}
export async function handleMobileRoute(request: Request, db: D1Database, env: Env, route: string, wrap: ResponseWrapper) {
  if (!route.startsWith('/mobile/')) return null;
  if (route.startsWith('/mobile/auth/')) {
    return handleMobileAuthRoute(request, new URL(request.url), db, env, route, wrap);
  }
  const ctx = await oauthAccess(request, db, env);
  if (!ctx) return wrap(json({ error: 'invalid_token' }, 401));
  const write = request.method !== 'GET';
  if (ctx.client.id !== ACCOUNTS_ANDROID || ctx.payload.aud !== ACCOUNTS_ANDROID ||
    !ctx.scopes.includes(write ? 'account.profile.write' : 'account.read')) return wrap(json({ error: 'insufficient_scope' }, 403));
  const gate = accessGate(ctx);
  const uid = ctx.uid;
  if (route === '/mobile/sessions' && request.method === 'GET') {
    const out = await db.prepare(`SELECT id, device_name, browser, os, ip_address, last_active, created_at
      FROM user_sessions WHERE user_id = ? ORDER BY last_active DESC LIMIT 100`).bind(uid).all();
    return wrap(json({ sessions: (out.results || []).map(row => ({ ...row, current: row.id === ctx.binding.source_session_id })) }));
  }
  if (route === '/mobile/sessions/revoke-others' && request.method === 'POST') {
    if (!ctx.binding.source_session_id) return wrap(json({ error: 'reauthentication_required' }, 409));
    const result = await db.batch([
      db.prepare(`UPDATE auth_refresh_tokens SET revoked = 1 WHERE user_id = ? AND session_id != ? AND (${gate.sql})`)
        .bind(uid, ctx.binding.source_session_id, ...gate.values),
      db.prepare(`DELETE FROM user_sessions WHERE user_id = ? AND id != ? AND (${gate.sql}) RETURNING id`)
        .bind(uid, ctx.binding.source_session_id, ...gate.values),
    ]);
    await logActivity(db, uid, 'sessions_revoked', 'Other web sessions signed out', 'From Accounts Android', request);
    return wrap(json({ ok: true, revoked: result[1].results?.length || 0 }));
  }
  if (route === '/mobile/activity' && request.method === 'GET') {
    const out = await db.prepare(`SELECT id, type, title, detail, ip_address, created_at
      FROM account_activity WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`).bind(uid).all();
    return wrap(json({ activity: out.results || [] }));
  }
  if (route === '/mobile/authorizations' && request.method === 'GET') {
    const out = await db.prepare(`SELECT a.app_id, c.name, a.scopes, a.granted_at, a.last_used_at
      FROM app_authorizations a JOIN ecosystem_apps c ON c.id = a.app_id WHERE a.user_id = ? LIMIT 100`).bind(uid).all();
    return wrap(json({ authorizations: (out.results || []).map(row => ({ ...row, scopes: parseJsonStringArray(row.scopes) })) }));
  }
  if (route === '/mobile/authorizations/revoke' && request.method === 'POST') {
    const body = await readJson(request);
    if (Object.keys(body).length !== 1 || typeof body.app_id !== 'string' || !body.app_id || body.app_id.length > 100) {
      return wrap(json({ error: 'invalid_request' }, 400));
    }
    // Keep the caller ledger until the final statement, including when revoking itself.
    const args = [uid, body.app_id, ...gate.values];
    await db.batch([
      db.prepare(`UPDATE oauth_refresh_tokens SET revoked = 1 WHERE user_id = ? AND client_id = ? AND (${gate.sql})`).bind(...args),
      db.prepare(`DELETE FROM oauth_auth_codes WHERE user_id = ? AND client_id = ? AND (${gate.sql})`).bind(...args),
      db.prepare(`DELETE FROM oauth_credential_bindings WHERE user_id = ? AND client_id = ?
        AND credential_hash != ? AND (${gate.sql})`).bind(uid, body.app_id, ctx.hash, ...gate.values),
      db.prepare(`DELETE FROM app_authorizations WHERE user_id = ? AND app_id = ? AND (${gate.sql})`).bind(...args),
    ]);
    await logActivity(db, uid, 'app_revoked', 'App disconnected', body.app_id, request);
    return wrap(json({ ok: true }));
  }
  if (route === '/mobile/profile' && request.method === 'PATCH') {
    const fields = mobileProfileFields(await readJson(request));
    if (!fields) return wrap(json({ error: 'invalid_request', message: 'Only valid basic profile fields are allowed.' }, 400));
    const changed = await db.prepare(`UPDATE profiles SET ${Object.keys(fields).map(k => `${k} = ?`).join(', ')}, updated_at = ?
      WHERE id = ? AND (${gate.sql}) RETURNING first_name, last_name, date_of_birth, gender, updated_at`)
      .bind(...Object.values(fields), new Date().toISOString(), uid, ...gate.values).first();
    if (!changed) return wrap(json({ error: 'invalid_token' }, 401));
    await logActivity(db, uid, 'profile_update', 'Personal info updated', Object.keys(fields).join(', '), request);
    return wrap(json({ ok: true, profile: changed }));
  }
  const securityRes = await handleMobileSecurityRoute(request, db, env, route, ctx, wrap);
  if (securityRes) return securityRes;
  return wrap(json({ error: 'not_found' }, 404));
}
