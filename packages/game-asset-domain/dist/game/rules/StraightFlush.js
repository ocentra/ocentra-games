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
let StraightFlush = class StraightFlush extends BaseBonusRule {
    minNumberOfCard = 3;
    bonusValue = 180;
    patternType = 'straight_flush';
    ruleName = 'StraightFlush';
    priority = 98;
    async initialize(gameMode) {
        if (!(gameMode instanceof CardGameMode)) {
            return false;
        }
        this.gameMode = gameMode;
        this.description = 'Three or more cards in sequence of the same suit.';
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
        if (!HandUtility.isStraightFlush(hand)) {
            return null;
        }
        const highestValue = HandUtility.getHighestValue(hand);
        const baseBonus = this.bonusValue * highestValue;
        const calculation = `${this.bonusValue} * ${highestValue}`;
        const descriptions = [`Straight Flush: ${hand[0].suit}`];
        if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
            const trumpBonus = this.gameMode.trumpBonusValues?.flushBonus ?? 0;
            const additionalBonus = trumpBonus;
            descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
            const updatedCalculation = `${calculation} + ${trumpBonus}`;
            return new BonusDetail(this.ruleName, baseBonus, additionalBonus, descriptions, updatedCalculation, this.priority, hand);
        }
        return new BonusDetail(this.ruleName, baseBonus, 0, descriptions, calculation, this.priority, hand);
    }
    createExampleHand(handSize, cardRanking, _trumpCard, coloured = true) {
        if (handSize < 3) {
            return [];
        }
        const hand = [];
        const suit = cardRanking.getRandomSuit();
        const startRank = cardRanking.getRandomRank(2, 14 - handSize + 1);
        for (let i = 0; i < handSize; i++) {
            const rank = startRank + i;
            const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
            hand.push(symbol);
        }
        return hand;
    }
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
], StraightFlush.prototype, "minNumberOfCard", void 0);
__decorate([
    serializable({ label: 'Default Bonus Value' }),
    __metadata("design:type", Number)
], StraightFlush.prototype, "bonusValue", void 0);
__decorate([
    serializable({ label: 'Pattern Type' }),
    __metadata("design:type", String)
], StraightFlush.prototype, "patternType", void 0);
__decorate([
    serializable({ label: 'Rule Name' }),
    __metadata("design:type", String)
], StraightFlush.prototype, "ruleName", void 0);
__decorate([
    serializable({ label: 'Priority' }),
    __metadata("design:type", Number)
], StraightFlush.prototype, "priority", void 0);
StraightFlush = __decorate([
    serializableClass({
        assetType: 'StraightFlush',
        displayName: 'Straight Flush',
        icon: '🔥',
        category: AssetTypeCategory.Game,
    })
], StraightFlush);
export { StraightFlush };
