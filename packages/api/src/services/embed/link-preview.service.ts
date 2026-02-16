/**
 * Link Preview Service
 * Generates link previews using Open Graph metadata
 */

import ogs from 'open-graph-scraper';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
import { EmbedData } from './embed.service';

/**
 * Link Preview Service class
 */
class LinkPreviewService {
  private readonly CACHE_TTL = 86400; // 24 hours in seconds
  private readonly TIMEOUT = 5000; // 5 seconds
  private readonly USER_AGENT = 'FreedomTalk-Bot/1.0 (+https://freedomtalk.app)';

  // URL regex pattern
  private readonly URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;

  /**
   * Extract URLs from message content
   * @param content - Message content
   * @returns Array of URLs
   */
  extractUrls(content: string): string[] {
    const matches = content.match(this.URL_REGEX);
    return matches ? Array.from(new Set(matches)) : [];
  }

  /**
   * Check if URL should generate a preview
   * @param url - URL to check
   * @returns True if preview should be generated
   */
  shouldGeneratePreview(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Blacklist certain domains (e.g., tracking pixels, analytics)
      const blacklist = [
        'google-analytics.com',
        'googletagmanager.com',
        'facebook.com/tr',
        'doubleclick.net',
      ];

      if (blacklist.some(domain => urlObj.hostname.includes(domain))) {
        return false;
      }

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      return true;
    } catch (error) {
      logger.debug({ url, error }, 'Invalid URL for preview');
      return false;
    }
  }

  /**
   * Get cached preview from Redis
   * @param url - URL to get cached preview for
   * @returns Cached embed data or null
   */
  async getCachedPreview(url: string): Promise<EmbedData | null> {
    try {
      const redis = await getRedisClient();
      const key = `link_preview:${url}`;
      const cached = await redis.get(key);

      if (cached) {
        logger.debug({ url }, 'Link preview cache hit');
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      logger.error({ error, url }, 'Error getting cached preview');
      return null;
    }
  }

  /**
   * Cache preview in Redis
   * @param url - URL to cache preview for
   * @param embedData - Embed data to cache
   */
  async cachePreview(url: string, embedData: EmbedData): Promise<void> {
    try {
      const redis = await getRedisClient();
      const key = `link_preview:${url}`;
      await redis.set(key, JSON.stringify(embedData), { EX: this.CACHE_TTL });

      logger.debug({ url }, 'Link preview cached');
    } catch (error) {
      logger.error({ error, url }, 'Error caching preview');
    }
  }

  /**
   * Generate preview for a URL
   * @param url - URL to generate preview for
   * @returns Embed data or null if preview generation fails
   */
  async generatePreview(url: string): Promise<EmbedData | null> {
    try {
      // Check if preview should be generated
      if (!this.shouldGeneratePreview(url)) {
        logger.debug({ url }, 'URL not eligible for preview');
        return null;
      }

      // Check cache first
      const cached = await this.getCachedPreview(url);
      if (cached) {
        return cached;
      }

      // Fetch Open Graph metadata
      const options = {
        url,
        timeout: this.TIMEOUT,
        fetchOptions: {
          headers: {
            'user-agent': this.USER_AGENT,
          },
        },
      };

      const { result, error } = await ogs(options);

      if (error || !result.success) {
        logger.debug({ url, error }, 'Failed to fetch Open Graph metadata');
        return null;
      }

      // Map Open Graph properties to embed data
      const embedData: EmbedData = {
        type: 'link',
        title: result.ogTitle || result.twitterTitle || undefined,
        description: result.ogDescription || result.twitterDescription || undefined,
        url: result.ogUrl || url,
        image_url: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || undefined,
        author_name: result.ogSiteName || result.twitterSite || undefined,
        timestamp: result.articlePublishedTime ? new Date(result.articlePublishedTime) : undefined,
      };

      // Only cache and return if we have at least a title or description
      if (embedData.title || embedData.description) {
        await this.cachePreview(url, embedData);
        logger.info({ url, hasTitle: !!embedData.title, hasDescription: !!embedData.description }, 'Link preview generated');
        return embedData;
      }

      return null;
    } catch (error: any) {
      logger.error({ error, url, message: error.message }, 'Error generating link preview');
      return null;
    }
  }
}

// Export singleton instance
export const linkPreviewService = new LinkPreviewService();

