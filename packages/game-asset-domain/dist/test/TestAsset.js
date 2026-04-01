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
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
let TestAsset = class TestAsset extends ScriptableObject {
    name;
    testData;
    count;
    cardRankingAsset;
};
__decorate([
    required('Name is required'),
    serializable({ label: 'Name' }),
    __metadata("design:type", String)
], TestAsset.prototype, "name", void 0);
__decorate([
    serializable({ label: 'Test Data' }),
    __metadata("design:type", String)
], TestAsset.prototype, "testData", void 0);
__decorate([
    required('Count is required'),
    serializable({ label: 'Count' }),
    __metadata("design:type", Number)
], TestAsset.prototype, "count", void 0);
__decorate([
    required('Card Ranking Asset is required'),
    serializable({ label: 'Card Ranking Asset', elementType: AssetResourceEntry }),
    __metadata("design:type", AssetResourceEntry)
], TestAsset.prototype, "cardRankingAsset", void 0);
TestAsset = __decorate([
    serializableClass({
        assetType: 'TestAsset',
        displayName: 'Test Asset',
        icon: '🧪',
        category: AssetTypeCategory.Content,
    })
], TestAsset);
export { TestAsset };
