import { getLogger } from '@/logger/runtime';
import {
  getManifestEntryViaEvent,
  addManifestEntryViaEvent,
  getAllManifestEntriesViaEvent,
  deleteManifestEntryViaEvent,
  getFromIndexedDBAsBlobViaEvent,
  saveBlobByKeyViaEvent,
  deleteBlobByKeyViaEvent,
  getInferenceSettingsViaEvent,
  saveInferenceSettingsViaEvent,
  getChunkInfoCompatViaEvent,
  saveChunkedFileSafeViaEvent,
  fetchChunkViaEvent,
  getAllFileEntriesViaEvent,
} from '@/storage/storage-event-client';
import { HUGGINGFACE_TOKEN_KEY, HTTP_HEADERS_AI } from '@/storage/model-db-schema';
import { CURRENT_MANIFEST_VERSION, DEFAULT_CHUNK_SIZE } from '@/constants/model-storage';
import type { InferenceSettings } from '@/types/inference-settings';
import type { ManifestEntry, CachedModelInfo } from '@/types/model-storage';
import { QUANT_STATUS, type QuantStatus } from '@/constants/quant-status';
import { extractCleanDtype } from '@/utils/model-dtype';
import type { HuggingFaceModelMetadata, HuggingFaceSibling, NeededFileEntry } from '@/types/huggingface';

const log = getLogger();

let modelStorageFetch: ((url: string, init?: RequestInit) => Promise<Response>) | null = null;

export function setModelStorageFetchAdapter(
  fn: (url: string, init?: RequestInit) => Promise<Response>
): void {
  modelStorageFetch = fn;
}

function getModelStorageFetch(): (url: string, init?: RequestInit) => Promise<Response> {
  if (!modelStorageFetch) {
    throw new Error(
      'Model storage fetch adapter not set. Call setModelStorageFetchAdapter() during setupAiDomainEventHandlers before any storage fetch.'
    );
  }
  return modelStorageFetch;
}

export async function getFromIndexedDB(url: string): Promise<Blob | null> {
  try {
    return await getFromIndexedDBAsBlobViaEvent(url);
  } catch (error) {
    log.warn('[getFromIndexedDB] Error', { url, error });
    return null;
  }
}

export async function saveToIndexedDB(url: string, blob: Blob): Promise<void> {
  try {
    await saveBlobByKeyViaEvent(url, blob);
  } catch (error) {
    log.error('[saveToIndexedDB] Error', { url, error });
    throw error;
  }
}

export async function deleteFromIndexedDB(url: string): Promise<void> {
  try {
    await deleteBlobByKeyViaEvent(url);
  } catch (error) {
    log.error('[deleteFromIndexedDB] Error', { url, error });
    throw error;
  }
}

export async function getManifestEntry(repo: string): Promise<ManifestEntry | null> {
  try {
    const entry = await getManifestEntryViaEvent(repo) as ManifestEntry | null;
    if (entry && entry.manifestVersion !== CURRENT_MANIFEST_VERSION) {
      log.warn('[getManifestEntry] Manifest has old version', {
        repo,
        version: entry.manifestVersion,
        current: CURRENT_MANIFEST_VERSION,
      });
    }
    return entry ?? null;
  } catch (error) {
    log.error('[getManifestEntry] Error', { repo, error });
    return null;
  }
}

export async function addManifestEntry(repo: string, entry: ManifestEntry): Promise<void> {
  if (!entry || typeof entry !== 'object' || entry.repo !== repo) {
    log.error('[addManifestEntry] Invalid entry', { repo, entry });
    throw new Error(`[addManifestEntry] Invalid entry: must be an object with repo === ${repo}`);
  }
  const toSave = { ...entry };
  if (toSave.manifestVersion !== CURRENT_MANIFEST_VERSION) {
    toSave.manifestVersion = CURRENT_MANIFEST_VERSION;
  }
  try {
    await addManifestEntryViaEvent(repo, toSave);
  } catch (error) {
    log.error('[addManifestEntry] Error', { repo, error });
    throw error;
  }
}

export async function getAllManifestEntries(): Promise<ManifestEntry[]> {
  try {
    return (await getAllManifestEntriesViaEvent()) as ManifestEntry[];
  } catch (error) {
    log.error('[getAllManifestEntries] Error', { error });
    return [];
  }
}

export async function saveInferenceSettings(settings: InferenceSettings): Promise<void> {
  try {
    await saveInferenceSettingsViaEvent(settings as unknown as Record<string, unknown>);
  } catch (error) {
    log.error('[saveInferenceSettings] Error', { error });
    throw error;
  }
}

export async function getInferenceSettings(): Promise<InferenceSettings | null> {
  try {
    const result = await getInferenceSettingsViaEvent();
    return result as InferenceSettings | null;
  } catch (error) {
    log.error('[getInferenceSettings] Error', { error });
    return null;
  }
}

export async function getModelQuantSettings(
  repo: string,
  quantPath: string
): Promise<InferenceSettings | null> {
  const manifest = await getManifestEntry(repo);
  if (!manifest?.quants[quantPath]) return null;
  return manifest.quants[quantPath].inferenceSettings ?? null;
}

export async function saveModelQuantSettings(
  repo: string,
  quantPath: string,
  settings: InferenceSettings
): Promise<void> {
  let manifest = await getManifestEntry(repo);
  if (!manifest) {
    manifest = {
      repo,
      quants: {},
      manifestVersion: CURRENT_MANIFEST_VERSION,
    };
  }
  if (!manifest.quants[quantPath]) {
    manifest.quants[quantPath] = {
      files: [quantPath],
      status: QUANT_STATUS.AVAILABLE,
      dtype: extractCleanDtype(quantPath),
      hasExternalData: false,
    };
  }
  manifest.quants[quantPath].inferenceSettings = settings;
  await addManifestEntry(repo, manifest);
}

export async function clearModelQuantSettings(repo: string, quantPath: string): Promise<void> {
  const manifest = await getManifestEntry(repo);
  if (!manifest?.quants[quantPath]) return;
  delete manifest.quants[quantPath].inferenceSettings;
  await addManifestEntry(repo, manifest);
}

export async function addQuantToManifest(
  repo: string,
  modelPath: string,
  status: QuantStatus,
  files?: string[]
): Promise<void> {
  let manifest = await getManifestEntry(repo);
  if (!manifest) {
    manifest = {
      repo,
      quants: {},
      manifestVersion: CURRENT_MANIFEST_VERSION,
    };
  }
  if (!manifest.quants[modelPath]) {
    manifest.quants[modelPath] = {
      files: files?.length ? files : [modelPath],
      status,
      dtype: extractCleanDtype(modelPath),
      hasExternalData: false,
    };
  } else {
    manifest.quants[modelPath].status = status;
    if (files?.length) manifest.quants[modelPath].files = files;
    if (!manifest.quants[modelPath].dtype) {
      manifest.quants[modelPath].dtype = extractCleanDtype(modelPath);
    }
    if (manifest.quants[modelPath].hasExternalData === undefined) {
      manifest.quants[modelPath].hasExternalData = false;
    }
  }
  await addManifestEntry(repo, manifest);
}

export async function getHuggingFaceToken(): Promise<string | null> {
  try {
    const blob = await getFromIndexedDB(HUGGINGFACE_TOKEN_KEY);
    return blob ? await blob.text() : null;
  } catch (error) {
    log.warn('[getHuggingFaceToken] Failed to get token', { error });
    return null;
  }
}

export async function setHuggingFaceToken(token: string): Promise<void> {
  const sanitized = token.trim();
  if (!sanitized) {
    throw new Error('[setHuggingFaceToken] Token cannot be empty');
  }
  await saveToIndexedDB(HUGGINGFACE_TOKEN_KEY, new Blob([sanitized], { type: 'text/plain' }));
}

export async function clearHuggingFaceToken(): Promise<void> {
  await deleteFromIndexedDB(HUGGINGFACE_TOKEN_KEY);
}

export async function getAuthenticatedHeaders(): Promise<Record<string, string>> {
  const token = await getHuggingFaceToken();
  const headers: Record<string, string> = {
    Accept: HTTP_HEADERS_AI.ACCEPT_JSON,
  };
  if (token?.startsWith('hf_')) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function getAllCachedModels(): Promise<CachedModelInfo[]> {
  const models: CachedModelInfo[] = [];
  try {
    const allData = await getAllFileEntriesViaEvent();
    const modelGroups = new Map<
      string,
      { chunks: string[]; totalSize: number; chunkSizes: number[] }
    >();

    for (const item of allData) {
      const key = item.url;
      const blobSize = item.size;
      if (key.includes('_chunk_')) {
        const modelKey = key.replace(/_chunk_\d+$/, '');
        if (!modelGroups.has(modelKey)) {
          modelGroups.set(modelKey, { chunks: [], totalSize: 0, chunkSizes: [] });
        }
        const group = modelGroups.get(modelKey)!;
        group.chunks.push(key);
        if (blobSize > 0) {
          group.totalSize += blobSize;
          group.chunkSizes.push(blobSize);
        }
      } else if (
        (key.startsWith('models/') || key.includes('/model.') || key.includes('/onnx/')) &&
        !key.includes(HUGGINGFACE_TOKEN_KEY)
      ) {
        let modelId = '';
        let modelPath = '';
        if (key.startsWith('models/')) {
          const pathParts = key.replace('models/', '').split('/');
          if (pathParts.length >= 2) {
            modelId = pathParts[0];
            modelPath = pathParts.slice(1).join('/');
          }
        } else if (key.includes('huggingface.co/')) {
          const urlParts = key.split('/');
          const modelIndex = urlParts.findIndex((p) => p === 'huggingface.co') + 1;
          if (modelIndex > 0 && urlParts[modelIndex]) {
            modelId = urlParts[modelIndex];
            modelPath = urlParts.slice(modelIndex + 3).join('/');
          }
        }
        if (modelId && modelPath) {
          const modelSize = blobSize;
          models.push({
            modelId,
            modelPath,
            totalSize: modelSize,
            numChunks: 1,
            chunkSize: modelSize,
            downloadDate: new Date().toISOString(),
            cacheKey: key,
            metadataKey: key,
            chunkKeys: [key],
          });
        }
      }
    }

    for (const [cacheKey, data] of modelGroups) {
      if (data.chunks.length > 0) {
        const pathParts = cacheKey.replace('models/', '').split('/');
        if (pathParts.length >= 2) {
          const modelId = pathParts[0];
          const modelPath = pathParts.slice(1).join('/');
          const avgChunkSize =
            data.chunkSizes.length > 0
              ? Math.round(data.totalSize / data.chunkSizes.length)
              : 0;
          models.push({
            modelId,
            modelPath,
            totalSize: data.totalSize,
            numChunks: data.chunks.length,
            chunkSize: avgChunkSize,
            downloadDate: new Date().toISOString(),
            cacheKey,
            metadataKey: `${cacheKey}_metadata`,
            chunkKeys: data.chunks.sort((a, b) => {
              const aNum = parseInt(a.match(/_chunk_(\d+)$/)?.[1] ?? '0', 10);
              const bNum = parseInt(b.match(/_chunk_(\d+)$/)?.[1] ?? '0', 10);
              return aNum - bNum;
            }),
          });
        }
      }
    }
  } catch (error) {
    log.error('[getAllCachedModels] Error', { error });
  }
  return models;
}

export async function deleteCachedModel(modelInfo: CachedModelInfo): Promise<void> {
  for (const chunkKey of modelInfo.chunkKeys) {
    await deleteFromIndexedDB(chunkKey);
  }
  await deleteFromIndexedDB(modelInfo.metadataKey);
}

export async function deleteAllCachedModels(): Promise<void> {
  const models = await getAllCachedModels();
  for (const model of models) {
    await deleteCachedModel(model);
  }
}

export async function fetchChunk(
  modelId: string,
  fileName: string,
  chunkIndex: number
): Promise<ArrayBuffer | null> {
  try {
    const chunkKey = `${modelId}/${fileName}_chunk_${chunkIndex}`;
    const cached = await getFromIndexedDB(chunkKey);
    return cached ? await cached.arrayBuffer() : null;
  } catch (error) {
    log.error('[fetchChunk] Error', { modelId, fileName, chunkIndex, error });
    return null;
  }
}

export async function getChunkInfo(
  modelId: string,
  fileName: string
): Promise<{ isChunked: boolean; totalChunks?: number; totalSize?: number }> {
  try {
    return await getChunkInfoCompatViaEvent(modelId, fileName);
  } catch (error) {
    log.error('[getChunkInfo] Error', { modelId, fileName, error });
  }
  return { isChunked: false };
}

export async function purgeCorruptedChunkGroup(
  modelId: string,
  fileName: string,
  totalChunks: number
): Promise<void> {
  try {
    await deleteBlobByKeyViaEvent(`${modelId}/${fileName}:manifest`);
    for (let i = 0; i < totalChunks; i++) {
      await deleteBlobByKeyViaEvent(`${modelId}/${fileName}_chunk_${i}`);
    }
    log.warn('[purgeCorruptedChunkGroup] Purged corrupted cache', { modelId, fileName, totalChunks });
  } catch (purgeError) {
    log.error('[purgeCorruptedChunkGroup] Purge failed', { modelId, fileName, error: purgeError });
  }
}

export async function assembleChunks(
  modelId: string,
  fileName: string,
  totalChunks: number,
  totalSize: number
): Promise<ArrayBuffer> {
  try {
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
      throw new Error(
        `Assembled size mismatch: expected ${totalSize}, got ${currentOffset}`
      );
    }
    return combined.buffer;
  } catch (error) {
    log.error('[assembleChunks] Corruption or assembly failure', { modelId, fileName, error });
    await purgeCorruptedChunkGroup(modelId, fileName, totalChunks);
    throw error;
  }
}

export async function saveChunkedFileSafe(
  resourceUrl: string,
  blob: Blob,
  modelId: string
): Promise<void> {
  if (!modelId) throw new Error('No model ID available for chunked storage');
  await saveChunkedFileSafeViaEvent(resourceUrl, blob, modelId);
}

export async function createStreamingResponseFromChunks(
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
          const chunkArrayBuffer = await fetchChunk(modelId, fileName, i);
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
  headers.set('Content-Type', HTTP_HEADERS_AI.CONTENT_TYPE_OCTET_STREAM);
  headers.set('Content-Length', totalSize.toString());
  headers.set('Transfer-Encoding', 'chunked');
  return new Response(stream, { headers });
}

export type UserAddedModel = {
  repo: string;
  displayName: string;
  task: string;
  addedAt: number;
  isUserAdded: true;
};

export async function saveUserAddedModel(
  model: Omit<UserAddedModel, 'addedAt' | 'isUserAdded'>
): Promise<void> {
  const userModel: ManifestEntry = {
    repo: model.repo,
    quants: {},
    task: model.task,
    manifestVersion: CURRENT_MANIFEST_VERSION,
  };
  await addManifestEntry(model.repo, userModel);
}

export async function removeUserAddedModel(repo: string): Promise<void> {
  await deleteManifestEntryViaEvent(repo);
}

export async function getUserAddedModels(
  defaultModels: Set<string>
): Promise<ManifestEntry[]> {
  const all = await getAllManifestEntries();
  return all.filter((m) => !defaultModels.has(m.repo));
}

export function parseQuantFromFilename(filename: string): string | null {
  const match = filename.match(/model_([a-z0-9_]+)\.onnx$/i);
  return match ? match[1] : null;
}

export async function validateHuggingFaceModel(repoId: string): Promise<{
  valid: boolean;
  error?: string;
  task?: string;
  onnxFiles?: string[];
}> {
  try {
    const fetchFn = getModelStorageFetch();
    const response = await fetchFn(
      `https://huggingface.co/api/models/${repoId}`
    );
    if (!response.ok) {
      if (response.status === 404) return { valid: false, error: 'Model not found on HuggingFace' };
      return { valid: false, error: `API error: ${response.status}` };
    }
    const modelInfo = (await response.json()) as HuggingFaceModelMetadata;
    const filesResponse = await fetchFn(
      `https://huggingface.co/api/models/${repoId}/tree/main`
    );
    if (!filesResponse.ok) {
      return { valid: false, error: 'Could not fetch model files' };
    }
    const files = (await filesResponse.json()) as Array<{ path?: string }>;
    const onnxFiles = files
      .filter((f): f is { path: string } => typeof f.path === 'string')
      .filter((f) => f.path.endsWith('.onnx'))
      .map((f) => f.path);
    if (onnxFiles.length === 0) {
      return {
        valid: false,
        error: 'No ONNX files found. Only ONNX models are supported by Transformers.js',
      };
    }
    return {
      valid: true,
      task: modelInfo.pipeline_tag ?? 'text-generation',
      onnxFiles,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function fetchRepoFiles(repo: string): Promise<{
  siblings: HuggingFaceSibling[];
  task: string;
}> {
  const url = `https://huggingface.co/api/models/${repo}`;
  const headers = await getAuthenticatedHeaders();
  const fetchFn = getModelStorageFetch();
  let resp = await fetchFn(url, { headers });
  if (resp.status === 401 && typeof headers.Authorization === 'string' && headers.Authorization.length > 0) {
    resp = await fetchFn(url, { headers: { Accept: HTTP_HEADERS_AI.ACCEPT_JSON } });
  }
  if (!resp.ok) {
    throw new Error(`Failed to fetch repo files for ${repo}: ${resp.status} ${resp.statusText}`);
  }
  const json = (await resp.json()) as HuggingFaceModelMetadata;
  const siblings = Array.isArray(json.siblings)
    ? json.siblings.filter(
        (entry): entry is HuggingFaceSibling =>
          typeof (entry as HuggingFaceSibling | null)?.rfilename === 'string'
      )
    : [];
  const baseRepoUrl = `https://huggingface.co/${repo}/resolve/main/`;
  await Promise.all(
    siblings.map(async (entry) => {
      if (
        typeof entry.size !== 'number' ||
        !Number.isFinite(entry.size) ||
        entry.size <= 0
      ) {
        const entryUrl = baseRepoUrl + entry.rfilename;
        try {
          const headResp = await fetchFn(entryUrl, { method: 'HEAD' });
          if (headResp.ok) {
            const len = headResp.headers.get('Content-Length');
            if (len) entry.size = parseInt(len, 10);
          }
        } catch {
          // ignore
        }
      }
    })
  );
  return { siblings, task: json.pipeline_tag ?? 'text-generation' };
}

export async function fetchModelMetadataInternal(modelId: string): Promise<HuggingFaceModelMetadata> {
  const apiUrl = `https://huggingface.co/api/models/${modelId}`;
  const headers = await getAuthenticatedHeaders();
  const fetchFn = getModelStorageFetch();
  let response = await fetchFn(apiUrl, { headers });
  if (response.status === 401 && typeof headers.Authorization === 'string' && headers.Authorization.length > 0) {
    response = await fetchFn(apiUrl, { headers: { Accept: HTTP_HEADERS_AI.ACCEPT_JSON } });
  }
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[fetchModelMetadataInternal] Metadata fetch failed (${response.status}): ${response.statusText} ${errorText}`
    );
  }
  return (await response.json()) as HuggingFaceModelMetadata;
}

export async function filterAndValidateFilesInternal(
  metadata: HuggingFaceModelMetadata,
  modelId: string
): Promise<{ neededFileEntries: NeededFileEntry[]; message: string | null }> {
  const hfFileEntries = Array.isArray(metadata.siblings)
    ? metadata.siblings.filter(
        (entry): entry is HuggingFaceSibling => typeof entry.rfilename === 'string'
      )
    : [];
  const filteredEntries = hfFileEntries.filter(
    (f) =>
      f.rfilename.endsWith('.onnx') ||
      f.rfilename.endsWith('on') ||
      f.rfilename.endsWith('.txt')
  );
  if (filteredEntries.length === 0) {
    return {
      neededFileEntries: [],
      message: 'No .onnx, on, or .txt files found in model metadata.',
    };
  }
  const baseRepoUrl = `https://huggingface.co/${modelId}/resolve/main/`;
  const fetchFn = getModelStorageFetch();
  async function getFileSizeWithHEAD(url: string): Promise<number | null> {
    try {
      const headResp = await fetchFn(url, { method: 'HEAD' });
      if (headResp.ok) {
        const len = headResp.headers.get('Content-Length');
        return len ? parseInt(len, 10) : null;
      }
    } catch {
      // ignore
    }
    return null;
  }
  await Promise.all(
    filteredEntries.map(async (entry) => {
      if (
        typeof entry.size !== 'number' ||
        !Number.isFinite(entry.size) ||
        entry.size <= 0
      ) {
        const size = await getFileSizeWithHEAD(baseRepoUrl + entry.rfilename);
        if (size != null && Number.isFinite(size) && size > 0) {
          entry.size = size;
        } else {
          entry.skip = true;
        }
      }
    })
  );
  const neededFileEntries = filteredEntries
    .filter((e) => !e.skip)
    .map<NeededFileEntry>((entry) => {
      const fileName = entry.rfilename;
      const fileType = fileName.split('.').pop();
      const size = typeof entry.size === 'number' ? entry.size : 0;
      const totalChunks = size > 0 ? Math.ceil(size / (10 * 1024 * 1024)) : 0;
      const chunkGroupId = `${modelId}/${fileName}`;
      return {
        id: `${chunkGroupId}:manifest`,
        type: 'manifest',
        chunkGroupId,
        fileName,
        folder: modelId,
        fileType,
        size,
        totalChunks,
        chunkSizeUsed: DEFAULT_CHUNK_SIZE,
        status: 'missing',
        addedAt: Date.now(),
      };
    });
  return { neededFileEntries, message: null };
}
