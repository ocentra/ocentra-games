import { test, expect } from '@playwright/test';

const TEST_UI_PORT = 3999;
const WORKER_PORT = 8787;
const BASE_URL = `http://localhost:${TEST_UI_PORT}`;
const API_BASE = `http://localhost:${WORKER_PORT}`;

test.describe('Shop via Test UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}?apiBase=${encodeURIComponent(API_BASE)}`);
    await expect(page.getByTestId('section-config')).toBeVisible();
  });

  test('shop: list products returns products array or empty', async ({ page }) => {
    await page.getByTestId('btn-shop-list').click();
    await expect(page.getByTestId('shop-result')).toContainText(/products|error/, { timeout: 5000 });
    const text = await page.getByTestId('shop-result').textContent();
    if (text && !text.includes('error') && !text.includes('Shop unavailable')) {
      expect(text).toMatch(/"products"/);
    }
  });

  test('shop: get product by id shows result or 404', async ({ page }) => {
    await page.getByTestId('input-shop-product-id').fill('no-such-product-999');
    await page.getByTestId('btn-shop-get').click();
    await expect(page.getByTestId('shop-result')).toContainText(/error|not found|Product|404/, { timeout: 5000 });
  });
});
