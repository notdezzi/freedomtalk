import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { testConnection, closePool, connectRedis, disconnectRedis } from './config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes/index.js';
import { wsServer } from './services/websocket/websocket.server';
import { registerHandlers } from './services/websocket/handlers';
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const isDevelopment = process.env.NODE_ENV !== 'production';
const app = Fastify({
    logger: {
        level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
        transport: isDevelopment
            ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            }
            : undefined,
    },
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
    await app.register(cookie, {
        secret: process.env.COOKIE_SECRET || 'freedomtalk-cookie-secret-change-in-production',
        parseOptions: {
            httpOnly: true,
            secure: !isDevelopment,
            sameSite: 'lax',
        },
    });
    if (process.env.SWAGGER_ENABLED !== 'false') {
        await app.register(swagger, {
            openapi: {
                info: {
                    title: 'FreedomTalk API',
                    description: 'Discord clone backend API - Real-time communication platform',
                    version: '0.1.0',
                    contact: {
                        name: 'FreedomTalk Team',
                        url: 'https://github.com/freedomtalk',
                    },
                    license: {
                        name: 'MIT',
                        url: 'https://opensource.org/licenses/MIT',
                    },
                },
                servers: [
                    {
                        url: `http://localhost:${PORT}`,
                        description: 'Development server',
                    },
                ],
                tags: [
                    { name: 'auth', description: 'Authentication endpoints' },
                    { name: 'users', description: 'User management endpoints' },
                    { name: 'health', description: 'Health check endpoints' },
                ],
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT',
                            description: 'JWT access token',
                        },
                        cookieAuth: {
                            type: 'apiKey',
                            in: 'cookie',
                            name: 'session',
                            description: 'Session cookie',
                        },
                    },
                },
            },
        });
        await app.register(swaggerUi, {
            routePrefix: '/docs',
            uiConfig: {
                docExpansion: 'list',
                deepLinking: true,
            },
            staticCSP: true,
            transformStaticCSP: (header) => header,
        });
    }
    await app.register(rateLimit, {
        global: true,
        max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
        timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
        cache: 10000,
        skipOnError: true,
    });
    app.setErrorHandler(errorHandler);
    app.setNotFoundHandler(notFoundHandler);
}
async function registerRoutes() {
    app.get('/health', async () => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    });
    await app.register(routes);
}
async function initializeInfrastructure() {
    try {
        const dbConnected = await testConnection();
        if (!dbConnected) {
            throw new Error('Failed to connect to database');
        }
        app.log.info('Database connection established');
        await connectRedis();
        app.log.info('Redis connection established');
    }
    catch (error) {
        app.log.error({ err: error }, 'Failed to initialize infrastructure');
        throw error;
    }
}
async function initializeWebSocket() {
    try {
        await wsServer.initialize(app.server);
        app.log.info('WebSocket server initialized');
        registerHandlers(wsServer.getIO());
        app.log.info('WebSocket event handlers registered');
    }
    catch (error) {
        app.log.error({ err: error }, 'Failed to initialize WebSocket server');
        throw error;
    }
}
async function gracefulShutdown(signal) {
    app.log.info(`Received ${signal}, starting graceful shutdown...`);
    try {
        const wsClosePromise = wsServer.close();
        const wsTimeout = new Promise((resolve) => {
            setTimeout(() => {
                app.log.warn('WebSocket shutdown timeout, forcing close');
                resolve();
            }, 30000);
        });
        await Promise.race([wsClosePromise, wsTimeout]);
        app.log.info('WebSocket server closed');
        await app.close();
        app.log.info('Fastify server closed');
        await closePool();
        app.log.info('Database pool closed');
        await disconnectRedis();
        app.log.info('Redis disconnected');
        process.exit(0);
    }
    catch (error) {
        app.log.error({ err: error }, 'Error during graceful shutdown');
        process.exit(1);
    }
}
async function start() {
    try {
        await registerPlugins();
        await initializeInfrastructure();
        await registerRoutes();
        await app.listen({ port: PORT, host: HOST });
        app.log.info(`Server listening on ${HOST}:${PORT}`);
        await initializeWebSocket();
    }
    catch (error) {
        app.log.error({ err: error }, 'Failed to start server');
        process.exit(1);
    }
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
    app.log.error({ err: error }, 'Uncaught exception');
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
    app.log.error({ err: reason }, 'Unhandled rejection');
    gracefulShutdown('unhandledRejection');
});
start();
//# sourceMappingURL=index.js.map