import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GamePhase, Suit, type Card, type GameState, type Player } from '@ocentra/game-domain/types/game';
import type { MechanicsSpec } from '@ocentra/game-domain/engine/mechanics/MechanicsSpec';
import { normalizeCardGameLayoutDocument } from '@ocentra/game-layout-domain/cardGameLayoutRuntime';
import { GameScreenPage } from './GameScreenPage';

const mockNavigate = vi.fn();
const loadLocalPlayableGameMock = vi.fn();
const gameEngineFactoryMock = vi.fn();
const initializeGameMock = vi.fn(async () => {});
const loadMechanicsSpecMock = vi.fn();
const addPlayerMock = vi.fn();
const processPlayerActionMock = vi.fn(() => ({ isValid: true, errors: [] }));

let currentState: GameState;
let subscribers: Array<(state: GameState) => void> = [];

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@ocentra/core-ui', () => ({
  GameHeader: () => <div data-testid="mock-game-header" />,
}));

vi.mock('@/hooks/useCoreUIHeaderProps', () => ({
  useCoreUIHeaderProps: () => ({}),
}));

vi.mock('@/ui/components/AppFooter', () => ({
  AppFooter: () => <div data-testid="mock-footer" />,
}));

vi.mock('@/ui/components/GameScreen/CardGameScreen/CardGameComponents/GameBackground', () => ({
  default: () => <div data-testid="mock-background" />,
}));

vi.mock('@/ui/components/GameScreen/CardGameScreen/CardGameComponents/CenterTableSvg', () => ({
  default: ({ containerClassName }: { containerClassName?: string }) => (
    <div data-testid="mock-center-table" className={containerClassName} />
  ),
}));

vi.mock('./playableSession', async () => {
  const actual = await vi.importActual<typeof import('./playableSession')>('./playableSession');
  return {
    ...actual,
    loadLocalPlayableGame: (...args: unknown[]) => loadLocalPlayableGameMock(...args),
  };
});

vi.mock('@ocentra/game-domain/engine/GameEngine', () => ({
  GameEngine: vi.fn().mockImplementation(function MockGameEngine() {
    return gameEngineFactoryMock();
  }),
}));

function createCard(id: string, suit: Suit, value: Card['value']): Card {
  return {
    id,
    suit,
    value,
  };
}

function createPlayer(id: string, name: string, hand: Card[], score: number, declaredSuit: Suit | null = null): Player {
  return {
    id,
    name,
    avatar: '',
    hand,
    declaredSuit,
    intentCard: null,
    score,
    isConnected: true,
    isAI: false,
  };
}

function createClaimBundle() {
  const layoutPreset = {
    table: {
      width: 960,
      height: 560,
      offsetX: 0,
      offsetY: -78,
      curvature: 0.88,
      feltInset: -8,
    },
    seats: [
      { id: 0, label: 'p1', position: { x: 0.5, y: 0.84 }, rotation: 0, scale: 0.5 },
      { id: 1, label: 'p2', position: { x: 0.5, y: 0.16 }, rotation: 0, scale: 0.5 },
    ],
  };

  const spec: MechanicsSpec = {
    familyKernel: 'claim',
    kernelVersion: '1.0.0',
    playerConfig: {
      playerMode: 'multiplayer',
      minPlayers: 2,
      maxPlayers: 2,
      optimalPlayers: 2,
      dealerRotates: true,
    },
    phases: [
      {
        id: 'turn_loop',
        label: 'Turn Loop',
        actor: 'current_player',
        legalActions: ['pass', 'pick_up', 'declare', 'call_showdown'],
        nextPhase: 'showdown',
        isMandatory: true,
        conditionalNext: [],
        cardVisibilityChanges: {},
      },
      {
        id: 'showdown',
        label: 'Showdown',
        actor: 'current_player',
        legalActions: ['reveal_hand'],
        nextPhase: null,
        isMandatory: true,
        conditionalNext: [],
        cardVisibilityChanges: {},
      },
    ],
    actions: {},
    customActions: [],
    zones: [],
    turnPolicy: {
      direction: 'clockwise',
      startsWith: 'dealer_left',
    },
    endConditions: [],
    deckType: 'Standard 52',
    suitSet: 'French',
  };

  return {
    gameId: 'claim',
    displayName: 'Claim',
    familyKernel: 'claim',
    playerCount: 2,
    deckSize: 52,
    gameMode: {} as never,
    mechanics: {} as never,
    spec,
    layoutDocument: normalizeCardGameLayoutDocument({
      defaultPlayerCount: 2,
      presets: { '2': layoutPreset },
      gameplay: {},
      extensions: {},
    }),
    layoutPreset,
    createDeckProvider: vi.fn(() => ({
      createStandardDeck: async () => [],
      shuffleDeck: (deck: Card[]) => deck,
      dealInitialHands: () => ({ hands: [], remainingDeck: [] }),
      drawCard: () => ({ card: null, remainingDeck: [] }),
      getSeed: () => 42,
      setSeed: () => {},
    })),
  };
}

function createActiveClaimState(): GameState {
  return {
    id: 'claim-local-game',
    players: [
      createPlayer(
        'p1',
        'You',
        [createCard('14_of_hearts', Suit.HEARTS, 14), createCard('11_of_spades', Suit.SPADES, 11)],
        3,
        Suit.HEARTS,
      ),
      createPlayer('p2', 'Seat 2', [createCard('7_of_clubs', Suit.CLUBS, 7)], 1),
    ],
    currentPlayer: 0,
    phase: GamePhase.PLAYER_ACTION,
    deck: [createCard('3_of_spades', Suit.SPADES, 3), createCard('4_of_spades', Suit.SPADES, 4)],
    floorCard: createCard('2_of_hearts', Suit.HEARTS, 2),
    discardPile: [createCard('5_of_clubs', Suit.CLUBS, 5)],
    round: 2,
    startTime: new Date('2026-04-17T00:00:00.000Z'),
    lastAction: new Date('2026-04-17T00:00:00.000Z'),
    mechanicsPhaseId: 'turn_loop',
    mechanicsContext: {
      dealerIndex: 0,
      showdownCallerId: null,
      revealedPlayerIds: [],
      lastMechanicsAction: 'declare',
      tableCards: [{ playerId: 'p1', card: createCard('8_of_hearts', Suit.HEARTS, 8) }],
      capturedCardsByPlayerId: {},
      foldedPlayerIds: [],
      roundPot: 6,
      trumpCard: null,
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  subscribers = [];
  currentState = createActiveClaimState();
  mockNavigate.mockReset();
  loadLocalPlayableGameMock.mockReset();
  gameEngineFactoryMock.mockReset();
  initializeGameMock.mockClear();
  loadMechanicsSpecMock.mockClear();
  addPlayerMock.mockClear();
  processPlayerActionMock.mockClear();

  gameEngineFactoryMock.mockReturnValue({
    initializeGame: initializeGameMock,
    loadMechanicsSpec: loadMechanicsSpecMock,
    addPlayer: addPlayerMock,
    subscribeToUpdates: vi.fn((callback: (state: GameState) => void) => {
      subscribers.push(callback);
      return () => {
        subscribers = subscribers.filter((entry) => entry !== callback);
      };
    }),
    startGame: vi.fn(async () => {
      subscribers.forEach((callback) => callback(currentState));
    }),
    getGameState: vi.fn(() => currentState),
    processPlayerAction: processPlayerActionMock,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('GameScreenPage', () => {
  it('shows the local pilot readiness error for unsupported pilots', async () => {
    loadLocalPlayableGameMock.mockResolvedValue({
      bundle: null,
      error: 'three-card-brag local pilot is not ready yet. Claim is the first supported local pilot.',
    });

    render(<GameScreenPage gameModeId="three-card-brag" />);

    expect(
      await screen.findByText(/three-card-brag local pilot is not ready yet/i),
    ).toBeTruthy();
  });

  it('renders the staged Claim table and countdown before the first deal', async () => {
    loadLocalPlayableGameMock.mockResolvedValue({
      bundle: createClaimBundle(),
      error: null,
    });

    render(<GameScreenPage gameModeId="claim" />);

    expect(await screen.findByTestId('claim-pilot-table')).toBeTruthy();
    expect(screen.getByText(/Starting local pilot/i)).toBeTruthy();
    expect(screen.getByText(/Starting in 3/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /start match/i })).toBeNull();
  });

  it('auto-starts the Claim match and renders the live template table state', async () => {
    vi.useFakeTimers();
    loadLocalPlayableGameMock.mockResolvedValue({
      bundle: createClaimBundle(),
      error: null,
    });

    render(<GameScreenPage gameModeId="claim" />);

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(3100);
      await Promise.resolve();
    });

    expect(screen.getByTestId('claim-pilot-current-hand')).toBeTruthy();
    expect(screen.getByText('Deck')).toBeTruthy();
    expect(screen.getByText('Floor Card')).toBeTruthy();
    expect(screen.getByText('Pot')).toBeTruthy();
    expect(processPlayerActionMock).not.toHaveBeenCalled();
  });
});
