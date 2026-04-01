import JSON5 from 'json5';
import { deserialize } from '@ocentra/asset-domain/Serializable';
import { AssetGUID } from '@ocentra/asset-domain/AssetGUID';
import { MimeTypes } from '@ocentra/asset-domain/constants/assets';
import type { AssetMetadata } from '@ocentra/boundary-domain/types/asset-metadata';
import { CardGameRules } from '@ocentra/game-asset-domain/game/gameRules/CardGameRules';
import { Strategy } from '@ocentra/game-asset-domain/game/strategy/Strategy';
import { CardGameScoring } from '@ocentra/game-asset-domain/game/scoring/CardGameScoring';
import { GameInfo } from '@ocentra/game-asset-domain/game/gameInfo/GameInfo';
import { CardGameLayout } from '@ocentra/game-asset-domain/ui/layout/CardGameLayout';
import { Deck } from '@ocentra/game-asset-domain/card/deck/Deck';
import { ImageCarousel } from '@ocentra/game-asset-domain/content/imageCarousel/ImageCarousel';
import { CardGameMode, type CardGameAssetLinks } from '@ocentra/game-asset-domain/gameMode/cardGameMode/CardGameMode';
import { CardGameMechanics } from '@ocentra/game-asset-domain/game/gameMechanics/CardGameMechanics';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { asAssetType } from '@ocentra/asset-domain/types/assetType';
import type { CreatedAsset, AssetCreationContext } from '@ocentra/game-asset-domain/AssetCreation';
import type { SerializableConstructor } from '@ocentra/asset-domain/serialization/decorators';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { tryGameId, type AssetChecksum } from '@ocentra/asset-domain/types/assetIdentifier';
import { createStandard52CardRankingReference, createStandard52DeckEntry } from '@/adapters/assets/gameModeAssetDefaults';

export interface CreateGameModeBundleOptions {
  gameId: string;
  displayName: string;
  category: string;
  copyFromTemplate?: Record<string, unknown>;
  assetDataOverrides?: Partial<Record<'rules' | 'strategy' | 'scoring' | 'gameInfo' | 'layout' | 'deck' | 'carousel' | 'mechanics' | 'cardGame', Record<string, unknown>>>;
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

async function enrichSerializedAsset(
  asset: CreatedAsset,
  constructor: SerializableConstructor,
  path: string,
  fallbackDisplayName: string,
  fallbackCategory: string,
  gameId: string
): Promise<GameModeBundleFile> {
  const instance = deserialize(constructor, asset.data) as ScriptableObject & { guid: AssetGUID };
  instance.guid = AssetGUID.from(asset.guid);

  const parsed = JSON5.parse(instance.serialize()) as Record<string, unknown>;
  const system = parsed.system && typeof parsed.system === 'object'
    ? (parsed.system as Record<string, unknown>)
    : {};

  system.guid = asset.guid;
  system.treePath = path;
  system.displayName = fallbackDisplayName;
  if (typeof system.category !== 'string' || system.category.length === 0) {
    system.category = fallbackCategory;
  }
  system.gameId = gameId;
  parsed.system = system;

  const content = JSON5.stringify(parsed, null, 2);
  const checksum = await computeChecksum(content);
  return {
    guid: asset.guid,
    path,
    content,
    checksum,
    metadata: {
      assetType: typeof system.assetType === 'string' ? system.assetType : constructor.name,
      displayName: typeof system.displayName === 'string' ? system.displayName : fallbackDisplayName,
      category: typeof system.category === 'string' ? system.category : fallbackCategory,
      gameId,
      inheritanceChain: Array.isArray(system.inheritanceChain) ? (system.inheritanceChain as string[]) : null,
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
  if (!linkedDeckAsset) {
    throw new Error('No linked deck asset available for game mode bundle creation');
  }
  const scoringOverrides = {
    cardRankingAsset: createStandard52CardRankingReference(),
    ...options.assetDataOverrides?.scoring,
  };

  const rules = applyDataOverrides(await CardGameRules.create(context), options.assetDataOverrides?.rules);
  const strategy = applyDataOverrides(await Strategy.create(context), options.assetDataOverrides?.strategy);
  const scoring = applyDataOverrides(await CardGameScoring.create(context), scoringOverrides);
  const pageContent = applyDataOverrides(await GameInfo.create(context), options.assetDataOverrides?.gameInfo);
  const layout = applyDataOverrides(await CardGameLayout.create(context), options.assetDataOverrides?.layout);
  const carousel = applyDataOverrides(await ImageCarousel.create(context), options.assetDataOverrides?.carousel);
  const mechanics = applyDataOverrides(await CardGameMechanics.create(context), options.assetDataOverrides?.mechanics);

  const childAssetMap: Array<{ key: keyof Omit<CardGameAssetLinks, 'deck'>; asset: CreatedAsset; constructor: SerializableConstructor; fallbackDisplayName: string; fallbackCategory: string }> = [
    { asset: rules, constructor: CardGameRules, fallbackDisplayName: 'Game Rules', fallbackCategory: 'Game' },
    { asset: strategy, constructor: Strategy, fallbackDisplayName: 'Strategy', fallbackCategory: 'Game' },
    { asset: scoring, constructor: CardGameScoring, fallbackDisplayName: 'Scoring', fallbackCategory: 'Game' },
    { asset: pageContent, constructor: GameInfo, fallbackDisplayName: 'Game Info', fallbackCategory: 'Game' },
    { asset: layout, constructor: CardGameLayout, fallbackDisplayName: 'Layout', fallbackCategory: 'UI' },
    { asset: carousel, constructor: ImageCarousel, fallbackDisplayName: 'Carousel Images', fallbackCategory: 'Content' },
    { asset: mechanics, constructor: CardGameMechanics, fallbackDisplayName: 'Mechanics', fallbackCategory: 'Game' },
  ].map((entry, index) => ({
    key: ['rules', 'strategy', 'scoring', 'gameInfo', 'layout', 'carouselImages', 'mechanics'][index] as keyof Omit<CardGameAssetLinks, 'deck'>,
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

  const childFilesByKey = new Map<keyof Omit<CardGameAssetLinks, 'deck'>, GameModeBundleFile>();
  childAssetMap.forEach((entry, index) => {
    childFilesByKey.set(entry.key, childFiles[index]);
  });

  const cardGameLinks = {
    rules: createEntryFromBundleFile<CardGameRules>(childFilesByKey.get('rules')!),
    strategy: createEntryFromBundleFile<Strategy>(childFilesByKey.get('strategy')!),
    scoring: createEntryFromBundleFile<CardGameScoring>(childFilesByKey.get('scoring')!),
    gameInfo: createEntryFromBundleFile<GameInfo>(childFilesByKey.get('gameInfo')!),
    layout: createEntryFromBundleFile<CardGameLayout>(childFilesByKey.get('layout')!),
    deck: linkedDeckAsset,
    carouselImages: createEntryFromBundleFile<ImageCarousel>(childFilesByKey.get('carouselImages')!),
    mechanics: createEntryFromBundleFile<CardGameMechanics>(childFilesByKey.get('mechanics')!),
  } satisfies CardGameAssetLinks;

  const cardGame = applyDataOverrides(await CardGameMode.create(context, cardGameLinks), options.assetDataOverrides?.cardGame);

  applyTemplateToCardGame(cardGame, options.copyFromTemplate);

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
  ];

  return {
    mainAssetGuid: cardGame.guid,
    mainAssetPath: `Resources/${folder}/${cardGame.fileName}`,
    files,
  };
}
