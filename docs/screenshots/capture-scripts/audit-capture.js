// Audit capture: mobile + desktop, hero viewport + full page + menu open
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:3210';
const OUT = process.env.OUT_DIR || __dirname;

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600); // let entrance animations finish
}

async function scrollThrough(page) {
  // Scroll step by step so IntersectionObserver reveals fire everywhere
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.75;
    const max = document.body.scrollHeight;
    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 180));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });
  await page.waitForTimeout(900);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  const configs = [
    { name: 'desktop', width: 1440, height: 900, dpr: 2 },
    { name: 'mobile', width: 390, height: 844, dpr: 3, mobile: true },
    { name: 'mobile-320', width: 320, height: 690, dpr: 2, mobile: true },
  ];

  for (const c of configs) {
    const ctx = await browser.newContext({
      viewport: { width: c.width, height: c.height },
      deviceScaleFactor: c.dpr,
      isMobile: !!c.mobile,
      hasTouch: !!c.mobile,
      userAgent: c.mobile
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        : undefined,
    });
    const page = await ctx.newPage();

    // collect console errors + horizontal overflow info
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await settle(page);

    // hero viewport shot
    await page.screenshot({ path: `${OUT}/${c.name}-hero.png` });

    // horizontal overflow check
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const wide = [];
      document.querySelectorAll('*').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > doc.clientWidth + 1 || r.left < -1) {
          wide.push(`${el.tagName}.${(el.className || '').toString().slice(0, 60)} L${Math.round(r.left)} R${Math.round(r.right)}`);
        }
      });
      return { scrollW: doc.scrollWidth, clientW: doc.clientWidth, wide: wide.slice(0, 12) };
    });
    console.log(`[${c.name}] scrollW=${overflow.scrollW} clientW=${overflow.clientW}`);
    overflow.wide.forEach((w) => console.log(`  overflow: ${w}`));

    if (c.name === 'mobile') {
      // open the mobile menu
      await page.click('.ftl-nav-toggle');
      await page.waitForTimeout(450);
      await page.screenshot({ path: `${OUT}/${c.name}-menu.png` });
      await page.click('.ftl-nav-toggle');
      await page.waitForTimeout(300);
    }

    await scrollThrough(page);
    await page.screenshot({ path: `${OUT}/${c.name}-full.png`, fullPage: true });

    console.log(`[${c.name}] console errors: ${errors.length ? errors.join(' | ') : 'none'}`);
    await ctx.close();
  }

  await browser.close();
  console.log('DONE');
})();
