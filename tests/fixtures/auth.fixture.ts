/**
 * Auth fixture for Playwright tests
 * Provides authenticated page state for testing protected routes
 */

import { test as base, Page, BrowserContext } from '@playwright/test';
import { createTestUser, TestUser } from '../utils/test-data';

// Extend base test with auth fixtures
type AuthFixtures = {
  authenticatedPage: Page;
  testUser: TestUser;
  authContext: BrowserContext;
};

export const test = base.extend<AuthFixtures>({
  // Create a test user and return credentials
  testUser: async ({}, use) => {
    const user = createTestUser();
    await use(user);
  },

  // Create an authenticated browser context
  authContext: async ({ browser, testUser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Register the test user
    await page.goto('/register');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to app or successful registration
    await page.waitForURL(/\/app|\/login/, { timeout: 10000 }).catch(() => {
      // May already be logged in
    });

    await use(context);
    await context.close();
  },

  // Provide an authenticated page
  authenticatedPage: async ({ authContext }, use) => {
    const page = await authContext.newPage();

    // Navigate to app
    await page.goto('/app');

    // Wait for the app to load
    await page.waitForSelector('[data-testid="app-layout"], .app-layout, main', {
      timeout: 10000,
    }).catch(() => {
      // May have different layout structure
    });

    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * Helper to login an existing user
 */
export async function loginUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to app
  await page.waitForURL('/app/**', { timeout: 10000 });
}

/**
 * Helper to logout current user
 */
export async function logoutUser(page: Page): Promise<void> {
  // Look for logout button in user menu
  const userMenuButton = page.locator('[data-testid="user-menu"], .user-panel').first();
  await userMenuButton.click().catch(() => {});

  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Log out")');
  await logoutButton.click().catch(() => {});

  // Wait for redirect to landing/login page
  await page.waitForURL(/\/|\/login/, { timeout: 10000 }).catch(() => {});
}
