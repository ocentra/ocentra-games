import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.AI_PLAYGROUND_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.AI_PLAYGROUND_ADMIN_PASSWORD;
const IS_CI = process.env.CI === 'true';
const MODEL_ID = process.env.HF_LOCAL_MODEL ?? '';
const AI_MODELS_DB_NAME = 'AIModels';

const SHOULD_RUN = Boolean(!IS_CI && MODEL_ID.length > 0);

async function clearModelCache(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/src/bootstrap/__tests__/e2e/test-harness.html', { timeout: 180000 });
  await expect(page.getByText('Modules loaded - ready for testing')).toBeVisible({ timeout: 180000 });
  await page.evaluate(async (dbName: string) => {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }, AI_MODELS_DB_NAME);
}

async function signInIfNeeded(page: import('@playwright/test').Page): Promise<void> {
  const modelSelect = page.locator('#model-select');
  if (await modelSelect.count()) {
    return;
  }

  const emailInput = page.getByPlaceholder(/Email/i);
  if (!(await emailInput.count())) {
    return;
  }

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    await emailInput.fill(ADMIN_EMAIL);
    await page.getByPlaceholder(/Password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    return;
  }

  const guestButton = page.getByRole('button', { name: /guest/i });
  if (await guestButton.count()) {
    await guestButton.click();
    return;
  }

  throw new Error(
    'AIPlayground requires authentication. Set AI_PLAYGROUND_ADMIN_EMAIL/AI_PLAYGROUND_ADMIN_PASSWORD or run dev server with VITE_AI_PLAYGROUND_ALLOW_NON_ADMIN=1.'
  );
}

async function waitForPlaygroundReady(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('#model-select')).toBeVisible({ timeout: 120000 });
  await expect(page.getByRole('button', { name: /load model/i })).toBeVisible({ timeout: 20000 });
}

async function getModelOptionValues(
  page: import('@playwright/test').Page
): Promise<string[]> {
  const select = page.locator('#model-select');
  return await select
    .locator('option')
    .evaluateAll((opts) =>
      opts
        .map((o) => (o as HTMLOptionElement).value)
        .filter((v) => v)
    );
}

async function selectModelAndQuant(
  page: import('@playwright/test').Page
): Promise<void> {
  const select = page.locator('#model-select');
  await expect
    .poll(
      async () => (await getModelOptionValues(page)).length,
      {
        timeout: 180000,
        message: 'Model dropdown did not populate with any model options',
      }
    )
    .toBeGreaterThan(0);

  const availableModels = await getModelOptionValues(page);
  const hasModel = availableModels.includes(MODEL_ID);
  if (!hasModel) {
    throw new Error(
      `HF_LOCAL_MODEL "${MODEL_ID}" was not present in model dropdown. Available: ${availableModels.join(', ')}`
    );
  }
  await select.selectOption(MODEL_ID);

  const quantSelect = page.locator('#quant-select');
  await expect(quantSelect).toBeVisible({ timeout: 10000 });
  const quantValues = await quantSelect
    .locator('option')
    .evaluateAll((opts) =>
      opts
        .map((o) => (o as HTMLOptionElement).value)
        .filter((v) => v)
    );
  expect(quantValues.length).toBeGreaterThan(0);
  await quantSelect.selectOption(quantValues[0]);
}

async function loadSelectedModel(page: import('@playwright/test').Page): Promise<void> {
  const loadButton = page.getByRole('button', { name: /load model/i });
  await loadButton.click();
  await expect(page.getByRole('button', { name: /unload model/i })).toBeVisible({ timeout: 600000 });
}

test.describe('AIPlayground E2E (BrowserLocal + HF model)', () => {
  test('loads local model and generates a reply', async ({ page }) => {
    test.setTimeout(12 * 60 * 1000);
    test.skip(
      !SHOULD_RUN,
      'Set HF_LOCAL_MODEL outside CI'
    );
    await clearModelCache(page);
    await page.goto('/AIPlayground');

    await signInIfNeeded(page);
    await waitForPlaygroundReady(page);

    await selectModelAndQuant(page);
    await loadSelectedModel(page);

    const textarea = page.getByPlaceholder(/Type your message/i);
    await textarea.fill('Hello from Playwright test.');
    await page.getByRole('button', { name: /send/i }).click();

    const aiMessage = page.locator('.chat-panel__message--assistant').last();
    await expect(aiMessage).toBeVisible({ timeout: 60000 });
    const text = await aiMessage.textContent();
    expect((text || '').trim().length).toBeGreaterThan(0);
  });

  test('uses cache on second load in same session', async ({ page }) => {
    test.setTimeout(15 * 60 * 1000);
    test.skip(
      !SHOULD_RUN,
      'Set HF_LOCAL_MODEL outside CI'
    );
    await clearModelCache(page);
    await page.goto('/AIPlayground');
    await signInIfNeeded(page);
    await waitForPlaygroundReady(page);
    await selectModelAndQuant(page);

    let phase: 'idle' | 'first' | 'second' = 'idle';
    let firstLoadHfRequests = 0;
    let secondLoadHfRequests = 0;
    page.on('request', (request) => {
      if (!request.url().includes('huggingface.co')) {
        return;
      }
      if (phase === 'first') {
        firstLoadHfRequests += 1;
      } else if (phase === 'second') {
        secondLoadHfRequests += 1;
      }
    });

    phase = 'first';
    await loadSelectedModel(page);
    phase = 'idle';
    expect(firstLoadHfRequests).toBeGreaterThan(0);

    await page.getByRole('button', { name: /unload model/i }).click();
    await expect(page.getByRole('button', { name: /load model/i })).toBeVisible({ timeout: 10000 });

    phase = 'second';
    await loadSelectedModel(page);
    phase = 'idle';

    expect(secondLoadHfRequests).toBeLessThan(firstLoadHfRequests);
  });
});
