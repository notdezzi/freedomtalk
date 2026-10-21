/*
 * Scroll-through GIF capture for the FreedomTalk landing, following the
 * proven recipe from pi-discord-bridge / pico-landing gif-capture scripts:
 * deterministic integer scroll, a settle wait before every screenshot so no
 * frame catches a mid-repaint, SVG iPhone chrome (clock centered in the left
 * ear, signal/wifi/battery as clean SVGs, home indicator; island space
 * reserved but nothing drawn), and a diff-aware two-pass GIF palette.
 *
 * Phone pacing borrows both references: a stop-list with authored holds —
 * one beat per landing section (positions measured live from the DOM, not
 * assumed) so each 0.65s fade-up reveal plays out on camera — and two-speed
 * travel that runs brisk between beats and brakes for the last stretch
 * before each one.
 *
 *   node gif-capture-ft.js phone|desktop
 */
const { createRequire } = require("module");
const req = createRequire("C:/Users/notdezzi/Desktop/notdezzi/github-portfolio/freedomtalk/package.json");
const { chromium } = req("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const URL = "http://localhost:3310/";
const MEDIA = "C:/Users/notdezzi/Desktop/notdezzi/freedomtalk-media";
const FPS = 15;
const HOLD_START = 24; // frames parked on the hero (entrance pop plays)
const HOLD_END = 24;

const CONFIGS = {
  phone: {
    width: 402, height: 874, dsf: 3, isMobile: false, hasTouch: true,
    beats: true, // one hold per landing section; slow approach into each
    slowSpeed: 240, // px/s braking into a beat: the reveal has wall-clock time
    fastSpeed: 560, // px/s between beats
    approachVh: 0.6, // fraction of the viewport over which the brake applies
    holdBeat: 9, // frames per beat ~= the 0.65s reveal transition
    iphone: true,
    scale: null,
    out: path.join(MEDIA, "gifs", "freedomtalk-scroll-phone-1206x2622.gif"),
  },
  desktop: {
    width: 1440, height: 810, dsf: 2, isMobile: false, hasTouch: false,
    beats: false, // no section beats: constant 300 px/s, as originally shipped
    slowSpeed: 300, fastSpeed: 300, approachVh: 0.6, holdBeat: 9,
    iphone: false,
    scale: "1920:1080",
    out: path.join(MEDIA, "gifs", "freedomtalk-scroll-desktop-16x9.gif"),
  },
};

/* iPhone device chrome as a fixed overlay: solid charcoal status band so
   scrolled content never shows through, clock centered in the left half,
   SVG signal/wifi/battery, home indicator. No island/camera is drawn but
   the 54px inset is reserved and the page's own nav is pushed below it. */
function iphoneChrome() {
  if (document.getElementById("ios-chrome")) return;
  const style = document.createElement("style");
  style.textContent = `
    .ftl-nav { top: 54px !important; }
    body { padding-top: 54px !important; }
    .ftl-mobile-menu { top: 130px !important; }
    #ios-chrome { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; }
    #ios-status {
      position: absolute; top: 0; left: 0; right: 0; height: 54px;
      background: #23272a; color: #fff;
      font: 600 16px/1 -apple-system, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
    }
    #ios-status .t {
      position: absolute; left: 0; top: 0; height: 54px; width: 50%;
      display: flex; align-items: center; justify-content: center;
      letter-spacing: 0.02em;
    }
    #ios-status .i {
      position: absolute; right: 0; top: 0; height: 54px; width: 50%;
      display: flex; align-items: center; justify-content: flex-end;
      gap: 7px; padding-right: 14px;
    }
    #ios-home {
      position: absolute; bottom: 8px; left: 50%; translate: -50% 0;
      width: 139px; height: 5px; border-radius: 3px; background: #fff; opacity: 0.9;
    }
  `;
  const chrome = document.createElement("div");
  chrome.id = "ios-chrome";
  chrome.innerHTML = `
    <div id="ios-status">
      <span class="t">9:41</span>
      <span class="i">
        <svg width="18" height="12" viewBox="0 0 18 12" fill="#fff" aria-hidden="true"><rect x="0" y="7.5" width="3" height="4" rx="1"/><rect x="4.7" y="5" width="3" height="6.5" rx="1"/><rect x="9.3" y="2.5" width="3" height="9" rx="1"/><rect x="14" y="0" width="3" height="11.5" rx="1"/></svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="#fff" aria-hidden="true"><path d="M8.5 1.6c2.7 0 5.2 1 7.1 2.7l-1.4 1.4a8.2 8.2 0 0 0-11.4 0L1.4 4.3a10.4 10.4 0 0 1 7.1-2.7z"/><path d="M8.5 5.9c1.6 0 3 .6 4.1 1.5L11.2 8.9a3.9 3.9 0 0 0-5.4 0L4.4 7.4a6.2 6.2 0 0 1 4.1-1.5z"/><circle cx="8.5" cy="10.4" r="1.6"/></svg>
        <svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true"><rect x="0.5" y="0.5" width="21" height="12" rx="3.8" fill="none" stroke="#fff" stroke-opacity="0.4"/><rect x="2.4" y="2.4" width="17.2" height="8.2" rx="2" fill="#fff"/><path d="M 23.6 4.3 v 4.4 a 2.4 2.4 0 0 0 0 -4.4 z" fill="#fff" fill-opacity="0.4"/></svg>
      </span>
    </div>
    <div id="ios-home"></div>
  `;
  document.head.append(style);
  document.body.append(chrome);
}

(async () => {
  const which = process.argv[2];
  const cfg = CONFIGS[which];
  if (!cfg) throw new Error("pass 'phone' or 'desktop'");
  const framesDir = path.join(MEDIA, "gifs", `ft-frames-${which}`);
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: cfg.width, height: cfg.height },
    deviceScaleFactor: cfg.dsf,
    isMobile: cfg.isMobile,
    hasTouch: cfg.hasTouch,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1600); // hero entrance pop plays out
  if (cfg.iphone) await page.evaluate(iphoneChrome);

  const geo = await page.evaluate((wantBeats) => ({
    maxY: document.documentElement.scrollHeight - window.innerHeight,
    vh: window.innerHeight,
    beats: wantBeats
      ? [...document
          .querySelectorAll(".ftl-section, .ftl-oss-strip, .ftl-cta-wrap")]
          .map((el) => el.getBoundingClientRect().top + window.scrollY)
      : [],
  }), cfg.beats);
  const maxY = geo.maxY;

  // stop list: [scrollY, holdFrames]. Hero at the top, one beat per landing
  // section (anchored so its heading sits in the upper frame), bottom at the
  // end. Positions are read back from the live DOM, then clamped monotonic.
  const stops = [[0, HOLD_START]];
  for (const top of geo.beats) {
    stops.push([Math.max(1, Math.round(top - geo.vh * 0.16)), cfg.holdBeat]);
  }
  stops.push([maxY, HOLD_END]);
  for (let i = 1; i < stops.length; i++) {
    stops[i][0] = Math.min(maxY, Math.max(stops[i][0], stops[i - 1][0] + 1));
  }

  // expand into the per-frame y timeline: fast between beats, braking over
  // the last approachVh of viewport before each one (pico's paced scroll),
  // then holding while the reveal plays (pi-bridge's authored holds)
  const ys = [];
  for (let i = 0; i < stops.length; i++) {
    const [y, hold] = stops[i];
    if (i > 0) {
      let cur = stops[i - 1][0];
      while (cur < y) {
        const speed =
          y - cur <= cfg.approachVh * geo.vh ? cfg.slowSpeed : cfg.fastSpeed;
        cur = Math.min(y, cur + speed / FPS);
        ys.push(Math.round(cur));
      }
    }
    for (let h = 0; h < hold; h++) ys.push(y);
  }

  for (let i = 0; i < ys.length; i++) {
    await page.evaluate((yy) => window.scrollTo(0, yy), ys[i]);
    await page.waitForTimeout(95); // let the compositor settle + rAF loops advance
    await page.screenshot({
      path: path.join(framesDir, `frame-${String(i).padStart(5, "0")}.png`),
    });
  }
  console.log(
    `${which}: ${ys.length} frames (${(ys.length / FPS).toFixed(1)}s @${FPS}fps), travel ${maxY}px, ` +
      `beats: ${geo.beats.map((t) => Math.round(t)).join(", ") || "none"}` +
      (errors.length ? `  PAGE ERRORS: ${errors.join(" | ")}` : "")
  );
  await browser.close();

  // two-pass palette, diff-aware so scrolling frames stay clean
  const pal = path.join(framesDir, "pal.png");
  const scaleVf = cfg.scale ? `scale=${cfg.scale}:flags=lanczos,` : "";
  const scaleLavfi = cfg.scale ? `scale=${cfg.scale}:flags=lanczos [x]; ` : "";
  const secondInput = cfg.scale ? `[x][1:v]` : `[0:v][1:v]`;
  execFileSync(
    "ffmpeg",
    ["-y", "-framerate", String(FPS), "-i", path.join(framesDir, "frame-%05d.png"),
     "-vf", `${scaleVf}palettegen=stats_mode=diff`, pal],
    { stdio: "pipe" }
  );
  execFileSync(
    "ffmpeg",
    ["-y", "-framerate", String(FPS), "-i", path.join(framesDir, "frame-%05d.png"),
     "-i", pal,
     "-lavfi", `${scaleLavfi}${secondInput} paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
     cfg.out],
    { stdio: "pipe" }
  );
  const mb = (fs.statSync(cfg.out).size / 1048576).toFixed(1);
  console.log(`${which}: wrote ${cfg.out} (${mb} MB)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
