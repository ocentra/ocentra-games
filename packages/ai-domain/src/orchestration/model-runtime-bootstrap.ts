import { env } from '@huggingface/transformers';
import { DeviceCapabilities } from '@/pipelines/PipelineConfigs';
import { setPlatformUrlAdapter } from '@/utils/platform-url-adapter';
import { wireFetchInterceptor } from '@/utils/wire-fetch-interceptor';

export type PlatformRuntime = 'web' | 'desktop' | 'mobile';

export interface ModelStateRef {
  modelId: string | null;
  quantPath: string | null;
}

export interface ModelFetchProgress {
  loaded?: number;
  total?: number;
  progress?: number;
}

export interface ModelRuntimeBootstrapOptions {
  getPlatformRuntime: () => PlatformRuntime;
  getModelState: () => ModelStateRef;
  baseFetch: typeof fetch;
  transformersEnv?: typeof env & { fetch?: typeof fetch };
  onProgress?: (info: ModelFetchProgress) => void;
  onCacheHit?: (fileSize?: number) => void;
  onDownloadStart?: (fileName: string) => void;
  onDownloadComplete?: (fileSize?: number) => void;
}

function configurePlatformUrlAdapter(runtime: PlatformRuntime): void {
  if (runtime === 'desktop') {
    setPlatformUrlAdapter({
      isLocalResource: (url: string) =>
        url.startsWith('file://') ||
        url.startsWith('app://') ||
        url.startsWith('blob:'),
    });
    return;
  }
  if (runtime === 'mobile') {
    setPlatformUrlAdapter({
      isLocalResource: (url: string) =>
        url.startsWith('file://') ||
        url.startsWith('content://') ||
        url.startsWith('capacitor://') ||
        url.startsWith('blob:'),
    });
    return;
  }
  setPlatformUrlAdapter({
    isLocalResource: (url: string) =>
      url.startsWith('chrome-extension://') ||
      url.startsWith('blob:'),
  });
}

function configureTransformersBackend(hasWebGPU: boolean): void {
  const transformersEnv = env;
  transformersEnv.useBrowserCache = false;

  if (!transformersEnv.backends) {
    transformersEnv.backends = {} as typeof env.backends;
  }
  if (!transformersEnv.backends.onnx) {
    transformersEnv.backends.onnx = {} as typeof env.backends.onnx;
  }

  const onnxBackend = transformersEnv.backends.onnx as Record<string, unknown>;

  if (hasWebGPU) {
    onnxBackend.executionProviders = ['webgpu', 'wasm'];
    onnxBackend.webgpu = { powerPreference: 'high-performance' };
  } else {
    onnxBackend.executionProviders = ['wasm'];
  }

  onnxBackend.logLevel = 'warning';

  if (hasWebGPU) {
    const envWithWebGPU = transformersEnv as typeof env & { webgpu?: Record<string, unknown> };
    if (!envWithWebGPU.webgpu) {
      envWithWebGPU.webgpu = {};
    }
  }
}

export async function bootstrapModelRuntime(options: ModelRuntimeBootstrapOptions): Promise<{
  hasWebGPU: boolean;
}> {
  await DeviceCapabilities.initialize();
  const hasWebGPU = await DeviceCapabilities.hasWebGPU();

  configureTransformersBackend(hasWebGPU);
  configurePlatformUrlAdapter(options.getPlatformRuntime());

  wireFetchInterceptor(() => options.getModelState(), {
    baseFetch: options.baseFetch,
    transformersEnv: (options.transformersEnv ?? (env as typeof env & { fetch?: typeof fetch })) as {
      fetch?: typeof fetch;
    },
    onProgress: options.onProgress,
    onCacheHit: options.onCacheHit,
    onDownloadStart: options.onDownloadStart,
    onDownloadComplete: options.onDownloadComplete,
  });

  return { hasWebGPU };
}
