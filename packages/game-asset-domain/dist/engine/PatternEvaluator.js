export class PatternEvaluator {
    rules;
    trumpCard;
    constructor(rules, trumpCard) {
        this.rules = rules;
        this.trumpCard = trumpCard;
    }
    async evaluateAllPatterns(hand) {
        const results = [];
        for (const rule of this.rules) {
            const detail = await rule.evaluate(hand, this.trumpCard);
            if (detail) {
                results.push(detail);
            }
        }
        return results.sort((a, b) => b.priority - a.priority);
    }
    async evaluatePattern(hand, rule) {
        return rule.evaluate(hand, this.trumpCard);
    }
    async getBestPattern(hand) {
        const all = await this.evaluateAllPatterns(hand);
        return all[0] ?? null;
    }
}
