import { getMeilisearchClient, INDICES } from '../meilisearch.client.js';

/**
 * Server document structure for Meilisearch
 */
interface ServerDocument {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  member_count: number;
  category: string | null;
  is_discoverable: boolean;
}

/**
 * Server Indexer
 *
 * Handles indexing servers to Meilisearch for discovery
 */
export class ServerIndexer {
  /**
   * Index a server
   */
  async indexServer(server: {
    id: string;
    name: string;
    description?: string | null;
    iconUrl?: string | null;
    memberCount: number;
    category?: string | null;
    isDiscoverable: boolean;
  }): Promise<void> {
    const client = getMeilisearchClient();

    const doc: ServerDocument = {
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
    } else {
      // If not discoverable, remove from index
      await this.removeFromIndex(server.id);
    }
  }

  /**
   * Update an indexed server
   */
  async updateServer(server: {
    id: string;
    name: string;
    description?: string | null;
    iconUrl?: string | null;
    memberCount: number;
    category?: string | null;
    isDiscoverable: boolean;
  }): Promise<void> {
    await this.indexServer(server);
  }

  /**
   * Update member count for a server
   */
  async updateMemberCount(serverId: string, memberCount: number): Promise<void> {
    const client = getMeilisearchClient();

    await client.index(INDICES.SERVERS).updateDocuments([
      {
        id: serverId,
        member_count: memberCount,
      },
    ] as any);
  }

  /**
   * Remove a server from index
   */
  async removeFromIndex(serverId: string): Promise<void> {
    const client = getMeilisearchClient();
    await client.index(INDICES.SERVERS).deleteDocument(serverId);
  }

  /**
   * Bulk index servers
   */
  async bulkIndex(servers: Array<{
    id: string;
    name: string;
    description?: string | null;
    iconUrl?: string | null;
    memberCount: number;
    category?: string | null;
    isDiscoverable: boolean;
  }>): Promise<number> {
    const client = getMeilisearchClient();

    const documents: ServerDocument[] = servers
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

// Export singleton instance
export const serverIndexer = new ServerIndexer();
