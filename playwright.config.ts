import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './src/network/__tests__/e2e',
  fullyParallel: false, // WebRTC tests need sequential execution for proper signaling
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests sequentially for WebRTC (signaling exchange between contexts)
  reporter: [
    ['list'], // Show detailed test results in console (one line per test)
    ['html', { open: 'always' }], // Always open HTML report after test run
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 5000, // 5 second timeout for actions
    navigationTimeout: 15000, // 15 second timeout for navigation
  },
  timeout: 15000, // 15 second timeout per test - fail fast if stuck
  expect: {
    timeout: 3000, // 3 second timeout for assertions
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000, // Increased timeout for dev server startup
    stdout: 'pipe',
    stderr: 'pipe',
  },
})

