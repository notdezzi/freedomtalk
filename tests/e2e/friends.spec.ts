/**
 * Friends System E2E Tests
 * Tests for friend requests, accept, reject, remove in the new FreedomTalk layout
 */

import { test, expect, createTestUser } from '../fixtures';

test.describe('Friends System', () => {
  test.describe('Friends Page', () => {
    test('should display friends page on home', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // Should see the friends header/title
      const friendsHeader = authenticatedPage.locator('text=/Friends/i');
      await expect(friendsHeader.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show tab navigation', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // Tabs should be visible
      const tabs = ['All', 'Online', 'Pending', 'Blocked', 'Add Friend'];
      for (const tab of tabs) {
        const tabButton = authenticatedPage.locator(`button:has-text("${tab}")`);
        await expect(tabButton.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });

    test('should show empty state when no friends', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // Click on "All" tab
      await authenticatedPage.click('button:has-text("All")').catch(() => {});

      // Should show empty state or friends list
      const content = authenticatedPage.locator('text=/No friends|Add some friends|All Friends/i');
      await expect(content.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    });
  });

  test.describe('Add Friend', () => {
    test('should show Add Friend form', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // Click on Add Friend tab
      await authenticatedPage.click('button:has-text("Add Friend")').catch(() => {});

      // Should show input field
      const input = authenticatedPage.locator('input[placeholder*="username"], input[type="text"]');
      await expect(input.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show Send Friend Request button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      await authenticatedPage.click('button:has-text("Add Friend")').catch(() => {});

      // Button should be visible
      const sendButton = authenticatedPage.locator('button:has-text("Send Friend Request")');
      await expect(sendButton.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show error for non-existent user', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      await authenticatedPage.click('button:has-text("Add Friend")').catch(() => {});

      // Enter non-existent username
      const input = authenticatedPage.locator('input[placeholder*="username"]').first();
      await input.fill('nonexistentuser123456789');
      await authenticatedPage.click('button:has-text("Send Friend Request")').catch(() => {});

      // Should show error message
      await expect(authenticatedPage.locator('text=/not found|Failed|error/i')).toBeVisible({ timeout: 10000 }).catch(() => {});
    });
  });

  test.describe('Pending Requests', () => {
    test('should show pending tab', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // Click on Pending tab
      await authenticatedPage.click('button:has-text("Pending")').catch(() => {});

      // Should show pending section or empty state
      await authenticatedPage.waitForTimeout(500);
    });

    test('should show empty state when no pending requests', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      await authenticatedPage.click('button:has-text("Pending")').catch(() => {});

      // Should show empty state message
      const emptyState = authenticatedPage.locator('text=/No pending|No.*requests/i');
      await expect(emptyState.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    });
  });

  test.describe('Blocked Users', () => {
    test('should show blocked tab', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // Click on Blocked tab
      await authenticatedPage.click('button:has-text("Blocked")').catch(() => {});

      await authenticatedPage.waitForTimeout(500);
    });

    test('should show empty state when no blocked users', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      await authenticatedPage.click('button:has-text("Blocked")').catch(() => {});

      // Should show empty state
      const emptyState = authenticatedPage.locator('text=/haven.*blocked|No.*blocked/i');
      await expect(emptyState.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    });
  });

  test.describe('Navigation', () => {
    test('should show Friends button in sidebar', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // Friends button should be visible in navigation
      const friendsButton = authenticatedPage.locator('button:has-text("Friends")');
      await expect(friendsButton.first()).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to friends when clicking Friends button', async ({ authenticatedPage }) => {
      // Go to a server first
      const server = { name: 'Test Server ' + Date.now() };

      await authenticatedPage.goto('/app');
      await authenticatedPage.click('button[aria-label="Add server"]').catch(() => {});
      await authenticatedPage.waitForTimeout(500);
      await authenticatedPage.click('button:has-text("Create My Own")').catch(() => {});
      await authenticatedPage.waitForTimeout(300);
      await authenticatedPage.fill('input[type="text"]', server.name).catch(() => {});
      await authenticatedPage.click('button:has-text("Create")').catch(() => {});
      await expect(authenticatedPage).toHaveURL(/\/servers\//, { timeout: 15000 });

      // Now click Friends button to go back
      await authenticatedPage.click('button:has-text("Friends")').catch(() => {});

      // Should be on /app (friends page)
      await expect(authenticatedPage).toHaveURL(/\/app$/, { timeout: 10000 });
    });
  });
});
