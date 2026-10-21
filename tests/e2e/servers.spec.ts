/**
 * Server Management E2E Tests
 * Tests server CRUD operations, channels, members for the new FreedomTalk layout
 */

import { test, expect, createTestServer, createServerViaUI } from '../fixtures';

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

      // Look for the add server button (plus icon in the server rail)
      const addServerButton = authenticatedPage
        .locator('button[aria-label="Add a Server"], button[aria-label="Add server"]')
        .first();
      await expect(addServerButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Server Creation', () => {
    test('should open create server modal', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/app');

      // Click add server button
      const addServer = authenticatedPage
        .locator('button[aria-label="Add a Server"], button[aria-label="Add server"]')
        .first();
      await expect(addServer).toBeVisible({ timeout: 10000 });
      await addServer.click();

      // Modal should appear (overlay + panel both match loose selectors)
      const modal = authenticatedPage.getByRole('dialog', { name: /create a server/i });
      await expect(modal).toBeVisible({ timeout: 5000 });
    });

    test('should create a new server successfully', async ({ authenticatedPage }) => {
      const server = createTestServer();
      await createServerViaUI(authenticatedPage, server.name);
    });

    test('should navigate to server after creation', async ({ authenticatedPage }) => {
      const server = createTestServer();
      await createServerViaUI(authenticatedPage, server.name);

      // Should be on the new server's channel view
      await expect(authenticatedPage).toHaveURL(/\/servers\//, { timeout: 10000 });
    });
  });

  test.describe('Server Navigation', () => {
    test('should navigate to existing server from sidebar', async ({ authenticatedPage }) => {
      const server = createTestServer();
      await createServerViaUI(authenticatedPage, server.name);

      // Back to home, then re-enter via the server rail icon
      const acronym = server.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3);
      await authenticatedPage.locator('button[aria-label="Home"]').click();
      await expect(authenticatedPage).toHaveURL(/\/app$/, { timeout: 10000 });

      const serverIcon = authenticatedPage.locator('nav button').filter({ hasText: acronym }).first();
      await expect(serverIcon).toBeVisible({ timeout: 10000 });
      await serverIcon.click();
      await expect(authenticatedPage).toHaveURL(/\/servers\//, { timeout: 10000 });
    });

    test('should show channel list when server is selected', async ({ authenticatedPage }) => {
      const server = createTestServer();
      await createServerViaUI(authenticatedPage, server.name);

      // Channel list should be visible
      const channelList = authenticatedPage.locator('text=/general/i');
      await expect(channelList.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Channel Management', () => {
    test('should show create channel button', async ({ authenticatedPage }) => {
      const server = createTestServer();
      await createServerViaUI(authenticatedPage, server.name);

      // The server header dropdown carries the Create Channel action
      const serverHeader = authenticatedPage
        .locator('nav button')
        .filter({ hasText: server.name })
        .first();
      await expect(serverHeader).toBeVisible({ timeout: 10000 });
      await serverHeader.click();
      await expect(
        authenticatedPage.getByRole('menuitem', { name: 'Create Channel' })
      ).toBeVisible({ timeout: 5000 });
      await authenticatedPage.keyboard.press('Escape');
    });
  });

  test.describe('Member List', () => {
    test('should display member list when viewing channel', async ({ authenticatedPage }) => {
      const server = createTestServer();
      await createServerViaUI(authenticatedPage, server.name);

      // Member list column is visible on the right of the channel view
      const membersColumn = authenticatedPage.getByText('Members', { exact: true }).first();
      await expect(membersColumn).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Home Navigation', () => {
    test('should navigate to home when clicking home button', async ({ authenticatedPage }) => {
      const server = createTestServer();
      await createServerViaUI(authenticatedPage, server.name);

      // Click home button -> back to the friends/home view
      await authenticatedPage.click('button[aria-label="Home"]');
      await expect(authenticatedPage).toHaveURL(/\/app$/, { timeout: 10000 });
    });
  });
});
