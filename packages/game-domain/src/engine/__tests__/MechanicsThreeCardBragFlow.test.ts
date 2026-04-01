import { describe, expect, it } from 'vitest';
import { GameEngine } from '@/engine/GameEngine';
import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';
import { GamePhase } from '@/types/game';
import { createFrench52DeckProvider } from '@/engine/__tests__/support/TestDeckProviders';

function createThreeCardBragSpec(): MechanicsSpec {
  return {
    familyKernel: 'three-card-brag',
    kernelVersion: 'test@1.0.0',
    playerConfig: {
      playerMode: 'multiplayer',
      minPlayers: 3,
      maxPlayers: 7,
      optimalPlayers: 4,
      dealerRotates: true,
    },
    phases: [
      {
        id: 'setup_round',
        label: 'Setup Round',
        actor: 'system',
        legalActions: ['setup_round'],
        nextPhase: 'betting_round',
        isMandatory: true,
        loopIndex: null,
        totalLoops: null,
        conditionalNext: [],
        cardVisibilityChanges: {},
      },
      {
        id: 'betting_round',
        label: 'Betting Round',
        actor: 'current_player',
        legalActions: ['bet', 'fold', 'call_showdown'],
        nextPhase: null,
        isMandatory: true,
        loopIndex: null,
        totalLoops: null,
        conditionalNext: [
          {
            condition: 'showdown_called',
            nextPhase: 'showdown',
          },
        ],
        cardVisibilityChanges: {},
      },
      {
        id: 'showdown',
        label: 'Showdown',
        actor: 'all_simultaneous',
        legalActions: ['reveal_hand'],
        nextPhase: 'score_round',
        isMandatory: true,
        loopIndex: null,
        totalLoops: null,
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
        loopIndex: null,
        totalLoops: null,
        conditionalNext: [
          {
            condition: 'game_end_reached',
            nextPhase: null,
          },
        ],
        cardVisibilityChanges: {},
      },
    ],
    actions: {
      bet: {
        supported: true,
        description: 'Bet into the pot.',
        effectType: 'bet',
        effectHints: {},
        isTerminating: true,
      },
      fold: {
        supported: true,
        description: 'Fold the hand.',
        effectType: 'fold',
        effectHints: {},
        isTerminating: true,
      },
      reveal_hand: {
        supported: true,
        description: 'Reveal the hand.',
        effectType: 'reveal_hand',
        effectHints: {},
        isTerminating: false,
      },
    },
    customActions: [
      {
        id: 'setup_round',
        supported: true,
        description: 'Deal three cards and seed the pot.',
        effectType: 'setup_round',
        effectHints: {},
        isTerminating: false,
      },
      {
        id: 'call_showdown',
        supported: true,
        description: 'Force showdown.',
        effectType: 'call_showdown',
        effectHints: {},
        isTerminating: true,
      },
      {
        id: 'score_round',
        supported: true,
        description: 'Score the pot.',
        effectType: 'score_round',
        effectHints: {},
        isTerminating: false,
      },
    ],
    zones: [],
    turnPolicy: {
      direction: 'clockwise',
      startsWith: 'left_of_dealer',
      timerSeconds: null,
    },
    endConditions: [],
    deckType: 'Standard 52',
    suitSet: 'French',
    rankSet: 'Standard_52',
    initialHandSize: 3,
    roundConfig: {
      maxRounds: 1,
    },
  };
}

describe('GameEngine Three Card Brag mechanics flow', () => {
  it('resolves a betting pilot hand through showdown', async () => {
    const engine = new GameEngine({
      deckProvider: createFrench52DeckProvider(23),
    });
    await engine.initializeGame({ maxPlayers: 3, enablePhysics: false, seed: 23 });
    engine.loadMechanicsSpec(createThreeCardBragSpec());
    engine.addPlayer({ id: 'p1', name: 'Player 1' });
    engine.addPlayer({ id: 'p2', name: 'Player 2' });
    engine.addPlayer({ id: 'p3', name: 'Player 3' });

    await engine.startGame();

    const startedState = engine.getGameState()!;
    expect(startedState.mechanicsPhaseId).toBe('betting_round');
    expect(startedState.mechanicsContext?.roundPot).toBe(3);

    const firstPlayer = startedState.players[startedState.currentPlayer];
    expect(engine.processPlayerAction({
      type: 'bet',
      playerId: firstPlayer.id,
      data: { amount: 2 },
      timestamp: new Date(startedState.lastAction.getTime() + 1000),
    }).isValid).toBe(true);

    const afterBet = engine.getGameState()!;
    const secondPlayer = afterBet.players[afterBet.currentPlayer];
    expect(engine.processPlayerAction({
      type: 'fold',
      playerId: secondPlayer.id,
      timestamp: new Date(afterBet.lastAction.getTime() + 1000),
    }).isValid).toBe(true);

    const afterFold = engine.getGameState()!;
    const thirdPlayer = afterFold.players[afterFold.currentPlayer];
    expect(engine.processPlayerAction({
      type: 'call_showdown',
      playerId: thirdPlayer.id,
      timestamp: new Date(afterFold.lastAction.getTime() + 1000),
    }).isValid).toBe(true);

    const showdownState = engine.getGameState()!;
    expect(showdownState.phase).toBe(GamePhase.SHOWDOWN);
    const activePlayers = showdownState.players.filter(
      (player) => !showdownState.mechanicsContext?.foldedPlayerIds.includes(player.id),
    );

    for (const [index, player] of activePlayers.entries()) {
      expect(engine.processPlayerAction({
        type: 'reveal_hand',
        playerId: player.id,
        timestamp: new Date(showdownState.lastAction.getTime() + (index + 1) * 1000),
      }).isValid).toBe(true);
    }

    const endedState = engine.getGameState()!;
    expect(endedState.phase).toBe(GamePhase.GAME_END);
    expect(endedState.players.reduce((total, player) => total + player.score, 0)).toBe(5);
  });
});
