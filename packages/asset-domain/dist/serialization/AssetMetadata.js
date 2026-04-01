import JSON5 from 'json5';
import { AssetGUID } from '../AssetGUID.js';
import { normalizeAssetType } from '../utils/assetTypeUtils.js';
export function parseJson5Asset(content) {
    try {
        return JSON5.parse(content.trim());
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to parse JSON5 asset: ${message}`);
    }
}
export function extractGuid(content) {
    try {
        const parsed = parseJson5Asset(content);
        if (parsed.system && typeof parsed.system === 'object') {
            const system = parsed.system;
            const guid = system.guid;
            const assetGuid = AssetGUID.fromJSON(guid);
            return assetGuid ? assetGuid.toString() : null;
        }
    }
    catch {
        return null;
    }
    return null;
}
export function extractAssetType(content) {
    try {
        const parsed = parseJson5Asset(content);
        if (parsed.system && typeof parsed.system === 'object') {
            const system = parsed.system;
            const assetType = system.assetType;
            if (typeof assetType === 'string') {
                return normalizeAssetType(assetType);
            }
        }
    }
    catch {
        return null;
    }
    return null;
}
export function convertAssetGUIDsToString(value) {
    if (value instanceof AssetGUID) {
        return value.toString();
    }
    if (Array.isArray(value)) {
        return value.map(item => convertAssetGUIDsToString(item));
    }
    if (value && typeof value === 'object') {
        const obj = value;
        const converted = {};
        for (const [key, val] of Object.entries(obj)) {
            converted[key] = convertAssetGUIDsToString(val);
        }
        return converted;
    }
    return value;
}
export function serializeJson5Asset(data) {
    const sanitized = convertAssetGUIDsToString(data);
    return JSON.stringify(sanitized, null, 2).replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g, '$1:');
}
