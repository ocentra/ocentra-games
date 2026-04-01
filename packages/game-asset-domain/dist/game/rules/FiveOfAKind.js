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
let FiveOfAKind = class FiveOfAKind extends BaseBonusRule {
    minNumberOfCard = 5;
    bonusValue = 140;
    patternType = 'five_of_kind';
    ruleName = 'FiveOfAKind';
    priority = 94;
    async initialize(gameMode) {
        if (!(gameMode instanceof CardGameMode)) {
            return false;
        }
        this.gameMode = gameMode;
        this.description = 'Five cards of the same rank (requires wildcards or multiple decks).';
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
        if (!HandUtility.isFiveOfAKind(hand, trumpCard, this.gameMode?.useTrump)) {
            return null;
        }
        const fiveRank = HandUtility.getNOfAKindRank(hand, 5, trumpCard, this.gameMode?.useTrump);
        if (!fiveRank) {
            return null;
        }
        const baseBonus = this.bonusValue * fiveRank * 5;
        let additionalBonus = 0;
        const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
        if (!cardRanking) {
            return null;
        }
        const rankName = cardRanking.getRankName(fiveRank);
        const descriptions = [`Five of a Kind: ${rankName}`];
        let calculation = `${this.bonusValue} * (${fiveRank} * 5)`;
        if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
            const trumpBonus = this.gameMode.trumpBonusValues?.fiveOfKindBonus ?? 0;
            additionalBonus += trumpBonus;
            descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
            calculation += ` + ${trumpBonus}`;
        }
        const matchedCards = hand.filter(c => c.value === fiveRank);
        return new BonusDetail(this.ruleName, baseBonus, additionalBonus, descriptions, calculation, this.priority, matchedCards);
    }
    createExampleHand(handSize, cardRanking, _trumpCard, coloured = true) {
        if (handSize < 5) {
            return [];
        }
        const hand = [];
        const availableSuits = cardRanking.getAllSuits();
        const fiveRank = cardRanking.getRandomRank();
        for (let i = 0; i < 5 && i < handSize; i++) {
            const suit = availableSuits[i % availableSuits.length];
            const symbol = cardRanking.getCardSymbol(suit, fiveRank, coloured);
            hand.push(symbol);
        }
        while (hand.length < handSize) {
            const suit = cardRanking.getRandomSuit();
            let rank;
            do {
                rank = cardRanking.getRandomRank();
            } while (rank === fiveRank);
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
], FiveOfAKind.prototype, "minNumberOfCard", void 0);
__decorate([
    serializable({ label: 'Default Bonus Value' }),
    __metadata("design:type", Number)
], FiveOfAKind.prototype, "bonusValue", void 0);
__decorate([
    serializable({ label: 'Pattern Type' }),
    __metadata("design:type", String)
], FiveOfAKind.prototype, "patternType", void 0);
__decorate([
    serializable({ label: 'Rule Name' }),
    __metadata("design:type", String)
], FiveOfAKind.prototype, "ruleName", void 0);
__decorate([
    serializable({ label: 'Priority' }),
    __metadata("design:type", Number)
], FiveOfAKind.prototype, "priority", void 0);
FiveOfAKind = __decorate([
    serializableClass({
        assetType: 'FiveOfAKind',
        displayName: 'Five Of A Kind',
        icon: '⭐',
        category: AssetTypeCategory.Game,
    })
], FiveOfAKind);
export { FiveOfAKind };
