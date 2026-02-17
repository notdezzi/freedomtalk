import { getMeilisearchClient, INDICES } from '../meilisearch.client.js';

/**
 * User document structure for Meilisearch
 */
interface UserDocument {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

/**
 * User Indexer
 *
 * Handles indexing users to Meilisearch
 */
export class UserIndexer {
  /**
   * Index a user
   */
  async indexUser(user: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  }): Promise<void> {
    const client = getMeilisearchClient();

    const doc: UserDocument = {
      id: user.id,
      username: user.username,
      display_name: user.displayName || user.username,
      avatar_url: user.avatarUrl ?? null,
    };

    await client.index(INDICES.USERS).addDocuments([doc]);
  }

  /**
   * Update an indexed user
   */
  async updateUser(user: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  }): Promise<void> {
    // Meilisearch uses the same operation for add/update
    await this.indexUser(user);
  }

  /**
   * Remove a user from index
   */
  async removeFromIndex(userId: string): Promise<void> {
    const client = getMeilisearchClient();
    await client.index(INDICES.USERS).deleteDocument(userId);
  }

  /**
   * Bulk index users
   */
  async bulkIndex(users: Array<{
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  }>): Promise<number> {
    const client = getMeilisearchClient();

    const documents: UserDocument[] = users.map((user) => ({
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

// Export singleton instance
export const userIndexer = new UserIndexer();
