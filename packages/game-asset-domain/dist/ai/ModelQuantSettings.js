var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ModelQuantSettings_1;
import 'reflect-metadata';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { DEFAULT_INFERENCE_SETTINGS } from '@ocentra/ai-domain/types/inference-settings';
import { AssetSchemaVersion, AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
let ModelQuantSettings = class ModelQuantSettings extends ScriptableObject {
    static { ModelQuantSettings_1 = this; }
    static schemaVersion = AssetSchemaVersion.V1;
    static requiresInspector = true;
    static createTemplate() {
        return {};
    }
    modelId = '';
    quantPath = '';
    displayName = '';
    description = '';
    settings = { ...DEFAULT_INFERENCE_SETTINGS };
    static generateModelQuantAssetId(modelId, quantPath) {
        const sanitizedModelId = modelId.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '_');
        const sanitizedQuant = quantPath
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .replace(/\.onnx$/, '')
            .replace(/^onnx_/, '');
        return `${sanitizedModelId}_${sanitizedQuant}`;
    }
    static create(modelId, quantPath) {
        const asset = new ModelQuantSettings_1();
        asset.modelId = modelId;
        asset.quantPath = quantPath;
        asset.displayName = `${modelId.split('/').pop()} (${quantPath.split('/').pop()?.replace('.onnx', '')})`;
        asset.settings = { ...DEFAULT_INFERENCE_SETTINGS };
        return asset;
    }
};
__decorate([
    serializable({ label: 'Model ID' }),
    __metadata("design:type", String)
], ModelQuantSettings.prototype, "modelId", void 0);
__decorate([
    serializable({ label: 'Quant Path' }),
    __metadata("design:type", String)
], ModelQuantSettings.prototype, "quantPath", void 0);
__decorate([
    serializable({ label: 'Display Name' }),
    __metadata("design:type", String)
], ModelQuantSettings.prototype, "displayName", void 0);
__decorate([
    serializable({ label: 'Description' }),
    __metadata("design:type", String)
], ModelQuantSettings.prototype, "description", void 0);
__decorate([
    serializable({ label: 'Settings' }),
    __metadata("design:type", Object)
], ModelQuantSettings.prototype, "settings", void 0);
ModelQuantSettings = ModelQuantSettings_1 = __decorate([
    serializableClass({
        schemaVersion: AssetSchemaVersion.V1,
        assetType: 'ModelQuantSettings',
        displayName: 'Model Quant Settings',
        icon: '⚙️',
        category: AssetTypeCategory.AI,
    })
], ModelQuantSettings);
export { ModelQuantSettings };
