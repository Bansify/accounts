/**
 * Native Android App Link fallback bridge for `/oauth/callback`.
 * When Chrome Custom Tabs performs a same-host navigation to `https://<host>/oauth/callback`,
 * this bridge hands the exact HTTPS callback URI to `com.bansify.accounts` (`AccountCallbackActivity`).
 */
export function buildAndroidCallbackIntentUrl(host = location.host, search = location.search || '') {
  return (
    `intent://${host}/oauth/callback${search}` +
    '#Intent;scheme=https;package=com.bansify.accounts;' +
    'action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end'
  );
}

if (typeof document !== 'undefined') {
  const openBtn = document.getElementById('oauth-open-app');
  const msgEl = document.getElementById('oauth-callback-message');
  const params = new URLSearchParams(location.search || '');
  const hasOAuthParams = params.has('code') || params.has('error');

  if (hasOAuthParams && location.host) {
    const intentUrl = buildAndroidCallbackIntentUrl(location.host, location.search);
    if (openBtn) openBtn.setAttribute('href', intentUrl);
    if (/Android/i.test(navigator.userAgent || '')) {
      location.replace(intentUrl);
    } else if (msgEl) {
      msgEl.textContent = 'Tap the button below to return to the Bansify Accounts app.';
    }
  } else if (msgEl) {
    msgEl.textContent = 'No active authorization callback parameters were found.';
  }
}
