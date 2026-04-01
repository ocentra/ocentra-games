import { test, expect } from '@playwright/test';

const TEST_UI_PORT = 3999;
const WORKER_PORT = 8787;
const BASE_URL = `http://localhost:${TEST_UI_PORT}`;
const API_BASE = `http://localhost:${WORKER_PORT}`;

test.describe('Progression & Rewards (Plan E) via Test UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}?apiBase=${encodeURIComponent(API_BASE)}`);
    await expect(page.getByTestId('section-config')).toBeVisible();
  });

  test('progression rewards section is visible', async ({ page }) => {
    await expect(page.getByTestId('section-progression-rewards')).toBeVisible();
  });

  test('progression get XP returns result', async ({ page }) => {
    await page.getByTestId('btn-progression-xp').click();
    await expect(page.getByTestId('progression-rewards-result')).toContainText(/xp|level|error|401/, { timeout: 5000 });
  });

  test('rewards daily status returns result', async ({ page }) => {
    await page.getByTestId('btn-rewards-daily').click();
    await expect(page.getByTestId('progression-rewards-result')).toContainText(/claimed|available|error|401/, { timeout: 5000 });
  });

  test('rewards daily claim returns result', async ({ page }) => {
    await page.getByTestId('btn-rewards-daily-claim').click();
    await expect(page.getByTestId('progression-rewards-result')).toContainText(/claimed|reward|error|401|already/, { timeout: 5000 });
  });
});
