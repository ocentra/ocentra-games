import { test, expect } from '@playwright/test';

const TEST_UI_PORT = 3999;
const WORKER_PORT = 8787;
const BASE_URL = `http://localhost:${TEST_UI_PORT}`;
const API_BASE = `http://localhost:${WORKER_PORT}`;

test.describe('Audit (Plan D) via Test UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}?apiBase=${encodeURIComponent(API_BASE)}`);
    await expect(page.getByTestId('section-config')).toBeVisible();
  });

  test('audit section is visible', async ({ page }) => {
    await expect(page.getByTestId('section-audit')).toBeVisible();
  });

  test('audit log test event returns success or error', async ({ page }) => {
    await page.getByTestId('btn-audit-log').click();
    await expect(page.getByTestId('audit-result')).toContainText(/eventId|ok|success|error/, { timeout: 5000 });
  });

  test('audit query returns result', async ({ page }) => {
    await page.getByTestId('btn-audit-query').click();
    await expect(page.getByTestId('audit-result')).toContainText(/events|items|error/, { timeout: 5000 });
  });

  test('audit verify chain returns result', async ({ page }) => {
    await page.getByTestId('btn-audit-verify').click();
    await expect(page.getByTestId('audit-result')).toContainText(/verified|valid|error/, { timeout: 5000 });
  });
});
