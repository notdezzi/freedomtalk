---
version: 1
slug: "packages-web-components-layout-app-shell-tsx"
primary_target: "packages/web/components/layout/app-shell.tsx"
related_targets: ["packages/web/app/app/layout.tsx","packages/web/app/app/page.tsx","packages/web/components/layout/navigation-column.tsx","packages/web/components/layout/header.tsx","packages/web/components/layout/members-column.tsx","packages/web/components/layout/user-panel.tsx","packages/web/components/messaging/message-view.tsx","packages/web/components/messaging/message-item.tsx","packages/web/components/messaging/message-input.tsx"]
---

# Surface brief — App interface (shell, chats, servers)

Scope: the authenticated client — app shell, navigation, chat, servers, members, voice panels, modals; visitor mode Operate (members live in the product).
Audience: signed-in members running servers and chats; job: navigate servers/channels/DMs, read and send messages, join voice; constraints: pinned design system https://gitreverse.com/designs/app-discord-com extended with the classic tri-rail the landing's drawn windows already promise.

## Direction contract

THESIS: The client is the drawn app window from the landing page grown up — the tri-rail Discord shell where color does real jobs (presence, voice, one blurple action) and everything sits where muscle memory expects it; it refuses the old amber-glow world and its dangling tokens.

OWN-WORLD: Tri-rail ramp — server rail #1e1f22, channel/members lists #2b2d31, chat ground #313338, raised rows #35373c; hairlines #252527; ink #EFEFF1, muted #B5BAC1, subtle #949BA4; blurple #5865F2 actions (hover #4752C4, link #798DF9); presence green #23A559, idle #F0B232, alert red #ED4245; gg sans stack; 8px radius on rows and controls, 16px modals, pill avatars; flat — color-swap hovers only, no gradients or glow.

STORY: A member lands in the shell, finds every server, channel, and DM where Discord trained them, reads chat on the mid rail, and sends messages from a raised input bar; brand survives via the bird mark and blurple.

FIRST VIEWPORT: 72px rail of squircle server tiles on #1e1f22; 240px channel list on #2b2d31 (server dropdown header, uppercase categories, user panel pinned at bottom); chat column on #313338 with a #channel header, message list, and raised rounded input; members column on #2b2d31.

FORM: The pinned Discord app design; code-led build. Signature interaction: the server tile squircle-to-roundel morph with the white active pill — plus Discord's hide-until-hover scrollbars.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
