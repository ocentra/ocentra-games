import {
  HomepageLayoutControlsSchema,
  type HomepageLayoutControlsData,
} from '@ocentra/game-asset-domain/schemas/home-page-games-schema'
import { readAsset, writeAsset } from '@/adapters/assets/TauriAssetAdapter'

export const HOMEPAGE_LAYOUT_CONTROLS_RESOURCE_PATH =
  'Content/Home/homepageLayoutControls.json'

export const DEFAULT_HOMEPAGE_LAYOUT_CONTROLS: HomepageLayoutControlsData = {
  contentBoundsOverlay: false,
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : null
}

export function normalizeHomepageLayoutControls(
  value: unknown
): HomepageLayoutControlsData {
  const record = asRecord(value)
  return HomepageLayoutControlsSchema.parse({
    ...DEFAULT_HOMEPAGE_LAYOUT_CONTROLS,
    ...(record ?? {}),
  })
}

export async function loadHomepageLayoutControlsFromDisk(): Promise<HomepageLayoutControlsData> {
  try {
    const response = await readAsset(HOMEPAGE_LAYOUT_CONTROLS_RESOURCE_PATH)
    if (!response.ok) {
      return normalizeHomepageLayoutControls(null)
    }
    return normalizeHomepageLayoutControls(JSON.parse(await response.text()))
  } catch {
    return normalizeHomepageLayoutControls(null)
  }
}

export async function saveHomepageLayoutControlsToDisk(
  controls: HomepageLayoutControlsData
): Promise<HomepageLayoutControlsData> {
  const nextControls = normalizeHomepageLayoutControls(controls)
  const payload = new TextEncoder().encode(
    `${JSON.stringify(nextControls, null, 2)}\n`
  )
  await writeAsset(HOMEPAGE_LAYOUT_CONTROLS_RESOURCE_PATH, payload)
  return nextControls
}
