import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
import type { ModelCacheAdapter } from '@/model-cache/ModelCacheAdapter';
import { RequestManifestEntryEvent } from '@/events/RequestManifestEntryEvent';
import { RequestAddManifestEntryEvent } from '@/events/RequestAddManifestEntryEvent';
import { RequestAddQuantToManifestEvent } from '@/events/RequestAddQuantToManifestEvent';
import { RequestGetChunkInfoEvent } from '@/events/RequestGetChunkInfoEvent';
import { RequestSaveChunkEvent } from '@/events/RequestSaveChunkEvent';
import { RequestGetFromIndexedDBEvent } from '@/events/RequestGetFromIndexedDBEvent';
import { RequestTryServeFromCacheEvent } from '@/events/RequestTryServeFromCacheEvent';
import { RequestGetByKeyEvent } from '@/events/RequestGetByKeyEvent';
import { RequestSaveBlobByKeyEvent } from '@/events/RequestSaveBlobByKeyEvent';
import { RequestGetBlobByKeyEvent } from '@/events/RequestGetBlobByKeyEvent';
import { RequestDeleteBlobByKeyEvent } from '@/events/RequestDeleteBlobByKeyEvent';
import { RequestGetInferenceSettingsEvent } from '@/events/RequestGetInferenceSettingsEvent';
import { RequestSaveInferenceSettingsEvent } from '@/events/RequestSaveInferenceSettingsEvent';
import { RequestGetAllManifestEntriesEvent } from '@/events/RequestGetAllManifestEntriesEvent';
import { RequestDeleteManifestEntryEvent } from '@/events/RequestDeleteManifestEntryEvent';
import { RequestGetAllFileEntriesEvent } from '@/events/RequestGetAllFileEntriesEvent';

export interface SetupStorageDomainOptions {
  modelCache: ModelCacheAdapter;
}

const REQUIRED_MODEL_CACHE_METHODS: (keyof ModelCacheAdapter)[] = [
  'getManifestEntry',
  'addManifestEntry',
  'addQuantToManifest',
  'getChunkInfo',
  'saveChunkedFileSafe',
  'getFromIndexedDB',
  'extractDtypeFromPath',
];

function validateModelCacheAdapter(modelCache: ModelCacheAdapter): void {
  for (const method of REQUIRED_MODEL_CACHE_METHODS) {
    const fn = modelCache[method];
    if (typeof fn !== 'function') {
      throw new Error(
        `ModelCacheAdapter must implement required method '${method}'. Missing required capabilities cause fail-fast at setup. (A6)`
      );
    }
  }
}

export function setupStorageDomainEventHandlers(
  options: SetupStorageDomainOptions
): () => void {
  const { modelCache } = options;
  validateModelCacheAdapter(modelCache);
  const bus = EventBus.instance;

  const hManifestEntry = async (e: RequestManifestEntryEvent) => {
    try {
      const result = await modelCache.getManifestEntry(e.repo);
      e.deferred.resolve(OperationResult.success(result));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestManifestEntryEvent, hManifestEntry);

  const hAddManifestEntry = async (e: RequestAddManifestEntryEvent) => {
    try {
      await modelCache.addManifestEntry(e.repo, e.entry);
      e.deferred.resolve(OperationResult.success(undefined));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestAddManifestEntryEvent, hAddManifestEntry);

  const hGetAllManifestEntries = async (e: RequestGetAllManifestEntriesEvent) => {
    if (modelCache.getAllManifestEntries == null) {
      e.deferred.resolve(OperationResult.success([]));
      return;
    }
    try {
      const result = await modelCache.getAllManifestEntries();
      e.deferred.resolve(OperationResult.success(result));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestGetAllManifestEntriesEvent, hGetAllManifestEntries);

  const hDeleteManifestEntry = async (e: RequestDeleteManifestEntryEvent) => {
    if (modelCache.deleteManifestEntry == null) {
      e.deferred.resolve(OperationResult.success(undefined));
      return;
    }
    try {
      await modelCache.deleteManifestEntry(e.repo);
      e.deferred.resolve(OperationResult.success(undefined));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestDeleteManifestEntryEvent, hDeleteManifestEntry);

  const hAddQuant = async (e: RequestAddQuantToManifestEvent) => {
    try {
      await modelCache.addQuantToManifest(e.repo, e.quantPath, e.status, e.files);
      e.deferred.resolve(OperationResult.success(undefined));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestAddQuantToManifestEvent, hAddQuant);

  const hChunkInfo = async (e: RequestGetChunkInfoEvent) => {
    try {
      const result = await modelCache.getChunkInfo(e.repo, e.path);
      e.deferred.resolve(OperationResult.success(result));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestGetChunkInfoEvent, hChunkInfo);

  const hSaveChunk = async (e: RequestSaveChunkEvent) => {
    try {
      await modelCache.saveChunkedFileSafe(e.repo, e.path, e.blob, e.onUpdate);
      e.deferred.resolve(OperationResult.success(undefined));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestSaveChunkEvent, hSaveChunk);

  const hGetFromIndexedDB = async (e: RequestGetFromIndexedDBEvent) => {
    try {
      const result = await modelCache.getFromIndexedDB(e.repo, e.path);
      e.deferred.resolve(OperationResult.success(result));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestGetFromIndexedDBEvent, hGetFromIndexedDB);

  const hGetByKey = async (e: RequestGetByKeyEvent) => {
    if (modelCache.getByKey == null) {
      e.deferred.resolve(OperationResult.success(null));
      return;
    }
    try {
      const result = await modelCache.getByKey(e.key);
      e.deferred.resolve(OperationResult.success(result));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestGetByKeyEvent, hGetByKey);

  const hGetBlobByKey = async (e: RequestGetBlobByKeyEvent) => {
    if (modelCache.getBlobByKey == null) {
      e.deferred.resolve(OperationResult.success(null));
      return;
    }
    try {
      const result = await modelCache.getBlobByKey(e.key);
      e.deferred.resolve(OperationResult.success(result));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestGetBlobByKeyEvent, hGetBlobByKey);

  const hSaveBlobByKey = async (e: RequestSaveBlobByKeyEvent) => {
    if (modelCache.saveBlobByKey == null) {
      e.deferred.resolve(OperationResult.success(undefined));
      return;
    }
    try {
      await modelCache.saveBlobByKey(e.key, e.blob);
      e.deferred.resolve(OperationResult.success(undefined));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestSaveBlobByKeyEvent, hSaveBlobByKey);

  const hDeleteBlobByKey = async (e: RequestDeleteBlobByKeyEvent) => {
    if (modelCache.deleteBlobByKey == null) {
      e.deferred.resolve(OperationResult.success(undefined));
      return;
    }
    try {
      await modelCache.deleteBlobByKey(e.key);
      e.deferred.resolve(OperationResult.success(undefined));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestDeleteBlobByKeyEvent, hDeleteBlobByKey);

  const hGetAllFileEntries = async (e: RequestGetAllFileEntriesEvent) => {
    if (modelCache.getAllFileEntries == null) {
      e.deferred.resolve(OperationResult.success([]));
      return;
    }
    try {
      const result = await modelCache.getAllFileEntries();
      e.deferred.resolve(OperationResult.success(result));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestGetAllFileEntriesEvent, hGetAllFileEntries);

  const INFERENCE_SETTINGS_ID = 'ClaimInferenceSettings';

  const hGetInferenceSettings = async (e: RequestGetInferenceSettingsEvent) => {
    if (modelCache.getInferenceSettings == null) {
      e.deferred.resolve(OperationResult.success(null));
      return;
    }
    try {
      const settings = await modelCache.getInferenceSettings(INFERENCE_SETTINGS_ID);
      e.deferred.resolve(OperationResult.success(settings));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestGetInferenceSettingsEvent, hGetInferenceSettings);

  const hSaveInferenceSettings = async (e: RequestSaveInferenceSettingsEvent) => {
    if (modelCache.saveInferenceSettings == null) {
      e.deferred.resolve(OperationResult.success(undefined));
      return;
    }
    try {
      await modelCache.saveInferenceSettings(INFERENCE_SETTINGS_ID, e.settings);
      e.deferred.resolve(OperationResult.success(undefined));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      e.deferred.resolve(OperationResult.failure(msg));
    }
  };
  bus.subscribeAsync(RequestSaveInferenceSettingsEvent, hSaveInferenceSettings);

  let hTryServe: ((e: RequestTryServeFromCacheEvent) => Promise<void>) | null =
    null;
  if (modelCache.tryServeFromCache != null) {
    hTryServe = async (e: RequestTryServeFromCacheEvent) => {
      try {
        const result = await modelCache.tryServeFromCache!(e.url, e.modelId);
        e.deferred.resolve(OperationResult.success(result ?? null));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        e.deferred.resolve(OperationResult.failure(msg));
      }
    };
    bus.subscribeAsync(RequestTryServeFromCacheEvent, hTryServe);
  }

  return () => {
    bus.unsubscribeAsync(RequestManifestEntryEvent, hManifestEntry);
    bus.unsubscribeAsync(RequestAddManifestEntryEvent, hAddManifestEntry);
    bus.unsubscribeAsync(RequestGetAllManifestEntriesEvent, hGetAllManifestEntries);
    bus.unsubscribeAsync(RequestDeleteManifestEntryEvent, hDeleteManifestEntry);
    bus.unsubscribeAsync(RequestAddQuantToManifestEvent, hAddQuant);
    bus.unsubscribeAsync(RequestGetChunkInfoEvent, hChunkInfo);
    bus.unsubscribeAsync(RequestSaveChunkEvent, hSaveChunk);
    bus.unsubscribeAsync(RequestGetFromIndexedDBEvent, hGetFromIndexedDB);
    bus.unsubscribeAsync(RequestGetByKeyEvent, hGetByKey);
    bus.unsubscribeAsync(RequestGetBlobByKeyEvent, hGetBlobByKey);
    bus.unsubscribeAsync(RequestSaveBlobByKeyEvent, hSaveBlobByKey);
    bus.unsubscribeAsync(RequestDeleteBlobByKeyEvent, hDeleteBlobByKey);
    bus.unsubscribeAsync(RequestGetAllFileEntriesEvent, hGetAllFileEntries);
    bus.unsubscribeAsync(RequestGetInferenceSettingsEvent, hGetInferenceSettings);
    bus.unsubscribeAsync(RequestSaveInferenceSettingsEvent, hSaveInferenceSettings);
    if (hTryServe != null) {
      bus.unsubscribeAsync(RequestTryServeFromCacheEvent, hTryServe);
    }
  };
}
