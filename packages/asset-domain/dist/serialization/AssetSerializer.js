import { serialize, deserialize as deserializeFromSerializable, SCHEMA_VERSION_KEY } from '../Serializable.js';
import { getSerializableClassMetadata } from '../serialization/decorators.js';
import { normalizeAssetType, deriveCategoryFromAssetType } from '../utils/assetTypeUtils.js';
import { AssetTypeCategory } from '../constants/assets.js';
import { parseJson5Asset, serializeJson5Asset } from './AssetMetadata.js';
import { isGameId, asGameId } from '../types/assetIdentifier.js';
export function serializeAsset(instance) {
    const rawData = serialize(instance);
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
    const system = {
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
    const instanceWithGameId = instance;
    if (typeof instanceWithGameId.getGameId === 'function') {
        try {
            const gameId = instanceWithGameId.getGameId();
            if (gameId) {
                system.gameId = gameId;
            }
        }
        catch {
            // ignore
        }
    }
    const instanceWithCategory = instance;
    if (instanceWithCategory.gameModeCategory) {
        system.gameModeCategory = instanceWithCategory.gameModeCategory;
    }
    const asset = {
        system,
        data: userData,
    };
    return serializeJson5Asset(asset);
}
export function deserializeAsset(constructor, input, _options) {
    let parsed;
    if (typeof input === 'string') {
        parsed = parseJson5Asset(input);
    }
    else {
        parsed = input;
    }
    if (!parsed.system || !parsed.data || typeof parsed.system !== 'object' || typeof parsed.data !== 'object') {
        throw new Error('Asset must have system and data objects');
    }
    const system = parsed.system;
    const data = parsed.data;
    const classMetadata = getSerializableClassMetadata(constructor);
    const expectedAssetType = classMetadata?.assetType ?? constructor.assetType ?? constructor.name;
    const fileAssetType = system.assetType;
    if (fileAssetType && fileAssetType !== expectedAssetType) {
        throw new Error(`Asset type mismatch: file has "${fileAssetType}" but trying to deserialize as "${expectedAssetType}"`);
    }
    if (typeof system.schemaVersion === 'number') {
        data[SCHEMA_VERSION_KEY] = system.schemaVersion;
    }
    const result = deserializeFromSerializable(constructor, data);
    if (system.gameId && (constructor.name.includes('GameMode') || constructor.name === 'GameInfo')) {
        const instance = result;
        if (instance && typeof system.gameId === 'string') {
            if (!isGameId(system.gameId)) {
                throw new Error(`Invalid gameId "${system.gameId}" in system metadata for ${constructor.name}. Must start with a letter and contain only letters/numbers.`);
            }
            instance.gameId = asGameId(system.gameId);
        }
    }
    if (constructor.name.includes('GameMode')) {
        const instance = result;
        if (system.gameModeCategory && typeof system.gameModeCategory === 'string') {
            instance.gameModeCategory = system.gameModeCategory;
        }
        else if (system.assetType && typeof system.assetType === 'string') {
            const derived = deriveCategoryFromAssetType(system.assetType);
            if (derived) {
                instance.gameModeCategory = derived;
            }
        }
    }
    const resultWithDisplay = result;
    if (system.displayName && typeof system.displayName === 'string') {
        resultWithDisplay.displayName = system.displayName;
    }
    if (system.category && typeof system.category === 'string') {
        resultWithDisplay.category = system.category;
    }
    if (system.variant && typeof system.variant === 'string') {
        resultWithDisplay.variant = system.variant;
    }
    if (system.treePath && typeof system.treePath === 'string') {
        resultWithDisplay.treePath = system.treePath;
    }
    return result;
}
