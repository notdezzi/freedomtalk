/**
 * Standalone WebSocket node launcher.
 *
 * Boots the real Socket.io stack (server + handlers + managers + Redis
 * adapter + cross-node bus) without the REST API or mediasoup. Used by
 * the multi-node integration test to spawn a genuine second node, and
 * usable as a blueprint for dedicated WS-only deployments.
 *
 * Prints `WS_NODE_LISTENING <port>` once ready (port 0 = ephemeral).
 */

import 'dotenv/config';
import { createServer } from 'http';
import { connectRedis, disconnectRedis } from '../config/redis';
import { db } from '../config/database';
import { wsServer } from '../services/websocket/websocket.server';
import { registerHandlers } from '../services/websocket/handlers';
import { startCrossNodeBus, stopCrossNodeBus } from '../services/websocket/cross-node.bus';

const PORT = parseInt(process.env.WS_NODE_PORT || '0', 10);

async function main(): Promise<void> {
  await db.raw('SELECT 1');
  await connectRedis();

  const httpServer = createServer();
  await wsServer.initialize(httpServer);
  registerHandlers(wsServer.getIO());
  await startCrossNodeBus();

  httpServer.listen(PORT, () => {
    const address = httpServer.address();
    const port = typeof address === 'object' && address ? address.port : PORT;
    // eslint-disable-next-line no-console
    console.log(`WS_NODE_LISTENING ${port}`);
  });

  const shutdown = async () => {
    try {
      await wsServer.close();
      await stopCrossNodeBus();
      await db.destroy();
      await disconnectRedis();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('WS node failed to start', error);
  process.exit(1);
});
