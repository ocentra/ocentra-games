var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CardRanking_1;
import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { DECK_FAMILY_FRENCH } from '@ocentra/game-domain/deck/cardIdentity';
import { CardRankingType } from '../../card/cardRanking/CardRankingType.js';
import { SuitColor } from '../../card/cardRanking/SuitColor.js';
import { DeckType } from '../../deck/DeckType.js';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '../../AssetCreation.js';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { CardRankingFactory } from '../../card/cardRanking/CardRankingFactory.js';
import { computeCardPieceId } from '../../pieces/piece-id.js';
import { computeExpectedCardIdentities } from '../../schemas/asset/deck-cross-validators.js';
const log = MainAppLogger.instance;
log.register(import.meta.url);
let CardSuitEntry = class CardSuitEntry {
    SuitName;
    SuitSymbol;
    SuitColor = SuitColor.None;
    DisplayOrder;
};
__decorate([
    serializable({ label: 'Suit Name' }),
    __metadata("design:type", String)
], CardSuitEntry.prototype, "SuitName", void 0);
__decorate([
    serializable({ label: 'Suit Symbol' }),
    __metadata("design:type", String)
], CardSuitEntry.prototype, "SuitSymbol", void 0);
__decorate([
    serializable({ label: 'Suit Color' }),
    __metadata("design:type", String)
], CardSuitEntry.prototype, "SuitColor", void 0);
__decorate([
    serializable({ label: 'Display Order' }),
    __metadata("design:type", Number)
], CardSuitEntry.prototype, "DisplayOrder", void 0);
CardSuitEntry = __decorate([
    serializableClass({
        assetType: 'CardSuitEntry',
        displayName: 'Card Suit Entry',
    })
], CardSuitEntry);
export { CardSuitEntry };
let CardRankingEntry = class CardRankingEntry {
    CardName;
    Value;
    CardSymbol;
    DisplayOrder;
};
__decorate([
    serializable({ label: 'Card Name' }),
    __metadata("design:type", String)
], CardRankingEntry.prototype, "CardName", void 0);
__decorate([
    serializable({ label: 'Card Value' }),
    __metadata("design:type", Number)
], CardRankingEntry.prototype, "Value", void 0);
__decorate([
    serializable({ label: 'Card Symbol' }),
    __metadata("design:type", String)
], CardRankingEntry.prototype, "CardSymbol", void 0);
__decorate([
    serializable({ label: 'Display Order' }),
    __metadata("design:type", Number)
], CardRankingEntry.prototype, "DisplayOrder", void 0);
CardRankingEntry = __decorate([
    serializableClass({
        assetType: 'CardRankingEntry',
        displayName: 'Card Ranking Entry',
    })
], CardRankingEntry);
export { CardRankingEntry };
let CardRankingExplicitEntry = class CardRankingExplicitEntry {
    id;
    copies = 1;
    suit;
    rank;
    label;
    order;
    points;
    kind;
};
__decorate([
    serializable({ label: 'Card ID' }),
    __metadata("design:type", String)
], CardRankingExplicitEntry.prototype, "id", void 0);
__decorate([
    serializable({ label: 'Copies' }),
    __metadata("design:type", Number)
], CardRankingExplicitEntry.prototype, "copies", void 0);
__decorate([
    serializable({ label: 'Suit' }),
    __metadata("design:type", Object)
], CardRankingExplicitEntry.prototype, "suit", void 0);
__decorate([
    serializable({ label: 'Rank' }),
    __metadata("design:type", Object)
], CardRankingExplicitEntry.prototype, "rank", void 0);
__decorate([
    serializable({ label: 'Label' }),
    __metadata("design:type", Object)
], CardRankingExplicitEntry.prototype, "label", void 0);
__decorate([
    serializable({ label: 'Order' }),
    __metadata("design:type", Object)
], CardRankingExplicitEntry.prototype, "order", void 0);
__decorate([
    serializable({ label: 'Points' }),
    __metadata("design:type", Object)
], CardRankingExplicitEntry.prototype, "points", void 0);
__decorate([
    serializable({ label: 'Kind' }),
    __metadata("design:type", Object)
], CardRankingExplicitEntry.prototype, "kind", void 0);
CardRankingExplicitEntry = __decorate([
    serializableClass({
        assetType: 'CardRankingExplicitEntry',
        displayName: 'Card Ranking Explicit Entry',
    })
], CardRankingExplicitEntry);
export { CardRankingExplicitEntry };
let CardRanking = class CardRanking extends ScriptableObject {
    static { CardRanking_1 = this; }
    static requiresInspector = true;
    static createTemplate() {
        return {
            deckType: DeckType.Custom,
            expectedCardCount: 0,
            includesJokers: false,
            backCardCount: 1,
            deckFamily: DECK_FAMILY_FRENCH,
            cardEntries: [],
            familyPayload: undefined,
        };
    }
    constructor() {
        super();
        this.deckType = DeckType.Custom;
        this.expectedCardCount = 0;
        this.includesJokers = false;
        this.backCardCount = 1;
        this.deckFamily = DECK_FAMILY_FRENCH;
    }
    deckType = DeckType.Custom;
    expectedCardCount = 0;
    includesJokers = false;
    backCardCount = 1;
    deckFamily = DECK_FAMILY_FRENCH;
    cardEntries = [];
    familyPayload;
    cardIdentities = [];
    getSuitsArray() {
        return this.familyPayload?.french?.suits ?? [];
    }
    getRankingsArray() {
        return this.familyPayload?.french?.rankings ?? [];
    }
    getSuitOrder() {
        return this.getSuitsArray()
            .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
            .map(s => s.SuitName);
    }
    getRankOrder() {
        return this.getRankingsArray()
            .sort((a, b) => b.DisplayOrder - a.DisplayOrder)
            .map(r => r.Value);
    }
    getCanonicalCardPieceIds() {
        const suits = this.getSuitOrder();
        const ranks = this.getRankOrder();
        const ids = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                ids.push(computeCardPieceId(suit, rank));
            }
        }
        return ids;
    }
    getSuitSymbol(suitName) {
        return this.getSuitsArray().find(s => s.SuitName === suitName)?.SuitSymbol;
    }
    getSuitColor(suitName) {
        return this.getSuitsArray().find(s => s.SuitName === suitName)?.SuitColor ?? SuitColor.None;
    }
    getRankSymbol(rankValue) {
        return this.getRankingsArray().find(r => r.Value === rankValue)?.CardSymbol;
    }
    getRankName(rankValue) {
        const entry = this.getRankingsArray().find(r => r.Value === rankValue);
        return entry?.CardName || entry?.CardSymbol || rankValue.toString();
    }
    getAllSuits() {
        return this.getSuitOrder();
    }
    getAllRanks() {
        return this.getRankOrder();
    }
    getCardSymbol(suitName, rankValue, coloured = true) {
        const rankSymbol = this.getRankSymbol(rankValue) || rankValue.toString();
        const suitSymbol = this.getSuitSymbol(suitName);
        if (suitSymbol) {
            return coloured ? `${rankSymbol}${suitSymbol}` : `${rankSymbol}${suitSymbol}`;
        }
        return rankSymbol;
    }
    getCardFromSymbol(symbol) {
        const trimmed = symbol.trim();
        if (trimmed.length < 2) {
            return null;
        }
        const suitSymbol = trimmed[trimmed.length - 1];
        const rankSymbol = trimmed.slice(0, -1);
        const suitEntry = this.getSuitsArray().find(s => s.SuitSymbol === suitSymbol);
        if (!suitEntry) {
            return null;
        }
        const rankEntry = this.getRankingsArray().find(r => r.CardSymbol === rankSymbol ||
            r.CardSymbol.toLowerCase() === rankSymbol.toLowerCase());
        if (!rankEntry) {
            return null;
        }
        return {
            suit: suitEntry.SuitName,
            value: rankEntry.Value,
            id: `${rankEntry.Value}_${suitSymbol}`,
        };
    }
    getRandomSuit() {
        const suits = this.getSuitOrder();
        if (suits.length === 0)
            return '';
        return suits[Math.floor(Math.random() * suits.length)];
    }
    getRandomRank(min, max) {
        const ranks = this.getRankOrder();
        if (ranks.length === 0)
            return 2;
        const actualMin = min ?? Math.min(...ranks);
        const actualMax = max ?? Math.max(...ranks);
        const filteredRanks = ranks.filter(r => r >= actualMin && r <= actualMax);
        if (filteredRanks.length === 0)
            return ranks[0] || 2;
        return filteredRanks[Math.floor(Math.random() * filteredRanks.length)];
    }
    getRankSymbolToValue() {
        const map = {};
        for (const entry of this.getRankingsArray()) {
            map[entry.CardSymbol] = entry.Value;
            map[entry.CardSymbol.toLowerCase()] = entry.Value;
        }
        return map;
    }
    getSuitSymbolToName() {
        const map = {};
        for (const entry of this.getSuitsArray()) {
            map[entry.SuitSymbol] = entry.SuitName;
        }
        return map;
    }
    calculateExpectedCardCount() {
        return computeExpectedCardIdentities(this).length;
    }
    updateExpectedCardCount() {
        this.cardIdentities = computeExpectedCardIdentities(this);
        this.expectedCardCount = this.cardIdentities.length;
    }
    static async getDefault() {
        return await ScriptableObject.getOrCreateDefault(CardRanking_1, CardRankingType.Standard, () => CardRankingFactory.createStandard52(), undefined, undefined, 'CardRankingType.Standard');
    }
    static async getCardRanking(type) {
        return await ScriptableObject.FirstOrDefault(CardRanking_1, undefined, type);
    }
    static async create(context, deckType = DeckType.Standard52) {
        const deferred = new OperationDeferred();
        const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
        let guid;
        if (!publishResult.isSuccess) {
            guid = createAssetGuid();
            log.logWarn('[CardRanking] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                assetType: 'CardRanking',
                gameId: context.gameId,
                fallbackGuid: guid,
            });
        }
        else {
            const result = await deferred.promise;
            const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
            guid = (isAssetGUID(guidString) ? guidString : guidString);
            if (!result.isSuccess || !result.value) {
                log.logWarn('[CardRanking] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                    assetType: 'CardRanking',
                    gameId: context.gameId,
                    fallbackGuid: guid,
                });
            }
        }
        const assetId = `${context.gameId}CardRanking`;
        const instance = CardRankingFactory.create({ deckType });
        const data = {
            deckType: instance.deckType,
            expectedCardCount: instance.expectedCardCount,
            includesJokers: instance.includesJokers,
            backCardCount: instance.backCardCount,
            deckFamily: instance.deckFamily,
            cardEntries: instance.cardEntries,
            familyPayload: instance.familyPayload,
        };
        return {
            assetId,
            fileName: `${context.gameId}CardRanking.asset`,
            guid,
            data,
        };
    }
};
__decorate([
    required('Deck Type is required for card ranking metadata'),
    serializable({ label: 'Deck Type' }),
    __metadata("design:type", String)
], CardRanking.prototype, "deckType", void 0);
__decorate([
    required('Expected Card Count is required for card ranking metadata'),
    serializable({ label: 'Expected Card Count' }),
    __metadata("design:type", Number)
], CardRanking.prototype, "expectedCardCount", void 0);
__decorate([
    required('Includes Jokers flag is required for card ranking metadata'),
    serializable({ label: 'Includes Jokers' }),
    __metadata("design:type", Boolean)
], CardRanking.prototype, "includesJokers", void 0);
__decorate([
    required('Back Card Count is required for card ranking metadata'),
    serializable({ label: 'Back Card Count' }),
    __metadata("design:type", Number)
], CardRanking.prototype, "backCardCount", void 0);
__decorate([
    serializable({ label: 'Deck Family' }),
    __metadata("design:type", String)
], CardRanking.prototype, "deckFamily", void 0);
__decorate([
    serializable({ label: 'Explicit Card Entries', elementType: CardRankingExplicitEntry }),
    __metadata("design:type", Array)
], CardRanking.prototype, "cardEntries", void 0);
__decorate([
    serializable({ label: 'Family Payload' }),
    __metadata("design:type", Object)
], CardRanking.prototype, "familyPayload", void 0);
__decorate([
    serializable({ label: 'Card Identities' }),
    __metadata("design:type", Array)
], CardRanking.prototype, "cardIdentities", void 0);
CardRanking = CardRanking_1 = __decorate([
    serializableClass({
        assetType: 'CardRanking',
        displayName: 'Card Ranking',
        icon: '📊',
        category: AssetTypeCategory.Game,
    }),
    __metadata("design:paramtypes", [])
], CardRanking);
export { CardRanking };
