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
import { GameMode } from '../../gameMode/core/GameMode.js';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
let BettingGameMode = class BettingGameMode extends GameMode {
    initialPlayerCoins = 10000;
};
__decorate([
    serializable({ label: 'Initial Player Coins', group: 'Betting' }),
    __metadata("design:type", Number)
], BettingGameMode.prototype, "initialPlayerCoins", void 0);
BettingGameMode = __decorate([
    serializableClass({
        assetType: 'BettingGameMode',
        displayName: 'Betting Game Mode',
        category: AssetTypeCategory.Game,
    })
], BettingGameMode);
export { BettingGameMode };
