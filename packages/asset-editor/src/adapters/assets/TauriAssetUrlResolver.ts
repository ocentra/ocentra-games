import { getWorkerBaseUrl, resolveAssetDownloadUrl } from '@ocentra/endpoint-domain/utils/resolve-asset-download-url';
import { getResourceByGuidDb, getResourceByHashDb } from '@/adapters/assets/TauriAssetAdapter';
import { indexEntryToResourceEntry } from '@/adapters/assets/diskResourceLoader';
import { getStorageConfig } from '@/services/storage/StorageConfig';
import { AssetEditorSyncTarget, getActiveAssetEditorSyncTarget } from '@/services/storage/syncTarget';

const preferredPathByIdentifier = new Map<string, string>();

const SHA256_HEX = /^[a-f0-9]{64}$/i;

async function appendRealCloudDownloadUrl(
  identifier: string,
  urls: string[],
  guidEntry: Awaited<ReturnType<typeof getResourceByGuidDb>>,
  hashEntry: Awaited<ReturnType<typeof getResourceByHashDb>>
): Promise<void> {
  if (getActiveAssetEditorSyncTarget() !== AssetEditorSyncTarget.RealCloud) {
    return;
  }
  const config = getStorageConfig();
  if (!getWorkerBaseUrl(config)) {
    return;
  }
  const request = guidEntry
    ? { guid: identifier }
    : hashEntry
      ? { hash: identifier }
      : SHA256_HEX.test(identifier)
        ? { hash: identifier }
        : { guid: identifier };
  try {
    const url = await resolveAssetDownloadUrl(request, config);
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  } catch {
    return;
  }
}

export function setPreferredAssetUrl(identifier: string, url: string): void {
  const normalized = url.startsWith('/') ? url : `/${url}`;
  preferredPathByIdentifier.set(identifier, normalized);
}

export function getAssetUrlByGuid(identifier: string): string | null {
  const preferred = preferredPathByIdentifier.get(identifier);
  if (preferred) return preferred;
  return null;
}

export async function getAssetUrlByGuidAsync(identifier: string): Promise<string | null> {
  const preferred = preferredPathByIdentifier.get(identifier);
  if (preferred) return preferred;
  const entry = await getResourceByGuidDb(identifier);
  if (entry && 'path' in entry && entry.path) {
    const path = entry.path.startsWith('/') ? entry.path : `/${entry.path}`;
    return path;
  }
  const hashEntry = await getResourceByHashDb(identifier);
  if (hashEntry && 'path' in hashEntry && hashEntry.path) {
    const path = hashEntry.path.startsWith('/') ? hashEntry.path : `/${hashEntry.path}`;
    return path;
  }
  return null;
}

export async function getAssetCandidateUrls(identifier: string): Promise<string[]> {
  const preferred = preferredPathByIdentifier.get(identifier);
  const urls: string[] = [];

  const guidEntry = await getResourceByGuidDb(identifier);
  if (guidEntry) {
    const entry = indexEntryToResourceEntry(guidEntry);
    const path = entry.path?.startsWith('/') ? entry.path : `/${entry.path ?? ''}`;
    if (path && !urls.includes(path)) urls.push(path);
  }

  const hashEntry = await getResourceByHashDb(identifier);
  if (hashEntry) {
    const entry = indexEntryToResourceEntry(hashEntry);
    const path = entry.path?.startsWith('/') ? entry.path : `/${entry.path ?? ''}`;
    if (path && !urls.includes(path)) urls.push(path);
  }

  if (preferred) {
    const ordered = [preferred, ...urls.filter((u) => u !== preferred)];
    await appendRealCloudDownloadUrl(identifier, ordered, guidEntry, hashEntry);
    return ordered;
  }
  await appendRealCloudDownloadUrl(identifier, urls, guidEntry, hashEntry);
  return urls;
}

export function clearAssetUrlCache(): void {
  preferredPathByIdentifier.clear();
}
