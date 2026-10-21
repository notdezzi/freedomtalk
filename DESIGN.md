---
name: FreedomTalk
description: Playful Discord-world design system for the marketing landing page, scoped to the .ftl namespace
colors:
  charcoal: "#23272a"
  charcoal-deep: "#111214"
  surface: "#2c2f33"
  surface-2: "#36393f"
  hairline: "#3d4046"
  white: "#ffffff"
  text: "#f2f3f5"
  muted: "#b5bac1"
  subtle: "#8e9297"
  blurple: "#5865f2"
  blurple-deep: "#31368e"
  blurple-art-deep: "#4550c4"
  sticker-yellow: "#fee75c"
  sticker-yellow-deep: "#e3c93f"
  sticker-fuchsia: "#eb459e"
  sticker-fuchsia-deep: "#c22e7e"
  sticker-green: "#57f287"
  sticker-green-deep: "#2fbf68"
  alert-red: "#ed4245"
  window-rail: "#1e1f22"
  window-list: "#2b2d31"
  window-raised: "#393c41"
  chat-ink: "#dbdee1"
  ink-shade: "rgba(0, 0, 0, 0.10)"
typography:
  display:
    fontFamily: "'Baloo 2', 'Nunito', system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 6vw + 1rem, 5.25rem)"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "'Baloo 2', 'Nunito', system-ui, sans-serif"
    fontSize: "clamp(2.125rem, 2.6vw + 1rem, 3.25rem)"
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: "-0.015em"
  title:
    fontFamily: "'Baloo 2', 'Nunito', system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Nunito', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "'Baloo 2', 'Nunito', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
rounded:
  btn: "12px"
  card: "20px"
  media: "28px"
  hero: "32px"
  pill: "9999px"
  focus: "8px"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "2rem"
  lg: "3rem"
  xl: "4.5rem"
components:
  button-primary:
    backgroundColor: "{colors.blurple}"
    textColor: "{colors.white}"
    typography: "600 1.0625rem 'Baloo 2', line-height 1"
    rounded: "{rounded.btn}"
    padding: "1.125rem 2rem"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.blurple-deep}"
  button-white:
    backgroundColor: "{colors.white}"
    textColor: "{colors.charcoal}"
    typography: "600 1.0625rem 'Baloo 2', line-height 1"
    rounded: "{rounded.btn}"
    padding: "1.125rem 2rem"
    height: "48px"
  button-white-hover:
    backgroundColor: "#e3e5e8"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "600 1.0625rem 'Baloo 2', line-height 1"
    rounded: "{rounded.btn}"
    padding: "1.125rem 2rem"
    height: "48px"
  button-ghost-hover:
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  button-small:
    padding: "0.625rem 1.125rem"
    height: "44px"
  text-link:
    backgroundColor: "transparent"
    textColor: "{colors.white}"
    typography: "700 1rem 'Nunito'"
  os-badge:
    backgroundColor: "rgba(254, 231, 92, 0.1)"
    textColor: "{colors.sticker-yellow}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
  chip-beta:
    backgroundColor: "rgba(87, 242, 135, 0.12)"
    textColor: "{colors.sticker-green}"
    rounded: "{rounded.pill}"
    padding: "0.2rem 0.625rem"
---

# Design System: FreedomTalk Landing

## Overview

**Creative North Star: "The group chat, grown to page scale."**

FreedomTalk's landing is a flat, playful charcoal world pinned to the Discord design language: a dark ground ramp that steps brighter as panels stack, one blurple that owns every action, and a loud sticker palette that lives only inside artwork. Chunky rounded display type (Baloo 2) shouts the message; a clean rounded body face (Nunito) carries the prose. Bird-mascot characters and flat mockups of the actual app — chat windows, friends lists, voice rooms — are drawn as authored vector scenes, so the page feels like the product rather than a screenshot of it.

**The Scoped World Rule.** This system exists only inside the `.ftl` namespace in `packages/web/components/landing/landing.css`. Every token is prefixed `--ftl-*` and every rule is nested under `.ftl`. The shared `app/globals.css` (warm-charcoal/amber world) still serves the auth and chat pages and must stay untouched — do not "unify" the two worlds, promote `.ftl` tokens to `:root`, or style other surfaces with them.

The system is flat-first, confirmed by the shipped code: zero `box-shadow` drop shadows, zero gradients, zero backdrop-filter glass, zero photography in `landing.css` and the illustration set. Depth is tonal (surface color steps), closeness is corner radius, and liveliness is motion plus artwork. Under `prefers-reduced-motion: reduce` every animation is off and all content is visible.

**Key Characteristics:**
- Charcoal ground ramp (#23272a → #2c2f33 → #36393f, hairlines #3d4046, footer band #111214) with near-white ink in four steps.
- One action color: blurple #5865f2 for fills, selection, and accent words; deep indigo #31368e as its hover depth.
- Sticker palette (yellow/fuchsia/green/red) confined to artwork and micro-accents, never structural fills.
- Flat everywhere: color-swap button hovers with a 2px lift, no shadow vocabulary.
- Rounded, capsule-driven shapes: 12px controls up to 32px hero panels, 9999px pills.
- One ambient motion moment (the hero scene); sections settle once and only when JS can reveal them.

## Colors

The palette is a dark, low-chroma charcoal ramp guarded by a single loud accent and a locked toy box of sticker colors.

### Primary
- **Blurple** (#5865f2, `--ftl-blurple`): the only structural accent. Primary button fills, the big CTA panel background, text-selection background, headline accent words, wordmark second half ("Talk"), and in-artwork UI accents (send button, invite pill, active server tile).
- **Deep Indigo** (#31368e, `--ftl-blurple-deep`): blurple's hover depth. Primary buttons darken to it on hover; it never appears at rest.
- **Blurple Art Shade** (#4550c4): the illustration-only sibling used for mascot wings, tufts, and limbs. Not interchangeable with the UI hover indigo.

### Neutral
- **Charcoal Base** (#23272a): page ground, nav bar, mobile menu.
- **Elevated Charcoal** (#2c2f33): raised strips — the open-source band, and the 28px-rounded backdrop panels behind feature artwork.
- **Panel Charcoal** (#36393f): the highest structural panel — the hero app-window fill and card fills inside artwork.
- **Deep Charcoal** (#111214): the footer band, the darkest step.
- **Hairline** (#3d4046): 1px dividers — nav bottom border on scroll, strip edges, footer rules; also faint background sprinkles inside the hero scene.
- **White** (#ffffff): headline text on blurple, secondary button fill, primary-button text, plus-sign sprinkles, focus ring.
- **Cloud Ink** (#f2f3f5): default text on charcoal.
- **Silver Muted** (#b5bac1): ledes, secondary copy, quiet links. Holds ≥ 4.5:1 on the charcoal ramp.
- **Dim Gray** (#8e9297): small print, footer column heads, hero trust-note. Used at semibold+ so it stays legible.
- **Chat Ink** (#dbdee1): message-body text inside drawn app windows (artwork only).

### Sticker Palette (Artwork Contained)
- **Sticker Yellow** (#fee75c) with deep shade #e3c93f: mascot beaks and feet, sparkle/star stickers, drawn windows' traffic dots, the "gg" bubble.
- **Sticker Fuchsia** (#eb459e) with deep shade #c22e7e: the chill mascot, heart stickers, blush, drawn avatars and role chips.
- **Sticker Green** (#57f287) with deep shade #2fbf68: the gamer and painter mascots, headphone LED, BETA chip, online dots, drawn presence.
- **Alert Red** (#ed4245): appears exactly once in the system — the traffic-light dot inside the drawn app window chrome.

**The Sticker Containment Rule.** Sticker colors never fill structure. No yellow buttons, no fuchsia panels, no green sections. Outside artwork they surface only as micro-accents: the yellow hover-underline, the yellow "Open source" badge and button focus ring, the green BETA chip. If a proposed element puts a sticker color on a background larger than a chip, it's breaking the world.

**The Red Rule.** #ed4245 is window-chrome art material, not UI. It must not appear on buttons, text, badges, or state colors outside a drawn app window.

## Typography

**Display Font:** Baloo 2 (weights 600–800 shipped; fallback Nunito, then system-ui), loaded via next/font as `--font-baloo`.
**Body Font:** Nunito (400–800 shipped, fallback system-ui), loaded as `--font-nunito`.

**Character:** A chunky, round-boned display face doing the talking over a rounded, unobtrusive workhorse doing the explaining — internet-native warmth with high legibility on dark ground. Display type is set tight: -0.015em tracking, line-heights 1.02–1.06, `text-wrap: balance`.

### Hierarchy
- **Display (Baloo 2, 800, clamp(2.75rem, 6vw + 1rem, 5.25rem), lh 1.02)**: the H1, once per page.
- **Headline (Baloo 2, 800, clamp(2.125rem, 2.6vw + 1rem, 3.25rem), lh 1.06)**: section H2s, including the CTA headline on the blurple panel.
- **Title (Baloo 2, 700–800, 1.375rem, lh 1.2)**: H3s, wordmark, in-artwork card titles ("Friends"), avatar initials.
- **Lede (Nunito, 400, clamp(1.125rem, 0.5vw + 1rem, 1.3rem), lh 1.55)**: the paragraph under every heading, in Silver Muted. Base body is 18px/1.55.
- **Emphasis body (Nunito, 700, 1.0625rem)**: feature bullet points and the open-source strip line.
- **Small (Nunito, 600–700, 0.875–0.9375rem)**: nav links, footer links, trust-note, footer legal.
- **Label (Baloo 2, 600–700, 0.75rem, tracking 0.04–0.06em)**: badges and chips; footer column heads add uppercase to the same recipe.

**The One Blurple Phrase Rule.** On a charcoal ground, exactly one phrase inside a display headline takes blurple ("fun & games" in the H1); everything else stays near-white. On the blurple CTA panel the headline is entirely white — no accent word.

## Layout

Single-column marketing page on a **1180px container** (`--ftl-container`, side padding 24px, 40px from 768px). The fixed nav is 76px tall; the hero clears it with 148px top padding and centers its copy in a 860px column (subcopy capped at 42rem).

Sections are **generous and rhythmic**: 5.5rem vertical padding (7.5rem from 900px). Feature sections alternate a two-column grid — copy (max 32rem) beside a 28px-rounded art panel — with a 4.5rem gap on desktop and art-first ordering on the middle section. The open-source strip is a slim bordered band, and the big CTA is a 32px-rounded blurple panel with 5rem/6.5rem internal padding, its stickers absolutely placed in percentages and hidden below 768px. The footer runs a 2fr-1fr-1fr grid from 768px.

Breakpoints observed: **768px** (container padding, CTA padding, footer grid, sticker visibility) and **900px** (section rhythm, feature grid, nav collapse — below 900px the nav swaps links for a hamburger and a fixed dropdown menu).

## Elevation & Depth

This system is **flat by doctrine and by audit**: there is no `box-shadow` anywhere in `landing.css`. Depth is conveyed by (1) the tonal ramp — panels step brighter as they stack (#23272a → #2c2f33 → #36393f) and darken past the ground for the footer (#111214); (2) hairline 1px borders in #3d4046 for strip boundaries and the scrolled nav; (3) corner radius doing the "this is a card" work. The only physical gestures are a 2px `translateY` lift on button hover (returning to 0 on press) and a single `inset 0 0 0 2px rgba(255,255,255,0.7)` ring — a border substitute on the on-blurple Download button, not a shadow.

**The Flat Ground Rule.** Surfaces never cast shadows. If a design needs separation, step the surface color up the ramp or add a hairline; if it needs emphasis, use blurple, radius, or motion. Inset rings may impersonate borders; drop shadows and glass may not enter.

## Shapes

Corner radius is the system's form language, in five steps: **12px** controls and inputs (`--ftl-r-btn`), **20px** cards (`--ftl-r-card`), **28px** media/art panels (`--ftl-r-media`), **32px** the hero-scale CTA panel (`--ftl-r-hero`), and **9999px** pills for badges and chips. Focus outlines follow each element's own radius (no forced focus radius). Inner artwork tracks the scale (art panels 28px, drawn cards 18–20px, the hero window at a 26px near-neighbor).

Everything drawn is **rounded and capsule-driven**: mascot limbs, wings, and tufts are rounded rectangles; beaks are soft diamonds; headphone cups are capsules; drawn UI chips and tiles use 10–19px radii. Borders are rare and structural — 1px hairlines between bands, 2–3px strokes only for drawn presence rings and window micro-detail. Stickers are **bare flat fills** — no white outlines anywhere (a stroke that clips or half-shows reads as a rendering glitch, so line-art and filled stickers alike ship without borders).

## Components

### Buttons
- **Shape:** softly rounded rectangles (12px), display-face labels (Baloo 2, 600, 1.0625rem), flat fills, no borders.
- **Primary:** blurple fill, white text; padding 1.125rem 2rem; min-height 48px. Hover: deep indigo fill plus the 2px lift.
- **White (secondary):** white fill, charcoal text. Hover: #e3e5e8 fill plus the lift.
- **Ghost:** transparent on charcoal, cloud-ink text. Hover: 8% white veil.
- **On-blurple (Download inside the CTA):** transparent fill, white text, inset 2px white ring as its border. Shipped inline in `CTA.tsx`, not a token class.
- **Small variant (nav):** padding 0.625rem 1.125rem, min-height 44px.
- **Focus:** 3px yellow outline, 3px offset (every other element gets a white ring). Hovers are pure color swaps — 0.15s ease on background/color/transform.

### Text Links
White, Nunito 700, underlined in blurple; on hover the underline turns yellow (0.15s). All links: 3px underline offset, 2px thickness. Footer links are muted and gain white text plus the yellow underline on hover.

### Badges & Chips
- **Open-source badge (nav):** yellow pill — 10% yellow fill, 35% yellow 1px border, yellow Baloo 2 600 0.75rem text, with an 11px lucide star. Hover deepens the fill.
- **BETA chip:** green pill — 12% green fill, 40% green border, green text, tracking 0.04em, centered on the heading line via a flex chip row (`ftl-h2-chiprow` — `vertical-align: middle` rides low against display caps).
- **Feature point icons:** 30px rounded-square (10px) tiles tinted with 14–18% sticker-color washes holding 16px lucide icons; labels in Nunito 700 1.0625rem.

### Navigation
Fixed 76px charcoal bar: logo mark (blurple 16px-radius tile with a tiny white bird) plus Baloo 2 800 wordmark with "Talk" in blurple; Nunito 700 0.9375rem links; the open-source badge; a small primary button. Transparent bottom border gains a hairline after 12px of scroll. Below 900px it collapses to a hamburger opening a fixed charcoal dropdown.

### Cards / Containers
Structural containers are the elevated strips (20px radius language, hairline borders, no shadows) and the 28px art panels. Drawn cards inside artwork: 20px radius, #36393f fill, #2b2d31 headers, raised rows at #393c41.

### Signature: The Illustrated App Window & the Mascot Cast
The system's identity lives in `illustrations.tsx`. Drawn windows are **flat UI mockups with real microcopy** — `# game-night`, "THE CREW", messages from mia and sam, reaction counts, "lena is typing" with animated dots, `ft.gg/letsplay`, "open seat" — never lorem or gray bars. Windows follow the app's own palette (#36393f window, #1e1f22 server rail, #2b2d31 channel list, #393c41 raised items, red/yellow/green traffic dots). Mascots are birds built on one recipe: single-blob body path, cream (#f2f3f5) belly, charcoal dot eyes with cream highlights (or charcoal arc strokes for closed eyes), yellow diamond beak with a deep-shade underside, 40%-opacity fuchsia blush, deep-shade capsule limbs and tufts, optional charcoal headphones with a green LED, and a flat 10%-black shade shape for volume. Decorative sprinkles — sparks, five-point stars, squiggles, music notes, hearts, bolts, white plus signs — orbit every scene.

### Motion
- **One ambient moment:** only the hero scene loops — gentle 6s/9s float on window, voice card, mascots and stickers; typing dots (1.2s); voice bars (0.9s scaleY); a waving wing (2.6s, -14deg).
- **The Wrapper Rule.** An animation class never shares an SVG element with a `transform` attribute; animated art is wrapped in a class-bearing `<g>` around the transformed child. Voice/typing elements that do animate directly set `transform-box: fill-box` and skip transform attributes.
- **Entrance & settle:** hero copy pops in with a 0.7s `cubic-bezier(0.16, 1, 0.3, 1)` rise at 0.08s stagger steps (`data-pop` 1–5). Sections fade up 28px over 0.65s `cubic-bezier(0.22, 0.61, 0.36, 1)` — but only when `LandingMotion` arms them via IntersectionObserver (`ftl-armed`/`ftl-in`); without JS, content is visible by default.
- **Gate:** every animation rule sits inside `@media (prefers-reduced-motion: no-preference)`; reduced-motion users get a static, fully visible page.

## Do's and Don'ts

### Do:
- **Do** keep all landing styling inside the `.ftl` namespace with `--ftl-*` tokens; load `landing.css` only from the landing page.
- **Do** make every interactive target at least 48px tall (44px for the compact nav variant) and give buttons color-swap hovers plus the 2px lift.
- **Do** mark decorative SVGs `aria-hidden` and give meaningful scenes a `role="img"` + label (the hero scene is labeled; sprinkles are hidden).
- **Do** keep stickers bare — flat solid fills with no outlines, filled or line-art alike (`stroke="#ffffff"` outlines are banned on artwork; partial strokes read as glitches).
- **Do** optically center artwork contents: an initial's baseline sits at circle-center + 0.35 × font-size; icons in pills center on the pill midline with a clear gap before their label.
- **Do** write real product microcopy into drawn UI — real channel names, messages, presence states from the shipped feature set.
- **Do** draw depth with the tonal ramp and hairlines, and reserve blurple for actions and one accent phrase.

### Don't:
- **Don't** apply sticker colors (yellow/fuchsia/green/red) as fills on structural UI — they belong in artwork and chip-scale accents only.
- **Don't** introduce drop shadows, glass/backdrop-filter, gradients, or stock photography; this world is flat by audit and by doctrine.
- **Don't** use red anywhere except inside drawn window chrome, and don't let sticker colors touch buttons, text fills, or section backgrounds.
- **Don't** merge `.ftl` tokens into `globals.css`, restyle the auth/chat pages with them, or "upgrade" the old world — the split is deliberate.
- **Don't** put an animation class on the same SVG element that carries a `transform` attribute, and don't add new looping animation outside the hero scene.
- **Don't** hide content behind scroll reveals without the JS-armed pattern — unrevealed sections must be visible with JavaScript disabled.

---

# Design System: FreedomTalk Client (the app-discord-com world)

> Second world, same repo. This section documents the authenticated client and the auth flows — everything served by `packages/web/app/globals.css`. It sits alongside the landing `.ftl` world documented above; each world's rules end where its stylesheet ends. The machine-readable token layer for this world is the sidecar at `packages/web/.impeccable/design.json` (schemaVersion 2); the YAML frontmatter at the top of this file belongs to the landing world only.

## Overview

**Creative North Star: "The drawn app window, grown up."**

The client is the tri-rail Discord shell the landing page only drew: a flat, friendly-yet-professional dark app where color does real jobs — one blurple for actions, green/amber/red for presence and state, and a charcoal ramp that tells you where you are. Density is app-tight, muscle-memory placement wins over novelty, and the surface stays matte: the shipped CSS contains no gradients, no backdrop-filter glass, and no glow. Everything sits where Discord trained hands to find it; brand survives quietly through the bird mark, the blurple, and the gg sans voice.

**Key Characteristics:**
- A region ramp, not just greys: ground #121214 → rail #1e1f22 → list #2b2d31 → chat #313338 → raised #35373c → hover #40424b; the region tokens (`rail`/`list`/`chat`) name places and are never interchangeable.
- One action color: blurple #5865f2 (hover #4752c4, 16% muted wash, soft link tint #798df9); state trio success #23a559 / warning #f0b232 / error #ed4245.
- Ink in four steps (#efeff1 / #b5bac1 / #949ba4 / #72767d); pure white appears only on blurple fills.
- 8px spacing grid, 8px control radius, 16px modals, pill avatars, 16px squircle server tiles with the white pill indicator.
- One face, gg sans stack (Noto Sans shipped as the disclosed stand-in); hierarchy is size, weight, and case.
- Motion is functional only and dies under `prefers-reduced-motion: reduce`.
- Tri-rail shell: 72px rail / nav list / chat with a toggleable members column; below lg the nav is a full-width slide-over drawer.

**World boundaries.** Styling lives in `packages/web/app/globals.css`: `:root` tokens, the Tailwind v4 `@theme` mapping, `@layer components` primitives, and the functional animations. The landing `.ftl` world and this world share a repository, not a stylesheet — never merge tokens across the two. `app/sfu/page.tsx` is a developer debug surface (WebRTC/SFU logging) left with its own styling deliberately; it is not part of this system and must not be "harmonized."

## Colors

A near-neutral charcoal ramp with a faint blue cast, guarded by a single blurple and three functional state colors.

### Primary — the blurple family
- **Blurple** (#5865f2, `--accent`): the one action color — primary button fills, the active server tile, the send button, text carets, focus outlines, input focus border and ring, and the text-selection wash (45%).
- **Blurple Hover** (#4752c4, `--accent-hover`): the hover depth of every accent fill; never appears at rest.
- **Blurple Muted** (rgba(88, 101, 242, 0.16), `--accent-muted`): the 16% tint wash for the edit-highlight flash and quiet accent fills.
- **Soft Blurple** (#798df9, `--secondary`): inline text links ("Forgot your password?", "Register") and brand accent words ("Talk"). Prose links never use raw accent.

### Neutral — ground ramp and regions

| Token (utility) | Value | Role |
|---|---|---|
| `--background` (bg-background) | #121214 | Page and auth ground; the darkest step, also the dialog environment |
| `--background-elevated` (bg-background-elevated) | #2b2d31 | Modals, cards, dropdown/context menus, drag overlay — a panel above the app |
| `--background-surface` (bg-background-surface) | #35373c | Raised rows: the composer bar, hover fills, server-tile rest fill |
| `--background-hover` (bg-background-hover) | #40424b | Strongest hover step; the active list-row fill |
| `--rail` (bg-rail; also bg-field) | #1e1f22 | The 72px server rail and the bottom user panel; input fields on panels |
| `--list` (bg-list) | #2b2d31 | Channel list, members list, and the 48px header chrome |
| `--chat` (bg-chat) | #313338 | The message work surface |
| `--border` | #252527 | 1px hairlines between regions |
| `--border-hover` | #3f4147 | Hover hairline; the resting border of auth inputs |
| `--foreground` | #efeff1 | Primary ink |
| `--foreground-muted` | #b5bac1 | Secondary ink: labels, sub-copy, quiet controls |
| `--foreground-subtle` | #949ba4 | Tertiary ink: small labels, icons at rest |
| `--placeholder` | #72767d | Input placeholder text |

### State
- **Success** #23a559: online presence dots, the speaking ring around avatars, and the add-server tile (green plus that fills green on hover).
- **Warning** #f0b232: idle presence and the server-owner crown.
- **Error** #ed4245: destructive intent — menu items in error text over a 10% error fill, the active mute/deafen state (20% error fill), and the danger button variant.

**The Region Rule.** `rail`, `list`, and `chat` name places in the shell, not shades in a ramp. A new surface picks its region token by where it lives (rail-edge, list, chat) and steps to `background-surface`/`background-hover` for raised or active states — it never substitutes a raw grey.

**The Soft-Link Rule.** Inline prose links are soft blurple #798df9 with underline-on-hover; raw #5865f2 is reserved for things you click as an action (buttons, tiles, send).

**The White-Only-On-Blurple Rule.** #ffffff appears only as text or icons on accent fills. UI ink tops out at #efeff1; "brighter text" is not a way to add emphasis.

## Typography

**Font:** the gg sans stack — `'gg sans', var(--font-gg), 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif` — set as both `--font-sans` and `--font-display` in `@theme`. **Mono:** JetBrains Mono via next/font (`--font-jetbrains-mono`) for the MFA code field and code content.

**The gg sans Disclosure.** 'gg sans' is Discord's proprietary face and cannot be shipped. The stack deliberately prefers a locally installed copy when present and ships Noto Sans via next/font as `--font-gg` — a free, metrically-similar stand-in. This substitution is intentional and disclosed; do not swap in another display face to "fix" it.

**Character:** one friendly workhorse face at many sizes; hierarchy comes from size, weight (400–700), and case — the client ships no display face.

### Hierarchy
- **H1 (24px / 700, -0.01em):** auth page titles ("Welcome back!"). Globals sets every h1–h6 to 700 with -0.01em tracking.
- **Dialog title (18px / 600):** modal and panel headers.
- **Body (16px / 400):** inputs, message bodies, prose.
- **UI (15px / 600 buttons; 14px rows):** `.btn` labels run 15px/600; list rows, member names, and menu items run 14px.
- **Label (12px / 600–700, uppercase):** section and category headers ("DIRECT MESSAGES", role groups, channel categories) with wide tracking; auth field labels are 14px/600 with 0.5px tracking, muted ink.
- **Micro (10px):** message timestamps, revealed on row hover.

**The One-Face Rule.** Never introduce a second typeface into the client. Emphasis is weight, case, and the 12px-uppercase section-header signature — not a new font.

## Layout

An **8px grid** end to end: 8px control gaps, 16px panel padding, 12/16px rows. Dense rows may use the 2px/4px micro-steps (message rows sit at 2px vertical padding inside 16px gutters). The client is full-bleed (`h-dvh`), not container-based; the auth world is the exception — a single centered **480px column** on the page ground (the surface brief sketched 448px; the shipped column is 480px — build wins).

### The tri-rail surface map
- **Header:** 48px, bg-list, bottom hairline, centered section title; hamburger at the left below lg, contextual actions right.
- **Server rail:** 72px wide, bg-rail, 48px tiles on an 8px gap, home tile up top, 32×2px rounded divider, user panel pinned at the bottom.
- **Nav column:** 30% width (min 240px, max 320px), bg-list, right hairline; server dropdown header, uppercase category rows with add buttons, channel/DM rows.
- **Chat (main):** flex-1, bg-chat; on lg it holds 50% or 75% of the row depending on the members toggle (300ms ease).
- **Members column:** 25% (min 180px, max 280px), bg-list, left hairline; collapsible to a 48px icon rail.
- **User panel:** bg-rail, top hairline, avatar + presence line left, mic/deafen/settings right.

### Responsive story
Below **lg (1024px)** the nav column becomes a full-width fixed slide-over drawer (z-50, 200ms translate) over a **portaled** black/50 scrim (z-40) with its own in-drawer X control; the header hamburger drives it via the ui-store. The scrim is portaled to `document.body` because the drawer's transform would otherwise become the containing block and trap a nested fixed scrim. The members column and its collapse toggle are **lg-only** — on smaller screens chat and the drawer are the whole interface (chat-first: content never waits on a rail). Breakpoints are Tailwind defaults: md 768px, lg 1024px.

## Elevation & Depth

Depth is tonal: panels step up the region ramp and hairlines (#252527) separate places. A small shadow vocabulary exists exclusively for layers that genuinely float:

- **shadow-md** — dropdowns, context menus, tooltips, and the message hover toolbar.
- **shadow-lg** — the dnd-kit drag overlay ghost.
- **shadow-xl** — the mobile nav drawer.
- **Focus ring** `0 0 0 3px rgba(88,101,242,0.25)` — the input-focus glow; a state signal, not depth.
- **New-message pulse** — an animating 0→8px blurple ring; an attention cue.

**The Resting-Structure Rule.** Resting panels never cast shadows. Separation is a ramp step or a 1px hairline; a shadow appears only when a layer floats above the app (menus, tooltips, drag ghosts, the drawer).

## Shapes

Corner radius in five steps: **8px** standard (`rounded-lg`) on buttons, inputs, cards, menus, tooltips, and the composer; **6px** (`rounded-md`) menu items and the white pill's cap; **4px** (`rounded`) reaction chips, small badges, and the edit-highlight; **16px** modals (`rounded-2xl`) and the server-tile squircle (`rounded-[16px]`); **pills** (`rounded-full`) for avatars, status dots, server tiles at rest, and the rail divider. Borders are structural 1px hairlines (#252527, hover #3f4147) plus the input border (#3f4147). Icons are lucide at 16–24px, 2px stroke, always `currentColor`.

**The Squircle Morph.** Server tiles rest as circles; hover and active morph them to a 16px squircle over 200ms. A white pill rides the rail's left edge and signals state only: 4×40px for the active server, 4×8px for a notification, nothing at rest.

## Components

### The Cascade Rule (load-bearing)
The primitives `.btn`, `.btn-primary/-secondary/-ghost`, `.input`, and `.card` live in `@layer components` precisely so Tailwind utilities override them: the password field's `pr-12` show/hide button, `pl-10` prefix-icon inputs, `w-full`, and `font-bold` all win without `!important`. Future edits must keep these primitives in `@layer components` — moving them to unlayered CSS would silently break every utility-composed field and button in the codebase.

### Buttons
- **Base (`.btn`):** inline-flex, min-height 44px, padding 12px×16px, 15px/600 gg sans, 8px radius, 150ms background/color/border transitions.
- **Primary:** blurple fill, white text, #4752c4 hover; full-width with `font-bold` on auth submits; loading swaps the label for a white spinner ring.
- **Secondary (outline):** transparent with a 1px #3f4147 border; hover adds the 4% white veil and lifts the border to #949ba4. This is the OAuth pair (Google/GitHub) and the drawer-adjacent outline action.
- **Ghost:** transparent, muted ink; hover brings full ink over the 4% white veil.
- **ui/Button extras:** `danger` (error fill, 80% hover) and `link` (accent text, underline on hover) variants; sizes sm 32px / md 40px / lg 48px / icon 40px.
- **Focus:** 2px accent outline at 2px offset via the global `:focus-visible` rule; disabled state is 50% opacity, not-allowed.

### Inputs
- **Auth (`.input`):** transparent field, 1px #3f4147 border, 8px radius, 16px text, #72767d placeholder; hover border #949ba4; focus border accent with the 3px 25% ring. Every field is labeled above in 14px/600 muted ink with 0.5px tracking.
- **Panel (`ui/Input`):** same geometry with a bg-field fill and a 2px accent/50 focus ring; `error` state turns border and ring to error red with the message below in 14px red.
- **Composition:** prefix/suffix icons are absolutely placed and rely on the Cascade Rule (`pr-12` + right-3 button) — never rebuild this with wrapper divs.

### Cards & Modals
- **`.card`:** bg-background-elevated, 1px #252527 border, 8px radius, 16px padding.
- **Modal:** portaled and focus-trapped; black/70 overlay; 16px-radius bg-background-elevated panel with a hairline border; sizes sm–xl (max-w-sm…xl); Esc closes, overlay click closes by default; header row with 18px/600 title and a ghost X.

### Menus, tooltips, confirmations
- **Dropdown / ContextMenu:** min-width 180px, 8px radius, bg-background-elevated, hairline border, shadow-md; items are 14px, 6px-radius, 12px×8px padding, hover bg-background-hover; **danger items are error text over a 10% error fill** — the one destructive recipe.
- **Tooltip:** bg-field, hairline border, 8px radius, shadow-md, 12px/500 ink; used on rail tiles (right side).
- **Confirm dialog:** info/warning/danger variants map the icon tint and pick primary vs. danger confirm; prompts add a bg-field input.

### The tri-rail in detail (signature)
- **Server tiles:** 48px, circles at rest on bg-surface with muted icons or acronym fills; hover morphs to the squircle and brightens; active is the blurple squircle plus the white pill; the add tile carries a success-green plus that fills green on hover.
- **Channel/DM rows:** 14px, muted ink at rest; hover is the 4% white veil; active is bg-background-hover with full ink; voice rows show a presence dot and a success ring when speaking; dnd grips and the DragOverlay ghost (elevated, hairline, shadow-lg) appear for members who can reorder.
- **Messages:** rows are 16px-gutted with 2px vertical breathing; hover lifts a black/10 veil, reveals the 10px timestamp and the floating hover toolbar (elevated panel, hairline, shadow-md); reactions are 4px-radius chips with hairline borders; the edit-highlight flashes accent-muted over 2s.
- **Composer:** a raised rounded-lg bg-background-surface bar — plus (attach) left, transparent textarea center, emoji and blurple send right; reply previews and file chips are bg-field pills above it.
- **Members:** uppercase 12px role headers in the role's color with online counts; member rows are 14px muted with pill avatars (status dot bordered in the list ground), offline at 50% opacity, owner crowned in warning.
- **User panel:** name + custom status; mute/deafen toggle to error text over a 20% error fill when active; settings opens the user-settings modal.
- **Empty states speak product:** "Select a server to view channels", "Loading members…" — plain, subtle, never lorem.

### Motion
Functional only — every animation maps to a message, voice, or presence event, and all of them are killed by the `prefers-reduced-motion: reduce` block: fade-in 250ms; message-appear 200ms; message-delete 300ms collapse; edit-highlight 2s; reaction-pop 300ms; new-message-pulse 2s loop; user-join/leave 300ms slides; voice-wave 500ms staggered loop; badge-bounce 300ms; typing-dot 1.4s bounce loop. Interaction transitions run 100–200ms ease. **Loops carry live state only (voice, typing, unread) — there is no ambient decoration.**

## Do's and Don'ts

### Do:
- **Do** keep `.btn`/`.input`/`.card` in `@layer components` so utilities keep overriding them — prefix-icon inputs (`pr-12`) depend on it.
- **Do** use the hover ladder: the 4% white veil (`bg-white/[0.04]`) on list grounds, the next ramp step (`hover:bg-background-surface` / `-hover`) on rail and panel surfaces, and 10% black (`hover:bg-black/10`) on the chat ground.
- **Do** gate every new animation behind `prefers-reduced-motion: reduce` and add its class to the kill list.
- **Do** keep interactive targets ≥44px (`.btn` min-height) with 2px accent focus-visible outlines at 2px offset.
- **Do** keep inline links soft blurple #798df9 and write empty states in product voice.
- **Do** portal the drawer scrim to `document.body` and keep drawer, scrim, and close control as three layers (drawer z-50, scrim z-40).

### Don't:
- **Don't** merge the landing `.ftl` tokens into `globals.css` or leak client tokens into `landing.css` — two worlds, two stylesheets; and don't restyle `app/sfu/page.tsx` (deliberate debug exclusion).
- **Don't** introduce gradients, backdrop-filter glass, or glow — the world is matte by audit.
- **Don't** put shadows on resting structure; they are for floating layers only.
- **Don't** use raw #5865f2 for inline text links, and don't use pure white as UI ink.
- **Don't** add ambient looping animation; loops carry live state only.
- **Don't** rest server tiles as squircles — at-rest is a circle; the morph belongs to hover and active.

### Provenance
Finish review: **DISPOSITION ship**, 9/9 captures passing (`packages/web/.impeccable/review/`: landing, auth login desktop/mobile/QR-open, auth register, app channel desktop/mobile/drawer, app friends). Two material fixes were resolved in review: the portaled drawer scrim and the product-voice empty state. One open nonblocking note: dnd drag-grips are visible at rest on touch — owned by the parallel dnd-kit rework, not by this system. Scope caveat: modals and shared primitives were declared in scope but unjudged by stills; their specs above come from shipped code, not review.
