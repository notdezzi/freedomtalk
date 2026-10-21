# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing monorepo (npm workspaces). Landing page lives in `packages/web` — Next.js 16 (App Router), React 19, Tailwind CSS, lucide-react icons. Real app routes exist at `/app`, `/auth/login`, `/auth/register`. Desktop (Electron) is experimental.

## Users

Gamers and online-community people (per user brief): friends who want one place to talk, play, chill, and hang out — voice, chat, memes, game nights. Secondary (user-confirmed "light traces"): self-hosters and open-source users who run FreedomTalk on their own infrastructure.

## Product Purpose

FreedomTalk is an open-source, self-hosted, Discord-style real-time communication platform (servers, channels, roles, DMs, friends, realtime messaging, reactions, search, experimental WebRTC voice). The landing page's success: a first-time visitor understands within seconds that this is the fun group-chat place for their crew, and clicks "Open in browser" (→ `/app`) or "Download" (→ GitHub releases).

## Positioning

The playful group chat you can actually own: Discord-style fun backed by open source and self-hosting. Neighboring products (Discord et al.) cannot truthfully claim "your data, your rules."

## Operating Context

Marketing homepage at `packages/web/app/page.tsx`, composed from `packages/web/components/landing/*`. Links target real routes: `/app` (open in browser), `/auth/login`, `/auth/register`, GitHub releases (`github.com/notdezzi/freedomtalk/releases`).

## Capabilities and Constraints

Real, shipped features (README/docs): accounts & auth (MFA, sessions), servers with channels/roles/permissions, server discovery + invites, realtime messaging with reactions/embeds/attachments, DMs & friends with presence, search, WebRTC voice (experimental), webhooks/audit logs. Desktop and mobile apps are experimental — do not overclaim. Undecided: no marketing metrics/testimonials exist; none may be invented (no user counts, no quotes, no benchmarks).

## Brand Commitments

- Name: **FreedomTalk**.
- Voice: casual, conversational, internet-native ("talk / play / chat / hang out" energy).
- Visual direction (user-pinned): the Discord design system at `https://gitreverse.com/designs/discord-com` — dark charcoal `#23272A` base, blurple `#5865F2` primary CTAs (deep indigo `#31368E` hover), white secondary button, 12px control radius / 20px surface radius, chunky expressive display type + clean rounded body type, oversized playful illustration, flat-first (no glass, no glossy gradients, no stock photos), playful stars/stickers/character art.
- Placement (user-confirmed): fun-first page; open-source/self-host appears as a small nav badge, a slim strip near the bottom, and a footer mention — never as the lead story.

## Evidence on Hand

README.md, docs/product/features.md, CASE-STUDY.md (feature truth). No marketing assets, mascots, logos (SVG file), testimonials, or usage metrics exist — illustrations are authored for the page; factual claims beyond the README are forbidden.

## Product Principles

1. Fun first: the page should feel like the product — playful, social, lively.
2. Show, don't claim: demonstrate the chat/voice/community experience with authored product-style scenes, not adjectives.
3. Honest edges: voice is experimental, desktop/mobile are experimental; open-source is real but never the lead.
4. One action is unmistakable: open FreedomTalk in the browser.

## Accessibility & Inclusion

Strong contrast on dark charcoal (WCAG AA), 44px+ touch targets, focus-visible rings, decorative art `aria-hidden`, reduced-motion support for floating/parallax effects.
