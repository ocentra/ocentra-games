import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { AssetResourceEntryFactory } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntryFactory';
import { Card } from '@/card/cardBase/Card';
import { CardFactory } from '@/card/cardBase/CardFactory';
import { Suit } from '@ocentra/game-domain/types/game';
import type { CardValue } from '@ocentra/game-domain/types/game';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';


import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { UploadImageEvent } from '@ocentra/eventing-domain/events/assets/UploadImageEvent';
import { GetResourceByGuidEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByGuidEvent';
import { FindAssetByTypeAndNameEvent } from '@ocentra/eventing-domain/events/assets/FindAssetByTypeAndNameEvent';
import { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry';
import { createAssetGuid } from '@/AssetCreation';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import { CardRanking } from '@/card/cardRanking/CardRanking';
import type { AssetType } from '@ocentra/asset-domain/types/assetType';
import { ImageCache } from '@ocentra/storage-domain/caches/ImageCacheService';
import type { AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import { isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_DECK = true;
const LOG_DECK_PERF = true;

const BATCH_KEY_CREATING_CARD = 'Deck.creatingCard';
const BATCH_KEY_VALIDATION = 'Deck.validation';
const BATCH_KEY_IMAGE_UPLOAD = 'Deck.imageUpload';
const BATCH_KEY_IMAGE_ASSIGNMENT = 'Deck.imageAssignment';

MainAppLogger.instance.registerBatchContext(BATCH_KEY_CREATING_CARD, {
  enabled: true,
  batchSize: 52,
  flushInterval: 1000,
});

MainAppLogger.instance.registerBatchContext(BATCH_KEY_VALIDATION, {
  enabled: true,
  batchSize: 52,
  flushInterval: 1000,
});

MainAppLogger.instance.registerBatchContext(BATCH_KEY_IMAGE_UPLOAD, {
  enabled: true,
  batchSize: 52,
  flushInterval: 1000,
});

MainAppLogger.instance.registerBatchContext(BATCH_KEY_IMAGE_ASSIGNMENT, {
  enabled: true,
  batchSize: 52,
  flushInterval: 1000,
});

@serializableClass({
  assetType: 'SupportedDeckTriple',
  displayName: 'Supported Deck Triple',
  icon: 'ðŸƒ',
  category: AssetTypeCategory.Game,
})
export class SupportedDeckTripleRecord {
  @serializable({ label: 'Deck Type' })
  deckType: string = '';

  @serializable({ label: 'Suit Set' })
  suitSet: string = '';

  @serializable({ label: 'Rank Set' })
  rankSet: string = '';
}

@serializableClass({
  assetType: 'DeckCardMember',
  displayName: 'Deck Card Member',
  icon: '🂠',
  category: AssetTypeCategory.Game,
})
export class DeckCardMemberRecord {
  @serializable({ label: 'Card Template', elementType: AssetResourceEntry })
  cardTemplate: AssetResourceEntry<Card> = new AssetResourceEntry<Card>(Card.assetType! as AssetType);

  @serializable({ label: 'Copies' })
  copies: number = 1;
}

@serializableClass({
  schemaVersion: AssetSchemaVersion.V1,
  assetType: 'Deck',
  displayName: 'Deck',
  icon: '🃏',
  category: AssetTypeCategory.Game,
})
export class Deck extends ScriptableObject {

  static override schemaVersion = AssetSchemaVersion.V1;
  static readonly requiresInspector = true;
  static override category = AssetTypeCategory.Game;

  static override createTemplate(): Record<string, unknown> {
    return {
      name: 'NewDeck',
      supportedTriples: [],
      cardTemplates: [],
      cardComposition: [],
      backCardHash: '',
      imageSourceFolderPath: 'Resources/GameMode/CardGames/Images',
      cardOutputPath: '',
      backCardSourceFolderPath: '',
    };
  }

  @serializable({ label: 'Deck Name' })
  name: string = '';

  @required('Supported triples are required for deck to function properly')
  @serializable({ label: 'Supported Triples', elementType: SupportedDeckTripleRecord })
  supportedTriples!: SupportedDeckTripleRecord[];

  @required('Card Templates are required for deck to function properly')
  @serializable({ label: 'Card Templates', elementType: AssetResourceEntry })
  cardTemplates!: AssetResourceEntry<Card>[];

  @serializable({ label: 'Card Composition', elementType: DeckCardMemberRecord })
  cardComposition!: DeckCardMemberRecord[];

  @required('Back Card Hash is required for deck to function properly')
  @serializable({ label: 'Back Card Hash' })
  backCardHash!: ImageHash;

  @required('Image Source Folder Path is required for deck to function properly')
  @serializable({ label: 'Image Source Folder Path' })
  imageSourceFolderPath!: string;

  @required('Card Output Path is required for deck to function properly')
  @serializable({ label: 'Card Output Path' })
  cardOutputPath!: string;

  @required('Back Card Source Folder Path is required for deck to function properly')
  @serializable({ label: 'Back Card Source Folder Path' })
  backCardSourceFolderPath!: string;

  @required('Card Ranking Asset is required for deck to function properly')
  @serializable({ label: 'Card Ranking Asset', elementType: AssetResourceEntry })
  cardRankingAsset!: AssetResourceEntry<CardRanking>;

  constructor() {
    super();
    const template = Deck.createTemplate();
    this.cardRankingAsset = new AssetResourceEntry<CardRanking>(CardRanking.assetType! as AssetType);
    this.supportedTriples = template.supportedTriples as SupportedDeckTripleRecord[];
    this.cardTemplates = template.cardTemplates as AssetResourceEntry<Card>[];
    this.cardComposition = template.cardComposition as DeckCardMemberRecord[];
    this.backCardHash = template.backCardHash as ImageHash;
    this.imageSourceFolderPath = template.imageSourceFolderPath as string;
    this.cardOutputPath = template.cardOutputPath as string;
    this.backCardSourceFolderPath = template.backCardSourceFolderPath as string;
  }

  supportsTriple(deckType: string, suitSet: string, rankSet: string): boolean {
    return this.supportedTriples.some(
      (triple) =>
        triple.deckType === deckType &&
        triple.suitSet === suitSet &&
        triple.rankSet === rankSet,
    );
  }

  getExpandedCardTemplateRefs(): AssetResourceEntry<Card>[] {
    if (this.cardComposition && this.cardComposition.length > 0) {
      return this.cardComposition.flatMap((entry) =>
        Array.from({ length: Math.max(1, entry.copies) }, () => entry.cardTemplate),
      );
    }
    return this.cardTemplates ?? [];
  }

  getDistinctCardTemplateRefs(): AssetResourceEntry<Card>[] {
    const refs = this.getExpandedCardTemplateRefs();
    const seen = new Set<string>();

    return refs.filter((ref) => {
      const key = ref.guid || ref.path || ref.displayName || '';
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }



  async getCard(suit: Suit, rank: CardValue): Promise<Card | null> {
    const templateRefs = this.getDistinctCardTemplateRefs();
    if (!templateRefs || templateRefs.length === 0) {
      return null;
    }

    const cards = await Promise.all(templateRefs.map(ref => ref.load(Card)));
    return cards.find(card => card && card.cardIdentity.family === 'French' && 'suit' in card.cardIdentity && 'value' in card.cardIdentity && card.cardIdentity.suit === suit && card.cardIdentity.value === rank) || null;
  }

  async getAllCards(): Promise<Card[]> {
    const templateRefs = this.getExpandedCardTemplateRefs();
    if (!templateRefs || templateRefs.length === 0) {
      return [];
    }

    const results = await Promise.all(templateRefs.map(ref => ref.load(Card)));
    return results.filter((c): c is Card => c !== null);
  }

  async getCardRanking(): Promise<CardRanking> {
    const rankingLoadStart = LOG_DECK_PERF ? performance.now() : 0;
    let ranking: CardRanking | null = null;

    if (LOG_DECK) {
      log.logInfo(`[Deck] getCardRanking() called for ${this.name}`, getStackTrace(), {
        hasCardRankingAsset: !!this.cardRankingAsset,
        cardRankingAssetGuid: this.cardRankingAsset?.guid || 'no-guid',
        cardRankingAssetType: this.cardRankingAsset?.assetType || 'no-type',
        cardRankingAssetIsInstance: this.cardRankingAsset instanceof AssetResourceEntry,
      }, LOG_DECK);
    }

    if (LOG_DECK_PERF && rankingLoadStart) {
      log.logInfo('[Deck] Performance: Starting CardRanking load', getStackTrace(), {
        deckName: this.name,
        timestamp: rankingLoadStart,
      });
    }

    try {
      ranking = await this.cardRankingAsset.load(CardRanking);

      if (LOG_DECK_PERF && rankingLoadStart) {
        const rankingLoadEnd = performance.now();
        const rankingLoadDuration = (rankingLoadEnd - rankingLoadStart).toFixed(2);
        log.logInfo('[Deck] Performance: CardRanking loaded', getStackTrace(), {
          deckName: this.name,
          duration: rankingLoadDuration + 'ms',
          timestamp: rankingLoadEnd,
        });
      }

      if (LOG_DECK && ranking) {
        log.logInfo(`[Deck] Successfully loaded cardRankingAsset for ${this.name}`, getStackTrace(), {
          rankingGuid: ranking.guid.toString(),
          rankingDisplayName: ranking.displayName,
        }, LOG_DECK);
      }
    } catch (e) {
      log.logWarn(`[Deck] Failed to load configured cardRankingAsset for ${this.name}, attempting fallback.`, getStackTrace(), { error: e }, LOG_DECK);
    }

    if (!ranking) {
      if (LOG_DECK) {
        log.logWarn(`[Deck] cardRankingAsset.load() returned null for ${this.name}, attempting fallback`, getStackTrace(), {
          cardRankingAssetGuid: this.cardRankingAsset?.guid || 'no-guid',
        }, LOG_DECK);
      }
      log.logInfo(`[Deck] Using default CardRanking fallback for ${this.name}`, getStackTrace(), undefined, LOG_DECK);
      ranking = await CardRanking.getDefault();
    }

    if (!ranking) {
      throw new Error(`CardRanking asset not found for deck ${this.name} and fallback failed.`);
    }
    ranking.updateExpectedCardCount();
    return ranking;
  }

  async getSuitOrder(): Promise<string[]> {
    const cardRanking = await this.getCardRanking();
    return cardRanking.getSuitOrder();
  }

  async getRankOrder(): Promise<CardValue[]> {
    const cardRanking = await this.getCardRanking();
    return cardRanking.getRankOrder() as CardValue[];
  }

  async getExpectedCards(): Promise<Array<{ suit: string; rank: CardValue }>> {
    const cardRanking = await this.getCardRanking();
    const suits = cardRanking.getSuitOrder();
    const ranks = cardRanking.getRankOrder();
    const expectedCards: Array<{ suit: string; rank: CardValue }> = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        expectedCards.push({ suit, rank: rank as CardValue });
      }
    }
    return expectedCards;
  }

  async getDeckPath(): Promise<string | null> {
    const deferred = new OperationDeferred<ResourceEntry | null>();
    await EventBus.instance.publishAsync(
      new GetResourceByGuidEvent(this.guid.toString(), deferred)
    );
    const result = await deferred.promise;
    if (result.isSuccess && result.value?.path) {
      return result.value.path;
    }
    return null;
  }

  async getCardFolderPath(): Promise<string> {
    const deckPath = await this.getDeckPath();
    if (!deckPath) {
        throw new Error('Cannot determine deck path - deck not found in asset registry');
    }

    const parentFolder = deckPath.split('/').slice(0, -1).join('/');

    const folderName = this.variant || this.guid.toString();

    return `${parentFolder}/${folderName}`;
  }

  async checkCardExists(cardId: string): Promise<Card | null> {
    const existingRef = this.getDistinctCardTemplateRefs().find(ref => {
      if (ref.variant === cardId) return true;
      if (ref.displayName === cardId) return true;
      return false;
    });
    if (existingRef) {
      return await existingRef.load(Card);
    }

    const findDeferred = new OperationDeferred<ResourceEntry | null>();
    await EventBus.instance.publishAsync(
      new FindAssetByTypeAndNameEvent(Card.assetType! as AssetType, undefined, findDeferred, cardId)
    );
    const result = await findDeferred.promise;

    if (result.isSuccess && result.value) {
      const entry = result.value as AssetResourceEntry;
      if (entry.guid) {
        return await ScriptableObject.loadByGuid(Card, entry.guid as AssetGUIDType);
      }
    }

    return null;
  }

  async quickValidateCards(): Promise<{ isValid: boolean; missingCount: number; expectedCount: number }> {
    const cardRanking = await this.getCardRanking();
    const expectedIdentities = cardRanking.cardIdentities;

    if (expectedIdentities.length === 0) {
      return { isValid: false, missingCount: 0, expectedCount: 0 };
    }

    const templateRefs = this.getDistinctCardTemplateRefs();
    if (templateRefs.length !== expectedIdentities.length) {
      if (LOG_DECK) {
        log.logInfo(`[Deck] Quick validation failed: count mismatch`, getStackTrace(), {
          expected: expectedIdentities.length,
          current: templateRefs.length
        }, LOG_DECK, BATCH_KEY_VALIDATION);
      }
      return { isValid: false, missingCount: Math.abs(expectedIdentities.length - templateRefs.length), expectedCount: expectedIdentities.length };
    }

    const missingCards: string[] = [];
    for (const cardId of expectedIdentities) {
      const existingRef = templateRefs.find(ref => {
        if (ref.variant === cardId) return true;
        if (ref.displayName === cardId) return true;
        return false;
      });
      if (!existingRef || !existingRef.guid) {
        missingCards.push(cardId);
        if (LOG_DECK && missingCards.length <= 3) {
          log.logInfo(`[Deck] Validation: card not found`, getStackTrace(), {
            cardId,
            searchedVariants: templateRefs.slice(0, 3).map(r => ({ variant: r.variant, displayName: r.displayName, guid: r.guid })),
            totalTemplates: templateRefs.length
          }, LOG_DECK, BATCH_KEY_VALIDATION);
        }
      }
    }

    if (missingCards.length > 0) {
      if (LOG_DECK) {
        log.logInfo(`[Deck] Quick validation failed: missing cards`, getStackTrace(), {
          missingCount: missingCards.length,
          missingCards: missingCards.slice(0, 5)
        }, LOG_DECK, BATCH_KEY_VALIDATION);
      }
      return { isValid: false, missingCount: missingCards.length, expectedCount: expectedIdentities.length };
    }

    return { isValid: true, missingCount: 0, expectedCount: expectedIdentities.length };
  }

  async ensureAllCardAssetsExist(
    onProgress?: (current: number, total: number, cardId: string, stage: 'checking' | 'creating' | 'updating') => void
  ): Promise<{ created: number; total: number }> {
    const cardFolder = this.cardOutputPath?.trim() || await this.getCardFolderPath();
    const cardRanking = await this.getCardRanking();
    const templateRefs = this.getDistinctCardTemplateRefs();

    const expectedIdentities = cardRanking.cardIdentities;
    if (expectedIdentities.length === 0) {
      log.logWarn(`[Deck] CardRanking for ${this.name} has no identities. Cannot reconcile.`, getStackTrace(), undefined, LOG_DECK);
      return { created: 0, total: 0 };
    }

    if (LOG_DECK) {
      log.logInfo(`[Deck] Starting reconciliation for ${this.name}`, getStackTrace(), {
        cardFolder,
        expectedCount: expectedIdentities.length,
        currentTemplates: templateRefs.length
      }, LOG_DECK);
    }

    const results = await Promise.all(
      expectedIdentities.map(async (cardId, index) => {
        onProgress?.(index + 1, expectedIdentities.length, cardId, 'checking');

        let existingRef = templateRefs.find(ref => {
          if (ref.variant === cardId) return true;
          if (ref.displayName === cardId) return true;
          return false;
        });
        let status: 'existing' | 'recovered' | 'created' = 'existing';

        if (!existingRef) {
          const existingCard = await this.checkCardExists(cardId);
          if (existingCard) {
            existingRef = await AssetResourceEntryFactory.fromAssetWithAssetRegistry<Card>(existingCard);
            status = 'recovered';
          }
        }

        if (!existingRef) {
          onProgress?.(index + 1, expectedIdentities.length, cardId, 'creating');
          status = 'created';
          const suitName = cardId.split('_of_')[1];
          const suit = this.getSuitFromName(suitName);
          const rank = this.getRankFromId(cardId, cardRanking);

          const card = CardFactory.create({
            suit,
            rank: rank as CardValue,
            imageHash: '' as ImageHash,
            cardRanking: this.cardRankingAsset,
          });

          if (LOG_DECK) {
            log.logInfo(`[Deck] Creating missing card: ${cardId}`, getStackTrace(), {
              folder: cardFolder,
              suit,
              rank
            }, LOG_DECK, BATCH_KEY_CREATING_CARD);
          }

          Card.parentPathForSave = cardFolder;
          await card.saveChanges();
          Card.parentPathForSave = null;

          existingRef = await AssetResourceEntryFactory.fromAssetWithAssetRegistry<Card>(card);
        }

        return { cardId, ref: existingRef, status };
      })
    );

    const reconciledTemplates: AssetResourceEntry<Card>[] = [];
    const reconciledByCardId = new Map<string, AssetResourceEntry<Card>>();
    let createdCount = 0;
    let recoveredCount = 0;
    let existingCount = 0;

    for (const { cardId, ref, status } of results) {
      reconciledTemplates.push(ref);
      reconciledByCardId.set(cardId, ref);
      if (status === 'created') createdCount++;
      else if (status === 'recovered') recoveredCount++;
      else existingCount++;
    }

    if (this.cardComposition && this.cardComposition.length > 0) {
      const updatedComposition = this.cardComposition.map((entry) => {
        const key = entry.cardTemplate.variant || entry.cardTemplate.displayName || entry.cardTemplate.path;
        const refreshed = key ? reconciledByCardId.get(key) : undefined;
        return refreshed ? { ...entry, cardTemplate: refreshed } : entry;
      });

      const isDifferent =
        this.cardComposition.length !== updatedComposition.length ||
        this.cardComposition.some((entry, idx) => {
          const updated = updatedComposition[idx];
          return (
            entry.copies !== updated?.copies ||
            entry.cardTemplate.guid !== updated?.cardTemplate.guid ||
            entry.cardTemplate.path !== updated?.cardTemplate.path
          );
        });

      if (isDifferent) {
        onProgress?.(expectedIdentities.length, expectedIdentities.length, 'Compacting Asset', 'updating');
        this.cardComposition = updatedComposition;
        await this.saveChanges();

        if (LOG_DECK) {
          MainAppLogger.instance.flushAllBatches();
          log.logInfo(`[Deck] Reconciled ${this.name}: Purged duplicates/ghosts. Existing: ${existingCount}, Recovered: ${recoveredCount}, Created: ${createdCount}. Final total: ${this.cardComposition.length}`, getStackTrace(), undefined, LOG_DECK);
        }
      }
    } else {
      const isDifferent = this.cardTemplates.length !== reconciledTemplates.length ||
        this.cardTemplates.some((ref, idx) => ref.guid !== reconciledTemplates[idx]?.guid);

      if (isDifferent) {
        onProgress?.(expectedIdentities.length, expectedIdentities.length, 'Compacting Asset', 'updating');
        this.cardTemplates = reconciledTemplates;
        await this.saveChanges();

        if (LOG_DECK) {
          MainAppLogger.instance.flushAllBatches();
          log.logInfo(`[Deck] Reconciled ${this.name}: Purged duplicates/ghosts. Existing: ${existingCount}, Recovered: ${recoveredCount}, Created: ${createdCount}. Final total: ${this.cardTemplates.length}`, getStackTrace(), undefined, LOG_DECK);
        }
      }
    }

    return { created: createdCount, total: expectedIdentities.length };
  }

  private getSuitFromName(name: string): Suit {
    return name as Suit;
  }

  private getRankFromId(cardId: string, ranking: CardRanking): number {
    const parts = cardId.split('_of_');
    const rankName = parts[0];
    const rankNameLower = rankName.toLowerCase();
    const entry = ranking.getRankingsArray().find(
      r =>
        r.CardName.toLowerCase() === rankNameLower ||
        r.CardSymbol.toLowerCase() === rankNameLower ||
        String(r.Value) === rankNameLower
    );
    return entry?.Value ?? 0;
  }

  async buildHashMapFromUpload(files: File[]): Promise<Map<string, ImageHash>> {
    const hashMap = new Map<string, ImageHash>();
    const imageCache = ImageCache.getInstance();

    const validFiles = files.filter(
      file => file.type.startsWith('image/') && file.name.endsWith('.png')
    );

    await Promise.all(
      validFiles.map(async (file) => {
        try {
          const blob = await file.arrayBuffer();
          const hash = await imageCache.calculateImageHash(new Blob([blob]));

          const bytes = new Uint8Array(blob);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64Content = btoa(binary);

          const uploadDeferred = new OperationDeferred<{ path: string }>();
          await EventBus.instance.publishAsync(
            new UploadImageEvent(hash, base64Content, uploadDeferred)
          );
          await uploadDeferred.promise;

          hashMap.set(file.name, hash as ImageHash);
        } catch (err) {
          log.logError(`[Deck] Failed to process file ${file.name}`, getStackTrace(), err, LOG_DECK);
        }
      })
    );

    return hashMap;
  }

  async populateFromTreeData(
    items: Array<{ name: string; hash?: string }>,
    isBackCards: boolean = false
  ): Promise<{ updated: number; warnings: string[] }> {
    try {
      if (isBackCards) {
        const firstPngItem = items.find(item => item.name.endsWith('.png') && item.hash);
        if (firstPngItem && firstPngItem.hash) {
          this.backCardHash = firstPngItem.hash as ImageHash;
          return { updated: 1, warnings: [] };
        }
        return { updated: 0, warnings: ['No back card image found (expected single PNG file)'] };
      }

      const hashMap = new Map<string, ImageHash>();

      for (const item of items) {
        if (item.hash) {
          hashMap.set(item.name, item.hash as ImageHash);
        } else {
          if (item.name.endsWith('.png')) {
            log.logWarn('[Deck] Tree item missing hash', getStackTrace(), { item }, LOG_DECK);
          }
        }
      }

      return await this.mapImagesToCards(hashMap);
    } catch (error) {
      log.logError('Failed to populate from tree data', getStackTrace(), error, LOG_DECK);
      throw error;
    }
  }


  async populateFromFolder(
    files: File[],
    _isBackCards: boolean = false
  ): Promise<{ updated: number; warnings: string[] }> {
    try {
      if (_isBackCards) {
        const validPngFiles = files.filter(f => f.type.startsWith('image/') && f.name.endsWith('.png'));
        if (validPngFiles.length === 0) {
          return { updated: 0, warnings: ['No PNG image file found for back card'] };
        }

        const firstFile = validPngFiles[0];
        if (validPngFiles.length > 1) {
          log.logWarn('[Deck] Multiple files selected for back card, using first file only', getStackTrace(), {
            selectedFile: firstFile.name,
            totalFiles: validPngFiles.length
          }, LOG_DECK);
        }

        const hashMap = await this.buildHashMapFromUpload([firstFile]);
        const firstHash = hashMap.values().next().value;
        if (firstHash) {
          this.backCardHash = firstHash;
          return { updated: 1, warnings: validPngFiles.length > 1 ? [`Using first file: ${firstFile.name} (${validPngFiles.length} files selected, only one needed)`] : [] };
        }
        return { updated: 0, warnings: ['Failed to process back card image'] };
      }

      const hashMap = await this.buildSmartHashMap(files);

      return await this.mapImagesToCards(hashMap);
    } catch (error) {
      log.logWarn('Failed to populate deck from folder', getStackTrace(), error, LOG_DECK);
      throw error;
    }
  }

  private async buildSmartHashMap(files: File[]): Promise<Map<string, ImageHash>> {
    const hashMap = new Map<string, ImageHash>();
    const imageCache = ImageCache.getInstance();
    const validFiles = files.filter(f => f.type.startsWith('image/') && f.name.endsWith('.png'));

    const { GetResourceByHashEvent } = await import('@ocentra/eventing-domain/events/assets/GetResourceByHashEvent');
    const { UploadImageEvent } = await import('@ocentra/eventing-domain/events/assets/UploadImageEvent');

    await Promise.all(validFiles.map(async (file) => {
      try {
        const blob = await file.arrayBuffer();
        const hash = await imageCache.calculateImageHash(new Blob([blob])) as ImageHash;

        const checkDeferred = new OperationDeferred<ResourceEntry | null>();
        await EventBus.instance.publishAsync(new GetResourceByHashEvent(hash, checkDeferred));
        const checkResult = await checkDeferred.promise;

        if (checkResult.isSuccess && checkResult.value) {
          hashMap.set(file.name, hash);
          if (LOG_DECK) log.logInfo(`[SmartUpload] Skipped upload for ${file.name} (Hash match)`, getStackTrace(), { hash }, LOG_DECK, BATCH_KEY_IMAGE_UPLOAD);
          return;
        }

        const bytes = new Uint8Array(blob);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64Content = btoa(binary);

        const uploadDeferred = new OperationDeferred<{ path: string }>();
        await EventBus.instance.publishAsync(new UploadImageEvent(hash, base64Content, uploadDeferred));
        await uploadDeferred.promise;

        hashMap.set(file.name, hash);
      } catch (err) {
        log.logError(`[SmartUpload] Failed to process file ${file.name}`, getStackTrace(), err);
      }
    }));

    return hashMap;
  }

  async mapImagesToCards(
    hashMap: Map<string, ImageHash>
  ): Promise<{ updated: number; warnings: string[] }> {
    const warnings: string[] = [];
    const hashMapEntries = Array.from(hashMap.entries());

    // Optimization: Build a lookup map for cardTemplates to avoid O(N^2)
    const templateLookupMap = new Map<string, AssetResourceEntry<Card>>();
    this.getDistinctCardTemplateRefs().forEach(ref => {
      if (ref.variant) templateLookupMap.set(ref.variant, ref);
      if (ref.displayName) templateLookupMap.set(ref.displayName, ref);
    });

    const cardMappings = hashMapEntries.map(([filename, hash]) => {
      const cardId = filename.replace(/\.png$/i, '');
      const cardRef = templateLookupMap.get(cardId);

      if (!cardRef) {
        warnings.push(`No card found for: ${filename}`);
        return null;
      }

      return { cardRef, cardId, hash, filename };
    }).filter((mapping): mapping is NonNullable<typeof mapping> => mapping !== null);

    const updateResults = await Promise.all(
      cardMappings.map(async ({ cardRef, cardId, hash, filename }) => {
        try {
          const card = await cardRef.load(Card);

          if (!card) {
            warnings.push(`Failed to load card for: ${filename}`);
            return 0;
          }

          if (card.imageHash !== hash) {
            const oldHash = card.imageHash;
            card.imageHash = hash;
            await card.saveChanges();

            if (LOG_DECK) {
              log.logInfo(`Updated card image: ${cardId}`, getStackTrace(), {
                hash,
                oldHash,
              }, LOG_DECK, BATCH_KEY_IMAGE_ASSIGNMENT);
            }

            return 1;
          }

          return 0;
        } catch (error) {
          log.logError(`Failed to update card: ${cardId}`, getStackTrace(), error, LOG_DECK);
          warnings.push(`Failed to update card: ${filename}`);
          return 0;
        }
      })
    );

    const updated = updateResults.reduce<number>((sum, count) => sum + count, 0);

    if (updated > 0) {
      await this.refreshCardTemplates();
    }

    return { updated, warnings };
  }

  async refreshCardTemplates(): Promise<void> {
    if (LOG_DECK) {
      log.logInfo(`[Deck] Refreshing card templates for ${this.name}`, getStackTrace(), {
        templateCount: this.getDistinctCardTemplateRefs().length
      }, LOG_DECK);
    }

    const currentTemplates = this.getDistinctCardTemplateRefs();
    const refreshedTemplates = await Promise.all(
      currentTemplates.map(async (ref) => {
        try {
          const card = await ref.load(Card);
          if (card) {
            return await AssetResourceEntryFactory.fromAssetWithAssetRegistry<Card>(card);
          }
          return ref;
        } catch (error) {
          log.logWarn(`[Deck] Failed to refresh card template`, getStackTrace(), {
            guid: ref.guid,
            error: error instanceof Error ? error.message : String(error)
          }, LOG_DECK);
          return ref;
        }
      })
    );

    if (this.cardComposition && this.cardComposition.length > 0) {
      const refreshedByKey = new Map<string, AssetResourceEntry<Card>>();
      for (const ref of refreshedTemplates) {
        const key = ref.guid || ref.path || ref.displayName || '';
        if (key) {
          refreshedByKey.set(key, ref);
        }
      }

      this.cardComposition = this.cardComposition.map((entry) => {
        const key = entry.cardTemplate.guid || entry.cardTemplate.path || entry.cardTemplate.displayName || '';
        const refreshed = key ? refreshedByKey.get(key) : undefined;
        return refreshed
          ? { ...entry, cardTemplate: refreshed }
          : entry;
      });
      return;
    }

    this.cardTemplates = refreshedTemplates;
  }

  static async create(context: AssetCreationContext): Promise<CreatedAsset> {
    const deferred = new OperationDeferred<string>();
    const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
    let guid: AssetGUIDType;
    if (!publishResult.isSuccess) {
      guid = createAssetGuid();
      log.logWarn('[Deck] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
        assetType: 'Deck',
        gameId: context.gameId,
        fallbackGuid: guid,
      });
    } else {
      const result = await deferred.promise;
      const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
      guid = (isAssetGUID(guidString) ? guidString : guidString) as AssetGUIDType;
      if (!result.isSuccess || !result.value) {
        log.logWarn('[Deck] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
          assetType: 'Deck',
          gameId: context.gameId,
          fallbackGuid: guid,
        });
      }
    }
    const assetId = `${context.gameId}Deck`;
    const data: Record<string, unknown> = {
      ...this.createTemplate(),
      name: assetId,
    };

    return {
      assetId,
      fileName: `${context.gameId}Deck.asset`,
      guid,
      data,
    };
  }
}
