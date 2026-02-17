import { getMeilisearchClient, INDICES } from '../meilisearch.client.js';
export class ServerIndexer {
    async indexServer(server) {
        const client = getMeilisearchClient();
        const doc = {
            id: server.id,
            name: server.name,
            description: server.description ?? null,
            icon_url: server.iconUrl ?? null,
            member_count: server.memberCount,
            category: server.category ?? null,
            is_discoverable: server.isDiscoverable,
        };
        if (server.isDiscoverable) {
            await client.index(INDICES.SERVERS).addDocuments([doc]);
        }
        else {
            await this.removeFromIndex(server.id);
        }
    }
    async updateServer(server) {
        await this.indexServer(server);
    }
    async updateMemberCount(serverId, memberCount) {
        const client = getMeilisearchClient();
        await client.index(INDICES.SERVERS).updateDocuments([
            {
                id: serverId,
                member_count: memberCount,
            },
        ]);
    }
    async removeFromIndex(serverId) {
        const client = getMeilisearchClient();
        await client.index(INDICES.SERVERS).deleteDocument(serverId);
    }
    async bulkIndex(servers) {
        const client = getMeilisearchClient();
        const documents = servers
            .filter((s) => s.isDiscoverable)
            .map((server) => ({
            id: server.id,
            name: server.name,
            description: server.description ?? null,
            icon_url: server.iconUrl ?? null,
            member_count: server.memberCount,
            category: server.category ?? null,
            is_discoverable: true,
        }));
        if (documents.length > 0) {
            await client.index(INDICES.SERVERS).addDocuments(documents);
        }
        return documents.length;
    }
}
export const serverIndexer = new ServerIndexer();
//# sourceMappingURL=server.indexer.js.map