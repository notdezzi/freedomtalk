import { describe, it, expect, beforeEach, vi } from 'vitest';
import { connectionManager } from '../../connection.manager';
import { messageBroadcaster } from '../../message.broadcaster';
describe('Load and Stress Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        connectionManager.connections.clear();
        connectionManager.userConnections.clear();
    });
    describe('Connection Scalability', () => {
        it('should handle 500 concurrent connections (scaled down from 10k)', () => {
            const connectionCount = 500;
            const connections = [];
            const startTime = Date.now();
            for (let i = 0; i < connectionCount; i++) {
                const mockSocket = {
                    id: `socket-${i}`,
                    data: { userId: `user-${i % 100}` },
                    disconnect: vi.fn(),
                    emit: vi.fn(),
                };
                connections.push(mockSocket);
                connectionManager.addConnection(`socket-${i}`, `user-${i % 100}`);
            }
            const endTime = Date.now();
            const duration = endTime - startTime;
            expect(connectionManager.connections.size).toBe(connectionCount);
            expect(duration).toBeLessThan(5000);
            console.log(`✓ Added ${connectionCount} connections in ${duration}ms`);
        });
        it('should handle connection churn (rapid connect/disconnect)', () => {
            const iterations = 500;
            const startTime = Date.now();
            for (let i = 0; i < iterations; i++) {
                connectionManager.addConnection(`socket-${i}`, `user-${i}`);
                connectionManager.removeConnection(`socket-${i}`);
            }
            const endTime = Date.now();
            const duration = endTime - startTime;
            expect(connectionManager.connections.size).toBe(0);
            expect(duration).toBeLessThan(2000);
            console.log(`✓ Completed ${iterations} connect/disconnect cycles in ${duration}ms`);
        });
    });
    describe('Message Throughput', () => {
        it('should handle high message broadcast rate (100 msg/s scaled down from 1000)', async () => {
            const messageCount = 100;
            const messages = [];
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
            await Promise.all(messages.map(msg => messageBroadcaster.broadcastMessage(msg)));
            const endTime = Date.now();
            const duration = endTime - startTime;
            const throughput = (messageCount / duration) * 1000;
            console.log(`✓ Broadcast ${messageCount} messages in ${duration}ms (${throughput.toFixed(0)} msg/s)`);
            expect(throughput).toBeGreaterThan(50);
        });
        it('should handle sequential message broadcasting', async () => {
            const messageCount = 50;
            const latencies = [];
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
            const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
            const maxLatency = Math.max(...latencies);
            const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
            console.log(`✓ Message latency - Avg: ${avgLatency.toFixed(2)}ms, Max: ${maxLatency}ms, P95: ${p95Latency}ms`);
            expect(avgLatency).toBeLessThan(100);
            expect(p95Latency).toBeLessThan(200);
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
            if (global.gc) {
                global.gc();
            }
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
            console.log(`✓ Memory increase after ${iterations} iterations: ${memoryIncreaseMB.toFixed(2)}MB`);
            expect(memoryIncreaseMB).toBeLessThan(20);
        });
    });
});
//# sourceMappingURL=websocket.load.test.js.map