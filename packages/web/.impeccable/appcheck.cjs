/* Capture the redesigned auth + app surfaces.
   1. Logged out: login (desktop, QR open; mobile), register (desktop)
   2. Log in through the real UI as a seeded test account
   3. Seed server/channels/messages over the API
   4. Capture the app shell: channel view (desktop+mobile), friends home (desktop) */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'review');
const WEB = 'http://localhost:3000';
const API = 'http://localhost:3001';
const EMAIL = 'ftdesign-check-1007@freedomtalk.dev';
const PASSWORD = 'DesignCheck!2026x';

async function apiLogin() {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(`${API}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    const json = await res.json();
    if (json.success) return json.data.accessToken;
    if (String(json.error?.code).includes('RATE_LIMIT') && attempt === 1) {
      console.log('login rate-limited, waiting 70s...');
      await new Promise((r) => setTimeout(r, 70000));
      continue;
    }
    throw new Error('API login failed: ' + JSON.stringify(json));
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  const shot = (page, name) =>
    page.screenshot({ path: path.join(OUT, name), fullPage: true }).then(() => console.log('captured', name));

  // ---------- 1. logged-out auth captures ----------
  let page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    deviceScaleFactor: 2,
  });
  await page.goto(`${WEB}/auth/login`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await shot(page, 'auth-login-desktop.png');

  // QR section open
  const summary = page.locator('summary');
  if (await summary.count()) {
    await summary.click();
    await page.waitForTimeout(700);
    await shot(page, 'auth-login-qr-open.png');
  }

  // mobile login
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await shot(page, 'auth-login-mobile.png');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${WEB}/auth/register`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await shot(page, 'auth-register-desktop.png');

  // ---------- 2. log in through the real UI ----------
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${WEB}/auth/login`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app', { timeout: 30000 });
  await page.waitForTimeout(1500);

  // ---------- 3. seed content over the API ----------
  const token = await apiLogin();
  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const call = async (p, method, body) => {
    const r = await fetch(`${API}${p}`, { method, headers: auth, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) console.log('seed warn', p, r.status, JSON.stringify(j).slice(0, 120));
    return j;
  };

  const existing = await call('/api/v1/servers', 'GET');
  const existingServers = Array.isArray(existing.data) ? existing.data : existing.data?.servers;
  if (!Array.isArray(existingServers)) throw new Error('GET /servers failed, refusing to seed a duplicate: ' + JSON.stringify(existing).slice(0, 200));
  let server = existingServers[0];
  if (!server) {
    const created = await call('/api/v1/servers', 'POST', { name: 'The Crew', description: 'Game nights and bad jokes' });
    server = created.data;
  }
  const serverId = server.id;
  const chans = await call(`/api/v1/servers/${serverId}/channels`, 'GET');
  const channels = chans.data?.channels || [];
  let general = channels.find((c) => c.type === 'text');
  if (!general) {
    general = (await call(`/api/v1/servers/${serverId}/channels`, 'POST', { name: 'general', type: 'text' })).data;
  }
  const msgs = await call(`/api/v1/messages?channelId=${general.id}`, 'GET');
  const existingMsgs = (Array.isArray(msgs.data) ? msgs.data : msgs.data?.messages) || [];
  if (existingMsgs.length === 0) {
    const lines = [
      'gg everyone, voice room is open for game night 🎮',
      'race at 8? i finally fixed my wheel bindings',
      '**reminder**: bring your own snacks, the pantry is a lie',
      'someone clip that last round, i am framing it',
      'ok who queued us into *masters* lobbies again',
    ];
    for (const content of lines) {
      await call('/api/v1/messages', 'POST', { content, channelId: general.id });
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  const channelUrl = `${WEB}/app/servers/${serverId}/channels/${general.id}`;

  // ---------- 4. authenticated app captures ----------
  await page.goto(channelUrl, { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(5, 500); // park the mouse so no hover styles leak into shots
  await page.waitForTimeout(2000);
  await shot(page, 'app-channel-desktop.png');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  await shot(page, 'app-channel-mobile.png');

  // mobile drawer open
  const burger = page.locator('button[aria-label="Open navigation"]');
  if (await burger.count()) {
    await burger.click();
    await page.waitForTimeout(600);
    await shot(page, 'app-channel-mobile-drawer.png');
    await page.mouse.click(390 - 20, 400); // tap backdrop to close
    await page.waitForTimeout(500);
  }

  // ---------- 5. landing (separate .ftl world, same root layout) ----------
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${WEB}/`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await shot(page, 'landing-desktop.png');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${WEB}/app`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.mouse.move(5, 500);
  await page.waitForTimeout(1500);
  await shot(page, 'app-friends-desktop.png');

  await browser.close();
  console.log('DONE');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
