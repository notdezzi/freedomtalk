import { getMeilisearchClient, INDICES } from './meilisearch.client.js';
import { db } from '../../config/database.js';
import { generateSnowflakeId } from '../../utils/snowflake.js';
export class SearchService {
    async searchMessages(query, options = {}) {
        const client = getMeilisearchClient();
        const { channelId, serverId, authorId, limit = 50, offset = 0 } = options;
        const filters = ['is_deleted = false'];
        if (channelId) {
            filters.push(`channel_id = ${channelId}`);
        }
        if (serverId) {
            filters.push(`server_id = ${serverId}`);
        }
        if (authorId) {
            filters.push(`author_id = ${authorId}`);
        }
        const results = await client
            .index(INDICES.MESSAGES)
            .search(query, {
            filter: filters,
            limit,
            offset,
            sort: ['created_at:desc'],
        });
        this.logSearch(query, 'message', results.estimatedTotalHits).catch(() => { });
        return results;
    }
    async searchUsers(query, options = {}) {
        const client = getMeilisearchClient();
        const { limit = 25, offset = 0 } = options;
        const results = await client
            .index(INDICES.USERS)
            .search(query, {
            limit,
            offset,
        });
        this.logSearch(query, 'user', results.estimatedTotalHits).catch(() => { });
        return results;
    }
    async searchServers(query, options = {}) {
        const client = getMeilisearchClient();
        const { category, minMembers, limit = 25, offset = 0 } = options;
        const filters = ['is_discoverable = true'];
        if (category) {
            filters.push(`category = ${category}`);
        }
        if (minMembers !== undefined) {
            filters.push(`member_count >= ${minMembers}`);
        }
        const results = await client
            .index(INDICES.SERVERS)
            .search(query, {
            filter: filters,
            limit,
            offset,
            sort: ['member_count:desc'],
        });
        this.logSearch(query, 'server', results.estimatedTotalHits).catch(() => { });
        return results;
    }
    async autocomplete(type, prefix, limit = 10) {
        const client = getMeilisearchClient();
        const indexName = type === 'messages' ? INDICES.MESSAGES :
            type === 'users' ? INDICES.USERS : INDICES.SERVERS;
        const results = await client
            .index(indexName)
            .search(prefix, {
            limit,
        });
        return results.hits.map((hit) => ({
            id: hit.id,
            text: type === 'messages' ? hit.content?.substring(0, 100) :
                type === 'users' ? hit.username :
                    hit.name,
            type: type.slice(0, -1),
        }));
    }
    async logSearch(query, searchType, resultsCount) {
        try {
            await db('search_analytics').insert({
                id: generateSnowflakeId(),
                query,
                search_type: searchType,
                results_count: resultsCount,
                created_at: new Date(),
            });
        }
        catch (error) {
            console.error('Failed to log search analytics:', error);
        }
    }
    async getPopularQueries(searchType, limit = 10) {
        let query = db('search_analytics')
            .select('query')
            .count('id as count')
            .groupBy('query')
            .orderBy('count', 'desc')
            .limit(limit);
        if (searchType) {
            query = query.where('search_type', searchType);
        }
        const results = await query;
        return results.map((r) => ({
            query: r.query,
            count: Number(r.count),
        }));
    }
    async syncMessagesIndex() {
        const client = getMeilisearchClient();
        const messages = await db('messages')
            .select('id', 'content', 'author_id', 'channel_id', 'created_at')
            .where('is_deleted', false)
            .leftJoin('channels', 'messages.channel_id', 'channels.id')
            .select('channels.server_id');
        const documents = messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            author_id: msg.author_id,
            channel_id: msg.channel_id,
            server_id: msg.server_id,
            created_at: msg.created_at.toISOString(),
            is_deleted: false,
        }));
        if (documents.length > 0) {
            await client.index(INDICES.MESSAGES).addDocuments(documents);
        }
        return documents.length;
    }
    async syncUsersIndex() {
        const client = getMeilisearchClient();
        const users = await db('users')
            .select('id', 'username')
            .leftJoin('user_profiles', 'users.id', 'user_profiles.user_id')
            .select('user_profiles.display_name', 'user_profiles.avatar_url');
        const documents = users.map((user) => ({
            id: user.id,
            username: user.username,
            display_name: user.display_name || user.username,
            avatar_url: user.avatar_url,
        }));
        if (documents.length > 0) {
            await client.index(INDICES.USERS).addDocuments(documents);
        }
        return documents.length;
    }
    async syncServersIndex() {
        const client = getMeilisearchClient();
        const servers = await db('servers')
            .select('servers.id', 'servers.name', 'servers.description', 'servers.icon_url', 'servers.member_count')
            .leftJoin('server_discovery_settings', 'servers.id', 'server_discovery_settings.server_id')
            .select('server_discovery_settings.is_discoverable', 'server_discovery_settings.category')
            .where('server_discovery_settings.is_discoverable', true)
            .orWhereNull('server_discovery_settings.is_discoverable');
        const documents = servers.map((server) => ({
            id: server.id,
            name: server.name,
            description: server.description,
            icon_url: server.icon_url,
            member_count: server.member_count || 0,
            category: server.category,
            is_discoverable: server.is_discoverable ?? false,
        }));
        if (documents.length > 0) {
            await client.index(INDICES.SERVERS).addDocuments(documents);
        }
        return documents.length;
    }
}
export const searchService = new SearchService();
//# sourceMappingURL=search.service.js.map