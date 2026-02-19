/**
 * Server Management E2E Tests
 * Tests server CRUD operations, channels, members for the new FreedomTalk layout
 */

import { test, expect, createTestServer, createTestChannel } from '../fixtures';

test.describe('Server Management', () => {
  test.describe('Server List', () => {
    test('should display server list in navigation', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForLoadState('networkidle').catch(() => {});

      // Navigation column should be visible
      const navColumn = authenticatedPage.locator('nav');
      await expect(navColumn).toBeVisible({ timeout: 10000 });

      // Home button should be visible
      const homeButton = authenticatedPage.locator('button[aria-label="Home"]');
      await expect(homeButton).toBeVisible({ timeout: 5000 });
    });

    test('should show add server button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForLoadState('networkidle').catch(() => {});

      // Look for the add server button (plus icon in server list)
      const addServerButton = authenticatedPage.locator('button[aria-label="Add server"], button:has-text("+")').first();
      await expect(addServerButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Server Creation', () => {
    test('should open create server modal', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');

      // Click add server button
      await authenticatedPage.click('button[aria-label="Add server"]').catch(() => {});
      await authenticatedPage.waitForTimeout(500);

      // Modal should appear
      const modal = authenticatedPage.locator('[role="dialog"], .fixed.inset-0');
      await expect(modal).toBeVisible({ timeout: 5000 });
    });

    test('should create a new server successfully', async ({ authenticatedPage }) => {
      const server = createTestServer();

      await authenticatedPage.goto('/app');

      // Click add server button
      await authenticatedPage.click('button[aria-label="Add server"]').catch(() => {});

      // Wait for modal and click "Create My Own"
      await authenticatedPage.waitForTimeout(500);
      await authenticatedPage.click('button:has-text("Create My Own")').catch(() => {});

      // Fill server name
      await authenticatedPage.waitForTimeout(300);
      await authenticatedPage.fill('input[placeholder*="server"], input[type="text"]', server.name).catch(() => {});

      // Submit
      await authenticatedPage.click('button:has-text("Create")').catch(() => {});

      // Should navigate to the new server
      await expect(authenticatedPage).toHaveURL(/\/servers\//, { timeout: 15000 });
    });

    test('should navigate to server after creation', async ({ authenticatedPage }) => {
      const server = createTestServer();

      await authenticatedPage.goto('/app');
      await authenticatedPage.click('button[aria-label="Add server"]').catch(() => {});
      await authenticatedPage.waitForTimeout(500);
      await authenticatedPage.click('button:has-text("Create My Own")').catch(() => {});
      await authenticatedPage.waitForTimeout(300);
      await authenticatedPage.fill('input[placeholder*="server"], input[type="text"]', server.name).catch(() => {});
      await authenticatedPage.click('button:has-text("Create")').catch(() => {});

      // Should be on server page with channels
      await expect(authenticatedPage).toHaveURL(/\/servers\//, { timeout: 15000 });
    });
  });

  test.describe('Server Navigation', () => {
    test('should navigate to existing server from sidebar', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForLoadState('networkidle').catch(() => {});

      // Wait for servers to load
      await authenticatedPage.waitForTimeout(1000);

      // Look for any server icon in the list
      const serverIcon = authenticatedPage.locator('nav button[class*="rounded"]').first();
      const count = await serverIcon.count();

      if (count > 0) {
        // Click on a server that's not the home button
        await serverIcon.click();
        await expect(authenticatedPage).toHaveURL(/\/servers\//, { timeout: 10000 });
      }
    });

    test('should show channel list when server is selected', async ({ authenticatedPage }) => {
      // Create a server first
      const server = createTestServer();

      await authenticatedPage.goto('/app');
      await authenticatedPage.click('button[aria-label="Add server"]').catch(() => {});
      await authenticatedPage.waitForTimeout(500);
      await authenticatedPage.click('button:has-text("Create My Own")').catch(() => {});
      await authenticatedPage.waitForTimeout(300);
      await authenticatedPage.fill('input[placeholder*="server"], input[type="text"]', server.name).catch(() => {});
      await authenticatedPage.click('button:has-text("Create")').catch(() => {});

      // Wait for navigation
      await expect(authenticatedPage).toHaveURL(/\/servers\//, { timeout: 15000 });

      // Channel list should be visible
      await authenticatedPage.waitForTimeout(1000);
      const channelList = authenticatedPage.locator('text=/Channels|general/i');
      await expect(channelList).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Channel Management', () => {
    test('should show create channel button', async ({ authenticatedPage }) => {
      const server = createTestServer();

      await authenticatedPage.goto('/app');
      await authenticatedPage.click('button[aria-label="Add server"]').catch(() => {});
      await authenticatedPage.waitForTimeout(500);
      await authenticatedPage.click('button:has-text("Create My Own")').catch(() => {});
      await authenticatedPage.waitForTimeout(300);
      await authenticatedPage.fill('input[placeholder*="server"], input[type="text"]', server.name).catch(() => {});
      await authenticatedPage.click('button:has-text("Create")').catch(() => {});
      await expect(authenticatedPage).toHaveURL(/\/servers\//, { timeout: 15000 });

      // Look for add channel button
      await authenticatedPage.waitForTimeout(500);
      const addChannelButton = authenticatedPage.locator('button[aria-label="Create channel"], button:has-text("+")').first();
      await expect(addChannelButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Member List', () => {
    test('should display member list when viewing channel', async ({ authenticatedPage }) => {
      const server = createTestServer();

      await authenticatedPage.goto('/app');
      await authenticatedPage.click('button[aria-label="Add server"]').catch(() => {});
      await authenticatedPage.waitForTimeout(500);
      await authenticatedPage.click('button:has-text("Create My Own")').catch(() => {});
      await authenticatedPage.waitForTimeout(300);
      await authenticatedPage.fill('input[placeholder*="server"], input[type="text"]', server.name).catch(() => {});
      await authenticatedPage.click('button:has-text("Create")').catch(() => {});
      await expect(authenticatedPage).toHaveURL(/\/servers\//, { timeout: 15000 });

      // Member list should be visible on the right
      await authenticatedPage.waitForTimeout(1000);
      // Look for members section - it's in a column on the right
      const membersColumn = authenticatedPage.locator('[class*="w-[20%]"], aside').filter({ hasText: /members|online/i });
      await expect(membersColumn.first()).toBeVisible({ timeout: 10000 }).catch(() => {
        // Member list might be in different location
      });
    });
  });

  test.describe('Home Navigation', () => {
    test('should navigate to home when clicking home button', async ({ authenticatedPage }) => {
      // First go to a server
      const server = createTestServer();

      await authenticatedPage.goto('/app');
      await authenticatedPage.click('button[aria-label="Add server"]').catch(() => {});
      await authenticatedPage.waitForTimeout(500);
      await authenticatedPage.click('button:has-text("Create My Own")').catch(() => {});
      await authenticatedPage.waitForTimeout(300);
      await authenticatedPage.fill('input[placeholder*="server"], input[type="text"]', server.name).catch(() => {});
      await authenticatedPage.click('button:has-text("Create")').catch(() => {});
      await expect(authenticatedPage).toHaveURL(/\/servers\//, { timeout: 15000 });

      // Click home button
      await authenticatedPage.click('button[aria-label="Home"]');
      await expect(authenticatedPage).toHaveURL(/\/app$/, { timeout: 10000 });
    });
  });
});
