import { type GameState, AIPersonality } from '@ocentra/game-domain/types/game';
import { AIEngine, type AIConfig, type AIDecision } from '@ocentra/ai-domain/orchestration/AIEngine';
import { ModelManager } from '@/lib/managers/ai/ModelManager';
import { AIHelper } from '@ocentra/ai-domain/orchestration/AIHelper';
import { GameModeFactory } from '@ocentra/game-asset-domain/factories/GameModeFactory';
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import { RequestPlayerHandDetailEvent } from '@ocentra/eventing-domain/events/game/RequestPlayerHandDetailEvent';
import { RequestScoreManagerDetailsEvent } from '@ocentra/eventing-domain/events/game/RequestScoreManagerDetailsEvent';
import { RequestRemainingCardsCountEvent } from '@ocentra/eventing-domain/events/game/RequestRemainingCardsCountEvent';
import { RequestFloorCardsDetailEvent } from '@ocentra/eventing-domain/events/game/RequestFloorCardsDetailEvent';
import { RequestAllPlayersDataEvent } from '@ocentra/eventing-domain/events/game/RequestAllPlayersDataEvent';
import type { LobbyPlayer } from '@ocentra/eventing-domain/types/lobby';
import type { AIInstructions, AIDecisionResult } from '@ocentra/ai-domain/orchestration/AIManagerOrchestrator';
import { PlayerActionType } from '@ocentra/game-domain/types/game';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const VALID_MODEL_ACTIONS: ReadonlyArray<string> = [
  PlayerActionType.PICK_UP,
  PlayerActionType.DECLINE,
  PlayerActionType.DECLARE_INTENT,
  PlayerActionType.CALL_SHOWDOWN,
  PlayerActionType.REBUTTAL,
];

export interface AIGameAdapterConfig {
  gameModeId: string;
  validActions?: ReadonlyArray<string>;
  defaultAction?: string;
}

export class AIGameAdapter {
  readonly validActions: ReadonlyArray<string>;
  readonly defaultAction: string;
  private aiEngines: Map<string, AIEngine> = new Map();
  private modelManager: ModelManager;
  private aiHelper: AIHelper;
  private gameMode?: GameMode;
  private gameModeId: string;
  private gameStateRef: GameState | null = null;

  constructor(config: AIGameAdapterConfig) {
    this.gameModeId = config.gameModeId;
    this.validActions = config.validActions ?? VALID_MODEL_ACTIONS;
    this.defaultAction = config.defaultAction ?? PlayerActionType.DECLINE;
    this.modelManager = ModelManager.getInstance();
    this.aiHelper = AIHelper.getInstance();
  }

  isModelLoaded(): boolean {
    return this.modelManager.isModelLoaded();
  }

  async getAIInstructions(playerId: string): Promise<AIInstructions> {
    return this.aiHelper.GetAIInstructions(this.getGameMode(), playerId);
  }

  registerGameStateResponders(): () => void {
    const gameState = this.getGameState();
    const subs: Array<() => void> = [];

    const handHandler = (event: RequestPlayerHandDetailEvent) => {
      const player = gameState.players.find((p) => p.id === event.playerId);
      event.deferred.resolve(OperationResult.success(player?.hand ?? []));
    };
    EventBus.instance.subscribe(RequestPlayerHandDetailEvent, handHandler);
    subs.push(() => EventBus.instance.unsubscribe(RequestPlayerHandDetailEvent, handHandler));

    const scoreHandler = (event: RequestScoreManagerDetailsEvent) => {
      const scoreMap = Object.fromEntries(gameState.players.map((p) => [p.id, p.score]));
      event.deferred.resolve(
        OperationResult.success({
          totalRounds: gameState.round ?? 1,
          currentRound: gameState.round ?? 1,
          pot: 0,
          currentBet: 0,
          metadata: { scores: scoreMap, round: gameState.round },
        })
      );
    };
    EventBus.instance.subscribe(RequestScoreManagerDetailsEvent, scoreHandler);
    subs.push(() => EventBus.instance.unsubscribe(RequestScoreManagerDetailsEvent, scoreHandler));

    const remainingHandler = (event: RequestRemainingCardsCountEvent) => {
      event.deferred.resolve(OperationResult.success(gameState.deck.length));
    };
    EventBus.instance.subscribe(RequestRemainingCardsCountEvent, remainingHandler);
    subs.push(() => EventBus.instance.unsubscribe(RequestRemainingCardsCountEvent, remainingHandler));

    const floorHandler = (event: RequestFloorCardsDetailEvent) => {
      event.deferred.resolve(OperationResult.success(gameState.floorCard ? [gameState.floorCard] : []));
    };
    EventBus.instance.subscribe(RequestFloorCardsDetailEvent, floorHandler);
    subs.push(() => EventBus.instance.unsubscribe(RequestFloorCardsDetailEvent, floorHandler));

    const playersHandler = (event: RequestAllPlayersDataEvent) => {
      event.deferred.resolve(OperationResult.success(gameState.players as unknown as LobbyPlayer[]));
    };
    EventBus.instance.subscribe(RequestAllPlayersDataEvent, playersHandler);
    subs.push(() => EventBus.instance.unsubscribe(RequestAllPlayersDataEvent, playersHandler));

    return () => subs.forEach((unsub) => unsub());
  }

  async getRuleBasedDecision(playerId: string): Promise<AIDecisionResult> {
    const engine = this.aiEngines.get(playerId);
    if (!engine) throw new Error(`No AI engine for ${playerId}`);
    const state = this.getGameState();
    const decision: AIDecision = await engine.makeDecision(state);
    return {
      action: decision.action,
      data: decision.data,
      confidence: decision.confidence,
    };
  }

  async initializeEngines(gameState: GameState, _modelId?: string): Promise<void> {
    logInfo('Initializing AI engines for game state');
    this.gameStateRef = gameState;

    if (!this.gameMode) {
      try {
        logInfo('Loading GameMode asset:', this.gameModeId);
        this.gameMode = await GameModeFactory.getGameMode(this.gameModeId);
        logInfo('GameMode loaded successfully');
      } catch (error) {
        logInfo('Failed to load GameMode asset, falling back to sync load:', error);
        this.gameMode = GameModeFactory.getGameModeSync(this.gameModeId);
      }
    }

    const aiPlayers = gameState.players.filter((player) => player.isAI);
    logInfo('Found AI players:', aiPlayers.length);

    for (const player of aiPlayers) {
      logInfo('Initializing AI engine for player:', player.name);
      const aiConfig: AIConfig = {
        personality: this.mapPersonality(player.aiPersonality ?? AIPersonality.ADAPTIVE),
        difficulty: 'medium',
        enableWebGPU: false,
      };

      const aiEngine = new AIEngine(player.id, aiConfig);
      await aiEngine.initialize();
      this.aiEngines.set(player.id, aiEngine);
    }
    logInfo('AI engines initialized successfully');
  }

  setGameState(gameState: GameState): void {
    this.gameStateRef = gameState;
  }

  isAIPlayer(playerId: string): boolean {
    return this.aiEngines.has(playerId);
  }

  destroy(): void {
    this.aiEngines.clear();
  }

  private getGameState(): GameState {
    if (!this.gameStateRef) throw new Error('Game state not set');
    return this.gameStateRef;
  }

  private getGameMode(): GameMode {
    if (!this.gameMode) throw new Error('GameMode not initialized');
    return this.gameMode;
  }

  private mapPersonality(personality: AIPersonality): AIConfig['personality'] {
    switch (personality) {
      case AIPersonality.AGGRESSIVE:
        return AIPersonality.AGGRESSIVE;
      case AIPersonality.CONSERVATIVE:
        return AIPersonality.CONSERVATIVE;
      case AIPersonality.ADAPTIVE:
        return AIPersonality.ADAPTIVE;
      case AIPersonality.UNPREDICTABLE:
        return AIPersonality.ADAPTIVE;
      default:
        return AIPersonality.ADAPTIVE;
    }
  }
}
