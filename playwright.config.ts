import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for FreedomTalk E2E and API testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests',

  // Run tests in parallel (but not fullyParallel to avoid rate limiting issues)
  fullyParallel: false,

  // Fail build on CI if you accidentally left test.only in source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Parallel workers (limited on CI and locally to avoid rate limiting)
  workers: process.env.CI ? 1 : 2,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // Global test settings
  use: {
    // Base URL for tests
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,

    // Extra HTTP headers for all requests
    extraHTTPHeaders: {
      // Add a header to identify test requests (can be used to skip rate limiting)
      'X-Test-Request': 'true',
    },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'api',
      testMatch: /api\/.*\.spec\.ts/,
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3001',
      },
    },
    {
      name: 'e2e-chromium',
      testMatch: /e2e\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
      dependencies: ['api'],
    },
    // Firefox only on main branch (CI)
    ...(process.env.CI && process.env.GITHUB_REF === 'refs/heads/main'
      ? [
          {
            name: 'e2e-firefox',
            testMatch: /e2e\/.*\.spec\.ts/,
            use: {
              ...devices['Desktop Firefox'],
              viewport: { width: 1280, height: 720 },
            },
            dependencies: ['api'],
          },
        ]
      : []),
  ],

  // Global setup and teardown
  globalSetup: './tests/setup/global-setup.ts',
  globalTeardown: './tests/setup/global-teardown.ts',

  // Web server for E2E tests
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: 'SKIP_RATE_LIMIT=true npm run dev --workspace=@freedomtalk/api',
          port: 3001,
          timeout: 120000,
          // Don't reuse existing server to ensure rate limiting is disabled
          reuseExistingServer: false,
          env: {
            // High rate limit for tests
            RATE_LIMIT_MAX: '10000',
            // Skip route-level rate limits
            SKIP_RATE_LIMIT: 'true',
          },
        },
        {
          command: 'npm run dev --workspace=@freedomtalk/web',
          port: 3000,
          timeout: 120000,
          reuseExistingServer: !process.env.CI,
        },
      ],

  // Test timeout
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Output directory
  outputDir: 'test-results/artifacts',
});
