import { normalizeAssetType } from '../utils/assetTypeUtils';

type AssetConstructor = new () => unknown;

const registry = new Map<string, AssetConstructor>();

export function register(typeName: string, constructor: AssetConstructor): void {
  const normalized = normalizeAssetType(typeName);
  registry.set(normalized, constructor);
}

export function get(typeName: string): AssetConstructor | null {
  const normalized = normalizeAssetType(typeName);
  return registry.get(normalized) ?? null;
}

export function has(typeName: string): boolean {
  const normalized = normalizeAssetType(typeName);
  return registry.has(normalized);
}

export function clear(): void {
  registry.clear();
}
