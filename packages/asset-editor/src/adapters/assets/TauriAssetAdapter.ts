import { invoke } from '@tauri-apps/api/core'

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function normalizeResourcePath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '')
  return normalized.startsWith('Resources/')
    ? normalized.slice('Resources/'.length)
    : normalized
}

function inferMimeType(path: string): string {
  const lowerPath = path.toLowerCase()
  if (lowerPath.endsWith('.png')) return 'image/png'
  if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg'))
    return 'image/jpeg'
  if (lowerPath.endsWith('.webp')) return 'image/webp'
  if (lowerPath.endsWith('.gif')) return 'image/gif'
  if (lowerPath.endsWith('.bmp')) return 'image/bmp'
  if (lowerPath.endsWith('.svg')) return 'image/svg+xml'
  if (lowerPath.endsWith('.avif')) return 'image/avif'
  if (
    lowerPath.endsWith('.asset') ||
    lowerPath.endsWith('.json') ||
    lowerPath.endsWith('.meta')
  ) {
    return 'application/json'
  }
  if (lowerPath.endsWith('.txt')) return 'text/plain'
  return 'application/octet-stream'
}

interface DirEntry {
  name: string
  path: string
  is_dir: boolean
  size: number
}

interface AssetMeta {
  path: string
  size: number
  modified_secs: number | null
}

export interface IndexBuildStatus {
  running: boolean
  mode: string | null
  lastStartedAtMs: number | null
  lastCompletedAtMs: number | null
  lastError: string | null
}

export async function readAsset(path: string): Promise<Response> {
  return loadAsset({ path })
}

export async function loadAsset(identifier: {
  guid?: string
  path?: string
}): Promise<Response> {
  const { guid, path } = identifier
  const input = guid
    ? { guid, path: null }
    : path
      ? { guid: null, path: normalizeResourcePath(path) }
      : null
  if (!input) {
    throw new Error('loadAsset: exactly one of guid or path required')
  }
  const bytes = await invoke<number[]>('load_asset', { input })
  const contentType = path ? inferMimeType(path) : 'application/json'
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': contentType },
  })
}

export async function writeAsset(
  path: string,
  content: Uint8Array
): Promise<void> {
  try {
    await invoke('write_asset', {
      path: normalizeResourcePath(path),
      content: Array.from(content),
    })
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function deleteAsset(path: string): Promise<void> {
  try {
    await invoke('delete_asset', { path: normalizeResourcePath(path) })
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function listDir(folder: string): Promise<DirEntry[]> {
  try {
    return await invoke<DirEntry[]>('list_dir', {
      folder: normalizeResourcePath(folder),
    })
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function scanAssets(): Promise<AssetMeta[]> {
  try {
    return await invoke<AssetMeta[]>('scan_assets')
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getResourcesDir(): Promise<string> {
  try {
    return await invoke<string>('get_resources_dir')
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getLocalIndexHash(): Promise<string> {
  try {
    return await invoke<string>('get_local_index_hash')
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function computeAssetHash(path: string): Promise<string> {
  try {
    return await invoke<string>('compute_asset_hash', {
      path: normalizeResourcePath(path),
    })
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export type AssetIndexEntry =
  | {
      resourceEntryType: 'AssetResourceEntry'
      path: string
      guid: string
      assetType: string
      displayName: string
      fileSize: number
    }
  | {
      resourceEntryType: 'ImageResourceEntry'
      path: string
      hash: string
      fileSize: number
    }
  | {
      resourceEntryType: 'FileResourceEntry'
      path: string
      checksum: string
      fileSize: number
    }

export async function getResourcesInFolder(
  folder: string
): Promise<AssetIndexEntry[]> {
  try {
    return await invoke<AssetIndexEntry[]>('get_resources_in_folder_db', {
      folder,
    })
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function rebuildIndex(): Promise<void> {
  await invoke('rebuild_index')
}

export async function getIndexStatus(): Promise<IndexBuildStatus> {
  try {
    return await invoke<IndexBuildStatus>('get_index_status')
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getDiskResourceEntriesFromTauri(): Promise<
  AssetIndexEntry[]
> {
  try {
    return await invoke<AssetIndexEntry[]>('get_disk_resource_entries_db')
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getImageResourceEntriesFromTauri(): Promise<
  AssetIndexEntry[]
> {
  try {
    return await invoke<AssetIndexEntry[]>('get_image_resource_entries_db')
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export interface TauriCatalogResourceRecord {
  id: string
  path: string
  fileName: string
  typeLabel: string
  kind: 'asset' | 'image' | 'file'
}

export interface TauriImageResourceGroup {
  folder: string
  items: TauriCatalogResourceRecord[]
}

export interface TauriResourceQueryPayload {
  availableTypes: string[]
  items: TauriCatalogResourceRecord[]
}

export async function getImageResourceGroupsFromTauri(): Promise<
  TauriImageResourceGroup[]
> {
  try {
    return await invoke<TauriImageResourceGroup[]>('get_image_resource_groups_db')
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function queryResourcesFromTauri(input: {
  search?: string
  resourceType?: string
}): Promise<TauriResourceQueryPayload> {
  try {
    return await invoke<TauriResourceQueryPayload>('query_resources_db', {
      input,
    })
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getResourceByGuidDb(
  guid: string
): Promise<AssetIndexEntry | null> {
  try {
    return (
      (await invoke<AssetIndexEntry | null>('get_resource_by_guid_db', {
        guid,
      })) ?? null
    )
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getResourceByHashDb(
  hash: string
): Promise<AssetIndexEntry | null> {
  try {
    return (
      (await invoke<AssetIndexEntry | null>('get_resource_by_hash_db', {
        hash,
      })) ?? null
    )
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export interface TauriHomepageFeaturedGame {
  gameId: string
  guid: string
  name: string
  enabled: boolean
  releaseStatus?: string
  bannerImage?: string
  gameIcon?: string
}

export interface TauriComingSoonTeaser {
  id: string
  name: string
  bannerImage: string
  alt?: string
}

export interface TauriHomepageCatalogPayload {
  featured: TauriHomepageFeaturedGame[]
  availableNow: TauriHomepageFeaturedGame[]
}

export interface TauriHomepageComingSoonPayload {
  comingSoon: TauriComingSoonTeaser[]
}

export interface TauriFeatureBannerItem {
  title: string
  description: string
  imageHash: string
}

export interface TauriHomepageFeatureBannerPayload {
  featureBannerItems: TauriFeatureBannerItem[]
}

export async function getHomepageCatalogFromTauri(): Promise<TauriHomepageCatalogPayload> {
  return invoke<TauriHomepageCatalogPayload>('get_homepage_catalog')
}

export async function getHomepageComingSoonFromTauri(): Promise<TauriHomepageComingSoonPayload> {
  return invoke<TauriHomepageComingSoonPayload>('get_homepage_coming_soon')
}

export async function getHomepageFeatureBannerFromTauri(): Promise<TauriHomepageFeatureBannerPayload> {
  return invoke<TauriHomepageFeatureBannerPayload>('get_homepage_feature_banner')
}

export interface TauriGameCatalogEntry {
  gameId: string
  displayName: string
  guid: string
  path: string
  assetType: string
  mode: string
  enabled: boolean
  releaseStatus?: string
}

export interface TauriGameCatalogPayload {
  games: TauriGameCatalogEntry[]
}

export async function getGamesCatalogFromTauri(): Promise<TauriGameCatalogPayload> {
  return invoke<TauriGameCatalogPayload>('get_games_catalog')
}

export interface CatalogCountsPayload {
  games: number
  images: number
  resources: number
}

export async function getCatalogCountsFromTauri(): Promise<CatalogCountsPayload> {
  return invoke<CatalogCountsPayload>('get_catalog_counts')
}
