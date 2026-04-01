import type { Card } from '@ocentra/game-domain/types/game';
import type { BaseBonusRule } from '../game/rules/BaseBonusRule';
import type { BonusDetail } from '../game/rules/BonusDetail';
import type { CardGameScoring } from '../game/scoring/CardGameScoring';
export interface CardGameScoreBreakdown {
    baseScore: number;
    multiplier: number;
    positivePoints: number;
    penalties: number;
    bonuses: number;
    totalScore: number;
    bonusDetails: {
        patterns: BonusDetail[];
        winner: BonusDetail | null;
    };
    matchedPattern: string | null;
}
export declare class CardGameScoreCalculator {
    private rules;
    private trumpCard?;
    constructor(_scoring: CardGameScoring, rules: BaseBonusRule[], trumpCard?: Card);
    calculateScore(hand: Card[]): Promise<CardGameScoreBreakdown>;
}
