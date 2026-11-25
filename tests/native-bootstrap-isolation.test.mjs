import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../cloudflare-worker/src/index.ts';
import { hashPassword } from '../cloudflare-worker/src/crypto.ts';
import { createLocalD1 } from '../tools/local-d1.mjs';
import { makeEnv } from './helpers/multi-account-harness.mjs';

import { GoogleJar, mockGoogle, googleAccount } from './helpers/google-harness.mjs';
import { getDb } from '../cloudflare-worker/src/db.ts';
import { getNativeDb } from '../cloudflare-worker/src/native-db.ts';

async function legacyFixture() {
  const db = createLocalD1(':memory:');
  await db.exec(readFileSync('sql/01_core_schema.sql', 'utf8'));
  await db.exec(readFileSync('sql/10_oauth_credential_bindings.sql', 'utf8'));
  const env = makeEnv({ DB: db, GOOGLE_CLIENT_ID: 'synthetic.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'synthetic-google-secret' });
  await db.prepare("INSERT INTO users(id, username, password_hash) VALUES ('legacy-owner', 'legacyowner', ?)")
    .bind(await hashPassword('SyntheticPassword123')).run();
  await db.prepare("INSERT INTO profiles(id, username, first_name) VALUES ('legacy-owner', 'legacyowner', 'Legacy')").run();
  return { env, db, jar: new GoogleJar() };
}

test('unmigrated production-shaped DB keeps identifier discovery, password login and Google start working', async () => {
  const f = await legacyFixture();
  try {
    const discovery = await f.jar.fetch(f.env, '/api/auth/check-identifier?identifier=legacyowner');
    assert.equal(discovery.status, 200, await discovery.clone().text());
    assert.equal((await discovery.json()).exists, true);
    const signin = await f.jar.fetch(f.env, '/api/auth/signin', { method: 'POST',
      body: { identifier: 'legacyowner', password: 'SyntheticPassword123' } });
    assert.equal(signin.status, 200, await signin.clone().text());
    assert.equal((await f.jar.fetch(f.env, '/api/auth/me')).status, 200);
    const google = await f.jar.fetch(f.env, '/api/auth/google/start', { method: 'POST', body: {} });
    assert.equal(google.status, 200, await google.clone().text());
    assert.equal(new URL((await google.json()).url).hostname, 'accounts.google.com');
    const schema = await f.db.prepare("SELECT sql FROM sqlite_master WHERE name = 'ecosystem_apps'").first();
    assert.doesNotMatch(schema.sql, /first_party/);
    assert.equal((await f.db.prepare("SELECT COUNT(*) AS n FROM auth_schema_versions WHERE version = '14_first_party_native'").first()).n, 0);
  } finally { f.db.close(); }
});

test('unmigrated native/OAuth routes fail closed without poisoning subsequent browser login', async () => {
  const f = await legacyFixture();
  try {
    for (const path of ['/oauth/authorize?client_id=kiwi-store', '/api/mobile/sessions', '/api/apps/trusted', '/.well-known/assetlinks.json']) {
      const r = await worker.fetch(new Request('https://api.bansify.com' + path), f.env);
      assert.equal(r.status, 503, path);
      assert.equal((await r.json()).error, 'migration_required', path);
    }
    assert.equal((await f.jar.fetch(f.env, '/api/auth/check-identifier?identifier=legacyowner')).status, 200);
  } finally { f.db.close(); }
});

test('full Google callback and account selection still work before migration 14 (provider HTTP mocked)', async t => {
  mockGoogle(t);
  const f = await legacyFixture();
  try {
    const google = await googleAccount(f.env, new GoogleJar(), {}, 'googleisolated');
    assert.equal(google.response.status, 200);
    assert.equal((await google.jar.fetch(f.env, '/api/auth/me')).status, 200);
    assert.equal((await f.db.prepare("SELECT COUNT(*) AS n FROM auth_schema_versions WHERE version = '14_first_party_native'").first()).n, 0);
  } finally { f.db.close(); }
});

test('native migration can recover in the same isolate after an initial missing-column failure', async () => {
  const f = await legacyFixture();
  try {
    await assert.rejects(getNativeDb(f.env), /migration 14/);
    await f.db.exec(readFileSync('migrations/0014_first_party_native.sql', 'utf8'));
    const ready = await getNativeDb(f.env);
    assert.equal((await ready.prepare('SELECT COUNT(*) AS n FROM ecosystem_apps WHERE first_party = 1').first()).n, 8);
    const info = await f.jar.fetch(f.env, '/oauth/app-info?client_id=gothwad-accounts-android');
    assert.equal(info.status, 200);
    assert.equal((await f.jar.fetch(f.env, '/api/auth/check-identifier?identifier=legacyowner')).status, 200);
  } finally { f.db.close(); }
});

test('partial migration is rejected without seeding approval or taking password discovery offline', async () => {
  const f = await legacyFixture();
  try {
    await getDb(f.env);
    const migration = readFileSync('migrations/0014_first_party_native.sql', 'utf8');
    const columnsOnly = migration.slice(migration.indexOf('ALTER TABLE'), migration.indexOf('ALTER TABLE oauth_credential_bindings'));
    await f.db.exec(columnsOnly);
    await assert.rejects(getNativeDb(f.env), /migration 14/);
    assert.equal((await f.db.prepare('SELECT COUNT(*) AS n FROM ecosystem_apps WHERE first_party = 1').first()).n, 0);
    assert.equal((await f.jar.fetch(f.env, '/api/auth/check-identifier?identifier=legacyowner')).status, 200);
  } finally { f.db.close(); }
});

test('native setup persistence failure is not misreported as migration-required and does not affect core authentication', async () => {
  const f = await legacyFixture();
  try {
    await getDb(f.env);
    await f.db.exec(readFileSync('migrations/0014_first_party_native.sql', 'utf8'));
    const batch = f.db.batch.bind(f.db);
    f.db.batch = async () => { throw new Error('synthetic native persistence outage'); };
    const native = await f.jar.fetch(f.env, '/oauth/app-info?client_id=kiwi-store');
    assert.equal(native.status, 503);
    assert.equal((await native.json()).error, 'temporarily_unavailable');
    f.db.batch = batch;
    assert.equal((await f.jar.fetch(f.env, '/api/auth/check-identifier?identifier=legacyowner')).status, 200);
    assert.equal((await f.jar.fetch(f.env, '/oauth/app-info?client_id=kiwi-store')).status, 200);
  } finally { f.db.close(); }
});
