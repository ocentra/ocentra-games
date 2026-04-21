import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger'
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace'
export { CARD_GAME_LAYOUT_DRAFT_CHANNEL } from '@ocentra/game-layout-domain/draftChannel'

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

const log = AssetEditorLogger.instance
log.register(import.meta.url)

export const ASSET_SELECTION_CHANNEL = 'ocentra-asset-editor-selection'

export function getStandalonePanelUrl(
  panel: 'preview' | 'inspector' | 'design-studio' | 'preview-canvas',
  assetPath: string,
  locked?: boolean
): string {
  const base = `${window.location.origin}${window.location.pathname || '/'}`
  const params = new URLSearchParams()
  params.set('standalone', panel)
  params.set('assetPath', assetPath)
  if (locked !== undefined) params.set('locked', String(locked))
  return `${base}?${params.toString()}`
}

export async function createPanelWindow(
  panel: 'preview' | 'inspector' | 'design-studio' | 'preview-canvas',
  assetPath: string,
  title?: string,
  locked?: boolean
): Promise<import('@tauri-apps/api/webviewWindow').WebviewWindow | undefined> {
  if (!isTauri()) return

  const { WebviewWindow, getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow')
  const url = getStandalonePanelUrl(panel, assetPath, locked)
  const label = panel === 'preview-canvas' ? 'preview-canvas-standalone' : `panel-${panel}-${Date.now()}`
  
  // Prevent duplicate canvas windows
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
      : panel === 'design-studio'
        ? { width: 1600, height: 1000 }
        : panel === 'preview-canvas'
          ? { width: 1280, height: 900 }
          : { width: 420, height: 720 }

  const webview = new WebviewWindow(label, {
    url,
    title:
      title ??
      `${panel === 'preview'
        ? 'Preview'
        : panel === 'design-studio'
          ? 'Design Studio'
          : panel === 'preview-canvas'
            ? 'Preview Canvas'
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
