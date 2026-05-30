import { expect, type Page } from '@playwright/test';
import {
  buildPublicGameLobbyPath,
  buildPublicGamePath,
  buildPublicGamePlayPath,
} from '@ocentra/endpoint-domain/constants/public-routes';

export const ClaimGameId = 'claim:ddc6d965-14a7-4586-8a15-674e0daf8b5c';
export const ClaimGamePath = buildPublicGamePath(ClaimGameId);
export const ClaimLobbyPath = buildPublicGameLobbyPath(ClaimGameId);
export const ClaimPlayPath = buildPublicGamePlayPath(ClaimGameId);

type PilotHudActionKind =
  | 'call_showdown'
  | 'declare'
  | 'discard_card'
  | 'end_turn'
  | 'pass'
  | 'pick_up'
  | 'reveal_hand'
  | 'take_discard'
  | 'take_stock';

interface PilotHudAction {
  kind: PilotHudActionKind;
  label: string;
}

interface PilotPlayerState {
  bankroll: number | null;
  debt: number;
  declaredSuit: string | null;
  eliminated: boolean;
  finalRoundScore: number | null;
  handCount: number;
  id: string;
  isAI: boolean;
  name: string;
  score: number;
  settlementDelta: number | null;
}

export interface PilotRuntimeState {
  capturedCount: number | null;
  countdown: number | null;
  currentPlayer: {
    handCount: number;
    id: string;
    index: number | null;
    isAI: boolean;
    name: string;
  } | null;
  deckCount: number | null;
  discardCount: number | null;
  displayName: string;
  error: string | null;
  gameId: string;
  hudActions: PilotHudAction[];
  isGameOver: boolean;
  legalActions: string[];
  loading: boolean;
  mechanicsPhaseId: string | null;
  phase: string | null;
  playerCount: number;
  players: PilotPlayerState[];
  ready: boolean;
  round: number | null;
  seed: number;
  showdownCallerId: string | null;
  sourceDeckSize: number;
  tableCount: number | null;
  winnersText: string | null;
}

export function attachPilotDiagnostics(page: Page): void {
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
}

export async function readPilotRuntimeState(page: Page): Promise<PilotRuntimeState> {
  const text = await page.getByTestId('local-pilot-runtime-state').textContent({ timeout: 30000 });
  expect(text).toBeTruthy();
  return JSON.parse(text || '{}') as PilotRuntimeState;
}

function runtimeSignature(state: PilotRuntimeState): string {
  return JSON.stringify({
    capturedCount: state.capturedCount,
    currentPlayer: state.currentPlayer?.id ?? null,
    deckCount: state.deckCount,
    discardCount: state.discardCount,
    error: state.error,
    hudActions: state.hudActions.map((action) => action.label),
    isGameOver: state.isGameOver,
    mechanicsPhaseId: state.mechanicsPhaseId,
    phase: state.phase,
    players: state.players.map((player) => ({
      bankroll: player.bankroll,
      debt: player.debt,
      declaredSuit: player.declaredSuit,
      finalRoundScore: player.finalRoundScore,
      handCount: player.handCount,
      id: player.id,
      score: player.score,
      settlementDelta: player.settlementDelta,
    })),
    round: state.round,
    showdownCallerId: state.showdownCallerId,
  });
}

async function waitForRuntimeSignatureChange(page: Page, previousSignature: string, timeout = 20000): Promise<PilotRuntimeState> {
  await expect.poll(async () => runtimeSignature(await readPilotRuntimeState(page)), { timeout }).not.toBe(previousSignature);
  return readPilotRuntimeState(page);
}

export async function waitForClaimPilotReady(page: Page): Promise<PilotRuntimeState> {
  await expect(page.getByTestId('local-pilot-runtime')).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId('claim-pilot-table')).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('group', { name: 'Card strip' })).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId('claim-pilot-redeal')).toBeVisible({ timeout: 60000 });
  await expect.poll(async () => {
    const state = await readPilotRuntimeState(page);
    return state.ready && state.phase !== null && state.players.length === 4 && state.deckCount !== null;
  }, { timeout: 60000 }).toBe(true);
  return readPilotRuntimeState(page);
}

export function expectClaimInitialDeal(state: PilotRuntimeState): void {
  expect(state.error).toBeNull();
  expect(state.gameId).toContain('claim');
  expect(state.playerCount).toBe(4);
  expect(state.players).toHaveLength(4);
  expect(state.players.filter((player) => player.isAI)).toHaveLength(3);
  expect(state.players.filter((player) => !player.isAI)).toHaveLength(1);
  expect(state.sourceDeckSize).toBeGreaterThan(0);
  expect(state.deckCount).not.toBeNull();
  expect(state.discardCount).not.toBeNull();
  expect(state.players.every((player) => player.handCount >= 3)).toBe(true);
  expect(state.legalActions.length).toBeGreaterThan(0);
  expect(state.hudActions.length).toBeGreaterThan(0);
}

function suitShortCode(suit: string | null): string | null {
  if (!suit) {
    return null;
  }
  const codes: Record<string, string> = {
    clubs: 'CL',
    diamonds: 'DI',
    hearts: 'HE',
    spades: 'SP',
  };
  return codes[suit] ?? suit.slice(0, 2).toUpperCase();
}

function labelSuitCode(label: string): string | null {
  const match = /\b(CL|DI|HE|SP)\b/.exec(label);
  return match?.[1] ?? null;
}

function chooseAction(state: PilotRuntimeState): PilotHudAction | null {
  const actions = state.hudActions;
  const declaredSuitCode = suitShortCode(state.players.find((player) => player.id === state.currentPlayer?.id)?.declaredSuit ?? null);
  const priorities: PilotHudActionKind[] = [
    'call_showdown',
    'declare',
    'take_discard',
    'take_stock',
    'discard_card',
    'end_turn',
    'pass',
    'reveal_hand',
    'pick_up',
  ];

  if (declaredSuitCode) {
    const matchingDiscard = actions.find((action) => action.kind === 'take_discard' && labelSuitCode(action.label) === declaredSuitCode);
    if (matchingDiscard) {
      return matchingDiscard;
    }
    const offSuitDrop = actions.find((action) => action.kind === 'discard_card' && labelSuitCode(action.label) !== declaredSuitCode);
    if (offSuitDrop) {
      return offSuitDrop;
    }
  }

  for (const kind of priorities) {
    const action = actions.find((entry) => entry.kind === kind);
    if (action) {
      return action;
    }
  }
  return actions[0] ?? null;
}

export async function driveClaimPilotToCompletion(page: Page, maxSteps = 260): Promise<PilotRuntimeState> {
  let state = await waitForClaimPilotReady(page);
  let sawScoring = state.mechanicsPhaseId === 'score_round' || state.players.some((player) => player.finalRoundScore !== null);
  let sawRoundAdvance = (state.round ?? 0) > 1;

  for (let step = 0; step < maxSteps; step += 1) {
    expect(state.error).toBeNull();
    if (state.isGameOver) {
      expect(sawScoring || state.players.some((player) => player.finalRoundScore !== null)).toBe(true);
      expect(sawRoundAdvance || (state.round ?? 0) > 1).toBe(true);
      expect(state.winnersText).toMatch(/Winner:|Tie game/);
      expect(state.players.some((player) => player.finalRoundScore !== null)).toBe(true);
      expect(state.players.some((player) => player.settlementDelta !== null)).toBe(true);
      return state;
    }

    const signature = runtimeSignature(state);
    if (state.currentPlayer?.isAI) {
      state = await waitForRuntimeSignatureChange(page, signature);
      sawScoring = sawScoring || state.mechanicsPhaseId === 'score_round' || state.players.some((player) => player.finalRoundScore !== null);
      sawRoundAdvance = sawRoundAdvance || (state.round ?? 0) > 1;
      continue;
    }

    const action = chooseAction(state);
    expect(action, `No available human action at step ${step}: ${JSON.stringify(state)}`).not.toBeNull();
    await page.getByRole('button', { name: action!.label, exact: true }).first().click({ timeout: 15000 });
    state = await waitForRuntimeSignatureChange(page, signature);
    sawScoring = sawScoring || state.mechanicsPhaseId === 'score_round' || state.players.some((player) => player.finalRoundScore !== null);
    sawRoundAdvance = sawRoundAdvance || (state.round ?? 0) > 1;
  }

  throw new Error(`Claim pilot did not complete in ${maxSteps} steps. Last state: ${JSON.stringify(state)}`);
}
