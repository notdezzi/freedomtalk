import { logger } from '../../config/logger';

/**
 * Event Logger class
 * Logs all WebSocket events with structured logging and sampling
 */
class EventLogger {
  private readonly SAMPLE_RATES: Record<string, number> = {
    'ping': 0.01, // 1%
    'pong': 0.01, // 1%
    'typing:start': 0.1, // 10%
    'typing:stop': 0.1, // 10%
  };

  /**
   * Log a WebSocket event
   * @param event - Event name
   * @param data - Event data
   * @param metadata - Additional metadata
   */
  logEvent(event: string, data: any, metadata?: Record<string, any>): void {
    // Check if event should be sampled
    if (this.shouldSample(event)) {
      return;
    }

    // Sanitize data
    const sanitizedData = this.sanitizeData(data);

    // Log event
    logger.debug({
      event,
      data: sanitizedData,
      ...metadata,
      timestamp: new Date().toISOString(),
    }, `WebSocket event: ${event}`);
  }

  /**
   * Log an error event
   * @param event - Event name
   * @param error - Error object
   * @param metadata - Additional metadata
   */
  logError(event: string, error: Error, metadata?: Record<string, any>): void {
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

  /**
   * Check if event should be sampled (skipped)
   * @param event - Event name
   * @returns True if event should be skipped
   */
  private shouldSample(event: string): boolean {
    const sampleRate = this.SAMPLE_RATES[event];
    
    if (!sampleRate) {
      return false; // Don't sample if no rate defined
    }

    // Random sampling
    return Math.random() > sampleRate;
  }

  /**
   * Sanitize data to remove sensitive information
   * @param data - Data to sanitize
   * @returns Sanitized data
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    const sensitiveKeys = ['token', 'password', 'secret', 'authorization', 'auth'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }
}

// Export singleton instance
export const eventLogger = new EventLogger();

