export function extractResourceUrl(input: string | Request | URL): {
  url: string | undefined;
  isRequestObject: boolean;
} {
  let resourceUrl: string | undefined;
  let isRequestObject = false;
  if (typeof input === 'string') {
    resourceUrl = input;
  } else if (input instanceof URL) {
    resourceUrl = input.href;
  } else if (input instanceof Request) {
    resourceUrl = input.url;
    isRequestObject = true;
  } else {
    resourceUrl = undefined;
  }
  return { url: resourceUrl, isRequestObject };
}

import { getPlatformUrlAdapter } from './platform-url-adapter';

function isModelFileUrl(url: string): boolean {
  return (
    url.endsWith('.wasm') ||
    url.includes('.onnx') ||
    url.includes('.bin') ||
    url.includes('.pt') ||
    url.includes('.safetensors')
  );
}

export function shouldInterceptFile(resourceUrl: string): {
  shouldIntercept: boolean;
  isHuggingFaceFile: boolean;
  isLocalFile: boolean;
} {
  const isHuggingFaceFile =
    resourceUrl.includes('huggingface.co') || resourceUrl.includes('/resolve/');
  const adapter = getPlatformUrlAdapter();
  const isLocalFile =
    adapter.isLocalResource(resourceUrl) && isModelFileUrl(resourceUrl);
  return {
    shouldIntercept: isHuggingFaceFile || isLocalFile,
    isHuggingFaceFile,
    isLocalFile,
  };
}

export function mapOnnxModelPath(
  resourceUrl: string,
  currentModelQuantPath: string | null
): string {
  if (!currentModelQuantPath || !currentModelQuantPath.includes('.onnx')) {
    return resourceUrl;
  }
  const actualModelFile = currentModelQuantPath.split('/').pop();
  if (!actualModelFile) return resourceUrl;
  let result = resourceUrl;
  const modelFilePattern = /\/model[_-]?[a-z0-9]*\.onnx/i;
  if (modelFilePattern.test(result)) {
    result = result.replace(modelFilePattern, `/${actualModelFile}`);
    result = result.replace(
      /\/model[_-]?[a-z0-9]*\.onnx_data/i,
      `/${actualModelFile.replace('.onnx', '.onnx_data')}`
    );
  }
  return result;
}

export function rewriteGenerationConfigPath(
  resourceUrl: string,
  files: string[]
): string {
  const resourceFileName = resourceUrl.split('/').pop() || '';
  if (resourceFileName !== 'generation_config.json') return resourceUrl;
  const exact = files.find(
    (f) => f.endsWith('/generation_config.json') || f === 'generation_config.json'
  );
  if (exact) {
    return resourceUrl.replace(/resolve\/main\/.*$/, `resolve/main/${exact}`);
  }
  const genai = files.find((f) => f.endsWith('genai_config.json'));
  if (genai) return resourceUrl.replace(/resolve\/main\/.*$/, `resolve/main/${genai}`);
  const config = files.find((f) => f.endsWith('config.json'));
  if (config) return resourceUrl.replace(/resolve\/main\/.*$/, `resolve/main/${config}`);
  return resourceUrl;
}

export function rewriteMainModelFilePath(
  resourceUrl: string,
  resourceFileName: string,
  files: string[]
): string {
  if (!resourceFileName.endsWith('.onnx')) return resourceUrl;
  const manifestFile = files.find((f) => f.endsWith(resourceFileName));
  if (manifestFile && resourceUrl.endsWith(manifestFile)) return resourceUrl;
  const quantFile = files.find((f) => f.endsWith('.onnx'));
  if (quantFile) {
    return resourceUrl.replace(/resolve\/main\/.*$/, `resolve/main/${quantFile}`);
  }
  return resourceUrl;
}

export function rewriteSupportingFilePath(
  resourceUrl: string,
  resourceFileName: string,
  files: string[]
): string {
  const supportingRegex = /\.(json|bin|pt|txt|model)$/i;
  if (!supportingRegex.test(resourceFileName)) return resourceUrl;
  const manifestPath = files.find(
    (f) => f.endsWith('/' + resourceFileName) || f === resourceFileName
  );
  if (manifestPath && !resourceUrl.endsWith(manifestPath)) {
    return resourceUrl.replace(/resolve\/main\/.*$/, `resolve/main/${manifestPath}`);
  }
  return resourceUrl;
}

export function rewriteModelFileUrl(resourceUrl: string, files: string[]): string {
  if (files.length === 0) return resourceUrl;
  const resourceFileName = resourceUrl.split('/').pop() || '';
  let rewritten = rewriteGenerationConfigPath(resourceUrl, files);
  if (rewritten === resourceUrl && resourceFileName === 'generation_config.json') {
    return rewritten;
  }
  rewritten = rewriteMainModelFilePath(rewritten, resourceFileName, files);
  rewritten = rewriteSupportingFilePath(rewritten, resourceFileName, files);
  return rewritten;
}

export function createEmptyGenerationConfig(): Response {
  return new Response('{}', {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export interface FetchInterceptorConfig {
  modelId: string | null;
  quantPath: string | null;
}

export interface FetchInterceptorOptions {
  baseFetch?: typeof fetch;
  onProgress?: (info: { loaded?: number; total?: number; progress?: number }) => void;
  onCacheHit?: (fileSize?: number) => void;
  onDownloadStart?: (fileName: string) => void;
  onDownloadComplete?: (fileSize: number) => void;
}

export function createFetchInterceptor(
  configOrGetter: FetchInterceptorConfig | (() => FetchInterceptorConfig),
  options: FetchInterceptorOptions = {}
): typeof fetch {
  const getConfig =
    typeof configOrGetter === 'function'
      ? configOrGetter
      : () => configOrGetter;
  if (typeof options.baseFetch !== 'function') {
    throw new Error(
      'createFetchInterceptor requires options.baseFetch. Do not rely on global fetch in ai-domain.'
    );
  }
  const baseFetch = options.baseFetch;
  const onProgress = options.onProgress;

  return async function interceptedFetch(
    input: string | Request | URL,
    init?: RequestInit
  ): Promise<Response> {
    const { url: resourceUrl } = extractResourceUrl(input);
    if (!resourceUrl) {
      return baseFetch(input, init);
    }

    const { shouldIntercept, isHuggingFaceFile } = shouldInterceptFile(resourceUrl);
    if (!shouldIntercept) {
      return baseFetch(input, init);
    }

    const { modelId, quantPath } = getConfig();
    let finalResourceUrl = resourceUrl;
    if (isHuggingFaceFile && modelId && quantPath) {
      const { getManifestEntryViaEvent } = await import('../storage/storage-event-client.js');
      const manifest = await getManifestEntryViaEvent(modelId);
      const files = manifest?.quants?.[quantPath]?.files ?? [];
      if (files.length > 0) {
        finalResourceUrl = rewriteModelFileUrl(resourceUrl, files);
      }
      finalResourceUrl = mapOnnxModelPath(finalResourceUrl, quantPath);

      const configFiles = ['generation_config.json', 'genai_config.json', 'config.json'];
      const fileName = finalResourceUrl.split('/').pop() || '';
      if (
        finalResourceUrl.endsWith('generation_config.json') &&
        !configFiles.includes(fileName)
      ) {
        return createEmptyGenerationConfig();
      }
    }

    const { tryServeFromCacheViaEvent } = await import('../storage/storage-event-client.js');
    const cachedResponse = await tryServeFromCacheViaEvent(finalResourceUrl, modelId ?? '');
    if (cachedResponse) {
      const fileSize = cachedResponse.headers.get('Content-Length');
      const size = fileSize ? parseInt(fileSize, 10) : 0;
      options.onCacheHit?.(size);
      return cachedResponse;
    }

    const fileName = finalResourceUrl.split('/').pop() || 'file';
    options.onDownloadStart?.(fileName);

    const { PipelineDBHandler } = await import('../pipelines/PipelineDBHandler.js');
    const resp = await PipelineDBHandler.fetchAndCacheFile(finalResourceUrl, baseFetch, {
      currentModelRepoId: modelId,
      progressCallback: onProgress
        ? ({ loaded, total, progress }) => {
            onProgress({ loaded, total, progress });
          }
        : undefined,
    });

    const contentLength = resp.headers.get('Content-Length');
    const fileSize = contentLength ? parseInt(contentLength, 10) : 0;
    options.onDownloadComplete?.(fileSize);
    return resp;
  };
}
