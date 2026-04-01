/// <reference lib="dom" />
import { CHUNK_SIZE } from '@/constants/model-storage';
import {
  getManifestEntryViaEvent,
  addManifestEntryViaEvent,
  addQuantToManifestViaEvent,
  saveToIndexedDBViaEvent,
  getFromIndexedDBAsBlobViaEvent,
  getChunkInfoCompatViaEvent,
  assembleChunksViaEvent,
  createStreamingResponseFromChunksViaEvent,
  saveChunkedFileSafeViaEvent
} from '@/storage/storage-event-client';
import { shouldInterceptFile as shouldInterceptFileFromUtil } from '@/utils/fetch-intercept';
import type { QuantStatus } from '@/constants/quant-status';
import { QUANT_STATUS } from '@/constants/quant-status';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

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
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LOG_GENERAL = false;
const LOG_ERROR = true;
const LOG_MANIFEST_UPDATES = false;

function shouldChunkFile(fileSize: number): boolean {
  return fileSize > CHUNK_SIZE;
}

export class PipelineDBHandler {
  static extractCleanDtypeFromPath(filePath: string): string {
    if (!filePath || typeof filePath !== 'string') return 'fp32';

    const filename = filePath.split('/').pop() || filePath;
    const nameWithoutExt = filename.replace(/\.onnx$/, '');

    if (nameWithoutExt.includes('q4f16')) return 'q4f16';
    if (nameWithoutExt.includes('uint8')) return 'uint8';
    if (nameWithoutExt.includes('int8')) return 'int8';
    if (nameWithoutExt.includes('bnb4')) return 'bnb4';
    if (nameWithoutExt.includes('q4')) return 'q4';
    if (nameWithoutExt.includes('q8')) return 'q8';
    if (nameWithoutExt.includes('fp16')) return 'fp16';
    if (nameWithoutExt.includes('fp32')) return 'fp32';
    if (nameWithoutExt.includes('quantized')) return 'quantized';

    return 'fp32';
  }

  static async setManifestQuantStatus(
    repo: string,
    dtype: string,
    status: QuantStatus,
    onUpdate?: () => void
  ): Promise<void> {
    try {
      if (LOG_MANIFEST_UPDATES) {
        logInfo(`[setManifestQuantStatus] Starting: repo="${repo}", dtype="${dtype}", status="${status}"`, undefined, LOG_MANIFEST_UPDATES);
      }

      const manifest = await getManifestEntryViaEvent(repo);
      if (!manifest || !manifest.quants) {
        if (LOG_ERROR) {
          logWarn(`[setManifestQuantStatus] No manifest found for repo: ${repo}`, undefined, LOG_ERROR);
        }
        return;
      }

      const entriesToUpdate: string[] = [];
      for (const [modelPath, quantInfo] of Object.entries(manifest.quants)) {
        if (quantInfo.dtype === dtype) {
          entriesToUpdate.push(modelPath);
        }
      }

      if (entriesToUpdate.length === 0) {
        if (LOG_ERROR) {
          logWarn(`[setManifestQuantStatus] No manifest entries found for dtype: ${dtype} in repo: ${repo}`, undefined, LOG_ERROR);
        }
        return;
      }

      for (const entryKey of entriesToUpdate) {
        if (manifest.quants[entryKey]) {
          manifest.quants[entryKey].status = status;
        }
      }

      await addManifestEntryViaEvent(repo, manifest);

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      if (LOG_ERROR) {
        logError(`[setManifestQuantStatus] Error updating manifest:`, error, LOG_ERROR);
      }
    }
  }

  static async tryServeFromIndexedDB(
    resourceUrl: string,
    currentModelRepoId: string | null,
    logChunked: boolean = false
  ): Promise<Response | null> {
    try {
      const urlParts = resourceUrl.split('/');
      const fileName = urlParts.slice(urlParts.indexOf('main') + 1).join('/');
      const modelId = currentModelRepoId;

      if (modelId) {
        const chunkedInfo = await getChunkInfoCompatViaEvent(modelId, fileName);
        if (chunkedInfo.isChunked && chunkedInfo.totalChunks && chunkedInfo.totalSize) {
          if (logChunked) {
            logInfo(`[tryServeFromIndexedDB] Found chunked file: ${fileName}`, undefined, logChunked);
          }
          try {
            if (chunkedInfo.totalSize > 100 * 1024 * 1024) {
              return await createStreamingResponseFromChunksViaEvent(
                modelId,
                fileName,
                chunkedInfo.totalChunks,
                chunkedInfo.totalSize
              );
            } else {
              const assembledBuffer = await assembleChunksViaEvent(
                modelId,
                fileName,
                chunkedInfo.totalChunks,
                chunkedInfo.totalSize
              );

              const headers = new Headers();
              if (resourceUrl.endsWith('.json')) {
                headers.set('Content-Type', 'application/json');
              } else {
                headers.set('Content-Type', 'application/octet-stream');
              }
              headers.set('Content-Length', assembledBuffer.byteLength.toString());

              return new Response(assembledBuffer, { headers });
            }
          } catch {
            // Fall through to regular cache check
          }
        }
      }

      const cached = await getFromIndexedDBAsBlobViaEvent(resourceUrl);
      if (cached) {
        const headers = new Headers();
        if (cached.type) {
          headers.set('Content-Type', cached.type);
        } else if (resourceUrl.endsWith('.json')) {
          headers.set('Content-Type', 'application/json');
        } else {
          headers.set('Content-Type', 'application/octet-stream');
        }
        headers.set('Content-Length', cached.size.toString());
        return new Response(cached, { headers });
      }
      return null;
    } catch {
      return null;
    }
  }

  static extractResourceUrl(input: string | Request | URL): { url: string | undefined; isRequestObject: boolean } {
    let resourceUrl: string | undefined = undefined;
    let isRequestObject = false;

    if (typeof input === 'string') {
      resourceUrl = input;
    } else if (input instanceof URL) {
      resourceUrl = input.href;
    } else if (input instanceof Request) {
      resourceUrl = input.url;
      isRequestObject = true;
    }

    return { url: resourceUrl, isRequestObject };
  }

  static determineFetchInput(
    input: string | Request | URL,
    resourceUrl: string
  ): { fetchInput: string | Request | URL; isRewritten: boolean } {
    let fetchInput = input;
    let isRewritten = false;

    if (
      resourceUrl &&
      ((typeof input === 'string' && resourceUrl !== input) ||
        (input instanceof Request && resourceUrl !== input.url) ||
        (input instanceof URL && resourceUrl !== input.href))
    ) {
      fetchInput = resourceUrl;
      isRewritten = true;
    }

    return { fetchInput, isRewritten };
  }

  static async rewriteGenerationConfigPath(resourceUrl: string, files: string[]): Promise<string> {
    const resourceFileName = resourceUrl.split('/').pop() || '';

    if (resourceFileName !== 'generation_config.json') {
      return resourceUrl;
    }

    const exact = files.find((f) => f.endsWith('/generation_config.json') || f === 'generation_config.json');
    if (exact) {
      const exactFile = exact.split('/').pop() || 'generation_config.json';
      return resourceUrl.replace('generation_config.json', exactFile);
    }

    const genai = files.find((f) => f.endsWith('genai_config.json'));
    if (genai) {
      return resourceUrl.replace('generation_config.json', 'genai_config.json');
    }

    const config = files.find((f) => f.endsWith('config.json'));
    if (config) {
      return resourceUrl.replace('generation_config.json', 'config.json');
    }

    return resourceUrl;
  }

  static async rewriteMainModelFilePath(
    resourceUrl: string,
    resourceFileName: string,
    files: string[]
  ): Promise<string> {
    if (!resourceFileName.endsWith('.onnx')) {
      return resourceUrl;
    }
    const manifestFile = files.find((f) => f.endsWith(resourceFileName));
    if (manifestFile && resourceUrl.endsWith(manifestFile)) {
      return resourceUrl;
    }
    const quantFile = files.find((f) => f.endsWith('.onnx'));
    if (quantFile) {
      return resourceUrl.replace(/resolve\/main\/.*$/, `resolve/main/${quantFile}`);
    }
    return resourceUrl;
  }

  static async rewriteSupportingFilePath(
    resourceUrl: string,
    resourceFileName: string,
    files: string[]
  ): Promise<string> {
    const SUPPORTING_FILE_REGEX = /\.(json|bin|pt|txt|model)$/i;
    if (!SUPPORTING_FILE_REGEX.test(resourceFileName)) {
      return resourceUrl;
    }

    const manifestPath = files.find((f) => f.endsWith('/' + resourceFileName) || f === resourceFileName);
    if (manifestPath && !resourceUrl.endsWith(manifestPath)) {
      return resourceUrl.replace(/resolve\/main\/.*$/, `resolve/main/${manifestPath}`);
    }
    return resourceUrl;
  }

  static async handleModelFileRewriting(
    resourceUrl: string,
    currentModelRepoId: string | null,
    currentModelQuantPath: string | null
  ): Promise<string> {
    if (!currentModelRepoId || !currentModelQuantPath) {
      return resourceUrl;
    }

    const manifest = await getManifestEntryViaEvent(currentModelRepoId);
    if (!manifest || !manifest.quants || !manifest.quants[currentModelQuantPath]) {
      if (resourceUrl.match(/\.(onnx|onnx_data|bin|pt)$/i)) {
        await addQuantToManifestViaEvent(currentModelRepoId, currentModelQuantPath, QUANT_STATUS.DOWNLOADED);
      }
      return resourceUrl;
    }

    const files = manifest.quants[currentModelQuantPath].files ?? [];
    const resourceFileName = resourceUrl.split('/').pop() || '';
    let rewrittenUrl = await this.rewriteGenerationConfigPath(resourceUrl, files);

    if (rewrittenUrl === resourceUrl && resourceFileName === 'generation_config.json') {
      return rewrittenUrl;
    }

    rewrittenUrl = await this.rewriteMainModelFilePath(rewrittenUrl, resourceFileName, files);
    rewrittenUrl = await this.rewriteSupportingFilePath(rewrittenUrl, resourceFileName, files);

    return rewrittenUrl;
  }

  static createEmptyGenerationConfig(): Response {
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  static mapOnnxModelPath(resourceUrl: string, currentModelQuantPath: string | null): string {
    if (!currentModelQuantPath || !currentModelQuantPath.includes('.onnx')) {
      return resourceUrl;
    }

    const actualModelFile = currentModelQuantPath.split('/').pop();
    if (!actualModelFile) return resourceUrl;

    let result = resourceUrl;
    const modelFilePattern = /\/model[_-]?[a-z0-9]*\.onnx/i;
    if (modelFilePattern.test(result)) {
      const originalUrl = result;
      result = result.replace(modelFilePattern, `/${actualModelFile}`);
      result = result.replace(
        /\/model[_-]?[a-z0-9]*\.onnx_data/i,
        `/${actualModelFile.replace('.onnx', '.onnx_data')}`
      );

      if (LOG_GENERAL && result !== originalUrl) {
        logInfo(`[mapOnnxModelPath] Mapped: ${originalUrl} -> ${result}`, undefined, LOG_GENERAL);
      }
    }

    return result;
  }

  static shouldInterceptFile(resourceUrl: string): {
    shouldIntercept: boolean;
    isHuggingFaceFile: boolean;
    isLocalFile: boolean;
  } {
    return shouldInterceptFileFromUtil(resourceUrl);
  }

  static async fetchAndCacheFile(
    resourceUrl: string,
    originalFetch: typeof fetch,
    options?: {
      currentModelRepoId?: string | null;
      progressCallback?: (info: { loaded: number; total: number; progress: number }) => void;
    }
  ): Promise<Response> {
    if (LOG_GENERAL) {
      logInfo(`[fetchAndCacheFile] Fetching: ${resourceUrl}`, undefined, LOG_GENERAL);
    }

    const resp = await originalFetch(resourceUrl);
    if (LOG_GENERAL) {
      logInfo(`[fetchAndCacheFile] Response: status=${resp.status}, ok=${resp.ok}`, undefined, LOG_GENERAL);
    }

    if (!resp.ok) {
      return resp;
    }

    const contentLength = resp.headers.get('content-length');
    const totalBytes = contentLength ? parseInt(contentLength, 10) : null;

    if (totalBytes && totalBytes > 0 && options?.progressCallback) {
      const reader = resp.body?.getReader();
      if (reader) {
        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            chunks.push(value);
            receivedBytes += value.length;

            const progress = Math.round((receivedBytes / totalBytes) * 100);

            if (progress % 5 === 0 || receivedBytes % (10 * 1024 * 1024) === 0) {
              options.progressCallback({
                loaded: receivedBytes,
                total: totalBytes,
                progress
              });
            }
          }

          const allChunks = new Uint8Array(receivedBytes);
          let offset = 0;
          for (const chunk of chunks) {
            allChunks.set(chunk, offset);
            offset += chunk.length;
          }

          const blob = new Blob([allChunks]);
          const fileSize = blob.size;

          if (shouldChunkFile(fileSize)) {
            if (LOG_GENERAL) {
              logInfo(`[fetchAndCacheFile] Large file (${fileSize} bytes), chunking: ${resourceUrl}`, undefined, LOG_GENERAL);
            }
            try {
              await saveChunkedFileSafeViaEvent(resourceUrl, blob, options.currentModelRepoId!);
            } catch (chunkError) {
              if (LOG_ERROR) {
                logError(`[fetchAndCacheFile] Chunking failed, using regular storage:`, chunkError, LOG_ERROR);
              }
              await saveToIndexedDBViaEvent(resourceUrl, blob);
            }
          } else {
            if (LOG_GENERAL) {
              logInfo(`[fetchAndCacheFile] Small file (${fileSize} bytes), regular storage: ${resourceUrl}`, undefined, LOG_GENERAL);
            }
            await saveToIndexedDBViaEvent(resourceUrl, blob);
          }

          return new Response(blob, {
            status: resp.status,
            statusText: resp.statusText,
            headers: resp.headers
          });
        } finally {
          reader.releaseLock();
        }
      }
    }

    const blob = await resp.clone().blob();
    const fileSize = blob.size;
    if (LOG_GENERAL) {
      logInfo(
        `[fetchAndCacheFile] File size: ${fileSize} bytes (${(fileSize / 1024 / 1024).toFixed(1)}MB)`,
        undefined,
        LOG_GENERAL
      );
    }

    if (shouldChunkFile(fileSize)) {
      if (LOG_GENERAL) {
        logInfo(`[fetchAndCacheFile] Large file (${fileSize} bytes), chunking: ${resourceUrl}`, undefined, LOG_GENERAL);
      }
      try {
        await saveChunkedFileSafeViaEvent(resourceUrl, blob, options?.currentModelRepoId ?? '');
      } catch (chunkError) {
        if (LOG_ERROR) {
          logError(`[fetchAndCacheFile] Chunking failed, using regular storage:`, chunkError, LOG_ERROR);
        }
        await saveToIndexedDBViaEvent(resourceUrl, blob);
      }
    } else {
      if (LOG_GENERAL) {
        logInfo(`[fetchAndCacheFile] Small file (${fileSize} bytes), regular storage: ${resourceUrl}`, undefined, LOG_GENERAL);
      }
      await saveToIndexedDBViaEvent(resourceUrl, blob);
    }

    return resp;
  }

  static async getHasExternalData(modelId: string, dtype: string): Promise<boolean> {
    const manifestEntry = await getManifestEntryViaEvent(modelId);
    if (!manifestEntry || !manifestEntry.quants) {
      return false;
    }

    for (const [, quantInfo] of Object.entries(manifestEntry.quants)) {
      if (quantInfo.dtype === dtype) {
        return quantInfo.hasExternalData || false;
      }
    }

    return false;
  }
}
