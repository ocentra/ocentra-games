import { describe, expect, it } from 'vitest';
import { GameEngine } from '@/engine/GameEngine';
import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';
import { GamePhase } from '@/types/game';
import { createItalian40DeckProvider } from '@/engine/__tests__/support/TestDeckProviders';

function createBriscolaSpec(): MechanicsSpec {
  return {
    familyKernel: 'briscola',
    kernelVersion: 'test@1.0.0',
    playerConfig: {
      playerMode: 'multiplayer',
      minPlayers: 2,
      maxPlayers: 6,
      optimalPlayers: 2,
      dealerRotates: true,
    },
    phases: [
      {
        id: 'setup_round',
        label: 'Setup Round',
        actor: 'system',
        legalActions: ['setup_round'],
        nextPhase: 'trick_play',
        isMandatory: true,
        loopIndex: null,
        totalLoops: null,
        conditionalNext: [],
        cardVisibilityChanges: {},
      },
      {
        id: 'trick_play',
        label: 'Trick Play',
        actor: 'current_player',
        legalActions: ['play_card'],
        nextPhase: null,
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
      play_card: {
        supported: true,
        description: 'Play one card.',
        effectType: 'play_card',
        effectHints: {},
        isTerminating: true,
      },
    },
    customActions: [
      {
        id: 'setup_round',
        supported: true,
        description: 'Deal and reveal trump.',
        effectType: 'setup_round',
        effectHints: {},
        isTerminating: false,
      },
      {
        id: 'score_round',
        supported: true,
        description: 'Score the hand.',
        effectType: 'score_round',
        effectHints: {},
        isTerminating: false,
      },
    ],
    zones: [],
    turnPolicy: {
      direction: 'clockwise',
      startsWith: 'right_of_dealer',
      timerSeconds: null,
    },
    endConditions: [],
    deckType: 'Standard 40',
    suitSet: 'Italian',
    rankSet: 'Stripped_40',
    initialHandSize: 3,
    trickConfig: {
      hasTricks: true,
    },
    roundConfig: {
      maxRounds: 1,
    },
  };
}

describe('GameEngine Briscola mechanics flow', () => {
  it('plays a deterministic pilot hand to completion', async () => {
    const engine = new GameEngine({
      deckProvider: createItalian40DeckProvider(17),
    });
    await engine.initializeGame({ maxPlayers: 2, enablePhysics: false, seed: 17 });
    engine.loadMechanicsSpec(createBriscolaSpec());
    engine.addPlayer({ id: 'p1', name: 'Player 1' });
    engine.addPlayer({ id: 'p2', name: 'Player 2' });

    await engine.startGame();

    let state = engine.getGameState()!;
    expect(state.mechanicsPhaseId).toBe('trick_play');
    expect(state.floorCard).not.toBeNull();

    let guard = 0;
    while (state.phase !== GamePhase.GAME_END && guard < 80) {
      const activePlayer = state.players[state.currentPlayer];
      const result = engine.processPlayerAction({
        type: 'play_card',
        playerId: activePlayer.id,
        data: { cardId: activePlayer.hand[0].id },
        timestamp: new Date(state.lastAction.getTime() + 1000),
      });
      expect(result.isValid).toBe(true);
      state = engine.getGameState()!;
      guard += 1;
    }

    expect(guard).toBeLessThan(80);
    expect(state.phase).toBe(GamePhase.GAME_END);
    expect(state.players.every((player) => player.hand.length === 0)).toBe(true);
    expect(state.players.reduce((total, player) => total + player.score, 0)).toBeGreaterThan(0);
  });
});
