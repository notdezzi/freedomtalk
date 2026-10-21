---
version: 1
slug: "packages-web-app-auth-login-page-tsx"
primary_target: "packages/web/app/auth/login/page.tsx"
related_targets: ["packages/web/app/auth/layout.tsx","packages/web/app/auth/register/page.tsx","packages/web/app/auth/forgot-password/page.tsx","packages/web/app/auth/reset-password/page.tsx","packages/web/app/auth/verify-email/page.tsx","packages/web/app/auth/verify-pending/page.tsx","packages/web/app/auth/2fa/setup/page.tsx","packages/web/app/auth/2fa/verify/page.tsx","packages/web/app/auth/2fa/recovery/page.tsx","packages/web/app/auth/2fa/backup-codes/page.tsx","packages/web/app/auth/oauth/callback/page.tsx"]
---

# Surface brief — Auth (login flagship)

Scope: sign-in surface and its sibling auth routes; visitor mode Operate (a returning member completes a task).
Audience: gamers and community people signing back in; job: authenticate fast, including MFA; action: Log In; proof: the product's own brand voice; constraints: pinned design system https://gitreverse.com/designs/app-discord-com, gg sans stack, 8px grid, 8px radii, dark #121214 ground.

## Direction contract

THESIS: The sign-in is the product's calm front door — one centered column on flat charcoal where blurple marks exactly one action; it refuses the old two-panel marketing split with floating orbs and gradient text.

OWN-WORLD: Ground #121214; ink #EFEFF1; muted #B5BAC1; placeholder #72767D; hairlines #252527; action blurple #5865F2 (hover #4752C4, link #798DF9); gg sans ('gg sans', Noto Sans fallback) throughout; 8px radius on controls and panels, pills for avatars; 8px spacing grid; flat — no gradients, no glass, no glow.

STORY: A returning member recognizes the brand from the landing (bird mark, blurple) and signs in without thinking; MFA appears only when the account demands it, styled with the same calm.

FIRST VIEWPORT: Centered 448px column, vertically centered on the ground. Top: blurple bird-mark tile + FreedomTalk wordmark ("Talk" in blurple). H1 "Welcome back!" 24px/700, sub-line in muted 16px. Labeled "Email or Phone Number" input, "Password" input with show/hide. Full-width blurple "Log In" (hover #4752C4). Centered "Forgot your password?" link. Hairline divider with "or". Two outline OAuth buttons (Google, GitHub). "Need an account? Register" centered. Collapsible "Log in with QR Code" section with real scannable QR on a white tile.

FORM: The pinned Discord app design; code-led build (no image generation in this harness). Signature interaction: the QR section expanding in place without shifting the card column's center.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
