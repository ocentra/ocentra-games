import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ViewMode } from './types'
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier'
import { toAssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier'
import type { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry'
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode'
import type { GameHome } from '@ocentra/game-asset-domain/schemas/game-home-schema'
import {
  HomePageGamesDocumentSchema,
  type HomePageGamesDocument,
} from '@ocentra/game-asset-domain/schemas/home-page-games-schema'
import type { ExploreGameSummary } from '@ocentra/core-ui'
import type { CategoryWithSubs, GamesExplorerGame } from '@ocentra/core-ui/GamesExplorer'
import { CATEGORY_VALUES } from '@ocentra/game-domain/game/categories'
import { FeaturedGameCarousel } from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameCarousel'
import { ComingSoonCarousel } from '@ocentra/core-ui/Common/ComingSoonCarousel/ComingSoonCarousel'
import {
  ExplorerContentBar,
  ExplorerSidebar,
  GameCard,
  GameListRow,
  GameListRowHeader,
} from '@ocentra/core-ui/GamesExplorer'
import { solanaImageUrl } from '@ocentra/app-assets/commons'
import { useResolveImageUrl } from '@/hooks/useResolveImageUrl'
import { PreviewPanelHeader } from './PreviewPanelHeader'
import {
  getCatalogCountsFromTauri,
  getGamesCatalogFromTauri,
  getHomepageCatalogFromTauri,
  getHomepageComingSoonFromTauri,
  getHomepageFeatureBannerFromTauri,
  getImageResourceGroupsFromTauri,
  queryResourcesFromTauri,
  isTauri,
  type AssetIndexEntry as TauriAssetIndexEntry,
} from '@/adapters/assets/TauriAssetAdapter'
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry'
import { AssetResourceEntry as AssetResourceEntryClass } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry'
import { isImageHash } from '@ocentra/asset-domain/types/assetIdentifier'
import './AssetCatalogPreview.css'
import './AssetCatalogGamesTab.css'

type AssetCatalogTab =
  | 'homepage'
  | 'games'
  | 'selected-game'
  | 'images'
  | 'sound'
  | 'video'
  | 'resources'

type CatalogResourceRecord = {
  id: string
  path: string
  fileName: string
  typeLabel: string
  kind: 'asset' | 'image' | 'file'
}

type ImageResourceGroup = {
  folder: string
  items: CatalogResourceRecord[]
}

type GameWithMetadata = {
  home: GameHome
  path: string
  entry: AssetResourceEntry<GameMode>
}

const RELEASE_STATUSES = new Set<NonNullable<GameHome['releaseStatus']>>([
  'ComingSoon',
  'Available',
  'Maintenance',
  'Deprecated',
])

type AssetCatalogPreviewProps = {
  assetId: string
  assetData: { system?: unknown; data?: unknown; metadata?: unknown }
  viewMode: ViewMode
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>
  navigationHistory: Array<{ path: string; name: string }>
  onBack?: () => void
  onNavigateToAsset?: (identifier: AssetIdentifier) => void
}

function extractModeFromPath(path: string): string {
  const match = path.match(/GameMode\/([^/]+)\//)
  return match ? match[1] : 'Other'
}

function extractGameIdFromPath(path: string): string | null {
  const match = path.match(/GameMode\/[^/]+\/([^/]+)\//)
  if (match?.[1]) return match[1]
  const segments = path.split('/')
  return segments.length >= 3 ? (segments[segments.length - 2] ?? null) : null
}

function toReleaseStatus(value: string | undefined): GameHome['releaseStatus'] {
  if (value && RELEASE_STATUSES.has(value as NonNullable<GameHome['releaseStatus']>)) {
    return value as GameHome['releaseStatus']
  }
  return undefined
}

function toCatalogResourceRecord(
  entry: ResourceEntry | TauriAssetIndexEntry
): CatalogResourceRecord {
  if ('resourceEntryType' in entry) {
    if (entry.resourceEntryType === 'AssetResourceEntry') {
      return {
        id: entry.guid,
        path: entry.path,
        fileName: entry.path.split('/').pop() ?? entry.displayName,
        typeLabel: entry.assetType,
        kind: 'asset',
      }
    }
    if (entry.resourceEntryType === 'ImageResourceEntry') {
      return {
        id: entry.hash,
        path: entry.path,
        fileName: entry.path.split('/').pop() ?? entry.hash,
        typeLabel: 'Image',
        kind: 'image',
      }
    }
    return {
      id: entry.checksum,
      path: entry.path,
      fileName: entry.path.split('/').pop() ?? entry.checksum,
      typeLabel: 'File',
      kind: 'file',
    }
  }

  if (entry instanceof AssetResourceEntryClass && entry.assetType) {
    return {
      id: entry.guid,
      path: entry.path,
      fileName: entry.path.split('/').pop() ?? entry.displayName,
      typeLabel: entry.assetType as string,
      kind: 'asset',
    }
  }

  if ('hash' in entry) {
    const hash = typeof entry.hash === 'string' ? entry.hash : ''
    return {
      id: hash,
      path: entry.path,
      fileName: entry.path.split('/').pop() ?? hash,
      typeLabel: 'Image',
      kind: 'image',
    }
  }

  return {
    id: entry.checksum ?? entry.path,
    path: entry.path,
    fileName: entry.path.split('/').pop() ?? entry.path,
    typeLabel: 'File',
    kind: 'file',
  }
}

export const AssetCatalogPreview: React.FC<AssetCatalogPreviewProps> = ({
  assetId,
  assetData: _assetData,
  viewMode,
  setViewMode,
  navigationHistory,
  onBack,
  onNavigateToAsset,
}) => {
  const [activeTab, setActiveTab] = useState<AssetCatalogTab>('homepage')
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [homepageData, setHomepageData] = useState<HomePageGamesDocument>({
    featured: [],
    recommended: [],
    comingSoon: [],
    availableNow: [],
    featureBannerItems: [],
  })
  const [isLoadingHomepageCatalog, setIsLoadingHomepageCatalog] =
    useState(true)
  const [isLoadingHomepageComingSoon, setIsLoadingHomepageComingSoon] =
    useState(true)
  const [isLoadingHomepageFeatureBanner, setIsLoadingHomepageFeatureBanner] =
    useState(true)
  const [gameEntries, setGameEntries] = useState<
    AssetResourceEntry<GameMode>[]
  >([])
  const [gamesWithMetadata, setGamesWithMetadata] = useState<
    GameWithMetadata[]
  >([])
  const [imageGroups, setImageGroups] = useState<ImageResourceGroup[]>([])
  const [resourceRows, setResourceRows] = useState<CatalogResourceRecord[]>([])
  const [resourceTypes, setResourceTypes] = useState<string[]>([])
  const [isLoadingGames, setIsLoadingGames] = useState(false)
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [isLoadingResources, setIsLoadingResources] = useState(false)
  const [hasLoadedGames, setHasLoadedGames] = useState(false)
  const [hasLoadedImages, setHasLoadedImages] = useState(false)
  const [gamesSearch, setGamesSearch] = useState('')
  const [gamesModeFilter, setGamesModeFilter] = useState('all')
  const [gamesCategory, setGamesCategory] = useState('all')
  const [gamesView, setGamesView] = useState<'grid' | 'list'>('grid')
  const [gamesCategoryExpanded, setGamesCategoryExpanded] = useState<
    Set<string>
  >(new Set())
  const [gamesSidebarCollapsed, setGamesSidebarCollapsed] = useState(false)
  const [resourcesSearch, setResourcesSearch] = useState('')
  const [resourcesFilter, setResourcesFilter] = useState('All')
  const [tabCounts, setTabCounts] = useState<{
    games: number | null
    images: number | null
    resources: number | null
  }>({ games: null, images: null, resources: null })
  const deferredGamesSearch = useDeferredValue(gamesSearch)
  const deferredResourcesSearch = useDeferredValue(resourcesSearch)

  const { resolveImageUrl, ImageLoaders, prefetchHashes } =
    useResolveImageUrl(homepageData)

  useEffect(() => {
    let isCancelled = false

    const setCatalogData = (
      nextCatalog: Pick<HomePageGamesDocument, 'featured' | 'recommended' | 'availableNow'>
    ) => {
      if (isCancelled) return
      setHomepageData(prev => ({ ...prev, ...nextCatalog }))
    }

    const setComingSoonData = (
      comingSoon: HomePageGamesDocument['comingSoon']
    ) => {
      if (isCancelled) return
      setHomepageData(prev => ({ ...prev, comingSoon }))
    }

    const setFeatureBannerData = (
      featureBannerItems: HomePageGamesDocument['featureBannerItems']
    ) => {
      if (isCancelled) return
      setHomepageData(prev => ({ ...prev, featureBannerItems }))
    }

    const load = async () => {
      setIsLoadingHomepageCatalog(true)
      setIsLoadingHomepageComingSoon(true)
      setIsLoadingHomepageFeatureBanner(true)

      if (isTauri()) {
        void (async () => {
          try {
            const payload = await getHomepageCatalogFromTauri()
            const featured = payload.featured.map(g => ({
              gameId: g.gameId,
              guid: g.guid,
              name: g.name,
              enabled: g.enabled,
              releaseStatus: g.releaseStatus,
              bannerImage: g.bannerImage,
              gameIcon: g.gameIcon,
              tags: [],
            }))
            const catalogData = HomePageGamesDocumentSchema.parse({
              featured,
              recommended: featured,
              comingSoon: [],
              availableNow: payload.availableNow.map(g => ({
                gameId: g.gameId,
                guid: g.guid,
                name: g.name,
                enabled: g.enabled,
                releaseStatus: g.releaseStatus,
                bannerImage: g.bannerImage,
                gameIcon: g.gameIcon,
                tags: [],
              })),
            })
            setCatalogData({
              featured: catalogData.featured,
              recommended: catalogData.recommended ?? [],
              availableNow: catalogData.availableNow,
            })
            const hashes = [
              ...payload.featured.flatMap(g =>
                [g.bannerImage, g.gameIcon].filter(
                  (hash): hash is string => typeof hash === 'string'
                )
              ),
              ...payload.availableNow.flatMap(g =>
                [g.bannerImage, g.gameIcon].filter(
                  (hash): hash is string => typeof hash === 'string'
                )
              ),
            ].filter(
              (
                hash
              ): hash is import('@ocentra/asset-domain/types/assetIdentifier').ImageHash =>
                isImageHash(hash)
            )
            if (hashes.length > 0) prefetchHashes(hashes)
          } catch {
            setCatalogData({ featured: [], recommended: [], availableNow: [] })
          } finally {
            if (!isCancelled) setIsLoadingHomepageCatalog(false)
          }
        })()

        void (async () => {
          try {
            const payload = await getHomepageComingSoonFromTauri()
            const teasers = HomePageGamesDocumentSchema.parse({
              featured: [],
              comingSoon: payload.comingSoon.map(c => ({
                id: c.id,
                name: c.name,
                bannerImage: c.bannerImage,
                alt: c.alt,
              })),
              availableNow: [],
            }).comingSoon
            setComingSoonData(teasers)
            const hashes = payload.comingSoon
              .map(c => c.bannerImage)
              .filter(
                (
                  hash
                ): hash is import('@ocentra/asset-domain/types/assetIdentifier').ImageHash =>
                  isImageHash(hash)
              )
            if (hashes.length > 0) prefetchHashes(hashes)
          } catch {
            setComingSoonData([])
          } finally {
            if (!isCancelled) setIsLoadingHomepageComingSoon(false)
          }
        })()

        void (async () => {
          try {
            const payload = await getHomepageFeatureBannerFromTauri()
            const featureBannerItems = HomePageGamesDocumentSchema.parse({
              featured: [],
              comingSoon: [],
              availableNow: [],
              featureBannerItems: payload.featureBannerItems,
            }).featureBannerItems
            setFeatureBannerData(featureBannerItems)
            const hashes = payload.featureBannerItems
              .map(item => item.imageHash)
              .filter(
                (
                  hash
                ): hash is import('@ocentra/asset-domain/types/assetIdentifier').ImageHash =>
                  isImageHash(hash)
              )
            if (hashes.length > 0) prefetchHashes(hashes)
          } catch {
            setFeatureBannerData([])
          } finally {
            if (!isCancelled) setIsLoadingHomepageFeatureBanner(false)
          }
        })()
        return
      }

      try {
        const { loadHomepageFromDiskIncremental } = await import(
          '@/adapters/layout/loadHomepageFromDisk'
        )
        await loadHomepageFromDiskIncremental(partial => {
          if (isCancelled) return
          setHomepageData(partial)
          setIsLoadingHomepageCatalog(false)
          setIsLoadingHomepageComingSoon(false)
          setIsLoadingHomepageFeatureBanner(false)
        }, prefetchHashes)
      } catch {
        if (!isCancelled) {
          setHomepageData({ featured: [], recommended: [], comingSoon: [], availableNow: [], featureBannerItems: [] })
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingHomepageCatalog(false)
          setIsLoadingHomepageComingSoon(false)
          setIsLoadingHomepageFeatureBanner(false)
        }
      }
    }
    void load()

    return () => {
      isCancelled = true
    }
  }, [prefetchHashes])

  useEffect(() => {
    if (!isTauri()) return
    let cancelled = false
    void getCatalogCountsFromTauri().then(
      counts => {
        if (!cancelled) setTabCounts({ games: counts.games, images: counts.images, resources: counts.resources })
      },
      () => {}
    )
    return () => { cancelled = true }
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'games' || hasLoadedGames) return
    const load = async () => {
      try {
        setIsLoadingGames(true)
        if (isTauri()) {
          const catalog = await getGamesCatalogFromTauri()
          const withMeta: GameWithMetadata[] = catalog.games.map(g => {
            const entry = new AssetResourceEntryClass<GameMode>(
              g.assetType as never,
              g.guid as never
            )
            entry.displayName = g.displayName
            entry.path = g.path
            entry.gameId = g.gameId as never
            const home: GameHome = {
              gameId: g.gameId,
              guid: g.guid,
              name: g.displayName,
              enabled: g.enabled,
              releaseStatus: toReleaseStatus(g.releaseStatus),
              gameCategory: g.mode,
              subcategory: null,
            }
            return { home, path: g.path, entry }
          })
          setGameEntries(withMeta.map(m => m.entry))
          setGamesWithMetadata(withMeta)
        } else {
          const [
            { loadGamesWithMetadataFromDisk },
            { EventBus },
            { OperationDeferred },
            { GetDiskGameModeEntriesEvent },
          ] = await Promise.all([
            import('@/adapters/layout/loadHomepageFromDisk'),
            import('@ocentra/eventing-domain/core/EventBus'),
            import('@ocentra/eventing-domain/core/OperationDeferred'),
            import(
              '@ocentra/eventing-domain/events/assets/GetDiskGameModeEntriesEvent'
            ),
          ])
          const [gameModeResult, withMeta] = await Promise.all([
            (async () => {
              const deferred = new OperationDeferred<
                AssetResourceEntry<GameMode>[]
              >()
              await EventBus.instance.publishAsync(
                new GetDiskGameModeEntriesEvent(deferred)
              )
              const result = await deferred.promise
              return result.isSuccess && Array.isArray(result.value)
                ? (result.value as AssetResourceEntry<GameMode>[])
                : []
            })(),
            loadGamesWithMetadataFromDisk(),
          ])
          setGameEntries(gameModeResult)
          setGamesWithMetadata(withMeta)
        }
        setHasLoadedGames(true)
      } catch {
        setGameEntries([])
        setGamesWithMetadata([])
      } finally {
        setIsLoadingGames(false)
      }
    }
    void load()
  }, [activeTab, hasLoadedGames])

  useEffect(() => {
    if (activeTab !== 'images' || hasLoadedImages) return
    const load = async () => {
      try {
        setIsLoadingImages(true)
        if (isTauri()) {
          setImageGroups(await getImageResourceGroupsFromTauri())
        } else {
          const { getDiskResourceEntries } = await import(
            '@/adapters/assets/diskResourceLoader'
          )
          const resources = await getDiskResourceEntries()
          const groups = new Map<string, CatalogResourceRecord[]>()
          for (const entry of resources
            .filter(
              (resource): resource is ResourceEntry & { hash: string } =>
                'hash' in resource
            )
            .map(item => toCatalogResourceRecord(item))) {
            const folder = entry.path.includes('/')
              ? entry.path.replace(/\/[^/]*$/, '')
              : '(root)'
            const list = groups.get(folder) ?? []
            list.push(entry)
            groups.set(folder, list)
          }
          setImageGroups(
            Array.from(groups.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([folder, items]) => ({ folder, items }))
          )
        }
        setHasLoadedImages(true)
      } catch {
        setImageGroups([])
      } finally {
        setIsLoadingImages(false)
      }
    }
    void load()
  }, [activeTab, hasLoadedImages])

  useEffect(() => {
    if (activeTab !== 'resources') return
    const load = async () => {
      try {
        setIsLoadingResources(true)
        if (isTauri()) {
          const payload = await queryResourcesFromTauri({
            search: deferredResourcesSearch,
            resourceType: resourcesFilter,
          })
          setResourceRows(payload.items)
          setResourceTypes(payload.availableTypes)
        } else {
          const { getDiskResourceEntries } = await import(
            '@/adapters/assets/diskResourceLoader'
          )
          const resources = await getDiskResourceEntries()
          const rows = resources.map(entry => toCatalogResourceRecord(entry))
          const query = deferredResourcesSearch.trim().toLowerCase()
          setResourceTypes(
            Array.from(new Set(rows.map(resource => resource.typeLabel))).sort()
          )
          setResourceRows(
            rows.filter(resource => {
              if (
                resourcesFilter !== 'All' &&
                resource.typeLabel !== resourcesFilter
              ) {
                return false
              }
              if (!query) return true
              return (
                resource.id.toLowerCase().includes(query) ||
                resource.path.toLowerCase().includes(query) ||
                resource.fileName.toLowerCase().includes(query) ||
                resource.typeLabel.toLowerCase().includes(query)
              )
            })
          )
        }
      } catch {
        setResourceRows([])
        setResourceTypes([])
      } finally {
        setIsLoadingResources(false)
      }
    }
    void load()
  }, [activeTab, deferredResourcesSearch, resourcesFilter])

  const gameGuidById = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of gamesWithMetadata) {
      const gameId =
        item.home.gameId ??
        item.entry.gameId ??
        extractGameIdFromPath(item.path)
      if (gameId && item.entry.guid) {
        map.set(gameId, item.entry.guid)
      }
    }
    for (const game of [
      ...homepageData.featured,
      ...homepageData.availableNow,
    ]) {
      if (game.gameId && game.guid) {
        map.set(game.gameId, game.guid)
      }
    }
    return map
  }, [gamesWithMetadata, homepageData.availableNow, homepageData.featured])

  const gamesModeCounts = useMemo(() => {
    const map = new Map<string, number>()
    map.set('all', gamesWithMetadata.length)
    for (const { path } of gamesWithMetadata) {
      const mode = extractModeFromPath(path)
      map.set(mode, (map.get(mode) ?? 0) + 1)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [gamesWithMetadata])

  const gamesCategoryWithSubs = useMemo((): CategoryWithSubs[] => {
    const modeFiltered =
      gamesModeFilter === 'all'
        ? gamesWithMetadata
        : gamesWithMetadata.filter(
            g => extractModeFromPath(g.path) === gamesModeFilter
          )
    const byCat = new Map<string, Map<string, number>>()
    for (const { home, path } of modeFiltered) {
      const cat = home.gameCategory || extractModeFromPath(path)
      const sub = home.subcategory ?? null
      if (!byCat.has(cat)) byCat.set(cat, new Map())
      const subMap = byCat.get(cat)!
      const subKey = sub ?? '(none)'
      subMap.set(subKey, (subMap.get(subKey) ?? 0) + 1)
    }
    const catTotals = new Map<string, number>()
    for (const { home, path } of modeFiltered) {
      const c = home.gameCategory || extractModeFromPath(path)
      catTotals.set(c, (catTotals.get(c) ?? 0) + 1)
    }
    const result: CategoryWithSubs[] = [
      { category: 'all', total: modeFiltered.length, subList: [] },
    ]
    let sortedCats: Array<[string, number]>
    if (gamesModeFilter === 'CardGames') {
      sortedCats = CATEGORY_VALUES.map(c => [c, catTotals.get(c) ?? 0])
    } else {
      sortedCats = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1])
    }
    for (const [category, total] of sortedCats) {
      const subMap = byCat.get(category)
      const subList = subMap
        ? (Array.from(subMap.entries())
            .filter(([k]) => k !== '(none)')
            .sort((a, b) => b[1] - a[1]) as Array<readonly [string, number]>)
        : []
      result.push({ category, total, subList })
    }
    return result
  }, [gamesWithMetadata, gamesModeFilter])

  const gamesCategoryCounts = useMemo(
    () => gamesCategoryWithSubs.map(c => [c.category, c.total] as const),
    [gamesCategoryWithSubs]
  )

  const toggleGamesCategoryExpanded = (cat: string) => {
    setGamesCategoryExpanded(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const filteredGamesWithMeta = useMemo(() => {
    let result = gamesWithMetadata
    if (gamesModeFilter !== 'all') {
      result = result.filter(
            g => extractModeFromPath(g.path) === gamesModeFilter
          )
    }
    if (gamesCategory !== 'all') {
      result = result.filter(g => {
        const cat = g.home.gameCategory || extractModeFromPath(g.path)
        return cat === gamesCategory
      })
    }
    if (deferredGamesSearch.trim()) {
      const q = deferredGamesSearch.trim().toLowerCase()
      result = result.filter(g => {
        const name = (g.home.name ?? g.entry.displayName ?? '').toLowerCase()
        const gameId = (g.home.gameId ?? g.entry.gameId ?? '').toLowerCase()
        const path = g.path.toLowerCase()
        return name.includes(q) || gameId.includes(q) || path.includes(q)
      })
    }
    return [...result].sort((a, b) =>
      (a.home.name ?? a.entry.displayName ?? '').localeCompare(
        b.home.name ?? b.entry.displayName ?? ''
      )
    )
  }, [gamesWithMetadata, gamesModeFilter, gamesCategory, deferredGamesSearch])

  const imageResourceCount = useMemo(
    () =>
      imageGroups.reduce((count, group) => count + group.items.length, 0),
    [imageGroups]
  )

  const selectedGame = useMemo(
    () =>
      gamesWithMetadata.find(
        g =>
          (g.home.gameId ?? g.entry.gameId ?? extractGameIdFromPath(g.path)) ===
          selectedGameId
      ) ?? null,
    [gamesWithMetadata, selectedGameId]
  )

  const rawJsonForTab = useMemo(() => {
    if (activeTab === 'homepage') {
      return JSON.stringify(
        {
          featured: homepageData.featured,
          comingSoon: homepageData.comingSoon,
          availableNow: homepageData.availableNow,
        },
        null,
        2
      )
    }
    if (activeTab === 'games') {
      const games = filteredGamesWithMeta.map(g => ({
        gameId:
          g.home.gameId ?? g.entry.gameId ?? extractGameIdFromPath(g.path),
        displayName: g.home.name ?? g.entry.displayName,
        guid: g.entry.guid,
        path: g.path,
        assetType: g.entry.assetType,
        mode: extractModeFromPath(g.path),
        category: g.home.gameCategory,
        subcategory: g.home.subcategory,
        difficulty: g.home.difficulty,
        duration: g.home.duration,
        deck: g.home.deck,
      }))
      return JSON.stringify({ games }, null, 2)
    }
    if (activeTab === 'selected-game' && selectedGameId) {
      return JSON.stringify(
        {
          gameId: selectedGameId,
          exportPath: `games/${selectedGameId}/page.json`,
          enginePath: `games/${selectedGameId}/engine.json`,
          guid: selectedGame?.entry.guid ?? null,
          name: selectedGame?.home.name ?? null,
        },
        null,
        2
      )
    }
    if (activeTab === 'images') {
      return JSON.stringify(
        imageGroups.flatMap(group =>
          group.items.map(resource => ({
            id: resource.id,
            path: resource.path,
            type: resource.typeLabel,
          }))
        ),
        null,
        2
      )
    }
    if (activeTab === 'resources') {
      return JSON.stringify(
        resourceRows.map(resource => ({
          id: resource.id,
          path: resource.path,
          type: resource.typeLabel,
        })),
        null,
        2
      )
    }
    return JSON.stringify({}, null, 2)
  }, [
    activeTab,
    homepageData,
    filteredGamesWithMeta,
    selectedGameId,
    selectedGame,
    imageGroups,
    resourceRows,
  ])

  const handleGameClick = (gameIdentifier: string) => {
    const colonIdx = gameIdentifier.indexOf(':')
    const gameId =
      colonIdx >= 0 ? gameIdentifier.slice(0, colonIdx) : gameIdentifier
    const guidPart = colonIdx >= 0 ? gameIdentifier.slice(colonIdx + 1) : ''
    const entry = gameEntries.find(
      e => e.gameId === gameId || e.guid === gameId
    )
    const guid = guidPart || gameGuidById.get(gameId) || entry?.guid
    if (guid && onNavigateToAsset) onNavigateToAsset(toAssetIdentifier(guid))
  }

  const handleGamesTabNavigate = (item: {
    home: GameHome
    path: string
    entry: AssetResourceEntry<GameMode>
  }) => {
    setSelectedGameId(
      item.home.gameId ??
        item.entry.gameId ??
        extractGameIdFromPath(item.path) ??
        null
    )
    if (item.entry.guid && onNavigateToAsset) {
      onNavigateToAsset(toAssetIdentifier(item.entry.guid))
    }
  }

  const toGamesExplorerGame = (g: {
    home: GameHome
    path: string
    entry: AssetResourceEntry<GameMode>
  }): GamesExplorerGame => {
    const cat = g.home.gameCategory || extractModeFromPath(g.path)
    const pct = g.home.completeness
      ? Math.round(
          (Object.values(g.home.completeness).filter(Boolean).length / 8) * 100
        )
      : 0
    return {
      slug:
        g.home.gameId ?? g.entry.gameId ?? extractGameIdFromPath(g.path) ?? '',
      name: g.home.name ?? g.entry.displayName ?? g.entry.gameId ?? '-',
      category: cat,
      subcategory: g.home.subcategory ?? null,
      quality: g.home.quality ?? 'complete',
      description: g.home.shortDescription ?? g.home.description ?? undefined,
      players:
        g.home.playersDisplay ??
        (g.home.minPlayers != null && g.home.maxPlayers != null
          ? `${g.home.minPlayers}-${g.home.maxPlayers}`
          : undefined),
      deck: g.home.deck ?? undefined,
      duration: g.home.duration ?? undefined,
      difficulty: g.home.difficulty ?? undefined,
      completeness: g.home.completeness ?? undefined,
      completenessPercent: pct,
    }
  }

  const explorerGames: ExploreGameSummary[] = filteredGamesWithMeta.map(g => ({
    slug:
      g.home.gameId ?? g.entry.gameId ?? extractGameIdFromPath(g.path) ?? '',
    name: g.home.name ?? g.entry.displayName ?? g.entry.gameId ?? '-',
    category: g.home.gameCategory || extractModeFromPath(g.path),
    subcategory: g.home.subcategory ?? undefined,
    difficulty: g.home.difficulty ?? '',
    players: g.home.playersDisplay ?? '',
    quality: g.home.quality ?? 'complete',
  }))

  const tabs: { id: AssetCatalogTab; label: string; count?: number }[] = [
    { id: 'homepage', label: 'Homepage' },
    {
      id: 'games',
      label: 'Games',
      count: hasLoadedGames ? gamesWithMetadata.length : (tabCounts.games ?? undefined),
    },
    {
      id: 'selected-game',
      label: 'Selected Game',
      count: selectedGameId ? 1 : undefined,
    },
    {
      id: 'images',
      label: 'Images',
      count: hasLoadedImages ? imageResourceCount : (tabCounts.images ?? undefined),
    },
    { id: 'sound', label: 'Sound' },
    { id: 'video', label: 'Video' },
    {
      id: 'resources',
      label: 'All Resources',
      count: activeTab === 'resources' ? resourceRows.length : (tabCounts.resources ?? undefined),
    },
  ]

  const handleTabChange = (tab: AssetCatalogTab) => {
    startTransition(() => setActiveTab(tab))
  }

  if (viewMode === 'raw') {
    return (
      <div className="preview-panel">
        <PreviewPanelHeader
          assetId={assetId}
          viewMode={viewMode}
          setViewMode={setViewMode}
          navigationHistory={navigationHistory}
          onBack={onBack}
          onNavigateToAsset={onNavigateToAsset}
          isNonAssetFile={false}
        />
        <div className="asset-catalog-preview asset-catalog-preview--raw">
          <div className="asset-catalog-preview__tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`asset-catalog-preview__tab ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
                {tab.count != null && (
                  <span className="asset-catalog-preview__tab-count">
                    ({tab.count})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="asset-catalog-preview__raw-hint">
            Export:{' '}
            <code>
              {activeTab === 'homepage'
                ? 'index/home.json'
                : activeTab === 'games'
                  ? 'games.json'
                  : `${activeTab}.json`}
            </code>
          </div>
          <pre className="asset-catalog-preview__raw-json">{rawJsonForTab}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="preview-panel">
      <PreviewPanelHeader
        assetId={assetId}
        viewMode={viewMode}
        setViewMode={setViewMode}
        navigationHistory={navigationHistory}
        onBack={onBack}
        onNavigateToAsset={onNavigateToAsset}
        isNonAssetFile={false}
      />
      <div className="preview-panel__content preview-panel__content--preview">
        <div className="asset-catalog-preview">
          <div className="asset-catalog-preview__tabs-row">
            <div className="asset-catalog-preview__tabs">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`asset-catalog-preview__tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                  {tab.count != null && (
                    <span className="asset-catalog-preview__tab-count">
                      ({tab.count})
                    </span>
                  )}
                </button>
              ))}
            </div>
            {activeTab === 'games' && (
              <div className="asset-catalog-preview__games-mode">
                <label htmlFor="asset-catalog-games-mode">Mode</label>
                <select
                  id="asset-catalog-games-mode"
                  value={gamesModeFilter}
                  onChange={e => setGamesModeFilter(e.target.value)}
                  aria-label="Filter by game mode"
                >
                  <option value="all">All</option>
                  {gamesModeCounts
                    .filter(([k]) => k !== 'all')
                    .map(([mode, count]) => (
                      <option key={mode} value={mode}>
                        {mode} ({count})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {activeTab === 'homepage' && (
            <div className="asset-catalog-preview__tab-content asset-catalog-preview__homepage-layout">
              {ImageLoaders}
              <div className="asset-catalog-preview__hint">
                Export slice for <code>index/home.json</code>. Same layout as
                main app homepage.
              </div>
              <section className="asset-catalog-preview__homepage-section asset-catalog-preview__homepage-featured">
                <FeaturedGameCarousel
                  featured={homepageData.featured}
                  recommended={homepageData.recommended ?? []}
                  isLoading={isLoadingHomepageCatalog}
                  onLearnMore={handleGameClick}
                  resolveImageUrl={resolveImageUrl}
                  solanaImgSrc={solanaImageUrl}
                />
              </section>
              <section className="asset-catalog-preview__homepage-section asset-catalog-preview__homepage-coming-soon">
                <ComingSoonCarousel
                  comingSoon={homepageData.comingSoon}
                  availableNow={homepageData.availableNow}
                  explorerGames={explorerGames}
                  isLoading={
                    isLoadingHomepageCatalog ||
                    isLoadingHomepageComingSoon ||
                    isLoadingHomepageFeatureBanner
                  }
                  onGameClick={handleGameClick}
                  onExploreClick={() => handleTabChange('games')}
                  resolveImageUrl={resolveImageUrl}
                  showExploreTab={false}
                  showExploreTile
                />
              </section>
            </div>
          )}

          {activeTab === 'games' && (
            <div className="asset-catalog-games-tab asset-catalog-games-tab--explorer">
              <div className="asset-catalog-games-tab__top-bar">
                <ExplorerContentBar
                  currentView={gamesView}
                  onViewChange={(v: 'grid' | 'list' | 'alphabet') =>
                    setGamesView(v === 'alphabet' ? 'grid' : v)
                  }
                  searchQuery={gamesSearch}
                  onSearchChange={setGamesSearch}
                  metadata={{ totalGames: gamesWithMetadata.length }}
                  categoryMapSize={
                    gamesCategoryCounts.filter(([k]) => k !== 'all').length
                  }
                  sortBy="name"
                  views={['grid', 'list']}
                />
              </div>
              <div
                className={`asset-catalog-games-tab__body ${gamesSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}
              >
                <ExplorerSidebar
                  currentCategory={gamesCategory}
                  onCategoryChange={setGamesCategory}
                  categoryWithSubs={gamesCategoryWithSubs}
                  categoryExpanded={gamesCategoryExpanded}
                  onCategoryExpandToggle={toggleGamesCategoryExpanded}
                  isCollapsed={gamesSidebarCollapsed}
                  onToggleCollapse={() => setGamesSidebarCollapsed(v => !v)}
                />
                <div className="asset-catalog-games-tab__content">
                  <div className="asset-catalog-games-tab__games-area">
                    {isLoadingGames ? (
                      <div className="asset-catalog-preview__empty">
                        Loading games...
                      </div>
                    ) : filteredGamesWithMeta.length === 0 ? (
                      <div className="asset-catalog-preview__empty">
                        {gamesWithMetadata.length === 0
                          ? 'No games available from the local catalog.'
                          : 'No games match the current filters.'}
                      </div>
                    ) : gamesView === 'grid' ? (
                      <div className="cge-games-grid asset-catalog-games-tab__grid">
                        {filteredGamesWithMeta.map(item => (
                          <div
                            key={item.entry.guid ?? item.path}
                            className="asset-catalog-games-tab__card"
                          >
                            <GameCard
                              game={toGamesExplorerGame(item)}
                              onGameClick={() => handleGamesTabNavigate(item)}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="cge-games-list asset-catalog-games-tab__list">
                        <GameListRowHeader />
                        {filteredGamesWithMeta.map(item => (
                          <div
                            key={item.entry.guid ?? item.path}
                            className="asset-catalog-games-tab__list-row"
                          >
                            <GameListRow
                              game={toGamesExplorerGame(item)}
                              onGameClick={() => handleGamesTabNavigate(item)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'selected-game' && (
            <div className="asset-catalog-preview__tab-content">
              <div className="asset-catalog-preview__hint">
                Export slice for{' '}
                <code>games/{selectedGameId ?? '...'}/page.json</code>
              </div>
              {selectedGame ? (
                <div className="asset-catalog-preview__resources-list">
                  <div className="asset-catalog-preview__resource-row">
                    <span className="asset-catalog-preview__resource-type">
                      Game
                    </span>
                    <span className="asset-catalog-preview__resource-name">
                      {selectedGame.home.name ?? selectedGameId}
                    </span>
                    <span className="asset-catalog-preview__resource-path">
                      {selectedGame.path}
                    </span>
                  </div>
                  <div className="asset-catalog-preview__resource-row">
                    <span className="asset-catalog-preview__resource-type">
                      Export
                    </span>
                    <span className="asset-catalog-preview__resource-name">
                      Page Slice
                    </span>
                    <span className="asset-catalog-preview__resource-path">
                      games/{selectedGameId}/page.json
                    </span>
                  </div>
                  <div className="asset-catalog-preview__resource-row">
                    <span className="asset-catalog-preview__resource-type">
                      Export
                    </span>
                    <span className="asset-catalog-preview__resource-name">
                      Engine Slice
                    </span>
                    <span className="asset-catalog-preview__resource-path">
                      games/{selectedGameId}/engine.json
                    </span>
                  </div>
                </div>
              ) : (
                <p className="asset-catalog-preview__empty">
                  Select a game from the Games tab to inspect its export slices.
                </p>
              )}
            </div>
          )}

          {activeTab === 'images' && (
            <div className="asset-catalog-preview__tab-content asset-catalog-preview__images-tab">
              <div className="asset-catalog-preview__hint">
                Images from the local index, grouped by folder.
              </div>
              {isLoadingImages ? (
                <div className="asset-catalog-preview__empty">Loading images...</div>
              ) : imageResourceCount === 0 ? (
                <div className="asset-catalog-preview__empty">
                  No images available.
                </div>
              ) : (
                <div className="asset-catalog-preview__images-groups">
                  {imageGroups.map(({ folder, items }) => (
                    <div
                      key={folder}
                      className="asset-catalog-preview__images-group"
                    >
                      <div className="asset-catalog-preview__images-folder">
                        {folder} ({items.length})
                      </div>
                      <div className="asset-catalog-preview__slice-list">
                        {items.map(resource => {
                          const handleClick = () =>
                            onNavigateToAsset?.(toAssetIdentifier(resource.id))
                          return (
                            <div
                              key={resource.id}
                              className="asset-catalog-preview__slice-item"
                              role="button"
                              tabIndex={0}
                              onClick={handleClick}
                              onKeyDown={e =>
                                (e.key === 'Enter' || e.key === ' ') &&
                                (e.preventDefault(), handleClick())
                              }
                            >
                              <span>Image</span>
                              <span>{resource.fileName}</span>
                              <span>{resource.path}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sound' && (
            <div className="asset-catalog-preview__tab-content">
              <div className="asset-catalog-preview__hint">Sound assets.</div>
              <div className="asset-catalog-preview__empty">No sound assets.</div>
            </div>
          )}

          {activeTab === 'video' && (
            <div className="asset-catalog-preview__tab-content">
              <div className="asset-catalog-preview__hint">Video assets.</div>
              <div className="asset-catalog-preview__empty">No video assets.</div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="asset-catalog-preview__tab-content">
              <div className="asset-catalog-preview__toolbar">
                <input
                  type="text"
                  className="asset-catalog-preview__search-input"
                  placeholder="Search..."
                  value={resourcesSearch}
                  onChange={e => setResourcesSearch(e.target.value)}
                />
                <select
                  className="asset-catalog-preview__filter-select"
                  value={resourcesFilter}
                  onChange={e => setResourcesFilter(e.target.value)}
                  aria-label="Filter by type"
                >
                  <option value="All">All types</option>
                  {resourceTypes.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="asset-catalog-preview__hint">
                Indexed local resources. Click to navigate.
              </div>
              <div className="asset-catalog-preview__resources-list">
                {isLoadingResources ? (
                  <div className="asset-catalog-preview__empty">
                    Loading resources...
                  </div>
                ) : resourceRows.length === 0 ? (
                  <div className="asset-catalog-preview__empty">
                    No resources match.
                  </div>
                ) : (
                  resourceRows.map(resource => {
                    const handleClick = () =>
                      onNavigateToAsset?.(toAssetIdentifier(resource.id))
                    return (
                      <div
                        key={resource.id}
                        className="asset-catalog-preview__resource-row"
                        role="button"
                        tabIndex={0}
                        onClick={handleClick}
                        onKeyDown={e =>
                          (e.key === 'Enter' || e.key === ' ') &&
                          (e.preventDefault(), handleClick())
                        }
                      >
                        <span className="asset-catalog-preview__resource-type">
                          {resource.typeLabel}
                        </span>
                        <span className="asset-catalog-preview__resource-name">
                          {resource.fileName}
                        </span>
                        <span className="asset-catalog-preview__resource-path">
                          {resource.path}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

