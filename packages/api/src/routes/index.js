import authRoutes from './auth';
import userRoutes from './users';
import messageRoutes from './messages';
import websocketRoutes from './websocket';
import reactionRoutes from './reactions.routes';
import attachmentRoutes from './attachments.routes';
import dmRoutes from './dm.routes';
import serverRoutes from './servers';
import channelRoutes from './channels';
import permissionRoutes from './permissions';
import voiceRoutes from './voice';
import searchRoutes from './search';
import discoveryRoutes from './discovery';
export default async function routes(app) {
    await app.register(async (v1) => {
        await v1.register(authRoutes, { prefix: '/auth' });
        await v1.register(userRoutes, { prefix: '/users' });
        await v1.register(messageRoutes, { prefix: '/messages' });
        await v1.register(reactionRoutes, { prefix: '/messages' });
        await v1.register(attachmentRoutes, { prefix: '/messages' });
        await v1.register(dmRoutes);
        await v1.register(serverRoutes, { prefix: '/servers' });
        await v1.register(channelRoutes);
        await v1.register(permissionRoutes);
        await v1.register(voiceRoutes, { prefix: '/voice' });
        await v1.register(searchRoutes, { prefix: '/search' });
        await v1.register(discoveryRoutes, { prefix: '/discovery' });
        await v1.register(websocketRoutes, { prefix: '/websocket' });
    }, { prefix: '/api/v1' });
}
//# sourceMappingURL=index.js.map