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
import { AssetSchemaVersion, AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
const log = MainAppLogger.instance;
log.register(import.meta.url);
let AIModelList = class AIModelList extends ScriptableObject {
    static schemaVersion = AssetSchemaVersion.V1;
    static requiresInspector = true;
    static createTemplate() {
        return {
            models: [],
        };
    }
    name = '';
    description = '';
    models = [];
    defaultModelId = '';
    defaultQuantPath = '';
};
__decorate([
    serializable({ label: 'List Name' }),
    __metadata("design:type", String)
], AIModelList.prototype, "name", void 0);
__decorate([
    serializable({ label: 'Description' }),
    __metadata("design:type", String)
], AIModelList.prototype, "description", void 0);
__decorate([
    serializable({ label: 'Models' }),
    __metadata("design:type", Array)
], AIModelList.prototype, "models", void 0);
__decorate([
    serializable({ label: 'Default Model ID' }),
    __metadata("design:type", String)
], AIModelList.prototype, "defaultModelId", void 0);
__decorate([
    serializable({ label: 'Default Quant Path' }),
    __metadata("design:type", String)
], AIModelList.prototype, "defaultQuantPath", void 0);
AIModelList = __decorate([
    serializableClass({
        schemaVersion: AssetSchemaVersion.V1,
        assetType: 'AIModelList',
        displayName: 'AI Model List',
        icon: '🤖',
        category: AssetTypeCategory.AI,
    })
], AIModelList);
export { AIModelList };
