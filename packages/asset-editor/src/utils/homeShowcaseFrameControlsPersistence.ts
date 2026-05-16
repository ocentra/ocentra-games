import {
  HomeShowcaseFrameControlsSchema,
  type HomeShowcaseFrameControlsData,
} from '@ocentra/game-asset-domain/schemas/home-page-games-schema'
import {
  DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS,
  serializeHomeShowcaseFrameControls,
  type HomeShowcaseFrameControls,
} from '@ocentra/core-ui/Common/HomeShowcaseFrame/HomeShowcaseFrame.types'
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter'
import type { HomeShowcaseFrameControlsKind } from '@/utils/homeShowcaseFrameControlsChannel'
import type { FeatureBannerItem } from '@ocentra/game-asset-domain/schemas/feature-banner-item-schema'

export const HOME_SHOWCASE_FRAME_CONTROLS_RESOURCE_PATHS: Record<HomeShowcaseFrameControlsKind, string> = {
  about: 'Content/Home/aboutShowcaseControls.json',
}

type PrimitiveGroup = Record<string, number | boolean | string>
type HomeFrameControlGroups = Omit<HomeShowcaseFrameControls, 'items' | 'variants'>

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

function mergeHomeFrameGroups(record: Record<string, unknown> | null): HomeFrameControlGroups {
  return {
    overall: mergePrimitiveGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.overall,
      record?.overall
    ),
    body: mergePrimitiveGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.body,
      record?.body
    ),
    sideA: mergePrimitiveGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.sideA,
      record?.sideA
    ),
    sideB: mergePrimitiveGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.sideB,
      record?.sideB
    ),
    startup: mergePrimitiveGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.startup,
      record?.startup
    ),
    copy: mergePrimitiveGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.copy,
      record?.copy
    ),
    footer: mergePrimitiveGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.footer,
      record?.footer
    ),
    colors: mergePrimitiveGroup(
      DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.colors,
      record?.colors
    ),
  }
}

function mergeFeatureBannerItems(value: unknown): FeatureBannerItem[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      const record = asRecord(item)
      const title = typeof record?.title === 'string' ? record.title : ''
      const description = typeof record?.description === 'string' ? record.description : ''
      const imageHash = typeof record?.imageHash === 'string' ? record.imageHash : ''
      return { title, description, imageHash }
    })
    .filter((item) => item.title.length > 0 || item.description.length > 0 || item.imageHash.length > 0)
}

export function getProductionHomeShowcaseFrameControls(
  controls: HomeShowcaseFrameControls
): HomeShowcaseFrameControls {
  return serializeHomeShowcaseFrameControls(controls)
}

export function normalizeHomeShowcaseFrameControls(
  value: unknown
): HomeShowcaseFrameControls {
  const record = asRecord(value)
  const variants = asRecord(record?.variants)
  const merged: HomeShowcaseFrameControlsData = {
    ...mergeHomeFrameGroups(record),
    items: mergeFeatureBannerItems(record?.items),
    variants: variants
      ? {
          wide: mergeHomeFrameGroups(asRecord(variants.wide)),
          narrow: mergeHomeFrameGroups(asRecord(variants.narrow)),
        }
      : undefined,
  }

  return getProductionHomeShowcaseFrameControls(
    HomeShowcaseFrameControlsSchema.parse(merged) as HomeShowcaseFrameControls
  )
}

export async function loadHomeShowcaseFrameControlsFromDisk(
  kind: HomeShowcaseFrameControlsKind
): Promise<HomeShowcaseFrameControls> {
  try {
    const response = await readAsset(HOME_SHOWCASE_FRAME_CONTROLS_RESOURCE_PATHS[kind])
    if (!response.ok) {
      return normalizeHomeShowcaseFrameControls(null)
    }
    return normalizeHomeShowcaseFrameControls(JSON.parse(await response.text()))
  } catch {
    return normalizeHomeShowcaseFrameControls(null)
  }
}

export async function saveHomeShowcaseFrameControlsToDisk(
  kind: HomeShowcaseFrameControlsKind,
  controls: HomeShowcaseFrameControls
): Promise<HomeShowcaseFrameControls> {
  const nextControls = normalizeHomeShowcaseFrameControls(
    serializeHomeShowcaseFrameControls(controls)
  )
  const payload = new TextEncoder().encode(
    `${JSON.stringify(nextControls, null, 2)}\n`
  )
  await writeAsset(HOME_SHOWCASE_FRAME_CONTROLS_RESOURCE_PATHS[kind], payload)
  return nextControls
}
