import {
  createFetchInterceptor,
  type FetchInterceptorConfig,
  type FetchInterceptorOptions,
} from '@/utils/fetch-intercept';

export type GetFetchInterceptorConfig = () => FetchInterceptorConfig;

export interface WireFetchInterceptorOptions extends FetchInterceptorOptions {
  transformersEnv?: { fetch?: typeof fetch };
}

export function wireFetchInterceptor(
  getConfig: GetFetchInterceptorConfig,
  options: WireFetchInterceptorOptions = {}
): void {
  const { transformersEnv, ...interceptorOptions } = options;
  const baseFetch = interceptorOptions.baseFetch ?? transformersEnv?.fetch;
  if (typeof baseFetch !== 'function') {
    throw new Error(
      'wireFetchInterceptor requires a fetch adapter. Provide options.baseFetch or options.transformersEnv.fetch.'
    );
  }
  const interceptedFetch = createFetchInterceptor(getConfig, {
    ...interceptorOptions,
    baseFetch,
  });
  if (!transformersEnv) {
    throw new Error(
      'wireFetchInterceptor requires options.transformersEnv to inject the intercepted fetch adapter.'
    );
  }
  (transformersEnv as { fetch: typeof fetch }).fetch = interceptedFetch;
}
