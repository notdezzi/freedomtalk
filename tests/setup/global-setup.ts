/**
 * Global setup for Playwright tests
 * - Starts Docker services for test environment
 * - Runs database migrations
 * - Waits for services to be ready
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const WAIT_TIMEOUT = 60000;

async function waitForService(url: string, name: string): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < WAIT_TIMEOUT) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✓ ${name} is ready`);
        return;
      }
    } catch {
      // Service not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`${name} did not become ready within ${WAIT_TIMEOUT}ms`);
}

async function runCommand(command: string, args: string[]): Promise<void> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error: unknown) {
    const err = error as { message?: string; stderr?: string };
    console.error(`Command failed: ${command} ${args.join(' ')}`);
    if (err.message) console.error(err.message);
    throw error;
  }
}

async function globalSetup() {
  console.log('🚀 Starting global setup...');

  // In CI, Docker services are started by GitHub Actions
  if (!process.env.CI) {
    // Check if Docker is available
    try {
      await execFileAsync('docker', ['--version']);
    } catch {
      console.log('⚠️ Docker not available, skipping container setup');
      console.log('Make sure to have the dev servers running manually');
      return;
    }

    // Check if Docker services are already running
    let servicesRunning = false;
    try {
      const { stdout } = await execFileAsync('docker', ['compose', 'ps', '--format', 'json']);
      servicesRunning = stdout.includes('freedomtalk') || stdout.length > 10;
    } catch {
      servicesRunning = false;
    }

    if (!servicesRunning) {
      console.log('📦 Starting Docker services...');
      await runCommand('docker-compose', ['up', '-d']);
    } else {
      console.log('✓ Docker services already running');
    }
  }

  // Wait for services to be ready
  console.log('⏳ Waiting for services...');

  const apiUrl = process.env.API_BASE_URL || 'http://localhost:3001';

  // Wait for API
  await waitForService(`${apiUrl}/health`, 'API server');

  // Run migrations if needed
  if (!process.env.CI) {
    console.log('🗄️ Running database migrations...');
    try {
      await runCommand('npm', ['run', 'migrate:latest', '--workspace=@freedomtalk/api']);
    } catch {
      console.log('⚠️ Migrations may have already been applied');
    }
  }

  console.log('✅ Global setup complete');
}

export default globalSetup;
