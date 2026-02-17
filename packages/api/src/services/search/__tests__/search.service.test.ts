import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchService } from '../search.service.js';

// Mock Meilisearch client
vi.mock('../meilisearch.client.js', () => ({
  getMeilisearchClient: vi.fn(() => ({
    index: vi.fn(() => ({
      search: vi.fn(),
      updateSettings: vi.fn(),
      addDocuments: vi.fn(),
      updateDocuments: vi.fn(),
      deleteDocument: vi.fn(),
    })),
  })),
  INDICES: {
    MESSAGES: 'messages',
    USERS: 'users',
    SERVERS: 'servers',
  },
}));

// Mock database
vi.mock('../../../config/database.js', () => ({
  db: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    whereNot: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    count: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    first: vi.fn(),
  })),
}));

// Mock snowflake
vi.mock('../../../utils/snowflake.js', () => ({
  generateSnowflakeId: vi.fn(() => '12345678901234567890'),
}));

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = new SearchService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('searchMessages', () => {
    it('should search messages with query only', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        hits: [
          { id: '1', content: 'Hello world', author_id: 'user1' },
        ],
        estimatedTotalHits: 1,
        processingTimeMs: 5,
      });

      const { getMeilisearchClient } = await import('../meilisearch.client.js');
      vi.mocked(getMeilisearchClient).mockReturnValue({
        index: () => ({ search: mockSearch }),
      } as any);

      const result = await searchService.searchMessages('hello');

      expect(mockSearch).toHaveBeenCalledWith('hello', expect.objectContaining({
        filter: ['is_deleted = false'],
        limit: 50,
        offset: 0,
      }));
      expect(result.hits).toHaveLength(1);
    });

    it('should search messages with filters', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 2,
      });

      const { getMeilisearchClient } = await import('../meilisearch.client.js');
      vi.mocked(getMeilisearchClient).mockReturnValue({
        index: () => ({ search: mockSearch }),
      } as any);

      await searchService.searchMessages('test', {
        channelId: 'channel12345678901234',
        serverId: 'server123456789012345',
        authorId: 'author12345678901234',
        limit: 10,
        offset: 5,
      });

      expect(mockSearch).toHaveBeenCalledWith('test', expect.objectContaining({
        filter: expect.arrayContaining([
          'is_deleted = false',
          'channel_id = channel12345678901234',
          'server_id = server123456789012345',
          'author_id = author12345678901234',
        ]),
        limit: 10,
        offset: 5,
      }));
    });
  });

  describe('searchUsers', () => {
    it('should search users by username', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        hits: [
          { id: '1', username: 'testuser', display_name: 'Test User' },
        ],
        estimatedTotalHits: 1,
        processingTimeMs: 3,
      });

      const { getMeilisearchClient } = await import('../meilisearch.client.js');
      vi.mocked(getMeilisearchClient).mockReturnValue({
        index: () => ({ search: mockSearch }),
      } as any);

      const result = await searchService.searchUsers('testuser');

      expect(mockSearch).toHaveBeenCalledWith('testuser', expect.objectContaining({
        limit: 25,
        offset: 0,
      }));
      expect(result.hits).toHaveLength(1);
    });
  });

  describe('searchServers', () => {
    it('should search discoverable servers', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        hits: [
          { id: '1', name: 'Gaming Hub', member_count: 100 },
        ],
        estimatedTotalHits: 1,
        processingTimeMs: 4,
      });

      const { getMeilisearchClient } = await import('../meilisearch.client.js');
      vi.mocked(getMeilisearchClient).mockReturnValue({
        index: () => ({ search: mockSearch }),
      } as any);

      const result = await searchService.searchServers('gaming');

      expect(mockSearch).toHaveBeenCalledWith('gaming', expect.objectContaining({
        filter: ['is_discoverable = true'],
        limit: 25,
        offset: 0,
      }));
      expect(result.hits).toHaveLength(1);
    });

    it('should filter servers by category and min members', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 2,
      });

      const { getMeilisearchClient } = await import('../meilisearch.client.js');
      vi.mocked(getMeilisearchClient).mockReturnValue({
        index: () => ({ search: mockSearch }),
      } as any);

      await searchService.searchServers('test', {
        category: 'gaming',
        minMembers: 50,
      });

      expect(mockSearch).toHaveBeenCalledWith('test', expect.objectContaining({
        filter: expect.arrayContaining([
          'is_discoverable = true',
          'category = gaming',
          'member_count >= 50',
        ]),
      }));
    });
  });

  describe('autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const mockSearch = vi.fn().mockResolvedValue({
        hits: [
          { id: '1', username: 'testuser1' },
          { id: '2', username: 'testuser2' },
        ],
      });

      const { getMeilisearchClient } = await import('../meilisearch.client.js');
      vi.mocked(getMeilisearchClient).mockReturnValue({
        index: () => ({ search: mockSearch }),
      } as any);

      const result = await searchService.autocomplete('users', 'test', 5);

      expect(mockSearch).toHaveBeenCalledWith('test', expect.objectContaining({
        limit: 5,
      }));
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('user');
    });
  });
});
