import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import {
  AIManagerOrchestrator,
  type AIDecisionResult,
} from '@/orchestration/AIManagerOrchestrator';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

export interface AIDecisionLike extends AIDecisionResult {}

export interface AIGameRuntimeAdapter<TGameState, TDecision extends AIDecisionLike> {
  initializeEngines(gameState: TGameState, modelId?: string): Promise<void>;
  isModelLoaded(): boolean;
  getAIInstructions(playerId: string): Promise<{ systemMessage: string; userPrompt: string }>;
  registerGameStateResponders(): () => void;
  getRuleBasedDecision(playerId: string): Promise<TDecision>;
  validActions: ReadonlyArray<string>;
  defaultAction: string;
  setGameState(gameState: TGameState): void;
  isAIPlayer(playerId: string): boolean;
  destroy(): void;
}

export class AIManager<
  TGameState,
  TDecision extends AIDecisionLike,
  TPlayerAction extends { type: string; playerId: string; data?: unknown; timestamp: Date },
> {
  private adapter: AIGameRuntimeAdapter<TGameState, TDecision>;
  private orchestrator: AIManagerOrchestrator;
  private toPlayerAction: (playerId: string, decision: TDecision) => TPlayerAction;

  constructor(
    adapter: AIGameRuntimeAdapter<TGameState, TDecision>,
    toPlayerAction: (playerId: string, decision: TDecision) => TPlayerAction
  ) {
    this.adapter = adapter;
    this.toPlayerAction = toPlayerAction;
    this.orchestrator = new AIManagerOrchestrator({
      isModelLoaded: () => this.adapter.isModelLoaded(),
      getAIInstructions: (playerId) => this.adapter.getAIInstructions(playerId),
      registerGameStateResponders: () => this.adapter.registerGameStateResponders(),
      getRuleBasedDecision: (playerId) => this.adapter.getRuleBasedDecision(playerId),
      validActions: this.adapter.validActions,
      defaultAction: this.adapter.defaultAction,
    });
  }

  async initializeAIEngines(gameState: TGameState, modelId?: string): Promise<void> {
    await this.adapter.initializeEngines(gameState, modelId);
    await this.orchestrator.loadModelIfNeeded(modelId);
  }

  async getAIDecision(playerId: string, gameState: TGameState): Promise<TDecision | null> {
    logInfo('Getting AI decision for player:', playerId);
    if (!this.adapter.isAIPlayer(playerId)) {
      logInfo(`No AI engine found for player ${playerId}`);
      return null;
    }

    this.adapter.setGameState(gameState);

    try {
      const result = await this.orchestrator.getAIDecision(playerId);
      logInfo(`AI decision received for player ${playerId}:`, result);
      return result as unknown as TDecision;
    } catch (error) {
      logError(`Error getting AI decision for player ${playerId}:`, error);
      const fallback = await this.adapter.getRuleBasedDecision(playerId);
      return fallback;
    }
  }

  createPlayerActionFromDecision(playerId: string, decision: TDecision): TPlayerAction {
    return this.toPlayerAction(playerId, decision);
  }

  isAIPlayer(playerId: string): boolean {
    return this.adapter.isAIPlayer(playerId);
  }

  destroy(): void {
    this.adapter.destroy();
  }
}
