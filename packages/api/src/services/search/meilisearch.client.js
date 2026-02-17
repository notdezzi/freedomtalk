import { MeiliSearch } from 'meilisearch';
import dotenv from 'dotenv';
dotenv.config();
let meilisearchClient = null;
export function getMeilisearchClient() {
    if (!meilisearchClient) {
        const host = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
        const apiKey = process.env.MEILI_MASTER_KEY || 'masterKey';
        meilisearchClient = new MeiliSearch({
            host,
            apiKey,
        });
    }
    return meilisearchClient;
}
export async function initializeMeilisearchIndices() {
    const client = getMeilisearchClient();
    const messagesIndex = client.index('messages');
    await messagesIndex.updateSettings({
        searchableAttributes: ['content'],
        filterableAttributes: ['channel_id', 'server_id', 'author_id', 'created_at', 'is_deleted'],
        sortableAttributes: ['created_at'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
    });
    const usersIndex = client.index('users');
    await usersIndex.updateSettings({
        searchableAttributes: ['username', 'display_name'],
        filterableAttributes: ['status', 'created_at'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
    });
    const serversIndex = client.index('servers');
    await serversIndex.updateSettings({
        searchableAttributes: ['name', 'description'],
        filterableAttributes: ['member_count', 'nsfw', 'verified', 'category', 'is_discoverable'],
        sortableAttributes: ['member_count', 'created_at'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
    });
}
export function closeMeilisearch() {
    meilisearchClient = null;
}
export const INDICES = {
    MESSAGES: 'messages',
    USERS: 'users',
    SERVERS: 'servers',
};
//# sourceMappingURL=meilisearch.client.js.map