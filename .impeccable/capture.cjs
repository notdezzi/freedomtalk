/* Capture settled full-page screenshots of the landing page.
   Two passes:
   - reduced motion  → the settled state (reveals final, floats still)
   - animations on   → captures mid-float to prove nothing detaches
                       from its layout position while animating       */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'review');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  const shots = [
    { name: 'desktop.png', width: 1440, height: 900 },
    { name: 'mobile.png', width: 390, height: 844 },
  ];

  for (const shot of shots) {
    // settled pass
    let page = await browser.newPage({
      viewport: { width: shot.width, height: shot.height },
      reducedMotion: 'reduce',
      deviceScaleFactor: 1,
    });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, shot.name), fullPage: true });
    console.log(`captured ${shot.name}`);
    await page.close();

    // animated pass (mid-float)
    page = await browser.newPage({
      viewport: { width: shot.width, height: shot.height },
      reducedMotion: 'no-preference',
      deviceScaleFactor: 1,
    });
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: path.join(OUT, shot.name.replace('.png', '-animated.png')), fullPage: true });
    console.log(`captured ${shot.name.replace('.png', '-animated.png')}`);
    await page.close();
  }

  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
