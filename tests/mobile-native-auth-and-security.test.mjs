import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as OTPAuth from 'otpauth';
import { nativeFixture, nativeRequest, nativeToken, nativeRefresh, accountsClient, callback } from './helpers/native-oauth-harness.mjs';

const totpCode = (secret) => new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret), algorithm: 'SHA1', digits: 6, period: 30 }).generate();

test('direct native Android signup, signin, token refresh, and cross-app peer-code SSO work with zero browser even when TURNSTILE_REQUIRED=true', async () => {
  const f = await nativeFixture();
  try {
    f.env.TURNSTILE_REQUIRED = 'true';

    // 1. Native username & identifier availability checks
    const unameCheck = await (await nativeRequest(f, '/api/mobile/auth/check-username', null, {
      method: 'POST',
      body: { username: 'androidnative' },
    })).json();
    assert.equal(unameCheck.available, true);
    assert.equal(unameCheck.email, 'androidnative@gothwadtech.com');

    // 2. Direct native Android signup (`gothwad-accounts-android`)
    const signupRes = await nativeRequest(f, '/api/mobile/auth/signup', null, {
      method: 'POST',
      body: {
        client_id: accountsClient,
        first_name: 'Android',
        last_name: 'Native',
        username: 'androidnative',
        password: 'NativePassword!123',
        recovery_email: 'recovery.native@example.com',
        phone_number: '+919876543210',
        date_of_birth: '2001-05-15',
        gender: 'Male',
      },
    });
    assert.equal(signupRes.status, 201);
    const signup = await signupRes.json();
    assert.equal(signup.ok, true);
    assert.equal(signup.client_id, accountsClient);
    assert.ok(signup.access_token);
    assert.ok(signup.refresh_token);
    assert.equal(signup.user.username, 'androidnative');

    // 3. Verify token refresh works even with TURNSTILE_REQUIRED = 'true'
    const refreshRes = await nativeRefresh(f, signup.refresh_token, accountsClient);
    assert.equal(refreshRes.status, 200);
    const refreshed = await refreshRes.json();
    assert.ok(refreshed.access_token);

    // 4. Direct native Android signin (`gothwad-mail`)
    const mailSigninRes = await nativeRequest(f, '/api/mobile/auth/signin', null, {
      method: 'POST',
      body: {
        client_id: 'gothwad-mail',
        scope: 'profile email offline_access mail',
        identifier: 'androidnative@gothwadtech.com',
        password: 'NativePassword!123',
      },
    });
    assert.equal(mailSigninRes.status, 200);
    const mailSignin = await mailSigninRes.json();
    assert.equal(mailSignin.client_id, 'gothwad-mail');
    const mailInfo = await (await nativeRequest(f, '/oauth/userinfo', mailSignin.access_token)).json();
    assert.equal(mailInfo.client_id, 'gothwad-mail');
    assert.equal(mailInfo.preferred_username, 'androidnative');
    assert.ok(mailInfo.scopes.includes('mail'));

    // 5. Cross-app zero-browser silent SSO (`POST /api/mobile/auth/peer-code`)
    // Accounts Android mints a PKCE-bound code for Gothwad Mail without any browser or consent screen.
    const verifier = 'm'.repeat(48);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const peerRes = await nativeRequest(f, '/api/mobile/auth/peer-code', refreshed.access_token, {
      method: 'POST',
      body: {
        target_client_id: 'gothwad-mail',
        redirect_uri: callback('gothwad-mail'),
        scope: 'profile email offline_access mail',
        code_challenge: challenge,
        code_challenge_method: 'S256',
      },
    });
    assert.equal(peerRes.status, 200);
    const peerCode = await peerRes.json();
    assert.equal(peerCode.ok, true);
    assert.ok(peerCode.code);

    const exchangeRes = await nativeToken(f, {
      grant_type: 'authorization_code',
      client_id: 'gothwad-mail',
      redirect_uri: callback('gothwad-mail'),
      code: peerCode.code,
      code_verifier: verifier,
    });
    assert.equal(exchangeRes.status, 200);
    const exchanged = await exchangeRes.json();
    const exchangedInfo = await (await nativeRequest(f, '/oauth/userinfo', exchanged.access_token)).json();
    assert.equal(exchangedInfo.client_id, 'gothwad-mail');
    assert.equal(exchangedInfo.preferred_username, 'androidnative');
  } finally {
    f.env.DB.close();
  }
});

test('full native Android account management: phone, avatar, password, recovery email, MFA enrollment/signin/disable, export, and delete', async () => {
  const f = await nativeFixture();
  try {
    f.env.DEV_MODE = 'true';
    f.env.MFA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64url');
    const signinRes = await nativeRequest(f, '/api/mobile/auth/signin', null, {
      method: 'POST',
      body: {
        client_id: accountsClient,
        identifier: 'nativeowner',
        password: 'StrongPassword!123',
      },
    });
    assert.equal(signinRes.status, 200);
    const auth = await signinRes.json();
    const token = auth.access_token;

    // 1. Update phone number natively
    const phoneRes = await nativeRequest(f, '/api/mobile/phone', token, {
      method: 'POST',
      body: { phone_number: '+919988776655', current_password: 'StrongPassword!123' },
    });
    assert.equal(phoneRes.status, 200);
    assert.equal((await phoneRes.json()).phone_number, '+919988776655');

    // 2. Upload & delete avatar natively
    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const upAvatar = await nativeRequest(f, '/api/mobile/avatar', token, {
      method: 'POST',
      body: { image_base64: tinyPng },
    });
    assert.equal(upAvatar.status, 200);
    assert.ok((await upAvatar.json()).avatar_url);

    const delAvatar = await nativeRequest(f, '/api/mobile/avatar', token, { method: 'DELETE' });
    assert.equal(delAvatar.status, 200);
    assert.equal((await delAvatar.json()).avatar_url, null);

    // 3. Change password natively (and verify current Android token remains active!)
    const pwdRes = await nativeRequest(f, '/api/mobile/password', token, {
      method: 'POST',
      body: { current_password: 'StrongPassword!123', new_password: 'UpdatedPassword!456' },
    });
    assert.equal(pwdRes.status, 200);
    assert.equal((await nativeRequest(f, '/oauth/userinfo', token)).status, 200);

    // 4. Request & verify recovery email natively
    const recReq = await nativeRequest(f, '/api/mobile/recovery-email/request', token, {
      method: 'POST',
      body: { recovery_email: 'verified.backup@example.com', current_password: 'UpdatedPassword!456' },
    });
    assert.equal(recReq.status, 200);
    const recReqJson = await recReq.json();
    assert.ok(recReqJson.dev_token);

    const recVer = await nativeRequest(f, '/api/mobile/recovery-email/verify', token, {
      method: 'POST',
      body: { token: recReqJson.dev_token },
    });
    assert.equal(recVer.status, 200);
    assert.equal((await recVer.json()).recovery_email, 'verified.backup@example.com');

    // 5. Native 2-Step Verification (MFA enroll -> confirm -> native MFA signin -> disable)
    const enrollRes = await nativeRequest(f, '/api/mobile/mfa/enroll', token, {
      method: 'POST',
      body: { current_password: 'UpdatedPassword!456' },
    });
    assert.equal(enrollRes.status, 200);
    const enrolled = await enrollRes.json();
    assert.ok(enrolled.secret);

    const confirmRes = await nativeRequest(f, '/api/mobile/mfa/confirm', token, {
      method: 'POST',
      body: {
        current_password: 'UpdatedPassword!456',
        enrollment_id: enrolled.enrollment_id,
        code: totpCode(enrolled.secret),
      },
    });
    assert.equal(confirmRes.status, 200);
    const confirmed = await confirmRes.json();
    assert.equal(confirmed.recovery_codes.length, 10);

    // Verify native signin now prompts for MFA and completes via /api/mobile/auth/signin/mfa
    const mfaStep1 = await nativeRequest(f, '/api/mobile/auth/signin', null, {
      method: 'POST',
      body: {
        client_id: 'gothwad-mail',
        scope: 'profile email offline_access mail',
        identifier: 'nativeowner',
        password: 'UpdatedPassword!456',
      },
    });
    assert.equal(mfaStep1.status, 202);
    const step1Body = await mfaStep1.json();
    assert.equal(step1Body.mfa_required, true);

    const mfaStep2 = await nativeRequest(f, '/api/mobile/auth/signin/mfa', null, {
      method: 'POST',
      body: {
        client_id: 'gothwad-mail',
        scope: 'profile email offline_access mail',
        challenge: step1Body.challenge,
        code: confirmed.recovery_codes[0],
      },
    });
    assert.equal(mfaStep2.status, 200);
    assert.ok((await mfaStep2.json()).access_token);

    // Disable MFA using another recovery code
    const disableRes = await nativeRequest(f, '/api/mobile/mfa/disable', token, {
      method: 'POST',
      body: {
        current_password: 'UpdatedPassword!456',
        code: confirmed.recovery_codes[1],
      },
    });
    assert.equal(disableRes.status, 200);

    // 6. Export account data natively
    const exportRes = await nativeRequest(f, '/api/mobile/export', token);
    assert.equal(exportRes.status, 200);
    assert.equal((await exportRes.json()).export, 'gothwad-accounts');

    // 7. Delete account natively
    const delRes = await nativeRequest(f, '/api/mobile/delete-account', token, {
      method: 'POST',
      body: { password: 'UpdatedPassword!456' },
    });
    assert.equal(delRes.status, 200);
    assert.equal((await nativeRequest(f, '/oauth/userinfo', token)).status, 401);
  } finally {
    f.env.DB.close();
  }
});
