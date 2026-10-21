/**
 * Multi-node WebSocket integration test.
 *
 * Proves the horizontal-scaling story end to end: node A runs in this
 * process, node B is a REAL second process (src/scripts/ws-node.ts) with
 * its own Socket.io server, Redis adapter and cross-node bus — sharing
 * only Redis and Postgres with node A. A client connected to node B must
 * receive presence and typing events raised on node A, which is only
 * possible through the Redis adapter / cross-node pub/sub path.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server as HTTPServer } from 'http';
import { spawn, ChildProcess } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { wsServer } from '../../websocket.server';
import { registerHandlers } from '../../handlers';
import { startCrossNodeBus, stopCrossNodeBus } from '../../cross-node.bus';
import { WS_EVENTS, DEFAULT_PERMISSIONS } from '@freedomtalk/shared';
import { jwtService } from '../../../auth/jwt.service';
import { db } from '../../../../config/database';

const user1 = { id: 'mn-user-1', username: 'mnuser1' };
const user2 = { id: 'mn-user-2', username: 'mnuser2' };

function waitFor<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out waiting for ${label}`)), ms)
    ),
  ]);
}

function connectClient(port: number, token: string): { socket: ClientSocket; connected: Promise<void> } {
  const socket = ioClient(`http://localhost:${port}`, {
    transports: ['websocket'],
    auth: { token },
    extraHeaders: { 'user-agent': 'multi-node-test' },
  });
  const connected = new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve());
    socket.on('connect_error', (err) => reject(err));
  });
  return { socket, connected };
}

describe('Multi-node WebSocket (two real nodes, shared Redis)', () => {
  let httpServer: HTTPServer;
  let nodeAPort: number;
  let nodeBPort: number;
  let child: ChildProcess;
  let token1: string;
  let token2: string;
  let clientA: ClientSocket;
  let clientB: ClientSocket;

  beforeAll(async () => {
    token1 = jwtService.generateAccessToken(user1.id, { username: user1.username });
    token2 = jwtService.generateAccessToken(user2.id, { username: user2.username });

    // --- fixtures (node B reads the same DB during WS auth) ---
    await db('user_connections').whereIn('user_id', [user1.id, user2.id]).del();
    await db('server_members').where('server_id', 'mn-server-1').del();
    await db('channels').where('id', 'mn-channel-1').del();
    await db('servers').where('id', 'mn-server-1').del();
    await db('users').whereIn('id', [user1.id, user2.id]).del();

    await db('users').insert(
      [user1, user2].map((u) => ({
        id: u.id,
        username: u.username,
        email: `${u.username}@multi-node.test`,
        password_hash: 'test-hash',
        email_verified: true,
        mfa_enabled: false,
        account_status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }))
    );

    await db('servers').insert({
      id: 'mn-server-1',
      name: 'Multi-node Test Server',
      owner_id: user1.id,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // @everyone role with default permissions — without it a plain member
    // (user 2) resolves zero permission bits and fails the channel VIEW check
    const bigintToHex = (value: bigint) => '0x' + value.toString(16);
    await db('roles').insert({
      id: 'mn-role-everyone',
      server_id: 'mn-server-1',
      name: '@everyone',
      color: 0,
      hoist: false,
      icon: null,
      position: 0,
      allow_permissions: bigintToHex(DEFAULT_PERMISSIONS.allow),
      deny_permissions: bigintToHex(DEFAULT_PERMISSIONS.deny),
      managed: false,
      mentionable: false,
    });
    await db('servers').where('id', 'mn-server-1').update({
      default_role_id: 'mn-role-everyone',
    });

    await db('channels').insert({
      id: 'mn-channel-1',
      server_id: 'mn-server-1',
      name: 'multi-node',
      type: 'text',
      position: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('server_members').insert(
      [user1, user2].map((u) => ({
        id: `8999990000000${u.id.slice(-2)}`.slice(0, 18),
        server_id: 'mn-server-1',
        user_id: u.id,
        nickname: null,
        avatar_url: null,
        mute: false,
        deaf: false,
        pending: false,
        joined_at: new Date(),
      }))
    );

    // Both directions so each learns about the other's presence
    await db('user_connections').insert([
      {
        id: '8999990000000000001',
        user_id: user1.id,
        connected_user_id: user2.id,
        connection_type: 'friend',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: '8999990000000000002',
        user_id: user2.id,
        connected_user_id: user1.id,
        connection_type: 'friend',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // --- node A: in this process ---
    httpServer = createServer();
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const address = httpServer.address();
        nodeAPort = typeof address === 'object' && address ? address.port : 0;
        resolve();
      });
    });
    await wsServer.initialize(httpServer);
    registerHandlers(wsServer.getIO());
    await startCrossNodeBus();

    // --- node B: a real second process sharing only Redis/Postgres ---
    const require = createRequire(import.meta.url);
    const tsxCli = require.resolve('tsx/cli');
    const scriptPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../../scripts/ws-node.ts'
    );

    child = spawn(process.execPath, [tsxCli, scriptPath], {
      env: { ...process.env, WS_NODE_PORT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    nodeBPort = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`node B failed to start: ${stderrTail}`)),
        60_000
      );
      let stderrTail = '';
      child.stdout!.on('data', (chunk: Buffer) => {
        const match = /WS_NODE_LISTENING (\d+)/.exec(chunk.toString());
        if (match) {
          clearTimeout(timer);
          resolve(Number(match[1]));
        }
      });
      child.stderr!.on('data', (chunk: Buffer) => {
        stderrTail = (stderrTail + chunk.toString()).slice(-2000);
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`node B exited early (code ${code}): ${stderrTail}`));
      });
    });
  }, 90_000);

  afterAll(async () => {
    clientA?.close();
    clientB?.close();

    // Cleanup fixtures (order matters: FKs)
    await db('user_connections').whereIn('user_id', [user1.id, user2.id]).del();
    await db('server_members').where('server_id', 'mn-server-1').del();
    await db('roles').where('server_id', 'mn-server-1').del();
    await db('channels').where('id', 'mn-channel-1').del();
    await db('servers').where('id', 'mn-server-1').del();
    await db('users').whereIn('id', [user1.id, user2.id]).del();

    if (child && !child.killed) {
      child.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          child.kill('SIGKILL');
          resolve();
        }, 5000);
        child.once('exit', () => {
          clearTimeout(t);
          resolve();
        });
      });
    }

    await stopCrossNodeBus();
    await wsServer.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('delivers presence updates from node A to a client on node B', async () => {
    // User 2 lands on node B first
    const b = connectClient(nodeBPort, token2);
    clientB = b.socket;
    await waitFor(b.connected, 15_000, 'client B connect to node B');

    // User 2 subscribes to friend-presence events targeted at their user room
    const presenceReceived = new Promise<any>((resolve) => {
      clientB.on(WS_EVENTS.FRIEND_PRESENCE_UPDATE, resolve);
    });

    // User 1 connects to node A — connection handler marks them online and
    // broadcasts; only the Redis cross-node path can reach node B.
    const a = connectClient(nodeAPort, token1);
    clientA = a.socket;
    await waitFor(a.connected, 15_000, 'client A connect to node A');

    const event = await waitFor(presenceReceived, 15_000, 'cross-node presence update');
    expect(event.userId).toBe(user1.id);
    expect(event.presence).toBe('online');
  }, 45_000);

  it('delivers typing indicators from node A to a client on node B', async () => {
    const joinWithErrors = (client: ClientSocket, label: string) => {
      const joined = new Promise<any>((resolve) =>
        client.once(WS_EVENTS.ROOM_JOINED, resolve)
      );
      const errored = new Promise<never>((_, reject) => {
        client.once(WS_EVENTS.ERROR, (err) =>
          reject(new Error(`${label} room join rejected: ${JSON.stringify(err)}`))
        );
      });
      client.emit(WS_EVENTS.ROOM_JOIN, { roomType: 'channel', roomId: 'mn-channel-1' });
      return waitFor(Promise.race([joined, errored]), 15_000, `${label} room join`);
    };

    await joinWithErrors(clientA, 'client A');
    await joinWithErrors(clientB, 'client B');

    // User 2 (node B) listens; user 1 (node A) types
    const typingReceived = new Promise<any>((resolve) => {
      clientB.on(WS_EVENTS.TYPING_START, resolve);
    });
    clientA.emit(WS_EVENTS.TYPING_START, { channelId: 'mn-channel-1' });

    const event = await waitFor(typingReceived, 15_000, 'cross-node typing indicator');
    expect(event.userId).toBe(user1.id);
    expect(event.channelId).toBe('mn-channel-1');
  }, 45_000);
});
