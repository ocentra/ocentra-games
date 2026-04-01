import type { Card } from '@ocentra/game-domain/types/game';
import type { BaseBonusRule } from '../game/rules/BaseBonusRule';
import type { BonusDetail } from '../game/rules/BonusDetail';
export declare class PatternEvaluator {
    private rules;
    private trumpCard?;
    constructor(rules: BaseBonusRule[], trumpCard?: Card);
    evaluateAllPatterns(hand: Card[]): Promise<BonusDetail[]>;
    evaluatePattern(hand: Card[], rule: BaseBonusRule): Promise<BonusDetail | null>;
    getBestPattern(hand: Card[]): Promise<BonusDetail | null>;
}
