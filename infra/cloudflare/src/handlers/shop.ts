import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import {
  HttpStatus,
  HttpHeader,
  HttpContentType,
  HttpMethod,
} from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { getAllActiveProducts, getProductFromKV } from '@/config/products';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const cors = (env: Env) => ({ [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) });

export async function handleShopRequest(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  // GET /api/v1/shop/products - List active products (public)
  if (path === ApiEndpoint.Shop.Products && request.method === HttpMethod.Get) {
    try {
      if (!env.PRODUCT_KV) {
        logError('Product KV not configured', getStackTrace());
        return new Response(JSON.stringify({ error: 'Shop unavailable' }), {
          status: HttpStatus.ServiceUnavailable,
          headers: cors(env),
        });
      }

      const products = await getAllActiveProducts(env);

      // Strip internal fields for public API
      const publicProducts = products.map(p => ({
        productId: p.productId,
        productType: p.productType,
        displayName: p.displayName,
        acAmount: p.acAmount,
        unitPriceCents: p.unitPriceCents,
        currency: p.currency,
        active: p.active,
      }));

      logInfo('Shop listed products', getStackTrace(), { count: publicProducts.length });
      return new Response(JSON.stringify({ products: publicProducts }), {
        status: HttpStatus.Ok,
        headers: cors(env),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError('Failed to list shop products', getStackTrace(), {
        message: err.message,
        name: err.name,
        stack: err.stack,
      });
      return new Response(JSON.stringify({ error: 'Failed to load shop' }), {
        status: HttpStatus.InternalServerError,
        headers: cors(env),
      });
    }
  }

  // GET /api/v1/shop/products/:id - Get single product (public)
  if (path.startsWith(ApiEndpoint.Shop.Products) && request.method === HttpMethod.Get) {
    const productId = path.replace(ApiEndpoint.Shop.Products, '').replace(/^\//, '');
    if (!productId) {
      return new Response(JSON.stringify({ error: 'Missing product ID' }), {
        status: HttpStatus.BadRequest,
        headers: cors(env),
      });
    }

    try {
      if (!env.PRODUCT_KV) {
        return new Response(JSON.stringify({ error: 'Shop unavailable' }), {
          status: HttpStatus.ServiceUnavailable,
          headers: cors(env),
        });
      }

      const product = await getProductFromKV(env, productId);

      if (!product || !product.active) {
        return new Response(JSON.stringify({ error: 'Product not found' }), {
          status: HttpStatus.NotFound,
          headers: cors(env),
        });
      }

      // Return public fields only
      const publicProduct = {
        productId: product.productId,
        productType: product.productType,
        displayName: product.displayName,
        acAmount: product.acAmount,
        unitPriceCents: product.unitPriceCents,
        currency: product.currency,
        active: product.active,
      };

      return new Response(JSON.stringify(publicProduct), {
        status: HttpStatus.Ok,
        headers: cors(env),
      });
    } catch (error) {
      logError('Failed to get product', getStackTrace(), { error, productId });
      return new Response(JSON.stringify({ error: 'Failed to load product' }), {
        status: HttpStatus.InternalServerError,
        headers: cors(env),
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: HttpStatus.NotFound,
    headers: cors(env),
  });
}
