import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import JSON5 from 'json5'
import type { ViewMode } from './types'
import type { AssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier'
import { toAssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier'
import type { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry'
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode'
import type { GameHome } from '@ocentra/game-asset-domain/schemas/game-home-schema'
import type { PageLayoutDocument } from '@ocentra/game-asset-domain/ui/pageLayout/PageLayout'
import { buildSelectedGamePresentation } from '@ocentra/game-asset-domain/ui/selectedGame/buildSelectedGamePresentation'
import {
  DEFAULT_SELECTED_GAME_CONTENT_PLAN,
  type SelectedGameContentPlan,
  type SelectedGameDeckVisualControls,
  type SelectedGameLayoutControls,
  type SelectedGamePresentationVisualRef,
  type SelectedGameRankingVisualControls,
  type SelectedGameTabId,
} from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation'
import {
  HomePageGamesDocumentSchema,
  type HomepageLayoutControlsData,
  type HomePageGamesDocument,
} from '@ocentra/game-asset-domain/schemas/home-page-games-schema'
import { MemoryRouter } from 'react-router-dom'
import type { ExploreGameSummary } from '@ocentra/core-ui/Common/types/ExploreGameSummary'
import type { CategoryWithSubs, GamesExplorerGame } from '@ocentra/core-ui/GamesExplorer/types'
import { CATEGORY_VALUES } from '@ocentra/game-domain/game/categories'
import {
  DEFAULT_FEATURED_SHOWCASE_CONTROLS,
  type FeaturedGameShowcasePreviewLayoutMode,
  type FeaturedShowcaseControls,
} from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameShowcase.types'
import { HomePageShowcaseContent } from '@ocentra/core-ui/Common/HomePage/HomePageShowcaseContent'
import { SelectedGameShowcase } from '@ocentra/core-ui/Common/SelectedGameShowcase/SelectedGameShowcase'
import {
  DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS,
  type HomeShowcaseFrameControls,
  type HomeShowcasePreviewLayoutMode,
} from '@ocentra/core-ui/Common/HomeShowcaseFrame/HomeShowcaseFrame.types'
import { ExplorerContentBar } from '@ocentra/core-ui/GamesExplorer/ExplorerContentBar'
import { ExplorerSidebar } from '@ocentra/core-ui/GamesExplorer/ExplorerSidebar'
import { GameCard } from '@ocentra/core-ui/GamesExplorer/GameCard'
import { GameListRow, GameListRowHeader } from '@ocentra/core-ui/GamesExplorer/GameListRow'
import {
  AdminUsersPageContent,
  CompetitionPageContent,
  PlayerHubPageContent,
  SettingsPageContent,
  SettingsPageToolbar,
  ShopPageContent,
  ShopPageToolbar,
  SocialPageContent,
  type AdminActivityRow,
  type AdminUserRow,
  type LeaderboardRow,
  type ShopProduct,
  type ShopTab,
} from '@ocentra/core-ui/AppPages/MainAppPageSurfaces'
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter'
import { createOcentraHeaderLogoConfig } from '@ocentra/core-ui/Header/createOcentraHeaderConfig'
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader'
import type {
  SerializedUnifiedHeaderConfig,
  UnifiedHeaderConfigInput,
} from '@ocentra/core-ui/Header/UnifiedHeader.config'
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell'
import { mlogoImageUrl } from '@ocentra/app-assets/commons'
import { DynamicBackground, type RotationControlAPI } from '@ocentra/core-ui/Background/DynamicBackground'
import { ThreeBaseProvider } from '@ocentra/core-ui/Background/ThreeBaseContext'
import { useResolveImageUrl } from '@/hooks/useResolveImageUrl'
import { DeckPreview } from '@/lib/assets/card/deck/DeckPreview'
import { CardRankingPreview } from '@/lib/assets/card/cardRanking/CardRankingPreview'
import { PreviewPanelHeader } from './PreviewPanelHeader'
import {
  getCatalogCountsFromTauri,
  getGamesCatalogFromTauri,
  getHomepageCatalogFromTauri,
  getHomepageComingSoonFromTauri,
  getHomepageFeatureBannerFromTauri,
  getImageResourceGroupsFromTauri,
  queryResourcesFromTauri,
  readAsset,
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
  HEADER_PROFILE_CONTROLS_CHANNEL,
  type HeaderProfileControlsMessage,
} from '@/utils/headerProfileControlsChannel'
import {
  DEFAULT_HOMEPAGE_LAYOUT_CONTROLS,
  loadHomepageLayoutControlsFromDisk,
  normalizeHomepageLayoutControls,
} from '@/utils/homepageLayoutControlsPersistence'
import {
  SELECTED_GAME_LAYOUT_CONTROLS_CHANNEL,
  type SelectedGameLayoutControlsMessage,
  type SelectedGamePreviewLayoutMode,
} from '@/utils/selectedGameLayoutControlsChannel'
import { normalizeSelectedGameLayoutConfig } from '@/utils/selectedGameLayoutPersistence'
import type { ResourceEntry } from '@ocentra/asset-domain/resourceEntry/ResourceEntry'
import { AssetResourceEntry as AssetResourceEntryClass } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry'
import { isImageHash, type ImageHash } from '@ocentra/asset-domain/types/assetIdentifier'
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

type LooseRecord = Record<string, unknown>

type SelectedGamePreviewBundle = {
  gameMode: LooseRecord | null
  gameInfo: LooseRecord | null
  rules: LooseRecord | null
  strategy: LooseRecord | null
  scoring: LooseRecord | null
  deckModel: LooseRecord | null
  deck: LooseRecord | null
  ranking: LooseRecord | null
  mechanics: LooseRecord | null
  actions: LooseRecord | null
  validationFixtures: LooseRecord | null
  images: LooseRecord | null
}

const SELECTED_GAME_TEMPLATE_DECK_REF = {
  path: 'Resources/GameMode/CardGames/Decks/Standard_52.asset',
  guid: '991b75fe-271a-4e16-99bf-02e4651a60fd',
  assetType: 'Deck',
  displayName: 'Standard 52',
  resourceEntryType: 'AssetResourceEntry',
  variant: 'Standard52',
  category: 'Game',
} as const

const SELECTED_GAME_TEMPLATE_RANKING_REF = {
  path: 'Resources/GameMode/CardGames/CardRanking/StandardCardRanking.asset',
  guid: 'c9ffcf9a-4917-c61d-ce71-d709e878c0ff',
  assetType: 'DeckRanking',
  displayName: 'StandardCardRanking',
  resourceEntryType: 'AssetResourceEntry',
  variant: 'StandardCardRanking',
  category: 'Game',
} as const

function asPreviewRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as LooseRecord
    : {}
}

function asPreviewText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function dataOfPreview(value: unknown): LooseRecord {
  const record = asPreviewRecord(value)
  const data = asPreviewRecord(record.data)
  return Object.keys(data).length > 0 ? data : record
}

function pathFromPreviewRef(value: unknown): string {
  return asPreviewText(asPreviewRecord(value).path)
}

async function loadPreviewAssetDocument(path: string): Promise<LooseRecord | null> {
  if (!path) {
    return null
  }
  try {
    const response = await readAsset(path)
    if (!response.ok) {
      return null
    }
    return JSON5.parse(await response.text()) as LooseRecord
  } catch {
    return null
  }
}

async function loadSelectedGamePreviewBundle(
  gamePath: string
): Promise<SelectedGamePreviewBundle> {
  const gameMode = await loadPreviewAssetDocument(gamePath)
  const gameData = dataOfPreview(gameMode)
  const gameBasePath = gamePath.replace(/\\/g, '/').replace(/\/[^/]*$/, '')
  const gameInfo = await loadPreviewAssetDocument(pathFromPreviewRef(gameData.gameInfoAsset))
  const rules = await loadPreviewAssetDocument(pathFromPreviewRef(gameData.gameRulesAsset))
  const scoring = await loadPreviewAssetDocument(pathFromPreviewRef(gameData.scoringAsset))
  const strategy = await loadPreviewAssetDocument(pathFromPreviewRef(gameData.strategyAsset))
  const mechanics = await loadPreviewAssetDocument(pathFromPreviewRef(gameData.mechanicsAsset))
  const images = await loadPreviewAssetDocument(pathFromPreviewRef(gameData.carouselImagesAsset))
  const infoData = dataOfPreview(gameInfo)
  const linkedAssets = asPreviewRecord(asPreviewRecord(infoData.mechanicsContract).linkedAssetKeys)
  const deckModel = await loadPreviewAssetDocument(
    asPreviewText(linkedAssets.deckModel) ? `${gameBasePath}/${asPreviewText(linkedAssets.deckModel)}` : ''
  )
  const deckModelData = dataOfPreview(deckModel)
  const deck =
    await loadPreviewAssetDocument(pathFromPreviewRef(gameData.deckAsset)) ??
    await loadPreviewAssetDocument(pathFromPreviewRef(asPreviewRecord(deckModelData.assetRefs).deck)) ??
    await loadPreviewAssetDocument(pathFromPreviewRef(asPreviewRecord(dataOfPreview(scoring).scoringRules).deckAsset))
  const actions = await loadPreviewAssetDocument(
    asPreviewText(linkedAssets.actionSet) ? `${gameBasePath}/${asPreviewText(linkedAssets.actionSet)}` : ''
  )
  const validationFixtures = await loadPreviewAssetDocument(
    asPreviewText(linkedAssets.validationFixtures) ? `${gameBasePath}/${asPreviewText(linkedAssets.validationFixtures)}` : ''
  )
  const ranking =
    await loadPreviewAssetDocument(pathFromPreviewRef(gameData.rankingAsset)) ??
    await loadPreviewAssetDocument(pathFromPreviewRef(dataOfPreview(scoring).rankingAsset)) ??
    await loadPreviewAssetDocument(pathFromPreviewRef(asPreviewRecord(deckModelData.assetRefs).ranking))

  return {
    gameMode,
    gameInfo,
    rules,
    strategy,
    scoring,
    deckModel,
    deck,
    ranking,
    mechanics,
    actions,
    validationFixtures,
    images,
  }
}

async function loadSelectedGameTemplatePreviewBundle(): Promise<SelectedGamePreviewBundle> {
  const [deck, ranking] = await Promise.all([
    loadPreviewAssetDocument(SELECTED_GAME_TEMPLATE_DECK_REF.path),
    loadPreviewAssetDocument(SELECTED_GAME_TEMPLATE_RANKING_REF.path),
  ])
  return {
    ...buildSelectedGameFallbackBundle(null),
    deck,
    ranking,
  }
}

function buildSelectedGameFallbackBundle(
  selectedGame: GameWithMetadata | null
): SelectedGamePreviewBundle {
  if (!selectedGame) {
    return {
      gameMode: {
        data: {
          displayName: 'Template Game',
          minPlayers: 2,
          maxPlayers: 4,
          deckType: 'Standard 52',
          deckAsset: SELECTED_GAME_TEMPLATE_DECK_REF,
          rankingAsset: SELECTED_GAME_TEMPLATE_RANKING_REF,
        },
      },
      gameInfo: {
        data: {
          hero: {
            title: 'Template Game',
            subtitle: 'Lorem ipsum dolor sit amet. Curabitur table pressure rises every turn.',
          },
          Player: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse players race to read the table, protect key cards, and choose the right moment to score.',
          description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer table states create short choices, visible pressure, and clear scoring windows.',
          tagline: 'Asset-backed selected-game template.',
          tags: ['Template', 'Card Game', 'Preview'],
          minPlayers: 2,
          maxPlayers: 4,
          gameCategory: 'CardGames',
          subcategory: 'Template',
          difficulty: 'Medium',
          duration: '20 minutes',
          deck: 'Standard placeholder deck',
          playersDisplay: '2-4 players',
          sections: [
            {
              id: 'about-template',
              label: 'About',
              pages: [
                {
                  title: 'How To Play',
                  subtitle: 'Template copy',
                  content: [
                    { kind: 'paragraph', text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. The selected-game layout should make the goal, rhythm, and table pressure easy to scan.' },
                    { kind: 'list', items: ['Fast overview for new players', 'Short snippets for returning players', 'Room for authored game history'] },
                  ],
                },
                {
                  title: 'How to Play',
                  subtitle: 'Player flow',
                  content: [
                    { kind: 'list', items: ['Set up the table from the authored deck asset.', 'Take turns using the rules asset as the source of truth.', 'Score from the scoring asset when the round ends.'] },
                  ],
                },
                {
                  title: 'History',
                  subtitle: 'Origin placeholder',
                  content: [
                    { kind: 'paragraph', text: 'Lorem ipsum origin text marks where migrated processed-game history, countries, and alternative names will appear.' },
                  ],
                },
              ],
            },
          ],
          historyContent: {
            origins: 'Lorem ipsum history text for country, origin, and timeline content.',
            timeline: ['Origin placeholder', 'Regional variant placeholder', 'Modern rules placeholder'],
          },
          variationsContent: {
            list: [
              { name: 'Variant A', description: 'Lorem ipsum variant description.' },
              { name: 'Variant B', description: 'Alternate table size placeholder.' },
            ],
          },
        },
      },
      rules: {
        data: {
          rules: [
            { id: 'setup', text: 'Use the deck asset to deal the authored setup.' },
            { id: 'turn', text: 'Resolve player turns from the rules asset.' },
            { id: 'round-end', text: 'End the round when the scoring asset condition is met.' },
            { id: 'edge', text: 'Use authored edge cases for ambiguous moves.' },
          ],
          ruleGroups: [
            { id: 'setup', label: 'Setup', ruleIds: ['setup'] },
            { id: 'turn-flow', label: 'Turn Flow', ruleIds: ['turn', 'edge'] },
            { id: 'round-end', label: 'Round End', ruleIds: ['round-end'] },
          ],
          playerCount: { min: 2, max: 4 },
          setup: { deck: 'Template deck' },
          turnRules: { timerSeconds: 45 },
        },
      },
      strategy: {
        data: {
          tips: [
            { title: 'Read pressure', body: 'Lorem ipsum strategy copy for short tactical guidance.' },
            { title: 'Protect tempo', body: 'Use concise snippets instead of long paragraphs.' },
          ],
        },
      },
      scoring: {
        data: {
          description: 'Lorem ipsum scoring model placeholder.',
          targetScore: '21',
          winCondition: 'Highest valid score wins.',
          scoringDirection: 'highest',
          cardValues: { A: 11, K: 10, Q: 10, J: 10 },
          scoringRules: {
            deckAsset: SELECTED_GAME_TEMPLATE_DECK_REF,
          },
          rankingAsset: SELECTED_GAME_TEMPLATE_RANKING_REF,
        },
      },
      deckModel: {
        data: {
          assetRefs: {
            deck: SELECTED_GAME_TEMPLATE_DECK_REF,
            ranking: SELECTED_GAME_TEMPLATE_RANKING_REF,
          },
          deckType: 'Standard 52',
          suits: ['Suit A', 'Suit B', 'Suit C', 'Suit D'],
          ranks: ['A', 'K', 'Q', 'J', '10'],
          handRanks: {
            valueSystem: 'ace_high',
            rankCycle: ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'],
            suitScope: 'same_suit_only',
          },
        },
      },
      deck: null,
      ranking: {
        data: {
          rankingType: 'Template ranking',
          ranks: ['A', 'K', 'Q', 'J', '10'],
        },
      },
      mechanics: {
        data: {
          mechanicsId: 'template-mechanics',
          mechanicsVersion: '0.1.0',
          familyKernel: 'template',
          executorId: 'template-executor',
        },
      },
      actions: {
        data: {
          actionSetId: 'template-actions',
          actions: [{ id: 'play', label: 'Play placeholder action' }],
        },
      },
      validationFixtures: null,
      images: null,
    }
  }
  const home: Partial<GameHome> = selectedGame?.home ?? {}
  const entry = selectedGame?.entry
  const name = home.name ?? entry?.displayName ?? 'Selected Game'
  return {
    gameMode: {
      data: {
        displayName: name,
        minPlayers: home.minPlayers,
        maxPlayers: home.maxPlayers,
        bannerImage: home.bannerImage,
        deckType: home.deck,
      },
    },
    gameInfo: {
      data: {
        hero: {
          title: name,
          subtitle: home.tagline ?? home.shortDescription,
        },
        Player: home.description ?? home.shortDescription ?? home.tagline,
        description: home.description ?? home.shortDescription,
        tagline: home.tagline,
        tags: home.tags ?? [],
        minPlayers: home.minPlayers,
        maxPlayers: home.maxPlayers,
        gameCategory: home.gameCategory,
        subcategory: home.subcategory,
        difficulty: home.difficulty,
        duration: home.duration,
        deck: home.deck,
        playersDisplay: home.playersDisplay,
        quality: home.quality,
      },
    },
    rules: null,
    strategy: null,
    scoring: null,
    deckModel: null,
    deck: null,
    ranking: null,
    mechanics: null,
    actions: null,
    validationFixtures: null,
    images: null,
  }
}

function collectSelectedGameImageHashesFromBundle(bundle: SelectedGamePreviewBundle | null): ImageHash[] {
  if (!bundle) {
    return []
  }
  const hashes: ImageHash[] = []
  const add = (value: unknown) => {
    if (typeof value === 'string' && isImageHash(value)) {
      hashes.push(value)
    }
  }
  const gameMode = dataOfPreview(bundle.gameMode)
  const gameInfo = dataOfPreview(bundle.gameInfo)
  const images = dataOfPreview(bundle.images)
  add(gameMode.bannerImage)
  add(gameInfo.gameIconImage)
  add(images.logoImageHash)
  for (const slide of Array.isArray(images.slides) ? images.slides : []) {
    add(asPreviewRecord(slide).imageHash)
  }
  return Array.from(new Set(hashes))
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
const SELECTED_GAME_PLACEHOLDER_ART_URL = '/Resources/AppAssets/PlaceHolders/image0.jpg'
const SELECTED_GAME_PLACEHOLDER_OVERVIEW_URL = '/Resources/AppAssets/PlaceHolders/image1.jpg'

function mergeHeaderConfigInput(
  baseConfig?: UnifiedHeaderConfigInput | null,
  overrideConfig?: UnifiedHeaderConfigInput | null
): UnifiedHeaderConfigInput {
  return {
    ...baseConfig,
    ...overrideConfig,
    layout: {
      ...baseConfig?.layout,
      ...overrideConfig?.layout,
    },
    style: {
      ...baseConfig?.style,
      ...overrideConfig?.style,
    },
    left: {
      ...baseConfig?.left,
      ...overrideConfig?.left,
      ...(baseConfig?.left?.textStyle || overrideConfig?.left?.textStyle
        ? {
            textStyle: {
              ...baseConfig?.left?.textStyle,
              ...overrideConfig?.left?.textStyle,
            },
          }
        : {}),
    },
    right: {
      ...baseConfig?.right,
      ...overrideConfig?.right,
      ...(baseConfig?.right?.textStyle || overrideConfig?.right?.textStyle
        ? {
            textStyle: {
              ...baseConfig?.right?.textStyle,
              ...overrideConfig?.right?.textStyle,
            },
          }
        : {}),
    },
    center: {
      ...baseConfig?.center,
      ...overrideConfig?.center,
      modeA: {
        ...baseConfig?.center?.modeA,
        ...overrideConfig?.center?.modeA,
        ...(baseConfig?.center?.modeA?.textStyle || overrideConfig?.center?.modeA?.textStyle
          ? {
              textStyle: {
                ...baseConfig?.center?.modeA?.textStyle,
                ...overrideConfig?.center?.modeA?.textStyle,
              },
            }
          : {}),
        ...(baseConfig?.center?.modeA?.logo || overrideConfig?.center?.modeA?.logo
          ? {
              logo: {
                ...baseConfig?.center?.modeA?.logo,
                ...overrideConfig?.center?.modeA?.logo,
              },
            }
          : {}),
      },
      modeB: {
        ...baseConfig?.center?.modeB,
        ...overrideConfig?.center?.modeB,
        ...(baseConfig?.center?.modeB?.textStyle || overrideConfig?.center?.modeB?.textStyle
          ? {
              textStyle: {
                ...baseConfig?.center?.modeB?.textStyle,
                ...overrideConfig?.center?.modeB?.textStyle,
              },
            }
          : {}),
        ...(baseConfig?.center?.modeB?.taglineStyle || overrideConfig?.center?.modeB?.taglineStyle
          ? {
              taglineStyle: {
                ...baseConfig?.center?.modeB?.taglineStyle,
                ...overrideConfig?.center?.modeB?.taglineStyle,
              },
            }
          : {}),
      },
    },
    navigation: {
      ...baseConfig?.navigation,
      ...overrideConfig?.navigation,
    },
    metadata: {
      ...baseConfig?.metadata,
      ...overrideConfig?.metadata,
    },
  } as UnifiedHeaderConfigInput
}

function AssetCatalogMainAppPreviewShell({
  children,
  routePath = '/',
  headerConfigOverride = null,
  headerDynamicData,
  toolbar = null,
  shellClassName = 'home-page',
  workClassName = 'home-shell-work',
  includeAdminNavigation = true,
  showPrimaryNavigation = true,
}: {
  children: React.ReactNode
  routePath?: string
  headerConfigOverride?: UnifiedHeaderConfigInput | null
  headerDynamicData?: { gameName: string; tagline: string }
  toolbar?: React.ReactNode
  shellClassName?: string
  workClassName?: string
  includeAdminNavigation?: boolean
  showPrimaryNavigation?: boolean
}) {
  const rotationControlRef = useRef<RotationControlAPI | null>(null)
  const headerLogoConfig = useMemo(() => createOcentraHeaderLogoConfig(mlogoImageUrl), [])
  const headerConfig = useMemo(
    () => mergeHeaderConfigInput(headerConfigOverride, headerLogoConfig),
    [headerConfigOverride, headerLogoConfig]
  )

  return (
    <div className="asset-catalog-preview__main-app-host">
      <MemoryRouter initialEntries={[routePath]}>
        <ThreeBaseProvider>
          <UnifiedPageShell
            embedded
            className={`asset-catalog-preview__main-app-shell ${shellClassName}`}
            workClassName={workClassName}
            background={<DynamicBackground controlRef={rotationControlRef} />}
            header={
              <UnifiedHeader
                config={headerConfig}
                dynamicData={headerDynamicData}
                profileName="main_screen"
                includeAdminNavigation={includeAdminNavigation}
                showPrimaryNavigation={showPrimaryNavigation}
                placement="contained"
                showDebugControls={false}
              />
            }
            toolbar={toolbar}
            footer={<GameFooter appVersion={ASSET_EDITOR_PREVIEW_APP_VERSION} />}
          >
            {children}
          </UnifiedPageShell>
        </ThreeBaseProvider>
      </MemoryRouter>
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
  mode?: 'catalog' | 'pageLayout'
}

type PageLayoutPreviewData = Partial<PageLayoutDocument>

function readPageLayoutData(assetData: { data?: unknown }): PageLayoutPreviewData {
  return assetData.data && typeof assetData.data === 'object'
    ? (assetData.data as PageLayoutPreviewData)
    : {}
}

function getPageLayoutKind(document: PageLayoutPreviewData): NonNullable<PageLayoutPreviewData['kind']> {
  if (document.kind) return document.kind
  if (document.pageId === 'leaderboard') return 'leaderboard'
  if (document.pageId === 'profile') return 'profile'
  if (document.pageId === 'tournaments') return 'tournaments'
  if (document.pageId === 'selected-game') return 'selected-game'
  if (document.pageId === 'games') return 'games'
  if (document.pageId === 'shop') return 'shop'
  if (document.pageId === 'social') return 'social'
  if (document.pageId === 'admin') return 'admin'
  if (document.pageId === 'settings') return 'settings'
  return 'generic'
}

function getPageLayoutHeaderData(document: PageLayoutPreviewData): { gameName: string; tagline: string } {
  const kind = getPageLayoutKind(document)
  if (kind === 'shop') {
    return { gameName: 'Arena Marketplace', tagline: 'Gear up. Outthink. Outplay.' }
  }
  if (kind === 'social') {
    return { gameName: 'Social Hub', tagline: 'Friends, parties, messages, notifications, and activity.' }
  }
  if (kind === 'tournaments') {
    return { gameName: 'Competition', tagline: 'Rank ladders, nearby standings, and tournament brackets.' }
  }
  if (kind === 'selected-game') {
    return { gameName: 'Selected Game', tagline: 'Asset-backed game detail presentation.' }
  }
  if (kind === 'leaderboard') {
    return { gameName: 'Leaderboard', tagline: 'Season ranks, nearby players, and competitive progress.' }
  }
  if (kind === 'profile') {
    return { gameName: 'Player Hub', tagline: 'Profile, inventory, and marketplace in one control center.' }
  }
  if (kind === 'games') {
    return { gameName: 'Card Games Explorer', tagline: 'Finished card games in the catalog.' }
  }
  if (kind === 'admin') {
    return { gameName: 'Admin Dashboard', tagline: 'Control Center | Manage users and system tools' }
  }
  if (kind === 'settings') {
    return { gameName: 'Settings', tagline: 'Models, providers, native integrations, and asset delivery.' }
  }
  return { gameName: document.title || 'Page Layout', tagline: document.routePath || '/' }
}

const previewShopProducts: ShopProduct[] = [
  { productId: 'ac-100', productType: 'AC_CREDITS', displayName: 'Starter Credits', acAmount: 100, unitPriceCents: 100, currency: 'usd', active: true },
  { productId: 'ac-500', productType: 'AC_CREDITS', displayName: 'Arena Credits', acAmount: 500, unitPriceCents: 500, currency: 'usd', active: true },
  { productId: 'ac-1200', productType: 'AC_CREDITS', displayName: 'Best Value Credits', acAmount: 1200, unitPriceCents: 999, currency: 'usd', active: true },
  { productId: 'ac-3500', productType: 'AC_CREDITS', displayName: 'Season Supply', acAmount: 3500, unitPriceCents: 2499, currency: 'usd', active: true },
  { productId: 'sub-arena-pass', productType: 'SUBSCRIPTION', displayName: 'Arena Pass', unitPriceCents: 999, currency: 'usd', active: true },
  { productId: 'sub-champions-pass', productType: 'SUBSCRIPTION', displayName: "Champion's Pass", unitPriceCents: 1999, currency: 'usd', active: true },
  { productId: 'vault-card-back-neon', productType: 'MARKETPLACE', displayName: 'Neon Card Back', currency: 'ac', active: true },
  { productId: 'vault-table-classic', productType: 'MARKETPLACE', displayName: 'Classic Felt Table', currency: 'ac', active: true },
]

const previewLeaderboardEntries: LeaderboardRow[] = [
  { user_id: 'ocentra-ai', rank: 1, score: 18420, wins: 94, losses: 12 },
  { user_id: 'table-pilot', rank: 2, score: 17905, wins: 88, losses: 16 },
  { user_id: 'claim-master', rank: 3, score: 16280, wins: 79, losses: 18 },
  { user_id: 'near-you', rank: 14, score: 9740, wins: 41, losses: 22 },
]

const previewAdminUsers: AdminUserRow[] = [
  { uid: 'u-001', email: 'sujan@ocentra.ca', displayName: 'sujan', isAdmin: true, lastLogin: '2026-05-02T14:30:00.000Z' },
  { uid: 'u-002', email: 'pilot@ocentra.ca', displayName: 'table pilot', isAdmin: false, lastLogin: '2026-05-01T19:12:00.000Z' },
  { uid: 'u-003', email: 'claim@ocentra.ca', displayName: 'claim master', isAdmin: false, lastLogin: '2026-04-29T11:09:00.000Z' },
]

const previewAdminActivities: AdminActivityRow[] = [
  { adminEmail: 'sujan@ocentra.ca', targetEmail: 'pilot@ocentra.ca', action: 'grant', timestamp: '2026-05-01T15:25:00.000Z' },
  { adminEmail: 'sujan@ocentra.ca', targetEmail: 'claim@ocentra.ca', action: 'revoke', timestamp: '2026-04-30T10:10:00.000Z' },
]

function GenericPageLayoutContent({
  document,
  debugBounds = false,
}: {
  document: PageLayoutPreviewData
  debugBounds?: boolean
}) {
  const title = document.title || document.pageId || 'Page Layout'
  const routePath = document.routePath || '/'
  const enabledSlices = (document.slices ?? [])
    .filter(slice => slice.enabled !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <main className={`asset-catalog-preview__page-layout-stage ${debugBounds ? 'asset-catalog-preview__page-layout-stage--bounds' : ''}`}>
      <section className="asset-catalog-preview__page-layout-hero">
        <div>
          <span className="asset-catalog-preview__page-layout-eyebrow">Page Layout</span>
          <h1>{title}</h1>
          <p>{routePath}</p>
        </div>
        <div className="asset-catalog-preview__page-layout-kind">
          {(document.kind ?? 'generic').toString()}
        </div>
      </section>
      <section className="asset-catalog-preview__page-layout-slices">
        {enabledSlices.length > 0 ? (
          enabledSlices.map(slice => (
            <article key={slice.id} className="asset-catalog-preview__page-layout-slice">
              <div>
                <span>{slice.type}</span>
                <h2>{slice.title || slice.id}</h2>
              </div>
              {slice.sourceAssetPath ? <code>{slice.sourceAssetPath}</code> : null}
            </article>
          ))
        ) : (
          <article className="asset-catalog-preview__page-layout-slice">
            <div>
              <span>empty</span>
              <h2>No page slices configured</h2>
            </div>
          </article>
        )}
      </section>
    </main>
  )
}

function PageLayoutMainAppPreview({
  document,
  headerConfigOverride = null,
  gamesExplorerContent = null,
  selectedGameContent = null,
  debugBounds = false,
}: {
  document: PageLayoutPreviewData
  headerConfigOverride?: UnifiedHeaderConfigInput | null
  gamesExplorerContent?: React.ReactNode
  selectedGameContent?: React.ReactNode
  debugBounds?: boolean
}) {
  const routePath = document.routePath || '/'
  const kind = getPageLayoutKind(document)
  const headerDynamicData = getPageLayoutHeaderData(document)
  const [shopTab, setShopTab] = useState<ShopTab>('Treasury')
  const [settingsTab, setSettingsTab] = useState<'models' | 'inference' | 'providers' | 'native' | 'assets'>('models')
  const [adminSearch, setAdminSearch] = useState('')

  const content =
    kind === 'games' ? (
      gamesExplorerContent ?? <GenericPageLayoutContent document={document} debugBounds={debugBounds} />
    ) : kind === 'selected-game' ? (
      selectedGameContent ?? <GenericPageLayoutContent document={document} debugBounds={debugBounds} />
    ) : kind === 'shop' ? (
      <ShopPageContent
        activeTab={shopTab}
        products={previewShopProducts}
        loadingProducts={false}
        loadingId={null}
        error={null}
        acBalance={12450}
        onClearError={() => undefined}
        onBuy={() => undefined}
      />
    ) : kind === 'social' ? (
      <SocialPageContent
        loading={false}
        error={null}
        presenceStatus="online"
        friends={[{ friendId: 'claim-master' }, { friendId: 'table-pilot' }]}
        partyId="party-preview"
        partyMembers={[{ userId: 'sujan' }, { userId: 'ocentra-ai' }]}
        messages={[{ messageId: 'm1', senderId: 'claim-master', content: 'Ready for the next table.' }]}
        activeConversationId="claim-table"
        notifications={[{ id: 'n1', type: 'party.invite', title: 'Party invite', body: 'table-pilot invited you.', read: false }]}
        feedItems={[{ id: 'f1', type: 'match.complete', payload: { game: 'Claim', result: 'win' } }]}
        onRefresh={() => undefined}
        onMatchmaking={() => undefined}
        onLobby={() => undefined}
        onAddFriend={() => undefined}
        onRemoveFriend={() => undefined}
        onCreateParty={() => undefined}
        onLoadParty={() => undefined}
        onJoinParty={() => undefined}
        onLeaveParty={() => undefined}
        onInvite={() => undefined}
        onLoadMessages={() => undefined}
        onSendMessage={() => undefined}
        onMarkRead={() => undefined}
        onMarkAllNotificationsRead={() => undefined}
        onAppendActivity={() => undefined}
      />
    ) : kind === 'tournaments' ? (
      <CompetitionPageContent
        loading={false}
        registering={false}
        error={null}
        gameType={1}
        seasonId="preview-season"
        lastUpdated="just now"
        leaderboardEntries={previewLeaderboardEntries}
        showPersonalizedStats
        userEntry={previewLeaderboardEntries[3] ?? null}
        nearbyAbove={previewLeaderboardEntries.slice(1, 2)}
        nearbyBelow={previewLeaderboardEntries.slice(2, 3)}
        tournamentId="preview-bracket"
        tournamentRounds={[{ round: 1, matches: [1, 2, 3, 4] }, { round: 2, matches: [1, 2] }, { round: 3, matches: [1] }]}
        onRefreshLeaderboard={() => undefined}
        onLoadBracket={() => undefined}
        onRegister={() => undefined}
        onMatchmaking={() => undefined}
      />
    ) : kind === 'leaderboard' ? (
      <CompetitionPageContent
        loading={false}
        registering={false}
        error={null}
        gameType={1}
        seasonId="preview-season"
        lastUpdated="just now"
        leaderboardEntries={previewLeaderboardEntries}
        showPersonalizedStats
        userEntry={previewLeaderboardEntries[3] ?? null}
        nearbyAbove={previewLeaderboardEntries.slice(1, 2)}
        nearbyBelow={previewLeaderboardEntries.slice(2, 3)}
        tournamentId="preview-bracket"
        tournamentRounds={[{ round: 1, matches: [1, 2, 3, 4] }, { round: 2, matches: [1, 2] }]}
        onRefreshLeaderboard={() => undefined}
        onLoadBracket={() => undefined}
        onRegister={() => undefined}
        onMatchmaking={() => undefined}
      />
    ) : kind === 'profile' ? (
      <PlayerHubPageContent
        loading={false}
        error={null}
        targetUserId="preview-player"
        profile={{ alias: 'preview-player', rank: 14, favoriteGame: 'Claim', accountType: 'full' }}
        inventoryItems={[{ itemId: 'neon-card-back', quantity: 1 }, { itemId: 'founder-badge', quantity: 1 }]}
        marketplaceListings={[{ id: 'classic-felt', title: 'Classic Felt Table' }, { id: 'royal-card-back', title: 'Royal Card Back' }]}
        onRefresh={() => undefined}
        onShop={() => undefined}
        onSettings={() => undefined}
        onLoadUser={() => undefined}
      />
    ) : kind === 'admin' ? (
      <AdminUsersPageContent
        permissionDenied={false}
        users={previewAdminUsers}
        activities={previewAdminActivities}
        loading={false}
        searchQuery={adminSearch}
        selectedUser={null}
        pendingAction={null}
        onSearchChange={setAdminSearch}
        onRefresh={() => undefined}
        onToggleAdmin={() => undefined}
        onCancelDialog={() => undefined}
        onConfirmDialog={() => undefined}
        currentUserId="u-001"
      />
    ) : kind === 'settings' ? (
      <SettingsPageContent>
        <div className="model-list">
          {['Local Model Selection', 'Inference Settings', 'Provider Config'].map((title) => (
            <div key={title} className="model-item">
              <div className="model-name">{title}</div>
              <div className="model-quants">
                <button className="quant-btn downloaded" type="button">Ready</button>
                <button className="quant-btn" type="button">Configure</button>
              </div>
            </div>
          ))}
        </div>
      </SettingsPageContent>
    ) : (
      <GenericPageLayoutContent document={document} debugBounds={debugBounds} />
    )

  const toolbar = kind === 'shop'
    ? <ShopPageToolbar activeTab={shopTab} acBalance={12450} onTabChange={setShopTab} />
    : kind === 'settings'
      ? <SettingsPageToolbar activeTab={settingsTab} showAssetsTab onTabChange={setSettingsTab} />
      : null

  const shellClassName = kind === 'shop'
    ? 'sp-root'
    : kind === 'social'
      ? 'social-page'
      : kind === 'tournaments' || kind === 'leaderboard'
        ? 'cp-page'
        : kind === 'profile'
          ? 'ph-page'
          : kind === 'admin'
            ? 'admin-users-page'
            : kind === 'settings'
              ? 'settings-page'
              : kind === 'selected-game'
                ? 'selected-game-page'
                : 'home-page'

  const workClassName = kind === 'admin'
    ? `admin-users-work${debugBounds ? ' asset-catalog-preview__page-bounds-work' : ''}`
    : kind === 'selected-game'
      ? `selected-game-shell-work${debugBounds ? ' asset-catalog-preview__page-bounds-work' : ''}`
      : `home-shell-work${debugBounds ? ' asset-catalog-preview__page-bounds-work' : ''}`

  return (
    <AssetCatalogMainAppPreviewShell
      routePath={routePath}
      headerConfigOverride={headerConfigOverride}
      headerDynamicData={headerDynamicData}
      toolbar={toolbar}
      shellClassName={shellClassName}
      workClassName={workClassName}
      includeAdminNavigation={kind !== 'selected-game'}
      showPrimaryNavigation={kind !== 'selected-game'}
    >
      {content}
    </AssetCatalogMainAppPreviewShell>
  )
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

const EMPTY_HOMEPAGE_PREVIEW_DATA: HomePageGamesDocument = {
  featured: [],
  recommended: [],
  comingSoon: [],
  catalogMontageImages: [],
  availableNow: [],
  featureBannerItems: [],
}

const HOMEPAGE_PREVIEW_CACHE_TTL_MS = 30000

let cachedHomepagePreviewData: HomePageGamesDocument | null = null
let cachedHomepagePreviewLoadedAtMs = 0

function hasHomepagePreviewContent(data: HomePageGamesDocument | null): boolean {
  if (!data) {
    return false
  }

  return (
    data.featured.length > 0 ||
    data.recommended.length > 0 ||
    data.availableNow.length > 0 ||
    data.comingSoon.length > 0 ||
    data.catalogMontageImages.length > 0 ||
    data.featureBannerItems.length > 0
  )
}

export const AssetCatalogPreview: React.FC<AssetCatalogPreviewProps> = ({
  assetId,
  assetData,
  viewMode,
  setViewMode,
  navigationHistory,
  onBack,
  onNavigateToAsset,
  mode = 'catalog',
}) => {
  const isPageLayoutMode = mode === 'pageLayout'
  const pageLayoutData = useMemo(
    () => isPageLayoutMode ? readPageLayoutData(assetData) : null,
    [assetData, isPageLayoutMode]
  )
  const isHomePageLayout =
    !isPageLayoutMode ||
    pageLayoutData?.kind === 'home' ||
    pageLayoutData?.pageId === 'home'
  const pageLayoutKind = pageLayoutData ? getPageLayoutKind(pageLayoutData) : 'generic'
  const isSelectedGameLayout = isPageLayoutMode && pageLayoutKind === 'selected-game'
  const shouldLoadGamesForPageLayout =
    isPageLayoutMode && (pageLayoutKind === 'games' || pageLayoutKind === 'selected-game')
  const initialSelectedGameLayoutConfig = normalizeSelectedGameLayoutConfig(pageLayoutData)
  const hasCachedHomepagePreview = hasHomepagePreviewContent(cachedHomepagePreviewData)
  const [activeTab, setActiveTab] = useState<AssetCatalogTab>(
    isPageLayoutMode ? 'homepage' : 'games'
  )
  const [selectedGameId, setSelectedGameId] = useState<string | null>(
    () => isSelectedGameLayout ? initialSelectedGameLayoutConfig.previewSampleGameId || null : null
  )
  const [homepageData, setHomepageDataState] = useState<HomePageGamesDocument>(
    () => cachedHomepagePreviewData ?? EMPTY_HOMEPAGE_PREVIEW_DATA
  )
  const setHomepageData = useCallback(
    (value: React.SetStateAction<HomePageGamesDocument>) => {
      setHomepageDataState(prev => {
        const next =
          typeof value === 'function'
            ? (value as (previous: HomePageGamesDocument) => HomePageGamesDocument)(prev)
            : value
        cachedHomepagePreviewData = next
        if (hasHomepagePreviewContent(next)) {
          cachedHomepagePreviewLoadedAtMs = Date.now()
        }
        return next
      })
    },
    []
  )
  const [isLoadingHomepageCatalog, setIsLoadingHomepageCatalog] =
    useState(!hasCachedHomepagePreview)
  const [isLoadingHomepageComingSoon, setIsLoadingHomepageComingSoon] =
    useState(!hasCachedHomepagePreview)
  const [isLoadingHomepageFeatureBanner, setIsLoadingHomepageFeatureBanner] =
    useState(!hasCachedHomepagePreview)
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
  const [selectedGameLayoutControls, setSelectedGameLayoutControls] =
    useState<SelectedGameLayoutControls>(() => initialSelectedGameLayoutConfig.layoutControls)
  const [selectedGameContentPlan, setSelectedGameContentPlan] =
    useState<SelectedGameContentPlan>(() => initialSelectedGameLayoutConfig.contentPlan)
  const [selectedGamePreviewSampleGameId, setSelectedGamePreviewSampleGameId] =
    useState(() => initialSelectedGameLayoutConfig.previewSampleGameId)
  const [selectedGameDebugBounds, setSelectedGameDebugBounds] =
    useState(() => initialSelectedGameLayoutConfig.debugBounds)
  const [selectedGamePreviewLayoutMode, setSelectedGamePreviewLayoutMode] =
    useState<SelectedGamePreviewLayoutMode>('auto')
  const [pageLayoutBoundsOverlay, setPageLayoutBoundsOverlay] = useState(false)
  const [selectedGamePreviewBundle, setSelectedGamePreviewBundle] =
    useState<SelectedGamePreviewBundle | null>(null)
  const [selectedGameActiveTab, setSelectedGameActiveTab] =
    useState<SelectedGameTabId>('about')
  const [headerConfigOverride, setHeaderConfigOverride] =
    useState<SerializedUnifiedHeaderConfig | null>(null)
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
  const selectedGameLayoutControlsRef =
    useRef<SelectedGameLayoutControls>({})
  const selectedGameContentPlanRef =
    useRef<SelectedGameContentPlan>(DEFAULT_SELECTED_GAME_CONTENT_PLAN)
  const selectedGamePreviewSampleGameIdRef = useRef('claim')
  const selectedGameDebugBoundsRef = useRef(false)
  const selectedGamePreviewLayoutModeRef =
    useRef<SelectedGamePreviewLayoutMode>('auto')
  const headerConfigOverrideRef = useRef<SerializedUnifiedHeaderConfig | null>(null)
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
    selectedGameLayoutControlsRef.current = selectedGameLayoutControls
  }, [selectedGameLayoutControls])

  useEffect(() => {
    selectedGameContentPlanRef.current = selectedGameContentPlan
  }, [selectedGameContentPlan])

  useEffect(() => {
    selectedGamePreviewSampleGameIdRef.current = selectedGamePreviewSampleGameId
  }, [selectedGamePreviewSampleGameId])

  useEffect(() => {
    if (isSelectedGameLayout && selectedGamePreviewSampleGameId && selectedGameId === null) {
      const timeoutId = window.setTimeout(() => {
        setSelectedGameId(selectedGamePreviewSampleGameId)
      }, 0)
      return () => window.clearTimeout(timeoutId)
    }
    return undefined
  }, [isSelectedGameLayout, selectedGameId, selectedGamePreviewSampleGameId])

  useEffect(() => {
    selectedGameDebugBoundsRef.current = selectedGameDebugBounds
  }, [selectedGameDebugBounds])

  useEffect(() => {
    selectedGamePreviewLayoutModeRef.current = selectedGamePreviewLayoutMode
  }, [selectedGamePreviewLayoutMode])

  useEffect(() => {
    headerConfigOverrideRef.current = headerConfigOverride
  }, [headerConfigOverride])

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
  }, [setHomepageData])

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
  }, [setHomepageData])

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
  }, [setHomepageData])

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
  }, [setHomepageData])

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
  }, [setHomepageData])

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
  }, [setHomepageData])

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
  }, [setHomepageData])

  useEffect(() => {
    const channel = new BroadcastChannel(SELECTED_GAME_LAYOUT_CONTROLS_CHANNEL)
    const handler = (event: MessageEvent<SelectedGameLayoutControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          layoutControls: selectedGameLayoutControlsRef.current,
          contentPlan: selectedGameContentPlanRef.current,
          previewSampleGameId: selectedGamePreviewSampleGameIdRef.current,
          previewLayoutMode: selectedGamePreviewLayoutModeRef.current,
          debugBounds: selectedGameDebugBoundsRef.current,
        } satisfies SelectedGameLayoutControlsMessage)
        return
      }

      if (event.data.type === 'update') {
        const nextSampleGameId = event.data.previewSampleGameId || 'claim'
        setSelectedGameLayoutControls(event.data.layoutControls)
        setSelectedGameContentPlan(event.data.contentPlan)
        setSelectedGamePreviewSampleGameId(nextSampleGameId)
        setSelectedGameId(nextSampleGameId || null)
        setSelectedGameDebugBounds(event.data.debugBounds)
        return
      }

      if (event.data.type === 'preview-layout-mode') {
        setSelectedGamePreviewLayoutMode(event.data.previewLayoutMode)
      }
    }
    channel.addEventListener('message', handler)
    return () => {
      channel.removeEventListener('message', handler)
      channel.close()
    }
  }, [])

  useEffect(() => {
    const channel = new BroadcastChannel(HEADER_PROFILE_CONTROLS_CHANNEL)
    const handler = (event: MessageEvent<HeaderProfileControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          config: headerConfigOverrideRef.current,
        } satisfies HeaderProfileControlsMessage)
        return
      }

      if (event.data.type === 'state') {
        setHeaderConfigOverride(event.data.config)
        return
      }

      if (event.data.type === 'update') {
        setHeaderConfigOverride(event.data.config)
      }
    }
    channel.addEventListener('message', handler)
    channel.postMessage({ type: 'request-state' } satisfies HeaderProfileControlsMessage)
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
      if (
        hasHomepagePreviewContent(cachedHomepagePreviewData) &&
        Date.now() - cachedHomepagePreviewLoadedAtMs < HOMEPAGE_PREVIEW_CACHE_TTL_MS
      ) {
        return
      }

      if (!hasHomepagePreviewContent(cachedHomepagePreviewData)) {
        setIsLoadingHomepageCatalog(true)
        setIsLoadingHomepageComingSoon(true)
        setIsLoadingHomepageFeatureBanner(true)
      }

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
          setHomepageData(EMPTY_HOMEPAGE_PREVIEW_DATA)
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
  }, [prefetchHashes, setHomepageData])

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
    if ((activeTab !== 'games' && !shouldLoadGamesForPageLayout) || hasLoadedGames) return
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
  }, [activeTab, hasLoadedGames, shouldLoadGamesForPageLayout])

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

  const selectedGameSampleOptions = useMemo(
    () =>
      [...gamesWithMetadata]
        .map(item => ({
          id:
            item.home.gameId ??
            item.entry.gameId ??
            extractGameIdFromPath(item.path) ??
            '',
          label: item.home.name ?? item.entry.displayName ?? item.path,
        }))
        .filter(item => item.id)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [gamesWithMetadata]
  )

  useEffect(() => {
    if (!isSelectedGameLayout) {
      const timeoutId = window.setTimeout(() => setSelectedGamePreviewBundle(null), 0)
      return () => window.clearTimeout(timeoutId)
    }
    let cancelled = false
    const loadBundle = selectedGame?.path
      ? loadSelectedGamePreviewBundle(selectedGame.path)
      : loadSelectedGameTemplatePreviewBundle()
    void loadBundle.then((bundle) => {
      if (!cancelled) {
        setSelectedGamePreviewBundle(bundle)
      }
    })
    return () => {
      cancelled = true
    }
  }, [isSelectedGameLayout, selectedGame])

  const selectedGameFallbackBundle = useMemo(
    () => buildSelectedGameFallbackBundle(selectedGame),
    [selectedGame]
  )
  const selectedGameRenderBundle = selectedGamePreviewBundle ?? selectedGameFallbackBundle

  const selectedGamePresentation = useMemo(() => {
    if (!isSelectedGameLayout) {
      return null
    }
    const layoutDocument = {
      ...(pageLayoutData ?? {}),
      layoutControls: selectedGameLayoutControls,
      contentPlan: selectedGameContentPlan,
    }
    const fallbackBundle = selectedGameFallbackBundle
    const bundle = selectedGameRenderBundle
    return buildSelectedGamePresentation({
      layout: { data: layoutDocument },
      gameMode: bundle.gameMode ?? fallbackBundle.gameMode,
      gameInfo: bundle.gameInfo ?? fallbackBundle.gameInfo,
      rules: bundle.rules,
      strategy: bundle.strategy,
      scoring: bundle.scoring,
      deckModel: bundle.deckModel,
      deck: bundle.deck,
      ranking: bundle.ranking,
      mechanics: bundle.mechanics,
      actions: bundle.actions,
      validationFixtures: bundle.validationFixtures,
      images: bundle.images,
    })
  }, [
    isSelectedGameLayout,
    pageLayoutData,
    selectedGameContentPlan,
    selectedGameFallbackBundle,
    selectedGameLayoutControls,
    selectedGameRenderBundle,
  ])

  useEffect(() => {
    const hashes = collectSelectedGameImageHashesFromBundle(selectedGamePreviewBundle)
    if (hashes.length > 0) {
      prefetchHashes(hashes)
    }
  }, [prefetchHashes, selectedGamePreviewBundle])

  const resolveSelectedGameVisualRefUrl = useCallback(
    (ref: SelectedGamePresentationVisualRef) =>
      ref.imageHash && isImageHash(ref.imageHash)
        ? resolveImageUrl(ref.imageHash as ImageHash)
        : null,
    [resolveImageUrl]
  )

  const renderSelectedGameVisualContent = useCallback(({ tabId }: { tabId: SelectedGameTabId }) => {
    if (!selectedGameRenderBundle) {
      return null
    }

    const gameLabel = selectedGame?.home.name ?? selectedGameId ?? 'Template Game'
    const deckVisualControls =
      selectedGameLayoutControls.visuals?.deck as SelectedGameDeckVisualControls | undefined
    const rankingVisualControls =
      selectedGameLayoutControls.visuals?.ranking as SelectedGameRankingVisualControls | undefined

    if (tabId === 'deck' && (selectedGameRenderBundle.deck || selectedGameRenderBundle.deckModel)) {
      return (
        <div className="asset-catalog-preview__selected-visual-preview asset-catalog-preview__selected-visual-preview--deck">
          <DeckPreview
            assetId={`${gameLabel} Deck`}
            assetData={(selectedGameRenderBundle.deck ?? selectedGameRenderBundle.deckModel) as { data?: Record<string, unknown>; system?: Record<string, unknown> }}
            compact
            enableCardDetail
            compactControls={deckVisualControls}
          />
        </div>
      )
    }

    if (tabId === 'ranking' && selectedGameRenderBundle.ranking) {
      return (
        <div className="asset-catalog-preview__selected-visual-preview asset-catalog-preview__selected-visual-preview--ranking">
          <CardRankingPreview
            assetId={`${gameLabel} Ranking`}
            assetData={selectedGameRenderBundle.ranking as { data?: Record<string, unknown> }}
            compact
            compactControls={rankingVisualControls}
          />
        </div>
      )
    }

    return null
  }, [selectedGame, selectedGameId, selectedGameLayoutControls, selectedGameRenderBundle])

  const rawJsonForTab = useMemo(() => {
    if (activeTab === 'homepage') {
      if (isPageLayoutMode && !isHomePageLayout) {
        return JSON.stringify(pageLayoutData ?? {}, null, 2)
      }

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
    if (activeTab === 'selected-game') {
      return JSON.stringify(
        {
          gameId: selectedGameId ?? null,
          mode: selectedGameId ? 'game-sample' : 'template-placeholders',
          exportPath: selectedGameId ? `games/${selectedGameId}/page.json` : null,
          enginePath: selectedGameId ? `games/${selectedGameId}/engine.json` : null,
          guid: selectedGame?.entry.guid ?? null,
          name: selectedGame?.home.name ?? 'Template Game',
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
    isHomePageLayout,
    isPageLayoutMode,
    pageLayoutData,
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

  const gamesExplorerPreviewContent = (
    <main className="asset-catalog-preview__real-page asset-catalog-preview__real-page--games">
      <div className="asset-catalog-games-tab asset-catalog-games-tab--explorer asset-catalog-preview__games-page-layout">
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
    </main>
  )

  const selectedGamePagePreviewContent = selectedGamePresentation ? (
    <main className="asset-catalog-preview__real-page asset-catalog-preview__real-page--selected-game">
      <SelectedGameShowcase
        activeTabId={selectedGameActiveTab}
        presentation={selectedGamePresentation}
        layoutControls={selectedGameLayoutControls}
        layoutMode={selectedGamePreviewLayoutMode}
        designerMode={selectedGameDebugBounds}
        fallbackArtUrl={SELECTED_GAME_PLACEHOLDER_ART_URL}
        fallbackOverviewArtUrl={SELECTED_GAME_PLACEHOLDER_OVERVIEW_URL}
        renderActiveVisualContent={renderSelectedGameVisualContent}
        resolveVisualRefUrl={resolveSelectedGameVisualRefUrl}
        showDesignerControls={false}
        onActiveTabChange={setSelectedGameActiveTab}
        onViewLobbies={() => undefined}
      />
    </main>
  ) : (
    <GenericPageLayoutContent document={pageLayoutData ?? {}} debugBounds={pageLayoutBoundsOverlay} />
  )

  const tabs: { id: AssetCatalogTab; label: string; count?: number }[] = isPageLayoutMode
    ? []
    : [
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

  const handleOpenSelectedGameLayoutControls = () => {
    void createPanelWindow(
      'selected-game-layout-controls',
      'Resources/Pages/SelectedGameLayout.asset',
      'Selected Game Layout Controls',
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
        {isPageLayoutMode && isHomePageLayout && (
          <button
            type="button"
            className="asset-catalog-preview__edit-featured-button"
            onClick={handleOpenHomepageLayoutControls}
          >
            Edit
          </button>
        )}
        {isPageLayoutMode && isHomePageLayout && (
          <label className="asset-catalog-preview__bounds-toggle">
            <input
              type="checkbox"
              checked={homepageLayoutControls.contentBoundsOverlay}
              onChange={event => setHomepageLayoutControls(prev => ({
                ...prev,
                contentBoundsOverlay: event.target.checked,
              }))}
            />
            Home Bounds
          </label>
        )}
        {isSelectedGameLayout && (
          <button
            type="button"
            className="asset-catalog-preview__edit-featured-button"
            onClick={handleOpenSelectedGameLayoutControls}
          >
            Edit
          </button>
        )}
        {isSelectedGameLayout && (
          <label className="asset-catalog-preview__bounds-toggle">
            <input
              type="checkbox"
              checked={selectedGameDebugBounds}
              onChange={event => setSelectedGameDebugBounds(event.target.checked)}
            />
            Bounds
          </label>
        )}
        {isPageLayoutMode && !isHomePageLayout && !isSelectedGameLayout && (
          <label className="asset-catalog-preview__bounds-toggle">
            <input
              type="checkbox"
              checked={pageLayoutBoundsOverlay}
              onChange={event => setPageLayoutBoundsOverlay(event.target.checked)}
            />
            Page Bounds
          </label>
        )}
      </div>
      {isSelectedGameLayout && (
        <div className="asset-catalog-preview__games-mode">
          <label htmlFor="asset-catalog-selected-game-sample">Sample</label>
          <select
            id="asset-catalog-selected-game-sample"
            value={selectedGameId ?? ''}
            onChange={e => {
              const nextGameId = e.target.value || null
              setSelectedGameId(nextGameId)
              setSelectedGamePreviewSampleGameId(nextGameId ?? '')
            }}
            aria-label="Selected game preview sample"
          >
            <option value="">Template placeholders</option>
            {selectedGameSampleOptions.map(game => (
              <option key={game.id} value={game.id}>
                {game.label}
              </option>
            ))}
          </select>
        </div>
      )}
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
                ? isPageLayoutMode
                  ? `pages/${pageLayoutData?.pageId ?? 'home'}.layout.json`
                  : 'index/home.json'
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
      <div className="preview-panel__content preview-panel__content--preview asset-catalog-preview__viewport-region">
        <div className="asset-catalog-preview">
          {activeTab === 'homepage' && (
            <div className="asset-catalog-preview__tab-content asset-catalog-preview__homepage-layout">
              {isHomePageLayout ? (
                <AssetCatalogMainAppPreviewShell
                  routePath={pageLayoutData?.routePath ?? '/'}
                  headerConfigOverride={headerConfigOverride}
                >
                  <div className="home-work-math">
                    <HomePageShowcaseContent
                      contentRef={homepageContentFrameRef}
                      imageLoaders={ImageLoaders}
                      contentClassName={`asset-catalog-preview__homepage-content-frame ${
                        homepageLayoutControls.contentBoundsOverlay
                          ? 'asset-catalog-preview__homepage-content-frame--bounds'
                          : ''
                      }`}
                      sectionClassName="asset-catalog-preview__homepage-section"
                      aboutSectionClassName="asset-catalog-preview__homepage-feature-banner"
                      featuredSectionClassName="asset-catalog-preview__homepage-featured"
                      comingSoonSectionClassName="asset-catalog-preview__homepage-coming-soon"
                      featureBannerItems={homepageData.featureBannerItems}
                      featured={homepageData.featured}
                      recommended={homepageData.recommended ?? []}
                      comingSoon={homepageData.comingSoon}
                      catalogMontageItems={homepageData.catalogMontageImages ?? []}
                      availableNow={homepageData.availableNow}
                      explorerGames={explorerGames}
                      isFeaturedLoading={isLoadingHomepageCatalog}
                      isComingSoonLoading={
                        isLoadingHomepageCatalog ||
                        isLoadingHomepageComingSoon ||
                        isLoadingHomepageFeatureBanner
                      }
                      resolveImageUrl={resolveImageUrl}
                      aboutControls={aboutShowcaseControls}
                      featuredControls={featuredShowcaseControls}
                      comingSoonControls={comingSoonShowcaseControls}
                      previewLayoutMode={syncedHomepagePreviewLayoutMode}
                      onLearnMore={handleGameClick}
                      onGameClick={handleGameClick}
                      onExploreClick={() => handleTabChange('games')}
                      showExploreTile
                      allowDebugBounds
                    />
                  </div>
                </AssetCatalogMainAppPreviewShell>
              ) : (
                <PageLayoutMainAppPreview
                  document={pageLayoutData ?? {}}
                  headerConfigOverride={headerConfigOverride}
                  gamesExplorerContent={gamesExplorerPreviewContent}
                  selectedGameContent={selectedGamePagePreviewContent}
                  debugBounds={pageLayoutBoundsOverlay}
                />
              )}
            </div>
          )}

          {activeTab === 'games' && (
            gamesExplorerPreviewContent
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
