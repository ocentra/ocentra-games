import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpAuthScheme, HttpContentType, HttpHeader, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import {
  ShopProductsResponseSchema,
  ShopPurchaseResponseSchema,
  type ShopPaymentProvider,
  type ShopProduct,
  type ShopPurchaseResponse,
} from '@ocentra/endpoint-domain/schemas/shop';

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

  const parsed = ShopProductsResponseSchema.safeParse(await response.json() as unknown);
  if (!parsed.success) {
    throw new Error('Shop API returned an invalid product payload');
  }
  return parsed.data.products;
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

export async function startShopPurchase({
  apiBaseUrl,
  token,
  product,
  provider,
  returnUrl,
  cancelUrl,
}: {
  apiBaseUrl: string;
  token: string;
  product: ShopProduct;
  provider: ShopPaymentProvider;
  returnUrl: string;
  cancelUrl: string;
}): Promise<ShopPurchaseResponse> {
  const response = await fetch(buildApiUrl(ApiEndpoint.Shop.Purchase, { baseUrl: apiBaseUrl }), {
    method: HttpMethod.Post,
    headers: {
      [HttpHeader.Accept]: HttpContentType.ApplicationJson,
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      [HttpHeader.Authorization]: `${HttpAuthScheme.Bearer} ${token}`,
    },
    body: JSON.stringify({
      productId: product.productId,
      productType: product.productType,
      quantity: 1,
      provider,
      returnUrl,
      cancelUrl,
    }),
  });
  if (!response.ok && !isJsonResponse(response)) {
    throw new Error(`Shop purchase request failed: ${response.status}`);
  }
  const data = await response.json() as unknown;
  const parsed = ShopPurchaseResponseSchema.safeParse(data);
  if (!parsed.success) {
    if (!response.ok && data && typeof data === 'object') {
      const record = data as { error?: unknown; message?: unknown };
      throw new Error(typeof record.message === 'string' ? record.message : typeof record.error === 'string' ? record.error : `Shop purchase request failed: ${response.status}`);
    }
    throw new Error('Shop API returned an invalid purchase payload');
  }
  return parsed.data;
}
