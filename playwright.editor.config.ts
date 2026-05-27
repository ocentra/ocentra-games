import { defineConfig, devices } from '@playwright/test';
import { resolveEditorWebBaseUrl, resolveEditorWebPort } from './scripts/dev/dev-port-config';

const editorPort = resolveEditorWebPort();
const editorBaseUrl = resolveEditorWebBaseUrl(editorPort);

export default defineConfig({
  testDir: 'packages/asset-editor',
  testMatch: /__tests__\/e2e\/.*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: editorBaseUrl,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 20000,
  },
  timeout: 35000,
  expect: { timeout: 8000 },
  projects: [
    {
      name: 'editor-e2e',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:editor:e2e',
    url: editorBaseUrl,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === '1',
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
