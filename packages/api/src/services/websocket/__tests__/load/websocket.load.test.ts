import { describe, it, expect, beforeEach, vi } from 'vitest';
import { connectionManager } from '../../connection.manager';
import { messageBroadcaster } from '../../message.broadcaster';
import { Socket } from 'socket.io';

/**
 * Load and Stress Tests
 * 
 * NOTE: These are simplified load tests suitable for unit testing.
 * Full load and stress testing including:
 * - 10,000+ concurrent real WebSocket connections
 * - Sustained message throughput (1000+ msg/s)
 * - Real latency measurement under load
 * - Resource usage monitoring (CPU, memory, network)
 * - Connection churn simulation
 * 
 * Should be performed in a dedicated performance testing environment with:
 * - Load testing tools (Artillery, k6, JMeter, etc.)
 * - Real Socket.io server deployment
 * - Monitoring and profiling tools
 * - Dedicated test infrastructure
 * - Extended test duration (minutes/hours)
 * 
 * Example Artillery config for real load testing:
 * ```yaml
 * config:
 *   target: 'ws://localhost:3001'
 *   phases:
 *     - duration: 60
 *       arrivalRate: 100
 *       name: "Ramp up to 10k connections"
 * scenarios:
 *   - engine: socketio
 *     flow:
 *       - emit:
 *           channel: "message:create"
 *           data: { content: "Load test message" }
 * ```
 */

describe('Load and Stress Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (connectionManager as any).connections.clear();
    (connectionManager as any).userConnections.clear();
  });

  describe('Connection Scalability', () => {
    it('should handle 500 concurrent connections (scaled down from 10k)', () => {
      const connectionCount = 500;
      const connections: Socket[] = [];

      const startTime = Date.now();

      // Create 500 connections (100 unique users, 5 connections each - at the limit)
      for (let i = 0; i < connectionCount; i++) {
        const mockSocket = {
          id: `socket-${i}`,
          data: { userId: `user-${i % 100}` }, // 100 unique users, 5 connections each
          disconnect: vi.fn(),
          emit: vi.fn(),
        } as unknown as Socket;

        connections.push(mockSocket);
        connectionManager.addConnection(`socket-${i}`, `user-${i % 100}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all connections were added
      expect((connectionManager as any).connections.size).toBe(connectionCount);

      // Performance assertion: should complete in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds for 500 connections

      console.log(`✓ Added ${connectionCount} connections in ${duration}ms`);
    });

    it('should handle connection churn (rapid connect/disconnect)', () => {
      const iterations = 500;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        // Add connection
        connectionManager.addConnection(`socket-${i}`, `user-${i}`);

        // Immediately remove it
        connectionManager.removeConnection(`socket-${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // All connections should be removed
      expect((connectionManager as any).connections.size).toBe(0);

      // Performance assertion
      expect(duration).toBeLessThan(2000); // 2 seconds for 500 iterations

      console.log(`✓ Completed ${iterations} connect/disconnect cycles in ${duration}ms`);
    });
  });

  describe('Message Throughput', () => {
    it('should handle high message broadcast rate (100 msg/s scaled down from 1000)', async () => {
      const messageCount = 100;
      const messages: any[] = [];

      // Create test messages
      for (let i = 0; i < messageCount; i++) {
        messages.push({
          id: `msg-${i}`,
          content: `Test message ${i}`,
          channelId: 'channel-1',
          authorId: 'user-1',
          createdAt: new Date().toISOString(),
        });
      }

      const startTime = Date.now();

      // Broadcast all messages
      await Promise.all(
        messages.map(msg => messageBroadcaster.broadcastMessage(msg))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (messageCount / duration) * 1000; // messages per second

      console.log(`✓ Broadcast ${messageCount} messages in ${duration}ms (${throughput.toFixed(0)} msg/s)`);

      // Should handle at least 50 msg/s
      expect(throughput).toBeGreaterThan(50);
    });

    it('should handle sequential message broadcasting', async () => {
      const messageCount = 50;
      const latencies: number[] = [];

      for (let i = 0; i < messageCount; i++) {
        const message = {
          id: `msg-${i}`,
          content: `Test message ${i}`,
          channelId: 'channel-1',
          authorId: 'user-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isEdited: false,
          isDeleted: false,
        };

        const startTime = Date.now();
        await messageBroadcaster.broadcastMessage(message);
        const endTime = Date.now();

        latencies.push(endTime - startTime);
      }

      // Calculate statistics
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

      console.log(`✓ Message latency - Avg: ${avgLatency.toFixed(2)}ms, Max: ${maxLatency}ms, P95: ${p95Latency}ms`);

      // Performance assertions
      expect(avgLatency).toBeLessThan(100); // Average should be under 100ms
      expect(p95Latency).toBeLessThan(200); // P95 should be under 200ms
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not leak memory when adding/removing connections', () => {
      const iterations = 1000;
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        connectionManager.addConnection(`socket-${i}`, `user-${i}`);
        connectionManager.removeConnection(`socket-${i}`);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`✓ Memory increase after ${iterations} iterations: ${memoryIncreaseMB.toFixed(2)}MB`);

      // Memory increase should be minimal (less than 20MB for 1000 iterations)
      // Note: This is a loose bound as memory usage can vary based on V8 GC behavior
      expect(memoryIncreaseMB).toBeLessThan(20);
    });
  });
});
