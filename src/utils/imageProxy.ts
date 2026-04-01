import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';

const log = MainAppLogger.instance;
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);
export function shouldProxyImage(url: string | null | undefined): boolean {
  if (!url) return false;

  if (url.includes(ApiEndpoint.ImageProxy) || url.startsWith('/') || url.startsWith('data:')) {
    return false;
  }

  const externalDomains = ['googleusercontent.com', 'facebook.com', 'fbcdn.net'];
  try {
    const urlObj = new URL(url);
    return externalDomains.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

export function getProxiedImageUrl(
  imageUrl: string | null | undefined,
  workerUrl?: string
): string {
  if (!imageUrl) return '';

  if (!shouldProxyImage(imageUrl)) {
    return imageUrl;
  }

  const proxyBaseUrl = workerUrl || import.meta.env.VITE_R2_WORKER_URL;

  if (!proxyBaseUrl) {
    logWarn('VITE_R2_WORKER_URL not configured, using original image URL (may have CORS issues)');
    return imageUrl;
  }

  const proxyUrl = new URL(ApiEndpoint.ImageProxy, proxyBaseUrl);
  proxyUrl.searchParams.set('url', imageUrl);
  
  return proxyUrl.toString();
}

