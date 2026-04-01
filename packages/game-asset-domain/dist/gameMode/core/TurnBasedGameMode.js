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
import { BettingGameMode } from '../../gameMode/core/BettingGameMode.js';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
let TurnBasedGameMode = class TurnBasedGameMode extends BettingGameMode {
    minRounds = 1;
    maxRounds = null;
    turnDuration = 60;
};
__decorate([
    serializable({ label: 'Min Rounds', group: 'Turn Settings' }),
    __metadata("design:type", Number)
], TurnBasedGameMode.prototype, "minRounds", void 0);
__decorate([
    serializable({ label: 'Max Rounds', group: 'Turn Settings' }),
    __metadata("design:type", Object)
], TurnBasedGameMode.prototype, "maxRounds", void 0);
__decorate([
    serializable({ label: 'Turn Duration (seconds)', group: 'Turn Settings' }),
    __metadata("design:type", Number)
], TurnBasedGameMode.prototype, "turnDuration", void 0);
TurnBasedGameMode = __decorate([
    serializableClass({
        assetType: 'TurnBasedGameMode',
        displayName: 'Turn Based Game Mode',
        category: AssetTypeCategory.Game,
    })
], TurnBasedGameMode);
export { TurnBasedGameMode };
