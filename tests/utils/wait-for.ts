/**
 * Custom wait helpers for Playwright tests
 */

import { Page, Locator } from '@playwright/test';

/**
 * Wait for a specific condition to be true
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 30000, interval = 500 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Wait for element to be visible
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: { timeout?: number } = {}
): Promise<Locator> {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'visible', ...options });
  return locator;
}

/**
 * Wait for element to be hidden
 */
export async function waitForElementHidden(
  page: Page,
  selector: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const locator = page.locator(selector);
  await locator.waitFor({ state: 'hidden', ...options });
}

/**
 * Wait for URL to match pattern
 */
export async function waitForURL(
  page: Page,
  pattern: RegExp | string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 30000 } = options;

  await page.waitForURL(pattern, { timeout });
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 30000 } = options;

  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for text to appear in element
 */
export async function waitForText(
  page: Page,
  selector: string,
  text: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 30000 } = options;

  const locator = page.locator(selector).filter({ hasText: text });
  await locator.waitFor({ state: 'visible', timeout });
}

/**
 * Wait for any of multiple selectors to appear
 */
export async function waitForAny(
  page: Page,
  selectors: string[],
  options: { timeout?: number } = {}
): Promise<string> {
  const { timeout = 30000 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        return selector;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(
    `None of the selectors appeared within ${timeout}ms: ${selectors.join(', ')}`
  );
}

/**
 * Wait for WebSocket to be connected
 */
export async function waitForWebSocket(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;

  await page.waitForFunction(
    () => {
      // Check for socket connection
      return (window as any).__SOCKET_CONNECTED__ === true;
    },
    { timeout }
  ).catch(() => {
    // Socket might be connected differently, continue
  });
}

/**
 * Retry an action until it succeeds or times out
 */
export async function retryAction<T>(
  action: () => Promise<T>,
  options: { timeout?: number; interval?: number } = {}
): Promise<T> {
  const { timeout = 30000, interval = 1000 } = options;
  const startTime = Date.now();
  let lastError: Error | null = null;

  while (Date.now() - startTime < timeout) {
    try {
      return await action();
    } catch (error) {
      lastError = error as Error;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  throw lastError || new Error(`Action failed within ${timeout}ms`);
}

/**
 * Wait for API response with specific status
 */
export async function waitForAPIResponse(
  page: Page,
  urlPattern: RegExp | string,
  options: { status?: number; timeout?: number } = {}
): Promise<void> {
  const { status = 200, timeout = 30000 } = options;

  await page.waitForResponse(
    (response) => {
      const urlMatch =
        typeof urlPattern === 'string'
          ? response.url().includes(urlPattern)
          : urlPattern.test(response.url());
      return urlMatch && response.status() === status;
    },
    { timeout }
  );
}
