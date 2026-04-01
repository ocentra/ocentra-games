import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';

const bootGlobal = globalThis as { __OCENTRA_BOOT_PUSH?: (l: string) => void };
const pushBoot = (label: string) => bootGlobal.__OCENTRA_BOOT_PUSH?.(label);

import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { ScriptableObjectRegistry } from '@ocentra/asset-domain/ScriptableObjectRegistry';
import { register as registerAssetType } from '@ocentra/asset-domain/registry/AssetTypeRegistry';
import { ServiceRegistry } from '@ocentra/app-core/ServiceRegistry';
import { setLogger } from '@ocentra/asset-domain/serialization/decorators';
import { initLogger as initStorageDomainLogger } from '@ocentra/storage-domain/logger/runtime';
import { initLogger as initAiDomainLogger } from '@ocentra/ai-domain/logger/runtime';
import { setGlobalAssetLoader } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { setAssetTypeValidator } from '@ocentra/asset-domain/types/assetType';
import { AssetLoader } from '@ocentra/asset-domain/loader/AssetLoader';
import { setAssetLoader } from '@ocentra/asset-domain/loader/assetLoaderContext';
import { AppStorageAdapter } from '@/adapters/assets/AppStorageAdapter';
import { prefetchRuntimeCoreSlices } from '@/adapters/assets/RuntimeAssetMaintenance';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { assetTypeMap } from '@/lib/core/registry/assetTypeMap.generated';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

setLogger({
  logWarn: (message: string, ...args: unknown[]) => {
    if (args.length > 0 && typeof args[0] === 'boolean') {
      log.logWarn(message, getStackTrace(), undefined, args[0]);
    } else {
      log.logWarn(message, getStackTrace(), args[0], args[1] as boolean | undefined);
    }
  },
  logError: (message: string, ...args: unknown[]) => {
    if (args.length > 0 && typeof args[0] === 'boolean') {
      log.logError(message, getStackTrace(), undefined, args[0]);
    } else {
      log.logError(message, getStackTrace(), args[0], args[1] as boolean | undefined);
    }
  },
});

initStorageDomainLogger({
  info: (message: string, data?: unknown) => log.logInfo(message, getStackTrace(), data),
  warn: (message: string, data?: unknown) => log.logWarn(message, getStackTrace(), data),
  error: (message: string, data?: unknown) => log.logError(message, getStackTrace(), data),
  debug: (message: string, data?: unknown) => log.logDebug(message, getStackTrace(), data),
});

initAiDomainLogger({
  info: (message: string, data?: unknown) => log.logInfo(message, getStackTrace(), data),
  warn: (message: string, data?: unknown) => log.logWarn(message, getStackTrace(), data),
  error: (message: string, data?: unknown) => log.logError(message, getStackTrace(), data),
  debug: (message: string, data?: unknown) => log.logDebug(message, getStackTrace(), data),
});

const LOG_INIT = import.meta.env.DEV;

async function timedImport<T>(label: string, loader: () => Promise<T>): Promise<T> {
  const start = performance.now();
  pushBoot(`import:${label}:start`);
  const mod = await loader();
  const ms = Number((performance.now() - start).toFixed(2));
  pushBoot(`import:${label}:end:${ms}ms`);
  logInfo(`[boot] ${label}: ${ms}ms`, undefined, LOG_INIT);
  return mod;
}

interface InitializationTask {
  name: string;
  priority: number;
  task: () => Promise<void>;
}

export class AppInitializer {
  private static instance: AppInitializer | null = null;
  private initialized: boolean = false;
  private isInitializing: boolean = false;
  private tasks: InitializationTask[] = [];

  private constructor() { }

  static getInstance(): AppInitializer {
    if (!AppInitializer.instance) {
      AppInitializer.instance = new AppInitializer();
    }
    return AppInitializer.instance;
  }

  registerTask(name: string, priority: number, task: () => Promise<void>): void {
    this.tasks.push({ name, priority, task });
    this.tasks.sort((a, b) => a.priority - b.priority);
  }

  async initialize(): Promise<void> {
    if (this.initialized || this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    const scriptableRegistrations = ScriptableObjectRegistry.getRegistrations();
    const serviceRegistrations = ServiceRegistry.getRegistrations();

    scriptableRegistrations.forEach(registration => {
      const typeName = (registration.constructor as { assetType?: string }).assetType ?? registration.constructor.name;
      registerAssetType(typeName, registration.constructor as new () => unknown);
    });

    const storageAdapter = new AppStorageAdapter();
    const assetLoader = new AssetLoader(storageAdapter);
    setAssetLoader(assetLoader);

    const initServices: Array<{ name: string; executionOrder: number }> = [];

    scriptableRegistrations.forEach(registration => {
      const className = registration.constructor.name;
      initServices.push({
        name: className,
        executionOrder: registration.executionOrder,
      });
    });

    serviceRegistrations.forEach(registration => {
      initServices.push({
        name: registration.name,
        executionOrder: registration.executionOrder,
      });
    });

    const initPhaseServices = initServices.filter(
      svc => svc.executionOrder < 0
    );

    MainAppLogger.startInitializationPhase(
      { executionOrderThreshold: 0, expectedServices: initPhaseServices },
      MainAppLogger.instance
    );

    logInfo('Starting application initialization...', undefined, LOG_INIT);

    try {
      for (const { name, priority, task } of this.tasks) {
        logInfo(`Initializing ${name} (priority: ${priority})...`, undefined, LOG_INIT);
        const startTime = performance.now();
        await task();
        const duration = performance.now() - startTime;
        logInfo(`${name} initialized in ${duration.toFixed(2)}ms`, undefined, LOG_INIT);
      }

      for (const registration of scriptableRegistrations) {
        const className = registration.constructor.name;
        logInfo(`Initializing ${className} (executionOrder: ${registration.executionOrder})...`, undefined, LOG_INIT);
        const startTime = performance.now();
        await registration.getOrCreateInstance();
        const duration = performance.now() - startTime;
        logInfo(`${className} initialized in ${duration.toFixed(2)}ms`, undefined, LOG_INIT);
      }

      for (const registration of serviceRegistrations) {
        logInfo(`Initializing ${registration.name} (executionOrder: ${registration.executionOrder})...`, undefined, LOG_INIT);
        const startTime = performance.now();
        await registration.getOrCreateInstance();
        const duration = performance.now() - startTime;
        logInfo(`${registration.name} initialized in ${duration.toFixed(2)}ms`, undefined, LOG_INIT);
      }

      setGlobalAssetLoader(async (constructor, guid) => {
        return await ScriptableObject.loadByGuid(constructor as new () => ScriptableObject, guid);
      });
      logInfo('Global asset loader configured', undefined, LOG_INIT);

      setAssetTypeValidator((type) => type in assetTypeMap);
      logInfo('Asset type validator configured', undefined, LOG_INIT);

      this.initialized = true;
      logInfo('Application initialization complete', undefined, LOG_INIT);
    } catch (error) {
      logError('Initialization failed:', { data: error });
      throw error;
    } finally {
      MainAppLogger.endInitializationPhase(MainAppLogger.instance);
      this.isInitializing = false;
    }
  }

  get isInitialized(): boolean {
    return this.initialized;
  }
}

export async function initializeCritical(): Promise<void> {
  const initializer = AppInitializer.getInstance();
  const phaseStart = performance.now();
  const logPhase = (name: string, startedAt: number) => {
    logInfo(`${name} completed`, { durationMs: Number((performance.now() - startedAt).toFixed(2)) }, LOG_INIT);
  };

  let startedAt = performance.now();
  await Promise.all([
    timedImport('eventingInit', () => import('@/lib/eventing/eventingInit')),
    timedImport('storageBootstrap', () => import('@/bootstrap/storageBootstrap')),
    timedImport('assetSingletons', () => import('@/bootstrap/assetSingletons')),
    timedImport('firebase/config', () => import('@/adapters/firebase/config')),
  ]);
  pushBoot('eventing, storage, assetSingletons, firebase (parallel)');
  logPhase('eventing + storage + assetSingletons + firebase imports', startedAt);

  startedAt = performance.now();
  await initializer.initialize();
  pushBoot('app initializer');
  logPhase('app initializer', startedAt);
  startedAt = performance.now();
  void prefetchRuntimeCoreSlices();
  pushBoot('prefetch kickoff');
  logPhase('runtime core slice prefetch kickoff', startedAt);

  startedAt = performance.now();
  const { getPlatformRuntime, PlatformRuntime } = await timedImport('platform', () => import('@ocentra/app-core/platform'));
  pushBoot('platform runtime');
  logPhase('platform runtime import', startedAt);
  if (getPlatformRuntime() === PlatformRuntime.Mobile) {
    startedAt = performance.now();
    const { registerMobileOAuthDeepLink } = await timedImport('platformOAuthHandler', () => import('@/lib/oauth/platformOAuthHandler'));
    registerMobileOAuthDeepLink();
    logPhase('mobile oauth deep link registration', startedAt);
  }

  pushBoot('initializeCritical complete');
  logInfo('initializeCritical complete', {
    totalDurationMs: Number((performance.now() - phaseStart).toFixed(2)),
  }, LOG_INIT);
}

export async function initializeApplication(): Promise<void> {
  await initializeCritical();
}
