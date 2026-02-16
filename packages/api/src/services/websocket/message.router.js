import { logger } from '../../config/logger';
import { db } from '../../config/database';
import { messageBroadcaster } from './message.broadcaster';
import { subscriptionManager } from './subscription.manager';
import { dmChannelService } from '../dm/dm-channel.service';
class MessageRouter {
    async routeMessage(message) {
        try {
            if (message.channelId) {
                await this.routeChannelMessage(message);
            }
            else {
                await this.routeDM(message);
            }
            logger.debug({ messageId: message.id, channelId: message.channelId }, 'Message routed');
        }
        catch (error) {
            logger.error({ error, messageId: message.id }, 'Error routing message');
            throw error;
        }
    }
    async routeChannelMessage(message) {
        try {
            if (!message.channelId) {
                throw new Error('Channel ID is required for channel messages');
            }
            const isSubscribed = await subscriptionManager.isSubscribed(message.authorId, message.channelId);
            if (!isSubscribed) {
                logger.warn({
                    authorId: message.authorId,
                    channelId: message.channelId
                }, 'Author not subscribed to channel');
            }
            const subscribers = await subscriptionManager.getChannelSubscribers(message.channelId);
            logger.info({
                messageId: message.id,
                channelId: message.channelId,
                subscriberCount: subscribers.size
            }, 'Routing channel message');
            await messageBroadcaster.broadcastMessage(message);
        }
        catch (error) {
            logger.error({ error, messageId: message.id }, 'Error routing channel message');
            throw error;
        }
    }
    async routeServerMessage(message) {
        try {
            if (!message.channelId) {
                logger.warn({ messageId: message.id }, 'Cannot route server message without channelId');
                return;
            }
            const channel = await db('channels')
                .where({ id: message.channelId })
                .select('server_id')
                .first();
            if (!channel) {
                logger.warn({ messageId: message.id, channelId: message.channelId }, 'Channel not found');
                return;
            }
            const serverChannels = await db('channels')
                .where({ server_id: channel.server_id })
                .select('id');
            for (const { id } of serverChannels) {
                const subscribers = await subscriptionManager.getChannelSubscribers(id);
                for (const subscriberId of subscribers) {
                    await messageBroadcaster.broadcastToUser(subscriberId, 'message:created', message);
                }
            }
            logger.debug({ messageId: message.id, serverId: channel.server_id }, 'Server message routed');
        }
        catch (error) {
            logger.error({ error, messageId: message.id }, 'Error routing server message');
            throw error;
        }
    }
    async routeDM(message) {
        try {
            if (!message.channelId) {
                logger.warn({ messageId: message.id }, 'DM message has no channelId');
                return;
            }
            const participantIds = await dmChannelService.getParticipantUserIds(message.channelId);
            if (participantIds.length === 0) {
                logger.warn({ messageId: message.id, dmChannelId: message.channelId }, 'No active participants found for DM');
                return;
            }
            logger.info({
                messageId: message.id,
                dmChannelId: message.channelId,
                participantCount: participantIds.length,
            }, 'Routing DM message to participants');
            const broadcastPromises = participantIds.map((userId) => messageBroadcaster.broadcastToUser(userId, 'message:created', message));
            await Promise.all(broadcastPromises);
            logger.debug({
                messageId: message.id,
                dmChannelId: message.channelId,
                participants: participantIds,
            }, 'DM message routed successfully');
        }
        catch (error) {
            logger.error({ error, messageId: message.id }, 'Error routing DM');
            throw error;
        }
    }
    async validateChannelPermission(userId, channelId) {
        try {
            const channel = await db('channels')
                .join('servers', 'channels.server_id', 'servers.id')
                .where('channels.id', channelId)
                .select('servers.id as server_id', 'servers.owner_id')
                .first();
            if (!channel) {
                logger.warn({ userId, channelId }, 'Channel not found');
                return false;
            }
            if (channel.owner_id === userId) {
                return true;
            }
            logger.warn({ userId, channelId, serverId: channel.server_id }, 'User is not server owner');
            return false;
        }
        catch (error) {
            logger.error({ error, userId, channelId }, 'Error validating channel permission');
            return false;
        }
    }
}
export const messageRouter = new MessageRouter();
//# sourceMappingURL=message.router.js.map