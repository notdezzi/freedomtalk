/**
 * Seed demo data through the running API for screenshot capture.
 * Usage: node scripts/seed-demo.mjs
 */
const API = 'http://localhost:3101/api/v1';

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, data };
}
const unwrap = (r) => r.data?.data ?? r.data;

async function register(email, username, password) {
  const r = await api('POST', '/auth/register', { body: { email, username, password } });
  if (r.status === 201 || r.status === 200) return unwrap(r);
  console.log(`register ${username} -> ${r.status}:`, JSON.stringify(r.data).slice(0, 200));
  return null;
}
async function login(email, password) {
  const r = await api('POST', '/auth/login', { body: { email, password } });
  if (r.status !== 200) throw new Error(`login ${email} failed: ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  const d = unwrap(r);
  return { token: d.accessToken, user: d.user };
}

const demo = await login('demo@freedomtalk.dev', 'DemoPass123!').catch(() => null);
if (!demo) {
  const u = await register('demo@freedomtalk.dev', 'demo', 'DemoPass123!');
  console.log('registered demo:', u?.id);
}
const D = demo ?? (await login('demo@freedomtalk.dev', 'DemoPass123!'));
console.log('demo user:', D.user.id, D.user.username);

const A = await login('alice@freedomtalk.dev', 'AlicePass123!').catch(async () => {
  await register('alice@freedomtalk.dev', 'alice_demo', 'AlicePass123!');
  return login('alice@freedomtalk.dev', 'AlicePass123!');
});
console.log('alice user:', A.user.id, A.user.username);

// Friends: alice requests, demo accepts
const pend = await api('GET', '/friends/pending', { token: D.token });
const alreadyPending = (unwrap(pend)?.incoming ?? []).some((p) => p.requesterId === A.user.id || p.user?.id === A.user.id);
if (!alreadyPending) {
  const r = await api('POST', '/friends/request', { token: A.token, body: { targetUserId: D.user.id } });
  console.log('friend request ->', r.status);
}
const fr = await api('POST', '/friends/accept', { token: D.token, body: { requesterId: A.user.id } });
console.log('friend accept ->', fr.status);

// DM channel demo <-> alice (idempotent)
const myDms = unwrap(await api('GET', '/users/@me/channels', { token: D.token }));
const dmList = Array.isArray(myDms) ? myDms : (myDms?.channels ?? []);
let dmChannelId = dmList.find((c) => (c.recipients ?? []).some((r) => r.id === A.user.id))?.id;
let dm;
if (dmChannelId) {
  console.log('reusing dm channel', dmChannelId);
} else {
  const dmRes = await api('POST', '/users/@me/channels', { token: D.token, body: { recipient_id: A.user.id } });
  dm = unwrap(dmRes);
  dmChannelId = dm?.id;
  console.log('dm channel ->', dmRes.status, dmChannelId);
}

// Server + channels (idempotent: reuse existing server by name)
let serverId, channels = [];
const myServers = unwrap(await api('GET', '/servers/', { token: D.token }));
const serverList = Array.isArray(myServers) ? myServers : (myServers?.servers ?? []);
const existingSrv = serverList.find((s) => s.name === 'FreedomTalk Community');
if (existingSrv) {
  serverId = existingSrv.id;
  console.log('reusing server', serverId);
} else {
  const srvRes = await api('POST', '/servers/', {
    token: D.token,
    body: { name: 'FreedomTalk Community', description: 'The official FreedomTalk hangout — announcements, intros and general chat.' },
  });
  const srv = unwrap(srvRes);
  serverId = srv?.id ?? srv?.server?.id;
  console.log('server ->', srvRes.status, serverId);
}
const chRes = await api('GET', `/servers/${serverId}/channels`, { token: D.token });
let ch = unwrap(chRes);
if (!Array.isArray(ch)) ch = ch?.channels ?? ch?.text ?? [];
channels = ch;
console.log('existing channels:', channels.map((c) => `${c.name}(${c.type})`).join(', ') || 'none');

async function ensureChannel(name, type, topic) {
  const found = channels.find((c) => c.name === name);
  if (found) return found;
  const r = await api('POST', `/servers/${serverId}/channels`, { token: D.token, body: { name, type, topic } });
  console.log(`channel ${name} ->`, r.status);
  return unwrap(r);
}
const general = await ensureChannel('general', 'text', 'General chat for everyone');
const intros = await ensureChannel('introductions', 'text', 'Say hi and tell us about yourself');
const design = await ensureChannel('design-lab', 'text', 'UI/UX critique and inspiration');
const voiceLounge = await ensureChannel('Voice Lounge', 'voice');
await ensureChannel('announcements', 'announcement', 'Release notes and downtime notices');

// Messages
async function say(token, channelId, content) {
  const r = await api('POST', '/messages/', { token, body: { content, channelId } });
  if (r.status >= 300) console.log(`msg in ${channelId} -> ${r.status}:`, JSON.stringify(r.data).slice(0, 200));
  return r.status;
}
async function sayDm(token, dmChannelId, content) {
  const r = await api('POST', '/messages/', { token, body: { content, dmChannelId } });
  if (r.status >= 300) console.log(`dm msg -> ${r.status}:`, JSON.stringify(r.data).slice(0, 200));
  return r.status;
}
const generalMsgs = [
  '**Welcome to FreedomTalk!** 🎉 Own your conversations.',
  'Self-hosted, open source, and blazing fast — messages arrive over Socket.io in real time.',
  'Voice rooms are powered by a mediasoup SFU. Hop into the Voice Lounge and try it.',
  'Tip: use `markdown` — *italics*, **bold**, `code`, and > quotes all work.',
  "Anyone tried the new search yet? It's Meilisearch-backed and returns in milliseconds. 🔍",
];
for (const m of generalMsgs) await say(D.token, general.id, m);
await say(A.token, general.id, 'Hey all! Just joined from the invite link — this onboarding flow is smooth. 👋');
await say(D.token, general.id, 'Glad you made it, @alice_demo! Check out `#introductions` and say hello.');

const introMsgs = [
  "I'm Demo — I run this instance. Coffee, keyboards and distributed systems. ☕",
  'What self-hosted stack is everyone else running? Docker Compose here.',
];
for (const m of introMsgs) await say(D.token, intros.id, m);
await say(A.token, design.id, 'Dropping a link for inspiration: the new shadcn sidebar patterns are 🔥');
const dmMsgs = [
  'Hey Alice! Thanks for accepting the friend request 🙌',
  'No problem! This DM thread feels snappier than the old stack we used.',
  'Right? Socket.io + Redis pub/sub. Zero perceived latency.',
];
for (const m of dmMsgs) await sayDm(D.token, dmChannelId, m);
await sayDm(A.token, dmChannelId, 'Are you joining the standup in the Voice Lounge at 3?');

// Invite
const inv = await api('POST', `/servers/${serverId}/invites`, { token: D.token, body: { channelId: general.id } });
const inviteCode = unwrap(inv)?.code;
console.log('invite ->', inv.status, inviteCode);

// Onboarding complete for both
for (const u of [D, A]) {
  const r = await api('POST', '/auth/onboarding/complete', { token: u.token });
  console.log(`onboarding complete ${u.user.username} ->`, r.status);
}

const result = {
  apiUrl: API,
  webUrl: 'http://localhost:3100',
  demo: { email: 'demo@freedomtalk.dev', password: 'DemoPass123!', token: D.token, userId: D.user.id, username: D.user.username },
  alice: { username: A.user.username, userId: A.user.id, token: A.token },
  serverId,
  channelId: general.id,
  otherChannels: { intros: intros.id, design: design.id, voice: voiceLounge?.id },
  dmChannelId,
  inviteCode,
};
const { writeFileSync } = await import('node:fs');
writeFileSync(new URL('./seed-result.json', import.meta.url), JSON.stringify(result, null, 2));
console.log('\nSeed summary written to scripts/seed-result.json');
console.log(JSON.stringify({ ...result, demo: { ...result.demo, token: '***' }, alice: { ...result.alice, token: '***' } }, null, 2));
