/** Public release-key discovery. Never manufactures fingerprints or trusts caller package names. */
import type { D1Database, Env } from '../types.ts';
import { json } from '../http.ts';
import { validFingerprints } from '../first-party.ts';
const b64url = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
export async function trustedApps(db: D1Database, env: Env) {
  const out = await db.prepare(`SELECT client_id, android_package, android_cert_sha256 FROM ecosystem_apps
    WHERE first_party = 1 AND active = 1 AND android_package IS NOT NULL ORDER BY client_id`).all();
  const now = Math.floor(Date.now() / 1000);
  const payload = { version: 1, issuer: env.AUTH_HUB_URL, issued_at: now, expires_at: now + 900,
    apps: (out.results || []).map(row => ({ client_id: row.client_id, android_package: row.android_package,
      android_cert_sha256: validFingerprints(row.android_cert_sha256) })) };
  if (!env.TRUSTED_APPS_SIGNING_JWK) return json({ ...payload, signed: false }, 200, { 'Cache-Control': 'no-store' });
  try {
    const jwk = JSON.parse(env.TRUSTED_APPS_SIGNING_JWK) as JsonWebKey;
    const ed = jwk.kty === 'OKP' && jwk.crv === 'Ed25519';
    if (!ed && !(jwk.kty === 'EC' && jwk.crv === 'P-256')) throw new Error('Unsupported signing algorithm');
    if (!env.TRUSTED_APPS_KEY_ID) throw new Error('Missing key ID');
    const algorithm = ed ? { name: 'Ed25519' } : { name: 'ECDSA', namedCurve: 'P-256' };
    const key = await crypto.subtle.importKey('jwk', jwk, algorithm, false, ['sign']);
    const encode = (v: unknown) => b64url(new TextEncoder().encode(JSON.stringify(v)));
    const header = encode({ alg: ed ? 'EdDSA' : 'ES256', kid: env.TRUSTED_APPS_KEY_ID, typ: 'JWT' });
    const encoded = encode(payload);
    const data = `${header}.${encoded}`;
    const signature = await crypto.subtle.sign(ed ? { name: 'Ed25519' } : { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(data));
    return json({ ...payload, signed: true, jws: `${data}.${b64url(new Uint8Array(signature))}` }, 200, { 'Cache-Control': 'no-store' });
  } catch { return json({ error: 'temporarily_unavailable' }, 503); }
}
export async function assetLinks(db: D1Database, env: Env) {
  let links: unknown;
  try {
    if (env.ANDROID_ASSETLINKS_JSON) {
      links = JSON.parse(env.ANDROID_ASSETLINKS_JSON);
      if (!Array.isArray(links) || !links.every(item => item?.target?.namespace === 'android_app' &&
        item.target.package_name === 'com.bansify.accounts' && Array.isArray(item.relation) &&
        item.relation.length === 1 && item.relation[0] === 'delegate_permission/common.handle_all_urls' &&
        Array.isArray(item.target.sha256_cert_fingerprints) && item.target.sha256_cert_fingerprints.length > 0 &&
        item.target.sha256_cert_fingerprints.every((v: unknown) => typeof v === 'string' && /^(?:[A-Fa-f0-9]{2}:){31}[A-Fa-f0-9]{2}$/.test(v)))) throw new Error('Invalid asset links');
    } else {
      const row = await db.prepare(`SELECT android_cert_sha256 FROM ecosystem_apps
        WHERE id = 'gothwad-accounts-android' AND first_party = 1 AND active = 1 AND android_package = 'com.bansify.accounts'`).first();
      const certs = validFingerprints(row?.android_cert_sha256);
      links = certs.length ? [{ relation: ['delegate_permission/common.handle_all_urls'], target: {
        namespace: 'android_app', package_name: 'com.bansify.accounts',
        sha256_cert_fingerprints: certs.map(c => c.match(/../g)!.join(':').toUpperCase()),
      } }] : [];
    }
    return json(links, 200, { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' });
  } catch { return json({ error: 'invalid_assetlinks_configuration' }, 503); }
}
