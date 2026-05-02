import {
  type GameState,
  type Player,
  type PlayerAction,
  type RuntimePiece,
  GamePhase,
  Suit,
} from '@/types/game';
import { isRuntimeCard } from '@/deck/runtimeDeck';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class StateValidator {
  validateGameState(gameState: GameState): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.validateBasicStructure(gameState, errors);
    this.validatePlayers(gameState, errors, warnings);
    this.validateCardDistribution(gameState, errors);
    this.validatePhaseConsistency(gameState, errors, warnings);
    this.validateTurnOrder(gameState, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validatePlayerAction(
    action: PlayerAction,
    gameState: GameState
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const player = gameState.players.find((p) => p.id === action.playerId);
    if (!player) {
      errors.push(`Player ${action.playerId} not found in game`);
      return { isValid: false, errors, warnings };
    }

    this.validateActionTiming(action, gameState, errors, warnings);
    this.validateActionTypeRules(
      action,
      gameState,
      player,
      errors,
      warnings
    );
    this.validateAntiCheat(action, gameState, player, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateBasicStructure(
    gameState: GameState,
    errors: string[]
  ): void {
    if (!gameState.id) {
      errors.push('Game state missing ID');
    }

    if (!Array.isArray(gameState.players)) {
      errors.push('Players must be an array');
    }

    if (
      gameState.currentPlayer < 0 ||
      gameState.currentPlayer >= gameState.players.length
    ) {
      errors.push('Current player index out of bounds');
    }

    if (!Object.values(GamePhase).includes(gameState.phase)) {
      errors.push(`Invalid game phase: ${gameState.phase}`);
    }

    if (!Array.isArray(gameState.deck)) {
      errors.push('Deck must be an array');
    }

    if (!Array.isArray(gameState.discardPile)) {
      errors.push('Discard pile must be an array');
    }
  }

  private validatePlayers(
    gameState: GameState,
    errors: string[],
    warnings: string[]
  ): void {
    if (gameState.players.length < 2) {
      errors.push('Game requires at least 2 players');
    }

    if (gameState.players.length > 4) {
      errors.push('Game supports maximum 4 players');
    }

    const playerIds = gameState.players.map((p) => p.id);
    const uniqueIds = new Set(playerIds);
    if (playerIds.length !== uniqueIds.size) {
      errors.push('Duplicate player IDs detected');
    }

    for (const player of gameState.players) {
      this.validatePlayer(player, errors, warnings);
    }

    const declaredSuits = gameState.players
      .map((p) => p.declaredSuit)
      .filter((suit) => suit !== null);

    const uniqueSuits = new Set(declaredSuits);
    if (declaredSuits.length !== uniqueSuits.size) {
      errors.push('Multiple players cannot declare the same suit');
    }
  }

  private validatePlayer(
    player: Player,
    errors: string[],
    warnings: string[]
  ): void {
    void warnings;
    if (!player.id) {
      errors.push('Player missing ID');
    }

    if (!player.name) {
      warnings.push(`Player ${player.id} missing name`);
    }

    if (!Array.isArray(player.hand)) {
      errors.push(`Player ${player.id} hand must be an array`);
    }

    if (
      player.declaredSuit &&
      !Object.values(Suit).includes(player.declaredSuit)
    ) {
      errors.push(
        `Player ${player.id} has invalid declared suit: ${player.declaredSuit}`
      );
    }

    if (player.declaredSuit) {
      const hasCardOfSuit = player.hand.some(
        (piece) => isRuntimeCard(piece) && piece.suit === player.declaredSuit
      );
      if (!hasCardOfSuit) {
        errors.push(
          `Player ${player.id} declared ${player.declaredSuit} but has no cards of that suit`
        );
      }
    }
  }

  private validateCardDistribution(
    gameState: GameState,
    errors: string[]
  ): void {
    const allPieces: RuntimePiece[] = [];

    for (const player of gameState.players) {
      allPieces.push(...player.hand);
    }

    allPieces.push(...gameState.deck);
    allPieces.push(...gameState.discardPile);

    if (gameState.floorCard) {
      allPieces.push(gameState.floorCard);
    }

    const pieceIds = allPieces.map((piece) => piece.id);
    const uniquePieceIds = new Set(pieceIds);
    if (pieceIds.length !== uniquePieceIds.size) {
      errors.push('Duplicate runtime pieces detected in game');
    }

    for (const piece of allPieces) {
      if (!this.isValidPiece(piece)) {
        errors.push(`Invalid piece structure: ${JSON.stringify(piece)}`);
      }
    }
  }

  private validatePhaseConsistency(
    gameState: GameState,
    errors: string[],
    warnings: string[]
  ): void {
    switch (gameState.phase) {
      case GamePhase.DEALING:
        if (gameState.players.some((p) => p.hand.length > 0)) {
          warnings.push(
            'Cards already dealt but phase is still DEALING'
          );
        }
        break;

      case GamePhase.FLOOR_REVEAL:
        if (!gameState.floorCard && gameState.deck.length > 0) {
          warnings.push('No floor card revealed but deck has cards');
        }
        break;

      case GamePhase.PLAYER_ACTION:
        if (gameState.floorCard) {
          warnings.push(
            'Floor card still present during PLAYER_ACTION phase'
          );
        }
        break;

      case GamePhase.SHOWDOWN: {
        const declaredPlayers = gameState.players.filter(
          (p) => p.declaredSuit !== null
        );
        if (declaredPlayers.length === 0) {
          errors.push(
            'Showdown called but no players have declared intent'
          );
        }
        break;
      }

      case GamePhase.GAME_END:
        break;
    }
  }

  private validateTurnOrder(
    gameState: GameState,
    errors: string[],
    warnings: string[]
  ): void {
    void warnings;
    if (gameState.currentPlayer >= gameState.players.length) {
      errors.push('Current player index exceeds player count');
    }

    const currentPlayer =
      gameState.players[gameState.currentPlayer];
    if (
      currentPlayer &&
      !currentPlayer.isConnected &&
      !currentPlayer.isAI
    ) {
      warnings.push('Current player is disconnected');
    }
  }

  private validateActionTiming(
    action: PlayerAction,
    gameState: GameState,
    errors: string[],
    warnings: string[]
  ): void {
    void warnings;
    const actionTime = action.timestamp.getTime();
    const lastActionTime = gameState.lastAction.getTime();

    if (actionTime < lastActionTime) {
      errors.push('Action timestamp is before last game action');
    }

    const maxFutureTime = Date.now() + 5000;
    if (actionTime > maxFutureTime) {
      errors.push('Action timestamp is too far in the future');
    }
  }

  private validateActionTypeRules(
    action: PlayerAction,
    gameState: GameState,
    player: Player,
    errors: string[],
    warnings: string[]
  ): void {
    switch (action.type) {
      case 'declare_intent':
        this.validateDeclareIntentAction(
          action,
          gameState,
          player,
          errors
        );
        break;

      case 'call_showdown':
        this.validateCallShowdownAction(
          action,
          gameState,
          player,
          errors,
          warnings
        );
        break;

      case 'rebuttal':
        this.validateRebuttalAction(
          action,
          gameState,
          player,
          errors,
          warnings
        );
        break;
    }
  }

  private validateDeclareIntentAction(
    action: PlayerAction,
    gameState: GameState,
    player: Player,
    errors: string[]
  ): void {
    const data = action.data as { suit: Suit };

    if (!data || !data.suit) {
      errors.push('Declare intent action missing suit data');
      return;
    }

    if (!Object.values(Suit).includes(data.suit)) {
      errors.push(`Invalid suit in declare intent: ${data.suit}`);
    }

    if (player.declaredSuit !== null) {
      errors.push('Player has already declared intent');
    }

    const suitLocked = gameState.players.some(
      (p) => p.declaredSuit === data.suit
    );
    if (suitLocked) {
      errors.push(
        `Suit ${data.suit} is already locked by another player`
      );
    }
  }

  private validateCallShowdownAction(
    _action: PlayerAction,
    gameState: GameState,
    player: Player,
    errors: string[],
    warnings: string[]
  ): void {
    void warnings;
    if (player.declaredSuit === null) {
      errors.push(
        'Player must declare intent before calling showdown'
      );
    }

    if (gameState.phase !== GamePhase.PLAYER_ACTION) {
      errors.push(
        'Showdown can only be called during player action phase'
      );
    }
  }

  private validateRebuttalAction(
    action: PlayerAction,
    gameState: GameState,
    player: Player,
    errors: string[],
    warnings: string[]
  ): void {
    void warnings;
    if (player.declaredSuit !== null) {
      errors.push('Only undeclared players can make rebuttals');
    }

    if (gameState.phase !== GamePhase.SHOWDOWN) {
      errors.push(
        'Rebuttals can only be made during showdown phase'
      );
    }

    const data = action.data as { cards: RuntimePiece[] };
    if (
      !data ||
      !Array.isArray(data.cards) ||
      data.cards.length !== 3
    ) {
      errors.push('Rebuttal must include exactly 3 cards');
    }
  }

  private validateAntiCheat(
    action: PlayerAction,
    gameState: GameState,
    player: Player,
    errors: string[],
    warnings: string[]
  ): void {
    void gameState;
    void warnings;
    if (action.type === 'rebuttal') {
      const data = action.data as { cards: RuntimePiece[] };
      if (data && data.cards) {
        for (const card of data.cards) {
          const hasCard = player.hand.some(
            (handCard) => handCard.id === card.id
          );
          if (!hasCard) {
            errors.push(
              `Player attempting to play card not in hand: ${card.id}`
            );
          }
        }
      }
    }

    const timeSinceLastAction =
      action.timestamp.getTime() - gameState.lastAction.getTime();
    if (timeSinceLastAction < 100) {
      warnings.push('Suspiciously fast action detected');
    }
  }

  private isValidPiece(piece: RuntimePiece): boolean {
    if (
      typeof piece.id !== 'string' ||
      typeof piece.logicalId !== 'string' ||
      typeof piece.pieceKind !== 'string' ||
      typeof piece.family !== 'string'
    ) {
      return false;
    }

    if (piece.pieceKind !== 'card') {
      return true;
    }

    return isRuntimeCard(piece) && piece.value >= 2 && piece.value <= 14;
  }
}
