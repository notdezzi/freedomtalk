/* One-off: capture the friends home page. Spawns API+web itself, shoots, tears down. */
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const OUT = path.join(__dirname, 'review');
const WEB = 'http://localhost:3000';
const API = 'http://localhost:3001';
const EMAIL = 'ftdesign-check-1007@freedomtalk.dev';
const PASSWORD = 'DesignCheck!2026x';
const PKG = path.join(__dirname, '..');

const up = async (url) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return r.ok;
  } catch {
    return false;
  }
};

const waitUp = async (url, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await up(url)) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
};

(async () => {
  const apiUp = await up(`${API}/health`);
  const webUp = await up(`${WEB}/auth/login`);
  const kids = [];
  if (!apiUp) {
    console.log('spawning api');
    kids.push(spawn('cmd.exe', ['/c', 'npm', 'run', 'dev'], { cwd: path.join(PKG, '..', 'api'), stdio: 'ignore', detached: true }));
  }
  if (!webUp) {
    console.log('spawning web');
    kids.push(spawn('cmd.exe', ['/c', 'npm', 'run', 'dev'], { cwd: PKG, stdio: 'ignore', detached: true }));
  }
  const apiOk = apiUp || (await waitUp(`${API}/health`, 90000));
  const webOk = webUp || (await waitUp(`${WEB}/auth/login`, 90000));
  if (!apiOk || !webOk) throw new Error(`servers not up: api=${apiOk} web=${webOk}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    deviceScaleFactor: 2,
  });
  await page.goto(`${WEB}/auth/login`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app', { timeout: 30000 });
  await page.goto(`${WEB}/app`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(5, 500);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, 'app-friends-desktop.png'), fullPage: true });
  console.log('captured app-friends-desktop.png');

  // channel view + mobile drawer
  const login = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  }).then((r) => r.json());
  if (login.success) {
    const h = { Authorization: `Bearer ${login.data.accessToken}` };
    const srv = await fetch(`${API}/api/v1/servers`, { headers: h }).then((r) => r.json());
    const servers = Array.isArray(srv.data) ? srv.data : srv.data?.servers || [];
    if (servers[0]) {
      const ch = await fetch(`${API}/api/v1/servers/${servers[0].id}/channels`, { headers: h }).then((r) => r.json());
      const channels = Array.isArray(ch.data) ? ch.data : ch.data?.channels || [];
      const general = channels.find((c) => c.type === 'text');
      if (general) {
        await page.goto(`${WEB}/app/servers/${servers[0].id}/channels/${general.id}`, { waitUntil: 'networkidle', timeout: 120000 });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(OUT, 'app-channel-mobile.png'), fullPage: true });
        console.log('captured app-channel-mobile.png');
        const burger = page.locator('button[aria-label="Toggle navigation"]');
        if (await burger.count()) {
          await burger.click();
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(OUT, 'app-channel-mobile-drawer.png'), fullPage: true });
          console.log('captured app-channel-mobile-drawer.png');
        }
      }
    }
  }
  await browser.close();

  for (const k of kids) {
    try {
      k.kill();
      process.kill(-k.pid);
    } catch {}
  }
  console.log('DONE');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
