/** Native token revocation: ownership, client and one-use state checked in the transaction. */
import type { D1Database, Env } from '../types.ts';
import { json, readFormOrJson } from '../http.ts';
import { sha256Hex, randomToken } from '../crypto.ts';
import { oauthAccess, accessGate } from '../oauth-access.ts';
import { logActivity } from '../users.ts';
export async function nativeRevoke(request: Request, db: D1Database, env: Env) {
  const ctx = await oauthAccess(request, db, env);
  if (!ctx) return json({ error: 'invalid_token' }, 401);
  const body = await readFormOrJson(request);
  const invalid = () => json({ error: 'invalid_grant' }, 400);
  if (body.client_id !== ctx.client.id || typeof body.token !== 'string' || !body.token || body.token.length > 8192) return invalid();
  if (body.token_type_hint && !['refresh_token', 'access_token'].includes(String(body.token_type_hint))) return invalid();
  const hash = await sha256Hex(body.token);
  const marker = randomToken();
  const gate = accessGate(ctx);
  const owned = `EXISTS (SELECT 1 FROM oauth_credential_bindings WHERE credential_hash = ? AND kind = ?)`;
  const condition = [hash, marker];
  const result = await db.batch([
    db.prepare(`UPDATE oauth_credential_bindings SET kind = ?
      WHERE credential_hash = ? AND user_id = ? AND client_id = ? AND expires_at > ?
      AND (kind = 'access' OR (kind = 'refresh' AND EXISTS (
        SELECT 1 FROM oauth_refresh_tokens r WHERE r.token_hash = credential_hash AND r.revoked = 0)))
      AND (? = '' OR kind = ?) AND (${gate.sql}) RETURNING user_id`)
      .bind(marker, hash, ctx.uid, ctx.client.id, new Date().toISOString(), body.token_type_hint || '',
        body.token_type_hint === 'refresh_token' ? 'refresh' : 'access', ...gate.values),
    db.prepare(`UPDATE oauth_refresh_tokens SET revoked = 1 WHERE user_id = ? AND client_id = ? AND ${owned}`)
      .bind(ctx.uid, ctx.client.id, ...condition),
    db.prepare(`DELETE FROM oauth_auth_codes WHERE user_id = ? AND client_id = ? AND ${owned}`)
      .bind(ctx.uid, ctx.client.id, ...condition),
    db.prepare(`DELETE FROM app_authorizations WHERE user_id = ? AND app_id = ? AND ${owned}`)
      .bind(ctx.uid, ctx.client.id, ...condition),
    db.prepare(`DELETE FROM oauth_credential_bindings WHERE user_id = ? AND client_id = ? AND ${owned}`)
      .bind(ctx.uid, ctx.client.id, ...condition),
  ]);
  if (!result[0].results?.length) return invalid();
  await logActivity(db, ctx.uid, 'app_revoked', 'Native app disconnected', ctx.client.id, request);
  return json({ ok: true });
}
