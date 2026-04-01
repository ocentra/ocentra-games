import { normalizeAssetType } from '../utils/assetTypeUtils.js';
const registry = new Map();
export function register(typeName, constructor) {
    const normalized = normalizeAssetType(typeName);
    registry.set(normalized, constructor);
}
export function get(typeName) {
    const normalized = normalizeAssetType(typeName);
    return registry.get(normalized) ?? null;
}
export function has(typeName) {
    const normalized = normalizeAssetType(typeName);
    return registry.has(normalized);
}
export function clear() {
    registry.clear();
}
