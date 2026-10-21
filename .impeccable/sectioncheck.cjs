const { chromium } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, 'review');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
  });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);

  const targets = [
    { sel: '#customize-heading', name: 'section-1-anim.png' },
    { sel: '#friends-heading', name: 'section-2-anim.png' },
    { sel: '#hangout-heading', name: 'section-3-anim.png' },
    { sel: '#cta-heading', name: 'cta-anim.png' },
  ];
  for (const t of targets) {
    await page.locator(t.sel).scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -80));
    await page.waitForTimeout(1400);
    await page.screenshot({ path: path.join(OUT, t.name) });
    console.log('captured', t.name);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
