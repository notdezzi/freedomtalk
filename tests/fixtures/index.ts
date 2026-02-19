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

/**
 * Helper to fill the registration form with correct selectors
 */
async function fillRegistrationForm(page: Page, user: TestUser) {
  // The form uses id attributes, not name attributes
  // Order: username, email, password (no confirmPassword field)
  await page.fill('#username', user.username);
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);

  // Check the terms checkbox
  await page.check('#terms');

  // Submit the form
  await page.click('button[type="submit"]');
}

/**
 * Helper to complete the full auth flow including onboarding
 */
async function completeAuthFlow(page: Page, user: TestUser) {
  // Step 1: Register
  await page.goto('/auth/register');
  await page.waitForLoadState('domcontentloaded');
  await fillRegistrationForm(page, user);

  // Wait for redirect to login page
  await page.waitForURL(/\/auth\/login/, { timeout: 15000 });

  // Step 2: Login
  await page.waitForLoadState('domcontentloaded');
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to onboarding or app
  await page.waitForURL(/\/onboarding|\/app/, { timeout: 15000 });

  // Step 3: Complete onboarding if present
  const currentUrl = page.url();
  if (currentUrl.includes('/onboarding')) {
    // Click "Skip for now" to go to servers step
    await page.click('button:has-text("Skip for now")').catch(() => {
      // May already be on servers step
    });

    // Wait for navigation
    await page.waitForURL(/\/onboarding\/servers/, { timeout: 10000 }).catch(() => {});

    // Click "Finish Setup" to complete onboarding
    await page.click('button:has-text("Finish Setup")').catch(() => {});

    // Wait for redirect to app
    await page.waitForURL(/\/app/, { timeout: 15000 });
  }
}

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

    // Complete the full auth flow
    const page = await context.newPage();
    await completeAuthFlow(page, testUser);

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
export { fillRegistrationForm, completeAuthFlow };
