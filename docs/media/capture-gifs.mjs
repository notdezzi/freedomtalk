/**
 * Capture scroll-down GIF frames of the FreedomTalk landing page.
 *
 * - Desktop: 1920x1080 (16:9), deviceScaleFactor 1.
 * - Phone:   402x815 CSS @ deviceScaleFactor 3 -> 1206x2445 frames; these get
 *            composited onto a 1206x2622 iPhone canvas (59pt status strip
 *            reserved at the top, home indicator overlaid at the bottom) in
 *            the ffmpeg pass.
 *
 * Scrolling is animated inside the page with rAF at a constant px/s; frames
 * are screenshotted at a fixed interval with real timestamps recorded, and
 * the ffconcat durations encode exact 1:1 playback speed.
 */
import { createRequire } from "module";
import { mkdirSync, writeFileSync } from "fs";

const require = createRequire(
  "C:/Users/notdezzi/Desktop/notdezzi/github-portfolio/freedomtalk/package.json"
);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:47613";
const OUT =
  "C:/Users/notdezzi/Desktop/notdezzi/github-portfolio/freedomtalk/docs/media";

mkdirSync(`${OUT}/frames-desktop`, { recursive: true });
mkdirSync(`${OUT}/frames-phone`, { recursive: true });

const browser = await chromium.launch();

async function record(opts, framesDir, tag, speed, interval) {
  const page = await browser.newPage(opts);
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600); // let entrance reveals settle

  const total = await page.evaluate((spd) => {
    const travel = document.documentElement.scrollHeight - window.innerHeight;
    window.__ftScroll = { done: false };
    function tick(prev) {
      return function step(t) {
        if (prev == null) prev = t;
        const dt = (t - prev) / 1000;
        prev = t;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const next = Math.min(max, window.scrollY + spd * dt);
        window.scrollTo(0, next);
        if (next >= max) {
          window.__ftScroll.done = true;
          return;
        }
        requestAnimationFrame(step);
      };
    }
    requestAnimationFrame(function first(t) {
      requestAnimationFrame(tick(null));
    });
    return travel;
  }, speed);

  const stamps = [];
  let idx = 0;
  let doneFrames = 0;
  const HOLD_FRAMES = 10;
  while (doneFrames < HOLD_FRAMES) {
    const t = Date.now();
    const y = await page.evaluate(() => Math.round(window.scrollY));
    await page.screenshot({
      path: `${framesDir}/f_${String(idx).padStart(5, "0")}.png`,
    });
    stamps.push({ t, y });
    idx++;
    doneFrames = y >= total - 2 ? doneFrames + 1 : 0;
    await page.waitForTimeout(interval);
  }

  await page.close();

  // drop any long trailing hold beyond ~1.5s of the last scroll frame
  const lastScrollIdx = stamps.reduce(
    (acc, s, i) => (s.y >= total - 2 ? i : acc),
    0
  );
  const cutoff = Math.min(stamps.length - 1, lastScrollIdx + 10);

  // ffconcat at exact 1:1 speed, delays clamped to 20ms (GIF floor)
  let lines = ["ffconcat version 1.0"];
  const kept = stamps.slice(0, cutoff + 1);
  for (let i = 0; i < kept.length; i++) {
    lines.push(`file 'f_${String(i).padStart(5, "0")}.png'`);
    const dur =
      i < kept.length - 1
        ? Math.max(0.02, (kept[i + 1].t - kept[i].t) / 1000)
        : Math.max(0.02, (kept[i].t - kept[i - 1].t) / 1000);
    lines.push(`duration ${dur.toFixed(3)}`);
  }
  writeFileSync(`${framesDir}/frames.ffconcat`, lines.join("\n") + "\n");
  writeFileSync(`${framesDir}/timestamps.json`, JSON.stringify(kept));
  const secs = (kept[kept.length - 1].t - kept[0].t) / 1000;
  console.log(
    `${tag}: ${kept.length} frames kept, ${Math.round(total)}px travel, ~${secs.toFixed(1)}s`
  );
}

await record(
  { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  `${OUT}/frames-desktop`,
  "desktop",
  Number(process.env.DESKTOP_SPEED || 400),
  Number(process.env.DESKTOP_INTERVAL || 30)
);

await record(
  {
    viewport: { width: 402, height: 815 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  `${OUT}/frames-phone`,
  "phone",
  Number(process.env.PHONE_SPEED || 460),
  Number(process.env.PHONE_INTERVAL || 40)
);

await browser.close();
console.log("capture done");
