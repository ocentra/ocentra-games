import { serialize, deserialize as deserializeFromSerializable, SCHEMA_VERSION_KEY } from '@/Serializable';
import { getSerializableClassMetadata, type SerializableConstructor } from '@/serialization/decorators';
import { normalizeAssetType, deriveCategoryFromAssetType } from '@/utils/assetTypeUtils';
import { AssetTypeCategory, type AssetCategory } from '@/constants/assets';
import { parseJson5Asset, serializeJson5Asset } from './AssetMetadata';
import { isGameId, asGameId } from '@/types/assetIdentifier';

export interface SerializeAssetInstance {
  guid: { toString(): string };
  displayName?: string;
  category?: AssetCategory;
  treePath: string;
  variant?: string;
  constructor: SerializableConstructor & {
    assetType?: string;
    schemaVersion?: number;
    displayName?: string;
    icon?: string;
    category?: AssetCategory;
    name: string;
  };
}

export function serializeAsset(instance: SerializeAssetInstance): string {
  const rawData = serialize(instance) as Record<string, unknown>;
  const userData = { ...rawData };
  delete userData[SCHEMA_VERSION_KEY];

  const Constructor = instance.constructor;
  const classMetadata = getSerializableClassMetadata(Constructor);
  const assetType = classMetadata?.assetType ?? Constructor.assetType ?? Constructor.name;
  const schemaVersion = classMetadata?.schemaVersion ?? Constructor.schemaVersion ?? 1;
  const displayName = instance.displayName ?? classMetadata?.displayName ?? Constructor.displayName ?? Constructor.name;
  const category = instance.category ?? classMetadata?.category ?? Constructor.category ?? AssetTypeCategory.Content;
  const icon = classMetadata?.icon ?? Constructor.icon;
  const guid = instance.guid;

  if (!guid) {
    throw new Error(`Asset instance must have a GUID before serialization: ${Constructor.name}`);
  }

  const system: Record<string, unknown> = {
    guid: guid.toString(),
    assetType: normalizeAssetType(assetType),
    schemaVersion,
    displayName,
    category,
  };

  if (icon) {
    system.icon = icon;
  }

  if (instance.variant) {
    system.variant = instance.variant;
  }

  if (instance.treePath) {
    system.treePath = instance.treePath;
  }

  const instanceWithGameId = instance as SerializeAssetInstance & { getGameId?: () => string };
  if (typeof instanceWithGameId.getGameId === 'function') {
    try {
      const gameId = instanceWithGameId.getGameId();
      if (gameId) {
        system.gameId = gameId;
      }
    } catch {
      // ignore
    }
  }

  const instanceWithCategory = instance as SerializeAssetInstance & { gameModeCategory?: string };
  if (instanceWithCategory.gameModeCategory) {
    system.gameModeCategory = instanceWithCategory.gameModeCategory;
  }

  const asset: Record<string, unknown> = {
    system,
    data: userData,
  };

  return serializeJson5Asset(asset);
}

export interface DeserializeAssetOptions {
  strictAssetType?: boolean;
}

export function deserializeAsset<T>(
  constructor: new () => T,
  input: string | Record<string, unknown>,
  _options?: DeserializeAssetOptions
): T {
  let parsed: Record<string, unknown>;

  if (typeof input === 'string') {
    parsed = parseJson5Asset(input);
  } else {
    parsed = input;
  }

  if (!parsed.system || !parsed.data || typeof parsed.system !== 'object' || typeof parsed.data !== 'object') {
    throw new Error('Asset must have system and data objects');
  }

  const system = parsed.system as Record<string, unknown>;
  const data = parsed.data as Record<string, unknown>;

  const classMetadata = getSerializableClassMetadata(constructor as unknown as SerializableConstructor);
  const expectedAssetType = classMetadata?.assetType ?? (constructor as { assetType?: string }).assetType ?? constructor.name;
  const fileAssetType = system.assetType as string | undefined;

  if (fileAssetType && fileAssetType !== expectedAssetType) {
    throw new Error(`Asset type mismatch: file has "${fileAssetType}" but trying to deserialize as "${expectedAssetType}"`);
  }

  if (typeof system.schemaVersion === 'number') {
    data[SCHEMA_VERSION_KEY] = system.schemaVersion;
  }

  const result = deserializeFromSerializable(constructor, data);

  if (system.gameId && (constructor.name.includes('GameMode') || constructor.name === 'GameInfo')) {
    const instance = result as { gameId?: string };
    if (instance && typeof system.gameId === 'string') {
      if (!isGameId(system.gameId)) {
        throw new Error(`Invalid gameId "${system.gameId}" in system metadata for ${constructor.name}. Must start with a letter and contain only letters/numbers.`);
      }
      instance.gameId = asGameId(system.gameId);
    }
  }

  if (constructor.name.includes('GameMode')) {
    const instance = result as { gameModeCategory?: string };
    if (system.gameModeCategory && typeof system.gameModeCategory === 'string') {
      instance.gameModeCategory = system.gameModeCategory;
    } else if (system.assetType && typeof system.assetType === 'string') {
      const derived = deriveCategoryFromAssetType(system.assetType);
      if (derived) {
        instance.gameModeCategory = derived;
      }
    }
  }

  const resultWithDisplay = result as { displayName?: string; category?: AssetCategory; variant?: string; treePath?: string };
  if (system.displayName && typeof system.displayName === 'string') {
    resultWithDisplay.displayName = system.displayName;
  }
  if (system.category && typeof system.category === 'string') {
    resultWithDisplay.category = system.category as AssetCategory;
  }
  if (system.variant && typeof system.variant === 'string') {
    resultWithDisplay.variant = system.variant;
  }
  if (system.treePath && typeof system.treePath === 'string') {
    resultWithDisplay.treePath = system.treePath;
  }

  return result;
}
