import type { Card } from '@ocentra/game-domain/types/game';

export class BonusDetail {
  ruleName: string;
  baseBonus: number;
  additionalBonus: number;
  bonusDescriptions: string[];
  bonusCalculationDescriptions: string;
  priority: number;
  matchedCards: Card[];

  constructor(
    ruleName: string,
    baseBonus: number,
    additionalBonus: number,
    bonusDescriptions: string[],
    bonusCalculationDescriptions: string,
    priority: number,
    matchedCards: Card[]
  ) {
    this.ruleName = ruleName;
    this.baseBonus = baseBonus;
    this.additionalBonus = additionalBonus;
    this.bonusDescriptions = bonusDescriptions;
    this.bonusCalculationDescriptions = bonusCalculationDescriptions;
    this.priority = priority;
    this.matchedCards = matchedCards;
  }

  get totalBonus(): number {
    return this.baseBonus + this.additionalBonus;
  }
}

