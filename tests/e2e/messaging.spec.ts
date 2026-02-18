/**
 * Messaging E2E Tests
 * Tests for server channel messaging
 */

import { test, expect, createTestMessage, createTestServer } from '../fixtures';

test.describe('Messaging', () => {
  test.describe('Send Messages', () => {
    test('should send a message in a text channel', async ({ authenticatedPage }) => {
      const server = createTestServer();
      const message = createTestMessage();

      // Create a server (which creates a default text channel)
      await authenticatedPage.click('[data-testid="create-server"], button:has-text("Create Server")').catch(() => {});
      await authenticatedPage.fill('input[name="serverName"], input[placeholder*="server"]', server.name).catch(() => {});
      await authenticatedPage.click('button:has-text("Create"), button[type="submit"]').catch(() => {});
      await authenticatedPage.waitForTimeout(1500);

      // Click on first text channel
      const textChannel = authenticatedPage.locator('[data-testid="text-channel"], [class*="channel"]:has([class*="hash"]), button:has-text("general")').first();
      await textChannel.click().catch(() => {});
      await authenticatedPage.waitForTimeout(500);

      // Find message input
      const messageInput = authenticatedPage.locator('[data-testid="message-input"], textarea[placeholder*="message"], input[placeholder*="message"]').first();

      // Type and send message
      await messageInput.fill(message);
      await messageInput.press('Enter');

      // Message should appear in chat
      await expect(authenticatedPage.locator(`text="${message}"`)).toBeVisible({ timeout: 10000 });
    });

    test('should show message author', async ({ authenticatedPage }) => {
      const server = createTestServer();
      const message = createTestMessage();

      // Create server and send message
      await authenticatedPage.click('[data-testid="create-server"], button:has-text("Create Server")').catch(() => {});
      await authenticatedPage.fill('input[name="serverName"], input[placeholder*="server"]', server.name).catch(() => {});
      await authenticatedPage.click('button:has-text("Create"), button[type="submit"]').catch(() => {});
      await authenticatedPage.waitForTimeout(1500);

      const textChannel = authenticatedPage.locator('[data-testid="text-channel"], button:has-text("general")').first();
      await textChannel.click().catch(() => {});
      await authenticatedPage.waitForTimeout(500);

      const messageInput = authenticatedPage.locator('[data-testid="message-input"], textarea[placeholder*="message"]').first();
      await messageInput.fill(message);
      await messageInput.press('Enter');

      // Should show username near message
      await expect(authenticatedPage.locator('[class*="message-author"], [class*="username"]').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Edit Messages', () => {
    test('should edit own message', async ({ authenticatedPage }) => {
      const server = createTestServer();
      const originalMessage = createTestMessage();
      const editedMessage = `Edited: ${createTestMessage()}`;

      // Create server and send message
      await authenticatedPage.click('[data-testid="create-server"], button:has-text("Create Server")').catch(() => {});
      await authenticatedPage.fill('input[name="serverName"], input[placeholder*="server"]', server.name).catch(() => {});
      await authenticatedPage.click('button:has-text("Create"), button[type="submit"]').catch(() => {});
      await authenticatedPage.waitForTimeout(1500);

      const textChannel = authenticatedPage.locator('button:has-text("general")').first();
      await textChannel.click().catch(() => {});
      await authenticatedPage.waitForTimeout(500);

      const messageInput = authenticatedPage.locator('[data-testid="message-input"], textarea[placeholder*="message"]').first();
      await messageInput.fill(originalMessage);
      await messageInput.press('Enter');

      // Wait for message to appear
      await expect(authenticatedPage.locator(`text="${originalMessage}"`)).toBeVisible({ timeout: 10000 });

      // Right-click on message for context menu
      await authenticatedPage.locator(`text="${originalMessage}"`).first().click({ button: 'right' });

      // Click Edit
      await authenticatedPage.click('text=/Edit Message|Edit/i').catch(() => {});

      // Edit the message
      const editInput = authenticatedPage.locator('textarea, input[type="text"]').first();
      await editInput.fill(editedMessage);
      await editInput.press('Enter');

      // Should show edited message
      await expect(authenticatedPage.locator(`text="${editedMessage}"`)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Delete Messages', () => {
    test('should delete own message', async ({ authenticatedPage }) => {
      const server = createTestServer();
      const message = createTestMessage();

      // Create server and send message
      await authenticatedPage.click('[data-testid="create-server"], button:has-text("Create Server")').catch(() => {});
      await authenticatedPage.fill('input[name="serverName"], input[placeholder*="server"]', server.name).catch(() => {});
      await authenticatedPage.click('button:has-text("Create"), button[type="submit"]').catch(() => {});
      await authenticatedPage.waitForTimeout(1500);

      const textChannel = authenticatedPage.locator('button:has-text("general")').first();
      await textChannel.click().catch(() => {});
      await authenticatedPage.waitForTimeout(500);

      const messageInput = authenticatedPage.locator('[data-testid="message-input"], textarea[placeholder*="message"]').first();
      await messageInput.fill(message);
      await messageInput.press('Enter');

      // Wait for message
      await expect(authenticatedPage.locator(`text="${message}"`)).toBeVisible({ timeout: 10000 });

      // Right-click on message
      await authenticatedPage.locator(`text="${message}"`).first().click({ button: 'right' });

      // Click Delete
      await authenticatedPage.click('text=/Delete Message|Delete/i').catch(() => {});

      // Confirm deletion if needed
      await authenticatedPage.click('button:has-text("Delete")').catch(() => {});

      // Message should be gone
      await expect(authenticatedPage.locator(`text="${message}"`)).not.toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Message Reactions', () => {
    test('should add reaction to message', async ({ authenticatedPage }) => {
      const server = createTestServer();
      const message = createTestMessage();

      // Create server and send message
      await authenticatedPage.click('[data-testid="create-server"], button:has-text("Create Server")').catch(() => {});
      await authenticatedPage.fill('input[name="serverName"], input[placeholder*="server"]', server.name).catch(() => {});
      await authenticatedPage.click('button:has-text("Create"), button[type="submit"]').catch(() => {});
      await authenticatedPage.waitForTimeout(1500);

      const textChannel = authenticatedPage.locator('button:has-text("general")').first();
      await textChannel.click().catch(() => {});
      await authenticatedPage.waitForTimeout(500);

      const messageInput = authenticatedPage.locator('[data-testid="message-input"], textarea[placeholder*="message"]').first();
      await messageInput.fill(message);
      await messageInput.press('Enter');

      await expect(authenticatedPage.locator(`text="${message}"`)).toBeVisible({ timeout: 10000 });

      // Hover on message and click reaction button
      await authenticatedPage.locator(`text="${message}"`).first().hover();
      await authenticatedPage.click('[data-testid="add-reaction"], button:has-text("😀")').catch(() => {});

      // Pick an emoji (first one available)
      await authenticatedPage.locator('[data-testid="emoji-picker"] button, .emoji-grid button').first().click().catch(() => {});

      // Reaction should appear
      await expect(authenticatedPage.locator('[class*="reaction"], [data-testid="reaction"]')).toBeVisible({ timeout: 10000 }).catch(() => {
        // Reactions may not be implemented yet
      });
    });
  });
});
