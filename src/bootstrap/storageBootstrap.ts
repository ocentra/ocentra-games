import { ServiceRegistry } from '@ocentra/app-core/ServiceRegistry';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { getPlatformRuntime, PlatformRuntime } from '@ocentra/app-core/platform';
import type { AsyncStorageLike } from '@ocentra/storage-domain/backends/async-storage-native-backend';

const log = MainAppLogger.instance;
log.register(import.meta.url);

const LOG_STORAGE_INIT = false;

const logInfo = (message: string, data?: unknown) => {
  log.logInfo(`[StorageBootstrap] ${message}`, getStackTrace(), data, LOG_STORAGE_INIT);
};

const logError = (message: string, data?: unknown) => {
  log.logError(`[StorageBootstrap] ${message}`, getStackTrace(), data);
};

type HostMobileBackendFactory = () => Promise<{
  get(key: string): Promise<Uint8Array | string | null>;
  set(key: string, value: Uint8Array | string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(options?: { prefix?: string; limit?: number; offset?: number }): Promise<string[]>;
}> | {
  get(key: string): Promise<Uint8Array | string | null>;
  set(key: string, value: Uint8Array | string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(options?: { prefix?: string; limit?: number; offset?: number }): Promise<string[]>;
};

let mobileBackendConfigured = false;
let desktopPathResolverConfigured = false;

interface DesktopPathResolver {
  getModelsBasePath(): string;
}

function getHostMobileBackendFactory(): HostMobileBackendFactory | null {
  const maybeFactory = (globalThis as { __OCENTRA_MOBILE_BACKEND_FACTORY?: unknown }).__OCENTRA_MOBILE_BACKEND_FACTORY;
  return typeof maybeFactory === 'function' ? (maybeFactory as HostMobileBackendFactory) : null;
}

function isAsyncStorageLike(candidate: unknown): candidate is AsyncStorageLike {
  if (!candidate || typeof candidate !== 'object') return false;
  const value = candidate as Record<string, unknown>;
  return (
    typeof value.getItem === 'function' &&
    typeof value.setItem === 'function' &&
    typeof value.removeItem === 'function' &&
    typeof value.getAllKeys === 'function'
  );
}

function isDesktopPathResolver(candidate: unknown): candidate is DesktopPathResolver {
  if (!candidate || typeof candidate !== 'object') return false;
  const value = candidate as Record<string, unknown>;
  return typeof value.getModelsBasePath === 'function';
}

function getHostDesktopPathResolver(): DesktopPathResolver | null {
  const hostResolver = (globalThis as { __OCENTRA_PATH_RESOLVER?: unknown }).__OCENTRA_PATH_RESOLVER;
  if (isDesktopPathResolver(hostResolver)) return hostResolver;

  const hostBasePath = (globalThis as { __OCENTRA_MODELS_BASE_PATH?: unknown }).__OCENTRA_MODELS_BASE_PATH;
  if (typeof hostBasePath === 'string' && hostBasePath.trim().length > 0) {
    return {
      getModelsBasePath: () => hostBasePath.trim(),
    };
  }
  return null;
}

async function configureDesktopPathResolverIfAvailable(): Promise<void> {
  if (desktopPathResolverConfigured) return;
  const resolver = getHostDesktopPathResolver();
  if (!resolver) return;
  const { setPathResolver } = await import('@ocentra/storage-domain/backends/node-fs-backend');
  setPathResolver(resolver);
  desktopPathResolverConfigured = true;
  logInfo('Configured desktop path resolver from host');
}

function isCapacitor(): boolean {
  return typeof globalThis !== 'undefined' && !!(globalThis as { Capacitor?: unknown }).Capacitor;
}

async function configureCapacitorPreferencesBackend(): Promise<boolean> {
  if (!isCapacitor()) return false;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const capStorage: AsyncStorageLike = {
      getItem: async (key) => {
        const { value } = await Preferences.get({ key });
        return value ?? null;
      },
      setItem: async (key, value) => {
        await Preferences.set({ key, value });
      },
      removeItem: async (key) => {
        await Preferences.remove({ key });
      },
      getAllKeys: async () => {
        const { keys } = await Preferences.keys();
        return keys;
      },
    };
    const { createAsyncStorageNativeBackend } = await import(
      '@ocentra/storage-domain/backends/async-storage-native-backend'
    );
    const { setMobileBackendFactory } = await import('@/bootstrap/storageBootstrapShared');
    setMobileBackendFactory(() => createAsyncStorageNativeBackend(capStorage));
    logInfo('Configured mobile storage backend from Capacitor Preferences');
    return true;
  } catch {
    return false;
  }
}

async function configureMobileBackendFactoryIfAvailable(): Promise<void> {
  if (mobileBackendConfigured) return;

  const hostFactory = getHostMobileBackendFactory();
  if (hostFactory) {
    const { setMobileBackendFactory } = await import('@/bootstrap/storageBootstrapShared');
    setMobileBackendFactory(() => hostFactory());
    mobileBackendConfigured = true;
    logInfo('Configured mobile storage backend from host factory');
    return;
  }

  if (isCapacitor()) {
    const ok = await configureCapacitorPreferencesBackend();
    if (ok) {
      mobileBackendConfigured = true;
      return;
    }
  }

  const asyncStorageModuleName = '@react-native-async-storage/async-storage';
  try {
    const module = (await import(/* @vite-ignore */ asyncStorageModuleName)) as { default?: unknown };
    const asyncStorage = module.default;
    if (!isAsyncStorageLike(asyncStorage)) {
      return;
    }
    const { createAsyncStorageNativeBackend } = await import(
      '@ocentra/storage-domain/backends/async-storage-native-backend'
    );
    const { setMobileBackendFactory } = await import('@/bootstrap/storageBootstrapShared');
    setMobileBackendFactory(() => createAsyncStorageNativeBackend(asyncStorage));
    mobileBackendConfigured = true;
    logInfo('Configured mobile storage backend from AsyncStorage');
  } catch {
    logInfo('No mobile storage backend auto-configured');
  }
}

async function runPlatformBootstrap(): Promise<void> {
  const platform = getPlatformRuntime();

  switch (platform) {
    case PlatformRuntime.Web: {
      const { bootstrapWeb } = await import('@/bootstrap/storageBootstrapWeb');
      await bootstrapWeb();
      break;
    }
    case PlatformRuntime.Desktop: {
      await configureDesktopPathResolverIfAvailable();
      const { bootstrapDesktop } = await import('@/bootstrap/storageBootstrapDesktop');
      await bootstrapDesktop();
      break;
    }
    case PlatformRuntime.Mobile: {
      await configureMobileBackendFactoryIfAvailable();
      const { bootstrapMobile } = await import('@/bootstrap/storageBootstrapMobile');
      await bootstrapMobile();
      break;
    }
  }
}

class StorageBootstrap {
  static executionOrder = -10000;

  static async getInstance(): Promise<void> {
    const platform = getPlatformRuntime();
    logInfo(`Initializing storage (platform: ${platform})...`);

    try {
      await runPlatformBootstrap();
      logInfo('Storage initialized');
    } catch (error) {
      logError('Failed to initialize storage', { error });
      throw error;
    }
  }
}

ServiceRegistry.register(
  StorageBootstrap,
  'StorageBootstrap',
  () => StorageBootstrap.getInstance()
);
