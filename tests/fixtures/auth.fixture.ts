/**
 * Auth fixture for Playwright tests
 * Provides authenticated page state for testing protected routes
 */

import { test as base, Page, BrowserContext, APIRequestContext } from '@playwright/test';
import { createTestUser, TestUser } from '../utils/test-data';

const API_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// Extend base test with auth fixtures
type AuthFixtures = {
  authenticatedPage: Page;
  testUser: TestUser;
  authContext: BrowserContext;
};

/**
 * Helper to register a user via API and return the access token
 */
async function registerUserViaAPI(
  request: APIRequestContext,
  user: TestUser
): Promise<{ accessToken: string; userId: string }> {
  const response = await request.post(`${API_URL}/api/v1/auth/register`, {
    data: {
      email: user.email,
      username: user.username,
      password: user.password,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to register user: ${response.status()}`);
  }

  // Login to get tokens
  const loginResponse = await request.post(`${API_URL}/api/v1/auth/login`, {
    data: {
      email: user.email,
      password: user.password,
    },
  });

  if (!loginResponse.ok()) {
    throw new Error(`Failed to login user: ${loginResponse.status()}`);
  }

  const body = await loginResponse.json();
  return {
    accessToken: body.data.accessToken,
    userId: body.data.user.id,
  };
}

export const test = base.extend<AuthFixtures>({
  // Create a test user and return credentials
  testUser: async ({}, use) => {
    const user = createTestUser();
    await use(user);
  },

  // Create an authenticated browser context
  authContext: async ({ browser, testUser, request }, use) => {
    const context = await browser.newContext();

    // Register the user via API first
    try {
      const { accessToken } = await registerUserViaAPI(request, testUser);

      // Store the token in localStorage for the app to use
      const page = await context.newPage();

      // Navigate to the app and inject the token
      await page.goto('/app');

      // Wait for page to load, then set the auth token
      await page.waitForLoadState('domcontentloaded');

      // Inject token into localStorage (app should check this on load)
      await page.evaluate((token) => {
        localStorage.setItem('accessToken', token);
        // Also set a flag that we're authenticated
        (window as any).__TEST_AUTH_TOKEN__ = token;
      }, accessToken);

      // Reload to apply the token
      await page.reload();
    } catch (error) {
      // Fallback: try UI registration if API fails
      const page = await context.newPage();
      await page.goto('/register');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="username"]', testUser.username);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Wait for redirect to app or successful registration
      await page.waitForURL(/\/app|\/login/, { timeout: 10000 }).catch(() => {
        // May already be logged in
      });
    }

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
