import JSON5 from 'json5';
import { MimeTypes, AssetTypeCategory } from '@ocentra/asset-domain/constants/assets';
import { LayoutAssetRootSchema } from '@/lib/validation/schemas';
import type { AssetEntry } from '@ocentra/boundary-domain/types/asset-entry';
import type { IResourceEntry } from '@ocentra/boundary-domain/types/resource-entry';
import type { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode';
import type { CardGameLayoutDocument, LayoutPreset } from '@ocentra/game-ui-types/cardGameLayoutTypes';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { GetGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetGameModeEntriesEvent';
import { GetResourceByGuidEvent } from '@ocentra/eventing-domain/events/assets/GetResourceByGuidEvent';
import { UploadAssetEvent } from '@ocentra/eventing-domain/events/assets/UploadAssetEvent';
import { AssetLoader } from '@/adapters/assets/AssetLoader';
import {
  cloneCardGameLayoutDocument,
  normalizeCardGameLayoutDocument,
} from '@ocentra/game-layout-domain/cardGameLayoutRuntime';

export type LayoutAssetDocument = CardGameLayoutDocument;

export interface LoadedLayoutAsset {
  gameId: string;
  guid: string;
  path: string;
  displayName: string;
  raw: Record<string, unknown>;
  document: LayoutAssetDocument;
}

type ResourceReference = {
  guid?: string;
  path?: string;
  displayName?: string;
};

const DEFAULT_LAYOUT_STRUCTURE = {
  type: 'custom',
  sections: [],
} as const;

function inferGameId(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length >= 2) {
    return segments[segments.length - 2];
  }
  return 'unknown';
}

function getSystemBlock(root: Record<string, unknown>): Record<string, unknown> {
  const system = root.system;
  return system && typeof system === 'object' ? (system as Record<string, unknown>) : {};
}

function getDataBlock(root: Record<string, unknown>): Record<string, unknown> {
  const data = root.data;
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
}

function cloneRecord<T>(value: T): T {
  return JSON5.parse(JSON5.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isLayoutStructure(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && typeof value.type === 'string' && Array.isArray(value.sections);
}

function getLayoutStructure(data: Record<string, unknown>): Record<string, unknown> {
  if (isLayoutStructure(data.layout)) {
    return cloneRecord(data.layout);
  }

  return cloneRecord(DEFAULT_LAYOUT_STRUCTURE);
}

function toLayoutDocument(root: Record<string, unknown>): LayoutAssetDocument {
  const data = getDataBlock(root);
  const container = isRecord(data.layout) ? data.layout : data;
  return normalizeCardGameLayoutDocument(container);
}

function getLayoutReference(gameModeRoot: Record<string, unknown>): ResourceReference | null {
  const data = getDataBlock(gameModeRoot);
  const layoutAsset = data.layoutAsset;
  if (!layoutAsset || typeof layoutAsset !== 'object') {
    return null;
  }
  const ref = layoutAsset as Record<string, unknown>;
  const guid = typeof ref.guid === 'string' ? ref.guid : undefined;
  if (!guid) {
    return null;
  }
  return {
    guid,
    path: typeof ref.path === 'string' ? ref.path : undefined,
    displayName: typeof ref.displayName === 'string' ? ref.displayName : undefined,
  };
}

async function getGameModeEntry(gameId: string): Promise<AssetResourceEntry<GameMode>> {
  const deferred = new OperationDeferred<AssetResourceEntry<GameMode>[]>();
  await EventBus.instance.publishAsync(new GetGameModeEntriesEvent(deferred));
  const result = await deferred.promise;
  if (!result.isSuccess || !result.value) {
    throw new Error(result.errorMessage || `Failed to resolve game mode entries for ${gameId}`);
  }
  const entry = result.value.find((candidate) => candidate.gameId === gameId);
  if (!entry) {
    throw new Error(`Game mode not found for ${gameId}`);
  }
  return entry;
}

async function resolveLayoutPath(guid: string, fallbackPath?: string): Promise<string> {
  if (fallbackPath && fallbackPath.length > 0) {
    return fallbackPath;
  }
  const deferred = new OperationDeferred<IResourceEntry | null>();
  await EventBus.instance.publishAsync(new GetResourceByGuidEvent(guid, deferred));
  const result = await deferred.promise;
  if (!result.isSuccess) {
    throw new Error(result.errorMessage || `Failed to resolve layout path for ${guid}`);
  }
  const path = result.value?.path;
  if (!path) {
    throw new Error(`Layout path missing for ${guid}`);
  }
  return path;
}

export async function loadLayoutAsset(gameId: string): Promise<LoadedLayoutAsset> {
  const gameModeEntry = await getGameModeEntry(gameId);
  const loader = AssetLoader.getInstance();
  const gameModeResponse = await loader.loadAssetByGuid(gameModeEntry.guid);
  const gameModeParsed = JSON5.parse(await gameModeResponse.text()) as unknown;
  const gameModeResult = LayoutAssetRootSchema.safeParse(gameModeParsed);
  if (!gameModeResult.success) {
    throw new Error(`Game mode asset validation failed for ${gameId}: ${gameModeResult.error.message}`);
  }
  const gameModeRoot = gameModeResult.data as Record<string, unknown>;
  const layoutReference = getLayoutReference(gameModeRoot);

  if (!layoutReference?.guid) {
    throw new Error(`Layout reference missing in game mode ${gameId}`);
  }

  const layoutPath = await resolveLayoutPath(layoutReference.guid, layoutReference.path);
  const layoutResponse = await loader.loadAssetByGuid(layoutReference.guid);
  const layoutParsed = JSON5.parse(await layoutResponse.text()) as unknown;
  const layoutResult = LayoutAssetRootSchema.safeParse(layoutParsed);
  if (!layoutResult.success) {
    throw new Error(`Layout asset validation failed for ${gameId}: ${layoutResult.error.message}`);
  }
  const layoutRoot = layoutResult.data as Record<string, unknown>;
  const layoutSystem = getSystemBlock(layoutRoot);

  return {
    gameId,
    guid: layoutReference.guid,
    path: layoutPath,
    displayName:
      (typeof layoutSystem.displayName === 'string' && layoutSystem.displayName) ||
      layoutReference.displayName ||
      'Layout',
    raw: layoutRoot,
    document: toLayoutDocument(layoutRoot),
  };
}

export function buildLoadedLayoutAssetFromRaw(
  assetPath: string,
  assetRoot: Record<string, unknown>,
): LoadedLayoutAsset {
  const system = getSystemBlock(assetRoot);
  const guid = typeof system.guid === 'string' ? system.guid : '';
  if (!guid) {
    throw new Error('Layout asset is missing system.guid');
  }
  const path = assetPath || (typeof system.treePath === 'string' ? system.treePath : '');
  if (!path) {
    throw new Error('Layout asset is missing a path');
  }
  const gameId =
    (typeof system.gameId === 'string' && system.gameId) ||
    inferGameId(path);

  return {
    gameId,
    guid,
    path,
    displayName: typeof system.displayName === 'string' && system.displayName ? system.displayName : 'Layout',
    raw: cloneRecord(assetRoot),
    document: toLayoutDocument(assetRoot),
  };
}

export async function saveLayoutAsset(
  asset: LoadedLayoutAsset,
  document: LayoutAssetDocument,
): Promise<LoadedLayoutAsset> {
  const nextRoot = cloneRecord(asset.raw);
  const nextSystem = getSystemBlock(nextRoot);
  const nextData = getDataBlock(nextRoot);

  nextSystem.guid = asset.guid;
  nextSystem.assetType = 'CardGameLayout';
  nextSystem.displayName = asset.displayName;
  nextSystem.category = AssetTypeCategory.UI;
  nextSystem.gameId = asset.gameId;
  nextSystem.treePath = asset.path;
  nextRoot.system = nextSystem;

  nextData.defaultPlayerCount = document.defaultPlayerCount;
  nextData.presets = document.presets;
  nextData.playerUiDefaults = document.playerUiDefaults;
  nextData.hud = document.hud;
  nextData.cardFan = document.cardFan;
  nextData.cardVisuals = document.cardVisuals;
  nextData.views = document.views;
  nextData.gameplay = document.gameplay;
  nextData.extensions = document.extensions;
  nextData.layout = getLayoutStructure(nextData);
  nextRoot.data = nextData;

  const content = JSON5.stringify(nextRoot, null, 2);
  const deferred = new OperationDeferred<AssetEntry>();
  await EventBus.instance.publishAsync(
    new UploadAssetEvent(
      asset.guid,
      content,
      {
        assetType: 'CardGameLayout',
        displayName: asset.displayName,
        category: AssetTypeCategory.UI,
        gameId: asset.gameId,
        mimeType: MimeTypes.Json,
        fileSize: content.length,
      },
      deferred,
    ),
  );

  const result = await deferred.promise;
  if (!result.isSuccess || !result.value) {
    throw new Error(result.errorMessage || `Failed to save layout asset for ${asset.gameId}`);
  }

  return {
    ...asset,
    path: result.value.path || asset.path,
    raw: nextRoot,
    document: cloneCardGameLayoutDocument(document),
  };
}
