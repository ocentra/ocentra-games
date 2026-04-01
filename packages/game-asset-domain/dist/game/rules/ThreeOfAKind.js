var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { BaseBonusRule } from '../../game/rules/BaseBonusRule.js';
import { BonusDetail } from '../../game/rules/BonusDetail.js';
import { CardGameMode } from '../../gameMode/cardGameMode/CardGameMode.js';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { HandUtility } from '@ocentra/game-domain/engine/logic/HandUtility';
let ThreeOfAKind = class ThreeOfAKind extends BaseBonusRule {
    minNumberOfCard = 3;
    bonusValue = 125;
    patternType = 'three_of_kind';
    ruleName = 'ThreeOfAKind';
    priority = 91;
    async initialize(gameMode) {
        if (!(gameMode instanceof CardGameMode)) {
            return false;
        }
        this.gameMode = gameMode;
        this.description = 'Three cards of the same rank (2 to K), optionally using one Trump card as a wild card.';
        const cardRanking = await gameMode.getCardRanking();
        if (!cardRanking)
            return false;
        const handSize = gameMode.initialNumberOfCards || 3;
        const exampleHand = this.createExampleHand(handSize, cardRanking, undefined, false);
        if (exampleHand.length > 0) {
            const exampleString = exampleHand.join(', ');
            const llmExample = `${this.ruleName}: ${exampleString} - Bonus: ${this.bonusValue}`;
            const playerExample = `${this.description}\n${this.ruleName} Bonus: ${this.bonusValue}\nExample: ${exampleString}`;
            this.examples = {
                LLM: llmExample,
                Player: playerExample,
            };
        }
        return true;
    }
    async evaluate(hand, trumpCard) {
        if (hand.length < this.minNumberOfCard) {
            return null;
        }
        if (!HandUtility.isThreeOfAKind(hand, trumpCard, this.gameMode?.useTrump)) {
            return null;
        }
        const threeRank = HandUtility.getNOfAKindRank(hand, 3, trumpCard, this.gameMode?.useTrump);
        if (!threeRank) {
            return null;
        }
        let baseBonus;
        let calculation;
        if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
            const nonTrumpRanks = hand
                .filter(c => c.id !== trumpCard.id)
                .map(c => c.value);
            const pairRank = nonTrumpRanks.length > 0 ? nonTrumpRanks[0] : threeRank;
            baseBonus = this.bonusValue * (pairRank + trumpCard.value);
            calculation = `${this.bonusValue} * (${pairRank} + ${trumpCard.value})`;
        }
        else {
            baseBonus = this.bonusValue * threeRank * 3;
            calculation = `${this.bonusValue} * (${threeRank} * 3)`;
        }
        let additionalBonus = 0;
        const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
        if (!cardRanking) {
            return null;
        }
        const rankName = cardRanking.getRankName(threeRank);
        const descriptions = [`Three of a Kind: ${rankName}`];
        if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
            const trumpBonus = this.gameMode.trumpBonusValues?.threeOfKindBonus ?? 0;
            additionalBonus += trumpBonus;
            descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
            calculation += ` + ${trumpBonus}`;
        }
        const matchedCards = hand.filter(c => c.value === threeRank);
        return new BonusDetail(this.ruleName, baseBonus, additionalBonus, descriptions, calculation, this.priority, matchedCards);
    }
    createExampleHand(handSize, cardRanking, _trumpCard, coloured = true) {
        if (handSize < 3) {
            return [];
        }
        const hand = [];
        const availableSuits = cardRanking.getAllSuits();
        const threeRank = cardRanking.getRandomRank();
        for (let i = 0; i < 3 && i < handSize; i++) {
            const suit = availableSuits[i % availableSuits.length];
            const symbol = cardRanking.getCardSymbol(suit, threeRank, coloured);
            hand.push(symbol);
        }
        while (hand.length < handSize) {
            const suit = cardRanking.getRandomSuit();
            let rank;
            do {
                rank = cardRanking.getRandomRank();
            } while (rank === threeRank);
            const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
            hand.push(symbol);
        }
        return hand;
    }
    /**
     * Generates UI blocks for this rule.
     * Uses default implementation from BaseBonusRule.
     */
    synthesizeUIContent(ctx) {
        return super.synthesizeUIContent(ctx);
    }
    isApplicable(gameMode) {
        return gameMode instanceof CardGameMode;
    }
};
__decorate([
    serializable({ label: 'Minimum Cards Required' }),
    __metadata("design:type", Number)
], ThreeOfAKind.prototype, "minNumberOfCard", void 0);
__decorate([
    serializable({ label: 'Default Bonus Value' }),
    __metadata("design:type", Number)
], ThreeOfAKind.prototype, "bonusValue", void 0);
__decorate([
    serializable({ label: 'Pattern Type' }),
    __metadata("design:type", String)
], ThreeOfAKind.prototype, "patternType", void 0);
__decorate([
    serializable({ label: 'Rule Name' }),
    __metadata("design:type", String)
], ThreeOfAKind.prototype, "ruleName", void 0);
__decorate([
    serializable({ label: 'Priority' }),
    __metadata("design:type", Number)
], ThreeOfAKind.prototype, "priority", void 0);
ThreeOfAKind = __decorate([
    serializableClass({
        assetType: 'ThreeOfAKind',
        displayName: 'Three Of A Kind',
        icon: '🎲',
        category: AssetTypeCategory.Game,
    })
], ThreeOfAKind);
export { ThreeOfAKind };
