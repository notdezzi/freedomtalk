---
version: 1
slug: "packages-web-app-page-tsx"
primary_target: "packages/web/app/page.tsx"
related_targets: []
---

# Surface brief — FreedomTalk landing page

Target: `packages/web/app/page.tsx` (composed from `packages/web/components/landing/*`)

## Scope & visitor mode

Single marketing homepage (Persuade), full replacement of the incumbent "infrastructure" world. Desktop + mobile web. Scoped styling: new Discord-world tokens live in a landing-scoped stylesheet; shared `app/globals.css` tokens keep serving the auth/app pages unchanged.

## Audience, job, action, proof

Gamers and online-community folks picking a home for their crew. Job: know in seconds that this is the fun group-chat place, then act. Primary action: "Open in browser" → `/app`; secondary: "Download" → GitHub releases. Proof: authored product-style scenes (chat, voice, servers, friends) — the real feature set from README; no invented metrics, quotes, or user counts.

## Direction contract

THESIS: The page is the group chat itself, grown to page scale — the app's rounded charcoal world spills out with its people (mascot characters) living inside it; it refuses both the incumbent's serious infrastructure look and the category-default centered headline over a row of three equal cards.

OWN-WORLD: Charcoal ramp as ground (#23272A base, #2C2F33 elevated, #111214 deep); blurple #5865F2 owns every action and the big CTA moment (deep indigo #31368E hover), white secondary controls with charcoal text; a full sticker palette (yellow #FEE75C, fuchsia #EB459E, green #57F287, red #ED4245) lives only inside artwork; chunky rounded display face (Baloo 2, 700–800) over clean rounded body (Nunito); radii 12px controls / 20px cards / 24–32px media panels; flat-first — no glass, no shadow-depth, no stock photos.

STORY: Visitor understands in five seconds: this is where my friends and I talk, play, chill, and build a community; believes opening it takes one click right in the browser; and clicks Open (or Download). Light traces (nav badge, slim strip, footer) tell them it is open source and self-hostable.

FIRST VIEWPORT: Slim fixed charcoal nav (mascot logo mark + wordmark, three links, blurple Open button, small "open source" badge). Below, centered hero: pill badge, massive three-line chunky headline "Group chat that's all fun and games." (one word blurple), one-sentence subcopy covering talk/play/chill/build, two big buttons (blurple primary, white secondary). Beneath and overlapping: oversized illustrated scene — a tilted flat app window (server rail, messages with reactions, voice card) flanked by two mascot characters breaking its edges, orbited by floating stars, stickers, squiggles in accent colors; gentle staggered float animation, reduced-motion safe.

FORM: Brief-pinned direction — the Discord design system at https://gitreverse.com/designs/discord-com, pinned by the user together with the visual brief; no concept-seed roll was run (pinned directions beat the roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Memorable moment

The hero scene: mascots leaning out of the oversized chat window, waving, with animated typing dots and a live voice tile — the product feeling like a place, not a screenshot.

## Unresolved decisions

None blocking. Download href set to GitHub releases (user-confirmed); open-source story kept as light traces (user-confirmed).
