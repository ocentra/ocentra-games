import 'reflect-metadata';
import { ReactBehaviour } from '@ocentra/behaviour-domain/ReactBehaviour';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { Deck } from '@/card/deck/Deck';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetAssetRegistryResourcesEvent } from '@ocentra/eventing-domain/events/assets/GetAssetRegistryResourcesEvent';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { ServiceRegistry } from '@ocentra/app-core/ServiceRegistry';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { DeckType } from '@/deck/DeckType';
import { createRuntimeCard } from '@ocentra/game-domain/deck/runtimeDeck';
import type { Card, CardValue } from '@ocentra/game-domain/types/game';
import { Suit } from '@ocentra/game-domain/types/game';
import { CardRanking } from '@/card/cardRanking/CardRanking';
import { materializePhysicalCards } from './physical-card-instance';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_DECK_MANAGER = false;

const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, enabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

export class DeckManager extends ReactBehaviour {
  static executionOrder = -50;

  static {
    ServiceRegistry.register(
      DeckManager,
      'DeckManager',
      DeckManager.getOrCreateInstance
    );
  }

  deckEntries: AssetResourceEntry<Deck>[] = [];
  private deckCache: Map<string, Deck> = new Map();
  private seed: number;
  private originalSeed: number;

  private static instance: DeckManager | null = null;
  private static loadingPromise: Promise<DeckManager> | null = null;

  constructor(seed?: number) {
    super();
    this.seed = seed ?? Date.now();
    this.originalSeed = this.seed;
  }

  protected awake(): void {
    // Initialization done in getOrCreateInstance
  }

  static getOrCreateInstance(): Promise<DeckManager> {
    if (DeckManager.instance) {
      logInfo('[DeckManager] getOrCreateInstance - returning existing instance', LOG_DECK_MANAGER);
      return Promise.resolve(DeckManager.instance);
    }

    if (DeckManager.loadingPromise) {
      logInfo('[DeckManager] getOrCreateInstance - returning loading promise', LOG_DECK_MANAGER);
      return DeckManager.loadingPromise;
    }

    logInfo('[DeckManager] getOrCreateInstance START - creating new instance', LOG_DECK_MANAGER);

    DeckManager.loadingPromise = (async () => {
      const manager = new DeckManager();
      (manager as ReactBehaviour).__initialize();
      (manager as ReactBehaviour).start();
      await manager.syncFromAssetRegistry();
      DeckManager.instance = manager;
      DeckManager.loadingPromise = null;
      return manager;
    })();

    return DeckManager.loadingPromise;
  }

  private async syncFromAssetRegistry(): Promise<void> {
    try {
      const getResourcesDeferred = new OperationDeferred<ResourceEntry[]>();
      await EventBus.instance.publishAsync(new GetAssetRegistryResourcesEvent(getResourcesDeferred));
      const getResourcesResult = await getResourcesDeferred.promise;
      
      if (!getResourcesResult.isSuccess || !getResourcesResult.value) {
        logError('[DeckManager] Failed to get resources from asset registry', {
          errorMessage: getResourcesResult.errorMessage
        });
        return;
      }

      this.deckEntries = getResourcesResult.value.filter(
        (resource): resource is AssetResourceEntry<Deck> =>
          resource instanceof AssetResourceEntry && resource.assetType === Deck.assetType
      );

      logInfo('[DeckManager] Synced from asset registry', {
        deckCount: this.deckEntries.length,
        decks: this.deckEntries.map(e => ({ displayName: e.displayName, guid: e.guid }))
      }, LOG_DECK_MANAGER);
    } catch (error) {
      logError('[DeckManager] Failed to sync from asset registry', error);
    }
  }

  async getDefaultDeck(): Promise<Deck | null> {
    return this.getDeck(DeckType.Normal);
  }

  private async loadDeckFromEntry(entry: AssetResourceEntry<Deck>): Promise<Deck | null> {
    if (this.deckCache.has(entry.guid)) {
      return this.deckCache.get(entry.guid)!;
    }

    const deck = await entry.load(Deck);
    if (deck) {
      this.deckCache.set(deck.guid.toString(), deck);
    }
    return deck;
  }

  async getDeck(deckType: DeckType, suitSet?: string, rankSet?: string): Promise<Deck | null> {
    if (suitSet && rankSet) {
      return this.getDeckByTriple(deckType, suitSet, rankSet);
    }

    const cachedEntry = this.findDeckEntry(deckType);
    if (cachedEntry && this.deckCache.has(cachedEntry.guid)) {
      return this.deckCache.get(cachedEntry.guid)!;
    }

    try {
      const deckAsset = await ScriptableObject.FirstOrDefault(Deck, deckType);
      if (deckAsset) {
        this.deckCache.set(deckAsset.guid.toString(), deckAsset);
        return deckAsset;
      }
    } catch (error) {
      logError(`[DeckManager] Failed to load deck: ${deckType}`, error);
    }

    return null;
  }

  async getDeckByTriple(deckType: DeckType, suitSet: string, rankSet: string): Promise<Deck | null> {
    for (const entry of this.deckEntries) {
      const deck = await this.loadDeckFromEntry(entry);
      if (deck?.supportsTriple(deckType, suitSet, rankSet)) {
        return deck;
      }
    }

    return this.getDeck(deckType);
  }

  findDeckEntry(deckType: DeckType): AssetResourceEntry<Deck> | null {
    return this.deckEntries.find(
      entry => entry.displayName === deckType
    ) || null;
  }

  registerDeck(entry: AssetResourceEntry<Deck>): void {
    const existingIndex = this.deckEntries.findIndex(e => e.guid === entry.guid);
    if (existingIndex >= 0) {
      this.deckEntries[existingIndex] = entry;
    } else {
      this.deckEntries.push(entry);
    }
    this.deckCache.delete(entry.guid);
  }

  async getAllDecks(): Promise<Deck[]> {
    const decks: Deck[] = [];
    for (const entry of this.deckEntries) {
      const deck = await this.loadDeckFromEntry(entry);
      if (deck) {
        decks.push(deck);
      }
    }
    return decks;
  }

  async createStandardDeck(): Promise<Card[]> {
    try {
      const deckAsset = await this.getDefaultDeck();
      
      if (!deckAsset || deckAsset.getDistinctCardTemplateRefs().length === 0) {
        return await this.createStandardDeckFallback();
      }

      const cardAssets = await deckAsset.getAllCards();
      
      const deck: Card[] = cardAssets.map(cardAsset => {
        const identity = cardAsset.cardIdentity;
        const isFrench = identity.family === 'French' && 'suit' in identity && 'value' in identity;
        return createRuntimeCard({
          suit: isFrench ? identity.suit : ('' as Suit),
          value: isFrench ? identity.value : 2,
          id: cardAsset.getCardId(),
        });
      });

      const physicalDeck = materializePhysicalCards(deck);

      if (physicalDeck.length !== 52) {
        return await this.createStandardDeckFallback();
      }

      return physicalDeck;
    } catch (error) {
      logError('[DeckManager] Failed to load NormalDeck.asset, using fallback', error);
      return await this.createStandardDeckFallback();
    }
  }

  private async createStandardDeckFallback(): Promise<Card[]> {
    try {
      const cardRanking = await CardRanking.getDefault();
      
      const suitsArray = cardRanking?.getSuitsArray() ?? [];
      const rankingsArray = cardRanking?.getRankingsArray() ?? [];
      if (cardRanking && suitsArray.length > 0 && rankingsArray.length > 0) {
        const deck: Card[] = [];
        const suitNameToSuit: Record<string, Suit> = {
          'spades': Suit.SPADES,
          'hearts': Suit.HEARTS,
          'diamonds': Suit.DIAMONDS,
          'clubs': Suit.CLUBS,
        };

        for (const suitEntry of suitsArray) {
          const suit = suitNameToSuit[suitEntry.SuitName.toLowerCase()];
          if (!suit) continue;

          for (const rankEntry of rankingsArray) {
            deck.push(createRuntimeCard({
              suit,
              value: rankEntry.Value as CardValue,
              id: `${rankEntry.Value}_of_${suit}`,
            }));
          }
        }

        return deck;
      }
    } catch (error) {
      logError('[DeckManager] Failed to load default CardRanking for fallback', error);
    }

    const deck: Card[] = [];
    const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const;

    for (const suit of suits) {
      for (const value of values) {
        deck.push(createRuntimeCard({
          suit,
          value,
          id: `${value}_of_${suit}`,
        }));
      }
    }

    return deck;
  }

  shuffleDeck(deck: Card[]): Card[] {
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

  dealInitialHands(deck: Card[], playerCount: number, handSize: number): {
    hands: Card[][];
    remainingDeck: Card[];
  } {
    const hands: Card[][] = Array.from({ length: playerCount }, () => []);
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

  drawCard(deck: Card[]): { card: Card | null; remainingDeck: Card[] } {
    const remainingDeck = [...deck];
    const card = remainingDeck.shift() || null;
    return { card, remainingDeck };
  }

  getSeed(): number {
    return this.seed;
  }

  setSeed(seed: number): void {
    this.seed = seed;
  }

  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private resetSeed(): void {
    this.seed = this.originalSeed;
  }

  clearCache(): void {
    this.deckCache.clear();
  }
}

