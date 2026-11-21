/** Operator-controlled first-party policy. A public client ID is not APK attestation. */
import type { D1Database, Env } from './types.ts';
function parseJsonStringArray(raw: unknown): string[] {
  try {
    const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

export const ACCOUNTS_ANDROID = 'gothwad-accounts-android';
export const FIRST_PARTY_COLUMNS = `first_party INTEGER NOT NULL DEFAULT 0,
    android_package TEXT, android_cert_sha256 TEXT NOT NULL DEFAULT '[]',
    active INTEGER NOT NULL DEFAULT 1, allowed_scopes TEXT NOT NULL DEFAULT '[]'`;
export const FIRST_PARTY_CERT_SCHEMA = ['INSERT', 'UPDATE OF android_cert_sha256'].map((event, i) =>
  `CREATE TRIGGER IF NOT EXISTS validate_android_certs_${i} BEFORE ${event} ON ecosystem_apps
   WHEN json_valid(NEW.android_cert_sha256) = 0 OR json_type(NEW.android_cert_sha256) != 'array'
     OR EXISTS (SELECT 1 FROM json_each(NEW.android_cert_sha256)
       WHERE type != 'text' OR length(value) != 64 OR value GLOB '*[^0-9a-f]*')
   BEGIN SELECT RAISE(ABORT, 'Expected a JSON array of lowercase SHA-256 release certificate hashes'); END`);
export function officialClients(domain: string) {
  const profile = ['profile', 'email', 'offline_access'];
  return [
    { id: ACCOUNTS_ANDROID, name: 'Bansify Accounts Android', package: 'com.bansify.accounts',
      redirects: [`https://accounts.${domain}/oauth/callback`, 'com.bansify.accounts:/oauth/callback', 'com.gothwad.accounts:/oauth/callback'],
      scopes: [...profile, 'drive.read', 'account.read', 'account.profile.write'] },
    ...['alpha', 'beta'].map(part => ({ id: `gothwad-accounts-sample-${part}`, name: `Accounts Sample ${part}`,
      package: `com.bansify.accounts.sample.${part}`, redirects: [`com.bansify.accounts.sample.${part}:/oauth/callback`, `com.gothwad.accounts.sample.${part}:/oauth/callback`], scopes: profile })),
    { id: 'gothwad-mail', name: 'Bansify Mail', package: 'com.bansify.mail',
      redirects: [`https://mail.${domain}/oauth/callback`, 'com.bansify.mail:/oauth/callback', 'com.gothwad.mail:/oauth/callback'], scopes: [...profile, 'mail'] },
    { id: 'gothwad-drive', name: 'Bansify Drive', package: 'com.gothwad.drive',
      redirects: [`https://drive.${domain}/oauth/callback`, 'com.gothwad.drive:/oauth/callback'], scopes: [...profile, 'drive', 'drive.read'] },
    { id: 'kiwi-store', name: 'Kiwi Store', package: 'com.gothwad.store',
      redirects: ['kiwistore://oauth/callback', `https://kiwistore.${domain}/oauth/callback`, 'com.gothwad.store:/oauth/callback'], scopes: profile },
    { id: 'gothwad-tube', name: 'Bansify Tube', package: 'com.gothwad.tube',
      redirects: [`https://tube.${domain}/oauth/callback`, 'com.gothwad.tube:/oauth/callback'], scopes: profile },
  ];
}
export function firstPartySeeds(db: D1Database, domain: string) {
  if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)) throw new Error('Invalid APP_DOMAIN');
  return [...officialClients(domain).map(app => db.prepare(`INSERT INTO ecosystem_apps
    (id, client_id, name, first_party, android_package, redirect_uris, allowed_scopes, is_verified)
    SELECT ?, ?, ?, 1, ?, ?, ?, 1
    WHERE NOT EXISTS (SELECT 1 FROM auth_schema_versions WHERE version = '14_first_party_native')
    ON CONFLICT(id) DO UPDATE SET first_party = 1, client_id = excluded.client_id, secret_hash = NULL, android_package = excluded.android_package,
      name = excluded.name, allowed_scopes = excluded.allowed_scopes,
      redirect_uris = (SELECT json_group_array(value) FROM (
        SELECT value FROM json_each(ecosystem_apps.redirect_uris)
        UNION SELECT value FROM json_each(excluded.redirect_uris)))`)
    .bind(app.id, app.id, app.name, app.package, JSON.stringify(app.redirects), JSON.stringify(app.scopes))),
    ...officialClients(domain).map(app => db.prepare(`UPDATE ecosystem_apps
      SET name = ?, redirect_uris = (SELECT json_group_array(value) FROM (
        SELECT value FROM json_each(ecosystem_apps.redirect_uris)
        UNION SELECT value FROM json_each(?)))
      WHERE id = ? AND json_valid(redirect_uris) = 1 AND redirect_uris != '[]'`)
      .bind(app.name, JSON.stringify(app.redirects), app.id)),
    db.prepare("INSERT OR IGNORE INTO auth_schema_versions(version) VALUES ('14_first_party_native')")];
}
export function firstPartyAllowed(client: Record<string, any> | null): client is Record<string, any> {
  return !!client && Number(client.first_party) === 1 && Number(client.active) === 1;
}
export function requestedScopes(client: Record<string, any>, raw: string, known: Record<string, string>): string[] | null {
  const scopes = [...new Set(raw.trim().split(/\s+/).filter(Boolean))];
  const allowed = parseJsonStringArray(client.allowed_scopes);
  return scopes.length && scopes.every(s => !!known[s] && allowed.includes(s)) ? scopes : null;
}
export function validFingerprints(raw: unknown): string[] {
  return [...new Set(parseJsonStringArray(raw).filter(v => /^[a-f0-9]{64}$/.test(v)))];
}
export function customSchemesAllowed(env: Env) { return env.OAUTH_CUSTOM_SCHEMES !== 'false'; }
