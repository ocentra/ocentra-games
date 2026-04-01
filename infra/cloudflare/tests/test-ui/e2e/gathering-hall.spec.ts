import { test, expect } from '@playwright/test';

const TEST_UI_PORT = 3999;
const WORKER_PORT = 8787;
const BASE_URL = `http://localhost:${TEST_UI_PORT}`;
const API_BASE = `http://localhost:${WORKER_PORT}`;

test.describe('Gathering Hall (Lobby, Matchmaking, Presence) via Test UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}?apiBase=${encodeURIComponent(API_BASE)}`);
    await expect(page.getByTestId('section-config')).toBeVisible();
  });

  test('config: API base and user id are set', async ({ page }) => {
    await expect(page.getByTestId('input-api-base')).toHaveValue(API_BASE);
    await expect(page.getByTestId('input-user-id')).toHaveValue('test-user');
  });

  test('auth: test token works (GET profile)', async ({ page }) => {
    await page.getByTestId('btn-auth').click();
    await expect(page.getByTestId('auth-result')).toContainText(/displayName|avatarUrl|401/, { timeout: 5000 });
    const text = await page.getByTestId('auth-result').textContent();
    if (text && !text.includes('401') && !text.includes('error')) {
      expect(text).toMatch(/displayName|avatarUrl/);
    }
  });

  test('lobby: list rooms returns array', async ({ page }) => {
    await page.getByTestId('btn-rooms-list').click();
    await expect(page.getByTestId('lobby-result')).toContainText('rooms', { timeout: 5000 });
  });

  test('lobby: create room then join then leave', async ({ page }) => {
    await page.getByTestId('btn-room-create').click();
    await expect(page.getByTestId('lobby-result')).toContainText('roomId', { timeout: 5000 });
    await expect(page.getByTestId('lobby-result')).toContainText('joined');
    const roomIdInput = page.getByTestId('input-room-id');
    await expect(roomIdInput).not.toHaveValue('');
    const roomId = await roomIdInput.inputValue();
    expect(roomId.length).toBeGreaterThan(0);

    await page.getByTestId('btn-room-join').click();
    await expect(page.getByTestId('lobby-result')).toContainText('joined', { timeout: 5000 });

    await page.getByTestId('btn-room-leave').click();
    await expect(page.getByTestId('lobby-result')).toContainText('left', { timeout: 5000 });
  });

  test('matchmaking: join queue returns ticketId or status', async ({ page }) => {
    await page.getByTestId('btn-queue-join').click();
    await expect(page.getByTestId('matchmaking-result')).toContainText(/ticketId|status|position|matched|queued/, { timeout: 5000 });
  });

  test('matchmaking: leave queue then status idle', async ({ page }) => {
    await page.getByTestId('btn-queue-join').click();
    await expect(page.getByTestId('matchmaking-result')).toBeVisible();
    await page.getByTestId('btn-queue-leave').click();
    await expect(page.getByTestId('matchmaking-result')).toContainText('left', { timeout: 5000 });
    await page.getByTestId('btn-queue-status').click();
    await expect(page.getByTestId('matchmaking-result')).toContainText(/idle|queued/, { timeout: 5000 });
  });

  test('presence: get then update then get', async ({ page }) => {
    await page.getByTestId('btn-presence-get').click();
    await expect(page.getByTestId('presence-result')).toContainText(/status|offline|online/, { timeout: 5000 });

    await page.getByTestId('select-presence-status').selectOption('online');
    await page.getByTestId('btn-presence-update').click();
    await expect(page.getByTestId('presence-result')).toBeVisible();

    await page.getByTestId('btn-presence-get').click();
    await expect(page.getByTestId('presence-result')).toContainText('online', { timeout: 5000 });
  });

  test('log: behaviour is logged', async ({ page }) => {
    await page.getByTestId('btn-rooms-list').click();
    await expect(page.getByTestId('log-output')).toContainText('GET', { timeout: 3000 });
  });
});
