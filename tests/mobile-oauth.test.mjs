import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserJar, seedAccount } from './helpers/multi-account-harness.mjs';
import { sha256Hex } from '../cloudflare-worker/src/crypto.ts';
import { nativeFixture, nativeTokens, nativeRequest, nativeRefresh, nativeCode, nativeToken, accountsClient,
  callback, nativeVerifier } from './helpers/native-oauth-harness.mjs';
const sample = 'gothwad-accounts-sample-alpha';
const revoke = (f, bearer, refresh, client = accountsClient) => nativeRequest(f, '/oauth/revoke', bearer, {
  method: 'POST', body: new URLSearchParams({ client_id: client, token: refresh, token_type_hint: 'refresh_token' }),
});

test('native form revoke invalidates live access, refresh and pending code atomically; cross-user/client cannot revoke', async () => {
  const f = await nativeFixture();
  try {
    const own = await nativeTokens(f);
    const other = await seedAccount(f.env, { username: 'othernative', firstName: 'Other', lastName: 'Native' });
    const otherTokens = await nativeTokens(f, { owner: other });
    const sampleTokens = await nativeTokens(f, { client: sample, scope: 'profile email offline_access' });
    for (const [refresh, client] of [[otherTokens.refresh_token, accountsClient], [sampleTokens.refresh_token, sample], [sampleTokens.refresh_token, accountsClient]]) {
      const r = await revoke(f, own.access_token, refresh, client);
      assert.equal(r.status, 400);
      assert.deepEqual(await r.json(), { error: 'invalid_grant' });
    }
    assert.equal((await nativeRequest(f, '/oauth/userinfo', otherTokens.access_token)).status, 200);
    const pending = await nativeCode(f);
    const removed = await revoke(f, own.access_token, own.refresh_token);
    assert.equal(removed.status, 200, await removed.clone().text());
    assert.equal((await nativeRequest(f, '/oauth/userinfo', own.access_token)).status, 401);
    const refreshed = await nativeRefresh(f, own.refresh_token);
    assert.equal(refreshed.status, 400);
    assert.equal((await refreshed.json()).error, 'invalid_grant');
    assert.equal((await nativeToken(f, { grant_type: 'authorization_code', client_id: accountsClient,
      code: pending, code_verifier: nativeVerifier, redirect_uri: callback(accountsClient) })).status, 400);
    assert.equal((await nativeRequest(f, '/oauth/userinfo', otherTokens.access_token)).status, 200);
    assert.equal((await nativeRequest(f, '/oauth/userinfo', sampleTokens.access_token)).status, 200);
  } finally { f.env.DB.close(); }
});

test('native revoke rejects rotated/reused refresh; refresh racing revoke cannot leave a surviving grant', async () => {
  const f = await nativeFixture();
  try {
    const own = await nativeTokens(f);
    const rotate = await nativeRefresh(f, own.refresh_token);
    assert.equal(rotate.status, 200);
    const rotated = await rotate.json();
    const reused = await revoke(f, rotated.access_token, own.refresh_token);
    assert.equal(reused.status, 400);
    assert.deepEqual(await reused.json(), { error: 'invalid_grant' });
    const results = await Promise.all([
      revoke(f, rotated.access_token, rotated.refresh_token), nativeRefresh(f, rotated.refresh_token),
    ]);
    assert.ok(results.some(r => r.status === 200));
    // Either refresh won (old refresh now invalid), or revoke won (whole grant invalid).
    if (results[0].status === 200) {
      assert.equal((await nativeRefresh(f, rotated.refresh_token)).status, 400);
      if (results[1].status === 200) {
        const replacement = await results[1].json();
        assert.equal((await nativeRefresh(f, replacement.refresh_token)).status, 400);
      }
      assert.equal((await nativeRequest(f, '/oauth/userinfo', rotated.access_token)).status, 401);
    } else {
      assert.equal(results[0].status, 400);
      const replacement = await results[1].json();
      assert.equal((await revoke(f, replacement.access_token, replacement.refresh_token)).status, 200);
    }
  } finally { f.env.DB.close(); }
});

test('mobile APIs require Accounts Android audience and the correct read/write scope; cookies/session tokens are not native auth', async () => {
  const f = await nativeFixture();
  try {
    const limited = await nativeTokens(f, { scope: 'profile email offline_access' });
    const foreign = await nativeTokens(f, { client: sample, scope: 'profile email offline_access' });
    const read = await nativeTokens(f, { scope: 'profile account.read offline_access' });
    const write = await nativeTokens(f, { scope: 'profile account.profile.write offline_access' });
    await nativeTokens(f); // Restore the superset grant; each token still has its own narrower scopes.
    for (const bearer of [null, 'not-a-token', f.owner.data.access_token]) {
      assert.equal((await nativeRequest(f, '/api/mobile/sessions', bearer)).status, 401);
    }
    assert.equal((await f.owner.jar.fetch(f.env, '/api/mobile/sessions')).status, 401);
    for (const bearer of [limited.access_token, foreign.access_token, write.access_token]) {
      assert.equal((await nativeRequest(f, '/api/mobile/sessions', bearer)).status, 403);
    }
    assert.equal((await nativeRequest(f, '/api/mobile/profile', read.access_token, { method: 'PATCH', body: { first_name: 'Changed' } })).status, 403);
    assert.equal((await nativeRequest(f, '/api/mobile/sessions', read.access_token)).status, 200);
    const patched = await nativeRequest(f, '/api/mobile/profile', write.access_token, { method: 'PATCH', body: { first_name: 'Changed' } });
    assert.equal(patched.status, 200);
    assert.equal((await patched.json()).profile.first_name, 'Changed');
    // Even with a privileged allowed scope accidentally granted to another first-party client, audience remains mandatory.
    await f.env.DB.prepare("UPDATE ecosystem_apps SET allowed_scopes = '[\"profile\",\"account.read\"]' WHERE id = ?").bind(sample).run();
    const misconfigured = await nativeTokens(f, { client: sample, scope: 'profile account.read' });
    assert.equal((await nativeRequest(f, '/api/mobile/sessions', misconfigured.access_token)).status, 403);
  } finally { f.env.DB.close(); }
});

test('native profile strictly rejects high-risk/unknown fields, invalid dates, overlong/control names and non-enum gender', async () => {
  const f = await nativeFixture();
  try {
    const own = await nativeTokens(f);
    for (const body of [{}, { first_name: '' }, { first_name: 'a'.repeat(101) }, { first_name: 'A\nB' },
      { phone_number: '+15555550123' }, { recovery_email: 'new@example.com' }, { password: 'changed' },
      { username: 'anothername' }, { two_factor_enabled: true }, { first_party: 1 },
      { date_of_birth: '2024-02-30' }, { date_of_birth: '2999-01-01' }, { date_of_birth: '1899-12-31' },
      { date_of_birth: null }, { gender: 'not-enumerated' }, { last_name: 10 }, { first_name: 'Valid', avatar_url: '/avatar' }]) {
      const r = await nativeRequest(f, '/api/mobile/profile', own.access_token, { method: 'PATCH', body });
      assert.equal(r.status, 400, JSON.stringify(body));
    }
    const r = await nativeRequest(f, '/api/mobile/profile', own.access_token, { method: 'PATCH', body: {
      first_name: 'Updated', last_name: 'Person', date_of_birth: '2000-02-29', gender: '',
    } });
    assert.equal(r.status, 200);
    const profile = (await r.json()).profile;
    assert.equal(profile.date_of_birth, '2000-02-29');
    assert.equal(profile.gender, null);
    await f.env.DB.prepare('DELETE FROM app_authorizations WHERE user_id = ? AND app_id = ?').bind(f.owner.data.user.id, accountsClient).run();
    assert.equal((await nativeRequest(f, '/api/mobile/profile', own.access_token, { method: 'PATCH', body: { first_name: 'Revoked' } })).status, 401);
  } finally { f.env.DB.close(); }
});

test('mobile sessions/activity/grants isolate users; revoke-others preserves source web session and revokes other web credentials', async () => {
  const f = await nativeFixture();
  try {
    const own = await nativeTokens(f);
    const uid = f.owner.data.user.id;
    const other = await seedAccount(f.env, { username: 'isolatednative', firstName: 'Isolated', lastName: 'Native' });
    await nativeTokens(f, { owner: other, client: sample, scope: 'profile email offline_access' });
    const remote = new BrowserJar();
    assert.equal((await remote.fetch(f.env, '/auth/signin', { method: 'POST', body: { identifier: 'nativeowner', password: 'StrongPassword!123' } })).status, 200);
    const sessions = await (await nativeRequest(f, '/api/mobile/sessions', own.access_token)).json();
    assert.equal(sessions.sessions.length, 2);
    assert.equal(sessions.sessions.filter(s => s.current).length, 1);
    const activity = await (await nativeRequest(f, '/api/mobile/activity', own.access_token)).json();
    assert.ok(activity.activity.length > 0);
    assert.ok(activity.activity.every(row => !('user_agent' in row) && !JSON.stringify(row).includes('Isolated')));
    const grants = await (await nativeRequest(f, '/api/mobile/authorizations', own.access_token)).json();
    assert.equal(grants.authorizations.length, 1);
    assert.equal(grants.authorizations[0].app_id, accountsClient);
    const r = await nativeRequest(f, '/api/mobile/sessions/revoke-others', own.access_token, { method: 'POST', body: {} });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).revoked, 1);
    assert.equal((await f.env.DB.prepare('SELECT COUNT(*) AS n FROM user_sessions WHERE user_id = ?').bind(uid).first()).n, 1);
    assert.equal((await remote.fetch(f.env, '/auth/me')).status, 401);
    assert.equal((await f.owner.jar.fetch(f.env, '/auth/me')).status, 200);
    assert.equal((await other.jar.fetch(f.env, '/auth/me')).status, 200);
    assert.equal((await nativeRequest(f, '/oauth/userinfo', own.access_token)).status, 200);
    assert.doesNotMatch(JSON.stringify(sessions), /token_hash|password_hash|password_snapshot|refresh_token|access_token/);
  } finally { f.env.DB.close(); }
});

test('native authorization revocation isolates target user/client and immediately invalidates grants without deleting other accounts', async () => {
  const f = await nativeFixture();
  try {
    const own = await nativeTokens(f);
    const target = await nativeTokens(f, { client: sample, scope: 'profile email offline_access' });
    const other = await seedAccount(f.env, { username: 'grantother', firstName: 'Grant', lastName: 'Other' });
    const otherTarget = await nativeTokens(f, { owner: other, client: sample, scope: 'profile email offline_access' });
    const r = await nativeRequest(f, '/api/mobile/authorizations/revoke', own.access_token, { method: 'POST', body: { app_id: sample } });
    assert.equal(r.status, 200);
    assert.equal((await nativeRequest(f, '/oauth/userinfo', target.access_token)).status, 401);
    assert.equal((await nativeRefresh(f, target.refresh_token, sample)).status, 400);
    assert.equal((await nativeRequest(f, '/oauth/userinfo', otherTarget.access_token)).status, 200);
    assert.equal((await nativeRequest(f, '/oauth/userinfo', own.access_token)).status, 200);
    // Binding deletion/password changes also invalidate every mobile endpoint.
    await f.env.DB.prepare('DELETE FROM oauth_credential_bindings WHERE credential_hash = ?').bind(await sha256Hex(own.access_token)).run();
    assert.equal((await nativeRequest(f, '/api/mobile/activity', own.access_token)).status, 401);
  } finally { f.env.DB.close(); }
});

test('native revocation rolls back all credential state when a grant deletion fails', async () => {
  const f = await nativeFixture();
  try {
    const own = await nativeTokens(f);
    await f.env.DB.exec(`CREATE TRIGGER synthetic_revoke_failure BEFORE DELETE ON app_authorizations
      BEGIN SELECT RAISE(ABORT, 'synthetic revocation failure'); END;`);
    assert.equal((await revoke(f, own.access_token, own.refresh_token)).status, 503);
    assert.equal((await nativeRequest(f, '/oauth/userinfo', own.access_token)).status, 200);
    const row = await f.env.DB.prepare('SELECT revoked FROM oauth_refresh_tokens WHERE token_hash = ?').bind(await sha256Hex(own.refresh_token)).first();
    assert.equal(row.revoked, 0);
    await f.env.DB.exec('DROP TRIGGER synthetic_revoke_failure');
    assert.equal((await revoke(f, own.access_token, own.refresh_token)).status, 200);
  } finally { f.env.DB.close(); }
});
