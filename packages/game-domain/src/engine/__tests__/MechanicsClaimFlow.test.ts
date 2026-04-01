import { describe, expect, it } from 'vitest';
import { GameEngine } from '@/engine/GameEngine';
import type { MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';
import { GamePhase } from '@/types/game';

function createClaimLikeSpec(): MechanicsSpec {
  return {
    familyKernel: 'claim',
    kernelVersion: 'test@1.0.0',
    playerConfig: {
      playerMode: 'multiplayer',
      minPlayers: 2,
      maxPlayers: 2,
      optimalPlayers: 2,
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
        loopIndex: null,
        totalLoops: null,
        conditionalNext: [],
        cardVisibilityChanges: {},
      },
      {
        id: 'turn_loop',
        label: 'Turn Loop',
        actor: 'current_player',
        legalActions: ['declare', 'pass', 'pick_up', 'call_showdown'],
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
        legalActions: ['reveal_hand', 'rebuttal'],
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
      declare: {
        supported: true,
        description: 'Declare a suit.',
        effectType: 'declare',
        effectHints: {},
        isTerminating: true,
      },
      pass: {
        supported: true,
        description: 'Pass on the floor card.',
        effectType: 'pass',
        effectHints: {},
        isTerminating: true,
      },
      pick_up: {
        supported: true,
        description: 'Pick up the floor card and discard.',
        effectType: 'pick_up',
        effectHints: {},
        isTerminating: true,
      },
      reveal_hand: {
        supported: true,
        description: 'Reveal hand.',
        effectType: 'reveal',
        effectHints: {},
        isTerminating: false,
      },
    },
    customActions: [
      {
        id: 'setup_round',
        supported: true,
        description: 'Deal cards and reveal floor card.',
        effectType: 'setup_round',
        effectHints: {},
        isTerminating: false,
      },
      {
        id: 'call_showdown',
        supported: true,
        description: 'Call showdown.',
        effectType: 'call_showdown',
        effectHints: {
          minimumScore: 0,
        },
        isTerminating: true,
      },
      {
        id: 'score_round',
        supported: true,
        description: 'Score the round.',
        effectType: 'score_round',
        effectHints: {},
        isTerminating: false,
      },
      {
        id: 'rebuttal',
        supported: true,
        description: 'Respond during showdown.',
        effectType: 'rebuttal',
        effectHints: {},
        isTerminating: false,
      },
    ],
    zones: [
      { id: 'stock', type: 'stack', owner: 'table', visibility: 'hidden', capacity: 52 },
      { id: 'hand', type: 'hand', owner: 'player', visibility: 'private', capacity: 52 },
      { id: 'floor', type: 'slot', owner: 'table', visibility: 'public', capacity: 1 },
      { id: 'discard', type: 'stack', owner: 'table', visibility: 'public', capacity: 52 },
    ],
    turnPolicy: {
      direction: 'clockwise',
      startsWith: 'left_of_dealer',
      timerSeconds: null,
    },
    endConditions: [],
    drawConfig: {
      floorCardCount: 1,
      replenishesFloorAfterPickUp: true,
    },
    discardConfig: {
      requiredAfterPickUp: true,
    },
    deckType: 'Standard 52',
    suitSet: 'French',
    rankSet: 'Standard_52',
    initialHandSize: 3,
    roundConfig: {
      maxRounds: 1,
    },
    constants: {
      showdownMinimum: 0,
    },
  };
}

describe('GameEngine Claim mechanics flow', () => {
  it('runs a full single-round mechanics flow to game end', async () => {
    const engine = new GameEngine();
    await engine.initializeGame({ maxPlayers: 2, enablePhysics: false, seed: 42 });
    engine.loadMechanicsSpec(createClaimLikeSpec());
    engine.addPlayer({ id: 'p1', name: 'Player 1' });
    engine.addPlayer({ id: 'p2', name: 'Player 2' });

    await engine.startGame();

    const startedState = engine.getGameState();
    expect(startedState?.mechanicsPhaseId).toBe('turn_loop');
    expect(startedState?.phase).toBe(GamePhase.PLAYER_ACTION);
    expect(startedState?.floorCard).not.toBeNull();
    expect(startedState?.players.every((player) => player.hand.length === 3)).toBe(true);

    const activePlayer = startedState!.players[startedState!.currentPlayer];
    const declaredSuit = activePlayer.hand[0].suit;

    const declareResult = engine.processPlayerAction({
      type: 'declare',
      playerId: activePlayer.id,
      data: { suit: declaredSuit },
      timestamp: new Date(startedState!.lastAction.getTime() + 1000),
    });
    expect(declareResult.isValid).toBe(true);

    const afterDeclare = engine.getGameState()!;
    const secondPlayer = afterDeclare.players[afterDeclare.currentPlayer];

    const passResult = engine.processPlayerAction({
      type: 'pass',
      playerId: secondPlayer.id,
      timestamp: new Date(afterDeclare.lastAction.getTime() + 1000),
    });
    expect(passResult.isValid).toBe(true);

    const beforeShowdown = engine.getGameState()!;
    const showdownCaller = beforeShowdown.players[beforeShowdown.currentPlayer];

    const showdownResult = engine.processPlayerAction({
      type: 'call_showdown',
      playerId: showdownCaller.id,
      timestamp: new Date(beforeShowdown.lastAction.getTime() + 1000),
    });
    expect(showdownResult.isValid).toBe(true);
    expect(engine.getGameState()?.phase).toBe(GamePhase.SHOWDOWN);

    const revealState = engine.getGameState()!;
    const firstReveal = engine.processPlayerAction({
      type: 'reveal_hand',
      playerId: revealState.players[0].id,
      timestamp: new Date(revealState.lastAction.getTime() + 1000),
    });
    expect(firstReveal.isValid).toBe(true);

    const secondRevealState = engine.getGameState()!;
    const secondReveal = engine.processPlayerAction({
      type: 'reveal_hand',
      playerId: secondRevealState.players[1].id,
      timestamp: new Date(secondRevealState.lastAction.getTime() + 1000),
    });
    expect(secondReveal.isValid).toBe(true);

    const endedState = engine.getGameState()!;
    expect(endedState.phase).toBe(GamePhase.GAME_END);
    expect(endedState.round).toBe(2);
  });
});
