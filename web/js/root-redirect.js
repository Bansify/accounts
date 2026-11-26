// Fallback for static hosts without Pages rewrites. Do not guess auth state.
// Allow search crawlers (Googlebot, InspectionTool, etc.) to index the root metadata directly.
if (!/\b(Googlebot|Google-InspectionTool|Storebot-Google|GoogleOther|bingbot|DuckDuckBot|Slurp|Baiduspider|YandexBot|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|TelegramBot)\b/i.test(navigator.userAgent || '')) {
  window.location.replace('/me' + window.location.search + window.location.hash);
}
