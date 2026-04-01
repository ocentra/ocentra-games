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
let FullHouse = class FullHouse extends BaseBonusRule {
    minNumberOfCard = 5;
    bonusValue = 190;
    patternType = 'full_house';
    ruleName = 'FullHouse';
    priority = 95;
    async initialize(gameMode) {
        if (!(gameMode instanceof CardGameMode)) {
            return false;
        }
        this.gameMode = gameMode;
        this.description = 'Three cards of the same rank plus two cards of another rank.';
        const cardRanking = await gameMode.getCardRanking();
        if (!cardRanking)
            return false;
        const handSize = gameMode.initialNumberOfCards || 5;
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
        if (!HandUtility.isFullHouse(hand, trumpCard, this.gameMode?.useTrump)) {
            return null;
        }
        const threeRank = HandUtility.getNOfAKindRank(hand, 3, trumpCard, this.gameMode?.useTrump);
        const twoRank = HandUtility.getNOfAKindRank(hand, 2, trumpCard, this.gameMode?.useTrump);
        if (!threeRank || !twoRank) {
            return null;
        }
        const baseBonus = this.bonusValue * (threeRank * 3 + twoRank * 2);
        const calculation = `${this.bonusValue} * (${threeRank} * 3 + ${twoRank} * 2)`;
        const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
        if (!cardRanking) {
            return null;
        }
        const threeRankName = cardRanking.getRankName(threeRank);
        const twoRankName = cardRanking.getRankName(twoRank);
        const descriptions = [
            `Full House: Three ${threeRankName}s, Two ${twoRankName}s`
        ];
        return new BonusDetail(this.ruleName, baseBonus, 0, descriptions, calculation, this.priority, hand);
    }
    createExampleHand(handSize, cardRanking, _trumpCard, coloured = true) {
        if (handSize < 5) {
            return [];
        }
        const hand = [];
        const availableSuits = cardRanking.getAllSuits();
        const threeRank = cardRanking.getRandomRank();
        let twoRank;
        do {
            twoRank = cardRanking.getRandomRank();
        } while (twoRank === threeRank);
        for (let i = 0; i < 3; i++) {
            const suit = availableSuits[i % availableSuits.length];
            const symbol = cardRanking.getCardSymbol(suit, threeRank, coloured);
            hand.push(symbol);
        }
        for (let i = 0; i < 2 && hand.length < handSize; i++) {
            const suit = availableSuits[(i + 3) % availableSuits.length];
            const symbol = cardRanking.getCardSymbol(suit, twoRank, coloured);
            hand.push(symbol);
        }
        while (hand.length < handSize) {
            const suit = cardRanking.getRandomSuit();
            let rank;
            do {
                rank = cardRanking.getRandomRank();
            } while (rank === threeRank || rank === twoRank);
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
], FullHouse.prototype, "minNumberOfCard", void 0);
__decorate([
    serializable({ label: 'Default Bonus Value' }),
    __metadata("design:type", Number)
], FullHouse.prototype, "bonusValue", void 0);
__decorate([
    serializable({ label: 'Pattern Type' }),
    __metadata("design:type", String)
], FullHouse.prototype, "patternType", void 0);
__decorate([
    serializable({ label: 'Rule Name' }),
    __metadata("design:type", String)
], FullHouse.prototype, "ruleName", void 0);
__decorate([
    serializable({ label: 'Priority' }),
    __metadata("design:type", Number)
], FullHouse.prototype, "priority", void 0);
FullHouse = __decorate([
    serializableClass({
        assetType: 'FullHouse',
        displayName: 'Full House',
        icon: '🏠',
        category: AssetTypeCategory.Game,
    })
], FullHouse);
export { FullHouse };
