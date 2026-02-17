import { getMeilisearchClient, INDICES } from '../meilisearch.client.js';
export class UserIndexer {
    async indexUser(user) {
        const client = getMeilisearchClient();
        const doc = {
            id: user.id,
            username: user.username,
            display_name: user.displayName || user.username,
            avatar_url: user.avatarUrl ?? null,
        };
        await client.index(INDICES.USERS).addDocuments([doc]);
    }
    async updateUser(user) {
        await this.indexUser(user);
    }
    async removeFromIndex(userId) {
        const client = getMeilisearchClient();
        await client.index(INDICES.USERS).deleteDocument(userId);
    }
    async bulkIndex(users) {
        const client = getMeilisearchClient();
        const documents = users.map((user) => ({
            id: user.id,
            username: user.username,
            display_name: user.displayName || user.username,
            avatar_url: user.avatarUrl ?? null,
        }));
        if (documents.length > 0) {
            await client.index(INDICES.USERS).addDocuments(documents);
        }
        return documents.length;
    }
}
export const userIndexer = new UserIndexer();
//# sourceMappingURL=user.indexer.js.map