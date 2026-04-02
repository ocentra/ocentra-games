import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: /.*\/__tests__\/e2e\/.*\.spec\.ts$/, // Only match e2e .spec.ts files in __tests__/e2e directories
  testIgnore: ['**/.temp/**'],
  fullyParallel: false, // WebRTC tests need sequential execution for proper signaling
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Run tests sequentially for WebRTC (signaling exchange between contexts)
  reporter: [['list']],
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
      name: 'network-e2e',
      testMatch: /.*\/network-domain\/e2e\/.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'assets-e2e',
      testMatch: /.*\/assets\/__tests__\/e2e\/.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'db-e2e',
      testMatch: /.*\/bootstrap\/__tests__\/e2e\/.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'shop-e2e',
      testMatch: /.*\/Shop\/__tests__\/e2e\/.*\.spec\.ts$/,
      timeout: 120000,
      retries: 1,
      use: { ...devices['Desktop Chrome'], navigationTimeout: 90000 },
    },
    {
      name: 'ai-playground-e2e',
      testMatch: /.*\/AIPlayground\/__tests__\/e2e\/.*\.spec\.ts$/,
      timeout: 120000,
      retries: process.env.CI ? 1 : 0,
      use: { ...devices['Desktop Chrome'], navigationTimeout: 90000 },
    },
    {
      name: 'ai-playground-mobile-e2e',
      testMatch: /.*\/AIPlayground\/__tests__\/e2e\/.*\.spec\.ts$/,
      timeout: 120000,
      retries: process.env.CI ? 1 : 0,
      use: { ...devices['Pixel 7'], navigationTimeout: 90000 },
    },
    {
      name: 'db-mobile-e2e',
      testMatch: /.*\/bootstrap\/__tests__\/e2e\/.*\.spec\.ts$/,
      timeout: 180000,
      use: { ...devices['Pixel 7'], actionTimeout: 30000, navigationTimeout: 90000 },
    },
  ],
  webServer: {
    command: 'cross-env VITE_PREVIEW_PORT=3000 npm run dev -- --quick=web-preview-local',
    url: 'http://localhost:3000',
    reuseExistingServer:
      process.env.PLAYWRIGHT_REUSE_SERVER === '0'
        ? false
        : process.env.PLAYWRIGHT_REUSE_SERVER === '1'
          ? true
          : !process.env.CI,
    timeout: 180 * 1000, // Increased timeout for dev server startup
    stdout: 'pipe',
    stderr: 'pipe',
  },
})

