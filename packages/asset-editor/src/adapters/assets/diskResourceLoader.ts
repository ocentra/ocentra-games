import JSON5 from 'json5'
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry'
import { AssetDocumentSchema } from '@/lib/validation/schemas'
import { ImageResourceEntry } from '@ocentra/asset-domain/resourceEntry/ImageResourceEntry'
import { FileResourceEntry } from '@ocentra/asset-domain/resourceEntry/FileResourceEntry'
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry'
import {
  isTauri,
  rebuildIndex,
  scanAssets,
  readAsset,
  computeAssetHash,
  getDiskResourceEntriesFromTauri,
  isInternalResourceIndexPath,
} from '@/adapters/assets/TauriAssetAdapter'
import type { Infer } from '@ocentra/schema-domain/effect';
import { AssetIndexEntrySchema } from '@/lib/validation/schemas'
import { Timestamp } from '@ocentra/asset-domain/core/Timestamp'
import type {
  AssetChecksum,
  ImageHash,
} from '@ocentra/asset-domain/types/assetIdentifier'

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)$/i

function toResourcesPath(relPath: string): string {
  const normalized = relPath.replace(/\\/g, '/').replace(/^\/+/, '')
  return normalized.startsWith('Resources/')
    ? normalized
    : `Resources/${normalized}`
}

function nowTs(): Timestamp {
  return Timestamp.now()
}

function asChecksum(s: string): AssetChecksum {
  return s as AssetChecksum
}

function asImageHash(s: string): ImageHash {
  return s as ImageHash
}

export function indexEntryToResourceEntry(
  entry: Infer<typeof AssetIndexEntrySchema>
): ResourceEntry {
  const path = toResourcesPath(entry.path)
  const now = nowTs()
  if (entry.resourceEntryType === 'AssetResourceEntry') {
    const r = new AssetResourceEntry(
      entry.assetType as never,
      entry.guid as never
    )
    r.path = path
    r.displayName = entry.displayName
    r.fileSize = entry.fileSize
    r.checksum = undefined
    r.createdAt = now
    r.updatedAt = now
    r.lastScanAt = now
    return r
  }
  if (entry.resourceEntryType === 'ImageResourceEntry') {
    const r = new ImageResourceEntry()
    r.path = path
    r.displayName = path.split('/').pop() ?? ''
    r.hash = asImageHash(entry.hash)
    r.fileSize = entry.fileSize
    r.checksum = asChecksum(entry.hash)
    r.createdAt = now
    r.updatedAt = now
    r.lastScanAt = now
    return r
  }
  const r = new FileResourceEntry()
  r.path = path
  r.displayName = path.split('/').pop() ?? ''
  r.checksum = asChecksum(entry.checksum)
  r.fileSize = entry.fileSize
  r.createdAt = now
  r.updatedAt = now
  r.lastScanAt = now
  return r
}

let cachedEntriesPromise: Promise<ResourceEntry[]> | null = null;
let lastScanTime = 0;
const CACHE_TTL = 2000; // 2 seconds

export async function getDiskResourceEntries(): Promise<ResourceEntry[]> {
  const now = Date.now();
  if (cachedEntriesPromise && (now - lastScanTime < CACHE_TTL)) {
    return cachedEntriesPromise;
  }

  cachedEntriesPromise = (async () => {
    try {
      const entries = await _getDiskResourceEntriesInternal();
      lastScanTime = Date.now();
      return entries;
    } catch (error) {
      cachedEntriesPromise = null;
      throw error;
    }
  })();

  return cachedEntriesPromise;
}

async function _getDiskResourceEntriesInternal(): Promise<ResourceEntry[]> {
  if (isTauri()) {
    const loadFromTauri = async (): Promise<ResourceEntry[]> => {
      const entries = await getDiskResourceEntriesFromTauri()
      const valid = entries.filter(
        e => AssetIndexEntrySchema.safeParse(e).success
      )
      return valid.map(e =>
        indexEntryToResourceEntry(AssetIndexEntrySchema.parse(e))
      )
    }

    try {
      const entries = await loadFromTauri()
      if (entries.length > 0) {
        return entries
      }
      await rebuildIndex()
      return await loadFromTauri()
    } catch (error) {
      try {
        await rebuildIndex()
        return await loadFromTauri()
      } catch {
        throw error instanceof Error
          ? error
          : new Error('Tauri resource index unavailable')
      }
    }
  }

  try {
    const entries = await getDiskResourceEntriesFromTauri()
    const valid = entries.filter(
      e => AssetIndexEntrySchema.safeParse(e).success
    )
    if (valid.length > 0) {
      return valid.map(e =>
        indexEntryToResourceEntry(AssetIndexEntrySchema.parse(e))
      )
    }
  } catch {
    /* fallback to full scan */
  }
  const metas = await scanAssets()
  const entries: ResourceEntry[] = []

  for (const meta of metas) {
    const path = toResourcesPath(meta.path)
    const lowerPath = path.toLowerCase()
    const fileName = path.split('/').pop() ?? ''

    if (isInternalResourceIndexPath(path)) {
      continue
    }

    if (lowerPath.endsWith('.asset')) {
      try {
        const res = await readAsset(path)
        const text = await res.text()
        const raw = JSON5.parse(text) as unknown
        const result = AssetDocumentSchema.safeParse(raw)
        if (!result.success) continue
        const sys = result.data.system
        const guid = typeof sys?.guid === 'string' ? sys.guid : ''
        const assetType = (
          typeof sys?.assetType === 'string' ? sys.assetType : 'Unknown'
        ) as string
        const displayName =
          typeof sys?.displayName === 'string'
            ? sys.displayName
            : fileName.replace(/\.asset$/, '')

        if (!guid) continue

        const checksum = await computeAssetHash(path)
        const entry = new AssetResourceEntry(assetType as never, guid as never)
        entry.path = path
        entry.displayName = displayName
        entry.fileSize = meta.size
        entry.checksum = asChecksum(checksum)
        entry.createdAt = nowTs()
        entry.updatedAt = nowTs()
        entry.lastScanAt = nowTs()
        entries.push(entry)
      } catch {
        continue
      }
      continue
    }

    if (IMAGE_EXTENSIONS.test(fileName)) {
      try {
        const hash = await computeAssetHash(path)
        const entry = new ImageResourceEntry()
        entry.path = path
        entry.displayName = fileName
        entry.hash = asImageHash(hash)
        entry.fileSize = meta.size
        entry.checksum = asChecksum(hash)
        entry.createdAt = nowTs()
        entry.updatedAt = nowTs()
        entry.lastScanAt = nowTs()
        entries.push(entry)
      } catch {
        continue
      }
      continue
    }

    try {
      const checksum = await computeAssetHash(path)
      const entry = new FileResourceEntry()
      entry.path = path
      entry.displayName = fileName
      entry.checksum = asChecksum(checksum)
      entry.fileSize = meta.size
      entry.createdAt = nowTs()
      entry.updatedAt = nowTs()
      entry.lastScanAt = nowTs()
      entries.push(entry)
    } catch {
      continue
    }
  }

  return entries
}
