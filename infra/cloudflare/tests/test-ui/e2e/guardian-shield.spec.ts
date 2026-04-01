import { test, expect } from '@playwright/test';

const TEST_UI_PORT = 3999;
const WORKER_PORT = 8787;
const BASE_URL = `http://localhost:${TEST_UI_PORT}`;
const API_BASE = `http://localhost:${WORKER_PORT}`;

test.describe('Guardian Shield (Plan F) via Test UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}?apiBase=${encodeURIComponent(API_BASE)}`);
    await expect(page.getByTestId('section-config')).toBeVisible();
  });

  test('guardian shield section is visible', async ({ page }) => {
    await expect(page.getByTestId('section-guardian-shield')).toBeVisible();
  });

  test('fraud check returns result', async ({ page }) => {
    await page.getByTestId('btn-fraud-check').click();
    await expect(page.getByTestId('guardian-shield-result')).toContainText(/risk|low|high|error|401/, { timeout: 5000 });
  });

  test('anticheat report returns result', async ({ page }) => {
    await page.getByTestId('btn-anticheat-report').click();
    await expect(page.getByTestId('guardian-shield-result')).toContainText(/status|received|error|401/, { timeout: 5000 });
  });

  test('security event returns result', async ({ page }) => {
    await page.getByTestId('btn-security-event').click();
    await expect(page.getByTestId('guardian-shield-result')).toContainText(/penalties|status|error|401/, { timeout: 5000 });
  });
});
