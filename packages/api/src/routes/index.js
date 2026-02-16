import authRoutes from './auth';
import userRoutes from './users';
import messageRoutes from './messages';
import websocketRoutes from './websocket';
import reactionRoutes from './reactions.routes';
export default async function routes(app) {
    await app.register(async (v1) => {
        await v1.register(authRoutes, { prefix: '/auth' });
        await v1.register(userRoutes, { prefix: '/users' });
        await v1.register(messageRoutes, { prefix: '/messages' });
        await v1.register(reactionRoutes, { prefix: '/messages' });
        await v1.register(websocketRoutes, { prefix: '/websocket' });
    }, { prefix: '/api/v1' });
}
//# sourceMappingURL=index.js.map