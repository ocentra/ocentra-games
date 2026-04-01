var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ComingSoon_1;
import 'reflect-metadata';
import { serializableClass, serializable } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableSingleton } from '@ocentra/asset-domain/ScriptableSingleton';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
const log = MainAppLogger.instance;
log.register(import.meta.url);
const LOG_COMING_SOON_VERBOSE = false;
const logInfo = (message, data, enabled) => {
    if (enabled ?? LOG_COMING_SOON_VERBOSE) {
        log.logInfo(message, getStackTrace(), data);
    }
};
const logError = (message, data, enabled) => {
    if (enabled ?? LOG_COMING_SOON_VERBOSE) {
        log.logError(message, getStackTrace(), data);
    }
};
let ComingSoon = class ComingSoon extends ScriptableSingleton {
    static { ComingSoon_1 = this; }
    static schemaVersion = 1;
    static executionOrder = -40;
    static requiresInspector = true;
    static createTemplate() {
        return {
            images: [],
        };
    }
    static {
        ComingSoon_1.registerSingleton(ComingSoon_1);
    }
    images;
    static async getOrCreateInstance() {
        return ComingSoon_1.getOrCreateSingletonInstance(async () => {
            logInfo('Loading ComingSoon singleton...', undefined, LOG_COMING_SOON_VERBOSE);
            try {
                const loaded = await ScriptableSingleton.FirstOrDefault(ComingSoon_1);
                if (loaded) {
                    logInfo('ComingSoon loaded from asset', {
                        hasImages: !!loaded.images,
                        imagesType: typeof loaded.images,
                        isArray: Array.isArray(loaded.images),
                        imageCount: loaded.images?.length || 0,
                        images: loaded.images,
                    }, LOG_COMING_SOON_VERBOSE);
                    return loaded;
                }
            }
            catch (error) {
                logError('[ComingSoon] Failed to load existing instance', { data: error });
            }
            logInfo('Creating in-memory ComingSoon instance (not saved to disk)', undefined, LOG_COMING_SOON_VERBOSE);
            const instance = new ComingSoon_1();
            instance.images = [];
            return instance;
        });
    }
};
__decorate([
    serializable({
        label: 'Coming Soon Images',
        group: 'Display',
    }),
    __metadata("design:type", Array)
], ComingSoon.prototype, "images", void 0);
ComingSoon = ComingSoon_1 = __decorate([
    serializableClass({
        schemaVersion: 1,
        assetType: 'ComingSoon',
        displayName: 'Coming Soon',
        icon: '🎮',
        category: AssetTypeCategory.UI,
    })
], ComingSoon);
export { ComingSoon };
