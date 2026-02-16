import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes';
const isDevelopment = process.env.NODE_ENV !== 'production';
export async function build(options = {}) {
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
    await app.register(swagger, {
        openapi: {
            info: {
                title: 'FreedomTalk API',
                description: 'REST API for FreedomTalk - A Discord clone',
                version: '0.1.0',
            },
            servers: [
                {
                    url: 'http://localhost:3000',
                    description: 'Development server',
                },
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
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
    });
    if (!options.skipRateLimit) {
        await app.register(rateLimit, {
            global: true,
            max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
            timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
            cache: 10000,
            skipOnError: true,
        });
    }
    app.setErrorHandler(errorHandler);
    app.setNotFoundHandler(notFoundHandler);
    app.get('/health', async () => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    });
    await app.register(routes);
    return app;
}
//# sourceMappingURL=app.js.map