var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
export const AssetStatus = {
    Published: 'Published', // Live and ready for production use
    Draft: 'Draft', // Work in progress, not ready
    ComingSoon: 'ComingSoon', // Announced but not yet available
    Archived: 'Archived', // Deprecated/removed, hidden from public
};
export const AssetTypeCategory = {
    GameMode: 'GameMode',
    Image: 'Image',
    Card: 'Card',
    Layout: 'Layout',
    Page: 'Page',
    UI: 'UI',
    AI: 'AI',
    Rules: 'Rules',
    Content: 'Content',
    Other: 'Other',
};
export const AssetTag = {
    // Page-related
    PageAsset: 'page-asset',
    GamePageAsset: 'game-page-asset',
    HomePageAsset: 'home-page-asset',
    // Game-related
    GameModeAsset: 'game-mode-asset',
    GameRulesAsset: 'game-rules-asset',
    GameDescriptionAsset: 'game-description-asset',
    GameLayoutAsset: 'game-layout-asset',
    // Content-related
    ContentAsset: 'content-asset',
    ImageAsset: 'image-asset',
    CardAsset: 'card-asset',
    // UI-related
    UIComponentAsset: 'ui-component-asset',
    ButtonAsset: 'button-asset',
    // AI-related
    AIModelAsset: 'ai-model-asset',
    AIStrategyAsset: 'ai-strategy-asset',
};
let BaseAssetMetadataClass = class BaseAssetMetadataClass {
    typeCategory = null;
    tags = [];
    status = null;
    createdAt = '';
    updatedAt = '';
    guid = '';
};
__decorate([
    serializable({ label: 'Type Category' }),
    __metadata("design:type", Object)
], BaseAssetMetadataClass.prototype, "typeCategory", void 0);
__decorate([
    serializable({ label: 'Tags' }),
    __metadata("design:type", Array)
], BaseAssetMetadataClass.prototype, "tags", void 0);
__decorate([
    serializable({ label: 'Status' }),
    __metadata("design:type", Object)
], BaseAssetMetadataClass.prototype, "status", void 0);
__decorate([
    serializable({ label: 'Created At' }),
    __metadata("design:type", String)
], BaseAssetMetadataClass.prototype, "createdAt", void 0);
__decorate([
    serializable({ label: 'Updated At' }),
    __metadata("design:type", String)
], BaseAssetMetadataClass.prototype, "updatedAt", void 0);
__decorate([
    serializable({ label: 'GUID' }),
    __metadata("design:type", String)
], BaseAssetMetadataClass.prototype, "guid", void 0);
BaseAssetMetadataClass = __decorate([
    serializableClass({
        assetType: 'BaseAssetMetadata',
        displayName: 'Base Asset Metadata',
    })
], BaseAssetMetadataClass);
export { BaseAssetMetadataClass };
