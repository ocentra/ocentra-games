import { type GameState, type PlayerAction, AIPersonality } from '../types/game';
import { type GameRules } from '../engine/logic/RuleEngine';
import { type ValidationResult } from '../engine/logic/StateValidator';
import type { MechanicsPhase, MechanicsSpec } from '../engine/mechanics/MechanicsSpec';
import type { IAIManager } from '../interfaces/IAIManager';
import type { IDeckProvider } from '../interfaces/IDeckProvider';
export interface GameConfig {
    maxPlayers: number;
    aiDifficulty?: 'easy' | 'medium' | 'hard';
    enablePhysics: boolean;
    seed?: number;
    rules?: Partial<GameRules>;
}
export type StateUpdateCallback = (state: GameState) => void;
export declare class GameEngine {
    private gameState;
    private updateCallbacks;
    private aiManager;
    private ruleEngine;
    private deckProvider;
    private turnManager;
    private scoreCalculator;
    private stateValidator;
    private mechanicsSpec;
    private mechanicsRuntime;
    constructor(options?: {
        aiManager?: IAIManager;
        deckProvider?: IDeckProvider;
    });
    initializeDeckProvider(deckProvider: IDeckProvider): Promise<void>;
    setAiManager(aiManager: IAIManager): void;
    initializeGame(config: GameConfig): Promise<void>;
    initializeAIEngines(): Promise<void>;
    getAIAction(): Promise<PlayerAction | null>;
    addPlayer(playerData: {
        id: string;
        name: string;
        avatar?: string;
        isAI?: boolean;
        aiPersonality?: AIPersonality;
    }): void;
    startGame(): Promise<void>;
    startSinglePlayer(difficulty: 'easy' | 'medium' | 'hard'): Promise<void>;
    startMultiplayer(roomId: string): void;
    processPlayerAction(action: PlayerAction): ValidationResult;
    loadMechanicsSpec(spec: MechanicsSpec): void;
    getCurrentMechanicsPhase(): MechanicsPhase | null;
    private applyMechanicsStartPhase;
    private isActionAllowedByMechanics;
    private revealFloorCard;
    private handlePhaseTransition;
    private calculateFinalScores;
    private endGame;
    getGameSeed(): number;
    validateGameState(): ValidationResult;
    getGameState(): GameState | null;
    subscribeToUpdates(callback: StateUpdateCallback): () => void;
    private notifyStateUpdate;
}
