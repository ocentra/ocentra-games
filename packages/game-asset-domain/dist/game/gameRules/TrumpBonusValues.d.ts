import 'reflect-metadata';
export declare class TrumpBonusValues {
    cardInMiddleBonus: number;
    fiveOfKindBonus: number;
    flushBonus: number;
    fourOfKindBonus: number;
    threeOfKindBonus: number;
    pairBonus: number;
    trumpCardBonus: number;
    wildCardBonus: number;
    rankAdjacentBonus: number;
    getBonusForSet(size: number): number;
}
