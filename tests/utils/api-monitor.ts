/**
 * API Monitor for tracking and analyzing HTTP requests
 * Detects duplicate calls and unnecessary API requests
 */

export interface APICall {
  url: string;
  method: string;
  timestamp: number;
  testId: string;
  status?: number;
  duration?: number;
}

export interface DuplicateCall {
  url: string;
  method: string;
  count: number;
  calls: APICall[];
}

export interface UnnecessaryCall {
  url: string;
  reason: string;
  call: APICall;
}

export class APIMonitor {
  private calls: APICall[] = [];
  private currentTestId: string = '';
  private duplicateWindow: number; // ms

  constructor(duplicateWindow: number = 100) {
    this.duplicateWindow = duplicateWindow;
  }

  /**
   * Set the current test ID for tracking
   */
  setTestId(testId: string): void {
    this.currentTestId = testId;
  }

  /**
   * Track an API request
   */
  track(request: Request): void {
    const call: APICall = {
      url: request.url,
      method: request.method,
      timestamp: Date.now(),
      testId: this.currentTestId,
    };
    this.calls.push(call);
  }

  /**
   * Track an API response
   */
  trackResponse(url: string, method: string, status: number, duration: number): void {
    const call = this.calls.find(
      (c) => c.url === url && c.method === method && !c.status
    );
    if (call) {
      call.status = status;
      call.duration = duration;
    }
  }

  /**
   * Get all calls for a specific URL
   */
  getCalls(url: string): APICall[] {
    return this.calls.filter((c) => c.url.includes(url));
  }

  /**
   * Get call count for a specific URL
   */
  getCallCount(url: string): number {
    return this.calls.filter((c) => c.url.includes(url)).length;
  }

  /**
   * Get all tracked calls
   */
  getAllCalls(): APICall[] {
    return [...this.calls];
  }

  /**
   * Analyze calls for issues
   */
  analyze(): { duplicates: DuplicateCall[]; unnecessary: UnnecessaryCall[] } {
    return {
      duplicates: this.findDuplicates(),
      unnecessary: this.findUnnecessary(),
    };
  }

  /**
   * Find duplicate calls within the duplicate window
   */
  private findDuplicates(): DuplicateCall[] {
    const duplicates: DuplicateCall[] = [];
    const grouped = new Map<string, APICall[]>();

    // Group calls by URL + method
    for (const call of this.calls) {
      const key = `${call.method}:${this.normalizeUrl(call.url)}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(call);
    }

    // Find groups with multiple calls within the window
    const entries = Array.from(grouped.entries());
    for (const [key, calls] of entries) {
      if (calls.length < 2) continue;

      // Sort by timestamp
      calls.sort((a, b) => a.timestamp - b.timestamp);

      // Check for calls within the duplicate window
      const closeCalls: APICall[] = [calls[0]];
      for (let i = 1; i < calls.length; i++) {
        if (calls[i].timestamp - calls[i - 1].timestamp < this.duplicateWindow) {
          closeCalls.push(calls[i]);
        }
      }

      if (closeCalls.length > 1) {
        const [method, url] = key.split(':');
        duplicates.push({
          url,
          method,
          count: closeCalls.length,
          calls: closeCalls,
        });
      }
    }

    return duplicates;
  }

  /**
   * Find unnecessary calls
   */
  private findUnnecessary(): UnnecessaryCall[] {
    const unnecessary: UnnecessaryCall[] = [];

    for (const call of this.calls) {
      // 304 responses indicate cached data was still requested
      if (call.status === 304) {
        unnecessary.push({
          url: call.url,
          reason: 'Cached data was re-requested (304 response)',
          call,
        });
      }

      // Polling too frequently (< 1s intervals)
      const similarCalls = this.calls.filter(
        (c) =>
          this.normalizeUrl(c.url) === this.normalizeUrl(call.url) &&
          c.timestamp > call.timestamp &&
          c.timestamp - call.timestamp < 1000
      );

      if (similarCalls.length > 0) {
        unnecessary.push({
          url: call.url,
          reason: 'Polling interval too aggressive (< 1s)',
          call,
        });
      }
    }

    // Remove duplicates from unnecessary list
    const seen = new Set<string>();
    return unnecessary.filter((u) => {
      const key = `${u.url}:${u.reason}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Normalize URL by removing query params for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      return url;
    }
  }

  /**
   * Clear all tracked calls
   */
  clear(): void {
    this.calls = [];
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalCalls: number;
    uniqueEndpoints: number;
    byMethod: Record<string, number>;
  } {
    const endpoints = new Set<string>();
    const byMethod: Record<string, number> = {};

    for (const call of this.calls) {
      endpoints.add(this.normalizeUrl(call.url));
      byMethod[call.method] = (byMethod[call.method] || 0) + 1;
    }

    return {
      totalCalls: this.calls.length,
      uniqueEndpoints: endpoints.size,
      byMethod,
    };
  }
}

/**
 * Create a singleton monitor for use across tests
 */
let monitorInstance: APIMonitor | null = null;

export function getAPIMonitor(): APIMonitor {
  if (!monitorInstance) {
    monitorInstance = new APIMonitor();
  }
  return monitorInstance;
}

export function resetAPIMonitor(): void {
  monitorInstance = new APIMonitor();
}
