import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { TurnBasedGameMode } from '@/gameMode/core/TurnBasedGameMode';
import { CardGameScoring } from '@/game/scoring/CardGameScoring';
import { CardGameRules } from '@/game/gameRules/CardGameRules';
import { TrumpBonusValues } from '@/game/gameRules/TrumpBonusValues';
import type { CardRanking } from '@/card/cardRanking/CardRanking';
import type { BaseBonusRule } from '@/game/rules/BaseBonusRule';
import { Strategy } from '@/game/strategy/Strategy';
import { GameInfo } from '@/game/gameInfo/GameInfo';
import { CardGameLayout } from '@/ui/layout/CardGameLayout';
import { ImageCarousel } from '@/content/imageCarousel/ImageCarousel';
import { Deck } from '@/card/deck/Deck';
import { DeckManager } from '@/deck/DeckManager';
import { CardGameMechanics } from '@/game/gameMechanics/CardGameMechanics';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { AssetResourceEntryFactory } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntryFactory';
import { AssetPathSegment, deriveCategoryFromAssetType } from '@ocentra/asset-domain/utils/assetTypeUtils';
import { GameModeStatus } from '@/constants/game-mode-status';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import type { AssetType } from '@ocentra/asset-domain/types/assetType';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '@/AssetCreation';
import type { AssetCreationContext, CreatedAsset } from '@/AssetCreation';
import type { PlayerAction } from '@ocentra/game-domain/types/game';
import type { GameId, AssetGUIDType, ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { asGameId, isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import type { GameHome } from '@/schemas/game-home-schema';
import type { GamePage } from '@/schemas/game-page-schema';
import type { GameEngine } from '@/schemas/game-engine-schema';
import type { CarouselSlide } from '@/content/imageCarousel/ImageCarousel';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { AssetLink } from '@/schemas/asset-link-schema';

function toAssetLink<T>(entry: AssetResourceEntry<T> | null | undefined): AssetLink | null {
  if (!entry) {
    return null;
  }

  return {
    resourceEntryType: 'AssetResourceEntry',
    path: entry.path ?? '',
    guid: entry.guid || undefined,
    checksum: entry.checksum ?? undefined,
    assetType: entry.assetType || undefined,
    displayName: entry.displayName || undefined,
    gameId: entry.gameId ?? null,
    category: entry.category ?? null,
    mimeType: entry.mimeType ?? null,
    fileSize: entry.fileSize ?? undefined,
    inheritanceChain: entry.inheritanceChain ?? null,
    variant: entry.variant ?? null,
  };
}

export interface CardGameAssetLinks {
  rules: AssetResourceEntry<CardGameRules>;
  strategy: AssetResourceEntry<Strategy>;
  scoring: AssetResourceEntry<CardGameScoring>;
  gameInfo: AssetResourceEntry<GameInfo>;
  layout: AssetResourceEntry<CardGameLayout>;
  deck: AssetResourceEntry<Deck>;
  carouselImages: AssetResourceEntry<ImageCarousel>;
  mechanics: AssetResourceEntry<CardGameMechanics>;
}

@serializableClass({
  assetType: 'CardGameMode',
  displayName: 'Card Game Mode',
  icon: '🃏',
  category: AssetTypeCategory.Game,
})
export class CardGameMode extends TurnBasedGameMode {
  constructor() {
    super();
    this.gameId = '' as GameId;
    this.gameModeCategory = deriveCategoryFromAssetType(CardGameMode.assetType!) || '';
    this.deckAsset = new AssetResourceEntry<Deck>(Deck.assetType! as AssetType);
    this.scoringAsset = new AssetResourceEntry<CardGameScoring>(CardGameScoring.assetType! as AssetType);
    this.gameRulesAsset = new AssetResourceEntry<CardGameRules>(CardGameRules.assetType! as AssetType);
    this.strategyAsset = new AssetResourceEntry<Strategy>(Strategy.assetType! as AssetType);
    this.gameInfoAsset = new AssetResourceEntry<GameInfo>(GameInfo.assetType! as AssetType);
    this.layoutAsset = new AssetResourceEntry<CardGameLayout>(CardGameLayout.assetType! as AssetType);
    this.carouselImagesAsset = new AssetResourceEntry<ImageCarousel>(ImageCarousel.assetType! as AssetType);
    this.mechanicsAsset = new AssetResourceEntry<CardGameMechanics>(CardGameMechanics.assetType! as AssetType);
  }

  static override createTemplate(): Record<string, unknown> {
    return {
      gameId: '',
      initialPlayerCoins: 10000,
      minRounds: 1,
      maxRounds: 10,
      turnDuration: 60,
      baseBet: 5,
      initialNumberOfCards: 3,
      maxNumberOfCards: 13,
      minDecks: 1,
      maxDecks: 1,
      scoringAsset: null,
      gameRulesAsset: null,
      strategyAsset: null,
      gameInfoAsset: null,
      layoutAsset: null,
      carouselImagesAsset: null,
      mechanicsAsset: null,
      minPlayers: 2,
      maxPlayers: 4,
      minHumanPlayers: 1,
      maxHumanPlayers: 4,
      supportsAI: true,
      aiCountsAsPlayer: true,
      useTrump: false,
      trumpBonusValues: null,
      releaseStatus: GameModeStatus.Available,
      bannerImage: '',
      gameIcon: '',
    };
  }

  @serializable({ label: 'Base Bet', group: 'Betting' })
  baseBet: number = 0;

  @serializable({ label: 'Initial Number of Cards', group: 'Card Settings' })
  initialNumberOfCards: number = 0;

  @serializable({ label: 'Max Cards In Hand', group: 'Card Settings' })
  maxNumberOfCards: number = 0;

  @serializable({ label: 'Min Decks', group: 'Card Settings' })
  minDecks: number = 1;

  @serializable({ label: 'Max Decks', group: 'Card Settings' })
  maxDecks: number = 1;

  @required('Scoring Asset is required for game mode to function')
  @serializable({ label: 'Scoring Asset', group: 'Asset References', elementType: AssetResourceEntry })
  override scoringAsset!: AssetResourceEntry<CardGameScoring>;

  @required('Game Rules Asset is required for game mode to function')
  @serializable({ label: 'Game Rules Asset', group: 'Asset References', elementType: AssetResourceEntry })
  override gameRulesAsset!: AssetResourceEntry<CardGameRules>;


  @required('Strategy Asset is required for game mode to function')
  @serializable({ label: 'Strategy Asset', group: 'Asset References', elementType: AssetResourceEntry })
  override strategyAsset!: AssetResourceEntry<Strategy>;

  @required('Game Info Asset is required for game mode to function')
  @serializable({ label: 'Game Info Asset', group: 'Asset References', elementType: AssetResourceEntry })
  override gameInfoAsset!: AssetResourceEntry<GameInfo>;

  @required('Deck Asset is required for card game mode to function')
  @serializable({ label: 'Deck Asset', group: 'Asset References', elementType: AssetResourceEntry })
  deckAsset!: AssetResourceEntry<Deck>;


  @required('Layout Asset is required for game mode to function')
  @serializable({ label: 'Layout Asset', group: 'Asset References', elementType: AssetResourceEntry })
  override layoutAsset!: AssetResourceEntry<CardGameLayout>;

  @required('Carousel Images Asset is required for game mode to function')
  @serializable({ label: 'Carousel Images Asset', group: 'Asset References', elementType: AssetResourceEntry })
  override carouselImagesAsset!: AssetResourceEntry<ImageCarousel>;

  @required('Mechanics Asset is required for game mode to function')
  @serializable({ label: 'Mechanics Asset', group: 'Asset References', elementType: AssetResourceEntry })
  override mechanicsAsset!: AssetResourceEntry<CardGameMechanics>;

  @serializable({ label: 'Min Players', group: 'Player Settings' })
  override minPlayers: number = 2;

  @serializable({ label: 'Max Players', group: 'Player Settings' })
  override maxPlayers: number = 4;

  @serializable({ label: 'Min Human Players', group: 'Player Settings' })
  override minHumanPlayers: number = 1;

  @serializable({ label: 'Max Human Players', group: 'Player Settings' })
  override maxHumanPlayers: number = 4;

  @serializable({ label: 'Supports AI', group: 'Player Settings' })
  override supportsAI: boolean = true;

  @serializable({ label: 'AI Counts As Player', group: 'Player Settings' })
  override aiCountsAsPlayer: boolean = true;

  @serializable({ label: 'Use Trump Cards', group: 'Card Rules' })
  useTrump: boolean = false;

  @serializable({ label: 'Trump Bonus Values', group: 'Card Rules' })
  trumpBonusValues?: TrumpBonusValues;

  @required('Game ID is required for game mode identification')
  gameId!: GameId;

  @required('Game Mode Category is required')
  override gameModeCategory!: string;

  protected override getGameId(): string {
    if (!this.gameId || this.gameId.trim() === '') {
      const log = MainAppLogger.instance;
      const LOG_CARD_GAME_MODE = false;
      log.logWarn('CardGameMode: gameId is not set, using fallback "card-game"', getStackTrace(), {}, LOG_CARD_GAME_MODE);
      return 'card-game' as GameId;
    }
    return this.gameId;
  }

  override isValidMove(action: PlayerAction, gameState: Record<string, unknown>): boolean {
    if (!action || !action.type || !action.playerId) {
      return false;
    }
    if (!gameState) {
      return false;
    }
    return true;
  }

  async getCardRanking(): Promise<CardRanking | null> {
    const scoring = await this.getScoringAsset();
    if (!scoring) return null;
    return scoring.getCardRanking();
  }

  async getScoringAsset(): Promise<CardGameScoring | null> {
    if (!this.scoringAsset) return null;
    const scoring = await this.scoringAsset.load(CardGameScoring);
    if (scoring instanceof CardGameScoring) {
      return scoring;
    }
    return null;
  }

  async loadBonusRules(): Promise<BaseBonusRule[]> {
    if (!this.gameRulesAsset) {
      return [];
    }
    const rules = await this.gameRulesAsset.load(CardGameRules);
    if (!rules || !(rules instanceof CardGameRules)) {
      return [];
    }
    const bonusRules = await rules.loadBonusRules();
    for (const rule of bonusRules) {
      await rule.initialize(this);
    }
    return bonusRules;
  }

  async getDeckAsset(): Promise<Deck | null> {
    if (this.deckAsset) {
      const deck = await this.deckAsset.load(Deck);
      if (deck) {
        return deck;
      }
    }

    try {
      const deckManager = await DeckManager.getOrCreateInstance();
      const defaultDeck = await deckManager.getDefaultDeck();
      
      if (defaultDeck) {
        this.deckAsset = AssetResourceEntryFactory.fromAsset<Deck>(defaultDeck);
      }

      return defaultDeck;
    } catch (error) {
      MainAppLogger.instance.logError('Failed to load default deck from DeckManager', getStackTrace(), error);
      return null;
    }
  }

  override async loadNestedAssets(): Promise<void> {
    await super.loadNestedAssets();
  }

  override onNestedAssetsLoaded(): void {
    super.onNestedAssetsLoaded();
  }

  protected onInitialize(): void {
    // CardGameMode-specific initialization
  }

  protected override onValidate(): boolean {
    return super.onValidate();
  }

  protected override onStart(): void {
    super.onStart();
    this.TryInitialize().catch((error) => {
      const log = MainAppLogger.instance;
      log.logError('Failed to initialize:', getStackTrace(), error);
    });
  }

  protected async TryInitialize(): Promise<boolean> {
    this.InitializeGameConfiguration();

    this.onInitialize();

    if (!this.onValidate()) {
      const log = MainAppLogger.instance;
      log.logError('Validation failed during initialization', getStackTrace());
      return false;
    }

    await this.saveChanges();

    return true;
  }

  protected InitializeGameConfiguration(): void {
    // GameMode base configuration
    if (this.releaseStatus === undefined) {
      this.releaseStatus = GameModeStatus.Available;
    }
    if (!this.bannerImage) {
      this.bannerImage = '' as ImageHash;
    }
    if (!this.gameIcon) {
      this.gameIcon = '' as ImageHash;
    }

    if (this.initialPlayerCoins === undefined) this.initialPlayerCoins = 10000;

    if (this.minRounds === undefined) this.minRounds = 1;
    if (this.turnDuration === undefined) this.turnDuration = 60;

    if (this.initialNumberOfCards === undefined) this.initialNumberOfCards = 3;
    if (this.maxNumberOfCards === undefined) this.maxNumberOfCards = 13;
    if (this.minDecks === undefined) this.minDecks = 1;
    if (this.maxDecks === undefined) this.maxDecks = 1;
    if (this.baseBet === undefined) this.baseBet = 5;
    if (this.minPlayers === undefined) this.minPlayers = 2;
    if (this.maxPlayers === undefined) this.maxPlayers = 4;
    if (this.minHumanPlayers === undefined) this.minHumanPlayers = 1;
    if (this.maxHumanPlayers === undefined) this.maxHumanPlayers = 4;
    if (this.supportsAI === undefined) this.supportsAI = true;
    if (this.aiCountsAsPlayer === undefined) this.aiCountsAsPlayer = true;
  }

  protected override onBeforeSave(): void {
    super.onBeforeSave();
  }

  override async getHome(): Promise<GameHome> {
    await this.readNestedAssetData([this.carouselImagesAsset, this.gameInfoAsset]);
    const baseData = await this.extractBaseMetadata();
    return {
      ...baseData,
      gameId: baseData.gameId,
      guid: baseData.guid,
      name: baseData.name,
      enabled: baseData.enabled,
      releaseStatus: baseData.releaseStatus,
      tags: baseData.tags,
      gameCategory: baseData.gameCategory,
      subcategory: baseData.subcategory ?? null,
      difficulty: baseData.difficulty,
      duration: baseData.duration,
      deck: baseData.deck,
      playersDisplay: baseData.playersDisplay,
      quality: baseData.quality,
      completeness: baseData.completeness ?? null,
    };
  }

  override async getPage(): Promise<GamePage> {
    await this.readNestedAssetData([this.carouselImagesAsset, this.gameInfoAsset]);
    const baseData = await this.extractBaseMetadata();
    const gameInfoEntry = this.gameInfoAsset as AssetResourceEntry<GameInfo> | null;
    const gameInfoGuid = gameInfoEntry?.guid ? (gameInfoEntry.guid as AssetGUIDType) : undefined;
    const sections = gameInfoEntry?.parsedData?.data?.sections as GameInfo['sections'] | undefined;
    return {
      ...baseData,
      gameId: baseData.gameId,
      guid: baseData.guid,
      name: baseData.name,
      enabled: baseData.enabled,
      releaseStatus: baseData.releaseStatus,
      tags: baseData.tags,
      minPlayers: (baseData.minPlayers && baseData.minPlayers > 0) ? baseData.minPlayers : 2,
      maxPlayers: (baseData.maxPlayers && baseData.maxPlayers > 0) ? baseData.maxPlayers : 4,
      gameInfoAsset: toAssetLink(gameInfoEntry) ?? undefined,
      gameInfoAssetGuid: gameInfoGuid,
      sections,
    };
  }

  override getEngine(): GameEngine {
    const gameIdRaw = this.getGameId();
    const gameId = asGameId(gameIdRaw);
    const gameModeGuid = this.guid ? (String(this.guid) as AssetGUIDType) : ('' as AssetGUIDType);
    const displayName = this.gameInfoAsset?.asset?.hero?.title || gameIdRaw;
    const enabled = this.releaseStatus !== GameModeStatus.Deprecated;
    const tags = this.gameInfoAsset?.asset?.tags && Array.isArray(this.gameInfoAsset.asset.tags) && this.gameInfoAsset.asset.tags.length > 0
      ? this.gameInfoAsset.asset.tags
      : undefined;
    return {
      gameId,
      guid: gameModeGuid,
      name: displayName,
      enabled,
      releaseStatus: this.releaseStatus,
      tags,
      gameRulesAsset: toAssetLink(this.gameRulesAsset),
      strategyAsset: toAssetLink(this.strategyAsset),
      scoringAsset: toAssetLink(this.scoringAsset),
      layoutAsset: toAssetLink(this.layoutAsset),
      mechanicsAsset: toAssetLink(this.mechanicsAsset),
    };
  }

  private async extractBaseMetadata(): Promise<{
    gameId: GameId;
    guid: AssetGUIDType;
    name: string;
    enabled: boolean;
    releaseStatus: GameModeStatus | undefined;
    tags: string[] | undefined;
    comingSoon: boolean | undefined;
    bannerImage: ImageHash | undefined;
    carouselImages: ImageHash[] | undefined;
    gameIcon: ImageHash | undefined;
    tagline: string | undefined;
    tagline2: string | undefined;
    shortDescription: string | undefined;
    description: string | undefined;
    textImageUrl: ImageHash | undefined;
    minPlayers: number | undefined;
    maxPlayers: number | undefined;
    carouselLastImageDurationMs: number | undefined;
    carouselFastRotationDurationMs: number | undefined;
    carouselDefaultRotationDurationMs: number | undefined;
    carouselFastRotationThreshold: number | undefined;
    carouselSlideTransitionDelayMs: number | undefined;
    gameCategory: string | undefined;
    subcategory: string | null | undefined;
    difficulty: string | undefined;
    duration: string | undefined;
    deck: string | undefined;
    playersDisplay: string | undefined;
    quality: string | undefined;
    completeness: Record<string, boolean> | null | undefined;
  }> {
    const log = MainAppLogger.instance;
    const logError = (message: string, data?: unknown, enabled?: boolean) => {
      log.logError(message, getStackTrace(), data, enabled);
    };
    const logInfo = (message: string, data?: unknown, enabled = true) => {
      if (enabled) {
        log.logInfo(message, getStackTrace(), data);
      }
    };
    const LOG_CAROUSEL_ASSET_LOADING = false;

    const gameIdRaw = this.getGameId();
    const gameId = asGameId(gameIdRaw);

    let minPlayers = this.minPlayers ?? 2;
    let maxPlayers = this.maxPlayers ?? 4;
    let description: string | undefined;
    let tags: string[] | undefined;
    let comingSoon = this.releaseStatus === GameModeStatus.ComingSoon;
    const enabled = this.releaseStatus !== GameModeStatus.Deprecated;
    let bannerImage: ImageHash | undefined;
    let carouselImages: ImageHash[] | undefined;
    let gameIcon: ImageHash | undefined;
    let tagline: string | undefined;
    let tagline2: string | undefined;
    let shortDescription: string | undefined;
    let textImageUrl: ImageHash | undefined;
    let carouselLastImageDurationMs: number | undefined;
    let carouselFastRotationDurationMs: number | undefined;
    let carouselDefaultRotationDurationMs: number | undefined;
    let carouselFastRotationThreshold: number | undefined;
    let carouselSlideTransitionDelayMs: number | undefined;
    let gameCategory: string | undefined;
    let subcategory: string | null | undefined;
    let difficulty: string | undefined;
    let duration: string | undefined;
    let deck: string | undefined;
    let playersDisplay: string | undefined;
    let quality: string | undefined;
    let completeness: Record<string, boolean> | null | undefined;

    if (this.bannerImage) {
      bannerImage = this.bannerImage;
    }

    if (this.gameIcon) {
      gameIcon = this.gameIcon;
    }

    logInfo('[CAROUSEL-ASSET] Checking carouselImagesAsset:', {
      gameId,
      hasCarouselImagesAsset: !!this.carouselImagesAsset,
      assetType: this.carouselImagesAsset?.constructor?.name,
      assetGuid: (this.carouselImagesAsset as unknown as { guid?: string })?.guid,
    }, LOG_CAROUSEL_ASSET_LOADING);

    const carouselData = this.carouselImagesAsset?.parsedData?.data || (this.carouselImagesAsset?.asset ? {
      slides: this.carouselImagesAsset.asset.slides,
      lastImageDurationMs: this.carouselImagesAsset.asset.lastImageDurationMs,
      fastRotationDurationMs: this.carouselImagesAsset.asset.fastRotationDurationMs,
      defaultRotationDurationMs: this.carouselImagesAsset.asset.defaultRotationDurationMs,
      fastRotationThreshold: this.carouselImagesAsset.asset.fastRotationThreshold,
      slideTransitionDelayMs: this.carouselImagesAsset.asset.slideTransitionDelayMs,
    } : null) as { slides?: CarouselSlide[]; lastImageDurationMs?: number; fastRotationDurationMs?: number; defaultRotationDurationMs?: number; fastRotationThreshold?: number; slideTransitionDelayMs?: number } | null;

    if (carouselData) {
      try {
        let imageEntries: CarouselSlide[] = [];

        const carousel = carouselData;
        logInfo('[CAROUSEL-ASSET] ImageCarousel detected:', {
          gameId,
          hasSlides: !!carousel.slides,
          slidesIsArray: Array.isArray(carousel.slides),
          slidesLength: Array.isArray(carousel.slides) ? carousel.slides.length : 0,
          slides: carousel.slides,
        }, LOG_CAROUSEL_ASSET_LOADING);

        if (carousel.slides && Array.isArray(carousel.slides)) {
          imageEntries = carousel.slides;
          logInfo('[CAROUSEL-ASSET] Using slides array:', {
            gameId,
            slidesCount: imageEntries.length,
            firstSlide: imageEntries[0],
          }, LOG_CAROUSEL_ASSET_LOADING);
        }

        logInfo('[CAROUSEL-ASSET] Image entries to process:', {
          gameId,
          entriesCount: imageEntries.length,
          entries: imageEntries,
        }, LOG_CAROUSEL_ASSET_LOADING);

        if (imageEntries.length > 0) {
          const carouselHashes = imageEntries
            .filter((img): img is CarouselSlide => !!img && !!img.imageHash)
            .map(img => img.imageHash as ImageHash);
          carouselImages = carouselHashes;

          logInfo('[CAROUSEL-ASSET] Carousel hashes extracted:', {
            gameId,
            hashCount: carouselImages.length,
            hashes: carouselImages,
          }, LOG_CAROUSEL_ASSET_LOADING);
        }

        if ((carousel as { lastImageDurationMs?: number }).lastImageDurationMs !== undefined) {
          carouselLastImageDurationMs = (carousel as { lastImageDurationMs: number }).lastImageDurationMs;
        }
        if ((carousel as { fastRotationDurationMs?: number }).fastRotationDurationMs !== undefined) {
          carouselFastRotationDurationMs = (carousel as { fastRotationDurationMs: number }).fastRotationDurationMs;
        }
        if ((carousel as { defaultRotationDurationMs?: number }).defaultRotationDurationMs !== undefined) {
          carouselDefaultRotationDurationMs = (carousel as { defaultRotationDurationMs: number }).defaultRotationDurationMs;
        }
        if ((carousel as { fastRotationThreshold?: number }).fastRotationThreshold !== undefined) {
          carouselFastRotationThreshold = (carousel as { fastRotationThreshold: number }).fastRotationThreshold;
        }
        if ((carousel as { slideTransitionDelayMs?: number }).slideTransitionDelayMs !== undefined) {
          carouselSlideTransitionDelayMs = (carousel as { slideTransitionDelayMs: number }).slideTransitionDelayMs;
        }
      } catch (error) {
        logError('Failed to process carouselImagesAsset:', error, false);
      }
    } else {
      logInfo('[CAROUSEL-ASSET] No carouselImagesAsset property found:', {
        gameId,
        carouselImagesAssetValue: this.carouselImagesAsset,
      }, LOG_CAROUSEL_ASSET_LOADING);
    }

    const gameInfoData = this.gameInfoAsset?.parsedData?.data || (this.gameInfoAsset?.asset ? {
      hero: this.gameInfoAsset.asset.hero,
      tagline: this.gameInfoAsset.asset.tagline,
      tagline2: this.gameInfoAsset.asset.tagline2,
      shortDescription: this.gameInfoAsset.asset.shortDescription,
      gameIconImage: this.gameInfoAsset.asset.gameIconImage,
      description: this.gameInfoAsset.asset.description,
      tags: this.gameInfoAsset.asset.tags,
      comingSoon: this.gameInfoAsset.asset.comingSoon,
      minPlayers: this.gameInfoAsset.asset.minPlayers,
      maxPlayers: this.gameInfoAsset.asset.maxPlayers,
      gameCategory: this.gameInfoAsset.asset.gameCategory,
      subcategory: this.gameInfoAsset.asset.subcategory,
      difficulty: this.gameInfoAsset.asset.difficulty,
      duration: this.gameInfoAsset.asset.duration,
      deck: this.gameInfoAsset.asset.deck,
      playersDisplay: this.gameInfoAsset.asset.playersDisplay,
      quality: this.gameInfoAsset.asset.quality,
      completeness: this.gameInfoAsset.asset.completeness,
    } : null);

    if (gameInfoData) {
      try {
        const gameInfo = gameInfoData;
        if ((gameInfo.hero as { subtitle?: string })?.subtitle) {
          tagline = (gameInfo.hero as { subtitle: string }).subtitle;
        } else if (gameInfo.tagline) {
          tagline = gameInfo.tagline as string;
        }
        if (gameInfo.tagline2) {
          tagline2 = gameInfo.tagline2 as string;
        }
        if (gameInfo.shortDescription) {
          shortDescription = gameInfo.shortDescription as string;
        }
        if (gameInfo.gameIconImage) {
          textImageUrl = gameInfo.gameIconImage as ImageHash;
        }
        if (gameInfo.description) {
          description = gameInfo.description as string;
        }
        if (gameInfo.tags && Array.isArray(gameInfo.tags) && gameInfo.tags.length > 0) {
          tags = gameInfo.tags as string[];
        }
        if (gameInfo.comingSoon !== undefined && !this.releaseStatus) {
          comingSoon = gameInfo.comingSoon as boolean;
        }
        if (gameInfo.minPlayers !== undefined && gameInfo.minPlayers !== null) {
          minPlayers = gameInfo.minPlayers as number;
        }
        if (gameInfo.maxPlayers !== undefined && gameInfo.maxPlayers !== null) {
          maxPlayers = gameInfo.maxPlayers as number;
        }
        if (gameInfo.gameCategory != null) gameCategory = String(gameInfo.gameCategory);
        if (gameInfo.subcategory != null) subcategory = gameInfo.subcategory as string | null;
        if (gameInfo.difficulty != null) difficulty = String(gameInfo.difficulty);
        if (gameInfo.duration != null) duration = String(gameInfo.duration);
        if (gameInfo.deck != null) deck = String(gameInfo.deck);
        if (gameInfo.playersDisplay != null) playersDisplay = String(gameInfo.playersDisplay);
        if (gameInfo.quality != null) quality = String(gameInfo.quality);
        if (gameInfo.completeness != null && typeof gameInfo.completeness === 'object') {
          completeness = gameInfo.completeness as Record<string, boolean>;
        }
      } catch (error) {
        logError('Failed to access gameInfoAsset:', error, false);
      }
    }

    const displayName = (gameInfoData?.hero as { title?: string })?.title || gameIdRaw;
    const gameModeGuid = this.guid ? String(this.guid) as AssetGUIDType : ('' as AssetGUIDType);

    return {
      gameId,
      guid: gameModeGuid,
      name: displayName,
      enabled,
      releaseStatus: this.releaseStatus,
      tags,
      comingSoon: comingSoon ?? false,
      bannerImage,
      carouselImages,
      gameIcon,
      tagline,
      tagline2,
      shortDescription,
      description,
      textImageUrl,
      minPlayers: minPlayers > 0 ? minPlayers : undefined,
      maxPlayers: maxPlayers > 0 ? maxPlayers : undefined,
      carouselLastImageDurationMs,
      carouselFastRotationDurationMs,
      carouselDefaultRotationDurationMs,
      carouselFastRotationThreshold,
      carouselSlideTransitionDelayMs,
      gameCategory,
      subcategory,
      difficulty,
      duration,
      deck,
      playersDisplay,
      quality,
      completeness,
    };
  }

  static async create(context: AssetCreationContext, links: CardGameAssetLinks): Promise<CreatedAsset> {
    const deferred = new OperationDeferred<string>();
    const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
    let guid: AssetGUIDType;
    if (!publishResult.isSuccess) {
      guid = createAssetGuid();
      const log = MainAppLogger.instance;
      log.logWarn('[CardGameMode] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
        assetType: 'CardGameMode',
        gameId: context.gameId,
        fallbackGuid: guid,
      });
    } else {
      const result = await deferred.promise;
      const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
      guid = (isAssetGUID(guidString) ? guidString : guidString) as AssetGUIDType;
      if (!result.isSuccess || !result.value) {
        const log = MainAppLogger.instance;
        log.logWarn('[CardGameMode] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
          assetType: 'CardGameMode',
          gameId: context.gameId,
          fallbackGuid: guid,
        });
      }
    }

    const category = deriveCategoryFromAssetType(CardGameMode.assetType!) || 'CardGames';
    const data: Record<string, unknown> = {
      ...this.createTemplate(),
      gameId: context.gameId,
      gameModeCategory: category,
      scoringAsset: links.scoring,
      gameRulesAsset: links.rules,
      strategyAsset: links.strategy,
      gameInfoAsset: links.gameInfo,
      layoutAsset: links.layout,
      deckAsset: links.deck,
      carouselImagesAsset: links.carouselImages,
      mechanicsAsset: links.mechanics,
      category,
      assetFolder: `${AssetPathSegment.GameMode}/${category}/${context.gameId}`,
    };

    return {
      assetId: context.gameId,
      fileName: `${context.gameId}.asset`,
      guid,
      data,
    };
  }
}
