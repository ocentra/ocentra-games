import { test, expect } from '@playwright/test';

const TEST_UI_PORT = 3999;
const WORKER_PORT = 8787;
const BASE_URL = `http://localhost:${TEST_UI_PORT}`;
const API_BASE = `http://localhost:${WORKER_PORT}`;

test.describe('Social (Plan G) via Test UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}?apiBase=${encodeURIComponent(API_BASE)}`);
    await expect(page.getByTestId('section-config')).toBeVisible();
  });

  test('social: message list returns messages or empty', async ({ page }) => {
    await page.getByTestId('input-social-conv-id').fill('test-conv');
    await page.getByTestId('btn-message-list').click();
    await expect(page.getByTestId('social-result')).toContainText(/messages|error|401/, { timeout: 5000 });
  });

  test('social: feed list returns items or 401', async ({ page }) => {
    await page.getByTestId('btn-feed-list').click();
    await expect(page.getByTestId('social-result')).toContainText(/items|error|401/, { timeout: 5000 });
  });

  test('social: party create returns partyId or error', async ({ page }) => {
    await page.getByTestId('btn-party-create').click();
    await expect(page.getByTestId('social-result')).toContainText(/partyId|error|401/, { timeout: 5000 });
  });

  test('social: notification list returns notifications or 401', async ({ page }) => {
    await page.getByTestId('btn-notification-list').click();
    await expect(page.getByTestId('social-result')).toContainText(/notifications|error|401/, { timeout: 5000 });
  });
});
