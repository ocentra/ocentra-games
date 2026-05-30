import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  buildPublicGameLobbyPath,
  buildPublicGamePlayPath,
} from '@ocentra/endpoint-domain/constants/public-routes';

const ClaimGameId = 'claim:ddc6d965-14a7-4586-8a15-674e0daf8b5c';
const ClaimLobbyPath = buildPublicGameLobbyPath(ClaimGameId);
const ClaimPlayPath = buildPublicGamePlayPath(ClaimGameId);

function escapedPathRegex(path: string): RegExp {
  return new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?.*)?$`);
}

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

async function joinPublicTableFromList(page: Page) {
  await expect(page.getByText('Master Table').first()).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'ALL TABLES', exact: true }).click();
  await page.locator('.lobby-all-table-row').first().getByRole('button', { name: 'JOIN TABLE', exact: true }).click();
  await acceptGuestPrompt(page);
  await expect(page.getByText(/CODE\s+[A-Z0-9]+/).first()).toBeVisible({ timeout: 30000 });
}

async function sendRoomChat(page: Page, message: string) {
  await page.getByLabel('Room chat message').fill(message);
  await page.locator('form').filter({ has: page.getByLabel('Room chat message') }).getByRole('button', { name: 'SEND' }).click();
}

async function exerciseSideServices(page: Page, joinCode: string) {
  const friendId = `pwfriend${Date.now().toString(36).slice(-6)}`;
  await page.getByLabel('Find or add friend').fill(friendId);
  await page.locator('form').filter({ has: page.getByLabel('Find or add friend') }).getByRole('button', { name: 'ADD' }).click();
  await expect(page.getByText(new RegExp(friendId.slice(0, 8))).first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'INVITE' }).first().click();
  await expect(page.getByRole('button', { name: 'SENT' }).first()).toBeVisible({ timeout: 15000 });

  const lobbyMessage = `global lobby ${Date.now()}`;
  await page.getByLabel('Lobby chat message').fill(lobbyMessage);
  await page.locator('form').filter({ has: page.getByLabel('Lobby chat message') }).locator('button').click();
  await expect(page.getByText(lobbyMessage).first()).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: /Server:/ }).click();
  await page.getByRole('button', { name: 'Select server NA West' }).click();
  await expect(page.getByRole('button', { name: /Server: NA West/ })).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: 'DAILY REWARD' }).click();
  await expect(page.getByRole('button', { name: 'CLOSE' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'CLOSE' }).click();

  await page.getByRole('button', { name: 'SHARE' }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText()), { timeout: 15000 }).toContain(joinCode);
}

async function addAISeat(page: Page) {
  await page.getByRole('button', { name: 'ADD AI' }).click();
  await expect(page.getByText(/AI Seat|OPPONENT|COACH|BENCHMARK/).first()).toBeVisible({ timeout: 15000 });
}

async function closeContexts(contexts: BrowserContext[]) {
  await Promise.all(contexts.map(context => context.close().catch(() => undefined)));
}

test.describe('Claim lobby local multiplayer flow', () => {
  test('creates a room, joins from public list and code, chats, readies, and starts', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const publicGuestContext = await browser.newContext();
    const codeGuestContext = await browser.newContext();
    const contexts = [hostContext, publicGuestContext, codeGuestContext];
    try {
      const hostPage = await hostContext.newPage();
      const publicGuestPage = await publicGuestContext.newPage();
      const codeGuestPage = await codeGuestContext.newPage();

      await openClaimLobby(hostPage);
      await hostContext.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(hostPage.url()).origin });
      const joinCode = await createTableFromLobby(hostPage);
      await exerciseSideServices(hostPage, joinCode);
      await addAISeat(hostPage);

      await openClaimLobby(publicGuestPage);
      await joinPublicTableFromList(publicGuestPage);

      await openClaimLobby(codeGuestPage);
      await joinTableByCode(codeGuestPage, joinCode);

      const message = `playwright chat ${Date.now()}`;
      await sendRoomChat(hostPage, message);
      await expect(publicGuestPage.getByText(message).first()).toBeVisible({ timeout: 15000 });
      await expect(codeGuestPage.getByText(message).first()).toBeVisible({ timeout: 15000 });

      await publicGuestPage.getByRole('button', { name: 'READY', exact: true }).click();
      await expect(publicGuestPage.getByRole('button', { name: 'UNREADY', exact: true })).toBeVisible({ timeout: 15000 });
      await codeGuestPage.getByRole('button', { name: 'READY', exact: true }).click();
      await expect(codeGuestPage.getByRole('button', { name: 'UNREADY', exact: true })).toBeVisible({ timeout: 15000 });
      await expect(hostPage.getByRole('button', { name: 'READY', exact: true })).toBeVisible({ timeout: 15000 });

      await hostPage.getByRole('button', { name: 'READY', exact: true }).click();
      await expect(hostPage.getByRole('button', { name: 'UNREADY', exact: true })).toBeVisible({ timeout: 15000 });
      await Promise.all([
        hostPage.waitForURL(escapedPathRegex(ClaimPlayPath), { timeout: 30000 }),
        publicGuestPage.waitForURL(escapedPathRegex(ClaimPlayPath), { timeout: 30000 }),
        codeGuestPage.waitForURL(escapedPathRegex(ClaimPlayPath), { timeout: 30000 }),
        hostPage.getByRole('button', { name: 'START', exact: true }).click(),
      ]);
      await expect(hostPage.getByTestId('claim-pilot-table')).toBeVisible({ timeout: 30000 });
      await expect(publicGuestPage.getByTestId('claim-pilot-table')).toBeVisible({ timeout: 30000 });
      await expect(codeGuestPage.getByTestId('claim-pilot-table')).toBeVisible({ timeout: 30000 });
    } finally {
      await closeContexts(contexts);
    }
  });
});
