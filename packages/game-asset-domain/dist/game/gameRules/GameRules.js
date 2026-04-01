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
let GameRules = class GameRules extends ScriptableObject {
    static requiresInspector = true;
    static createTemplate() {
        return {
            LLM: '',
            Player: '',
            objective: '',
            gameplay: '',
            keyRules: [],
        };
    }
    LLM = '';
    Player = '';
    objective = '';
    gameplay = '';
    keyRules = [];
    moveValidityConditions = null;
    exampleHands = [];
    bonusRules = '';
    static async create(context) {
        const deferred = new OperationDeferred();
        const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
        let guid;
        if (!publishResult.isSuccess) {
            guid = createAssetGuid();
            const log = MainAppLogger.instance;
            log.logWarn('[GameRules] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                assetType: 'GameRules',
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
                log.logWarn('[GameRules] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                    assetType: 'GameRules',
                    gameId: context.gameId,
                    fallbackGuid: guid,
                });
            }
        }
        const assetId = `${context.gameId}-rules`;
        const data = {
            LLM: `Rules for ${context.displayName}.`,
            Player: `Rules for ${context.displayName}.`,
        };
        return {
            assetId,
            fileName: `${context.gameId}Rules.asset`,
            guid,
            data,
        };
    }
};
__decorate([
    serializable({ label: 'LLM Rules' }),
    __metadata("design:type", String)
], GameRules.prototype, "LLM", void 0);
__decorate([
    serializable({ label: 'Player Rules' }),
    __metadata("design:type", String)
], GameRules.prototype, "Player", void 0);
__decorate([
    serializable({ label: 'Objective', group: 'Rules Section' }),
    __metadata("design:type", String)
], GameRules.prototype, "objective", void 0);
__decorate([
    serializable({ label: 'Gameplay', group: 'Rules Section' }),
    __metadata("design:type", String)
], GameRules.prototype, "gameplay", void 0);
__decorate([
    serializable({ label: 'Key Rules', group: 'Rules Section', elementType: String }),
    __metadata("design:type", Array)
], GameRules.prototype, "keyRules", void 0);
__decorate([
    serializable({ label: 'Move Validity Conditions' }),
    __metadata("design:type", Object)
], GameRules.prototype, "moveValidityConditions", void 0);
__decorate([
    serializable({ label: 'Example Hands' }),
    __metadata("design:type", Array)
], GameRules.prototype, "exampleHands", void 0);
__decorate([
    serializable({ label: 'Bonus Rules' }),
    __metadata("design:type", String)
], GameRules.prototype, "bonusRules", void 0);
GameRules = __decorate([
    serializableClass({
        assetType: 'GameRules',
        displayName: 'Game Rules',
        icon: '📜',
        category: AssetTypeCategory.Game,
    })
], GameRules);
export { GameRules };
