import { expect, test } from '@playwright/test';
import {
  attachPilotDiagnostics,
  ClaimPlayPath,
  driveClaimPilotToCompletion,
  expectClaimInitialDeal,
  readPilotRuntimeState,
  waitForClaimPilotReady,
} from './claim-pilot-e2e-helpers';

test.describe.configure({ timeout: 120000 });

test.describe('Claim local pilot', () => {
  test('loads the asset-backed Claim pilot with a real deal and legal first action state', async ({ page }) => {
    attachPilotDiagnostics(page);

    await page.goto(`${ClaimPlayPath}?seed=42&autoStartSeconds=0&botDelayMs=25`, { waitUntil: 'domcontentloaded' });

    const state = await waitForClaimPilotReady(page);
    expectClaimInitialDeal(state);
    await expect(page.getByRole('button', { name: /^(Declare|Stock|Discard|Drop|Done|Pass|Showdown)/ }).first()).toBeVisible({ timeout: 20000 });
  });

  test('plays Claim through scoring, round advancement, and final game result', async ({ page }) => {
    attachPilotDiagnostics(page);

    await page.goto(`${ClaimPlayPath}?seed=42&autoStartSeconds=0&botDelayMs=25`, { waitUntil: 'domcontentloaded' });

    const initialState = await waitForClaimPilotReady(page);
    expectClaimInitialDeal(initialState);

    const finalState = await driveClaimPilotToCompletion(page);
    await expect(page.getByText(/Winner:|Tie game/).first()).toBeVisible({ timeout: 20000 });
    expect(finalState.isGameOver).toBe(true);
    expect(finalState.round).toBeGreaterThan(1);
    expect(finalState.players.some((player) => player.finalRoundScore !== null)).toBe(true);
    expect(finalState.players.some((player) => player.settlementDelta !== null)).toBe(true);
  });

  test('keeps invalid showdown hidden until the current player has a valid claim', async ({ page }) => {
    attachPilotDiagnostics(page);

    await page.goto(`${ClaimPlayPath}?seed=42&autoStartSeconds=0&botDelayMs=25`, { waitUntil: 'domcontentloaded' });

    let state = await waitForClaimPilotReady(page);
    expect(state.hudActions.some((action) => action.kind === 'call_showdown')).toBe(false);

    await page.getByRole('button', { name: /^Declare / }).first().click();
    await expect.poll(async () => {
      state = await readPilotRuntimeState(page);
      return state.players.find((player) => !player.isAI)?.declaredSuit ?? null;
    }, { timeout: 20000 }).not.toBeNull();

    state = await readPilotRuntimeState(page);
    if (state.players.find((player) => !player.isAI)?.finalRoundScore === null) {
      expect(state.hudActions.some((action) => action.kind === 'call_showdown')).toBe(false);
    }
  });

  test('shows a readiness error for unsupported pilot routes', async ({ page }) => {
    attachPilotDiagnostics(page);

    await page.goto('/games/three-card-brag/play', { waitUntil: 'domcontentloaded' });

    await expect(page.getByText(/local pilot is not ready yet/i)).toBeVisible({ timeout: 20000 });
  });
});
