import type { GameState, PlayerAction } from '@ocentra/game-domain/types/game';
import { AIGameAdapter } from '@/adapters/ai/AIGameAdapter';
import {
  AIManager as DomainAIManager,
  type AIDecisionLike,
} from '@ocentra/ai-domain/orchestration/AIManager';

type GameAIDecision = AIDecisionLike;

export class AIManager {
  private manager: DomainAIManager<GameState, GameAIDecision, PlayerAction>;

  constructor(gameModeId: string = 'claim') {
    const adapter = new AIGameAdapter({ gameModeId });
    this.manager = new DomainAIManager(adapter, (playerId, decision) => ({
      type: decision.action as PlayerAction['type'],
      playerId,
      data: decision.data,
      timestamp: new Date(),
    }));
  }

  async initializeAIEngines(gameState: GameState, modelId?: string): Promise<void> {
    await this.manager.initializeAIEngines(gameState, modelId);
  }

  async getAIDecision(playerId: string, gameState: GameState): Promise<GameAIDecision | null> {
    return this.manager.getAIDecision(playerId, gameState);
  }

  createPlayerActionFromDecision(playerId: string, decision: GameAIDecision): PlayerAction {
    return this.manager.createPlayerActionFromDecision(playerId, decision);
  }

  isAIPlayer(playerId: string): boolean {
    return this.manager.isAIPlayer(playerId);
  }

  destroy(): void {
    this.manager.destroy();
  }
}
