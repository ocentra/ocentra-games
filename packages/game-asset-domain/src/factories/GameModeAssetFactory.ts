import { CardGameRules } from '../game/gameRules/CardGameRules';
import { Strategy } from '../game/strategy/Strategy';
import { CardGameScoring } from '../game/scoring/CardGameScoring';
import { GameInfo } from '../game/gameInfo/GameInfo';
import { CardGameLayout } from '../ui/layout/CardGameLayout';
import { PageLayout, type PageLayoutDocument } from '../ui/pageLayout/PageLayout';
import { Deck } from '../card/deck/Deck';
import { ImageCarousel } from '../content/imageCarousel/ImageCarousel';
import { CardGameMode, type CardGameAssetLinks } from '../gameMode/cardGameMode/CardGameMode';
import { CardGameMechanics } from '../game/gameMechanics/CardGameMechanics';
import {
  CardGameDeckModel,
  GameActionSet,
  GamePhaseFlowModel,
  GamePlayerModel,
  GameSessionModel,
  GameStateEventModel,
  GameValidationFixtures,
  GameZoneModel,
  type GameMechanicsModelRefKey,
} from '../game/gameMechanics/GameMechanicsModel';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { GameMode } from '../gameMode/core/GameMode';
import { AssetPathSegment } from '@ocentra/asset-domain/utils/assetTypeUtils';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import { generateAssetGuid, type AssetCreationContext, type CreatedAsset } from '../AssetCreation';
import { deserialize } from '@ocentra/asset-domain/Serializable';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import type { SerializableConstructor } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
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
import {
  buildCreateGameModeOptionsFromProcessedGame,
  getCardRankingReference,
  resolveDeckAssetByTriple,
} from './ProcessedGameAssetFactory';
import type { ProcessedGameTaxonomyPath } from './ProcessedGameTaxonomyPath';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const ASSET_EDITOR_RESOURCES_PATH = ['packages', 'asset-editor', 'Resources'] as const;
const DEFAULT_DECK_TRIPLE = {
  deckType: 'Standard 52',
  suitSet: 'French',
  rankSet: 'Standard_52',
} as const;

log.register(import.meta.url);

export interface CreateGameModeOptions {
  gameId: string;
  displayName: string;
  category: ProcessedGameTaxonomyPath;
  copyFromTemplate?: Record<string, unknown>;
  assetDataOverrides?: Partial<Record<'rules' | 'strategy' | 'scoring' | 'gameInfo' | 'layout' | 'deck' | 'carousel' | 'mechanics' | 'cardGame', Record<string, unknown>>>;
  mechanicsModelDataOverrides?: Partial<Record<GameMechanicsModelRefKey, Record<string, unknown>>>;
  linkedDeckAsset?: AssetResourceEntry<Deck>;
}

interface AssetWritePlan {
  asset: CreatedAsset;
  relativePath: string;
  absolutePath: string;
}

interface CreateResult {
  success: boolean;
  gameModePath: string;
  createdAssets: string[];
  error?: string;
}

interface MechanicsModelCreation {
  key: GameMechanicsModelRefKey;
  asset: CreatedAsset;
  assetType: string;
  displayName: string;
}

function applyDataOverrides(asset: CreatedAsset, overrides: Record<string, unknown> | undefined): CreatedAsset {
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

async function createPageLayoutAsset(
  context: AssetCreationContext,
  kind: 'selected-game' | 'lobby',
  layoutPath: string,
  gameModePath: string,
  gameModeGuid = '',
): Promise<CreatedAsset> {
  const fileSuffix = kind === 'selected-game' ? 'SelectedGameLayout' : 'LobbyLayout';
  const title = `${context.displayName} ${kind === 'selected-game' ? 'Selected Game' : 'Lobby'}`;
  const sliceId = kind === 'selected-game' ? 'selected-game-showcase' : 'lobby-shell';
  const document: PageLayoutDocument = {
    pageId: `${context.gameId}-${kind === 'selected-game' ? 'selected-game' : 'lobby'}`,
    routePath: kind === 'selected-game' ? `/games/${context.gameId}` : `/games/${context.gameId}/lobby`,
    title,
    kind,
    slices: [
      {
        id: sliceId,
        type: kind === 'selected-game' ? 'selected-game' : 'custom',
        enabled: true,
        order: 10,
        title,
        sourceAssetPath: kind === 'selected-game' ? gameModePath : `${layoutPath}#${sliceId}`,
        controlsAssetPath: `${layoutPath}#${sliceId}`,
      },
    ],
    layout: {
      type: 'custom',
      sections: [
        { id: sliceId, type: kind === 'selected-game' ? 'selected-game' : 'custom', order: 10 },
      ],
    },
    preview: {
      sampleGameRef: {
        gameId: context.gameId,
        guid: gameModeGuid,
        path: gameModePath,
      },
    },
  };

  return {
    assetId: `${context.gameId}-${kind}-layout`,
    fileName: `${context.gameId}${fileSuffix}.asset`,
    guid: await generateAssetGuid('PageLayout', context.gameId),
    data: document as unknown as Record<string, unknown>,
  };
}

function bindPageLayoutToGame(asset: CreatedAsset, gameId: string, gameModeGuid: string, gameModePath: string): void {
  const data = asset.data as unknown as PageLayoutDocument;
  data.preview = {
    ...(data.preview ?? {}),
    sampleGameRef: {
      gameId,
      guid: gameModeGuid,
      path: gameModePath,
    },
  };
}

export class GameModeCreator {
  async createGameModeAssetsFromProcessedGame(processedGamePath: string, category?: ProcessedGameTaxonomyPath): Promise<CreateResult> {
    const createOptions = buildCreateGameModeOptionsFromProcessedGame({
      processedGamePath,
      category,
    });
    return this.createGameModeAssets(createOptions);
  }

  async createGameModeAssets(options: CreateGameModeOptions): Promise<CreateResult> {
    const createdAssets: string[] = [];
    const normalizedGameId = options.gameId.toLowerCase();
    const timestamp = new Date().toISOString();
    const context: AssetCreationContext = {
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
        : resolveDeckAssetByTriple(
          DEFAULT_DECK_TRIPLE.deckType,
          DEFAULT_DECK_TRIPLE.suitSet,
          DEFAULT_DECK_TRIPLE.rankSet,
        );
      const linkedDeckAsset = options.linkedDeckAsset ?? resolvedDeck?.linkedDeckAsset ?? null;
      if (!linkedDeckAsset) {
        throw new Error('No linked deck asset available for game mode creation');
      }
      const scoringOverrides = resolvedDeck
        ? {
          rankingAsset: getCardRankingReference(resolvedDeck.deckEnvelope),
          ...options.assetDataOverrides?.scoring,
        }
        : options.assetDataOverrides?.scoring;

      const rules = applyDataOverrides(await CardGameRules.create(context), options.assetDataOverrides?.rules);
      const strategy = applyDataOverrides(await Strategy.create(context), options.assetDataOverrides?.strategy);
      const scoring = applyDataOverrides(await CardGameScoring.create(context), scoringOverrides);
      const pageContent = applyDataOverrides(await GameInfo.create(context), options.assetDataOverrides?.gameInfo);
      const layout = applyDataOverrides(await CardGameLayout.create(context), options.assetDataOverrides?.layout);
      const carousel = applyDataOverrides(await ImageCarousel.create(context), options.assetDataOverrides?.carousel);
      const mechanicsModels = await this.createMechanicsModelAssets(context, options.mechanicsModelDataOverrides);
      const mechanicsModelRefs = this.createMechanicsModelRefs(mechanicsModels, folder);
      const mechanics = applyDataOverrides(
        await CardGameMechanics.create(context, {
          modelRefs: mechanicsModelRefs,
        }),
        options.assetDataOverrides?.mechanics,
      );

      const createEntry = <T extends ScriptableObject>(guid: string, type: string, displayName: string, path: string = ''): AssetResourceEntry<T> => {
        const entry = AssetResourceEntry.fromGuid<T>(guid, asAssetType(type), displayName);
        entry.path = path;
        return entry;
      };

      const carouselAssetPath = `/${AssetPathSegment.GameMode}/${folder}/${carousel.fileName}`;
      const mechanicsAssetPath = `/${AssetPathSegment.GameMode}/${folder}/${mechanics.fileName}`;
      const gameModeAssetPath = `Resources/${AssetPathSegment.GameMode}/${folder}/${normalizedGameId}.asset`;
      const selectedGameLayoutPath = `Resources/${AssetPathSegment.GameMode}/${folder}/${normalizedGameId}SelectedGameLayout.asset`;
      const lobbyLayoutPath = `Resources/${AssetPathSegment.GameMode}/${folder}/${normalizedGameId}LobbyLayout.asset`;
      const selectedGameLayout = await createPageLayoutAsset(context, 'selected-game', selectedGameLayoutPath, gameModeAssetPath);
      const lobbyLayout = await createPageLayoutAsset(context, 'lobby', lobbyLayoutPath, gameModeAssetPath);

      const cardGameLinks = {
        rules: createEntry<CardGameRules>(rules.guid, 'CardGameRules', 'Game Rules'),
        strategy: createEntry<Strategy>(strategy.guid, 'Strategy', 'Strategy'),
        scoring: createEntry<CardGameScoring>(scoring.guid, 'CardGameScoring', 'Scoring'),
        gameInfo: createEntry<GameInfo>(pageContent.guid, 'GameInfo', 'Game Info'),
        layout: createEntry<CardGameLayout>(layout.guid, 'CardGameLayout', 'Layout', layoutAssetPath),
        selectedGameLayout: createEntry<PageLayout>(selectedGameLayout.guid, 'PageLayout', `${options.displayName} Selected Page Layout`, selectedGameLayoutPath),
        lobbyLayout: createEntry<PageLayout>(lobbyLayout.guid, 'PageLayout', `${options.displayName} Lobby Layout`, lobbyLayoutPath),
        deck: linkedDeckAsset,
        carouselImages: createEntry<ImageCarousel>(carousel.guid, 'ImageCarousel', 'Carousel Images', carouselAssetPath),
        mechanics: createEntry<CardGameMechanics>(mechanics.guid, 'CardGameMechanics', 'Mechanics', mechanicsAssetPath),
      } satisfies CardGameAssetLinks;

      const cardGame = applyDataOverrides(await CardGameMode.create(context, cardGameLinks), options.assetDataOverrides?.cardGame);

      if (options.copyFromTemplate) {
        this.applyTemplateToCardGame(cardGame, options.copyFromTemplate);
      }

      bindPageLayoutToGame(selectedGameLayout, normalizedGameId, cardGame.guid, gameModeAssetPath);
      bindPageLayoutToGame(lobbyLayout, normalizedGameId, cardGame.guid, gameModeAssetPath);
      (cardGame.data as Record<string, unknown>).selectedGameLayoutAsset = cardGameLinks.selectedGameLayout;
      (cardGame.data as Record<string, unknown>).lobbyLayoutAsset = cardGameLinks.lobbyLayout;

      const assetMap: Array<{ asset: CreatedAsset; constructor: SerializableConstructor }> = [
        { asset: cardGame, constructor: CardGameMode },
        { asset: rules, constructor: CardGameRules },
        { asset: strategy, constructor: Strategy },
        { asset: scoring, constructor: CardGameScoring },
        { asset: pageContent, constructor: GameInfo },
        { asset: layout, constructor: CardGameLayout },
        { asset: selectedGameLayout, constructor: PageLayout },
        { asset: lobbyLayout, constructor: PageLayout },
        { asset: carousel, constructor: ImageCarousel },
        ...mechanicsModels.map(({ asset, assetType }) => ({
          asset,
          constructor: this.getMechanicsModelConstructor(assetType),
        })),
        { asset: mechanics, constructor: CardGameMechanics },
      ];

      for (const { asset, constructor } of assetMap) {
        const instance = deserialize(constructor, asset.data) as ScriptableObject & { guid: AssetGUID };
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
    } catch (error) {
      logError(`Failed to create game mode ${normalizedGameId}:`, error);
      return {
        success: false,
        gameModePath: '',
        createdAssets,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private planAssetWrite(asset: CreatedAsset, folder: string): AssetWritePlan {
    const relativePath = `Resources/${AssetPathSegment.GameMode}/${folder}/${asset.fileName}`;
    const absolutePath = join(
      process.cwd(),
      ...ASSET_EDITOR_RESOURCES_PATH,
      AssetPathSegment.GameMode,
      folder,
      asset.fileName
    );
    return { asset, relativePath, absolutePath };
  }

  private async createMechanicsModelAssets(
    context: AssetCreationContext,
    overrides: Partial<Record<GameMechanicsModelRefKey, Record<string, unknown>>> | undefined,
  ): Promise<MechanicsModelCreation[]> {
    return [
      {
        key: 'player',
        asset: await GamePlayerModel.create(context, overrides?.player),
        assetType: 'GamePlayerModel',
        displayName: 'Player Model',
      },
      {
        key: 'session',
        asset: await GameSessionModel.create(context, overrides?.session),
        assetType: 'GameSessionModel',
        displayName: 'Session Model',
      },
      {
        key: 'deck',
        asset: await CardGameDeckModel.create(context, overrides?.deck),
        assetType: 'CardGameDeckModel',
        displayName: 'Deck Model',
      },
      {
        key: 'zones',
        asset: await GameZoneModel.create(context, overrides?.zones),
        assetType: 'GameZoneModel',
        displayName: 'Zone Model',
      },
      {
        key: 'phaseFlow',
        asset: await GamePhaseFlowModel.create(context, overrides?.phaseFlow),
        assetType: 'GamePhaseFlowModel',
        displayName: 'Phase Flow Model',
      },
      {
        key: 'actions',
        asset: await GameActionSet.create(context, overrides?.actions),
        assetType: 'GameActionSet',
        displayName: 'Action Set',
      },
      {
        key: 'stateEvents',
        asset: await GameStateEventModel.create(context, overrides?.stateEvents),
        assetType: 'GameStateEventModel',
        displayName: 'State Event Model',
      },
      {
        key: 'validation',
        asset: await GameValidationFixtures.create(context, overrides?.validation),
        assetType: 'GameValidationFixtures',
        displayName: 'Validation Fixtures',
      },
    ];
  }

  private createMechanicsModelRefs(
    models: readonly MechanicsModelCreation[],
    folder: string,
  ): Record<GameMechanicsModelRefKey, { path: string; guid: string; assetType: string; displayName: string }> {
    return models.reduce((refs, model) => ({
      ...refs,
      [model.key]: {
        path: `Resources/${AssetPathSegment.GameMode}/${folder}/${model.asset.fileName}`,
        guid: model.asset.guid,
        assetType: model.assetType,
        displayName: model.displayName,
      },
    }), {} as Record<GameMechanicsModelRefKey, { path: string; guid: string; assetType: string; displayName: string }>);
  }

  private getMechanicsModelConstructor(assetType: string): SerializableConstructor {
    switch (assetType) {
      case 'GamePlayerModel':
        return GamePlayerModel;
      case 'GameSessionModel':
        return GameSessionModel;
      case 'CardGameDeckModel':
        return CardGameDeckModel;
      case 'GameZoneModel':
        return GameZoneModel;
      case 'GamePhaseFlowModel':
        return GamePhaseFlowModel;
      case 'GameActionSet':
        return GameActionSet;
      case 'GameStateEventModel':
        return GameStateEventModel;
      case 'GameValidationFixtures':
        return GameValidationFixtures;
      default:
        throw new Error(`Unsupported mechanics model asset type: ${assetType}`);
    }
  }

  private getGameFolder(category: ProcessedGameTaxonomyPath, gameId: string): string {
    return `${category}/${gameId}`;
  }

  private async registerGuid(guid: string): Promise<void> {
    const deferred = new OperationDeferred<boolean>();
    await EventBus.instance.publishAsync(new RegisterGuidEvent(guid, deferred));
    await deferred.promise;
  }

  private async refreshGameRegistry(): Promise<void> {
    try {
      const getGameModeEntriesDeferred = new OperationDeferred<AssetResourceEntry<GameMode>[]>();
      await EventBus.instance.publishAsync(new GetGameModeEntriesEvent(getGameModeEntriesDeferred));
      const result = await getGameModeEntriesDeferred.promise;

      if (result.isSuccess && result.value) {
        const updateViewDeferred = new OperationDeferred<boolean>();
        await EventBus.instance.publishAsync(new UpdateGameRegistryViewEvent(result.value, updateViewDeferred));
        await updateViewDeferred.promise;
      }
    } catch (error) {
      logWarn('Failed to refresh GameRegistry:', error);
    }
  }

  private applyTemplateToCardGame(cardGame: CreatedAsset, template: Record<string, unknown>): void {
    if (!cardGame.data || typeof cardGame.data !== 'object') {
      return;
    }

    const data = cardGame.data as Record<string, unknown>;

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

    const copiedFields: string[] = [];
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
  private static instance: GameModeCreator | null = null;

  static getInstance(): GameModeCreator {
    if (!GameModeAssetFactory.instance) {
      GameModeAssetFactory.instance = new GameModeCreator();
    }
    return GameModeAssetFactory.instance;
  }
}
