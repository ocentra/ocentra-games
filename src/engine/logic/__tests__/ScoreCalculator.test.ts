import { describe, it, expect, beforeEach } from 'vitest'
import { ScoreCalculator } from '../ScoreCalculator'
import { type Player, type GameState, type CardValue, Suit, GamePhase } from '@/types'

describe('ScoreCalculator', () => {
  let scoreCalculator: ScoreCalculator
  let mockGameState: GameState

  beforeEach(() => {
    scoreCalculator = new ScoreCalculator()
    
    mockGameState = {
      id: 'test-game',
      players: [],
      currentPlayer: 0,
      phase: GamePhase.SCORING,
      deck: [],
      floorCard: null,
      discardPile: [],
      round: 1,
      startTime: new Date(),
      lastAction: new Date(),
    }
  })

  describe('calculatePlayerScore', () => {
    it('should calculate score for declared player with clean sweep', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [
          { id: 'ace_spades', suit: Suit.SPADES, value: 14 },
          { id: 'king_spades', suit: Suit.SPADES, value: 13 },
          { id: 'queen_spades', suit: Suit.SPADES, value: 12 },
        ],
        declaredSuit: Suit.SPADES,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      }

      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player, mockGameState)
      
      expect(scoreBreakdown.baseScore).toBe(39) // 14 + 13 + 12
      expect(scoreBreakdown.multiplier).toBe(3)
      expect(scoreBreakdown.positivePoints).toBe(117) // 39 × 3
      expect(scoreBreakdown.penalties).toBe(0)
      expect(scoreBreakdown.bonuses).toBe(50) // Clean sweep bonus
      expect(scoreBreakdown.totalScore).toBe(167) // 117 + 50 - 0
      expect(scoreBreakdown.bonusDetails.cleanSweep).toBe(true)
    })

    it('should calculate score for declared player with penalties', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [
          { id: 'ace_spades', suit: Suit.SPADES, value: 14 },
          { id: 'king_spades', suit: Suit.SPADES, value: 13 },
          { id: 'queen_hearts', suit: Suit.HEARTS, value: 12 }, // Penalty card
        ],
        declaredSuit: Suit.SPADES,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      }

      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player, mockGameState)
      
      expect(scoreBreakdown.baseScore).toBe(27) // 14 + 13
      expect(scoreBreakdown.multiplier).toBe(2)
      expect(scoreBreakdown.positivePoints).toBe(54) // 27 × 2
      expect(scoreBreakdown.penalties).toBe(12) // Queen of hearts
      expect(scoreBreakdown.bonuses).toBe(0) // No clean sweep
      expect(scoreBreakdown.totalScore).toBe(42) // 54 + 0 - 12
      expect(scoreBreakdown.bonusDetails.cleanSweep).toBe(false)
    })

    it('should calculate penalty for undeclared player', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [
          { id: 'ace_spades', suit: Suit.SPADES, value: 14 },
          { id: 'king_hearts', suit: Suit.HEARTS, value: 13 },
          { id: 'queen_diamonds', suit: Suit.DIAMONDS, value: 12 },
        ],
        declaredSuit: null, // Undeclared
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      }

      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player, mockGameState)
      
      expect(scoreBreakdown.baseScore).toBe(0)
      expect(scoreBreakdown.multiplier).toBe(0)
      expect(scoreBreakdown.positivePoints).toBe(0)
      expect(scoreBreakdown.penalties).toBe(117) // (14 + 13 + 12) × 3
      expect(scoreBreakdown.bonuses).toBe(0)
      expect(scoreBreakdown.totalScore).toBe(-117)
    })

    it('should detect long run bonus', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [
          { id: '10_spades', suit: Suit.SPADES, value: 10 },
          { id: 'jack_spades', suit: Suit.SPADES, value: 11 },
          { id: 'queen_spades', suit: Suit.SPADES, value: 12 },
          { id: 'king_spades', suit: Suit.SPADES, value: 13 },
        ],
        declaredSuit: Suit.SPADES,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      }

      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player, mockGameState)
      
      expect(scoreBreakdown.bonusDetails.longRuns).toBe(1)
      expect(scoreBreakdown.bonuses).toBe(75) // Clean sweep (50) + Long run (25)
    })

    it('should handle multiple long runs in same hand', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [
          { id: '2_spades', suit: Suit.SPADES, value: 2 as CardValue },
          { id: '3_spades', suit: Suit.SPADES, value: 3 as CardValue },
          { id: '4_spades', suit: Suit.SPADES, value: 4 as CardValue },
          { id: '5_spades', suit: Suit.SPADES, value: 5 as CardValue },
          { id: '10_spades', suit: Suit.SPADES, value: 10 as CardValue },
          { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
          { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
          { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
        ],
        declaredSuit: Suit.SPADES,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      }

      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player, mockGameState)
      
      expect(scoreBreakdown.bonusDetails.longRuns).toBe(2) // Two separate runs of 4
      expect(scoreBreakdown.bonuses).toBe(100) // Clean sweep (50) + 2 Long runs (50)
    })

    it('should handle edge case with ace-high run', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [
          { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
          { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
          { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
          { id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue },
        ],
        declaredSuit: Suit.SPADES,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      }

      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player, mockGameState)
      
      expect(scoreBreakdown.bonusDetails.longRuns).toBe(1)
      expect(scoreBreakdown.bonuses).toBe(75) // Clean sweep (50) + Long run (25)
    })

    it('should handle duplicate cards in long run detection', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [
          { id: '10_spades_1', suit: Suit.SPADES, value: 10 as CardValue },
          { id: '10_spades_2', suit: Suit.SPADES, value: 10 as CardValue }, // Duplicate
          { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
          { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
          { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
        ],
        declaredSuit: Suit.SPADES,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      }

      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player, mockGameState)
      
      expect(scoreBreakdown.bonusDetails.longRuns).toBe(1) // Should still detect the run
      expect(scoreBreakdown.bonuses).toBe(75) // Clean sweep (50) + Long run (25)
    })

    it('should calculate complex scoring scenario', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [
          { id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue },
          { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
          { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
          { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
          { id: '10_spades', suit: Suit.SPADES, value: 10 as CardValue },
          { id: 'ace_hearts', suit: Suit.HEARTS, value: 14 as CardValue }, // Penalty
          { id: 'king_diamonds', suit: Suit.DIAMONDS, value: 13 as CardValue }, // Penalty
        ],
        declaredSuit: Suit.SPADES,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      }

      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player, mockGameState)
      
      expect(scoreBreakdown.baseScore).toBe(60) // 14+13+12+11+10
      expect(scoreBreakdown.multiplier).toBe(5)
      expect(scoreBreakdown.positivePoints).toBe(300) // 60 × 5
      expect(scoreBreakdown.penalties).toBe(27) // 14 + 13
      expect(scoreBreakdown.bonuses).toBe(25) // Long run only (no clean sweep)
      expect(scoreBreakdown.totalScore).toBe(298) // 300 + 25 - 27
      expect(scoreBreakdown.bonusDetails.cleanSweep).toBe(false)
      expect(scoreBreakdown.bonusDetails.longRuns).toBe(1)
    })

    it('should handle empty hand edge case', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [],
        declaredSuit: Suit.SPADES,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      }

      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player, mockGameState)
      
      expect(scoreBreakdown.baseScore).toBe(0)
      expect(scoreBreakdown.multiplier).toBe(0)
      expect(scoreBreakdown.positivePoints).toBe(0)
      expect(scoreBreakdown.penalties).toBe(0)
      expect(scoreBreakdown.bonuses).toBe(50) // Clean sweep bonus (no penalty cards)
      expect(scoreBreakdown.totalScore).toBe(50)
    })

    it('should handle undeclared player with large hand', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [
          { id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue },
          { id: 'king_hearts', suit: Suit.HEARTS, value: 13 as CardValue },
          { id: 'queen_diamonds', suit: Suit.DIAMONDS, value: 12 as CardValue },
          { id: 'jack_clubs', suit: Suit.CLUBS, value: 11 as CardValue },
          { id: '10_spades', suit: Suit.SPADES, value: 10 as CardValue },
          { id: '9_hearts', suit: Suit.HEARTS, value: 9 as CardValue },
          { id: '8_diamonds', suit: Suit.DIAMONDS, value: 8 as CardValue },
        ],
        declaredSuit: null, // Undeclared
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      }

      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player, mockGameState)
      
      const totalValue = 14 + 13 + 12 + 11 + 10 + 9 + 8 // 77
      const handSize = 7
      expect(scoreBreakdown.penalties).toBe(totalValue * handSize) // 77 × 7 = 539
      expect(scoreBreakdown.totalScore).toBe(-539)
    })
  })

  describe('calculateAllScores', () => {
    it('should calculate scores for all players in game', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          avatar: '',
          hand: [
            { id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue },
            { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
          ],
          declaredSuit: Suit.SPADES,
          intentCard: null,
          score: 0,
          isConnected: true,
          isAI: false,
        },
        {
          id: 'player2',
          name: 'Player 2',
          avatar: '',
          hand: [
            { id: 'queen_hearts', suit: Suit.HEARTS, value: 12 as CardValue },
            { id: 'jack_hearts', suit: Suit.HEARTS, value: 11 as CardValue },
          ],
          declaredSuit: null, // Undeclared
          intentCard: null,
          score: 0,
          isConnected: true,
          isAI: false,
        },
      ]

      mockGameState.players = players
      const allScores = scoreCalculator.calculateAllScores(mockGameState)
      
      expect(allScores.size).toBe(2)
      expect(allScores.get('player1')?.totalScore).toBe(104) // (14+13) × 2 + 50 = 54 + 50
      expect(allScores.get('player2')?.totalScore).toBe(-46) // -(12+11) × 2 = -46
    })
  })

  describe('determineWinners', () => {
    it('should determine single winner', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          avatar: '',
          hand: [
            { id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue },
            { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
          ],
          declaredSuit: Suit.SPADES,
          intentCard: null,
          score: 0,
          isConnected: true,
          isAI: false,
        },
        {
          id: 'player2',
          name: 'Player 2',
          avatar: '',
          hand: [
            { id: 'queen_hearts', suit: Suit.HEARTS, value: 12 as CardValue },
          ],
          declaredSuit: Suit.HEARTS,
          intentCard: null,
          score: 0,
          isConnected: true,
          isAI: false,
        },
      ]

      mockGameState.players = players
      const result = scoreCalculator.determineWinners(mockGameState)
      
      expect(result.winners).toHaveLength(1)
      expect(result.winners[0].id).toBe('player1')
    })

    it('should handle tie scenarios', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          avatar: '',
          hand: [
            { id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue },
          ],
          declaredSuit: Suit.SPADES,
          intentCard: null,
          score: 0,
          isConnected: true,
          isAI: false,
        },
        {
          id: 'player2',
          name: 'Player 2',
          avatar: '',
          hand: [
            { id: 'ace_hearts', suit: Suit.HEARTS, value: 14 as CardValue },
          ],
          declaredSuit: Suit.HEARTS,
          intentCard: null,
          score: 0,
          isConnected: true,
          isAI: false,
        },
      ]

      mockGameState.players = players
      const result = scoreCalculator.determineWinners(mockGameState)
      
      expect(result.winners).toHaveLength(2) // Both have same score: 14 × 1 + 50 = 64
      expect(result.winners.map(p => p.id)).toContain('player1')
      expect(result.winners.map(p => p.id)).toContain('player2')
    })
  })

  describe('validateRebuttal', () => {
    it('should validate a proper 3-card run', () => {
      const cards = [
        { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
        { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
        { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
      ]

      const result = scoreCalculator.validateRebuttal(cards)
      
      expect(result.isValid).toBe(true)
      expect(result.runValue).toBe(36) // 11 + 12 + 13
    })

    it('should reject non-consecutive cards', () => {
      const cards = [
        { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
        { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue }, // Missing queen
        { id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue },
      ]

      const result = scoreCalculator.validateRebuttal(cards)
      
      expect(result.isValid).toBe(false)
      expect(result.runValue).toBe(0)
    })

    it('should reject mixed suits', () => {
      const cards = [
        { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
        { id: 'queen_hearts', suit: Suit.HEARTS, value: 12 as CardValue }, // Different suit
        { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
      ]

      const result = scoreCalculator.validateRebuttal(cards)
      
      expect(result.isValid).toBe(false)
      expect(result.runValue).toBe(0)
    })

    it('should reject wrong number of cards', () => {
      const cards = [
        { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
        { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
      ]

      const result = scoreCalculator.validateRebuttal(cards)
      
      expect(result.isValid).toBe(false)
      expect(result.runValue).toBe(0)
    })

    it('should validate ace-high rebuttal', () => {
      const cards = [
        { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
        { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
        { id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue },
      ]

      const result = scoreCalculator.validateRebuttal(cards)
      
      expect(result.isValid).toBe(true)
      expect(result.runValue).toBe(39) // 12 + 13 + 14
    })

    it('should validate low-value rebuttal', () => {
      const cards = [
        { id: '2_clubs', suit: Suit.CLUBS, value: 2 as CardValue },
        { id: '3_clubs', suit: Suit.CLUBS, value: 3 as CardValue },
        { id: '4_clubs', suit: Suit.CLUBS, value: 4 as CardValue },
      ]

      const result = scoreCalculator.validateRebuttal(cards)
      
      expect(result.isValid).toBe(true)
      expect(result.runValue).toBe(9) // 2 + 3 + 4
    })

    it('should reject ace-low wrap around', () => {
      const cards = [
        { id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue },
        { id: '2_spades', suit: Suit.SPADES, value: 2 as CardValue },
        { id: '3_spades', suit: Suit.SPADES, value: 3 as CardValue },
      ]

      const result = scoreCalculator.validateRebuttal(cards)
      
      expect(result.isValid).toBe(false) // Ace doesn't wrap around to 2
      expect(result.runValue).toBe(0)
    })

    it('should handle cards in wrong order', () => {
      const cards = [
        { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
        { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
        { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
      ]

      const result = scoreCalculator.validateRebuttal(cards)
      
      expect(result.isValid).toBe(true) // Should sort internally
      expect(result.runValue).toBe(36) // 11 + 12 + 13
    })
  })
})