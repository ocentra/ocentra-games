import { pipeline, env } from '@huggingface/transformers'
import { type Player, type Card, type GameState, Suit, GamePhase } from '@/types'

// Set up environment for Transformers.js
env.allowLocalModels = false
env.useBrowserCache = true

type TextGenerationResult = Array<{
  generated_text: string
}>

type TextGenerationFn = (
  prompt: string,
  options?: {
    max_new_tokens?: number
    temperature?: number
    do_sample?: boolean
  }
) => Promise<TextGenerationResult>

export interface AIDecision {
  action: 'pick_up' | 'decline' | 'declare_intent' | 'call_showdown' | 'rebuttal'
  data?: Record<string, unknown>
  confidence: number
}

export interface AIConfig {
  personality: 'aggressive' | 'conservative' | 'adaptive'
  difficulty: 'easy' | 'medium' | 'hard'
  enableWebGPU?: boolean
}

export class AIEngine {
  private generator: TextGenerationFn | null = null
  private config: AIConfig
  private playerId: string

  constructor(playerId: string, config: AIConfig) {
    this.playerId = playerId
    this.config = config
  }

  async initialize(): Promise<void> {
    try {
      // Initialize the text generation pipeline
      // Using a lightweight model for game strategy decisions
      // Break down type inference to avoid "union type too complex" error
      const pipelineResult = await pipeline('text-generation', 'Xenova/distilgpt2')
      this.generator = pipelineResult as unknown as TextGenerationFn
      console.log('AI engine initialized for player:', this.playerId)
    } catch (error) {
      console.error('Failed to initialize AI engine:', error)
      // Fallback to rule-based AI if model fails to load
      this.generator = null
    }
  }

  async makeDecision(gameState: GameState): Promise<AIDecision> {
    const player = gameState.players.find(p => p.id === this.playerId)
    if (!player) {
      throw new Error(`Player ${this.playerId} not found in game state`)
    }

    // If we have a transformer model, use it for decision making
    if (this.generator) {
      return this.makeDecisionWithModel(gameState, player)
    } else {
      // Fallback to rule-based decision making
      return this.makeRuleBasedDecision(gameState, player)
    }
  }

  private async makeDecisionWithModel(gameState: GameState, player: Player): Promise<AIDecision> {
    try {
      // Create a prompt describing the current game state
      const prompt = this.createGameStatePrompt(gameState, player)
      
      // Generate a decision based on the prompt
      // Null check: generator is checked in makeDecision but TypeScript needs explicit check
      if (!this.generator) {
        return this.makeRuleBasedDecision(gameState, player)
      }
      const output = await this.generator(prompt, {
        max_new_tokens: 50,
        temperature: this.getTemperature(),
        do_sample: true
      })

      // Parse the model's response
      const decision = this.parseModelResponse(output[0].generated_text, gameState, player)
      return decision
    } catch (error) {
      console.error('AI model decision failed, falling back to rule-based:', error)
      return this.makeRuleBasedDecision(gameState, player)
    }
  }

  private createGameStatePrompt(gameState: GameState, player: Player): string {
    const prompt = `CLAIM card game decision:
Player: ${player.name}
Hand: ${player.hand.map(card => `${card.value} of ${card.suit}`).join(', ')}
Phase: ${gameState.phase}
Floor Card: ${gameState.floorCard ? `${gameState.floorCard.value} of ${gameState.floorCard.suit}` : 'None'}
Declared Suits: ${gameState.players.filter(p => p.declaredSuit).map(p => p.declaredSuit).join(', ')}
Current Player: ${gameState.players[gameState.currentPlayer].name}

What should the player do next? Choose from: pick_up, decline, declare_intent, call_showdown, rebuttal`

    return prompt
  }

  private parseModelResponse(response: string, gameState: GameState, player: Player): AIDecision {
    // This is a simplified parser - in a real implementation, you'd want more sophisticated parsing
    const lowerResponse = response.toLowerCase()
    
    if (lowerResponse.includes('pick') || lowerResponse.includes('take')) {
      return { action: 'pick_up', confidence: 0.8 }
    } else if (lowerResponse.includes('decline') || lowerResponse.includes('pass')) {
      return { action: 'decline', confidence: 0.8 }
    } else if (lowerResponse.includes('declare') && gameState.phase === GamePhase.PLAYER_ACTION) {
      // Choose a random suit from player's hand that hasn't been declared yet
      const availableSuits = Array.from(new Set(player.hand.map(card => card.suit)))
        .filter(suit => !gameState.players.some(p => p.declaredSuit === suit))
      
      if (availableSuits.length > 0) {
        const suit = availableSuits[Math.floor(Math.random() * availableSuits.length)]
        return { action: 'declare_intent', data: { suit }, confidence: 0.7 }
      }
    } else if (lowerResponse.includes('showdown') && player.declaredSuit) {
      return { action: 'call_showdown', confidence: 0.7 }
    } else if (lowerResponse.includes('rebuttal') && gameState.phase === GamePhase.SHOWDOWN && !player.declaredSuit) {
      // Try to form a 3-card run from player's hand
      const run = this.findThreeCardRun(player.hand)
      if (run) {
        return { action: 'rebuttal', data: { cards: run }, confidence: 0.6 }
      }
    }

    // Default to rule-based decision if model response is unclear
    return this.makeRuleBasedDecision(gameState, player)
  }

  private makeRuleBasedDecision(gameState: GameState, player: Player): AIDecision {
    switch (gameState.phase) {
      case GamePhase.FLOOR_REVEAL:
        return this.makeFloorRevealDecision(gameState, player)
      
      case GamePhase.PLAYER_ACTION:
        return this.makePlayerActionDecision(gameState, player)
      
      case GamePhase.SHOWDOWN:
        return this.makeShowdownDecision(gameState, player)
      
      default:
        // Default action
        return { action: 'decline', confidence: 0.5 }
    }
  }

  private makeFloorRevealDecision(gameState: GameState, player: Player): AIDecision {
    if (!gameState.floorCard) {
      return { action: 'decline', confidence: 0.5 }
    }

    // Simple rule: pick up if the floor card matches a suit we have
    const hasMatchingSuit = player.hand.some(card => card.suit === gameState.floorCard!.suit)
    
    if (hasMatchingSuit) {
      return { action: 'pick_up', confidence: 0.8 }
    }

    // For conservative AI, decline more often
    if (this.config.personality === 'conservative') {
      return { action: 'decline', confidence: 0.7 }
    }

    // Otherwise, 50% chance to pick up
    return Math.random() > 0.5 
      ? { action: 'pick_up', confidence: 0.5 } 
      : { action: 'decline', confidence: 0.5 }
  }

  private makePlayerActionDecision(gameState: GameState, player: Player): AIDecision {
    // If already declared, consider calling showdown
    if (player.declaredSuit) {
      // Check if we have a good hand for showdown
      const suitCards = player.hand.filter(card => card.suit === player.declaredSuit)
      const hasGoodSequence = suitCards.length >= 3
      
      if (hasGoodSequence && Math.random() > 0.3) {
        return { action: 'call_showdown', confidence: 0.8 }
      }
      
      return { action: 'decline', confidence: 0.6 }
    }

    // Otherwise, consider declaring intent
    // Find suits we have cards for that haven't been declared yet
    const availableSuits = Array.from(new Set(player.hand.map(card => card.suit)))
      .filter(suit => !gameState.players.some(p => p.declaredSuit === suit))

    if (availableSuits.length > 0) {
      // Choose based on personality
      let chosenSuit: Suit
      if (this.config.personality === 'aggressive') {
        // Aggressive AI declares early
        chosenSuit = availableSuits[Math.floor(Math.random() * availableSuits.length)]
        return { action: 'declare_intent', data: { suit: chosenSuit }, confidence: 0.7 }
      } else if (this.config.personality === 'conservative') {
        // Conservative AI waits for better opportunities
        if (Math.random() > 0.7) {
          chosenSuit = availableSuits[Math.floor(Math.random() * availableSuits.length)]
          return { action: 'declare_intent', data: { suit: chosenSuit }, confidence: 0.6 }
        }
      } else {
        // Adaptive AI
        if (Math.random() > 0.5) {
          chosenSuit = availableSuits[Math.floor(Math.random() * availableSuits.length)]
          return { action: 'declare_intent', data: { suit: chosenSuit }, confidence: 0.6 }
        }
      }
    }

    return { action: 'decline', confidence: 0.5 }
  }

  private makeShowdownDecision(_gameState: GameState, player: Player): AIDecision {
    // Only undeclared players can rebuttal
    if (player.declaredSuit) {
      return { action: 'decline', confidence: 0.5 }
    }

    // Try to form a 3-card run
    const run = this.findThreeCardRun(player.hand)
    if (run) {
      // Consider personality when deciding to rebuttal
      const shouldRebuttal = this.config.personality === 'aggressive' 
        ? Math.random() > 0.3 
        : Math.random() > 0.6
      
      if (shouldRebuttal) {
        return { action: 'rebuttal', data: { cards: run }, confidence: 0.7 }
      }
    }

    return { action: 'decline', confidence: 0.5 }
  }

  private findThreeCardRun(cards: Card[]): Card[] | null {
    // Group cards by suit
    const cardsBySuit: Record<string, Card[]> = {}
    cards.forEach(card => {
      if (!cardsBySuit[card.suit]) {
        cardsBySuit[card.suit] = []
      }
      cardsBySuit[card.suit].push(card)
    })

    // Look for 3 consecutive cards in any suit
    for (const suit in cardsBySuit) {
      const suitCards = cardsBySuit[suit].sort((a, b) => a.value - b.value)
      
      for (let i = 0; i <= suitCards.length - 3; i++) {
        const card1 = suitCards[i]
        const card2 = suitCards[i + 1]
        const card3 = suitCards[i + 2]
        
        // Check for consecutive values
        if (card2.value === card1.value + 1 && card3.value === card2.value + 1) {
          return [card1, card2, card3]
        }
        
        // Check for A-K-2 wraparound
        if (card1.value === 2 && card2.value === 13 && card3.value === 14) {
          return [card1, card2, card3]
        }
      }
    }

    return null
  }

  private getTemperature(): number {
    switch (this.config.difficulty) {
      case 'easy':
        return 0.9 // More random decisions
      case 'medium':
        return 0.7
      case 'hard':
        return 0.5 // More deterministic decisions
      default:
        return 0.7
    }
  }

  isReady(): boolean {
    return this.generator !== null
  }
}