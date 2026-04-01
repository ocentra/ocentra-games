export class BonusDetail {
    ruleName;
    baseBonus;
    additionalBonus;
    bonusDescriptions;
    bonusCalculationDescriptions;
    priority;
    matchedCards;
    constructor(ruleName, baseBonus, additionalBonus, bonusDescriptions, bonusCalculationDescriptions, priority, matchedCards) {
        this.ruleName = ruleName;
        this.baseBonus = baseBonus;
        this.additionalBonus = additionalBonus;
        this.bonusDescriptions = bonusDescriptions;
        this.bonusCalculationDescriptions = bonusCalculationDescriptions;
        this.priority = priority;
        this.matchedCards = matchedCards;
    }
    get totalBonus() {
        return this.baseBonus + this.additionalBonus;
    }
}
