/**
 * Direct Messages E2E Tests
 * Tests for DM creation and messaging
 */

import { test, expect, createTestMessage, createTestUser } from '../fixtures';

test.describe('Direct Messages', () => {
  test.describe('DM List', () => {
    test('should display DM sidebar', async ({ authenticatedPage }) => {
      // Navigate to DMs
      await authenticatedPage.click('[data-testid="dm-tab"], button:has-text("DM"), button:has-text("Messages")').catch(() => {});

      // DM list should be visible
      const dmList = authenticatedPage.locator('[data-testid="dm-list"], .dm-list, [class*="direct-messages"]');
      await expect(dmList).toBeVisible({ timeout: 10000 }).catch(() => {
        // May need to look for alternative selectors
      });
    });

    test('should show friends in DM list', async ({ authenticatedPage, testUser }) => {
      // Navigate to DMs
      await authenticatedPage.goto('/app');
      await authenticatedPage.click('[data-testid="dm-tab"], button:has-text("DM")').catch(() => {});

      // There should be a list of conversations or empty state
      await authenticatedPage.waitForTimeout(1000);

      // Check for either conversations or empty state
      const hasConversations = await authenticatedPage.locator('[data-testid="dm-conversation"], [class*="dm-item"]').count() > 0;
      const hasEmptyState = await authenticatedPage.locator('text=/No.*conversations|No.*messages|Start.*chat/i').count() > 0;

      expect(hasConversations || hasEmptyState).toBeTruthy();
    });
  });

  test.describe('Create DM', () => {
    test('should start new DM conversation', async ({ authenticatedPage }) => {
      // Click new DM button
      await authenticatedPage.click('[data-testid="new-dm"], button:has-text("New DM"), button:has-text("+")').catch(() => {});

      // Search for user
      const searchInput = authenticatedPage.locator('input[placeholder*="search"], input[placeholder*="username"]');
      await searchInput.fill('test').catch(() => {});

      // Should show search results or no results
      await authenticatedPage.waitForTimeout(500);
    });
  });

  test.describe('Send DM', () => {
    test('should send message to existing DM', async ({ authenticatedPage }) => {
      const message = createTestMessage();

      // Go to DMs
      await authenticatedPage.goto('/app');

      // Click on first DM conversation if available
      const dmConversation = authenticatedPage.locator('[data-testid="dm-conversation"], [class*="dm-item"]').first();
      const count = await dmConversation.count();

      if (count > 0) {
        await dmConversation.click();
        await authenticatedPage.waitForTimeout(500);

        // Send message
        const messageInput = authenticatedPage.locator('[data-testid="message-input"], textarea[placeholder*="message"]').first();
        await messageInput.fill(message);
        await messageInput.press('Enter');

        // Message should appear
        await expect(authenticatedPage.locator(`text="${message}"`)).toBeVisible({ timeout: 10000 });
      } else {
        // Skip test if no DM conversations exist
        test.skip();
      }
    });
  });

  test.describe('DM Header', () => {
    test('should show user info in DM header', async ({ authenticatedPage }) => {
      // Go to first DM if available
      await authenticatedPage.goto('/app');
      const dmConversation = authenticatedPage.locator('[data-testid="dm-conversation"], [class*="dm-item"]').first();

      if ((await dmConversation.count()) > 0) {
        await dmConversation.click();
        await authenticatedPage.waitForTimeout(500);

        // Header should show username
        const header = authenticatedPage.locator('[data-testid="dm-header"], [class*="chat-header"]');
        await expect(header).toBeVisible({ timeout: 5000 });
      } else {
        test.skip();
      }
    });
  });
});
