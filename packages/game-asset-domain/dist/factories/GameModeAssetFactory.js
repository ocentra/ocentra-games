import { CardGameRules } from '../game/gameRules/CardGameRules.js';
import { Strategy } from '../game/strategy/Strategy.js';
import { CardGameScoring } from '../game/scoring/CardGameScoring.js';
import { GameInfo } from '../game/gameInfo/GameInfo.js';
import { CardGameLayout } from '../ui/layout/CardGameLayout.js';
import { ImageCarousel } from '../content/imageCarousel/ImageCarousel.js';
import { CardGameMode } from '../gameMode/cardGameMode/CardGameMode.js';
import { CardGameMechanics } from '../game/gameMechanics/CardGameMechanics.js';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { AssetPathSegment } from '@ocentra/asset-domain/utils/assetTypeUtils';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import { deserialize } from '@ocentra/asset-domain/Serializable';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { RegisterGuidEvent } from '@ocentra/eventing-domain/events/assets/RegisterGuidEvent';
import { GetGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetGameModeEntriesEvent';
import { UpdateGameRegistryViewEvent } from '@ocentra/eventing-domain/events/game/UpdateGameRegistryViewEvent';
import { buildCreateGameModeOptionsFromProcessedGame, getCardRankingReference, resolveDeckAssetByTriple, } from './ProcessedGameAssetFactory.js';
const log = MainAppLogger.instance;
const logInfo = (message, dataOrEnabled, enabled) => {
    if (typeof dataOrEnabled === 'boolean') {
        log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
    }
    else {
        log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
    }
};
const logWarn = (message, dataOrEnabled, enabled) => {
    if (typeof dataOrEnabled === 'boolean') {
        log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
    }
    else {
        log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
    }
};
const logError = (message, dataOrEnabled, enabled) => {
    if (typeof dataOrEnabled === 'boolean') {
        log.logError(message, getStackTrace(), undefined, dataOrEnabled);
    }
    else {
        log.logError(message, getStackTrace(), dataOrEnabled, enabled);
    }
};
const ASSET_EDITOR_RESOURCES_PATH = ['packages', 'asset-editor', 'Resources'];
const DEFAULT_DECK_TRIPLE = {
    deckType: 'Standard 52',
    suitSet: 'French',
    rankSet: 'Standard_52',
};
log.register(import.meta.url);
function applyDataOverrides(asset, overrides) {
    if (!overrides || Object.keys(overrides).length === 0) {
        return asset;
    }
    return {
        ...asset,
        data: {
            ...asset.data,
            ...overrides,
        },
    };
}
export class GameModeCreator {
    async createGameModeAssetsFromProcessedGame(processedGamePath, category = 'CardGames/Imported') {
        const createOptions = buildCreateGameModeOptionsFromProcessedGame({
            processedGamePath,
            category,
        });
        return this.createGameModeAssets(createOptions);
    }
    async createGameModeAssets(options) {
        const createdAssets = [];
        const normalizedGameId = options.gameId.toLowerCase();
        const timestamp = new Date().toISOString();
        const context = {
            gameId: normalizedGameId,
            displayName: options.displayName,
            category: options.category,
            timestamp,
        };
        try {
            const folder = this.getGameFolder(options.category, normalizedGameId);
            const basePath = join(process.cwd(), ...ASSET_EDITOR_RESOURCES_PATH, AssetPathSegment.GameMode, folder);
            if (!existsSync(basePath)) {
                await mkdir(basePath, { recursive: true });
            }
            const layoutAssetPath = `/${AssetPathSegment.GameMode}/${folder}/${normalizedGameId}Layout.asset`;
            const resolvedDeck = options.linkedDeckAsset
                ? null
                : resolveDeckAssetByTriple(DEFAULT_DECK_TRIPLE.deckType, DEFAULT_DECK_TRIPLE.suitSet, DEFAULT_DECK_TRIPLE.rankSet);
            const linkedDeckAsset = options.linkedDeckAsset ?? resolvedDeck?.linkedDeckAsset ?? null;
            if (!linkedDeckAsset) {
                throw new Error('No linked deck asset available for game mode creation');
            }
            const scoringOverrides = resolvedDeck
                ? {
                    cardRankingAsset: getCardRankingReference(resolvedDeck.deckEnvelope),
                    ...options.assetDataOverrides?.scoring,
                }
                : options.assetDataOverrides?.scoring;
            const rules = applyDataOverrides(await CardGameRules.create(context), options.assetDataOverrides?.rules);
            const strategy = applyDataOverrides(await Strategy.create(context), options.assetDataOverrides?.strategy);
            const scoring = applyDataOverrides(await CardGameScoring.create(context), scoringOverrides);
            const pageContent = applyDataOverrides(await GameInfo.create(context), options.assetDataOverrides?.gameInfo);
            const layout = applyDataOverrides(await CardGameLayout.create(context), options.assetDataOverrides?.layout);
            const carousel = applyDataOverrides(await ImageCarousel.create(context), options.assetDataOverrides?.carousel);
            const mechanics = applyDataOverrides(await CardGameMechanics.create(context), options.assetDataOverrides?.mechanics);
            const createEntry = (guid, type, displayName, path = '') => {
                const entry = AssetResourceEntry.fromGuid(guid, asAssetType(type), displayName);
                entry.path = path;
                return entry;
            };
            const carouselAssetPath = `/${AssetPathSegment.GameMode}/${folder}/${carousel.fileName}`;
            const mechanicsAssetPath = `/${AssetPathSegment.GameMode}/${folder}/${mechanics.fileName}`;
            const cardGameLinks = {
                rules: createEntry(rules.guid, 'CardGameRules', 'Game Rules'),
                strategy: createEntry(strategy.guid, 'Strategy', 'Strategy'),
                scoring: createEntry(scoring.guid, 'CardGameScoring', 'Scoring'),
                gameInfo: createEntry(pageContent.guid, 'GameInfo', 'Game Info'),
                layout: createEntry(layout.guid, 'CardGameLayout', 'Layout', layoutAssetPath),
                deck: linkedDeckAsset,
                carouselImages: createEntry(carousel.guid, 'ImageCarousel', 'Carousel Images', carouselAssetPath),
                mechanics: createEntry(mechanics.guid, 'CardGameMechanics', 'Mechanics', mechanicsAssetPath),
            };
            const cardGame = applyDataOverrides(await CardGameMode.create(context, cardGameLinks), options.assetDataOverrides?.cardGame);
            if (options.copyFromTemplate) {
                this.applyTemplateToCardGame(cardGame, options.copyFromTemplate);
            }
            const assetMap = [
                { asset: cardGame, constructor: CardGameMode },
                { asset: rules, constructor: CardGameRules },
                { asset: strategy, constructor: Strategy },
                { asset: scoring, constructor: CardGameScoring },
                { asset: pageContent, constructor: GameInfo },
                { asset: layout, constructor: CardGameLayout },
                { asset: carousel, constructor: ImageCarousel },
                { asset: mechanics, constructor: CardGameMechanics },
            ];
            for (const { asset, constructor } of assetMap) {
                const instance = deserialize(constructor, asset.data);
                instance.guid = AssetGUID.from(asset.guid);
                const markdown = instance.serialize();
                const plan = this.planAssetWrite(asset, folder);
                await writeFile(plan.absolutePath, markdown, 'utf8');
                createdAssets.push(plan.relativePath);
                await this.registerGuid(asset.guid);
            }
            await this.refreshGameRegistry();
            logInfo(`Created game mode ${normalizedGameId} with ${createdAssets.length} assets`);
            return {
                success: true,
                gameModePath: createdAssets[0] ?? '',
                createdAssets,
            };
        }
        catch (error) {
            logError(`Failed to create game mode ${normalizedGameId}:`, error);
            return {
                success: false,
                gameModePath: '',
                createdAssets,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    planAssetWrite(asset, folder) {
        const relativePath = `Resources/${AssetPathSegment.GameMode}/${folder}/${asset.fileName}`;
        const absolutePath = join(process.cwd(), ...ASSET_EDITOR_RESOURCES_PATH, AssetPathSegment.GameMode, folder, asset.fileName);
        return { asset, relativePath, absolutePath };
    }
    getGameFolder(category, gameId) {
        return `${category}/${gameId}`;
    }
    async registerGuid(guid) {
        const deferred = new OperationDeferred();
        await EventBus.instance.publishAsync(new RegisterGuidEvent(guid, deferred));
        await deferred.promise;
    }
    async refreshGameRegistry() {
        try {
            const getGameModeEntriesDeferred = new OperationDeferred();
            await EventBus.instance.publishAsync(new GetGameModeEntriesEvent(getGameModeEntriesDeferred));
            const result = await getGameModeEntriesDeferred.promise;
            if (result.isSuccess && result.value) {
                const updateViewDeferred = new OperationDeferred();
                await EventBus.instance.publishAsync(new UpdateGameRegistryViewEvent(result.value, updateViewDeferred));
                await updateViewDeferred.promise;
            }
        }
        catch (error) {
            logWarn('Failed to refresh GameRegistry:', error);
        }
    }
    applyTemplateToCardGame(cardGame, template) {
        if (!cardGame.data || typeof cardGame.data !== 'object') {
            return;
        }
        const data = cardGame.data;
        const copyableFields = [
            'baseBet',
            'initialPlayerCoins',
            'minRounds',
            'maxRounds',
            'turnDuration',
            'initialNumberOfCards',
            'maxNumberOfCards',
            'minDecks',
            'maxDecks',
            'minPlayers',
            'maxPlayers',
            'minHumanPlayers',
            'maxHumanPlayers',
            'supportsAI',
            'aiCountsAsPlayer',
            'releaseStatus',
            'bannerImage',
        ];
        const copiedFields = [];
        for (const field of copyableFields) {
            if (field in template && template[field] !== undefined) {
                data[field] = template[field];
                copiedFields.push(field);
            }
        }
        if (copiedFields.length > 0) {
            logInfo(`Copied ${copiedFields.length} fields from template: ${copiedFields.join(', ')}`);
        }
    }
}
export class GameModeAssetFactory {
    static instance = null;
    static getInstance() {
        if (!GameModeAssetFactory.instance) {
            GameModeAssetFactory.instance = new GameModeCreator();
        }
        return GameModeAssetFactory.instance;
    }
}
