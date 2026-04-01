import type { Card } from '@ocentra/game-domain/types/game';
import type { BaseBonusRule } from '@/game/rules/BaseBonusRule';
import type { BonusDetail } from '@/game/rules/BonusDetail';

export class PatternEvaluator {
  private rules: BaseBonusRule[];
  private trumpCard?: Card;

  constructor(
    rules: BaseBonusRule[],
    trumpCard?: Card
  ) {
    this.rules = rules;
    this.trumpCard = trumpCard;
  }

  async evaluateAllPatterns(hand: Card[]): Promise<BonusDetail[]> {
    const results: BonusDetail[] = [];

    for (const rule of this.rules) {
      const detail = await rule.evaluate(hand, this.trumpCard);
      if (detail) {
        results.push(detail);
      }
    }

    return results.sort((a, b) => b.priority - a.priority);
  }

  async evaluatePattern(
    hand: Card[],
    rule: BaseBonusRule
  ): Promise<BonusDetail | null> {
    return rule.evaluate(hand, this.trumpCard);
  }

  async getBestPattern(hand: Card[]): Promise<BonusDetail | null> {
    const all = await this.evaluateAllPatterns(hand);
    return all[0] ?? null;
  }
}
