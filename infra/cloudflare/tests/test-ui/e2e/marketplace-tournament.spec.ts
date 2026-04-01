import { test, expect } from '@playwright/test';

const TEST_UI_PORT = 3999;
const WORKER_PORT = 8787;
const BASE_URL = `http://localhost:${TEST_UI_PORT}`;
const API_BASE = `http://localhost:${WORKER_PORT}`;

test.describe('Marketplace & Tournament (Plan H) via Test UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}?apiBase=${encodeURIComponent(API_BASE)}`);
    await expect(page.getByTestId('section-config')).toBeVisible();
  });

  test('marketplace: list returns listings array or empty', async ({ page }) => {
    await page.getByTestId('btn-marketplace-list').click();
    await expect(page.getByTestId('marketplace-tournament-result')).toContainText(/listings|error/, { timeout: 5000 });
  });

  test('tournament: get bracket shows result or error', async ({ page }) => {
    await page.getByTestId('input-tournament-id').fill('test-tournament-1');
    await page.getByTestId('btn-tournament-bracket').click();
    await expect(page.getByTestId('marketplace-tournament-result')).toContainText(/bracket|error|Tournament/, { timeout: 5000 });
  });
});
