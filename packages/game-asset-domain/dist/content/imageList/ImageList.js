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
let ImageList = class ImageList extends ScriptableObject {
    static schemaVersion = 1;
    static requiresInspector = true;
    static createTemplate() {
        return {
            images: [],
        };
    }
    images;
};
__decorate([
    serializable({ label: 'Images' }),
    __metadata("design:type", Array)
], ImageList.prototype, "images", void 0);
ImageList = __decorate([
    serializableClass({
        schemaVersion: 1,
        assetType: 'ImageList',
        displayName: 'Image List',
        icon: '🖼️',
        category: AssetTypeCategory.Content,
    })
], ImageList);
export { ImageList };
