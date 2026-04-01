import type { Card } from '@ocentra/game-domain/types/game';
import type { BaseBonusRule } from '@/game/rules/BaseBonusRule';
import type { BonusDetail } from '@/game/rules/BonusDetail';
import type { CardGameScoring } from '@/game/scoring/CardGameScoring';
import { PatternEvaluator } from '@/engine/PatternEvaluator';

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

export class CardGameScoreCalculator {
  private rules: BaseBonusRule[];
  private trumpCard?: Card;

  constructor(
    _scoring: CardGameScoring,
    rules: BaseBonusRule[],
    trumpCard?: Card
  ) {
    this.rules = rules;
    this.trumpCard = trumpCard;
  }

  async calculateScore(hand: Card[]): Promise<CardGameScoreBreakdown> {
    const evaluator = new PatternEvaluator(this.rules, this.trumpCard);

    const patterns = await evaluator.evaluateAllPatterns(hand);

    if (patterns.length === 0) {
      return {
        baseScore: 0,
        multiplier: 1,
        positivePoints: 0,
        penalties: 0,
        bonuses: 0,
        totalScore: 0,
        bonusDetails: {
          patterns: [],
          winner: null,
        },
        matchedPattern: null,
      };
    }

    const best = patterns[0];

    const baseScore = best.baseBonus;
    const additionalBonus = best.additionalBonus;
    const totalScore = baseScore + additionalBonus;

    return {
      baseScore,
      multiplier: 1,
      positivePoints: baseScore,
      penalties: 0,
      bonuses: additionalBonus,
      totalScore,
      bonusDetails: {
        patterns,
        winner: best,
      },
      matchedPattern: best.ruleName,
    };
  }
}
