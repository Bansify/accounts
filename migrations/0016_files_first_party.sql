-- Migration 16: register Bansify Files as a first-party OAuth client.
--
-- files.bansify.com (web) and the Android app com.bansify.files sign in with the same
-- Bansify Account. No signing certificate is seeded here: android_cert_sha256 stays '[]'
-- until the release keystore's SHA-256 is added, so a debug build cannot impersonate it.

INSERT INTO ecosystem_apps
  (id, client_id, name, description, icon, first_party, android_package, redirect_uris, allowed_scopes, is_verified, is_core, active)
VALUES (
  'gothwad-files',
  'gothwad-files',
  'Bansify Files',
  'Browse, clean and organise storage on Android',
  'folder',
  1,
  'com.bansify.files',
  '["https://files.bansify.com/oauth/callback","com.bansify.files:/oauth/callback"]',
  '["profile","email","offline_access"]',
  1,
  0,
  1
)
ON CONFLICT(client_id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  first_party = excluded.first_party,
  android_package = excluded.android_package,
  redirect_uris = excluded.redirect_uris,
  active = excluded.active;
