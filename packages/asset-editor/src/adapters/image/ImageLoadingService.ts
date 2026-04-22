import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { ImageLoadRequestEvent } from '@ocentra/eventing-domain/events/image/ImageLoadRequestEvent';
import { ImageLoadedEvent } from '@ocentra/eventing-domain/events/image/ImageLoadedEvent';
import { ImageLoadFailedEvent } from '@ocentra/eventing-domain/events/image/ImageLoadFailedEvent';
import { ImageUnsubscribeEvent } from '@ocentra/eventing-domain/events/image/ImageUnsubscribeEvent';
import { ImageBatchLoadRequestEvent, ImageLoadPriority } from '@ocentra/eventing-domain/events/image/ImageBatchLoadRequestEvent';
import { ImageBatchLoadedEvent, type ImageBatchResult } from '@ocentra/eventing-domain/events/image/ImageBatchLoadedEvent';
import { GetResourceEvent } from '@ocentra/eventing-domain/events/assets/GetResourceEvent';
import {
  ProcessingState,
  ImageVariant,
  type CachedImage,
} from '@/lib/cache/editorImageTypes';
import { TauriImageCacheAdapter } from '@/adapters/image/TauriImageCacheAdapter';
import { TIMEOUTS, CACHE_LIMITS } from '@/lib/cache/editorCacheConstants';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { ServiceRegistry } from '@ocentra/app-core/ServiceRegistry';
import type { MetaData } from '@ocentra/eventing-domain/types/meta';
import { type ImageHash, type AssetIdentifier, tryAssetIdentifier } from '@ocentra/asset-domain/types/assetIdentifier';
import type { ResourceRequest } from '@ocentra/boundary-domain/types/resource-request';

const validateIdentifier = (input: string): ImageIdentifier | null => {
  return tryAssetIdentifier(input) as ImageIdentifier | null;
};

type ImageIdentifier = AssetIdentifier | ImageHash;

const LOG_IMAGE = import.meta.env.VITE_ASSET_EDITOR_LOG_IMAGES === 'true';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);

const logInfo = (message: string, data?: unknown) => {
  if (LOG_IMAGE) {
    log.logInfo(`[ImageLoadingService] ${message}`, getStackTrace(), data);
  }
};

const logError = (message: string, data?: unknown) => {
  if (LOG_IMAGE) {
    log.logError(`[ImageLoadingService] ${message}`, getStackTrace(), data);
  }
};

const logWarn = (message: string, data?: unknown) => {
  if (LOG_IMAGE) {
    log.logWarn(`[ImageLoadingService] ${message}`, getStackTrace(), data);
  }
};

function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  if (signals.length === 0) {
    const controller = new AbortController();
    return controller.signal;
  }
  if (signals.length === 1) {
    return signals[0];
  }
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals);
  }
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return controller.signal;
}

type LoadingState = 'idle' | 'loading' | 'loaded' | 'failed';

interface ImageState {
  subscribers: Set<string>;
  state: LoadingState;
  blobUrl: string | null;
  loadPromise: Promise<void> | null;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  variant: ImageVariant;
  isProcessing: boolean;
  lastAccessed: number;
  retryCount: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
}

interface QueuedFetch {
  hash: ImageIdentifier;
  variant: ImageVariant;
  priority: number;
  resolve: () => void;
  timestamp: number;
  abortController: AbortController;
}

interface ImageCacheAdapter {
  getCachedImageByHash(hash: string, variant?: ImageVariant): Promise<CachedImage | null>;
  cacheImage(
    hash: string,
    blob: Blob,
    variant: ImageVariant,
    etag?: string,
    contentType?: string,
    processingState?: ProcessingState,
    path?: string
  ): Promise<void>;
  calculateImageHash(blob: Blob): Promise<string>;
}

interface ServiceMetrics {
  memoryCacheHits: number;
  indexedDBCacheHits: number;
  networkFetches: number;
  networkCacheHits: number;
  failedFetches: number;
  retryAttempts: number;
  totalRequests: number;
  averageFetchTime: number;
  fetchTimes: number[];
  cacheHitRate?: number;
}

export class ImageLoadingService {
  static executionOrder = -90;

  private static instance: ImageLoadingService | null = null;
  private static initPromise: Promise<ImageLoadingService> | null = null;

  private readonly imageCache: ImageCacheAdapter;
  private readonly imageStates = new Map<string, ImageState>();
  private readonly activeFetches = new Map<string, Promise<{ blob: Blob; etag?: string; contentType?: string }>>();
  private readonly activeFetchControllers = new Map<string, AbortController>();

  private getVariantKey(hash: ImageIdentifier, variant: ImageVariant): string {
    return `${hash}:${variant}`;
  }

  static getVariantKeyStatic(hash: ImageIdentifier, variant: ImageVariant): string {
    return `${hash}:${variant}`;
  }
  private readonly maxConcurrentFetches = TIMEOUTS.MAX_CONCURRENT_FETCHES;
  private readonly maxMemoryCacheSize = CACHE_LIMITS.MAX_MEMORY_CACHE_SIZE;
  private readonly memoryEvictionThreshold = Math.floor(this.maxMemoryCacheSize * CACHE_LIMITS.MEMORY_CACHE_EVICTION_THRESHOLD);
  private runningFetches = 0;
  private fetchQueue: QueuedFetch[] = [];
  private pendingBatchRequests = new Map<string, Set<string>>();
  private metrics: ServiceMetrics = {
    memoryCacheHits: 0,
    indexedDBCacheHits: 0,
    networkFetches: 0,
    networkCacheHits: 0,
    failedFetches: 0,
    retryAttempts: 0,
    totalRequests: 0,
    averageFetchTime: 0,
    fetchTimes: [],
  };
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private constructor() {
    this.imageCache = TauriImageCacheAdapter;
    this.setupPeriodicCleanup();
    this.setupMemoryPressureDetection();
  }

  static {
    this.registerService();
    this.setupEventSubscriptions();
  }

  private static registerService(): void {
    ServiceRegistry.register(
      this as { executionOrder?: number },
      'ImageLoadingService',
      () => this.getInstance()
    );
  }

  private static setupEventSubscriptions(): void {
    logInfo('Setting up event subscriptions');
    const bus = EventBus.instance;
    bus.subscribe(ImageLoadRequestEvent, (event: ImageLoadRequestEvent) => {
      logInfo('Received ImageLoadRequestEvent', { hash: event.hash });
      void ImageLoadingService.getInstance().then(service => {
        service.handleLoadRequest(event);
      });
    });
    bus.subscribe(ImageBatchLoadRequestEvent, (event: ImageBatchLoadRequestEvent) => {
      void ImageLoadingService.getInstance().then(service => {
        service.handleBatchLoadRequest(event);
      });
    });
    bus.subscribe(ImageUnsubscribeEvent, (event: ImageUnsubscribeEvent) => {
      void ImageLoadingService.getInstance().then(service => service.handleUnsubscribe(event));
    });
  }

  static getInstance(): Promise<ImageLoadingService> {
    if (this.instance) {
      return Promise.resolve(this.instance);
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initialize();
    return this.initPromise;
  }

  static getLoadedImageUrl(hash: ImageIdentifier, variant: ImageVariant = ImageVariant.Full): string | null {
    if (!this.instance) {
      return null;
    }
    const validatedHash = validateIdentifier(hash);
    if (!validatedHash) {
      return null;
    }
    const variantKey = this.getVariantKeyStatic(validatedHash, variant);
    const imageState = this.instance.imageStates.get(variantKey);
    if (imageState?.state === 'loaded' && imageState.blobUrl) {
      return imageState.blobUrl;
    }
    return null;
  }

  private static async initialize(): Promise<ImageLoadingService> {
    const instance = new ImageLoadingService();
    this.instance = instance;
    logInfo('Service initialized');
    return instance;
  }

  private setupPeriodicCleanup(): void {
    setInterval(() => {
      this.evictMemoryCache();
      this.cleanupStaleDebounceTimers();
    }, 30000);
  }

  private setupMemoryPressureDetection(): void {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memInfo = (performance as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
        if (memInfo) {
          const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
          if (usageRatio > 0.85) {
            logWarn('High memory usage detected, aggressive eviction', { usageRatio });
            this.aggressiveEviction();
          }
        }
      };
      setInterval(checkMemory, 60000);
    }
  }

  private cleanupStaleDebounceTimers(): void {
    const now = Date.now();
    for (const [identifierKey, timer] of this.debounceTimers.entries()) {
      if (now - (timer as unknown as number) > TIMEOUTS.DEBOUNCE_DELAY_MS * 10) {
        clearTimeout(timer);
        this.debounceTimers.delete(identifierKey);
      }
    }
  }

  private handleLoadRequest(event: ImageLoadRequestEvent): void {
    const validatedHash = validateIdentifier(event.hash);
    if (!validatedHash) {
      return;
    }
    const hash = validatedHash;
    this.metrics.totalRequests++;

    const existingTimer = this.debounceTimers.get(hash);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const debouncedHandler = () => {
      this.debounceTimers.delete(hash);
      this.processLoadRequest(hash, event.subscriberId, event.priority, event.variant, event.meta);
    };

    const timer = setTimeout(debouncedHandler, TIMEOUTS.DEBOUNCE_DELAY_MS);
    this.debounceTimers.set(hash, timer);
  }

  private processLoadRequest(hash: ImageIdentifier, subscriberId: string, priority: number, variant: ImageVariant = ImageVariant.Full, meta?: MetaData): void {
    const variantKey = this.getVariantKey(hash, variant);
    let imageState = this.imageStates.get(variantKey);

    if (!imageState) {
      imageState = {
        subscribers: new Set(),
        state: 'idle',
        blobUrl: null,
        loadPromise: null,
        cleanupTimer: null,
        variant: variant,
        isProcessing: false,
        lastAccessed: Date.now(),
        retryCount: 0,
        retryTimer: null,
      };
      this.imageStates.set(variantKey, imageState);
    }

    imageState.subscribers.add(subscriberId);
    imageState.lastAccessed = Date.now();

    if (imageState.state === 'loaded' && imageState.blobUrl && imageState.variant === variant) {
      this.metrics.memoryCacheHits++;
      if (this.pendingBatchRequests.has(subscriberId)) {
        EventBus.instance.publish(
          new ImageBatchLoadedEvent(
            [{ hash: hash as unknown as ImageHash, variant, blobUrl: imageState.blobUrl, source: 'memory', error: null }],
            subscriberId
          )
        );
      } else {
        EventBus.instance.publish(new ImageLoadedEvent(hash as unknown as ImageHash, variant, imageState.blobUrl, 'memory'));
      }
      return;
    }

    if (imageState.state === 'loading' && imageState.isProcessing && imageState.variant === variant) {
      return;
    }

    if (imageState.state === 'failed') {
      if (imageState.retryCount < TIMEOUTS.RETRY_MAX_ATTEMPTS) {
        imageState.state = 'idle';
      } else {
        logWarn(`Max retries reached for ${hash} [${variant}]`);
        return;
      }
    }

    this.startLoading(hash, priority, variant, meta);
  }

  private async handleBatchLoadRequest(event: ImageBatchLoadRequestEvent): Promise<void> {

    if (event.replaceExisting) {
      const existingIdentifiers = this.pendingBatchRequests.get(event.subscriberId);
      if (existingIdentifiers) {
        for (const variantKey of existingIdentifiers) {
          const keyParts = variantKey.split(':');
          if (keyParts.length === 2) {
            const hash = validateIdentifier(keyParts[0]);
            const variant = keyParts[1] as ImageVariant;
            if (hash && !this.isCurrentlyProcessing(hash, variant)) {
              this.updateQueuePriority(hash, variant, ImageLoadPriority.LOW);
            }
          }
        }
        existingIdentifiers.clear();
      }
    }

    const results: ImageBatchResult[] = [];
    const requestsToQueue: Array<{ hash: ImageIdentifier; variant: ImageVariant; priority: number }> = [];
    const subscriberIdentifiers = this.pendingBatchRequests.get(event.subscriberId) || new Set<string>();
    this.pendingBatchRequests.set(event.subscriberId, subscriberIdentifiers);


    for (let i = 0; i < event.requests.length; i++) {
      const request = event.requests[i];
      const variantKey = this.getVariantKey(request.hash, request.variant);
      subscriberIdentifiers.add(variantKey);
      const validatedHash = validateIdentifier(request.hash);
      if (!validatedHash) {
        continue;
      }
      const hash = validatedHash;

      const imageState = this.imageStates.get(variantKey);

      if (imageState?.state === 'loaded' && imageState.blobUrl && imageState.variant === request.variant) {
        results.push({
          hash: hash as unknown as ImageHash,
          variant: request.variant,
          blobUrl: imageState.blobUrl,
          source: 'memory',
          error: null,
        });
        continue;
      }

      if (this.isCurrentlyProcessing(hash, request.variant)) {
        requestsToQueue.push({ hash, variant: request.variant, priority: request.priority });
        continue;
      }

      try {
        const cached = await this.imageCache.getCachedImageByHash(hash, request.variant);
        if (cached) {
          this.metrics.indexedDBCacheHits++;
          try {
            const blobUrl = URL.createObjectURL(cached.blob);

            if (!imageState) {
              const newImageState: ImageState = {
                subscribers: new Set<string>(),
                state: 'loaded' as LoadingState,
                blobUrl,
                loadPromise: null,
                cleanupTimer: null,
                variant: request.variant,
                isProcessing: false,
                lastAccessed: Date.now(),
                retryCount: 0,
                retryTimer: null,
              };
              this.imageStates.set(variantKey, newImageState);
            } else {
              imageState.state = 'loaded';
              imageState.blobUrl = blobUrl;
              imageState.lastAccessed = Date.now();
            }

            results.push({
              hash: hash as unknown as ImageHash,
              variant: request.variant,
              blobUrl,
              source: 'indexeddb',
              error: null,
            });
            continue;
          } catch (blobError) {
            logError(`Failed to create blob URL from cache: ${hash}`, { blobError });
          }
        }
      } catch (cacheError) {
        logError(`Cache lookup failed: ${hash}`, { cacheError });
      }

      const queueIndex = this.fetchQueue.findIndex(item => item.hash === hash && item.variant === request.variant);
      if (queueIndex !== -1 && !this.isCurrentlyProcessing(hash, request.variant)) {
        const queuedItem = this.fetchQueue[queueIndex];
        queuedItem.priority = request.priority;
        this.fetchQueue.sort((a, b) => b.priority - a.priority);
        continue;
      }

      requestsToQueue.push({ hash, variant: request.variant, priority: request.priority });
    }

    for (const { hash, variant, priority } of requestsToQueue) {
      const variantKey = this.getVariantKey(hash, variant);
      let imageState = this.imageStates.get(variantKey);
      if (!imageState) {
        imageState = {
          subscribers: new Set(),
          state: 'idle',
          blobUrl: null,
          loadPromise: null,
          cleanupTimer: null,
          variant: variant,
          isProcessing: false,
          lastAccessed: Date.now(),
          retryCount: 0,
          retryTimer: null,
        };
        this.imageStates.set(variantKey, imageState);
      }
      imageState.subscribers.add(event.subscriberId);
      imageState.lastAccessed = Date.now();

      if (imageState.state === 'loading' && imageState.isProcessing) {
        const existingLoadPromise = imageState.loadPromise;
        if (existingLoadPromise) {
          existingLoadPromise.then(() => {
            const updatedImageState = this.imageStates.get(variantKey);
            if (updatedImageState?.state === 'loaded' && updatedImageState.blobUrl && updatedImageState.variant === variant) {
              EventBus.instance.publish(
                new ImageBatchLoadedEvent(
                  [{ hash: hash as unknown as ImageHash, variant, blobUrl: updatedImageState.blobUrl, source: 'network', error: null }],
                  event.subscriberId
                )
              );
            }
          }).catch(() => { });
        }
        continue;
      }

      if (imageState.state === 'failed' && imageState.retryCount >= TIMEOUTS.RETRY_MAX_ATTEMPTS) {
        results.push({
          hash: hash as unknown as ImageHash,
          variant,
          blobUrl: null,
          source: null,
          error: 'Max retries reached',
        });
        continue;
      }

      if (imageState.state === 'failed') {
        imageState.state = 'idle';
      }

      imageState.variant = variant;
      imageState.isProcessing = true;
      imageState.loadPromise = this.startLoading(hash, priority, variant).then(() => {
        const updatedImageState = this.imageStates.get(variantKey);
        if (updatedImageState?.state === 'loaded' && updatedImageState.blobUrl && updatedImageState.variant === variant) {
          EventBus.instance.publish(
            new ImageBatchLoadedEvent(
              [{ hash: hash as unknown as ImageHash, variant, blobUrl: updatedImageState.blobUrl, source: 'network', error: null }],
              event.subscriberId
            )
          );
        }
        imageState.loadPromise = null;
        imageState.isProcessing = false;
      }).catch((error) => {
        logError(`Failed to load image: ${hash}`, { error });
        EventBus.instance.publish(
          new ImageBatchLoadedEvent(
            [{ hash: hash as unknown as ImageHash, variant, blobUrl: null, source: null, error: error instanceof Error ? error.message : String(error) }],
            event.subscriberId
          )
        );
        imageState.loadPromise = null;
        imageState.isProcessing = false;
      });
    }

    if (results.length > 0) {
      EventBus.instance.publish(new ImageBatchLoadedEvent(results, event.subscriberId));
    }
  }

  private handleUnsubscribe(event: ImageUnsubscribeEvent): void {
    const validatedHash = validateIdentifier(event.hash);
    if (!validatedHash) {
      return;
    }
    const hash = validatedHash;

    for (const [variantKey, imageState] of this.imageStates.entries()) {
      if (variantKey.startsWith(`${hash}:`)) {
        imageState.subscribers.delete(event.subscriberId);

        if (imageState.subscribers.size === 0) {
          if (imageState.cleanupTimer) {
            clearTimeout(imageState.cleanupTimer);
          }

          if (imageState.retryTimer) {
            clearTimeout(imageState.retryTimer);
            imageState.retryTimer = null;
          }

          const variant = imageState.variant;
          this.cancelFetchIfNoSubscribers(hash, variant);

          imageState.cleanupTimer = setTimeout(() => {
            if (imageState.subscribers.size === 0 && imageState.blobUrl) {
              URL.revokeObjectURL(imageState.blobUrl);
              imageState.blobUrl = null;
              if (imageState.state === 'loaded') {
                imageState.state = 'idle';
              }
            }
            imageState.cleanupTimer = null;
            this.evictMemoryCache();
          }, TIMEOUTS.MEMORY_CLEANUP_DELAY_MS);
        }
      }
    }
  }

  private cancelFetchIfNoSubscribers(hash: ImageIdentifier, variant: ImageVariant): void {
    const variantKey = this.getVariantKey(hash, variant);
    const imageState = this.imageStates.get(variantKey);
    if (!imageState || imageState.subscribers.size > 0) {
      return;
    }

    const queueIndex = this.fetchQueue.findIndex(item => item.hash === hash && item.variant === variant);
    if (queueIndex !== -1) {
      const queuedItem = this.fetchQueue[queueIndex];
      queuedItem.abortController.abort();
      this.fetchQueue.splice(queueIndex, 1);
      queuedItem.resolve();
      logInfo(`Cancelled queued fetch (no subscribers): ${variantKey}`);
      return;
    }

    const activeController = this.activeFetchControllers.get(variantKey);
    if (activeController) {
      logInfo(`Continuing background fetch (no subscribers, will cache): ${hash}`);
    }
  }

  private evictMemoryCache(): void {
    if (this.imageStates.size <= this.memoryEvictionThreshold) {
      return;
    }

    const entries = Array.from(this.imageStates.entries())
      .filter(([, state]) => state.subscribers.size === 0 && state.state === 'idle')
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    const excess = this.imageStates.size - this.memoryEvictionThreshold;
    const evictCount = Math.min(entries.length, excess);

    for (let i = 0; i < evictCount; i++) {
      const [identifierKey, state] = entries[i];
      if (state.subscribers.size === 0 && state.state === 'idle') {
        if (state.blobUrl) {
          URL.revokeObjectURL(state.blobUrl);
        }
        if (state.cleanupTimer) {
          clearTimeout(state.cleanupTimer);
        }
        if (state.retryTimer) {
          clearTimeout(state.retryTimer);
        }
        this.imageStates.delete(identifierKey);
      }
    }

    if (evictCount > 0) {
      logInfo(`Evicted ${evictCount} entries from memory cache (LRU)`);
    }
  }

  private aggressiveEviction(): void {
    const targetSize = Math.floor(this.maxMemoryCacheSize * 0.5);
    const entries = Array.from(this.imageStates.entries())
      .filter(([, state]) => state.subscribers.size === 0)
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    const toEvict = entries.slice(0, Math.max(0, this.imageStates.size - targetSize));

    for (const [identifierKey, state] of toEvict) {
      if (state.blobUrl) {
        URL.revokeObjectURL(state.blobUrl);
      }
      if (state.cleanupTimer) {
        clearTimeout(state.cleanupTimer);
      }
      if (state.retryTimer) {
        clearTimeout(state.retryTimer);
      }
      this.imageStates.delete(identifierKey);
    }

    if (toEvict.length > 0) {
      logInfo(`Aggressive eviction: removed ${toEvict.length} entries`);
    }
  }

  private async startLoading(hash: ImageIdentifier, priority: number, variant: ImageVariant = ImageVariant.Full, meta?: MetaData): Promise<void> {
    const variantKey = this.getVariantKey(hash, variant);
    const imageState = this.imageStates.get(variantKey);
    if (!imageState) {
      return;
    }

    if (imageState.state === 'loading' && imageState.isProcessing) {
      return;
    }

    imageState.state = 'loading';
    imageState.variant = variant;
    imageState.isProcessing = true;

    const loadPromise = this.loadImage(hash, priority, variant, meta);
    imageState.loadPromise = loadPromise;

    try {
      await loadPromise;
    } catch (error) {
      logError(`Failed to load image: ${hash} [${variant}]`, { error });
    } finally {
      if (imageState.loadPromise === loadPromise) {
        imageState.loadPromise = null;
        imageState.isProcessing = false;
      }
    }
  }

  private async loadImage(hash: ImageIdentifier, priority: number, variant: ImageVariant = ImageVariant.Full, meta?: MetaData): Promise<void> {
    const existingFetch = this.activeFetches.get(`${hash}:${variant}`);
    if (existingFetch) {
      try {
        const startTime = Date.now();
        const result = await existingFetch;
        const fetchTime = Date.now() - startTime;
        this.recordFetchTime(fetchTime);
        const blobUrl = URL.createObjectURL(result.blob);
        this.setLoaded(hash, variant, blobUrl, 'network');
      } catch (error) {
        logError(`Failed to wait for existing fetch: ${hash}`, { error });
      }
      return;
    }

    try {
      if (variant === ImageVariant.Full) {
          const hashToUse = meta?.imageHash ? validateIdentifier(meta.imageHash) : hash;
          if (hashToUse) {
            const cached = await this.imageCache.getCachedImageByHash(hashToUse, variant);
            if (cached && cached.processingState === ProcessingState.Processed) {
              this.metrics.indexedDBCacheHits++;
              try {
                const blobUrl = URL.createObjectURL(cached.blob);
                this.setLoaded(hash, variant, blobUrl, 'indexeddb');
                return;
              } catch (blobError) {
                logError(`Failed to create blob URL from cache: ${hash}`, { blobError });
              }
            }
          }
        } else {
          if (meta?.imageHash) {
            const metaHash = validateIdentifier(meta.imageHash);
            if (metaHash) {
              const cachedIcon = await this.imageCache.getCachedImageByHash(metaHash, variant);
              if (cachedIcon && cachedIcon.processingState === ProcessingState.Processed) {
                this.metrics.indexedDBCacheHits++;
                try {
                  const blobUrl = URL.createObjectURL(cachedIcon.blob);
                  this.setLoaded(hash, variant, blobUrl, 'indexeddb');
                  return;
                } catch (blobError) {
                  logError(`Failed to create blob URL from cached icon: ${hash}`, { blobError });
                }
              }

              const cachedFull = await this.imageCache.getCachedImageByHash(metaHash, ImageVariant.Full);
              if (cachedFull && cachedFull.processingState === ProcessingState.Processed) {
                try {
                  const iconBlob = await this.processIcon(cachedFull.blob);
                  const blobUrl = URL.createObjectURL(iconBlob);
                  this.setLoaded(hash, variant, blobUrl, 'indexeddb');
                  const iconHash = await this.imageCache.calculateImageHash(iconBlob);
                  const validatedIconHash = validateIdentifier(iconHash);
                  if (validatedIconHash) {
                    await this.imageCache.cacheImage(validatedIconHash, iconBlob, ImageVariant.Icon, undefined, undefined, ProcessingState.Processed, hash as string);
                  }
                  return;
                } catch (processError) {
                  logError(`Failed to generate icon from cached full image: ${hash}`, { processError });
                }
              }
            }
          }
        }
    } catch (cacheError) {
      logError(`Cache lookup failed: ${hash}`, { cacheError });
    }

    await this.queueFetch(hash, priority, variant);
  }

  private updateQueuePriority(hash: ImageIdentifier, variant: ImageVariant, newPriority: number): void {
    const queueIndex = this.fetchQueue.findIndex(item => item.hash === hash && item.variant === variant);
    if (queueIndex !== -1) {
      const item = this.fetchQueue[queueIndex];
      if (item.abortController.signal.aborted || this.isCurrentlyProcessing(hash, variant)) {
        return;
      }
      item.priority = newPriority;
      this.fetchQueue.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });
    }
  }

  private isCurrentlyProcessing(hash: ImageIdentifier, variant: ImageVariant): boolean {
    const variantKey = this.getVariantKey(hash, variant);
    const imageState = this.imageStates.get(variantKey);
    if (!imageState) return false;

    if (imageState.state === 'loading' && imageState.isProcessing) {
      return true;
    }

    const activeFetch = this.activeFetches.get(variantKey);
    return !!activeFetch;
  }

  private async queueFetch(hash: ImageIdentifier, priority: number, variant: ImageVariant = ImageVariant.Full): Promise<void> {
    return new Promise((resolve) => {
      const queueIndex = this.fetchQueue.findIndex(item => item.hash === hash && item.variant === variant);
      if (queueIndex !== -1) {
        if (!this.isCurrentlyProcessing(hash, variant)) {
          this.updateQueuePriority(hash, variant, priority);
        }
        return;
      }

      const abortController = new AbortController();
      this.fetchQueue.push({
        hash: hash,
        variant,
        priority,
        resolve,
        timestamp: Date.now(),
        abortController,
      });
      this.fetchQueue.sort((a, b) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.timestamp - b.timestamp;
      });
      void this.processFetchQueue();
    });
  }

  private async processFetchQueue(): Promise<void> {
    if (this.runningFetches >= this.maxConcurrentFetches || this.fetchQueue.length === 0) {
      return;
    }

    const item = this.fetchQueue.shift();
    if (!item) return;

    const variantKey = this.getVariantKey(item.hash, item.variant);
    const imageState = this.imageStates.get(variantKey);
    if (!imageState) {
      item.abortController.abort();
      item.resolve();
      void this.processFetchQueue();
      return;
    }


    if (item.abortController.signal.aborted) {
      item.resolve();
      void this.processFetchQueue();
      return;
    }

    this.runningFetches++;


    const fetchController = new AbortController();
    const combinedSignal = combineAbortSignals([item.abortController.signal, fetchController.signal]);
    this.activeFetchControllers.set(variantKey, fetchController);

    const fetchPromise = this.performFetchWithRetry(item.hash, item.variant, combinedSignal);
    this.activeFetches.set(variantKey, fetchPromise);

    fetchPromise
      .then((result) => {
        if (!combinedSignal.aborted) {
          const blobUrl = URL.createObjectURL(result.blob);
          if (imageState && imageState.subscribers.size > 0 && imageState.variant === item.variant) {
            this.setLoaded(item.hash, item.variant, blobUrl, 'network');
          } else {
            URL.revokeObjectURL(blobUrl);
          }
        }
        item.resolve();
      })
      .catch((error) => {
        if (!combinedSignal.aborted && !(error instanceof DOMException && error.name === 'AbortError')) {
          if (imageState && imageState.subscribers.size > 0) {
            this.setFailed(item.hash, item.variant, error instanceof Error ? error.message : String(error));
          }
        }
        item.resolve();
      })
      .finally(() => {
        this.runningFetches--;
        this.activeFetches.delete(variantKey);
        this.activeFetchControllers.delete(variantKey);
        void this.processFetchQueue();
      });
  }

  private static readonly ICON_SIZE = { width: 32, height: 32 };

  private async processIcon(blob: Blob): Promise<Blob> {
    const size = ImageLoadingService.ICON_SIZE;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size.width;
          canvas.height = size.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, size.width, size.height);
          canvas.toBlob((processedBlob) => {
            if (processedBlob) {
              resolve(processedBlob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          }, 'image/png');
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for processing'));
      img.src = URL.createObjectURL(blob);
    });
  }

  private async performFetchWithRetry(
    hash: ImageIdentifier,
    variant: ImageVariant,
    signal?: AbortSignal
  ): Promise<{ blob: Blob; etag?: string; contentType?: string }> {
    const variantKey = this.getVariantKey(hash, variant);
    const imageState = this.imageStates.get(variantKey);
    let attempt = imageState?.retryCount || 0;
    const maxAttempts = TIMEOUTS.RETRY_MAX_ATTEMPTS;

    while (attempt < maxAttempts) {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      try {
        const result = await this.performFetch(hash, variant, signal);
        if (imageState) {
          imageState.retryCount = 0;
        }
        return result;
      } catch (error) {
        if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
          throw error;
        }

        attempt++;
        if (imageState) {
          imageState.retryCount = attempt;
        }
        this.metrics.retryAttempts++;

        if (attempt >= maxAttempts) {
          this.metrics.failedFetches++;
          throw error;
        }

        const delay = Math.min(
          TIMEOUTS.RETRY_INITIAL_DELAY_MS * Math.pow(2, attempt - 1),
          TIMEOUTS.RETRY_MAX_DELAY_MS
        );

        logWarn(`Fetch failed, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`, {
          hash: hash,
          error: error instanceof Error ? error.message : String(error),
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Failed to fetch after ${maxAttempts} attempts`);
  }

  private async performFetch(
    hash: ImageIdentifier,
    variant: ImageVariant,
    signal?: AbortSignal
  ): Promise<{ blob: Blob; etag?: string; contentType?: string }> {
    const startTime = Date.now();
    this.metrics.networkFetches++;

    const validatedHash = validateIdentifier(hash);
    if (!validatedHash) {
      throw new Error(`Invalid image hash: ${hash}`);
    }

    logInfo(`Fetching image via NetworkRouter: ${hash}`, { hash: validatedHash, variant });

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      logError(`Fetch timeout for ${hash}`, { hash: validatedHash, timeout: TIMEOUTS.FETCH_TIMEOUT_MS });
      timeoutController.abort();
    }, TIMEOUTS.FETCH_TIMEOUT_MS);

    try {
      const cached = await this.imageCache.getCachedImageByHash(validatedHash, variant);

      const request: ResourceRequest = { hash: validatedHash };

      const deferred = new OperationDeferred<Response>();
      await EventBus.instance.publishAsync(new GetResourceEvent(request, deferred));
      const result = await deferred.promise;

      clearTimeout(timeoutId);

      if (!result.isSuccess || !result.value) {
        throw new Error(result.errorMessage || `Failed to load image: ${hash}`);
      }

      const response = result.value;

      if (response.status === 304) {
        if (cached) {
          const fetchTime = Date.now() - startTime;
          this.recordFetchTime(fetchTime);
          this.metrics.networkCacheHits++;
          return { blob: cached.blob, etag: cached.etag, contentType: cached.contentType };
        }
        throw new Error(`304 Not Modified but no cached image available: ${hash}`);
      }

      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status} ${response.statusText}`);
      }

      const fullBlob = await response.blob();
      const etag = response.headers.get('ETag') || undefined;
      const contentType = response.headers.get('Content-Type') || fullBlob.type;

      let processedBlob = fullBlob;

      if (variant === ImageVariant.Icon) {
        try {
          processedBlob = await this.processIcon(fullBlob);
          const iconHash = await this.imageCache.calculateImageHash(processedBlob);
          const validatedIconHash = validateIdentifier(iconHash);
          if (validatedIconHash) {
            await this.imageCache.cacheImage(validatedIconHash, processedBlob, ImageVariant.Icon, etag, contentType, ProcessingState.Processed, hash as string);
          }
        } catch (processError) {
          logError(`Failed to process icon: ${hash}`, { error: processError });
          processedBlob = fullBlob;
        }
        } else if (variant === ImageVariant.Full) {
          const fullHash = await this.imageCache.calculateImageHash(fullBlob);
          const validatedFullHash = validateIdentifier(fullHash);
          if (validatedFullHash) {
            await this.imageCache.cacheImage(validatedFullHash, fullBlob, ImageVariant.Full, etag, contentType, ProcessingState.Processed, hash as string);
          }
        }

      const fetchTime = Date.now() - startTime;
      this.recordFetchTime(fetchTime);

      return { blob: processedBlob, etag, contentType };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (timeoutController.signal.aborted && (!signal || !signal.aborted)) {
          throw new Error(`Fetch timeout for ${hash}`);
        }
        throw error;
      }
      throw error;
    }
  }

  private recordFetchTime(fetchTime: number): void {
    this.metrics.fetchTimes.push(fetchTime);
    if (this.metrics.fetchTimes.length > 100) {
      this.metrics.fetchTimes.shift();
    }
    const sum = this.metrics.fetchTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageFetchTime = sum / this.metrics.fetchTimes.length;
  }

  private setLoaded(hash: ImageIdentifier, variant: ImageVariant, blobUrl: string, source: 'memory' | 'indexeddb' | 'network'): void {
    const variantKey = this.getVariantKey(hash, variant);
    const imageState = this.imageStates.get(variantKey);
    if (!imageState) {
      logWarn(`setLoaded called but no imageState for ${variantKey}`);
      return;
    }

    imageState.state = 'loaded';
    imageState.blobUrl = blobUrl;
    imageState.variant = variant;
    imageState.lastAccessed = Date.now();
    imageState.retryCount = 0;

    if (imageState.subscribers.size > 0) {
      const batchSubscribers = new Map<string, ImageBatchResult[]>();

      for (const subscriberId of imageState.subscribers) {
        if (this.pendingBatchRequests.has(subscriberId)) {
          if (!batchSubscribers.has(subscriberId)) {
            batchSubscribers.set(subscriberId, []);
          }
          batchSubscribers.get(subscriberId)!.push({
            hash: hash as unknown as ImageHash,
            variant,
            blobUrl,
            source: source as 'memory' | 'indexeddb' | 'network',
            error: null,
          });
        } else {
          EventBus.instance.publish(new ImageLoadedEvent(hash as unknown as ImageHash, variant, blobUrl, source));
        }
      }

      for (const [subscriberId, results] of batchSubscribers.entries()) {
        EventBus.instance.publish(new ImageBatchLoadedEvent(results, subscriberId));
      }
    }
  }

  private setFailed(hash: ImageIdentifier, variant: ImageVariant, error: string): void {
    const variantKey = this.getVariantKey(hash, variant);
    const imageState = this.imageStates.get(variantKey);
    if (!imageState) {
      return;
    }

    imageState.state = 'failed';
    this.metrics.failedFetches++;

    if (imageState.subscribers.size > 0) {
      const canRetry = imageState.retryCount < TIMEOUTS.RETRY_MAX_ATTEMPTS;
      const batchSubscribers = new Map<string, ImageBatchResult[]>();

      for (const subscriberId of imageState.subscribers) {
        if (this.pendingBatchRequests.has(subscriberId)) {
          if (!batchSubscribers.has(subscriberId)) {
            batchSubscribers.set(subscriberId, []);
          }
          batchSubscribers.get(subscriberId)!.push({
            hash: hash as unknown as ImageHash,
            variant,
            blobUrl: null,
            source: null,
            error: error,
          });
        } else {
          EventBus.instance.publish(new ImageLoadFailedEvent(hash as unknown as ImageHash, variant, error, canRetry));
        }
      }

      for (const [subscriberId, results] of batchSubscribers.entries()) {
        EventBus.instance.publish(new ImageBatchLoadedEvent(results, subscriberId));
      }
    }
  }

  getMetrics(): Readonly<ServiceMetrics> {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.totalRequests > 0
        ? (this.metrics.memoryCacheHits + this.metrics.indexedDBCacheHits) / this.metrics.totalRequests
        : 0,
    };
  }

  resetMetrics(): void {
    this.metrics = {
      memoryCacheHits: 0,
      indexedDBCacheHits: 0,
      networkFetches: 0,
      networkCacheHits: 0,
      failedFetches: 0,
      retryAttempts: 0,
      totalRequests: 0,
      averageFetchTime: 0,
      fetchTimes: [],
    };
  }
}
