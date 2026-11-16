/** Migration-dependent OAuth setup must never run in the browser-auth bootstrap. */
import type { D1Database, Env } from './types.ts';
import { getDb, OAuthDatabaseError, oauthQuery } from './db.ts';
import { FIRST_PARTY_CERT_SCHEMA, firstPartySeeds } from './first-party.ts';

const initializedNativeDbs = new WeakMap<object, Promise<void>>();
export class NativeMigrationRequiredError extends Error {
  constructor() { super('OAuth/mobile database migration 14 is required'); }
}
export async function getNativeDb(env: Env): Promise<D1Database> {
  const db = await oauthQuery(() => getDb(env));
  let pending = initializedNativeDbs.get(db);
  if (!pending) {
    // Explicit capability checks, no PRAGMA or automatic ALTER. Both tables must be ready.
    // Failure is not cached: an operator-applied migration recovers without a restart.
    pending = (async () => {
      try {
        await db.prepare(`SELECT first_party, android_package, android_cert_sha256, active, allowed_scopes
          FROM ecosystem_apps LIMIT 0`).all();
        await db.prepare(`SELECT bot_verified, source_session_id FROM oauth_credential_bindings LIMIT 0`).all();
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (/no such column|has no column named|no column named/i.test(message)) throw new NativeMigrationRequiredError();
        throw error;
      }
      await db.batch([
        ...FIRST_PARTY_CERT_SCHEMA.map(sql => db.prepare(sql)),
        ...firstPartySeeds(db, env.APP_DOMAIN),
      ]);
    })().catch(error => {
      initializedNativeDbs.delete(db);
      if (error instanceof NativeMigrationRequiredError) throw error;
      throw new OAuthDatabaseError();
    });
    initializedNativeDbs.set(db, pending);
  }
  await pending;
  return db;
}
