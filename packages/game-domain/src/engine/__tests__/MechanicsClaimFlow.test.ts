import { describe, expect, it } from 'vitest';
import { GameEngine } from '@/engine/GameEngine';
import { calculateClaimPlayerScore, createClaimBotAction } from '@/engine/mechanics/family/ClaimFamilyResolver';
import type { IDeckProvider } from '@/interfaces/IDeckProvider';
import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';
import { GamePhase, Suit, type Card, type CardValue, type Player } from '@/types/game';

class OrderedDeckProvider implements IDeckProvider {
  private readonly deck: Card[];
  private seed = 1;

  constructor(deck: Card[]) {
    this.deck = deck;
  }

  async createStandardDeck(): Promise<Card[]> {
    return [...this.deck];
  }

  shuffleDeck(deck: Card[]): Card[] {
    return [...deck];
  }

  dealInitialHands(deck: Card[], playerCount: number, handSize: number): { hands: Card[][]; remainingDeck: Card[] } {
    const hands: Card[][] = Array.from({ length: playerCount }, () => []);
    const remainingDeck = [...deck];

    for (let cardIndex = 0; cardIndex < handSize; cardIndex += 1) {
      for (let playerIndex = 0; playerIndex < playerCount; playerIndex += 1) {
        const card = remainingDeck.shift();
        if (card) {
          hands[playerIndex].push(card);
        }
      }
    }

    return { hands, remainingDeck };
  }

  drawCard(deck: Card[]): { card: Card | null; remainingDeck: Card[] } {
    const remainingDeck = [...deck];
    return {
      card: remainingDeck.shift() ?? null,
      remainingDeck,
    };
  }

  getSeed(): number {
    return this.seed;
  }

  setSeed(seed: number): void {
    this.seed = seed;
  }
}

function card(suit: Suit, value: CardValue): Card {
  return {
    id: `${value}_of_${suit}`,
    suit,
    value,
  };
}

function createPlayer(hand: Card[], declaredSuit: Suit | null = null): Player {
  return {
    aiPersonality: undefined,
    avatar: '',
    declaredSuit,
    hand,
    id: 'p1',
    intentCard: null,
    isAI: false,
    isConnected: true,
    name: 'Player 1',
    score: 1352,
  };
}

function createClaimSpec(maxRounds = 1): MechanicsSpec {
  return {
    actions: {
      call_showdown: {
        description: 'Call showdown.',
        effectHints: {},
        effectType: 'call_showdown',
        isTerminating: true,
        supported: true,
      },
      declare_suit: {
        description: 'Secretly declare a suit.',
        effectHints: {},
        effectType: 'declare',
        isTerminating: false,
        supported: true,
      },
      discard_card: {
        description: 'Discard one card.',
        effectHints: {},
        effectType: 'discard',
        isTerminating: false,
        supported: true,
      },
      end_turn: {
        description: 'End the current turn.',
        effectHints: {},
        effectType: 'pass',
        isTerminating: true,
        supported: true,
      },
      take_discard: {
        description: 'Take the top discard.',
        effectHints: {},
        effectType: 'draw',
        isTerminating: false,
        supported: true,
      },
      take_stock: {
        description: 'Take the top stock card.',
        effectHints: {},
        effectType: 'draw',
        isTerminating: false,
        supported: true,
      },
      timeout_turn: {
        description: 'Resolve a timed-out turn.',
        effectHints: {},
        effectType: 'timeout',
        isTerminating: true,
        supported: true,
      },
    },
    constants: {
      maxRounds,
      minHandSize: 3,
      showdownMinimum: 27,
      startingBankroll: 1352,
    },
    customActions: [
      {
        description: 'Deal fresh Claim round.',
        effectHints: {},
        effectType: 'setup_round',
        id: 'setup_round',
        isTerminating: false,
        supported: true,
      },
      {
        description: 'Score Claim round.',
        effectHints: {},
        effectType: 'score_round',
        id: 'score_round',
        isTerminating: false,
        supported: true,
      },
    ],
    deckCount: 1,
    deckType: 'Standard 52',
    enabledModules: [
      {
        id: 'claim.runtime',
        kind: 'family',
        executorId: 'claim.hoarder.v1',
        enabled: true,
      },
    ],
    endConditions: [],
    familyConfig: {
      maxRounds,
      minHandSize: 3,
      showdownMinimum: 27,
      startingBankroll: 1352,
    },
    familyKernel: 'claim',
    finalHandSize: 0,
    initialHandSize: 3,
    kernelVersion: 'test@2.0.0',
    phases: [
      {
        actor: 'system',
        cardVisibilityChanges: {},
        conditionalNext: [],
        id: 'setup_round',
        isMandatory: true,
        label: 'Setup Round',
        legalActions: ['setup_round'],
        nextPhase: 'turn_loop',
        totalLoops: null,
        loopIndex: null,
      },
      {
        actor: 'current_player',
        cardVisibilityChanges: {},
        conditionalNext: [],
        id: 'turn_loop',
        isMandatory: true,
        label: 'Turn Loop',
        legalActions: ['take_stock', 'take_discard', 'discard_card', 'declare_suit', 'end_turn', 'timeout_turn', 'call_showdown'],
        nextPhase: null,
        totalLoops: null,
        loopIndex: null,
      },
      {
        actor: 'system',
        cardVisibilityChanges: {},
        conditionalNext: [
          {
            condition: 'game_end_reached',
            nextPhase: null,
          },
          {
            condition: 'start_next_round',
            nextPhase: 'setup_round',
          },
        ],
        id: 'score_round',
        isMandatory: true,
        label: 'Score Round',
        legalActions: ['score_round'],
        nextPhase: null,
        totalLoops: null,
        loopIndex: null,
      },
    ],
    playerConfig: {
      dealerRotates: true,
      maxPlayers: 4,
      minPlayers: 4,
      optimalPlayers: 4,
      playerMode: 'multiplayer',
    },
    rankSet: 'Standard_52',
    roundConfig: {
      maxRounds,
    },
    runtimeIntegration: {
      resolverName: 'claim.hoarder.v1',
    },
    suitSet: 'French',
    turnPolicy: {
      direction: 'clockwise',
      startsWith: 'left_of_dealer',
      timerSeconds: 60,
    },
    zones: [],
  };
}

describe('Claim hoarder scoring', () => {
  it('scores circular Ace runs as one maximal run with singles counted once', () => {
    const player = createPlayer([
      card(Suit.SPADES, 13),
      card(Suit.SPADES, 14),
      card(Suit.SPADES, 2),
      card(Suit.SPADES, 3),
      card(Suit.HEARTS, 9),
    ], Suit.SPADES);

    const score = calculateClaimPlayerScore(player, Suit.SPADES, 4);

    expect(score.positive).toBe((13 + 14 + 2 + 3) * 4);
    expect(score.negative).toBe(9);
    expect(score.finalScore).toBe(128 - 9 - 4);
  });

  it('scores undeclared hands entirely negative', () => {
    const player = createPlayer([
      card(Suit.SPADES, 2),
      card(Suit.SPADES, 3),
      card(Suit.SPADES, 4),
      card(Suit.CLUBS, 11),
    ]);

    const score = calculateClaimPlayerScore(player, null, 13);

    expect(score.positive).toBe(0);
    expect(score.negative).toBe(27 + 11);
    expect(score.finalScore).toBe(-51);
  });
});

describe('GameEngine Claim mechanics flow', () => {
  it('does not add debt when an undeclared player ends a no-action turn', async () => {
    const deck = [
      card(Suit.HEARTS, 5), card(Suit.SPADES, 13), card(Suit.CLUBS, 7), card(Suit.DIAMONDS, 9),
      card(Suit.CLUBS, 8), card(Suit.SPADES, 14), card(Suit.HEARTS, 6), card(Suit.DIAMONDS, 10),
      card(Suit.DIAMONDS, 4), card(Suit.SPADES, 2), card(Suit.CLUBS, 11), card(Suit.HEARTS, 12),
      card(Suit.SPADES, 3), card(Suit.HEARTS, 2),
    ];
    const engine = new GameEngine({
      deckProvider: new OrderedDeckProvider(deck),
    });
    await engine.initializeGame({ maxPlayers: 4, enablePhysics: false, seed: 1 });
    engine.loadMechanicsSpec(createClaimSpec(2));
    ['p1', 'p2', 'p3', 'p4'].forEach((id, index) => {
      engine.addPlayer({ id, name: `Player ${index + 1}` });
    });

    await engine.startGame();
    const startedState = engine.getGameState()!;
    const result = engine.processPlayerAction({
      playerId: 'p2',
      timestamp: new Date(startedState.lastAction.getTime() + 1000),
      type: 'end_turn',
    });

    expect(result.isValid).toBe(true);
    const nextState = engine.getGameState()!;
    const claimState = nextState.mechanicsContext?.familyState as {
      undeclaredDebtByPlayerId?: Record<string, number>;
    };
    expect(claimState.undeclaredDebtByPlayerId?.p2).toBe(0);
  });

  it('creates deterministic bot actions from the Claim executor', async () => {
    const deck = [
      card(Suit.HEARTS, 5), card(Suit.SPADES, 13), card(Suit.CLUBS, 7), card(Suit.DIAMONDS, 9),
      card(Suit.CLUBS, 8), card(Suit.SPADES, 14), card(Suit.HEARTS, 6), card(Suit.DIAMONDS, 10),
      card(Suit.DIAMONDS, 4), card(Suit.SPADES, 2), card(Suit.CLUBS, 11), card(Suit.HEARTS, 12),
      card(Suit.SPADES, 3), card(Suit.HEARTS, 2),
    ];
    const engine = new GameEngine({
      deckProvider: new OrderedDeckProvider(deck),
    });
    const spec = createClaimSpec(2);
    await engine.initializeGame({ maxPlayers: 4, enablePhysics: false, seed: 1 });
    engine.loadMechanicsSpec(spec);
    ['p1', 'p2', 'p3', 'p4'].forEach((id, index) => {
      engine.addPlayer({ id, name: `Player ${index + 1}`, isAI: index > 0 });
    });

    await engine.startGame();
    const action = createClaimBotAction(engine.getGameState()!, spec, 'p2', { seed: 42 });

    expect(action).toMatchObject({
      playerId: 'p2',
      type: 'declare_suit',
      data: { suit: Suit.SPADES },
    });
  });

  it('plays a secret-declare showdown and applies raw plus winner-difference settlement', async () => {
    const deck = [
      card(Suit.HEARTS, 5), card(Suit.SPADES, 13), card(Suit.CLUBS, 7), card(Suit.DIAMONDS, 9),
      card(Suit.CLUBS, 8), card(Suit.SPADES, 14), card(Suit.HEARTS, 6), card(Suit.DIAMONDS, 10),
      card(Suit.DIAMONDS, 4), card(Suit.SPADES, 2), card(Suit.CLUBS, 11), card(Suit.HEARTS, 12),
      card(Suit.SPADES, 3), card(Suit.HEARTS, 2),
    ];
    const engine = new GameEngine({
      deckProvider: new OrderedDeckProvider(deck),
    });
    await engine.initializeGame({ maxPlayers: 4, enablePhysics: false, seed: 1 });
    engine.loadMechanicsSpec(createClaimSpec(1));
    ['p1', 'p2', 'p3', 'p4'].forEach((id, index) => {
      engine.addPlayer({ id, name: `Player ${index + 1}` });
    });

    await engine.startGame();

    const startedState = engine.getGameState()!;
    expect(startedState.mechanicsPhaseId).toBe('turn_loop');
    expect(startedState.phase).toBe(GamePhase.PLAYER_ACTION);
    expect(startedState.currentPlayer).toBe(1);
    expect(startedState.floorCard).toBeNull();
    expect(startedState.discardPile).toHaveLength(0);
    expect(startedState.players[1].hand.map((entry) => entry.value)).toEqual([13, 14, 2]);

    const declareResult = engine.processPlayerAction({
      data: { suit: Suit.SPADES },
      playerId: 'p2',
      timestamp: new Date(startedState.lastAction.getTime() + 1000),
      type: 'declare_suit',
    });
    expect(declareResult.isValid).toBe(true);

    const showdownState = engine.getGameState()!;
    const showdownResult = engine.processPlayerAction({
      playerId: 'p2',
      timestamp: new Date(showdownState.lastAction.getTime() + 1000),
      type: 'call_showdown',
    });
    expect(showdownResult.isValid).toBe(true);

    const endedState = engine.getGameState()!;
    const claimState = endedState.mechanicsContext?.familyState as {
      roundScoresByPlayerId?: Record<string, { finalScore: number }>;
      settlementByPlayerId?: Record<string, { totalDelta: number }>;
    };

    expect(endedState.phase).toBe(GamePhase.GAME_END);
    expect(claimState.roundScoresByPlayerId?.p2?.finalScore).toBe((13 + 14 + 2) * 3);
    expect(claimState.settlementByPlayerId?.p2?.totalDelta).toBeGreaterThan(claimState.roundScoresByPlayerId?.p2?.finalScore ?? 0);
    expect(endedState.players[1].score).toBe(1352 + (claimState.settlementByPlayerId?.p2?.totalDelta ?? 0));
  });
});
