import {
  FeaturedShowcaseControlsSchema,
  type FeaturedShowcaseControlsData,
} from '@ocentra/game-asset-domain/schemas/home-page-games-schema'
import {
  DEFAULT_FEATURED_SHOWCASE_CONTROLS,
  serializeFeaturedShowcaseControls,
  type FeaturedShowcaseControls,
} from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameShowcase.types'
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter'

export const FEATURED_SHOWCASE_CONTROLS_RESOURCE_PATH =
  'Content/Home/featuredShowcaseControls.json'

export const COMING_SOON_SHOWCASE_CONTROLS_RESOURCE_PATH =
  'Content/Home/comingSoonShowcaseControls.json'

type PrimitiveGroup = Record<string, number | boolean | string>
type FeaturedControlGroups = Omit<FeaturedShowcaseControls, 'variants'>

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : null
}

function mergePrimitiveGroup<T extends PrimitiveGroup>(
  defaults: T,
  value: unknown
): T {
  const record = asRecord(value)
  const next: PrimitiveGroup = { ...defaults }
  if (!record) return next as T

  for (const key of Object.keys(defaults)) {
    const defaultValue = defaults[key]
    const incoming = record[key]
    if (
      typeof defaultValue === 'number' &&
      typeof incoming === 'number' &&
      Number.isFinite(incoming)
    ) {
      next[key] = incoming
    } else if (
      typeof defaultValue === 'boolean' &&
      typeof incoming === 'boolean'
    ) {
      next[key] = incoming
    } else if (
      typeof defaultValue === 'string' &&
      typeof incoming === 'string'
    ) {
      next[key] = incoming
    }
  }

  return next as T
}

function mergeFeaturedGroups(record: Record<string, unknown> | null): FeaturedControlGroups {
  return {
    overall: mergePrimitiveGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.overall,
      record?.overall
    ),
    arrows: mergePrimitiveGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.arrows,
      record?.arrows
    ),
    header: mergePrimitiveGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.header,
      record?.header
    ),
    body: mergePrimitiveGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.body,
      record?.body
    ),
    sideA: mergePrimitiveGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideA,
      record?.sideA
    ),
    sideB: mergePrimitiveGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideB,
      record?.sideB
    ),
    footer: mergePrimitiveGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.footer,
      record?.footer
    ),
    colors: mergePrimitiveGroup(
      DEFAULT_FEATURED_SHOWCASE_CONTROLS.colors,
      record?.colors
    ),
  }
}

export function getProductionFeaturedShowcaseControls(
  controls: FeaturedShowcaseControls
): FeaturedShowcaseControls {
  return serializeFeaturedShowcaseControls(controls)
}

export function normalizeFeaturedShowcaseControls(
  value: unknown
): FeaturedShowcaseControls {
  const record = asRecord(value)
  const variants = asRecord(record?.variants)
  const merged: FeaturedShowcaseControlsData = {
    ...mergeFeaturedGroups(record),
    variants: variants
      ? {
          wide: mergeFeaturedGroups(asRecord(variants.wide)),
          narrow: mergeFeaturedGroups(asRecord(variants.narrow)),
        }
      : undefined,
  }

  return getProductionFeaturedShowcaseControls(
    FeaturedShowcaseControlsSchema.parse(merged) as FeaturedShowcaseControls
  )
}

async function loadFeaturedShowcaseControlsFileFromDisk(
  resourcePath: string
): Promise<FeaturedShowcaseControls> {
  try {
    const response = await readAsset(resourcePath)
    if (!response.ok) {
      return normalizeFeaturedShowcaseControls(null)
    }
    return normalizeFeaturedShowcaseControls(JSON.parse(await response.text()))
  } catch {
    return normalizeFeaturedShowcaseControls(null)
  }
}

async function saveFeaturedShowcaseControlsFileToDisk(
  resourcePath: string,
  controls: FeaturedShowcaseControls,
): Promise<FeaturedShowcaseControls> {
  const nextControls = normalizeFeaturedShowcaseControls(
    serializeFeaturedShowcaseControls(controls)
  )
  const payload = new TextEncoder().encode(
    `${JSON.stringify(nextControls, null, 2)}\n`
  )
  await writeAsset(resourcePath, payload)
  return nextControls
}

export async function loadFeaturedShowcaseControlsFromDisk(): Promise<FeaturedShowcaseControls> {
  return loadFeaturedShowcaseControlsFileFromDisk(FEATURED_SHOWCASE_CONTROLS_RESOURCE_PATH)
}

export async function saveFeaturedShowcaseControlsToDisk(
  controls: FeaturedShowcaseControls
): Promise<FeaturedShowcaseControls> {
  return saveFeaturedShowcaseControlsFileToDisk(
    FEATURED_SHOWCASE_CONTROLS_RESOURCE_PATH,
    controls
  )
}

export async function loadComingSoonShowcaseControlsFromDisk(): Promise<FeaturedShowcaseControls> {
  try {
    const response = await readAsset(COMING_SOON_SHOWCASE_CONTROLS_RESOURCE_PATH)
    if (response.ok) {
      return normalizeFeaturedShowcaseControls(JSON.parse(await response.text()))
    }
  } catch {
    void 0
  }
  return loadFeaturedShowcaseControlsFromDisk()
}

export async function saveComingSoonShowcaseControlsToDisk(
  controls: FeaturedShowcaseControls
): Promise<FeaturedShowcaseControls> {
  return saveFeaturedShowcaseControlsFileToDisk(
    COMING_SOON_SHOWCASE_CONTROLS_RESOURCE_PATH,
    controls
  )
}
