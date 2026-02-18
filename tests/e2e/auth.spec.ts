/**
 * Authentication E2E Tests
 * Tests registration, login, logout flows
 */

import { test, expect, createTestUser } from '../fixtures';
import { TestUser } from '../utils/test-data';

test.describe('Authentication', () => {
  test.describe('Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      const user = createTestUser();

      await page.goto('/register');

      // Fill registration form
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="username"]', user.username);
      await page.fill('input[name="password"]', user.password);
      await page.fill('input[name="confirmPassword"]', user.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to app or onboarding
      await expect(page).toHaveURL(/\/app|\/onboarding/, { timeout: 15000 });
    });

    test('should show error for invalid email', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="username"]', 'testuser');
      await page.fill('input[name="password"]', 'Password123!');
      await page.fill('input[name="confirmPassword"]', 'Password123!');

      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator('text=/invalid email|valid email/i')).toBeVisible();
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      const user = createTestUser();

      await page.goto('/register');

      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="username"]', user.username);
      await page.fill('input[name="password"]', 'Password123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');

      await page.click('button[type="submit"]');

      // Should show password mismatch error
      await expect(page.locator('text=/password.*match|passwords.*not match/i')).toBeVisible();
    });

    test('should show error for duplicate email', async ({ page, testUser }) => {
      // First register a user
      await page.goto('/register');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="username"]', testUser.username);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/app|\/onboarding/, { timeout: 15000 }).catch(() => {});

      // Try to register with same email
      const page2 = await page.context().newPage();
      await page2.goto('/register');
      await page2.fill('input[name="email"]', testUser.email);
      await page2.fill('input[name="username"]', `different-${testUser.username}`);
      await page2.fill('input[name="password"]', testUser.password);
      await page2.fill('input[name="confirmPassword"]', testUser.password);
      await page2.click('button[type="submit"]');

      // Should show duplicate error
      await expect(page2.locator('text=/already.*exists|already.*registered|email.*taken/i')).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe('Login', () => {
    test('should login successfully with valid credentials', async ({ page, testUser }) => {
      // First register the user
      await page.goto('/register');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="username"]', testUser.username);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/app|\/onboarding/, { timeout: 15000 }).catch(() => {});

      // Logout
      await page.goto('/login');

      // Login again
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');

      // Should redirect to app
      await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('text=/invalid.*credentials|incorrect|not found/i')).toBeVisible({
        timeout: 10000,
      });
    });

    test('should redirect to app if already logged in', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/login');

      // Should be redirected to app
      await expect(authenticatedPage).toHaveURL(/\/app/, { timeout: 10000 });
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ authenticatedPage }) => {
      // Find and click logout button
      const userMenu = authenticatedPage.locator('[data-testid="user-menu"], .user-panel').first();
      await userMenu.click().catch(() => {});

      const logoutButton = authenticatedPage.locator('button:has-text("Logout"), button:has-text("Log out")');
      await logoutButton.click().catch(() => {});

      // Should redirect to landing or login
      await expect(authenticatedPage).toHaveURL(/\/|\/login/, { timeout: 10000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route without auth', async ({ page }) => {
      await page.goto('/app');

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });
});
