import { MeiliSearch } from 'meilisearch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Meilisearch client configuration
 *
 * Singleton pattern for Meilisearch connection
 */
let meilisearchClient: MeiliSearch | null = null;

/**
 * Get or create Meilisearch client instance
 */
export function getMeilisearchClient(): MeiliSearch {
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

/**
 * Initialize Meilisearch indices with settings
 */
export async function initializeMeilisearchIndices(): Promise<void> {
  const client = getMeilisearchClient();

  // Create messages index
  const messagesIndex = client.index('messages');
  await messagesIndex.updateSettings({
    searchableAttributes: ['content'],
    filterableAttributes: ['channel_id', 'server_id', 'author_id', 'created_at', 'is_deleted'],
    sortableAttributes: ['created_at'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  });

  // Create users index
  const usersIndex = client.index('users');
  await usersIndex.updateSettings({
    searchableAttributes: ['username', 'display_name'],
    filterableAttributes: ['status', 'created_at'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  });

  // Create servers index
  const serversIndex = client.index('servers');
  await serversIndex.updateSettings({
    searchableAttributes: ['name', 'description'],
    filterableAttributes: ['member_count', 'nsfw', 'verified', 'category', 'is_discoverable'],
    sortableAttributes: ['member_count', 'created_at'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  });
}

/**
 * Close Meilisearch connection (for cleanup)
 */
export function closeMeilisearch(): void {
  meilisearchClient = null;
}

// Index names as constants
export const INDICES = {
  MESSAGES: 'messages',
  USERS: 'users',
  SERVERS: 'servers',
} as const;

// Re-export MeiliSearch type
export type { MeiliSearch };
