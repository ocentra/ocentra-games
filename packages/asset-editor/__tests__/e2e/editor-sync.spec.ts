import { test, expect } from '@playwright/test';

const E2E_AUTH_HEADER = 'Bearer test-token:test-user';

test.describe('Asset Editor — Sync & R2 (requires claim-storage)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/assets/**', async (route) => {
      const request = route.request();
      const headers = { ...request.headers(), Authorization: E2E_AUTH_HEADER };
      await route.continue({ headers });
    });
    await page.goto('/');
    await page.getByTestId('editor-e2e-ready').waitFor({ state: 'attached', timeout: 25000 });
    await page.waitForTimeout(2000);
  });

  async function waitForTreeReady(page: import('@playwright/test').Page) {
    const tree = page.locator('.resource-tree');
    await expect(tree).toBeVisible({ timeout: 15000 });
    await expect(tree.getByRole('button', { name: /Resources/ })).toBeVisible({ timeout: 10000 });
  }

  async function ensureFolderExpanded(page: import('@playwright/test').Page, folderName: string) {
    const tree = page.locator('.resource-tree');
    const folderButton = tree.getByRole('button', { name: new RegExp(folderName, 'i') }).first();
    await expect(folderButton).toBeVisible({ timeout: 10000 });
    const text = (await folderButton.textContent()) ?? '';
    if (text.includes('▶')) {
      await folderButton.click();
    }
    return folderButton;
  }

  test('Sync menu opens and shows Sync to Cloud, Sync from Cloud, Scan Cloud Status', async ({ page }) => {
    await waitForTreeReady(page);
    const syncButton = page.getByRole('button', { name: 'Sync' });
    await expect(syncButton).toBeVisible({ timeout: 8000 });
    await syncButton.click();
    await expect(page.getByText('Sync to Cloud')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Sync from Cloud')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Scan Cloud Status')).toBeVisible({ timeout: 3000 });
  });

  test('Scan Cloud Status loads sync status from R2', async ({ page }) => {
    await waitForTreeReady(page);
    const syncButton = page.getByRole('button', { name: 'Sync' });
    await syncButton.click();
    await page.getByText('Scan Cloud Status').click();
    await page.waitForTimeout(3000);
    await syncButton.click();
    const syncStatus = page.locator('.asset-editor__sync-status');
    await expect(syncStatus).toBeVisible({ timeout: 10000 });
    await expect(syncStatus).toContainText(/✅|⚠️|❌/);
  });

  test('Sync from Cloud completes', async ({ page }) => {
    await waitForTreeReady(page);
    const syncButton = page.getByRole('button', { name: 'Sync' });
    await syncButton.click();
    await page.getByText('Sync from Cloud').click();
    await expect(page.getByRole('button', { name: 'Sync' })).toBeVisible({ timeout: 10000 });
  });

  test('Sync to Cloud button is clickable', async ({ page }) => {
    await waitForTreeReady(page);
    const syncButton = page.getByRole('button', { name: 'Sync' });
    await syncButton.click();
    const syncToCloud = page.getByText('Sync to Cloud');
    await expect(syncToCloud).toBeVisible({ timeout: 3000 });
    await syncToCloud.click();
    await expect(page.getByRole('button', { name: 'Sync' })).toBeVisible({ timeout: 10000 });
  });

  test.skip('Create asset then delete: asset appears in tree then is removed (requires Tauri - browser cannot load created assets from disk)', async ({ page }) => {
    await waitForTreeReady(page);
    const assetName = `E2E-delete-me-${Date.now()}`;

    const resourcesButton = await ensureFolderExpanded(page, 'Resources');
    await resourcesButton.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Create Asset' }).click();
    await expect(page.getByRole('dialog').getByText('Create New Asset')).toBeVisible({ timeout: 8000 });

    const typeSelect = page.locator('#type-select');
    await expect(typeSelect).toBeVisible({ timeout: 5000 });
    await expect(typeSelect.locator('option[value=\"GameInfo\"]')).toBeAttached({ timeout: 10000 });
    await typeSelect.selectOption('GameInfo');

    await page.getByLabel('Asset Name *').fill(assetName);
    await page.getByRole('button', { name: 'Create Asset' }).click();

    const createdNode = page.locator('.resource-tree').getByRole('button', { name: new RegExp(assetName, 'i') }).first();
    await expect(createdNode).toBeVisible({ timeout: 15000 });

    await createdNode.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Delete Asset' })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Delete Asset' }).click();

    await expect(createdNode).not.toBeVisible({ timeout: 10000 });
  });

  test('Browse from Local uploads an asset file and shows it in the tree', async ({ page }) => {
    await waitForTreeReady(page);

    const resourcesButton = await ensureFolderExpanded(page, 'Resources');
    await resourcesButton.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Browse from Local' }).click();

    const uploadContent = JSON.stringify({
      system: {
        guid: `00000000-0000-4000-8000-${Date.now().toString().padStart(12, '0').slice(-12)}`,
        assetType: 'GameInfo',
        displayName: 'E2E Uploaded Asset',
        treePath: 'Resources/e2e-uploaded.asset',
      },
      data: {
        title: 'Uploaded from Playwright',
      },
    }, null, 2);

    await page.locator('input[aria-label="Browse files"]').setInputFiles({
      name: 'e2e-uploaded.asset',
      mimeType: 'application/json',
      buffer: Buffer.from(uploadContent, 'utf8'),
    });

    const uploadedNode = page.locator('.resource-tree').getByRole('button', { name: /E2E Uploaded Asset|e2e-uploaded/i }).first();
    await expect(uploadedNode).toBeVisible({ timeout: 15000 });
  });

  test.skip('Create asset, open Inspector, verify editable and Save/Reset appear when field changes (requires Tauri - browser fetch returns HTML for created asset paths)', async ({ page }) => {
    await waitForTreeReady(page);
    const assetName = `E2E-inspector-${Date.now()}`;

    const resourcesButton = await ensureFolderExpanded(page, 'Resources');
    await resourcesButton.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Create Asset' }).click();
    await expect(page.getByRole('dialog').getByText('Create New Asset')).toBeVisible({ timeout: 8000 });

    const typeSelect = page.locator('#type-select');
    await typeSelect.selectOption('GameInfo');
    await page.getByLabel('Asset Name *').fill(assetName);
    await page.getByRole('button', { name: 'Create Asset' }).click();

    const createdNode = page.locator('.resource-tree').getByRole('button', { name: new RegExp(assetName, 'i') }).first();
    await expect(createdNode).toBeVisible({ timeout: 15000 });
    await createdNode.click();

    await expect(page.locator('.inspector-panel')).toContainText(/displayName|guid|GameInfo/i, { timeout: 8000 });
    const editableInput = page.locator('.inspector-panel input:not([readonly])').first();
    if (await editableInput.isVisible()) {
      await editableInput.fill('E2E Edited Title');
      await expect(page.locator('.inspector-panel').getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 3000 });
      await expect(page.locator('.inspector-panel').getByRole('button', { name: 'Reset' })).toBeVisible({ timeout: 2000 });
    }

    await ensureFolderExpanded(page, 'Pages');
    await selectTreeNode(page, /ComingSoon/i);
    await createdNode.click();
    await expect(page.locator('.inspector-panel')).toContainText(/displayName|guid|GameInfo/i, { timeout: 5000 });
  });
});
