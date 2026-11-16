/** Interactive Turnstile only; no browser token persistence and no native refresh challenge. */
import { apiUrl } from './config.js';
let loader;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (!loader) loader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const failed = () => { clearTimeout(timeout); script.remove(); reject(new Error('Bot verification could not load. Please try again.')); };
    const timeout = setTimeout(failed, 20000);
    script.onload = () => { clearTimeout(timeout); if (window.turnstile) resolve(); else failed(); };
    script.onerror = failed;
    document.head.append(script);
  }).catch(error => { loader = null; throw error; });
  return loader;
}
export async function botToken(path) {
  if (!['/auth/signin', '/auth/signup'].includes(path)) return null;
  const response = await fetch(apiUrl('/auth/bot-config'), { credentials: 'omit', cache: 'no-store' });
  if (!response.ok) throw new Error('Bot verification configuration is unavailable.');
  const config = await response.json();
  if (!config.required) return null;
  if (!config.site_key) throw new Error('Bot verification is not configured. Please try again later.');
  await loadTurnstile();
  return new Promise((resolve, reject) => {
    const dialog = document.createElement('dialog');
    const title = document.createElement('p');
    title.id = 'bot-check-title';
    dialog.setAttribute('aria-labelledby', title.id);
    title.textContent = 'Verify that you are human to continue';
    const widget = document.createElement('div');
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    dialog.append(title, widget, cancel);
    document.body.append(dialog);
    let widgetId;
    let timer;
    let finished = false;
    const finish = (token, error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (widgetId !== undefined) window.turnstile.remove(widgetId);
      dialog.close();
      dialog.remove();
      if (error) reject(error); else resolve(token);
    };
    const cancelled = () => finish(null, new Error('Bot verification was cancelled. Please try again.'));
    cancel.addEventListener('click', cancelled);
    dialog.addEventListener('cancel', event => { event.preventDefault(); cancelled(); });
    dialog.showModal();
    timer = setTimeout(() => finish(null, new Error('Bot verification timed out. Please try again.')), 180000);
    try { widgetId = window.turnstile.render(widget, {
      sitekey: config.site_key, action: path.slice(6), callback: token => finish(token),
      'error-callback': () => finish(null, new Error('Bot verification failed. Please try again.')),
      'expired-callback': () => finish(null, new Error('Bot verification expired. Please try again.')),
    }); } catch { finish(null, new Error('Bot verification could not start. Please try again.')); }
  });
}
