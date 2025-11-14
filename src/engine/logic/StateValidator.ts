import { type GameState, type Player, type PlayerAction, type Card, GamePhase, Suit } from '@/types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export class StateValidator {
  /**
   * Validates the entire game state for consistency and integrity
   */
  validateGameState(gameState: GameState): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate basic game state structure
    this.validateBasicStructure(gameState, errors)
    
    // Validate player states
    this.validatePlayers(gameState, errors, warnings)
    
    // Validate deck and card distribution
    this.validateCardDistribution(gameState, errors)
    
    // Validate game phase consistency
    this.validatePhaseConsistency(gameState, errors, warnings)
    
    // Validate turn order and timing
    this.validateTurnOrder(gameState, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Validates a player action against the current game state
   */
  validatePlayerAction(action: PlayerAction, gameState: GameState): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Find the acting player
    const player = gameState.players.find(p => p.id === action.playerId)
    if (!player) {
      errors.push(`Player ${action.playerId} not found in game`)
      return { isValid: false, errors, warnings }
    }

    // Validate action timing
    this.validateActionTiming(action, gameState, errors, warnings)
    
    // Validate action type specific rules
    this.validateActionTypeRules(action, gameState, player, errors, warnings)
    
    // Check for potential cheating
    this.validateAntiCheat(action, gameState, player, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  private validateBasicStructure(gameState: GameState, errors: string[]): void {
    if (!gameState.id) {
      errors.push('Game state missing ID')
    }

    if (!Array.isArray(gameState.players)) {
      errors.push('Players must be an array')
    }

    if (gameState.currentPlayer < 0 || gameState.currentPlayer >= gameState.players.length) {
      errors.push('Current player index out of bounds')
    }

    if (!Object.values(GamePhase).includes(gameState.phase)) {
      errors.push(`Invalid game phase: ${gameState.phase}`)
    }

    if (!Array.isArray(gameState.deck)) {
      errors.push('Deck must be an array')
    }

    if (!Array.isArray(gameState.discardPile)) {
      errors.push('Discard pile must be an array')
    }
  }

  private validatePlayers(gameState: GameState, errors: string[], warnings: string[]): void {
    if (gameState.players.length < 2) {
      errors.push('Game requires at least 2 players')
    }

    if (gameState.players.length > 4) {
      errors.push('Game supports maximum 4 players')
    }

    // Check for duplicate player IDs
    const playerIds = gameState.players.map(p => p.id)
    const uniqueIds = new Set(playerIds)
    if (playerIds.length !== uniqueIds.size) {
      errors.push('Duplicate player IDs detected')
    }

    // Validate each player
    for (const player of gameState.players) {
      this.validatePlayer(player, errors, warnings)
    }

    // Validate declared suits (no duplicates)
    const declaredSuits = gameState.players
      .map(p => p.declaredSuit)
      .filter(suit => suit !== null)
    
    const uniqueSuits = new Set(declaredSuits)
    if (declaredSuits.length !== uniqueSuits.size) {
      errors.push('Multiple players cannot declare the same suit')
    }
  }

  private validatePlayer(player: Player, errors: string[], warnings: string[]): void {
    if (!player.id) {
      errors.push(`Player missing ID`)
    }

    if (!player.name) {
      warnings.push(`Player ${player.id} missing name`)
    }

    if (!Array.isArray(player.hand)) {
      errors.push(`Player ${player.id} hand must be an array`)
    }

    // Validate declared suit
    if (player.declaredSuit && !Object.values(Suit).includes(player.declaredSuit)) {
      errors.push(`Player ${player.id} has invalid declared suit: ${player.declaredSuit}`)
    }

    // Check if player has cards of declared suit
    if (player.declaredSuit) {
      const hasCardOfSuit = player.hand.some(card => card.suit === player.declaredSuit)
      if (!hasCardOfSuit) {
        errors.push(`Player ${player.id} declared ${player.declaredSuit} but has no cards of that suit`)
      }
    }
  }

  private validateCardDistribution(gameState: GameState, errors: string[]): void {
    // Collect all cards in play
    const allCards: Card[] = []
    
    // Add cards from all player hands
    for (const player of gameState.players) {
      allCards.push(...player.hand)
    }
    
    // Add cards from deck
    allCards.push(...gameState.deck)
    
    // Add cards from discard pile
    allCards.push(...gameState.discardPile)
    
    // Add floor card if present
    if (gameState.floorCard) {
      allCards.push(gameState.floorCard)
    }

    // Check for correct total number of cards (52 for standard deck)
    if (allCards.length !== 52) {
      errors.push(`Invalid total card count: ${allCards.length}, expected 52`)
    }

    // Check for duplicate cards
    const cardIds = allCards.map(card => card.id)
    const uniqueCardIds = new Set(cardIds)
    if (cardIds.length !== uniqueCardIds.size) {
      errors.push('Duplicate cards detected in game')
    }

    // Validate card structure
    for (const card of allCards) {
      if (!this.isValidCard(card)) {
        errors.push(`Invalid card structure: ${JSON.stringify(card)}`)
      }
    }
  }

  private validatePhaseConsistency(gameState: GameState, errors: string[], warnings: string[]): void {
    switch (gameState.phase) {
      case GamePhase.DEALING:
        if (gameState.players.some(p => p.hand.length > 0)) {
          warnings.push('Cards already dealt but phase is still DEALING')
        }
        break

      case GamePhase.FLOOR_REVEAL:
        if (!gameState.floorCard && gameState.deck.length > 0) {
          warnings.push('No floor card revealed but deck has cards')
        }
        break

      case GamePhase.PLAYER_ACTION:
        if (gameState.floorCard) {
          warnings.push('Floor card still present during PLAYER_ACTION phase')
        }
        break

      case GamePhase.SHOWDOWN: {
        const declaredPlayers = gameState.players.filter(p => p.declaredSuit !== null)
        if (declaredPlayers.length === 0) {
          errors.push('Showdown called but no players have declared intent')
        }
        break
      }

      case GamePhase.GAME_END:
        // Game should be complete
        break
    }
  }

  private validateTurnOrder(gameState: GameState, errors: string[], warnings: string[]): void {
    // Check if current player is valid
    if (gameState.currentPlayer >= gameState.players.length) {
      errors.push('Current player index exceeds player count')
    }

    // Check if current player is connected (for multiplayer)
    const currentPlayer = gameState.players[gameState.currentPlayer]
    if (currentPlayer && !currentPlayer.isConnected && !currentPlayer.isAI) {
      warnings.push('Current player is disconnected')
    }
  }

  private validateActionTiming(
    action: PlayerAction, 
    gameState: GameState, 
    errors: string[], 
    warnings: string[]
  ): void {
    void warnings
    const actionTime = action.timestamp.getTime()
    const lastActionTime = gameState.lastAction.getTime()

    // Action cannot be in the past relative to last action
    if (actionTime < lastActionTime) {
      errors.push('Action timestamp is before last game action')
    }

    // Action cannot be too far in the future
    const maxFutureTime = Date.now() + 5000 // 5 seconds tolerance
    if (actionTime > maxFutureTime) {
      errors.push('Action timestamp is too far in the future')
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
        this.validateDeclareIntentAction(action, gameState, player, errors)
        break
      
      case 'call_showdown':
        this.validateCallShowdownAction(action, gameState, player, errors, warnings)
        break
      
      case 'rebuttal':
        this.validateRebuttalAction(action, gameState, player, errors, warnings)
        break
    }
  }

  private validateDeclareIntentAction(
    action: PlayerAction,
    gameState: GameState,
    player: Player,
    errors: string[]
  ): void {
    const data = action.data as { suit: Suit }
    
    if (!data || !data.suit) {
      errors.push('Declare intent action missing suit data')
      return
    }

    if (!Object.values(Suit).includes(data.suit)) {
      errors.push(`Invalid suit in declare intent: ${data.suit}`)
    }

    if (player.declaredSuit !== null) {
      errors.push('Player has already declared intent')
    }

    // Check if suit is already locked
    const suitLocked = gameState.players.some(p => p.declaredSuit === data.suit)
    if (suitLocked) {
      errors.push(`Suit ${data.suit} is already locked by another player`)
    }
  }

  private validateCallShowdownAction(
    _action: PlayerAction,
    gameState: GameState,
    player: Player,
    errors: string[],
    warnings: string[]
  ): void {
    void warnings
    if (player.declaredSuit === null) {
      errors.push('Player must declare intent before calling showdown')
    }

    if (gameState.phase !== GamePhase.PLAYER_ACTION) {
      errors.push('Showdown can only be called during player action phase')
    }
  }

  private validateRebuttalAction(
    action: PlayerAction,
    gameState: GameState,
    player: Player,
    errors: string[],
    warnings: string[]
  ): void {
    void warnings
    if (player.declaredSuit !== null) {
      errors.push('Only undeclared players can make rebuttals')
    }

    if (gameState.phase !== GamePhase.SHOWDOWN) {
      errors.push('Rebuttals can only be made during showdown phase')
    }

    const data = action.data as { cards: Card[] }
    if (!data || !Array.isArray(data.cards) || data.cards.length !== 3) {
      errors.push('Rebuttal must include exactly 3 cards')
    }
  }

  private validateAntiCheat(
    action: PlayerAction,
    gameState: GameState,
    player: Player,
    errors: string[],
    warnings: string[]
  ): void {
    void warnings
    // Check for impossible actions (e.g., playing cards not in hand)
    if (action.type === 'rebuttal') {
      const data = action.data as { cards: Card[] }
      if (data && data.cards) {
        for (const card of data.cards) {
          const hasCard = player.hand.some(handCard => handCard.id === card.id)
          if (!hasCard) {
            errors.push(`Player attempting to play card not in hand: ${card.id}`)
          }
        }
      }
    }

    // Check for rapid-fire actions (potential speed hacking)
    const timeSinceLastAction = action.timestamp.getTime() - gameState.lastAction.getTime()
    if (timeSinceLastAction < 100) { // Less than 100ms
      warnings.push('Suspiciously fast action detected')
    }
  }

  private isValidCard(card: Card): boolean {
    return (
      typeof card.id === 'string' &&
      Object.values(Suit).includes(card.suit) &&
      typeof card.value === 'number' &&
      card.value >= 2 &&
      card.value <= 14
    )
  }
}