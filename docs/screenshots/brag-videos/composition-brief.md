# Hyperframes Composition Brief: FreedomTalk

## Objective
Create a short launch-style brag video for FreedomTalk, a self-hosted Discord-style real-time communication platform.

## Output
- Composition directory: `C:\Users\notdezzi\Desktop\notdezzi\brag-videos\freedomtalk\composition\`
- Rendered video: `C:\Users\notdezzi\Desktop\notdezzi\brag-videos\freedomtalk\brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20.5 seconds

## Source Material
- Project root: `C:\Users\notdezzi\Desktop\notdezzi\github-portfolio\freedomtalk`
- Primary files read: `README.md`, `packages/web/app/globals.css`, `packages/web/components/landing/Hero.tsx`, `NarrativeSections.tsx`, `SystemDepth.tsx`, `packages/web/components/messaging/message-input.tsx`, `packages/web/components/layout/navigation-column.tsx`
- Product name: FreedomTalk
- Tagline / strongest claim: "Own Your Conversations." / "Communication Infrastructure for Everyone"
- Key UI or visual moment to recreate: the FreedomTalk app shell — server rail, channel list (#general, #introductions, #self-hosting), message pane, "Message #general" input — with messages arriving, typing indicator, and a reaction popping on. Secondary: the hero's copper "energy" glow on near-black, gear/circuit motif.
- Copy that must appear verbatim:
  - "Own Your Conversations."
  - "Communication Infrastructure for Everyone"
  - "Open Source Infrastructure"
  - "End-to-End Encrypted" / "Self-Hostable" / "Zero Tracking"
  - "Message #general" (input placeholder), "Text Channels", #general / #introductions / #self-hosting
  - "Your infrastructure, your rules."
  - "Because your conversations deserve freedom."
  - Tech names: Fastify 5, Socket.io, PostgreSQL, Redis, RabbitMQ, mediasoup, Next.js 16
  - "$ npm run docker:up" (real Quick Start command)
- Fictional stand-ins allowed: chat message text and usernames (mira, tomas) are invented fictional stand-ins — no real user data exists.

## Creative Direction
- Tone preset: polished
- Creative direction: "quiet premium infrastructure film with copper mechanical energy"
- Interpretation: confident restraint — few scenes, longer holds, big Syne display type, precise mechanical motion (conduit lines drawing, subtle gear accents), never bouncy. The swagger of self-hosting a Discord-scale stack is the only humor.
- Angle: FreedomTalk is a Discord-style platform you can actually own. The video sells ownership and infrastructure using the site's own copy and a recreated working chat UI.
- Hook: first 2.5s — "Own Your Conversations." slams in as copper-gradient display type, landing ~0.56s on a strong beat, with a thin copper conduit line drawing beneath.
- Outro / punchline: FreedomTalk wordmark over a breathing copper glow, "Because your conversations deserve freedom.", footer "181 commits · fully open source".
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity (from packages/web/app/globals.css — brand truth)
- Background: #0C0B0A (elevated #141311, surface #1C1A18, warm #1A1714)
- Text: #F5F2ED (muted #A8A29E, subtle #6B6560)
- Accent: copper energy #D4843C / bright #F0A04B / dim #8B5A2B; glow rgba(212,132,60,0.4); secondary teal #2D9596 / #4ABFBF
- Display font: Syne (700-800) — via local @font-face
- Body font: Outfit (300-500) — via local @font-face
- Mono: JetBrains Mono (terminal/stack moments) — via local @font-face
- Visual references from the project: copper radial glow at top of hero, circuit-line SVG paths, gear motif, hairline borders rgba(245,242,237,0.06-0.12), status pill with pinging copper dot, noise texture (3% opacity)

## Storyboard
Use the storyboard in `brag-plan.md` as the creative contract.
Scene summary:
1. Hook — 2.5s — "Own Your Conversations." copper display type + conduit line
2. Reveal — 3.5s — FreedomTalk wordmark, "Open Source Infrastructure" pill, "Communication Infrastructure for Everyone", trust row ◆ ◇ ○
3. The app, alive — 8s — recreated app shell; typing → send → messages arrive one by one → reaction pops → typing indicator
4. Stack + punchline — 4s — tech chips grid, typed `$ npm run docker:up`, "Your infrastructure, your rules."
5. Outro — 2.5s — wordmark, "Because your conversations deserve freedom.", "181 commits · fully open source", fade out

## Audio
- Audio role: warm confident bed with restrained mechanical accents
- Audio arc: confident open → steady build → quiet alive middle → one mechanical hit on the punchline → resolved fade
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (polished/cinematic character per skill guidance)
- Music treatment: data-volume ~0.32, starts at 0, gentle fade out over the final ~2s of the outro
- Music cue guidance: bundled preset — `C:\Users\notdezzi\.zcode\cli\plugins\cache\brag\brag\0.4.0\skills\brag\assets\music\cues\happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`. Tempo ~110 BPM. Strong cues in window: 8.74, 9.29, 10.93, 13.11, 17.47, 18.56. Planned locks (1-3): hook line lands 0.56s (beat 0.56), tomas' message lands 9.29s (strong cue 9.29), punchline "Your infrastructure, your rules." at 17.47s (strong cue 17.47). Beat grid for sequential events: trust labels ~3.82/4.39/4.91; chat messages ~7.09/8.19/9.29/10.37/11.46; tech chips 14.20→16.93 every other beat if needed. Snap within ±0.10s for small events, ±0.15s for major locks. Ignore cues when they harm readability.
- Audio-reactive treatment: subtle — pre-extract audio bands and let the copper radial glow / hero presence breathe with bass and RMS (3-8% on text-safe elements, up to 15% on background glow). No waveform/equalizer visuals.
- Audio-coupled moments:
  - Scene 1 hook land — single low soft impact at 0.56s
  - Scene 2 trust labels — very soft tick/drop per label
  - Scene 3 typing into input — randomized keyboard keypress WAVs
  - Scene 3 send + message arrivals — soft click/drop, message at 9.29 gets the accent
  - Scene 3 reaction pop — soft pop/select
  - Scene 4 terminal typing — randomized keypresses; punchline — one confident impact (impactSoft_medium, nothing aggressive)
  - Scene 5 wordmark — let music fade carry it
- SFX selection guidance: use `<skill-dir>/assets/sfx/sfx-analysis.md`; polished tone = minimal but present (2-3 subtle SFX families), prefer low HF-risk files; SFX at 0.5-0.75 volume. Copy chosen SFX into `composition/assets/sfx/`.
- Exact SFX choice: Hyperframes chooses filenames, timestamps, density after the animation exists.
- Audio files: music + SFX copied into `composition/assets/` (music already at `composition/assets/music/`).

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview or its generic promo workflow.

Requirements:
- Standalone composition in `composition/index.html` (no `<template>` wrapper), root `data-composition-id="freedomtalk-brag"`, 1920x1080, `data-duration="20.5"`.
- All fonts via local @font-face files shipped in `composition/assets/fonts/`.
- Deterministic seekable GSAP timeline registered as `window.__timelines["freedomtalk-brag"]` after build completes (may build inside `document.fonts.ready`).
- No `Math.random()`/clocks (keyboard SFX randomization is file choice, not runtime randomness); no CSS transform + GSAP transform conflicts; never tween `.clip` elements' visibility/autoAlpha; every `<audio>` has an id and unique `data-track-index` (music 10, SFX 11+).
- Show at least one real UI recreation (scene 3 app shell) and the verbatim copy listed above.
- Every readable line holds: short labels ≥0.8s settled, sentences ≥0.3s/word. Fast-in then hold.
- Keep the video within 20.5s; landscape 1920x1080.
- Audio-reactive: extract per-frame audio data with the `hyperframes-creative` skill's `scripts/extract-audio-data.py` into `composition/assets/audio-data.js` (or equivalent local file) and sample it per-frame via `tl.call()`.
- Run `npx hyperframes check` before render — the single gate.
- Keep creation and rendering local.
