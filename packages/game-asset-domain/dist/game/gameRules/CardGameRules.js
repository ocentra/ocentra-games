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
import { GameRules } from '../../game/gameRules/GameRules.js';
import { TrumpBonusValues } from '../../game/gameRules/TrumpBonusValues.js';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetAssetTypeInfoEvent } from '@ocentra/eventing-domain/events/assets/GetAssetTypeInfoEvent';
import { GetAssetTypeByGuidEvent } from '@ocentra/eventing-domain/events/game/GetAssetTypeByGuidEvent';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { isContentSynthesisProvider } from '../../game/gameInfo/GameInfo.js';
import { ContentBlockType } from '../../constants/content-block-type.js';
import { ListStyleType } from '../../constants/list-style-type.js';
import { createAssetGuid } from '../../AssetCreation.js';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
let CardGameRules = class CardGameRules extends GameRules {
    static assetType = 'CardGameRules';
    static displayName = 'Card Game Rules';
    static icon = '🃏';
    static requiresInspector = true;
    bonusRuleGuids;
    useTrump;
    trumpBonusValues;
    loadedBonusRules;
    synthesizeUIContent(_ctx) {
        void _ctx;
        const blocks = [];
        if (this.objective) {
            blocks.push({ type: ContentBlockType.Heading, level: 3, text: 'Objective' });
            blocks.push({ type: ContentBlockType.Paragraph, text: this.objective });
        }
        const gameplayText = this.gameplay || this.Player;
        if (gameplayText) {
            blocks.push({ type: ContentBlockType.Heading, level: 3, text: 'Gameplay Rules' });
            const paragraphs = gameplayText.split('\n\n').filter(p => p.trim());
            for (const paragraph of paragraphs) {
                blocks.push({ type: ContentBlockType.Paragraph, text: paragraph.trim() });
            }
        }
        if (this.keyRules && this.keyRules.length > 0) {
            blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Key Rules' });
            blocks.push({
                type: ContentBlockType.List,
                style: ListStyleType.Unordered,
                items: this.keyRules.map(text => ({ text })),
            });
        }
        return blocks;
    }
    /**
     * Synthesize content from all bonus rules.
     * Called separately to allow page-level organization.
     */
    async synthesizeBonusRulesContent(ctx) {
        const blocks = [];
        const bonusRules = await this.loadBonusRules();
        blocks.push({
            type: ContentBlockType.Heading,
            level: 3,
            text: 'Bonus Patterns'
        });
        for (const rule of bonusRules) {
            if (isContentSynthesisProvider(rule)) {
                const ruleBlocks = rule.synthesizeUIContent(ctx);
                blocks.push({
                    type: ContentBlockType.RuleBlock,
                    title: rule.ruleName,
                    content: ruleBlocks
                });
            }
        }
        return blocks;
    }
    async loadBonusRules() {
        if (this.loadedBonusRules)
            return this.loadedBonusRules;
        this.loadedBonusRules = await Promise.all(this.bonusRuleGuids.map(async (guid) => {
            const getAssetTypeDeferred = new OperationDeferred();
            await EventBus.instance.publishAsync(new GetAssetTypeByGuidEvent(guid, getAssetTypeDeferred));
            const assetTypeResult = await getAssetTypeDeferred.promise;
            if (!assetTypeResult.isSuccess || !assetTypeResult.value) {
                throw new Error(`Failed to get asset type for GUID: ${guid}`);
            }
            const assetType = assetTypeResult.value;
            const getTypeInfoDeferred = new OperationDeferred();
            await EventBus.instance.publishAsync(new GetAssetTypeInfoEvent(assetType, getTypeInfoDeferred));
            const typeInfoResult = await getTypeInfoDeferred.promise;
            if (!typeInfoResult.isSuccess || !typeInfoResult.value || !typeInfoResult.value.constructor) {
                throw new Error(`Failed to get asset type info for type: ${assetType}`);
            }
            const assetGUID = AssetGUID.from(guid);
            const asset = await ScriptableObject.loadByGuid(typeInfoResult.value.constructor, assetGUID);
            if (!asset) {
                throw new Error(`Failed to load bonus rule with GUID: ${guid}`);
            }
            return asset;
        }));
        return this.loadedBonusRules;
    }
    getBonusRule(ruleType) {
        return this.loadedBonusRules?.find(r => r instanceof ruleType) ?? null;
    }
    static async create(context) {
        const deferred = new OperationDeferred();
        const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
        let guid;
        if (!publishResult.isSuccess) {
            guid = createAssetGuid();
            MainAppLogger.instance.logWarn('[CardGameRules] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                assetType: 'CardGameRules',
                gameId: context.gameId,
                fallbackGuid: guid,
            });
        }
        else {
            const result = await deferred.promise;
            const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
            guid = (isAssetGUID(guidString) ? guidString : guidString);
            if (!result.isSuccess || !result.value) {
                MainAppLogger.instance.logWarn('[CardGameRules] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                    assetType: 'CardGameRules',
                    gameId: context.gameId,
                    fallbackGuid: guid,
                });
            }
        }
        return {
            assetId: `${context.gameId}-rules`,
            fileName: `${context.gameId}Rules.asset`,
            guid,
            data: {
                LLM: `Rules summary for ${context.displayName}.`,
                Player: `Learn how to play ${context.displayName}.`,
                objective: `Win the game of ${context.displayName} according to its scoring conditions.`,
                gameplay: `Follow the turn order and legal actions defined for ${context.displayName}.`,
                keyRules: [],
                bonusRuleGuids: [],
                useTrump: false,
                trumpBonusValues: null,
            },
        };
    }
};
__decorate([
    serializable({ label: 'Bonus Rules (GUIDs)' }),
    __metadata("design:type", Array)
], CardGameRules.prototype, "bonusRuleGuids", void 0);
__decorate([
    serializable({ label: 'Use Trump Cards' }),
    __metadata("design:type", Boolean)
], CardGameRules.prototype, "useTrump", void 0);
__decorate([
    serializable({ label: 'Trump Bonus Values' }),
    __metadata("design:type", TrumpBonusValues)
], CardGameRules.prototype, "trumpBonusValues", void 0);
CardGameRules = __decorate([
    serializableClass({
        assetType: 'CardGameRules',
        displayName: 'Card Game Rules',
        icon: '🃏',
        category: AssetTypeCategory.Game,
    })
], CardGameRules);
export { CardGameRules };
