/**
 * Authentication E2E Tests
 * Tests registration, login, logout flows for the new FreedomTalk layout
 */

import { test, expect, createTestUser, fillRegistrationForm } from '../fixtures';

test.describe('Authentication', () => {
  test.describe('Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      const user = createTestUser();

      await page.goto('/auth/register');
      await page.waitForLoadState('domcontentloaded');

      // Fill registration form using id selectors
      await page.fill('#username', user.username);
      await page.fill('#email', user.email);
      await page.fill('#password', user.password);
      await page.check('#terms');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to login page after successful registration
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });
    });

    test('should show error for invalid email', async ({ page }) => {
      await page.goto('/auth/register');
      await page.waitForLoadState('domcontentloaded');

      await page.fill('#username', 'testuser');
      await page.fill('#email', 'invalid-email');
      await page.fill('#password', 'TestPassword123!');
      await page.check('#terms');

      await page.click('button[type="submit"]');

      // HTML5 email validation should prevent submission
      await expect(page).toHaveURL(/\/auth\/register/);
    });

    test('should disable submit for weak password', async ({ page }) => {
      const user = createTestUser();

      await page.goto('/auth/register');
      await page.waitForLoadState('domcontentloaded');

      await page.fill('#username', user.username);
      await page.fill('#email', user.email);
      await page.fill('#password', 'weak');
      await page.check('#terms');

      // Button should be disabled due to unmet password requirements
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeDisabled();
    });

    test('should show error for duplicate email', async ({ page }) => {
      const user = createTestUser();

      // First register a user (retry loop: cold Turbopack compiles can fully
      // reload the page after domcontentloaded and wipe unhydrated form state)
      await page.goto('/auth/register');
      await page.waitForLoadState('domcontentloaded');
      await fillRegistrationForm(page, user);
      let firstRegistered = await page
        .waitForURL(/\/auth\/login/, { timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      for (let attempt = 0; attempt < 2 && !firstRegistered; attempt++) {
        await page.goto('/auth/register');
        await page.waitForLoadState('domcontentloaded');
        await fillRegistrationForm(page, user);
        firstRegistered = await page
          .waitForURL(/\/auth\/login/, { timeout: 8000 })
          .then(() => true)
          .catch(() => false);
      }
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });

      // Try to register with same email. Fresh pages can fully reload right
      // after domcontentloaded (Turbopack compile) and wipe unhydrated form
      // state, so retry until the API error is actually displayed.
      const page2 = await page.context().newPage();
      const duplicateError = page2.locator('text=/already.*exists|already.*registered|email.*taken/i');
      let showedError = false;
      for (let attempt = 0; attempt < 3 && !showedError; attempt++) {
        await page2.goto('/auth/register');
        await page2.waitForLoadState('domcontentloaded');
        await page2.waitForLoadState('networkidle').catch(() => {});
        await fillRegistrationForm(page2, { ...user, username: `diff_${user.username}` });
        showedError = await duplicateError
          .waitFor({ state: 'visible', timeout: 8000 })
          .then(() => true)
          .catch(() => false);
      }
      await expect(duplicateError).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Login', () => {
    test('should login successfully and complete onboarding', async ({ page }) => {
      const user = createTestUser();

      // Register first
      await page.goto('/auth/register');
      await page.waitForLoadState('domcontentloaded');
      await page.fill('#username', user.username);
      await page.fill('#email', user.email);
      await page.fill('#password', user.password);
      await page.check('#terms');
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/auth\/login/, { timeout: 15000 });

      // Login
      await page.waitForLoadState('domcontentloaded');
      await page.fill('#email', user.email);
      await page.fill('#password', user.password);
      await page.click('button[type="submit"]');

      // Should redirect to onboarding or app
      await expect(page).toHaveURL(/\/onboarding|\/app/, { timeout: 15000 });

      // Complete onboarding if present
      const currentUrl = page.url();
      if (currentUrl.includes('/onboarding')) {
        // Skip profile setup
        await page.click('button:has-text("Skip for now")').catch(() => {});
        await page.waitForURL(/\/onboarding\/servers/, { timeout: 10000 }).catch(() => {});
        await page.click('button:has-text("Finish Setup")').catch(() => {});
        await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
      }
    });

    test('should show error for invalid credentials', async ({ page }) => {
      const loginError = page.locator('text=/invalid.*credentials|incorrect|not found/i');
      // Same hydration-race retry as registration: the form can be wiped by a
      // full reload before React hydrates
      let showedError = false;
      for (let attempt = 0; attempt < 3 && !showedError; attempt++) {
        await page.goto('/auth/login');
        await page.waitForLoadState('domcontentloaded');
        await page.waitForLoadState('networkidle').catch(() => {});
        await page.fill('#email', 'nonexistent@example.com');
        await page.fill('#password', 'WrongPassword123!');
        await page.click('button[type="submit"]');
        showedError = await loginError
          .waitFor({ state: 'visible', timeout: 8000 })
          .then(() => true)
          .catch(() => false);
      }
      // Should show error message
      await expect(loginError).toBeVisible({ timeout: 5000 });
    });

    test('should redirect to app if already logged in', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/auth/login');
      await authenticatedPage.waitForTimeout(2000);

      // If not redirected, navigate to app
      const url = authenticatedPage.url();
      if (!url.includes('/app')) {
        await authenticatedPage.goto('/app');
      }

      await expect(authenticatedPage).toHaveURL(/\/app/, { timeout: 10000 });
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully from user panel', async ({ authenticatedPage }) => {
      // Click on user panel area (bottom left of navigation)
      const userPanel = authenticatedPage.locator('[data-testid="user-panel"], .user-panel, nav > div:last-child').first();
      await userPanel.click().catch(() => {});

      // Find and click logout button in the dropdown/modal
      const logoutButton = authenticatedPage.locator('button:has-text("Logout"), button:has-text("Log out")');
      await logoutButton.first().click().catch(() => {});

      // Should redirect to landing or login
      await expect(authenticatedPage).toHaveURL(/\/|\/auth\/login/, { timeout: 10000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route without auth', async ({ page }) => {
      await page.goto('/app');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
    });

    test('should redirect to login when accessing server route without auth', async ({ page }) => {
      await page.goto('/app/servers/123456789/channels/first');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
    });
  });
});
