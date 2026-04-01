import { GamePhase } from '@/types/game';

let SKIP_SHARP_TESTS = false;
if (process.env.SKIP_SHARP_TESTS === 'true') {
  SKIP_SHARP_TESTS = true;
} else {
  try {
    require.resolve('sharp');
  } catch {
    SKIP_SHARP_TESTS = true;
  }
}

describe.skipIf(SKIP_SHARP_TESTS)('GameEngine', () => {
  let GameEngine: typeof import('../GameEngine').GameEngine;
  let gameEngine: InstanceType<typeof import('../GameEngine').GameEngine>;

  beforeAll(async () => {
    try {
      const module = await import('../GameEngine');
      GameEngine = module.GameEngine;
    } catch (error) {
      if (error instanceof Error && error.message.includes('sharp')) {
        SKIP_SHARP_TESTS = true;
        return;
      }
      throw error;
    }
  });

  beforeEach(() => {
    if (GameEngine) {
      gameEngine = new GameEngine();
    }
  });

  describe('initializeGame', () => {
    it('GameEngine.initializeGame: initializes game with shuffled deck', async () => {
      await gameEngine.initializeGame({
        maxPlayers: 4,
        enablePhysics: true,
        seed: 12345,
      });

      const gameState = gameEngine.getGameState();
      expect(gameState).toBeTruthy();
      expect(gameState!.deck).toHaveLength(52);
      expect(gameState!.phase).toBe(GamePhase.DEALING);
      expect(gameState!.players).toHaveLength(0);
    });
  });

  describe('addPlayer', () => {
    it('GameEngine.addPlayer: adds players to the game', async () => {
      await gameEngine.initializeGame({
        maxPlayers: 4,
        enablePhysics: true,
      });

      gameEngine.addPlayer({
        id: 'player1',
        name: 'Test Player',
      });

      const gameState = gameEngine.getGameState();
      expect(gameState!.players).toHaveLength(1);
      expect(gameState!.players[0].name).toBe('Test Player');
    });

    it('GameEngine.addPlayer: rejects players when game is full', async () => {
      const customRules = { maxPlayers: 2, initialHandSize: 3, deckSize: 52 };
      gameEngine = new GameEngine();
      await gameEngine.initializeGame({
        maxPlayers: 4,
        enablePhysics: true,
        rules: customRules,
      });

      gameEngine.addPlayer({ id: 'player1', name: 'Player 1' });
      gameEngine.addPlayer({ id: 'player2', name: 'Player 2' });

      expect(() => {
        gameEngine.addPlayer({ id: 'player3', name: 'Player 3' });
      }).toThrow('Game is full');
    });
  });

  describe('startGame', () => {
    it('GameEngine.startGame: deals cards and transitions to floor reveal', async () => {
      await gameEngine.initializeGame({
        maxPlayers: 4,
        enablePhysics: true,
      });

      gameEngine.addPlayer({ id: 'player1', name: 'Player 1' });
      gameEngine.addPlayer({ id: 'player2', name: 'Player 2' });

      gameEngine.startGame();

      const gameState = gameEngine.getGameState();
      expect(gameState!.phase).toBe(GamePhase.FLOOR_REVEAL);
      expect(gameState!.players[0].hand).toHaveLength(3);
      expect(gameState!.players[1].hand).toHaveLength(3);
      expect(gameState!.floorCard).toBeTruthy();
      expect(gameState!.deck).toHaveLength(52 - 6 - 1);
    });
  });

  describe('processPlayerAction', () => {
    beforeEach(async () => {
      await gameEngine.initializeGame({
        maxPlayers: 4,
        enablePhysics: true,
      });

      gameEngine.addPlayer({ id: 'player1', name: 'Player 1' });
      gameEngine.addPlayer({ id: 'player2', name: 'Player 2' });
      gameEngine.startGame();
    });

    it('GameEngine.processPlayerAction: processes valid pick up action', () => {
      const result = gameEngine.processPlayerAction({
        type: 'pick_up',
        playerId: 'player1',
        timestamp: new Date(),
      });

      expect(result.isValid).toBe(true);

      const gameState = gameEngine.getGameState();
      expect(gameState!.phase).toBe(GamePhase.PLAYER_ACTION);
      expect(gameState!.players[0].hand).toHaveLength(4);
      expect(gameState!.floorCard).toBeNull();
    });

    it('GameEngine.processPlayerAction: rejects invalid action', () => {
      const result = gameEngine.processPlayerAction({
        type: 'pick_up',
        playerId: 'player2',
        timestamp: new Date(),
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Action violates game rules');
    });
  });

  describe('validateGameState', () => {
    it('GameEngine.validateGameState: validates initialized game state', async () => {
      await gameEngine.initializeGame({
        maxPlayers: 4,
        enablePhysics: true,
      });

      gameEngine.addPlayer({ id: 'player1', name: 'Player 1' });
      gameEngine.addPlayer({ id: 'player2', name: 'Player 2' });
      gameEngine.startGame();

      const validation = gameEngine.validateGameState();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
