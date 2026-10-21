/* Zoomed element captures of the alignment-fixed regions.
   deviceScaleFactor 2 so pill/icon/letter centering is judgeable. */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'review');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    deviceScaleFactor: 2,
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);

  const shots = [
    { sel: 'svg[role="img"]', name: 'align-hero-scene.png' },
    { sel: '.ftl-feature-art svg >> nth=0', name: 'align-customize.png' },
    { sel: '.ftl-feature-art svg >> nth=1', name: 'align-friends.png' },
    { sel: '.ftl-feature-art svg >> nth=2', name: 'align-hangout.png' },
    { sel: '#hangout-heading', name: 'align-beta-chip.png' },
  ];

  for (const { sel, name } of shots) {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await el.screenshot({ path: path.join(OUT, name) });
    console.log(`captured ${name}`);
  }

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
