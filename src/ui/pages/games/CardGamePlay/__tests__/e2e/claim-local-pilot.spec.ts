import { expect, test } from '@playwright/test';

test.describe.configure({ timeout: 60000 });

test.describe('Claim local pilot', () => {
  test('loads the Claim pilot route and starts a visible-hand match', async ({ page }) => {
    page.on('pageerror', (error) => {
      process.stdout.write(`[pageerror] ${error.message}\n`);
    });
    page.on('requestfailed', (request) => {
      process.stdout.write(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? 'unknown'}\n`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        process.stdout.write(`[console:error] ${message.text()}\n`);
      }
    });

    await page.goto('/games/claim/play', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('claim-pilot-table')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('claim-pilot-current-hand')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('claim-pilot-floor-zone')).not.toContainText('Waiting for deal');
    await expect(page.getByRole('button', { name: 'Pass' })).toBeVisible();
  });

  test('plays through one full Claim round and advances to the next round', async ({ page }) => {
    page.on('pageerror', (error) => {
      process.stdout.write(`[pageerror] ${error.message}\n`);
    });
    page.on('requestfailed', (request) => {
      process.stdout.write(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? 'unknown'}\n`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        process.stdout.write(`[console:error] ${message.text()}\n`);
      }
    });

    await page.goto('/games/claim/play', { waitUntil: 'domcontentloaded' });

    await expect(page.getByTestId('claim-pilot-table')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('claim-pilot-current-hand')).toBeVisible({ timeout: 20000 });

    const declareButtons = page.getByRole('button', { name: /^Declare / });
    await expect(declareButtons.first()).toBeVisible({ timeout: 20000 });
    await declareButtons.first().click();

    for (let index = 0; index < 8; index += 1) {
      if (await page.getByText(/Current turn \| Declared:/i).count()) {
        break;
      }
      const passButton = page.getByRole('button', { name: 'Pass' });
      await expect(passButton).toBeVisible({ timeout: 20000 });
      await passButton.click();
    }

    await expect(page.getByText(/Current turn \| Declared:/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Call Showdown' })).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Call Showdown' }).click();

    while ((await page.getByRole('button', { name: /^Reveal / }).count()) > 0) {
      await page.getByRole('button', { name: /^Reveal / }).first().click();
    }

    await expect(page.getByText('Round 2')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('claim-pilot-table')).toBeVisible();
  });

  test('shows a readiness error for unsupported pilot routes', async ({ page }) => {
    page.on('pageerror', (error) => {
      process.stdout.write(`[pageerror] ${error.message}\n`);
    });
    page.on('requestfailed', (request) => {
      process.stdout.write(`[requestfailed] ${request.url()} ${request.failure()?.errorText ?? 'unknown'}\n`);
    });
    page.on('console', (message) => {
      if (message.type() === 'error') {
        process.stdout.write(`[console:error] ${message.text()}\n`);
      }
    });

    await page.goto('/games/three-card-brag/play', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/local pilot is not ready yet/i)).toBeVisible({ timeout: 20000 });
  });
});
