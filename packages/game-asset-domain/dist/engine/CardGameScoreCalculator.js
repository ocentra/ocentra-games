import { PatternEvaluator } from '../engine/PatternEvaluator.js';
export class CardGameScoreCalculator {
    rules;
    trumpCard;
    constructor(_scoring, rules, trumpCard) {
        this.rules = rules;
        this.trumpCard = trumpCard;
    }
    async calculateScore(hand) {
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
