/**
 * API Tracker fixture for Playwright tests
 * Tracks and analyzes API calls during tests
 */

import { test as base, Page, BrowserContext } from '@playwright/test';
import { APIMonitor, getAPIMonitor, resetAPIMonitor } from '../utils/api-monitor';

// Extend base test with API tracking
type APITrackerFixtures = {
  monitor: APIMonitor;
  trackedPage: Page;
  trackedContext: BrowserContext;
};

export const test = base.extend<APITrackerFixtures>({
  // Provide a fresh monitor for each test
  monitor: async ({}, use) => {
    resetAPIMonitor();
    const monitor = getAPIMonitor();
    await use(monitor);
    resetAPIMonitor();
  },

  // Provide a tracked browser context
  trackedContext: async ({ browser, monitor }, use) => {
    const context = await browser.newContext();

    // Track all requests
    context.on('request', (request) => {
      if (request.url().includes('/api/')) {
        monitor.track(request as unknown as Request);
      }
    });

    // Track responses
    context.on('response', async (response) => {
      if (response.url().includes('/api/')) {
        const request = response.request();
        monitor.trackResponse(
          response.url(),
          request.method(),
          response.status(),
          0 // Duration not easily available
        );
      }
    });

    await use(context);
    await context.close();
  },

  // Provide a tracked page
  trackedPage: async ({ trackedContext }, use) => {
    const page = await trackedContext.newPage();
    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * Custom assertion for no duplicate calls
 */
export function expectNoDuplicateCalls(monitor: APIMonitor): void {
  const analysis = monitor.analyze();

  if (analysis.duplicates.length > 0) {
    const messages = analysis.duplicates.map(
      (d) => `${d.method} ${d.url} called ${d.count} times`
    );
    throw new Error(
      `Duplicate API calls detected:\n${messages.join('\n')}`
    );
  }
}

/**
 * Custom assertion for max call count
 */
export function expectMaxCallCount(
  monitor: APIMonitor,
  url: string,
  max: number
): void {
  const count = monitor.getCallCount(url);
  if (count > max) {
    throw new Error(
      `Expected at most ${max} calls to ${url}, but got ${count}`
    );
  }
}

/**
 * Get analysis report as string
 */
export function getAnalysisReport(monitor: APIMonitor): string {
  const summary = monitor.getSummary();
  const analysis = monitor.analyze();

  let report = `## API Call Analysis\n\n`;
  report += `### Summary\n`;
  report += `- Total calls: ${summary.totalCalls}\n`;
  report += `- Unique endpoints: ${summary.uniqueEndpoints}\n`;
  report += `- By method: ${JSON.stringify(summary.byMethod)}\n\n`;

  if (analysis.duplicates.length > 0) {
    report += `### Duplicates Found\n`;
    for (const dup of analysis.duplicates) {
      report += `- ${dup.method} ${dup.url}: ${dup.count} times\n`;
    }
  }

  if (analysis.unnecessary.length > 0) {
    report += `### Unnecessary Calls\n`;
    for (const un of analysis.unnecessary) {
      report += `- ${un.url}: ${un.reason}\n`;
    }
  }

  return report;
}
