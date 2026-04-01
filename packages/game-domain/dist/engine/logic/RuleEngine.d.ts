import { type GameState, type PlayerAction, GamePhase } from '../../types/game';
export interface GameRules {
    maxPlayers: number;
    initialHandSize: number;
    deckSize: number;
}
export declare const DEFAULT_RULES: GameRules;
export declare class RuleEngine {
    private rules;
    constructor(rules?: GameRules);
    validateAction(action: PlayerAction, gameState: GameState): boolean;
    private validatePickUp;
    private validateDecline;
    private validateDeclareIntent;
    private validateCallShowdown;
    private validateRebuttal;
    private isValidRun;
    getNextPhase(currentPhase: GamePhase, action: PlayerAction): GamePhase;
    shouldEndGame(gameState: GameState): boolean;
    getRules(): GameRules;
}
