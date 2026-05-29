import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 60000 });

const waitForPilotToBeReady = async (page: Page) => {
  await expect(page.getByRole('main', { name: /card game template preview/i })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: /^Redeal$/ })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: /^(Declare|Pick|Pass|Showdown|Stock|Discard|Done)/ }).first()).toBeVisible({ timeout: 20000 });
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

    const declareButtons = page.getByRole('button', { name: /^Declare / });
    await expect(declareButtons.first()).toBeVisible({ timeout: 20000 });
    await declareButtons.first().click();

    await expect(page.getByText(/Declared:/i).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: /^(Stock|Discard|Showdown|Done|Pass|Pick)/ }).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('main', { name: /card game template preview/i })).toBeVisible();
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
