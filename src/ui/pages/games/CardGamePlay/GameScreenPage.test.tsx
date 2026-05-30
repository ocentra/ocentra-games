import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GamePhase, Suit, type Card, type GameState, type Player } from '@ocentra/game-domain/types/game';
import { createRuntimeCard } from '@ocentra/game-domain/deck/runtimeDeck';
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
  useLocation: () => ({ search: '' }),
  useNavigate: () => mockNavigate,
}));

vi.mock('@ocentra/core-ui/Header/UnifiedHeader', () => ({
  UnifiedHeader: () => <div data-testid="mock-unified-header" />,
}));

vi.mock('@ocentra/core-ui/Footer/GameFooter', () => ({
  GameFooter: () => <div data-testid="mock-footer" />,
}));

vi.mock('@/hooks/useCoreUIHeaderProps', () => ({
  useCoreUIHeaderProps: () => ({}),
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
  return createRuntimeCard({
    id,
    suit,
    value,
  });
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
      { id: 1, label: 'p2', position: { x: 0.12, y: 0.5 }, rotation: 0, scale: 0.5 },
      { id: 2, label: 'p3', position: { x: 0.5, y: 0.16 }, rotation: 0, scale: 0.5 },
      { id: 3, label: 'p4', position: { x: 0.88, y: 0.5 }, rotation: 0, scale: 0.5 },
    ],
  };

  const spec: MechanicsSpec = {
    familyKernel: 'claim',
    kernelVersion: 'claim-hoarder@2.0.0',
    playerConfig: {
      playerMode: 'multiplayer',
      minPlayers: 4,
      maxPlayers: 4,
      optimalPlayers: 4,
      dealerRotates: true,
    },
    phases: [
      {
        id: 'setup_round',
        label: 'Setup Round',
        actor: 'system',
        legalActions: ['setup_round'],
        nextPhase: 'turn_loop',
        isMandatory: true,
        conditionalNext: [],
        cardVisibilityChanges: {},
      },
      {
        id: 'turn_loop',
        label: 'Turn',
        actor: 'current_player',
        legalActions: ['take_stock', 'take_discard', 'discard_card', 'declare_suit', 'end_turn', 'call_showdown'],
        nextPhase: null,
        isMandatory: true,
        conditionalNext: [],
        cardVisibilityChanges: {},
      },
      {
        id: 'score_round',
        label: 'Score Round',
        actor: 'system',
        legalActions: ['score_round'],
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
      startsWith: 'left_of_dealer',
      timerSeconds: 60,
    },
    endConditions: [],
    deckType: 'Standard 52',
    suitSet: 'French',
    familyConfig: {
      maxRounds: 10,
      minHandSize: 3,
      showdownMinimum: 27,
      startingBankroll: 1352,
    },
  };

  return {
    gameId: 'claim',
    displayName: 'Claim',
    familyKernel: 'claim',
    playerCount: 4,
    deckSize: 52,
    gameMode: {
      baseBet: 10,
      maxRounds: 10,
    } as never,
    mechanics: {} as never,
    spec,
    layoutDocument: normalizeCardGameLayoutDocument({
      defaultPlayerCount: 4,
      presets: { '4': layoutPreset },
      gameplay: {},
      extensions: {},
      cardStrip: {
        slots: [
          {
            id: 'stock_top',
            label: 'STOCK',
            previewFaceUp: false,
            binding: 'gameState.deck.0',
          },
          {
            id: 'discard_top',
            label: 'DISCARD',
            previewFaceUp: false,
            binding: 'gameState.discardPile',
          },
        ],
      },
      zones: [
        {
          id: 'discard',
          label: 'Discard Top',
          type: 'card',
          position: { x: 0.43, y: 0.5 },
          size: { width: 0.15, height: 0.22 },
          scale: 1,
          rotation: 0,
          engineBinding: 'discardPile',
          emptyText: 'No Discard',
        },
        {
          id: 'stock_top',
          label: 'Stock Top',
          type: 'card',
          position: { x: 0.57, y: 0.5 },
          size: { width: 0.15, height: 0.22 },
          scale: 1,
          rotation: 0,
          engineBinding: 'deck.0',
          emptyText: 'Empty',
        },
      ],
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
        [
          createCard('14_of_hearts', Suit.HEARTS, 14),
          createCard('13_of_hearts', Suit.HEARTS, 13),
          createCard('12_of_hearts', Suit.HEARTS, 12),
          createCard('11_of_spades', Suit.SPADES, 11),
        ],
        3,
        Suit.HEARTS,
      ),
      createPlayer(
        'p2',
        'Seat 2',
        [
          createCard('7_of_clubs', Suit.CLUBS, 7),
          createCard('8_of_clubs', Suit.CLUBS, 8),
          createCard('9_of_clubs', Suit.CLUBS, 9),
        ],
        1,
      ),
      createPlayer(
        'p3',
        'Seat 3',
        [
          createCard('2_of_spades', Suit.SPADES, 2),
          createCard('3_of_spades', Suit.SPADES, 3),
          createCard('4_of_spades', Suit.SPADES, 4),
        ],
        0,
      ),
      createPlayer(
        'p4',
        'Seat 4',
        [
          createCard('5_of_diamonds', Suit.DIAMONDS, 5),
          createCard('6_of_diamonds', Suit.DIAMONDS, 6),
          createCard('7_of_diamonds', Suit.DIAMONDS, 7),
        ],
        0,
      ),
    ],
    currentPlayer: 0,
    phase: GamePhase.PLAYER_ACTION,
    deck: [createCard('3_of_spades', Suit.SPADES, 3), createCard('4_of_spades', Suit.SPADES, 4)],
    floorCard: null,
    discardPile: [createCard('5_of_clubs', Suit.CLUBS, 5)],
    round: 2,
    startTime: new Date('2026-04-17T00:00:00.000Z'),
    lastAction: new Date('2026-04-17T00:00:00.000Z'),
    mechanicsPhaseId: 'turn_loop',
    mechanicsContext: {
      dealerIndex: 0,
      showdownCallerId: null,
      revealedPlayerIds: [],
      lastMechanicsAction: 'declare_suit',
      tableCards: [],
      capturedCardsByPlayerId: {},
      foldedPlayerIds: [],
      roundPot: 0,
      trumpCard: null,
      familyState: {
        bankrollByPlayerId: {
          p1: 1352,
          p2: 1352,
          p3: 1352,
          p4: 1352,
        },
        declaredSuitByPlayerId: {
          p1: Suit.HEARTS,
        },
        eliminatedPlayerIds: [],
        undeclaredDebtByPlayerId: {
          p1: 0,
          p2: 0,
          p3: 0,
          p4: 0,
        },
        turn: {
          discarded: false,
          taken: false,
        },
      },
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
    expect(screen.getByText(/Preparing Table/i)).toBeTruthy();
    expect(screen.getByText(/Dealing a 4-player table in 3/i)).toBeTruthy();
    expect(screen.getByTestId('claim-pilot-redeal')).toBeTruthy();
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
      await Promise.resolve();
    });
    expect(screen.getByText(/Dealing a 4-player table in 3/i)).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3100);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('claim-pilot-redeal')).toBeTruthy();
    expect(screen.getByTestId('claim-pilot-stock_top-zone')).toBeTruthy();
    expect(screen.getByTestId('claim-pilot-discard-zone')).toBeTruthy();
    expect(screen.queryByText('Turn Loop')).toBeNull();
    expect(document.querySelector('.turn-timer__progress')).toBeTruthy();
    expect(screen.queryByText('Table Cards')).toBeNull();
    expect(screen.queryByText('Floor Card')).toBeNull();
    expect(screen.getByRole('img', { name: 'Scoreboard' })).toBeTruthy();
    expect(screen.getByText('BET')).toBeTruthy();
    expect(screen.getAllByText('10').length).toBeGreaterThan(0);
    expect(processPlayerActionMock).not.toHaveBeenCalled();
  });
});
