import { getMeilisearchClient, INDICES } from '../meilisearch.client.js';

/**
 * Message document structure for Meilisearch
 */
interface MessageDocument {
  id: string;
  content: string;
  author_id: string;
  channel_id: string | null;
  server_id: string | null;
  created_at: string;
  is_deleted: boolean;
}

/**
 * Message Indexer
 *
 * Handles indexing messages to Meilisearch
 */
export class MessageIndexer {
  /**
   * Index a new message
   */
  async indexMessage(message: {
    id: string;
    content: string;
    authorId: string;
    channelId?: string | null;
    serverId?: string | null;
    createdAt: Date;
  }): Promise<void> {
    const client = getMeilisearchClient();

    const doc: MessageDocument = {
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

  /**
   * Update an indexed message
   */
  async updateMessage(message: {
    id: string;
    content: string;
    authorId: string;
    channelId?: string | null;
    serverId?: string | null;
    createdAt: Date;
  }): Promise<void> {
    // Meilisearch uses the same operation for add/update
    await this.indexMessage(message);
  }

  /**
   * Mark a message as deleted (soft delete in index)
   */
  async deleteMessage(messageId: string): Promise<void> {
    const client = getMeilisearchClient();

    // Update the document to mark as deleted
    await client.index(INDICES.MESSAGES).updateDocuments([
      {
        id: messageId,
        is_deleted: true,
      },
    ] as any);
  }

  /**
   * Permanently remove a message from index
   */
  async removeFromIndex(messageId: string): Promise<void> {
    const client = getMeilisearchClient();
    await client.index(INDICES.MESSAGES).deleteDocument(messageId);
  }

  /**
   * Bulk index messages
   */
  async bulkIndex(messages: Array<{
    id: string;
    content: string;
    authorId: string;
    channelId?: string | null;
    serverId?: string | null;
    createdAt: Date;
  }>): Promise<number> {
    const client = getMeilisearchClient();

    const documents: MessageDocument[] = messages.map((msg) => ({
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

// Export singleton instance
export const messageIndexer = new MessageIndexer();
