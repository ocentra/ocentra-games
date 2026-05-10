import JSON5 from 'json5';
import { AssetTypeCategory, MimeTypes } from '@ocentra/asset-domain/constants/assets';
import type { AssetMetadata } from '@ocentra/boundary-domain/types/asset-metadata';
import { CardGameRules } from '@ocentra/game-asset-domain/game/gameRules/CardGameRules';
import { Strategy } from '@ocentra/game-asset-domain/game/strategy/Strategy';
import { CardGameScoring } from '@ocentra/game-asset-domain/game/scoring/CardGameScoring';
import { GameInfo } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import { CardGameLayout } from '@ocentra/game-asset-domain/ui/layout/CardGameLayout';
import { PageLayout, type PageLayoutDocument } from '@ocentra/game-asset-domain/ui/pageLayout/PageLayout';
import { Deck } from '@ocentra/game-asset-domain/card/deck/Deck';
import { ImageCarousel } from '@ocentra/game-asset-domain/content/imageCarousel/ImageCarousel';
import { CardGameMode, type CardGameAssetLinks } from '@ocentra/game-asset-domain/gameMode/cardGameMode/CardGameMode';
import { CardGameMechanics } from '@ocentra/game-asset-domain/game/gameMechanics/CardGameMechanics';
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
} from '@ocentra/game-asset-domain/game/gameMechanics/GameMechanicsModel';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import { generateAssetGuid, type CreatedAsset, type AssetCreationContext } from '@ocentra/game-asset-domain/AssetCreation';
import { getSerializableClassMetadata, type SerializableConstructor } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { tryGameId, type AssetChecksum } from '@ocentra/asset-domain/types/assetIdentifier';
import { createStandard52CardRankingEntry, createStandard52CardRankingReference, createStandard52DeckEntry } from '@/adapters/assets/gameModeAssetDefaults';

export interface CreateGameModeBundleOptions {
  gameId: string;
  displayName: string;
  category: string;
  copyFromTemplate?: Record<string, unknown>;
  assetDataOverrides?: Partial<Record<'rules' | 'strategy' | 'scoring' | 'gameInfo' | 'layout' | 'selectedGameLayout' | 'lobbyLayout' | 'deck' | 'carousel' | 'mechanics' | 'cardGame', Record<string, unknown>>>;
  mechanicsModelDataOverrides?: Partial<Record<GameMechanicsModelRefKey, Record<string, unknown>>>;
  linkedDeckAsset?: AssetResourceEntry<Deck>;
}

export interface CreateProcessedGameModeBundleOptions {
  processedGamePath: string;
  category?: string;
}

export interface GameModeBundleFile {
  guid: string;
  path: string;
  content: string;
  metadata: AssetMetadata;
  checksum: string;
}

export interface GameModeBundle {
  mainAssetGuid: string;
  mainAssetPath: string;
  files: GameModeBundleFile[];
}

interface MechanicsModelCreation {
  key: GameMechanicsModelRefKey;
  asset: CreatedAsset;
  constructor: SerializableConstructor;
  fallbackDisplayName: string;
  fallbackCategory: string;
}

type GeneratedChildAssetKey = Exclude<keyof CardGameAssetLinks, 'deck' | 'selectedGameLayout' | 'lobbyLayout'>;

function createEntry<T extends ScriptableObject>(guid: string, type: string, displayName: string, path = ''): AssetResourceEntry<T> {
  const entry = AssetResourceEntry.fromGuid<T>(guid, asAssetType(type), displayName);
  entry.path = path;
  return entry;
}

async function computeChecksum(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const digestInput = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', digestInput);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function applyTemplateToCardGame(cardGame: CreatedAsset, template: Record<string, unknown> | undefined): void {
  if (!template || !cardGame.data || typeof cardGame.data !== 'object') {
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

  for (const field of copyableFields) {
    if (field in template && template[field] !== undefined) {
      data[field] = template[field];
    }
  }
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

function formatPageTitle(displayName: string, suffix: string): string {
  return `${displayName.trim() || 'Card Game'} ${suffix}`;
}

async function createPageLayoutAsset(
  context: AssetCreationContext,
  kind: 'selected-game' | 'lobby',
  layoutPath: string,
  gameModePath: string,
  gameModeGuid = '',
  overrides: Record<string, unknown> | undefined,
): Promise<CreatedAsset> {
  const fileSuffix = kind === 'selected-game' ? 'SelectedGameLayout' : 'LobbyLayout';
  const sliceId = kind === 'selected-game' ? 'selected-game-showcase' : 'lobby-shell';
  const document: PageLayoutDocument = kind === 'selected-game'
    ? {
      pageId: `${context.gameId}-selected-game`,
      routePath: `/games/${context.gameId}`,
      title: formatPageTitle(context.displayName, 'Selected Game'),
      kind,
      slices: [
        {
          id: sliceId,
          type: 'selected-game',
          enabled: true,
          order: 10,
          title: formatPageTitle(context.displayName, 'Selected Game'),
          sourceAssetPath: gameModePath,
          controlsAssetPath: `${layoutPath}#${sliceId}`,
        },
      ],
      layout: {
        type: 'custom',
        sections: [
          { id: sliceId, type: 'selected-game', order: 10 },
        ],
      },
      layoutControls: {},
      preview: {
        sampleGameRef: {
          gameId: context.gameId,
          guid: gameModeGuid,
          path: gameModePath,
        },
      },
    }
    : {
      pageId: `${context.gameId}-lobby`,
      routePath: `/games/${context.gameId}/lobby`,
      title: formatPageTitle(context.displayName, 'Lobby'),
      kind,
      slices: [
        {
          id: sliceId,
          type: 'custom',
          enabled: true,
          order: 10,
          title: formatPageTitle(context.displayName, 'Lobby'),
          sourceAssetPath: `${layoutPath}#${sliceId}`,
          controlsAssetPath: `${layoutPath}#${sliceId}`,
        },
      ],
      layout: {
        type: 'custom',
        sections: [
          { id: sliceId, type: 'custom', order: 10 },
        ],
      },
      lobbyControls: {},
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
    data: {
      ...document,
      ...overrides,
    } as Record<string, unknown>,
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
  data.slices = data.slices.map((slice) => ({
    ...slice,
    sourceAssetPath: slice.type === 'selected-game' ? gameModePath : slice.sourceAssetPath,
  }));
}

function createDraftPageLayoutEntry(asset: CreatedAsset, displayName: string, path: string, gameId: string): AssetResourceEntry<PageLayout> {
  const entry = createEntry<PageLayout>(asset.guid, PageLayout.assetType!, displayName, path);
  entry.gameId = tryGameId(gameId) ?? null;
  entry.category = AssetTypeCategory.UI as typeof entry.category;
  entry.mimeType = MimeTypes.Json;
  return entry;
}

async function enrichSerializedAsset(
  asset: CreatedAsset,
  constructor: SerializableConstructor,
  path: string,
  fallbackDisplayName: string,
  fallbackCategory: string,
  gameId: string
): Promise<GameModeBundleFile> {
  const constructorWithStatics = constructor as SerializableConstructor & {
    assetType?: string;
    schemaVersion?: number;
    displayName?: string;
    icon?: string;
    category?: string;
    name: string;
  };
  const classMetadata = getSerializableClassMetadata(constructor);
  const assetType = classMetadata?.assetType ?? constructorWithStatics.assetType ?? constructorWithStatics.name;
  const displayName = fallbackDisplayName || classMetadata?.displayName || constructorWithStatics.displayName || assetType;
  const category = classMetadata?.category ?? constructorWithStatics.category ?? fallbackCategory;
  const schemaVersion = classMetadata?.schemaVersion ?? constructorWithStatics.schemaVersion ?? 1;
  const system: Record<string, unknown> = {
    guid: asset.guid,
    assetType,
    schemaVersion,
    displayName,
    category,
    treePath: path,
    gameId,
  };
  const icon = classMetadata?.icon ?? constructorWithStatics.icon;
  if (icon) {
    system.icon = icon;
  }

  const content = JSON5.stringify({ system, data: asset.data }, null, 2);
  const checksum = await computeChecksum(content);
  return {
    guid: asset.guid,
    path,
    content,
    checksum,
    metadata: {
      assetType,
      displayName,
      category,
      gameId,
      inheritanceChain: null,
      mimeType: MimeTypes.Json,
      fileSize: content.length,
    },
  };
}

function createEntryFromBundleFile<T extends ScriptableObject>(file: GameModeBundleFile): AssetResourceEntry<T> {
  const entry = createEntry<T>(
    file.guid,
    file.metadata.assetType,
    file.metadata.displayName,
    file.path,
  );
  entry.gameId = file.metadata.gameId ? (tryGameId(file.metadata.gameId) ?? null) : null;
  entry.category = (file.metadata.category ?? null) as typeof entry.category;
  entry.mimeType = MimeTypes.Json;
  entry.fileSize = file.metadata.fileSize ?? file.content.length;
  entry.checksum = file.checksum as AssetChecksum;
  entry.inheritanceChain = file.metadata.inheritanceChain ?? null;
  return entry;
}

async function createMechanicsModelAssets(
  context: AssetCreationContext,
  overrides: Partial<Record<GameMechanicsModelRefKey, Record<string, unknown>>> | undefined,
): Promise<MechanicsModelCreation[]> {
  return [
    {
      key: 'player',
      asset: await GamePlayerModel.create(context, overrides?.player),
      constructor: GamePlayerModel,
      fallbackDisplayName: 'Player Model',
      fallbackCategory: 'Game',
    },
    {
      key: 'session',
      asset: await GameSessionModel.create(context, overrides?.session),
      constructor: GameSessionModel,
      fallbackDisplayName: 'Session Model',
      fallbackCategory: 'Game',
    },
    {
      key: 'deck',
      asset: await CardGameDeckModel.create(context, overrides?.deck),
      constructor: CardGameDeckModel,
      fallbackDisplayName: 'Deck Model',
      fallbackCategory: 'Game',
    },
    {
      key: 'zones',
      asset: await GameZoneModel.create(context, overrides?.zones),
      constructor: GameZoneModel,
      fallbackDisplayName: 'Zone Model',
      fallbackCategory: 'Game',
    },
    {
      key: 'phaseFlow',
      asset: await GamePhaseFlowModel.create(context, overrides?.phaseFlow),
      constructor: GamePhaseFlowModel,
      fallbackDisplayName: 'Phase Flow Model',
      fallbackCategory: 'Game',
    },
    {
      key: 'actions',
      asset: await GameActionSet.create(context, overrides?.actions),
      constructor: GameActionSet,
      fallbackDisplayName: 'Action Set',
      fallbackCategory: 'Game',
    },
    {
      key: 'stateEvents',
      asset: await GameStateEventModel.create(context, overrides?.stateEvents),
      constructor: GameStateEventModel,
      fallbackDisplayName: 'State Event Model',
      fallbackCategory: 'Game',
    },
    {
      key: 'validation',
      asset: await GameValidationFixtures.create(context, overrides?.validation),
      constructor: GameValidationFixtures,
      fallbackDisplayName: 'Validation Fixtures',
      fallbackCategory: 'Game',
    },
  ];
}

function createMechanicsModelRefs(
  models: readonly MechanicsModelCreation[],
  modelFilesByKey: ReadonlyMap<GameMechanicsModelRefKey, GameModeBundleFile>,
): Record<GameMechanicsModelRefKey, { path: string; guid: string; assetType: string; displayName: string; checksum: string }> {
  return models.reduce((refs, model) => {
    const file = modelFilesByKey.get(model.key);
    if (!file) {
      throw new Error(`Missing mechanics model file for ${model.key}`);
    }
    return {
      ...refs,
      [model.key]: {
        path: file.path,
        guid: file.guid,
        assetType: file.metadata.assetType,
        displayName: file.metadata.displayName,
        checksum: file.checksum,
      },
    };
  }, {} as Record<GameMechanicsModelRefKey, { path: string; guid: string; assetType: string; displayName: string; checksum: string }>);
}

export async function createGameModeBundle(options: CreateGameModeBundleOptions): Promise<GameModeBundle> {
  const normalizedGameId = options.gameId.trim().toLowerCase();
  const category = options.category.trim() || 'CardGames';
  const folder = `GameMode/${category}/${normalizedGameId}`;
  const context: AssetCreationContext = {
    gameId: normalizedGameId,
    displayName: options.displayName.trim(),
    category,
    timestamp: new Date().toISOString(),
  };

  const linkedDeckAsset = options.linkedDeckAsset ?? createStandard52DeckEntry();
  const linkedCardRankingAsset = createStandard52CardRankingEntry();
  if (!linkedDeckAsset) {
    throw new Error('No linked deck asset available for game mode bundle creation');
  }
  const scoringOverrides = {
    rankingAsset: createStandard52CardRankingReference(),
    ...options.assetDataOverrides?.scoring,
  };

  const rules = applyDataOverrides(await CardGameRules.create(context), options.assetDataOverrides?.rules);
  const strategy = applyDataOverrides(await Strategy.create(context), options.assetDataOverrides?.strategy);
  const scoring = applyDataOverrides(await CardGameScoring.create(context), scoringOverrides);
  const pageContent = applyDataOverrides(await GameInfo.create(context), options.assetDataOverrides?.gameInfo);
  const layout = applyDataOverrides(await CardGameLayout.create(context), options.assetDataOverrides?.layout);
  const carousel = applyDataOverrides(await ImageCarousel.create(context), options.assetDataOverrides?.carousel);
  const mechanicsModels = await createMechanicsModelAssets(context, options.mechanicsModelDataOverrides);
  const modelFiles = await Promise.all(mechanicsModels.map(({ asset, constructor, fallbackDisplayName, fallbackCategory }) =>
    enrichSerializedAsset(
      asset,
      constructor,
      `Resources/${folder}/${asset.fileName}`,
      fallbackDisplayName,
      fallbackCategory,
      normalizedGameId
    )
  ));
  const modelFilesByKey = new Map<GameMechanicsModelRefKey, GameModeBundleFile>();
  mechanicsModels.forEach((entry, index) => {
    modelFilesByKey.set(entry.key, modelFiles[index]);
  });
  const mechanics = applyDataOverrides(
    await CardGameMechanics.create(context, {
      modelRefs: createMechanicsModelRefs(mechanicsModels, modelFilesByKey),
    }),
    options.assetDataOverrides?.mechanics,
  );

  const childAssetMap: Array<{ key: GeneratedChildAssetKey; asset: CreatedAsset; constructor: SerializableConstructor; fallbackDisplayName: string; fallbackCategory: string }> = [
    { asset: rules, constructor: CardGameRules, fallbackDisplayName: 'Game Rules', fallbackCategory: 'Game' },
    { asset: strategy, constructor: Strategy, fallbackDisplayName: 'Strategy', fallbackCategory: 'Game' },
    { asset: scoring, constructor: CardGameScoring, fallbackDisplayName: 'Scoring', fallbackCategory: 'Game' },
    { asset: pageContent, constructor: GameInfo, fallbackDisplayName: 'Game Info', fallbackCategory: 'Game' },
    { asset: layout, constructor: CardGameLayout, fallbackDisplayName: 'Layout', fallbackCategory: 'UI' },
    { asset: carousel, constructor: ImageCarousel, fallbackDisplayName: 'Carousel Images', fallbackCategory: 'Content' },
    { asset: mechanics, constructor: CardGameMechanics, fallbackDisplayName: 'Mechanics', fallbackCategory: 'Game' },
  ].map((entry, index) => ({
    key: ['rules', 'strategy', 'scoring', 'gameInfo', 'layout', 'carouselImages', 'mechanics'][index] as GeneratedChildAssetKey,
    ...entry,
  }));

  const childFiles = await Promise.all(childAssetMap.map(({ asset, constructor, fallbackDisplayName, fallbackCategory }) =>
    enrichSerializedAsset(
      asset,
      constructor,
      `Resources/${folder}/${asset.fileName}`,
      fallbackDisplayName,
      fallbackCategory,
      normalizedGameId
    )
  ));

  const childFilesByKey = new Map<GeneratedChildAssetKey, GameModeBundleFile>();
  childAssetMap.forEach((entry, index) => {
    childFilesByKey.set(entry.key, childFiles[index]);
  });

  const gameModePath = `Resources/${folder}/${normalizedGameId}.asset`;
  const selectedGameLayoutPath = `Resources/${folder}/${normalizedGameId}SelectedGameLayout.asset`;
  const lobbyLayoutPath = `Resources/${folder}/${normalizedGameId}LobbyLayout.asset`;
  const selectedGameLayout = await createPageLayoutAsset(
    context,
    'selected-game',
    selectedGameLayoutPath,
    gameModePath,
    '',
    options.assetDataOverrides?.selectedGameLayout,
  );
  const lobbyLayout = await createPageLayoutAsset(
    context,
    'lobby',
    lobbyLayoutPath,
    gameModePath,
    '',
    options.assetDataOverrides?.lobbyLayout,
  );

  const cardGameLinks = {
    rules: createEntryFromBundleFile<CardGameRules>(childFilesByKey.get('rules')!),
    strategy: createEntryFromBundleFile<Strategy>(childFilesByKey.get('strategy')!),
    scoring: createEntryFromBundleFile<CardGameScoring>(childFilesByKey.get('scoring')!),
    gameInfo: createEntryFromBundleFile<GameInfo>(childFilesByKey.get('gameInfo')!),
    layout: createEntryFromBundleFile<CardGameLayout>(childFilesByKey.get('layout')!),
    selectedGameLayout: createDraftPageLayoutEntry(selectedGameLayout, `${context.displayName} Selected Page Layout`, selectedGameLayoutPath, normalizedGameId),
    lobbyLayout: createDraftPageLayoutEntry(lobbyLayout, `${context.displayName} Lobby Layout`, lobbyLayoutPath, normalizedGameId),
    deck: linkedDeckAsset,
    ranking: linkedCardRankingAsset,
    carouselImages: createEntryFromBundleFile<ImageCarousel>(childFilesByKey.get('carouselImages')!),
    mechanics: createEntryFromBundleFile<CardGameMechanics>(childFilesByKey.get('mechanics')!),
  } satisfies CardGameAssetLinks;

  const cardGame = applyDataOverrides(await CardGameMode.create(context, cardGameLinks), options.assetDataOverrides?.cardGame);

  applyTemplateToCardGame(cardGame, options.copyFromTemplate);

  bindPageLayoutToGame(selectedGameLayout, normalizedGameId, cardGame.guid, gameModePath);
  bindPageLayoutToGame(lobbyLayout, normalizedGameId, cardGame.guid, gameModePath);

  const pageLayoutFiles = await Promise.all([
    enrichSerializedAsset(
      selectedGameLayout,
      PageLayout,
      selectedGameLayoutPath,
      `${context.displayName} Selected Page Layout`,
      'UI',
      normalizedGameId
    ),
    enrichSerializedAsset(
      lobbyLayout,
      PageLayout,
      lobbyLayoutPath,
      `${context.displayName} Lobby Layout`,
      'UI',
      normalizedGameId
    ),
  ]);
  const cardGameData = cardGame.data as Record<string, unknown>;
  cardGameData.selectedGameLayoutAsset = createEntryFromBundleFile<PageLayout>(pageLayoutFiles[0]);
  cardGameData.lobbyLayoutAsset = createEntryFromBundleFile<PageLayout>(pageLayoutFiles[1]);

  const mainFile = await enrichSerializedAsset(
    cardGame,
    CardGameMode,
    `Resources/${folder}/${cardGame.fileName}`,
    options.displayName.trim(),
    'Game',
    normalizedGameId
  );

  const files = [
    mainFile,
    ...childFiles,
    ...pageLayoutFiles,
    ...modelFiles,
  ];

  return {
    mainAssetGuid: cardGame.guid,
    mainAssetPath: `Resources/${folder}/${cardGame.fileName}`,
    files,
  };
}
