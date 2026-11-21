/** Real Worker/SQLite native OAuth fixtures; all identities and credentials are synthetic. */
import { getNativeDb } from '../../cloudflare-worker/src/native-db.ts';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import worker from '../../cloudflare-worker/src/index.ts';
import { makeEnv, seedAccount } from './multi-account-harness.mjs';
export const accountsClient = 'gothwad-accounts-android';
export const nativeVerifier = 'v'.repeat(43);
export const nativeChallenge = createHash('sha256').update(nativeVerifier).digest('base64url');
export const fullScope = 'profile email offline_access drive.read account.read account.profile.write';
export async function nativeFixture() {
  const env = makeEnv();
  const owner = await seedAccount(env, { username: 'nativeowner', firstName: 'Native', lastName: 'Owner' });
  await getNativeDb(env);
  return { env, owner };
}
export function callback(client) {
  return client === accountsClient ? 'com.bansify.accounts:/oauth/callback' :
    client === 'gothwad-mail' ? 'com.gothwad.mail:/oauth/callback' :
    client === 'kiwi-store' ? 'com.gothwad.store:/oauth/callback' : `com.gothwad.accounts.sample.${client.endsWith('beta') ? 'beta' : 'alpha'}:/oauth/callback`;
}
export const decisionBody = (client = accountsClient, scope = fullScope) => ({
  approved: true, client_id: client, redirect_uri: callback(client), response_type: 'code', scope,
  code_challenge: nativeChallenge, code_challenge_method: 'S256', state: 'account-specific-state',
});
export async function nativeCode(f, { client = accountsClient, scope = fullScope, owner = f.owner, extra = {} } = {}) {
  const response = await owner.jar.fetch(f.env, '/api/oauth/decision', {
    method: 'POST', body: { ...decisionBody(client, scope), ...extra },
  });
  assert.equal(response.status, 200, await response.clone().text());
  const url = new URL((await response.json()).redirect_url);
  assert.equal(url.searchParams.get('state'), 'account-specific-state');
  return url.searchParams.get('code');
}
export function nativeRequest(f, path, access, { method = 'GET', body, headers = {} } = {}) {
  return worker.fetch(new Request(`https://api.bansify.com${path}`, {
    method, headers: { ...(access ? { Authorization: `Bearer ${access}` } : {}), ...headers,
      ...(body ? { 'Content-Type': body instanceof URLSearchParams ? 'application/x-www-form-urlencoded' : 'application/json' } : {}) },
    body: body ? body instanceof URLSearchParams ? body : JSON.stringify(body) : undefined,
  }), f.env);
}
export const nativeToken = (f, body) => nativeRequest(f, '/oauth/token', null, { method: 'POST', body });
export async function nativeTokens(f, options = {}) {
  const client = options.client || accountsClient;
  const code = await nativeCode(f, options);
  const response = await nativeToken(f, { grant_type: 'authorization_code', client_id: client,
    code, code_verifier: nativeVerifier, redirect_uri: callback(client) });
  assert.equal(response.status, 200, await response.clone().text());
  return response.json();
}
export const nativeRefresh = (f, token, client = accountsClient) => nativeToken(f, {
  grant_type: 'refresh_token', client_id: client, refresh_token: token,
});
