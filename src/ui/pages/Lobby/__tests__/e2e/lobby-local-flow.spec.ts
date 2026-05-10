import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { buildPublicGameLobbyPath } from '@ocentra/endpoint-domain/constants/public-routes';

const ClaimLobbyPath = buildPublicGameLobbyPath('claim:ddc6d965-14a7-4586-8a15-674e0daf8b5c');

async function openClaimLobby(page: Page) {
  await page.goto(ClaimLobbyPath);
  await expect(page.getByRole('button', { name: 'QUICK JOIN' })).toBeVisible({ timeout: 30000 });
}

async function acceptGuestPrompt(page: Page) {
  const guestButton = page.getByRole('button', { name: /guest/i });
  await guestButton.waitFor({ state: 'visible', timeout: 30000 });
  await guestButton.click();
}

async function createTableFromLobby(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'CREATE TABLE' }).first().click();
  await expect(page.getByText('Create Table', { exact: true })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'CREATE TABLE' }).last().click();
  await acceptGuestPrompt(page);
  const codeLabel = page.getByText(/CODE\s+[A-Z0-9]+/).first();
  await expect(codeLabel).toBeVisible({ timeout: 30000 });
  const codeText = await codeLabel.textContent();
  const code = codeText?.replace(/^CODE\s+/, '').trim();
  expect(code).toBeTruthy();
  return code!;
}

async function joinTableByCode(page: Page, joinCode: string) {
  await page.getByRole('button', { name: 'JOIN WITH CODE' }).click();
  await expect(page.getByText('Join With Code', { exact: true })).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder('Paste private room code').fill(joinCode);
  await page.getByRole('button', { name: 'JOIN ROOM' }).click();
  await acceptGuestPrompt(page);
  await expect(page.getByText(/CODE\s+[A-Z0-9]+/).first()).toBeVisible({ timeout: 30000 });
}

async function sendRoomChat(page: Page, message: string) {
  await page.getByLabel('Room chat message').fill(message);
  await page.locator('form').filter({ has: page.getByLabel('Room chat message') }).getByRole('button', { name: 'SEND' }).click();
}

async function closeContexts(contexts: BrowserContext[]) {
  await Promise.all(contexts.map(context => context.close().catch(() => undefined)));
}

test.describe('Claim lobby local multiplayer flow', () => {
  test('creates a room, joins from a second browser context, chats, readies, and starts', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const contexts = [hostContext, guestContext];
    try {
      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      await openClaimLobby(hostPage);
      const joinCode = await createTableFromLobby(hostPage);

      await openClaimLobby(guestPage);
      await joinTableByCode(guestPage, joinCode);

      const message = `playwright chat ${Date.now()}`;
      await sendRoomChat(hostPage, message);
      await expect(guestPage.getByText(message).first()).toBeVisible({ timeout: 15000 });

      await guestPage.getByRole('button', { name: 'READY' }).click();
      await expect(guestPage.getByRole('button', { name: 'UNREADY' })).toBeVisible({ timeout: 15000 });
      await expect(hostPage.getByRole('button', { name: 'READY' })).toBeVisible({ timeout: 15000 });

      await hostPage.getByRole('button', { name: 'READY' }).click();
      await expect(hostPage.getByRole('button', { name: 'UNREADY' })).toBeVisible({ timeout: 15000 });
      await hostPage.getByRole('button', { name: 'START' }).click();
      await expect(hostPage.getByText(/STARTING/).first()).toBeVisible({ timeout: 15000 });
      await expect(guestPage.getByText(/STARTING/).first()).toBeVisible({ timeout: 15000 });
    } finally {
      await closeContexts(contexts);
    }
  });
});
