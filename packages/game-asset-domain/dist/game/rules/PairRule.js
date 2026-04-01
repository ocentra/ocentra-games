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
let PairRule = class PairRule extends BaseBonusRule {
    minNumberOfCard = 3;
    bonusValue = 100;
    patternType = 'pair';
    ruleName = 'PairRule';
    priority = 87;
    async initialize(gameMode) {
        if (!(gameMode instanceof CardGameMode)) {
            return false;
        }
        this.gameMode = gameMode;
        this.description = 'Exactly one pair of cards with the same rank (2 to A), valid only for hands of 3 to 9 cards, when no trump card is present, no other pairs or higher combinations exist, and the hand is not a potential sequence.';
        const cardRanking = await gameMode.getCardRanking();
        if (!cardRanking)
            return false;
        const playerExamples = [];
        const llmExamples = [];
        const handSize = gameMode.initialNumberOfCards || 3;
        const exampleHand = this.createExampleHand(handSize, cardRanking, undefined, false);
        if (exampleHand.length > 0) {
            const exampleString = exampleHand.join(', ');
            const llmExample = `${this.ruleName}: ${exampleString} - Bonus: ${this.bonusValue}`;
            const playerExample = `${this.description}\n${this.ruleName} Bonus: ${this.bonusValue}\nExample: ${exampleString}`;
            llmExamples.push(llmExample);
            playerExamples.push(playerExample);
        }
        this.examples = {
            LLM: llmExamples.join('\n'),
            Player: playerExamples.join('\n\n'),
        };
        return true;
    }
    async evaluate(hand, trumpCard) {
        if (hand.length < this.minNumberOfCard) {
            return null;
        }
        if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
            return null;
        }
        const pairRanks = HandUtility.findPairs(hand, trumpCard, this.gameMode?.useTrump);
        if (pairRanks.length !== 1) {
            return null;
        }
        if (HandUtility.isSequence(hand)) {
            return null;
        }
        const pairRank = pairRanks[0];
        const baseBonus = this.bonusValue * pairRank * 2;
        const calculation = `${this.bonusValue} * (${pairRank} * 2)`;
        let additionalBonus = 0;
        const cardRanking = this.gameMode ? await this.gameMode.getCardRanking() : null;
        if (!cardRanking) {
            return null;
        }
        const rankName = cardRanking.getRankName(pairRank);
        const descriptions = [`Pair of ${rankName}s`];
        if (this.gameMode?.useTrump && trumpCard && hand.some(c => c.id === trumpCard.id)) {
            const trumpBonus = this.gameMode.trumpBonusValues?.pairBonus ?? 0;
            additionalBonus += trumpBonus;
            descriptions.push(`Trump Card Bonus: +${trumpBonus}`);
        }
        const matchedCards = hand.filter(c => c.value === pairRank);
        return new BonusDetail(this.ruleName, baseBonus, additionalBonus, descriptions, calculation, this.priority, matchedCards);
    }
    createExampleHand(handSize, cardRanking, _trumpCard, coloured = true) {
        if (handSize < 3 || handSize > 9) {
            return [];
        }
        const hand = [];
        const availableSuits = cardRanking.getAllSuits();
        const usedCombinations = new Set();
        const pairRank = cardRanking.getRandomRank();
        for (let i = 0; i < 2; i++) {
            const suit = availableSuits[i % availableSuits.length];
            const symbol = cardRanking.getCardSymbol(suit, pairRank, coloured);
            hand.push(symbol);
            usedCombinations.add(`${suit}_${pairRank}`);
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
            } while (usedCombinations.has(`${suit}_${rank}`) || rank === pairRank);
            if (attempts > 100)
                break;
            const symbol = cardRanking.getCardSymbol(suit, rank, coloured);
            hand.push(symbol);
            usedCombinations.add(`${suit}_${rank}`);
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
], PairRule.prototype, "minNumberOfCard", void 0);
__decorate([
    serializable({ label: 'Default Bonus Value' }),
    __metadata("design:type", Number)
], PairRule.prototype, "bonusValue", void 0);
__decorate([
    serializable({ label: 'Pattern Type' }),
    __metadata("design:type", String)
], PairRule.prototype, "patternType", void 0);
__decorate([
    serializable({ label: 'Rule Name' }),
    __metadata("design:type", String)
], PairRule.prototype, "ruleName", void 0);
__decorate([
    serializable({ label: 'Priority' }),
    __metadata("design:type", Number)
], PairRule.prototype, "priority", void 0);
PairRule = __decorate([
    serializableClass({
        assetType: 'PairRule',
        displayName: 'Pair Rule',
        icon: '👥',
        category: AssetTypeCategory.Game,
    })
], PairRule);
export { PairRule };
