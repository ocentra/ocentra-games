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
let TrumpBonusValues = class TrumpBonusValues {
    cardInMiddleBonus = 5;
    fiveOfKindBonus = 25;
    flushBonus = 20;
    fourOfKindBonus = 20;
    threeOfKindBonus = 15;
    pairBonus = 5;
    trumpCardBonus = 10;
    wildCardBonus = 10;
    rankAdjacentBonus = 5;
    getBonusForSet(size) {
        switch (size) {
            case 5: return this.fiveOfKindBonus;
            case 4: return this.fourOfKindBonus;
            case 3: return this.threeOfKindBonus;
            case 2: return this.pairBonus;
            default: return 0;
        }
    }
};
__decorate([
    serializable(),
    __metadata("design:type", Number)
], TrumpBonusValues.prototype, "cardInMiddleBonus", void 0);
__decorate([
    serializable(),
    __metadata("design:type", Number)
], TrumpBonusValues.prototype, "fiveOfKindBonus", void 0);
__decorate([
    serializable(),
    __metadata("design:type", Number)
], TrumpBonusValues.prototype, "flushBonus", void 0);
__decorate([
    serializable(),
    __metadata("design:type", Number)
], TrumpBonusValues.prototype, "fourOfKindBonus", void 0);
__decorate([
    serializable(),
    __metadata("design:type", Number)
], TrumpBonusValues.prototype, "threeOfKindBonus", void 0);
__decorate([
    serializable(),
    __metadata("design:type", Number)
], TrumpBonusValues.prototype, "pairBonus", void 0);
__decorate([
    serializable(),
    __metadata("design:type", Number)
], TrumpBonusValues.prototype, "trumpCardBonus", void 0);
__decorate([
    serializable(),
    __metadata("design:type", Number)
], TrumpBonusValues.prototype, "wildCardBonus", void 0);
__decorate([
    serializable(),
    __metadata("design:type", Number)
], TrumpBonusValues.prototype, "rankAdjacentBonus", void 0);
TrumpBonusValues = __decorate([
    serializableClass({
        assetType: 'TrumpBonusValues',
        displayName: 'Trump Bonus Values',
    })
], TrumpBonusValues);
export { TrumpBonusValues };
