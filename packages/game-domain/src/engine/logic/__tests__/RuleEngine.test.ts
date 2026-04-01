import { RuleEngine } from '../RuleEngine';
import {
  type GameState,
  type Player,
  type PlayerAction,
  GamePhase,
  Suit,
  PlayerActionType,
} from '@/types/game';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;
  let mockGameState: GameState;
  let mockPlayer: Player;

  beforeEach(() => {
    ruleEngine = new RuleEngine();
    mockPlayer = {
      id: 'player1',
      name: 'Test Player',
      avatar: '',
      hand: [
        { id: 'ace_spades', suit: Suit.SPADES, value: 14 },
        { id: 'king_spades', suit: Suit.SPADES, value: 13 },
        { id: 'queen_hearts', suit: Suit.HEARTS, value: 12 },
      ],
      declaredSuit: null,
      intentCard: null,
      score: 0,
      isConnected: true,
      isAI: false,
    };
    mockGameState = {
      id: 'test-game',
      players: [mockPlayer],
      currentPlayer: 0,
      phase: GamePhase.FLOOR_REVEAL,
      deck: [],
      floorCard: { id: 'jack_clubs', suit: Suit.CLUBS, value: 11 },
      discardPile: [],
      round: 1,
      startTime: new Date(),
      lastAction: new Date(),
    };
  });

  describe('validateAction', () => {
    it('RuleEngine.validateAction: validates pick up action during floor reveal phase', () => {
      const action: PlayerAction = {
        type: PlayerActionType.PICK_UP,
        playerId: 'player1',
        timestamp: new Date(),
      };
      const isValid = ruleEngine.validateAction(action, mockGameState);
      expect(isValid).toBe(true);
    });

    it('RuleEngine.validateAction: rejects pick up action when not player turn', () => {
      mockGameState.players.push({
        id: 'player2',
        name: 'Player 2',
        avatar: '',
        hand: [],
        declaredSuit: null,
        intentCard: null,
        score: 0,
        isConnected: true,
        isAI: false,
      });
      mockGameState.currentPlayer = 1;
      const action: PlayerAction = {
        type: PlayerActionType.PICK_UP,
        playerId: 'player1',
        timestamp: new Date(),
      };
      const isValid = ruleEngine.validateAction(action, mockGameState);
      expect(isValid).toBe(false);
    });

    it('RuleEngine.validateAction: validates declare intent with valid suit', () => {
      mockGameState.phase = GamePhase.PLAYER_ACTION;
      const action: PlayerAction = {
        type: 'declare_intent',
        playerId: 'player1',
        data: { suit: Suit.SPADES },
        timestamp: new Date(),
      };
      const isValid = ruleEngine.validateAction(action, mockGameState);
      expect(isValid).toBe(true);
    });

    it('RuleEngine.validateAction: rejects declare intent with locked suit', () => {
      mockGameState.phase = GamePhase.PLAYER_ACTION;
      mockGameState.players.push({
        ...mockPlayer,
        id: 'player2',
        declaredSuit: Suit.SPADES,
      });
      const action: PlayerAction = {
        type: 'declare_intent',
        playerId: 'player1',
        data: { suit: Suit.SPADES },
        timestamp: new Date(),
      };
      const isValid = ruleEngine.validateAction(action, mockGameState);
      expect(isValid).toBe(false);
    });

    it('RuleEngine.validateAction: rejects declare intent without cards of that suit', () => {
      mockGameState.phase = GamePhase.PLAYER_ACTION;
      const action: PlayerAction = {
        type: 'declare_intent',
        playerId: 'player1',
        data: { suit: Suit.CLUBS },
        timestamp: new Date(),
      };
      const isValid = ruleEngine.validateAction(action, mockGameState);
      expect(isValid).toBe(false);
    });

    it('RuleEngine.validateAction: validates showdown call from declared player', () => {
      mockGameState.phase = GamePhase.PLAYER_ACTION;
      mockPlayer.declaredSuit = Suit.SPADES;
      const action: PlayerAction = {
        type: 'call_showdown',
        playerId: 'player1',
        timestamp: new Date(),
      };
      const isValid = ruleEngine.validateAction(action, mockGameState);
      expect(isValid).toBe(true);
    });

    it('RuleEngine.validateAction: validates rebuttal with valid 3-card run', () => {
      mockGameState.phase = GamePhase.SHOWDOWN;
      const action: PlayerAction = {
        type: 'rebuttal',
        playerId: 'player1',
        data: {
          cards: [
            { id: 'jack_spades', suit: Suit.SPADES, value: 11 },
            { id: 'queen_spades', suit: Suit.SPADES, value: 12 },
            { id: 'king_spades', suit: Suit.SPADES, value: 13 },
          ],
        },
        timestamp: new Date(),
      };
      const isValid = ruleEngine.validateAction(action, mockGameState);
      expect(isValid).toBe(true);
    });
  });

  describe('getNextPhase', () => {
    it('RuleEngine.getNextPhase: transitions from floor reveal to player action on pick up', () => {
      const action: PlayerAction = {
        type: PlayerActionType.PICK_UP,
        playerId: 'player1',
        timestamp: new Date(),
      };
      const nextPhase = ruleEngine.getNextPhase(GamePhase.FLOOR_REVEAL, action);
      expect(nextPhase).toBe(GamePhase.PLAYER_ACTION);
    });

    it('RuleEngine.getNextPhase: transitions from player action to showdown on call showdown', () => {
      const action: PlayerAction = {
        type: 'call_showdown',
        playerId: 'player1',
        timestamp: new Date(),
      };
      const nextPhase = ruleEngine.getNextPhase(GamePhase.PLAYER_ACTION, action);
      expect(nextPhase).toBe(GamePhase.SHOWDOWN);
    });
  });
});
