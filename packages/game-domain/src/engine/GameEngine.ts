import {
  type GameState,
  type PlayerAction,
  type Player,
  GamePhase,
  AIPersonality,
} from '@/types/game';
import { RuleEngine, type GameRules } from '@/engine/logic/RuleEngine';
import { TurnManager } from '@/engine/logic/TurnManager';
import { ScoreCalculator } from '@/engine/logic/ScoreCalculator';
import {
  StateValidator,
  type ValidationResult,
} from '@/engine/logic/StateValidator';
import type { MechanicsPhase, MechanicsSpec } from '@/engine/mechanics/MechanicsSpec';
import { MechanicsRuntime } from '@/engine/mechanics/MechanicsRuntime';
import {
  decodeGenericPlayerAction,
  decodeMechanicsPlayerAction,
} from '@/schema/match.schema';
import type { IAIManager } from '@/interfaces/IAIManager';
import type { IDeckProvider } from '@/interfaces/IDeckProvider';
import { DefaultDeckProvider } from '@/deck/DefaultDeckProvider';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const logInfo = (
  message: string,
  dataOrEnabled?: unknown | boolean,
  enabled?: boolean
) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const createRuntimeUuid = (): string => {
  const cryptoObject = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof cryptoObject?.randomUUID === 'function') {
    return cryptoObject.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomNibble = (Math.random() * 16) | 0;
    const value = character === 'x' ? randomNibble : (randomNibble & 0x3) | 0x8;
    return value.toString(16);
  });
};

function cloneGameState(state: GameState): GameState {
  const structuredCloneFn = (globalThis as typeof globalThis & {
    structuredClone?: <T>(value: T) => T;
  }).structuredClone;

  if (typeof structuredCloneFn === 'function') {
    return structuredCloneFn(state);
  }

  return {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      hand: [...player.hand],
      intentCard: player.intentCard ? { ...player.intentCard } : null,
    })),
    deck: [...state.deck],
    floorCard: state.floorCard ? { ...state.floorCard } : null,
    discardPile: [...state.discardPile],
    startTime: new Date(state.startTime),
    lastAction: new Date(state.lastAction),
    mechanicsContext: state.mechanicsContext
      ? {
          ...state.mechanicsContext,
          revealedPlayerIds: [...state.mechanicsContext.revealedPlayerIds],
          tableCards: [...state.mechanicsContext.tableCards].map((entry) => ({
            playerId: entry.playerId,
            card: { ...entry.card },
          })),
          capturedCardsByPlayerId: Object.fromEntries(
            Object.entries(state.mechanicsContext.capturedCardsByPlayerId).map(([playerId, cards]) => [
              playerId,
              cards.map((card) => ({ ...card })),
            ]),
          ),
          foldedPlayerIds: [...state.mechanicsContext.foldedPlayerIds],
          trumpCard: state.mechanicsContext.trumpCard ? { ...state.mechanicsContext.trumpCard } : null,
          familyState: state.mechanicsContext.familyState
            ? JSON.parse(JSON.stringify(state.mechanicsContext.familyState)) as Record<string, unknown>
            : undefined,
        }
      : undefined,
  };
}

export interface GameConfig {
  maxPlayers: number;
  aiDifficulty?: 'easy' | 'medium' | 'hard';
  enablePhysics: boolean;
  seed?: number;
  rules?: Partial<GameRules>;
}

export type StateUpdateCallback = (state: GameState) => void;

export class GameEngine {
  private gameState: GameState | null = null;
  private updateCallbacks: Set<StateUpdateCallback> = new Set();
  private aiManager: IAIManager | null = null;
  private ruleEngine: RuleEngine;
  private deckProvider: IDeckProvider;
  private turnManager: TurnManager;
  private scoreCalculator: ScoreCalculator;
  private stateValidator: StateValidator;
  private mechanicsSpec: MechanicsSpec | null = null;
  private mechanicsRuntime: MechanicsRuntime;

  constructor(options?: {
    aiManager?: IAIManager;
    deckProvider?: IDeckProvider;
  }) {
    this.ruleEngine = new RuleEngine();
    this.deckProvider =
      options?.deckProvider ?? new DefaultDeckProvider();
    this.turnManager = new TurnManager();
    this.scoreCalculator = new ScoreCalculator();
    this.stateValidator = new StateValidator();
    this.mechanicsRuntime = new MechanicsRuntime(this.scoreCalculator);
    this.aiManager = options?.aiManager ?? null;
  }

  async initializeDeckProvider(
    deckProvider: IDeckProvider
  ): Promise<void> {
    this.deckProvider = deckProvider;
  }

  setAiManager(aiManager: IAIManager): void {
    this.aiManager = aiManager;
  }

  async initializeGame(config: GameConfig): Promise<void> {
    logInfo('Initializing game with config:', config);
    if (config.rules) {
      const mergedRules = {
        ...this.ruleEngine.getRules(),
        ...config.rules,
      };
      this.ruleEngine = new RuleEngine(mergedRules);
    }

    if (config.seed) {
      this.deckProvider.setSeed(config.seed);
    }

    const deck = await this.deckProvider.createDeck();
    const shuffledDeck = this.deckProvider.shuffleDeck(deck);

    this.gameState = {
      id: createRuntimeUuid(),
      players: [],
      currentPlayer: 0,
      phase: GamePhase.DEALING,
      deck: shuffledDeck,
      floorCard: null,
      discardPile: [],
      round: 1,
      startTime: new Date(),
      lastAction: new Date(),
      mechanicsPhaseId: null,
      mechanicsContext: {
        dealerIndex: 0,
        showdownCallerId: null,
        revealedPlayerIds: [],
        lastMechanicsAction: null,
        tableCards: [],
        capturedCardsByPlayerId: {},
        foldedPlayerIds: [],
        roundPot: 0,
        trumpCard: null,
        familyState: undefined,
      },
    };

    this.applyMechanicsStartPhase();
    logInfo('Game initialized with config:', config);
  }

  async initializeAIEngines(): Promise<void> {
    logInfo('Initializing AI engines');
    if (!this.gameState) {
      logInfo('Game not initialized');
      throw new Error('Game not initialized');
    }

    if (!this.aiManager) {
      logInfo('No AI manager configured, skipping AI initialization');
      return;
    }

    logInfo('Initializing AI engines with game state');
    await this.aiManager.initializeAIEngines(this.gameState);
    logInfo('AI engines initialized successfully');
  }

  async getAIAction(): Promise<PlayerAction | null> {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    if (!this.aiManager) {
      return null;
    }

    const currentPlayer =
      this.gameState.players[this.gameState.currentPlayer];

    if (!currentPlayer.isAI) {
      return null;
    }

    const decision = await this.aiManager.getAIDecision(
      currentPlayer.id,
      this.gameState
    );
    if (!decision) {
      return null;
    }

    return this.aiManager.createPlayerActionFromDecision(
      currentPlayer.id,
      decision
    );
  }

  addPlayer(playerData: {
    id: string;
    name: string;
    avatar?: string;
    isAI?: boolean;
    aiPersonality?: AIPersonality;
  }): void {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    if (
      this.gameState.players.length >=
      (this.mechanicsSpec?.playerConfig.maxPlayers ??
        this.ruleEngine.getRules().maxPlayers)
    ) {
      throw new Error('Game is full');
    }

    const player: Player = {
      id: playerData.id,
      name: playerData.name,
      avatar: playerData.avatar ?? '',
      hand: [],
      declaredSuit: null,
      intentCard: null,
      score: 0,
      isConnected: true,
      isAI: playerData.isAI ?? false,
      aiPersonality: playerData.aiPersonality,
    };

    this.gameState.players.push(player);
    this.notifyStateUpdate();
  }

  async startGame(): Promise<void> {
    logInfo('Starting game');
    if (!this.gameState) {
      logInfo('Game not initialized');
      throw new Error('Game not initialized');
    }

    const minimumPlayers = this.mechanicsSpec?.playerConfig.minPlayers ?? 2;
    if (this.gameState.players.length < minimumPlayers) {
      logInfo(
        'Need more players to start, current players:',
        this.gameState.players.length
      );
      throw new Error(`Need at least ${minimumPlayers} players to start`);
    }

    if (this.mechanicsSpec) {
      const stateUpdates = this.mechanicsRuntime.startGame(
        this.gameState,
        this.mechanicsSpec,
        this.deckProvider
      );
      Object.assign(this.gameState, stateUpdates);
      await this.initializeAIEngines();
      this.notifyStateUpdate();
      logInfo('Game started successfully with mechanics runtime');
      return;
    }

    logInfo('Dealing initial hands');
    const rules = this.ruleEngine.getRules();
    const { hands, remainingDeck } = this.deckProvider.dealInitialHands(
      this.gameState.deck,
      this.gameState.players.length,
      rules.initialHandSize
    );

    this.gameState.players.forEach((player, index) => {
      player.hand = hands[index];
    });

    this.gameState.deck = remainingDeck;
    this.gameState.phase = GamePhase.FLOOR_REVEAL;

    logInfo('Revealing floor card');
    this.revealFloorCard();

    logInfo('Initializing AI engines');
    await this.initializeAIEngines();

    logInfo('Notifying state update');
    this.notifyStateUpdate();
    logInfo('Game started successfully');
  }

  async startSinglePlayer(
    difficulty: 'easy' | 'medium' | 'hard'
  ): Promise<void> {
    logInfo('Starting single player game with difficulty:', difficulty);
    if (!this.gameState) {
      logInfo('Game not initialized');
      throw new Error('Game not initialized');
    }

    const aiPersonalities: AIPersonality[] = [
      AIPersonality.AGGRESSIVE,
      AIPersonality.CONSERVATIVE,
      AIPersonality.ADAPTIVE,
    ];

    logInfo('Adding AI players to fill the game');
    for (let i = this.gameState.players.length; i < 4; i++) {
      this.addPlayer({
        id: `ai-${i}`,
        name: `AI Player ${i}`,
        isAI: true,
        aiPersonality: aiPersonalities[i % aiPersonalities.length],
      });
    }

    logInfo('Starting game');
    await this.startGame();
    logInfo('Started single player game with difficulty:', difficulty);
  }

  startMultiplayer(roomId: string): void {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }
    logInfo('Starting multiplayer game with room:', roomId);
  }

  processPlayerAction(action: unknown): ValidationResult {
    if (!this.gameState) {
      throw new Error('Game not initialized');
    }

    if (this.mechanicsSpec) {
      const decodedAction = this.decodeMechanicsAction(action);
      if (!decodedAction.isValid) {
        return decodedAction;
      }

      const validation = this.mechanicsRuntime.validateAction(
        decodedAction.action,
        this.gameState,
        this.mechanicsSpec
      );
      if (!validation.isValid) {
        return validation;
      }

      const stateUpdates = this.mechanicsRuntime.processAction(
        this.gameState,
        decodedAction.action,
        this.mechanicsSpec,
        this.deckProvider
      );

      Object.assign(this.gameState, stateUpdates);

      if (this.gameState.phase === GamePhase.GAME_END) {
        this.endGame();
      }

      this.notifyStateUpdate();
      return validation;
    }

    const decodedAction = this.decodeGenericAction(action);
    if (!decodedAction.isValid) {
      return decodedAction;
    }

    const validation = this.stateValidator.validatePlayerAction(
      decodedAction.action,
      this.gameState
    );
    if (!validation.isValid) {
      logInfo('⚠️ Invalid action:', validation.errors);
      return validation;
    }

    const isLegal = this.ruleEngine.validateAction(
      decodedAction.action,
      this.gameState
    );
    if (!isLegal) {
      return {
        isValid: false,
        errors: ['Action violates game rules'],
        warnings: [],
      };
    }

    const stateUpdates = this.turnManager.processTurnAction(
      this.gameState,
      decodedAction.action
    );

    Object.assign(this.gameState, stateUpdates);

    const nextPhase = this.ruleEngine.getNextPhase(
      this.gameState.phase,
      decodedAction.action
    );
    if (nextPhase !== this.gameState.phase) {
      this.gameState.phase = nextPhase;
      this.handlePhaseTransition(nextPhase);
    }

    if (this.ruleEngine.shouldEndGame(this.gameState)) {
      this.endGame();
    }

    this.notifyStateUpdate();
    return validation;
  }

  loadMechanicsSpec(spec: MechanicsSpec): void {
    this.mechanicsSpec = spec;
    this.applyMechanicsStartPhase();
  }

  private decodeGenericAction(input: unknown): ValidationResult & { action: PlayerAction } {
    try {
      return {
        action: decodeGenericPlayerAction(input),
        isValid: true,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      return {
        action: {
          playerId: '',
          timestamp: new Date(0),
          type: '',
        },
        isValid: false,
        errors: [`Invalid action payload: ${formatDecodeError(error)}`],
        warnings: [],
      };
    }
  }

  private decodeMechanicsAction(action: unknown): ValidationResult & { action: PlayerAction } {
    if (!this.mechanicsSpec) {
      return this.decodeGenericAction(action);
    }

    try {
      return {
        action: decodeMechanicsPlayerAction(this.mechanicsSpec, action),
        isValid: true,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      return {
        action: {
          playerId: '',
          timestamp: new Date(0),
          type: '',
        },
        isValid: false,
        errors: [`Invalid action payload: ${formatDecodeError(error)}`],
        warnings: [],
      };
    }
  }

  getCurrentMechanicsPhase(): MechanicsPhase | null {
    if (!this.mechanicsSpec || !this.gameState) {
      return null;
    }
    const currentId =
      this.gameState.mechanicsPhaseId ??
      this.mechanicsSpec.phases[0]?.id ??
      null;
    if (!currentId) {
      return null;
    }
    return (
      this.mechanicsSpec.phases.find((phase) => phase.id === currentId) ??
      null
    );
  }

  private applyMechanicsStartPhase(): void {
    if (!this.gameState || !this.mechanicsSpec) {
      return;
    }
    const firstPhase = this.mechanicsSpec.phases[0];
    if (firstPhase) {
      this.gameState.mechanicsPhaseId = firstPhase.id;
    }
  }

  private isActionAllowedByMechanics(action: PlayerAction): boolean {
    if (!this.mechanicsSpec) {
      return true;
    }
    const phase = this.getCurrentMechanicsPhase();
    if (!phase) {
      return true;
    }
    if (phase.legalActions.includes(action.type)) {
      return true;
    }
    return this.mechanicsSpec.customActions.some(
      (custom) => custom.id === action.type && custom.supported
    );
  }

  private revealFloorCard(): void {
    if (!this.gameState) return;

    const { piece, remainingDeck } = this.deckProvider.drawPiece(
      this.gameState.deck
    );
    this.gameState.floorCard = piece;
    this.gameState.deck = remainingDeck;
  }

  private handlePhaseTransition(newPhase: GamePhase): void {
    if (!this.gameState) return;

    switch (newPhase) {
      case GamePhase.FLOOR_REVEAL:
        this.revealFloorCard();
        break;

      case GamePhase.SCORING:
        this.calculateFinalScores();
        break;

      case GamePhase.GAME_END:
        this.endGame();
        break;
    }
  }

  private calculateFinalScores(): void {
    if (!this.gameState) return;

    const scores =
      this.scoreCalculator.calculateAllScores(this.gameState);

    this.gameState.players.forEach((player) => {
      const scoreBreakdown = scores.get(player.id);
      if (scoreBreakdown) {
        player.score = scoreBreakdown.totalScore;
      }
    });
  }

  private endGame(): void {
    if (!this.gameState) return;

    this.gameState.phase = GamePhase.GAME_END;

    const { winners, scores } =
      this.scoreCalculator.determineWinners(this.gameState);

    logInfo('Game ended. Winners:', winners.map((w) => w.name));
    logInfo('Final scores:', Array.from(scores.entries()));
  }

  getGameSeed(): number {
    return this.deckProvider.getSeed();
  }

  validateGameState(): ValidationResult {
    if (!this.gameState) {
      return {
        isValid: false,
        errors: ['Game not initialized'],
        warnings: [],
      };
    }

    return this.stateValidator.validateGameState(this.gameState);
  }

  getGameState(): GameState | null {
    return this.gameState ? cloneGameState(this.gameState) : null;
  }

  subscribeToUpdates(callback: StateUpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  private notifyStateUpdate(): void {
    if (this.gameState) {
      const snapshot = cloneGameState(this.gameState);
      this.updateCallbacks.forEach((callback) =>
        callback(snapshot)
      );
    }
  }
}

function formatDecodeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
