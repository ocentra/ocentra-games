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
let GameRulesContainer = class GameRulesContainer {
    LLM = '';
    Player = '';
    constructor(llm, player) {
        this.LLM = llm ?? '';
        this.Player = player ?? '';
    }
};
__decorate([
    serializable({ label: 'LLM Rules' }),
    __metadata("design:type", String)
], GameRulesContainer.prototype, "LLM", void 0);
__decorate([
    serializable({ label: 'Player Rules' }),
    __metadata("design:type", String)
], GameRulesContainer.prototype, "Player", void 0);
GameRulesContainer = __decorate([
    serializableClass({
        assetType: 'GameRulesContainer',
        displayName: 'Game Rules Container',
    }),
    __metadata("design:paramtypes", [String, String])
], GameRulesContainer);
export { GameRulesContainer };
