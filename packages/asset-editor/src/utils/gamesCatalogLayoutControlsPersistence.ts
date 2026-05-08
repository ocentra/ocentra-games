import {
  DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS,
  type GamesCatalogSvgLayoutControls,
} from '@ocentra/core-ui/GamesExplorer/GamesCatalogSvgShowcaseControls'
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter'

export const GAMES_CATALOG_LAYOUT_CONTROLS_RESOURCE_PATH =
  'Content/Games/gamesCatalogLayoutControls.json'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function numberInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const numberValue = typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback
  return Math.min(max, Math.max(min, numberValue))
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

type GamesCatalogNumericControlKey = {
  [Key in keyof GamesCatalogSvgLayoutControls]:
    GamesCatalogSvgLayoutControls[Key] extends number ? Key : never
}[keyof GamesCatalogSvgLayoutControls]

type GamesCatalogBooleanControlKey = {
  [Key in keyof GamesCatalogSvgLayoutControls]:
    GamesCatalogSvgLayoutControls[Key] extends boolean ? Key : never
}[keyof GamesCatalogSvgLayoutControls]

type GamesCatalogColorControlKey = {
  [Key in keyof GamesCatalogSvgLayoutControls]:
    GamesCatalogSvgLayoutControls[Key] extends string ? Key : never
}[keyof GamesCatalogSvgLayoutControls]

const gamesCatalogNumericControlRanges: Record<
  GamesCatalogNumericControlKey,
  { min: number; max: number; step: number }
> = {
  outerInset: { min: 0, max: 64, step: 1 },
  topBarInsetX: { min: 0, max: 96, step: 1 },
  topBarTopInset: { min: 0, max: 64, step: 1 },
  topBarHeight: { min: 0, max: 120, step: 1 },
  toolbarButtonHeight: { min: 24, max: 64, step: 1 },
  searchWidth: { min: 160, max: 520, step: 5 },
  statsBoxWidth: { min: 64, max: 150, step: 1 },
  defaultSidebarWidth: { min: 180, max: 760, step: 5 },
  minSidebarWidth: { min: 140, max: 520, step: 5 },
  maxSidebarWidth: { min: 240, max: 900, step: 5 },
  sidebarHeaderHeight: { min: 36, max: 96, step: 1 },
  playerModeRowHeight: { min: 42, max: 82, step: 1 },
  categoryRowHeight: { min: 34, max: 72, step: 1 },
  subcategoryRowHeight: { min: 22, max: 48, step: 1 },
  gamesAreaPadding: { min: 0, max: 80, step: 1 },
  cardGap: { min: 8, max: 96, step: 1 },
  cardTopClearance: { min: 0, max: 80, step: 1 },
  minCardWidthPx: { min: 180, max: 520, step: 5 },
  maxCardWidthPx: { min: 220, max: 680, step: 5 },
  maxGridColumns: { min: 1, max: 8, step: 1 },
  cardHeight: { min: 360, max: 820, step: 5 },
  cardPadding: { min: 0, max: 36, step: 1 },
  cardImageHeight: { min: 0, max: 340, step: 1 },
  cardRadius: { min: 0, max: 36, step: 1 },
  cardTitleFont: { min: 12, max: 28, step: 0.5 },
  cardDescriptionFont: { min: 10, max: 20, step: 0.5 },
  cardMetaPillHeight: { min: 20, max: 44, step: 1 },
  cardMetaGap: { min: 2, max: 24, step: 1 },
  detailPanelWidth: { min: 720, max: 1680, step: 10 },
  detailPanelHeight: { min: 420, max: 1000, step: 10 },
  topBarFillOpacity: { min: 0, max: 1, step: 0.01 },
  topBarStrokeWidth: { min: 0, max: 6, step: 0.1 },
  topBarBackdropBlur: { min: 0, max: 32, step: 1 },
  controlFillOpacity: { min: 0, max: 1, step: 0.01 },
  controlStrokeWidth: { min: 0, max: 6, step: 0.1 },
  controlGlowBlur: { min: 0, max: 24, step: 1 },
  controlGlowOpacity: { min: 0, max: 1, step: 0.01 },
  sidebarFillOpacity: { min: 0, max: 1, step: 0.01 },
  sidebarStrokeWidth: { min: 0, max: 6, step: 0.1 },
  sidebarHeaderFillOpacity: { min: 0, max: 1, step: 0.01 },
  sidebarRowFillOpacity: { min: 0, max: 1, step: 0.01 },
  sidebarRowActiveFillOpacity: { min: 0, max: 1, step: 0.01 },
  sidebarBackdropBlur: { min: 0, max: 32, step: 1 },
  gamesAreaFillOpacity: { min: 0, max: 1, step: 0.01 },
  gamesAreaStrokeWidth: { min: 0, max: 6, step: 0.1 },
  gamesAreaBackdropBlur: { min: 0, max: 32, step: 1 },
  cardFillOpacity: { min: 0, max: 1, step: 0.01 },
  cardStrokeWidth: { min: 0, max: 8, step: 0.1 },
  cardRingStrokeWidth: { min: 0, max: 6, step: 0.1 },
  cardRingOpacity: { min: 0, max: 1, step: 0.01 },
  cardGlowBlur: { min: 0, max: 24, step: 1 },
  cardGlowOpacity: { min: 0, max: 1, step: 0.01 },
  cardBackdropBlur: { min: 0, max: 32, step: 1 },
  cardImageOverlayOpacity: { min: 0, max: 1, step: 0.01 },
  cardImageCurveOpacity: { min: 0, max: 1, step: 0.01 },
  cardCategoryBadgeOpacity: { min: 0, max: 1, step: 0.01 },
  cardMetaFillOpacity: { min: 0, max: 1, step: 0.01 },
  cardTopClampHeight: { min: 0, max: 28, step: 1 },
  cardTopClampFillOpacity: { min: 0, max: 1, step: 0.01 },
  cardTopClampStrokeWidth: { min: 0, max: 8, step: 0.1 },
  detailOverlayOpacity: { min: 0, max: 1, step: 0.01 },
  detailPanelFillOpacity: { min: 0, max: 1, step: 0.01 },
  detailPanelStrokeWidth: { min: 0, max: 8, step: 0.1 },
  detailHeaderFillOpacity: { min: 0, max: 1, step: 0.01 },
  detailCardFillOpacity: { min: 0, max: 1, step: 0.01 },
  detailBackdropBlur: { min: 0, max: 32, step: 1 },
  debugBoundsStrokeWidth: { min: 0.5, max: 8, step: 0.5 },
  debugBoundsFillOpacity: { min: 0, max: 0.5, step: 0.01 },
}

const gamesCatalogBooleanControlKeys: readonly GamesCatalogBooleanControlKey[] = [
  'showToolbar',
  'showSearch',
  'showViewButtons',
  'showQualityFilter',
  'showSortFilter',
  'showStats',
  'showSidebar',
  'showPlayerModes',
  'showCategoryList',
  'showCardImages',
  'showCardCategoryBadge',
  'showCardStatusBadge',
  'showCardMeta',
  'showCardTopClamp',
  'enableDetailOverlay',
  'showDetailReadiness',
  'showDetailActions',
  'showDebugBounds',
  'showPageBounds',
  'showHeaderBounds',
  'showSidebarBounds',
  'showGamesAreaBounds',
  'showCardBounds',
  'showDetailBounds',
]

const gamesCatalogColorControlKeys: readonly GamesCatalogColorControlKey[] = [
  'topBarFillColor',
  'topBarStrokeColor',
  'controlFillColor',
  'controlStrokeColor',
  'controlGlowColor',
  'activeControlStartColor',
  'activeControlEndColor',
  'sidebarFillColor',
  'sidebarStrokeColor',
  'sidebarHeaderFillColor',
  'sidebarDividerColor',
  'sidebarRowFillColor',
  'sidebarRowActiveFillColor',
  'gamesAreaFillColor',
  'gamesAreaStrokeColor',
  'cardOuterFillColor',
  'cardFillColor',
  'cardStrokeColor',
  'cardRingColor',
  'cardGlowColor',
  'cardEdgeStartColor',
  'cardEdgeMiddleColor',
  'cardEdgeEndColor',
  'cardTextColor',
  'cardDescriptionColor',
  'cardImageOverlayColor',
  'cardCategoryBadgeFillColor',
  'cardCategoryBadgeStrokeColor',
  'cardMetaFillColor',
  'cardMetaStrokeColor',
  'cardTopClampStrokeColor',
  'detailOverlayColor',
  'detailPanelFillColor',
  'detailPanelStrokeColor',
  'detailHeaderFillColor',
  'detailCardFillColor',
  'detailCardStrokeColor',
  'debugPageBoundsColor',
  'debugHeaderBoundsColor',
  'debugSidebarBoundsColor',
  'debugGamesBoundsColor',
  'debugCardBoundsColor',
]

function colorValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback
}

export function normalizeGamesCatalogLayoutControls(
  value: unknown
): GamesCatalogSvgLayoutControls {
  const record = asRecord(value)
  const nextControls = { ...DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS }

  for (const [key, range] of Object.entries(gamesCatalogNumericControlRanges)) {
    const typedKey = key as GamesCatalogNumericControlKey
    const nextValue = numberInRange(
      record[typedKey],
      DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS[typedKey],
      range.min,
      range.max
    )
    nextControls[typedKey] = range.step === 1 ? Math.round(nextValue) : nextValue
  }

  for (const key of gamesCatalogBooleanControlKeys) {
    nextControls[key] = booleanValue(
      record[key],
      DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS[key]
    )
  }

  for (const key of gamesCatalogColorControlKeys) {
    nextControls[key] = colorValue(
      record[key],
      DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS[key]
    )
  }

  nextControls.maxCardWidthPx = Math.max(
    nextControls.minCardWidthPx,
    nextControls.maxCardWidthPx
  )
  nextControls.maxSidebarWidth = Math.max(
    nextControls.minSidebarWidth,
    nextControls.maxSidebarWidth
  )
  nextControls.defaultSidebarWidth = numberInRange(
    nextControls.defaultSidebarWidth,
    DEFAULT_GAMES_CATALOG_SVG_LAYOUT_CONTROLS.defaultSidebarWidth,
    nextControls.minSidebarWidth,
    nextControls.maxSidebarWidth
  )

  return nextControls
}

export async function loadGamesCatalogLayoutControlsFromDisk(): Promise<GamesCatalogSvgLayoutControls> {
  try {
    const response = await readAsset(GAMES_CATALOG_LAYOUT_CONTROLS_RESOURCE_PATH)
    if (!response.ok) {
      return normalizeGamesCatalogLayoutControls(null)
    }
    return normalizeGamesCatalogLayoutControls(JSON.parse(await response.text()))
  } catch {
    return normalizeGamesCatalogLayoutControls(null)
  }
}

export async function saveGamesCatalogLayoutControlsToDisk(
  controls: GamesCatalogSvgLayoutControls
): Promise<GamesCatalogSvgLayoutControls> {
  const nextControls = normalizeGamesCatalogLayoutControls(controls)
  const payload = new TextEncoder().encode(
    `${JSON.stringify(nextControls, null, 2)}\n`
  )
  await writeAsset(GAMES_CATALOG_LAYOUT_CONTROLS_RESOURCE_PATH, payload)
  return nextControls
}
