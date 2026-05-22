import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
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
  withSelectedGameActions,
} from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation'
import {
  HomePageGamesDocumentSchema,
  type HomepageLayoutControlsData,
  type HomePageGamesDocument,
} from '@ocentra/game-asset-domain/schemas/home-page-games-schema'
import { MemoryRouter } from 'react-router-dom'
import type { ExploreGameSummary } from '@ocentra/core-ui/Common/types/ExploreGameSummary'
import type {
  CategoryWithSubs,
  GamesExplorerGame,
  GamesExplorerGameDetail,
  PlayerModeFilter,
  QualityFilter,
  SortBy,
  ViewMode as GamesExplorerViewMode,
} from '@ocentra/core-ui/GamesExplorer/types'
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
import { GamesCatalogSvgShowcase } from '@ocentra/core-ui/GamesExplorer/GamesCatalogSvgShowcase'
import {
  DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS,
  type GamesCatalogSvgLayoutControls,
} from '@ocentra/core-ui/GamesExplorer/GamesCatalogSvgShowcaseControls'
import {
  normalizeLobbyPageSvgControls,
  type LobbyPageSvgControls,
} from '@ocentra/core-ui/AppPages/Lobby/LobbyPageSvgSurfaceControls'
import {
  normalizeLeaderboardPageSvgControls,
  type LeaderboardPageSvgControls,
} from '@ocentra/core-ui/AppPages/Leaderboard/LeaderboardPageSvgSurfaceControls'
import {
  CyberAuthSurface,
  normalizeAuthPageSvgControls,
  type AuthPageSvgControls,
} from '@ocentra/core-ui/Auth/CyberAuthSurface'
import {
  normalizeShopPageSvgControls,
  type ShopPageSvgControls,
} from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgSurfaceControls'
import {
  normalizeShopPageContent,
  type ShopPageContentData,
} from '@ocentra/core-ui/AppPages/Shop/ShopPageSvgContent'
import {
  AdminUsersPageContent,
  CompetitionPageContent,
  LobbyPageContent,
  MatchmakingPageContent,
  PlayerHubPageContent,
  SettingsPageContent,
  SettingsPageToolbar,
  ShopPageContent,
  SocialWorldPageContent,
  type AdminActivityRow,
  type AdminUserRow,
  type LeaderboardRow,
  type LobbyHeroMedia,
  type ShopProduct,
  type ShopTab,
} from '@ocentra/core-ui/AppPages/MainAppPageSurfaces'
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter'
import {
  createOcentraHeaderLogoConfig,
  createShopMarketplaceHeaderLogoConfig,
} from '@ocentra/core-ui/Header/createOcentraHeaderConfig'
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader'
import type {
  SerializedUnifiedHeaderConfig,
  UnifiedHeaderConfigInput,
} from '@ocentra/core-ui/Header/UnifiedHeader.config'
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell'
import { mlogoImageUrl } from '@ocentra/app-assets/commons'
import { shopPageMarketplaceLogoImageUrl } from '@ocentra/app-assets/shop-page'
import {
  authAnnonImageUrl,
  authFacebookImageUrl,
  authGoogleImageUrl,
} from '@ocentra/app-assets/auth'
import { avatarImageById } from '@ocentra/app-assets/avatars'
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
  GAMES_CATALOG_LAYOUT_CONTROLS_CHANNEL,
  type GamesCatalogLayoutControlsMessage,
} from '@/utils/gamesCatalogLayoutControlsChannel'
import {
  LOBBY_PAGE_LAYOUT_CONTROLS_CHANNEL,
  type LobbyPageLayoutControlsMessage,
} from '@/utils/lobbyPageLayoutControlsChannel'
import { LOBBY_PAGE_LAYOUT_ASSET_PATH } from '@/utils/lobbyPageLayoutControlsPersistence'
import {
  LEADERBOARD_PAGE_LAYOUT_CONTROLS_CHANNEL,
  type LeaderboardPageLayoutControlsMessage,
} from '@/utils/leaderboardPageLayoutControlsChannel'
import { LEADERBOARD_PAGE_LAYOUT_ASSET_PATH } from '@/utils/leaderboardPageLayoutControlsPersistence'
import {
  AUTH_PAGE_LAYOUT_CONTROLS_CHANNEL,
  type AuthPageLayoutControlsMessage,
} from '@/utils/authPageLayoutControlsChannel'
import { AUTH_PAGE_LAYOUT_ASSET_PATH } from '@/utils/authPageLayoutControlsPersistence'
import {
  SHOP_PAGE_LAYOUT_CONTROLS_CHANNEL,
  type ShopPageLayoutControlsMessage,
} from '@/utils/shopPageLayoutControlsChannel'
import { SHOP_PAGE_LAYOUT_ASSET_PATH } from '@/utils/shopPageLayoutControlsPersistence'
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
  loadGamesCatalogLayoutControlsFromDisk,
  normalizeGamesCatalogLayoutControls,
} from '@/utils/gamesCatalogLayoutControlsPersistence'
import {
  SELECTED_GAME_LAYOUT_CONTROLS_CHANNEL,
  type SelectedGameLayoutControlsMessage,
  type SelectedGamePreviewLayoutMode,
} from '@/utils/selectedGameLayoutControlsChannel'
import {
  SELECTED_GAME_LAYOUT_ASSET_PATH,
  normalizeSelectedGameLayoutConfig,
} from '@/utils/selectedGameLayoutPersistence'
import {
  readStoredLayoutEditorCameraState,
  writeStoredLayoutEditorCameraState,
  type LayoutEditorCanvasCameraState,
} from '@/utils/layoutEditorPreferences'
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
    startup: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.startup, ...controls.startup },
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
  source?: 'asset' | 'catalog'
  playerMode?: string | null
  alsoKnownAs?: string[]
  origin?: string
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
const SHOP_MARKETPLACE_HEADER_CONFIG = createShopMarketplaceHeaderLogoConfig(shopPageMarketplaceLogoImageUrl)
const SELECTED_GAME_PLACEHOLDER_ART_URL = '/Resources/AppAssets/PlaceHolders/image0.jpg'
const SELECTED_GAME_PLACEHOLDER_OVERVIEW_URL = '/Resources/AppAssets/PlaceHolders/image1.jpg'
const GAME_CATALOG_INDEX_PATHS = [
  'Resources/GameCatalog/index.json',
  'Resources/catalog/index.json',
] as const

type LocalGameCatalogEntry = {
  slug: string
  name: string
  quality?: string
  completeness?: Record<string, boolean>
  description?: string
  players?: string
  deck?: string
  difficulty?: string
  duration?: string
  origin?: string
  category?: string
  subcategory?: string | null
  playerMode?: string | null
  alsoKnownAs?: string[]
  tags?: string[]
}

function asStringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value
    .map(item => asStringValue(item))
    .filter((item): item is string => Boolean(item))
  return items.length ? items : undefined
}

function asNumberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function resolvePreviewImageHashUrl(
  value: unknown,
  resolveImageUrl: (hash: ImageHash) => string | null
): string | null {
  if (typeof value !== 'string' || !isImageHash(value)) {
    return null
  }
  return resolveImageUrl(value)
}

function buildLobbyHeroMediaFromBundle(
  selectedGame: GameWithMetadata | null,
  bundle: SelectedGamePreviewBundle,
  resolveImageUrl: (hash: ImageHash) => string | null
): LobbyHeroMedia {
  const gameMode = dataOfPreview(bundle.gameMode)
  const gameInfo = dataOfPreview(bundle.gameInfo)
  const images = dataOfPreview(bundle.images)
  const hero = asPreviewRecord(gameInfo.hero)
  const titleText =
    asStringValue(hero.title) ??
    asStringValue(gameMode.displayName) ??
    selectedGame?.home.name ??
    selectedGame?.entry.displayName ??
    'Template'
  const tagline =
    asStringValue(gameInfo.tagline) ??
    asStringValue(hero.subtitle) ??
    selectedGame?.home.tagline ??
    selectedGame?.home.shortDescription ??
    'Create or join tables before a match starts.'
  const slides: NonNullable<LobbyHeroMedia['slides']> = []
  for (const [index, slide] of (Array.isArray(images.slides) ? images.slides : []).entries()) {
    const slideRecord = asPreviewRecord(slide)
    const imageUrl = resolvePreviewImageHashUrl(slideRecord.imageHash, resolveImageUrl)
    if (imageUrl) {
      slides.push({
        id: asStringValue(slideRecord.id) ?? `slide-${index + 1}`,
        imageUrl,
        alt: asStringValue(slideRecord.alt) ?? `${titleText} lobby slide ${index + 1}`,
      })
    }
  }
  const logoUrl =
    resolvePreviewImageHashUrl(images.logoImageHash, resolveImageUrl) ??
    resolvePreviewImageHashUrl(gameInfo.gameIconImage, resolveImageUrl)
  return {
    slides,
    logoUrl,
    logoAlt: `${titleText} logo`,
    titleText,
    tagline,
    overlayTintColor: asStringValue(images.overlayTintColor),
    overlayTintOpacity: asNumberValue(images.overlayTintOpacity),
  }
}

function buildLobbyPlayerBoundsFromBundle(
  selectedGame: GameWithMetadata | null,
  bundle: SelectedGamePreviewBundle
): { minPlayers?: number; maxPlayers?: number } {
  const gameMode = dataOfPreview(bundle.gameMode)
  const gameInfo = dataOfPreview(bundle.gameInfo)
  const rules = dataOfPreview(bundle.rules)
  const mechanicsPlayerCount = asPreviewRecord(asPreviewRecord(gameInfo.mechanicsContract).playerCount)
  const rulesPlayerCount = asPreviewRecord(rules.playerCount)
  return {
    minPlayers:
      asNumberValue(gameMode.minPlayers) ??
      asNumberValue(gameInfo.minPlayers) ??
      asNumberValue(mechanicsPlayerCount.min) ??
      asNumberValue(rulesPlayerCount.min) ??
      selectedGame?.home.minPlayers,
    maxPlayers:
      asNumberValue(gameMode.maxPlayers) ??
      asNumberValue(gameInfo.maxPlayers) ??
      asNumberValue(mechanicsPlayerCount.max) ??
      asNumberValue(rulesPlayerCount.max) ??
      selectedGame?.home.maxPlayers,
  }
}

function normalizePlayerMode(value: unknown): PlayerModeFilter | null {
  const normalized = asStringValue(value)?.toLowerCase().replace(/[\s_-]+/g, '')
  if (normalized === 'singleplayer' || normalized === 'solo') return 'singleplayer'
  if (normalized === 'multiplayer' || normalized === 'multi') return 'multiplayer'
  return null
}

function asBooleanRecord(value: unknown): Record<string, boolean> | undefined {
  const record = asPreviewRecord(value)
  const entries = Object.entries(record)
    .filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')
  return entries.length ? Object.fromEntries(entries) : undefined
}

function slugFromCatalogValue(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function toCatalogIndexEntries(raw: unknown): LocalGameCatalogEntry[] {
  const rawGames = asPreviewRecord(raw).games
  if (!Array.isArray(rawGames)) return []
  return rawGames.flatMap(item => {
    const record = asPreviewRecord(item)
    const name = asStringValue(record.name) ?? asStringValue(record.displayName)
    const slug = asStringValue(record.slug) ?? asStringValue(record.gameId) ?? (name ? slugFromCatalogValue(name) : undefined)
    if (!name || !slug) return []
    return [{
      slug,
      name,
      quality: asStringValue(record.quality),
      completeness: asBooleanRecord(record.completeness),
      description: asStringValue(record.description) ?? asStringValue(record.shortDescription),
      players: asStringValue(record.players) ?? asStringValue(record.playersDisplay),
      deck: asStringValue(record.deck),
      difficulty: asStringValue(record.difficulty),
      duration: asStringValue(record.duration),
      origin: asStringValue(record.origin),
      category: asStringValue(record.category) ?? asStringValue(record.gameCategory),
      subcategory: record.subcategory === null ? null : asStringValue(record.subcategory),
      playerMode: record.playerMode === null ? null : normalizePlayerMode(record.playerMode),
      alsoKnownAs: asStringArray(record.alsoKnownAs),
      tags: asStringArray(record.tags),
    }]
  })
}

async function loadGameCatalogIndexFromResources(): Promise<LocalGameCatalogEntry[]> {
  for (const path of GAME_CATALOG_INDEX_PATHS) {
    const document = await loadPreviewAssetDocument(path)
    const entries = toCatalogIndexEntries(document)
    if (entries.length) return entries
  }
  return []
}

function firstInfoParagraph(infoData: LooseRecord): string | undefined {
  const sections = Array.isArray(infoData.sections) ? infoData.sections : []
  for (const section of sections) {
    const pages = Array.isArray(asPreviewRecord(section).pages)
      ? asPreviewRecord(section).pages as unknown[]
      : []
    for (const page of pages) {
      const content = Array.isArray(asPreviewRecord(page).content)
        ? asPreviewRecord(page).content as unknown[]
        : []
      for (const block of content) {
        const blockRecord = asPreviewRecord(block)
        if (blockRecord.type === 'paragraph') {
          const text = asStringValue(blockRecord.text)
          if (text) return text
        }
      }
    }
  }
  return undefined
}

function fallbackCompletenessFromInfo(infoData: LooseRecord): Record<string, boolean> | undefined {
  const explicit = asBooleanRecord(infoData.completeness)
  if (explicit) return explicit
  const sectionTypes = new Set(
    (Array.isArray(infoData.sections) ? infoData.sections : [])
      .map(section => asStringValue(asPreviewRecord(section).type))
      .filter((item): item is string => Boolean(item))
  )
  if (!sectionTypes.size && !Object.keys(infoData).length) return undefined
  return {
    overview: sectionTypes.has('about') || Boolean(infoData.hero),
    history: Boolean(infoData.historyContent) || Boolean(asStringValue(infoData.origin)),
    setup: sectionTypes.has('rules'),
    rules: sectionTypes.has('rules'),
    strategy: sectionTypes.has('strategy'),
    variations: Boolean(infoData.variationsContent) || Boolean(asStringArray(infoData.alsoKnownAs)?.length),
    ai: Boolean(infoData.aiContent),
    sources: Boolean(infoData.sourcesContent),
  }
}

function compactDetailText(parts: Array<string | undefined>): string | undefined {
  const text = parts
    .map(part => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join('\n\n')
  return text || undefined
}

function previewListItemText(value: unknown): string {
  const record = asPreviewRecord(value)
  const name = asStringValue(record.name) ?? asStringValue(record.title) ?? asStringValue(record.label)
  const description =
    asStringValue(record.description) ??
    asStringValue(record.body) ??
    asStringValue(record.text) ??
    asStringValue(record.value)
  if (name && description) return `${name}: ${description}`
  if (name) return name
  if (description) return description
  return previewValueText(value)
}

function previewValueText(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value
      .map(item => previewListItemText(item))
      .filter(Boolean)
      .map(item => `- ${item}`)
      .join('\n')
  }
  const record = asPreviewRecord(value)
  const direct =
    asStringValue(record.text) ??
    asStringValue(record.description) ??
    asStringValue(record.body) ??
    asStringValue(record.value)
  if (direct) return direct
  if (Array.isArray(record.content)) {
    return record.content.map(previewBlockText).filter(Boolean).join('\n')
  }
  if (Array.isArray(record.items)) {
    return record.items.map(item => `- ${previewListItemText(item)}`).filter(Boolean).join('\n')
  }
  return Object.entries(record)
    .filter(([key, entryValue]) =>
      !['id', 'type', 'kind', 'style', 'level', 'overrides'].includes(key) &&
      entryValue !== null &&
      entryValue !== undefined &&
      entryValue !== ''
    )
    .map(([key, entryValue]) => {
      const rendered = previewValueText(entryValue)
      return rendered ? `${key}: ${rendered}` : ''
    })
    .filter(Boolean)
    .join('\n')
}

function previewBlockText(value: unknown): string {
  const record = asPreviewRecord(value)
  const direct = asStringValue(record.text) ?? asStringValue(record.description)
  if (direct) return direct
  if (Array.isArray(record.content)) {
    return record.content.map(previewBlockText).filter(Boolean).join('\n')
  }
  if (Array.isArray(record.items)) {
    return record.items.map(item => `- ${previewListItemText(item)}`).filter(Boolean).join('\n')
  }
  return ''
}

function gameInfoSectionText(infoData: LooseRecord): Record<string, string> {
  const result: Record<string, string> = {}
  const sections = Array.isArray(infoData.sections) ? infoData.sections : []
  for (const section of sections) {
    const sectionRecord = asPreviewRecord(section)
    const type = asStringValue(sectionRecord.type)
    if (!type) continue
    const pages = Array.isArray(sectionRecord.pages) ? sectionRecord.pages : []
    const pageText = pages
      .map(page => {
        const pageRecord = asPreviewRecord(page)
        const content = Array.isArray(pageRecord.content) ? pageRecord.content : []
        return content.map(previewBlockText).filter(Boolean).join('\n')
      })
      .filter(Boolean)
      .join('\n\n')
    if (pageText) result[type] = pageText
  }
  return result
}

function enrichGameMetadataFromBundle(
  item: GameWithMetadata,
  bundle: SelectedGamePreviewBundle
): GameWithMetadata {
  const infoData = dataOfPreview(bundle.gameInfo)
  const gameData = dataOfPreview(bundle.gameMode)
  const setupContent = asPreviewRecord(infoData.setupContent)
  const mechanicsContract = asPreviewRecord(infoData.mechanicsContract)
  const playerCount = asPreviewRecord(mechanicsContract.playerCount)
  const deckModelData = dataOfPreview(bundle.deckModel)
  const hero = asPreviewRecord(infoData.hero)
  const home = item.home
  const minPlayers =
    asNumberValue(infoData.minPlayers) ??
    asNumberValue(gameData.minPlayers) ??
    asNumberValue(playerCount.min) ??
    home.minPlayers
  const maxPlayers =
    asNumberValue(infoData.maxPlayers) ??
    asNumberValue(gameData.maxPlayers) ??
    asNumberValue(playerCount.max) ??
    home.maxPlayers
  const playersDisplay =
    asStringValue(infoData.playersDisplay) ??
    home.playersDisplay ??
    (minPlayers != null && maxPlayers != null ? `${minPlayers}-${maxPlayers}` : undefined)

  return {
    ...item,
    home: {
      ...home,
      gameId: home.gameId,
      guid: home.guid,
      name:
        asStringValue(hero.title) ??
        asStringValue(infoData.originName) ??
        home.name ??
        item.entry.displayName ??
        gameMetadataId(item),
      tags: asStringArray(infoData.tags) ?? home.tags,
      tagline: asStringValue(infoData.tagline) ?? asStringValue(hero.subtitle) ?? home.tagline,
      shortDescription:
        firstInfoParagraph(infoData) ??
        asStringValue(infoData.Player) ??
        asStringValue(infoData.description) ??
        home.shortDescription,
      description: asStringValue(infoData.description) ?? home.description,
      minPlayers,
      maxPlayers,
      playersDisplay,
      gameCategory: asStringValue(infoData.gameCategory) ?? home.gameCategory,
      subcategory: infoData.subcategory === null ? null : asStringValue(infoData.subcategory) ?? home.subcategory,
      difficulty: asStringValue(infoData.difficulty) ?? home.difficulty,
      duration: asStringValue(infoData.duration) ?? home.duration,
      deck:
        asStringValue(infoData.deck) ??
        asStringValue(setupContent.deck) ??
        asStringValue(deckModelData.deckType) ??
        asStringValue(asPreviewRecord(gameData.deckAsset).displayName) ??
        home.deck,
      quality: asStringValue(infoData.quality) ?? home.quality ?? 'complete',
      completeness: asBooleanRecord(infoData.completeness) ?? home.completeness ?? fallbackCompletenessFromInfo(infoData),
      bannerImage: asStringValue(gameData.bannerImage) ?? home.bannerImage,
      gameIcon: asStringValue(gameData.gameIcon) ?? home.gameIcon,
    },
    playerMode: normalizePlayerMode(infoData.playerMode) ?? item.playerMode,
    alsoKnownAs: asStringArray(infoData.alsoKnownAs) ?? item.alsoKnownAs,
    origin: asStringValue(infoData.origin) ?? item.origin,
  }
}

function buildAssetGameDetail(
  item: GameWithMetadata,
  bundle: SelectedGamePreviewBundle
): GamesExplorerGameDetail {
  const enriched = enrichGameMetadataFromBundle(item, bundle)
  const infoData = dataOfPreview(bundle.gameInfo)
  const sectionText = gameInfoSectionText(infoData)
  const rulesData = dataOfPreview(bundle.rules)
  const strategyData = dataOfPreview(bundle.strategy)
  const scoringData = dataOfPreview(bundle.scoring)
  const home = enriched.home
  const overviewDescription =
    asStringValue(infoData.description) ??
    sectionText.about ??
    home.description ??
    home.shortDescription

  return {
    filename: item.path,
    name: home.name,
    guid: item.entry.guid,
    quality: home.quality,
    source: 'asset',
    completeness: home.completeness ?? undefined,
    overview: {
      description: overviewDescription,
      type: home.subcategory ? `${home.gameCategory} / ${home.subcategory}` : home.gameCategory,
      origin: asStringValue(infoData.origin),
      players: home.playersDisplay,
      deck: home.deck,
      difficulty: home.difficulty,
      duration: home.duration,
    },
    history: infoData.historyContent ?? sectionText.history,
    setup: infoData.setupContent ?? sectionText.rules,
    rules: compactDetailText([
      sectionText.rules,
      previewValueText(rulesData.rules),
      previewValueText(rulesData.ruleGroups),
      previewValueText(scoringData.description),
    ]),
    strategy: compactDetailText([
      sectionText.strategy,
      previewValueText(strategyData.tips),
      previewValueText(strategyData.strategy),
    ]),
    variations: infoData.variationsContent,
    ai: infoData.aiContent,
    sources: infoData.sourcesContent,
    cursorFind: {
      alsoKnownAs: asStringArray(infoData.alsoKnownAs) ?? item.alsoKnownAs ?? [],
    },
  }
}

function buildCatalogGameDetail(
  item: GameWithMetadata,
  catalogData: LooseRecord
): GamesExplorerGameDetail {
  const home = item.home
  const overview = asPreviewRecord(catalogData.overview)
  return {
    filename: item.path,
    name: asStringValue(catalogData.name) ?? home.name,
    guid: item.entry.guid,
    quality: asStringValue(catalogData.quality) ?? home.quality,
    source: 'catalog',
    completeness: asBooleanRecord(catalogData.completeness) ?? home.completeness ?? undefined,
    overview: {
      description: asStringValue(overview.description) ?? asStringValue(catalogData.description) ?? home.shortDescription,
      type: asStringValue(catalogData.subcategory)
        ? `${asStringValue(catalogData.category) ?? home.gameCategory} / ${asStringValue(catalogData.subcategory)}`
        : asStringValue(catalogData.category) ?? home.gameCategory,
      origin: asStringValue(overview.origin) ?? asStringValue(catalogData.origin),
      players: asStringValue(overview.players) ?? asStringValue(catalogData.players) ?? home.playersDisplay,
      deck: asStringValue(overview.deck) ?? asStringValue(catalogData.deck) ?? home.deck,
      difficulty: asStringValue(overview.difficulty) ?? asStringValue(catalogData.difficulty) ?? home.difficulty,
      duration: asStringValue(overview.duration) ?? asStringValue(catalogData.duration) ?? home.duration,
    },
    history: catalogData.history,
    setup: catalogData.setup,
    rules: catalogData.rules,
    strategy: catalogData.strategy,
    variations: catalogData.variations,
    sources: catalogData.sources,
    cursorFind: {
      alsoKnownAs: asStringArray(catalogData.alsoKnownAs) ?? item.alsoKnownAs ?? [],
    },
  }
}

async function loadCatalogGameDetailData(item: GameWithMetadata): Promise<LooseRecord> {
  const path = item.path.replace(/\\/g, '/')
  const fallbackPath = `Resources/catalog/games/${slugFromCatalogValue(gameMetadataId(item))}.json`
  const document =
    await loadPreviewAssetDocument(path) ??
    await loadPreviewAssetDocument(fallbackPath)
  return dataOfPreview(document)
}

async function enrichAssetGamesFromPreviewAssets(items: GameWithMetadata[]): Promise<GameWithMetadata[]> {
  return Promise.all(items.map(async item => {
    if (isCatalogGameItem(item)) return item
    const bundle = await loadSelectedGamePreviewBundle(item.path)
    return enrichGameMetadataFromBundle(item, bundle)
  }))
}

async function buildFallbackGameMetadataFromEntry(
  entry: AssetResourceEntry<GameMode>
): Promise<GameWithMetadata | null> {
  const path = typeof entry.path === 'string' ? entry.path : ''
  if (!path) return null
  const document = await loadPreviewAssetDocument(path)
  if (!document) return null
  const system = asPreviewRecord(document.system)
  const data = dataOfPreview(document)
  const infoDocument = await loadPreviewAssetDocument(pathFromPreviewRef(data.gameInfoAsset))
  const infoData = dataOfPreview(infoDocument)
  const gameId = asStringValue(system.gameId) ?? asStringValue(data.gameId) ?? entry.gameId ?? extractGameIdFromPath(path)
  const guid = asStringValue(system.guid) ?? entry.guid
  const name = asStringValue(system.displayName) ?? asStringValue(data.displayName) ?? entry.displayName ?? gameId
  if (!gameId || !guid || !name) return null
  entry.gameId = gameId as never
  const minPlayers = asNumberValue(data.minPlayers) ?? asNumberValue(infoData.minPlayers)
  const maxPlayers = asNumberValue(data.maxPlayers) ?? asNumberValue(infoData.maxPlayers)
  const home: GameHome = {
    gameId,
    guid,
    name,
    enabled: true,
    releaseStatus: toReleaseStatus(asStringValue(data.releaseStatus)),
    tags: asStringArray(infoData.tags),
    bannerImage: asStringValue(data.bannerImage),
    gameIcon: asStringValue(data.gameIcon),
    tagline: asStringValue(asPreviewRecord(infoData.hero).subtitle),
    shortDescription: firstInfoParagraph(infoData),
    minPlayers,
    maxPlayers,
    playersDisplay: asStringValue(infoData.playersDisplay) ??
      (minPlayers != null && maxPlayers != null ? `${minPlayers}-${maxPlayers}` : undefined),
    gameCategory: asStringValue(infoData.gameCategory) ?? 'CardGames',
    subcategory: infoData.subcategory === null ? null : asStringValue(infoData.subcategory),
    difficulty: asStringValue(infoData.difficulty),
    duration: asStringValue(infoData.duration),
    deck: asStringValue(infoData.deck) ?? asStringValue(asPreviewRecord(data.deckAsset).displayName),
    quality: asStringValue(infoData.quality) ?? 'complete',
    completeness: fallbackCompletenessFromInfo(infoData),
  }
  return {
    home,
    path,
    entry,
    source: 'asset',
    playerMode: normalizePlayerMode(infoData.playerMode),
    alsoKnownAs: asStringArray(infoData.alsoKnownAs),
  }
}

async function appendMissingGameMetadata(
  loaded: GameWithMetadata[],
  entries: AssetResourceEntry<GameMode>[]
): Promise<GameWithMetadata[]> {
  const ids = new Set(loaded.map(item => slugFromCatalogValue(gameMetadataId(item))))
  const missing = entries.filter(entry => {
    const id = entry.gameId ?? extractGameIdFromPath(typeof entry.path === 'string' ? entry.path : '')
    return id ? !ids.has(slugFromCatalogValue(id)) : false
  })
  if (!missing.length) return loaded
  const fallback = await Promise.all(missing.map(buildFallbackGameMetadataFromEntry))
  return [
    ...loaded.map(item => ({ ...item, source: item.source ?? 'asset' as const })),
    ...fallback.filter((item): item is GameWithMetadata => item !== null),
  ]
}

function gameMetadataId(item: GameWithMetadata): string {
  return item.home.gameId ?? item.entry.gameId ?? extractGameIdFromPath(item.path) ?? item.home.name ?? item.entry.displayName ?? item.path
}

function isCatalogGameItem(item: GameWithMetadata): boolean {
  if (item.source === 'catalog') return true
  const path = item.path.replace(/\\/g, '/')
  return path.includes('/GameCatalog/') || path.includes('/catalog/')
}

function gamePlayerMode(item: GameWithMetadata): PlayerModeFilter | null {
  const explicit = normalizePlayerMode(item.playerMode)
  if (explicit) return explicit
  const minPlayers = item.home.minPlayers
  const maxPlayers = item.home.maxPlayers
  if (maxPlayers != null && maxPlayers <= 1) return 'singleplayer'
  if (minPlayers != null || maxPlayers != null) return 'multiplayer'
  return null
}

function toCatalogGameMetadata(item: LocalGameCatalogEntry): GameWithMetadata {
  const guid = `catalog:${item.slug}`
  const entry = new AssetResourceEntryClass<GameMode>('CatalogGame' as never, guid as never)
  entry.displayName = item.name
  entry.path = `Resources/GameCatalog/games/${item.slug}.json`
  entry.gameId = item.slug as never
  const home: GameHome = {
    gameId: item.slug,
    guid,
    name: item.name,
    enabled: true,
    releaseStatus: 'ComingSoon',
    tags: item.tags,
    shortDescription: item.description,
    gameCategory: item.category ?? 'Other',
    subcategory: item.subcategory ?? null,
    difficulty: item.difficulty,
    duration: item.duration,
    deck: item.deck,
    playersDisplay: item.players,
    quality: item.quality,
    completeness: item.completeness,
  }
  return {
    home,
    path: entry.path,
    entry,
    source: 'catalog',
    playerMode: item.playerMode ?? null,
    alsoKnownAs: item.alsoKnownAs,
    origin: item.origin,
  }
}

function mergeGameCatalogWithAssets(
  assetGames: GameWithMetadata[],
  catalogEntries: LocalGameCatalogEntry[]
): GameWithMetadata[] {
  if (!catalogEntries.length) return assetGames
  const assetIds = new Set(
    assetGames.map(item => slugFromCatalogValue(gameMetadataId(item))).filter(Boolean)
  )
  const catalogGames = catalogEntries
    .filter(item => !assetIds.has(slugFromCatalogValue(item.slug)))
    .map(toCatalogGameMetadata)
  return [...assetGames.map(item => ({ ...item, source: item.source ?? 'asset' as const })), ...catalogGames]
}

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
  showBackground = true,
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
  showBackground?: boolean
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
            background={showBackground ? <DynamicBackground controlRef={rotationControlRef} /> : null}
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
  assetPath?: string
  assetData: { system?: unknown; data?: unknown; metadata?: unknown }
  viewMode: ViewMode
  setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>
  navigationHistory: Array<{ path: string; name: string }>
  onBack?: () => void
  onNavigateToAsset?: (identifier: AssetIdentifier) => void
  mode?: 'catalog' | 'pageLayout'
}

type PageLayoutPreviewData = Partial<PageLayoutDocument> & {
  leaderboardControls?: Partial<LeaderboardPageSvgControls> | null
}
type ShopPageLayoutContentSource = {
  shopContent?: Partial<ShopPageContentData> | null
}

type PagePreviewResolutionOption = {
  label: string
  value: string
  disabled?: boolean
}

type PagePreviewViewportSize = {
  w: number
  h: number
}

type PageLayoutViewportFrameHandle = {
  fitCamera: () => void
  actualSizeCamera: () => void
  zoomOut: () => void
  zoomIn: () => void
}

const PAGE_PREVIEW_DEFAULT_VIEWPORT: PagePreviewViewportSize = { w: 1440, h: 900 }
const PAGE_PREVIEW_FALLBACK_RESOLUTIONS: PagePreviewResolutionOption[] = [
  { label: 'Fit Window', value: 'fit' },
  { label: 'Desktop Full HD (1920x1080)', value: '1920x1080' },
  { label: 'Laptop 1440x900', value: '1440x900' },
  { label: 'iPad Pro 11 (1194x834)', value: '1194x834' },
  { label: 'iPhone 14 / 13 / 12 (844x390)', value: '844x390' },
  { label: 'Custom...', value: 'custom' },
]
const PAGE_PREVIEW_MIN_CAMERA_ZOOM = 0.25
const PAGE_PREVIEW_MAX_CAMERA_ZOOM = 8
const PAGE_PREVIEW_CAMERA_STEP_FACTOR = 1.15
const PAGE_PREVIEW_CANVAS_PADDING = 40

function clampPreviewNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function readShopPageLayoutContent(
  document: PageLayoutPreviewData | null | undefined
): Partial<ShopPageContentData> | null | undefined {
  return (document as ShopPageLayoutContentSource | null | undefined)?.shopContent
}

function createDefaultPagePreviewCameraState(): LayoutEditorCanvasCameraState {
  return {
    zoom: 1,
    panX: 0,
    panY: 0,
  }
}

function getPagePreviewViewportSignature(viewport: PagePreviewViewportSize): string {
  return `${Math.round(viewport.w)}x${Math.round(viewport.h)}`
}

function getOrientedPagePreviewViewport(
  rawW: number,
  rawH: number,
  isPortrait: boolean
): PagePreviewViewportSize {
  let w = Number.isFinite(rawW) ? rawW : PAGE_PREVIEW_DEFAULT_VIEWPORT.w
  let h = Number.isFinite(rawH) ? rawH : PAGE_PREVIEW_DEFAULT_VIEWPORT.h
  if (isPortrait && w > h) {
    const nextW = h
    h = w
    w = nextW
  } else if (!isPortrait && h > w) {
    const nextW = h
    h = w
    w = nextW
  }
  return { w, h }
}

function resolvePagePreviewViewport(
  resolution: string,
  customWidth: number,
  customHeight: number,
  isPortrait: boolean
): PagePreviewViewportSize {
  let rawW = PAGE_PREVIEW_DEFAULT_VIEWPORT.w
  let rawH = PAGE_PREVIEW_DEFAULT_VIEWPORT.h
  if (resolution === 'custom') {
    rawW = customWidth
    rawH = customHeight
  } else if (resolution !== 'fit') {
    const matches = resolution.match(/(\d+)\D+(\d+)/)
    if (matches) {
      rawW = Number(matches[1])
      rawH = Number(matches[2])
    }
  }
  return getOrientedPagePreviewViewport(rawW, rawH, isPortrait)
}

function clampPagePreviewCameraState(
  state: LayoutEditorCanvasCameraState,
  viewport: PagePreviewViewportSize,
  fitScale: number,
  container: { width: number; height: number }
): LayoutEditorCanvasCameraState {
  const zoom = clampPreviewNumber(
    state.zoom,
    PAGE_PREVIEW_MIN_CAMERA_ZOOM,
    PAGE_PREVIEW_MAX_CAMERA_ZOOM
  )
  const effectiveScale = fitScale * zoom
  const contentWidth = viewport.w * effectiveScale
  const contentHeight = viewport.h * effectiveScale
  const clampAxis = (pan: number, containerSize: number, contentSize: number): number => {
    if (!Number.isFinite(containerSize) || containerSize <= 0) {
      return 0
    }
    const baseOffset = (containerSize - contentSize) * 0.5
    const minVisible = Math.min(
      Math.max(Math.min(containerSize * 0.12, 160), 64),
      Math.max(contentSize * 0.25, 24)
    )
    const overscroll = Math.min(
      Math.max(containerSize * 0.1, 48),
      Math.max(contentSize * 0.5, 48)
    )
    const minPan = minVisible - (baseOffset + contentSize) - overscroll
    const maxPan = containerSize - minVisible - baseOffset + overscroll
    return clampPreviewNumber(pan, minPan, maxPan)
  }
  return {
    zoom,
    panX: clampAxis(state.panX, container.width, contentWidth),
    panY: clampAxis(state.panY, container.height, contentHeight),
  }
}

function readPageLayoutData(assetData: { data?: unknown }): PageLayoutPreviewData {
  return assetData.data && typeof assetData.data === 'object'
    ? (assetData.data as PageLayoutPreviewData)
    : {}
}

function getPageLayoutKind(document: PageLayoutPreviewData): NonNullable<PageLayoutPreviewData['kind']> {
  if (document.kind) return document.kind
  if (document.pageId === 'leaderboard') return 'leaderboard'
  if (document.pageId === 'game-leaderboard') return 'game-leaderboard'
  if (document.pageId === 'ai-benchmark-leaderboard') return 'ai-benchmark-leaderboard'
  if (document.pageId === 'profile') return 'profile'
  if (document.pageId === 'player-hub') return 'player-hub'
  if (document.pageId === 'competition') return 'competition'
  if (document.pageId === 'tournaments') return 'tournaments'
  if (document.pageId === 'tournament-detail') return 'tournament-detail'
  if (document.pageId === 'selected-game') return 'selected-game'
  if (document.pageId === 'games') return 'games'
  if (document.pageId === 'game-catalog') return 'game-catalog'
  if (document.pageId === 'shop') return 'shop'
  if (document.pageId === 'social') return 'social'
  if (document.pageId === 'admin') return 'admin'
  if (document.pageId === 'settings') return 'settings'
  if (document.pageId === 'lobby') return 'lobby'
  if (document.pageId === 'auth') return 'auth'
  if (document.pageId === 'matchmaking') return 'matchmaking'
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
  if (kind === 'competition') {
    return { gameName: 'Competition', tagline: 'Competition hub for tournaments and leaderboard routes.' }
  }
  if (kind === 'tournaments') {
    return { gameName: 'Competition', tagline: 'Rank ladders, nearby standings, and tournament brackets.' }
  }
  if (kind === 'tournament-detail') {
    return { gameName: 'Tournament Detail', tagline: 'Bracket, registration, and event status.' }
  }
  if (kind === 'selected-game') {
    return { gameName: 'Selected Game', tagline: 'Asset-backed game detail presentation.' }
  }
  if (kind === 'leaderboard') {
    return { gameName: 'Leaderboard', tagline: 'Season ranks, nearby players, and competitive progress.' }
  }
  if (kind === 'game-leaderboard') {
    return { gameName: 'Game Leaderboard', tagline: 'Per-game ranks and nearby players.' }
  }
  if (kind === 'ai-benchmark-leaderboard') {
    return { gameName: 'AI Benchmarks', tagline: 'AI-vs-AI model standings and benchmark runs.' }
  }
  if (kind === 'profile' || kind === 'player-hub') {
    return { gameName: 'Player Hub', tagline: 'Profile, inventory, and marketplace in one control center.' }
  }
  if (kind === 'games' || kind === 'game-catalog') {
    return { gameName: 'Card Games Explorer', tagline: 'Finished card games in the catalog.' }
  }
  if (kind === 'admin') {
    return { gameName: 'Admin Dashboard', tagline: 'Control Center | Manage users and system tools' }
  }
  if (kind === 'settings') {
    return { gameName: 'Settings', tagline: 'Models, providers, native integrations, and asset delivery.' }
  }
  if (kind === 'lobby') {
    return { gameName: 'Lobby', tagline: 'Create or join rooms before a match starts.' }
  }
  if (kind === 'auth') {
    return { gameName: 'Authentication', tagline: 'Shared sign-in and sign-up prompt.' }
  }
  if (kind === 'matchmaking') {
    return { gameName: 'Matchmaking', tagline: 'Find players, queue up, and move into a lobby.' }
  }
  return { gameName: document.title || 'Page Layout', tagline: document.routePath || '/' }
}

const previewShopProducts: ShopProduct[] = [
  { productId: 'ac-100', productType: 'AC_CREDITS', displayName: 'Starter Credits', shopTab: 'Treasury', entitlementKind: 'credits', availability: 'live', acAmount: 100, unitPriceCents: 100, currency: 'usd', active: true },
  { productId: 'ac-500', productType: 'AC_CREDITS', displayName: 'Arena Credits', shopTab: 'Treasury', entitlementKind: 'credits', availability: 'live', acAmount: 500, unitPriceCents: 500, currency: 'usd', active: true },
  { productId: 'ac-1500', productType: 'AC_CREDITS', displayName: 'Best Value Credits', shopTab: 'Treasury', entitlementKind: 'credits', availability: 'live', acAmount: 1500, unitPriceCents: 999, currency: 'usd', active: true },
  { productId: 'ac-3000', productType: 'AC_CREDITS', displayName: 'Season Supply', shopTab: 'Treasury', entitlementKind: 'credits', availability: 'live', acAmount: 3000, unitPriceCents: 2499, currency: 'usd', active: true },
  { productId: 'sub-arena-pass', productType: 'SUBSCRIPTION', displayName: 'Arena Pass', shopTab: 'Elite', entitlementKind: 'pass', availability: 'preview', unitPriceCents: 999, currency: 'usd', active: true },
  { productId: 'sub-champions-pass', productType: 'SUBSCRIPTION', displayName: "Champion's Pass", shopTab: 'Elite', entitlementKind: 'pass', availability: 'preview', unitPriceCents: 1999, currency: 'usd', active: true },
  { productId: 'vault-card-back-neon', productType: 'MARKETPLACE', displayName: 'Neon Card Back', shopTab: 'Vault', entitlementKind: 'cosmetic', availability: 'preview', acPrice: 200, priceLabel: '200 AC', currency: 'usd', active: true },
  { productId: 'vault-table-classic', productType: 'MARKETPLACE', displayName: 'Classic Felt Table', shopTab: 'Vault', entitlementKind: 'cosmetic', availability: 'preview', acPrice: 100, priceLabel: '100 AC', currency: 'usd', active: true },
  { productId: 'access-private-tables', productType: 'MARKETPLACE', displayName: 'Private Table Hosting', shopTab: 'Play Access', entitlementKind: 'play_access', availability: 'preview', acPrice: 300, priceLabel: '300 AC', currency: 'usd', active: true },
  { productId: 'ticket-claim-weekly', productType: 'TOURNAMENT_ENTRY', displayName: 'Weekly Claim Ticket', shopTab: 'Events', entitlementKind: 'event_ticket', availability: 'coming_soon', acPrice: 250, priceLabel: '250 AC', currency: 'usd', active: true },
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
  lobbyControls,
  leaderboardControls,
  authControls,
  shopControls,
  shopContent,
  lobbySampleGameId = null,
  lobbySampleGameName = null,
  lobbyGameTagline = null,
  lobbyHeroMedia,
  lobbyMinPlayers,
  lobbyMaxPlayers,
  lobbyUseSampleData = true,
  debugBounds = false,
}: {
  document: PageLayoutPreviewData
  headerConfigOverride?: UnifiedHeaderConfigInput | null
  gamesExplorerContent?: React.ReactNode
  selectedGameContent?: React.ReactNode
  lobbyControls?: LobbyPageSvgControls
  leaderboardControls?: LeaderboardPageSvgControls
  authControls?: AuthPageSvgControls
  shopControls?: ShopPageSvgControls
  shopContent?: Partial<ShopPageContentData> | null
  lobbySampleGameId?: string | null
  lobbySampleGameName?: string | null
  lobbyGameTagline?: string | null
  lobbyHeroMedia?: LobbyHeroMedia
  lobbyMinPlayers?: number
  lobbyMaxPlayers?: number
  lobbyUseSampleData?: boolean
  debugBounds?: boolean
}) {
  const routePath = document.routePath || '/'
  const kind = getPageLayoutKind(document)
  const headerDynamicData =
    kind === 'shop'
      ? undefined
      : kind === 'lobby' && lobbySampleGameName
      ? { gameName: `${lobbySampleGameName} Lobby`, tagline: lobbyGameTagline ?? 'Create or join tables before a match starts.' }
      : getPageLayoutHeaderData(document)
  const resolvedHeaderConfigOverride = useMemo(
    () => kind === 'shop'
      ? mergeHeaderConfigInput(headerConfigOverride, SHOP_MARKETPLACE_HEADER_CONFIG)
      : headerConfigOverride,
    [headerConfigOverride, kind]
  )
  const [shopTab, setShopTab] = useState<ShopTab>('Treasury')
  const [settingsTab, setSettingsTab] = useState<'models' | 'inference' | 'providers' | 'native' | 'assets'>('models')
  const [adminSearch, setAdminSearch] = useState('')
  const [authPreviewMode, setAuthPreviewMode] = useState<'signin' | 'signup'>('signup')
  const [authPreviewAvatar, setAuthPreviewAvatar] = useState('')
  const [authPreviewShowAvatarSelector, setAuthPreviewShowAvatarSelector] = useState(false)
  const authAvatarSelectorRef = useRef<HTMLDivElement | null>(null)
  const authFileInputRef = useRef<HTMLInputElement | null>(null)
  const pageControls = document.pageControls
  const resolvedAuthControls = useMemo(
    () => normalizeAuthPageSvgControls(authControls ?? document.authControls as Partial<AuthPageSvgControls> | undefined),
    [authControls, document.authControls]
  )
  const resolvedLeaderboardControls = useMemo(
    () => normalizeLeaderboardPageSvgControls(leaderboardControls ?? document.leaderboardControls as Partial<LeaderboardPageSvgControls> | undefined),
    [leaderboardControls, document.leaderboardControls]
  )
  const resolvedShopControls = useMemo(
    () => normalizeShopPageSvgControls(shopControls ?? document.shopControls as Partial<ShopPageSvgControls> | undefined),
    [shopControls, document.shopControls]
  )
  const resolvedShopContent = useMemo(
    () => normalizeShopPageContent(shopContent ?? readShopPageLayoutContent(document)),
    [document, shopContent]
  )
  const authPreviewAvatarOptions = useMemo(
    () => Object.entries(avatarImageById)
      .map(([key, url]) => ({ id: Number(key), url: url as string }))
      .filter((entry) => entry.id >= 1 && entry.id <= 18)
      .sort((a, b) => a.id - b.id),
    []
  )
  const handleAuthPreviewModeChange = useCallback((mode: 'signin' | 'signup') => {
    setAuthPreviewShowAvatarSelector(false)
    setAuthPreviewMode(mode)
  }, [])
  const handleAuthPreviewAvatarSelect = useCallback((avatarUrl: string) => {
    setAuthPreviewAvatar(avatarUrl)
    setAuthPreviewShowAvatarSelector(false)
  }, [])

  const content =
    kind === 'games' || kind === 'game-catalog' ? (
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
        onTabChange={setShopTab}
        onClearError={() => undefined}
        onBuy={() => undefined}
        layoutControls={resolvedShopControls}
        shopContent={resolvedShopContent}
      />
    ) : kind === 'social' ? (
      <SocialWorldPageContent
        loading={false}
        error={null}
        presence={{
          userName: 'preview-player',
          status: 'online',
          friends: 2,
          partyMembers: 2,
          unread: 1,
          messages: 1,
          feedItems: 1,
        }}
        onCreateParty={() => undefined}
        onOpenLobby={() => undefined}
        onOpenGame={() => undefined}
        onOpenCategory={() => undefined}
        onOpenShop={() => undefined}
        onOpenCompetition={() => undefined}
        onOpenPlayerHub={() => undefined}
        onOpenMatchmaking={() => undefined}
      />
    ) : kind === 'competition' || kind === 'tournaments' || kind === 'tournament-detail' ? (
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
        pageMode={kind === 'tournaments' ? 'tournaments' : kind === 'tournament-detail' ? 'tournamentDetail' : 'competition'}
        onRefreshLeaderboard={() => undefined}
        onLoadBracket={() => undefined}
        onRegister={() => undefined}
        onMatchmaking={() => undefined}
        layoutControls={pageControls}
      />
    ) : kind === 'leaderboard' || kind === 'game-leaderboard' || kind === 'ai-benchmark-leaderboard' ? (
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
        pageMode={kind === 'game-leaderboard' ? 'gameLeaderboard' : kind === 'ai-benchmark-leaderboard' ? 'aiBenchmarkLeaderboard' : 'leaderboard'}
        gameId="claim:preview"
        onRefreshLeaderboard={() => undefined}
        onLoadBracket={() => undefined}
        onRegister={() => undefined}
        onMatchmaking={() => undefined}
        layoutControls={pageControls}
        leaderboardControls={resolvedLeaderboardControls}
      />
    ) : kind === 'profile' || kind === 'player-hub' ? (
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
        layoutControls={pageControls}
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
        layoutControls={pageControls}
      />
    ) : kind === 'settings' ? (
      <SettingsPageContent
        activeTab={settingsTab}
        showAssetsTab
        layoutControls={pageControls}
      />
    ) : kind === 'lobby' ? (
      <LobbyPageContent
        loading={false}
        creating={false}
        error={null}
        gameId={lobbySampleGameId ?? 'claim'}
        gameName={lobbySampleGameName ?? undefined}
        gameTagline={lobbyGameTagline ?? undefined}
        heroMedia={lobbyHeroMedia}
        minPlayers={lobbyMinPlayers}
        maxPlayers={lobbyMaxPlayers}
        useSampleData={lobbyUseSampleData}
        rooms={lobbyUseSampleData ? [
          { roomId: 'room-alpha', roomType: 'public', gameType: lobbySampleGameId ?? 'claim', currentPlayers: 2, maxPlayers: 4, status: 'open' },
          { roomId: 'room-beta', roomType: 'private', gameType: lobbySampleGameId ?? 'claim', currentPlayers: 3, maxPlayers: 4, status: 'waiting' },
        ] : []}
        busyRoomId={null}
        onRefresh={() => undefined}
        onCreateRoom={() => undefined}
        onQuickJoin={() => undefined}
        onJoinRoom={() => undefined}
        onJoinRoomCode={() => undefined}
        onSpectateRoom={() => undefined}
        onLeaveRoom={() => undefined}
        onMatchmaking={() => undefined}
        layoutControls={lobbyControls ?? normalizeLobbyPageSvgControls(document.lobbyControls as Partial<LobbyPageSvgControls> | undefined)}
      />
    ) : kind === 'auth' ? (
      <main className="asset-catalog-preview__auth-layout-stage">
        <CyberAuthSurface
          layoutControls={resolvedAuthControls}
          mode={authPreviewMode}
          signUpEnabled
          canSendPasswordReset
          brandTitle="Ocentra Games"
          eyebrow="Quick Multiplayer Access"
          title="Unlock Your Session"
          description="Create or access your multiplayer experience"
          warning={false}
          alias=""
          email=""
          password=""
          confirmPassword=""
          avatar={authPreviewAvatar}
          avatarOptions={authPreviewAvatarOptions}
          showAvatarSelector={authPreviewShowAvatarSelector}
          showForgotPassword={false}
          notice={null}
          validationErrors={{}}
          isLoading={false}
          disableCredentials={false}
          socialOptions={[
            { key: 'facebook', icon: authFacebookImageUrl, alt: 'Facebook', onClick: () => undefined },
            { key: 'google', icon: authGoogleImageUrl, alt: 'Google', onClick: () => undefined },
            { key: 'guest', icon: authAnnonImageUrl, alt: 'Guest', onClick: () => undefined },
          ]}
          secondaryActions={[]}
          closeAriaLabel="Close authentication preview"
          onModeChange={handleAuthPreviewModeChange}
          onAliasChange={() => undefined}
          onEmailChange={() => undefined}
          onPasswordChange={() => undefined}
          onConfirmPasswordChange={() => undefined}
          onToggleAvatarSelector={() => setAuthPreviewShowAvatarSelector((value) => !value)}
          onAvatarSelect={handleAuthPreviewAvatarSelect}
          onAvatarUploadClick={() => authFileInputRef.current?.click()}
          onFileChange={() => undefined}
          onForgotPassword={() => undefined}
          onBackToSignIn={() => handleAuthPreviewModeChange('signin')}
          avatarSelectorRef={authAvatarSelectorRef}
          fileInputRef={authFileInputRef}
        />
      </main>
    ) : kind === 'matchmaking' ? (
      <MatchmakingPageContent
        gameId="claim:preview"
        gameName="Claim"
        humans={2}
        ai={2}
        ticket={{ ticketId: 'ticket-preview', queuePosition: 3 }}
        status={{ status: 'queued', queuePosition: 3 }}
        loading={false}
        leaving={false}
        error={null}
        hasMatch={false}
        queueStatusLabel="queued"
        onQueue={() => undefined}
        onLeave={() => undefined}
        onRefreshStatus={() => undefined}
        onOpenLobby={() => undefined}
        layoutControls={pageControls}
      />
    ) : (
      <GenericPageLayoutContent document={document} debugBounds={debugBounds} />
    )

  const toolbar = kind === 'settings'
      ? <SettingsPageToolbar activeTab={settingsTab} showAssetsTab onTabChange={setSettingsTab} />
      : kind === 'lobby'
        ? <div className="lb-top-divider" aria-hidden="true" />
      : null

  if (kind === 'auth') {
    return (
      <div className="asset-catalog-preview__auth-module-preview">
        {resolvedAuthControls.previewShow3dBackground ? (
          <div className="asset-catalog-preview__auth-module-background" aria-hidden="true">
            <ThreeBaseProvider>
              <DynamicBackground />
            </ThreeBaseProvider>
          </div>
        ) : null}
        {content}
      </div>
    )
  }

  const shellClassName = kind === 'shop'
    ? 'sp-root'
    : kind === 'social'
      ? 'social-page'
      : kind === 'competition' || kind === 'tournaments' || kind === 'tournament-detail' || kind === 'leaderboard' || kind === 'game-leaderboard' || kind === 'ai-benchmark-leaderboard'
        ? 'cp-page'
        : kind === 'profile' || kind === 'player-hub'
          ? 'ph-page'
          : kind === 'admin'
            ? 'admin-users-page'
            : kind === 'settings'
              ? 'settings-page'
              : kind === 'selected-game'
                ? 'selected-game-page'
                : kind === 'lobby'
                  ? 'lb-page'
                  : 'home-page'

  const workClassName = kind === 'admin'
    ? `admin-users-work${debugBounds ? ' asset-catalog-preview__page-bounds-work' : ''}`
    : kind === 'selected-game'
      ? `selected-game-shell-work${debugBounds ? ' asset-catalog-preview__page-bounds-work' : ''}`
      : kind === 'games' || kind === 'game-catalog'
        ? `games-catalog-shell-work${debugBounds ? ' asset-catalog-preview__page-bounds-work' : ''}`
        : kind === 'lobby'
          ? `lb-shell-work${debugBounds ? ' asset-catalog-preview__page-bounds-work' : ''}`
          : kind === 'shop'
            ? `sp-shell-work${debugBounds ? ' asset-catalog-preview__page-bounds-work' : ''}`
            : `home-shell-work${debugBounds ? ' asset-catalog-preview__page-bounds-work' : ''}`
  const showPagePrimaryNavigation = kind !== 'selected-game' && kind !== 'games' && kind !== 'game-catalog' && kind !== 'lobby' && kind !== 'shop'

  return (
    <AssetCatalogMainAppPreviewShell
      routePath={routePath}
      headerConfigOverride={resolvedHeaderConfigOverride}
      headerDynamicData={headerDynamicData}
      toolbar={toolbar}
      shellClassName={shellClassName}
      workClassName={workClassName}
      includeAdminNavigation={showPagePrimaryNavigation}
      showPrimaryNavigation={showPagePrimaryNavigation}
    >
      {content}
    </AssetCatalogMainAppPreviewShell>
  )
}

const PageLayoutViewportFrame = React.forwardRef<
  PageLayoutViewportFrameHandle,
  {
    assetPath: string
    viewport: PagePreviewViewportSize
    isPortrait: boolean
    children: React.ReactNode
    surfaceClassName?: string
    onZoomPercentChange?: (value: number) => void
  }
>(function PageLayoutViewportFrame(
  {
    assetPath,
    viewport,
    isPortrait,
    children,
    surfaceClassName,
    onZoomPercentChange,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const panGestureRef = useRef<{
    pointerId: number
    startClientX: number
    startClientY: number
    startPanX: number
    startPanY: number
  } | null>(null)
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 })
  const [spacePressed, setSpacePressed] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [cameraEntry, setCameraEntry] = useState<{ key: string; state: LayoutEditorCanvasCameraState }>(() => ({
    key: '',
    state: createDefaultPagePreviewCameraState(),
  }))
  const orientationKey = isPortrait ? 'portrait' : 'landscape'
  const viewportSignature = useMemo(
    () => getPagePreviewViewportSignature(viewport),
    [viewport]
  )
  const cameraStoragePath = `${assetPath}:page-layout-preview`
  const cameraViewKey = `${cameraStoragePath}:${viewportSignature}:${orientationKey}`
  const canvasAreaWidth = Math.max(
    100,
    containerDimensions.width - PAGE_PREVIEW_CANVAS_PADDING * 2
  )
  const canvasAreaHeight = Math.max(
    100,
    containerDimensions.height - PAGE_PREVIEW_CANVAS_PADDING * 2
  )
  const fitScale = useMemo(() => {
    const nextScale = Math.min(
      canvasAreaWidth / Math.max(viewport.w, 1),
      canvasAreaHeight / Math.max(viewport.h, 1)
    )
    return Number.isFinite(nextScale) ? Math.max(nextScale, 0.01) : 1
  }, [canvasAreaHeight, canvasAreaWidth, viewport.h, viewport.w])
  const storedCameraState = useMemo(
    () =>
      readStoredLayoutEditorCameraState(
        cameraStoragePath,
        viewportSignature,
        orientationKey
      ) ?? createDefaultPagePreviewCameraState(),
    [cameraStoragePath, orientationKey, viewportSignature]
  )
  const rawCameraState = cameraEntry.key === cameraViewKey
    ? cameraEntry.state
    : storedCameraState
  const clampedCameraState = useMemo(
    () =>
      clampPagePreviewCameraState(rawCameraState, viewport, fitScale, {
        width: canvasAreaWidth,
        height: canvasAreaHeight,
      }),
    [canvasAreaHeight, canvasAreaWidth, fitScale, rawCameraState, viewport]
  )
  const effectiveScale = fitScale * clampedCameraState.zoom
  const canvasDisplayWidth = viewport.w * effectiveScale
  const canvasDisplayHeight = viewport.h * effectiveScale
  const centeredOffsetX =
    PAGE_PREVIEW_CANVAS_PADDING + (canvasAreaWidth - canvasDisplayWidth) * 0.5
  const centeredOffsetY =
    PAGE_PREVIEW_CANVAS_PADDING + (canvasAreaHeight - canvasDisplayHeight) * 0.5
  const simulationShellVars = useMemo<React.CSSProperties>(() => {
    const simulatedRootFontPx = clampPreviewNumber(13 + viewport.w * 0.0028, 14, 18)
    const mobileShellBreakpointPx = simulatedRootFontPx * 48
    const useMobileFooterProfile = viewport.w <= mobileShellBreakpointPx
    const footerMinHeightPx = useMobileFooterProfile
      ? clampPreviewNumber(viewport.h * 0.0275, simulatedRootFontPx * 1.5, simulatedRootFontPx * 2.1)
      : clampPreviewNumber(viewport.h * 0.0325, simulatedRootFontPx * 1.75, simulatedRootFontPx * 2.5)
    const footerTextSizePx = useMobileFooterProfile
      ? clampPreviewNumber(
        simulatedRootFontPx * 0.62 + viewport.w * 0.0012,
        simulatedRootFontPx * 0.64,
        simulatedRootFontPx * 0.74
      )
      : clampPreviewNumber(
        simulatedRootFontPx * 0.64 + viewport.w * 0.0016,
        simulatedRootFontPx * 0.68,
        simulatedRootFontPx * 0.8
      )
    const footerTextGapPx = useMobileFooterProfile
      ? simulatedRootFontPx * 0.22
      : simulatedRootFontPx * 0.3

    return {
      '--oc-sim-footer-min-height': `${footerMinHeightPx}px`,
      '--oc-sim-footer-text-size': `${footerTextSizePx}px`,
      '--oc-sim-footer-text-gap': `${footerTextGapPx}px`,
    } as React.CSSProperties
  }, [viewport])

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) {
        return
      }
      const rect = containerRef.current.getBoundingClientRect()
      setContainerDimensions({
        width: rect.width,
        height: rect.height,
      })
    }

    updateDimensions()
    const observer = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    writeStoredLayoutEditorCameraState(
      cameraStoragePath,
      viewportSignature,
      orientationKey,
      clampedCameraState
    )
  }, [cameraStoragePath, clampedCameraState, orientationKey, viewportSignature])

  useEffect(() => {
    onZoomPercentChange?.(Math.max(1, Math.round(effectiveScale * 100)))
  }, [effectiveScale, onZoomPercentChange])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(true)
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setSpacePressed(false)
      }
    }
    const handleBlur = () => {
      setSpacePressed(false)
      setIsPanning(false)
      panGestureRef.current = null
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  const updateCameraState = useCallback(
    (updater: (current: LayoutEditorCanvasCameraState) => LayoutEditorCanvasCameraState) => {
      setCameraEntry({
        key: cameraViewKey,
        state: clampPagePreviewCameraState(updater(clampedCameraState), viewport, fitScale, {
          width: canvasAreaWidth,
          height: canvasAreaHeight,
        }),
      })
    },
    [cameraViewKey, canvasAreaHeight, canvasAreaWidth, clampedCameraState, fitScale, viewport]
  )

  const applyZoomAtPoint = useCallback(
    (nextZoom: number, pointerX?: number, pointerY?: number) => {
      const targetZoom = clampPreviewNumber(
        nextZoom,
        PAGE_PREVIEW_MIN_CAMERA_ZOOM,
        PAGE_PREVIEW_MAX_CAMERA_ZOOM
      )
      updateCameraState(current => {
        if (Math.abs(current.zoom - targetZoom) < 0.0001) {
          return current
        }
        const resolvedPointerX =
          pointerX ?? (PAGE_PREVIEW_CANVAS_PADDING + canvasAreaWidth * 0.5)
        const resolvedPointerY =
          pointerY ?? (PAGE_PREVIEW_CANVAS_PADDING + canvasAreaHeight * 0.5)
        const oldScale = fitScale * current.zoom
        const newScale = fitScale * targetZoom
        const oldBaseX =
          PAGE_PREVIEW_CANVAS_PADDING + (canvasAreaWidth - viewport.w * oldScale) * 0.5
        const oldBaseY =
          PAGE_PREVIEW_CANVAS_PADDING + (canvasAreaHeight - viewport.h * oldScale) * 0.5
        const newBaseX =
          PAGE_PREVIEW_CANVAS_PADDING + (canvasAreaWidth - viewport.w * newScale) * 0.5
        const newBaseY =
          PAGE_PREVIEW_CANVAS_PADDING + (canvasAreaHeight - viewport.h * newScale) * 0.5
        const worldX = (resolvedPointerX - oldBaseX - current.panX) / Math.max(oldScale, 0.0001)
        const worldY = (resolvedPointerY - oldBaseY - current.panY) / Math.max(oldScale, 0.0001)
        return {
          zoom: targetZoom,
          panX: resolvedPointerX - newBaseX - worldX * newScale,
          panY: resolvedPointerY - newBaseY - worldY * newScale,
        }
      })
    },
    [canvasAreaHeight, canvasAreaWidth, fitScale, updateCameraState, viewport.h, viewport.w]
  )

  const handleFitCamera = useCallback(() => {
    setCameraEntry({
      key: cameraViewKey,
      state: createDefaultPagePreviewCameraState(),
    })
  }, [cameraViewKey])

  const handleActualSizeCamera = useCallback(() => {
    setCameraEntry({
      key: cameraViewKey,
      state: clampPagePreviewCameraState(
        {
          zoom: clampPreviewNumber(
            1 / Math.max(fitScale, 0.0001),
            PAGE_PREVIEW_MIN_CAMERA_ZOOM,
            PAGE_PREVIEW_MAX_CAMERA_ZOOM
          ),
          panX: 0,
          panY: 0,
        },
        viewport,
        fitScale,
        {
          width: canvasAreaWidth,
          height: canvasAreaHeight,
        }
      ),
    })
  }, [cameraViewKey, canvasAreaHeight, canvasAreaWidth, fitScale, viewport])

  const handleZoomStep = useCallback(
    (direction: 1 | -1) => {
      const factor = direction > 0
        ? PAGE_PREVIEW_CAMERA_STEP_FACTOR
        : 1 / PAGE_PREVIEW_CAMERA_STEP_FACTOR
      applyZoomAtPoint(clampedCameraState.zoom * factor)
    },
    [applyZoomAtPoint, clampedCameraState.zoom]
  )

  useImperativeHandle(
    ref,
    () => ({
      fitCamera: handleFitCamera,
      actualSizeCamera: handleActualSizeCamera,
      zoomOut: () => handleZoomStep(-1),
      zoomIn: () => handleZoomStep(1),
    }),
    [handleActualSizeCamera, handleFitCamera, handleZoomStep]
  )

  const handleCanvasWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        return
      }
      event.preventDefault()
      const rect = containerRef.current?.getBoundingClientRect()
      const pointerX = rect ? event.clientX - rect.left : undefined
      const pointerY = rect ? event.clientY - rect.top : undefined
      const zoomFactor = Math.exp(-event.deltaY * 0.0015)
      applyZoomAtPoint(clampedCameraState.zoom * zoomFactor, pointerX, pointerY)
    },
    [applyZoomAtPoint, clampedCameraState.zoom]
  )

  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const wantsPan = event.button === 1 || (event.button === 0 && spacePressed)
      if (!wantsPan) {
        return
      }
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      setIsPanning(true)
      panGestureRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPanX: clampedCameraState.panX,
        startPanY: clampedCameraState.panY,
      }
    },
    [clampedCameraState.panX, clampedCameraState.panY, spacePressed]
  )

  const handleCanvasPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!panGestureRef.current || panGestureRef.current.pointerId !== event.pointerId) {
        return
      }
      event.preventDefault()
      const deltaX = event.clientX - panGestureRef.current.startClientX
      const deltaY = event.clientY - panGestureRef.current.startClientY
      updateCameraState(current => ({
        zoom: current.zoom,
        panX: (panGestureRef.current?.startPanX ?? 0) + deltaX,
        panY: (panGestureRef.current?.startPanY ?? 0) + deltaY,
      }))
    },
    [updateCameraState]
  )

  const handleCanvasPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (panGestureRef.current?.pointerId === event.pointerId) {
      panGestureRef.current = null
      setIsPanning(false)
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  return (
    <div
      className={`asset-catalog-preview__page-viewport-frame ${
        isPanning ? 'asset-catalog-preview__page-viewport-frame--panning' : ''
      } ${spacePressed ? 'asset-catalog-preview__page-viewport-frame--pan-ready' : ''}`}
      onWheel={handleCanvasWheel}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerUp}
      ref={containerRef}
    >
      <div
        className={`asset-catalog-preview__page-viewport-device ${surfaceClassName ?? ''}`}
        style={{
          width: `${viewport.w}px`,
          height: `${viewport.h}px`,
          transform: `translate(${centeredOffsetX + clampedCameraState.panX}px, ${centeredOffsetY + clampedCameraState.panY}px) scale(${effectiveScale})`,
        }}
      >
        <div
          className="asset-catalog-preview__page-viewport-content"
          style={simulationShellVars}
        >
          {children}
        </div>
      </div>
    </div>
  )
})

function extractModeFromPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  if (normalized.includes('/GameCatalog/') || normalized.includes('/catalog/')) return 'CardGames'
  const match = normalized.match(/GameMode\/([^/]+)\//)
  return match ? match[1] : 'Other'
}

function extractGameIdFromPath(path: string): string | null {
  const normalized = path.replace(/\\/g, '/')
  const gameFolderMatch = normalized.match(/GameMode\/[^/]+\/Games\/([^/]+)\//)
  if (gameFolderMatch?.[1]) return gameFolderMatch[1]
  const match = normalized.match(/GameMode\/[^/]+\/([^/]+)\//)
  if (match?.[1]) return match[1]
  const segments = normalized.split('/')
  return segments.length >= 3 ? (segments[segments.length - 2] ?? null) : null
}

function inferGameIdFromPageLayoutAssetPath(path?: string): string | null {
  if (!path) return null
  const normalized = path.replace(/\\/g, '/')
  const match = normalized.match(/Resources\/GameMode\/[^/]+\/Games\/([^/]+)\//)
  return match?.[1] ? match[1].toLowerCase() : null
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
  assetPath,
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
  const pageLayoutAssetPath = assetPath ?? assetId
  const pageLayoutGameId = isPageLayoutMode
    ? inferGameIdFromPageLayoutAssetPath(pageLayoutAssetPath)
    : null
  const isGameScopedPageLayout = Boolean(pageLayoutGameId)
  const isHomePageLayout =
    !isPageLayoutMode ||
    pageLayoutData?.kind === 'home' ||
    pageLayoutData?.pageId === 'home'
  const pageLayoutKind = pageLayoutData ? getPageLayoutKind(pageLayoutData) : 'generic'
  const isSelectedGameLayout = isPageLayoutMode && pageLayoutKind === 'selected-game'
  const isGamesPageLayout = isPageLayoutMode && (pageLayoutKind === 'games' || pageLayoutKind === 'game-catalog')
  const isLobbyPageLayout = isPageLayoutMode && pageLayoutKind === 'lobby'
  const isLeaderboardPageLayout = isPageLayoutMode && (
    pageLayoutKind === 'leaderboard' ||
    pageLayoutKind === 'game-leaderboard' ||
    pageLayoutKind === 'ai-benchmark-leaderboard'
  )
  const isAuthPageLayout = isPageLayoutMode && pageLayoutKind === 'auth'
  const isShopPageLayout = isPageLayoutMode && pageLayoutKind === 'shop'
  const shouldLoadGamesForPageLayout =
    isPageLayoutMode && (pageLayoutKind === 'games' || pageLayoutKind === 'game-catalog' || pageLayoutKind === 'selected-game' || pageLayoutKind === 'lobby')
  const initialSelectedGameLayoutConfig = useMemo(
    () => normalizeSelectedGameLayoutConfig(pageLayoutData),
    [pageLayoutData]
  )
  const initialLobbyPageLayoutControls = useMemo(
    () => normalizeLobbyPageSvgControls(pageLayoutData?.lobbyControls as Partial<LobbyPageSvgControls> | undefined),
    [pageLayoutData]
  )
  const initialLeaderboardPageLayoutControls = useMemo(
    () => normalizeLeaderboardPageSvgControls(pageLayoutData?.leaderboardControls as Partial<LeaderboardPageSvgControls> | undefined),
    [pageLayoutData]
  )
  const initialAuthPageLayoutControls = useMemo(
    () => normalizeAuthPageSvgControls(pageLayoutData?.authControls as Partial<AuthPageSvgControls> | undefined),
    [pageLayoutData]
  )
  const initialShopPageLayoutControls = useMemo(
    () => normalizeShopPageSvgControls(pageLayoutData?.shopControls as Partial<ShopPageSvgControls> | undefined),
    [pageLayoutData]
  )
  const initialShopPageLayoutContent = useMemo(
    () => normalizeShopPageContent(readShopPageLayoutContent(pageLayoutData)),
    [pageLayoutData]
  )
  const initialPreviewSampleGameId =
    isSelectedGameLayout || isLobbyPageLayout
      ? pageLayoutGameId ||
        initialSelectedGameLayoutConfig.previewSampleGameId ||
        pageLayoutData?.preview?.sampleGameRef?.gameId ||
        'claim'
      : null
  const showSelectedGameSamplePicker = isSelectedGameLayout && !isGameScopedPageLayout
  const showLobbyGameSamplePicker = isLobbyPageLayout && !isGameScopedPageLayout
  const hasCachedHomepagePreview = hasHomepagePreviewContent(cachedHomepagePreviewData)
  const [activeTab, setActiveTab] = useState<AssetCatalogTab>(
    isPageLayoutMode ? 'homepage' : 'games'
  )
  const [selectedGameId, setSelectedGameId] = useState<string | null>(
    () => initialPreviewSampleGameId
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
  const [gamesPlayerModeFilter, setGamesPlayerModeFilter] = useState<PlayerModeFilter>('all')
  const [gamesCategory, setGamesCategory] = useState('all')
  const [gamesView, setGamesView] = useState<GamesExplorerViewMode>('grid')
  const [gamesQualityFilter, setGamesQualityFilter] = useState<QualityFilter>('all')
  const [gamesSortBy, setGamesSortBy] = useState<SortBy>('name')
  const [gamesCatalogLayoutControls, setGamesCatalogLayoutControls] =
    useState<GamesCatalogSvgLayoutControls>(DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS)
  const [gamesExplorerDetail, setGamesExplorerDetail] =
    useState<GamesExplorerGameDetail | null>(null)
  const [gamesExplorerDetailLoading, setGamesExplorerDetailLoading] = useState(false)
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
    useState(() => initialPreviewSampleGameId ?? initialSelectedGameLayoutConfig.previewSampleGameId)
  const [selectedGameDebugBounds, setSelectedGameDebugBounds] =
    useState(() => initialSelectedGameLayoutConfig.debugBounds)
  const [selectedGamePreviewLayoutMode, setSelectedGamePreviewLayoutMode] =
    useState<SelectedGamePreviewLayoutMode>('auto')
  const [lobbyPageLayoutControls, setLobbyPageLayoutControls] =
    useState<LobbyPageSvgControls>(() => initialLobbyPageLayoutControls)
  const [leaderboardPageLayoutControls, setLeaderboardPageLayoutControls] =
    useState<LeaderboardPageSvgControls>(() => initialLeaderboardPageLayoutControls)
  const [authPageLayoutControls, setAuthPageLayoutControls] =
    useState<AuthPageSvgControls>(() => initialAuthPageLayoutControls)
  const [shopPageLayoutControls, setShopPageLayoutControls] =
    useState<ShopPageSvgControls>(() => initialShopPageLayoutControls)
  const [shopPageLayoutContent, setShopPageLayoutContent] =
    useState<ShopPageContentData>(() => initialShopPageLayoutContent)
  const [pageLayoutBoundsOverlay, setPageLayoutBoundsOverlay] = useState(false)
  const pageLayoutViewportFrameRef = useRef<PageLayoutViewportFrameHandle | null>(null)
  const [pageLayoutPreviewResolution, setPageLayoutPreviewResolution] = useState('fit')
  const [pageLayoutPreviewCustomWidth, setPageLayoutPreviewCustomWidth] = useState(
    PAGE_PREVIEW_DEFAULT_VIEWPORT.w
  )
  const [pageLayoutPreviewCustomHeight, setPageLayoutPreviewCustomHeight] = useState(
    PAGE_PREVIEW_DEFAULT_VIEWPORT.h
  )
  const [pageLayoutPreviewResolutions, setPageLayoutPreviewResolutions] =
    useState<PagePreviewResolutionOption[]>(PAGE_PREVIEW_FALLBACK_RESOLUTIONS)
  const [pageLayoutPreviewIsPortrait, setPageLayoutPreviewIsPortrait] = useState(false)
  const [pageLayoutPreviewZoomPercent, setPageLayoutPreviewZoomPercent] = useState(100)
  const [selectedGamePreviewBundle, setSelectedGamePreviewBundle] =
    useState<SelectedGamePreviewBundle | null>(null)
  const [selectedGameActiveTab, setSelectedGameActiveTab] =
    useState<SelectedGameTabId>('about')
  const [headerConfigOverride, setHeaderConfigOverride] =
    useState<SerializedUnifiedHeaderConfig | null>(null)
  const gamesExplorerDetailRequestRef = useRef(0)
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
  const gamesCatalogLayoutControlsRef = useRef<GamesCatalogSvgLayoutControls>(
    DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS
  )
  const selectedGameLayoutControlsRef =
    useRef<SelectedGameLayoutControls>({})
  const selectedGameContentPlanRef =
    useRef<SelectedGameContentPlan>(DEFAULT_SELECTED_GAME_CONTENT_PLAN)
  const selectedGamePreviewSampleGameIdRef = useRef('claim')
  const selectedGameDebugBoundsRef = useRef(false)
  const selectedGamePreviewLayoutModeRef =
    useRef<SelectedGamePreviewLayoutMode>('auto')
  const lobbyPageLayoutControlsRef = useRef<LobbyPageSvgControls>(
    initialLobbyPageLayoutControls
  )
  const leaderboardPageLayoutControlsRef = useRef<LeaderboardPageSvgControls>(
    initialLeaderboardPageLayoutControls
  )
  const authPageLayoutControlsRef = useRef<AuthPageSvgControls>(
    initialAuthPageLayoutControls
  )
  const shopPageLayoutControlsRef = useRef<ShopPageSvgControls>(
    initialShopPageLayoutControls
  )
  const shopPageLayoutContentRef = useRef<ShopPageContentData>(
    initialShopPageLayoutContent
  )
  const headerConfigOverrideRef = useRef<SerializedUnifiedHeaderConfig | null>(null)
  const homepageContentFrameRef = useRef<HTMLDivElement | null>(null)
  const [homepageContentFrameWidth, setHomepageContentFrameWidth] = useState<number | null>(null)
  const [gamesCategoryExpanded, setGamesCategoryExpanded] = useState<
    Set<string>
  >(new Set())
  const [gamesSidebarCollapsed, setGamesSidebarCollapsed] = useState(false)
  const [resourcesSearch, setResourcesSearch] = useState('')
  const [resourcesFilter, setResourcesFilter] = useState('All')
  const pageLayoutPreviewViewport = useMemo(
    () =>
      resolvePagePreviewViewport(
        pageLayoutPreviewResolution,
        pageLayoutPreviewCustomWidth,
        pageLayoutPreviewCustomHeight,
        pageLayoutPreviewIsPortrait
      ),
    [
      pageLayoutPreviewCustomHeight,
      pageLayoutPreviewCustomWidth,
      pageLayoutPreviewIsPortrait,
      pageLayoutPreviewResolution,
    ]
  )
  const [tabCounts, setTabCounts] = useState<{
    games: number | null
    images: number | null
    resources: number | null
  }>({ games: null, images: null, resources: null })
  const deferredGamesSearch = useDeferredValue(gamesSearch)
  const deferredResourcesSearch = useDeferredValue(resourcesSearch)

  useEffect(() => {
    if (!isPageLayoutMode) {
      return
    }
    let cancelled = false
    fetch('/Resources/devices.json')
      .then(response => response.json())
      .then((data: unknown) => {
        if (!cancelled && Array.isArray(data)) {
          const options = data.filter((item): item is PagePreviewResolutionOption => {
            if (!item || typeof item !== 'object') {
              return false
            }
            const record = item as Record<string, unknown>
            return typeof record.label === 'string' && typeof record.value === 'string'
          })
          setPageLayoutPreviewResolutions(options.length > 0 ? options : PAGE_PREVIEW_FALLBACK_RESOLUTIONS)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPageLayoutPreviewResolutions(PAGE_PREVIEW_FALLBACK_RESOLUTIONS)
        }
      })
    return () => {
      cancelled = true
    }
  }, [isPageLayoutMode])

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
    gamesCatalogLayoutControlsRef.current = gamesCatalogLayoutControls
  }, [gamesCatalogLayoutControls])

  useEffect(() => {
    selectedGameLayoutControlsRef.current = selectedGameLayoutControls
  }, [selectedGameLayoutControls])

  useEffect(() => {
    lobbyPageLayoutControlsRef.current = lobbyPageLayoutControls
  }, [lobbyPageLayoutControls])

  useEffect(() => {
    leaderboardPageLayoutControlsRef.current = leaderboardPageLayoutControls
  }, [leaderboardPageLayoutControls])

  useEffect(() => {
    authPageLayoutControlsRef.current = authPageLayoutControls
  }, [authPageLayoutControls])

  useEffect(() => {
    shopPageLayoutControlsRef.current = shopPageLayoutControls
  }, [shopPageLayoutControls])

  useEffect(() => {
    shopPageLayoutContentRef.current = shopPageLayoutContent
  }, [shopPageLayoutContent])

  useEffect(() => {
    selectedGameContentPlanRef.current = selectedGameContentPlan
  }, [selectedGameContentPlan])

  useEffect(() => {
    if (!isSelectedGameLayout) {
      return undefined
    }
    const nextSampleGameId = initialPreviewSampleGameId || 'claim'
    const timeoutId = window.setTimeout(() => {
      setSelectedGameLayoutControls(initialSelectedGameLayoutConfig.layoutControls)
      setSelectedGameContentPlan(initialSelectedGameLayoutConfig.contentPlan)
      setSelectedGamePreviewSampleGameId(nextSampleGameId)
      setSelectedGameId(nextSampleGameId || null)
      setSelectedGameDebugBounds(initialSelectedGameLayoutConfig.debugBounds)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [initialPreviewSampleGameId, initialSelectedGameLayoutConfig, isSelectedGameLayout])

  useEffect(() => {
    if (!isLobbyPageLayout) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => {
      setLobbyPageLayoutControls(initialLobbyPageLayoutControls)
      setSelectedGameId(initialPreviewSampleGameId)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [initialLobbyPageLayoutControls, initialPreviewSampleGameId, isLobbyPageLayout])

  useEffect(() => {
    if (!isLeaderboardPageLayout) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => {
      setLeaderboardPageLayoutControls(initialLeaderboardPageLayoutControls)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [initialLeaderboardPageLayoutControls, isLeaderboardPageLayout])

  useEffect(() => {
    if (!isAuthPageLayout) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => {
      setAuthPageLayoutControls(initialAuthPageLayoutControls)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [initialAuthPageLayoutControls, isAuthPageLayout])

  useEffect(() => {
    if (!isShopPageLayout) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => {
      setShopPageLayoutControls(initialShopPageLayoutControls)
      setShopPageLayoutContent(initialShopPageLayoutContent)
    }, 0)
    return () => window.clearTimeout(timeoutId)
  }, [initialShopPageLayoutContent, initialShopPageLayoutControls, isShopPageLayout])

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
    let cancelled = false
    void loadGamesCatalogLayoutControlsFromDisk().then(nextControls => {
      if (cancelled) return
      setGamesCatalogLayoutControls(nextControls)
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
    const channel = new BroadcastChannel(GAMES_CATALOG_LAYOUT_CONTROLS_CHANNEL)
    const handler = (event: MessageEvent<GamesCatalogLayoutControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          controls: gamesCatalogLayoutControlsRef.current,
        } satisfies GamesCatalogLayoutControlsMessage)
        return
      }

      if (event.data.type === 'state' || event.data.type === 'update') {
        setGamesCatalogLayoutControls(
          normalizeGamesCatalogLayoutControls(event.data.controls)
        )
      }
    }
    channel.addEventListener('message', handler)
    return () => {
      channel.removeEventListener('message', handler)
      channel.close()
    }
  }, [])

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
        const nextSampleGameId = pageLayoutGameId || event.data.previewSampleGameId || 'claim'
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
  }, [pageLayoutGameId])

  useEffect(() => {
    const channel = new BroadcastChannel(LOBBY_PAGE_LAYOUT_CONTROLS_CHANNEL)
    const handler = (event: MessageEvent<LobbyPageLayoutControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          controls: lobbyPageLayoutControlsRef.current,
        } satisfies LobbyPageLayoutControlsMessage)
        return
      }

      if (event.data.type === 'state' || event.data.type === 'update') {
        setLobbyPageLayoutControls(
          normalizeLobbyPageSvgControls(event.data.controls)
        )
      }
    }
    channel.addEventListener('message', handler)
    return () => {
      channel.removeEventListener('message', handler)
      channel.close()
    }
  }, [])

  useEffect(() => {
    const channel = new BroadcastChannel(LEADERBOARD_PAGE_LAYOUT_CONTROLS_CHANNEL)
    const handler = (event: MessageEvent<LeaderboardPageLayoutControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          controls: leaderboardPageLayoutControlsRef.current,
        } satisfies LeaderboardPageLayoutControlsMessage)
        return
      }

      if (event.data.type === 'state' || event.data.type === 'update') {
        setLeaderboardPageLayoutControls(
          normalizeLeaderboardPageSvgControls(event.data.controls)
        )
      }
    }
    channel.addEventListener('message', handler)
    return () => {
      channel.removeEventListener('message', handler)
      channel.close()
    }
  }, [])

  useEffect(() => {
    const channel = new BroadcastChannel(AUTH_PAGE_LAYOUT_CONTROLS_CHANNEL)
    const handler = (event: MessageEvent<AuthPageLayoutControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          controls: authPageLayoutControlsRef.current,
        } satisfies AuthPageLayoutControlsMessage)
        return
      }

      if (event.data.type === 'state' || event.data.type === 'update') {
        setAuthPageLayoutControls(
          normalizeAuthPageSvgControls(event.data.controls)
        )
      }
    }
    channel.addEventListener('message', handler)
    return () => {
      channel.removeEventListener('message', handler)
      channel.close()
    }
  }, [])

  useEffect(() => {
    const channel = new BroadcastChannel(SHOP_PAGE_LAYOUT_CONTROLS_CHANNEL)
    const handler = (event: MessageEvent<ShopPageLayoutControlsMessage>) => {
      if (event.data.type === 'request-state') {
        channel.postMessage({
          type: 'state',
          controls: shopPageLayoutControlsRef.current,
          content: shopPageLayoutContentRef.current,
        } satisfies ShopPageLayoutControlsMessage)
        return
      }

      if (event.data.type === 'state' || event.data.type === 'update') {
        setShopPageLayoutControls(
          normalizeShopPageSvgControls(event.data.controls)
        )
        if (event.data.content) {
          setShopPageLayoutContent(
            normalizeShopPageContent(event.data.content)
          )
        }
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
          const [tauriCatalog, catalogEntries] = await Promise.all([
            getGamesCatalogFromTauri(),
            isSelectedGameLayout ? Promise.resolve([]) : loadGameCatalogIndexFromResources(),
          ])
          const withMeta: GameWithMetadata[] = tauriCatalog.games.map(g => {
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
            return { home, path: g.path, entry, source: 'asset' }
          })
          const mergedGames = mergeGameCatalogWithAssets(withMeta, catalogEntries)
          setGameEntries(withMeta.map(m => m.entry))
          setGamesWithMetadata(await enrichAssetGamesFromPreviewAssets(mergedGames))
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
          const [gameModeResult, withMeta, catalogEntries] = await Promise.all([
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
            isSelectedGameLayout ? Promise.resolve([]) : loadGameCatalogIndexFromResources(),
          ])
          const completeWithMeta = await appendMissingGameMetadata(withMeta, gameModeResult)
          const mergedGames = mergeGameCatalogWithAssets(completeWithMeta, catalogEntries)
          setGameEntries(gameModeResult)
          setGamesWithMetadata(await enrichAssetGamesFromPreviewAssets(mergedGames))
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
  }, [activeTab, hasLoadedGames, isSelectedGameLayout, shouldLoadGamesForPageLayout])

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

  const gamesPlayerModeCounts = useMemo(() => {
    const counts = { all: gamesWithMetadata.length, singleplayer: 0, multiplayer: 0 }
    for (const item of gamesWithMetadata) {
      const mode = gamePlayerMode(item)
      if (mode) counts[mode] += 1
    }
    return counts
  }, [gamesWithMetadata])

  const availableGamesCount = useMemo(
    () => gamesWithMetadata.filter(item => !isCatalogGameItem(item)).length,
    [gamesWithMetadata]
  )

  const gamesCategoryWithSubs = useMemo((): CategoryWithSubs[] => {
    const modeFiltered =
      gamesModeFilter === 'all'
        ? gamesWithMetadata
        : gamesWithMetadata.filter(
            g => extractModeFromPath(g.path) === gamesModeFilter
          )
    const playerModeFiltered =
      gamesPlayerModeFilter === 'all'
        ? modeFiltered
        : modeFiltered.filter(g => gamePlayerMode(g) === gamesPlayerModeFilter)
    const byCat = new Map<string, Map<string, number>>()
    for (const { home, path } of playerModeFiltered) {
      const cat = home.gameCategory || extractModeFromPath(path)
      const sub = home.subcategory ?? null
      if (!byCat.has(cat)) byCat.set(cat, new Map())
      const subMap = byCat.get(cat)!
      const subKey = sub ?? '(none)'
      subMap.set(subKey, (subMap.get(subKey) ?? 0) + 1)
    }
    const catTotals = new Map<string, number>()
    for (const { home, path } of playerModeFiltered) {
      const c = home.gameCategory || extractModeFromPath(path)
      catTotals.set(c, (catTotals.get(c) ?? 0) + 1)
    }
    const result: CategoryWithSubs[] = [
      { category: 'all', total: playerModeFiltered.length, subList: [] },
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
  }, [gamesWithMetadata, gamesModeFilter, gamesPlayerModeFilter])

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
    if (gamesPlayerModeFilter !== 'all') {
      result = result.filter(g => gamePlayerMode(g) === gamesPlayerModeFilter)
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
        const description = (g.home.shortDescription ?? g.home.description ?? '').toLowerCase()
        const category = (g.home.gameCategory ?? '').toLowerCase()
        const subcategory = (g.home.subcategory ?? '').toLowerCase()
        const aliases = (g.alsoKnownAs ?? []).join(' ').toLowerCase()
        const path = g.path.toLowerCase()
        return (
          name.includes(q) ||
          gameId.includes(q) ||
          description.includes(q) ||
          category.includes(q) ||
          subcategory.includes(q) ||
          aliases.includes(q) ||
          path.includes(q)
        )
      })
    }
    if (gamesQualityFilter !== 'all') {
      result = result.filter(g => {
        if (gamesQualityFilter === 'available') return !isCatalogGameItem(g)
        return (g.home.quality ?? 'complete') === gamesQualityFilter
      })
    }
    const compareName = (a: GameWithMetadata, b: GameWithMetadata) =>
      (a.home.name ?? a.entry.displayName ?? '').localeCompare(
        b.home.name ?? b.entry.displayName ?? ''
      )
    const completenessScore = (g: GameWithMetadata) =>
      g.home.completeness
        ? Math.round((Object.values(g.home.completeness).filter(Boolean).length / 8) * 100)
        : 0
    return [...result].sort((a, b) => {
      if (gamesSortBy === 'available') {
        const availableCompare = Number(!isCatalogGameItem(b)) - Number(!isCatalogGameItem(a))
        return availableCompare || compareName(a, b)
      }
      if (gamesSortBy === 'category') {
        const categoryCompare = (a.home.gameCategory || extractModeFromPath(a.path)).localeCompare(
          b.home.gameCategory || extractModeFromPath(b.path)
        )
        return categoryCompare || compareName(a, b)
      }
      if (gamesSortBy === 'completeness') {
        return completenessScore(b) - completenessScore(a) || compareName(a, b)
      }
      return compareName(a, b)
    })
  }, [
    gamesWithMetadata,
    gamesModeFilter,
    gamesPlayerModeFilter,
    gamesCategory,
    deferredGamesSearch,
    gamesQualityFilter,
    gamesSortBy,
  ])

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
        .filter(item => !isCatalogGameItem(item))
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

  const shouldLoadSelectedGamePreviewBundle = isSelectedGameLayout || isLobbyPageLayout

  useEffect(() => {
    if (!shouldLoadSelectedGamePreviewBundle) {
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
  }, [shouldLoadSelectedGamePreviewBundle, selectedGame])

  const selectedGameFallbackBundle = useMemo(
    () => buildSelectedGameFallbackBundle(selectedGame),
    [selectedGame]
  )
  const selectedGameRenderBundle = selectedGamePreviewBundle ?? selectedGameFallbackBundle

  const lobbyHeroMedia = useMemo(
    () => isLobbyPageLayout
      ? buildLobbyHeroMediaFromBundle(selectedGame, selectedGameRenderBundle, resolveImageUrl)
      : undefined,
    [isLobbyPageLayout, resolveImageUrl, selectedGame, selectedGameRenderBundle]
  )
  const lobbyPlayerBounds = useMemo(
    () => isLobbyPageLayout
      ? buildLobbyPlayerBoundsFromBundle(selectedGame, selectedGameRenderBundle)
      : {},
    [isLobbyPageLayout, selectedGame, selectedGameRenderBundle]
  )

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
    return withSelectedGameActions(buildSelectedGamePresentation({
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
    }), Boolean(selectedGame))
  }, [
    isSelectedGameLayout,
    pageLayoutData,
    selectedGameContentPlan,
    selectedGame,
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

  const handleGamesTabNavigate = (item: GameWithMetadata) => {
    if (isCatalogGameItem(item)) return
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

  const toGamesExplorerGame = (g: GameWithMetadata): GamesExplorerGame => {
    const cat = g.home.gameCategory || extractModeFromPath(g.path)
    const pct = g.home.completeness
      ? Math.round(
          (Object.values(g.home.completeness).filter(Boolean).length / 8) * 100
        )
      : 0
    return {
      slug:
        g.home.gameId ?? g.entry.gameId ?? extractGameIdFromPath(g.path) ?? '',
      guid: g.entry.guid,
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
      player_mode: gamePlayerMode(g),
      origin: g.origin,
      alsoKnownAs: g.alsoKnownAs,
      completeness: g.home.completeness ?? undefined,
      completenessPercent: pct,
      source: isCatalogGameItem(g) ? 'catalog' : 'asset',
    }
  }

  const findGamesExplorerMetadata = (game: GamesExplorerGame): GameWithMetadata | undefined =>
    filteredGamesWithMeta.find(item => {
      const slug = item.home.gameId ?? item.entry.gameId ?? extractGameIdFromPath(item.path) ?? ''
      return slug === game.slug
    })

  const handleGamesExplorerGameSelect = (game: GamesExplorerGame) => {
    const match = findGamesExplorerMetadata(game)
    const requestId = gamesExplorerDetailRequestRef.current + 1
    gamesExplorerDetailRequestRef.current = requestId
    setGamesExplorerDetail(null)

    if (!match) {
      setGamesExplorerDetailLoading(false)
      return
    }

    setGamesExplorerDetailLoading(true)
    void (async () => {
      try {
        if (isCatalogGameItem(match)) {
          const catalogData = await loadCatalogGameDetailData(match)
          if (gamesExplorerDetailRequestRef.current !== requestId) return
          setGamesExplorerDetail(buildCatalogGameDetail(match, catalogData))
          return
        }

        const bundle = await loadSelectedGamePreviewBundle(match.path)
        const enriched = enrichGameMetadataFromBundle(match, bundle)
        if (gamesExplorerDetailRequestRef.current !== requestId) return
        setGamesWithMetadata(previous =>
          previous.map(item => gameMetadataId(item) === gameMetadataId(match) ? enriched : item)
        )
        setGamesExplorerDetail(buildAssetGameDetail(enriched, bundle))
      } catch {
        if (gamesExplorerDetailRequestRef.current === requestId) {
          setGamesExplorerDetail(
            isCatalogGameItem(match)
              ? buildCatalogGameDetail(match, {})
              : buildAssetGameDetail(match, buildSelectedGameFallbackBundle(match))
          )
        }
      } finally {
        if (gamesExplorerDetailRequestRef.current === requestId) {
          setGamesExplorerDetailLoading(false)
        }
      }
    })()
  }

  const handleGamesExplorerDetailClose = () => {
    gamesExplorerDetailRequestRef.current += 1
    setGamesExplorerDetail(null)
    setGamesExplorerDetailLoading(false)
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

  const gamesExplorerSvgGames: GamesExplorerGame[] = filteredGamesWithMeta.map(toGamesExplorerGame)

  const gamesExplorerPreviewContent = (
    <main className="asset-catalog-preview__real-page asset-catalog-preview__real-page--games">
      {isLoadingGames ? (
        <div className="asset-catalog-preview__empty">Loading games...</div>
      ) : (
        <GamesCatalogSvgShowcase
          games={gamesExplorerSvgGames}
          metadata={{ totalGames: gamesWithMetadata.length }}
          availableCount={availableGamesCount}
          categoryWithSubs={gamesCategoryWithSubs}
          playerModeCounts={gamesPlayerModeCounts}
          currentView={gamesView}
          onViewChange={setGamesView}
          qualityFilter={gamesQualityFilter}
          onQualityChange={setGamesQualityFilter}
          sortBy={gamesSortBy}
          onSortChange={setGamesSortBy}
          searchQuery={gamesSearch}
          onSearchChange={setGamesSearch}
          currentCategory={gamesCategory}
          onCategoryChange={setGamesCategory}
          playerModeFilter={gamesPlayerModeFilter}
          onPlayerModeChange={setGamesPlayerModeFilter}
          categoryExpanded={gamesCategoryExpanded}
          onCategoryExpandToggle={toggleGamesCategoryExpanded}
          isSidebarCollapsed={gamesSidebarCollapsed}
          onToggleSidebar={() => setGamesSidebarCollapsed(v => !v)}
          detail={gamesExplorerDetail}
          detailLoading={gamesExplorerDetailLoading}
          onGameSelect={handleGamesExplorerGameSelect}
          onDetailClose={handleGamesExplorerDetailClose}
          layoutControls={gamesCatalogLayoutControls}
          onGameClick={(game: GamesExplorerGame) => {
            const match = findGamesExplorerMetadata(game)
            if (match && !isCatalogGameItem(match)) {
              handleGamesTabNavigate(match)
            }
          }}
        />
      )}
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
      assetPath ?? SELECTED_GAME_LAYOUT_ASSET_PATH,
      'Selected Game Layout Controls',
      true
    )
  }

  const handleOpenGamesCatalogLayoutControls = () => {
    void createPanelWindow(
      'games-catalog-layout-controls',
      'Resources/Pages/GameCatalogPageLayout.asset',
      'Games Catalog Layout Controls',
      true
    )
  }

  const handleOpenLobbyPageLayoutControls = () => {
    void createPanelWindow(
      'lobby-page-layout-controls',
      assetPath ?? LOBBY_PAGE_LAYOUT_ASSET_PATH,
      'Lobby Layout Controls',
      true
    )
  }

  const handleOpenLeaderboardPageLayoutControls = () => {
    void createPanelWindow(
      'leaderboard-page-layout-controls',
      assetPath ?? LEADERBOARD_PAGE_LAYOUT_ASSET_PATH,
      'Leaderboard Layout Controls',
      true
    )
  }

  const handleOpenAuthPageLayoutControls = () => {
    void createPanelWindow(
      'auth-page-layout-controls',
      assetPath ?? AUTH_PAGE_LAYOUT_ASSET_PATH,
      'Auth Layout Controls',
      true
    )
  }

  const handleOpenShopPageLayoutControls = () => {
    void createPanelWindow(
      'shop-page-layout-controls',
      assetPath ?? SHOP_PAGE_LAYOUT_ASSET_PATH,
      'Shop Layout Controls',
      true
    )
  }

  const handleOpenPageLayoutControls = () => {
    void createPanelWindow(
      'page-layout-controls',
      pageLayoutAssetPath,
      `${pageLayoutData?.title ?? 'Page'} Layout Controls`,
      true
    )
  }

  const pageLayoutViewportToolbar = isPageLayoutMode ? (
    <div className="asset-catalog-preview__viewport-toolbar">
      <label className="asset-catalog-preview__viewport-select">
        <span>Viewport</span>
        <select
          value={pageLayoutPreviewResolution}
          onChange={event => setPageLayoutPreviewResolution(event.target.value)}
          aria-label="Page layout preview viewport"
        >
          {pageLayoutPreviewResolutions.map((option, index) => (
            <option
              key={`${option.value}-${index}`}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className={`asset-catalog-preview__viewport-button ${
          pageLayoutPreviewIsPortrait ? 'is-active' : ''
        }`}
        onClick={() => setPageLayoutPreviewIsPortrait(value => !value)}
        title={pageLayoutPreviewIsPortrait ? 'Switch to landscape' : 'Switch to portrait'}
      >
        {pageLayoutPreviewIsPortrait ? 'Portrait' : 'Landscape'}
      </button>
      {pageLayoutPreviewResolution === 'custom' && (
        <div className="asset-catalog-preview__viewport-custom-size">
          <input
            type="number"
            min="320"
            max="7680"
            value={pageLayoutPreviewCustomWidth}
            onChange={event => setPageLayoutPreviewCustomWidth(Math.max(320, Number(event.target.value) || 320))}
            aria-label="Custom viewport width"
          />
          <span>x</span>
          <input
            type="number"
            min="320"
            max="7680"
            value={pageLayoutPreviewCustomHeight}
            onChange={event => setPageLayoutPreviewCustomHeight(Math.max(320, Number(event.target.value) || 320))}
            aria-label="Custom viewport height"
          />
        </div>
      )}
      <div className="asset-catalog-preview__viewport-camera">
        <button
          type="button"
          className="asset-catalog-preview__viewport-button"
          onClick={() => pageLayoutViewportFrameRef.current?.fitCamera()}
        >
          Fit
        </button>
        <button
          type="button"
          className="asset-catalog-preview__viewport-button"
          onClick={() => pageLayoutViewportFrameRef.current?.actualSizeCamera()}
        >
          100%
        </button>
        <button
          type="button"
          className="asset-catalog-preview__viewport-button asset-catalog-preview__viewport-button--icon"
          onClick={() => pageLayoutViewportFrameRef.current?.zoomOut()}
          aria-label="Zoom out"
        >
          -
        </button>
        <span className="asset-catalog-preview__viewport-zoom-readout">
          {pageLayoutPreviewZoomPercent}%
        </span>
        <button
          type="button"
          className="asset-catalog-preview__viewport-button asset-catalog-preview__viewport-button--icon"
          onClick={() => pageLayoutViewportFrameRef.current?.zoomIn()}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  ) : null

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
        {isGamesPageLayout && (
          <button
            type="button"
            className="asset-catalog-preview__edit-featured-button"
            onClick={handleOpenGamesCatalogLayoutControls}
          >
            Edit
          </button>
        )}
        {isLobbyPageLayout && (
          <button
            type="button"
            className="asset-catalog-preview__edit-featured-button"
            onClick={handleOpenLobbyPageLayoutControls}
          >
            Edit
          </button>
        )}
        {isAuthPageLayout && (
          <button
            type="button"
            className="asset-catalog-preview__edit-featured-button"
            onClick={handleOpenAuthPageLayoutControls}
          >
            Edit
          </button>
        )}
        {isShopPageLayout && (
          <button
            type="button"
            className="asset-catalog-preview__edit-featured-button"
            onClick={handleOpenShopPageLayoutControls}
          >
            Edit
          </button>
        )}
        {isLeaderboardPageLayout && (
          <button
            type="button"
            className="asset-catalog-preview__edit-featured-button"
            onClick={handleOpenLeaderboardPageLayoutControls}
          >
            Edit
          </button>
        )}
        {isPageLayoutMode && !isHomePageLayout && !isSelectedGameLayout && !isGamesPageLayout && !isLobbyPageLayout && !isLeaderboardPageLayout && !isAuthPageLayout && !isShopPageLayout && (
          <button
            type="button"
            className="asset-catalog-preview__edit-featured-button"
            onClick={handleOpenPageLayoutControls}
          >
            Edit
          </button>
        )}
        {isPageLayoutMode && !isHomePageLayout && !isSelectedGameLayout && !isGamesPageLayout && !isLeaderboardPageLayout && !isAuthPageLayout && !isShopPageLayout && (
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
      {showSelectedGameSamplePicker && (
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
      {showLobbyGameSamplePicker && (
        <div className="asset-catalog-preview__games-mode">
          <label htmlFor="asset-catalog-lobby-game-sample">Sample</label>
          <select
            id="asset-catalog-lobby-game-sample"
            value={selectedGameId ?? ''}
            onChange={e => {
              setSelectedGameId(e.target.value || null)
            }}
            aria-label="Lobby preview sample"
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
      {pageLayoutViewportToolbar}
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

  const homepagePreviewContent = (
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
          lobbyControls={lobbyPageLayoutControls}
          leaderboardControls={leaderboardPageLayoutControls}
          authControls={authPageLayoutControls}
          shopControls={shopPageLayoutControls}
          shopContent={shopPageLayoutContent}
          lobbySampleGameId={selectedGameId}
          lobbySampleGameName={selectedGame?.home.name ?? selectedGame?.entry.displayName ?? (selectedGameId ? null : 'Template')}
          lobbyGameTagline={lobbyHeroMedia?.tagline ?? null}
          lobbyHeroMedia={lobbyHeroMedia}
          lobbyMinPlayers={lobbyPlayerBounds.minPlayers}
          lobbyMaxPlayers={lobbyPlayerBounds.maxPlayers}
          lobbyUseSampleData={!isGameScopedPageLayout}
          debugBounds={pageLayoutBoundsOverlay}
        />
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
            isPageLayoutMode ? (
              <PageLayoutViewportFrame
                ref={pageLayoutViewportFrameRef}
                assetPath={assetPath ?? assetId}
                viewport={pageLayoutPreviewViewport}
                isPortrait={pageLayoutPreviewIsPortrait}
                surfaceClassName={isAuthPageLayout ? 'asset-catalog-preview__page-viewport-device--auth-module' : undefined}
                onZoomPercentChange={setPageLayoutPreviewZoomPercent}
              >
                {homepagePreviewContent}
              </PageLayoutViewportFrame>
            ) : (
              homepagePreviewContent
            )
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
