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
let TrumpOfAKind = class TrumpOfAKind extends BaseBonusRule {
    minNumberOfCard = 3;
    bonusValue = 160;
    patternType = 'trump_of_kind';
    ruleName = 'TrumpOfAKind';
    priority = 99;
    async initialize(gameMode) {
        if (!(gameMode instanceof CardGameMode)) {
            return false;
        }
        this.gameMode = gameMode;
        this.description = 'Sets involving trump cards.';
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
        if (!this.gameMode?.useTrump || !trumpCard) {
            return null;
        }
        if (!hand.some(c => c.id === trumpCard.id)) {
            return null;
        }
        const rankCounts = HandUtility.getRankCounts(hand);
        const trumpCount = hand.filter(c => c.id === trumpCard.id).length;
        let bestRank = null;
        let bestCount = 0;
        for (const [value, count] of Object.entries(rankCounts)) {
            const numValue = Number(value);
            if (numValue === trumpCard.value)
                continue;
            const effectiveCount = count + trumpCount;
            if (effectiveCount >= 2 && effectiveCount > bestCount) {
                bestCount = effectiveCount;
                bestRank = numValue;
            }
        }
        if (!bestRank || bestCount < 2) {
            return null;
        }
        const baseBonus = this.bonusValue * (bestRank + trumpCard.value) * bestCount;
        const calculation = `${this.bonusValue} * (${bestRank} + ${trumpCard.value}) * ${bestCount}`;
        let additionalBonus = 0;
        const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
        if (!cardRanking) {
            return null;
        }
        const rankName = cardRanking.getRankName(bestRank);
        const descriptions = [
            `Trump of a Kind: ${bestCount} ${rankName}s (with Trump)`
        ];
        const trumpBonus = this.gameMode.trumpBonusValues?.trumpCardBonus ?? 0;
        additionalBonus += trumpBonus;
        descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
        const updatedCalculation = `${calculation} + ${trumpBonus}`;
        const matchedCards = hand.filter(c => c.value === bestRank || c.id === trumpCard.id);
        return new BonusDetail(this.ruleName, baseBonus, additionalBonus, descriptions, updatedCalculation, this.priority, matchedCards);
    }
    createExampleHand(handSize, cardRanking, trumpCard, coloured = true) {
        if (handSize < 3) {
            return [];
        }
        const hand = [];
        const availableSuits = cardRanking.getAllSuits();
        const rank = cardRanking.getRandomRank();
        for (let i = 0; i < 2 && i < handSize - 1; i++) {
            const suit = availableSuits[i % availableSuits.length];
            const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
            hand.push(symbol);
        }
        if (trumpCard) {
            const trumpSymbol = cardRanking.getCardSymbol(trumpCard.suit, trumpCard.value, coloured);
            hand.push(trumpSymbol);
        }
        while (hand.length < handSize) {
            const suit = cardRanking.getRandomSuit();
            let otherRank;
            do {
                otherRank = cardRanking.getRandomRank();
            } while (otherRank === rank);
            const symbol = cardRanking.getCardSymbol(suit, otherRank, coloured);
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
], TrumpOfAKind.prototype, "minNumberOfCard", void 0);
__decorate([
    serializable({ label: 'Default Bonus Value' }),
    __metadata("design:type", Number)
], TrumpOfAKind.prototype, "bonusValue", void 0);
__decorate([
    serializable({ label: 'Pattern Type' }),
    __metadata("design:type", String)
], TrumpOfAKind.prototype, "patternType", void 0);
__decorate([
    serializable({ label: 'Rule Name' }),
    __metadata("design:type", String)
], TrumpOfAKind.prototype, "ruleName", void 0);
__decorate([
    serializable({ label: 'Priority' }),
    __metadata("design:type", Number)
], TrumpOfAKind.prototype, "priority", void 0);
TrumpOfAKind = __decorate([
    serializableClass({
        assetType: 'TrumpOfAKind',
        displayName: 'Trump Of A Kind',
        icon: '🃏',
        category: AssetTypeCategory.Game,
    })
], TrumpOfAKind);
export { TrumpOfAKind };
