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
import { Layout } from '../../ui/layout/Layout.js';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '../../AssetCreation.js';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
let CardGameLayout = class CardGameLayout extends Layout {
    static schemaVersion = 1;
    static requiresInspector = true;
    static createTemplate() {
        return {
            defaultPlayerCount: 4,
            presets: {},
        };
    }
    defaultPlayerCount = 4;
    presets = {};
    gameplay = {};
    extensions = {};
    static async create(context) {
        const deferred = new OperationDeferred();
        const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
        let guid;
        if (!publishResult.isSuccess) {
            guid = createAssetGuid();
            const log = MainAppLogger.instance;
            log.logWarn('[CardGameLayout] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                assetType: 'CardGameLayout',
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
                log.logWarn('[CardGameLayout] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                    assetType: 'CardGameLayout',
                    gameId: context.gameId,
                    fallbackGuid: guid,
                });
            }
        }
        const assetId = `${context.gameId}-layout`;
        const data = {
            defaultPlayerCount: 4,
            presets: {},
            gameplay: {},
            extensions: {},
        };
        return {
            assetId,
            fileName: `${context.gameId}Layout.asset`,
            guid,
            data,
        };
    }
};
__decorate([
    serializable({ label: 'Default Player Count' }),
    __metadata("design:type", Number)
], CardGameLayout.prototype, "defaultPlayerCount", void 0);
__decorate([
    serializable({ label: 'Layout Presets' }),
    __metadata("design:type", Object)
], CardGameLayout.prototype, "presets", void 0);
__decorate([
    serializable({ label: 'Gameplay' }),
    __metadata("design:type", Object)
], CardGameLayout.prototype, "gameplay", void 0);
__decorate([
    serializable({ label: 'Extensions' }),
    __metadata("design:type", Object)
], CardGameLayout.prototype, "extensions", void 0);
CardGameLayout = __decorate([
    serializableClass({
        schemaVersion: 1,
        assetType: 'CardGameLayout',
        displayName: 'Card Game Layout',
        icon: '🃏',
        category: AssetTypeCategory.UI,
    })
], CardGameLayout);
export { CardGameLayout };
