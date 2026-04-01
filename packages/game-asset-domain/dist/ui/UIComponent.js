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
let UIComponent = class UIComponent extends ScriptableObject {
    static schemaVersion = 1;
    static requiresInspector = true;
    static createTemplate() {
        return {
            component: 'Button',
            styles: {},
            animations: {},
        };
    }
    component = 'Button';
    styles = {};
    animations = {};
};
__decorate([
    serializable({ label: 'Component Type' }),
    __metadata("design:type", String)
], UIComponent.prototype, "component", void 0);
__decorate([
    serializable({ label: 'Styles' }),
    __metadata("design:type", Object)
], UIComponent.prototype, "styles", void 0);
__decorate([
    serializable({
        label: 'Animations',
        elementType: Object
    }),
    __metadata("design:type", Object)
], UIComponent.prototype, "animations", void 0);
UIComponent = __decorate([
    serializableClass({
        schemaVersion: 1,
        assetType: 'UIComponent',
        displayName: 'UI Component',
        icon: '🎨',
        category: AssetTypeCategory.UI,
    })
], UIComponent);
export { UIComponent };
