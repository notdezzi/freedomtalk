import { getMeilisearchClient, INDICES } from '../meilisearch.client.js';
export class MessageIndexer {
    async indexMessage(message) {
        const client = getMeilisearchClient();
        const doc = {
            id: message.id,
            content: message.content,
            author_id: message.authorId,
            channel_id: message.channelId ?? null,
            server_id: message.serverId ?? null,
            created_at: message.createdAt.toISOString(),
            is_deleted: false,
        };
        await client.index(INDICES.MESSAGES).addDocuments([doc]);
    }
    async updateMessage(message) {
        await this.indexMessage(message);
    }
    async deleteMessage(messageId) {
        const client = getMeilisearchClient();
        await client.index(INDICES.MESSAGES).updateDocuments([
            {
                id: messageId,
                is_deleted: true,
            },
        ]);
    }
    async removeFromIndex(messageId) {
        const client = getMeilisearchClient();
        await client.index(INDICES.MESSAGES).deleteDocument(messageId);
    }
    async bulkIndex(messages) {
        const client = getMeilisearchClient();
        const documents = messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            author_id: msg.authorId,
            channel_id: msg.channelId ?? null,
            server_id: msg.serverId ?? null,
            created_at: msg.createdAt.toISOString(),
            is_deleted: false,
        }));
        if (documents.length > 0) {
            await client.index(INDICES.MESSAGES).addDocuments(documents);
        }
        return documents.length;
    }
}
export const messageIndexer = new MessageIndexer();
//# sourceMappingURL=message.indexer.js.map