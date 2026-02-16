declare class EventLogger {
    private readonly SAMPLE_RATES;
    logEvent(event: string, data: any, metadata?: Record<string, any>): void;
    logError(event: string, error: Error, metadata?: Record<string, any>): void;
    private shouldSample;
    private sanitizeData;
}
export declare const eventLogger: EventLogger;
export {};
//# sourceMappingURL=event.logger.d.ts.map