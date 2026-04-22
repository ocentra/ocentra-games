import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { MainAppPathResolver } from '@ocentra/logging-domain/core/adapters/mainAppPathResolver';
import { LogConsumer } from '@ocentra/logging-domain/transport/bridgeLogPayload';
import { RunType, LogEnvironment } from '@ocentra/logging-domain/test-log/types';
import { PUBLIC_TUNNEL_BRIDGE_URL } from '@ocentra/logging-domain/core/constants';
import { TauriTransport } from '@ocentra/logging-domain/transport/tauriTransport';
import { deleteAppNdjsonFiles } from '@ocentra/logging-domain/app-log/appNdjsonWriter';

const pathResolver = new MainAppPathResolver({
  getFilePathFromUrl: (url: string) => url,
  getSourceFromFilePath: () => 'AssetEditor:app',
});

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Use session storage to keep the same runId across reloads of the same tab
const getSessionRunId = () => {
  try {
    let id = sessionStorage.getItem('asset-editor-run-id');
    if (!id) {
      id = `editor-session-${generateUUID()}`;
      sessionStorage.setItem('asset-editor-run-id', id);
    }
    return id;
  } catch {
    return `editor-fallback-${Date.now()}`;
  }
};

const sessionRunId = getSessionRunId();

const requestContextProvider = {
  getCurrentContext: () => ({
    runId: sessionRunId,
    testName: 'AssetEditor',
    runType: RunType.Single,
    suiteType: 'editor',
    correlationId: generateUUID(),
    startTime: Date.now(),
    debugModules: [],
    origin: 'AssetEditor',
    environment: LogEnvironment.Dev,
  })
};

let initialized = false;
let flushInterval: ReturnType<typeof setInterval> | null = null;

export function initAssetEditorLogging(): void {
  if (initialized) return;
  initialized = true;

  AssetEditorLogger.initLogger(null, pathResolver, { 
    consoleEnabled: true,
    bridgeEndpoint: PUBLIC_TUNNEL_BRIDGE_URL,
    bridgeConsumer: LogConsumer.AssetEditor,
  }, requestContextProvider);

  // Clean up old logs, keeping the last 10 sessions
  if (typeof process !== 'undefined' && process.versions?.node) {
     deleteAppNdjsonFiles('asset-editor', 10);
  }

  // Add Tauri native transport if running in Tauri
  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  if (isTauri) {
    import('@tauri-apps/api/core').then(({ invoke }) => {
      AssetEditorLogger.instance.addTransport(new TauriTransport(invoke));
    }).catch(err => {
      // eslint-disable-next-line no-console
      console.error('[Logging] Failed to initialize Tauri transport:', err);
    });
  }

  // Periodic flush to ensure logs reach the bridge
  if (flushInterval) clearInterval(flushInterval);
  flushInterval = setInterval(() => {
    void AssetEditorLogger.instance.flushLogQueue();
    
    // Also try to trigger a flush on the bridge server itself if we can
    const endpoint = AssetEditorLogger.instance.getConfig().bridgeEndpoint;
    if (endpoint && sessionRunId) {
       const flushUrl = new URL('/__flush__', endpoint);
       flushUrl.searchParams.set('runId', sessionRunId);
       fetch(flushUrl.toString(), { method: 'POST', mode: 'no-cors' }).catch(() => {});
    }
  }, 10000); // Flush every 10 seconds
}
