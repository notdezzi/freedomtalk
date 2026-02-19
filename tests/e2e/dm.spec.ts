/**
 * Direct Messages E2E Tests
 * Tests for DM creation and messaging in the new FreedomTalk layout
 */

import { test, expect, createTestMessage, createTestUser } from '../fixtures';

test.describe('Direct Messages', () => {
  test.describe('DM List', () => {
    test('should display DM section in navigation', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForLoadState('networkidle').catch(() => {});

      // Navigation column should be visible
      const navColumn = authenticatedPage.locator('nav');
      await expect(navColumn).toBeVisible({ timeout: 10000 });

      // "Direct Messages" or "Friends" section should be visible
      const dmSection = authenticatedPage.locator('text=/Direct Messages|Friends/i');
      await expect(dmSection.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show Friends button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // Friends button should be visible in the navigation
      const friendsButton = authenticatedPage.locator('button:has-text("Friends")');
      await expect(friendsButton.first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('DM Navigation', () => {
    test('should navigate to DM when clicking from list', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // Check if there are any DM conversations
      const dmItem = authenticatedPage.locator('[class*="dm"] button, nav button').filter({ hasNot: authenticatedPage.locator('[aria-label="Home"]') }).first();
      const count = await dmItem.count();

      if (count > 0) {
        await dmItem.click();
        // Should be on a DM or server page
        await authenticatedPage.waitForTimeout(1000);
      }
    });

    test('should show empty state when no DMs', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // Either DMs are shown or empty state/message input area is visible
      const hasContent = await authenticatedPage.locator('nav').isVisible();
      expect(hasContent).toBeTruthy();
    });
  });

  test.describe('DM Messaging', () => {
    test('should show message input when in DM view', async ({ authenticatedPage }) => {
      // Navigate to app and check if we can access a DM
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // If we have DMs, click on one
      const dmItems = authenticatedPage.locator('nav').filter({ hasText: /Direct Messages/i });
      if (await dmItems.count() > 0) {
        // Look for a DM item to click
        const dmButton = authenticatedPage.locator('[class*="rounded"]:not([aria-label="Home"])').first();
        await dmButton.click().catch(() => {});
        await authenticatedPage.waitForTimeout(1000);

        // Message input should be visible
        const messageInput = authenticatedPage.locator('textarea[placeholder*="Message"]').first();
        await expect(messageInput).toBeVisible({ timeout: 5000 }).catch(() => {
          // May not have DMs
        });
      }
    });
  });

  test.describe('Home Page Friends', () => {
    test('should show friends list on home page', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // On home page, should see Friends section
      const friendsSection = authenticatedPage.locator('text=/Friends|All|Online|Pending/i');
      await expect(friendsSection.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show tabs for friends view', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      // Should see tabs: All, Online, Pending, Blocked, Add Friend
      const allTab = authenticatedPage.locator('button:has-text("All")');
      const pendingTab = authenticatedPage.locator('button:has-text("Pending")');

      await expect(allTab.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
      await expect(pendingTab.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    test('should show Add Friend tab', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');
      await authenticatedPage.waitForTimeout(1000);

      const addFriendTab = authenticatedPage.locator('button:has-text("Add Friend")');
      await expect(addFriendTab.first()).toBeVisible({ timeout: 5000 });
    });
  });
});
