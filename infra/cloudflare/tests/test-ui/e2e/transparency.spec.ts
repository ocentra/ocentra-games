import { test, expect } from '@playwright/test';

const TEST_UI_PORT = 3999;
const WORKER_PORT = 8787;
const BASE_URL = `http://localhost:${TEST_UI_PORT}`;
const API_BASE = `http://localhost:${WORKER_PORT}`;

test.describe('Transparency (Plan D) via Test UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}?apiBase=${encodeURIComponent(API_BASE)}`);
    await expect(page.getByTestId('section-config')).toBeVisible();
  });

  test('transparency section is visible', async ({ page }) => {
    await expect(page.getByTestId('section-transparency')).toBeVisible();
  });

  test('transparency get requires match id', async ({ page }) => {
    await page.getByTestId('btn-transparency-get').click();
    await expect(page.getByTestId('transparency-result')).toContainText('Enter match ID first', { timeout: 3000 });
  });

  test('transparency get with match id returns result or 404', async ({ page }) => {
    await page.getByTestId('input-transparency-match-id').fill('no-such-match-999');
    await page.getByTestId('btn-transparency-get').click();
    await expect(page.getByTestId('transparency-result')).toContainText(/transparency|matchId|error|404/, { timeout: 5000 });
  });
});
