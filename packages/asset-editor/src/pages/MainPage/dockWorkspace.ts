import type { AssetData } from '@/types/assets'
import type { TabBase, TabData } from 'rc-dock'

export type DockPanelKind = 'resources' | 'games' | 'preview' | 'inspector'

export interface LockedAssetSnapshot {
  assetPath: string | null
  assetData: AssetData | null
  assetRawContent: string | null
  assetError: string | null
  assetLabel: string | null
}

export interface WorkspaceTabData extends TabData {
  panelKind?: DockPanelKind
  instanceId?: string
  baseTab?: boolean
  lockedSnapshot?: LockedAssetSnapshot | null
  resourceView?: 'all' | 'games'
}

export interface WorkspaceTabBase extends TabBase {
  panelKind?: DockPanelKind
  instanceId?: string
  baseTab?: boolean
  lockedSnapshot?: LockedAssetSnapshot | null
  resourceView?: 'all' | 'games'
}

export function isWorkspaceTab(value: TabBase | TabData | undefined): value is WorkspaceTabData {
  return Boolean(value && typeof value === 'object' && 'panelKind' in value)
}

export function makeWorkspaceTabId(kind: DockPanelKind): string {
  return `${kind}:${crypto.randomUUID()}`
}

export function getWorkspaceTabTitle(
  kind: DockPanelKind,
  snapshot?: LockedAssetSnapshot | null
): string {
  const baseTitle =
    kind === 'resources'
      ? 'Resources'
      : kind === 'games'
        ? 'Games'
      : kind === 'preview'
        ? 'Preview'
        : 'Inspector'

  if (!snapshot?.assetLabel) {
    return baseTitle
  }

  return `${baseTitle}: ${snapshot.assetLabel}`
}

export function cloneLockedSnapshot(
  snapshot: LockedAssetSnapshot | null
): LockedAssetSnapshot | null {
  if (!snapshot) return null

  return {
    assetPath: snapshot.assetPath,
    assetData: snapshot.assetData
      ? (JSON.parse(JSON.stringify(snapshot.assetData)) as AssetData)
      : null,
    assetRawContent: snapshot.assetRawContent,
    assetError: snapshot.assetError,
    assetLabel: snapshot.assetLabel,
  }
}
