import { type Card, type Player, type GameState } from '../../types/game';
export interface ScoreBreakdown {
    baseScore: number;
    multiplier: number;
    positivePoints: number;
    penalties: number;
    bonuses: number;
    totalScore: number;
    bonusDetails: {
        cleanSweep: boolean;
        longRuns: number;
    };
    sequences: {
        declaredSuitSequences: SequenceInfo[];
        penaltySequences: SequenceInfo[];
    };
}
export interface SequenceInfo {
    cards: Card[];
    sequenceValue: number;
    sequenceLength: number;
}
export declare class ScoreCalculator {
    calculatePlayerScore(player: Player): ScoreBreakdown;
    private calculateDeclaredScore;
    private calculateUndeclaredPenalty;
    private findSequences;
    private findSequencesInSortedCards;
    private calculateSequencePoints;
    private calculateBonuses;
    private calculateBonusPoints;
    private countLongRuns;
    calculateAllScores(gameState: GameState): Map<string, ScoreBreakdown>;
    determineWinners(gameState: GameState): {
        winners: Player[];
        scores: Map<string, ScoreBreakdown>;
    };
    validateRebuttal(cards: Card[]): {
        isValid: boolean;
        runValue: number;
    };
    calculateBudgetUsage(sequences: SequenceInfo[]): number;
}
