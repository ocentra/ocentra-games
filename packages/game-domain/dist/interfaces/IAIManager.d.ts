import type { GameState, PlayerAction } from '../types/game';
export interface IAIDecision {
    action: string;
    data?: unknown;
}
export interface IAIManager {
    initializeAIEngines(gameState: GameState, modelId?: string): Promise<void>;
    getAIDecision(playerId: string, gameState: GameState): Promise<IAIDecision | null>;
    createPlayerActionFromDecision(playerId: string, decision: IAIDecision): PlayerAction;
    isAIPlayer(playerId: string): boolean;
}
