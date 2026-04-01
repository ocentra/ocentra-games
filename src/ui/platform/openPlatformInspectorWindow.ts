import { getPlatformRuntime, PlatformRuntime } from '@ocentra/app-core/platform';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

export const PLATFORM_INSPECTOR_ROUTE = '/__dev/platform-inspector';

const log = MainAppLogger.instance;
log.register(import.meta.url);

function buildInspectorUrl(): string {
  const url = new URL(PLATFORM_INSPECTOR_ROUTE, window.location.origin);
  url.searchParams.set('inspector', '1');
  url.searchParams.set('sourcePath', `${window.location.pathname}${window.location.search}`);
  return url.toString();
}

export async function openPlatformInspectorWindow(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const runtime = getPlatformRuntime();
  if (runtime === PlatformRuntime.Mobile) {
    return;
  }

  const url = buildInspectorUrl();

  if (
    runtime === PlatformRuntime.Desktop &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  ) {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const label = `platform-inspector-${Date.now()}`;
    const webview = new WebviewWindow(label, {
      url,
      title: 'Developer Tools',
      width: 430,
      height: 780,
      resizable: true,
      decorations: true,
      focus: true,
    });

    webview.once('tauri://error', (event) => {
      log.logError('[openPlatformInspectorWindow] Failed to create window', getStackTrace(), { event });
    });
    return;
  }

  window.open(
    url,
    'ocentra-platform-inspector',
    'popup=yes,width=430,height=780,resizable=yes,scrollbars=yes'
  );
}
