/**
 * HTTP provisioning helpers for the FreedomTalk k6 scripts.
 *
 * Contract notes (verified against packages/api/src/routes):
 *  - POST /api/v1/auth/register {username,email,password}
 *      username: ^[a-zA-Z0-9_]+$, 3..32 chars; password: 8..128 chars
 *      -> 201 { success: true, data: { userId, username, email, message } }
 *      409 when email/username taken. Rate limit: 5 / 15 min per IP unless the
 *      API runs with SKIP_RATE_LIMIT=true (or NODE_ENV=test).
 *  - POST /api/v1/auth/login {email,password}
 *      -> 200 { success: true, data: { accessToken, refreshToken, user{...} } }
 *      MFA-enabled accounts instead return { data: { mfaRequired: true } } and
 *      NO tokens — load tests must use non-MFA accounts.
 *      Rate limit: 5 / 15 min per IP unless skipped (see above).
 *  - POST /api/v1/servers/:serverId/invites  (Bearer; needs CREATE_INVITE)
 *      body { maxAge, maxUses, temporary } -> 201 { success, data: { code, ... } }
 *  - POST /api/v1/servers/join { inviteCode } (Bearer) -> { success, data: {...} }
 *
 * All responses use the envelope { success, data | error }.
 */

import http from 'k6/http';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, INVITE_CODE, SERVER_ID, AUTO_PROVISION, POOL_SIZE, LOAD_PASSWORD } from './config.js';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** POST /api/v1/auth/login -> accessToken (throws on failure / MFA). */
export function apiLogin(email, password) {
  const res = http.post(
    BASE_URL + '/api/v1/auth/login',
    JSON.stringify({ email: email, password: password }),
    { headers: JSON_HEADERS, tags: { name: 'login' } }
  );
  if (res.status !== 200) {
    throw new Error('login failed for ' + email + ' (HTTP ' + res.status + '): ' + String(res.body).slice(0, 200));
  }
  const body = res.json();
  const data = body && body.data;
  if (data && data.mfaRequired) {
    throw new Error('account ' + email + ' requires MFA — load tests must use a non-MFA account');
  }
  if (!data || !data.accessToken) {
    throw new Error('login response missing data.accessToken: ' + String(res.body).slice(0, 200));
  }
  return data.accessToken;
}

/** POST /api/v1/auth/register -> true; false when the account already exists (409). */
export function apiRegister(username, email, password) {
  const res = http.post(
    BASE_URL + '/api/v1/auth/register',
    JSON.stringify({ username: username, email: email, password: password }),
    { headers: JSON_HEADERS, tags: { name: 'register' } }
  );
  if (res.status === 201) return true;
  if (res.status === 409) return false; // email/username taken — try login anyway
  throw new Error('register failed for ' + email + ' (HTTP ' + res.status + '): ' + String(res.body).slice(0, 200));
}

/** POST /api/v1/servers/:serverId/invites -> invite code (throws on failure). */
export function apiCreateInvite(adminToken, serverId) {
  const res = http.post(
    BASE_URL + '/api/v1/servers/' + serverId + '/invites',
    JSON.stringify({ maxAge: 3600, maxUses: 0, temporary: false }),
    {
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
      tags: { name: 'create_invite' },
    }
  );
  if (res.status !== 201) {
    throw new Error('invite creation failed (HTTP ' + res.status + '): ' + String(res.body).slice(0, 200));
  }
  const body = res.json();
  const code = body && body.data && body.data.code;
  if (!code) {
    throw new Error('invite response missing data.code: ' + String(res.body).slice(0, 200));
  }
  return code;
}

/** POST /api/v1/servers/join { inviteCode } — tolerant of "already a member". */
export function apiJoinServer(token, inviteCode) {
  const res = http.post(
    BASE_URL + '/api/v1/servers/join',
    JSON.stringify({ inviteCode: inviteCode }),
    {
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      tags: { name: 'server_join' },
    }
  );
  return res.status >= 200 && res.status < 300;
}

/**
 * Provision the user pool and return an array of access tokens.
 *
 * Modes:
 *  - K6_AUTO_PROVISION=false: single shared account from K6_EMAIL/K6_PASSWORD.
 *    NOTE: the server caps concurrent sockets per user (default 5), so this
 *    mode only supports small VU counts unless the API raises the cap.
 *  - default (auto-provision): registers K6_POOL_SIZE (default min(VUs, 25))
 *    throwaway users, logs them in, and joins them to the target server via an
 *    invite — created on the fly by the K6_EMAIL admin, or provided directly
 *    via K6_INVITE_CODE.
 *
 * REQUIRES the API to run with SKIP_RATE_LIMIT=true for pool sizes > ~4
 * (register and login are limited to 5 requests / 15 min per IP otherwise).
 */
export function provisionPool(targetVus) {
  const tokens = [];

  if (!AUTO_PROVISION) {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error('K6_AUTO_PROVISION=false requires K6_EMAIL and K6_PASSWORD');
    }
    console.log('[k6] single-account mode: all VUs share ' + ADMIN_EMAIL +
      ' (watch the server per-user connection cap, default 5)');
    tokens.push(apiLogin(ADMIN_EMAIL, ADMIN_PASSWORD));
    return tokens;
  }

  // Resolve an invite code so pool users can join the target server.
  let inviteCode = INVITE_CODE;
  if (!inviteCode) {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error(
        'auto-provisioning needs either K6_INVITE_CODE, or K6_EMAIL/K6_PASSWORD ' +
        '(a member of the target server with CREATE_INVITE — the server owner works)'
      );
    }
    if (!SERVER_ID) {
      throw new Error('K6_SERVER_ID is required so the admin can create an invite');
    }
    const adminToken = apiLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
    inviteCode = apiCreateInvite(adminToken, SERVER_ID);
    console.log('[k6] created load-test invite for server ' + SERVER_ID);
  }

  const size = POOL_SIZE > 0 ? POOL_SIZE : Math.min(targetVus, 25);
  const runId = Date.now().toString(36);
  console.log('[k6] provisioning ' + size + ' load-test users (run ' + runId + ')...');

  for (let i = 0; i < size; i++) {
    // username must satisfy ^[a-zA-Z0-9_]+$ and 3..32 chars
    const username = ('k6' + runId + 'u' + i).slice(0, 32);
    const email = username + '@loadtest.local';
    try {
      apiRegister(username, email, LOAD_PASSWORD);
    } catch (e) {
      // fall through — login below surfaces the real problem
      console.warn('[k6] register warn: ' + e.message);
    }
    const token = apiLogin(email, LOAD_PASSWORD);
    if (inviteCode) {
      apiJoinServer(token, inviteCode);
    }
    tokens.push(token);
  }
  console.log('[k6] provisioned ' + tokens.length + ' users');
  return tokens;
}
