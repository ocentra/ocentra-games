import { invoke } from '@tauri-apps/api/core'
import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local'

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

const BROWSER_ASSET_INDEX_ENDPOINT = LocalApiEndpoint.AssetEditor.DiskResourceEntries

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

export function createBrowserResourceUrl(path: string): URL {
  const normalizedPath = normalizeResourcePath(path)
  if (
    normalizedPath.includes('\0') ||
    /^[a-z][a-z0-9+.-]*:/i.test(normalizedPath)
  ) {
    throw new Error('Invalid browser asset path')
  }
  const resourcePath = normalizedPath
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/')
  return new URL(`/Resources/${resourcePath}`, window.location.origin)
}

function isInternalResourceIndexPath(path: string): boolean {
  return normalizeResourcePath(path).toLowerCase().endsWith('.meta')
}

function filterInternalResourceIndexEntries(
  entries: AssetIndexEntry[]
): AssetIndexEntry[] {
  return entries.filter((entry) => !isInternalResourceIndexPath(entry.path))
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
  hash?: string
  assetType?: string
}): Promise<Response> {
  const { guid, path, hash, assetType } = identifier

  let resolvedPath = path
  if (guid && !resolvedPath && !isTauri()) {
    try {
      const entry = await getResourceByGuidDb(guid)
      if (entry?.resourceEntryType === 'AssetResourceEntry') {
        resolvedPath = entry.path
      }
    } catch {
      resolvedPath = undefined
    }
  }
  if (assetType && !resolvedPath) {
    try {
      const entry = await getResourceByAssetTypeDb(assetType)
      if (entry?.resourceEntryType === 'AssetResourceEntry') {
        resolvedPath = entry.path
      }
    } catch {
      resolvedPath = undefined
    }
  }
  if (hash && !resolvedPath) {
    try {
      resolvedPath = await resolvePathByHash(hash)
    } catch {
      resolvedPath = undefined
    }
  }

  if (hash && !resolvedPath && isTauri()) {
    throw new Error(`Unable to resolve image hash in local resource index: ${hash}`)
  }

  const input = guid
    ? { guid, path: null, hash: null }
    : resolvedPath
      ? { guid: null, path: normalizeResourcePath(resolvedPath), hash: null }
      : hash
        ? { guid: null, path: null, hash }
        : null
  if (!input) {
    throw new Error('loadAsset: exactly one of guid, path, hash or assetType required')
  }
  if (!isTauri()) {
    if (!resolvedPath) {
      throw new Error('Browser asset loading requires a path identifier')
    }
    return fetch(createBrowserResourceUrl(resolvedPath))
  }
  const bytes = await invoke<number[]>('load_asset', { input })
  const responsePathForMime = resolvedPath ?? path ?? ''
  const contentType = responsePathForMime
    ? inferMimeType(responsePathForMime)
    : 'application/json'
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': contentType },
  })
}

async function resolvePathByHash(hash: string): Promise<string | undefined> {
  const entry = await getResourceByHashDb(hash)
  if (entry?.resourceEntryType === 'ImageResourceEntry') {
    return entry.path
  }

  if (!isTauri()) {
    return undefined
  }

  await rebuildIndex()
  const refreshedEntry = await getResourceByHashDb(hash)
  return refreshedEntry?.resourceEntryType === 'ImageResourceEntry'
    ? refreshedEntry.path
    : undefined
}

export async function writeAsset(
  path: string,
  content: Uint8Array
): Promise<void> {
  if (!isTauri()) {
    const response = await fetch(LocalApiEndpoint.AssetEditor.WriteAsset, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: normalizeResourcePath(path),
        content: Array.from(content),
      }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?: string }
      throw new Error(data.error ?? `Failed to write asset: ${response.status}`)
    }
    return
  }
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
  if (!isTauri()) {
    const entries = await getDiskResourceEntriesFromTauri()
    return entries.map((entry) => ({
      path: entry.path,
      size: entry.fileSize,
      modified_secs: null,
    }))
  }
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
  if (!isTauri()) {
    const normalizedFolder = normalizeResourcePath(folder).replace(/\/$/, '')
    const entries = await getDiskResourceEntriesFromTauri()
    const prefix = normalizedFolder.length > 0 ? `${normalizedFolder}/` : ''
    return entries.filter((entry) => {
      if (!entry.path.startsWith(prefix)) {
        return false
      }
      const suffix = entry.path.slice(prefix.length)
      return suffix.length > 0 && !suffix.includes('/')
    })
  }
  try {
    const entries = await invoke<AssetIndexEntry[]>('get_resources_in_folder_db', {
      folder,
    })
    return filterInternalResourceIndexEntries(entries)
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
  if (!isTauri()) {
    const response = await fetch(BROWSER_ASSET_INDEX_ENDPOINT)
    if (!response.ok) {
      throw new Error(`Failed to fetch browser asset index: ${response.status}`)
    }
    const entries = (await response.json()) as AssetIndexEntry[]
    return filterInternalResourceIndexEntries(entries)
  }
  try {
    const entries = await invoke<AssetIndexEntry[]>('get_disk_resource_entries_db')
    return filterInternalResourceIndexEntries(entries)
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
    const payload = await invoke<TauriResourceQueryPayload>('query_resources_db', {
      input,
    })
    return {
      ...payload,
      items: payload.items.filter((item) => !isInternalResourceIndexPath(item.path)),
    }
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function getResourceByGuidDb(
  guid: string
): Promise<AssetIndexEntry | null> {
  if (!isTauri()) {
    const entries = await getDiskResourceEntriesFromTauri()
    return (
      entries.find(
        (entry) =>
          entry.resourceEntryType === 'AssetResourceEntry' &&
          'guid' in entry &&
          entry.guid === guid
      ) ?? null
    )
  }
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

function normalizeAssetTypeForLookup(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

export async function getResourceByAssetTypeDb(
  assetType: string
): Promise<AssetIndexEntry | null> {
  const requested = normalizeAssetTypeForLookup(assetType)
  const entries = await getDiskResourceEntriesFromTauri()
  return (
    entries.find((entry) => {
      if (entry.resourceEntryType !== 'AssetResourceEntry') {
        return false
      }
      return normalizeAssetTypeForLookup(entry.assetType) === requested
    }) ?? null
  )
}

export async function getResourceByHashDb(
  hash: string
): Promise<AssetIndexEntry | null> {
  if (!isTauri()) {
    const entries = await getDiskResourceEntriesFromTauri()
    return (
      entries.find(
        (entry) =>
          entry.resourceEntryType === 'ImageResourceEntry' &&
          'hash' in entry &&
          entry.hash === hash
      ) ?? null
    )
  }
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
  tags?: string[]
  featuredTopBadges?: { label: string; tone?: string }[]
  featuredBottomBadges?: { label: string; tone?: string }[]
  tagline?: string
  tagline2?: string
  shortDescription?: string
  description?: string
  minPlayers?: number
  maxPlayers?: number
  gameCategory?: string
  subcategory?: string | null
  difficulty?: string
  duration?: string
  deck?: string
  playersDisplay?: string
  quality?: string
  bannerImage?: string
  gameIcon?: string
  carouselImages?: string[]
  carouselPlaybackMode?: string
  carouselTransitionType?: string
  carouselTransitionDurationMs?: number
  bannerLogoImage?: string
  bannerLogoAlt?: string
  bannerLogoStartMs?: number
  bannerLogoDurationMs?: number
  bannerLogoScaleFrom?: number
  bannerLogoScaleTo?: number
  bannerLogoOpacityFrom?: number
  bannerLogoOpacityTo?: number
  bannerLogoVisibleFromIndex?: number
  bannerLogoVisibleToIndex?: number
  bannerTitleText?: string
  bannerTitleColor?: string
  bannerTitleStartMs?: number
  bannerTitleDurationMs?: number
  bannerTitleScaleFrom?: number
  bannerTitleScaleTo?: number
  bannerTitleOpacityFrom?: number
  bannerTitleOpacityTo?: number
  bannerTitleVisibleFromIndex?: number
  bannerTitleVisibleToIndex?: number
  bannerOverlayTintColor?: string
  bannerOverlayTintOpacity?: number
  bannerVignetteOpacity?: number
  bannerFadeToBlackOpacity?: number
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
