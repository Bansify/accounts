import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getNativeDb } from '../cloudflare-worker/src/native-db.ts';
import { createLocalD1 } from '../tools/local-d1.mjs';
import { generateFirstPartySql } from '../tools/generate-first-party-sql.mjs';
import { officialClients } from '../cloudflare-worker/src/first-party.ts';
import { makeEnv } from './helpers/multi-account-harness.mjs';
import { nativeFixture, decisionBody, nativeTokens, nativeRequest, nativeToken, nativeRefresh, accountsClient,
  nativeCode, nativeVerifier, callback } from './helpers/native-oauth-harness.mjs';

test('migration 14 preserves old registrations/grants/disabled status, defaults unapproved, seeds seven public clients', async () => {
  const db = createLocalD1(':memory:');
  try {
    await db.exec(readFileSync('sql/01_core_schema.sql', 'utf8'));
    await db.exec(readFileSync('sql/10_oauth_credential_bindings.sql', 'utf8'));
    await db.prepare("UPDATE ecosystem_apps SET secret_hash = 'legacy-server-only', redirect_uris = '[\"https://legacy.example/cb\"]' WHERE id = 'kiwi-store'").run();
    await db.exec(generateFirstPartySql('example.com'));
    const row = await db.prepare("SELECT * FROM ecosystem_apps WHERE id = 'kiwi-store'").first();
    assert.equal(row.secret_hash, null);
    assert.ok(JSON.parse(row.redirect_uris).includes('https://legacy.example/cb'));
    assert.ok(JSON.parse(row.redirect_uris).includes('https://kiwistore.example.com/oauth/callback'));
    assert.equal(row.android_cert_sha256, '[]');
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM ecosystem_apps WHERE first_party = 1').first()).n, officialClients('example.com').length);
    assert.equal((await db.prepare("SELECT first_party FROM ecosystem_apps WHERE id = 'gothwad-chat'").first()).first_party, 0);
    await db.prepare("UPDATE ecosystem_apps SET first_party = 0, active = 0, android_cert_sha256 = ? WHERE id = 'kiwi-store'").bind(JSON.stringify(['a'.repeat(64)])).run();
    await getNativeDb(makeEnv({ DB: db, APP_DOMAIN: 'example.com' }));
    const updated = await db.prepare("SELECT * FROM ecosystem_apps WHERE id = 'kiwi-store'").first();
    assert.equal(updated.first_party, 0, 'runtime must not undo operator deapproval');
    assert.equal(updated.active, 0);
    assert.equal(updated.android_cert_sha256, JSON.stringify(['a'.repeat(64)]));
    assert.equal(readFileSync('migrations/0014_first_party_native.sql', 'utf8'), generateFirstPartySql('bansify.com'));
  } finally { db.close(); }
});

test('all requested public clients have exact callbacks, packages and scoped capabilities on domain-agnostic bootstrap', async () => {
  const env = makeEnv({ APP_DOMAIN: 'example.com' });
  try {
    await getNativeDb(env);
    for (const app of officialClients('example.com')) {
      const row = await env.DB.prepare('SELECT * FROM ecosystem_apps WHERE id = ?').bind(app.id).first();
      assert.equal(row.first_party, 1);
      assert.equal(row.active, 1);
      assert.equal(row.secret_hash, null);
      assert.equal(row.android_package, app.package);
      for (const redirect of app.redirects) assert.ok(JSON.parse(row.redirect_uris).includes(redirect), redirect);
      assert.deepEqual(JSON.parse(row.allowed_scopes), app.scopes);
    }
  } finally { env.DB.close(); }
});

test('unknown, unapproved, inactive clients fail authorize/decision/token; caller cannot self-approve or register', async () => {
  const f = await nativeFixture();
  try {
    for (const client of ['missing-app', 'gothwad-chat', accountsClient]) {
      if (client === accountsClient) await f.env.DB.prepare('UPDATE ecosystem_apps SET active = 0 WHERE id = ?').bind(client).run();
      const body = { ...decisionBody(), client_id: client, first_party: 1 };
      const query = new URLSearchParams(body);
      const responses = [await nativeRequest(f, '/oauth/authorize?' + query),
        await f.owner.jar.fetch(f.env, '/oauth/decision', { method: 'POST', body }),
        await nativeToken(f, { client_id: client, grant_type: 'refresh_token', refresh_token: 'bogus' })];
      for (const r of responses) { assert.equal(r.status, 400); assert.equal((await r.json()).error, 'unauthorized_client'); }
    }
    assert.equal((await nativeRequest(f, '/oauth/register', null, { method: 'POST', body: { first_party: 1 } })).status, 403);
    assert.equal((await f.owner.jar.fetch(f.env, '/oauth/register', { method: 'POST', body: { first_party: 1 } })).status, 404);
  } finally { f.env.DB.close(); }
});

test('authorize and decision reject wildcard/near redirects, unknown and privileged scopes, missing/plain PKCE even in DEV_MODE', async () => {
  const f = await nativeFixture();
  try {
    f.env.DEV_MODE = 'true';
    const invalid = [
      { redirect_uri: callback(accountsClient) + '/' }, { redirect_uri: 'http://localhost:9191/unregistered' },
      { redirect_uri: 'https://accounts.bansify.com/*' }, { redirect_uri: callback(accountsClient) + '#fragment' },
      { code_challenge: '' }, { code_challenge_method: 'plain' }, { code_challenge: 'bad' },
      { scope: 'profile totally.unknown' }, { scope: 'profile mail' },
    ];
    for (const extra of invalid) {
      const body = { ...decisionBody(), ...extra };
      assert.equal((await f.owner.jar.fetch(f.env, '/oauth/authorize?' + new URLSearchParams(body))).status, 400, JSON.stringify(extra));
      assert.equal((await f.owner.jar.fetch(f.env, '/oauth/decision', { method: 'POST', body })).status, 400, JSON.stringify(extra));
    }
    const code = await nativeCode(f);
    const base = { grant_type: 'authorization_code', client_id: accountsClient, code, code_verifier: nativeVerifier, redirect_uri: callback(accountsClient) };
    for (const extra of [{ code_verifier: 'x'.repeat(43) }, { redirect_uri: callback(accountsClient) + '/' }]) {
      assert.equal((await nativeToken(f, { ...base, ...extra })).status, 400);
    }
    assert.equal((await nativeToken(f, base)).status, 200, 'bad verifier/redirect must not consume the code');
  } finally { f.env.DB.close(); }
});

test('userinfo uses live first-party/scoped grants: sensitive security gated, no credential material, disable invalidates access and refresh', async () => {
  const f = await nativeFixture();
  try {
    await f.env.DB.prepare("UPDATE profiles SET phone_number = '+15555550123' WHERE id = ?").bind(f.owner.data.user.id).run();
    const basic = await nativeTokens(f, { scope: 'profile email offline_access' });
    const ordinary = await (await nativeRequest(f, '/oauth/userinfo', basic.access_token)).json();
    assert.equal(ordinary.preferred_username, 'nativeowner');
    assert.equal(ordinary.client_id, accountsClient);
    assert.equal(ordinary.aud, accountsClient);
    assert.deepEqual(ordinary.scopes, ['profile', 'email', 'offline_access']);
    assert.ok(ordinary.created_at);
    for (const key of ['security', 'phone_number', 'recovery_email', 'drive']) assert.ok(!(key in ordinary), key);
    const mailTokens = await nativeTokens(f, { client: 'gothwad-mail', scope: 'profile email offline_access mail' });
    const mailInfo = await (await nativeRequest(f, '/oauth/userinfo', mailTokens.access_token)).json();
    assert.equal(mailInfo.client_id, 'gothwad-mail');
    assert.equal(mailInfo.aud, 'gothwad-mail');
    assert.equal(mailInfo.preferred_username, 'nativeowner');
    assert.ok(mailInfo.scopes.includes('mail'));
    const full = await nativeTokens(f);
    const r = await nativeRequest(f, '/oauth/userinfo', full.access_token);
    const info = await r.json();
    assert.equal(info.phone_number, '+15555550123');
    assert.equal(info.phone_number_verified, false);
    assert.equal(info.recovery_email_verified, false);
    assert.equal(info.security.has_password, true);
    assert.equal(info.security.mfa_enabled, false);
    assert.equal(info.drive.write_access, false);
    assert.equal(info.security.session_count, 1);
    assert.doesNotMatch(JSON.stringify(info), /password_hash|password_snapshot|secret_ciphertext|token_hash|public_key|code_hash|access_token|refresh_token/);
    await f.env.DB.prepare('UPDATE ecosystem_apps SET first_party = 0 WHERE id = ?').bind(accountsClient).run();
    assert.equal((await nativeRequest(f, '/oauth/userinfo', full.access_token)).status, 401);
    const denied = await nativeRefresh(f, full.refresh_token);
    assert.equal(denied.status, 400);
    assert.equal((await denied.json()).error, 'unauthorized_client');
  } finally { f.env.DB.close(); }
});
