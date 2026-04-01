var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
/// <reference types="vite/client" />
import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { serializable, serializableClass } from '@ocentra/asset-domain/serialization/decorators';
import { GameModeStatus } from '../../constants/game-mode-status.js';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
let GameMode = class GameMode extends ScriptableObject {
    static schemaVersion = 1;
    releaseStatus = GameModeStatus.Available;
    bannerImage = '';
    gameIcon = '';
};
__decorate([
    serializable({ label: 'Release Status', group: 'Status' }),
    __metadata("design:type", String)
], GameMode.prototype, "releaseStatus", void 0);
__decorate([
    serializable({ label: 'Banner Image', group: 'Display' }),
    __metadata("design:type", String)
], GameMode.prototype, "bannerImage", void 0);
__decorate([
    serializable({ label: 'Game Icon', group: 'Display' }),
    __metadata("design:type", String)
], GameMode.prototype, "gameIcon", void 0);
GameMode = __decorate([
    serializableClass({
        assetType: 'GameMode',
        displayName: 'Game Mode',
        category: AssetTypeCategory.Game,
    })
], GameMode);
export { GameMode };
