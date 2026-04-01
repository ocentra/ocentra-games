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
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '../../AssetCreation.js';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import { ContentBlockType } from '../../constants/content-block-type.js';
let Strategy = class Strategy extends ScriptableObject {
    static requiresInspector = true;
    static createTemplate() {
        return {
            aggressiveness: 0.5,
            riskTolerance: 0.5,
            bluffFrequency: 0.2,
            bluffSettings: {},
            basic: '',
            intermediate: '',
            advanced: '',
        };
    }
    LLM = '';
    Player = '';
    basic = '';
    intermediate = '';
    advanced = '';
    tips = [];
    aggressiveness = 0.5;
    riskTolerance = 0.5;
    bluffFrequency = 0.2;
    bluffSettings = {};
    synthesizeUIContent(_ctx) {
        void _ctx;
        const blocks = [];
        blocks.push({ type: ContentBlockType.Heading, level: 3, text: 'Strategy Guide' });
        if (this.basic) {
            blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Basic' });
            const paragraphs = this.basic.split('\n\n').filter((p) => p.trim());
            for (const paragraph of paragraphs) {
                blocks.push({ type: ContentBlockType.Paragraph, text: paragraph.trim() });
            }
        }
        if (this.intermediate) {
            blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Intermediate' });
            const paragraphs = this.intermediate.split('\n\n').filter((p) => p.trim());
            for (const paragraph of paragraphs) {
                blocks.push({ type: ContentBlockType.Paragraph, text: paragraph.trim() });
            }
        }
        if (this.advanced) {
            blocks.push({ type: ContentBlockType.Heading, level: 4, text: 'Advanced' });
            const paragraphs = this.advanced.split('\n\n').filter((p) => p.trim());
            for (const paragraph of paragraphs) {
                blocks.push({ type: ContentBlockType.Paragraph, text: paragraph.trim() });
            }
        }
        if (this.Player && !this.basic && !this.intermediate && !this.advanced) {
            const paragraphs = this.Player.split('\n\n').filter((p) => p.trim());
            for (const paragraph of paragraphs) {
                blocks.push({ type: ContentBlockType.Paragraph, text: paragraph.trim() });
            }
        }
        // Strategy tips as blocks
        for (const tip of this.tips) {
            blocks.push({
                type: ContentBlockType.StrategyBlock,
                title: tip.title,
                icon: tip.icon,
                description: tip.description,
                example: tip.example ? {
                    type: ContentBlockType.Example,
                    text: tip.example
                } : undefined
            });
        }
        return blocks;
    }
    static async create(context) {
        const deferred = new OperationDeferred();
        const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
        let guid;
        if (!publishResult.isSuccess) {
            guid = createAssetGuid();
            const log = MainAppLogger.instance;
            log.logWarn('[Strategy] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                assetType: 'Strategy',
                gameId: context.gameId,
                fallbackGuid: guid,
            });
        }
        else {
            const result = await deferred.promise;
            const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
            guid = (isAssetGUID(guidString) ? guidString : guidString);
            if (!result.isSuccess || !result.value) {
                const log = MainAppLogger.instance;
                log.logWarn('[Strategy] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                    assetType: 'Strategy',
                    gameId: context.gameId,
                    fallbackGuid: guid,
                });
            }
        }
        const assetId = `${context.gameId}-strategy`;
        const data = {
            LLM: `Strategy tips for ${context.displayName}.`,
            Player: `Strategy tips for ${context.displayName}.`,
            aggressiveness: 0.5,
            riskTolerance: 0.5,
            bluffFrequency: 0.3,
            bluffSettings: {
                profile: 'balanced',
            },
        };
        return {
            assetId,
            fileName: `${context.gameId}Strategy.asset`,
            guid,
            data,
        };
    }
};
__decorate([
    serializable({ label: 'LLM Strategy Tips' }),
    __metadata("design:type", String)
], Strategy.prototype, "LLM", void 0);
__decorate([
    serializable({ label: 'Player Strategy Tips' }),
    __metadata("design:type", String)
], Strategy.prototype, "Player", void 0);
__decorate([
    serializable({ label: 'Basic', group: 'Strategy Section' }),
    __metadata("design:type", String)
], Strategy.prototype, "basic", void 0);
__decorate([
    serializable({ label: 'Intermediate', group: 'Strategy Section' }),
    __metadata("design:type", String)
], Strategy.prototype, "intermediate", void 0);
__decorate([
    serializable({ label: 'Advanced', group: 'Strategy Section' }),
    __metadata("design:type", String)
], Strategy.prototype, "advanced", void 0);
__decorate([
    serializable({ label: 'Tips', elementType: Object }),
    __metadata("design:type", Array)
], Strategy.prototype, "tips", void 0);
__decorate([
    serializable({ label: 'Aggressiveness' }),
    __metadata("design:type", Number)
], Strategy.prototype, "aggressiveness", void 0);
__decorate([
    serializable({ label: 'Risk Tolerance' }),
    __metadata("design:type", Number)
], Strategy.prototype, "riskTolerance", void 0);
__decorate([
    serializable({ label: 'Bluff Frequency' }),
    __metadata("design:type", Number)
], Strategy.prototype, "bluffFrequency", void 0);
__decorate([
    serializable({ label: 'Bluff Settings' }),
    __metadata("design:type", Object)
], Strategy.prototype, "bluffSettings", void 0);
Strategy = __decorate([
    serializableClass({
        assetType: 'Strategy',
        displayName: 'Strategy',
        icon: '💡',
        category: AssetTypeCategory.Game,
    })
], Strategy);
export { Strategy };
