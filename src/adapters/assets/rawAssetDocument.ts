import { resolveAssetDownloadUrl } from '@ocentra/endpoint-domain/utils/resolve-asset-download-url';
import { getStorageConfig } from '@/services/storage/StorageConfig';

type LooseRecord = Record<string, unknown>;

function isRecord(value: unknown): value is LooseRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function parseJson5Text(text: string): Promise<LooseRecord | null> {
  if (!text.trim()) {
    return null;
  }

  const parsed = new Function(`"use strict"; return (${text});`)() as unknown;
  return isRecord(parsed) ? parsed : null;
}

export async function loadRawAssetTextByGuid(guid: string): Promise<string | null> {
  try {
    const url = await resolveAssetDownloadUrl({ guid }, getStorageConfig());
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

export async function loadRawAssetDocumentByGuid(guid: string): Promise<LooseRecord | null> {
  const text = await loadRawAssetTextByGuid(guid);
  if (!text) {
    return null;
  }

  try {
    return await parseJson5Text(text);
  } catch {
    return null;
  }
}
