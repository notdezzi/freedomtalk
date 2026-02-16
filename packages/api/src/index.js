import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { logger, testConnection, closePool, connectRedis, disconnectRedis } from './config';
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const app = Fastify({
    logger,
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
});
async function registerPlugins() {
    await app.register(helmet, {
        contentSecurityPolicy: false,
    });
    await app.register(cors, {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    });
}
async function registerRoutes() {
    app.get('/health', async () => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    });
    app.get('/api/v1', async () => {
        return {
            name: 'FreedomTalk API',
            version: '0.1.0',
            description: 'Discord clone backend API',
        };
    });
}
async function initializeInfrastructure() {
    try {
        const dbConnected = await testConnection();
        if (!dbConnected) {
            throw new Error('Failed to connect to database');
        }
        logger.info('Database connection established');
        await connectRedis();
        logger.info('Redis connection established');
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to initialize infrastructure');
        throw error;
    }
}
async function gracefulShutdown(signal) {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    try {
        await app.close();
        logger.info('Fastify server closed');
        await closePool();
        logger.info('Database pool closed');
        await disconnectRedis();
        logger.info('Redis disconnected');
        process.exit(0);
    }
    catch (error) {
        logger.error({ err: error }, 'Error during graceful shutdown');
        process.exit(1);
    }
}
async function start() {
    try {
        await registerPlugins();
        await registerRoutes();
        await initializeInfrastructure();
        await app.listen({ port: PORT, host: HOST });
        logger.info(`Server listening on ${HOST}:${PORT}`);
    }
    catch (error) {
        logger.error({ err: error }, 'Failed to start server');
        process.exit(1);
    }
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught exception');
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled rejection');
    gracefulShutdown('unhandledRejection');
});
start();
//# sourceMappingURL=index.js.map