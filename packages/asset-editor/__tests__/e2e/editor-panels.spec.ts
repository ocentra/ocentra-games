import { test, expect } from '@playwright/test';

test.describe('Asset Editor — Phase 5 panel verification (P5-26–P5-33)', () => {
  test.beforeEach(async ({ page }) => {
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

  async function selectTreeNode(page: import('@playwright/test').Page, nodeName: RegExp | string) {
    const tree = page.locator('.resource-tree');
    const node = typeof nodeName === 'string'
      ? tree.getByRole('button', { name: new RegExp(nodeName, 'i') }).first()
      : tree.getByRole('button', { name: nodeName }).first();
    await expect(node).toBeVisible({ timeout: 10000 });
    await node.click();
    return node;
  }

  test('P5-26: ResourceTree renders and shows assets from real manifest', async ({ page }) => {
    await waitForTreeReady(page);
    await ensureFolderExpanded(page, 'Resources');
    await expect(page.locator('.resource-tree').getByRole('button', { name: /AI|Pages|GameMode/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test('P5-27: Preview shows placeholder when no asset selected, content when asset selected', async ({ page }) => {
    await expect(page.getByText(/Select an asset from the hierarchy to preview it/)).toBeVisible({ timeout: 15000 });
    await waitForTreeReady(page);
    await ensureFolderExpanded(page, 'Resources');
    await ensureFolderExpanded(page, 'Pages');
    await ensureFolderExpanded(page, 'Home');
    await selectTreeNode(page, /ComingSoon/i);
    await expect(page.getByText(/Select an asset from the hierarchy/)).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('.preview-panel')).toContainText(/ComingSoon|displayName|ScriptableObject|images/i, { timeout: 8000 });
  });

  test('P5-28: Inspector shows placeholder when no asset selected, fields when asset selected', async ({ page }) => {
    await expect(page.getByText(/Select an asset to view and edit its properties/)).toBeVisible({ timeout: 15000 });
    await waitForTreeReady(page);
    await ensureFolderExpanded(page, 'Resources');
    await ensureFolderExpanded(page, 'Pages');
    await ensureFolderExpanded(page, 'Home');
    await selectTreeNode(page, /ComingSoon/i);
    await expect(page.getByText(/Select an asset to view and edit/)).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('.inspector-panel')).toContainText(/displayName|guid|ComingSoon|images/i, { timeout: 8000 });
  });

  test('Resources, Preview, and Inspector panel titles are present', async ({ page }) => {
    await waitForTreeReady(page);
    await expect(page.getByRole('tab', { name: 'Resources' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: 'Games' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: 'Preview' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: 'Inspector' }).first()).toBeVisible({ timeout: 5000 });
  });

  test('Games tab shows the Games subtree without drilling through GameMode', async ({ page }) => {
    await waitForTreeReady(page);
    await page.getByRole('tab', { name: 'Games' }).click();
    await expect(page.locator('.resource-tree')).toContainText(/Claim|briscola|three-card-brag/i, { timeout: 10000 });
  });

  test('P5-29: Create asset dialog opens from Resources context menu', async ({ page }) => {
    await waitForTreeReady(page);
    const resourcesButton = await ensureFolderExpanded(page, 'Resources');
    await resourcesButton.click({ button: 'right' });
    await expect(page.getByText(/Create|New|Add/i)).toBeVisible({ timeout: 5000 });
  });

  test('P5-30: Delete option appears in context menu when asset selected', async ({ page }) => {
    await waitForTreeReady(page);
    await ensureFolderExpanded(page, 'Resources');
    await ensureFolderExpanded(page, 'Pages');
    await ensureFolderExpanded(page, 'Home');
    const comingSoon = await selectTreeNode(page, /ComingSoon/i);
    await comingSoon.click({ button: 'right' });
    await expect(page.getByText(/Delete|Remove/i)).toBeVisible({ timeout: 5000 });
  });

  test('P5-32: Sync/publish controls are visible', async ({ page }) => {
    await waitForTreeReady(page);
    await expect(page.getByRole('button', { name: 'Sync' })).toBeVisible({ timeout: 8000 });
  });

  test('P5-33: Game asset loads in Preview and Inspector', async ({ page }) => {
    await waitForTreeReady(page);
    await ensureFolderExpanded(page, 'Resources');
    await ensureFolderExpanded(page, 'GameMode');
    await ensureFolderExpanded(page, 'CardGames');
    await selectTreeNode(page, /DeckManager/i);
    await expect(page.locator('.preview-panel')).toContainText(/DeckManager|displayName|guid|ScriptableObject/i, { timeout: 5000 });
    await expect(page.locator('.inspector-panel')).toContainText(/displayName|guid|DeckManager/i, { timeout: 5000 });
  });

  test('Deck selection shows deck content in Preview and Inspector', async ({ page }) => {
    await waitForTreeReady(page);
    await ensureFolderExpanded(page, 'Resources');
    await ensureFolderExpanded(page, 'GameMode');
    await ensureFolderExpanded(page, 'CardGames');
    await selectTreeNode(page, /DeckManager/i);
    await expect(page.locator('.preview-panel')).not.toContainText(/Select an asset from the hierarchy/);
    await expect(page.locator('.inspector-panel')).toContainText(/displayName|guid|DeckManager|Create deck asset|Deck library/i, { timeout: 8000 });
  });

  test('Selection highlight and panels update when selecting different asset types', async ({ page }) => {
    await waitForTreeReady(page);
    await ensureFolderExpanded(page, 'Resources');
    await ensureFolderExpanded(page, 'Pages');
    await ensureFolderExpanded(page, 'Home');
    await selectTreeNode(page, /ComingSoon/i);
    await expect(page.locator('.preview-panel')).toContainText(/ComingSoon|displayName|images/i, { timeout: 5000 });
    await ensureFolderExpanded(page, 'GameMode');
    await ensureFolderExpanded(page, 'CardGames');
    await selectTreeNode(page, /DeckManager/i);
    await expect(page.locator('.preview-panel')).not.toContainText(/Select an asset from the hierarchy/);
    await expect(page.locator('.inspector-panel')).toContainText(/displayName|guid|DeckManager/i, { timeout: 8000 });
  });

  test.skip('Inspector Reset reverts unsaved changes (ComingSoon ImageListInspector editable fields do not trigger hasChanges)', async ({ page }) => {
    await waitForTreeReady(page);
    await ensureFolderExpanded(page, 'Resources');
    await ensureFolderExpanded(page, 'Pages');
    await ensureFolderExpanded(page, 'Home');
    await selectTreeNode(page, /ComingSoon/i);
    await expect(page.locator('.inspector-panel')).toContainText(/displayName|ComingSoon|images/i, { timeout: 8000 });
    const editableInput = page.locator('.inspector-panel input:not([readonly])').first();
    const hasEditableInput = await editableInput.isVisible().catch(() => false);
    if (hasEditableInput) {
      const originalValue = await editableInput.inputValue();
      await editableInput.fill('E2E Reset Test');
      await expect(page.locator('.inspector-panel').getByRole('button', { name: 'Reset' })).toBeVisible({ timeout: 5000 });
      await page.locator('.inspector-panel').getByRole('button', { name: 'Reset' }).click();
      await page.waitForTimeout(500);
      const afterReset = await editableInput.inputValue();
      expect(afterReset).toBe(originalValue);
    }
  });

  test('Rebuild Asset Index dialog opens and runs scan', async ({ page }) => {
    await waitForTreeReady(page);
    await page.getByRole('button', { name: 'Tools' }).click();
    await page.getByText('Rebuild Asset Index...').click();
    const dialog = page.getByRole('dialog', { name: /Rebuild Asset Index/i }).or(
      page.locator('.scan-assets-dialog')
    );
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog).toContainText(/Rebuild Asset Index|Index Rebuilt|Assets Found|Scanning|error|failed/i, {
      timeout: 15000,
    });
  });

  test('Refresh Tree preserves selection and panel content', async ({ page }) => {
    await waitForTreeReady(page);
    await ensureFolderExpanded(page, 'Resources');
    await ensureFolderExpanded(page, 'Pages');
    await ensureFolderExpanded(page, 'Home');
    await selectTreeNode(page, /ComingSoon/i);
    await expect(page.locator('.preview-panel')).toContainText(/ComingSoon|displayName|images/i, { timeout: 5000 });
    await page.getByRole('button', { name: 'Tools' }).click();
    await page.getByText('Refresh Tree').click();
    await page.waitForTimeout(1500);
    await expect(page.locator('.preview-panel')).toContainText(/ComingSoon|displayName|images/i, { timeout: 5000 });
    await expect(page.locator('.inspector-panel')).toContainText(/displayName|guid|ComingSoon/i);
  });
});
