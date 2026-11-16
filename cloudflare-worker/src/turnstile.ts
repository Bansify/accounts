/** Interactive bot verification. Refresh inherits the durable authorization proof, not an APK secret. */
import type { Env } from './types.ts';
import { json } from './http.ts';
export async function verifyBot(request: Request, env: Env, token: unknown, action: string): Promise<Response | null> {
  if (env.TURNSTILE_REQUIRED !== 'true') return null;
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) {
    return json({ error: 'temporarily_unavailable', message: 'Bot verification is not configured.' }, 503);
  }
  if (typeof token !== 'string' || !token || token.length > 2048) return json({ error: 'bot_verification_required' }, 403);
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) body.set('remoteip', ip);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body, signal: AbortSignal.timeout(8000),
    });
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
    const hosts = [new URL(env.AUTH_HUB_URL).hostname, env.API_DOMAIN].filter(Boolean);
    if (response.ok && result.success === true && hosts.includes(result.hostname || '') && result.action === action) return null;
  } catch { return json({ error: 'temporarily_unavailable', message: 'Bot verification is unavailable.' }, 503); }
  return json({ error: 'bot_verification_failed' }, 403);
}
