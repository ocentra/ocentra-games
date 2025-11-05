import { type GameState, type PlayerAction, type Player, GamePhase, AIPersonality } from '@/types'
import { 
  RuleEngine, 
  DeckManager, 
  TurnManager, 
  ScoreCalculator, 
  StateValidator,
  type GameRules,
  type ValidationResult 
} from './logic'
import { AIManager } from '@/ai/AIManager'
import { logGameEngine } from '@/utils/logger'

export interface GameConfig {
  maxPlayers: number
  aiDifficulty?: 'easy' | 'medium' | 'hard'
  enablePhysics: boolean
  seed?: number
  rules?: Partial<GameRules>
}

export type StateUpdateCallback = (state: GameState) => void

export class GameEngine {
  private gameState: GameState | null = null
  private updateCallbacks: Set<StateUpdateCallback> = new Set()
  private aiManager: AIManager
  
  // Game logic components
  private ruleEngine: RuleEngine
  private deckManager: DeckManager
  private turnManager: TurnManager
  private scoreCalculator: ScoreCalculator
  private stateValidator: StateValidator

  constructor() {
    this.ruleEngine = new RuleEngine()
    this.deckManager = new DeckManager()
    this.turnManager = new TurnManager()
    this.scoreCalculator = new ScoreCalculator()
    this.stateValidator = new StateValidator()
    this.aiManager = new AIManager()
  }

  async initializeGame(config: GameConfig): Promise<void> {
    logGameEngine('Initializing game with config:', config)
    // Initialize rule engine with custom rules if provided
    if (config.rules) {
      // Merge partial rules with defaults
      const mergedRules = { ...this.ruleEngine.getRules(), ...config.rules }
      this.ruleEngine = new RuleEngine(mergedRules)
    }

    // Set up deck manager with seed for deterministic shuffling
    if (config.seed) {
      this.deckManager.setSeed(config.seed)
    }

    // Create and shuffle deck
    const deck = this.deckManager.createStandardDeck()
    const shuffledDeck = this.deckManager.shuffleDeck(deck)

    // Initialize game state
    this.gameState = {
      id: crypto.randomUUID(),
      players: [],
      currentPlayer: 0,
      phase: GamePhase.DEALING,
      deck: shuffledDeck,
      floorCard: null,
      discardPile: [],
      round: 1,
      startTime: new Date(),
      lastAction: new Date(),
    }

    logGameEngine('Game initialized with config:', config)
    console.log('Game initialized with config:', config)
  }

  /**
   * Initialize AI engines for all AI players in the game
   */
  async initializeAIEngines(): Promise<void> {
    logGameEngine('Initializing AI engines')
    if (!this.gameState) {
      logGameEngine('Game not initialized')
      throw new Error('Game not initialized')
    }
    
    logGameEngine('Initializing AI engines with game state')
    await this.aiManager.initializeAIEngines(this.gameState)
    logGameEngine('AI engines initialized successfully')
  }

  /**
   * Get AI action for the current player if they are an AI
   */
  async getAIAction(): Promise<PlayerAction | null> {
    if (!this.gameState) {
      throw new Error('Game not initialized')
    }
    
    const currentPlayer = this.gameState.players[this.gameState.currentPlayer]
    
    // Check if current player is an AI
    if (!currentPlayer.isAI) {
      return null
    }
    
    // Get AI decision
    const decision = await this.aiManager.getAIDecision(currentPlayer.id, this.gameState)
    if (!decision) {
      return null
    }
    
    // Convert decision to player action
    return this.aiManager.createPlayerActionFromDecision(currentPlayer.id, decision)
  }

  /**
   * Adds a player to the game
   */
  addPlayer(playerData: {
    id: string
    name: string
    avatar?: string
    isAI?: boolean
    aiPersonality?: AIPersonality
  }): void {
    if (!this.gameState) {
      throw new Error('Game not initialized')
    }

    if (this.gameState.players.length >= this.ruleEngine.getRules().maxPlayers) {
      throw new Error('Game is full')
    }

    const player: Player = {
      id: playerData.id,
      name: playerData.name,
      avatar: playerData.avatar || '',
      hand: [],
      declaredSuit: null,
      intentCard: null,
      score: 0,
      isConnected: true,
      isAI: playerData.isAI || false,
      aiPersonality: playerData.aiPersonality,
    }

    this.gameState.players.push(player)
    this.notifyStateUpdate()
  }

  /**
   * Starts the game by dealing initial hands
   */
  async startGame(): Promise<void> {
    logGameEngine('Starting game')
    if (!this.gameState) {
      logGameEngine('Game not initialized')
      throw new Error('Game not initialized')
    }

    if (this.gameState.players.length < 2) {
      logGameEngine('Need at least 2 players to start, current players:', this.gameState.players.length)
      throw new Error('Need at least 2 players to start')
    }

    logGameEngine('Dealing initial hands')
    // Deal initial hands
    const rules = this.ruleEngine.getRules()
    const { hands, remainingDeck } = this.deckManager.dealInitialHands(
      this.gameState.deck,
      this.gameState.players.length,
      rules.initialHandSize
    )

    // Update player hands
    this.gameState.players.forEach((player, index) => {
      player.hand = hands[index]
    })

    // Update deck and move to floor reveal phase
    this.gameState.deck = remainingDeck
    this.gameState.phase = GamePhase.FLOOR_REVEAL
    
    logGameEngine('Revealing floor card')
    // Reveal first floor card
    this.revealFloorCard()
    
    logGameEngine('Initializing AI engines')
    // Initialize AI engines
    await this.initializeAIEngines()
    
    logGameEngine('Notifying state update')
    this.notifyStateUpdate()
    logGameEngine('Game started successfully')
  }

  async startSinglePlayer(difficulty: 'easy' | 'medium' | 'hard'): Promise<void> {
    logGameEngine('Starting single player game with difficulty:', difficulty)
    if (!this.gameState) {
      logGameEngine('Game not initialized')
      throw new Error('Game not initialized')
    }
    
    // Add AI players to fill the game
    const aiPersonalities: AIPersonality[] = [
      AIPersonality.AGGRESSIVE,
      AIPersonality.CONSERVATIVE,
      AIPersonality.ADAPTIVE
    ]

    logGameEngine('Adding AI players to fill the game')
    for (let i = this.gameState.players.length; i < 4; i++) {
      this.addPlayer({
        id: `ai-${i}`,
        name: `AI Player ${i}`,
        isAI: true,
        aiPersonality: aiPersonalities[i % aiPersonalities.length],
      })
    }

    logGameEngine('Starting game')
    await this.startGame()
    logGameEngine('Started single player game with difficulty:', difficulty)
    console.log('Started single player game with difficulty:', difficulty)
  }

  startMultiplayer(roomId: string): void {
    if (!this.gameState) {
      throw new Error('Game not initialized')
    }
    // TODO: Implementation will be added in task 11 (WebRTC networking)
    console.log('Starting multiplayer game with room:', roomId)
  }

  processPlayerAction(action: PlayerAction): ValidationResult {
    if (!this.gameState) {
      throw new Error('Game not initialized')
    }

    // Validate the action
    const validation = this.stateValidator.validatePlayerAction(action, this.gameState)
    if (!validation.isValid) {
      console.warn('Invalid action:', validation.errors)
      return validation
    }

    // Validate against game rules
    const isLegal = this.ruleEngine.validateAction(action, this.gameState)
    if (!isLegal) {
      return {
        isValid: false,
        errors: ['Action violates game rules'],
        warnings: [],
      }
    }

    // Process the action through turn manager
    const stateUpdates = this.turnManager.processTurnAction(this.gameState, action)
    
    // Apply updates to game state
    Object.assign(this.gameState, stateUpdates)

    // Check for phase transitions
    const nextPhase = this.ruleEngine.getNextPhase(this.gameState.phase, action)
    if (nextPhase !== this.gameState.phase) {
      this.gameState.phase = nextPhase
      this.handlePhaseTransition(nextPhase)
    }

    // Check if game should end
    if (this.ruleEngine.shouldEndGame(this.gameState)) {
      this.endGame()
    }

    this.notifyStateUpdate()
    return validation
  }

  /**
   * Reveals the next floor card from the deck
   */
  private revealFloorCard(): void {
    if (!this.gameState) return

    const { card, remainingDeck } = this.deckManager.drawCard(this.gameState.deck)
    this.gameState.floorCard = card
    this.gameState.deck = remainingDeck
  }

  /**
   * Handles transitions between game phases
   */
  private handlePhaseTransition(newPhase: GamePhase): void {
    if (!this.gameState) return

    switch (newPhase) {
      case GamePhase.FLOOR_REVEAL:
        this.revealFloorCard()
        break
      
      case GamePhase.SCORING:
        this.calculateFinalScores()
        break
      
      case GamePhase.GAME_END:
        this.endGame()
        break
    }
  }

  /**
   * Calculates final scores for all players
   */
  private calculateFinalScores(): void {
    if (!this.gameState) return

    const scores = this.scoreCalculator.calculateAllScores(this.gameState)
    
    // Update player scores
    this.gameState.players.forEach(player => {
      const scoreBreakdown = scores.get(player.id)
      if (scoreBreakdown) {
        player.score = scoreBreakdown.totalScore
      }
    })
  }

  /**
   * Ends the game and determines winners
   */
  private endGame(): void {
    if (!this.gameState) return

    this.gameState.phase = GamePhase.GAME_END
    
    const { winners, scores } = this.scoreCalculator.determineWinners(this.gameState)
    
    console.log('Game ended. Winners:', winners.map(w => w.name))
    console.log('Final scores:', Array.from(scores.entries()))
  }

  /**
   * Gets the current game seed for synchronization
   */
  getGameSeed(): number {
    return this.deckManager.getSeed()
  }

  /**
   * Validates the current game state
   */
  validateGameState(): ValidationResult {
    if (!this.gameState) {
      return {
        isValid: false,
        errors: ['Game not initialized'],
        warnings: [],
      }
    }

    return this.stateValidator.validateGameState(this.gameState)
  }

  getGameState(): GameState | null {
    return this.gameState
  }

  subscribeToUpdates(callback: StateUpdateCallback): () => void {
    this.updateCallbacks.add(callback)
    return () => this.updateCallbacks.delete(callback)
  }

  private notifyStateUpdate(): void {
    if (this.gameState) {
      this.updateCallbacks.forEach(callback => callback(this.gameState!))
    }
  }
}
