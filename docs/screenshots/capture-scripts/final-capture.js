// Final media production: hi-res full-page screenshots + scroll GIFs.
// Desktop GIF: 16:9. Phone GIF: iPhone 16 Pro full-screen 1206x2622 with
// an iOS status bar + home indicator drawn in, dynamic island left empty.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3310';
const OUT = process.env.OUT_DIR || path.join(__dirname, '..', 'freedomtalk-media');
const FPS = 15;
const HOLD = 1.6; // seconds held at top and bottom

fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'gifs'), { recursive: true });

const IOS_STATUS_HTML = `
<div id="ios-status" style="position:fixed;top:0;left:0;right:0;height:54px;z-index:2147483647;pointer-events:none;color:#ffffff;background:#23272a;font-family:-apple-system,'SF Pro Text','Segoe UI',system-ui,sans-serif;">
  <span id="ios-clock" style="position:absolute;left:52px;top:17px;font-size:17px;font-weight:600;letter-spacing:0;">9:41</span>
  <span style="position:absolute;right:170px;top:21px;display:flex;align-items:flex-end;gap:2px;" aria-hidden="true">
    <i style="width:3px;height:4px;background:#fff;border-radius:1px;"></i>
    <i style="width:3px;height:6px;background:#fff;border-radius:1px;"></i>
    <i style="width:3px;height:8px;background:#fff;border-radius:1px;"></i>
    <i style="width:3px;height:11px;background:#fff;border-radius:1px;"></i>
  </span>
  <svg style="position:absolute;right:118px;top:19px;" width="18" height="13" viewBox="0 0 18 13" fill="none" aria-hidden="true">
    <path d="M9 10.6a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z" fill="#fff" transform="translate(0 -1.6)"/>
    <path d="M9 6.8c1.5 0 2.9.6 3.9 1.6l-1.3 1.3a3.7 3.7 0 0 0-5.2 0L5.1 8.4A5.5 5.5 0 0 1 9 6.8Z" fill="#fff"/>
    <path d="M9 3.2c2.5 0 4.8 1 6.5 2.6l-1.3 1.3A7.3 7.3 0 0 0 9 5a7.3 7.3 0 0 0-5.2 2.1L2.5 5.8A9.2 9.2 0 0 1 9 3.2Z" fill="#fff"/>
    <path d="M9 -0.4c3.5 0 6.7 1.4 9 3.6l-1.3 1.3A11 11 0 0 0 9 1.3 11 11 0 0 0 1.3 4.5L0 3.2c2.3-2.2 5.5-3.6 9-3.6Z" fill="#fff" transform="translate(0 0.6)"/>
  </svg>
  <span style="position:absolute;right:52px;top:19px;display:flex;align-items:center;" aria-hidden="true">
    <i style="display:block;width:25px;height:13px;border:1px solid rgba(255,255,255,0.5);border-radius:4px;padding:1.5px;">
      <i id="ios-batt" style="display:block;width:100%;height:100%;background:#fff;border-radius:2px;"></i>
    </i>
    <i style="display:block;width:1.5px;height:4px;background:rgba(255,255,255,0.5);border-radius:0 1px 1px 0;margin-left:1px;"></i>
  </span>
</div>
<div style="position:fixed;bottom:9px;left:50%;transform:translateX(-50%);width:140px;height:5px;border-radius:3px;background:rgba(255,255,255,0.9);z-index:2147483647;pointer-events:none;"></div>
`;

const IOS_STATUS_CSS = `
.ftl-nav { top: 54px !important; }
body { padding-top: 54px !important; }
.ftl-mobile-menu { top: 130px !important; }
`;

function easeInOutCubic(p) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1800);
}

async function captureFrames(page, dir, speedPxPerSec) {
  fs.mkdirSync(dir, { recursive: true });
  const dist = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  const tScroll = dist / speedPxPerSec;
  const total = HOLD * 2 + tScroll;
  const nFrames = Math.ceil(total * FPS);
  for (let i = 0; i < nFrames; i++) {
    const t = i / FPS;
    let y;
    if (t < HOLD) y = 0;
    else if (t < HOLD + tScroll) y = Math.round(dist * easeInOutCubic((t - HOLD) / tScroll));
    else y = dist;
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.png`) });
  }
  return nFrames;
}

(async () => {
  const browser = await chromium.launch();

  // ---------- Static hi-res full-page screenshots ----------
  for (const c of [
    { name: 'desktop', w: 1440, h: 900, d: 2 },
    { name: 'mobile', w: 402, h: 874, d: 3, m: true },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: c.w, height: c.h },
      deviceScaleFactor: c.d,
      isMobile: !!c.m,
      hasTouch: !!c.m,
    });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.75;
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 170));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(OUT, 'screenshots', `${c.name}-full-page.png`),
      fullPage: true,
    });
    console.log(`saved ${c.name}-full-page.png`);
    await ctx.close();
  }

  // ---------- Desktop 16:9 scroll GIF frames ----------
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 810 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    const n = await captureFrames(page, path.join(OUT, 'gifs', 'frames-desktop'), 380);
    console.log(`desktop frames: ${n}`);
    await ctx.close();
  }

  // ---------- Phone scroll GIF frames (iPhone 16 Pro, 1206x2622) ----------
  {
    const ctx = await browser.newContext({
      viewport: { width: 402, height: 874 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await settle(page);
    await page.evaluate(
      ([html, css]) => {
        document.body.insertAdjacentHTML('beforeend', html);
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
      },
      [IOS_STATUS_HTML, IOS_STATUS_CSS]
    );
    await page.waitForTimeout(400);
    const n = await captureFrames(page, path.join(OUT, 'gifs', 'frames-phone'), 240);
    console.log(`phone frames: ${n}`);
    await ctx.close();
  }

  await browser.close();
  console.log('DONE');
})();
