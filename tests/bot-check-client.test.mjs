import test from 'node:test';
import assert from 'node:assert/strict';
import { apiCall } from '../web/js/api.js';

function property(t, key, value) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { value, writable: true, configurable: true });
  t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else delete globalThis[key]; });
}

test('interactive bot proof covers signin/signup Add-account query paths, stays in memory, and leaves unrelated requests untouched', async t => {
  let rendered = 0;
  let removed = 0;
  let closed = 0;
  const actions = [];
  const calls = [];
  const stub = () => ({ append() {}, setAttribute() {}, addEventListener() {}, showModal() {}, close() { closed++; }, remove() { removed++; } });
  property(t, 'location', { pathname: '/signin', search: '?add=1' });
  property(t, 'document', { createElement: stub, body: { append() {} } });
  property(t, 'window', { turnstile: {
    render(_element, options) {
      rendered++;
      actions.push(options.action);
      queueMicrotask(() => options.callback('synthetic-proof-' + rendered));
      return rendered;
    }, remove() {},
  } });
  t.mock.method(globalThis, 'fetch', async (url, opts) => {
    calls.push([url, opts]);
    if (url === '/api/auth/bot-config') return Response.json({ required: true, site_key: 'synthetic-site-key' });
    return Response.json({ ok: true });
  });
  for (const path of ['/auth/signin', '/auth/signin?add=1', '/auth/signup', '/auth/signup?add=1']) {
    const result = await apiCall(path, { method: 'POST', body: { username: 'synthetic' } });
    assert.equal(result.ok, true);
    const [url, options] = calls.at(-1);
    assert.equal(url, '/api' + path);
    assert.equal(JSON.parse(options.body).turnstile_token, 'synthetic-proof-' + rendered);
    assert.equal(options.credentials, 'include');
  }
  assert.deepEqual(actions, ['signin', 'signin', 'signup', 'signup']);
  assert.equal(removed, 4);
  assert.equal(closed, 4);
  const count = calls.length;
  assert.equal((await apiCall('/auth/me')).ok, true);
  assert.equal(calls.length, count + 1);
  assert.equal(rendered, 4);
});

test('unconfigured required bot checks fail visibly before credentials are submitted', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    calls++;
    assert.equal(url, '/api/auth/bot-config');
    return Response.json({ required: true, site_key: '' });
  });
  const response = await apiCall('/auth/signin?add=1', { method: 'POST', body: { username: 'synthetic' } });
  assert.equal(response.ok, false);
  assert.match(response.error, /not configured/);
  assert.equal(calls, 1);
});
