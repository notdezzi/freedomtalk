import { getMeilisearchClient, INDICES } from './meilisearch.client.js';
import { db } from '../../config/database.js';
import { generateSnowflakeId } from '../../utils/snowflake.js';
import type { SearchResponse } from 'meilisearch';

/**
 * Search options for messages
 */
export interface MessageSearchOptions {
  channelId?: string;
  serverId?: string;
  authorId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search options for users
 */
export interface UserSearchOptions {
  limit?: number;
  offset?: number;
}

/**
 * Search options for servers
 */
export interface ServerSearchOptions {
  category?: string;
  minMembers?: number;
  limit?: number;
  offset?: number;
}

/**
 * Message search result
 */
export interface MessageSearchResult {
  id: string;
  content: string;
  author_id: string;
  channel_id: string | null;
  server_id: string | null;
  created_at: string;
}

/**
 * User search result
 */
export interface UserSearchResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Server search result
 */
export interface ServerSearchResult {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  member_count: number;
  category: string | null;
}

/**
 * Autocomplete result
 */
export interface AutocompleteResult {
  id: string;
  text: string;
  type: 'message' | 'user' | 'server';
}

/**
 * Search Service
 *
 * Handles all search operations using Meilisearch
 */
export class SearchService {
  /**
   * Search messages with optional filters
   */
  async searchMessages(
    query: string,
    options: MessageSearchOptions = {}
  ): Promise<SearchResponse<MessageSearchResult>> {
    const client = getMeilisearchClient();
    const { channelId, serverId, authorId, limit = 50, offset = 0 } = options;

    // Build filter array
    const filters: string[] = ['is_deleted = false'];

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

    // Log search analytics (fire and forget)
    this.logSearch(query, 'message', results.estimatedTotalHits).catch(() => {});

    return results as SearchResponse<MessageSearchResult>;
  }

  /**
   * Search users by username or display name
   */
  async searchUsers(
    query: string,
    options: UserSearchOptions = {}
  ): Promise<SearchResponse<UserSearchResult>> {
    const client = getMeilisearchClient();
    const { limit = 25, offset = 0 } = options;

    const results = await client
      .index(INDICES.USERS)
      .search(query, {
        limit,
        offset,
      });

    // Log search analytics (fire and forget)
    this.logSearch(query, 'user', results.estimatedTotalHits).catch(() => {});

    return results as SearchResponse<UserSearchResult>;
  }

  /**
   * Search servers for discovery
   */
  async searchServers(
    query: string,
    options: ServerSearchOptions = {}
  ): Promise<SearchResponse<ServerSearchResult>> {
    const client = getMeilisearchClient();
    const { category, minMembers, limit = 25, offset = 0 } = options;

    // Build filter array
    const filters: string[] = ['is_discoverable = true'];

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

    // Log search analytics (fire and forget)
    this.logSearch(query, 'server', results.estimatedTotalHits).catch(() => {});

    return results as SearchResponse<ServerSearchResult>;
  }

  /**
   * Autocomplete for quick suggestions
   */
  async autocomplete(
    type: 'messages' | 'users' | 'servers',
    prefix: string,
    limit: number = 10
  ): Promise<AutocompleteResult[]> {
    const client = getMeilisearchClient();
    const indexName = type === 'messages' ? INDICES.MESSAGES :
                      type === 'users' ? INDICES.USERS : INDICES.SERVERS;

    const results = await client
      .index(indexName)
      .search(prefix, {
        limit,
      });

    return results.hits.map((hit: any) => ({
      id: hit.id,
      text: type === 'messages' ? hit.content?.substring(0, 100) :
            type === 'users' ? hit.username :
            hit.name,
      type: type.slice(0, -1) as 'message' | 'user' | 'server',
    }));
  }

  /**
   * Log search query for analytics
   */
  private async logSearch(
    query: string,
    searchType: 'message' | 'user' | 'server',
    resultsCount: number
  ): Promise<void> {
    try {
      await db('search_analytics').insert({
        id: generateSnowflakeId(),
        query,
        search_type: searchType,
        results_count: resultsCount,
        created_at: new Date(),
      });
    } catch (error) {
      // Silently fail - analytics shouldn't break search
      console.error('Failed to log search analytics:', error);
    }
  }

  /**
   * Get popular search queries
   */
  async getPopularQueries(
    searchType?: 'message' | 'user' | 'server',
    limit: number = 10
  ): Promise<{ query: string; count: number }[]> {
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
      query: r.query as string,
      count: Number(r.count),
    }));
  }

  /**
   * Sync all messages to search index (for initial setup or reindex)
   */
  async syncMessagesIndex(): Promise<number> {
    const client = getMeilisearchClient();

    // Fetch all non-deleted messages
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

  /**
   * Sync all users to search index
   */
  async syncUsersIndex(): Promise<number> {
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

  /**
   * Sync all discoverable servers to search index
   */
  async syncServersIndex(): Promise<number> {
    const client = getMeilisearchClient();

    const servers = await db('servers')
      .select(
        'servers.id',
        'servers.name',
        'servers.description',
        'servers.icon_url',
        'servers.member_count'
      )
      .leftJoin(
        'server_discovery_settings',
        'servers.id',
        'server_discovery_settings.server_id'
      )
      .select(
        'server_discovery_settings.is_discoverable',
        'server_discovery_settings.category'
      )
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

// Export singleton instance
export const searchService = new SearchService();
