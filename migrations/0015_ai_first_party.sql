-- Migration 15: register Bansify AI as a first-party OAuth client.
--
-- ai.bansify.com (web) and the Android app com.bansify.ai both sign in with the
-- same Bansify Account. The AI Worker accepts an access token only when Accounts
-- reports client_id = 'gothwad-ai', so this row is what makes the chat API trust
-- the token at all.
--
-- Scopes stay at profile/email/offline_access: chat history is the app's own
-- data, so it does not need a new account-wide scope.
--
-- No signing certificate is seeded here. android_cert_sha256 stays '[]' until the
-- release keystore's SHA-256 is added from the dashboard; a debug build must not
-- be able to impersonate the release app.

INSERT INTO ecosystem_apps
  (id, client_id, name, description, icon, first_party, android_package, redirect_uris, allowed_scopes, is_verified, is_core, active)
VALUES (
  'gothwad-ai',
  'gothwad-ai',
  'Bansify AI',
  'Chat with Bansify AI on web and Android',
  'sparkles',
  1,
  'com.bansify.ai',
  '["https://ai.bansify.com/oauth/callback","com.bansify.ai:/oauth/callback","com.gothwad.ai:/oauth/callback"]',
  '["profile","email","offline_access"]',
  1,
  1,
  1
)
ON CONFLICT(id) DO UPDATE SET
  first_party     = 1,
  client_id       = excluded.client_id,
  name            = excluded.name,
  description     = excluded.description,
  icon            = excluded.icon,
  android_package = excluded.android_package,
  allowed_scopes  = excluded.allowed_scopes,
  is_verified     = 1,
  is_core         = 1,
  active          = 1,
  secret_hash     = NULL,
  redirect_uris   = (SELECT json_group_array(value) FROM (
    SELECT value FROM json_each(ecosystem_apps.redirect_uris)
    UNION SELECT value FROM json_each(excluded.redirect_uris)));
