var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Card_1;
import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { Suit } from '@ocentra/game-domain/types/game';
import { frenchCardIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import { CardRanking } from '../../card/cardRanking/CardRanking.js';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import JSON5 from 'json5';
import { PieceKind } from '../../pieces/PieceKind.js';
import { computeCardPieceId } from '../../pieces/piece-id.js';
let Card = class Card extends ScriptableObject {
    static { Card_1 = this; }
    static schemaVersion = 1;
    static requiresInspector = true;
    static category = AssetTypeCategory.Game;
    static parentPathForSave = null;
    static createTemplate() {
        return {
            cardIdentity: frenchCardIdentity(Suit.SPADES, 2),
            imageHash: '',
            cardId: '2_of_spades',
            cardRankingAsset: undefined,
        };
    }
    constructor() {
        super();
        const template = Card_1.createTemplate();
        this.cardIdentity = template.cardIdentity;
        this.imageHash = template.imageHash;
        this.cardId = template.cardId;
        this.cardRankingAsset = new AssetResourceEntry(CardRanking.assetType);
    }
    cardIdentity;
    imageHash;
    cardId;
    cardRankingAsset;
    get pieceKind() {
        return PieceKind.Card;
    }
    get pieceId() {
        return computeCardPieceId(this.cardIdentity);
    }
    getCardId(cardRanking) {
        if (this.cardId) {
            return this.cardId;
        }
        return this.computeCardId(cardRanking);
    }
    computeCardId(cardRanking) {
        if (this.cardIdentity.family !== 'French' || !('suit' in this.cardIdentity && 'value' in this.cardIdentity)) {
            return computeCardPieceId(this.cardIdentity);
        }
        if (cardRanking) {
            const rankName = cardRanking.getRankName(this.cardIdentity.value);
            return `${rankName.toLowerCase()}_of_${this.cardIdentity.suit}`;
        }
        return `${this.cardIdentity.value}_of_${this.cardIdentity.suit}`;
    }
    onLoad() {
        super.onLoad();
        void this.syncCardId();
    }
    onBeforeSave() {
        super.onBeforeSave();
        void this.syncCardId();
    }
    async syncCardId() {
        let cardRanking;
        if (this.cardRankingAsset.guid) {
            try {
                const loaded = await this.cardRankingAsset.load(CardRanking);
                cardRanking = loaded || undefined;
            }
            catch {
                cardRanking = undefined;
            }
        }
        if (!cardRanking) {
            try {
                cardRanking = await CardRanking.getDefault();
            }
            catch {
                cardRanking = undefined;
            }
        }
        const expectedCardId = this.computeCardId(cardRanking);
        if (this.cardId !== expectedCardId) {
            this.cardId = expectedCardId;
            this.displayName = this.cardId;
            this.variant = this.cardId;
        }
    }
    serialize() {
        const json5Content = super.serialize();
        if (Card_1.parentPathForSave) {
            try {
                const parsed = JSON5.parse(json5Content);
                if (parsed.system) {
                    parsed.system.parentPath = Card_1.parentPathForSave;
                }
                return JSON.stringify(parsed, null, 2).replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g, '$1:');
            }
            catch {
                return json5Content;
            }
        }
        return json5Content;
    }
};
__decorate([
    required('Card Identity is required'),
    serializable({ label: 'Card Identity' }),
    __metadata("design:type", Object)
], Card.prototype, "cardIdentity", void 0);
__decorate([
    required('Image Hash is required for card to function properly'),
    serializable({ label: 'Image Hash' }),
    __metadata("design:type", String)
], Card.prototype, "imageHash", void 0);
__decorate([
    required('Card ID is required for card to function properly'),
    serializable({ label: 'Card ID' }),
    __metadata("design:type", String)
], Card.prototype, "cardId", void 0);
__decorate([
    required('Card Ranking Asset is required for card to function properly'),
    serializable({ label: 'Card Ranking Asset', elementType: AssetResourceEntry }),
    __metadata("design:type", AssetResourceEntry)
], Card.prototype, "cardRankingAsset", void 0);
Card = Card_1 = __decorate([
    serializableClass({
        schemaVersion: 1,
        assetType: 'Card',
        displayName: 'Card',
        icon: '🃏',
        category: AssetTypeCategory.Game,
    }),
    __metadata("design:paramtypes", [])
], Card);
export { Card };
