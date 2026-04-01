var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CardGameMode_1;
import 'reflect-metadata';
import { serializable, serializableClass, required } from '@ocentra/asset-domain/serialization/decorators';
import { TurnBasedGameMode } from '../../gameMode/core/TurnBasedGameMode.js';
import { CardGameScoring } from '../../game/scoring/CardGameScoring.js';
import { CardGameRules } from '../../game/gameRules/CardGameRules.js';
import { TrumpBonusValues } from '../../game/gameRules/TrumpBonusValues.js';
import { Strategy } from '../../game/strategy/Strategy.js';
import { GameInfo } from '../../game/gameInfo/GameInfo.js';
import { CardGameLayout } from '../../ui/layout/CardGameLayout.js';
import { ImageCarousel } from '../../content/imageCarousel/ImageCarousel.js';
import { Deck } from '../../card/deck/Deck.js';
import { DeckManager } from '../../deck/DeckManager.js';
import { CardGameMechanics } from '../../game/gameMechanics/CardGameMechanics.js';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { AssetResourceEntryFactory } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntryFactory';
import { AssetPathSegment, deriveCategoryFromAssetType } from '@ocentra/asset-domain/utils/assetTypeUtils';
import { GameModeStatus } from '../../constants/game-mode-status.js';
import { AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GenerateUniqueGuidEvent } from '@ocentra/eventing-domain/events/assets/GenerateUniqueGuidEvent';
import { createAssetGuid } from '../../AssetCreation.js';
import { asGameId, isAssetGUID } from '@ocentra/asset-domain/types/assetIdentifier';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
function toAssetLink(entry) {
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
let CardGameMode = CardGameMode_1 = class CardGameMode extends TurnBasedGameMode {
    constructor() {
        super();
        this.gameId = '';
        this.gameModeCategory = deriveCategoryFromAssetType(CardGameMode_1.assetType) || '';
        this.deckAsset = new AssetResourceEntry(Deck.assetType);
        this.scoringAsset = new AssetResourceEntry(CardGameScoring.assetType);
        this.gameRulesAsset = new AssetResourceEntry(CardGameRules.assetType);
        this.strategyAsset = new AssetResourceEntry(Strategy.assetType);
        this.gameInfoAsset = new AssetResourceEntry(GameInfo.assetType);
        this.layoutAsset = new AssetResourceEntry(CardGameLayout.assetType);
        this.carouselImagesAsset = new AssetResourceEntry(ImageCarousel.assetType);
        this.mechanicsAsset = new AssetResourceEntry(CardGameMechanics.assetType);
    }
    static createTemplate() {
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
    baseBet = 0;
    initialNumberOfCards = 0;
    maxNumberOfCards = 0;
    minDecks = 1;
    maxDecks = 1;
    scoringAsset;
    gameRulesAsset;
    strategyAsset;
    gameInfoAsset;
    deckAsset;
    layoutAsset;
    carouselImagesAsset;
    mechanicsAsset;
    minPlayers = 2;
    maxPlayers = 4;
    minHumanPlayers = 1;
    maxHumanPlayers = 4;
    supportsAI = true;
    aiCountsAsPlayer = true;
    useTrump = false;
    trumpBonusValues;
    gameId;
    gameModeCategory;
    getGameId() {
        if (!this.gameId || this.gameId.trim() === '') {
            const log = MainAppLogger.instance;
            const LOG_CARD_GAME_MODE = false;
            log.logWarn('CardGameMode: gameId is not set, using fallback "card-game"', getStackTrace(), {}, LOG_CARD_GAME_MODE);
            return 'card-game';
        }
        return this.gameId;
    }
    isValidMove(action, gameState) {
        if (!action || !action.type || !action.playerId) {
            return false;
        }
        if (!gameState) {
            return false;
        }
        return true;
    }
    async getCardRanking() {
        const scoring = await this.getScoringAsset();
        if (!scoring)
            return null;
        return scoring.getCardRanking();
    }
    async getScoringAsset() {
        if (!this.scoringAsset)
            return null;
        const scoring = await this.scoringAsset.load(CardGameScoring);
        if (scoring instanceof CardGameScoring) {
            return scoring;
        }
        return null;
    }
    async loadBonusRules() {
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
    async getDeckAsset() {
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
                this.deckAsset = AssetResourceEntryFactory.fromAsset(defaultDeck);
            }
            return defaultDeck;
        }
        catch (error) {
            MainAppLogger.instance.logError('Failed to load default deck from DeckManager', getStackTrace(), error);
            return null;
        }
    }
    async loadNestedAssets() {
        await super.loadNestedAssets();
    }
    onNestedAssetsLoaded() {
        super.onNestedAssetsLoaded();
    }
    onInitialize() {
        // CardGameMode-specific initialization
    }
    onValidate() {
        return super.onValidate();
    }
    onStart() {
        super.onStart();
        this.TryInitialize().catch((error) => {
            const log = MainAppLogger.instance;
            log.logError('Failed to initialize:', getStackTrace(), error);
        });
    }
    async TryInitialize() {
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
    InitializeGameConfiguration() {
        // GameMode base configuration
        if (this.releaseStatus === undefined) {
            this.releaseStatus = GameModeStatus.Available;
        }
        if (!this.bannerImage) {
            this.bannerImage = '';
        }
        if (!this.gameIcon) {
            this.gameIcon = '';
        }
        if (this.initialPlayerCoins === undefined)
            this.initialPlayerCoins = 10000;
        if (this.minRounds === undefined)
            this.minRounds = 1;
        if (this.turnDuration === undefined)
            this.turnDuration = 60;
        if (this.initialNumberOfCards === undefined)
            this.initialNumberOfCards = 3;
        if (this.maxNumberOfCards === undefined)
            this.maxNumberOfCards = 13;
        if (this.minDecks === undefined)
            this.minDecks = 1;
        if (this.maxDecks === undefined)
            this.maxDecks = 1;
        if (this.baseBet === undefined)
            this.baseBet = 5;
        if (this.minPlayers === undefined)
            this.minPlayers = 2;
        if (this.maxPlayers === undefined)
            this.maxPlayers = 4;
        if (this.minHumanPlayers === undefined)
            this.minHumanPlayers = 1;
        if (this.maxHumanPlayers === undefined)
            this.maxHumanPlayers = 4;
        if (this.supportsAI === undefined)
            this.supportsAI = true;
        if (this.aiCountsAsPlayer === undefined)
            this.aiCountsAsPlayer = true;
    }
    onBeforeSave() {
        super.onBeforeSave();
    }
    async getHome() {
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
    async getPage() {
        await this.readNestedAssetData([this.carouselImagesAsset, this.gameInfoAsset]);
        const baseData = await this.extractBaseMetadata();
        const gameInfoEntry = this.gameInfoAsset;
        const gameInfoGuid = gameInfoEntry?.guid ? gameInfoEntry.guid : undefined;
        const sections = gameInfoEntry?.parsedData?.data?.sections;
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
    getEngine() {
        const gameIdRaw = this.getGameId();
        const gameId = asGameId(gameIdRaw);
        const gameModeGuid = this.guid ? String(this.guid) : '';
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
    async extractBaseMetadata() {
        const log = MainAppLogger.instance;
        const logError = (message, data, enabled) => {
            log.logError(message, getStackTrace(), data, enabled);
        };
        const logInfo = (message, data, enabled = true) => {
            if (enabled) {
                log.logInfo(message, getStackTrace(), data);
            }
        };
        const LOG_CAROUSEL_ASSET_LOADING = false;
        const gameIdRaw = this.getGameId();
        const gameId = asGameId(gameIdRaw);
        let minPlayers = this.minPlayers ?? 2;
        let maxPlayers = this.maxPlayers ?? 4;
        let description;
        let tags;
        let comingSoon = this.releaseStatus === GameModeStatus.ComingSoon;
        const enabled = this.releaseStatus !== GameModeStatus.Deprecated;
        let bannerImage;
        let carouselImages;
        let gameIcon;
        let tagline;
        let tagline2;
        let shortDescription;
        let textImageUrl;
        let carouselLastImageDurationMs;
        let carouselFastRotationDurationMs;
        let carouselDefaultRotationDurationMs;
        let carouselFastRotationThreshold;
        let carouselSlideTransitionDelayMs;
        let gameCategory;
        let subcategory;
        let difficulty;
        let duration;
        let deck;
        let playersDisplay;
        let quality;
        let completeness;
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
            assetGuid: this.carouselImagesAsset?.guid,
        }, LOG_CAROUSEL_ASSET_LOADING);
        const carouselData = this.carouselImagesAsset?.parsedData?.data || (this.carouselImagesAsset?.asset ? {
            slides: this.carouselImagesAsset.asset.slides,
            lastImageDurationMs: this.carouselImagesAsset.asset.lastImageDurationMs,
            fastRotationDurationMs: this.carouselImagesAsset.asset.fastRotationDurationMs,
            defaultRotationDurationMs: this.carouselImagesAsset.asset.defaultRotationDurationMs,
            fastRotationThreshold: this.carouselImagesAsset.asset.fastRotationThreshold,
            slideTransitionDelayMs: this.carouselImagesAsset.asset.slideTransitionDelayMs,
        } : null);
        if (carouselData) {
            try {
                let imageEntries = [];
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
                        .filter((img) => !!img && !!img.imageHash)
                        .map(img => img.imageHash);
                    carouselImages = carouselHashes;
                    logInfo('[CAROUSEL-ASSET] Carousel hashes extracted:', {
                        gameId,
                        hashCount: carouselImages.length,
                        hashes: carouselImages,
                    }, LOG_CAROUSEL_ASSET_LOADING);
                }
                if (carousel.lastImageDurationMs !== undefined) {
                    carouselLastImageDurationMs = carousel.lastImageDurationMs;
                }
                if (carousel.fastRotationDurationMs !== undefined) {
                    carouselFastRotationDurationMs = carousel.fastRotationDurationMs;
                }
                if (carousel.defaultRotationDurationMs !== undefined) {
                    carouselDefaultRotationDurationMs = carousel.defaultRotationDurationMs;
                }
                if (carousel.fastRotationThreshold !== undefined) {
                    carouselFastRotationThreshold = carousel.fastRotationThreshold;
                }
                if (carousel.slideTransitionDelayMs !== undefined) {
                    carouselSlideTransitionDelayMs = carousel.slideTransitionDelayMs;
                }
            }
            catch (error) {
                logError('Failed to process carouselImagesAsset:', error, false);
            }
        }
        else {
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
                if (gameInfo.hero?.subtitle) {
                    tagline = gameInfo.hero.subtitle;
                }
                else if (gameInfo.tagline) {
                    tagline = gameInfo.tagline;
                }
                if (gameInfo.tagline2) {
                    tagline2 = gameInfo.tagline2;
                }
                if (gameInfo.shortDescription) {
                    shortDescription = gameInfo.shortDescription;
                }
                if (gameInfo.gameIconImage) {
                    textImageUrl = gameInfo.gameIconImage;
                }
                if (gameInfo.description) {
                    description = gameInfo.description;
                }
                if (gameInfo.tags && Array.isArray(gameInfo.tags) && gameInfo.tags.length > 0) {
                    tags = gameInfo.tags;
                }
                if (gameInfo.comingSoon !== undefined && !this.releaseStatus) {
                    comingSoon = gameInfo.comingSoon;
                }
                if (gameInfo.minPlayers !== undefined && gameInfo.minPlayers !== null) {
                    minPlayers = gameInfo.minPlayers;
                }
                if (gameInfo.maxPlayers !== undefined && gameInfo.maxPlayers !== null) {
                    maxPlayers = gameInfo.maxPlayers;
                }
                if (gameInfo.gameCategory != null)
                    gameCategory = String(gameInfo.gameCategory);
                if (gameInfo.subcategory != null)
                    subcategory = gameInfo.subcategory;
                if (gameInfo.difficulty != null)
                    difficulty = String(gameInfo.difficulty);
                if (gameInfo.duration != null)
                    duration = String(gameInfo.duration);
                if (gameInfo.deck != null)
                    deck = String(gameInfo.deck);
                if (gameInfo.playersDisplay != null)
                    playersDisplay = String(gameInfo.playersDisplay);
                if (gameInfo.quality != null)
                    quality = String(gameInfo.quality);
                if (gameInfo.completeness != null && typeof gameInfo.completeness === 'object') {
                    completeness = gameInfo.completeness;
                }
            }
            catch (error) {
                logError('Failed to access gameInfoAsset:', error, false);
            }
        }
        const displayName = gameInfoData?.hero?.title || gameIdRaw;
        const gameModeGuid = this.guid ? String(this.guid) : '';
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
    static async create(context, links) {
        const deferred = new OperationDeferred();
        const publishResult = await EventBus.instance.publishAsync(new GenerateUniqueGuidEvent(deferred));
        let guid;
        if (!publishResult.isSuccess) {
            guid = createAssetGuid();
            const log = MainAppLogger.instance;
            log.logWarn('[CardGameMode] Event system unavailable, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                assetType: 'CardGameMode',
                gameId: context.gameId,
                fallbackGuid: guid,
            });
        }
        else {
            const result = await deferred.promise;
            const guidString = result.isSuccess && result.value ? result.value : createAssetGuid();
            guid = (isAssetGUID(guidString) ? guidString : guidString);
            if (!result.isSuccess || !result.value) {
                const log = MainAppLogger.instance;
                log.logWarn('[CardGameMode] GUID generation failed, using fallback GUID (not uniqueness-checked)', getStackTrace(), {
                    assetType: 'CardGameMode',
                    gameId: context.gameId,
                    fallbackGuid: guid,
                });
            }
        }
        const category = deriveCategoryFromAssetType(CardGameMode_1.assetType) || 'CardGames';
        const data = {
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
};
__decorate([
    serializable({ label: 'Base Bet', group: 'Betting' }),
    __metadata("design:type", Number)
], CardGameMode.prototype, "baseBet", void 0);
__decorate([
    serializable({ label: 'Initial Number of Cards', group: 'Card Settings' }),
    __metadata("design:type", Number)
], CardGameMode.prototype, "initialNumberOfCards", void 0);
__decorate([
    serializable({ label: 'Max Cards In Hand', group: 'Card Settings' }),
    __metadata("design:type", Number)
], CardGameMode.prototype, "maxNumberOfCards", void 0);
__decorate([
    serializable({ label: 'Min Decks', group: 'Card Settings' }),
    __metadata("design:type", Number)
], CardGameMode.prototype, "minDecks", void 0);
__decorate([
    serializable({ label: 'Max Decks', group: 'Card Settings' }),
    __metadata("design:type", Number)
], CardGameMode.prototype, "maxDecks", void 0);
__decorate([
    required('Scoring Asset is required for game mode to function'),
    serializable({ label: 'Scoring Asset', group: 'Asset References', elementType: AssetResourceEntry }),
    __metadata("design:type", AssetResourceEntry)
], CardGameMode.prototype, "scoringAsset", void 0);
__decorate([
    required('Game Rules Asset is required for game mode to function'),
    serializable({ label: 'Game Rules Asset', group: 'Asset References', elementType: AssetResourceEntry }),
    __metadata("design:type", AssetResourceEntry)
], CardGameMode.prototype, "gameRulesAsset", void 0);
__decorate([
    required('Strategy Asset is required for game mode to function'),
    serializable({ label: 'Strategy Asset', group: 'Asset References', elementType: AssetResourceEntry }),
    __metadata("design:type", AssetResourceEntry)
], CardGameMode.prototype, "strategyAsset", void 0);
__decorate([
    required('Game Info Asset is required for game mode to function'),
    serializable({ label: 'Game Info Asset', group: 'Asset References', elementType: AssetResourceEntry }),
    __metadata("design:type", AssetResourceEntry)
], CardGameMode.prototype, "gameInfoAsset", void 0);
__decorate([
    required('Deck Asset is required for card game mode to function'),
    serializable({ label: 'Deck Asset', group: 'Asset References', elementType: AssetResourceEntry }),
    __metadata("design:type", AssetResourceEntry)
], CardGameMode.prototype, "deckAsset", void 0);
__decorate([
    required('Layout Asset is required for game mode to function'),
    serializable({ label: 'Layout Asset', group: 'Asset References', elementType: AssetResourceEntry }),
    __metadata("design:type", AssetResourceEntry)
], CardGameMode.prototype, "layoutAsset", void 0);
__decorate([
    required('Carousel Images Asset is required for game mode to function'),
    serializable({ label: 'Carousel Images Asset', group: 'Asset References', elementType: AssetResourceEntry }),
    __metadata("design:type", AssetResourceEntry)
], CardGameMode.prototype, "carouselImagesAsset", void 0);
__decorate([
    required('Mechanics Asset is required for game mode to function'),
    serializable({ label: 'Mechanics Asset', group: 'Asset References', elementType: AssetResourceEntry }),
    __metadata("design:type", AssetResourceEntry)
], CardGameMode.prototype, "mechanicsAsset", void 0);
__decorate([
    serializable({ label: 'Min Players', group: 'Player Settings' }),
    __metadata("design:type", Number)
], CardGameMode.prototype, "minPlayers", void 0);
__decorate([
    serializable({ label: 'Max Players', group: 'Player Settings' }),
    __metadata("design:type", Number)
], CardGameMode.prototype, "maxPlayers", void 0);
__decorate([
    serializable({ label: 'Min Human Players', group: 'Player Settings' }),
    __metadata("design:type", Number)
], CardGameMode.prototype, "minHumanPlayers", void 0);
__decorate([
    serializable({ label: 'Max Human Players', group: 'Player Settings' }),
    __metadata("design:type", Number)
], CardGameMode.prototype, "maxHumanPlayers", void 0);
__decorate([
    serializable({ label: 'Supports AI', group: 'Player Settings' }),
    __metadata("design:type", Boolean)
], CardGameMode.prototype, "supportsAI", void 0);
__decorate([
    serializable({ label: 'AI Counts As Player', group: 'Player Settings' }),
    __metadata("design:type", Boolean)
], CardGameMode.prototype, "aiCountsAsPlayer", void 0);
__decorate([
    serializable({ label: 'Use Trump Cards', group: 'Card Rules' }),
    __metadata("design:type", Boolean)
], CardGameMode.prototype, "useTrump", void 0);
__decorate([
    serializable({ label: 'Trump Bonus Values', group: 'Card Rules' }),
    __metadata("design:type", TrumpBonusValues)
], CardGameMode.prototype, "trumpBonusValues", void 0);
__decorate([
    required('Game ID is required for game mode identification'),
    __metadata("design:type", String)
], CardGameMode.prototype, "gameId", void 0);
__decorate([
    required('Game Mode Category is required'),
    __metadata("design:type", String)
], CardGameMode.prototype, "gameModeCategory", void 0);
CardGameMode = CardGameMode_1 = __decorate([
    serializableClass({
        assetType: 'CardGameMode',
        displayName: 'Card Game Mode',
        icon: '🃏',
        category: AssetTypeCategory.Game,
    }),
    __metadata("design:paramtypes", [])
], CardGameMode);
export { CardGameMode };
