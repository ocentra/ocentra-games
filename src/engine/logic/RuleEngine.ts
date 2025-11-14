import { type Card, type GameState, type Player, type PlayerAction, Suit, GamePhase } from '@/types'

export interface GameRules {
  maxPlayers: number
  initialHandSize: number
  deckSize: number
}

export const DEFAULT_RULES: GameRules = {
  maxPlayers: 4,
  initialHandSize: 3,
  deckSize: 52,
}

export class RuleEngine {
  private rules: GameRules

  constructor(rules: GameRules = DEFAULT_RULES) {
    this.rules = rules
  }

  /**
   * Validates if a player action is legal given the current game state
   */
  validateAction(action: PlayerAction, gameState: GameState): boolean {
    const player = gameState.players.find(p => p.id === action.playerId)
    if (!player) return false

    // Check if it's the player's turn for actions that require turn order
    const currentPlayerInTurn = gameState.players[gameState.currentPlayer]
    const isPlayerTurn = currentPlayerInTurn && currentPlayerInTurn.id === action.playerId

    switch (action.type) {
      case 'pick_up':
        return this.validatePickUp(gameState, player, isPlayerTurn)
      
      case 'decline':
        return this.validateDecline(gameState, player, isPlayerTurn)
      
      case 'declare_intent':
        return this.validateDeclareIntent(gameState, player, action.data as { suit: Suit })
      
      case 'call_showdown':
        return this.validateCallShowdown(gameState, player)
      
      case 'rebuttal':
        return this.validateRebuttal(gameState, player, action.data as { cards: Card[] })
      
      default:
        return false
    }
  }

  private validatePickUp(gameState: GameState, _player: Player, isPlayerTurn: boolean): boolean {
    // Must be floor reveal phase and player's turn
    return gameState.phase === GamePhase.FLOOR_REVEAL && 
           isPlayerTurn && 
           gameState.floorCard !== null
  }

  private validateDecline(gameState: GameState, _player: Player, isPlayerTurn: boolean): boolean {
    // Must be floor reveal phase and player's turn
    return gameState.phase === GamePhase.FLOOR_REVEAL && 
           isPlayerTurn && 
           gameState.floorCard !== null
  }

  private validateDeclareIntent(gameState: GameState, player: Player, data: { suit: Suit }): boolean {
    // Must be player action phase
    if (gameState.phase !== GamePhase.PLAYER_ACTION) return false
    
    // Player must not have already declared
    if (player.declaredSuit !== null) return false
    
    // Suit must not be locked by another player
    const suitLocked = gameState.players.some(p => p.declaredSuit === data.suit)
    if (suitLocked) return false
    
    // Player must have at least one card of the declared suit
    const hasCardOfSuit = player.hand.some(card => card.suit === data.suit)
    return hasCardOfSuit
  }

  private validateCallShowdown(gameState: GameState, player: Player): boolean {
    // Can call showdown during player action phase
    if (gameState.phase !== GamePhase.PLAYER_ACTION) return false
    
    // Player must have declared intent to call showdown
    return player.declaredSuit !== null
  }

  private validateRebuttal(gameState: GameState, player: Player, data: { cards: Card[] }): boolean {
    // Must be showdown phase
    if (gameState.phase !== GamePhase.SHOWDOWN) return false
    
    // Player must be undeclared to rebuttal
    if (player.declaredSuit !== null) return false
    
    // Must provide exactly 3 cards
    if (!data.cards || data.cards.length !== 3) return false
    
    // Cards must form a valid run (consecutive values in same suit)
    return this.isValidRun(data.cards)
  }

  /**
   * Checks if cards form a valid 3-card run (consecutive values, same suit)
   * Handles A-K wraparound to 2
   */
  private isValidRun(cards: Card[]): boolean {
    if (cards.length !== 3) return false
    
    // All cards must be same suit
    const suit = cards[0].suit
    if (!cards.every(card => card.suit === suit)) return false
    
    // Sort by value
    const sortedCards = [...cards].sort((a, b) => a.value - b.value);
    const values = sortedCards.map(card => card.value);
    
    // Check for normal consecutive sequence
    if (values[1] === values[0] + 1 && values[2] === values[1] + 1) {
      return true;
    }
    
    // Check for A-K-2 wraparound (values 14, 13, 2)
    if (values[0] === 2 && values[1] === 13 && values[2] === 14) {
      return true;
    }
    
    return false;
  }

  /**
   * Determines the next game phase based on current state and action
   */
  getNextPhase(currentPhase: GamePhase, action: PlayerAction): GamePhase {
    switch (currentPhase) {
      case GamePhase.DEALING:
        return GamePhase.FLOOR_REVEAL
      
      case GamePhase.FLOOR_REVEAL:
        if (action.type === 'pick_up') {
          return GamePhase.PLAYER_ACTION
        } else if (action.type === 'decline') {
          // Check if all players have declined
          const allDeclined = this.checkAllPlayersDeclined()
          return allDeclined ? GamePhase.FLOOR_REVEAL : GamePhase.FLOOR_REVEAL
        }
        return currentPhase
      
      case GamePhase.PLAYER_ACTION:
        if (action.type === 'call_showdown') {
          return GamePhase.SHOWDOWN
        }
        return currentPhase
      
      case GamePhase.SHOWDOWN:
        if (action.type === 'rebuttal') {
          return GamePhase.SCORING
        }
        return GamePhase.SCORING
      
      case GamePhase.SCORING:
        return GamePhase.GAME_END
      
      default:
        return currentPhase
    }
  }

  private checkAllPlayersDeclined(): boolean {
    // This would need to track decline actions - simplified for now
    return false
  }

  /**
   * Checks if the game should end
   */
  shouldEndGame(gameState: GameState): boolean {
    // Game ends when deck is empty or showdown is resolved
    return gameState.deck.length === 0 || gameState.phase === GamePhase.GAME_END
  }

  /**
   * Gets the rules for this game instance
   */
  getRules(): GameRules {
    return { ...this.rules }
  }
}