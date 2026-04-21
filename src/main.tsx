import 'reflect-metadata'
import { StrictMode, type ReactNode } from 'react'

type BootPush = (label: string) => void;
type BootGlobal = typeof globalThis & {
  __OCENTRA_BOOT_TRACE?: Array<Record<string, unknown>>;
  __OCENTRA_BOOT_PUSH?: BootPush;
  __OCENTRA_BOOT_STARTED_AT?: number;
};
const bootGlobal = globalThis as BootGlobal;
const pushBoot = (label: string) => bootGlobal.__OCENTRA_BOOT_PUSH?.(label);
import { createRoot, type Root } from 'react-dom/client'
import './index.css'
import AppWrapper from './App.tsx'
import { initializeCritical } from '@/lib/core/AppInitializer';
import { setupApiClientWithAuthBridge } from '@/lib/core/apiBootstrap';
import { createProfileReporter } from '@/lib/core/mainProfileReport';
import { initMainLogging } from '@/lib/core/mainLoggingBootstrap';
import { logStorageConfigAtStartup } from '@/services/storage/mainStorageBootstrap';

pushBoot('main.tsx module execution started');
const profileTimeToMainMs = typeof window !== 'undefined' ? Math.round(performance.now()) : 0;
const sendProfileReport = createProfileReporter(bootGlobal, profileTimeToMainMs);

const { logInfo, logError } = initMainLogging(import.meta.url);
pushBoot('post initLogging');
setupApiClientWithAuthBridge();
logStorageConfigAtStartup(pushBoot);

const appStartTime = performance.now();

const INIT_TIMEOUT_MS = 10000;
const LOG_STARTUP = import.meta.env.DEV;

function renderApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    logError('Root element not found');
    return;
  }

  logInfo('Rendering React app...', LOG_STARTUP);
  renderRoot(
      <StrictMode>
        <AppWrapper />
      </StrictMode>
  );
}

let root: Root | null = null;
let hasRendered = false;

function renderRoot(node: ReactNode): void {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    logError('Root element not found');
    return;
  }

  root ??= createRoot(rootElement);
  if (typeof window !== 'undefined') {
    (globalThis as unknown as Record<string, unknown>).__hideAppLoading = () => {
      const loader = document.getElementById('app-loading');
      if (loader) {
        loader.classList.add('hide');
        const applyHidden = () => {
          if (!loader.classList.contains('hidden')) loader.classList.add('hidden');
        };
        loader.addEventListener('transitionend', (e) => {
          if (e.target === loader) applyHidden();
        }, { once: true });
        setTimeout(applyHidden, 2000);
      }
    };
  }
  hasRendered = true;
  root.render(node);
  if (typeof window !== 'undefined') {
    window.requestAnimationFrame(() => {
      pushBoot('first rAF after render');
      const totalDuration = performance.now() - appStartTime;
      logInfo('First animation frame after render', { totalDurationMs: Number(totalDuration.toFixed(2)) }, LOG_STARTUP);
    });
  }
}

const initStartTime = performance.now();
const bootTrace = Array.isArray(bootGlobal.__OCENTRA_BOOT_TRACE) ? bootGlobal.__OCENTRA_BOOT_TRACE : undefined;
logInfo('Starting application initialization...', {
  timestamp: initStartTime,
  rootPresent: !!document.getElementById('root'),
  readyState: document.readyState,
  bootTrace: bootTrace,
}, LOG_STARTUP);
pushBoot('pre initializeCritical');

initializeCritical()
  .then(async () => {
    pushBoot('post initializeCritical');
    const { waitForAuthResolution } = await import('@/adapters/firebase/config');
    // Firebase must be initialized (via initializeCritical) before this.
    await waitForAuthResolution();
    pushBoot('post awaitAuth');
    const initEndTime = performance.now();
    const initDuration = initEndTime - initStartTime;
    const totalDuration = initEndTime - appStartTime;
    logInfo('Initialization complete', {
      initDurationMs: Number(initDuration.toFixed(2)),
      totalDurationMs: Number(totalDuration.toFixed(2)),
    }, LOG_STARTUP);
    if (bootTrace) {
      logInfo('[boot:index] full trace (copy-paste)', { bootTrace }, LOG_STARTUP);
    }
    pushBoot('pre renderApp');
    renderApp();
    sendProfileReport({
      initDurationMs: Number(initDuration.toFixed(2)),
      totalDurationMs: Number(totalDuration.toFixed(2)),
    });
    const { prefetchDeferredChunks } = await import('@/bootstrap/prefetchDeferredChunks');
    prefetchDeferredChunks();
    if (import.meta.env.DEV) {
      const { startLocalAssetVersionPoll } = await import('@/lib/localAssetVersionPoll');
      startLocalAssetVersionPoll();
    }
  })
  .catch((error) => {
    pushBoot('bootstrap failed');
    logError('Failed to initialize application:', { data: error });
    if (document.getElementById('root')) {
      renderRoot(
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
          <h1>Initialization Error</h1>
          <p>Failed to initialize application registries.</p>
          <pre>{error instanceof Error ? error.stack : String(error)}</pre>
        </div>
      );
      ((globalThis as Record<string, unknown>).__hideAppLoading as (() => void) | undefined)?.();
    }
  });

setTimeout(() => {
  if (!hasRendered) {
    logError('Initialization timeout, rendering app anyway', {
      timeoutMs: INIT_TIMEOUT_MS,
      totalDurationMs: Number((performance.now() - appStartTime).toFixed(2)),
    });
    renderApp();
  }
}, INIT_TIMEOUT_MS);
