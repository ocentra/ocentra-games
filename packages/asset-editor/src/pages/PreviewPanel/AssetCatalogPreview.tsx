import React, {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
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
  type HomepageLayoutControlsData,
  type HomePageGamesDocument,
} from '@ocentra/game-asset-domain/schemas/home-page-games-schema'
import type { ExploreGameSummary } from '@ocentra/core-ui/Common/types/ExploreGameSummary'
import type { CategoryWithSubs, GamesExplorerGame } from '@ocentra/core-ui/GamesExplorer/types'
import { CATEGORY_VALUES } from '@ocentra/game-domain/game/categories'
import { FeaturedGameShowcase } from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameShowcase'
import {
  DEFAULT_FEATURED_SHOWCASE_CONTROLS,
  type FeaturedGameShowcasePreviewLayoutMode,
  type FeaturedShowcaseControls,
} from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameShowcase.types'
import { ComingSoonShowcase } from '@ocentra/core-ui/Common/ComingSoonCarousel/ComingSoonShowcase'
import { FeatureBannerSection } from '@ocentra/core-ui/Common/FeatureBanner/FeatureBannerSection'
import {
  DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS,
  type HomeShowcaseFrameControls,
  type HomeShowcasePreviewLayoutMode,
} from '@ocentra/core-ui/Common/HomeShowcaseFrame/HomeShowcaseFrame.types'
import { ExplorerContentBar } from '@ocentra/core-ui/GamesExplorer/ExplorerContentBar'
import { ExplorerSidebar } from '@ocentra/core-ui/GamesExplorer/ExplorerSidebar'
import { GameCard } from '@ocentra/core-ui/GamesExplorer/GameCard'
import { GameListRow, GameListRowHeader } from '@ocentra/core-ui/GamesExplorer/GameListRow'
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter'
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader'
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell'
import { mlogoImageUrl } from '@ocentra/app-assets/commons'
import { DynamicBackground, type RotationControlAPI } from '@ocentra/core-ui/Background/DynamicBackground'
import { ThreeBaseProvider } from '@ocentra/core-ui/Background/ThreeBaseContext'
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
  type TauriHomepageFeaturedGame,
} from '@/adapters/assets/TauriAssetAdapter'
import { createPanelWindow } from '@/utils/createPanelWindow'
import {
  FEATURED_SHOWCASE_CONTROLS_CHANNEL,
  type FeaturedShowcaseControlsMessage,
} from '@/utils/featuredShowcaseControlsChannel'
import {
  COMING_SOON_SHOWCASE_CONTROLS_CHANNEL,
  type ComingSoonShowcaseControlsMessage,
} from '@/utils/comingSoonShowcaseControlsChannel'
import {
  loadComingSoonShowcaseControlsFromDisk,
  loadFeaturedShowcaseControlsFromDisk,
  normalizeFeaturedShowcaseControls,
} from '@/utils/featuredShowcaseControlsPersistence'
import {
  HOME_SHOWCASE_FRAME_CONTROLS_CHANNEL,
  type HomeShowcaseFrameControlsMessage,
} from '@/utils/homeShowcaseFrameControlsChannel'
import {
  loadHomeShowcaseFrameControlsFromDisk,
  normalizeHomeShowcaseFrameControls,
} from '@/utils/homeShowcaseFrameControlsPersistence'
import {
  HOMEPAGE_LAYOUT_CONTROLS_CHANNEL,
  type HomepageLayoutControlsMessage,
} from '@/utils/homepageLayoutControlsChannel'
import {
  DEFAULT_HOMEPAGE_LAYOUT_CONTROLS,
  loadHomepageLayoutControlsFromDisk,
  normalizeHomepageLayoutControls,
} from '@/utils/homepageLayoutControlsPersistence'
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

function mergeFeaturedControls(controls?: FeaturedShowcaseControls): FeaturedShowcaseControls {
  if (!controls) return DEFAULT_FEATURED_SHOWCASE_CONTROLS
  return {
    overall: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.overall, ...controls.overall },
    arrows: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.arrows, ...controls.arrows },
    header: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.header, ...controls.header },
    body: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.body, ...controls.body },
    sideA: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideA, ...controls.sideA },
    sideB: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideB, ...controls.sideB },
    footer: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.footer, ...controls.footer },
    colors: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.colors, ...controls.colors },
    variants: controls.variants,
  }
}

function mergeHomeFrameControls(controls?: HomeShowcaseFrameControls): HomeShowcaseFrameControls {
  if (!controls) return DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS
  return {
    overall: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.overall, ...controls.overall },
    body: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.body, ...controls.body },
    sideA: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.sideA, ...controls.sideA },
    sideB: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.sideB, ...controls.sideB },
    copy: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.copy, ...controls.copy },
    footer: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.footer, ...controls.footer },
    colors: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.colors, ...controls.colors },
    items: controls.items,
    variants: controls.variants,
  }
}

function isFeaturedNarrowAtWidth(width: number, controls?: FeaturedShowcaseControls): boolean {
  const c = mergeFeaturedControls(controls)
  const measuredContentWidth = width - c.overall.canvasInsetX * 2
  const stageW = c.overall.viewWidth - (c.overall.edgeInset + c.arrows.width + c.arrows.gap) * 2
  const bodyW = stageW - c.body.insetX * 2
  const renderScale = Math.min(1, Math.max(1, measuredContentWidth) / c.overall.viewWidth)
  return (
    (c.overall.narrowBreakpoint > 0 && measuredContentWidth <= c.overall.narrowBreakpoint) ||
    bodyW * c.body.splitRatio * renderScale < c.body.minAWidth ||
    bodyW * (1 - c.body.splitRatio) * renderScale < c.body.minBWidth
  )
}

function isHomeFrameNarrowAtWidth(width: number, controls?: HomeShowcaseFrameControls): boolean {
  const c = mergeHomeFrameControls(controls)
  const measuredContentWidth = width - c.overall.canvasInsetX * 2
  const stageW = c.overall.viewWidth - c.overall.stageInsetX * 2
  const bodyW = stageW - c.body.insetX * 2
  const renderScale = Math.min(1, Math.max(1, measuredContentWidth) / c.overall.viewWidth)
  return (
    (c.overall.narrowBreakpoint > 0 && measuredContentWidth <= c.overall.narrowBreakpoint) ||
    bodyW * c.body.splitRatio * renderScale < c.body.minAWidth ||
    bodyW * (1 - c.body.splitRatio) * renderScale < c.body.minBWidth
  )
}

function resolveSyncedHomepageLayoutMode({
  width,
  aboutControls,
  featuredControls,
  comingSoonControls,
  aboutMode,
  featuredMode,
  comingSoonMode,
}: {
  width: number | null
  aboutControls: HomeShowcaseFrameControls
  featuredControls: FeaturedShowcaseControls
  comingSoonControls: FeaturedShowcaseControls
  aboutMode: HomeShowcasePreviewLayoutMode
  featuredMode: FeaturedGameShowcasePreviewLayoutMode
  comingSoonMode: FeaturedGameShowcasePreviewLayoutMode
}): HomeShowcasePreviewLayoutMode {
  if (aboutMode === 'narrow' || featuredMode === 'narrow' || comingSoonMode === 'narrow') return 'narrow'
  if (aboutMode === 'wide' || featuredMode === 'wide' || comingSoonMode === 'wide') return 'wide'
  if (width === null) return 'auto'
  return isHomeFrameNarrowAtWidth(width, aboutControls) ||
    isFeaturedNarrowAtWidth(width, featuredControls) ||
    isFeaturedNarrowAtWidth(width, comingSoonControls)
    ? 'narrow'
    : 'wide'
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

const FEATURED_SHOWCASE_CONTROLS_ASSET_PATH =
  'virtual:AssetCatalog/FeaturedShowcaseControls'

const ASSET_EDITOR_PREVIEW_APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.1.0'

function AssetCatalogMainAppPreviewShell({ children }: { children: React.ReactNode }) {
  const rotationControlRef = useRef<RotationControlAPI | null>(null)
  const headerConfig = useMemo(() => ({
    center: {
      modeA: {
        logo: {
          size: 44,
          renderer: ({
            cx,
            cy,
            size,
            aspectCorrection,
            strokeWidth,
            innerOpacity,
            color,
          }: {
            cx: number
            cy: number
            size: number
            aspectCorrection: number
            strokeWidth: number
            innerOpacity: number
            color: string
          }) => {
            const logoH = size
            const logoW = logoH * aspectCorrection
            const outerRadius = size / 2
            const innerRadius = Math.max(1, outerRadius - Math.max(0.35, size * 0.018) - strokeWidth * 0.5)
            return (
              <g transform={`translate(${cx} ${cy}) scale(${aspectCorrection} 1) translate(${-cx} ${-cy})`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={outerRadius}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  opacity={0.95}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={innerRadius}
                  fill={color}
                  opacity={innerOpacity}
                />
                <image
                  href={mlogoImageUrl}
                  x={cx - logoW / 2}
                  y={cy - logoH / 2}
                  width={logoW}
                  height={logoH}
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
            )
          },
        },
      },
    },
  }), [])

  return (
    <div className="asset-catalog-preview__main-app-host">
      <ThreeBaseProvider>
        <UnifiedPageShell
          embedded
          className="asset-catalog-preview__main-app-shell home-page"
          workClassName="home-shell-work"
          background={<DynamicBackground controlRef={rotationControlRef} />}
          header={
            <UnifiedHeader
              config={headerConfig}
              profileName="main_screen"
              includeAdminNavigation
            />
          }
          footer={<GameFooter appVersion={ASSET_EDITOR_PREVIEW_APP_VERSION} />}
        >
          {children}
        </UnifiedPageShell>
      </ThreeBaseProvider>
    </div>
  )
}

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

function toGameHomeFromTauri(g: TauriHomepageFeaturedGame): GameHome {
  return {
    gameId: g.gameId,
    guid: g.guid,
    name: g.name,
    enabled: g.enabled,
    releaseStatus: toReleaseStatus(g.releaseStatus),
    tags: g.tags,
    featuredTopBadges: g.featuredTopBadges,
    featuredBottomBadges: g.featuredBottomBadges,
    tagline: g.tagline,
    tagline2: g.tagline2,
    shortDescription: g.shortDescription,
    description: g.description,
    minPlayers: g.minPlayers,
    maxPlayers: g.maxPlayers,
    gameCategory: g.gameCategory,
    subcategory: g.subcategory,
    difficulty: g.difficulty,
    duration: g.duration,
    deck: g.deck,
    playersDisplay: g.playersDisplay,
    quality: g.quality,
    bannerImage: g.bannerImage,
    gameIcon: g.gameIcon,
    carouselImages: g.carouselImages,
    carouselPlaybackMode: g.carouselPlaybackMode as GameHome['carouselPlaybackMode'],
    carouselTransitionType: g.carouselTransitionType as GameHome['carouselTransitionType'],
    carouselTransitionDurationMs: g.carouselTransitionDurationMs,
    bannerLogoImage: g.bannerLogoImage,
    bannerLogoAlt: g.bannerLogoAlt,
    bannerLogoStartMs: g.bannerLogoStartMs,
    bannerLogoDurationMs: g.bannerLogoDurationMs,
    bannerLogoScaleFrom: g.bannerLogoScaleFrom,
    bannerLogoScaleTo: g.bannerLogoScaleTo,
    bannerLogoOpacityFrom: g.bannerLogoOpacityFrom,
    bannerLogoOpacityTo: g.bannerLogoOpacityTo,
    bannerLogoVisibleFromIndex: g.bannerLogoVisibleFromIndex,
    bannerLogoVisibleToIndex: g.bannerLogoVisibleToIndex,
    bannerTitleText: g.bannerTitleText,
    bannerTitleColor: g.bannerTitleColor,
    bannerTitleStartMs: g.bannerTitleStartMs,
    bannerTitleDurationMs: g.bannerTitleDurationMs,
    bannerTitleScaleFrom: g.bannerTitleScaleFrom,
    bannerTitleScaleTo: g.bannerTitleScaleTo,
    bannerTitleOpacityFrom: g.bannerTitleOpacityFrom,
    bannerTitleOpacityTo: g.bannerTitleOpacityTo,
    bannerTitleVisibleFromIndex: g.bannerTitleVisibleFromIndex,
    bannerTitleVisibleToIndex: g.bannerTitleVisibleToIndex,
    bannerOverlayTintColor: g.bannerOverlayTintColor,
    bannerOverlayTintOpacity: g.bannerOverlayTintOpacity,
    bannerVignetteOpacity: g.bannerVignetteOpacity,
    bannerFadeToBlackOpacity: g.bannerFadeToBlackOpacity,
  }
}

function getTauriHomepageHashes(g: TauriHomepageFeaturedGame): string[] {
  return [
    g.bannerImage,
    g.gameIcon,
    g.bannerLogoImage,
    ...(g.carouselImages ?? []),
  ].filter((hash): hash is string => typeof hash === 'string')
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

function getDisplayNameFromResourceFile(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '')
  return withoutExtension
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

function toCatalogMontageImages(
  items: CatalogResourceRecord[]
): HomePageGamesDocument['catalogMontageImages'] {
  return items
    .filter(item =>
      item.kind === 'image' &&
      isImageHash(item.id) &&
      item.path.replace(/\\/g, '/').includes('AppAssets/PlaceHolders/')
    )
    .map(item => ({
      id: item.id,
      name: getDisplayNameFromResourceFile(item.fileName),
      bannerImage: item.id,
      alt: getDisplayNameFromResourceFile(item.fileName),
    }))
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
    catalogMontageImages: [],
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
  const [featuredShowcaseControls, setFeaturedShowcaseControls] = useState(
    DEFAULT_FEATURED_SHOWCASE_CONTROLS
  )
  const [featuredShowcasePreviewLayoutMode, setFeaturedShowcasePreviewLayoutMode] =
    useState<FeaturedGameShowcasePreviewLayoutMode>('auto')
  const [aboutShowcaseControls, setAboutShowcaseControls] = useState(
    DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS
  )
  const [comingSoonShowcaseControls, setComingSoonShowcaseControls] = useState(
    DEFAULT_FEATURED_SHOWCASE_CONTROLS
  )
  const [aboutShowcasePreviewLayoutMode, setAboutShowcasePreviewLayoutMode] =
    useState<HomeShowcasePreviewLayoutMode>('auto')
  const [comingSoonShowcasePreviewLayoutMode, setComingSoonShowcasePreviewLayoutMode] =
    useState<FeaturedGameShowcasePreviewLayoutMode>('auto')
  const [homepageLayoutControls, setHomepageLayoutControls] =
    useState<HomepageLayoutControlsData>(DEFAULT_HOMEPAGE_LAYOUT_CONTROLS)
  const featuredShowcaseControlsRef = useRef<FeaturedShowcaseControls>(
    DEFAULT_FEATURED_SHOWCASE_CONTROLS
  )
  const featuredShowcasePreviewLayoutModeRef =
    useRef<FeaturedGameShowcasePreviewLayoutMode>('auto')
  const aboutShowcaseControlsRef = useRef<HomeShowcaseFrameControls>(
    DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS
  )
  const comingSoonShowcaseControlsRef = useRef<FeaturedShowcaseControls>(
    DEFAULT_FEATURED_SHOWCASE_CONTROLS
  )
  const aboutShowcasePreviewLayoutModeRef =
    useRef<HomeShowcasePreviewLayoutMode>('auto')
  const comingSoonShowcasePreviewLayoutModeRef =
    useRef<FeaturedGameShowcasePreviewLayoutMode>('auto')
  const homepageLayoutControlsRef = useRef<HomepageLayoutControlsData>(
    DEFAULT_HOMEPAGE_LAYOUT_CONTROLS
  )
  const homepageContentFrameRef = useRef<HTMLDivElement | null>(null)
  const [homepageContentFrameWidth, setHomepageContentFrameWidth] = useState<number | null>(null)
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
  const syncedHomepagePreviewLayoutMode = useMemo(() => resolveSyncedHomepageLayoutMode({
    width: homepageContentFrameWidth,
    aboutControls: aboutShowcaseControls,
    featuredControls: featuredShowcaseControls,
    comingSoonControls: comingSoonShowcaseControls,
    aboutMode: aboutShowcasePreviewLayoutMode,
    featuredMode: featuredShowcasePreviewLayoutMode,
    comingSoonMode: comingSoonShowcasePreviewLayoutMode,
  }), [
    aboutShowcaseControls,
    aboutShowcasePreviewLayoutMode,
    comingSoonShowcaseControls,
    comingSoonShowcasePreviewLayoutMode,
    featuredShowcaseControls,
    featuredShowcasePreviewLayoutMode,
    homepageContentFrameWidth,
  ])

  useEffect(() => {
    featuredShowcaseControlsRef.current = featuredShowcaseControls
  }, [featuredShowcaseControls])

  useEffect(() => {
    featuredShowcasePreviewLayoutModeRef.current = featuredShowcasePreviewLayoutMode
  }, [featuredShowcasePreviewLayoutMode])

  useEffect(() => {
    aboutShowcaseControlsRef.current = aboutShowcaseControls
  }, [aboutShowcaseControls])

  useEffect(() => {
    comingSoonShowcaseControlsRef.current = comingSoonShowcaseControls
  }, [comingSoonShowcaseControls])

  useEffect(() => {
    aboutShowcasePreviewLayoutModeRef.current = aboutShowcasePreviewLayoutMode
  }, [aboutShowcasePreviewLayoutMode])

  useEffect(() => {
    comingSoonShowcasePreviewLayoutModeRef.current = comingSoonShowcasePreviewLayoutMode
  }, [comingSoonShowcasePreviewLayoutMode])

  useEffect(() => {
    homepageLayoutControlsRef.current = homepageLayoutControls
  }, [homepageLayoutControls])

  useEffect(() => {
    const node = homepageContentFrameRef.current
    if (!node) return
    const updateWidth = () => setHomepageContentFrameWidth(node.getBoundingClientRect().width || null)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)
    return () => observer.disconnect()
  }, [activeTab])

  useEffect(() => {
    let cancelled = false
    void loadFeaturedShowcaseControlsFromDisk().then(nextControls => {
      if (cancelled) return
      setFeaturedShowcaseControls(nextControls)
      setHomepageData(prev => ({
        ...prev,
        featuredShowcaseControls: nextControls,
      }))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      loadHomeShowcaseFrameControlsFromDisk('about'),
      loadComingSoonShowcaseControlsFromDisk(),
    ]).then(([nextAboutControls, nextComingSoonControls]) => {
      if (cancelled) return
      setAboutShowcaseControls(nextAboutControls)
      setComingSoonShowcaseControls(nextComingSoonControls)
      setHomepageData(prev => ({
        ...prev,
        aboutShowcaseControls: nextAboutControls,
        comingSoonShowcaseControls: nextComingSoonControls,
      }))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void loadHomepageLayoutControlsFromDisk().then(nextControls => {
      if (cancelled) return
      setHomepageLayoutControls(nextControls)
      setHomepageData(prev => ({
        ...prev,
        homepageLayoutControls: nextControls,
      }))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const channel = new BroadcastChannel(FEATURED_SHOWCASE_CONTROLS_CHANNEL)
    const handler = (event: MessageEvent<FeaturedShowcaseControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          controls: featuredShowcaseControlsRef.current,
          previewLayoutMode: featuredShowcasePreviewLayoutModeRef.current,
        } satisfies FeaturedShowcaseControlsMessage)
        return
      }

      if (event.data.type === 'update') {
        const nextControls = event.data.controls
        setFeaturedShowcaseControls(nextControls)
        setHomepageData(prev => ({
          ...prev,
          featuredShowcaseControls: nextControls,
        }))
        return
      }

      if (event.data.type === 'preview-layout-mode') {
        setFeaturedShowcasePreviewLayoutMode(event.data.previewLayoutMode)
      }
    }
    channel.addEventListener('message', handler)
    return () => {
      channel.removeEventListener('message', handler)
      channel.close()
    }
  }, [])

  useEffect(() => {
    const channel = new BroadcastChannel(HOME_SHOWCASE_FRAME_CONTROLS_CHANNEL)
    const handler = (event: MessageEvent<HomeShowcaseFrameControlsMessage>) => {
      if (event.data.kind === 'about' && event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          kind: 'about',
          controls: aboutShowcaseControlsRef.current,
          previewLayoutMode: aboutShowcasePreviewLayoutModeRef.current,
        } satisfies HomeShowcaseFrameControlsMessage)
        return
      }

      if (event.data.type === 'update') {
        const nextControls = event.data.controls
        setAboutShowcaseControls(nextControls)
        setHomepageData(prev => ({
          ...prev,
          aboutShowcaseControls: nextControls,
        }))
        return
      }

      if (event.data.type === 'preview-layout-mode') {
        setAboutShowcasePreviewLayoutMode(event.data.previewLayoutMode)
      }
    }
    channel.addEventListener('message', handler)
    return () => {
      channel.removeEventListener('message', handler)
      channel.close()
    }
  }, [])

  useEffect(() => {
    const channel = new BroadcastChannel(COMING_SOON_SHOWCASE_CONTROLS_CHANNEL)
    const handler = (event: MessageEvent<ComingSoonShowcaseControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          controls: comingSoonShowcaseControlsRef.current,
          previewLayoutMode: comingSoonShowcasePreviewLayoutModeRef.current,
        } satisfies ComingSoonShowcaseControlsMessage)
        return
      }

      if (event.data.type === 'update') {
        const nextControls = event.data.controls
        setComingSoonShowcaseControls(nextControls)
        setHomepageData(prev => ({
          ...prev,
          comingSoonShowcaseControls: nextControls,
        }))
        return
      }

      if (event.data.type === 'preview-layout-mode') {
        setComingSoonShowcasePreviewLayoutMode(event.data.previewLayoutMode)
      }
    }
    channel.addEventListener('message', handler)
    return () => {
      channel.removeEventListener('message', handler)
      channel.close()
    }
  }, [])

  useEffect(() => {
    const channel = new BroadcastChannel(HOMEPAGE_LAYOUT_CONTROLS_CHANNEL)
    const handler = (event: MessageEvent<HomepageLayoutControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          controls: homepageLayoutControlsRef.current,
        } satisfies HomepageLayoutControlsMessage)
        return
      }

      if (event.data.type === 'update') {
        const nextControls = event.data.controls
        setHomepageLayoutControls(nextControls)
        setHomepageData(prev => ({
          ...prev,
          homepageLayoutControls: nextControls,
        }))
      }
    }
    channel.addEventListener('message', handler)
    return () => {
      channel.removeEventListener('message', handler)
      channel.close()
    }
  }, [])

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

    const setCatalogMontageData = (
      catalogMontageImages: HomePageGamesDocument['catalogMontageImages']
    ) => {
      if (isCancelled) return
      setHomepageData(prev => ({ ...prev, catalogMontageImages }))
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
            const featured = payload.featured.map(toGameHomeFromTauri)
            const catalogData = HomePageGamesDocumentSchema.parse({
              featured,
              recommended: featured,
              comingSoon: [],
              availableNow: payload.availableNow.map(toGameHomeFromTauri),
            })
            setCatalogData({
              featured: catalogData.featured,
              recommended: catalogData.recommended ?? [],
              availableNow: catalogData.availableNow,
            })
            const hashes = [
              ...payload.featured.flatMap(getTauriHomepageHashes),
              ...payload.availableNow.flatMap(getTauriHomepageHashes),
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
            const payload = await queryResourcesFromTauri({
              search: 'AppAssets/PlaceHolders',
              resourceType: 'Image',
            })
            const montageImages = toCatalogMontageImages(payload.items)
            setCatalogMontageData(montageImages)
            const hashes = montageImages
              .map(item => item.bannerImage)
              .filter(
                (
                  hash
                ): hash is import('@ocentra/asset-domain/types/assetIdentifier').ImageHash =>
                  isImageHash(hash)
              )
            if (hashes.length > 0) prefetchHashes(hashes)
          } catch {
            setCatalogMontageData([])
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
          let nextPartial = partial
          if (partial.featuredShowcaseControls) {
            const nextControls = normalizeFeaturedShowcaseControls(
              partial.featuredShowcaseControls
            )
            setFeaturedShowcaseControls(nextControls)
            nextPartial = {
              ...partial,
              featuredShowcaseControls: nextControls,
            }
          }
          if (partial.aboutShowcaseControls) {
            const nextAboutControls = normalizeHomeShowcaseFrameControls(
              partial.aboutShowcaseControls
            )
            setAboutShowcaseControls(nextAboutControls)
            nextPartial = {
              ...nextPartial,
              aboutShowcaseControls: nextAboutControls,
            }
          }
          if (partial.comingSoonShowcaseControls) {
            const nextComingSoonControls = normalizeFeaturedShowcaseControls(
              partial.comingSoonShowcaseControls
            )
            setComingSoonShowcaseControls(nextComingSoonControls)
            nextPartial = {
              ...nextPartial,
              comingSoonShowcaseControls: nextComingSoonControls,
            }
          }
          if (partial.homepageLayoutControls) {
            const nextHomepageLayoutControls = normalizeHomepageLayoutControls(
              partial.homepageLayoutControls
            )
            setHomepageLayoutControls(nextHomepageLayoutControls)
            nextPartial = {
              ...nextPartial,
              homepageLayoutControls: nextHomepageLayoutControls,
            }
          }
          setHomepageData(nextPartial)
          setIsLoadingHomepageCatalog(false)
          setIsLoadingHomepageComingSoon(false)
          setIsLoadingHomepageFeatureBanner(false)
        }, prefetchHashes)
      } catch {
        if (!isCancelled) {
          setHomepageData({ featured: [], recommended: [], comingSoon: [], catalogMontageImages: [], availableNow: [], featureBannerItems: [] })
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
          recommended: homepageData.recommended ?? [],
          comingSoon: homepageData.comingSoon,
          catalogMontageImages: homepageData.catalogMontageImages ?? [],
          availableNow: homepageData.availableNow,
          featureBannerItems: homepageData.featureBannerItems ?? [],
          featuredShowcaseControls,
          aboutShowcaseControls,
          comingSoonShowcaseControls,
          homepageLayoutControls,
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
    featuredShowcaseControls,
    aboutShowcaseControls,
    comingSoonShowcaseControls,
    homepageLayoutControls,
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

  const handleOpenHomepageLayoutControls = () => {
    void createPanelWindow(
      'homepage-layout-controls',
      FEATURED_SHOWCASE_CONTROLS_ASSET_PATH,
      'Homepage Layout Controls',
      true
    )
  }

  const catalogHeaderToolbar = (
    <div className="asset-catalog-preview__tabs-row asset-catalog-preview__tabs-row--header">
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
        <button
          type="button"
          className="asset-catalog-preview__edit-featured-button"
          onClick={handleOpenHomepageLayoutControls}
        >
          Edit
        </button>
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
  )

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
          toolbar={catalogHeaderToolbar}
          hideBreadcrumb
        />
        <div className="asset-catalog-preview asset-catalog-preview--raw">
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
        toolbar={catalogHeaderToolbar}
        hideBreadcrumb
      />
      <div className="preview-panel__content preview-panel__content--preview">
        <div className="asset-catalog-preview">
          {activeTab === 'homepage' && (
            <div className="asset-catalog-preview__tab-content asset-catalog-preview__homepage-layout">
              <AssetCatalogMainAppPreviewShell>
                <div className="home-work-math">
                  {ImageLoaders}
                  <div className="scrollable-content-container">
                    <div
                      ref={homepageContentFrameRef}
                      className={`home-content asset-catalog-preview__homepage-content-frame ${
                        homepageLayoutControls.contentBoundsOverlay
                          ? 'asset-catalog-preview__homepage-content-frame--bounds'
                          : ''
                      }`}
                    >
                      <section className="about-us-section asset-catalog-preview__homepage-section asset-catalog-preview__homepage-feature-banner">
                        <FeatureBannerSection
                          featureBannerItems={homepageData.featureBannerItems}
                          resolveImageUrl={resolveImageUrl}
                          controls={aboutShowcaseControls}
                          previewLayoutMode={syncedHomepagePreviewLayoutMode}
                          allowDebugBounds
                        />
                      </section>
                      <section className="featured-section asset-catalog-preview__homepage-section asset-catalog-preview__homepage-featured">
                        <FeaturedGameShowcase
                          featured={homepageData.featured}
                          recommended={homepageData.recommended ?? []}
                          isLoading={isLoadingHomepageCatalog}
                          controls={featuredShowcaseControls}
                          previewLayoutMode={syncedHomepagePreviewLayoutMode}
                          onLearnMore={handleGameClick}
                          resolveImageUrl={resolveImageUrl}
                          allowDebugBounds
                        />
                      </section>
                      <section className="games-section asset-catalog-preview__homepage-section asset-catalog-preview__homepage-coming-soon">
                        <ComingSoonShowcase
                          comingSoon={homepageData.comingSoon}
                          catalogMontageItems={homepageData.catalogMontageImages ?? []}
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
                          showExploreTile
                          controls={comingSoonShowcaseControls}
                          previewLayoutMode={syncedHomepagePreviewLayoutMode}
                          allowDebugBounds
                        />
                      </section>
                      <div className="content-spacer" />
                    </div>
                  </div>
                </div>
              </AssetCatalogMainAppPreviewShell>
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
