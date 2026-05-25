import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger'
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace'
import { applyDevAuthQueryToUrl } from '@/utils/devAuth'
export { CARD_GAME_LAYOUT_DRAFT_CHANNEL } from '@ocentra/game-layout-domain/draftChannel'

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

const log = AssetEditorLogger.instance
log.register(import.meta.url)

export const ASSET_SELECTION_CHANNEL = 'ocentra-asset-editor-selection'

export interface PanelWindowHandle {
  close: () => Promise<void> | void
  once: (event: 'tauri://destroyed', handler: () => void) => void
}

type StandalonePanelKind =
  | 'preview'
  | 'inspector'
  | 'design-studio'
  | 'preview-canvas'
  | 'isolation'
  | 'featured-showcase-controls'
  | 'homepage-layout-controls'
  | 'lobby-page-layout-controls'
  | 'leaderboard-page-layout-controls'
  | 'shop-page-layout-controls'
  | 'competition-page-layout-controls'
  | 'auth-page-layout-controls'
  | 'selected-game-layout-controls'
  | 'games-catalog-layout-controls'
  | 'page-layout-controls'

function isLayoutControlsPanel(panel: StandalonePanelKind): boolean {
  return panel === 'featured-showcase-controls' ||
    panel === 'homepage-layout-controls' ||
    panel === 'lobby-page-layout-controls' ||
    panel === 'leaderboard-page-layout-controls' ||
    panel === 'shop-page-layout-controls' ||
    panel === 'competition-page-layout-controls' ||
    panel === 'auth-page-layout-controls' ||
    panel === 'selected-game-layout-controls' ||
    panel === 'games-catalog-layout-controls' ||
    panel === 'page-layout-controls'
}

export function getStandalonePanelUrl(
  panel: StandalonePanelKind,
  assetPath: string,
  locked?: boolean,
  playerCount?: number
): string {
  const base = `${window.location.origin}${window.location.pathname || '/'}`
  const params = new URLSearchParams()
  params.set('standalone', panel)
  params.set('assetPath', assetPath)
  if (locked !== undefined) params.set('locked', String(locked))
  if (playerCount !== undefined) params.set('playerCount', String(playerCount))
  return applyDevAuthQueryToUrl(`${base}?${params.toString()}`)
}

export async function createPanelWindow(
  panel: StandalonePanelKind,
  assetPath: string,
  title?: string,
  locked?: boolean,
  playerCount?: number
): Promise<PanelWindowHandle | undefined> {
  const url = getStandalonePanelUrl(panel, assetPath, locked, playerCount)
  const label = panel === 'preview-canvas' ? 'preview-canvas-standalone' : `panel-${panel}`

  if (!isTauri()) {
    const popup = window.open(
      url,
      label,
      'popup=yes,width=1600,height=900,resizable=yes,scrollbars=yes'
    )

    if (!popup) {
      log.logWarn('[createPanelWindow] Browser popup was blocked', getStackTrace(), {
        panel,
        assetPath,
        url,
      })
      window.location.assign(url)
      return {
        close: () => undefined,
        once: () => undefined,
      }
    }

    popup.focus()

    return {
      close: () => {
        popup.close()
      },
      once: (_event, handler) => {
        const intervalId = window.setInterval(() => {
          if (popup.closed) {
            window.clearInterval(intervalId)
            handler()
          }
        }, 300)
      },
    }
  }

  const { WebviewWindow, getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')
  
  const windows = await getAllWebviewWindows();
  const existing = windows.find((w: import('@tauri-apps/api/webviewWindow').WebviewWindow) => w.label === label);
  if (existing) {
    await existing.show();
    await existing.unminimize();
    await existing.setFocus();
    return existing;
  }

  const size =
    panel === 'preview'
      ? { width: 1100, height: 720 }
      : isLayoutControlsPanel(panel)
        ? { width: 980, height: 860 }
      : panel === 'design-studio'
        ? { width: 1600, height: 1000 }
        : panel === 'preview-canvas'
          ? { width: 1600, height: 900 }
          : panel === 'isolation'
            ? { width: 900, height: 800 }
            : { width: 420, height: 720 }

  const webview = new WebviewWindow(label, {
    url,
    title:
      title ??
      `${panel === 'preview'
        ? 'Preview'
        : isLayoutControlsPanel(panel)
          ? 'Layout Controls'
        : panel === 'design-studio'
          ? 'Design Studio'
          : panel === 'preview-canvas'
            ? 'Preview Canvas'
            : panel === 'isolation'
              ? 'Isolation Hub'
              : 'Inspector'}: ${assetPath.split('/').pop() ?? assetPath}`,
    width: size.width,
    height: size.height,
    resizable: true,
    decorations: true,
  })

  webview.once('tauri://error', (e) => {
    log.logError('[createPanelWindow] Failed to create window', getStackTrace(), { error: e })
  })
  
  return webview;
}
