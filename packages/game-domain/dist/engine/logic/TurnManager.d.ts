import { type GameState, type PlayerAction, GamePhase } from '../../types/game';
export interface TurnState {
    currentPlayer: number;
    phase: GamePhase;
    waitingForAction: boolean;
    actionDeadline?: Date;
}
export declare class TurnManager {
    private turnTimeoutMs;
    constructor(turnTimeoutMs?: number);
    advanceToNextPlayer(gameState: GameState): number;
    getNextActivePlayer(gameState: GameState): number;
    processTurnAction(gameState: GameState, action: PlayerAction): Partial<GameState>;
    private processPickUpAction;
    private processDeclineAction;
    private processDeclareIntentAction;
    private processCallShowdownAction;
    private processRebuttalAction;
    private getNextUndeclaredPlayer;
    isPhaseComplete(gameState: GameState): boolean;
    getRemainingActionTime(gameState: GameState): number;
    hasActionTimedOut(gameState: GameState): boolean;
}
