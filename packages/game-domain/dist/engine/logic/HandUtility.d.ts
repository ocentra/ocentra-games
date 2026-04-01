import type { Card } from '../../types/game';
import { Suit } from '../../types/game';
export declare class HandUtility {
    static getRankCounts(hand: Card[]): Record<number, number>;
    static getSuitCounts(hand: Card[]): Record<Suit, number>;
    static findPairs(hand: Card[], trumpCard?: Card, useTrump?: boolean): number[];
    static isFlush(hand: Card[]): boolean;
    static isSequence(hand: Card[]): boolean;
    static isStraight(hand: Card[]): boolean;
    static isThreeOfAKind(hand: Card[], trumpCard?: Card, useTrump?: boolean): boolean;
    static isFourOfAKind(hand: Card[], _trumpCard?: Card, _useTrump?: boolean): boolean;
    static isFiveOfAKind(hand: Card[], _trumpCard?: Card, _useTrump?: boolean): boolean;
    static isStraightFlush(hand: Card[]): boolean;
    static isRoyalFlush(hand: Card[]): boolean;
    static isFullHouse(hand: Card[], _trumpCard?: Card, _useTrump?: boolean): boolean;
    static findMultiplePairs(hand: Card[], trumpCard?: Card, useTrump?: boolean): number[];
    static findMultipleTriplets(hand: Card[], _trumpCard?: Card, _useTrump?: boolean): number[];
    static findMultipleFourOfAKind(hand: Card[], _trumpCard?: Card, _useTrump?: boolean): number[];
    static getCardColor(suit: string): 'red' | 'black';
    static isSameColorsSequence(hand: Card[]): boolean;
    static isDifferentColorsSequence(hand: Card[]): boolean;
    static isTrumpInMiddle(hand: Card[], trumpCard: Card): boolean;
    static isRankAdjacentToTrump(hand: Card[], trumpCard: Card): boolean;
    static getHighestValue(hand: Card[]): number;
    static getNOfAKindRank(hand: Card[], n: number, _trumpCard?: Card, _useTrump?: boolean): number | null;
}
