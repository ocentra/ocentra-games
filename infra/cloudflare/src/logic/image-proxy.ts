import { HttpHeader, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { consumeResponseBody } from '@/utils/consume-response-body';

export interface ImageProxyFetch {
  fetch(url: string, options?: { headers?: Record<string, string> }): Promise<Response>;
}

export interface ProxyImageInput {
  imageUrl: string;
  allowedDomains: string[];
  userAgent: string;
  defaultContentType: string;
}

export interface ProxyImageResult {
  success: boolean;
  imageData?: ArrayBuffer;
  contentType?: string;
  statusCode?: number;
  error?: string;
}

function isAllowedImageHostname(hostname: string, allowedDomains: string[]): boolean {
  const normalizedHostname = hostname.toLowerCase();
  return allowedDomains.some((domain) => {
    const normalizedDomain = domain.toLowerCase();
    return normalizedHostname === normalizedDomain || normalizedHostname.endsWith(`.${normalizedDomain}`);
  });
}

export async function proxyImageLogic(
  input: ProxyImageInput,
  fetchImpl: ImageProxyFetch
): Promise<ProxyImageResult> {
  try {
    if (!input.imageUrl) {
      return {
        success: false,
        error: 'Missing url parameter',
      };
    }

    const imageUrlObj = new URL(input.imageUrl);
    const isAllowed = isAllowedImageHostname(imageUrlObj.hostname, input.allowedDomains);

    if (!isAllowed) {
      return {
        success: false,
        statusCode: HttpStatus.Forbidden,
        error: 'Image source not allowed',
      };
    }

    const imageResponse = await fetchImpl.fetch(input.imageUrl, {
      headers: {
        [HttpHeader.UserAgent]: input.userAgent,
      },
    });

    if (!imageResponse.ok) {
      await consumeResponseBody(imageResponse);
      return {
        success: false,
        statusCode: imageResponse.status,
        error: 'Failed to fetch image',
      };
    }

    const imageData = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get(HttpHeader.ContentType) || input.defaultContentType;

    return {
      success: true,
      imageData,
      contentType,
      statusCode: imageResponse.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
