import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  attachPilotDiagnostics,
  ClaimGamePath,
  ClaimGameId,
  ClaimLobbyPath,
  ClaimPlayPath,
  driveClaimPilotToCompletion,
  expectClaimInitialDeal,
  waitForClaimPilotReady,
} from './claim-pilot-e2e-helpers';

test.describe.configure({ timeout: 180000 });

function escapedPathRegex(path: string): RegExp {
  return new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?.*)?$`);
}

async function selectClaimFromFeatured(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const learnMore = page.getByTestId('featured-game-learn-more').first();
  const nextButton = page.getByTestId('featured-game-carousel-next').first();
  await expect(learnMore).toBeVisible({ timeout: 60000 });
  await expect.poll(async () => {
    const activeGameId = await learnMore.getAttribute('data-active-game-id');
    return activeGameId && !activeGameId.startsWith('placeholder-') ? activeGameId : null;
  }, { timeout: 60000 }).not.toBeNull();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const activeGameId = await learnMore.getAttribute('data-active-game-id');
    if (activeGameId === ClaimGameId) {
      break;
    }
    await nextButton.click();
    await expect.poll(() => learnMore.getAttribute('data-active-game-id'), { timeout: 10000 }).not.toBe(activeGameId);
  }

  await expect(learnMore).toHaveAttribute('data-active-game-id', ClaimGameId, { timeout: 30000 });
  await learnMore.click();
  await expect(page).toHaveURL(escapedPathRegex(ClaimGamePath), { timeout: 30000 });
  await expect(page.getByTestId('selected-game-action-view-lobbies')).toBeVisible({ timeout: 60000 });
}

async function readSelectedGamePresentation(page: Page) {
  const text = await page.getByTestId('selected-game-presentation-state').textContent({ timeout: 30000 });
  expect(text).toBeTruthy();
  return JSON.parse(text || '{}') as {
    activeTabId: string;
    heroTitle: string;
    tabs: Array<{
      id: string;
      chunkCount: number;
      chunks: Array<{
        body: string[];
        bullets: string[];
        id: string;
        title: string;
      }>;
    }>;
  };
}

async function expectClaimInfoTabs(page: Page): Promise<void> {
  const expectations = [
    ['about', /choosing a suit|Collect cards in one suit/i],
    ['rules', /Claim requires exactly four active seats|Deal three cards/i],
    ['deck', /Standard 52|Opening hand/i],
    ['ranking', /Rank cycle|Ace adjacency/i],
    ['scoring', /Final score|Expected 117|Target score/i],
    ['strategy', /deterministic|Discard priority|Call Showdown/i],
    ['systems', /claim-hoarder|claim\.hoarder\.v1|take stock/i],
  ] as const;

  const initialState = await readSelectedGamePresentation(page);
  expect(initialState.heroTitle).toBe('CLAIM');
  expect(initialState.tabs.map((tab) => tab.id)).toEqual(expectations.map(([tabId]) => tabId));
  expect(initialState.tabs.every((tab) => tab.chunkCount > 0)).toBe(true);

  for (const [tabId, contentPattern] of expectations) {
    await page.getByTestId(`selected-game-tab-${tabId}`).click();
    await expect(page.getByTestId('selected-game-showcase')).toHaveAttribute('data-active-tab-id', tabId, { timeout: 10000 });
    const state = await readSelectedGamePresentation(page);
    const tab = state.tabs.find((candidate) => candidate.id === tabId);
    expect(tab, `Missing selected-game ${tabId} tab data`).toBeTruthy();
    const text = tab!.chunks
      .flatMap((chunk) => [chunk.title, ...chunk.body, ...chunk.bullets])
      .join(' ');
    expect(text).toMatch(contentPattern);
  }
}

async function openClaimLobbyFromHome(page: Page): Promise<void> {
  await selectClaimFromFeatured(page);
  await page.getByTestId('selected-game-action-view-lobbies').click();
  await expect(page).toHaveURL(escapedPathRegex(ClaimLobbyPath), { timeout: 30000 });
  await expect(page.getByRole('button', { name: 'CREATE TABLE' }).first()).toBeVisible({ timeout: 30000 });
}

async function acceptGuestPrompt(page: Page): Promise<void> {
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

async function joinTableByCode(page: Page, joinCode: string): Promise<void> {
  await page.getByRole('button', { name: 'JOIN WITH CODE' }).click();
  await expect(page.getByText('Join With Code', { exact: true })).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder('Paste private room code').fill(joinCode);
  await page.getByRole('button', { name: 'JOIN ROOM' }).click();
  await acceptGuestPrompt(page);
  await expect(page.getByText(/CODE\s+[A-Z0-9]+/).first()).toBeVisible({ timeout: 30000 });
}

async function readyPlayer(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'READY', exact: true }).click();
  await expect(page.getByRole('button', { name: 'UNREADY', exact: true })).toBeVisible({ timeout: 15000 });
}

async function closeContexts(contexts: BrowserContext[]): Promise<void> {
  await Promise.all(contexts.map((context) => context.close().catch(() => undefined)));
}

test.describe('Claim home to lobby to playable pilot', () => {
  test('selects Claim from featured, creates a two-browser lobby, starts, and plays to final result', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const contexts = [hostContext, guestContext];

    try {
      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();
      attachPilotDiagnostics(hostPage);
      attachPilotDiagnostics(guestPage);

      await selectClaimFromFeatured(hostPage);
      await expectClaimInfoTabs(hostPage);
      await hostPage.getByTestId('selected-game-action-view-lobbies').click();
      await expect(hostPage).toHaveURL(escapedPathRegex(ClaimLobbyPath), { timeout: 30000 });
      await expect(hostPage.getByRole('button', { name: 'CREATE TABLE' }).first()).toBeVisible({ timeout: 30000 });
      const joinCode = await createTableFromLobby(hostPage);

      await openClaimLobbyFromHome(guestPage);
      await joinTableByCode(guestPage, joinCode);

      const message = `claim proof ${Date.now()}`;
      await hostPage.getByLabel('Room chat message').fill(message);
      await hostPage.locator('form').filter({ has: hostPage.getByLabel('Room chat message') }).getByRole('button', { name: 'SEND' }).click();
      await expect(guestPage.getByText(message).first()).toBeVisible({ timeout: 15000 });

      await readyPlayer(guestPage);
      await readyPlayer(hostPage);

      await Promise.all([
        hostPage.waitForURL(escapedPathRegex(ClaimPlayPath), { timeout: 30000 }),
        guestPage.waitForURL(escapedPathRegex(ClaimPlayPath), { timeout: 30000 }),
        hostPage.getByRole('button', { name: 'START', exact: true }).click(),
      ]);

      const hostInitialState = await waitForClaimPilotReady(hostPage);
      const guestInitialState = await waitForClaimPilotReady(guestPage);
      expectClaimInitialDeal(hostInitialState);
      expectClaimInitialDeal(guestInitialState);

      const finalState = await driveClaimPilotToCompletion(hostPage);
      await expect(hostPage.getByText(/Winner:|Tie game/).first()).toBeVisible({ timeout: 20000 });
      expect(finalState.isGameOver).toBe(true);
      expect(finalState.round).toBeGreaterThan(1);
      expect(finalState.players.some((player) => player.finalRoundScore !== null)).toBe(true);
      expect(finalState.players.some((player) => player.settlementDelta !== null)).toBe(true);
    } finally {
      await closeContexts(contexts);
    }
  });
});
