import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/test-ui/e2e',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'test-runner/playwright-test-ui-report' }]],
  use: {
    baseURL: 'http://localhost:3999',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 8000,
    navigationTimeout: 15000,
  },
  timeout: 20000,
  expect: { timeout: 5000 },
  projects: [{ name: 'test-ui', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx serve tests/test-ui -l 3999',
    url: 'http://localhost:3999',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
