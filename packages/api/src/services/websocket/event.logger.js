import { logger } from '../../config/logger';
class EventLogger {
    SAMPLE_RATES = {
        'ping': 0.01,
        'pong': 0.01,
        'typing:start': 0.1,
        'typing:stop': 0.1,
    };
    logEvent(event, data, metadata) {
        if (this.shouldSample(event)) {
            return;
        }
        const sanitizedData = this.sanitizeData(data);
        logger.debug({
            event,
            data: sanitizedData,
            ...metadata,
            timestamp: new Date().toISOString(),
        }, `WebSocket event: ${event}`);
    }
    logError(event, error, metadata) {
        logger.error({
            event,
            error: {
                message: error.message,
                stack: error.stack,
                name: error.name,
            },
            ...metadata,
            timestamp: new Date().toISOString(),
        }, `WebSocket error: ${event}`);
    }
    shouldSample(event) {
        const sampleRate = this.SAMPLE_RATES[event];
        if (!sampleRate) {
            return false;
        }
        return Math.random() > sampleRate;
    }
    sanitizeData(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        const sanitized = { ...data };
        const sensitiveKeys = ['token', 'password', 'secret', 'authorization', 'auth'];
        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            }
            else if (typeof sanitized[key] === 'object') {
                sanitized[key] = this.sanitizeData(sanitized[key]);
            }
        }
        return sanitized;
    }
}
export const eventLogger = new EventLogger();
//# sourceMappingURL=event.logger.js.map