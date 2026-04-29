import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 60000 });

const waitForPilotToBeReady = async (page: Page) => {
  await expect(page.getByTestId('claim-pilot-floor-zone')).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId('claim-pilot-floor-zone')).not.toContainText('Waiting', { timeout: 20000 });
  await expect(page.getByTestId('claim-pilot-table')).toBeVisible({ timeout: 20000 });
};

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

    await waitForPilotToBeReady(page);
    await expect(page.getByTestId('claim-pilot-redeal')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: /^(Declare|Pick|Pass|Showdown)/ }).first()).toBeVisible({ timeout: 20000 });
  });

  test('updates the Claim pilot action state after declare and pick interactions', async ({ page }) => {
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

    await waitForPilotToBeReady(page);
    await expect(page.getByTestId('claim-pilot-redeal')).toBeVisible({ timeout: 20000 });

    const declareButtons = page.getByRole('button', { name: /^Declare / });
    await expect(declareButtons.first()).toBeVisible({ timeout: 20000 });
    await declareButtons.first().click();

    await expect(page.getByText(/Declared: clubs/i)).toBeVisible({ timeout: 20000 });

    const pickButtons = page.getByRole('button', { name: /^Pick / });
    await expect(pickButtons.first()).toBeVisible({ timeout: 20000 });
    await pickButtons.first().click();

    await expect(page.getByRole('button', { name: 'Pass' })).toBeVisible({ timeout: 20000 });
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
