/**
 * Re-capture a subset of pages in all 4 formats.
 * Usage: node scripts/recapture.mjs app-server-channel app-dm
 */
import { chromium, devices } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = 'http://localhost:3100';
const API = 'http://localhost:3101';
const OUT = fileURLToPath(new URL('../screenshots/', import.meta.url));
const only = process.argv.slice(2);

const seed = JSON.parse(readFileSync(fileURLToPath(new URL('./seed-result.json', import.meta.url)), 'utf8'));
const { serverId, channelId, dmChannelId } = seed;

const res = await fetch(`${API}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo@freedomtalk.dev', password: 'DemoPass123!' }),
});
const tokens = (await res.json()).data;
const AUTH_STORAGE = {
  freedomtalk_access_token: tokens.accessToken,
  freedomtalk_refresh_token: tokens.refreshToken ?? '',
};

const routes = [
  { path: '/app', slug: 'app-home' },
  { path: `/app/servers/${serverId}/channels/${channelId}`, slug: 'app-server-channel' },
  { path: `/app/dms/${dmChannelId}`, slug: 'app-dm' },
].filter((r) => only.length === 0 || only.includes(r.slug));

const FORMATS = [
  { name: 'fullpage', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, fullPage: true, mobile: false },
  { name: '16x9', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, fullPage: false, mobile: false },
  { name: '4x3', viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1, fullPage: false, mobile: false },
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
  await context.addInitScript((storage) => {
    for (const [k, v] of Object.entries(storage)) if (v) localStorage.setItem(k, v);
  }, AUTH_STORAGE);
  const page = await context.newPage();
  for (const route of routes) {
    const dir = join(OUT, route.slug);
    mkdirSync(dir, { recursive: true });
    try {
      await page.goto(`${WEB}${route.path}`, { waitUntil: 'load', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(3000);
      await page.screenshot({ path: join(dir, `${fmt.name}.png`), fullPage: fmt.fullPage });
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
console.log(`\n${count} re-captured`);
