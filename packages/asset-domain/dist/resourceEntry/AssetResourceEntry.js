var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AssetResourceEntry_1;
import 'reflect-metadata';
import { serializable, serializableClass, required } from '../serialization/decorators.js';
import { AssetTypeCategory } from '../constants/assets.js';
import { ResourceEntry } from '../resourceEntry/ResourceEntry.js';
let globalLoader = null;
export function setGlobalAssetLoader(loader) {
    globalLoader = loader;
}
let AssetResourceEntry = AssetResourceEntry_1 = class AssetResourceEntry extends ResourceEntry {
    guid = '';
    assetType;
    constructor(assetType, guid) {
        super();
        if (!assetType || assetType === '' || assetType === 'Unknown') {
            this.assetType = '';
        }
        else {
            this.assetType = assetType;
        }
        if (guid && guid !== '') {
            this.guid = guid;
        }
        else {
            this.guid = '';
        }
    }
    inheritanceChain;
    variant;
    loadedAsset = null;
    loading = false;
    parsedData;
    get assetGuid() {
        if (!this.guid) {
            return null;
        }
        return this.guid;
    }
    setAssetGuid(guid) {
        this.guid = (guid || '');
    }
    get asset() {
        return this.loadedAsset;
    }
    get isLoading() {
        return this.loading;
    }
    async load(constructor, loader) {
        if (this.loadedAsset) {
            return this.loadedAsset;
        }
        if (this.loading) {
            return null;
        }
        if (!this.guid) {
            return null;
        }
        const effectiveLoader = loader || globalLoader;
        if (!effectiveLoader) {
            return null;
        }
        this.loading = true;
        try {
            const asset = await effectiveLoader(constructor, this.guid);
            this.loadedAsset = asset;
            if (asset && !this.guid) {
                this.guid = asset.guid?.toString?.() || this.guid;
            }
            if (asset && (!this.assetType || this.assetType === '')) {
                const Constructor = asset.constructor;
                const assetTypeValue = Constructor?.assetType || Constructor?.name || '';
                if (assetTypeValue) {
                    this.assetType = assetTypeValue;
                }
            }
            if (asset && !this.displayName) {
                const Constructor = asset.constructor;
                const displayNameValue = Constructor?.displayName || '';
                if (displayNameValue) {
                    this.displayName = displayNameValue;
                }
            }
            return asset;
        }
        catch {
            return null;
        }
        finally {
            this.loading = false;
        }
    }
    setAsset(asset) {
        this.loadedAsset = asset;
        if (asset && typeof asset === 'object') {
            const assetObj = asset;
            if (assetObj.guid?.toString) {
                this.guid = assetObj.guid.toString();
            }
            const Constructor = asset.constructor;
            const newAssetType = Constructor?.assetType || Constructor?.name || '';
            if ((!this.assetType || this.assetType === '') && newAssetType && newAssetType !== 'Unknown') {
                this.assetType = newAssetType;
            }
            const displayNameValue = Constructor?.displayName || '';
            if (displayNameValue) {
                this.displayName = displayNameValue;
            }
        }
    }
    static fromGuid(guid, assetType, displayName) {
        const entry = new AssetResourceEntry_1(assetType);
        entry.guid = guid;
        if (displayName) {
            entry.displayName = displayName;
        }
        return entry;
    }
};
__decorate([
    required('Asset GUID is required for AssetResourceEntry'),
    serializable({ label: 'Asset GUID' }),
    __metadata("design:type", String)
], AssetResourceEntry.prototype, "guid", void 0);
__decorate([
    required('Asset Type is required for AssetResourceEntry'),
    serializable({ label: 'Asset Type' }),
    __metadata("design:type", String)
], AssetResourceEntry.prototype, "assetType", void 0);
__decorate([
    serializable({ label: 'Inheritance Chain' }),
    __metadata("design:type", Object)
], AssetResourceEntry.prototype, "inheritanceChain", void 0);
__decorate([
    serializable({ label: 'Variant' }),
    __metadata("design:type", Object)
], AssetResourceEntry.prototype, "variant", void 0);
AssetResourceEntry = AssetResourceEntry_1 = __decorate([
    serializableClass({
        assetType: 'AssetResourceEntry',
        displayName: 'Asset Resource Entry',
        icon: '📄',
        category: AssetTypeCategory.Content,
    }),
    __metadata("design:paramtypes", [String, String])
], AssetResourceEntry);
export { AssetResourceEntry };
