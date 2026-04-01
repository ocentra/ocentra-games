import type { Card } from '@ocentra/game-domain/types/game';
export declare class BonusDetail {
    ruleName: string;
    baseBonus: number;
    additionalBonus: number;
    bonusDescriptions: string[];
    bonusCalculationDescriptions: string;
    priority: number;
    matchedCards: Card[];
    constructor(ruleName: string, baseBonus: number, additionalBonus: number, bonusDescriptions: string[], bonusCalculationDescriptions: string, priority: number, matchedCards: Card[]);
    get totalBonus(): number;
}
