import { type GameState, type PlayerAction, GamePhase, Suit } from '@/types'

export interface TurnState {
  currentPlayer: number
  phase: GamePhase
  waitingForAction: boolean
  actionDeadline?: Date
}

export class TurnManager {
  private turnTimeoutMs: number

  constructor(turnTimeoutMs: number = 30000) { // 30 second default
    this.turnTimeoutMs = turnTimeoutMs
  }

  /**
   * Advances to the next player in turn order
   */
  advanceToNextPlayer(gameState: GameState): number {
    const nextPlayer = (gameState.currentPlayer + 1) % gameState.players.length
    return nextPlayer
  }

  /**
   * Determines who should act next based on game phase and current state
   */
  getNextActivePlayer(gameState: GameState): number {
    switch (gameState.phase) {
      case GamePhase.FLOOR_REVEAL:
        // During floor reveal, players act in turn order starting from dealer's left
        return gameState.currentPlayer
      
      case GamePhase.PLAYER_ACTION:
        // During player action phase, any player can act (declare intent, call showdown)
        // Return current player but allow any player to act
        return gameState.currentPlayer
      
      case GamePhase.SHOWDOWN:
        // During showdown, undeclared players can rebuttal
        return this.getNextUndeclaredPlayer(gameState)
      
      default:
        return gameState.currentPlayer
    }
  }

  /**
   * Processes a turn action and updates game state accordingly
   */
  processTurnAction(gameState: GameState, action: PlayerAction): Partial<GameState> {
    const updates: Partial<GameState> = {
      lastAction: new Date(),
    }

    switch (action.type) {
      case 'pick_up':
        return this.processPickUpAction(gameState, action, updates)
      
      case 'decline':
        return this.processDeclineAction(gameState, action, updates)
      
      case 'declare_intent':
        return this.processDeclareIntentAction(gameState, action, updates)
      
      case 'call_showdown':
        return this.processCallShowdownAction(gameState, action, updates)
      
      case 'rebuttal':
        return this.processRebuttalAction(gameState, action, updates)
      
      default:
        return updates
    }
  }

  private processPickUpAction(
    gameState: GameState, 
    action: PlayerAction, 
    updates: Partial<GameState>
  ): Partial<GameState> {
    const player = gameState.players.find(p => p.id === action.playerId)
    if (!player || !gameState.floorCard) return updates

    // Add floor card to player's hand
    const updatedPlayers = gameState.players.map(p => 
      p.id === action.playerId 
        ? { ...p, hand: [...p.hand, gameState.floorCard!] }
        : p
    )

    return {
      ...updates,
      players: updatedPlayers,
      floorCard: null,
      phase: GamePhase.PLAYER_ACTION,
    }
  }

  private processDeclineAction(
    gameState: GameState, 
    _action: PlayerAction, 
    updates: Partial<GameState>
  ): Partial<GameState> {
    // Move floor card to discard pile
    const updatedDiscardPile = gameState.floorCard 
      ? [...gameState.discardPile, gameState.floorCard]
      : gameState.discardPile

    // Advance to next player
    const nextPlayer = this.advanceToNextPlayer(gameState)

    return {
      ...updates,
      currentPlayer: nextPlayer,
      floorCard: null,
      discardPile: updatedDiscardPile,
      // Stay in FLOOR_REVEAL phase for next player
    }
  }

  private processDeclareIntentAction(
    gameState: GameState, 
    action: PlayerAction, 
    updates: Partial<GameState>
  ): Partial<GameState> {
    const { suit } = action.data as { suit: Suit }
    
    // Update player's declared suit
    const updatedPlayers = gameState.players.map(p => 
      p.id === action.playerId 
        ? { ...p, declaredSuit: suit }
        : p
    )

    return {
      ...updates,
      players: updatedPlayers,
    }
  }

  private processCallShowdownAction(
    _gameState: GameState, 
    _action: PlayerAction, 
    updates: Partial<GameState>
  ): Partial<GameState> {
    return {
      ...updates,
      phase: GamePhase.SHOWDOWN,
    }
  }

  private processRebuttalAction(
    _gameState: GameState, 
    _action: PlayerAction, 
    updates: Partial<GameState>
  ): Partial<GameState> {
    // Rebuttal processing would involve validating the 3-card run
    // and potentially changing the showdown outcome
    return {
      ...updates,
      phase: GamePhase.SCORING,
    }
  }

  /**
   * Finds the next undeclared player for rebuttal opportunities
   */
  private getNextUndeclaredPlayer(gameState: GameState): number {
    const undeclaredPlayers = gameState.players
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => player.declaredSuit === null)

    if (undeclaredPlayers.length === 0) {
      return gameState.currentPlayer
    }

    // Return first undeclared player after current player
    const currentIndex = gameState.currentPlayer
    const nextUndeclared = undeclaredPlayers.find(({ index }) => index > currentIndex) ||
                          undeclaredPlayers[0]

    return nextUndeclared.index
  }

  /**
   * Checks if all players have completed their required actions for the current phase
   */
  isPhaseComplete(gameState: GameState): boolean {
    switch (gameState.phase) {
      case GamePhase.FLOOR_REVEAL:
        // Phase complete when floor card is picked up or all players decline
        return gameState.floorCard === null
      
      case GamePhase.PLAYER_ACTION:
        // Phase complete when showdown is called or deck is empty
        return false // Continues until showdown or deck empty
      
      case GamePhase.SHOWDOWN:
        // Phase complete when all rebuttals are processed
        return true // Simplified - would need rebuttal tracking
      
      default:
        return true
    }
  }

  /**
   * Gets the remaining time for the current player's action
   */
  getRemainingActionTime(gameState: GameState): number {
    const timeSinceLastAction = Date.now() - gameState.lastAction.getTime()
    return Math.max(0, this.turnTimeoutMs - timeSinceLastAction)
  }

  /**
   * Checks if the current player's turn has timed out
   */
  hasActionTimedOut(gameState: GameState): boolean {
    return this.getRemainingActionTime(gameState) === 0
  }
}