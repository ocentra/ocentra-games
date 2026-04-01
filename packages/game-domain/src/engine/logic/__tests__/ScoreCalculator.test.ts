import { ScoreCalculator } from '../ScoreCalculator';
import {
  type Player,
  type GameState,
  type CardValue,
  Suit,
  GamePhase,
} from '@/types/game';

describe.skip('ScoreCalculator', () => {
  let scoreCalculator: ScoreCalculator;
  let mockGameState: GameState;

  beforeEach(() => {
    scoreCalculator = new ScoreCalculator();
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
    };
  });

  describe('calculatePlayerScore', () => {
    it('ScoreCalculator.calculatePlayerScore: calculates score for declared player with clean sweep', () => {
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
      };
      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player);
      expect(scoreBreakdown.baseScore).toBe(39);
      expect(scoreBreakdown.multiplier).toBe(3);
      expect(scoreBreakdown.positivePoints).toBe(117);
      expect(scoreBreakdown.penalties).toBe(0);
      expect(scoreBreakdown.bonuses).toBe(50);
      expect(scoreBreakdown.totalScore).toBe(167);
      expect(scoreBreakdown.bonusDetails.cleanSweep).toBe(true);
    });

    it('ScoreCalculator.calculatePlayerScore: calculates score for declared player with penalties', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [
          { id: 'ace_spades', suit: Suit.SPADES, value: 14 },
          { id: 'king_spades', suit: Suit.SPADES, value: 13 },
          { id: 'queen_hearts', suit: Suit.HEARTS, value: 12 },
        ],
        declaredSuit: Suit.SPADES,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      };
      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player);
      expect(scoreBreakdown.baseScore).toBe(27);
      expect(scoreBreakdown.multiplier).toBe(2);
      expect(scoreBreakdown.positivePoints).toBe(54);
      expect(scoreBreakdown.penalties).toBe(12);
      expect(scoreBreakdown.bonuses).toBe(0);
      expect(scoreBreakdown.totalScore).toBe(42);
      expect(scoreBreakdown.bonusDetails.cleanSweep).toBe(false);
    });

    it('ScoreCalculator.calculatePlayerScore: calculates penalty for undeclared player', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [
          { id: 'ace_spades', suit: Suit.SPADES, value: 14 },
          { id: 'king_hearts', suit: Suit.HEARTS, value: 13 },
          { id: 'queen_diamonds', suit: Suit.DIAMONDS, value: 12 },
        ],
        declaredSuit: null,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      };
      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player);
      expect(scoreBreakdown.baseScore).toBe(0);
      expect(scoreBreakdown.multiplier).toBe(0);
      expect(scoreBreakdown.positivePoints).toBe(0);
      expect(scoreBreakdown.penalties).toBe(117);
      expect(scoreBreakdown.bonuses).toBe(0);
      expect(scoreBreakdown.totalScore).toBe(-117);
    });

    it('ScoreCalculator.calculatePlayerScore: detects long run bonus', () => {
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
      };
      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player);
      expect(scoreBreakdown.bonusDetails.longRuns).toBe(1);
      expect(scoreBreakdown.bonuses).toBe(75);
    });

    it('ScoreCalculator.calculatePlayerScore: handles multiple long runs in same hand', () => {
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
      };
      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player);
      expect(scoreBreakdown.bonusDetails.longRuns).toBe(2);
      expect(scoreBreakdown.bonuses).toBe(100);
    });

    it('ScoreCalculator.calculatePlayerScore: handles edge case with ace-high run', () => {
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
      };
      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player);
      expect(scoreBreakdown.bonusDetails.longRuns).toBe(1);
      expect(scoreBreakdown.bonuses).toBe(75);
    });

    it('ScoreCalculator.calculatePlayerScore: handles duplicate cards in long run detection', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        avatar: '',
        hand: [
          { id: '10_spades_1', suit: Suit.SPADES, value: 10 as CardValue },
          { id: '10_spades_2', suit: Suit.SPADES, value: 10 as CardValue },
          { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
          { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
          { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
        ],
        declaredSuit: Suit.SPADES,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      };
      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player);
      expect(scoreBreakdown.bonusDetails.longRuns).toBe(1);
      expect(scoreBreakdown.bonuses).toBe(75);
    });

    it('ScoreCalculator.calculatePlayerScore: calculates complex scoring scenario', () => {
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
          { id: 'ace_hearts', suit: Suit.HEARTS, value: 14 as CardValue },
          { id: 'king_diamonds', suit: Suit.DIAMONDS, value: 13 as CardValue },
        ],
        declaredSuit: Suit.SPADES,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      };
      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player);
      expect(scoreBreakdown.baseScore).toBe(60);
      expect(scoreBreakdown.multiplier).toBe(5);
      expect(scoreBreakdown.positivePoints).toBe(300);
      expect(scoreBreakdown.penalties).toBe(27);
      expect(scoreBreakdown.bonuses).toBe(25);
      expect(scoreBreakdown.totalScore).toBe(298);
      expect(scoreBreakdown.bonusDetails.cleanSweep).toBe(false);
      expect(scoreBreakdown.bonusDetails.longRuns).toBe(1);
    });

    it('ScoreCalculator.calculatePlayerScore: handles empty hand edge case', () => {
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
      };
      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player);
      expect(scoreBreakdown.baseScore).toBe(0);
      expect(scoreBreakdown.multiplier).toBe(0);
      expect(scoreBreakdown.positivePoints).toBe(0);
      expect(scoreBreakdown.penalties).toBe(0);
      expect(scoreBreakdown.bonuses).toBe(50);
      expect(scoreBreakdown.totalScore).toBe(50);
    });

    it('ScoreCalculator.calculatePlayerScore: handles undeclared player with large hand', () => {
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
        declaredSuit: null,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      };
      const scoreBreakdown = scoreCalculator.calculatePlayerScore(player);
      const totalValue = 14 + 13 + 12 + 11 + 10 + 9 + 8;
      const handSize = 7;
      expect(scoreBreakdown.penalties).toBe(totalValue * handSize);
      expect(scoreBreakdown.totalScore).toBe(-539);
    });
  });

  describe('calculateAllScores', () => {
    it('ScoreCalculator.calculateAllScores: calculates scores for all players', () => {
      mockGameState.players = [
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
          declaredSuit: null,
          intentCard: null,
          score: 0,
          isConnected: true,
          isAI: false,
        },
      ];
      const allScores = scoreCalculator.calculateAllScores(mockGameState);
      expect(allScores.size).toBe(2);
      expect(allScores.get('player1')?.totalScore).toBe(104);
      expect(allScores.get('player2')?.totalScore).toBe(-46);
    });
  });

  describe('determineWinners', () => {
    it('ScoreCalculator.determineWinners: determines single winner', () => {
      mockGameState.players = [
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
          hand: [{ id: 'queen_hearts', suit: Suit.HEARTS, value: 12 as CardValue }],
          declaredSuit: Suit.HEARTS,
          intentCard: null,
          score: 0,
          isConnected: true,
          isAI: false,
        },
      ];
      const result = scoreCalculator.determineWinners(mockGameState);
      expect(result.winners).toHaveLength(1);
      expect(result.winners[0].id).toBe('player1');
    });

    it('ScoreCalculator.determineWinners: handles tie scenarios', () => {
      mockGameState.players = [
        {
          id: 'player1',
          name: 'Player 1',
          avatar: '',
          hand: [{ id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue }],
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
          hand: [{ id: 'ace_hearts', suit: Suit.HEARTS, value: 14 as CardValue }],
          declaredSuit: Suit.HEARTS,
          intentCard: null,
          score: 0,
          isConnected: true,
          isAI: false,
        },
      ];
      const result = scoreCalculator.determineWinners(mockGameState);
      expect(result.winners).toHaveLength(2);
      expect(result.winners.map((p) => p.id)).toContain('player1');
      expect(result.winners.map((p) => p.id)).toContain('player2');
    });
  });

  describe('validateRebuttal', () => {
    it('ScoreCalculator.validateRebuttal: validates a proper 3-card run', () => {
      const cards = [
        { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
        { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
        { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
      ];
      const result = scoreCalculator.validateRebuttal(cards);
      expect(result.isValid).toBe(true);
      expect(result.runValue).toBe(36);
    });

    it('ScoreCalculator.validateRebuttal: rejects non-consecutive cards', () => {
      const cards = [
        { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
        { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
        { id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue },
      ];
      const result = scoreCalculator.validateRebuttal(cards);
      expect(result.isValid).toBe(false);
      expect(result.runValue).toBe(0);
    });

    it('ScoreCalculator.validateRebuttal: rejects mixed suits', () => {
      const cards = [
        { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
        { id: 'queen_hearts', suit: Suit.HEARTS, value: 12 as CardValue },
        { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
      ];
      const result = scoreCalculator.validateRebuttal(cards);
      expect(result.isValid).toBe(false);
      expect(result.runValue).toBe(0);
    });

    it('ScoreCalculator.validateRebuttal: rejects wrong number of cards', () => {
      const cards = [
        { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
        { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
      ];
      const result = scoreCalculator.validateRebuttal(cards);
      expect(result.isValid).toBe(false);
      expect(result.runValue).toBe(0);
    });

    it('ScoreCalculator.validateRebuttal: validates ace-high rebuttal', () => {
      const cards = [
        { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
        { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
        { id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue },
      ];
      const result = scoreCalculator.validateRebuttal(cards);
      expect(result.isValid).toBe(true);
      expect(result.runValue).toBe(39);
    });

    it('ScoreCalculator.validateRebuttal: validates low-value rebuttal', () => {
      const cards = [
        { id: '2_clubs', suit: Suit.CLUBS, value: 2 as CardValue },
        { id: '3_clubs', suit: Suit.CLUBS, value: 3 as CardValue },
        { id: '4_clubs', suit: Suit.CLUBS, value: 4 as CardValue },
      ];
      const result = scoreCalculator.validateRebuttal(cards);
      expect(result.isValid).toBe(true);
      expect(result.runValue).toBe(9);
    });

    it('ScoreCalculator.validateRebuttal: rejects ace-low wrap around', () => {
      const cards = [
        { id: 'ace_spades', suit: Suit.SPADES, value: 14 as CardValue },
        { id: '2_spades', suit: Suit.SPADES, value: 2 as CardValue },
        { id: '3_spades', suit: Suit.SPADES, value: 3 as CardValue },
      ];
      const result = scoreCalculator.validateRebuttal(cards);
      expect(result.isValid).toBe(false);
      expect(result.runValue).toBe(0);
    });

    it('ScoreCalculator.validateRebuttal: handles cards in wrong order', () => {
      const cards = [
        { id: 'king_spades', suit: Suit.SPADES, value: 13 as CardValue },
        { id: 'jack_spades', suit: Suit.SPADES, value: 11 as CardValue },
        { id: 'queen_spades', suit: Suit.SPADES, value: 12 as CardValue },
      ];
      const result = scoreCalculator.validateRebuttal(cards);
      expect(result.isValid).toBe(true);
      expect(result.runValue).toBe(36);
    });
  });
});
