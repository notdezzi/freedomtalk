/**
 * Capture screenshots of every FreedomTalk page in 4 formats:
 *   fullpage    — 1920px wide, entire scroll height
 *   16x9        — 1920x1080 viewport
 *   4x3         — 1600x1200 viewport
 *   iphone16pro — iPhone 16 Pro emulation (402x874 CSS @ deviceScaleFactor 3
 *                 => exactly 1206x2622 physical pixels, matching the phone's
 *                 native screen resolution)
 *
 * Usage: node scripts/screenshot-all.mjs
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = 'http://localhost:3100';
const API = 'http://localhost:3101';
const OUT = fileURLToPath(new URL('../screenshots/', import.meta.url));
const seed = JSON.parse(readFileSync(fileURLToPath(new URL('./seed-result.json', import.meta.url)), 'utf8'));
const { serverId, channelId, dmChannelId, inviteCode } = seed;

// Fresh tokens so nothing expires mid-run
async function login(email, password) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`login failed: ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return body.data;
}

const tokens = await login('demo@freedomtalk.dev', 'DemoPass123!');
console.log('logged in as', tokens.user.username);

const AUTH_STORAGE = {
  freedomtalk_access_token: tokens.accessToken,
  freedomtalk_refresh_token: tokens.refreshToken ?? '',
};

const routes = [
  // public
  { path: '/', slug: 'landing', auth: false },
  { path: '/auth/login', slug: 'auth-login', auth: false },
  { path: '/auth/register', slug: 'auth-register', auth: false },
  { path: '/auth/forgot-password', slug: 'auth-forgot-password', auth: false },
  { path: '/auth/reset-password', slug: 'auth-reset-password', auth: false },
  { path: '/auth/verify-email', slug: 'auth-verify-email', auth: false },
  { path: '/auth/verify-pending', slug: 'auth-verify-pending', auth: false },
  { path: '/auth/2fa/setup', slug: 'auth-2fa-setup', auth: false },
  { path: '/auth/2fa/verify', slug: 'auth-2fa-verify', auth: false },
  { path: '/auth/2fa/backup-codes', slug: 'auth-2fa-backup-codes', auth: false },
  { path: '/auth/2fa/recovery', slug: 'auth-2fa-recovery', auth: false },
  { path: '/auth/oauth/callback', slug: 'auth-oauth-callback', auth: false },
  { path: `/invite/${inviteCode}`, slug: `invite-${inviteCode}`, auth: false },
  { path: `/invite/v/${inviteCode}`, slug: `invite-v-${inviteCode}`, auth: false },
  { path: '/sfu', slug: 'sfu', auth: false },
  // authenticated
  { path: '/app', slug: 'app-home', auth: true },
  { path: `/app/servers/${serverId}/channels/${channelId}`, slug: 'app-server-channel', auth: true },
  { path: `/app/dms/${dmChannelId}`, slug: 'app-dm', auth: true },
  { path: '/onboarding', slug: 'onboarding-welcome', auth: true },
  { path: '/onboarding/profile', slug: 'onboarding-profile', auth: true },
  { path: '/onboarding/interests', slug: 'onboarding-interests', auth: true },
  { path: '/onboarding/servers', slug: 'onboarding-servers', auth: true },
];

const FORMATS = [
  { name: 'fullpage', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, fullPage: true, mobile: false },
  { name: '16x9', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, fullPage: false, mobile: false },
  { name: '4x3', viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1, fullPage: false, mobile: false },
  // 402x874 CSS px @ 3x => 1206x2622 physical px (iPhone 16 Pro screen)
  { name: 'iphone16pro', base: devices['iPhone 15 Pro'], viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, fullPage: false, mobile: true },
];

const browser = await chromium.launch();
let count = 0;

for (const fmt of FORMATS) {
  const context = await browser.newContext({
    ...(fmt.base ?? {}),
    viewport: fmt.viewport,
    deviceScaleFactor: fmt.deviceScaleFactor,
    isMobile: fmt.mobile,
    hasTouch: fmt.mobile,
  });
  // Inject tokens before any page script runs so authed pages render signed-in
  await context.addInitScript((storage) => {
    for (const [k, v] of Object.entries(storage)) {
      if (v) localStorage.setItem(k, v);
    }
  }, AUTH_STORAGE);
  const page = await context.newPage();

  for (const route of routes) {
    const dir = join(OUT, route.slug);
    mkdirSync(dir, { recursive: true });
    const url = `${WEB}${route.path}`;
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 45000 });
      // Give React Query / socket hydration time to paint real content
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(route.auth ? 2500 : 1500);
      const file = join(dir, `${fmt.name}.png`);
      await page.screenshot({ path: file, fullPage: fmt.fullPage });
      count++;
      console.log(`ok  ${route.slug}/${fmt.name}.png`);
    } catch (err) {
      console.log(`ERR ${route.slug}/${fmt.name}: ${err.message.split('\n')[0]}`);
      writeFileSync(join(dir, `${fmt.name}.ERROR.txt`), String(err));
    }
  }
  await context.close();
}

await browser.close();
console.log(`\n${count} screenshots written to ${OUT}`);
