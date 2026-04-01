import type { Card } from '@/types/game';
import { Suit } from '@/types/game';

export class HandUtility {
  static getRankCounts(hand: Card[]): Record<number, number> {
    const counts: Record<number, number> = {};

    for (const card of hand) {
      const value = card.value;
      counts[value] = (counts[value] || 0) + 1;
    }

    return counts;
  }

  static getSuitCounts(hand: Card[]): Record<Suit, number> {
    const counts: Record<Suit, number> = {
      [Suit.SPADES]: 0,
      [Suit.HEARTS]: 0,
      [Suit.DIAMONDS]: 0,
      [Suit.CLUBS]: 0,
    };

    for (const card of hand) {
      counts[card.suit] = (counts[card.suit] || 0) + 1;
    }

    return counts;
  }

  static findPairs(
    hand: Card[],
    trumpCard?: Card,
    useTrump: boolean = false
  ): number[] {
    const rankCounts = this.getRankCounts(hand);
    const pairs: number[] = [];
    const trumpCount =
      useTrump && trumpCard
        ? hand.filter((c) => c.id === trumpCard.id).length
        : 0;

    for (const [value, count] of Object.entries(rankCounts)) {
      const numValue = Number(value);
      if (numValue === trumpCard?.value && trumpCount > 0) {
        continue;
      }

      let effectiveCount = count;
      if (
        useTrump &&
        trumpCard &&
        trumpCount > 0 &&
        numValue !== trumpCard.value
      ) {
        effectiveCount = count + trumpCount;
      }

      if (effectiveCount >= 2) {
        pairs.push(numValue);
      }
    }

    return pairs.sort((a, b) => b - a);
  }

  static isFlush(hand: Card[]): boolean {
    if (hand.length === 0) return false;
    const firstSuit = hand[0].suit;
    return hand.every((c) => c.suit === firstSuit);
  }

  static isSequence(hand: Card[]): boolean {
    if (hand.length < 2) return false;

    const sorted = [...hand].sort((a, b) => a.value - b.value);

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].value !== sorted[i - 1].value + 1) {
        return false;
      }
    }

    return true;
  }

  static isStraight(hand: Card[]): boolean {
    return this.isSequence(hand);
  }

  static isThreeOfAKind(
    hand: Card[],
    trumpCard?: Card,
    useTrump: boolean = false
  ): boolean {
    const rankCounts = this.getRankCounts(hand);
    const trumpCount =
      useTrump && trumpCard
        ? hand.filter((c) => c.id === trumpCard.id).length
        : 0;

    for (const [value, count] of Object.entries(rankCounts)) {
      const numValue = Number(value);
      if (numValue === trumpCard?.value && trumpCount > 0) {
        continue;
      }

      let effectiveCount = count;
      if (
        useTrump &&
        trumpCard &&
        trumpCount > 0 &&
        numValue !== trumpCard.value
      ) {
        effectiveCount = count + trumpCount;
      }

      if (effectiveCount >= 3) {
        return true;
      }
    }

    return false;
  }

  static isFourOfAKind(
    hand: Card[],
    _trumpCard?: Card,
    _useTrump: boolean = false
  ): boolean {
    const rankCounts = this.getRankCounts(hand);
    return Object.values(rankCounts).some((count) => count >= 4);
  }

  static isFiveOfAKind(
    hand: Card[],
    _trumpCard?: Card,
    _useTrump: boolean = false
  ): boolean {
    const rankCounts = this.getRankCounts(hand);
    return Object.values(rankCounts).some((count) => count >= 5);
  }

  static isStraightFlush(hand: Card[]): boolean {
    return this.isFlush(hand) && this.isSequence(hand);
  }

  static isRoyalFlush(hand: Card[]): boolean {
    if (!this.isFlush(hand) || !this.isSequence(hand)) {
      return false;
    }

    const sorted = [...hand].sort((a, b) => b.value - a.value);
    const highestValue = sorted[0].value;

    return highestValue === 14 && sorted.length >= 3;
  }

  static isFullHouse(
    hand: Card[],
    _trumpCard?: Card,
    _useTrump: boolean = false
  ): boolean {
    if (hand.length < 3) return false;

    const rankCounts = this.getRankCounts(hand);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    if (hand.length === 3) {
      return counts[0] >= 3;
    }

    return counts[0] >= 3 && counts[1] >= 2;
  }

  static findMultiplePairs(
    hand: Card[],
    trumpCard?: Card,
    useTrump: boolean = false
  ): number[] {
    const pairs = this.findPairs(hand, trumpCard, useTrump);
    return pairs.length >= 2 ? pairs : [];
  }

  static findMultipleTriplets(
    hand: Card[],
    _trumpCard?: Card,
    _useTrump: boolean = false
  ): number[] {
    const rankCounts = this.getRankCounts(hand);
    const triplets: number[] = [];

    for (const [value, count] of Object.entries(rankCounts)) {
      if (count >= 3) {
        triplets.push(Number(value));
      }
    }

    return triplets.length >= 2 ? triplets.sort((a, b) => b - a) : [];
  }

  static findMultipleFourOfAKind(
    hand: Card[],
    _trumpCard?: Card,
    _useTrump: boolean = false
  ): number[] {
    const rankCounts = this.getRankCounts(hand);
    const fours: number[] = [];

    for (const [value, count] of Object.entries(rankCounts)) {
      if (count >= 4) {
        fours.push(Number(value));
      }
    }

    return fours.length >= 2 ? fours.sort((a, b) => b - a) : [];
  }

  static getCardColor(suit: string): 'red' | 'black' {
    return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
  }

  static isSameColorsSequence(hand: Card[]): boolean {
    if (!this.isSequence(hand)) return false;

    if (hand.length === 0) return false;
    const firstColor = this.getCardColor(hand[0].suit);
    return hand.every((c) => this.getCardColor(c.suit) === firstColor);
  }

  static isDifferentColorsSequence(hand: Card[]): boolean {
    if (!this.isSequence(hand)) return false;

    const suits = new Set(hand.map((c) => c.suit));
    return suits.size > 1;
  }

  static isTrumpInMiddle(hand: Card[], trumpCard: Card): boolean {
    if (!hand.some((c) => c.id === trumpCard.id)) return false;

    const sorted = [...hand].sort((a, b) => a.value - b.value);
    const trumpIndex = sorted.findIndex((c) => c.id === trumpCard.id);

    return trumpIndex > 0 && trumpIndex < sorted.length - 1;
  }

  static isRankAdjacentToTrump(hand: Card[], trumpCard: Card): boolean {
    if (!hand.some((c) => c.id === trumpCard.id)) return false;

    const trumpValue = trumpCard.value;

    for (const card of hand) {
      if (card.id !== trumpCard.id) {
        const diff = Math.abs(card.value - trumpValue);
        if (diff === 1) {
          return true;
        }
      }
    }

    return false;
  }

  static getHighestValue(hand: Card[]): number {
    if (hand.length === 0) return 0;
    return Math.max(...hand.map((c) => c.value));
  }

  static getNOfAKindRank(
    hand: Card[],
    n: number,
    _trumpCard?: Card,
    _useTrump: boolean = false
  ): number | null {
    const rankCounts = this.getRankCounts(hand);

    let highestRank: number | null = null;

    for (const [value, count] of Object.entries(rankCounts)) {
      const numValue = Number(value);
      if (
        count >= n &&
        (highestRank === null || numValue > highestRank)
      ) {
        highestRank = numValue;
      }
    }

    return highestRank;
  }
}
