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
import { Scoring } from '../../game/scoring/Scoring.js';
import { CardRanking } from '../../card/cardRanking/CardRanking.js';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { ContentBlockType } from '../../constants/content-block-type.js';
import { ListStyleType } from '../../constants/list-style-type.js';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '../../AssetCreation.js';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
export const ScoringType = {
    PokerRanking: 'poker_ranking',
    HoardersMultiplier: 'hoarders_multiplier',
    Custom: 'custom'
};
let CardGameScoring = class CardGameScoring extends Scoring {
    static assetType = 'CardGameScoring';
    static displayName = 'Card Game Scoring';
    static icon = '🎯';
    static requiresInspector = true;
    scoringType = ScoringType.PokerRanking;
    patternMultipliers = null;
    priorityOrder = [];
    winCondition = '';
    cardValues = {};
    penalties = '';
    targetScore = null;
    scoringDirection = null;
    synthesizeUIContent(_ctx) {
        void _ctx;
        const blocks = [];
        blocks.push({
            type: ContentBlockType.Heading,
            level: 3,
            text: 'Scoring System'
        });
        // Scoring type explanation
        const scoringDescriptions = {
            [ScoringType.HoardersMultiplier]: "Hoarder's Multiplier: (Sum of card values) × (Number of cards)",
            [ScoringType.PokerRanking]: 'Poker Ranking: Standard poker hand rankings apply',
            [ScoringType.Custom]: 'Custom scoring rules apply'
        };
        const desc = this.description || scoringDescriptions[this.scoringType] || 'Standard scoring applies.';
        blocks.push({ type: ContentBlockType.Paragraph, text: desc });
        if (this.winCondition) {
            blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Win Condition' });
            blocks.push({ type: ContentBlockType.Paragraph, text: this.winCondition });
        }
        if (this.cardValues && Object.keys(this.cardValues).length > 0) {
            blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Card Values' });
            const items = Object.entries(this.cardValues).map(([card, value]) => ({ text: `${card}: ${value}` }));
            blocks.push({ type: ContentBlockType.List, style: ListStyleType.Unordered, items });
        }
        if (this.penalties) {
            blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Penalties' });
            blocks.push({ type: ContentBlockType.Paragraph, text: this.penalties });
        }
        // Pattern multipliers table
        if (this.patternMultipliers && Object.keys(this.patternMultipliers).length > 0) {
            blocks.push({
                type: ContentBlockType.Heading,
                level: 4,
                text: 'Pattern Multipliers'
            });
            const items = Object.entries(this.patternMultipliers)
                .sort(([, a], [, b]) => b - a) // Sort by multiplier descending
                .map(([pattern, multiplier]) => ({
                text: `${pattern}: ${multiplier}×`
            }));
            blocks.push({
                type: ContentBlockType.List,
                style: ListStyleType.Unordered,
                items
            });
        }
        return blocks;
    }
    async getCardRanking() {
        if (!this.cardRankingAsset)
            return null;
        let guid;
        if (typeof this.cardRankingAsset === 'string') {
            guid = this.cardRankingAsset;
        }
        else if (this.cardRankingAsset.assetRef) {
            guid = this.cardRankingAsset.guid;
        }
        else {
            return null;
        }
        const assetGUID = AssetGUID.from(guid);
        return await ScriptableObject.loadByGuid(CardRanking, assetGUID);
    }
    getMultiplier(patternType) {
        return this.patternMultipliers?.[patternType] ?? 0;
    }
    getHighestPriorityPattern(patterns) {
        if (!this.priorityOrder)
            return null;
        for (const priority of this.priorityOrder) {
            if (patterns.includes(priority))
                return priority;
        }
        return patterns[0] ?? null;
    }
    static async create(context) {
        const deferred = new OperationDeferred();
        const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
        let guid;
        if (!publishResult.isSuccess) {
            guid = createAssetGuid();
            MainAppLogger.instance.logWarn('[CardGameScoring] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                assetType: 'CardGameScoring',
                gameId: context.gameId,
                fallbackGuid: guid,
            });
        }
        else {
            const result = await deferred.promise;
            const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
            guid = (isAssetGUID(guidString) ? guidString : guidString);
            if (!result.isSuccess || !result.value) {
                MainAppLogger.instance.logWarn('[CardGameScoring] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                    assetType: 'CardGameScoring',
                    gameId: context.gameId,
                    fallbackGuid: guid,
                });
            }
        }
        return {
            assetId: `${context.gameId}-scoring`,
            fileName: `${context.gameId}Scoring.asset`,
            guid,
            data: {
                scoringRules: {},
                scoringType: ScoringType.Custom,
                patternMultipliers: null,
                priorityOrder: [],
                winCondition: '',
                cardValues: {},
                penalties: '',
                targetScore: null,
                scoringDirection: null,
            },
        };
    }
};
__decorate([
    serializable({ label: 'Scoring Type' }),
    __metadata("design:type", String)
], CardGameScoring.prototype, "scoringType", void 0);
__decorate([
    serializable({ label: 'Pattern Multipliers' }),
    __metadata("design:type", Object)
], CardGameScoring.prototype, "patternMultipliers", void 0);
__decorate([
    serializable({ label: 'Priority Order' }),
    __metadata("design:type", Array)
], CardGameScoring.prototype, "priorityOrder", void 0);
__decorate([
    serializable({ label: 'Win Condition', group: 'Scoring Section' }),
    __metadata("design:type", String)
], CardGameScoring.prototype, "winCondition", void 0);
__decorate([
    serializable({ label: 'Card Values', group: 'Scoring Section' }),
    __metadata("design:type", Object)
], CardGameScoring.prototype, "cardValues", void 0);
__decorate([
    serializable({ label: 'Penalties', group: 'Scoring Section' }),
    __metadata("design:type", String)
], CardGameScoring.prototype, "penalties", void 0);
__decorate([
    serializable({ label: 'Target Score', group: 'Scoring Section' }),
    __metadata("design:type", Object)
], CardGameScoring.prototype, "targetScore", void 0);
__decorate([
    serializable({ label: 'Scoring Direction', group: 'Scoring Section' }),
    __metadata("design:type", Object)
], CardGameScoring.prototype, "scoringDirection", void 0);
CardGameScoring = __decorate([
    serializableClass({
        assetType: 'CardGameScoring',
        displayName: 'Card Game Scoring',
        icon: '🎯',
        category: AssetTypeCategory.Game,
    })
], CardGameScoring);
export { CardGameScoring };
