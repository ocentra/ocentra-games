import { type GameState, type PlayerAction, AIPersonality } from '@/types'
import { AIEngine, type AIConfig, type AIDecision } from './AIEngine'
import { logAI } from '@/utils/logger'

export class AIManager {
  private aiEngines: Map<string, AIEngine> = new Map()

  constructor() {}

  /**
   * Initialize AI engines for all AI players in the game
   */
  async initializeAIEngines(gameState: GameState): Promise<void> {
    logAI('Initializing AI engines for game state')
    const aiPlayers = gameState.players.filter(player => player.isAI)
    logAI('Found AI players:', aiPlayers.length)
    
    for (const player of aiPlayers) {
      logAI('Initializing AI engine for player:', player.name)
      const aiConfig: AIConfig = {
        personality: this.mapPersonality(player.aiPersonality || AIPersonality.ADAPTIVE),
        difficulty: 'medium', // Default difficulty, can be configured
        enableWebGPU: false // Default to false for broader compatibility
      }

      const aiEngine = new AIEngine(player.id, aiConfig)
      await aiEngine.initialize()
      this.aiEngines.set(player.id, aiEngine)
    }
    logAI('AI engines initialized successfully')
  }

  /**
   * Get AI decision for a specific player
   */
  async getAIDecision(playerId: string, gameState: GameState): Promise<AIDecision | null> {
    logAI('Getting AI decision for player:', playerId)
    const aiEngine = this.aiEngines.get(playerId)
    if (!aiEngine) {
      logAI(`No AI engine found for player ${playerId}`)
      console.warn(`No AI engine found for player ${playerId}`)
      return null
    }

    try {
      logAI('Making decision with AI engine for player:', playerId)
      const decision = await aiEngine.makeDecision(gameState)
      logAI('AI decision received for player:', playerId, decision)
      return decision
    } catch (error) {
      logAI(`Error getting AI decision for player ${playerId}:`, error)
      console.error(`Error getting AI decision for player ${playerId}:`, error)
      return null
    }
  }

  /**
   * Convert AI personality to AI config personality
   */
  private mapPersonality(personality: AIPersonality): AIConfig['personality'] {
    switch (personality) {
      case AIPersonality.AGGRESSIVE:
        return 'aggressive'
      case AIPersonality.CONSERVATIVE:
        return 'conservative'
      case AIPersonality.ADAPTIVE:
        return 'adaptive'
      case AIPersonality.UNPREDICTABLE:
        // For unpredictable, we'll use adaptive with higher randomness
        return 'adaptive'
      default:
        return 'adaptive'
    }
  }

  /**
   * Create PlayerAction from AIDecision
   */
  createPlayerActionFromDecision(playerId: string, decision: AIDecision): PlayerAction {
    return {
      type: decision.action,
      playerId,
      data: decision.data,
      timestamp: new Date()
    }
  }

  /**
   * Check if a player is an AI player
   */
  isAIPlayer(playerId: string): boolean {
    return this.aiEngines.has(playerId)
  }

  /**
   * Clean up AI engines
   */
  destroy(): void {
    this.aiEngines.clear()
  }
}