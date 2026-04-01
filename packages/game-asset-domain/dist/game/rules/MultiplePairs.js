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
let MultiplePairs = class MultiplePairs extends BaseBonusRule {
    minNumberOfCard = 4;
    bonusValue = 105;
    patternType = 'multiple_pairs';
    ruleName = 'MultiplePairs';
    priority = 92;
    async initialize(gameMode) {
        if (!(gameMode instanceof CardGameMode)) {
            return false;
        }
        this.gameMode = gameMode;
        this.description = 'Two or more pairs of cards.';
        const cardRanking = await gameMode.getCardRanking();
        if (!cardRanking)
            return false;
        const handSize = gameMode.initialNumberOfCards || 4;
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
        const multiplePairs = HandUtility.findMultiplePairs(hand, trumpCard, this.gameMode?.useTrump);
        if (multiplePairs.length < 2) {
            return null;
        }
        const totalValue = multiplePairs.reduce((sum, rank) => sum + rank, 0);
        const baseBonus = this.bonusValue * totalValue;
        const calculation = `${this.bonusValue} * ${totalValue}`;
        const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
        if (!cardRanking) {
            return null;
        }
        const descriptions = multiplePairs.map(rank => `Pair of ${cardRanking.getRankName(rank)}s`);
        const matchedCards = hand.filter(c => multiplePairs.includes(c.value));
        return new BonusDetail(this.ruleName, baseBonus, 0, descriptions, calculation, this.priority, matchedCards);
    }
    createExampleHand(handSize, cardRanking, _trumpCard, coloured = true) {
        if (handSize < 4) {
            return [];
        }
        const hand = [];
        const availableSuits = cardRanking.getAllSuits();
        const usedCombinations = new Set();
        const pair1Rank = cardRanking.getRandomRank();
        const pair2Rank = cardRanking.getRandomRank();
        if (pair1Rank === pair2Rank) {
            return [];
        }
        for (let i = 0; i < 2; i++) {
            const suit = availableSuits[i % availableSuits.length];
            const symbol = cardRanking.getCardSymbol(suit, pair1Rank, coloured);
            hand.push(symbol);
            usedCombinations.add(`${suit}_${pair1Rank}`);
        }
        for (let i = 0; i < 2 && hand.length < handSize; i++) {
            const suit = availableSuits[(i + 2) % availableSuits.length];
            const symbol = cardRanking.getCardSymbol(suit, pair2Rank, coloured);
            hand.push(symbol);
            usedCombinations.add(`${suit}_${pair2Rank}`);
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
            } while (usedCombinations.has(`${suit}_${rank}`) || rank === pair1Rank || rank === pair2Rank);
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
], MultiplePairs.prototype, "minNumberOfCard", void 0);
__decorate([
    serializable({ label: 'Default Bonus Value' }),
    __metadata("design:type", Number)
], MultiplePairs.prototype, "bonusValue", void 0);
__decorate([
    serializable({ label: 'Pattern Type' }),
    __metadata("design:type", String)
], MultiplePairs.prototype, "patternType", void 0);
__decorate([
    serializable({ label: 'Rule Name' }),
    __metadata("design:type", String)
], MultiplePairs.prototype, "ruleName", void 0);
__decorate([
    serializable({ label: 'Priority' }),
    __metadata("design:type", Number)
], MultiplePairs.prototype, "priority", void 0);
MultiplePairs = __decorate([
    serializableClass({
        assetType: 'MultiplePairs',
        displayName: 'Multiple Pairs',
        icon: '👥👥',
        category: AssetTypeCategory.Game,
    })
], MultiplePairs);
export { MultiplePairs };
