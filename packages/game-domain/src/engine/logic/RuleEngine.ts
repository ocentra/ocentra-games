import {
  type Card,
  type GameState,
  type Player,
  type PlayerAction,
  Suit,
  GamePhase,
} from '@/types/game';

export interface GameRules {
  maxPlayers: number;
  initialHandSize: number;
  deckSize: number;
}

export const DEFAULT_RULES: GameRules = {
  maxPlayers: 4,
  initialHandSize: 3,
  deckSize: 52,
};

export class RuleEngine {
  private rules: GameRules;

  constructor(rules: GameRules = DEFAULT_RULES) {
    this.rules = rules;
  }

  validateAction(action: PlayerAction, gameState: GameState): boolean {
    const player = gameState.players.find((p) => p.id === action.playerId);
    if (!player) return false;

    const currentPlayerInTurn = gameState.players[gameState.currentPlayer];
    const isPlayerTurn =
      currentPlayerInTurn && currentPlayerInTurn.id === action.playerId;

    switch (action.type) {
      case 'pick_up':
        return this.validatePickUp(gameState, player, isPlayerTurn);

      case 'decline':
        return this.validateDecline(gameState, player, isPlayerTurn);

      case 'declare_intent':
        return this.validateDeclareIntent(
          gameState,
          player,
          action.data as { suit: Suit }
        );

      case 'call_showdown':
        return this.validateCallShowdown(gameState, player);

      case 'rebuttal':
        return this.validateRebuttal(
          gameState,
          player,
          action.data as { cards: Card[] }
        );

      default:
        return false;
    }
  }

  private validatePickUp(
    gameState: GameState,
    _player: Player,
    isPlayerTurn: boolean
  ): boolean {
    return (
      gameState.phase === GamePhase.FLOOR_REVEAL &&
      isPlayerTurn &&
      gameState.floorCard !== null
    );
  }

  private validateDecline(
    gameState: GameState,
    _player: Player,
    isPlayerTurn: boolean
  ): boolean {
    return (
      gameState.phase === GamePhase.FLOOR_REVEAL &&
      isPlayerTurn &&
      gameState.floorCard !== null
    );
  }

  private validateDeclareIntent(
    gameState: GameState,
    player: Player,
    data: { suit: Suit }
  ): boolean {
    if (gameState.phase !== GamePhase.PLAYER_ACTION) return false;

    if (player.declaredSuit !== null) return false;

    const suitLocked = gameState.players.some((p) => p.declaredSuit === data.suit);
    if (suitLocked) return false;

    const hasCardOfSuit = player.hand.some((card) => card.suit === data.suit);
    return hasCardOfSuit;
  }

  private validateCallShowdown(gameState: GameState, player: Player): boolean {
    if (gameState.phase !== GamePhase.PLAYER_ACTION) return false;

    return player.declaredSuit !== null;
  }

  private validateRebuttal(
    gameState: GameState,
    player: Player,
    data: { cards: Card[] }
  ): boolean {
    if (gameState.phase !== GamePhase.SHOWDOWN) return false;

    if (player.declaredSuit !== null) return false;

    if (!data.cards || data.cards.length !== 3) return false;

    return this.isValidRun(data.cards);
  }

  private isValidRun(cards: Card[]): boolean {
    if (cards.length !== 3) return false;

    const suit = cards[0].suit;
    if (!cards.every((card) => card.suit === suit)) return false;

    const sortedCards = [...cards].sort((a, b) => a.value - b.value);
    const values = sortedCards.map((card) => card.value);

    if (values[1] === values[0] + 1 && values[2] === values[1] + 1) {
      return true;
    }

    if (values[0] === 2 && values[1] === 13 && values[2] === 14) {
      return true;
    }

    return false;
  }

  getNextPhase(currentPhase: GamePhase, action: PlayerAction): GamePhase {
    switch (currentPhase) {
      case GamePhase.DEALING:
        return GamePhase.FLOOR_REVEAL;

      case GamePhase.FLOOR_REVEAL:
        if (action.type === 'pick_up') {
          return GamePhase.PLAYER_ACTION;
        } else if (action.type === 'decline') {
          return GamePhase.FLOOR_REVEAL;
        }
        return currentPhase;

      case GamePhase.PLAYER_ACTION:
        if (action.type === 'call_showdown') {
          return GamePhase.SHOWDOWN;
        }
        return currentPhase;

      case GamePhase.SHOWDOWN:
        if (action.type === 'rebuttal') {
          return GamePhase.SCORING;
        }
        return GamePhase.SCORING;

      case GamePhase.SCORING:
        return GamePhase.GAME_END;

      default:
        return currentPhase;
    }
  }

  shouldEndGame(gameState: GameState): boolean {
    return (
      gameState.deck.length === 0 || gameState.phase === GamePhase.GAME_END
    );
  }

  getRules(): GameRules {
    return { ...this.rules };
  }
}
