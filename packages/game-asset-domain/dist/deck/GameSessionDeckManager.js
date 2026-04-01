import { Suit } from '@ocentra/game-domain/types/game';
import { Deck } from '../card/deck/Deck.js';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { FindAssetByTypeAndNameEvent } from '@ocentra/eventing-domain/events/assets/FindAssetByTypeAndNameEvent';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { materializePhysicalCards } from './physical-card-instance.js';
const log = MainAppLogger.instance;
const logWarn = (message, data) => {
    log.logWarn(message, getStackTrace(), data, false);
};
log.register(import.meta.url);
export class GameSessionDeckManager {
    seed;
    originalSeed;
    static DECK_LOOKUP_TIMEOUT_MS = 50;
    constructor(seed) {
        this.seed = seed ?? Date.now();
        this.originalSeed = this.seed;
    }
    async waitForDeferred(deferred, timeoutMs) {
        const timeout = new Promise((resolve) => {
            setTimeout(() => resolve(null), timeoutMs);
        });
        try {
            const result = await Promise.race([deferred.promise, timeout]);
            return result;
        }
        catch {
            return null;
        }
    }
    async createStandardDeck() {
        try {
            const findDeckDeferred = new OperationDeferred();
            const deckAssetType = Deck.assetType;
            if (!deckAssetType) {
                return this.createStandardDeckFallback();
            }
            await EventBus.instance.publishAsync(new FindAssetByTypeAndNameEvent(deckAssetType, 'NormalDeck', findDeckDeferred));
            const findResult = await this.waitForDeferred(findDeckDeferred, GameSessionDeckManager.DECK_LOOKUP_TIMEOUT_MS);
            if (!findResult) {
                return this.createStandardDeckFallback();
            }
            const normalDeckEntry = findResult;
            const deckAsset = await ScriptableObject.loadByGuid(Deck, AssetGUID.from(normalDeckEntry.guid));
            if (!deckAsset || deckAsset.getDistinctCardTemplateRefs().length === 0) {
                return this.createStandardDeckFallback();
            }
            const cardAssets = await deckAsset.getAllCards();
            const deck = cardAssets.map(cardAsset => {
                const identity = cardAsset.cardIdentity;
                const isFrench = identity.family === 'French' && 'suit' in identity && 'value' in identity;
                return {
                    suit: isFrench ? identity.suit : '',
                    value: isFrench ? identity.value : 2,
                    id: cardAsset.getCardId(),
                };
            });
            const physicalDeck = materializePhysicalCards(deck);
            if (physicalDeck.length !== 52) {
                return this.createStandardDeckFallback();
            }
            return physicalDeck;
        }
        catch (error) {
            logWarn('Failed to load NormalDeck.asset, using fallback:', error);
            return this.createStandardDeckFallback();
        }
    }
    createStandardDeckFallback() {
        const deck = [];
        const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
        const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        for (const suit of suits) {
            for (const value of values) {
                deck.push({
                    suit,
                    value,
                    id: `${value}_of_${suit}`,
                });
            }
        }
        return deck;
    }
    shuffleDeck(deck) {
        const shuffled = [...deck];
        let currentIndex = shuffled.length;
        this.resetSeed();
        while (currentIndex !== 0) {
            const randomIndex = Math.floor(this.seededRandom() * currentIndex);
            currentIndex--;
            [shuffled[currentIndex], shuffled[randomIndex]] = [
                shuffled[randomIndex],
                shuffled[currentIndex],
            ];
        }
        return shuffled;
    }
    dealInitialHands(deck, playerCount, handSize) {
        const hands = Array.from({ length: playerCount }, () => []);
        const remainingDeck = [...deck];
        for (let cardIndex = 0; cardIndex < handSize; cardIndex++) {
            for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
                const card = remainingDeck.shift();
                if (card) {
                    hands[playerIndex].push(card);
                }
            }
        }
        return { hands, remainingDeck };
    }
    drawCard(deck) {
        const remainingDeck = [...deck];
        const card = remainingDeck.shift() || null;
        return { card, remainingDeck };
    }
    getSeed() {
        return this.seed;
    }
    setSeed(seed) {
        this.seed = seed;
    }
    seededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    resetSeed() {
        this.seed = this.originalSeed;
    }
}
