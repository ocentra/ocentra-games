import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { RequestManifestEntryEvent } from '@ocentra/storage-domain/events/RequestManifestEntryEvent';
import { RequestAddManifestEntryEvent } from '@ocentra/storage-domain/events/RequestAddManifestEntryEvent';
import { RequestAddQuantToManifestEvent } from '@ocentra/storage-domain/events/RequestAddQuantToManifestEvent';
import { RequestGetChunkInfoEvent } from '@ocentra/storage-domain/events/RequestGetChunkInfoEvent';
import { RequestSaveChunkEvent } from '@ocentra/storage-domain/events/RequestSaveChunkEvent';
import { RequestGetFromIndexedDBEvent } from '@ocentra/storage-domain/events/RequestGetFromIndexedDBEvent';
import { RequestGetByKeyEvent } from '@ocentra/storage-domain/events/RequestGetByKeyEvent';
import { RequestGetBlobByKeyEvent } from '@ocentra/storage-domain/events/RequestGetBlobByKeyEvent';
import { RequestSaveBlobByKeyEvent } from '@ocentra/storage-domain/events/RequestSaveBlobByKeyEvent';
import { RequestTryServeFromCacheEvent } from '@ocentra/storage-domain/events/RequestTryServeFromCacheEvent';
import { RequestDeleteBlobByKeyEvent } from '@ocentra/storage-domain/events/RequestDeleteBlobByKeyEvent';
import { RequestGetInferenceSettingsEvent } from '@ocentra/storage-domain/events/RequestGetInferenceSettingsEvent';
import { RequestSaveInferenceSettingsEvent } from '@ocentra/storage-domain/events/RequestSaveInferenceSettingsEvent';
import { RequestGetAllManifestEntriesEvent } from '@ocentra/storage-domain/events/RequestGetAllManifestEntriesEvent';
import { RequestDeleteManifestEntryEvent } from '@ocentra/storage-domain/events/RequestDeleteManifestEntryEvent';
import { RequestGetAllFileEntriesEvent } from '@ocentra/storage-domain/events/RequestGetAllFileEntriesEvent';
import type { ManifestEntry, ChunkInfo } from '@ocentra/storage-domain/model-cache/types';

const bus = EventBus.instance;

export const DEFAULT_STORAGE_EVENT_TIMEOUT_MS = 30_000;

let storageEventTimeoutMs = DEFAULT_STORAGE_EVENT_TIMEOUT_MS;

export function setStorageEventTimeoutMs(ms: number): void {
  storageEventTimeoutMs = ms > 0 ? ms : DEFAULT_STORAGE_EVENT_TIMEOUT_MS;
}

export function getStorageEventTimeoutMs(): number {
  return storageEventTimeoutMs;
}

function unwrap<T>(result: import('@ocentra/eventing-domain/core/OperationResult').OperationResult<T>): T {
  if (!result.isSuccess) {
    throw new Error(result.errorMessage ?? 'Storage operation failed');
  }
  return result.value as T;
}

async function awaitStorageEvent<T>(promise: Promise<import('@ocentra/eventing-domain/core/OperationResult').OperationResult<T>>): Promise<import('@ocentra/eventing-domain/core/OperationResult').OperationResult<T>> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof Error && err.message.includes('timed out')) {
      throw new Error(
        'Storage event timed out: no handler registered. Ensure setupStorageDomainEventHandlers() runs before any storage access.'
      );
    }
    throw err;
  }
}

export async function getManifestEntryViaEvent(repo: string): Promise<ManifestEntry | null> {
  const deferred = new OperationDeferred<ManifestEntry | null>(storageEventTimeoutMs);
  const event = new RequestManifestEntryEvent(repo, deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  return unwrap(result);
}

export async function getAllManifestEntriesViaEvent(): Promise<ManifestEntry[]> {
  const deferred = new OperationDeferred<ManifestEntry[]>(storageEventTimeoutMs);
  const event = new RequestGetAllManifestEntriesEvent(deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  return unwrap(result);
}

export async function addManifestEntryViaEvent(repo: string, entry: ManifestEntry): Promise<void> {
  const deferred = new OperationDeferred<void>(storageEventTimeoutMs);
  const event = new RequestAddManifestEntryEvent(repo, entry, deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  unwrap(result);
}

export async function deleteManifestEntryViaEvent(repo: string): Promise<void> {
  const deferred = new OperationDeferred<void>(storageEventTimeoutMs);
  const event = new RequestDeleteManifestEntryEvent(repo, deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  unwrap(result);
}

export async function addQuantToManifestViaEvent(
  repo: string,
  quantPath: string,
  status: string,
  files?: string[]
): Promise<void> {
  const deferred = new OperationDeferred<void>(storageEventTimeoutMs);
  const event = new RequestAddQuantToManifestEvent(repo, quantPath, status, deferred, files);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  unwrap(result);
}

export async function getChunkInfoViaEvent(
  repo: string,
  path: string
): Promise<ChunkInfo | null> {
  const deferred = new OperationDeferred<ChunkInfo | null>(storageEventTimeoutMs);
  const event = new RequestGetChunkInfoEvent(repo, path, deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  return unwrap(result);
}

export async function getChunkInfoCompatViaEvent(
  modelId: string,
  fileName: string
): Promise<{ isChunked: boolean; totalChunks?: number; totalSize?: number }> {
  const info = await getChunkInfoViaEvent(modelId, fileName);
  if (info == null) {
    return { isChunked: false };
  }
  return {
    isChunked: true,
    totalChunks: info.totalChunks,
    totalSize: info.totalSize,
  };
}

export async function saveChunkedFileViaEvent(
  repo: string,
  path: string,
  blob: Blob,
  onUpdate?: () => void
): Promise<void> {
  const deferred = new OperationDeferred<void>(storageEventTimeoutMs);
  const event = new RequestSaveChunkEvent(repo, path, blob, deferred, onUpdate);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  unwrap(result);
}

export async function saveChunkedFileSafeViaEvent(
  resourceUrl: string,
  blob: Blob,
  modelId: string
): Promise<void> {
  const urlParts = resourceUrl.split('/');
  const path = urlParts.slice(urlParts.indexOf('main') + 1).join('/');
  await saveChunkedFileViaEvent(modelId, path, blob);
}

export async function getFromIndexedDBViaEvent(
  repo: string,
  path: string
): Promise<ArrayBuffer | null> {
  const deferred = new OperationDeferred<ArrayBuffer | null>(storageEventTimeoutMs);
  const event = new RequestGetFromIndexedDBEvent(repo, path, deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  return unwrap(result);
}

export async function getFromIndexedDBAsBlobViaEvent(url: string): Promise<Blob | null> {
  const deferred = new OperationDeferred<Blob | null>(storageEventTimeoutMs);
  const event = new RequestGetBlobByKeyEvent(url, deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  return unwrap(result);
}

export async function deleteBlobByKeyViaEvent(key: string): Promise<void> {
  const deferred = new OperationDeferred<void>(storageEventTimeoutMs);
  const event = new RequestDeleteBlobByKeyEvent(key, deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  unwrap(result);
}

export async function saveToIndexedDBViaEvent(url: string, blob: Blob): Promise<void> {
  return saveBlobByKeyViaEvent(url, blob);
}

export async function saveBlobByKeyViaEvent(key: string, blob: Blob): Promise<void> {
  const deferred = new OperationDeferred<void>(storageEventTimeoutMs);
  const event = new RequestSaveBlobByKeyEvent(key, blob, deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  unwrap(result);
}

export async function getByKeyViaEvent(key: string): Promise<ArrayBuffer | null> {
  const deferred = new OperationDeferred<ArrayBuffer | null>(storageEventTimeoutMs);
  const event = new RequestGetByKeyEvent(key, deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  return unwrap(result);
}

export async function fetchChunkViaEvent(
  modelId: string,
  fileName: string,
  chunkIndex: number
): Promise<ArrayBuffer | null> {
  const chunkKey = `${modelId}/${fileName}_chunk_${chunkIndex}`;
  return getByKeyViaEvent(chunkKey);
}

export async function assembleChunksViaEvent(
  modelId: string,
  fileName: string,
  totalChunks: number,
  totalSize: number
): Promise<ArrayBuffer> {
  const combined = new Uint8Array(totalSize);
  let currentOffset = 0;
  for (let i = 0; i < totalChunks; i++) {
    const chunkArrayBuffer = await fetchChunkViaEvent(modelId, fileName, i);
    if (!chunkArrayBuffer) {
      throw new Error(`Failed to fetch chunk ${i} of ${fileName}`);
    }
    const chunkUint8Array = new Uint8Array(chunkArrayBuffer);
    if (currentOffset + chunkUint8Array.length > totalSize) {
      throw new Error(
        `Chunk ${i} would overflow buffer. Offset: ${currentOffset}, ChunkLen: ${chunkUint8Array.length}, TotalSize: ${totalSize}`
      );
    }
    combined.set(chunkUint8Array, currentOffset);
    currentOffset += chunkUint8Array.length;
  }
  if (currentOffset !== totalSize) {
    return combined.buffer.slice(0, currentOffset);
  }
  return combined.buffer;
}

export async function createStreamingResponseFromChunksViaEvent(
  modelId: string,
  fileName: string,
  totalChunks: number,
  totalSize: number
): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let _totalBytesStreamed = 0;
        for (let i = 0; i < totalChunks; i++) {
          const chunkArrayBuffer = await fetchChunkViaEvent(modelId, fileName, i);
          if (!chunkArrayBuffer) {
            throw new Error(`Failed to fetch chunk ${i} of ${fileName}`);
          }
          const chunkData = new Uint8Array(chunkArrayBuffer);
          _totalBytesStreamed += chunkData.length;
          controller.enqueue(chunkData);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
  const headers = new Headers();
  headers.set('Content-Type', 'application/octet-stream');
  headers.set('Content-Length', totalSize.toString());
  headers.set('Transfer-Encoding', 'chunked');
  return new Response(stream, { headers });
}

export async function getAllFileEntriesViaEvent(): Promise<Array<{ url: string; size: number }>> {
  const deferred = new OperationDeferred<Array<{ url: string; size: number }>>(storageEventTimeoutMs);
  const event = new RequestGetAllFileEntriesEvent(deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  return unwrap(result);
}

export async function getInferenceSettingsViaEvent(): Promise<Record<string, unknown> | null> {
  const deferred = new OperationDeferred<Record<string, unknown> | null>(storageEventTimeoutMs);
  const event = new RequestGetInferenceSettingsEvent(deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  return unwrap(result);
}

export async function saveInferenceSettingsViaEvent(
  settings: Record<string, unknown>
): Promise<void> {
  const deferred = new OperationDeferred<void>(storageEventTimeoutMs);
  const event = new RequestSaveInferenceSettingsEvent(settings, deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  unwrap(result);
}

export async function tryServeFromCacheViaEvent(
  url: string,
  modelId: string
): Promise<Response | null> {
  const deferred = new OperationDeferred<Response | null>(storageEventTimeoutMs);
  const event = new RequestTryServeFromCacheEvent(url, modelId, deferred);
  bus.publish(event, { awaitAsync: true });
  const result = await awaitStorageEvent(deferred.promise);
  return unwrap(result);
}
