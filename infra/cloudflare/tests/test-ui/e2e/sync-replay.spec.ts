import { test, expect } from '@playwright/test';

const TEST_UI_PORT = 3999;
const WORKER_PORT = 8787;
const BASE_URL = `http://localhost:${TEST_UI_PORT}`;
const API_BASE = `http://localhost:${WORKER_PORT}`;

test.describe('Sync & Replay (Plan B) via Test UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}?apiBase=${encodeURIComponent(API_BASE)}`);
    await expect(page.getByTestId('section-config')).toBeVisible();
  });

  test('sync replay section is visible', async ({ page }) => {
    await expect(page.getByTestId('section-sync-replay')).toBeVisible();
  });

  test('sync health returns status object', async ({ page }) => {
    await page.getByTestId('btn-sync-health').click();
    await expect(page.getByTestId('sync-replay-result')).toContainText(/ok|status|healthy|error/, { timeout: 5000 });
  });

  test('replay get by match id shows result or error', async ({ page }) => {
    await page.getByTestId('input-replay-match-id').fill('no-such-match-999');
    await page.getByTestId('btn-replay-get').click();
    await expect(page.getByTestId('sync-replay-result')).toContainText(/replay|events|error|404|Invalid/, { timeout: 5000 });
  });
});
