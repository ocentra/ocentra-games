import JSON5 from 'json5';
import { AssetGUID } from '@/AssetGUID';
import { normalizeAssetType } from '@/utils/assetTypeUtils';

export function parseJson5Asset(content: string): Record<string, unknown> {
  try {
    return JSON5.parse(content.trim()) as Record<string, unknown>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JSON5 asset: ${message}`);
  }
}

export function extractGuid(content: string): string | null {
  try {
    const parsed = parseJson5Asset(content);
    if (parsed.system && typeof parsed.system === 'object') {
      const system = parsed.system as Record<string, unknown>;
      const guid = system.guid;
      const assetGuid = AssetGUID.fromJSON(guid);
      return assetGuid ? assetGuid.toString() : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function extractAssetType(content: string): string | null {
  try {
    const parsed = parseJson5Asset(content);
    if (parsed.system && typeof parsed.system === 'object') {
      const system = parsed.system as Record<string, unknown>;
      const assetType = system.assetType;
      if (typeof assetType === 'string') {
        return normalizeAssetType(assetType);
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function convertAssetGUIDsToString(value: unknown): unknown {
  if (value instanceof AssetGUID) {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(item => convertAssetGUIDsToString(item));
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const converted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      converted[key] = convertAssetGUIDsToString(val);
    }
    return converted;
  }
  return value;
}

export function serializeJson5Asset(data: Record<string, unknown>): string {
  const sanitized = convertAssetGUIDsToString(data) as Record<string, unknown>;
  return JSON.stringify(sanitized, null, 2).replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g, '$1:');
}
