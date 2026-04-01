import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'packages/asset-editor',
  testMatch: /__tests__\/e2e\/.*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  timeout: 30000,
  expect: { timeout: 8000 },
  projects: [
    {
      name: 'editor-e2e-full',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node scripts/dev/start-editor-e2e-full.mjs',
    url: 'http://localhost:5175',
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
    timeout: 420000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
