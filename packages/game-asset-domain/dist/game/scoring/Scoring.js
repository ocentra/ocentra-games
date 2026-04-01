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
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '../../AssetCreation.js';
import { ContentBlockType } from '../../constants/content-block-type.js';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import { CardRanking } from '../../card/cardRanking/CardRanking.js';
let Scoring = class Scoring extends ScriptableObject {
    static schemaVersion = 1;
    static requiresInspector = true;
    static createTemplate() {
        return {};
    }
    cardRankingAsset;
    constructor() {
        super();
        this.cardRankingAsset = null;
    }
    awake() {
        super.awake();
        void this.initializeDefaultCardRanking();
    }
    async initializeDefaultCardRanking() {
        if (this.cardRankingAsset) {
            return;
        }
        try {
            const defaultCardRanking = await CardRanking.getDefault();
            if (defaultCardRanking) {
                this.cardRankingAsset = defaultCardRanking.guid.toString();
            }
        }
        catch (error) {
            MainAppLogger.instance.logError('[Scoring] Failed to load default CardRanking', getStackTrace(), error);
        }
    }
    scoringFormula = '';
    scoringRules = null;
    description = '';
    /**
     * Default implementation - generates basic scoring description.
     * CardGameScoring overrides this with detailed multiplier tables.
     */
    synthesizeUIContent(_ctx) {
        void _ctx;
        return [
            {
                type: ContentBlockType.Heading,
                level: 3,
                text: 'Scoring System'
            },
            {
                type: ContentBlockType.Paragraph,
                text: this.description || 'Standard scoring rules apply.'
            }
        ];
    }
    static async create(context) {
        const deferred = new OperationDeferred();
        const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
        let guid;
        if (!publishResult.isSuccess) {
            guid = createAssetGuid();
            const log = MainAppLogger.instance;
            log.logWarn('[Scoring] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                assetType: 'Scoring',
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
                log.logWarn('[Scoring] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                    assetType: 'Scoring',
                    gameId: context.gameId,
                    fallbackGuid: guid,
                });
            }
        }
        const assetId = `${context.gameId}-scoring`;
        const data = {
            scoringRules: {},
        };
        return {
            assetId,
            fileName: `${context.gameId}Scoring.asset`,
            guid,
            data,
        };
    }
};
__decorate([
    required('Card Ranking Asset is required for scoring to function'),
    serializable({ label: 'Card Ranking Asset' }),
    __metadata("design:type", Object)
], Scoring.prototype, "cardRankingAsset", void 0);
__decorate([
    serializable({ label: 'Scoring Formula' }),
    __metadata("design:type", String)
], Scoring.prototype, "scoringFormula", void 0);
__decorate([
    serializable({ label: 'Scoring Rules' }),
    __metadata("design:type", Object)
], Scoring.prototype, "scoringRules", void 0);
__decorate([
    serializable({ label: 'Description' }),
    __metadata("design:type", String)
], Scoring.prototype, "description", void 0);
Scoring = __decorate([
    serializableClass({
        schemaVersion: 1,
        assetType: 'Scoring',
        displayName: 'Scoring',
        icon: '🎯',
        category: AssetTypeCategory.Game,
    }),
    __metadata("design:paramtypes", [])
], Scoring);
export { Scoring };
