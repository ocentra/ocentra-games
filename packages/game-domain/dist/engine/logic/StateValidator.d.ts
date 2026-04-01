import { type GameState, type PlayerAction } from '../../types/game';
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export declare class StateValidator {
    validateGameState(gameState: GameState): ValidationResult;
    validatePlayerAction(action: PlayerAction, gameState: GameState): ValidationResult;
    private validateBasicStructure;
    private validatePlayers;
    private validatePlayer;
    private validateCardDistribution;
    private validatePhaseConsistency;
    private validateTurnOrder;
    private validateActionTiming;
    private validateActionTypeRules;
    private validateDeclareIntentAction;
    private validateCallShowdownAction;
    private validateRebuttalAction;
    private validateAntiCheat;
    private isValidCard;
}
