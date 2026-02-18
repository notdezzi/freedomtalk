/**
 * Combined fixtures for FreedomTalk E2E tests
 * Combines auth and API tracking capabilities
 */

import { test as base, Page, BrowserContext, Request as PlaywrightRequest } from '@playwright/test';
import { APIMonitor, getAPIMonitor, resetAPIMonitor } from '../utils/api-monitor';
import { createTestUser, TestUser } from '../utils/test-data';

// Combined fixtures type
type FreedomTalkFixtures = {
  // Auth
  authenticatedPage: Page;
  testUser: TestUser;
  authContext: BrowserContext;

  // API Tracking
  monitor: APIMonitor;

  // Combined
  authenticatedTrackedPage: Page;
};

export const test = base.extend<FreedomTalkFixtures>({
  // API Monitor
  monitor: async ({}, use) => {
    resetAPIMonitor();
    const monitor = getAPIMonitor();
    await use(monitor);
    resetAPIMonitor();
  },

  // Test user
  testUser: async ({}, use) => {
    const user = createTestUser();
    await use(user);
  },

  // Auth context with API tracking
  authContext: async ({ browser, testUser, monitor }, use) => {
    const context = await browser.newContext();

    // Track all API requests
    context.on('request', (request: PlaywrightRequest) => {
      if (request.url().includes('/api/')) {
        monitor.track({
          url: request.url(),
          method: request.method(),
        } as unknown as Request);
      }
    });

    // Register the test user via API
    const page = await context.newPage();
    await page.goto('/register');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for successful registration/login
    await page.waitForURL(/\/app|\/onboarding/, { timeout: 15000 }).catch(() => {
      // May already be at app
    });

    await use(context);
    await context.close();
  },

  // Authenticated page
  authenticatedPage: async ({ authContext }, use) => {
    const page = await authContext.newPage();
    await page.goto('/app');

    // Wait for app to load
    await page.waitForLoadState('networkidle').catch(() => {});

    await use(page);
  },

  // Authenticated tracked page (combines auth + tracking)
  authenticatedTrackedPage: async ({ authContext, monitor }, use) => {
    const page = await authContext.newPage();

    // Track requests for this page
    page.on('request', (request: PlaywrightRequest) => {
      if (request.url().includes('/api/')) {
        monitor.track({
          url: request.url(),
          method: request.method(),
        } as unknown as Request);
      }
    });

    await page.goto('/app');
    await page.waitForLoadState('networkidle').catch(() => {});

    await use(page);
  },
});

export { expect } from '@playwright/test';
export { createTestUser, createTestServer, createTestChannel, createTestMessage } from '../utils/test-data';
export { expectNoDuplicateCalls, expectMaxCallCount, getAnalysisReport } from './api-tracker.fixture';
