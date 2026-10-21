/**
 * Voice channel E2E — two users join the same server voice channel (mediasoup SFU).
 *
 * Required environment (provided by the main session / playwright.config.ts):
 *   - Web client on baseURL (http://localhost:3000, `E2E_BASE_URL` to override).
 *   - API on :3001 with mediasoup enabled: infra up (`docker-compose up -d`),
 *     migrations applied (tests/setup/global-setup.ts does this), and the API
 *     started with MEDIASOUP_* env so `voice:join` signaling works. Mediasoup
 *     workers bind UDP 40000-49999 on the host.
 *   - No pre-seeded credentials are used: both users self-register through the
 *     real UI (tests/fixtures completeAuthFlow), so nothing needs to exist in
 *     the database beforehand. Chromium fake-media flags make getUserMedia
 *     resolve without a physical microphone.
 *
 * Flow (serial — every step depends on the previous one):
 *   A registers/logs in -> creates a server -> creates a unique voice channel
 *   -> creates an invite -> joins voice.
 *   B registers/logs in -> joins via the invite link -> joins the same channel.
 *   Both see 2 participants; B leaves; A sees them gone.
 */

import { test, expect, createTestUser, completeAuthFlow } from '../fixtures';
import type { Page } from '@playwright/test';
import type { TestUser } from '../utils/test-data';

// launchOptions must be top-level (nested test.use that forces a new worker
// is rejected by Playwright); the flags make getUserMedia resolve headlessly
test.use({
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  },
});

test.describe('Voice channel', () => {
  test.describe.configure({ mode: 'serial' });

  // Chromium-only: the fake media flags above are Chromium launch args.
  test.skip(({ browserName }) => browserName !== 'chromium', 'Uses Chromium fake-media launch flags');

  test('two users join a voice channel, see each other, and one leaves', async ({ browser }) => {
    test.setTimeout(360_000);

    const userA: TestUser = createTestUser();
    const userB: TestUser = createTestUser();
    const serverName = `Voice E2E ${Date.now()}`;
    const channelName = `voice-e2e-${Date.now()}`;

    // Two independent browser contexts, mic permission granted (fake device
    // supplies the actual stream).
    const ctxA = await browser.newContext({
      permissions: ['microphone'],
      viewport: { width: 1280, height: 720 },
    });
    const ctxB = await browser.newContext({
      permissions: ['microphone'],
      viewport: { width: 1280, height: 720 },
    });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      // -------------------------------------------------------------- auth
      await completeAuthFlow(pageA, userA);
      await completeAuthFlow(pageB, userB);

      // ------------------------------------------- A: create server + voice channel
      await pageA.goto('/app');
      const addServer = pageA.locator(
        'button[aria-label="Add a Server"], button[aria-label="Add server"]'
      ).first();
      await expect(addServer).toBeVisible({ timeout: 15_000 });
      await addServer.click();
      await pageA.getByRole('button', { name: 'Create My Own' }).click();
      await pageA.locator('input[placeholder="My Awesome Server"]').fill(serverName);
      await pageA.getByRole('button', { name: 'Create', exact: true }).click();

      // Navigates to /app/servers/<id>/channels/first -> auto-redirects to general
      await expect(pageA).toHaveURL(/\/app\/servers\/\d+\/channels\/(first|\d+)/, {
        timeout: 20_000,
      });

      // Server header dropdown -> Create Channel (owner can manage channels).
      // Dev-mode Turbopack can hot/full-reload mid-interaction (observed as
      // "element was detached" or the open menu closing), so re-open the
      // dropdown and retry the item click instead of flaking.
      const serverHeader = pageA.locator('nav button').filter({ hasText: serverName }).first();
      await expect(serverHeader).toBeVisible({ timeout: 15_000 });
      const clickMenuItem = async (page: Page, label: string) => {
        await expect(async () => {
          const item = page.getByRole('menuitem', { name: label });
          if ((await item.count()) === 0) {
            await serverHeader.click();
          }
          await item.click({ timeout: 2_000 });
        }).toPass({ timeout: 30_000 });
      };
      await clickMenuItem(pageA, 'Create Channel');

      // Create Channel modal: pick "Voice" type, unique name, submit
      const channelModal = pageA.locator('[role="dialog"]').first();
      await expect(channelModal).toBeVisible({ timeout: 10_000 });
      await channelModal.locator('button', { hasText: 'Voice' }).first().click();
      await channelModal.locator('input[placeholder="General"]').fill(channelName);
      await channelModal.locator('button[type="submit"]', { hasText: 'Create Channel' }).click();

      // The new voice channel appears in the sidebar (Voice2 icon + name button)
      const voiceChannelButton = pageA.locator('nav button').filter({ hasText: channelName }).first();
      await expect(voiceChannelButton).toBeVisible({ timeout: 15_000 });

      // ------------------------------------------------ A: create an invite
      await clickMenuItem(pageA, 'Invite People');
      const inviteModal = pageA.locator('[role="dialog"]').first();
      await expect(inviteModal).toBeVisible({ timeout: 10_000 });
      await inviteModal.getByRole('button', { name: 'Quick Create' }).click();
      const codeEl = inviteModal.locator('code').first();
      await expect(codeEl).toBeVisible({ timeout: 15_000 });
      const inviteCode = ((await codeEl.textContent()) || '').trim();
      expect(inviteCode.length).toBeGreaterThan(3);
      await pageA.keyboard.press('Escape');
      await expect(inviteModal).not.toBeVisible({ timeout: 10_000 });

      // ------------------------------------------- A: join the voice channel
      // Clicking a voice channel connects mediasoup in place (no navigation).
      // Once connected, the main area renders VoiceGridView with "N users".
      // A dead/reconnecting socket can swallow the first voice:join, so
      // re-click until A's own voice view is up.
      await expect(async () => {
        if ((await pageA.locator('button[title="Disconnect"], button[title="Leave Voice"]').count()) > 0) {
          return; // already connected
        }
        await voiceChannelButton.click();
        await expect(pageA.getByText('1 user', { exact: true })).toBeVisible({ timeout: 10_000 });
      }).toPass({ timeout: 150_000 });
      // Self tile in the grid + disconnect control in the nav voice panel
      await expect(pageA.getByText('You', { exact: true })).toBeVisible({ timeout: 10_000 });
      await expect(pageA.locator('button[title="Disconnect"], button[title="Leave Voice"]').first())
        .toBeVisible({ timeout: 10_000 });

      // ---------------------------------------------- B: join server via invite
      await pageB.goto(`/invite/${inviteCode}`);
      await pageB.getByRole('button', { name: 'Join Server' }).click();
      await expect(pageB).toHaveURL(/\/app\/servers\/\d+\/channels\/(first|\d+)/, {
        timeout: 20_000,
      });

      // ---------------------------------------------- B: join the same channel
      // Same socket-churn guard as A's join: B just navigated via an invite
      // link and the socket may still be reconnecting; re-click until B's
      // own voice view is up.
      const voiceChannelButtonB = pageB
        .locator('nav button')
        .filter({ hasText: channelName })
        .first();
      await expect(voiceChannelButtonB).toBeVisible({ timeout: 15_000 });
      await expect(async () => {
        if ((await pageB.locator('button[title="Disconnect"], button[title="Leave Voice"]').count()) > 0) {
          return; // already connected
        }
        await voiceChannelButtonB.click();
        await expect(pageB.getByText('1 user', { exact: true })).toBeVisible({ timeout: 10_000 });
      }).toPass({ timeout: 150_000 });

      // Both sides converge on 2 participants ("voice:user_joined" -> store)
      await expect(pageB.getByText('2 users', { exact: true })).toBeVisible({
        timeout: 30_000,
      });
      await expect(pageA.getByText('2 users', { exact: true })).toBeVisible({
        timeout: 30_000,
      });
      // A sees B as a participant (grid tile / voice panel / member row)
      await expect(pageA.getByText(userB.username, { exact: true }).first()).toBeVisible({
        timeout: 10_000,
      });
      // B sees A as a remote participant too
      await expect(pageB.getByText(userA.username, { exact: true }).first()).toBeVisible({
        timeout: 10_000,
      });

      // ------------------------------------------------------- B: leave voice
      // Main-area control bar (VoiceControls) or nav panel (VoicePanel) fallback
      const leaveButtonB = pageB
        .locator('button[title="Leave Voice"], button[title="Disconnect"]')
        .first();
      await expect(leaveButtonB).toBeVisible({ timeout: 10_000 });
      await leaveButtonB.click();

      // B is disconnected: voice controls disappear, back to the message view
      await expect(
        pageB.locator('button[title="Leave Voice"], button[title="Disconnect"]')
      ).toHaveCount(0, { timeout: 15_000 });

      // A observes the departure ("voice:user_left" -> count drops)
      await expect(pageA.getByText('1 user', { exact: true })).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
