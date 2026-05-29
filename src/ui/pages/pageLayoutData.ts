import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';

type LooseRecord = Record<string, unknown>;

type ResourceEntryRef = {
  guid?: string;
  path?: string;
  assetType?: string;
  checksum?: string;
};

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
}

function dataOf(document: unknown): LooseRecord {
  const record = asRecord(document);
  const data = asRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

function findResourceByPath(resources: ResourceEntryRef[], path: string, assetType = ''): ResourceEntryRef | null {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) return null;
  return resources.find((resource) => (
    resource.guid &&
    normalizePath(resource.path ?? '') === normalizedPath &&
    (!assetType || !resource.assetType || resource.assetType === assetType)
  )) ?? null;
}

export async function loadPageLayoutData(assetPath: string): Promise<LooseRecord | null> {
  const resources = await getEntryIndexResourceEntries();
  const resource = findResourceByPath(resources, assetPath, 'PageLayout');
  if (!resource?.guid) return null;
  const layoutDocument = await loadRawAssetDocumentByGuid(resource.guid, {
    cache: 'no-store',
    checksum: resource.checksum,
  });
  return dataOf(layoutDocument);
}

export function recordOf(value: unknown): LooseRecord {
  return asRecord(value);
}
