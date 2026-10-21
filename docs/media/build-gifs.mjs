/**
 * Build the iPhone chrome overlay (status bar + home indicator, NO camera /
 * dynamic island drawn, island space left empty) and encode both GIFs.
 * Phone canvas: 1206x2622 (iPhone 16 Pro native, portrait).
 */
import { createRequire } from "module";
import { execFileSync } from "child_process";
import { writeFileSync, statSync } from "fs";

const require = createRequire(
  "C:/Users/notdezzi/Desktop/notdezzi/github-portfolio/freedomtalk/package.json"
);
const { chromium } = require("playwright");
const sharp = require("sharp");

const OUT =
  "C:/Users/notdezzi/Desktop/notdezzi/github-portfolio/freedomtalk/docs/media";

// 1. sample the site's top-of-page color from the first phone frame
const { data, info } = await sharp(`${OUT}/frames-phone/f_00000.png`)
  .extract({ left: 2, top: 2, width: 1, height: 1 })
  .raw()
  .toBuffer({ resolveWithObject: true });
const bg = `rgb(${data[0]},${data[1]},${data[2]})`;
console.log("status strip bg:", bg);

// 2. render the chrome overlay (transparent page window: y 177..2622)
const html = `<!doctype html><html><head><style>
* { margin:0; padding:0; box-sizing:border-box }
html, body { width:1206px; height:2622px; background:transparent; overflow:hidden }
.strip { position:absolute; left:0; top:0; width:1206px; height:177px; background:${bg} }
.time { position:absolute; left:78px; top:0; height:177px; display:flex; align-items:center;
        font:600 49px/1 "Segoe UI", -apple-system, system-ui, sans-serif; color:#fff; letter-spacing:0.5px }
.right { position:absolute; right:46px; top:0; height:177px; display:flex; align-items:center; gap:24px }
.home { position:absolute; left:394px; top:2583px; width:417px; height:15px; border-radius:8px;
        background:rgba(255,255,255,0.95) }
</style></head><body>
<div class="strip"></div>
<div class="time">9:41</div>
<div class="right">
  <!-- cellular: 4 ascending bars -->
  <svg width="64" height="40" viewBox="0 0 64 40" fill="none">
    <rect x="0"  y="25" width="11" height="15" rx="3" fill="#fff"/>
    <rect x="17" y="17" width="11" height="23" rx="3" fill="#fff"/>
    <rect x="34" y="9"  width="11" height="31" rx="3" fill="#fff"/>
    <rect x="51" y="1"  width="11" height="39" rx="3" fill="#fff"/>
  </svg>
  <!-- wifi -->
  <svg width="53" height="38" viewBox="0 0 53 38" fill="none">
    <path d="M26.5 34.5 L31.8 28.1 A8.4 8.4 0 0 0 21.2 28.1 Z" fill="#fff"/>
    <path d="M13.9 19.9 A18.9 18.9 0 0 1 39.1 19.9 L34.6 25.3 A11.9 11.9 0 0 0 18.4 25.3 Z" fill="#fff"/>
    <path d="M2.6 6.6 A33.9 33.9 0 0 1 50.4 6.6 L45.9 12 A27 27 0 0 0 7.1 12 Z" fill="#fff"/>
  </svg>
  <!-- battery -->
  <svg width="90" height="40" viewBox="0 0 90 40" fill="none">
    <rect x="1.5" y="1.5" width="72" height="37" rx="11" stroke="rgba(255,255,255,0.45)" stroke-width="3" fill="none"/>
    <rect x="6.5" y="6.5" width="52" height="27" rx="7" fill="#fff"/>
    <path d="M78 13.5 v13 a7 7 0 0 0 0 -13 z" fill="rgba(255,255,255,0.45)"/>
  </svg>
</div>
<div class="home"></div>
</body></html>`;

writeFileSync(`${OUT}/chrome.html`, html);
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1206, height: 2622 },
  deviceScaleFactor: 1,
});
await page.goto(`file:///${OUT.replace(/\\/g, "/")}/chrome.html`);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/chrome.png`, omitBackground: true });
await browser.close();
console.log("chrome overlay rendered");

// 3. encode
function ffmpeg(args) {
  execFileSync("ffmpeg", ["-y", ...args], { stdio: ["ignore", "pipe", "pipe"] });
}

const HOLD = 15; // seconds upper bound for the looped chrome input

// desktop 16:9
ffmpeg([
  "-f", "concat", "-safe", "0",
  "-i", `${OUT}/frames-desktop/frames.ffconcat`,
  "-vf", "split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle",
  "-loop", "0",
  `${OUT}/freedomtalk-scroll-desktop.gif`,
]);

// phone: pad frames to 1206x2622 (page at y=177), overlay chrome
ffmpeg([
  "-f", "concat", "-safe", "0",
  "-i", `${OUT}/frames-phone/frames.ffconcat`,
  "-loop", "1", "-t", String(HOLD),
  "-i", `${OUT}/chrome.png`,
  "-filter_complex",
  "[0:v]pad=1206:2622:0:177:black[base];" +
    "[base][1:v]overlay=0:0,split[a][b];" +
    "[a]palettegen=stats_mode=diff[p];" +
    "[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle",
  "-loop", "0",
  `${OUT}/freedomtalk-scroll-phone.gif`,
]);

for (const f of ["freedomtalk-scroll-desktop.gif", "freedomtalk-scroll-phone.gif"]) {
  const mb = statSync(`${OUT}/${f}`).size / 1024 / 1024;
  console.log(`${f}: ${mb.toFixed(1)} MB`);
}
console.log("encode done");
