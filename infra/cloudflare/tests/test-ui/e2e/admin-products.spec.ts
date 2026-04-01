import { test, expect } from '@playwright/test';

const TEST_UI_PORT = 3999;
const WORKER_PORT = 8787;
const BASE_URL = `http://localhost:${TEST_UI_PORT}`;
const API_BASE = `http://localhost:${WORKER_PORT}`;

test.describe('Admin Products (Plan A) via Test UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}?apiBase=${encodeURIComponent(API_BASE)}`);
    await expect(page.getByTestId('section-config')).toBeVisible();
  });

  test('admin products section is visible', async ({ page }) => {
    await expect(page.getByTestId('section-admin-products')).toBeVisible();
  });

  test('admin products: list returns products or 403', async ({ page }) => {
    await page.getByTestId('btn-admin-products-list').click();
    await expect(page.getByTestId('admin-products-result')).toContainText(/products|error|403|401/, { timeout: 5000 });
  });

  test('admin products: get by id shows result or error', async ({ page }) => {
    await page.getByTestId('input-admin-product-id').fill('test-product-1');
    await page.getByTestId('btn-admin-products-get').click();
    await expect(page.getByTestId('admin-products-result')).toContainText(/productId|error|404|403/, { timeout: 5000 });
  });
});
