import { describe, it, expect, beforeEach } from 'vitest'
import { GameEngine } from '../GameEngine'
import { GamePhase, Suit } from '@/types'

describe('GameEngine', () => {
  let gameEngine: GameEngine

  beforeEach(() => {
    gameEngine = new GameEngine()
  })

  describe('initializeGame', () => {
    it('should initialize game with shuffled deck', async () => {
      await gameEngine.initializeGame({
        maxPlayers: 4,
        enablePhysics: true,
        seed: 12345,
      })

      const gameState = gameEngine.getGameState()
      expect(gameState).toBeTruthy()
      expect(gameState!.deck).toHaveLength(52)
      expect(gameState!.phase).toBe(GamePhase.DEALING)
      expect(gameState!.players).toHaveLength(0)
    })
  })

  describe('addPlayer', () => {
    it('should add players to the game', async () => {
      await gameEngine.initializeGame({
        maxPlayers: 4,
        enablePhysics: true,
      })

      gameEngine.addPlayer({
        id: 'player1',
        name: 'Test Player',
      })

      const gameState = gameEngine.getGameState()
      expect(gameState!.players).toHaveLength(1)
      expect(gameState!.players[0].name).toBe('Test Player')
    })

    it('should reject players when game is full', async () => {
      // Initialize with custom rules that limit to 2 players
      const customRules = { maxPlayers: 2, initialHandSize: 3, deckSize: 52 }
      gameEngine = new GameEngine()
      await gameEngine.initializeGame({
        maxPlayers: 4,
        enablePhysics: true,
        rules: customRules,
      })

      gameEngine.addPlayer({ id: 'player1', name: 'Player 1' })
      gameEngine.addPlayer({ id: 'player2', name: 'Player 2' })

      expect(() => {
        gameEngine.addPlayer({ id: 'player3', name: 'Player 3' })
      }).toThrow('Game is full')
    })
  })

  describe('startGame', () => {
    it('should deal cards and transition to floor reveal', async () => {
      await gameEngine.initializeGame({
        maxPlayers: 4,
        enablePhysics: true,
      })

      gameEngine.addPlayer({ id: 'player1', name: 'Player 1' })
      gameEngine.addPlayer({ id: 'player2', name: 'Player 2' })
      
      gameEngine.startGame()

      const gameState = gameEngine.getGameState()
      expect(gameState!.phase).toBe(GamePhase.FLOOR_REVEAL)
      expect(gameState!.players[0].hand).toHaveLength(3)
      expect(gameState!.players[1].hand).toHaveLength(3)
      expect(gameState!.floorCard).toBeTruthy()
      expect(gameState!.deck).toHaveLength(52 - 6 - 1) // 52 - (2 players × 3 cards) - 1 floor card
    })
  })

  describe('processPlayerAction', () => {
    beforeEach(async () => {
      await gameEngine.initializeGame({
        maxPlayers: 4,
        enablePhysics: true,
      })

      gameEngine.addPlayer({ id: 'player1', name: 'Player 1' })
      gameEngine.addPlayer({ id: 'player2', name: 'Player 2' })
      gameEngine.startGame()
    })

    it('should process valid pick up action', () => {
      const result = gameEngine.processPlayerAction({
        type: 'pick_up',
        playerId: 'player1',
        timestamp: new Date(),
      })

      expect(result.isValid).toBe(true)
      
      const gameState = gameEngine.getGameState()
      expect(gameState!.phase).toBe(GamePhase.PLAYER_ACTION)
      expect(gameState!.players[0].hand).toHaveLength(4) // 3 initial + 1 picked up
      expect(gameState!.floorCard).toBeNull()
    })

    it('should reject invalid action', () => {
      const result = gameEngine.processPlayerAction({
        type: 'pick_up',
        playerId: 'player2', // Not player 1's turn
        timestamp: new Date(),
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Action violates game rules')
    })
  })

  describe('validateGameState', () => {
    it('should validate initialized game state', async () => {
      await gameEngine.initializeGame({
        maxPlayers: 4,
        enablePhysics: true,
      })

      gameEngine.addPlayer({ id: 'player1', name: 'Player 1' })
      gameEngine.addPlayer({ id: 'player2', name: 'Player 2' })
      gameEngine.startGame()

      const validation = gameEngine.validateGameState()
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })
})