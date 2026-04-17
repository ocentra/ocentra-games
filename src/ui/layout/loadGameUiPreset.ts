import {
  PLAYER_UI_SERIALIZABLE_FIELDS,
  sanitizePlayerUIOverrides,
  type SerializablePlayerUIKey,
} from '@/ui/components/GameScreen/CardGameScreen/PlayerUI';
import { toSerializedGameAssetFromLayoutSource } from '@/ui/layout/cardGameLayoutAsset';
import type {
  SerializedGameAsset,
  SerializedLayoutPreset,
  SerializedSeatLayout,
} from './gameUiTypes';
import type { SeatLayout, TableShapeSettings } from '@ocentra/game-ui-types/tableLayoutTypes';
import type { GameAsset, LayoutPreset } from './tableLayoutTypes';
import { getGameAsset, setGameAsset } from './tableLayoutStore';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { GetAssetTypeInfoEvent } from '@ocentra/eventing-domain/events/assets/GetAssetTypeInfoEvent';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { AssetLoader } from '@/adapters/assets/AssetLoader';
import { getGameMode } from '@/adapters/assets/GameCatalogService';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { serialize } from '@ocentra/asset-domain/Serializable';
import type { AssetTypeInfo } from '@ocentra/game-asset-domain/constants/asset-type-info';

const log = MainAppLogger.instance;
const LOG_ASSETS = false;

const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_ASSETS) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_ASSETS) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = true) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);
import { AssetSchemaVersion } from '@ocentra/asset-domain/constants/assets';

let loadPromise: Promise<void> | null = null;
let loadedGameId: string | null = null;

const FALLBACK_DEFAULT_PLAYER_COUNT = 4;
const DEFAULT_SEAT_SCALE = 0.5;
const SHOULD_PERSIST_DEFAULT_ASSET =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.DEV &&
  import.meta.env?.VITE_ENABLE_DEV_LAYOUT_SAVE !== 'false';

const toPascalCase = (value: string): string =>
  value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const cloneSeat = (seat: SeatLayout): SeatLayout => ({
  ...seat,
  position: { ...seat.position },
  playerOverrides: seat.playerOverrides ? { ...seat.playerOverrides } : undefined,
});

const generateSeatRing = (count: number): SeatLayout[] => {
  const seats: SeatLayout[] = [];
  const radiusX = 0.38;
  const radiusY = 0.34;
  const angleStep = (2 * Math.PI) / count;
  const baseAngle = Math.PI / 2;

  for (let index = 0; index < count; index += 1) {
    const angle = baseAngle + angleStep * index;
    const x = 0.5 + Math.cos(angle) * radiusX;
    const y = 0.5 + Math.sin(angle) * radiusY;
    seats.push({
      id: index,
      label: `p${index + 1}`,
      position: {
        x: Number(clamp01(x).toFixed(4)),
        y: Number(clamp01(y).toFixed(4)),
      },
      rotation: 0,
      scale: DEFAULT_SEAT_SCALE,
    });
  }

  return seats;
};

const defaultTableShape: TableShapeSettings = {
  width: 960,
  height: 560,
  offsetX: 0,
  offsetY: -78,
  curvature: 0.88,
  feltInset: -8,
};

const generateDefaultPreset = (count: number): LayoutPreset => ({
  table: { ...defaultTableShape },
  seats: generateSeatRing(count),
});

export const createDefaultGameAsset = (gameId: string): GameAsset => {
  const now = new Date().toISOString();
  const counts = Array.from({ length: 9 }, (_, index) => index + 2);
  const presets = Object.fromEntries(counts.map((count) => [String(count), generateDefaultPreset(count)]));

  return {
    metadata: {
      gameId,
      schemaVersion: AssetSchemaVersion.V1,
      displayName: toPascalCase(gameId) || gameId,
      createdAt: now,
      updatedAt: now,
    },
    layout: {
      defaultPlayerCount: FALLBACK_DEFAULT_PLAYER_COUNT,
      presets,
      playerUiDefaults: undefined,
      views: undefined,
    },
    gameplay: {},
    extensions: {},
  };
};

const normalizeSeat = (input: SerializedSeatLayout | undefined, fallback?: SeatLayout): SeatLayout => {
  const fallbackSeat = fallback ? cloneSeat(fallback) : undefined;
  const id = Number.isFinite(input?.id) ? Number(input?.id) : fallbackSeat?.id ?? 0;
  const position = {
    x: clamp01(
      Number.isFinite(input?.position?.x) ? Number(input?.position?.x) : fallbackSeat?.position?.x ?? 0.5,
    ),
    y: clamp01(
      Number.isFinite(input?.position?.y) ? Number(input?.position?.y) : fallbackSeat?.position?.y ?? 0.5,
    ),
  };

  const seat: SeatLayout = {
    id,
    label: input?.label ?? fallbackSeat?.label ?? `p${id + 1}`,
    position: {
      x: Number(position.x.toFixed(4)),
      y: Number(position.y.toFixed(4)),
    },
    rotation: Number.isFinite(input?.rotation)
      ? Number(input?.rotation)
      : fallbackSeat?.rotation ?? 0,
    ...(Number.isFinite(input?.scale)
      ? { scale: Number(input?.scale) }
      : fallbackSeat?.scale !== undefined
        ? { scale: fallbackSeat.scale }
        : { scale: DEFAULT_SEAT_SCALE }),
  };

  const overrides: Partial<Record<SerializablePlayerUIKey, number>> = {};
  PLAYER_UI_SERIALIZABLE_FIELDS.forEach((field: { key: string }) => {
    const normalizedKey = field.key as SerializablePlayerUIKey;
    const inputValue = input?.[normalizedKey];
    const incomingValue = typeof inputValue === 'number' ? Number(inputValue) : undefined;
    const fallbackOverrideValue = fallbackSeat?.playerOverrides?.[normalizedKey];
    const fallbackValue = typeof fallbackOverrideValue === 'number' ? Number(fallbackOverrideValue) : undefined;
    const resolved = incomingValue ?? fallbackValue;
    if (resolved !== undefined && Number.isFinite(resolved)) {
      overrides[normalizedKey] = resolved;
    }
  });

  const sanitizedOverrides = sanitizePlayerUIOverrides(overrides);
  if (sanitizedOverrides) {
    seat.playerOverrides = sanitizedOverrides;
  }

  return seat;
};

const normalizePreset = (
  preset: SerializedLayoutPreset | undefined,
  fallback: LayoutPreset,
): LayoutPreset => {
  if (!preset) {
    return {
      table: { ...(fallback.table ?? {}) },
      seats: fallback.seats.map((seat) => cloneSeat(seat)),
    };
  }

  const fallbackSeatsById = new Map<number, SeatLayout>();
  fallback.seats.forEach((seat) => {
    fallbackSeatsById.set(seat.id, seat);
  });

  const seats: SeatLayout[] = [];
  const serializedSeats = preset.seats ?? [];

  serializedSeats.forEach((seatInput) => {
    const fallbackSeat = fallbackSeatsById.get(seatInput.id);
    const normalizedSeat = normalizeSeat(seatInput, fallbackSeat);
    seats.push(normalizedSeat);
    fallbackSeatsById.delete(normalizedSeat.id);
  });

  if (seats.length === 0) {
    seats.push(...fallback.seats.map((seat) => cloneSeat(seat)));
  } else {
    fallbackSeatsById.forEach((seat) => {
      seats.push(cloneSeat(seat));
    });
  }

  seats.sort((a, b) => a.id - b.id);

  return {
    table: {
      ...(fallback.table ?? {}),
      ...(preset.table ?? {}),
    },
    seats,
  };
};

const hydrateSerializedAsset = (serialized: SerializedGameAsset | null, gameId: string): GameAsset => {
  const fallbackAsset = createDefaultGameAsset(gameId);
  if (!serialized) {
    return fallbackAsset;
  }

  const metadata = {
    ...fallbackAsset.metadata,
    ...serialized.metadata,
    gameId: serialized.metadata?.gameId ?? fallbackAsset.metadata.gameId,
    schemaVersion: serialized.metadata?.schemaVersion ?? fallbackAsset.metadata.schemaVersion,
    updatedAt: serialized.metadata?.updatedAt ?? fallbackAsset.metadata.updatedAt ?? new Date().toISOString(),
    createdAt: serialized.metadata?.createdAt ?? fallbackAsset.metadata.createdAt ?? new Date().toISOString(),
  };

  const sourcePresets = serialized.layout?.presets ?? {};
  const presetEntries = new Set<string>([...Object.keys(fallbackAsset.layout.presets), ...Object.keys(sourcePresets)]);

  const presets = Object.fromEntries(
    Array.from(presetEntries).map((countKey) => {
      const numericCount = Number.parseInt(countKey, 10);
      const fallbackPreset =
        fallbackAsset.layout.presets[countKey] ?? generateDefaultPreset(Number.isNaN(numericCount) ? 2 : numericCount);
      const serializedPreset = sourcePresets[countKey];
      return [countKey, normalizePreset(serializedPreset, fallbackPreset)];
    }),
  );

  const playerUiDefaults = serialized.layout?.playerUiDefaults
    ? {
        ...(fallbackAsset.layout.playerUiDefaults ?? {}),
        ...serialized.layout.playerUiDefaults,
      }
    : fallbackAsset.layout.playerUiDefaults;

  const views = serialized.layout?.views
    ? Object.fromEntries(
        Object.entries(serialized.layout.views).map(([viewId, presetInput]) => {
          const fallbackView =
            fallbackAsset.layout.views?.[viewId] ??
            generateDefaultPreset(fallbackAsset.layout.defaultPlayerCount ?? FALLBACK_DEFAULT_PLAYER_COUNT);
          return [viewId, normalizePreset(presetInput, fallbackView)];
        }),
      )
    : fallbackAsset.layout.views;

  return {
    metadata,
    layout: {
      defaultPlayerCount:
        serialized.layout?.defaultPlayerCount ?? fallbackAsset.layout.defaultPlayerCount ?? FALLBACK_DEFAULT_PLAYER_COUNT,
      presets,
      playerUiDefaults,
      views,
    },
    gameplay: serialized.gameplay ?? fallbackAsset.gameplay,
    extensions: serialized.extensions ?? fallbackAsset.extensions,
  };
};

type FetchResult = {
  serialized: SerializedGameAsset | null;
  gameModeExists: boolean;
  layoutMissing: boolean;
};

async function fetchSerializedAsset(gameId: string): Promise<FetchResult> {
  try {
    logInfo(`[GameAsset] fetchSerializedAsset called for: ${gameId}`, undefined, LOG_ASSETS);

    const gameMode = await getGameMode(gameId);

    if (!gameMode) {
      logWarn('[GameAsset] Game mode not found - game does not exist', gameId, LOG_ASSETS);
      return { serialized: null, gameModeExists: false, layoutMissing: false };
    }

    logInfo(`[GameAsset] GameMode loaded, layoutAsset: ${gameMode.layoutAsset?.guid || 'none'}`, undefined, LOG_ASSETS);

    const layoutAsset = gameMode.layoutAsset;
    if (!layoutAsset || !layoutAsset.guid) {
      logWarn('[GameAsset] No layoutAsset in game mode', gameId, LOG_ASSETS);
      return { serialized: null, gameModeExists: true, layoutMissing: true };
    }

    const loader = AssetLoader.getInstance();
    const guidString = String(layoutAsset.guid);
    const response = await loader.loadAssetByGuid(guidString);
    if (!response.ok) {
      logWarn(`[GameAsset] Layout asset not found for GUID: ${layoutAsset.guid}`, undefined, LOG_ASSETS);
      return { serialized: null, gameModeExists: true, layoutMissing: true };
    }
    const text = await response.text();
    
    if (!text) {
      logWarn(`[GameAsset] Layout asset not found, will generate defaults: ${layoutAsset.guid}`, undefined, LOG_ASSETS);
      return { serialized: null, gameModeExists: true, layoutMissing: true };
    }
    
    const assetType = ScriptableObject.extractAssetType(text);
    
    if (!assetType) {
      logWarn(`[GameAsset] Could not determine asset type for layout: ${layoutAsset.guid}`, undefined, LOG_ASSETS);
      return { serialized: null, gameModeExists: true, layoutMissing: true };
    }
    
    const getTypeInfoDeferred = new OperationDeferred<AssetTypeInfo | null>();
    await EventBus.instance.publishAsync(new GetAssetTypeInfoEvent(assetType, getTypeInfoDeferred));
    const typeInfoResult = await getTypeInfoDeferred.promise;
    
    if (!typeInfoResult.isSuccess || !typeInfoResult.value?.constructor) {
      logWarn(`[GameAsset] Could not get constructor for asset type: ${assetType}`, undefined, LOG_ASSETS);
      return { serialized: null, gameModeExists: true, layoutMissing: true };
    }
    
    const asset = await ScriptableObject.loadByGuid(typeInfoResult.value.constructor, layoutAsset.guid);
    if (!asset) {
      logWarn(`[GameAsset] Failed to load layout asset: ${layoutAsset.guid}`, undefined, LOG_ASSETS);
      return { serialized: null, gameModeExists: true, layoutMissing: true };
    }
    
    const layoutData = serialize(asset) as Record<string, unknown>;
    const serialized = toSerializedGameAssetFromLayoutSource(layoutData, gameId);
    return { serialized, gameModeExists: true, layoutMissing: false };
  } catch (error) {
    logWarn('[GameAsset] Error loading layout asset', { gameId, error }, LOG_ASSETS);
    return { serialized: null, gameModeExists: true, layoutMissing: true };
  }
}

export async function ensureGameAssetLoaded(gameId: string): Promise<void> {
  const currentAsset = getGameAsset();
  if (currentAsset && loadedGameId === gameId) {
    return;
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const result = await fetchSerializedAsset(gameId);
      
      if (!result.gameModeExists) {
        const error = new Error(`Game mode not found: ${gameId}. The game does not exist.`);
        logError(`[GameAsset] Cannot load - game mode missing: ${gameId}`, undefined, LOG_ASSETS);
        loadPromise = null;
        throw error;
      }

      const wasLayoutMissing = result.layoutMissing;
      const asset = hydrateSerializedAsset(result.serialized, result.serialized?.metadata?.gameId ?? gameId);
      setGameAsset(asset);
      loadedGameId = asset.metadata.gameId;
      
      if (wasLayoutMissing && SHOULD_PERSIST_DEFAULT_ASSET) {
        logInfo(`[GameAsset] Layout missing - generated defaults and auto-saving: ${asset.metadata.gameId}`, undefined, LOG_ASSETS);
        await persistGameAsset(asset);
      } else if (wasLayoutMissing) {
        logWarn(`[GameAsset] Layout missing - generated defaults (dev auto-save disabled): ${asset.metadata.gameId}`, undefined, LOG_ASSETS);
      }
      loadPromise = null;
    })();
  }

  await loadPromise;
}

export async function persistGameAsset(asset: GameAsset): Promise<void> {
  try {
    const gameMode = await getGameMode(asset.metadata.gameId);
    const layoutAsset = gameMode?.layoutAsset;
    
    if (!layoutAsset || !layoutAsset.guid) {
      logWarn(`[GameAsset] Cannot auto-save: game mode missing or no layoutAsset: ${asset.metadata.gameId}`, undefined, LOG_ASSETS);
      return;
    }

    const guidString = String(layoutAsset.guid);
    const loader = AssetLoader.getInstance();
    const response = await loader.loadAssetByGuid(guidString);
    if (!response.ok) {
      throw new Error(`Failed to load layout asset: ${guidString}`);
    }
    const text = await response.text();
    const assetType = ScriptableObject.extractAssetType(text);
    if (!assetType) {
      throw new Error(`Could not determine asset type for layout: ${guidString}`);
    }

    const getTypeInfoDeferred = new OperationDeferred<AssetTypeInfo | null>();
    await EventBus.instance.publishAsync(new GetAssetTypeInfoEvent(assetType, getTypeInfoDeferred));
    const typeInfoResult = await getTypeInfoDeferred.promise;
    if (!typeInfoResult.isSuccess || !typeInfoResult.value?.constructor) {
      throw new Error(`Could not get constructor for asset type: ${assetType}`);
    }

    const layoutInstance = await ScriptableObject.loadByGuid(typeInfoResult.value.constructor, layoutAsset.guid);
    if (!layoutInstance) {
      throw new Error(`Failed to load layout asset instance: ${guidString}`);
    }

    Object.assign(layoutInstance, asset);

    await layoutInstance.saveChanges();
    logInfo(`[GameAsset] Saved layout asset: ${asset.metadata.gameId}`, undefined, LOG_ASSETS);
  } catch (error) {
    logError(`[GameAsset] Failed to persist asset: ${asset.metadata.gameId}`, error, LOG_ASSETS);
  }
}

export async function loadGameUiPreset(gameId: string): Promise<GameAsset> {
  await ensureGameAssetLoaded(gameId);
  const asset = getGameAsset();
  if (!asset) {
    throw new Error(`Failed to load game asset for ${gameId}`);
  }
  return asset;
}
