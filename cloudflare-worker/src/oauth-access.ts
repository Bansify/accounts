/** One bearer verifier for userinfo and native APIs; never accepts cookie/session tokens. */
import type { D1Database, Env } from './types.ts';
import { getSigningSecret, sha256Hex, verifyJwt } from './crypto.ts';
import { currentOAuthBinding } from './oauth-state.ts';
import { findOAuthClient } from './oauth-helpers.ts';
import { firstPartyAllowed } from './first-party.ts';
import { parseJsonStringArray } from './http.ts';
export async function oauthAccess(request: Request, db: D1Database, env: Env) {
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get('Authorization') || '');
  if (!match) return null;
  const payload = await verifyJwt(match[1], getSigningSecret(env));
  const now = Date.now() / 1000;
  if (!payload || payload.token_use !== 'oauth_access' || payload.iss !== env.AUTH_HUB_URL ||
    typeof payload.sub !== 'string' || typeof payload.client_id !== 'string' || payload.aud !== payload.client_id ||
    !Number.isFinite(payload.exp) || payload.exp <= now || !Number.isFinite(payload.iat) || payload.iat > now + 30) return null;
  const client = await findOAuthClient(db, payload.client_id);
  if (!firstPartyAllowed(client)) return null;
  const hash = await sha256Hex(match[1]);
  const binding = await currentOAuthBinding(db, hash, 'access');
  const scopes = String(payload.scope || '').split(' ').filter(Boolean);
  if (!binding || binding.user_id !== payload.sub || binding.client_id !== client.id ||
    !scopes.every(s => parseJsonStringArray(binding.granted_scopes).includes(s) && parseJsonStringArray(client.allowed_scopes).includes(s))) return null;
  return { uid: payload.sub, client, scopes, binding, hash, payload };
}
export type OAuthAccess = NonNullable<Awaited<ReturnType<typeof oauthAccess>>>;
/** Repeat the live check in mutation SQL to serialize writes against revocation/password changes. */
export function accessGate(ctx: OAuthAccess) {
  return { sql: `EXISTS (SELECT 1 FROM oauth_credential_bindings b
    JOIN users u ON u.id = b.user_id AND u.password_hash = b.password_snapshot
    JOIN app_authorizations a ON a.id = b.grant_id AND a.user_id = b.user_id AND a.app_id = b.client_id
    JOIN ecosystem_apps c ON c.id = b.client_id AND c.first_party = 1 AND c.active = 1 AND c.allowed_scopes = ?
    WHERE b.credential_hash = ? AND b.kind = 'access' AND b.expires_at > ? AND a.scopes = ?)`,
  values: [ctx.client.allowed_scopes, ctx.hash, new Date().toISOString(), ctx.binding.granted_scopes] };
}
