import {
  type GameState,
  type PlayerAction,
  GamePhase,
  Suit,
} from '@/types/game';

export interface TurnState {
  currentPlayer: number;
  phase: GamePhase;
  waitingForAction: boolean;
  actionDeadline?: Date;
}

export class TurnManager {
  private turnTimeoutMs: number;

  constructor(turnTimeoutMs: number = 30000) {
    this.turnTimeoutMs = turnTimeoutMs;
  }

  advanceToNextPlayer(gameState: GameState): number {
    return (gameState.currentPlayer + 1) % gameState.players.length;
  }

  getNextActivePlayer(gameState: GameState): number {
    switch (gameState.phase) {
      case GamePhase.FLOOR_REVEAL:
        return gameState.currentPlayer;

      case GamePhase.PLAYER_ACTION:
        return gameState.currentPlayer;

      case GamePhase.SHOWDOWN:
        return this.getNextUndeclaredPlayer(gameState);

      default:
        return gameState.currentPlayer;
    }
  }

  processTurnAction(
    gameState: GameState,
    action: PlayerAction
  ): Partial<GameState> {
    const updates: Partial<GameState> = {
      lastAction: new Date(),
    };

    switch (action.type) {
      case 'pick_up':
        return this.processPickUpAction(gameState, action, updates);

      case 'decline':
        return this.processDeclineAction(gameState, action, updates);

      case 'declare_intent':
        return this.processDeclareIntentAction(gameState, action, updates);

      case 'call_showdown':
        return this.processCallShowdownAction(gameState, action, updates);

      case 'rebuttal':
        return this.processRebuttalAction(gameState, action, updates);

      default:
        return updates;
    }
  }

  private processPickUpAction(
    gameState: GameState,
    action: PlayerAction,
    updates: Partial<GameState>
  ): Partial<GameState> {
    const player = gameState.players.find((p) => p.id === action.playerId);
    if (!player || !gameState.floorCard) return updates;

    const updatedPlayers = gameState.players.map((p) =>
      p.id === action.playerId
        ? { ...p, hand: [...p.hand, gameState.floorCard!] }
        : p
    );

    return {
      ...updates,
      players: updatedPlayers,
      floorCard: null,
      phase: GamePhase.PLAYER_ACTION,
    };
  }

  private processDeclineAction(
    gameState: GameState,
    _action: PlayerAction,
    updates: Partial<GameState>
  ): Partial<GameState> {
    const updatedDiscardPile = gameState.floorCard
      ? [...gameState.discardPile, gameState.floorCard]
      : gameState.discardPile;

    const nextPlayer = this.advanceToNextPlayer(gameState);

    return {
      ...updates,
      currentPlayer: nextPlayer,
      floorCard: null,
      discardPile: updatedDiscardPile,
    };
  }

  private processDeclareIntentAction(
    gameState: GameState,
    action: PlayerAction,
    updates: Partial<GameState>
  ): Partial<GameState> {
    const { suit } = action.data as { suit: Suit };

    const updatedPlayers = gameState.players.map((p) =>
      p.id === action.playerId ? { ...p, declaredSuit: suit } : p
    );

    return {
      ...updates,
      players: updatedPlayers,
    };
  }

  private processCallShowdownAction(
    _gameState: GameState,
    _action: PlayerAction,
    updates: Partial<GameState>
  ): Partial<GameState> {
    return {
      ...updates,
      phase: GamePhase.SHOWDOWN,
    };
  }

  private processRebuttalAction(
    _gameState: GameState,
    _action: PlayerAction,
    updates: Partial<GameState>
  ): Partial<GameState> {
    return {
      ...updates,
      phase: GamePhase.SCORING,
    };
  }

  private getNextUndeclaredPlayer(gameState: GameState): number {
    const undeclaredPlayers = gameState.players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => player.declaredSuit === null);

    if (undeclaredPlayers.length === 0) {
      return gameState.currentPlayer;
    }

    const currentIndex = gameState.currentPlayer;
    const nextUndeclared =
      undeclaredPlayers.find(({ index }) => index > currentIndex) ||
      undeclaredPlayers[0];

    return nextUndeclared.index;
  }

  isPhaseComplete(gameState: GameState): boolean {
    switch (gameState.phase) {
      case GamePhase.FLOOR_REVEAL:
        return gameState.floorCard === null;

      case GamePhase.PLAYER_ACTION:
        return false;

      case GamePhase.SHOWDOWN:
        return true;

      default:
        return true;
    }
  }

  getRemainingActionTime(gameState: GameState): number {
    const timeSinceLastAction =
      Date.now() - gameState.lastAction.getTime();
    return Math.max(0, this.turnTimeoutMs - timeSinceLastAction);
  }

  hasActionTimedOut(gameState: GameState): boolean {
    return this.getRemainingActionTime(gameState) === 0;
  }
}
