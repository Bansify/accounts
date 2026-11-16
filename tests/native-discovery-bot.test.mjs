import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyBot } from '../cloudflare-worker/src/turnstile.ts';
import { authRateLimitPolicy, enforceAuthRateLimit } from '../cloudflare-worker/src/auth-rate-limit.ts';
import { nativeFixture, nativeTokens, nativeRequest, nativeRefresh, accountsClient } from './helpers/native-oauth-harness.mjs';
const fingerprint = 'a1'.repeat(32); // Synthetic certificate fingerprint, never a registration seed.

test('assetlinks has exact Android relation/package and release hashes, empty when unconfigured, rejects invalid config/cert writes', async () => {
  const f = await nativeFixture();
  try {
    assert.deepEqual(await (await nativeRequest(f, '/.well-known/assetlinks.json')).json(), []);
    for (const value of ['not-json', '{}', '[null]', JSON.stringify(['A'.repeat(64)]), JSON.stringify(['f'.repeat(63)])]) {
      await assert.rejects(f.env.DB.prepare('UPDATE ecosystem_apps SET android_cert_sha256 = ? WHERE id = ?').bind(value, accountsClient).run());
    }
    await f.env.DB.prepare('UPDATE ecosystem_apps SET android_cert_sha256 = ? WHERE id = ?').bind(JSON.stringify([fingerprint]), accountsClient).run();
    const response = await nativeRequest(f, '/.well-known/assetlinks.json');
    assert.match(response.headers.get('Content-Type'), /application\/json/);
    const links = await response.json();
    assert.deepEqual(links, [{ relation: ['delegate_permission/common.handle_all_urls'], target: {
      namespace: 'android_app', package_name: 'com.gothwad.accounts', sha256_cert_fingerprints: [fingerprint.match(/../g).join(':').toUpperCase()],
    } }]);
    f.env.ANDROID_ASSETLINKS_JSON = JSON.stringify(links);
    assert.deepEqual(await (await nativeRequest(f, '/.well-known/assetlinks.json')).json(), links);
    f.env.ANDROID_ASSETLINKS_JSON = '[{"target":{"package_name":"wrong"}}]';
    assert.equal((await nativeRequest(f, '/.well-known/assetlinks.json')).status, 503);
    f.env.ANDROID_ASSETLINKS_JSON = 'malformed';
    assert.equal((await nativeRequest(f, '/.well-known/assetlinks.json')).status, 503);
  } finally { f.env.DB.close(); }
});

test('trusted apps are active first-party only, versioned/expiring, signed with independently verifiable Ed25519 or ECDSA JWS', async () => {
  const f = await nativeFixture();
  try {
    await f.env.DB.prepare('UPDATE ecosystem_apps SET android_cert_sha256 = ? WHERE id = ?').bind(JSON.stringify([fingerprint]), accountsClient).run();
    await f.env.DB.prepare("UPDATE ecosystem_apps SET active = 0 WHERE id = 'gothwad-accounts-sample-beta'").run();
    const unsigned = await (await nativeRequest(f, '/api/apps/trusted')).json();
    assert.equal(unsigned.signed, false);
    assert.equal(unsigned.version, 1);
    assert.equal(unsigned.expires_at - unsigned.issued_at, 900);
    assert.equal(unsigned.apps.length, 6);
    assert.deepEqual(unsigned.apps.find(a => a.client_id === accountsClient).android_cert_sha256, [fingerprint]);
    assert.ok(unsigned.apps.every(a => a.android_package && !('secret_hash' in a)));
    for (const algorithm of [{ name: 'Ed25519' }, { name: 'ECDSA', namedCurve: 'P-256' }]) {
      const pair = await crypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
      f.env.TRUSTED_APPS_SIGNING_JWK = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey));
      f.env.TRUSTED_APPS_KEY_ID = 'test-release-key';
      const result = await nativeRequest(f, '/api/apps/trusted');
      assert.equal(result.status, 200);
      const signed = await result.json();
      assert.equal(signed.signed, true);
      const [header, payload, signature] = signed.jws.split('.');
      assert.equal(JSON.parse(Buffer.from(header, 'base64url')).kid, 'test-release-key');
      const parsed = JSON.parse(Buffer.from(payload, 'base64url'));
      const { signed: _signed, jws: _jws, ...fields } = signed;
      assert.deepEqual(parsed, fields);
      assert.equal(await crypto.subtle.verify(algorithm.name === 'Ed25519' ? algorithm : { name: 'ECDSA', hash: 'SHA-256' },
        pair.publicKey, Buffer.from(signature, 'base64url'), new TextEncoder().encode(`${header}.${payload}`)), true);
      assert.doesNotMatch(JSON.stringify(signed), /privateKey|"d"|password_hash|secret_hash/);
    }
    f.env.TRUSTED_APPS_SIGNING_JWK = '{"kty":"RSA"}';
    assert.equal((await nativeRequest(f, '/api/apps/trusted')).status, 503, 'configured signing failure must not silently downgrade');
  } finally { f.env.DB.close(); }
});

test('Turnstile fails closed for missing keys/tokens, rejects hostname/action mismatch and binds only server-verified proofs', async t => {
  const f = await nativeFixture();
  try {
    f.env.TURNSTILE_REQUIRED = 'true';
    const request = new Request('https://accounts.gothwadtech.com/auth/signin', { method: 'POST' });
    assert.equal((await verifyBot(request, f.env, 'token', 'signin')).status, 503);
    f.env.TURNSTILE_SITE_KEY = 'synthetic-public-key';
    f.env.TURNSTILE_SECRET_KEY = 'synthetic-private-key';
    assert.equal((await verifyBot(request, f.env, '', 'signin')).status, 403);
    let result = { success: true, hostname: 'attacker.example', action: 'signin' };
    const mock = t.mock.method(globalThis, 'fetch', async (url, options) => {
      assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
      assert.equal(options.body.get('secret'), 'synthetic-private-key');
      return Response.json(result);
    });
    assert.equal((await verifyBot(request, f.env, 'token', 'signin')).status, 403);
    result = { success: true, hostname: 'accounts.gothwadtech.com', action: 'signup' };
    assert.equal((await verifyBot(request, f.env, 'token', 'signin')).status, 403);
    result.action = 'signin';
    assert.equal(await verifyBot(request, f.env, 'token', 'signin'), null);
    const signin = await f.owner.jar.fetch(f.env, '/auth/signin', { method: 'POST', body: { identifier: 'nativeowner', password: 'StrongPassword!123' } });
    assert.equal(signin.status, 403);
    const signup = await f.owner.jar.fetch(f.env, '/auth/signup', { method: 'POST', body: { username: 'botaccount', password: 'StrongPassword!123' } });
    assert.equal(signup.status, 403);
    result.action = 'authorize';
    const own = await nativeTokens(f, { extra: { turnstile_token: 'synthetic-one-use-token' } });
    mock.mock.resetCalls();
    assert.equal((await nativeRefresh(f, own.refresh_token)).status, 200);
    assert.equal(mock.mock.callCount(), 0, 'native refresh must use the durable proof, not Turnstile or an APK secret');
    f.env.TURNSTILE_REQUIRED = 'false';
    const legacy = await nativeTokens(f);
    f.env.TURNSTILE_REQUIRED = 'true';
    assert.equal((await nativeRefresh(f, legacy.refresh_token)).status, 400, 'unverified legacy chains require fresh interactive authorization');
    mock.mock.mockImplementation(async () => { throw new Error('synthetic outage'); });
    assert.equal((await verifyBot(request, f.env, 'token', 'signin')).status, 503);
  } finally { f.env.DB.close(); }
});

test('authorize, decision, signin, signup, token, revoke and mobile have persistent strict limits and no forwarded-IP bypass', async () => {
  const f = await nativeFixture();
  try {
    for (const [route, method] of [['/oauth/authorize', 'GET'], ['/oauth/decision', 'POST'], ['/oauth/authorize/decision', 'POST'],
      ['/auth/signin', 'POST'], ['/auth/signup', 'POST'], ['/oauth/token', 'POST'], ['/oauth/revoke', 'POST'], ['/mobile/profile', 'PATCH']]) {
      const policy = authRateLimitPolicy(method, route);
      assert.ok(policy && policy.limit <= 120, route);
    }
    const policy = authRateLimitPolicy('GET', '/oauth/authorize');
    for (let i = 0; i <= policy.limit; i++) {
      const request = new Request('https://api.gothwadtech.com/oauth/authorize', { headers: { 'X-Forwarded-For': `192.0.2.${i}` } });
      const result = await enforceAuthRateLimit(request, f.env.DB, f.env, '/oauth/authorize', 1800000000000);
      assert.equal(result?.status || 200, i === policy.limit ? 429 : 200);
    }
  } finally { f.env.DB.close(); }
});
