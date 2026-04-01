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
import { Suit } from '@ocentra/game-domain/types/game';
let SameColorsSequence = class SameColorsSequence extends BaseBonusRule {
    minNumberOfCard = 3;
    bonusValue = 120;
    patternType = 'same_colors_sequence';
    ruleName = 'SameColorsSequence';
    priority = 90;
    async initialize(gameMode) {
        if (!(gameMode instanceof CardGameMode)) {
            return false;
        }
        this.gameMode = gameMode;
        this.description = 'Sequence of cards of the same color (Red: Hearts/Diamonds, Black: Spades/Clubs).';
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
    async evaluate(hand, _trumpCard) {
        if (hand.length < this.minNumberOfCard) {
            return null;
        }
        if (!HandUtility.isSameColorsSequence(hand)) {
            return null;
        }
        const highestValue = HandUtility.getHighestValue(hand);
        const baseBonus = this.bonusValue * highestValue;
        const calculation = `${this.bonusValue} * ${highestValue}`;
        const color = HandUtility.getCardColor(hand[0].suit);
        const descriptions = [`Same Colors Sequence: ${color}`];
        return new BonusDetail(this.ruleName, baseBonus, 0, descriptions, calculation, this.priority, hand);
    }
    createExampleHand(handSize, cardRanking, _trumpCard, coloured = true) {
        if (handSize < 3) {
            return [];
        }
        const hand = [];
        const redSuits = [Suit.HEARTS, Suit.DIAMONDS];
        const blackSuits = [Suit.SPADES, Suit.CLUBS];
        const colorChoice = Math.random() < 0.5 ? 'red' : 'black';
        const suits = colorChoice === 'red' ? redSuits : blackSuits;
        const startRank = cardRanking.getRandomRank(2, 14 - handSize + 1);
        for (let i = 0; i < handSize; i++) {
            const rank = startRank + i;
            const suit = suits[i % suits.length];
            const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
            hand.push(symbol);
        }
        return hand;
    }
    isApplicable(gameMode) {
        return gameMode instanceof CardGameMode;
    }
};
__decorate([
    serializable({ label: 'Minimum Cards Required' }),
    __metadata("design:type", Number)
], SameColorsSequence.prototype, "minNumberOfCard", void 0);
__decorate([
    serializable({ label: 'Default Bonus Value' }),
    __metadata("design:type", Number)
], SameColorsSequence.prototype, "bonusValue", void 0);
__decorate([
    serializable({ label: 'Pattern Type' }),
    __metadata("design:type", String)
], SameColorsSequence.prototype, "patternType", void 0);
__decorate([
    serializable({ label: 'Rule Name' }),
    __metadata("design:type", String)
], SameColorsSequence.prototype, "ruleName", void 0);
__decorate([
    serializable({ label: 'Priority' }),
    __metadata("design:type", Number)
], SameColorsSequence.prototype, "priority", void 0);
SameColorsSequence = __decorate([
    serializableClass({
        assetType: 'SameColorsSequence',
        displayName: 'Same Colors Sequence',
        icon: '🌈',
        category: AssetTypeCategory.Game,
    })
], SameColorsSequence);
export { SameColorsSequence };
