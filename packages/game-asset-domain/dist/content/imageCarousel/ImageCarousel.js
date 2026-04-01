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
let ImageCarousel = class ImageCarousel extends ScriptableObject {
    static schemaVersion = 1;
    static requiresInspector = true;
    static createTemplate() {
        return {
            slides: [],
            autoplayIntervalMs: 5000,
            lastImageDurationMs: 6000,
            fastRotationDurationMs: 2000,
            defaultRotationDurationMs: 3000,
            fastRotationThreshold: 4,
            slideTransitionDelayMs: 500,
        };
    }
    slides;
    autoplayIntervalMs;
    lastImageDurationMs;
    fastRotationDurationMs;
    defaultRotationDurationMs;
    fastRotationThreshold;
    slideTransitionDelayMs;
    static async create(context) {
        const deferred = new OperationDeferred();
        const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
        let guid;
        if (!publishResult.isSuccess) {
            guid = createAssetGuid();
            const log = MainAppLogger.instance;
            log.logWarn('[ImageCarousel] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                assetType: 'ImageCarousel',
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
                log.logWarn('[ImageCarousel] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                    assetType: 'ImageCarousel',
                    gameId: context.gameId,
                    fallbackGuid: guid,
                });
            }
        }
        const assetId = `${context.gameId}-carousel`;
        const data = {
            ...this.createTemplate(),
        };
        return {
            assetId,
            fileName: `${context.gameId}Carousel.asset`,
            guid,
            data,
        };
    }
};
__decorate([
    serializable({ label: 'Slides' }),
    __metadata("design:type", Array)
], ImageCarousel.prototype, "slides", void 0);
__decorate([
    serializable({ label: 'Autoplay Interval (ms)' }),
    __metadata("design:type", Number)
], ImageCarousel.prototype, "autoplayIntervalMs", void 0);
__decorate([
    serializable({ label: 'Last Image Duration (ms)' }),
    __metadata("design:type", Number)
], ImageCarousel.prototype, "lastImageDurationMs", void 0);
__decorate([
    serializable({ label: 'Fast Rotation Duration (ms)' }),
    __metadata("design:type", Number)
], ImageCarousel.prototype, "fastRotationDurationMs", void 0);
__decorate([
    serializable({ label: 'Default Rotation Duration (ms)' }),
    __metadata("design:type", Number)
], ImageCarousel.prototype, "defaultRotationDurationMs", void 0);
__decorate([
    serializable({ label: 'Fast Rotation Threshold' }),
    __metadata("design:type", Number)
], ImageCarousel.prototype, "fastRotationThreshold", void 0);
__decorate([
    serializable({ label: 'Slide Transition Delay (ms)' }),
    __metadata("design:type", Number)
], ImageCarousel.prototype, "slideTransitionDelayMs", void 0);
ImageCarousel = __decorate([
    serializableClass({
        schemaVersion: 1,
        assetType: 'ImageCarousel',
        displayName: 'Image Carousel',
        icon: '🎞️',
        category: AssetTypeCategory.Content,
    })
], ImageCarousel);
export { ImageCarousel };
