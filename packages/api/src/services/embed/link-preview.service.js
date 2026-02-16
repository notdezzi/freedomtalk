import ogs from 'open-graph-scraper';
import { getRedisClient } from '../../config/redis';
import { logger } from '../../config/logger';
class LinkPreviewService {
    CACHE_TTL = 86400;
    TIMEOUT = 5000;
    USER_AGENT = 'FreedomTalk-Bot/1.0 (+https://freedomtalk.app)';
    URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    extractUrls(content) {
        const matches = content.match(this.URL_REGEX);
        return matches ? Array.from(new Set(matches)) : [];
    }
    shouldGeneratePreview(url) {
        try {
            const urlObj = new URL(url);
            const blacklist = [
                'google-analytics.com',
                'googletagmanager.com',
                'facebook.com/tr',
                'doubleclick.net',
            ];
            if (blacklist.some(domain => urlObj.hostname.includes(domain))) {
                return false;
            }
            if (!['http:', 'https:'].includes(urlObj.protocol)) {
                return false;
            }
            return true;
        }
        catch (error) {
            logger.debug({ url, error }, 'Invalid URL for preview');
            return false;
        }
    }
    async getCachedPreview(url) {
        try {
            const redis = await getRedisClient();
            const key = `link_preview:${url}`;
            const cached = await redis.get(key);
            if (cached) {
                logger.debug({ url }, 'Link preview cache hit');
                return JSON.parse(cached);
            }
            return null;
        }
        catch (error) {
            logger.error({ error, url }, 'Error getting cached preview');
            return null;
        }
    }
    async cachePreview(url, embedData) {
        try {
            const redis = await getRedisClient();
            const key = `link_preview:${url}`;
            await redis.set(key, JSON.stringify(embedData), { EX: this.CACHE_TTL });
            logger.debug({ url }, 'Link preview cached');
        }
        catch (error) {
            logger.error({ error, url }, 'Error caching preview');
        }
    }
    async generatePreview(url) {
        try {
            if (!this.shouldGeneratePreview(url)) {
                logger.debug({ url }, 'URL not eligible for preview');
                return null;
            }
            const cached = await this.getCachedPreview(url);
            if (cached) {
                return cached;
            }
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
            const embedData = {
                type: 'link',
                title: result.ogTitle || result.twitterTitle || undefined,
                description: result.ogDescription || result.twitterDescription || undefined,
                url: result.ogUrl || url,
                image_url: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || undefined,
                author_name: result.ogSiteName || result.twitterSite || undefined,
                timestamp: result.articlePublishedTime ? new Date(result.articlePublishedTime) : undefined,
            };
            if (embedData.title || embedData.description) {
                await this.cachePreview(url, embedData);
                logger.info({ url, hasTitle: !!embedData.title, hasDescription: !!embedData.description }, 'Link preview generated');
                return embedData;
            }
            return null;
        }
        catch (error) {
            logger.error({ error, url, message: error.message }, 'Error generating link preview');
            return null;
        }
    }
}
export const linkPreviewService = new LinkPreviewService();
//# sourceMappingURL=link-preview.service.js.map