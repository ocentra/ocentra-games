import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpContentType, HttpHeader, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import type { ShopProduct } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';

interface ShopProductsResponseBody {
  products?: ShopProduct[];
}

function isJsonResponse(response: Response): boolean {
  return (response.headers.get(HttpHeader.ContentType) ?? '').toLowerCase().includes(HttpContentType.ApplicationJson);
}

export async function readShopProductsResponse(response: Response): Promise<ShopProduct[]> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? `Shop request failed: ${response.status}`);
  }
  if (!isJsonResponse(response)) {
    throw new Error('Shop API returned a non-JSON response');
  }

  const data = await response.json() as ShopProductsResponseBody;
  return Array.isArray(data.products) ? data.products : [];
}

export async function fetchShopProducts(apiBaseUrl: string): Promise<ShopProduct[]> {
  const response = await fetch(buildApiUrl(ApiEndpoint.Shop.Products, { baseUrl: apiBaseUrl }), {
    method: HttpMethod.Get,
    headers: {
      [HttpHeader.Accept]: HttpContentType.ApplicationJson,
    },
  });
  return readShopProductsResponse(response);
}
