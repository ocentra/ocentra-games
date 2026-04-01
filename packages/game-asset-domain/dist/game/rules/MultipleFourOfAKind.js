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
let MultipleFourOfAKind = class MultipleFourOfAKind extends BaseBonusRule {
    minNumberOfCard = 8;
    bonusValue = 170;
    patternType = 'multiple_four_of_kind';
    ruleName = 'MultipleFourOfAKind';
    priority = 97;
    async initialize(gameMode) {
        if (!(gameMode instanceof CardGameMode)) {
            return false;
        }
        this.gameMode = gameMode;
        this.description = 'Two or more sets of Four of a Kind.';
        const cardRanking = await gameMode.getCardRanking();
        if (!cardRanking)
            return false;
        const handSize = gameMode.initialNumberOfCards || 8;
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
        const multipleFours = HandUtility.findMultipleFourOfAKind(hand, trumpCard, this.gameMode?.useTrump);
        if (multipleFours.length < 2) {
            return null;
        }
        const totalValue = multipleFours.reduce((sum, rank) => sum + rank * 4, 0);
        const baseBonus = this.bonusValue * totalValue;
        const calculation = `${this.bonusValue} * ${totalValue}`;
        const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
        if (!cardRanking) {
            return null;
        }
        const descriptions = multipleFours.map(rank => `Four of a Kind: ${cardRanking.getRankName(rank)}`);
        const matchedCards = hand.filter(c => multipleFours.includes(c.value));
        return new BonusDetail(this.ruleName, baseBonus, 0, descriptions, calculation, this.priority, matchedCards);
    }
    createExampleHand(handSize, cardRanking, _trumpCard, coloured = true) {
        if (handSize < 8) {
            return [];
        }
        const hand = [];
        const availableSuits = cardRanking.getAllSuits();
        const usedCombinations = new Set();
        const four1Rank = cardRanking.getRandomRank();
        const four2Rank = cardRanking.getRandomRank();
        if (four1Rank === four2Rank) {
            return [];
        }
        for (let i = 0; i < 4; i++) {
            const suit = availableSuits[i % availableSuits.length];
            const symbol = cardRanking.getCardSymbol(suit, four1Rank, coloured);
            hand.push(symbol);
            usedCombinations.add(`${suit}_${four1Rank}`);
        }
        for (let i = 0; i < 4 && hand.length < handSize; i++) {
            const suit = availableSuits[i % availableSuits.length];
            const symbol = cardRanking.getCardSymbol(suit, four2Rank, coloured);
            hand.push(symbol);
            usedCombinations.add(`${suit}_${four2Rank}`);
        }
        while (hand.length < handSize) {
            const suit = cardRanking.getRandomSuit();
            let rank;
            let attempts = 0;
            do {
                rank = cardRanking.getRandomRank();
                attempts++;
                if (attempts > 100)
                    break;
            } while (usedCombinations.has(`${suit}_${rank}`) || rank === four1Rank || rank === four2Rank);
            if (attempts > 100)
                break;
            const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
            hand.push(symbol);
            usedCombinations.add(`${suit}_${rank}`);
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
], MultipleFourOfAKind.prototype, "minNumberOfCard", void 0);
__decorate([
    serializable({ label: 'Default Bonus Value' }),
    __metadata("design:type", Number)
], MultipleFourOfAKind.prototype, "bonusValue", void 0);
__decorate([
    serializable({ label: 'Pattern Type' }),
    __metadata("design:type", String)
], MultipleFourOfAKind.prototype, "patternType", void 0);
__decorate([
    serializable({ label: 'Rule Name' }),
    __metadata("design:type", String)
], MultipleFourOfAKind.prototype, "ruleName", void 0);
__decorate([
    serializable({ label: 'Priority' }),
    __metadata("design:type", Number)
], MultipleFourOfAKind.prototype, "priority", void 0);
MultipleFourOfAKind = __decorate([
    serializableClass({
        assetType: 'MultipleFourOfAKind',
        displayName: 'Multiple Four Of A Kind',
        icon: '🎯🎯',
        category: AssetTypeCategory.Game,
    })
], MultipleFourOfAKind);
export { MultipleFourOfAKind };
