/**
 * Global teardown for Playwright tests
 * - Cleanup test data
 * - Optionally stop Docker services
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

async function globalTeardown() {
  console.log('🧹 Starting global teardown...');

  // In CI, services are managed by GitHub Actions
  // Locally, we keep services running for faster iteration

  if (process.env.CI) {
    console.log('✅ CI teardown complete (services managed by CI)');
    return;
  }

  // Optionally cleanup test data
  console.log('✅ Global teardown complete');
}

export default globalTeardown;
