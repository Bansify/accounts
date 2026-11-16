# Native Accounts implementation verification

Branch: `arena/dbdb9048-accounts`, base `885aeef972211bd314bb1515c48a3df0e6535c60`.
Implementation/contract: [NATIVE_ACCOUNTS.md](NATIVE_ACCOUNTS.md).
Full SQL: [migration 14](../migrations/0014_first_party_native.sql).

The results below describe the implementation checkpoint before the owner subsequently
requested PR publication/merge. Current publication/merge status is in TASK.md.

## Local results

| Check | Result |
|---|---|
| `npm run build` | Passed; generated auth entry HTML/bundles shipped together |
| `npx tsc -p cloudflare-worker/tsconfig.json --noEmit` | Passed |
| `npm test` | **327 passed, zero failed/cancelled/skipped**; includes original 309 regressions and 18 new tests |
| Wrangler 4.162.0 `deploy --dry-run` | Passed, 1015.59 KiB / gzip 199.71 KiB; no upload/deploy |
| Wrangler isolated **local** D1 migration 14 | Passed; second migration apply: no migrations to apply |
| Root and Worker `npm audit --omit=dev --audit-level=moderate` | Zero vulnerabilities reported; not a security certification |
| `git diff --check` | Passed |
| Dedicated lint command | None configured; build, types, language/size/import/CSS regression gates used |

The new tests use real SQLite D1 semantics, not successful-response database mocks.
Turnstile tests intercept every siteverify fetch with synthetic responses; no actual
provider or production API was called. Existing revocation tests also retain grant,
password, MFA, deletion, signed-JWT claim, rotation and rollback checks.
Frontend bot tests mock browser DOM/Turnstile callbacks; no full real-provider browser
or physical-Android verification is claimed.

### Exact isolated migration rehearsal (executed locally only)

The directory below is ignored local test data, not the developer's existing database.
Only legacy core and binding tables are needed for this migration-focused rehearsal;
normal installations must follow the documented schema 00–13 prerequisite order.

```sh
npx wrangler d1 execute accounts --local --config cloudflare-worker/wrangler.toml --persist-to /home/user/accounts/.wrangler/native-migration-test --file sql/01_core_schema.sql
npx wrangler d1 execute accounts --local --config cloudflare-worker/wrangler.toml --persist-to /home/user/accounts/.wrangler/native-migration-test --file sql/10_oauth_credential_bindings.sql
npx wrangler d1 migrations apply accounts --local --config cloudflare-worker/wrangler.toml --persist-to /home/user/accounts/.wrangler/native-migration-test
npx wrangler d1 migrations apply accounts --local --config cloudflare-worker/wrangler.toml --persist-to /home/user/accounts/.wrangler/native-migration-test
npx wrangler deploy --config cloudflare-worker/wrangler.toml --dry-run --outdir dist/native-worker-check
```

Wrangler telemetry was disabled with `WRANGLER_SEND_METRICS=false`. No remote D1,
release, deployment, secrets/DNS/WAF configuration, sibling repository, APK signing,
commit, push or merge operation was performed.

## Remaining release work (not executed)

- Review the public-client transition and newly blocked unapproved catalog clients.
- Configure real Turnstile production keys before deploying; required mode fails closed.
- Register release certificate hashes; verify production App Links routing and native
  callback handling, plus equivalent sibling service associations under their owners.
- Provision/pin separately distributed trusted-app signing public keys before any
  Android consumer treats the optional JWS manifest as trusted broker policy.
- Obtain separate approval for backup/migration/deployment and coordinated Pages/API
  rollout. Test real provider/physical-device flows; investigate prior Worker release
  failures separately. Optional handoff and consent auto-skip remain deferred.

## Changed files

`M` modified, `A` added, `D` replaced generated output. Generated auth bundles and
entry HTML changed because they consume the shared API/Turnstile module. The earlier
read-only security-review TASK entry remains in this branch's cumulative changes.

```text
M HANDOVER.md
M PLAN.md
M README.md
M TASK.md
M cloudflare-worker/src/auth-rate-limit.ts
M cloudflare-worker/src/db.ts
M cloudflare-worker/src/http.ts
M cloudflare-worker/src/index.ts
M cloudflare-worker/src/oauth-helpers.ts
M cloudflare-worker/src/oauth-schema.ts
M cloudflare-worker/src/oauth-state.ts
M cloudflare-worker/src/origins.ts
M cloudflare-worker/src/routes/oauth-decision.ts
M cloudflare-worker/src/routes/oauth-token.ts
M cloudflare-worker/src/routes/oauth.ts
M cloudflare-worker/src/types.ts
M cloudflare-worker/wrangler.toml
M docs/ARCHITECTURE.md
M docs/OAUTH.md
M docs/README.md
M docs/SETUP.md
M docs/STORE_OAUTH.md
M sql/README.md
M tests/d1-native-auth.test.mjs
M tests/google-multiple-accounts.test.mjs
M tests/google-signin-methods.test.mjs
M tests/oauth-revocation-security.test.mjs
M tests/security-request-policy.test.mjs
M tools/test-oauth-security.mjs
M web/_headers
D web/assets/auth/google-UDSRNKUZ.js
D web/assets/auth/shared-DSUY5HIN.js
D web/assets/auth/signin-PQGCD6EF.js
D web/assets/auth/signup-VOCMBHLG.js
M web/js/api.js
M web/signin/google/index.html
M web/signin/index.html
M web/signup/index.html
A cloudflare-worker/src/first-party.ts
A cloudflare-worker/src/oauth-access.ts
A cloudflare-worker/src/routes/mobile.ts
A cloudflare-worker/src/routes/oauth-native-revoke.ts
A cloudflare-worker/src/routes/trusted-apps.ts
A cloudflare-worker/src/turnstile.ts
A docs/NATIVE_ACCOUNTS.md
A docs/NATIVE_ACCOUNTS_VERIFICATION.md
A migrations/0014_first_party_native.sql
A tests/bot-check-client.test.mjs
A tests/first-party-oauth.test.mjs
A tests/helpers/native-oauth-harness.mjs
A tests/mobile-oauth.test.mjs
A tests/native-discovery-bot.test.mjs
A tools/generate-first-party-sql.mjs
A web/assets/auth/google-55G7NU2J.js
A web/assets/auth/shared-E4A3J3UN.js
A web/assets/auth/signin-TPUTJVXQ.js
A web/assets/auth/signup-VNGQWBMV.js
A web/js/bot-check.js
```
